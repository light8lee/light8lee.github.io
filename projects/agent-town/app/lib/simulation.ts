export type ScenarioKey = "storm" | "blackout" | "festival";
export type SceneKey = "meeting" | "command" | "warehouse" | "facility";
export type EventKind = "system" | "meeting" | "delegate" | "message" | "incident" | "action" | "success";

export interface Agent {
  id: string;
  name: string;
  role: string;
  trait: string;
  specialty: string;
  confidence: number;
  color: string;
  accent: string;
  station: string;
}

export interface SimulationEvent {
  id: string;
  time: number;
  kind: EventKind;
  icon: string;
  stage: string;
  scene: SceneKey;
  protocol: string;
  eventName: string;
  actor: string;
  target?: string;
  location: string;
  title: string;
  detail: string;
  summary: string;
  payload: string;
  visibility: "private" | "room" | "city";
  status: string;
}

export interface Scenario {
  key: ScenarioKey;
  kicker: string;
  title: string;
  brief: string;
  weather: string;
  temperature: string;
  weatherIcon: string;
  weatherTone: string;
  deadline: number;
}

export interface SimulationRun {
  seed: string;
  version: string;
  day: number;
  caseNumber: string;
  score: number;
  scenario: Scenario;
  agents: Agent[];
  events: SimulationEvent[];
}

export const sceneLabels: Record<SceneKey, string> = {
  meeting: "城市会商室",
  command: "应急指挥中心",
  warehouse: "物资仓储中心",
  facility: "能源站 SOP",
};

export const sceneProtocols: Record<SceneKey, string> = {
  meeting: "GROUP CHAT",
  command: "SUPERVISOR",
  warehouse: "EVENT BUS",
  facility: "DAG SOP",
};

export const sceneAgentIds: Record<SceneKey, string[]> = {
  meeting: ["cheng", "zhou", "xu", "tang"],
  command: ["lin", "miao", "lu", "qiao"],
  warehouse: ["bo", "wu", "qi"],
  facility: ["lu", "han", "su"],
};

export const scenarioLabels: Record<ScenarioKey, string> = {
  storm: "🌧 暴雨应急",
  blackout: "⚡ 城市停电",
  festival: "🏮 活动保障",
};

const scenarioTemplates: Record<ScenarioKey, Omit<Scenario, "key">> = {
  storm: {
    kicker: "橙色预警 / 河道水位上升",
    title: "东岸暴雨应急响应",
    brief: "90 分钟内确认风险点、保障医院供电，并为受困街区建立安全通道。",
    weather: "强降雨", temperature: "23°C", weatherIcon: "☂", weatherTone: "rain", deadline: 90,
  },
  blackout: {
    kicker: "电网告警 / 三个街区离线",
    title: "城区大范围停电处置",
    brief: "定位故障、恢复关键设施，并在晚高峰前发布可信的供电安排。",
    weather: "闷热", temperature: "31°C", weatherIcon: "ϟ", weatherTone: "heat", deadline: 75,
  },
  festival: {
    kicker: "人流预警 / 开幕进入倒计时",
    title: "河灯节现场保障",
    brief: "协调人流、物资与临时电力，在开幕前排除拥堵和安全隐患。",
    weather: "多云", temperature: "26°C", weatherIcon: "☁", weatherTone: "cloud", deadline: 60,
  },
};

