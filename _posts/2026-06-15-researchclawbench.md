---
layout: post
title: "ResearchClawBench: A Benchmark for End-to-End Autonomous Scientific Research"
date: 2026-06-15 09:08:04 +0800
summary: "2026 年 5 月 28 日，上海 AI Lab 团队发布预印本《ResearchClawBench》。 它问的不是模型会不会答题，而是科研 Agent 能不能从原始数据、相关文献和任务目标出发，最后写出接近真实论文结论的研究报告。"
tags: [video-notes, visual-essay]
category: Agent
cover: /assets/posts/video-notes/2026-06-15-researchclawbench/images/01.png
body_class: dive-into-codex-post
---

2026 年 5 月 28 日，上海 AI Lab 团队发布预印本《ResearchClawBench》。 它问的不是模型会不会答题，而是科研 Agent 能不能从原始数据、相关文献和任务目标出发，最后写出接近真实论文结论的研究报告。

<div class="source-list">
  <a href="https://arxiv.org/abs/2606.07591">ResearchClawBench: A Benchmark for End-to-End Autonomous Scientific Research</a>
  <a href="https://github.com/InternScience/ResearchClawBench">ResearchClawBench GitHub repository</a>
  <a href="https://internscience.github.io/ResearchClawBench-Home/">ResearchClawBench official site</a>
  <a href="https://huggingface.co/datasets/InternScience/ResearchClawBench">ResearchClawBench dataset card</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/01.png' | relative_url }}" alt="封面：科研 Agent 离自动科研还有多远" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>封面：科研 Agent 离自动科研还有多远</h2>

2026 年 5 月 28 日，上海 AI Lab 团队发布预印本《ResearchClawBench》。
它问的不是模型会不会答题，而是科研 Agent 能不能从原始数据、相关文献和任务目标出发，最后写出接近真实论文结论的研究报告。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/02.png' | relative_url }}" alt="论文身份：ResearchClawBench，2026-05-28，上海 AI Lab" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>论文身份：ResearchClawBench，2026-05-28，上海 AI Lab</h2>

这个 benchmark 一共做了 40 个任务，覆盖 10 个科学领域。
每个任务都对应一篇真实论文，但评测时会把目标论文藏起来，只给 Agent 原始数据、相关资料和研究目标。
也就是说，Agent 不能靠背答案过关，必须自己读数据、跑分析、画图、写报告。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/03.png' | relative_url }}" alt="核心问题：不是会答题，而是能不能做完整科研" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>核心问题：不是会答题，而是能不能做完整科研</h2>

它的分数也不是普通 benchmark 那种对错题。
这里把 50 分定义成“重新发现了原论文”，70 分以上才算“超过原论文”。
这个定义很重要，因为它把科研 Agent 的目标，从写得像不像，改成了结论和证据能不能站住。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/04.png' | relative_url }}" alt="任务设置：藏起目标论文，只给数据、文献、目标" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>任务设置：藏起目标论文，只给数据、文献、目标</h2>

结果很扎心。
最强的 autonomous agent，平均只有 21.5 分。
最强的裸模型基线，平均也只有 20.7 分。
就算把每个任务里最好的 agent 结果拼起来，frontier mean 也只有 24.6。
这说明今天的科研 Agent，离“稳定复现一篇真实论文”还差得很远。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/05.png' | relative_url }}" alt="覆盖范围：40 个任务，10 个学科" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>覆盖范围：40 个任务，10 个学科</h2>

为什么这么难？
因为真正的科研流程不是一步推理，而是一条长链路。
你要先理解问题，再选对实验协议，再处理数据，再决定图怎么画，最后还要把证据和结论对应起来。
论文里的错误分析也很直接：失败主要集中在实验协议不匹配、证据对不上、还有根本没抓住科学核心。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/06.png' | relative_url }}" alt="评分定义：50 分等于复现论文，70 分以上才算超过" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>评分定义：50 分等于复现论文，70 分以上才算超过</h2>

这个 benchmark 还有一个细节很值得看。
它不是只测 agent，也测 17 个 native LLM，通过一个叫 ResearchHarness 的轻量框架去跑。
结果说明一个关键事实：光把模型换强，并不能自动跨过科研工作流这道坎。
真正难的是把多步决策、工具调用、证据积累和最终论证串成一个可靠闭环。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/07.png' | relative_url }}" alt="主结果：最强 autonomous agent 平均 21.5 分" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>主结果：最强 autonomous agent 平均 21.5 分</h2>

所以，ResearchClawBench 的价值，不是证明 AI 还不会做科研。
它真正做的是把“自动科研”这件事拆成了可以审计的具体能力：
能不能从原始数据出发？
能不能复现实验协议？
能不能把图表、文字和结论对齐？
能不能在没有标准答案暴露的情况下，真的重新发现原论文？
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/08.png' | relative_url }}" alt="模型对照：最强裸模型基线也只有 20.7 分" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>模型对照：最强裸模型基线也只有 20.7 分</h2>

如果一个 Agent 连 50 分都摸不到，
那它离“替你做完整科研项目”还差的不是一点模型智商，
而是整条研究工作流的稳定性、验证性和证据管理能力。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/09.png' | relative_url }}" alt="frontier 含义：按任务拼最优结果也只有 24.6" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>frontier 含义：按任务拼最优结果也只有 24.6</h2>

下一阶段更值得追的，不是某个 Agent 又会不会多调用几个工具，
而是它能不能在长链路里少走错路，少做错实验，最后交出一份经得起审查的研究结果。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/10.png' | relative_url }}" alt="为什么难：科研是长链路闭环，不是一次回答" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>为什么难：科研是长链路闭环，不是一次回答</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/11.png' | relative_url }}" alt="三类主要失败：协议错、证据错、科学核心缺失" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>三类主要失败：协议错、证据错、科学核心缺失</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/12.png' | relative_url }}" alt="ResearchHarness：强模型也不能自动跨过工作流鸿沟" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>ResearchHarness：强模型也不能自动跨过工作流鸿沟</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-15-researchclawbench/images/13.png' | relative_url }}" alt="结论：下一代 Agent 要解决的是可验证科研闭环" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Video Notes</p>
<h2>结论：下一代 Agent 要解决的是可验证科研闭环</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>
