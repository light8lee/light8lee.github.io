import { Agent, SceneKey, SimulationEvent, SimulationRun, sceneAgentIds, sceneLabels, sceneProtocols } from "../lib/simulation";
import { AgentSprite } from "./CityMap";
import { AnchoredArrows, ArrowSpec } from "./AnchoredArrows";

export type SceneLens = "auto" | SceneKey;

const sceneOrder: SceneKey[] = ["meeting", "command", "warehouse", "facility"];
const modeIdentity: Record<SceneKey, { icon: string; title: string; rule: string }> = {
  meeting: { icon: "◉", title: "主持轮转与共享记忆", rule: "主持人决定发言顺序；每位 Agent 的观点写入同一份房间上下文。" },
  command: { icon: "⇄", title: "主管委派与结果回传", rule: "Supervisor 拆解全局目标；执行 Agent 只领取子任务并把结果回传。" },
  warehouse: { icon: "≋", title: "事件发布与订阅消费", rule: "发布者只发送事件；匹配主题的工作站自行消费、处理或再次发布。" },
  facility: { icon: "◇", title: "依赖解锁与并行执行", rule: "节点按 DAG 依赖关系解锁；并行分支完成后在汇合节点继续运行。" },
};

function MiniAgent({ agent, active = false, nodeId }: { agent: Agent; active?: boolean; nodeId?: string }) {
  return <div className={`mini-agent ${active ? "active" : ""}`} data-arrow-node={nodeId}><AgentSprite agent={agent} size="small" active={active} /><b>{agent.name}</b><span>{agent.role}</span></div>;
}

function sceneStatus(scene: SceneKey, current: SimulationEvent, visible: SimulationEvent[]) {
  const inScene = visible.filter((event) => event.scene === scene);
  if (current.scene === scene) return "正在运行";
  if (!inScene.length) return "等待输入";
  return `已产生 ${inScene.at(-1)?.eventName}`;
}

