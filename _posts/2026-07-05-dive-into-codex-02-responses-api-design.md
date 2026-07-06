---
layout: post
title: "Dive into Codex 02：Responses API 事件模型"
date: 2026-07-05 22:52:10 +0800
summary: "把 Chat Completions 与 Responses API 的抽象差异拆开看：item、event、tool call、tool output、skills 和 previous_response_id 如何支撑 agent runtime。"
tags: [Codex, coding agent, visual-essay, source-notes, responses-api]
category: Codex
cover: /assets/posts/dive-into-codex/02-responses-api-design/images/001-python-api-compare.png
body_class: dive-into-codex-post
---

第 01 章建立了 Codex 的 Agent Loop。本章进入模型交互层：为什么普通 message 模型不够用，以及 Responses API 如何把模型输出拆成可追踪、可恢复、可执行的 item / event。

这一章的主线是：

```text
interface shape
  -> message
  -> response item
  -> streaming event
  -> tool call / tool output
  -> skill discovery / SKILL.md loading
  -> skill injection / update / reuse
  -> previous_response_id
  -> Session consumes events
  -> agent trace
```

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/001-python-api-compare.png' | relative_url }}" alt="Python 代码对比" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">001 / Dive into Codex</p>
<h2>Python 代码对比</h2>

先用 Python 看接口长相：Chat Completions 把请求写成 messages[]，结果主要读 choices[0].message；Responses 把请求写成 input / tools / tool_choice / previous_response_id / stream 等参数组合，结果可以按 output item 或 stream event 消费。代码形态差异，决定了 runtime 能否直接接住工具调用、连续状态和过程事件。

**与本页直接相关的补充**

Chat Completions 的返回更像“最终 assistant message”，runtime 需要再从文本里判断是否有动作。Responses 的请求会把 `instructions`、`input`、`tools`、`tool_choice.allowed_tools`、`previous_response_id`、`stream` 等运行参数放在明确位置；返回则天然拆成 item 和 event：message、reasoning、function_call、function_call_output、completed 都有自己的结构位置。对 Codex 来说，这不是 API 包装差异，而是能否把模型输出直接接进 Agent Loop 的差异。

**关键词：**`messages[]`、`choices[].message`、`input`、`tools`、`tool_choice`、`previous_response_id`、`stream`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/002-messages-vs-events.png' | relative_url }}" alt="从消息到事件" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">002 / Dive into Codex</p>
<h2>从消息到事件</h2>

Chat Completions 更像一串聊天消息，而 Codex 需要记录的是一连串可执行事件。Responses API 把文本、reasoning、tool call、tool result 和完成状态拆成 item/event，让 Agent Loop 可以边接收边推进。

**与本页直接相关的补充**

Chat Completions 的中心抽象是 `messages[] -> choices[] -> message`，适合一次对话回复；Codex 需要的是“过程可见”的执行轨迹。模型什么时候开始输出、什么时候决定调用工具、工具参数是否完整、工具结果如何回填，这些都必须成为 runtime 能处理的事件。

**关键词：**`Chat Completions`、`Responses API`、`item`、`event`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/003-agent-needs-structure.png' | relative_url }}" alt="Agent 需要结构化输出" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">003 / Dive into Codex</p>
<h2>Agent 需要结构化输出</h2>

Coding agent 不能只等待一段最终回答。它要知道模型什么时候开始调用工具、参数是否还在流式补全、哪个 item 已完成、是否需要继续 sampling。结构化输出让运行时能把模型意图转成确定动作。

**与本页直接相关的补充**

结构化输出的价值在于把模型意图拆成可调度单元。`assistant message` 可以给用户看，`function_call` 可以交给工具层，`reasoning summary` 可以进入运行轨迹，`completed` / `error` / `rate limit` 可以驱动状态更新。这样 runtime 不需要猜测一段文本里到底有没有动作。

**关键词：**`tool call`、`structured output`、`sampling`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/004-response-item.png' | relative_url }}" alt="Item 是历史单元" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">004 / Dive into Codex</p>
<h2>Item 是历史单元</h2>

Responses 里的 item 可以理解为进入历史的行为单元：一段 assistant message、一次 function call、一个 reasoning 片段、一个工具结果。Session 后续构建 prompt 时，看到的是这些 item 组成的轨迹，而不是普通字符串。

**与本页直接相关的补充**

