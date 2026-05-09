#!/usr/bin/env node

const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { spawn } = require("child_process");

const {
  CHART_BINDINGS,
  CHART_TYPES,
  componentRegistry,
  getChannel,
  viewPresets,
} = require("../lib/channel-registry");

const ROOT = path.resolve(__dirname, "..");
const ARTIFACT_ROOT = path.join(ROOT, "artifacts", "launch-qa");
const SCREENSHOT_DIR = path.join(ARTIFACT_ROOT, "screenshots");
const REPORT_PATH = path.join(ARTIFACT_ROOT, "launch-qa-report.json");

const FOCUSED_PROMPTS = [
  { channelId: "crypto-trading", prompt: "BTC three months", slug: "btc-three-months" },
  { channelId: "crypto-trading", prompt: "Compare BTC and ETH over the last week", slug: "btc-eth-week" },
  { channelId: "crypto-trading", prompt: "Show liquidity and depth around BTC right now", slug: "btc-depth" },
  { channelId: "polyrec", prompt: "Show the weirdest active markets", slug: "weirdest-markets" },
  { channelId: "polyrec", prompt: "Find markets with high volume and close odds", slug: "close-odds-volume" },
  { channelId: "polyrec", prompt: "Build a live board for election and macro markets", slug: "election-macro" },
  { channelId: "meme-coin", prompt: "Find the fastest moving meme coins", slug: "fastest-moving" },
  { channelId: "meme-coin", prompt: "Show attention vs liquidity risk", slug: "attention-liquidity" },
  { channelId: "meme-coin", prompt: "Build a board for tokens that look viral but fragile", slug: "viral-fragile" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000, mobile: false, scale: 1 },
  { name: "mobile", width: 390, height: 844, mobile: true, scale: 1 },
];

const REQUIRED_FULL_EVENTS = [
  "prompt_clicked",
  "prompt_submitted",
  "channel_morphed",
  "share_created",
  "share_opened",
  "share_replayed",
  "share_forked",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function assertQa(condition, message, evidence = {}) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

function failListFromError(error) {
  return {
    message: error.message || String(error),
    evidence: error.evidence || {},
    stack: error.stack || "",
  };
}

function safeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

async function findOpenPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForHttpJson(url, timeoutMs = 15000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return response.json();
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(180);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "no response"}`);
}

async function jsonFetch(baseUrl, pathname, options = {}) {
  const response = await fetch(new URL(pathname, baseUrl), {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  assertQa(response.ok && payload.ok !== false, `${options.method || "GET"} ${pathname} failed`, {
    status: response.status,
    payload,
  });
  return payload;
}

async function textFetch(baseUrl, pathname) {
  const response = await fetch(new URL(pathname, baseUrl), { headers: { Accept: "text/html" } });
  const text = await response.text();
  assertQa(response.ok, `GET ${pathname} failed`, { status: response.status, text: text.slice(0, 240) });
  return text;
}

async function startManagedServer() {
  if (process.env.QA_BASE_URL) {
    return {
      baseUrl: process.env.QA_BASE_URL.replace(/\/+$/, "/"),
      cleanup: async () => {},
      external: true,
      dataDir: null,
    };
  }

  const port = await findOpenPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "katechon-launch-qa-"));
  const env = {
    ...process.env,
    PORT: String(port),
    DASHBOARD_OVERRIDES_FILE: path.join(dataDir, "dashboard-overrides.json"),
    CHANNEL_SESSIONS_FILE: path.join(dataDir, "channel-sessions.json"),
    CHANNEL_SHARES_FILE: path.join(dataDir, "channel-shares.json"),
    USER_DB_FILE: path.join(dataDir, "users.json"),
    LIVE_API_TIMEOUT_MS: process.env.LIVE_API_TIMEOUT_MS || "1",
    EIA_API_TIMEOUT_MS: process.env.EIA_API_TIMEOUT_MS || "1",
    EXTERNAL_DASHBOARD_UPSTREAMS: "0",
    STREAM_AUDIO_ENABLED: "0",
    DASHBOARD_NARRATION_TTS: "0",
  };
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const baseUrl = `http://127.0.0.1:${port}/`;
  try {
    await waitForHttpJson(new URL("/api/channels", baseUrl), 20000);
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`Could not start QA server: ${error.message}\n${output.slice(-2000)}`);
  }

  return {
    baseUrl,
    cleanup: async () => {
      if (!child.killed) child.kill("SIGTERM");
      await sleep(250);
    },
    external: false,
    dataDir,
  };
}

