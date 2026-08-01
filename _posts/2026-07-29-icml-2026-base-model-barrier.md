---
layout: post
title: "ICML 2026：RL 为什么会撞上 Base Model Barrier？"
date: 2026-07-29 09:00:00 +0800
summary: "从基础策略覆盖、Likelihood Quantile 和过程奖励出发，解释为什么长任务的强化学习可能先卡在采样而不是优化，以及如何用 token 级反馈缓解序列长度灾难。"
tags: [ICML 2026, LLM Post-training, Reinforcement Learning, Policy Gradient, Base Model Barrier, Likelihood Quantile, Process Reward, Credit Assignment, Agent]
category: LLM Post-training
cover: /assets/posts/icml-2026-base-model-barrier/images/01.png
body_class: video-notes-post
series: icml-2026-agent-posttraining
---

# RL 学不会，问题可能不在优化器

长链推理或 Agent 任务训不动时，人们很容易把问题归因于 PPO、GRPO 的更新方式、batch size、KL 系数，或者 rollout 数量不够。但在更新发生之前，还有一道更早的门槛：**当前策略能不能采到任何可被奖励的正确轨迹？**

ICML 2026 Spotlight 论文 [Post-Training with Policy Gradients: Optimality and the Base Model Barrier](https://openreview.net/forum?id=nnWlTi7A7a) 把这道门槛写进了策略梯度的奖励查询复杂度。它研究的不是“哪一种 RL 优化器最好”，而是：给定基础模型、序列长度和可分条件，要查询多少次奖励，才能把正确序列的概率推到接近 1？

> **全文主线：** Outcome reward 只能放大已经采到的完整成功。基础覆盖不足时，训练首先卡在探索；process reward 则把一次罕见的序列级联合成功，拆成多个可观察的局部正确事件。

论文信息：[OpenReview](https://openreview.net/forum?id=nnWlTi7A7a) · [ICML 页面](https://icml.cc/virtual/2026/poster/61683) · [arXiv](https://arxiv.org/abs/2603.06957) · 作者 Alireza Mousavi-Hosseini、Murat A. Erdogdu。

本文按视频的 13 张场景卡展开。与论文原文直接对应的定义、定理、算法和实验放在正文；教学化简、Agent 工程推论、局限与延伸讨论统一标明性质，并在文末附录集中展开。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/01.png' | relative_url }}" alt="RL 学不会时先检查基础覆盖，而不只是更换优化器" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / 反常识问题</p>

## 再强的优化器，也放大不了采不到的答案

策略梯度的基本链路是“采样—验证—更新”。模型先生成一条轨迹，奖励器判断它是否成功，训练再提高高奖励轨迹的概率。如果所有 rollout 都得到 0，优化器看到的不是“差一点”和“差很多”，而是一批无法区分的失败。

卡片里的五步例子用于建立直觉：若每一步独立成功概率都是 20%，完整成功概率只有

$$
0.2^5=0.00032=0.032\%.
$$

这意味着平均约 3125 次尝试才会出现一次完整成功。它不是对真实 Transformer 的精确概率模型，但准确暴露了长任务的结构性风险：只看终点时，局部正确必须在同一次 rollout 中全部相遇，才会产生正信号。

因此，训练诊断不应从“换 PPO 还是 GRPO”直接开始，而要先问两个更基础的问题：正确轨迹在当前策略下是否可见？即使终点尚未成功，中间进展是否可被奖励器识别？
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/02.png' | relative_url }}" alt="基础策略生成正确完整序列的初始概率 alpha" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / Base Model Barrier</p>

## RL 可能先卡在采样，而不是更新

论文用 $\alpha$ 表示行为策略在训练开始时生成正确完整序列的概率。对一个具体样本 $(x,y^*(x))$，可以把它直观理解为

$$
\alpha \approx q\!\left(y^*(x)\mid x\right),
$$

其中 $q$ 是用于采样的基础策略。$\alpha$ 足够大时，训练能够持续看到正样本并放大它；$\alpha$ 接近 0 时，大量预算会消耗在等待第一次有用反馈上。

“支持集内”和“支持集外”在本文中不是绝对的零与非零，而是计算意义上的区分。论文把正确响应概率至多只随序列长度多项式缩小的样本视为有非平凡覆盖；若基础策略在该样本上并不明显优于均匀策略，正确序列概率可能约为 $k^{-N}$，查询代价便会随长度指数增长。

这就是 Base Model Barrier：策略梯度可以高效地锐化基础模型已经覆盖的答案，但要把几乎不可见的完整序列从概率尾部捞出来，首先受到探索与反馈可见性的限制。

论文把这个直觉写成两个量：$\alpha$ 看**单道题的正确答案有多容易被采到**，$\pi_\alpha$ 看**整个测试集中有多少题达到这一覆盖水平**。单题容易采到、但只有极少数题满足，整体误差仍然降不下去。

> **先记结论：** $alpha$ 决定每一道已覆盖题的学习速度，$\pi_\alpha$ 决定这种学习能惠及多少题。下一步引入 LQ，就是为了把两者合并成一张覆盖分布图。

<details markdown="1">
<summary>展开：条件收敛公式怎样表达这件事</summary>

令 $E_\alpha$ 表示训练过程中行为策略对该样本正确序列的概率至少为 $\alpha$，$\pi_\alpha=\Pr(E_\alpha)$。带自适应学习率的 PG-OR 满足

$$
\mathbb E\!\left[p_{w_\tau}(y^*(x)\mid x)\mid E_\alpha\right]
\ge 1-\widetilde{\mathcal O}\!\left(
\frac{1}{\pi_\alpha\alpha\gamma^2T}
\right).
$$

分母里的 $\alpha$ 越小，等待成功样本越久；$\pi_\alpha$ 越小，满足这一覆盖水平的题越少；训练步数 $T$ 越大，剩余误差项越小。
</details>
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/03.png' | relative_url }}" alt="Base Model Barrier 论文身份与研究问题" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / 论文问题</p>

## 论文追问的不是分数，而是奖励要查多少次

论文研究长度为 $N$ 的离散响应 $y\in\mathcal Y^N$，并在线性自回归模型与序列 $\gamma$-margin 条件下分析策略梯度。目标是把正确响应 $y^*(x)$ 的生成概率提高到至少 $1-\varepsilon$。

它分别回答两个层次的问题：

1. 对单个样本，如果基础模型已有非平凡似然，PG 需要多少次迭代才能把它推高？
2. 对整个测试分布，如果一部分样本落在低覆盖尾部，整体期望误差能否继续有效下降？

这里的核心计量是 **reward query（奖励查询）**：一次采样结果被交给奖励器或验证器并获得反馈。它既不等同于一次梯度更新，也不能直接换算为一次 GPU step。论文分析的是理论查询与迭代复杂度，而不是生产训练账单。

作者证明：在满足条件的样本上，带自适应学习率的策略梯度可以达到近 minimax 最优；真正形成屏障的是跨越基础模型支持范围时，低覆盖样本如何支配整体误差。

作者选择线性自回归模型，是为了同时保留“逐 token 生成”的结构和可证明的查询复杂度。每个 token 的分数可以写成参数与特征的内积；$\gamma$-margin 则保证在正确前缀下，正确 token 的线性分数稳定领先所有错误 token。这样，“模型会不会”被转换为可分析的几何间隔，同时仍保留序列长度 $N$ 带来的组合困难。

固定学习率的界会显式多出一个 $N$ 因子，因为完整序列的梯度范数会随长度变化。作者让学习率随当前梯度大小自动缩放：梯度大时走小步，梯度小时走大一些。目的不是增加一个新技巧，而是先排除“学习率没有随长度适配”造成的假瓶颈。

<details markdown="1">
<summary>展开：论文使用的自适应学习率</summary>

$$
\eta_t=\left(4+2\left\|\nabla\log p_{w_t}
(y^{(t)}\mid x^{(t)})\right\|^2\right)^{-1},
$$

它消掉由参数化和序列长度造成的非必要因子，使后面的指数困难更明确地归因于基础覆盖，而不是学习率选择。
</details>
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/04.png' | relative_url }}" alt="终点奖励无法区分接近成功和很早失败的轨迹" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / Outcome Reward</p>

## 终点奖励把所有中间进展压成同一个零

Outcome reward model（ORM）只检查完整响应：

$$
r(x,y)=\mathbf 1[y=y^*(x)].
$$

在这个定义下，前四步正确、最后一步错误的轨迹得 0；第一步就偏离的轨迹也得 0。只要完整成功尚未出现，两条轨迹就没有可被奖励区分的信号。

对应的基础更新可以写成

$$
w_{t+1}=w_t+\eta_t r_t\nabla\log p_{w_t}(y^{(t)}\mid x^{(t)}).
$$

当 $r_t=0$ 时，这次采样不会提供正向强化。实际 PPO、GRPO 会引入基线、分组相对优势、重要性权重或裁剪，但这些设计不能凭空制造一个从未被采样、也从未被验证为正确的终点。

论文故意从无 baseline 的简单 REINFORCE 更新开始，并不是声称实际训练不需要 baseline，而是为了隔离“奖励是否出现”这一变量。只靠论文的 margin 假设时，作者证明更复杂的 advantage estimator 不能改善最坏查询率；因此如果最简单更新已经达到 minimax 量级，剩余的指数困难就不能轻易归因于 baseline 设计。

行为策略 $q_t$ 与被更新策略 $p_{w_t}$ 也被刻意分开。完全 on-policy 时二者相同；off-policy 时，标准无偏 PG 需要乘重要性比率 $p_{w_t}/q_t$，PPO 通常裁剪这个比率。论文主文去掉重要性权重以获得最优理论率，附录说明若比率被限制在 $[1/\zeta,\zeta]$，收敛率会多一个 $\zeta^2$ 因子。裁剪可以控制更新，却没有改变“零奖励样本没有正向信息”这一根问题。

因此，终点奖励的局限不在于它“不正确”，而在于观测粒度太粗：它适合答案可稳定验证、完整成功并不罕见的任务；在长序列和低覆盖区域，信用分配会被首次完整命中的等待时间卡住。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/05.png' | relative_url }}" alt="序列长度增加时完整成功概率按 p 的 N 次方下降" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / 长度灾难</p>

## 任务越长，完整成功可能消失得越快

用每步独立成功概率 $p$ 的教学模型，长度为 $N$ 的完整成功概率为

$$
\alpha=p^N.
$$

只要 $p<1$，序列级覆盖就会随 $N$ 指数下降。论文中的更严格结论不依赖这一个教学假设：当响应空间每个位置有 $k$ 个选择、基础策略接近均匀时，正确完整序列的概率是 $k^{-N}$。Outcome reward 为了跨越这种支持集外区域，最坏情形需要指数级奖励查询。

这也解释了为什么“多加一些 rollout”只在有限范围内有效。如果 $\alpha=10^{-2}$，扩大采样可能很快看到正样本；如果 $\alpha$ 已经像 $k^{-N}$ 一样小，预算增长几个常数倍并不会改变问题尺度。

更关键的是，序列长度不是唯一变量。基础模型是否掌握局部原语、正确答案在不同 prompt 群体中的分布、奖励器是否能看到中间状态，都会共同决定可用信号何时出现。

论文用均匀策略给出最干净的基线：若每个位置有 $k$ 个候选 token，长度为 $N$ 的唯一正确响应只有

$$
q_{\mathrm{unif}}(y^*\mid x)=k^{-N}.
$$

例如 $k=32,N=128$ 时，这已经远远小于任何可实际等待的 rollout 比例。作者把“非平凡似然”设为至多随 $N$ 多项式缩小，正是为了区分可计算探索与指数彩票，而不是任意指定一个固定概率阈值。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/06.png' | relative_url }}" alt="Likelihood Quantile 用于观察低覆盖尾部" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / Likelihood Quantile</p>

## 别只看平均值，要看有多少样本掉进尾部

平均正确似然可能被少数容易样本抬高。假设 10% 的题目概率接近 1，而其余题目接近 0，平均值看起来仍然非零，但大多数任务实际上没有可用的成功轨迹。

![十个样本按正确答案似然排序，用尾部比例读取 LQ]({{ '/assets/posts/icml-2026-base-model-barrier/images/15-likelihood-quantile-example.png' | relative_url }})

先看一个不需要公式的例子。把 10 道题按正确答案似然从低到高排列，允许最低的 20% 暂时不达标，也就是 $\varepsilon=20\%$。从第 3 道题开始，其余 80% 的题正确似然都不低于 0.08，那么这一分位上的 $\alpha$ 就约为 0.08。LQ 做的事情，就是用“尾部占比”换取“其余样本的最低覆盖门槛”。

> **只记一句：** 平均值问“总体看起来多好”，LQ 问“最差的一批题到底差到什么程度”。

论文为基础策略 $q$ 定义 Likelihood Quantile（LQ）：

$$
Q_q(\varepsilon)=\sup\left\{\alpha\in[0,1]:
\Pr_x\!\left(q(y^*(x)\mid x)\le \alpha\right)\le\varepsilon\right\}.
$$

它可以读作：忽略最低的 $\varepsilon$ 比例样本后，其余样本的正确序列似然至少能达到多大的阈值。固定 $\varepsilon$ 时，$Q_q(\varepsilon)$ 越大，说明低覆盖尾部越轻；若它接近 $k^{-N}$，整体训练会被几乎不可见的样本拖住。

LQ 比单个平均数更适合描述训练分布的异质性。它把“模型总体还行”拆成可操作的问题：究竟有多大比例的 prompt，其正确答案在基础策略下几乎不可采样？这些 prompt 需要先补覆盖，而不是继续共享同一套 outcome rollout 预算。

LQ 与前一节的 $\pi_\alpha$ 正好是两个观察方向。$1-\pi_\alpha=\Pr(q(y^*\mid x)<\alpha)$ 是似然随机变量的 CDF：固定概率阈值 $\alpha$，问低于阈值的样本有多少；$Q_q(\varepsilon)$ 则是它的广义逆：固定可容忍尾部比例 $\varepsilon$，问其余样本至少有多大似然。

这也是论文 Figure 2 的阅读方式。左图画不同预训练步数下的 likelihood CDF，曲线越向右，说明更多样本获得了较高正确似然；右图把同一信息改写为 LQ，固定 $\varepsilon$ 向上读，预训练越充分，$Q_q(\varepsilon)$ 越接近 1。作者设计 LQ 的目的，就是把一张“覆盖分布图”接入最终目标误差 $\varepsilon$。

在整体测试误差上，LQ 会直接进入训练成本：目标误差越小，就必须处理越靠近尾部的样本；对应分位的正确似然越低，查询越贵。

<details markdown="1">
<summary>展开：Corollary 4 的整体迭代复杂度</summary>

$$
T=\widetilde{\mathcal O}\!\left(
\frac{\min\!\left\{
Q_{q_0}((1-o(1))\varepsilon)^{-1},\,k^N
\right\}}
{\gamma^2\varepsilon}
\right).
$$

这里取最小值，是因为行为策略使用 $q=\tfrac12q_0+\tfrac12\mathrm{Unif}$：基础模型覆盖好时依赖它的 LQ；覆盖极差时，均匀探索至少提供 $k^{-N}$ 的保底支持。混入均匀策略并没有消灭指数项，它只保证任何序列都不是严格零概率。
</details>

这条公式完成第二座桥：条件定理说“给定 $\alpha$ 的样本可以学”；LQ 把所有样本的 $\alpha$ 排序；整体界再选择达到目标误差 $\varepsilon$ 时必须处理到的那个分位点。Base Model Barrier 因而不是一句泛泛的“预训练很重要”，而是尾部覆盖如何进入最终查询成本的精确路径。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/07.png' | relative_url }}" alt="奖励查询复杂度中的 alpha epsilon gamma" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / 查询复杂度</p>

## 先理解三个原始量，再理解为什么成本取倒数

论文摘要给出的核心量级是

$$
\widetilde{\mathcal O}\!\left(
\frac{\alpha^{-1}+\varepsilon^{-1}}{\gamma^2}
\right).
$$

三个量分别对应三种瓶颈：

| 变量 | 原始含义 | 越大/越小意味着什么 | 成本来源 |
|---|---|---|---|
| $\alpha$ | 基础策略生成正确完整序列的初始概率 | 越大，成功越容易被采到 | $1/\alpha$ 是等待成功的代价 |
| $\varepsilon$ | 训练后允许保留的目标误差 | 越小，目标越严格 | $1/\varepsilon$ 是继续压低余错的代价 |
| $\gamma$ | 正确 token 相对错误项的线性可分 margin | 越大，对错越容易分 | 小 margin 使成本按 $1/\gamma^2$ 放大 |

![alpha、epsilon 与 gamma 分别对应覆盖、余错和可分间隔]({{ '/assets/posts/icml-2026-base-model-barrier/images/14-alpha-epsilon-gamma.png' | relative_url }})

可以把三者想成三道关：

- **$\alpha$ 是入口有没有样本。** 若 100 次 rollout 大约出现 10 次完整成功，$\alpha$ 可粗略理解为 0.1；若一万次都没有，当前 outcome reward 很难提供正样本。
- **$\varepsilon$ 是出口要求多严格。** $\varepsilon=0.05$ 表示目标正确似然至少达到 95%；从 90% 压到 95%，与从 10% 提到 15% 不是同一种难度。
- **$\gamma$ 是正确方向有多容易认。** 正确 token 得分 0.7、最强错误 token 得分 0.5，间隔为 0.2；它描述分数差，不是 20% 正确率。

> **读公式的方法：** 先看哪个量的倒数最大，哪个通常就是当前主要瓶颈。$\alpha$ 太小先补覆盖，$\varepsilon$ 太小代表目标本身很严，$\gamma$ 太小则表示对错难以稳定分开。

$\gamma$ 是线性分数间隔，不是正确率。例如在正确前缀下，正确 token 得分 0.7、最强错误 token 得分 0.5，则示意 margin 为 0.2。它表示正确方向在参数空间中的领先幅度。

还要区分两个容易混淆的记号：$Q_q(\varepsilon)^{-1}$ 是分位数值的倒数，而 $Q_q^{-1}(\cdot)$ 是分位函数的逆。论文特别区分了二者，不能把前者误读成“求逆函数”。

摘要公式表达的是“基础似然不低于 $\alpha$ 的样本，达到正确似然 $1-\varepsilon$ 所需的奖励查询量级”。论文还把 PG 迭代数与同一 context 内部的多次奖励查询分开计算：best-of-$m$ 可以少换一些题，但仍可能在每道题里尝试很多候选。

<details markdown="1">
<summary>展开：迭代数与 best-of-m 查询数</summary>

$$
T=\widetilde{\mathcal O}\!\left(\frac{1}{\gamma^2\varepsilon}\right),
$$

而每轮若使用 best-of-$m$ 探索，奖励查询总数为

$$
Q=\widetilde{\mathcal O}\!\left(
\frac{m+\varepsilon^{-1}}{\gamma^2}
\right),
\qquad
m=\min\!\left\{
\left\lceil Q_{q_0}((1-o(1))\varepsilon)^{-1}\right\rceil,k^N
\right\}.
$$

为什么要拆开？一次训练迭代可以在同一个 context 上查询多个候选响应。Best-of-$m$ 能减少需要多少个不同 context 和 PG 更新，但低 LQ 会把每轮内部的查询数 $m$ 推高。因此，“迭代数不再指数”不等于“探索成本不再指数”；屏障只是从外层迭代搬到了内层奖励查询。
</details>
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/08.png' | relative_url }}" alt="把 alpha 从百分之一提高到百分之十降低理论查询主项" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / 教学 Case</p>

## 只补基础覆盖，查询主项也能从 3000 降到 750

固定目标误差 $\varepsilon=0.05$ 和 margin $\gamma=0.2$，只把基础正确序列概率从 $\alpha=0.01$ 提高到 $0.1$。忽略常数与对数项：

$$
\frac{100+20}{0.2^2}=3000,
\qquad
\frac{10+20}{0.2^2}=750.
$$

结果不是下降十倍，而是约降到四分之一。原因是只有 $\alpha^{-1}$ 从 100 降到 10，$\varepsilon^{-1}=20$ 与 $\gamma^2=0.04$ 都保持不变。

这个控制变量例子说明：如果瓶颈确实是基础覆盖，先用更针对性的数据、mid-training、SFT 或轨迹构造提高 $\alpha$，可能比直接追加同等规模的稀疏奖励查询更有效。

它也解释了作者为什么不只说“把 $\alpha$ 提高十倍，成本就降低十倍”。公式中覆盖困难与目标精度困难是相加后再共同除以 $\gamma^2$：覆盖改善之后，$\varepsilon^{-1}$ 可能成为新的主导项。训练系统的瓶颈会移动，因此每次补数据后都应重新测量覆盖，而不是永久沿用第一次的预算配比。

但这里的 3000 与 750 是理论主项的教学代入，不是可直接采购的 GPU 小时，也不意味着任何现实模型都能通过一种固定训练手段把 $\alpha$ 精确提高十倍。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/09.png' | relative_url }}" alt="过程奖励把一条 rollout 转换为 token 级信用分配" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / Process Reward</p>

## 一条 rollout，怎样变成 token 级梯度

论文假设有一个准确的 0/1 过程验证器。对每个前缀，它返回

$$
r^*(x,y_{1:i})=\mathbf 1[y_{1:i}=y^*_{1:i}(x)].
$$

若一条五 token 轨迹的前缀奖励为 $[1,1,1,0,0]$，就表示前三个前缀正确，第四个 token 首次出错；从这一位置起，完整前缀不再等于标准前缀，因此奖励保持为 0。

论文采用一个非常直接的优势：$A_i=r_i$，并优化

$$
\ell_t(w)=-\sum_{i=1}^{N}A_i^{(t)}
\log p_w\!\left(y_i^{(t)}\mid x^{(t)},y_{1:i-1}^{(t)}\right).
$$

于是，$A_i=1$ 的正确前缀 token 会被增强；首错及其后的位置不会获得正向强化。它没有把任务拆成多个互不相关的小任务，而是在**同一条完整 rollout** 中查询并利用每一个前缀的正确性。

这一改变的实质是观测粒度：ORM 只能等待完整联合事件，PRM 则能学习当前轨迹中最长的正确前缀。代价是需要更细粒度、足够可靠的过程验证。

### 为什么不用累计 return？

常见做法会令第 $i$ 步优势等于后续奖励和 $\sum_{j\ge i}r_j$。论文却直接取 $A_i=r_i$，因为它只需要回答“当前前缀是否仍然完全正确”。这种局部权重已经足以达到理论最优率，而且不会把后续多个正确前缀的数量重复累计到更早 token 上。设计目的不是拟合所有现实 PRM，而是构造最小充分的信用信号，证明观测粒度本身就能改变复杂度尺度。

![终点奖励等待整条成功，过程奖励利用正确前缀]({{ '/assets/posts/icml-2026-base-model-barrier/images/16-sequence-vs-token-reward.png' | relative_url }})

图里的核心不是“过程奖励改变了最终答案”，而是**同一个最终目标被更早观察**。左边第四步失败，整条轨迹只留下一个 0；右边虽然同样没有完成终点，前三个正确前缀仍留下 $[1,1,1]$ 三个可学习信号。

用一个极简规模例子：若每步有 $k=4$ 个候选、序列长 $N=5$，盲猜完整序列面对的是 $4^5=1024$ 种组合；若准确验证器允许逐步确认正确 token，局部搜索尺度更像 $5\times4=20$。这只是帮助理解 $k^N$ 与 $Nk$ 的差异，不是论文查询界的精确数值替代。

### Token-level LQ 为什么是正确的替代量？

过程奖励不再要求基础模型一次生成完整答案，只要求它在正确前缀条件下能采到下一个正确 token。对均匀策略，完整序列覆盖是 $k^{-N}$，单个位置的覆盖则是 $k^{-1}$。一条序列仍可能存在某个特别难的 token，所以论文取所有位置中的最小条件概率。

<details markdown="1">
<summary>展开：Token-level LQ 的正式定义</summary>

$$
Q_q^{\mathrm{TL}}(\varepsilon)=\sup\left\{\alpha:
\Pr_x\!\left(
\min_{i\in[N]}q(y_i^*(x)\mid x,y_{1:i-1}^*(x))\le\alpha
\right)\le\varepsilon\right\}.
$$

式中的 $\min_i$ 很重要：一条序列只要存在一个几乎不可采样的关键 token，就会成为局部瓶颈。对均匀策略，整体 LQ 是 $k^{-N}$，token-level LQ 却是 $k^{-1}$；这正是从指数长度依赖过渡到线性长度依赖的桥。
</details>

Algorithm 2 也围绕这一定义设计：先让当前策略生成完整响应；若失败，则沿序列逐位置推进，在每个正确前缀上最多从 $\tfrac12q_0+\tfrac12\mathrm{Unif}$ 采样 $m$ 次，找到通过局部验证的下一个 token。它不是假设完整标准答案已直接给训练器，而是用过程查询逐步恢复一条可学习轨迹。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/10.png' | relative_url }}" alt="论文 Figure 1 中 outcome reward 与 process reward 的差异" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / 论文证据</p>

## 同样使用策略梯度，为什么 PRM 能继续改善

论文 Figure 1 在合成的线性自回归模型上比较 ORM 与 PRM。实验使用 $N=128$、$d=k=32$；基础模型先以 Adagrad 训练 1000 步，随后进行 4000 步 on-policy PG。作者把基础模型似然低于 $10^{-12}$ 的 mixture center 定义为 off-support，共有 4 个中心满足条件。

结果有三层：

- 在这些 off-support 样本上，ORM 的平均正确似然停留在 0 附近，PRM 则能把它逐步提高；
- ORM 的整体测试误差在某个阈值进入平台，PRM 继续下降；
- 对单个样本观察时，初始似然接近 0 的轨迹在 ORM 下继续贴近 0，而初始似然更高的样本会随 PG 改善。

对应原论文 Figure 1，三幅子图要这样读：左图横轴是对数尺度的 PG step，纵轴是 4 个 off-support center 的平均正确似然，橙色 PRM 曲线离开 0，而黑色 ORM 基本贴底；中图横轴仍是 PG step，纵轴是测试误差，ORM 下降后形成平台，PRM 继续下降；右图不再比较两种奖励，而是画 ORM 下单个 center 的“初始似然—训练中似然”轨迹，颜色编码初始覆盖，显示高初始似然样本先改善、近零样本被留在原地。

作者选择这三幅图并列，是为了分别验证三段论证：**局部 off-support 能否被救起、整体误差能否跨过平台、差异是否确实由初始覆盖解释**。只看中间的测试误差曲线，容易把平台误判成学习率或优化器问题；左右两图把平台重新连接到 $\alpha$ 与支持集。

理论上，过程奖励把整体 LQ 换成 token-level LQ。均匀策略的整体正确序列似然是 $k^{-N}$，而每个正确 token 在正确前缀条件下的概率是 $k^{-1}$，后者不再随 $N$ 指数恶化。论文给出的最坏查询依赖也由 $k^N$ 改善到线性的 $Nk$ 量级（仍有 $\gamma$、$\varepsilon$ 与对数项）。

更直观地说，ORM 的最坏探索规模像 $k^N$，PRM 在准确逐步验证下把它改成沿 $N$ 个位置分别搜索，每个位置最多看 $k$ 个候选，因此核心长度依赖像 $Nk$。

<details markdown="1">
<summary>展开：Theorem 6 的完整查询界</summary>

$$
Q=\widetilde{\mathcal O}\!\left(
\frac{N\min\!\left\{
Q_{q_0}^{\mathrm{TL}}((1-o(1))\varepsilon)^{-1},k
\right\}}{\gamma^2}
+\frac{1}{\gamma^2\varepsilon}
\right),
$$

同时只需 $T=\widetilde{\mathcal O}(1/(\gamma^2\varepsilon))$ 次迭代。第一项是沿 $N$ 个位置寻找可验证正确 token 的代价，第二项是把最终误差压到 $\varepsilon$ 的学习代价。PRM 没有让训练免费，而是把“等待一次完整彩票”改成“逐位置支付局部搜索成本”。
</details>

论文还给出 ORM 下的 minimax 下界与预训练 LQ 下界。其含义是：若标注样本不足，任何预训练算法都不能普遍把低分位覆盖从 $k^{-N}$ 提高到多项式量级；若标注已经多到足以做到这件事，SGD 基础模型本身的测试误差也已接近目标 $\varepsilon$。这排除了两种简单解释：屏障既不是 PG 分析太松，也不只是 SGD 预训练不够聪明。

这组结果支持的是论文设定中的机制差异，不是“PRM 在任何真实大模型、任何任务上都优于 ORM”的通用排行榜。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/11.png' | relative_url }}" alt="从 token 级过程奖励延伸到 Agent 中间状态的工程设想" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / 工程推论</p>

## 潜力机制：让 Agent 的中间状态可学习

论文直接证明的是 token 级过程奖励与 token-level LQ。向现实 Agent 迁移一步，可以提出一个工程假设：把局部反馈点放在规划步骤、对话 turn、工具调用或环境状态上，让“搜索命中正确文档”“参数校验通过”“数据库状态按预期更新”等中间进展提前可见。

这个方向与论文机制一致，但**不是论文已经验证的现实 Agent 结论**。现实轨迹通常没有唯一标准前缀；两个不同工具序列可能同样正确，局部动作也可能只有在后续状态出现后才能判断。因此，不能把论文中的精确 0/1 前缀验证器直接等同于一个通用 process reward model。

更细的反馈还会放大监督质量问题。若局部验证器存在系统偏差，稀疏的错误奖励会被变成密集的错误梯度。工程上必须同时记录反馈来源、置信度、可逆性和最终结果一致性。具体设计建议放在文末附录 C。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/12.png' | relative_url }}" alt="覆盖信号更新三层训练诊断顺序" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / 诊断顺序</p>

## 先查覆盖，再查信号，最后比较更新方法

把论文的机制转成训练排查流程，可以分成三层：

1. **覆盖层**：测量正确完整序列或正确局部行为在当前策略下是否可采样。若 $\alpha$ 或 LQ 太低，优先补数据、mid-training、SFT、检索上下文或可达示范轨迹。
2. **信号层**：若局部能力存在，但完整成功因长链组合而稀疏，增加可靠的步骤、turn、状态或约束验证；同时审计过程奖励与最终目标是否一致。
3. **更新层**：当成功可见、反馈可辨、样本覆盖足够后，再比较 PPO、GRPO、重要性裁剪、优势估计和 KL 约束等更新设计。

这不是论文直接比较出的三阶段生产算法，而是从其理论机制推导出的诊断框架。它的价值在于隔离变量：覆盖不足时继续调优化器，反馈太粗时继续加 outcome rollout，都可能把预算花在错误层级。

实际使用时，应按 prompt 群或任务族而不是只看全局平均。一个训练集可能同时包含“覆盖足够但更新不稳”“有局部能力但终点过稀疏”“正确轨迹几乎不可见”三类样本，它们不应共享同一种补救动作。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-base-model-barrier/images/13.png' | relative_url }}" alt="先让成功可见再通过强化学习放大" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">13 / 结论</p>

## 先让成功可见，再把它放大

Base Model Barrier 改变的是排查顺序。模型学不会时，先问正确轨迹是否存在于可计算的采样范围；再问中间进展是否能被可靠观察；最后才问更新公式是否足够高效。

Outcome reward 并没有失效。对基础覆盖良好、完整答案容易验证的样本，它可以高效放大正确序列，论文中的 PG 变体甚至达到近 minimax 最优。问题出现在希望继续降低整体误差、必须处理低覆盖尾部时：LQ 开始支配奖励查询成本，长序列让完整成功变成罕见事件。

Process reward 的关键价值也不是“多给几个分”，而是改变可学习事件的尺度。它让正确前缀在终点成功之前就产生信号，从序列级覆盖转向 token 级覆盖。真正应该优化的，不只是一次更新怎样走得更远，而是训练预算是否落在了当前系统的真实瓶颈上。
</div>
</section>

---

## 附录 A：论文结论的适用边界

这篇论文提供的是一个清晰、可证明的理论模型。将它用于现实 LLM 时，需要保留以下边界：

- 模型是线性自回归模型，响应满足序列 margin / 可分假设；现实语言任务通常存在多解、噪声标签和不可分区域。
- 过程奖励假设为准确的 0/1 前缀验证；现实 PRM 往往需要学习，并可能受到 reward hacking、标注偏差与分布外失真的影响。
- 查询复杂度描述奖励或验证器调用量，不等价于 GPU 小时、训练 FLOPs 或线上延迟。
- Figure 1 使用合成 mixture 数据，不能直接外推成所有 Transformer 与 Agent 任务的定量结论。
- 论文证明算法在其设定中接近 minimax 最优。这意味着当瓶颈来自覆盖时，仅更换同类优化器未必能改变最坏尺度；但不意味着现实 PPO、GRPO 的工程差异不重要。

论文留下的开放问题包括：如何高效学习可靠的过程奖励，如何处理 noisy、non-separable 响应，以及如何把理论 LQ 连接到现实基础模型的覆盖估计。

## 附录 B：两个教学计算到底说明什么

### B.1 五步各 20%

$0.2^5=0.00032$ 说明局部成功的乘法组合会迅速压低完整轨迹概率。独立性只是教学化简；现实步骤相关性、回溯、工具重试和上下文纠错都会改变数值，但不会取消“完整联合事件比局部事件更稀疏”这一结构。

### B.2 $\alpha$ 从 1% 提高到 10%

在 $\varepsilon=0.05$、$\gamma=0.2$ 固定时，查询主项从 3000 降到 750，说明补覆盖与追加反馈不是等价动作。它没有证明 mid-training 必然是提高 $\alpha$ 的最佳方法，只说明一旦能提高基础覆盖，理论查询负担会显著下降。

## 附录 C：从 token 过程奖励到 Agent 状态反馈

下面是受论文启发的工程讨论，不属于论文已验证结果。

| 局部反馈点 | 可验证信号示例 | 主要风险 |
|---|---|---|
| 规划步骤 | 前置条件满足、依赖顺序合法 | 多条合法计划被误判为唯一标准路径 |
| 对话 turn | 约束已确认、歧义已消除 | 形式完整不等于任务方向正确 |
| 工具调用 | schema 校验、权限检查、返回码 | 工具成功不等于业务目标成功 |
| 环境状态 | 文件存在、测试通过、记录已更新 | 局部状态正确但产生延迟副作用 |
| 最终结果 | 用户目标、验收测试、外部 verifier | 信号可靠但出现太晚，信用分配仍稀疏 |

一个更稳妥的 Agent 过程奖励系统应满足四点：局部信号能被独立验证；允许多条等价路径；局部奖励与终点目标做一致性校验；低置信反馈不直接产生高权重梯度。换句话说，过程奖励首先是一项验证系统设计问题，然后才是一项优化问题。

## 附录 D：复现信息与继续阅读

论文 Figure 1 的公开实现位于 [mousavih/rlvr-base-model-barrier](https://github.com/mousavih/rlvr-base-model-barrier)。原文实验的关键配置包括：线性自回归模型，$N=128$、$d=k=32$；基础模型使用 Adagrad、学习率 0.1、batch size 256 训练 1000 步；PG 使用 Adagrad、学习率 0.1、batch size 1024 训练 4000 步。

在本系列中，上一篇 [ICML 2026：Pre-Training、Mid-Training 与 RL 如何划定推理能力边缘]({% post_url 2026-07-28-icml-2026-pre-mid-rl %}) 从控制实验说明“能力边缘”在哪里；本文从奖励查询复杂度解释为什么边缘之外会变贵。两篇合起来得到一个更完整的判断：`pass@k` 或基础似然告诉我们成功是否已经可采样，过程反馈决定这些偶发的局部成功能否在完整终点出现前进入学习信号。
