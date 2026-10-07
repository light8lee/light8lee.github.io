---
layout: post
title: "Just-in-Time Memory：把“记什么”推迟到真正需要它的时候"
date: 2026-10-07 14:00:00 +0800
summary: "JitMem 把 Agent Memory 从写入时的固定总结，改成任务到来后基于历史轨迹即时编译、服务当前任务的 Context。"
tags: [Agent Memory, JitMem, GRPO, 强化学习, 论文解读]
category: "Agent 系统"
thought_axis: "器"
cover: /assets/posts/paper-notes/jitmem-detailed-explainer/images/01-cover-jitmem-architecture.png
body_class: dive-into-codex-post
---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/flows/01-system-flow.png' | relative_url }}" alt="JitMem 从检索、整理到执行并以奖励更新 Curator 的系统流程图" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / JitMem</p>
## Just-in-Time Memory：把“记什么”推迟到真正需要它的时候

> **核心观点**
>
> 《Just-in-Time Memory: Learning to Curate Task-Adaptive Memory for LLM Agents》最重要的贡献，并不是提出了一种新的 Memory 数据结构，也不是简单地“用 GRPO 训练 Memory”。它重新定义了 Agent Memory 的时机：**不要在经验产生时就永久决定“这段经验意味着什么”，而是保留原始轨迹，等当前任务已经明确之后，再针对这个任务即时重构一份最有用的 Memory。**
>
> 传统方法更接近：
>
> <div class="math-display" markdown="0">
> \[
> \text{Experience} \rightarrow \text{Fixed Memory} \rightarrow \text{Future Task}
> \]
> </div>
>
> JitMem 则改成：
>
> <div class="math-display" markdown="0">
> \[
> \text{Experience} \rightarrow \text{Raw Trajectory Store}
> \]
> </div>
>
> 当未来任务 <span class="math-inline" markdown="0">\(x_t\)</span> 真正到来时：
>
> <div class="math-display" markdown="0">
> \[
> (x_t,\text{Retrieved Trajectories})
> \rightarrow
> \text{Task-Adaptive Payload}
> \rightarrow
> \text{Executor}
> \]
> </div>
>
> 这一步变化同时解决了两个问题：第一，避免在未来任务未知时过早压缩信息；第二，把原本跨很多未来任务才能知道好坏的 Memory 学习问题，变成“当前生成一份 Memory → 当前任务马上验证效果”的短信用分配问题。论文进一步用 GRPO 训练这个 **Memory Curator**，让它从“LLM 觉得合理的总结”进化成“实际最能帮助 Executor 完成任务的上下文编译器”。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/images/02-problem-imagegen.png' | relative_url }}" alt="JitMem 论文详细解读配图 2 / 18" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / JitMem</p>
## 1. 论文想解决的根本问题：Memory 为什么总是在过早做决定

### 1.1 传统 Agent Memory 的默认范式

大量 Agent Memory 方法虽然实现不同，但大多遵循相似过程：

1. Agent 完成一次任务；
2. 对 trajectory 进行总结、反思、抽象或技能提取；
3. 把抽象结果永久存入 Memory；
4. 后续任务通过相似度检索这些 Memory。

可以抽象成：

<div class="math-display" markdown="0">
\[
\xi_s \rightarrow m_s
\]
</div>

其中：

- <span class="math-inline" markdown="0">\(\xi_s\)</span>：第 <span class="math-inline" markdown="0">\(s\)</span> 个任务产生的原始 trajectory；
- <span class="math-inline" markdown="0">\(m_s\)</span>：在任务结束时生成的固定 Memory。

问题在于，生成 <span class="math-inline" markdown="0">\(m_s\)</span> 的时候，系统并不知道未来任务 <span class="math-inline" markdown="0">\(x_t\)</span> 到底需要这段历史中的哪一部分。

于是一个天然矛盾出现：

<div class="math-display" markdown="0">
\[
\text{Future Utility}
\quad\text{is unknown at}\quad
\text{Write Time}
\]
</div>

但系统却必须在 write time 决定：

- 哪些细节重要；
- 哪些细节可以删除；
- 应该抽象成什么层次；
- 应该把它解释成策略、规则、技能还是案例。

这就是论文真正要挑战的假设。

---

### 1.2 Write-time Curation 的第一个问题：信息损失不可逆

假设一段历史 trajectory 包含：

- 如何找到物体；
- 如何改变物体状态；
- 如何使用某种工具；
- 如何放置物体；
- 中间失败过什么；
- 环境中特定的操作约束。

如果 write-time curator 最终总结成：

> “处理物体时，应先改变物体状态，再完成目标放置。”

这个 Memory 对某些未来任务很好。

但如果未来任务真正需要的是：

> “必须先移动到某种工具附近，再执行 examine。”

而这个细节已经在第一次摘要时丢掉，那么后面无论 Retriever 或 Executor 多强，都无法恢复。

因此：

<div class="math-display" markdown="0">
\[
\text{Raw Trajectory}
\xrightarrow{\text{Lossy Distillation}}
\text{Fixed Memory}
\]
</div>

一旦发生：

<div class="math-display" markdown="0">
\[
I_{\text{discarded}}
\not\rightarrow
\text{recoverable}
\]
</div>

论文把这个问题概括为 **premature and irreversible information loss（过早且不可逆的信息损失）**。

---

### 1.3 第二个问题：同一段经历并不存在唯一正确的“经验总结”

一条 trajectory 往往不是只包含一个 lesson。

更合理的表达是：

<div class="math-display" markdown="0">
\[
\xi
=
\{z_1,z_2,\ldots,z_n\}
\]
</div>

其中不同的 <span class="math-inline" markdown="0">\(z_i\)</span> 可以对应：

- 状态转换经验；
- 工具使用经验；
- 位置导航经验；
- 操作顺序；
- 异常处理；
- 环境约束。

如果未来任务是 <span class="math-inline" markdown="0">\(x_A\)</span>，真正有用的是：

<div class="math-display" markdown="0">
\[
z_A
\]
</div>

如果任务换成 <span class="math-inline" markdown="0">\(x_B\)</span>，真正有用的可能变成：

<div class="math-display" markdown="0">
\[
z_B
\]
</div>

因此合理的 Memory 应该是：

<div class="math-display" markdown="0">
\[
m_A=f(\xi,x_A)
\]
</div>

<div class="math-display" markdown="0">
\[
m_B=f(\xi,x_B)
\]
</div>

而不是永远：

<div class="math-display" markdown="0">
\[
m=f(\xi)
\]
</div>

这就是 JitMem 最核心的思想：

> **Memory 的解释应该依赖当前任务。**

同一段过去，在不同的当前目标下，可以被重新理解成不同的经验。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/flows/03-roles-flow.png' | relative_url }}" alt="Curator 与 Executor 的分工流程图" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / JitMem</p>
## 2. JitMem：把 Memory 从“提前总结”改成“即时重建”

