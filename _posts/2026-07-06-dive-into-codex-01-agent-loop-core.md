---
layout: post
title: "Dive into Codex 01：Agent Loop 的核心地图"
date: 2026-07-06 09:00:00 +0800
summary: "从 Thread、Session、Turn Loop、Context Builder、Responses API 到 ToolRouter，先建立 Codex 本地 coding agent runtime 的核心闭环。"
tags: [Codex, coding agent, visual-essay, source-notes, agent-loop]
category: Codex
cover: /assets/posts/dive-into-codex/01-agent-loop-core/images/001-codex-runtime.png
---

这一章先建立 Codex 的整体心智模型：Codex 不是“聊天框 + 模型回复”的简单包装，而是一个由 `Thread`、`Session`、`Turn Loop`、`Context Builder`、`Responses API`、`ToolRouter`、`Workspace` 和 `History` 共同组成的本地 coding agent runtime。

阅读这一章时，先抓住一条主线：

```text
Thread
  -> Session
  -> Turn Loop
  -> Context / Prompt
  -> Responses API
  -> ToolRouter
  -> Workspace Mutation
  -> History / Memory
  -> next Turn
```

后续章节会分别展开这条链路上的关键机制：Responses API、Cache / Compaction、Interrupt、Sandbox、Tool Execution 和 Subagent。

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/001-codex-runtime.png' | relative_url }}" alt="Codex 不是聊天框" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Dive into Codex</p>
<h2>Codex 不是聊天框</h2>

Codex 更像一个本地 coding agent 运行时。聊天框只是入口，真正工作的部分在后面：Thread 接住用户输入，Session 保存状态，Turn Loop 一轮轮调用模型和工具。

**与本页直接相关的补充**

Codex 的核心不是“模型回答”，而是 `Session + Turn Loop + ToolRouter + Context/History` 构成的推理、执行、记忆闭环。正因为它要持续保存 rollout、处理权限、跟踪 workspace diff，所以它不能只维护一串 messages。

**关键词：**`Codex`、`coding agent`、`Thread`、`Session`、`Turn Loop`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/002-thread-shell.png' | relative_url }}" alt="Thread 是外壳" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Dive into Codex</p>
<h2>Thread 是外壳</h2>

Thread 更像对外的会话外壳。它负责接收输入、输出事件、处理 steer/resume/fork 这类交互动作，并把真正的 agent 工作交给内部 Session。

**与本页直接相关的补充**

可以把 `Thread` 理解为对外 API 边界：客户端调用 `submit`、`next_event`、`steer_input`、`try_start_turn_if_idle`，看到的是一条可交互的会话流。但这些动作最终会进入 Session 的 input queue 和 run loop。也就是说，Thread 负责“接住用户”，Session 负责“真正运行”。

**关键词：**`Thread`、`submit`、`next_event`、`resume`、`fork`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/003-session-state.png' | relative_url }}" alt="Session 是状态中心" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Dive into Codex</p>
<h2>Session 是状态中心</h2>

Session 才是 Codex 的状态容器。history、input queue、tool runtime、context window、permissions、sandbox、plugins、skills 都会在这里汇合。

**与本页直接相关的补充**

Session 是长期存在的 Agent Runtime。它维护的不只是对话历史，还包括当前 workspace roots、MCP 连接、permission profile、sandbox policy、token budget、rollout store 和 compaction state。没有 Session，Codex 就无法恢复现场、继续执行或让工具结果回到下一轮 prompt。

**关键词：**`Session`、`history`、`input queue`、`context`、`permissions`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/004-turn-unit.png' | relative_url }}" alt="Turn 是一次任务切片" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Dive into Codex</p>
<h2>Turn 是一次任务切片</h2>

Turn 不是一次模型调用，而是一段任务执行切片。一轮用户请求可能触发多次 sampling、多次 tool call、多次工具结果回写，直到状态判断可以停止。

**与本页直接相关的补充**

`tool call` 不算一个独立 Turn。更准确的关系是：一个 `Turn` 里可以包含多次 `Response` 采样和多次工具执行；一个 `Session` 又包含多个 Turn。这个层级关系能避免把模型采样、工具调用和用户回合混在一起。

**关键词：**`Turn`、`sampling`、`tool call`、`follow-up`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/005-run-turn-engine.png' | relative_url }}" alt="run_turn 是循环发动机" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Dive into Codex</p>
<h2>run_turn 是循环发动机</h2>

run_turn 是 Session 推进任务的发动机：准备上下文、请求模型、消费事件、执行工具、写回结果，并判断是否继续下一轮 sampling。

**与本页直接相关的补充**

