---
layout: post
title: "多 Agent 协作：五种模式、完成条件与选型"
date: 2026-07-15 20:00:00 +0800
summary: "用同一场城市文化漫游活动，对照 Supervisor、GroupChat、Handoff、State Machine 与 Event Bus 的消息流、完成条件和适用边界。"
tags: [智能体, 多智能体, Agent Runtime, 系统设计]
category: Agents
cover: /assets/posts/multi-agent/images/001-overview.png
body_class: multi-agent-post
---

多 Agent 的关键不在于「有多少角色」，而在任务关系：能独立拆分、最后统一验收的任务，适合中心派工；角色之间需要持续交换信息、相互修正时，才需要真正的多 Agent 协作。

本文统一用一个任务比较五种模式：为年轻人策划一场周末城市文化漫游活动，预算 8,000 元。团队由调研、内容、排期、预算和协调角色组成，最终交付名称、地点、排期、预算与执行物料。

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/multi-agent/images/001-overview.png' | relative_url }}" alt="五种多 Agent 协作模式总览" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">01 / Overview</p>
<h2>先按任务关系选结构</h2>

如果任务可以拆成互不影响的子块，就让负责人派工、收结果、统一验收；如果路线改变会影响内容，内容又会影响预算，则需要让角色来回协商。

五种模式的本质区别是：谁掌握控制权、信息如何到达下一位 Agent，以及系统如何认定「已经完成」。
</div>
</section>

## 统一输出契约

所有模式都以同一份结构化结果收敛，才能比较协作方式本身，而不是比较五个不同任务。

```json
{
  "event_name": "沿着建筑读懂城市",
  "venue": "城市美术馆与历史街区",
  "schedule": "周六 14:00-18:00",
  "budget": 7800,
  "deliverables": ["活动主视觉", "路线手册", "现场执行清单"]
}
```

## 1. Supervisor + Sub-agents

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/multi-agent/images/002-supervisor.png' | relative_url }}" alt="Supervisor 中心派工架构" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">02 / Supervisor</p>
<h2>中心拆解、并行派工、统一定稿</h2>

Supervisor 把调研、内容、排期和预算分别交给 Worker。Worker 彼此不直接通信，结果都回到中心节点；中心节点处理冲突并输出唯一方案。

**适合：**资料搜集、独立文件分析、多版本文案等可清楚拆分的一次性任务。

**取舍：**结构简单、并行效率高、易调试；但中心节点会成为信息与决策瓶颈。
</div>
</section>

完成条件应由 Supervisor 显式检查：地点、主题、排期、预算和交付物齐全，且预算不超过上限。可运行示例：[01_supervisor.py]({{ '/assets/posts/multi-agent/code/01_supervisor.py' | relative_url }})。

## 2. GroupChat / 委员会协作

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/multi-agent/images/003-groupchat.png' | relative_url }}" alt="GroupChat 共享对话架构" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">03 / GroupChat</p>
<h2>共享对话、讨论分歧、形成共识</h2>

所有成员读取同一份 transcript：调研提出受众偏好，内容提出主题，运营指出路线问题，预算说明资源边界，主持人再汇总结论。每位成员都能直接修正其他角色的方案。

**适合：**创意会、产品方案讨论、跨部门规划，以及需要多角度权衡的任务。

**取舍：**能暴露盲点；但对话成本高，必须设置主持策略、共识标准和最大轮数。
</div>
</section>

完成不等于「没人再说话」，而是必要角色已发言、关键分歧已解决、成果字段齐全。示例：[02_group_chat.py]({{ '/assets/posts/multi-agent/code/02_group_chat.py' | relative_url }})。

## 3. Handoff / 接力交接

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/multi-agent/images/004-handoff.png' | relative_url }}" alt="Handoff 接力交接架构" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">04 / Handoff</p>
<h2>状态与控制权一起交给下一位专家</h2>

Research 确定受众和地点后交给 Content；Content 完成主题后交给 Schedule；最后由 Budget 核算。任意时刻通常只有一位 Agent 拥有任务控制权。

**适合：**咨询转接、选题到成稿的内容流水线、需求—设计—排期等专家接力流程。

**取舍：**职责边界很自然；但串行限制并行，前序判断错误会沿链路传递。
</div>
</section>

