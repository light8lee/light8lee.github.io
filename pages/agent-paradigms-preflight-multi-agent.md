---
layout: post
title: "Agent 范式、预观测与多 Agent 协作"
date: 2026-09-01 10:00:00 +0800
summary: "把 Agent 设计为工程控制问题：以范式选择、预观测、版本化交接和全局验收约束系统行动。"
category: "Agent 系统"
tags: [Agent, 多智能体, PlanAndExecute, ReAct, Workflow, 预观测, AI工程]
cover: /assets/pages/agent-paradigms-preflight-multi-agent/images/01-Agent执行范式.png
permalink: /pages/agent-paradigms-preflight-multi-agent.html
---

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/01-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 01：先判断可回滚、信息、流程与验收" loading="lazy">
  <figcaption>01 / 选择范式前的四个问题</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 图文导览：先别急着选名字

每张图都对应下文的一段论证：先判断行动能否撤回、现场信息是否充分、路径是否稳定、谁负责验收；再决定 Plan and Execute、ReAct、Workflow 及其组合。完整原文随后保留。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/02-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 02：三种决定下一步的方式" loading="lazy">
  <figcaption>02 / 三种控制方式</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

Plan and Execute 先计划再执行；ReAct 做一步、观察结果、再调整；Workflow 让确定步骤按规则运行。它们是控制流选择，不是高低排序。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/03-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 03：Plan and Execute 保护高成本和不可逆边界" loading="lazy">
  <figcaption>03 / Plan and Execute</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

迁移、发布、付款、删除数据等高代价行动，应在清楚目标、范围和依赖后执行，并把重新规划放在新的受控事务开始前。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/04-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 04：ReAct 的推理、行动和观测循环" loading="lazy">
  <figcaption>04 / ReAct</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

ReAct 适合信息只能边做边获得、单步成本低且可回滚的情境；它也需要预算、工具白名单、写入范围、独立验证与停止条件。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/05-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 05：Workflow 处理稳定重复的动作" loading="lazy">
  <figcaption>05 / Workflow</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

输入输出稳定、规则明确且每次都应执行的动作，应交给 Workflow 或普通代码：更快、更可审计，也不把固定判断重复压给模型。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/06-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 06：将三种范式放到合适环节组合" loading="lazy">
  <figcaption>06 / 混合架构</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

现实任务往往是混合的：确定路径先自动化，未知点受约束探索，最后再通过验证和 Commit 进入高风险提交。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/07-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 07：预观测建立当前事实与约束" loading="lazy">
  <figcaption>07 / 预观测</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

在规划前读取配置、权限、日志、依赖和备份等低成本只读事实，能够把 unknown unknown 转为可判断的已知事实或已知未知。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/08-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 08：多 Agent 的正式通信是版本化交接" loading="lazy">
  <figcaption>08 / 版本化交接</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

多 Agent 不是自由聊天；每次上下游交接应明确输入版本、产物、证据、兼容性和受影响范围，使后续节点不会在旧事实之上继续工作。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/09-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 09：局部最优不等于全局目标达成" loading="lazy">
  <figcaption>09 / 局部与全局</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

每个节点的局部 KPI 都变好，也可能让端到端结果退化；局部目标必须同时带着不可破坏的全局约束与最终验收函数。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/10-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 10：全局协调职责与独立验收" loading="lazy">
  <figcaption>10 / 全局账本</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

全局协调职责不等于必须存在名为 Supervisor 的 Agent；它可以是状态机、依赖图、验证服务或人工集成，但要维护目标、预算、失效关系与准入决策。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/11-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 11：上游变更的影响锥与双速优化" loading="lazy">
  <figcaption>11 / 受控变更传播</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

越上游的变更影响越大；适合以局部快速修复配合检查点上的慢速端到端验证，并按依赖图仅重跑真正受影响的分支。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/agent-paradigms-preflight-multi-agent/images/12-Agent执行范式.png' | relative_url }}" alt="Agent 执行范式图文 12：先观测、局部自主、全局验收" loading="lazy">
  <figcaption>12 / 最终原则</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

成熟系统不是让模型包办一切，而是让每一步拥有合适的自由度、明确权限、可检查证据与不可逆边界。

</div>
</section>

## 完整原文

