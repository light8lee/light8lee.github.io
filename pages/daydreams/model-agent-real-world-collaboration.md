---
layout: post
title: "从模型、Agent 到真实世界中的协作智能"
date: 2026-09-19 10:16:00 +0800
summary: "模型、环境、协作与成本四条曲线正在共同改变：Agent 会从拟合判断走向进入真实环境，并与人共享持续变化的世界状态。"
tags: [Daydreams, Agent, Computer Use, 协作智能, 趋势判断]
series: daydreams
daydream: true
thought_axis: 势
permalink: /daydreams/model-agent-real-world-collaboration/
cover: /assets/daydreams/model-agent-real-world-collaboration/images/bert_llm_agent.png
body_class: daydream-post
---

## 核心观点

我现在越来越觉得，所谓“势”，并不是去预测下一项具体技术是什么，也不是追逐某个阶段最热的概念，而是去判断：**模型能力、环境能力、协作方式和现实成本这几条曲线，正在往哪里走。**

从 BERT 到大模型，再到 Agent，我看到的一条主线并不是“模型越来越大”，而是 AI 能利用的信息越来越丰富、能接触的环境越来越接近真实世界、能参与的协作也越来越接近人类本来的工作方式。沿着这条主线继续往后看，我更倾向于认为，未来的重要变化会集中在几个方向：AI 会从“拟合人的判断”走向“进入人的环境”；Agent 的核心不会只是会调用更多工具，而是尽量减少自己与真实世界之间的信息差；GUI、视觉和 Computer Use 会变得越来越重要，因为 Agent 最终需要看到人真正看到的世界；人和人、人和 Agent、Agent 和 Agent 之间也需要一套持续同步认知和状态的机制，否则协作规模越大，信息损失越严重。

与此同时，我并不认为 Model 和 Harness 会互相替代。更可能的情况是，两者会经历“能力外化—工程沉淀—训练内化—再次外化”的螺旋演进。技术的发展也不能脱离现实条件：太超前会遇到成本、基础设施、模型能力和组织接受度的问题，太落后则始终只能追赶别人。因此真正重要的，不是知道十年后的终局，而是判断当前已经进入哪个“可实现窗口”。最后，越接近完整的人类工作流，通常意味着更高的信息量、更长的交互链路和更高成本，所以任何 Agent 系统最终都必须回到 ROI，以及“做到什么程度才算够好”的问题。

我更愿意把“势”理解成：**看清这些长期方向，然后决定现在应该站在哪里。**

---

## 1. 从 BERT 到大模型：AI 能利用的“世界”在不断扩大

<figure>
  <img src="{{ '/assets/daydreams/model-agent-real-world-collaboration/images/bert_llm_agent.png' | relative_url }}" alt="从 BERT 到 LLM 再到 Agent：AI 能利用的世界不断扩大" loading="lazy">
  <figcaption>图 1：从 BERT 到 LLM 再到 Agent，变化的不只是模型能力，而是 AI 能看到、理解和参与的“世界”越来越大。</figcaption>
</figure>

### 1.1 BERT 时代：学习“人在这份数据上怎么判断”

过去使用 BERT 一类模型时，本质上做的是从数据分布里学习人的判断。最基本的形式可以写成：

$$
x \rightarrow y
$$

给定一段文本 $x$，模型学习人工标注出来的结果 $y$。即使后来加入视频特征、用户特征、历史行为等，本质仍然是：

$$
f(x_1,x_2,\dots,x_n)\rightarrow y
$$

模型能够接触到什么，很大程度上由训练数据和人工设计的特征提前决定，所以那个阶段非常依赖数据覆盖、特征工程、标注质量，以及训练分布和线上分布是否一致。它能够学习“人在什么数据上做了什么判断”，但很难真正理解“人为什么能够做出这个判断”，因为现实中的人，在做判断时使用的信息远远不止一段文本。

### 1.2 大模型时代：从输入特征变成上下文世界

大模型带来的变化，在我看来并不只是参数变多，更重要的是模型可以在推理阶段利用大量上下文、知识和指令。原来更像是在学习：

$$
P(y\mid x)
$$

后来逐渐变成：

$$
P(y\mid x,C,K,I)
$$

其中，$C$ 表示上下文，$K$ 表示知识，$I$ 表示指令、规则、审核手册等信息。很多过去必须通过训练才能注入的东西，现在可以直接通过上下文提供给模型。

