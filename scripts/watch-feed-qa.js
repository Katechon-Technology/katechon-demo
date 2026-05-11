#!/usr/bin/env node

const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertQa(condition, message, evidence = {}) {
  if (!condition) {
    const err = new Error(message);
    err.evidence = evidence;
    throw err;
  }
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

async function waitForJson(url, timeoutMs = 20000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return response.json();
      lastError = new Error(`${response.status} ${response.statusText}`);
    } catch (err) {
      lastError = err;
    }
    await sleep(180);
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError?.message || "no response"}`);
}

async function startServer() {
  if (process.env.QA_BASE_URL) {
    return { baseUrl: process.env.QA_BASE_URL.replace(/\/+$/, "/"), cleanup: async () => {} };
  }
  const port = await findOpenPort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "katechon-watch-feed-qa-"));
  const child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      DASHBOARD_OVERRIDES_FILE: path.join(dataDir, "dashboard-overrides.json"),
      CHANNEL_SESSIONS_FILE: path.join(dataDir, "channel-sessions.json"),
      CHANNEL_SHARES_FILE: path.join(dataDir, "channel-shares.json"),
      USER_DB_FILE: path.join(dataDir, "users.json"),
      LIVE_API_TIMEOUT_MS: "1",
      EIA_API_TIMEOUT_MS: "1",
      EXTERNAL_DASHBOARD_UPSTREAMS: "0",
      STREAM_AUDIO_ENABLED: "0",
      DASHBOARD_NARRATION_TTS: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  const baseUrl = `http://127.0.0.1:${port}/`;
  try {
    await waitForJson(new URL("/api/channels", baseUrl));
  } catch (err) {
    child.kill("SIGTERM");
    throw new Error(`Could not start server: ${err.message}\n${output.slice(-2000)}`);
  }
  return {
    baseUrl,
    cleanup: async () => {
      if (!child.killed) child.kill("SIGTERM");
      await sleep(250);
    },
  };
}

function chromeExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  for (const bin of ["google-chrome", "chromium", "chromium-browser"]) {
    try {
      return execFileSync("which", [bin], { encoding: "utf8" }).trim();
    } catch (_) {}
  }
  return undefined;
}

async function activeDashboardId(page) {
  return page.evaluate(() => document.querySelector(".dashboard-frame.active")?.dataset.dashboardId || "");
}

