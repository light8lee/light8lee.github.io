---
layout: post
title: "ToolRM：把工具调用错误变成领域裁判的训练数据"
date: 2026-07-21 12:00:00 +0800
summary: "完整拆解 ToolRM 的偏好数据生产、规则评分、BMDS 采样、生成式与判别式奖励模型、下游 Agent 应用，以及从单步裁判走向完整轨迹奖励模型的关键缺口。"
tags: [ToolRM, Reward Model, 工具调用, Agent, GRPO, Best-of-N, visual-essay, project]
cover: /assets/pages/toolrm/images/01.png
body_class: maxrl-post
permalink: /pages/toolrm.html
---

ToolRM 要解决的不是“Agent 能不能输出 function call”，而是更基础的评价问题：当工具、参数、调用数量和执行路径都可能出错时，怎样训练一个成本足够低、又真正理解工具语义的领域裁判？

页面按数据生产、规则评分、偏好构造、两类 Reward Model、下游 Agent 应用和方法边界逐章展开。每张静态信息卡与对应的详细解读放在一起，不包含视频或音频。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/01.png' | relative_url }}" alt="从自然错误中训练工具调用裁判" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / Thesis</p>

## 从自然错误中训练工具调用裁判

1. ToolRM 的目标是训练一个专门判断 Agent 工具调用质量的奖励模型，解决通用 Reward Model 不理解函数选择、参数和调用流程的问题。
2. 它从七个工具调用数据集中提取正确轨迹，让多个大模型生成不同质量的候选，再用工具名和参数匹配规则自动打分。
3. 作者把不同分数的候选组成偏好对，并优先采样来源多样、难度适中、任务复杂的 3 万个样本。
4. 基于这些数据，生成式 ToolRM 学习“分析错误并选择更优回答”，判别式 ToolRM 学习直接输出排序分数，前者适合自我纠错，后者适合 Best-of-N 和 RL。
5. 它的核心启发是：通过可验证规则生产高质量 hard negatives，能把小模型训练成强大的领域裁判，但未来还需解决完整轨迹评估、语义等价调用和解释可信度问题。

---

ToolRM 的核心不是新增一套模型结构，而是把工具调用中的自然错误组织成可验证、可比较、靠近决策边界的训练数据。训练阶段使用标准答案和规则验证器制造偏好；部署阶段，模型只看上下文、工具定义与候选回答，自行判断哪一个更好。

可以把整个系统理解成三种角色：

1. **规则验货员**：对候选工具调用做机械核对。
2. **题库编辑**：把不同质量的候选组成“哪个更好”的题，并挑选最有训练价值的题。
3. **AI 审稿人 ToolRM**：学习脱离标准答案，仅根据上下文、工具定义和候选回答判断谁更好，甚至解释错在哪里。

因此，它不是简单地让规则在运行时替代奖励模型，而是：

```text
训练阶段：
标准答案 + 规则验证器
        ↓
大规模偏好对
        ↓
训练 ToolRM

部署阶段：
上下文 + 工具定义 + 候选回答
        ↓
ToolRM 判断优劣
        ↓
BoN 选择 / 自我纠错 / 强化学习奖励
```
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/03.png' | relative_url }}" alt="为什么通用 Reward Model 不够用" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / Problem</p>

## 为什么通用 Reward Model 不够用

### 1. Agent 的瓶颈正在从“会不会调用工具”变成“能不能判断调用得好不好”

监督微调可以让模型模仿正确轨迹；RLVR 可以在存在明确验证器时让模型试错。但实际工具环境并不总有标准答案，例如：

- 工具调用格式合法，但工具选错了；
- 工具正确，参数部分错误；
- 最终任务完成了，但中间有冗余调用；
- 两个回答都不完美，只是一个错误更严重；
- 没有现成执行环境，无法真正运行 API；
- 希望从 16 个采样结果里选择最好的一个。

这时需要一个专门理解工具调用的 Reward Model。

一般聊天 Reward Model 主要学习 helpful、harmless、honest 等模糊偏好，不一定理解：

- 函数名是否符合用户意图；
- 参数是否完整；
- 是否应该并行或顺序调用；
- 是否调用了重复工具；
- 是否在没有工具证据时编造结果；
- 是否进行了不必要的澄清。

论文认为，可靠的 Tool-Use RM 是工具智能体进一步进行 RL、Best-of-N 和自我修正的基础设施。

### 2. 为什么不直接让 GPT 或 Claude 做裁判