item 的重要性在于它能成为 history 的稳定组成部分。一次工具调用和一次工具输出可以通过 `call_id` 对齐；一段 reasoning 和一段 output_text 可以被分别消费；后续恢复任务时，Session 不需要重新解析自然语言，而是直接读取结构化轨迹。

**关键词：**`ResponseItem`、`history`、`rollout`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/005-event-stream.png' | relative_url }}" alt="Event 是运行时信号" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">005 / Dive into Codex</p>
<h2>Event 是运行时信号</h2>

event 描述的是流式过程中的状态变化。比如 output item added、text delta、tool args delta、item done、completed。Codex 可以一边消费 event，一边更新 UI、记录 history、等待工具参数完整。

**与本页直接相关的补充**

event 和 item 的区别可以这样看：event 是“正在发生的过程信号”，item 是“最终进入轨迹的结构单元”。一个 function call item 可能由多个 tool args delta 拼出来，直到 item done 才能被认为完整。这也是 agent runtime 必须监听 event stream 的原因。

**源码辅助理解**

`run_sampling_request` 消费 Responses stream 时，可以按下面的事件分支理解：

```rust
while let Some(event) = response_stream.next().await {
    match event {
        // 新 item 出现：先建立运行时占位，后续 delta 会挂到这个 item 上。
        ResponseEvent::OutputItemAdded { item_id, kind } => {
            state.start_item(item_id, kind);
        }

        // 文本增量：可以立即推给 UI，但还不是完整 assistant message。
        ResponseEvent::OutputTextDelta { item_id, delta } => {
            state.append_text(item_id, delta);
            event_tx.send_ui_delta(delta).await;
        }

        // 工具参数增量：只能缓存，不能立刻执行工具。
        ResponseEvent::ToolCallInputDelta { call_id, delta } => {
            state.append_tool_args(call_id, delta);
        }

        // item 完成：这时 function call 的参数才可以被校验和执行。
        ResponseEvent::OutputItemDone { item } => {
            state.finish_item(item);
        }

        // response 完成：可以 drain tool calls 或结束本次 sampling。
        ResponseEvent::Completed { response } => {
            state.finish_response(response);
        }
    }
}
```

这段骨架能解释为什么 Responses 不是“返回一段文本”：runtime 要在事件流里分别处理 UI 增量、工具参数、item 完成和 response 完成。

**关键词：**`streaming event`、`delta`、`item done`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/006-tool-args-delta.png' | relative_url }}" alt="工具参数也在流式生成" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">006 / Dive into Codex</p>
<h2>工具参数也在流式生成</h2>

工具调用参数不是总能一次性到齐。模型可能分多段吐出 JSON 参数，Session 需要缓存增量，等 item done 后再把完整 tool call 交给 ToolRouter。这个细节决定了工具不能太早执行。

**与本页直接相关的补充**

`ToolCallInputDelta` 让工具调用具备“边生成边观察”的能力，但也要求运行时有缓冲区。执行工具前必须确认 JSON 参数已经完整、schema 可校验、call_id 可追踪；否则工具层可能拿到半截参数，造成不可恢复的副作用。

**源码辅助理解**

工具参数流式生成时，runtime 要把 delta 拼成完整 JSON，再交给 ToolRouter：

```rust
fn on_tool_call_delta(call_id: CallId, delta: &str, state: &mut SamplingState) {
    // 1. delta 只是 JSON 参数片段，例如 `{ "cmd": "` 的一部分。
    state.tool_args.entry(call_id).or_default().push_str(delta);
}

