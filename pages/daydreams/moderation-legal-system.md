---
layout: post
title: "为什么不存在一份“完美的审核手册”：从法律体系看内容审核的规则、边界与演化"
date: 2026-09-13 08:00:00 +0800
summary: "审核系统不应追求一份静态完备的规则表，而应构建由规则、原则、判例、程序与持续演化共同组成的法律式系统。"
tags: [Daydreams, 内容审核, 审核手册, 法律体系, 规则推理, LLM]
series: daydreams
daydream: true
thought_axis: 法
permalink: /daydreams/moderation-legal-system/
cover: /assets/daydreams/moderation-legal-system/images/规则与覆盖_岔路口的抉择.png
body_class: daydream-post
---

# 为什么不存在一份“完美的审核手册”：从法律体系看内容审核的规则、边界与演化

## 核心观点与结论

这篇文章的核心判断是：

> **不存在一份能够同时做到“覆盖完备、边界清晰、难以规避、足够简洁”的完美审核手册。真正可扩展的方向，不是继续把规则写得越来越多，而是把审核体系设计成类似法律系统的“规则 + 原则 + 判例 + 程序 + 演化”体系。**

更具体地说：

1. **规则越清晰，越容易被沿边界规避。** 明确规则能提高执行一致性，但也会把边界暴露给策略性用户。
2. **规则越追求覆盖全面，越容易陷入逐案枚举。** 新表达、新语境和新规避方式会不断出现，规则会持续膨胀。
3. **规则越抽象，越依赖解释。** 抽象原则可以覆盖更多未来情形，却必然重新引入语义判断和裁量空间。
4. **因此，审核系统的目标不应该是“消灭模糊性”，而应该是“治理模糊性”。** 明确区域使用规则，灰区使用程序，新型 case 使用判例与类比推理，规避行为则依靠“实质重于形式”的原则处理。
5. **最重要的设计转变，是从“完备规则集”转向“法律式审核系统”。** 大语言模型可以参与语义理解，但必须约束它围绕哪些事实维度进行判断；新 case 的裁决还应该继续沉淀为判例、规则和例外。

如果把矛盾进一步压缩，可以把审核手册记作 <span markdown="0">\(M\)</span>，把未来开放世界中的案例集合记作 <span markdown="0">\(\mathcal{C}_{\mathrm{future}}\)</span>。我们真正面对的问题是：有限的 <span markdown="0">\(M\)</span> 很难对不断变化的 <span markdown="0">\(\mathcal{C}_{\mathrm{future}}\)</span> 同时实现完备、精确、简洁和抗规避。

$$
\text{完备性}
+
\text{确定性}
+
\text{简洁性}
+
\text{抗规避性}
\not\Rightarrow
\text{可被有限静态规则同时最大化}
$$

因此，全文真正要回答的不是：

> 如何写出一份更长、更详细的审核手册？

而是：

> **如何建立一套即使手册没有提前写出答案，也仍然能够稳定处理新案例、解释灰区、抵抗规避并持续演化的审核制度？**

---

从这个角度看，“写出一份完美审核手册”这个目标本身可能就是错的。

法律几百年来面对的，恰恰就是内容审核现在面对的同一组矛盾：规则越精确，越容易被沿着字面边界规避；规则越抽象，越需要解释和裁量；如果试图把所有情况都写进去，规则体系又会迅速膨胀成无穷无尽的 case（具体案例）定义。

法律真正成熟的地方，并不是因为法律条文被写得足够“完美”，而是因为它建立了一整套机制，用来处理规则本身注定无法提前覆盖的现实。

---

## 1. 为什么不存在一份“完美审核手册”

<figure><img src="{{ '/assets/daydreams/moderation-legal-system/images/规则与覆盖_岔路口的抉择.png' | relative_url }}" alt="Tao 在清晰规则与广泛覆盖之间：规则越清晰越容易被沿边界规避，规则越追求覆盖越容易膨胀" loading="lazy"></figure>

*图 1：审核手册的核心张力——清晰、覆盖、抗规避与复杂度之间并不能被同时无限优化。*

先把审核团队通常希望同时满足的目标形式化一下。

大家其实希望审核规则同时做到：