function flattenGenerated(generated) {
  const slots = generated?.slots || {};
  const components = Object.values(slots).flatMap((entries) => Array.isArray(entries) ? entries : []);
  if (generated?.page) {
    components.push(...generatedStageComponents(generated), ...generatedRailComponents(generated));
  }
  const seen = new Set();
  return components.filter((component) => {
    const key = `${component?.id || ""}:${component?.type || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function generatedSlot(generated, slot) {
  return Array.isArray(generated?.slots?.[slot]) ? generated.slots[slot] : [];
}

function generatedStageComponents(generated) {
  if (generated?.mode === "generated_page" && Array.isArray(generated.page?.stage?.components)) {
    return generated.page.stage.components;
  }
  return generatedSlot(generated, "stageOverlay");
}

function generatedRailComponents(generated) {
  if (generated?.mode === "generated_page" && Array.isArray(generated.page?.rail)) {
    return generated.page.rail;
  }
  return generatedSlot(generated, "rail");
}

function chartHasRows(chart) {
  return Array.isArray(chart?.data) && chart.data.length > 0;
}

function textValues(component) {
  const values = [];
  for (const key of ["eyebrow", "title", "body", "value", "note", "variant"]) {
    if (component[key] !== undefined) values.push([key, String(component[key])]);
  }
  for (const key of ["metrics", "rows"]) {
    if (Array.isArray(component[key])) {
      component[key].forEach((row, rowIndex) => {
        if (Array.isArray(row)) row.forEach((value, colIndex) => values.push([`${key}.${rowIndex}.${colIndex}`, String(value)]));
      });
    }
  }
  if (Array.isArray(component.items)) {
    component.items.forEach((item, index) => values.push([`items.${index}`, String(item)]));
  }
  return values;
}

function validateComponent(component, context, report) {
  const registry = componentRegistry();
  assertQa(registry[component.type], "component has unsupported type", { context, type: component.type, id: component.id });
  assertQa(component.id && typeof component.id === "string", "component is missing stable id", { context, component });

  const text = textValues(component);
  assertQa(text.some(([, value]) => value.trim().length > 0), "component has no visible text payload", {
    context,
    id: component.id,
    type: component.type,
  });
  text.forEach(([key, value]) => {
    assertQa(value.trim().length > 0, "component text field is empty", { context, id: component.id, key });
    assertQa(value.length <= 320, "component text field is too long for launch surface", {
      context,
      id: component.id,
      key,
      length: value.length,
    });
  });

  assertQa(component.sourceState || (Array.isArray(component.provenanceIds) && component.provenanceIds.length), "component missing source/provenance state", {
    context,
    id: component.id,
    type: component.type,
  });

  if (component.type === "vega-chart") {
    assertQa(component.chart && typeof component.chart === "object", "vega-chart component is missing chart config", {
      context,
      id: component.id,
    });
    assertQa(CHART_TYPES.includes(component.chart.type), "vega-chart has unsupported chart type", {
      context,
      id: component.id,
      chartType: component.chart.type,
    });
    assertQa(CHART_BINDINGS.includes(component.chart.binding), "vega-chart has unsupported chart binding", {
      context,
      id: component.id,
      binding: component.chart.binding,
    });
    if (component.chart.binding === "none") {
      assertQa(chartHasRows(component.chart), "inline chart has no data rows", {
        context,
        id: component.id,
      });
    } else {
      assertQa(component.chart.query || component.chart.x || component.chart.y, "bound chart lacks query or axes", {
        context,
        id: component.id,
        chart: component.chart,
      });
    }
  }

  if (["data-table", "event-timeline", "source-confidence", "feed-stack"].includes(component.type)) {
    assertQa(Array.isArray(component.rows) && component.rows.length > 0, "board/table component has no rows", {
      context,
      id: component.id,
      type: component.type,
    });
  }

  if (component.type === "action-panel") {
    assertQa(Array.isArray(component.items) && component.items.length >= 2, "action panel has no forkable next prompts", {
      context,
      id: component.id,
    });
  }

  if (component.sourceState && ["synthetic_fallback", "unavailable"].includes(component.sourceState.sourceType)) {
    const sourceText = text.map(([, value]) => value).join(" ").toLowerCase();
    const sourceStateText = [
      component.sourceState.sourceType,
      component.sourceState.label,
      component.sourceState.provider,
      component.sourceState.fallbackReason,
    ].filter(Boolean).join(" ").toLowerCase();
    assertQa(/fallback|unavailable|synthetic|cached|source/.test(`${sourceStateText} ${sourceText}`), "fallback/unavailable state is not explicit in component source state", {
      context,
      id: component.id,
      sourceState: component.sourceState,
    });
    report.fallbackSeen = true;
  }
}

function validateGeneratedContract(item, payload, report) {
  const context = `${item.channelId}:${item.slug}`;
  const channel = getChannel(item.channelId);
  assertQa(channel, "focused channel is not registered", { channelId: item.channelId });
  assertQa(payload.ok === true, "turn payload is not ok", { context, payload });
  assertQa(payload.update && typeof payload.update === "object", "turn has no update object", { context });
  assertQa(payload.generated && typeof payload.generated === "object", "turn has no generated object", { context });
  assertQa(payload.update.layout?.template, "layout template is missing", { context, update: payload.update });
  assertQa(viewPresets()[payload.update.layout.template], "layout template is unsupported", {
    context,
    layout: payload.update.layout.template,
  });
  assertQa(payload.generated.view && payload.generated.view !== "default", "generated update did not declare an active layout mode", {
    context,
    generated: payload.generated,
  });

  const stage = generatedStageComponents(payload.generated);
  const rail = generatedRailComponents(payload.generated);
  assertQa(stage.length > 0, "stageOverlay has no generated components", { context, generated: payload.generated });
  assertQa(rail.length > 0, "rail has no generated components", { context, generated: payload.generated });
  if (payload.generated.mode === "generated_page") {
    const page = payload.generated.page;
    assertQa(page?.thesis?.title && page.thesis.summary, "generated_page thesis is incomplete", { context, page });
    assertQa(page?.layout?.template && page.layout.stage && page.layout.rail, "generated_page layout mode is incomplete", { context, page });
    assertQa(Array.isArray(page.actions) && page.actions.length >= 3, "generated_page state-specific next prompts are missing", { context, page });
    assertQa(page.sourceState || (Array.isArray(page.provenance) && page.provenance.length), "generated_page source/provenance state is missing", { context, page });
  }
  assertQa(payload.update.patch?.title && payload.update.patch.title !== channel.label, "generated update did not change page thesis/title", {
    context,
    patch: payload.update.patch,
  });
  assertQa(payload.update.patch?.visualLabel || payload.update.patch?.visualCopy, "generated update does not control the primary stage framing", {
    context,
    patch: payload.update.patch,
  });
  assertQa(Array.isArray(payload.state?.nextActions) && payload.state.nextActions.length >= 3, "state-specific next prompts are missing", {
    context,
    nextActions: payload.state?.nextActions,
  });
  assertQa(Array.isArray(payload.update.dataRequests) && payload.update.dataRequests.length > 0, "dataRequests are missing", {
    context,
    update: payload.update,
  });
  assertQa(payload.update.dataRequests.some((request) => request.capability === payload.intent?.capability), "dataRequests do not match parsed intent capability", {
    context,
    intent: payload.intent,
    dataRequests: payload.update.dataRequests,
  });
  assertQa(Array.isArray(payload.update.provenanceRecords) && payload.update.provenanceRecords.length > 0, "provenance records are missing", {
    context,
    update: payload.update,
  });

  const all = flattenGenerated(payload.generated);
  all.forEach((component) => validateComponent(component, context, report));

  const actionPanel = rail.find((component) => component.type === "action-panel");
  assertQa(actionPanel, "rail does not include an action panel for fork prompts", {
    context,
    railIds: rail.map((component) => component.id),
  });

  for (const component of all.filter((entry) => entry.type === "vega-chart" && entry.chart?.binding !== "none")) {
    const hints = payload.data?.bindingHints || [];
    assertQa(component.chart.query || hints.includes(component.chart.binding), "bound chart does not match data query/binding hints", {
      context,
      id: component.id,
      binding: component.chart.binding,
      hints,
      query: component.chart.query,
    });
  }
}

function stateSummaryFromShare(share) {
  return {
    channelId: share.channelId,
    layoutTemplate: share.layout?.template,
    headline: share.headline,
    prompt: share.prompt,
    stageIds: generatedStageComponents(share.generated).map((component) => component.id),
    railIds: generatedRailComponents(share.generated).map((component) => component.id),
    provenanceIds: (share.provenanceRecords || []).map((record) => record.id),
    sourceType: share.sourceState?.sourceType,
  };
}

function validateShareEquivalence(item, originalPayload, share, forkPayload) {
  const context = `${item.channelId}:${item.slug}`;
  const originalStage = generatedStageComponents(originalPayload.generated);
  const originalRail = generatedRailComponents(originalPayload.generated);
  const shareStage = generatedStageComponents(share.generated);
  const shareRail = generatedRailComponents(share.generated);
  assertQa(share.channelId === item.channelId, "share restored wrong channel", {
    context,
    share: stateSummaryFromShare(share),
  });
  assertQa(share.layout?.template === originalPayload.update.layout.template || share.generated?.view === originalPayload.generated.view, "share layout does not match generated state", {
    context,
    originalLayout: originalPayload.update.layout,
    share: stateSummaryFromShare(share),
  });
  assertQa(shareStage.length >= originalStage.length, "shared state lost generated stage components", {
    context,
    originalStage: originalStage.map((component) => component.id),
    shareStage: shareStage.map((component) => component.id),
  });
  assertQa(shareRail.length >= Math.min(2, originalRail.length), "shared state lost generated rail components", {
    context,
    originalRail: originalRail.map((component) => component.id),
    shareRail: shareRail.map((component) => component.id),
  });
  assertQa((share.provenanceRecords || []).length > 0, "shared state lost provenance records", {
    context,
    share: stateSummaryFromShare(share),
  });
  assertQa(String(share.prompt || "").includes(item.prompt.slice(0, 24)), "share does not preserve original prompt", {
    context,
    prompt: item.prompt,
    sharePrompt: share.prompt,
  });
  assertQa(Array.isArray(share.forkPrompts) && share.forkPrompts.length > 0, "share has no fork prompts", {
    context,
    share: stateSummaryFromShare(share),
  });
  assertQa(forkPayload?.ok === true && forkPayload.share?.id && forkPayload.share.id !== share.id, "fork did not create a new share object", {
    context,
    parentShareId: share.id,
    fork: forkPayload?.share?.id,
  });
  assertQa(forkPayload.parentShareId === share.id || forkPayload.share.parentShareId === share.id, "fork did not retain parent share id", {
    context,
    parentShareId: share.id,
    forkParent: forkPayload.parentShareId || forkPayload.share.parentShareId,
  });
  assertQa(generatedStageComponents(forkPayload.share.generated).length > 0, "forked state has no generated stage", {
    context,
    forkShareId: forkPayload.share.id,
  });
}

async function runContractLayer(baseUrl, report) {
  console.log("launch:smoke contract checks");
  for (const item of FOCUSED_PROMPTS) {
    const sessionId = `qa-contract-${item.channelId}-${item.slug}`;
    const payload = await jsonFetch(baseUrl, `/api/channels/${item.channelId}/turn`, {
      method: "POST",
      body: JSON.stringify({ userText: item.prompt, sessionId }),
    });
    validateGeneratedContract(item, payload, report);

    const shareResponse = await jsonFetch(baseUrl, "/api/channel-shares", {
      method: "POST",
      body: JSON.stringify({ channelId: item.channelId, sessionId, prompt: item.prompt }),
    });
    const shareGet = await jsonFetch(baseUrl, `/api/channel-shares/${shareResponse.share.id}`);
    const forkPrompt = shareGet.share.forkPrompts?.[0] || payload.state?.nextActions?.[0] || `${item.prompt} fork`;
    const forkResponse = await jsonFetch(baseUrl, `/api/channel-shares/${shareResponse.share.id}/fork`, {
      method: "POST",
      body: JSON.stringify({
        userText: forkPrompt,
        sessionId: `qa-contract-fork-${item.channelId}-${item.slug}`,
      }),
    });
    validateShareEquivalence(item, payload, shareGet.share, forkResponse);
    report.contract.push({
      channelId: item.channelId,
      prompt: item.prompt,
      layout: payload.update.layout.template,
      stageIds: generatedStageComponents(payload.generated).map((component) => component.id),
      railIds: generatedRailComponents(payload.generated).map((component) => component.id),
      shareId: shareResponse.share.id,
      forkedShareId: forkResponse.share.id,
      sourceTypes: (payload.update.provenanceRecords || []).map((record) => record.sourceType),
    });
    console.log(`  ok ${item.channelId} / ${item.slug}`);
  }

  const analytics = await jsonFetch(baseUrl, "/api/launch-analytics");
  for (const type of ["prompt_submitted", "channel_morphed", "share_created", "share_forked"]) {
    assertQa((analytics.byType?.[type] || 0) > 0, `analytics event missing after contract layer: ${type}`, {
      byType: analytics.byType,
    });
  }
  report.analyticsAfterContract = analytics.byType || {};
}

async function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.GOOGLE_CHROME_BIN,
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);
  for (const candidate of candidates) {
    const result = await new Promise((resolve) => {
      const child = spawn(candidate, ["--version"], { stdio: "ignore" });
      child.on("error", () => resolve(null));
      child.on("close", (code) => resolve(code === 0 ? candidate : null));
    });
    if (result) return result;
  }
  throw new Error("No Chrome/Chromium executable found. Set CHROME_PATH to run launch browser QA.");
}

class CdpConnection {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Set();
    ws.addEventListener("message", (event) => this.onMessage(event.data));
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    return new CdpConnection(ws);
  }

  onMessage(raw) {
    const message = JSON.parse(raw);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message || "CDP error"} (${message.error.code || "unknown"})`));
      else resolve(message.result || {});
      return;
    }
    this.handlers.forEach((handler) => handler(message));
  }

  send(method, params = {}, sessionId = null) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 15000);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
      });
    });
  }

  onEvent(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close() {
    try {
      this.ws.close();
    } catch (_) {}
  }
}

