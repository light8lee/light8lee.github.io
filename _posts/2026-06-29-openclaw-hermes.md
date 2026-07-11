---
layout: post
title: "openclaw hermes"
date: 2026-06-29 15:06:50 +0800
summary: "一个用TypeScript写的多Agent编排平台，GitHub星标38万。一个用Python写的单Agent自进化系统，由Nous Research开源。OpenClaw和Hermes，两种截然不同的Agent设计哲学，今天我们结合源代码，从顶层架构到核心模块，进行top-down的详细拆解和对比。"
tags: [智能体, 多智能体, 开源框架]
category: Agent
cover: /assets/posts/video-notes/2026-06-29-openclaw-hermes/images/01.png
body_class: dive-into-codex-post
---

一个用TypeScript写的多Agent编排平台，GitHub星标38万。一个用Python写的单Agent自进化系统，由Nous Research开源。OpenClaw和Hermes，两种截然不同的Agent设计哲学，今天我们结合源代码，从顶层架构到核心模块，进行top-down的详细拆解和对比。

<div class="source-list">
  <a href="https://m.toutiao.com/group/7626745953294303787/">爱马仕主动蒸馏，开发者竟集体抛弃龙虾？OpenClaw vs Hermes架构对比</a>
  <a href="https://blog.csdn.net/xiaoting451292510/article/details/159249358">跟我一起学OpenClaw(08): Multi-Agent多代理路由深度</a>
  <a href="https://blog.csdn.net/qq_45825991/article/details/159698637">OpenClaw + Multi-Agent架构的落地实战解析</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/01.png' | relative_url }}" alt="OpenClaw vs Hermes" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>OpenClaw vs Hermes</h2>

一个用TypeScript写的多Agent编排平台，GitHub星标38万。一个用Python写的单Agent自进化系统，由Nous Research开源。OpenClaw和Hermes，两种截然不同的Agent设计哲学，今天我们结合源代码，从顶层架构到核心模块，进行top-down的详细拆解和对比。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/02.png' | relative_url }}" alt="两款Agent系统的源码背景" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>两款Agent系统的源码背景</h2>

先看两个项目的源码背景。OpenClaw用TypeScript编写，38万星标，5400多个社区技能插件。Hermes由Nous Research用Python开发，12600多次提交，最新版本v0.17.0。有趣的是Hermes内置了claw migrate命令，专门用于从OpenClaw迁移，说明两者定位有直接竞争关系。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/03.png' | relative_url }}" alt="万能助手悖论" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>万能助手悖论</h2>

为什么需要不同的Agent架构？核心是万能助手悖论。一个AI试图精通所有领域，结果在每个领域都表现平庸。客服对话会污染技术知识库，Opus太贵而Haiku太弱，普通用户不该访问管理员工具。OpenClaw的解法是组建专业团队做多Agent编排，Hermes的解法是让单Agent通过学习循环越来越懂你。两种哲学，两条代码路径。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/04.png' | relative_url }}" alt="OpenClaw代码入口: 配置文件驱动" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>OpenClaw代码入口: 配置文件驱动</h2>

从源码top-down看OpenClaw。入口是一个JSON配置文件。agents列表数组定义所有Agent，每个Agent有id、workspace路径、model选择、personality指向人格文件。tools字段用allow和deny白名单控制权限。bindings数组定义路由规则，每条规则用match匹配消息特征，用agentId指定交给哪个Agent处理。整个系统的多Agent能力，全靠这一个配置文件驱动。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/05.png' | relative_url }}" alt="OpenClaw四层架构" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>OpenClaw四层架构</h2>

OpenClaw的源码架构是四层设计。Gateway网关层负责多通道消息接入和会话状态机管理。Brain大脑层基于LLM做任务规划，通过SKILL语义注册动态发现技能。Skills技能层支持脚本式、MCP协议和混合式三种执行方式。Memory记忆层采用热数据、温数据、冷数据三层分层，温数据就是MEMORY文件和memory目录下的日期日志文件。这套设计利用文件系统天然层次结构实现记忆管理，可审计可人工干预。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/06.png' | relative_url }}" alt="Agent独立性与模型分层" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>Agent独立性与模型分层</h2>

