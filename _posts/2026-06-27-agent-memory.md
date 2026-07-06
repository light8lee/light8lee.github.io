---
layout: post
title: "Agent 记忆系统大横评：12 个系统，谁才是真正的记忆王者？"
date: 2026-06-27 22:54:18 +0800
summary: "这是一篇关于 arXiv:2606.24775 论文《Are We Ready For An Agent-Native Memory System?》的中文技术解读视频。"
tags: [video-notes, visual-essay]
category: AI Notes
cover: /assets/posts/video-notes/2026-06-27-agent-memory/images/01.png
body_class: dive-into-codex-post
---

这是一篇关于 arXiv:2606.24775 论文《Are We Ready For An Agent-Native Memory System?》的中文技术解读视频。


<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/01.png' | relative_url }}" alt="你的 Agent，每天都在失忆" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>你的 Agent，每天都在失忆</h2>

你的 Agent 记不住昨天聊过什么，不是它不努力——是记忆系统，根本没及格。上海交大和清华团队最新研究，对 12 种主流 Agent 记忆系统进行了全面横评，结果令人震惊。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/02.png' | relative_url }}" alt="Are We Ready For An Agent-Native Memory System?" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>Are We Ready For An Agent-Native Memory System?</h2>

论文《Are We Ready For An Agent-Native Memory System》由上海交通大学、清华大学和 MemTensor 联合团队于 2026 年 6 月 23 日提交。这是首个从数据管理视角，对 Agent 记忆系统进行全面系统评估的研究，覆盖 5 个基准工作负载和 11 个数据集。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/03.png' | relative_url }}" alt="碎片化的记忆系统格局" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>碎片化的记忆系统格局</h2>

当前 Agent 记忆系统百花齐放，却各自为政。流式反射系统以 MemoryBank 为代表，把经验存成时间戳流，定期总结成高层反思写回流中。层级分块系统如 MemGPT，把记忆分为核心内存和归档存储两个层级，像操作系统虚拟内存一样管理上下文窗口。知识图谱系统如 Zep，用实体关系图来管理时序演化，支持实体消歧和冲突解决。复合混合系统如 A-MEM，则把向量、图、关键词等多种存储引擎组合在一起，由专用维护模块统一调度。但问题来了——到底哪个更好？
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/04.png' | relative_url }}" alt="四模块分析框架" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>四模块分析框架</h2>

研究团队提出了一套四模块分析框架，将记忆系统从黑盒拆解为四个可独立评估的核心组件。M1 是记忆表示与存储，决定了信息以什么形式存在哪里——是 Token 序列、知识图谱还是树形结构。M2 是记忆提取，从 Agent 的交互流中抽取关键信息，可以是原始拼接、无模式提取、或模式约束提取。M3 是记忆检索与路由，负责在需要时找到并用对的信息。M4 是记忆维护，处理更新、合并和淘汰。这套框架让每个模块的优劣可以被单独量化。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/05.png' | relative_url }}" alt="流式反射与层级分块：MemoryBank 与 MemGPT" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>流式反射与层级分块：MemoryBank 与 MemGPT</h2>

先看流式反射和层级分块两类系统。MemoryBank 是流式反射的典型代表，它把每次交互存为带时间戳的记忆流，定期用 LLM 对记忆流做高层反思，并将反思结果写回记忆流中。这种设计的优点是实现简单、信息不丢失，但追加式写入导致旧事实无法被精准覆盖。MemGPT 则走层级分块路线，它把记忆分为核心内存和归档存储两个层级，核心内存存近期重要信息，归档存储存历史信息，两者之间通过显式迁移来管理。它把上下文窗口当成虚拟内存，通过 eviction 和 promotion 操作来动态调度。但研究发现，这种层级结构的索引构建成本很高，且语义合并会破坏时间线索。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/06.png' | relative_url }}" alt="知识图谱与树形结构：Zep、Mem0-g 与 MemTree" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>知识图谱与树形结构：Zep、Mem0-g 与 MemTree</h2>

再看知识图谱和树形结构类系统。Zep 是时序知识图谱的代表，它把信息存为实体、关系和时序三元组，用时间戳多版本机制来实现逻辑失效——旧事实不会被物理删除，而是被标记为过期，这在动态更新场景下非常可靠。Mem0-g 更进一步，在知识图谱之上叠加了向量检索，形成向量加图的双引擎架构，通过实体关系抽取和拓扑子图遍历来定位相关记忆。MemTree 则采用层级树形结构，自顶向下做嵌入提取，检索时把树折叠为一维线性序列，再通过递归聚合来做语义合并。这三种系统的共同优势是结构化的拓扑查询能力，但代价是索引构建时间比轻量级向量存储高出数个数量级。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/07.png' | relative_url }}" alt="复合混合系统：A-MEM、Letta 与 SimpleMem" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>复合混合系统：A-MEM、Letta 与 SimpleMem</h2>

最后看复合混合系统。A-MEM 是最典型的混合架构，它把运行时状态如 KV 缓存和长期存储如向量、图、关键词索引显式分离，通过专用的维护模块来调度。Letta 则采用多级记忆设计，在核心内存和归档存储之间增加了显式的层级迁移机制，支持更灵活的记忆生命周期管理。SimpleMem 虽然名字叫简单，但实际上是语义检索、关键词检索和结构化检索的混合体，通过平衡混合搜索来最大化上下文相关性。论文发现，复合混合系统在对话 QA 场景下全面领先，因为它们能同时利用语义检索和结构化查询的优势。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/08.png' | relative_url }}" alt="12 种记忆系统全景图" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>12 种记忆系统全景图</h2>

