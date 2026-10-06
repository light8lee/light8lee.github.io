---
layout: post
title: "从Infernece Harness到Optimization Harness"
date: 2026-10-06 12:00:00 +0800
summary: "从广义数值优化走向由显式目标、约束与投影支撑的 Agent 优化结构。"
tags: [Daydreams, Agent Optimization, Inference Harness, Optimization Harness, 优化方法]
series: daydreams
daydream: true
thought_axis: 术
permalink: /daydreams/agent-analytic-vs-numerical-optimization/
cover: /assets/daydreams/agent-analytic-vs-numerical-optimization/images/从数值试错到精确结构的优化之旅.png
body_class: daydream-post
---
# 从Infernece Harness到Optimization Harness

## 0. 核心观点

>从数值试错到精确结构的优化之旅

<figure><img src="{{ '/assets/daydreams/agent-analytic-vs-numerical-optimization/images/从数值试错到精确结构的优化之旅.png' | relative_url }}" alt="从数值试错到精确结构的优化之旅" loading="lazy"></figure>


当前大模型 Agent 的优化，无论是参数训练、强化学习，还是 Train-free 的 Prompt 优化、Text Gradient、Reflection、Memory 更新，本质上大多仍属于一种**广义的数值优化范式**：系统并不知道理想答案在哪里，而是从当前状态出发，通过局部反馈不断试探、修改、验证，再逐步逼近一个更好的状态。

这类方法的核心结构可以抽象成：

$$
z_t
\rightarrow
\text{Evaluate}
\rightarrow
\text{Feedback}
\rightarrow
\Delta z_t
\rightarrow
z_{t+1}
$$

其中，$z_t$ 可以是模型参数，也可以是 Prompt、Memory、Skill、Agent Workflow 或 Policy Tree。即使更新量 $\Delta z_t$ 不是一个数值梯度，而是一段自然语言修改建议，只要它仍然依赖“试一次、看效果、再改一次”的迭代过程，它就仍然具有典型的数值优化特征。

但审核、内容理解这类开放世界任务存在一个更深的问题：**人自己也不知道所谓“最理想的审核状态”究竟是什么。**因此，直接寻找一个全局最优 Agent、一个完美 Prompt，甚至一个完美审核手册，本身可能就是一个错误目标。

更合理的方向不是：

$$
\text{用解析解完全替代数值解}
$$

而是：

$$
\boxed{
\text{Agent Optimization}
=
\text{Analytic / Exact Structure}
+
\text{Numerical Residual Optimization}
}
$$

也就是说：

> **先把 Agent 优化中能够被明确表达、直接推导、符号求解或显式约束的部分提前确定下来，减少需要靠随机搜索和 Text Gradient 猜测的自由度；只把真正开放、模糊、无法形式化的语义残差继续留给大模型和数值搜索。**

这里最重要的并不是“解析解”三个字，而是把两个过去经常混在一起的问题拆开：

$$
\underbrace{\text{Desired Behavior}}_{\text{应该改变什么}}
\neq
\underbrace{\text{Implementation}}_{\text{Prompt / Memory / Agent 怎么改}}
$$

当前很多 Agent 优化直接在实现空间中搜索，因此“应该改什么”和“如何改 Prompt”被混成了同一个问题。更稳定的优化范式，应该先在一个更结构化的语义行为空间中确定目标、约束和不可接受边界，再把它投影回 Prompt、Memory、Gene 或 Agent Workflow。

---

# 1. 为什么今天的 Agent 优化仍然主要是“广义数值解”

## 1.1 参数训练只是最显式的数值优化

传统模型训练最容易理解。例如梯度下降：

$$
\theta_{t+1}
=
\theta_t-\eta\nabla_\theta L(\theta_t)
$$

模型从当前参数 $\theta_t$ 出发，根据局部梯度不断更新：

$$
\theta_0
\rightarrow
\theta_1
\rightarrow
\theta_2
\rightarrow
\cdots
\rightarrow
\theta_T
$$

它并不知道最优参数 $\theta^*$ 的闭式表达，只能通过有限步迭代逐步逼近。

强化学习同样如此。即使存在一个 Reward，实际训练过程仍然是在高维参数空间中不断估计梯度、采样轨迹和修正策略。

所以从优化范式上看，它们都属于：

$$
\boxed{
\text{Local Observation}
\rightarrow
\text{Iterative Update}
}
$$

---

## 1.2 Text Gradient 本质上仍然没有离开这个范式

Train-free Agent 优化看起来似乎不同。

例如 Prompt 优化时，可能出现：

$$
Prompt_t
\rightarrow
\text{运行 Agent}
\rightarrow
\text{发现错误}
\rightarrow
\text{LLM Reflection}
\rightarrow
Prompt_{t+1}
$$

下一轮继续：

$$
Prompt_{t+1}
\rightarrow
\text{运行}
\rightarrow
\text{发现新问题}
\rightarrow
Prompt_{t+2}
$$

虽然这里没有显式的数值梯度：

$$
\nabla_\theta L
$$

但其结构仍然是：

$$
z_{t+1}
=
U(z_t,\hat e_t)
$$

其中：