每个Agent在文件系统层面完全独立，各自有独立workspace目录。模型分层是核心降本策略：客服用Haiku控制成本，技术支持用Sonnet，安全审计用Opus。v2.18版本引入了ContextEngine，三档动态压缩：核心指令保留100%，关键历史保留70%，边缘数据仅保留25%，将上下文窗口利用率从62%提升到89%。还有Active Memory主动记忆，用31M参数的轻量级打分模型为记忆片段评分，超过0.75分自动提升到高速缓存。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/07.png' | relative_url }}" alt="Binding路由: 最具体优先" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>Binding路由: 最具体优先</h2>

Binding路由采用最具体优先原则。第一级匹配用户加频道加角色，优先级最高。第二级匹配特定用户的私聊。第三级匹配群组加角色权限。第四级是频道范围兜底。最后是全局默认Agent。消息进入后从最具体规则开始匹配，命中即路由，未命中则逐级下降。这套规则全部在配置文件的bindings数组里声明式配置，不需要写代码。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/08.png' | relative_url }}" alt="路由入口: 同一入口自动路由" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>路由入口: 同一入口自动路由</h2>

关键问题：OpenClaw的多Agent是用户自己选还是系统自动分配？答案是同一入口自动路由为主。所有消息从微信、Telegram等渠道进入同一个网关，系统根据Binding规则自动匹配并分配给对应Agent，用户无需手动选择。同时也支持两种手动指定方式：一是在群聊中@特定Agent直接触发，二是通过intent意图识别字段，比如消息包含订单关键词就自动路由到订单查询Agent。53AI的130个Agent就是这么工作的。对比之下Hermes是单Agent架构，所有消息进同一个循环，根本不需要路由。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/09.png' | relative_url }}" alt="Identity Links: 跨Agent身份统一" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>Identity Links: 跨Agent身份统一</h2>

Identity Links解决了跨Agent身份统一问题。Alice在客服Agent中咨询产品，需要技术支持时转到技术Agent。两个Agent通过identityLinks映射知道这是同一个人，可以传递上下文实现无缝转接。在源码中，identityLinks以用户名为key，映射到该用户在各个Agent中的会话标识，实现跨Agent的身份追溯和上下文传递。用户感知到的是连续的服务体验，而不是被反复要求重新描述问题。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/10.png' | relative_url }}" alt="三种协作模式 + 通信协议" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>三种协作模式 + 通信协议</h2>

OpenClaw支持三种核心协作模式，这些模式是开发者通过代码和配置预编排的，不是终端用户实时选择。流水线模式通过Pipeline API组装，适用于有明确步骤的任务，比如内容生产从热点抓取到选题到撰写到审核。讨论模式由主持人Agent控制流程，多角色头脑风暴。竞争模式需要预配置正方反方和裁决Agent。Agent之间通过结构化消息通信，核心是任务交接类型，携带payload任务数据和context上下文。官方文档提到当前版本主要是独立执行手动传递，自动协作是未来演进方向。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/11.png' | relative_url }}" alt="Hermes代码入口: 主循环文件" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>Hermes代码入口: 主循环文件</h2>

从源码top-down看Hermes。入口是主循环文件，它是Agent循环的起点。transports子目录是Transport ABC抽象层，包含Anthropic、ChatCompletions、ResponsesApi、Bedrock四种传输实现，每种处理不同API格式。状态管理模块管理SQLite数据库，启用WAL预写日志和FTS5全文索引。skills目录存储Agent自动提炼的可复用技能。整个系统围绕这一个主循环运转，没有编排层，没有多Agent集群。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/12.png' | relative_url }}" alt="Hermes单Agent循环" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>Hermes单Agent循环</h2>