### 2.1 系统的四个核心组件

JitMem 由四部分构成：

1. **Memory Bank <span class="math-inline" markdown="0">\(\mathcal M_t\)</span>**：保存过去成功任务的原始 trajectory；
2. **Retriever <span class="math-inline" markdown="0">\(\mathcal R\)</span>**：为当前任务找相关历史；
3. **Memory Curator <span class="math-inline" markdown="0">\(\pi_\phi\)</span>**：根据当前任务即时加工历史；
4. **Agent Executor <span class="math-inline" markdown="0">\(\pi_L\)</span>**：真正执行任务。

只有 Curator 是训练对象。

论文的整体优化目标是：

<div class="math-display" markdown="0">
\[
\max_{\phi}
\mathbb E
\left[
\sum_{t=1}^{T}r_t
\right]
\]
</div>

其中 <span class="math-inline" markdown="0">\(r_t\)</span> 是第 <span class="math-inline" markdown="0">\(t\)</span> 个任务的最终成功奖励。

---

### 2.2 第一步：Retrieve

当前任务为：

<div class="math-display" markdown="0">
\[
x_t
\]
</div>

从当前 Memory Bank：

<div class="math-display" markdown="0">
\[
\mathcal M_t
\]
</div>

中检索 top-<span class="math-inline" markdown="0">\(k\)</span> 个相关原始轨迹：

<div class="math-display" markdown="0">
\[
\hat{\boldsymbol{\xi}}_t
=
\mathcal R(x_t,\mathcal M_t)
\]
</div>

论文使用的是相对简单的 **BM25**，而且只根据历史任务描述做检索，不读取 trajectory 内容来计算相似度。

这说明 JitMem 的核心创新并不在 Retriever。

---

### 2.3 第二步：Curate

Memory Curator 同时读取：

- 当前任务 <span class="math-inline" markdown="0">\(x_t\)</span>；
- 检索出来的原始 trajectory <span class="math-inline" markdown="0">\(\hat{\boldsymbol{\xi}}_t\)</span>。

然后生成：

<div class="math-display" markdown="0">
\[
p_t
=
\pi_\phi
\left(
x_t,
\hat{\boldsymbol{\xi}}_t
\right)
\]
</div>

其中：

<div class="math-display" markdown="0">
\[
p_t
\]
</div>

被称为 **task-adaptive memory payload（任务自适应记忆载荷）**。

它不是简单摘要，而是一份为当前任务临时生成的 briefing，其中可能包含：

- 哪些历史最相关；
- 哪些成功策略应该复用；
- 哪些操作顺序重要；
- 对当前任务具体应该怎么做。

核心是：

<div class="math-display" markdown="0">
\[
p_t
\text{ depends on }
x_t
\]
</div>

因此同一个历史 trajectory，在两个不同任务下可以生成完全不同的 payload。

---

### 2.4 第三步：Execute

Executor 是一个冻结的 LLM：

<div class="math-display" markdown="0">
\[
\pi_L
\]
</div>

它不会随着 Curator 的 RL 一起训练。

Executor 接收：

<div class="math-display" markdown="0">
\[
x_t+p_t
\]
</div>

完成当前任务：

<div class="math-display" markdown="0">
\[
(\xi_t,r_t)
=
\pi_L(x_t,p_t)
\]
</div>

其中：

- <span class="math-inline" markdown="0">\(\xi_t\)</span>：当前执行产生的新 trajectory；
- <span class="math-inline" markdown="0">\(r_t\)</span>：任务结果。

这一步非常关键，因为最终 reward 可以直接评价：

> **刚才 Curator 生成的那份 Memory 到底有没有用。**

---

### 2.5 第四步：Update

任务结束后：

<div class="math-display" markdown="0">
\[
\mathcal M_{t+1}
=
\operatorname{Update}
(
\mathcal M_t,\xi_t,r_t
)
\]
</div>

但并不是所有 trajectory 都进入 Memory Bank。

论文默认只保存被 judge 判断为成功的 trajectory。

而且：

<div class="math-display" markdown="0">
\[
p_t
\]
</div>

本身**不会保存**。

因此 JitMem 的长期数据是：

<div class="math-display" markdown="0">
\[
\boxed{\text{Raw Experience}}
\]
</div>

而不是：

<div class="math-display" markdown="0">
\[
\boxed{\text{Curated Interpretation}}
\]
</div>

payload 只是一份当前任务临时产生的解释。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/flows/04-runtime-flow.png' | relative_url }}" alt="JitMem 检索、整理、执行和成功写回的运行时流程图" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / JitMem</p>
## 3. JitMem 最核心的范式变化：Memory 是“重建”，不是“回放”

传统系统更像：

<div class="math-display" markdown="0">
\[
\text{Past Experience}
\rightarrow
\text{Stored Summary}
\rightarrow
\text{Replay}
\]
</div>

JitMem 更像：

<div class="math-display" markdown="0">
\[
\text{Past Experience}
+
\text{Current Goal}
\rightarrow
\text{Reconstructed Memory}
\]
</div>

也就是说，它不假设一段经验存在一个永恒正确的摘要。

Memory 更像一个：

<div class="math-display" markdown="0">
\[
\boxed{\text{Task-conditioned View}}
\]
</div>

而原始 trajectory 才是真正的 source of truth。

从这个角度甚至可以把整个系统理解为：

<div class="math-display" markdown="0">
\[
\text{Raw Experience}
\xrightarrow[\text{Current Task}]{\text{Curator}}
\text{Compiled Context}
\xrightarrow{\text{Executor}}
\text{Action}
\]
</div>

因此 JitMem 实际上很接近一种：

> **Experience Compiler（经验编译器）**

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/images/05-reconstruct-imagegen.png' | relative_url }}" alt="JitMem 论文详细解读配图 5 / 18" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / JitMem</p>
## 4. 一个关键问题：既然 LLM 本来就能总结，为什么还要 RL？

这是理解论文最重要的一部分。

答案首先是：

> **JitMem 完全可以不做 RL。**

论文专门设计了 training-free 版本，例如：

- JitMem-base；
- JitMem-gpt；
- JitMem-gemini。

它们不更新 Curator 参数，只通过 prompt 让已有模型执行：

<div class="math-display" markdown="0">
\[
(Task,\ Retrieved\ Experience)
\rightarrow
Payload
\]
</div>

也就是说，JitMem 的核心思想并不依赖 RL 才成立。

---

### 4.1 Train-free Curator 在做什么

没有 RL 的 Curator 依赖 foundation model 原有能力：

- 阅读 trajectory；
- 判断相关信息；
- 总结经验；
- 类比当前任务；
- 拼接操作流程。

