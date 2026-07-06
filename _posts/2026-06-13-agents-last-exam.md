---
layout: post
title: "Agent 会做题，为什么还不会上班？"
date: 2026-06-13 10:16:45 +0800
summary: "2026 年 6 月 3 日，UC Berkeley RDI 牵头的三百多位作者发布预印本《Agents' Last Exam》。"
tags: [video-notes, visual-essay]
category: Agent
cover: /assets/posts/video-notes/2026-06-13-agents-last-exam/images/01.png
body_class: dive-into-codex-post
---

2026 年 6 月 3 日，UC Berkeley RDI 牵头的三百多位作者发布预印本《Agents' Last Exam》。

<div class="source-list">
  <a href="https://arxiv.org/abs/2606.05405">Agents' Last Exam</a>
  <a href="https://github.com/rdi-berkeley/agents-last-exam">Agents' Last Exam open evaluation framework</a>
  <a href="https://agents-last-exam.org/">Agents' Last Exam official project site</a>
  <a href="https://snorkel.ai/agents-last-exam-can-ai-agents-actually-do-real-jobs/">Agents' Last Exam: can AI agents actually do real jobs?</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/01.png' | relative_url }}" alt="2.6%：会做题，不等于会交付。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>2.6%：会做题，不等于会交付。</h2>

2026 年 6 月 3 日，UC Berkeley RDI 牵头的三百多位作者发布预印本《Agents' Last Exam》。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/02.png' | relative_url }}" alt="论文身份：UC Berkeley RDI，2026-06-03，预印本。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>论文身份：UC Berkeley RDI，2026-06-03，预印本。</h2>

它想解决一个尴尬的问题：Agent 在很多基准上越来越强，但真正进入专业工作流后，可靠交付仍然很难。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/03.png' | relative_url }}" alt="背景矛盾：基准成绩上涨，真实经济影响滞后。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>背景矛盾：基准成绩上涨，真实经济影响滞后。</h2>

ALE 不考选择题。它把 Agent 放进真实电脑环境，只给任务描述，然后允许它使用图形界面、命令行、脚本、工具和子 Agent。最后不看过程是否漂亮，只检查交付物是否达标。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/04.png' | relative_url }}" alt="ALE 的考试方式：只给任务，开放完整电脑能力，检查交付物。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>ALE 的考试方式：只给任务，开放完整电脑能力，检查交付物。</h2>

一项任务必须同时满足三个条件：来自真实职业工作，通常需要专家数天完成；能够在真实软件环境中执行；结果可以通过隐藏参考答案或确定性评分器验证。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/05.png' | relative_url }}" alt="三个任务门槛：真实、长链路、可验证。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>三个任务门槛：真实、长链路、可验证。</h2>

整个任务库覆盖十三个大类、五十五个子领域，共一千四百九十个任务实例。但目前只有一百五十个公开任务，一千零一十七个任务保持私有，另有三百二十三个还在等待质量检查。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/06.png' | relative_url }}" alt="评测流水线：load → start → agent loop → evaluate。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>评测流水线：load → start → agent loop → evaluate。</h2>

这很重要。私有任务能降低训练数据污染，但也意味着外部研究者能完整审计的范围仍然有限。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/07.png' | relative_url }}" alt="覆盖范围：13 大类、55 子领域、1,490 个任务实例。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>覆盖范围：13 大类、55 子领域、1,490 个任务实例。</h2>

ALE 把难度分成近期开启、全谱系和终极考试三档。结果很刺眼：最难档的平均完整通过率只有百分之二点六；即使看全部任务，领先系统的完整通过率也只有约四分之一。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/08.png' | relative_url }}" alt="数据透明度：150 公开、1,017 私有、323 待 QC。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>数据透明度：150 公开、1,017 私有、323 待 QC。</h2>

完整通过率和平均得分不是一回事。Agent 可能完成大部分步骤，拿到部分分数，但只要最终交付物缺少关键要求，就不能算完整通过。真实工作往往就是这样：九成完成，不等于交付。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/09.png' | relative_url }}" alt="三档难度：near-term、full-spectrum、last-exam。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>三档难度：near-term、full-spectrum、last-exam。</h2>

论文还发现，在固定 Agent 框架时，更换底层模型带来的通过率跨度约为十八个百分点；固定模型、更换框架时，跨度大约只有五点三到六个百分点。至少在这批实验里，底层模型的影响更大，但框架仍会影响成本、速度和稳定性。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/10.png' | relative_url }}" alt="核心结果：最难档平均完整通过率 2.6%。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>核心结果：最难档平均完整通过率 2.6%。</h2>

所以，ALE 的价值不是宣布 Agent 永远不会工作，而是把“会回答问题”改写成“能否在真实环境里持续行动，并交出可验证成果”。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/11.png' | relative_url }}" alt="完整通过率与平均得分的区别。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>完整通过率与平均得分的区别。</h2>

它也不是失业预测。这个基准测量的是任务完成能力，不是组织采用速度、成本收益、法律责任或劳动市场变化。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/12.png' | relative_url }}" alt="模型与框架影响：18.0pp vs 5.3–6.0pp。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>模型与框架影响：18.0pp vs 5.3–6.0pp。</h2>

真正值得追踪的指标，不再只是模型答对了多少题，而是：它能否稳定完成长链路工作，失败后能否恢复，最终交付物能否被验证。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/13.png' | relative_url }}" alt="成本和时间也是评测维度。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Video Notes</p>
<h2>成本和时间也是评测维度。</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/14.png' | relative_url }}" alt="限制：预印本、公开子集小、不是劳动市场预测。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">014 / Video Notes</p>
<h2>限制：预印本、公开子集小、不是劳动市场预测。</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/15.png' | relative_url }}" alt="结论：下一代 Agent 指标是可验证交付。" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">015 / Video Notes</p>
<h2>结论：下一代 Agent 指标是可验证交付。</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-13-agents-last-exam/images/16.png' | relative_url }}" alt="Scene 16" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">016 / Video Notes</p>
<h2>Scene 16</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>
