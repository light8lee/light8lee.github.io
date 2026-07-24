---
layout: post
title: "让二分类专家审稿：MOPD 能否蒸馏出会先思考的多分类 LLM？"
date: 2026-07-24 17:30:00 +0800
summary: "学生先写出自己的 reasoning，再由多个类别专家复核；真正被蒸馏的是对学生轨迹的联合反馈，而不是几份离线答案。"
tags: [Daydreams, MOPD, On-Policy Distillation, Reasoning LLM, 多分类]
series: daydreams
daydream: true
permalink: /daydreams/mopd-binary-experts-to-multiclass/
cover: /assets/daydreams/mopd-binary-experts-to-multiclass/images/02-reasoning-critics.png
body_class: daydream-post
---

设想一个“先思考、后结论”的 LLM 多分类任务。学生需要读取输入，生成一段 reasoning，最后只输出标签 `C1` 到 `CK` 中的一个。与此同时，我们已经有 K 个专家 LLM：第 k 个专家只擅长分析“这个输入是不是 Ck”，最后回答 YES 或 NO。

能否像 MOPD 集成数学、代码等能力那样，把这些二分类专家蒸馏进一个多分类 reasoning LLM？

**可以尝试，但不能直接照搬原版 MOPD。** 更合适的形态是：让二分类专家成为学生 reasoning 的 class-specific critics，在学生自己的 rollout 上复核、反驳和打分，再把联合反馈蒸馏回学生。

<figure>
  <img src="{{ '/assets/daydreams/mopd-binary-experts-to-multiclass/images/02-reasoning-critics.png' | relative_url }}" alt="Tao 拉动学生生成的推理长卷经过三个类别专家复核口，批注回流后输出唯一分类标签" loading="lazy">
  <figcaption>专家不替学生写三份答案，而是在学生自己的推理卷上审稿。</figcaption>
</figure>

## 为什么不能直接平均教师 logits

原版 MOPD 的每个领域教师和学生共享生成任务的输出空间。学生先生成 rollout，对应领域教师再对同一序列逐 token 给出 log-prob，从而提供稠密的 on-policy 信号。

这里的输出空间并不天然对齐：二分类专家在回答“是不是 Ck”，学生却在比较全部类别并生成唯一结论。即使最终标签正确，C1 专家偏好的推理措辞也可能只强调支持 C1 的证据，而不讨论 C2 与 C3。把这些 token 分布直接平均，混合的是不同问题，不是共同知识。

因此需要把训练拆成两层：**标签意见可以耦合，推理过程需要复核。**

## 一条更合理的 on-policy 路线

第一步，学生从当前策略中生成自己的轨迹：

```text
输入 x → 学生 reasoning r → 候选标签 y
```

第二步，把同一个 `x + r` 交给若干类别专家。第 k 个专家收到统一问题：

```text
原始输入：x
学生推理：r
候选类别：Ck

检查推理是否遗漏、误用或错误解释了与 Ck 有关的证据，
给出批评，并返回 YES / NO 的概率。
```

从每位专家取得一个可校准的 log-odds：

```text
s_k = log P_Ek(YES | x, r, Ck) - log P_Ek(NO | x, r, Ck)
```

再用共享校准集学习耦合层，把彼此不可直接比较的分数变成多分类分布：

```text
q(label | x, r) = softmax(Ws + b)
```

最终标签可用 reverse KL 蒸馏，因为教师评价的是学生自己生成的轨迹：

```text
L_label = KL(p_student(label | x, r) || q(label | x, r))
```

reasoning 部分则有两种强度：如果专家采用完全相同的推理协议，并能可靠地为学生前缀评分，可以尝试 token-level on-policy distillation；更现实的做法是把专家的逐步批评转成过程奖励、原稿—修订稿偏好对，或 rejection sampling 信号。再保留一项真实标签监督作为锚点：

```text
L = λ_label L_label + λ_reason L_reason + λ_gold CE(y_gold, p_student)
```

## 路由是最容易出错的地方

只查询学生 top-1 类别对应的专家，会把早期误判放大成确认偏差。类别较少时可以查询全部专家；类别较多时，至少查询学生 top-m 候选、若干 hard negatives，并在训练阶段覆盖真实类别专家与随机负专家。

reasoning 模板也应强制“证据先于结论”：

```text
关键证据
可能支持的类别
主要排除项
最接近的两个类别及区别
最终结论
```

否则专家容易奖励一段先猜标签、再为猜测补理由的 post-hoc rationalization。类别最好使用单独的特殊 token 或受约束解码，避免标签长度和分词差异污染概率。

## 最小实验应该比较什么

建议从 3–10 个互斥标签开始，所有教师和学生从同一基础 checkpoint 分化，并统一 prompt、YES/NO token、负样本比例和 reasoning 格式。至少比较四组：

1. 直接多分类 SFT；
2. 把各专家生成的 CoT 混合起来做离线 SFT；
3. 只耦合最终 YES/NO 分数的 label distillation；
4. 在学生 rollout 上同时做专家复核与标签耦合的 on-policy 版本。

除了 accuracy 和 macro-F1，还应报告 NLL/ECE、多个专家同时说 YES 或全部说 NO 的冲突率、推理步骤错误率，以及反事实改动证据后 reasoning 与标签是否一起变化。否则模型可能只是分类正确，却学会了一套听起来合理的解释。

## 相似做法与区别

- [MOPD](https://arxiv.org/abs/2606.30406) 的直接启发是：学生从自己的策略采样 rollout，按领域路由的教师在每个位置返回稠密 log-prob。这里保留“评价学生自己的轨迹”，但把预先已知的领域路由改成未知类别下的多专家复核。
- [MiniLLM](https://www.microsoft.com/en-us/research/publication/knowledge-distillation-of-large-language-models/) 用 reverse KL 和学生分布上的优化降低生成式蒸馏的 exposure bias。它支持这里的 label-level on-policy 目标，但不是多教师、多分类或过程复核方法。
- [Reducing Multiclass to Binary by Coupling Probability Estimates](https://papers.neurips.cc/paper_files/paper/2001/hash/abdbeb4d8dbe30df8430a8394b7218ef-Abstract.html) 说明二分类概率可以耦合成校准的多分类概率。它解决的是最终类别的共同刻度，不处理 LLM reasoning。
- [Let's Verify Step by Step](https://arxiv.org/abs/2305.20050) 区分结果监督与中间步骤监督，并在其数学推理实验中发现过程监督优于只看最终结果。它支持“专家应该检查 reasoning”的动机，但使用的是过程奖励模型，而不是一组 one-vs-rest 类别专家。

目前没有找到与这套组合完全等价的公开成熟方案。所以上述设计是基于这些先例做出的推断，而不是已有论文结论。

## 结论

这个想法真正有趣的部分，不是再次证明多个二分类器能够组成多分类器，而是把专家的职责从“替学生回答”改成“审查学生自己的思考”。

如果实验成立，它更像一种 **Multi-Expert On-Policy Reasoning Distillation**：多个类别专家在训练期并行发展，学生负责比较、推理和下唯一结论，部署时最终只保留一个模型。
