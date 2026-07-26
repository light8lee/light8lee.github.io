import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Agent Town shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Pixel Multi-Agent Simulation/i);
  assert.match(html, /<title>.*Pixel Multi-Agent Simulation.*<\/title>/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/);
});

test("connects four city scenes through a deterministic event trajectory", async () => {
  const [simulation, page, contextPanel, collaborationStage, anchoredArrows, sceneAudio, packageJson] = await Promise.all([
    readFile(new URL("../app/lib/simulation.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AgentContext.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/CollaborationStage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/AnchoredArrows.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/hooks/useSceneAudio.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(simulation, /seededRandom/);
  assert.match(simulation, /meeting/);
  assert.match(simulation, /command/);
  assert.match(simulation, /warehouse/);
  assert.match(simulation, /facility/);
  assert.match(simulation, /emergency-plan\.ready/);
  assert.match(simulation, /supply\.request/);
  assert.match(simulation, /supplies\.ready/);
  assert.match(simulation, /power\.ready/);
  assert.match(simulation, /incident\.resolved/);
  assert.match(simulation, /target: "lu"/);
  assert.match(simulation, /target: "qiao"/);
  assert.match(page, /CollaborationStage/);
  assert.match(page, /findIndex\(\(event\) => event\.scene === lens\)/);
  assert.match(page, /onLensChange=\{changeSceneLens\}/);
  assert.match(page, /returnToTimeline\(\)/);
  assert.match(page, /已定位到本场景起点/);
  assert.match(contextPanel, /INBOX/);
  assert.match(contextPanel, /OUTBOX/);
  assert.match(contextPanel, /CONTEXT SCOPE/);
  assert.match(collaborationStage, /scene-route/);
  assert.match(collaborationStage, /mode-banner/);
  assert.match(collaborationStage, /主管委派与结果回传/);
  assert.match(collaborationStage, /事件发布与订阅消费/);
  assert.match(collaborationStage, /warehouse-event-ticker/);
  assert.match(collaborationStage, /inventory\.mismatch/);
  assert.match(collaborationStage, /facility-canvas/);
  assert.match(collaborationStage, /data-arrow-node/);
  assert.match(anchoredArrows, /ResizeObserver/);
  assert.match(anchoredArrows, /edgePoint/);
  assert.match(sceneAudio, /AudioContext/);
  assert.match(sceneAudio, /!enabled \|\| !active/);
  assert.match(sceneAudio, /context\.close/);
  assert.doesNotMatch(sceneAudio, /\bhum\s*\(/);
  assert.match(sceneAudio, /继电器|tone\(1040/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