async function activeFrameText(page) {
  const frameHandle = await page.$(".dashboard-frame.active");
  if (!frameHandle) return "";
  const frame = await frameHandle.contentFrame();
  if (!frame) return "";
  return frame.evaluate(() => document.body.innerText);
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: chromeExecutable(),
    headless: true,
    args: [
      "--no-sandbox",
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
    ],
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(server.baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("body.watch-mode", { timeout: 12000 });
    await page.waitForSelector("#watch-shell:not([hidden])", { timeout: 12000 });
    await page.waitForSelector(".dashboard-frame.active[data-dashboard-id='meme-coin']", { timeout: 12000 });
    await page.waitForFunction(() => {
      const frame = document.querySelector(".dashboard-frame.active");
      return frame &&
        !frame.classList.contains("incoming") &&
        !frame.classList.contains("outgoing") &&
        !/blur/.test(getComputedStyle(frame).filter);
    }, null, { timeout: 12000 });

    const firstState = await page.evaluate(() => ({
      watchMode: document.body.classList.contains("watch-mode"),
      playing: document.body.classList.contains("watch-playing"),
      gridVisible: getComputedStyle(document.getElementById("main-overlay")).display !== "none",
      statusVisible: getComputedStyle(document.getElementById("status")).display !== "none",
      katControlPresent: Boolean(document.getElementById("kat-control-panel")),
      watchPanelPresent: Boolean(document.querySelector(".watch-kat-panel")),
      playButtonPresent: Boolean(document.getElementById("watch-play")),
      speechButtonVisible: Boolean(document.getElementById("speech-btn")?.getClientRects().length),
      activeFilter: getComputedStyle(document.querySelector(".dashboard-frame.active")).filter,
      channelRailPresent: Boolean(document.querySelector(".watch-channel-rail")),
      channelButtonCount: document.querySelectorAll("[data-watch-channel]").length,
      visibleText: document.body.innerText,
    }));
    assertQa(firstState.watchMode, "root did not enter watch mode", firstState);
    assertQa(!firstState.playing, "watch mode should wait for keyboard push-to-talk activation", firstState);
    assertQa(!firstState.gridVisible, "broad grid is visible by default", firstState);
    assertQa(!firstState.statusVisible, "status chrome is visible by default", firstState);
    assertQa(!firstState.katControlPresent && !firstState.watchPanelPresent && !firstState.playButtonPresent, "Kat control panel is still present", firstState);
    assertQa(!firstState.speechButtonVisible, "legacy speech button is visible", firstState);
    assertQa(!/brightness\(0\.58\)/.test(firstState.activeFilter), "active surface is dimmed behind removed controls", firstState);
    assertQa(!firstState.channelRailPresent && firstState.channelButtonCount === 0, "channel name boxes are visible", firstState);
    assertQa(!/\bconnecting\.\.\.|Legacy|Kat control|Play Kat|Hold to ask Kat|View Grid\b/i.test(firstState.visibleText), "legacy/status copy visible", {
      visibleText: firstState.visibleText.slice(0, 1000),
    });

    await page.keyboard.down("Space");
    await page.waitForFunction(() => {
      const speechButton = document.getElementById("speech-btn");
      return speechButton?.classList.contains("listening") || speechButton?.classList.contains("connecting");
    }, null, { timeout: 8000 });
    const pttState = await page.evaluate(() => ({
      activeDashboard: document.querySelector(".dashboard-frame.active")?.dataset.dashboardId || "",
      listening: document.getElementById("speech-btn")?.classList.contains("listening"),
      connecting: document.getElementById("speech-btn")?.classList.contains("connecting"),
      playing: document.body.classList.contains("watch-playing"),
    }));
    assertQa(pttState.activeDashboard === "meme-coin", "space bar changed channel instead of starting push-to-talk", pttState);
    assertQa(pttState.listening || pttState.connecting, "space bar did not start push-to-talk", pttState);
    assertQa(pttState.playing, "push-to-talk did not activate watch mode", pttState);
    await page.keyboard.up("Space");

    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(() => document.querySelector(".dashboard-frame.active")?.dataset.dashboardId === "polyrec", null, { timeout: 8000 });
    assertQa(await activeDashboardId(page) === "polyrec", "ArrowDown did not move to Bets");

    await page.keyboard.press("ArrowUp");
    await page.waitForFunction(() => document.querySelector(".dashboard-frame.active")?.dataset.dashboardId === "meme-coin", null, { timeout: 8000 });
    assertQa(await activeDashboardId(page) === "meme-coin", "ArrowUp did not move back to Meme");

    await page.locator("#watch-input-layer").dispatchEvent("wheel", { deltaY: 150, bubbles: true, cancelable: true });
    await page.waitForFunction(() => document.querySelector(".dashboard-frame.active")?.dataset.dashboardId === "polyrec", null, { timeout: 8000 });
    assertQa(await activeDashboardId(page) === "polyrec", "vertical scroll did not move to Bets");

    const visibleText = `${await page.evaluate(() => document.body.innerText)}\n${await activeFrameText(page)}`;
    assertQa(!/api\.coingecko\.com|429|No Faculty Data Available|provider fallback failed|channel fallback failed/i.test(visibleText), "raw provider or mismatched empty-state copy is visible", {
      visibleText: visibleText.slice(0, 1600),
    });

    console.log(JSON.stringify({
      ok: true,
      baseUrl: server.baseUrl,
      checks: [
        "desktop root opens watch mode",
        "channel name boxes are removed",
        "grid/status/legacy chrome and Kat panels hidden",
        "space bar starts push-to-talk without changing channel",
        "arrow keys change focused channel",
        "vertical scroll changes focused channel",
        "raw provider errors absent from visible copy",
      ],
    }, null, 2));
  } finally {
    await browser.close().catch(() => {});
    await server.cleanup();
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: err.message, evidence: err.evidence || null }, null, 2));
  process.exit(1);
});
