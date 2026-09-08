---
layout: post
title: "大模型技能的评估：从问题定位到稳定上线的实践指南"
date: 2026-09-07 12:30:00 +0800
description: "先拆开变量，确认效果与问题归因，再做成本和工程优化。"
category: "Agent 系统"
tags: [LLM, 评估, Agent, Oracle, PassAtK, AI工程]
cover: /assets/pages/llm-skill-evaluation/images/01-card.png
permalink: /pages/llm-skill-evaluation.html
---

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/01-card.png' | relative_url }}" alt="大模型技能评估图文 01：先拆变量，再解释总分" loading="lazy">
  <figcaption>01 / 评估的起点</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 大模型技能的评估：从问题定位到稳定上线的实践指南

> 核心原则：先拆开变量，确认效果与问题归因，再做成本和工程优化。

评估的目的不只是得到一个分数，而是回答四个问题：能力上限在哪里、问题由什么造成、改哪一处最有效、上线后是否可靠。

### 经验整理：六个核心判断

1. 固定其他条件，先比较不同底座，选择效果最好的底座作为后续实验基线。
2. 把数据质量作为独立变量，先完成清洗和 label 复核，避免错误标注导致反复返工。
3. 判断失败主要发生在常规检查 case、疑难 case，还是边界 case。
4. 拆分具体能力项，并将 Oracle 评测划分为基线集、诊断集和挑战集。
5. 用人工修订或多轮修订构造 Oracle 输入，剥离上游特征错误对模型能力观测的影响。
6. 承认模型存在随机性，对同一 case 多次运行，联合观察 Pass@1、Pass@K 和稳定性指标。

这六步共同遵循一个原则：每轮实验尽量只改变一个主要变量。只有这样，分数变化才具有可解释性。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/02-card.png' | relative_url }}" alt="大模型技能评估图文 02：总分由六个变量共同决定" loading="lazy">
  <figcaption>02 / 先解释总分</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 为什么评估必须先拆变量

大模型技能通常不是一个单独的模型调用，而是由底座模型、提示词、数据、上游特征、工具、工作流、后处理和评测器共同组成的系统。最终结果有变化，并不自动说明模型能力发生了变化。

如果一次实验同时换了底座、改了提示词、清洗了数据，又缩短了上下文，即使总分上涨，也无法知道真正有效的是哪一项；下一次换场景时，也无法复用这个结论。

所以，评估不是“多跑几个分数”，而是逐步缩小不确定性：

```text
总分或线上效果异常
  ├─ 实验条件是否一致？        → 建立可复现基线
  ├─ 数据和标签是否可信？      → 清洗、复标、冻结版本
  ├─ 失败集中在哪类 case？     → 常规、疑难、边界
  ├─ 失败对应哪项能力？        → 基线、诊断、挑战
  ├─ 是否由上游输入造成？      → 真实输入与 Oracle 输入对照
  └─ 单次结果是否稳定？        → 重复运行与 Pass@K 分析
```

拆变量能解释结果、确定责任边界、减少无效迭代，并沉淀可复用结论，使后续实验建立在同一个基线上。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/03-card.png' | relative_url }}" alt="大模型技能评估图文 03：固定条件，只比较底座" loading="lazy">
  <figcaption>03 / 第一步：选底座</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 第一步：固定条件，先选择合适的底座

不同底座模型的知识覆盖、指令遵循、工具调用、多步推理、长上下文和格式稳定性不同。底座往往决定技能能力的上限。如果底座本身无法稳定完成核心任务，在它上面不断增加提示词、规则和补丁，通常只能改善局部 case，也会增加维护复杂度。

进行底座横向评测时，只改变底座模型，至少固定任务定义、测试数据、技能流程、推理设置、评测方式和环境：输入边界与成功标准、数据和标签版本、system prompt 与后处理、temperature 与超时、评分口径、工具及接口版本都不能同时变化。

具体做法：给评测集、提示词、工作流和配置编号；在完全相同条件下运行同一批 case；除总体成功率外，记录关键错误率、格式合规率、平均延迟、token 和工具调用次数；以核心任务效果为第一排序依据，选出主底座并保留备选底座。

### 不要一开始混入成本优化

成本应在质量达到最低可用门槛后单独优化。推荐顺序是：先定义质量门槛；用效果最好的方案建立质量标杆；再逐项尝试模型路由、缓存、上下文压缩、低风险任务降级；每项降本实验都回归同一评测集，量化成本收益和质量损失。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/04-card.png' | relative_url }}" alt="大模型技能评估图文 04：清洗数据并复核 Label" loading="lazy">
  <figcaption>04 / 第二步：数据与 Label</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 第二步：把数据与标签质量作为独立变量

