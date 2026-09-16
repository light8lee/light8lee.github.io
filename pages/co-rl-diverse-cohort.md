---
layout: post
title: "Co-RL：多智能体 RL 如何把群体差异变成无监督 Reward"
date: 2026-09-16 22:07:00 +0800
description: "详细解读 Co-RL：以错误不完全相关的模型群体互相产生 Reward，让无监督 Reasoning RL 获得新的监督来源。"
category: "RL / 后训练"
tags: [Co-RL, Multi-Agent, RL, 后训练, Reasoning, Diversity]
cover: /assets/pages/co-rl/images/01-cover.png
permalink: /pages/co-rl-diverse-cohort.html
---
<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/01-cover.png" alt="Co-RL 图文 01：群体差异成为无监督推理的监督来源" loading="lazy">
  <figcaption>01 / 总览：差异成为监督</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
# Co-RL：Unsupervised Reasoning Emerges from Diverse Cohort in Multi-agent RL 详细解读

## 1. 核心结论与问题背景

### 1.1 先说结论：没有标准答案时，Reward 从哪里来？

这篇论文最值得记住的，不是"又做了一个 Multi-Agent
框架"，而是它试图回答一个更基础的问题：

> **当没有 Ground Truth、没有 Reward Model、也不想依赖额外 LLM Judge
> 时，Reasoning 模型还能不能继续通过强化学习自我进化？**

Co-RL 的答案非常直接：

> **可以。不要再让一个模型给自己打分，而是让一群"错误不完全相关"的模型互相产生
> Reward。**

过去 Self-RL 的核心风险是：**模型既当学生，又当裁判。**
如果模型一开始就"自信地错"，Self-Reward 会不断强化自己的错误，最后形成
self-reinforcing feedback loop。

Co-RL 的关键改动看起来只有一步：

``` text
Self-RL：
我的多数答案 → 监督我自己

Co-RL：
你的多数答案 → 监督我
我的多数答案 → 监督你
```

但这一步真正引入的是一个新的监督来源：

**Diversity —— 模型之间不完全相关的错误。**

因此，这篇论文最核心的观点可以进一步压缩成：

$$
\boxed{\text{Self Signal} \rightarrow \text{Independent Peer Signal}}
$$

它不是假设"另一个模型一定比我更强"，而是利用：

> **另一个模型和我犯错的方式不完全一样。**

两个模型即使平均准确率相同，只要各自擅长的问题不同、错误集合不同，就可能互相纠错。论文把这种机制扩展到不同模型家族、不同
Prompt 表述、多个 Agent 以及 VLM，并发现 Co-RL 在多个实验中显著超过
Self-Reward 方法，在部分设置下甚至匹配或超过使用 Ground Truth Reward
的参考训练。

所以，阅读整篇论文时可以抓住一条主线：

> **Co-RL 不是在寻找一个更强的
> Teacher，而是在尝试证明：模型群体内部的"差异"本身，就可能成为一种监督资源。**

下面分五个问题展开：

1.  为什么 Self-RL 会遇到根本瓶颈？
2.  Co-RL 到底如何让 Agent 互相产生 Reward？
3.  为什么 Diversity / Error Decorrelation 是整个方法成立的核心？
4.  实验上到底提升了多少，是否真的优于已有方法？
5.  这套机制距离真正的自主 AI 群体学习还有哪些问题？

### 1.2 核心问题：Ground Truth 是 RL Scaling 的瓶颈

近年来 Reasoning 模型取得明显进步，一个重要技术路径是
**RLVR（Reinforcement Learning with Verifiable Rewards）**。

例如一道数学题，模型经过 reasoning 后输出最终答案 42。如果我们事先知道
Ground Truth 就是 42，那么 reward 很容易定义：

$$
r =
\begin{cases}
1, & \text{if } answer = 42 \\
0, & \text{otherwise}
\end{cases}
$$

随后可以利用 GRPO 等强化学习方法，强化得到正确答案的 trajectory。

DeepSeekMath、DeepSeek-R1 等工作证明了这种范式的有效性。

但它存在一个根本限制：

**训练系统必须事先知道什么是正确答案。**

对于数学题、代码题，可以依靠标准答案、测试用例等自动验证；但当任务变成：

-   设计一个更好的算法；
-   证明一个尚未解决的数学问题中的新结论；
-   分析专家也无法确定的复杂科学问题；
-   解决超出当前人类可靠评估能力的任务；

就会出现一个越来越严重的问题：

> **谁来提供 Verifiable Reward？**

Co-RL 将这一问题视为未来 RL Scaling
的关键瓶颈之一：随着模型能力提高，高质量 Ground Truth supervision
会越来越昂贵、越来越稀缺。

因此，一个自然问题出现了：

> **能不能完全不依赖 Ground Truth，让模型体系自己产生训练 Reward？**

这就是 Co-RL 所处的研究背景。

### 1.3 既有路线：监督 Reward 与 Self-Reward

#### 1.3.1 RLVR / GRPO：直接使用 Ground Truth

最直接的方法是使用标准答案：

-   正确：reward = 1
-   错误：reward = 0

优点是信号可靠。

缺点是需要标签或可验证环境。

#### 1.3.2 TTRL：用自己的 Majority Vote 当伪标签

TTRL 是 Co-RL 非常重要的前驱。

对于一道没有 Ground Truth 的题，让模型生成多次 rollout。

例如：

``` text
12 次 rollout：

答案 37：8 次
答案 42：4 次
```

TTRL 会认为：

> 37 是模型当前的 majority answer，因此把 37 当成 pseudo-label。

然后：

-   输出 37 的 rollout 得到正 reward；
-   输出其他答案的 rollout 得到低 reward。

这实现了不使用真实标签的 self-training。

但问题也非常明显：

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/02-self-rl-loop.png" alt="Co-RL 图文 02：Self-RL 可能强化错误多数意见" loading="lazy">
  <figcaption>02 / Self-RL 的自我强化循环</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
### 如果模型的多数意见本来就是错的怎么办？

假设真实答案其实是 42：

``` text
第一次：

37：8
42：4
```

模型把 37 当成正确答案进行强化。

训练之后可能变成：