async fn on_tool_call_done(call_id: CallId, state: &mut SamplingState) -> Result<()> {
    // 2. item done 后，才尝试解析完整参数。
    let raw_args = state.tool_args.remove(&call_id).unwrap_or_default();
    let args: ToolArgs = serde_json::from_str(&raw_args)?;

    // 3. schema 校验通过后，工具调用才进入真实执行链路。
    tool_router.dispatch(call_id, args).await?;
    Ok(())
}
```

这里的关键约束是“完整之后再执行”。如果在 delta 阶段就执行，模型还没吐完的半截参数也可能触发真实副作用。

**关键词：**`ToolCallInputDelta`、`JSON args`、`ToolRouter`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/007-allowed-tools-gate.png' | relative_url }}" alt="tools[] 稳定，allowed_tools 门控" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">007 / Dive into Codex</p>
<h2>tools[] 稳定，allowed_tools 门控</h2>

Responses 请求里的 `tools[]` 最好保持稳定，方便模型服务端复用稳定前缀。真正动态限制“这一轮能用哪些工具”时，更适合通过 `tool_choice.allowed_tools` 做门控，而不是频繁改动整套工具定义。

**与本页直接相关的补充**

工具定义本身属于 prompt 前缀的一部分。工具名、描述、schema、顺序频繁变化，会影响 prefix cache。更稳的做法是保持完整工具目录稳定，再用 `allowed_tools` 表示当前轮的可用子集。这样既保留工具能力边界，又减少对 cache 的破坏。

**关键词：**`tools[]`、`tool_choice`、`allowed_tools`、`prompt cache`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/008-tool-result-as-input.png' | relative_url }}" alt="工具结果会变成下一轮输入" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">008 / Dive into Codex</p>
<h2>工具结果会变成下一轮输入</h2>

工具执行完成后，结果会作为新的 input item 回到模型可见上下文里。这样模型不是凭空继续编，而是基于真实 exit code、stdout、diff 或错误信息继续判断下一步。

**与本页直接相关的补充**

工具结果不是临时日志，而是下一轮推理的事实来源。`function_call_output` 通过 `call_id` 和原始工具调用对齐，告诉模型这个动作产生了什么结果。对 coding agent 来说，这一步把“模型计划”接回了“真实执行反馈”。

**源码辅助理解**

工具调用和工具结果靠 `call_id` 对齐，进入 history 时大致是这样的形态：

```rust
let call = ResponseItem::FunctionCall {
    call_id,
    name: "shell",
    arguments: json!({ "command": "cargo test" }),
};

let output = ResponseItem::FunctionCallOutput {
    call_id, // 和上面的 function call 对齐
    output: ToolOutput {
        exit_code: 101,
        stdout: "...",
        stderr: "test failed at ...",
    },
};

history.push(call).await;
history.push(output).await;
```

下一次 sampling 看到的不是“工具失败了”这句自然语言，而是可追踪的 `function_call_output`。这让模型能基于真实 exit code 和错误内容继续修复。

**关键词：**`tool output`、`input item`、`feedback loop`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/009-skill-discovery-metadata.png' | relative_url }}" alt="Skill 先以 metadata 进入上下文" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">009 / Dive into Codex</p>
<h2>Skill 先以 metadata 进入上下文</h2>

Codex 不会一开始把所有 SKILL.md 全塞进 prompt。它通常先把 name、description 和 file path 渲染成 Available skills，让模型判断当前任务是否需要某个 skill。这个 discovery 阶段影响的是 Responses input 里的 developer/context，而不是新增一个普通 function tool。

**与本页直接相关的补充**

Skill 的第一阶段是“可发现”，不是“全文加载”。Codex 会把本地或平台侧可用 skill 整理成 metadata：名称告诉模型能力边界，description 帮模型判断触发条件，file path / source locator 告诉模型后续如果需要应该去哪里读取完整说明。这样做的核心价值是 progressive disclosure：先让模型知道有哪些可选工作流，再只为当前任务加载真正相关的那一份。

这和 Responses input 的关系是：Available skills 通常会作为 developer/context 的一部分进入模型请求，让模型在当前 turn 决定是否要使用 skill。它并不会把 skill 变成普通 `tools[]` 里的 function schema；模型看到的是“这里有一套可读的工作流说明”，而不是“这里有一个可直接调用的函数”。

**关键词：**`Skill`、`metadata`、`Available skills`、`developer context`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/010-skill-is-not-function-tool.png' | relative_url }}" alt="Skill 不是普通 function tool" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">010 / Dive into Codex</p>
<h2>Skill 不是普通 function tool</h2>

function tool 通过 schema 让模型直接产生 function_call；skill 更像可复用工作流包，先以索引进入上下文，再按需读取完整 SKILL.md。Hosted shell 因为运行在云端容器里，需要先把 skill bundle 挂到 tools[].environment.skills，确保文件和资源真实存在。

**与本页直接相关的补充**

function tool 的核心是 schema：模型产生 `function_call`，runtime 按 schema 解析参数并执行。Skill 的核心是 workflow：它告诉模型遇到某类任务时应该怎样读资料、用脚本、组织输出、复用 assets，以及如何验证结果。两者可以配合，但抽象层级不同。

如果是 hosted shell，skill 出现在 `tools[].environment.skills` 里不是因为它变成了 function tool，而是因为云端容器需要真实挂载文件、脚本和资源：

```json
{
  "tools": [
    {
      "type": "shell",
      "environment": {
        "type": "container_auto",
        "skills": [
          {
            "type": "skill_reference",
            "skill_id": "skill_abc123",
            "version": 2
          }
        ]
      }
    }
  ]
}
```

而本地 Codex App / CLI 的技能文件本来就在本地可读，所以通常先把 skill 索引渲染进上下文：

```text
scan local skills
  -> render Available skills block
  -> include it in developer context
  -> model chooses a skill
  -> read local SKILL.md by path
