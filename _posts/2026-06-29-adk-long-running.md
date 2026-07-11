---
layout: post
title: "Build long-running AI agents that pause, resume, and never lose context with ADK"
date: 2026-06-29 10:35:09 +0800
summary: "### Scene 01 - Hook Agent重启就失忆？大多数Agent教程止步于无状态聊天机器人。真实企业流程跨天跨周，无状态Agent撑不过去。"
tags: [智能体, 长程任务, 记忆系统]
category: Agent
cover: /assets/posts/video-notes/2026-06-29-adk-long-running/images/01.png
body_class: dive-into-codex-post
---

### Scene 01 - Hook Agent重启就失忆？大多数Agent教程止步于无状态聊天机器人。真实企业流程跨天跨周，无状态Agent撑不过去。

<div class="source-list">
  <a href="https://developers.googleblog.com/build-long-running-ai-agents-that-pause-resume-and-never-lose-context-with-adk/">Build long-running AI agents that pause, resume, and never lose context with ADK</a>
  <a href="https://github.com/GoogleCloudPlatform/generative-ai/tree/main/agents/adk/new-hire-onboarding">New Hire Onboarding Coordinator Agent - ADK Sample</a>
  <a href="https://adk.dev/">Agent Development Kit (ADK) Documentation</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/01.png' | relative_url }}" alt="Agent重启就失忆？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>Agent重启就失忆？</h2>

大多数Agent教程止步于无状态聊天机器人，容器一重启，所有上下文全部丢失。但真实的企业流程不是五分钟就能搞定的。HR入职流程要跨两周，发票争议要等供应商回复，销售跟进要持续一个月。这些流程充满了等待时间，一个无状态Agent根本撑不过去。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/02.png' | relative_url }}" alt="Google ADK长时间运行Agent" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>Google ADK长时间运行Agent</h2>

2026年5月12日，Google开发者博客发布了一篇教程，作者是开发者关系工程师Eric Dong。文章以新员工入职协调Agent为例，教你用Agent Development Kit，也就是ADK，构建能暂停、能恢复、且永不丢失上下文的长时间运行Agent。完整源码已在GitHub开源。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/03.png' | relative_url }}" alt="无状态Agent的三大崩溃点" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>无状态Agent的三大崩溃点</h2>

无状态Agent把每条消息和每次回复都追加到对话历史，然后把整个历史塞回下一次推理。这在五分钟的问答里没问题，但跨天跨周就崩了。第一，上下文污染，数百轮对话里塞满了无关闲聊和旧工具输出，模型开始搞混自己在哪一步。第二，Token成本爆炸，每次推理都重放两周的对话历史，token预算飞速燃烧。第三，空闲期幻觉，Agent暂停三天等签名，恢复时面对海量上下文，经常编造从未发生过的中间步骤。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/04.png' | relative_url }}" alt="新员工入职：一个跨天流程" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>新员工入职：一个跨天流程</h2>

看看新员工入职会发生什么。第一步，HR发送欢迎包和文件链接。然后是等待时间，员工花几天签文件。第二步，IT开通企业邮箱和Slack账号。又是等待时间，笔记本电脑要几天才能寄到。第三步，HR发送个性化入职首日日程。这不是一次对话，而是一个有多次暂停和恢复的后台进程，还有人工审批门控和跨团队交接。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/05.png' | relative_url }}" alt="架构转变一：持久化状态机" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>架构转变一：持久化状态机</h2>

第一个架构转变是用持久化状态机替代原始JSON。不要依赖对话历史来跟踪进度，而是定义一个显式的状态模式，告诉Agent它在工作流中的确切位置。入职流程有六个状态，从START开始，依次经过WELCOME_SENT、DOCUMENTS_SIGNED、IT_PROVISIONED、HARDWARE_DELIVERED，最终到达COMPLETED。六个状态，没有歧义。Agent无法跳过步骤，也无法幻觉进度，因为状态机强制了顺序。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/06.png' | relative_url }}" alt="工具原子性推进状态" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>工具原子性推进状态</h2>