- $z_t$：当前 Prompt / Memory / Agent 配置；
- $\hat e_t$：基于有限样本得到的误差信号；
- $U$：由 LLM、规则或搜索算法产生的更新。

因此，这类 Text Gradient、Reflection、Prompt Evolution 仍然可以被看作一种**广义数值优化**：

> 不知道真正的答案是什么，只知道当前状态有问题，因此根据局部反馈不断试。

---

## 1.3 为什么这种优化特别容易不稳定

Agent 优化相比传统连续数值优化，噪声甚至更大。

一次更新通常同时叠加：

$$
\text{Sample Noise}
+
\text{Judge Noise}
+
\text{Reflection Noise}
+
\text{Edit Noise}
+
\text{Generation Noise}
$$

例如审核 Agent 出现一个 bad case 后，Reflection 可能总结：

> “应加强对隐喻、讽刺和上下文的理解，在证据不足时谨慎判断。”

这句话看起来合理，但当它被写入 Prompt 后，其作用范围通常是全局的：

$$
\Delta Prompt
\Rightarrow
\Delta \pi(a\mid s),
\quad \forall s
$$

原本只是想修复：

$$
S_{\text{ambiguous}}
$$

最终却可能同时改变：

$$
S_{\text{explicit}},
\quad
S_{\text{benign}},
\quad
S_{\text{satire}},
\quad
S_{\text{historical}}
$$

这就是很多 Prompt / Memory 优化产生震荡的原因：

> **局部错误触发了全局文本更新，而文本更新的实际行为影响面又难以精确预测。**

---

# 2. 解析解、精确求解与数值解的真正边界

前面的讨论很容易把“形式化”“有约束”和“解析解”混为一谈，因此这里必须把几个概念拆开。

## 2.1 什么才是严格意义上的解析解

假设有：

$$
x^*
=
\arg\min_x f(x)
$$

如果能够通过数学推导直接得到：

$$
\boxed{
x^*=g(\text{已知量})
}
$$

而不需要经历：

$$
x_0
\rightarrow
x_1
\rightarrow
x_2
\rightarrow
\cdots
$$

那么它才是严格意义上的解析解，或者 Closed-form Solution。

例如：

$$
\min_x (x-a)^2
$$

直接有：

$$
x^*=a
$$

这一步不存在“试一个 $x$，看效果，再继续修正”的过程。

---

## 2.2 数值解的核心是迭代逼近

如果一个问题无法直接推导，只能使用：

$$
x_{t+1}
=
x_t-\eta\nabla f(x_t)
$$

或者更一般地：

$$
x_{t+1}=U(x_t,e_t)
$$

那么本质上都是通过有限步骤去逼近一个更优状态。

因此，真正的区别不是：

> 有没有使用数字。

而是：

$$
\boxed{
\text{直接推导}
\quad
vs.
\quad
\text{迭代搜索}
}
$$

自然语言 Text Gradient 虽然“梯度”是一段文字，但只要它依赖迭代更新，仍然属于后者。

---

## 2.3 还有一类不能简单叫“解析解”的精确求解

审核和 Agent 中还有很多问题，可以通过：

- SAT；
- SMT；
- ASP；
- Integer Programming；
- Constraint Solver；

来求解。

例如：

$$
C_1\land C_2\land C_3
\Rightarrow
\text{求一个满足全部约束的行为配置}
$$

这种方式可能不是 Closed-form，但它也并不是 noisy gradient search。

更准确地说，它属于：

$$
\boxed{
\text{Exact / Symbolic Solving}
}
$$

因此应该明确区分：

$$
\boxed{
\text{Analytic}
\neq
\text{Exact / Symbolic}
\neq
\text{Numerical}
}
$$

---

## 2.4 “定义约束空间”本身还不是一种求解方式

例如我们定义：

$$
\Pi_C
=
\{
\pi
\mid
C_1,C_2,\ldots,C_n
\}
$$

以及：

$$
\pi_{t+1}
=
\arg\min_{\pi\in\Pi_C}
D(\pi,\pi_t)
$$

这里只是**把问题形式化了**。

至于最后怎么得到 $\pi_{t+1}$，仍然可能有三种不同情况：

1. 如果可以直接推导：

$$
\pi_{t+1}=g(\pi_t,C)
$$

则属于解析解。

2. 如果交给 SMT / ASP / SAT 等求解器：

$$
Solver(C)\rightarrow \pi_{t+1}
$$

则属于精确或符号求解。

3. 如果还是需要：

$$
\pi_0\rightarrow\pi_1\rightarrow\pi_2\rightarrow\cdots
$$

则仍然属于数值优化。

---

## 2.5 Agent 优化最好拆成三层，而不是只问“解析还是数值”

一个更准确的框架是：

### 第一层：Problem Formulation

把 bad case、人工分歧、规则冲突转成：

$$
\text{Constraints}
+
\text{Preferences}
+
\text{Invariances}
$$

例如：

$$
Keyword(x)\land\neg Evidence(x)
\nRightarrow
HighConfidenceViolation(x)
$$

这一层只是定义问题。

### 第二层：Target Solving

根据这些约束求目标行为 $b^*$。

这一层才可能分别采用：

$$
\text{Analytic}
\quad / \quad
\text{Exact}
\quad / \quad
\text{Numerical}
$$