通用大模型可以充当 LLM-as-a-Judge，但成本高，而且并没有针对工具错误进行系统训练。

在论文构造的 TRBench-BFCL 上，Claude-4-Sonnet 的加权准确率为 64.23%，而 ToolRM-Gen-Qwen3-4B-Thinking 达到 71.87%，ToolRM-Disc-Qwen3-4B-Instruct 达到 77.61%。也就是说，专门训练的小模型在这个窄而重要的领域里可以超过更大的通用模型。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/04.png' | relative_url }}" alt="七个数据集与五个模型如何制造自然 hard negatives" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / Data factory</p>

## 七个数据集与五个模型如何制造自然 hard negatives

### 1. 先把异构工具轨迹标准化

作者收集了 7 个开源工具调用数据集，包括：

- APIGen
- APIGen-MT
- BUTTON
- ComplexFuncBench
- Hermes-Function-Calling
- Glaive-Function-Calling
- ToolAlpaca

处理过程包括：

- 统一为 Hermes Function Calling 格式；
- 修复、验证工具 JSON Schema；
- 去除重复工具；
- 检查消息角色顺序；
- 把完整轨迹切分成多个“历史上下文 → 下一步 assistant response”；
- 验证函数名和参数是否符合 schema；
- 丢弃工具执行失败、格式错误和重复调用样本。

这里有一个非常关键的设计：

> ToolRM 训练的基本单位通常不是完整任务，而是轨迹中的某一步。

因此，它更擅长判断“这一步动作好不好”，还不是一个完整的长程任务裁判。

### 2. 用多个模型制造有差异的候选答案

对每个干净上下文，作者让 5 个不同能力、不同家族的模型分别生成候选：

- Claude-3.7-Sonnet
- Gemini-2.5-Pro
- Qwen2.5-Max
- Qwen-32B
- Qwen3-8B

这样得到的不是简单的“正确答案 vs 随机破坏答案”，而是自然产生的模型错误，包括：

- 选错相近函数；
- 漏掉参数；
- 参数值理解错误；
- 多调用或少调用一个函数；
- 产生表面合理但实际上错误的调用。

这些自然 hard negatives 比人工随机删除一个参数更接近真实 Agent 的错误分布。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/05.png' | relative_url }}" alt="规则评分如何衡量工具与参数的接近程度" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / Scoring</p>

## 规则评分如何衡量工具与参数的接近程度

设标准答案中的工具调用集合为 $C^*$，候选集合为 $\hat{C}$。

首先有两个一票否决条件：

- 候选调用数量与标准答案不同：得分为 0；
- 候选包含完全相同的重复调用：得分为 0。

如果通过检查，则对标准答案中的每个调用：

1. 找到候选中函数名相同的调用；
2. 计算参数字典相似度；
3. 参数相似度是“完全相同的键值对数量 / 两边所有不同键的数量”；
4. 多个同名候选中取最高相似度；
5. 最后对所有标准调用取平均。

因此分数主要衡量的是：

> 工具选得对不对，以及参数内容对得有多完整。

作者刻意弱化严格格式匹配，因为部署系统可能使用不同的 function-call 序列化格式。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/06.png' | relative_url }}" alt="为什么只保留模型学习边界附近的样本" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / Filtering</p>

## 为什么只保留模型学习边界附近的样本

对于同一个上下文：

- 如果 5 个模型全部得 1 分，说明太容易，没有比较价值；
- 如果没有任何模型得 1 分，可能是标准答案、上下文或规则本身存在噪声；
- 只保留至少有一个完全正确、同时又存在错误候选的上下文。

这相当于只留下模型的“学习边界”附近的题。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/07.png' | relative_url }}" alt="从绝对分数转向成对偏好与 BMDS 采样" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Pairwise data</p>

## 从绝对分数转向成对偏好与 BMDS 采样

### 5. 不训练模型预测绝对分数，而是训练它比较两个回答

作者早期尝试让生成式模型直接预测规则分数，但模型会学习分数分布的表面模式，在 OOD 数据上出现 reward hacking。

于是作者把任务改写成：

```text
给定：
- 对话历史
- 工具定义
- Response 1
- Response 2

要求：
- 分析两者的工具选择、参数、编造、冗余调用等问题
- 输出 <choice>1</choice> 或 <choice>2</choice>
```

只要规则分数满足 $s^+ > s^-$，就组成一个偏好对。

这是全文最重要的思想之一：

> “0.67 分是什么意思”很难学习；但在相同上下文中，“A 比 B 好在哪里”更具体，也更接近推理任务。

