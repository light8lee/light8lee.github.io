"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AgentContext } from "./components/AgentContext";
import { CollaborationStage, SceneLens } from "./components/CollaborationStage";
import { AgentSprite } from "./components/CityMap";
import { useSceneAudio } from "./hooks/useSceneAudio";
import { ScenarioKey, SimulationRun, createRun, makeRandomSeed, scenarioLabels, sceneAgentIds, sceneLabels } from "./lib/simulation";

const speedOptions = [0.5, 0.75, 1, 1.5, 2];
const EVENT_HOLD_MS = 3200;

function formatClock(seconds: number) {
  const hours = Math.floor(seconds / 3600) + 14;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default function Home() {
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.75);
  const [scenario, setScenario] = useState<ScenarioKey | "random">("random");
  const [customTask, setCustomTask] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [sceneLens, setSceneLens] = useState<SceneLens>("auto");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const launch = (nextScenario: ScenarioKey | "random" = scenario, seed?: string) => {
    const nextSeed = seed ?? makeRandomSeed();
    setRun(createRun(nextSeed, nextScenario, customTask.trim()));
    setCursor(0);
    setPlaying(true);
    setSelectedAgent(null);
    setSceneLens("auto");
    window.history.replaceState(null, "", `#seed=${encodeURIComponent(nextSeed)}`);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const seed = params.get("seed") || makeRandomSeed();
      setRun(createRun(seed, "random"));
      setPlaying(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!playing || !run) return;
    timerRef.current = setInterval(() => {
      setCursor((current) => {
        if (current >= run.events.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, EVENT_HOLD_MS / speed);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing, run, speed]);

  const currentEvent = run?.events[cursor] ?? null;
  const visibleEvents = useMemo(() => run?.events.slice(0, cursor + 1) ?? [], [run, cursor]);
  const activeAgent = run?.agents.find((agent) => agent.id === selectedAgent);
  const focusScene = sceneLens === "auto" ? currentEvent?.scene ?? "meeting" : sceneLens;
  const sceneSound = useSceneAudio(focusScene, run?.scenario.key ?? "storm", playing);

  if (!run || !currentEvent) return <main className="boot-screen">正在接通城市应急频道…</main>;
  const changeSceneLens = (lens: SceneLens) => {
    setSelectedAgent(null);
    if (lens === "auto") {
      setSceneLens("auto");
      return;
    }
    const sceneStart = run.events.findIndex((event) => event.scene === lens);
    if (sceneStart >= 0) setCursor(sceneStart);
    setSceneLens(lens);
    setPlaying(false);
  };
  const returnToTimeline = () => {
    setSceneLens("auto");
    setSelectedAgent(null);
  };
  const progress = ((cursor + 1) / run.events.length) * 100;
  const currentAct = currentEvent.eventName === "incident.resolved" ? 6 : ({ meeting: 1, command: 2, warehouse: 3, facility: 4, hospital: 5 } as const)[currentEvent.scene];
  const actGoals = ["形成预案", "拆解与派单", "分拣并出库", "执行应急 SOP", "升级专家并完成手术", "汇总并解除风险"];
  const sceneAgents = sceneAgentIds[focusScene].map((id) => run.agents.find((agent) => agent.id === id)).filter(Boolean);
  const shownEvent = sceneLens === "auto" ? currentEvent : [...visibleEvents].reverse().find((event) => event.scene === focusScene) ?? currentEvent;

  const selectAgent = (id: string) => {
    setSelectedAgent(id);
    setPlaying(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div><p className="eyebrow">FIELD DESK · INTERACTIVE SIMULATION</p><h1>小城应急局</h1></div>
        </div>
        <div className="city-status"><span className="live-dot" /> 城市频道在线<span className="status-divider" /><span>第 {run.day} 值班日</span></div>
        <div className="topbar-actions">
          <a className="return-to-desk" href="/" title="返回案头">← 案头</a>
          <button className="seed-button" onClick={() => navigator.clipboard?.writeText(window.location.href)} title="复制本局链接">SEED / {run.seed} <span>↗</span></button>
        </div>
      </header>

      <section className="mission-strip">
        <div className="mission-number">事件 {run.caseNumber}</div>
        <div className="mission-copy"><p>{run.scenario.kicker}</p><h2>{run.scenario.title}</h2><span>{run.scenario.brief}</span></div>
        <div className={`weather-badge weather-${run.scenario.weatherTone}`}><b>{run.scenario.weatherIcon}</b><span>{run.scenario.weather}<small>{run.scenario.temperature}</small></span></div>
        <div className="deadline-card"><span>处置时限</span><strong>{run.scenario.deadline} 分钟</strong><i style={{ width: `${Math.min(100, (cursor / run.events.length) * 100)}%` }} /></div>
      </section>

      <section className="workspace">
        <div className="world-panel">
          <div className="story-compass">
            <div className="act-badge"><span>当前主线</span><b>第 {currentAct} 幕 / 6</b></div>
            <div className="story-location"><p>你现在位于</p><h3>{sceneLabels[focusScene]}</h3><span>{sceneLens === "auto" ? actGoals[currentAct - 1] : "已定位到本场景起点"}</span></div>
            <div className="story-output"><span>{sceneLens === "auto" ? "正在处理" : "本场景起始事件"}</span><b>{shownEvent.eventName}</b><small>{shownEvent.title}</small></div>
            <button className={`sound-toggle ${sceneSound.audible ? "active" : ""} ${sceneSound.enabled && !playing ? "suspended" : ""}`} onClick={sceneSound.toggle} aria-label={sceneSound.enabled ? "关闭场景声音" : "开启场景声音"}>
              <i>{sceneSound.audible ? "◖))" : "◖×"}</i><span>{sceneSound.audible ? "场景声已开启" : sceneSound.enabled ? "播放暂停，声音已停止" : "开启场景声"}</span><small>{focusScene === "meeting" ? "钟点与纸张声" : focusScene === "command" ? "雨幕、无线电与警报" : focusScene === "warehouse" ? "机械节拍与倒车提示" : focusScene === "facility" ? "继电器与状态提示音" : "监护提示与器械声"}</small>
            </button>
          </div>

          <div className="mainline-rail" aria-label="任务主线">
            {actGoals.map((goal, index) => <div key={goal} className={`${index + 1 === currentAct ? "current" : ""} ${index + 1 < currentAct ? "done" : ""}`}><i>{index + 1 < currentAct ? "✓" : index + 1}</i><span>{goal}</span>{index < actGoals.length - 1 && <em>→</em>}</div>)}
          </div>

          <CollaborationStage key={focusScene} run={run} event={currentEvent} visibleEvents={visibleEvents} lens={sceneLens} onLensChange={changeSceneLens} />

          <div className="now-card" key={shownEvent.id}>
            <span className={`event-icon type-${shownEvent.kind}`}>{shownEvent.icon}</span>
            <div><p>{shownEvent.stage} · {formatClock(shownEvent.time)}</p><strong>{shownEvent.title}</strong><span>{shownEvent.detail}</span></div>
            <div className="now-tag">{shownEvent.protocol}</div>
          </div>

          <div className="agent-dock" aria-label="Agent 状态">
            {sceneAgents.map((agent) => {
              if (!agent) return null;
              const last = [...visibleEvents].reverse().find((event) => event.actor === agent.id);
              const isActive = currentEvent.actor === agent.id;
              return (
                <button key={agent.id} className={`agent-chip ${isActive ? "active" : ""} ${selectedAgent === agent.id ? "selected" : ""}`} onClick={() => selectAgent(agent.id)}>
                  <AgentSprite agent={agent} size="small" active={isActive} />
                  <span><b>{agent.name}<em>{agent.role}</em></b><small>{isActive ? "正在处理" : last ? last.status : "等待事件"}</small></span>
                  <i className={`agent-state ${isActive ? "busy" : ""}`} />
                </button>
              );
            })}
          </div>
        </div>

        <aside className={`ledger-panel ${activeAgent ? "show-context" : ""}`}>
          {activeAgent ? (
            <AgentContext agent={activeAgent} run={run} events={visibleEvents} currentEvent={currentEvent} onClose={() => setSelectedAgent(null)} />
          ) : (
            <>
              <div className="panel-heading ledger-heading">
                <div><p className="panel-kicker">TRAJECTORY / {String(cursor + 1).padStart(2, "0")}</p><h3>协作轨迹</h3></div>
                <span className="event-count">{visibleEvents.length}/{run.events.length}</span>
              </div>
              <div className="trajectory-hint">点击当前子场景中的人物，查看它此刻拥有的上下文</div>
              <div className="trajectory" aria-live="polite">
                {visibleEvents.map((event, index) => {
                  const from = run.agents.find((agent) => agent.id === event.actor)?.name ?? "系统";
                  const to = run.agents.find((agent) => agent.id === event.target)?.name;
                  return (
                    <button key={event.id} className={`trajectory-row ${index === cursor ? "current" : ""}`} onClick={() => { setCursor(index); setPlaying(false); returnToTimeline(); }}>
                      <span className="timeline-time">{formatClock(event.time)}</span>
                      <span className={`timeline-node type-${event.kind}`}>{event.icon}</span>
                      <span className="timeline-copy"><b>{event.title}</b><small><em>{sceneLabels[event.scene]} · {from}{to ? ` → ${to}` : ""}</em>{event.summary}</small></span>
                      <span className="timeline-protocol">{event.protocol}</span>
                    </button>
                  );
                })}
              </div>
              <div className="trajectory-key">
                <span><i className="key-supervisor" />委派</span><span><i className="key-meeting" />会议</span><span><i className="key-bus" />事件</span><span><i className="key-dag" />执行</span><span><i className="key-handoff" />交接</span>
              </div>
            </>
          )}
        </aside>
      </section>

      <section className="control-deck">
        <div className="scenario-control">
          <label htmlFor="scenario">任务来源</label>
          <select id="scenario" value={scenario} onChange={(event) => setScenario(event.target.value as ScenarioKey | "random")}>
            <option value="random">🎲 系统随机派单</option>
            {(Object.keys(scenarioLabels) as ScenarioKey[]).map((key) => <option key={key} value={key}>{scenarioLabels[key]}</option>)}
          </select>
          <input value={customTask} onChange={(event) => setCustomTask(event.target.value)} placeholder="也可以补充一句现场要求…" aria-label="自定义现场要求" />
          <button className="primary-action" onClick={() => launch()}>生成新事件</button>
        </div>
        <div className="playback-control">
          <button onClick={() => { setCursor(0); setPlaying(false); returnToTimeline(); }} aria-label="回到开始">↤</button>
          <button onClick={() => { setCursor((value) => Math.max(0, value - 1)); setPlaying(false); returnToTimeline(); }} aria-label="上一步">‹</button>
          <button className="play-button" onClick={() => { if (cursor === run.events.length - 1) setCursor(0); returnToTimeline(); setPlaying((value) => !value); }} aria-label={playing ? "暂停" : "播放"}>{playing ? "Ⅱ" : "▶"}</button>
          <button onClick={() => { setCursor((value) => Math.min(run.events.length - 1, value + 1)); setPlaying(false); returnToTimeline(); }} aria-label="下一步">›</button>
          <div className="scrubber"><span style={{ width: `${progress}%` }} /><input type="range" min="0" max={run.events.length - 1} value={cursor} onChange={(event) => { setCursor(Number(event.target.value)); setPlaying(false); returnToTimeline(); }} aria-label="轨迹时间轴" /></div>
          <button className="speed-button" onClick={() => setSpeed(speedOptions[(speedOptions.indexOf(speed) + 1) % speedOptions.length])}>{speed}×</button>
          <button className="replay-button" onClick={() => launch(run.scenario.key, run.seed)}>重跑本局</button>
        </div>
      </section>

      <footer><span>SIMULATION {run.version}</span><span>同一个 Seed 会复现同一条因果轨迹</span><span>本局包含 {run.events.filter((event) => event.kind === "incident").length} 个动态分支</span></footer>
    </main>
  );
}
