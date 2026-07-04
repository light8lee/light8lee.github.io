# SCPO 小红书图文脚本

论文：Semantic Consistency Policy Optimization for Reinforcement Learning of LLM Agents  
作者：Peng Xu, Sijia Chen, Junzhuo Li, Xuming Hu  
机构：HKUST(GZ), HKUST  
arXiv：2606.25852v1，2026-06-24  
主题：Agent RL 中的语义信用不一致，以及 SCPO 如何从失败轨迹中回收正确步骤。

## 视觉规范

- 画幅：4:5，建议 1080 x 1350。
- 主色：米黄色背景 `#f6ecd8`，深墨色正文，橙红强调，蓝色表示成功参考，红色表示失败轨迹，绿色表示可回收进展。
- 每页右上角固定水印：涛涛涛。
- 图形风格：手绘工程白板 + 论文图表重绘，不直接搬运论文原图；引用原图时标注 Figure/Table 来源。

## 01 封面

标题：失败轨迹里，也藏着正确步骤  
副标题：SCPO：Agent RL 为什么不能只看最终成败？

正文：同样是“搜索航班”这一步，在成功轨迹里被奖励，在失败轨迹里却被惩罚。SCPO 解决的就是这个矛盾：不要惩罚失败轨迹里的正确进展。

画面：左边成功轨迹蓝线，右边失败轨迹红线，前 3 个节点重合并发光，最后一步分叉失败。中心大字“别把正确步骤一起罚掉”。

## 02 论文背景

标题：这篇论文在解决什么？

正文：Agent 做任务往往要几十步，奖励却只在最后出现。现有 group-based RL 会把整条轨迹的成败分摊到每一步：成功轨迹全奖励，失败轨迹全惩罚。问题是，失败轨迹前面可能做对了很多步，只是最后一步翻车。

信息点：
- 论文：SCPO
- 作者：Peng Xu, Sijia Chen, Junzhuo Li, Xuming Hu
- 机构：HKUST(GZ) + HKUST
- 任务：ALFWorld、WebShop
- 基座：Qwen2.5-1.5B / 7B

画面：上方论文名卡片，下方“长任务 + 稀疏奖励 + 轨迹级信用”的三段式问题图。

## 03 技术总览

标题：SCPO 的 5 个关键创新

正文：SCPO 不是重新发明 PPO/GRPO，而是插在“step reward -> advantage estimation”之间的 reward-level plugin。它保留原训练器，只改失败轨迹里哪些步骤应该少挨罚。

五点：
1. 成功 sibling 作为同组参考
2. 冻结 cross-encoder 做语义步匹配
3. 单调语义信用，奖励“新进展”而非重复相似
4. 重新排序信用分配，避免早期模板步骤抢占名额
5. 只改 step-level advantage，不改 episode 成败标签

画面：一条流水线：Rollout group -> Success reference -> Semantic matrix -> Monotonic credit -> Shaped advantage。

## 04 创新点 1：成功 sibling 参考

标题：先找一条“同题成功路线”

正文：SCPO 在同一个 rollout group 里找成功轨迹，把它当作失败轨迹的参考答案。这里的参考不是外部专家演示，而是模型自己在同题上采样出来的成功 sibling，因此仍然是 on-policy 信号。

例子：WebShop 买红色 Nike 跑鞋。成功轨迹走到下单，失败轨迹前面也搜索、筛选、打开商品页，只是在最后选错尺码。SCPO 用成功路线判断前面哪些动作其实是有效进展。

画面：8 条采样轨迹，其中 3 条蓝色成功、5 条红色失败；最长蓝线被标为 reference，红线向它对齐。

论文依据：Section 3.2。

## 05 创新点 2：冻结 cross-encoder 语义匹配

标题：不是字符串相同，而是语义上同一步

正文：Search red nike shoes 和 Search nike red running shoes 字面不一样，但在任务里是同一类进展。SCPO 把每一步的 observation + action 拼成文本，用冻结的 BGE-Reranker-v2-m3 cross-encoder 计算失败步骤和参考步骤的相似度矩阵。

为什么重要：Agent 行为表达很灵活，只做精确匹配会漏掉大量正确子路径；但完全依赖相似度又会奖励重复模板，所以后面还需要单调约束。

画面：左侧两个 action 文本，右侧 5x5 相似度热力图，亮格表示可匹配步骤。

论文依据：Section 3.3、4.1。

## 06 创新点 3：单调语义信用

标题：只奖励“往前走”，不奖励“原地重复”

正文：SCPO 不把高相似度直接当奖励。一个失败步骤必须同时满足两个条件：相似度超过阈值，并且匹配到参考轨迹中尚未被奖励、且更靠后的进展位置。每个参考位置最多被奖励一次。

例子：Agent 反复点击同一个筛选按钮，都会和成功路线相似，但没有新进展。单调信用会只认第一次有效推进，后面的重复不再加分。