为了降低位置偏差，训练时有 50% 的样本会交换两个候选的顺序；评估时每个样本也会以正反两个顺序测试，只有两个顺序都判断正确才算正确。

### 6. 三维平衡采样 BMDS

从所有偏好对中，作者不是随机抽取 30K，而是在三个维度上平衡：

- **数据来源多样性**：避免某个数据集或工具模式占主导；
- **偏好强度**：覆盖从难分胜负到明显优劣的样本；
- **任务复杂度**：优先保留工具调用更多、参数更多的任务。

偏好强度定义为：

$$
I_{\text{preference}} = s^+ - s^-
$$

任务复杂度近似定义为：

$$
S_{\text{complex}} = \text{工具调用数} + \text{所有调用的参数数}
$$

具体实现是把偏好差分到 10 个区间，以“数据来源 + 差分区间”分组，在组内按复杂度降序选取。过度复杂、复杂度大于 50 的样本会被过滤，以提高训练 rollout 的成功率。

最终形成 ToolPref-Pairwise-30K，其中 29,500 条用于训练，500 条用于验证。

消融实验显示，数据来源多样性和任务复杂度的影响尤其大；而且数据从 30K 增加到 40K 并没有继续提升，因为后增加的样本平均复杂度下降。这说明这里是典型的：

> 30K 个精心选择的决策边界样本，可能比更多普通样本有效。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/08.png' | relative_url }}" alt="ToolRM-Gen：用可验证选择奖励学会 critique" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / Generative RM</p>

## ToolRM-Gen：用可验证选择奖励学会 critique

ToolRM-Gen 输入两个候选，输出分析和最终选择。

作者使用 GRPO 训练，每道题采样一组完整分析轨迹。奖励非常简单：

- 能解析出合法 `<choice>` 且选择正确：1；
- 否则：0。

模型没有人工编写的推理过程，也没有逐步 critique 标签。它只有最终选择的可验证奖励。

这意味着它的“推理能力”来自：

> 为了更稳定地选对答案，模型通过探索逐渐学会生成有帮助的比较过程。

优点：

- 可以输出自然语言 critique；
- 能用于自我纠错；
- 可解释性相对好；
- 可以把 critique 直接交给策略模型修改答案。

但需要注意：训练只验证最终 choice，并不直接验证每一句解释。因此解释可能是事后合理化，并不天然保证忠实。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/09.png' | relative_url }}" alt="ToolRM-Disc：低成本排序，以及偏好数据的具体形态" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / Discriminative RM</p>

## ToolRM-Disc：低成本排序，以及偏好数据的具体形态

ToolRM-Disc 分别给两个回答输出标量分数，使用 Bradley–Terry pairwise ranking loss：

$$
\mathcal{L} = -\log \sigma\left(r(x,y^+) - r(x,y^-)\right)
$$

它的目标就是让好回答的分数高于坏回答。

优点：

- 推理和输出成本低；
- 排序更稳定；
- 更适合 Best-of-N 和大规模 RL rollout 打分。

缺点：

- 只有分数，没有“错在哪里”；
- 不能直接指导策略模型修改回答。

论文实验也印证了这个分工：

- DiscRM 更适合精确排序；
- GenRM 更适合 critique 和 self-correction。

## 四、一个具体例子：训练数据是怎么产生的

假设工具定义是：

```json
{
  "name": "send_email",
  "arguments": {
    "to": "string",
    "subject": "string",
    "body": "string"
  }
}
```

用户要求：“给 alice@example.com 发邮件，主题是 Meeting，正文是 See you at 3pm。”

标准调用：

```json
{
  "name": "send_email",
  "arguments": {
    "to": "alice@example.com",
    "subject": "Meeting",
    "body": "See you at 3pm"
  }
}
```

三个模型候选：

```text
A：函数和三个参数全部正确
B：函数正确，但 body 写成 See you at 4pm
C：调用 create_calendar_event
```

规则得分大致为：

- A：3/3 = 1.0
- B：2/3 ≈ 0.67
- C：函数名不匹配 = 0

于是可以产生三种训练题：

- A vs B：细微偏好，训练参数值核对；
- B vs C：中等偏好，训练工具选择优先于局部参数正确；
- A vs C：强偏好，训练基础工具识别。

ToolRM-Gen 面对 B 和 C 时，理想输出可能是：

```text
Response B 使用了正确的 send_email 工具，
收件人和主题也正确，只有正文时间错误。
Response C 选择了与用户意图无关的日历工具，
无法完成发送邮件的任务。因此 B 更好。

<choice>1</choice>
```

