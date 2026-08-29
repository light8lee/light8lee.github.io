---
layout: post
title: "从内容审核到认知型 Agent：理解、联想、假设与验证为什么必须被拆成不同能力"
date: 2026-08-24 12:00:00 +0800
summary: "真正的 Agent 智能不只在于会调用什么工具，更在于能提出哪些值得验证的解释。"
tags: [Daydreams, 认知型 Agent, 内容理解, 假设生成, Agent 设计]
series: daydreams
daydream: true
thought_axis: 法
permalink: /daydreams/cognitive-agent-understanding-hypothesis-verification/
cover: /assets/daydreams/cognitive-agent-understanding-hypothesis-verification/images/01-content-review.png
body_class: daydream-post
---

> 本文以复杂内容审核为观察入口，讨论当前 Agent 架构中“理解—联想—假设—验证”之间尚未被充分区分的认知层次，并结合两篇 2026 年论文的实验结果，提出一个以知识激活与假设验证闭环为核心的认知型 Agent 框架。

内容审核是一个非常适合观察“大模型是否真正具备内容理解能力”的典型场景。

因为表面上，审核似乎只是一个分类问题：

> 一段内容到底违规还是不违规？

但真正复杂的审核从来不是这样工作的。

一条内容可能字面完全正常，却因为前文、用户历史、图片中的文字、某个现实事件或者某种隐喻而获得完全不同的意义。

例如一句：

> “今晚还是老地方，懂的都懂。”

孤立来看，它几乎没有风险信息。

但如果此前的对话一直围绕某种违规交易展开，并且“老地方”已经在历史内容中被建立成一个交付地点，那么同一句话的含义就完全不同。

又例如一句：

> “终于可以送他上路了。”

它可能是在讨论游戏 Boss、电影剧情、宠物安乐死，也可能是真实世界中的威胁。

对于审核系统来说，真正困难的不是“认识‘送他上路’这几个字”，而是：

> **在当前上下文中，我应该想到哪些可能解释？**

进一步：

> **为了区分这些解释，我还应该去获取哪些证据？**

这也暴露出当前主流 Agent 讨论中的一个结构性缺口。

今天我们大量研究 Agent 能不能搜索、调用数据库、运行代码、查询用户历史、调用 OCR、访问规则库。但从认知链条来看，工具调用更接近整个过程的后半段。真正决定工具是否会被正确调用的，是更前面的问题：

> **模型有没有意识到这里可能存在一个值得验证的隐藏解释？**

因此，更合理的做法是将 Agent 能力拆分为几个不同层次：

**Context → Understanding → Association → Hypothesis → Action → Evidence → Context Update**

其中最容易被今天的 Agent 架构忽略的，恰恰是中间的：

> **Association，也就是联想与知识激活。**

<figure>
  <img src="{{ '/assets/daydreams/cognitive-agent-understanding-hypothesis-verification/images/01-content-review.png' | relative_url }}" alt="内容审核中的“检查—判断—验证”" loading="lazy">
</figure>

---

## 一、很多内容理解失败，并不是“模型不知道”，而是“模型没想到”

这两种失败看起来很相似，但实际上完全不同。

比如一条帖子写：

> “有没有人知道什么绳子比较结实？”

系统本身可能已经知道：

- 绳子有哪些用途；
- 自伤相关规则是什么；
- 用户此前有没有表达绝望；
- 哪些模式构成高风险行为。

这些知识都可能已经存在。

但真正决定审核结果的是：

> 模型看到“绳子”的时候，有没有联想到需要检查前文的自伤信号？

如果没有，那么无论历史检索工具多么先进，它都不会被调用。

类似的问题在多模态审核里更加明显。一张图片本身可能看不出风险，但图片中的小字是核心信息。系统拥有 OCR，问题却是：

> 它有没有想到需要 OCR？

由此可以将内容理解至少区分为三种不同能力。

第一种是：

**“我看到了什么。”**

也就是语义理解。

第二种是：

**“这还可能意味着什么。”**

也就是联想和解释空间生成。

第三种才是：

**“我应该怎么验证。”**

也就是 Agent 和工具调用。

如果第二层缺失，那么第三层能力再强也没有意义。

---

## 二、我真正关心的问题，其实是 Tool Call 之前发生了什么

假设一个高级审核 Agent 拥有如下能力：

- 查询完整对话历史；
- 查询用户历史内容；
- 搜索互联网；
- 查最新新闻；
- 调用 OCR；
- 图像理解；
- 查询规则知识库；
- 获取账号行为信号；
- 调用代码分析工具。

从传统 Agent 视角来看，它已经非常强了。

但当它看到一句：

> “你明天最好别来学校。”

它依然需要先回答：

- 这是现实威胁吗？
- 是玩笑吗？
- 学校明天是否本来就停课？
- 前文是否存在冲突？
- 是否针对具体的人？
- 是否已经提到攻击方式？
- 是否有地点、时间、准备行为？

这些问题不是工具产生的。它们是**工具调用之前生成的假设空间**。

只有先想到：

> “这可能是现实威胁。”

系统才会进一步想到：

> “我应该检查此前是否针对这个人有连续敌意表达。”

于是才产生：

> “调用历史内容检索。”

因此，可以进一步提出：

> **Agent 真正的上限，不只是它拥有多少 Action，而是它能生成多少值得被验证的 Hypothesis。**

两篇发表于 2026 年的论文为这一问题提供了较为直接的实验支撑。它们虽然一个研究历史工程创新，一个研究 AI 科学发现，却分别从两个方向，为这个问题提供了非常直接的实验支持。

---

# 三、第一篇论文：知识已经在 Context 里，为什么模型还是想不到答案？

第一篇论文是 2026 年发表在 *Nature Communications* 的：

**Human analogical guidance amplifies LLM performance through cross-domain knowledge activation**。

这篇论文最值得关注的，并不是“一个好的 Prompt 可以让模型性能提高十倍”这一表层结论。

真正重要的是，它非常精确地把：

**知识是否存在**

和

**知识是否被模型激活**

这两个变量分开了。

论文选择了一个很巧妙的历史反事实问题：

> 如果把一个现代 LLM 放回 1935 年，只允许它看到 1935 年以前已经存在的知识，它能不能自己推导出后来在 1942 年取得突破的流化催化裂化，也就是 FCC？

FCC 是石油炼化历史上的关键技术。

在早期 Houdry 固定床催化裂化系统中，存在几个明显问题：

- 反应与催化剂再生需要周期切换；
- 单次 cracking / regeneration 循环大约 10–15 分钟；
- 固定床内部可能存在约 ±50–100°F 的温度梯度；
- 规模有限，大致只有 1,000–5,000 barrels/day，而工业需求已经向 10,000+ barrels/day 发展。

后来真正形成突破的核心思想，是：

> 不再把催化剂固定在一个床层中，而是让细小催化剂颗粒悬浮在高速气流中，并在反应器和再生器之间连续循环。

但研究者最关心的问题并不是模型“知不知道 FCC”，因为现代 LLM 的预训练数据里很可能已经见过 FCC。

所以他们做了一个非常关键的实验控制：

