---
layout: post
title: "Dive into Codex 03：Cache 与 Compaction"
date: 2026-07-06 08:49:27 +0800
summary: "继续看 Codex 长任务里的上下文管理：稳定前缀如何帮助 prompt cache，compaction 如何在窗口压力下保留可继续工作的状态。"
tags: [Codex, coding agent, visual-essay, source-notes, cache, compaction]
category: Codex
cover: /assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/01.png
body_class: dive-into-codex-post
---

继续看 Codex 长任务里的上下文管理：稳定前缀如何帮助 prompt cache，compaction 如何在窗口压力下保留可继续工作的状态。


<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/01.png' | relative_url }}" alt="Chapter 03 Cover" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>Chapter 03 Cover</h2>

第03章，Cache 与 Compaction。上一章我们看了 Responses API 如何把模型输出变成事件。这一章继续看长任务里的上下文管理：怎么让稳定前缀命中 prompt cache，怎么在窗口压力下用 compaction 保留可继续工作的状态。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/02.png' | relative_url }}" alt="长任务会挤压上下文" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>长任务会挤压上下文</h2>

Agent Loop 运行越久，history、工具输出、diff 和错误信息就越多。问题不只是窗口够不够大，而是哪些内容必须保留，哪些可以压缩，哪些前缀应该保持稳定。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/03.png' | relative_url }}" alt="Cache 奖励稳定前缀" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>Cache 奖励稳定前缀</h2>

Prompt cache 的关键不是少发内容，而是让请求前面的大段内容尽量稳定。系统提示、工具定义、AGENTS.md 这些如果频繁变化，就会破坏可复用前缀，降低 cache 命中。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/04.png' | relative_url }}" alt="clone_history 不是 cache" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>clone_history 不是 cache</h2>

clone_history 的 for_prompt 方法是把本地 Session history 复制并整理成模型 input。它本身不是 prompt cache。真正的 cache 发生在模型服务端，依赖发送出去的请求前缀是否稳定。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/05.png' | relative_url }}" alt="稳定前缀需要纪律" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>稳定前缀需要纪律</h2>

为了提高 cache 复用，Codex 要尽量把稳定内容放在前面，把变化快的用户输入和工具结果放在后面。上下文拼接顺序会直接影响长任务的成本和速度。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/06.png' | relative_url }}" alt="Compaction 在接近阈值时触发" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>Compaction 在接近阈值时触发</h2>

当 token 使用接近上下文限制，Codex 不能继续无脑堆历史。pre-sampling 或 mid-turn 阶段可能触发 compaction，把冗长轨迹压成下一轮仍能工作的摘要。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/07.png' | relative_url }}" alt="压缩不是普通总结" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>压缩不是普通总结</h2>

Compaction 不能只写一段漂亮摘要。它要保留任务目标、已改文件、关键决策、失败尝试和待办事项。否则下一轮模型会失去现场感，继续工作就会漂移。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/08.png' | relative_url }}" alt="压缩结果仍要回到历史" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>压缩结果仍要回到历史</h2>

压缩后的内容会作为新的上下文材料进入 history。它不是把历史删干净，而是把长轨迹改写成更短的可执行记忆，让后续 sampling 仍然能沿着任务继续。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/09.png' | relative_url }}" alt="压缩前后对比" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>压缩前后对比</h2>

压缩前，history 里塞满搜索、patch 和测试失败。压缩后，它折叠成 goal、constraints、file state、failures 和 pending tasks。减少的是重复轨迹，不是继续执行所需的事实。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/10.png' | relative_url }}" alt="Project Memory 不是聊天历史" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>Project Memory 不是聊天历史</h2>

跨会话记得项目，通常不是把旧 Chat 全量塞回 prompt，而是新会话重新读取 workspace、AGENTS.md 和 memory 文件。看起来像记住了旧对话，本质是项目状态被沉淀成可再次读取的上下文。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/11.png' | relative_url }}" alt="记忆可以分成四层" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>记忆可以分成四层</h2>

项目记忆可以拆成四层：共享 workspace 是事实来源，project memory 保存长期知识，conversation summary 提炼旧会话，retrieval 只取相关片段。四层共同进入 Context Builder。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/12.png' | relative_url }}" alt="AGENTS.md 放规则，Memory 放经验" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>AGENTS.md 放规则，Memory 放经验</h2>

AGENTS.md 更像稳定的项目级规则：代码风格、测试命令、架构边界。Memory 更适合放动态知识：最近决策、当前任务状态、踩坑经验。分工清楚，跨会话继承才不容易污染。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/13.png' | relative_url }}" alt="Cache 与压缩互相影响" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Video Notes</p>
<h2>Cache 与压缩互相影响</h2>

Cache 关注稳定前缀，Compaction 关注窗口压力。压缩会改变上下文内容，因此也可能影响 cache。好的运行时会在保留语义连续性和保持前缀稳定之间做权衡。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/14.png' | relative_url }}" alt="目标是长任务不断线" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">014 / Video Notes</p>
<h2>目标是长任务不断线</h2>

无论是 cache 还是 compaction，最终目标都不是省 token 本身，而是让 Codex 能在长任务中保持连续：知道做过什么、为什么这么做、下一步该怎么推进。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-03-cache-compaction/images/15.png' | relative_url }}" alt="下一步进入异步控制" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">015 / Video Notes</p>
<h2>下一步进入异步控制</h2>

当上下文可以续航后，还要解决运行时控制：用户中断、异步队列和事件顺序。下一章会解释 Codex 如何在任务运行中接住新的输入，而不是把长任务锁死。
</div>
</section>
