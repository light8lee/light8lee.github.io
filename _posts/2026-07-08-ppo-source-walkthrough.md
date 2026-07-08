---
layout: post
title: "图解大模型 RLHF：PPO 原理与源码解读"
date: 2026-07-08 09:38:00 +0800
summary: "从原始 PDF 提取整理 PPO 原理与源码解读内容，并搭配生成式配图作为网页阅读版。"
tags: [LLM, RLHF, PPO, source walkthrough]
category: "大模型基础知识"
cover: /assets/posts/llm-notes/ppo-source-walkthrough/images/cover.png
---

<figure class="source-cover">
  <img src="{{ '/assets/posts/llm-notes/ppo-source-walkthrough/images/cover.png' | relative_url }}" alt="图解大模型 RLHF：PPO 原理与源码解读" loading="lazy">
  <figcaption>Imagen 生成配图，基于原始文件《图解大模型RLHF系列之：人人都能看懂的PPO原理与源码解读 - 知乎.pdf》的主题绘制。</figcaption>
</figure>

> 原始文件：`D:\BaiduSyncdisk\knowledge\大模型\图解大模型RLHF系列之：人人都能看懂的PPO原理与源码解读 - 知乎.pdf`  
> 说明：下面正文尽量保留原始笔记的完整内容；Obsidian 本地图片引用会以“原文图片占位”形式保留，避免网页出现断图。

## PDF 第 1 页

图解大模型RLHF系列之：人人都能看懂的PPO原理与源码解读
 关注她
488 人赞同了该文章

伊利诺伊大学厄巴纳-香槟分校 信息管理硕士
猛猿
大家好，最近我又读了读RLHF的相关p aper和一些开源实践，有了一些心得体会，整理成这篇文章。
过去在RLHF的初学阶段， 有一个问题最直接地困惑着我 ：
•  如何在NLP语境下理解强化学习的框架？例如，我知道强化学习中有Agent、Envir onment、R ewar d、S tat e等要素，但是在NLP语境中，
它们指什么？语言模型又是如何根据奖励做更新的？
为了解答这个问题，我翻阅了很多资料，看了许多的公式推导，去研究RLHF的整体框架和loss设计。虽然吭吭哧哧地入门了，但是这个过程实
在痛苦， 最主要的原因是：理论的部分太多，直观的解释太少 。
所以，在写这篇文章时， 我直接从一个RLHF开源项目源码入手（deepspeed-chat），根据源码的实现细节，给出尽可能丰富的训练流程
图，并对所有的公式给出直观的解释。希望可以帮助大家更具象地感受RLHF的训练流程。对于没有强化学习背景的朋友，也可以无痛阅读本
文 。关于RLHF，各家的开源代码间都会有一些差异，同时也不止PPO一种RLHF方式。感兴趣的朋友，也可以读读别家的源码，做一些对比。
后续有时间，这个系列也会对各种RLHF方式进行比较。
【 如果觉得本文有帮助，欢迎点赞收藏和喜欢～】
与LLM相关的往期技术文章汇总可见：
一 、 强 化 学 习 概 述
1 .1  强 化 学 习 整 体 流 程

## PDF 第 2 页

•  强化学习的两个实体： 智能体（Agent） 与 环境（Envir onment）
•  强化学习中两个实体的交互：
•  状态空间S ：S即为S tat e，指环境中所有可能状态的集合
•  动作空间A ：A即为Action，指智能体所有可能动作的集合
•  奖励R： R即为R ewar d，指智能体在环境的某一状态下所获得的奖励。
以上图为例，智能体与环境的交互过程如下：
•  在  时刻，环境的状态为  ，达到这一状态所获得的奖励为
•  智能体观测到  与  ，采取相应动作
•  智能体采取  后，环境状态变为  ，得到相应的奖励
智能体在这个过程中学习，它的最终目标是： 找到一个策略，这个策略根据当前观测到的环境状态和奖励反馈，来选择最佳的动作。
1 .2  价 值 函 数
在1.1中，我们谈到了奖励值  ，它表示环境进入状态  下的 即时奖励 。
但如果只考虑即时奖励，目光似乎太短浅了 ：当下的状态和动作会影响到未来的状态和动作，进而影响到未来的整体收益。
所以，一种更好的设计方式是： t时刻状态s的总收益 = 身处状态s能带来的 即时收益  + 从状态s出发后能带来的 未来收益 。 写成表达式就是：
其中：
•   ：  时刻的总收益，注意这个收益蕴涵了“即时”和“未来”的概念
•   ：  时刻的即时收益
•   ：  时刻的总收益，注意这个收益蕴涵了“即时”和“未来”的概念。而  对  来说就是“未来”。
•   ：折扣因子。它决定了我们在多大程度上考虑将“未来收益”纳入“当下收益”。
注：在这里，我们不展开讨论RL中关于价值函数的一系列假设与推导，而是直接给出一个便于理解的简化结果，方便没有RL背景的朋友能倾注
更多在“PPO策略具体怎么做”及“对PPO的直觉理解”上。

## PDF 第 3 页

二 、 N LP 中 的 强 化 学 习
我们在第一部分介绍了通用强化学习的流程，那么我们要怎么把这个流程对应到NLP任务中呢？ 换句话说，NLP任务中的智能体、环境、状
态、动作等等，都是指什么呢？
回想一下我们对NLP任务做强化学习（RLHF）的目的： 我们希望给模型一个pr ompt，让模型能生成符合人类喜好的r esponse 。再回想一下
gpt模型做推理的过程： 每个时刻   只产生一个t ok en，即t ok en是一个一个蹦出来的，先有上一个t ok en，再有下一个t ok en。
复习了这两点，现在我们可以更好解读上面这张图了：
•  我们先喂给模型一个pr ompt，期望它能产出符合人类喜好的r esponse
•  在  时刻，模型根据上文，产出一个t ok en， 这个t ok en即对应着强化学习中的动作，我们记为  。因此不难理解，在NLP语境下，强化学
习任务的动作空间就对应着词表。
•  在  时刻， 模型产出t ok en 对应着的即时收益为 ，总收益为 （ 复习一下，  蕴含着“即时收益”与“未来收益”两个内容）。这
个收益即可以理解为“ 对人类喜好的衡量 ”。此刻， 模型的状态从 变为 ，也就是从“上文”变成“上文 + 新产出的t ok en”
•  在NLP语境下，智能体是语言模型本身，环境则对应着它产出的语料
这样，我们就大致解释了NLP语境下的强化学习框架，不过针对上面这张图，你可能还有以下问题：
（1）问题1：图中的下标是不是写得不太对？例如根据第一部分的介绍，   应该对应着   ，   应该对应着   ，以此类推？
答：你说的对。但这里我们不用太纠结下标的问题，只需要记住在对应的r esponse t ok en位置，会产生相应的即时奖励和总收益即可。之所以
用图中这样的下标，是更方便我们后续理解代码。
（2）问题2：我知道   肯定是由语言模型产生的，那么   是怎么来的呢，也是语言模型产生的吗？
答：先直接说结论，  是由我们的语言模型产生的，  则分别由另外两个模型来产生，在后文中我们会细说。
（3）问题3：语言模型的参数在什么时候更新？是观测到一个   ，就更新一次参数，然后再去产生   吗？
答：当然不是。你只看到某个时刻的收益，就急着用它更新模型，这也太莽撞了。我们肯定是要等有足够的观测数据了（例如等模型把完整的
r esponse生成完），再去更新它的参数。这一点我们也放在后文细说。
，
，

