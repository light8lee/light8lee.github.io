---
layout: post
title: "Dive into Codex 08：System 指令与运行约束"
date: 2026-07-11 14:00:00 +0800
summary: "从 Codex 源码中的系统级指令出发，理解它如何以指令层级、工作区保护、工具纪律、权限边界和验证契约，约束一个可协作、可执行的本地 coding agent。"
tags: [智能体运行时, 指令系统, 执行安全]
category: Codex
cover: /assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/cover.png
body_class: dive-into-codex-post
series: dive-into-codex
series_previous_title: "Dive into Codex 07：Subagent 架构"
series_previous_url: /codex/2026/07/11/dive-into-codex-07-subagent-architecture.html
---

本章从 Codex 源码里的系统级指令出发，分析它们如何把模型约束成一个可协作、可执行、可验证的本地 coding agent。

源码基准：OpenAI Codex `main`，[commit `98d28aab54ed86714901b6619400598598876dd0`](https://github.com/openai/codex/commit/98d28aab54ed86714901b6619400598598876dd0)。

主要参考文件：

- [`codex-rs/protocol/src/prompts/base_instructions/default.md`](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1)
- [`codex-rs/core/gpt_5_codex_prompt.md`](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/core/gpt_5_codex_prompt.md?plain=1)
- [`codex-rs/core/gpt-5.1-codex-max_prompt.md`](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/core/gpt-5.1-codex-max_prompt.md?plain=1)

## 本章主线

```text
source checkpoint
  -> prompt entrypoints
  -> agent identity
  -> instruction hierarchy
  -> workspace safety
  -> edit/tool discipline
  -> sandbox / approval
  -> progress / verification / final contract
```


<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/001-source-checkpoint.png' | relative_url }}" alt="先固定源码版本" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L1-L9">先固定源码版本</a></h2>

分析 system 指令前，先固定源码版本。这里以 OpenAI Codex 仓库 `main` 的 `98d28aa` 提交为基准：同一段指令在不同版本可能调整，章节里的结论都锚定到这个快照。

**源码定位**：先打开 [commit `98d28aa` 的历史快照](https://github.com/openai/codex/commit/98d28aab54ed86714901b6619400598598876dd0)，再从 [`default.md` L1-L9](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L1-L9) 确认这个版本对 Codex CLI、agent 身份和基础能力的定义。

**扩展阅读**

公开源码里的 system 指令会随产品演进而变化，所以不能只说“Codex 的 prompt 是什么”，而应该先回答“哪一个版本里的 prompt”。本章使用 `git ls-remote https://github.com/openai/codex.git HEAD` 得到的 `98d28aab54ed86714901b6619400598598876dd0` 作为阅读基准。后续如果 upstream 修改了 prompt 文件，本章结论仍然表示对这个 commit 的源码阅读，而不是对未来版本的承诺。

关键词：`Codex source`、`commit`、`system prompt`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/002-prompt-entrypoints.png' | relative_url }}" alt="system 指令不只一份文件" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L1-L9">system 指令不只一份文件</a></h2>

Codex 的系统约束分成两层：协议层的默认基础指令定义 agent 如何工作；模型层的 prompt 文件再补充 GPT-5 Codex 家族的行为规则。运行时还会叠加 developer、user、AGENTS.md 和环境约束。

**源码定位**：协议层入口见 [`default.md` L1-L9](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L1-L9)；模型层入口分别见 [`gpt_5_codex_prompt.md` L1-L19](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/core/gpt_5_codex_prompt.md?plain=1#L1-L19) 和 [`gpt-5.1-codex-max_prompt.md` L1-L19](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/core/gpt-5.1-codex-max_prompt.md?plain=1#L1-L19)。

**扩展阅读**

可以把 Codex 的 prompt 看成“编译出来的运行合同”。源码里至少有两类入口：

```text
codex-rs/protocol/src/prompts/base_instructions/default.md
  -> Codex CLI / harness 级别的基础工作方式

codex-rs/core/gpt_5_codex_prompt.md
codex-rs/core/gpt-5.1-codex-max_prompt.md
  -> 面向特定 Codex 模型族的行为约束
```

实际运行时，系统提示不会孤立存在。它会与 developer 指令、用户请求、仓库里的 `AGENTS.md`、当前 sandbox/approval 配置、可用工具说明一起进入上下文。也就是说，Codex 的行为不是由某一段 prompt 单独决定，而是由多层约束共同决定。

关键词：`default.md`、`model prompt`、`layered instructions`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/003-agent-identity.png' | relative_url }}" alt="先把模型限定成 coding agent" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/core/gpt_5_codex_prompt.md?plain=1#L1">先把模型限定成 coding agent</a></h2>

指令一开始就把身份收窄：Codex 是运行在用户电脑上的 coding agent，不是泛聊天助手。这个设定决定它要围绕仓库、文件、命令、补丁、验证和交付结果组织行动。

**源码定位**：[`default.md` L1-L9](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L1-L9) 定义 CLI agent 的能力边界；[`gpt_5_codex_prompt.md` L1](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/core/gpt_5_codex_prompt.md?plain=1#L1) 把模型明确限定为运行在用户电脑上的 coding agent。

**扩展阅读**

身份约束解决的是目标发散问题。一个通用模型可以回答任何问题，但 Codex 在这里被放进“本地工程协作”的角色里：它接收用户任务，读取 workspace，调用工具，修改文件，运行验证，然后交付结果。这一层约束让后续所有规则都有了落点。例如“不要回滚用户改动”不是抽象礼貌，而是因为 Codex 正在真实工作区里执行；“最终回复要说明验证”不是写作偏好，而是工程交接的一部分。

关键词：`coding agent`、`local workspace`、`task execution`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/004-instruction-hierarchy.png' | relative_url }}" alt="指令层级决定谁覆盖谁" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L17-L27">指令层级决定谁覆盖谁</a></h2>

Codex 需要同时处理系统规则、开发者规则、用户请求、仓库内 AGENTS.md。基础指令明确了 AGENTS.md 的作用域和优先级，避免不同目录的约定混在一起，也避免仓库规则覆盖更高层指令。

**源码定位**：[`default.md` L17-L27](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L17-L27) 完整描述 `AGENTS.md` 的目录作用域、深层文件覆盖关系，以及 system/developer/user 指令高于仓库规则的优先级。

**扩展阅读**

`AGENTS.md` 的设计像仓库内的局部规则文件。根目录的规则影响整个仓库，子目录里的规则只影响对应子树；更深的文件可以覆盖更浅的规则；但系统、开发者和用户消息仍然比 `AGENTS.md` 优先级更高。

这套层级处理了两个常见冲突：

- 仓库 A 希望用某种测试命令，仓库 B 希望用另一种，规则不能跨项目污染。
- 用户明确要求做一件事时，仓库建议不能反过来覆盖更高层指令。

因此 Codex 在动手前要理解“当前文件属于哪个目录规则范围”，而不是把所有说明混成一锅。

关键词：`instruction hierarchy`、`AGENTS.md`、`scope`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/005-workspace-safety.png' | relative_url }}" alt="脏工作区优先保护用户改动" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/core/gpt_5_codex_prompt.md?plain=1#L7-L19">脏工作区优先保护用户改动</a></h2>

源码里的系统指令反复强调：可能处在 dirty worktree 中，不能回滚不是自己做的修改，不能随意使用 destructive git 命令。Codex 的第一条工程安全线，是不把用户已有工作当成可重置状态。

**源码定位**：[`gpt_5_codex_prompt.md` L7-L19](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/core/gpt_5_codex_prompt.md?plain=1#L7-L19) 是编辑约束代码范围，其中 L12-L19 直接规定 dirty worktree、保留用户修改和禁止未经请求使用破坏性 Git 命令。

**扩展阅读**

这是 Codex 和普通代码生成器差异很大的地方。普通生成器只输出一段代码，真实工程里却可能已经有未提交改动、生成文件、用户手动修复、另一个进程写入的内容。系统指令要求 Codex 假设这些改动属于用户，除非用户明确要求，否则不能 `reset`、`checkout` 或覆盖它们。

这条规则保障了协作边界：Codex 可以新增自己的 diff，也可以在同一文件里小心合并，但不能把“恢复到干净状态”当作默认修复方式。

关键词：`dirty worktree`、`user changes`、`destructive command`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/006-edit-discipline.png' | relative_url }}" alt="编辑动作要留下可审查 diff" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/core/gpt_5_codex_prompt.md?plain=1#L7-L19">编辑动作要留下可审查 diff</a></h2>

指令要求小范围编辑、优先使用 `apply_patch`、避免无关重构和格式噪声。这样做的意义是让每次修改都能被 diff 解释：为什么改、改了哪里、是否越界，一眼就能追踪。

**源码定位**：[`gpt_5_codex_prompt.md` L7-L19](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/core/gpt_5_codex_prompt.md?plain=1#L7-L19) 给出模型级编辑约束；[`default.md` L123-L147](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L123-L147) 补充 `apply_patch`、最小改动和不处理无关问题等执行纪律。

**扩展阅读**

工程协作里，最危险的修改往往不是“代码写错”，而是“改动范围失控”。因此 Codex 的编辑规则强调三个动作：

```text
read context
  -> patch only the needed files
  -> verify the changed behavior
```

`apply_patch` 的价值不只是工具偏好，而是让修改以补丁形式表达。补丁天然带有上下文，方便审查，也减少脚本式大范围改写造成的误伤。格式化、生成文件和批量机械变更可以例外，但语义编辑应该尽量保持可读 diff。

关键词：`apply_patch`、`scoped edit`、`diff`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/007-tool-discipline.png' | relative_url }}" alt="工具调用也被规则约束" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L258-L265">工具调用也被规则约束</a></h2>

Codex 不是只会生成文本，它会调用 shell、搜索文件、读写补丁、运行测试。系统指令把常用工具习惯写进去，例如优先 `rg`、命令前给简短说明、输出后根据结果继续推进。

**源码定位**：[`default.md` L29-L50](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L29-L50) 规定工具调用前的 preamble；[`default.md` L258-L265](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L258-L265) 规定 shell 搜索优先使用 `rg` / `rg --files`。

**扩展阅读**

工具规则解决的是“能力太多时如何不乱用”。`rg` 优先是效率约束；命令前的 preamble 是可见性约束；读取输出后继续推进是闭环约束。Codex 每一次工具调用都应该有目的：要么收集上下文，要么修改状态，要么验证假设。

一个健康的工具调用循环大致是：

```text
hypothesis
  -> inspect with tool
  -> update understanding
  -> patch or test
  -> report only useful result
```

这样工具不会变成随机探索，而会服务于当前任务。

关键词：`shell`、`rg`、`tool protocol`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/008-sandbox-approval.png' | relative_url }}" alt="sandbox 和 approval 是执行门禁" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L3-L9">sandbox 和 approval 是执行门禁</a></h2>

基础指令把 sandbox、approval、网络和文件权限作为运行环境的一部分。模型可以提出动作，但具体能否执行，要经过当前 harness 给出的权限边界和审批策略，而不是由模型单方面决定。

**源码定位**：[`default.md` L3-L9](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L3-L9) 把 terminal command、patch 与“按本次运行配置请求用户审批”写入能力声明。这里能直接从 prompt 锚定的是审批升级入口；更细的 sandbox policy 由运行时 harness 提供。

**扩展阅读**

从运行系统看，Codex 的“想执行”和“能执行”是分开的。模型可以生成一个 shell 命令，但 harness 会根据 sandbox、workspace roots、网络权限和 approval policy 判断它能否直接运行、是否需要用户确认、是否应该拒绝。

这让安全边界不完全依赖模型自觉：

```text
model proposes action
  -> command / patch routed through harness
  -> sandbox and approval policy decide
  -> observation returns to model
```

因此 Codex 的可靠性来自双层结构：prompt 让模型学会保守行动，harness 让高风险动作受到外部约束。

关键词：`sandbox`、`approval policy`、`harness`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/009-progress-loop.png' | relative_url }}" alt="长任务需要计划和进度回传" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L29-L70">长任务需要计划和进度回传</a></h2>

Codex 的指令把“持续推进”和“让用户知道发生了什么”放在一起：复杂任务要维护 plan，较长工作要发送进度更新。它不是静默跑完再报告，而是在可见节奏里执行。

**源码定位**：[`default.md` L29-L70](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L29-L70) 覆盖 responsiveness、preamble 与 planning；[`default.md` L173-L179](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L173-L179) 单独规定长任务的进度更新节奏。

**扩展阅读**

计划工具不是为了仪式感，而是为了在长任务里暴露执行状态。用户能看到 Codex 当前在做哪一步，哪些已经完成，哪些还没开始；Codex 自己也能避免在多阶段任务里丢掉目标。

进度更新同样重要。长时间运行时，用户需要知道 agent 是在读源码、改文件、生成素材、跑验证，还是遇到了阻塞。这个约束让 Codex 更像工程协作者，而不是一个黑盒后台任务。

关键词：`plan`、`progress update`、`responsiveness`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/010-verification-contract.png' | relative_url }}" alt="完成声明要有验证支撑" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L149-L163">完成声明要有验证支撑</a></h2>

指令要求在能验证时主动运行测试、构建或检查；最终回复不能只说“应该好了”，而要说明验证了什么。这个约束把模型输出从主观判断拉回可观察证据。

**源码定位**：[`default.md` L149-L163](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L149-L163) 是验证代码范围，覆盖测试策略、从局部到整体的验证顺序，以及不同 approval mode 下的主动验证规则。

**扩展阅读**

验证规则处理的是模型容易过度自信的问题。Codex 不能因为补丁看起来合理就直接宣布完成，而应该尽可能运行相关测试、lint、构建、尺寸检查、链接检查或其他与任务匹配的验证。

对图文专题来说，验证不是单元测试，而是：

```text
all images exist
image dimensions are correct
markdown links resolve
no obvious encoding artifacts
source/version references are present
```

完成声明必须带着这些证据，用户才能判断这次交付是否可用。

关键词：`validation`、`tests`、`evidence`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/011-output-contract.png' | relative_url }}" alt="最终回复也是接口契约" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L181-L254">最终回复也是接口契约</a></h2>

系统指令还规定了最终回复的形态：简洁说明改了什么、引用关键文件、告知未验证事项、不要倾倒大文件。对用户来说，final answer 是一次工程交接，而不是聊天收尾。

**源码定位**：[`default.md` L181-L254](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L181-L254) 是最终回复与文件引用的完整范围，包含交接内容、结构、语气和路径引用规则。

**扩展阅读**

final answer 的作用是交接状态，不是复述所有过程。它应该回答三件事：完成了什么、在哪里看、验证到什么程度。没有跑的验证要明确说出来，不能假装已经通过；大文件内容也不需要贴满屏幕，路径和摘要更适合真实工作流。

这条规则让 Codex 的输出从“生成内容”变成“可接手的工程状态”。用户可以继续 review、commit、发布或要求下一轮修改。

关键词：`final answer`、`handoff`、`file reference`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/video-notes/dive-into-codex-08-system-instructions-constraints/images/012-why-it-works.png' | relative_url }}" alt="这些约束共同构成运行护栏" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Dive into Codex</p>
<h2><a href="https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L123-L191">这些约束共同构成运行护栏</a></h2>

角色限定让目标不发散，指令层级处理冲突，工作区规则保护用户成果，工具规则控制副作用，sandbox/approval 把风险动作拦在门口，验证规则让完成可被证明。Codex 的可靠性来自整套约束协同。

**源码定位**：[`default.md` L123-L191](https://github.com/openai/codex/blob/98d28aab54ed86714901b6619400598598876dd0/codex-rs/protocol/src/prompts/base_instructions/default.md?plain=1#L123-L191) 把任务执行、验证、精确改动、进度更新和最终交接连续串起来，是理解整套运行护栏最集中的代码范围。

**扩展阅读**

单看每条规则都很普通：别乱改文件、别乱跑命令、要做验证、要说清楚结果。但这些规则组合起来，才把模型变成一个稳定的本地 agent。

```text
identity
  -> knows what job it is doing
hierarchy
  -> knows which instruction wins
workspace safety
  -> preserves user state
tool discipline
  -> acts through observable operations
sandbox / approval
  -> limits high-risk execution
verification
  -> grounds completion in evidence
```

这也是理解 Codex system 指令最重要的角度：它不是一篇“怎么说话”的文案，而是一组把模型行为接入真实工程环境的运行护栏。

关键词：`guardrails`、`reliability`、`controlled execution`

</div>
</section>

<section class="post-appendix" markdown="1">

## Appendix: 源码阅读路线

### A. 本章使用的公开源码

- `codex-rs/protocol/src/prompts/base_instructions/default.md`：基础 agent 工作方式、AGENTS.md 规则、计划、工具、验证和 final answer 约束。
- `codex-rs/core/gpt_5_codex_prompt.md`：GPT-5 Codex 的模型级 system 指令，包括编辑约束、dirty worktree、工具使用、最终回复等。
- `codex-rs/core/gpt-5.1-codex-max_prompt.md`：面向更新模型族的变体，用于对照哪些约束被延续或强化。

### B. 为什么不直接贴完整 system prompt

完整 prompt 会随版本变化，而且逐字搬运不利于理解。更有效的读法是按运行保障拆解：身份、层级、工作区、工具、权限、验证、交接。这样读者即使面对后续版本，也能判断哪些变化只是措辞调整，哪些变化影响 agent 的真实行为。
</section>

