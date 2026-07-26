import { Agent, SimulationEvent, SimulationRun, sceneLabels } from "../lib/simulation";
import { AgentSprite } from "./CityMap";

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export function AgentContext({ agent, run, events, currentEvent, onClose }: {
  agent: Agent;
  run: SimulationRun;
  events: SimulationEvent[];
  currentEvent: SimulationEvent;
  onClose: () => void;
}) {
  const related = events.filter((event) => event.actor === agent.id || event.target === agent.id);
  const inbox = related.filter((event) => event.target === agent.id).slice(-3).reverse();
  const outbox = related.filter((event) => event.actor === agent.id && event.target).slice(-3).reverse();
  const latestAction = [...events].reverse().find((event) => event.actor === agent.id);
  const facts = unique(related.map((event) => event.summary)).slice(-4).reverse();
  const isCurrent = currentEvent.actor === agent.id;

  return (
    <div className="context-panel">
      <div className="context-profile">
        <AgentSprite agent={agent} size="medium" active={isCurrent} />
        <div>
          <p>AGENT CONTEXT</p>
          <h3>{agent.name} <span>{agent.role}</span></h3>
          <small>{agent.trait} · {agent.specialty}</small>
        </div>
        <button onClick={onClose} aria-label="关闭 Agent 上下文">×</button>
      </div>

      <div className="context-status-row">
        <span><i className={isCurrent ? "busy" : ""} />{isCurrent ? "正在处理" : "等待事件"}</span>
        <span>信心 <b>{agent.confidence}%</b></span>
        <span>上下文 <b>{Math.min(82, 24 + related.length * 6)}%</b></span>
      </div>

      <section className="context-block context-goal">
        <label>当前目标</label>
        <strong>{agent.id === "lin" ? run.scenario.brief : latestAction?.title ?? "等待主管分配任务"}</strong>
        <p>{latestAction?.detail ?? "尚未获得与角色相关的新信息。"}</p>
      </section>

      <section className="context-block context-scope">
        <label>上下文边界 · CONTEXT SCOPE</label>
        <div className="scope-row"><span>所在场景</span><b>{latestAction ? sceneLabels[latestAction.scene] : "尚未进入场景"}</b></div>
        <div className="scope-row"><span>最近载荷</span><code>{latestAction?.payload ?? "empty"}</code></div>
        <div className="scope-row"><span>可见范围</span><b>{latestAction?.visibility === "city" ? "城市共享" : latestAction?.visibility === "room" ? "场景共享" : "Agent 私有"}</b></div>
      </section>

      <section className="context-block">
        <label>已知事实 · MEMORY</label>
        <ul className="fact-list">
          {facts.length ? facts.map((fact) => <li key={fact}>{fact}</li>) : <li>尚未写入共享事实。</li>}
        </ul>
      </section>

      <div className="mail-grid">
        <section className="context-block mail-block">
          <label>收件箱 · INBOX</label>
          {inbox.length ? inbox.map((event) => (
            <div className="mail-item incoming" key={event.id}>
              <span>← {run.agents.find((item) => item.id === event.actor)?.name ?? "系统"}</span>
              <b>{event.title}</b>
              <small>{event.protocol}</small>
            </div>
          )) : <p className="empty-mail">暂无新消息</p>}
        </section>
        <section className="context-block mail-block">
          <label>发件箱 · OUTBOX</label>
          {outbox.length ? outbox.map((event) => (
            <div className="mail-item outgoing" key={event.id}>
              <span>→ {run.agents.find((item) => item.id === event.target)?.name ?? "总线"}</span>
              <b>{event.title}</b>
              <small>{event.protocol}</small>
            </div>
          )) : <p className="empty-mail">尚未发送消息</p>}
        </section>
      </div>

      {latestAction && (
        <section className="context-diff">
          <div><label>本轮上下文变化</label><span>{latestAction.stage}</span></div>
          <p className="diff-add">+ {latestAction.summary}</p>
          <p className="diff-plan">→ 下一步根据「{latestAction.protocol}」规则继续处理</p>
        </section>
      )}
    </div>
  );
}