因此它优化的更接近：

<div class="math-display" markdown="0">
\[
\text{What looks like a useful summary?}
\]
</div>

或者：

<div class="math-display" markdown="0">
\[
P(p\mid x,\xi)
\]
</div>

其中 <span class="math-inline" markdown="0">\(p\)</span> 是一份看起来合理的 payload。

问题是：

> **自然语言意义上的“合理总结”，不等于真实环境里最有用的指导。**

一个 payload 可以语言非常漂亮、逻辑也很通顺，但 Executor 按它操作仍然失败。

---

### 4.2 RL 真正想解决的问题

RL 把评价标准从：

> “这是不是一个不错的总结？”

改成：

> **“Executor 拿到它以后，任务到底有没有做成功？”**

因此真正优化的是：

<div class="math-display" markdown="0">
\[
U(p)
=
P(
\text{Task Success}
\mid
p,\pi_L
)
\]
</div>

它训练的不是 Memory Bank，也不是 Executor。

训练对象只有：

<div class="math-display" markdown="0">
\[
\boxed{\pi_\phi}
\]
</div>

也就是：

> **如何从当前任务和历史轨迹中生成最有实际 downstream utility 的 Context。**

因此更准确地说：

<div class="math-display" markdown="0">
\[
\boxed{
\text{RL trains memory usage, not stored memory}
}
\]
</div>

甚至可以称为：

<div class="math-display" markdown="0">
\[
\boxed{
\text{RL for Context Compilation}
}
\]
</div>

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/flows/06-training-flow.png' | relative_url }}" alt="JitMem 训练闭环流程图" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / JitMem</p>
## 5. RL 过程到底怎么运行

### 5.1 Memory 在 RL 中是什么角色

先看完整关系：

<div class="math-display" markdown="0">
\[
s_t
=
(
x_t,
\hat{\boldsymbol{\xi}}_t
)
\]
</div>

它可以被理解成 Curator 的 observation。

Curator policy：

<div class="math-display" markdown="0">
\[
\pi_\phi
\]
</div>

生成 action：

<div class="math-display" markdown="0">
\[
a_t=p_t
\]
</div>

也就是一份 Memory Payload。

Executor 接收它之后完成任务，产生：

<div class="math-display" markdown="0">
\[
r_t
\]
</div>

因此可以抽象为：

<div class="math-display" markdown="0">
\[
(Task,Retrieved\ Memory)
\xrightarrow{\pi_\phi}
Payload
\xrightarrow{\pi_L}
Task\ Reward
\]
</div>

其中：

| 模块 | RL 中的角色 | 是否训练 |
|---|---|---|
| Current Task | Observation | 否 |
| Retrieved Raw Memory | Observation / Context | 否 |
| Retriever | Context Provider | 否 |
| Memory Curator | Policy | **是** |
| Curated Payload | Action | 生成 |
| Executor | Environment / Evaluator 的一部分 | 冻结 |
| Task Reward | Reward | 否 |

所以 Memory 本身不是参数。

它更像：

<div class="math-display" markdown="0">
\[
\boxed{\text{External State / Evidence}}
\]
</div>

---

### 5.2 为什么这个 RL 比传统 Write-time Memory 更容易训练

传统 Memory 在任务 <span class="math-inline" markdown="0">\(s\)</span> 完成之后生成：

<div class="math-display" markdown="0">
\[
m_s
\]
</div>

它的好坏可能要到遥远的未来任务 <span class="math-inline" markdown="0">\(t\)</span> 才能知道：

<div class="math-display" markdown="0">
\[
m_s
\rightarrow
x_{s+1}
\rightarrow
x_{s+2}
\rightarrow
\cdots
\rightarrow
x_t
\rightarrow
r_t
\]
</div>

因此 credit assignment 很困难。

但 JitMem 是：

<div class="math-display" markdown="0">
\[
p_t
\rightarrow
\text{Executor on }x_t
\rightarrow
r_t
\]
</div>

action 和 reward 发生在同一个任务上。

论文特别强调：

<div class="math-display" markdown="0">
\[
\boxed{\Delta t=0}
\]
</div>

也就是 Curator 的动作与 reward 之间没有跨任务 temporal gap。

因此原本的：

<div class="math-display" markdown="0">
\[
\text{Long-horizon Memory Learning}
\]
</div>

被改造成接近：

<div class="math-display" markdown="0">
\[
\text{Single-interaction Context Optimization}
\]
</div>

的问题。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/flows/07-credit-flow.png' | relative_url }}" alt="Write-time 和 Read-time Memory 的信用分配对比流程图" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / JitMem</p>
## 6. GRPO 到底训练了什么

### 6.1 对同一个任务生成多个 Payload

对于一个训练任务 <span class="math-inline" markdown="0">\(x_t\)</span>，先固定检索结果：

<div class="math-display" markdown="0">
\[
\hat{\boldsymbol{\xi}}_t
\]
</div>

然后 Curator 一次采样 <span class="math-inline" markdown="0">\(G\)</span> 个候选：

<div class="math-display" markdown="0">
\[
\left\{
p_t^{(1)},
p_t^{(2)},
\ldots,
p_t^{(G)}
\right\}
\]
</div>

论文中：

<div class="math-display" markdown="0">
\[
G=8
\]
</div>

也就是说，同样的当前任务、同样的历史 Memory，可以产生 8 种不同的“历史解释方式”。

---

### 6.2 每个 Payload 都真正执行一次任务

冻结的 Executor 分别尝试：

<div class="math-display" markdown="0">
\[
\pi_L(x_t,p_t^{(1)})
\]
</div>

<div class="math-display" markdown="0">
\[
\pi_L(x_t,p_t^{(2)})
\]
</div>

<div class="math-display" markdown="0">
\[
\cdots
\]
</div>

并得到 reward：

<div class="math-display" markdown="0">
\[
r_t^{(1)},
r_t^{(2)},
\ldots,
r_t^{(G)}
\]
</div>

在不同 benchmark 中：

- ALFWorld：binary success；
- <span class="math-inline" markdown="0">\(\tau^2\)</span>-bench：binary success；
- WebShop：连续任务分数。

因此 Curator 不需要人工定义“好 Memory 应该长什么样”。

只需要知道：

<div class="math-display" markdown="0">
\[
\text{哪一份 Payload 真正让下游任务更成功}
\]
</div>

---

### 6.3 GRPO Advantage

论文使用 group-relative advantage：

<div class="math-display" markdown="0">
\[
\hat A_i
=
r_t^{(i)}
-
\operatorname{mean}_{j}
r_t^{(j)}
\]
</div>

例如 8 个 payload 中：

<div class="math-display" markdown="0">
\[
r=
[0,1,0,1,1,0,0,0]
\]
</div>

平均 reward 为：

