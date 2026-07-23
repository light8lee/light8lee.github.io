---
layout: post
title: "让脚手架退场，让终点留下：GRPO 的信用分配与奖励退火"
date: 2026-07-23 23:05:04 +0800
summary: "我想让 0/1 终局奖励始终充当锚点，把 rubric 当作可退火的信用分配脚手架。"
tags: [Daydreams, GRPO, RLVR, 信用分配, Reward Hacking]
series: daydreams
daydream: true
permalink: /daydreams/grpo-rubric-reward-annealing/
cover: /assets/daydreams/grpo-rubric-reward-annealing/images/01-credit-backtrace.png
body_class: daydream-post
---

最近我一直在想两个连在一起的问题。

第一个问题是，原生 GRPO 通常只在一条 rollout 结束后拿到一个 reward。同一条回答里的所有 token 基本共享同一个 advantage，但真正决定成败的，往往只是其中几步。有没有办法保留 GRPO 简单、稳定的框架，同时把信用更准确地分回关键步骤？

第二个问题是，RLVR 的 `0/1` 信号虽然干净，却很稀疏。前期如果模型几乎探索不到正确答案，训练就很难启动。现在常见的做法是用 rubric 或过程评分把信号变密，但这些分数终究是代理目标，训练久了又可能被模型找到漏洞。

我的直觉是：**rubric 更适合做冷启动阶段的脚手架，而不应该成为训练最终依赖的目标。**

## 我的想法：终局奖励不退场，只让 rubric 退场

一开始，我想的是把训练直接分成两段：前期用 rubric，后期切回纯 `0/1`。但继续往下推，我觉得这种硬切换并不稳。前期如果完全没有终局奖励，模型可能先学会讨好 rubric；等后面再换目标，实际上已经发生了一次目标迁移。

我现在更倾向于从训练第一步就保留 `0/1` 终局奖励，只把 rubric 当作一个权重可以逐渐降低的辅助项：

$$
A_t^{\text{total}} = A^{0/1} + \lambda_k A_t^{\text{rubric}}.
$$

这里的两种 advantage 应该分别归一化，再进入同一次 policy update。`A^{0/1}` 始终定义训练方向，`\lambda_k` 只回答一个问题：当前模型还需要多少过程脚手架？

<figure>
  <img src="{{ '/assets/daydreams/grpo-rubric-reward-annealing/images/02-anchored-annealing.png' | relative_url }}" alt="Tao 逐步关小 rubric 辅助奖励阀门，同时保持终局 0/1 奖励主线持续连接策略更新机器" loading="lazy">
  <figcaption>我想让退场的是辅助代理，而不是可验证目标。</figcaption>
</figure>

在我的设想里，它不是几个截然分开的阶段，而是一个连续变化的过程：

1. **冷启动**：`0/1` 始终存在，rubric 权重较高，先帮助模型探索到第一批可复制的成功轨迹。
2. **内化**：当 held-out 成功率持续上升、同组 rollout 不再频繁全错时，逐步降低 rubric 权重。
3. **清场**：当 rubric 分数继续上涨，但独立 verifier、扰动测试或人工抽检开始停滞时，加速把 rubric 权重降到零。若真实指标已经回落，就回滚到出现分叉前的 checkpoint，而不只是把奖励关掉。

这不是简单的“前期相信 rubric，后期相信 `0/1`”。更像是从第一天就用终局结果定方向，只在模型找不到路时，用 rubric 照亮局部。

## 我为什么会想到这个问题

对同一个问题，GRPO 会采样一组回答，取得每条回答的终局奖励 `r_i`，然后做组内标准化：

$$
A_i = \frac{r_i-\bar r}{\operatorname{std}(r)+\epsilon}.
$$

标准做法会让同一条回答里的所有 token 共享这个序列级 advantage。失败答案中局部正确的步骤会一起受罚；成功答案里的绕路、偶然猜中和关键推理又会一起受赏。如果一组 rollout 全对或全错，组内相对信号还会接近消失。

<figure>
  <img src="{{ '/assets/daydreams/grpo-rubric-reward-annealing/images/01-credit-backtrace.png' | relative_url }}" alt="Tao 从终局 0/1 奖励向后拉回橙色信用线，只连接真正影响结果的关键动作" loading="lazy">
  <figcaption>终局奖励只有一次；我真正想解决的是，它应该回到哪些动作。</figcaption>
</figure>

所以我觉得，奖励稀疏和信用分配其实不是同一个问题。`0/1` 可以很稀疏，但仍然可以通过局部重采样、子问题验证或 token 加权，把这一个结果更准确地分回过去。反过来，rubric 可以很密，却不一定真的把信用分对。

## 我找到的相近做法

下面这些工作并不完全等同于我的设想，但分别覆盖了其中的一部分。