### 第三层：Implementation

真正的 Agent 仍然由：

$$
z=
\{
Prompt,
Memory,
Skill,
Workflow,
Weights
\}
$$

实现。

即使已经知道目标行为：

$$
b^*
$$

仍然需要解决：

$$
z^*
=
\arg\min_z
D(\pi_z,b^*)
$$

而这一层在现实中往往仍然是搜索问题。

### 2.6 Policy Mirror Descent：先定义理想更新，再讨论如何逼近

Policy Mirror Descent（PMD，策略镜像下降）提供了一个非常适合这里的参照。

它并不是直接问：

> 下一步参数应该怎么改？

而是先定义一个理想的新策略：

$$
\pi_{t+1}^{*}
=
\arg\max_{\pi}
\left[
\mathbb E_{a\sim\pi}[A_t(s,a)]
-
\frac{1}{\eta}
D_{\mathrm{KL}}
\left(
\pi(\cdot\mid s)
\middle\|
\pi_t(\cdot\mid s)
\right)
\right]
$$

在理想条件下，可以得到指数重加权形式：

$$
\boxed{
\pi_{t+1}^{*}(a\mid s)
\propto
\pi_t(a\mid s)
\exp\left(\eta A_t(s,a)\right)
}
$$

这里最值得借鉴的并不是公式本身，而是它把两个问题拆开了：

$$
\boxed{
\text{What should the next policy be?}
}
$$

和：

$$
\boxed{
\text{How can the actual model approximate it?}
}
$$

PMD 先在策略空间中定义一个理想更新，再讨论有限采样、有限容量模型如何逼近这个目标。2026 年针对 LLM Post-training 的相关工作也沿着这一方向讨论：理想 PMD 更新具有清晰的解析结构，而现实中的有限 rollout 和 log-partition approximation 会引入近似误差，同时某些近似会隐式产生额外正则化。

这给 Agent 优化一个很直接的启发：

> **即使最终 Prompt / Memory / Model 仍然只能通过搜索来优化，也可以先让“应该往哪里变化”尽可能不依赖搜索。**

因此，本文真正希望迁移的不是 PMD 的具体概率公式，而是其两阶段思想：

$$
\boxed{
\text{Ideal Target Construction}
\rightarrow
\text{Approximate Realization}
}
$$

在审核 Agent 中，可以进一步把概率策略空间替换为 Semantic Behavior Space：

$$
\pi_{t+1}^{*}
\quad\Longrightarrow\quad
b_{t+1}^{*}
$$

然后再做：

$$
b_{t+1}^{*}
\rightarrow
Prompt / Memory / Gene / Workflow
$$

这正是后文 Target-then-Project 结构的理论原型之一。

---


# 3. 如果人也不知道“最理想审核状态”，目标到底从哪里来

这是整个问题中最关键的一步。

审核是典型开放世界任务。很多 case 本身就具有真实歧义，人类执行者之间也可能存在分歧。因此假设存在一个人类已经完全知道的：

$$
\pi^*
$$

往往并不成立。

## 3.1 不再寻找一个“理想点”，而是寻找“可接受区域”

传统思路容易假设：

$$
\pi_{t+1}
\approx
\pi^*
$$

但如果 $\pi^*$ 根本未知，就应该把目标改成：

$$
\Pi_{\text{acceptable}}
=
\{
\pi
\mid
C_1,C_2,\ldots,C_n
\}
$$

然后寻找：

$$
\boxed{
\pi_{t+1}
=
\arg\min_{\pi\in\Pi_{\text{acceptable}}}
D(\pi,\pi_t)
}
$$

这里的含义是：

> 我不知道世界上最好的审核系统是什么，但我知道新的系统至少不能违反这些条件；在满足这些条件的前提下，尽量不要破坏已有系统。

因此目标不再是 Point Target，而是：

$$
\boxed{
\text{Set-valued Target}
}
$$

或者：

$$
\boxed{
\text{Desired Behavior Region}
}
$$

---

## 3.2 人类最容易提供的往往不是“正确答案”，而是“错误边界”

很多审核 case 中，人可能不知道最终应该判 A、B 还是 C。

但人可能很确定：

$$
\text{仅因为关键词出现}
\nRightarrow
\text{直接判高确定性违规}
$$

或者：

$$
\text{存在多个合理解释}
\Rightarrow
\text{不能假装语义唯一}
$$

或者：

$$
\text{关键事实未经验证}
\Rightarrow
\text{不能使用确定性结论}
$$

这是一种 Negative Knowledge：

> 不知道理想答案是什么，但知道哪些行为不能接受。

因此，一个 bad case 的价值并不一定是告诉系统：

$$
x\rightarrow y^*
$$

它也可以只增加一个新的边界：

$$
C_{t+1}
$$

系统的行为区域由此从：

$$
\Pi_t
$$

缩小为：

$$
\Pi_{t+1}
=
\Pi_t\cap C_{t+1}
$$

---

## 3.3 审核目标可以来自五种不同类型的信息

不必把所有监督都压缩成最终 Label。

### （1）错误约束

例如：

$$
X\nRightarrow Y
$$

含义是：

> 观察到 $X$ 不能单独成为推导 $Y$ 的充分条件。