> **只允许模型通过一个严格限制在 1936 年以前资料的 RAG 系统获得外部知识。**

---

## 四、这个实验最关键的地方：不同组拿到的是同一批检索结果

实验使用的是 **Qwen-2.5-7B-Instruct**。

模型有 28 层 Transformer，每层 hidden state 维度为 3584。

研究人员构建了约 **60 万词**的 1936 年以前技术语料，并故意将知识分散在三个领域中：

- 约 20 万词石油工程资料，包括 Houdry 工艺、固定床设计、炼油操作；
- 约 20 万词石油研究资料，包括裂化动力学、催化表面化学、热力学；
- 约 20 万词跨领域资料，包括煤气化中的颗粒流化、粉体输送、气力输送和粮仓颗粒运输等。

这些资料来自 1,261 件早于 1936 年 1 月 1 日提交的美国专利等历史文献，并最终被处理成 653 个文本 chunk。

这里有一个极其重要的设计：

> **所有实验条件使用相同的固定语义查询，从 RAG 中取相同的 top-10 chunks。**

也就是说，无论给不给类比提示，模型看到的证据没有变化。

研究者改变的不是：

> 模型知道了什么。

而是：

> 模型被提示去注意什么。

这也是该实验设计最有价值的地方。

因为它比较干净地把：

**Knowledge Access**

和

**Knowledge Activation**

拆开了。

---

## 五、没有类比引导时，模型很“聪明”，但始终困在局部搜索空间里

第一组实验非常简单。

研究人员告诉模型：

> 你是一名 1935 年的化学工程师。Houdry 工艺存在批次运行、温度梯度和规模不足等问题，请只使用截至 1935 年底已有的知识提出解决方案。

一共运行 **20 次**。

结果只有：

> **2/20，也就是 10%，产生了符合 FCC 核心思想的方案。**

95% 置信区间约为 1%–32%。

但剩下的 18 次失败并不是胡说八道。

恰恰相反，它们提出了很多非常合理的 1935 年工程优化：

- 12/18 提议采用多个固定床并联，通过自动阀门轮换 cracking、regeneration 和 purge；
- 10/18 改进热管理，例如熔盐浴、冷却夹套、分区空气注入；
- 8/18 使用螺旋输送机或者斗式提升机机械搬运催化剂；
- 15/18 提出热回收、仪表监控和流程强化。

这组结果特别有意思，因为它揭示了一个很典型的智能失败：

> **模型不是不会推理，而是一直在原有问题空间里推理。**

它看到的是：

> 固定床不够好。

所以它不断产生：

> 更好的固定床。

这一现象在内容审核中存在高度相似的对应。

一个模型如果首先把某段内容理解成“普通口角”，它可能非常擅长分析情绪强度、粗鲁程度、是否有人身攻击，但它可能根本没有进入：

> “这是不是一个现实威胁？”

这个假设空间。

一旦没有进入，后面所有 reasoning 都可能非常聪明，却仍然是在错误的局部空间里优化。

---

## 六、一句跨领域类比，把成功率从 10% 变成了 100%

接下来研究者并没有给模型新的资料。

只是额外提示它：

> 可以考虑粮仓是如何通过气流运输细小颗粒的。当气流速度超过颗粒沉降速度时，会出现什么物理状态？这个原理能否用于在反应区和再生区之间移动催化剂？

然后依旧运行 20 次。

这一次：

> **20/20 全部形成了 FCC-class 方案。**

也就是：

**10% → 100%。**

Fisher exact test 得到 p < 0.001。

如果只是看成功率，我们可能会说：

> “类比 Prompt 很有效。”

但真正关键的是作者进一步分析了模型到底使用了哪些知识。

没有类比提示时：

- heat management 概念使用率约 **90%**；
- Stokes’ Law 使用率 **0%**；
- particle suspension 使用率 **0%**。

加入类比提示之后：

- heat management 作为主要方向下降到约 **5%**；
- Stokes’ Law 使用率变成 **90%**；
- particle suspension 变成 **100%**；
- convective heat transfer 达到 **100%**。

要注意：

**这些跨领域知识之前已经在同样的 RAG Context 里。**

模型并不是因为类比 Prompt 才第一次获得 Stokes 定律。它之前已经拿到了，但没有使用。

所以这个实验真正证明的不是：

> “人教给了模型一个新知识。”

而是：

> **人提供了一个 association bridge，让模型重新组织了已有知识的激活模式。**

这与我对内容审核的理解几乎完全一致。

---

## 七、这篇论文对内容理解最重要的启示：Retrieval 并不能解决 Activation

在审核系统里，我们今天经常采用一种思路：

> 模型背景不足，那就给更多上下文。

于是做：

- Long Context；
- RAG；
- 规则召回；
- 用户历史召回；
- 多模态数据接入。

这些当然非常重要。

但这篇论文告诉我：

> **“信息已经进入 Context”并不意味着“信息已经进入 Reasoning”。**

在论文里，煤气化中的颗粒悬浮知识已经进入 Context，粮仓的气力运输知识也已经进入 Context，但模型没有建立：

> grain transport → suspended particles → catalyst circulation

这一条关联。

放到审核里就是：

- 用户历史已经存在，不代表模型会想到应该看历史；
- 图片 OCR 能力存在，不代表模型会想到图中文字可能决定风险；
- 最新新闻已经可搜索，不代表模型会想到当前文本是新闻影射；
- 规则已经召回，不代表模型会把当前隐语和某条规则联系起来。

因此，内容理解系统需要显式解决的，不只是：

> **Knowledge Retrieval**

而是：

> **Knowledge Activation。**

<figure>
  <img src="{{ '/assets/daydreams/cognitive-agent-understanding-hypothesis-verification/images/02-association.png' | relative_url }}" alt="理解与联想：把分散线索连接成候选解释" loading="lazy">
</figure>

---

## 八、论文更深的一层实验：就算知识和提示都存在，内部表示被破坏后，模型仍然无法完成联想

这篇论文后半部分做了一个非常有意思的 representation engineering 实验。

研究人员首先收集：

- 6 个 FCC-positive 表述；
- 6 个 FCC-negative 表述。

然后在模型不同层提取 activation，形成一个：

> FCC representation direction。

具体来说，在 Layer L：

**v = μ_positive − μ_negative**

生成时再从 hidden state 中减去：

**h' = h − αv**

也就是说，他们并没有删除 RAG 里的文献，而是试图在模型内部压制与 FCC / fluidization 相关的语义表示。

他们重点测试了 Layer 18，因为这是 28 层模型的中间区域，并将 steering strength 设置为：

**α = 0、2.0、4.5、7.0、9.0。**

实验共有 **100 次**，每一个 α 跑 20 次，而且所有实验都保留刚才那个非常有效的粮仓类比提示。

结果出现了一个非常明显的 cliff：

- α = 0：20/20，**100% 成功**；
- α = 2.0：16/20，**80% 成功**；
- α = 4.5：0/20，**0%**；
- α = 7：0%；
- α = 9：0%。

与此同时：

- Stokes’ Law 的使用从 α=0 时的 18/20，直接下降到 α=4.5 时的 0/20；
- particle suspension 和 convective heat transfer 也都降到 0。