$$
\text{清晰性} + \text{覆盖性} + \text{抗规避性} + \text{低复杂度}
$$

但这四个目标之间存在结构性的张力。

### 1.1 规则越清晰，越容易被沿边界规避

例如：

> 出现 A、B、C 三种表达，并且指向某类对象，则违规。

这种规则很容易执行，审核员和模型都能快速判断。

法律理论通常把这类规则称为 **rules（明确规则）**：在规则制定阶段，就尽可能把触发条件事先写清楚。

它最大的优点是确定性强、执行成本低。

但问题也很直接：用户可以主动观察规则，然后设计规避方式。

例如：

- A 不行，就写 A'；
- 直接说不行，就用谐音；
- 文字不行，就换 emoji；
- 正面表达不行，就换反讽；
- 一句话不行，就把语义拆成几句话；
- 直接指代不行，就换成暗号和隐语。

于是出现所谓 **under-inclusiveness（覆盖不足）**：

> 规则的字面范围小于规则真正想防止的问题范围。

这意味着，规则越精确，边界越清晰；而边界越清晰，策略性用户就越容易知道“哪里还没有被禁止”。

---

### 1.2 覆盖越全面，越容易陷入逐案定义

发现 A'，就补充 A'。

又发现 A''，就补充 A''。

再发现 A 与 C 联合使用、谐音、拆字、图像替代、截图嵌字、上下文暗示等各种新形式，就继续增加规则。

最终规则不断增长：

$$
R_1 \rightarrow R_2 \rightarrow R_3 \rightarrow \cdots \rightarrow R_n
$$

这就是审核手册最常见的演化路径：

> 一开始只有一条原则，后来因为执行不一致不断加例子，再因为例子无法覆盖新情况继续加例外，最后变成大量局部定义。

问题不只是“手册很长”。

更重要的是，case 空间本身并不是静态的。

用户会根据时刻 $t$ 的已有规则调整自己的行为：

$$
\mathrm{Policy}_t
\rightarrow
\mathrm{UserAdaptation}_{t+1}
\rightarrow
\mathrm{NewCases}_{t+1}
\rightarrow
\mathrm{Policy}_{t+1}
$$

也就是说：

> 内容审核不是普通的静态分类问题，而是一个存在策略性参与者的动态分类问题。

因此，即使今天穷举了昨天的数据空间，也不能保证明天的数据空间仍然长成同样的样子。

---

### 1.3 规则越抽象，越依赖解释

例如：

> 禁止任何通过侮辱、贬低等方式攻击特定群体的内容。

这类规则的覆盖性显然更高。

但是问题立即转移到了“解释”：

- 什么叫侮辱？
- 什么叫贬低？
- 调侃算不算？
- 朋友之间互相开玩笑算不算？
- 引用别人的攻击性表达算不算？
- 新闻报道中的原话算不算？
- 自嘲算不算？
- 同一个词在不同社群里的含义一样吗？
- 讽刺和真实支持如何区分？

于是：

$$
\mathrm{Coverage}\uparrow
\quad\Rightarrow\quad
\mathrm{InterpretiveDiscretion}\uparrow
$$

法律理论通常把这一端称为 **standards（开放式判断标准）**。

它不是试图提前规定所有事实，而是规定一个需要结合具体情境判断的标准。

例如法律中常见的：

- reasonable person（合理人标准）；
- negligence（过失）；
- good faith（善意）；
- proportionality（比例原则）；
- abusive conduct（滥用性行为）。

因此，规则和标准之间始终存在一个基本交换关系：

> 越想提前写死，就越容易漏掉未来变化；越想覆盖未来变化，就越需要解释空间。

---

## 2. 法律如何面对同样的矛盾

### 2.1 法律的真正做法：不追求完美文本，而是建立制度

答案不是“法律把这个矛盾解决掉了”。

恰恰相反。

法律真正成熟的地方在于：

> **它接受了单一规则文本不可能解决全部现实问题。**

因此，它没有把系统设计成：

$$
\mathrm{Rulebook} \rightarrow \mathrm{Decision}
$$

也就是：

> 手册 → 直接得到答案

而是设计成：

$$
\text{Principles}
+
\text{Rules}
+
\text{Precedents}
+
\text{Interpretation}
+
\text{Procedure}
+
\text{Adjudication}
\rightarrow Decision
$$

