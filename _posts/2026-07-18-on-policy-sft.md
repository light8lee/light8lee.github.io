---
layout: post
title: "On-Policy SFT：让正确答案更像模型自己会写的答案"
date: 2026-07-18 12:00:00 +0800
summary: "从 DDT 的分布兼容分、IDFT 的 token 级软调节，到 Hinted Decoding 的双流改写，理解一条更接近 on-policy 的监督微调路线。"
tags: [LLM, 后训练, SFT, On-Policy, IDFT, Hinted Decoding, 强化学习]
category: LLM Post-training
cover: /assets/posts/on-policy-sft/images/01.png
body_class: video-notes-post
---

# On-Policy SFT：让正确答案更像模型自己会写的答案

> 论文解读：*Towards On-Policy SFT: Distribution Discriminant Theory and its Applications in LLM Training*  
> [论文](https://arxiv.org/abs/2602.12222) · [HTML 全文](https://arxiv.org/html/2602.12222) · [代码](https://github.com/zhangmiaosen2000/Towards-On-Policy-SFT)

这篇工作关心的不是“答案对不对”这一件事，而是第二个常被忽略的问题：**这份正确答案，是否适合当前模型直接逐 token 学习？**

它提出一条保留 SFT 简洁流程、但尽量贴近 on-policy 数据分布的路线：DDT 判断 token 是否自然，Hinted Decoding 把正确知识改写为更可学的轨迹，IDFT 再控制每个 token 的学习强度。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/01.png' | relative_url }}" alt="On-Policy SFT 的核心问题" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / Thesis</p>

## 正确，不等于适合照抄

一条教师答案即使完全正确，其表达方式、推理顺序或中间跳步也可能远离学生模型的当前分布。强迫模型模仿这些陌生模式，可能获得局部知识，同时扰动已有能力；论文将此视为 SFT 与 RL 泛化差距的一个重要来源，而非全部解释。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/02.png' | relative_url }}" alt="普通 SFT 与 on-policy 训练的区别" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / Problem</p>

## 普通 SFT 忽略了分布距离

标准 SFT 把参考答案的每个 token 都视为同等训练目标。相对地，RL 通常先采样当前模型能够产生的轨迹，再用奖励强化其中较好的部分；训练数据因而天然更靠近当前 policy。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/03.png' | relative_url }}" alt="DDT 判断 token 分布兼容性" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / DDT</p>

## DDT：寻找相对上下文“不自然”的 token

只看目标 token 的绝对概率不够：0.05 在一个高度确定的上下文里很异常，在开放式语境里却可能正常。DDT 因而同时考虑目标 token 的对数概率和当前位置预测分布的熵，区分“困难但合理”与“真正偏离分布”。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/04.png' | relative_url }}" alt="Centered Log-Likelihood 公式" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / CLL</p>

## φ：token 的分布兼容分

论文用 Centered Log-Likelihood 定义

$$
\varphi_t=\log p_t(x_t)+H[p_t].
$$

第一项表示模型是否认可目标 token；熵项校正当前位置原本的预测难度。若 token 来自模型自身分布，$\varphi$ 的期望为 0：接近 0 表示兼容，明显为负则表示相对上下文异常。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/05.png' | relative_url }}" alt="分布差异集中在少数关键 token" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / Signal</p>

## 问题常集中在少数关键位置

两条答案即使整体风格不同，大部分 token 仍受共同语法和内容约束。真正暴露分布差异的，往往是陌生的证明跳步、连接方式、格式或突然改变的推理方向；这也使得 token 级而非样本级处理成为必要。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/06.png' | relative_url }}" alt="IDFT 对 token 级损失做软调节" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / IDFT</p>

## IDFT：把判断变成学习动作

DDT 负责识别，IDFT 则将 $\varphi_t$ 放入 token 级损失中，连续调节梯度：极度负的 token 被抑制，接近 0 的 token 正常学习，模型已高度认可的正值 token 得到更强巩固。它不是在数据入口粗暴删除样本。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/07.png' | relative_url }}" alt="IDFT 的三档软调节" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Soft weighting</p>

## 软调节比硬过滤更稳妥

消融中，二值阈值过滤呈现倒 U 型：阈值太严会丢掉困难但有价值的数据，太松又会保留严重 OOD 噪声。IDFT 的意图是保留合适挑战，同时避免异常 token 猛烈拉动参数。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/08.png' | relative_url }}" alt="Hinted Decoding 把数据变得可学习" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / Data rewriting</p>

## 只改损失还不够

若教师与学生相距过远，降低某些 token 的权重仍然两难。Hinted Decoding 先改写训练轨迹：正确答案提供方向，学生模型保留自身更自然的语言和推理习惯，得到“正确且像自己”的示范。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/09.png' | relative_url }}" alt="Hinted Decoding 的双流" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / Dual streams</p>

## 同一个模型，两个上下文

它不是两个不同模型，而是同一模型以两套上下文前向计算：答案感知流看到题目与正确答案，学生流只看到原题。二者各自产生下一个 token 的分布，为生成一条新的训练轨迹提供候选。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/10.png' | relative_url }}" alt="几何融合双流分布" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / Fusion</p>

## 两路分布不是二选一

在推理阶段，方法在对数概率空间对答案流 $p$ 与学生流 $q$ 加权融合。答案流的熵低、指向明确时，它承担更多引导；熵高时，学生流拥有更多主导权。采样出的 token 会同步追加到两条上下文中。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/11.png' | relative_url }}" alt="避免错误推理加正确结论" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / Guardrail</p>

## 防止“错误推理 + 正确结论”

混合只用于推理阶段；遇到最终答案分隔符后，生成切回纯学生流，并用答案验证器过滤。这样可避免已知正确答案一路牵引，掩盖中间推理已经走错的假阳性。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/12.png' | relative_url }}" alt="完整 On-Policy SFT 流水线" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / Pipeline</p>

## 把三部分串成一条流水线

模型先独立回答：答对的样本保留真实 on-policy 轨迹，答错时才借助正确答案执行 Hinted Decoding。通过验证的轨迹汇入训练集，再采用普通 SFT 或 IDFT；前者在数据层对齐分布，后者在损失层控制学习强度。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/13.png' | relative_url }}" alt="论文中的实验结果" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">13 / Evidence</p>

## 实验结果该如何理解

论文在其指定的数学任务、模型与离线 RL 基线上报告：HD+SFT / HD+IDFT 能以较低计算预算达到或超过部分 DPO、SimPO 结果。这个结论应限定在论文的模型、任务、指标和离线基线内；它不等于已经取代完整的在线 RL。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/14.png' | relative_url }}" alt="On-Policy SFT 的边界和未来方向" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">14 / Scope</p>

## 适用范围与未完成的问题

主要证据来自具有客观验证器的数学任务，不能直接外推到偏好、安全或价值对齐；通用能力遗忘只是缓解，并未完全消失。在线 batch 重生成、代码与 Agent 扩展是作者提出的未来方向，不应当作已验证结果。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/on-policy-sft/images/15.png' | relative_url }}" alt="On-Policy SFT 总结" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">15 / Takeaway</p>

## 一句话记住这篇工作

不要让模型生硬模仿老师怎样说；先将正确知识翻译为模型更自然、更容易吸收的解法，再有选择地学习。DDT 负责判断像不像自己，Hinted Decoding 负责改写数据，IDFT 负责控制学习强度。
</div>
</section>

## 补充笔记：把细节补全

### 1. 一个更具体的 DDT 例子

设目标 token 的概率都为 0.05。它本身并不能说明什么：

- 场景 A：“法国的首都是……”——模型通常对关键 token 很确定。若答案突然给出另一个城市，0.05 相对这个低熵上下文就很可疑；
- 场景 B：“请为这篇文章写一个有创意的开头……”——存在大量合理续写，整体熵高，0.05 可能完全正常。

所以 CLL 并不把“低概率”直接当作“坏数据”。它先问模型此刻有多犹豫，再判断目标 token 是否相对异常。对一整条回答，可以累加各位置的 $\varphi_t$：模型自身生成的序列通常围绕 0 波动，而明显分布外的外部序列常被少数极端 token 拉出持续向下的轨迹。

### 2. IDFT 的三档含义

| token 状态 | DDT 判断 | IDFT 的训练行为 |
|---|---:|---|
| 明显偏离当前分布 | $\varphi_t$ 很负 | 抑制更新，避免被异常 token 强行拉动 |
| 接近当前分布 | $\varphi_t$ 接近 0 | 正常学习 |
| 模型高度认可 | $\varphi_t$ 为正 | 更强地巩固稳定、可吸收的模式 |

这可以理解为一种能力感知的课程学习：先稳定吸收模型已能理解的部分；对距离过远的部分暂时降低更新；随着模型适应，它们可能在后续训练中变得可学。公开实现还会截断调节范围，以避免极端权重。

### 3. 为什么要同时改写数据

对已高度对齐的 instruct / thinking 模型，教师轨迹与学生轨迹可能相差很远。此时只改损失会陷入两难：强学会破坏既有能力，过度压低权重又学不到新知识。Hinted Decoding 选择先改写数据，把外部正确答案转换为更靠近学生模型自然分布的轨迹。

这与“给出正确答案，再要求模型用自己的风格复述”不同。后者看起来风格相似，但答案提示会持续影响整段生成；Hinted Decoding 在每一个 token 都显式混合“有答案提示”与“无辅助”的两路分布，并按不确定性动态决定谁主导。

### 4. Hinted Decoding 的逐 token 门控

推理阶段可将两路预测写成一个几何融合分布：

$$
\log m=(1-\lambda)\log p+\lambda\log q,
$$

其中 $p$ 是答案感知流，$q$ 是学生流；$\lambda$ 由答案感知流的熵决定。答案流低熵、较确定时，优先保留关键数字、运算结果和决定正确性的推理步骤；答案流高熵、存在多种合理写法时，更多保留学生的连接词、解释长度、Markdown 格式和语言习惯。

用方程 $2x+3=11$ 举例：在“等式两边减去 3”、“$2x=8$”与答案 $x=4$ 等关键位置，答案感知流更有价值；在“接下来可以看到”这类有大量等价表达的位置，学生流更适合主导。这样得到的轨迹既不照抄教师，也不是学生原先可能答错的 rollout。

### 5. 验证器在流程中的角色

答案感知流不能一直参与到结尾。否则可能出现中间推理已经错误、却因已知答案被强行改对的假阳性。论文的处理是：到最终答案分隔符后切回纯学生流，再由答案验证器筛掉最终答案错误或推理与答案不一致的样本。

这也解释了该方法的任务前提：它特别适合数学、代码、可验证 Agent 任务等存在可靠正确性信号的场景；它并不自动解决“哪个回答更有帮助、更安全、更符合人类偏好”这类没有唯一标准答案的问题。

### 6. 代表性实验数值

论文主要在数学推理上测试 Qwen2.5-7B Base、Qwen2.5-7B-Instruct 和 DeepSeek-R1-Distill-Qwen-7B，并比较普通 SFT、改进型 SFT、rejection sampling、DPO 与 SimPO。下表是笔记中选取的代表性结果：

| 模型 | 方法 | Math-C | Math-G | General-R | 计算预算 |
|---|---|---:|---:|---:|---:|
| Qwen2.5-7B Base | 原始模型 | 22.06 | 42.13 | 48.28 | 0 |
| Qwen2.5-7B Base | DPO@16 | 22.43 | 45.95 | 48.29 | 276.4 GPU 小时 |
| Qwen2.5-7B Base | HD+IDFT | **27.37** | **47.07** | **53.34** | 214.8 GPU 小时 |
| Qwen2.5-7B-Instruct | DPO@16 | 34.49 | 52.41 | 59.84 | 197.6 GPU 小时 |
| Qwen2.5-7B-Instruct | HD+SFT | **36.63** | 53.42 | 60.30 | 139.6 GPU 小时 |
| Qwen2.5-7B-Instruct | HD+IDFT | 36.21 | **53.50** | **60.41** | 135.4 GPU 小时 |

这些数字支持“在论文所选数学任务和离线基线下，以较低预算获得有竞争力结果”的结论；不能据此推出其已经替代在线 PPO、GRPO 或一般意义上的 RL。一个同样重要的细节是：Instruct 模型的 General-R 从原始 61.80 到 HD+IDFT 的 60.41，说明遗忘得到缓解，并未消失。

### 7. 可验证任务、在线版本与 Agent

当前版本先生成或改写一批数据，随后仍按 SFT 流程训练，因此并非严格意义上每一步更新后立即重新与环境交互的在线 RL。作者将“每个 batch 都由最新模型重新生成数据”的在线版本列为未来工作。

论文也提出将这一思路扩展到代码、Agent、speculative decoding、on-policy distillation 与 diffusion LLM。尤其是 Agent：许多工具调用和环境交互轨迹在预训练中较少出现，外部专家轨迹与当前模型分布的落差或许更大；但这仍是待验证方向，不能视为论文已完成的实验结论。

### 8. 我的理解（非论文结论）

- 这项工作的价值，是将“数据正确”进一步拆为“正确，且适合当前学生模型吸收”；
- DDT 衡量分布兼容性，不等于正确性或安全性，实际应用仍需要验证器或其他质量信号；
- 整体更像一套接近 on-policy 的数据改写与 SFT 方案，而不是完整在线 RL 的替代品；
- 最值得继续验证的，是在线更新、代码与 Agent 场景。

## 资料

- [论文摘要与 PDF](https://arxiv.org/abs/2602.12222)
- [Microsoft Research 页面](https://www.microsoft.com/en-us/research/publication/towards-on-policy-sft-distribution-discriminant-theory-and-its-applications-in-llm-training/)
- [作者代码仓库](https://github.com/zhangmiaosen2000/Towards-On-Policy-SFT)
- [IDFT 实现](https://github.com/zhangmiaosen2000/Towards-On-Policy-SFT/tree/main/IDFT)
- [Hinted Decoding 实现](https://github.com/zhangmiaosen2000/Towards-On-Policy-SFT/tree/main/HintedDecoding)