这种信息非常适合变成 semantic constraint。

### （2）相对偏好

人不知道 A 是否绝对正确，但可能知道：

$$
\tau_A\succ\tau_B
$$

其中 $\tau$ 是一个完整推理轨迹。

这意味着：

> 不需要知道全局 optimum，只需要知道局部更新方向。

### （3）一致性与不变量

例如两个 case 只改变了一个与规则无关的因素：

$$
x_1=(A,B,C)
$$

$$
x_2=(A,B,\neg C)
$$

如果 $C$ 不应影响决策，则希望：

$$
f(x_1)=f(x_2)
$$

这类 invariance 不要求知道绝对标签。

### （4）过程约束

即使不知道最终判定，也可能知道一个合理的推理过程必须满足：

$$
x
\rightarrow
Hypothesis
\rightarrow
Evidence
\rightarrow
Verification
\rightarrow
Rule
\rightarrow
Decision
$$

例如：

$$
Depends(D,E)
\Rightarrow
Verified(E)
$$

或者：

$$
Unverified(E)
\Rightarrow
D\neq HighConfidence
$$

这种约束尤其适合开放世界审核，因为它约束的是“怎么得出结论”，而不是强迫系统提前知道所有结论。

### （5）统计分歧

如果人工标注是：

$$
P_h(A)=0.55,
\quad
P_h(B)=0.30,
\quad
P_h(C)=0.15
$$

则没有必要强行把 A 当成唯一 Ground Truth。

系统更合理的目标可能是保留：

$$
\text{human disagreement structure}
$$

甚至显式建模：

$$
Ambiguity(x)
$$

也就是说：

> 不确定性本身也可以是正确的目标状态。

## 3.4 它和 Rubric 到底有什么区别

>Rubric、Constraint 与 Target Behavior 的关系

<figure><img src="{{ '/assets/daydreams/agent-analytic-vs-numerical-optimization/images/太阳花角色的行为优化信息图.png' | relative_url }}" alt="太阳花角色的行为优化信息图" loading="lazy"></figure>


这里需要特别区分 Rubric、Constraint 和 Target Behavior，因为三者都可以参与 Agent 优化，但它们解决的是不同问题。

最简洁的概括是：

$$
\boxed{
\text{Rubric}
=
\text{Evaluation Space}
}
$$

$$
\boxed{
\text{Constraint}
=
\text{Feasible Space}
}
$$

$$
\boxed{
\text{Target Behavior}
=
\text{Optimization Target Space}
}
$$

也就是说：

- **Rubric** 回答“这个结果好不好”；
- **Constraint** 回答“这个行为能不能发生”；
- **Target Behavior** 回答“下一版行为应该往哪里变化”。

### 3.4.1 Rubric 本质上仍然是一种评价函数

例如一个审核 Agent 的 Rubric 可能包含：

- 是否正确识别主体；
- 是否考虑上下文；
- 是否验证关键证据；
- 是否正确映射 Policy；
- 最终结论是否合理。

可以写成：

$$
R(\tau)
=
\sum_{i=1}^{n}w_i r_i(\tau)
$$

其中：

- $\tau$：一条 Agent trajectory；
- $r_i$：第 $i$ 个评价维度；
- $w_i$：对应权重。

最终得到一个：

$$
R(\tau)\in\mathbb R
$$

或者离散等级分数。

Rubric 很有价值，因为它比单一最终 Label 或单一 Reward 提供了更细粒度的反馈。但它本质上仍然是在回答：

> 这条 trajectory 有多好？

因此，如果优化过程仍然是：

$$
Prompt_t
\rightarrow
RubricScore
\rightarrow
Reflection
\rightarrow
Prompt_{t+1}
$$

那么整体仍然属于：

$$
\boxed{
\text{Score}
\rightarrow
\text{Reflection}
\rightarrow
\text{Search}
}
$$

也就是说，Rubric 可以改善反馈质量，但**它本身并没有改变数值/搜索式优化范式**。

### 3.4.2 Constraint 不只是“扣分”，而是删除不可接受行为

Rubric 通常允许不同维度之间发生 trade-off。

例如：

$$
r_{\text{context}}=1,
\quad
r_{\text{evidence}}=2,
\quad
r_{\text{policy}}=2
$$

最终可能仍然得到一个较高总分。

也就是说，一个维度做得差，可以被其他维度部分补偿。

但审核中的很多规则不应该是：

$$
-2\text{ 分}
$$

而应该是：

$$
\boxed{
\text{该行为不允许进入可行空间}
}
$$

例如：

$$
Depends(D,E)
\land
External(E)
\land
\neg Verified(E)
\Rightarrow
D\neq HighConfidence
$$

如果关键外部事实没有验证，那么“高置信结论”并不是一个低分答案，而是应该被直接从可选行为中删除。

因此，Rubric 更接近：

$$
\text{Soft Preference}
$$

而 Hard Constraint 更接近：

$$
C(\tau)\in\{0,1\}
$$

并且：

$$
C(\tau)=0
\Rightarrow
\tau\notin\mathcal F
$$

其中 $\mathcal F$ 是系统允许的 feasible set（可行域）。

### 3.4.3 Target Behavior 又比 Constraint 多回答了一步