``` text
37：10
42：2
```

继续强化之后：

``` text
37：12
42：0
```

结果是：

> **模型越来越一致，却越来越错。**

这就是 self-rewarding 中典型的 **self-reinforcing feedback loop**。

Co-RL 的理论分析指出，self-rewarding 更新具有明显的 self-confirming
特性：

> 模型当前更偏向哪个答案，训练就会继续强化哪个答案，而这一过程并不天然知道该答案是否真实正确。

#### 1.3.3 Intuitor / RENT：用 Confidence 或 Entropy 代替正确性

**Intuitor：Confidence Reward**

另一种思路是：

> 模型越自信，reward 越高。

问题在于：

**Confidence 并不等于 correctness。**

模型完全可能非常自信地输出错误答案。

如果把 confidence 直接作为训练信号，可能进一步强化这种错误确定性。

**RENT：Entropy Reward**

类似地，也可以利用输出 entropy：

-   entropy 低 → 模型更确定；
-   entropy 高 → 模型更不确定。

然后偏向强化低 entropy trajectory。

问题仍然类似：

> **确定地错依然是错。**

#### 1.3.4 Co-rewarding：用同一模型的不同 View 互相监督

Co-rewarding 进一步发现：

单一 self-view 很容易发生 collapse，因此可以制造第二个 view，例如：

``` text
原始问题
↕
同一道题的改写版本
```

或者：

``` text
Current Model
↕
EMA / Slowly Updated Teacher
```

这样可以避免模型完全直接给自己打分。

这是一个重要进步。

但 Co-RL 作者认为仍然存在一个问题：

> 两个 view 最终仍然来自高度相关的 model
> lineage，因此它们的错误可能高度相关。

#### 1.3.5 CoMAS：Multi-Agent 交互后由 LLM Judge 打分

Multi-Agent RL 还存在另一条路线：

``` text
Agent 1
Agent 2
Agent 3
   ↓
interaction / debate
   ↓
LLM Judge
   ↓
reward
```

Agent 可以互相讨论，但最终仍然需要一个额外 Judge 判断 interaction
或答案质量。

因此监督来源仍然没有完全消失。

## 2. Co-RL 方法：如何把群体差异变成 Reward

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/03-peer-signal.png" alt="Co-RL 图文 03：独立 Peer Signal" loading="lazy">
  <figcaption>03 / 从 Self Signal 到 Peer Signal</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
### 2.1 核心创新：从 Self Signal 到 Independent Peer Signal

Co-RL 的核心改动可以压缩成一句话。

TTRL：

> **我的多数答案监督我自己。**

Co-RL：

> **你的多数答案监督我，我的多数答案监督你。**

这个改变看起来很小，但从根本上改变了 reward 的统计性质。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/04-training-flow.png" alt="Co-RL 图文 04：双 Agent 的训练流程" loading="lazy">
  <figcaption>04 / 双 Agent 训练流程</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
### 2.2 双 Agent 的训练流程

#### 2.2.1 分别生成 Rollouts

对于同一个没有标签的问题 (x)：

Agent A 生成 (K) 个 reasoning rollouts。

Agent B 也生成 (K) 个 reasoning rollouts。

例如：

``` text
Agent A：
A1
A2
A3
...
AK

Agent B：
B1
B2
B3
...
BK
```

#### 2.2.2 各自做 Majority Vote

A 的 K 个答案进行 majority vote：

$$
\hat{a}_A
$$

B 的 K 个答案进行 majority vote：

$$
\hat{a}_B
$$

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/05-reward-definition.png" alt="Co-RL 图文 05：Cross-Agent Reward 的定义" loading="lazy">
  <figcaption>05 / Cross-Agent Reward</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
#### 2.2.3 用对方 Majority 作为 Pseudo-Label

这是整个方法最关键的一步。

A **不用自己的 majority answer 给自己打分**。

A 使用 B 的 majority answer：

$$
\hat{a}_B
$$

作为自己的 pseudo-label。

同理，B 使用：

$$
\hat{a}_A
$$

作为监督。

#### 2.2.4 计算 Cross-Agent Reward

对于 A 的第 $k$ 个 rollout：

$$
r_A^k = \mathbf{1}\!\left[a_A^k = \hat{a}_B\right]
$$

也就是：

-   如果 A 的 rollout 最终答案与 B 的 majority answer 相同，reward = 1；
-   否则 reward = 0。

B 反过来也一样。

#### 2.2.5 独立完成 RL 更新

A 使用这些 reward 更新自己的参数。

B 使用另一组 reward 更新自己的参数。

两者：

-   不共享 parameters；
-   不共享 gradients；
-   optimizer 独立；
-   唯一的信息交换就是 pseudo reward / pseudo-label。

因此 Co-RL 并不是传统意义上的"Agent 互相聊天"。

它真正做的是：

> **Cross-Agent Training Signal Generation。**

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/06-error-diversity.png" alt="Co-RL 图文 06：Error Decorrelation 与 Diversity" loading="lazy">
  <figcaption>06 / 错误去相关</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
### 2.3 为什么 Peer 有用：关键是 Error Decorrelation

Co-RL 并不假设：

> "另一个模型一定比我聪明。"

它真正依赖的是：

> **另一个模型和我犯的错误不完全相同。**

这一区别极其重要。

假设两个模型 accuracy 都是 60%。

如果：

``` text
A 错题：1、2、3、4
B 错题：1、2、3、4
```

两个人虽然是两个模型，但错误完全重合。

B 几乎无法为 A 提供额外信息。

但如果：

``` text
A 错题：1、2、3、4
B 错题：5、6、7、8
```

那么虽然两个人总体 accuracy 完全一样，它们却具有很强的互补性。

B 可以纠正 A 不擅长的问题。

A 也可以纠正 B 不擅长的问题。

因此整篇论文真正深层的核心不是简单的 Multi-Agent，而是：

**Error Decorrelation —— 错误去相关。**

换句话说：

> **一个 Cohort
> 的价值，并不只取决于成员平均有多聪明，更取决于它们是否以不同方式犯错。**

### 2.4 如何主动制造 Diversity

#### 2.4.1 Optimization Diversity

