---
layout: post
title: "AI 工程 Loop：用可验证的闭环组织 Agent、Skill 与迭代"
date: 2026-08-30 21:58:14 +0800
summary: "复杂 AI 工程不该只是让 Agent 开始做事，而要被设计成可运行、可验证、可恢复、可停止的闭环。"
category: "Agent 系统"
tags: [AI工程, Agent, Supervisor, Skill, 状态机, 多智能体, 验证]
cover: /assets/pages/ai-engineering-loop/images/01-AI工程Loop扩充版.png
permalink: /pages/ai-engineering-loop.html
---

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/01-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 01：可验证、可恢复、可停止的 Agent 闭环" loading="lazy">
  <figcaption>01 / 总览</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 核心观点

AI 工程的难点通常不在于“让 Agent 做一次任务”，而在于把一个会分支、会出错、需要恢复、需要持续改进的任务，变成一个**可运行、可验证、可回放、可停止**的闭环。

我倾向于把这个闭环设计成：

```text
先定义任务契约
→ 让 Agent 补齐遗漏与边界
→ 将稳定流程封装为 Skill
→ 由 Supervisor 按状态机调度分支
→ 用验证结果决定推进、返工或升级
→ 小规模试跑
→ 修复流程
→ 扩大运行
→ 达成停止条件
```

其中最重要的原则是：**人定义方向、约束与验收；Agent 在这些边界内自行完成细节。**

这不是把人从流程中完全移除，而是避免人被低价值的澄清问题打断，同时避免 Agent 在关键方向上自行“想歪”。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/02-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 02：任务契约" loading="lazy">
  <figcaption>02 / 任务契约</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 1. 先写清楚任务契约，而不是马上开始执行

每个较复杂的任务，先从一份足够详细的任务文档开始。它不是一篇泛泛的需求说明，而是整个 Loop 的“执行契约”：后续的 Skill、子流程、验证器和 Supervisor 都以它为准。

这份文档至少回答七个问题。

| 问题 | 要写清楚什么 |
| --- | --- |
| 背景与问题 | 为什么要做？当前的痛点、已有事实、可用输入是什么？ |
| 最终目标 | 什么结果算真正完成？目标要能被外部观察或检查。 |
| 实施路径 | 任务准备分成哪些阶段？阶段之间有什么依赖？ |
| 产物契约 | 每一步输出什么格式、保存在哪里、下游如何使用？ |
| 验证方式 | 每个阶段如何判断通过？谁或什么来验证？ |
| 分支与恢复 | 验证通过后去哪；失败后如何诊断、重试、回滚或升级？ |
| 停止条件 | 哪些条件同时满足后必须停下，而不是无止境优化？ |

一个好目标不只描述“做什么”，还要描述“如何知道做成了”。例如，不要只写“生成一个可用的报告”，而应写成“生成指定格式的报告；必填章节齐全；关键数值经过来源校验；渲染和抽检通过；无未解决的高优先级风险”。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/03-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 03：验证与停止" loading="lazy">
  <figcaption>03 / 验证与停止</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

### 1.1 把流程写成闭环，而不是线性清单

线性任务清单只描述正常路径；工程 Loop 还必须描述异常路径。

```text
执行步骤
    ↓
验证
    ├─ 通过：提交产物，进入下一阶段
    ├─ 可自动修复：带着失败证据回到对应步骤，有限次数重试
    ├─ 需要重新规划：回到任务设计或前置阶段
    └─ 需要人决策：暂停在明确的决策点，等待方向输入
```

因此，验证不是项目末尾的“验收动作”，而是每个阶段之间的路由器。验证结果决定下一步，而不是只生成一句“成功/失败”。

### 1.2 停止条件必须前置

开放式任务天然可以一直继续。没有停止条件，Agent 会在细枝末节上反复优化，或者不断扩张工作范围。

一个可靠的停止条件通常由四部分组成：

```text
目标产物已交付
+ 关键验收项全部通过
+ 没有未处理的阻塞风险
+ 尚未触发时间、成本、轮数等预算上限
```

