---
layout: post
title: "ICML 2026：代码 Agent 变强，不一定靠更狠的 RL"
date: 2026-08-01 09:00:00 +0800
summary: "解读 daVinci-Dev 如何用 contextually-native 与 environmentally-native 数据，把定位、阅读、编辑和测试的工作流前移到 mid-training；正文逐卡对应论文，工程推论集中在文末。"
tags: [ICML 2026, Code Agent, Agentic Mid-training, Software Engineering, SWE-Bench Verified, daVinci-Dev, Mid-training]
category: LLM Post-training
cover: /assets/posts/icml-2026-davinci-dev/images/01.png
body_class: video-notes-post
series: icml-2026-agent-posttraining
---

# 会写代码，为什么还不会在仓库里干活？

模型能补全一个函数，不等于它知道面对真实仓库时该先搜什么、读哪里、改完如何验证。ICML 2026 Spotlight / Oral 论文 [daVinci-Dev: Agent-native Mid-training for Software Engineering](https://openreview.net/forum?id=a86luANykT) 关注的正是这道落差：静态代码语料教会模型“代码长什么样”，但软件工程 Agent 的部署过程是一条持续的 **行动—观察** 闭环。

论文给出的答案不是再设计一条损失函数，而是在 mid-training 阶段把这条工作流本身放进训练数据。它提出两类互补的 agent-native trajectory：一类保留 PR 中的完整信息流，提供规模和覆盖；另一类在真实可执行仓库中采集工具、测试和报错反馈，提供交互真实性。作者在对齐基础模型和 Agent scaffold 的条件下，报告 32B / 72B 模型在 SWE-Bench Verified 上分别达到 56.1% / 58.5%，完整 mid-training 配方为约 73.1B token；文中对比的 KIMI-DEV recipe 约为 150B token。

论文信息：[OpenReview](https://openreview.net/forum?id=a86luANykT) · [arXiv](https://arxiv.org/abs/2601.18418) · [ICML 页面](https://icml.cc/virtual/2026/poster/63099)。作者为 Ji Zeng、Dayuan Fu、Tiantian Mi 等。

> **全文主线：** 训练软件 Agent 时，数据单位不应只是一段最终代码，而应尽可能保留一条“观察—行动—验证”的工程工作流。

本文按视频的 12 张场景卡展开。正文只陈述可与论文原文对应的定义、数据设计、实验结果和限制；围绕训练策略的推广、教学案例和落地清单均收在文末附录，避免把解释性讨论误写成论文结论。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/01.png' | relative_url }}" alt="会补全代码不等于能在真实仓库中推进任务" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / 反常识问题</p>

## 会写代码，不等于会推进工程

单轮代码生成通常把问题、相关上下文和目标一次性交给模型；模型只需生成函数、补丁或解释。仓库级软件工程却不同：待修复文件往往藏在大量目录之中，问题描述也未必指出根因。Agent 必须先定位相关区域，读取代码与调用关系，做出修改，再让测试、lint、构建或运行时错误决定下一步。

论文将这种任务写为 $(R,q,E)$：$R$ 是仓库状态，$q$ 是自然语言问题描述，$E$ 是评估 oracle，通常是一组测试。第 $t$ 步的行动与观察为

$$
a_t\sim\pi_\theta(a\mid h_{t-1},q),\qquad
o_t\sim \operatorname{Obs}(a_t,R),
$$

其中历史 $h_{t-1}=\{(a_1,o_1),\ldots,(a_{t-1},o_{t-1})\}$。`search`、`read`、`apply_patch`、`run tests` 等是行动；文件内容、搜索结果、编译报错和测试输出是观察。重点不是某个工具名字，而是后一次决策依赖前一次环境反馈。

论文指出，传统静态语料展示的多是最终文件、合并后的 commit 或完成的实现：它们告诉模型“最后产物是什么”，却不展示部署时会经历的顺序决策。这便形成训练分布与 Agent 部署分布的错配。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/02.png' | relative_url }}" alt="daVinci-Dev 研究 Agent-native mid-training" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / 论文与判断</p>

## daVinci-Dev：把 Agent 工作流前移到 mid-training

软件 Agent 常见训练路线是：先从基础模型出发，用少量高质量轨迹做 SFT，再从可执行环境的反馈中进行 RL。论文并不否认后训练的作用；它追问的是，能否更早、以更大规模把基础的 agentic 行为塑造成模型分布的一部分。

这里的 **mid-training** 是预训练和任务型 SFT / RL 之间的领域继续训练。作者的论点是，真实可执行仓库昂贵且难以批量构造，而人工专家轨迹更稀缺；若把所有“定位—阅读—编辑—测试”的基础协议都留给后训练探索，数据的数量与多样性会成为瓶颈。因此，论文的核心贡献是 **agent-native data 的构造原则和训练配方**，不是新的 RL 算法或新的 token-level loss。

作者从非 coder 的 Qwen2.5-Base 出发，评估软件工程能力。这个设定值得保留：它说明报告的收益发生在特定基础模型、后训练设置和 scaffold 的组合中，不能直接读成“任意基础模型只需加入同一批数据就会达到相同分数”。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/03.png' | relative_url }}" alt="从 issue 到最终 patch 会丢失中间定位、阅读与验证过程" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / 分布错配</p>

## 问题不在最终补丁，而在补丁之前发生了什么

一个简化的静态样本可以写成“Issue $\rightarrow$ 最终 patch”。它保留了任务和结果，却压缩掉了中间过程：为什么选择这个文件、读过什么上下文、第一次修改是否失败、测试输出怎样改变后续修补。对人类开发者和 Agent 而言，这些并非装饰性的推理文本，而是下一步动作的条件。

论文也讨论了另一种常见做法：把定位和编辑拆成独立子任务。定位模型用 issue 预测文件，编辑模型在给定正确文件的前提下生成 diff。这样做便于构造监督，但会隐含 oracle 假设——编辑阶段已拿到完美检索结果。部署时检索、阅读和编辑发生在同一条轨迹中，前一步偏差会改变后一步可见的上下文；分解训练因此可能掩盖这些依赖。

作者把完整轨迹记作

$$
\tau=(q,R,\{(a_i,o_i)\}_{i=1}^{T},y),\qquad y\in\{0,1\},
$$

其中 $y$ 表示该轨迹在其监督来源下是否成功。典型流程可概括为 `localize → read → edit → test → revise`，但这不是硬编码的单向流水线：复杂任务可以反复阅读、重复编辑，并根据新观察回退或调整。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/04.png' | relative_url }}" alt="软件 Agent 的训练单位应是观察、行动、验证的工作流" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / 核心命题</p>

## 训练单位不该只是一段代码

这篇论文最值得记住的概念不是某个 benchmark 数字，而是数据的组织单位。对于 Agent，监督不只是目标 token；它还包含目标 token 出现前模型能看到什么、做过什么、环境回了什么。搜索结果会缩小待读文件的范围，文件内容会约束可行编辑，失败测试则重新定义下一步要解决的问题。

因此，论文所谓的 agent-native 并不要求一条轨迹在语言表面上“看起来像 Agent 对话”。它要求样本尽量保留真实工程过程的两个结构：其一，动作与其可用信息之间连续可追溯；其二，若涉及环境交互，观察应来自实际工具执行而不是事后编写的模拟文本。

这也解释了为什么测试失败不是无用噪声。对于静态补丁语料，失败日志常被丢弃；但在交互轨迹里，错误输出是状态的一部分。它告诉 Agent 当前修改没有满足 $E$，也让“下一步应该读哪里、改什么”成为可学习的条件行为。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/05.png' | relative_url }}" alt="contextually-native 与 environmentally-native 两类互补数据" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / 两类原生性</p>

## 两种 Agent-native 数据：广度与交互深度

论文将 agent-native trajectory 分成两类，它们解决的不是同一个问题：

| 类型 | 核心要求 | 主要作用 | 论文规模 |
|---|---|---|---|
| `contextually-native` | 保留真实工程过程所需的信息流；不要求每步都来自在线执行 | 覆盖、仓库与语言多样性 | $D_{\rm ctx}$：68.6B token |
| `environmentally-native` | 在真实可执行开发环境中产生；观察来自实际工具、测试和运行 | 交互真实性、可验证反馈 | $D_{\rm env}$：3.1B token，约 7.4 万条轨迹 |

前者允许利用 GitHub PR 中可规模化获得的材料，例如 issue、base files 和按时间排列的 commits；后者要求 Docker 环境、测试和工具调用真正运行。二者的采集成本不同，因而数据规模也相差很大；这不表示较小的环境轨迹可以被前者替代。论文的设计正是用前者获得宽覆盖，用后者补上静态记录无法重建的状态反馈。

将两类数据并列，也避免了一个容易混淆的说法：**“agent-native”不是二元标签。** 一条上下文完整但不在线执行的 PR 轨迹，和一条环境可执行、观察真实的 rollout，分别满足不同维度的原生性。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/06.png' | relative_url }}" alt="contextually-native 数据将 issue、文件和 commit 保留在同一上下文" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / Contextually-native</p>

## 别把 PR 拆成孤岛

`Contextually-native` 轨迹强调 **完整信息流**。作者从 GitHub Pull Request 重建过程：将相关 issue、任务开始时的 base files，以及时间上连续的 commits 放进同一任务级序列。模型看到的不再只是最终 diff，而是和 diff 关联的初始上下文，以及可能多次发生的编辑。

论文的关键比较不是“PR 数据是否有用”，而是“同一份 PR 应怎样表示”。若把一次 PR 切成孤立的定位样本与编辑样本，模型在编辑时容易获得部署中并不保证存在的完美上下文；若把 `localize—read—edit` 放在同一序列，模型学习的条件就更接近实际推理时所见的信息。这种连续表示保留了文件选择与修改之间的自然耦合。

完整 $D_{\rm ctx}$ 为 68.6B token。训练上，作者把它分为两段：先用 26.7B token 的通用子集建立广泛的软件工程基线，再用 41.9B token 的 Python 子集强化 Python-centric 的 agent-native 模式。这里的“先泛化、后聚焦”是论文给出的具体 staging，而不是仅按总 token 混合训练。

应注意，PR 记录并不等于开发者脑中的逐步思考。它能够保留的是可观察的工程结构和提交时序；作者的表述是利用 base files 与 commits 重建开发过程，而不是声称复原了开发者的完整内在推理。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/07.png' | relative_url }}" alt="environmentally-native 轨迹在 Docker 环境中收集真实工具和测试反馈" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Environmentally-native</p>

## 日志必须来自真执行

`Environmentally-native` 的标准更严格。Agent 在从 PR 派生的、可执行的仓库环境中行动；观察来自真实的搜索工具、文件读取、构建系统、单元测试、lint 和运行时输出。论文强调，工具调用后的 observation 不应是回顾性拼接出来的终端风格文本，而应是环境真的返回了什么。

这一要求重要，是因为“一个看起来合理的日志”未必对应真实状态转移。例如补丁可能表面上成功应用，却触发依赖冲突；一个模拟的测试通过文本也不能保证测试真正覆盖目标行为。环境轨迹把工具协议、错误模式和验证结果一起带入训练，因而提供静态代码无法给出的交互真实性。

作者使用 PR 的 Docker 环境和单元测试构造 $D_{\rm env}$，报告约 7.4 万条轨迹、共 3.1B token。论文说明，这些轨迹不采用 SFT 阶段那种只保留少量精英样本的过滤策略，以保留更大的训练数量；但实验分析也特别指出，可执行且 test-verified 的 passing trajectory 比静态或模拟轨迹带来的收益更高。二者并不矛盾：数据池可广，训练价值仍取决于环境反馈是否真实、最终行为是否经验证。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/08.png' | relative_url }}" alt="普通 token NLL 在 agent-native 条件序列上学习下一步行动" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / 损失与条件</p>

## 关键反转：loss 没换，条件序列换了

论文没有为 agentic mid-training 提出一个新的监督损失。其中心目标仍是普通的 next-token negative log-likelihood：

$$
\mathcal D_{\rm agent-native}=\mathcal D_{\rm ctx}\cup\mathcal D_{\rm env},\qquad
\mathcal L_{\rm MT}=-\sum_t\log p_\theta(x_t\mid x_{<t}).
$$

变化发生在 $x_{<t}$。在只含代码的样本里，模型往往依据自然语言需求与代码前缀预测下一段代码；在 agent-native 序列中，一个 action token 之前还可能出现定位结果、相关文件、先前 edit、测试输出和 runtime error。相同的最大似然训练目标于是学习另一件事：**在当前工程状态和交互历史下，下一步行动何时合理。**

这一点也澄清了“数据方法”和“loss 方法”的关系。NLL 不会自动制造 Agent 能力；它能把训练序列中稳定出现的条件—行动关联压进参数。论文的假设是，如果训练条件序列更接近部署时的 action-observation loop，模型更可能在实际 scaffold 中接上这些行为。因此，实验主要检验的是数据结构与来源，而不是优化器名称。

附录的训练细节显示，mid-training 使用 global batch size 1024、峰值学习率 $8\times10^{-5}$、5% warmup 后 cosine decay，并让数据消费一个 epoch，且不施加 loss mask。这些参数有助于复现配方，但并不是论文声称的通用最优超参数。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/09.png' | relative_url }}" alt="同一个 cache.py 补丁在静态样本与 agent-native 轨迹中的训练语义不同" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / 教学化案例</p>

## 同一个补丁，两种训练语义

用一个用于解释的 `cache.py` 过期判断 bug 来看这种差异。静态样本可能只含 issue 和最终 diff：把一个比较符改掉。这样的样本当然能教模型某类代码变换，但它没有告诉模型这个变换在什么观察下被选择，也没有展示第一次尝试是否真的解决问题。

与之对照的 Agent 轨迹可以是：搜索 `TTL` → 读取缓存调用点 → 修改过期比较 → 运行测试 → 发现时区不一致 → 统一时间标准 → 再次测试通过。最终 diff 可以完全相同，训练语义却不同：每个动作都由前面的 observation 条件化，第二次修改又由第一次的失败反馈条件化。

这个 `cache.py` 序列是本文为解释论文机制构造的教学例子，并非 daVinci-Dev 论文披露的具体训练样本。它在正文中出现，是为了把论文关于完整 action-observation loop 的定义具体化；有关它能否外推到其他 Agent 的讨论见附录。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/10.png' | relative_url }}" alt="daVinci-Dev 在 SWE-Bench Verified 上以较少 token 报告更高成绩" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / 实验证据</p>

## 更像工作流的数据，token 反而更省

论文的主结果在 SWE-Bench Verified 上评估。作者特别将 daVinci-Dev 与此前公开软件工程 mid-training recipe KIMI-DEV 的后训练 setting 对齐：比较时使用对齐的 base model 和 agentic scaffold，避免把不同 Agent 外壳的差异直接归为数据收益。

在该设定下，作者报告：

| 模型 | SWE-Bench Verified resolution rate | 完整 MT 配方 |
|---|---:|---:|
| daVinci-Dev-32B | 56.1% | 约 73.1B token |
| daVinci-Dev-72B | 58.5% | 约 73.1B token |
| 文中对比的 KIMI-DEV recipe | 见论文 Table 1 的对齐设置 | 约 150B token |

因此，结论应精确读成：在论文选择的基座、scaffold 与 benchmark 条件下，这套 data-centric 配方以少于一半的 mid-training token 超过了被比较的公开 recipe，并在相应模型规模下取得作者所称的开放训练配方最好成绩。它支持“数据结构与配方效率值得重视”，却不支持“token 越少越好”或“73.1B 是所有代码 Agent 的最佳预算”。

论文还有两类补充证据。第一，消融表明，把 PR 保持为上下文完整的样本优于把它分解为孤立子任务；第二，真实可执行、测试验证通过的 rollout 比静态或模拟轨迹更有效。作者还报告通用代码生成和科学 benchmark 的增益，说明收益不只局限于单一 agentic 指标；不过，本文的重点仍是其软件 Agent 的数据机制。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/11.png' | relative_url }}" alt="daVinci-Dev 的实验范围和隐私、评测边界" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / 适用边界</p>

## 这还不是软件 Agent 的终局答案

论文的限制部分给出几条必须一并携带的边界：

- **范围。** 实验聚焦一个 base model family 与一个 benchmark；向其他模型家族和更多真实 Agent 任务的迁移尚待验证。
- **评测敏感性。** 部分结果依赖修补过少量 benchmark 问题的 evaluation harness，这增加了额外的结果变异来源。
- **隐私与署名。** 通用 $D_{\rm ctx}^{\rm gen}$ 子集中没有显式移除 PR 文本里的开发者标识，可能带来隐私顾虑与贡献者姓名被记忆的风险。
- **环境覆盖。** 可执行仓库、Docker、测试依赖和可解决 issue 的筛选本身会限制可规模化利用的任务范围。

这些限制不否定论文的实验观察，但约束了外推方式。SWE-Bench Verified 的 resolution rate 不是生产可靠性、安全、许可证合规、隐私治理或长期维护成本的总代表；一套训练数据是否“更像真实工作流”，还需要在新的环境与新任务中继续测量。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-davinci-dev/images/12.png' | relative_url }}" alt="先让模型接触真实工作流，再由后续训练提升成功率" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / 结论</p>

## 先让模型见过工作流，再让后训练放大成功

daVinci-Dev 的直接结论是：软件工程 Agent 的 mid-training 可以从 GitHub PR 与可执行环境中构造大规模、互补的 agent-native 数据；保留完整上下文流以及真实执行反馈，能在论文的实验设定里带来更强的软件工程表现。

从机制上看，$D_{\rm ctx}$ 让模型在较广的仓库与语言分布中看到 `localize—read—edit` 的连续关系；$D_{\rm env}$ 则将真实工具和测试结果补入闭环。普通 NLL 不变，但模型在 action 前看到的状态改变了。后续 SFT 或 RL 仍可用于提高稳定性和完成率，只是它们不必从纯静态代码分布开始学习最基础的工具交互。

本文将这一点收束为一句工作流原则：**先把可观察、可验证的工程闭环纳入行为分布，再讨论怎样用后训练强化成功轨迹。** 这是对论文数据设计的忠实概括，而不是它已经证明的、适用于所有非代码 Agent 的普适定理。
</div>
</section>

---

## 附录 A：哪些内容是本文的工程延伸

下列内容受论文启发，但不是 daVinci-Dev 已直接验证的结论。

### A.1 从 token 预测到状态条件化决策

“loss 不变、条件变了”也可用作检查训练数据的简单问题：动作 token 出现前的上下文，是否包含部署时真正可获得、且会改变决策的状态？对非代码 Agent，这可以是检索到的文档、表单校验结果、数据库返回值或用户确认。这个问题不能替代任务评估，但能暴露一种常见错配：训练时给了 oracle 状态，部署时却要求模型自己获得它。

### A.2 一个可审计的轨迹数据单元

若要将论文的思路用于其他流程，可把每条轨迹保存为下列可审计字段，而非只存“指令—最终答案”：

| 字段 | 作用 | 需要防范的误用 |
|---|---|---|
| 初始任务与状态 | 说明 Agent 开始时真正知道什么 | 不要在起点泄露未来才知道的 oracle 信息 |
| action | 记录搜索、读取、写入、调用或询问 | 不将格式化后的解释误当作已执行操作 |
| observation | 保存外部系统实际返回的结果 | 区分真实回执与合成、回填的日志 |
| state transition | 记录操作如何改变环境 | 对不可逆动作保留审批与回滚信息 |
| verifier / outcome | 说明何以判断成功、失败或不确定 | 防止局部通过掩盖最终目标失败 |

这是一份工程数据契约，而不是论文的训练格式。它的价值在于让数据来源、观察真实性和验证标准可以被后续审计。

### A.3 为什么不应把“环境真实”简化成“日志更多”

日志长度不是交互真实性的度量。真实环境的价值在于 observation 与此前 action、当前仓库状态存在因果关系：同一命令在不同依赖版本、不同文件状态下可能返回不同结果。把生成的终端文本混入训练数据有时能增加表面多样性，却不能保证模型学到的是可执行系统的状态转移。对任何拟引入工具轨迹的训练集，至少应记录观测的来源、执行时间、环境版本和验证结论。

## 附录 B：`cache.py` 教学案例的逐步拆解

这一节只解释视频中的例子，不把它当成论文实验。

| 步骤 | 静态 patch 样本通常保留什么 | 工作流样本额外保留什么 |
|---|---|---|
| 定位 | 无 | `TTL` 的搜索命中与候选文件 |
| 阅读 | 无 | 缓存入口、调用点和时间字段的上下文 |
| 首次编辑 | 最终 diff | 修改哪个比较、为什么该处成为候选 |
| 验证 | 常被省略 | 失败测试与时区相关的报错 |
| 修订 | 最终正确代码 | 根据失败反馈统一时间标准的下一步 |
| 结果 | patch 内容 | 全部目标测试通过的 verifier 结果 |

如果训练只看最终 diff，模型主要从代码模式中学习“这类 bug 往往怎样改”；如果训练看完整轨迹，模型还会学习“什么时候要先找 TTL、何时应从失败测试回到时间表示”。后一种学习是否真的提高某一产品的成功率，仍须用该产品自己的环境与评测验证。

## 附录 C：落地时的最小评估矩阵

将 agent-native 思路用于新系统前，可以把评估分开，避免只看一个最终成功率：

| 层次 | 可测问题 | 示例指标 |
|---|---|---|
| 信息连续性 | action 前是否具备部署中可得的必要上下文 | 检索命中后编辑成功率、oracle-context 差距 |
| 观察真实性 | observation 是否来自实际环境 | 可回放比例、执行日志与状态快照覆盖率 |
| 局部验证 | 工具或测试信号是否可信 | verifier 精确率、误报 / 漏报、可复现率 |
| 端到端效果 | 轨迹是否完成真实任务 | 独立 holdout 的任务成功率、回归率 |
| 风险 | 数据与动作是否可接受 | 身份信息泄露率、许可证、不可逆操作比例 |

论文的结果提示数据结构值得进入这张矩阵；它没有免除对具体产品的安全评审，也没有替代端到端基准。

## 附录 D：原文复现线索与系列位置

论文附录给出的数据 staging 为：$D_{\rm ctx}^{\rm gen}$ 26.7B token 在前，随后训练 Python 子集 $D_{\rm ctx}^{\rm py}$ 41.9B token；完整 $D_{\rm ctx}+D_{\rm env}$ 配方约 73.1B token。文中还报告 $D_{\rm ctx}^{\rm py}$ 的来源在过滤前约涵盖 $1.3\times10^7$ 个 PR、$7.4\times10^5$ 个仓库；这些是数据来源规模，不能与最终训练 token 数直接混为一谈。

本系列上一篇 [ICML 2026：Pre-Training、Mid-Training 与 RL 如何划定推理能力边缘]({% post_url 2026-07-28-icml-2026-pre-mid-rl %}) 从控制实验讨论后训练的能力边界；本文给出一条软件 Agent 的数据路径：将真实工作流提前纳入 mid-training。若再结合 [ICML 2026：RL 为什么会撞上 Base Model Barrier？]({% post_url 2026-07-29-icml-2026-base-model-barrier %})，可以得到一个系列层面的研究假设：先提高可采样的有效行为覆盖，再使用可靠反馈做后训练，可能比让 RL 从静态分布中独自发现完整工具协议更节省样本。这个假设不是 daVinci-Dev 单篇论文的定理，应该在不同任务上独立检验。