这里分别可以理解为：

- Principles（原则）；
- Rules（明确规则）；
- Precedents（判例/先例）；
- Interpretation（解释机制）；
- Procedure（程序规则）；
- Adjudication（裁决机制）。

法律真正做的事情不是“让规则完美”，而是：

> **允许规则不完美，但建立一套处理规则不完美的制度。**

这可能是对审核最重要的启发。

---

### 2.2 Open Texture（开放纹理）：规则天然存在边界

<figure><img src="{{ '/assets/daydreams/moderation-legal-system/images/开放纹理_公园里的边界思考.png' | relative_url }}" alt="Tao 面对车辆不得入园的开放纹理：救护车、玩具车、电动轮椅、保洁车和无人配送车构成不同边界案例" loading="lazy"></figure>

*图 2：开放纹理——看似清楚的规则，在新对象和新语境出现后仍然会产生边界案例。*

法律哲学中，一个非常重要的概念是 **Open Texture（开放纹理）**。

它表达的是：

> 自然语言中的一般性概念，不可能提前穷举未来所有适用边界。

例如：

> “车辆不得进入公园。”

看起来很清楚。

汽车当然属于车辆。

但马上就会出现边界问题：

- 救护车呢？
- 玩具车呢？
- 电动轮椅呢？
- 清洁车呢？
- 儿童电动车呢？
- 一辆作为纪念物永久摆放在公园里的坦克呢？
- 未来还没有发明出来的自动配送设备呢？

这些问题并不一定是因为规则写得差。

而是因为：

$$
\text{Future World} > \text{Enumerated Cases}
$$

未来世界中的对象、语境和行为组合，天然多于规则制定者能够提前枚举的情况。

这对审核非常重要。

很多团队潜意识里仍然认为：

> 只要 policy（审核政策）再写清楚一点，模型或者审核员就不会理解错。

但“开放纹理”告诉我们：

> **一部分不确定性并不是文档质量问题，而是开放世界中的自然语言规范本来就不可能提前彻底封闭。**

所以审核系统真正要设计的，不只是“怎样把话写清楚”，还包括：

> 当规则没有提前写出当前 case 时，系统应该如何继续做出稳定判断。

---

### 2.3 税法中的反避税：精确规则与规避行为

税法是一个非常适合类比内容审核的法律领域。

原因在于，税法高度依赖明确规则。

纳税人必须能够提前知道：

> 做某种交易，到底产生什么税务后果。

因此税法天然倾向于非常精确的规则。

但精确规则会产生一个非常明显的副作用：

> 一旦参与者知道某个条件会触发税务后果，就可以设计一种形式上不触发条件、但实质上达到同样经济效果的结构。

于是法律和行为者之间很容易形成：

$$
Rule
\rightarrow
Loophole
\rightarrow
Patch
\rightarrow
New\ Loophole
\rightarrow
New\ Patch
$$

其中：

- Loophole（规则漏洞）；
- Patch（补丁式规则修补）。

这个过程与内容审核中的情况几乎同构：

> 禁某个词 → 用户换谐音 → 增加谐音规则 → 用户换 emoji → 增加 emoji 规则 → 用户换隐喻 → 继续修规则。

因此，税法最后并没有选择“无限枚举”。

而是逐步形成了双层结构：

#### 2.3.1 Specific Anti-Avoidance Rules（具体反避税规则）

针对已经非常明确的规避模式，制定具体条款。

#### 2.3.2 General Anti-Avoidance Rule，GAAR（一般反避税规则）

当一种交易在形式上看似绕过了具体规定，但其实违背了整个制度的目的时，可以使用更一般性的反规避原则处理。

这里最关键的思想是：

> 规则不能只看形式，还要看它在整个制度中的实质功能。

而且税法本身非常清楚地承认两个目标之间存在张力：

- 防止制度被滥用；
- 同时保留足够的可预测性和确定性。

这其实就是审核面临的同一个 dilemma（两难困境）。

因此法律没有选择：

> “精确”和“抗规避”二选一。

而是使用：

$$
\text{Specific Rules} + \text{General Anti-Abuse Principle}
$$