class BrowserQa {
  constructor(chrome, cdp, remotePort, userDataDir) {
    this.chrome = chrome;
    this.cdp = cdp;
    this.remotePort = remotePort;
    this.userDataDir = userDataDir;
  }

  static async start() {
    const chromePath = await findChromeExecutable();
    const remotePort = await findOpenPort();
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "katechon-launch-qa-chrome-"));
    const chrome = spawn(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-sandbox",
      `--remote-debugging-port=${remotePort}`,
      `--user-data-dir=${userDataDir}`,
      "--hide-scrollbars",
      "about:blank",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let chromeOutput = "";
    chrome.stdout.on("data", (chunk) => {
      chromeOutput += chunk.toString();
    });
    chrome.stderr.on("data", (chunk) => {
      chromeOutput += chunk.toString();
    });

    const versionUrl = `http://127.0.0.1:${remotePort}/json/version`;
    let version;
    try {
      version = await waitForHttpJson(versionUrl, 15000);
    } catch (error) {
      chrome.kill("SIGTERM");
      throw new Error(`Could not start headless Chrome: ${error.message}\n${chromeOutput.slice(-2000)}`);
    }
    const cdp = await CdpConnection.connect(version.webSocketDebuggerUrl);
    return new BrowserQa(chrome, cdp, remotePort, userDataDir);
  }

  async newPage(viewport, options = {}) {
    const browserContextId = options.cleanContext
      ? (await this.cdp.send("Target.createBrowserContext", { disposeOnDetach: true })).browserContextId
      : null;
    const target = await this.cdp.send("Target.createTarget", {
      url: "about:blank",
      browserContextId: browserContextId || undefined,
    });
    const attached = await this.cdp.send("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true,
    });
    const page = new CdpPage(this.cdp, attached.sessionId, target.targetId, browserContextId, viewport);
    await page.init();
    return page;
  }

  async close() {
    this.cdp.close();
    if (!this.chrome.killed) this.chrome.kill("SIGTERM");
    await sleep(250);
  }
}

