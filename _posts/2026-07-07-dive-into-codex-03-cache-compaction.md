---
layout: post
title: "Dive into Codex 03：Cache 与 Compaction"
date: 2026-07-07 08:48:21 +0800
summary: "继续看 Codex 长任务里的上下文管理：稳定前缀如何帮助 prompt cache，compaction 如何在窗口压力下保留可继续工作的状态。"
tags: [上下文管理, 长上下文, 缓存优化]
category: Codex
cover: /assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/001-request-lifecycle-map.png
body_class: dive-into-codex-post
series: dive-into-codex
series_previous_title: "Dive into Codex 02：Responses API 事件模型"
series_previous_url: /codex/2026/07/05/dive-into-codex-02-responses-api-design.html
series_next_title: "Dive into Codex 04：Interrupt 与异步事件"
series_next_url: /codex/2026/07/09/dive-into-codex-04-interrupt-async-events.html
---

第 02 章解释了 Responses API 如何把模型输出变成事件日志。本章换一个 top-down 视角：先用一张粗地图看一次长任务请求的生命周期，再逐页拆开 cache、compaction 和不同 memory 的定位。

本章主线：

```text
Context Builder builds request
  -> server prompt cache checks stable prefix
  -> sampling / tools append new history
  -> history grows and creates token pressure
  -> compaction rewrites old trajectory into runtime memory
  -> compacted context + raw tail feeds the next prompt
  -> cross-session memories and AGENTS.md sit at different layers
```


<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/001-request-lifecycle-map.png' | relative_url }}" alt="先看一次请求的生命周期" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Dive into Codex</p>
<h2>先看一次请求的生命周期</h2>

Cache 和 compaction 不是并列散点。一次长任务会先由 Context Builder 拼出请求，服务端尝试复用稳定前缀；执行后 history 继续增长，接近窗口压力时再触发 compaction，生成下一轮可用的上下文。

**增量解释**

可以先把整章理解成一条闭环：Codex 本地负责组装 prompt，模型服务端负责执行 sampling 和判断 cache，执行结果又回到本地 history。只要任务继续，history 就会继续膨胀；当它接近窗口限制，runtime 才需要 compaction 介入，把旧轨迹改写成更短但还能执行的工作记忆。

这条线也解释了两个常见误解：cache 不会让 history 自动变短，compaction 也不是为了提高 cache 命中率才存在。前者是服务端复用稳定前缀，后者是当前 thread 里的上下文续航。

关键词：`Context Builder`、`prompt cache`、`compaction`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/002-prompt-assembly-before-cache.png' | relative_url }}" alt="Cache 之前先有 prompt 拼装" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Dive into Codex</p>
<h2>Cache 之前先有 prompt 拼装</h2>

Codex 本地先决定“这一轮发什么”：instructions、tools、history、current input 会被组织成 Responses API 请求。只有请求发到模型服务端后，prompt cache 才有机会判断前缀是否可复用。

**增量解释**

本地拼装阶段解决的是材料选择和顺序问题。哪些 instructions 进入 prompt、工具 schema 是否稳定、history 里保留哪些 item、当前用户输入和工具结果放在哪里，都会影响最终请求长什么样。

如果看源码，`clone_history().await.for_prompt(...)` 可以作为这个阶段的一个例子：它把 Session 里的历史快照整理成 Responses API input，但它本身不是 cache。

```rust
async fn build_sampling_input(session: &Session, model: &ModelInfo) -> Vec<ResponseItem> {
    // 1. 从本地 Session history 取一个快照。
    let history_snapshot = session.history.clone_history().await;

    // 2. 把本地快照整理成 Responses API 可以接收的结构化 input。
    let input = history_snapshot.for_prompt(&model.input_modalities);

    // 3. 这里还没有发生 prompt cache。
    //    cache 是否命中，要等请求发到模型服务端后由服务端判断。
    input
}
```

所以这一页真正要记住的不是函数名，而是边界：本地拼装负责“发什么”，server cache 负责“相同前缀能不能复用计算”。

