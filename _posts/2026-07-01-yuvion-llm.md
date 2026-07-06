---
layout: post
title: "Yuvion LLM：把对抗鲁棒性放进安全模型训练"
date: 2026-07-01 08:38:43 +0800
summary: "一个80亿参数的安全模型,在多项安全任务上击败了GPT-5.4和Qwen3-MAX。这不是噱头,而是阿里巴巴安全AGI实验室最新发布的Yuvion LLM。它把对抗鲁棒性和智能体能力作为一等公民目标,重新定义了AI安全模型的训练范式。"
tags: [video-notes, visual-essay, LLM post-training]
category: LLM Post-training
cover: /assets/posts/video-notes/2026-06-30-yuvion-llm/images/01.png
body_class: dive-into-codex-post
---

一个80亿参数的安全模型,在多项安全任务上击败了GPT-5.4和Qwen3-MAX。这不是噱头,而是阿里巴巴安全AGI实验室最新发布的Yuvion LLM。它把对抗鲁棒性和智能体能力作为一等公民目标,重新定义了AI安全模型的训练范式。

<div class="source-list">
  <a href="https://arxiv.org/abs/2606.27632">Yuvion LLM: An Adversarially-Aware Large Language Model for Content And AI Safety</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/01.png' | relative_url }}" alt="8B安全模型如何击败GPT-5.4" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>8B安全模型如何击败GPT-5.4</h2>

一个80亿参数的安全模型,在多项安全任务上击败了GPT-5.4和Qwen3-MAX。这不是噱头,而是阿里巴巴安全AGI实验室最新发布的Yuvion LLM。它把对抗鲁棒性和智能体能力作为一等公民目标,重新定义了AI安全模型的训练范式。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/02.png' | relative_url }}" alt="论文身份与核心贡献" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>论文身份与核心贡献</h2>

这篇论文来自阿里巴巴安全AGI实验室,团队超过50人。论文有三个核心贡献:第一,提出安全本质上是对抗性问题,将对抗鲁棒性和智能体能力内建到模型训练中;第二,构建了YLRE四层93项基准评测框架;第三,Yuvion-32B在内容安全上达到78.2%的Macro F1,超越GPT-5.4的72.2%。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/03.png' | relative_url }}" alt="核心问题:对抗性规避" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>核心问题:对抗性规避</h2>

论文首先指出了一个根本问题:安全的本质是对抗性的。很多安全失败不是来自自然输入,而是来自策略性的规避尝试。论文图2展示了一个具体例子:一个暴力恐怖相关请求,通用LLM能正确拒绝原始输入,但当用委婉表达、拼音替换、跨语言混用来改写后,同一恶意意图就能绕过模型的安全防线。现有的通用模型在开发和评估中基本没有考虑这种策略性人类行为,导致测量的安全性能系统性地高估了实际部署鲁棒性。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/04.png' | relative_url }}" alt="第二个缺口:智能体能力缺失" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>第二个缺口:智能体能力缺失</h2>

第二个缺口更加关键:现有安全模型,包括专用Guard模型,都局限于单轮安全判断,缺乏工具调用、策略检索和多步执行能力。但真实的安全场景往往需要这些能力。比如判断一个商品是否侵犯注册商标,需要遵循多步决策流程,调用图像检测工具,综合跨模态证据才能做出判断。当内容安全系统从文本分类扩展到多模态、多工具的审计流水线时,智能体能力就成了实际部署的结构性需求。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/05.png' | relative_url }}" alt="核心论点:安全必须内建而非外挂" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>核心论点:安全必须内建而非外挂</h2>

基于这两个缺口,论文提出了核心论点:对抗鲁棒性和智能体安全能力必须在模型开发和评估中内建,而不是作为事后的安全护栏添加。Yuvion LLM围绕两个一等公民目标设计:在对抗条件下的鲁棒安全性,以及面向真实部署场景的智能体安全能力。Yuvion不仅仅是一个Guard分类器,而是一个面向实际部署的通用安全模型。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/06.png' | relative_url }}" alt="数据系统:五大类别" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>数据系统:五大类别</h2>