两个 Agent 分别维护：

``` text
Agent A
parameters θA
optimizer A

Agent B
parameters θB
optimizer B
```

它们没有：

-   参数共享；
-   gradient exchange；
-   optimizer state 共享。

唯一交流的是 pseudo reward。

即使两个 Agent 从相同 Base Model 初始化，它们的 optimization trajectory
也会逐渐产生差异。

#### 2.4.2 Model Diversity

进一步，作者直接使用不同模型家族，例如：

``` text
Qwen2.5-3B
    ↕
Llama-3.2-3B
```

不同模型之间可能存在：

-   tokenizer 差异；
-   pretraining corpus 差异；
-   architecture 差异；
-   post-training 差异；
-   inductive bias 差异。

因此错误模式更容易产生差异。

在 VLM 中这种区别更加明显。

例如不同模型可能使用不同视觉编码器：

-   Qwen2.5-VL；
-   InternVL；
-   Gemma / SigLIP 系列。

于是 perception error 和 reasoning error 都可能不一样。

论文实验也观察到：

> **Different-family 模型之间的 error overlap 通常低于 same-family
> 模型。**

#### 2.4.3 Input Diversity

作者进一步认为：

即使模型不同，如果两边看到完全相同的
prompt，仍然可能出现由语言表述导致的 correlated error。

因此让两个 Agent 看到语义相同、表达不同的问题。

例如原始问题：

> 求某个有理函数具有多少条竖直渐近线。

另一个 Agent 可能看到一个保持数学结构不变的情境化版本：

> 某个化学反应的温度变化满足给定有理函数，问其图像有多少条竖直渐近线。

底层数学问题和答案完全相同，但 surface form 不同。

目的仍然是：

> **进一步减少 Prompt Phrasing 导致的 correlated error。**

因此论文最终比较：

``` text
Co-RL Same Family
        ↓
Co-RL Different Family
        ↓
Co-RL Different Family+
        +
Prompt Decoupling
```

### 2.5 和相邻方法的本质区别

#### 2.5.1 与 Co-rewarding：从“另一个 View”到“另一个独立模型”

可以把技术演进概括为：

``` text
Self-Reward
↓
“我教我自己”

Co-rewarding
↓
“我的另一个 View 教我”

Co-RL
↓
“另一个独立模型教我”
```

Co-rewarding 已经意识到：

> 一个模型直接给自己打分容易 collapse。

因此增加第二个 view。

但 Co-RL 更进一步认为：

> 真正关键的是监督来源的独立性，以及错误是否去相关。

于是它从：

``` text
Same Model
Different View
```

进一步走向：

``` text
Different Models
Different Pretrained Weights
Different Tokenizers
Different Architectures
Different Training Trajectories
Different Prompt Formulations
```

所以：

> **独立性和 Error Diversity 才是 Co-RL 认为真正能够改善 self-reward
> collapse 的关键变量。**

#### 2.5.2 与 Multi-Agent Debate：交换的是 Reward，而不是推理过程

传统 Multi-Agent Debate 更像：

``` text
Agent A：
我认为答案是 X，因为……

Agent B：
你的第二步有问题……

Agent A：
那我重新考虑……

Agent C：
我支持 B……
```

协作发生在：

> **Reasoning Token / Natural Language Interaction 层面。**

但 Co-RL 不要求 Agent 阅读彼此的 reasoning。

它们主要交换：

``` text
Majority Answer
↓
Pseudo Reward
```

因此它本质上不是：

> Communication-Based Multi-Agent Reasoning

而是：

> **Cross-Agent Training Signal Generation**

这也是为什么它可以保持相对 lightweight 和 symmetric。

## 3. 理论直觉：A/B、X/Y 与收敛机制

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/07-xy-example.png" alt="Co-RL 图文 07：Agent 与问题类型的 X Y 示例" loading="lazy">
  <figcaption>07 / A-B 与 X-Y</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
### 3.1 先把符号分清：A/B 是 Agent，X/Y 是问题类型

为了避免把“模型”和“问题”混在一起，后文统一规定：

| 符号 | 永远代表什么 |
|---|---|
| **Agent A** | 模型 A，例如 Qwen |
| **Agent B** | 模型 B，例如 Llama |
| **问题类型 X** | Agent A 擅长、Agent B 不擅长的一类问题 |
| **问题类型 Y** | Agent B 擅长、Agent A 不擅长的一类问题 |

因此：

$$
p_A=P(\text{Agent A 在当前问题上答对})
$$

$$
p_B=P(\text{Agent B 在当前问题上答对})
$$

**A/B 的下标始终指 Agent，不代表问题。**

---

### 3.2 “两个 55 分模型”：平均能力相同，但错误结构互补

假设训练集中有两类问题 X 和 Y，各占 50%。现在有两个模型 Agent A 和 Agent B：

| 模型 | X 类问题 | Y 类问题 | 总体平均 |
|---|---:|---:|---:|
| **Agent A** | **90%** | 20% | 55% |
| **Agent B** | 20% | **90%** | 55% |

于是：

$$
Acc_A=(0.9+0.2)/2=55\%
$$

$$
Acc_B=(0.2+0.9)/2=55\%
$$

两者平均都是 55 分，但关键在于：**它们不是在同一批问题上拿到这 55 分。**

X 类问题上，Agent A 强、Agent B 弱；Y 类问题上，Agent B 强、Agent A 弱。也就是说，两者的平均能力相同，但**知识结构和错误结构互补**。

---

### 3.3 Self-RL 与 Co-RL 在互补问题上的差异

#### 3.3.1 Self-RL 为什么很难让弱势 Agent 自救

先只看 **X 类问题**：

$$
P(A\text{ 正确}\mid X)=0.9,\qquad P(B\text{ 正确}\mid X)=0.2
$$

Agent A 如果自己生成 12 个 rollout，majority 大概率正确，因此 Self-Reward 能继续强化正确方向。

但 Agent B 可能生成：

```text
正确答案：2 条
某个错误答案：7 条
其他错误：3 条
```

如果 B 用自己的 majority answer 监督自己，那么错误答案反而获得 reward：