交接 Envelope 应包含累计 State、来源、交接理由与 hop 数；系统还应限制最大跳数并检测 A→B→A 循环。示例：[03_handoff.py]({{ '/assets/posts/multi-agent/code/03_handoff.py' | relative_url }})。

## 4. State Machine / DAG

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/multi-agent/images/005-state-machine.png' | relative_url }}" alt="State Machine 状态机架构" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">05 / State Machine</p>
<h2>节点执行工作，图控制流程</h2>

任务被建模为节点、共享状态和条件边。调研、内容、排期、预算依次写入 State；若预算超限，条件边把流程带回调整节点；满足约束才进入 END。

**适合：**稳定的内容生产、数据处理、发布流程，以及需要 checkpoint 与断点恢复的长任务。

**取舍：**流程清晰、可测试、可回放；但需要前期设计 State schema，频繁变更的流程维护成本较高。
</div>
</section>

节点只返回增量 patch，GraphRunner 合并状态后才由条件边选择下一节点。完成条件是到达 END 且输出 schema 与业务约束通过校验。示例：[04_state_machine.py]({{ '/assets/posts/multi-agent/code/04_state_machine.py' | relative_url }})。

## 5. Event Bus + Scheduler

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/multi-agent/images/006-event-bus.png' | relative_url }}" alt="Event Bus 事件驱动架构" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">06 / Event Bus</p>
<h2>订阅事件、异步唤醒、长期演化</h2>

Agent 不直接调用彼此，而是订阅 Topic。`event.created` 唤醒相应角色；角色写入状态后发布 `venue.ready`、`content.ready` 等后续事件。发布者无需知道订阅者。

**适合：**长期运营的平台、跨服务团队、需要不断增加能力的 Agent Runtime。

**取舍：**角色解耦、异步扩展性强；但事件顺序、重复投递、状态一致性与调试更加复杂。
</div>
</section>

Event Bus 只负责消息传递，不能把「队列为空」误判为业务完成。应以 `TaskState + CompletionChecker + StopPolicy` 检查必填字段、资源约束与未解决依赖。示例：[05_event_bus.py]({{ '/assets/posts/multi-agent/code/05_event_bus.py' | relative_url }})。

## A2A、Multi-Agent 与 MCP 的边界

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/multi-agent/images/007-a2a.png' | relative_url }}" alt="A2A 在多 Agent 架构中的位置" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">07 / A2A</p>
<h2>A2A 不是第六种协作模式</h2>

前五种模式回答「团队内部如何协作」；A2A 解决独立 Agent 服务如何发现彼此、委托任务、报告状态和交换 Artifact。MCP 则解决 Agent 如何访问工具与外部数据。

一句话：**团队怎么协作看 Multi-Agent Patterns；Agent 怎么互相委托看 A2A；Agent 怎么调用工具看 MCP。**
</div>
</section>

## 快速选型

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/multi-agent/images/008-selection.png' | relative_url }}" alt="多 Agent 协作模式选型图" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">08 / Selection</p>
<h2>从最简单、足够用的结构开始</h2>

能拆分并统一验收，选 **Supervisor**；需要讨论共识，选 **GroupChat**；总能明确下一位专家，选 **Handoff**；阶段与条件稳定，选 **State Machine**；角色长期存在且异步工作，选 **Event Bus**。

真实系统经常组合：外层状态机管阶段，创意节点内部 GroupChat，节点内再用 Supervisor 并行派工，长期变化再由 Event Bus 传播。
</div>
</section>

## 对比总结

| 模式 | 控制方式 | 并行能力 | 主要优势 | 主要代价 |
|---|---|---:|---|---|
| Supervisor | 中心统一调度 | 高 | 简单高效 | 中心瓶颈 |
| GroupChat | 共享对话协商 | 中 | 多角度共创 | 对话成本 |
| Handoff | 控制权逐棒转移 | 低—中 | 专业接力 | 前序影响后序 |
| State Machine | 图与条件边 | 高 | 稳定、可回放 | 状态设计成本 |
| Event Bus | 发布/订阅 | 很高 | 长期异步扩展 | 分布式复杂度 |

先选择能完成业务目标的最简单结构；只有角色确实需要长期自治、异步协作和持续扩展时，再承担更复杂的运行机制。

完整示例说明见：[README]({{ '/assets/posts/multi-agent/code/README.md' | relative_url }})。