于是问题开始自然拆开。比如在审核场景里，一个判断可能同时依赖当前文本本身的语义、视频整体表达、评论区语境、用户历史行为、事件背景知识、审核手册定义，以及历史相似案例的处置方式。任务因此慢慢从单纯的分类问题，变成了一个信息组织与推理问题，这也是后来 Agent 能够自然出现的重要原因。

---

## 2. 从单模型到 Agent：问题开始被拆成多个能力单元

当问题越来越复杂以后，我观察到大家开始不再希望一个模型直接完成所有事情，而是逐渐把问题拆成多个能力单元，例如上下文理解、知识补充、视频理解、用户行为理解、审核规则理解、历史案例参考和最终研判。这样的拆解本身就非常符合 Agent 的发展逻辑，因为 Agent 天然适合把一个复杂任务拆成多个模块、多个步骤和多个能力单元协同完成。

所以我不认为 Agent 的出现只是因为“模型会调用工具了”。更深层的原因是：**现实问题本身已经复杂到不能再只靠一个静态输入和一个单模型去解决。** 当问题开始依赖跨模态信息、外部知识、规则、历史状态和长期上下文时，系统化拆解就变成了必然选择，而 Agent 正好承接了这种复杂任务的组织方式。

---

## 3. 从 Tool 到 Environment：Agent 需要更接近真实世界

<figure>
  <img src="{{ '/assets/daydreams/model-agent-real-world-collaboration/images/tool_to_environment.png' | relative_url }}" alt="从 Tool 到 Environment：Agent 从调用工具走向进入真实软件环境" loading="lazy">
  <figcaption>图 2：工具仍然重要，但更长期的方向是让 Agent 直接进入人本来就在使用的软件环境。</figcaption>
</figure>

### 3.1 现在很多 Agent 仍然活在人为构造的小黑盒里

现在大家都在做 Agent 基建、Harness 和工具调用，常见能力包括 Search、Database、OCR、Memory、Code、Browser，以及各种业务 API。这些能力当然很重要，但我觉得这里存在一个容易被忽视的问题：**工具很多，并不等于 Agent 已经接近真实任务。**

现在很多 Agent 实际上生活在这样一个环境里：

```text
真实世界
   ↓
人工抽取
   ↓
结构化字段
   ↓
Tool / API
   ↓
Agent
```

也就是说，Agent 并没有直接看到真实世界，而是看到了“人已经帮它加工过一次的世界”。这个过程中必然会产生信息损失，而这种信息损失往往并不显眼，因为系统最终只保留了已经结构化后的输入，却看不到那些在结构化之前已经被舍弃的细节。

### 3.2 审核场景中的观察瓶颈

在审核场景里，这种问题尤其明显。一个真实审核员看到的可能是视频画面、字幕、声音、评论区、用户昵称、头像、历史行为、上下文评论、历史处置记录以及各种辅助工具；而 Agent 收到的可能只是 ASR、OCR、视频摘要、评论文本和少量用户特征。两者并不等价。

这个过程可以抽象为：

$$
\text{World}
\xrightarrow{\text{人工设计}}
\text{Representation}
\xrightarrow{}
\text{Agent}
$$

真正的问题就在第一步：从真实世界映射到表示层时，很多信息已经被提前压缩掉了。因此我认为未来一个很重要的趋势应该是：

$$
\boxed{\text{Agent adapts to Environment}}
$$

而不只是：

$$
\boxed{\text{Environment adapts to Agent}}
$$

也就是说，不能永远都是人先把世界压缩成 Agent 能理解的格式，未来应该越来越多地让 Agent 直接进入人本来就在使用的环境。

---

## 4. GUI、Computer Use 与环境原生 Agent

### 4.1 CLI 是当前阶段的低垂果实

我现在认为，CLI、API 和代码工具在当前阶段非常适合 Agent，因为它们结构明确、确定性高、速度快、成本低，也更容易验证和重试。很多开发任务天然就在这些环境中完成，所以像 Codex 这样的形态非常适合作为 Agent 当前阶段的重要载体。

但我不认为 CLI 会是最终形态。它更像是 Agent 当前最容易先拿下的一块“低垂果实”：接口明确，反馈稳定，环境相对可控，因此特别适合早期 Agent 率先形成有效能力。

### 4.2 GUI 会从补充能力变成第一等公民

