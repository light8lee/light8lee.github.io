---
layout: post
title: "Dive into Codex：Goal 模式与长期任务控制"
date: 2026-09-28 14:00:00 +0800
summary: "Goal 不是更长的 Prompt，而是一套把目标保存为 Thread 状态、在 Idle 事件后续跑、并由主 Agent 基于证据完成审计的长期任务控制机制。"
tags: [智能体运行时, Goal, 长期任务]
category: Codex
cover: /assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/overview.png
body_class: dive-into-codex-post
series: dive-into-codex
series_previous_title: "Dive into Codex 08：System 指令与运行约束"
series_previous_url: /codex/2026/07/11/dive-into-codex-08-system-instructions-constraints.html
---

本文保留 Goal 模式原始 Markdown 的论述顺序与文字素材：左侧只使用图文包中已单独导出的上半部分插图，右侧承载正文、伪代码与职责表。文中的代码均为解释控制流的伪代码，而非可直接执行的实现。

## 本章主线

```text
/goal
  -> Persistent Goal State
  -> Thread Idle Event
  -> continue_if_idle()
  -> Goal Steering
  -> Completion Audit
  -> ACTIVE → COMPLETE
```

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/overview.png' | relative_url }}" alt="Goal 模式把目标交给运行时" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / Dive into Codex</p>
<h2>Goal 模式：把目标交给运行时</h2>

Codex 的 Goal 模式，本质上不是给模型一个更长的 Prompt，也不是让一次 LLM 调用无限运行，而是三个机制共同工作：Persistent Goal State（持久目标状态）、Event-driven Continuation（事件驱动续跑）和 Completion Audit（完成性审计）。

普通模式中，用户指令进入一次 Agent Turn，回合结束后就停止；Goal 模式在 Turn 结束、Thread 空闲后，再检查目标是否仍为 ACTIVE。是否继续运行，由 Runtime 的确定性代码决定；是否已经满足语义目标，主要由 Agent 基于实际证据判断。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/state.png' | relative_url }}" alt="Goal State 保存最终必须做到什么" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / Dive into Codex</p>
<h2>Goal State 保存最终必须做到什么</h2>

当用户输入 `/goal`，并要求“把接口 p95 延迟降低到 120ms 以下，同时保证所有 correctness tests 通过”，Codex 会走独立的 Goal 控制路径，把目标保存成 Thread 级状态。Conversation Context 负责记录此前发生了什么；Goal State 负责记录最终必须做到什么。

目标不只依靠对话历史长期记住。即使发生 Context Compression（上下文压缩），原始目标仍然可以重新注入后续 Turn。

```text
goal = ThreadGoal(
    objective="p95 < 120ms，且全部测试通过",
    status=ACTIVE,
    token_budget=...,
)
```
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/state.png' | relative_url }}" alt="设置 Goal 后尝试启动" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / Dive into Codex</p>
<h2>设置目标：先保存，再尝试启动</h2>

设置 Goal 时，Runtime 先保存 objective，并把状态设为 ACTIVE，然后调用 `continue_if_idle()`。如果当前 Thread 空闲，就启动 Goal Turn，让 Agent 开始执行。一次 Turn 结束后，线程再次进入 Idle，Runtime 会重新读取 Goal。只要 Goal 仍为 ACTIVE，就再启动一个 Turn；如果已经不是 ACTIVE，则不沿这条路径自动续跑。

因此，`set_goal()` 建立持久目标，而 `continue_if_idle()` 把这个目标接入后续执行。

```text
async def set_goal(objective):
    save_goal(
        objective=objective,
        status=ACTIVE,
    )
    await continue_if_idle()
```
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/loop.png' | relative_url }}" alt="Turn 结束后通过 Idle 检查目标" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / Dive into Codex</p>
<h2>一次 Turn 结束，目标还可能未完成</h2>

完整链路从用户 `/goal` 开始：保存 ThreadGoal → 设置 ACTIVE → 检查当前 Thread 是否空闲 → 启动 Goal Turn → Agent 执行任务。随后，Turn 结束 → Thread Idle → Runtime 重新读取 Goal → 再判断 ACTIVE。