最关键的是：

**RAG Context 没有改变。**

类比提示也没有改变。

也就是说：

> Knowledge 在。

> Guidance 也在。

> 但是内部 semantic representation 被干扰以后，mapping 仍然失败。

---

## 九、这部分实验给我的理论增加了一个限制条件：联想不是纯 Prompt 技巧

论文随后又做了 **80 次实验**。

固定 Layer 18，α=4.5，然后分别使用四种不同提示：

- 明确的粮仓跨领域类比；
- 非特定类比的 detailed chain-of-thought；
- generic CoT；
- minimal prompt。

每种跑 20 次。

结果：

> **0/80，全部失败。**

其中甚至包括一个非常强的五步模板，大致要求模型：

> 粮仓气力运输 → 计算 terminal velocity → 应用到催化剂 → 设计循环 → 处理热平衡。

仍然是 0/20。

作者因此认为：

> 类比指导并不是凭空创造能力，它必须建立在模型内部已经存在且可访问的语义表示之上。

这一结果尤其重要。

因为它意味着 Association Layer 不能被简单理解为：

> “再加一个 prompting agent。”

真正有效的联想至少需要三个条件：

**Knowledge Access**

+

**Association Guidance**

+

**Intact Representation**

论文自己把这三者概括得很清楚：

- RAG alone：约 10%；
- guidance + representation 被破坏：0%；
- RAG + guidance + intact representation：100%。

当然，这里需要保留一个技术上的谨慎。

在 α≥4.5 时，论文也观察到输出整体开始明显退化，甚至出现语法碎片；α≤2 时 40/40 都是连贯技术文本，而 α≥4.5 时 60 次输出都出现严重 validity 问题。

因此，不宜将这一实验解读为：

> “Layer 18 就是人类意义上的联想模块。”

更合理的解释是：

> **论文提供了因果证据，说明知识访问和 Prompt 都不足以保证跨域整合，模型内部的语义表示状态本身也是必要条件。**

但它已经足以支持一个更稳健的判断：

> **联想不是 Retrieval，也不是 Tool Use，它是一个真实存在的中间计算过程。**

---

# 十、如果第一篇论文解决的是“怎么想到”，那么 Co-Scientist 解决的是“想到以后怎么办”

这就进入第二篇论文。

Google 在 2026 年发表于 *Nature* 的：

**Accelerating scientific discovery with Co-Scientist**。

如果说第一篇论文回答的是：

> 为什么一个模型拥有知识却不一定产生正确联想；

那么 Co-Scientist 回答的是：

> **一旦系统能够形成很多候选假设，怎样把这些假设变成一个 Agentic Verification Process。**

因此，Co-Scientist 不应仅被理解为“多 Agent 科研助手”。

它真正有意思的地方，是把：

**假设空间生成**

和

**证据获取、竞争、淘汰**

连接了起来。

---

# 十一、Co-Scientist 不是一个更长的 Chain-of-Thought，而是一个 Hypothesis Search System

Co-Scientist 基于 Gemini 2.0 构建，但它最重要的创新并不是单纯使用更强的基础模型。

它将科学发现任务拆成多个功能不同的 Agent，并维护一个不断更新的共享 Context。

系统接受的是一个相对开放的科学问题，例如：

> 针对某种疾病，有没有此前没有被充分探索的新药物机制？

或者：

> 某个已知现象背后可能存在什么新的生物学机制？

传统模型通常会：

> 看完问题 → 推理 → 给出一个答案。

而 Co-Scientist 不这样做。

它首先试图建立的是：

> **一个 Hypothesis Population。**

也就是一群彼此竞争的候选假设。

这件事非常重要。

因为一个开放问题真正困难的地方，经常并不是：

> 怎样把已知答案推出来？

而是：

> **答案到底可能存在于哪些方向？**

这一结构与内容审核中的核心问题高度同构。

面对一句模糊内容，一个高级审核 Agent 不应该立即输出：

> 威胁概率 72%。

而应该先形成：

- H1：现实威胁；
- H2：游戏语境；
- H3：影视引用；
- H4：朋友玩笑；
- H5：影射近期现实事件。

然后再决定哪些候选值得继续调查。

Co-Scientist 正是在科学发现中把这种结构显式化了。

---

## 十二、Generation Agent：系统的第一项工作不是查证，而是把可能性空间做大

Co-Scientist 中的 Generation Agent 负责产生候选研究假设。

值得注意的是，它不是简单调用一次 LLM：

> “给我十个想法。”

它使用多种不同策略扩大 hypothesis space，例如：

- 搜索和阅读文献；
- 从已有知识中寻找尚未探索的组合；
- 模拟科学家之间的 debate；
- 将问题拆成多个可测试 assumption；
- 使用 analogy；
- 使用 out-of-box thinking；
- 从当前高质量候选周围生成邻近假设。

这和第一篇 analogical guidance 论文形成了一个很好的连接。

第一篇论文强调的是：

> **没有跨域 Activation，模型很可能一直在局部空间里优化。**

Co-Scientist 则进一步把这种思想系统化：

> 不能只产生一个答案，而应该主动维护一个多样化的候选空间。

因此，Generation Agent 更像是：

> **Association Layer 和 Hypothesis Layer 之间的桥梁。**

Association 的结果仍然可能只是模糊的：

> “这个现象好像和另一个机制有关。”

Generation Agent 需要进一步把它转成：

> “如果机制 X 成立，那么我们应该观察到 Y，因此可以通过实验 Z 来验证。”

到这里，一个“联想”才真正变成 Hypothesis。

---

## 十三、Reflection Agent：Agent 调用工具的原因不是“工具可用”，而是某个假设需要证据

Co-Scientist 的 Reflection Agent 不只是简单评价：

> “这个答案好不好？”

它会进一步检查：

- 这个假设逻辑上是否成立？
- 新颖性是真的吗？
- 是否已经有人发表过类似结果？
- 核心机制依赖哪些 assumption？
- 哪一个 assumption 最可能失败？
- 有什么证据可以 falsify 它？

当需要的时候，它会使用 Web Search 等工具查询文献。

这里最重要的结构不是：

> Agent → Search。

而是：

> **Hypothesis → Missing Evidence → Search。**

这两者看起来只差一步，但可以认为本质完全不同。

现在很多 Agent 架构是在问：

> 当前有十个工具，我下一步调用哪一个？

而我理想中的 Agent 应该先问：

> **什么证据会改变我对当前假设的判断？**

然后才问：

> 哪个工具能够得到这个证据？

这在内容审核中尤其重要。

例如：

> H1：这句话可能是真实世界中的针对性威胁。

那么真正有价值的问题是：

> 哪一条额外信息最能够改变 H1 的可信度？

可能是：

- 前文是否有具体冲突对象；
- 是否出现真实地点；
- 是否出现明确时间；
- 是否提及武器；
- 用户此前是否持续针对同一个人。

于是 Agent 才进一步调用：

> 对话历史搜索、用户历史查询或者实体识别工具。

也就是说：

> **Tool Call 应该是 Evidence Need 的结果，而不是智能过程的起点。**

---

