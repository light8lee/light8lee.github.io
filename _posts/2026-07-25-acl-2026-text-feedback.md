---
layout: post
title: "ACL 2026 反馈优化（一）：文字反馈究竟写回哪里？"
date: 2026-07-25 18:00:00 +0800
summary: "详解 MARS、Prompt-Level Distillation 与 ANN：三种方法都不更新基础模型权重，却分别把反馈写成经验指令、System Prompt 规则库与多 Agent 工作流。"
tags: [ACL 2026, Agent, Text Feedback, Prompt Optimization, Multi-Agent, MARS, PLD, ANN]
category: LLM Post-training
cover: /assets/posts/acl-2026-text-feedback/images/01.png
body_class: video-notes-post
series: feedback-optimization
---

# 文字反馈不是一种方法，而是三种完全不同的更新

冻结模型参数以后，Agent（智能体）仍然可以学习。但“学习”并不等于把一段批评原样塞回下一轮上下文，也不等于把文中提到的几个结论重新排列一次。真正决定系统行为的是：**反馈来自哪里，被归因到哪个层级，最终又写回哪个可执行对象。**

ACL 2026 的三篇工作给出了很有代表性的答案：

- **MARS（Metacognitive Agent with Reflective Self-improvement，元认知反思式自我改进智能体）**从一批有真值的失败样本中提炼经验，把它写成原则型或过程型增强指令；
- **Prompt-Level Distillation（PLD，提示词级蒸馏）**把教师的判断逻辑压缩成可审计规则，写入学生模型的 System Prompt（系统提示词）；
- **Agentic Neural Network（ANN，智能体神经网络）**根据完整执行轨迹生成全局与局部“文本梯度”，改写多 Agent 的角色、prompt（提示词）、节点、边和层间信息流。

三者都可以不改基础模型权重，也都使用自然语言作为更新介质，但学习单元并不相同。MARS 在修经验，PLD 在修规则，ANN 在修组织。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/01.png' | relative_url }}" alt="文字反馈可以更新经验指令、System Prompt 规则库或多 Agent 工作流" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / Thesis</p>

## 不改权重，改的是 Agent 的“外骨骼”

基础模型可以保持冻结，外部系统仍能通过配置资产持续变化。关键不是笼统地问“有没有从反馈学习”，而是追问：更新后的资产能否被执行、验证、版本化和回滚。
</div>
</section>

---

## 一张总表：先按更新对象分清三种方法

| 方法 | 反馈来源 | 最小学习单元 | 直接更新对象 | 生效时机 | 基础模型参数 |
|---|---|---|---|---|---|
| MARS | 有标准答案的失败样本与错误诊断 | 一个问题类别下的失败模式 | 原则型/过程型增强 prompt | 离线总结后用于下一批任务 | 不更新 |
| PLD | 教师推理、训练标签与学生失败 | 去实体化的 micro-rule（微规则） | 学生的 System Prompt 规则库 | 规则收敛后部署推理 | 不更新 |
| ANN | 多层执行轨迹与任务性能 | 一个层、角色、节点、边或聚合器 | 候选团队池与 Agent Graph（智能体工作流图） | 离线优化后冻结到新任务 | 不更新 |

这里最容易混淆的是“都输出文字”。文字只是载体：一条“除以负数时翻转不等号”可以是 MARS 从重复失败中总结的经验，也可以是 PLD 从教师推理中蒸馏的规则；但它们的来源、适用范围与更新流程不同。到了 ANN，文字反馈甚至可能不再变成一句规则，而是要求添加 verifier（核验器）、补充字段接口或重新连接两个角色。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/02.png' | relative_url }}" alt="部署失败、教师推理和多 Agent 轨迹分别进入不同的反馈入口" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / Boundary</p>

## 静态配置昂贵，反馈入口却不能混用

部署失败回答“系统反复错在哪里”，教师推理回答“专家依据什么规则判断”，多 Agent 轨迹回答“错误在协作链路的哪里产生”。把它们压成同一种反馈，会直接丢掉归因信息。
</div>
</section>

---

## MARS：先把四组概念放回各自的层级