## PDF 第 4 页

（4）问题4：再谈谈   吧，在NLP的语境下我还是不太理解它们
答：
•  首先，“收益”的含义是“对人类喜好的衡量”
•   ：即时收益，指语言模型当下产生t ok en  带来的收益
•   ： 实际期望总收益（即时+未来），指对语言模型“当下产生t ok en  ，一直到整个r esponse生产结束”后的期收益预估。因为当下
语言模型还没产出  后的t ok en，所以我们只是对它之后一系列动作的收益做了估计，因而称为“期望总收益”。
三 、 R LH F 中 的 四 个 重 要 角 色
本节中，我们在第二部分的基础上更进一步：更详细理清NLP语境下RLHF的运作流程。
我们从第二部分中已经知道：生成t ok en  和对应收益  的并不是一个模型。那么在RLHF中到底有几个模型？他们是怎么配合做训练
的？而我们最终要的是哪个模型？
如上图， 在RLHF-PPO阶段，一共有四个主要模型 ，分别是：
•  Act or Model：演员模型 ，这就是我们想要训练的目标语言模型
•  Cr itic Model：评论家模型 ，它的作用是预估总收益

## PDF 第 5 页

•  R ewar d Model：奖励模型 ，它的作用是计算即时收益
•  R efer ence Model：参考模型 ，它的作用是在RLHF阶段给语言模型增加一些“约束”，防止语言模型训歪（朝不受控制的方向更新，效果
可能越来越差）
其中:
•  Act or/Cr itic Model 在RLHF阶段是 需要训练 的（图中给这两个模型加了粗边，就是表示这个含义）；而 R ewar d/R efer ence Model 是 参
数冻结 的。
•  Critic/R ewar d/R efer ence Model共同组成了一个“奖励-loss”计算体系（我自己命名的，为了方便理解），我们综合它们的结果计算
loss，用于更新Act or和Critic Model
我们把这四个部分展开说说。
3 .1  Ac t o r  M o d e l  ( 演 员 模 型 )
正如前文所说， Act or就是我们想要训练的目标语言模型。我们一般用SF T阶段产出的SF T模型来对它做初始化。
我们的最终目的是让Act or模型能产生符合人类喜好的r esponse。所以我们的策略是，先喂给Act or一条pr ompt （这里假设b at ch_size = 1，
所以是1条pr ompt），让它生成对应的r esponse。然后，我们再将“pr ompt + r esponse "送入我们的“奖励-loss”计算体系中去算得最后的
loss，用于更新act or。
3 .2  R e fe r e n c e  M o d e l （ 参 考 模 型 ）
R efer ence Model（以下简称R ef模型）一般也用SF T阶段得到的SF T模型做初始化，在训练过程中，它的参数是冻结的。 R ef模型的主要作用
是防止Act or ”训歪”，那么它具体是怎么做到这一点的呢？

## PDF 第 6 页

“防止模型训歪”换一个更详细的解释是： 我们希望训练出来的Act or模型既能达到符合人类喜好的目的，又尽量让它和SF T模型不要差异太
大 。简言之， 我们希望两个模型的输出分布尽量相似 。那什么指标能用来衡量输出分布的相似度呢？我们自然而然想到了 KL散度 。
如图所示：
•  对Act or模型 ，我们喂给它一个pr ompt，它正常输出对应的r esponse。那么r esponse中每一个t ok en肯定有它对应的log_pr ob结果呀，我
们把这样的结果记为 log_pr obs
•  对R ef模型 ，我们把Act or生成的"pr ompt + r esponse "喂给它，那么它同样能给出每个t ok en的log_pr ob结果，我们记其为 r ef_log_pr obs
•  那么这两个模型的输出分布相似度就可以用 r e f _ l o g _ p r o b s  -  l o g _ p r o b s 来衡量，我们可以从两个方面来理解这个公式：
•  从直觉上理解 ，r ef_log_pr obs越高，说明R ef模型对Act or模型输出的肯定性越大。即R ef模型也认为，对于某个  ，输出某个  的概
率也很高（  ）。这时可以认为Act or模型较R ef模型没有训歪
•  从KL散度上理解 ，  （当然这里不是严格的
等于，只是KL散度的近似），这个值越小意味着两个分布的相似性越高。
注：你可能已经注意到，按照KL散度的定义，这里写成 l o g _ p r o b s  -  r e f _ l o g _ p r o b s 更合适一些。但是如果你看过一些rlhf相关的论文的话，
你可能记得在计算损失函数时，有一项  （对这个有疑惑不要紧，我们马上在后文细说），即KL散度前带了负号，所以这里我
写成 r e f _ l o g _ p r o b s  -  l o g _ p r o b s 这样的形式，更方便大家从直觉上理解这个公式。
现在，我们已经知道怎么利用R ef模型和KL散度来防止Act or训歪了。 KL散度将在后续被用于loss的计算 ，我们在后文中会详细解释。
3 .3  C r i t i c  M o d e l （ 评 论 家 模 型 ）
Cr itic Model用于预测期望总收益   ，和Act or模型一样，它需要做参数更新 。实践中，Critic Model的设计和初始化方式也有很多种，例
如和Act or共享部分参数、从RW阶段的R ewar d Model初始化而来等等。我们讲解时，和deepspeed-chat的实现保持一致：从RW阶段的
R ewar d Model初始化而来。
你可能想问：训练Act or模型我能理解，但我还是不明白，为什么要单独训练一个Cr itic模型用于预测收益呢？
这是因为，当我们在前文讨论总收益  （即时 + 未来）时，我们是站在上帝视角的，也就是这个  就是客观存在的、真正的总收益。但是
我们在训练模型时，就没有这个上帝视角加成了， 也就是在   时刻，我们给不出客观存在的总收益   ，我们只能训练一个模型去预测它。
所以总结来说，在RLHF中，我们不仅要训练模型生成符合人类喜好的内容的能力（Act or），也要提升模型对人类喜好量化判断的能力
（Cr itic） 。这就是Critic模型存在的意义。我们来看看它的大致架构：
散 度