关键词：`prompt assembly`、`Responses API`、`server cache`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/003-server-cache-stable-prefix.png' | relative_url }}" alt="Server cache 奖励稳定前缀" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Dive into Codex</p>
<h2>Server cache 奖励稳定前缀</h2>

Prompt cache 的核心是 exact prefix match。前面的大块内容越稳定，服务端越容易复用已有计算；如果频繁改动 system instructions、tools、AGENTS.md 或 skills，语义相似的请求也可能失去命中。

**增量解释**

Cache 不是“少发内容”，而是“相同前缀可以复用”。这意味着同样的上下文材料，如果每轮都重新排序、动态插入大段说明、随机改变工具定义顺序，就会破坏可复用前缀。

更 cache-friendly 的拼法通常是：

```text
stable prefix
  system / developer instructions
  stable tool definitions
  durable repo guidance
  stable skill metadata or injected skill content

volatile tail
  latest user input
  recent tool outputs
  temporary state
  turn-specific constraints
```

这就是为什么本章要先讲“请求怎么被构建”，再讲 cache。cache 命中不是本地函数直接产生的结果，而是最终请求形态和服务端前缀复用机制共同作用的结果。

关键词：`server cache`、`stable prefix`、`exact match`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/004-prefix-discipline.png' | relative_url }}" alt="稳定前缀需要纪律" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Dive into Codex</p>
<h2>稳定前缀需要纪律</h2>

为了提高 cache 复用，稳定内容应尽量靠前，变化快的用户输入、工具输出和临时状态应放在后面。上下文拼接顺序不是排版问题，而是会直接影响长任务成本和响应速度。

**增量解释**

工具定义也是前缀稳定性的一部分。`tools[]` 的名称、描述、schema、顺序最好保持稳定；如果只是限制当前轮可调用工具，更适合用 `allowed_tools` 做门控，而不是每轮重写工具列表。

这条纪律背后的设计逻辑是：让“长期不变的能力说明”和“当前轮变化的运行状态”分层。稳定层越少抖动，服务端越容易命中 cache；动态层越靠后，当前任务的变化又不会污染前缀。

关键词：`prefix order`、`tools`、`Context Builder`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/005-history-growth-pressure.png' | relative_url }}" alt="运行越久，history 越重" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Dive into Codex</p>
<h2>运行越久，history 越重</h2>

每次 sampling、tool call、tool output、diff、错误和用户补充都会写回 history。Cache 能降低稳定前缀的重复计算，但不会让 history 变短；长任务继续推进时，窗口压力仍然会累积。

**增量解释**

长任务的 history 会同时积累三类东西：

```text
事实状态
  当前目标、用户硬约束、文件变化、测试结果、关键错误。

探索过程
  搜索过哪些文件、尝试过哪些方案、为什么排除某条路径。

噪声
  重复日志、超长 stdout、已经失效的中间解释、低价值输出。
```

Cache 只处理“相同前缀重复计算”的成本问题，不处理“history 越来越长”的窗口问题。因此当任务足够长，系统还需要另一种机制来清理和改写 history，这就是 compaction 出场的位置。

关键词：`history grows`、`tool output`、`context window`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/006-compaction-trigger.png' | relative_url }}" alt="接近窗口时才轮到 compaction" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Dive into Codex</p>
<h2>接近窗口时才轮到 compaction</h2>

Compaction 不是 cache miss 后的补救，也不是任务结束后的总结。它发生在当前 thread 的上下文压力变高时，把冗长轨迹压成下一轮仍能继续工作的 runtime memory。

**增量解释**

从运行时看，compaction 更像一个续航动作：当 history 过长，继续把全部轨迹塞进 prompt 会挤压后续推理空间，于是 Codex 需要在下一次 sampling 前，或者长 turn 中途，把旧轨迹折叠成更短的可执行状态。

可以用这个伪代码理解触发位置：