其中 **General Anti-Abuse Principle（一般反滥用原则）** 是对具体规则无法覆盖的新型规避行为提供兜底。

---

## 3. 法律式审核体系：从规则表到多层规范系统

<figure><img src="{{ '/assets/daydreams/moderation-legal-system/images/向更健康的对话世界筑塔.png' | relative_url }}" alt="Tao 搭建法律式审核体系：从政策目的、一般标准、明线规则、例外、反规避原则到判例、程序规则和持续演化" loading="lazy"></figure>

*图 3：法律式审核体系不是单一规则表，而是由政策目的、规则、例外、判例、程序和演化机制共同组成。*

### 3.1 整体迁移思路

如果把法律的做法转化到审核体系，可以把一份传统审核手册拆成多层，而不是只保留一棵不断增长的规则树。

---

### 3.2 Policy Purpose（政策目的）

最上层首先不应该写：

> 哪些 case 违规？

而应该写：

> **这个规则到底想防止什么伤害？**

例如：

> 防止因为某种身份属性而对个人或群体进行贬低、排斥或去人格化。

这一层很像法律中的 **Legislative Purpose（立法目的）**。

它不是直接用于所有 case 的机械匹配。

它的作用是：

> 给下层规则提供语义方向。

也就是说，当具体规则之间冲突，或者出现规则没有覆盖的新情况时，系统至少知道：

> 这套规则最开始为什么存在。

---

### 3.3 General Standard（一般判断标准）

这一层不再穷举表达方式，而是定义：

> 哪些事实真正决定一个 case 是否成立。

例如：

$$
\mathrm{ProtectedTarget}(x)
\land
\mathrm{DerogatoryAct}(x)
\land
\mathrm{DirectedAt}(x)
\land
\neg \mathrm{Exception}(x)
\rightarrow
\mathrm{Violation}(x)
$$

其中 $x$ 表示当前待判断的内容或案例，可以理解为：

- ProtectedTarget：是否针对受保护对象；
- DerogatoryAct：是否存在贬损性行为；
- DirectedAt：该表达是否真正指向该对象；
- Exception：是否存在例外情形；
- Violation：是否构成违规。

这里真正重要的改变是：

> 不再定义“语言长什么样”，而开始定义“什么事实具有规范相关性”。

这非常接近法律中的 **elements of an offence / elements of a claim（违法行为或请求成立所需要满足的构成要件）**。

内容审核如果借鉴这种思路，规则手册就不再只是：

> 哪些词能说，哪些词不能说。

而会逐渐变成：

> 判断一个内容是否违规，需要依次确认哪些语义事实。

---

### 3.4 Bright-line Rules（明线规则）

对于高频、明确、执行一致性要求很高的场景，可以继续保留非常清晰的规则。

这类规则称为 **Bright-line Rules（明线规则）**。

例如：

> 明确出现某类严重贬损表达，并明确指向某保护属性对象，原则上认定成立。

它的价值是：

$$
\mathrm{Consistency}\uparrow
$$

也就是提高执行一致性。

因此，法律式体系并不是反对具体规则。

相反：

> 对于稳定、高频、边界已经比较成熟的问题，应该尽可能规则化。

真正的问题只是：

> 不能要求所有开放问题都被强行变成明线规则。

---

### 3.5 Safe Harbor（安全港）与 Unsafe Harbor（明确禁止区）

审核手册可以进一步明确两个区域。

#### 3.5.1 Safe Harbor（安全港）

明确告诉执行者：

> 满足这些条件，可以稳定认定为允许。

例如：

- 新闻报道；
- 批判性引用；
- 教育讨论；
- 历史材料引用；
- 在没有背书原观点的情况下进行分析。

#### 3.5.2 Unsafe Harbor（明确禁止区）

虽然 “Unsafe Harbor” 不是法律里像 Safe Harbor 一样严格固定的术语，这里可以把它理解为：

> 明确命中时，原则上应判违规的稳定区域。

例如：

> 明确针对某群体使用严重去人格化表达。

#### 3.5.3 Grey Zone（灰区）

<figure><img src="{{ '/assets/daydreams/moderation-legal-system/images/灰区决策_从案例到更好选择.png' | relative_url }}" alt="Tao 将新案例分流到接受、拒绝和升级，并通过判例和类比推理处理灰区" loading="lazy"></figure>

