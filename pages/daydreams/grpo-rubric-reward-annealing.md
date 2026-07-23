---
layout: post
title: "让脚手架退场，让终点留下：GRPO 的信用分配与奖励退火"
date: 2026-07-23 23:05:04 +0800
summary: "让 0/1 终局奖励始终充当锚点，把 rubric 当作可退火的信用分配脚手架。"
tags: [Daydreams, GRPO, RLVR, 信用分配, Reward Hacking]
series: daydreams
daydream: true
permalink: /daydreams/grpo-rubric-reward-annealing/
cover: /assets/daydreams/grpo-rubric-reward-annealing/images/01-credit-backtrace.png
body_class: daydream-post
---

原生 GRPO 有一种很强、也很粗的诚实：一条 rollout 最后做对了，就整体鼓励；做错了，就整体压低。对于数学、代码或可执行 Agent 任务，终点的 `0/1` 可以很干净，但它不会告诉模型，前面究竟是哪一步把事情做对了。

我更愿意把问题拆成三层：**奖励是否稀疏、信用分到多细、奖励规格是否真的代表目标**。过程 rubric 主要解决前两层，却可能在第三层制造新的漏洞。

## 一个终局分数，压到整条序列

对同一个问题，GRPO 采样一组回答，取得终局奖励 `r_i`，再做组内标准化：

$$
A_i = \frac{r_i-\bar r}{\operatorname{std}(r)+\epsilon}.
$$

标准做法会让回答里的所有 token 共享这个序列级 advantage。于是，失败答案中局部正确的步骤一起受罚；成功答案里的绕路、偶然猜中和关键推理又一起受赏。若一组 rollout 全对或全错，组内相对信号还会接近消失。

<figure>
  <img src="{{ '/assets/daydreams/grpo-rubric-reward-annealing/images/01-credit-backtrace.png' | relative_url }}" alt="Tao 从终局 0/1 奖励向后拉回橙色信用线，只连接真正影响结果的关键动作" loading="lazy">
  <figcaption>终局奖励只有一次；信用分配要回答的是，它应该回到哪些动作。</figcaption>
</figure>

现有方法已经在尝试把这根线拉得更准：