Constraint 只告诉系统：

> 什么不能发生。

但它并不一定告诉系统：

> 剩下的合法行为中，下一版应该往哪个方向变化。

因此还需要 Target Behavior。

例如当前行为是：

$$
b_t
=
\{
H_1,
E_1,
\neg V,
D_{\text{high}}
\}
$$

经过错误分析后，目标行为可能变成：

$$
b^*
=
\{
H_1,
H_2,
E_1,
V,
D_{\text{uncertain}}
\}
$$

其中：

- 增加备选假设 $H_2$；
- 对关键证据执行验证 $V$；
- 在证据不足时把决策从高置信结论调整为不确定状态。

因此三者的关系可以写成：

$$
\boxed{
\text{Rubric}
\rightarrow
\text{评价哪里不好}
}
$$

$$
\boxed{
\text{Constraint}
\rightarrow
\text{切掉哪些行为}
}
$$

$$
\boxed{
\text{Target Behavior}
\rightarrow
\text{剩余空间中应该往哪里移动}
}
$$

### 3.4.4 Rubric 可以成为 Constraint Induction 的原材料

Rubric 与 Semantic Harness 并不是互斥关系。

更值得探索的路径反而是：

$$
\boxed{
\text{Rubric}
\rightarrow
\text{Stable Pattern}
\rightarrow
\text{Constraint Induction}
\rightarrow
\text{Harness}
}
$$

例如，系统长期使用一个评价维度：

> “关键证据是否完成验证？”

最开始它可以只是：

$$
r_{\text{verify}}\in\{0,1,2\}
$$

用于 Judge 打分。

但如果大量 bad case 都表明这个维度具有稳定、可泛化的结构，那么它就可以被进一步形式化为：

$$
Depends(D,E)
\land
External(E)
\Rightarrow
Verified(E)
$$

这时它就从：

$$
\boxed{
\text{Evaluation Signal}
}
$$

升级成：

$$
\boxed{
\text{System Constraint}
}
$$

也就是说，成熟 Agent 系统不应该让所有 Rubric 永远停留在 Reward 层。

那些满足以下条件的 Rubric：

1. 语义稳定；
2. 可形式化；
3. 可验证；
4. 跨 case 可泛化；
5. 不依赖大量开放世界猜测；

都可以尝试逐步“编译”为 Constraint。

相反，那些高度主观、依赖开放语义判断的 Rubric，例如：

> “整体语气是否具有明显讽刺意味？”

仍然更适合作为：

$$
\text{Soft Evaluation}
$$

而不是强行写成 Hard Constraint。

### 3.4.5 Rubric 到 Harness 的升级，本质上也是减少搜索自由度

从本文的主线来看，这个转化非常关键。

如果一个规则永远只是 Rubric：

$$
R_i(\tau)
$$

那么每一次推理和优化都仍然需要模型重新判断：

> 我这次在这个维度做得够不够好？

而如果它已经成为 Constraint：

$$
C_i(\tau)
$$

那么系统可以提前排除：

$$
C_i(\tau)=0
$$

的行为。

因此：

$$
\mathcal X
\rightarrow
\mathcal X_C
$$

其中：

$$
\mathcal X_C
=
\{
x\in\mathcal X
\mid
C_i(x)=1
\}
$$

搜索空间直接变小。

所以 Rubric 和本文方法真正的关系不是“二选一”，而是：

> **Rubric 是发现结构的评价层，Semantic Constraint 是把稳定结构固化后的执行层。**

可以进一步概括为：

$$
\boxed{
\text{Rubric tells us what is better;}
\quad
\text{Harness decides what is allowed.}
}
$$

而 Target Behavior 再进一步决定：

$$
\boxed{
\text{Within what is allowed, where should the system move next?}
}
$$

---

# 4. 真正值得追求的不是“全解析解”，而是减少需要搜索的自由度

如果把整个 Agent 都看作：

$$
F(x;z)
$$

其中 $z$ 包含 Prompt、Memory、Skill、Workflow 和 Model Parameters，那么期待整个系统存在：

$$
z^*=g(\text{任务})
$$

这样的全局闭式解并不现实。

更合理的做法是拆分：

$$
\mathcal X
=
\mathcal X_{\text{determined}}
\oplus
\mathcal X_{\text{residual}}
$$

其中：

- $\mathcal X_{\text{determined}}$：可明确约束、直接推导、符号求解的部分；
- $\mathcal X_{\text{residual}}$：真正开放、模糊、依赖世界知识和语言理解的部分。

优化目标变成：

$$
\boxed{
\text{尽可能扩大 }
\mathcal X_{\text{determined}}
\text{，缩小 }
\mathcal X_{\text{residual}}
}
$$

---

## 4.1 哪些部分更适合解析或精确化

审核 Agent 中，以下内容往往更适合提前结构化：

- Rule Priority；
- Prerequisite；
- Mutual Exclusion；
- Evidence Requirement；
- Tool Dependency；
- Decision Boundary；
- Memory Conflict；
- Regression Constraint；
- Certain Invariance；
- Certain Process Ordering。

例如：

$$
ExternalFactRequired(x)
\Rightarrow
MustVerify(x)
$$