若预算先耗尽，但已经有可用结果，也应该显式返回“部分完成”，说明已完成内容、未完成缺口和下一步建议；不要把它伪装成完成。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/04-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 04：人定方向，Agent 补盲点" loading="lazy">
  <figcaption>04 / Agent 细化方案</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 2. 让 Agent 补齐方案，但控制澄清的粒度

任务契约的第一版由人写，因为只有人最清楚业务意图、不可触碰的边界和真正想达到的方向。随后再让 Agent 以“审阅者/完善者”的身份补齐可能遗漏的前提、失败路径、验收点和依赖关系。

现有的 Spec、规划类 Skill 或类似 Superpowers 的方法可以帮助把方案写完整，但不能任由它把文档变成一份冗长、充满格式噪声的“黑化文档”。好的工作方式是：**约束输出密度，也约束提问权限。**

### 2.1 文档应该短而有决策力

对 Agent 的要求可以明确写成：

> 用最少的文字说清目标、边界、路径、验证和分支。优先给出可执行的判断条件与接口，不要为形式补写长篇背景，不要把已经确定的方向重新讨论一遍。

文档的价值不在于看起来“严谨而复杂”，而在于不同 Agent 读到它后能做出一致行动。

### 2.2 建立“默认自主、按风险升级”的提问规则

Agent 不应为所有细节都向人提问。可以把决策分成三层：

| 决策类型 | Agent 的默认行为 | 例子 |
| --- | --- | --- |
| 低风险、可逆的实现细节 | 自行选择，并记录假设 | 文件命名、临时格式、同等工具之间的选择 |
| 有合理默认值但会影响结果的选择 | 选择默认值并在结果中说明 | 采样范围、重试次数、次要文案方案 |
| 改变目标、成本、权限或不可逆结果的选择 | 必须请求人确认 | 改业务方向、删改重要数据、对外发布、大额消耗 |

这样做的含义不是“Agent 永远不问”，而是把人类注意力留给真正会改变项目方向的选择。对于已明确的任务，人还可以直接写下不可偏离的约束，例如：

> 以下目标、术语、数据边界与交付方式已确定。不要重新解释、替换或扩展它们；只在实现路径不成立或出现高影响冲突时升级。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/05-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 05：Skill 契约" loading="lazy">
  <figcaption>05 / Skill 契约</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 3. 将稳定流程拆成 Skill，并为它们建立共同接口

当任务契约稳定之后，不同的处理流程可以拆成多个 Skill。Skill 的边界不应只是“角色名称不同”，而应该是**输入、输出、成功条件和失败语义不同**。

例如，一个完整流程可以拆成：

```text
需求解析 Skill
→ 方案/计划 Skill
→ 执行 Skill
→ 验证 Skill
→ 修复 Skill
→ 发布或交付 Skill
```

每个 Skill 只对自己负责的局部问题做判断，输出结构化结果，而不是只返回一段难以复用的自然语言。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/06-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 06：共享事实" loading="lazy">
  <figcaption>06 / 共享事实</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

### 3.1 Skill 之间要共享“事实”，而不是共享整段对话

多个 Skill 协作时，建议使用单独的配置或协调文件传递共同信息。这个文件相当于任务的共享事实层，至少包含：

- 任务 ID、当前目标和不可变约束；
- 已确认的输入、产物路径和版本；
- 每个阶段的状态、证据和失败原因；
- 可用预算，例如时间、轮数、费用和重试上限；
- 下一步待办，以及当前需要谁处理。

Skill 读取自己需要的字段，写入自己负责的状态字段。它们不应依赖“我记得上一段长对话里说过什么”。

这会带来两个好处：一是接口更稳定，二是上下文更小、更干净。

### 3.2 Skill 的输出应当是可验证的产物

每个 Skill 最好统一返回类似的结果：

```yaml
status: passed | failed | blocked | needs_human
artifacts:
  - path: output/plan.md
    purpose: 可执行方案
evidence:
  - 验证命令或检查结果
state_patch:
  - 写入或更新的状态字段
next_recommendation: validate_plan
```

