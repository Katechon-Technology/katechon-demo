#!/usr/bin/env node

const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { spawn } = require("child_process");

const WebSocketImpl = global.WebSocket || require("ws");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "public", "deck", "vc-deck.json");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "vc-deck");
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, "screenshots");
const PRINT_HTML_PATH = path.join(ARTIFACT_DIR, "print-source.html");
const REPORT_PATH = path.join(ARTIFACT_DIR, "export-report.json");
const PUBLIC_PDF_PATH = process.env.DECK_PDF_OUT || path.join(ROOT, "public", "deck", "katechon-vc-deck.pdf");
const ARTIFACT_PDF_PATH = path.join(ARTIFACT_DIR, "katechon-vc-deck.pdf");
const VIEWPORT = { width: 1920, height: 1080, scale: 1 };

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

function assert(condition, message, evidence = {}) {
  if (!condition) {
    const error = new Error(message);
    error.evidence = evidence;
    throw error;
  }
}

function safeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "slide";
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
  throw new Error("No Chrome/Chromium executable found. Set CHROME_PATH to export the deck PDF.");
}

function addWsListener(ws, eventName, handler, once = false) {
  if (typeof ws.addEventListener === "function") {
    ws.addEventListener(eventName, handler, once ? { once: true } : undefined);
    return;
  }
  if (once && typeof ws.once === "function") ws.once(eventName, handler);
  else if (typeof ws.on === "function") ws.on(eventName, handler);
}

class CdpConnection {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Set();
    addWsListener(ws, "message", (event) => this.onMessage(event.data || event));
  }

  static async connect(wsUrl) {
    const ws = new WebSocketImpl(wsUrl);
    await new Promise((resolve, reject) => {
      addWsListener(ws, "open", resolve, true);
      addWsListener(ws, "error", reject, true);
    });
    return new CdpConnection(ws);
  }

  onMessage(raw) {
    const message = JSON.parse(String(raw));
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject, timeout } = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(timeout);
      if (message.error) reject(new Error(`${message.error.message || "CDP error"} (${message.error.code || "unknown"})`));
      else resolve(message.result || {});
      return;
    }
    this.handlers.forEach((handler) => handler(message));
  }

  send(method, params = {}, sessionId = null, timeoutMs = 30000) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
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

class Browser {
  constructor(chrome, cdp, userDataDir) {
    this.chrome = chrome;
    this.cdp = cdp;
    this.userDataDir = userDataDir;
  }

  static async start() {
    const chromePath = await findChromeExecutable();
    const remotePort = await findOpenPort();
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "katechon-vc-deck-chrome-"));
    const chrome = spawn(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-background-networking",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${remotePort}`,
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let output = "";
    chrome.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    chrome.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });

    let version;
    try {
      version = await waitForHttpJson(`http://127.0.0.1:${remotePort}/json/version`, 15000);
    } catch (error) {
      chrome.kill("SIGTERM");
      throw new Error(`Could not start headless Chrome: ${error.message}\n${output.slice(-2000)}`);
    }

    const cdp = await CdpConnection.connect(version.webSocketDebuggerUrl);
    return new Browser(chrome, cdp, userDataDir);
  }

  async newPage(viewport = VIEWPORT) {
    const target = await this.cdp.send("Target.createTarget", { url: "about:blank" });
    const attached = await this.cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const page = new Page(this.cdp, attached.sessionId, target.targetId, viewport);
    await page.init();
    return page;
  }

  async close() {
    this.cdp.close();
    if (!this.chrome.killed) this.chrome.kill("SIGTERM");
    await sleep(250);
  }
}