*图 4：灰区不是制度失败。明确案例可以接受或拒绝，不确定案例则进入升级、类比和判例推理。*

在两者中间承认存在 **Grey Zone（灰区）**：

```text
明确违规区
──────────────
    灰区
──────────────
明确允许区
```

这一设计比试图在所有 case 中画出一条极细、永远不会动的边界更加现实。

这也可以和 **Three-Way Decision（三支决策）** 对应起来：

$$
Accept,\ Reject,\ Defer
$$

即：

- Accept（接受）；
- Reject（拒绝）；
- Defer（延后判断、升级处理）。

因此，灰区不是制度失败。

只要灰区具有明确的处理程序，它就可以成为制度的一部分。

---

### 3.6 Anti-Circumvention Principle（反规避原则）

<figure><img src="{{ '/assets/daydreams/moderation-legal-system/images/表面变了_本质未变.png' | relative_url }}" alt="Tao 识别谐音、表情符号、图文混合、拆分表达和委婉表达中的规避行为，强调实质重于形式" loading="lazy"></figure>

*图 5：反规避原则关注的是表达承担的实质功能，而不是表面形式是否发生变化。*

审核体系里非常需要一个上位原则：

> **判断语义和功能，而不是仅判断表面形式。**

这可以称为 **Anti-Circumvention Principle（反规避原则）**。

例如：

> 如果内容通过错别字、谐音、拆字、图像替代、隐语或其他形式改变，但在具体语境中仍然承担与禁止表达实质相同的功能，应按照其实质语义判断。

这背后对应法律中非常常见的思想：

$$
Substance > Form
$$

即 **Substance over Form（实质重于形式）**。

这比无限维护词表更重要。

因为真正需要约束的是：

> 某种语义功能是否仍然存在，而不是它是否继续使用了原来的字面形式。

---

## 4. 判例与程序：如何治理灰区

到这里会出现一个新的问题：

> 如果不再穷举所有表达，而是要求理解“实质语义”，那是不是又变成“让审核员或者模型自己理解”？

答案是：是的。

所以只有 General Principle（一般原则）仍然不够。

法律之所以能够长期运行，还依赖另外一个非常重要的机制：

### 4.1 Case Law（判例法）：让新案例反过来塑造规则

法律并不要求立法者提前把所有 case 写完。

它允许新的 case 在被裁决之后，反过来丰富整个规则体系。

可以把这个过程表示成：

$$
C_1
\rightarrow
\mathrm{Reasoning}
\rightarrow
\mathrm{Principle}_1
$$

其中：

- $C_1$：一个新的边界案例；
- Reasoning（裁决推理）；
- Principle（从案件中抽取出的原则）。

例如，一个新 case $C_1$ 虽然没有使用典型禁止词，但经过判断发现：

1. 指向对象非常明确；
2. 使用了共同可识别的替代表达；
3. 该表达在具体语境中承担了与原禁止表达相同的贬损功能。

因此，裁决结果可以形成新的可复用判断依据。

下一次再遇到类似案件，就不必从最上层原则重新开始。

而可以问：

$$
\mathrm{Similarity}(C_2,C_1)\ ?
$$

也就是：

> 新 case $C_2$ 与已有判例 $C_1$ 在关键事实维度上是否相似？

---

### 4.2 判例不是简单的 case memory（案例记忆）

这一点非常重要。

如果只是存：

```text
input:
xxx

label:
violation
```

那只是案例数据库。

真正有价值的判例应该保存：

$$
\mathrm{Case}
\rightarrow
\mathrm{DecisiveFacts}
\rightarrow
\mathrm{Reasoning}
\rightarrow
\mathrm{Rule}
$$

其中：

- Decisive Facts（决定性事实）；
- Reasoning（推理过程）；
- Rule（可以复用的规则或原则）。

这和以下几个方向高度相关：

- **Case-Based Reasoning（基于案例的推理）**；
- **Precedent Learning（判例学习）**；
- **Rule Induction（规则归纳）**。

真正重要的不是：

> “之前这个 case 判了什么？”

而是：

> “之前为什么这么判？哪些事实真正改变了结果？”

---

### 4.3 Procedure（程序规则）