这样 Supervisor 处理的是“状态、产物、证据和下一步建议”，而不是猜测一大段文字到底意味着什么。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/07-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 07：Supervisor" loading="lazy">
  <figcaption>07 / Supervisor</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 4. 用 Supervisor 统领全局，用子代理隔离分支

整个 Loop 需要一个 Supervisor 负责全局调度。它不应亲自完成所有工作，而是负责：读取状态、选择下一条分支、委托 Skill 或子代理、检查证据、处理升级，并维护停止条件。

对于进入某个复杂分支的任务，我更倾向于让 Supervisor 新起一个子代理，由子代理在独立上下文中调用对应的 Skill，完成一个封闭的处理逻辑后，再将结构化结果交回。

```text
Supervisor
    │
    ├─ 读取共享状态，判断当前节点
    ├─ 创建“研究/执行/修复/验证”子代理
    │      └─ 在干净上下文内调用所需 Skill，形成局部结论
    ├─ 接收子代理的产物、证据、状态补丁
    └─ 决定：推进 / 重试 / 转入修复 / 请求人决策 / 停止
```

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/08-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 08：子代理隔离分支" loading="lazy">
  <figcaption>08 / 子代理隔离</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

### 4.1 为什么分支要用干净的子代理

这不是为了形式上的“多 Agent”，而是为了控制信息边界。

- 子流程只拿到完成当前判断所需的上下文，减少无关历史带来的锚定和干扰。
- 验证、修复、执行可以由不同节点完成，避免同一个节点既生产结果又单方面宣布结果正确。
- 子任务完成后只上交经过压缩的产物、证据和结论，降低重复传递长上下文的 token 消耗。
- 分支失败时可以独立重跑，不会污染主流程，也更容易定位问题。

这里的关键不是强行让所有节点彼此“盲审”，而是避免生产者把未经证据支持的自我判断直接当作最终结论。对于高风险结果，验证节点应独立于执行节点，并依赖可检查的证据。

### 4.2 Supervisor 不等于一个无限膨胀的大 Prompt

Supervisor 本身也可能越跑越大。解决办法不是让它记住所有历史，而是把它降格为一个有明确状态转移规则的控制器。

它每次只需要知道：现在处于什么状态、已经有哪些可信产物和证据、有哪些待处理事项、预算还剩多少，以及满足何种条件可以结束。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/09-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 09：状态机" loading="lazy">
  <figcaption>09 / 状态机</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 5. 用状态机让流程可恢复、可观察、可重放

复杂 Agent Loop 最终应当被表达成一个状态机，而不是依赖 Supervisor 的隐式记忆。

```text
DESIGNING
  → READY_FOR_PILOT
  → PILOT_RUNNING
  → VALIDATING
       ├─ PASSED → READY_FOR_SCALE → SCALING → COMPLETED
       ├─ REPAIRABLE_FAILURE → REPAIRING → PILOT_RUNNING
       ├─ REPLAN_REQUIRED → DESIGNING
       └─ HUMAN_DECISION_REQUIRED → BLOCKED
```

状态文件是断点恢复的依据。发生中断、工具失败或上下文切换后，新的 Supervisor 应能通过读取文件恢复，而不是从头猜测项目处境。

### 一个最小状态文件示例

```yaml
task_id: ai-loop-demo-001
objective: 在约束范围内交付可验证的目标产物
state: PILOT_RUNNING
current_node: execute_pilot

constraints:
  immutable:
    - 不改变已确认的业务方向
    - 关键验证必须由独立节点执行
  budgets:
    max_retries_per_branch: 2
    max_total_iterations: 5

artifacts:
  plan:
    path: docs/task-contract.md
    status: accepted
  pilot_result:
    path: output/pilot-result.json
    status: pending

checks:
  - name: output_complete
    status: pending
  - name: acceptance_tests
    status: pending

history:
  - at: 2026-08-30T10:00:00+08:00
    event: pilot_started
    by: supervisor

next_action:
  owner: execution_subagent
  skill: execute_pilot
  reason: 已具备试跑输入，尚未获得验证证据
```

