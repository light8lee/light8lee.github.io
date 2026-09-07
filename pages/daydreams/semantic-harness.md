---
layout: post
title: "从 Tool Harness 到 Semantic Harness"
date: 2026-09-07 12:00:00 +0800
summary: "把自然语言审核手册编译为可执行的语义约束，让模型沿条件、豁免与优先级受约束地理解内容。"
tags: [Daydreams, Semantic Harness, 内容审核, 规则推理, 非单调推理]
series: daydreams
daydream: true
thought_axis: 术
permalink: /daydreams/semantic-harness/
cover: /assets/daydreams/semantic-harness/images/tool_vs_semantic_harness.png
body_class: daydream-post
---

# 从 Tool Harness 到 Semantic Harness
*把审核手册编译成“可执行的语义约束”：面向自然语言不确定性的“术”*

>
> 这里所谓的 **Semantic Harness**，不是给模型一个更长的 prompt，也不是在输出端再加一个分类器，而是把审核手册编译成一套**可执行的语义约束结构**：  
> 哪些条件必须先判断，哪些条件满足后才能进入下一步，多个条件同时成立时谁优先，什么条件可以豁免已有判断，什么情况只能保持 Unknown，以及新的上下文出现后能否推翻之前的解释。

---

# 1. 问题定义：为什么需要 Semantic Harness

## 1.1 真正的问题：现有 Agent Harness 管“动作”，审核需要 Harness 管“理解”


<figure>
  <img src="{{ '/assets/daydreams/semantic-harness/images/tool_vs_semantic_harness.png' | relative_url }}" alt="Tool Harness 与 Semantic Harness 之间，对比动作约束与理解约束" loading="lazy">
  <figcaption>图 1. Tool Harness 主要约束动作执行，而 Semantic Harness 主要约束理解过程。</figcaption>
</figure>

*图 1. Tool Harness 主要约束动作执行，而 Semantic Harness 主要约束理解过程。*

今天 Agent 领域已经越来越习惯使用 Harness：

- 工具调用前检查权限；
- 限制工具调用顺序；
- 用 schema 限制参数；
- 用 runtime monitor 阻断危险 action；
- 用 policy engine 判断某次调用是否合法。

这类 Harness 很有效，因为它约束的对象已经结构化：

```text
tool = transfer_money
amount = 5000
recipient = X
```

系统只需要判断：

```text
当前条件下，这个 action 是否允许？
```

但审核不是这样。

审核系统收到的是：

> “售后有问题加我吧，别在平台付了，我直接帮你处理，便宜点。”

模型需要先回答一系列**语义问题**：

```text
它是否涉及交易？
是否在迁移沟通渠道？
是否在迁移交易？
是否明确规避平台支付？
“售后”是否构成豁免？
如果售后和规避支付同时出现，哪个规则优先？
```

真正决定最终结论的，不是某一个词有没有出现，而是这些条件之间的逻辑关系。

所以审核所需要的并不是：

$$
\mathrm{Text}\rightarrow \mathrm{LLM}\rightarrow \mathrm{Label}
$$

而更接近：

$$
Text
\rightarrow
\mathrm{Condition\ Resolution}
\rightarrow
\mathrm{Constraint\ Execution}
\rightarrow
\mathrm{Rule\ Resolution}
\rightarrow
Label
$$

我所说的 **Semantic Harness**，核心就在中间的：

$$
\boxed{\mathrm{Constraint\ Execution}}
$$

---

## 1.2 审核手册本质上不是“标签定义”，而是一套语义控制程序

假设审核手册中存在下面一组规则：

> 1. 只有内容与交易有关时，才需要进一步判断站外交易。  
> 2. 若存在将沟通转移至平台外的行为，需要继续检查这种迁移是否与交易有关。  
> 3. 如果明确要求绕过平台支付，可以认定为站外交易。  
> 4. 仅留下联系方式，不足以直接认定站外交易。  
> 5. 售后处理中提供联系方式可以豁免。  
> 6. 但如果同时明确要求绕过平台支付，则“明确规避支付”优先于“售后豁免”。  
> 7. 没有显式出现“站外”“微信”“电话”等词，不代表一定不存在站外迁移。

如果只是把这段话放到 prompt 里，本质还是：

```text
请模型阅读这些要求，然后自己决定如何理解。
```

规则对模型而言只是**上下文信息**。

真正的 Semantic Harness 则需要把它变成类似下面的结构：

```text
A = 是否存在交易语境
B = 是否存在沟通渠道迁移
C = 是否存在交易迁移
D = 是否属于售后语境
E = 是否明确规避平台支付

Precondition:
    Check(C) only if A = True

Rule:
    A ∧ C -> OffPlatform

Insufficient:
    B alone -> cannot conclude OffPlatform

Exception:
    D -> exempt OffPlatform

Override:
    E > D

Uncertainty:
    no explicit hit(C) -> C may still be Unknown
```

这已经不是“规则说明书”，而更接近一个**语义执行程序**。

---

## 1.3 为什么“决策树”是一个好比喻，但还不够

最直观的实现是 Decision Tree：

```text
是否交易？
├── 否 -> 结束
└── 是
    ↓
是否迁移到平台外？
├── 否 -> 不违规
└── 是 -> 违规
```

它的优点很明显：

- 路径明确；
- 顺序明确；
- 好执行；
- 好解释。

但真实审核规则很快会超出单棵树的表达能力。

因为实际规则通常不是：

```text
A -> B -> C -> D
```

而是：

```text
A
├── B
│   ├── D
│   └── E
└── C
    ├── E
    └── F

同时：
D 可以豁免 B 路径
F 可以推翻 D 的豁免
E 会同时影响 B、C 两条路径
G 虽然没有直接命中，但可能因为上下文仍为 Unknown
```

于是结构更像：

$$
\boxed{\mathrm{Semantic\ Decision\ Graph}}
$$

甚至更准确一点：

$$
\boxed{\mathrm{Constrained\ Semantic\ Rule\ Graph}}
$$

它不是简单的树，而是一张包含以下关系的图：