Hermes的核心是单Agent持久循环。每条消息经过同一套流程：输入、推理、工具使用、记忆、输出。真正的区别在于任务结束之后。Hermes会评估这次任务是否值得保留，把有效方法提炼成可复用skill，写入skills目录。下次遇到类似任务不再重新走步骤，而是直接执行已保存的工作流。这就是Hermes的自进化能力，不靠配置堆规则，而是在使用中长出技能。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/13.png' | relative_url }}" alt="Hermes四层记忆系统" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Video Notes</p>
<h2>Hermes四层记忆系统</h2>

Hermes把记忆拆成四层，源码层面各有承载。第一层提示记忆是MEMORY和USER文件，常驻上下文但限制3575字符，逼系统只留真正重要的信息。第二层会话检索由状态管理模块管理，所有session写入SQLite并建FTS5索引，只在需要时搜索并做LLM摘要。第三层技能程序性记忆保存怎么做而非发生了什么，默认只加载skill名称和摘要，需要时才懒加载完整内容。第四层Honcho用户建模跨session被动追踪用户偏好和沟通风格。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/14.png' | relative_url }}" alt="Hermes插件系统与Transport ABC" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">014 / Video Notes</p>
<h2>Hermes插件系统与Transport ABC</h2>

Hermes的扩展能力来自插件系统和Transport ABC。插件系统提供丰富的钩子：命令注册接口可以注册斜杠命令，工具调度接口从代码直接调用工具，工具调用前钩子拥有否决权，结果转换钩子可以重写工具返回结果。还支持Shell钩子，用Shell脚本扩展生命周期事件无需写Python。Transport ABC把格式转换和HTTP传输从主循环中提取到传输层目录，每种传输层实现独立的API格式，支持Anthropic、OpenAI兼容、AWS Bedrock等，可插拔切换。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/15.png' | relative_url }}" alt="代码级核心差异" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">015 / Video Notes</p>
<h2>代码级核心差异</h2>

从源码层面总结核心差异。语言上OpenClaw是TypeScript，Hermes是Python。状态管理上，OpenClaw用文件系统做per-agent workspace隔离，Hermes用SQLite中心化管理。模型抽象上，OpenClaw有多模型适配层支持动态路由，Hermes用Transport ABC实现可插拔切换。扩展机制上，OpenClaw是配置文件驱动，Hermes是插件hooks代码驱动。追踪上，OpenClaw用OTEL全链路追踪，Hermes用子代理可观测性叠加层。两套代码两种哲学，殊途同归。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/16.png' | relative_url }}" alt="架构选型: 多Agent vs 单Agent" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">016 / Video Notes</p>
<h2>架构选型: 多Agent vs 单Agent</h2>

架构选型上两者各有优势。OpenClaw的多Agent编排适合需要专业分工、权限隔离和多Agent协作的企业场景，53AI用它部署了130个Agent替代30人团队。Hermes的单Agent循环适合需要学习进化、记忆沉淀和自托管的个人场景，5美元VPS就能跑，17个消息平台通过网关统一接入。Hermes的网关是循环的一部分，会话绑定用户ID而非平台，从Telegram切换到终端不丢上下文。OpenClaw的网关只负责交付，skill创建和记忆写入是独立机制。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-openclaw-hermes/images/17.png' | relative_url }}" alt="选型建议" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">017 / Video Notes</p>
<h2>选型建议</h2>

怎么选？如果你的场景是多部门、多角色、多安全级别的企业部署，需要专业分工和权限隔离，需要5400多个社区技能生态，选OpenClaw。如果你需要的是一个日常使用、跨多个平台、任务有重复性且会不断演化的个人助理，需要长期记忆和工作流沉淀，需要自进化学习循环，选Hermes。两者不是替代关系，Hermes甚至内置了从OpenClaw迁移的命令。不同场景，不同最优解。
</div>
</section>
