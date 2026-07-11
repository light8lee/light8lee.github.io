---
layout: post
title: "OpenRLHF repository"
date: 2026-06-18 20:03:25 +0800
summary: "这次换一个更深的后训练选题，而且来源尽量不用 arXiv。主角不是某个新 loss，而是 OpenRLHF 0.10.2 文档和仓库里正在形成的一种工程现实：大模型 RLHF、RLVR 和 Agent RL 训练，越来越像一个分布式执行系统问题。"
tags: [后训练, 训练基础设施, 分布式训练]
category: LLM Post-training
cover: /assets/posts/video-notes/2026-06-18-openrlhf-async/images/01.png
body_class: dive-into-codex-post
---

这次换一个更深的后训练选题，而且来源尽量不用 arXiv。主角不是某个新 loss，而是 OpenRLHF 0.10.2 文档和仓库里正在形成的一种工程现实：大模型 RLHF、RLVR 和 Agent RL 训练，越来越像一个分布式执行系统问题。

<div class="source-list">
  <a href="https://github.com/OpenRLHF/OpenRLHF">OpenRLHF repository</a>
  <a href="https://openrlhf.readthedocs.io/">OpenRLHF 0.10.2 documentation</a>
  <a href="https://openrlhf.readthedocs.io/en/latest/agent_training.html">OpenRLHF RL Training Guide</a>
  <a href="https://github.com/OpenRLHF/OpenRLHF">Async Agent RLHF reference script</a>
  <a href="https://openreview.net/forum?id=FhTAG591Ve">Asynchronous RLHF: Faster and More Efficient Off-Policy RL for Language Models</a>
  <a href="https://vllm.ai/blog/2025-04-23-openrlhf-vllm">Accelerating RLHF with vLLM, Best Practice from OpenRLHF</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/01.png' | relative_url }}" alt="封面：后训练已经是执行系统问题" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>封面：后训练已经是执行系统问题</h2>

这次换一个更深的后训练选题，而且来源尽量不用 arXiv。主角不是某个新 loss，而是 OpenRLHF 0.10.2 文档和仓库里正在形成的一种工程现实：大模型 RLHF、RLVR 和 Agent RL 训练，越来越像一个分布式执行系统问题。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/02.png' | relative_url }}" alt="来源：OpenRLHF 0.10.2 文档和仓库，不靠 arXiv" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>来源：OpenRLHF 0.10.2 文档和仓库，不靠 arXiv</h2>

过去讲后训练，大家很容易盯着 PPO、GRPO、DPO、DAPO 这些算法名字。但 OpenRLHF 文档把 RL run 拆成三条正交轴：执行模式、RL 算法、训练流水线。执行可以是 single-turn，也可以是 multi-turn agent；算法可以是 PPO、REINFORCE++、GRPO、RLOO；流水线可以是 Hybrid Engine，也可以是 async + partial rollout。这个拆法本身就说明，算法只是其中一层。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/03.png' | relative_url }}" alt="三条正交轴：执行模式、RL 算法、流水线" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>三条正交轴：执行模式、RL 算法、流水线</h2>

真正的瓶颈经常在 rollout。RLHF 或 RLVR 训练不是普通 SFT，它要先让模型生成，再拿奖励或环境反馈，再把样本送回训练。对于长链推理、工具调用、多轮 agent，生成和环境交互会占掉大量墙钟时间。如果训练进程等 rollout，全局 GPU 利用率会很难看。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/04.png' | relative_url }}" alt="真正瓶颈：rollout 和环境调用占掉墙钟时间" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>真正瓶颈：rollout 和环境调用占掉墙钟时间</h2>

所以 async training 的核心，不是一个更炫的 flag，而是把“采样”和“学习”拆开。OpenRLHF 文档写得很直接：async + partial rollout 会让 rollout 和 training 重叠，也让权重同步和生成通过 vLLM pause / resume 重叠。系统目标不是让每个环节单独最快，而是让整条流水线少等。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/05.png' | relative_url }}" alt="Async training：采样和学习拆开并重叠" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>Async training：采样和学习拆开并重叠</h2>