这里有两个不同的结束：Turn 结束表示当前回合停下来了；Goal 完成表示原始目标已经得到证据支持，并更新了目标状态。所以，线程空闲是重新检查目标的触发点，不能直接当作任务完成的证据。

```text
Turn 结束
    ↓
Thread Idle
    ↓
读取 Goal.status
    ├─ ACTIVE → 启动下一 Turn
    └─ 非 ACTIVE → 不再自动续跑
```
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/loop.png' | relative_url }}" alt="continue_if_idle 的三步控制" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / Dive into Codex</p>
<h2><code>continue_if_idle()</code> 的三步控制</h2>

Goal Runtime 的核心逻辑可以抽象为三步：读取当前 Goal；检查目标是否存在、状态是否为 ACTIVE；若仍然活跃，则构造目标引导信息，并在空闲时启动新 Turn。下面是核心逻辑的简化伪代码，用于说明控制流，并非可直接执行的完整实现。

```text
async def continue_if_idle():
    goal = load_goal()
    if goal is None:
        return
    if goal.status != ACTIVE:
        return

    steering = build_goal_prompt(goal)
    start_turn_if_idle(
        input=steering,
        trigger="goal",
    )
```

Goal 的工作方式不是 `while True: model.run()`。它依赖事件驱动：Turn 结束 → Thread Idle Event → `continue_if_idle()` → 检查 Goal Active → 启动下一 Turn。可以近似理解为：`on_thread_idle()` 调用 `continue_if_idle()`。模型的一次调用有自己的边界，Runtime 则在回合之间继续管理任务。

```text
async def on_thread_idle():
    await continue_if_idle()

if thread_is_idle and goal.status == ACTIVE:
    run_one_more_turn()
```
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/steering.png' | relative_url }}" alt="每轮重新注入 Goal Steering" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / Dive into Codex</p>
<h2>Goal Steering：每轮重新注入目标</h2>

Runtime 不会只给模型一句“继续”，而是重新构造 Goal Steering（目标引导信息）。模型会重新知道三件事：我要做到什么、现在还有多少预算、什么情况下才允许宣布完成。

规则包括：不要缩小原始目标；根据当前真实状态继续工作；完成前逐项检查 Requirement；证据不足就继续；全部满足后调用 `update_goal(complete)`。这是 Goal 能跨多个 Turn、跨 Context Compression 保持目标连续性的关键。

```text
Active Goal
Objective: p95 < 120ms，全部测试通过
Current budget:
    used tokens: ...
    remaining tokens: ...
Rules: 保留目标 / 检查真实状态 / 逐项验收
```
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/audit.png' | relative_url }}" alt="完成性审计逐项检查证据" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Dive into Codex</p>
<h2>完成性审计：每个要求都要有证据</h2>

Goal Runtime 本身并不理解 `p95 < 120ms` 到底有没有实现。语义判断仍然主要交给 Agent，Continuation Prompt 要求它把目标拆成需要满足的 Requirement。对每一项要求，Agent 检查当前实际状态，判断证据是否证明要求已经满足。证据不足，就继续工作。

在示例里，Requirement A 是 `p95 < 120ms`，证据可以是 `benchmark = 114ms`；Requirement B 是 correctness tests 全部通过，证据是 `full test suite = PASS`。只有所有 Requirement 都被实际证据支持，才能真正宣布完成。

```text
if all_requirements_proven():
    update_goal(status="complete")
```

Agent 即使回答“任务已经完成”，如果 Goal 状态仍然是 ACTIVE，那么下一次 Thread Idle 时，Runtime 仍会再次启动 Goal Turn。真正改变控制流的是 ACTIVE → COMPLETE；自然语言里的“完成了”与 Runtime 状态 COMPLETE 不等价。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/example.png' | relative_url }}" alt="第一轮性能优化未达标" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / Dive into Codex</p>
<h2>第一轮：测试通过，性能还未达标</h2>

目标同时包含两项要求：`p95 < 120ms`，并且 correctness tests 全部通过。第一轮先跑 benchmark，得到 `p95 = 183ms`。Agent 分析热点、修改缓存，再次测量得到 `142ms`，测试结果为 PASS。

