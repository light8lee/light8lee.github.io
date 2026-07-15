"""Supervisor：中心节点派工，Worker 通过函数参数感知输入。

运行后可以观察到：
1. Supervisor 收到用户请求并生成四个子任务。
2. 每个 Worker 只接收自己的 TaskSpec，不读取其他 Worker 的结果。
3. Worker 返回结构化结果，Supervisor 收齐后统一合并。
"""

from trace_utils import TraceLogger, print_final

REQUEST = "策划一场面向年轻人的周末城市文化漫游活动，预算 8000 元。"
trace = TraceLogger()


def research_handler(task: dict) -> dict:
    """消费调研 TaskSpec，输出地点与目标受众。"""

    return {"venue": "城市美术馆与历史街区", "audience": "18-35 岁城市青年"}


def content_handler(task: dict) -> dict:
    """消费内容 TaskSpec，输出主题和需要制作的物料。"""

    return {"theme": "沿着建筑读懂城市", "deliverables": ["活动主视觉", "路线手册"]}


def schedule_handler(task: dict) -> dict:
    """消费排期 TaskSpec，输出时间段与路线站点数。"""

    return {"schedule": "周六 14:00-18:00", "stops": 4}


def budget_handler(task: dict) -> dict:
    """消费预算 TaskSpec，输出预算值以及是否满足上限。"""

    return {"budget": 7800, "within_limit": True}


def run_worker(name: str, task: dict, handler) -> dict:
    """模拟 Supervisor 调用一个临时 Worker。

    `task` 就是 Worker 感知到的输入。真实系统中它可能来自 RPC、
    消息队列或子进程；本示例用函数参数把边界展示得最清楚。
    """

    trace.log(
        event="RECEIVED",
        agent=name,
        via="supervisor.function_call",
        input_data=task,
        action="读取分配给自己的 TaskSpec",
    )
    output = handler(task)
    trace.log(
        event="OUTPUT",
        agent=name,
        via="function_return",
        input_data=task,
        action="完成专长任务并返回结构化结果",
        output_data=output,
        next_agent="Supervisor",
    )
    return output


def supervisor(request: str) -> dict:
    trace.log(
        event="RECEIVED",
        agent="Supervisor",
        via="user.request",
        input_data={"request": request},
        action="理解目标并拆成可独立执行的子任务",
    )

    # Supervisor 是唯一知道全部 Worker 的节点。
    tasks = {
        "ResearchWorker": {"goal": "确定地点与受众", "request": request},
        "ContentWorker": {"goal": "设计主题与传播物料", "request": request},
        "ScheduleWorker": {"goal": "规划路线与时间", "request": request},
        "BudgetWorker": {"goal": "核算资源，预算上限 8000 元", "request": request},
    }
    trace.log(
        event="DELEGATE",
        agent="Supervisor",
        via="task_plan",
        input_data={"request": request},
        action="生成四个 TaskSpec，并行派发给 Worker",
        output_data=tasks,
        next_agent="ResearchWorker|ContentWorker|ScheduleWorker|BudgetWorker",
    )

    research = run_worker(
        "ResearchWorker",
        tasks["ResearchWorker"],
        research_handler,
    )
    content = run_worker(
        "ContentWorker",
        tasks["ContentWorker"],
        content_handler,
    )
    schedule = run_worker(
        "ScheduleWorker",
        tasks["ScheduleWorker"],
        schedule_handler,
    )
    budget = run_worker(
        "BudgetWorker",
        tasks["BudgetWorker"],
        budget_handler,
    )

    worker_outputs = {"research": research, "content": content, "schedule": schedule, "budget": budget}
    result = {
        "event_name": content["theme"],
        "venue": research["venue"],
        "schedule": schedule["schedule"],
        "budget": budget["budget"],
        "deliverables": content["deliverables"] + ["现场执行清单"],
    }
    trace.log(
        event="MERGE",
        agent="Supervisor",
        via="worker.function_returns",
        input_data=worker_outputs,
        action="收集所有 Worker 输出，校验预算并合并最终方案",
        output_data=result,
        next_agent=None,
    )
    return result


if __name__ == "__main__":
    print_final(supervisor(REQUEST))