class CdpPage {
  constructor(cdp, sessionId, targetId, browserContextId, viewport) {
    this.cdp = cdp;
    this.sessionId = sessionId;
    this.targetId = targetId;
    this.browserContextId = browserContextId;
    this.viewport = viewport;
    this.errors = [];
    this.url = "about:blank";
    this.off = cdp.onEvent((message) => this.handleEvent(message));
  }

  handleEvent(message) {
    if (message.sessionId !== this.sessionId) return;
    if (message.method === "Runtime.exceptionThrown") {
      this.errors.push({
        type: "exception",
        text: message.params?.exceptionDetails?.text || "Runtime exception",
        url: this.url,
      });
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
      const args = message.params.args || [];
      this.errors.push({
        type: "console.error",
        text: args.map((arg) => arg.value || arg.description || arg.type).join(" "),
        url: this.url,
      });
    }
    if (message.method === "Page.frameNavigated" && !message.params?.frame?.parentId) {
      this.url = message.params.frame.url || this.url;
    }
  }

  async init() {
    await this.cdp.send("Page.enable", {}, this.sessionId);
    await this.cdp.send("Runtime.enable", {}, this.sessionId);
    await this.cdp.send("Log.enable", {}, this.sessionId);
    await this.cdp.send("Emulation.setDeviceMetricsOverride", {
      width: this.viewport.width,
      height: this.viewport.height,
      deviceScaleFactor: this.viewport.scale || 1,
      mobile: Boolean(this.viewport.mobile),
    }, this.sessionId);
  }

