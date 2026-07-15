# Multi-Agent Trace 示例

五个脚本使用相同活动策划任务，但刻意采用不同的输入传播机制。

| 脚本 | 下一位 Agent 如何感知输入 |
|---|---|
| `01_supervisor.py` | Supervisor 将 `TaskSpec` 作为函数/RPC 参数传给 Worker |
| `02_group_chat.py` | Agent 读取共享 `transcript`，看到此前公开 Message |
| `03_handoff.py` | 下一位 Agent 收到包含累计 State、来源和原因的 Envelope |
| `04_state_machine.py` | GraphRunner 先提交 State patch，下一节点加载新版本 State |
| `05_event_bus.py` | Event Bus 根据 Topic 订阅关系投递 Event payload |

## 运行

```powershell
python 01_supervisor.py
python 02_group_chat.py
python 03_handoff.py
python 04_state_machine.py
python 05_event_bus.py
```

每行 Trace 都是 JSON：

```json
{
  "trace": {
    "step": 3,
    "event": "RECEIVED",
    "agent": "ContentAgent",
    "via": "handoff.envelope",
    "input": {},
    "action": "读取 Envelope 中的累计 State 与交接原因",
    "output": null,
    "next_agent": null
  }
}
```

- `event`：本步属于接收、发布、交接还是状态提交。
- `via`：输入通过什么机制到达。
- `input`：Agent 实际可见的数据。
- `action`：Agent 在本步完成的工作。
- `output`：产生的 Message、patch、Event 或业务结果。
- `next_agent`：谁将在下一步感知该输出；事件广播时可以有多个订阅者。

最后一行不带 `trace` 包装，是最终业务 JSON，便于其他程序直接解析。

## 在 Python REPL 中查看

文稿使用 `repl_utils.run_example()` 产生可复制运行的 Python REPL：

```pycon
>>> from repl_utils import run_example
>>> traces, result = run_example("03_handoff.py")
>>> traces[0]["agent"], traces[0]["via"]
('ResearchAgent', 'handoff.envelope')
>>> traces[1]["next_agent"]
'ContentAgent'
>>> result["budget"]
7800
```

这里每个 `>>>` 后面都是合法 Python 语句或表达式，下一行才是实际输出。

## 测试

```powershell
python test_examples.py -v
```

测试会确认五个脚本均输出多条 Trace、包含输入来源与下一位 Agent，并生成完整最终方案。