训练时，系统实际上只验证 `<choice>1</choice>`；分析文字没有单独标准答案。

部署时则不再向 ToolRM 提供标准调用。它仅看到用户请求、工具 schema、B 和 C，然后根据训练得到的工具语义和错误层级知识选择 B。

这就是它从“规则匹配”过渡到“可泛化裁判”的核心。

## 五、论文中的真实案例，以及它揭示的问题

论文附录给出了这样一个例子：用户想列出 “MTNA Rich Data Services servers”，两个候选分别使用：

```json
{"name":"list_servers","arguments":{"server_type":"mtna"}}
```

和：

```json
{"name":"list_servers","arguments":{"server_type":"rds"}}
```

ToolRM 选择了 `mtna`，Claude-4 根据另一工具描述中的 “Rich Data Services (RDS)” 推断应该选择 `rds`。论文将前者视为正确案例。

这个案例一方面说明 ToolRM 学会了结合 enum 和用户原词判断参数；另一方面也暴露了一个很值得注意的问题：

> 如果 schema 描述本身含糊或相互冲突，“标准答案”未必无争议。

所以高 benchmark accuracy 不等于真实环境中的绝对正确。在这种情况下，最可靠的方法不是让 RM 纯推理，而是允许它查询工具文档、执行 dry-run，或者输出不确定性。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/10.png' | relative_url }}" alt="领域数据为什么能让 4B 裁判超过通用大模型" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / Evidence</p>

## 领域数据为什么能让 4B 裁判超过通用大模型

TRBench-BFCL 含 2,983 个偏好对、1,397 个独立任务、9 类 split 和 20 类错误；BFCL 数据没有用于训练，因此作者把它视为 OOD 评估。

主要结果包括：

- 通用偏好数据能提升工具裁判能力；
- ToolPref 领域数据带来的提升明显更大；
- ToolRM-Disc-Qwen3-4B-Instruct：59.67% → 77.61%，提升 17.94 个百分点；
- ToolRM-Gen-Qwen3-4B-Thinking：57.59% → 71.87%，提升 14.28 个百分点；
- Claude-4-Sonnet 在相同基准上的加权准确率为 64.23%。

需要区分论文中两个常被混淆的数字：摘要中的“最高提升 17.94%”对应 ToolRM-Disc-Qwen3-4B-Instruct 的加权准确率提升，而生成式 ToolRM-Gen-Qwen3-4B-Thinking 的提升是 14.28 个百分点。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/11.png' | relative_url }}" alt="从二选一扩展到排序、自我纠错与 Agent RL" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / Applications</p>

## 从二选一扩展到排序、自我纠错与 Agent RL

### 2. 它不仅会做训练时的二选一

在 ACEBench 上，以 63.4% 的策略模型为起点：

- BoN-16 + ToolRM-Gen：66.6%；
- BoN-16 + ToolRM-Disc：67.2%；
- ToolRM-Gen 自我纠错：74.8%，提升 11.4 个百分点；
- critique 平均输出从 3,211 token 降到 1,111 token，减少超过 66%。

这说明 GenRM 学到的东西不完全局限于二选一格式，它生成的反馈能够帮助另一个模型修正工具调用。

### 3. 可以作为下游 Agent RL 的奖励

作者用 15,000 条无标签工具查询训练 Qwen3-4B 策略模型。策略 rollout 两两交给 ToolRM-Gen 判断：

- 被选中的 response 奖励 1；
- 另一个奖励 0。

训练后的 BFCL-v3 结果为：

- 单轮 AST：73.25% → 77.89%，提升 4.64 个百分点；
- 多轮：19.88% → 25.50%，提升 5.62 个百分点。

不过多轮绝对准确率仍然不高，说明 ToolRM 解决了部分奖励问题，但远没有解决长程 Agent 学习。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/12.png' | relative_url }}" alt="这套方法真正可迁移的经验与现有边界" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / Boundaries</p>

## 这套方法真正可迁移的经验与现有边界

## 七、这篇论文最有价值的启发

### 1. Reward Model 的核心可能首先是数据工程，而不是模型结构

ToolRM 没有依赖特殊架构。真正贡献主要来自：

- 自然产生的 hard negatives；
- 可验证的细粒度规则；
- 相对偏好任务；
- 有意识地覆盖难度、复杂度和领域。

这对代码 Agent、浏览器 Agent、数据库 Agent 同样适用。

例如代码 Agent 可以使用：

