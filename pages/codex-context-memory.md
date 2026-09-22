---
layout: post
title: "Codex 上下文管理：压缩、历史检索与长期记忆"
date: 2026-09-22 09:00:00 +0800
description: "从传统 Compaction 到多窗口 Context Management，再到跨 Session Memory：一篇讲清 Current Context、Notes、History 与长期记忆的分层机制。"
category: "Agent 系统"
thought_axis: "器"
tags: [Codex, ContextManagement, Compaction, Memory, Agent]
cover: /assets/pages/codex-context-memory/images/01-overview.png
permalink: /pages/codex-context-memory.html
---

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/01-overview.png' | relative_url }}" alt="Current Context、Compaction、Context Management 与 Memory 的边界总览" loading="lazy">
  <figcaption>01 / 四类机制的边界</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

# Codex 上下文管理、压缩、历史检索与长期记忆机制说明

> 适用范围：Codex 当前的上下文压缩、实验性上下文管理、历史窗口检索与 `.codex/memories` 长期记忆机制。<br>
> 说明：本文刻意移除了个人项目、个人偏好、具体公司与业务信息，只保留通用的工程示例。<br>
> 时间背景：截至 2026 年 9 月，部分 Context Management 能力仍属于实验特性，后续实现细节可能调整。

---

## 1. 先给结论：这几套机制分别解决什么问题

最容易混淆的是下面四个概念：

1. **当前上下文（Current Context）**<br>
   模型这一次真正能“看见”的消息、代码、工具结果和指令。

2. **压缩（Compaction）**<br>
   当前对话太长时，把旧内容总结成更短的状态，腾出空间继续工作。

3. **实验性上下文管理（Context Management）**<br>
   不再只依赖“把所有旧内容压成摘要”，而是把任务拆成多个上下文窗口，并通过 Notes、History、`new_context` 让模型跨窗口工作。

4. **长期记忆（`.codex/memories`）**<br>
   当前任务结束以后，把值得长期复用的知识提炼出来，让未来的新 Session 可以再次使用。

一句话区分：

> **压缩是在回答：为了继续当前任务，我现在不能忘什么？**<br>
> **历史窗口是在回答：如果刚才漏掉了某个细节，我怎么回到原始记录里找？**<br>
> **长期 Memory 是在回答：为了以后少走弯路，有什么值得跨任务长期保留？**

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/02-single-window.png' | relative_url }}" alt="单一上下文窗口被指令、代码、日志和工具结果逐步填满" loading="lazy">
  <figcaption>02 / 单窗口为什么会被填满</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 2. 为什么原来的单窗口方式会遇到问题

假设一个模型单次最多能处理 `N` 个 Token。

一个 Coding Agent 工作一段时间以后，上下文会不断累积：

```text
系统指令
用户需求
读取文件
文件内容
搜索结果
测试日志
报错
修改代码
重新测试
新的讨论
更多工具调用
……
```

最终会出现：

```text
┌──────────────────────────────┐
│ 系统指令                     │
│ 用户需求                     │
│ 文件内容                     │
│ 搜索结果                     │
│ 测试日志                     │
│ 修改记录                     │
│ 历史讨论                     │
│ 更多工具输出                 │
│ ……                           │
└──────────────────────────────┘
          接近上下文上限
```

问题不只是“放不下”。

更麻烦的是，很多旧内容已经没有必要一直占据当前上下文，例如：

- 几万字测试日志；
- 已经修好的报错；
- 很早以前读过、但当前只需要其中一行结论的代码；
- 已经被推翻的方案；
- 重复的工具输出。

所以真正的问题是：

> **当前 Context 里，长期存在大量已经不再需要实时参与推理的信息。**

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/03-compaction.png' | relative_url }}" alt="传统 Compaction 将原始内容逐轮压缩成任务摘要" loading="lazy">
  <figcaption>03 / 传统 Compaction</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 3. 传统 Compaction：把旧上下文压成一份摘要

## 3.1 基本过程

传统压缩大致是：

```text
很长的历史上下文
        ↓
模型总结
        ↓
生成较短的任务摘要
        ↓
把摘要继续放到当前上下文
        ↓
继续执行任务
```

例如原始上下文中有：