总结一下 12 种系统的分类。序列上下文型如 Mem0 和 MemoChat，用 Token 序列和向量数据库来存离散事实，结构简单但缺乏拓扑查询能力。结构拓扑型如 Zep 和 Mem0-g，用知识图谱或树形结构来组织信息，支持丰富的拓扑查询，但索引构建成本高。多范式混合型如 A-MEM 和 Letta，同时使用向量、图、关键词等多种存储引擎，试图取各家之长，在对话 QA 上表现最好。另外还有三个参考基线：长上下文直接回答、嵌入式 RAG 和 BM25 稀疏检索。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/09.png' | relative_url }}" alt="RQ1: 没有万能架构" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>RQ1: 没有万能架构</h2>

第一个核心发现：没有一种架构能在所有场景中称霸。复合混合系统在对话 QA 上表现最好，因为它们能同时利用语义检索和结构化查询。图方法在单跳事实召回上最精准，但一到需要时序推理的场景就露怯了。真正重要的是，有效的记忆系统把证据定位的工作从 LLM 内部外化到了记忆层，所以即使换了不同的 LLM 主干模型，表现依然稳健。这意味着记忆系统的好坏，不取决于用了什么 LLM，而取决于记忆结构本身是否与工作负载瓶颈对齐。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/10.png' | relative_url }}" alt="RQ2: 检索精度随时间衰减" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>RQ2: 检索精度随时间衰减</h2>

第二个发现：检索精度随时间距离的增大而显著下降。具有显式查询规划和平衡混合搜索的系统，能最大化上下文相关性。但纯粹的相似度检索有一个致命缺陷——当证据和查询之间的时间距离增大时，语义相似度开始失效，检索精度急剧下降。这意味着，一个只靠 embedding 相似度来找记忆的系统，在长对话中会越来越不可靠。这解释了为什么 Mem0 这种纯向量检索方案在长对话场景下表现不佳。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/11.png' | relative_url }}" alt="RQ3: 动态更新谁最可靠？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>RQ3: 动态更新谁最可靠？</h2>

第三个发现：在动态更新场景下，图方法最可靠。Zep 和 Mem0-g 用时间戳多版本机制，可以逻辑失效旧事实而不是物理删除——当用户说「我搬家了」，旧地址被标记为过期，新地址成为当前版本。但 Mem0 这样的事实提取插件和追加式存储，很难精准覆盖旧的地址信息。更糟糕的是，MemoryBank 这种没有生命周期管理的系统会继续返回过期事实，产生所谓的「过去的幻觉」——Agent 会一直以为你还住在三年前的地方。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/12.png' | relative_url }}" alt="RQ4: 长期记忆稳定性" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>RQ4: 长期记忆稳定性</h2>

第四个发现：长期记忆稳定性是最大的软肋。追加式存储随着证据越来越远，性能灾难性退化。一个令人意外的结果是，对于时序相关的查询，直接把原始长上下文喂给 LLM，竟然比大多数记忆方法的效果更好。这说明 MemGPT 和 MemTree 使用的语义合并和摘要化处理，正在破坏那些关键的时序线索。研究团队建议：保守的记忆合并才是最佳默认策略，不要急着压缩、不要急着总结。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/13.png' | relative_url }}" alt="RQ5: 成本与性能的博弈" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Video Notes</p>
<h2>RQ5: 成本与性能的博弈</h2>

第五个发现：成本与性能之间存在严重的不对等。Zep 和 Mem0-g 这样的知识图谱系统，索引构建时间比 Mem0 这样的轻量级向量存储高出数个数量级，查询延迟也远高于后者。但它们的精度增益并不成比例——你花了 10 倍的成本，可能只换来 10% 的提升。研究还发现，局部维护比全局重组更划算，意味着你应该只更新那些真正变化的部分，而不是每次都对整个记忆库做全量重构。这在工程实践中是一个非常重要的指导原则。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/14.png' | relative_url }}" alt="每一层抽象都在丢信息" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">014 / Video Notes</p>
<h2>每一层抽象都在丢信息</h2>

最深刻的发现来自组件级实验。每一层信息抽象——压缩、摘要、事实提取——都在逐步丢弃信息。用 LLM 做细粒度事实提取，精度确实能微升几个百分点，但代价是严重损害多跳推理能力，因为那些看似无关的中间信息，其实是推理链的关键节点。另一个陷阱是 Mem0 和 MemGPT 使用的延时刷新策略，它制造了一种「能看懂但答不对」的假象——表面覆盖率很高，实际可回答性很低。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-27-agent-memory/images/15.png' | relative_url }}" alt="如何构建真正的 Agent 原生记忆？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">015 / Video Notes</p>
<h2>如何构建真正的 Agent 原生记忆？</h2>

总结一下，构建真正的 Agent 原生记忆系统，没有一劳永逸的银弹。你得先搞清楚你的 Agent 最常遇到什么类型的记忆瓶颈——是时序推理、多跳关联、还是事实更新？然后对症下药。最佳实践是：混合检索优于单一方式，保守维护优于激进压缩，局部更新优于全局重组。Agent 记忆不是越复杂越好，而是越对齐越好。
</div>
</section>