法律体系还有一个审核经常忽视的部分：

> 当语义本身无法完全确定时，法律不一定继续强迫自己定义出唯一答案，而是转而规定“这种不确定性应该如何处理”。

例如法律会使用：

- burden of proof（举证责任）；
- standard of proof（证明标准）；
- presumption（推定规则）；
- appeal（申诉/上诉机制）；
- jurisdiction（管辖权）；
- authority（裁决权限）。

也就是说：

$$
\text{Semantic Uncertainty}
\neq
\text{必须通过更复杂的语义规则彻底消除}
$$

还可以通过：

$$
\text{Decision Procedure}
$$

即 **Decision Procedure（决策程序）** 来治理。

例如审核中可以规定：

> 如果“恶意意图”是违规成立的必要条件，但当前上下文不足以支持这一判断，则不得仅凭猜测认定成立。

或者：

> 当存在 A/B 两种同样合理的解释，并且没有额外证据区分时，进入人工升级流程。

这往往比继续写十条：

> “什么叫恶意”

更加稳定。

---

### 4.4 不要试图消灭模糊性，而要治理模糊性

传统审核规则的思路通常是：

$$
\mathrm{Ambiguity}
\rightarrow
\mathrm{WriteMoreRules}
\rightarrow
\mathrm{Ambiguity}=0
$$

其中：

- Ambiguity（模糊性）；
- Write More Rules（继续增加规则）。

但在开放世界中，这个目标很难真正实现。

法律式思路更接近：

$$
\mathrm{Ambiguity}
\rightarrow
\mathrm{Identify}
\rightarrow
\mathrm{Constrain}
\rightarrow
\mathrm{Reason}
\rightarrow
\mathrm{Adjudicate}
\rightarrow
\mathrm{Precedent}
\rightarrow
\mathrm{Update}
$$

即：

- Identify（识别不确定点）；
- Constrain（约束可接受的解释空间）；
- Reason（推理）；
- Adjudicate（裁决）；
- Precedent（沉淀为判例）；
- Update（更新体系）。

核心不是：

> “怎样让未来不再出现模糊 case？”

而是：

> “未来再出现模糊 case 时，系统是否知道应该怎样处理？”

---

### 4.5 为什么人类审核员能执行，而模型往往执行不稳

人类审核员通常也不是把几百页手册完整转化成 if-else（条件分支规则）之后再做判断。

实际工作中，他们会逐渐形成：

$$
\mathrm{Rules}
+
\mathrm{Cases}
+
\mathrm{TacitConcepts}
+
\mathrm{TeamPrecedents}
+
\mathrm{EscalationNorms}
$$

其中：

- Tacit Concepts（隐性概念理解）；
- Team Precedents（团队内部形成的先例）；
- Escalation Norms（升级处理惯例）。

例如，一个资深审核员可能会说：

> “这种以前一般不算。”

这背后实际上是 **Implicit Precedent（隐性先例）**。

另一个审核员可能会说：

> “虽然字面上没命中，但跟之前那个 case 本质一样。”

这其实是 **Analogical Reasoning（类比推理）**。

还有人会说：

> “这种我们一般都升级。”

这其实是 **Procedural Rule（程序规则）**。

所以人类之所以能够逐渐把尺度“拉起来”，未必是因为人脑里存在一份更完整的规则。

更可能是因为：

> 人工作在一套隐形的、不断演化的“普通法式系统”里。

---

### 4.6 对 Agent（智能体）的启发：让它形成“判例法”

如果希望 Agent 从大量 case 中归纳经验，而不是无限 case-by-case，可以改变记忆和反思单元。

不要只保存：

```text
input:
xxx

label:
violation
```

而是保存更结构化的判例单元：

```text
Facts（事实）
-----
哪些事实成立？

Issue（争议问题）
-----
真正有争议的语义问题是什么？

Applicable Rule（适用规则）
---------------
适用哪一个上位政策？

Holding（裁决结论）
-------
最终裁决是什么？

Ratio（核心裁判理由）
-----
哪些事实真正决定了结果？

Exception（例外）
---------
为什么某些相似情况不适用？

Counterfactual（反事实）
--------------
改变哪个事实，结果会发生变化？

Precedent Scope（判例适用范围）
----------------
这个判例以后可以约束哪类案件？
```