## PDF 第 7 页

deepspeed-chat采用了R ewar d模型作为它的初始化，所以这里我们也按R ewar d模型的架构来简单画画它。你可以简单理解成，
R ewar d/Critic模型和Act or模型的架构是很相似的（毕竟输入都一样），同时，它在最后一层增加了一个V alue Head层，该层是个简单的线形
层，用于将原始输出结果映射成单一的  值。
在图中，  表示Critic模型对  时刻及未来（r esponse完成）的收益预估。
3 .4  R e w a r d  M o d e l （ 奖 励 模 型 ）
R ewar d Model用于计算生成t ok en  的即时收益，它就是RW阶段所训练的奖励模型，在RLHF过程中，它的参数是冻结的。
你可能想问：为什么Cr itic模型要参与训练，而同样是和收益相关的R ewar d模型的参数就可以冻结呢？
这是因为，R ewar d模型是站在上帝视角的。这个上帝视角有两层含义：
•  第一点，R ewar d模型是经过和“估算收益”相关的训练的，因此在RLHF阶段它可以直接被当作一个能产生客观值的模型。
•  第二点，R ewar d模型代表的含义就是“即时收益”，你的t ok en  已经产生，因此即时收益自然可以立刻算出。
你还可能想问：我已经用Cr itic预测出   了，而这个   包含了“即时”和“未来”的概念，那我还需要代表“即时”的   做什么呢？直接
用   不就好了吗？
为了解答这个问题，我们先回顾下1.2部分中给出的价值函数：
这个函数告诉我们，我们当前可以用两个结果来表示  时刻的总收益：
•  结果1：Critic模型预测的
•  结果2：R ewar d模型预测的  和critic模型预测的

## PDF 第 8 页

那么哪一个结果更靠近上帝视角给出的客观值呢？当然是结果2，因为结果1全靠预测，而结果2中的  是事实数据。
我们知道Critic模型也是参与参数更新的，我们可以用 M S E ( 上 帝 视 角 的 客 观 收 益 - C r i t i c 模 型 预 测 的 收 益 ) 来衡量它的loss。 但是上帝视角的客观收
益我们是不知道的，只能用已知事实数据去逼近它，所以我们就用   来做近似。 这就是  同时存在的意义
R ewar d模型和critic模型非常相似，这里我们就只给出架构图，不再做过多的说明。关于R ewar d模型的训练过程，后续有时间也会出个原理和
代码解析。
四 、 R LH F 中 的 l o s s 计 算
到目前为止，我们已经基本了解了RLHF的训练框架，以及其中的四个重要角色（训练一个RLHF，有4个模型在硬件上跑，可想而知对存储的
压力）。在本节中，我们一起来解读RLHF的loss计算方式。在解读中，我们会再一次理一遍RLHF的整体训练过程，填补相关细节。在这之
后，我们就可以来看代码解析了。
在第三部分的讲解中，我们知道Act or和Critic模型都会做参数更新，所以我们的loss也分成2个：
•  Act or loss： 用于评估Act or是否产生了符合人类喜好的结果，将作用于Act or的BWD上。
•  Cr itic loss： 用于评估Critic是否正确预测了人类的喜好，将作用于Critic的BWD上。
我们详细来看这两者。
4 .1  Ac t o r  l o s s
（ 1 ） 直 观 设 计
我们先来看一个直观的loss设计方式：

## PDF 第 9 页

•  Act or接收到当前上文  ，产出t ok en  （  ）
•  Critic根据  ，产出对总收益的预测
•  那么Act or loss可以设计为：
求和符号表示我们只考虑r esponse部分所有t ok en的loss，为了表达简便，我们先把这个求和符号略去（下文也是同理），也就是说：
我们希望minimize这个act or_loss。
这个设计的直观解释是：
•  当  时，意味着Critic对Act or当前采取的动作给了正向反馈，因此我们就需要在训练迭代中提高  ，这样就能达到减小loss
的作用。
•  当  时，意味着Critic对Act or当前采取的动作给了负向反馈，因此我们就需要在训练迭代中降低  ，这样就能到达到减小
loss的作用。
一句话总结：这个loss设计的含义是，对上文   而言，如果t ok en   产生的收益较高，那就增大它出现的概率，否则降低它出现的概率。
（ 2 ） 引 入 优 势 （ Ad v a n t a g e ）
在开始讲解之前，我们举个小例子：
假设在王者中，中路想支援发育路，这时中路有两种选择：1. 走自家野区。2. 走大龙路。
中路选择走大龙路，当她做出这个决定后，Critic告诉她可以收1个人头。结果，此刻对面打野正在自家采灵芝，对面也没有什么苟草英雄，中
路一路直上，最终收割2个人头。
因为实际收割的人头比预期要多1个，中路尝到了甜头，所以她增大了“支援发育路走大龙路”的概率。
这个多出来的“甜头”，就叫做“优势”(Adv antage)。
对NLP任务来说，如果Cr itic对   的总收益预测为   ，但实际执行   后的总收益是   ，我们就定义优势为：
我们用  替换掉  ，则此刻act or_loss变为：
（ 3 ） 重 新 设 计
总结一下，到目前为止，我们的act or_loss形式为：
其中，
同时注意，这个act or_loss应该是r esponse的所有t ok en loss的sum或者av g。这里为了表达方便，我们的公式略去了求和或求平均的符号。
按照这个理解，  应该表示每个Act or产出t ok en  带来的即时收益，正如下图所示（其中  表示最后一个时刻）：

