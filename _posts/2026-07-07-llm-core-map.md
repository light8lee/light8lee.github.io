---
layout: post
title: "大模型核心机制地图：从 Transformer 到 Agent"
date: 2026-07-07 19:30:00 +0800
summary: "把大模型笔记整理成一条学习路线：Transformer、RoPE、采样、LoRA、RLHF/PPO、DPO、GRPO、OPD 和 Agent 外部循环。"
tags: [LLM, Transformer, RLHF, GRPO, Agent, visual-essay, source-notes]
category: LLM
cover: /assets/posts/llm-core-map/images/001-llm-learning-map.png
body_class: dive-into-codex-post
---

这篇把 `D:\BaiduSyncdisk\knowledge\大模型` 里的笔记整理成一张路线图。原始材料横跨模型结构、位置编码、生成采样、参数高效微调、偏好对齐、在线蒸馏和 Agent 架构；如果按文件顺序读，很容易在概念之间跳来跳去。

更顺的理解顺序是：

```text
Transformer block
  -> RoPE
  -> decoding controls
  -> LoRA adaptation
  -> RLHF / PPO
  -> DPO
  -> GRPO
  -> On-Policy Distillation
  -> Agent loop
```

先看模型如何表示和生成，再看后训练如何改变行为，最后看 Agent 如何把模型放进外部执行闭环。

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/llm-core-map/images/001-llm-learning-map.png' | relative_url }}" alt="大模型学习地图" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / LLM Core Map</p>
<h2>大模型学习地图</h2>

把这些笔记串起来，可以得到一条学习路线：先理解 Transformer 层如何处理上下文，再看 RoPE 如何注入位置；随后进入生成采样、LoRA 微调和 RLHF/DPO/GRPO/OPD 等后训练方法，最后扩展到 Agent 的感知、规划、记忆和行动循环。

**与本页直接相关的补充**

这条线的关键是层级关系：Transformer 和 RoPE 是“模型如何算”的问题，采样是“模型如何生成”的问题，LoRA 和后训练是“模型如何适配和对齐”的问题，Agent 则是“模型如何接入环境并持续执行”的问题。不要把它们看成同一层的技巧清单。

**关键词：**`Transformer`、`RoPE`、`Sampling`、`LoRA`、`RLHF`、`Agent`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/llm-core-map/images/002-transformer-block.png' | relative_url }}" alt="Transformer 层的骨架" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / LLM Core Map</p>
<h2>Transformer 层的骨架</h2>

一个标准层可以拆成两类主干：多头自注意力负责在 token 之间搬运上下文信息，FFN 负责对每个 token 做非线性变换；残差连接和 LayerNorm 则像稳定器，让深层网络可以持续训练。

**与本页直接相关的补充**

Attention 不是“让模型思考”的全部，它更像上下文混合器；FFN 则是在每个位置独立做高维变换。Pre-LN、残差和 dropout 这些看似工程化的组件，直接决定深层模型能不能稳定优化。

**关键词：**`Attention`、`FFN`、`Residual`、`LayerNorm`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/llm-core-map/images/003-rope-relative-position.png' | relative_url }}" alt="RoPE 把距离写进内积" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / LLM Core Map</p>
<h2>RoPE：把距离写进内积</h2>

RoPE 不把位置向量简单加到 token 上，而是在 Q/K 的二维子空间里按位置旋转。这样 `q_i` 与 `k_j` 的内积天然携带 `i-j` 的相对距离信息，更适合长序列注意力。

**与本页直接相关的补充**

RoPE 的核心不是“旋转很好看”，而是它让注意力分数在数学上依赖相对位置。高维实现时，向量会两两分组，每组使用不同频率；这继承了正弦位置编码的频谱思想，又把位置信息放进了 attention 的内积结构。

**关键词：**`RoPE`、`Q/K`、`relative position`、`rotation`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/llm-core-map/images/004-sampling-controls.png' | relative_url }}" alt="采样三个旋钮" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / LLM Core Map</p>
<h2>采样：三个不同旋钮</h2>

Temperature 在 softmax 前改变概率分布的尖锐程度；Top-k 固定保留前 K 个候选；Top-p 按累计概率动态截断候选集合。实际生成质量通常来自三者组合，而不是单独迷信某个参数。

**与本页直接相关的补充**

顺序很重要：temperature 先改变 logits 的相对形状，之后 top-k/top-p 再筛候选 token。`temperature < 1` 更保守，`temperature > 1` 更发散；top-p 比固定 top-k 更能适应“有时答案很集中、有时分布很平”的场景。

**关键词：**`temperature`、`top-k`、`top-p`、`nucleus sampling`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/llm-core-map/images/005-lora-low-rank.png' | relative_url }}" alt="LoRA 低秩旁路" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / LLM Core Map</p>
<h2>LoRA：低秩旁路</h2>