或者：

$$
Rule_A(x)\land Rule_B(x)\land Priority(A,B)
\Rightarrow
Use(A)
$$

这类关系不必每一次都让 LLM“重新理解”。

### 4.1.1 Meta-Ctrl：把确定约束从生成自由度中直接切掉

>PMD 与 Meta-Ctrl 对语义优化框架的启发

<figure><img src="{{ '/assets/daydreams/agent-analytic-vs-numerical-optimization/images/pmd与meta_ctrl的语义优化桥梁.png' | relative_url }}" alt="pmd与meta_ctrl的语义优化桥梁" loading="lazy"></figure>


Meta-Ctrl 提供了一个很好的 inference-time 对照。

它的核心并不是训练一个“更懂约束”的 LLM，而是把不同类型的约束拆到不同层级：

- token 层负责语法约束；
- action / meta-token 层负责前置条件、目标与顺序等语义约束；
- LLM 只在剩余合法空间内继续生成。

可以抽象为：

$$
x\models\alpha
\iff
(x\models\gamma)
\land
(\tau(x)\models\beta)
$$

其中：

- $\gamma$：syntax-level constraints；
- $\beta$：action / semantic-level constraints；
- $\tau(x)$：从生成结果映射到动作序列的过程。

如果某个行为已经被确定为非法，那么系统不是通过 Prompt 告诉模型：

> “尽量不要这样做。”

而是直接令：

$$
P(a_{\text{invalid}})=0
$$

也就是从可选空间中把它删除。

这和本文要强调的优化思想高度一致：

$$
\boxed{
\text{不要让 LLM 学会避开所有错误}
}
$$

而应该尽可能：

$$
\boxed{
\text{先把已经确定错误的自由度从搜索空间中切掉}
}
$$

Meta-Ctrl 本身主要讨论 inference-time constrained generation，但它给 optimization-time 一个重要启发：如果某些约束可以被显式编码，那么它们就不应该继续作为 Text Gradient 需要反复学习的内容。

因此，Agent 优化可以把原本的：

$$
\mathcal X
$$

先缩减为：

$$
\mathcal X_C
=
\{x\in\mathcal X\mid C(x)=\text{true}\}
$$

再只在：

$$
\mathcal X_C
$$

中执行剩余搜索。

从这个角度看，Semantic Harness 不只是“推理时拦截错误”的机制，也是一个能够**减少 optimization search space** 的结构。

---

## 4.2 哪些部分仍然应该交给大模型

例如：

> 这句话是不是在讽刺？

> 这张图真正表达的攻击对象是谁？

> 用户是在转述、引用，还是本人表达立场？

这类问题往往没有简单的解析表达式。

因此它们仍然属于：

$$
\mathcal X_{\text{residual}}
$$

需要 LLM、Multimodal Model、Search、Memory 和统计推理共同处理。

关键不是消灭它们，而是：

> **不要把本来可以确定的结构也继续交给 LLM 猜。**

---

## 4.3 Semantic Behavior Space 比 Prompt Space 更适合作为优化空间

传统优化直接搜索：

$$
Prompt
$$

但 Prompt 是实现，不是行为本身。

更合理的是先定义一个 Semantic Behavior：

$$
b=
(
H,E,V,R,D
)
$$

其中：

- $H$：Hypothesis，产生了哪些假设；
- $E$：Evidence，使用了哪些证据；
- $V$：Verification，哪些内容经过验证；
- $R$：Rule，哪些规则被激活；
- $D$：Decision，最终做了什么判断。

一个 bad case 对系统的修正，可以表达成：

$$
\Delta b
=
\{
\text{增加 }H_3,
\text{禁止 }E_1\Rightarrow D,
\text{要求先执行 }V_2,
\text{规定 }R_3>R_1
\}
$$

这已经不是“给 Prompt 加一句话”，而是一个语义层的行为 patch。

---

## 4.4 再把目标行为投影回 Prompt、Memory 与 Agent

真正的实现仍然需要：

$$
\Delta b
\rightarrow
\Delta z
$$

其中：

$$
z=
\{
Prompt,
Memory,
Gene,
PolicyTree,
Workflow
\}
$$

可以定义：

$$
z_{t+1}
=
\arg\min_z
D(
Behavior(z),
b^*
)
$$

这一层很可能仍然需要：

- Text Gradient；
- LLM Reflection；
- Search；
- Evolution；
- RL；
- Distillation。

但它们的角色已经改变。

过去它们同时负责：

1. 判断系统应该往哪里改；
2. 决定具体怎么改。

现在它们只负责第二件事：

> **如何实现一个已经更明确的目标行为。**

---

## 4.5 因此更准确的范式是 Target-then-Project

>从约束、目标到投影的整体路径

<figure><img src="{{ '/assets/daydreams/agent-analytic-vs-numerical-optimization/images/从约束到投影的探索之旅.png' | relative_url }}" alt="从约束到投影的探索之旅" loading="lazy"></figure>


这里可以把 PMD 与 Meta-Ctrl 两条线合并起来理解。

PMD 给出的核心启发是：

$$
\boxed{
\text{先确定理想目标}
\rightarrow
\text{再做近似实现}
}
$$

Meta-Ctrl 给出的核心启发是：

