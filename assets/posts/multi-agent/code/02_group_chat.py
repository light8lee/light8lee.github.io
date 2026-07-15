"""GroupChat：下一位 Agent 通过共享 transcript 感知前序输入。

每个 Agent 发言前读取同一个 transcript 快照，发言后把 Message 追加进去。
因此它不是点对点交接；后续成员天然能看到此前所有公开消息。
"""

from trace_utils import TraceLogger, print_final

REQUEST = "策划一场面向年轻人的周末城市文化漫游活动，预算 8000 元。"
trace = TraceLogger()


def speak(agent: str, role: str, transcript: list[dict], content: str, next_agent: str | None) -> None:
    """读取共享对话并追加一条结构化 Message。"""

    visible_input = {
        "message_count": len(transcript),
        "latest_message": transcript[-1],
        "shared_transcript": transcript.copy(),
    }
    trace.log(
        event="RECEIVED",
        agent=agent,
        via="shared_transcript.read",
        input_data=visible_input,
        action=f"以 {role} 身份读取全部公开消息",
    )

    message = {"sender": agent, "role": role, "content": content}
    transcript.append(message)
    trace.log(
        event="MESSAGE_APPENDED",
        agent=agent,
        via="shared_transcript.append",
        input_data=visible_input,
        action="把本轮观点追加到共享 transcript；下一位 Agent 将在读取时感知它",
        output_data=message,
        next_agent=next_agent,
    )


def group_chat(request: str) -> dict:
    transcript = [{"sender": "User", "role": "request", "content": request}]

    speak("ResearchAgent", "proposal", transcript, "年轻受众偏好可拍照、可互动的城市路线", "ContentAgent")
    speak("ContentAgent", "proposal", transcript, "主题提案：沿着建筑读懂城市", "ScheduleAgent")
    speak("ScheduleAgent", "challenge", transcript, "路线应控制为 4 个站点，避免行程过满", "BudgetAgent")
    speak("BudgetAgent", "evidence", transcript, "7800 元可覆盖讲师、物料和场地协调", "Facilitator")
    speak("Facilitator", "consensus", transcript, "采用 4 站文化漫游方案，进入定稿", None)

    result = {
        "event_name": "沿着建筑读懂城市",
        "venue": "城市美术馆与历史街区",
        "schedule": "周六 14:00-18:00",
        "budget": 7800,
        "deliverables": ["活动主视觉", "路线手册", "现场执行清单"],
    }
    trace.log(
        event="CONSENSUS",
        agent="Facilitator",
        via="shared_transcript",
        input_data={"all_messages": transcript},
        action="检查必要角色均已发言且关键分歧已解决",
        output_data=result,
        next_agent=None,
    )
    return result


if __name__ == "__main__":
    print_final(group_chat(REQUEST))