```text
用户要求：
- 不允许修改自动生成目录
- 生产环境使用某个固定运行时版本
- 当前目标是重构登录模块

执行过程：
- 读取多个文件
- 修改认证代码
- 测试失败
- 找到接口字段不一致
- 修复
- 测试通过
```

压缩后可能变成：

```text
当前目标：
重构登录模块。

重要约束：
- 不修改自动生成目录。
- 使用指定运行时版本。

当前进度：
- 已完成认证逻辑重构。
- 已修复接口字段不一致问题。
- 当前测试通过。

下一步：
- 补充异常路径测试。
```

## 3.2 优点

它非常直接：

- 不需要额外的历史检索系统；
- 当前 Session 可以继续运行；
- 能明显降低旧上下文占用。

## 3.3 核心缺点：有损

压缩本质上是：

```text
原始信息
  ↓
摘要
```

如果某个细节第一次没有被保留下来，后面可能彻底消失。

更典型的问题是多次压缩：

```text
原始内容
   ↓
摘要 1
   ↓
继续工作
   ↓
摘要 2
   ↓
继续工作
   ↓
摘要 3
```

信息经历多轮有损变换。

可以写成：

<div class="math-display" markdown="0">
\[
I_0 \rightarrow \hat I_1 \rightarrow \hat I_2 \rightarrow \hat I_3
\]
</div>

其中每一步都有可能遗失早期细节。

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/04-context-management.png' | relative_url }}" alt="Context Management 将当前窗口、Notes 和 History 分层组织" loading="lazy">
  <figcaption>04 / 从压摘要到多窗口管理</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 4. 新的实验性 Context Management：不是单纯继续压摘要

新机制最重要的变化是：

> **不再假设所有历史都必须继续塞在当前 Prompt 中。**

而是把内容拆成：

```text
当前工作窗口
+
跨窗口 Notes
+
可检索 History
```

所以它没有真正扩大模型一次 Attention 能看到的原生窗口。

它扩大的其实是：

> **一个任务可以持续访问的“有效历史范围”。**

可以写成：

<div class="math-display" markdown="0">
\[
C_{\text{native}} = N
\]
</div>

单次模型调用还是最多处理大约 `N` 个 Token。

但是任务层面的有效历史可以变成：

<div class="math-display" markdown="0">
\[
C_{\text{effective}}
=
C_{\text{current}}
+
C_{\text{notes}}
+
C_{\text{retrievable history}}
\]
</div>

而：

<div class="math-display" markdown="0">
\[
C_{\text{effective}} \gg C_{\text{native}}
\]
</div>

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/05-token-budget-notes-history.png' | relative_url }}" alt="Token Budget、Notes、History 和 new_context 构成的切窗流程" loading="lazy">
  <figcaption>05 / 新机制的四个组件</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 5. 新机制的四个核心组件

## 5.1 Token Budget：知道自己还剩多少上下文

过去 Agent 更像：

```text
不断工作
↓
突然快满
↓
被迫压缩
```

现在系统会显式追踪：

```text
当前用了多少 Token
还剩多少 Token
距离切换窗口还有多少空间
```

可以理解成：

```text
总窗口
████████████████████████████

已使用
██████████████████████

剩余
██████
```

当剩余空间变小时，系统会提醒 Agent：

> 当前窗口快用完了，需要准备交接状态。

这个变化很重要，因为 Agent 不再只是“被动撞墙”。

---

## 5.2 Notes：跨窗口保存任务检查点

在切换窗口之前，Agent 会主动保存一份任务状态。

它不是完整聊天摘要，而是更像：

```text
任务检查点
```

例如一个通用软件开发任务：

```markdown
# 当前任务

目标：
完成订单模块重构。

## 关键约束

- 不修改自动生成代码。
- 保持现有数据库字段兼容。
- 外部接口不能改变。

## 已完成

- 已拆分订单校验逻辑。
- 已修复状态转换错误。
- 相关单元测试通过。

## 当前进行中

- 正在处理退款流程。

## 下一步

1. 补充并发退款测试。
2. 检查重复提交。
3. 运行完整测试集。

## 重要历史位置

- 用户最初的兼容性要求：窗口 1 / 条目 12
- 状态转换方案讨论：窗口 1 / 条目 35
- 关键失败日志：窗口 1 / 条目 81
- 最终修复：窗口 1 / 条目 92
```

