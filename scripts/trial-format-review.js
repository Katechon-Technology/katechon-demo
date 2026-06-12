#!/usr/bin/env node
const fs = require("fs");
const net = require("net");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CAPSULE_DIR = path.join(ROOT, "data", "trial-capsules", "memia-2026-18");
const ARTIFACT_ROOT = path.join(ROOT, "artifacts", "trial-format-review");
const CHANNELS = ["planetary-solvency", "cloud-canary", "runtime-governance"];
const BROWSER_NAME = process.env.TRIAL_QA_BROWSER || "chromium";
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

function nowSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureCapsules() {
  const missing = CHANNELS.some((id) => !fs.existsSync(path.join(CAPSULE_DIR, `${id}.json`)));
  if (!missing) return;
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "generate-trial-channels.js")], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Could not generate trial capsules: ${result.stderr || result.stdout}`);
  }
}

function readCapsule(id) {
  return JSON.parse(fs.readFileSync(path.join(CAPSULE_DIR, `${id}.json`), "utf8"));
}

function writeCapsule(id, capsule) {
  fs.writeFileSync(path.join(CAPSULE_DIR, `${id}.json`), `${JSON.stringify(capsule, null, 2)}\n`);
}

function getPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(baseUrl, proc) {
  const fetchImpl = global.fetch || ((await import("node-fetch")).default);
  const deadline = Date.now() + 15000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`server exited early with code ${proc.exitCode}`);
    try {
      const response = await fetchImpl(`${baseUrl}/api/trial-capsules`, { cache: "no-store" });
      if (response.ok) return;
    } catch (err) {
      lastError = err;
    }
    await sleep(300);
  }
  throw lastError || new Error("server did not become ready");
}

async function startServer(runDir) {
  const port = await getPort();
  const dataDir = path.join(runDir, "server-data");
  fs.mkdirSync(dataDir, { recursive: true });
  const env = {
    ...process.env,
    PORT: String(port),
    DASHBOARD_NARRATION_TTS: "0",
    DASHBOARD_NARRATION_REMOTE: "0",
    EXTERNAL_DASHBOARD_UPSTREAMS: "0",
    DASHBOARD_OVERRIDES_FILE: path.join(dataDir, "dashboard-overrides.json"),
    CHANNEL_SESSIONS_FILE: path.join(dataDir, "channel-sessions.json"),
    CHANNEL_SHARES_FILE: path.join(dataDir, "channel-shares.json"),
    PROVIDER_CACHE_FILE: path.join(dataDir, "provider-cache.json"),
  };
  const proc = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logFile = path.join(runDir, "server.log");
  const log = fs.createWriteStream(logFile);
  proc.stdout.pipe(log);
  proc.stderr.pipe(log);
  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(baseUrl, proc);
  return { proc, baseUrl, logFile };
}

function rectOverlap(a, b) {
  if (!a || !b || a.hidden || b.hidden) return false;
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function inspectPage(page) {
  return page.evaluate(() => {
    function rect(selector) {
      const node = document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return {
        selector,
        hidden: style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0,
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
        text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160),
        overflowX: node.scrollWidth > node.clientWidth + 2,
        overflowY: node.scrollHeight > node.clientHeight + 2,
      };
    }
    const videos = [...document.querySelectorAll(".memia-video")].map((video) => ({
      src: video.currentSrc || video.src,
      active: Boolean(video.closest(".memia-scene.is-active")),
      readyState: video.readyState,
      paused: video.paused,
      width: video.videoWidth,
      height: video.videoHeight,
    }));
    const selectors = [
      "[data-memia-root]",
      ".memia-topline h1",
      ".memia-deck",
      ".memia-caption-block",
      "[data-memia-review-panel]",
      "[data-memia-share-actions]",
      "[data-memia-avatar-safe]",
    ];
    return {
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      textLength: document.body.innerText.length,
      rects: Object.fromEntries(selectors.map((selector) => [selector, rect(selector)])),
      videos,
      activeScenes: document.querySelectorAll(".memia-scene.is-active").length,
      bodyDashboard: document.body.dataset.dashboard || "",
    };
  });
}

function findingsFor(metrics, screenshotSize, viewportName) {
  const findings = [];
  const rects = metrics.rects || {};
  const root = rects["[data-memia-root]"];
  const title = rects[".memia-topline h1"];
  const caption = rects[".memia-caption-block"];
  const rail = rects["[data-memia-review-panel]"];
  const actions = rects["[data-memia-share-actions]"];
  const safe = rects["[data-memia-avatar-safe]"];

  if (!root || root.width < 100 || root.height < 100) findings.push("root scene missing or collapsed");
  if (!title || title.overflowX || title.width < 80 || title.bottom > metrics.viewport.height) {
    findings.push("headline is missing or overflowing");
  }
  if (!caption || caption.overflowX || caption.overflowY) findings.push("caption block is missing or overflowing");
  if (!actions || actions.hidden || actions.width < 80) findings.push("share actions are not visible");
  if (!metrics.videos.length) findings.push("no video elements found");
  const localVideos = metrics.videos.filter((video) => {
    try {
      const parsed = new URL(video.src);
      return ["127.0.0.1", "localhost"].includes(parsed.hostname) && fs.existsSync(path.join(ROOT, "public", decodeURIComponent(parsed.pathname)));
    } catch (_) {
      return false;
    }
  });
  if (!localVideos.length) findings.push("video assets are not present in public/");
  if (metrics.activeScenes !== 1) findings.push("exactly one active scene should be visible");
  if (screenshotSize < 20000) findings.push("screenshot is suspiciously small or blank");
  if (viewportName === "desktop") {
    if (rectOverlap(caption, safe)) findings.push("caption overlaps lower-right Kat safe zone");
    if (rectOverlap(rail, safe)) findings.push("right rail overlaps lower-right Kat safe zone");
  }
  return findings;
}

async function reviewChannel(browser, baseUrl, runDir, channelId, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  page.setDefaultTimeout(8000);
  const url = `${baseUrl}/dashboards/${channelId}/?kiosk=1`;
  const screenshotFile = path.join(runDir, `${channelId}-${viewport.name}.png`);
  const browserMessages = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      browserMessages.push(`${message.type()}: ${message.text()}`.slice(0, 300));
    }
  });
  page.on("pageerror", (err) => {
    browserMessages.push(`pageerror: ${err.message}`.slice(0, 300));
  });
  await page.route("**/*", (route) => {
    const requestUrl = route.request().url();
    try {
      const parsed = new URL(requestUrl);
      if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
        return route.abort("blockedbyclient");
      }
    } catch (_) {
      return route.continue();
    }
    return route.continue();
  });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 12000 });
    await page.waitForSelector("[data-memia-root]", { state: "attached", timeout: 8000 });
    await page.waitForTimeout(700);
    const metrics = await inspectPage(page);
    await page.screenshot({ path: screenshotFile, fullPage: false });
    const screenshotSize = fs.statSync(screenshotFile).size;
    const findings = findingsFor(metrics, screenshotSize, viewport.name);
    const relevantMessages = browserMessages.filter((message) => !/ERR_BLOCKED_BY_CLIENT|cdn\.jsdelivr|Inspector/i.test(message));
    if (relevantMessages.length) findings.push(...relevantMessages.map((message) => `browser ${message}`));
    return {
      viewport: viewport.name,
      url,
      screenshot: path.relative(ROOT, screenshotFile),
      screenshotSize,
      status: findings.length ? "fail" : "pass",
      findings,
      metrics,
    };
  } catch (err) {
    await page.screenshot({ path: screenshotFile, fullPage: false }).catch(() => {});
    const htmlFile = path.join(runDir, `${channelId}-${viewport.name}.html`);
    await fs.promises.writeFile(htmlFile, await page.content().catch(() => ""));
    return {
      viewport: viewport.name,
      url,
      screenshot: fs.existsSync(screenshotFile) ? path.relative(ROOT, screenshotFile) : null,
      html: path.relative(ROOT, htmlFile),
      screenshotSize: fs.existsSync(screenshotFile) ? fs.statSync(screenshotFile).size : 0,
      status: "fail",
      findings: [
        `review failed: ${err.message}`,
        ...browserMessages.map((message) => `browser ${message}`),
      ],
      metrics: null,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function main() {
  ensureCapsules();
  const runDir = path.join(ARTIFACT_ROOT, nowSlug());
  fs.mkdirSync(runDir, { recursive: true });

  let server = null;
  let browser = null;
  try {
    server = await startServer(runDir);
    const playwright = require("playwright");
    const browserType = playwright[BROWSER_NAME];
    if (!browserType) throw new Error(`Unsupported Playwright browser: ${BROWSER_NAME}`);
    browser = await browserType.launch({ headless: true });
    const channels = [];
    for (const channelId of CHANNELS) {
      const reviews = [];
      for (const viewport of VIEWPORTS) {
        reviews.push(await reviewChannel(browser, server.baseUrl, runDir, channelId, viewport));
      }
      const status = reviews.every((review) => review.status === "pass") ? "pass" : "fail";
      const capsule = readCapsule(channelId);
      capsule.review.lastRun = {
        status,
        reviewedAt: new Date().toISOString(),
        report: path.relative(ROOT, path.join(runDir, "report.json")),
        findings: reviews.flatMap((review) => review.findings.map((finding) => `${review.viewport}: ${finding}`)),
      };
      writeCapsule(channelId, capsule);
      channels.push({ channelId, status, reviews });
    }
    const report = {
      ok: channels.every((channel) => channel.status === "pass"),
      generatedAt: new Date().toISOString(),
      browser: BROWSER_NAME,
      baseUrl: server.baseUrl,
      channels,
    };
    const reportFile = path.join(runDir, "report.json");
    fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({
      ok: report.ok,
      report: path.relative(ROOT, reportFile),
      channels: channels.map((channel) => ({
        channelId: channel.channelId,
        status: channel.status,
        findings: channel.reviews.flatMap((review) => review.findings),
      })),
    }, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server?.proc && server.proc.exitCode === null) server.proc.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err.stack || err.message || String(err));
  process.exit(1);
});
