---
layout: post
title: "DharmaOCR: Specialized Small Language Models for Structured OCR that outperform Open-Source and Commercial Baselines"
date: 2026-06-18 09:59:14 +0800
summary: "这次换一个完全不同的后训练角度。不是再讲 RL 的 trust region，也不是长上下文能力覆盖，而是看一个更贴近生产的例子：DPO 为什么不只属于聊天对齐，也可以用来修一种很具体的结构化输出故障。"
tags: [video-notes, visual-essay, LLM post-training]
category: LLM Post-training
cover: /assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/01.png
body_class: dive-into-codex-post
---

这次换一个完全不同的后训练角度。不是再讲 RL 的 trust region，也不是长上下文能力覆盖，而是看一个更贴近生产的例子：DPO 为什么不只属于聊天对齐，也可以用来修一种很具体的结构化输出故障。

<div class="source-list">
  <a href="https://arxiv.org/abs/2604.14314">DharmaOCR: Specialized Small Language Models for Structured OCR that outperform Open-Source and Commercial Baselines</a>
  <a href="https://huggingface.co/blog/Dharma-AI/direct-preference-optimization-beyond-chatbots">Direct Preference Optimization Beyond Chatbots</a>
  <a href="https://huggingface.co/Dharma-AI/Dharma-OCR-LITE">Dharma-OCR-LITE model card</a>
  <a href="https://huggingface.co/datasets/Dharma-AI/DharmaOCR-Benchmark">DharmaOCR-Benchmark</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/01.png' | relative_url }}" alt="封面：DPO 不只属于聊天对齐" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>封面：DPO 不只属于聊天对齐</h2>

这次换一个完全不同的后训练角度。不是再讲 RL 的 trust region，也不是长上下文能力覆盖，而是看一个更贴近生产的例子：DPO 为什么不只属于聊天对齐，也可以用来修一种很具体的结构化输出故障。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/02.png' | relative_url }}" alt="主角：DharmaOCR，结构化 OCR，小模型后训练" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>主角：DharmaOCR，结构化 OCR，小模型后训练</h2>

主角是 DharmaOCR。2026 年 4 月 15 日，Dharma-AI 在 arXiv 放出论文，做的是巴西葡萄牙语文档的结构化 OCR。它不是只让模型吐一段文本，而是要求输出固定 JSON：header、text、footer、margin。问题也很现实：模型一旦开始自回归循环，可能重复一大片文本，直到打满输出长度。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/03.png' | relative_url }}" alt="生产故障：文本退化循环会打满输出长度" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>生产故障：文本退化循环会打满输出长度</h2>

这类 text degeneration 很容易被当成普通低质量样本过滤掉。但这篇工作的关键判断正好相反：这些失败样本不是噪声，而是最清楚的反面教材。因为它们不是“差一点”，而是一个可识别的失败类别。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/04.png' | relative_url }}" alt="关键反转：失败样本不是噪声，而是 rejected signal" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>关键反转：失败样本不是噪声，而是 rejected signal</h2>

论文里的路线是先 SFT，再 DPO。SFT 的作用很明确：把通用视觉语言模型拉到结构化 OCR 任务上，让它学会固定 JSON schema 和领域文本。但 SFT 最大化的是好答案的似然，它并不会直接告诉模型“不要掉进重复循环”。更麻烦的是，SFT 让模型更会做任务以后，反而可能让模型更接近这个退化吸引子。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/05.png' | relative_url }}" alt="两阶段训练：SFT 学会 JSON 任务，DPO 抑制退化形状" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>两阶段训练：SFT 学会 JSON 任务，DPO 抑制退化形状</h2>

Hugging Face 技术文章里举了一个很有意思的例子：Qwen2.5-VL-3B 的 vanilla 退化率是 0.60%，SFT 后升到 3.23%，再经过 DPO 降到 1.41%。这不是说 SFT 失败了，而是说明“任务能力”和“抵抗退化”是两件事。一个训练阶段可能让模型更有能力，同时也把它带到新的失败区域。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/06.png' | relative_url }}" alt="反直觉案例：SFT 可能提高能力，也更接近失败吸引子" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>反直觉案例：SFT 可能提高能力，也更接近失败吸引子</h2>

DPO 在这里做的事情很像“隐式 unlikelihood”。它不是只推高好输出，而是用完整 completion 级别的 preference pair，把退化输出标成 rejected，把干净结构化输出标成 chosen。也就是说，训练信号不再只是“像这个答案”，还明确包含“不要像这种失败形状”。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/07.png' | relative_url }}" alt="DPO 信号：chosen 是干净输出，rejected 是退化输出" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>DPO 信号：chosen 是干净输出，rejected 是退化输出</h2>

为了让这件事成立，DharmaOCR 管线满足三个条件。第一，失败模式要足够清楚，重复循环和普通错别字不是同一类错误。第二，要有稳定评分机制，能把可接受输出和退化输出分开；他们用了自动 LLM judge 评估候选输出。第三，要有足够多的模型输出，能形成有质量差距的 chosen-rejected pairs。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/08.png' | relative_url }}" alt="成立条件一：失败类别要清楚可识别" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>成立条件一：失败类别要清楚可识别</h2>

结果上，论文报告 DPO 在五个模型家族里都降低了 text degeneration，相对 SFT 的下降最高到 87.6%，并且没有把抽取质量一起打掉。DharmaOCR Full 和 Lite 在自己的 benchmark 上还把质量、退化率和单位成本一起作为评价对象，而不是只看字符相似度。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/09.png' | relative_url }}" alt="成立条件二：评分机制要稳定" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>成立条件二：评分机制要稳定</h2>

这个点对后训练很重要：很多生产故障不是“平均质量低”，而是“有一类输出一旦出现就直接不可用”。比如结构化 JSON 崩掉、工具调用死循环、长文摘要重复段落、代码生成反复补同一段。只要这种失败足够可识别、可评分、可收集，它就可能不是要删掉的数据，而是 DPO 最有价值的 rejected signal。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/10.png' | relative_url }}" alt="成立条件三：输出量要足够形成 preference pairs" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>成立条件三：输出量要足够形成 preference pairs</h2>

所以这条线真正值得学的，不是 OCR 本身，而是一个后训练设计原则：SFT 负责让模型学会任务，DPO 可以负责让模型远离任务里的特定失败吸引子。不要把失败样本一律当脏数据扔掉。对某些稳定、可识别、可评分的失败，最该做的是把它们保留下来，训练模型明确地不要走那条路。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/11.png' | relative_url }}" alt="结果：五个模型家族退化率都下降，最高 87.6%" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>结果：五个模型家族退化率都下降，最高 87.6%</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-dharmaocr-dpo/images/12.png' | relative_url }}" alt="结论：有些失败数据不该删，应该拿来教模型别走那条路" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>结论：有些失败数据不该删，应该拿来教模型别走那条路</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>