class Page {
  constructor(cdp, sessionId, targetId, viewport) {
    this.cdp = cdp;
    this.sessionId = sessionId;
    this.targetId = targetId;
    this.viewport = viewport;
    this.errors = [];
    this.off = cdp.onEvent((message) => {
      if (message.sessionId !== this.sessionId) return;
      if (message.method === "Runtime.exceptionThrown") {
        this.errors.push(message.params?.exceptionDetails?.text || "Runtime exception");
      }
      if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
        const args = message.params.args || [];
        this.errors.push(args.map((arg) => arg.value || arg.description || arg.type).join(" "));
      }
    });
  }

  async init() {
    await this.cdp.send("Page.enable", {}, this.sessionId);
    await this.cdp.send("Runtime.enable", {}, this.sessionId);
    await this.cdp.send("Log.enable", {}, this.sessionId);
    await this.cdp.send("Emulation.setDeviceMetricsOverride", {
      width: this.viewport.width,
      height: this.viewport.height,
      deviceScaleFactor: this.viewport.scale || 1,
      mobile: false,
    }, this.sessionId);
    await this.cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    }, this.sessionId);
  }

  async navigate(url) {
    this.errors = [];
    await this.cdp.send("Page.navigate", { url }, this.sessionId);
    await this.waitFor("document.readyState !== 'loading'", 20000, `load ${url}`);
    await sleep(250);
  }

  async evaluate(expression, timeoutMs = 30000) {
    const result = await this.cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      timeout: timeoutMs,
    }, this.sessionId, timeoutMs + 1000);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
    return result.result?.value;
  }

  async waitFor(expression, timeoutMs, label) {
    const started = Date.now();
    let last = null;
    while (Date.now() - started < timeoutMs) {
      try {
        last = await this.evaluate(`Boolean(${expression})`, 5000);
        if (last) return true;
      } catch (error) {
        last = error.message;
      }
      await sleep(180);
    }
    throw new Error(`Timed out waiting for ${label}: ${last}`);
  }

  async screenshot(filePath) {
    const result = await this.cdp.send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 93,
      fromSurface: true,
      captureBeyondViewport: false,
    }, this.sessionId, 30000);
    const buffer = Buffer.from(result.data, "base64");
    assert(buffer.length > 40000, "captured screenshot is unexpectedly small", { filePath, bytes: buffer.length });
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, buffer);
    return { filePath, bytes: buffer.length };
  }

  async printToPdf(filePath) {
    const result = await this.cdp.send("Page.printToPDF", {
      printBackground: true,
      preferCSSPageSize: true,
      landscape: true,
      paperWidth: 13.333333,
      paperHeight: 7.5,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0,
    }, this.sessionId, 120000);
    const buffer = Buffer.from(result.data, "base64");
    assert(buffer.length > 100000, "printed PDF is unexpectedly small", { filePath, bytes: buffer.length });
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, buffer);
    return { filePath, bytes: buffer.length };
  }

  async close() {
    this.off();
    await this.cdp.send("Target.closeTarget", { targetId: this.targetId }).catch(() => {});
  }
}

async function startManagedServer() {
  const configured = process.env.DECK_BASE_URL || process.env.QA_BASE_URL;
  if (configured) {
    return {
      baseUrl: configured.replace(/\/+$/, "/"),
      cleanup: async () => {},
      external: true,
    };
  }

  const port = await findOpenPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "katechon-vc-deck-"));
  const env = {
    ...process.env,
    PORT: String(port),
    DASHBOARD_OVERRIDES_FILE: path.join(dataDir, "dashboard-overrides.json"),
    CHANNEL_SESSIONS_FILE: path.join(dataDir, "channel-sessions.json"),
    CHANNEL_SHARES_FILE: path.join(dataDir, "channel-shares.json"),
    PROVIDER_CACHE_FILE: path.join(dataDir, "provider-cache.json"),
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
    throw new Error(`Could not start export server: ${error.message}\n${output.slice(-2000)}`);
  }

  return {
    baseUrl,
    external: false,
    cleanup: async () => {
      if (!child.killed) child.kill("SIGTERM");
      await sleep(250);
    },
  };
}

function dashboardUrl(baseUrl, slide) {
  const url = new URL(`/dashboards/${slide.id}/`, baseUrl);
  url.searchParams.set("dashboard", slide.id);
  url.searchParams.set("deckCapture", "1");
  url.searchParams.set("fullscreen", "1");
  url.searchParams.set("autoplay", "0");
  url.searchParams.set("audio", "0");
  return url.href;
}

async function waitForDashboard(page, slide) {
  await page.waitFor(
    `document.body.dataset.dashboard === ${JSON.stringify(slide.id)} && document.body.classList.contains("blank-dashboard") && document.querySelector("#stage")`,
    20000,
    `dashboard ${slide.id}`
  );
  await page.evaluate(`(() => {
    document.querySelectorAll("video").forEach((video) => {
      try {
        video.pause();
        video.currentTime = 0;
      } catch (_) {}
    });
    return document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true;
  })()`);
  await page.evaluate(`(() => Promise.all(Array.from(document.images).map((img) => {
    if (img.complete) return true;
    return new Promise((resolve) => {
      const done = () => resolve(true);
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
      setTimeout(done, 2500);
    });
  })))()`);
  if (slide.id === "attention-architecture") {
    await page.waitFor(
      `document.querySelector("#aa-code-lines")?.children.length >= 12 && document.querySelector("#aa-s-next")?.classList.contains("is-on")`,
      Number(process.env.DECK_ATTENTION_CAPTURE_TIMEOUT_MS || 16000),
      "attention architecture generated-code and live-channel columns"
    );
  }
  await sleep(Number(process.env.DECK_CAPTURE_SETTLE_MS || 1000));
  const dom = await page.evaluate(`(() => {
    const stage = document.querySelector("#stage");
    const rect = stage ? stage.getBoundingClientRect() : null;
    return {
      title: document.title,
      textLength: document.body.innerText.trim().length,
      stage: rect ? { width: rect.width, height: rect.height } : null,
      hasScene: Boolean(stage && stage.children.length),
    };
  })()`);
  assert(dom.stage && dom.stage.width > 800 && dom.stage.height > 480, "dashboard stage is not printable", { slide, dom });
  assert(dom.textLength > 10 || dom.hasScene, "dashboard rendered too little content", { slide, dom });
  return dom;
}