```rust
async fn maybe_compact_before_sampling(session: &Session, budget: TokenBudget) -> Result<()> {
    let usage = session.history.estimate_token_usage().await;

    // 只有接近窗口压力时，才需要压缩。
    if usage.remaining_tokens > budget.compaction_margin {
        return Ok(());
    }

    let snapshot = session.history.clone_history().await;
    let compacted_context = compact_history(snapshot).await?;

    // 压缩结果必须写回 history，否则下一轮 sampling 接不上现场。
    session.history.replace_prefix_with_compaction(compacted_context).await;
    Ok(())
}
```

这里的关键不是具体函数名，而是时机：compaction 发生在“继续工作之前”，目标是腾出上下文空间，同时保留后续执行所需状态。

关键词：`token pressure`、`compaction`、`runtime memory`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/007-compaction-keeps-state.png' | relative_url }}" alt="压缩要保留可执行状态" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Dive into Codex</p>
<h2>压缩要保留可执行状态</h2>

好的 compaction 不只是写一段摘要，而是保留目标、约束、文件状态、关键决策、失败尝试和待办事项。它要让下一轮模型知道现在做到哪里、为什么这么做、还剩什么没有完成。

**增量解释**

普通总结更像“给人看过一遍发生了什么”；compaction 更像“给下一轮 agent 接手继续做”。因此它需要的是可执行字段：

```text
Goal
  当前任务目标，以及仍然有效的用户硬约束。

File State
  已修改文件、相关文件、关键 diff、仍需检查的文件。

Decision State
  已选择的方案、被排除的路径、为什么这样做。

Error State
  最新失败、错误栈、测试断言、仍需验证的问题。

Pending Tasks
  下一步动作、未完成事项、需要用户确认的点。
```

如果这些字段缺失，下一轮模型可能会重复搜索、推翻已确定决策、忘记用户约束，或者继续沿着已经失败的路径走。

关键词：`goal`、`file state`、`pending tasks`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/008-compacted-context-back-to-history.png' | relative_url }}" alt="压缩结果要回到下一轮历史" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Dive into Codex</p>
<h2>压缩结果要回到下一轮历史</h2>

压缩结果不是单独放在旁边，而是作为 compacted context 回到后续 prompt 构建里。旧轨迹可以被折叠，最近 raw tail 仍要保留，用来保存最新约束、错误和未完成现场。

**增量解释**

`raw_tail` 可以包含原始用户消息，尤其是最新硬约束、方向修正、否定过的方案、输出格式要求和安全/权限要求。选择标准很简单：如果这条用户消息被 summary 改写后可能导致下一步做错，就保留原文；如果它已经稳定变成 goal 或 background，就可以进入 compacted context。

写回过程可以拆成三步：

```rust
async fn compact_history_for_next_prompt(history: &History) -> Result<()> {
    let snapshot = history.clone_history().await;

    // 旧前缀通常最占 token，也最容易被折叠；
    // 最近事件则保留为 raw_tail，避免丢掉新约束和新错误。
    let (old_prefix, raw_tail) = snapshot.split_for_compaction(PreserveRecent {
        user_messages: true,
        latest_tool_outputs: true,
        latest_errors: true,
    });

    let compacted_context = compact_model.summarize(CompactionInput {
        old_prefix,
        raw_tail: raw_tail.clone(),
        required_fields: [
            "goal",
            "constraints",
            "changed_files",
            "decisions",
            "failures",
            "pending_tasks",
        ],
    }).await?;

    history.replace_old_prefix(ResponseItem::CompactedContext(compacted_context)).await;
    history.append_items(raw_tail).await;
    Ok(())
}
```

这就是“旧轨迹可以被折叠，最近现场不能随便丢”的原因。

关键词：`compacted context`、`raw tail`、`next prompt`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/009-compaction-before-after.png' | relative_url }}" alt="压缩前后对比" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Dive into Codex</p>
<h2>压缩前后对比</h2>

压缩前，history 里塞满搜索、patch、测试失败和用户补充约束；压缩后，它会折叠成 goal、constraints、file state、failures、pending tasks 和 raw tail。减少的是重复轨迹，不是关键事实。