```text
B 自己投票
   ↓
错误答案成为 Majority
   ↓
错误 Rollout 被奖励
   ↓
错误进一步强化
```

所以 Self-RL 的核心风险是：

> **当一个 Agent 在某类问题上已经处于“多数答案大概率错误”的区域时，它很难依靠自己的 Majority Vote 自救。**

---

#### 3.3.2 X 类问题：Agent A 如何帮助 Agent B

还是 X 类问题：

| 模型 | 正确率 |
|---|---:|
| Agent A | **90%** |
| Agent B | 20% |

Co-RL 不让 B 使用自己的 majority answer 给自己打分，而是使用 A 的 majority answer。

```text
Agent A（X 类问题上强）
        ↓
生成多个 Rollout
        ↓
Majority Vote
        ↓
大概率得到正确答案
        ↓
作为 Peer Pseudo-Label
        ↓
给 Agent B 的 Rollout 打 Reward
```

假设 B 的 12 个 rollout 中只有 3 个最终答案正确。虽然它们在 B 自己的采样里属于少数，但 A 的 majority answer 可以把它们识别出来：

```text
B 的 3 条正确 Rollout → Reward = 1
B 的 9 条错误 Rollout → Reward = 0
```

B 随后强化的是**自己生成的正确 trajectory**。

这里必须强调：

> **A 并不是把自己的 reasoning 复制给 B。**

B 不需要看到 A 的完整思维链。A 提供的是一个来自独立 Peer 的训练信号，帮助 B 判断自己哪些 rollout 更值得强化。

---

#### 3.3.3 Y 类问题：监督方向为什么会反过来

Y 类问题上：

| 模型 | 正确率 |
|---|---:|
| Agent A | 20% |
| Agent B | **90%** |

这时 B 更可靠：

```text
Agent B（强）
    ↓
Majority Vote
    ↓
Peer Reward
    ↓
Agent A（弱）
```

所以完整关系是：

```text
X 类问题：
Agent A（90%） ──Reward──→ Agent B（20%）

Y 类问题：
Agent A（20%） ←─Reward── Agent B（90%）
```

因此 Co-RL **不是固定的 A 教 B，也不是固定的 B 教 A**。

A/B 始终只是两个对称的 Agent。对于不同问题，哪个 Agent 的答案更可靠，哪个 Agent 就更可能在统计意义上为另一个 Agent 提供有效监督。

---

#### 3.3.4 为什么不能把 Co-RL 理解成固定 Teacher–Student

传统 Teacher–Student：

```text
Teacher → Student
```

角色固定。

Co-RL：

```text
Agent A ↔ Agent B
```

角色对称。

对于 X 类问题，可能是 A 有效帮助 B；对于 Y 类问题，则可能是 B 有效帮助 A。

因此更准确的描述是：

> **两个独立 Agent 互相提供 pseudo-reward，而有效监督方向会随着具体问题和双方能力结构发生变化。**

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/08-no-router.png" alt="Co-RL 图文 08：原始 Co-RL 不使用 Router" loading="lazy">
  <figcaption>08 / 原始 Co-RL 没有 Router</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
### 3.4 X / Y 是否需要预先筛选？

#### 3.4.1 原始 Co-RL 不做 X/Y 分类，也没有 Router

这里需要特别澄清：

> **X 类问题和 Y 类问题只是为了帮助理解论文理论机制而引入的“分析概念”，并不是 Co-RL 训练流程中真实存在的题目标签。**

也就是说，实际训练时并不会先做：

```text
题目
 ↓
分类器 / Router
 ↓
判断属于 X 还是 Y
 ↓
选择 Agent A 或 Agent B 当 Teacher
```

**原始 Co-RL 没有这个步骤。**

前文之所以定义：

- X 类问题 = Agent A 更擅长、Agent B 更弱的问题；
- Y 类问题 = Agent B 更擅长、Agent A 更弱的问题；

只是为了方便解释“两个模型能力互补”这一理论情形。

---

假设现在来了一道训练题 $q$。

系统事先并不知道：

- 这道题是不是 A 更擅长；
- 还是 B 更擅长；
- 甚至两个人是不是都不会。

它直接让两个 Agent 都做这道题：

```text
                         同一道题 q
                            │
                ┌───────────┴───────────┐
                ↓                       ↓
             Agent A                 Agent B
          rollout × K              rollout × K
                │                       │
         Majority Vote             Majority Vote
                │                       │
             答案 a_A                 答案 a_B
                │                       │
                └────── 双向交叉监督 ────┘
```

随后：

- Agent A 的 majority answer 用来给 Agent B 的 rollout 打 reward；
- Agent B 的 majority answer 用来给 Agent A 的 rollout 打 reward。

所以原始 Co-RL 是一个**对称的 Cross-Agent Reward 机制**。

它并不会先判断：

> “这道题应该由谁当老师？”

---

#### 3.4.2 X / Y 只是事后分析模型能力结构的标签

X / Y 是我们事后观察模型能力结构时，对题目的一个描述。

例如某类题上真实存在：

$$
p_A=0.9
$$

$$
p_B=0.2
$$

其中：

$$
p_A=P(\text{Agent A 在当前问题上答对})
$$

$$
p_B=P(\text{Agent B 在当前问题上答对})
$$

那么为了方便解释，我们可以把这种题称为：

> **X 类问题：A 强、B 弱。**

如果另一类题上：

$$
p_A=0.2,\qquad p_B=0.9
$$

我们可以把它称为：

> **Y 类问题：A 弱、B 强。**

但注意：

> **这只是理论分析者事后给问题贴的标签，不是训练算法实际知道的标签。**

因此，X / Y 更像是：

```text
分析视角中的问题类型
```

而不是：

```text
训练流程中的显式类别
```

---

#### 3.4.3 弱 Agent 会不会反过来把强 Agent 教坏？

会。

这是理解 Co-RL 时非常关键的一点。

假设当前是一道我们事后称作 X 类的问题：

$$
p_A=0.9,\qquad p_B=0.2
$$

直觉上：

```text
Agent A 的 majority
大概率正确
→ 给 B 的监督通常是好监督

Agent B 的 majority
大概率错误
→ 给 A 的监督可能是坏监督
```

于是看起来会发生：

