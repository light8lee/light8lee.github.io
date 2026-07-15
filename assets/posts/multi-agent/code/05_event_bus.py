"""Event Bus：下一位 Agent 通过订阅 Topic 感知输入。

发布者只知道 Topic，不知道具体订阅者。EventBus 从队列取出 Event，
把 payload 投递给所有订阅者；这就是订阅 Agent 的输入来源。
"""

from collections import defaultdict, deque
from dataclasses import dataclass
from typing import Callable

from trace_utils import TraceLogger, print_final

REQUEST = "策划一场面向年轻人的周末城市文化漫游活动，预算 8000 元。"
trace = TraceLogger()


@dataclass
class Event:
    topic: str
    payload: dict
    producer: str


class EventBus:
    def __init__(self) -> None:
        self.subscribers: dict[str, list[tuple[str, Callable]]] = defaultdict(list)
        self.queue: deque[Event] = deque()

    def subscribe(self, topic: str, agent: str, handler: Callable) -> None:
        self.subscribers[topic].append((agent, handler))

    def publish(self, event: Event) -> None:
        trace.log(
            event="PUBLISHED",
            agent=event.producer,
            via=f"topic:{event.topic}",
            input_data=None,
            action="发布者只写入 Topic，不直接调用任何订阅者",
            output_data=event.payload,
            next_agent="|".join(agent for agent, _ in self.subscribers[event.topic]),
        )
        self.queue.append(event)

    def drain(self, state: dict) -> None:
        while self.queue:
            event = self.queue.popleft()
            for agent, handler in self.subscribers[event.topic]:
                # payload 是订阅 Agent 感知到的直接输入；state 是共享业务状态。
                trace.log(
                    event="DELIVERED",
                    agent=agent,
                    via=f"subscription:{event.topic}",
                    input_data={"event": event.payload, "state_before": state.copy()},
                    action="Event Bus 根据订阅表投递事件",
                )
                patch = handler(event.payload, state.copy())
                state.update(patch)
                trace.log(
                    event="STATE_UPDATED",
                    agent=agent,
                    via="shared_state.write",
                    input_data=event.payload,
                    action="处理事件并把结构化 patch 写入 Shared State",
                    output_data={"patch": patch, "state_after": state.copy()},
                    next_agent="CompletionChecker",
                )


def research_handler(event: dict, state: dict) -> dict:
    """读取 event.created payload，补齐活动名称与地点。"""

    return {"event_name": "沿着建筑读懂城市", "venue": "城市美术馆与历史街区"}


def content_handler(event: dict, state: dict) -> dict:
    """读取同一个事件，独立产生内容物料 patch。"""

    return {"deliverables": ["活动主视觉", "路线手册"]}


def schedule_handler(event: dict, state: dict) -> dict:
    """读取请求与当前 State，产生排期 patch。"""

    return {"schedule": "周六 14:00-18:00"}


def budget_handler(event: dict, state: dict) -> dict:
    """根据事件中的 budget_limit 计算预算结果。"""

    proposed_budget = 7800
    return {"budget": proposed_budget, "within_limit": proposed_budget <= event["budget_limit"]}


def run(request: str) -> dict:
    state: dict = {"request": request, "deliverables": []}
    bus = EventBus()

    # 注册阶段只建立 Topic → Agent 的订阅关系；发布者并不知道这些 handler。
    bus.subscribe("event.created", "ResearchAgent", research_handler)
    bus.subscribe("event.created", "ContentAgent", content_handler)
    bus.subscribe("event.created", "ScheduleAgent", schedule_handler)
    bus.subscribe("event.created", "BudgetAgent", budget_handler)

    bus.publish(Event("event.created", {"request": request, "budget_limit": 8000}, "UserGateway"))
    bus.drain(state)

    required = {"event_name", "venue", "schedule", "budget", "deliverables"}
    trace.log(
        event="CHECK",
        agent="CompletionChecker",
        via="shared_state.read",
        input_data=state.copy(),
        action="检查必填状态槽和预算约束；它读取 State，而不是直接读取 Event Bus",
        output_data={"required_ready": required <= state.keys(), "within_budget": state.get("budget", 99999) <= 8000},
        next_agent=None,
    )
    state["deliverables"] = state["deliverables"] + ["现场执行清单"]
    return {key: state[key] for key in ("event_name", "venue", "schedule", "budget", "deliverables")}


if __name__ == "__main__":
    print_final(run(REQUEST))