模型输出异常不一定是模型问题。输入数据可能重复、缺失、过期或格式不一致；label 也可能存在误标、规则不统一、信息不足却被强行标注等问题。如果标签不可靠，团队可能会让模型去拟合错误答案，后续无论换模型、改提示词还是补规则，都可能只是围绕错误标注返工。

数据检查可分成三层：

- **输入数据检查**：必需字段是否缺失；字段格式、单位和业务口径是否一致；是否有重复 case、过期事实或数据泄漏；分布能否代表真实线上任务。
- **标签检查**：是否有书面的 label 判定规则；多位标注者能否达成一致；标签能否由题目提供的信息推出；是否存在多个合理答案或无法判定的 case。
- **数据集结构检查**：训练、开发和测试集是否重复或泄漏；不同场景、难度、语言、输入长度是否覆盖充分；是否有失败、边界和高风险样本。

建议按 case 类型分层抽样，由熟悉业务的员工或资深标注者复核；对争议 case 记录争议原因而不是强行写入不稳定结论；修正明确错误的标签，将无法判断的样本标为 `uncertain` 并排除主分数；冻结修订后的版本并保存变更记录。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/05-card.png' | relative_url }}" alt="大模型技能评估图文 05：区分常规、疑难与边界 Case" loading="lazy">
  <figcaption>05 / 第三步：失败在哪类 case</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 第三步：判断问题发生在哪一类 case

总分会掩盖失败分布。一个技能可能在大量简单 case 上得分很高，却在少量高价值疑难 case 上持续失败；也可能具备复杂推理能力，但在普通检查、字段提取或格式输出上不稳定。因此必须先回答：现在的问题发生在常规检查 case，还是疑难 case？

| case 类型 | 典型特征 | 主要评估目标 |
| --- | --- | --- |
| 常规检查 case | 信息完整、规则明确、路径常见 | 基础可用性和日常稳定性 |
| 疑难 case | 信息不全、规则冲突、多步推理、罕见场景 | 能力上限和复杂问题处理 |
| 边界 case | 格式异常、规则临界、对抗输入、灰度情形 | 鲁棒性、安全性和兜底能力 |

为每个 case 增加类型、难度、风险等级和业务场景标签；分别统计成功率、严重错误率、人工介入率和失败原因；再归类为信息缺失、规则冲突、工具失败、推理跳步、格式错误等。优先处理高频高影响问题；低频高风险问题建立验证器或人工升级路径。

解读时：常规和疑难都差，优先检查底座、任务定义、数据和基础流程；常规好而疑难差，补充诊断集、推理策略、工具链或人工升级；常规差而疑难较好，检查输入预处理、简单规则、格式约束和评测标签；主要在边界失败，则加强输入校验、不确定性表达、追问、拒绝和异常流程。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/06-card.png' | relative_url }}" alt="大模型技能评估图文 06：Baseline、Diagnostic 与 Challenge 三类评测集" loading="lazy">
  <figcaption>06 / 第四步：三类评测集</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 第四步：拆分能力项，构建基线集、诊断集和挑战集

一个大模型技能通常包含输入理解、事实提取、规则应用、工具调用、多步规划、结果生成和自检等多项能力。总分只能说明最终结果好不好，不能说明哪一环需要改；评测集既要按 case 类型切分，也要按能力目的分层。

| 集合 | 要回答的问题 | case 设计 | 典型用途 |
| --- | --- | --- | --- |
| Baseline（基线集） | 最简单、最基础的任务是否仍能稳定完成 | 目标单一、信息完整、标准清晰 | 守住基本能力，防止优化带来回退 |
| Diagnostic（诊断集） | 本轮要解决的具体问题是否得到改善 | 每组主要控制一个问题或能力变量 | 验证改动是否真正命中目标问题 |
| Challenge（挑战集） | 难点 case 的结构是什么，当前能力上限在哪里 | 多约束、多步、长上下文、罕见或高风险 | 探索组合推理、泛化和错误恢复能力 |

三类集合不能用同一个提升要求衡量：**Baseline 必须不下降**；**Diagnostic 应当获得可解释的提升**，并在未参与调试的同类 case 上复现；**Challenge 可以提升但不强求**，重点是观察失败模式、能力边界和严重退化。