- [Step-wise Rubrics as Rewards](https://arxiv.org/abs/2605.17291) 把 rubric 条目归因到具体推理步骤，并把 step reward 与 outcome reward 的 advantage 分开计算。它最接近“过程信号负责教学，终局信号负责定锚”。
- [SCRL](https://arxiv.org/abs/2605.22074) 不引入主观 judge，而是从参考推理链构造可验证子问题，在子问题位置分别归一化 reward，再把 advantage 分给对应答案片段。
- [SRPO](https://arxiv.org/abs/2605.25507) 从错误轨迹的中间状态重新采样多个后缀，用不同终局结果判断这个位置是否值得改。它用反事实续写做信用分配，仍只依赖最终 verifier。
- [SC-GRPO](https://arxiv.org/abs/2606.18810) 用模型在自身已验证轨迹条件下产生的 token 级 KL 差异，为 GRPO 梯度加权，目标也是避免把信用均匀撒给所有 token。

这些路线说明：**给 GRPO 加信用分配，不等于必须永久增加一个过程 judge。** 可以细化 verifier、重采样局部未来，也可以从已验证轨迹推导 token 权重。

## Rubric 应该是脚手架，不是第二个终点

我的设想不是先用 rubric reward，某个时刻再突然换成 `0/1`。更稳妥的形式，是从第一步开始就保留终局锚，只让辅助项退火：

$$
A_t^{\text{total}} = A^{0/1} + \lambda_k A_t^{\text{rubric}}.
$$

两种 advantage 应分别归一化，再进入同一次 policy update。这样 rubric 的尺度变化不会挪动终局基线，`\lambda_k` 也只表示“现在还需要多少脚手架”。

<figure>
  <img src="{{ '/assets/daydreams/grpo-rubric-reward-annealing/images/02-anchored-annealing.png' | relative_url }}" alt="Tao 逐步关小 rubric 辅助奖励阀门，同时保持终局 0/1 奖励主线持续连接策略更新机器" loading="lazy">
  <figcaption>退场的是辅助代理，不是可验证目标。</figcaption>
</figure>

这个过程更像三个连续状态，而不是三次换目标：

1. **冷启动**：`0/1` 始终存在，rubric 权重较高，帮助模型探索到第一批可复制的成功轨迹。
2. **内化**：当 held-out 成功率稳定上升、同组中不再频繁全错，并且正确轨迹已经覆盖主要策略形态时，逐步降低 rubric 权重。
3. **清场**：当 rubric 分继续上涨，但独立 verifier、扰动测试或人工抽检开始停滞时，加速把权重降到零；若真实指标已经回落，还应回滚到分叉前的 checkpoint，而不只是关掉奖励。

这与 [RuscaRL](https://arxiv.org/abs/2508.16949) 有相似的“脚手架逐渐撤掉”直觉，但并不相同：RuscaRL 逐渐衰减的是 rollout prompt 中显式提供的 rubric 指引，训练 reward 仍然使用 rubric。就我检索到的工作而言，尚没有一个成熟方案完整实现“始终保留 0/1 锚，并由代理偏离触发 rubric reward 最终归零”。因此，这里更适合作为一个待验证的训练协议，而不是已有定论。

## 退火不应只看训练步数

固定第多少 step 切换很方便，却没有回答模型是否真的度过了冷启动。更有用的是同时观察三组曲线：

| 观察量 | 它回答什么 | 触发动作 |
|---|---|---|
| held-out `0/1` 成功率、混合奖励组占比 | 模型是否已经能探索到成功路径 | 稳定改善后开始退火 |
| rubric reward 与独立 verifier 的差值 | 代理分是否脱离真实结果 | 差值持续扩大时加速退火 |
| 模板化措辞、异常长度、扰动后成功率 | 模型是否在利用 judge 或 verifier 的捷径 | 停训、审计并回滚 |

如果退到纯 `0/1` 后又出现大量全错组，未必应该重新打开 rubric。还可以把算力用在成功率接近决策边界的题目、可验证子问题、失败位置 reset，或扩大同题 rollout 数。这些方法提高的是“看到有信息的结果”的概率，而不是继续放宽代理目标。

## 0/1 也不是天然不可 hack

二元只表示输出空间更窄，不表示 verifier 等于真实意图。单元测试可能漏掉边界条件，答案解析器可能接受异常格式，Agent 可能修改评测环境，数据里也可能泄漏答案。

[LLMs Gaming Verifiers](https://arxiv.org/abs/2604.15149) 给出了一个很干净的例子：任务希望模型归纳可泛化的逻辑规则，但只检查实例标签的 verifier 允许模型枚举答案过关。reward 仍然是可验证的 `0/1`，模型却没有学会任务真正要求的关系。论文用同构扰动补上 verifier 后，这条捷径才消失。

所以，后期切回 `0/1` 只能减少 rubric judge 的攻击面，不能自动消灭 reward hacking。更干净的终局奖励至少还需要：隐藏测试、语义等价与同构扰动、不可被 policy 写入的隔离执行环境，以及与训练 verifier 不同源的审计集。[CHERRL](https://arxiv.org/abs/2606.04923) 进一步表明，rubric hacking 的起点可以通过跨 checkpoint 输出变化和 proxy 分歧来定位；这种 onset 检测正适合成为退火开关的一部分。

## 最后的判断

这个方向成立，但核心不应写成“前期相信 rubric，后期相信 0/1”。更准确的是：

> 从第一天就让终局结果定义方向；只在模型还找不到路时借用 rubric 照亮局部。路一旦形成，或者灯开始诱导它绕路，就把灯拆掉。

信用分配负责告诉模型哪一步值得学，reward 设计负责保证它学的是我们真正要的事。这两个问题可以合作，却不能互相替代。
