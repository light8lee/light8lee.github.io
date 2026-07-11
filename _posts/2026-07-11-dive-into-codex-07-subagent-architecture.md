---
layout: post
title: "Dive into Codex 07：Subagent 架构"
date: 2026-07-11 12:00:00 +0800
summary: "从单个 Agent Loop 扩展到多 Agent 协作：如何划定任务边界、打包上下文、汇总结果、控制冲突，并让权限请求回到主交互通道。"
tags: [多智能体, 任务编排, 权限控制]
category: Codex
cover: /assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/001-why-subagents.png
body_class: dive-into-codex-post
series: dive-into-codex
series_previous_title: "Dive into Codex 06：Tool Execution 与 Workspace"
series_previous_url: /codex/2026/07/11/dive-into-codex-06-tool-execution-workspace.html
series_next_title: "Dive into Codex 08：System 指令与运行约束"
series_next_url: /codex/2026/07/11/dive-into-codex-08-system-instructions-constraints.html
---
前面几章讲的是单个 Agent Loop 如何构建上下文、接收事件、执行工具、管理权限和写回记忆。本章把这个 loop 扩展到多 agent 协作：什么时候拆任务、子 agent 如何拿上下文、结果如何回到主线，以及权限请求为什么仍要冒泡到主交互通道。

本章主线：

```text
main agent
  -> task boundary
  -> context package
  -> subagent loop
  -> result contract
  -> merge / decide
  -> approval bubbling
```

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/001-why-subagents.png' | relative_url }}" alt="为什么需要 Subagent" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Dive into Codex</p>
<h2>为什么需要 Subagent</h2>

复杂工程任务常常包含多个相对独立的问题：读代码、查资料、验证方案、生成素材。Subagent 让主 agent 可以把这些局部任务拆出去并行处理，而不是把所有推理塞进一个上下文。

**与本页直接相关的补充**

Subagent 的价值来自“局部性”。如果一个问题有清晰目标、可独立探索、产出能被主线合并，它就适合拆出去。否则，多开 agent 只会增加上下文、状态和冲突管理成本。

关键词：`Subagent`、`parallel task`、`context`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/002-task-boundary.png' | relative_url }}" alt="拆分首先看任务边界" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Dive into Codex</p>
<h2>拆分首先看任务边界</h2>

不是所有事情都适合派给 Subagent。好的拆分要有清晰输入、明确产出和较少共享状态。否则并行只会制造冲突，让主 agent 花更多成本合并结果。

**与本页直接相关的补充**

适合 subagent 的任务通常满足三点：输入范围明确、写入范围很小或只读、输出可以用结构化结果表达。需要持续共享状态、频繁改同一批文件、或目标还不清楚的任务，应先由主 agent 澄清边界。

关键词：`task boundary`、`input`、`output`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/003-context-package.png' | relative_url }}" alt="子任务需要上下文包" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Dive into Codex</p>
<h2>子任务需要上下文包</h2>

Subagent 不能凭空工作。主 agent 要提供目标、相关文件、约束、已知结论和期望输出格式。上下文包越清楚，子 agent 的结果越容易被主线吸收。

**与本页直接相关的补充**

上下文包至少要包含：任务目标、相关文件或目录、不得修改的范围、已有判断、期望产出、风险点和验证方式。上下文包越像交接单，subagent 越不容易把时间浪费在重新发现主线已经知道的事情上。

**源码辅助理解**

`spawn_agent` 的输入可以按“任务说明 + fork context + 结果契约”来理解：

```rust
struct SpawnAgentRequest {
    // 子任务目标：越窄越好，避免 subagent 自己扩大范围。
    task: String,

    // 从父线程继承的必要现场，例如 cwd、workspace roots、权限边界。
    fork_context: ForkContext,

    // 明确输出格式，方便主 agent 后续合并。
    expected_output: ResultContract,
}

async fn spawn_agent(req: SpawnAgentRequest, parent: &AgentThread) -> AgentId {
    let child = AgentThread::new(ThreadSource::Subagent {
        parent_thread_id: parent.id,
        task: req.task,
    });

    child.apply_fork_context(req.fork_context).await;
    child.start().await
}
```

这段骨架说明 subagent 不是凭空启动。它带着父线程来源、必要运行上下文和明确任务契约进入自己的局部 loop。

关键词：`context package`、`constraints`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/004-isolated-loop.png' | relative_url }}" alt="Subagent 也有自己的循环" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Dive into Codex</p>
<h2>Subagent 也有自己的循环</h2>

每个 Subagent 内部仍然是小型 Agent Loop：读上下文、推理、调用工具、形成结论。区别在于它的任务范围更窄，结果要回到主 agent，而不是直接成为最终答案。

**与本页直接相关的补充**

Subagent 可以拥有自己的 history、工具调用和中间观察，但它的 loop 是局部 loop。它不应该擅自扩大目标，也不应该把局部结论直接当成最终答案。主 agent 仍负责全局一致性和最终决策。