状态不必记录所有对话，只记录能支持恢复、审计和下一步决策的事实。原始日志、完整讨论、文件产物可以以路径或引用的形式保留在外部。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/10-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 10：试跑迭代" loading="lazy">
  <figcaption>10 / 试跑迭代</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 6. 先试跑，再扩展：把 Skill 改进也纳入 Loop

流程设计完成后，不应直接大规模运行。先以一个低成本、覆盖关键分支的样本进行试跑。

```text
任务契约
→ 单样本或小样本试跑
→ 收集失败证据与人工观察
→ 定位问题属于：任务契约 / Skill / 接口 / 状态路由 / 验证器
→ 修改对应层
→ 再试跑
→ 通过后才扩大规模
```

这里一个常见误区是：一旦结果不好，就只修改执行 Skill。实际上，问题可能来自五个不同层面：

| 症状 | 更可能需要修改的层 |
| --- | --- |
| Agent 总是理解错方向 | 任务契约、不可变约束或升级规则 |
| Agent 反复问琐碎问题 | 决策权限与默认值策略 |
| 上下游产物接不上 | Skill 接口、共享配置或产物契约 |
| 失败后不知道回哪里 | 状态机转移与恢复策略 |
| 看似成功但结果不可用 | 验证器、验收标准或独立验证设计 |

试跑的意义不是证明“模型能不能做”，而是找出整个工程系统在哪里不稳定。只有小规模流程已经稳定，规模化运行才有意义。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/ai-engineering-loop/images/11-AI工程Loop扩充版.png' | relative_url }}" alt="AI 工程 Loop 图文 11：四个控制问题" loading="lazy">
  <figcaption>11 / 总结</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 7. 一套可直接复用的任务契约模板

```markdown
# [任务名称]

## 背景
- 要解决的问题：
- 已知事实与输入：
- 不在本次范围内的内容：

## 目标与完成定义
- 最终产物：
- 必须满足的验收项：
- 可接受的部分完成状态：

## 不可变约束
- 不得改变的方向、术语、数据边界：
- 权限、成本、时间限制：

## 执行路径
1. 阶段 A：输入、输出、负责人/Skill、通过条件。
2. 阶段 B：输入、输出、负责人/Skill、通过条件。
3. 阶段 C：输入、输出、负责人/Skill、通过条件。

## 验证与分支
- 通过：进入……
- 可修复失败：由……Skill 在……次以内修复，然后复验。
- 需要重新规划：回到……阶段。
- 需要人决策：仅当……时提问；需提供选项、影响与推荐。

## 提问权限
- Agent 可自行决定：
- Agent 必须升级确认：

## 停止条件
- 完成：
- 部分完成：
- 失败/阻塞：

## 状态与产物位置
- 状态文件：
- 正式产物：
- 验证证据：
```

---

## 总结：一个好的 AI 工程 Loop 长什么样

一个成熟的 AI 工程 Loop，不是把很多 Agent、Skill 和工具堆在一起，而是让每一个环节都回答清楚四件事：

```text
现在处于什么状态？
下一步谁来做什么？
凭什么判断结果对不对？
如果不对，回到哪里、由谁修、何时停止？
```

在这个框架下：

- 文档负责提前表达意图与验收标准；
- Agent 负责发现遗漏，但不劫持方向；
- Skill 负责稳定、可复用的局部能力；
- 配置与状态文件负责传递共享事实；
- 子代理负责隔离复杂分支和局部上下文；
- Supervisor 负责全局路由与停止决策；
- 验证器负责把结果变成可行动的分支；
- 试跑与迭代负责把不稳定的流程打磨成可规模化的系统。

最终追求的不是“Agent 做得像人在聊天”，而是让系统在目标明确时能够自主推进，在不确定或高风险时能够准确停下来请求人类决策，并且在失败后知道如何恢复。
</div>
</section>
