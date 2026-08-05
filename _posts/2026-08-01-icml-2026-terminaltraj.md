---
layout: post
title: "TerminalTraj：命令成功，为什么奖励仍然是 0？"
date: 2026-08-01 10:00:00 +0800
summary: "从 Docker 环境、任务生成到任务专属 verifier，梳理 TerminalTraj 如何构造可执行、可复查的终端 Agent 轨迹；工程推论与尚未解决的问题收在文末。"
tags: [ICML 2026, Terminal Agent, Agentic Data, Docker, Verifiable Reward, TerminalTraj]
category: LLM Post-training
cover: /assets/posts/icml-2026-terminaltraj/images/01.png
body_class: dpo-unchained-post
series: icml-2026-agent-posttraining
---

# 命令退出码为 0，为什么任务奖励仍然应该是 0？

一条终端命令正常退出，只说明 shell 接受并运行了这条命令；它并没有说明任务的目标状态已经成立。删除缓存时可能连需要保留的文件一起删掉，修改权限时可能改错对象，启动服务时也可能只是进程仍在、端口和响应却不对。

ICML 2026 Spotlight 论文 [TerminalTraj: Large-Scale Terminal Agentic Trajectory Generation from Dockerized Environments](https://openreview.net/forum?id=PeFSCRulgy) 的重点因此不是“再生成更多终端文本”，而是把 **环境、任务、轨迹和验证器** 做成一条可以重放的闭环。论文报告从约 90 万 GitHub 候选仓库筛出约 32K Docker 镜像，并产出 50,733 条经执行验证的终端轨迹。

<div class="source-list">
  <a href="https://openreview.net/forum?id=PeFSCRulgy">OpenReview</a>
  <a href="https://arxiv.org/abs/2602.01244">arXiv</a>
  <a href="https://github.com/multimodal-art-projection/TerminalTraj">Code & data</a>
</div>

> **本文主线：** 对终端 Agent，稀缺资产不是一串看起来像专家操作的命令，而是一条在真实环境中执行、并能由任务专属程序验收的成功轨迹。

## 12 张场景卡：从“能跑”走到“能验收”

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/01.png' | relative_url }}" alt="命令退出码为零不等于任务完成" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / 反常识问题</p>

## 退出码是执行信号，不是任务语义

`exit 0` 是一次命令调用的局部信号。它不能自动覆盖文件系统、权限、数据库或服务状态这些任务层面的约束。若题目要求“删除七天前的缓存，同时保留近七天文件”，`rm -rf cache/` 可能完美执行，却显然没有完成任务。

这一区分决定了训练标签的可信度：若只根据命令退出码或语言模型自评筛选，模型会学到许多“动作表面正确、结果实际错误”的轨迹。TerminalTraj 把此问题写成数据构造条件，而不是靠提示词补救。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/02.png' | relative_url }}" alt="TerminalTraj 论文与数据规模" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / 论文定位</p>

## 这篇论文在补什么数据缺口？

终端任务的难点在于每条样本都依赖一个具体世界：仓库目录、已安装的依赖、系统命令、运行时版本和初始文件状态。静态代码或合并后的 patch 可以告诉模型结果长什么样，却不能完整表达“在这个环境里先观察什么、执行后出现了什么反馈、下一步为何改变”。

TerminalTraj 的管线先构造可执行环境，再从环境内部生成任务，最后让 Agent 实际操作并用代码验证结果。这样保留下来的不是抽象的指令—答案对，而是带有运行时约束的多轮轨迹。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/03.png' | relative_url }}" alt="任务环境轨迹和验证器需要对齐" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / 四者一致</p>

## 一条可靠样本同时依赖四件事

| 对象 | 必须满足的关系 | 否则会发生什么 |
|---|---|---|
| 任务 | 引用镜像中真实存在的文件、依赖和命令 | 任务文字合理，却没有可完成的对象 |
| 环境 | 固定可重放的初始状态 | 同一动作在不同运行时产生不同结果 |
| 轨迹 | 记录 Agent 实际执行的观察与操作 | 训练看到的是事后编写的“成功故事” |
| verifier | 直接检查终态的完成条件 | 把命令完成、文本相似误当任务成功 |

这也是本集的核心判断：数据规模只在四个对象彼此对齐时才有意义。缺任意一环，轨迹都可能适合阅读，却不适合当作可验证监督。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/04.png' | relative_url }}" alt="可复查成功的闭环" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / 记忆点</p>

## 从“像成功”到“可复查成功”

容器的作用是把行为落在一个确定的执行世界里；验证器的作用是把“成功”翻译成机器可检查的条件。两者配合，才能区分演示性轨迹与可复查轨迹。

这也解释了为什么终端轨迹不同于普通对话：观察输出不是装饰性的推理文字。`ls`、`grep`、测试日志和服务响应会改变 Agent 的可见状态；随后动作应当以这些状态为条件。环境交互本身就是监督信号的一部分。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/05.png' | relative_url }}" alt="可执行性与可验证性两个门槛" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / 两个门槛</p>

## Executability 与 verifiability 不能合并成一个词

**Executability（可执行性）** 问的是 Docker 镜像、依赖和命令能否运行。**Verifiability（可验证性）** 问的是任务完成与否能不能由程序判断。前者是生成轨迹的前提，后者是把轨迹变成可靠正样本的条件。

例如测试命令能启动，证明环境有一定可执行性；测试通过、指定文件内容正确、权限满足要求且服务响应符合断言，才构成任务可验证性。把两者分开，能避免用“容器没崩”替代“任务已完成”。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/06.png' | relative_url }}" alt="从候选仓库到已验证轨迹的 TerminalTraj 管线" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / 规模化管线</p>

## 从候选仓库到已验证轨迹，筛选发生了三次

论文的流程可读成三级过滤：先从候选仓库考察许可证、构建性与依赖，得到 Docker 化环境；随后按镜像中真实的项目状态生成任务并采样 Agent 轨迹；最后为任务编写可执行验证逻辑，只留下在相应终态通过的轨迹。

约 32K 镜像和 50,733 条 verified trajectories 不是同一个数字：前者描述可运行环境的广度，后者描述经过最终验收的交互样本数量。将两个口径分开，有助于判断瓶颈是在环境构建、任务生成还是验证筛选。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/07.png' | relative_url }}" alt="Docker aligned 任务从环境内部产生" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Docker-aligned</p>

## 任务不能凭空引用镜像之外的世界

“Docker-aligned”并不只是把任务放进容器后试跑一次，而是要求任务提到的文件、依赖、命令与当前镜像状态相一致。这样做避免一种常见伪样本：容器能启动，任务却假定某个目录、工具或数据集存在，Agent 只能靠猜测或偶然绕过。

冻结镜像也带来可重放性。评估者可以回到相同初始状态复现动作、检验验证器，并分析一个成功轨迹究竟依赖哪些环境条件。这比只保存文字轨迹更接近可审计训练数据。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/08.png' | relative_url }}" alt="多个验证谓词共同决定奖励" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / 任务专属验收</p>

## 合取奖励检查的是终态约束

可以把一个任务的验证抽象成多个谓词 $v_j$：测试是否通过、目标文件是否存在、禁止修改是否没有发生、权限是否正确、服务是否返回预期结果。只有所有关键谓词在终态成立，才令

$$
r(\tau)=\prod_j v_j(\tau)=1.
$$

这不是论文额外提出的通用奖励函数，而是对任务专属可执行验收的紧凑表达。它强调一个事实：奖励来自满足完整任务规格，而非来自一串命令的局部成功次数。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/09.png' | relative_url }}" alt="删除缓存任务必须同时验证删除和保留条件" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / 具体案例</p>

## “该删的删、该留的留”才是可判定的任务

在“清理过期缓存”这个解释性案例中，正确性至少包含两组条件：超过七天的文件应消失，近七天文件应继续存在。仅检查目录变小，或仅检查删除命令的退出码，都无法排除误删。

这个例子说明 verifier 要写成任务约束的组合，而不是对 Agent 行为写模板偏好。它不关心 Agent 是用 `find`、脚本还是其他合法路径完成的；它关心完成后世界是否满足规格。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/10.png' | relative_url }}" alt="TerminalBench 结果与测试时采样表现" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / 实验结果</p>

## 结果应同时读单次表现与采样曲线

在论文采用的 Qwen2.5-Coder 设置下，TerminalTraj-32B 在 TerminalBench 1.0 / 2.0 上分别达到 **35.30% / 22.00%**，并报告 **pass@16 为 63.75%**。论文还观察到训练后的 test-time scaling 曲线更稳定。

`pass@16` 的含义是对同一任务取多次采样时，至少命中一个可用解的比例；它支持“训练后更多采样更能覆盖可用方案”的观察。它不等于每个任务都能通过堆采样解决，更不能脱离模型、测试脚手架和预算直接横向比较。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/11.png' | relative_url }}" alt="终态正确不等于过程安全" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / 证据边界</p>

## verifier 很严格，仍不自动覆盖过程安全

终态验证能够大幅减少“看起来完成”的假正例，却未必发现所有危险中间操作，例如越权修改、破坏无关资源、短暂泄露或不可逆副作用。是否需要把过程约束加入 verifier，取决于具体任务的风险模型；这属于值得继续研究的方向，而非本文论文已经证明解决的问题。

同样需要单列的还有环境构建成本、仓库间的重复度与数据污染风险。大规模数据报告应说明最终样本数，也应尽量说明样本为何被保留、哪些仓库或任务类型被系统性排除。
</div>
</section>

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/icml-2026-terminaltraj/images/12.png' | relative_url }}" alt="第二季前两集的关联" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / 本集回收</p>

## 先让行为落地，再让成功可判定

如果说 daVinci-Dev 关注把真实的软件工作流带入训练，TerminalTraj 补上的就是规模化的环境落地与任务专属验收。二者共同指向一个训练数据原则：行动、观察和结果不能被各自单独保存后再拼接。

对读者而言，最实用的检查问题不是“这条轨迹有没有很多步骤”，而是“我能否在同一初始状态重放它，并由独立代码确认它完成了什么？”
</div>
</section>

## 附录与延伸讨论

以下内容是基于论文框架整理出的工程检查清单，不应写回为论文的实证结论。

### 为终端 verifier 设计三类断言

1. **目标断言：** 所需文件、测试、服务输出或数据库状态已经达到目标。
2. **禁止断言：** 不该修改的路径、权限、配置或资源仍然保持约束。
3. **重放断言：** 验证从冻结初始状态可重复执行，且不依赖未声明的外部状态。

过程风险很高的任务还可以额外记录允许的副作用与资源边界；但这会提高验证成本，不能假定一套规则适用于所有终端任务。

### 资料与制作边界

- 本页只保留并使用 12 张 PNG 场景卡；原始视频、音频和构建产物均未纳入站点。
- 规模、方法和 TerminalBench 指标以论文及其公开项目资料为准。
- 缓存清理、过程安全和 verifier 设计清单用于说明验收逻辑与工程讨论，不是论文报告的通用实现或新增实验结果。