关键词：`Agent Loop`、`narrow scope`、`result`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/005-result-contract.png' | relative_url }}" alt="结果需要契约" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Dive into Codex</p>
<h2>结果需要契约</h2>

主 agent 最需要的不是长篇过程，而是可合并的结论：发现了什么、证据在哪里、建议怎么做、风险是什么。明确结果契约能减少汇总时的信息损耗。

**与本页直接相关的补充**

一个可合并的 subagent 输出通常包含四块：finding、evidence、recommendation、risk。finding 给结论，evidence 给依据，recommendation 给可执行下一步，risk 告诉主线哪里还不确定。没有契约的长篇输出，会把合并成本转嫁给主 agent。

关键词：`result contract`、`evidence`、`risk`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/006-merge-and-decide.png' | relative_url }}" alt="主 agent 负责合并决策" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Dive into Codex</p>
<h2>主 agent 负责合并决策</h2>

Subagent 给出局部结果后，主 agent 要判断哪些结论可信、是否互相冲突、下一步采用哪条路径。最终责任仍在主线，不能把子 agent 输出原样拼接当答案。

**与本页直接相关的补充**

合并不是复制粘贴，而是决策。主 agent 要检查证据是否足够、多个子结果是否冲突、建议是否符合用户目标、是否需要再验证。Subagent 提供局部认知，主 agent 负责全局判断。

**源码辅助理解**

主 agent 等待 subagent 时，拿到的应该是可合并结果，而不是把子线程全部 history 拼回来：

```rust
async fn wait_and_merge(agent_id: AgentId, main: &mut MainAgentState) -> Result<()> {
    // 1. 等待子 agent 到达 final status。
    let result = wait_agent(agent_id).await?;

    // 2. 子 agent 的输出先变成结构化报告。
    let report = SubagentReport {
        finding: result.final_message.finding,
        evidence: result.final_message.evidence,
        recommendation: result.final_message.recommendation,
        risk: result.final_message.risk,
    };

    // 3. 主 agent 再做合并判断：采纳、拒绝、继续验证，或派生新任务。
    main.merge_subagent_report(agent_id, report).await;
    Ok(())
}
```

这就是为什么结果契约重要：subagent 的作用是降低局部探索成本，而最终判断仍然要回到主线。

关键词：`merge`、`decision`、`orchestration`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/007-conflict-control.png' | relative_url }}" alt="并行也要控制冲突" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Dive into Codex</p>
<h2>并行也要控制冲突</h2>

如果多个 Subagent 同时改同一片文件或依赖同一状态，就容易互相覆盖。更安全的方式是让子 agent 先做调研、审阅或生成候选方案，由主 agent 统一落地。

**与本页直接相关的补充**

并行的风险主要来自共享写状态。可控的拆分方式包括：一个 agent 只读审查，另一个生成方案；不同 agent 负责不同目录；所有写操作最终由主 agent 或单一 implementer 合并。并行不应该变成多人同时抢同一个 diff。

关键词：`conflict`、`shared state`、`review`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/008-subagent-thread-source.png' | relative_url }}" alt="Subagent 是带来源的子线程" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Dive into Codex</p>
<h2>Subagent 是带来源的子线程</h2>

在源码实现里，Subagent 不只是“另开一个任务”。它会带着 `fork_context` 和 `ThreadSource::Subagent` 这类来源信息启动，保留父子关系，让主线程知道这个局部循环从哪里来、服务哪个目标。

**与本页直接相关的补充**

`fork_context` 让子任务继承必要现场，`ThreadSource::Subagent` 标记它的来源，parent-child relation 让主线能追踪这个子线程属于哪个任务。这样 subagent 不是孤立聊天，而是带上下文和归属关系的局部 agent loop。

关键词：`fork_context`、`ThreadSource::Subagent`、`parent thread`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/009-subagent-approval-bubble.png' | relative_url }}" alt="子线程权限也会冒泡" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Dive into Codex</p>
<h2>子线程权限也会冒泡</h2>

Subagent 里的工具执行仍可能触发 approval request。即使子线程处于 inactive 状态，权限请求也需要被主线看见和处理，避免并行任务绕过同一套 sandbox 与 approval 边界。

**与本页直接相关的补充**

权限边界不会因为任务被拆给 subagent 就消失。子线程如果需要执行高风险工具，approval request 应该冒泡到主交互通道。这样用户面对的权限决策保持一致，subagent 也不能绕过主线策略。

**源码辅助理解**

权限冒泡可以按“子线程提出请求，父交互面处理决策”来读：

```rust
async fn handle_child_approval(
    child: AgentThreadId,
    req: ApprovalRequest,
    parent_events: &EventSender,
) -> ApprovalDecision {
    // 1. 子线程不能自己绕过 approval policy。
    let request = ApprovalRequest {
        source_thread: child,
        command: req.command,
        reason: req.reason,
    };

    // 2. 请求冒泡到主交互通道，UI 能显示来源 thread。
    parent_events.send(Event::ApprovalRequest(request)).await;

    // 3. 用户决策再返回给子线程，决定继续执行还是写入 denied output。
    wait_for_user_decision(child).await
}
```

