---
layout: post
title: "RLTF：把文本批评内化成首答能力"
date: 2026-07-16 13:00:00 +0800
summary: "RLTF 不只让模型看完批评后改对答案，而是用自蒸馏与反馈建模，把训练阶段的外部批评变成测试时无需反馈的首答能力。"
tags: [LLM, RLTF, 强化学习, 文本反馈, Self-Distillation, Feedback Modeling, ICML 2026]
category: LLM Post-training
cover: /assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/01.png
---

# RLTF：把文本批评内化成首答能力

> 论文解读：*Expanding the Capabilities of Reinforcement Learning via Text Feedback*  
> Yuda Song, Lili Chen, Fahim Tajwar, Rémi Munos, Deepak Pathak, J. Andrew Bagnell, Aarti Singh, Andrea Zanette（ICML 2026）  
> [论文](https://arxiv.org/abs/2602.02482) · [项目主页](https://rl-textfeedback.github.io/) · [代码](https://github.com/lili-chen/rltf)

<section class="visual-note" markdown="1">
<figure><video controls preload="metadata" poster="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/01.png' | relative_url }}" aria-label="RLTF 论文讲解视频"><source src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/rltf-text-feedback.mp4' | relative_url }}" type="video/mp4">你的浏览器不支持 HTML5 视频。</video></figure>
<div markdown="1">
<p class="visual-note-index">Video / 04:26</p>

## 从“会改”到“第一次就答好”

标量奖励只能告诉模型结果好不好，完整示范又往往昂贵。文本批评处在两者之间：它不必重写答案，却能指出错误位置、原因和修改方向。

这支视频沿着 13 个场景解释 RLTF 的两条路线：**RLTF-SD** 蒸馏反馈后的修正行为，**RLTF-FM** 学习预测老师会给出的批评。二者都以无反馈的第一轮表现为最终评价。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/01.png' | relative_url }}" alt="RLTF 将文本批评内化为首答能力" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">01 / Thesis</p>

## 失败轨迹不只有一个 0

模型第一次答错后，老师不一定要给出完整标准答案。只要指出“错在哪里、为什么错、接下来怎样改”，模型就可能生成更好的第二次回答。

RLTF 更进一步：它不满足于模型在看到批评后会修正，而是希望训练结束后，即使没有老师、没有第二轮，模型第一次也能避免同类错误。它要把外部批评从临时上下文中“编译”进模型能力。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/02.png' | relative_url }}" alt="标量奖励、文本批评和完整示范的监督密度对比" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">02 / Supervision</p>

## 文本反馈位于奖励与示范之间

标量奖励容易扩展，却不说明错误发生在哪里；SFT 的完整示范提供密集的 token 级监督，但高质量答案的获取成本更高。文本批评既比一个分数包含更多语义，又不必替学生完成整道题。

例如模型解不等式时忘记翻转符号，`0 分`只给出结果，标准解需要重写全过程，而一句“除以负数后应翻转不等号”已经同时给出了位置、原因和方向。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/03.png' | relative_url }}" alt="利用反馈与内化反馈的区别" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">03 / Objective</p>

## 利用反馈，不等于内化反馈

第一轮中，模型只看到原问题并直接作答；第二轮中，它额外看到了首答和批评，再尝试修正。第二轮变好只说明模型**会利用反馈**。

真正的内化发生在下一次：测试时仍只给原问题，第一轮回答却变好了。普通多轮 RL 主要奖励反馈后的表现，并不保证这种能力自动迁移回无反馈策略。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/04.png' | relative_url }}" alt="RLTF 从原问题、首答、文本批评到修正答案的交互轨迹" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">04 / Trajectory</p>

## 一条反馈轨迹包含五个对象

模型先基于原问题 \(x_0\) 生成首答 \(y_0\)，环境计算奖励，外部反馈者给出批评 \(c_0\)。三者组成扩展上下文 \(x_1=f(x_0,y_0,c_0)\)，模型再生成修正答案 \(y_1\)：

\[
x_0 \rightarrow y_0 \rightarrow c_0 \rightarrow x_1 \rightarrow y_1
\]

训练时可以借助完整轨迹；测试指标仍是只给 \(x_0\) 时的首答表现。这个约束决定了方法不能只优化第二轮。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/05.png' | relative_url }}" alt="RLTF-SD 与 RLTF-FM 两条能力内化路线" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">05 / Two routes</p>

## 一条路线学会改，一条路线学会找错

**RLTF-SD** 把反馈后的完整修正答案蒸馏回无反馈策略，迁移的是“怎样改对”的行为。**RLTF-FM** 让模型预测外部老师会如何批评，训练的是“哪里错了”的诊断表示。

论文分别验证这两条路线。它们共享同一个目标：让训练期才存在的外部反馈，在部署期不再成为必需输入。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/06.png' | relative_url }}" alt="RLTF-SD 使用第二轮奖励和第一轮平均奖励构造优势" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">06 / RLTF-SD</p>

## 用第一轮 baseline 保留蒸馏信号

第二轮答案不一定正确，因此不能无条件模仿。RLTF-SD 用修正答案的奖励减去第一轮组平均奖励，判断这条轨迹是否值得学习：

\[
A_i^{(0)}=R(x_0,y_{1,i})-\frac{1}{N}\sum_jR(x_0,y_{0,j})
\]

关键是 baseline 来自**第一轮**。如果八个第二轮答案都因反馈而答对，用第二轮均值会得到全零 advantage；改用第一轮均值后，只要首答仍不够好，成功的修正轨迹就持续提供正信号。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/07.png' | relative_url }}" alt="RLTF-SD 轨迹级蒸馏与 SDPO token 级蒸馏对比" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">07 / Distillation</p>

## RLTF-SD 蒸馏的是完整修正轨迹

RLTF-SD 真正生成第二次完整答案，再用任务奖励验证它，并以 advantage 加权提高 \(\log\pi(y_1\mid x_0)\)。因此它更像 **trajectory-level hindsight imitation + RL advantage**。

相近的 SDPO 不采样完整二答，而是在原回答的相同 token 前缀上，比较有反馈与无反馈时的预测分布。前者相信最终奖励验证过的修正结果，后者相信反馈条件自教师在每个 token 位置给出的局部判断。更细的差异放在文末 appendix。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/08.png' | relative_url }}" alt="RLTF-FM 根据问题和当前回答预测批评文本" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">08 / RLTF-FM</p>

## 预测批评，迫使模型表示错误结构

Feedback Modeling 不模仿二答，而是根据问题与当前答案预测老师的批评：

\[
L_{\text{FM}}=-\mathbb{E}[\log p_\theta(c\mid x,y)]
\]

若要预测“你漏掉了从 `(0,1)` 到 `(1,1)` 的合法移动”，模型内部必须表示坐标、障碍、合法动作以及回答遗漏的搜索边。论文把这种作用称为 **representation preconditioner**：结构化反馈补充了稀疏奖励难以覆盖的表示方向。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/09.png' | relative_url }}" alt="RLTF 在最短路径、数学和写作任务上的首答结果" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">09 / Results</p>

## 提升发生在无反馈首答，而不只是第二轮

论文使用 Llama-3.1-8B-Instruct 作为学生、Qwen3-235B-A22B-Instruct-2507 提供反馈。最明显的收益出现在逻辑任务：Shortest Path 上，单轮 GRPO 为 0.385，RLTF-SD 达到 0.830，RLTF-FM 达到 0.905。

在 MATH500（DeepMath）上，两者分别达到 0.598 与 0.636，高于单轮 GRPO 的 0.558；在 WritingBench 上，RLTF-SD 的 6.71 高于 RLTF-FM 的 6.39。整体上 FM 更适合逻辑与数学，SD 在创意写作中更占优势。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/10.png' | relative_url }}" alt="文本反馈把稀疏判断扩展为错误位置、原因和修改方向" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">10 / Evidence</p>

## 真正有用的是语义结构，不是多几个 token

详细批评明显优于“你的回答正确/错误”这类提示，说明提升并非来自额外标签或更长上下文，而是来自错误位置、违反的约束、遗漏的概念和可执行的修改方向。

这也给反馈质量提出了更严格的定义：一段话写得像老师并不够；它必须帮助模型在没有这段话时生成更好的首答。评价终点应是单轮任务结果，而不是批评文本是否流畅。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/11.png' | relative_url }}" alt="RL、Self-Distillation 与 Feedback Modeling 的联合目标" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">11 / Joint objective</p>

## 两条路线可以写进同一个目标，但尚未被联合验证

形式上可以将任务 RL、自蒸馏与反馈预测合在一起：

\[
L=L_{\text{RL}}+\lambda_{\text{SD}}L_{\text{SD}}+\lambda_{\text{FM}}L_{\text{FM}}
\]

不过论文把 RLTF-SD 与 RLTF-FM 作为两种独立方案实验，并未证明“先找错、再修改、再蒸馏”能形成持续自我提升。这个闭环仍依赖外部反馈提供新信息，也依赖任务奖励判断修改是否真的更好。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/12.png' | relative_url }}" alt="RLTF 对反馈者、任务奖励和反馈噪声的依赖" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">12 / Boundaries</p>

## 方法仍有三个外部边界

第一，8B 学生依赖 235B MoE 反馈者，收益中可能包含大模型向小模型的知识迁移。第二，RLTF-SD 仍需要标量奖励筛选修正答案，并没有用文本完全替代 verifier。第三，错误、主观或恶意反馈可能被 FM 内化，或经由“错误批评 → 错误修改 → 错误蒸馏”继续放大。

因此，反馈可靠性、修改后的真实收益以及训练成本，都需要与最终首答能力一起监控。
</div>
</section>

---

<section class="visual-note" markdown="1">
<figure><img src="{{ '/assets/posts/video-notes/2026-07-16-rltf-text-feedback/images/13.png' | relative_url }}" alt="判断反馈是否可靠、有效和值得内化" loading="lazy"></figure>
<div markdown="1">
<p class="visual-note-index">13 / Takeaway</p>

## 把失败原因也变成训练数据

RLTF 最重要的贡献不是让模型“反思两遍”，而是明确区分依赖反馈完成修正，与把反馈迁移成无反馈能力。RLTF-SD 内化修改后的行为，RLTF-FM 内化发现错误所需的表示。

下一步的核心问题不再只是“如何利用批评”，而是三个判断：**反馈可靠吗？它真的改善了答案吗？这种改进值得内化吗？**
</div>
</section>

<section class="post-appendix" markdown="1">

## Appendix：扩展推导与进一步思考

### A. 为什么完整重要性采样很难稳定

修正答案来自反馈条件策略 \(\pi(y\mid x_1)\)，训练的却是无反馈策略 \(\pi(y\mid x_0)\)。理论上可用 \(\pi(y\mid x_0)/\pi(y\mid x_1)\) 修正分布偏移，但 LLM 序列概率比是大量 token 概率比的乘积，容易产生极端长尾。论文在 AIME24 上报告平均序列级 log importance ratio 为 142.16，因此采用类似 Advantage-Weighted Regression 的低方差、有偏目标。

### B. RLTF-SD 与普通 On-policy Self-Distillation

普通 on-policy self-distillation 通常让学生与教师处理相同上下文，教师优势来自更大模型、EMA、旧策略或更多计算。RLTF-SD 中教师额外看到首答和外部批评，学生却只看原问题；它蒸馏的是带 privileged information 的跨上下文修正轨迹。第一轮 rollout 是 on-policy 的，但学习目标 \(y_1\) 并非从学生的单轮条件分布中采样。

### C. RLTF-SD 与 SDPO

| 维度 | RLTF-SD | SDPO |
|---|---|---|
| 迁移对象 | 反馈后重新生成的完整答案 | 反馈造成的逐 token 分布变化 |
| 信号粒度 | 轨迹共享 reward / advantage | 每个原轨迹 token 位置的 KL |
| 是否采样第二次完整答案 | 是 | 否 |
| 外部验证 | 依赖任务奖励筛选修正轨迹 | 核心目标可直接使用环境文本反馈 |
| 主要风险 | 跨上下文 rollout 的分布偏移 | 自教师 logits 错误或高熵 |

同一条错误样本进入 RLTF-SD 后，会先依据反馈重做并产生完整正确答案，再经奖励验证后蒸馏；进入 SDPO 后，不必完整重做，而是在原回答的每个前缀比较有无反馈时的 next-token 分布。

### D. 最短路径例子

模型从 `(0,0)` 走到 `(0,1)` 后，过早判断无路可走。批评指出 `(0,1) → (1,1)` 是合法移动，第二次回答因此得到 `right, down, down, down`。

- RLTF-SD 用这条经奖励验证的完整路径训练无反馈策略，希望下次第一次就完整搜索。
- RLTF-FM 学习生成“遗漏合法移动、过早判定不可达”这类批评，强化对地图状态与搜索边界的表示。

这个例子也解释了为什么文本反馈能帮助普通 GRPO 逃离“所有地图都回答 infeasible”的局部策略：它不仅否定答案，还明确指出了被遗漏的搜索分支。

### E. 尚待验证的联合闭环

一个自然设想是先用 FM 学会找错，再依据批评修改答案，最后由 SD 把成功修改蒸馏回首答。它可能让诊断与行为改进相互配合，也可能把错误批评级联放大。更有信息量的实验应比较同时加权与分阶段训练，并检查：批评指出的错误是否真的消失、是否引入新错误、首答是否持续改善。

### F. 值得继续探索的方向

1. 为每条批评估计可靠性与实际修改收益，只强化真正帮助答案改善的反馈。
2. 保留正确性、安全性、风格等多个反馈者的分歧，而不是过早压成单一结论。
3. 将自由文本拆成错误类型、位置、证据、严重程度和建议动作，便于过滤与课程学习。
4. 让模型在采纳反馈前先验证反馈，并加入错误批评、矛盾意见与 prompt injection 测试。
5. 把方法扩展到代码与 Web Agent，让编译器报错、测试失败和工具异常成为因果来源更清晰的文本反馈。

</section>
