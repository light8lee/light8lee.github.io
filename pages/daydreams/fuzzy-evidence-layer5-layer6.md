---
layout: post
title: "模糊证据下的判断：从粗糙集到主观逻辑的 Layer 5 / Layer 6 视角"
date: 2026-08-31 12:00:00 +0800
summary: "从模糊集、可能性理论到三支决策，梳理模糊证据如何服务于验证与证据整合。"
tags: [Daydreams, 内容审核, 不确定性, 证据整合, 三支决策]
series: daydreams
daydream: true
thought_axis: 术
permalink: /daydreams/fuzzy-evidence-layer5-layer6/
cover: /assets/daydreams/fuzzy-evidence-layer5-layer6/images/fig_roughset_threeway.png
body_class: daydream-post
---

> 本文聚焦一组更偏“术”的理论工具：**Fuzzy Sets（模糊集）**、**Possibility Theory（可能性理论）**、**Subjective Logic（主观逻辑）**、**Rough Sets（粗糙集）**，以及由粗糙集延伸出来的 **Three-Way Decisions（三支决策）**、**Decision-Theoretic Rough Sets（决策粗糙集，DTRS）**、**Sequential Three-Way Decisions（序贯三支决策）**。  
> 文章的目标不是进入过深的工程实现，而是澄清：这些理论各自解决什么问题、核心过程是什么，以及它们怎样分别作用于 **Layer 5 Verification** 与 **Layer 6 Evidence Integration**。

很多审核问题难，不是因为系统完全没有线索，而是因为线索不够硬、边界不够清楚、不同人对尺度的理解也不一样。于是同一句话既可能被看成真实威胁，也可能只是普通抱怨；既可能是医疗功效宣称，也可能只是夸张表达；既可能是规避审核的暗语，也可能只是无害上下文。Agent 在这种情况下遇到的困难，其实和人类审核员非常接近：它必须在不充分、不完美、甚至彼此冲突的证据中做判断。

因此，本文先总领说明 **Layer 5 Verification** 与 **Layer 6 Evidence Integration** 的目的和区别，再提出审核场景中“模糊证据、竞争假设、完美规避”的核心问题，随后依次详细介绍上述几类理论方法，最后再把这些方法重新映射回 Layer 5 与 Layer 6，说明它们如何组合成一个更自洽的判断框架。

## 1. 问题背景：为什么需要区分 Layer 5 和 Layer 6

### 1.1 Verification 与 Evidence Integration 的目标不同

在本文的语境里，**Layer 5 Verification（验证）**关注的是“信息缺口”。它问的是：

> 为了判断当前 Hypothesis（假设），我还需要获取什么信息？

如果当前存在几个候选解释，例如：

- H1：这是现实威胁；
- H2：这是普通抱怨；
- H3：这是规避审核的暗语；
- H4：这是无害表达；

那么 Layer 5 不应该直接重做一次分类，而是先看：当前为什么还分不清这些假设？到底缺上下文、缺历史、缺对象信息，还是缺事实核实？

与之相对，**Layer 6 Evidence Integration（证据整合）**关注的是“状态变化”。它问的是：

> 当新增证据到来以后，这个假设自身如何变化？它与其他竞争假设之间的关系又如何变化？

所以，两层最简洁的区别可以概括为：

- **Layer 5：What should I get?** —— 为了验证当前假设，我还需要获取什么？
- **Layer 6：What changed?** —— 新证据到来以后，假设空间发生了什么变化？

### 1.2 为什么审核问题总落在模糊边界上

很多审核 case 的难点并不在于“没有证据”，而在于“证据不足以直接定性”。例如：

> “你最好想清楚后果。”

这句话可以是现实威胁，也可以是情绪化警告；如果没有上下文、历史行为或对象关系，就很难一步到位判断。

再例如：

> “我可没说它能治病，只是用了以后药都不用了。”

它一方面显式否认“治病”，另一方面又隐含“治疗替代”意味。这里的问题不只是“文本复杂”，更是因为明示、暗示、反讽、经验陈述等多种语义在同一句话里交织。

### 1.3 “完美规避”为什么会出现

如果系统坚持“没有直接铁证就不处理”，那么擅长规避的人就可以把真实意图拆散到多个弱线索中：一句话只给一点暗示，历史行为再给一点模式，图像里再留一点符号，任何单条证据都不足以定性，但整体上已经构成明显风险。这就是本文所说的 **Perfect Evasion（完美规避）** 问题。

因此，只依赖硬证据是不够的；但如果反过来完全依赖模型的模糊直觉，又会失去可解释性。于是就需要一组能够处理中间地带的理论工具。



<figure>
  <img src="{{ '/assets/daydreams/fuzzy-evidence-layer5-layer6/images/fig_roughset_threeway.png' | relative_url }}" alt="粗糙集与三支决策信息图" loading="lazy">
</figure>

## 2. 方法引入：先理解原理论，再类比到审核

