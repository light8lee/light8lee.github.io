---
layout: post
title: "Dive into Codex 06：Tool Execution 与 Workspace"
date: 2026-07-11 10:00:00 +0800
summary: "前一章定义了执行边界。本章进入边界内部：模型提出 tool call 之后，Codex 如何选择工具、执行命令、修改文件、截断输出、验证结果，并把这些真实副作用写回 Session memory。"
tags: [智能体运行时, 工具调用, 工作区管理]
category: Codex
cover: /assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/cover.png
body_class: dive-into-codex-post
series: dive-into-codex
series_previous_title: "Dive into Codex 05：Sandbox 与权限边界"
series_previous_url: /codex/2026/07/10/dive-into-codex-05-sandbox-and-permissions.html
series_next_title: "Dive into Codex 07：Subagent 架构"
series_next_url: /codex/2026/07/11/dive-into-codex-07-subagent-architecture.html
---

前一章定义了执行边界。本章进入边界内部：模型提出 tool call 之后，Codex 如何选择工具、执行命令、修改文件、截断输出、验证结果，并把这些真实副作用写回 Session memory。

本章主线：

```text
tool call as intent
  -> ToolRouter dispatch
  -> shell / apply_patch / MCP / plugins
  -> formatted output
  -> workspace mutation
  -> verification
  -> Session memory
```

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/001-tool-call-is-intent.png' | relative_url }}" alt="tool call 只是意图" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Dive into Codex</p>
<h2>tool call 只是意图</h2>

模型产生 tool call，并不等于工具已经执行。它只是结构化意图：要调用哪个工具、传哪些参数、期望解决什么问题。真正执行发生在 Codex 的工具运行时里。

**与本页直接相关的补充**

tool call 是 proposal，runtime 才拥有执行权。模型输出的只是工具名和参数，后续还要经过 schema 校验、权限判断、sandbox 约束和工具分发。把“提出调用”和“真实执行”分开，是可审计执行的基础。

关键词：`tool call`、`intent`、`runtime`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/002-tool-router-dispatch.png' | relative_url }}" alt="ToolRouter 负责分发" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Dive into Codex</p>
<h2>ToolRouter 负责分发</h2>

ToolRouter 根据工具名、schema、权限和运行时类型，把调用分发给 shell、apply_patch、MCP、插件或其他动态工具。它是模型意图和真实世界操作之间的交换机。

**与本页直接相关的补充**

ToolRouter 不只是查表调用函数。它要合并内置工具、MCP、plugins、connectors 和动态工具，还要结合当前权限和 tool mode 判断能否执行。它把模型侧统一的 tool call 转成不同 runtime 能理解的动作。

**源码辅助理解**

ToolRouter 的核心可以按“解析 tool call -> 找到 runtime -> 执行 -> 包装结果”理解：

```rust
async fn route_tool_call(call: ToolCall, ctx: ToolContext) -> ToolOutput {
    // 1. tool name 来自模型输出，但必须在 registry 里能找到定义。
    let spec = match ctx.registry.find(&call.name) {
        Some(spec) => spec,
        None => return ToolOutput::error("tool is not registered"),
    };

    // 2. 按工具类型进入不同 runtime。
    let result = match spec.runtime {
        ToolRuntime::Shell => shell_runtime::run(call.arguments, ctx).await,
        ToolRuntime::Patch => patch_runtime::apply(call.arguments, ctx).await,
        ToolRuntime::Mcp(server) => mcp_runtime::call(server, call.arguments).await,
        ToolRuntime::Plugin(plugin) => plugin_runtime::call(plugin, call.arguments).await,
    };

    // 3. 统一格式化，保证后续 history 可以稳定消费。
    format_tool_output(result)
}
```

这就是工具层的“交换机”职责：模型看到统一 tool call，runtime 面对的是不同执行后端。

关键词：`ToolRouter`、`schema`、`dispatch`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/003-shell-runtime.png' | relative_url }}" alt="shell 用来观察和执行" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Dive into Codex</p>
<h2>shell 用来观察和执行</h2>

shell 工具适合读取环境、运行测试、查看 git 状态、执行构建命令。它的输出要包含 exit code、wall time 和截断后的 stdout/stderr，供模型下一轮判断。