function printHtml(manifest, captures) {
  const pages = captures.map((capture, index) => {
    const imageUrl = pathToFileURL(capture.filePath).href;
    const title = `${capture.slide.number}. ${capture.slide.title || capture.slide.id}`;
    return `<section class="page" aria-label="${escapeHtml(title)}"><img src="${imageUrl}" alt="${escapeHtml(title)}"></section>`;
  }).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(manifest.title || "Katechon Technology")} PDF</title>
  <style>
    @page { size: 13.333333in 7.5in; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #000; }
    .page {
      width: 13.333333in;
      height: 7.5in;
      margin: 0;
      padding: 0;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      background: #000;
    }
    .page:last-child { page-break-after: auto; break-after: auto; }
    img { display: block; width: 100%; height: 100%; object-fit: cover; }
  </style>
</head>
<body>
${pages}
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[char]);
}

async function run() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const slides = Array.isArray(manifest.slides) ? manifest.slides : [];
  assert(slides.length > 0, "deck manifest has no slides", { manifestPath: MANIFEST_PATH });

  fs.rmSync(SCREENSHOT_DIR, { recursive: true, force: true });
  ensureDir(SCREENSHOT_DIR);
  ensureDir(path.dirname(PUBLIC_PDF_PATH));
  ensureDir(ARTIFACT_DIR);

  const report = {
    startedAt: new Date().toISOString(),
    manifest: path.relative(ROOT, MANIFEST_PATH),
    publicPdf: path.relative(ROOT, PUBLIC_PDF_PATH),
    artifactPdf: path.relative(ROOT, ARTIFACT_PDF_PATH),
    screenshots: [],
  };

  const server = await startManagedServer();
  report.baseUrl = server.baseUrl;
  report.server = server.external ? "external" : "managed";

  let browser = null;
  try {
    browser = await Browser.start();
    const capturePage = await browser.newPage(VIEWPORT);
    for (const slide of slides) {
      const url = dashboardUrl(server.baseUrl, slide);
      const filename = `${String(slide.number || report.screenshots.length + 1).padStart(2, "0")}-${safeName(slide.id)}.jpg`;
      const filePath = path.join(SCREENSHOT_DIR, filename);
      console.log(`capture ${slide.number}: ${slide.id}`);
      await capturePage.navigate(url);
      const dom = await waitForDashboard(capturePage, slide);
      const screenshot = await capturePage.screenshot(filePath);
      report.screenshots.push({
        slide,
        url,
        file: path.relative(ROOT, filePath),
        bytes: screenshot.bytes,
        dom,
      });
    }
    await capturePage.close();

    fs.writeFileSync(PRINT_HTML_PATH, printHtml(manifest, report.screenshots.map((entry) => ({
      ...entry,
      filePath: path.join(ROOT, entry.file),
    }))));

    const printPage = await browser.newPage(VIEWPORT);
    await printPage.navigate(pathToFileURL(PRINT_HTML_PATH).href);
    await printPage.waitFor("Array.from(document.images).every((img) => img.complete)", 20000, "print images");
    const pdf = await printPage.printToPdf(PUBLIC_PDF_PATH);
    fs.copyFileSync(PUBLIC_PDF_PATH, ARTIFACT_PDF_PATH);
    report.pdfBytes = pdf.bytes;
    await printPage.close();

    report.finishedAt = new Date().toISOString();
    report.ok = true;
    writeJson(REPORT_PATH, report);
    console.log(`pdf: ${path.relative(ROOT, PUBLIC_PDF_PATH)}`);
    console.log(`report: ${path.relative(ROOT, REPORT_PATH)}`);
  } catch (error) {
    report.finishedAt = new Date().toISOString();
    report.ok = false;
    report.error = {
      message: error.message || String(error),
      evidence: error.evidence || {},
      stack: error.stack || "",
    };
    writeJson(REPORT_PATH, report);
    console.error(`deck PDF export failed: ${error.message}`);
    console.error(`report: ${path.relative(ROOT, REPORT_PATH)}`);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await server.cleanup();
  }
}

run();