- 单测通过率；
- 编译结果；
- 修改范围；
- 静态分析；
- 是否触碰禁止文件；

先产生部分分数，再组成偏好对训练 CodeRM。

### 2. 不要只采“完美答案 vs 垃圾答案”

真实决定通常发生在：

- 一个回答工具正确但参数略错；
- 另一个参数完整但工具选错；
- 一个能完成任务但成本高；
- 另一个调用少但存在安全风险。

这类“不完美对不完美”的比较，才会教会 RM 错误层级和权衡。

### 3. 生成式与判别式 RM 应当协作

实际系统可以采用两级结构：

```text
大量 rollout
    ↓
DiscRM 低成本快速排序
    ↓
取 Top-K 或低置信度样本
    ↓
GenRM 深度审查并生成 critique
    ↓
策略模型修正 / 人工审核
```

这比让 GenRM 审查所有结果便宜，也比只依赖一个不可解释的标量安全。

### 4. RM 可以成为 Agent 的“内部审稿人”

它不仅可用于训练，还可插入推理循环：

```text
Agent 生成动作
    ↓
ToolRM 审查
    ├─ 通过 → 执行
    └─ 不通过 → critique → 重新生成
```

这把 Reward Model 从离线 RL 组件变成运行时质量控制器。

## 八、论文现有设计的主要局限

### 1. 它还不是真正的完整 Agent 轨迹奖励模型

作者把轨迹切成一步一步来判断。论文自己也明确承认，它不评估完整任务结果，也不提供整体 trajectory-level feedback。

例如：

- 第一步看起来合理，却把 Agent 引入死路；
- 某一步调用错误，但后面成功恢复；
- 每一步局部最优，整体却成本极高；

这些现象无法通过逐步独立比较充分判断。

从单动作视角看，ToolRM 判断一个动作的最终输出，更像 ORM；从多轮视角看，它逐步评价动作，又有一点 PRM 的性质。但它不是完整轨迹级 ORM，也不是真正监督内部推理过程的 PRM。

### 2. 规则奖励把标准答案当作唯一参照

现实中工具调用可能有多条等价路径：

- `search_flights(city="Shanghai")`
- `search_flights(airport="SHA")`
- 先查机场 ID，再查航班；
- 直接用城市名查航班。

简单 key-value 匹配可能错误惩罚语义等价调用。

### 3. 调用数量不匹配直接归零过于刚性

额外调用可能是冗余，也可能是必要的验证；少一个调用可能是错误，也可能是模型利用了已有上下文。

“数量不同即 0 分”适合构造干净数据，却不一定是理想的真实奖励函数。

### 4. 复杂度指标比较粗糙

“调用数 + 参数数”不等于真正的推理难度。

一个只有一个参数但语义含糊的工具，可能比十个机械参数更难。更好的复杂度还应考虑：

- 候选工具的语义相似度；
- 调用依赖深度；
- 状态空间大小；
- 参数约束；
- 用户意图歧义；
- 错误恢复要求。

### 5. GenRM 的解释没有被直接验证

训练奖励只检查最终 choice。因此可能出现：

- 选择正确但理由错误；
- 理由与选择矛盾；
- 抓住了次要错误，却碰巧选对；
- 生成听起来专业的事后解释。

所以论文所说的“可解释性”应理解为“能输出可读 critique”，而不是已经证明解释忠实。

### 6. RM 本身并不会主动使用工具

虽然标题包含 “Agentic Tool-Use Reward Modeling”，但 ToolRM 本身主要是读取轨迹、schema 和候选响应做判断，并不主动调用工具验证结论。

严格来说，它是：

> 面向 Agent 工具使用的 RM，而不是一个能够自主调查证据的 Agentic RM。

### 7. 错误严重程度仍然难以校准

论文的错误分析指出两类常见失败：

1. 工具或参数描述缺少具体例子，模型无法推断最适合的调用；
2. chosen 也包含轻微错误，而 rejected 包含更严重错误，模型能发现所有错误，却不能正确区分主要错误和次要错误。

这说明“发现错误”和“比较错误严重程度”是两种不同能力。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/pages/toolrm/images/13.png' | relative_url }}" alt="从单步动作审查器走向完整 Agent 奖励系统" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">13 / Takeaway</p>

## 从单步动作审查器走向完整 Agent 奖励系统

## 九、后续最值得做的改进

### 1. 从字符串规则升级到执行与状态验证

可以将奖励拆成多层：