1. **Precondition**：A 成立后才允许判断 B；
2. **Branch**：A 后面可能进入 B 或 C；
3. **Conjunction / Disjunction**：A 与 B 同时成立，或者 B/C 之一成立；
4. **Exception**：D 出现时，某条一般规则失效；
5. **Override**：E 出现时，又可以推翻 D 的豁免；
6. **Priority**：多个规则同时成立时，谁优先；
7. **Mutual Exclusion**：某条路径成立后，另一条解释不能成为主解释；
8. **Unknown Propagation**：某个关键节点不确定时，后续不能擅自当成 False。

这才是审核语义约束真正需要表达的东西。

---

# 2. 核心约束：如何管理语义命中与不确定性

## 2.1 Semantic Harness 最核心的不是“命中”，而是三个不同层次


<figure>
  <img src="{{ '/assets/daydreams/semantic-harness/images/semantic_selection_flow.png' | relative_url }}" alt="语义规则从命中、条件满足、优先级与豁免走向最终选择的流程" loading="lazy">
  <figcaption>图 2. 命中、条件满足、优先级、豁免与最终选择。</figcaption>
</figure>

*图 2. 从一句审核文本出发，先得到多个条件状态，再经过优先级与豁免判断，最后才产生 selected 的主解释。这幅图对应“命中不等于选择、不命中不等于不满足”的核心思想。*

审核系统经常把三个概念混在一起：

```text
命中
满足
选择
```

但它们其实不是一回事。

---

### 2.1.1 Hit：文本表面是否出现了某种信号

例如：

> “加我聊。”

可以认为 $\operatorname{Hit}(\mathrm{ContactMigration})=\mathrm{True}$。

这是一个局部信号。

---

### 2.1.2 Satisfaction：规则条件是否真正满足

但“出现联系方式迁移”不等于“满足站外交易”。

可能是：

> “售后有问题加我。”

因此，$\operatorname{Hit}(\mathrm{ContactMigration})=\mathrm{True}$ 并不能直接推出 $\operatorname{Satisfied}(\mathrm{OffPlatformTrade})=\mathrm{True}$。

所以：

$$
\operatorname{Hit}(C)\not\Rightarrow \operatorname{Satisfied}(C)
$$

---

### 2.1.3 Selection：多个成立条件中最终应该采用哪个解释

再看：

> “售后有问题加我，不过别在平台付了，直接给我转。”

这句话可能同时满足：

```text
售后语境 = True
联系方式迁移 = True
明确规避平台支付 = True
```

但最终不是三个标签平铺，而要执行：

$$
\mathrm{ExplicitPaymentBypass}\succ \mathrm{AfterSalesExemption}
$$

所以：

$$
\operatorname{Satisfied}(R_i)\not\Rightarrow \operatorname{Selected}(R_i)
$$

最终解释来自：

$$
\mathrm{Selection}=f(\mathrm{SatisfiedRules},\mathrm{Exceptions},\mathrm{Priorities},\mathrm{CrossPathConstraints})
$$

这三个层次区分，是 Semantic Harness 的第一块基础。

---

## 2.2 不命中，不等于不满足

自然语言最麻烦的地方之一就是：

> **没有出现规则词，不等于语义不存在。**

例如审核规则要求：

```text
是否存在“交易迁移到平台外”
```

文本却说：

> “这个价格这里不方便说，换个地方聊。”

没有：

- 微信；
- 电话；
- 站外；
- 私聊；
- 转账。

如果系统是关键词或 pattern matching，可能得到 $\operatorname{Hit}(\mathrm{OffPlatform})=\mathrm{False}$；但从语义上，更合理的状态可能是 $\operatorname{State}(\mathrm{OffPlatform})=\mathrm{Unknown}$，而不是直接判成 $\mathrm{False}$。

因此必须明确：

$$
\operatorname{NotHit}(C)\not\Rightarrow \operatorname{False}(C)
$$

这条原则非常重要，因为如果系统把所有没有显式命中的条件都自动填成 False，那么所谓的 Semantic Harness 最终又退化成了规则匹配器。

---

# 3. 为什么现有知识表示还不够

## 3.1 为什么知识图谱看起来很适合？——它其实确实能做很多


<figure>
  <img src="{{ '/assets/daydreams/semantic-harness/images/knowledge_graph_vs_open_world.png' | relative_url }}" alt="知识图谱的已知关系与开放世界中未知语义条件之间的张力" loading="lazy">
  <figcaption>图 3. 知识图谱与开放世界的张力。</figcaption>
</figure>

*图 3. 左边是结构清晰、便于查询的 knowledge graph；右边是开放世界中的自然语言流。真正困难的不是图查询，而是开放文本如何动态映射到图中的节点与关系。*

在讨论为什么还需要新的 Semantic Harness 之前，需要先公平地看知识图谱。

知识图谱并不是“不适合复杂规则”。

恰恰相反，它天然适合表达：

- 实体；
- 属性；
- 关系；
- 多跳连接；
- 类型层级；
- 条件之间的结构关系。

最典型的 RDF 三元组可以写成 $(\mathrm{subject},\mathrm{predicate},\mathrm{object})$。

例如：

```turtle
:Case1 :hasSignal :ContactMigration .
:Case1 :hasContext :AfterSales .
:ContactMigration :maySupport :OffPlatformTrade .
:AfterSales :mayExempt :OffPlatformTrade .
:ExplicitPaymentBypass :overrides :AfterSalesExemption .
```

于是很多审核逻辑确实可以直接变成一张图。

---

### 3.1.1 SPARQL 也远不只是“查一个关系”

例如查询：

> 找到同时存在交易语境和联系方式迁移，但没有确认售后豁免的 case。

可以写成类似：

```sparql
SELECT ?case
WHERE {
  ?case :hasContext :Trade .
  ?case :hasSignal :ContactMigration .

  FILTER NOT EXISTS {
    ?case :hasContext :ConfirmedAfterSales .
  }
}
```

甚至可以用 property path 做多跳关系查询：

```sparql
?rule :requires+ ?condition
```

也可以用：

- `OPTIONAL`
- `FILTER`
- `UNION`
- `MINUS`
- `NOT EXISTS`
- property paths

组合出相当复杂的条件。

所以问题绝对不能粗暴地说：

> “知识图谱表达不了审核逻辑。”

这并不准确。

---

## 3.2 那为什么知识图谱仍然没有直接解决 Semantic Harness？

真正的问题不在于“图能不能存逻辑”，而在于：