**与本页直接相关的补充**

shell 输出必须被结构化。仅有 stdout 不够，exit code 表示命令是否成功，wall time 提供运行成本信号，stderr 常常包含失败原因。过长输出要截断，否则一次测试日志就可能污染后续上下文。

**源码辅助理解**

shell runtime 的输出通常要保留这些字段：

```rust
struct ShellToolOutput {
    // 命令是否成功，模型下一轮会据此判断继续修复还是进入收尾。
    exit_code: i32,

    // 执行耗时，用来观察长命令、卡住的测试或超时风险。
    wall_time_ms: u64,

    // stdout / stderr 都要保留，但进入模型前需要截断。
    stdout: String,
    stderr: String,

    // 截断不是静默丢弃，要告诉模型输出并不完整。
    truncated: bool,
}

fn format_shell_output(raw: RawShellResult) -> ShellToolOutput {
    ShellToolOutput {
        exit_code: raw.exit_code,
        wall_time_ms: raw.elapsed.as_millis() as u64,
        stdout: truncate_for_model(raw.stdout),
        stderr: truncate_for_model(raw.stderr),
        truncated: raw.was_truncated(),
    }
}
```

这段结构解释了为什么工具输出不是普通终端日志。它要为下一轮推理服务，所以必须保留成功/失败、关键错误和截断信号。

关键词：`shell`、`exit code`、`stdout`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/004-apply-patch-runtime.png' | relative_url }}" alt="apply_patch 用来可审计修改" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Dive into Codex</p>
<h2>apply_patch 用来可审计修改</h2>

修改文件时，apply_patch 比直接重写更可审计。补丁描述了新增、删除和上下文，能让变更范围更清楚，也更容易在 review 时判断模型到底改了什么。

**与本页直接相关的补充**

apply_patch 的价值在于把文件变更变成显式 diff。失败时，runtime 可以返回清晰错误；成功时，review 可以看到上下文和变更范围。对 coding agent 来说，这比直接覆盖文件更容易恢复和审计。

关键词：`apply_patch`、`diff`、`audit`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/005-mcp-and-plugins.png' | relative_url }}" alt="MCP 与插件扩展工具边界" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Dive into Codex</p>
<h2>MCP 与插件扩展工具边界</h2>

MCP、connectors 和 plugins 让 Codex 能连接 GitHub、Drive、浏览器或自定义系统。它们扩展了工具面，但仍要经过统一的路由、权限和结果回传机制。

**与本页直接相关的补充**

扩展工具不能绕过核心运行时。无论工具来自 MCP、插件还是 connector，都应该有明确 schema、权限边界、执行结果格式和错误回传方式。否则工具越多，Session history 越难保持一致。

关键词：`MCP`、`plugins`、`connectors`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/006-output-format.png' | relative_url }}" alt="输出要被格式化后回传" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Dive into Codex</p>
<h2>输出要被格式化后回传</h2>

工具结果不能原样无限塞回模型。Codex 会整理输出，保留关键信息并截断过长内容，形成可进入 history 的 tool output item，避免上下文被噪声淹没。

**与本页直接相关的补充**

格式化输出要保留决策所需的信息：命令、退出码、关键 stdout/stderr、错误摘要、文件变更、截断提示。它不追求完整复刻终端，而是让下一轮模型能判断“发生了什么、是否成功、下一步该做什么”。

**源码辅助理解**

工具完成后，结果要进入 history，成为下一次 sampling 的事实来源：

```rust
async fn append_tool_result(history: &History, call: ToolCall, result: ToolOutput) {
    // 1. 保留 call_id，后续模型才能把输出和原始工具调用对齐。
    let item = ResponseItem::FunctionCallOutput {
        call_id: call.call_id,
        output: result.render_for_model(),
    };

    // 2. 写回 history 后，下一次 for_prompt 才会把它发给模型。
    history.push(item).await;
}
```

如果没有这一步，模型只能记得“自己想调用工具”，却看不到真实执行发生了什么。Tool execution 的闭环就断在这里。

关键词：`tool output`、`truncation`、`history item`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/007-workspace-mutation.png' | relative_url }}" alt="工作区变化是真实副作用" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Dive into Codex</p>
<h2>工作区变化是真实副作用</h2>

