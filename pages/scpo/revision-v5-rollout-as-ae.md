---
layout: note
title: "SCPO v5 Rollout 修订"
summary: "围绕 rollout、AS 和 AE 的 SCPO 图文修订记录。"
source_file: /assets/posts/scpo/notes/revision-v5-rollout-as-ae.md
---

# SCPO V5：N 次 rollout、小 r、AS/AE 约束

## 08C-1：N 次 rollout 中怎么算小 r

目标：体现 `r` 不是两条轨迹单独算，而是在同一个 prompt 的 rollout group 内算。

画面结构：

1. 同一个任务 prompt：买机票。
2. 模型采样 `N=8` 条 rollout。
   - 4 条成功，4 条失败。
3. 在成功轨迹里选择 reference。
   - 示例：选最长成功轨迹。
4. 对每条失败轨迹，逐步和 reference 的每一步做 cross-encoder 相似度矩阵。
5. 对每个候选匹配应用三道约束：
   - `M > λ`
   - 单调前进
   - 每个参考位置最多用一次
6. 得到每个失败步骤的小 `r_i`。
   - 搜索航班：`M=0.92 -> r=0.84`
   - 支付失败：`M=0.40 -> r=0`

关键句：`r_i` 是 rollout group 内的“失败步骤 vs 成功 sibling”的局部信用。

## 08C-2：AS 和 AE 两条通道如何被约束

目标：体现 AS / AE 不是随便都被塑形。

左通道：Step channel，允许塑形。

1. 对某个失败步骤得到 `r_i=0.84`。
2. 计算塑形回报：
   - `R̃_i = R_i + α r_i`
   - 搜索航班：`0 + 0.5 × 0.84 = 0.42`
3. 找锚点状态组。
   - `N=8` 条 rollout 中，有 5 条经过“搜索航班”锚点。
4. 在锚点组内归一化，得到 `AS`。
   - `AS: -0.5 -> -0.2`

右通道：Episode channel，禁止塑形。

1. 只看整条 rollout 的原始终局 reward。
2. 不使用 `R̃_i`。
3. 失败轨迹仍失败。
4. `AE: -0.5 -> -0.5`

合并：

- `A = AE + ω AS`
- Before：`-0.5 + 0.5×(-0.5) = -0.75`
- After：`-0.5 + 0.5×(-0.2) = -0.60`

关键句：SCPO 的约束是“只修正步骤优势 AS，不塑形终局优势 AE”。