> **进入图谱之前，自然语言必须先被转换成图谱中已经定义好的节点与关系。**

这才是核心瓶颈。

---

### 3.2.1 图谱要求先定义 ontology

假设提前定义：

```text
ContactMigration
TradeContext
ExplicitPaymentBypass
AfterSales
OffPlatformTrade
```

那当然很好做。

但审核是开放世界。

第二天可能出现：

> “价格这里不方便聊。”

第三天：

> “懂的都懂，走老地方。”

第四天：

> “用之前那个方式。”

第五天出现一种全新的业务表达。

此时问题不是 SPARQL 会不会查，而是：

```text
“老地方”
```

应该映射成：

```text
ContactMigration?
OffPlatformTrade?
PriorAgreement?
Unknown?
```

图谱自身无法回答这个问题。

它只能对**已经进入图中的结构化事实**进行查询。

---

### 3.2.2 图谱把问题向前推了一步，却没有消灭问题

原问题：

$$
\mathrm{NaturalLanguage}\rightarrow \mathrm{Interpretation}
$$

使用图谱之后变成：

$$
\mathrm{NaturalLanguage}\rightarrow \mathrm{GraphFacts}\rightarrow \mathrm{SPARQL/Rules}\rightarrow \mathrm{Decision}
$$

其中：

$$
\mathrm{GraphFacts}\rightarrow \mathrm{Decision}
$$

确实更可控了。

但最难的一段：

$$
\mathrm{NaturalLanguage}\rightarrow \mathrm{GraphFacts}
$$

仍然存在。

尤其是开放审核场景，不可能事先穷举所有：

- 表达方式；
- 隐喻；
- 暗示；
- 新词；
- 组合语义；
- 业务上下文；
- 例外条件。

---

### 3.2.3 “提前构建”是图谱真正的成本

知识图谱非常适合：

> **闭合、稳定、可枚举的领域知识。**

例如：

```text
用户 -> 下单 -> 商品
商品 -> 属于 -> 类目
订单 -> 发生于 -> 平台
```

这些关系相对稳定。

但审核语义经常面对的是：

```text
一句新文本是否属于某一种受规则约束的意图？
```

这种边本身是动态的：

```text
Case123 :implies ?Meaning
```

真正困难的是查询变量 $\texttt{?Meaning}$ 所代表的语义应该如何从开放文本中被确定。

也就是说：

> **图谱擅长在“关系已经建立”之后执行约束；Semantic Harness 要处理的是“关系应该怎样被建立，而且建立之后是否足以触发下一步”。**

---

### 3.2.4 RDF 的 Open World Assumption 也会带来另一个问题

RDF/OWL 通常遵循 Open World Assumption：

> 没有记录某事实，不代表该事实为假。

从“不命中不等于不满足”的角度看，这反而和审核很相似。

但问题在于实际审核决策仍然需要区分 $\mathrm{True}$、$\mathrm{False}$ 与 $\mathrm{Unknown}$。

以及：

```text
Unknown 是否阻断某条路径？
Unknown 是否允许某个豁免生效？
```

标准图谱查询并不会自动提供这一整套**决策语义**。

我仍然需要在图谱之上定义：

- rule engine；
- constraint semantics；
- exception；
- priority；
- uncertainty propagation。

因此，知识图谱可以成为 Semantic Harness 的一种**存储和关系表达底座**，但它本身不是完整的 Semantic Harness。

---

## 3.3 谓词逻辑为什么也“看起来非常对”？

假设审核手册：

> 如果内容与交易相关，而且要求将支付转移到平台外，则违规。

一阶逻辑很好写：

$$
Trade(x)\land OffPlatformPayment(x)
\rightarrow Violation(x)
$$

再比如：

> 只有出现交易语境后，才继续判断迁移支付。

可以通过条件关系结构化表示。

所以 FOL 的优点非常明显：

- 语义精确；
- 条件组合能力强；
- 可以表达 AND / OR / NOT / implication；
- 可以交给 theorem prover / SMT solver 验证。

这也是 FoVer、POLARIS 等工作使用 FOL 的原因。

但审核规则很快会遇到一个 FOL 的根本问题：

$$
\boxed{\text{经典逻辑具有单调性（monotonicity）}}
$$

---

## 3.4 为什么 monotonicity 不适合大量审核规则

所谓单调性，可以简单理解为：

> 一旦一个结论从当前知识中被推出，加入更多知识不会使这个结论失效。

如果：

$$
K\models \operatorname{Violation}(x)
$$

那么增加新事实：

$$
K'=K\cup\{\mathrm{new\ fact}\}
$$

经典逻辑仍希望：

$$
K'\models \operatorname{Violation}(x)
$$

但审核经常恰恰不是这样。

---

### 3.4.1 一个最简单的例子

一般规则：

> 交易中交换联系方式，判为导流。

形式化：

$$
\operatorname{Trade}(x)\land \operatorname{ContactExchange}(x)\rightarrow \operatorname{Violation}(x)
$$

当前文本：

> “有需要加我。”

结合上下文已经知道：

```text
Trade = True
ContactExchange = True
```

于是推出：

```text
Violation
```

但后来获得一个额外条件：

```text
AfterSales = True
```

审核手册规定：

> 售后场景豁免。

人的推理是：

```text
原结论被推翻。
```

即：

$$
\operatorname{Violation}(x)\Rightarrow \mathrm{RetractedAfterNewInformation}(x)
$$

这是一种**非单调推理**。

---

### 3.4.2 为什么不能简单写成 $A \land \neg E \rightarrow D$

当然可以尝试：

$$
\operatorname{Trade}(x)\land \operatorname{Contact}(x)\land \neg \operatorname{AfterSales}(x)\rightarrow \operatorname{Violation}(x)
$$

但这里马上遇到问题：

当前没有看到 $\operatorname{AfterSales}(x)$，是否就可以认为：

$$
\neg \operatorname{AfterSales}(x)
$$

？

在开放世界里不能。

“没有证明售后”不等于“证明不是售后”。

如果为了让规则运行，把 $\operatorname{Absence}(\mathrm{AfterSales})=\mathrm{False}$ 当成：

$$
\neg AfterSales
$$

实际上已经偷偷引入了 Closed World / Default Negation。

这不再是朴素的经典 FOL。

---

