---
layout: post
title: "《Agent SFT 最难的，不是训练》脚本"
date: 2026-06-19 23:58:42 +0800
summary: "主题：`llm-post-training` 平台：小红书 目标时长：5–7 分钟 核心来源：OmniAgent（arXiv:2606.19341v1）"
tags: [video-notes, visual-essay, LLM post-training]
category: LLM Post-training
cover: /assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-01.png
body_class: dive-into-codex-post
---

主题：`llm-post-training` 平台：小红书 目标时长：5–7 分钟 核心来源：OmniAgent（arXiv:2606.19341v1）。

<div class="source-list">
  <a href="https://arxiv.org/abs/2606.19341">Native Active Perception as Reasoning for Omni-Modal Understanding</a>
  <a href="https://github.com/HarryHsing/OmniAgent">OmniAgent implementation and SFT recipe</a>
  <a href="https://huggingface.co/harryhsing/OmniAgent-SFT-7B">OmniAgent-SFT-7B</a>
</div>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-01.png' | relative_url }}" alt="OmniAgent：Agentic SFT 最难的不是训练" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Video Notes</p>
<h2>OmniAgent：Agentic SFT 最难的不是训练</h2>

Agent SFT 真正难的，往往不是怎么计算交叉熵，而是你有没有一批可信的行为轨迹。只给模型看最终答案，它学到的是答题；要让它自己翻视频、找证据、调用工具、遇到错误还能恢复，训练样本必须把整个过程教给它。今天我们看 OmniAgent 怎么造这种数据。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-02.png' | relative_url }}" alt="谁做的？解决什么问题？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Video Notes</p>
<h2>谁做的？解决什么问题？</h2>

这篇论文叫《把主动感知作为推理》，二零二六年六月十七日提交，作者来自香港中文大学、上海交通大学、阿里通义团队和南洋理工大学，并被 ICML 2026 接收。它针对长视频理解的老问题：把整段视频从头扫到尾，成本会随时长上涨，而且模型不会主动判断下一步该看哪里。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-03.png' | relative_url }}" alt="先定义 OTA 循环" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Video Notes</p>
<h2>先定义 OTA 循环</h2>

OmniAgent 把视频理解改成一个循环。Observation，是把刚看到或听到的内容压成文字证据；Thought，是根据已有记忆判断还缺什么；Action，是取几帧、听一段音频、看一个短片，或者直接回答。环境只负责切媒体，真正的感知和推理仍由同一个模型完成。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-04.png' | relative_url }}" alt="整张训练地图" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Video Notes</p>
<h2>整张训练地图</h2>

先看全局：问题进入教师模型，同一道题生成 N 条探索轨迹；第一道门检查结果是否正确；第二道门检查每一步推理是否真的被证据支持；合格轨迹组成 SFT 数据；最后仍然用标准的下一 Token 预测训练学生模型。新意主要不在损失函数，而在损失函数前面的数据工厂。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-05.png' | relative_url }}" alt="为什么要 Best-of-N？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Video Notes</p>
<h2>为什么要 Best-of-N？</h2>

同一个问题只生成一条轨迹，教师偶然走错，你就没有可用样本。Best-of-N 会让教师在真实工具环境里多走几次：有人先看开头，有人跳到中段，有人先听音频。它不是为了选文笔最好的一条，而是扩大行为覆盖，找到真正能完成任务的探索路径。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-06.png' | relative_url }}" alt="错误，也可以是训练数据" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Video Notes</p>
<h2>错误，也可以是训练数据</h2>

更有意思的是，候选轨迹允许先犯错。比如模型请求了越界时间戳，环境返回诊断信息，模型修正参数后继续搜索。论文保留这类最终成功的自我修正轨迹，因为真实 Agent 不可能永远第一次就调用正确。这里教的不是错误本身，而是如何把错误反馈变成下一步行动。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-07.png' | relative_url }}" alt="第一道门：结果必须对" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Video Notes</p>
<h2>第一道门：结果必须对</h2>