```text
A ──较可靠的 Reward──→ B    ✓
A ←─较不可靠的 Reward── B    ✗
```

也就是说：

> **原始 Co-RL 并不能保证每一次交叉监督都是正确的。**

它也没有一个 Oracle 在每道题上告诉系统：

> “这次只听 A，不要听 B。”

这正是它和显式 Teacher Routing 方法的区别。

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/09-noisy-convergence.png" alt="Co-RL 图文 09：带噪声的双向监督为何仍可能收敛" loading="lazy">
  <figcaption>09 / 有噪声的收敛</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
#### 3.4.4 为什么带噪声的双向监督仍可能有效？

因为 Co-RL 依赖的不是：

> “每一次 Peer Reward 都正确。”

而是：

> **在大量问题、多个 rollout 和持续 RL 更新的统计意义上，Cross-Agent Signal 能否产生净正向作用。**

论文理论分析关心的是这种整体学习动力学。

也就是说，即使：

- 某些题 A 给 B 的信号是错的；
- 某些题 B 给 A 的信号也是错的；

只要两个 Agent 的能力和错误结构满足一定条件，整体系统仍可能朝更正确的区域移动。

这也是为什么论文会分析类似：

$$
p_A+p_B>1
$$

这样的条件。

它并不是说：

> “系统先发现 A 更强，所以让 A 教 B。”

而是在简化理论模型中说明：

> **即使监督是双向的、带噪声的，只要两个 Agent 的联合能力状态落在一定区域，Cross-Agent Learning 仍可能产生正确的收敛趋势。**

---

#### 3.4.5 真正的“按题筛 Teacher”属于 Adaptive Routing

### 原始 Co-RL

原始方法做的是：

```text
所有题
 ↓
A 和 B 都 rollout
 ↓
A 的 majority 给 B Reward
B 的 majority 给 A Reward
 ↓
不显式判断谁更可靠
```

也就是说：

> **固定 Peer，双向互评。**

### 更进一步的 Adaptive Co-RL

如果未来真的想“筛选 X / Y”，就需要引入一个额外机制：

先估计：

$$
P(A\ \text{correct}\mid q)
$$

和：

$$
P(B\ \text{correct}\mid q)
$$

然后动态决定：

```text
如果 A 明显更可靠：
A → B

如果 B 明显更可靠：
B → A

如果两者都不可靠：
不产生 Reward / 找 Agent C

如果两者分歧很大且置信度接近：
增加 rollout / 引入第三个 Peer
```

这时才真正出现：

> **按题选择 Teacher / Adaptive Peer Routing。**

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/10-why-diversity.png" alt="Co-RL 图文 10：Diversity 成为必要条件的原因" loading="lazy">
  <figcaption>10 / 为什么 Diversity 必要</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
### 3.5 收敛直觉：Diversity 与联合能力条件

#### 3.5.1 Diversity 为什么是必要条件

如果两个模型能力结构完全相同：

| 模型 | X 类 | Y 类 |
|---|---:|---:|
| Agent A | 90% | 20% |
| Agent B | 90% | 20% |

那么 Y 类问题上两者都弱，很可能一起产生错误 majority。Co-RL 无法凭空创造正确答案。

但如果：

| 模型 | X 类 | Y 类 |
|---|---:|---:|
| Agent A | **90%** | 20% |
| Agent B | 20% | **90%** |

那么：

```text
X 类：A 会、B 不会 → A 有机会帮助 B
Y 类：B 会、A 不会 → B 有机会帮助 A
```

因此 Co-RL 真正需要的不是单纯增加 Agent 数量，而是：

$$
\text{Complementary Knowledge}
$$

以及：

$$
\text{Low Error Correlation}
$$

也就是 **Error Decorrelation**。

---

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/11-diversity-layers.png" alt="Co-RL 图文 11：Diversity 与联合能力条件" loading="lazy">
  <figcaption>11 / Diversity 的条件层次</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
#### 3.5.2 如何理解 $p_A+p_B>1$

这里：

$$
p_A=P(\text{Agent A 在当前问题上答对})
$$

$$
p_B=P(\text{Agent B 在当前问题上答对})
$$

例如当前某类问题上：

$$
p_A=0.8,\qquad p_B=0.3
$$

B 自己只有 30% 正确率，Self-Reward 的 majority 很可能错误；但 A 有 80% 正确率。

于是：

$$
p_A+p_B=1.1>1
$$

在论文的简化理论模型中，这样的组合仍可能处于 Co-RL 的正确收敛区域。

直觉就是：

> **B 自己弱到无法可靠自救，但 A 足够强，可以通过 Peer Reward 给 B 提供纠错信号。**

这个条件是简化理论模型中的机制解释，不能直接当成现实 LLM 的普遍收敛定理。

---

这里仍然要坚持：

$$
p_A=P(\text{Agent A 在当前问题上答对})
$$

$$
p_B=P(\text{Agent B 在当前问题上答对})
$$

假设某一类问题上：

$$
p_A=0.8,\qquad p_B=0.3
$$

那么：

$$
p_A+p_B=1.1>1
$$

B 自己只有 30% 正确率。

如果 B 只进行 Self-Reward：

```text
30% 正确
→ Majority 更可能错误
→ 强化错误
```

但 Co-RL 中，A 有 80% 的正确概率，因此 A 提供的 Peer Signal 在统计上更有机会帮助 B。

虽然 B 也可能反过来给 A 错误监督，但理论分析关心的是：

> **双向噪声叠加之后，整体更新方向是否仍然存在净正向趋势。**

因此：

$$
p_A+p_B>1
$$

更接近一种：

> **联合能力是否足以让 Cross-Agent Learning 摆脱纯 Self-Confirmation 的条件。**

需要再次强调：

这只是论文简化理论模型里的 mechanism explanation，并不是现实 LLM 中严格、普遍的保证。

---

#### 3.5.3 一句话记住这个理论例子

> **有两个模型 Agent A 和 Agent B，也有两类问题 X 和 Y。两个模型平均都是 55 分，但 A 擅长 X、不擅长 Y；B 恰好相反。Co-RL 利用这种知识互补，让 A 在 X 类问题上帮助 B，让 B 在 Y 类问题上帮助 A。**

