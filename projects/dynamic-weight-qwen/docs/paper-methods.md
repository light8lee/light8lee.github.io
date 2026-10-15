---
layout: default
nav_section: projects
title: "论文方法与本项目插件的对应关系"
---

> **历史教师问答协议说明：** 本文的问答示例和成绩属于旧的人工 assistant 目标写入 / 回放实验，不能作为从 user 多轮对话形成记忆的结论。新实验仅观察 user 内容，并用独立进程评估；请以 [user 对话重新实验报告](user-dialogue-experiment-report.html) 为当前结论。

<style>.experiment-document{max-width:1000px;margin:auto;line-height:1.9;overflow-wrap:anywhere}.experiment-document img{max-width:100%;height:auto}.experiment-document pre,.experiment-document table{display:block;overflow:auto}.experiment-document h2{margin-top:2.5em}.experiment-document mjx-container{max-width:100%;overflow-x:auto}</style>
<div class="experiment-document" markdown="1">

[← 返回交互实验台](../)

# 论文方法与本项目插件的对应关系

本项目的统一限制是：Qwen 主干冻结、推理/观察阶段不构建梯度图、不调用反向传播。下列实现是“把论文中的局部更新或联想记忆机制接入现成 Qwen”的工程适配，不宣称复现论文完整训练架构或原始实验指标。

## 1. `residual_hebbian`：多时间尺度 Fast Weights

依据：Ba 等人的 *Using Fast Weights to Attend to the Recent Past*（NeurIPS 2016，arXiv:1610.06258）。论文强调比常规参数变化更快的突触变量可保存近期活动模式。

本项目在选定 Transformer 层的残差流后加入低秩快权重 `W_fast`，以局部前/后神经活动的外积直接累加。Qwen 主干相当于慢权重，插件矩阵相当于快权重。

差异：原论文包含为任务训练的控制网络；本项目不训练控制器，只用固定投影、新奇度、奖赏门控和稳态限幅。

## 2. `residual_oja`：Oja 归一化 Hebbian 规则

依据：Oja，*A Simplified Neuron Model as a Principal Component Analyzer*（Journal of Mathematical Biology, 1982，DOI:10.1007/BF00275687）。

实现采用广义多输出形式：

```text
ΔW = η · reward · novelty · (preᵀ post - W · post²)
```

第二项是活动依赖的局部归一化，目的是减少纯 Hebbian 累积导致的爆炸，再叠加工程上的行范数稳态约束。

## 3. `vocab_hebbian`：加性 Fast Weight Programmer

依据：Fast Weight Programmer 的加性键值外积观点。隐藏状态经固定低秩编码成为 key，下一个真实 token 是 value，直接将 `key ⊗ one_hot(token)` 写入词表快权重。

它是最直接的输出联想基线，也预期最容易受到高频 token 干扰。实测中高频句号占据吸引子，回答会塌缩为“。”。

## 4. `vocab_delta`：DeltaNet 式误差修正

依据：Schlag、Irie、Schmidhuber，*Linear Transformers Are Secretly Fast Weight Programmers*（ICML 2021，arXiv:2102.11174）。论文用 delta-rule 指令替代纯加性写入，以修正当前 key 到 value 的映射。

本项目实现批量局部更新：

```text
W ← W + β Kᵀ(V - K W)
```

`V` 是观察到的下一 token one-hot。误差只在快权重输出端计算，不穿过 Qwen，也没有反向传播。

## 5. `vocab_ema`：token 原型稳态消融

这是工程消融，不对应单一论文。每个被观察 token 的隐藏 key 均值作为该 token 的指数移动原型，并做单位化与范数上限。它用于区分“误差修正”与“原型聚合”的效果。

`vocab_hebbian_balanced` 是对第 3 节的工程改进：用逆平方根 token 频率缩放写入，并在读取时归一化每个词表列。它不对应一篇独立论文；实验用于判断高频 token 是否是 Hebbian 输出记忆失败的主因。

## 6. `kv_replay`：现代 Hopfield 式一次检索 + 序列值回放

依据：Ramsauer 等人的 *Hopfield Networks is All You Need*（ICLR 2021，arXiv:2008.02217）。现代 Hopfield 网络以连续状态进行内容寻址，并可通过一次更新检索模式。

本项目把问句末尾的 Qwen 隐状态写成地址权重，把回答 token 序列写成值；新 session 用余弦相似度执行一次内容寻址，命中后由局部 logit 门逐 token 回放。地址和值都是 `requires_grad=False` 的持久化张量。

差异：确定性序列回放是为自回归语言模型增加的工程扩展，不是原论文算法本身。因此它更接近“可审计的外显快速记忆”，而不是让基础模型内部自然吸收知识。

## 7. `token_knn`：token 级近邻轨迹记忆

关系：kNN-LM 类方法说明可以用上下文表示检索下一 token；本项目只借用“隐藏状态作地址、token 作值”的工程思想，并未复现其训练语料库或概率插值方案。

实现为首地址语义检索、稀有四元 token 指纹、稳定实体标签、可选视觉上下文门控、问答 group 锁定和答案时间步约束。后续 token 仍通过局部 logit 偏置产生。它解决了全局 token 池中的事实串位，并支持同实体覆盖旧 group，但仍属于外显记忆。

同类方向还包括 *Memorizing Transformers*（近邻长期记忆）、Titans（测试时长期记忆模块）以及 CLiMB 等多模态持续学习基准。它们分别为大容量检索、长期记忆管理和跨任务遗忘评估提供参照，但训练假设、是否使用梯度和本项目并不相同。

## 未纳入主对比的方法

- 标准 Test-Time Training、TTT layers：通常要在测试时定义自监督损失并求梯度，不满足本项目“不通过反向传播更新”的约束。
- Titans 神经长期记忆的标准训练/测试时更新：核心记忆优化通常依赖梯度，因此没有伪装成无梯度方案放入表格。
- 完整重训练的线性 Transformer、DeltaNet 或 Hopfield 层：需要从训练期改变架构，本项目只验证能否作为即插即用插件挂接到已有 Qwen。

## 参考来源

- Ba et al., 2016: https://arxiv.org/abs/1610.06258
- Schlag et al., 2021: https://arxiv.org/abs/2102.11174
- Ramsauer et al., 2020/2021: https://arxiv.org/abs/2008.02217
- Khandelwal et al., 2019/2020: https://arxiv.org/abs/1911.00172
- Oja, 1982: https://doi.org/10.1007/BF00275687
- Memorizing Transformers: https://arxiv.org/abs/2203.08913
- Titans: https://arxiv.org/abs/2501.00663
- CLiMB: https://arxiv.org/abs/2206.09059

</div>