这里最重要的不是“总结”本身，而是：

> **Notes 同时保存语义状态和原始历史指针。**

---

## 5.3 History：旧窗口不再丢掉，而是变成可检索历史

假设当前任务已经经过三个窗口：

```text
Thread
│
├── Window 1
│   ├── Item 1
│   ├── Item 2
│   ├── Item 3
│   └── ...
│
├── Window 2
│   ├── Item 1
│   ├── Item 2
│   └── ...
│
└── Window 3
    └── 当前工作窗口
```

Window 1 和 Window 2 不再全部塞进 Window 3。

它们变成 History。

当前窗口只保留：

```text
当前任务
+
Notes
+
真正需要重新取回的历史内容
```

---

## 5.4 `new_context`：开启新的上下文窗口

当旧窗口快满时：

```text
Window 1
   ↓
保存 Notes
   ↓
new_context
   ↓
Window 2
```

新的 Window 不需要继续携带全部旧内容。

于是原来可能只剩：

```text
20K 可用空间
```

切换后重新获得：

```text
一个新的大块可用上下文空间
```

因此使用体验会像：

> “Context Window 变大了。”

但本质不是：

```text
200K → 400K
```

而是：

```text
Window 1：200K
↓
保留状态 + 历史可回查
↓
Window 2：重新得到一个新的 200K
```

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/06-cross-window-example.png' | relative_url }}" alt="订单模块任务从 Window 1 交接到 Window 2 的完整示例" loading="lazy">
  <figcaption>06 / 跨窗口执行示例</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 6. 一个完整的跨窗口执行示例

下面用一个完全通用的代码重构任务说明整个过程。

## 6.1 Window 1：开始工作

用户要求：

```text
重构订单模块。

要求：
1. 不修改自动生成代码。
2. 保持原有接口兼容。
3. 修复重复提交问题。
```

Agent 开始：

```text
读取代码
↓
分析订单流程
↓
找到重复提交入口
↓
设计幂等逻辑
↓
修改代码
↓
运行测试
↓
发现状态转换失败
↓
继续排查
↓
修复
↓
再次测试
```

此时窗口越来越大。

---

## 6.2 窗口即将用完

系统提醒：

```text
剩余 Token 不多。
请保存当前任务状态和重要历史位置。
```

Agent 写 Notes：

```markdown
目标：
完成订单模块重构。

关键约束：
- 不修改自动生成目录。
- 外部接口保持兼容。

已完成：
- 加入重复提交保护。
- 修复订单状态转换问题。

正在做：
- 检查退款路径。

关键历史：
- 用户原始要求：W1/I4
- 幂等方案讨论：W1/I28
- 状态错误日志：W1/I61
- 状态修复结果：W1/I74
```

---

## 6.3 切换到 Window 2

调用：

```text
new_context
```

Window 2 不再完整携带 Window 1。

它只需要恢复：

```text
当前任务
+
Notes
+
环境状态
```

然后继续退款流程。

---

## 6.4 突然需要 Window 1 的细节

Agent 在 Window 2 中发现：

```text
退款逻辑需要知道之前为什么选择当前幂等方案。
```

Notes 中已经保存：

```text
幂等方案讨论：W1/I28
```

于是最优路径不是搜索，而是直接：

```text
read_item(W1, I28)
```

把原始讨论取回来。

这叫：

> **Pointer Retrieval：指针式检索。**

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/07-history-retrieval.png' | relative_url }}" alt="按 ID、关键词、Window 或目录逐层检索 History 的四条路径" loading="lazy">
  <figcaption>07 / History 的四条检索路径</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 7. History 是怎么检索的

这是整个新机制里最关键的一部分。

当前实现并不是标准的向量语义搜索。

更准确地说，它主要有四种路径。

---

## 7.1 路径一：知道准确位置，直接读取

如果 Notes 已经记录：

```text
W1 / I28
```

直接：

```text
read_item(W1, I28)
```

优点：

- 最精确；
- 不存在搜索召回问题；
- 不需要扫描历史。

这是最推荐的方式。

---

## 7.2 路径二：不知道 ID，但知道关键词

例如 Agent 只记得：

```text
之前出现过“重复提交”问题。
```

可以搜索：

```text
search_contents("重复提交")
```

搜索得到：

