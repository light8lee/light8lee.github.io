"""State Machine：下一节点通过持久化 Shared State 感知输入。

节点不直接调用下一节点，只返回 State patch。GraphRunner 先合并 patch，
再根据 route 选择下一节点；因此下一节点看到的是合并后的最新状态。
"""

from trace_utils import TraceLogger, print_final

REQUEST = "策划一场面向年轻人的周末城市文化漫游活动，预算 8000 元。"
trace = TraceLogger()


def research_node(state: dict) -> tuple[dict, str]:
    return {"event_name": "沿着建筑读懂城市", "venue": "城市美术馆与历史街区"}, "content"


def content_node(state: dict) -> tuple[dict, str]:
    return {"deliverables": ["活动主视觉", "路线手册"]}, "schedule"


def schedule_node(state: dict) -> tuple[dict, str]:
    return {"schedule": "周六 14:00-18:00", "stops": 4}, "budget"


def budget_node(state: dict) -> tuple[dict, str]:
    patch = {"budget": 7800}
    # 条件边在状态合并后判断；这里显式返回 route。
    route = "publish" if patch["budget"] <= state["budget_limit"] else "content"
    return patch, route


def publish_node(state: dict) -> tuple[dict, str]:
    return {"deliverables": state["deliverables"] + ["现场执行清单"]}, "END"


NODES = {
    "research": research_node,
    "content": content_node,
    "schedule": schedule_node,
    "budget": budget_node,
    "publish": publish_node,
}


def run(request: str) -> dict:
    state = {"request": request, "budget_limit": 8000, "checkpoint_version": 0}
    current = "research"

    while current != "END":
        input_snapshot = state.copy()
        trace.log(
            event="NODE_ENTER",
            agent=f"{current.title()}Node",
            via="shared_state.load",
            input_data=input_snapshot,
            action="GraphRunner 从 Shared State 加载最新快照",
        )

        patch, next_node = NODES[current](input_snapshot)
        state.update(patch)
        state["checkpoint_version"] += 1
        trace.log(
            event="STATE_COMMITTED",
            agent=f"{current.title()}Node",
            via="state_reducer",
            input_data=input_snapshot,
            action="提交 State patch；下一节点将从新版本 State 中读取输入",
            output_data={"patch": patch, "state": state.copy(), "route": next_node},
            next_agent=next_node if next_node == "END" else f"{next_node.title()}Node",
        )
        current = next_node

    return {key: state[key] for key in ("event_name", "venue", "schedule", "budget", "deliverables")}


if __name__ == "__main__":
    print_final(run(REQUEST))