这一部分不急着把每个理论直接贴到 Layer 5 或 Layer 6，而是先回到它们原本试图解决的问题。这样做很重要，因为这些理论最初并不是为 LLM Agent 或内容审核提出的；真正有价值的不是照搬一个公式，而是理解它们分别把“不确定性”拆成了哪一种结构，然后再判断这种结构能不能迁移到审核场景。

### 2.1 Fuzzy Sets：原本处理“概念边界渐变”，审核里对应“语义程度”

**原理论在说什么。** Zadeh 在 1965 年提出 Fuzzy Sets（模糊集），核心出发点是：经典集合要求对象要么属于集合、要么不属于集合，但现实里很多概念并没有这种清晰边界。例如“高”“热”“年轻”都更像连续变化的程度。于是模糊集把普通集合的二值 membership：

$$
\mu_A(x)\in\{0,1\}
$$

扩展成：

$$
\mu_A(x)\in[0,1]
$$

其中 $\mu_A(x)$ 表示对象 $x$ 在多大程度上属于模糊概念 $A$。

这个数值描述的是**隶属程度**，不是事件概率。如果：

$$
\mu_{\text{high}}(x)=0.8
$$

它表达的是“这个对象在‘高’这个概念上很典型”，而不是“它有 80% 的概率是高的”。

模糊集还允许多个模糊属性组合。例如最经典的一类交运算可以写成：

$$
\mu_{A\cap B}(x)=\min(\mu_A(x),\mu_B(x))
$$

而并集可以写成：

$$
\mu_{A\cup B}(x)=\max(\mu_A(x),\mu_B(x))
$$

实际 fuzzy system 可以使用其他 t-norm / t-conorm，但核心仍然是：**概念边界可以有程度，而不是只能硬切。**

**类比到审核场景。** 审核中的很多语义天然也是渐变的，例如：

- 威胁有多直接；
- 暗示有多强；
- 反讽有多明显；
- 是否接近“医疗功效宣称”；
- 是否接近“诱导”；
- 攻击性有多高；
- “规避意味”有多明显。

例如：

> “我可没说它能治病，只是用了以后药都不用了。”

这句话可以同时表现为：

```text
明示医疗宣称       低
隐含治疗替代       高
否认式措辞         高
第一人称经验感     中到高
夸张性             中
```

这种拆法比一句 `medical_claim = true` 更贴近真实语义。特别是在规避场景中，用户往往会故意压低明示程度，却保留很强的语用暗示。Fuzzy Sets 的启发，就是让系统能够描述这种“明面上弱、隐含上强”的结构。

**对 Layer 5 / Layer 6 的启发。** 它更偏 **Layer 6**。Layer 5 获取一条新 evidence 后，Layer 6 可以先用 fuzzy feature 描述这条 evidence 的语义性质，再判断它如何影响 Hypothesis。例如 History 中新找到一句“我已经停药一个月了”，可能让“第一人称真实经历”“治疗替代”两个语义特征显著增强。

它也能间接帮助 Layer 5：如果当前 H1 与 H2 的区别正好取决于“反讽程度”或“隐含程度”，那么这些特征会暴露出新的可辨识缺口。但决定下一步该查什么，不是模糊集自己解决的。

**它还不能解决什么。** Fuzzy Sets 最大的局限，是它只告诉我们“像不像”，并不告诉我们“证据够不够”。因此：

$$
\mu_{\text{threat-like}}(x)=0.8
$$

绝不能直接改写成：

$$
P(\text{真实威胁意图}\mid x)=0.8
$$

更不能直接推导：

> 应该 Block。

它解决的是 semantic vagueness（语义模糊），不是 epistemic sufficiency（证据充分性）。

---

### 2.2 Possibility Theory：原本处理“不完备知识下的可能性”，审核里对应“多个解释同时保留”

**原理论在说什么。** Possibility Theory（可能性理论）源自 Zadeh 的 possibility 思想，并由 Dubois、Prade 等人系统发展。它特别适合知识不完整、但又不能合理给出精确概率的场景。

先定义一个 possibility distribution：

$$
\pi(\omega)\in[0,1]
$$

表示世界状态 $\omega$ 与现有知识的相容程度。对于事件 $A$，其可能性测度可以写成：

$$
\Pi(A)=\sup_{\omega\in A}\pi(\omega)
$$

而必要性测度：

$$
N(A)=1-\Pi(A^c)
$$

直观上：

- $\Pi(A)$ 高：A 仍然完全说得通；
- $N(A)$ 高：A 的反面已经越来越难说得通，因此 A 更接近“必要成立”。

Possibility measure 还有一个很有代表性的 maxitivity：

$$
\Pi(A\cup B)=\max(\Pi(A),\Pi(B))
$$

它说明多个解释可以同时保持高 possibility，而不需要像概率分布那样彼此瓜分总量。

**类比到审核场景。** 自然语言经常不是单标签问题。例如：

> “这么贵，不得给我直接治好了？”

至少可以保留：