```

这就是为什么本章把 skill 放在 tool output 之后、previous_response_id 之前：skill 的发现和读取会改变下一轮模型输入，但它不是普通工具调用闭环本身。

**关键词：**`function tool`、`skill workflow`、`SKILL.md`、`environment.skills`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/011-skill-implicit-explicit.png' | relative_url }}" alt="显式和隐式的上下文差异" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">011 / Dive into Codex</p>
<h2>显式和隐式的上下文差异</h2>

隐式触发时，模型先看 developer 里的 Available skills，再通过工具读取 SKILL.md，结果回到 function_call_output。显式 `$skill` 不等模型先读文件，而是 Codex host 在 sampling 前读取全文，追加 synthetic user `<skill>...</skill>` item。

**与本页直接相关的补充**

模型自选时，context build 的第一步只是把 `Available skills` 放进 developer message。模型看到用户任务后，用 skill 的 `description` 做语义匹配；如果匹配，才发起读取 `SKILL.md` 的工具调用。也就是说，完整 skill 正文进入 Responses 的时刻，是读取结果被回填为 `function_call_output` 的下一轮，而不是初始列表阶段。

用户显式点名时，例如输入 `用 $ppt-redraw 处理这个 PPT`，Codex 源码里不是先发一个 Responses 请求让模型“获取 skill 内容”。在第一次 sampling 之前，host 侧会从 user input 收集 `mentioned_skills`，调用 `build_skill_injections(...)` 读取对应 `SKILL.md`，再构造一个 synthetic user message。模型第一次收到请求时，完整 skill 正文已经在 `<skill>...</skill>` 里。

这个差异会影响你怎样理解 Responses input：隐式路径里的完整正文更像一个工具读取结果；显式路径里的完整正文更像一个由 Codex host 预先追加的 user-context fragment。两者都可以让模型拿到完整 `SKILL.md`，但 item 类型、role 和发生时机不同。

**源码辅助理解**

```python
input_items = [
    {
        "type": "message",
        "role": "developer",
        "content": "## Skills\n- ppt-redraw: ... (file: /skills/ppt-redraw/SKILL.md)",
    }
]

# 模型自选：user message 只有任务，模型根据 description 匹配。
input_items.append({
    "type": "message",
    "role": "user",
    "content": "把这个 PPT 每页重绘成图片",
})
selected = model_routes_by_description(input_items)

# 隐式路径：模型决定要用 skill 后，自己发起读取文件的工具调用。
input_items.append({
    "type": "function_call_output",
    "call_id": "read_skill_md",
    "output": read_text(selected.path),  # full SKILL.md
})

# 显式路径：用户原始输入出现 $skill；Codex host 在 sampling 前处理。
input_items.append({
    "type": "message",
    "role": "user",
    "content": "用 $ppt-redraw 处理这个 PPT",
})
selected = available_skills.exact_name("ppt-redraw")

