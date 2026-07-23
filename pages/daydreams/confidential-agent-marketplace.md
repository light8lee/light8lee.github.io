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

现在的大多数 Agent 像私人工作台：懂你的文件、习惯和工具，但只为你一个人工作。下一步很自然——把擅长报税、选品、检索专利或制作视频的 Agent 作为服务发布，别人按次、按结果或按订阅付费。

真正困难的不是上架，而是让三件互相冲突的事同时成立：开发者不交出专业秘诀，客户不交出可读的原始数据，平台仍能证明任务确实被正确完成。

<figure>
  <img src="{{ '/assets/daydreams/confidential-agent-marketplace/images/01-sealed-execution.png' | relative_url }}" alt="Tao 转动密封执行机的锁轮，让专业技能与客户任务保持封闭，只输出结果卡片" loading="lazy">
  <figcaption>不是把秘密交给对方，而是让两边的秘密在可验证的边界里相遇。</figcaption>
</figure>

## 已经出现的几种形态

最接近“众包求职平台”的是 [OKX AI](https://www.okx.com/en-us/learn/okx-ai)：它把 Agent Marketplace 和 Task Marketplace 放在一起，支持复杂任务的托管结算、标准服务的按次付费，以及统一的链上身份和信誉。它已经覆盖了“上架—找活—交付—付款—仲裁”的交易骨架。

但它还不等于你描述的隐私平台。官方资料说明了支付、边界和信誉，却没有承诺服务提供者无法读取任务原文；A2A 服务或外部 MCP/API 端点通常仍会实际接收完成任务所需的数据。这是依据公开架构作出的判断，不是对其发生数据泄露的指控。

[Google Cloud Marketplace](https://docs.cloud.google.com/marketplace/docs/partners/ai-agents) 已允许开发者以 A2A、SaaS 或容器方式出售 Agent，并支持订阅、用量或混合计价；[AWS Marketplace 与 AgentCore](https://aws.amazon.com/blogs/aws/introducing-amazon-bedrock-agentcore-securely-deploy-and-operate-ai-agents-at-any-scale/) 则把购买的 Agent 接入隔离运行时，让每个用户会话在独立环境中执行。这两者更像企业软件市场：采购、部署和合规较强，但还不是开放式的全民任务众包网络。

[GPT Store](https://help.openai.com/en/articles/8554407-gpts-in-chatgpt) 已经验证了“发布一个不公开内部配置的专业助手”这条路径。GPT 创建者看不到用户与 GPT 的单独对话；不过，一旦 GPT 使用外部 API 或 App，相关输入可能发送给第三方服务，因此隐私边界取决于完整调用链，而不只取决于商店本身。

[Agent.ai](https://docs.agent.ai/marketplace-credits) 更像 Agent 的专业网络和发现市场；其 marketplace credits 目前没有货币价值，不能买卖或兑换现金，所以离“开发者按任务获得真实收入”的众包平台还有一段距离。

另一块拼图已经由机密计算单独出现。[Confidential AI](https://confidential.ai/docs) 把 Agent、提示、响应、模型权重和凭证放进硬件支持的可信执行环境，并提供远程证明，使基础设施运营者也不能直接读取运行中的内容。它证明了“平台负责执行，却看不到双方秘密”在技术上有现实路径，但它本身不是拥有供需、定价和声誉的劳动市场。

## 可能的最终形态

因此，未来平台更像一个 Agent 清算所，而不是单纯的应用商店：

- 能力只公开接口、价格、样例、评测和权限范围，提示词、知识库、代码与权重保持私有；
- 客户数据在隔离沙箱或可信执行环境中使用，按任务授权、最小化披露，并留下可审计但脱敏的执行证明；
- 付款按调用、里程碑或可验证结果结算，失败时有自动退款或仲裁；
- 公开层只沉淀成功率、领域评测、时延、价格和争议记录，原始任务与个人记忆仍归用户或 Agent 所有；
- 信誉可以跨平台携带，避免一家平台同时垄断入口、经验和身份。

<figure>
  <img src="{{ '/assets/daydreams/confidential-agent-marketplace/images/02-public-reputation-private-memory.png' | relative_url }}" alt="Tao 把完成的任务送入分流机，公开侧只留下信誉徽记，私有侧把经验笔记收入上锁抽屉" loading="lazy">
  <figcaption>让结果变成公共信誉，让过程留在私有记忆里。</figcaption>
</figure>

## 判断

这个方向大概率会成为重要基础设施，但未必收敛成一个包办一切的全球平台。低风险、标准化任务会进入开放市场；涉及医疗、金融、企业代码和个人数据的任务，更可能留在垂直市场、企业云或本地可信运行时中。

现阶段已经有“商店”“任务市场”“支付信誉”和“机密执行”四类零件。OKX AI 是其中最像 Agent 众包市场的一块，Google Cloud 与 AWS 更接近企业采购和部署，GPT Store 更接近消费级分发，Confidential AI 更接近你要求的数据安全底座。真正尚未成熟的，是把这些零件组合起来，同时做到**技能不可见、数据不可见、结果可验证、信誉可携带**。

最值得警惕的反而是“经验都沉淀在平台上”这句话：公共信誉应该沉淀，原始经验不应该默认被平台占有。否则平台解决了 Agent 开发者与客户之间的不信任，却把所有信任重新集中到了自己身上。
