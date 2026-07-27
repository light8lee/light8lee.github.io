---
layout: post
title: "ACL 2026 反馈优化（三）：用户行为到底在教 Agent 什么？"
date: 2026-07-27 09:00:00 +0800
summary: "详解 Copilot Feedback、PAMU 与 MASC：拒绝标签怎样训练自动化门控，短期与长期偏好怎样更新记忆，以及多 Agent 系统怎样在错误扩散前完成步骤级纠错。"
tags: [ACL 2026, Agent, Behavior Feedback, Human Feedback, Preference Memory, Critic, Multi-Agent, Copilot, PAMU, MASC]
category: LLM Post-training
cover: /assets/posts/acl-2026-behavior-feedback/images/01.png
body_class: video-notes-post
series: feedback-optimization
---

# 拒绝、偏好和异常，不是同一种反馈

用户点了“拒绝”，究竟是在说 Agent 做错了，还是动作可以接受、但表达方式不合习惯？在企业工作流里，操作员是否愿意放行一个动作；在长期对话里，用户希望回答呈现成什么样；在多 Agent 轨迹里，当前一步是否偏离正常执行链——这三类问题都与“行为”有关，却对应三种完全不同的监督语义。

本章讨论三篇 ACL 2026 工作：

- **Copilot Feedback** 从操作员接受、拒绝与覆盖行为中训练动作 policy（策略模型）和 Critic（评估器），学习哪些关键动作可以自动执行；
- **PAMU（Preference-Aware Memory Update，偏好感知记忆更新）**把用户偏好拆成五个维度，用短期 Sliding Window（滑动窗口）与长期 EMA（指数移动平均）共同更新偏好记忆；
- **MASC（Metacognitive Self-Correction，元认知自我纠错）**不等待用户事后表态，而是从正常轨迹学习步骤级异常边界，在错误进入下游 Agent 前触发专用纠错 Agent。

三者分别更新**自动化门控、偏好提示和当前轨迹**。把它们压成同一个 reward（奖励），会同时丢掉“谁在反馈、反馈针对什么、何时生效”这三类关键信息。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/01.png' | relative_url }}" alt="行为反馈中的拒绝不等于客观错误" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / Thesis</p>

## 拒绝不是无噪声的错误标签

Copilot Feedback 分析了连续四天生产环境中的 **9,370 次拒绝**。人工复核后，只有 43.2% 可归为模型错误；37.2% 是动作本来可以接受，但操作员仍选择了其他路径；6.9% 来自环境限制，其余 12.7% 属于其他原因。

因此，`reject` 至少可能混合四种语义：

1. **任务错误**：动作、参数、路由或上下文判断确实不对；
2. **操作偏好**：存在多条都可行的流程，操作员选择了另一条；
3. **表达偏好**：内容大体正确，但语气、措辞或详略不合预期；
4. **环境故障**：界面、权限或系统状态阻止了原动作。

如果把这四类信号统一写成负奖励，模型可能为了迎合某位操作员而放弃正确动作，也可能把暂时的界面故障学成永久规则。行为反馈的第一步不是更新模型，而是先把标签语义拆开。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/02.png' | relative_url }}" alt="Copilot、PAMU 与 MASC 分别处理自动化、偏好和轨迹异常" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / Signal Map</p>

## 三篇论文处理的是三种信号

| 方法 | 观察到的信号 | 它回答的问题 | 直接更新对象 | 生效时间 |
|---|---|---|---|---|
| Copilot Feedback | 操作员接受、拒绝、覆盖动作 | 关键动作是否应自动执行？ | action policy、Critic 与阈值 | 周期训练 + 在线门控 |
| PAMU | 用户与助手的语言、长度、情绪、密度、正式度 | 下一轮回答应呈现成什么样？ | preference memory 与生成 prompt | 每轮对话 |
| MASC | 问题、角色、前序历史与当前步骤表示 | 当前步骤是否偏离正常执行链？ | 当前消息与共享历史 | 每个 Agent 步骤 |

这张表也解释了为什么 MASC 不能被称为“从用户反馈学习”：它主要使用正常执行轨迹训练检测器，异常分数来自系统内部的因果一致性，而不是用户接受或拒绝。反过来，PAMU 追踪的是个性化表达，不应改写业务政策或安全边界。
</div>
</section>

---

## Copilot Feedback：先学会什么时候不自动化