## 十四、Ranking Agent：真正困难的不是产生很多想法，而是决定算力该花在哪些想法上

如果允许系统不断 Generation，很快会出现另一个问题：

> 假设越来越多。

一个系统可以产生 10 个、100 个甚至 1000 个可能性。

但现实中的算力、搜索成本、人工审核成本、实验成本永远有限。

所以 Co-Scientist 引入了一个非常有意思的 Ranking Agent。

它把不同 Hypothesis 放进类似 tournament 的竞争体系里。

每个新假设初始 Elo 为：

> **1200。**

然后让不同候选进行 pairwise comparison 或 scientific debate。

比较标准主要包括：

- correctness；
- novelty；
- testability。

胜出的假设 Elo 上升，失败的下降。

随着系统持续运行：

> 算力会越来越集中到那些经过多轮竞争仍然表现较好的候选上。

这一机制与高级内容审核中的资源分配问题高度相似。

因为审核系统也不可能对每一句内容把所有潜在解释全部调查一遍。

它需要判断：

> 哪一个 Hypothesis 的风险 × 不确定性 × 信息增益最高？

例如：

H1：

> 普通玩笑，概率 55%。

H2：

> 现实威胁，概率 20%，但后果非常严重。

H3：

> 游戏上下文，概率 25%。

这时候系统不能简单选择“概率最高的 H1”。

它可能应该优先验证 H2。

因为只需要一个很便宜的历史查询，就可能大幅改变风险判断。

因此，未来内容理解 Agent 所需的 Ranking 机制可能不仅是 probability ranking，更应考虑：

> **Expected Value of Information。**

也就是：

> 哪一个候选值得我继续花认知成本验证？

Co-Scientist 已经展示了这种结构的一个初步版本。

---

## 十五、Evolution Agent：好的 Hypothesis 不应该只被接受或拒绝，而应该被改写

Co-Scientist 中另一个值得重视的设计是 Evolution Agent。

传统系统很容易把一个 Hypothesis 当作二元状态：

> 对 / 错。

但现实中的复杂问题通常不是这样。

一个假设很可能：

> 核心方向是对的，但范围太宽。

或者：

> 机制是对的，但适用对象错误。

或者：

> 组合思路有价值，但具体成分不对。

Evolution Agent 会根据 Reflection 和 Ranking 的反馈继续修改候选，例如：

- 用文献补充弱点；
- 修改机制；
- 缩小适用范围；
- 组合两个优秀假设；
- 产生某个候选的变体；
- 使用 analogy 产生新的版本。

而且一个非常关键的设计是：

> **新版本不会直接覆盖旧 Hypothesis。**

它会作为新的候选重新进入 tournament。

这避免了：

> 一次错误优化，把目前最好的想法直接破坏掉。

这种结构在审核场景里也同样有价值。

例如最开始：

> H1：用户存在自伤风险。

进一步证据可能表明：

> 这并不是广义自伤风险，而更具体地是“近期可能存在行动准备”。

那么 Hypothesis 应该被 Evolution：

> H1 → H1.1。

如果后续又发现：

> 用户只是在引用小说。

H1.1 被否定。

这比从头进行一次新的内容分类要合理得多。

---

## 十六、Meta-review：Agent 不只应该更新当前答案，还应该更新“自己如何理解问题”

Co-Scientist 还有一个容易被忽略但可以认为很重要的模块：

> Meta-review Agent。

普通 Reflection 关注的是：

> 这个 Hypothesis 有什么问题？

Meta-review 更进一步：

> **过去几十轮 Review 中，我们反复出现了什么类型的问题？**

例如：

- 系统总是高估某种机制的新颖性；
- 总是忽略某类实验 feasibility；
- 某类 argument 反复被指出缺乏因果证据；
- 某种 reasoning pattern 容易导致 hallucination。

这些模式被总结成 meta-feedback，再反馈给后续 Agent。

而且不需要重新训练基础模型。

这对本文提出的理论框架具有直接意义。

因为 Evidence Integration 不应该只是：

> 把一个事实写回 Context。

更高一级还应该做到：

> **改变未来 Association 和 Hypothesis Generation 的策略。**

也就是说，一个真正成熟的 Agent 应该有两种更新：

第一种：

**World Update**

> 世界发生了什么？

第二种：

**Cognitive Update**

> 我过去是怎么想错的？

如果内容审核系统经常发现：

> 某种看似普通的 emoji 组合实际上频繁用于规避某类违规表达，

那么理想状态不是：

> 只把这些具体案例记下来。

而是更新：

> “看到类似符号组合时，应更容易激活规避表达这一 Hypothesis。”

这已经不只是 Memory。

而是：

> **Association Policy 的更新。**

---

## 十七、Co-Scientist 的 test-time compute 实验：更多算力可以用来搜索“想法空间”

Co-Scientist 做了一个非常值得强调的实验。

作者研究：

> 如果让系统拥有更多 test-time compute，结果会不会继续改善？

他们在大约 **203 个研究目标**上观察系统运行过程。

这些目标主要来自生物医学，同时也包括一些数学和物理问题。

研究者没有只看最终答案，而是把整个 Agent 运行过程按时间划成十个阶段：

- 最早 10%；
- 接下来 10%；
- ……
- 最后 10%。

然后观察每个阶段中：

- top-10 hypothesis 的平均 Elo；
- 当前最佳 hypothesis 的最高 Elo。

结果是：

> 随着系统持续运行，这两个指标总体持续上升。

而且在论文测试的计算范围中，没有明显看到快速饱和。

这一实验揭示了一个重要方向：

传统的 test-time compute 很容易被理解成：

> 同一个答案多想几步。

但 Co-Scientist 展示的是另外一种 compute allocation：

> **多生成一些候选。**

> **多做几轮竞争。**

> **再把优质候选进行 Evolution。**

> **再去查证。**

也就是说，不是简单：

> Search over Tokens。

而是：

> **Search over Hypotheses。**

这与前述观点一致。

下一代 Agent 的瓶颈，很可能并不只是：

> 能不能走更长的 Action trajectory。

而是：

> **能不能构建一个更好的 Search Space，并且持续在其中重新分配算力。**

---

## 十八、Co-Scientist 和 frontier model、人类专家的对比

论文进一步选取了 **15 个高难度开放生物医学问题**。

这些问题由 **7 位生物医学专家**设计。

专家不仅给出问题，还提供：

> 自己认为最有可能的 best-guess hypothesis。

之后，Co-Scientist 的候选与多个先进模型一起参与比较，包括：

- Gemini 2.0 Pro Experimental；
- Gemini 2.0 Flash Thinking；
- OpenAI o1；
- OpenAI o3-mini-high；
- DeepSeek R1；
- 人类专家初始 Hypothesis。

随着系统不断运行，Co-Scientist 的高排名候选逐渐获得更高 Elo。

这里不能简单解读为：

> AI 超过了科学家。

因为 Elo 本身仍然主要依赖模型评价，并不等于真实世界实验结果。

但这组实验仍然支持一个重要判断：

> **一个开放问题的一次性 best guess，可能不如一个能够持续产生、批判和进化候选的系统。**

更有价值的是后续人类盲评。