**增量解释**

一个压缩前后的例子：

```text
压缩前：raw history

Turn 1  user: 修复登录接口
Turn 1  tool_call: rg "refresh_token"
Turn 1  tool_output: 命中 src/auth/session.ts、src/api/login.ts
Turn 1  tool_call: apply_patch src/auth/session.ts
Turn 1  tool_output: patch applied
Turn 1  tool_call: npm test
Turn 1  tool_output: UserSession.test.ts 第 42 行失败
Turn 2  user: 保留兼容旧字段，不要改 API 返回结构
Turn 2  tool_call: apply_patch src/auth/session.ts
Turn 2  tool_output: 仍有 1 个失败，错误在 refreshUserState

压缩后：runtime memory

Goal
  修复 token 过期后 user state 未刷新的问题。
Constraints
  保留旧字段兼容，不修改 API 返回结构。
File State
  已修改 src/auth/session.ts；相关文件包括 src/api/login.ts 和测试文件。
Decisions
  问题定位在 refreshUserState，而不是登录 API 返回结构。
Failures
  UserSession.test.ts 第 42 行仍失败。
Pending
  检查旧字段兼容分支，并重新运行测试。
Raw Tail
  保留最近用户约束、最新测试失败、最后一次 patch output。
```

压缩减少的是重复日志和低价值中间过程；保留下来的是继续执行所需的事实。

关键词：`raw history`、`compacted memory`、`raw tail`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/010-cache-compaction-relationship.png' | relative_url }}" alt="Cache 与 compaction 的关系" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Dive into Codex</p>
<h2>Cache 与 compaction 的关系</h2>

Cache 发生在模型服务端，奖励稳定前缀；compaction 发生在当前 thread 的上下文管理里，缓解窗口压力。前者让重复计算更便宜，后者让长历史变短，两者目标相关但发生位置不同。

**增量解释**

二者之间有张力：从 cache 角度看，越少改动前缀越好；从上下文续航角度看，旧历史太长时又必须压缩。合理做法不是让 compaction 去改 system prompt 或工具定义，而是尽量把稳定基础前缀和可替换的 runtime memory 分层管理。

```text
Cache cares about:
  stable prefix, exact match, server-side reuse.

Compaction cares about:
  history length, token pressure, executable state.

Design goal:
  stable foundation stays stable;
  changing runtime memory stays replaceable.
```

所以 cache 和 compaction 是同一条长任务生命周期里的两个机制，但不应该被解释成同一个东西。

关键词：`server-side cache`、`runtime compaction`、`tradeoff`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/011-memory-positioning.png' | relative_url }}" alt="三种 memory 不要混在一起" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Dive into Codex</p>
<h2>三种 memory 不要混在一起</h2>

Compaction 生成的是当前 thread 的 runtime memory；Codex Memories 是可选的本地跨会话 recall layer；AGENTS.md 和仓库文档提供稳定规则与事实来源。它们都会影响 prompt，但作用域和时机不同。

**增量解释**

这里是本章的第二个边界：前面讲的 `compacted context` 是本文用于解释 compaction 结果的讲解说法，属于当前 thread 内部的运行时记忆；Codex Memories 是产品层的本地回忆机制，面向未来 sessions；`AGENTS.md` 和 repo docs 则是稳定规则与项目事实来源。

```text
Runtime memory
  current thread -> compaction -> compacted context + raw tail -> next sampling

Codex Memories
  prior threads -> useful context extraction -> ~/.codex/memories -> future sessions

AGENTS.md / repo docs
  instruction discovery / checked-in docs -> stable guidance -> prompt context
```

三者都会进入 Context Builder 的视野，但它们不是同一条 pipeline，也不应该互相替代。

关键词：`runtime memory`、`Codex Memories`、`AGENTS.md`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/012-codex-memories-mechanism.png' | relative_url }}" alt="Codex Memories 是本地回忆层" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Dive into Codex</p>
<h2>Codex Memories 是本地回忆层</h2>