这样并行不会削弱安全边界：subagent 可以并行探索，但高风险执行仍然经过同一套 sandbox / approval 机制。

关键词：`approval request`、`inactive thread`、`sandbox`、`parent agent`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-07-subagent-architecture/images/010-series-summary.png' | relative_url }}" alt="回到整套 Codex 心智模型" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Dive into Codex</p>
<h2>回到整套 Codex 心智模型</h2>

从 Thread、Session、Turn，到 Responses、Cache、Interrupt、Sandbox、Tool Execution，再到 Subagent，Codex 的核心始终是同一件事：把模型推理变成可控、可追踪、可继续的工程执行系统。

**与本页直接相关的补充**

Subagent 不是全系列之外的新概念，而是把同一套 Agent Loop 放进更小的任务边界里运行。理解了单个 loop 的上下文、事件、工具、权限和记忆，再看 subagent，就能明白它解决的是并行和分工，而不是替代主线判断。

关键词：`Codex`、`controllable agent`、`trace`
</div>
</section>

<section class="post-appendix" markdown="1">

## Appendix：补充材料

### A. 适合交给 Subagent 的任务

- 独立代码阅读：让子 agent 只分析某个模块，不改文件。
- 方案验证：让子 agent 检查一个假设是否成立，并给证据。
- 素材生成：让子 agent 在明确风格和输出格式下生成候选项。
- Review / audit：让子 agent 从风险、遗漏或一致性角度检查主线产物。

### B. 不适合直接拆给 Subagent 的任务

- 目标还没澄清的任务。
- 多个子任务需要同时修改同一文件。
- 需要频繁和用户交互确认的任务。
- 结果无法用证据、建议、风险结构化表达的任务。

### C. 一个推荐的结果契约

```text
Finding
  子 agent 的核心发现

Evidence
  相关文件、命令输出、截图或引用位置

Recommendation
  建议主 agent 采取的下一步动作

Risk
  仍不确定的地方、可能冲突、需要验证的条件
```

### D. Subagent 与权限继承

Subagent 可以继承上下文和权限边界，但不应该拥有绕过主线程的执行权。高风险动作仍应走同一套 sandbox / approval 机制。这样并行不会削弱安全边界。

### E. Subagent、handoff、fork 的区别

| 模式 | 主控权 | 上下文关系 | 适合场景 |
| --- | --- | --- | --- |
| subagent / agents-as-tools | 主 agent 始终掌控 | 子任务局部上下文 | 并行研究、代码审查、局部实现 |
| handoff | 控制权交给另一个 agent | 新 agent 接管流程 | 客服转人工、领域专家长流程接管 |
| fork | 从父上下文分支 | 复制或继承父线程上下文 | 探索不同方案、保留完整分支 |
| background agent | 独立长期任务 | 独立运行状态 | 异步修 bug、跑实验、长任务 |

Subagent 更像主 agent 调用的“局部工作线程”，而不是把对话控制权交出去。这个区别决定了主 agent 必须负责拆任务、等待结果、合并证据和做最终决策。

### F. 普通 spawn 与 `fork_context`

`spawn_agent` 可以有两种语义。普通 spawn 更像给子 agent 一个干净任务：它拿到 delegation message 和必要约束，从较窄上下文开始工作。`fork_context = true` 时，子 agent 会继承父线程上下文分支，适合在当前现场上探索另一条方案。

```text
普通 spawn
  -> 新子线程
  -> 任务说明 + 必要约束
  -> 更干净，污染少

fork_context
  -> 从父线程 fork
  -> 继承更多现场
  -> 更适合分支探索
```

选择哪种方式取决于任务是否依赖父线程细节。只做独立审查、检索、验证时，普通 spawn 更清爽；需要沿着当前上下文继续推演时，`fork_context` 更合适。

### G. Subagent 是否会和用户或主 agent 交互

Subagent 通常不会像主 agent 一样直接和用户聊天。它完成局部任务后，把结果通过父流程汇总给主 agent；用户看到的通常是主 agent 的 consolidated response。

但有两个例外：用户可以切换到 subagent thread 查看或干预；subagent 触发 approval request 时，权限请求可能从 inactive thread 冒泡到主交互通道。它和主 agent 的通信也不是自由聊天，而是通过 `spawn_agent`、`send_input`、`wait_agent`、`list_agents`、`close_agent`、`resume_agent` 这类控制工具，以及 mailbox / inter-agent communication 传递结果。

### H. Subagent 递归深度为什么要限制

Subagent 默认不应该无限继续 spawn 子 agent。递归 fan-out 会快速放大 token、延迟、工具竞争和权限风险。可以把常见限制理解成：

```text
main agent -> subagent
  通常允许

subagent -> sub-subagent
  默认受 max_depth 限制
```

深度限制不是削弱能力，而是防止任务树失控。更稳妥的做法是让 root agent 负责并行规划和合并，子 agent 专注完成窄任务。

</section>