## PDF 第 10 页

但在deepspeed-chat的RLHF实践中，对  做了另一种设计：
•   ：常量，可以理解成是一个控制比例的缩放因子，在deepspeed-chat中默认设为0.1
•   ：这一项你是不是非常眼熟，这就是我们在3.2部分介绍的Act or和R ef模型间的KL散度呀，写成更容易理解的形式，就是
r e f _ l o g _ p r o b s  -  l o g _ p r o b s 。在3.2中我们说过，为了防止模型训歪，我们需要把这个KL散度加入loss计算中，所以这里我们就在做这件
事
基于这些，上面这个对   的设计可理解成：
•  当 时，我们更加关心Act or是否有在R ef的约束下生产t ok en
•  当 $ 时，我们不仅关心Act or是否遵从了R ef的约束，也关心真正的即时收益
为什么只有最后一个时刻的  被纳入了考量呢？这是因为在R ewar d模型训练阶段，就是用这个位置的  来表示对完整的pr ompt +
r esponse的奖励预测（但不妨碍你理解成是执行完  的即时奖励），然后用这个指标来做模型ev al的（但是R ewar d训练阶段算loss时，还
是考虑了r esponse部分所有t ok en输出的r ewar d值）。所以到了RLHF的场景下，其余时刻的即时奖励，我们就用“Act or是否遵循了R ef的约
束”来进行评价。
需要注意的是，  的设计并不只有这一种。deepspeed在自己的代码注释中也有提过，可以尝试把最后一个时刻的  替换成所有t ok en的
即时奖励的平均值。如果站在这个角度理解的话，我们同样也可以尝试在每一个位置的奖励衡量上引入  。

## PDF 第 11 页

代码实践如下：
d e f  c o m p u t e _ r e w a r d s ( s e l f ,  p r o m p t s ,  l o g _ p r o b s ,  r e f _ l o g _ p r o b s ,  r e w a r d _ s c o r e ,
                        a c t i o n _ m a s k ) :
        " " "
        r e w a r d _ f u n c t i o n ： 计 算 最 终 的 r e w a r d 分 数
        复 习 一 下 几 个 相 关 参 数 的 默 认 值 ：
        s e l f . k l _ c t l  =  0 . 1
        s e l f . c l i p _ r e w a r d _ v a l u e  =  5

        对 于 b a t c h 中 的 某 个 p r o m p t 来 说 ， 它 最 终 的 r e w a r d 分 数 为 ：
        ( 1 )  先 计 算 a c t o r 和 r e f _ m o d e l 的 l o g i t 相 似 度 ：  - s e l f . k l _ c t l  *  ( l o g _ p r o b s  -  r e f _ l o g _ p r o b s )
            其 实 写 成 s e l f . k l _ c t l  *  ( r e f _ l o g _ p r o b s  -  l o g _ p r o b s ) 更 好 理 解 些
            这 个 值 越 大 ， 说 明 r e f _ m o d e l 对 a c t o r 生 成 的 结 果 的 认 可 度 越 高 （ 即 表 明 r l h f 没 有 训 歪 ） ，
            没 有 训 歪 的 情 况 下 我 们 也 应 该 给 模 型 一 些 奖 励 ， 这 个 奖 励 就 是 s e l f . k l _ c t l  *  ( r e f _ l o g _ p r o b s  -  l o g _ p r o b s )

        （ 2 ） 由 于 我 们 只 取 最 后 一 个 t o k e n 对 应 位 置 的 分 数 作 为 r e w a r d _ s c o r e ， 因 此 我 们 只 需 要 ：
            s e l f . k l _ c t l  *  ( r e f _ l o g _ p r o b s  -  l o g _ p r o b s ) 的 最 后 一 位  +  r e w a r d _ s c o r e

         ( 3 )  同 时 我 们 对 r e w a r d _ s c o r e 也 做 了 大 小 限 制 ， 最 大 不 超 过 s e l f . c l i p _ r e w a r d _ v a l u e （ 超 过 统 一 给 成 s e l f . c l i p _ r e w a r d _ v a l u e ） ，
             最 小 不 低 于 - s e l f . c l i p _ r e w a r d _ v a l u e （ 低 于 统 一 给 成 - s e l f . c l i p _ r e w a r d _ v a l u e ）

         ( 4 )  最 后 返 回 的 r e w a r d s 大 小 为 ： （ b a t c h _ s i z e ,  各 条 数 据 的 长 度 ） ， 对 b a t c h 中 的 每 条 数 据 来 说 ：
             -  r e s p o n s e 的 最 后 一 位 ： s e l f . k l _ c t l  *  ( r e f _ l o g _ p r o b s  -  l o g _ p r o b s ) 的 最 后 一 位  +  r e w a r d _ s c o r e
             -  r e s p o n s e 的 其 余 位 置 ： s e l f . k l _ c t l  *  ( r e f _ l o g _ p r o b s  -  l o g _ p r o b s )

        " " "
        k l _ d i v e r g e n c e _ e s t i m a t e  =  - s e l f . k l _ c t l  *  ( l o g _ p r o b s  -  r e f _ l o g _ p r o b s )
        r e w a r d s  =  k l _ d i v e r g e n c e _ e s t i m a t e
        #  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        #  r e s p o n s e 开 始 的 位 置
        #  （ 因 为 我 们 对 p r o m p t 做 过 p a d d i n g 处 理 ， 因 此 b a t c h 中 每 个 p r o m p t 长 度 一 致 ， 也 就 意 味 着 每 个 r e s p o n s e 开 始 的 位 置 一 致 ）
        #  （ 所 以 这 里 s t a r t 是 不 加 s 的 ， 只 是 一 个 i n t ）
        #  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        s t a r t  =  p r o m p t s . s h a p e [ 1 ]  -  1
        #  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        #  r e s p o n s e 结 束 的 位 置
        #  （ 因 为 一 个 b a t c h 中 ， 每 个 r e s p o n s e 的 长 度 不 一 样 ， 所 以 r e s p o n s e 的 结 束 位 置 也 不 一 样 ）
        #  （ 所 以 这 里 e n d 是 加 s 的 ， e n d s 的 尺 寸 是 ( b a t c h _ s i z e , )
        #  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        e n d s  =  s t a r t  +  a c t i o n _ m a s k [ : ,  s t a r t : ] . s u m ( 1 )  +  1
        #  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        #  对 r e w a r d s _ s c o r e 做 限 制
        #  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        r e w a r d _ c l i p  =  t o r c h . c l a m p ( r e w a r d _ s c o r e ,  - s e l f . c l i p _ r e w a r d _ v a l u e ,
                                  s e l f . c l i p _ r e w a r d _ v a l u e )
        b a t c h _ s i z e  =  l o g _ p r o b s . s h a p e [ 0 ]
        f o r  j  i n  r a n g e ( b a t c h _ s i z e ) :
            r e w a r d s [ j ,  s t a r t : e n d s [ j ] ] [ - 1 ]  + =  r e w a r d _ c l i p [ j ]  #
        r e t u r n  r e w a r d s