### 3.4.3 更麻烦的是“豁免的豁免”

例如：

$$
\begin{aligned}
R_1:\;&\mathrm{Trade}\land \mathrm{ContactExchange}\Rightarrow \mathrm{OffPlatform}\\
R_2:\;&\mathrm{AfterSales}\Rightarrow \mathrm{Exempt}(R_1)\\
R_3:\;&\mathrm{ExplicitPaymentBypass}\Rightarrow \mathrm{Override}(R_2)
\end{aligned}
$$

我真正想表达的是：

$$
R_3\succ R_2\succ R_1
$$

也就是说：

```text
一般情况下 R1 生效；
发现售后以后撤销 R1；
如果又发现明确规避支付，再恢复违规判断。
```

这种：

```text
成立
→ 被推翻
→ 再被更强规则推翻
```

本质上属于：

- nonmonotonic reasoning；
- default reasoning；
- defeasible reasoning；
- rule priority。

经典谓词逻辑不是为这种推理模式设计的。

---

# 4. 更接近 Semantic Harness 的方法

**所以真正值得重点看的，不是“再一种不确定性理论”，而是下面这些任务**

接下来重点介绍几类真正靠近 Semantic Harness 的工作。

它们共同研究的是：

> **如何把自然语言 policy / reasoning 转成形式结构，并用逻辑系统约束后续推理。**

它们不是最终答案，但每一类都补上了 Semantic Harness 的一部分。

---

## 4.1 POLARIS：最接近“把手册编译成语义路径图”的工作


<figure>
  <img src="{{ '/assets/daydreams/semantic-harness/images/audit_manual_to_rule_graph.png' | relative_url }}" alt="审核手册被编译为带条件、路径和规则节点的语义规则图" loading="lazy">
  <figcaption>图 4. 从审核手册到语义规则图。</figcaption>
</figure>

*图 4. 这幅图概括了“审核手册 → 条件节点/例外/优先级 → 可执行语义规则图”的转换过程，对应 POLARIS、Legal Text → DDL 等工作的核心启发。*

**论文：Inverting the Shield: Systematically Generating Safety Tests from Policy Specifications，ACL 2026**

POLARIS 的出发点不是审核分类，而是：

> 给定自然语言 safety policy，如何系统地生成覆盖这些 policy 的安全测试？

它的关键流程是：

$$
\mathrm{NaturalLanguagePolicy}\rightarrow \mathrm{FOL}\rightarrow \mathrm{SemanticPolicyGraph}\rightarrow \mathrm{PathExploration}\rightarrow \mathrm{NaturalLanguageTests}
$$

---

### 4.1.1 第一步：把自然语言 policy 编译成 FOL

例如 policy：

> 如果系统泄露个人信息，并且用户没有授权，则违反隐私规则。

可以变成类似：

$$
\operatorname{DisclosePII}(x)\land \neg \operatorname{Authorized}(x)\rightarrow \operatorname{Violation}(x)
$$

这一步最重要的意义是：

> policy 不再只是 prompt，而变成机器可操作的 specification。

---

### 4.1.2 第二步：构造 Semantic Policy Graph

POLARIS 进一步把复杂 policy 构造成 Semantic Policy Graph。

于是一个 policy violation 不再只是：

```text
命中一句规则
```

而可以表示成一条可遍历路径：

```text
条件 A
  ↓
条件 B
  ↓
条件 C
  ↓
违反 Policy X
```

多个规则之间还可以形成组合路径。

这和审核需求非常接近。

因为审核手册同样可以从：

```text
一大段文字
```

转成：

```text
可遍历的条件图
```

---

### 4.1.3 为什么 POLARIS 对 Semantic Harness 很重要

它真正提供了一个很有价值的范式：

$$
\boxed{
\mathrm{NaturalLanguageManual}\rightarrow \mathrm{FormalSpecification}\rightarrow \mathrm{SemanticGraph}
}
$$

也就是说，审核手册不一定要永远停留在 prompt 里。

它可以先被**编译**。

这和我这里提出的 Semantic Harness 方向非常一致。

---

### 4.1.4 但 POLARIS 还没有解决我关心的核心运行时问题

POLARIS 的目标是：

```text
从 policy graph 生成测试。
```

而审核 Semantic Harness 的目标是：

```text
让一个真实用户文本进入 policy graph，
然后受约束地执行。
```

两者差别在于：

POLARIS 已经有：

```text
Policy -> Graph
```

但审核还需要：

```text
Content -> Graph State
```

例如：

> “这里不方便说，换个地方。”

到底应该让哪个节点变成：

```text
True?
False?
Unknown?
```

这一段仍然需要解决。

所以 POLARIS 最适合借鉴的是：

> **审核手册编译器。**

而不是直接拿来当审核执行器。

---

## 4.2 Toward Robust Legal Text Formalization into Defeasible Deontic Logic：最接近“复杂规则编译”的工作

**2026：Horner、Mateis、Governatori、Ciabattoni**

这项工作的目标是：

> 把法律自然语言自动形式化成 Defeasible Deontic Logic（DDL）。

这类任务和审核手册非常像，因为法律规则同样包含：

- obligation；
- prohibition；
- permission；
- exception；
- condition；
- priority；
- conflict。

---

### 4.2.1 它不是整段直接翻译，而是先拆 atomic snippets

论文采用结构化 pipeline。

大体逻辑是：

```text
复杂法律条文
      ↓
拆成 atomic normative snippets
      ↓
抽取 DDL rules
      ↓
检查 syntax / semantic coherence
      ↓
refinement
```

这一步对审核非常有价值。

因为审核手册往往是：

> “如果 A 情况下出现 B，可以认定 C，但若存在 D 则除外；如果 D 同时伴随 E，则仍按照 C 处理……”

如果让模型直接从整段话生成最终规则，容易漏：

- 条件；
- 例外；
- 优先级。

更合理的是先拆：

```text
Rule 1
Rule 2
Exception 1
Override 1
```

然后再建立关系。

---

### 4.2.2 为什么 DDL 比普通 FOL 更适合审核

DDL 的价值不在于“逻辑更复杂”，而在于它承认：

> 规则不是永远有效。

它允许表达类似：

```text
Normally:
A -> D

Unless:
E

But:
F overrides E
```

也就是：