```text
W1/I21
W1/I28
W1/I42
```

然后模型判断：

```text
I28 最相关
```

再执行：

```text
read_item(W1, I28)
```

### 注意

当前 `search_contents` 更接近：

```text
字符串字面搜索
```

而不是：

```text
Embedding 向量语义搜索
```

因此：

```text
历史：
“重复请求导致订单创建两次”

搜索：
“幂等问题”
```

未必天然能命中。

这时需要 Agent 自己做查询改写，例如：

```text
搜索“重复”
↓
搜索“订单创建”
↓
搜索“提交”
↓
搜索“幂等”
```

所以当前机制更像：

> **LLM 规划搜索词 + 字面检索。**

---

## 7.3 路径三：只知道大概在哪个 Window

例如 Agent 知道：

```text
应该发生在 Window 1，
但不知道关键词。
```

它可以：

```text
list_items(Window 1)
```

返回类似：

```text
I20  用户提出重复提交问题……
I21  Agent 分析请求链路……
I22  工具读取订单服务……
I28  Agent 给出幂等方案……
I31  测试结果……
```

模型先浏览简略内容，再选择：

```text
read_item(W1, I28)
```

---

## 7.4 路径四：什么都不知道

最弱信息场景：

```text
只知道以前好像讨论过，
不知道哪个窗口，
不知道条目，
也不知道准确关键词。
```

可以：

```text
list_windows
↓
查看有哪些历史窗口
↓
list_items
↓
根据概要判断
↓
必要时 search_contents
↓
read_item
```

所以完整 fallback 顺序可以写成：

```text
知道精确 ID
    │
    └──→ read_item

不知道 ID，但知道关键词
    │
    └──→ search_contents
             ↓
          read_item

只知道大概 Window
    │
    └──→ list_items
             ↓
          read_item

什么都不知道
    │
    └──→ list_windows
             ↓
          list_items / search
             ↓
          read_item
```

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/08-notes-index.png' | relative_url }}" alt="Notes 保存语义判断并通过指针连接 History 原始证据" loading="lazy">
  <figcaption>08 / Notes 是语义索引</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 8. 为什么 Notes 比 History 搜索本身更重要

因为当前 History 搜索并不是很强的语义检索。

真正承担“语义理解”的，实际上是 Agent 在切窗前写下的 Notes。

例如原始历史：

```text
W1/I28：

旧的匹配方式无法覆盖表达方式变化较大的请求，
导致很多语义相同、表述不同的情况没有被识别。
因此决定改用新的检索方案。
```

Notes 可以写成：

```text
检索方案调整：
旧方案存在语义召回不足。
详细讨论：W1/I28
```

以后新窗口问：

```text
为什么换检索方案？
```

Agent 不需要重新在整个 History 里做语义搜索。

Notes 已经告诉它：

```text
原因：语义召回不足
来源：W1/I28
```

然后直接回源。

所以这里实际上形成：

```text
History
= 原始证据库

Notes
= 语义摘要 + 导航索引

Current Context
= 当前工作区
```

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/09-partial-read.png' | relative_url }}" alt="从大型历史条目中只读取所需字符范围" loading="lazy">
  <figcaption>09 / 按范围读取历史条目</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 9. `read_item` 也可以只读取一部分

历史中的某个 Item 可能非常大。

例如：

```text
一次测试日志：
50,000 字符
```

并不意味着重新读取时必须全部塞回当前上下文。

可以只读取：

```text
某个字符范围
```

例如：

```text
从第 10,000 字符开始
读取 4,000 字符
```

于是：

```text
50K 历史工具结果
        ↓
只取真正需要的 4K
        ↓
进入 Current Context
```

这又进一步降低了上下文浪费。

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/10-signal-to-noise.png' | relative_url }}" alt="从超长上下文中筛选当前高价值工作集" loading="lazy">
  <figcaption>10 / 有效信息比窗口长度更重要</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 10. 为什么这种方式可能比单纯增加超长窗口更有效

假设直接给模型 1M Context。

里面可能有：

```text
400K 测试日志
200K 旧代码
100K 已失败方案
100K 重复输出
100K 有效信息
```

有用信息比例：

<div class="math-display" markdown="0">
\[
SNR
=
\frac{\text{有效信息}}
{\text{全部上下文}}
\]
</div>