（ 4 ） 重 新 设 计 优 势
好，再总结一下，目前为止我们的act or_loss为：
其中，
同时，我们对  进行来改造，使其能够衡量Act or模型是否遵从了R ef模型的约束。

## PDF 第 12 页

现在我们把改造焦点放在  上，回想一下，既然对于收益而言，分为即时和未来，那么对于优势而言，是不是也能引入对未来优势的考量
呢？这样，我们就可以把  改写成如下形式：
（熟悉强化学习的朋友应该能一眼看出这是GAE，这里我们不打算做复杂的介绍，一切都站在直觉的角度理解）
其中，新引入的   也是一个常量，可将其理解为权衡因子，直觉上看它控制了在计算当前优势时对未来优势的考量。（从强化学习的角度上，
它控制了优势估计的方差和偏差）
看到这里，你可能想问：这个代表未来优势的   ，我要怎么算呢？
注意到，对于最后一个时刻  ，它的未来收益（  ）和未来优势（  ）都是0，也就是  ，这是可以直接算出
来的。 而有了   ，我们不就能从后往前，通过动态规划的方法，把所有时刻的优势都依次算出来了吗？
代码实践如下（其中返回值中的r etur ns表示实际收益，将被用于计算Critic模型的loss，可以参见4.2，其余细节都在代码注释中）：
 d e f  g e t _ a d v a n t a g e s _ a n d _ r e t u r n s ( s e l f ,  v a l u e s ,  r e w a r d s ,  s t a r t ) :
        " " "
        A d o p t e d  f r o m  h t t p s : / / g i t h u b . c o m / C a r p e r A I / t r l x / b l o b / m a i n / t r l x / m o d e l s / m o d e l i n g _ p p o . p y # L 1 3 4

        没 有 引 入 G A E 前 的 t 时 刻 的 优 势 值 ：
        d e t a l _ t  =  r _ t  +  g a m m a  *  V _ t + 1  -  V _ t
        其 中 ：
            -  r _ t 表 示 t 时 刻 的 即 时 收 益
            -  V _ t + 1 表 示 未 来 时 刻 的 预 期 收 益
            -  r _ t  +  g a m m a  *  V _ t + 1 可 理 解 成 t 时 刻 的 实 际 预 期 收 益
            -  V _ t 可 理 解 成 t 时 刻 的 预 估 预 期 收 益 （ 是 模 型 ， 例 如 c r i t i c  m o d e l 自 己 估 算 出 来 的 ）

        引 入 G A E 后 的 t 时 刻 的 优 势 值 ：
        A _ t  =  d e l t a _ t  +  g a m m a  *  l a m b d a  *  A _ t + 1
        粗 暴 理 解 为 在 t 时 刻 时 ， 不 仅 考 虑 当 下 优 势 ， 还 考 虑 了 未 来 的 优 势
        为 了 知 道 A _ t ,  我 们 得 知 道 A _ t + 1 ， 所 以 在 本 算 法 中 采 取 了 从 后 往 前 做 动 态 规 划 求 解 的 方 法 ， 也 即 ：
        假 设 T 是 最 后 一 个 时 刻 ， 则 有 A _ T + 1  =  0 ,  所 以 有 :  A _ T  =  d e l t a _ T
        知 道 了 A _ T ,  就 可 以 依 次 往 前 倒 推 ， 把 A _ t - 1 ,  A _ t - 2 之 类 都 算 出 来 了

        引 入 G A E 后 t 时 刻 的 实 际 预 期 收 益
        r e t u r n s _ t  =  A _ t  +  V _ t
                  =  d e l t a _ t  +  g a m m a  *  l a m b d a  *  A _ t + 1  +  V _ t
                  =  r _ t  +  g a m m a  *  V _ t + 1  -  V _ t  +  g a m m a  *  l a m b d a  *  A _ t + 1  +  V _ t
                  =  r _ t  +  g a m m a  *  ( V _ t + 1  +  l a m b d a  *  A _ t + 1 )

        注 意 ， 这 里 不 管 是 a d v a n t a g e s 还 是 r e t u r n s ， 都 只 算 r e s p o n s e 的 部 分
        " " "

        #  A d o p t e d  f r o m  h t t p s : / / g i t h u b . c o m / C a r p e r A I / t r l x / b l o b / m a i n / t r l x / m o d e l s / m o d e l i n g _ p p o . p y # L 1 3 4
        l a s t g a e l a m  =  0
        a d v a n t a g e s _ r e v e r s e d  =  [ ]
        l e n g t h  =  r e w a r d s . s i z e ( ) [ - 1 ]
        #  注 意 这 里 用 了 r e v e r s e d ， 是 采 取 从 后 往 前 倒 推 计 算 的 方 式
        f o r  t  i n  r e v e r s e d ( r a n g e ( s t a r t ,  l e n g t h ) ) :
            n e x t v a l u e s  =  v a l u e s [ : ,  t  +  1 ]  i f  t  <  l e n g t h  -  1  e l s e  0 . 0
            d e l t a  =  r e w a r d s [ : ,  t ]  +  s e l f . g a m m a  *  n e x t v a l u e s  -  v a l u e s [ : ,  t ]
            l a s t g a e l a m  =  d e l t a  +  s e l f . g a m m a  *  s e l f . l a m  *  l a s t g a e l a m
            a d v a n t a g e s _ r e v e r s e d . a p p e n d ( l a s t g a e l a m )
        a d v a n t a g e s  =  t o r c h . s t a c k ( a d v a n t a g e s _ r e v e r s e d [ : : - 1 ] ,  d i m = 1 )  #  优 势
        r e t u r n s  =  a d v a n t a g e s  +  v a l u e s [ : ,  s t a r t : ]  #  实 际 收 益
        #  v a l u e s :  预 期 收 益
        r e t u r n  a d v a n t a g e s . d e t a c h ( ) ,  r e t u r n s