<div class="math-display" markdown="0">
\[
\bar r=0.375
\]
</div>

对于成功的 payload：

<div class="math-display" markdown="0">
\[
\hat A
=
1-0.375
=
0.625
\]
</div>

对于失败的 payload：

<div class="math-display" markdown="0">
\[
\hat A
=
0-0.375
=
-0.375
\]
</div>

因此 GRPO 会增加产生高 reward payload 的概率，降低产生低 reward payload 的概率。

---

### 6.4 论文的核心 GRPO Loss

论文给出的训练目标是：

<div class="math-display" markdown="0">
\[
\mathcal L_{\text{GRPO}}
=
-\frac{1}{G}
\sum_{i=1}^{G}
\hat A_i
\cdot
\log
\pi_\phi
\left(
p_t^{(i)}
\mid
x_t,
\hat{\boldsymbol{\xi}}_t
\right)
\]
</div>

其中：

- <span class="math-inline" markdown="0">\(G\)</span>：同一个任务采样的 payload 数量；
- <span class="math-inline" markdown="0">\(p_t^{(i)}\)</span>：第 <span class="math-inline" markdown="0">\(i\)</span> 个候选 payload；
- <span class="math-inline" markdown="0">\(\hat A_i\)</span>：相对同组其他 payload 的优势；
- <span class="math-inline" markdown="0">\(\pi_\phi\)</span>：Memory Curator；
- <span class="math-inline" markdown="0">\(x_t\)</span>：当前任务；
- <span class="math-inline" markdown="0">\(\hat{\boldsymbol{\xi}}_t\)</span>：当前检索到的历史 trajectory。

论文没有使用 value network，也省略了 advantage 的标准差归一化。

最重要的不是 GRPO 本身，而是：

<div class="math-display" markdown="0">
\[
r_t
=
f(p_t,x_t)
\]
</div>

reward 可以立即评价刚生成的 payload。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/flows/08-grpo-flow.png' | relative_url }}" alt="GRPO 比较多份 Payload 并更新 Curator 的流程图" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / JitMem</p>
## 7. RL 最终学到的不是“更漂亮的摘要”

从论文实验可以看到，RL 至少学到了下面几类能力。

### 7.1 学什么信息真正应该保留

假设历史 trajectory 有：

<div class="math-display" markdown="0">
\[
[A,B,C,D,E,F]
\]
</div>

一个通用 summarizer 可能认为：

<div class="math-display" markdown="0">
\[
A,C,E
\]
</div>

最重要。

但如果实际 rollout 反复发现：

> 删除 <span class="math-inline" markdown="0">\(D\)</span> 后 Executor 经常失败，

那么 RL 会逐渐提高：

<div class="math-display" markdown="0">
\[
P(D\mid x,\xi)
\]
</div>

换句话说，它学习的是：

<div class="math-display" markdown="0">
\[
\boxed{\text{Task-conditional Salience}}
\]
</div>

即：

> **什么信息对当前任务的真实成功率最重要。**

---

### 7.2 学应该抽象到什么粒度

一段历史既可以总结成：

> “把物体放进目标容器。”

也可以保留：

> “先导航到目标容器 → 确认容器状态 → 获取物体 → 必要时再次打开容器 → 放置。”

哪个更合适，很难通过人工规则统一定义。

RL 直接通过：

<div class="math-display" markdown="0">
\[
r^{\text{task}}
\]
</div>

来选择。

因此它实际上在学习：

<div class="math-display" markdown="0">
\[
\text{Optimal Abstraction Granularity}
\]
</div>

---

### 7.3 学程序性语义，而不只是语义相似

论文 Figure 4 的分析很关键。

未训练 Curator 往往产生比较 generic 的 action sequence。

经过 RL 后，它开始保留环境中特定的操作程序，例如：

> 先移动到 desklamp，再利用 desklamp examine bowl。

这种信息并没有被写在 Curator prompt 中。

它是通过最终任务 reward 逐渐学到的。

因此：

<div class="math-display" markdown="0">
\[
\boxed{
\text{RL does not merely improve wording}
}
\]
</div>

而是在学习：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Environment-specific Procedural Semantics}
}
\]
</div>

---

### 7.4 学如何组合多段历史

一个任务可能需要：

<div class="math-display" markdown="0">
\[
M_1^{\text{find}}
+
M_2^{\text{state change}}
+
M_3^{\text{placement}}
\]
</div>

而不是简单复制某一个最相似 case。

所以 Curator 的作用更像：

<div class="math-display" markdown="0">
\[
\boxed{\text{Experience Composer}}
\]
</div>

它在把多个过去经验中的部分结构重新组合成当前任务需要的 Context。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/flows/09-execution-example-flow.png' | relative_url }}" alt="先走到台灯旁再用台灯检查碗的执行步骤图" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / JitMem</p>
## 8. 为什么不能只做 SFT

理论上当然可以训练：

<div class="math-display" markdown="0">
\[
(Task,Memory)
\rightarrow
\text{Gold Payload}
\]
</div>

但最大的问题是：

> **Gold Payload 本身很难定义。**

同样的任务可能存在多个正确的 Memory 表达。

语言最完整、最像人类专家总结的 payload，也不一定让 Executor 成功率最高。

SFT 本质上优化：

<div class="math-display" markdown="0">
\[
P(
p
\mid
p_{\text{human}}
)
\]
</div>

而 JitMem 真正想优化的是：

<div class="math-display" markdown="0">
\[
P(
\text{Task Success}
\mid
p
)
\]
</div>

所以 RL 的价值在于：

> **不需要人工定义“理想的中间 Memory 表示”，只需要能够定义最终任务 reward。**

---

## 9. 训练时为什么把 Memory Bank 固定住

部署时：

<div class="math-display" markdown="0">
\[
\mathcal M_t
\]
</div>

会不断增长。

但是 Curator RL 训练阶段，作者先运行 base Executor，收集成功 trajectory，构造一个固定训练 Memory Bank。

训练期间这个 bank 不变。

原因是：

如果：

<div class="math-display" markdown="0">
\[
\text{Memory Input Distribution}
\]
</div>

不停变化，那么 reward 改变时，很难区分：

- 是 Curator 真变好了；
- 还是这次刚好检索到更好的历史。

所以训练阶段尽可能保持：

<div class="math-display" markdown="0">
\[
\hat{\boldsymbol{\xi}}_t
\]
</div>

的数据分布稳定。

这样：

<div class="math-display" markdown="0">
\[
\Delta r
\]
</div>

更容易归因于：

<div class="math-display" markdown="0">
\[
\Delta p
\]
</div>

也就是 payload quality。

作者也测试了 staged bank refresh：先训练 100 steps，再用训练后的 Curator 重建训练 bank，然后再继续训练 50 steps。

