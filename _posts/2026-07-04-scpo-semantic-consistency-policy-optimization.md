---
layout: post
title: "SCPO: 从失败轨迹里找回正确步骤"
date: 2026-07-04
summary: "一组关于 Semantic Consistency Policy Optimization 的图文笔记：Agent RL 失败轨迹里，也可能藏着正确步骤。"
tags: [Agent RL, SCPO, visual-essay, paper-notes]
category: Agent RL
cover: /assets/posts/scpo/final/p1.png
---

Semantic Consistency Policy Optimization (SCPO) 关注 Agent RL 中一个很真实的问题：失败轨迹不代表每一步都错。长链路任务里，最后一步翻车经常会连带惩罚前面已经做对的搜索、筛选、导航和工具调用。

这组图文把论文的核心思路整理成 13 张卡片：用成功 sibling 作为参考，用冻结的 cross-encoder 做语义匹配，再通过单调信用和重排序把失败轨迹里的有效进展找回来。

<div class="source-list">
  <a href="https://arxiv.org/abs/2606.25852">arXiv</a>
  <a href="https://arxiv.org/html/2606.25852v1">HTML</a>
  <a href="{{ '/pages/scpo/script.html' | relative_url }}">Rendered script</a>
  <a href="{{ '/pages/scpo/revision-v6-eval-analysis-pages.html' | relative_url }}">Rendered revision notes</a>
  <a href="{{ '/assets/posts/scpo/notes/script.md' | relative_url }}">Raw script.md</a>
</div>

<div class="image-sequence">
  <img src="{{ '/assets/posts/scpo/final/p1.png' | relative_url }}" alt="SCPO image card 1" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p2.png' | relative_url }}" alt="SCPO image card 2" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p3.png' | relative_url }}" alt="SCPO image card 3" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p4.png' | relative_url }}" alt="SCPO image card 4" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p5.png' | relative_url }}" alt="SCPO image card 5" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p6.png' | relative_url }}" alt="SCPO image card 6" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p7.png' | relative_url }}" alt="SCPO image card 7" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p8.png' | relative_url }}" alt="SCPO image card 8" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p9.png' | relative_url }}" alt="SCPO image card 9" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p10.png' | relative_url }}" alt="SCPO image card 10" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p11.png' | relative_url }}" alt="SCPO image card 11" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p12.png' | relative_url }}" alt="SCPO image card 12" loading="lazy">
  <img src="{{ '/assets/posts/scpo/final/p13.png' | relative_url }}" alt="SCPO image card 13" loading="lazy">
</div>
