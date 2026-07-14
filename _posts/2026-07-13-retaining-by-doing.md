---
layout: post
title: "Retaining by Doing：on-policy 数据为何能减轻遗忘"
date: 2026-07-13 19:00:00 +0800
summary: "论文精读：RL 比 SFT 更抗遗忘的关键并非 advantage 或显式 KL，而是每轮使用当前模型产生的 on-policy 数据。"
tags: [强化学习, 后训练, On-policy, 灾难性遗忘]
category: LLM Post-training
cover: /assets/posts/video-notes/2026-07-13-retaining-by-doing/images/01.png
body_class: maxrl-post
---

# Retaining by Doing: The Role of On-Policy Data in Mitigating Forgetting

> 论文精读与实践笔记  
> 作者：Howard Chen, Noam Razin, Karthik R. Narasimhan, Danqi Chen（Princeton）  
> 版本：arXiv:2510.18874v3，2026-06-26；ICML 2026  
> 原文：[arXiv 页面](https://arxiv.org/abs/2510.18874)｜[PDF](https://arxiv.org/pdf/2510.18874)｜[代码](https://github.com/princeton-pli/retaining-by-doing)

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/01.png' | relative_url }}" alt="Retaining by Doing：用 on-policy 数据减轻遗忘" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / Retaining by Doing</p>

## 一句话结论

大语言模型后训练时，强化学习（RL）通常比监督微调（SFT）更不容易损失已有能力。论文认为，主要原因并非 GRPO 的 advantage 计算，也并非相对初始模型的显式 KL 正则，而是：**RL 用当前模型自己生成的 on-policy 数据训练**。更具实践价值的是，每个 epoch 刷新一次模型生成数据的近似 on-policy SFT（Iterative-SFT），就能显著缓解遗忘，成本低于每一步在线 RL。

</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/02.png' | relative_url }}" alt="论文问题：后训练中的灾难性遗忘" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / Problem</p>

## 1. 论文要解决什么问题

### 1.1 灾难性遗忘

模型在后训练中为新任务优化，旧能力可能退化。例如，一个原本能正常聊天、具备安全拒答、通识问答和基础数学能力的模型，被专门训练为更会解算术题后，可能在安全、聊天或通识任务上变差。这种现象叫 catastrophic forgetting。

本文的问题不是“RL 是否能学得比 SFT 好”，而是：

> 在达到相近新任务表现的前提下，为什么 RL 比 SFT 少遗忘？其中真正起作用的是 RL 的什么成分？

### 1.2 论文的实验对象

- 初始模型：Llama-3.2-1B-Instruct、Llama-3.1-8B-Instruct、Qwen-2.5-1.5B-Instruct、Qwen-2.5-7B-Instruct。
- 目标任务：IFEval（指令遵循）、MMLU（通识知识）、Countdown（算术推理）。
- 非目标评测：其余目标任务、MATH，以及安全集 WildJailbreak、WildGuardTest。
- RL：GRPO；奖励是可验证的对/错奖励（正确为 1，错误为 0）。
- 训练：默认 2 个 epoch；最大使用 8 张 H100；GRPO 每个 prompt 生成 5 个样本。

### 1.3 衡量方式

令初始策略为 $\pi_{\theta_0}$，训练后策略为 $\pi_{\theta_T}$：

$$\text{Gain}=A(\pi_{\theta_T},T)-A(\pi_{\theta_0},T)$$

$$\text{Drop}=\frac{1}{M}\sum_j[A(\pi_{\theta_0},T'_j)-A(\pi_{\theta_T},T'_j)]$$

- Gain 越大越好：新任务提升。
- Drop 越小越好：非目标任务下降越少；负值表示这些测量任务的平均成绩略有提升。

这测量的是**行为/benchmark 表现遗忘**，而不是参数完全不变，也不是对所有能力的完备保证。

</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/03.png' | relative_url }}" alt="训练方法对比：SFT、RL 与 Iterative-SFT" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / Methods</p>

## 2. 比较了哪些训练方法

| 方法 | 训练数据来自哪里 | 是否随模型更新刷新 | 关键特点 |
|---|---|---:|---|
| 标准 SFT | Llama-3.3-70B-Instruct 生成的正确答案 | 否 | 强外部教师、固定且 off-policy |
| Self-SFT | 初始模型生成的答案，仅保留答对样本 | 否 | 数据属于初始模型，但很快变旧 |
| RL（GRPO） | 当前模型每步生成的轨迹 | 是，每步 | fully on-policy，以奖励强化正确尝试 |
| Iterative-SFT | 每轮/epoch 开始时由当前模型生成 | 是，每轮 | 近似 on-policy，生成成本较低 |

一个容易忽略的细节：两种 SFT 也都只保留 verifier 判为正确的响应。因此，论文并非在比较“错误数据的 SFT”和“正确数据的 RL”。标准 SFT 的教师反而更强；论文展示的是**高质量外部答案仍可能更易造成遗忘，因为其分布离当前学生模型太远**。

</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/04.png' | relative_url }}" alt="实验结果：RL 获得目标收益时更少遗忘旧能力" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / Results</p>

## 3. 达到了什么效果

### 3.1 总体实验结论

在 Llama / Qwen、1B 到 8B、三类任务中，SFT 的 target gain 与非目标 drop 之间存在明显权衡：若用较高学习率达到强目标表现，旧能力往往严重下降；降低学习率可以少忘，但达不到相同目标成绩。RL 则往往在获得相近或更高目标收益时，保持接近零的旧任务下降。

一个代表性结果（Llama-3.1-8B）：

| 目标任务 | 方法 | Gain | Drop |
|---|---|---:|---:|
| IFEval | SFT | +25.2 | 27.8 |
| IFEval | GRPO | +18.4 | 3.4 |
| MMLU | SFT | +11.1 | 38.5 |
| MMLU | GRPO | +14.6 | -0.2 |
| Countdown | SFT | +25.5 | 36.4 |
| Countdown | GRPO | +60.4 | -0.5 |

负 Drop 不应被过度解读为“完全不遗忘”：它可能来自迁移、评测噪声或任务关联。论文没有为这些很小的正负变化系统报告多随机种子置信区间。

### 3.2 附录中的聊天能力验证

作者还用 AlpacaEval 测聊天能力。例如 Llama-3.1-8B 初始 win rate 为 41.6：在 IFEval / MMLU / Countdown 上做 SFT 后分别降至 23.5 / 11.6 / 0.0；做 RL 后为 43.1 / 41.2 / 42.0。Qwen-2.5-7B 也呈现相同方向：SFT 下滑显著，RL 的下降轻微或几乎没有。

</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/05.png' | relative_url }}" alt="核心机制：on-policy 数据与不同方向的 KL" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / Mechanism</p>

## 4. 核心机制：为什么 on-policy 数据会减少遗忘

### 4.1 SFT 与 RL 可看作不同方向的 KL

SFT 最小化从最优策略到训练策略的 forward KL：

$$\mathrm{KL}(\pi^*\|\pi_\theta)$$

它是 mode-covering：为了覆盖训练数据中的目标模式，会拉宽/移动模型的概率分布。

带 KL 正则的 RL 可等价地理解为最小化训练策略到最优策略的 reverse KL：

$$\mathrm{KL}(\pi_\theta\|\pi^*)$$

它是 mode-seeking：从当前策略会生成的区域采样，重点将当前已有的某些模式推向高奖励区域。

### 4.2 为什么这件事反直觉

传统直觉是：mode-seeking 会迅速压掉其他模式，应该更容易忘；mode-covering 应该更保留多样性。

论文用高斯混合模型说明，结论取决于初始训练策略是否多模态。

- **单模态初始策略**：达到相同 Gain=0.9 时，forward-KL 的 Drop=0.64，小于 reverse-KL 的 0.70。传统直觉成立。
- **双模态初始策略**：训练策略包含对应旧能力的 $q_{old}$ 和一个尚未到位的新能力 $q_{new}$。达到 Gain=0.9 时，forward-KL 的 Drop=0.12，而 reverse-KL 的 Drop=0.03。

真实 LLM 更接近后一种情况：它已有很多行为模式，也往往已经偶尔能产出接近目标的“能力种子”。RL 可以把 $q_{new}$ 向正确目标移动，同时大致保留 $q_{old}$；SFT 为覆盖固定外部目标轨迹，更可能从旧模式抽走概率质量。

### 4.3 概率质量的直观例子

以下数字仅是帮助理解的示意，不是论文实测：

| 模式 | 初始 | 固定专家 SFT 后 | on-policy RL 后 |
|---|---:|---:|---:|
| A：已有通用回答方式 | 60% | 40% | 56% |
| B：已有安全/谨慎方式 | 30% | 15% | 28% |
| C：新任务需要的推理方式 | 10% | 45% | 16% |

离线 SFT 只不断看到外部 C 类标准答案，梯度会强迫模型整体往外部轨迹靠近；RL 从当前模型真正产生的 A/B/C 轨迹中学习，主要提高 C 中正确尝试的概率，因此更新更局部。

</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/06.png' | relative_url }}" alt="消融实验：KL 与 advantage 不是少遗忘的主要解释" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / Ablations</p>

## 5. 作者如何排除其他解释

RL 与 SFT 有三种典型差异：

1. RL 用当前策略产生的 on-policy 数据；SFT 用固定 off-policy 数据。
2. RL 通常对初始策略使用显式 KL 正则；SFT 通常没有。
3. GRPO 用 advantage 加权梯度；SFT 没有。

### 5.1 去掉 KL 正则

作者比较 KL 系数 $\beta=0.05$ 与 $\beta=0$ 的 GRPO。除 Llama 在 IFEval 的部分情况外，去掉显式 KL 后 gain-drop 权衡大致不变。因此显式 KL penalty 不是 RL 少遗忘的主要解释。

正确理解是：**在本文的任务、模型规模和训练时长内，它不是主要差异来源。** 这不表示 KL 在更长训练、噪声 reward、reward hacking 或安全敏感情形下无用。

### 5.2 用 REINFORCE 替代 GRPO

REINFORCE 没有 GRPO 那种 group-relative advantage estimator。实验中它通常比 GRPO 学新任务慢，但仍保持较小遗忘。

例如 Llama-3.1-8B：

| 任务 | 方法 | Gain | Drop |
|---|---|---:|---:|
| MMLU | SFT | 11.1 | 38.5 |
| MMLU | REINFORCE | 8.6 | -0.1 |
| MMLU | GRPO | 14.6 | -0.2 |

所以 advantage 的主要作用是优化效率/最终 Gain；少遗忘更主要来自 on-policy 数据。这里也要谨慎：这不是说优化算法无关紧要，而是它不是该论文中“遗忘差异”的核心解释。

</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/07.png' | relative_url }}" alt="实用方案：按 epoch 刷新的 Iterative-SFT" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Iterative-SFT</p>

## 6. 实用贡献：近似 on-policy 的 Iterative-SFT

完整 RL 要在每次更新附近重新生成轨迹，成本高。作者验证以下折中：

```text
第 0 轮：当前模型生成答案，筛选正确样本 -> SFT 一轮
第 1 轮：更新后的模型重新生成，筛选正确样本 -> SFT 一轮
第 2 轮：继续刷新数据 -> SFT 一轮
```

实验中，Iterative-SFT 的目标准确率可达到或超过标准 SFT，同时非目标任务的下降接近 GRPO，显著优于：

- 固定外部教师数据的标准 SFT；
- 仅由初始模型采样一次、随后不刷新数据的 Self-SFT。

这厘清了一个细节：**“数据由模型自己生成”本身不够；数据要随模型演化持续刷新，才保持足够 on-policy。**

作者还测试了“把 RL 训练过程中产生的轨迹拿来之后做 SFT”：目标增益略逊于完整 RL，遗忘仅略高，说明 RL trajectory 本身可成为一种较稳定的蒸馏数据。

### 数据刷新频率是新工程旋钮

```text
固定专家数据 -- 固定初始模型数据 -- 每 epoch 刷新 -- 每若干 step 刷新 -- 每 step 在线 RL
  最 off-policy                                                        最 on-policy
```

刷新太慢，数据又会过时；刷新太快，生成、验证和版本管理成本上升。论文证明了“按 epoch 刷新可以有效”，但没有给出跨任务通用的最优刷新频率。一个自然后续方向是：当当前模型相对数据生成版本的 response KL 超过阈值时，再触发重采样。

</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/08.png' | relative_url }}" alt="员工学习类比：固定专家、on-policy RL 与 Iterative-SFT" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / Intuition</p>

## 7. 用员工学习解释全文

假设一位员工原本会写邮件、翻译、回答常识、做基础数学、遵守安全规范；现在要专练倒计时算术。

### 固定专家 SFT

每天给他看同一批“资深专家”的标准解法，要求逐字模仿。他会很快学会该任务的标准格式，但为了贴近专家的表达，旧的沟通与工作习惯可能被整体重写。

### On-policy RL

先让员工自己解题：五种尝试中两种是对的、三种是错的。系统不要求他复制专家整篇答案，而是告诉他“你自己写出的第 2、4 种思路是对的”。训练主要强化他已经能做到的正确局部，不必替换所有既有习惯。

### Iterative-SFT

不是每天实时批改每一步，而是每周收集员工当前做对的新题，再用这些题集训练下一周。它用较低的实时成本，保留了“练习内容跟着员工当前水平走”的优势。

</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/09.png' | relative_url }}" alt="适用边界：on-policy 不是遗忘的万能解法" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / Limits</p>

## 8. 边界、反思与不应过度外推之处

### 8.1 证据强，但并非完整理论证明

论文有跨模型实验、KL/advantage 消融和玩具模型解释；但“on-policy 数据是主要因果因素”仍是经验归因，并非对 Transformer 的严格定理。作者自己也将严格理论化列为未来工作。

### 8.2 RL 不是免疫遗忘

附录显示，当新目标模式离当前策略中已有模式很远时，RL 也开始遗忘。若模型根本不会产生有价值的正确尝试，稀疏奖励的 on-policy RL 很难启动。

这意味着：

- on-policy 适合稳定地放大模型已有的能力种子；
- 从零注入遥远的新知识，仍需要外部示范、检索、工具、课程学习或更强教师；
- 最实用的方案通常是“外部数据完成能力引导 + 近似 on-policy 数据完成稳定巩固”。

### 8.3 任务与 reward 的适用范围有限

本文的 IFEval、MMLU、Countdown 都可通过 verifier 给予对/错奖励。开放式写作、长程 agent、多轮对话、主观偏好、带噪声 reward model、工具环境中的结论仍需单独验证。

### 8.4 只覆盖到 8B、有限训练周期

模型最大为 8B，训练周期较短。不能直接推断到数百 B 模型、长周期在线学习或真实用户流量分布。

### 8.5 KL 距离不是充分的遗忘指标

论文附录发现 $\mathrm{KL}[\pi_{\theta_0}\|\pi_\theta]$ 与非目标 Drop 的 Pearson 相关约 0.52，属于中等相关；Self-SFT 与 SFT 的比较也不是单调关系。模型“离初始策略更远”不必然表示“在所有旧能力上忘得更多”。

### 8.6 减少意外遗忘，不等于保证安全

在本文中，对数学/指令任务的 RL 较少破坏已有安全表现。但若 reward 本身奖励不安全行为，on-policy RL 也会高效把不安全行为强化。它减少的是**与目标无关的副作用式遗忘**，不能替代安全目标、reward 审计和红队评测。

### 8.7 “保住旧能力”也可能意味着保守闭环

持续从模型自己会做什么采样，能保持稳定，却可能限制跳出当前能力边界。因而不能将该结论误用为“永远不要离线 SFT”；关键是让外部数据注入与模型当前分布之间存在可控的桥梁。

</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/10.png' | relative_url }}" alt="实际训练建议：用四组对照检验 on-policy 效果" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / Practice</p>

## 9. 面向实际训练的建议

适合优先尝试 on-policy / Iterative-SFT 的场景：

- 已有对齐、聊天和安全能力很珍贵；
- 需要持续加入相邻的新技能；
- 有可靠 verifier 或 reward；
- 可以承担周期性生成与评测成本。

建议采用四组对照，以避免把数据量、教师质量、训练 token 或奖励质量造成的差异误认为 on-policy 效果：

| 组别 | 数据 | 目的 |
|---|---|---|
| 离线 SFT | 固定外部专家轨迹 | 传统强基线 |
| Self-SFT | 初始模型一次采样 | 自生成本身是否够用 |
| Iterative-SFT | 每轮用当前模型刷新 | 近似 on-policy 是否够用 |
| RL | 当前策略采样 + 奖励 | 在线上限在哪里 |

尽量匹配训练 token、目标任务成功率与评测预算；同时报告：目标收益、平均旧能力下降、最坏单项下降、聊天能力、安全能力、生成验证成本和多随机种子方差。

</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-13-retaining-by-doing/images/11.png' | relative_url }}" alt="结论：训练数据应持续贴近当前策略" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / Takeaway</p>

## 10. 最终 takeaway

这篇论文真正的贡献不是一句“RL 胜过 SFT”，而是提出一个可操作的数据分布原则：

> 训练数据越贴近当前模型真正会产生的行为，参数更新越可能是局部、稳定的；越是固定且与当前模型分布差异大的外部示范数据，越可能为了新任务而无意中破坏旧行为。

因此，在持续后训练中，比起只问“答案是否高质量”，还要问：**这些答案相对当前策略到底有多 off-policy？数据多久会过时？哪些既有能力必须作为回归指标被保护？**
</div>
</section>