每个工具函数通过ADK的ToolContext.state原子性地更新检查点。系统指令直接从会话状态变量读取当前位置，而不是重放旧消息。Python模板会自动把current_step、new_hire_details和pending_signals填入系统提示词。每次工具调用都创建一个自动检查点。如果容器在send_welcome_packet执行后立即崩溃，状态已经写入磁盘。重启后Agent读取current_step等于WELCOME_SENT，从断点精确恢复。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/07.png' | relative_url }}" alt="架构转变二：持久化会话" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>架构转变二：持久化会话</h2>

第二个架构转变是持久化会话。在Cloud Run这样的容器化环境中，容器会冷启动、缩容到零、意外重启。如果会话存在易失内存里，每个进行中的入职流程都会丢失。解决方案是把内存会话换成ADK的DatabaseSessionService，本地用SQLite，生产用Cloud SQL。一行配置改动，每次ToolContext.state写入都被持久化到磁盘。杀死服务器，重启，Agent从正确的检查点恢复，所有新员工详情完好无损。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/08.png' | relative_url }}" alt="架构转变三：事件驱动休眠" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>架构转变三：事件驱动休眠</h2>

第三个架构转变是事件驱动休眠。等待时间是长时间运行Agent的核心挑战。主动轮询浪费算力，阻塞线程无法扩展。Agent需要真正休眠，只在外部事件到达时才唤醒。做法是暴露FastAPI的Webhook端点。当文件签名完成时，Webhook触发，OnboardingResumeHandler水合持久化会话，通过runner.run_async注入state_delta，原子性地把状态推进到DOCUMENTS_SIGNED。模型看到新状态，立即知道该委托IT开通。容器在空闲期可以缩容到零。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/09.png' | relative_url }}" alt="多Agent委托协作" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>多Agent委托协作</h2>

把所有工具塞进一个Agent的系统提示词会降低推理质量，尤其在长时间运行的上下文中。ADK的多Agent架构让你把专门任务委托给聚焦的子Agent。入职协调器在文档签收后，把IT开通委托给专门的it_agent子Agent。子Agent独立处理账号开通，更新共享状态为IT_PROVISIONED，然后把控制权交回协调器。每个Agent都有聚焦的提示词和狭窄的工具集，即使积累了数周的状态，推理依然敏锐。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/10.png' | relative_url }}" alt="黄金评估：模拟空闲时间" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>黄金评估：模拟空闲时间</h2>

你不能等两周才发现Agent跳过了某个步骤。ADK评估集让你在几秒内模拟空闲时间延迟和Webhook触发。一个黄金测试用例验证Agent拒绝跳过步骤。当用户问能不能跳过文件签名直接开通账号时，Agent必须留在WELCOME_SENT门控，不调用任何工具。另一个测试预置状态为IT_PROVISIONED，确认Agent在模拟48小时硬件延迟后正确恢复，依次调用check_hardware_delivery和send_day_one_schedule，不丢失新员工的原始上下文。这些测试直接嵌入CI/CD流水线。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/11.png' | relative_url }}" alt="部署到Agent Runtime" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>部署到Agent Runtime</h2>

评估通过后，用Agents CLI一行命令部署到Agent Runtime。Agent Runtime开箱即用地处理会话持久化、自动扩缩容，包括空闲期缩容到零，以及Cloud Trace集成。本地跑SQLite的检查点恢复架构，在生产中跑托管云存储，无需改一行代码。同样的模式适用于发票争议、采购审批、销售跟进、合规审计，任何有人工暂停、跨系统交接或多天时间线的工作流都适用。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-29-adk-long-running/images/12.png' | relative_url }}" alt="从对话玩具到生产后台进程" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>从对话玩具到生产后台进程</h2>

无状态Agent只是Agent能力的一个子集。这篇教程展示的四个模式，持久化状态机、检查点恢复、事件驱动空闲处理、多Agent委托，把Agent从对话玩具变成了可靠管理跨天跨周工作流的生产后台进程。核心就一句话，定义状态机，持久化检查点，在空闲时间休眠，在你停下的地方醒来。
</div>
</section>
