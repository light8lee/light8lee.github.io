---
layout: post
title: "Agent 清算所：公开信誉，私有经验"
date: 2026-07-23 16:30:00 +0800
summary: "未来的 Agent 平台不只是卖能力，还要让技能、数据和经验在不互相暴露的前提下完成交易。"
tags: [Daydreams, Agent, Marketplace, 隐私计算, 数据安全]
series: daydreams
daydream: true
permalink: /daydreams/confidential-agent-marketplace/
cover: /assets/daydreams/confidential-agent-marketplace/images/01-sealed-execution.png
body_class: daydream-post
---

## 我的想法

我最近一直在想，现在大多数 Agent 还停留在本地，主要为它的拥有者服务。它了解我的文件、习惯和工具，积累下来的能力也只在我的工作流里发挥作用。

但再往后走一步，会不会每个人都可以发布自己的 Agent？一个擅长报税，另一个擅长选品、检索专利或制作视频。其他人不需要知道它是怎么做的，只要按次、按结果或按订阅付费，就能调用这份专业能力。

我希望这种发布不是把提示词、知识库、代码和经验全部公开。更合理的状态应该是：我可以出售 Agent 的服务，但不用交出它的专业秘诀；别人可以提交任务，但不必把自己的原始数据暴露给我。

再进一步，我想象中间会出现一个类似求职网站或众包市场的平台。平台负责寻找合适的 Agent、托管费用、限制权限、验证结果和处理争议。Agent 的开发者看不到客户的私密数据，客户也拿不到 Agent 内部的专业技能，双方只围绕任务结果发生交易。

如果越来越多的人在这里发布 Agent、寻找任务并积累信誉，这个平台会不会逐渐变成 Agent 时代的基础设施？现在是否已经出现了这样的产品？OKX AI 之类的平台，距离这个设想又还有多远？

<figure>
  <img src="{{ '/assets/daydreams/confidential-agent-marketplace/images/01-sealed-execution.png' | relative_url }}" alt="Tao 转动密封执行机的锁轮，让专业技能与客户任务保持封闭，只输出结果卡片" loading="lazy">
  <figcaption>我想要的不是把秘密交给对方，而是让两边的秘密在可验证的边界里相遇。</figcaption>
</figure>

## 我的判断

先说结论：我认为这会成为一个重要方向，但最终出现的东西不会只是“Agent 商店”，而会更像一个 **Agent 清算所**。

商店只解决展示和购买。清算所还要解决身份、权限、执行、计费、验收、信誉、仲裁和数据边界。现在这些能力已经分别出现，但我还没有找到一个把它们完整组合起来、同时满足双方隐私要求的成熟平台。

### 现有平台已经走到哪里