（ 5 ） P P O - e p o c h : 引 入 新 约 束

## PDF 第 13 页

总结一下，目前为止我们的act or_loss为：
其中，
同时
•  我们已经对 进行来改造，使其能够衡量Act or模型是否遵从了R ef模型的约束。
•  我们已经对 进行改造，使其不仅考虑了当前时刻的优势，还考虑了未来的优势
基于这些改造，我们重新理一遍RLHF-PPO的训练过程。
•  第一步，我们准备一个b at ch的pr ompts
•  第二步，我们将这个b at ch的pr ompts喂给Act or模型，让它生成对应的r esponses
•  第三步，我们把pr ompt+r esponses喂给我们的Critic/R ewar d/R efer ence模型，让它生成用于计算act or/critic loss的数据，按照强化学习
的术语，我们称这些数据为经验（experiences）。critic loss我们将在后文做详细讲解，目前我们只把目光聚焦到act or loss上
•  第四步，我们根据这些经验，实际计算出act or/critic loss，然后更新Act or和Critic模型
这些步骤都很符合直觉，但是细心的你肯定发现了， 文字描述中的第四步和图例中的第四步有差异：图中说，这一个b at ch的经验值将被用于n
次模型更新，这是什么意思呢？
我们知道， 在强化学习中，收集一个b at ch的经验是非常耗时的。对应到我们RLHF的例子中，收集一次经验，它要等四个模型做完推理才可
以 ，正是因此，一个b at ch的经验，只用于计算1次loss，更新1次Act or和Critic模型，好像有点太浪费了。
所以， 我们自然而然想到，1个b at ch的经验，能不能用来计算ppo-epochs次loss，更新ppo-epochs次Act or和Cr itic模型？ 简单写一下伪
代码，我们想要：
#  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
#  初 始 化 R L H F 中 的 四 个 模 型
#  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
a c t o r ,  c r i t i c ,  r e w a r d ,  r e f  =  i n i t i a l i z e _ m o d e l s ( )
#  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
#  训 练
#  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
#  对 于 每 一 个 b a t c h 的 数 据
f o r  i  i n  s t e p s :
    #  先 收 集 经 验 值
    e x p s  =  g e n e r a t e _ e x p e r i e n c e ( p r o m p t s ,  a c t o r ,  c r i t i c ,  r e w a r d ,  r e f )

## PDF 第 14 页

#  一 个 b a t c h 的 经 验 值 将 被 用 于 计 算 p p o _ e p o c h s 次 l o s s ， 更 新 p p o _ e p o c h s 次 模 型
    #  这 也 意 味 着 ， 当 你 计 算 一 次 新 l o s s 时 ， 你 用 的 是 更 新 后 的 模 型
    f o r  j  i n  p p o _ e p o c h s :
        a c t o r _ l o s s  =  c a l _ a c t o r _ l o s s ( e x p s ,  a c t o r )
        c r i t i c _ l o s s  =  c a l _ c r i t i c _ l o s s ( e x p s ,  c r i t i c )

        a c t o r . b a c k w a r d ( a c t o r _ l o s s )
        a c t o r . s t e p ( )

        c r i t c . b a c k w a r d ( c r i t i c _ l o s s )
        c r i t i c . s t e p ( )
而如果我们想让一个b at ch的经验值被重复使用ppo_epochs次，等价于我们想要Act or在这个过程中，模拟和环境交互ppo_epochs次。 举
个例子：
•  如果1个b at ch的经验值只使用1次，那么在本次更新完后，Act or就吃新的b at ch，正常和环境交互，产出新的经验值
•  但如果1个b at ch的经验值被使用ppo_epochs次，在这ppo_epochs中，Act or是不吃任何新数据，不做任何交互的，所以我们只能让
Act or “模拟”一下和环境交互的过程，吐出一些新数据出来。
那怎么让Act or模拟呢？很简单，让它观察一下之前的数据长什么样，让它依葫芦画瓢，不就行了吗？ 我们假设最开始吃b at ch，吐出经验的
act or叫   ，而在伪代码中，每次做完ppo_epochs而更新的act or叫   ，那么我们只要尽量保证每次更新后的
能模仿最开始的那个   ，不就行了吗？
诶！是不是很眼熟！两个分布，通过什么方法让它们相近！ 那当然是KL散度 ！所以，再回到我们的act or_loss上来，它现在就可被改进成：
我们再稍作一些改动将log去掉（这个其实不是“稍作改动去掉log”的事，是涉及到PPO中重要性采样的相关内容，大家有兴趣可以参考 这
篇 ）：
其中，  表示真正吃了b at ch，产出经验值的Act or；P表示ppo_epochs中实时迭代更新的Act or，它在模仿  的行为。 所以这个公式
从直觉上也可以理解成：在Act or想通过模拟交互的方式，使用一个b at ch的经验值更新自己时，它需要收到真正吃到b at ch的那个时刻的
Act or的约束，这样才能在有效利用b at ch，提升训练速度的基础上，保持训练的稳定。
但是，谨慎的你可能此时又有新的担心了： 虽然我们在更新Act or的过程中用   做了约束，但如果   的约束能力不够，比如
说   还是超出了可接受的范围，那怎么办？
很简单，那就 剪裁（clip） 它吧！
我们给  设置一个范围，例如 ( 0 . 8  , 1 . 2 ) ，也就是如果这个值一旦超过1.2，那就统一变成1.2；一旦小于0.8，那就统一变成0.8。
这样就能保证  和  的分布相似性在我们的掌控之内了。此时act or_loss变为：
这时要注意，如果超过变化范围，将  强制设定为一个常数后，就说明这一部分的loss和Act or模型无关了，而  这项本身也与
Act or无关。 所以相当于，在超过约束范围时，我们停止对Act or模型进行更新。
整体代码如下：