这里的 **Ratio（核心裁判理由）** 可以理解为：

> 真正决定案件结论、以后可以被复用的理由。

这比单纯记忆标签更重要。

---

## 5. LLM（大语言模型）与语义约束

### 5.1 LLM 不只是 rule executor（规则执行器）

<figure><img src="{{ '/assets/daydreams/moderation-legal-system/images/语义约束下的向善对话流程.png' | relative_url }}" alt="Tao 与 LLM Agent 按对象、贬损、语境、引用、意图和证据等受约束维度进行语义判断" loading="lazy"></figure>

*图 6：语义约束的重点不是禁止模型理解，而是限制模型只能围绕被认可的规范维度形成裁决。*

2026 年一篇讨论大语言模型与内容审核规则的论文提出了一个有意思的表述：

> **rules by the millions（数以百万计的规则）**

它的意思并不是模型内部真的存在数百万条显式 if-else。

而是：

> 大语言模型通过海量语料学习到了大量非常细粒度的上下文模式。

可以把这些模式理解为：

**micro-rules（微规则）**。

这使得 LLM 的优势恰好是：

$$
\mathrm{Case}
\rightarrow
\mathrm{SemanticAnalogy}
$$

即：

> 一个新 case 虽然字面不同，但模型可能识别出它与某个既有场景在语义上相似。

但它最大的风险也是这里：

> 模型为什么认为两个 case 相似，往往缺少明确约束。

因此真正应该约束的，可能不是：

$$
\mathrm{LLM} \rightarrow \mathrm{Rule}
$$

而是：

$$
\mathrm{LLM}
\rightarrow
\boxed{\text{Legally Relevant Dimensions}}
\rightarrow
\mathrm{Precedent}
\rightarrow
\mathrm{Rule}
\rightarrow
\mathrm{Decision}
$$

其中 **Legally Relevant Dimensions（具有规范意义的相关判断维度）** 指的是：

> 允许模型理解语言，但必须限制它只能围绕哪些事实维度进行判断。

例如：

- 是否明确指向某类对象；
- 是否存在贬损；
- 是否存在引用；
- 是否存在教育语境；
- 是否存在反讽；
- 是否有足够证据支持意图判断。

换句话说：

> **允许模型做语义理解，但不能让模型自由决定“什么因素应该影响裁决”。**

这可能正是“语义约束”真正应该发挥作用的位置。

---

### 5.2 重新定义“完美审核手册”

所谓“完美审核手册”不应该被定义成：

> 能提前写出所有未来 case 的答案。

因为这相当于要求：

$$
\forall x \in \mathcal{C}_{future},\ \mathrm{Rulebook}(x)
$$

即：

> 对所有未来案例，都能直接从现有规则得到唯一答案。

在开放世界里，这几乎不现实。

更合理的定义应该是：

> **对于明确 case 能稳定裁决；对于新 case 能确定该比较哪些因素；对于模糊 case 能明确如何处理不确定性；对于新型规避能依靠政策目的和既有判例进行扩展；并且能够把新裁决继续沉淀回规则体系。**

于是，一个成熟的审核制度应该更接近：

$$
\boxed{
Rules
+
Standards
+
Precedents
+
Anti\text{-}Circumvention
+
Procedure
+
Evolution
}
$$

其中：

- Rules（明确规则）；
- Standards（一般判断标准）；
- Precedents（判例）；
- Anti-Circumvention（反规避机制）；
- Procedure（程序规则）；
- Evolution（持续演化机制）。

而不是：

$$
\boxed{\text{更多规则}}
$$

---

### 5.3 The Impossibility of the Complete Moderation Manual（完备审核手册的不可能性）

这个命题未必需要被写成严格的数学定理，但可以作为一个核心设计命题：

> **对于开放、语境依赖且存在策略性适应的内容空间，有限的自然语言规则集无法同时最大化完备性、确定性、简洁性与抗规避性。试图通过增加规则提高完备性，会导致规则复杂度和 case enumeration（案例枚举）持续增长；试图通过抽象提高覆盖性，则必然重新引入解释裁量。因此，可扩展的审核系统必须从“完备规则集”转向“规则—标准—判例—程序”的混合规范体系。**