> 本文把 Agent 设计看作一个工程控制问题：何时让模型理解和决策，何时用确定性流程替代模型，何时允许探索，以及如何把不可逆动作关进可验证的提交边界。

## 0. 原始观点（完整保留）

一个就是 Plan and Execute 这种形式，它适合执行成本很高，必须要提前规划好。然后它只能一次性执行，不能在后续有别的操作了，因为它的操作是破坏型的，只能执行，所以它执行就结束了。

然后 ReAct 这种形式，它是制作成本相对较低，它可以不断地调整自己的状态。然后它可能也不会有破坏型的机制，或者是它的破坏性是可以被挽救的。

但是它的缺点是，对模型能力考验比较多，因为它其实在 ReAct 这个过程中，把理解、执行、观测、分析，然后业务收的能力都汇总到一个 Agent 形式本身了。所以它的缺点就是，任意一个能力欠缺都可能导致整个循环容易失败。

然后 Workflow 它的好处就是，它可以，如果流程相对比较简单，Workflow 它可以更清晰直接地达成我们想要的一个结果。然后相比 ReAct 形式，它的好处就是，ReAct 可能还是偏学院的形式，我们把内容都告诉它，希望它能自己发现什么问题去解决，但是没有比较硬的约束，Workflow 就有约束。

但是 Workflow 的坏处就是它太过于固定了。如果流程很复杂，那其实人比较难去创建出来一个比较完美的形式。

然后这其中就可以去做一些混合，比如说，因为 LLM 它最擅长的，或者其他无可替代的一个点就是它具有比较强的一个理解能力，所以把强依赖 LLM 理解这部分是需要，不管是 Plan，还是 ReAct，还是 Workflow 的，需要把它特重凸显出来。

但如果有些工具，它可以没必要让 LLM 自己去调用它，那其实最好的话还是提前就把这些工具调用好。如果是成本很高的话，那才会涉及到动态地去调用，动态的决策。

提前调用工具的好处是避免 unknown unknown，有了信息模型才可能知道要做什么。

然后我才会聊到多 Agent 协作，遇到过的问题是不同 Agent 如何传递信息，尤其是多个 Agent 之间如果相互协作需要通信，但是一开始肯定不会是搭得特别好，就是比较优化优化的话又可能在前一个改了后面也得跟着改的情况。

我说的多 Agent 协作本来也不是自由聊天，而且有个上下游依赖的情况，在这种情况下分别优化可能会导致各自局部最优，需要有个全局视角统一优化。

以及各自优化可能存在中间 Agent 无法有明确的优化信号，统一优化可以从下游反传信号，但是缺点是优化效率比较低，尤其是越上游更新效率越低。

而且也不一定存在 Supervisor。

> 说明：本节按原始表达保留；唯一术语调整是用户后续明确更正的 “Plan and Execute”（原先口述为 “plan, act and execute”）。后续章节是对这些观点的结构化与补充，不替代本节。

## 1. 问题不是“哪种 Agent 最强”

Plan and Execute、ReAct 和 Workflow 不是互相替代的产品标签，而是三种不同的控制方式。选择它们的依据不应只是“工具调用贵不贵”，而是行动失败的总成本：

```text
总失败成本 = 执行成本 + 错误影响 + 回滚难度 + 外部副作用 + 延迟代价
```

一次只读的日志查询也会消耗时间和 token，但失败代价低；一封对外邮件、一次生产发布或删除数据，即使 API 调用便宜，仍可能是高风险动作。前者可以自动探索，后者应在明确的提交边界后执行。

## 2. 一个完整的分类坐标系

不要把所有名称都并列为“Agent 范式”。真实系统通常由四个相互独立的维度组合而成。

| 维度 | 要回答的问题 | 常见选项 |
| --- | --- | --- |
| 控制流 | 下一步如何决定？ | Workflow、Plan and Execute、ReAct、搜索、反思修订 |
| 组织结构 | 谁负责决策和执行？ | 单 Agent、Supervisor–Worker、Multi-Agent、Human-in-the-loop |
| 记忆与学习 | 如何从过去获益？ | 无状态、工作记忆、跨任务经验、参数更新 |
| 治理边界 | 哪些动作被允许？ | 自动执行、验证门、审批门、只出方案不执行 |