Baseline 应覆盖核心高频基础路径并冻结部分长期样本；Diagnostic 要从错误分析中提炼具体假设，固定无关变量，同时放入失败样本、邻近样本和反例；Challenge 从真实疑难 case、历史高价值失败和专家设计边界场景取样，标明“难在哪里”，但不要为了制造低分加入与真实任务无关、连专家也无法稳定判定的题目。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/07-card.png' | relative_url }}" alt="大模型技能评估图文 07：Challenge 经过 Diagnostic 沉淀为 Baseline" loading="lazy">
  <figcaption>07 / 从发现到回归保护</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 让评测集持续演进，并拆出能力项

挑战集中的某类问题一旦成为明确的下一轮优化目标，就应抽取代表样本和邻近样本，构建新的 Diagnostic 集；当这项能力被稳定解决后，再将其中最基础、最重要的样本沉淀到 Baseline。

```text
Challenge 发现难点
        ↓
提炼问题并构建 Diagnostic
        ↓
针对问题优化并验证提升
        ↓
稳定解决后纳入 Baseline 防止回退
```

诊断集可以从输入理解与事实抽取、约束识别与优先级判断、规则应用与冲突处理、工具选择与结果读取、多步规划与中间状态维护、不确定性识别与追问、输出格式、自检纠错和失败恢复等维度建立。关键是“一组 case 主要测一件事”：例如诊断规则冲突处理时，尽量固定文本长度、字段完整性和工具可用性，只改变规则是否冲突及其优先级。

### Oracle 的角色

Oracle 是给系统提供更完整、正确或经人工修订的输入后，观察技能理论上能够达到的参考表现。它回答的是：“如果上游信息没有问题，模型和技能本身能做到什么程度？”Oracle 也应包含基线、诊断和挑战集，并列报告真实输入表现、Oracle 输入表现及两者差值。Oracle 分数不等于线上分数，它是定位责任与能力上限的工具。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/08-card.png' | relative_url }}" alt="大模型技能评估图文 08：用 Oracle 输入剥离上游影响" loading="lazy">
  <figcaption>08 / 第五步：真实输入与 Oracle</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 第五步：剥离上游特征对 Oracle 的影响

技能输出可能依赖上游分类、检索结果、结构化字段、用户画像、工具结果等特征。如果这些特征错误或缺失，即使模型推理正确，最终答案也可能错误。只看端到端结果，容易把上游问题误判为模型问题。

对同一批 case 至少准备两种输入版本：真实版保留线上产生的原始特征，衡量真实端到端效果；修订版 / Oracle 版人工修正错误特征并补齐必要信息，衡量模型和技能本体能力。上游链路较长时，可增加只修订检索结果、只修订结构化字段等中间版本，逐层寻找主要损失来源。

保存原始输入、上游特征和输出，不能覆盖原始证据；明确可疑特征及其正确判定规则；由人工进行一次或多次修订并记录字段和原因；固定模型、提示词和参数，分别运行真实版与修订版；再按特征类型、case 类型和能力项分析差异。

```text
上游影响差值 = Oracle 输入得分 - 真实输入得分
```

差值很小，问题更可能在模型、技能流程或任务定义；差值很大，优先修复上游特征、检索、抽取或输入校验；Oracle 得分仍低，说明即使输入理想，当前底座或技能能力也不足。多轮修订的目标不是把输入改到模型一定答对，而是建立一份有依据、可复核、接近真实业务真值的输入。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/09-card.png' | relative_url }}" alt="大模型技能评估图文 09：重复运行观测 PassAt1、PassAtK 与稳定性" loading="lazy">
  <figcaption>09 / 第六步：重复运行</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 第六步：通过重复运行评估模型稳定性

大模型存在采样随机性，工具响应、外部服务、上下文截断和运行环境也可能波动。因此，一次成功可能是偶然，一次失败也未必代表稳定失败。评估既要回答“模型有没有能力做对”，也要回答“用户只运行一次时，它是否可靠”。

对每个 case 独立运行 `K` 次，并报告：**Pass@1**（单次运行成功概率，最接近一次真实使用体验）；**Pass@K**（K 次独立尝试中至少一次成功的比例，反映允许重试时的能力上限）；一致正确率；输出一致性；以及均值、最低值、最高值、标准差或置信区间。

对关键 case 设置 `K=3`、`5` 或 `10` 等重复次数，风险越高样本量越充分；固定提示词、模型版本、参数和环境，仅保留预期随机性；保存每次输出、成功与否、错误类型、耗时、token 和工具轨迹；同时统计 case 级与集合级稳定性，并单独列出“偶尔成功”的 case。