在其中 **11 个问题**上，专家从：

- novelty；
- potential impact；
- overall preference

等维度评价不同系统。

Co-Scientist 获得的平均结果包括：

- preference rank：约 **2.36**；
- novelty：约 **3.64 / 5**；
- impact：约 **3.09 / 5**。

总体表现优于多个对比系统。

这些结果表明：

> **Hypothesis Population + Competition + Evolution**

不是一个纯粹的工程复杂化。

它确实可能产生一次性回答难以获得的高价值方向。

---

## 十九、消融实验：Search 真正发挥作用，是因为它服务于 Falsification

Co-Scientist 的一些消融结果非常适合支持我的 Agent 理论。

例如，当 Reflection Agent 获得 Web Search 能力后，一个明显效果是：

> 减少那些听起来新颖、实际上缺乏 plausibility 的假设。

为什么 Search 有帮助？

不是因为：

> 搜索本身让模型更聪明。

而是因为：

> 已经存在一个明确 Hypothesis，Search 被用来寻找 supporting / contradicting evidence。

也就是：

> **Verification。**

Ranking Agent 加入 scientific debate 后，也会：

- 改善 Hypothesis 排名；
- 降低 positional bias。

Evolution 的迭代优化同样有量化收益。

例如论文报告：

> GPQA precision 从大约 **70.9% 提升到 75.4%**。

在一个构造的 hypothesis quality dataset 上：

> 平均质量评分从约 **4.7 提升到 5.6**。

Meta-review 对“判断一个 solution 是否正确”的 review AUC 也有提高：

> 构造数据集约 **0.521 → 0.597**；

> GPQA Diamond 约 **0.629 → 0.634**。

这些数字本身并不是特别夸张。

这些结果具有一个共同意义：

> **Co-Scientist 的能力不是来自某一个神奇 Agent。**

而是来自：

> 生成 → 批判 → 排名 → 验证 → 修改

形成的循环。

---

## 二十、真正让可以看到这个框架成立的，是它最终进入了 wet-lab 实验

如果 Co-Scientist 只停留在 LLM judge 层面，其论证力度会明显有限。

更关键的是作者最终选择了多个生物医学问题进行实验验证。

其中包括：

- drug repurposing；
- novel target discovery；
- antimicrobial resistance mechanism。

最容易说明问题的，是 AML，也就是急性髓系白血病的药物再利用实验。

系统面对的是一个很大的候选空间：

> 大约 2300 种已获批药物，以及跨 34 类癌症相关机制的搜索空间。

任务要求它寻找：

> **此前没有被明确用于 AML repurposing，并且缺乏既有 preclinical evidence 的候选。**

这里其实特别像复杂审核中的 long-tail risk。

答案不在常见模式里。

系统需要先：

> 产生一个别人还没有明确验证过的 Hypothesis。

最后专家选择了三个系统提出的候选进行实验：

- nanvuranlat；
- KIRA6；
- leflunomide。

其中 KIRA6 的实验特别有意思。

在一个 AML 细胞系 KG-1a 中：

> IC50 约 **10 nM**。

在非恶性的正常淋巴母细胞 TK6 中：

> IC50 约 **180 nM**。

也就是大约：

> **18 倍的选择性差异。**

但更值得注意的是：

KIRA6 并不是对所有 AML cell line 都同样有效。

例如：

- NOMO-1：约 144 nM；
- HL-60：约 870 nM；
- MOLM-13：约 1750 nM。

这一结果反而很好地体现了本文所讨论的认知过程。

如果系统只是：

> “预测 KIRA6 能治疗 AML。”

那么实验结果并不是简单的：

> 对 / 错。

更合理的更新是：

> **KIRA6 可能只对某些特定 AML subtype 或细胞状态特别有效。**

于是一个实验结果又生成新的问题：

> 为什么 KG-1a 特别敏感？

> 哪一种 molecular phenotype 决定这种敏感性？

> primitive / stem-like AML 是否更容易受到这一机制影响？

也就是说：

> **Evidence 并没有结束 Reasoning。**

Evidence 反而重新进入 Context，产生下一轮 Association 和 Hypothesis。

这正是我理论框架最后那个：

> **Context Update → Association**

的循环。

---

## 二十一、联合治疗实验更加直观地说明：现实中的 Hypothesis 很少是简单二元答案

Co-Scientist 还提出了多种 AML 联合治疗方案。

论文最后测试了 **7 组药物组合**。

例如在 MOLM-13 细胞中：

- JNJ-64619178 + selinexor；
- JQ1 + olaparib + MSA2

等组合表现出一定协同效应。

但是当同样组合放到 KG-1a 时：

> 结果并不完全一致。

有些仍然 synergy，另一些则可能表现为 antagonist。

这可能与 KG-1a 特定的 chemoresistant molecular profile 有关。

这一结果非常重要。

因为如果作者展示的是：

> AI 提出七组方案，七组全部正确。

那反而更像一个漂亮 Demo。

真正现实的结果应该就是这样：

> 某些 Hypothesis 部分成立。

> 某些只在特定 Context 成立。

> 某些证据直接否定原有解释。

于是系统被迫重新理解问题。

这与复杂内容审核极其相似。

一段表达可能：

> 在一般语境下无害。

但在某个人、某个时间点、某一段历史对话下风险很高。

因此，Content Understanding 最终处理的并不是：

> 一个脱离环境的 Label。

而是：

> **Hypothesis 是否在当前 Context 下成立。**

<figure>
  <img src="{{ '/assets/daydreams/cognitive-agent-understanding-hypothesis-verification/images/03-hypothesis-verification.png' | relative_url }}" alt="从假设到证据：验证不是终点，而是下一轮理解的起点" loading="lazy">
</figure>

---


## 二十二、案例三：从“某个药可能有效”进一步收敛到“什么患者更适合”——binimetinib 的临床语境推理

Co-Scientist 在 AML 任务中的一个容易被忽略、但对内容理解框架尤其有启发的例子，是 **binimetinib 的结构化转化分析**。

前面的 KIRA6 和联合治疗实验主要回答：

> 某个药物或药物组合是否可能在实验条件下有效？

但真实临床决策还需要回答一个更难的问题：

> **它对什么样的患者最有意义？**

为此，研究者没有让系统只继续寻找更多药物，而是要求 Co-Scientist 把候选放入一个更完整的临床 Context 中分析。输入变量包括：

- 患者人口学特征；
- ELN2022 风险分层；
- 分子特征；
- 前临床活性；
- 已知安全性；
- pharmacokinetics / pharmacodynamics；
- 与现有治疗方案之间潜在的药物相互作用。

在这一更丰富的 Context 下，系统提出了一个更具体的结论：

> **binimetinib 可能特别适用于体弱、接受过多线治疗的 AML 患者。**

关键理由并不是简单的“药效更强”，而是它的代谢机制。

Co-Scientist 注意到 binimetinib 主要通过 **UGT1A1** 相关途径代谢，因此可以在一定程度上避开 AML 临床中非常重要的一个现实约束：

> 唑类抗真菌药与很多靶向药之间严重的 **CYP3A4-dependent drug–drug interaction**。

