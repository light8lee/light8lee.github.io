import { Agent, SimulationEvent, SimulationRun } from "../lib/simulation";

export function AgentSprite({ agent, size = "medium", active = false }: { agent: Agent; size?: "small" | "medium"; active?: boolean }) {
  return (
    <span className={`pixel-person pixel-person-${size} ${active ? "is-active" : ""}`} style={{ "--agent-color": agent.color, "--agent-accent": agent.accent } as React.CSSProperties} aria-hidden="true">
      <i className="pixel-hair" /><i className="pixel-face" /><i className="pixel-body" /><i className="pixel-feet" />
    </span>
  );
}

const stationPosition: Record<string, string> = {
  hq: "pos-hq",
  meeting: "pos-meeting",
  east: "pos-east",
  power: "pos-power",
  depot: "pos-depot",
  warehouse: "pos-warehouse",
  bridge: "pos-bridge",
  south: "pos-south",
};

const stationPoint: Record<string, { x: number; y: number }> = {
  hq: { x: 25, y: 43 },
  meeting: { x: 38, y: 31 },
  east: { x: 79, y: 43 },
  power: { x: 63, y: 38 },
  depot: { x: 62, y: 82 },
  warehouse: { x: 69, y: 78 },
  bridge: { x: 78, y: 65 },
  south: { x: 38, y: 84 },
};

function currentPosition(agent: Agent, event: SimulationEvent) {
  if (event.actor === agent.id) return stationPosition[event.location] ?? stationPosition[agent.station];
  if (event.target === agent.id && event.protocol === "GROUP CHAT") return stationPosition.meeting;
  return stationPosition[agent.station];
}

function currentPoint(agent: Agent, event: SimulationEvent) {
  if (event.actor === agent.id) return stationPoint[event.location] ?? stationPoint[agent.station];
  if (event.target === agent.id && event.protocol === "GROUP CHAT") return stationPoint.meeting;
  return stationPoint[agent.station];
}

function CollaborationLink({ run, event }: { run: SimulationRun; event: SimulationEvent }) {
  if (!event.target || event.protocol === "EVENT BUS" || event.protocol === "GROUP CHAT") return null;
  const actor = run.agents.find((agent) => agent.id === event.actor);
  const target = run.agents.find((agent) => agent.id === event.target);
  if (!actor || !target) return null;
  const from = currentPoint(actor, event);
  const to = currentPoint(target, event);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const width = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  return (
    <div
      className={`collaboration-link link-${event.kind}`}
      style={{ left: `${from.x}%`, top: `${from.y}%`, width: `${width}%`, transform: `rotate(${angle}deg)`, "--inverse-angle": `${-angle}deg` } as React.CSSProperties}
      aria-hidden="true"
    >
      <span>{event.title}</span><i />
    </div>
  );
}

export function CityMap({ run, event, onSelectAgent, selectedAgent }: { run: SimulationRun; event: SimulationEvent; onSelectAgent: (id: string) => void; selectedAgent: string | null }) {
  return (
    <div className={`city-map scene-${run.scenario.key} active-scene-${event.scene}`}>
      <div className="rain-layer" aria-hidden="true" />
      <div className="river"><span /><span /><span /></div>
      <div className="road road-horizontal" />
      <div className="road road-vertical" />
      <div className="crosswalk" />

      <div className={`building building-hq ${event.scene === "command" ? "scene-building-active" : ""}`}><span className="antenna" /><b>应急局</b><i>SUPERVISOR</i><em className="window-grid" /></div>
      <div className={`building building-power ${event.scene === "facility" ? "scene-building-active" : ""}`}><span className="chimney" /><b>能源站</b><i>DAG SOP</i><em className="power-bolt">ϟ</em></div>
      <div className="building building-hospital"><span className="hospital-sign">＋</span><b>市立医院</b><i>HOSPITAL</i></div>
      <div className={`building building-depot ${event.scene === "warehouse" ? "scene-building-active" : ""}`}><span className="garage" /><b>物资仓</b><i>EVENT BUS</i></div>
      <div className={`meeting-room ${event.scene === "meeting" ? "scene-building-active" : ""}`}><b>会商室</b><small>GROUP CHAT</small><span /><span /><span /></div>
      <div className="bridge"><i /><i /><i /><i /></div>
      <div className="tree tree-one" /><div className="tree tree-two" /><div className="tree tree-three" />
      <div className="warning-sign">!</div>

      <CollaborationLink run={run} event={event} />

      {event.protocol === "EVENT BUS" && (
        <div className="map-event-bus" aria-hidden="true"><b>EVENT BUS</b><span>{event.title}</span><i /><i /><i /></div>
      )}

      {event.protocol === "GROUP CHAT" && (
        <div className="map-meeting-focus" aria-hidden="true"><span>当前发言</span><b>{run.agents.find((agent) => agent.id === event.actor)?.name}</b></div>
      )}

      {event.target && (
        <div className={`message-packet packet-to-${event.location}`} key={event.id}>
          <span>{event.kind === "message" ? "✉" : event.icon}</span>
        </div>
      )}

      {run.agents.map((agent) => (
        <button
          key={agent.id}
          className={`map-agent ${currentPosition(agent, event)} ${event.actor === agent.id ? "active" : ""} ${selectedAgent === agent.id ? "selected" : ""}`}
          onClick={() => onSelectAgent(agent.id)}
          aria-label={`${agent.name}，${agent.role}`}
        >
          <span className="agent-label">{agent.name}</span>
          <AgentSprite agent={agent} active={event.actor === agent.id} />
          {event.actor === agent.id && <span className="agent-bubble">{event.icon}</span>}
        </button>
      ))}

      <div className="map-coordinate">E-17 / {event.scene.toUpperCase()} / LIVE</div>
    </div>
  );
}