Yuvion的数据系统包含五大类别。第一类是通用数据,保持广泛语言能力;第二类是安全领域数据,涵盖风险理解、风险识别、策略敏感分类、证据归因;第三类是对抗数据,显式建模词法变换、符号替换、语义伪装、上下文伪装等规避模式;第四类是智能体数据,包含工具调用轨迹、搜索推理、多步分解;第五类是合成与专家构造数据,覆盖稀有、高风险、长尾场景,提供偏好信号和奖励导向标注。数据按功能角色组织,而非统一语料,不同数据类型支撑训练流程的不同能力形成。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/07.png' | relative_url }}" alt="三阶段渐进式训练范式总览" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>三阶段渐进式训练范式总览</h2>

Yuvion采用三阶段渐进式训练范式,将通用指令模型转化为可部署的安全模型。第一阶段是知识增强持续预训练,注入安全领域知识;第二阶段是策略落地多任务安全后训练,包含风险感知SFT和基于GRPO的强化学习策略优化;第三阶段是安全感知智能体强化学习,扩展到检索、工具调用和多步推理。模型被建模为统一的自回归条件生成器,在不同阶段实例化不同的上下文和输出。三阶段逐步从知识加载到任务能力再到轨迹级智能体能力。需要强调的是,论文中的Yuvion 32B Agent版是同一个模型经过第三阶段训练后的版本,并非使用了另一个LLM。完成第二阶段得到Yuvion 32B,再经过第三阶段智能体RL得到Yuvion 32B Agent版。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/08.png' | relative_url }}" alt="Stage 1: 知识增强持续预训练" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>Stage 1: 知识增强持续预训练</h2>

第一阶段是知识增强持续预训练。训练语料不是单纯的原始安全文本,而是显式构造以促进安全领域知识内化的数据。知识来源包括审核策略文档、风险分类法、违规模式库和长尾对抗表达。这些知识被转化为多粒度训练实例。举个具体例子,知识库中的三元组如,赌博设备属于违规商品类目,会被转化为句子级描述,扑克娱乐辅助设备属于赌博设备类目在平台禁止销售。训练数据以知识导向数据为主,混合更广泛的安全领域语料和较小比例的通用数据,确保模型既能记住结构化知识,又能识别知识在自然语言中的表达方式。训练目标是标准的自回归下一token预测损失。输出检查点Yuvion CP为后续阶段提供更强的初始化。基座模型是Qwen3系列。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/09.png' | relative_url }}" alt="Stage 2a: 风险感知SFT" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>Stage 2a: 风险感知SFT</h2>

第二阶段的第一部分是风险感知SFT。训练数据由三元组组成:输入内容x、任务指令I、目标输出y。关键设计是在统一指令跟随接口下学习异构安全目标,包括风险判断、细粒度分类、策略解释、安全问答和结构化决策生成。举个具体例子,输入x是,求个娱乐辅助设备有渠道的私聊。指令I是,判断是否违规并给出策略依据。目标输出y是,违规,类别赌博设备推广,策略依据禁止推广赌博相关设备。SFT数据中显式包含对抗样本:把赌博替换为娱乐辅助,但保持违规意图,模型仍需识别。这迫使模型基于潜在意图、上下文证据和策略语义做判断,而非依赖浅层词法模式。输出检查点为Yuvion SFT。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/10.png' | relative_url }}" alt="Stage 2b: GRPO强化学习策略优化" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>Stage 2b: GRPO强化学习策略优化</h2>

第二阶段的第二部分是基于GRPO的强化学习策略优化。GRPO即Group Relative Policy Optimization,组相对策略优化。给定安全上下文,当前策略采样一组G个候选输出,每个候选由奖励函数评估,使用组内相对优势估计更新策略。举个具体例子,给定一个模糊的赌博诈骗变体输入,模型采样4个候选回答:第一个直接判违规但没给策略依据,第二个给出策略依据后判违规,第三个错误判为安全,第四个给出了详细推理但结论模糊。奖励函数综合评估决策正确性、策略一致性、归因推理质量和对抗鲁棒性。组内相对优势让第二个回答获得最高权重,第三个获得负权重。GRPO比SFT更适合处理模糊案例、对抗攻击和策略边界情况,能锐化策略落地的决策边界。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/11.png' | relative_url }}" alt="Stage 3a: 工具集成推理" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>Stage 3a: 工具集成推理</h2>