  async navigate(url) {
    this.errors = [];
    this.url = url;
    await this.cdp.send("Page.navigate", { url }, this.sessionId);
    await this.waitFor("document.readyState !== 'loading'", 15000, `load ${url}`);
    await sleep(250);
  }

  async evaluate(expression) {
    const result = await this.cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      timeout: 15000,
    }, this.sessionId);
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
    }
    return result.result?.value;
  }

  async waitFor(expression, timeoutMs, label) {
    const started = Date.now();
    let last = null;
    while (Date.now() - started < timeoutMs) {
      try {
        last = await this.evaluate(`Boolean(${expression})`);
        if (last) return true;
      } catch (error) {
        last = error.message;
      }
      await sleep(180);
    }
    throw new Error(`Timed out waiting for ${label}: ${last}`);
  }

  async screenshotElement(selector, filePath) {
    const rect = await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: Math.max(0, rect.x + window.scrollX),
        y: Math.max(0, rect.y + window.scrollY),
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      };
    })()`);
    assertQa(rect && rect.width > 20 && rect.height > 20, `cannot screenshot missing or tiny element ${selector}`, { rect });
    const screenshot = await this.cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      clip: { ...rect, scale: 1 },
    }, this.sessionId);
    const buffer = Buffer.from(screenshot.data, "base64");
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, buffer);
    return { filePath, rect, analysis: analyzePng(buffer) };
  }

  async screenshotViewport(filePath) {
    const screenshot = await this.cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    }, this.sessionId);
    const buffer = Buffer.from(screenshot.data, "base64");
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, buffer);
    return { filePath, analysis: analyzePng(buffer) };
  }

  async close() {
    this.off();
    await this.cdp.send("Target.closeTarget", { targetId: this.targetId }).catch(() => {});
    if (this.browserContextId) {
      await this.cdp.send("Target.disposeBrowserContext", { browserContextId: this.browserContextId }).catch(() => {});
    }
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function parsePng(buffer) {
  const signature = "89504e470d0a1a0a";
  assertQa(buffer.slice(0, 8).toString("hex") === signature, "screenshot is not a PNG");
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.slice(offset + 4, offset + 8).toString("ascii");
    const data = buffer.slice(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
    offset += 12 + length;
  }
  assertQa(width > 0 && height > 0 && bitDepth === 8, "unsupported PNG screenshot shape", {
    width,
    height,
    bitDepth,
    colorType,
  });
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  assertQa(bytesPerPixel, "unsupported PNG color type", { colorType });
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(width * height * 4);
  let inputOffset = 0;
  let prior = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = inflated[inputOffset++];
    const row = Buffer.from(inflated.slice(inputOffset, inputOffset + stride));
    inputOffset += stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const up = prior[x] || 0;
      const upLeft = x >= bytesPerPixel ? prior[x - bytesPerPixel] || 0 : 0;
      if (filter === 1) row[x] = (row[x] + left) & 0xff;
      if (filter === 2) row[x] = (row[x] + up) & 0xff;
      if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 0xff;
      if (filter === 4) row[x] = (row[x] + paeth(left, up, upLeft)) & 0xff;
    }
    for (let x = 0; x < width; x++) {
      const source = x * bytesPerPixel;
      const target = (y * width + x) * 4;
      pixels[target] = row[source];
      pixels[target + 1] = row[source + 1];
      pixels[target + 2] = row[source + 2];
      pixels[target + 3] = bytesPerPixel === 4 ? row[source + 3] : 255;
    }
    prior = row;
  }
  return { width, height, pixels };
}

function analyzePng(buffer) {
  const { width, height, pixels } = parsePng(buffer);
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 6000)));
  const colors = new Set();
  let count = 0;
  let sum = 0;
  let sumSq = 0;
  const first = [pixels[0], pixels[1], pixels[2]];
  let changed = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      if (a < 20) continue;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      colors.add(`${r >> 3},${g >> 3},${b >> 3}`);
      count += 1;
      sum += luma;
      sumSq += luma * luma;
      if (Math.abs(r - first[0]) + Math.abs(g - first[1]) + Math.abs(b - first[2]) > 32) changed += 1;
    }
  }
  const mean = count ? sum / count : 0;
  const variance = count ? Math.max(0, sumSq / count - mean * mean) : 0;
  return {
    width,
    height,
    sampledPixels: count,
    uniqueColorBuckets: colors.size,
    lumaStdDev: Math.sqrt(variance),
    changedRatio: count ? changed / count : 0,
  };
}

function validateScreenshotAnalysis(analysis, context) {
  assertQa(analysis.width > 50 && analysis.height > 50, "generated stage screenshot is near-zero", { context, analysis });
  assertQa(analysis.uniqueColorBuckets >= 10, "generated stage screenshot is visually flat", { context, analysis });
  assertQa(analysis.changedRatio >= 0.02 || analysis.lumaStdDev >= 5, "generated stage screenshot is too close to one color", {
    context,
    analysis,
  });
}

function browserValidationScript(expectedPrompt, expectedShareId = "") {
  return `(() => {
    const visible = (el) => {
      if (!el) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return rect.width > 4 && rect.height > 4 && style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0.01;
    };
    const rectOf = (el) => {
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
    };
    const intersects = (a, b) => {
      const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x));
      const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y));
      return x * y;
    };
    const stage = document.querySelector(".generated-page-stage-body") || document.querySelector(".generated-stage");
    const rail = document.querySelector(".generated-page-rail") || document.querySelector("#generated-rail");
    const share = document.querySelector(".generated-page-share") || document.querySelector("#command-share");
    const promptInput = document.querySelector("#command-input");
    const promptButtons = Array.from(document.querySelectorAll(".prompt-chip,.generated-page-action[data-prompt]"));
    const generatedComponents = Array.from(document.querySelectorAll(".generated-component")).filter(visible);
    const stageComponents = Array.from(document.querySelectorAll(".generated-stage .generated-component,.generated-page-stage-body .generated-component")).filter(visible);
    const railComponents = Array.from(document.querySelectorAll("#generated-rail .generated-component,.generated-page-rail .generated-component")).filter(visible);
    const sources = Array.from(document.querySelectorAll(".generated-source")).filter(visible);
    const charts = Array.from(document.querySelectorAll(".generated-chart")).filter(visible).map((node) => ({
      rect: rectOf(node),
      hasCanvas: Boolean(node.querySelector("canvas")),
      hasSvg: Boolean(node.querySelector("svg")),
      fallbackBars: node.querySelectorAll(".generated-chart-fallback span").length,
      text: node.textContent.trim(),
    }));
    const overflows = Array.from(document.querySelectorAll(".generated-title,.generated-body,.generated-row-v,.generated-item,.generated-note,.generated-metric-value,.generated-page-head h2,.generated-page-head p"))
      .filter(visible)
      .filter((el) => el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)
      .slice(0, 8)
      .map((el) => ({ className: el.className, text: el.textContent.trim().slice(0, 120), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }));
    const stageRect = stage ? rectOf(stage) : null;
    const controlOverlap = stageRect ? Array.from(document.querySelectorAll("#command-panel,#command-share,#command-build,.prompt-chip,.generated-page-actions"))
      .filter(visible)
      .map((el) => ({ className: el.className || el.id, area: intersects(stageRect, rectOf(el)) }))
      .filter((entry) => entry.area > 8) : [];
    return {
      url: location.href,
      title: document.title,
      generatedView: document.body.dataset.generatedView || "",
      channelShare: document.body.dataset.channelShare || "",
      expectedShareId: ${JSON.stringify(expectedShareId)},
      stageVisible: visible(stage),
      railVisible: visible(rail),
      shareVisible: visible(share),
      promptInputValue: promptInput ? promptInput.value : "",
      expectedPrompt: ${JSON.stringify(expectedPrompt)},
      promptButtons: promptButtons.map((button) => button.textContent.trim()),
      componentCount: generatedComponents.length,
      stageCount: stageComponents.length,
      railCount: railComponents.length,
      sourceCount: sources.length,
      chartCount: charts.length,
      charts,
      stageTextLength: stage ? stage.innerText.trim().length : 0,
      railTextLength: rail ? rail.innerText.trim().length : 0,
      commandStatus: document.querySelector("#command-status")?.textContent.trim() || "",
      loadingText: /building channel state|saving share object|loading/i.test(document.body.innerText),
      overflows,
      controlOverlap,
    };
  })()`;
}

function assertBrowserState(dom, context, options = {}) {
  assertQa(dom.stageVisible, "generated stage is not visible", { context, dom });
  assertQa(dom.railVisible, "generated rail is not visible", { context, dom });
  assertQa(dom.stageCount > 0, "generated stage has no visible components", { context, dom });
  assertQa(dom.railCount > 0, "generated rail has no visible components", { context, dom });
  assertQa(dom.sourceCount > 0, "no visible provenance/source label", { context, dom });
  assertQa(dom.shareVisible, "share control is not visible", { context, dom });
  assertQa(dom.stageTextLength > 20, "generated stage has too little text/content", { context, dom });
  assertQa(dom.railTextLength > 40, "generated rail has too little text/content", { context, dom });
  assertQa(!dom.loadingText, "loading/saving state remains visible after success", { context, dom });
  assertQa(dom.chartCount === 0 || dom.charts.some((chart) => chart.hasCanvas || chart.hasSvg || chart.fallbackBars > 0 || chart.text.length > 12), "chart surface rendered blank", {
    context,
    charts: dom.charts,
  });
  assertQa(dom.overflows.length === 0, "generated component text overflows its container", { context, overflows: dom.overflows });
  assertQa(dom.controlOverlap.length === 0, "key controls overlap generated stage", { context, overlap: dom.controlOverlap });
  if (options.expectedShareId) {
    assertQa(dom.channelShare === options.expectedShareId, "share replay did not load the expected share id", {
      context,
      expectedShareId: options.expectedShareId,
      dom,
    });
  }
  if (options.expectPromptVisible) {
    assertQa(dom.promptInputValue.includes(options.expectPromptVisible.slice(0, 18)) || dom.commandStatus.toLowerCase().includes("share"), "original prompt is not visible in restored share context", {
      context,
      prompt: options.expectPromptVisible,
      dom,
    });
  }
}

async function clickPrompt(page, prompt) {
  const clicked = await page.evaluate(`(() => {
    const prompt = ${JSON.stringify(prompt)};
    const buttons = Array.from(document.querySelectorAll(".prompt-chip"));
    const exact = buttons.find((button) => (button.dataset.prompt || button.textContent.trim()) === prompt);
    if (!exact) return false;
    exact.click();
    return true;
  })()`);
  assertQa(clicked, "could not click dashboard prompt chip", { prompt });
}

async function clickShare(page) {
  const clicked = await page.evaluate(`(() => {
    const button = document.querySelector(".generated-page-share") || document.querySelector("#command-share");
    if (!button) return false;
    button.click();
    return true;
  })()`);
  assertQa(clicked, "could not click share button");
}

async function clickFirstForkPrompt(page) {
  const clicked = await page.evaluate(`(() => {
    const input = document.querySelector("#command-input");
    const button = Array.from(document.querySelectorAll(".prompt-chip,.generated-page-action[data-prompt]")).find((candidate) => candidate.offsetWidth > 0 && candidate.offsetHeight > 0);
    if (!button) return false;
    if (input) input.value = button.dataset.prompt || button.textContent.trim();
    button.click();
    return true;
  })()`);
  assertQa(clicked, "could not click fork prompt control");
}

async function waitForGenerated(page, context) {
  try {
    await page.waitFor(`(document.querySelectorAll(".generated-stage .generated-component").length > 0 || document.querySelectorAll(".generated-page-stage-body .generated-component").length > 0) && (document.querySelectorAll("#generated-rail .generated-component").length > 0 || document.querySelectorAll(".generated-page-rail .generated-component").length > 0) && !/building channel state|saving share object/i.test(document.body.innerText)`, 18000, `${context} generated state`);
    await sleep(650);
  } catch (error) {
    const diagnostics = await page.evaluate(`(() => ({
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      status: document.querySelector("#command-status")?.textContent.trim() || "",
      promptButtons: Array.from(document.querySelectorAll(".prompt-chip")).map((button) => button.textContent.trim()),
      stageComponents: document.querySelectorAll(".generated-stage .generated-component,.generated-page-stage-body .generated-component").length,
      railComponents: document.querySelectorAll("#generated-rail .generated-component,.generated-page-rail .generated-component").length,
      generatedView: document.body.dataset.generatedView || "",
      bodyDataset: { ...document.body.dataset },
      bodyText: document.body.innerText.slice(0, 600),
    }))()`).catch((diagError) => ({ diagnosticError: diagError.message }));
    error.evidence = { context, diagnostics, pageErrors: page.errors };
    throw error;
  }
}

function assertNoConsoleErrors(page, context) {
  const blocking = page.errors.filter((error) => !/ResizeObserver loop|favicon/i.test(error.text || ""));
  assertQa(blocking.length === 0, "uncaught console/runtime errors during browser QA", { context, errors: blocking });
}

async function assertShareMetadata(baseUrl, shareId, reportItem) {
  const html = await textFetch(baseUrl, `/share/channel/${shareId}`);
  const hasCanonical = new RegExp(`<link rel="canonical" href="[^"]*/share/channel/${shareId}"`).test(html);
  assertQa(/<meta property="og:title" content="[^"]{8,}"/.test(html), "share metadata missing Open Graph title", { shareId });
  assertQa(/<meta property="og:description" content="[^"]*Fork this live market channel/.test(html), "share metadata missing fork-oriented description", { shareId });
  assertQa(/<meta property="og:image" content="[^"]+"/.test(html), "share metadata missing image", { shareId });
  assertQa(hasCanonical, "share metadata missing canonical URL", { shareId });
  reportItem.shareMetadataChecked = true;
}

