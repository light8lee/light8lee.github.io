import json
import subprocess
import sys
import unittest
from pathlib import Path

from repl_utils import run_example


ROOT = Path(__file__).parent
SCRIPTS = [
    "01_supervisor.py",
    "02_group_chat.py",
    "03_handoff.py",
    "04_state_machine.py",
    "05_event_bus.py",
]
REQUIRED = {"event_name", "venue", "schedule", "budget", "deliverables"}


class ExampleTests(unittest.TestCase):
    def test_examples_emit_trace_and_complete_result(self):
        for script in SCRIPTS:
            with self.subTest(script=script):
                result = subprocess.run(
                    [sys.executable, str(ROOT / script)],
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    check=False,
                )
                self.assertEqual(result.returncode, 0, result.stderr)
                lines = result.stdout.strip().splitlines()
                self.assertGreater(len(lines), 3, "示例应输出多条 Trace，而不只是最终结果")

                trace_records = [json.loads(line)["trace"] for line in lines[:-1]]
                self.assertTrue(any(item["event"] in {"RECEIVED", "NODE_ENTER", "DELIVERED"} for item in trace_records))
                self.assertTrue(all("via" in item and "action" in item for item in trace_records))
                self.assertTrue(any(item["next_agent"] for item in trace_records))

                payload = json.loads(lines[-1])
                self.assertTrue(REQUIRED <= payload.keys())
                self.assertIsInstance(payload["deliverables"], list)

    def test_repl_helper_returns_parsed_trace_and_result(self):
        """文稿中的 `>>>` 示例依赖此接口，需验证它返回真实运行数据。"""

        for script in SCRIPTS:
            with self.subTest(script=script):
                traces, result = run_example(script)
                self.assertGreater(len(traces), 2)
                self.assertTrue(all("agent" in item and "via" in item for item in traces))
                self.assertTrue(REQUIRED <= result.keys())


if __name__ == "__main__":
    unittest.main()