- H1：治疗功效宣称；
- H2：反问 / 讽刺；
- H3：价格抱怨。

传统单标签分类很容易强迫系统选一个“主意图”；但实际上 H2 和 H3 可以同时成立，H1 也可能仍然不能排除。

此时更合理的状态可能是：

| Hypothesis | Possibility | Necessity |
|---|---:|---:|
| H1 治疗功效宣称 | 高 | 低 |
| H2 反问 / 讽刺 | 高 | 高 |
| H3 价格抱怨 | 高 | 高 |

这张表表达的重点不是“H1 概率是多少”，而是：

> H1 仍然是合法候选，但当前证据还不足以把它提升成必要解释。

**对 Layer 5 / Layer 6 的启发。** Possibility Theory 明显更偏 **Layer 6**。每当 Layer 5 带回新证据时，Layer 6 可以更新：

- 哪些 Hypothesis 仍然 possible；
- 哪些 necessity 上升；
- 哪些已经可以排除。

它特别适合表示竞争假设并不总是互斥的情况。例如“价格抱怨”和“反问”可以同时成立，不需要强迫一升一降。

**它还不能解决什么。** 它能够告诉系统：

> H1 还活着，H2 也还活着。

但并不直接告诉系统：

> 为什么 H1 还只是 possible？  
> 哪一条 evidence 能把 H1 和 H2 区分开？

也就是说，它擅长管理 hypothesis space，却不擅长主动 Evidence Planning。这正是 Rough Sets 和 Layer 5 Verification 要继续补上的地方。

---

### 2.3 Subjective Logic：原本处理“证据支持、反对和未知”，审核里对应“不能把没证据当成反证”

**原理论在说什么。** Subjective Logic（主观逻辑）由 Jøsang 系统发展，它的一个核心特点是：不强迫所有不确定性都被压入“相信”或“不相信”。

一个 binomial opinion 常表示为：

$$
\omega_X=(b_X,d_X,u_X,a_X)
$$

其中：

- $b_X$：belief，对命题 $X$ 的支持；
- $d_X$：disbelief，对 $X$ 的反对；
- $u_X$：uncertainty，目前尚未被证据解释掉的未知；
- $a_X$：base rate，在缺证据时使用的基础率。

并满足：

$$
b_X+d_X+u_X=1
$$

如果需要把 opinion 投影成一个 expectation，可以写成：

$$
E[X]=b_X+a_Xu_X
$$

但 Subjective Logic 最有价值的并不是把最后结果再压成 $E[X]$，而是**保留 $u_X$**。

**类比到审核场景。** 还是：

> “我可没说它能治病，只是用了以后药都不用了。”

对于：

> H1：用户在表达治疗替代效果。

当前证据可以拆成：

```text
支持：
“药都不用了”

反对：
“我可没说它能治病”

未知：
是不是反讽？
是不是引用别人？
前文是否有真实使用经历？
```

于是系统不必把支持和反对相减后只留下一个 0.55，而可以显式记录：

```text
belief       中
disbelief    低到中
uncertainty  高
```

这比 confidence 更有解释力，因为它把“我不知道”保留了下来。

**对 Layer 5 / Layer 6 的启发。** Subjective Logic 非常偏 **Layer 6**。Evidence Integration 的核心恰恰是：一条新 evidence 到来后，支持、反对和未知各自如何变化，而不是简单做 score addition。

它还能提醒我们处理来源可靠性：来自权威事实源的直接 evidence，与另一个模型基于同一段文本给出的判断，显然不应该具有完全相同的证据权重。Subjective Logic 中的 evidence fusion 思想，可以作为多源证据整合的理论参考。

**它还不能解决什么。** 即使系统得到：

```text
uncertainty = high
```

仍然不知道：

> 高 uncertainty 到底来自哪里？

是缺对象身份，缺历史上下文，缺现实事实，还是语义本身存在反讽？Subjective Logic 能告诉我们“还有多少未知”，却不直接告诉我们“缺什么”。这正是 Rough Sets 的可辨识性视角可以继续补上的地方。

---

### 2.4 Rough Sets：原本处理“属性不足导致不可辨识”，审核里对应“为什么当前证据还分不开”

**原理论在说什么。** Pawlak 的 Rough Sets（粗糙集）与前面几种理论最大的不同是：它不把不确定性首先看成“程度”或“信念不足”，而是看成**现有属性无法区分对象**。

设对象全集为 $U$，属性集合为 $B$。如果两个对象 $x,y$ 在所有 $a\in B$ 上具有相同属性值，则定义不可辨识关系：

$$
IND_B=\{(x,y)\in U^2\mid \forall a\in B,\;a(x)=a(y)\}
$$

由此形成等价类 $[x]_B$。

对于目标集合 $X$，下近似为：

$$
\underline{B}(X)
=
\{x\in U\mid [x]_B\subseteq X\}
$$

表示在当前知识下**可以确定属于 $X$** 的对象。

上近似为：