完成性审计逐项核对：测试通过已经满足；142ms 仍高于 120ms，性能要求未满足。因此，Agent 不能把部分满足当作全部完成。Goal.status 继续保持 ACTIVE，然后这一轮 Turn 结束。

```text
benchmark: 183ms
    ↓ 分析热点、修改缓存
benchmark: 142ms
tests: PASS

p95 < 120ms ?  未满足
Goal.status = ACTIVE
```

第一轮结束时，Goal 仍是 ACTIVE：`Turn #1 Stop → Thread Idle → continue_if_idle() → load_goal() → status == ACTIVE → 启动 Turn #2`。用户不需要再输入“继续”；Runtime 负责把未完成目标带入下一回合。这里检查的只是已保存的 Goal 状态，性能指标是否达标、测试是否足以证明目标，仍由 Agent 在执行和审计中处理。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/example.png' | relative_url }}" alt="第二轮性能优化完成" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / Dive into Codex</p>
<h2>第二轮：114ms 与全量测试通过</h2>

第二轮继续 profiling，发现 serialization（序列化）热点，修改代码后重新运行 benchmark，得到 `114ms`；full tests 的结果为 PASS。完成性审计得到两项结论：`114 < 120`，Requirement A 为 PROVEN；测试全部通过，Requirement B 为 PROVEN。

于是 Agent 调用 `update_goal(status="complete")`，把 Goal 从 ACTIVE 更新为 COMPLETE。第二轮结束后再进入 Thread Idle，Runtime 读取到 COMPLETE，就停止自动续跑。

```text
benchmark = 114ms → PROVEN
full tests = PASS → PROVEN
    ↓
update_goal(status="complete")
    ↓
Thread Idle → COMPLETE → 停止
```
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/state.png' | relative_url }}" alt="Goal Runtime 保存读取并条件续跑" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / Dive into Codex</p>
<h2>核心伪代码：保存、读取、条件续跑</h2>

省略具体类名、Accounting 和通知机制等实现细节后，Goal Runtime 的主要控制结构可以写成下面的伪代码。Goal 保存 objective 与 status。`set_goal()` 写入 ACTIVE 目标，并尝试续跑；`continue_if_idle()` 读取状态，只对 active 目标构造 continuation prompt，再请求空闲时启动 Turn。

```text
class Goal:
    objective: str
    status: str

async def set_goal(objective):
    save_goal(Goal(objective, status="active"))
    await continue_if_idle()

async def continue_if_idle():
    goal = load_goal()
    if goal.status != "active":
        return
    prompt = build_goal_continuation_prompt(goal)
    start_turn_if_idle(prompt)
```
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/audit.png' | relative_url }}" alt="Agent Turn 内执行完成性审计" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / Dive into Codex</p>
<h2>核心伪代码：执行后做完成性审计</h2>

Thread Idle 事件把控制交回 `continue_if_idle()`。在每次 Agent Turn 内，Agent 进行推理、使用工具，并检查真实状态。如果 `completion_audit(goal)` 通过，就调用 `update_goal("complete")`；如果没有通过，不能沿完成路径更新状态。

两段逻辑共同构成闭环：Runtime 根据状态安排下一轮；Agent 的执行与审计结果又会影响这个状态。

```text
async def on_thread_idle():
    await continue_if_idle()

async def agent_turn(goal):
    reason()
    use_tools()
    inspect_real_state()

    if completion_audit(goal):
        update_goal("complete")
```
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/overview.png' | relative_url }}" alt="把是否继续从用户搬进 Runtime" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / Dive into Codex</p>
<h2>把“是否继续”从用户搬进 Runtime</h2>

传统 Agent 的控制循环往往在人：Agent 做一次 → 停下来 → 人看结果 → 发现没完成 → 输入“继续” → Agent 再做一次。Goal 模式把这层循环搬进 Runtime：Agent 做一次 → Runtime 检查 Goal State → 仍然 ACTIVE → Runtime 自动续跑。