这个命题可以把此前关于不确定性、三支决策、可废止逻辑、判例学习和 Agent 的讨论串起来。

例如：

- **Rough Set（粗糙集）**：描述确定区和边界区；
- **Three-Way Decision（三支决策）**：接受、拒绝、延后判断；
- **Subjective Logic（主观逻辑）**：表达带有不确定性的信念；
- **Defeasible Logic（可废止逻辑）**：处理规则、例外和规则优先级；
- **Precedent Learning（判例学习）**：从既有裁决中形成可复用先例；
- **Case-Based Reasoning（基于案例的推理）**：通过案例之间的相似性进行类比；
- **Rule Induction（规则归纳）**：从多个案例中提取更一般的规则；
- **Agent（智能体）**：负责调查、检索先例、比较事实差异和组织推理；
- **Semantic Constraint（语义约束）**：限制哪些语义事实可以成为裁决理由。

---

## 6. 从“审核手册”走向 Moderation Legal System（审核法律式系统）

传统审核手册更像：

```text
规则
 ↓
案例
 ↓
答案
```

更成熟的体系可以设计成：

```text
                    Policy Constitution
                    （政策宪法 / 最高目的）
                           │
                           ▼
                    General Standards
                      （一般判断标准）
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
       Bright-line Rules             Exceptions
          （明线规则）                  （例外）
             │                           │
             └─────────────┬─────────────┘
                           ▼
                  Anti-Circumvention
                    （反规避原则）
                           │
                           ▼
                       Case Law
                       （判例法）
                           │
                           ▼
                      Procedure
                      （程序规则）
                           │
                           ▼
                    Rule Evolution
                    （规则持续演化）
```

这里的 **Policy Constitution（政策宪法）** 可以理解为：

> 整个审核体系中最高层、最稳定的价值和政策目的。

而整个系统可以被称为：

**Moderation Legal System（法律式审核系统）**

或者：

**Normative Operating System（规范运行系统）**

它们表达的都是同一个意思：

> 审核不再只是一份文本，而是一套可以持续产生、解释、执行和修正规范的制度。

---

### 6.1 最后的核心结论

法律真正给审核的启发，不是：

> “怎样把规则写得像法律条文一样复杂。”

而是：

> **不要试图用一份静态文本穷举整个开放世界。**

一套成熟的审核体系应该承认：

1. 有些情况可以被写成明确规则；
2. 有些情况只能用一般标准描述；
3. 规则必然存在开放边界；
4. 用户会主动寻找规则漏洞；
5. 新型 case 必须通过判例逐渐沉淀；
6. 模糊性不能只靠增加定义解决；
7. 对无法确定的情况，需要程序化处理；
8. 语义理解可以交给模型，但规范相关维度必须被约束；
9. 新的裁决必须能够反向更新整个体系。

因此，真正值得追求的并不是：

> **一份完美的审核手册。**

而是：

> **一套能够像法律一样处理“手册没有提前写出来的案件”的审核制度。**

---

## 参考资料

1. Louis Kaplow, *Rules Versus Standards: An Economic Analysis*  
   https://scholarship.law.duke.edu/dlj/vol42/iss3/2/

2. Stanford Encyclopedia of Philosophy, *Law and Language*  
   https://plato.stanford.edu/entries/law-language/

3. Cornell Legal Information Institute, *Bright-line rule*  
   https://www.law.cornell.edu/wex/bright-line_rule

4. Government of Canada, *Income Tax Act – General Anti-Avoidance Rule*  
   https://laws-lois.justice.gc.ca/eng/acts/i-3.3/page-218.html

5. UK Government, *General Anti-Abuse Rule*  
   https://www.gov.uk/government/publications/tax-avoidance-general-anti-abuse-rules

6. University of Chicago Law Review, *The Federal Rules of Platform Procedure*  
   https://lawreview.uchicago.edu/print-archive/federal-rules-platform-procedure

7. *Bending the Rules: On Large Language Models and Content Moderation*  
   Cambridge Core / Israel Law Review  
   https://www.cambridge.org/core/journals/israel-law-review/article/bending-the-rules-on-large-language-models-and-content-moderation/993480771D94FD1E2B12DD034C3DB11C
