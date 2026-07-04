---
layout: note
title: "SCPO v6 评测分析补页"
summary: "围绕评测、机制分析、适用场景和局限性的 SCPO 补充页面。"
source_file: /assets/posts/scpo/notes/revision-v6-eval-analysis-pages.md
---

# SCPO 小红书图文补充页：评测与总体分析

## 10 评测结论：SCPO 到底涨了多少？

- 标题：评测结果：提升最明显在 1.5B
- 核心数字：
  - Qwen2.5-1.5B：ALFWorld 93.7±4.1，WebShop success 74.8±2.0
  - 相比 GiGPO：ALFWorld +7.0，WebShop success +9.8
  - Qwen2.5-7B：ALFWorld 95.3±1.6，WebShop success 77.5±3.0
- 解释：SCPO 只改 step reward，再进入 advantage estimation，所以 GiGPO -> SCPO 的差值基本就是 semantic progress credit 的贡献。
- 图示：两组柱状对比，GiGPO vs SCPO；旁边一张“只插入 reward shaping，不换 RL 主干”的小流程图。

## 11 收益来源：难任务最吃香

- 标题：收益不是平均撒胡椒面
- 核心数字：
  - LOOK：67.5 -> 88.6，+21.1
  - COOL：79.8 -> 92.8，+13.0
  - PICK2：76.4 -> 90.9，+14.5
  - Ablation overall：default 93.7；chronological 90.4；no monotonicity 90.1；shortest reference 91.7
  - 成本：+29.3s/step，+10.4% overhead；GPU memory 33.5GB -> 35.2GB
- 解释：难任务有更多“失败前做对了一半”的轨迹，SCPO 才有东西可回收。消融说明重排、单调 credit、最长成功参考都不是装饰。
- 图示：左侧三条增益条，右侧消融小表，底部成本条。

## 12 适合什么场景？

- 标题：什么任务适合 SCPO？
- 适合：
  - 长链路、多步交互 agent
  - 稀疏终局奖励
  - 失败轨迹里经常有局部正确步骤
  - 环境状态/页面/对象变化能被语义匹配器捕捉
  - WebShop、ALFWorld 这类导航/工具/网页任务
- 不太适合：
  - 单步任务
  - 全部 rollout 都失败的早期训练
  - 数学/代码这种需要精确符号验证的任务
- 图示：中间 SCPO 过滤器；左边“好场景”流入，右边“不适合”被挡住。

## 13 缺点与改进

- 标题：它不是万能 credit 机器
- 缺点：
  - 必须有 successful sibling；全失败组不改
  - cross-encoder 是软语义匹配，不是因果验证
  - 可能 over-credit / under-credit
  - 会增加 cross-encoder 推理成本
  - 局部像成功，不代表全局一定对
- 改进：
  - 用成功轨迹 buffer 解决全失败组
  - 训练领域专用 matcher / verifier
  - 加状态转移一致性检查，区分“像”和“真的有效”
  - 动态阈值 θ / 动态权重 λ，按训练阶段调整
  - 与 GiGPO/HGPO/HCAPO 等主干组合
- 图示：左侧风险清单，右侧改进路线图，中间放一个“semantic match ≠ causal proof”的警示牌。