真正的人类工作并不只发生在命令行里，大量现实信息都存在于软件界面、浏览器、视频、图片、动态页面、交互状态，以及各种没有开放 API 的系统里。如果 Agent 最终要更接近人，它就必须具备直接观察这些环境的能力。

所以相比“Agent 会不会操作 GUI”，我更愿意把未来定义成：

> **Agent 会生活在人本来就在生活和工作的软件环境里。**

这和“会点按钮”是两回事。它意味着 Agent 能看到人现在看到的界面，知道当前软件是什么状态，知道前一个人刚刚做了什么，能够接着人的工作继续往下做，并在多个软件之间保持任务连续性。因此我认为 Computer Use、视觉能力和 GUI 不只是一个 Tool，而是 Agent 未来进入真实世界的重要入口。

### 4.3 未来不是 GUI 取代 CLI，而是多种接口统一存在

我并不认为未来会简单变成：

$$
\text{CLI} \rightarrow \text{GUI}
$$

更合理的形态是 Agent 在观察世界时越来越接近人，而在执行动作时选择最有效率的接口。如果 API 更快、更稳定，就用 API；如果 CLI 更高效，就用 CLI；如果只有 GUI 才包含完整信息，就看 GUI。

因此真正的方向应该是：

$$
\boxed{\text{GUI}+\text{API}+\text{CLI}+\text{Vision}}
$$

这些能力共同构成 Agent 的观察空间和行动空间。再往前一步，我会把这种形态称为 **Environment-Native Agent（环境原生 Agent）**：它不只是“会调用工具”，而是真正生活在一个完整的软件环境里。

---

## 5. 从信息传递到共享认知：协作系统也需要演进

<figure>
  <img src="{{ '/assets/daydreams/model-agent-real-world-collaboration/images/shared_state.png' | relative_url }}" alt="从消息传递到共享状态：减少团队协作中的信息损失" loading="lazy">
  <figcaption>图 3：如果团队一直依赖层层转述，信息会不断压缩和漂移；共享状态更接近“共同维护同一个世界认知”。</figcaption>
</figure>

### 5.1 人和人之间本来就存在严重的信息损失

现在团队协作里，很多信息其实就是在沟通层级之间逐渐丢掉的。一个典型过程可能是：

```text
真实问题
  ↓
A 理解
  ↓
A 开会讲给 B
  ↓
B 做会议纪要
  ↓
B 再同步给 C
  ↓
C 转述给执行人员
```

每一层都相当于做了一次压缩：

$$
I_{t+1}=\operatorname{Compress}(I_t)
$$

经过多层以后：

$$
I_n=
\operatorname{Compress}_n
\left(
\cdots
\operatorname{Compress}_2
\left(
\operatorname{Compress}_1(I_0)
\right)
\right)
$$

最后留下来的可能只剩一句“结论是要做 X”，但大量真正重要的信息已经消失，例如为什么要做 X、当时有哪些反例、哪些地方还不确定、谁提出了什么假设、为什么没有选择 Y、这个结论适用于什么边界，以及哪些前提后来已经发生变化。我认为这是一种非常典型的“认知信息损失”。

### 5.2 Agent 越多，认知漂移可能越严重

今天主要还是“人 → 人 → 人”，未来可能逐渐变成“人 → Agent → Agent → 人 → Agent”。如果每一层仍然采用“把上一步总结一下，再告诉下一步”的方式，那么 Agent 越多，认知漂移反而可能越严重。

例如 Agent A 最初认为问题是 $X$，经过一次摘要后，Agent B 可能把它理解成 $Y$，再经过下一次转述后，Agent C 最终围绕 $Y$ 开始优化，此时原始目标 $X$ 已经消失。这个问题说明，未来 Multi-Agent 真正困难的地方之一，不只是怎么编排 Agent，而是：**多个智能体怎么维持对同一个世界的一致认知。**

### 5.3 从 Message Passing 到 Shared World State

我认为未来协作的形态应该逐渐从“互相传递消息”走向“共同维护状态”。现在更多是：

$$
\text{Agent}_A
\xrightarrow{\text{message}}
\text{Agent}_B
$$

以后更合理的方式可能是让 Human A、Human B、Agent A、Agent B 共同读写一个持续变化的共享状态，也就是 **Shared World State（共享世界状态）**。

这个状态不应该只是 Memory。Memory 更多回答“过去发生过什么”，而共享世界状态回答的是：**我们现在共同认为世界是什么状态？** 为了做到这一点，它至少应该区分事实、假设、证据、决策、理由、未解决问题、边界和状态变化，而不是只保留一句最终结论。

