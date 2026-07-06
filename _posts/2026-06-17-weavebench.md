---
layout: post
title: "Computer-use agent真正的难点不是会点按钮或会写命令，而是能不能在长链路任务里稳定编排GUI与CLI"
date: 2026-06-17 09:12:09 +0800
summary: "2026 年 6 月 8 日，浙江大学、微软亚洲研究院、清华大学的作者团队发布了预印本《WeaveBench》。这篇工作想测的，不是 Agent 会不会点按钮，也不是会不会敲命令，而是它能不能把 GUI 观察、CLI 操作、代码修改和再次验证，稳定地编排成一条完整工作链路。"
tags: [video-notes, visual-essay]
category: Agent
cover: /assets/posts/video-notes/2026-06-17-weavebench/images/01.png
body_class: dive-into-codex-post
---

2026 年 6 月 8 日，浙江大学、微软亚洲研究院、清华大学的作者团队发布了预印本《WeaveBench》。这篇工作想测的，不是 Agent 会不会点按钮，也不是会不会敲命令，而是它能不能把 GUI 观察、CLI 操作、代码修改和再次验证，稳定地编排成一条完整工作链路。

<div class="source-list">
  <a href="https://arxiv.org/abs/2606.09426">WeaveBench: A Long-Horizon, Real-World Benchmark for Computer-Use Agents with Hybrid Interfaces</a>
  <a href="https://weavebench.github.io/">WeaveBench official project site</a>
  <a href="https://github.com/weavebench/WeaveBench">WeaveBench code release and runtime setup</a>
  <a href="https://huggingface.co/datasets/wanlilll/WeaveBench">WeaveBench dataset card</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/01.png' | relative_url }}" alt="Agent 真难点，不是点按钮" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>Agent 真难点，不是点按钮</h2>

很多 computer-use agent 看起来什么都会，但 WeaveBench 说，真正难的不是点按钮，而是把图形界面观察、命令行修改和最终验证，编排成一条稳定链路。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/02.png' | relative_url }}" alt="WeaveBench 是谁做的？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>WeaveBench 是谁做的？</h2>

二零二六年六月八日，浙江大学、微软亚洲研究院和清华大学的作者团队发布了预印本 WeaveBench，专门测 computer-use agent 的跨界面执行能力。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/03.png' | relative_url }}" alt="会工具，不等于会交付" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>会工具，不等于会交付</h2>

这篇论文的背景很直接。今天的 agent 往往既能截图，也能开终端、改代码、用浏览器，但一旦在这些界面之间来回切换，就很容易丢状态、丢证据、丢下一步目标。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/04.png' | relative_url }}" alt="它测的是双通道任务" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>它测的是双通道任务</h2>

所以 WeaveBench 设计的任务，不是单纯看屏幕答题，也不是只靠 shell 解决问题，而是在同一条轨迹里既要看图形界面，也要回到命令行和代码里修改。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/05.png' | relative_url }}" alt="例子一看就懂" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>例子一看就懂</h2>

论文举的例子很典型。比如先在 Jaeger 里看 trace 的形状，再去 kubectl 改超时；或者先在桌面游戏里观察 sprite 异常，再回源码里修 scene graph。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/06.png' | relative_url }}" alt="三条 admission 门槛" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>三条 admission 门槛</h2>

为了保证真的是跨界面编排问题，作者给任务设了三条门槛：第一，GUI 和 CLI 都不可替代；第二，任务必须是长链路；第三，状态要在多个应用之间传递。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/07.png' | relative_url }}" alt="规模也不是玩具" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>规模也不是玩具</h2>

整套 benchmark 一共一百一十四个任务，覆盖八个真实工作域，包括 Web 开发、运维、数据分析、文档处理、桌面应用、设计和游戏，不是单一场景的小样本测试。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/08.png' | relative_url }}" alt="运行方式很务实" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>运行方式很务实</h2>

它的运行方式也很务实。作者没有另造一个封闭模拟器，而是把一个最小 GUI 插件接到现成的 agent runtime 上，让测出来的能力更接近真实部署。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/09.png' | relative_url }}" alt="GUI 工具其实很少" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>GUI 工具其实很少</h2>

GUI 侧工具其实非常少，只有一个 screenshot，再加九个原子动作，比如 click、drag、scroll、type 和 keypress。难点不在工具多，而在怎么把这些动作接起来。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/10.png' | relative_url }}" alt="评分盯的是过程" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>评分盯的是过程</h2>

更关键的是评分。WeaveBench 不只看最终产物，而是用 trajectory-aware judge 回看文件、截图、日志和动作轨迹，去判断 Agent 到底有没有真正完成这条链路。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/11.png' | relative_url }}" alt="只看结果，会高估 Agent" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>只看结果，会高估 Agent</h2>

结果很扎眼。全套 frontier 组合里，最好的完整通过率也只有百分之四十一点二。更夸张的是，GPT 五点五如果只看结果会被算到五十三点五，但审计过程之后会掉回三十三点三。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/12.png' | relative_url }}" alt="任务真的很长" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>任务真的很长</h2>

这不是一两步的小操作。WeaveBench 的中位任务要经历十六次 GUI 和 CLI 切换，中位 rollout 长度是七十六次工具调用，最长甚至四百七十一次。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-17-weavebench/images/13.png' | relative_url }}" alt="真正缺的是编排层" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Video Notes</p>
<h2>真正缺的是编排层</h2>

所以这篇论文真正打到的，不是模型会不会用电脑，而是 Agent 体系里最薄弱的编排层。GUI 提供瞬时渲染状态，CLI 和代码提供结构化可修改状态，难的是把两边稳定织成闭环。
</div>
</section>