因此，Co-RL 的价值不是“找两个平均分更高的模型”，而是：

> **尽量让两个模型不要在同一个地方一起犯错。**

> **X / Y 不是 Co-RL 在训练前筛出来的类别，而只是我们为了描述“谁在这类问题上更强”而引入的分析标签。**

原始 Co-RL 并不知道当前题目属于 X 还是 Y。

它采用的是：

$$
Agent_A \leftrightarrow Agent_B
$$

这种对称、双向、有噪声的 Cross-Agent Reward。

真正的研究问题因此不是：

> “Co-RL 怎么先识别 X 和 Y？”

而是：

> **“既然它根本不知道谁更可靠，为什么这种双向噪声监督在统计上仍然可能产生正向学习？”**

这个问题正好连接到论文的理论收敛分析，也解释了为什么作者后续强调：

- Agent Diversity；
- Interaction Topology；
- Adaptive Supervision；

这些方向的重要性。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/12-experiments.png" alt="Co-RL 图文 12：性能与扩展性实验结果" loading="lazy">
  <figcaption>12 / 实验结果</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
## 4. 实验结果：性能、扩展性与训练稳定性

### 4.1 文本模型：Benchmark 与 3B 结果

作者在多个 reasoning benchmark 上测试，包括：

### 数学

-   GSM8K
-   MATH-500
-   AMC

### 代码

-   HumanEval
-   MBPP
-   LiveCodeBench

### 科学推理

-   GPQA

典型结果如下：

  方法                            Qwen2.5-3B Avg   Llama-3.2-3B Avg
  ----------------------------- ---------------- ------------------
  Base                                      40.7               38.7
  Ground Truth RL                           47.4               43.0
  TTRL                                      47.3               43.1
  RENT                                      44.9               38.6
  Intuitor                                  45.6               39.7
  Co-rewarding-II                           45.6               41.8
  Co-RL Same Family                         48.7               42.7
  Co-RL Different Family                    48.5               43.7
  **Co-RL Different Family+**           **49.3**           **43.9**

对于 Qwen：

``` text
Base       40.7
GT Reward  47.4
TTRL       47.3
Co-RL      49.3
```

也就是说，在这一实验 setting 中：

> **没有使用 Ground Truth 的 Co-RL，最终甚至超过了使用 Ground Truth
> Reward 的参考训练。**

Llama 也出现类似结果：

``` text
Base       38.7
GT Reward  43.0
TTRL       43.1
Co-RL      43.9
```

需要注意：

这并不能推出：

> "Pseudo Reward 普遍优于 Ground Truth。"

更加准确的理解应该是：

> **在论文测试的一些 setting 中，Co-RL 能够匹配甚至超过 GT-Reward
> reference。**

### 4.2 模型规模扩展：7B / 8B 是否仍然有效

答案是有效。

### Qwen2.5-7B

``` text
Base          49.0
TTRL          51.7
最佳 Self-RL  52.8
Co-RL         53.6
GT Reward     54.5
```

### Llama-3.1-8B

``` text
Base          44.7
TTRL          46.1
Co-rewarding  46.6
GT Reward     47.1
Co-RL         47.7
```

在 Llama-3.1-8B 上，Co-RL 再次超过 GT Reward reference。

论文对 text-only 实验的整体总结是：

> 对多个 LLM，七项 benchmark 的平均性能提升约为 **3.0--8.6 个百分点**。

### 4.3 从双 Agent 扩展到 Multi-Agent

#### 4.3.1 三 Agent Reward Ring

作者进一步验证：

Co-RL 并不局限于：

``` text
A ↔ B
```

还可以扩展为多个 Agent。

例如：

``` text
Qwen2.5-3B
     ↓
Llama-3.2-3B
     ↓
Qwen3-1.7B
     ↓
Qwen2.5-3B
```

形成一个 Reward Ring。

三个模型分别提升：

``` text
Qwen2.5-3B    +7.8
Llama-3.2-3B  +6.0
Qwen3-1.7B    +8.2
```

这说明 Co-RL 更接近：

> **一个能够互相产生训练信号的 Model Society。**

而不是传统的：

> 一个固定 Teacher 教一个 Student。

#### 4.3.2 与 CoMAS 的统一协议对比

CoMAS 是一种典型 Multi-Agent RL 思路：

``` text
Agent 1
Agent 2
Agent 3
   ↓
Debate / Interaction
   ↓
LLM Judge
   ↓
Reward
```

问题是：

> 系统仍然需要额外 Judge。

而 Co-RL：

``` text
Agent A ↔ Agent B
```

不需要：

-   Ground Truth；
-   Reward Model；
-   External LLM Judge。

论文在统一实验协议中的结果：

  方法                Avg
  ----------- -----------
  Base              56.92
  MAPoRL            58.22
  TTRL              58.18
  CoMAS             58.94
  **Co-RL**     **62.97**

Co-RL 相比 CoMAS 高约 **4 个百分点**。

作者同时强调，该设置使用的 Agent 数量更少，而且不需要额外 Judge。

### 4.4 VLM：跨模态 Diversity 是否同样有效

作者进一步在 Vision-Language Model 上验证 Co-RL。

例如：

-   Qwen2.5-VL
-   InternVL3.5
-   Gemma-3

这非常重要，因为不同 VLM 不仅语言 backbone 不同，视觉编码器和 perception
bias 也可能不同。

因此：

> Error Diversity 可能更加明显。

实验结果：

  Model               Base    TTRL       Co-RL   GT Reward
  ---------------- ------- ------- ----------- -----------
  Qwen2.5-VL-7B      43.94   48.88   **51.13**       51.68
  InternVL3.5-8B     48.06   54.16   **54.40**       55.85
  Gemma-3-12B        41.78   44.45   **47.56**       45.17

尤其 Gemma-3-12B：

``` text
Ground Truth RL：45.17
Co-RL：          47.56
```

再次出现 Label-Free 方法超过 supervised reference 的结果。

三个大 VLM 相对 Base 的提升约为：

-   +7.2
-   +6.3
-   +5.8