---

## 6. 从同步信息到同步认知状态

### 6.1 共享状态需要保留推理结构，而不是只保留结论

如果一个协作系统最后只保存：

```text
project_status = "需要优化召回"
```

那本质上仍然丢掉了绝大多数上下文。更合理的系统应该区分：

- **Fact（事实）**：我们观察到了什么；
- **Hypothesis（假设）**：我们认为可能发生了什么；
- **Evidence（证据）**：为什么这么认为；
- **Decision（决策）**：最终决定做什么；
- **Rationale（理由）**：为什么这么决定；
- **Open Question（未解决问题）**：现在还不知道什么；
- **Boundary（边界）**：这个结论什么时候不成立；
- **Event（状态变化）**：什么时候发生了变化。

尤其需要明确区分“我们认为 $X$”和“$X$ 已经被验证”，因为这两者在系统中应该是完全不同的状态。我之前在 Semantic Harness 中关注的 Hypothesis → Verification → Evidence Integration，其实在团队协作这里同样成立。

### 6.2 会议不应该只是生成 Summary，而应该更新 World State

传统团队协作更多是在同步信息，而未来人和 Agent 混合协作真正需要做的是同步认知状态。比如一场会议结束以后，不应该只生成一份 Meeting Summary，而应该更新一个类似下面的状态：

```text
World State v17
─────────────────
新增事实：
F27

被否定假设：
H13

新增假设：
H19

决策：
D08

D08 依赖：
F12 + F27

待验证：
Q31

Owner:
Human A / Agent C
```

会议本身只是改变世界状态的一个事件。后续无论加入的是新同事、新 Agent、Supervisor Agent、Coding Agent 还是 Research Agent，都不需要重新听一遍故事，而是直接接入最新状态。这样才能从根本上减少协作过程中的信息损失。

---

## 7. 人的感知如何变成 Agent 可利用的上下文

<figure>
  <img src="{{ '/assets/daydreams/model-agent-real-world-collaboration/images/human_perception.png' | relative_url }}" alt="把人的感知转换成 Agent 可观察的上下文" loading="lazy">
  <figcaption>图 4：真正困难的不只是把结论告诉 Agent，而是尽可能让 Agent 看到人当时看到的界面、上下文、轨迹与证据。</figcaption>
</figure>

这里还有一个更难的问题：人很多时候并不是基于明确的结构化证据做判断。例如审核人员可能会说“这个感觉有点不对”，但这句话背后可能已经使用了视频节奏、用户头像、评论区氛围、历史经验、相似案例、语言语气以及某种组合起来的异常感。

然而系统里最后留下来的可能只有：

```text
A：建议违规。
```

Agent 并不知道 A 到底感知到了什么。因此未来如果 Agent 真正参与人类协作，还需要解决：

$$
\text{Human Perception}
\rightarrow
\text{Machine Observable Context}
$$

也就是说，要尽量让 Agent 看到人当时看到的界面状态、操作轨迹、视频内容、页面上下文、历史信息、Interaction Trace 和 Decision Trace。这个问题再次和前面的 GUI / Computer Use 连在了一起：Agent 只有越来越接近人的观察环境，才有可能真正理解人的感知从哪里来。

---

## 8. Collaboration Harness：从工具编排走向认知编排

现在很多 Harness 主要关注怎么调用 Search、Browser、Code、Memory、Database，但未来我认为还会出现另一类非常重要的 Harness：它要回答“谁知道什么”“什么发生了变化”“哪些信息已经过期”“哪些 Agent 必须知道这个变化”“哪些结论存在冲突”“谁需要重新推理”。

这意味着 Harness 会逐渐从 **Tool Orchestration（工具编排）** 进一步走向 **Cognitive Orchestration（认知编排）**。我认为这可能才是未来大规模 Multi-Agent 的真正难点之一，因为当参与协作的智能体越来越多时，真正稀缺的不再只是单个 Agent 的推理能力，而是整个系统保持低损耗认知同步的能力。

---

## 9. Model 和 Harness 会螺旋演进

<figure>
  <img src="{{ '/assets/daydreams/model-agent-real-world-collaboration/images/model_harness_spiral.png' | relative_url }}" alt="模型与 Harness 的协同演进螺旋" loading="lazy">
  <figcaption>图 5：能力先被外化成 Harness，再通过经验与训练逐渐内化进模型；模型变强之后，又会继续催生新的 Harness。</figcaption>
