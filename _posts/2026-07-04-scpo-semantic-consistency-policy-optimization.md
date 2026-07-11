---
layout: post
title: "SCPO: 从失败轨迹里找回正确步骤"
date: 2026-07-04
summary: "一组关于 Semantic Consistency Policy Optimization 的图文笔记：Agent RL 失败轨迹里，也可能藏着正确步骤。"
tags: [智能体, 强化学习, 策略优化]
category: Agent RL
cover: /assets/posts/scpo/final/p1.png
---

Semantic Consistency Policy Optimization (SCPO) 讨论的是 Agent RL 里一个很具体、也很常见的问题：任务越来越长，奖励却往往只在最后给出。一个 Agent 可能前面搜索、筛选、导航、调用工具都做对了，最后一步失败以后，传统 group-based RL 仍然可能把整条失败轨迹都打成负信号。

这篇图文把分享讨论里的内容重新整理成网页阅读版：不再把脚本和图片分开，而是每张图对应一段解释。你可以把它当成一份围绕 SCPO 的视觉读书笔记。

<div class="source-list">
  <a href="https://arxiv.org/abs/2606.25852">arXiv</a>
  <a href="https://arxiv.org/html/2606.25852v1">HTML</a>
</div>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p1.png' | relative_url }}" alt="SCPO image card 1" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">01 / Problem</p>
    <h2>为什么 Agent RL 需要重新看 credit assignment？</h2>
    <p>Reasoning RL 的轨迹相对短，过程更集中；Agent RL 里的轨迹更长、更开放，还夹杂网页、工具、环境状态变化。奖励只在最终出现时，模型很难知道中间哪一步真的推进了任务。</p>
    <p>SCPO 关注的核心矛盾是：语义上相似、都在推进任务的步骤，可能因为所在轨迹最终成败不同而得到相反 credit。</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p2.png' | relative_url }}" alt="SCPO image card 2" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">02 / Context</p>
    <h2>失败轨迹不等于每一步都错</h2>
    <p>一个 WebShop 任务里，成功 rollout 可能是搜索、筛选、打开商品页、加入购物车、下单成功；失败 rollout 也可能完成了前四步，只是在支付或规格选择处失败。</p>
    <p>如果只看最终 reward，前面那些正确 progress 会被一起惩罚。SCPO 想解决的就是这种 Semantic Credit Inconsistency。</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p3.png' | relative_url }}" alt="SCPO image card 3" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">03 / Overview</p>
    <h2>SCPO 不是简单改名版 GRPO</h2>
    <p>分享讨论里把 SCPO 的主线概括为：多条 rollout → 语义对齐 → 找共享 progress → 计算 step/event 级 credit → 合成最终 advantage → 更新 policy。</p>
    <p>它不是只奖励成功轨迹，而是试图从失败轨迹里恢复正确行为，让真正失败的 event 承担主要惩罚。</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p4.png' | relative_url }}" alt="SCPO image card 4" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">04 / Reference</p>
    <h2>先找同题里的成功 sibling</h2>
    <p>SCPO 在同一个 rollout group 里找成功轨迹，把它作为失败轨迹的参考路径。这不是外部专家演示，而是模型自己在同题采样出的成功 sibling，因此仍然更接近 on-policy 信号。</p>
    <p>参考轨迹的作用是回答：失败轨迹里的哪些步骤，其实和成功路径中的有效进展相似？</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p5.png' | relative_url }}" alt="SCPO image card 5" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">05 / Semantic Match</p>
    <h2>不是字符串相同，而是语义上同一步</h2>
    <p>Agent 的行为表达很灵活。“Search red nike shoes”和“Search nike red running shoes”字面不一样，但在任务里可能都是同类进展。</p>
    <p>SCPO 把 observation + action 拼成文本，用冻结的 cross-encoder 计算失败步骤和参考步骤之间的语义相似度矩阵。</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p6.png' | relative_url }}" alt="SCPO image card 6" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">06 / Monotonic Credit</p>
    <h2>只奖励往前走，不奖励原地重复</h2>
    <p>高相似度不能直接等于奖励。否则 Agent 反复点击同一个按钮、重复同一类搜索，也可能不断拿到 credit。</p>
    <p>SCPO 加了单调约束：一个失败步骤必须匹配到参考轨迹中尚未被奖励、且更靠后的进展位置。每个参考位置最多被奖励一次。</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p7.png' | relative_url }}" alt="SCPO image card 7" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">07 / Reordering</p>
    <h2>不要让早期模板步骤抢光信用</h2>
    <p>如果按时间顺序分配 credit，开头那些大家都会做的动作最先占用参考位置，例如打开网页、进入搜索框。</p>
    <p>SCPO 的重排序让不同位置的步骤公平竞争，把有限 credit 留给更能代表任务进展的中后段行为，比如选对航班、进入正确商品页、完成关键筛选。</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p8.png' | relative_url }}" alt="SCPO image card 8" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">08 / Advantage</p>
    <h2>最终训练信号会因 step 不同而不同</h2>
    <p>分享讨论里特别强调：同一个 rollout 里的不同 step，最终 credit / advantage 可以不同。</p>
    <p>直观地说，SCPO 把整条轨迹成败信号和 step-level 语义进展信号合成。失败轨迹仍然是失败，但其中局部正确的步骤不再被粗暴地一起压低。</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p9.png' | relative_url }}" alt="SCPO image card 9" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">09 / Overall Flow</p>
    <h2>把 outcome-level 往 process-level 推一步</h2>
    <p>SCPO 的处理位置可以理解为插在 step reward 和 advantage estimation 之间：不重写整个 RL 训练器，而是在 reward/advantage 进入优化前做语义层面的修正。</p>
    <p>它的价值不是把失败包装成成功，而是更细地问：这条失败轨迹里有没有值得保留的正确行为？</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p10.png' | relative_url }}" alt="SCPO image card 10" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">10 / Results</p>
    <h2>小模型、多步任务上的收益更明显</h2>
    <p>论文实验显示，在 Qwen2.5-1.5B 上，SCPO 相比 GiGPO 在 ALFWorld 和 WebShop 上都有明显提升。更难的多步任务更容易受益，因为失败轨迹里更常包含“前面做对、后面翻车”的局部进展。</p>
    <p>这也说明 SCPO 不是简单加糖，而是在长链路任务里修正原本过粗的 credit 分配。</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p11.png' | relative_url }}" alt="SCPO image card 11" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">11 / Ablation</p>
    <h2>重排序和单调约束都不是装饰</h2>
    <p>消融实验给出的信号很清楚：按时间顺序分配、去掉单调约束、改用较短参考轨迹，都会削弱效果。</p>
    <p>这对应了前面的设计动机：不能只靠相似度，也不能让最早出现的模板步骤自然占优，必须把“相似”和“新进展”同时纳入判断。</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p12.png' | relative_url }}" alt="SCPO image card 12" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">12 / When It Works</p>
    <h2>适合长链路、稀疏奖励、可观察状态变化的 Agent 任务</h2>
    <p>SCPO 更适合网页导航、工具调用、具身家务这类多步交互任务：失败轨迹中经常有局部正确步骤，环境状态变化也能被语义匹配器捕捉。</p>
    <p>它不太适合单步任务、全组 rollout 都失败的早期训练阶段，也不一定适合数学/代码这类需要精确符号验证的任务。</p>
  </div>
</section>

<section class="visual-note">
  <figure>
    <img src="{{ '/assets/posts/scpo/final/p13.png' | relative_url }}" alt="SCPO image card 13" loading="lazy">
  </figure>
  <div>
    <p class="visual-note-index">13 / Limitations</p>
    <h2>它不是万能 credit 机器</h2>
    <p>SCPO 依赖 successful sibling，也依赖通用语义匹配器。语义相似不等于因果有效，局部像成功也不代表全局一定正确。</p>
    <p>后续可以考虑成功轨迹 buffer、领域专用 matcher / verifier、状态转移一致性检查，以及动态阈值和权重。核心方向仍然是同一句话：失败可以被惩罚，但失败里的正确进展不应该被一起埋掉。</p>
  </div>
</section>