$$
R_{\mathrm{override}}\succ R_{\mathrm{exception}}\succ R_{\mathrm{default}}
$$

这和审核中的：

```text
一般违规
→ 豁免
→ 豁免的例外
```

高度一致。

---

### 4.2.3 对 Semantic Harness 的直接启发

审核手册编译阶段不应该只产出：

```text
A -> B
```

而应该显式产出：

```text
Rule
Exception
Priority
Override
```

这四种关系。

否则系统很容易出现：

```text
只要命中一个规则就停止。
```

而真实审核往往要求：

```text
命中规则后，
还必须继续检查是否存在可击败该规则的条件。
```

---

## 4.3 LLMs as ASP Programmers：为什么 ASP 很可能比普通 FOL 更接近运行时 Semantic Harness

**ACL Findings 2026，Ishay & Lee**

这项工作提出：

$$
\mathrm{NaturalLanguage}\rightarrow \mathrm{ASP\ Program}\rightarrow \mathrm{ASP\ Solver}
$$

并加入一个非常关键的 self-correction loop：

```text
LLM 写 ASP
    ↓
Solver 执行
    ↓
返回 structured error / feedback
    ↓
LLM 修改程序
    ↓
重新执行
```

---

### 4.3.1 最值得注意的不是“让 LLM 写代码”

真正重要的是它使用：

> **Answer Set Programming / Stable Model Semantics**

ASP 是一种**非单调逻辑**。

这意味着它天然适合表达：

```text
一般情况下成立；
除非发现例外；
发现例外之后撤销；
某些规则拥有更强的优先关系。
```

这正是审核规则大量需要的模式。

---

### 4.3.2 一个审核式 ASP 例子

概念性写法：

```prolog
violation(X) :-
    trade(X),
    contact_move(X),
    not exempt(X).

exempt(X) :-
    after_sales(X),
    not explicit_payment_bypass(X).

violation(X) :-
    explicit_payment_bypass(X).
```

现在：

```text
trade = true
contact_move = true
```

如果没有售后：

```text
violation
```

加入：

```text
after_sales = true
```

结果可以变化：

```text
exempt
```

再加入：

```text
explicit_payment_bypass = true
```

结果又重新变为：

```text
violation
```

这类：

$$
\operatorname{Result}(K)\neq \operatorname{Result}(K+\Delta K)
$$

正是非单调推理。

---

### 4.3.3 它为什么比普通谓词逻辑更贴近我当前的需求

我面对的审核手册里，最难的一类规则其实就是：

> **新的条件出现后，允许推翻之前的结果。**

ASP 正是在解决这个问题。

而 ACL 2026 这篇工作进一步说明：

- LLM 可以把自然语言转成 ASP；
- solver 可以返回反馈；
- LLM 可以根据 solver 反馈自动修正；
- stable model semantics 对 default / exception 类任务特别重要。

因此它对 Semantic Harness 的意义不只是：

```text
可以做逻辑推理。
```

而是：

> **可以把审核手册里的“默认—例外—再覆盖”变成真正可执行的规则。**

---

### 4.3.4 但它仍然有一个关键空洞

假设用户说：

> “这里不好说，换个地方。”

ASP 系统最终需要一个 atom：

```prolog
contact_move(case1).
```

或者：

```prolog
off_platform_intent(case1).
```

谁决定这个 atom 的真假，即它是否应该被赋值为 $\mathrm{True}$？

还是 LLM。

所以：

$$
\mathrm{NL}\rightarrow \mathrm{ASP\ facts}
$$

仍然存在语义解释问题。

这也是为什么 Semantic Harness 不能等同于 ASP。

更合理的关系是：

```text
LLM 负责局部条件解析
+
ASP/Defeasible Engine 负责全局语义约束
```

---

## 4.4 STAR：把“自然语言抽取”和“推理”拆开的重要范式

**Reliable Natural Language Understanding with Large Language Models and Answer Set Programming**

STAR 的核心结构非常清楚：

$$
\mathrm{NaturalLanguage}\rightarrow \mathrm{Predicates}\rightarrow \mathrm{Goal\mbox{-}Directed\ ASP}\rightarrow \mathrm{Answer+ProofTree}
$$

它让 LLM 负责：

```text
从自然语言抽取 predicate
```

让 ASP 负责：

```text
基于 predicate 做可靠推理
```

---

### 4.4.1 这和审核 Semantic Harness 的分层很相似

例如：

> “别在这里付，直接给我转。”

LLM 不直接回答：

```text
违规
```

而只负责解析：

```text
trade_context = True
explicit_payment_bypass = True
```

后面是否违规由规则引擎决定：

```text
explicit_payment_bypass
    ->
violation
```

这样模型就失去了一部分“自由解释最终结果”的权力。

---

### 4.4.2 Proof Tree 对审核也非常重要

STAR 可以输出 justification / proof tree。

审核可以借鉴：

```text
Violation
└── R4: explicit_payment_bypass -> violation
    └── explicit_payment_bypass = True
        └── text span: “别在这里付，直接给我转”
```

这比：

```text
模型置信度 0.92
```

更有价值。

因为我可以明确看到：

> 到底是哪条规则、哪个条件、哪段文本导致了结果。

---

### 4.4.3 STAR 仍然没有解决“predicate 是否抽对”

如果模型错误地产生：

```text
explicit_payment_bypass = True
```

后面的 proof tree 可以完全正确，但整个判断仍然错。

因此 STAR 的真正价值是：

$$
\boxed{
\mathrm{Parsing}\neq \mathrm{Reasoning}
}
$$

把二者拆开。

Semantic Harness 则需要在这个基础上再增加：

$$
\boxed{
\mathrm{Parsing}\neq \mathrm{Final\ Selection}
}
$$

即局部 predicate 命中之后，还必须经过全局规则约束。

---

## 4.5 FoVer：最适合用来做“这条语义路径逻辑上有没有问题”的验证器

**FoVer: First-Order Logic Verification for Natural Language Reasoning，TACL 2025**

FoVer 的流程是：

$$
\mathrm{NaturalLanguageReasoning}\rightarrow \mathrm{FOL}\rightarrow \mathrm{Z3}\rightarrow \mathrm{Verification}
$$

它首先让 LLM 把自然语言 reasoning 转成可执行的 FOL，再由 Z3 theorem prover 验证。