画面：参考轨迹 A-B-C-D-E，失败轨迹 A-B-B-B-C-X；三个 B 只有第一个被打勾，后两个灰掉。

论文依据：Section 3.3；Table 2 显示移除 monotonicity 后 ALFWorld 1.5B overall 从 93.7 降到 90.1。

## 07 创新点 4：信用分配顺序重排

标题：别让早期模板步骤抢光信用

正文：如果按时间顺序处理失败轨迹，开头那些大家都会做的模板步骤最先占用参考位置，比如打开网页、进入搜索框。真正有区分度的中后段动作反而抢不到信用。SCPO 重排分配顺序，让不同位置的步骤公平竞争参考位置。

例子：买机票任务里，“打开携程”不该比“选择正确航班”更优先拿信用。SCPO 的顺序重排把有限信用留给更能代表任务进展的步骤。

画面：两个漏斗对比：时间顺序把名额给了 Start/Search；重排后名额给了 Select flight/Checkout。

论文依据：Section 3.4；Table 2 中 chronological order overall 为 90.4，低于默认 SCPO 93.7。

## 08 创新点 5：只平移 step advantage

标题：失败还是失败，但正确步骤少挨罚

正文：SCPO 加的是 step-level shaped return，episode-level 成败标签不变。也就是说，它不会把失败轨迹包装成成功轨迹，只是让“局部正确”的步骤在优势估计里少受惩罚。

例子：失败轨迹的最终支付失败仍然是失败；但“搜索航班”“选择航班”“进入支付页”这些步骤和成功路线一致，负优势会被拉回一点，模型不会因为最后翻车而过度抑制前面的正确动作。

画面：公式感图：A = AE + omega AS；SCPO 只改 AS，不改 AE。右侧显示 penalty 从 -0.75 变为 -0.60。

论文依据：Section 3.5。

## 09 评测：提升在哪里？

标题：1.5B 小模型提升最明显

正文：在 Qwen2.5-1.5B 上，SCPO 达到 ALFWorld 93.7±4.1、WebShop 74.8±2.0。相比 GiGPO，ALFWorld 从 86.7 到 93.7，WebShop success 从 65.0 到 74.8。提升主要集中在更难的多步任务，如 Look、Cool、Pick2。

画面：两组柱状图：GiGPO vs SCPO。下方小标签：多步任务收益最大，因为失败轨迹里更常包含“部分正确进展”。

论文依据：Table 1、Section 4.2。

## 10 消融与机制验证

标题：不是随便加相似度奖励

正文：论文做了三个关键消融：按时间顺序分配会降到 90.4；去掉单调约束会降到 90.1；用最短成功轨迹做参考会降到 91.7。机制分析还显示，被 SCPO 奖励的失败步骤与成功行为高度重合，而不是均匀发糖。

画面：三张小卡：chronological、no monotonicity、shortest reference，分别向下箭头；右侧重绘 Figure 5 思路：蓝点靠近绿点，红点散开。

论文依据：Table 2、Section 4.3、4.4、Appendix C。

## 11 适用场景、缺点和改进

标题：SCPO 适合什么？不适合什么？

正文：适合：长链路、可观察状态变化明显、失败轨迹常有部分正确进展的 Agent 任务，比如网页导航、具身家务、工具调用流程。不适合：全组都失败的早期训练；数学/代码这种需要精确符号验证的任务；局部相似但全局因果不成立的场景。

改进方向：
- 用历史成功 buffer 解决全失败组
- 用领域专用 verifier 或 contrastive scorer 替代通用 reranker
- 把局部语义匹配升级为因果/状态转移验证

画面：左侧绿色“适合”，右侧红色“不适合”，底部三条改进路线。

论文依据：Limitations。

## 12 收束页

标题：一句话记住 SCPO

正文：SCPO 的核心不是“奖励成功轨迹”，而是“从失败轨迹里找回正确行为”。它把 Agent RL 的监督从粗糙的 outcome-level 往 process-level 推了一步：失败可以被惩罚，但失败里的正确进展不应该被一起埋掉。

画面：失败红线中被挖出的绿色节点，汇入蓝色成功路线。底部：Agent RL 今年值得读的一篇。

发布标题建议：
- 失败轨迹里也有黄金步骤：SCPO 讲透 Agent RL 信用分配
- Agent RL 新论文 SCPO：别把正确步骤一起罚掉
- 为什么你的 Agent 越训越怂？可能是信用分配错了

正文开头建议：
今天这篇 SCPO 我觉得很值得做成图文，因为它抓住了 Agent RL 里一个很真实的问题：Agent 失败，不代表每一步都错。尤其是长链路任务，最后一步翻车经常会连坐前面所有正确操作。

参考来源：
- arXiv: https://arxiv.org/abs/2606.25852
- HTML: https://arxiv.org/html/2606.25852v1
