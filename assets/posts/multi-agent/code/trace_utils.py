"""五个示例共用的结构化 Trace 工具。

每条 Trace 都是一行 JSON，方便人在终端阅读，也方便日志系统采集。
最后的业务结果不经过本工具打印，确保脚本最后一行始终是最终 JSON。
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict, dataclass
from typing import Any


# Windows 终端的默认代码页可能不是 UTF-8。显式设置后，中文 Trace 在
# PowerShell、日志采集器和重定向文件中都保持一致编码。
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


@dataclass
class TraceEvent:
    """描述一次 Agent 交互的最小可观察单元。"""

    step: int
    event: str
    agent: str
    via: str
    input: Any
    action: str
    output: Any
    next_agent: str | None


class TraceLogger:
    """按发生顺序输出 Trace，并自动维护 step 编号。"""

    def __init__(self) -> None:
        self._step = 0

    def log(
        self,
        *,
        event: str,
        agent: str,
        via: str,
        input_data: Any = None,
        action: str = "",
        output_data: Any = None,
        next_agent: str | None = None,
    ) -> None:
        self._step += 1
        record = TraceEvent(
            step=self._step,
            event=event,
            agent=agent,
            via=via,
            input=input_data,
            action=action,
            output=output_data,
            next_agent=next_agent,
        )
        print(json.dumps({"trace": asdict(record)}, ensure_ascii=False))


def print_final(result: dict[str, Any]) -> None:
    """打印最终业务结果；测试程序约定读取最后一行。"""

    print(json.dumps(result, ensure_ascii=False))