$$
\overline{B}(X)
=
\{x\in U\mid [x]_B\cap X\neq\varnothing\}
$$

表示**当前还不能排除属于 $X$** 的对象。

二者的差即 Boundary Region：

$$
BND_B(X)
=
\overline{B}(X)-\underline{B}(X)
$$

Boundary 的含义不是“置信度中等”，而是：

> 当前知识粒度下，无法把属于 $X$ 和不属于 $X$ 的对象完全区分。

**类比到审核场景。** 假设目标 Hypothesis 是：

> H1：明确医疗功效宣称。

当前系统只使用三个属性：

```text
是否提到产品
是否出现治疗词
是否出现效果词
```

那么：

```text
A：“这个吃了就能治好。”
B：“这个是不是能治好？”
C：“这东西效果这么神？”
D：“用了以后药都不用了。”
```

可能在上述属性上高度相似，但人工判断却可能分别是：

- 明确宣称；
- 提问；
- 反讽；
- 隐含治疗替代。

此时真正的问题不是“模型还不够自信”，而是：

> 当前属性集合根本不够。

可能缺的是：

- 言语行为；
- 反问结构；
- 第一人称经历；
- 上下文态度；
- 引用关系。

这就是 Rough Sets 给审核最大的启发：

> **Uncertainty = Insufficient Discernibility。**  
> 不确定，不只是“我没把握”，而是“当前信息不足以区分竞争解释”。

**Reduct 与 Core 的进一步启发。** Rough Sets 还提出 reduct（约简）和 core（核属性）的思想。Reduct 寻找在保持辨识能力前提下的最小属性子集；Core 则是所有 reduct 中都不可缺少的属性。

类比到 Verification，可以把问题改写成：

> 真正决定 H1 / H2 的最少 evidence 是什么？  
> 哪些 evidence 是核心证据？  
> 哪些只是冗余？

这使 Rough Sets 不只是“标出 Boundary”，还可以启发 Layer 5 做更有目的的信息获取。

**Variable Precision Rough Sets 的启发。** 经典 Rough Sets 通常要求严格包含关系，这对自然语言可能太硬。Ziarko 的 Variable Precision Rough Set Model（VPRS）允许一定比例的分类误差，相当于承认现实知识中存在噪声和例外。这对审核的启发是：我们不一定要求所有相似 case 都完全一致，而可以允许“绝大多数证据模式一致，但存在少量例外”，从而更贴近开放世界。

**对 Layer 5 / Layer 6 的启发。** Rough Sets 真正跨越两层。

在 **Layer 6**，新 evidence 整合后，系统重新判断某个 H 现在位于：

```text
CONFIRMED
OPEN
REFUTED
```

其中 OPEN 对应 Boundary。

在 **Layer 5**，这个 Boundary 又变成下一轮 Verification 的起点：

> H1 和 H2 为什么还分不开？  
> 到底缺哪一个属性？

这就是本文所说的 **Discernibility Gap（可辨识缺口）**。

**它还不能解决什么。** Rough Sets 会告诉我们“分不开”，甚至能启发“缺什么”，但它自身并不会自动回答：

> 下一条 evidence 是否值得获取？  
> 错误放行和错误拦截哪个更贵？  
> 什么时候应该停止搜证？

这些问题要交给 Three-Way Decisions、DTRS 和 Sequential 3WD。

---

### 2.5 Three-Way Decisions：原本把 Rough Sets 的三区域变成行动，审核里对应“确认 / 暂缓 / 排除”

**原理论在说什么。** Yao 的 Three-Way Decisions（3WD，三支决策）把 Rough Sets 的三个区域赋予了行动语义：

$$
POS\rightarrow Accept
$$

$$
BND\rightarrow Defer
$$

$$
NEG\rightarrow Reject
$$

这里最关键的是中间的 Defer。

Defer 不是“模型输出第三个类别”，而是：

> 当前证据不足以安全承诺，因此暂时 noncommitment。

**类比到审核场景。** 如果一个 case 当前处于：

```text
CONFIRMED
```

可以进入下一步认知承诺；

如果是：

```text
REFUTED
```

可以排除该 Hypothesis；

如果是：

```text
OPEN
```

系统不需要强迫自己立即选边，而可以：

- 获取上下文；
- 查历史；
- 核实事实；
- 升级人工；
- 等待更多 evidence。

这种设计比：

```text
high confidence
medium confidence
low confidence
```

更适合 Agent，因为它描述的是**应该做什么**，而不仅仅是“模型现在有多自信”。

**对 Layer 5 / Layer 6 的启发。** 3WD 更像 Layer 6 完成更新后的 routing interface：

```text
Layer 6:
  CONFIRMED → Commit / Policy
  REFUTED   → Reject hypothesis
  OPEN      → Layer 5
```

也就是说，Boundary 不再是一个死标签，而是下一轮 Verification 的入口。

**它还不能解决什么。** Three-Way Decisions 只告诉我们：

> OPEN 应该继续。

但并没有告诉系统：