论文：[Learn Like Humans: Use Meta-cognitive Reflection for Efficient Self-Improvement](https://aclanthology.org/2026.acl-long.1329/)（ACL 2026 Long Papers）

MARS 这一节最容易读乱，是因为论文同时使用了四组名字。它们不是四套并列方法，而是从“学习什么”到“怎样选 prompt”的四个不同层级：

| 层级 | 原文概念 | 它回答的问题 | 数量 |
|---|---|---|---|
| 元认知知识 | principle-based（原则型）/ procedural（程序型） | 从失败中学到哪一类知识？ | 2 类 |
| 生成流程 | Evaluation（评估）/ Failure Allocation（失败归组）/ Enhancement Generation（增强生成） | 怎样从失败样本得到可复用提示？ | 3 阶段 |
| 候选提示 | Concise（精简型）/ Reasoning（推理型）/ Concise+Reasoning（精简与推理组合型） | 最终注入哪种形态的增强文本？ | 3 种 |
| 选择策略 | Hybrid（混合选择策略） | 每个问题类别该使用上述哪一种候选？ | 1 个离线选择器 |

最简洁的对应关系是：**principle-based knowledge 主要被写成 Concise enhancement，procedural knowledge 主要被写成 Reasoning enhancement；Concise+Reasoning 同时放入两者；Hybrid 再从这三种成品提示中按类别选择一个。**

这是一种“主要对应”而不是严格互斥。论文附录中的 Concise 格式除了警告，也会带简短 action arrow（动作箭头）；Reasoning 则强调解题考虑和步骤。二者的差别是信息重心与详细程度，不是 Concise 绝不能出现动作、Reasoning 绝不能出现原则。

### 先解释范围：convergent learning task（收敛式学习任务）到底是什么

这里的 **convergent（收敛式）**不是“训练 loss（损失）已经收敛”，也不是说模型输出只能有一条固定字符串。它来自教育心理学中 convergent 与 divergent（发散式）的区分。MARS 给出的操作性定义是：

> 任务存在足够明确的 ground truth（标准答案或可验证真值），因而可以可靠判定一次回答是否失败，并能进一步诊断错误发生在哪里。

数学题可能有不同推导过程，但最后答案与关键逻辑可以核验；事实回忆、选择题、科学推理也有相对清楚的正确性边界。这些都属于论文所说的 convergent tasks。MARS 的六个基准——DROP、MGSM、MMLU、GPQA、OMNI-math、HLE——都满足这个条件。

与之相对，创意写作、开放设计、头脑风暴等 **divergent tasks（发散式任务）**往往有多个同样合理的结果。一个短篇小说“不够惊喜”究竟错在何处，不能像算错单位那样得到唯一错误标签。若要把 MARS 扩展到这类任务，论文认为需要 rubric-based feedback（基于评分标准的反馈）或 preference-based feedback（基于偏好的反馈），而不能直接沿用当前的错误分类与 ground-truth 诊断。

这个边界之所以重要，是因为 MARS 后面的每一步都依赖“失败可确认”：没有明确真值，就无法稳定收集失败集，也无法判断新 prompt 是否真的在验证集上变好。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/03.png' | relative_url }}" alt="MARS 的 Evaluation、Failure Allocation 与 Enhancement Generation 三阶段流程" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / Pipeline Overview</p>

## 先看 MARS 的完整处理链

1. **Evaluation（评估）**：analyzer（分析器模型）读取题目、标准答案、模型答案与推理轨迹，标注 Question Type（题型）、Topics（主题）、Error Type（错误类型）、Root Cause（根因）和 Specific Mistake（具体错误）。连续犯错时，以最早偏离点作为主要错误。
2. **Failure Allocation（失败归组）**：用 `Question Type × Topics` 分组，而不是只按错误类型分组；组内再聚合反复出现的错误与根因，形成 group-level error profile（组级错误画像）。
3. **Enhancement Generation（增强生成）**：把错误画像总结成常见陷阱、核验步骤和领域策略，按失败组大小加权后追加到 base prompt（基础提示词）。

流程生成 Concise（精简型）、Reasoning（推理型）和 Concise+Reasoning（组合型）三种候选。图中的 Hybrid Validation（混合验证选择）发生在三阶段之后，按问题类别挑选候选，而不是生成第四种提示。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/04.png' | relative_url }}" alt="同一类不等式错误被压缩为 principle 与 procedure" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / Conceptual Knowledge</p>

## Principle 与 Procedure 是“学到什么”

MARS 借用教育心理学中概念知识与程序知识的区分：

- **Principle-based reflection（原则型反思）**学习“什么不能做、哪些错误必须避免”，主要写成 Concise enhancement：短警告、do's and don'ts（该做与不该做的事项）和关键点。
- **Procedural reflection（程序型反思）**学习“应该按什么顺序思考、检查和求解”，主要写成 Reasoning enhancement：解题考虑、最小提示和步骤策略。

图中的不等式例子来自同一个失败簇。Principle 是“乘除负数时必须翻转不等号”；Procedure 是“识别运算 → 判断符号 → 必要时翻转 → 代回检查”。前者约束错误，后者指导执行。

二者并不严格互斥：Concise 也可能带短动作，Reasoning 也会体现原则。Concise+Reasoning（附录也称 Specific enhancement）则把 Common Mistakes（常见错误）、Verification Steps（核验步骤）和 Approach（解题方法）一起写入，信息最完整，但提示也最长。
</div>
</section>

### Hybrid：不是第四种提示，而是“按类别选一个”

简单拼接 Principle 与 Procedure 并不总是最好。长 prompt 可能产生重复约束，规则与步骤也可能争夺模型注意力。因此 MARS 额外设计了 **Hybrid selection（混合选择）**：

1. 每个数据集按 `train : validation : test = 8 : 1 : 1`（训练集∶验证集∶测试集）划分。
2. 训练集失败用于生成 Concise、Reasoning、Concise+Reasoning 三套候选。
3. 对验证集中每个问题类别，分别运行三套候选，选择准确率最高的一套。
4. 测试时，该类别的题只使用已经选中的那一套 prompt。

例如，验证后可能得到：代数方程选 Reasoning，事实回忆选 Concise，某类合同边界题选 Concise+Reasoning。**Hybrid 自己不生成第四段文字，也不是在一次推理里混合三个答案；它保存的是“类别 → 最佳增强类型”的路由表。**

论文为不同基准定义了不同类别粒度：DROP 使用 5 种离散推理类型，MGSM 使用 3 种数学题型 × 11 种语言，MMLU 使用 57 个学科，GPQA 使用 3 个科学领域，HLE 使用 8 个大类，OMNI-math 使用 33 个以上数学子领域。

选择需要在验证集上为三种候选各运行一次，因此增加约 `3 × 0.1N` 次离线推理；类别选定后，测试时仍然每题只跑一个 prompt，没有三路推理开销。

### 论文具体做了哪些实验

MARS 的实验证据不只是一个 MMLU 数字，可以分成五组来看。

#### 实验一：六个 convergent benchmarks（收敛式任务基准），覆盖两类能力

| 能力族 | 基准 | 主要考察 | 模型 | 指标 |
|---|---|---|---|---|
| Reasoning Capacity（推理能力） | DROP | 阅读理解中的加减、计数、排序、比较 | GPT-3.5-turbo | F1（F1 分数） |
| Reasoning Capacity | MGSM | 11 种语言的小学数学 | GPT-3.5-turbo | Accuracy（准确率） |
| Reasoning Capacity | OMNI-math | 33+ 子领域的竞赛数学 | GPT-4o | Accuracy |
| Knowledge Coverage（知识覆盖） | MMLU | 57 个学科的通识与专业知识 | GPT-3.5-turbo | Accuracy |
| Knowledge Coverage | GPQA | 研究生级生物、物理、化学问答 | GPT-3.5-turbo | Accuracy |
| Knowledge Coverage | HLE | 100+ 领域的专家级问题 | GPT-4o | Accuracy |

作者把 DROP、MGSM、OMNI-math 归为 reasoning capacity，把 MMLU、GPQA、HLE 归为 knowledge coverage。这个分组用于分析“提示增强更像是在修推理过程，还是在补常见知识误区”，不是说两组之间完全没有交叉。

#### 实验二：4 种基础 prompting（提示方式）× 4 种增强策略

在每个基准上，作者先放置四种基础推理方法：Zero-shot（零样本提示）、Zero-shot-CoT（零样本思维链）、Self-Refine（自我精炼）、Self-Consistency（自洽性采样）；再分别叠加 Concise、Reasoning、Concise+Reasoning、Hybrid。也就是说，实验要区分两件事：原本怎样生成答案，以及 MARS 生成的经验以哪种提示形态注入。

这四种基础方法具体改变的是**一道题怎样被回答**：

| 基础方法 | 单道题的执行过程 | 它主要增加了什么 |
|---|---|---|
| Zero-shot | 只给任务说明和当前题目，不提供 demonstration（示范样例），模型直接生成答案 | 最低推理开销；可作为“没有显式推理技巧”的基线 |
| Zero-shot-CoT | 在零样本提示后加入“Let's think step by step（让我们逐步思考）”，让模型先写一条显式推理链，再给最终答案 | 一条展开的 Chain-of-Thought（思维链），但没有批评或投票 |
| Self-Refine | 先生成初稿，再让模型批评初稿中的问题，根据反馈改写；把“回答—批评—修订”作为同一道题的迭代过程 | 对同一条答案进行纠错，不是采样许多答案投票 |
| Self-Consistency | 对同一道题独立采样多条推理路径，再对最终答案做多数投票；论文给出的模板使用 10 个样本 | 用多路径共识降低单条推理的偶然错误，但调用次数更高 |

MARS 不替代这四种方法。它先从训练失败中生成经验提示，再把 Concise、Reasoning、C+R 或 Hybrid 选出的增强内容，分别叠加到上述四种答题流程上。因此 `Self-Refine + Hybrid` 的含义是：先按类别选出最合适的 MARS 增强提示，再在该提示下执行“初答—批评—修订”；`Self-Consistency + Hybrid` 则是在选中的增强提示下采样多条推理路径并投票。

四个主基准上的代表结果如下：

| 基础方法 | 基准 | 无增强 | Concise | Reasoning | C+R | Hybrid |
|---|---:|---:|---:|---:|---:|---:|
| Zero-shot | DROP | 62.0 | 63.5 | 65.2 | 63.8 | **68.4** |
| Zero-shot-CoT | DROP | 74.5 | 77.2 | 78.8 | 78.1 | **81.6** |
| Self-Refine | MMLU | 48.8 | 60.5 | 59.0 | 63.9 | **64.6** |
| Self-Refine | GPQA | 36.4 | 38.2 | 40.9 | 32.7 | **49.1** |
| Self-Consistency | MGSM | 63.5 | 73.7 | 73.2 | 73.7 | **74.3** |
| Self-Consistency | MMLU | 61.8 | 69.3 | 71.3 | 71.7 | **72.5** |

这张表也说明为什么需要区分 C+R 与 Hybrid：在 Self-Refine + GPQA 上，机械拼接 C+R 反而从 36.4 降到 32.7，低于只用 Reasoning 的 40.9；Hybrid 通过类别级选择达到 49.1。**Hybrid 的优势来自选择，不来自提示更长。**

#### 实验三：更难的 OMNI-math 与 HLE

作者又用 GPT-4o 测试两个更困难的基准。在 OMNI-math 上，Self-Consistency + Hybrid 从 33.30 提升到 35.60；在 HLE 上，Self-Refine + Hybrid 从 4.60 提升到 7.10，Self-Consistency + Hybrid 从 3.00 提升到 6.00。

绝对准确率仍然很低，尤其是 HLE。这说明 MARS 可以让已有能力更稳定地发挥，却不能凭一条经验提示补出模型完全没有的专家知识。论文进一步观察到：知识类任务中，基线越弱时相对增益往往越大；推理类任务没有同样显著的难度相关性。

#### 实验四：与递归自改进方法比较，并核算成本

论文把结果与 MetaAgentSearch、Gödel Agent 做对照。Self-Consistency + Hybrid 在 DROP、MGSM、MMLU 上分别为 86.2、74.3、72.5，高于表中 Gödel Agent 的 80.9、64.2、70.9；GPQA 上则以 Self-Refine + Hybrid 达到 49.1。

成本分析估算，MARS 在四个主基准上包含一次 Hybrid 验证约需 3–5 美元；对比估算的 Gödel Agent 约 15 美元、Meta Agent Search 约 300 美元。这里比较的是论文特定 API（应用程序编程接口）价格与配置下的估算，不应当视作跨时代固定价格。MARS 便宜的主要原因是只做一轮固定流程，而不是进行 25 或 30 轮递归搜索。

#### 实验五：生成器与 analyzer 的稳健性

为确认提升不只依赖某个闭源 enhancement generator（增强内容生成器），作者用 Qwen2.5-72B-Instruct-Turbo 在 GPQA 和 OMNI-math 上重新生成增强，仍观察到相似改善模式，最优增强类型依旧随任务变化。

MARS 还依赖 analyzer 正确标注 Question Type、Topics 和 Error Type。两名标注者审计 reasoning（推理类）与 knowledge（知识类）各 100 个失败样本，驱动后续分组的三个字段 joint accuracy（联合准确率）均至少为 96%。在随机翻转 20% Error Type 标签的压力测试中，因为系统实际用 `Question Type × Topics` 分组，聚类结构不会被 Error Type 直接改写；Hybrid 在噪声条件下仍能相对 uniform-strategy baseline（统一策略基线）恢复一定增益。

### 证据最终支持什么

这些实验支持的是：在**有明确真值、能稳定诊断失败**的任务上，把失败按题型与主题聚合，再生成 Principle/Procedure 导向的 prompt，并用验证集按类别选择提示形态，可以在一次离线循环内改善多种基础 prompting 方法。

它们不支持三种更强的外推：不能说文字反馈普遍优于微调或数值奖励；不能说 MARS 已适用于创意任务；也不能把 Hybrid 描述成一个自动融合所有反思的通用推理器。若 ground truth、类别划分或 analyzer 诊断不可靠，MARS 仍可能把错误解释升级成长期提示。

---

## PLD：把教师推理编译成 System Prompt 规则库

论文：[Prompt-Level Distillation: A Non-Parametric Alternative to Model Fine-Tuning for Efficient Reasoning](https://aclanthology.org/2026.acl-industry.142/)（ACL 2026 Industry Track）

### 蒸馏对象不是答案，也不是完整 CoT（Chain-of-Thought，思维链）

传统知识蒸馏把教师能力压进学生权重；长链推理则在每次请求中重新支付推理 token（词元）与延迟。PLD 选择第三条路：从有标签样本上的教师推理中抽取**可执行、去实体化的 micro-rule**，再把合并后的规则直接写入学生 System Prompt。

因此，PLD 更像一次离线“规则编译”。部署时不需要检索器，也不需要再次调用教师，学生参数保持冻结。规则是显式文本，便于人工审计，但上下文长度、规则冲突和边界样本覆盖会成为新的工程瓶颈。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/05.png' | relative_url }}" alt="PLD 抽取 micro-rule、聚类合成、冲突消解后写入 System Prompt" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / PLD</p>

## 从 micro-rule 到完整 System Prompt

论文把流程写成四个 phase（阶段），前三个阶段构建和修正规则，第四个阶段才交给学生做部署推理。

1. **每个样本先产生一条 micro-rule**：教师读取样本和真值，把本题推理抽象成去实体化、可执行的规则；“认真分析上下文”这类空泛建议不合格。
2. **每个稠密簇合成一条 master instruction（主指令）**：micro-rule 经过 embedding（向量表示）和 DBSCAN 聚类；离群点被丢弃。Gemini 3 Pro 每次接收一个簇内的全部 micro-rule，输出 `topic + instruction`，其中 instruction 必须是一条保留关键条件和因果逻辑的统一规则。
3. **所有簇级指令组成完整指令集**：论文明确说部署时把 complete set of consolidated instructions（完整的簇级合成指令集）放进学生的 System Prompt，不使用外部检索。Contract-NLI 在选定参数下得到 17 个簇、约 4,630 token；StereoSet 得到 4 个簇。因此可以理解为“一簇一条主指令，再把所有主指令放进同一个提示词”。

### 指令顺序：论文没有给出排序算法

原文和附录没有说明 17 条簇级指令是按 topic、簇编号、频率还是标签排列，也没有定义“后出现的规则覆盖前面规则”之类的优先级。论文只公开了**簇内合成格式**，没有公开**簇间拼装顺序**。所以这里不能进一步声称它做了频率排序或依赖拓扑；顺序敏感性也没有被单独消融。

### 学生怎样把失败反馈给教师

1. 学生携带当前 consolidated instruction set（合成指令集）重跑训练数据，预测结果与 ground truth 比较。
2. 系统隔离“使用当前指令后仍然预测错误”的 failure samples（失败样本），同时从预测正确的样本中抽取 successful examples（成功样本）。
3. 失败样本与成功样本一起交给 Conflict Resolution Model（冲突消解模型，论文中仍使用教师侧的 Gemini 3 Pro）。教师分析失败根因并生成 updated instruction（更新后的指令）。成功样本是保护约束，防止修好少数失败时破坏原来正确的边界。
4. 更新后的规则集再次交给学生评估，循环持续到 validation error（验证集错误率）收敛。论文报告 StereoSet 第一轮收敛，Contract-NLI 第二轮收敛。

论文没有进一步交代失败样本如何精确映射回某一个 DBSCAN 簇，也没有给出“替换单条、追加新条或重排整组规则”的确定性算法。附录展示的是同一合同假设下整组 condition-label 规则从 before 版本被教师改写成更完整的 after 版本。因此能确认它是教师驱动的规则改写闭环，但不能把它描述成具有严格定位与补丁语义的规则编译器。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/06.png' | relative_url }}" alt="合同条款经过教师抽象为四条规则并进入冻结学生的 System Prompt" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / Example</p>

## 合同判断必须变成可执行顺序

以合同蕴含为例，一条规则可以要求：先判断例外条件是否触发，再判断一般义务是否成立，不能因为一般义务存在就忽略例外。它比保存某份合同的答案更一般，也比“注意例外”更可操作。

单条主指令内部可以规定：哪些片段构成义务、许可、禁止或例外，缺少触发条件时能否推出结论，以及输出标签怎样对应证据。但不同簇级指令之间的排列顺序和冲突优先级，论文没有明确规定。

可审计不只是 prompt 可见。每条规则还应能追溯到训练证据，并能在学生失败回放中被单独修改或撤销。
</div>
</section>

### 实验与边界

在 Gemma-3 4B 上，完整 PLD prompt 将 StereoSet Macro-F1（宏平均 F1）从 0.57 提升到 0.90，Contract-NLI 从 0.67 提升到 0.83，LogiQA accuracy 从 0.67 提升到 0.70。论文还展示了规则向其他学生架构迁移的结果，例如 Mistral Small 3.1 在 StereoSet 与 Contract-NLI 上分别达到 0.97 与 0.78。

但 PLD 的主要实验仍是推理密集型分类任务。对于需要动态中间计算的算术、搜索或符号证明，一套静态短规则未必能替代执行过程。任务规模继续增大时，规则库会面临三类问题：System Prompt 膨胀、规则间覆盖关系难以维护、模型可能选择性忽略长上下文中的规则。

---

## ANN：让文本反馈修改整个多 Agent 组织

论文：[Self-Evolving Multi-Agent Systems via Textual Backpropagation](https://aclanthology.org/2026.findings-acl.483/)（Findings of ACL 2026）

### 为什么只改一个 prompt 不够

ANN 不是预先规定“系统必须由哪几个 Agent 组成”。它优化的是一个**任务族的分层工作流模板**：层数预先固定，每一层表示一个子任务；每层维护若干候选 agent team（Agent 团队），运行时再选择其中一个。不同数据集会有不同角色，训练还可以增加或删除节点。

论文中三个容易混淆的对象是：

- **Layer（层）**：有先后顺序的子任务，例如代码审查、代码定稿、代码执行；上一层输出成为下一层输入。
- **Block / agent team（候选块 / Agent 团队）**：完成某一层子任务的一套候选结构，由 nodes、edges、prompts 组成。
- **Node / agent（节点 / Agent）**：Block 内一个具体 LLM 调用，包含角色 prompt、输入变量、输出格式和变量来源。多个节点可以使用同一个 `default_llm`，差别主要来自角色、prompt 与连接方式，而不一定来自不同模型权重。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/07-framework.png' | relative_url }}" alt="ANN 的分层前向、轨迹评价、全局与局部文本梯度、动量更新及冻结推理流程" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / ANN</p>

## 先看一个论文中的真实配置：HumanEval

HumanEval 的完整工作流有三层：`code_review_block → code_finalize_block → code_execute_block`。

仅第一层 code review（代码审查）就初始化了两种候选 Block：

1. **CodeReviewBlock1：多 Agent 审查。** `agent_pseudo_code` 先理解不完整代码；输出同时送给 `agent1_review_code` 与 `agent2_review_code` 两个并行 reviewer（审查者）；最后 `agent3_decision_maker` 比较两路结果并决策。
2. **CodeReviewBlock2：单 Agent 审查。** 一个 `agent_review_code` 直接审查并输出代码，结构更便宜、更简单。

初始可复用 Agent 池还包括 `agent_review_code_after_pseudo_code`、`agent_decision_maker_with_2_options` 和 `agent_static_analysis`。论文案例显示，训练早期可能只是单 Agent 完成代码；随后演化为“两位并行 reviewer + decision maker”；再往后加入 static analysis（静态分析）节点，形成审查—纠错流水线。

### Forward：谁根据什么选择团队

对一个不完整 Python 函数，Forward（前向执行）按层运行：

1. 每层的 team-selector agent（团队选择器 Agent）收到当前任务信息 `I`、本层输入 `I_l`、层编号，以及该层所有候选 Block 的结构摘要。
2. selector 根据子任务要求和复杂度选择 `f_l`。简单代码可能选单 Agent Block；需要多视角检查时可能选并行 reviewer Block。论文没有公开一个固定数值打分公式，选择由 LLM selector prompt 完成。
3. 被选 Block 执行内部 nodes 与 edges，得到层输出 `O_l`；`O_l` 作为下一层输入。
4. Trajectory（轨迹）记录 `(层、选中的 Block、层输入、层输出)`，并保存 Block/Node 的 prompt、变量来源、节点输入输出和最终答案。Backward 的诊断依据就是这份轨迹，而不是只看最终“答错了”。

在 HumanEval 中，code-review 层先提出或审查代码；code-finalize 层检查语法正确性、逻辑完整性和对原始意图的遵守，必要时重写；code-execute 层再运行或验证代码。

### Backward：文本梯度从哪里产生

Backward（反向优化）只在训练任务上发生，而且只有结果未达到预设性能阈值时才触发。

**第一步，先产生任务评价。** 有标准答案的任务使用 answer-verification prompt 对比模型答案与 canonical solution（标准解）；Creative Writing 没有唯一答案，则按连贯性、情绪感染、任务遵循和创造性评分。评价结果相当于这条训练轨迹的 loss feedback（损失反馈）。

**第二步，生成 global gradient（全局文本梯度）。** Global optimizer 同时读取任务描述、最终结果、generated solution、canonical solution 和完整 workflow trajectory。它要找出哪个子任务或 Block 最可能导致失败，并为相关层输出 `global_analysis`、`structure_suggestion` 和 `prompt_suggestions`。这一步主要修层间职责、信息流和问题归属。

**第三步，逐层生成 local gradient（局部文本梯度）。** 系统按反向层序处理每个被怀疑的 Block。Local optimizer 读取 Block 名称、global feedback、当前结构、全部 node 输入输出、任务描述、标准解、测试样例和 available agents。它可以修改 prompt 与输入变量，也可以增加或删除节点（单次建议最多增加 3 个）、重新定义 edges、entry node 和 end node。

论文用

`G_local,l = β × G_global + (1-β) × ComputeLocalGradient(l, f_l, trajectory)`

表示局部建议同时受全局目标和本层证据约束。这里的“梯度”是 LLM 生成的结构化文字建议，不是对模型参数求导。

### Momentum：保存的不是数值速度，而是历史修改方向

每个 Block 保存 previous adjustment direction（上一次调整方向）。Momentum prompt 会同时读取：

- 当前团队结构与本轮 final result；
- 本轮 local gradient；
- 上一次调整方向；
- Block 输入输出及所有 node 的输入输出。

如果本轮问题与历史建议重合，它会追问“上次已经这样改了，为什么这次仍失败”，再修正原方向；如果是新问题，则保留新建议并与旧方向合并。论文用 `G'_local = αG_current + (1-α)G_previous` 表达这种累积，但实际操作是 LLM 对两段文本反馈做比较、保留和改写，不是把两段文字做数值加权。

### 更新不会直接生效：最多尝试三次并逐级验证

新 Block 进入候选池前必须依次通过：变量来源与格式检查、所有非终点节点的连边检查、重复结构检查和性能验证。LocalGradientUpdate 最多尝试 3 次；无效变量、断边、重复拓扑或没有性能增益的候选都会被拒绝。通过后，新结构只是加入本层候选池，之后的 Forward selector 才可能选择它。

### 训练与使用的具体时序

1. **一次性初始化**：每个任务族提供固定层数、每层通常 1–3 个候选 Block，以及 7–8 个可复用 Agent。HumanEval 初始化为 2 个 Agent Team、8 个 Agent；其他六个基准最多也只有 3 个初始 Team。
2. **离线训练**：训练任务做 Forward；失败时做 Backward、Momentum 和 Validation；多条训练轨迹共同扩充候选池。论文的消融实验训练 20 个 epoch，每个条件重复 3 次。
3. **冻结**：训练结束后，工作流结构、候选池和 prompts 冻结。Validation/Test 都不再做 textual backpropagation。
4. **线上测试**：未见任务只做 Forward 路由和执行。论文报告的近似单题时间中，HumanEval 从纯 Forward 的 7 秒增加到训练期含 Backward 的约 30 秒，测试仍是 7 秒；MATH 约为 13 → 33 秒，测试仍为 13 秒；DABench 约为 15 → 34 秒，测试仍为 15 秒。

### Retriever / Verifier / Aggregator 与论文是什么关系

它们**不是 ANN 论文规定的 Agent，也不出现在上述 HumanEval 初始化中**。那张图只是本文作者为了说明“全局问题怎样落到局部角色”构造的研究工作流类比。为避免混淆，该图已移到附录。ANN 真正固定的是 Layer—Block—Node 的组织方式；具体角色名称由任务族、初始化与后续结构优化共同决定。
</div>
</section>

### 结果、成本与迁移

论文额外比较了“不训练候选结构”与“经过 textual backpropagation 训练”的差别，所有数字都在未见测试任务上测量：

| 数据集 | No Train：初始结构仅 Forward | 50% Train | Full Train |
|---|---:|---:|---:|
| HumanEval | 86.8 | 87.9 | **90.9** |
| Creative Writing | 8.3 | 8.5 | **9.0** |
| MATH | 65.0 | 70.0 | **82.5** |
| DABench | 86.3 | 86.3 | **90.2** |

这组实验说明提升来自训练期积累的候选团队与 prompt，而不是测试时临时反思。主实验中，ANN 使用 GPT-4o-mini 时在 HumanEval 得到 90.9%，MATH 与 DABench 分别为 82.5% 和 90.2%；MMLU-ML 为 89.2%，Natural Plan 的 Trip、Meeting、Calendar 分别为 7.9、55.0、73.0。

消融实验把 Full ANN 与去掉 Momentum、去掉性能验证、去掉 Backward 三个版本进行比较；四个数据集都训练 20 个 epoch，每个条件重复 3 次。完整系统整体收敛最好；去掉 Momentum 在 HumanEval 上下降最明显，去掉性能过滤会让 MATH 的结构更新更不稳定，没有 Backward 则失去扩充和修正候选团队的主要机制。

这套结构优化不是免费的。论文报告训练阶段约使用 244.6M 输入 token，估算 GPT-4o-mini 训练骨干成本约 73.4 美元，GPT-3.5 约 122.3 美元。另一方面，在 MATH 上优化的候选团队池可以不再 backward，直接迁移到 AIME 2024/2025 并取得增益，说明某些协作结构能在相近任务间复用。

ANN 仍需人工给出初始结构与 prompt；文本梯度也可能提出看似合理但无效的改动，所以验证与版本回滚不是附属功能，而是方法能够稳定工作的组成部分。

---

## 同一张票据，三种方法分别修哪里

下面用同一张票据贯穿三种方法。这个失败同时包含政策知识、部署经验和角色接口三类缺口，不能靠一条万能反馈同时修好。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/09.png' | relative_url }}" alt="MARS、PLD 与 ANN 的反馈来源、学习单元和更新对象对照" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / Matrix</p>

## 同样是文字，学习单元不同

MARS 从错误簇提炼原则/程序，PLD 从教师推理提炼 micro-rule，ANN 从轨迹与总评修改工作流。选择方法前，应先定位失败属于经验、规则还是结构。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/10.png' | relative_url }}" alt="票据解析链路遗漏币种、发生地和汇率日后产生错误分类" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / Case</p>

## 起点不是“模型不会”，而是证据没有到达

员工上传外币跨境交通票据，解析 Agent 只输出商户、金额和日期，没有把**币种、费用发生地、汇率日**交给政策核验层。核验 Agent 随后只按商户关键词判断，把票据错误归入普通本地交通费。

最终错误不一定表示模型缺少政策知识，也可能是证据在角色交接中丢失。先画出字段和证据路径，才能区分应补规则、补经验，还是修接口。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/11.png' | relative_url }}" alt="PLD 把稳定政策逻辑写成 System Prompt 规则" loading="lazy"></figure>
<div markdown="1"><p class="visual-note-index">11 / PLD in Practice</p>

## PLD：规则层回答“应该怎样判”

教师从政策样本中提炼规则：先判断发生地；再独立判断币种与税种；检查跨境例外是否触发；不得只凭商户关键词决定类别。规则进入核验 Agent 的 System Prompt。

每条规则还应附带来源政策、适用版本、正反例与冲突优先级，以便政策更新时单独撤销。PLD 不负责发现解析层有没有传来字段；若输入中没有发生地，再正确的规则也无法执行。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/12.png' | relative_url }}" alt="MARS 把重复票据失败聚类为原则和检查程序" loading="lazy"></figure>
<div markdown="1"><p class="visual-note-index">12 / MARS in Practice</p>

## MARS：经验层回答“我们反复怎样错”

部署一周后，如果多张票据重复出现同类错误，MARS 会把它们聚成“外币 × 跨境交通”失败簇。Principle 可以是：**外币不等于境外发生，币种与发生地必须分开判断。** Procedure 则要求读取发生地、核对汇率日、检查跨境例外，最后用边界样本复查。

这层更贴近上线后的新增失败，但需要可靠真值和稳定错误簇。增强还应保存来源失败簇、适用类别、验证结果与生成版本，防止局部经验被扩大到所有票据。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/13.png' | relative_url }}" alt="ANN 修改票据流程中的字段接口、角色与证据路径" loading="lazy"></figure>
<div markdown="1"><p class="visual-note-index">13 / ANN in Practice</p>

## ANN：工作流层回答“谁在何处做什么”

全局反馈定位币种、发生地与汇率日没有从解析层传到核验层；局部更新给解析 Agent 增加三个必填字段，在核验前新增异常检查角色，并要求核验层继续传递“命中哪条规则、证据来自哪个字段”。

结构更新必须落实为 schema（数据结构约定）、节点职责、边连接和验收条件。即使 PLD 与 MARS 已产生正确规则，ANN 仍要保证下游真正拿到执行规则所需的证据。
</div>
</section>

---

## 不能横向排冠军，只能判断证据支持到哪一步

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/14.png' | relative_url }}" alt="三篇论文各自的代表实验指标，任务模型和指标不可横向比较" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">14 / Evidence</p>

## 三个数字来自三套不同实验

MARS 的 +15.8 是 MMLU 上特定基线与策略的差值；PLD 的 +0.16 是 Contract-NLI Macro-F1 的变化；ANN 的 90.9 是 HumanEval 上的准确率。它们只能验证各自论文中的内部对照，不能用绝对值给方法排名。
</div>
</section>

更可靠的选型方式，是从失败类型倒推：

| 观察到的问题 | 优先考虑 | 仍需补充的保护 |
|---|---|---|
| 有真值任务中重复出现同类错误 | MARS | 失败聚类质量、类别级验证、增强回滚 |
| 专家判断过程昂贵，但可压成稳定规则 | PLD | 规则来源、冲突消解、上下文预算 |
| 多 Agent 最终失败，但根因散落在角色和接口 | ANN | 完整轨迹、结构验证、候选池版本管理 |
| 三类问题同时存在 | 分层组合 | 跨层一致性测试，不能直接把三份文字拼接 |

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/15.png' | relative_url }}" alt="文字反馈资产需要来源、范围、验证与回滚保护" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">15 / Risk</p>

## 共同风险：文字可读，不等于文字可靠

显式文本仍可能产生幻觉规则、错误归因、范围外泛化和相互冲突。上线前，每条资产至少要保存：

1. **来源**：由哪些样本、教师或轨迹产生；
2. **适用范围**：任务、类别、政策版本与模型版本；
3. **验证记录**：改善了什么，也损害了什么；
4. **依赖关系**：需要哪些字段，由哪个角色执行；
5. **回滚版本**：何时上线，什么信号触发撤销。

看得见规则只是治理入口；知道它从哪里来、对谁生效、如何验证和怎样撤销，才构成可治理性。
</div>
</section>

---

## 结论：先问反馈写到哪里，再问采用什么算法

一套完整系统可以分层使用它们：PLD 维护相对稳定的政策规则，MARS 只吸收部署后的新增失败模式，ANN 负责把规则和检查任务分配给正确角色，并维护证据路径。但这只是基于三篇论文机制得到的组合设想，三篇工作没有联合验证这套系统。真正落地时，需要额外测试规则重复、局部 prompt 绕过全局政策、字段接口不兼容与跨层负迁移。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-text-feedback/images/16.png' | relative_url }}" alt="文字反馈分别写入 Instruction、Rulebook 和 Agent Graph" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">16 / Conclusion</p>

## 更新位置决定能力边界

三种方法都把反馈转化为模型外部、可读、可修改的资产，但落点不同：

- MARS 把失败经验写进**增强指令**；
- PLD 把教师逻辑写进 **System Prompt 规则库**；
- ANN 把轨迹反馈写进 **Agent Graph**。

不要先争论“文本反馈好不好”，先定位学习发生在经验层、规则层还是工作流层。只有更新对象明确，反馈才可能被正确归因、验证并回滚。
</div>
</section>

---

<section class="post-appendix" markdown="1">

## 附录 A：延伸设想与补充图

下面两张图不是三篇论文已经证明的结论，因此不放在正文方法链中，只作为后续实验方向。

### A.1 把 MARS 经验进一步拆成 atomic memory（原子记忆）

可以把一个失败簇生成的长原则或程序继续拆成最小记忆单元，每条只保留一个结论，并附来源样本、适用条件、召回键与验证结果。好处是可以单独增加、删除和归因；代价是召回冲突、记忆膨胀以及局部规则组合后失去全局一致性。这个方向需要独立实验，不能算作 MARS 原论文的方法或结果。

![把 MARS 原则与程序拆成 atomic memory 的延伸设想]({{ '/assets/posts/acl-2026-text-feedback/images/17.png' | relative_url }})

### A.2 规则、经验与结构的分层组合

概念上可以让 PLD 位于稳定规则层、MARS 位于部署经验层、ANN 位于工作流层。但分层不代表天然兼容：PLD 规则可能要求一个上游未提供的字段，MARS 新经验可能与旧政策冲突，ANN 的局部更新也可能绕过全局约束。组合系统必须增加跨层 schema 检查、规则优先级与端到端回归测试。

![PLD、MARS 与 ANN 分层组合的待验证设想]({{ '/assets/posts/acl-2026-text-feedback/images/18.png' | relative_url }})

### A.3 Retriever / Verifier / Aggregator 研究工作流示意

下图是本文作者构造的解释性案例，不是 ANN 论文给出的固定 Agent 配置。它只用于说明：如果某个研究工作流恰好由检索、核验和聚合角色组成，global feedback 可以先定位跨角色证据流问题，local feedback 再分别修改字段与 prompt。ANN 原论文的具体案例是正文中的 HumanEval 三层代码工作流。

![Retriever、Verifier 与 Aggregator 的创作者示意案例，非 ANN 论文固定架构]({{ '/assets/posts/acl-2026-text-feedback/images/08.png' | relative_url }})

## 附录 B：论文信息

![MARS、PLD 与 ANN 的论文标题、作者和会场信息]({{ '/assets/posts/acl-2026-text-feedback/images/19.png' | relative_url }})

1. Xinmeng Hou, Bohao Qu, Wuqi Wang, Peiliang Gong, Qing Guo, Yang Liu. [*Learn Like Humans: Use Meta-cognitive Reflection for Efficient Self-Improvement*](https://aclanthology.org/2026.acl-long.1329/). ACL 2026 Long Papers.
2. Sanket Badhe, Deep Shah. [*Prompt-Level Distillation: A Non-Parametric Alternative to Model Fine-Tuning for Efficient Reasoning*](https://aclanthology.org/2026.acl-industry.142/). ACL 2026 Industry Track.
3. Xiaowen Ma, Yunpu Ma, Chenyang Lin, Sikuan Yan, Jinhe Bi, Zixuan Cao, Yijun Tian, Volker Tresp, Hinrich Schuetze. [*Self-Evolving Multi-Agent Systems via Textual Backpropagation*](https://aclanthology.org/2026.findings-acl.483/). Findings of ACL 2026.

</section>