可能很低。

而新的上下文管理更倾向：

```text
当前真正需要的代码
+
当前任务状态
+
少量 Notes
+
按需检索的旧证据
```

所以它优化的不是：

> **把更多 Token 塞进去。**

而是：

> **让有限 Token 尽量只承载当前真正有价值的信息。**

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/11-compaction-comparison.png' | relative_url }}" alt="传统 Compaction 与 Context Management 在状态、历史和恢复能力上的对比" loading="lazy">
  <figcaption>11 / 两类机制的核心区别</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 11. 新机制和传统 Compaction 的核心区别

| 维度 | 传统 Compaction | 新实验性 Context Management |
|---|---|---|
| 目标 | 当前 Session 继续运行 | 让任务跨多个 Context Window 持续运行 |
| 旧历史处理 | 压成摘要 | 保留为可检索 History |
| 新窗口 | 通常继续依赖压缩摘要 | 可直接开启 Fresh Context |
| 原始证据是否保留 | 摘要可能替代原文 | 旧 Window 可继续回查 |
| 信息恢复 | 依赖摘要是否保存 | 可通过 pointer / search / read 回源 |
| 检索 | 通常无独立检索 | History 支持定位和读取 |
| 最大风险 | 多轮摘要导致信息逐渐丢失 | Notes 漏记 + 字面搜索召回不足 |
| 最核心能力 | 压缩 | 状态保存 + 回源 |

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/12-history-vs-memory.png' | relative_url }}" alt="当前任务的 History 和 Notes 与未来 Session 的 Memory 之间的区别" loading="lazy">
  <figcaption>12 / 任务历史与长期记忆</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 12. 新 Context Management 和 `.codex/memories` 又有什么区别

这是另一组非常容易混淆的概念。

## 12.1 History / Notes

服务的是：

```text
同一个任务
```

时间跨度通常是：

```text
数小时
数天
一个较长的 Thread
```

主要保存：

```text
当前进度
任务状态
原始工具结果
原始讨论
重要指针
```

---

## 12.2 `.codex/memories`

服务的是：

```text
未来其他 Session
```

关注的是：

```text
长期稳定偏好
项目约束
架构决策
已验证的工作方法
常见失败模式
可复用经验
```

例如：

当前任务里有：

```text
测试失败：
接口生成代码版本不一致。
```

History 可能完整保存：

```text
报错日志
具体文件
命令
修改记录
```

长期 Memory 更可能保存成：

```text
如果接口生成代码与运行时版本不一致，
优先检查生成器版本和依赖版本是否匹配。
```

也就是说：

```text
History
偏“发生过什么”

Memory
偏“以后值得复用什么”
```

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/13-memory-layers.png' | relative_url }}" alt="memory_summary、MEMORY 和 rollout summary 组成的三层长期记忆结构" loading="lazy">
  <figcaption>13 / Memory 的三层结构</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 13. `.codex/memories` 的典型结构

可以理解成三层。

```text
memory_summary.md
      ↓
    MEMORY.md
      ↓
rollout_summaries / skills
```

---

## 13.1 `memory_summary.md`

作用：

> 快速告诉新 Session：以前大概积累过哪些知识。

例如：

```markdown
v1

## 项目约束

- 自动生成目录不应直接修改。
- 修改接口定义后需要重新生成代码。

## 常见问题

- 生成代码与运行时依赖版本不一致可能导致接口错误。
- 长时间测试日志应避免长期保留在工作上下文中。

## 工作方式

- 修改核心逻辑前先检查现有测试。
- 对复杂任务优先保留原始证据指针，而不是只保留摘要。
```

它应该是：

```text
高层
简短
可检索
用于导航
```

而不是完整聊天记录。

---

## 13.2 `MEMORY.md`

比 summary 更详细。

例如：

```markdown
# 生成代码管理

## 稳定规则

- 自动生成目录原则上不要直接修改。
- 修改接口定义后，应重新运行生成步骤。

## 已知失败模式

- 生成器版本与运行时依赖版本不一致，
  可能导致字段不匹配。

## 推荐排查顺序

1. 检查接口定义。
2. 检查生成器版本。
3. 检查运行时依赖。
4. 重新生成。
5. 再运行测试。
```

---

## 13.3 Rollout Summary

它更接近：