因此，一套系统可以同时是“Workflow 驱动、局部 ReAct、Supervisor–Worker、具备经验记忆、外部发布需人工 Commit”的系统。这比说“它是一个 ReAct Agent”更准确。

## 3. 控制流范式

### 3.1 单步 Router / Tool Calling

```text
输入 → 分类或参数提取 → 固定工具调用 → 输出
```

适用于问题、工具和输出都清楚的场景，例如查询订单、格式转换、固定字段校验。这通常还不算完整的自主 Agent：它没有持续状态、没有主动探索，也没有自我修复。

价值在于把确定性部分从 LLM 中拿出来。若每次都要求模型重新判断同一个固定动作，系统会更慢、更贵，也更不稳定。

### 3.2 Workflow / 有限状态机 / 行为树

```text
状态 A → 条件判断 → 状态 B / 状态 C → 验证 → 结束
```

Workflow 将流程、权限、预算和停止条件写进系统。它适合稳定、重复、主路径清晰的工作：数据处理、发布前检查、审批、报告生成、重试与回滚。

优势：可控、容易测试、可审计、结果稳定。

局限：异常路径与长尾情形如果完全靠人工编码，流程会快速膨胀；面对真正的语义歧义时，硬规则也往往不够。

### 3.3 Plan and Execute

```text
理解目标与约束 → 形成计划 → 按计划执行 → 验收
```

它适用于多步骤、高成本、目标和约束可以先说清的任务。计划阶段负责分解、排序、估计风险和识别依赖；执行阶段则尽量减少临场改目标或扩大操作范围。

特别适用于不可逆动作：发布、付款、删除、迁移、对外沟通、修改生产配置等。对此类动作，应把“计划”和“Commit”分开，且在 Commit 前再验证前提是否仍成立。

需要注意：Plan and Execute 不等于“执行完后永远不能再做别的”。工程上更常见的是有限段的滚动规划：

```text
Plan → 执行一小段 → 验证 → 必要时 Replan → 执行下一段
```

区别在于：重规划发生在新的受控事务开始前，而不是让 Agent 在不可逆提交途中自由扩张动作。Plan-and-Solve 的研究也明确区分先拆分子任务、再按计划完成子任务的两阶段思路。<https://arxiv.org/abs/2305.04091>

### 3.4 ReAct

```text
Reason → Act → Observe → Reason → …
```

ReAct 将推理轨迹和外部行动交错进行：行动取得新信息，推理据此修订接下来的行动与计划。<https://arxiv.org/abs/2210.03629>

它适合：

- 单步成本低，或能回滚；
- 环境信息只能在操作中获得；
- 任务存在大量未知或例外；
- 允许在预算内试错。

它的弱点不是“理论化”，而是把理解、工具选择、状态追踪、观测解释、错误归因、业务判断、收敛与停止，集中压给同一个循环。模型、工具描述、观测质量、记忆和验收标准中任一环节较弱，都可能造成循环、误归因、无效工具调用或越界行动。

因此 ReAct 必须有外部约束：最大轮数、费用预算、可调用工具白名单、可写范围、独立验证器和明确停止条件。

### 3.5 搜索型 Agent

```text
生成多个候选计划/轨迹 → 估计或模拟结果 → 选择/展开更好的分支 → Commit
```

它不急于沿单一路径行动，而是在低副作用的推演、沙箱或模拟环境中比较多个候选方案。适用于复杂推理、策略空间大、单次生成不可靠但可以廉价评估的任务。

搜索应尽量发生在真实外部动作之前。否则“多尝试”会直接变成多次副作用。

### 3.6 生成—批评—修订与反思

```text
生成候选物 → Critic / Validator 给出反馈 → 修订 → 再验证
```

适合代码、文档、方案等存在较清晰验收信号的产物。这里的 Critic 最好不是生成者自身；否则会出现“执行者自证正确”的偏差。

反思型 Agent 则把一次任务失败总结为后续可使用的语言经验。Reflexion 将环境反馈转化为文本反思，并放入 episodic memory，供下一轮任务使用，而不是更新模型权重。<https://arxiv.org/abs/2303.11366>

反思不应被当作泛化保证。经验必须附带适用条件、证据和版本，不能把一次局部成功的心得提升成普遍规则。