---

### 4.5.1 FoVer 最有价值的位置不是做审核主推理器

而是做：

> **规则编译后的静态验证。**

例如审核手册转出：

```text
R1: A ∧ B -> D
R2: D -> ¬A
R3: A -> B
```

这些规则是否存在：

- contradiction；
- impossible path；
- unreachable rule；
- 逻辑循环；
- 某些组合必然冲突。

可以通过 formal verification 辅助检查。

---

### 4.5.2 为什么 FoVer 不能单独解决 Semantic Harness

因为 FOL/Z3 重点保证的是：

```text
给定这些前提，
这个结论在逻辑上是否成立？
```

它不保证：

```text
这些前提是否真的应该由原文本得到。
```

而且经典 SMT/FOL 主要是 monotonic reasoning。

所以它更适合：

$$
\boxed{
\mathrm{Harness\ Verification}
}
$$

而不是：

$$
\boxed{
\mathrm{Harness\ Runtime\ Defeasible\ Execution}
}
$$

---

## 4.6 Defeasible Normative Reasoning：最直接解释“为什么新条件可以推翻旧结论”


<figure>
  <img src="{{ '/assets/daydreams/semantic-harness/images/non_monotonic_reasoning_storyboard.png' | relative_url }}" alt="新条件到来后，原有审核结论因例外规则而被推翻的非单调推理故事板" loading="lazy">
  <figcaption>图 5. 非单调推理的三幕故事板。</figcaption>
</figure>

*图 5. 先按默认规则得到结论，再被例外推翻，最后又被更高优先级条件覆盖。这正是审核语义中“结果可被新条件推翻”的非单调结构。*

**AAAI 2024：Arieli, van Berkel, Straßer**

这篇工作的核心就是：

> norm 可能因为新的条件或冲突而变得不再适用。

它使用带 annotation 的 proof system 来跟踪：

- 某个 norm 为什么适用；
- 为什么不适用；
- 哪个推理步骤可以被接受；
- 哪个推理步骤需要撤销。

论文把这种 proof-theoretic 结果与 argumentation framework 联系起来。

---

### 4.6.1 这和审核规则的关系非常直接

比如：

$$
\begin{aligned}
R_1:\;&\mathrm{ContactExchange}\land \mathrm{Trade}\Rightarrow \mathrm{OffPlatform}\\
R_2:\;&\mathrm{AfterSales}\Rightarrow \mathrm{Defeat}(R_1)\\
R_3:\;&\mathrm{ExplicitPaymentBypass}\Rightarrow \mathrm{Defeat}(R_2)
\end{aligned}
$$

真正需要追踪的不是：

```text
R1 是否曾经命中
```

而是：

```text
R1 当前是否仍然可用？
```

即：

$$
\operatorname{Applicable}(R_1,K)
$$

会随着知识 $K$ 的变化而变化。

---

### 4.6.2 这正好解释“命中不等于选”

模型可以说：

```text
R1 的前件满足。
```

但 Harness 还必须检查：

```text
R1 有没有被更高优先级规则 defeat？
```

因此最终是：

$$
\operatorname{Hit}(R)\rightarrow \operatorname{Applicable}(R)?\rightarrow \operatorname{Defeated}(R)?\rightarrow \operatorname{Selected}(R)?
$$

而不是：

$$
\operatorname{Hit}(R)\rightarrow \mathrm{Label}
$$

这条链条非常适合拿来定义 Semantic Harness。

---

# 5. 方法整合：从手册编译到受约束执行

**把这些工作放在一起后，可以得到一个更清楚的 Semantic Harness**

不需要再找一个“万能理论”。

更合理的做法是把这些工作的强项组合起来。

---

## 5.1 编译阶段：把审核手册变成语义规则图

参考：

- POLARIS；
- Legal Text → DDL；
- LLM → ASP。

输入：

```text
Natural Language Audit Manual
```

输出：

```text
Semantic Rule Graph
```

其中显式包含：

```text
Condition
Precondition
Branch
Conjunction
Disjunction
Exception
Override
Priority
Cross-path Constraint
Unknown Policy
```

---

## 5.2 执行阶段：LLM 只判断局部语义节点

LLM 不再直接：

```text
输出违规/不违规
```

而只负责类似：

```text
A = TradeContext?
B = ContactMigration?
C = ExplicitPaymentBypass?
D = AfterSales?
```

并且每个节点不是简单的 keyword hit。

需要显式区分 $\mathrm{Hit}$、$\mathrm{Satisfied}$ 与 $\mathrm{Unknown}$。

---

## 5.3 规则引擎负责全局裁决

参考：

- ASP；
- Defeasible Logic；
- Defeasible Normative Reasoning。

负责执行：

```text
哪些节点现在可以检查？
哪些路径可以激活？
哪个一般规则被豁免？
哪个豁免又被更强规则覆盖？
多个规则同时成立时谁优先？
```

---

## 5.4 Formal Verifier 检查 Harness 自己有没有逻辑错误

参考：

- FoVer；
- FOL；
- Z3。

对编译后的审核规则做：

```text
Consistency Check
Reachability Check
Conflict Check
Coverage Check
```

这可以避免：

> 人工写了一个超级复杂的 Semantic Harness，但 Harness 自己的规则相互冲突。

---

# 6. 审核案例：规则如何在运行时发生作用

**一个更完整的审核例子：为什么不是“命中就结束”**

审核手册：

```text
R1:
只有进入交易语境，才判断站外交易。

R2:
交易 + 沟通渠道迁移
通常支持站外导流。

R3:
仅提供联系方式，
不足以单独判定站外导流。

R4:
售后场景中的联系方式可以豁免 R2。

R5:
明确要求绕过平台支付时，
直接支持站外交易。

R6:
R5 > R4 > R2。
```

---

## 6.1 Case A

文本：

> “东西有问题的话加我，我给你处理售后。”

局部识别：

```text
TradeContext = Unknown
ContactMigration = True
AfterSales = True
ExplicitPaymentBypass = False
```

错误的关键词系统：

```text
加我 -> 导流
```

Semantic Harness：

```text
ContactMigration=True
        ↓
R2 还要求 TradeContext
        ↓
TradeContext=Unknown
        ↓
R2 不可确定成立

同时：
AfterSales=True
        ↓
R4 激活
```