对于需要长期接受抗真菌治疗、同时又已经接受过多线治疗的患者，这种差异可能直接改变药物的现实可用性。

这个例子的重要性在于，Hypothesis 发生了明显的层级变化。

第一层 Hypothesis 是：

> H1：binimetinib 可能对 AML 有治疗价值。

加入临床 Context 后，它进一步演化成：

> H1.1：binimetinib 的价值可能主要集中在某类高治疗负担、存在药物相互作用约束的患者群体。

这说明 Evidence Integration 并不是简单把 Hypothesis 的概率从 0.6 调成 0.8。

它还可以改变：

> **Hypothesis 本身的粒度和适用边界。**

这对内容审核同样非常重要。

一个初始假设可能是：

> “该表达可能构成威胁。”

随着上下文增加，更好的 Hypothesis 往往不是简单的：

> “威胁概率更高。”

而可能变成：

> “该表达只在针对现实中的特定对象、且结合此前持续冲突时构成高可信现实威胁。”

因此，一个成熟的内容理解 Agent 应该具备的不只是 Hypothesis Ranking，还应具备：

> **Hypothesis Refinement：不断重新定义假设究竟在哪些 Context 下成立。**

---

## 二十三、案例四：肝纤维化——系统如何从跨领域联系生成一个新的治疗靶点空间

Co-Scientist 的第二类 end-to-end validation 是**严重肝纤维化的新治疗靶点发现**。

这个案例与药物 repurposing 不完全相同。

AML 案例至少存在一个相对明确的候选空间：

> 已有药物中，哪些可能被重新用于 AML？

而肝纤维化任务更开放：

> **哪些尚未被充分重视的分子机制本身可能成为治疗靶点？**

研究团队使用了人源肝脏类器官和 live-cell imaging 作为实验验证平台。

Co-Scientist 被要求首先提出：

> 哪些 **epigenetic alterations / epigenetic modifiers** 可能对严重肝纤维化具有治疗意义？

系统产生并排名一批候选后，由专家选择其中 **3 个排名靠前的假设**进入后续验证，并继续让系统寻找能够作用于这些 predicted epigenetic modifiers 的药物。

最终：

> **三个候选表观遗传调控因子及其对应药物被提出，其中两个药物在人源肝脏类器官中表现出显著抗纤维化活性，并且没有观察到明显细胞毒性。**

其中尤其重要的一个候选是：

> **vorinostat。**

vorinostat 原本已经获得 FDA 批准用于癌症适应证，而 Co-Scientist 将其关联到了肝纤维化的表观遗传机制上。

这实际上出现了一次非常典型的跨领域 Association：

**cancer epigenetics**

↓

**epigenetic modifier**

↓

**fibrosis mechanism**

↓

**existing FDA-approved drug**

↓

**new liver-fibrosis hypothesis**

这一案例和 analogical guidance 论文之间有很强的呼应。

它的关键并不是系统“知道 vorinostat 是什么”。

相关药理知识本来就存在于文献中。

真正产生价值的是：

> **系统把一个原本处于癌症治疗知识区域中的药物，与肝纤维化中的一个候选表观遗传机制连接了起来。**

而且这种 Association 并没有直接被当成答案。

它进入了下一阶段：

> 候选靶点排名 → 专家筛选 → 药物映射 → 人源类器官实验 → 活性与毒性验证。

因此，这个案例几乎完整呈现了本文提出的认知链条：

**Context**

已有癌症、表观遗传学、肝纤维化和药理学知识。

↓

**Association**

某类癌症中的 epigenetic modifier 也许与纤维化过程相关。

↓

**Hypothesis**

抑制特定 epigenetic target 可能产生 anti-fibrotic effect。

↓

**Action**

寻找已有药物并设计类器官实验。

↓

**Evidence**

两个候选表现出显著抗纤维化活性且未出现明显细胞毒性。

↓

**Context Update**

一个原本属于癌症适应证的药物进入肝纤维化的候选治疗空间。

对内容理解系统而言，对应关系也很清楚。

真正有价值的系统不只是从“当前内容”附近召回相似案例。

它还应能够主动寻找：

> **结构相似但表面领域不同的风险模式。**

例如，一个新出现的规避表达并没有出现在现有违规词典里，但它的使用结构、交易流程或互动模式与历史上的另一类规避行为高度同构。

这时真正需要的不是 keyword matching，而是：

> **cross-domain / cross-pattern association。**

---

## 二十四、案例五：AMR——在几乎没有答案线索的情况下，重新提出一个尚未发表的机制

Co-Scientist 最有说服力的案例之一，是抗菌药物耐药性（AMR）相关的机制发现。

研究者选择了一个非常特殊的测试方式。

他们所在的实验团队其实已经独立发现了一个新的机制，但当时相关结果：

> **尚未正式发表，也尚未完成同行评审。**

这使它形成了一个接近“时间隔离”的测试场景：

> 如果只给 Co-Scientist 很少的背景信息，它能不能独立推导出实验团队已经发现、但模型几乎不可能通过公开论文直接读取的机制？

问题围绕一种称为：

> **capsid-forming phage-inducible chromosomal islands（cf-PICIs）**

的移动遗传元件展开。

这类元件可以携带毒力或抗生素耐药相关基因，并跨不同细菌传播，包括 *Escherichia coli* 和 *Klebsiella pneumoniae*。

核心谜题是：

> **为什么 cf-PICIs 能拥有如此广的宿主范围，并在不同细菌物种之间传播？**

研究者只提供了有限背景，然后让 Co-Scientist 产生机制解释。

系统最终排名最高的 Hypothesis 是：

> **cf-PICIs 可以与不同噬菌体的 tail structures 发生相互作用或“借用”多种 phage tails，从而扩大自身的宿主范围。**

这一假设的意义在于，它把几个分散的知识结构连接起来：

**mobile genetic element**

+

**phage-mediated packaging**

+

**tail-dependent host recognition**

↓

**multiple phage tails may broaden host range**

最终形成一个具体、可实验验证的机制解释。

更关键的是：

> **Co-Scientist 在约 2 天内形成的这一 top-ranked hypothesis，与独立实验团队当时尚未公开的主要发现高度一致。**

随后相关机制通过独立的 genomic 和 experimental study 得到验证并发表。

这个案例比“模型在 benchmark 上得分更高”更能说明 Hypothesis Generation 的价值。

因为这里的目标不是从候选答案中选择一个。

系统必须首先回答：

> **还有一种什么机制值得被提出？**

这正是 Search over Associations 和 Search over Hypotheses 的交界处。

如果放回内容审核，可以想象类似场景：

一种新的规避模式刚刚出现，规则库里没有名字，历史标签中没有现成分类。

系统只能观察到一些散落现象：

- 某些账号使用相似符号；
- 内容表面主题不同；
- 互动对象存在共同结构；
- 发布时序高度一致；
- 某种外部行为随后发生。

一个纯分类系统很可能只能说：

> “未匹配已有规则。”

一个真正具有 Associative Intelligence 的系统则应该有机会形成：

> **“这些看似不同的内容可能共享同一种新的规避机制。”**

然后进入下一步：

> 查询更多账号 → 寻找共现模式 → 验证传播路径 → 建立新风险 Hypothesis。

