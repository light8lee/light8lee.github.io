import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = path.join(projectRoot, "dist", "client");
const serverEntry = path.join(projectRoot, "dist", "server", "index.js");
const basePath = "/projects/agent-town";

const { default: worker } = await import(
  `${pathToFileURL(serverEntry).href}?export=${Date.now()}`
);
const response = await worker.fetch(
  new Request("http://localhost/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) {
  throw new Error(`Static render failed with status ${response.status}`);
}

const assetsTarget = path.join(projectRoot, "assets");
await rm(assetsTarget, { recursive: true, force: true });
await mkdir(assetsTarget, { recursive: true });
await cp(path.join(clientDir, "assets"), assetsTarget, { recursive: true });
await cp(path.join(clientDir, "favicon.svg"), path.join(projectRoot, "favicon.svg"));

for (const filename of await readdir(assetsTarget)) {
  if (!filename.endsWith(".js")) continue;
  const bundlePath = path.join(assetsTarget, filename);
  const bundle = await readFile(bundlePath, "utf8");
  const rebasedBundle = bundle.replaceAll(
    '"assets/',
    `"${basePath.slice(1)}/assets/`,
  );
  if (rebasedBundle !== bundle) {
    await writeFile(bundlePath, rebasedBundle, "utf8");
  }
}

const html = (await response.text())
  .replaceAll("/assets/", `${basePath}/assets/`)
  .replaceAll("/favicon.svg", `${basePath}/favicon.svg`);

await writeFile(path.join(projectRoot, "index.html"), html, "utf8");

const manifest = JSON.parse(
  await readFile(path.join(clientDir, ".vite", "manifest.json"), "utf8"),
);
console.log(
  `Exported Agent Town for ${basePath}/ (${Object.keys(manifest).length} bundles).`,
);