官方 Codex Memories 默认关闭；启用后，它可以从符合条件的历史 threads 提取稳定偏好、工作流、技术栈、项目约定和已知坑点，写入 `~/.codex/memories/` 下的本地记忆文件。

**增量解释**

Codex Memories 的关键点不是“保存完整聊天记录”，而是把未来可能反复有用的上下文抽出来，作为本地 recall layer。官方文档明确提到：Memories 默认关闭；启用后，Codex 可以从 eligible prior threads 生成本地 memory files；活跃或短期会话会被跳过；生成字段会做 secrets redaction；更新发生在后台，不保证 thread 刚结束就立刻出现。

适合进入 memories 的内容通常是稳定偏好、重复工作流、常用技术栈、项目约定和已知坑点。例如“这个仓库默认用 pnpm”“用户偏好先给结论再展开”“某个目录的测试需要额外环境变量”。

关键词：`Codex Memories`、`local memory files`、`prior threads`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/013-agents-vs-memories.png' | relative_url }}" alt="AGENTS.md 放规则，Memories 放经验" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Dive into Codex</p>
<h2>AGENTS.md 放规则，Memories 放经验</h2>

必须稳定执行的团队规则应该放进 `AGENTS.md` 或仓库文档；Memories 更适合作为本地回忆层，保存偏好、惯用流程和踩坑经验。规则、事实和经验分层，跨会话上下文才不容易污染。

**增量解释**

OpenAI Codex 的 `AGENTS.md` 文档说明，Codex 会在开始工作前读取这些文件，并按全局、项目、当前目录路径逐层合并；越靠近当前目录的规则越晚进入 prompt，也就更能覆盖前面的通用规则。它还会跳过空文件，并受 `project_doc_max_bytes` 这类配置限制。

推荐分工：

```text
AGENTS.md / checked-in docs
  稳定规则：测试命令、代码风格、目录边界、安全禁令、团队约定。

~/.codex/memories/
  本地回忆：稳定偏好、惯用流程、项目约定、已知坑点、支持证据。

workspace / project docs
  事实来源：代码、配置、README、设计文档、测试、任务文件。
```

如果把动态任务状态写进 `AGENTS.md`，规则会越来越脏；如果把必须遵守的团队约束只放进 Memories，又可能因为自动提取、后台更新、thread 级开关或本地状态差异而不够可靠。

关键词：`AGENTS.md`、`repo docs`、`project contract`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/014-chapter-bridge-async.png' | relative_url }}" alt="下一步进入异步控制" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">014 / Dive into Codex</p>
<h2>下一步进入异步控制</h2>

到这里，长任务的上下文续航已经串起来了：稳定前缀帮助 cache，compaction 处理窗口压力，不同 memory 承担不同作用。下一章会从“记得住”转向“接得住”用户中断和异步事件。

**增量解释**

长任务不仅要记得住，还要接得住。Cache 与 compaction 解决的是上下文越来越长的问题；interrupt、pending input 和 async queue 解决的是用户中途改变方向、工具异步完成、事件顺序如何保持一致的问题。

关键词：`continuity`、`interrupt`、`async event`
</div>
</section>

## 官方依据

- `AGENTS.md`：Codex 会在开始工作前读取全局、项目、当前目录路径上的 instruction files，并按从外到内的顺序合并；更靠近当前目录的规则更晚进入 prompt，也更容易覆盖通用规则。参考：[Custom instructions with AGENTS.md](https://developers.openai.com/codex/guides/agents-md)。
- `Codex Memories`：Memories 默认关闭；启用后，Codex 可以从符合条件的历史 threads 提取有用上下文，写入 `~/.codex/memories/` 下的本地文件，并在未来 sessions 中作为本地 recall layer 使用。参考：[Memories](https://developers.openai.com/codex/memories)。
- `Compaction`：本章里的 compacted context、raw tail、old prefix 是用于解释长任务压缩的工程抽象；不要把它和 Codex Memories 写成同一条固定源码链路。