```text
某一次任务具体发生了什么。
```

例如：

```markdown
某次接口升级任务：

- 用户要求保持接口兼容。
- 修改接口定义后测试失败。
- 排查发现生成器版本不一致。
- 更新依赖并重新生成后恢复正常。
```

所以三层关系是：

```text
memory_summary.md
“小地图”

        ↓

MEMORY.md
“长期知识手册”

        ↓

rollout_summaries
“具体历史案例”
```

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/14-memory-generation.png' | relative_url }}" alt="Session 完成后经过候选提取和整合形成长期 Memory 的流程" loading="lazy">
  <figcaption>14 / Memory 的生成流程</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 14. Memory 是什么时候生成的

Memory 不是：

```text
每说一句话就保存一次
```

也不是：

```text
Session 一结束立刻写 MEMORY.md
```

更接近：

```text
Session 完成
↓
闲置一段时间
↓
后续新的顶层 Session 启动
↓
后台扫描符合条件的旧 Session
↓
提取候选 Memory
↓
再做 Consolidation
↓
更新 .codex/memories
```

也就是说：

```text
历史 Session
    ↓
候选经验
    ↓
筛选
    ↓
长期知识
```

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/15-memory-usage.png' | relative_url }}" alt="新 Session 先读摘要，再按相关性检索 Memory 的渐进式披露流程" loading="lazy">
  <figcaption>15 / Memory 的渐进式使用</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 15. Memory 什么时候会被使用

新 Session 不会一开始把所有 MEMORY 内容全部塞进 Prompt。

更合理的方式是：

```text
先看到 memory_summary
        ↓
判断当前任务是否相关
        ↓
如果相关
        ↓
搜索 MEMORY.md
        ↓
必要时继续打开具体 rollout summary
```

这同样是一种：

> **渐进式披露。**

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/16-four-layer-architecture.png' | relative_url }}" alt="Current Context、Notes、History 与 Long-term Memory 的四层架构" loading="lazy">
  <figcaption>16 / 四层 Context 架构</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 16. 四层 Context 架构

把所有机制放在一起，可以得到一个非常清晰的四层模型。

## 第一层：Current Context

```text
模型当前真正 Attention 的内容。
```

内容：

```text
当前需求
当前代码
当前工具结果
当前推理所需信息
```

时间尺度：

```text
分钟级
```

---

## 第二层：Notes

```text
当前任务跨窗口的 Working Memory。
```

内容：

```text
目标
约束
关键决定
进度
下一步
重要历史指针
```

时间尺度：

```text
小时 ～ 一个任务
```

---

## 第三层：History

```text
当前 Thread 已经发生过的原始历史。
```

内容：

```text
旧消息
工具调用
测试日志
旧代码读取
完整讨论
```

访问方式：

```text
list
search
read
```

时间尺度：

```text
整个任务
```

---

## 第四层：Long-term Memory

```text
跨 Session 的长期知识。
```

内容：

```text
稳定规则
项目约束
工作方法
失败模式
可复用经验
```

时间尺度：

```text
多任务 / 长期
```

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/17-four-layer-relationship.png' | relative_url }}" alt="工作台、工作笔记、任务档案室和经验手册的关系" loading="lazy">
  <figcaption>17 / 四层之间如何协作</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 17. 四层之间的关系

完整结构：

```text
                 Long-term Memory
                  .codex/memories
                         │
                 跨 Session 使用
                         │
                         ▼

                      Notes
              当前任务的语义检查点
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
      Current Context             History
       当前工作集               原始历史证据
             │                       │
             │       search / read   │
             └───────────┬───────────┘
                         ▼
                      Agent
```

也可以理解成：

```text
Current Context
= 工作台

Notes
= 工作笔记

History
= 当前项目档案室

Memory
= 长期经验手册
```

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/18-task-lifecycle.png' | relative_url }}" alt="任务从开始、预算下降、写 Notes、切窗、回源到长期记忆的生命周期" loading="lazy">
  <figcaption>18 / 跨窗口任务生命周期</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 18. 一次完整任务是如何跨多个窗口运行的

下面把整个生命周期串起来。

## 阶段 1：开始任务

```text
用户提出需求
↓
Agent 读取代码
↓
执行工具
↓
修改
↓
测试
```

所有内容主要位于：