## 4. 预观测：在规划前建立世界模型

工具并不都应由 LLM 临场决定调用。有一类工具调用的主要目的不是执行任务，而是让系统知道当前世界是什么样。

```text
Preflight / Reconnaissance
  → 当前事实、约束、权限与风险
  → LLM 语义理解与计划
  → 局部探索或确定性执行
  → 验证与 Commit
```

例如在修改一个系统之前，可先自动、只读地获取：当前配置与版本、目录或资源清单、权限、依赖状态、最近错误日志、备份与回滚能力、外部接口可用性。

这不是为了“调用更多工具”，而是减少模型面对的 unknown unknown：

- 将一部分未知转为已知事实；
- 将另一部分转为已知未知，明确下一步该查什么；
- 让计划建立在当前状态上，而非默认假设、旧记忆或幻觉上。

预观测工具的选择标准是：信息价值高、调用成本低、无副作用，并且结果能够实质改变后续决策。无目的地全量收集上下文会制造噪声、延迟和注意力稀释。

## 5. LLM 应该被放在什么位置

LLM 最不可替代的能力不是“会调用工具”，而是语义理解和判断：

- 从模糊请求中提取真实目标、约束和隐含偏好；
- 理解观测结果意味着什么，识别异常属于哪一类问题；
- 在多个候选工具、计划和路径中作语义选择；
- 判断结果是否满足业务意图，而不仅是格式通过；
- 将重复出现的判断沉淀为规则、Skill 或 Workflow 节点。

相反，输入输出稳定、规则明确、每次都应执行的操作，应由 Workflow 或普通代码直接接管。典型例子包括固定的数据拉取、类型转换、schema 校验、打包、日志归档和发布前的机械检查。

## 6. 多 Agent 的本质：一个分布式协作问题

多 Agent 并不是把一个任务交给更多模型就自然更强，也不是让多个 Agent 自由聊天。即使每个 Agent 都只通过结构化的上下游输入、输出和任务契约协作，仍会遇到一个更本质的问题：上游和下游各自优化，可能导致系统整体变差。

例如：上游 Agent 以“产出最完整的需求说明”为局部目标，可能给下游增加大量无关分支；下游 Agent 以“当前模块性能最高”为局部目标，可能选择破坏接口兼容性的方案；评估 Agent 又可能只看局部测试通过率，忽略整体成本、时延或最终用户体验。每一个节点都更优，不代表端到端结果更优。

因此，其核心问题变为：

> 谁拥有全局目标和最终验收函数？谁拥有当前事实与依赖图？某次局部优化影响谁？旧结果何时仍有效？由谁判断端到端收益、决定返工、升级或提交？

最常见的失败是上下文版本漂移：A 修改了需求解释、数据结构或中间结论；B 仍在使用旧输入；C 又基于 B 的旧产物继续整合。每个节点看似都完成了任务，最终系统却不一致。

### 6.1 正式通信是有版本的上下游交接

这里讨论的并非自由聊天式协作。多 Agent 的正式通信应是有边界的上下游交接：上游输出被声明为下游可读取的输入版本，下游在此版本和任务契约内工作。自由对话最多用于澄清歧义、讨论方案和提出候选假设，不能承担正式状态与依赖管理。

多 Agent 应拥有一个共享的、版本化的事实源：

```text
任务目标与验收条件
当前事实及其证据
已产出工件及版本
尚未验证的假设
风险、阻塞与权限状态
下一步与责任归属
```

Agent 通信的主载体应是产物引用和状态补丁，而不是整段聊天记录。

### 6.2 每次交接都应是一个小型契约

Worker 的正式输出建议至少包含：

```yaml
status: completed | failed | blocked | needs_review
artifacts:
  - uri: ...
    version: v13
evidence:
  - validator: ...
    result: pass
state_patch:
  facts_added: []
  assumptions_invalidated: []
compatibility: additive | behavior_changed | breaking
affected:
  - downstream_task_or_artifact_id
next_step: ...
```

其中 `compatibility` 是控制返工规模的关键。

