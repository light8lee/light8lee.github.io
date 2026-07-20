---
layout: post
title: "CURE：把反思训练成可检验的下一步搜索"
date: 2026-07-20 12:00:00 +0800
summary: "从统一的 Solve—Verify—Hint—Fresh Re-solve 闭环出发，拆解 CURE 如何用下游重解结果训练批评提示，并讨论经验回放、多轮收益与真实 Agent 场景中的边界。"
tags: [CURE, 强化学习, GRPO, 自我改进, 反思, RLVR, Agent]
cover: /assets/pages/cure/images/01.png
body_class: maxrl-post
permalink: /pages/cure.html
---

> 论文解读：*CURE: Critique-Driven Unified Reinforcement Learning*<br>
> Chen et al. · ACL 2026 Long Paper · Outstanding Paper<br>
> [论文](https://aclanthology.org/2026.acl-long.1321/) · [官方代码](https://github.com/RUCBM/CURE)

许多“让模型多想一轮”的方案都有同一个风险：第一轮的错误前提、变量设定和叙事框架仍留在上下文中，于是后续看似在修正，实际只是在旧轨迹上打补丁。CURE 的问题更具体：**能否把一次失败压缩成一条会改变下一次搜索方向的提示，并只用后续结果来检验它有没有用？**

先给出本文的结论：CURE 并不把反思视为一段看起来合理的文字。它把反思中的高层 Hint 当作一个行动信号；只有 Hint 让后续重新求解的成功率超过原始水平，它才获得正向训练信号。旧错误推理被丢弃，模型带着“该检查什么”而非“刚才怎样错下去”重新开始。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/001-cure-loop.png' | relative_url }}" alt="CURE 的 Solve、Verify、Hint 与 Fresh Re-solve 闭环" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">MAP / The closed loop</p>

## 一张图看懂：保留方向，丢掉错误草稿

模型先根据题目求解，再验证答案。验证通过就结束；若发现错误，模型生成一条高层 Hint，并将旧答案丢弃。下一轮输入只有 **原题 + Hint**，而不是“原题 + 错误解答 + 一段批评”。

这条信息边界是 CURE 的关键设计。它试图保留失败中最有价值的部分——下一次搜索该朝哪里转向——同时隔离最容易造成锚定的具体错误轨迹。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/01.png' | relative_url }}" alt="CURE 提出的问题：失败后能否换一种搜索思路" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / Thesis</p>

## 更多推理时间，不必然意味着更好的搜索

普通 RLVR 已经能训练模型把数学题或代码题做对，但当首答失败时，额外采样常常只是得到更多候选，或沿着第一份错误草稿局部修补。模型未必学会从失败里提取可迁移的策略。

CURE 要训练的则是一个会复盘的求解者：先判断当前答案是否可信；若不可信，识别最早的关键错误；再将这次失败压缩成一条不泄露答案的搜索指令；最后从头求解。重点不是“多想一遍”，而是**用失败改变下一次的搜索空间**。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/02.png' | relative_url }}" alt="ACL 2026 Outstanding Paper CURE 的论文信息" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / Scope</p>

## 同一套 policy，同时承担四种行为

论文将普通解题、自我验证、批评生成和提示后的重探索统一进一个策略。训练时可以使用正确答案、答案检查器或单元测试判断结果；部署时这些外部信号不再作为输入，模型只根据题目运行自己的闭环。

这使它与“外部大模型写批评、学生模型据此修改”的管线不同：CURE 的目标是把诊断和定向再探索**内化**到同一个模型中。也正因此，训练时可验证奖励的质量、验证开关的可靠性和多轮成本，都会成为方法能否落地的关键条件。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/03.png' | relative_url }}" alt="CURE 的普通解题、批评、提示重解和经验回放框架" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / Framework</p>

## 三类轨迹，构成一个训练闭环

可以把 CURE 看成同一轮 RL 中并存的三种数据：

<pre><code>普通解题：      x → y
批评生成：      (x, y) → (验证结论 v, 高层提示 h)
提示重解：      (x, h) → y′</code></pre>

普通解题产生初始候选组；批评轨迹从题目和一个候选答案中产出验证与提示；提示重解则在新条件下生成完整的新答案。对于少数最困难、初答全错但提示后成功的题目，成功的 <code>y′</code> 还会以遮蔽 Hint 的形式回流到普通解题组。这不是简单串接几段 prompt，而是让每段输出拥有各自的奖励与 credit assignment。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/04.png' | relative_url }}" alt="普通解题产生候选答案和初始正确率基线" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / Initial solve</p>

## 初始候选组既是样本来源，也是基线

对题目 <code>x</code>，模型先采样 <code>K</code> 份候选 <code>y</code>，由答案检查器或单元测试标记正确与否。这里最重要的产物不是一份“标准解”，而是同题初始解答的平均成功率：

$$
b(x)=\frac{1}{K}\sum_{k=1}^{K}r_k.
$$

它代表模型在还没有获得任何策略提示时的原始水平。论文特别选取两类样本：<strong>zero-pass</strong>（初答全错）暴露最困难、最缺学习信号的题；<strong>partial-pass</strong>（同题有对有错）则适合学习分辨答案何时可信。正确与错误样本还需要大致平衡，否则模型可能学到“总说有错”这种投机策略。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/05.png' | relative_url }}" alt="CURE 批评生成的验证结论、最早错误、影响原因和高层提示" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / Critique</p>

## 一段批评，包含“开关”与“导航”

给定 <code>(x, y)</code>，批评模块需要产出四类信息：是否发现错误的验证结论、最早影响最终结论的错误片段、错误为何造成问题，以及一条不泄露答案的高层 Hint。前面的验证结论有真值可查，可以直接监督模型“该不该进入重解”；真正需要经由下游检验的是 Hint。

有效 Hint 不是“再仔细检查”这类泛泛提醒，也不是直接报出正确答案。它应该改变后续的检索角度，例如“检查该方程是否具有变量置换对称性”“重新核对边界条件是否覆盖所有分支”或“验证数据结构不变量是否被破坏”。它提供的是搜索方向，而不是答案补丁。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/06.png' | relative_url }}" alt="CURE 通过重解成功率计算 Hint 的延迟奖励" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / Delayed reward</p>

## Hint 的奖励来自它带来的后果

对一条批评中的 Hint <code>h_i</code>，模型在相同的 <code>(x, h_i)</code> 条件下采样 <code>M</code> 次重解。每份重解有自己的 0/1 可验证奖励；它们的平均值再加上格式项，构成该 Hint 的奖励：

$$
R(c_i)=\frac{1}{M}\sum_{j=1}^{M}r'_{i,j}+R_{\text{format}}(c_i),
\qquad
A_{\text{hint}}=R(c_i)-b(x).
$$

<code>R_format</code> 用来惩罚缺少必要字段、遗漏高层 Hint 或 Hint 过短等格式问题。更本质的是 <code>A_hint</code>：若 Hint 带来的平均成功率没有超过初始候选组基线，它就不会因为措辞漂亮而被强化。论文主要比较“有这条 Hint 是否超过原始水平”，而非让同题的多个 Hint 做显式两两 PK。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/07.png' | relative_url }}" alt="CURE 的提示重解只使用原题和高层提示" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Fresh re-solve</p>

## 丢掉旧解，不等于丢掉失败经验

提示重解的主训练形式是 <code>(x, h) → y′</code>。旧答案的错误公式、变量假设、局部推导和最终结论不会进入下一轮；留下来的只有高层策略。例如，从“答案应当是 6”中逃离出来，转而执行“检查变量对称性与等价变换”。

这可以理解为对失败轨迹做一次有损压缩：丢弃易传播的具体错误，保留能改变搜索方向的抽象知识。它针对的是锚定偏差——如果错误草稿仍在上下文中，模型很容易改一行算式却继续服从错误前提；从原题加 Hint 重新开始，更有机会探索真正不同的路线。

一个数论例子很直观：模型找到正整数三元组 <code>(1, 2, 3)</code> 后，便断言它是唯一解。好的 Hint 不会泄露剩余答案，而会提醒“检查变量置换对称性”。搜索问题于是从“是否还有更大的解”变为“当前解是否代表一组等价排列”，模型才会补齐六种排列。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/08.png' | relative_url }}" alt="A hint 和 A guided 分别训练导航提示与具体重解路径" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / Credit assignment</p>

## 两类 advantage，奖励两种不同的行为

容易混淆的地方在于：<code>A_hint</code> 与 <code>A_guided_j</code> 都来自重解，却不训练同一段输出。

| 信号 | 更新对象 | 比较基准 | 回答的问题 |
| --- | --- | --- | --- |
| <code>A_hint</code> | 批评轨迹中的 Hint 与后续批评 token | 同题初始候选组的平均成功率 | 这条导航是否真的改变了搜索？ |
| <code>A_guided_j</code> | 第 <code>j</code> 条重解 <code>y′_j</code> 的 token | 同一 <code>(x,h)</code> 下的 <code>M</code> 条重解 | 给定导航后，这条具体路径好不好？ |

固定 Hint 后，每条 <code>y′_j</code> 先保留自己的 0/1 结果，再按 GRPO 在该组内计算相对优势。于是 Hint 学的是“给什么方向有用”，重解答案学的是“如何沿着这个方向重新推理”。若一组重解全对或全错，组内相对信号会减弱；这正是可验证 RL 中全同奖励组难学习的常见问题。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/09.png' | relative_url }}" alt="CURE 将 zero-pass 中成功的提示重解回放到普通解题组" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / Experience replay</p>

## 把“提示后突破”回灌为无提示能力

经验回放只针对 zero-pass：同题的初始 <code>K</code> 个普通答案全错，但在 <code>(x,h) → y′</code> 的提示重解后第一次出现正确答案。此时 CURE 遮蔽 Hint，将成功轨迹作为 <code>x → y′</code> 放回普通解题组，并与原始错误候选重新计算 GRPO 的组内优势。

这一点看上去像 SFT，却不是固定人工标注上的离线模仿。<code>y′</code> 来自当前策略在提示条件下的在线采样，随后经可验证奖励确认，并继续通过相对奖励和策略梯度更新。选择性只回放 zero-pass 的成功重解也很重要：若把所有提示条件下的成功答案都伪装成普通解题轨迹，输入分布偏移会损害单轮能力与训练稳定性。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/10.png' | relative_url }}" alt="CURE 在部署时只以题目为输入，自主完成验证和重解" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / Deployment</p>

## 训练依赖 verifier，部署依赖内化的闭环

训练期，正确答案、单元测试或检查器用来标记 <code>y</code> 与 <code>y′</code> 的对错，并判断验证结论是否正确。部署期，外部教师、正确答案和检查器都不应再成为模型的额外输入；线上只有题目 <code>x</code>，模型自行输出初答、验证、Hint 与重解。

因此 CURE 的优势并非“任何情况下都比外部奖励模型更强”，而是当部署时无法持续调用外部评审器时，仍能进行自主、定向的再探索。需要区别的是：它内化的是训练期间学得的验证与策略能力，不是凭空获得一个永远可靠的真值检查器。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/11.png' | relative_url }}" alt="CURE 在多轮自我改进中的数学任务结果" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / Evidence</p>

## 结果的重点是多轮收益能否持续

论文中的代表性结果显示，CURE 的单轮优势并不夸张，重点在于它能继续将额外推理预算转化为改进。以 Qwen2.5-7B 为例，数学任务平均准确率从单轮的 <strong>42.0%</strong> 提升到最多 8 轮后的 <strong>44.9%</strong>；GRPO 从 <strong>41.0%</strong> 仅到 <strong>41.4%</strong>。AIME 2025 从 <strong>11.8%</strong> 提升到 <strong>16.0%</strong>，自验证 F1 从 <strong>62.9%</strong> 提升到 <strong>76.3%</strong>。

正确的解读是：在论文给定的数学、代码任务、模型、轮数与评测条件下，CURE 更能让多轮过程产生有效改进；这不等于它在所有测试时策略中都占优。尤其当可以使用外部奖励模型进行 Best-of-N 重排序时，CURE 并非总是更强。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/12.png' | relative_url }}" alt="CURE 的自主闭环、边界与后续方向" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / Boundaries</p>

## 三个尚未被闭环解决的问题

第一，<strong>验证误判会过早停止循环</strong>：错误答案若被误判为正确，模型就不会触发重解。需要置信度校准、多视角验证，或把额外推理预算留给高不确定性样本。

第二，<strong>“彻底丢弃”未必总是最优</strong>：长证明、代码修复和工具调用中，旧轨迹里可能含有已经被外部验证过的中间事实、报错或测试失败信息。更细的设计应当保留可信状态，只删除未经验证或已被判错的推理片段。

第三，<strong>可验证奖励限制了领域</strong>：数学和代码有明确检查器，写作、研究与复杂决策则没有干净的 0/1 终点。将开放任务拆成可验证子任务、保留多个评审者的分歧，并用后验结果校验提示效用，是比“让模型自由反思”更实际的下一步。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/cure/images/13.png' | relative_url }}" alt="CURE 的核心启发：让反思接受结果检验" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">13 / Takeaway</p>

## 反思不是好听的话，而是可检验的行动信号

CURE 最值得迁移的想法是：不要以批评文本是否流畅、是否像专家为终点；应当问它能否让后续行为更好，并把这份下游收益回传给生成批评的策略。

把这个原则迁移到真实 Agent，提示可以是“检查权限边界”“根据失败测试缩小根因”“先验证这个中间状态再继续调用工具”。关键仍是同一个：让失败信息改变下一步的搜索，同时用后续可观察的结果判断这种改变是否值得继续强化。
</div>
</section>

<section class="post-appendix" markdown="1">

## 延伸讨论：从 CURE 到真实 Agent 的设计问题

### 1. token 效率不等于低延迟

CURE 可以用更少的无效 token 换来更高的成功率，但多轮过程具有顺序依赖：先求解、再验证、再生成 Hint、再重解。困难任务上，这仍可能带来较长的端到端等待时间。实践中更合理的系统策略往往是“并行生成首轮候选，只对少数高价值或高不确定性候选串行自改”，而不是对所有任务一视同仁地展开完整闭环。

### 2. Hint 粒度需要自适应

Hint 太泛，例如“仔细检查”，不会改变搜索；太细则接近直接泄露答案。一个可探索的分层方案是：先输出策略标签（如对称性、边界、约束、工具状态），随后给出可局部验证的检查点，最后仅在必要时提供具体修复线索。每一层都可根据下游收益和泄露风险获得不同的训练信号。

### 3. 可信状态保留是 Agent 化的关键

在多工具环境中，编译器报错、测试失败、数据库查询结果和文件哈希不是“错误推理”，而是可验证的外部状态。把它们一并扔掉会损失已付出的工具成本；把所有历史都带入又会造成锚定和上下文膨胀。比“保留/删除”二选一更实用的方案，是把已验证状态与未验证推理分开存储，仅让前者跨轮传递。

### 4. 可以如何评价一条批评

除文本质量外，至少应同时记录四件事：验证判断是否正确；提示后的成功率相对基线提升多少；提示是否泄露答案或引入分布外依赖；在更多样本上是否仍有效。这样的指标组能区分“说得有道理”“碰巧修好了一个样本”与“稳定改变策略”，也是将 CURE 式闭环用于开放环境时的必要审计接口。

## 资料

- [ACL Anthology：CURE 论文页](https://aclanthology.org/2026.acl-long.1321/)
- [RUCBM/CURE 官方实现](https://github.com/RUCBM/CURE)

</section>