$$
\boxed{
\text{先删除确定非法的自由度}
\rightarrow
\text{再让模型处理剩余空间}
}
$$

两者组合之后，可以得到本文更完整的 Agent Optimization 结构：

$$
\boxed{
\text{Constrain}
\rightarrow
\text{Solve Target}
\rightarrow
\text{Project}
}
$$

也就是：

1. **Constrain**：先用规则、precedent、invariance 和 process requirement 缩小行为可行域；
2. **Solve Target**：在缩小后的空间中确定理想目标或可接受目标区域；
3. **Project**：再把目标行为投影回 Prompt、Memory、Gene 或 Workflow。

因此 Target-then-Project 并不是简单增加一个中间层，而是在优化过程中显式地区分：

$$
\underbrace{
\text{Feasible Space}
}_{\text{Meta-Ctrl式约束}}
\rightarrow
\underbrace{
\text{Target Behavior}
}_{\text{PMD式目标}}
\rightarrow
\underbrace{
\text{Agent Implementation}
}_{\text{Text Gradient / Search}}
$$

可以把整个优化过程写成：

$$
\boxed{
\text{Observe}
\rightarrow
\text{Constraint Extraction}
\rightarrow
\text{Target Solving}
\rightarrow
\text{Projection}
\rightarrow
\text{Verification}
}
$$

也就是：

### 第一步：Observe

获取 bad case、人工分歧、回归 case、轨迹错误。

### 第二步：Constraint Extraction

把错误提取成：

$$
C_i
$$

而不是直接生成一句 Prompt 建议。

### 第三步：Target Solving

确定：

$$
b^*
$$

或者：

$$
\mathcal B_{\text{acceptable}}
$$

能解析的解析，能精确求解的交给 Solver。

### 第四步：Projection

再把 $b^*$ 转换为：

$$
Prompt / Memory / Gene / Workflow
$$

### 第五步：Verification

检查实际 Agent 是否真的实现：

$$
Behavior(z_{t+1})\approx b^*
$$

并测量 projection error：

$$
E_{\text{proj}}
=
D(
Behavior(z_{t+1}),
b^*
)
$$

---

# 5. 一个审核例子：为什么“先约束行为”比“直接改 Prompt”更稳定

假设某个 bad case 中，因为出现敏感关键词，Agent 直接做出了高置信违规判断。

## 5.1 传统 Text Gradient 会怎么做

流程可能是：

$$
Prompt_t
\rightarrow
\text{Bad Case}
\rightarrow
\text{Reflection}
\rightarrow
Prompt_{t+1}
$$

Reflection 产生：

> “判断时应充分结合上下文，避免仅依赖关键词。”

这个修改并没有显式定义作用边界。

因此：

$$
\Delta Prompt
\Rightarrow
\Delta Behavior(s),
\quad \forall s
$$

新的 Prompt 可能修复这个 case，同时破坏其他显式违规场景。

---

## 5.2 如果先转成行为约束

可以先得到：

$$
C_1:
Keyword(x)
\land
\neg SupportingEvidence(x)
\Rightarrow
Decision(x)\neq HighConfidenceViolation
$$

于是：

$$
Allowed(x)
=
\{
Review,
Uncertain,
NonViolation
\}
$$

原本可能的行为集合是：

$$
A(x)
=
\{
HighConfidenceViolation,
Violation,
Review,
Uncertain,
NonViolation
\}
$$

经过约束后变成：

$$
A_C(x)
=
A(x)
-
\{
HighConfidenceViolation
\}
$$

这一步不需要 Text Gradient 学习。

它只是直接删除了一个已经确认不合理的行为自由度。

---

## 5.3 剩下的语义残差仍然交给模型

但系统仍然不知道：

$$
Review,
Uncertain,
NonViolation
$$

到底哪个更合理。

这部分仍然是开放语义问题。

因此可以让 LLM 继续解决：

$$
a^*
=
\arg\max_{a\in A_C(x)}
Score_{\text{LLM}}(a\mid x)
$$

这就体现了新的分工：

$$
\boxed{
\text{Explicit Boundary}
\rightarrow
\text{Exact Restriction}
}
$$

$$
\boxed{
\text{Open Semantics}
\rightarrow
\text{LLM Residual Reasoning}
}
$$

这比让 LLM 同时决定“哪些行为不允许”和“剩下选哪个”更加稳定。

---

# 6. 这套思路如何与 Semantic Harness 合并

如果继续沿这个方向发展，Semantic Harness 不应该只被理解为 Inference-time 的语义约束框架。

它还可以成为 Agent Optimization 的坐标系。

## 6.1 从 Inference Harness 到 Optimization Harness

原来的目标是：

$$
\text{输入}
\rightarrow
\text{受约束的理解与推理}
\rightarrow
\text{决策}
$$

进一步可以增加：

$$
\text{Bad Case}
\rightarrow
\text{Semantic Trace}
\rightarrow
\text{Error Attribution}
\rightarrow
\Delta C
$$

然后：

$$
\Delta C
\rightarrow
\text{Target Solving}
\rightarrow
\Delta b
$$

再：

$$
\Delta b
\rightarrow
\Delta Prompt
/
\Delta Memory
/
\Delta Gene
/
\Delta PolicyTree
$$