> 下一步应该查 History、Search，还是 Database？  
> 值不值得继续查？

这就需要 DTRS、Sequential 3WD 和 VOI 继续补充。

---

### 2.6 DTRS：原本用损失函数决定三种行动，审核里对应“风险不同，OPEN 的处理也不同”

**原理论在说什么。** Decision-Theoretic Rough Sets（DTRS）把 Bayesian decision theory 与 Rough Sets 结合起来。它不只是看对象在哪个区域，还显式考虑三种行动在两种真实状态下的损失。

设真实状态为：

$$
\Omega=\{H,\neg H\}
$$

三种行动为：

$$
A=\{a_P,a_B,a_N\}
$$

对应：

- $a_P$：接受 / 确认；
- $a_B$：暂缓 / Boundary action；
- $a_N$：拒绝。

若当前：

$$
p=P(H\mid x)
$$

其中 $p$ 表示“在当前证据 $x$ 下，Hypothesis $H$ 成立”的条件概率，那么三种行动的条件风险可以写成：

$$
R(a_P\mid x)
=
\lambda_{PP}p+\lambda_{PN}(1-p)
$$

$$
R(a_B\mid x)
=
\lambda_{BP}p+\lambda_{BN}(1-p)
$$

$$
R(a_N\mid x)
=
\lambda_{NP}p+\lambda_{NN}(1-p)
$$

这里最容易让人困惑的是这些 $\lambda$。它们不是模型参数，也不是概率，而是 **loss（损失 / 代价）**：当系统采取某个行动、而真实世界处于某个状态时，我们认为这个组合有多“贵”。

两个下标分别表示：

- **第一个下标**：系统采取的行动，$P/B/N$ 分别表示 Confirm、Boundary / Defer、Reject；
- **第二个下标**：真实状态，$P$ 表示 $H$ 实际成立，$N$ 表示 $H$ 实际不成立。

因此六个 $\lambda$ 可以直接读成下面这张表：

| 损失项 | 含义 | 如果把 $H$ 理解成“违规假设成立” |
|---|---|---|
| $\lambda_{PP}$ | 选择 Confirm，且 $H$ 真的成立 | 正确确认违规的代价，通常很低 |
| $\lambda_{PN}$ | 选择 Confirm，但 $H$ 实际不成立 | **误确认 / 误伤**的代价 |
| $\lambda_{BP}$ | 选择 Defer，而 $H$ 真的成立 | 本来是违规，但先继续验证的延迟 / 审核成本 |
| $\lambda_{BN}$ | 选择 Defer，而 $H$ 实际不成立 | 本来正常，但仍继续验证造成的额外成本 |
| $\lambda_{NP}$ | 选择 Reject，但 $H$ 真的成立 | **错误排除 / 漏放**的代价 |
| $\lambda_{NN}$ | 选择 Reject，且 $H$ 实际不成立 | 正确排除违规假设的代价，通常很低 |

如果用一句话概括：

> **$\lambda_{ij}$ 表示：我做了动作 $i$，但真实世界其实处在状态 $j$ 时，要付出多大的代价。**

因此，上面的 expected risk（期望风险）其实只是“把两种可能的真实世界按当前概率加权平均”。

以 Confirm 为例：

$$
R(a_P\mid x)
=
\underbrace{\lambda_{PP}p}_{H\text{ 真的成立时的损失}}
+
\underbrace{\lambda_{PN}(1-p)}_{H\text{ 实际不成立时的损失}}
$$

如果 $p$ 很高，那么第一项权重大；如果 $p$ 很低，那么“误确认”的 $\lambda_{PN}$ 会越来越重要。

同理，对 Reject 来说：

$$
R(a_N\mid x)
=
\underbrace{\lambda_{NP}p}_{\text{H 其实成立却被排除：漏放}}
+
\underbrace{\lambda_{NN}(1-p)}_{\text{H 本来就不成立且被正确排除}}
$$

而 Defer 的风险：

$$
R(a_B\mid x)
=
\lambda_{BP}p+\lambda_{BN}(1-p)
$$

可以理解为：无论 $H$ 最终是真是假，只要选择继续验证，就会付出一定的时间、工具、人工或延迟成本，但这种成本通常低于一次严重误判。

经典 DTRS 往往会假设：

$$
\lambda_{PP}\le \lambda_{BP}<\lambda_{NP}
$$

以及：

$$
\lambda_{NN}\le \lambda_{BN}<\lambda_{PN}
$$

直觉非常简单：

- 如果 $H$ 真的成立，那么**正确确认**最好，**暂缓验证**次之，**错误排除**最坏；
- 如果 $H$ 实际不成立，那么**正确排除**最好，**暂缓验证**次之，**错误确认**最坏。

这也解释了为什么 DTRS 会自然出现一个中间的 Boundary / Defer 区域：当 $p$ 既没有高到足以承担误确认风险，也没有低到足以承担漏放风险时，继续验证反而是 expected risk 最低的选择。