| 变更类型 | 含义 | 默认后续动作 |
| --- | --- | --- |
| additive | 增加信息或能力，旧接口仍成立 | 下游可继续，按需读取新版本 |
| behavior_changed | 接口未变，但语义或行为可能改变 | 标记为待验证，仅重跑受影响验证器 |
| breaking | 输入、输出、前提或目标已不兼容 | 将依赖该版本的下游标为 stale，重新调度 |

### 6.3 全局协调职责不等于必须存在 Supervisor

全局视角需要被实现，但不必由一个名为 Supervisor 的 Agent 来实现。更准确的说法是：系统中必须存在“全局协调职责”，负责保存或执行全局目标、端到端验收、依赖关系和变更传播；Worker 可以把局部目标优化到很好，但不能自行把局部改进认定为全局改进。

这种职责有多种实现方式：

| 实现方式 | 谁承担全局协调职责 | 适用特点 |
| --- | --- | --- |
| Supervisor–Worker | 一个上层 Agent 或服务 | 任务拆分和动态重规划较多 |
| DAG / 状态机调度器 | 确定性编排代码 | 流程、依赖和触发条件较稳定 |
| 共享状态 + 事件协议 | 各 Agent 订阅版本变化并按规则响应 | 需要去中心化、异步协作 |
| 独立评估与准入服务 | Validator、策略引擎、审批门 | 重点是验收、权限和 Commit 控制 |
| 人工集成 | 人维护目标并裁决冲突 | 高风险、低频或尚在探索期的系统 |

因此，真正的架构选择不是“要不要 Supervisor”，而是“全局目标、依赖图、验收与变更传播由谁维护，以何种协议维护”。

若采用 Supervisor–Worker，它的职责可以是：

```text
Supervisor
  ├─ 保持全局目标、预算、风险约束与端到端验收函数
  ├─ 将全局目标分解成有边界但不脱离全局的局部目标
  ├─ 分配任务给 A，并明确其局部优化不得破坏的全局约束
  ├─ 为 B 固定其允许读取的 A 输出版本
  ├─ 交给 C 做独立验证
  ├─ 接收 state_patch
  ├─ 判断局部收益是否转化为端到端收益、兼容性与受影响下游
  └─ 决定继续、返工、升级或 Commit
```

即使采用这种模式，也不要求一个庞大的中心化 LLM。Supervisor 可以主要由状态机、调度代码、依赖图和全局验证规则组成，LLM 只在歧义判断、异常诊断、权衡冲突和重规划处介入。

### 6.4 区分局部指标与全局目标

要避免“分别优化，整体退化”，每个 Worker 的任务契约应包含两部分：

```text
局部目标：这个节点希望提高什么？
全局约束：即使局部结果变好，也绝不可破坏什么？
```

例如，代码生成 Worker 的局部目标可以是“功能实现与单元测试通过”，但全局约束还包括接口兼容、总时延、资源预算、安全边界和最终用户路径。只有端到端验证通过，局部优化才被接受为系统改进。

全局视角至少需要维护：

- 端到端目标与优先级，而不只是节点 KPI；
- 上下游依赖图，以及每条边使用的输入版本；
- 不可被局部优化破坏的约束；
- 全局预算：时间、工具成本、风险和返工次数；
- 最终验收函数及其证据。

### 6.5 中间 Agent 的优化信号与下游反传

多 Agent 流水线还会遇到 credit assignment（贡献归因）问题：最终结果变好或变差时，究竟应由哪个中间 Agent 调整、应调整什么，往往并不明确。

```text
上游 A → 中间 B → 下游 C → 端到端验收 J
```

B 的局部输出可能形式正确、局部指标也不错，但只有 C 完成整合、最终验收函数 J 给出结果后，系统才知道 B 的输出是否真的有用。因此，统一优化需要把下游结果、失败原因和端到端评估，沿依赖关系回传到相关的上游与中间节点。

这里的“反传”通常不是神经网络意义上的可微梯度反向传播，而是带证据的反馈传播：

```text
端到端失败
  → 定位受影响的下游产物与失败类型
  → 映射至可能负责的中间假设、接口或决策
  → 产生针对 A / B 的修订建议或重规划条件
  → 重跑必要验证，确认是否真的改善 J
```

但这种全局优化有明显的效率代价。越靠上游的节点，变更通常拥有越大的影响锥：一次修改可能使多个中间产物与下游评估失效，需要更多重跑、更多验证和更长的反馈等待时间。与此同时，传回上游的信号还可能更稀疏、更延迟、更难归因，因此上游更新的有效频率通常最低。