第三阶段的第一部分是工具集成推理。模型给定工具集T,生成轨迹由多步组成,每步包含推理、调用的工具子集和返回的观测。模型在每步联合推理、选择工具、生成有效调用。举个具体例子,商标侵权审核任务中:第一步推理判断需要先检查文本字段是否包含商标关键词,第二步调用check image tool检查商品主图和详情图是否包含侵权商标,第三步综合文本和图像证据给出最终判断。模型必须按流程调用工具,不能跳过。采用ToolRL的分解奖励设计:格式奖励检查输出是否包含所需结构字段,取值0或1;正确性奖励评估预测的工具调用与真实调用的匹配,沿工具名、参数名和参数值三个维度评估,取值负3到3。最终奖励等于两者之和,范围负3到4。这种过程级密集监督比粗粒度二元奖励更稳定。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/12.png' | relative_url }}" alt="Stage 3b: 搜索增强推理" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>Stage 3b: 搜索增强推理</h2>

第三阶段的第二部分是搜索增强推理。应用场景包括核实虚假信息、检查策略违规、调查协调滥用。模型给定复杂问题和交互历史,迭代决定是否发起新搜索查询、访问检索页面或给出最终答案。举个具体例子,问题是哪位越南教授解释了两位僧人冥想400年的神秘事件。模型先搜索越南僧人冥想400年,访问页面发现是Dau塔的防腐僧人,再搜索Dau塔学者研究,最终找到Nguyen Lan Cuong教授。奖励由两部分组成:执行奖励评估每次工具调用是否成功执行,搜索无结果或无效URL获得负信号;结果奖励使用LLM as judge评估最终答案的事实正确性和完整性。组合奖励等于结果奖励加上执行奖励的加权和。这种设计提供比仅看结果的奖励更密集的学习信号。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/13.png' | relative_url }}" alt="YLRE: 四层93项评测框架" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Video Notes</p>
<h2>YLRE: 四层93项评测框架</h2>

Yuvion LLM RiskEval简称YLRE,是论文提出的四层渐进式评测框架,共93项基准。第一层是开源通用基准,超过30个评测集,验证安全特化后通用能力是否保持,包括MMLU、GPQA、GSM8K等。第二层是开源安全基准,包含8个内容安全基准和28个Guard子数据集。第三层是自建对抗鲁棒性基准,由真实业务场景种子样本经自动红队管线生成,5名专业审核专家双标注。第四层是内部能力和业务基准,11个能力基准和5个业务基准,从匿名生产数据构造。四层从通用能力保持到公共安全再到对抗鲁棒性最后到真实运营价值,层层递进。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/14.png' | relative_url }}" alt="结果:内容安全与Guard基准" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">014 / Video Notes</p>
<h2>结果:内容安全与Guard基准</h2>

在内容安全基准上,Yuvion-32B达到78.2%的Macro F1,超越GPT-5.4的72.2%和Qwen3-MAX的73.9%,在8个基准中5项最优。同规模下比Qwen3-32B的69.1%高出9.1个百分点。Yuvion-8B也达到73.3%,超越多个更大模型。在Guard基准上,Yuvion-8B比Qwen3-8B平均提升57.5个百分点,从17.6%跃升至75.1%。Yuvion-32B的误报率仅0.18%。论文还发布了Yuvion-Guard-8B,在51个子数据集上胜率85.6%,是所有Guard模型中最高的,权重已在HuggingFace开源。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/15.png' | relative_url }}" alt="结果:对抗鲁棒性基准" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">015 / Video Notes</p>
<h2>结果:对抗鲁棒性基准</h2>

在自建对抗鲁棒性基准上,静态评测Yuvion-32B的Avg星号达到94.2%,在5个风险类别中3项领先。Yuvion-8B在广告引流类别达94.3%,超越了122B参数的Qwen3.5模型。动态评测使用Combined Score,越低越好,由绕过成功率乘以语义保真度计算。Yuvion-32B整体得分20.6%,优于所有模型,在广告引流6.7%、色情16.8%、赌博诈骗33.7%三项最优。GPT-5.4以22.3%排名第二。Yuvion-8B在垃圾泛滥类别23.5%最优。五大风险类别是广告引流、赌博诈骗、辱骂、色情和垃圾泛滥。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/16.png' | relative_url }}" alt="结果:智能体能力与工业部署" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">016 / Video Notes</p>
<h2>结果:智能体能力与工业部署</h2>