所以它解决的是长期任务的执行衔接，把“是否需要继续调用模型”从用户手里下沉到了 Agent Runtime。在这个闭环里，状态检查与实际验收承担不同职责。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/roles.png' | relative_url }}" alt="Goal Runtime 负责状态与续跑" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">13 / Dive into Codex</p>
<h2>Runtime 负责保存状态与控制续跑</h2>

Runtime 一侧的职责可以分成四个环节。Goal Runtime 保存目标，Goal Runtime / Goal Store 记录状态；线程空闲后由 Runtime 判断是否再启动 Turn。看到 Goal 不再是 ACTIVE 后，Runtime 停止自动续跑。这个检查是确定性的状态判断，并不直接验证某个业务目标是否达成。

| 环节 | 负责方 |
| --- | --- |
| 保存 Goal | Goal Runtime |
| 记录 ACTIVE / COMPLETE 等状态 | Runtime / Goal Store |
| Thread 空闲后是否启动下一 Turn | Goal Runtime |
| 非 ACTIVE 后停止自动续跑 | Goal Runtime |

Goal Store 也记录 BLOCKED / PAUSED 等状态。本节讨论状态存储与续跑检查；各状态的触发条件需要分别定义。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/roles.png' | relative_url }}" alt="主 Agent 负责理解执行和证据判断" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">14 / Dive into Codex</p>
<h2>主 Agent 负责理解、执行与判断证据</h2>

当前主 Agent 需要理解 Goal 的具体语义，把目标拆成 Requirement，并决定应检查哪些证据。它调用测试、读取文件、检查运行结果，再判断证据是否足以证明每个 Requirement。决定完成后，也由它调用 `update_goal(status="complete")`。

| 环节 | 负责方 |
| --- | --- |
| 理解 Goal，拆出 Requirement | 当前主 Agent |
| 决定检查什么，调用测试与工具 | 当前主 Agent |
| 收集证据，判断是否足以证明 | 当前主 Agent |
| 决定完成，调用 update_goal | 当前主 Agent |

Goal Runtime 当前不会为了判断完成，固定再启动一个独立 Subagent 或 Judge Agent。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/roles.png' | relative_url }}" alt="状态判断与语义判断分工" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">15 / Dive into Codex</p>
<h2>状态为 ACTIVE，与证据够不够</h2>

Runtime 回答的是：“这个 Goal 现在还是不是 ACTIVE？”主 Agent 回答的是：“当前代码、测试和运行结果，是否证明原始 Goal 的所有要求都已满足？”主 Agent 逐项取证；只要有一项未被证明，就不沿完成路径更新状态。所有要求被证明后，才写入 COMPLETE。这个结论存回 Goal Store，Runtime 再读取状态，决定下一次 Idle 时是否继续。

```text
requirements = derive_requirements(goal.objective)
for requirement in requirements:
    evidence = inspect_current_state(requirement)
    if not proven(requirement, evidence):
        return  # Goal 保持 ACTIVE

update_goal(status="complete")
```

当前 Goal Completion 的结构是 Main Agent 同时承担 Execute 与 Verify，然后调用 `update_goal(...)`。它不是 Main Agent 把产物交给固定的独立 Judge Subagent，再由后者返回 PASS / FAIL 的验收链。实际的完成性验证，仍发生在当前主 Agent 的 Goal Turn 内。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dive-into-codex-09-goal-runtime/images/overview.png' | relative_url }}" alt="Goal 长期任务控制机制总结" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">16 / Dive into Codex</p>
<h2>三个设计点，形成长期任务控制机制</h2>

第一，Goal 是 Runtime State，不只是 Prompt。Context 记录此前做了什么，Goal 记录最终必须做到什么；上下文压缩后，目标仍可重新注入。

第二，Goal Loop 是 Event-driven。每次 Agent Turn 停下、Thread 进入 Idle，Runtime 重新读取目标状态，决定是否继续调用模型。

第三，Runtime 与 Agent 职责分开。Runtime 管理状态与续跑；主 Agent 理解目标、执行任务、收集证据、判断是否满足，并调用 `update_goal`。

把目标保存为 Thread 级持久状态，利用 Idle 事件继续执行，再由 Agent 基于证据更新完成状态——这构成面向长期任务的 Agent Runtime 控制机制。
</div>
</section>