| 现象 | 说明 | 建议 |
| --- | --- | --- |
| Pass@1 高，Pass@K 也高 | 单次可靠，能力较稳定 | 可以进入上线门槛和成本评估 |
| Pass@1 低，Pass@K 高 | 模型有能力但不稳定 | 增加重试、候选验证或人工审核 |
| Pass@1 与 Pass@K 都低 | 能力或流程存在系统性缺口 | 回到数据、底座和诊断集分析 |
| 总体高但高风险 case 波动大 | 平均分掩盖关键风险 | 为高风险 case 设单独门槛与兜底 |

高 Pass@K 不能替代 Pass@1。如果产品不允许重试、筛选或投票，上线判断必须以单次执行的实际结果为主。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/10-card.png' | relative_url }}" alt="大模型技能评估图文 10：总分必须能回溯到具体证据" loading="lazy">
  <figcaption>10 / 把总分拆回证据</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 把六层方法串成完整实践流程

### 阶段 A：定义任务和评估契约

明确技能目标、输入边界、输出格式和禁止行为；定义成功、部分成功、失败和严重失败；设定核心质量门槛，而不只是平均分；记录模型、提示词、工作流、工具、数据和评测器版本。

### 阶段 B：建立可信评测资产

清洗数据并复核 label；标注 case 类型、难度、风险和能力项；构建基线集、诊断集与挑战集；冻结版本，对争议样本单独管理。

### 阶段 C 至 E：筛选、定位与验证

固定其他条件横向比较候选底座，先按核心效果选择主底座并建立失败类型清单；按常规、疑难和边界切分结果，按具体能力项查看诊断集，用真实输入和 Oracle 对照，确定问题归属于数据、上游、底座、提示词或工作流；然后对关键集合重复运行，报告 Pass@1、Pass@K、一致正确率与波动范围，为不稳定 case 设计降随机性、重试、验证器或人工升级机制。

所有汇总指标都应能够回溯到具体 case 和原始运行记录。否则平均分出现异常时，很难找到证据。

</div>
</section>

<section class="loop-reading-pair" markdown="1">
<figure class="loop-reading-pair__visual">
  <img src="{{ '/assets/pages/llm-skill-evaluation/images/11-card.png' | relative_url }}" alt="大模型技能评估图文 11：质量达标后再做成本优化与上线检查" loading="lazy">
  <figcaption>11 / 质量达标后再降本</figcaption>
</figure>
<div class="loop-reading-pair__source" markdown="1">

## 质量达标后优化上线成本，并完成决策闭环

成本与延迟优化应在质量门槛达成后单独进行：一次只引入一项主要优化，回归同一套评测集；高风险 case 保留强底座或人工兜底，低风险 case 才考虑模型降级和路由；用“成本下降多少、质量损失多少、风险增加多少”共同做决策。

实验记录至少要保留实验目标与唯一主要假设、固定条件、唯一变化项、总体成功率与严重错误率、常规/疑难/边界表现、基线/诊断/挑战表现、真实/Oracle 差值、Pass@1/Pass@K/一致正确率、延迟/token/工具调用/成本、失败分析证据，以及保留/回滚/继续验证的结论。

结果表至少保留版本、数据切片、能力切片、效果、稳定性、上游影响和工程表现。常见误区包括：只看一个总分；一次运行就下结论；数据、模型和提示词一起改；把 Oracle 当作线上分数；效果不清楚时急于压成本；把偶尔成功当作已经具备能力；测试集在实验中无记录地变化。

### 进入上线优化前的检查

- 已完成候选底座横向比较，数据与 label 已复核并冻结版本；
- 已区分常规、疑难和边界 case，建立基线、诊断和挑战集；
- 能定位具体能力项，并用真实输入与 Oracle 衡量上游影响；
- 已报告 Pass@1、Pass@K 和一致性指标，为高风险 case 设计验证、拒绝或人工兜底；
- 成本优化在质量门槛达成后独立进行，汇总结果可回溯到 case、配置和原始运行记录。

大模型技能评估的价值，不是生成一个漂亮的排行榜，而是建立可靠的决策能力：知道何时应该换底座、修数据、改上游、补能力、增加验证，何时才应该开始压缩成本。当底座、数据、case 类型、能力维度、上游特征和模型随机性被逐层拆开后，每次实验都会更可解释，返工更少，也更接近真正可上线、可维护的系统。

</div>
</section>