`run_turn` 的主链路是：pre-sampling compaction -> context injection -> hooks -> record user input -> clone history -> sampling request -> handle streaming events -> execute tools -> append tool output -> decide follow-up。它是 Codex 由“回答问题”变成“持续执行任务”的关键循环。

**源码辅助理解**

阅读 `codex-rs/core/src/session/turn.rs` 时，可以先抓住下面这个控制流骨架。代码块保留的是运行关系，不是逐字源码：

```rust
async fn run_turn(session: &Session, turn_context: TurnContext) -> Result<()> {
    loop {
        // 1. 从 Session 取历史快照，整理成 Responses API 能消费的 input。
        let input = session
            .history
            .clone_history()
            .await
            .for_prompt(&turn_context.input_modalities);

        // 2. 发起一次模型采样。一次 Turn 里可能发生多次 sampling。
        let output_items = run_sampling_request(input, &turn_context).await?;

        // 3. 如果模型给出 tool call，就执行工具，并把结果写回 history。
        if let Some(tool_call) = output_items.next_tool_call() {
            let tool_output = session.tool_router.dispatch(tool_call).await?;
            session.history.record_tool_output(tool_output).await;
            continue; // 带着新的 tool result 再进入下一次 sampling
        }

        // 4. 如果模型给出最终 assistant message，并且没有 pending input，
        //    本次 Turn 才能结束。
        session.history.record_assistant_message(output_items).await;
        break;
    }

    Ok(())
}
```

这段骨架解释了为什么 `run_turn` 是“发动机”：它不断把模型输出变成真实工具执行，再把工具结果变成下一次模型输入。

**关键词：**`run_turn`、`Responses API`、`streaming`、`tool output`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/006-dynamic-prompt.png' | relative_url }}" alt="Prompt 是动态拼出来的" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Dive into Codex</p>
<h2>Prompt 是动态拼出来的</h2>

Prompt 不是静态字符串。Session 会把 history、AGENTS.md、workspace、skills、plugins、connectors、permissions、sandbox 和时间预算动态拼进当前请求。

**与本页直接相关的补充**

Prompt 构建可以分成 history 层和 injection layer。history 提供过去发生过什么，injection layer 提供当前环境和能力边界。这个区分很重要：同一段用户输入，在不同仓库、不同权限、不同工具集下，构建出的模型输入并不相同。

**关键词：**`Prompt`、`Context Builder`、`AGENTS.md`、`skills`、`permissions`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/007-history-source.png' | relative_url }}" alt="history 是真实来源" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Dive into Codex</p>
<h2>history 是真实来源</h2>

history 是 prompt 的真实数据源。每轮请求前，Session 会从 history 克隆、过滤并整理出模型当前可见的 input。

**与本页直接相关的补充**

`clone_history().await.for_prompt(...)` 的作用不是 prompt cache，而是把 Codex 内部维护的历史状态转换成当前请求要发送给模型的 input。prompt cache 发生在模型服务端，依赖请求前缀是否稳定；clone_history 发生在本地，是 Context Builder 的最后一段准备工作。

**源码辅助理解**

`codex-rs/core/src/context_manager/history.rs` 里的 `for_prompt` 可以这样读：

```rust
impl HistorySnapshot {
    fn for_prompt(mut self, input_modalities: &[InputModality]) -> Vec<ResponseItem> {
        // 1. 先规范化历史：整理 item 顺序，丢弃不适合继续进入 prompt 的内容。
        self.normalize_history();

        // 2. 根据模型能力裁剪内容。例如模型不支持图片输入时，
        //    message 或 tool output 里的 image content 不能原样进入请求。
        self.strip_unsupported_modalities(input_modalities);

        // 3. 返回结构化 ResponseItem，而不是拼成一整段字符串。
        self.items
    }
}
```

所以 history 不是聊天记录文本，而是一组需要被协议化处理的 `ResponseItem`。这也是 Codex 能把工具结果、reasoning、message 放在同一条运行轨迹里的原因。

**关键词：**`history`、`rollout`、`clone_history`、`for_prompt`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/008-context-injection.png' | relative_url }}" alt="注入层决定模型看见什么" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Dive into Codex</p>
<h2>注入层决定模型看见什么</h2>

注入层决定模型这一轮能看到哪些环境信息：仓库规则、workspace 状态、可用工具、skills、plugins、connectors、权限边界和 sandbox 约束。

**与本页直接相关的补充**

`AGENTS.md`、skills、plugins、connectors、world state、permissions、sandbox、time reminder、token budget 都属于动态注入范围。它们不是普通聊天历史，而是运行时根据当前任务重新组织的上下文材料。