## PDF 第 15 页

 
    d e f  a c t o r _ l o s s _ f n ( s e l f ,  l o g p r o b s ,  o l d _ l o g p r o b s ,  a d v a n t a g e s ,  m a s k ) :
        " " "
        l o g p r o b s :  实 时 计 算 的 ， r e s p o n s e 部 分 的 p r o b （ 只 有 这 个 是 随 着 a c t o r 实 时 更 新 而 改 变 的 ）
        o l d _ l o g p r o b s ： 老 策 略 中 ， r e s p o n s e 部 分 的 p r o b  （ 这 个 是 固 定 的 ， 不 随 a c t o r 实 时 更 新 而 改 变 ）
        a d v a n t a g e s ：  老 策 略 中 ， r e s p o n s e 部 分 每 个 t o k e n 对 应 的 优 势 （ 这 个 是 固 定 的 ， 不 随 a c t o r 实 时 更 新 而 改 变 ）
        m a s k ： 老 策 略 中 ， r e s p o n s e 部 分 对 应 的 m a s k 情 况 这 个 是 固 定 的 ， 不 随 a c t o r 实 时 更 新 而 改 变 ）

        之 所 以 要 引 入 l o g p r o b s 计 算 a c t o r _ l o s s ， 是 因 为 我 们 不 希 望 策 略 每 次 更 新 的 幅 度 太 大 ， 防 止 模 型 训 歪

        s e l f . c l i p r a n g e :  默 认 值 是 0 . 2
        " " "
        # #  p o l i c y  g r a d i e n t  l o s s
        #  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        #  计 算 新 旧 策 略 间 的 K L 散 度
        #  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        l o g _ r a t i o  =  ( l o g p r o b s  -  o l d _ l o g p r o b s )  *  m a s k
        r a t i o  =  t o r c h . e x p ( l o g _ r a t i o )
        #  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        #  计 算 原 始 l o s s 和 截 断 l o s s
        #  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
        p g _ l o s s 1  =  - a d v a n t a g e s  *  r a t i o
        p g _ l o s s 2  =  - a d v a n t a g e s  *  t o r c h . c l a m p ( r a t i o ,  1 . 0  -  s e l f . c l i p r a n g e ,  1 . 0  +  s e l f . c l i p r a n g e )
        p g _ l o s s  =  t o r c h . s u m ( t o r c h . m a x ( p g _ l o s s 1 ,  p g _ l o s s 2 )  *  m a s k )  /  m a s k . s u m ( )  #  最 后 是 取 每 个 非 m a s k 的 r e s p o n s e  t o k e n 的 平 均 l o s s 作 为
        r e t u r n  p g _ l o s s
（ 6 ） Ac t o r  l o s s 小 结
（1）～（5）中我们一步步树立了act or_loss的改进过程，这里我们就做一个总结吧：
其中：
•
•  我们已经对 进行来改造，使其能够衡量Act or模型是否遵从了R ef模型的约束
•  我们已经对 进行改造，使其不仅考虑了当前时刻的优势，还考虑了未来的优势
•  我们重复利用了1个b at ch的数据，使本来只能被用来做1次模型更新的它现在能被用来做ppo_epochs次模型更新。我们使用真正吃了
b at ch，产出经验值的那个时刻的Act or分布来约束ppo_epochs中更新的Act or分布
•  我们考虑了剪裁机制（clip），在ppo_epochs次更新中，一旦Act or的更新幅度超过我们的控制范围，则不对它进行参数更新。
4 .2  C r i t i c  l o s s
我们知道，1个b at ch产出的经验值，不仅被用来更新Act or，还被用来更新Critic。对于Critic loss，我们不再像Act or loss一样给出一个“演
变过程”的解读，我们直接来看它最后的设计。
首先，在之前的解说中，你可能有这样一个印象：
•   ：Critic对t时刻的总收益的预估，这个总收益包含即时和未来的概念（预估收益）
•   ：R ewar d计算出的即时收益  ，Critic预测出的  及之后时候的收益的折现，这是比  更接近t时刻真值总收益的
一个值（实际收益）
所以，我们的第一想法是：
现在，我们对“实际收益”和“预估收益”都做一些优化。
（ 1 ） 实 际 收 益 优 化

## PDF 第 16 页

编辑于 2024-01-17 20:19 ・IP 属地北京
我们原始的实际收益为  ，但是当我们在act or_loss中引入“优势”的概念时，“优势”中刻画了更为丰富的实时收益信息，所
以，我们将实际收益优化为：
（ 2 ） 预 估 收 益 优 化
我们原始的预估收益为  。
类比于Act or，Critic模型在ppo_epochs的过程中也是不断更新的。所以这个  可以理解成是  ，也就是真正吃了b at ch，参与产
出经验的那个时候的Critic产出的收益预测结果。
我们同样想用旧模型去约束新模型，但对于Critic我们采用的约束策略就比较简单了，我们直接看代码，从中可以看出，我们用老  设计了了
一个变动范围，然后用这个变动范围去约束新
#  s e l f . c l i p r a n g e _ v a l u e 是 一 个 常 量
#  o l d _ v a l u e s :  老 c r i t i c 的 预 测 结 果
#  v a l u e s ： 新 c r i t i c 的 预 测 结 果
v a l u e s _ c l i p p e d  =  t o r c h . c l a m p (
            v a l u e s ,
            o l d _ v a l u e s  -  s e l f . c l i p r a n g e _ v a l u e ,
            o l d _ v a l u e s  +  s e l f . c l i p r a n g e _ v a l u e ,
        )