- [Step-wise Rubrics as Rewards](https://arxiv.org/abs/2605.17291) 会把 rubric 条目归因到具体推理步骤，并把 step reward 与 outcome reward 的 advantage 分开计算。它和我设想中“过程信号负责教学、终局信号负责定锚”的结构最接近。
- [SCRL](https://arxiv.org/abs/2605.22074) 不依赖主观过程 judge，而是从参考推理链构造可验证子问题，在每个子问题位置单独归一化 reward，再把 advantage 分给对应答案片段。
- [SRPO](https://arxiv.org/abs/2605.25507) 会从错误轨迹的中间状态重新采样多个后缀，通过不同的终局结果判断这个位置是否值得修改。它用反事实续写做信用分配，奖励本身仍然来自最终 verifier。
- [SC-GRPO](https://arxiv.org/abs/2606.18810) 利用模型在自身已验证轨迹条件下产生的 token 级 KL 差异，为 GRPO 梯度加权，避免把同样多的信用平均撒给所有 token。

这些方法让我更确定一件事：**给 GRPO 加信用分配，并不等于必须永久增加一个过程 judge。** 还可以细化可验证任务、重采样局部未来，或者从已经验证的轨迹中推导 token 权重。

我也找到了一个与“逐渐拆掉脚手架”很相似的方向。[RuscaRL](https://arxiv.org/abs/2508.16949) 会逐步衰减 rollout prompt 中显式提供的 rubric 指引，让模型把外部提示内化。不过它的训练 reward 仍然使用 rubric，因此和我想的“最终把 rubric reward 本身降到零”还有区别。

目前我没有找到一个成熟方案，完整实现“从头保留 `0/1` 锚，并在检测到能力已经冷启动或代理偏离后，把 rubric reward 退火到零”。所以我更愿意把它看作一个值得实验的训练协议，而不是已经被证明的结论。

## 我会怎么判断脚手架该拆了

我不太想用固定训练步数做切换，因为 step 数并不能说明模型是否真的度过了冷启动。更合理的开关应该来自训练状态本身：

| 我会观察什么 | 它说明什么 | 对应动作 |
|---|---|---|
| held-out `0/1` 成功率、混合奖励组占比 | 模型是否已经能稳定探索到成功路径 | 持续改善后开始退火 |
| rubric reward 与独立 verifier 的差值 | 代理分数是否开始脱离真实结果 | 差值扩大时加速退火 |
| 模板化措辞、异常长度、扰动后成功率 | 模型是否在利用 judge 或 verifier 的捷径 | 停训、审计并回滚 |

如果退到纯 `0/1` 之后又出现大量全错组，我也不一定会重新打开 rubric。还可以优先采样成功率接近决策边界的题目，构造可验证子问题，从失败位置重新采样后缀，或者增加同题 rollout 数。它们提高的是“看到有信息的结果”的概率，而不是继续放宽代理目标。

## 但 0/1 也可能被 hack

我原来比较倾向于把纯 `0/1` 看成更干净的终点，但继续查下去后发现，二元只表示输出空间更窄，并不表示 verifier 就等于真实意图。

单元测试可能漏掉边界条件，答案解析器可能接受异常格式，Agent 可能修改评测环境，训练数据里也可能泄漏答案。[LLMs Gaming Verifiers](https://arxiv.org/abs/2604.15149) 给了一个很直接的例子：任务希望模型归纳可泛化的逻辑规则，但 verifier 只检查实例标签，于是模型通过枚举答案拿到了正确的 `0/1`，却没有学会真正要求的关系。论文加入同构扰动验证后，这条捷径才消失。

所以，后期回到纯 `0/1` 能减少 rubric judge 的攻击面，但不能自动消灭 reward hacking。要让终局奖励更可信，我仍然需要隐藏测试、语义等价或同构扰动、不可被 policy 写入的隔离执行环境，以及与训练 verifier 不同源的审计集。

[CHERRL](https://arxiv.org/abs/2606.04923) 还提供了另一个有用的启发：rubric hacking 的起点可以通过跨 checkpoint 的输出变化和 proxy 分歧来定位。对我来说，这种 onset 检测不只是审计工具，也可以直接成为 rubric 退火的触发信号。

## 我现在的判断

我仍然认为“前期增加密集信号、后期回到可验证结果”这个方向是成立的，但更准确的做法不是换掉目标，而是让目标从头到尾都在，让辅助信号逐渐退出。

> 从第一天就让终局结果定义方向；只在模型还找不到路时借用 rubric 照亮局部。路一旦形成，或者灯开始诱导它绕路，就把灯拆掉。

信用分配负责告诉模型哪一步值得学，reward 设计负责保证它学的是我真正想要的事。这两个问题需要一起解决，却不能互相替代。