# host 侧读取 SKILL.md，然后追加 synthetic user fragment。
input_items.append({
    "type": "message",
    "role": "user",
    "content": (
        "<skill>\n"
        "<name>ppt-redraw</name>\n"
        "<path>/skills/ppt-redraw/SKILL.md</path>\n"
        f"{read_text(selected.path)}\n"
        "</skill>"
    ),
})
```

显式调用里，`<skill>...</skill>` 不是用户手写的短标记，而是 Codex host 渲染出来的完整上下文片段；隐式调用里，完整正文通常不重新包装成 `<skill>`，而是作为 tool output / `function_call_output` 回到后续 input。

**关键词：**`implicit trigger`、`explicit trigger`、`synthetic user item`、`function_call_output`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/012-skill-update-refresh.png' | relative_url }}" alt="Skill 更新影响下一次上下文" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">012 / Dive into Codex</p>
<h2>Skill 更新影响下一次上下文</h2>

修改 SKILL.md 不会把 diff 塞进 Responses，也不会改写旧 history。刷新 cache 后，metadata 可能进入新的 developer skills 列表；正文则要靠隐式路径的 tool read，或显式 `$skill` 路径的 host 预读取，作为新的完整内容追加。

**与本页直接相关的补充**

skill 更新有两条影响链。第一条是 metadata 链：更新 `name` / `description` 会改变下一次 `Available skills` 的内容，影响模型是否隐式触发该 skill。如果改了 `name`，显式 `$old-name` 也可能失效，需要使用新名字。这依赖 skill snapshot 被刷新；源码里的 `snapshot_for_config` 有缓存，通常需要文件 watcher 触发 `skills_service.clear_cache()`，下一轮 turn 才会重新加载。

第二条是正文链：更新 workflow、脚本说明、assets 规则或 references 之后，Codex 不会把“新增的几行 diff”传给 Responses。隐式路径下，模型后续根据 path 读取当前文件，新版正文作为 tool output 回填；显式路径下，只要用户再次提到 `$skill`，Codex host 会在 sampling 前重新读取当前 `SKILL.md`，再生成新的 `<skill>...</skill>` synthetic user item。

旧内容不会被原地替换。如果旧版 `SKILL.md` 已经进入过 history，后续读取新版时会追加新的上下文 item。模型应以后出现、更靠后的内容为准；只有发生压缩、重建或重新开线程，旧内容才可能被清理或总结掉。

**源码辅助理解**

```python
def on_skill_changed(path):
    skills_service.clear_cache()  # watcher 触发；不是把 diff 发给模型

def build_next_request(mode):
    input_items.append(render_available_skills(registry.snapshot()))

    if mode == "implicit" and model_chooses_skill:
        latest = tool_read(".../SKILL.md")
        input_items.append({
            "type": "function_call_output",
            "call_id": "read_skill_md",
            "output": latest,
        })

    if mode == "explicit" and "$ppt-redraw" in current_user_text:
        latest = host_read_before_sampling(".../SKILL.md")
        input_items.append({
            "type": "message",
            "role": "developer",
            "content": "## Skills\n- ppt-redraw: ...",
        })
        input_items.append({
            "type": "message",
            "role": "user",
            "content": f"<skill>{latest}</skill>",
        })
```

排查“更新没生效”可以按三问走：cache 是否被清掉、metadata 是否进入新的 `Available skills`、正文是否通过对应路径重新读取。隐式路径要关注模型是否真的发起 read；显式路径要关注当前 user input 是否再次提到了 `$skill`。

**关键词：**`skill update`、`cache refresh`、`stale history`、`re-read`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/013-skill-repeat-invocation.png' | relative_url }}" alt="重复调用也要分路径" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">013 / Dive into Codex</p>
<h2>重复调用也要分路径</h2>

如果第二次又显式提到 `$skill`，Codex 通常会再次读取同一个 SKILL.md，并追加新的 user `<skill>` item。隐式路径不会主动追加 `<skill>` tag；但模型如果再次决定使用 skill，可能再次发起读取，产生新的 function_call_output。

**与本页直接相关的补充**

重复调用时，不能只用“要不要重复塞全文”概括。显式路径是“每次当前 user input 里再次出现 `$skill`，就重新走 collect explicit mentions -> build skill injections -> read_file_text -> record synthetic user item”。即使文件没有变化，也会追加一个新的 `<skill>` block；旧 block 如果还没被压缩或截断，也可能仍在上下文里。

隐式路径不同。Codex 不会主动生成新的 `<skill>` user block；普通 steady-state turn 也不一定重发完整 `## Skills` developer block。如果模型再次判断任务需要该 skill，它会按 skill 使用规则再次读取 listed path，于是产生新的 tool call 和新的 `function_call_output`。这属于模型/tool loop 的结果，不是 host 预先塞入的 `<skill>` tag。

因此，重复调用的上下文风险也不同：显式重复更容易出现多个相同或不同版本的 `<skill>` block；隐式重复更容易出现多个读取文件的 tool output。两者都不是“原地替换历史”，而是把新的 item 追加到轨迹后面。

**源码辅助理解**