个百分点。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/13-stability.png" alt="Co-RL 图文 13：训练稳定性与 Reward Variance" loading="lazy">
  <figcaption>13 / 训练稳定性</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
### 4.5 训练动态：Collapse、Reward Variance 与持续差异

#### 4.5.1 Co-RL 是否缓解 Training Collapse

Self-Reward RL 一个重要危险是：

``` text
Model Outputs
      ↓
越来越一致
      ↓
Reward 全部接近
      ↓
Group 内 Reward Variance → 0
      ↓
GRPO 缺乏 Learning Signal
```

一些方法还可能出现 completion length 不断膨胀，例如：

``` text
500
↓
800
↓
1500
↓
3000
↓
Divergence
```

作者比较了：

-   RENT
-   TTRL
-   Intuitor
-   GT-Reward
-   Co-RL

实验观察表明：

> Co-RL 的 reward variance 更稳定，completion length 也相对稳定。

而部分 self-reward 方法出现 reward collapse、长度退化甚至 divergence。

#### 4.5.2 为什么 Agent 不需要最终变得完全一致

Co-RL 训练过程中：

``` text
Inter-Agent Agreement
```

并没有趋近 100%。

也就是说：

> 两个 Agent 最终仍然保持一定差异。

但与此同时：

``` text
Peer Pseudo-Label Accuracy
```

却在持续提高。

这意味着一个非常重要的状态：

> **最理想的 Cohort 并不是所有 Agent
> 最后想得完全一样，而是它们仍然保持不同，同时彼此提供的监督越来越可靠。**

这可能是整篇论文最值得关注的 insight 之一。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/14-limitations.png" alt="Co-RL 图文 14：当前局限" loading="lazy">
  <figcaption>14 / 局限</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
## 5. 局限、未来方向与总体结论

### 5.1 当前方法仍未解决的问题

#### 5.1.1 无法解决“大家一起错”

这是最重要的限制。

如果：

``` text
Agent A → 错误答案 37
Agent B → 错误答案 37
Agent C → 错误答案 37
```

那么 Cross-Agent Supervision 仍然可能强化 37。

所以 Co-RL 并没有凭空创造"绝对正确的 Reward"。

它真正做的是尽量降低：

$$
P(\text{correlated error})
$$

换句话说：

> **Diversity 不是一个辅助技巧，而是方法成立的关键条件。**

#### 5.1.2 Multi-Agent 带来额外计算成本

Co-RL 同时训练多个 Agent。

文本实验中，一道 prompt 会让每个 Agent 生成多条 response，例如 (K=12)。

因此相比单模型 Self-RL：

> 训练 FLOPs 和 rollout 成本自然更高。

作者做了 matched-budget 对比，说明提升不能简单解释成：

> "因为训练了两个模型，所以算力更多。"

即使训练两个 TTRL Agent 再进行 ensemble，仍然不如 Co-RL。

这说明 Cross-Agent Reward 本身确实贡献了额外价值。

#### 5.1.3 Reward 仍偏向可比较的 Final Answer

目前核心 reward 形式仍然是：

$$
\mathbf{1}\!\left[a = \hat{a}\right]
$$

因此特别适合：

-   数学；
-   代码；
-   选择题；
-   可以提取最终答案的 reasoning task。

但如果任务是：

> "写一个更好的商业计划。"

或者：

> "提出一个新的科学假说。"

再或者：

> "设计一个更优雅的软件架构。"

就很难简单定义：

``` text
Answer A == Answer B
```

因此目前 Co-RL 真正充分验证的仍然更接近：

> **Outcome-Verifiable-Style Reasoning，只是在训练阶段不使用真实 Ground
> Truth。**

#### 5.1.4 理论模型仍然高度简化

论文理论分析通常将问题简化成：

``` text
Correct
vs
Incorrect
```

现实 LLM 的输出空间远比这个复杂。

模型可能存在：

-   多种错误答案；
-   多种 reasoning mode；
-   partial correctness；
-   format errors；
-   hallucination；
-   correlated semantic mistakes。

因此：

$$
p_A+p_B\>1
$$

是一个非常漂亮的 mechanism explanation。

但不能简单理解成：

> "现实中的两个 LLM 只要 accuracy 相加大于 1，就一定收敛。"

它更像是在简化模型中揭示：

> Cross-Agent Supervision 为什么可能扩大正确解的 convergence basin。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/15-adaptive.png" alt="Co-RL 图文 15：从固定 Peer 到自适应 Cohort" loading="lazy">
  <figcaption>15 / Adaptive Co-RL</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
### 5.2 作者展望：从固定 Peer 走向自适应 Cohort

#### 5.2.1 Agent 数量与 Diversity 应该一起研究

现在验证了：

``` text
2 Agents
3 Agents
```

未来需要回答：

> 4、8、16、100 个 Agent 会发生什么？

更多 Agent 是否一定更好？

很可能不是。

因为真正重要的不是数量，而是：

> **新增 Agent 能不能贡献新的、低相关性的错误模式和有效知识。**

未来需要系统研究：

$$
\text{Diversity} \rightarrow
\text{Learning Gain}
$$

之间究竟是什么关系。

例如：

-   不同模型家族；
-   不同参数规模；
-   不同训练数据；
-   不同 tokenizer；
-   不同 modality；
-   不同 prompt；
-   不同 reasoning style；

分别贡献多少价值？

甚至未来可能需要一个：

> **Cohort Diversity Metric**

来预测两个模型是否适合组成 Co-RL Cohort。

#### 5.2.2 Interaction Topology：谁应该和谁互相监督

目前三 Agent 可以形成固定 Ring：

``` text
A → B → C → A
```

但未来完全可能出现：

``` text
        B
       ↗ ↓
A ← Router → C
       ↘ ↓
        D
```

也就是说：

> 不同问题动态选择不同 Peer。

#### 5.2.3 Adaptive Supervision：动态选择最可靠的 Peer

这是最值得期待的方向之一。

假设：

-   Agent A 擅长数学；
-   Agent B 擅长代码；
-   Agent C 擅长视觉；
-   Agent D 擅长科学推理。

那么没有必要始终固定：

``` text
A → B
B → C
C → D
D → A
```