$$
R = w_1R_{\text{schema}} + w_2R_{\text{semantic}} + w_3R_{\text{execution}} + w_4R_{\text{state}} + w_5R_{\text{cost}} + w_6R_{\text{safety}}
$$

分别检查：

- JSON/schema 合法；
- 工具与参数语义；
- 是否可执行；
- 环境状态是否正确改变；
- token、调用次数和延迟；
- 权限、隐私和不可逆操作风险。

### 2. 训练完整轨迹 RM

输入完整的：

```text
用户目标
→ 推理/动作
→ 工具结果
→ 新状态
→ 后续动作
→ 最终结果
```

同时输出：

- 每步局部奖励；
- 关键错误发生位置；
- 最终任务奖励；
- 成本和安全奖励；
- 是否能够从错误中恢复。

这会把 ToolRM 从 step-wise critic 推向真正的 long-horizon Agent RM。

### 3. 加入“不确定、平局、拒绝判断”

目前主要是强制二选一。现实里经常存在：

- 两个都正确；
- 两个都错误；
- 两者语义等价；
- 工具文档不足；
- 必须执行才能判断。

可以训练四分类：

```text
A 更好 / B 更好 / 等价 / 信息不足
```

同时输出校准过的置信度。低置信度样本再交给执行验证器、强模型或人工。

### 4. 验证 critique 的忠实性

可以对解释进行二次验证：

- 删除 critique 中声称错误的参数，看 choice 是否随之合理变化；
- 要求 critique 引用具体 schema 字段；
- 用规则检查“声称参数错误”是否真实；
- 比较 critique 指出的错误和可执行验证结果；
- 对“理由正确”和“最终选择正确”分别给奖励。

这样能减少“选对但解释错”。

### 5. 使用主动学习形成闭环

部署后重点收集：

- ToolRM 低置信度样本；
- GenRM 与 DiscRM 意见不一致的样本；
- RM 判断正确但执行失败的样本；
- 多个强模型判断不一致的样本；
- 策略模型疑似利用 RM 漏洞的样本。

经过执行或人工复核后回流训练。这比持续随机扩数据更有效，也符合论文“30K 优于盲目扩到 40K”的观察。

### 6. 对抗性训练 Reward Model

策略模型经过 RL 后可能学会欺骗 RM，例如：

- 使用冗长解释掩盖错误调用；
- 复制工具文档中的关键词；
- 生成格式完美但语义错误的参数；
- 利用 RM 的位置或长度偏好。

因此需要让 policy 和 RM 交替升级，并保留独立的执行验证器作为防线。

### 7. 改进 hard-negative 与复杂度建模

可以专门生成以下困难样本：

- 同名函数、不同语义参数；
- 多条等价执行路径；
- 局部正确但全局失败的轨迹；
- 能完成任务但成本差异很大的轨迹；
- 轻微错误与致命错误并存的偏好对；
- 工具文档模糊或互相冲突的样本；
- 工具执行失败后能够恢复或不能恢复的样本。

复杂度不应只按调用和参数数量计算，还可以结合模型分歧度、执行路径深度、状态变化范围和历史失败率。

### 8. 扩展评估维度

后续 benchmark 除了 pairwise accuracy，还应该评估：

- 绝对分数是否校准；
- 是否能识别两个候选都错；
- critique 是否真实、具体、可执行；
- 是否能判断完整任务最终成功；
- 是否能考虑成本、延迟与安全；
- 是否能抵抗 reward hacking；
- 是否能泛化到未见过的工具、schema、领域和交互协议。

## 十、最终判断

ToolRM 最有价值的地方，不是证明了“小模型已经完全会评价 Agent”，而是提出了一套很实用的奖励模型生产方法：

> 从已有正确轨迹出发，让多个模型自然犯错，用规则把错误变成相对偏好，再重点选择多样、复杂、难分的样本，把一个普通模型训练成领域裁判。

它已经证明这套方法可以支持排序、自我纠错和下游 RL；但它目前更接近“工具调用动作审查器”，距离能够评价任务成败、长程规划、成本、安全和错误恢复的完整 Agent Reward Model，还有明显空间。

最值得带走的三点是：

1. **Reward Model 的能力上限首先取决于偏好数据的质量，而不只是模型规模。**
2. **可验证规则最有价值的用法，不一定是直接充当最终奖励，而是用来制造大量可信的相对偏好。**
3. **未来完整的 Agent 奖励系统应该是规则验证器、执行环境、判别式 RM、生成式 Critic 与人工反馈的组合，而不是依赖单一裁判。**
</div>
</section>