最终：

```text
不能因为联系方式命中直接选择导流。
```

这里体现：

$$
\mathrm{Hit}\neq \mathrm{Select}
$$

---

## 6.2 Case B

> “这个价格这里不好讲，换个地方聊。”

局部信号：

```text
explicit keyword hit = False
```

但语义节点：

```text
TradeContext = True
ContactMigration = Unknown / likely
ExplicitPaymentBypass = Unknown
```

错误的规则系统：

```text
没有微信/电话/加我
-> 不导流
```

Semantic Harness：

```text
NotHit(ContactKeyword)
≠
False(ContactMigration)
```

因此保留：

```text
Unknown
```

这里体现：

$$
\mathrm{NotHit}\neq \mathrm{False}
$$

---

## 6.3 Case C

> “售后问题加我，不过别在平台付了，直接转给我。”

局部节点：

```text
TradeContext = True
ContactMigration = True
AfterSales = True
ExplicitPaymentBypass = True
```

首先：

```text
R4 售后豁免命中。
```

如果普通规则引擎在这里停止：

```text
豁免。
```

就错了。

Semantic Harness 必须继续执行 priority：

$$
\begin{aligned}
R_5&=\text{明确绕过平台支付}\\
R_4&=\text{售后豁免}\\
R_5&\succ R_4
\end{aligned}
$$

因此：

```text
R4 被 defeat
最终 R5 生效
```

这里体现：

$$
\mathrm{ExceptionHit}\neq \mathrm{FinalExemption}
$$

---

## 6.4 Case D：一个条件同时支持多个路径

> “别平台下单了，加我，我给你便宜点。”

局部节点：

```text
ContactMigration = True
PriceIncentive = True
ExplicitPlatformBypass = True
TradeContext = True
```

可能同时激活：

```text
Path 1:
联系方式导流

Path 2:
交易迁移

Path 3:
价格诱导

Path 4:
明确规避平台
```

Semantic Harness 不能简单返回四个“命中”。

需要执行：

$$
\mathrm{ExplicitPlatformBypass}
\succ
\mathrm{TransactionMigration}
\succ
\mathrm{ContactOnly}
$$

最终主解释：

```text
明确规避平台交易
```

而：

```text
联系方式
价格优惠
```

只是支撑条件，而不是最终主判定。

这里体现：

$$
\mathrm{MultipleHit}\rightarrow \mathrm{PriorityResolution}\rightarrow \mathrm{OneOrStructuredSelection}
$$

---

# 7. 方法边界与最终定位

## 7.1 知识图谱、FOL、ASP、Defeasible Logic 到底怎么选？

最准确的答案不是“谁替代谁”。

它们解决的是不同问题。

| 方法 | 很擅长什么 | 对审核 Semantic Harness 的主要缺口 |
|---|---|---|
| RDF / Knowledge Graph | 存储条件、关系、规则依赖、多跳结构 | 需要预先定义 ontology；开放文本到图节点的 grounding 仍困难；exception/priority 不是核心语义 |
| SPARQL | 查询已经结构化好的复杂关系 | 查询能力强，但不负责决定文本应该生成什么事实 |
| Classical FOL | 精确表达 AND/OR/NOT/implication | 单调；缺少天然 default/exception/retraction；$\mathrm{Unknown}$ 与 $\neg\mathrm{False}$ 的处理需要额外设计 |
| Z3 / SMT | 验证形式约束、检查一致性 | 更适合 verification，不是开放世界语义解析器 |
| ASP | 非单调规则、default negation、stable model | 输入 atom 仍然需要从自然语言 grounding |
| Defeasible Logic | exception、override、priority、rule defeat | 需要提前得到 formal rules 和 case facts |
| POLARIS | NL policy → FOL → Semantic Policy Graph | 更偏 policy 编译与测试生成，不直接解决运行时 case grounding |
| Legal → DDL | 复杂规范拆分、例外、规范逻辑 formalization | 法律规则相对稳定；开放用户表达仍是另一层 |
| STAR | NL → predicates → ASP → proof tree | predicate 抽取本身仍可能错误 |
| FoVer | NL reasoning → FOL → Z3 verification | 主要验证逻辑正确，不验证语义 grounding 是否忠实 |

---

## 7.2 因此，知识图谱并不是失败方案，而更适合作为“图结构载体”

这一点很重要。

Semantic Harness 最终完全可以使用图谱形式存储：

```text
Condition A
    :preconditionOf Condition B

Rule R2
    :defeatedBy Exception E

Rule R5
    :higherPriorityThan Rule R4
```

甚至用 RDF 表示：

```turtle
:R5 :overrides :R4 .
:R4 :overrides :R2 .
:R2 :requires :TradeContext .
:R2 :requires :ContactMigration .
```

再结合查询寻找：

- 当前激活路径；
- 可适用规则；
- 上游依赖；
- 冲突节点。

问题不在于：

> “要不要图谱？”

而在于：

> **不能假设图谱中的语义事实已经天然存在。**

因此更合理的关系是：

$$
\mathrm{KnowledgeGraph}=\text{Semantic Harness 的一种数据结构}
$$

而不是：

$$
\mathrm{KnowledgeGraph}=\text{Semantic Harness 本身}
$$

---

## 7.3 同样，谓词逻辑也不是失败方案，而是“不够完整”

FOL 很适合表达：

```text
规则的确定部分。
```

比如：

$$
A\land B\rightarrow C
$$

POLARIS、FoVer 使用 FOL 都有很充分的理由。

真正不足的是：

```text
审核并不只有确定规则。
```

审核更像：

$$
\mathrm{Default}+\mathrm{Exception}+\mathrm{Priority}+\mathrm{Unknown}+\mathrm{Retraction}
$$

因此可能更合理的是：

```text
FOL:
负责确定性约束和静态验证

ASP / Defeasible Logic:
负责非单调运行时规则

Graph:
负责规则关系、依赖和 traceability

LLM:
负责开放自然语言到局部语义条件的解析
```

这比寻找“单一万能形式体系”更现实。

---

## 7.4 Semantic Harness 的最终核心结构

把所有方法压缩之后，Semantic Harness 可以非常集中地定义为两部分。

---

### 7.4.1 A. Semantic Rule Compiler

