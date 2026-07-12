---
layout: post
title: "Dive into Codex 04：Interrupt 与异步事件"
date: 2026-07-09 10:00:00 +0800
summary: "进入 Codex 运行时控制：用户中断与 steer 如何经过 Session Queue 和 Event Queue，在安全边界停止、续接并处理异步事件。"
tags: [智能体运行时, 异步控制, 用户中断]
category: Codex
cover: /assets/posts/video-notes/dive-into-codex-04-interrupt-async-events/images/cover.png
body_class: dive-into-codex-post
series: dive-into-codex
series_previous_title: "Dive into Codex 03：Cache 与 Compaction"
series_previous_url: /codex/2026/07/07/dive-into-codex-03-cache-compaction.html
series_next_title: "Dive into Codex 05：Sandbox 与权限边界"
series_next_url: /codex/2026/07/10/dive-into-codex-05-sandbox-and-permissions.html
---

前面两章解决了模型输出结构和长上下文续航。本章进入运行时控制：当一个 Turn 正在执行时，用户可能追加指令、要求停止，工具也可能异步返回。Codex 必须在不中断状态一致性的前提下接住这些事件。

主线如下：

```text
long turn
  -> user interrupt / steer
  -> Session Queue
  -> Event Queue
  -> loop boundary
  -> safe stop / follow-up
  -> resume
```

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-04-interrupt-async-events/images/001-long-turn-problem.png' | relative_url }}" alt="长 Turn 不能锁死用户" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Dive into Codex</p>
<h2>长 Turn 不能锁死用户</h2>

Coding agent 可能连续跑很久：读文件、执行命令、改代码、再验证。用户在中途追加指令或叫停时，系统不能假装没听见，也不能粗暴破坏当前状态。

**与本页直接相关的补充**

长 Turn 的难点不是“能不能取消”，而是取消和继续都要保持现场一致。工具可能已经改了文件，模型可能只输出了一半，UI 还在展示事件流。Runtime 需要把这些状态分清楚，而不是把中断等同于简单 kill。

关键词：`long turn`、`user input`、`runtime control`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-04-interrupt-async-events/images/002-interrupt-intent.png' | relative_url }}" alt="Interrupt 是控制信号" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Dive into Codex</p>
<h2>Interrupt 是控制信号</h2>

用户中断不只是取消按钮。它表达的是新的控制意图：暂停、改方向、补充约束、继续执行。Codex 通常不会粗暴 kill 当前过程，而是在 loop boundary 或 safe point 把这个意图放进 Session 控制流。

**与本页直接相关的补充**

Interrupt 更像一条高优先级控制消息。它会影响后续 Turn 如何构建 prompt、是否继续 follow-up、是否把 pending input 合入下一轮。安全点的存在，是为了避免在工具写文件、参数未完整或 history 未写清时破坏状态。

关键词：`interrupt`、`control intent`、`Session`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-04-interrupt-async-events/images/003-session-queue.png' | relative_url }}" alt="SQ 接住新的输入" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Dive into Codex</p>
<h2>SQ 接住新的输入</h2>

Session Queue 可以理解成进入运行时的输入队列。用户新消息、resume、steer 等动作先排队，再由 Session 在合适时机取出处理，避免和当前 Turn 的内部状态互相踩踏。

**与本页直接相关的补充**

SQ 处理的是“外部输入如何进入运行时”。中途追加的用户消息不会直接插进当前工具调用内部，而是进入队列，等 Session 在可控边界处理。这样既能接住用户，又不会让内部状态出现半写入、半执行的混乱。

**源码辅助理解**

`codex-rs/core/src/session/input_queue.rs` 可以按“外部控制信号的缓冲区”理解：

```rust
enum TurnInput {
    UserMessage(UserInput),
    Interrupt,
    ApprovalResult(ApprovalDecision),
    Resume(ResumeRequest),
}

impl TurnInputQueue {
    async fn push(&self, input: TurnInput) {
        // 外部输入先入队，不直接打断正在执行的原子步骤。
        self.pending.lock().await.push_back(input);
        self.notify_session_loop();
    }

    async fn next_at_loop_boundary(&self) -> Option<TurnInput> {
        // Session 在安全边界取出输入，再决定是否 steer / interrupt / continue。
        self.pending.lock().await.pop_front()
    }
}
```

这个结构解释了为什么“中途输入”不等于“立刻插进工具内部”。队列让 Session 可以在边界点重新规划，而不是破坏当前执行状态。

关键词：`SQ`、`input queue`、`steer`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-04-interrupt-async-events/images/004-event-queue.png' | relative_url }}" alt="EQ 输出运行事件" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Dive into Codex</p>
<h2>EQ 输出运行事件</h2>

Event Queue 更像对外输出的事件通道。模型增量、工具开始/结束、状态更新、错误和最终回答都会通过事件流出去，让 TUI/App Server 可以持续刷新界面。

**与本页直接相关的补充**

EQ 处理的是“内部状态如何被外部观察”。它把模型 streaming、tool status、approval request、error、final message 等事件统一发给 UI。这样用户能看到任务进度，而不是等待一个黑盒运行结束。

**源码辅助理解**

事件输出可以理解成 Session 对外发布的运行日志：

```rust
async fn emit_runtime_events(event_tx: &EventSender, event: RuntimeEvent) {
    match event {
        // 模型文本增量：UI 可以边生成边展示。
        RuntimeEvent::TextDelta(delta) => {
            event_tx.send(Event::OutputTextDelta(delta)).await;
        }

        // 工具开始/结束：UI 能显示当前卡在哪里、是否失败。
        RuntimeEvent::ToolStarted(call) => {
            event_tx.send(Event::ToolCallStarted(call)).await;
        }
        RuntimeEvent::ToolFinished(output) => {
            event_tx.send(Event::ToolCallFinished(output)).await;
        }

        // 权限请求也走事件流，用户才能在交互界面里处理。
        RuntimeEvent::ApprovalRequired(req) => {
            event_tx.send(Event::ApprovalRequest(req)).await;
        }
    }
}
```