const scenarioFacts = {
  storm: {
    risk: "东岸桥水位可能超过警戒线",
    engineering: "医院备用供电只能维持关键负载",
    request: "40L 柴油、两台排水泵、防水布",
    trigger: "东岸雨量在十分钟内增长 28%",
    warehouseIssue: "柴油库存标签与台账不一致",
    facilityIssue: "备用发电机启动后负载达到 91%",
  },
  blackout: {
    risk: "南站馈线异常可能扩大停电范围",
    engineering: "急诊与通信必须优先恢复",
    request: "绝缘工具、备用电缆、移动电源",
    trigger: "三个街区同时触发电网保护",
    warehouseIssue: "备用电缆所在货架被临时物资遮挡",
    facilityIssue: "切换回路出现异常温升",
  },
  festival: {
    risk: "东门人流可能与补给路线发生冲突",
    engineering: "临时舞台和医疗点需要独立供电",
    request: "隔离栏、应急灯、移动电源",
    trigger: "东门人流升至安全阈值的 87%",
    warehouseIssue: "两批隔离栏使用了相同批次编号",
    facilityIssue: "医疗点回路在带载测试时跳闸",
  },
} satisfies Record<ScenarioKey, Record<string, string>>;

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) { hash ^= seed.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

function seededRandom(seed: string) {
  let state = hashSeed(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function choose<T>(random: () => number, values: T[]) { return values[Math.floor(random() * values.length)]; }

export function makeRandomSeed() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined") crypto.getRandomValues(bytes);
  else bytes.forEach((_, index) => { bytes[index] = Math.floor(Math.random() * 255); });
  return `CITY-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

function makeAgents(random: () => number): Agent[] {
  const traits = ["谨慎求证", "果断直接", "善于协商", "灵活变通", "专注流程", "关注异常"];
  return [
    ["lin", "林队", "Supervisor", "全局调度", "#ffcf66", "#7a431d", "hq"],
    ["miao", "淼", "Field Scout", "风险侦察", "#70d6c2", "#1e665d", "east"],
    ["lu", "陆工", "Engineer", "设施抢修", "#ff806c", "#7a2e35", "power"],
    ["qiao", "乔", "Logistics", "运输调度", "#7d9cff", "#283c7a", "depot"],
    ["cheng", "程议", "Moderator", "会议主持", "#f2c65e", "#6b4829", "meeting"],
    ["zhou", "周岚", "Risk Analyst", "风险推演", "#69c9ba", "#245f58", "meeting"],
    ["xu", "许衡", "Infra Planner", "设施预案", "#ef866b", "#713844", "meeting"],
    ["tang", "唐栩", "Resource Planner", "资源预案", "#829fec", "#34477b", "meeting"],
    ["bo", "柏仓", "Inventory Worker", "库存分拣", "#d493e7", "#65326e", "warehouse"],
    ["wu", "小伍", "Packing Worker", "物资打包", "#73c7a2", "#2d684f", "warehouse"],
    ["qi", "齐运", "Dispatch Worker", "出库运输", "#efa45e", "#754326", "warehouse"],
    ["han", "韩医", "Medical Operator", "关键负载确认", "#ec7994", "#76364d", "power"],
    ["su", "苏控", "Control Operator", "回路控制", "#62bacb", "#28596b", "power"],
  ].map(([id, name, role, specialty, color, accent, station], index) => ({
    id, name, role, specialty, color, accent, station,
    trait: traits[(index + Math.floor(random() * traits.length)) % traits.length],
    confidence: 68 + Math.floor(random() * 27),
  }));
}

type EventInput = Omit<SimulationEvent, "id" | "time">;

export function createRun(seed: string, requested: ScenarioKey | "random" = "random", customTask = ""): SimulationRun {
  const random = seededRandom(seed);
  const keys: ScenarioKey[] = ["storm", "blackout", "festival"];
  const key = requested === "random" ? choose(random, keys) : requested;
  const scenario: Scenario = { key, ...scenarioTemplates[key] };
  const facts = scenarioFacts[key];
  const agents = makeAgents(random);
  const events: SimulationEvent[] = [];
  let elapsed = 0;
  const add = (event: EventInput, minutes = 4) => {
    elapsed += minutes * 60;
    events.push({ ...event, id: `evt-${String(events.length + 1).padStart(3, "0")}`, time: elapsed });
  };

  // Scene 1: the plan is formed in a moderated meeting before the emergency.
  add({ kind: "system", icon: "○", stage: "预案准备", scene: "meeting", protocol: "GROUP CHAT", eventName: "agenda.opened", actor: "cheng", target: "zhou", location: "meeting", title: "程议打开风险会商", detail: customTask || `围绕“${scenario.title}”形成一份可执行预案，每人只提交一个最高优先级风险。`, summary: "会商议题与发言规则写入房间共享上下文。", payload: `goal=${scenario.brief}`, visibility: "room", status: "主持中" }, 0);
  add({ kind: "meeting", icon: "◉", stage: "风险陈述", scene: "meeting", protocol: "GROUP CHAT", eventName: "meeting.turn", actor: "zhou", target: "xu", location: "meeting", title: "周岚提交现场风险", detail: facts.risk, summary: `共享记忆新增：${facts.risk}。`, payload: `risk=${facts.risk}`, visibility: "room", status: "已发言" }, 4);
  add({ kind: "meeting", icon: "◉", stage: "风险陈述", scene: "meeting", protocol: "GROUP CHAT", eventName: "meeting.turn", actor: "xu", target: "tang", location: "meeting", title: "许衡补充设施约束", detail: facts.engineering, summary: `共享记忆新增：${facts.engineering}。`, payload: `constraint=${facts.engineering}`, visibility: "room", status: "已发言" }, 3);
  add({ kind: "message", icon: "✓", stage: "形成共识", scene: "meeting", protocol: "GROUP CHAT", eventName: "emergency-plan.ready", actor: "cheng", target: "tang", location: "meeting", title: "程议冻结应急预案 v1", detail: "团队同意先确认风险，再保障关键设施，资源不足时由指挥中心动态重排优先级。", summary: "会议输出 emergency-plan.ready，进入城市共享状态。", payload: "plan=侦察→调度→物资→设施SOP", visibility: "city", status: "预案完成" }, 5);

  // Scene 2: the supervisor takes over when the world event happens.
  add({ kind: "incident", icon: "!", stage: "事件触发", scene: "command", protocol: "SUPERVISOR", eventName: "incident.detected", actor: "lin", location: "hq", title: "城市预警正式触发", detail: facts.trigger, summary: "指挥中心读取预案并创建本次事件的全局任务。", payload: `incident=${facts.trigger}`, visibility: "city", status: "接管中" }, 6);
  add({ kind: "delegate", icon: "→", stage: "任务拆解", scene: "command", protocol: "SUPERVISOR", eventName: "task.delegated", actor: "lin", target: "miao", location: "hq", title: "林队下发现场确认任务", detail: "淼负责验证风险，陆工准备设施 SOP，乔保持运输待命。", summary: "Supervisor 将目标拆成三个有依赖关系的子任务。", payload: "task=scout.risk; priority=high", visibility: "private", status: "已委派" }, 3);
  add({ kind: "message", icon: "←", stage: "结果回传", scene: "command", protocol: "SUPERVISOR", eventName: "task.result", actor: "miao", target: "lin", location: "east", title: "现场风险得到确认", detail: facts.risk, summary: "侦察结果回到主管上下文，资源请求条件满足。", payload: "result=confirmed; confidence=0.86", visibility: "private", status: "已回传" }, 7);
  add({ kind: "delegate", icon: "→", stage: "设施派单", scene: "command", protocol: "SUPERVISOR", eventName: "task.delegated", actor: "lin", target: "lu", location: "hq", title: "林队委派设施预案检查", detail: "陆工核对能源站 SOP、关键负载与备用设备条件，并将可执行性结论回传。", summary: "第二条任务线从 Supervisor 发往设施 Agent。", payload: "task=facility.sop-check; depends_on=scout.risk", visibility: "private", status: "已委派" }, 3);
  add({ kind: "message", icon: "←", stage: "设施回传", scene: "command", protocol: "SUPERVISOR", eventName: "task.result", actor: "lu", target: "lin", location: "power", title: "陆工确认能源站 SOP 可执行", detail: facts.engineering, summary: "设施约束进入主管上下文，物资清单可以据此冻结。", payload: "result=sop-ready; critical_load=verified", visibility: "private", status: "已回传" }, 6);
  add({ kind: "delegate", icon: "→", stage: "运输派单", scene: "command", protocol: "SUPERVISOR", eventName: "task.delegated", actor: "lin", target: "qiao", location: "hq", title: "林队委派运输路线预排", detail: "乔核对仓储中心到能源站的运输窗口、道路限制和备用路线。", summary: "第三条任务线从 Supervisor 发往运输 Agent。", payload: "task=logistics.route-plan; depends_on=facility.sop-check", visibility: "private", status: "已委派" }, 3);
  add({ kind: "message", icon: "←", stage: "运输回传", scene: "command", protocol: "SUPERVISOR", eventName: "task.result", actor: "qiao", target: "lin", location: "warehouse", title: "乔确认物资运输窗口", detail: "主路线可用，备用路线已经登记，仓储出库后可直接接驳能源站。", summary: "三位执行 Agent 均已完成一次委派与回传。", payload: "result=route-ready; fallback=registered", visibility: "private", status: "已回传" }, 5);
  add({ kind: "delegate", icon: "↗", stage: "跨场景派单", scene: "command", protocol: "SUPERVISOR", eventName: "supply.request", actor: "lin", location: "hq", title: "发布城市物资请求", detail: facts.request, summary: "指挥中心只描述所需资源，不指定具体仓储工人。", payload: `items=${facts.request}; deadline=${scenario.deadline - 25}m`, visibility: "city", status: "已发布" }, 3);

  // Scene 3: warehouse workers consume events without knowing the whole plan.
  add({ kind: "message", icon: "≋", stage: "事件入站", scene: "warehouse", protocol: "EVENT BUS", eventName: "supply.request", actor: "lin", location: "warehouse", title: "物资请求进入仓储总线", detail: facts.request, summary: "分拣、库存和运输工作站分别检查订阅条件。", payload: `topic=supply.request; items=${facts.request}`, visibility: "city", status: "广播中" }, 4);
  add({ kind: "action", icon: "◆", stage: "订阅消费", scene: "warehouse", protocol: "EVENT BUS", eventName: "inventory.consume", actor: "bo", location: "warehouse", title: "柏消费库存检查事件", detail: "分拣工只读取物资清单与截止时间，不读取医院的完整应急计划。", summary: "inventory worker 接收匹配事件并锁定对应货架。", payload: `subscribed=supply.request; filter=inventory`, visibility: "private", status: "分拣中" }, 4);
  add({ kind: "incident", icon: "!", stage: "仓储异常", scene: "warehouse", protocol: "EVENT BUS", eventName: "inventory.mismatch", actor: "bo", location: "warehouse", title: facts.warehouseIssue, detail: "工作站将异常重新发布到事件总线，自己不决定是否延误总任务。", summary: "inventory.mismatch 等待任意有能力的订阅者处理。", payload: "severity=medium; retry=0", visibility: "city", status: "等待处理" }, 4);
  const warehouseFast = random() > 0.42;
  add({ kind: "action", icon: "↻", stage: "松耦合处理", scene: "warehouse", protocol: "EVENT BUS", eventName: "inventory.reconciled", actor: "qi", target: "bo", location: "warehouse", title: warehouseFast ? "齐运根据运输台账完成核对" : "齐运启用备用物资批次", detail: warehouseFast ? "运输工作站恰好订阅库存异常，利用出库记录修正了标签。" : "原批次无法及时核对，运输工作站切换到安全的备用批次。", summary: "异常由另一个订阅者处理，原发布者无需知道处理者是谁。", payload: warehouseFast ? "resolution=ledger_match" : "resolution=fallback_batch", visibility: "city", status: "异常已消除" }, 5);
  add({ kind: "action", icon: "□", stage: "打包完成", scene: "warehouse", protocol: "EVENT BUS", eventName: "packing.completed", actor: "wu", target: "qi", location: "warehouse", title: "小伍完成物资打包", detail: facts.request, summary: "packing.completed 被运输工作站消费。", payload: "status=packed", visibility: "room", status: "已打包" }, 3);
  add({ kind: "success", icon: "□", stage: "仓储出站", scene: "warehouse", protocol: "EVENT BUS", eventName: "supplies.ready", actor: "qi", target: "lu", location: "warehouse", title: "齐运将物资包送往能源站", detail: facts.request, summary: "仓储中心输出 supplies.ready，能源站 SOP 的前置条件被满足。", payload: "status=ready; destination=facility", visibility: "city", status: "已出库" }, 5);

  // Scene 4: a fixed emergency SOP runs as a DAG.
  add({ kind: "system", icon: "◇", stage: "SOP 解锁", scene: "facility", protocol: "DAG SOP", eventName: "dag.started", actor: "lu", location: "power", title: "能源站加载固定应急 SOP", detail: "supplies.ready 已到达，安全检查和设备准备节点可以启动。", summary: "DAG 读取跨场景事件并解锁前置节点。", payload: "input=supplies.ready", visibility: "room", status: "SOP 运行中" }, 4);
  add({ kind: "action", icon: "◆", stage: "节点 01", scene: "facility", protocol: "DAG SOP", eventName: "dag.node.completed", actor: "han", target: "su", location: "power", title: "韩医确认关键负载清单", detail: "确认急诊、通信和排水设备优先级，两个并行节点被解锁。", summary: "node.safety 完成，node.load 与 node.generator 并行启动。", payload: "node=safety; status=completed", visibility: "room", status: "节点完成" }, 4);
  add({ kind: "action", icon: "◆", stage: "并行节点 02A", scene: "facility", protocol: "DAG SOP", eventName: "dag.node.running", actor: "su", target: "lu", location: "power", title: "苏控切断非关键负载", detail: "急诊、通信和排水设备保留，办公与景观回路暂时卸载。", summary: "node.load 正在执行，等待并行节点 02B。", payload: "node=load; mode=parallel", visibility: "room", status: "执行中" }, 4);
  add({ kind: "action", icon: "◆", stage: "并行节点 02B", scene: "facility", protocol: "DAG SOP", eventName: "dag.node.running", actor: "lu", target: "su", location: "power", title: "陆工启动备用设备", detail: "物资已经交接，工程 Agent 按 SOP 执行启动步骤。", summary: "node.generator 完成，两个并行分支进入汇合检查。", payload: "node=generator; mode=parallel", visibility: "room", status: "节点完成" }, 4);
  const facilityPatch = random() > 0.46;
  if (facilityPatch) add({ kind: "incident", icon: "ϟ", stage: "异常分支", scene: "facility", protocol: "DAG SOP", eventName: "dag.node.failed", actor: "lu", location: "power", title: facts.facilityIssue, detail: "汇合条件未满足，DAG 自动插入负载校准修复节点。", summary: "固定 SOP 根据失败类型进入预定义补救分支。", payload: "node=join; status=blocked", visibility: "room", status: "节点阻塞" }, 3);
  if (facilityPatch) add({ kind: "action", icon: "⚒", stage: "修复节点", scene: "facility", protocol: "DAG SOP", eventName: "dag.patch.completed", actor: "lu", location: "power", title: "完成负载校准并重新验收", detail: "修复节点通过，原有汇合节点重新进入可执行状态。", summary: "patch.calibrate 完成，DAG 回到主路径。", payload: "patch=calibrate; status=completed", visibility: "room", status: "修复完成" }, 5);
  add({ kind: "success", icon: "✓", stage: "结果汇合", scene: "facility", protocol: "DAG SOP", eventName: "power.ready", actor: "lu", target: "lin", location: "power", title: "能源站 SOP 全部节点通过", detail: "关键设施恢复稳定运行，power.ready 被发布到城市共享状态。", summary: "DAG 输出 power.ready，指挥中心收到终止条件。", payload: "status=ready; critical_load=stable", visibility: "city", status: "SOP 完成" }, 5);

  const score = 78 + Math.floor(random() * 19);
  add({ kind: "success", icon: "✓", stage: "全局收束", scene: "command", protocol: "SUPERVISOR", eventName: "incident.resolved", actor: "lin", location: "hq", title: "指挥中心解除城市风险", detail: `预案、物资和设施三条结果已经汇总，本局协作评分 ${score}/100。`, summary: "Supervisor 检查终止条件并关闭本次事件。", payload: `resolved=true; score=${score}`, visibility: "city", status: "已完成" }, 5);

  return { seed, version: "v0.2.0", day: 100 + Math.floor(random() * 899), caseNumber: String(1000 + Math.floor(random() * 8999)), score, scenario, agents, events };
}