</figure>

### 9.1 两种极端判断都不完整

现在很容易形成两种极端观点。一种认为模型足够强以后 Harness 就不需要了，另一种认为不再需要训练模型，全部依赖 Agent、Context Engineering 和 Tool 就可以。我觉得长期来看这两种判断都不会成立。

更可能出现的是一个循环：

```text
模型能力不足
     ↓
用 Prompt / Tool / Memory / Workflow / Harness 补偿
     ↓
发现哪些模式稳定有效
     ↓
积累大量 trajectory / experience
     ↓
Post-Train
     ↓
模型把部分能力内化
     ↓
能力边界再次向外扩展
     ↓
需要新的 Harness
```

可以进一步抽象成：

$$
\boxed{
\text{Externalize}
\rightarrow
\text{Standardize}
\rightarrow
\text{Internalize}
\rightarrow
\text{Externalize}
}
$$

中文可以理解成“能力外化 → 工程沉淀 → 训练内化 → 再次外化”。

### 9.2 未来不是 Model vs Agent，而是共同演进

今天靠 Prompt、Tool、Memory、Reflection 补出来的能力，未来有一部分可能会直接通过训练被模型吸收；但模型变强以后，人又会要求它解决更复杂的问题，于是新的 Harness 继续出现。所以长期来看，不是 Model vs Agent，而是：

$$
\boxed{\text{Model} \times \text{Harness}}
$$

共同演进。

---

## 10. 技术判断的关键：不能太早，也不能太晚

### 10.1 太超前的问题

方向也许是对的，但如果模型能力不够、基础设施不成熟、成本太高、数据还没准备好、Benchmark 不成熟、组织不理解或者商业价值兑现不了，那么最后就会变成“理论上是对的，现实中活不下来”。

### 10.2 太落后的问题

如果等到所有人都有成熟方案、基础设施已经商品化、最佳实践已经稳定、Benchmark 已经固定，那时候解决的就不是创新问题，而是追赶问题。

### 10.3 更合适的位置是“相邻可能空间”

我更认可一种状态：

$$
\boxed{
\text{在“不确定性开始下降、价值开始显现”的位置进入}
}
$$

不是追十年之后的最终形态，而是问：今天往前走一两步，已经能够够到什么？这个位置可以理解成 **Adjacent Possible（相邻可能空间）**。我认为“势”的核心，很大程度上就是判断这个位置。

---

## 11. 越接近完整人类工作流，智能成本通常越高

如果未来 Agent 能看到更多信息、看 GUI、看视频、搜索、调用多个工具、多轮验证、长期保持状态，还能与多个 Agent 协作，那么它得到的判断可能更完整，但成本也会随之上升。

可以粗略理解成：

$$
\text{Information} \uparrow
$$

$$
\text{Interaction Steps} \uparrow
$$

$$
\text{Verification} \uparrow
$$

通常都会带来：

$$
\text{Cost} \uparrow
$$

所以越希望 Agent 接近完整的人类工作方式，越必须考虑一个现实问题：**值不值得？** 这也是为什么 Agent 的终局不能只讨论“能力上能不能做到”，还必须讨论“经济上能不能持续做到”。

---

## 12. 最终一定会回到 ROI 和“够好边界”

<figure>
  <img src="{{ '/assets/daydreams/model-agent-real-world-collaboration/images/adaptive_roi.png' | relative_url }}" alt="自适应智能分配与 ROI：不同问题使用不同深度的智能" loading="lazy">
  <figcaption>图 6：真实世界不会让所有 Case 都使用最昂贵的智能，而是需要在风险、效果和成本之间寻找“足够好”的边界。</figcaption>
</figure>

### 12.1 现实世界优化的是总成本，而不是绝对准确率

我认为真实世界几乎不可能无限追求：

$$
\text{Accuracy} \rightarrow 100\%
$$

因为真正应该优化的其实是总成本：

$$
C_{\text{total}}
=
C_{\text{model}}
+
C_{\text{tool}}
+
C_{\text{human}}
+
C_{\text{latency}}
+
C_{\text{error}}
$$

其中：

$$
C_{\text{error}}
=
P(\text{error})\times L(\text{error})
$$