因此形成：

$$
\boxed{
\text{Inference Constraint}
+
\text{Optimization Constraint}
}
$$

---

## 6.2 Gene、Memory 与 Precedent 应该从“经验文本”升级为“行为约束单元”

如果一个 Gene 只是一段：

> “遇到类似情况要谨慎考虑上下文。”

它依然很容易退化成自然语言模仿。

更强的表达应该是：

$$
Gene_i
=
\{
Trigger,
Constraint,
Priority,
Exception,
EvidenceRequirement
\}
$$

例如：

$$
Trigger:
AmbiguousExpression(x)
$$

$$
Constraint:
\neg VerifiedIntent(x)
\Rightarrow
\neg HighConfidenceViolation(x)
$$

$$
Exception:
ExplicitThreat(x)
$$

$$
Priority:
Exception > Constraint
$$

这样，一个新 precedent 不再只是给 Agent 增加一段“经验”，而是在收缩行为可行域：

$$
\Pi_{t+1}
=
\Pi_t\cap Gene_i
$$

---

## 6.3 最终形成一个“可收缩行为解空间”的持续优化系统

系统一开始拥有：

$$
\Pi_0
$$

随着更多 bad case、人工判例和冲突案例出现：

$$
\Pi_1
=
\Pi_0\cap C_1
$$

$$
\Pi_2
=
\Pi_1\cap C_2
$$

继续：

$$
\Pi_t
=
\bigcap_{i=1}^{t} C_i
$$

每一个新 case 的意义不再只是：

> 增加一个新的 if-else。

而是：

> **删除一部分已经被证明不合理的行为区域。**

这非常接近法律判例的运行方式：并不假设一开始就存在一份覆盖所有未来 case 的完美手册，而是随着案例不断明确哪些推理成立、哪些推理不成立、哪些例外具有更高优先级。

因此，开放世界下更现实的优化目标不是：

$$
\text{找到完美 Agent}
$$

而是：

$$
\boxed{
\text{持续缩小不合理行为的可行空间}
}
$$

---

# 结语

最初的问题是：

> Agent 优化现在大量依赖数值解、Text Gradient 和迭代搜索，能不能从解析解角度让它变得更稳定？

经过进一步拆解，更准确的答案是：

> **不能简单把 Agent 优化从“数值解”整体替换为“解析解”，因为开放世界语义本身不存在可完整形式化的全局闭式解。真正可行的方向，是把 Agent 优化拆成“可确定结构”和“开放语义残差”两部分。**

因此新的目标不应该写成：

$$
\boxed{
\text{Analytic replaces Numerical}
}
$$

而应该写成：

$$
\boxed{
\text{Analytic / Exact Structure}
+
\text{Numerical Residual Optimization}
}
$$

其核心思想是：

1. 不再直接从 bad case 跳到 Prompt 修改；
2. 先把错误抽象成 Constraint、Preference、Invariant 或 Process Requirement；
3. 能解析的直接解析；
4. 能符号求解的交给 Solver；
5. 通过约束删除已经确定不合理的行为自由度；
6. 只把真正无法形式化的开放语义残差留给 LLM、Text Gradient、Search 和 RL；
7. 最终再把目标行为投影回 Prompt、Memory、Gene、Policy Tree 与 Agent Workflow。

所以真正应该追求的，不是找到一个不存在的“完美审核解析解”，而是：

$$
\boxed{
\text{把尽可能多的自由度从随机搜索中拿回来}
}
$$

从已有研究看，这条路线已经出现了两个重要的理论支点：

- **PMD** 说明可以先定义理想策略更新，再让实际模型去近似；
- **Meta-Ctrl** 说明可以把已经确定的约束直接编码进生成过程，从而减少模型需要自行搜索和学习的空间。

本文进一步希望把两者连接到 Semantic Harness：

$$
\boxed{
\text{Constraint-induced Feasible Space}
\rightarrow
\text{Semantic Target Behavior}
\rightarrow
\text{Language Agent Projection}
}
$$

这比“直接从 bad case 生成 Text Gradient”多了一层结构化中间表示，也使每一步错误更容易被归因：到底是约束抽取错了、目标求解错了，还是最后的 Prompt / Memory 投影没有真实实现目标行为。

当越来越多的行为边界、过程约束和 precedence 被显式化后，Agent 要靠随机优化解决的问题就会越来越小。

这也可能是 Semantic Harness 更深的一层意义：

> **它不只是约束 Agent 在一次推理中“不能怎么做”，还可以成为整个 Agent 持续优化过程中的结构化坐标系，用来决定哪些部分应该被精确固定，哪些部分才真正值得继续交给大模型探索。**

---

## 参考工作

1. **Policy Mirror Descent / LLM Post-training**  
   *Approximation of Log-Partition Function in Policy Mirror Descent Induces Implicit Regularization for LLM Post-Training*, ICML 2026.  
   https://proceedings.mlr.press/v306/xu26am.html

2. **Meta-Ctrl**  
   *Meta-Ctrl: Guaranteed Plan Generation by Decoupling Syntactic and Semantic Constraints*, 2026.  
   https://arxiv.org/abs/2608.22149