```text
Current Context
```

---

## 阶段 2：上下文逐渐变满

```text
Token Budget 下降
↓
系统提醒
```

Agent 开始：

```text
整理任务状态
↓
写 Notes
↓
记录关键 Window / Item 指针
```

---

## 阶段 3：切换窗口

```text
new_context
↓
新的 Current Context
```

恢复：

```text
当前目标
关键约束
已完成工作
下一步
Notes
```

旧内容进入：

```text
History
```

---

## 阶段 4：需要旧细节

首先判断：

```text
Notes 有没有精确指针？
```

有：

```text
read_item
```

没有：

```text
是否知道关键词？
```

知道：

```text
search_contents
↓
read_item
```

不知道：

```text
list_windows
↓
list_items
↓
read_item
```

---

## 阶段 5：再次接近上限

重复：

```text
Window 2
↓
更新 Notes
↓
new_context
↓
Window 3
```

于是可以：

```text
Window 1
↓
Window 2
↓
Window 3
↓
Window 4
↓
……
```

而不要求：

```text
所有历史同时进入一个 Context Window
```

---

## 阶段 6：任务结束

Thread 闲置后：

```text
旧 Session
↓
Memory Pipeline
↓
提取值得长期保留的信息
↓
MEMORY.md
```

于是下一次完全新的任务仍然可以使用这些经验。

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/19-four-way-comparison.png' | relative_url }}" alt="单一长 Context、传统 Compaction、Context Management 和长期 Memory 的四类对比" loading="lazy">
  <figcaption>19 / 四种方式的完整对比</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 19. 传统方式和新方式的完整对比

| 维度 | 单一长 Context | 传统 Compaction | 新 Context Management | Long-term Memory |
|---|---|---|---|---|
| 服务对象 | 当前推理 | 当前 Session | 当前长任务 | 未来 Session |
| 主要问题 | 能放多少 | 快满怎么办 | 如何跨 Window 工作 | 以后怎么复用 |
| 历史是否全放 Prompt | 是 | 部分 | 否 | 否 |
| 是否摘要 | 无 | 是 | Notes 是，但原文仍可回查 | 是 |
| 原始历史能否重新读取 | 当前还在时可以 | 压缩后可能困难 | 可以 | 通过长期记忆摘要或历史案例 |
| 是否支持搜索 | 不需要 | 通常不需要 | 支持 History 检索 | 支持 Memory 检索 |
| 生命周期 | 一次调用 | 一个 Session | 一个 Thread / Task | 多 Session |
| 主要风险 | 窗口爆满 | 摘要失真 | Notes 漏记、搜索召回不足 | 长期知识提炼不完整 |

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/20-effective-context.png' | relative_url }}" alt="Effective Context 由工作上下文、任务状态、可检索历史和长期记忆共同组成" loading="lazy">
  <figcaption>20 / 提升的是长期任务规模</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 20. 这套设计真正提高的是什么

不要把它理解成：

```text
模型原生窗口从 200K 变成 2M。
```

更准确的是：

```text
单次 Attention 仍然有限
+
旧历史可外部保存
+
任务状态可跨窗口持续
+
需要时可以重新取回原始证据
```

所以：

<div class="math-display" markdown="0">
\[
\boxed{
EffectiveContext
=
WorkingContext
+
TaskState
+
RetrievableHistory
+
LongTermMemory
}
\]
</div>

它提升的是：

> **Agent 能完成的长期任务规模。**

而不是：

> **单次 Transformer Attention 的理论长度。**

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/21-layered-information.png' | relative_url }}" alt="以信息分层、证据优先和外部存储组织有限 Prompt" loading="lazy">
  <figcaption>21 / 信息分层与证据优先</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 21. 这套机制最值得关注的设计思想

## 21.1 不再要求模型记住所有东西

过去：

```text
请记住上面的全部内容。
```

现在：

```text
重要状态 → Notes
原始历史 → History
长期知识 → Memory
当前相关信息 → Current Context
```

---

## 21.2 摘要不再是唯一事实来源

传统：

```text
原始内容
↓
摘要
↓
以后只能依赖摘要
```

新机制：

```text
原始内容
↓
History 保留
↓
Notes 只负责导航
↓
需要时重新读取原始 Evidence
```

---

## 21.3 用分层存储代替无限 Prompt

