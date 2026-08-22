---
layout: post
title: "RSI Harness Engineering：从运行系统到受控递归改进"
date: 2026-08-21 23:30:00 +0800
summary: "52 张核心图文，循着一条完整链路展开：先搭建可运行的 Agent Harness，再优化 Context、Workflow 与 Code，最后以独立验证、权限边界和进化搜索完成受控的递归改进。"
tags: ["Agent", "RSI", "Harness Engineering", "Lilian Weng", "visual-essay", "image-series"]
category: Agent
cover: /assets/posts/video-notes/rsi-harness-engineering/images/01-s1e1.png
body_class: rsi-harness-post
---

RSI 的重点不是让模型在答案之后“再想一次”，而是改进包围模型的运行系统。Lilian Weng 将这个系统称为 harness：它负责规划、工具调用、上下文、持久状态、artifact 与评估；因此，能否自我改进取决于这台机器是否有稳定的状态、明确的可编辑面和独立的裁判。详见 Weng 的 [Harness Engineering for Self-Improvement](https://lilianweng.github.io/posts/2026-07-04-harness/)。

## 先把整件事看成一张图

本文只讨论部署层的 RSI：不改基础模型权重，而是把模型放入一个可运行、可观察的 harness，再有条件地优化这套系统。逻辑只有一条：**先让任务留下可用证据；再让 evidence 指导一个范围受限的改动；最后由不在改动范围内的验证器决定它能否留下。**

<section class="rsi-overview" aria-label="RSI Harness Engineering 总体脉络">
<article class="rsi-overview-step">
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/overview/01-runtime-loop.png' | relative_url }}" alt="任务通过计划、工具、测试与观察构成运行闭环" loading="lazy">
<div>
<p class="rsi-overview-index">01 · 先让系统跑起来</p>
<h3>运行并留下状态</h3>
<p>Workflow、文件记忆与后台任务，让一次任务变成可回放的过程，而不是一次性对话。</p>
</div>
</article>
<article class="rsi-overview-step">
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/overview/02-workflow-search.png' | relative_url }}" alt="多个工作流候选运行、评分并进入归档" loading="lazy">
<div>
<p class="rsi-overview-index">02 · 再限定能改什么</p>
<h3>把 Harness 当作候选程序</h3>
<p>Context、控制流与部分 code 可以成为候选；每次改动必须带版本、diff、证据和可比较的结果。</p>
</div>
</article>
<article class="rsi-overview-step">
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/overview/03-protected-validation.png' | relative_url }}" alt="证据驱动提案，通过留出验证后接受或拒绝，验证器处于保护边界之外" loading="lazy">
<div>
<p class="rsi-overview-index">03 · 最后才允许递归改进</p>
<h3>提案和裁决必须分离</h3>
<p>改进器从失败证据提出窄 diff；held-out 测试、权限、预算与回滚保持只读，负责 accept 或 reject。</p>
</div>
</article>
</section>

关键区别在于：模型可以提出改动，但不能同时修改裁判。缺少第一步，系统没有稳定的优化对象；缺少第三步，所谓“变好”可能只是在改写评分规则。

为避免同一张地图、封面与结论反复出现，本文从原始 79 张场景卡中保留 52 张核心图文：机制、流程、案例和关键约束都在；重复的导览页、连载预告与“本页要点”复述被收起。

## 一、先让系统持续运行

递归改进的前提，是有一个能执行任务、留下状态、从中断恢复并调度并行工作的基础设施。先解决“任务怎么跑起来”，运行过程才会变得可观察、可复现，之后的优化也才有对象可改。

### Workflow：把 Prompt 变成可观察的运行闭环

{% assign s1e1 = site.data.rsi.s1e1 | slice: 3, 5 %}
{% for scene in s1e1 %}
{% assign card = forloop.index | plus: 3 %}
<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/images/s1e1/' | append: card | append: '.png' | relative_url }}" alt="Workflow 图文：{{ scene.title | strip_newlines | escape }}" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">运行闭环 · {{ forloop.index }} / {{ s1e1.size }}</p>
<p class="visual-note-title">{{ scene.title | escape | newline_to_br }}</p>
<p>{{ scene.narration | escape | newline_to_br }}</p>
</div>
</section>
{% endfor %}

### Memory：把运行历史写成按需读取的文件

Workflow 解决“怎么跑”，但长任务还要解决“如何记住”。文件系统把中间产物、检查点和任务状态外化，使后续步骤或新的子代理能按需读取，而不必把所有历史塞回上下文窗口。

<aside class="rsi-paper-note" markdown="1">
<p class="rsi-paper-kicker">论文拆解｜ACE 与 MCE 分别改什么</p>

[ACE](https://arxiv.org/abs/2510.04618) 把 context 当作会累积的 playbook，而不是反复整体重写的一段 prompt：生成器留下轨迹，反思器从成败中抽规则，整理器以增量条目更新知识，从而保留细节并避免 context collapse。比如“退款金额不对”不应沉淀成一句模糊提醒，而应写成带条件、证据链接和反例的规则。 [MCE](https://arxiv.org/abs/2601.21557) 再加一层：底层 agent 用当前 skill 组织文件与代码，外层 agent 根据历史 skill、执行记录和验证结果改进“如何管理 context”的 skill。前者优化当前输入，后者优化产生输入的方法；两层不能共用同一份训练证据来宣布胜利。
</aside>

{% assign s1e2 = site.data.rsi.s1e2 | slice: 2, 5 %}
{% for scene in s1e2 %}
{% assign card = forloop.index | plus: 2 %}
<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/images/s1e2/' | append: card | append: '.png' | relative_url }}" alt="Memory 图文：{{ scene.title | strip_newlines | escape }}" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">持久记忆 · {{ forloop.index }} / {{ s1e2.size }}</p>
<p class="visual-note-title">{{ scene.title | escape | newline_to_br }}</p>
<p>{{ scene.narration | escape | newline_to_br }}</p>
</div>
</section>
{% endfor %}

### Parallelism：让并行成为可查询的 Job 系统

有了可恢复的状态，下一步才是并发。关键不在于一次启动更多模型，而在于把子任务变成有 ID、状态、日志和结果的 job：主任务可以提交、查询、汇总，也能在失败时定位和重试。

{% assign s1e3 = site.data.rsi.s1e3 | slice: 2, 5 %}
{% for scene in s1e3 %}
{% assign card = forloop.index | plus: 2 %}
<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/images/s1e3/' | append: card | append: '.png' | relative_url }}" alt="Parallelism 图文：{{ scene.title | strip_newlines | escape }}" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">并行协作 · {{ forloop.index }} / {{ s1e3.size }}</p>
<p class="visual-note-title">{{ scene.title | escape | newline_to_br }}</p>
<p>{{ scene.narration | escape | newline_to_br }}</p>
</div>
</section>
{% endfor %}

## 二、再把 Harness 变成优化对象

系统稳定地产生过程与证据之后，才讨论应当改什么。顺序是从“模型看见什么”（Context），到“系统如何推进任务”（Workflow），再到“哪些代码表面允许被编辑”（Harness Code）。每一步都要同时说清：反馈从哪里来、变更落在哪里、效果由谁判断。

### Context：从“有历史”到“选择历史”

持久记忆并不等于有效上下文。系统必须为当前任务筛选、压缩和组织证据；否则上下文越长，噪声、遗漏和错误锚定就越严重。这里的优化对象，是输入给模型的信息结构，而不是模型本身。

{% assign s2e1 = site.data.rsi.s2e1 | slice: 2, 8 %}
{% for scene in s2e1 %}
{% assign card = forloop.index | plus: 2 %}
<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/images/s2e1/' | append: card | append: '.png' | relative_url }}" alt="Context 图文：{{ scene.title | strip_newlines | escape }}" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">上下文选择 · {{ forloop.index }} / {{ s2e1.size }}</p>
<p class="visual-note-title">{{ scene.title | escape | newline_to_br }}</p>
<p>{{ scene.narration | escape | newline_to_br }}</p>
</div>
</section>
{% endfor %}

### Workflow：从单条流程到可搜索程序

当 Context 已经可控，瓶颈往往转到控制流：先检索还是先分解、何时调用工具、哪些步骤可以并行、失败后怎样回退。把 workflow 表达为可修改、可评估的程序，才有可能在多种策略中搜索更好的执行方式。

<aside class="rsi-paper-note" markdown="1">
<p class="rsi-paper-kicker">论文拆解｜ADAS 发明候选，AFlow 搜索候选</p>

[ADAS](https://arxiv.org/abs/2408.08435) 的核心设定是：用一个 meta-agent 编写 agent 的代码，并把以往发现放入持续增长的 archive；它探索的可以是 prompt、工具使用、角色分工或控制流的组合。[AFlow](https://arxiv.org/abs/2410.10762) 则把 code 表示的 workflow 看作一棵搜索树：节点是候选流程，边代表一次代码修改；每个候选实际运行后返回分数，MCTS 决定哪些分支值得继续扩展。直观例子是把 `写结论 → 补验证` 改成 `取证 → verify → 写结论`：真正被比较的不是文案好坏，而是两套可执行流程在留出任务上的结果。
</aside>

{% assign s2e2 = site.data.rsi.s2e2 | slice: 2, 8 %}
{% for scene in s2e2 %}
{% assign card = forloop.index | plus: 2 %}
<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/images/s2e2/' | append: card | append: '.png' | relative_url }}" alt="Workflow 图文：{{ scene.title | strip_newlines | escape }}" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">流程搜索 · {{ forloop.index }} / {{ s2e2.size }}</p>
<p class="visual-note-title">{{ scene.title | escape | newline_to_br }}</p>
<p>{{ scene.narration | escape | newline_to_br }}</p>
</div>
</section>
{% endfor %}

### Harness Code：允许修改，但锁住裁判

编辑范围扩大到 harness code 后，系统终于能修正工具封装、调度逻辑和记忆接口；风险也同步放大。可编辑的业务层与不可编辑的评估、权限、预算和日志层必须分开，否则系统可以通过改写规则而不是改进能力来“赢得”分数。

<aside class="rsi-paper-note" markdown="1">
<p class="rsi-paper-kicker">论文拆解｜从候选 Harness 到可审计 Patch</p>

[Meta-Harness](https://arxiv.org/abs/2603.28052) 把优化放到外循环：proposer 通过文件系统查看每一版 harness 的源码、分数和执行轨迹，再提出下一版 code；它强调把完整历史作为可检索证据，而非压缩成一小段反馈。[POLARIS](https://aclanthology.org/2026.findings-acl.1969/) 给出更小的例子：先把多次失败抽象成可复用策略，再做保守的 policy patch 并检查。比如三次都误解“混合物总量”，可新增一条“先判断量词范围”的规则；这比保存三段答案，或一次性重写整个 agent，都更容易验证因果。
</aside>

{% assign s2e3 = site.data.rsi.s2e3 | slice: 2, 4 %}
{% for scene in s2e3 %}
{% assign card = forloop.index | plus: 2 %}
<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/images/s2e3/' | append: card | append: '.png' | relative_url }}" alt="Harness Code 图文：{{ scene.title | strip_newlines | escape }}" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">可编辑边界 · {{ forloop.index }} / {{ s2e3.size }}</p>
<p class="visual-note-title">{{ scene.title | escape | newline_to_br }}</p>
<p>{{ scene.narration | escape | newline_to_br }}</p>
</div>
</section>
{% endfor %}

## 三、最后让改进器进入闭环

现在系统既有可修改的对象，也有运行中留下的证据。接下来要解决更难的一层：谁来提出改动、如何防止它迎合自己的评测、以及怎样在大量候选中保留真正有价值的改进。答案不是无限重写，而是受约束的提案、独立验证与有记忆的搜索。

### RSI 门槛：改答案、改 Harness、改 Improver

先厘清“自我改进”到底在改什么。改一次任务答案是局部修正；改 harness 才会影响未来同类任务；让优化器本身改进，才进入更高一层的递归。层级越高，越需要把可编辑范围和外部约束写清楚。

<aside class="rsi-paper-note" markdown="1">
<p class="rsi-paper-kicker">论文拆解｜STOP 为什么是“改进器的改进器”</p>

[STOP](https://arxiv.org/abs/2310.02304) 从一个 seed improver 开始：它接收待改程序、效用函数和语言模型，多次调用模型后返回候选中的较优解。随后不只让 improver 改下游程序，还让它改写自己；评价标准也随之变成“新 improver 在一组未来任务上的平均效用”，而不是某一次回答有没有更顺。论文中模型会提出 beam search、遗传算法等策略，但基础模型权重没有变化，因此作者明确不把它称为完整 RSI。这个限制正好说明：多套一层循环不是重点，能否在未来任务上独立验证才是。
</aside>

{% assign s3e1 = site.data.rsi.s3e1 | slice: 2, 6 %}
{% for scene in s3e1 %}
{% assign card = forloop.index | plus: 2 %}
<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/images/s3e1/' | append: card | append: '.png' | relative_url }}" alt="RSI 图文：{{ scene.title | strip_newlines | escape }}" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">递归层级 · {{ forloop.index }} / {{ s3e1.size }}</p>
<p class="visual-note-title">{{ scene.title | escape | newline_to_br }}</p>
<p>{{ scene.narration | escape | newline_to_br }}</p>
</div>
</section>
{% endfor %}

### 可信闭环：证据 → 窄 Diff → 独立 Gate

一个可信的闭环应当把诊断、提案、执行与裁决拆开：从失败证据识别问题，生成范围受限的 diff，再让独立的测试、评估或跨任务验证决定是否接受。这样，改进器可以很灵活，控制层却不会随它一起漂移。

<aside class="rsi-paper-note" markdown="1">
<p class="rsi-paper-kicker">论文拆解｜Self-Harness 与 AHE 怎样让改动可信</p>

[Self-Harness](https://arxiv.org/abs/2606.09498) 把循环明确拆为三段：从 execution traces 挖掘某个基础模型特有的失败模式（Weakness Mining），据此提出多样但最小的 harness 修改（Harness Proposal），再用回归测试决定接受或拒绝（Proposal Validation）。例如发现一个模型经常遗漏 artifact 路径，就只修改产物索引与读取策略，并在未参与提案的任务上复测。[AHE](https://arxiv.org/abs/2604.25850) 补上可观测性：组件以文件形式暴露，海量轨迹被压成可下钻的证据层，每个 edit 都附带“我预计它会改善什么”的可证伪预测。两者共同强调：不是让 agent 任意改仓库，而是让每个改动成为可追溯、可回滚的实验。
</aside>

{% assign s3e2 = site.data.rsi.s3e2 | slice: 2, 5 %}
{% for scene in s3e2 %}
{% assign card = forloop.index | plus: 2 %}
<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/images/s3e2/' | append: card | append: '.png' | relative_url }}" alt="可信闭环图文：{{ scene.title | strip_newlines | escape }}" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">独立验证 · {{ forloop.index }} / {{ s3e2.size }}</p>
<p class="visual-note-title">{{ scene.title | escape | newline_to_br }}</p>
<p>{{ scene.narration | escape | newline_to_br }}</p>
</div>
</section>
{% endfor %}

### 进化搜索：保留前沿，而非复制冠军

单一的“当前最好版本”很容易过拟合一次评测或卡在局部最优。进化式搜索把多个候选保留为一个可比较的种群，围绕它们变异、评估、筛选，并设置预算、停止条件与回滚；改进因此是一条可审计的搜索轨迹，而非不可逆的自我覆盖。

<aside class="rsi-paper-note" markdown="1">
<p class="rsi-paper-kicker">论文拆解｜MetaSkill-Evolve 的双时间尺度</p>

[MetaSkill-Evolve](https://arxiv.org/abs/2607.05297) 用同一个冻结的模型骨干运行两条不同速度的更新：快环修改 task skill，即“当前任务怎么做”；慢环修改 meta-skill，即“怎样分析失败、检索经验、分配预算、提出候选和演化候选”。其 meta-skill 显式参数化 Analyzer、Retriever、Allocator、Proposer 与 Evolver 五个角色。用代码修复作类比：快环可以把“先运行最小复现”写进当前 skill；慢环则改变“从哪些失败簇取样、给哪些假设更多预算”的规则。前者改行为，后者改产生行为改动的机制。
</aside>

{% assign s3e3 = site.data.rsi.s3e3 | slice: 1, 5 %}
{% for scene in s3e3 %}
{% assign card = forloop.index | plus: 1 %}
<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/images/s3e3/' | append: card | append: '.png' | relative_url }}" alt="进化搜索图文：{{ scene.title | strip_newlines | escape }}" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">候选搜索 · {{ forloop.index }} / {{ s3e3.size }}</p>
<p class="visual-note-title">{{ scene.title | escape | newline_to_br }}</p>
<p>{{ scene.narration | escape | newline_to_br }}</p>
</div>
</section>
{% endfor %}

{% assign s3e3_final = site.data.rsi.s3e3 | slice: 7, 1 %}
{% for scene in s3e3_final %}
<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/rsi-harness-engineering/images/s3e3/8.png' | relative_url }}" alt="进化搜索的上线检查：{{ scene.title | strip_newlines | escape }}" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">候选搜索 · 上线检查</p>
<p class="visual-note-title">{{ scene.title | escape | newline_to_br }}</p>
<p>{{ scene.narration | escape | newline_to_br }}</p>
</div>
</section>
{% endfor %}

<section class="post-appendix" markdown="1">

## 从 Weng 原文继续读

- [Harness Design Patterns](https://lilianweng.github.io/posts/2026-07-04-harness/#harness-design-patterns)：Workflow、文件系统持久记忆、子代理与后台任务。
- [Harness Optimization](https://lilianweng.github.io/posts/2026-07-04-harness/#harness-optimization)：Context、Workflow、Harness Code 与 optimizer code 的对象递进。
- [Self-Improving Harness](https://lilianweng.github.io/posts/2026-07-04-harness/#self-improving-harness)：受限提案、独立验证和环外权限。
- [Evolutionary Search](https://lilianweng.github.io/posts/2026-07-04-harness/#evolutionary-search)：候选 harness 的变异、评估、保留和停止条件。

原始 79 张图片与文字均保留在 `D:\Codex\Video\RSI-series-2026-publish`；本页只重新编排阅读路径，不含视频。
</section>