因此，AMR 案例所展示的不是简单的“AI 找到了答案”。

更准确地说，它展示的是：

> **当公开世界里缺少一个现成答案时，系统仍可能通过已有知识之间的结构连接，提出一个后来可以被现实实验验证的新机制。**

这正是认知型 Agent 相比传统知识检索系统最关键的潜在差异之一。

---

## 二十五、三个 Co-Scientist 实验案例实际上对应三种不同的 Hypothesis Update

如果把 AML、肝纤维化和 AMR 三个案例放在一起，它们展示的并不是同一种“成功”。

它们对应三种不同形式的认知更新。

### 1. AML / KIRA6：Hypothesis 被证据缩小适用范围

初始：

> KIRA6 可能对 AML 有效。

实验后：

> 它对 KG-1a 的活性显著高于其他多个 AML cell line，因此更可能与特定 subtype / cellular state 相关。

这是：

> **Hypothesis Specialization。**

### 2. 肝纤维化 / vorinostat：跨领域 Association 产生新的候选空间

初始：

> 哪些表观遗传机制可能参与纤维化？

系统将癌症领域中的药物与纤维化靶点建立连接，实验进一步验证其中候选。

这是：

> **Hypothesis Expansion through Association。**

### 3. AMR / cf-PICI：从已有知识结构中产生一个尚未公开的机制解释

系统没有一个现成的公开答案可以直接 Retrieval。

它必须组合：

> mobile element + phage biology + host recognition

形成：

> 多样 phage tails 扩大 host range。

这是：

> **Mechanistic Hypothesis Generation。**

这三种情况共同说明：

> Hypothesis 并不是一个静态的中间标签。

它更像一个可以被**生成、细化、分叉、合并、否定和重新定义**的动态对象。

因此，如果未来要构建面向内容理解的 Hypothesis-centric Agent，一个重要设计原则可能是：

> 不要只保存“当前最可能的解释”。

而应该保存一个具有结构的 Hypothesis State，例如：

- hypothesis 本身；
- supporting evidence；
- contradicting evidence；
- applicability conditions；
- unresolved assumptions；
- confidence；
- expected value of further evidence；
- derived sub-hypotheses。

这会让 Agent 的工具调用第一次拥有一个明确的认知对象：

> **工具不是在“帮助回答问题”，而是在改变 Hypothesis State。**

---

## 二十六、因此，Co-Scientist 最值得迁移到审核领域的，不是“多 Agent”这一形式，而是 Hypothesis-centric Agent 这一组织原则

如果只是复制它的结构：

> Generation Agent、Reflection Agent、Ranking Agent……

很容易变成形式主义。

真正值得迁移的是它背后的原则：

> **每一个工具调用都应该知道自己正在验证什么。**

例如审核系统看到：

> “明天终于可以解决他了。”

它可以先产生：

H1：游戏语境。

H2：现实世界暴力威胁。

H3：影视内容讨论。

随后 Reflection 对 H2 提出 Evidence Need：

- “他”是不是现实人物？
- 是否有过去冲突？
- 是否存在地点？
- 是否有时间？
- 是否出现攻击方式？

系统评估：

> 查过去 24 小时上下文的成本很低，但是对 H2 的信息增益很高。

因此：

> 调用历史检索。

结果显示前文在讨论：

> 明天打某个游戏 Boss。

那么：

> H2 Elo 大幅下降。

H1 上升。

但如果历史显示：

> 连续三天针对同一名同学表达敌意，并提到具体学校地址。

那么：

> H2 快速上升并触发更高等级验证。

这时候 Agent 不是：

> “看到关键词就调用一堆工具。”

而是在运行一个小型：

> **Hypothesis Tournament。**

这才是可以认为高级内容审核真正有意思的方向。

---

# 二十七、把两篇论文放在一起：先扩大 Search Space，再压缩 Search Space

现在再回来看这两篇论文，它们其实非常互补。

第一篇论文问的是：

> **正确知识已经存在，为什么模型没有想到正确方向？**

它给出的证据是：

只提供 RAG：

> 10%。

同样的 RAG，加一个跨领域 Association Bridge：

> 100%。

也就是说：

> **Access 不等于 Activation。**

而且当内部 semantic representation 被干扰之后，即使：

- 知识还在；
- 类比 Prompt 还在；

模型仍然无法完成跨域映射。

所以我把第一篇论文放在：

## Association / Activation Layer

Co-Scientist 研究的则是另一个问题：

> **当系统产生许多可能解释以后，怎么知道哪个是真的？**

它的答案是：

- Generation；
- Reflection；
- Search；
- Ranking；
- Evolution；
- Meta-review；
- Experimental validation。

所以我把它放在：

## Hypothesis / Agentic Verification Layer

两篇论文合起来，正好形成：

> **先扩大可能性空间，再压缩可能性空间。**

第一阶段：

**Association expands the search space。**

第二阶段：

**Evidence contracts the search space。**

这可以被视为复杂智能中一组重要的动力学关系。

---

# 二十八、回到审核场景，一个真正的内容理解 Agent 应该如何工作？

例如系统看到：

> “这次终于不会有人找到我了，东西都处理好了。”

传统分类模型可能直接输出：

> self-harm risk：0.62。

传统 Agent 系统可能进一步问：

> 是否调用历史搜索？

更合理的过程可以是：

### 第一步：Context

系统知道：

- 当前帖子；
- 前后对话；
- 用户最近内容；
- 图片；
- 行为变化；
- 规则。

### 第二步：Understanding

抽取：

- “没人找到我”；
- “东西处理好了”；
- 事件已经接近某种结束状态。

### 第三步：Association

生成可能相关解释：

- 普通搬家；
- 关闭社交媒体；
- 离职；
- 逃避某个人；
- 自伤前告别或财物处理。

这里就是第一篇论文所对应的问题：

> 系统能不能跳出最直接的语义邻域？

### 第四步：Hypothesis

形成可以验证的 Intent Unit：

> H1：用户可能存在临近自伤行为。

### 第五步：Evidence Need

如果 H1 成立，哪些信号最有信息增益？

- 此前是否持续表达绝望？
- 是否出现告别？
- 是否提到方式？
- 是否处理财物？
- 是否有明确时间？
- 是否反复出现“不再被找到”类似表达？

### 第六步：Agent Action

这时候才调用：

- 历史语义搜索；
- 多模态解析；
- 规则查询。

### 第七步：Evidence Update

假设历史搜索发现过去两小时连续出现：

> “谢谢大家以前陪我。”

> “账号也不用留了。”

那么 H1 的可信度上升。

但如果发现前文一直在讨论：

> 删除旧账号、搬去国外、处理二手家具，

那么 H1 下降。

这时候系统不是“分类一次”。

而是在：

> **进行一个小型的假设验证过程。**

---

# 二十五、因此，可以提出一个比“LLM + Tools”更完整的结构

复杂内容理解可以进一步拆分为六个层次。

## Layer 1：Context Model

回答：

> **我目前知道什么？**

它不只是当前 Prompt。

还包括长期上下文、用户历史、外部环境、规则和工具可以获得的信息。