整体思路非常接近操作系统：

```text
Current Context
≈ CPU Cache / RAM

Notes
≈ Working State

History
≈ 当前任务磁盘

Memory
≈ 长期知识库
```

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/22-limitations-notes-search.png' | relative_url }}" alt="Notes 漏记、字面搜索、读取成本和 Agent 决策构成的机制局限" loading="lazy">
  <figcaption>22 / 当前机制的主要局限</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 22. 当前机制的主要局限

这套设计仍然不是“无限上下文”。

主要问题包括：

## 22.1 Notes 可能写漏

如果 Agent 在切窗口时没有记录某个重要事实：

```text
后续只能依赖 History 搜索重新发现。
```

---

## 22.2 History 搜索不是强语义检索

当前更接近：

```text
字面字符串搜索
```

因此：

```text
“登录问题”
```

不一定能直接找到：

```text
“认证失败”
```

需要 Agent 自己做：

```text
查询改写
多关键词搜索
结果筛选
```

---

## 22.3 回源本身也消耗上下文

History 虽然可以重新读取，但读取回来的内容仍然会占据当前 Context。

所以仍需要：

```text
只读取需要的 Item
只读取需要的字符范围
避免一次加载过多旧内容
```

---

## 22.4 长任务中的状态管理质量依赖 Agent

整个系统的效果很依赖：

```text
什么时候写 Notes
写哪些内容
记录哪些 Pointer
什么时候回查 History
如何构造搜索词
```

也就是说：

> **Context Management 本身已经成为 Agent 能力的一部分。**

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/23-mental-model.png' | relative_url }}" alt="长期 Memory、Notes、History、Current Context 与 Agent 的最终心智模型" loading="lazy">
  <figcaption>23 / 最终心智模型</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 23. 最终心智模型

如果只记住一张图，可以记这一张：

```text
                        ┌─────────────────────┐
                        │ Long-term Memory    │
                        │ 跨 Session 经验      │
                        └──────────┬──────────┘
                                   │
                         新任务需要时检索
                                   │
                                   ▼
┌─────────────────────────────────────────────────────┐
│                    Current Task                     │
│                                                     │
│   ┌──────────────┐          ┌──────────────────┐    │
│   │ Notes        │          │ History          │    │
│   │ 当前任务状态 │          │ 旧 Window 原始历史│    │
│   └──────┬───────┘          └────────┬─────────┘    │
│          │                           │              │
│          │              search / read              │
│          └──────────────┬────────────┘              │
│                         ▼                           │
│                ┌────────────────┐                   │
│                │ Current Context│                   │
│                │ 当前工作窗口    │                   │
│                └────────┬───────┘                   │
│                         │                           │
│                         ▼                           │
│                       Agent                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

对应四句话：

> **Current Context：我现在正在想什么。**<br>
> **Notes：我这个任务做到哪里了。**<br>
> **History：之前到底发生过什么。**<br>
> **Memory：以后还值得记住什么。**

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/codex-context-memory/images/24-context-harness.png' | relative_url }}" alt="以压缩、Notes、History、Memory、Pointer、Search 和 new_context 组成 Context Harness" loading="lazy">
  <figcaption>24 / Context Harness</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 24. 最后总结

Codex 新的上下文管理思路，本质上不是“把模型的原生 Context Window 无限扩大”。

它真正做的是把过去单一的 Prompt 拆成一个分层上下文系统：

```text
工作上下文
+
任务检查点
+
可检索历史
+
长期记忆
```

其中：

- **Compaction** 解决当前上下文太长的问题；
- **Notes** 保证跨 Window 的任务状态连续；
- **History** 保存旧 Window 的原始证据；
- **Pointer** 让重要内容可以被精确回源；
- **Search** 在没有 Pointer 时提供兜底查找；
- **`new_context`** 让任务获得新的工作窗口；
- **`.codex/memories`** 把一次任务中的经验进一步沉淀为跨 Session 的长期知识。

所以它的核心变化可以浓缩成一句话：

> **从“不断把历史压进 Prompt”，变成“让 Agent 主动管理一个分层、可回源、可检索的上下文系统”。**

这也是为什么它更像一种 **Context Harness（上下文约束与管理框架）**，而不只是简单的“超长上下文”。

</div>
</section>