export function CollaborationStage({ run, event, visibleEvents, lens, onLensChange }: {
  run: SimulationRun;
  event: SimulationEvent;
  visibleEvents: SimulationEvent[];
  lens: SceneLens;
  onLensChange: (lens: SceneLens) => void;
}) {
  const activeScene = lens === "auto" ? event.scene : lens;
  const sceneEvent = [...visibleEvents].reverse().find((item) => item.scene === activeScene)
    ?? run.events.find((item) => item.scene === activeScene)
    ?? event;
  const actor = run.agents.find((agent) => agent.id === sceneEvent.actor) ?? run.agents[0];
  const target = run.agents.find((agent) => agent.id === sceneEvent.target);
  const cast = sceneAgentIds[activeScene].map((id) => run.agents.find((agent) => agent.id === id)).filter(Boolean) as Agent[];
  const isManual = lens !== "auto";
  const facilityEvents = visibleEvents.filter((item) => item.scene === "facility");
  const warehouseEvents = visibleEvents.filter((item) => item.scene === "warehouse");
  const hasPatch = facilityEvents.some((item) => item.eventName === "dag.node.failed");
  const sopDone = facilityEvents.some((item) => item.eventName === "power.ready");
  const commandWorkers = sceneAgentIds.command.slice(1);
  const warehouseActiveIds = new Set<string>();
  if (sceneEvent.eventName === "supply.request") cast.forEach((item) => warehouseActiveIds.add(item.id));
  if (sceneEvent.eventName === "inventory.consume") warehouseActiveIds.add("bo");
  if (sceneEvent.eventName === "inventory.mismatch") { warehouseActiveIds.add("bo"); warehouseActiveIds.add("qi"); }
  if (sceneEvent.eventName === "inventory.reconciled") { warehouseActiveIds.add("qi"); warehouseActiveIds.add("bo"); }
  if (sceneEvent.eventName === "packing.completed") { warehouseActiveIds.add("wu"); warehouseActiveIds.add("qi"); }
  if (sceneEvent.eventName === "supplies.ready") warehouseActiveIds.add("qi");
  const spokeLabel = (workerId: string, fallback: string) =>
    (sceneEvent.actor === "lin" && sceneEvent.target === workerId) || (sceneEvent.actor === workerId && sceneEvent.target === "lin")
      ? sceneEvent.eventName
      : fallback;
  const commandArrows: ArrowSpec[] = commandWorkers.map((workerId, index) => {
    const incoming = sceneEvent.actor === workerId && sceneEvent.target === "lin";
    const active = incoming || (sceneEvent.actor === "lin" && sceneEvent.target === workerId);
    return {
      from: incoming ? `command-${workerId}` : "command-lin",
      to: incoming ? "command-lin" : `command-${workerId}`,
      label: spokeLabel(workerId, ["侦察", "设施", "物资"][index]),
      active,
      tone: active ? "coral" : "amber",
    };
  });

  return (
    <section className={`collaboration-stage lens-${activeScene}`}>
      <div className="scene-transition-card" aria-hidden="true"><span>镜头切换</span><b>进入 · {sceneLabels[activeScene]}</b><small>{sceneProtocols[activeScene]}</small></div>
      <div className="scene-route">
        <button className={lens === "auto" ? "active" : ""} onClick={() => onLensChange("auto")}><b>自动镜头</b><span>跟随当前事件</span></button>
        {sceneOrder.map((scene, index) => (
          <div className="scene-stop" key={scene}>
            {index > 0 && <i className={`scene-transfer ${visibleEvents.some((item) => item.scene === scene) ? "passed" : ""}`} />}
            <button className={(lens === scene || (lens === "auto" && event.scene === scene)) ? "active" : ""} onClick={() => onLensChange(scene)}>
              <em>{index + 1}</em><b>{sceneLabels[scene]}</b><span>{sceneStatus(scene, event, visibleEvents)}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="mode-banner" aria-label={`当前多 Agent 协作模式：${sceneProtocols[activeScene]}`}>
        <div className="mode-code"><i>{modeIdentity[activeScene].icon}</i><span>多 Agent 协作模式</span><b>{sceneProtocols[activeScene]}</b></div>
        <div className="mode-rule"><strong>{modeIdentity[activeScene].title}</strong><small>{modeIdentity[activeScene].rule}</small></div>
      </div>

      <div className="collaboration-head">
        <div><p>{sceneProtocols[activeScene]} · CITY SCENE</p><h3>{sceneLabels[activeScene]}</h3></div>
        <div className="scene-event-card"><span>{isManual ? "手动定位" : "当前输入"}</span><b>{sceneEvent.eventName}</b><small>{sceneEvent.payload}</small></div>
      </div>

      {activeScene === "command" && (
        <div className="supervisor-stage protocol-canvas">
          <div className="command-wall"><span>全局目标</span><b>{run.scenario.title}</b><small>{sceneEvent.eventName}</small></div>
          <div className="supervisor-core"><MiniAgent agent={run.agents[0]} active={actor.id === "lin"} nodeId="command-lin" /><em>任务路由</em></div>
          <AnchoredArrows arrows={commandArrows} />
          <div className="worker-row">{cast.slice(1).map((agent) => <MiniAgent key={agent.id} agent={agent} nodeId={`command-${agent.id}`} active={actor.id === agent.id || target?.id === agent.id} />)}</div>
          <div className="protocol-explain"><b>{sceneEvent.title}</b><span>主管读取全局状态，负责动态拆解、委派和最终收束。</span></div>
        </div>
      )}

      {activeScene === "meeting" && (
        <div className="meeting-stage protocol-canvas">
          <div className="meeting-agents">{cast.map((agent) => <MiniAgent key={agent.id} agent={agent} nodeId={`meeting-${agent.id}`} active={actor.id === agent.id} />)}</div>
          <AnchoredArrows arrows={[{ from: `meeting-${actor.id}`, to: "meeting-memory", label: sceneEvent.eventName, tone: "blue" }]} />
          <div className="shared-table" data-arrow-node="meeting-memory"><span>房间共享上下文</span><b>{sceneEvent.title}</b><small>当前发言：{actor.name}　·　下一位：{target?.name ?? "主持人收束"}</small></div>
          <div className="turn-token">发言权</div>
          <div className="protocol-explain"><b>输出：emergency-plan.ready</b><span>主持人控制轮次，观点进入共享记忆，最终形成可供指挥中心读取的预案。</span></div>
        </div>
      )}

      {activeScene === "warehouse" && (
        <div className={`bus-stage protocol-canvas warehouse-canvas warehouse-event-${sceneEvent.kind}`}>
          <div className="warehouse-racks"><i /><i /><i /><span>库存货架</span></div>
          <div className="publisher" data-arrow-node="warehouse-publisher">
            {cast.some((item) => item.id === actor.id) ? <MiniAgent agent={actor} active /> : <div className="external-publisher"><b>城市总线</b><span>EXTERNAL</span></div>}
            <span>{cast.some((item) => item.id === actor.id) ? "消费 / 再发布" : "接收外部事件"}</span>
          </div>
          <div className="bus-line" data-arrow-node="warehouse-bus" key={sceneEvent.id}><i className="bus-packet">{sceneEvent.icon}</i><b>{sceneEvent.eventName}</b><small>{sceneEvent.payload}</small></div>
          <AnchoredArrows arrows={cast.map((agent, index) => ({
            from: "warehouse-bus",
            to: `warehouse-${agent.id}`,
            label: ["inventory.*", "packing.*", "supply.*"][index],
            labelSide: [1, 0, -1][index] as -1 | 0 | 1,
            active: warehouseActiveIds.has(agent.id),
            tone: warehouseActiveIds.has(agent.id) ? "coral" : "aqua",
          }))} />
          <div className="warehouse-event-ticker" aria-label="仓储事件变化">
            {(warehouseEvents.length ? warehouseEvents : [sceneEvent]).slice(-4).map((item) => <span key={item.id} className={item.id === sceneEvent.id ? "current" : "done"}><i>{item.icon}</i>{item.eventName}</span>)}
          </div>
          <div className="workstations">
            {[
              [cast[0], "库存订阅", "inventory.*"],
              [cast[1], "打包订阅", "packing.*"],
              [cast[2], "运输订阅", "supply.*"],
            ].map(([agent, label, filter]) => {
              const item = agent as Agent;
              const isActor = actor.id === item.id;
              const isTarget = target?.id === item.id;
              return <div key={item.id} className={warehouseActiveIds.has(item.id) ? "receiving" : "waiting"}><MiniAgent agent={item} nodeId={`warehouse-${item.id}`} active={isActor || isTarget} /><b>{isActor ? "正在处理" : isTarget ? "收到事件" : warehouseActiveIds.has(item.id) ? "匹配订阅" : label as string}</b><span>{filter as string}</span></div>;
            })}
          </div>
          <div className="protocol-explain"><b>输出：supplies.ready</b><span>每个工作站只消费自己订阅的事件；发布者不需要知道最后由谁处理。</span></div>
        </div>
      )}

      {activeScene === "facility" && (
        <div className="dag-stage protocol-canvas facility-canvas">
          <div className={`dag-node ${facilityEvents.length ? "done" : "waiting"}`} data-arrow-node="dag-safety"><span>01</span><b>安全检查</b><small>supplies.ready</small></div>
          <div className={`dag-node node-scout ${facilityEvents.length >= 3 ? "done" : facilityEvents.length >= 2 ? "running" : "waiting"}`} data-arrow-node="dag-load"><span>02A</span><b>切断负载</b><small>并行分支</small></div>
          <div className={`dag-node node-engineer ${facilityEvents.length >= 4 ? "done" : facilityEvents.length >= 3 ? "running" : "waiting"}`} data-arrow-node="dag-generator"><span>02B</span><b>启动设备</b><small>并行分支</small></div>
          <div className={`dag-node node-route ${hasPatch ? "running" : sopDone ? "done" : "waiting"}`} data-arrow-node="dag-join"><span>03</span><b>{hasPatch ? "负载校准" : "汇合验收"}</b><small>{hasPatch ? "补救分支" : "JOIN"}</small></div>
          <div className={`dag-node node-join ${sopDone ? "done" : "waiting"}`} data-arrow-node="dag-power"><span>04</span><b>恢复关键设施</b><small>power.ready</small></div>
          <AnchoredArrows arrows={[
            { from: "dag-safety", to: "dag-load", label: "safety.ok", tone: "amber", labelSide: -1 },
            { from: "dag-safety", to: "dag-generator", label: "safety.ok", tone: "amber", labelSide: 1 },
            { from: "dag-load", to: "dag-join", label: "load.ready", tone: "amber", labelSide: -1 },
            { from: "dag-generator", to: "dag-join", label: "generator.ready", tone: "amber", labelSide: 1 },
            { from: "dag-join", to: "dag-power", label: "join.ready", tone: "amber", labelSide: -1 },
          ]} />
          <div className="sop-team">{cast.map((agent) => <MiniAgent key={agent.id} agent={agent} active={actor.id === agent.id || target?.id === agent.id} />)}</div>
          <div className="protocol-explain"><b>输出：power.ready</b><span>固定 SOP 按依赖解锁；节点失败时只进入预定义修复分支。</span></div>
        </div>
      )}
    </section>
  );
}
