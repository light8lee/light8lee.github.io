---
layout: post
title: "Dive into Codex 05：Sandbox 与权限边界"
date: 2026-07-10 10:00:00 +0800
summary: "继续拆 Codex 的运行时安全边界：模型只能提出动作，真实执行要经过 permission profile、sandbox policy 和 approval flow。"
tags: [Codex, coding agent, visual-essay, source-notes, sandbox, permissions]
category: Codex
cover: /assets/posts/video-notes/dive-into-codex-05-sandbox-and-permissions/images/001-tool-power-risk.png
body_class: dive-into-codex-post
---

前一章说明了长任务如何被中断和重新驾驶。本章讨论另一个运行时核心问题：当模型可以驱动工具执行时，系统必须把“模型建议”和“真实执行”隔开。模型可以提出动作，但最终执行权在 runtime、policy、sandbox 和用户审批手里。

本章主线：

```text
model proposes command
  -> Command Parser
  -> Policy Engine
  -> Sandbox
  -> Approval Engine
  -> execution / denied feedback
  -> Session history
```

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-05-sandbox-and-permissions/images/001-tool-power-risk.png' | relative_url }}" alt="工具能力必须有边界" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Dive into Codex</p>
<h2>工具能力必须有边界</h2>

一旦模型可以调用 shell、修改文件、访问网络，Codex 就不再只是生成文本。工具能力会影响真实工作区，因此每一次执行都要经过 sandbox、permission profile 和 approval policy 的约束。

**与本页直接相关的补充**

模型拥有的是 proposal，不是 authority。它可以建议执行 `pytest`、修改文件或联网查询，但这些动作能不能真的发生，要由 runtime 判断。这个边界是 coding agent 能安全进入真实仓库的前提。

关键词：`sandbox`、`permissions`、`tool power`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-05-sandbox-and-permissions/images/002-command-policy-chain.png' | relative_url }}" alt="命令先过四段安全链路" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Dive into Codex</p>
<h2>命令先过四段安全链路</h2>

从模型给出命令到真正执行，中间不是一条直线。Command Parser 先识别命令意图，Policy Engine 判断策略，Sandbox 约束执行环境，Approval Engine 决定是否需要用户确认。

**与本页直接相关的补充**

这条链路可以理解为四个问题：这是什么命令？当前策略是否允许？即使允许，能在什么环境里跑？是否需要用户确认？只有这些问题都通过，工具调用才会进入真实执行层。

**源码辅助理解**

命令执行前的策略链可以按下面的 gate 来读：

```rust
async fn prepare_exec(command: ShellCommand, ctx: ExecContext) -> ExecDecision {
    // 1. 先识别命令意图和风险，例如是否写文件、是否联网、是否潜在破坏。
    let intent = parse_command_intent(&command);

    // 2. Permission profile 给出会话级默认边界。
    if !ctx.permission_profile.allows(&intent) {
        return ExecDecision::Denied("blocked by permission profile");
    }

    // 3. Sandbox policy 决定命令能在什么环境里执行。
    let sandbox = ctx.sandbox_policy.build_for(&command);

    // 4. 高风险动作不直接执行，而是生成 approval request。
    if ctx.approval_policy.requires_approval(&intent, &sandbox) {
        return ExecDecision::NeedsApproval {
            command,
            reason: intent.risk_summary(),
        };
    }

    ExecDecision::Run { command, sandbox }
}
```

这段骨架说明安全判断不是一个 `if`：命令意图、权限配置、sandbox 环境和 approval 策略会共同决定最终能不能执行。

关键词：`Command Parser`、`Policy Engine`、`Sandbox`、`Approval Engine`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-05-sandbox-and-permissions/images/003-permission-profile.png' | relative_url }}" alt="Permission Profile 决定默认边界" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Dive into Codex</p>
<h2>Permission Profile 决定默认边界</h2>

Permission profile 描述当前会话允许做什么：文件系统能否写、网络是否可用、命令是否需要批准。它把用户信任范围转成运行时策略，让 ToolRouter 有据可依。

**与本页直接相关的补充**

Permission profile 是会话级的默认安全姿态。比如只读模式、可写工作区、网络禁用、按需审批，都会影响 ToolRouter 后续如何处理工具调用。它把“这次任务信任到什么程度”变成可执行规则。

关键词：`permission profile`、`policy`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-05-sandbox-and-permissions/images/004-sandbox-policy.png' | relative_url }}" alt="Sandbox 约束执行环境" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Dive into Codex</p>
<h2>Sandbox 约束执行环境</h2>

Sandbox 更接近执行层边界。即使命令被模型提出，也要在受控环境里运行，限制它能读写哪里、能否联网、是否能越过工作区。这样工具执行才可控。

**与本页直接相关的补充**

Sandbox 的重点不是阻止 agent 工作，而是限定它工作的半径。文件系统、网络、进程、工作目录都可以成为 sandbox policy 的约束对象。这样即使模型提出了危险动作，也会被执行环境拦住。

关键词：`sandbox policy`、`filesystem`、`network`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-05-sandbox-and-permissions/images/005-approval-flow.png' | relative_url }}" alt="高风险动作需要批准" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Dive into Codex</p>
<h2>高风险动作需要批准</h2>

有些操作不应该静默执行，比如越权写文件、联网、潜在破坏性命令。Approval flow 让系统在执行前停下来，把风险和意图暴露给用户确认。

**与本页直接相关的补充**

Approval Engine 处理的是“策略不应自动放行”的动作。它要把命令、风险、目标和可能影响展示给用户。批准后执行，拒绝后把 denied feedback 写回 history，让模型下一轮知道这个路径不可用。

**源码辅助理解**

