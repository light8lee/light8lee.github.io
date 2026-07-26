---
layout: post
title: "ACL 2026 反馈优化（二）：奖励如何教 Agent 留下可复用技能？"
date: 2026-07-26 18:00:00 +0800
summary: "详解 SAGE：把相似任务串成 Sequential Rollout，用任务结果与技能复用奖励共同训练 Qwen2.5-32B Agent，并完整拆解采样、奖励、GRPO 更新、实验与边界。"
tags: [ACL 2026, Agent, Numeric Feedback, Reinforcement Learning, GRPO, Skill Library, SAGE, AppWorld]
category: LLM Post-training
cover: /assets/posts/acl-2026-numeric-feedback-sage/images/01.png
body_class: video-notes-post
series: feedback-optimization
---

# 一个 Agent 做对了任务，不等于它留下了能力

上一篇讨论的 [MARS、Prompt-Level Distillation 与 ANN]({{ '/llm%20post-training/2026/07/25/acl-2026-text-feedback.html' | relative_url }})，都把文字反馈写回模型外部：经验指令、System Prompt（系统提示词）规则库或多 Agent 工作流。第二章把视线移到参数更新：如果只给“当前任务是否成功”一个分数，模型为什么会主动留下下一次还能调用的 Skill（技能）？

ACL 2026 论文 [*Reinforcement Learning for Self-Improving Agent with Skill Library*](https://aclanthology.org/2026.acl-long.69/) 提出的 SAGE（Skill-Augmented GRPO for self-Evolution，面向自我演化的技能增强 GRPO）给出了一种端到端方案：把两个相似任务放进同一条 Sequential Rollout（顺序轨迹），让后一个任务真实调用前一个任务生成的 Skill，再把复用成败变成前后两个任务的训练信号。

它的核心不是“奖励写函数”这么简单，而是把奖励的时间跨度从**当前答案**延伸到**未来复用**。全文依次拆开 Agent 如何写、用、修、存 Skill；两任务链怎样采样；两类奖励怎样分别形成 Advantage（优势）；以及实验究竟证明了什么。口播未容纳的公式、训练计数、检索与消融实验全部收在附录。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/01.png' | relative_url }}" alt="数值反馈同时奖励当前任务成功和后续技能复用，并写回模型参数" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / Thesis</p>

## 数值反馈：答对 +1，复用再 +1

普通 outcome reward（结果奖励）只问“这一题完成了吗”。SAGE 在不放弃任务正确性的前提下，再问两件事：第一题有没有生成 Skill，第二题有没有真正调用它并成功。

因此反馈最终训练的是三种相互关联的行为：

1. 解决当前任务；
2. 把多步工具操作封装成以后可调用的 Skill；
3. 在相似的新任务中正确选择并使用已有 Skill。

这里的数值奖励会经由 GRPO（Group Relative Policy Optimization，组相对策略优化）更新 **Qwen2.5-32B-Instruct** 的参数。它与第一章的文本反馈不是同一个更新层：前者内化行为倾向，后者维护显式配置资产。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/02.png' | relative_url }}" alt="两条都完成当前任务的轨迹分别留下写死参数的一次性脚本和可复用函数" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / Blind spot</p>

## 普通奖励漏掉了什么：答对不代表可复用

假设两条轨迹都完成了“提醒客户 A 支付逾期账单”。一条把客户编号写死在连续 API 调用里，另一条生成 `remind_overdue(customer_id)`，把客户作为参数。对当前任务来说，两条轨迹都可以拿到 $+1$；对下一个客户来说，它们的价值完全不同。

只观察单题终点，奖励看不到：

- Skill 是真正组合了多个 API，还是只给单次调用换了名字；
- 输入是否被参数化，还是把当前实体写死；
- Skill 是否能被找到、正确调用并完成后续任务；
- 为复用付出的额外 token 和步骤是否值得。

这不是把 reward 写得“更细”就能完全解决的问题，因为可复用性必须等未来任务到来后才显现。SAGE 因此改变的不只是奖励项，还改变了 rollout 的采样单位。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/03.png' | relative_url }}" alt="SAGE 论文卡片展示顺序任务、技能生成调用和参数更新三个核心环节" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / Paper</p>

## SAGE：把“未来复用价值”放进奖励

论文研究的是 AppWorld 中的工具 Agent。AppWorld 提供模拟软件环境和可验证任务结果；每个 scenario（场景）包含三项指令相似、用户不同的任务。这种结构正好可以检验前一项任务形成的 Skill 能否迁移到后一项。

SAGE 的完整干预包含三部分：

- **Skill Library Agent**：用 CodeAct 风格生成并执行代码，把多个 API 操作封装成函数；
- **Sequential Rollout**：训练时从同一场景抽两项任务组成连续链，让第一题的 Skill Library 进入第二题上下文；
- **Skill-integrated Reward**：分别奖励 Skill 的有效生成与成功使用，再以 SAGE 目标更新同一个策略模型。

仅靠 prompt 要求开源模型“记得生成技能”并不稳定，所以论文没有直接从原始指令模型开始 RL，而是先用专家轨迹做 SFT（Supervised Fine-Tuning，监督微调），再进入 SAGE。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/04.png' | relative_url }}" alt="Agent 在连续轨迹中依次编写、调用、修复并保存技能" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / Skill cycle</p>

## 一次任务里的四个动作：写、用、修、存

SAGE 的 Skill 不是任务结束后由另一个模型总结出来的文字经验，而是当前策略模型在一条连续交互轨迹中真实生成和执行的代码：

1. **写（define）**：把多次 API 调用组合成一个可执行函数；
2. **用（invoke）**：在当前任务中立即调用，以真实环境结果检验它；
3. **修（update）**：执行失败时继续修改函数或调用方式；
4. **存（save）**：把成功形成的函数保留到 Skill Library，供后续任务读取。

这种设计让“Skill 质量”不只由代码表面判断。一个函数至少要先在当前轨迹中可执行，之后还要经受相似任务的复用检验。论文同时对“没有生成代码便直接结束”的响应施加 $-1$ 惩罚，用来维持 Agent 的代码交互格式。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/05.png' | relative_url }}" alt="任务一把账单检索、逾期筛选、提醒生成和发送封装成参数化技能" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / Task 1</p>

## Task 1：Skill 究竟应该留下什么

用一个与论文机制一致的解释性案例：任务一要求找出客户 A 的逾期账单并发送提醒。Agent 可以把操作拆成“检索账单—筛选逾期—生成提醒—发送”，再封装为 `remind_overdue(customer_id)`。

函数名并不等于复用性。真正关键的是它是否保留了任务结构、抽出了变化参数，并把 API 返回值正确传给下一步。把客户 A 的内部编号、固定日期或单一账单 ID 写进函数，仍然只是给一次性脚本套了一个可调用外壳。

因此，Task 1 的当前成功只能证明这段程序对 A 有效；它能否成为 Skill，要由下一项相似但实体不同的任务继续判断。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/06.png' | relative_url }}" alt="任务二换成客户 B 后写死参数的函数失败而参数化函数成功复用" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / Task 2</p>

## Task 2：换一个客户，才知道 Skill 是否通用

第二项任务换成客户 B。写死 A 的函数会在检索、权限或发送对象上失败；参数化函数只需传入 B，便可以复用相同的操作结构。

这一步把“代码看起来像技能”变成了“代码在后续任务中被实际使用且带来成功”。SAGE 的指标不是单独判断函数是否优雅，而是观察 Skill 使用事件与可验证 outcome 是否同时发生。换句话说，**调用不是成功，成功也不自动等于复用；只有带来任务成功的真实调用，才构成 Skill 奖励。**
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/07.png' | relative_url }}" alt="任务一生成技能进入同一轨迹的共享库，任务二调用结果再反向评价任务一" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Sequential Rollout</p>

## 两个任务不是两场独立考试

普通 GRPO 可以分别对两道题采样，计算各自结果，却无法让第二题验证第一题留下的资产。Sequential Rollout 把 $(q_1,q_2)$ 视为一个连续采样单元：

$$
q_1 \longrightarrow \text{生成/更新 Skill} \longrightarrow M_i^2
\longrightarrow q_2\text{ 读取并调用} \longrightarrow r_2
$$

训练主体使用两任务链，是对长期复用和训练成本的折中。更长的链更接近持续部署，却增加 rollout 成本、奖励不平衡和梯度方差。评估时，Agent 会在 AppWorld 同一 scenario 的三项任务中依次执行并累积 Skill；训练链长度与评估序列长度需要区分。

最重要的边界是：每条采样链拥有自己的 Library。不同 rollout 之间不会先汇总 Skill 再共同答第二题，否则 $q_2$ 的结果就无法归因到自己配对的 $q_1$。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/08.png' | relative_url }}" alt="任务结果奖励与技能生成使用奖励组成 R1 和 R2" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / Reward</p>

## 奖励怎么算：任务分 + 技能分

设两项任务可验证的 outcome reward 为 $r_1,r_2\in[0,1]$，$I_{\mathrm{skill}}(q_2\mid q_1)$ 表示 $q_2$ 是否调用了 $q_1$ 生成的 Skill。论文定义：

$$
R_1=r_1+\mathbf{1}[r_1=1]\mathbf{1}[r_2=1]I_{\mathrm{skill}}(q_2\mid q_1)
$$

$$
R_2=r_2+\mathbf{1}[r_2=1]I_{\mathrm{skill}}(q_2\mid q_1)
$$

$R_1$ 评价第一题：只有 $q_1$、$q_2$ 都成功，而且 $q_2$ 确实调用了 $q_1$ Skill，$q_1$ 才额外获得生成奖励。$R_2$ 评价第二题：$q_2$ 成功并发生调用，才额外获得使用奖励。

奖励没有把“复用”置于正确性之上。它明确阻止两种投机：生成一个没人使用的函数不能加分；调用一个导致任务失败的函数也不能加分。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/09.png' | relative_url }}" alt="三组计分卡展示任务失败、未调用技能和成功复用时的奖励差异" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / Reward examples</p>

## 三个分数：为什么“调用了”还不一定加分

在 Task 1 成功的前提下，三种情况最能说明奖励边界：

| 情况 | $q_1$ 结果 | $q_2$ 结果 | 是否调用 $q_1$ Skill | $R_1$ | $R_2$ |
|---|---:|---:|---:|---:|---:|
| $q_2$ 失败 | 1 | 0 | 不影响结论 | 1 | 0 |
| 两题成功但未调用 | 1 | 1 | 否 | 1 | 1 |
| 两题成功且成功调用 | 1 | 1 | 是 | 2 | 2 |

第三种情况同时强化两端：$q_1$ 学会生成以后有用的 Skill，$q_2$ 学会在合适的时候调用它。若 Agent 没有生成代码便结束任务，论文另外给 $-1$，这项格式惩罚与上表的任务/技能奖励是不同层面的约束。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/10.png' | relative_url }}" alt="同一任务对采样八条彼此独立的两任务链，共执行十六次任务" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / Group sampling</p>

## 一个 GRPO Group：八条完整链，不是十六条独立题

论文使用 $G=8$。对同一个任务对 $(q_1,q_2)$，SAGE 采样八条完整轨迹 $\tau_1,\ldots,\tau_8$。每条轨迹都从自己的空 Library 开始，先执行 $q_1$，再让 $q_2$ 只读取这一条链产生的 Skill。

因此：

- 一个 group 有 **8 条两任务链**；
- 计算量对应 **16 次任务执行**；
- $q_1$ 可以生成零个、一个或多个 Skill，不是每链固定一个；
- 八个 Library 彼此隔离，$q_2$ 不能借用其他链的结果。

论文每个 SAGE training step 从 24 个训练 scenario 各抽两项任务，形成 24 个任务对；按任务级输出计数是 $48\times8=384$ 个 rollout outputs，等价于 $24\times8=192$ 条两任务 Sequential Rollout。附录会把这个容易混淆的计数完整展开。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/11.png' | relative_url }}" alt="R1 和 R2 分别形成优势并作用于两项任务的输出 token，最后共同更新模型" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / Parameter update</p>

## R1、R2 分别比较，再共同更新

每条链得到一对 $(R_1,R_2)$。SAGE 不先把它们加成一个总分，而是按任务在链中的位置分别做组内比较：

$$
A_i^1=R_i^1-\operatorname{mean}_{j=1}^{G}(R_j^1),\qquad
A_i^2=R_i^2-\operatorname{mean}_{j=1}^{G}(R_j^2)
$$

论文版本不再用 reward 标准差归一化 Advantage，也不使用 KL divergence penalty（KL 散度惩罚）。$A_i^1$ 作用于 $q_1$ 的输出 token，训练“怎样完成任务并生成可复用 Skill”；$A_i^2$ 作用于 $q_2$ 的输出 token，训练“怎样完成任务并正确使用 Skill”。

两个 clipped policy objectives（截断策略目标）最后相加，更新同一个策略模型。聚合顺序是：每个输出内部按 token 数平均，$q_1$、$q_2$ 两项求和，八条链平均，最外层再对任务对与 rollout group 取期望。它不能简化成“先算 $R_1+R_2$，再跑一次普通 GRPO”。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/12.png' | relative_url }}" alt="Claude 专家轨迹先做监督微调，再用顺序轨迹和技能奖励进行 SAGE 训练" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / Training pipeline</p>

## 先学会基本格式，再学习长期复用

完整训练分成两个阶段：

1. **专家 SFT warm start**：Claude 3.5 Sonnet V2 在 Skill Library Agent 框架中生成高质量轨迹，经 rejection sampling（拒绝采样）保留有效经验，得到 1,129 个样本，对 Qwen2.5-32B-Instruct 做全参数 SFT；
2. **SAGE 强化学习**：从相似任务构造 Sequential Rollout，以 outcome reward 与 skill reward 计算分位置 Advantage，再更新模型参数。

这个初始化不是可忽略的实现细节。直接从 Base Model 开始 SAGE，在 Test Normal 上只有 TGC 40.7、SGC 25.6；专家 SFT 初始化后达到 TGC 72.0、SGC 60.7。Self-Distillation 与 RL Warm-Up 能改善直接初始化，但仍低于专家 SFT。因而论文结果同时依赖 SAGE 机制、专家数据与具体训练环境，不能把全部收益归给奖励公式。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/13.png' | relative_url }}" alt="报销任务一将税号、币种、发生地和费用类别检查封装为参数化函数" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">13 / Invoice example, Task 1</p>

## 贯穿案例：Task 1 生成报销检查函数

下面的报销案例是本文为了连接三章而构造的机制示意，不是 SAGE 论文中的原始任务。员工 A 上传一张美元跨境交通票据，Agent 需要读取税号、币种、发生地并匹配费用类别。

坏 Skill 把员工 A、美元和当前票据写死；好 Skill 把 `employee_id`、`currency` 与票据对象作为参数，并保留政策检查的操作结构。两者都可能完成第一次核验，但只有后者有机会在不同员工和币种上复用。

这个例子还提醒我们：SAGE 奖励的是“可带来后续成功的调用行为”，并不直接证明函数满足软件工程意义上的接口稳定、权限最小化、单元测试或版本兼容。这些治理要求需要系统额外提供。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/14.png' | relative_url }}" alt="报销任务二换成员工 B 和欧元，以复用结果决定两项任务是否获得技能奖励" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">14 / Invoice example, Task 2</p>

## Task 2 的结果决定额外奖励

第二项任务换成员工 B 和欧元。写死版本调用失败，$q_1$ 只能保留当前任务成功的 outcome 分；参数化版本传入新实体后完成核验，$q_1$ 和 $q_2$ 才分别获得 Skill Generation Reward 与 Skill Usage Reward。

奖励的因果方向因此被拉长：第二题的真实结果，反向评价第一题留下的函数。这比“让模型自己评论代码是否通用”多了一层环境验证，但仍然只覆盖采样到的相似任务。一个 Skill 在客户 B 或员工 B 上成功，不代表它已经通过跨软件、跨权限、异常输入或政策版本变化测试。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/15.png' | relative_url }}" alt="AppWorld Test Normal 上 GRPO 与 SAGE 的任务完成、场景完成、步骤和 token 对比" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">15 / Results</p>

## 实验结果：跨任务完成提高，交互成本下降

在 AppWorld Test Normal 上，论文报告：

| 方法 | TGC | SGC | 平均步骤 | 平均 token |
|---|---:|---:|---:|---:|
| GRPO（无 Skill Library） | 69.2 ± 2.7 | 51.8 ± 5.8 | 16.4 ± 0.2 | 3,613 ± 200 |
| SFT + GRPO | 66.1 ± 1.3 | 51.2 ± 0.8 | 12.8 ± 0.1 | 1,284 ± 18 |
| SAGE | **72.0 ± 1.5** | **60.7 ± 1.5** | **12.1 ± 0.2** | **1,475 ± 127** |

TGC（Task Goal Completion）计算单项任务成功；SGC（Scenario Goal Completion）要求一个 scenario 的三项任务全部成功，更能反映跨相似任务的持续完成。相对普通 GRPO，SAGE 的 SGC 提高 8.9 个百分点，平均步骤减少约 26%，token 减少约 59%。这些数字只支持本论文在 AppWorld 与 Qwen2.5-32B-Instruct 设置下的结论，不应外推成所有 Agent 环境的普遍收益。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/16.png' | relative_url }}" alt="SFT 加普通 GRPO 虽然生成更短但场景完成率低于 SAGE" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">16 / SFT comparison</p>

## 为什么不是只做 SFT：更短不等于更会复用

为了公平区分“专家模仿”和“技能复用奖励”，论文让 baseline GRPO 使用与 SAGE 相同的 SFT checkpoint。SFT + GRPO 的平均 token 只有 1,284，比 SAGE 的 1,475 更短，但 SGC 为 51.2，低于 SAGE 的 60.7。

这说明专家轨迹可以教会更紧凑的动作模式和 Skill 格式，却不会自动优化跨任务复用。SAGE 的增量来自任务链与专门奖励，而不是仅仅因为训练前见过 Claude 的轨迹。

另一项分析显示，SAGE 生成的 Skill 数量可能更少，却更复杂有效：其 361 个 Skill 中 356 个（约 99%）组合了多个 API；Base Model 的 439 个 Skill 中有 362 个（约 82%）达到这一标准。数量不是 Skill Library 质量的充分指标。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/17.png' | relative_url }}" alt="SAGE 已验证范围、尚未证明的迁移能力和外部技能治理建议并列展示" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">17 / Boundaries</p>

## 先分清论文已验证与尚未证明

论文已经验证的是：

- AppWorld 模拟软件环境；
- 主体训练在同一 scenario 内构造两任务链；
- Qwen2.5-32B-Instruct 先经专家 SFT，再进行 SAGE；
- 测试时同场景三项任务顺序执行并共享 Skill；
- Test Challenge 包含训练、开发与 Test Normal 未见的 API，SAGE 仍取得 TGC 50.1、SGC 32.4。

论文没有证明的是：跨真实软件、跨组织权限或跨领域的稳定迁移；奖励 Skill 调用也不能保证不会过度封装、错误复用或绕过外部政策。

本文的延伸建议是让 Skill 保持为可审核、可版本化的外部资产，并记录来源样本、接口、测试、权限、适用范围和回滚条件；同时让 SAGE 训练“何时生成、调用和修复”。这是工程组合设想，不是论文已经联合验证的结论。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-numeric-feedback-sage/images/18.png' | relative_url }}" alt="SAGE 论文英文标题、作者和 ACL 2026 会场信息" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">18 / Source</p>

## 原始论文与一句话结论

SAGE 最重要的贡献，不是让 Agent 多写几个函数，而是给跨任务复用建立了可归因的训练路径：**后一个任务是否成功使用 Skill，既训练后一个任务的调用行为，也反向训练前一个任务的生成行为。**

论文：Jiongxiao Wang, Qiaojing Yan, Yawei Wang, Yijun Tian, Soumya Smruti Mishra, Zhichao Xu, Megha Gandhi, Panpan Xu, Lin Lee Cheong. [*Reinforcement Learning for Self-Improving Agent with Skill Library*](https://aclanthology.org/2026.acl-long.69/). ACL 2026 Long Papers.
</div>
</section>

---

<section class="post-appendix" markdown="1">

## 附录 A：完整采样与目标函数

### A.1 一条 Sequential Rollout 中的状态边界

对任务对 $(q_1,q_2)$ 的第 $i$ 条轨迹：

1. $q_1$ 开始时的 Skill Library $M_i^1$ 为空；
2. $q_1$ 可以生成零个、一个或多个 Skill；
3. 这些 Skill 构成本轨迹自己的 $M_i^2$；
4. $q_2$ 只读取 $M_i^2$，不读取其他 rollout 的 Library；
5. $q_2$ 完成后，系统才能判断 $q_1$ Skill 是否被成功复用。

训练配置使用 $G=8$。每个 step 选择 24 个 scenario，每个 scenario 抽两个 task，得到 24 个任务对、48 个任务位置；每个任务对采样八条链，因此可写成 $48\times8=384$ 个 task-level rollout outputs，或 $24\times8=192$ 条 two-task chains。两种计数描述的是同一批计算。

### A.2 R1 与 R2 为什么不能先相加

每条链分别得到 $R_i^1$ 与 $R_i^2$，再在同一位置的八个 reward 中计算组内相对 Advantage：

$$
A_i^k=R_i^k-\frac{1}{G}\sum_{j=1}^{G}R_j^k,\quad k\in\{1,2\}
$$

论文不再除以 reward 标准差。设 $o_i^k$ 是第 $i$ 条链对 $q_k$ 的输出，$L_{i,k,t}(\theta)$ 是带 clipped importance ratio 的单 token 策略项，可以先写两个中间目标：

$$
J_1(\theta)=\mathbb{E}\left[\frac{1}{G}\sum_{i=1}^{G}\frac{1}{|o_i^1|}\sum_tL_{i,1,t}(\theta)\right]
$$

$$
J_2(\theta)=\mathbb{E}\left[\frac{1}{G}\sum_{i=1}^{G}\frac{1}{|o_i^2|}\sum_tL_{i,2,t}(\theta)\right]
$$

最终 $J(\theta)=J_1(\theta)+J_2(\theta)$，等价展开为：

$$
J(\theta)=\mathbb{E}\left[\frac{1}{G}\sum_{i=1}^{G}\sum_{k=1}^{2}\frac{1}{|o_i^k|}\sum_tL_{i,k,t}(\theta)\right]
$$

公式中没有显式的 $1/2$：$q_1$ 与 $q_2$ 的目标是求和，不是再对两者平均。最外层期望覆盖采样的任务对与 rollout group。

## 附录 B：图片未单独承载的实验

### B.1 Skill 是否真的有用

将评估时的 Skill Library 清空后，SAGE 的 Test Normal SGC 从 60.7 降到 54.8，平均步骤从 12.1 增到 16.0，token 从 1,475 增到 1,937；TGC 只从 72.0 小幅降到 71.4。这个差异说明 Skill 对跨任务全部完成与效率更敏感，也解释了为什么论文同时报告 TGC 和 SGC。

未经训练的 Skill Library Agent 则出现相反警告：启用 Skill 时 SGC 从 14.9 提高到 19.6，步骤和 token 下降，但 TGC 从 34.7 降到 30.7。基础模型会生成和调用 Skill，不代表它会正确使用；低质量复用可以伤害单题结果。

### B.2 检索不是可有可无的外围模块

主体评估使用理想化的 Same Scenario 检索。论文也比较了实际检索方式：

| 检索方式 | TGC | SGC | 平均步骤 | 平均 token |
|---|---:|---:|---:|---:|
| Same Scenario | 72.0 | 60.7 | 12.1 | 1,475 |
| Query N-gram | 72.0 | 60.1 | 12.7 | 1,466 |
| Query Embedding | 69.6 | 59.5 | 11.8 | 1,335 |
| Skill Embedding | 66.3 | 56.0 | 14.5 | 1,692 |

Query N-gram 最接近理想条件，是因为同一 AppWorld scenario 的查询结构高度相似；语义 embedding 可能跨场景召回表面相关但难以适配的 Skill。因此，线上系统的最终效果同时取决于“学会复用”和“检索到正确资产”。

### B.3 没有 scenario 标签也能构造训练链

论文遮蔽原 scenario 标签后，用 `all-MiniLM-L6-v2` 做相似任务搜索，再从近邻中采样 $q_2$。Test Normal 的 Similarity Search 得到 TGC 72.8、SGC 62.5、13.0 步、1,535 token；与 Same Scenario 的 72.0、60.7、12.1 步、1,475 token 接近，但成本略高。这说明预定义场景标签不是形式上的必需条件，不过相似度构造质量仍会决定训练信号是否可归因。

### B.4 Skill-integrated Reward 的消融

| 奖励设计 | TGC | SGC | 平均步骤 | 平均 token |
|---|---:|---:|---:|---:|
| Skill-integrated | **72.0** | **60.7** | **12.1** | 1,475 |
| Outcome-based | 69.8 | 55.4 | 13.1 | 1,469 |
| Chain-based | 67.9 | 56.6 | 15.7 | **1,361** |

只奖励各题结果，或在整条链成功时统一加分，都弱于分别归因 Skill 生成与使用。Skill-integrated Reward 的步骤最少，但 token 不是最低，可能来自生成 Skill 本身的额外文本成本。

### B.5 更长的链没有自动更好

三任务链的 Test Normal 结果为 TGC 70.6、SGC 54.8、14.3 步、2,585 token，低于两任务链的 72.0、60.7、12.1 步、1,475 token。论文分析的两个原因是：相似任务往往在第一题就生成主要 Skill，导致生成奖励与使用奖励沿位置分布不均；链越长，后段任务还会引入更大的梯度方差。长期复用不等于简单延长训练链。

## 附录 C：从论文机制到部署系统的延伸

以下内容是跨论文归纳与工程建议，不是 SAGE 已经验证的结果。

### C.1 显式资产与参数内化需要同时保留

MARS、PLD 的规则可读、可回滚，却可能膨胀和冲突；SAGE 的参数更新能形成更自然的生成与调用行为，却难以解释某次参数变化为何发生。一个更稳妥的组合是：用 SAGE 学习何时生成、选择、修复和调用 Skill，同时把 Skill 正文保留为外部资产，接受版本、测试、权限和审计管理。

### C.2 不要把所有反馈压成一个总 reward

至少应区分 task correctness（任务正确性）、skill reuse value（技能复用价值）、environment failure（环境失败）、safety risk（安全风险）、user preference（用户偏好）与 uncertainty（不确定性）。SAGE 的 Skill Reward 解决的是其中一类长期价值，不应该覆盖权限违规、错误检索或用户风格偏好。

### C.3 所有 Skill 与更新都要带 provenance

每个 Skill 至少记录：来源任务与生成模型、输入输出 schema、依赖 API、适用范围、成功/失败调用、最近验证结果、权限、版本与回滚条件。这样才能把模型参数层难以解释的变化，与外部资产层可追踪的证据重新连接起来。

### C.4 验证跨层负迁移

外部规则可能要求某字段必须核验，而参数化策略可能为了获得复用奖励选择绕过规则；检索器也可能把相似但权限不同的 Skill 送进上下文。上线前应至少覆盖规则一致性、Skill 调用正确性、错误复用、权限隔离、OOD（分布外）输入、版本兼容与回滚测试。

## 附录 D：来源与内容边界

- 本文方法、公式、训练设置与实验数字来自 [ACL Anthology 论文页](https://aclanthology.org/2026.acl-long.69/) 及其 PDF。
- 客户账单与企业报销是为了说明机制而构造的示意案例，不是论文原始 AppWorld 样例。
- “外部 Skill 保留版本、测试与权限”“typed feedback”“跨层负迁移测试”属于本系列的延伸思考，不是论文结论。
- 本文没有把不同论文、不同数据集上的绝对分数横向排名；所有结果都限定在 SAGE 论文自己的实验设置内。

</section>