LoRA 假设任务适配所需的权重变化是低秩的，于是冻结原始权重 `W0`，只训练 `A`、`B` 两个小矩阵来近似 `ΔW`。训练省显存，推理时又能把 `BA` 合并回 `W0`，几乎不增加延迟。

**与本页直接相关的补充**

`r` 决定低秩旁路的容量，`lora_alpha / r` 决定旁路影响强度。实践里常先把 LoRA 加在 `q_proj`、`v_proj` 这类注意力投影层，因为它们直接影响“关注什么”和“写回什么信息”。

**关键词：**`LoRA`、`rank r`、`alpha`、`target_modules`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/llm-core-map/images/006-rlhf-ppo-loop.png' | relative_url }}" alt="RLHF PPO 在线奖励优化" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / LLM Core Map</p>
<h2>RLHF/PPO：在线奖励优化</h2>

RLHF 的典型实现要维护策略模型、旧策略、参考模型、奖励模型和 Critic。PPO 用 clipped ratio 控制更新幅度，再用 KL 惩罚防止策略偏离参考模型太远，因此强大但工程复杂。

**与本页直接相关的补充**

PPO 的难点不只是公式，而是系统：在线采样会持续改变数据分布，奖励模型可能被策略钻空子，Critic 又要拟合稀疏的序列级奖励。KL 项的作用是给策略加护栏，避免短期奖励把语言能力拉坏。

**关键词：**`RLHF`、`PPO`、`reward model`、`Critic`、`KL`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/llm-core-map/images/007-dpo-preference.png' | relative_url }}" alt="DPO 偏好对齐" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / LLM Core Map</p>
<h2>DPO：偏好对齐的捷径</h2>

DPO 利用 RLHF 目标的解析形式，把“胜出回答应该比失败回答更像当前策略”直接写成离线损失。它不显式训练奖励模型和 Critic，训练更像分类问题，但依赖高质量偏好对。

**与本页直接相关的补充**

DPO 的隐式奖励来自当前策略和参考策略的 log-prob 差。`beta` 控制偏好信号强度；太弱学不动，太强又可能让模型过度追随偏好数据里的局部模式。

**关键词：**`DPO`、`preference pair`、`reference model`、`beta`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/llm-core-map/images/008-grpo-group-relative.png' | relative_url }}" alt="GRPO 组内相对优势" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / LLM Core Map</p>
<h2>GRPO：组内相对优势</h2>

GRPO 对同一个 prompt 采样一组回答，用组内奖励的均值和方差归一化 advantage。它保留 PPO 风格的 ratio 和 clipping，但去掉 Critic，适合规则奖励或可验证推理场景。

**与本页直接相关的补充**

组内比较让优势函数变成“这条回答相对同题其他回答好不好”，而不是依赖一个单独价值模型估计状态价值。实现时要注意只在 completion token 上算 loss，并对 old log-prob、reference log-prob 和 reward 相关张量正确 detach。

**关键词：**`GRPO`、`group reward`、`advantage`、`clipping`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/llm-core-map/images/009-on-policy-distillation.png' | relative_url }}" alt="On-Policy Distillation 在学生分布上蒸馏" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / LLM Core Map</p>
<h2>OPD：在学生分布上蒸馏</h2>

On-Policy Distillation 的关键是让学生模型用当前策略自己生成样本，再由教师模型实时评分、修正或给出分布目标。它解决离线蒸馏的分布偏移和曝光偏差，但计算成本更高。

**与本页直接相关的补充**

离线蒸馏让学生模仿老师过去生成的数据；OPD 让老师在学生当前会走到的状态上批改。这个区别很关键：学生不是只学“标准答案”，而是在自己的错误前缀、坏 rollout 和边界状态里获得反馈。

**关键词：**`OPD`、`student policy`、`teacher feedback`、`KL`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/llm-core-map/images/010-agent-loop.png' | relative_url }}" alt="Agent 从模型到行动系统" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / LLM Core Map</p>
<h2>Agent：从模型到行动系统</h2>

Agent 把大模型放进外部循环：感知模块读取环境，规划模块拆任务，记忆模块保存状态，行动模块调用工具。真正的可靠性来自闭环校验，而不只是模型单次回答的漂亮程度。

**与本页直接相关的补充**

Agent 的四个模块不是装饰性分层。感知决定能不能读准环境，规划决定能不能把目标拆成可执行步骤，记忆决定能不能保留上下文和经验，行动决定能不能真的改变外部状态。越接近真实任务，越要重视执行后的校验和恢复能力。

**关键词：**`Agent`、`perception`、`planning`、`memory`、`tools`
</div>
</section>