提升存在，但并不大，说明固定 bank 已经能够提供较稳定的训练信号。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/images/10-sftbank-imagegen.png' | relative_url }}" alt="JitMem 论文详细解读配图 10 / 18" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / JitMem</p>
## 10. Train-free 已经有效：说明架构本身就是主要创新

这是论文非常重要的一组结果。

### 10.1 Qwen3-8B Executor

| 方法 | ALFWorld SR | WebShop SR |
|---|---:|---:|
| No Memory | 47.9 | 9.8 |
| ReasoningBank | 55.7 | 11.4 |
| SkillOS-base | 53.1 | 13.6 |
| SkillOS（RL） | 61.2 | 16.5 |
| JitMem-base | 60.5 | 11.7 |
| **JitMem（RL）** | **77.4** | **32.8** |

与最强 write-time baseline SkillOS 相比：

<div class="math-display" markdown="0">
\[
77.4-61.2=+16.2
\]
</div>

<div class="math-display" markdown="0">
\[
32.8-16.5=+16.3
\]
</div>

---

### 10.2 Gemini-2.5-Pro Executor

| 方法 | ALFWorld SR | WebShop SR |
|---|---:|---:|
| No Memory | 66.4 | 38.4 |
| SkillOS-gemini | 79.3 | 41.0 |
| JitMem-base | 80.0 | 44.4 |
| **JitMem（RL）** | **86.2** | **50.5** |
| JitMem-gemini（train-free） | 81.9 | **61.0** |

特别值得注意的是：

<div class="math-display" markdown="0">
\[
\text{JitMem-gemini WebShop}=61.0
\]
</div>

而：

<div class="math-display" markdown="0">
\[
\text{SkillOS-gemini}=41.0
\]
</div>

两者 Curator 都是 Gemini-2.5-Pro，但仅仅把 curation 从 write time 移到 read time，就产生非常大的差距。

这说明：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Architecture Gain}
\neq
\text{RL Gain}
}
\]
</div>

JitMem 的核心有效性首先来自：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Task-conditioned Read-time Curation}
}
\]
</div>

RL 是在这个正确结构上的进一步增益。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/images/11-results-imagegen.png' | relative_url }}" alt="JitMem 论文详细解读配图 11 / 18" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / JitMem</p>
## 11. RL 的增益是否真的来自“使用 Memory”

作者做了一个非常重要的消融。

训练完成后，故意让 Retriever 返回空集合：

<div class="math-display" markdown="0">
\[
\hat{\boldsymbol{\xi}}_t=\varnothing
\]
</div>

也就是说 Curator 只能依赖自己的参数知识生成建议。

结果：

- ALFWorld SR 最多下降约 **14.8pp**；
- WebShop SR 最多下降约 **15.2pp**。

甚至会下降到 JitMem-base 附近或更低。

因此：

<div class="math-display" markdown="0">
\[
\boxed{
\text{RL Gain}
\neq
\text{Curator simply learned the task}
}
\]
</div>

而更接近：

<div class="math-display" markdown="0">
\[
\boxed{
\text{RL learned how to distill retrieved experience}
}
\]
</div>

这也是论文证明 RL 有实际意义的核心证据。

---

## 12. Task Conditioning 到底重要不重要

作者还去掉了 Current Task：

<div class="math-display" markdown="0">
\[
p_t
=
\pi_\phi(
\hat{\boldsymbol{\xi}}_t
)
\]
</div>

Curator 退化成一个普通 trajectory summarizer。

### Train-free 情况

性能最多下降：

- ALFWorld：约 3.1pp；
- WebShop：约 4.6pp。

### RL 后

性能最多下降：

- ALFWorld：约 11.4pp；
- WebShop：约 10.4pp。

这说明 RL 学到的不是单纯：

<div class="math-display" markdown="0">
\[
\text{better compression}
\]
</div>

而是：

<div class="math-display" markdown="0">
\[
\boxed{
Task
\times
Experience
\rightarrow
Useful Context
}
\]
</div>

也就是：

> **“同一段过去，对这个任务到底意味着什么？”**

---

## 13. 为什么一定要保留 Raw Trajectory

作者将原始 trajectory 先用 ReasoningBank 风格进行 write-time distillation：

<div class="math-display" markdown="0">
\[
\xi
\rightarrow
\tilde m
\]
</div>

再让 JitMem 从：

<div class="math-display" markdown="0">
\[
\tilde m
\]
</div>

中生成当前 payload。

性能明显下降：

- ALFWorld：下降约 1.7–2.9pp；
- WebShop：下降约 6.8–8.2pp。

原因很直接：

<div class="math-display" markdown="0">
\[
\text{Information Lost at Write Time}
\]
</div>

无法通过：

<div class="math-display" markdown="0">
\[
\text{Better Read-time Curator}
\]
</div>

重新生成。

因此论文实际建立了一个很强的原则：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Source of Truth}
\neq
\text{Task-specific Memory Representation}
}
\]
</div>

Raw trajectory 是 source of truth。

Payload 只是某一个具体任务下的 view。

---

## 14. 为什么论文只优先保存成功 trajectory

JitMem 默认只让成功 trajectory 进入 Memory Bank。

作者也测试：

> 成功与失败全部存储，但附上 success/failure label。

结果依然下降：

- ALFWorld：下降约 1.5–2.9pp；
- WebShop：下降约 2.3–3.4pp。

即使显式告诉模型：

> “这是一条失败案例。”

失败轨迹仍然会给 retrieval 和 curation 带来噪声。

这说明：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Memory Quality Filtering}
>
\text{Simply Adding Outcome Metadata}
}
\]
</div>

至少在论文当前 benchmark 和设计下成立。

但这并不意味着所有真实系统都应该永久丢弃失败经验；更准确的结论是：

> **失败经验需要更明确的用途建模，而不是直接与成功示例混入同一 Memory Pool。**

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/images/12-ablation-imagegen.png' | relative_url }}" alt="JitMem 论文详细解读配图 12 / 18" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / JitMem</p>
## 15. Executor Transfer：Curator 是否学成了某个模型的“外挂 Prompt”

论文用 Qwen3-8B Executor 训练 Curator。

然后直接换成更强 Executor，而不重新训练 Curator。

在 ALFWorld：

| Curator 训练方式 | Qwen3-8B Executor | GPT-5.4 Executor |
|---|---:|---:|
| 无训练 | 60.5 | 79.3 |
| 用 Qwen3-8B 训练 | 77.4 | 86.7 |
| 直接用 GPT-5.4 训练 | — | 88.1 |

Transfer gap：

<div class="math-display" markdown="0">
\[
88.1-86.7=1.4
\]
</div>

只有约 1.4 SR。

这表明 Curator 学到的不完全是：

> “如何写一段 Qwen 最喜欢的 Prompt。”