approval 的关键不是弹窗本身，而是把用户决策重新接回 Agent Loop：

```rust
async fn handle_approval(decision: ApprovalDecision, pending: PendingExec) -> ToolOutput {
    match decision {
        ApprovalDecision::Approved => {
            // 用户批准后，命令仍然在既定 sandbox 内执行。
            run_in_sandbox(pending.command, pending.sandbox).await
        }

        ApprovalDecision::Denied { reason } => {
            // 拒绝也要形成 tool output，模型下一轮才能改路线。
            ToolOutput::denied(format!(
                "command was not approved: {reason}"
            ))
        }
    }
}
```

所以拒绝不是“什么都没发生”。它会成为 history 里的 observation，告诉模型这个动作不能走，需要换成只读检查、缩小范围或请求更明确授权。

关键词：`approval`、`risk`、`command`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-05-sandbox-and-permissions/images/006-network-boundary.png' | relative_url }}" alt="网络是单独的风险面" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Dive into Codex</p>
<h2>网络是单独的风险面</h2>

网络访问会把本地任务连接到外部世界，风险和可复现性都不同。Codex 需要单独区分网络策略，避免模型在用户未授权时下载、上传或调用外部服务。

**与本页直接相关的补充**

网络权限不同于本地读写权限。联网可能泄露上下文、引入不可复现依赖、触发外部副作用，也可能让模型绕开本地审计。因此 network approval 通常要单独建模，不能简单归入普通 shell 权限。

关键词：`network approval`、`reproducibility`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-05-sandbox-and-permissions/images/007-workspace-roots.png' | relative_url }}" alt="工作区根目录定义活动范围" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Dive into Codex</p>
<h2>工作区根目录定义活动范围</h2>

Workspace roots 告诉 Codex 当前任务的有效边界。工具执行、文件搜索、补丁修改都应该围绕这些根目录展开，避免 agent 把不相关位置当成任务现场。

**与本页直接相关的补充**

workspace roots 把“当前项目”变成明确范围。搜索、读取、修改、测试都应优先在这些根目录内发生。越界访问不一定总是恶意，但会增加误改、泄露和上下文污染风险。

关键词：`workspace roots`、`filesystem boundary`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-05-sandbox-and-permissions/images/008-safe-feedback.png' | relative_url }}" alt="安全反馈也会进入循环" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Dive into Codex</p>
<h2>安全反馈也会进入循环</h2>

当操作被拒绝或需要批准时，这个结果也会回到 Session history。模型下一轮需要知道限制存在，才能调整方案，而不是反复尝试同一个被禁止动作。

**与本页直接相关的补充**

权限系统不是黑洞。拒绝、等待审批、审批通过、审批失败都应该成为可见 observation。这样模型可以重新计划：换一个只读方案、请求用户授权、缩小命令范围，或解释为什么当前任务无法继续。

**源码辅助理解**

安全反馈进入 history 后，下一轮模型才能基于限制继续推理：

```rust
async fn record_security_feedback(history: &History, feedback: SecurityFeedback) {
    let output = match feedback {
        SecurityFeedback::Denied { tool, reason } => {
            ResponseItem::FunctionCallOutput {
                call_id: tool.call_id,
                output: format!("denied: {reason}"),
            }
        }
        SecurityFeedback::ApprovalRequired { tool, reason } => {
            ResponseItem::FunctionCallOutput {
                call_id: tool.call_id,
                output: format!("approval required: {reason}"),
            }
        }
    };

    history.push(output).await;
}
```

这让 sandbox / approval 从“外部拦截器”变成 Agent Loop 的一部分：安全结果会改变后续计划。

关键词：`denied output`、`history`、`adjustment`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-05-sandbox-and-permissions/images/009-chapter-bridge-tools.png' | relative_url }}" alt="下一步看真实工具执行" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Dive into Codex</p>
<h2>下一步看真实工具执行</h2>

Sandbox 定义了边界，但边界内仍要完成真实工作。下一章会拆 Tool Execution：tool call 如何进入 runtime，输出如何格式化，workspace mutation 如何被记录。

**与本页直接相关的补充**

权限边界回答“能不能执行”，工具执行回答“如何执行”。下一章会进入边界内部，看 shell、apply_patch、MCP、输出截断、diff tracking 和 Session memory 如何形成完整闭环。

关键词：`Tool Execution`、`runtime`、`workspace`

## Appendix：补充材料

### A. Runtime 的权限判断不是单点开关

一个命令从模型输出到执行，至少会经过：命令分类、策略判断、sandbox 环境约束、approval 模式判断、执行结果回写。任何一步都可能把动作改成允许、拒绝、需要审批或降级执行。

### B. Approval 模式可以理解为信任级别

```text
never
  默认不询问，严格按已有策略执行或拒绝

on-request
  高风险或越界动作需要用户确认

untrusted
  更保守地处理命令和写操作
```

具体名字可能随产品形态变化，但核心思想不变：用户信任范围必须被 runtime 显式编码。

### C. sandbox 失败也是有用反馈

执行被拒绝、命令被 sandbox 拦截、网络不可用，并不只是错误。它们会告诉模型当前边界在哪里。好的 agent 会根据这些反馈调整方案，而不是反复请求同一个不可执行动作。

### D. 与后续章节的关系

- 第 06 章会拆真实工具执行、输出截断和 workspace mutation。
- 第 07 章会讨论 subagent 如何继承权限边界，以及子线程 approval 如何回到主线处理。

## 章节衔接

- 上一章：[Interrupt 与异步事件](../04-interrupt-and-async-events/)
- 下一章：[Tool Execution 与 Workspace](../06-tool-execution-workspace/)
- 总目录：[Dive into Codex](../../README.md)
</div>
</section>