这就是 EQ 的作用：内部 loop 不直接等到最后才吐结果，而是持续把可观察状态推给 TUI/App Server。

关键词：`EQ`、`event stream`、`UI update`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-04-interrupt-async-events/images/005-two-queue-order.png' | relative_url }}" alt="两个队列保证秩序" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Dive into Codex</p>
<h2>两个队列保证秩序</h2>

SQ 关心输入怎么进入，EQ 关心输出怎么发出。把两者分开后，Codex 可以一边运行当前任务，一边接住新控制信号，并把中间进度稳定地推给外部界面。

**与本页直接相关的补充**

输入和输出如果混在一起，长任务很容易出现顺序错乱：用户新指令、工具结果、模型增量、UI 更新互相抢占。SQ/EQ 分离后，Session 可以明确地管理“下一步要处理什么”和“当前要对外报告什么”。

关键词：`input queue`、`event queue`、`ordering`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-04-interrupt-async-events/images/006-pending-input.png' | relative_url }}" alt="pending input 会影响后续循环" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Dive into Codex</p>
<h2>pending input 会影响后续循环</h2>

如果模型或工具执行过程中出现 pending input，Session 不一定立刻打断当前原子步骤，但会在循环边界重新判断：是否继续 follow-up，是否合并新输入，是否改变下一次 sampling 的上下文。

**与本页直接相关的补充**

pending input 的关键是“延迟到安全边界处理”。当前工具执行如果已经开始，runtime 可能先等它返回，再决定是否把新输入纳入下一轮 prompt。这样用户的 steer 能生效，同时不会破坏当前执行的原子性。

**源码辅助理解**

`run_turn` 里处理 pending input 的位置通常是循环边界，而不是任意一行：

```rust
loop {
    let sampling_result = run_sampling_request(...).await?;
    let tool_results = execute_ready_tools(sampling_result).await?;
    history.append(tool_results).await;

    // 工具结果写回之后，再检查是否有用户新输入或 interrupt。
    if let Some(input) = input_queue.next_at_loop_boundary().await {
        match input {
            TurnInput::Interrupt => break,
            TurnInput::UserMessage(msg) => {
                history.append_user_message(msg).await;
                continue; // 带着新用户意图重新 sampling
            }
            _ => handle_control_input(input).await?,
        }
    }
}
```

这样设计的好处是：用户可以 steer 长任务，但工具执行、history 写回和下一轮采样之间仍然有清楚的顺序。

关键词：`pending input`、`follow-up`、`loop boundary`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-04-interrupt-async-events/images/007-safe-stop.png' | relative_url }}" alt="停止也要写清状态" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Dive into Codex</p>
<h2>停止也要写清状态</h2>

中断后的停止不能只结束进程。已完成的工具输出和错误要写清楚，但未完成 response 不会作为完整结果提交，workspace 副作用也不会自动 rollback；resume 依赖这些真实状态继续。

**与本页直接相关的补充**

安全停止要区分三种东西：已经完成并写入 history 的事件、尚未完成的模型输出、已经发生的 workspace 副作用。未完成 response 不能伪装成完整回答；已经改过的文件也不会因为中断自动恢复。后续 resume 必须基于这个真实现场继续。

关键词：`stop`、`resume`、`history`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-04-interrupt-async-events/images/008-async-runtime.png' | relative_url }}" alt="异步让 agent 可被驾驶" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Dive into Codex</p>
<h2>异步让 agent 可被驾驶</h2>

异步队列让 Codex 从一次性问答变成可驾驶的任务运行时。用户可以在任务中途修正方向，系统也能持续报告进度，这正是长时间 coding agent 必须具备的能力。

**与本页直接相关的补充**

可驾驶的 agent 需要两个能力：接收新的控制意图，以及持续输出当前进度。SQ 负责前者，EQ 负责后者。二者合起来，让 Codex 能在长任务中被用户 steer，而不是只能等最终结果。

关键词：`async runtime`、`steerable agent`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-04-interrupt-async-events/images/009-chapter-bridge-sandbox.png' | relative_url }}" alt="下一步进入权限边界" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Dive into Codex</p>
<h2>下一步进入权限边界</h2>

当 agent 可以长时间运行并接收中断后，风险也随之变高。下一章会讨论 sandbox 和 permissions：工具真的会执行，所以执行边界必须成为运行时的一部分。

**与本页直接相关的补充**

异步控制让 agent 更灵活，也让执行风险更真实。用户可以中途改变方向，工具也可能持续运行；因此下一层必须回答“哪些动作可以执行、哪些必须审批、哪些应被 sandbox 限制”。

关键词：`sandbox`、`permissions`、`tool execution`

</div>
</section>

<section class="post-appendix" markdown="1">

## Appendix：补充材料

### A. Interrupt 不是三件事

Interrupt 不是简单取消、不是立即清空历史、也不是自动回滚工作区。它更像一条进入 Session 控制流的意图：要求系统在安全边界重新判断任务方向。

### B. SQ / EQ 的职责拆分

```text
Session Queue
  - user input
  - steer
  - resume
  - pending instruction

Event Queue
  - model deltas
  - tool status
  - approval request
  - errors
  - final message
```

### C. Resume 依赖真实状态

中断后的继续不应该假设一切回到中断前。更稳的方式是读取当前 history、workspace diff、已完成工具输出、未处理 pending input，然后再决定下一轮 prompt。

</section>