```python
def run_turn(user_text):
    if "$ppt-redraw" in user_text:
        # 显式：每次提到都会重新读，并追加 synthetic user item。
        contents = host_read_before_sampling("ppt-redraw/SKILL.md")
        history.append({
            "type": "message",
            "role": "user",
            "content": f"<skill>{contents}</skill>",
        })

    if model_decides_to_use_skill_again():
        # 隐式：模型再次通过工具读取，结果作为 tool output 回填。
        history.append({
            "type": "function_call_output",
            "call_id": "read_skill_md",
            "output": tool_read("ppt-redraw/SKILL.md"),
        })
```

**关键词：**`repeat invocation`、`explicit reinjection`、`implicit tool read`、`history`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/014-previous-response-id.png' | relative_url }}" alt="previous_response_id 连接连续状态" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">014 / Dive into Codex</p>
<h2>previous_response_id 连接连续状态</h2>

Responses API 可以通过 previous_response_id 串起连续 response。对 agent 来说，这相当于把一次任务拆成可追踪的多段运行记录，同时保留服务端可关联的上下文状态。

**与本页直接相关的补充**

`previous_response_id` 适合表达服务端连续状态，但它不是本地 Session history 的替代品。本地仍然要维护完整 input_items、tool outputs、权限反馈、skill 读取结果和 workspace 状态。可以把它理解为服务端状态线索，而不是完整任务记忆。

**关键词：**`previous_response_id`、`response state`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/015-reasoning-and-text.png' | relative_url }}" alt="Reasoning 和文本不是一回事" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">015 / Dive into Codex</p>
<h2>Reasoning 和文本不是一回事</h2>

Codex 既要处理给用户看的 output_text，也要处理模型内部推理摘要、工具调用、完成事件。把这些通道分开后，UI 可以展示进度，Session 可以记录决策，工具层可以只消费结构化调用。

**与本页直接相关的补充**

Agent runtime 不能把所有模型输出都当成“给用户看的文字”。`output_text` 面向展示，`reasoning summary` 面向轨迹和调试，`function_call` 面向工具执行。通道分离后，不同子系统可以只消费自己负责的部分。

**关键词：**`reasoning`、`output_text`、`UI event`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/016-rate-limit-events.png' | relative_url }}" alt="运行时也要看限流事件" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">016 / Dive into Codex</p>
<h2>运行时也要看限流事件</h2>

Responses 流里还可能带 rate limit 等运行状态。对长任务来说，这些事件能帮助 Codex 估算预算、更新状态，必要时调整节奏，而不是把 API 当成只返回文本的黑盒。

**与本页直接相关的补充**

长任务需要感知模型服务端状态。rate limit、token usage、错误和完成事件都会影响调度：是否继续 sampling、是否触发 compaction、是否提示用户等待、是否缩短下一轮上下文。Responses event 让这些信号进入同一条运行流。

**关键词：**`RateLimits`、`budget`、`runtime state`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/017-codex-consumes-events.png' | relative_url }}" alt="Codex 消费的是事件流" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">017 / Dive into Codex</p>
<h2>Codex 消费的是事件流</h2>

在 Codex 里，Responses API 的事件会被 Session 消费，再分发给 history、UI、ToolRouter 和后续 sampling。理解这一层，就能明白为什么 Agent Loop 是被事件驱动的，而不是被一条回答驱动。

**与本页直接相关的补充**

Session 是事件流的消费中心：UI 需要增量文本和状态，history 需要完成后的 item，ToolRouter 需要完整 tool call，下一轮 sampling 需要工具结果和上下文更新。Responses event 统一了这些下游需求。

**关键词：**`Session`、`event stream`、`Agent Loop`
</div>
</section>

<section class="visual-note" markdown="1">
<figure>
<img src="{{ '/assets/posts/dive-into-codex/02-responses-api-design/images/018-responses-summary.png' | relative_url }}" alt="Responses 是 Agent 日志" loading="lazy">
</figure>
<div markdown="1">
<p class="visual-note-index">018 / Dive into Codex</p>
<h2>Responses 是 Agent 日志</h2>

本章的核心是：Responses API 不是更复杂的聊天格式，而是适合 agent runtime 的事件日志。它让模型输出、工具执行、历史记录和任务续跑拥有同一种可追踪结构。

**与本页直接相关的补充**

把 Responses 看成 agent trace 会更准确：每个 item 记录一次行为，每个 event 描述一次状态变化，每个 tool output 和 skill 读取结果把真实上下文接回模型输入。Codex 能持续执行任务，靠的就是这条可追踪、可恢复、可续跑的日志结构。

**关键词：**`agent runtime`、`event log`、`trace`
</div>
</section>