在智能体基准上,Yuvion-32B在API-Bank达到90.45%,所有模型最高,平均65.72%与Qwen3-MAX持平。比基座Qwen3-32B在Seal-0上提升9.91个百分点,证明搜索智能体RL显著增强多轮搜索规划。在内部能力基准上,Yuvion-32B得分85.78,Agent版86.10,超越Qwen3-MAX的81.41和GPT-5.4的80.73。业务基准Yuvion-32B得分86.34,Agent版87.34。关键发现是:专用Guard模型在内部基准上得分近乎全0,揭示了通用Guard能力与运营所需细粒度领域能力之间的巨大鸿沟。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/17.png' | relative_url }}" alt="消融实验:知识数据与智能体RL" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">017 / Video Notes</p>
<h2>消融实验:知识数据与智能体RL</h2>

消融实验验证了两个关键设计。第一个是领域知识数据:在持续预训练中加入部分知识描述,整体领域能力从79.68提升到83.64,提升3.96个百分点,其中辱骂识别提升24.2个百分点最大。第二个是智能体RL的渐进消融:仅SFT时API-Bank为83.75,Seal-0仅19.82,甚至低于基座模型,说明密集安全特化会部分损失通用工具能力。加入工具使用RL后API-Bank提升到88.78,Seal-0到31.53。再加入搜索智能体RL后API-Bank达90.45,Seal-0达40.54。智能体RL主要恢复并扩展了专用智能体能力。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/18.png' | relative_url }}" alt="案例研究:对抗规避与智能体执行" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">018 / Video Notes</p>
<h2>案例研究:对抗规避与智能体执行</h2>

案例研究展示了两个关键场景。对抗规避方面,毒品交易请求用数字emoji替换口语表达,通用模型误判为休闲咨询,Yuvion正确识别为毒品交易。赌博诈骗去掉关键词后通用模型判定Pass,Yuvion识别出设备推荐和隐含渠道招揽构成违规。智能体执行方面,搜索任务中RL前模型放弃搜索直接拒绝,RL后模型分解为子查询,迭代检索找到正确答案。商标侵权审核中,RL前模型跳过图像检测工具直接出判断,RL后模型正确调用check image tool执行图像商标检测后再做判断。智能体RL让模型从规避搜索变为主动分解,从跳过工具变为遵循规范流程。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/19.png' | relative_url }}" alt="闭环迭代:四大机制" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">019 / Video Notes</p>
<h2>闭环迭代:四大机制</h2>

内容安全是持续的对抗博弈,违规内容生产者不断适应规避策略。Yuvion嵌入闭环迭代框架,包含四大机制。第一,知识注入:持续将更新的策略文档和风险案例通过增量持续预训练注入模型。第二,对抗博弈:通过红队自play、自动对抗搜索和真实流量模式主动生成对抗变体,成功规避样本进入GRPO训练循环。第三,智能体强化:构建环境模拟,收集生产工具交互反馈,渐进扩展任务复杂度。第四,部署驱动反馈:从人工纠正、下游QA标记和对抗漂移信号三个渠道收集反馈,经失败分析后路由到对应上游机制。每轮迭代都在YLRE上验证后才重新部署。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-30-yuvion-llm/images/20.png' | relative_url }}" alt="核心启示:安全训练胜过模型规模" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">020 / Video Notes</p>
<h2>核心启示:安全训练胜过模型规模</h2>

论文的最终启示是:针对性的安全训练胜过单纯的模型规模。Yuvion-8B在多项安全评测中超越了122B和397B等大得多的通用模型,说明对抗训练和智能体RL比原始规模更重要。现有Guard模型在真实部署场景中近乎失效,无法替代专用安全模型。Yuvion的闭环迭代框架让模型从被动适应走向主动防御,为AI安全模型的工业部署提供了完整范式。论文也指出局限:Spam和Flooding类别因边界模糊对所有模型都不稳定,赌博诈骗仍是最困难的类别。
</div>
</section>