但异步不是免费午餐。一旦训练在用旧策略生成的样本，问题就变成 off-policy。OpenReview 上的 Asynchronous RLHF 讨论也指出，异步能提速，但代价是学习信号会变旧。OpenRLHF 的实用回应，是把 off-policy correction 变成一等公民，比如 TIS、ICEPOP、Seq-Mask-TIS。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/06.png' | relative_url }}" alt="Partial rollout：长输出不用等最慢样本" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>Partial rollout：长输出不用等最慢样本</h2>

这里最值得看的是 OpenRLHF 的 async agent 参考脚本。它不是玩具配置，而是 Qwen3-4B-Thinking、DAPO-Math、128 个 prompt、每个 prompt 8 个 samples、64K max new tokens、动态过滤、token budget micro-batch、vLLM engine、DeepSpeed ZeRO-3、RingAttention 全都摆在同一个命令里。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/07.png' | relative_url }}" alt="代价：异步会制造 off-policy 样本" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>代价：异步会制造 off-policy 样本</h2>

这说明一个事实：真实后训练的单位已经不是“一个 batch 的文本”，而是“可执行轨迹”。OpenRLHF 的 agent_func_path 把环境执行接进来；agent 输出要保留 token-level trace；loss 层吃的是统一轨迹，而不是关心它来自单轮问答还是多轮 agent。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/08.png' | relative_url }}" alt="校正：TIS、ICEPOP、Seq-Mask-TIS" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>校正：TIS、ICEPOP、Seq-Mask-TIS</h2>

partial rollout 也很关键。长输出任务里，如果非要等一整批全部生成完再训练，最慢的样本会拖住所有 GPU。partial rollout 的思路是，部分轨迹够了就先进入训练，让流水线持续流动。代价是样本更新鲜程度更复杂，所以才需要重要性校正和过滤。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/09.png' | relative_url }}" alt="Agent 轨迹：agent_func_path 接入环境并保留 token trace" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>Agent 轨迹：agent_func_path 接入环境并保留 token trace</h2>

Hybrid Engine 则处理另一类问题：小集群上 actor、critic、reward、reference、vLLM 全都要吃显存。如果每个角色都独占 GPU，资源会浪费。OpenRLHF 的文档把 colocate 和 sleep mode 当成核心能力，本质是在同一批 GPU 上让训练和推理轮流占用显存。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/10.png' | relative_url }}" alt="实例脚本：Qwen3-4B、DAPO-Math、64K 输出、动态过滤" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>实例脚本：Qwen3-4B、DAPO-Math、64K 输出、动态过滤</h2>

这条线的结论很清楚：后训练的前沿不只是“下一个优化目标是什么”，还包括“训练系统能不能承载更长输出、更慢环境、更复杂 agent、更大的模型”。如果系统只能同步等生成，很多算法在真实任务上跑不起来；如果系统太异步，又会引入 off-policy 风险。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/11.png' | relative_url }}" alt="Hybrid Engine：小集群里推理和训练轮流吃显存" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>Hybrid Engine：小集群里推理和训练轮流吃显存</h2>

所以这期真正想讲的是一个判断标准：当你看到一个新的 RLHF 或 RLVR 配方时，不要只问它用了什么 loss。还要问 rollout 怎么调度、权重怎么同步、旧样本怎么校正、环境调用怎么收集 token trace、长输出怎么避免拖死流水线。现在的后训练，已经从“算法实验”进入“执行系统工程”阶段。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-18-openrlhf-async/images/12.png' | relative_url }}" alt="结论：评估后训练配方，要看调度、同步、校正和轨迹" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>结论：评估后训练配方，要看调度、同步、校正和轨迹</h2>

这一页来自原视频素材卡片，保留原分镜顺序用于网页归档。
</div>
</section>