第一层过滤只问：任务完成了吗？选择题和数值题要求精确匹配；时序定位要求交并比，也就是 IoU 至少零点五；尺寸估计要求平均相对准确率 MRA 至少零点五。它们是任务指标，不是奖励函数，更不是对推理过程的评价。第一道门只能证明终点正确。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-08.png' | relative_url }}" alt="第二道门：不能蒙对" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Video Notes</p>
<h2>第二道门：不能蒙对</h2>

答案正确仍可能是幸运猜中。第二层让 GPT-4o 审计每一步 Thought：它是否真的由此前记忆和当前 Observation 推出来？评分是五分制，低于三分的轨迹被丢弃。这样就把结果正确和过程可信分开。不过，模型审模型会带来成本，也可能继承审计模型自己的偏差。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-09.png' | relative_url }}" alt="58K 轨迹从哪里来？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Video Notes</p>
<h2>58K 轨迹从哪里来？</h2>

最终数据有五万八千条轨迹，覆盖三类任务：选择题、数值推理和时序定位，来自五个训练集。关键不是把五个数据集简单拼接，而是把静态问答重新跑成 OTA 交互轨迹。每条样本都带上观察、思考、动作、环境反馈和终止答案，学生才有机会模仿完整策略。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-10.png' | relative_url }}" alt="SFT 本身很朴素" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Video Notes</p>
<h2>SFT 本身很朴素</h2>

到了训练阶段，事情反而朴素：让学生模型在给定问题、记忆和感知内容时，预测教师轨迹中的下一个 Token。你可以把它理解成对整段 OTA 行为做 teacher forcing。损失函数只负责模仿被留下的轨迹；如果轨迹覆盖差、理由是编的，再漂亮的训练曲线也只是在放大数据问题。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-11.png' | relative_url }}" alt="结果应该怎么读？" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Video Notes</p>
<h2>结果应该怎么读？</h2>

论文报告，在 LVBench 上，OmniAgent 七 B 得到百分之五十点五，高于 Qwen2.5-VL 七十二 B 的百分之四十七点三，并使用更少的视频帧。这个结果说明主动找证据在长视频评测里有效，但不能简化成七 B 全面打败七十二 B。模型、输入策略和评测集边界必须一起保留。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-12.png' | relative_url }}" alt="它不是只有一张论文图" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Video Notes</p>
<h2>它不是只有一张论文图</h2>

这次发布也给了工程证据：GitHub 仓库里能看到 SFT 样例、数据过滤脚本、SFT 配置和训练器，Hugging Face 也公开了 OmniAgent-SFT-7B 权重。它不等于我们已经独立复现论文，但至少能检查样本格式、过滤逻辑和训练入口，而不是只靠摘要猜实现。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-13.png' | relative_url }}" alt="三个不能忽略的代价" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Video Notes</p>
<h2>三个不能忽略的代价</h2>

这套配方有三个代价。第一，Best-of-N 要多次调用教师和环境，生成成本高。第二，GPT-4o 审计每条推理链，费用和延迟继续上涨。第三，教师偏好和审计偏差会被写进数据。更麻烦的是，只看成功轨迹可能漏掉真实失败分布，所以要区分可恢复错误、无效噪声和真正困难样本。
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/2026-06-19-omniagent-sft/images/scene-14.png' | relative_url }}" alt="可迁移的四步配方" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">014 / Video Notes</p>
<h2>可迁移的四步配方</h2>

把视频任务拿掉，OmniAgent 留下的是一套通用 Agent SFT 配方：第一，多路径探索，别让单条教师轨迹决定一切；第二，用真实环境反馈保留可恢复失败；第三，用可验证指标检查终点；第四，用过程审计排除幸运猜中。Agent SFT 的核心，不只是让模型模仿成功，而是让成功过程值得模仿。
</div>
</section>