那么最终我们就取实际收益和预估收益的MSE做为loss就好，这里注意，计算实际收益时  都是老Critic（真正吃了b at ch的那个）产
出的结果，而预估收益是随着ppo_epochs而变动的。
代码如下：
d e f  c r i t i c _ l o s s _ f n ( s e l f ,  v a l u e s ,  o l d _ v a l u e s ,  r e t u r n s ,  m a s k ) :
        " " "
        v a l u e s :  实 时 c r i t i c 跑 出 来 的 预 估 预 期 收 益 （ 是 变 动 的 ， 随 着 p p o  e p o c h 迭 代 而 改 变 ）
        o l d _ v a l u e s ： 老 c r i t i c 跑 出 来 的 预 估 预 期 收 益 （ 是 固 定 值 ）
        r e t u r n s ： 实 际 预 期 收 益
        m a s k ： r e s p o n s e 部 分 的 m a s k

        s e l f . c l i p r a n g e _ v a l u e  =  0 . 2
        " " "
        # #  v a l u e  l o s s
        #  用 旧 的 v a l u e 去 约 束 新 的 v a l u e
        v a l u e s _ c l i p p e d  =  t o r c h . c l a m p (
            v a l u e s ,
            o l d _ v a l u e s  -  s e l f . c l i p r a n g e _ v a l u e ,
            o l d _ v a l u e s  +  s e l f . c l i p r a n g e _ v a l u e ,
        )
        i f  s e l f . c o m p u t e _ f p 3 2 _ l o s s :
            v a l u e s  =  v a l u e s . f l o a t ( )
            v a l u e s _ c l i p p e d  =  v a l u e s _ c l i p p e d . f l o a t ( )

        #  c r i t i c 模 型 的 l o s s 定 义 为 （ 预 估 预 期 收 益 - 实 际 预 期 收 益 ） * * 2
        v f _ l o s s 1  =  ( v a l u e s  -  r e t u r n s ) * * 2
        v f _ l o s s 2  =  ( v a l u e s _ c l i p p e d  -  r e t u r n s ) * * 2
        v f _ l o s s  =  0 . 5  *  t o r c h . s u m (
            t o r c h . m a x ( v f _ l o s s 1 ,  v f _ l o s s 2 )  *  m a s k )  /  m a s k . s u m ( )  #  同 样 ， 最 后 也 是 把 c r i t i c  l o s s 平 均 到 每 个 t o k e n 上
        r e t u r n  v f _ l o s s
RLHF LLM 强化学习 (R einfor cement Lear ning)
欢迎参与讨论
52 条评论 默认 最新

## PDF 第 17 页

已收藏，下辈子再看
02-08  · IP 属地北京  回复  23
hhhhhhh
05-15  · IP 属地广东  回复  喜欢
看文章一直没明白critic和r ewar d模型的区别，感觉怪怪的。看了评论区才给捋顺。
-- r ewar d是对act or模型进行了某一个action之后的直接打分；而critic则是对这个act or模型的整体预估得分。
-- 每次act or模型更新后，critic模型都要对这个新的act or模型重新打分，所以critic模型也要更新参数。
-- critic模型对act or模型的整体预估得分，是根据r ewar d模型的每一次实时打分来预估的。当critic模型的预估得分达到了一定的基准，就代
表act or模型训练完成。
03-26  · IP 属地上海  回复  13
我感觉好像r ewar d是一个句子生成结束之后打分，critic是t ok en粒度的打分
05-05  · IP 属地江苏  回复  4
博主是真的学透了
03-18  · IP 属地四川  回复  7
勃主
04-24  · IP 属地四川  回复  1
优势函数这里是不是理解的有问题？”中路选择走大龙路，当她做出这个决定后，Critic告诉她可以收1个人头。结果，此刻对面打野正在自
家采灵芝，对面也没有什么苟草英雄，中路一路直上，最终收割2个人头。”我理解Critic告知的并不是打大龙这个action的预期收益，而是
当前状态下所有action的平均预期收益。V_t的计算还没有考虑到当前的action，只是作为一个b aseline。
02-20  · IP 属地江苏  回复  3
确实，act or -critic理论中的critic输出是当下状态的预估均值V(S_t)，而不是采取了行动的V(S_t, a_t)。
03-23  · IP 属地湖南  回复  1
请问“对R ef模型，我们把Act or生成的"pr ompt + r esponse "喂给它，那么它同样能给出每个t ok en的log_pr ob结果，我们记其为
r ef_log_pr obs”为什么对于R ef模型输入的不是pr ompt，也让R ef生成一次r esponse并获得log_pr ob
04-20  · IP 属地江苏  回复  1
是的
04-24  · IP 属地上海  回复  1
就是说answ er是以t eaching for ce的形式给r ef的对吗
04-24  · IP 属地江苏  回复  喜欢
展开其他 2 条回复
act or_loss中，最后一步剪裁之后为什么还要加上min函数？？
03-17  · IP 属地福建  回复  1
ppo其中一种实现：截断，其实是保证保证新旧策略不能差太远，导致训练不稳定
06-07  · IP 属地北京  回复  喜欢
同问
04-04  · IP 属地北京  回复  喜欢
义薄云天大龙猫
蜡笔小熊猫
何小方
thlw
进击的IT人
Antidot e
不关岳岳的事
JShen
thlw
outsider thlw
thlw outsider
某帆
wang
E M

## PDF 第 18 页

看百度千帆的 RLHF 是支持建立模型训练的 ，和作者说的是同一套逻辑么
7 小时前  · IP 属地河北  回复  喜欢
你小子算是学透RLHF了
06-12  · IP 属地浙江  回复  喜欢
act or loss “稍作改动去掉log”，是因为重要性采样，这样描述是不是会产生歧义。1.ppo本身是on-policy，不需要重要性采样
（impor tance sampling），ppo源自trpo，所以才重参数会不会好些。
2.是否有log，跟重要性采样无关，是policy gradient求导引入的
06-07  · IP 属地北京  回复  喜欢
act or loss那里，一个b at ch可以更新多次，那第一次的时候act or loss不就是0了吗(logpr obs= old_logpr obs)，不知道有没有针对第一次
bw d修改为原来的loss(即不考虑kl)呢
06-04  · IP 属地湖北  回复  喜欢
细看了代码，好像没有针对第一次有额外的loss设计，应该一个b at ch第一次迭代的时候计算得到的ratio就是1，那此时的act or loss只
和adv antages有关
06-04  · IP 属地湖北  回复  喜欢
徐冠楠
亚当
wang
Axuanz
Axuanz
点击查看全部评论
推荐阅读
非线性有限元分析之超弹模型
neo-Hook ean
W elSi... 发表于WELSI...
Filament引擎的PBR实现(4.10
各向异性模型)
4.10 各向异性模型之前给出的标准
材质模型只能描述各向同性的材质
表面(也就是说材质表面在所有方向
上呈现的性质相同)。而现实中的很
多材质，比如拉丝金属，需要各向
异性模型的支持才能模拟…
fangc... 发表于Filam...
MoE 入门介绍 核心工作回顾
模型篇
原石人类
欢迎参与讨论

