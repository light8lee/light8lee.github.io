---
layout: post
title: "RL 为什么非要最后才上场？"
date: 2026-06-14 09:59:26 +0800
summary: "2026 年 6 月 2 日，哈佛大学的 Rachit Bansal、Clara Mohri、Tian Qin、David Alvarez-Melis 和 Sham Kakade 发布预印本《RL Excursions during Pre-Training》。"
tags: [预训练, 强化学习]
category: LLM Post-training
cover: /assets/posts/video-notes/2026-06-14-rl-excursions/images/01.png
body_class: dive-into-codex-post
---

2026 年 6 月 2 日，哈佛大学的 Rachit Bansal、Clara Mohri、Tian Qin、David Alvarez-Melis 和 Sham Kakade 发布预印本《RL Excursions during Pre-Training》。

<div class="source-list">
  <a href="https://arxiv.org/abs/2606.04272">RL Excursions during Pre-Training: Re-examining Policy Optimization for LLM training</a>
  <a href="https://rl-excursions.github.io/">RL Excursions during Pretraining: How early is too early for On-policy Learning?</a>
  <a href="https://openreview.net/forum?id=m0kM7ndb38">RL Excursions during Pre-training: How Early is Too Early for On-policy Learning?</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/01.png' | relative_url }}" alt="封面：RL 被挡在训练流水线最后一道门外。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>封面：RL 被挡在训练流水线最后一道门外。</h2>

2026 年 6 月 2 日，哈佛大学的 Rachit Bansal、Clara Mohri、Tian Qin、David Alvarez-Melis 和 Sham Kakade 发布预印本《RL Excursions during Pre-Training》。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/02.png' | relative_url }}" alt="论文信息：作者、哈佛大学、发布日期与研究问题。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>论文信息：作者、哈佛大学、发布日期与研究问题。</h2>

标准训练流水线通常是：先预训练，再监督微调 SFT，最后做强化学习 RL。论文追问：RL 为什么必须等到最后？
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/03.png' | relative_url }}" alt="标准流水线：预训练到 SFT 再到 RL。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>标准流水线：预训练到 SFT 再到 RL。</h2>

团队从头训练一个 10 亿参数模型，在不同预训练检查点上，分别测试直接 RL、SFT、以及 SFT 后再 RL。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/04.png' | relative_url }}" alt="受控实验：同一检查点分三条训练路线。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>受控实验：同一检查点分三条训练路线。</h2>

这里的关键区别是：SFT 模仿外部给定的标准答案；RL 则从模型自己生成的答案中，根据可验证奖励学习。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/05.png' | relative_url }}" alt="SFT 与 RL：模仿标准答案，对比从自身采样学习。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>SFT 与 RL：模仿标准答案，对比从自身采样学习。</h2>

最意外的结果是，模型只见过 40 亿 token 时，直接 RL 就已经有效。在 GSM8K 上，pass@1 从约 2% 提升到约 18%。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/06.png' | relative_url }}" alt="40 亿 token：GSM8K pass@1 从约 2% 到约 18%。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>40 亿 token：GSM8K pass@1 从约 2% 到约 18%。</h2>

这不代表 RL 可以替代预训练。它说明，只要基础模型已经偶尔能够采样到正确答案，RL 就可能放大这种能力。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/07.png' | relative_url }}" alt="生效条件：基础模型必须偶尔采样到正确答案。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>生效条件：基础模型必须偶尔采样到正确答案。</h2>

论文用 pass@k 观察探索能力。pass@1 看一次回答能否成功；pass@32 看采样 32 次时，是否至少有一次成功。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/08.png' | relative_url }}" alt="pass@1 与 pass@32：一次命中与多次探索。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>pass@1 与 pass@32：一次命中与多次探索。</h2>

直接在基础检查点上做 RL，pass@1 和 pass@32 都提升，输出分布反而扩张。论文发现，常说的“RL 只会让分布变尖”，主要发生在 SFT 之后再做 RL。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/09.png' | relative_url }}" alt="分布变化：直接 RL 扩张，SFT 后 RL 更易变尖。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>分布变化：直接 RL 扩张，SFT 后 RL 更易变尖。</h2>

原因可以这样理解：SFT 把模型拉向少量标准演示，先缩窄了可探索路线；之后 RL 更容易强化已有高分模式。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/10.png' | relative_url }}" alt="机制解释：SFT 先缩窄探索路线。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>机制解释：SFT 先缩窄探索路线。</h2>

在更难的 MATH 问题上，增加针对性的预训练数据，比把模型从 10 亿参数放大到 40 亿参数更有效。数据组成有时比模型尺寸更关键。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/11.png' | relative_url }}" alt="数据与规模：针对性数据胜过单纯扩模。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>数据与规模：针对性数据胜过单纯扩模。</h2>

论文还尝试把 SFT 梯度和 RL 梯度并行计算后取平均。这个简单组合，在每个预训练检查点都取得最强的 pass@32，并保留更多通用能力。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/12.png' | relative_url }}" alt="并行平均：SFT 梯度和 RL 梯度合并。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>并行平均：SFT 梯度和 RL 梯度合并。</h2>

但边界必须说清楚：实验集中在自训练的 1B 模型、数学任务和可验证奖励，不能直接外推到超大模型、开放式对话或安全对齐。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/13.png' | relative_url }}" alt="实验边界：1B、数学、可验证奖励、预印本。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Video Notes</p>
<h2>实验边界：1B、数学、可验证奖励、预印本。</h2>

这项研究真正改变的问题不是“后训练用哪种算法”，而是“RL 应该在训练的哪个阶段介入”。未来的训练流水线，可能不再是一条固定的直线。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-14-rl-excursions/images/14.png' | relative_url }}" alt="结论：RL 介入时机将成为新训练变量。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">014 / Video Notes</p>
<h2>结论：RL 介入时机将成为新训练变量。</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>