系统最终选择 expected risk 最低的行动：

$$
a^*(x)
=
\arg\min_{a\in\{a_P,a_B,a_N\}} R(a\mid x)
$$

这里需要特别注意：本文把 $a_P,a_B,a_N$ 理解为 **认知层面的 Confirm / Defer / Reject Hypothesis**，而不是直接等同于业务上的 Block / Review / Allow。业务动作仍然应该由后续 Policy 层根据风险规则决定，这样可以避免把“证据状态”和“处置动作”混为一谈。

在经典条件下，比较三种 risk 可以进一步推导出两个阈值。Confirm 与 Defer 的分界点为：

$$
\alpha
=
\frac{\lambda_{PN}-\lambda_{BN}}
{(\lambda_{PN}-\lambda_{BN})+(\lambda_{BP}-\lambda_{PP})}
$$

Defer 与 Reject 的分界点为：

$$
\beta
=
\frac{\lambda_{BN}-\lambda_{NN}}
{(\lambda_{BN}-\lambda_{NN})+(\lambda_{NP}-\lambda_{BP})}
$$

于是：

$$
p\ge\alpha \Rightarrow Accept
$$

$$
\beta<p<\alpha \Rightarrow Defer
$$

$$
p\le\beta \Rightarrow Reject
$$

阈值来自 loss structure，而不是拍脑袋设成 0.7。

**类比到审核场景。** 同样一个 OPEN case，在不同风险场景下可能得到不同动作。

例如高危现实威胁：

```text
错误放行代价：极高
错误拦截代价：中
再查一次历史：低
```

则继续 Verification 很合理。

但低风险轻微内容可能是：

```text
错误放行代价：低
人工复核代价：高
```

那么继续验证未必值得。

因此一个非常重要的区分是：

$$
Evidence\ State\neq Decision\ Policy
$$

同一个 epistemic OPEN，并不意味着所有场景都必须做同一个动作。

**对 Layer 5 / Layer 6 的启发。** DTRS 更偏 **Layer 5 的验证策略**：读取 Layer 6 当前状态后，决定是否值得再进行一轮 Verification。

**它还不能解决什么。** 经典 DTRS 依赖概率和损失数值，而 LLM 输出的“0.73”未必是真正校准的概率，人工给“误杀=37、漏放=81”也可能是假精确。

因此审核里更值得借鉴的是它的结构：

> 错误后果不同，所以验证策略也不同。

可以先用 ordinal relation：

```text
漏放高危风险 ≫ 误伤风险 > 低成本验证
```

而不一定直接依赖精确数值。

---

### 2.7 Sequential Three-Way Decisions：原本处理“知识逐步增加”，审核里对应“验证不是一次完成”

**原理论在说什么。** Sequential Three-Way Decisions（序贯三支决策）把一次性的 3WD 扩展成随信息增加而不断更新的决策过程。

可以把不同阶段的知识粒度写成：

$$
G_1\prec G_2\prec\cdots\prec G_T
$$

随着新信息加入，理想情况下 Boundary 会逐步缩小：

$$
BND_{t+1}(H)\subseteq BND_t(H)
$$

虽然真实系统中并不保证每次都严格缩小——新 evidence 也可能带来冲突——但它表达了一个关键思想：

> 判断可以是阶段性的，不必第一轮就完成。

**类比到审核场景。**

```text
第 0 轮：只看当前文本
H1 = OPEN

第 1 轮：读取前文
H1 仍 OPEN，但 H2 被明显削弱

第 2 轮：核查对象身份
H1 = CONFIRMED
```

这比“一次性把所有上下文都塞给模型，然后输出最终标签”更接近 Agentic Verification。

Sequential 3WD 还天然涉及 acquisition cost，因为每增加一层信息都要付出时间、token、工具或人工成本。因此可以概念性地写成：

$$
TotalCost
=
DecisionLoss
+
\sum_t AcquisitionCost(e_t)
$$

当下一条 evidence 的预期收益已经小于获取成本时，就应该停止。

**对 Layer 5 / Layer 6 的启发。** Sequential 3WD 更偏 **Layer 5**，因为它给出“继续验证”的时序框架；但每一轮之间必须经过 Layer 6：

```text
Verification_t
→ Evidence_t
→ Integration_t
→ Updated Boundary
→ Verification_{t+1}
```

所以它实际上描述的是 Layer 5 与 Layer 6 如何形成迭代。

**它还不能解决什么。** 它告诉系统“可以逐步补证”，却仍然没有完全解决：

> 下一条 evidence 中，哪个最值得先查？

这个问题需要进一步借鉴 Value of Information 或其他 evidence selection 机制。

---

### 2.8 把这些理论放在一起看：它们处理的其实不是同一种“不确定”

如果把这些方法放在同一张概念地图中，会发现它们真正互补的原因，是它们面对的是不同层次的问题：