这意味着，一个准确率更高的系统，并不一定是更好的生产系统。如果为了从 $97\%$ 提升到 $99\%$，成本上升几十倍，但这 $2\%$ 的错误本身造成的业务损失并不大，那么它可能就没有现实价值。

### 12.2 “做到什么程度才算够好”

我现在觉得，“够好”不能由一个统一准确率来定义，它至少包含两个边界。第一层是风险底线：

$$
\operatorname{Risk}(x)\leq R_{\max}
$$

例如某些高风险内容不能自动漏放、某些错误必须进入人工、某些场景必须有更强验证，这部分更像一个不可突破的安全边界。

在满足安全底线以后，就应该看边际收益：

$$
\frac{\Delta \text{Value}}{\Delta \text{Cost}}
$$

前期可能是增加很少成本就能换来明显收益，继续做非常有意义；后期则可能需要增加大量成本，才能换来极小提升。真正的现实边界是：

$$
\boxed{
\Delta \text{Benefit}
\leq
\Delta \text{Cost}
}
$$

并且同时满足：

$$
\operatorname{Risk}\leq R_{\max}
$$

这就是我理解的“足够好边界”。

---

## 13. 未来不是所有 Case 都应该获得相同智能

如果完整 Agent 很贵，那么生产环境最终大概率不会让所有 Case 都跑最复杂的 Agent。更现实的形态应该是：

```text
               ┌→ Cheap Model
简单 case ─────┤
               │
普通 case ─────┼→ LLM + Context
               │
困难 case ─────┼→ Agent + Tools
               │
高风险 case ───┼→ Deep Agent + Verification
               │
极端 case ─────└→ Human
```

也就是说：

$$
\boxed{\text{Adaptive Intelligence Allocation}}
$$

我更愿意把它理解成：**智能本身也是一种资源。** 真正重要的问题不是“我有没有一个最强 Agent”，而是“我应该把多少智能花在哪一个 Case 上”。未来系统在这一点上的能力，可能会比“单个 Agent 有多强”更重要。

---

## 14. 我现在对未来 Agent 的整体判断

如果把这些想法进一步压缩，我目前更倾向于用下面几个转变来概括未来 Agent 的长期方向。

### 14.1 数据 → 上下文

BERT 主要学习数据分布，大模型开始真正利用上下文、知识和规则。

### 14.2 单模型 → 系统

问题越来越复杂以后，单模型逐渐拆成多个理解、验证和决策模块。

### 14.3 Tool → Environment

Agent 不再只是调用人给它准备好的接口，而是越来越多地进入真实软件环境。

### 14.4 Message → Shared State

团队协作不再只是转述消息，而是共同维护持续变化的世界状态。

### 14.5 Harness ↔ Model

外部 Harness 中稳定有效的能力会被逐渐内化到模型，模型变强后又会产生新的 Harness。

### 14.6 Intelligence ↔ Cost

越完整的信息和越复杂的 Agent，通常意味着更高成本，所以最终必须回到 ROI。

---

## 15. 两层未来基础设施

如果进一步压缩，我觉得未来 Agent 世界里会有两层非常重要的基础设施。

第一层是：

$$
\boxed{\text{Environment Layer}}
$$

它解决的是“Agent 到底能看到什么”，包括 GUI、Vision、Computer Use、API、CLI、Browser、Filesystem 和各类真实软件环境。

第二层是：

$$
\boxed{\text{Cognitive Synchronization Layer}}
$$

它解决的是“所有参与者现在共同知道什么”，包括 Shared World State、Memory、Decision Trace、Evidence、Hypothesis、Version、Conflict、Update，以及 Human / Agent 之间的认知同步。

我认为只有这两层都逐渐成熟以后，Agent 才真正有可能从“会调工具的模型”，走向“参与真实世界工作的智能体”。

---

## 16. 最后的判断

如果一定要用一句话总结我现在对“势”的理解，我会这样写：

> **过去几十年的软件，是人在适应机器；过去几年的 Agent，是人在把世界加工成机器能够理解的接口；下一阶段，则会越来越多地让机器进入人本来就在工作的环境，并与人共享同一个持续变化的世界状态。**

再往下推一步：

> **过去我们努力把世界变成模型能理解的样子，未来则会越来越多地让模型学会进入世界本来的样子。**

而“势”真正要解决的，不是告诉我某个终局一定是什么，而是提醒我：**需要看清长期方向，但只往前走今天已经可以走得通的那一步。**
