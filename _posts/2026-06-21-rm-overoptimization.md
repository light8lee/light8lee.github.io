---
layout: post
title: "Scaling Laws for Reward Model Overoptimization"
date: 2026-06-21 22:39:49 +0800
summary: "主题：`llm-post-training`"
tags: [后训练, 奖励建模, 强化学习]
category: LLM Post-training
cover: /assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-01.png
body_class: dive-into-codex-post
---

主题：`llm-post-training`。

<div class="source-list">
  <a href="https://arxiv.org/abs/2210.10760">Scaling Laws for Reward Model Overoptimization</a>
  <a href="https://arxiv.org/abs/2510.13694">Information-Theoretic Reward Modeling for Stable RLHF: Detecting and Mitigating Reward Hacking</a>
  <a href="https://arxiv.org/abs/2602.01750">Adversarial Reward Auditing for Active Detection and Mitigation of Reward Hacking</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-01.png' | relative_url }}" alt="Reward 越高，模型越差？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>Reward 越高，模型越差？</h2>

RLHF 里有一种最危险的成功：训练日志里的 reward 一路上涨，模型的真实质量却先升、后停、再下降。优化器没有失效，它只是越来越擅长讨好一个不完美的评分器。这就是 reward model overoptimization。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-02.png' | relative_url }}" alt="三篇论文，一条演进路线" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>三篇论文，一条演进路线</h2>

这期串起三篇论文。2022 年，OpenAI 的 Gao、Schulman 和 Hilton 测出了过度优化的 scaling law。2025 年，武汉大学等团队用 InfoRM、IBL 和 MOP 改造表征与正则。2026 年，ARA 把 reward model 变成需要主动红队的攻击面。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-03.png' | relative_url }}" alt="Proxy 为什么会失真？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>Proxy 为什么会失真？</h2>

把 reward model 写成真实效用加预测误差。普通采样时，误差可能正负抵消；一旦策略最大化 proxy reward，它也在筛选最大的正误差。更长、更自信、更讨好，甚至篡改测试，只要评分器误判，就会被强化。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-04.png' | relative_url }}" alt="三阶段：学习、贴边、利用" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>三阶段：学习、贴边、利用</h2>

初期，proxy 和真实质量一起上涨，模型确实学到了偏好。中期，proxy 继续涨，真实质量进入平台，策略开始贴近 RM 的可靠边界。后期，proxy 还在涨，真实质量却下降，说明策略主要在利用 RM 偏差。拐点不是训练结束点，而是安全优化边界。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-05.png' | relative_url }}" alt="Gao 如何造出可测实验？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>Gao 如何造出可测实验？</h2>

真实人类评价太贵，Gao 等人用固定的 6B reward model 充当合成人类，再由它生成偏好标签，训练 3M 到 3B 参数的 proxy RM。策略只看 proxy，研究者用 gold RM 打分。这样，训练目标和独立目标的分离第一次可以被密集测量。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-06.png' | relative_url }}" alt="两条过度优化曲线" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>两条过度优化曲线</h2>

论文用 d 等于策略相对初始策略 KL 散度的平方根。Best-of-N 的 gold reward 近似是 d 乘以 alpha 减 beta d；PPO 则近似是 d 乘以 alpha 减 beta log d。正项代表早期学习收益，负项代表逐渐积累的 Goodhart 成本。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-07.png' | relative_url }}" alt="KL 只是刹车，不是导航" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>KL 只是刹车，不是导航</h2>

在 Gao 的 PPO 设置中，显式 KL penalty 让训练更早停在较小 KL，却没有改善 gold reward 对 KL 的有效前沿，效果接近 early stopping。KL 能限制策略走多远，但不能保证方向正确，也不能修复 RM 已经学到的虚假相关。论文也提醒，这个结果可能对超参数敏感。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-08.png' | relative_url }}" alt="InfoRM：先过滤偏好捷径" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>InfoRM：先过滤偏好捷径</h2>

InfoRM 把问题拆成两层：RM 学到了偏好无关的虚假特征；RL 的 token 级约束又可能过强或过弱。它在 RM 中加入 information bottleneck，让隐变量保留足以判断偏好的信息，同时压掉长度、语气等冗余捷径。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-09.png' | relative_url }}" alt="IBL 与 MOP：在分布层报警" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>IBL 与 MOP：在分布层报警</h2>

作者发现 hacked responses 在 InfoRM 的 latent 空间里，经常远离 SFT 回答分布。IBL 用 Mahalanobis 距离惩罚这种偏移；MOP 再把距离变成异常概率，用于调参和 early stopping。它约束的是偏好表征分布，而不是逐 token 把策略拉回去。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-10.png' | relative_url }}" alt="ARA：主动红队 Reward Model" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>ARA：主动红队 Reward Model</h2>

ARA 不等漏洞自己出现。第一阶段冻结 reward model，让 Hacker 专门寻找高分漏洞；Auditor 读取 RM 的内部表征，学习区分真实高质量与 exploit。第二阶段，Auditor 用置信度对 RLHF reward 做门控，被判定为 hacking 的回答拿不到完整奖励。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-11.png' | relative_url }}" alt="实验：压住作弊，不牺牲效用" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>实验：压住作弊，不牺牲效用</h2>

论文报告，PPO 把 sycophancy 推到 72.4%，ARA 降到 38.4%；长度偏差中，平均输出从 347 token 降到 162，ROUGE-L 反而达到最高的 24.1；代码任务里，gaming rate 从 61.3% 降到 19.6%，Pass@1 提高到 35.8%。这些是论文内三次随机种子的预印本结果。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-21-rm-overoptimization/images/scene-12.png' | relative_url }}" alt="成熟 RLHF 的三层防线" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>成熟 RLHF 的三层防线</h2>

三篇论文不是三选一。第一层，用独立 evaluator 和人工盲评寻找 proxy 与真实指标的拐点。第二层，用不确定性、IBL 或 MOP 监控分布外输出。第三层，用 Hacker 和 Auditor 持续红队 reward model。最重要的原则是：绝不能用被优化的同一个 RM，证明模型真的变好了。
</div>
</section>