| 理论 | 原始问题 | 审核类比 | 更偏向 |
|---|---|---|---|
| Fuzzy Sets | 概念边界是否有程度 | 一句话“有多像”某种风险语义 | Layer 6 |
| Possibility Theory | 不完备知识下哪些世界仍可能 | 哪些解释还不能排除 | Layer 6 |
| Subjective Logic | 支持、反对、未知如何共存 | 有支持不等于没反证；没证据不等于反证 | Layer 6 |
| Rough Sets | 属性不足导致哪些对象不可辨识 | 为什么 H1 / H2 现在还分不开 | Layer 5 ↔ 6 |
| Three-Way Decisions | 不确定时如何行动 | Confirm / Defer / Reject | Layer 6 → 5 |
| DTRS | 不同行动错误代价不同 | 是否值得继续 Verify | Layer 5 |
| Sequential 3WD | 信息逐步增加时如何反复决策 | 多轮验证逐渐缩小 Boundary | Layer 5 ↔ 6 |

这也是为什么本文最终并不想选择“唯一正确的一套不确定性理论”。更合理的方式是：让每种理论只负责自己真正擅长的问题。

## 3. 方法怎样映射到 Layer 5 与 Layer 6

方法介绍完以后，再把它们放回 Layer 5 / Layer 6，会比一开始直接贴标签更清楚。这里最重要的不是“某理论属于哪一层”，而是它在整个判断闭环里解决哪一个子问题。

### 3.1 Layer 5：Verification 关心“当前缺什么，下一步补什么”

Layer 5 的出发点不是 raw input，而是一个已经存在的竞争假设空间。例如：

```text
H1：真实威胁
H2：情绪化抱怨
H3：规避审核暗语
```

以及 Layer 6 上一轮已经给出的状态：

```text
H1 = OPEN
H2 = OPEN
H3 = possible but weak
```

这时 Verification 首先可以借 Rough Sets 的思路问：

> H1 与 H2 到底在哪些属性上还不可辨识？

比如当前缺：

- 对象是否现实可定位；
- 是否有过去威胁行为；
- 是否存在行动能力；
- 这句话是否引用他人。

这一步就是从 Boundary 反推出 **Discernibility Gap**。

随后，DTRS 与 Sequential 3WD 提供第二层启发：不是每个 Gap 都值得补，也不一定需要一次查完。高风险、低成本的 evidence 可以优先；价值低、成本高的 evidence 可以停止。

因此 Layer 5 可以被抽象成：

> **Boundary Diagnosis → Missing Evidence → Verification Priority。**

这里仍然停留在“术”的层面，不必把它具体实现成某种 tool router。真正重要的是：Verification 的对象是**信息缺口**，不是简单地为当前最喜欢的 Hypothesis 搜索支持材料。

<figure>
  <img src="{{ '/assets/daydreams/fuzzy-evidence-layer5-layer6/images/fig_layer5_verification.png' | relative_url }}" alt="Layer 5 验证图鉴" loading="lazy">
</figure>

### 3.2 Layer 6：Evidence Integration 关心“新证据怎样改变假设自身和竞争关系”

Layer 6 接到新 evidence 后，至少要处理两种变化。

第一种是 **intra-hypothesis update（假设自身变化）**。例如新证据可能让 H1：

- support 上升；
- disbelief 上升；
- uncertainty 下降；
- necessity 上升；
- 从 OPEN 进入 CONFIRMED。

第二种是 **inter-hypothesis update（假设之间的相对变化）**。例如 H1 得到支持，并不一定意味着 H2 自动降低，因为二者可能同时成立；但如果 H1 与 H2 是互斥解释，那么新 evidence 就会明显改变它们之间的竞争关系。

这里几种理论分别提供不同视角：

- Fuzzy Sets：这条 evidence 在语义上有多强；
- Subjective Logic：它增加的是 support、disbelief 还是减少 uncertainty；
- Possibility Theory：哪些 Hypothesis 仍 possible，哪些 necessity 上升；
- Rough Sets：整合之后是否仍处在 Boundary。

因此 Layer 6 可以抽象成：

> **Evidence Interpretation → Hypothesis Update → Competition Update → Boundary Update。**

<figure>
  <img src="{{ '/assets/daydreams/fuzzy-evidence-layer5-layer6/images/fig_layer6_integration.png' | relative_url }}" alt="Layer 6 证据整合图" loading="lazy">
</figure>

### 3.3 一个完整审核类比：从“药都不用了”看两层如何协作

假设用户说：

> “我可没说它能治病，只是用了以后药都不用了。”

当前有：

```text
H1：真实治疗替代宣称
H2：夸张 / 反讽
H3：引用他人观点
```

初始 Layer 6 可能得到：

```text
H1：possible，OPEN
H2：possible，OPEN
H3：possible，但证据弱
```

Layer 5 读取这个 Boundary 后，不是再问“哪一个更像违规”，而是问：

> 哪条信息最能区分 H1 与 H2？

如果答案是“用户此前是否描述真实用药经历”，那么这就是当前的 Discernibility Gap。

一旦获得新 evidence：