可以根据问题 (x)，动态估计：

$$
P(\text{peer correct}\midx)
$$

然后选择最合适的 Peer Teacher。

例如：

``` text
数学题
→ 数学能力更强且错误低相关的 Agent

代码题
→ Code Agent

视觉题
→ Perception 更强的 VLM
```

这就是一种更加通用的：

> **Adaptive Peer Supervision。**

从这个角度看，原始 Co-RL 解决的是：

> **如何利用 Peer Diversity 产生无 Ground Truth 的训练信号。**

但它还没有完全解决：

> **如何判断当前这道题究竟该相信哪个 Peer。**

因此后续非常自然的方向包括：

1. **Adaptive Supervision**：根据问题动态决定谁提供 Reward。
2. **Peer Reliability Estimation**：估计 $P(\text{peer correct}\mid q)$，而不是所有 Peer 一视同仁。
3. **Dynamic Routing**：根据数学、代码、视觉能力以及当前置信度和历史表现选择监督来源。
4. **Multi-Agent Arbitration**：如果 A 和 B 强烈冲突，引入 Agent C、多 Agent Majority、额外 rollout 或更高层裁决机制。

---

### 5.3 更大的研究意义：Diversity 本身可能成为 Supervision

如果只把 Co-RL 总结成：

> "两个模型互相打分。"

其实会低估这篇论文。

它真正提出了一个更深层的 Scaling 假设：

> **当 Ground Truth 不存在时，未来 AI 的 supervision
> 不一定来自一个更强的
> Judge，而可能来自多个能力不同、错误不完全相关的模型所组成的群体。**

传统监督：

``` text
Student
   ↑
Teacher
```

RLHF：

``` text
Model
  ↑
Human
```

RLAIF：

``` text
Model
  ↑
Strong LLM Judge
```

Self-Reward：

``` text
Model
  ↺
Itself
```

Co-RL：

``` text
A ↔ B
↑   ↓
D ← C
```

系统中没有一个永远正确的绝对 Teacher。

相反：

> **监督信号从群体成员之间的差异、互补和交叉验证中产生。**

这也是论文标题：

> **Unsupervised Reasoning Emerges from Diverse Cohort**

真正想表达的核心思想。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="/assets/pages/co-rl/images/16-conclusion.png" alt="Co-RL 图文 16：从单一 Teacher 到 Model Society" loading="lazy">
  <figcaption>16 / 总结</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">
### 5.4 总结：从单一 Teacher 走向 Model Society

回到开头的问题：

> **没有 Ground Truth 时，Reasoning RL 的 Reward 到底从哪里来？**

Self-Reward 的回答是：

> 从模型自己来。

Co-rewarding 的回答是：

> 从模型的另一个 View 来。

依赖 Judge 的 Multi-Agent RL 的回答是：

> 从一个更强的外部模型来。

而 Co-RL 给出的答案是：

> **从一群彼此不完全相同、错误不完全相关的模型之间产生。**

这使它与传统 Teacher--Student 范式出现了一个很有意思的区别。

传统监督：

``` text
Student
   ↑
Teacher
```

RLHF：

``` text
Model
  ↑
Human
```

RLAIF：

``` text
Model
  ↑
Strong LLM Judge
```

Self-Reward：

``` text
Model
  ↺
Itself
```

Co-RL：

``` text
A ↔ B
↑   ↓
D ← C
```

系统里不再一定存在一个永远正确、永远更强的 Teacher。每个 Agent 都既是
Student，也是其他 Agent 的临时 Teacher。

因此，Co-RL 真正提出的是一个更大的研究命题：

$$
\boxed{\text{Diversity itself may become a source of supervision}}
$$

也就是：

> **监督不一定只能来自"更强者"，也可能来自"不同者"。**

这也是为什么论文中 Different-Family、Prompt Decoupling、Multi-Agent Ring
等设计不是外围技巧，而是整个方法的核心组成部分。它们都在做同一件事：

> **降低 Agent 之间的 Error Correlation，让一个 Agent 犯错时，另一个
> Agent 仍有机会提供正确方向。**

但与此同时，Co-RL 并没有彻底解决无监督自我进化问题。如果整个 Cohort
产生相同的系统性错误，它仍然可能共同强化错误；如果任务无法用
final-answer agreement 定义 reward，它当前的机制也难以直接应用；随着
Agent 数量增加，训练成本、Peer Selection 和 Interaction Topology
也都会成为新的问题。

因此，这篇论文最值得继续追踪的后续方向，不只是"把两个 Agent 增加到更多
Agent"，而是三个更本质的问题：

1.  **如何度量真正有价值的 Diversity？**\
    不是模型名字不同就一定有用，而是错误模式需要真正互补。

2.  **如何动态选择最合适的 Peer Teacher？**\
    数学题、代码题、视觉题可能应该由不同 Agent 提供监督。

3.  **如何从 Final-Answer Agreement 扩展到开放式任务？**\
    如果未来要做科学发现、算法设计、复杂规划，就必须找到比简单答案一致性更通用的
    Cross-Agent Reward。

如果这些问题能够进一步解决，那么 Co-RL 指向的最终形态可能不再是：

> 一个越来越强的模型不断给自己做 Self-Improvement。

而是：

> **一个保持多样性的 Model
> Society，其中不同模型通过互相纠错、互相提供训练信号，形成不依赖单一绝对
> Teacher 的持续学习系统。**

这才是《Unsupervised Reasoning Emerges from Diverse Cohort in
Multi-agent RL》这个标题背后最值得关注的含义。

### 5.5 参考资料

-   Co-RL: *Unsupervised Reasoning Emerges from Diverse Cohort in
    Multi-agent RL*，arXiv:2608.17253
-   Co-RL 项目主页
-   Co-RL 官方代码仓库
-   TTRL: *Test-Time Reinforcement Learning*
-   Co-rewarding 相关工作
-   CoMAS 相关工作

> 注：本文中的实验数字、方法结构和作者明确提出的未来方向依据 Co-RL
> 论文及相关原始材料整理；关于其对未来 Model Society、动态 Peer Routing
> 等方向的延伸讨论属于基于论文机制的进一步分析。

</div>
</section>