**关键词：**`injection`、`AGENTS.md`、`plugins`、`connectors`、`workspace`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/009-responses-api.png' | relative_url }}" alt="Responses 更适合 agent" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Dive into Codex</p>
<h2>Responses 更适合 agent</h2>

Chat Completions 以 message 为中心，Responses API 更像事件和 item 的流水线。对 coding agent 来说，模型输出不只是文本，还包括 tool call、reasoning、streaming item 和可追踪状态。

**与本页直接相关的补充**

Responses 更适合 agent-like 应用，因为它让模型输出从“最终消息”变成一组可追踪 item：assistant message、function call、function call output、reasoning summary 等。这样 Session 才能把模型输出接进工具执行和历史记录。

**关键词：**`Responses API`、`item`、`message`、`tool call`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/010-streaming-items.png' | relative_url }}" alt="模型在发事件流" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Dive into Codex</p>
<h2>模型在发事件流</h2>

Codex 接收的不是一次性完整回答，而是 streaming event：文本增量、reasoning 摘要、tool call 参数片段、output item 完成事件、completed、rate limit 和 error。

**与本页直接相关的补充**

事件流让 runtime 可以边接收边行动，但也带来顺序约束。比如 `ToolCallInputDelta` 只是参数片段，不能立即执行；只有等到对应 output item 完成，ToolRouter 才能拿到完整参数并进入执行链路。

**关键词：**`streaming event`、`OutputItemDone`、`ToolCallInputDelta`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/011-toolrouter.png' | relative_url }}" alt="ToolRouter 连接模型和现实" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Dive into Codex</p>
<h2>ToolRouter 连接模型和现实</h2>

模型只会提出结构化 tool call，真正执行要经过 ToolRouter。ToolRouter 根据工具定义、权限、运行时和 sandbox，把请求路由到 shell、apply_patch、MCP 或插件工具。

**与本页直接相关的补充**

工具层可以拆成 Router、Runtime、Consumer。Router 负责选工具和权限过滤；Runtime 负责真正执行 shell、patch、MCP；Consumer 负责处理流式参数或 diff 反馈。ToolRouter 是“模型意图”和“真实世界操作”之间的转换层。

**源码辅助理解**

`codex-rs/core/src/tools/router.rs` 可以先按“工具名 -> 运行时”的分发器理解：

```rust
async fn dispatch_tool_call(call: ToolCall, ctx: ToolContext) -> ToolResult {
    match call.name.as_str() {
        // shell / exec 会进入 cwd、环境变量、权限、sandbox 等检查。
        "shell" | "exec" => run_shell_command(call.arguments, ctx).await,

        // apply_patch 走结构化补丁路径，成功或失败都能被审计。
        "apply_patch" => apply_patch(call.arguments, ctx).await,

        // MCP / plugin 工具来自 registry，通常有自己的 schema 和远端端点。
        name if ctx.registry.contains(name) => run_registered_tool(call, ctx).await,

        // 未注册工具不能执行，错误也要作为 tool output 回写给模型。
        _ => ToolResult::error("unknown tool"),
    }
}
```

这一层解释了“tool call 只是意图”：模型提出动作，路由层和安全层决定动作能否落地，执行结果再回到 Session history。

**关键词：**`ToolRouter`、`tool schema`、`runtime`、`sandbox`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/012-tool-types.png' | relative_url }}" alt="工具有不同分工" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Dive into Codex</p>
<h2>工具有不同分工</h2>

Codex 的工具层不是一个万能函数，而是一组有边界、有策略、有回传格式的执行通道：shell / exec、apply_patch、MCP、plugin tools。

**与本页直接相关的补充**

不同工具改变的对象不同：shell 改变或观察进程和文件系统状态，apply_patch 以 diff 的形式改写文件，MCP / plugin tools 可能连接外部系统。它们都要经过统一路由、权限判断和结果格式化，否则历史记录无法稳定消费。

**关键词：**`shell`、`apply_patch`、`MCP`、`plugin tools`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/013-workspace-mutation.png' | relative_url }}" alt="工具真的会改变工作区" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Dive into Codex</p>
<h2>工具真的会改变工作区</h2>

工具执行成功后，变化会落到真实 workspace。文件可能被创建、修改、删除；命令会产生输出；patch 会形成 diff。

**与本页直接相关的补充**

tool output 不是“回答”，而是世界状态变化后的观察结果。Codex 必须把 workspace mutation、diff、exit code、stdout/stderr 等信息重新整理成模型下一轮能理解的上下文。

**关键词：**`workspace mutation`、`diff`、`patch`、`apply`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/014-tool-output-loop.png' | relative_url }}" alt="工具结果会回到历史里" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">014 / Dive into Codex</p>
<h2>工具结果会回到历史里</h2>