> “我用了两个月，后来真的把原来的药停了。”

Layer 6 再处理：

- Fuzzy：第一人称实际经历高，治疗替代语义高；
- Subjective Logic：H1 belief 上升，uncertainty 下降；
- Possibility：H1 necessity 上升，H2 possibility 下降；
- Rough Sets：H1 可能从 Boundary 进入 Lower Approximation / CONFIRMED。

如果仍然 OPEN，就再次回到 Layer 5。

这个例子体现了整套框架真正的闭环：

> **Layer 5 不负责下结论，而负责缩小信息缺口；Layer 6 不负责主动搜证，而负责让新 evidence 真正改变 Hypothesis space。**

### 3.4 这些理论对审核真正的启发，不是“算出一个更复杂的分数”

如果最后只是把所有理论又压缩成：

```text
risk_score = 0.73
```

那么前面的理论区分几乎全部丢失了。

真正值得保留的，是不同类型的不确定性：

```text
semantic vagueness
epistemic uncertainty
hypothesis possibility
discernibility boundary
decision loss
```

这些状态各自意味着不同的下一步。

“语义模糊”未必需要补事实证据；  
“可辨识缺口”往往需要补信息；  
“高 uncertainty”不能等同于“低风险”；  
“OPEN”也不意味着业务上必须 Allow。

这才是这些理论被借到审核场景时最有价值的部分。

## 4. 这些方法如何互补，而不是互相替代

### 4.1 为什么不能只用一种理论

如果只用 Fuzzy Sets，系统会很擅长描述“有多像”，但不擅长解释“为什么现在还分不清”；  
如果只用 Possibility Theory，系统会很擅长保留多个可能解释，但不擅长说明“下一步该补什么证据”；  
如果只用 Subjective Logic，系统会很擅长表达支持、反对和未知，却不一定能识别结构性的可辨识缺口；  
如果只用 Rough Sets，系统会很清楚边界域在哪里，却不够细致地表达“支持有多强、未知还剩多少”。

所以，这几种理论之间更像是互补关系，而不是替代关系。

### 4.2 一个更自洽的搭配方式

如果从“术”的角度给出一个更自洽的组合，可以这样理解：

- **Fuzzy Sets**：解决语义程度问题；
- **Possibility Theory**：解决多假设并存问题；
- **Subjective Logic**：解决支持 / 反对 / 未知并存问题；
- **Rough Sets**：解决可辨识缺口与边界域问题；
- **Three-Way Decisions / DTRS / Sequential 3WD**：解决边界域如何触发中间动作，以及多轮验证如何合理展开的问题。

这样的组合方式不会强迫某一种理论包打天下，而是让每种方法负责自己最擅长的那一部分。

## 5. 总结：这篇文章真正想澄清什么

本文想强调的不是再造一个更复杂的“置信度系统”，而是澄清：面对模糊证据时，一个判断过程至少包含两种不同但相连的任务。

第一种任务是 **Verification**：当前为什么还无法判断？还缺什么信息？这更偏 Layer 5。  
第二种任务是 **Evidence Integration**：当新证据进入以后，它怎样改变假设自身以及假设之间的关系？这更偏 Layer 6。

围绕这两个任务，模糊集、可能性理论、主观逻辑、粗糙集以及三支决策等理论分别提供了不同的观察角度。它们之中没有哪一种能单独解决全部问题，但如果把它们放在合适的位置上，就能形成一个比“纯硬证据”或“纯模型直觉”都更自洽的中间框架。

也正因为如此，在审核与 Agent 的共同问题上，我们真正需要的不是一句“有没有证据”，而是更细致地问：

> 现在的问题是语义模糊，还是可辨识性不足？  
> 是假设太多，还是支持与反对同时存在？  
> 是该继续验证，还是已有证据已经足够改变假设关系？

只有把这些问题拆清楚，Layer 5 与 Layer 6 的分工才会真正清晰，而这些不确定性理论也才会真正变得“能用”。

## 参考文献

1. Zadeh, L. A. (1965). *Fuzzy Sets*. Information and Control, 8(3), 338–353.  
2. Pawlak, Z. (1982). *Rough Sets*. International Journal of Computer & Information Sciences, 11, 341–356.  
3. Ziarko, W. (1993). *Variable Precision Rough Set Model*. Journal of Computer and System Sciences, 46(1), 39–59.  
4. Yao, Y. (2010). *Three-Way Decisions with Probabilistic Rough Sets*. Information Sciences, 180(3), 341–353.  
5. Yao, Y. (2011). *The Superiority of Three-Way Decisions in Probabilistic Rough Set Models*. Information Sciences, 181(6), 1080–1096.  
6. Yao, Y., & Deng, X. (2011). *Sequential Three-Way Decisions with Probabilistic Rough Sets*.  
7. Jøsang, A. *Subjective Logic: A Formalism for Reasoning Under Uncertainty*.  
8. Dubois, D., & Prade, H. Works on *Possibility Theory*.  


