---
layout: post
title: "DPO Unchained：从偏好标签到可审计的选择建模"
date: 2026-08-02 09:00:00 +0800
summary: "把 S1E3 的五句话口播拆成一篇论文深读：标准 DPO 绑定了哪些假设，properness 为什么是规范底线，以及如何从长度、位置与弃权开始设计一套可审计的偏好训练。"
tags: [ICML 2026, LLM Post-training, DPO, Preference Optimization, Human Choice Theory, Proper Loss, Alignment]
category: LLM Post-training
cover: /assets/posts/video-notes/dpo-unchained/images/01.png
body_class: dpo-unchained-post
series: icml-2026-agent-posttraining
---

# DPO 不是“人类偏好”的唯一数学翻译

这次不把口播再压成一段摘要，而是保留 12 张场景卡作为视觉入口，下面用正文把口播主动省略的部分补回来：论文到底拆开了哪些层次，`proper loss` 与 Bregman divergence 是什么关系，为什么 `abstention` 不是简单加一个第三选项，以及一个 `A > B` 标签怎样被还原成可审计的实验设计。

论文是 [DPO Unchained: Your Training Algorithm is Secretly Disentangled in Human Choice Theory (and its Loss' Convexity is Dispensable)](https://openreview.net/forum?id=j4c3i3a5kH)，作者为 Wenxuan Zhou、Shujian Zhang、Brice Magdalou、John Lambert、Ehsan Amid、Richard Nock 与 Andrew Hard，ICML 2026 Spotlight / Oral。

<div class="source-list">
  <a href="https://openreview.net/forum?id=j4c3i3a5kH">OpenReview</a>
  <a href="https://arxiv.org/abs/2507.07855">arXiv</a>
  <a href="https://icml.cc/virtual/2026/poster/62171">ICML 2026</a>
</div>

## 先看图片，再读长文

本页只保留 12 张场景卡和配套文字。图片先交付五句话主线，正文再展开推理链、论文概念和证据边界。

> **一句话抓住论文：** DPO 不是“人类偏好”的唯一数学翻译，而是社会选择假设、选择概率模型与训练损失的一种特定组合。

本文的阅读顺序是：先用 12 张卡恢复视频主线，再把标准 DPO 放回论文的三层框架，最后把它翻译成一套可以用于数据审计和训练设计的流程。卡片中的 70%、40 字和 120 字都是解释性案例，不是论文的大模型实验结果。

## 12 张卡：把口播主线展开

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/01.png' | relative_url }}" alt="一条 A 大于 B 的标签真的能说明人为什么选择 A 吗" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / 封面钩子</p>

## 一条 `A > B`，为什么还不够？

偏好数据通常把一次比较压缩成一个胜负标签：`A > B`。这条记录告诉我们，在这次展示和这组标注条件下，A 被选中了；它没有记录选择者看到了什么、在意什么，也没有记录 B 是否因为更长、位置更靠后、格式更难读而吃亏。

这不是说标签没有用。它仍然是一个关于选择结果的观测，只是不能直接被当成一个已经解释好的奖励函数。把“结果”当成“原因”，会让训练过程把展示协议、答案长度、群体差异和真正的内容质量一起揉成一个标量。

所以论文的第一步不是发明一个新 loss，而是把问题改写为：我们究竟在建模谁的选择？选择概率是怎样从答案差异产生的？模型要用什么损失去拟合这个概率？
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/02.png' | relative_url }}" alt="DPO Unchained 论文信息与核心问题" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / 论文问题</p>

## 论文追问：DPO 的三层组合必须绑定吗？

DPO 的漂亮之处在于，它绕过了显式训练 reward model 的步骤，把策略相对 reference policy 的 log-ratio 差直接接到一个偏好损失上。标准推导里，Bradley–Terry–Luce（BTL）选择模型、策略约束与 logistic / cross-entropy loss 结合得非常自然。

但“自然”不等于“唯一”。论文把问题拆成三层：

| 层次 | 要回答的问题 | 标准 DPO 的默认选择 |
|---|---|---|
| 规范层 | 什么样的选择行为算作合理、可解释？ | 一套具有 BTL 味道的成对选择结构 |
| 观测层 | 潜在效用差异怎样变成选择概率？ | sigmoid / Bradley–Terry link |
| 优化层 | 预测选择概率时怎样计算代价？ | log-loss 及其对应的凸分析形式 |

论文的主张是：只要满足相应的规范条件，这三层可以有更大的组合自由度。DPO 是这个空间中很成功、很方便的一点，但不是整张地图。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/03.png' | relative_url }}" alt="五句话概览 DPO Unchained 的核心结论" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / 五句答案</p>

## 五句话先交付答案

1. 偏好标签只告诉我们 A 胜过 B，却没有告诉我们人为什么选 A。
2. 标准 DPO 把策略相对 reference 的变化、人的选择规律和训练损失绑定成一套固定组合。
3. 作者证明这三块可以拆开重组，而 `properness` 是共同底线：真实选择概率是多少，诚实预测多少就应最划算。
4. 使用框架时，要先说明长度、位置或弃权怎样影响选择，再挑合适的选择规律和训练损失。
5. 所以论文给的是 DPO 的设计地图，不会自动识别偏好原因，也没有证明某条新 loss 一定更好。

后面的卡片不是重复这五句话，而是分别回答五个容易被压缩掉的问题：DPO 公式中到底有几块、`70%` 到底说明了什么、properness 在数学上约束什么、论文允许哪些扩展，以及最后哪些结论仍然不能从论文中推出。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/04.png' | relative_url }}" alt="标准 DPO 公式中的策略分差、选择 link 与训练 loss" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / 标准 DPO</p>

## 一个公式，藏着三种选择

标准 DPO 常写成：

$$
\mathcal L_{\mathrm{DPO}}
=-\log\sigma\!\left(\beta\left[
\log\frac{\pi_\theta(y_w|x)}{\pi_{\mathrm{ref}}(y_w|x)}
-\log\frac{\pi_\theta(y_l|x)}{\pi_{\mathrm{ref}}(y_l|x)}
\right]\right).
$$

读这个公式时，可以先不急着推导梯度，而是把它拆成三块：

- **策略相对 reference 的分差**：当前策略提高了胜者、降低了败者多少，而且不是无限制地偏离 reference。
- **选择 link**：`sigmoid` / BTL 把分差解释为“胜者被选中的概率”。分差越大，概率越高，但通常不会直接变成 100%。
- **训练计分**：负 log 把概率预测转换成训练代价。模型低估被选答案时，代价会变大。

论文的更一般写法用三个相互独立的对象表达这个结构：一个 proper loss 产生策略或 reward 的分析差异，一个严格递增的函数 $F$ 把效用差映射为选择概率，另一个严格 proper 的二元损失负责最终的概率拟合。标准 DPO 是一个 canonical、对称、log-loss 的特殊连接。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/05.png' | relative_url }}" alt="A 短且先展示、B 长且后展示的选择标签案例" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / 可识别性</p>

## `70% 选 A`，仍然没有告诉我们为什么

贯穿视频的教学案例是：同一道题的 A、B 都正确；A 约 40 字并先展示，B 约 120 字并后展示；70% 的标注者选择 A。

这条统计结果只说明：在大量相似比较中，A 的经验选择率大约是 70%。它至少有四种解释：

1. 标注者真的更喜欢 A 的内容或表达；
2. 标注者更喜欢简短答案；
3. 先展示的一侧具有位置优势；
4. 不同标注者有不同的效用函数，70% 只是混合后的平均结果。

如果直接把这个标签喂给 DPO，模型仍然可以把它拟合得很好，但被拟合的可能是“短答案 + 先出现”的组合，而不是我们以为的“内容更好”。这就是可识别性问题：单个二元标签通常不足以恢复潜在选择机制。

因此，偏好训练之前的实验设计不是附属工作。随机交换位置、按长度差分组、记录标注者群体和允许无差别选择，都是在增加能够区分这些解释的信息。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/06.png' | relative_url }}" alt="策略距离、人的选择规律与训练计分三块可审计零件" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / 三层框架</p>

## 作者把 DPO 拆成三个可审计零件

把论文翻译成工程团队容易检查的语言，大致可以得到三个问题：

| 零件 | 它控制什么 | 如果没有单独写清楚，会发生什么 |
|---|---|---|
| 策略距离 | 当前策略离 reference policy 多远，偏离要付出什么代价 | 把“保持原能力”与“追逐偏好”混成一个不可见的权衡 |
| 人的选择规律 | 答案差异、位置、长度或其他因素怎样变成选择概率 | 把 BTL 误当成真实的人类偏好语义 |
| 训练计分 | 概率预测错了之后应付出多大代价 | 只比较最终分数，不知道模型是否在诚实拟合概率 |

论文在规范层引入了比普通 BTL 更一般的局部选择结构。它允许某些选项之间可比较，另一些选项之间可能不可比较；这为 `abstention` 提供了理论位置。重点不是“任何组合都自动有效”，而是不同组合可以在各自满足条件时被单独分析、再重新接起来。

这也是“DPO 是地图上的一个点”的准确含义：不是说标准 DPO 错了，而是说它把三种设计选择一次性固定下来，使用者往往忘记了这些选择本来是可以被审计的。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/07.png' | relative_url }}" alt="proper loss 与 properness 用真实选择率 70% 解释" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Properness</p>

## `proper loss` 不是一句“做人要诚实”

令真实的选择分布为 $p$，模型报告的分布为 $q$，损失为 $L(p,q)$。`proper` 的条件是：

$$
L(p,q)\ge L(p,p),
$$

也就是说，在真实分布固定时，报告真实分布不会比报告一个错误分布更吃亏。若只有在 $q=p$ 时才能达到最小值，就是 `strictly proper`。

用视频里的案例说，若 A 的真实选择率是 70%，长期报告 50% 会过于保守，报告 90% 会过于自信；在 proper 的计分规则下，诚实报告 70% 才是期望代价最低的选择。

论文的数学桥梁是：proper loss 的 regret，也就是“错误报告比诚实报告多付出的代价”，可以表示为一个 Bregman divergence。对 DPO 来说，常见的 log-loss 对应 KL 形式的散度；这解释了为什么 reference policy 约束和概率预测的规范要求能够在同一个分析框架中相遇。

这里还要保留一个容易被口播抹平的细节：论文的主定理放宽了对最终 $ψ$ 的凸性要求，但仍要求它保持严格递增等条件。于是“允许非凸”不等于“任意奇怪的 loss 都安全”，更不等于实际优化一定稳定。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/08.png' | relative_url }}" alt="从诊断选择机制到 properness 验收的四步使用流程" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / 使用框架</p>

## 正确顺序：先问机制，再选工具

如果把论文转成一条训练设计流程，建议按下面四步走：

1. **诊断选择机制**：长度是否影响选择？展示位置是否有优势？某些答案是否其实不可比较？不同标注者群体是否共享一个效用函数？
2. **选择观测模型**：决定用哪种选择概率 link，是否需要 margin、位置项、长度修正或分群模型。
3. **选择策略约束与训练 loss**：分别确定 reference policy 的角色、策略距离的度量，以及概率预测错误的惩罚。
4. **用 properness 验收**：在已知或可估计的选择率上，检查诚实概率是否确实最划算；同时做校准、分组和反事实位置测试。

这条顺序的价值在于，它把“数据有偏”与“优化器不够强”分开。若位置交换后优势跟着位置走，继续加大 DPO 的训练量并不能修复数据生成机制；应该先改变比较协议或显式加入位置项。

在实际项目中，第 4 步还要加上任务指标、分布外评测和安全回归。`properness` 只保证概率预测的规范性质，不保证回答内容本身正确，更不保证模型学到了我们想要的原因。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/09.png' | relative_url }}" alt="长度修正、位置优势或 margin、abstention 三类扩展" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / 框架能容纳什么</p>

## 长度、位置与弃权不是临时外挂

论文明确讨论了三类常见变化：

- **Home advantage / margin**：如果比较左侧、默认项或先展示的一方总有固定优势，可以在 link 或损失的输入中加入 slack，例如 $ψ(z-\gamma)$。它不是把偏差神奇地消除，而是把“存在固定位置偏移”写成显式建模假设。
- **Length normalization / correction**：自回归模型的序列概率是 token 概率的乘积，长答案天然累积更多 log-probability 项。长度修正改变的是策略概率的分析表示，使回答层面的选择不被 token 数量悄悄支配。
- **Abstention**：如果两个答案在当前标注协议下不可可靠比较，可以允许“不选 A，也不选 B”。论文的局部选择结构把它解释为局部不可比，而不是简单增加一个对所有比较都生效的全局 outside option。

三者的共同点是：它们都应该在选择机制层面被说明，再进入公式，而不是训练后看到偏差才随手加一个系数。

尤其是弃权，它表达的是“这一次比较没有足够信息”而不是“两个答案都低于某个全局质量门槛”。这两者在数据收集和后续训练中的含义不同，不能混用。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/10.png' | relative_url }}" alt="用随机位置、长度分组与 properness 验收完整审计一个 A B 案例" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / 完整实践</p>

## 从一条标签开始，下一步不能直接训练

还是 A 约 40 字、B 约 120 字、A 先展示且 70% 被选中的案例。一个最小审计可以这样做：

| 步骤 | 操作 | 读什么结果 |
|---|---|---|
| 1 | 随机交换 A/B 的展示位置 | 优势是否随位置移动 |
| 2 | 在相同位置下按长度差接近、差异大分组 | 短答案优势是否只在长度差大时出现 |
| 3 | 记录“无法判断”的比例 | 是否需要 abstention，而不是强迫二选一 |
| 4 | 确认机制后再做位置校正或长度修正 | 修正项是否只改变目标因素 |
| 5 | 用 proper loss 检查选择概率校准 | 真实 70% 是否对应诚实预测 70% |

这是依据论文框架组合的教学示例，不是论文报告的大模型实验。它的作用是示范“怎样从观测结果逐步增加信息”，而不是给出某个固定的 DPO 超参数。

实际实验还应记录标注者身份或群体、题目难度、答案是否都满足任务约束、比较顺序、长度统计和弃权原因。否则即使位置与长度都控制住了，群体异质性仍可能被一个平均选择率掩盖。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/11.png' | relative_url }}" alt="论文贡献与证据边界的对照" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / 证据边界</p>

## 论文给了地图，但没有替你选路线

论文真正给出的东西包括：

- 一个把社会选择理论、概率 choice model 与偏好优化连接起来的规范框架；
- 对策略距离、选择 link、最终训练损失之间组合自由度的刻画；
- 对 proper loss、Bregman regret、非凸但满足条件的训练形式的分析；
- 对 home advantage、margin、length normalization 和 abstention 的统一容纳方式；
- 一个 toy experiment，说明设计空间中确实存在偏离标准 DPO 的可探索位置。

论文没有给出的东西也同样重要：

- 一条 `A > B` 标签不能自动识别群体偏好、安全偏好或长度偏好；
- toy experiment 不能证明某条新 loss 在真实大模型上全面优于 DPO；
- 允许非凸不等于已经解决了非凸训练的稳定性、样本效率和部署收益；
- 理论上的规范性成立，不等于训练数据没有噪声，也不等于模型学到了因果意义上的“为什么”。

所以最稳妥的结论是：这是一篇关于设计空间和建模边界的论文，不是一张“换成某个新 loss 就必然更强”的配方表。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/dpo-unchained/images/12.png' | relative_url }}" alt="从偏好标签到可审计设计地图的五句回收" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / 回收</p>

## 最后把五句话串成一张设计地图

从 `A > B` 出发，先承认它只是结果；再把标准 DPO 中的策略差异、人的选择规律和训练计分拆开；用 properness 保证概率预测不鼓励系统性歪报；用位置、长度、群体和弃权实验识别选择机制；最后才决定怎样训练。

这条路径把偏好优化从“套一个熟悉公式”变成“先写清楚假设，再选择工具”。DPO 仍然是一个很有价值的默认点，但当任务中存在长度偏置、展示顺序、不可比较样本或多群体选择时，默认点不应该伪装成自然法则。

> **记忆点：** 看到一条 `A > B`，先问“人为什么这样选？”；确认机制以后，再问“模型应该怎样学？”
</div>
</section>

## 更详细的理解：论文真正重写了哪条推导链？

### 1. 从“DPO 推导”退回到“规范选择”

通常讲 DPO 时，叙事会从 RLHF 的 reward model 开始：人类给出偏好，Bradley–Terry 把 reward 差映射成选择概率，再通过 reference policy 消去显式 reward，最后得到 logistic loss。这条推导非常适合教学，但它容易让人以为 BTL、reference 校正和 log-loss 是一整套不可拆的定理。

这篇论文的逆向动作是：把推导中每个“顺手使用”的对象重新命名，并追问它承担的是哪一种职责。

| 推导中的对象 | 更准确的角色 | 可替换性 |
|---|---|---|
| reward / policy difference | 由策略与 reference 产生的分析分差 | 可以由不同 proper loss 的散度结构支撑 |
| sigmoid / BTL | 从效用差到选择概率的 link | 可以换成满足条件的单调 choice function |
| logistic / cross-entropy | 对选择概率进行评分的 proper loss | 可以扩展到其他 proper 形式，最终 $ψ$ 不必凸 |

论文因此不是单纯提出“另一个 DPO loss”，而是在规范层面证明：这三类对象可以在满足条件时被重新组合。这里的“规范”不是道德判断，而是对一个学习系统施加“真实选择分布应当是期望损失最优点”的约束。

### 2. 为什么 properness 会连接到 Bregman divergence？

在多类概率预测里，properness 说的是：真实分布 $p$ 作为目标时，报告 $q=p$ 最划算。把错误报告相对真实报告的额外代价写成 regret：

$$
R(p,q)=L(p,q)-L(p,p),
$$

很多 proper loss 的 regret 可以用 Bregman divergence 表示。Bregman divergence 不一定对称，也不一定是距离，但它有一个关键性质：在目标点 $p$ 处达到最小值。这正好提供了 reference policy 约束所需要的“偏离代价”结构。

在 DPO 的特殊选择里，这个结构退化到熟悉的 KL / log-loss 组合，所以工程上很容易把“reference 不要偏太远”与“胜者概率要提高”写进同一个目标。论文的贡献是说明：这种连接不是 log-loss 独占的；只要选择满足 properness 的构造，其他散度形式也可以成为规范底座。

但要区分两个层次：

- **规范成立**：真实分布在期望损失下是最优报告；
- **训练好用**：在有限样本、深度网络和非凸优化下，收敛、校准和泛化都可接受。

论文主要解决第一层。第二层仍然需要实验和工程验证。

### 3. Local Choice Structure 为什么比“加一个 reject 类”更细？

标准 BTL 默认两边的选择概率加起来为 1，因此每次比较都必须选一边。现实中有些比较并不是“二选一但都不够好”，而是两个答案在当前维度下根本不可比，或者标注者没有足够信息判断。

论文通过 lotteries 和局部图结构表达这一点：有些节点之间存在 zero-abstention 的边，表示比较时一定在两者中选一个；另一些节点之间没有这条边，于是选择概率可以留下 abstention 的空间。局部结构的含义是，“是否能比较”取决于这对选项及其上下文，而不是给所有答案统一加一个全局 outside option。

这个差别会影响数据设计：

1. 若是全局质量不足，应该研究 outside option 或任务阈值；
2. 若是局部不可比，应该记录比较失败及其原因；
3. 若强迫二选一，模型会把“没有足够信息”误学成“B 比 A 差”。

因此 `abstention` 既是一个 choice model 选项，也是一个数据质量信号。

## 从论文到训练：一套可复用的分析流程

下面是把本次视频制作中的 claim map、原文深读和证据边界整理成的复用版流程。它适合分析后训练论文，也适合审阅一条看似简单的 reward 结论。

### 第一步：先写“标签能观察到什么”

不要一上来写“人类偏好奖励”。先列出原始观测：二元选择、排序、数值评分、拒答、比较顺序、标注者群体、答案长度，以及是否有重复标注。若只有 `A > B`，就明确承认原因未被观测。

### 第二步：把公式按职责拆解

对每个公式问三个问题：

- 哪一部分描述策略离 reference 的距离？
- 哪一部分把潜在差异变成选择概率？
- 哪一部分把概率错误变成训练代价？

如果同一个符号同时承担两种职责，就要警惕它是否把建模假设隐藏起来。视频里的三色箭头就是这个检查动作的视觉化版本。

### 第三步：做最小反事实实验

针对最可能的混杂因素，一次只改一个条件：交换展示位置、匹配答案长度、改变标注者群体、加入允许弃权的选项。实验的目标不是先把分数做高，而是让不同潜在解释产生不同可观察预测。

### 第四步：单独选择 choice model 与 training loss

确认选择机制后，再选择 link 和训练损失。不要因为 logistic 形式熟悉，就默认 BTL 解释了一切；也不要因为某个新 loss 的 toy 曲线更好，就跳过 properness、单调性、校准和分布外测试。

### 第五步：把论文结论和工程推论分层

本页明确把以下内容分开：

- **论文直接结论**：规范框架、可组合性、properness、可容纳的扩展、toy experiment 的范围；
- **教学化解释**：A/B 40 字与 120 字、70% 选择率；
- **工程推论**：随机交换位置、按长度分组、记录弃权、加入校准验收；
- **尚未证明的假设**：真实大模型上的收益、非凸优化稳定性、从标签自动恢复群体语义。

这一步很重要，因为“根据框架设计的实践建议”不能倒写成“论文已经在真实系统中验证了这套流程”。

### 第六步：最后才决定是否训练

如果数据审计显示优势主要来自位置，先修比较协议；如果优势来自长度，先做长度建模或数据匹配；如果存在大量不可比样本，考虑 abstention；如果选择率可预测但模型概率不校准，再检查 proper loss 和训练实现。训练是流程的最后一环，不是解释缺失的替代品。

## 论文地图上的几个“容易误读点”

### “不要求凸”不等于“非凸一定更好”

论文说明在它的规范框架下，最终训练形式不必被凸性绑死，toy experiment 也展示了非凸形式可能带来探索空间。但这只是“可以研究”，不是“应该默认使用”。在真实大模型上仍需看优化稳定性、梯度尺度、随机种子、数据效率和长尾行为。

### “BTL 只是一个选择模型”不等于“选择模型无关紧要”

论文解除的是强制绑定，不是取消建模责任。若真实标注过程有位置优势、长度偏好、群体异质性或不可比较情况，选错 link 依然会把混杂吸收到隐式 reward 中。

### “properness 保证诚实”不等于“模型理解了原因”

properness 约束的是概率报告的最优性：真实选择率是多少，报告多少最划算。它不告诉我们为什么这个选择率是 70%，也不能仅凭最终概率区分内容质量、长度偏好和位置偏差。

### “可以重组”不等于“每种重组都经过大规模实证”

理论上的可组合性扩大了设计空间，实验上的有效性还要逐个验证。尤其是把论文中的框架迁移到真实 Agent、工具调用或安全偏好时，比较协议、奖励可验证性和部署成本都会引入新的变量。

## 最终结论

这篇论文最值得带走的不是一个新公式，而是一种检查习惯：看到偏好训练目标时，不要只问“loss 怎么写”，还要问“选择是怎么产生的”“reference 扮演什么角色”“概率如何被评分”“哪些原因其实没有被观测”。

DPO 仍然可以是很好的默认方案；但当默认方案被用于新的任务、标注协议或输出形态时，最好把它当成地图上的一个点，先确认自己到底需要哪条路线。

> **最后的问题：** 看到一条 `A > B` 的标签时，你会先检查答案长度、展示位置，还是标注者群体？如果只能先做一个实验，哪个反事实最能区分你的假设？

## 资料与制作边界

- 本页保留视频 run 中整理出的 12 张卡片与文本内容，原始视频文件不纳入站点。
- 论文原文：以 [OpenReview](https://openreview.net/forum?id=j4c3i3a5kH)、[arXiv](https://arxiv.org/abs/2507.07855) 为准。
- 本文的 `A/B` 数字案例用于解释选择机制，不冒充论文实验；论文的 toy experiment 也不被改写成真实大模型 SOTA 结论。
- 本文新增的审计流程是基于论文框架的工程化整理，意在帮助读者设计反事实比较和训练验收，不是论文作者给出的唯一实施方案。