它至少在一定程度上学到了可迁移的：

<div class="math-display" markdown="0">
\[
\boxed{
\text{General Curation Strategy}
}
\]
</div>

这也是把 Curator 与 Executor 解耦的重要价值。

---

## 16. Context 效率：JitMem 不只是更准，也在压缩 Executor 负担

ALFWorld + GPT-5.4 Executor：

| 方法 | Executor 输入 Token | 输出 Token | Steps |
|---|---:|---:|---:|
| No Memory | 9.0K | 1.40K | 17.8 |
| ReasoningBank | 19.7K | 1.26K | 16.2 |
| SkillOS-base | 22.4K | 1.36K | 16.9 |
| JitMem-base | 10.9K | 1.00K | 13.2 |
| **JitMem** | **9.8K** | **0.87K** | **11.6** |

论文报告：

- 相比 write-time 方法，JitMem 显著降低 Executor 输入 token；
- 执行 steps 也更少；
- RL 相比 JitMem-base 又进一步降低 input/output token 与步骤数。

这意味着 Curator 做的不是：

<div class="math-display" markdown="0">
\[
\text{Give Executor More Memory}
\]
</div>

而是：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Higher-density Task-relevant Context}
}
\]
</div>

不过这里要注意：

> 表格统计的是 **Executor-side** 成本。

JitMem 每个任务还额外增加了一次 Curator LLM 调用。

因此论文证明的是：

<div class="math-display" markdown="0">
\[
\text{Executor Context Cost}\downarrow
\]
</div>

而不能直接推出：

<div class="math-display" markdown="0">
\[
\text{Total System Cost}\downarrow
\]
</div>

这是它实际部署时需要重新核算的问题。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/flows/13-transfer-flow.png' | relative_url }}" alt="Curator 迁移到不同 Executor 的流程图" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">13 / JitMem</p>
## 17. τ²-bench：收益并不是所有领域都一致

GPT-5.4 Executor 下：

| 方法 | Airline | Retail | Telecom | Macro | Micro |
|---|---:|---:|---:|---:|---:|
| No Memory | 65.0 | 79.8 | 50.2 | 65.0 | 65.0 |
| ReasoningBank GPT-5.4 | 65.0 | 84.6 | 61.6 | 70.4 | 71.7 |
| JitMem-gpt | 63.5 | 84.0 | **72.6** | **73.4** | **75.6** |

总体相对 strongest baseline：

<div class="math-display" markdown="0">
\[
\text{Macro}: +3.0
\]
</div>

<div class="math-display" markdown="0">
\[
\text{Micro}: +3.9
\]
</div>

但最大收益主要来自 Telecom。

论文分析认为，Telecom 更依赖复杂、多步骤、程序性的 policy verification。

而 Airline / Retail 中，Memory 方法对 No Memory 并没有稳定显著的提升。

因此更准确的结论是：

<div class="math-display" markdown="0">
\[
\boxed{
\text{JIT Memory is especially valuable when reusable procedural structure exists}
}
\]
</div>

而不是：

> “所有任务加 JitMem 都一定更好。”

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/images/14-boundary-imagegen.png' | relative_url }}" alt="JitMem 论文详细解读配图 14 / 18" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">14 / JitMem</p>
## 18. 这篇论文真正的创新点

### 18.1 Read-time Curation

从：

<div class="math-display" markdown="0">
\[
\xi \rightarrow m
\]
</div>

改成：

<div class="math-display" markdown="0">
\[
(x,\xi)\rightarrow p_x
\]
</div>

让 Memory 解释依赖当前任务。

---

### 18.2 Raw Trajectory Preservation

长期保存：

<div class="math-display" markdown="0">
\[
\text{Raw Evidence}
\]
</div>

而不是永久绑定：

<div class="math-display" markdown="0">
\[
\text{One Interpretation}
\]
</div>

因此未来仍然可以重新抽象。

---

### 18.3 Immediate Credit Assignment

传统 write-time：

<div class="math-display" markdown="0">
\[
m_s
\rightarrow
\cdots
\rightarrow
x_t
\rightarrow
r_t
\]
</div>

JitMem：

<div class="math-display" markdown="0">
\[
p_t
\rightarrow
x_t
\rightarrow
r_t
\]
</div>

将跨任务 delayed reward 变成当前任务 immediate reward。

---

### 18.4 Curator / Executor Decoupling

Curator：

<div class="math-display" markdown="0">
\[
\pi_\phi
\]
</div>

负责 Context 构造。

Executor：

<div class="math-display" markdown="0">
\[
\pi_L
\]
</div>

负责完成任务。

两者分离，因此一个 Curator 可以服务多个 Executor。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/images/15-innovation-imagegen.png' | relative_url }}" alt="JitMem 论文详细解读配图 15 / 18" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">15 / JitMem</p>
## 19. 这篇论文的优点

### 19.1 问题定义比具体算法更重要

论文真正改变的是：

> **Memory 应该什么时候被解释。**

这比简单发明一个新的存储格式更接近架构级创新。

---

### 19.2 Train-free 就能证明核心假设

论文没有把所有收益都归因于 RL。

相反，zero-shot / prompted Curator 已经能明显胜过多个 write-time 方法。

这让结论更可信：

<div class="math-display" markdown="0">
\[
\text{Read-time Curation}
\]
</div>

本身就是有效因素。

---

### 19.3 RL 信用分配非常干净

Curator 生成 payload 后：

<div class="math-display" markdown="0">
\[
p_t
\rightarrow
r_t
\]
</div>

马上得到 reward。

相比跨任务 Memory Writer，优化目标更直接、更容易归因。

---

### 19.4 不需要人工定义 Gold Memory

Memory 本身是 latent intermediate representation。

很难人工规定：

> “最好的 Memory 应该写成什么。”

论文直接通过 downstream task reward 优化它，这是很自然的目标设计。

---

### 19.5 模块化较强

Retriever、Curator、Executor 相互分离。

特别是 Curator 可以跨 Executor transfer，使它更接近一个独立 Agent Runtime 组件。

---

## 20. 这篇论文的局限

### 20.1 Retriever 过于简单

论文只使用：

<div class="math-display" markdown="0">
\[
BM25
\]
</div>

而且只搜索历史 task description。

当 Memory Bank 变成：

- 大规模；
- 长期运行；
- 多领域；
- 多模态；
- 大量高度相似任务；

检索很可能先成为瓶颈。

如果 relevant evidence 根本没进入：

<div class="math-display" markdown="0">
\[
\hat{\boldsymbol{\xi}}_t
\]
</div>

Curator 再强也没有意义。

---

### 20.2 Raw Trajectory 长期存储成本高

JitMem 避免信息丢失的代价是：

<div class="math-display" markdown="0">
\[
\text{Storage Volume}\uparrow
\]
</div>