输入：

```text
审核手册
```

输出：

```text
Condition Graph
+
Rule Dependency
+
Exception
+
Priority
+
Override
+
Uncertainty Semantics
```

目标：

> 把“自然语言要求”变成机器能够执行的语义规则。

---

### 7.4.2 B. Semantic Constraint Runtime

输入：

```text
用户自然语言内容
```

LLM 只负责给当前规则图中的条件赋状态：

$$
\operatorname{State}(C_i)\in\{\mathrm{True},\mathrm{False},\mathrm{Unknown}\}
$$

Harness 负责：

```text
路径激活
条件依赖
多规则组合
豁免
豁免覆盖
优先级
Unknown 传播
最终选择
```

于是：

$$
\mathrm{Interpretation}=\operatorname{Execute}(\mathrm{ManualRules},\mathrm{ConditionStates})
$$

而不是：

$$
\mathrm{Interpretation}=\operatorname{LLM}(\mathrm{Text},\mathrm{Manual})
$$

---

## 7.5 这套“术”真正约束的是什么？

它不是试图消灭自然语言的不确定性。

这是不现实的。

它真正约束的是：

> **不确定性被允许怎样传播。**

例如：

```text
一个节点 $\mathrm{Unknown}$
```

不能偷偷变成：

```text
False
```

一个局部 signal 命中，即 $\mathrm{Hit}=\mathrm{True}$，

不能偷偷升级成 $\mathrm{RuleSelected}=\mathrm{True}$。

一个一般规则当前适用，即 $\mathrm{Applicable}=\mathrm{True}$，

不能在没有检查 exception 之前直接结束。

一个 exception 成立，即 $\mathrm{Exempt}=\mathrm{True}$，

也不能在没有检查更高优先级 override 之前永久结束。

因此 Semantic Harness 最核心的四条约束其实是：

$$
\boxed{\mathrm{Hit}\neq \mathrm{Satisfied}}
$$

$$
\boxed{\mathrm{NotHit}\neq \mathrm{False}}
$$

$$
\boxed{\mathrm{Satisfied}\neq \mathrm{Selected}}
$$

$$
\boxed{\mathrm{CurrentResult}\neq \mathrm{IrrevocableResult}}
$$

最后一条尤其重要。

因为审核语义不是单调的：

> 新条件到来以后，原来的解释可以被推翻。

这也是为什么非单调逻辑、ASP、Defeasible Logic 比单纯的决策树、知识图谱查询和经典谓词逻辑更值得继续深入。

---

## 7.6 结论：Semantic Harness 不是新的知识表示，而是一套“受约束的语义执行机制”

最终，这个问题不应该被描述成：

> “我需要一种新的知识图谱。”

也不应该只是：

> “我需要把审核规则写成谓词逻辑。”

更准确的目标是：

> **把自然语言审核手册编译为一套可以执行、可以被新条件推翻、可以处理例外和优先级、并且不会把 Unknown 偷偷当成 False 的语义约束程序。**

知识图谱可以承载它的结构。

FOL 可以表达其中的确定规则，例如 $A\land B\rightarrow C$。

Z3 可以验证其中的逻辑一致性。

ASP 可以执行非单调规则。

Defeasible Logic 可以处理例外、优先级与 rule defeat。

POLARIS 提供了“自然语言 policy → formal specification → semantic graph”的重要范式。

Legal Text → DDL 展示了复杂规范如何拆分、形式化和 refinement。

STAR 展示了“自然语言解析”和“符号推理”应该拆开。

FoVer 展示了形式逻辑可以如何成为验证层。

而真正的 Semantic Harness，要把这些能力集中到一个目标上：

$$
\boxed{
\text{让模型按照审核手册规定的语义逻辑去理解，
而不是仅仅把审核手册放进 Prompt 里希望它自己遵守。}
}
$$

这就是我在这篇文章里想要描述的“术”。

---

## 相似做法与区别

本文提出的是面向审核运行时的“受约束语义执行”视角，而不是另造一种知识表示。与之最接近的直接先例包括： [POLARIS](https://aclanthology.org/2026.acl-long.1417/) 将自然语言政策编译成 FOL 与可遍历的语义政策图，用于可追溯的安全测试；[LLM+ASP](https://aclanthology.org/2026.findings-acl.1151/) 将自然语言转为具有稳定模型语义的 ASP，以表达默认规则和例外；[STAR](https://arxiv.org/abs/2302.03780) 则强调把自然语言理解同符号推理解耦。它们分别验证了政策编译、非单调裁决与神经符号分层的可行性。

本文的区别在于把这些能力统一放进审核手册的在线执行闭环：LLM 只解析局部条件，规则运行时处理路径、优先级、豁免与 Unknown；这一运行时定位是本文基于上述工作的综合，而非对任一工作的功能转述。

# 8. 参考工作

1. Rajasekharan, A., Zeng, Y., Padalkar, P., & Gupta, G. **Reliable Natural Language Understanding with Large Language Models and Answer Set Programming (STAR).** arXiv:2302.03780.  
   https://arxiv.org/abs/2302.03780

2. Ishay, A., & Lee, J. **LLMs as ASP Programmers: Self-Correction Enables Task-Agnostic Nonmonotonic Reasoning.** Findings of ACL 2026.  
   https://aclanthology.org/2026.findings-acl.1151/

3. Pei, Y., Du, Y., & Jin, X. **FoVer: First-Order Logic Verification for Natural Language Reasoning.** TACL 2025.  
   https://aclanthology.org/2025.tacl-1.61/

4. Lu, X., Yang, X., Liu, H., Liu, J., Cai, K., Xiao, Y., & Dong, J. S. **Inverting the Shield: Systematically Generating Safety Tests from Policy Specifications (POLARIS).** ACL 2026.  
   https://aclanthology.org/2026.acl-long.1417/

5. Horner, E., Mateis, C., Governatori, G., & Ciabattoni, A. **Toward Robust Legal Text Formalization into Defeasible Deontic Logic Using LLMs.** 2026.  
   https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6636974

6. Arieli, O., van Berkel, K., & Straßer, C. **Defeasible Normative Reasoning: A Proof-Theoretic Integration of Logical Argumentation.** AAAI 2024.  
   https://ojs.aaai.org/index.php/AAAI/article/view/28913