| 位置 | 常见优化信号 | 一次变更的影响范围 | 通常更新效率 |
| --- | --- | --- | --- |
| 下游执行/呈现节点 | 直接错误、测试、用户反馈 | 小 | 高 |
| 中间转换/决策节点 | 局部校验 + 下游结果 | 中 | 中 |
| 上游需求、计划、共享表示节点 | 主要依赖端到端结果 | 大 | 低 |

因此，全局视角不等于每次局部修改都全链路重算。更实用的是双速优化：

```text
快速局部循环：用局部、低成本、与全局目标对齐的代理信号修复明显错误
慢速全局循环：在检查点或达到触发阈值时，用端到端验收决定是否更新上游
```

可以用以下机制降低上游更新成本：

- 为每个中间节点设计与最终验收尽量对齐的代理指标，但不把代理指标当成最终目标；
- 缓存可复用产物，按依赖图只重跑受影响分支；
- 设置稳定检查点与版本冻结，避免上游每次小改都扇出重做；
- 先用低保真、低成本评估筛选候选改动，只有通过阈值才触发完整端到端验证；
- 将下游失败反馈写成可定位的证据，而不是模糊的“结果不好”；
- 对上游变更设更高的收益阈值和更严格的 Commit 条件。

### 6.6 让变更传播可见且有限

一个理想的传播过程是：

```text
A: v12 → v13，声明 breaking
  → Supervisor 查询依赖图
  → B、C 的旧结果标为 stale
  → 先运行影响分析/验证器
  → 仅重跑真正受影响的节点
  → 验证通过后更新共享状态
```

目标不是“前面一改，后面全部重做”，而是做到：每一项变更都能说明它影响了什么、为何影响、哪些结果仍然可复用，以及它是否真的改善了端到端目标。

## 7. 推荐的混合架构

```text
确定性预观测
  → Workflow 读取状态、预算、权限和依赖
  → LLM 解释语义并形成局部计划
  → 低风险未知点：受预算约束的 ReAct / 搜索
  → Worker 返回产物、证据、state_patch、兼容性
  → 独立 Validator 验收
  → Supervisor 更新状态、传播 stale 标记
  → 高风险动作：审批 / Commit
  → 经验沉淀为 Skill、规则或新的 Workflow 节点
```

这里的原则是：

1. 用 Workflow 消灭不必要的自由度。
2. 用预观测让模型基于真实状态决策。
3. 用局部 ReAct 处理无法预编码的未知，而不是让它接管全部流程。
4. 用 Plan and Execute 保护高成本和不可逆边界。
5. 用独立验证器决定结果是否成立，不让执行节点自己证明自己正确。
6. 用版本、依赖和兼容性声明控制多 Agent 的连锁返工。

## 8. 从原型到成熟系统的演进

### 第一阶段：先能稳定跑通

- 一个 Supervisor；
- 少量边界清晰的 Worker；
- 一个共享状态文件；
- 每个任务明确输入、输出和验收；
- 高风险动作一律人工确认。

不要一开始追求复杂的自由协商和全自动重规划。

### 第二阶段：让系统可恢复

- 为产物和状态加入版本；
- Worker 输出结构化 `state_patch`；
- 记录失败原因、证据和可重试条件；
- 引入独立验证与 stale 标记。

### 第三阶段：只把真正值得的地方动态化

- 将稳定高频路径固化成 Workflow 或 Skill；
- 将无法预编码的判断交给 LLM；
- 只在信息缺失、验证失败或前提变化时触发 ReAct / Replan；
- 依据真实失败记录优化依赖图与兼容性规则。

## 9. 最终原则

成熟 Agent 系统的目标不是让模型自主完成一切，而是：

> 人定义方向、验收标准、成本边界和不可逆边界；系统先建立对真实环境的观测，再在明确权限与状态下自主推进；验证结果而不是模型自信，负责驱动继续、返工、升级或停止。

多 Agent 进一步要求：

> 不让协作依赖于“大家都记得刚才说了什么”，而让协作依赖于可版本化的事实、可追踪的产物、显式的兼容性，以及受控的变更传播。