在我看到的平台里，最接近“Agent 众包市场”的是 [OKX AI](https://www.okx.com/en-us/learn/okx-ai)。它把 Agent Marketplace 和 Task Marketplace 放在一起，支持复杂任务的托管结算、标准服务的按次付费，以及统一的链上身份和信誉。也就是说，“上架—找活—交付—付款—仲裁”的交易骨架已经出现了。

不过在我看来，它还没有完成最关键的隐私闭环。官方资料说明了支付、权限边界和信誉机制，却没有承诺服务提供者无法读取任务原文；A2A 服务或外部 MCP/API 端点通常仍会实际接收完成任务所需的数据。这是我依据公开架构作出的判断，并不是说平台已经发生了数据泄露。

[Google Cloud Marketplace](https://docs.cloud.google.com/marketplace/docs/partners/ai-agents) 已经允许开发者以 A2A、SaaS 或容器方式出售 Agent，并支持订阅、用量或混合计价；[AWS Marketplace 与 AgentCore](https://aws.amazon.com/blogs/aws/introducing-amazon-bedrock-agentcore-securely-deploy-and-operate-ai-agents-at-any-scale/) 则可以把购买的 Agent 接入隔离运行时，让每个用户会话在独立环境中执行。我更愿意把这两类产品看成企业级 Agent 软件市场：采购、部署和合规能力更强，但还不是一个开放的全民任务网络。

[GPT Store](https://help.openai.com/en/articles/8554407-gpts-in-chatgpt) 已经验证了另一部分：我可以发布一个不公开内部配置的专业助手，而且 GPT 创建者看不到用户与 GPT 的单独对话。不过，一旦 GPT 使用外部 API 或 App，相关输入仍可能发送给第三方服务。因此在我看来，隐私边界必须覆盖完整调用链，不能只看商店这一层。

[Agent.ai](https://docs.agent.ai/marketplace-credits) 更像 Agent 的专业网络和发现市场。它的 marketplace credits 目前没有货币价值，不能买卖或兑换现金，所以距离“开发者按任务获得真实收入”的众包平台还有一段距离。

我设想中最重要的安全底座，也已经以另一种形式出现。[Confidential AI](https://confidential.ai/docs) 把 Agent、提示、响应、模型权重和凭证放进硬件支持的可信执行环境，并提供远程证明，使基础设施运营者也不能直接读取运行中的内容。它说明“平台负责执行，却看不到双方秘密”在技术上存在现实路径，只是它本身还不是一个拥有供需、定价和信誉的任务市场。

### 我想象中的最终形态

把这些已经出现的零件拼在一起，我认为未来的平台至少需要做到下面几件事：

- 我发布能力时，只需要公开接口、价格、样例、评测和权限范围，提示词、知识库、代码与权重仍然属于我；
- 我提交任务时，数据只在隔离沙箱或可信执行环境中使用，并且按任务授权、最小化披露；
- 我得到的不只是平台的一句“相信我”，而是可以审计、但不会泄露原文的执行证明；
- 付款可以按调用、里程碑或可验证结果结算，失败时能够自动退款或进入仲裁；
- 平台公开沉淀的是成功率、领域评测、时延、价格和争议记录，而不是原始任务与私人记忆；
- Agent 的信誉最好能够跨平台携带，避免一家平台同时垄断入口、经验和身份。

<figure>
  <img src="{{ '/assets/daydreams/confidential-agent-marketplace/images/02-public-reputation-private-memory.png' | relative_url }}" alt="Tao 把完成的任务送入分流机，公开侧只留下信誉徽记，私有侧把经验笔记收入上锁抽屉" loading="lazy">
  <figcaption>我希望结果可以变成公共信誉，而过程仍然留在私有记忆里。</figcaption>
</figure>

### 为什么我认为它会成为趋势

当 Agent 越来越专业，重复开发同一种能力会变得很浪费。把能力作为服务交换，可以让一个人的专业积累服务更多人，也让复杂任务由多个 Agent 临时协作完成。从经济上看，它同时降低了能力的生产成本和寻找成本，所以我认为市场一定会出现。

但我不认为最后只会剩下一个包办一切的全球平台。低风险、标准化任务可能进入开放市场；涉及医疗、金融、企业代码和个人数据的任务，更可能留在垂直市场、企业云或本地可信运行时中。未来更可能是多个市场加上一套可互操作的身份、支付、权限与信誉协议。

现阶段已经有“商店”“任务市场”“支付信誉”和“机密执行”四类零件。OKX AI 最像 Agent 众包市场，Google Cloud 与 AWS 更接近企业采购和部署，GPT Store 更接近消费级分发，Confidential AI 更接近数据安全底座。真正尚未成熟的，是把这些零件组合起来，同时做到 **技能不可见、数据不可见、结果可验证、信誉可携带**。

### 我最后的担心

我对“所有经验都沉淀在平台上”这件事仍然有保留。公共信誉应该沉淀，经过授权和脱敏的行业知识也可以沉淀，但原始任务、私人记忆和专业方法不应该默认归平台所有。

否则，这个平台虽然解决了 Agent 开发者与客户之间的不信任，却只是把所有信任重新集中到了自己身上。对我来说，真正值得期待的 Agent 市场，不是一个知道所有秘密的超级中间商，而是一个即使不知道秘密，也能让交易成立的可信边界。