当工具创建、修改或删除文件时，workspace 状态真的改变了。Codex 需要尊重这些副作用：后续搜索、测试、diff 和模型判断都基于这个真实工作区继续。

**与本页直接相关的补充**

Workspace mutation 是 coding agent 和纯文本 agent 的分界线。模型不只是“说要改文件”，而是通过工具让文件系统真的变化。后续 prompt 必须基于当前文件状态，而不是基于模型上一轮的想象。

关键词：`workspace mutation`、`file state`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/008-verification-loop.png' | relative_url }}" alt="验证也是工具循环的一部分" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Dive into Codex</p>
<h2>验证也是工具循环的一部分</h2>

完成修改后，Codex 还要用工具验证：跑测试、查链接、检查图片尺寸、看 git diff。验证输出再次回到 history，帮助模型决定是否继续修正。

**与本页直接相关的补充**

验证不是收尾仪式，而是下一轮决策输入。测试失败会触发修复，lint 报错会缩小问题范围，git diff 会暴露非预期修改。验证工具把“我觉得改好了”变成“当前状态支持这个结论”。

关键词：`verification`、`tests`、`diff`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/009-execution-memory.png' | relative_url }}" alt="执行轨迹形成 Session 记忆" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Dive into Codex</p>
<h2>执行轨迹形成 Session 记忆</h2>

Session 记住的不是抽象计划，而是一次次工具调用、输出、错误和修复。这个执行轨迹让 Codex 能从失败中调整，也让最终结果可追踪。

**与本页直接相关的补充**

Session memory 可以理解为执行轨迹的结构化投影：tool call、tool output、patch result、file change、test output、compaction summary。模型下一轮看到的“记忆”，其实是这些轨迹被 Context Builder 重新整理后的结果。

关键词：`execution trace`、`Session memory`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-06-tool-execution-workspace/images/010-chapter-bridge-subagent.png' | relative_url }}" alt="下一步扩展到 Subagent" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Dive into Codex</p>
<h2>下一步扩展到 Subagent</h2>

当单个 Agent Loop 已经能稳定执行工具，下一层问题是并行与分工。Subagent 会把复杂任务拆成多个局部循环，再把结果汇总回主线。

**与本页直接相关的补充**

Subagent 不是为了替代主 agent，而是把局部任务拆出去运行。只有当单个 loop 的工具执行、权限、history 和验证已经稳定后，并行拆分才有意义。否则只是把不稳定性放大到多个线程。

关键词：`Subagent`、`parallel work`、`orchestration`
</div>
</section>

<section class="post-appendix" markdown="1">

## Appendix：补充材料

### A. Tool execution 的完整闭环

```text
Model output
  -> tool call
  -> ToolRouter
  -> Tool runtime
  -> workspace mutation / external state change
  -> formatted tool output
  -> Session.history
  -> Context Builder
  -> next prompt
```

### B. 常见工具类型

- `shell / exec`：观察环境、运行命令、测试、构建。
- `apply_patch`：以 diff 形式修改文件，便于审计。
- `MCP / connectors`：连接外部系统，如 GitHub、Drive、浏览器。
- `plugins`：扩展特定领域工具能力。

### C. 输出截断不是丢信息，而是保留决策信号

工具输出过长时，完整日志不一定比摘要更有用。保留 exit code、关键错误、前后若干行和截断提示，通常比塞入全部 stdout 更利于下一轮推理。

### D. 为什么偏向 patch，而不是直接整文件覆盖

Codex 倾向于用 patch / diff 描述修改，而不是让模型直接重写整个文件。核心原因有三点：

- 可审查：改了哪几行、上下文是什么，一眼能看出来。
- 可控：runtime 可以判断目标路径、操作类型、是否越过 workspace 或 sandbox。
- 可恢复：补丁失败可以返回明确错误，成功后也能进入 review / diff / commit 流程。

整文件覆盖在小文件里看似简单，但对真实仓库风险更高：容易误删用户已有改动，难以判断变更范围，也不利于权限系统识别动作边界。patch 把“模型想改代码”转成“可审计的文件变更请求”，这正是 Tool Execution 层存在的价值。

</section>