async function runBrowserPrompt(browser, baseUrl, item, viewport, report, options) {
  const context = `${item.channelId}:${item.slug}:${viewport.name}`;
  const page = await browser.newPage(viewport);
  const reportItem = {
    channelId: item.channelId,
    prompt: item.prompt,
    viewport: viewport.name,
    screenshots: [],
  };
  try {
    const dashboardUrl = new URL(`/dashboards/${item.channelId}`, baseUrl);
    await page.navigate(dashboardUrl.href);
    await page.waitFor(`document.querySelectorAll(".prompt-chip").length >= 3`, 12000, `${context} prompt chips`);
    await clickPrompt(page, item.prompt);
    await waitForGenerated(page, context);
    let dom = await page.evaluate(browserValidationScript(item.prompt));
    assertBrowserState(dom, context);
    assertNoConsoleErrors(page, context);
    const stageScreenshot = await page.screenshotElement(".generated-stage,.generated-page-stage-body", path.join(SCREENSHOT_DIR, `${item.channelId}__${item.slug}__${viewport.name}.png`));
    validateScreenshotAnalysis(stageScreenshot.analysis, context);
    reportItem.screenshots.push(stageScreenshot);

    if (options.shareFlow) {
      await clickShare(page);
      await page.waitFor(`Boolean(document.body.dataset.channelShare)`, 10000, `${context} share id`);
      const shareId = await page.evaluate("document.body.dataset.channelShare || ''");
      assertQa(shareId, "share button did not create a share object", { context });
      reportItem.shareId = shareId;
      await assertShareMetadata(baseUrl, shareId, reportItem);

      const sharePage = await browser.newPage(viewport, { cleanContext: true });
      try {
        const shareUrl = new URL(`/share/channel/${shareId}`, baseUrl);
        await sharePage.navigate(shareUrl.href);
        await sharePage.waitFor(`location.href.includes("channelShare=${shareId}") && document.body.dataset.channelShare === ${JSON.stringify(shareId)}`, 12000, `${context} share redirect`);
        await waitForGenerated(sharePage, `${context}:share`);
        const shareDom = await sharePage.evaluate(browserValidationScript(item.prompt, shareId));
        assertBrowserState(shareDom, `${context}:share`, { expectedShareId: shareId, expectPromptVisible: item.prompt });
        assertNoConsoleErrors(sharePage, `${context}:share`);
        const shareScreenshot = await sharePage.screenshotElement(".generated-stage,.generated-page-stage-body", path.join(SCREENSHOT_DIR, `${item.channelId}__${item.slug}__share-replay__${viewport.name}.png`));
        validateScreenshotAnalysis(shareScreenshot.analysis, `${context}:share`);
        reportItem.screenshots.push(shareScreenshot);

        await clickFirstForkPrompt(sharePage);
        await sharePage.waitFor(`Boolean(document.body.dataset.channelShare) && document.body.dataset.channelShare !== ${JSON.stringify(shareId)}`, 18000, `${context} forked share id`);
        await waitForGenerated(sharePage, `${context}:fork`);
        const forkShareId = await sharePage.evaluate("document.body.dataset.channelShare || ''");
        const forkDom = await sharePage.evaluate(browserValidationScript("", forkShareId));
        assertBrowserState(forkDom, `${context}:fork`, { expectedShareId: forkShareId });
        assertNoConsoleErrors(sharePage, `${context}:fork`);
        const forkScreenshot = await sharePage.screenshotElement(".generated-stage,.generated-page-stage-body", path.join(SCREENSHOT_DIR, `${item.channelId}__${item.slug}__forked__${viewport.name}.png`));
        validateScreenshotAnalysis(forkScreenshot.analysis, `${context}:fork`);
        reportItem.forkedShareId = forkShareId;
        reportItem.screenshots.push(forkScreenshot);
      } finally {
        await sharePage.close();
      }
    }

    report.browser.push(reportItem);
    console.log(`  ok ${context}`);
  } catch (error) {
    const failurePath = path.join(SCREENSHOT_DIR, `${item.channelId}__${item.slug}__failure__${viewport.name}.png`);
    try {
      const failureScreenshot = await page.screenshotViewport(failurePath);
      reportItem.failureScreenshot = failureScreenshot;
      report.browser.push(reportItem);
      error.evidence = {
        ...(error.evidence || {}),
        failureScreenshot,
      };
    } catch (screenshotError) {
      error.evidence = {
        ...(error.evidence || {}),
        failureScreenshotError: screenshotError.message,
      };
    }
    throw error;
  } finally {
    await page.close();
  }
}