## Layer 2：Understanding

回答：

> **表面上发生了什么？**

包括：

- 人；
- 事件；
- 关系；
- 时间；
- 对象；
- 意图表达；
- 情绪；
- 因果结构。

## Layer 3：Association / Activation

回答：

> **这还可能和什么有关？**

这里负责：

- 类比；
- 历史模式；
- 隐喻；
- 隐含风险；
- 跨模态关联；
- 外部事件关联；
- 长尾解释。

这正是第一篇论文最直接支持的层次。

## Layer 4：Hypothesis / Intent Unit

回答：

> **哪些可能性值得认真验证？**

例如：

> “这可能是现实威胁。”

> “这可能是规避审核的暗语。”

> “这可能是针对某个真实人物的骚扰。”

> “这可能是普通上下文中的无害表达。”

Intent Unit 可以被视为 Understanding 与 Agent 之间最关键的 interface。

## Layer 5：Agentic Verification

回答：

> **要改变我对这个 Hypothesis 的判断，还需要什么证据？**

于是调用：

- Search；
- History；
- OCR；
- Database；
- Rules；
- Code；
- Other Models。

这里对应 Co-Scientist 中 Reflection、Ranking、Evolution 等 Agent 的作用。

## Layer 6：Evidence Integration

回答：

> **新证据怎样改变我的世界模型？**

Evidence 不应该只用于最终回答。

它应该：

- 提高某些 hypothesis；
- 否定另一些；
- 产生新的 association；
- 触发下一轮验证。

于是又回到 Context。

<figure>
  <img src="{{ '/assets/daydreams/cognitive-agent-understanding-hypothesis-verification/images/04-framework.png' | relative_url }}" alt="统一理论框架：Context → Understanding → Association → Hypothesis → Verification" loading="lazy">
</figure>

---

# 三十、最终真正的循环应该是这样

整个框架可以进一步压缩为：

## Context<br>
↓<br>
## Understanding<br>
↓<br>
## Association<br>
↓<br>
## Hypothesis<br>
↓<br>
## Verification<br>
↓<br>
## Evidence<br>
↓<br>
## Context Update<br>
↺

这两篇论文分别为该框架提供了两个关键的实验锚点。

第一篇论文告诉我：

> **知识“在那里”，并不代表模型会“想到它”。**

因此必须研究：

**Activation。**

第二篇论文告诉我：

> **想到很多东西，也并不代表其中任何一个是真的。**

因此必须建立：

**Verification。**

换句话说：

> 第一篇论文研究的是如何扩大 Search Space。

> 第二篇论文研究的是如何在 Search Space 中持续竞争、验证和收敛。

---

# 三十一、这也促使 Agent 的定义需要被重新审视

当前很多系统更适合被称为：

> **Action Agent。**

它们擅长：

> 给定目标 → 找到动作 → 调用工具 → 完成任务。

再往上一层是：

> **Planning Agent。**

它知道怎么把一个明确目标拆解成多步。

但真正复杂的内容理解需要更高一级的能力：

> **Hypothesis Agent。**

它不是等待别人告诉它查什么。

而是主动提出：

> “也许真正的问题是这个。”

再往上一层才是：

> **Associative Agent。**

它能够意识到：

> “一个当前看似无关的信息，可能和另一个领域或者历史模式存在结构联系。”

最终才可能形成：

> **Contextual Cognitive Agent。**

它持续维护一个世界模型，不断：

**理解 → 联想 → 假设 → 验证 → 更新理解。**

---

# 三十二、为什么“内容理解”可能成为 Agent 时代的一层基础设施

现在大量 Agent 系统的基础设施是：

**Tool Registry。**

即：

> 系统有哪些工具？

但复杂内容理解系统还需要另一个 Registry：

> **Hypothesis Space / Association Space。**

因为工具只能回答：

> **我能做什么？**

而联想解决的是：

> **我为什么会想到要做这件事？**

如果一个系统有 100 个工具，但每次只能想到 3 类原因，那么另外 97 个工具实际上都处于认知不可达状态。

反过来，一个只有十个工具的系统，如果非常善于产生正确 Hypothesis，可能反而能解决更多真正复杂的问题。

所以工具数量决定的是：

> **Action Space。**

但 Association 决定的是：

> **哪些 Action 会第一次进入考虑范围。**

---

# 三十三、最终判断：Agent 的真正瓶颈，可能正在从 Action Search 转向 Search Space Generation

过去一代 Agent 主要优化：

> **Search over Actions。**

下一步可能需要更认真地研究：

> **Search over Hypotheses。**

再向上一层则是：

> **Search over Associations。**

因为一个系统如果只是在一棵已经给定的树上搜索得更深，本质上仍然受限于：

> 这棵树一开始有哪些分支。

真正高级的问题解决能力，更像是：

> 在搜索过程中不断发现——原来这里还可以长出另一根树枝。

第一篇论文的模型，一开始只能看到：

> 怎样改进固定床？

类比激活之后，它第一次看到：

> 为什么一定要有固定床？

这是 Search Space Generation。

Co-Scientist 则在之后做：

> 既然现在有十种假设，哪一种更值得验证？怎样把它改得更好？还缺什么证据？

这是 Search Space Optimization。

二者结合起来，才接近可以认为真正完整的认知过程。

---

# 三十四、如果将本文的理论框架最终压缩成三句话

可以这样概括：

> **理解决定我看到了什么。**

> **联想决定我还能想到什么。**

> **Agent 决定我能验证什么。**

第一篇论文支持了如下判断：

> **“想到什么”是一个真实、独立而且关键的能力层。**

Co-Scientist 则进一步表明：

> **只有当“想到的东西”被转化成 Hypothesis，再通过工具和证据不断验证，它才真正变成 Agent Intelligence。**

因此，一个真正成熟的内容理解系统不应该只是：

> **LLM + RAG + Tools。**

更完整的定义应当是：

> **Contextual World Model<br>
> + Associative Activation<br>
> + Hypothesis Generation<br>
> + Agentic Verification<br>
> + Evidence-driven Context Update**

审核只是这个问题最容易被观察到的场景之一。

在搜索、推荐、科研、商业分析、客服、代码 Debug 等大量复杂任务中，可以认为同样的结构都会成立。

因为最终真正高级的问题解决能力，从来不只是：

> “你告诉我应该查什么，我可以帮你查。”

而是：

> **“在你还不知道问题究竟在哪里的时候，我能够先意识到哪些可能性值得被验证。”**

这可能正是下一代认知型 Agent 与当前工具型 Agent 之间最本质的区别。

---

# 参考论文

1. **Human analogical guidance amplifies LLM performance through cross-domain knowledge activation**<br>
   *Nature Communications* (2026)<br>
   https://www.nature.com/articles/s41467-026-70873-7

2. **Accelerating scientific discovery with Co-Scientist**<br>
   *Nature* (2026)<br>
   https://www.nature.com/articles/s41586-026-10644-y


3. **Co-Scientist 真实世界案例补充材料**<br>
   Nature 正文中的 liver fibrosis、AMR 与 AML translational analysis 部分<br>
   https://www.nature.com/articles/s41586-026-10644-y