论文：[Learning Selective LLM Autonomy from Copilot Feedback in Enterprise Customer Support Workflows](https://aclanthology.org/2026.acl-industry.141/)（ACL 2026 Industry Track）。

研究场景是企业客服 BPM（Business Process Management，业务流程管理）界面。任务包含结构化 UI 状态、工具动作、向客户发送文本以及关闭或转交会话。与开放网页 Agent 不同，这里的动作空间和业务流程更受控，但一次错误仍可能影响客户或组织，因此作者没有直接追求端到端全自动，而是把自主程度分阶段提高。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/03.png' | relative_url }}" alt="Logging、Copilot 与 Selective Automation 三阶段部署" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / Deployment</p>

## 部署不是一步跳到全自动

论文把上线拆成三个阶段：

1. **Logging**：记录操作员看到的 UI 状态与采取的动作。界面被转换成 schema 驱动的 JSON 状态，图像快照只作为上下文证据；这些 state-action 对用于监督微调 next-action policy。
2. **Copilot**：policy 提出下一动作。普通、低风险动作可以直接执行；关键动作由操作员接受或覆盖。被覆盖时，系统同时得到“原提议被拒绝”和“人类实际做了什么”两类记录。
3. **Selective Automation**：用 Copilot 阶段的接受/拒绝日志训练 Critic。校准期仍由人工审查最终关闭动作；稳定后，只有 Critic 放行的关键动作才端到端自动执行，其余交还人工。

这里的渐进部署本身就是数据生成机制：Logging 提供模仿学习样本，Copilot 暴露模型在真实流量中的难例，Selective Automation 再把这些难例转成可控的 abstention（拒答/转人工）边界。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/04.png' | relative_url }}" alt="Critic 以状态、提议动作和接受拒绝标签训练" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / Labels</p>

## Critic 标签与 policy 纠正样本必须分开

训练 Critic 的一个样本包含：序列化状态 $s$、policy 提议的关键动作 $a$，以及操作员对**这个提议**的接受或拒绝标签。提议被接受为正例，被拒绝为负例。

操作员覆盖提议后真正执行的纠正动作，可以回流为 action policy 的新监督样本；但它不应替代 Critic 对原提议的标签。两条训练路径分别回答：

- **Policy**：在状态 $s$ 下，人类最终选择了哪个动作？
- **Critic**：给定状态 $s$ 和提议 $a$，操作员会不会接受它？

论文只在关键动作上收集 accept/reject。非关键动作可以绕过 Critic，因此“没有拒绝日志”并不表示所有普通动作都被人工确认正确。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/05.png' | relative_url }}" alt="生成式 Critic 输出 accept 或 reject token 并转换为概率" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / Critic Model</p>

## 从一段状态动作对话得到一个分数

Critic $c_\phi(s,a)$ 与动作 policy 都从 **Qwen2.5-7B-Instruct** 初始化。输入沿用 policy 的序列化 state-action 对话格式，再附上当前提议动作。监督微调要求模型只生成一个 token：`accept` 或 `reject`。

对两个 token 的 logit 做 softmax，`accept` 的概率作为标量分数：

$$
c_\phi(s,a)=P_\phi(\texttt{accept}\mid s,a)\in[0,1].
$$

论文选择这种生成式二分类，而不是在模型顶部新接 classification head。作者报告前者训练更稳定，因为它复用了 policy 已经形成的表示，也不需要引入新的分类头参数。

这个分数的准确名称应是“被接受概率的代理”，不是“动作客观正确率”。两者相关，但 37.2% 的可接受拒绝已经证明它们并不等价。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/06.png' | relative_url }}" alt="Critic 分数与阈值控制自动执行或转交人工" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / Automation Gate</p>

## 分数只有进入门控才产生部署价值

Policy 先提出 $\hat a\sim\pi_\theta(\cdot\mid s)$。若它是关键动作，系统才计算 Critic 分数并执行门控：

$$
\text{decision}(s,\hat a)=
\begin{cases}
\text{execute}, & c_\phi(s,\hat a)\ge \tau,\\
\text{handoff to human}, & c_\phi(s,\hat a)<\tau.
\end{cases}
$$

阈值 $\tau$ 先在留出的 Copilot 数据上离线初始化，再在 calibration 阶段依据滚动的关键动作 precision、最终关闭动作拒绝率和纠正介入率继续调整。论文给出的示例业务目标是：在 Critic 放行的动作中，操作员接受比例至少达到 0.9。

阈值还可以按动作重要性分层。发送客户消息、关闭会话与普通界面点击的风险、可逆性和影响范围不同，用一个全局阈值很容易让低风险动作过度保守，或让高风险动作过度自动化。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/07.png' | relative_url }}" alt="九千三百七十次拒绝的原因分布" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Label Noise</p>

## 为什么接受标签仍不能当作“正确答案”

作者先按“模型建议了什么、操作员改做了什么”把拒绝事件划为七个动作组，再从每组随机抽取 100 个样本。标注员读取完整状态、模型提议与人类替代动作，写下自由文本原因并标注类别；最后把样本比例外推到四天的全部拒绝事件。

| 高层原因 | 比例 | 对训练的含义 |
|---|---:|---|
| 模型错误 | 43.2% | 可以作为改进动作策略的重要难例 |
| 可接受但被拒绝 | 37.2% | 混合个人偏好、可选步骤和表达差异 |
| 环境限制 | 6.9% | 应进入环境诊断，不应惩罚正常策略 |
| 其他 | 12.7% | 需要更细粒度标注后才能归因 |

这些比例来自分组抽样后的估算，并非逐一人工复核 9,370 条事件。即便如此，它仍足以揭示：二元接受标签对自动化门控有用，却太粗，不适合作为所有更新通道的统一真值。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/08.png' | relative_url }}" alt="专用 Critic、动作类型和阈值校准共同决定 Copilot 证据边界" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / Evidence</p>

## Copilot 的证据回答了什么

离线实验中，直接用动作模型 confidence 充当门控，precision / recall / F1 为 70.84 / 73.43 / 70.96；专门用人类接受/拒绝日志 SFT 的 Critic 为 **74.68 / 73.53 / 73.99**。主要收益来自 precision 与 F1，recall 基本相同。这说明显式人类监督比原 policy 的置信度更能学习“应执行还是应转人工”。

线上一周的关键动作接受率进一步显示动作类型差异：`click_control` 为 86.73%，`close_chat` 为 84.81%，`transfer_chat` 为 91.7%，自由文本 `send_text_to_chat` 只有 50.81%。程序化动作更适合先自动化；自然语言更容易受语气、措辞与政策约束影响。

这篇论文证明的是**结构化企业流程中的选择性自治**，不是开放环境里的无限自主。结果来自单一企业的私有数据，且生产系统有切片监控、快速回滚与人工兜底。
</div>
</section>

---

## PAMU：偏好需要同时记住“最近”和“长期”

论文：[Preference-Aware Memory Update for Long-Term LLM Agents](https://aclanthology.org/2026.findings-acl.38/)（Findings of ACL 2026）。

许多长期记忆系统擅长存储事实，却默认用户偏好稳定不变。现实中，“简短一点”可能只是当前赶时间，也可能是持续数周的固定习惯。PAMU 的目标是用两个时间尺度区分短期突变与长期趋势，再把当前偏好显式写入下一轮生成 prompt，而不修改基础模型参数。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/09.png' | relative_url }}" alt="PAMU 将用户偏好拆为语气、长度、情绪、信息密度和正式度" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / Preference Vector</p>

## 五维向量不是五个同类型标量

每轮偏好向量写作 $p_t=(s_t,l_t,e_t,d_t,f_t)$：

- **Tone style（语气）**：RoBERTa 多分类器输出类别概率分布，保留最大类别与分数；
- **Response length（回答长度）**：统计模型输出 token 数，对过去 $K$ 轮平均并归一化到 $[0,1]$；
- **Emotional tone（情绪）**：情绪分类器读取用户与助手话语，输出类别概率向量；
- **Information density（信息密度）**：OpenIE 抽取 `(subject, predicate, object)` 三元组，以 $ID_t=K_t/L_t$ 衡量每词承载的知识单元数；
- **Formality（正式程度）**：分类器给出 $[0,1]$ 分数，0 表示口语化，1 表示书面正式。

长度、密度和正式度是连续值；语气与情绪是类别概率向量。对类别维度 $d$，分类器在第 $t$ 轮输出完整向量

$$
q_t^{(d)}=[P(c_1),P(c_2),\ldots,P(c_K)],
$$

同时记录当前最大概率类别 $c_t^{(d)}=\arg\max_j q_t^{(d)}[j]$。论文把这一轮状态记作 $(c_t^{(d)},q_t^{(d)})$。例如语气类别为 `[humorous, neutral, serious]` 时，`[0.10, 0.25, 0.65]` 表示当前最可能是 `serious`，但另外两类的不确定性仍被保留。

后续 SW 和 EMA 平滑的是**完整概率向量的每个分量**，不是只平均最大类别的编号，也不是把 `serious` 这类字符串直接送进公式。语气和情绪各自拥有独立的类别集合与独立向量，分别完成更新。

原文这里有一处表述张力：偏好提取小节一度把 tuple 描述为“最大类别及其分数”，但类别动态建模小节又明确把 $q_t^{(d)}$ 定义为 probability distribution，并在式（7）—（9）中对它做向量平均。只有保留完整分布，这三条公式才成立。因此本文按论文的正式公式解释；如果实现只保存 top-1 类别和一个 confidence，就无法原样执行论文写出的类别 SW/EMA。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/10.png' | relative_url }}" alt="Sliding Window 对最近 W 轮偏好做等权平均" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / Short Term</p>

## SW：快速响应最近变化

对连续偏好维度 $d$，最近 $W$ 轮的滑动平均为：

$$
SW_t^{(d)}=\frac{1}{W}\sum_{i=t-W+1}^{t}p_i^{(d)}.
$$

若 $W=3$，最近三轮正式度分别为 0.2、0.8、0.9，则 $SW_t=0.63$。窗口内每轮权重相同，窗口外历史完全退出。

它的优点是对变化响应快；缺点也来自同一性质：一次临时要求或分类器误判可能迅速改变当前估计。$W$ 越小越敏感，越大越平滑，但切换偏好时反应更慢。因此 SW 适合表达“最近意图”，不适合单独充当长期档案。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/11.png' | relative_url }}" alt="EMA 用上一轮长期状态和当前偏好递推" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / Long Term</p>

## EMA：把整段历史压成一个递推状态

长期估计不保存所有旧值，而是递推：

$$
EMA_t^{(d)}=\beta EMA_{t-1}^{(d)}+(1-\beta)p_t^{(d)},\qquad \beta\in(0,1).
$$

$\beta$ 越大，旧状态权重越高，长期记忆越稳；$\beta$ 越小，当前轮影响越大。与固定长度窗口不同，EMA 不会让第 $W+1$ 个旧样本突然归零，而是让影响指数衰减。

论文报告在消融中，中等融合权重 $\lambda\in[0.4,0.7]$ 与 $\beta\in[0.8,0.95]$ 较稳定。但这些范围来自论文自己的实验设置，并不是跨任务通用默认值；换到不同轮数、分类器噪声或用户切换频率时仍需重新校准。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/12.png' | relative_url }}" alt="PAMU 融合 SW 和 EMA，并在冲突时优先短期偏好" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / Fusion</p>

## SW 与 EMA 不是二选一

PAMU 先融合短期与长期估计：

$$
\hat w_t^{(d)}=\lambda SW_t^{(d)}+(1-\lambda)EMA_t^{(d)},
$$

再计算分歧：

$$
C_t^{(d)}=\left|SW_t^{(d)}-EMA_t^{(d)}\right|.
$$

当 $C_t^{(d)}>\delta$ 时，系统认为最近意图与长期习惯发生冲突，优先采用短期 SW。冷启动前五轮用前 $W$ 轮全局平均初始化 EMA，并令 $\lambda=1$，在历史不足时完全依赖 SW。

### 语气和情绪的类别概率向量怎样使用

对语气或情绪这样的类别维度，原文式（7）—（10）把上述过程明确写成向量运算：

$$
SW_t^{(d)}=\frac{1}{W}\sum_{i=t-W+1}^{t}q_i^{(d)},
$$

$$
EMA_t^{(d)}=\beta EMA_{t-1}^{(d)}+(1-\beta)q_t^{(d)},
$$

$$
\hat w_t^{(d)}=\lambda SW_t^{(d)}+(1-\lambda)EMA_t^{(d)},
$$

$$
c_t^{(d)}=\arg\max_j\hat w_t^{(d)}[j].
$$

假设语气类别依次是 `[humorous, neutral, serious]`，最近两轮分类结果为 `[0.10,0.20,0.70]` 与 `[0.05,0.15,0.80]`，则 $SW=[0.075,0.175,0.75]$。若旧的长期状态仍偏幽默，为 `[0.70,0.20,0.10]`，取 $\beta=0.9$ 后，新 $EMA=[0.635,0.195,0.17]$。再取 $\lambda=0.6$，融合向量约为：

$$
\hat w=[0.299,0.183,0.518].
$$

最大项是第三项，因此控制标签选择 `serious`。**自然语言生成阶段不会把整个 `[0.299,0.183,0.518]` 向量交给 LLM**；PAMU 根据类别索引查回描述词，把它写成 `[Tone: serious]`。情绪向量同理，例如最大项映射为 `[Emotion: relaxed]`。连续维度则先离散为可解释标签，例如 $[0,0.33)$ 为 sparse、$[0.33,0.66)$ 为 moderate、$[0.66,1]$ 为 dense。

最终五个描述词被拼成类似 `Tone: serious; Emotion: relaxed; Length: detailed; Density: dense; Formality: formal` 的结构化自然语言指令，附加到下一轮 prompt。概率向量负责在多轮之间平滑不确定性，`argmax + 标签表` 才负责把结果变成自然语言控制词。

### 原文在“类别冲突检测”上没有写完的细节

论文统一写了 $C_t^{(d)}=|SW_t^{(d)}-EMA_t^{(d)}|$，并说当 $C_t^{(d)}>\delta$ 时优先短期 SW。对连续维度这是一个标量；对类别维度，两者都是向量，原文没有进一步说明应使用逐元素阈值、最大差值、$L_1$ 距离还是 $L_2$ 距离将其化为标量。因此可以确定的是“冲突时优先 SW”，但不能从论文中确定类别向量的具体 divergence reduction。本文不替论文补造这一实现细节。

这种方案优点是可读、模型无关；代价是最终只保留最大类别，融合向量中次高类别与置信程度不会出现在示例 prompt 中，连续值离散化也会损失粒度，效果还依赖基础模型的指令遵循能力。
</div>
</section>

---

## MASC：不等最终答案，先修当前一步

论文：[Metacognitive Self-Correction for Multi-Agent System via Prototype-Guided Next-Execution Reconstruction](https://aclanthology.org/2026.findings-acl.1168/)（Findings of ACL 2026）。

多 Agent 系统的危险不只是单步出错，而是错误消息会作为“已知事实”进入共享历史，被下游角色继续引用。MASC 将步骤级错误检测表述为**由历史条件化的无监督异常检测**：仅用正常轨迹训练一个正常执行模型，再在每一步输出后立即打分和纠正。

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/13.png' | relative_url }}" alt="MASC 根据问题和历史预测正常下一步并比较真实输出" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">13 / Next Execution</p>

## 核心改动是预测“正常下一步”

普通 reconstruction-based anomaly detection（基于重建的异常检测）尝试重建当前输入；但 Agent 的错误步骤可能语言流畅、语义也与正常步骤接近，只有放回特定问题和执行历史才显得异常。

MASC 因此不重建当前句子，而使用任务问题 $Q$ 和前序角色—输出历史

$$
H_{t-1}=\{(R_j,O_j)\}_{j=1}^{t-1}
$$

预测正常情况下第 $t$ 步应落在什么表示位置 $\hat x_t$，再与真实当前步表示 $x_t$ 比较。这个目标迫使检测器学习角色之间的因果执行顺序，而不只是句子的表面流畅度。第一步没有历史时，输入只包含投影后的问题表示，因此尤其需要后面的 prototype（原型）提供稳定参照。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/14.png' | relative_url }}" alt="MASC 只用正常轨迹训练冻结 LLM、投影层、预测头和正常原型" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">14 / Training</p>

## 检测器只用正常轨迹训练

问题、角色与历史输出先经编码器得到稠密表示；问题和历史分别通过可训练线性投影，进入冻结的预训练 LLM。可训练预测头 $f_\theta$ 输出下一步表示：

$$
\hat x_t=f_\theta\!\left(LLM(\tilde q,\tilde h_1,\ldots,\tilde h_{t-1})\right).
$$

同时学习正常步骤原型 $p$。论文用单头 attention，以原型为 query、当前正常轨迹的预测表示为 key/value 更新它；这比静态 KMeans 中心更能利用上下文依赖。

训练目标由两项组成：

$$
L_{recon}=\frac{1}{T}\sum_{t=1}^{T}\|\hat x_t-x_t\|_2^2,
$$

$$
L_{proto}=\frac{1}{T}\sum_{t=1}^{T}\left(1-\cos(\hat x_t,p)\right),
$$

$$
L=L_{recon}+\lambda L_{proto}.
$$

训练数据不需要步骤级错误标签；冻结 LLM 后，主要训练投影层、预测头与 prototype 模块。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/15.png' | relative_url }}" alt="MASC 将重建残差与原型偏离加权合成异常分数" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">15 / Anomaly Score</p>

## 推理时两种偏离合成步骤级分数

当前输出产生后，检测器根据前序上下文预测 $\hat x_t$，再计算：

$$
s(t)=\alpha\|\hat x_t-x_t\|_2^2+\beta\left(1-\cos(\hat x_t,p)\right).
$$

第一项是**预测残差**：历史充分时，它强调当前输出是否符合问题与前序步骤的因果关系。第二项是**原型偏离**：开局历史很短或上下文噪声较多时，它提供正常步骤的稳定中心。

训练损失中的 $\lambda$ 与推理打分中的 $\alpha,\beta$ 不是同一参数。最终还需要阈值 $\delta$ 把连续异常分数变成“保留/纠正”的二元决策。论文的敏感性分析显示不同数据的最佳 $\lambda$ 不同，也意味着异常门槛不能不经校准直接迁移。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/16.png' | relative_url }}" alt="MASC 超过阈值后调用专用纠错 Agent 并替换共享历史" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">16 / Intervention</p>

## 过阈值后不是让原 Agent 重试

MASC 的写回规则是：

$$
\widetilde O_t=
\begin{cases}
O_t,&s(t)\le\delta,\\
\pi_{corr}(H_{t-1},O_t,P_{corr}),&s(t)>\delta.
\end{cases}
$$

低于阈值时，原输出直接进入历史；高于阈值时，系统调用独立的 correction agent，把前序历史、被标记输出和纠正指令 $P_{corr}$ 一起交给它重写。

### Embedding 不会被直接“翻译”回自然语言

这里存在一条很容易误读的边界：$\hat x_t$、$x_t$ 与 prototype $p$ **只用于计算异常分数**。论文没有定义从 $\hat x_t$ 到文字的 decoder，也没有把向量作为 correction agent 的自然语言输入。

真正的文本恢复重新使用原始符号信息：

| 检测路径 | 纠错路径 |
|---|---|
| $Q,H_{t-1},O_t \rightarrow \hat x_t,x_t,p \rightarrow s(t)$ | $Q,H_{t-1},O_t,R_t,P_{corr} \rightarrow$ LLM 反思 $\rightarrow \widetilde O_t$ |
| 输出连续异常分数 | 输出结构化自然语言 |

论文附录的 Recovery Prompt 把 correction agent 设定为原 Agent 的角色，提供三项输入：原始问题 `question`、先前回答 `mas.history`，以及可用的前序步骤 `agent.spatialinfo()`。模型必须重新检查先前回答；若认为原回答正确，明确返回无需修正并复述原文；若发现错误，则生成修订版本。输出固定为：

```json
{
  "correction_needed": "Yes",
  "final_response": "修正后的自然语言回答"
}
```

若无需纠正，`correction_needed` 改为 `No`，并在 `final_response` 中复述原回答。

系统读取 `final_response` 作为 $\widetilde O_t$。关键不只是生成了修订文本，而是 $\widetilde O_t$ **替换** $O_t$ 写入共享历史 $H_t$。下游 Agent 只会看到修正后的消息，因此错误在源头被截断。MASC 不更新原任务 policy；其额外成本来自每步检测和触发时的语言模型纠错调用。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/17.png' | relative_url }}" alt="至少三项被误写为至多三项后由 MASC 发现、重写并传给下游" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">17 / Worked Example</p>

## 一个错误怎样被发现、修正并写回

假设任务要求提交“至少三项凭证”。前一位 Agent 却把约束写成“至多三项”。这句话单独看语法正确，甚至可能与后续推导内部一致；问题在于它违反了原问题和前序历史的因果约束。

MASC 根据 query 与 $H_{t-1}$ 预测正常下一步表示，发现它与真实输出的距离显著增大；异常分超过 $\delta$ 后，correction agent 恢复“至少三项”，再用修正结果替换原消息。后续核验 Agent 接收到的不是一段“附带错误说明”的双版本历史，而是已经纠正的单一约束。

这个报销案例用于解释机制，不是论文原始样例。论文附录展示的案例覆盖数学推理和会计披露题，核心现象同样是局部步骤的错误被下游角色继续放大。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/18.png' | relative_url }}" alt="MASC 的证据、训练对象和方法边界" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">18 / Evidence & Boundary</p>

## 检测器质量决定纠错是增益还是伤害

在不提供问题标准答案的 Who&When 条件下，LLaMA-3.1-8B 版本 MASC 在 handcrafted / automated 子集达到 **77.84 / 75.62 AUC-ROC**。集成到 Chain、Complete、Random、Debate 多 Agent 拓扑后，六个基准平均提升约 1.29 个百分点；Debate 平均准确率从 87.53 提升到 88.89。

但“加一个纠错 Agent”并不会自动变好。在 GSM8K 三种拓扑上，MASC 平均提升 2.46；Step-by-Step 检测器平均下降 0.86，LLM classifier 平均下降 0.85，BERT classifier 只提升 0.49 且不稳定。误报会把正确步骤送去重写，弱检测器可能比不纠错更差。

MASC 还假设系统能查看 Agent 间的内部消息，并依赖预设异常阈值；只暴露最终结果的黑盒系统无法直接使用。它证明的是正常轨迹学习与阈值纠错在论文基准上的有效性，不是所有多 Agent 系统的通用保证。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/19.png' | relative_url }}" alt="在同一企业报销流程中 Copilot、PAMU 和 MASC 更新不同对象" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">19 / Unified Case</p>

## 放回同一条报销流程，三者改哪里

假设企业报销 Agent 需要识别费用类别、检查凭证并生成员工说明：

1. **Copilot Critic** 判断“提交费用类别”这个关键动作能否自动执行。分数低时转人工；人工覆盖后的正确动作进入 policy 训练数据，原提议的接受/拒绝进入 Critic 数据。
2. **PAMU** 观察该操作员长期偏好“正式、简短、先结论后依据”，把这组状态写进下一轮生成 prompt。它只改变说明文字的呈现，不改变费用政策。
3. **MASC** 发现某一步把“至少三份凭证”写成“至多三份”，当场触发纠错并替换共享历史，避免错误进入审批 Agent。

三者可以组合，但需要保留四套状态：任务正确性、用户偏好、自动化边界与步骤异常。一个总 reward 无法表达“文字风格被拒绝，但费用分类正确，动作仍可在低风险场景自动执行”这种现实情况。

这里的组合是本系列提出的工程框架，三篇论文没有联合实现或验证这一系统。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/acl-2026-behavior-feedback/images/20.png' | relative_url }}" alt="Copilot Feedback、PAMU 和 MASC 的论文标题作者与会场" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">20 / Sources</p>

## 三篇论文的一句话边界

1. **Copilot Feedback**：Nikita Borovkov, Elisei Rykov, Olga Tsymboi, Sergei Filimonov, Nikita Surnachev, Dmitry Bitman, Anatolii Potapov. [*Learning Selective LLM Autonomy from Copilot Feedback in Enterprise Customer Support Workflows*](https://aclanthology.org/2026.acl-industry.141/). ACL 2026 Industry Track.——学习真实业务里的动作接受边界，但不是完全自治。
2. **PAMU**：Haoran Sun, Zekun Zhang, Shaoning Zeng. [*Preference-Aware Memory Update for Long-Term LLM Agents*](https://aclanthology.org/2026.findings-acl.38/). Findings of ACL 2026.——追踪会变化的表达偏好，但不负责判断业务正确性。
3. **MASC**：Xu Shen, Qi Zhang, Song Wang, Zhen Tan, Xinyu Zhao, Laura Yao, Vaishnav Tadiparthi, Hossein Nourkhiz Mahjoub, Ehsan Moradi Pari, Kwonjoon Lee, Tianlong Chen. [*Metacognitive Self-Correction for Multi-Agent System via Prototype-Guided Next-Execution Reconstruction*](https://aclanthology.org/2026.findings-acl.1168/). Findings of ACL 2026.——从正常轨迹学习异常边界，但不是用户反馈方法。
</div>
</section>

---

<section class="post-appendix" markdown="1">

## 附录 A：Copilot 没有放进主图的完整实验

### A.1 领域 SFT 不是可省略的前置步骤

所有模型接收相同会话上下文时，最佳 zero-shot prompted model 的 tool accuracy 为 47.78%，论文的 Qwen2.5-7B SFT policy 达到 79.15%；action accuracy 分别为 32.93% 与 65.48%。这不是通用模型能力排名，而是说明该企业 BPM 的状态、动作和业务逻辑足够专门化，仅靠示例 prompt 无法替代领域监督微调。

### A.2 历史日志与拒绝难例怎样混合

| 预定义历史日志 | 拒绝纠正样本 | 历史集准确率 | 拒绝难例集准确率 |
|---:|---:|---:|---:|
| 170k | 0 | 71.25 | 14.88 |
| 100k | 20k | 69.77 | 21.76 |
| 100k | 40k | 69.52 | 25.74 |
| 170k | 40k | **71.07** | **25.72** |

只加入拒绝样本会改善难例，却可能牺牲原分布；保留 170k 历史日志并加入 40k 拒绝纠正，在基本维持历史集准确率的同时显著提高拒绝难例表现。这是一种 replay 与新反馈的稳定性—适应性权衡。

论文还尝试在相同单步反馈上做 APO / DPO：SFT baseline action accuracy 为 76.03%，SFT+APO 为 68.73%，SFT+DPO 为 69.97%。作者将失败归因于工具数据不平衡与拒绝噪声。这个结果进一步说明，二元偏好优化不是处理所有行为日志的默认答案。

### A.3 线上收益来自选择性自动化

| 对照 | 平均操作员活跃时间 | 相对变化 | 解决正确性 |
|---|---:|---:|---|
| 纯人工 → 选择性自动化 | 227.37s → 139.15s | -39% | 无显著下降 |
| 经典 bot → Copilot pipeline | 124.67s → 104.72s | -16% | 基本不变 |
| 强制最终确认 → 自动执行 | 187.66s → 150.13s | -25% | 无显著变化 |

自动模式中 45% 会话端到端完成。这里的平均操作员活跃时间把全自动会话记为 0；结果说明节省来自让高频、低风险、可校准的动作自动运行，而不是取消人工升级通道。

## 附录 B：PAMU 的数据、结果与消融

### B.1 LoCoMo 评估范围

LoCoMo 包含 50 段长对话，平均约 300 轮，最多跨 35 个 session，每段约 9,000 token。论文评估 single-hop 2,705 对、multi-hop 1,104 对和 temporal reasoning 1,547 对问题，指标为 F1 与 BLEU-1。

PAMU 作为外挂模块接入 ReadAgent、MemoryBank、MemGPT 与 A-MEM，不修改这些系统原有记忆操作。实验使用 Qwen2.5-1.5B/3B、LLaMA-7B/30B、LLaMA-3.2-1.5B/3B；每项结果为三个随机种子平均，带星号的提升通过成对 t 检验（$p<0.05$）。

### B.2 结果不能只写成“个性化更好”

以 LLaMA-7B 的 temporal reasoning 为例：

| 记忆方法 | F1：原版 → +PAMU | BLEU-1：原版 → +PAMU |
|---|---:|---:|
| ReadAgent | 12.24 → 15.45 | 11.17 → 15.67 |
| MemoryBank | 14.56 → 19.76 | 11.95 → 17.24 |
| MemGPT | 11.14 → 17.54 | 8.24 → 15.57 |
| A-MEM | **17.55 → 23.23** | **14.67 → 21.46** |

论文在 single-hop、multi-hop 和 temporal reasoning 的多数设置中报告提升，但不同 baseline、模型与指标的幅度并不一致。PAMU 的实验表明偏好提示可以改善长期对话生成，并不意味着五维偏好已经覆盖所有用户意图。

### B.3 每个组件都在消融中提供了独立作用

下面是 LLaMA-7B temporal reasoning 上 F1 与 BLEU-1 的平均值：

| 变体 | ReadAgent | MemoryBank | MemGPT | A-MEM |
|---|---:|---:|---:|---:|
| 去掉 SW | 11.24 | 12.03 | 10.07 | 15.36 |
| 去掉 EMA | 11.35 | 12.47 | 10.78 | 14.05 |
| 固定等权融合 | 13.56 | 16.45 | 15.43 | 20.34 |
| 去掉变化检测 | 12.34 | 13.28 | 12.24 | 16.24 |
| 去掉偏好 Prompt | 11.13 | 12.25 | 9.37 | 15.45 |
| 单一偏好维度 | 12.21 | 16.78 | 14.23 | 18.95 |
| 静态偏好 | 12.34 | 16.21 | 13.24 | 19.47 |
| 完整 PAMU | **15.56** | **18.50** | **16.56** | **22.35** |

完整系统在四个 baseline 上都最高。与此同时，PAMU 依赖多个外部分类器；任何领域偏差都会传播进偏好向量。连续值映射为 brief / moderate / detailed 等文字标签还会损失粒度，五维设计也没有覆盖推理风格、创造性和 persona 等更抽象偏好。

## 附录 C：MASC 的检测与下游纠错证据

### C.1 两类评估不能混在一起

步骤检测使用 Who&When（handcrafted / automated，分别评估有无标准答案）与 AgentErrorBench（GAIA / WebShop 轨迹），报告 AUC-ROC 和步骤定位准确率。端到端纠错则把 MASC 接入固定拓扑，在 MMLU、GSM8K、AQuA、MultiArith、SVAMP、HumanEval 上报告任务准确率。

检测实验统一用 20% 轨迹训练、80% 测试。监督 baseline 把步骤打乱为 mini-batch；MASC 保留完整轨迹做自回归 next-execution reconstruction。端到端系统中的 Agent 使用 GPT-4o-mini，检测表示编码使用 all-MiniLM-L6-v2，不应把这些组件误写成同一个模型。

### C.2 原文中的“向量检测—文本恢复”接口

论文主方法的式（13）把纠错写成 $\pi_{corr}(H_{t-1},O_t,P_{corr})$：输入是**文本历史、原始文本输出与纠错指令**，不是 $\hat x_t$ 或 prototype。附录给出的 Recovery Prompt 又补充了原始 query 与当前 Agent role。完整数据流可以写成：

```text
原始问题 Q + 角色 R_t + 文本历史 H_(t-1)
              │
              ├─ 编码、投影、冻结 LLM、预测头
              │        ↓
              │   x̂_t 与真实 x_t、prototype p
              │        ↓
              │   异常分数 s(t) 与阈值 δ
              │
              └─ 若 s(t) > δ：
                   Q + R_t + H_(t-1) + 原回答 O_t + Recovery Prompt
                                      ↓
                              语言模型生成 JSON
                                      ↓
                         final_response = 修正文本 Õ_t
                                      ↓
                              替换 O_t，写回 H_t
```

Algorithm 2 的表述与此一致：每个节点先编码 query、当前角色与历史，预测 $\hat x_t$，以真实当前步 $x_t=h_t$ 计算异常分数，再通过式（13）更新 $O_t$ 为 $\widetilde O_t$ 并加入修正后的正常轨迹。算法里不存在“反投影 embedding 后生成句子”这一步。

论文的 MMLU 案例也展示了实际接口：数学角色先错误选择会计披露选项 D；异常检测触发恢复后，Recovery Agent 以 JSON 返回 `correction_needed: Yes`，并在 `final_response` 中重新解释权益法投资应披露会计政策，最终改为选项 C。文字来自语言模型重新推理，不来自异常向量的解码。

### C.3 MASC 接入四种拓扑后的完整平均结果

| 拓扑 | 原系统六基准平均 | +MASC | 提升 |
|---|---:|---:|---:|
| Chain | 84.53 | 85.95 | +1.42 |
| Complete | 82.16 | 84.85 | +2.69 |
| Random | 85.33 | 86.41 | +1.08 |
| Debate | 87.53 | 88.89 | +1.36 |

论文汇总的平均增益约为 1.29 个百分点。不同拓扑收益不相同；Complete 图提升较大，并不能直接推出连接越密集越适合 MASC，因为任务、基线和交互结构仍共同影响结果。

### C.4 Reconstruction 与 prototype 为什么互补

去掉 reconstruction objective 会显著损害需要上下文一致性的检测；去掉 prototype 会削弱历史稀疏阶段的稳定参照。论文还比较了 prototype 更新：attention-based 更新在各设置中优于静态 KMeans 中心，因为后者只能表达距离中心，不能建模动态的上下文依赖。

真正的部署风险是阈值与误报成本。MASC 当前依赖手工设定 $\delta$；错误步骤被漏掉会继续传播，正确步骤被误报则会被 correction agent 改坏。上线时应分别校准不同角色、步骤位置和任务风险，而不是只追求一个全局 AUC。

## 附录 D：跨论文组合的工程推论

以下内容是本系列基于三篇论文提出的组合设想，**不是论文已经联合验证的结论**。

### D.1 建立 typed feedback

至少拆分 `task_correctness`、`user_preference`、`environment_failure`、`safety_risk`、`uncertainty` 与 `runtime_anomaly`。每类信号进入不同更新通道：正确性训练 policy，偏好更新记忆，环境故障进入诊断，安全风险提高门槛，异常分数只控制当前轨迹。

### D.2 所有更新都应带 provenance

每条偏好、Critic 阈值和纠错记录至少保存：来源样本、操作者或模型、适用动作/用户/场景、时间窗口、最近验证结果、版本和回滚条件。否则 PAMU 的短期变化可能悄悄固化成长期身份，Copilot 的某次环境拒绝也可能被误写成永久安全边界。

### D.3 用双时间尺度管理整个系统

即时层由 MASC 拦截当前异常、PAMU 的 SW 追踪最近意图；稳定层由 EMA、批量拒绝归因、离线 Critic 校准和周期性 policy 训练处理。只有短期变化持续出现且通过独立验证，才升级为长期记忆或参数更新。

### D.4 组合前先测负迁移

偏好提示可能影响 Critic 输入分布，纠错 Agent 可能改变后续 policy 的状态轨迹，过度保守的 Critic 也可能减少 MASC 能观察到的真实执行数据。组合系统需要单独测试偏好隔离、异常误报、阈值漂移、动作可逆性、OOD 输入与回滚，而不能把三个独立提升简单相加。

## 附录 E：来源与内容边界

- 本文方法、公式、实验数字与限制来自三篇 ACL Anthology 论文及项目中保存的原版 PDF；链接见正文各节与第 20 张卡片。
- 企业报销、“至少三份凭证”等例子是为了统一解释机制而构造的案例，不是论文原始实验样本。
- “typed feedback”“全系统双时间尺度”“跨层 provenance”与三种方法的联合部署属于本文延伸思考，不是单篇论文结论。
- 文中没有把三篇论文在不同数据集上的绝对分数横向排名；所有数值只在各自论文的实验设置内解释。
- 本章延续系列前两篇：[文字反馈如何写回经验、规则与工作流]({{ '/llm%20post-training/2026/07/25/acl-2026-text-feedback.html' | relative_url }})，以及[数值奖励如何训练可复用 Skill]({{ '/llm%20post-training/2026/07/26/acl-2026-numeric-feedback-sage.html' | relative_url }})。

</section>