async function runBrowserLayer(baseUrl, report, mode) {
  console.log(`launch:${mode} browser checks`);
  const browser = await BrowserQa.start();
  try {
    const viewports = mode === "visual" ? VIEWPORTS : VIEWPORTS;
    for (const item of FOCUSED_PROMPTS) {
      for (const viewport of viewports) {
        await runBrowserPrompt(browser, baseUrl, item, viewport, report, {
          shareFlow: viewport.name === "desktop",
        });
      }
    }
  } finally {
    await browser.close();
  }
}

async function validateFinalAnalytics(baseUrl, report) {
  const analytics = await jsonFetch(baseUrl, "/api/launch-analytics");
  const byType = analytics.byType || {};
  for (const type of REQUIRED_FULL_EVENTS) {
    assertQa((byType[type] || 0) > 0, `analytics event missing after full launch QA: ${type}`, { byType });
  }
  if (report.fallbackSeen) {
    assertQa((byType.fallback_seen || 0) > 0, "fallback_seen analytics missing despite fallback source states", { byType });
  }
  report.analyticsFinal = byType;
}

function modeNeedsBrowser(mode) {
  return mode === "e2e" || mode === "visual" || mode === "full";
}

async function run(mode = "full") {
  ensureDir(SCREENSHOT_DIR);
  const report = {
    mode,
    startedAt: new Date().toISOString(),
    artifactRoot: ARTIFACT_ROOT,
    contract: [],
    browser: [],
    fallbackSeen: false,
    analyticsAfterContract: {},
    analyticsFinal: {},
  };
  const server = await startManagedServer();
  report.baseUrl = server.baseUrl;
  report.server = server.external ? { external: true } : { external: false, dataDir: server.dataDir };
  try {
    if (mode !== "visual") await runContractLayer(server.baseUrl, report);
    if (modeNeedsBrowser(mode)) await runBrowserLayer(server.baseUrl, report, mode);
    if (mode === "full" || mode === "e2e") await validateFinalAnalytics(server.baseUrl, report);
    report.finishedAt = new Date().toISOString();
    report.ok = true;
    writeJson(REPORT_PATH, report);
    console.log(`launch:${mode} ok`);
    console.log(`report: ${path.relative(ROOT, REPORT_PATH)}`);
    console.log(`screenshots: ${path.relative(ROOT, SCREENSHOT_DIR)}`);
    return report;
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.ok = false;
    report.failure = failListFromError(error);
    writeJson(REPORT_PATH, report);
    console.error(`launch:${mode} failed: ${error.message}`);
    console.error(`report: ${path.relative(ROOT, REPORT_PATH)}`);
    process.exitCode = 1;
    throw error;
  } finally {
    await server.cleanup();
  }
}

function runCli(mode) {
  run(mode).catch((error) => {
    if (!process.exitCode) process.exitCode = 1;
    if (!/launch:.*failed/.test(String(error.message))) {
      console.error(error.stack || error.message || String(error));
    }
  });
}

module.exports = {
  FOCUSED_PROMPTS,
  run,
  runCli,
};