随着任务长期运行：

<div class="math-display" markdown="0">
\[
|\mathcal M_t|\rightarrow \text{very large}
\]
</div>

因此最终仍然需要：

- 分层存储；
- 索引；
- 去重；
- 冷热数据；
- episode segmentation；
- 历史淘汰策略。

论文并没有真正解决长期 Memory Bank 生命周期问题。

---

### 20.3 每个任务增加一次 Curator 调用

虽然 Executor token 下降，但增加：

<div class="math-display" markdown="0">
\[
\text{Curator LLM Call}
\]
</div>

总成本需要计算：

<div class="math-display" markdown="0">
\[
C_{\text{total}}
=
C_{\text{retrieval}}
+
C_{\text{curator}}
+
C_{\text{executor}}
\]
</div>

而论文主要展示的是：

<div class="math-display" markdown="0">
\[
C_{\text{executor}}
\]
</div>

下降。

真实系统应比较 total latency、总 token、并发资源和吞吐量。

---

### 20.4 Payload Format 仍然是人工设计

不同 benchmark 使用了不同的 curator prompt / payload 结构。

因此当前系统更接近：

<div class="math-display" markdown="0">
\[
\text{Learned Payload Content}
+
\text{Hand-designed Payload Interface}
\]
</div>

还没有真正学习：

> “Memory 最理想的输出结构是什么。”

---

### 20.5 Reward 只保证 Utility，不保证 Faithfulness

Curator 的优化目标实际是：

<div class="math-display" markdown="0">
\[
P(
\text{Executor Success}
\mid
p
)
\]
</div>

而不是：

<div class="math-display" markdown="0">
\[
P(
p
\text{ faithfully represents raw history}
)
\]
</div>

因此 RL 理论上可能学到 shortcut：

> 某种表达即使不是最忠实的经验总结，但更容易让当前 Executor 得到高 reward。

这意味着：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Utility-optimal Representation}
\neq
\text{Truth-optimal Representation}
}
\]
</div>

在对事实正确性要求较高的系统里，需要额外的 grounding / faithfulness 约束。

---

### 20.6 目前只在 Task 开始时 Curate 一次

现实 Agent 执行过程中会不断出现：

<div class="math-display" markdown="0">
\[
o_1,o_2,\ldots,o_n
\]
</div>

新的 observation 可能彻底改变：

- 当前假设；
- 需要检索的经验；
- 任务阶段；
- 所需 procedure。

因此“一次 task 一次 curation”可能仍然过于静态。

论文自己也把 turn-level / step-level adaptive curation 作为未来方向。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/images/16-limits-imagegen.png' | relative_url }}" alt="JitMem 论文详细解读配图 16 / 18" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">16 / JitMem</p>
## 21. 可以怎样继续改进

### 21.1 从 JIT Curation 进一步变成 Event-triggered Curation

当前：

<div class="math-display" markdown="0">
\[
x_t
\rightarrow
\text{Curate Once}
\]
</div>

可以扩展成：

<div class="math-display" markdown="0">
\[
(x_t,o_{1:k},state_k)
\rightarrow
\text{Re-curate?}
\]
</div>

即先学习一个触发器：

<div class="math-display" markdown="0">
\[
g(s_k)\in\{0,1\}
\]
</div>

只有在：

- 新证据出现；
- plan failure；
- uncertainty 上升；
- task phase 转换；
- policy branch 改变；

时重新构造 Memory。

这样可以避免每一步都重新调用 LLM，同时让 Memory 真正动态适应执行过程。

---

### 21.2 联合学习 Retrieval 与 Curation

当前：

<div class="math-display" markdown="0">
\[
\mathcal R
\]
</div>

固定。

未来可以优化：

<div class="math-display" markdown="0">
\[
\max_{\theta,\phi}
\mathbb E[r]
\]
</div>

其中：

- <span class="math-inline" markdown="0">\(\theta\)</span>：Retriever；
- <span class="math-inline" markdown="0">\(\phi\)</span>：Curator。

系统不仅学习：

> “如何使用 Memory”

还学习：

> “当前任务到底应该找哪段过去。”

---

### 21.3 从纯文本 Payload 变成 Structured Payload

当前 payload 基本是自然语言。

可以设计成：

<div class="math-display" markdown="0">
\[
p=
(
Facts,
Procedure,
Constraints,
Exceptions,
Uncertainty,
Sources
)
\]
</div>

例如：

```text
Relevant experience:
- ...

Reusable procedure:
1. ...
2. ...

Critical constraints:
- ...

Non-transferable details:
- ...

Uncertainty:
- ...

Evidence source:
- trajectory_18.step_4
```

优势是：

- 更容易验证；
- 更容易定位 hallucination；
- 更容易控制 Executor；
- 更容易做 token budgeting。

---

### 21.4 给 Reward 增加 Faithfulness

原始：

<div class="math-display" markdown="0">
\[
R=R_{\text{task}}
\]
</div>

可以扩展：

<div class="math-display" markdown="0">
\[
R
=
R_{\text{task}}
+
\lambda_1R_{\text{faithfulness}}
+
\lambda_2R_{\text{compression}}
-
\lambda_3R_{\text{unsupported}}
\]
</div>

分别约束：

- Task success；
- 对原始 trajectory 的忠实性；
- Context 信息密度；
- 无依据的推断。

这样可以避免 Curator 只为适配 Executor 而形成 shortcut。

---

### 21.5 Raw + Abstract 双层 Memory

完全只存 raw trajectory 在长期生产系统中未必最经济。

更可行的结构可能是：

<div class="math-display" markdown="0">
\[
\text{Raw Episodic Memory}
+
\text{Cached Abstraction}
\]
</div>

其中：

- Raw trajectory 是 source of truth；
- 高频、稳定模式生成 cached abstraction；
- 当前任务简单时直接读取 abstraction；
- ambiguity 高或 abstraction 不足时，再回溯 raw trajectory；
- JIT Curator 最终统一产生 task-specific payload。

因此不是：

<div class="math-display" markdown="0">
\[
Raw\rightarrow Summary\rightarrow Delete\ Raw
\]
</div>

而是：

<div class="math-display" markdown="0">
\[
Raw
\rightarrow
\begin{cases}
Cached\ Abstraction\\
Task\text{-}specific\ JIT\ Payload
\end{cases}
\]
</div>

这既保留可恢复性，也降低在线计算成本。

---

### 21.6 更进一步：把 Curator 理解成 Context Compiler

JitMem 最值得继续发展的方向，也许不是继续叫“Memory Optimizer”。

它本质上正在学习：

<div class="math-display" markdown="0">
\[
\boxed{
(Task,Experience)
\rightarrow
Optimal Context
}
\]
</div>

所以可以进一步把问题扩展成：