工具执行结果不会停在终端输出里。Codex 会把 tool output 写回 history，作为下一次模型 sampling 的输入。

**与本页直接相关的补充**

完整闭环是：model -> tool call -> tool execution -> workspace mutation -> tool output / diff event -> Session.history.append -> next prompt。这个闭环让模型不再基于假设继续，而是基于真实执行反馈继续判断。

**关键词：**`tool output`、`history`、`next sampling`、`feedback loop`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/015-session-memory.png' | relative_url }}" alt="记忆来自运行轨迹" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">015 / Dive into Codex</p>
<h2>记忆来自运行轨迹</h2>

Codex 之所以“记得刚才改了什么”，不是因为模型天然有长期记忆，而是因为 Session 维护了 history、rollout trace、tool output 和工作区差异。

**与本页直接相关的补充**

可以把 Session memory 理解为：历史 + 工具执行结果 + workspace state projection + compaction summary。它是一套工程记录机制，而不是模型脑内记忆。真正进入下一轮推理的是被 Context Builder 重新组织后的这些记录。

**关键词：**`Session memory`、`rollout trace`、`diff tracking`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/016-prompt-cache.png' | relative_url }}" alt="cache 奖励稳定前缀" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">016 / Dive into Codex</p>
<h2>cache 奖励稳定前缀</h2>

Prompt cache 不是本地手动维护的缓存，而是模型服务侧对稳定请求前缀的复用收益。稳定的 tools、instructions 和上下文前缀有利于 cache。

**与本页直接相关的补充**

对 `tools[]` 来说，工具名称、描述、schema、顺序最好保持稳定。真正需要限制当前轮可调用工具时，更适合用 `tool_choice` / `allowed_tools`，而不是频繁改动整个 tools 列表。

**关键词：**`prompt cache`、`tools`、`stable prefix`、`previous_response_id`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/017-compaction.png' | relative_url }}" alt="compaction 不是普通总结" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">017 / Dive into Codex</p>
<h2>compaction 不是普通总结</h2>

长任务里，历史会越来越长。Compaction 的目标不是写一段普通摘要，而是把旧上下文压成能继续工作的状态。

**与本页直接相关的补充**

Compaction 的判定标准不是“短”，而是能不能保留任务目标、已改文件、关键决策、失败尝试、待办事项和约束条件。好的 compaction 更像交接状态包，而不是文章摘要。

**关键词：**`compaction`、`state`、`summary`、`context window`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/018-stop-or-follow-up.png' | relative_url }}" alt="继续还是停止由状态决定" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">018 / Dive into Codex</p>
<h2>继续还是停止由状态决定</h2>

每次 sampling 后，Codex 会判断是否还需要 follow-up。继续的原因可能是有工具结果要消费、有 pending input、agent loop 还没完成，或模型刚提出新的 tool call。

**与本页直接相关的补充**

Turn 结束不是因为模型说完一句话，而是因为当前没有继续执行的动作、没有必须处理的 pending input、没有需要回灌的工具结果。否则 Session 会继续推进下一轮。

**关键词：**`follow-up`、`stop`、`pending input`、`turn end`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/019-full-loop.png' | relative_url }}" alt="Codex 的核心闭环" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">019 / Dive into Codex</p>
<h2>Codex 的核心闭环</h2>

把所有层串起来就是：Thread 接住交互，Session 维护状态，Turn Loop 驱动 Responses，ToolRouter 执行工具，Workspace 产生变化，Tool output 写回 history，再进入下一轮 sampling。

**与本页直接相关的补充**

完整核心链路可以写成：CLI/TUI/App Server -> ThreadManager / CodexThread -> Session / Turn Loop -> Context Builder -> Responses API streaming -> ToolRouter -> tool output -> history -> next sampling。每个节点都不是独立模块，而是同一条 agent loop 的连续环节。

**关键词：**`Thread`、`Session`、`Turn Loop`、`ToolRouter`、`history`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/01-agent-loop-core/images/020-chapter-summary.png' | relative_url }}" alt="先理解闭环" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">020 / Dive into Codex</p>
<h2>先理解闭环</h2>

学 Codex 源码，不要先陷进单个函数。先抓住上下文如何被构建、模型如何提出动作、工具如何改变现实、结果如何回到记忆。

**与本页直接相关的补充**

后续章节会沿同一条闭环继续展开：Responses API 解释模型输出为什么是事件；Cache / Compaction 解释长任务如何续航；Sandbox 解释真实执行如何受控；Tool Execution 解释工具如何落地；Subagent 解释如何把这个 loop 拆到多个局部任务里。

**关键词：**`context`、`tool execution`、`memory`、`sandbox`、`subagent`
</div>
</section>

