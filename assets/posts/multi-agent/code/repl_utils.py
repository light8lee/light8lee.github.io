"""供文稿中的 Python REPL 示例调用。

`run_example()` 会真实启动指定示例脚本，把前面的 JSON Lines 解析为
Trace 字典列表，并把最后一行解析为业务结果。这样文稿里的 `>>>` 表达式
可以直接复制到 Python REPL，而不是伪造一段看似终端输出的文本。
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).parent


def run_example(script_name: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """执行同目录下的示例脚本，返回 `(traces, final_result)`。

    Args:
        script_name: 例如 `01_supervisor.py`。只允许同目录中的文件名，
            防止 REPL 示例意外执行目录外脚本。

    Returns:
        traces: 已去掉外层 `{"trace": ...}` 包装的事件列表。
        final_result: 示例脚本最后一行的业务 JSON。
    """

    script = (ROOT / script_name).resolve()
    if script.parent != ROOT.resolve() or not script.is_file():
        raise ValueError(f"未知示例脚本：{script_name}")

    completed = subprocess.run(
        [sys.executable, str(script)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
    )
    lines = completed.stdout.strip().splitlines()
    traces = [json.loads(line)["trace"] for line in lines[:-1]]
    final_result = json.loads(lines[-1])
    return traces, final_result