<div class="math-display" markdown="0">
\[
Context
=
f(
Task,
Memory,
Tools,
Rules,
Observations,
User State
)
\]
</div>

此时 Curator 不再只管理 Memory，而成为：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Context Compilation Policy}
}
\]
</div>

这可能比“Memory System”本身更接近它最终的价值。

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/images/17-future-imagegen.png' | relative_url }}" alt="JitMem 论文详细解读配图 17 / 18" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">17 / JitMem</p>
## 22. 最终总结：这篇论文到底改变了什么

JitMem 最重要的结论，不是“RL 可以优化 Memory”。

更准确地说，它提出了三个层次的观点。

### 第一层：不要过早决定一段经验“是什么意思”

传统：

<div class="math-display" markdown="0">
\[
\text{Experience}
\rightarrow
\text{Fixed Interpretation}
\]
</div>

JitMem：

<div class="math-display" markdown="0">
\[
\text{Experience}
\rightarrow
\text{Raw Evidence}
\]
</div>

等当前任务出现之后：

<div class="math-display" markdown="0">
\[
(\text{Evidence},\text{Task})
\rightarrow
\text{Interpretation}
\]
</div>

因此：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Memory abstraction should be late-bound}
}
\]
</div>

---

### 第二层：JIT 本身就有效，RL 是第二层优化

Training-free JitMem 已经能显著超过多个 write-time memory 方法。

因此：

<div class="math-display" markdown="0">
\[
\text{JIT Architecture}
\]
</div>

和：

<div class="math-display" markdown="0">
\[
\text{RL Optimization}
\]
</div>

必须分开理解。

前者解决：

> **什么时候解释 Memory。**

后者解决：

> **什么样的解释最能提高最终任务成功率。**

---

### 第三层：RL 真正训练的是 Context Curation Policy

RL 的输入是：

<div class="math-display" markdown="0">
\[
(
Current\ Task,
Retrieved\ Experience
)
\]
</div>

输出：

<div class="math-display" markdown="0">
\[
Task\text{-}Adaptive\ Payload
\]
</div>

reward：

<div class="math-display" markdown="0">
\[
r^{\text{task}}
\]
</div>

因此真正学习的是：

<div class="math-display" markdown="0">
\[
\boxed{
\pi_\phi:
(Task,Experience)
\rightarrow
Useful Context
}
\]
</div>

它不是在直接训练 Memory，而是在训练：

<div class="math-display" markdown="0">
\[
\boxed{
\text{How to use past experience for the current task}
}
\]
</div>

从这个角度看，JitMem 的意义已经超出了“长期 Memory”。

它更像是在提出一种新的 Agent Context 范式：

> **经验长期保存为证据，解释则在运行时按任务即时生成。**

最终可以把整篇论文浓缩成一句话：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Store first, interpret when needed.}
}
\]
</div>

而 RL 做的事情则是：

<div class="math-display" markdown="0">
\[
\boxed{
\text{Learn how to interpret it for utility.}
}
\]
</div>

---

## 参考

- Yefan Zhou, Yang Li, Zeyu Leo Liu, Semih Yavuz, Shafiq Joty. **Just-in-Time Memory: Learning to Curate Task-Adaptive Memory for LLM Agents**. arXiv:2609.27334, 2026.
- arXiv: https://arxiv.org/abs/2609.27334
- HTML Full Text: https://arxiv.org/html/2609.27334v1
- PDF: https://arxiv.org/pdf/2609.27334

---

</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/paper-notes/jitmem-detailed-explainer/images/18-summary-imagegen.png' | relative_url }}" alt="JitMem 论文详细解读配图 18 / 18" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">18 / JitMem</p>
## 补充：RL 训练的到底是哪一个环节的模型？是反思的模型还是执行的模型？

训练的是 **Memory Curator，也就是更接近“反思 / 经验整理”这一侧的模型**，**不是执行模型 Executor**。

更准确地说，JitMem 里有两类模型：

<div class="math-display" markdown="0">
\[
\text{Curator } \pi_\phi
\quad\rightarrow\quad
\text{生成当前任务要用的 Memory Payload}
\]
</div>

<div class="math-display" markdown="0">
\[
\text{Executor } \pi_L
\quad\rightarrow\quad
\text{拿着 Payload 真正执行任务}
\]
</div>

RL 更新的是前者：

<div class="math-display" markdown="0">
\[
\boxed{\pi_\phi}
\]
</div>

Executor：

<div class="math-display" markdown="0">
\[
\boxed{\pi_L}
\]
</div>

在训练 Curator 时是 **冻结的，不更新参数**。

整个训练闭环是：

<div class="math-display" markdown="0">
\[
(\text{Task},\ \text{Retrieved Memory})
\rightarrow
\underbrace{\text{Curator}}_{\text{RL训练}}
\rightarrow
\text{Payload}
\rightarrow
\underbrace{\text{Executor}}_{\text{冻结}}
\rightarrow
\text{Reward}
\]
</div>

比如同一个任务，Curator 生成 8 份不同 Memory：

<div class="math-display" markdown="0">
\[
p_1,p_2,\ldots,p_8
\]
</div>

Executor 分别拿这 8 份 Memory 去执行：

<div class="math-display" markdown="0">
\[
p_1\rightarrow r_1
\]
</div>

<div class="math-display" markdown="0">
\[
p_2\rightarrow r_2
\]
</div>

<div class="math-display" markdown="0">
\[
\cdots
\]
</div>

如果 <span class="math-inline" markdown="0">\(p_2\)</span> 让 Executor 成功，而 <span class="math-inline" markdown="0">\(p_1\)</span> 导致失败，GRPO 就会更新 **Curator**，让它以后更容易生成类似 <span class="math-inline" markdown="0">\(p_2\)</span> 的 Memory。

所以 Executor 在这里其实承担了两个角色：

> 一方面它是真正干活的执行模型；另一方面，它和环境一起构成了 Curator 的“效果测试器”。

但 **reward 虽然是 Executor 执行后产生的，梯度并不会去训练 Executor**。

还有一个术语上的细微区别：我不太建议直接把 Curator 叫“反思模型”。它和 Reflection 很像，但它不是典型的：

<div class="math-display" markdown="0">
\[
\text{我刚刚为什么失败？}
\rightarrow
\text{反思}
\]
</div>

而是：

<div class="math-display" markdown="0">
\[
\text{当前任务}
+
\text{过去若干经验}
\rightarrow
\text{现在最值得给 Executor 什么经验}
\]
</div>

所以更准确可以叫：

**Memory Curator / Context Curator / 经验整理模型**。

一句话记住就是：

<div class="math-display" markdown="0">
\[
\boxed{
\text{RL 训练“怎么给执行模型准备经验”的模型，而不是训练执行模型本身。}
}
\]
</div>
</div>
</section>
