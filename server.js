const path = require("path");
const fs = require("fs");
const net = require("net");
require("dotenv").config();

function loadEnvKeyFromFile(file, key) {
  if (process.env[key] || !fs.existsSync(file)) return;
  const prefix = `${key}=`;
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  if (!line) return;
  process.env[key] = line.slice(prefix.length).trim().replace(/^['"]|['"]$/g, "");
}

const katechonAppEnv = path.join(__dirname, "..", "katechon-app", ".env.local");
loadEnvKeyFromFile(katechonAppEnv, "ELEVENLABS_API_KEY");
loadEnvKeyFromFile(katechonAppEnv, "ELEVENLABS_MODEL_ID");
loadEnvKeyFromFile(katechonAppEnv, "ANTHROPIC_API_KEY");

const express = require("express");
const fetch = require("node-fetch");
const FormData = require("form-data");
const {
  absoluteUrl,
  dashboardImagePath,
  dashboardLaunchPath,
  dashboardShareMetadata,
  dashboardSharePath,
  normalizeDashboardId,
  renderDashboardShareHtml,
} = require("./dashboard-share");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const BROKER_URL = "https://api.claudetorio.ai";
const BROKER_KEY = "tjkwns%gow214";
const HLS_CONTROL_URL = process.env.HLS_CONTROL_URL || "http://localhost:9095";
const VOICES = {
  app: "pFZP5JQG7iQjIQuC4Bku",
  pitch: "jqcCZkN6Knx8BJ5TBdYR",
};
const VOICE_SOURCE = process.env.KAT_VOICE_SOURCE || "pitch";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || VOICES[VOICE_SOURCE] || VOICES.pitch;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2";
const ELEVENLABS_TIMEOUT_MS = Number(process.env.ELEVENLABS_TIMEOUT_MS || 8000);
const KATECHON_TTS_PRONUNCIATION = process.env.KATECHON_TTS_PRONUNCIATION || "Kat-eh-kon";
const WELCOME_MESSAGE =
  process.env.KATECHON_WELCOME_MESSAGE ||
  "Welcome to Katechon Technology. This is a live software channel for narrated dashboards: intelligence rooms, market surfaces, research tools, and interactive agents you can watch, browse, and command in real time.";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DASHBOARD_NARRATION_REMOTE = process.env.DASHBOARD_NARRATION_REMOTE === "1";
const DASHBOARD_NARRATION_TTS = process.env.DASHBOARD_NARRATION_TTS !== "0";
const STREAM_AUDIO_ENABLED = process.env.STREAM_AUDIO_ENABLED === "1";
const EXTERNAL_DASHBOARD_UPSTREAMS_ENABLED = process.env.EXTERNAL_DASHBOARD_UPSTREAMS === "1";
const HLS_PROXY_TIMEOUT_MS = Number(process.env.HLS_PROXY_TIMEOUT_MS || 15000);
const SPEECH_CACHE_MAX = Number(process.env.SPEECH_CACHE_MAX || 250);
const PITCH_DECK_URL = process.env.PITCH_DECK_URL || "http://127.0.0.1:5174/deck/";
const PITCH_DECK_DIST_DIR = path.resolve(__dirname, process.env.PITCH_DECK_DIST_DIR || "../katechon-pitch/dist");
const DUNE_DECK_DIR = path.join(__dirname, "public", "decks", "dune");
const USER_DB_FILE = path.resolve(__dirname, process.env.USER_DB_FILE || "data/users.json");
const SPECTRE_PROXY_PREFIX = "/dashboards/spectre";
const SPECTRE_DASHBOARD_UPSTREAMS = [
  process.env.SPECTRE_DASHBOARD_URL,
  process.env.SPECTRE_URL,
  "http://127.0.0.1:3010",
  "http://127.0.0.1:9092",
]
  .filter(Boolean)
  .map((url) => String(url).replace(/\/+$/, ""))
  .filter((url, index, all) => all.indexOf(url) === index);
const NEWS_DASHBOARD_UPSTREAMS = [
  process.env.NEWS_DASHBOARD_URL,
  process.env.KATECHON_APP_URL,
  "http://127.0.0.1:4060",
  "http://127.0.0.1:3000",
]
  .filter(Boolean)
  .map((url) => String(url).replace(/\/+$/, ""))
  .filter((url, index, all) => all.indexOf(url) === index);
const EXTERNAL_DASHBOARDS = {
  "world-monitor": {
    label: "World Monitor",
    headline: "Geopolitical intelligence, news, and markets",
    sourceUrl: "https://github.com/koala73/worldmonitor",
    upstreams: [process.env.WORLD_MONITOR_DASHBOARD_URL, process.env.WORLD_MONITOR_URL, "http://127.0.0.1:5173"],
    launch: "git clone https://github.com/koala73/worldmonitor.git && cd worldmonitor && npm install && npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
    notes: ["Vite app", "No basic env required", "Expected local port 5173"],
  },
  glance: {
    label: "Glance",
    headline: "Self-hosted news, feeds, weather, and markets",
    sourceUrl: "https://github.com/glanceapp/glance",
    upstreams: [process.env.GLANCE_DASHBOARD_URL, process.env.GLANCE_URL, "http://127.0.0.1:8080"],
    launch: "docker run --rm -p 8080:8080 -v ./glance-config:/app/config glanceapp/glance:latest -config /app/config/glance.yml",
    notes: ["Docker or single binary", "YAML-configured widgets", "Expected local port 8080"],
  },
  "crypto-trading": {
    label: "Crypto Trading",
    headline: "Streamlit strategy dashboard and live crypto charts",
    sourceUrl: "https://github.com/20wiz/crypto-trading-dashboard",
    upstreams: [process.env.CRYPTO_TRADING_DASHBOARD_URL, process.env.CRYPTO_DASHBOARD_URL, "http://127.0.0.1:8501"],
    launch: "git clone https://github.com/20wiz/crypto-trading-dashboard.git && cd crypto-trading-dashboard && streamlit run main.py --server.port 8501",
    notes: ["Streamlit app", "Python dependencies required", "Expected local port 8501"],
  },
  polyrec: {
    label: "Polyrec",
    headline: "Polymarket BTC terminal dashboard and backtests",
    sourceUrl: "https://github.com/txbabaxyz/polyrec",
    upstreams: [process.env.POLYREC_DASHBOARD_URL, process.env.POLYREC_URL],
    launch: "git clone https://github.com/txbabaxyz/polyrec.git && cd polyrec && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python dash.py",
    notes: ["Terminal-first app", "Set POLYREC_DASHBOARD_URL to a ttyd/gotty wrapper", "Chainlink script path may need adjustment"],
  },
  dashboard123: {
    label: "Market Pulse",
    headline: "Macro, sentiment, technicals, market breadth, and portfolio context",
    sourceUrl: "https://github.com/Algoman123/Dashboard123",
    upstreams: [process.env.DASHBOARD123_DASHBOARD_URL, process.env.DASHBOARD123_URL, "http://127.0.0.1:8510"],
    launch: "git clone https://github.com/Algoman123/Dashboard123.git && cd Dashboard123 && streamlit run app.py --server.port 8510",
    notes: ["Streamlit app", "Works partially without P123 API keys", "Expected local port 8510"],
  },
  arena: {
    label: "AI Arena",
    headline: "Live AI vs AI head-to-head battle — competing models, one task, judged in real time",
    sourceUrl: "https://github.com/katechon/arena",
    upstreams: [process.env.ARENA_DASHBOARD_URL, process.env.ARENA_URL, "http://127.0.0.1:8520"],
    launch: "# Set ARENA_DASHBOARD_URL in .env to point at your arena app",
    notes: ["Configure ARENA_DASHBOARD_URL env var", "Expected local port 8520"],
  },
  biotech: {
    label: "Biotech",
    headline: "CRISPR, protein folding, and nanoscale biology intelligence",
    sourceUrl: "https://github.com/katechon/biotech",
    upstreams: [process.env.BIOTECH_DASHBOARD_URL, process.env.BIOTECH_URL, "http://127.0.0.1:8521"],
    launch: "# Set BIOTECH_DASHBOARD_URL in .env",
    notes: ["Configure BIOTECH_DASHBOARD_URL env var", "Expected local port 8521"],
  },
  space: {
    label: "Deep Space",
    headline: "Pulsar timing, exoplanet transit, and deep field signal intelligence",
    sourceUrl: "https://github.com/katechon/space",
    upstreams: [process.env.SPACE_DASHBOARD_URL, process.env.SPACE_URL, "http://127.0.0.1:8522"],
    launch: "# Set SPACE_DASHBOARD_URL in .env",
    notes: ["Configure SPACE_DASHBOARD_URL env var", "Expected local port 8522"],
  },
  iran: {
    label: "Iran Signal",
    headline: "Geopolitical signal tracker — infrastructure nodes, orbital coverage, regional intelligence",
    sourceUrl: "https://github.com/katechon/iran",
    upstreams: [process.env.IRAN_DASHBOARD_URL, process.env.IRAN_URL, "http://127.0.0.1:8523"],
    launch: "# Set IRAN_DASHBOARD_URL in .env",
    notes: ["Configure IRAN_DASHBOARD_URL env var", "Expected local port 8523"],
  },
  "meme-coin": {
    label: "Meme Coin",
    headline: "Degen crypto terminal — meme coin price action, social sentiment, cult market dynamics",
    sourceUrl: "https://github.com/katechon/meme-coin",
    upstreams: [process.env.MEME_COIN_DASHBOARD_URL, process.env.MEME_COIN_URL, "http://127.0.0.1:8524"],
    launch: "# Set MEME_COIN_DASHBOARD_URL in .env",
    notes: ["Configure MEME_COIN_DASHBOARD_URL env var", "Expected local port 8524"],
  },
  quantum: {
    label: "Quantum States",
    headline: "Qubit coherence windows, entanglement fidelity, and error correction benchmarks",
    sourceUrl: "https://github.com/katechon/quantum",
    upstreams: [process.env.QUANTUM_DASHBOARD_URL, process.env.QUANTUM_URL, "http://127.0.0.1:8525"],
    launch: "# Set QUANTUM_DASHBOARD_URL in .env",
    notes: ["Configure QUANTUM_DASHBOARD_URL env var", "Expected local port 8525"],
  },
  "deep-sea": {
    label: "Abyssal Monitor",
    headline: "Hydrothermal vent activity, pressure anomalies, and abyssal sensor network",
    sourceUrl: "https://github.com/katechon/deep-sea",
    upstreams: [process.env.DEEP_SEA_DASHBOARD_URL, process.env.DEEP_SEA_URL, "http://127.0.0.1:8526"],
    launch: "# Set DEEP_SEA_DASHBOARD_URL in .env",
    notes: ["Configure DEEP_SEA_DASHBOARD_URL env var", "Expected local port 8526"],
  },
  "power-grid": {
    label: "Power Grid",
    headline: "Continental load balancing, cascade fault detection, and transmission corridor stress",
    sourceUrl: "https://github.com/katechon/power-grid",
    upstreams: [process.env.POWER_GRID_DASHBOARD_URL, process.env.POWER_GRID_URL, "http://127.0.0.1:8527"],
    launch: "# Set POWER_GRID_DASHBOARD_URL in .env",
    notes: ["Configure POWER_GRID_DASHBOARD_URL env var", "Expected local port 8527"],
  },
  viral: {
    label: "Viral Spread",
    headline: "R0 estimates, contact network graphs, and outbreak trajectory projections",
    sourceUrl: "https://github.com/katechon/viral",
    upstreams: [process.env.VIRAL_DASHBOARD_URL, process.env.VIRAL_URL, "http://127.0.0.1:8528"],
    launch: "# Set VIRAL_DASHBOARD_URL in .env",
    notes: ["Configure VIRAL_DASHBOARD_URL env var", "Expected local port 8528"],
  },
  "dark-forest": {
    label: "Dark Forest",
    headline: "Anomalous stellar dimming events and unexplained astronomical signal patterns",
    sourceUrl: "https://github.com/katechon/dark-forest",
    upstreams: [process.env.DARK_FOREST_DASHBOARD_URL, process.env.DARK_FOREST_URL, "http://127.0.0.1:8529"],
    launch: "# Set DARK_FOREST_DASHBOARD_URL in .env",
    notes: ["Configure DARK_FOREST_DASHBOARD_URL env var", "Expected local port 8529"],
  },
};

for (const dashboard of Object.values(EXTERNAL_DASHBOARDS)) {
  dashboard.upstreams = dashboard.upstreams
    .filter(Boolean)
    .map((url) => String(url).replace(/\/+$/, ""))
    .filter((url, index, all) => all.indexOf(url) === index);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function emptyUserDb() {
  return {
    users: {},
    events: [],
  };
}

function readUserDb() {
  if (!fs.existsSync(USER_DB_FILE)) return emptyUserDb();
  const raw = fs.readFileSync(USER_DB_FILE, "utf8").trim();
  if (!raw) return emptyUserDb();
  const db = JSON.parse(raw);
  return {
    users: db.users && typeof db.users === "object" ? db.users : {},
    events: Array.isArray(db.events) ? db.events : [],
  };
}

function writeUserDb(db) {
  fs.mkdirSync(path.dirname(USER_DB_FILE), { recursive: true });
  const tmpFile = `${USER_DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify(db, null, 2)}\n`);
  fs.renameSync(tmpFile, USER_DB_FILE);
}

function recordUserEmail(email) {
  const db = readUserDb();
  const now = new Date().toISOString();
  const existing = db.users[email];
  const action = existing ? "login" : "signup";

  db.users[email] = {
    email,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    lastLoginAt: now,
    loginCount: (existing?.loginCount || 0) + 1,
  };
  db.events.push({
    email,
    action,
    at: now,
  });

  writeUserDb(db);
  return { action, user: db.users[email] };
}

async function proxyHls(req, res) {
  try {
    const upstream = await fetch(`${HLS_CONTROL_URL}${req.path}`, { timeout: HLS_PROXY_TIMEOUT_MS });
    if (!upstream.ok) {
      return res.status(upstream.status).send(await upstream.text());
    }

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(await upstream.buffer());
  } catch (err) {
    res.status(502).send(`HLS proxy failed: ${err.message}`);
  }
}

const PANELS = [
  {
    id: "landing",
    label: "main panel",
    description: "The main Katechon panel with available demos/apps.",
  },
  {
    id: "spectre",
    label: "SPECTRE Event Room",
    description: "The hero OSINT/intelligence dashboard channel with maps, signals, analyst posture, and narration.",
  },
  {
    id: "news",
    label: "News Situation Room",
    description: "A live-feeling news dashboard with source cards, timeline updates, topic clusters, and narration.",
  },
  {
    id: "world-monitor",
    label: "World Monitor",
    description: "Geopolitical intelligence dashboard with maps, briefs, risk signals, and markets context.",
  },
  {
    id: "glance",
    label: "Glance",
    description: "Self-hosted feeds, news, weather, videos, and market widgets in one dashboard.",
  },
  {
    id: "crypto-trading",
    label: "Crypto Trading",
    description: "Streamlit crypto markets dashboard with strategy backtesting and live signals.",
  },
  {
    id: "polyrec",
    label: "Polyrec",
    description: "Terminal dashboard for Polymarket BTC prediction markets and backtesting.",
  },
  {
    id: "dashboard123",
    label: "Market Pulse",
    description: "Professional markets dashboard with breadth, macro pressure, sentiment, technicals, and portfolio context.",
  },
  {
    id: "arena",
    label: "AI Arena",
    description: "Live AI agent vs AI agent battle arena — competing models running head-to-head tasks in real time.",
  },
  {
    id: "biotech",
    label: "Biotech",
    description: "CRISPR, protein folding, and nanoscale biology intelligence dashboard.",
  },
  {
    id: "space",
    label: "Deep Space",
    description: "Deep field observatory — pulsar timing, exoplanet transit, and signal intelligence from the edge of the galaxy.",
  },
  {
    id: "iran",
    label: "Iran Signal",
    description: "Geopolitical signal tracker for Iran — infrastructure nodes, orbital coverage, and regional intelligence.",
  },
  {
    id: "meme-coin",
    label: "Meme Coin",
    description: "Degen crypto terminal — meme coin price action, social sentiment, and cult market dynamics.",
  },
  {
    id: "quantum",
    label: "Quantum States",
    description: "Quantum computing monitor — qubit coherence, entanglement maps, and decoherence event tracking.",
  },
  {
    id: "deep-sea",
    label: "Abyssal Monitor",
    description: "Deep sea sensor network — hydrothermal activity, abyssal pressure readings, and bioluminescent event logs.",
  },
  {
    id: "power-grid",
    label: "Power Grid",
    description: "Continental power grid monitor — load balancing flows, cascade fault detection, and infrastructure risk.",
  },
  {
    id: "viral",
    label: "Viral Spread",
    description: "Epidemiological transmission model — R0 curves, contact network graphs, and outbreak trajectory.",
  },
  {
    id: "dark-forest",
    label: "Dark Forest",
    description: "Fermi paradox signal monitor — anomalous stellar event tracking and unexplained astronomical dimming.",
  },
  {
    id: "dune-deck",
    label: "Katechon x Dune Dashboard",
    description: "Copied Katechon x Dune fundraise deck with per-slide avatar narration and generated visuals.",
  },
];

// Session IDs tracked at runtime — pre-seed known sessions
const state = {
  sessions: {
    minecraft: process.env.MINECRAFT_SESSION_ID || "minecraft-3161c210",
    news: process.env.NEWS_SESSION_ID || "playwright-browser-385b1d22",
  },
  currentWorkspace: "landing",
};

function remoteWorkspaceFor(workspace) {
  return workspace === "spectre" ? "landing" : workspace;
}

const DASHBOARD_NARRATION = {
  spectre: {
    label: "SPECTRE Event Room",
    voice:
      "You are Kat narrating a live OSINT dashboard. Keep it sharp, observational, and useful. " +
      "React to intelligence workflows, maps, signals, risk, and analyst posture without inventing specific facts.",
    fallback: [
      "SPECTRE is online. I'm watching the signal layer for anything that deserves attention.",
      "This is the OSINT board. Maps, feeds, and posture signals are all in view.",
      "I'm scanning the dashboard like an analyst: movement first, corroboration second.",
      "The useful part here is correlation. One signal is noise, patterns are where the story starts.",
    ],
  },
  news: {
    label: "News Situation Room",
    voice:
      "You are Kat narrating a generative news broadcast surface. Keep it cinematic, sharp, and tied to live news " +
      "signals, generated imagery, source fusion, and editorial judgment without inventing specific new facts.",
    fallback: [
      "The news surface is live. I'm watching the generator turn source signals into a visual rundown.",
      "This is the generative broadcast board. Images, sources, and narration are being assembled in real time.",
      "I'm treating this like a newsroom stack: lead signal first, corroboration second, visuals only where they clarify.",
      "The image pipeline is the tell here. It should make the story easier to inspect, not louder than the facts.",
    ],
  },
  "world-monitor": {
    label: "World Monitor geopolitical intelligence dashboard",
    voice:
      "You are Kat narrating World Monitor, a geopolitical intelligence dashboard with maps, conflict signals, " +
      "market context, country risk, and synthesized news briefs. Stay precise and do not invent live events.",
    fallback: [
      "World Monitor is queued. I'm reading the map like a risk surface, not a headline board.",
      "This panel is built for geopolitical context: feeds, instability signals, and market pressure in one view.",
      "The useful motion here is correlation between news flow, geography, and finance.",
      "I'm watching for clusters, not single alerts. One marker is a note; convergence is the story.",
    ],
  },
  glance: {
    label: "Glance news and markets dashboard",
    voice:
      "You are Kat narrating Glance, a clean self-hosted dashboard for RSS, Hacker News, Reddit, YouTube, weather, " +
      "and market widgets. Keep the narration concise and operational.",
    fallback: [
      "Glance is the daily scan board: feeds, markets, weather, and source streams in one compact pass.",
      "This surface is about speed. The viewer should get the morning read without hunting through tabs.",
      "I'm treating Glance like a source triage wall: quick signals first, deeper context after.",
      "Markets and feeds sit together here, which makes the day feel easier to parse.",
    ],
  },
  "crypto-trading": {
    label: "crypto trading dashboard",
    voice:
      "You are Kat narrating a crypto trading dashboard with live exchange data, charting, strategy settings, " +
      "backtests, and signal widgets. Be sharp, practical, and avoid financial advice.",
    fallback: [
      "The crypto trading board is up. Charts, strategy controls, and backtests belong in the same loop.",
      "I'm watching this as a trader's workbench: signal quality first, performance claims second.",
      "The right question here is whether the strategy survives the backtest, not whether the chart looks exciting.",
      "Live crypto dashboards need discipline: clear inputs, visible risk, and no magical thinking.",
    ],
  },
  polyrec: {
    label: "Polyrec Polymarket BTC dashboard",
    voice:
      "You are Kat narrating Polyrec, a terminal-style dashboard for Polymarket BTC prediction markets with order books, " +
      "Binance price feeds, Chainlink oracle context, indicators, and backtesting. Avoid trading advice.",
    fallback: [
      "Polyrec is a terminal-grade view: order books, BTC feeds, and prediction market structure.",
      "This panel is built for latency and microstructure, not decoration.",
      "The edge here would come from comparing oracle lag, order book depth, and live BTC movement.",
      "Prediction market dashboards are only useful when the spread, clock, and reference price stay visible.",
    ],
  },
  dashboard123: {
    label: "Market Pulse dashboard",
    voice:
      "You are Kat narrating Dashboard123, a professional stocks and markets dashboard with indices, gainers and losers, " +
      "macro indicators, TradingView charts, news, sentiment, technicals, and portfolio workflows. Avoid financial advice.",
    fallback: [
      "Market Pulse is the broader market station: indices, movers, macro, news, and technicals in one pass.",
      "This is where a portfolio view gets context from macro data and market internals.",
      "I'm reading this like a quant monitor: breadth, factors, sentiment, and headlines before conclusions.",
      "The dashboard is strongest when price action and news context stay side by side.",
    ],
  },
  arena: {
    label: "AI Arena — live AI vs AI battle",
    voice:
      "You are Kat narrating the AI Arena, a live head-to-head battle where two competing AI models run the same " +
      "tasks simultaneously and their outputs are judged in real time. Be sharp, analytical, and treat it like a sport.",
    fallback: [
      "Two models, one task. I'm watching the outputs come in and deciding which one actually did the work.",
      "The arena measures what matters: speed, accuracy, and whether the reasoning actually holds.",
      "Left side is building an argument. Right side is running numbers. Let's see which approach closes first.",
      "This is not a benchmark — it's live. The model that adapts to the prompt variation wins the round.",
    ],
  },
  biotech: {
    label: "Biotech intelligence dashboard",
    voice:
      "You are Kat narrating a biotech intelligence feed covering CRISPR, protein folding, drug pipelines, and nanoscale " +
      "biology. Stay precise, analytical, and avoid making medical claims.",
    fallback: [
      "The biotech feed is live. I'm reading the pipeline signals like a structure map, not a press release.",
      "CRISPR edit efficiency and off-target rates are the two numbers that actually matter here.",
      "Protein folding predictions have changed how we think about target identification. This panel is where that lands.",
      "The gap between a discovery and a viable candidate is where most of the signal gets lost.",
    ],
  },
  space: {
    label: "Deep space observatory dashboard",
    voice:
      "You are Kat narrating a deep space intelligence feed: pulsar timing, exoplanet transits, and long-baseline signal " +
      "analysis. Keep it vast and precise — you are observing, not speculating.",
    fallback: [
      "The observatory is listening. Pulsar timing is the most stable clock we have — anything that disrupts it is worth noting.",
      "Exoplanet transit data is clean when the noise floor is right. I'm watching for the dips.",
      "Deep field surveys change calibration every cycle. The baseline drift is the first thing I check.",
      "At this distance, signal lag is measured in years. Everything I'm reading already happened.",
    ],
  },
  iran: {
    label: "Iran geopolitical signal tracker",
    voice:
      "You are Kat narrating an Iran signal tracker covering infrastructure activity, orbital coverage windows, regional " +
      "threat indicators, and geopolitical pressure points. Be analytical and measured, not alarmist.",
    fallback: [
      "The signal layer is active. I'm reading infrastructure node activity as a pressure indicator, not a prediction.",
      "Orbital coverage gaps are the most operationally relevant variable on this board.",
      "Refinery activity and port throughput are the two most legible signals for economic pressure in this region.",
      "The map reads differently depending on which direction the pressure gradient is moving.",
    ],
  },
  "meme-coin": {
    label: "Meme coin degen terminal",
    voice:
      "You are Kat narrating a meme coin degen terminal. Be dry, darkly funny, and treat it with the same analytical " +
      "seriousness as any other market. No financial advice, no endorsement.",
    fallback: [
      "The altar is active. Social volume is the only leading indicator here — everything else is confirmation bias.",
      "Liquidity on meme coins thins out faster than the narrative. I watch the exit timing, not the entry.",
      "The cult formation pattern is consistent: memetic spike, whale accumulation, retail peak, silence.",
      "This market runs on collective hallucination. The chart is real. The fundamentals are not.",
    ],
  },
  quantum: {
    label: "Quantum computing monitor",
    voice:
      "You are Kat narrating a quantum computing intelligence feed — qubit coherence windows, entanglement fidelity, " +
      "and error correction benchmarks. Be technically precise without inventing current results.",
    fallback: [
      "Coherence time is the limiting variable. Everything else in quantum computing flows from how long the state holds.",
      "Entanglement fidelity above ninety-nine percent is where the interesting work starts. Below that is engineering.",
      "Error correction overhead is the real cost of near-term quantum. The logical qubit count is what I track.",
      "Decoherence events on this board are not failures — they are the measurement.",
    ],
  },
  "deep-sea": {
    label: "Abyssal deep sea monitor",
    voice:
      "You are Kat narrating a deep sea sensor network — hydrothermal vent activity, pressure anomalies, abyssal current " +
      "shifts, and bioluminescent event logs from the ocean floor. Be slow, precise, and vast.",
    fallback: [
      "Vent activity is up along the eastern transect. Thermal plume height is the leading indicator I track first.",
      "The abyssal plain is not static. Current shifts at this depth take months to propagate — I am watching a slow signal.",
      "Pressure anomalies near the mid-ocean ridge are worth flagging. The geometry of the seafloor changes here.",
      "Bioluminescent event logs are the strangest data on this board. Something down here responds to the pressure shifts.",
    ],
  },
  "power-grid": {
    label: "Continental power grid monitor",
    voice:
      "You are Kat narrating a continental power grid monitor — load balancing, cascade fault risk, transmission " +
      "corridor stress, and infrastructure vulnerability. Be infrastructural, precise, and calm.",
    fallback: [
      "Grid frequency deviation is the first signal I check. Anything outside fifty hertz tolerance deserves attention.",
      "Cascade faults propagate faster than operators can manually respond. The automated isolation is what holds the system.",
      "Load balancing across interconnects is mostly invisible until it fails. I'm watching the invisible part.",
      "High transmission corridor stress usually precedes either a controlled shed or an uncontrolled one.",
    ],
  },
  viral: {
    label: "Viral transmission model dashboard",
    voice:
      "You are Kat narrating an epidemiological transmission model — R0 estimates, contact network structure, and outbreak " +
      "trajectory projections. Be analytical and avoid alarmism.",
    fallback: [
      "R0 above one is the only threshold that matters in the early phase. I watch the doubling time, not the absolute count.",
      "Contact network density is the structural variable that determines whether containment is even theoretically possible.",
      "This model runs forward projections under three scenarios. The middle scenario is usually the least useful.",
      "The lag between exposure and detection is where most early outbreak intelligence gets lost.",
    ],
  },
  "dark-forest": {
    label: "Dark Forest anomalous stellar event monitor",
    voice:
      "You are Kat narrating the Dark Forest monitor — a long-baseline watch for anomalous stellar dimming, statistical " +
      "irregularities in star catalogs, and signals that do not fit known natural models. Be measured, quiet, and exact.",
    fallback: [
      "Three stars dimmed in sequence last cycle. The probability of that being thermal noise is low enough to log.",
      "I do not speculate on cause. I track statistical deviation from expected stellar behavior and note when it clusters.",
      "The Fermi observation runs on absence, not presence. What should be here and is not — that is the signal.",
      "Long-baseline watches take patience. The anomaly window is narrow and the data arrives slowly.",
    ],
  },
};
const narrationCursor = {};
const speechCache = new Map();

function requestOrigin(req) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const proto = forwardedProto || req.protocol || "http";
  const host = forwardedHost || req.get("host") || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function requestBasePath(req) {
  return req.path === "/app" || req.path.startsWith("/app/") ? "/app" : "";
}

function sendDashboardSharePage(req, res) {
  const dashboardId = normalizeDashboardId(req.params.dashboard);
  const metadata = dashboardShareMetadata(dashboardId);
  if (!metadata) return res.status(404).send("Unknown dashboard share link");

  const basePath = requestBasePath(req);
  const origin = requestOrigin(req);
  const targetUrl = absoluteUrl(origin, dashboardLaunchPath(metadata.id, basePath));
  const shareUrl = absoluteUrl(origin, dashboardSharePath(metadata.id, basePath));
  const imageUrl = absoluteUrl(origin, dashboardImagePath(metadata.id, basePath));

  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=86400");
  res.send(renderDashboardShareHtml({ metadata, shareUrl, targetUrl, imageUrl }));
}

app.get(["/share/:dashboard", "/app/share/:dashboard"], sendDashboardSharePage);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/stream.m3u8", proxyHls);
app.get(/^\/seg\d+\.ts$/, proxyHls);

function spectreProxyPath(originalUrl) {
  const url = new URL(originalUrl, "http://katechon.local");
  const pathname = url.pathname.slice(SPECTRE_PROXY_PREFIX.length) || "/";
  return `${pathname}${url.search}`;
}

function rewriteSpectreHtml(html) {
  return html
    .replaceAll("fetch('/api/", "fetch('/dashboards/spectre/api/")
    .replaceAll('fetch("/api/', 'fetch("/dashboards/spectre/api/')
    .replaceAll("EventSource('/api/", "EventSource('/dashboards/spectre/api/")
    .replaceAll('EventSource("/api/', 'EventSource("/dashboards/spectre/api/');
}

async function fetchSpectreUpstream(proxyPath, req) {
  let lastErr = null;
  for (const baseUrl of SPECTRE_DASHBOARD_UPSTREAMS) {
    try {
      const upstream = await fetch(`${baseUrl}${proxyPath}`, {
        method: req.method,
        headers: {
          Accept: req.get("accept") || "*/*",
          "User-Agent": req.get("user-agent") || "katechon-demo",
        },
        timeout: proxyPath.startsWith("/api/stream") ? 0 : 8000,
      });
      return { upstream };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("no SPECTRE upstream configured");
}

async function proxySpectreDashboard(req, res) {
  const proxyPath = spectreProxyPath(req.originalUrl);
  try {
    const { upstream } = await fetchSpectreUpstream(proxyPath, req);
    const contentType = upstream.headers.get("content-type") || "";

    if (!upstream.ok) {
      return res.status(upstream.status).send(await upstream.text());
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    if (contentType) res.setHeader("Content-Type", contentType);

    if (contentType.includes("text/event-stream")) {
      res.setHeader("Connection", "keep-alive");
      upstream.body.pipe(res);
      return;
    }

    const body = await upstream.buffer();
    if (contentType.includes("text/html")) {
      res.send(rewriteSpectreHtml(body.toString("utf8")));
      return;
    }

    res.send(body);
  } catch (err) {
    const proxyPathname = new URL(proxyPath, "http://katechon.local").pathname;
    if (proxyPathname === "/" || proxyPathname.startsWith("/demo") || req.get("accept")?.includes("text/html")) {
      return sendPrototypeDashboard(res);
    }
    res.status(502).send(`SPECTRE proxy failed for ${proxyPath}: ${err.message}`);
  }
}

app.get(/^\/dashboards\/spectre(?:\/.*)?$/, proxySpectreDashboard);

function newsProxyPath(originalUrl) {
  const url = new URL(originalUrl, "http://katechon.local");
  if (url.pathname === "/dashboards/news" || url.pathname === "/dashboards/news/") {
    return `/demo${url.search}`;
  }
  if (url.pathname.startsWith("/dashboards/news/")) {
    return `${url.pathname.slice("/dashboards/news".length)}${url.search}`;
  }
  return `${url.pathname}${url.search}`;
}

function newsProxyTimeout(proxyPath) {
  if (proxyPath.startsWith("/api/demo/asset") || proxyPath.startsWith("/api/demo/video")) return 120000;
  if (proxyPath.startsWith("/api/demo/voice") || proxyPath.startsWith("/api/demo/improvement")) return 45000;
  if (proxyPath.startsWith("/_next/webpack-hmr")) return 0;
  return 20000;
}

function rewriteNewsHtml(html) {
  const injected = `
    <style id="katechon-news-embed-tweaks">
      iframe[title="Broadcast avatar"] { display: none !important; }
    </style>
    <script id="katechon-news-embed-script">
      (() => {
        const removeInternalAvatar = () => {
          document.querySelectorAll('iframe[title="Broadcast avatar"]').forEach((frame) => frame.remove());
        };
        new MutationObserver(removeInternalAvatar).observe(document.documentElement, { childList: true, subtree: true });
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", removeInternalAvatar, { once: true });
        } else {
          removeInternalAvatar();
        }
      })();
    </script>
  `;
  return html.includes("</head>") ? html.replace("</head>", `${injected}</head>`) : `${injected}${html}`;
}

async function fetchNewsUpstream(proxyPath, req) {
  let lastErr = null;
  for (const baseUrl of NEWS_DASHBOARD_UPSTREAMS) {
    try {
      const headers = {
        Accept: req.get("accept") || "*/*",
        "User-Agent": req.get("user-agent") || "katechon-demo",
      };
      let body;
      if (!["GET", "HEAD"].includes(req.method)) {
        headers["Content-Type"] = req.get("content-type") || "application/json";
        body = req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : undefined;
      }
      const upstream = await fetch(`${baseUrl}${proxyPath}`, {
        method: req.method,
        headers,
        body,
        timeout: newsProxyTimeout(proxyPath),
      });
      return { upstream };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("no news dashboard upstream configured");
}

async function proxyNewsDashboard(req, res) {
  const proxyPath = newsProxyPath(req.originalUrl);
  try {
    const { upstream } = await fetchNewsUpstream(proxyPath, req);
    const contentType = upstream.headers.get("content-type") || "";
    const cacheControl = upstream.headers.get("cache-control");

    if (contentType) res.setHeader("Content-Type", contentType);
    if (cacheControl) res.setHeader("Cache-Control", cacheControl);
    else res.setHeader("Cache-Control", "no-cache");

    res.status(upstream.status);
    if (contentType.includes("text/html")) {
      const body = await upstream.text();
      res.send(rewriteNewsHtml(body));
      return;
    }

    upstream.body.pipe(res);
  } catch (err) {
    if (proxyPath === "/" || proxyPath.startsWith("/demo") || req.get("accept")?.includes("text/html")) {
      return sendPrototypeDashboard(res);
    }
    res.status(502).send(`News dashboard proxy failed for ${proxyPath}: ${err.message}`);
  }
}

function newsDashboardUpgradePath(originalUrl) {
  return newsProxyPath(originalUrl);
}

function proxyNewsDashboardUpgrade(req, socket, head) {
  const proxyPath = newsDashboardUpgradePath(req.url);
  const upstreams = NEWS_DASHBOARD_UPSTREAMS.filter((url) => {
    try {
      return new URL(url).protocol === "http:";
    } catch {
      return false;
    }
  });

  function connect(index) {
    if (index >= upstreams.length) {
      socket.destroy();
      return;
    }

    const target = new URL(upstreams[index]);
    const port = Number(target.port || 80);
    const upstream = net.connect(port, target.hostname);
    let connected = false;

    upstream.on("connect", () => {
      connected = true;
      const headers = { ...req.headers, host: target.host };
      const headerLines = Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
      upstream.write(`${req.method} ${proxyPath} HTTP/${req.httpVersion}\r\n${headerLines.join("\r\n")}\r\n\r\n`);
      if (head && head.length) upstream.write(head);
      socket.pipe(upstream);
      upstream.pipe(socket);
    });

    upstream.on("error", () => {
      if (connected) {
        socket.destroy();
        return;
      }
      connect(index + 1);
    });
    socket.on("error", () => upstream.destroy());
  }

  connect(0);
}

app.all(/^\/dashboards\/news(?:\/.*)?$/, proxyNewsDashboard);
app.all(/^\/demo(?:\/.*)?$/, proxyNewsDashboard);
app.all(/^\/api\/demo(?:\/.*)?$/, proxyNewsDashboard);
app.all(/^\/_next(?:\/.*)?$/, proxyNewsDashboard);
app.all(/^\/generated\/demo(?:\/.*)?$/, proxyNewsDashboard);
app.all(/^\/soundtracks(?:\/.*)?$/, proxyNewsDashboard);
app.all("/breaking-news-bed.mp3", proxyNewsDashboard);

function externalDashboardId(originalUrl) {
  const url = new URL(originalUrl, "http://katechon.local");
  const match = url.pathname.match(/^\/dashboards\/([^/]+)(?:\/.*)?$/);
  return match ? match[1] : null;
}

function externalDashboardProxyPath(id, originalUrl) {
  const url = new URL(originalUrl, "http://katechon.local");
  const prefix = `/dashboards/${id}`;
  const pathname = url.pathname === prefix ? "/" : url.pathname.slice(prefix.length) || "/";
  return `${pathname}${url.search}`;
}

function rewriteExternalDashboardHtml(id, html) {
  const prefix = `/dashboards/${id}`;
  const baseTag = `<base href="${prefix}/">`;
  const withBase = html.includes("<head")
    ? html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
    : `${baseTag}${html}`;

  return withBase
    .replace(/(href|src|action)=("|')\/(?!\/|dashboards\/)/g, `$1=$2${prefix}/`)
    .replace(/(fetch|EventSource)\(("|')\/(?!\/|dashboards\/)/g, `$1($2${prefix}/`)
    .replace(/url\(\s*\/(?!\/|dashboards\/)/g, `url(${prefix}/`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appendSearch(url, search) {
  if (!search) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${search.slice(1)}`;
}

const LIVE_API_TIMEOUT_MS = Number(process.env.LIVE_API_TIMEOUT_MS || 900);
const LIVE_API_TTL_MS = Number(process.env.LIVE_API_TTL_MS || 12000);
const LIVE_API_CACHE = new Map();

function liveSeed(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function seededFloat(seed, min, max) {
  const n = Math.sin(liveSeed(seed)) * 10000;
  const unit = n - Math.floor(n);
  return min + unit * (max - min);
}

async function fetchLiveJson(url, options = {}) {
  const resp = await fetch(url, {
    timeout: LIVE_API_TIMEOUT_MS,
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  if (!resp.ok) throw new Error(`${new URL(url).hostname} ${resp.status}`);
  return resp.json();
}

async function fetchHyperliquidInfo(body) {
  return fetchLiveJson("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function syntheticCandles(seed, count, base) {
  return Array.from({ length: count }, (_, index) => {
    const open = base + seededFloat(`${seed}:open:${index}`, -base * 0.015, base * 0.015);
    const close = open + seededFloat(`${seed}:close:${index}`, -base * 0.009, base * 0.009);
    return {
      t: Date.now() - (count - index) * 15 * 60 * 1000,
      o: open.toFixed(2),
      h: Math.max(open, close + seededFloat(`${seed}:high:${index}`, 4, base * 0.004)).toFixed(2),
      l: Math.min(open, close - seededFloat(`${seed}:low:${index}`, 4, base * 0.004)).toFixed(2),
      c: close.toFixed(2),
      v: seededFloat(`${seed}:volume:${index}`, 0.4, 18).toFixed(4),
    };
  });
}

function syntheticHyperliquidData(coin = "BTC") {
  const base = coin === "ETH" ? 3400 : coin === "SOL" ? 155 : 68000;
  const mid = base + seededFloat(`${coin}:mid`, -base * 0.018, base * 0.018);
  return {
    coin,
    mid,
    spreadBps: seededFloat(`${coin}:spread`, 2.2, 8.8),
    depthUsd: seededFloat(`${coin}:depth`, 52000, 184000),
    candles: syntheticCandles(coin, 34, mid),
    book: {
      levels: [
        Array.from({ length: 12 }, (_, index) => ({ px: (mid - index * mid * 0.00018).toFixed(2), sz: seededFloat(`${coin}:bid:${index}`, 0.2, 8.4).toFixed(4) })),
        Array.from({ length: 12 }, (_, index) => ({ px: (mid + index * mid * 0.00018).toFixed(2), sz: seededFloat(`${coin}:ask:${index}`, 0.2, 8.4).toFixed(4) })),
      ],
    },
    updatedAt: Date.now(),
  };
}

async function getHyperliquidLiveData(req) {
  const coin = String(req.query.coin || "BTC").toUpperCase().replace(/[^A-Z0-9:_-]/g, "").slice(0, 18) || "BTC";
  const endTime = Date.now();
  const startTime = endTime - 36 * 15 * 60 * 1000;
  const [mids, book, candles] = await Promise.all([
    fetchHyperliquidInfo({ type: "allMids" }),
    fetchHyperliquidInfo({ type: "l2Book", coin }),
    fetchHyperliquidInfo({ type: "candleSnapshot", req: { coin, interval: "15m", startTime, endTime } }),
  ]);
  const bid = Number(book?.levels?.[0]?.[0]?.px);
  const ask = Number(book?.levels?.[1]?.[0]?.px);
  const mid = Number(mids?.[coin]) || (Number.isFinite(bid) && Number.isFinite(ask) ? (bid + ask) / 2 : 0);
  const depthUsd = [...(book?.levels?.[0] || []).slice(0, 8), ...(book?.levels?.[1] || []).slice(0, 8)]
    .reduce((sum, level) => sum + Number(level.px || 0) * Number(level.sz || 0), 0);

  return {
    coin,
    mid,
    spreadBps: mid && Number.isFinite(bid) && Number.isFinite(ask) ? ((ask - bid) / mid) * 10000 : 0,
    depthUsd,
    candles: Array.isArray(candles) ? candles.slice(-36) : [],
    book,
    updatedAt: Date.now(),
  };
}

function parseMaybeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function syntheticPolymarketData() {
  const questions = [
    "Will a major AI model top the live agent benchmark this quarter?",
    "Will BTC close above the watched threshold by Friday?",
    "Will a new orbital launch window open before month end?",
    "Will quantum error correction headline the next research cycle?",
    "Will a geopolitical risk index finish the week elevated?",
  ];
  return {
    markets: questions.map((question, index) => ({
      id: `synthetic-${index}`,
      question,
      yes: seededFloat(`poly:${index}`, 0.22, 0.78),
      no: 1 - seededFloat(`poly:${index}`, 0.22, 0.78),
      volume: Math.round(seededFloat(`poly:volume:${index}`, 8000, 580000)),
      category: ["AI", "Crypto", "Space", "Science", "Politics"][index],
    })),
    updatedAt: Date.now(),
  };
}

async function getPolymarketLiveData() {
  const url = "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=8";
  const markets = await fetchLiveJson(url);
  return {
    markets: (Array.isArray(markets) ? markets : []).slice(0, 8).map((market, index) => {
      const outcomes = parseMaybeJsonArray(market.outcomes);
      const prices = parseMaybeJsonArray(market.outcomePrices).map(Number);
      const yesIndex = outcomes.findIndex((outcome) => String(outcome).toLowerCase() === "yes");
      const yes = Number.isFinite(prices[yesIndex]) ? prices[yesIndex] : Number(prices[0] || seededFloat(`poly-live:${index}`, 0.25, 0.75));
      return {
        id: market.id || market.conditionId || `market-${index}`,
        question: market.question || market.title || "Public prediction market updated.",
        yes,
        no: Math.max(0, 1 - yes),
        volume: Number(market.volumeNum || market.volume || market.liquidity || 0),
        category: market.category || market.tags?.[0]?.label || "market",
      };
    }),
    updatedAt: Date.now(),
  };
}

function syntheticPumpfunData() {
  const names = ["Neon Kat", "Terminal Wif Signal", "Liquidity Ghost", "Meme Reactor", "Bonding Curve Club"];
  return {
    tokens: names.map((name, index) => ({
      name,
      symbol: name.split(" ").map((part) => part[0]).join("").slice(0, 6),
      price: seededFloat(`pump:price:${index}`, 0.00002, 0.018).toFixed(6),
      change1h: seededFloat(`pump:change:${index}`, -18, 42),
      change24h: seededFloat(`pump:change24:${index}`, -32, 118),
      marketCap: `$${Math.round(seededFloat(`pump:mcap:${index}`, 28000, 2800000)).toLocaleString()}`,
    })),
    updatedAt: Date.now(),
  };
}

async function getPumpfunLiveData() {
  const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=pump-fun&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=1h,24h";
  const coins = await fetchLiveJson(url);
  return {
    tokens: (Array.isArray(coins) ? coins : []).slice(0, 10).map((coin) => ({
      name: coin.name,
      symbol: coin.symbol,
      price: coin.current_price,
      change1h: Number(coin.price_change_percentage_1h_in_currency || 0),
      change24h: Number(coin.price_change_percentage_24h_in_currency || coin.price_change_percentage_24h || 0),
      marketCap: `$${Math.round(Number(coin.market_cap || 0)).toLocaleString()}`,
    })),
    updatedAt: Date.now(),
  };
}

async function sendCachedLive(req, res, key, loader, fallback) {
  const cached = LIVE_API_CACHE.get(key);
  if (cached && Date.now() - cached.time < LIVE_API_TTL_MS) {
    return res.json({ ok: true, source: cached.source, stale: false, data: cached.data, fallbackReason: null });
  }

  try {
    const data = await loader(req);
    LIVE_API_CACHE.set(key, { time: Date.now(), source: key.split(":")[0], data });
    res.json({ ok: true, source: key.split(":")[0], stale: false, data, fallbackReason: null });
  } catch (err) {
    if (cached) {
      return res.json({ ok: true, source: cached.source, stale: true, data: cached.data, fallbackReason: err.message });
    }
    res.json({ ok: true, source: `${key.split(":")[0]}-synthetic`, stale: true, data: fallback(req), fallbackReason: err.message });
  }
}

app.get("/api/live/hyperliquid", (req, res) => {
  const coin = String(req.query.coin || "BTC").toUpperCase().replace(/[^A-Z0-9:_-]/g, "").slice(0, 18) || "BTC";
  sendCachedLive(req, res, `hyperliquid:${coin}`, getHyperliquidLiveData, () => syntheticHyperliquidData(coin));
});

app.get("/api/live/polymarket", (req, res) => {
  sendCachedLive(req, res, "polymarket:markets", getPolymarketLiveData, syntheticPolymarketData);
});

app.get("/api/live/pumpfun", (req, res) => {
  sendCachedLive(req, res, "pumpfun:tokens", getPumpfunLiveData, syntheticPumpfunData);
});

async function getPitchDeckSource(req) {
  const search = new URL(req.originalUrl, "http://katechon.local").search;
  try {
    const resp = await fetch(PITCH_DECK_URL, {
      headers: { Accept: "text/html" },
      timeout: 650,
    });
    if (resp.ok) {
      return {
        type: "live",
        src: appendSearch(PITCH_DECK_URL, search),
        label: "Live from ../katechon-pitch",
      };
    }
  } catch (_) {
    // Fall through to the built snapshot.
  }

  const snapshotIndex = path.join(PITCH_DECK_DIST_DIR, "deck", "index.html");
  if (fs.existsSync(snapshotIndex)) {
    return {
      type: "snapshot",
      src: appendSearch("/dashboards/pitch-deck-snapshot/deck/", search),
      label: "Built snapshot from ../katechon-pitch/dist",
    };
  }

  return {
    type: "missing",
    src: "",
    label: "Pitch deck unavailable",
  };
}

function renderPitchDeckFrame(source) {
  const body = source.src
    ? `<iframe src="${escapeHtml(source.src)}" title="Fundraise Deck" allow="fullscreen; autoplay"></iframe>`
    : `<div class="missing">
        <h1>Fundraise Deck</h1>
        <p>Start the linked deck with <code>npm run pitch:dev</code>, or build <code>../katechon-pitch/dist</code>.</p>
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fundraise Deck</title>
  <style>
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; background: #000; overflow: hidden; }
    body { font-family: Inter, "Helvetica Neue", Arial, sans-serif; color: #f6f3ee; }
    iframe { width: 100%; height: 100%; border: 0; display: block; background: #000; }
    .deck-status {
      position: fixed;
      left: 14px;
      bottom: 12px;
      z-index: 2;
      padding: 6px 9px;
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 5px;
      background: rgba(0,0,0,0.54);
      color: rgba(246,243,238,0.48);
      font: 10px/1.2 monospace;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      pointer-events: none;
    }
    .missing {
      width: 100%;
      height: 100%;
      display: grid;
      place-content: center;
      gap: 16px;
      text-align: center;
      background: radial-gradient(circle at 50% 40%, rgba(224,74,47,0.16), transparent 36%), #0b0b0b;
    }
    .missing h1 { margin: 0; font-size: clamp(38px, 7vw, 86px); line-height: 0.95; }
    .missing p { margin: 0; color: rgba(246,243,238,0.64); font-size: 15px; }
    code { color: #2bd17e; }
  </style>
</head>
<body>
  ${body}
  <div class="deck-status">${escapeHtml(source.label)}</div>
</body>
</html>`;
}

async function sendPitchDeckDashboard(req, res) {
  const source = await getPitchDeckSource(req);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.send(renderPitchDeckFrame(source));
}

function sendPitchDeckSnapshotIndex(req, res) {
  const indexPath = path.join(PITCH_DECK_DIST_DIR, "deck", "index.html");
  try {
    const html = fs.readFileSync(indexPath, "utf8")
      .replace(/(src|href)="\/assets\//g, '$1="/dashboards/pitch-deck-snapshot/assets/');
    res.setHeader("Cache-Control", "no-cache");
    res.send(html);
  } catch (err) {
    res.status(404).send(`Pitch deck snapshot unavailable: ${err.message}`);
  }
}

app.get(/^\/dashboards\/pitch-deck(?:\/.*)?$/, sendPitchDeckDashboard);
app.get(/^\/dashboards\/pitch-deck-snapshot\/deck\/?(?:index\.html)?$/, sendPitchDeckSnapshotIndex);
app.use("/dashboards/pitch-deck-snapshot", express.static(PITCH_DECK_DIST_DIR));
app.use("/dashboards/dune-deck", express.static(DUNE_DECK_DIR));

function renderExternalDashboardFallback(id, err) {
  const dashboard = EXTERNAL_DASHBOARDS[id];
  const upstreams = dashboard.upstreams.length ? dashboard.upstreams : ["No upstream configured"];
  const notes = dashboard.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");
  const upstreamList = upstreams.map((url) => `<li>${escapeHtml(url)}</li>`).join("");
  const error = err ? `<div class="error">Last check: ${escapeHtml(err.message || err)}</div>` : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(dashboard.label)}</title>
  <style>
    :root { color-scheme: dark; --green: #00e87b; --cyan: #7de8ff; --bg: #050608; --line: rgba(255,255,255,0.12); }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: #f2f4f7;
      font-family: Inter, "Helvetica Neue", Arial, sans-serif;
      background:
        radial-gradient(circle at 22% 18%, rgba(125,232,255,0.10), transparent 30%),
        radial-gradient(circle at 82% 8%, rgba(0,232,123,0.09), transparent 24%),
        linear-gradient(135deg, #050608, #0b0f13 58%, #040506);
      overflow: hidden;
    }
    .wrap { min-height: 100vh; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 28px; padding: 34px; }
    .hero, .side {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: rgba(8, 11, 14, 0.78);
      box-shadow: 0 18px 60px rgba(0,0,0,0.32);
      overflow: hidden;
    }
    .hero { display: flex; flex-direction: column; justify-content: space-between; padding: 28px; }
    .kicker, .label { font-family: monospace; text-transform: uppercase; letter-spacing: 0.15em; font-size: 11px; }
    .kicker { color: var(--cyan); }
    h1 { margin: 16px 0 10px; font-size: clamp(34px, 5vw, 72px); line-height: 0.95; letter-spacing: 0; }
    p { margin: 0; color: rgba(242,244,247,0.68); font-size: 16px; line-height: 1.5; max-width: 760px; }
    .radar { margin-top: 30px; min-height: 220px; display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; align-items: end; }
    .bar { min-height: 28px; border: 1px solid rgba(0,232,123,0.26); background: linear-gradient(180deg, rgba(0,232,123,0.34), rgba(125,232,255,0.06)); }
    .bar:nth-child(1) { height: 52%; } .bar:nth-child(2) { height: 76%; } .bar:nth-child(3) { height: 34%; }
    .bar:nth-child(4) { height: 88%; } .bar:nth-child(5) { height: 62%; } .bar:nth-child(6) { height: 45%; }
    .bar:nth-child(7) { height: 92%; } .bar:nth-child(8) { height: 70%; }
    .side { padding: 24px; display: flex; flex-direction: column; gap: 18px; }
    .panel { border-top: 1px solid var(--line); padding-top: 16px; }
    .label { color: var(--green); margin-bottom: 10px; }
    ul { margin: 0; padding-left: 18px; color: rgba(242,244,247,0.72); line-height: 1.6; font-size: 13px; }
    code {
      display: block;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.36);
      color: #d9ffe9;
      font-size: 12px;
      line-height: 1.45;
    }
    .error { color: #ffb4a8; font-family: monospace; font-size: 12px; line-height: 1.4; }
    a { color: var(--cyan); text-decoration: none; }
    @media (max-width: 860px) {
      body { overflow: auto; }
      .wrap { grid-template-columns: 1fr; padding: 18px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <div>
        <div class="kicker">iframe slot ready</div>
        <h1>${escapeHtml(dashboard.label)}</h1>
        <p>${escapeHtml(dashboard.headline)}</p>
      </div>
      <div class="radar" aria-hidden="true">
        <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
        <div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
      </div>
    </section>
    <aside class="side">
      <div>
        <div class="label">upstream</div>
        <ul>${upstreamList}</ul>
      </div>
      <div class="panel">
        <div class="label">launch</div>
        <code>${escapeHtml(dashboard.launch)}</code>
      </div>
      <div class="panel">
        <div class="label">notes</div>
        <ul>${notes}</ul>
      </div>
      <div class="panel">
        <div class="label">source</div>
        <a href="${escapeHtml(dashboard.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(dashboard.sourceUrl)}</a>
      </div>
      ${error}
    </aside>
  </main>
</body>
</html>`;
}

function sendPrototypeDashboard(res) {
  res.sendFile(path.join(__dirname, "public", "prototype-dashboard.html"));
}

async function fetchExternalDashboardUpstream(id, proxyPath, req) {
  const dashboard = EXTERNAL_DASHBOARDS[id];
  let lastErr = null;
  for (const baseUrl of dashboard.upstreams) {
    try {
      const headers = {
        Accept: req.get("accept") || "*/*",
        "User-Agent": req.get("user-agent") || "katechon-demo",
      };
      const upstream = await fetch(`${baseUrl}${proxyPath}`, {
        method: req.method,
        headers,
        timeout: proxyPath.startsWith("/_stcore/") ? 0 : 8000,
      });
      return { upstream };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("no upstream configured");
}

async function proxyExternalDashboard(req, res) {
  const id = externalDashboardId(req.originalUrl);
  const dashboard = id ? EXTERNAL_DASHBOARDS[id] : null;
  if (!dashboard) return res.status(404).send("Unknown dashboard");
  if (!EXTERNAL_DASHBOARD_UPSTREAMS_ENABLED) return sendPrototypeDashboard(res);

  const proxyPath = externalDashboardProxyPath(id, req.originalUrl);
  try {
    const { upstream } = await fetchExternalDashboardUpstream(id, proxyPath, req);
    const contentType = upstream.headers.get("content-type") || "";
    if (!upstream.ok) {
      if (req.get("accept")?.includes("text/html")) {
        return res.status(200).send(renderExternalDashboardFallback(id, new Error(`upstream ${upstream.status}`)));
      }
      return res.status(upstream.status).send(await upstream.text());
    }

    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-cache");

    if (contentType.includes("text/html")) {
      const body = await upstream.text();
      res.send(rewriteExternalDashboardHtml(id, body));
      return;
    }

    upstream.body.pipe(res);
  } catch (err) {
    if (proxyPath === "/" || req.get("accept")?.includes("text/html")) {
      res.status(200).send(renderExternalDashboardFallback(id, err));
      return;
    }
    res.status(502).send(`${dashboard.label} proxy failed for ${proxyPath}: ${err.message}`);
  }
}

app.all(/^\/dashboards\/(?:world-monitor|glance|crypto-trading|polyrec|dashboard123|arena|biotech|space|iran|meme-coin|quantum|deep-sea|power-grid|viral|dark-forest)(?:\/.*)?$/, proxyExternalDashboard);

function proxyExternalDashboardUpgrade(req, socket, head) {
  const id = externalDashboardId(req.url);
  const dashboard = id ? EXTERNAL_DASHBOARDS[id] : null;
  if (!dashboard || !dashboard.upstreams.length) {
    socket.destroy();
    return;
  }

  const target = new URL(dashboard.upstreams[0]);
  if (target.protocol !== "http:") {
    socket.destroy();
    return;
  }

  const proxyPath = externalDashboardProxyPath(id, req.url);
  const port = Number(target.port || 80);
  const upstream = net.connect(port, target.hostname, () => {
    const headers = { ...req.headers, host: target.host, origin: `${target.protocol}//${target.host}` };
    const headerLines = Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
    upstream.write(`${req.method} ${proxyPath} HTTP/${req.httpVersion}\r\n${headerLines.join("\r\n")}\r\n\r\n`);
    if (head && head.length) upstream.write(head);
    socket.pipe(upstream);
    upstream.pipe(socket);
  });

  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
}

// GET current state
app.get("/api/state", (req, res) => {
  res.json({ workspace: state.currentWorkspace, sessions: state.sessions });
});

// POST /api/switch/:workspace
app.post("/api/switch/:workspace", async (req, res) => {
  const { workspace } = req.params;
  state.currentWorkspace = workspace;
  const remoteWorkspace = remoteWorkspaceFor(workspace);

  // Tell the container's background.html to switch workspace
  fetch(`${HLS_CONTROL_URL}/switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace: remoteWorkspace }),
  }).catch(() => {});

  const sessionId = state.sessions[workspace];
  if (sessionId && workspace !== "spectre") {
    try {
      // Stop any existing livestream
      for (const [, sid] of Object.entries(state.sessions)) {
        if (sid && sid !== sessionId) {
          await fetch(`${BROKER_URL}/api/sessions/${sid}/livestream/stop`, {
            method: "POST",
            headers: { Authorization: `Bearer ${BROKER_KEY}` },
          }).catch(() => {});
        }
      }
      // Start livestream for this workspace
      await fetch(`${BROKER_URL}/api/sessions/${sessionId}/livestream/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${BROKER_KEY}` },
      });
    } catch (err) {
      console.error("broker switch error:", err.message);
    }
  }

  res.json({ ok: true, workspace });
});

// POST /api/sessions/start/:kind  — spawn a session and remember its ID
app.post("/api/sessions/start/:kind", async (req, res) => {
  try {
    const r = await fetch(`${BROKER_URL}/api/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BROKER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kind: req.params.kind }),
    });
    const session = await r.json();
    const wsKey = req.params.kind === "minecraft" ? "minecraft" : req.params.kind;
    state.sessions[wsKey] = session.id;
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id  — poll session status + stream_url
app.get("/api/sessions/:id", async (req, res) => {
  try {
    const r = await fetch(`${BROKER_URL}/api/sessions/${req.params.id}`, {
      headers: { Authorization: `Bearer ${BROKER_KEY}` },
    });
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sessions/:kind/:id  — register an existing session
app.put("/api/sessions/:kind/:id", (req, res) => {
  state.sessions[req.params.kind] = req.params.id;
  console.log("registered session:", req.params.kind, req.params.id);
  res.json({ ok: true });
});

function workspaceForAction(action) {
  if (action === "open_spectre") return "spectre";
  if (action === "open_dashboard") return null;
  if (action === "go_home") return "landing";
  return null;
}

function fallbackAgentDecision(transcript) {
  const text = transcript.toLowerCase().replace(/[^\w\s]/g, " ");
  const wantsHome =
    /\b(home|homepage|landing|menu)\b/.test(text) ||
    /\bhome\s+page\b/.test(text) ||
    /\bmain\s+(panel|board|screen|menu|dashboard|page)\b/.test(text) ||
    /\b(back|return|close|exit)\b/.test(text);
  const wantsSpectre =
    /\b(osint|spectre|intel|intelligence)\b/.test(text) ||
    /\bdashboard\b/.test(text);
  const dashboardMatches = [
    ["news", /\b(news|broadcast|feed)\b/],
    ["world-monitor", /\b(world\s*monitor|geopolitical|geopolitics|world\s+map|instability)\b/],
    ["glance", /\b(glance|rss|hacker\s*news|reddit|youtube|weather)\b/],
    ["crypto-trading", /\b(crypto\s*trading|trading\s*dashboard|backtest|backtesting|binance|coinbase|kraken)\b/],
    ["polyrec", /\b(polyrec|polymarket|prediction\s*market|order\s*book|btc)\b/],
    ["dashboard123", /\b(dashboard\s*123|portfolio\s*123|p123|macro|sentiment|technicals|stocks?)\b/],
    ["dune-deck", /\b(dune|pitch\s*deck|fundraise|fundraising|slides?|deck)\b/],
  ];

  if (wantsHome && !/\b(osint|spectre|intel|intelligence)\b/.test(text)) {
    return {
      action: "go_home",
      workspace: "landing",
      speech: "Back to the main panel.",
      source: "fallback",
    };
  }

  const matchedDashboard = dashboardMatches.find(([, pattern]) => pattern.test(text));
  if (matchedDashboard) {
    const panel = PANELS.find((candidate) => candidate.id === matchedDashboard[0]);
    return {
      action: matchedDashboard[0] === "spectre" ? "open_spectre" : "open_dashboard",
      workspace: matchedDashboard[0],
      speech: `Opening ${panel?.label || matchedDashboard[0]} now.`,
      source: "fallback",
    };
  }

  if (wantsSpectre) {
    return {
      action: "open_spectre",
      workspace: "spectre",
      speech: "Opening the SPECTRE OSINT dashboard now.",
      source: "fallback",
    };
  }
  return {
    action: "unknown",
    workspace: null,
    speech: "I can open SPECTRE or return to the main panel. Say the panel you want.",
    source: "fallback",
  };
}

function normalizeAgentDecision(raw, transcript, source) {
  const action = String(raw.action || raw.tool || "unknown");
  let workspace = raw.workspace ? String(raw.workspace) : null;
  if (action === "go_home") workspace = "landing";
  if (action === "open_spectre") workspace = "spectre";
  if (workspace && !PANELS.some((panel) => panel.id === workspace)) workspace = null;

  let normalizedAction = action;
  if (workspace === "landing") normalizedAction = "go_home";
  if (workspace === "spectre") normalizedAction = "open_spectre";
  if (workspace && !["landing", "spectre"].includes(workspace)) normalizedAction = "open_dashboard";
  if (!["go_home", "open_spectre", "open_dashboard", "unknown"].includes(normalizedAction)) normalizedAction = "unknown";

  const speech = String(raw.speech || raw.reply || "").trim();
  if (!speech) return fallbackAgentDecision(transcript);

  return {
    action: normalizedAction,
    workspace,
    speech,
    source,
  };
}

async function routeWithKatAgent(transcript) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackAgentDecision(transcript);

  const panelCatalog = PANELS.map((panel) => `- ${panel.id}: ${panel.label}. ${panel.description}`).join("\n");
  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 240,
      system:
        "You are Kat, the VTuber agent operating a remote Linux desktop for the viewer. " +
        "Route each transcript into exactly one control decision. Be snappy. " +
        "If the user asks for an app/panel/dashboard, choose that panel. If they ask to go back/home/main, choose landing. " +
        "If the request is unclear, do not change panels. Always produce one short spoken line in Kat's voice.\n\n" +
        `Available panels:\n${panelCatalog}`,
      tools: [
        {
          name: "control_desktop",
          description: "Choose what Kat should do with the remote desktop and what she should say.",
          input_schema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["open_spectre", "open_dashboard", "go_home", "unknown"],
              },
              workspace: {
                type: "string",
                enum: PANELS.map((panel) => panel.id),
                description: "Target panel when action changes the desktop.",
              },
              speech: {
                type: "string",
                description: "One short spoken response, under 14 words, in Kat's voice. No markdown.",
              },
            },
            required: ["action", "speech"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "control_desktop" },
      messages: [{ role: "user", content: transcript }],
    }),
    timeout: 2500,
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`anthropic ${resp.status}: ${body.slice(0, 240)}`);
  }

  const data = await resp.json();
  const toolUse = data.content?.find((block) => block.type === "tool_use" && block.name === "control_desktop");
  if (!toolUse) throw new Error("anthropic did not return control_desktop");
  return normalizeAgentDecision(toolUse.input || {}, transcript, "anthropic");
}

function speechTextForTts(text) {
  return String(text || "").replace(/\bKatechon\b/g, KATECHON_TTS_PRONUNCIATION);
}

async function synthesizeSpeech(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
  const ttsText = speechTextForTts(text);
  const cacheKey = `${ELEVENLABS_VOICE_ID}:${ELEVENLABS_MODEL_ID}:${ttsText}`;
  if (speechCache.has(cacheKey)) return speechCache.get(cacheKey);

  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: ttsText,
      model_id: ELEVENLABS_MODEL_ID,
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
    timeout: ELEVENLABS_TIMEOUT_MS,
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`ElevenLabs ${resp.status}: ${body.slice(0, 300)}`);
  }

  const audio = (await resp.buffer()).toString("base64");
  speechCache.set(cacheKey, audio);
  while (speechCache.size > SPEECH_CACHE_MAX) {
    speechCache.delete(speechCache.keys().next().value);
  }
  return audio;
}

function buildWelcomeMetadata() {
  return {
    type: "audio",
    id: `welcome-${Date.now()}`,
    text: WELCOME_MESSAGE,
    pending: true,
  };
}

async function synthesizeWelcomePayload(id) {
  let audio = "";
  try {
    audio = await synthesizeSpeech(WELCOME_MESSAGE);
  } catch (err) {
    console.warn("welcome TTS failed:", err.message);
  }

  return {
    type: "audio",
    id: id || `welcome-${Date.now()}`,
    text: WELCOME_MESSAGE,
    audio,
    muted: !audio,
  };
}

function cleanSpeech(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
    .slice(0, 360);
}

function titleFromId(id) {
  return String(id || "dashboard")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dashboardNarrationSpec(dashboardId) {
  if (DASHBOARD_NARRATION[dashboardId]) return DASHBOARD_NARRATION[dashboardId];

  const external = EXTERNAL_DASHBOARDS[dashboardId];
  const panel = PANELS.find((candidate) => candidate.id === dashboardId);
  const label = external?.label || panel?.label || titleFromId(dashboardId);
  const description = external?.headline || panel?.description || `${label} dashboard`;

  return {
    label,
    voice:
      `You are Kat narrating ${label}, a live dashboard surface in the Katechon interface. ` +
      "Keep the narration concise, operational, and grounded in what the dashboard is for. " +
      "Do not invent live facts, prices, events, incidents, or medical/financial claims.",
    fallback: [
      `${label} is online. I'm reading this as a live dashboard, starting with the highest-signal areas first.`,
      `This panel is about ${description}. I'm narrating the workflow, not inventing live facts.`,
      `${label} should be read as a signal surface: scan, compare, then decide what deserves attention.`,
      `I'm watching ${label} for structure, context, and changes that make the interface easier to understand.`,
    ],
  };
}

function fallbackNarration(dashboardId) {
  const dashboard = dashboardNarrationSpec(dashboardId);
  const index = narrationCursor[dashboardId] || 0;
  narrationCursor[dashboardId] = index + 1;
  return dashboard.fallback[index % dashboard.fallback.length];
}

async function generateDashboardNarration(dashboardId) {
  const dashboard = dashboardNarrationSpec(dashboardId);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !DASHBOARD_NARRATION_REMOTE) return fallbackNarration(dashboardId);

  try {
    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 90,
        system:
          `${dashboard.voice} Speak as one short narration beat, 1 sentence, under 22 words. ` +
          "You are not receiving live screen data. Do not mention specific countries, companies, tickers, prices, " +
          "events, attacks, trades, or market moves. Narrate only the dashboard's workflow, interface, and analytical posture. " +
          "No markdown, no stage directions, no unverifiable claims.",
        messages: [
          {
            role: "user",
            content:
              `Generate the next live narration line for ${dashboard.label}. ` +
              "No live facts are available, so describe how the viewer should read the dashboard.",
          },
        ],
      }),
      timeout: 2500,
    });
    if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 180)}`);
    const data = await resp.json();
    const textBlock = data.content?.find((block) => block.type === "text");
    const generated = cleanSpeech(textBlock?.text);
    return generated || fallbackNarration(dashboardId);
  } catch (err) {
    console.warn("dashboard narration failed:", err.message);
    return fallbackNarration(dashboardId);
  }
}

async function postStreamControl(pathname, payload) {
  const resp = await fetch(`${HLS_CONTROL_URL}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeout: 1200,
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`${pathname} ${resp.status}: ${JSON.stringify(body).slice(0, 240)}`);
  return body;
}

async function dispatchRemoteCommand(command) {
  const workspace = command.workspace || workspaceForAction(command.action);
  if (workspace) state.currentWorkspace = workspace;
  const remoteWorkspace = remoteWorkspaceFor(workspace);

  try {
    return {
      ok: true,
      data: await postStreamControl("/agent", {
        id: command.id,
        action: command.action,
        transcript: command.transcript || "",
        speech: command.speech || command.reply || "",
        reply: command.speech || command.reply || "",
        workspace: remoteWorkspace,
      }),
    };
  } catch (err) {
    console.warn("remote command dispatch failed:", err.message);
    if (!remoteWorkspace) return { ok: false, error: err.message };

    try {
      await postStreamControl("/switch", { workspace: remoteWorkspace });
      return { ok: true, fallback: "switch" };
    } catch (fallbackErr) {
      console.warn("remote switch fallback failed:", fallbackErr.message);
      return { ok: false, error: fallbackErr.message };
    }
  }
}

async function dispatchRemoteSpeech(payload) {
  try {
    return {
      ok: true,
      data: await postStreamControl("/speak", payload),
    };
  } catch (err) {
    console.warn("remote speech dispatch failed:", err.message);
    return { ok: false, error: err.message };
  }
}

async function runKatAgent(transcript) {
  const startedAt = Date.now();
  const id = `kat-${Date.now()}`;
  let decision;
  try {
    decision = await routeWithKatAgent(transcript);
  } catch (err) {
    console.warn("kat agent routing failed:", err.message);
    decision = fallbackAgentDecision(transcript);
  }

  const workspace = decision.workspace || workspaceForAction(decision.action);
  if (workspace) state.currentWorkspace = workspace;

  const routeMs = Date.now() - startedAt;
  const commandStartedAt = Date.now();
  const commandRemotePromise = dispatchRemoteCommand({
    id,
    transcript,
    action: decision.action,
    speech: decision.speech,
    workspace,
  }).then((result) => ({ ...result, elapsedMs: Date.now() - commandStartedAt }));

  let audio = "";
  const ttsStartedAt = Date.now();
  let ttsMs = 0;
  try {
    audio = await synthesizeSpeech(decision.speech);
  } catch (err) {
    console.warn("kat speech TTS failed:", err.message);
  } finally {
    ttsMs = Date.now() - ttsStartedAt;
  }

  const speechStartedAt = Date.now();
  const speechRemote = audio
    ? await dispatchRemoteSpeech({
        id,
        text: decision.speech,
        audio,
        muted: false,
      }).then((result) => ({ ...result, elapsedMs: Date.now() - speechStartedAt }))
    : { ok: false, error: "no audio" };
  const commandRemote = await commandRemotePromise;

  return {
    id,
    transcript,
    action: decision.action,
    workspace,
    speech: decision.speech,
    source: decision.source,
    audio,
    muted: !audio,
    remote: {
      command: commandRemote,
      speech: speechRemote,
    },
    streamAudio: STREAM_AUDIO_ENABLED,
    timings: {
      routeMs,
      ttsMs,
      totalMs: Date.now() - startedAt,
    },
  };
}

// POST /api/agent — central Kat control path for voice transcripts
app.post("/api/agent", async (req, res) => {
  try {
    const transcript = String(req.body?.transcript || "").trim();
    if (!transcript) return res.status(400).json({ error: "empty transcript" });

    res.json(await runKatAgent(transcript));
  } catch (err) {
    console.error("agent error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Backcompat while the browser migrates to /api/agent.
app.post("/api/command", async (req, res) => {
  try {
    const transcript = String(req.body?.transcript || "").trim();
    if (!transcript) return res.status(400).json({ error: "empty transcript" });
    res.json(await runKatAgent(transcript));
  } catch (err) {
    console.error("command error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/speak — synthesize Kat's reply and forward it to the remote avatar
app.post("/api/speak", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "empty text" });

    const id = String(req.body?.id || `speech-${Date.now()}`);
    let audio = "";
    try {
      audio = await synthesizeSpeech(text);
    } catch (err) {
      console.warn("speech TTS failed:", err.message);
    }

    const payload = {
      id,
      text,
      audio,
      muted: !audio,
    };
    const remote = audio ? await dispatchRemoteSpeech(payload) : { ok: false, error: "no audio" };

    res.json({ ...payload, remote, streamAudio: STREAM_AUDIO_ENABLED });
  } catch (err) {
    console.error("speech error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/narration/:dashboard — one browser-avatar narration payload.
app.get("/api/narration/:dashboard", async (req, res) => {
  try {
    const dashboardId = String(req.params.dashboard || "").toLowerCase().replace(/[^\w-]/g, "");
    if (!dashboardId) {
      return res.status(400).json({ error: "dashboard id required" });
    }

    const text = await generateDashboardNarration(dashboardId);
    const mute = req.query.mute === "1";
    let audio = "";
    if (!mute && DASHBOARD_NARRATION_TTS) {
      try {
        audio = await synthesizeSpeech(text);
      } catch (err) {
        console.warn("dashboard narration TTS failed:", err.message);
      }
    }

    res.json({
      type: "audio",
      id: `narration-${dashboardId}-${Date.now()}`,
      dashboard: dashboardId,
      text,
      audio,
      muted: mute || !audio,
    });
  } catch (err) {
    console.error("narration error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transcribe — receives audio blob, returns transcript via Groq Whisper
app.post("/api/transcribe", express.raw({ type: "*/*", limit: "10mb" }), async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "No audio data received" });
    }

    const ct = (req.headers["content-type"] || "audio/webm").split(";")[0].trim();
    const ext = ct.includes("ogg") ? "ogg" : ct.includes("mp4") ? "mp4" : "webm";
    console.log(`transcribe: ${req.body.length} bytes, type=${ct}`);

    // Save for debugging: play /debug-audio.webm to verify mic capture.
    fs.writeFileSync(path.join(__dirname, "public", `debug-audio.${ext}`), req.body);

    const form = new FormData();
    form.append("file", req.body, {
      filename: `audio.${ext}`,
      contentType: ct,
      knownLength: req.body.length,
    });
    form.append("model", "whisper-large-v3");
    form.append("language", "en");
    form.append("response_format", "verbose_json");

    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    const data = await r.json().catch(() => ({}));
    console.log("groq response:", JSON.stringify(data));
    if (!r.ok) {
      const message = data.error?.message || data.error || r.statusText || "Groq transcription failed";
      return res.status(r.status).json({ error: message });
    }

    res.json({ text: data.text || "" });
  } catch (err) {
    console.error("transcribe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/welcome — build first-login welcome audio without blocking entry
app.get("/api/welcome", async (req, res) => {
  try {
    const id = String(req.query.id || `welcome-${Date.now()}`);
    res.json(await synthesizeWelcomePayload(id));
  } catch (err) {
    console.error("welcome payload failed:", err.message);
    res.status(500).json({ ok: false, error: "could not build welcome" });
  }
});

// POST /api/register — email gate, signup/login capture
app.post("/api/register", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "valid email required" });
  }

  try {
    const { action, user } = recordUserEmail(email);
    const welcome = buildWelcomeMetadata();
    console.log(`user ${action}: ${email}`);
    res.json({
      ok: true,
      action,
      welcome,
      user: {
        email: user.email,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        loginCount: user.loginCount,
      },
    });
  } catch (err) {
    console.error("user email capture failed:", err.message);
    res.status(500).json({ ok: false, error: "could not save email" });
  }
});

const PORT = process.env.PORT || 4040;
const server = app.listen(PORT, () => {
  console.log(`katechon-demo running at http://localhost:${PORT}`);
  console.log(`Kat voice: ${VOICE_SOURCE} (${ELEVENLABS_VOICE_ID}), model=${ELEVENLABS_MODEL_ID}`);
  console.log(`HLS control: ${HLS_CONTROL_URL}`);
});
server.on("upgrade", (req, socket, head) => {
  if (req.url?.startsWith("/_next/webpack-hmr")) {
    proxyNewsDashboardUpgrade(req, socket, head);
    return;
  }
  if (EXTERNAL_DASHBOARD_UPSTREAMS_ENABLED && externalDashboardId(req.url)) {
    proxyExternalDashboardUpgrade(req, socket, head);
    return;
  }
  socket.destroy();
});
