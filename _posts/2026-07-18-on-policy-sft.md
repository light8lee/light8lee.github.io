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

## 资料

- [论文摘要与 PDF](https://arxiv.org/abs/2602.12222)
- [Microsoft Research 页面](https://www.microsoft.com/en-us/research/publication/towards-on-policy-sft-distribution-discriminant-theory-and-its-applications-in-llm-training/)
- [作者代码仓库](https://github.com/zhangmiaosen2000/Towards-On-Policy-SFT)
