"""Handoff：下一位 Agent 通过 handoff envelope 感知输入。

Envelope 同时携带共享状态、前序 Agent、交接原因和 hop 计数。
每个 Agent 返回 patch 与 next_agent，运行器合并后再把新 Envelope 交出去。
"""

from trace_utils import TraceLogger, print_final

REQUEST = "策划一场面向年轻人的周末城市文化漫游活动，预算 8000 元。"
trace = TraceLogger()


def research(state: dict) -> tuple[dict, str, str]:
    return {"event_name": "沿着建筑读懂城市", "venue": "城市美术馆与历史街区"}, "ContentAgent", "地点与受众已确定"


def content(state: dict) -> tuple[dict, str, str]:
    return {"deliverables": ["活动主视觉", "路线手册"]}, "ScheduleAgent", "主题与核心物料已确定"


def schedule(state: dict) -> tuple[dict, str, str]:
    return {"schedule": "周六 14:00-18:00", "stops": 4}, "BudgetAgent", "路线和时段已确定"


def budget(state: dict) -> tuple[dict, None, str]:
    return {"budget": 7800, "deliverables": state["deliverables"] + ["现场执行清单"]}, None, "预算通过，任务结束"


AGENTS = {
    "ResearchAgent": research,
    "ContentAgent": content,
    "ScheduleAgent": schedule,
    "BudgetAgent": budget,
}


def run(request: str, max_hops: int = 5) -> dict:
    state = {"request": request}
    current, previous, reason, hop = "ResearchAgent", "User", "开始活动策划", 1

    while current:
        if hop > max_hops:
            raise RuntimeError("handoff 超过最大跳数，可能出现循环")

        # Envelope 就是下一位 Agent 的输入边界。
        envelope = {
            "from": previous,
            "to": current,
            "reason": reason,
            "hop": hop,
            "state": state.copy(),
        }
        trace.log(
            event="RECEIVED",
            agent=current,
            via="handoff.envelope",
            input_data=envelope,
            action="读取 Envelope 中的累计 State 与交接原因",
        )

        patch, next_agent, next_reason = AGENTS[current](state.copy())
        state.update(patch)
        trace.log(
            event="HANDOFF",
            agent=current,
            via="state_patch+next_agent",
            input_data=envelope,
            action="产生 State patch，并明确指定下一位所有者",
            output_data={"patch": patch, "merged_state": state.copy(), "reason": next_reason},
            next_agent=next_agent,
        )
        previous, current, reason, hop = current, next_agent, next_reason, hop + 1

    return {key: state[key] for key in ("event_name", "venue", "schedule", "budget", "deliverables")}


if __name__ == "__main__":
    print_final(run(REQUEST))
