const path = require("path");
const fs = require("fs");
const net = require("net");
const vm = require("vm");
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
loadEnvKeyFromFile(katechonAppEnv, "OPENAI_API_KEY");
loadEnvKeyFromFile(katechonAppEnv, "EIA_API_KEY");

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
const {
  CHART_BINDINGS,
  CHART_TYPES,
  CHANNEL_RUNTIME_VERSION,
  channelGenerationSpec,
  channelDocs,
  componentRegistry,
  dataCapabilitiesForChannel,
  getChannel,
  listChannels,
  publicChannel,
  surfaceRegistry,
  syntheticChannelData,
  viewPresets,
} = require("./lib/channel-registry");

const app = express();
app.use(express.text({ type: ["application/sdp", "text/plain"], limit: "1mb" }));
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
const KATECHON_TTS_PRONUNCIATION =
  process.env.KATECHON_TTS_PRONUNCIATION ||
  '<phoneme alphabet="ipa" ph="ˈkætəkɒn">Katechon</phoneme>';
const WELCOME_MESSAGE =
  process.env.KATECHON_WELCOME_MESSAGE ||
  "Welcome to Katechon Technology. This is a live software channel for narrated dashboards: intelligence rooms, market surfaces, research tools, and interactive agents you can watch, browse, and command in real time.";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_REALTIME_URL = "https://api.openai.com/v1/realtime/calls";
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-2";
const OPENAI_REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || "marin";
const OPENAI_REALTIME_TRANSCRIBE_MODEL = process.env.OPENAI_REALTIME_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
const DASHBOARD_NARRATION_REMOTE = process.env.DASHBOARD_NARRATION_REMOTE === "1";
const DASHBOARD_NARRATION_TTS = process.env.DASHBOARD_NARRATION_TTS !== "0";
const STREAM_AUDIO_ENABLED = process.env.STREAM_AUDIO_ENABLED === "1";
const EXTERNAL_DASHBOARD_UPSTREAMS_ENABLED = process.env.EXTERNAL_DASHBOARD_UPSTREAMS === "1";
const HLS_PROXY_TIMEOUT_MS = Number(process.env.HLS_PROXY_TIMEOUT_MS || 15000);
const SPEECH_CACHE_MAX = Number(process.env.SPEECH_CACHE_MAX || 250);
const DASHBOARD_OVERRIDES_FILE = path.resolve(__dirname, process.env.DASHBOARD_OVERRIDES_FILE || "data/dashboard-overrides.json");
const CHANNEL_SESSIONS_FILE = path.resolve(__dirname, process.env.CHANNEL_SESSIONS_FILE || "data/channel-sessions.json");
const CHANNEL_SHARES_FILE = path.resolve(__dirname, process.env.CHANNEL_SHARES_FILE || "data/channel-shares.json");
const LAUNCH_EVENT_TYPES = new Set([
  "visit",
  "focused_launch_viewed",
  "channel_opened",
  "prompt_clicked",
  "prompt_submitted",
  "channel_morphed",
  "share_created",
  "share_opened",
  "share_replayed",
  "share_forked",
  "fallback_seen",
  "error_seen",
]);
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
    headline: "Polymarket intelligence boards from public market discovery",
    sourceUrl: "https://github.com/txbabaxyz/polyrec",
    upstreams: [process.env.POLYREC_DASHBOARD_URL, process.env.POLYREC_URL],
    launch: "git clone https://github.com/txbabaxyz/polyrec.git && cd polyrec && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python dash.py",
    notes: ["Prediction-market discovery surface", "Set POLYREC_DASHBOARD_URL to a ttyd/gotty wrapper", "Public Gamma data backs current boards"],
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
    description: "Prediction-market intelligence boards from public Polymarket discovery data.",
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
    label: "Katechon Technology",
    description: "Investor pitch deck for real-time generative software channels with per-slide avatar narration.",
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
      "You are Kat narrating a read-only crypto trading dashboard with live Hyperliquid data, historical chart generation, " +
      "depth inspection, and replaceable generated components. Be sharp, practical, and avoid financial advice.",
    fallback: [
      "The crypto board is live. Ask for a coin, timeframe, chart style, or depth view.",
      "I'm reading this as a market cockpit: price, depth, volume, and risk before direction.",
      "Generated charts should replace the active view, then we can clear and ask a sharper question.",
      "The useful loop is query, render, inspect, then refine without pretending this is execution.",
    ],
  },
  polyrec: {
    label: "Polyrec Polymarket intelligence board",
    voice:
      "You are Kat narrating Polyrec, a prediction-market intelligence board built from public Polymarket discovery data. " +
      "Explain ranked markets, visible odds, volume context, provenance, and fork paths. Avoid trading advice.",
    fallback: [
      "Polyrec ranks public prediction markets and keeps source state visible.",
      "This panel is built for weird market discovery, close-odds boards, and category forks.",
      "The useful edge is seeing why a market set matters without claiming execution precision.",
      "Prediction-market boards are only useful when odds, volume, category, and provenance stay visible.",
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

function cleanDashboardId(value) {
  return String(value || "").toLowerCase().replace(/[^\w-]/g, "");
}

let dashboardCatalogCache = null;

function loadDashboardCatalog() {
  const file = path.join(__dirname, "public", "dashboards", "catalog.js");
  const mtimeMs = fs.statSync(file).mtimeMs;
  if (dashboardCatalogCache?.mtimeMs === mtimeMs) return dashboardCatalogCache.catalog;
  const sandbox = { window: {}, console: { warn() {}, error() {}, log() {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file, timeout: 1000 });
  const catalog = sandbox.window.KATECHON_DASHBOARD_CATALOG || { dashboards: {}, channels: {}, channelOrder: [] };
  dashboardCatalogCache = { mtimeMs, catalog };
  return catalog;
}

function emptyDashboardOverrides() {
  return { dashboards: {}, events: [] };
}

function readDashboardOverrides() {
  if (!fs.existsSync(DASHBOARD_OVERRIDES_FILE)) return emptyDashboardOverrides();
  const raw = fs.readFileSync(DASHBOARD_OVERRIDES_FILE, "utf8").trim();
  if (!raw) return emptyDashboardOverrides();
  const parsed = JSON.parse(raw);
  return {
    dashboards: parsed.dashboards && typeof parsed.dashboards === "object" ? parsed.dashboards : {},
    events: Array.isArray(parsed.events) ? parsed.events : [],
  };
}

function writeDashboardOverrides(db) {
  fs.mkdirSync(path.dirname(DASHBOARD_OVERRIDES_FILE), { recursive: true });
  const tmpFile = `${DASHBOARD_OVERRIDES_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify(db, null, 2)}\n`);
  fs.renameSync(tmpFile, DASHBOARD_OVERRIDES_FILE);
}

function normalizeSessionId(value) {
  return String(value || "local-session")
    .toLowerCase()
    .replace(/[^\w-]/g, "")
    .slice(0, 64) || "local-session";
}

function emptyChannelSessionDb() {
  return { sessions: {}, events: [] };
}

function emptyChannelShareDb() {
  return { shares: {}, events: [] };
}

function readChannelSessionDb() {
  if (!fs.existsSync(CHANNEL_SESSIONS_FILE)) return emptyChannelSessionDb();
  const raw = fs.readFileSync(CHANNEL_SESSIONS_FILE, "utf8").trim();
  if (!raw) return emptyChannelSessionDb();
  const parsed = JSON.parse(raw);
  return {
    sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {},
    events: Array.isArray(parsed.events) ? parsed.events : [],
  };
}

function writeChannelSessionDb(db) {
  fs.mkdirSync(path.dirname(CHANNEL_SESSIONS_FILE), { recursive: true });
  const tmpFile = `${CHANNEL_SESSIONS_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify(db, null, 2)}\n`);
  fs.renameSync(tmpFile, CHANNEL_SESSIONS_FILE);
}

function readChannelShareDb() {
  if (!fs.existsSync(CHANNEL_SHARES_FILE)) return emptyChannelShareDb();
  const raw = fs.readFileSync(CHANNEL_SHARES_FILE, "utf8").trim();
  if (!raw) return emptyChannelShareDb();
  const parsed = JSON.parse(raw);
  return {
    shares: parsed.shares && typeof parsed.shares === "object" ? parsed.shares : {},
    events: Array.isArray(parsed.events) ? parsed.events : [],
  };
}

function writeChannelShareDb(db) {
  fs.mkdirSync(path.dirname(CHANNEL_SHARES_FILE), { recursive: true });
  const tmpFile = `${CHANNEL_SHARES_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, `${JSON.stringify(db, null, 2)}\n`);
  fs.renameSync(tmpFile, CHANNEL_SHARES_FILE);
}

function appendChannelAnalyticsEvent(event) {
  const db = readChannelSessionDb();
  db.events.push({
    timestamp: new Date().toISOString(),
    ...event,
  });
  db.events = db.events.slice(-600);
  writeChannelSessionDb(db);
}

function normalizeLaunchEvent(raw = {}) {
  const type = String(raw.type || raw.event || "").trim().toLowerCase();
  if (!LAUNCH_EVENT_TYPES.has(type)) return null;
  const channelId = cleanDashboardId(raw.channelId || raw.channel || raw.dashboard || "");
  const prompt = clampText(raw.prompt || raw.promptText || raw.userText || "", 300);
  const event = {
    type,
    channelId: channelId || undefined,
    sessionId: normalizeSessionId(raw.sessionId || raw.session || "launch-session"),
    shareId: cleanChannelShareId(raw.shareId || raw.channelShare || "") || undefined,
    source: clampText(raw.source || raw.inputSource || "launch", 80),
    at: new Date().toISOString(),
  };
  if (prompt) event.prompt = prompt;
  if (raw.detail && typeof raw.detail === "object" && !Array.isArray(raw.detail)) {
    event.detail = Object.fromEntries(Object.entries(raw.detail).slice(0, 16).map(([key, value]) => [
      clampText(key, 48),
      typeof value === "string" ? clampText(value, 220) : value,
    ]));
  }
  return event;
}

function countBy(items, getter) {
  return items.reduce((counts, item) => {
    const key = getter(item);
    if (!key) return counts;
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function topCounts(counts, limit = 8) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function launchAnalyticsSummary() {
  const events = readChannelSessionDb().events
    .filter((event) => LAUNCH_EVENT_TYPES.has(event.type))
    .slice(-600);
  return {
    ok: true,
    total: events.length,
    byType: countBy(events, (event) => event.type),
    byChannel: countBy(events, (event) => event.channelId),
    topPrompts: topCounts(countBy(events, (event) => event.prompt || event.promptText || event.userText)),
    latest: events.slice(-40).reverse(),
  };
}

function cleanChannelShareId(value) {
  return String(value || "").toLowerCase().replace(/[^\w-]/g, "").slice(0, 96);
}

function newChannelShareId(channelId) {
  const prefix = cleanDashboardId(channelId).replace(/-/g, "_") || "channel";
  return `share_${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function updateChannelShareStats(id, type, fields = {}) {
  const shareId = cleanChannelShareId(id);
  const db = readChannelShareDb();
  const share = db.shares[shareId];
  if (!share) return null;
  if (type === "share_opened") share.openCount = Number(share.openCount || 0) + 1;
  if (type === "share_replayed") share.replayCount = Number(share.replayCount || 0) + 1;
  if (type === "share_forked") share.forkCount = Number(share.forkCount || 0) + 1;
  share.updatedAt = new Date().toISOString();
  db.events.push({ type, shareId, channelId: share.channelId, timestamp: share.updatedAt, ...fields });
  db.events = db.events.slice(-600);
  writeChannelShareDb(db);
  return share;
}

function channelSessionKey(channelId, sessionId) {
  return `${cleanDashboardId(channelId)}:${normalizeSessionId(sessionId)}`;
}

function domainForChannel(channel) {
  if (channel.id === "crypto-trading" || channel.liveProvider === "hyperliquid") {
    return {
      entities: ["BTC", "ETH", "SOL"],
      vocabulary: ["price", "candles", "liquidity", "spread", "depth", "drawdown", "volatility", "market structure"],
      defaultTimeframes: ["24h", "7d", "30d", "90d"],
    };
  }
  if (channel.id === "power-grid" || channel.liveProvider === "eia-grid") {
    return {
      entities: ["US48", "PJM", "ERCO", "CAL", "MISO", "NYIS"],
      vocabulary: ["load", "forecast", "generation", "interchange", "fuel mix", "operating margin", "corridor stress"],
      defaultTimeframes: ["24h", "36h", "72h"],
    };
  }
  if (channel.id === "meme-coin" || channel.liveProvider === "pumpfun") {
    return {
      entities: ["velocity", "liquidity", "fragility", "narrative decay"],
      vocabulary: ["fastest moving", "attention", "liquidity risk", "viral but fragile", "decay", "read-only"],
      defaultTimeframes: ["now", "1h", "24h"],
    };
  }
  return {
    entities: [],
    vocabulary: ["events", "metrics", "sources", "rankings", "relationships", "current state"],
    defaultTimeframes: ["now", "24h", "7d"],
  };
}

function openingPathsForChannel(channel) {
  if (channel.id === "crypto-trading" || channel.liveProvider === "hyperliquid") {
    return ["price structure", "liquidity and depth", "volatility regime", "BTC vs ETH comparison", "historical replay"];
  }
  if (channel.id === "power-grid" || channel.liveProvider === "eia-grid") {
    return ["load vs forecast", "operating margin", "fuel mix", "corridor stress", "last-day grid risk"];
  }
  if (channel.id === "meme-coin" || channel.liveProvider === "pumpfun") {
    return ["fastest moving meme coins", "attention vs liquidity risk", "viral but fragile board", "narrative decay watch"];
  }
  return ["overview", "events", "rankings", "entity detail", "relationship map"];
}

function buildChannelAgentManifest(channel) {
  const generation = channelGenerationSpec(channel);
  const domain = domainForChannel(channel);
  const providerIds = channel.providers || [];
  return {
    id: channel.id,
    label: channel.label,
    runtime: CHANNEL_RUNTIME_VERSION,
    agent: {
      name: `${channel.id}-channel-agent`,
      voice: "Kat",
      role: `Specialist agent for ${channel.label} channel state, data, layout, provenance, and next actions.`,
      openingBehavior: {
        brief: "Summarize current channel state in one short Kat-ready line.",
        suggestedPaths: openingPathsForChannel(channel),
      },
    },
    domain,
    data: {
      adapters: providerIds,
      capabilities: dataCapabilitiesForChannel(channel).map((capability) => capability.id),
      provenanceRequired: true,
      syntheticPolicy: "label_only_never_claim_real",
    },
    layouts: generation.layouts.map((layout) => layout.id),
    surfaces: generation.surfaces.map((surface) => surface.id),
    components: generation.availableComponents.map((component) => component.id),
    style: {
      inherits: "katechon",
      allowedTokens: ["accent", "accent2", "accent3", "danger", "muted", "panelGlass", "gridLine"],
      rules: [
        "Primary charts render over the stage graphic.",
        "Generated surfaces replace by default.",
        "Do not add decorative one-off themes.",
        "Expose source/provenance state for generated charts and insights.",
      ],
    },
    tools: ["query_channel_capability", "apply_channel_update", "route_channel_turn", "clear_channel_surfaces", "summarize_channel_state"],
  };
}

function initialChannelSessionState(channel, sessionId = "local-session") {
  return {
    channelId: channel.id,
    sessionId: normalizeSessionId(sessionId),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    focus: {
      topic: `${channel.label} overview`,
      entities: [],
      timeframe: null,
      mode: "overview",
      intent: "overview",
    },
    layout: {
      template: "overview",
      rationale: "Initial channel overview.",
    },
    datasets: [],
    surfaces: {
      stageOverlay: [],
      rail: [],
      modal: [],
      below: [],
    },
    conclusions: [],
    unresolvedQuestions: [],
    nextActions: openingPathsForChannel(channel),
    provenance: [],
    turns: [],
    traces: [],
  };
}

function getChannelSessionState(channel, sessionId = "local-session") {
  const db = readChannelSessionDb();
  const key = channelSessionKey(channel.id, sessionId);
  const existing = db.sessions[key];
  if (existing && typeof existing === "object") {
    return {
      ...initialChannelSessionState(channel, sessionId),
      ...existing,
      surfaces: {
        ...initialChannelSessionState(channel, sessionId).surfaces,
        ...(existing.surfaces || {}),
      },
    };
  }
  return initialChannelSessionState(channel, sessionId);
}

function saveChannelSessionState(channel, sessionId, sessionState, eventRecord = null) {
  const db = readChannelSessionDb();
  const normalizedSession = normalizeSessionId(sessionId);
  const key = channelSessionKey(channel.id, normalizedSession);
  const updated = {
    ...sessionState,
    channelId: channel.id,
    sessionId: normalizedSession,
    updatedAt: new Date().toISOString(),
  };
  db.sessions[key] = updated;
  if (eventRecord) db.events.push(eventRecord);
  db.events = db.events.slice(-300);
  writeChannelSessionDb(db);
  return updated;
}

function sourceTypeForEnvelope(envelope, capability = "snapshot") {
  const source = String(envelope?.source || "");
  if (!source || envelope?.ok === false) return "unavailable";
  if (source.includes("synthetic") || source === "channel-synthetic") return "synthetic_fallback";
  if (envelope.stale) return "cached_api";
  if (["timeseries", "historical_state"].includes(capability)) return "historical_api";
  return "live_api";
}

function sourceLabelForType(sourceType) {
  if (sourceType === "synthetic_fallback") return "fallback data";
  if (sourceType === "cached_api") return "cached provider data";
  if (sourceType === "historical_api") return "historical provider data";
  if (sourceType === "live_api") return "live provider data";
  if (sourceType === "derived_from_api") return "derived provider data";
  return "unavailable data";
}

function buildProvenanceRecord(channel, capability, params, envelope, rowCount = 0) {
  const sourceType = sourceTypeForEnvelope(envelope, capability);
  return {
    id: `prov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    sourceType,
    provider: String(envelope?.source || channel.liveProvider || "unavailable"),
    capability,
    params: sanitizeCapabilityParams(params || {}),
    queriedAt: new Date().toISOString(),
    cache: {
      status: envelope?.stale ? "stale" : "fresh",
      ttlMs: LIVE_API_TTL_MS,
    },
    rowCount: Math.max(0, Number(rowCount) || 0),
    status: sourceType === "unavailable" ? "failed" : "success",
    stale: Boolean(envelope?.stale),
    fallbackReason: envelope?.fallbackReason || null,
  };
}

function componentSourceState(provenance) {
  const provider = String(provenance.provider || "");
  const providerLabel = provider.replace(/-synthetic$/, "");
  const hyperliquidLabel = provenance.sourceType === "historical_api" ? "Hyperliquid history" : "Hyperliquid live";
  const liveProviderLabel = providerLabel === "hyperliquid" ? hyperliquidLabel : sourceLabelForType(provenance.sourceType);
  return {
    provenanceId: provenance.id,
    sourceType: provenance.sourceType,
    provider: provenance.provider,
    label: ["live_api", "historical_api"].includes(provenance.sourceType) ? liveProviderLabel : sourceLabelForType(provenance.sourceType),
    stale: Boolean(provenance.stale),
    fallbackReason: provenance.fallbackReason || null,
  };
}

function clampText(value, max = 220) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function sanitizeStringArray(value, maxItems = 6, maxChars = 44) {
  if (!Array.isArray(value)) return null;
  const items = value.map((item) => clampText(item, maxChars)).filter(Boolean).slice(0, maxItems);
  return items.length ? items : null;
}

function sanitizeTupleArray(value, maxItems = 6, tupleSize = 3, maxChars = 120) {
  if (!Array.isArray(value)) return null;
  const rows = value
    .filter((row) => Array.isArray(row))
    .map((row) => Array.from({ length: tupleSize }, (_, index) => clampText(row[index] ?? "", maxChars)))
    .filter((row) => row.some(Boolean))
    .slice(0, maxItems);
  return rows.length ? rows : null;
}

function sanitizeCustomCss(value) {
  const css = String(value || "").trim().slice(0, 2400);
  if (!css) return null;
  if (/[<>]|@import|url\s*\(/i.test(css)) return null;
  return css;
}

function cleanComponentId(value) {
  return String(value || "").toLowerCase().replace(/[^\w-]/g, "").slice(0, 48);
}

function sanitizeBinding(value) {
  const binding = String(value || "none");
  const allowed = new Set(["none", "liveSummary.metrics", "liveSummary.feed", "liveSummary.highlights", "dashboard.metrics", "dashboard.feed", ...CHART_BINDINGS]);
  return allowed.has(binding) ? binding : "none";
}

function sanitizeChartBinding(value) {
  const binding = String(value || "none");
  return CHART_BINDINGS.includes(binding) ? binding : "none";
}

function sanitizeChartField(value, fallback = "") {
  const field = String(value || fallback).trim().replace(/[^\w.-]/g, "").slice(0, 40);
  return field || fallback;
}

function sanitizeChartData(value) {
  if (!Array.isArray(value)) return null;
  const rows = value.slice(0, 96).map((row) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    const clean = {};
    for (const [key, rawValue] of Object.entries(row).slice(0, 12)) {
      const cleanKey = sanitizeChartField(key);
      if (!cleanKey) continue;
      if (typeof rawValue === "number" && Number.isFinite(rawValue)) clean[cleanKey] = rawValue;
      else if (typeof rawValue === "boolean") clean[cleanKey] = rawValue;
      else if (rawValue !== null && rawValue !== undefined) clean[cleanKey] = clampText(rawValue, 96);
    }
    return Object.keys(clean).length ? clean : null;
  }).filter(Boolean);
  return rows.length ? rows : null;
}

function sanitizeChartQuery(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const query = {};
  if (raw.coin !== undefined) {
    const coin = sanitizeHyperliquidCoin(raw.coin, "");
    if (coin) query.coin = coin;
  }
  if (raw.interval !== undefined) {
    query.interval = sanitizeHyperliquidInterval(raw.interval);
  }
  if (raw.lookbackHours !== undefined || raw.hours !== undefined) {
    query.lookbackHours = sanitizeLookbackHours(raw.lookbackHours ?? raw.hours);
  }
  if (raw.candles !== undefined) {
    query.candles = sanitizeCandleCount(raw.candles);
  }
  const startTime = parseMarketTimeMs(raw.startTime || raw.start);
  if (startTime !== null) query.startTime = startTime;
  const endTime = parseMarketTimeMs(raw.endTime || raw.end);
  if (endTime !== null) query.endTime = endTime;
  if (raw.respondent !== undefined) {
    const respondent = cleanEiaRespondent(raw.respondent);
    if (respondent) query.respondent = respondent;
  }
  return Object.keys(query).length ? query : null;
}

function sanitizeChart(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const type = cleanComponentId(raw.type || raw.kind || "bar");
  if (!CHART_TYPES.includes(type)) return null;

  const chart = {
    type,
    binding: sanitizeChartBinding(raw.binding),
  };

  for (const field of ["title", "x", "y", "y2", "color", "label", "variant"]) {
    if (raw[field] !== undefined) {
      const value = field === "title" ? clampText(raw[field], 120) : sanitizeChartField(raw[field]);
      if (value) chart[field] = value;
    }
  }

  const seriesFields = sanitizeStringArray(raw.seriesFields, 6, 40);
  if (seriesFields) chart.seriesFields = seriesFields.map((field) => sanitizeChartField(field)).filter(Boolean);

  const data = sanitizeChartData(raw.data);
  if (data) chart.data = data;
  const query = sanitizeChartQuery(raw.query);
  if (query) chart.query = query;
  return chart;
}

function sanitizeSourceState(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const sourceType = cleanComponentId(raw.sourceType || raw.type || "");
  const allowed = new Set(["live_api", "historical_api", "cached_api", "user_supplied", "derived_from_api", "synthetic_fallback", "unavailable"]);
  if (!allowed.has(sourceType)) return null;
  const state = { sourceType };
  for (const field of ["provider", "label", "fallbackReason", "provenanceId"]) {
    if (raw[field] !== undefined) {
      const value = clampText(raw[field], field === "fallbackReason" ? 180 : 80);
      if (value) state[field] = value;
    }
  }
  if (raw.stale !== undefined) state.stale = Boolean(raw.stale);
  return state;
}

function sanitizeInteractions(value) {
  if (!Array.isArray(value)) return null;
  const interactions = value.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const type = cleanComponentId(raw.type);
    const action = cleanComponentId(raw.action);
    if (!type || !action) return null;
    return {
      type,
      action,
      label: clampText(raw.label, 80) || undefined,
    };
  }).filter(Boolean).slice(0, 4);
  return interactions.length ? interactions : null;
}

function sanitizeColorToken(value) {
  const color = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) return color;
  return null;
}

function sanitizeThemeTokens(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const tokens = {};
  for (const key of ["accent", "accent2", "accent3"]) {
    const color = sanitizeColorToken(raw[key]);
    if (color) tokens[key] = color;
  }
  return Object.keys(tokens).length ? tokens : null;
}

function sanitizeComponent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const registry = componentRegistry();
  const type = cleanComponentId(raw.type);
  if (!registry[type]) return null;

  const component = {
    id: cleanComponentId(raw.id) || `${type}-${Date.now().toString(36)}`,
    type,
  };
  for (const field of ["eyebrow", "title", "body", "value", "note", "variant"]) {
    if (raw[field] !== undefined) {
      const value = clampText(raw[field], field === "body" ? 260 : 120);
      if (value) component[field] = value;
    }
  }

  const metrics = sanitizeTupleArray(raw.metrics, 6, 3, 64);
  if (metrics) component.metrics = metrics;

  const rows = sanitizeTupleArray(raw.rows, 8, 3, 120);
  if (rows) component.rows = rows;

  const items = sanitizeStringArray(raw.items, 8, 120);
  if (items) component.items = items;

  component.binding = sanitizeBinding(raw.binding);
  const chart = sanitizeChart(raw.chart);
  if (chart) component.chart = chart;

  const provenanceIds = sanitizeStringArray(raw.provenanceIds, 8, 80);
  if (provenanceIds) component.provenanceIds = provenanceIds;

  const sourceState = sanitizeSourceState(raw.sourceState);
  if (sourceState) component.sourceState = sourceState;

  const interactions = sanitizeInteractions(raw.interactions);
  if (interactions) component.interactions = interactions;
  return component;
}

function sanitizeComponents(value, maxItems = 4) {
  if (!Array.isArray(value)) return [];
  return value.map(sanitizeComponent).filter(Boolean).slice(0, maxItems);
}

function generatedSurfaceNames() {
  return Object.keys(surfaceRegistry());
}

function generatedSurfaceMax(surface) {
  return surfaceRegistry()[surface]?.maxComponents || 4;
}

const GENERATED_PAGE_TEMPLATES = new Set([
  "market_structure",
  "ranked_board",
  "comparison_board",
  "risk_radar",
  "detail_inspector",
]);

function sanitizeGeneratedPage(raw, channel = null) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const template = cleanComponentId(raw.layout?.template || raw.template || raw.view || "");
  if (!GENERATED_PAGE_TEMPLATES.has(template)) return null;
  const stageRaw = raw.stage && typeof raw.stage === "object" && !Array.isArray(raw.stage) ? raw.stage : {};
  const thesisRaw = raw.thesis && typeof raw.thesis === "object" && !Array.isArray(raw.thesis) ? raw.thesis : {};
  const layoutRaw = raw.layout && typeof raw.layout === "object" && !Array.isArray(raw.layout) ? raw.layout : {};
  const themeRaw = raw.theme && typeof raw.theme === "object" && !Array.isArray(raw.theme) ? raw.theme : {};
  const sourceState = sanitizeSourceState(raw.sourceState);
  const provenance = (Array.isArray(raw.provenance) ? raw.provenance : Array.isArray(raw.provenanceRecords) ? raw.provenanceRecords : [])
    .map((record) => sanitizeProvenanceRecord(record, channel || { liveProvider: cleanComponentId(raw.channelId || "") }))
    .filter(Boolean)
    .slice(0, 12);

  return {
    mode: "generated_page",
    channelId: cleanDashboardId(raw.channelId || channel?.id || ""),
    prompt: clampText(raw.prompt, 300),
    theme: {
      density: cleanComponentId(themeRaw.density || "board"),
      accent: cleanComponentId(themeRaw.accent || "channel"),
      avatarMode: cleanComponentId(themeRaw.avatarMode || "docked"),
    },
    layout: {
      template,
      stage: cleanComponentId(layoutRaw.stage || stageRaw.type || template),
      rail: cleanComponentId(layoutRaw.rail || "evidence_stack"),
      actions: cleanComponentId(layoutRaw.actions || "fork_prompts"),
    },
    thesis: {
      title: clampText(thesisRaw.title || raw.title, 120) || titleFromId(template),
      summary: clampText(thesisRaw.summary || raw.summary, 320),
    },
    stage: {
      type: cleanComponentId(stageRaw.type || layoutRaw.stage || template),
      components: sanitizeComponents(stageRaw.components || raw.stageComponents || [], 3),
    },
    rail: sanitizeComponents(raw.rail || raw.railComponents || [], 5),
    actions: sanitizeStringArray(raw.actions || raw.nextActions, 6, 120) || [],
    provenance,
    sourceState: sourceState || undefined,
  };
}

function emptyGeneratedDashboard() {
  return {
    mode: "slot_overrides",
    view: "default",
    slots: Object.fromEntries(generatedSurfaceNames().map((slot) => [slot, []])),
    themeTokens: {},
    page: null,
  };
}

function sanitizeGeneratedDashboard(raw, channel = null) {
  const generated = emptyGeneratedDashboard();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return generated;
  const views = viewPresets();
  const view = cleanComponentId(raw.view);
  if (views[view]) generated.view = view;
  const slots = raw.slots && typeof raw.slots === "object" && !Array.isArray(raw.slots) ? raw.slots : {};
  for (const slot of Object.keys(generated.slots)) {
    generated.slots[slot] = sanitizeComponents(slots[slot], generatedSurfaceMax(slot));
  }
  const themeTokens = sanitizeThemeTokens(raw.themeTokens);
  if (themeTokens) generated.themeTokens = themeTokens;
  const page = sanitizeGeneratedPage(raw.page || raw.generatedPage, channel);
  if (page) {
    generated.mode = "generated_page";
    generated.view = page.layout.template;
    generated.page = page;
  }
  return generated;
}

function sanitizeMutation(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const type = cleanComponentId(raw.type);
  const allowed = new Set(["set_view", "set_copy", "replace_slot", "add_component", "set_theme_tokens", "clear_generated"]);
  if (!allowed.has(type)) return null;

  const mutation = { type };
  const slots = new Set(generatedSurfaceNames());
  const slot = String(raw.slot || "");
  if (slot && slots.has(slot)) mutation.slot = slot;

  if (raw.view !== undefined) {
    const view = cleanComponentId(raw.view);
    if (viewPresets()[view]) mutation.view = view;
  }

  const patch = sanitizeDashboardPatch(raw.patch);
  if (Object.keys(patch).length) mutation.patch = patch;

  const component = sanitizeComponent(raw.component);
  if (component) mutation.component = component;

  const components = sanitizeComponents(raw.components, 4);
  if (components.length) mutation.components = components;

  const themeTokens = sanitizeThemeTokens(raw.themeTokens);
  if (themeTokens) mutation.themeTokens = themeTokens;

  return mutation;
}

function sanitizeDashboardPatch(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const patch = {};
  const textFields = {
    title: 80,
    subtitle: 260,
    kicker: 80,
    visualLabel: 80,
    visualCopy: 260,
    feedLabel: 80,
    lens: 80,
    caption: 260,
  };

  for (const [field, max] of Object.entries(textFields)) {
    if (raw[field] !== undefined) {
      const value = clampText(raw[field], max);
      if (value) patch[field] = value;
    }
  }

  const tabs = sanitizeStringArray(raw.tabs, 6, 34);
  if (tabs) patch.tabs = tabs;

  const metrics = sanitizeTupleArray(raw.metrics, 3, 3, 44);
  if (metrics) patch.metrics = metrics;

  const feed = sanitizeTupleArray(raw.feed, 6, 3, 130);
  if (feed) patch.feed = feed;

  const customCss = sanitizeCustomCss(raw.customCss);
  if (customCss) patch.customCss = customCss;

  return patch;
}

function dashboardContextFor(dashboardId) {
  const id = cleanDashboardId(dashboardId || state.currentWorkspace || "landing");
  const catalog = loadDashboardCatalog();
  const catalogDashboard = catalog.dashboards?.[id] || null;
  const channel = catalog.channels?.[id] || null;
  const panel = PANELS.find((candidate) => candidate.id === id) || null;
  const persisted = readDashboardOverrides().dashboards[id] || {};
  const override = persisted.patch || {};
  const generated = sanitizeGeneratedDashboard(persisted.generated);
  const merged = { ...(catalogDashboard || {}), ...override };
  return {
    id,
    currentWorkspace: state.currentWorkspace,
    label: channel?.label || panel?.label || merged.title || titleFromId(id),
    title: merged.title || channel?.label || panel?.label || titleFromId(id),
    subtitle: merged.subtitle || panel?.description || "",
    kicker: merged.kicker || "",
    scene: merged.scene || "",
    lens: merged.lens || "",
    tabs: Array.isArray(merged.tabs) ? merged.tabs.slice(0, 6) : [],
    metrics: Array.isArray(merged.metrics) ? merged.metrics.slice(0, 3) : [],
    feed: Array.isArray(merged.feed) ? merged.feed.slice(0, 6) : [],
    caption: merged.caption || "",
    visualLabel: merged.visualLabel || "",
    visualCopy: merged.visualCopy || "",
    override,
    generated,
  };
}

function applyDashboardOverride(dashboardId, rawPatch, instruction, source = "kat-realtime") {
  const id = cleanDashboardId(dashboardId);
  if (!id || !PANELS.some((panel) => panel.id === id)) throw new Error("unknown dashboard");
  const patch = sanitizeDashboardPatch(rawPatch);
  if (!Object.keys(patch).length) throw new Error("empty or unsupported dashboard edit");

  const db = readDashboardOverrides();
  const existingRecord = db.dashboards[id] || {};
  const existing = existingRecord.patch || {};
  db.dashboards[id] = {
    ...existingRecord,
    patch: { ...existing, ...patch },
    updatedAt: new Date().toISOString(),
    updatedBy: source,
    instruction: clampText(instruction, 500),
  };
  db.events.push({
    dashboard: id,
    source,
    instruction: clampText(instruction, 500),
    patch,
    at: new Date().toISOString(),
  });
  db.events = db.events.slice(-100);
  writeDashboardOverrides(db);
  return db.dashboards[id];
}

function applyDashboardMutation(dashboardId, rawMutation, instruction, source = "kat-realtime") {
  const id = cleanDashboardId(dashboardId);
  if (!id || !PANELS.some((panel) => panel.id === id)) throw new Error("unknown dashboard");
  const mutation = sanitizeMutation(rawMutation);
  if (!mutation) throw new Error("empty or unsupported dashboard mutation");

  const db = readDashboardOverrides();
  const existingRecord = db.dashboards[id] || {};
  const patch = { ...(existingRecord.patch || {}) };
  let generated = sanitizeGeneratedDashboard(existingRecord.generated);

  if (mutation.type === "clear_generated") {
    generated = emptyGeneratedDashboard();
  }
  if (mutation.type === "set_view") {
    if (!mutation.view) throw new Error("set_view requires a supported view");
    generated.view = mutation.view;
  }
  if (mutation.type === "set_copy") {
    if (!mutation.patch) throw new Error("set_copy requires a patch");
    Object.assign(patch, mutation.patch);
  }
  if (mutation.type === "replace_slot") {
    if (!mutation.slot) throw new Error("replace_slot requires a supported surface");
    generated.slots[mutation.slot] = mutation.components || [];
  }
  if (mutation.type === "add_component") {
    if (!mutation.slot) throw new Error("add_component requires a supported surface");
    if (!mutation.component) throw new Error("add_component requires a supported component");
    generated.slots[mutation.slot] = [...(generated.slots[mutation.slot] || []), mutation.component].slice(-generatedSurfaceMax(mutation.slot));
  }
  if (mutation.type === "set_theme_tokens") {
    if (!mutation.themeTokens) throw new Error("set_theme_tokens requires supported color tokens");
    generated.themeTokens = { ...(generated.themeTokens || {}), ...mutation.themeTokens };
  }
  if (mutation.patch && mutation.type !== "set_copy") {
    Object.assign(patch, mutation.patch);
  }
  if (mutation.themeTokens && mutation.type !== "set_theme_tokens") {
    generated.themeTokens = { ...(generated.themeTokens || {}), ...mutation.themeTokens };
  }

  const hasPatch = Object.keys(patch).length > 0;
  db.dashboards[id] = {
    ...existingRecord,
    patch,
    generated,
    updatedAt: new Date().toISOString(),
    updatedBy: source,
    instruction: clampText(instruction, 500),
  };
  if (!hasPatch) db.dashboards[id].patch = {};
  db.events.push({
    dashboard: id,
    source,
    instruction: clampText(instruction, 500),
    mutation,
    at: new Date().toISOString(),
  });
  db.events = db.events.slice(-100);
  writeDashboardOverrides(db);
  return db.dashboards[id];
}

function sanitizeCapabilityParams(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const params = {};
  for (const field of ["entity", "metric", "detail", "topic", "direction", "compareTo", "coin", "interval", "respondent", "category", "oddsRange", "keyword"]) {
    if (raw[field] !== undefined) {
      const value = clampText(raw[field], 80);
      if (value) params[field] = value;
    }
  }
  if (raw.query !== undefined) {
    const value = clampText(raw.query, 180);
    if (value) params.query = value;
  }
  if (Array.isArray(raw.entities)) {
    const entities = sanitizeStringArray(raw.entities, 8, 60);
    if (entities) params.entities = entities;
  }
  if (Array.isArray(raw.categories)) {
    const categories = sanitizeStringArray(raw.categories, 6, 48)?.map(cleanComponentId).filter(Boolean).slice(0, 6);
    if (categories?.length) params.categories = categories;
  }
  for (const field of ["lookbackHours", "hours", "limit", "depth", "candles", "minVolume"]) {
    if (raw[field] !== undefined) {
      const value = Number(raw[field]);
      if (Number.isFinite(value) && value > 0) params[field] = value;
    }
  }
  for (const field of ["startTime", "endTime"]) {
    if (raw[field] !== undefined) {
      const value = clampText(raw[field], 80);
      if (value) params[field] = value;
    }
  }
  return params;
}

function sanitizeDataRequest(raw, channel) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const allowed = new Set(dataCapabilitiesForChannel(channel).map((capability) => capability.id));
  const capability = cleanComponentId(raw.capability || raw.type || raw.name);
  if (!allowed.has(capability)) return null;
  const request = {
    capability,
    params: sanitizeCapabilityParams(raw.params || raw.query || raw),
  };
  if (raw.detail !== undefined) {
    const detail = cleanComponentId(raw.detail);
    if (["summary", "compact", "rows"].includes(detail)) request.detail = detail;
  }
  if (raw.reason !== undefined) {
    const reason = clampText(raw.reason, 180);
    if (reason) request.reason = reason;
  }
  return request;
}

function sanitizeProvenanceRecord(raw, channel) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const sourceType = cleanComponentId(raw.sourceType || "");
  const allowed = new Set(["live_api", "historical_api", "cached_api", "user_supplied", "derived_from_api", "synthetic_fallback", "unavailable"]);
  if (!allowed.has(sourceType)) return null;
  const capability = cleanComponentId(raw.capability || "snapshot") || "snapshot";
  return {
    id: cleanComponentId(raw.id) || `prov_${Date.now().toString(36)}`,
    sourceType,
    provider: clampText(raw.provider || channel.liveProvider || "unavailable", 80),
    capability,
    params: sanitizeCapabilityParams(raw.params || {}),
    queriedAt: clampText(raw.queriedAt, 40) || new Date().toISOString(),
    cache: raw.cache && typeof raw.cache === "object" && !Array.isArray(raw.cache)
      ? { status: clampText(raw.cache.status, 32), ttlMs: Number(raw.cache.ttlMs) || undefined }
      : undefined,
    rowCount: Math.max(0, Number(raw.rowCount) || 0),
    status: clampText(raw.status || "success", 32),
    stale: Boolean(raw.stale),
    fallbackReason: clampText(raw.fallbackReason, 180) || null,
  };
}

function sanitizeSurfaceUpdate(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const surface = String(raw.surface || raw.slot || "");
  const surfaces = surfaceRegistry();
  if (!surfaces[surface]) return null;
  const mode = cleanComponentId(raw.mode || raw.operation || "replace");
  if (!["replace", "append", "clear"].includes(mode)) return null;
  const components = sanitizeComponents(
    Array.isArray(raw.components) ? raw.components : raw.component ? [raw.component] : [],
    generatedSurfaceMax(surface)
  );
  if (mode !== "clear" && !components.length) return null;
  return {
    surface,
    mode,
    components,
  };
}

function sanitizeChannelUpdate(raw, channel) {
  const source = raw?.update && typeof raw.update === "object" && !Array.isArray(raw.update) ? raw.update : raw;
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;

  const update = {};
  const layoutRaw = source.layout && typeof source.layout === "object" && !Array.isArray(source.layout)
    ? source.layout
    : { template: source.layoutTemplate || source.view };
  const template = cleanComponentId(layoutRaw.template || layoutRaw.id || layoutRaw.view);
  if (template && viewPresets()[template]) {
    update.layout = {
      template,
    };
    const rationale = clampText(layoutRaw.rationale, 180);
    if (rationale) update.layout.rationale = rationale;
  }

  const patch = sanitizeDashboardPatch(source.patch);
  if (Object.keys(patch).length) update.patch = patch;

  const themeTokens = sanitizeThemeTokens(source.themeTokens);
  if (themeTokens) update.themeTokens = themeTokens;

  const surfaces = (Array.isArray(source.surfaces) ? source.surfaces : source.surface ? [source] : [])
    .map(sanitizeSurfaceUpdate)
    .filter(Boolean);
  if (surfaces.length) update.surfaces = surfaces;

  const generatedPage = sanitizeGeneratedPage(source.generatedPage || source.page, channel);
  if (generatedPage) update.generatedPage = generatedPage;

  const dataRequests = (Array.isArray(source.dataRequests) ? source.dataRequests : source.dataRequest ? [source.dataRequest] : [])
    .map((request) => sanitizeDataRequest(request, channel))
    .filter(Boolean)
    .slice(0, 6);
  if (dataRequests.length) update.dataRequests = dataRequests;

  const provenanceRecords = (Array.isArray(source.provenanceRecords) ? source.provenanceRecords : Array.isArray(source.provenance) ? source.provenance : [])
    .map((record) => sanitizeProvenanceRecord(record, channel))
    .filter(Boolean)
    .slice(0, 12);
  if (provenanceRecords.length) update.provenanceRecords = provenanceRecords;

  const narration = clampText(source.narration || source.speech || source.explanation, 260);
  if (narration) update.narration = narration;

  if (!update.layout && !update.patch && !update.themeTokens && !update.surfaces && !update.generatedPage) return null;
  return update;
}

function applyChannelUpdate(dashboardId, rawUpdate, instruction, source = "kat-runtime") {
  const id = cleanDashboardId(dashboardId);
  if (!id || !PANELS.some((panel) => panel.id === id)) throw new Error("unknown dashboard");
  const channel = getChannel(id);
  if (!channel) throw new Error("unknown channel");
  const update = sanitizeChannelUpdate(rawUpdate, channel);
  if (!update) throw new Error("empty or unsupported channel update");

  const db = readDashboardOverrides();
  const existingRecord = db.dashboards[id] || {};
  const patch = { ...(existingRecord.patch || {}) };
  let generated = sanitizeGeneratedDashboard(existingRecord.generated);

  if (update.layout?.template) generated.view = update.layout.template;
  if (update.patch) Object.assign(patch, update.patch);
  if (update.themeTokens) generated.themeTokens = { ...(generated.themeTokens || {}), ...update.themeTokens };
  if (update.generatedPage) {
    generated.mode = "generated_page";
    generated.view = update.generatedPage.layout.template;
    generated.page = update.generatedPage;
  }

  for (const surfaceUpdate of update.surfaces || []) {
    const slot = surfaceUpdate.surface;
    if (surfaceUpdate.mode === "clear") generated.slots[slot] = [];
    if (surfaceUpdate.mode === "replace") generated.slots[slot] = surfaceUpdate.components;
    if (surfaceUpdate.mode === "append") {
      generated.slots[slot] = [...(generated.slots[slot] || []), ...surfaceUpdate.components].slice(-generatedSurfaceMax(slot));
    }
  }

  db.dashboards[id] = {
    ...existingRecord,
    patch,
    generated,
    channelUpdate: update,
    provenanceRecords: update.provenanceRecords || existingRecord.provenanceRecords || [],
    updatedAt: new Date().toISOString(),
    updatedBy: source,
    instruction: clampText(instruction || update.narration, 500),
  };
  if (!Object.keys(patch).length) db.dashboards[id].patch = {};
  db.events.push({
    dashboard: id,
    source,
    instruction: clampText(instruction || update.narration, 500),
    channelUpdate: update,
    at: new Date().toISOString(),
  });
  db.events = db.events.slice(-100);
  writeDashboardOverrides(db);
  return db.dashboards[id];
}

const DASHBOARD_CHART_INTENTS = [
  "auto",
  "price_trend",
  "moving_average",
  "candlestick",
  "volume",
  "volatility",
  "market_depth",
  "market_odds",
  "token_velocity",
  "grid_load",
  "fuel_mix",
  "corridor_stress",
  "metrics",
  "feed_timeline",
];

function chartIntentForText(channel, rawIntent, instruction = "") {
  const intent = cleanComponentId(rawIntent || "auto");
  if (DASHBOARD_CHART_INTENTS.includes(intent) && intent !== "auto") return intent;

  const text = normalizeAgentText(instruction);
  if (/\b(depth|book|order\s*book|bid|ask|liquidity)\b/.test(text)) return "market_depth";
  if (/\b(moving\s*average|sma|average)\b/.test(text) && channel.liveProvider === "hyperliquid") return "moving_average";
  if (/\b(candles?|candlestick|ohlc)\b/.test(text) && channel.liveProvider === "hyperliquid") return "candlestick";
  if (/\b(volume|turnover|traded)\b/.test(text) && channel.liveProvider === "hyperliquid") return "volume";
  if (/\b(volatility|range|wick|high\s*low|drawdown)\b/.test(text) && channel.liveProvider === "hyperliquid") return "volatility";
  if (/\b(odds?|probabilit|yes|markets?)\b/.test(text) && channel.liveProvider === "polymarket") return "market_odds";
  if (/\b(tokens?|velocity|meme|change|gainers?)\b/.test(text) && channel.liveProvider === "pumpfun") return "token_velocity";
  if (/\b(fuel|generation mix|mix)\b/.test(text)) return "fuel_mix";
  if (/\b(corridor|stress|transmission)\b/.test(text)) return "corridor_stress";
  if (/\b(load|forecast|grid|reserve|margin)\b/.test(text) && channel.liveProvider === "eia-grid") return "grid_load";
  if (/\b(timeline|feed|events?|queue)\b/.test(text)) return "feed_timeline";
  if (/\b(price|trend|candles?|chart|graph|plot|btc|eth|sol)\b/.test(text) && channel.liveProvider === "hyperliquid") return "price_trend";

  if (channel.liveProvider === "hyperliquid") return "price_trend";
  if (channel.liveProvider === "polymarket") return "market_odds";
  if (channel.liveProvider === "pumpfun") return "token_velocity";
  if (channel.liveProvider === "eia-grid") return "grid_load";
  return "metrics";
}

function defaultChartQuery(channel, args = {}) {
  const query = {};
  if (channel.liveProvider === "hyperliquid") {
    const coin = sanitizeHyperliquidCoin(args.coin || channel.defaultQuery?.coin, "");
    if (coin) query.coin = coin;
    query.lookbackHours = sanitizeLookbackHours(args.lookbackHours || args.hours || args.lookback || 24);
    query.interval = sanitizeHyperliquidInterval(args.interval || args.timeframe || defaultHyperliquidIntervalForLookback(query.lookbackHours));
    const candles = args.candles !== undefined ? sanitizeCandleCount(args.candles) : null;
    if (candles) query.candles = candles;
    const startTime = parseMarketTimeMs(args.startTime || args.start);
    if (startTime !== null) query.startTime = startTime;
    const endTime = parseMarketTimeMs(args.endTime || args.end);
    if (endTime !== null) query.endTime = endTime;
  }
  if (channel.liveProvider === "eia-grid") {
    const respondent = cleanEiaRespondent(args.respondent || channel.defaultQuery?.respondent || "");
    if (respondent) query.respondent = respondent;
  }
  return Object.keys(query).length ? query : null;
}

function defaultHyperliquidIntervalForLookback(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value)) return "15m";
  if (value >= 24 * 45) return "1d";
  if (value >= 24 * 10) return "4h";
  if (value >= 48) return "1h";
  return "15m";
}

function chartStyleForText(raw = {}, instruction = "") {
  const explicit = cleanComponentId(raw.style || raw.variant || raw.chartType || "");
  if (explicit && CHART_TYPES.includes(explicit)) return explicit;
  const text = normalizeAgentText(instruction);
  if (/\b(candles?|candlestick|ohlc)\b/.test(text)) return "candlestick";
  if (/\b(volume|turnover|traded)\b/.test(text)) return "volume";
  if (/\barea|filled\b/.test(text)) return "area";
  if (/\bscatter|distribution\b/.test(text)) return "scatter";
  return "";
}

function chartComponentForIntent(channel, raw = {}, instruction = "") {
  const intent = chartIntentForText(channel, raw.intent, instruction);
  const title = clampText(raw.title, 96);
  const query = defaultChartQuery(channel, raw);
  const style = chartStyleForText(raw, instruction);
  const withQuery = (chart) => query ? { ...chart, query } : chart;
  const component = {
    id: `vega-chart-${Date.now().toString(36)}`,
    type: "vega-chart",
    eyebrow: "generated graph",
    title: title || "Channel Chart",
    note: "Rendered from normalized channel data. Provider fallback stays visible in the source chip.",
  };

  if (intent === "price_trend") {
    return {
      ...component,
      title: title || `${query?.coin || "BTC"} Price Trend`,
      chart: withQuery({ type: style && ["line", "area", "scatter", "candlestick"].includes(style) ? style : "line", binding: "liveData.candles", x: "label", y: "close", variant: style || "line" }),
    };
  }
  if (intent === "moving_average") {
    return {
      ...component,
      title: title || `${query?.coin || "BTC"} Moving Average`,
      chart: withQuery({ type: "line", binding: "liveData.candles", x: "label", y: "close", y2: "sma", variant: "moving-average" }),
      note: "Moving average is computed in the dashboard from normalized candle closes for visual context only.",
    };
  }
  if (intent === "candlestick") {
    return {
      ...component,
      title: title || `${query?.coin || "BTC"} Candles`,
      chart: withQuery({ type: "candlestick", binding: "liveData.candles", x: "label", y: "close", variant: "ohlc" }),
    };
  }
  if (intent === "volume") {
    return {
      ...component,
      title: title || `${query?.coin || "BTC"} Volume`,
      chart: withQuery({ type: "volume", binding: "liveData.candles", x: "label", y: "volume", variant: "volume" }),
    };
  }
  if (intent === "volatility") {
    return {
      ...component,
      title: title || `${query?.coin || "BTC"} Range And Volatility`,
      chart: withQuery({ type: "area", binding: "liveData.candles", x: "label", y: "high", y2: "low", variant: "range" }),
      note: "Range uses candle high/low from the selected historical window; it is read-only market context, not advice.",
    };
  }
  if (intent === "market_depth") {
    return {
      ...component,
      title: title || `${query?.coin || "BTC"} Book Depth`,
      chart: withQuery({ type: "market-depth", binding: "liveData.book", x: "label", y: "notional", color: "side" }),
    };
  }
  if (intent === "market_odds") {
    return {
      ...component,
      title: title || "Active Market Odds",
      chart: { type: "horizontal-bar", binding: "liveData.markets", x: "yes", y: "label" },
    };
  }
  if (intent === "token_velocity") {
    return {
      ...component,
      title: title || "Token Velocity",
      chart: { type: "bar", binding: "liveData.tokens", x: "label", y: "change" },
    };
  }
  if (intent === "grid_load") {
    return {
      ...component,
      title: title || `${query?.respondent || "US48"} Load vs Forecast`,
      chart: withQuery({ type: "area", binding: "liveData.series", x: "label", y: "loadMw", y2: "forecastMw" }),
      note: "Load, forecast, and margin come from the normalized grid channel; stress and frequency remain display proxies.",
    };
  }
  if (intent === "fuel_mix") {
    return {
      ...component,
      title: title || "Fuel Mix",
      chart: withQuery({ type: "bar", binding: "liveData.fuelMix", x: "label", y: "value" }),
    };
  }
  if (intent === "corridor_stress") {
    return {
      ...component,
      title: title || "Corridor Stress",
      chart: withQuery({ type: "bar", binding: "liveData.corridors", x: "label", y: "stressPct" }),
      note: "Corridor stress is a modeled display proxy derived from the normalized grid packet.",
    };
  }
  if (intent === "feed_timeline") {
    return {
      ...component,
      title: title || "Feed Timeline",
      chart: { type: "bar", binding: "liveSummary.feed", x: "label", y: "value" },
    };
  }
  return {
    ...component,
    title: title || "Metric Snapshot",
    chart: { type: "bar", binding: "liveSummary.metrics", x: "label", y: "value" },
  };
}

function applyDashboardChart(dashboardId, raw = {}, instruction = "", source = "kat-realtime") {
  const id = cleanDashboardId(dashboardId);
  if (!id || !PANELS.some((panel) => panel.id === id)) throw new Error("unknown dashboard");
  const channel = getChannel(id);
  if (!channel) throw new Error("unknown channel");
  const slot = raw.slot === "rail" ? "rail" : "stageOverlay";
  const component = chartComponentForIntent(channel, raw, instruction);
  const mutation = raw.replace === false
    ? { type: "add_component", slot, component }
    : { type: "replace_slot", slot, components: [component] };
  return applyDashboardMutation(id, mutation, instruction || `Create ${component.title}.`, source);
}

function realtimeTools() {
  const workspaceEnum = PANELS.map((panel) => panel.id);
  const componentTypes = Object.keys(componentRegistry());
  const views = Object.keys(viewPresets());
  const surfaceEnum = Object.keys(surfaceRegistry());
  const capabilityEnum = ["snapshot", "timeseries", "events", "rankings", "entity_detail", "relationships", "search", "historical_state"];
  const bindingEnum = Array.from(new Set(["none", "liveSummary.metrics", "liveSummary.feed", "liveSummary.highlights", "dashboard.metrics", "dashboard.feed", ...CHART_BINDINGS]));
  const chartSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      type: { type: "string", enum: CHART_TYPES },
      binding: { type: "string", enum: CHART_BINDINGS },
      title: { type: "string" },
      x: { type: "string", description: "Optional data field for the x axis." },
      y: { type: "string", description: "Optional data field for the primary y/value axis." },
      y2: { type: "string", description: "Optional secondary value field, used for overlays when supported." },
      color: { type: "string", description: "Optional data field for color grouping." },
      label: { type: "string", description: "Optional label field." },
      variant: { type: "string", description: "Optional visual variant such as line, area, ohlc, range, or volume." },
      seriesFields: { type: "array", items: { type: "string" }, maxItems: 6 },
      query: {
        type: "object",
        additionalProperties: false,
        properties: {
          coin: { type: "string" },
          interval: { type: "string" },
          lookbackHours: { type: "number" },
          candles: { type: "number" },
          startTime: { type: "string" },
          endTime: { type: "string" },
          respondent: { type: "string" },
        },
      },
    },
    required: ["type"],
  };
  const componentSchema = {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      type: { type: "string", enum: componentTypes },
      eyebrow: { type: "string" },
      title: { type: "string" },
      body: { type: "string" },
      value: { type: "string" },
      note: { type: "string" },
      variant: { type: "string" },
      binding: { type: "string", enum: bindingEnum },
      chart: chartSchema,
      metrics: {
        type: "array",
        maxItems: 6,
        items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
      },
      rows: {
        type: "array",
        maxItems: 8,
        items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
      },
      items: { type: "array", items: { type: "string" }, maxItems: 8 },
    },
    required: ["type"],
  };
  return [
    {
      type: "function",
      name: "open_dashboard",
      description: "Open a Katechon dashboard or return to the landing panel when the user asks to navigate.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          workspace: { type: "string", enum: workspaceEnum },
        },
        required: ["workspace"],
      },
    },
    {
      type: "function",
      name: "get_dashboard_context",
      description: "Read the currently open dashboard context before answering detailed dashboard questions.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum },
        },
      },
    },
    {
      type: "function",
      name: "get_channel_context",
      description: "Read the active channel context packet, including compact live data, provider docs, dashboard layout, and edit rules.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum },
          fresh: { type: "boolean", description: "When true, refresh live provider data before summarizing." },
        },
      },
    },
    {
      type: "function",
      name: "get_channel_live",
      description: "Read current channel live data. Use summary first; request compact detail only when the user asks about specific rows, markets, tokens, or levels.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum },
          detail: { type: "string", enum: ["summary", "compact"], description: "summary is preferred for voice; compact includes trimmed data." },
          coin: { type: "string", description: "Optional Hyperliquid coin, for example BTC or ETH." },
          interval: { type: "string", description: "Optional Hyperliquid candle interval, for example 1m, 15m, 1h, or 1d." },
          lookbackHours: { type: "number", description: "Optional historical lookback in hours." },
          candles: { type: "number", description: "Optional target candle count." },
          startTime: { type: "string", description: "Optional historical start time as ISO, unix seconds, or unix milliseconds." },
          endTime: { type: "string", description: "Optional historical end time as ISO, unix seconds, or unix milliseconds." },
          respondent: { type: "string", description: "Optional EIA grid respondent, for example US48, CAL, ERCO, or PJM." },
        },
      },
    },
    {
      type: "function",
      name: "query_channel_capability",
      description:
        "Query the active channel through generic capabilities before composing a view. Prefer this over provider-specific assumptions when the user asks for arbitrary information, comparisons, history, rankings, events, or entity details.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum.filter((id) => id !== "landing") },
          capability: { type: "string", enum: capabilityEnum },
          detail: { type: "string", enum: ["summary", "compact", "rows"] },
          params: {
            type: "object",
            additionalProperties: false,
            properties: {
              entity: { type: "string" },
              entities: { type: "array", items: { type: "string" }, maxItems: 8 },
              query: { type: "string" },
              topic: { type: "string" },
              metric: { type: "string" },
              direction: { type: "string" },
              interval: { type: "string" },
              lookbackHours: { type: "number" },
              startTime: { type: "string" },
              endTime: { type: "string" },
              limit: { type: "number" },
              depth: { type: "number" },
              compareTo: { type: "string" },
              coin: { type: "string" },
              respondent: { type: "string" },
              candles: { type: "number" },
            },
          },
        },
        required: ["dashboardId", "capability"],
      },
    },
    {
      type: "function",
      name: "route_channel_turn",
      description:
        "Route a meaningful user request through the active specialist channel agent. This updates channel session state, queries data, replaces generated surfaces, and returns morph events.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum.filter((id) => id !== "landing") },
          userText: { type: "string" },
          sessionId: { type: "string" },
        },
        required: ["dashboardId", "userText"],
      },
    },
    {
      type: "function",
      name: "summarize_channel_state",
      description: "Read the current channel session state without changing generated surfaces.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum.filter((id) => id !== "landing") },
          sessionId: { type: "string" },
        },
        required: ["dashboardId"],
      },
    },
    {
      type: "function",
      name: "clear_channel_surfaces",
      description: "Clear generated channel surfaces through the channel runtime when the user asks to reset or remove generated output.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum.filter((id) => id !== "landing") },
          sessionId: { type: "string" },
          surfaces: { type: "array", items: { type: "string", enum: surfaceEnum }, maxItems: 3 },
          instruction: { type: "string" },
        },
        required: ["dashboardId"],
      },
    },
    {
      type: "function",
      name: "apply_channel_update",
      description:
        "Apply a validated channel update spec. Use this for generated layouts, charts, components, tables, modals, rail updates, stage visuals, and personalized channel views. Generated surfaces replace by default.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum.filter((id) => id !== "landing") },
          instruction: { type: "string" },
          update: {
            type: "object",
            additionalProperties: false,
            properties: {
              layout: {
                type: "object",
                additionalProperties: false,
                properties: {
                  template: { type: "string", enum: views },
                  rationale: { type: "string" },
                },
              },
              dataRequests: {
                type: "array",
                maxItems: 6,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    capability: { type: "string", enum: capabilityEnum },
                    detail: { type: "string", enum: ["summary", "compact", "rows"] },
                    params: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        entity: { type: "string" },
                        entities: { type: "array", items: { type: "string" }, maxItems: 8 },
                        query: { type: "string" },
                        topic: { type: "string" },
                        metric: { type: "string" },
                        direction: { type: "string" },
                        interval: { type: "string" },
                        lookbackHours: { type: "number" },
                        startTime: { type: "string" },
                        endTime: { type: "string" },
                        limit: { type: "number" },
                        depth: { type: "number" },
                        compareTo: { type: "string" },
                        coin: { type: "string" },
                        respondent: { type: "string" },
                        candles: { type: "number" },
                      },
                    },
                    reason: { type: "string" },
                  },
                  required: ["capability"],
                },
              },
              patch: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  subtitle: { type: "string" },
                  kicker: { type: "string" },
                  visualLabel: { type: "string" },
                  visualCopy: { type: "string" },
                  feedLabel: { type: "string" },
                  lens: { type: "string" },
                  caption: { type: "string" },
                  tabs: { type: "array", items: { type: "string" }, maxItems: 6 },
                  metrics: {
                    type: "array",
                    maxItems: 3,
                    items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
                  },
                  feed: {
                    type: "array",
                    maxItems: 6,
                    items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
                  },
                },
              },
              surfaces: {
                type: "array",
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    surface: { type: "string", enum: surfaceEnum },
                    mode: { type: "string", enum: ["replace", "append", "clear"] },
                    components: { type: "array", maxItems: 4, items: componentSchema },
                  },
                  required: ["surface", "mode"],
                },
              },
              themeTokens: {
                type: "object",
                additionalProperties: false,
                properties: {
                  accent: { type: "string" },
                  accent2: { type: "string" },
                  accent3: { type: "string" },
                },
              },
              narration: { type: "string" },
            },
          },
        },
        required: ["dashboardId", "instruction", "update"],
      },
    },
    {
      type: "function",
      name: "apply_dashboard_edit",
      description:
        "Modify the active dashboard through the safe override schema when the user asks Kat to change copy, metrics, feed rows, tabs, or small CSS polish. Do not call for ordinary questions.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum.filter((id) => id !== "landing") },
          instruction: { type: "string" },
          patch: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              subtitle: { type: "string" },
              kicker: { type: "string" },
              visualLabel: { type: "string" },
              visualCopy: { type: "string" },
              feedLabel: { type: "string" },
              lens: { type: "string" },
              caption: { type: "string" },
              tabs: { type: "array", items: { type: "string" }, maxItems: 6 },
              metrics: {
                type: "array",
                maxItems: 3,
                items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
              },
              feed: {
                type: "array",
                maxItems: 6,
                items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
              },
              customCss: { type: "string" },
            },
          },
        },
        required: ["dashboardId", "instruction", "patch"],
      },
    },
    {
      type: "function",
      name: "apply_dashboard_chart",
      description:
        "Deterministically add a useful generated Vega chart. Prefer this over apply_dashboard_mutation whenever the user asks for a chart, graph, plot, visual, graphic, candle chart, market depth, odds chart, token chart, or grid chart.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum.filter((id) => id !== "landing") },
          instruction: { type: "string" },
          intent: {
            type: "string",
            enum: DASHBOARD_CHART_INTENTS,
            description: "Use auto when unsure; the server maps the intent to the active channel provider.",
          },
          slot: { type: "string", enum: ["rail", "stageOverlay"] },
          title: { type: "string" },
          replace: { type: "boolean", description: "Replace the target slot instead of appending." },
          coin: { type: "string", description: "Optional Hyperliquid coin, for example BTC, ETH, or SOL." },
          interval: { type: "string", description: "Optional Hyperliquid candle interval, for example 1m, 5m, 15m, 1h, 4h, or 1d." },
          lookbackHours: { type: "number", description: "Optional historical lookback in hours, capped server-side." },
          candles: { type: "number", description: "Optional target candle count, capped server-side." },
          startTime: { type: "string", description: "Optional historical start time as ISO, unix seconds, or unix milliseconds." },
          endTime: { type: "string", description: "Optional historical end time as ISO, unix seconds, or unix milliseconds." },
          style: { type: "string", description: "Optional visual style, for example line, area, candlestick, volume, scatter, or market-depth." },
          variant: { type: "string", description: "Optional variant label for the chart renderer." },
          respondent: { type: "string", description: "Optional EIA respondent, for example US48, CAL, ERCO, or PJM." },
        },
        required: ["dashboardId", "instruction", "intent"],
      },
    },
    {
      type: "function",
      name: "apply_dashboard_mutation",
      description:
        "Fast dashboard generation tool. Compose a dashboard from prebuilt components and view presets. Prefer this over apply_dashboard_edit for user requests like add a panel, make an investor view, create a brief, show a timeline, or reshape this dashboard.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          dashboardId: { type: "string", enum: workspaceEnum.filter((id) => id !== "landing") },
          instruction: { type: "string" },
          mutation: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: {
                type: "string",
                enum: ["set_view", "set_copy", "replace_slot", "add_component", "set_theme_tokens", "clear_generated"],
              },
              view: { type: "string", enum: views },
              slot: { type: "string", enum: ["rail", "stageOverlay"] },
              patch: {
                type: "object",
                additionalProperties: false,
                properties: {
                  title: { type: "string" },
                  subtitle: { type: "string" },
                  kicker: { type: "string" },
                  visualLabel: { type: "string" },
                  visualCopy: { type: "string" },
                  feedLabel: { type: "string" },
                  lens: { type: "string" },
                  caption: { type: "string" },
                  tabs: { type: "array", items: { type: "string" }, maxItems: 6 },
                  metrics: {
                    type: "array",
                    maxItems: 3,
                    items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
                  },
                  feed: {
                    type: "array",
                    maxItems: 6,
                    items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
                  },
                },
              },
              component: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  type: { type: "string", enum: componentTypes },
                  eyebrow: { type: "string" },
                  title: { type: "string" },
                  body: { type: "string" },
                  value: { type: "string" },
                  note: { type: "string" },
                  variant: { type: "string" },
                  binding: {
                    type: "string",
                    enum: bindingEnum,
                  },
                  chart: chartSchema,
                  metrics: {
                    type: "array",
                    maxItems: 6,
                    items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
                  },
                  rows: {
                    type: "array",
                    maxItems: 8,
                    items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
                  },
                  items: { type: "array", items: { type: "string" }, maxItems: 8 },
                },
                required: ["type"],
              },
              components: {
                type: "array",
                maxItems: 4,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    type: { type: "string", enum: componentTypes },
                    eyebrow: { type: "string" },
                    title: { type: "string" },
                    body: { type: "string" },
                    value: { type: "string" },
                    note: { type: "string" },
                    variant: { type: "string" },
                    binding: {
                      type: "string",
                      enum: bindingEnum,
                    },
                    chart: chartSchema,
                    metrics: {
                      type: "array",
                      maxItems: 6,
                      items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
                    },
                    rows: {
                      type: "array",
                      maxItems: 8,
                      items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
                    },
                    items: { type: "array", items: { type: "string" }, maxItems: 8 },
                  },
                  required: ["type"],
                },
              },
              themeTokens: {
                type: "object",
                additionalProperties: false,
                properties: {
                  accent: { type: "string" },
                  accent2: { type: "string" },
                  accent3: { type: "string" },
                },
              },
            },
            required: ["type"],
          },
        },
        required: ["dashboardId", "instruction", "mutation"],
      },
    },
  ];
}

function realtimeInstructions(dashboardId) {
  const context = katContextBootstrap(dashboardId);
  const panelCatalog = PANELS.map((panel) => `${panel.id}: ${panel.label} - ${panel.description}`).join("\n");
  return [
    "You are Kat, the voice-native agent inside Katechon.",
    "Talk naturally and concisely. The user is holding push-to-talk, so answer in short spoken turns.",
    "You can discuss the active dashboard, navigate between dashboards, query channel capabilities, and compose channel views from validated components.",
    "When answering about a dashboard, ground yourself in the provided channel context and liveSummary. Do not invent live facts, prices, events, incidents, trades, or medical claims.",
    "For meaningful channel-specific user requests, prefer route_channel_turn so the specialist channel agent updates state, data, layout, surfaces, provenance, and next actions together.",
    "If the user asks for current data that is not in liveSummary and does not need a full morph, call query_channel_capability before answering.",
    "When manually composing a view, call apply_channel_update rather than legacy dashboard mutation tools.",
    "Use apply_dashboard_chart, apply_dashboard_mutation, and apply_dashboard_edit only as legacy helpers when a narrow compatibility action is enough.",
    "Generated charts and components should replace the target generated surface by default; append only when the user explicitly asks to keep multiple.",
    "For primary charts, prefer surface=stageOverlay so the chart renders as a clean stage surface over the dashboard graphic.",
    "Use dataRequests in apply_channel_update to document what you queried or intended to query, but do not invent unsupported data.",
    "Every generated chart or insight must include provenance; synthetic fallback must be named as fallback.",
    "Think like a fast channel composer, not an arbitrary code writer: choose capabilities, layouts, surfaces, components, copy, chart bindings, and theme tokens.",
    "When the user asks to write arbitrary source code outside the safe dashboard override schema, explain that you can draft it but cannot apply arbitrary files from voice yet.",
    `Current channel context:\n${JSON.stringify(context, null, 2)}`,
    `Available dashboards:\n${panelCatalog}`,
  ].join("\n\n");
}

function realtimeSessionConfig(dashboardId) {
  return {
    type: "realtime",
    model: OPENAI_REALTIME_MODEL,
    instructions: realtimeInstructions(dashboardId),
    audio: {
      input: {
        format: { type: "audio/pcm", rate: 24000 },
        transcription: { model: OPENAI_REALTIME_TRANSCRIBE_MODEL },
        turn_detection: null,
      },
      output: {
        voice: OPENAI_REALTIME_VOICE,
      },
    },
    tools: realtimeTools(),
    tool_choice: "auto",
    tracing: "auto",
  };
}

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

function redactLiveErrorMessage(message) {
  return String(message || "live provider unavailable")
    .replace(/([?&]api_key=)[^&\s]+/gi, "$1<redacted>")
    .replace(/(api_key=)[^&\s]+/gi, "$1<redacted>")
    .replace(/(authorization:\s*bearer\s+)[^\s]+/gi, "$1<redacted>");
}

const LIVE_API_TIMEOUT_MS = Number(process.env.LIVE_API_TIMEOUT_MS || 900);
const EIA_API_TIMEOUT_MS = Number(process.env.EIA_API_TIMEOUT_MS || Math.max(3500, LIVE_API_TIMEOUT_MS));
const LIVE_API_TTL_MS = Number(process.env.LIVE_API_TTL_MS || 12000);
const LIVE_API_CACHE = new Map();
const HYPERLIQUID_INTERVAL_MS = {
  "1m": 60 * 1000,
  "3m": 3 * 60 * 1000,
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};
const HYPERLIQUID_MAX_CANDLES = 180;
const HYPERLIQUID_MAX_LOOKBACK_HOURS = 24 * 120;

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

function sanitizeHyperliquidCoin(value, fallback = "BTC") {
  return String(value || fallback).toUpperCase().replace(/[^A-Z0-9:_-]/g, "").slice(0, 18) || fallback;
}

function sanitizeHyperliquidInterval(value, fallback = "15m") {
  const interval = String(value || fallback).toLowerCase().replace(/\s+/g, "");
  return HYPERLIQUID_INTERVAL_MS[interval] ? interval : fallback;
}

function parseMarketTimeMs(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value > 100000000000 ? Math.round(value) : Math.round(value * 1000);
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    return n > 100000000000 ? n : n * 1000;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeLookbackHours(value, fallback = 24) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(1, Math.min(HYPERLIQUID_MAX_LOOKBACK_HOURS, n));
}

function sanitizeCandleCount(value, fallback = 96) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.max(12, Math.min(HYPERLIQUID_MAX_CANDLES, n));
}

function hyperliquidQueryFrom(input = {}) {
  const query = input?.query || input || {};
  const coin = sanitizeHyperliquidCoin(query.coin || input.coin);
  const interval = sanitizeHyperliquidInterval(query.interval || input.interval);
  const intervalMs = HYPERLIQUID_INTERVAL_MS[interval] || HYPERLIQUID_INTERVAL_MS["15m"];
  const now = Date.now();
  const requestedEnd = parseMarketTimeMs(query.endTime || query.end || input.endTime || input.end);
  const requestedStart = parseMarketTimeMs(query.startTime || query.start || input.startTime || input.start);
  const lookbackHours = sanitizeLookbackHours(query.lookbackHours || query.hours || input.lookbackHours || input.hours, 24);
  const candleCount = sanitizeCandleCount(query.candles || input.candles, Math.ceil((lookbackHours * 60 * 60 * 1000) / intervalMs));
  const endTime = Math.min(requestedEnd || now, now);
  const maxRangeMs = Math.min(HYPERLIQUID_MAX_LOOKBACK_HOURS * 60 * 60 * 1000, HYPERLIQUID_MAX_CANDLES * intervalMs);
  const computedStart = endTime - Math.min(lookbackHours * 60 * 60 * 1000, candleCount * intervalMs, maxRangeMs);
  const unclampedStart = Math.max(0, Math.min(requestedStart || computedStart, endTime - intervalMs));
  const startTime = Math.max(endTime - maxRangeMs, unclampedStart);
  return {
    coin,
    interval,
    intervalMs,
    startTime,
    endTime,
    lookbackHours: Math.max(1 / 60, (endTime - startTime) / (60 * 60 * 1000)),
    candles: Math.min(HYPERLIQUID_MAX_CANDLES, Math.ceil((endTime - startTime) / intervalMs)),
  };
}

function syntheticCandles(seed, count, base, intervalMs = 15 * 60 * 1000, endTime = Date.now()) {
  return Array.from({ length: count }, (_, index) => {
    const open = base + seededFloat(`${seed}:open:${index}`, -base * 0.015, base * 0.015);
    const close = open + seededFloat(`${seed}:close:${index}`, -base * 0.009, base * 0.009);
    return {
      t: endTime - (count - index) * intervalMs,
      o: open.toFixed(2),
      h: Math.max(open, close + seededFloat(`${seed}:high:${index}`, 4, base * 0.004)).toFixed(2),
      l: Math.min(open, close - seededFloat(`${seed}:low:${index}`, 4, base * 0.004)).toFixed(2),
      c: close.toFixed(2),
      v: seededFloat(`${seed}:volume:${index}`, 0.4, 18).toFixed(4),
    };
  });
}

function syntheticHyperliquidData(input = "BTC") {
  const query = hyperliquidQueryFrom(typeof input === "string" ? { coin: input } : input);
  const coin = query.coin;
  const base = coin === "ETH" ? 3400 : coin === "SOL" ? 155 : 68000;
  const mid = base + seededFloat(`${coin}:mid`, -base * 0.018, base * 0.018);
  return {
    coin,
    interval: query.interval,
    startTime: query.startTime,
    endTime: query.endTime,
    lookbackHours: query.lookbackHours,
    mid,
    spreadBps: seededFloat(`${coin}:spread`, 2.2, 8.8),
    depthUsd: seededFloat(`${coin}:depth`, 52000, 184000),
    candles: syntheticCandles(`${coin}:${query.interval}:${query.startTime}`, Math.max(12, Math.min(query.candles, 96)), mid, query.intervalMs, query.endTime),
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
  const query = hyperliquidQueryFrom(req);
  const { coin, interval, startTime, endTime } = query;
  const [mids, book, candles] = await Promise.all([
    fetchHyperliquidInfo({ type: "allMids" }),
    fetchHyperliquidInfo({ type: "l2Book", coin }),
    fetchHyperliquidInfo({ type: "candleSnapshot", req: { coin, interval, startTime, endTime } }),
  ]);
  const bid = Number(book?.levels?.[0]?.[0]?.px);
  const ask = Number(book?.levels?.[1]?.[0]?.px);
  const mid = Number(mids?.[coin]) || (Number.isFinite(bid) && Number.isFinite(ask) ? (bid + ask) / 2 : 0);
  const depthUsd = [...(book?.levels?.[0] || []).slice(0, 8), ...(book?.levels?.[1] || []).slice(0, 8)]
    .reduce((sum, level) => sum + Number(level.px || 0) * Number(level.sz || 0), 0);

  return {
    coin,
    interval,
    startTime,
    endTime,
    lookbackHours: query.lookbackHours,
    mid,
    spreadBps: mid && Number.isFinite(bid) && Number.isFinite(ask) ? ((ask - bid) / mid) * 10000 : 0,
    depthUsd,
    candles: Array.isArray(candles) ? candles.slice(-HYPERLIQUID_MAX_CANDLES) : [],
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
    ["Will a major AI model top the live agent benchmark this quarter?", "culture", 0.51, 186000],
    ["Will BTC close above the watched threshold by Friday?", "crypto", 0.48, 422000],
    ["Will the Fed signal another rate cut before the next meeting?", "macro", 0.55, 315000],
    ["Will an election market flip leaders before Sunday?", "election", 0.46, 288000],
    ["Will a surprise sports upset market clear 40% before kickoff?", "sports", 0.34, 93000],
  ];
  return {
    markets: questions.map(([question, category, yes, volume], index) => ({
      id: `synthetic-${index}`,
      question,
      yes,
      no: 1 - yes,
      volume,
      category,
      tags: [category],
    })),
    updatedAt: Date.now(),
  };
}

async function getPolymarketLiveData() {
  const url = "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=200";
  const markets = await fetchLiveJson(url);
  return {
    markets: (Array.isArray(markets) ? markets : []).slice(0, 200).map((market, index) => {
      const outcomes = parseMaybeJsonArray(market.outcomes);
      const prices = parseMaybeJsonArray(market.outcomePrices).map(Number);
      const yesIndex = outcomes.findIndex((outcome) => String(outcome).toLowerCase() === "yes");
      const yes = Number.isFinite(prices[yesIndex]) ? prices[yesIndex] : Number(prices[0] || seededFloat(`poly-live:${index}`, 0.25, 0.75));
      const rawTags = Array.isArray(market.tags) ? market.tags : parseMaybeJsonArray(market.tags);
      const tags = rawTags.map((tag) => typeof tag === "string" ? tag : tag?.label || tag?.name || tag?.slug || "").filter(Boolean).slice(0, 6);
      return {
        id: market.id || market.conditionId || market.slug || `market-${index}`,
        question: market.question || market.title || "Public prediction market updated.",
        yes,
        no: Math.max(0, 1 - yes),
        volume: Number(market.volumeNum || market.volume24hr || market.volume || market.liquidity || 0),
        liquidity: Number(market.liquidityNum || market.liquidity || 0),
        category: market.category || tags[0] || "market",
        tags,
      };
    }),
    updatedAt: Date.now(),
  };
}

function parseUsdNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value || "").trim().toLowerCase();
  if (!text) return 0;
  const multiplier = text.endsWith("b") ? 1000000000 : text.endsWith("m") ? 1000000 : text.endsWith("k") ? 1000 : 1;
  const n = Number(text.replace(/[$,\s]/g, "").replace(/[bmk]$/, ""));
  return Number.isFinite(n) ? n * multiplier : 0;
}

function memeRiskLabel(score) {
  const value = Number(score);
  if (value >= 76) return "high risk";
  if (value >= 52) return "fragile";
  if (value >= 28) return "watch";
  return "lower signal";
}

function normalizePumpfunToken(raw = {}, index = 0) {
  const name = clampText(raw.name || raw.title || raw.symbol || `Token ${index + 1}`, 80);
  const symbol = clampText(String(raw.symbol || name.split(/\s+/).map((part) => part[0]).join("")).toUpperCase(), 18) || `TOK${index + 1}`;
  const price = numberOr(raw.current_price ?? raw.price, 0);
  const change1h = numberOr(raw.price_change_percentage_1h_in_currency ?? raw.change1h, seededFloat(`pump:change:${index}`, -18, 42));
  const change24h = numberOr(raw.price_change_percentage_24h_in_currency ?? raw.price_change_percentage_24h ?? raw.change24h, seededFloat(`pump:change24:${index}`, -32, 118));
  const marketCapUsd = parseUsdNumber(raw.market_cap ?? raw.marketCapUsd ?? raw.marketCap) || Math.round(seededFloat(`pump:mcap:${name}:${index}`, 28000, 2800000));
  const volume24hUsd = parseUsdNumber(raw.total_volume ?? raw.volume24hUsd ?? raw.volume) || Math.round(marketCapUsd * seededFloat(`pump:volume:${name}:${index}`, 0.08, 0.72));
  const liquidityUsd = parseUsdNumber(raw.liquidityUsd ?? raw.liquidity ?? raw.reserve_in_usd) || Math.round(Math.max(12000, Math.min(marketCapUsd * 0.42, volume24hUsd * seededFloat(`pump:liq:${name}:${index}`, 0.14, 0.46))));
  const absChange = Math.abs(change1h || change24h || 0);
  const attentionScore = clampNumber(Math.round(absChange * 2.2 + Math.log10(volume24hUsd + 10) * 7 + Math.max(0, change24h) * 0.16), 1, 100);
  const liquidityScore = clampNumber(Math.round(Math.log10(liquidityUsd + 10) * 12), 1, 100);
  const liquidityRisk = clampNumber(Math.round(attentionScore - liquidityScore + Math.max(0, absChange - 8) * 1.4 + (liquidityUsd < 100000 ? 18 : 0)), 0, 100);
  const fragilityScore = clampNumber(Math.round(liquidityRisk * 0.65 + attentionScore * 0.25 + Math.max(0, -change24h) * 0.25), 0, 100);
  const decayScore = clampNumber(Math.round(Math.max(0, change24h - change1h) * 1.15 + Math.max(0, -change1h) * 1.7 + fragilityScore * 0.35), 0, 100);
  return {
    id: clampText(raw.id || raw.coin_id || raw.address || symbol.toLowerCase(), 80),
    name,
    symbol,
    label: symbol,
    price,
    priceLabel: price ? `$${price < 1 ? price.toFixed(6) : price.toFixed(4)}` : "n/a",
    change1h,
    change24h,
    change: change1h,
    marketCap: formatCompactUsd(marketCapUsd),
    marketCapUsd,
    volume24hUsd,
    liquidityUsd,
    attentionScore,
    liquidityScore,
    liquidityRisk,
    fragilityScore,
    decayScore,
    riskLabel: memeRiskLabel(Math.max(liquidityRisk, fragilityScore)),
    why: `${formatPercent(change1h)} 1H attention against ${formatCompactUsd(liquidityUsd)} visible liquidity.`,
  };
}

function rankPumpfunTokens(tokens = [], metric = "velocity") {
  const field = metric === "liquidity_risk"
    ? "liquidityRisk"
    : metric === "fragility"
      ? "fragilityScore"
      : metric === "narrative_decay"
        ? "decayScore"
        : "change1h";
  return [...tokens].sort((a, b) => Math.abs(numberOr(b[field], 0)) - Math.abs(numberOr(a[field], 0)));
}

function syntheticPumpfunData() {
  const names = [
    "Neon Terminal",
    "Signal Wif Board",
    "Liquidity Mirage",
    "Meme Reactor",
    "Bonding Curve Club",
    "Exit Liquidity Cafe",
    "Posting Spiral",
    "Ticker Temple",
  ];
  return {
    tokens: names.map((name, index) => normalizePumpfunToken({
      name,
      symbol: name.split(" ").map((part) => part[0]).join("").slice(0, 6),
      price: seededFloat(`pump:price:${index}`, 0.00002, 0.018),
      change1h: seededFloat(`pump:change:${index}`, -18, 42),
      change24h: seededFloat(`pump:change24:${index}`, -32, 118),
      marketCapUsd: Math.round(seededFloat(`pump:mcap:${index}`, 28000, 2800000)),
      volume24hUsd: Math.round(seededFloat(`pump:volume:${index}`, 12000, 1300000)),
      liquidityUsd: Math.round(seededFloat(`pump:liquidity:${index}`, 18000, 650000)),
    }, index)),
    updatedAt: Date.now(),
  };
}

async function getPumpfunLiveData() {
  const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=pump-fun&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=1h,24h";
  const coins = await fetchLiveJson(url);
  return {
    tokens: (Array.isArray(coins) ? coins : []).slice(0, 10).map(normalizePumpfunToken),
    updatedAt: Date.now(),
  };
}

function cleanEiaRespondent(value) {
  return String(value || process.env.EIA_GRID_RESPONDENT || "US48")
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 12) || "US48";
}

function eiaApiKey() {
  return process.env.EIA_API_KEY || process.env.EIA_KEY || "";
}

function eiaGridDatasetUrl(route, respondent, options = {}) {
  const url = new URL(`https://api.eia.gov/v2/${route}/data/`);
  url.searchParams.set("frequency", options.frequency || "hourly");
  url.searchParams.append("data[0]", "value");
  url.searchParams.append("facets[respondent][]", respondent);
  (options.types || []).forEach((type) => url.searchParams.append("facets[type][]", type));
  url.searchParams.append("sort[0][column]", "period");
  url.searchParams.append("sort[0][direction]", "desc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("length", String(options.length || 96));
  if (eiaApiKey()) url.searchParams.set("api_key", eiaApiKey());
  return url.toString();
}

async function fetchEiaGridDataset(route, respondent, options = {}) {
  if (!eiaApiKey()) throw new Error("EIA_API_KEY is not configured");
  const json = await fetchLiveJson(eiaGridDatasetUrl(route, respondent, options), { timeout: EIA_API_TIMEOUT_MS });
  const rows = json?.response?.data;
  if (!Array.isArray(rows) || !rows.length) throw new Error(`EIA ${route} returned no rows for ${respondent}`);
  return rows;
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function eiaPeriodTime(period) {
  const text = String(period || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})/);
  if (!match) return Date.now();
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]));
}

function displayGridPeriod(period) {
  const time = eiaPeriodTime(period);
  if (!Number.isFinite(time)) return String(period || "now");
  return new Date(time).toISOString().slice(5, 13).replace("T", " ");
}

function deriveGridRow(row, index, respondent) {
  const loadMw = asNumber(row.loadMw) || seededFloat(`${respondent}:load:${index}`, 318000, 512000);
  const forecastMw = asNumber(row.forecastMw) || loadMw * (1 + seededFloat(`${respondent}:forecast:${index}`, -0.018, 0.024));
  const netGenerationMw = asNumber(row.netGenerationMw) || loadMw * (1 + seededFloat(`${respondent}:net:${index}`, -0.022, 0.028));
  const interchangeMw = asNumber(row.interchangeMw);
  const interchange = interchangeMw === null ? netGenerationMw - loadMw : interchangeMw;
  const operatingMarginPct = clampNumber(((netGenerationMw + Math.max(0, interchange) - loadMw) / Math.max(1, loadMw)) * 100, -12, 32);
  const forecastGapPct = Math.abs(forecastMw - loadMw) / Math.max(1, loadMw) * 100;
  const interchangePct = Math.abs(interchange) / Math.max(1, loadMw) * 100;
  const stressPct = clampNumber(34 + forecastGapPct * 4.2 + Math.max(0, -operatingMarginPct) * 2.4 + interchangePct * 0.7 + seededFloat(`${respondent}:stress:${row.period || index}`, -7, 9), 8, 96);
  const frequencyHz = clampNumber(60 + seededFloat(`${respondent}:hz:${row.period || index}`, -0.026, 0.026) - (stressPct - 50) / 3600, 59.92, 60.08);

  return {
    ...row,
    loadMw,
    forecastMw,
    netGenerationMw,
    interchangeMw: interchange,
    operatingMarginPct,
    stressPct,
    frequencyHz,
    time: eiaPeriodTime(row.period),
    label: displayGridPeriod(row.period),
  };
}

function normalizeEiaRegionRows(rows, respondent) {
  const byPeriod = new Map();
  rows.forEach((row) => {
    const period = row.period;
    if (!period) return;
    const entry = byPeriod.get(period) || {
      period,
      respondent,
      respondentName: row["respondent-name"] || row.respondentName || respondent,
    };
    const type = String(row.type || "").toUpperCase();
    const typeName = String(row["type-name"] || "").toLowerCase();
    const value = asNumber(row.value);
    if (value === null) return;
    if (type === "DF" || typeName.includes("forecast")) entry.forecastMw = value;
    else if (type === "D" || typeName === "demand" || typeName === "load") entry.loadMw = value;
    else if (type === "NG" || typeName.includes("net generation")) entry.netGenerationMw = value;
    else if (type === "TI" || typeName.includes("interchange")) entry.interchangeMw = value;
    byPeriod.set(period, entry);
  });

  return Array.from(byPeriod.values())
    .sort((a, b) => eiaPeriodTime(a.period) - eiaPeriodTime(b.period))
    .slice(-36)
    .map((row, index) => deriveGridRow(row, index, respondent));
}

function normalizeEiaFuelMixRows(rows) {
  const latestPeriod = rows.map((row) => row.period).filter(Boolean).sort().pop();
  const periodRows = rows.filter((row) => row.period === latestPeriod);
  const total = periodRows.reduce((sum, row) => sum + Math.max(0, asNumber(row.value) || 0), 0) || 1;
  return periodRows
    .map((row) => ({
      fueltype: row.fueltype || row.series || "UNK",
      label: row["type-name"] || row.fueltype || "Other",
      mw: Math.max(0, asNumber(row.value) || 0),
      sharePct: (Math.max(0, asNumber(row.value) || 0) / total) * 100,
      period: row.period || latestPeriod,
    }))
    .filter((row) => row.mw > 0)
    .sort((a, b) => b.mw - a.mw)
    .slice(0, 8);
}

function syntheticGridCorridors(respondent, latest = {}) {
  const names = respondent === "US48"
    ? [["PJM", "MISO"], ["SPP", "ERCOT"], ["CAISO", "BANC"], ["NYISO", "ISONE"], ["SERC", "FRCC"]]
    : [[respondent, "NORTH"], [respondent, "SOUTH"], [respondent, "WEST"], [respondent, "EAST"], [respondent, "RESERVE"]];
  return names.map(([from, to], index) => {
    const mw = seededFloat(`${respondent}:corridor:${from}:${to}`, 800, 9400);
    const stress = clampNumber((latest.stressPct || 48) + seededFloat(`${respondent}:corridor:stress:${index}`, -18, 22), 7, 98);
    return { from, to, mw, stressPct: stress };
  });
}

function gridInsights(data) {
  const latest = data.latest || {};
  const fuel = Array.isArray(data.fuelMix) && data.fuelMix[0] ? data.fuelMix[0] : null;
  const margin = asNumber(latest.operatingMarginPct);
  const stress = asNumber(latest.stressPct);
  const load = asNumber(latest.loadMw);
  const forecast = asNumber(latest.forecastMw);
  return [
    load ? `${data.respondentName || data.respondent} load is ${(load / 1000).toFixed(1)} GW.` : "Load is unavailable in the current grid packet.",
    forecast && load ? `Forecast delta is ${((forecast - load) / load * 100).toFixed(1)}%.` : "Forecast delta is unavailable.",
    margin !== null ? `Operating margin proxy is ${margin.toFixed(1)}%.` : "Operating margin proxy is unavailable.",
    stress !== null ? `Corridor stress proxy is ${stress.toFixed(0)}%.` : "Corridor stress proxy is unavailable.",
    fuel ? `${fuel.label} leads fuel mix at ${fuel.sharePct.toFixed(0)}%.` : "Fuel mix was not included in this refresh.",
  ];
}

function gridFeed(data) {
  const latest = data.latest || {};
  const respondent = data.respondentName || data.respondent || "grid";
  const corridors = Array.isArray(data.corridors) ? data.corridors : [];
  return [
    ["now", `${respondent} refreshed load, forecast, generation, and interchange state.`, data.sourceNote || "EIA"],
    ["01h", `Load sits near ${formatMegawatts(latest.loadMw)} with forecast at ${formatMegawatts(latest.forecastMw)}.`, "balancing"],
    ["02h", `Operating margin proxy is ${formatSignedPercent(latest.operatingMarginPct)}.`, "reserve proxy"],
    ["03h", corridors[0] ? `${corridors[0].from}-${corridors[0].to} corridor stress proxy is ${Math.round(corridors[0].stressPct)}%.` : "Corridor stress proxy refreshed.", "corridors"],
    ["04h", `Frequency display is modeled at ${Number(latest.frequencyHz || 60).toFixed(3)} Hz from grid stress.`, "modeled"],
  ];
}

function syntheticPowerGridData(input = {}) {
  const respondent = cleanEiaRespondent(input?.query?.respondent || input?.respondent || input);
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const series = Array.from({ length: 30 }, (_, index) => {
    const time = now - (29 - index) * hour;
    const period = new Date(time).toISOString().slice(0, 13);
    const base = respondent === "US48" ? 422000 : 28000;
    const wave = Math.sin((index / 29) * Math.PI * 2 - 0.7);
    const loadMw = base + wave * base * 0.08 + seededFloat(`${respondent}:synthetic:${index}`, -base * 0.025, base * 0.025);
    return deriveGridRow({
      period,
      respondent,
      respondentName: respondent === "US48" ? "United States Lower 48" : respondent,
      loadMw,
      forecastMw: loadMw * (1 + seededFloat(`${respondent}:synthetic:forecast:${index}`, -0.012, 0.018)),
      netGenerationMw: loadMw * (1 + seededFloat(`${respondent}:synthetic:net:${index}`, -0.016, 0.026)),
      interchangeMw: seededFloat(`${respondent}:synthetic:interchange:${index}`, -6500, 7200),
    }, index, respondent);
  });
  const latest = series[series.length - 1];
  const fuelMix = [
    ["Natural Gas", "NG", 0.36],
    ["Nuclear", "NUC", 0.19],
    ["Coal", "COL", 0.16],
    ["Wind", "WND", 0.12],
    ["Solar", "SUN", 0.09],
    ["Hydro", "HYC", 0.05],
    ["Other", "OTH", 0.03],
  ].map(([label, fueltype, share]) => ({
    label,
    fueltype,
    mw: Math.round((latest.netGenerationMw || latest.loadMw) * share),
    sharePct: share * 100,
    period: latest.period,
  }));
  const data = {
    kind: "power-grid-operational-v1",
    mode: "synthetic-grid",
    sourceNote: "EIA-compatible fallback",
    respondent,
    respondentName: respondent === "US48" ? "United States Lower 48" : respondent,
    series,
    latest,
    fuelMix,
    corridors: syntheticGridCorridors(respondent, latest),
    updatedAt: now,
  };
  data.insights = gridInsights(data);
  data.feed = gridFeed(data);
  return data;
}

async function getEIAGridLiveData(req) {
  const respondent = cleanEiaRespondent(req.query.respondent || "US48");
  const regionRows = await fetchEiaGridDataset("electricity/rto/region-data", respondent, {
    length: 192,
    types: ["D", "DF", "NG", "TI"],
  });
  let fuelRows = [];
  try {
    fuelRows = await fetchEiaGridDataset("electricity/rto/fuel-type-data", respondent, { length: 128 });
  } catch (err) {
    console.warn(`EIA fuel mix unavailable for ${respondent}: ${redactLiveErrorMessage(err.message)}`);
  }

  const series = normalizeEiaRegionRows(regionRows, respondent);
  if (!series.length) throw new Error(`EIA region-data could not be normalized for ${respondent}`);
  const latest = series[series.length - 1];
  const data = {
    kind: "power-grid-operational-v1",
    mode: "eia-live",
    sourceNote: "EIA hourly operating data",
    respondent,
    respondentName: latest.respondentName || respondent,
    series,
    latest,
    fuelMix: normalizeEiaFuelMixRows(fuelRows),
    corridors: syntheticGridCorridors(respondent, latest),
    updatedAt: Date.now(),
  };
  data.insights = gridInsights(data);
  data.feed = gridFeed(data);
  return data;
}

async function getCachedLive(req, key, loader, fallback) {
  const source = key.split(":")[0];
  const cached = LIVE_API_CACHE.get(key);
  if (cached && Date.now() - cached.time < LIVE_API_TTL_MS) {
    return { ok: true, source: cached.source, stale: false, data: cached.data, fallbackReason: null };
  }

  try {
    const data = await loader(req);
    LIVE_API_CACHE.set(key, { time: Date.now(), source, data });
    return { ok: true, source, stale: false, data, fallbackReason: null };
  } catch (err) {
    const fallbackReason = redactLiveErrorMessage(err.message);
    if (cached) {
      return { ok: true, source: cached.source, stale: true, data: cached.data, fallbackReason };
    }
    return { ok: true, source: `${source}-synthetic`, stale: true, data: fallback(req), fallbackReason };
  }
}

async function sendCachedLive(req, res, key, loader, fallback) {
  res.json(await getCachedLive(req, key, loader, fallback));
}

app.get("/api/live/hyperliquid", (req, res) => {
  const query = req.query || {};
  const coin = sanitizeHyperliquidCoin(query.coin || "BTC");
  const interval = sanitizeHyperliquidInterval(query.interval || query.timeframe || "15m");
  const lookback = sanitizeLookbackHours(query.lookbackHours || query.hours || query.lookback || 24);
  const candles = query.candles ? sanitizeCandleCount(query.candles) : "";
  const start = parseMarketTimeMs(query.startTime || query.start) || "";
  const end = parseMarketTimeMs(query.endTime || query.end) || "latest";
  const cacheKey = `hyperliquid:${coin}:${interval}:${lookback}:${candles}:${start}:${end}`;
  sendCachedLive(req, res, cacheKey, getHyperliquidLiveData, () => syntheticHyperliquidData(req));
});

app.get("/api/live/polymarket", (req, res) => {
  sendCachedLive(req, res, "polymarket:markets", getPolymarketLiveData, syntheticPolymarketData);
});

app.get("/api/live/pumpfun", (req, res) => {
  sendCachedLive(req, res, "pumpfun:tokens", getPumpfunLiveData, syntheticPumpfunData);
});

app.get("/api/live/eia-grid", (req, res) => {
  const respondent = cleanEiaRespondent(req.query.respondent || "US48");
  sendCachedLive(req, res, `eia-grid:${respondent}`, getEIAGridLiveData, syntheticPowerGridData);
});

function requestWithChannelDefaults(req, channel) {
  return {
    ...req,
    query: {
      ...(channel.defaultQuery || {}),
      ...(req.query || {}),
    },
  };
}

function channelLiveKey(channel, req) {
  const provider = channel.liveProvider;
  if (provider === "hyperliquid") {
    const query = { ...(channel.defaultQuery || {}), ...(req.query || {}) };
    const coin = sanitizeHyperliquidCoin(query.coin || "BTC");
    const interval = sanitizeHyperliquidInterval(query.interval || query.timeframe || "15m");
    const lookback = sanitizeLookbackHours(query.lookbackHours || query.hours || query.lookback || 24);
    const candles = query.candles ? sanitizeCandleCount(query.candles) : "";
    const start = parseMarketTimeMs(query.startTime || query.start) || "";
    const end = parseMarketTimeMs(query.endTime || query.end) || "latest";
    return `${provider}:${channel.id}:${coin}:${interval}:${lookback}:${candles}:${start}:${end}`;
  }
  if (provider === "polymarket") return `${provider}:${channel.id}:markets`;
  if (provider === "pumpfun") return `${provider}:${channel.id}:tokens`;
  if (provider === "eia-grid") {
    const respondent = cleanEiaRespondent(req.query.respondent || channel.defaultQuery?.respondent || "US48");
    return `${provider}:${channel.id}:${respondent}`;
  }
  return `${provider}:${channel.id}`;
}

async function getChannelProviderPayload(req, channel) {
  const provider = channel.liveProvider;
  const providerReq = requestWithChannelDefaults(req, channel);

  if (provider === "hyperliquid") {
    return getCachedLive(providerReq, channelLiveKey(channel, providerReq), getHyperliquidLiveData, () => syntheticHyperliquidData(providerReq));
  }
  if (provider === "polymarket") {
    return getCachedLive(providerReq, channelLiveKey(channel, providerReq), getPolymarketLiveData, syntheticPolymarketData);
  }
  if (provider === "pumpfun") {
    return getCachedLive(providerReq, channelLiveKey(channel, providerReq), getPumpfunLiveData, syntheticPumpfunData);
  }
  if (provider === "eia-grid") {
    return getCachedLive(providerReq, channelLiveKey(channel, providerReq), getEIAGridLiveData, syntheticPowerGridData);
  }

  return {
    ok: true,
    source: "channel-synthetic",
    stale: false,
    data: syntheticChannelData(channel),
    fallbackReason: null,
  };
}

async function getChannelLiveEnvelope(req, channel) {
  const payload = await getChannelProviderPayload(req, channel);
  return {
    ok: true,
    channel: channel.id,
    label: channel.label,
    category: channel.category,
    contract: channel.contract,
    providers: channel.providers,
    liveProvider: channel.liveProvider,
    source: payload.source,
    stale: Boolean(payload.stale),
    updatedAt: payload.data?.updatedAt || Date.now(),
    data: payload.data,
    fallbackReason: payload.fallbackReason || null,
    docs: channel.docsPath,
  };
}

function getCachedChannelLiveEnvelope(req, channel) {
  const providerReq = requestWithChannelDefaults(req || { query: {} }, channel);
  const key = channelLiveKey(channel, providerReq);
  const cached = LIVE_API_CACHE.get(key);
  if (cached) {
    return {
      ok: true,
      channel: channel.id,
      label: channel.label,
      category: channel.category,
      contract: channel.contract,
      providers: channel.providers,
      liveProvider: channel.liveProvider,
      source: cached.source,
      stale: Date.now() - cached.time >= LIVE_API_TTL_MS,
      updatedAt: cached.data?.updatedAt || cached.time,
      data: cached.data,
      fallbackReason: null,
      docs: channel.docsPath,
    };
  }

  const data = syntheticChannelData(channel);
  return {
    ok: true,
    channel: channel.id,
    label: channel.label,
    category: channel.category,
    contract: channel.contract,
    providers: channel.providers,
    liveProvider: channel.liveProvider,
    source: "channel-synthetic",
    stale: true,
    updatedAt: data.updatedAt,
    data,
    fallbackReason: "live cache unavailable for fast context",
    docs: channel.docsPath,
  };
}

function formatUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "n/a";
  return `$${Math.round(n).toLocaleString()}`;
}

function formatCompactUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "n/a";
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function formatMegawatts(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/a";
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(2)} TW`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)} GW`;
  return `${Math.round(n).toLocaleString()} MW`;
}

function formatPercent(value, decimals = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "n/a";
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

function formatSignedPercent(value, decimals = 1) {
  return formatPercent(value, decimals);
}

function sourceIs(envelope, provider) {
  return String(envelope.source || "").replace(/-synthetic$/, "") === provider;
}

function summarizeChannelLive(channel, envelope) {
  const data = envelope.data || {};
  const summary = {
    source: envelope.source,
    stale: Boolean(envelope.stale),
    updatedAt: envelope.updatedAt,
    fallbackReason: envelope.fallbackReason || null,
    contract: envelope.contract,
    metrics: [],
    feed: [],
    highlights: [],
    dataShape: [],
    livePath: channel.livePath,
  };

  if (sourceIs(envelope, "hyperliquid") && data.mid !== undefined) {
    const coin = data.coin || "BTC";
    const interval = data.interval || "15m";
    const rangeHours = Number(data.lookbackHours || 0);
    const mid = Number(data.mid || 0);
    const spread = Number(data.spreadBps || 0);
    const depth = Number(data.depthUsd || 0);
    const candles = Array.isArray(data.candles) ? data.candles : [];
    const last = candles[candles.length - 1] || null;
    summary.metrics = [
      [coin, formatUsd(mid), "mid"],
      ["Spread", `${spread.toFixed(2)}bp`, "L2 book"],
      ["Depth", formatCompactUsd(depth), "top book"],
    ];
    summary.feed = candles.slice(-5).reverse().map((candle, index) => [
      `${index * 3}m`,
      `${coin} candle closed at ${formatUsd(candle.c || candle.close || mid)}.`,
      "Hyperliquid",
    ]);
    summary.highlights = [
      `${coin} mid is ${formatUsd(mid)}.`,
      `Chart window is ${rangeHours ? `${rangeHours.toFixed(rangeHours >= 24 ? 0 : 1)} hours` : "the current cached window"} at ${interval} candles.`,
      `Spread is ${spread.toFixed(2)} basis points.`,
      `Top depth summary is ${formatCompactUsd(depth)}.`,
      last ? `Latest candle close is ${formatUsd(last.c || last.close || mid)}.` : "No candle close is available.",
    ];
    summary.dataShape = ["coin", "interval", "startTime", "endTime", "lookbackHours", "mid", "spreadBps", "depthUsd", "candles[]", "book.levels[][]"];
    return summary;
  }

  if (sourceIs(envelope, "polymarket") && Array.isArray(data.markets)) {
    const markets = data.markets.slice(0, 6);
    summary.metrics = [
      ["Markets", String(markets.length), "active"],
      ["Top YES", markets[0] ? `${Math.round(Number(markets[0].yes || 0) * 100)}%` : "n/a", "implied"],
      ["Volume", markets[0] ? formatCompactUsd(markets[0].volume || 0) : "n/a", "top market"],
    ];
    summary.feed = markets.slice(0, 5).map((market, index) => [
      index === 0 ? "now" : `${index * 4}m`,
      market.question || "Prediction market updated.",
      `${Math.round(Number(market.yes || 0) * 100)}% yes / ${market.category || "market"}`,
    ]);
    summary.highlights = markets.slice(0, 4).map((market) =>
      `${market.question || "Market"} is ${Math.round(Number(market.yes || 0) * 100)}% yes.`
    );
    summary.dataShape = ["markets[].question", "markets[].yes", "markets[].no", "markets[].volume", "markets[].category"];
    return summary;
  }

  if (sourceIs(envelope, "pumpfun") && Array.isArray(data.tokens)) {
    const tokens = rankPumpfunTokens(data.tokens, "velocity").slice(0, 6);
    const leader = tokens[0] || null;
    summary.metrics = [
      ["Tokens", String(tokens.length), "indexed"],
      ["Leader", String(leader?.symbol || leader?.name || "n/a").toUpperCase().slice(0, 10), "velocity"],
      ["Fragility", leader ? `${Math.round(numberOr(leader.fragilityScore, 0))}/100` : "n/a", leader?.riskLabel || "risk"],
    ];
    summary.feed = tokens.slice(0, 5).map((token, index) => [
      index === 0 ? "now" : `${index * 3}m`,
      `${token.name || token.symbol || "Token"} is on the social market watchlist with ${token.riskLabel || "visible"} liquidity risk.`,
      `${formatPercent(token.change1h || token.change24h || 0)} / liq ${formatCompactUsd(token.liquidityUsd)}`,
    ]);
    summary.highlights = tokens.slice(0, 4).map((token) =>
      `${token.symbol || token.name || "Token"} pairs ${formatPercent(token.change1h || token.change24h || 0)} 1H attention with ${formatCompactUsd(token.liquidityUsd)} visible liquidity; ${token.riskLabel || "risk visible"}.`
    );
    summary.dataShape = [
      "tokens[].name",
      "tokens[].symbol",
      "tokens[].price",
      "tokens[].change1h",
      "tokens[].liquidityUsd",
      "tokens[].fragilityScore",
      "tokens[].decayScore",
    ];
    return summary;
  }

  if (sourceIs(envelope, "eia-grid") && data.latest) {
    const latest = data.latest || {};
    const respondent = data.respondentName || data.respondent || channel.label;
    summary.metrics = [
      ["Load", formatMegawatts(latest.loadMw), respondent],
      ["Forecast", formatMegawatts(latest.forecastMw), "hourly"],
      ["Margin", formatSignedPercent(latest.operatingMarginPct), "proxy"],
    ];
    summary.feed = Array.isArray(data.feed) && data.feed.length
      ? data.feed.slice(0, 5)
      : (Array.isArray(data.series) ? data.series.slice(-5).reverse().map((row, index) => [
        index === 0 ? "now" : `${index}h`,
        `${respondent} load was ${formatMegawatts(row.loadMw)} with ${formatSignedPercent(row.operatingMarginPct)} margin proxy.`,
        row.label || "EIA",
      ]) : []);
    summary.highlights = Array.isArray(data.insights) && data.insights.length
      ? data.insights.slice(0, 5)
      : [
        `${respondent} load is ${formatMegawatts(latest.loadMw)}.`,
        `Forecast is ${formatMegawatts(latest.forecastMw)}.`,
        `Operating margin proxy is ${formatSignedPercent(latest.operatingMarginPct)}.`,
      ];
    summary.highlights.push("Frequency and corridor stress are modeled display proxies derived from the live grid packet.");
    summary.dataShape = [
      "respondent",
      "series[].loadMw",
      "series[].forecastMw",
      "series[].netGenerationMw",
      "series[].interchangeMw",
      "series[].stressPct",
      "fuelMix[]",
      "corridors[]",
    ];
    return summary;
  }

  if (Array.isArray(data.metrics)) summary.metrics = data.metrics.slice(0, 3);
  if (Array.isArray(data.feed)) summary.feed = data.feed.slice(0, 5);
  summary.highlights = summary.feed.map((item) => Array.isArray(item) ? item[1] : item.title || item.message || String(item)).filter(Boolean).slice(0, 4);
  summary.dataShape = ["metrics[]", "feed[]", "kind", "mode"];
  return summary;
}

function compactChannelLiveEnvelope(envelope) {
  const data = envelope.data || {};
  let compactData = data;

  if (sourceIs(envelope, "hyperliquid")) {
    compactData = {
      ...data,
      candles: Array.isArray(data.candles) ? data.candles.slice(-12) : [],
      book: data.book?.levels
        ? { ...data.book, levels: data.book.levels.map((side) => Array.isArray(side) ? side.slice(0, 8) : []) }
        : data.book,
    };
  } else if (sourceIs(envelope, "polymarket")) {
    compactData = { ...data, markets: Array.isArray(data.markets) ? data.markets.slice(0, 8) : [] };
  } else if (sourceIs(envelope, "pumpfun")) {
    compactData = { ...data, tokens: Array.isArray(data.tokens) ? data.tokens.slice(0, 10) : [] };
  } else if (sourceIs(envelope, "eia-grid")) {
    compactData = {
      ...data,
      series: Array.isArray(data.series) ? data.series.slice(-18) : [],
      fuelMix: Array.isArray(data.fuelMix) ? data.fuelMix.slice(0, 8) : [],
      corridors: Array.isArray(data.corridors) ? data.corridors.slice(0, 8) : [],
    };
  }

  return {
    ...envelope,
    data: compactData,
  };
}

function firstEntity(params = {}) {
  if (params.entity) return params.entity;
  if (params.coin) return params.coin;
  if (params.respondent) return params.respondent;
  if (Array.isArray(params.entities) && params.entities[0]) return params.entities[0];
  return "";
}

function providerQueryForCapability(channel, capability, params = {}) {
  const query = {};
  const entity = firstEntity(params);
  if (channel.liveProvider === "hyperliquid") {
    if (entity || params.coin) query.coin = sanitizeHyperliquidCoin(params.coin || entity || channel.defaultQuery?.coin, "");
    if (params.interval) query.interval = params.interval;
    if (params.lookbackHours || params.hours) query.lookbackHours = params.lookbackHours || params.hours;
    if (params.candles || params.limit) query.candles = params.candles || params.limit;
    if (params.startTime) query.startTime = params.startTime;
    if (params.endTime) query.endTime = params.endTime;
    if ((capability === "historical_state" || capability === "timeseries") && !query.lookbackHours && !query.startTime) {
      query.lookbackHours = 24;
    }
  }
  if (channel.liveProvider === "eia-grid") {
    if (entity || params.respondent) query.respondent = cleanEiaRespondent(params.respondent || entity || channel.defaultQuery?.respondent || "");
  }
  return query;
}

function tupleRowsToObjects(rows = []) {
  return rows.map((row, index) => Array.isArray(row)
    ? { index, label: row[0] || String(index + 1), title: row[1] || "", meta: row[2] || "" }
    : { index, value: row });
}

function summaryMetricObjects(summary) {
  return tupleRowsToObjects(summary.metrics || []).map((row) => ({
    label: row.label,
    value: row.title,
    note: row.meta,
  }));
}

function hyperliquidCapabilityRows(capability, data) {
  const candles = Array.isArray(data.candles) ? data.candles : [];
  const book = data.book?.levels || [];
  if (["timeseries", "historical_state"].includes(capability)) {
    return candles.slice(-96).map((candle, index) => ({
      index,
      time: candle.t || candle.time || null,
      label: candle.t ? new Date(Number(candle.t)).toISOString() : String(index + 1),
      open: Number(candle.o || candle.open || 0),
      high: Number(candle.h || candle.high || 0),
      low: Number(candle.l || candle.low || 0),
      close: Number(candle.c || candle.close || 0),
      volume: Number(candle.v || candle.volume || 0),
    }));
  }
  if (capability === "rankings" || capability === "entity_detail") {
    const bids = Array.isArray(book[0]) ? book[0].slice(0, 8) : [];
    const asks = Array.isArray(book[1]) ? book[1].slice(0, 8) : [];
    return [...bids.map((level, index) => ({
      index,
      side: "bid",
      label: `Bid ${index + 1}`,
      price: Number(level.px || 0),
      size: Number(level.sz || 0),
      notional: Number(level.px || 0) * Number(level.sz || 0),
    })), ...asks.map((level, index) => ({
      index: index + bids.length,
      side: "ask",
      label: `Ask ${index + 1}`,
      price: Number(level.px || 0),
      size: Number(level.sz || 0),
      notional: Number(level.px || 0) * Number(level.sz || 0),
    }))];
  }
  return [];
}

function eiaCapabilityRows(capability, data) {
  if (["timeseries", "historical_state"].includes(capability)) return Array.isArray(data.series) ? data.series.slice(-72) : [];
  if (capability === "rankings") {
    if (Array.isArray(data.corridors) && data.corridors.length) return data.corridors;
    if (Array.isArray(data.fuelMix) && data.fuelMix.length) return data.fuelMix;
  }
  return [];
}

function providerRowsForCapability(channel, capability, envelope, summary, params = {}) {
  const data = envelope.data || {};
  if (sourceIs(envelope, "hyperliquid")) return hyperliquidCapabilityRows(capability, data);
  if (sourceIs(envelope, "eia-grid")) return eiaCapabilityRows(capability, data);
  if (sourceIs(envelope, "polymarket") && Array.isArray(data.markets)) return rankPolymarketMarkets(data.markets, params).slice(0, Number(params.limit || 12));
  if (sourceIs(envelope, "pumpfun") && Array.isArray(data.tokens)) return rankPumpfunTokens(data.tokens, params.metric || "velocity").slice(0, Number(params.limit || 12));
  if (capability === "events" || capability === "search") return tupleRowsToObjects(summary.feed || []);
  if (capability === "rankings" || capability === "snapshot") return summaryMetricObjects(summary);
  return tupleRowsToObjects(summary.feed || []);
}

function relationshipRowsForChannel(summary) {
  const metrics = summary.metrics || [];
  const feed = summary.feed || [];
  const rows = [];
  metrics.forEach((metric, index) => {
    if (!Array.isArray(metric)) return;
    rows.push({
      source: metric[0] || `Metric ${index + 1}`,
      target: metric[2] || "channel state",
      relationship: "measured by",
      value: metric[1] || "",
    });
  });
  feed.slice(0, 5).forEach((item, index) => {
    if (!Array.isArray(item)) return;
    rows.push({
      source: item[2] || "feed",
      target: item[1] || `Event ${index + 1}`,
      relationship: item[0] || "recent",
      value: item[1] || "",
    });
  });
  return rows.slice(0, 10);
}

function bindingHintsForCapability(channel, capability, envelope) {
  if (sourceIs(envelope, "hyperliquid")) {
    if (["timeseries", "historical_state"].includes(capability)) return ["liveData.candles"];
    if (capability === "entity_detail" || capability === "rankings") return ["liveData.book", "liveSummary.metrics"];
  }
  if (sourceIs(envelope, "eia-grid")) {
    if (["timeseries", "historical_state"].includes(capability)) return ["liveData.series"];
    if (capability === "rankings") return ["liveData.corridors", "liveData.fuelMix"];
  }
  if (sourceIs(envelope, "polymarket")) return ["liveData.markets", "liveSummary.feed"];
  if (sourceIs(envelope, "pumpfun")) return ["liveData.tokens", "liveSummary.feed"];
  if (capability === "events" || capability === "search" || capability === "relationships") return ["liveSummary.feed", "dashboard.feed"];
  return ["liveSummary.metrics", "dashboard.metrics"];
}

function normalizeCapabilityResult(channel, capability, params, envelope, detail = "summary") {
  const summary = summarizeChannelLive(channel, envelope);
  const rows = capability === "relationships"
    ? relationshipRowsForChannel(summary)
    : providerRowsForCapability(channel, capability, envelope, summary, params);
  const compact = compactChannelLiveEnvelope(envelope);
  const provenance = buildProvenanceRecord(channel, capability, params, envelope, rows.length);
  return {
    ok: true,
    runtime: CHANNEL_RUNTIME_VERSION,
    channel: publicChannel(channel),
    capability,
    params,
    source: envelope.source,
    sourceType: provenance.sourceType,
    stale: envelope.stale,
    updatedAt: envelope.updatedAt,
    fallbackReason: envelope.fallbackReason,
    provenance: [provenance],
    liveSummary: summary,
    rows: rows.slice(0, Number(params.limit || 48)),
    bindingHints: bindingHintsForCapability(channel, capability, envelope),
    data: detail === "compact" ? compact.data : undefined,
  };
}

async function queryChannelCapability(channel, raw = {}) {
  const allowed = new Set(dataCapabilitiesForChannel(channel).map((capability) => capability.id));
  const capability = cleanComponentId(raw.capability || raw.type || "snapshot");
  if (!allowed.has(capability)) throw new Error(`unsupported channel capability: ${capability || "empty"}`);
  const params = sanitizeCapabilityParams(raw.params || raw.query || raw);
  const query = providerQueryForCapability(channel, capability, params);
  const envelope = await getChannelLiveEnvelope({ query }, channel);
  const detail = cleanComponentId(raw.detail || params.detail || "summary");
  return normalizeCapabilityResult(channel, capability, params, envelope, detail === "compact" ? "compact" : "summary");
}

function closeFromCandle(candle) {
  return Number(candle?.c || candle?.close || 0);
}

function cryptoComparisonRows(results, entities) {
  const series = results.map((entry) => {
    const candles = Array.isArray(entry.result?.data?.candles) ? entry.result.data.candles.slice(-48) : [];
    return {
      entity: entry.entity,
      candles,
      base: closeFromCandle(candles[0]) || 1,
    };
  }).filter((entry) => entry.candles.length);
  if (!series.length) return [];
  const count = Math.min(48, ...series.map((entry) => entry.candles.length));
  return Array.from({ length: count }, (_, index) => {
    const row = {
      index,
      label: series[0].candles[index]?.label || (series[0].candles[index]?.t ? new Date(Number(series[0].candles[index].t)).toISOString().slice(5, 10) : String(index + 1)),
    };
    for (const entity of entities) {
      const entry = series.find((candidate) => candidate.entity === entity);
      const close = closeFromCandle(entry?.candles[index]);
      row[entity] = close && entry?.base ? ((close - entry.base) / entry.base) * 100 : 0;
    }
    return row;
  });
}

async function queryCryptoComparisonCapability(channel, intent) {
  const entities = (intent.entities || ["BTC", "ETH"]).slice(0, 3);
  const paramsFor = (entity) => ({
    ...intent.params,
    entity,
    coin: entity,
  });
  const results = await Promise.all(entities.map(async (entity) => ({
    entity,
    result: await queryChannelCapability(channel, {
      capability: "timeseries",
      detail: "compact",
      params: paramsFor(entity),
    }),
  })));
  const comparisonRows = cryptoComparisonRows(results, entities);
  const provenances = results.flatMap((entry) => entry.result.provenance || []);
  const metricRows = results.map(({ entity, result }) => {
    const rows = Array.isArray(result.data?.candles) ? result.data.candles : [];
    const first = closeFromCandle(rows[0]);
    const last = closeFromCandle(rows[rows.length - 1]);
    const change = first && last ? ((last - first) / first) * 100 : 0;
    return [entity, formatSignedPercent(change), result.source || channel.liveProvider];
  });
  const highlights = [
    `${entities.join(" vs ")} is normalized to the first candle in the selected ${intent.timeframe.label} window.`,
    ...metricRows.map(([entity, value]) => `${entity} moved ${value} over the displayed window.`),
  ];
  return {
    ok: true,
    runtime: CHANNEL_RUNTIME_VERSION,
    channel: publicChannel(channel),
    capability: "timeseries",
    params: intent.params,
    source: provenances[0]?.provider || channel.liveProvider,
    sourceType: provenances[0]?.sourceType || "unavailable",
    stale: provenances.some((record) => record.stale),
    updatedAt: Date.now(),
    fallbackReason: provenances.find((record) => record.fallbackReason)?.fallbackReason || null,
    provenance: provenances,
    liveSummary: {
      source: provenances[0]?.provider || channel.liveProvider,
      stale: provenances.some((record) => record.stale),
      updatedAt: Date.now(),
      fallbackReason: provenances.find((record) => record.fallbackReason)?.fallbackReason || null,
      contract: channel.contract,
      metrics: metricRows.slice(0, 3),
      feed: entities.map((entity, index) => [
        index === 0 ? "now" : `${index * 2}m`,
        `${entity} comparison series is loaded into the generated state.`,
        provenances[index]?.provider || channel.liveProvider,
      ]),
      highlights,
      dataShape: ["comparisonRows[].label", ...entities.map((entity) => `comparisonRows[].${entity}`)],
      livePath: channel.livePath,
    },
    rows: comparisonRows,
    comparisonRows,
    comparisonEntities: entities,
    bindingHints: ["none", "liveData.candles"],
    data: { comparisonRows },
  };
}

function channelTurnId() {
  return `turn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function emitChannelTurnEvent(events, onEvent, event) {
  const normalized = {
    at: new Date().toISOString(),
    ...event,
  };
  events.push(normalized);
  if (typeof onEvent === "function") onEvent(normalized);
  return normalized;
}

function seedStateFromChannelShare(channel, sessionId, share) {
  if (!share || share.channelId !== channel.id) return null;
  const base = initialChannelSessionState(channel, sessionId);
  const provenance = Array.isArray(share.provenanceRecords) ? share.provenanceRecords : [];
  const promptEntities = channel.id === "crypto-trading" || channel.liveProvider === "hyperliquid"
    ? cryptoEntitiesFromText(normalizeAgentText(share.prompt || ""))
    : [];
  const entities = Array.from(new Set([
    ...(provenance.map((record) => record.params?.coin || record.params?.entity).filter(Boolean)),
    ...promptEntities,
  ])).slice(0, 4);
  return {
    ...base,
    focus: {
      topic: share.headline || base.focus.topic,
      entities,
      timeframe: null,
      mode: share.layout?.template || "overview",
      intent: share.layout?.template || "overview",
    },
    layout: share.layout || base.layout,
    generated: sanitizeGeneratedDashboard(share.generated || { page: share.generatedPage, slots: share.surfaces }, channel),
    patch: sanitizeDashboardPatch(share.patch || {}),
    provenance,
    nextActions: share.forkPrompts || base.nextActions,
    turns: [
      { role: "user", text: share.prompt || "", at: share.createdAt || new Date().toISOString(), turnId: share.id },
      { role: "assistant", text: share.narration?.script || "", at: share.createdAt || new Date().toISOString(), turnId: share.id, voice: "Kat" },
    ].filter((turn) => turn.text),
  };
}

function channelTimeframeFromText(normalizedText, channel) {
  const day = 24;
  if (/\b(three|3)\s*(months?|mos?|mth)\b/.test(normalizedText) || /\b3m\b/.test(normalizedText)) {
    return { label: "3 months", lookbackHours: 90 * day, interval: "1d" };
  }
  if (/\b(one|1)\s*(months?|mos?|mth)\b/.test(normalizedText) || /\b(last|past)\s+month\b/.test(normalizedText) || /\b30\s*days?\b/.test(normalizedText)) {
    return { label: "1 month", lookbackHours: 30 * day, interval: channel.liveProvider === "hyperliquid" ? "4h" : undefined };
  }
  if (/\b(two|2)\s*weeks?\b/.test(normalizedText) || /\b14\s*days?\b/.test(normalizedText)) {
    return { label: "14 days", lookbackHours: 14 * day, interval: channel.liveProvider === "hyperliquid" ? "1h" : undefined };
  }
  if (/\b(week|7\s*days?|7d)\b/.test(normalizedText)) {
    return { label: "7 days", lookbackHours: 7 * day, interval: channel.liveProvider === "hyperliquid" ? "1h" : undefined };
  }
  if (/\b(72\s*hours?|72h|three\s*days?|3\s*days?)\b/.test(normalizedText)) {
    return { label: "72 hours", lookbackHours: 72, interval: channel.liveProvider === "hyperliquid" ? "1h" : undefined };
  }
  if (/\b(today|24\s*hours?|24h|last\s*day|past\s*day)\b/.test(normalizedText)) {
    return { label: "24 hours", lookbackHours: 24, interval: channel.liveProvider === "hyperliquid" ? "15m" : undefined };
  }
  const numeric = normalizedText.match(/\b(\d{1,3})\s*(hours?|hrs?|h|days?|d)\b/);
  if (numeric) {
    const amount = Math.max(1, Number(numeric[1]) || 1);
    const unit = numeric[2].startsWith("d") ? "days" : "hours";
    const lookbackHours = unit === "days" ? amount * day : amount;
    return {
      label: `${amount} ${unit}`,
      lookbackHours,
      interval: channel.liveProvider === "hyperliquid" ? defaultHyperliquidIntervalForLookback(lookbackHours) : undefined,
    };
  }
  return channel.liveProvider === "eia-grid"
    ? { label: "24 hours", lookbackHours: 24, interval: undefined }
    : { label: "24 hours", lookbackHours: 24, interval: "15m" };
}

function cryptoEntitiesFromText(normalizedText) {
  const entities = [];
  if (/\b(btc|bitcoin|ptc)\b/.test(normalizedText)) entities.push("BTC");
  if (/\b(eth|ethereum)\b/.test(normalizedText)) entities.push("ETH");
  if (/\b(sol|solana)\b/.test(normalizedText)) entities.push("SOL");
  if (!entities.length) entities.push("BTC");
  if (/\bcompare\b/.test(normalizedText) && entities.length === 1 && entities[0] === "BTC") entities.push("ETH");
  return Array.from(new Set(entities));
}

function parseCryptoChannelIntent(channel, userText, normalizedText, priorState = null) {
  const entities = cryptoEntitiesFromText(normalizedText);
  const timeframe = channelTimeframeFromText(normalizedText, channel);
  const wantsComparison = /\b(compare|versus|vs\.?|against)\b/.test(normalizedText) || entities.length > 1;
  if (wantsComparison && entities.length === 1) {
    const priorEntity = priorState?.focus?.entities?.[0];
    if (priorEntity && !entities.includes(priorEntity)) entities.unshift(priorEntity);
    else if (entities[0] !== "BTC") entities.unshift("BTC");
    else entities.push("ETH");
  }
  const wantsLiquidity = /\b(liquidity|depth|book|order\s*book|bid|ask|spread)\b/.test(normalizedText);
  const wantsRisk = /\b(risk|anomal|volatility|volatile|drawdown|stress|range|regime)\b/.test(normalizedText);
  const wantsHistory = /\b(price|prices|chart|graph|plot|candles?|history|historical|replay|trend|structure|months?|weeks?|days?|hours?)\b/.test(normalizedText);
  const capability = wantsLiquidity ? "entity_detail" : wantsHistory || wantsComparison || wantsRisk ? "timeseries" : "snapshot";
  const layout = wantsComparison ? "comparison_board" : wantsRisk ? "risk_radar" : "market_structure";
  const primaryEntity = entities[0] || "BTC";
  const params = capability === "snapshot"
    ? { entity: primaryEntity }
    : {
      entity: primaryEntity,
      coin: primaryEntity,
      lookbackHours: timeframe.lookbackHours,
      interval: timeframe.interval || defaultHyperliquidIntervalForLookback(timeframe.lookbackHours),
      candles: timeframe.label === "3 months" ? 90 : undefined,
    };
  return {
    intent: wantsLiquidity ? "liquidity_depth" : wantsComparison ? "comparison" : wantsRisk ? "risk_anomaly" : wantsHistory ? "historical_price" : "overview",
    topic: wantsLiquidity
      ? `${primaryEntity} liquidity and depth`
      : wantsComparison
        ? `${entities.join(" vs ")} comparison`
        : `${primaryEntity} ${timeframe.label} price structure`,
    entities,
    timeframe,
    mode: layout,
    layout,
    capability,
    detail: "compact",
    params,
    stageIntent: wantsLiquidity
      ? "primary order book and liquidity inspection"
      : wantsComparison
        ? "normalized multi-asset comparison"
        : wantsRisk
          ? "volatility and drawdown inspection"
          : "primary historical price visualization",
    railIntent: "trend summary, source state, provenance, and next actions",
    userText,
  };
}

function parsePowerGridIntent(channel, userText, normalizedText) {
  const timeframe = channelTimeframeFromText(normalizedText, channel);
  const respondentMatch = normalizedText.match(/\b(us48|pjm|erco|ercot|cal|caiso|miso|nyis|nyiso|isne|isone|spp)\b/);
  const respondent = respondentMatch ? respondentMatch[1].toUpperCase().replace("ERCOT", "ERCO").replace("CAISO", "CAL").replace("NYISO", "NYIS").replace("ISONE", "ISNE") : "US48";
  const wantsFuel = /\b(fuel|mix|generation mix|natural gas|nuclear|coal|wind|solar)\b/.test(normalizedText);
  const wantsRisk = /\b(risk|stress|corridor|margin|reserve|anomal|cascade|fault)\b/.test(normalizedText);
  const wantsHistory = /\b(load|forecast|history|historical|last|today|day|hours?|trend|series)\b/.test(normalizedText);
  const capability = wantsFuel || wantsRisk ? "rankings" : wantsHistory ? "timeseries" : "snapshot";
  const layout = wantsRisk ? "risk_anomaly" : wantsHistory ? "historical_replay" : "overview";
  return {
    intent: wantsRisk ? "grid_risk" : wantsFuel ? "fuel_mix" : wantsHistory ? "grid_history" : "overview",
    topic: wantsRisk ? `${respondent} grid risk` : wantsFuel ? `${respondent} fuel mix` : `${respondent} load and forecast`,
    entities: [respondent],
    timeframe,
    mode: layout,
    layout,
    capability,
    detail: "compact",
    params: { entity: respondent, respondent, lookbackHours: timeframe.lookbackHours },
    stageIntent: wantsFuel ? "fuel mix and corridor ranking visualization" : "load, forecast, and risk visualization",
    railIntent: "operational summary, source state, provenance, and next actions",
    userText,
  };
}

function polyrecCategoriesFromText(normalizedText) {
  const categories = [];
  if (/\b(election|politic|president|senate|governor)\b/.test(normalizedText)) categories.push("election");
  if (/\b(macro|fed|rate|inflation|recession|economy)\b/.test(normalizedText)) categories.push("macro");
  if (/\b(crypto|btc|bitcoin|ethereum|eth)\b/.test(normalizedText)) categories.push("crypto");
  if (/\b(sport|nba|nfl|mlb|soccer)\b/.test(normalizedText)) categories.push("sports");
  if (/\b(culture|ai|openai|music|movie|tiktok|twitter|youtube|gta|entertainment)\b/.test(normalizedText)) categories.push("culture");
  return Array.from(new Set(categories)).slice(0, 3);
}

function parsePolymarketOddsRange(normalizedText) {
  const range = normalizedText.match(/\b(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*%?\b/);
  if (range) {
    const low = Math.max(1, Math.min(99, Number(range[1])));
    const high = Math.max(1, Math.min(99, Number(range[2])));
    return `${Math.min(low, high)}-${Math.max(low, high)}`;
  }
  if (/\b(odds?\s*range|filter\s*to|near\s*50|50\/50|coin\s*flip|tight|close)\b/.test(normalizedText)) return "45-55";
  return undefined;
}

function parsePolymarketMinVolume(normalizedText) {
  const amount = normalizedText.match(/\b(?:min(?:imum)?|over|above|threshold|at\s*least)\s*\$?\s*(\d+(?:\.\d+)?)\s*(k|thousand|m|million)?\b/);
  if (amount) {
    const base = Number(amount[1]);
    const unit = amount[2] || "";
    if (Number.isFinite(base) && base > 0) return Math.round(base * (/^(m|million)$/.test(unit) ? 1000000 : /^(k|thousand)$/.test(unit) ? 1000 : 1));
  }
  if (/\b(raise|higher|larger|minimum|min).{0,24}\bvolume\b|\bvolume\b.{0,24}\b(threshold|floor|minimum|min)\b/.test(normalizedText)) return 100000;
  return undefined;
}

function parsePolyrecIntent(channel, userText, normalizedText) {
  const categories = polyrecCategoriesFromText(normalizedText);
  const wantsCloseVolume = /\b(close|tight|near\s*50|50\/50|coin\s*flip|high\s*volume|volume|odds?\s*range|45\s*55|45\s*to\s*55|filter\s*to)\b/.test(normalizedText);
  const wantsCategory = categories.length || /\b(category|board|election|politic|macro|sports?|crypto|culture)\b/.test(normalizedText);
  const wantsSearch = /\b(keyword|search)\b/.test(normalizedText) || (/\bfind\b/.test(normalizedText) && !wantsCloseVolume);
  const intent = wantsCloseVolume ? "close_volume" : wantsSearch ? "keyword_search" : wantsCategory ? "category_board" : "weird_markets";
  const searchQuery = normalizedText.replace(/\b(find|search|keyword|markets?|for|about|show|build|live|board)\b/g, " ").trim().slice(0, 80);
  const oddsRange = parsePolymarketOddsRange(normalizedText);
  const minVolume = parsePolymarketMinVolume(normalizedText);
  return {
    intent,
    topic: intent === "close_volume" ? "close odds, high volume markets" : intent === "keyword_search" ? `${searchQuery || "keyword"} prediction market board` : intent === "category_board" ? `${categories.length ? categories.map(titleFromId).join(" + ") : "Election + Macro"} prediction market board` : "weirdest active prediction markets",
    entities: categories,
    timeframe: { label: "active markets", lookbackHours: null, interval: undefined },
    mode: intent === "weird_markets" ? "risk_radar" : "ranked_board",
    layout: intent === "weird_markets" ? "risk_radar" : "ranked_board",
    capability: "rankings",
    detail: "compact",
    params: { metric: intent === "close_volume" ? "close_volume" : intent === "category_board" ? "category" : "weirdness", category: categories[0] || undefined, categories: categories.length > 1 ? categories : undefined, oddsRange: intent === "close_volume" ? oddsRange : undefined, minVolume: intent === "close_volume" ? minVolume : undefined, keyword: intent === "keyword_search" ? searchQuery : undefined, query: intent === "keyword_search" ? searchQuery : undefined, limit: 12 },
    stageIntent: intent === "close_volume" ? "ranked close-odds and high-volume prediction market board" : intent === "category_board" ? "category comparison board for active prediction markets" : "ranked weird active market discovery board",
    railIntent: "top market inspector, why-interesting card, source provenance, and fork actions",
    userText,
  };
}

function parseMemeChannelIntent(channel, userText, normalizedText) {
  const wantsDecay = /\b(decay|fade|fading|stale|cooling|peak|peaked|unwind)\b/.test(normalizedText);
  const wantsFragile = /\b(viral|fragile|fragility|risk\s*board|thin|break)\b/.test(normalizedText);
  const wantsLiquidityRisk = /\b(attention|liquidity|risk|mismatch|thin|float)\b/.test(normalizedText);
  const intent = wantsDecay
    ? "narrative_decay"
    : wantsFragile
      ? "viral_fragile"
      : wantsLiquidityRisk
        ? "attention_liquidity_risk"
        : "token_velocity";
  const metric = intent === "narrative_decay"
    ? "narrative_decay"
    : intent === "viral_fragile"
      ? "fragility"
      : intent === "attention_liquidity_risk"
        ? "liquidity_risk"
        : "velocity";
  const topic = intent === "narrative_decay"
    ? "narrative decay watch"
    : intent === "viral_fragile"
      ? "viral but fragile meme coins"
      : intent === "attention_liquidity_risk"
        ? "attention vs liquidity risk"
        : "fastest moving meme coins";
  return {
    intent,
    topic,
    entities: [],
    timeframe: { label: "current indexed token set", lookbackHours: null },
    mode: intent === "token_velocity" ? "ranked_board" : "risk_radar",
    layout: intent === "token_velocity" ? "ranked_board" : "risk_radar",
    capability: "rankings",
    detail: "compact",
    params: { metric, limit: 12 },
    stageIntent: intent === "token_velocity"
      ? "token velocity leaderboard"
      : intent === "attention_liquidity_risk"
        ? "attention versus liquidity scatter"
        : intent === "viral_fragile"
          ? "risk and fragility board"
          : "narrative decay timeline",
    railIntent: "top token inspector, source/risk labels, why-fragile card, non-advice guardrail, and fork prompts",
    userText,
  };
}

function parseGenericChannelIntent(channel, userText, normalizedText) {
  const layout = /\b(compare|versus|vs)\b/.test(normalizedText)
    ? "comparison"
    : /\b(risk|anomal|stress|outlier)\b/.test(normalizedText)
      ? "risk_anomaly"
      : /\b(history|historical|last|past|replay)\b/.test(normalizedText)
        ? "historical_replay"
        : "overview";
  const capability = layout === "historical_replay" && dataCapabilitiesForChannel(channel).some((capability) => capability.id === "historical_state")
    ? "historical_state"
    : /\b(rank|top|leader)\b/.test(normalizedText)
      ? "rankings"
      : /\b(search|find)\b/.test(normalizedText)
        ? "search"
        : "snapshot";
  return {
    intent: layout,
    topic: `${channel.label} ${layout.replace(/_/g, " ")}`,
    entities: [],
    timeframe: null,
    mode: layout,
    layout,
    capability,
    detail: "compact",
    params: {},
    stageIntent: "primary generated channel view",
    railIntent: "summary, provenance, and next actions",
    userText,
  };
}

function parseChannelTurnIntent(channel, userText, priorState) {
  const normalizedText = normalizeAgentText(userText);
  if (channel.id === "crypto-trading" || channel.liveProvider === "hyperliquid") return parseCryptoChannelIntent(channel, userText, normalizedText, priorState);
  if (channel.id === "polyrec" || channel.liveProvider === "polymarket") return parsePolyrecIntent(channel, userText, normalizedText);
  if (channel.id === "meme-coin" || channel.liveProvider === "pumpfun") return parseMemeChannelIntent(channel, userText, normalizedText);
  if (channel.id === "power-grid" || channel.liveProvider === "eia-grid") return parsePowerGridIntent(channel, userText, normalizedText);
  const generic = parseGenericChannelIntent(channel, userText, normalizedText);
  if (priorState?.focus?.entities?.length && !generic.entities.length) generic.entities = priorState.focus.entities;
  return generic;
}

function tupleRowsFromAny(rows = [], max = 5) {
  return (Array.isArray(rows) ? rows : []).slice(0, max).map((row, index) => {
    if (Array.isArray(row)) return [row[0] ?? String(index + 1), row[1] ?? "", row[2] ?? ""];
    if (row && typeof row === "object") {
      return [
        row.label || row.side || row.source || row.fueltype || String(index + 1),
        row.title || row.value || row.close || row.loadMw || row.price || row.stressPct || "",
        row.meta || row.note || row.relationship || row.provider || row.period || "",
      ].map((value) => String(value ?? ""));
    }
    return [String(index + 1), String(row ?? ""), ""];
  });
}

function sourceRows(provenance) {
  return [
    ["source", sourceLabelForType(provenance.sourceType), provenance.provider],
    ["rows", String(provenance.rowCount || 0), provenance.capability],
    ["freshness", provenance.stale ? "stale/cache" : "fresh", provenance.queriedAt],
    ...(provenance.fallbackReason ? [["fallback", provenance.fallbackReason, "visible"]] : []),
  ].slice(0, 4);
}

function fallbackNotice(provenance) {
  if (provenance.sourceType === "synthetic_fallback") {
    return `Source is ${provenance.provider}; this is explicitly labeled fallback data because ${provenance.fallbackReason || "the live adapter did not return data"}.`;
  }
  if (provenance.sourceType === "unavailable") return "The requested provider data is unavailable, so the channel shows the data gap explicitly.";
  if (provenance.sourceType === "cached_api") return "This view is using cached provider data and keeps freshness visible.";
  return `Backed by ${sourceLabelForType(provenance.sourceType)} from ${provenance.provider}.`;
}

function nextActionsForIntent(channel, intent) {
  if (channel.id === "crypto-trading" || channel.liveProvider === "hyperliquid") {
    if (intent.intent === "liquidity_depth") return ["Compare ETH depth", "Add price structure", "Inspect spread changes"];
    if (intent.layout === "comparison" || intent.layout === "comparison_board") return ["Add SOL to this comparison", "Inspect the largest divergence", "Check BTC liquidity now"];
    if (intent.layout === "risk_anomaly" || intent.layout === "risk_radar") return ["Inspect drawdowns", "Show volatility range", "Compare ETH risk"];
    return ["Compare ETH over the same window", "Zoom into the last 7 days", "Add liquidity/depth context"];
  }
  if (channel.id === "power-grid" || channel.liveProvider === "eia-grid") {
    if (intent.layout === "risk_anomaly") return ["Inspect corridor stress", "Compare forecast gap", "Open fuel mix", "Zoom last 24 hours"];
    return ["Show grid risk over the last day", "Inspect fuel mix", "Compare load to forecast", "Open corridor stress"];
  }
  if (channel.id === "polyrec" || channel.liveProvider === "polymarket") {
    if (intent.intent === "close_volume") return ["Fork to politics only", "Raise the volume threshold", "Filter to 45-55% odds"];
    if (intent.intent === "category_board") return ["Switch to crypto markets", "Show macro close odds", "Find weird culture markets"];
    if (intent.intent === "keyword_search") return ["Rank this keyword by volume", "Broaden to all active markets", "Filter this keyword to close odds"];
    return ["Find close odds with volume", "Build election and macro board", "Search crypto markets"];
  }
  if (channel.id === "meme-coin" || channel.liveProvider === "pumpfun") {
    if (intent.intent === "attention_liquidity_risk") return ["Show fastest movers", "Build viral but fragile board", "Sort by narrative decay"];
    if (intent.intent === "viral_fragile") return ["Compare liquidity risk", "Show fastest movers", "Inspect narrative decay"];
    if (intent.intent === "narrative_decay") return ["Find fresh spikes", "Compare liquidity risk", "Build viral but fragile board"];
    return ["Show attention vs liquidity risk", "Build viral but fragile board", "Sort by narrative decay"];
  }
  return ["Open overview", "Show events", "Inspect top entity", "Map relationships"];
}

function firstNonEmptyString(values = [], fallback = "") {
  for (const value of values) {
    const text = clampText(value, 220);
    if (text) return text;
  }
  return fallback;
}

function generatedPromptItems(channel, intent) {
  return nextActionsForIntent(channel, intent).filter(Boolean).slice(0, 3);
}

function sourceRowsWithFreshness(provenance) {
  const rows = sourceRows(provenance);
  if (!rows.some((row) => row[0] === "freshness")) {
    rows.splice(1, 0, ["freshness", provenance.stale ? "stale/cache" : "fresh", provenance.queriedAt || "now"]);
  }
  return rows.slice(0, 5);
}

function generatedPageTemplateForIntent(channel, intent) {
  if (channel.id === "crypto-trading" || channel.liveProvider === "hyperliquid") {
    if (intent.intent === "comparison") return "comparison_board";
    if (intent.intent === "risk_anomaly") return "risk_radar";
    return "market_structure";
  }
  if (channel.id === "polyrec" || channel.liveProvider === "polymarket") {
    if (intent.intent === "weird_markets") return "risk_radar";
    return "ranked_board";
  }
  if (channel.id === "meme-coin" || channel.liveProvider === "pumpfun") {
    if (intent.intent === "token_velocity") return "ranked_board";
    return "risk_radar";
  }
  if (intent.intent === "comparison") return "comparison_board";
  if (intent.intent === "risk_anomaly") return "risk_radar";
  return "detail_inspector";
}

function generatedPageStageType(template) {
  return {
    market_structure: "market-structure",
    ranked_board: "ranked-board",
    comparison_board: "comparison-board",
    risk_radar: "risk-radar",
    detail_inspector: "detail-inspector",
  }[template] || "generated-stage";
}

function generatedPageAccent(channel) {
  if (channel.id === "polyrec" || channel.liveProvider === "polymarket") return "violet";
  if (channel.id === "meme-coin" || channel.liveProvider === "pumpfun") return "amber";
  if (channel.id === "crypto-trading" || channel.liveProvider === "hyperliquid") return "green";
  return "channel";
}

function buildGeneratedPageState(channel, intent, options = {}) {
  const template = options.template || generatedPageTemplateForIntent(channel, intent);
  const stageComponents = sanitizeComponents(options.stageComponents || [], 3);
  const railComponents = sanitizeComponents(options.railComponents || [], 5);
  const provenanceRecords = (Array.isArray(options.provenanceRecords) ? options.provenanceRecords : [])
    .map((record) => sanitizeProvenanceRecord(record, channel))
    .filter(Boolean)
    .slice(0, 12);
  return {
    mode: "generated_page",
    channelId: channel.id,
    prompt: intent.userText || "",
    theme: {
      density: template === "market_structure" ? "analysis" : "board",
      accent: generatedPageAccent(channel),
      avatarMode: "docked",
    },
    layout: {
      template,
      stage: generatedPageStageType(template),
      rail: "evidence_stack",
      actions: "fork_prompts",
    },
    thesis: {
      title: options.title || intent.topic || `${channel.label} Generated Page`,
      summary: options.summary || options.body || "",
    },
    stage: {
      type: generatedPageStageType(template),
      components: stageComponents,
    },
    rail: railComponents,
    actions: sanitizeStringArray(options.actions || [], 6, 120) || [],
    provenance: provenanceRecords,
    sourceState: sanitizeSourceState(options.sourceState),
  };
}

function numberOr(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function compactQuestion(value, max = 72) {
  return clampText(value || "Untitled market", max);
}

function polymarketCategoryList(params = {}) {
  const categories = [];
  if (Array.isArray(params.categories)) categories.push(...params.categories);
  if (params.category) categories.push(params.category);
  return Array.from(new Set(categories.map((category) => cleanComponentId(category)).filter(Boolean))).slice(0, 4);
}

function polyrecCategoryLabel(params = {}) {
  const categories = polymarketCategoryList(params);
  return categories.length ? categories.map(titleFromId).join(" + ") : "all active";
}

function polyrecSourceCoverageNote(intent, markets, provenance) {
  const categories = polymarketCategoryList(intent.params);
  if (provenance.sourceType === "synthetic_fallback" || provenance.sourceType === "unavailable") return fallbackNotice(provenance);
  if (categories.length && !markets.length) return `No ${polyrecCategoryLabel(intent.params)} markets matched this public discovery refresh.`;
  if (intent.intent === "keyword_search" && !markets.length) return "No matching keyword markets were returned in this refresh.";
  return "";
}

function normalizedMarketYesPct(market = {}) {
  const raw = market.yesPct ?? market.yes ?? market.bestAsk ?? market.price ?? market.outcomePrice;
  const value = numberOr(raw, 0);
  return value <= 1 ? value * 100 : value;
}

function rankPolymarketMarkets(markets = [], params = {}) {
  const categories = polymarketCategoryList(params);
  const keyword = normalizeAgentText(params.keyword || params.query || "");
  const metric = cleanComponentId(params.metric || "weirdness");
  const minVolume = numberOr(params.minVolume, 0);
  const oddsRange = typeof params.oddsRange === "string" ? params.oddsRange.match(/^(\d{1,2})-(\d{1,2})$/) : null;
  const oddsLow = oddsRange ? Number(oddsRange[1]) : null;
  const oddsHigh = oddsRange ? Number(oddsRange[2]) : null;
  return (Array.isArray(markets) ? markets : [])
    .map((market, index) => {
      const question = market.question || market.title || market.slug || `Market ${index + 1}`;
      const category = cleanComponentId(market.category || market.tags?.[0] || "");
      const yesPct = normalizedMarketYesPct(market);
      const volume = numberOr(market.volume || market.volume24hr || market.volumeNum || market.liquidity, 0);
      const liquidity = numberOr(market.liquidity || market.liquidityNum, 0);
      const closeOddsPct = Math.max(0, 50 - Math.abs(50 - yesPct)) * 2;
      const text = normalizeAgentText(`${question} ${category} ${(market.tags || []).join(" ")}`);
      const categoryMatch = !categories.length || categories.some((item) => {
        if (item === "election") return /\b(election|politic|president|senate|congress|trump|biden|vote|campaign)\b/.test(text);
        if (item === "macro") return /\b(macro|fed|rate|inflation|gdp|jobs|recession|oil|economy|cpi|tariff)\b/.test(text);
        if (item === "crypto") return /\b(crypto|btc|bitcoin|ethereum|eth|solana|sol)\b/.test(text);
        if (item === "sports") return /\b(sport|nba|nfl|mlb|soccer|ufc|fifa|championship)\b/.test(text);
        if (item === "culture") return /\b(culture|ai|openai|music|movie|tiktok|twitter|youtube|gta)\b/.test(text);
        return text.includes(item);
      });
    const keywordTerms = keyword.split(/\s+/).filter((term) => term.length > 2);
    const keywordMatch = !keyword || text.includes(keyword) || keywordTerms.some((term) =>
      text.includes(term) ||
      (term === "btc" && text.includes("bitcoin")) ||
      (term === "eth" && text.includes("ethereum"))
    );
      const oddsMatch = !oddsRange || (yesPct >= oddsLow && yesPct <= oddsHigh);
      const volumeMatch = !minVolume || volume >= minVolume;
      const weirdScore = Math.min(100, question.length / 2 + Math.abs(50 - yesPct) + Math.log10(volume + 10) * 8);
      const boardScore = metric === "close_volume"
        ? closeOddsPct + Math.log10(volume + 10) * 12
        : metric === "category"
          ? (categoryMatch ? 30 : 0) + Math.log10(volume + 10) * 10 + yesPct / 4
          : weirdScore + Math.log10(volume + 10) * 4;
      return {
        ...market,
        question,
        category: category || "market",
        yesPct,
        closeOddsPct,
        volume,
        liquidity,
        volumeLabel: formatCompactUsd(volume),
        liquidityLabel: formatCompactUsd(liquidity),
        boardScore,
        weirdScore,
        reason: metric === "close_volume"
          ? `${Math.round(closeOddsPct)} close-odds score with ${formatCompactUsd(volume)} displayed volume`
          : `${Math.round(yesPct)}% YES with ${formatCompactUsd(volume)} displayed volume`,
        why: `${question} ranks on ${metric.replace(/_/g, " ")} using public discovery fields.`,
        _include: categoryMatch && keywordMatch && oddsMatch && volumeMatch,
      };
    })
    .filter((market) => market._include)
    .sort((a, b) => b.boardScore - a.boardScore)
    .slice(0, Number(params.limit || 12));
}

function polyrecBoardTitle(intent) {
  if (intent.intent === "close_volume") return "Close Odds, High Volume";
  if (intent.intent === "category_board") {
    const categories = polymarketCategoryList(intent.params);
    return `${categories.length ? categories.map(titleFromId).join(" + ") : "Election + Macro"} Market Watch`;
  }
  if (intent.intent === "keyword_search") return "Keyword Prediction Board";
  return "Weirdest Active Markets";
}

function polyrecBoardRows(markets = []) {
  return markets.slice(0, 8).map((market, index) => [
    `#${index + 1} ${Math.round(numberOr(market.yesPct, numberOr(market.yes, 0) * 100))}% YES`,
    compactQuestion(market.question, 92),
    `${market.volumeLabel || formatCompactUsd(market.volume)} vol / ${market.category || "market"}`,
  ]);
}

function polyrecChartRows(markets = []) {
  return markets.slice(0, 10).map((market, index) => ({
    rank: index + 1,
    label: market.label || compactQuestion(market.question, 42),
    yesPct: Math.round(numberOr(market.yesPct, numberOr(market.yes, 0) * 100)),
    closeOddsPct: Math.round(numberOr(market.closeOddsPct, 0)),
    volume: Math.round(numberOr(market.volume, 0)),
    score: Number(numberOr(market.boardScore || market.weirdScore, 0).toFixed(3)),
    category: market.category || "market",
  }));
}

function buildPolyrecTurnUpdate(channel, intent, result, provenance) {
  const sourceState = componentSourceState(provenance);
  const provenanceRecords = result.provenance?.length ? result.provenance : [provenance];
  const sourceMarkets = Array.isArray(result.rows) && result.rows.length
    ? result.rows
    : (Array.isArray(result.data?.markets) ? result.data.markets : []);
  const markets = rankPolymarketMarkets(sourceMarkets, intent.params).slice(0, 12);
  const title = polyrecBoardTitle(intent);
  const top = markets[0] || {};
  const chartRows = polyrecChartRows(markets);
  const boardRows = polyrecBoardRows(markets);
  const coverageNote = polyrecSourceCoverageNote(intent, markets, provenance);
  const hasMarkets = markets.length > 0;
  const nextActions = generatedPromptItems(channel, intent);
  const primaryWhy = hasMarkets
    ? `${top.why || result.liveSummary?.highlights?.[0] || fallbackNotice(provenance)}${coverageNote ? ` ${coverageNote}` : ""}`
    : `${coverageNote || "No matching markets were returned for this filter."} ${fallbackNotice(provenance)}`;
  const visibleBoardRows = boardRows.length ? boardRows : [["No matching rows", coverageNote || "No matching markets in this refresh.", sourceLabelForType(provenance.sourceType)]];
  const chartField = intent.intent === "close_volume" ? "closeOddsPct" : "yesPct";
  const thesisBody = hasMarkets
    ? `This is a ranked Polymarket discovery board for ${intent.topic}; the primary visual shows the strongest markets by ${intent.params?.metric?.replace(/_/g, " ") || "board score"}.`
    : `This is a source-gap state for ${intent.topic}; the dashboard preserves the empty match instead of filling the board with unrelated markets.`;
  const thesisItems = [
    hasMarkets ? `Why it matters now: ${primaryWhy}` : "Why it matters now: the absence of matching rows is itself the signal to inspect.",
    "Inspect next: change category, odds range, volume floor, or keyword.",
  ];
  const stageLead = chartRows.length ? {
    id: `polyrec-${intent.intent}-chart`,
    type: "vega-chart",
    eyebrow: "prediction market board",
    title: intent.intent === "close_volume" ? "Close Odds With Volume" : `${title} Rank`,
    chart: { type: "horizontal-bar", binding: "none", x: chartField, y: "label", data: chartRows },
    note: coverageNote || "Public discovery fields only: question, outcome price, category, volume, and liquidity when available.",
    provenanceIds: provenanceRecords.map((record) => record.id),
    sourceState,
    interactions: [{ type: "click-point", action: "inspect_prediction_market" }],
  } : {
    id: `polyrec-${intent.intent}-source-gap`,
    type: "insight-card",
    eyebrow: "category source gap",
    title: "No Matching Category Rows",
    body: primaryWhy,
    items: ["The source gap is preserved rather than filled with unrelated markets.", "Fork by category, odds range, volume, or keyword."],
    provenanceIds: provenanceRecords.map((record) => record.id),
    sourceState,
  };
  return {
    layout: { template: intent.layout, rationale: `User asked for ${intent.topic}.` },
    dataRequests: [{ capability: intent.capability, detail: "compact", params: intent.params, reason: intent.stageIntent }],
    provenanceRecords,
    generatedPage: buildGeneratedPageState(channel, intent, {
      title,
      summary: thesisBody,
      stageComponents: [stageLead],
      railComponents: [{
        id: "polyrec-thesis",
        type: "insight-card",
        eyebrow: "thesis",
        title,
        body: thesisBody,
        items: thesisItems,
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: "polyrec-top-market",
        type: "entity-inspector",
        eyebrow: hasMarkets ? "leading evidence" : "source gap",
        title: hasMarkets ? compactQuestion(top.question, 72) : "No matching markets in this refresh",
        body: primaryWhy,
        metrics: [["YES", top.yesPct !== undefined ? `${Math.round(numberOr(top.yesPct, 0))}%` : "n/a", "displayed"], ["Volume", top.volumeLabel || formatCompactUsd(top.volume), "Gamma"], ["Category", top.category || polyrecCategoryLabel(intent.params), "filter"]],
        rows: [["why", top.reason || coverageNote || "source gap", "interpretation"], ["close odds", `${top.closeOddsPct ?? "n/a"}%`, "not order-book spread"], ["liquidity", top.liquidityLabel || formatCompactUsd(top.liquidity), "when available"]],
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: "polyrec-source",
        type: "source-confidence",
        title: "Evidence And Freshness",
        rows: sourceRowsWithFreshness(provenance),
        note: "Public discovery data only; no trading, CLOB depth, or execution claim is made.",
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: "polyrec-next-actions",
        type: "action-panel",
        title: "Inspect Next",
        items: nextActions,
        note: "Each prompt routes back through the same Polyrec turn path and creates a forkable board.",
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }],
      actions: nextActions,
      provenanceRecords,
      sourceState,
    }),
    patch: {
      title: `${channel.label}: ${title}`,
      subtitle: `A ranked Polymarket intelligence board. ${coverageNote || fallbackNotice(provenance)}`,
      visualLabel: intent.stageIntent,
      visualCopy: `${thesisBody} The rail keeps source freshness and exactly three fork prompts visible.`,
      feedLabel: "market board",
      lens: intent.intent.replace(/_/g, " "),
      tabs: ["Board", "Why", "Source", "Fork"],
      metrics: [
        ["Markets", String(markets.length || result.liveSummary?.metrics?.[0]?.[1] || 0), "ranked"],
        ["Top YES", top.yesPct !== undefined ? `${Math.round(numberOr(top.yesPct, 0))}%` : "n/a", "implied"],
        ["Volume", top.volumeLabel || formatCompactUsd(top.volume), "top market"],
      ],
      feed: visibleBoardRows.slice(0, 6),
    },
    surfaces: [
      { surface: "stageOverlay", mode: "replace", components: [stageLead] },
      { surface: "rail", mode: "replace", components: [{
        id: "polyrec-thesis",
        type: "insight-card",
        eyebrow: "thesis",
        title,
        body: thesisBody,
        items: thesisItems,
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: "polyrec-top-market",
        type: "entity-inspector",
        eyebrow: hasMarkets ? "leading evidence" : "source gap",
        title: hasMarkets ? compactQuestion(top.question, 72) : "No matching markets in this refresh",
        body: primaryWhy,
        metrics: [["YES", top.yesPct !== undefined ? `${Math.round(numberOr(top.yesPct, 0))}%` : "n/a", "displayed"], ["Volume", top.volumeLabel || formatCompactUsd(top.volume), "Gamma"], ["Category", top.category || polyrecCategoryLabel(intent.params), "filter"]],
        rows: [["why", top.reason || coverageNote || "source gap", "interpretation"], ["close odds", `${top.closeOddsPct ?? "n/a"}%`, "not order-book spread"], ["liquidity", top.liquidityLabel || formatCompactUsd(top.liquidity), "when available"]],
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: "polyrec-source",
        type: "source-confidence",
        title: "Evidence And Freshness",
        rows: sourceRowsWithFreshness(provenance),
        note: "Public discovery data only; no trading, CLOB depth, or execution claim is made.",
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: "polyrec-next-actions",
        type: "action-panel",
        title: "Inspect Next",
        items: nextActions,
        note: `Each prompt routes back through the same Polyrec turn path and creates a forkable board. ${fallbackNotice(provenance)}`,
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }] },
      { surface: "modal", mode: "clear", components: [] },
    ],
    narration: `${title} is live: ${primaryWhy}`,
  };
}

function buildMemeTurnUpdate(channel, intent, result, provenance) {
  const sourceState = componentSourceState(provenance);
  const provenanceRecords = result.provenance?.length ? result.provenance : [provenance];
  const rawTokens = Array.isArray(result.rows) && result.rows.length
    ? result.rows
    : (Array.isArray(result.data?.tokens) ? result.data.tokens : []);
  const tokens = rankPumpfunTokens(rawTokens, intent.params?.metric || "velocity").slice(0, 12);
  const title = intent.intent === "narrative_decay"
    ? "Narrative Decay Watch"
    : intent.intent === "viral_fragile"
    ? "Viral But Fragile"
    : intent.intent === "attention_liquidity_risk"
      ? "Attention Vs Liquidity Risk"
      : "Fastest Moving Meme Coins";
  const summaryRows = tupleRowsFromAny(result.liveSummary?.metrics, 3);
  const primaryHighlight = result.liveSummary?.highlights?.[0] || fallbackNotice(provenance);
  const nextActions = generatedPromptItems(channel, intent);
  const chartRows = tokens.slice(0, 12).map((token, index) => {
    const change = numberOr(token.change1h ?? token.change24h, 0);
    const marketCap = parseUsdNumber(token.marketCapUsd ?? token.marketCap ?? token.usdMarketCap);
    const liquidityUsd = parseUsdNumber(token.liquidityUsd ?? token.liquidity);
    const attentionScore = numberOr(token.attentionScore, Math.max(0, change) + Math.log10(marketCap + 10) * 6);
    const liquidityRisk = numberOr(token.liquidityRisk, liquidityUsd ? Math.max(0, Math.log10(marketCap + 10) - Math.log10(liquidityUsd + 10)) * 20 : 80);
    const fragilityScore = numberOr(token.fragilityScore, Math.max(0, change) + liquidityRisk * 0.8);
    const decayScore = numberOr(token.decayScore, Math.max(0, numberOr(token.change24h, 0) - change) + fragilityScore * 0.3);
    return {
      index,
      label: String(token.symbol || token.name || `Token ${index + 1}`).toUpperCase().slice(0, 16),
      change,
      price: numberOr(token.price, 0),
      marketCap,
      liquidityUsd,
      volume24hUsd: parseUsdNumber(token.volume24hUsd ?? token.volume),
      attentionScore,
      liquidityRisk,
      fragilityScore,
      decayScore,
      riskLabel: token.riskLabel || memeRiskLabel(Math.max(liquidityRisk, fragilityScore)),
      why: token.why || `${formatSignedPercent(change)} 1H attention against ${formatCompactUsd(liquidityUsd)} visible liquidity.`,
    };
  });
  const boardRows = chartRows.slice(0, 8).map((token, index) => [
    intent.intent === "narrative_decay" ? `${index * 3}m` : `#${index + 1} ${token.label}`,
    intent.intent === "narrative_decay"
      ? `${token.label} decay ${Math.round(token.decayScore)} / fragility ${Math.round(token.fragilityScore)}`
      : `${formatSignedPercent(token.change)} 1H / fragility ${Math.round(token.fragilityScore)}`,
    `${token.riskLabel} / liq ${formatCompactUsd(token.liquidityUsd)}`,
  ]);
  const chart = intent.intent === "attention_liquidity_risk"
    ? { type: "scatter", binding: "none", x: "liquidityUsd", y: "attentionScore", data: chartRows }
    : intent.intent === "narrative_decay"
      ? { type: "horizontal-bar", binding: "none", x: "decayScore", y: "label", data: chartRows }
      : intent.intent === "viral_fragile"
        ? { type: "horizontal-bar", binding: "none", x: "fragilityScore", y: "label", data: chartRows }
        : { type: "bar", binding: "none", x: "label", y: "change", data: chartRows };
  const top = chartRows[0] || { label: "TOKEN", change: 0, liquidityUsd: 0, fragilityScore: 0, liquidityRisk: 0, decayScore: 0, riskLabel: "risk visible" };
  const thesisBody = intent.intent === "attention_liquidity_risk"
    ? "This board compares attention against visible liquidity so thin, fast-moving tokens do not look healthier than the data supports."
    : intent.intent === "viral_fragile"
      ? "This board ranks tokens whose attention is moving faster than their visible liquidity and fragility signals."
      : intent.intent === "narrative_decay"
        ? "This board surfaces tokens where short-term attention appears to be cooling against broader fragility signals."
        : "This board ranks current indexed token velocity and keeps liquidity, risk, and source state beside the visual.";
  const thesisItems = [
    `Why it matters now: ${primaryHighlight}`,
    fallbackNotice(provenance),
    "Inspect next: compare liquidity risk, fragility, or narrative decay before sharing the state.",
  ];
  const sourceAndRiskRows = [
    ...sourceRows(provenance),
    ["guardrail", "not financial advice", "read-only"],
    ["risk model", "heuristic display", "attention/liquidity"],
  ].slice(0, 8);
  return {
    layout: { template: intent.layout, rationale: `User asked for ${intent.topic}.` },
    dataRequests: [{ capability: intent.capability, detail: "compact", params: intent.params, reason: intent.stageIntent }],
    provenanceRecords,
    generatedPage: buildGeneratedPageState(channel, intent, {
      title,
      summary: thesisBody,
      stageComponents: [{
        id: `meme-${intent.intent}-chart`,
        type: "vega-chart",
        eyebrow: "social market board",
        title,
        chart,
        note: `${fallbackNotice(provenance)} Scores are display-only heuristics derived from normalized token fields.`,
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
        interactions: [{ type: "click-point", action: "inspect_token" }],
      }],
      railComponents: [{
        id: "meme-thesis",
        type: "insight-card",
        eyebrow: "thesis",
        title,
        body: thesisBody,
        items: thesisItems,
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: "meme-top-token",
        type: "entity-inspector",
        eyebrow: "leading evidence",
        title: top.label,
        body: `${top.why} This is read-only social market context, not financial advice.`,
        rows: [
          ["1H change", formatSignedPercent(top.change), "attention"],
          ["liquidity", formatCompactUsd(top.liquidityUsd), "visible"],
          ["liquidity risk", `${Math.round(top.liquidityRisk)}/100`, top.riskLabel],
          ["decay", `${Math.round(top.decayScore)}/100`, "narrative"],
        ],
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: "meme-source",
        type: "source-confidence",
        title: "Evidence, Freshness, And Risk",
        rows: sourceAndRiskRows,
        note: "Read-only social market context; no trade path is exposed.",
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: "meme-next-actions",
        type: "action-panel",
        title: "Inspect Next",
        items: nextActions,
        note: "Each prompt creates another forkable read-only channel state.",
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }],
      actions: nextActions,
      provenanceRecords,
      sourceState,
    }),
    patch: {
      title: `${channel.label}: ${title}`,
      subtitle: fallbackNotice(provenance),
      visualLabel: intent.stageIntent,
      visualCopy: `${thesisBody} The rail names source freshness, risk labels, and three follow-up prompts.`,
      feedLabel: "social tape",
      lens: intent.intent.replace(/_/g, " "),
      tabs: ["Velocity", "Risk", "Decay", "Source"],
      metrics: summaryRows.length ? summaryRows : undefined,
      feed: boardRows.length ? boardRows.slice(0, 6) : undefined,
    },
    surfaces: [
      {
        surface: "stageOverlay",
        mode: "replace",
        components: [{
          id: `meme-${intent.intent}-chart`,
          type: "vega-chart",
          eyebrow: "social market board",
          title,
          chart,
          note: `${fallbackNotice(provenance)} Scores are display-only heuristics derived from normalized token fields.`,
          provenanceIds: provenanceRecords.map((record) => record.id),
          sourceState,
          interactions: [{ type: "click-point", action: "inspect_token" }],
        }],
      },
      {
        surface: "rail",
        mode: "replace",
        components: [{
          id: "meme-thesis",
          type: "insight-card",
          eyebrow: "thesis",
          title,
          body: thesisBody,
          items: thesisItems,
          provenanceIds: provenanceRecords.map((record) => record.id),
          sourceState,
        }, {
          id: "meme-top-token",
          type: "entity-inspector",
          eyebrow: "leading evidence",
          title: top.label,
          body: `${top.why} This is read-only social market context, not financial advice. ${fallbackNotice(provenance)}`,
          rows: [
            ["1H change", formatSignedPercent(top.change), "attention"],
            ["liquidity", formatCompactUsd(top.liquidityUsd), "visible"],
            ["liquidity risk", `${Math.round(top.liquidityRisk)}/100`, top.riskLabel],
            ["decay", `${Math.round(top.decayScore)}/100`, "narrative"],
          ],
          provenanceIds: provenanceRecords.map((record) => record.id),
          sourceState,
        }, {
          id: "meme-source",
          type: "source-confidence",
          title: "Evidence, Freshness, And Risk",
          rows: sourceAndRiskRows,
          note: "Read-only social market context; no trade path is exposed.",
          provenanceIds: provenanceRecords.map((record) => record.id),
          sourceState,
        }, {
          id: "meme-next-actions",
          type: "action-panel",
          title: "Inspect Next",
          items: nextActions,
          note: `Each prompt creates another forkable read-only channel state. ${fallbackNotice(provenance)}`,
          provenanceIds: provenanceRecords.map((record) => record.id),
          sourceState,
        }],
      },
      { surface: "modal", mode: "clear", components: [] },
    ],
    narration: `${title} is live with liquidity risk, source labels, and not financial advice visible. ${fallbackNotice(provenance)}`,
  };
}

function buildCryptoTurnUpdate(channel, intent, result, provenance) {
  const entity = intent.entities[0] || "BTC";
  const provenanceRecords = result.provenance?.length ? result.provenance : [provenance];
  const sourceState = componentSourceState(provenance);
  const isDepth = intent.intent === "liquidity_depth";
  const isComparison = intent.intent === "comparison" && Array.isArray(result.comparisonRows) && result.comparisonRows.length;
  const isRisk = intent.intent === "risk_anomaly";
  const chartBinding = isDepth ? "liveData.book" : isComparison ? "none" : "liveData.candles";
  const chartType = isDepth ? "market-depth" : isRisk ? "area" : "line";
  const title = isDepth
    ? `${entity} Liquidity And Depth`
    : isComparison
      ? `${(result.comparisonEntities || intent.entities).join(" vs ")} ${intent.timeframe.label} Divergence`
      : isRisk
        ? `${entity} Volatility Regime`
        : `${entity} ${intent.timeframe.label} Price Structure`;
  const summaryRows = tupleRowsFromAny(result.liveSummary?.metrics, 3);
  const evidenceMetrics = summaryRows.length ? summaryRows : [
    ["Rows", String(provenance.rowCount || 0), intent.capability],
    ["Source", sourceLabelForType(provenance.sourceType), provenance.provider],
    ["Freshness", provenance.stale ? "stale/cache" : "fresh", provenance.queriedAt || "now"],
  ];
  const feedRows = tupleRowsFromAny(result.liveSummary?.feed, 4);
  const primaryHighlight = result.liveSummary?.highlights?.[0] || fallbackNotice(provenance);
  const nextActions = generatedPromptItems(channel, intent);
  const thesisBody = isDepth
    ? `This is a read-only liquidity map around ${entity}: displayed bid and ask notional show where the book is concentrated right now.`
    : isComparison
      ? `This is a normalized ${intent.timeframe.label} comparison; line separation shows which asset is leading or lagging from the same starting point.`
      : isRisk
        ? `This is a volatility-regime view for ${entity}; the range band shows whether recent structure is widening or calming.`
        : `This is ${entity} price structure over ${intent.timeframe.label}; inspect whether the latest move is extending, mean-reverting, or stalling.`;
  const whyNowItems = [
    firstNonEmptyString([primaryHighlight], "The chart turns the provider refresh into one inspectable market thesis."),
    fallbackNotice(provenance),
  ];
  const chartQuery = isDepth
    ? { coin: entity }
    : {
      coin: entity,
      interval: intent.params.interval,
      lookbackHours: intent.params.lookbackHours,
      candles: intent.params.candles,
    };
  const chart = isComparison
    ? {
      type: "line",
      binding: "none",
      x: "label",
      y: result.comparisonEntities?.[0] || intent.entities[0] || "BTC",
      y2: result.comparisonEntities?.[1] || intent.entities[1],
      seriesFields: result.comparisonEntities || intent.entities,
      data: result.comparisonRows,
      variant: "comparison",
    }
    : { type: chartType, binding: chartBinding, x: "label", y: isDepth ? "notional" : isRisk ? "high" : "close", y2: isRisk ? "low" : undefined, color: isDepth ? "side" : undefined, query: chartQuery };
  return {
    layout: {
      template: intent.layout,
      rationale: `User asked for ${intent.topic}.`,
    },
    dataRequests: [{ capability: intent.capability, detail: "compact", params: intent.params, reason: intent.stageIntent }],
    provenanceRecords,
    generatedPage: buildGeneratedPageState(channel, intent, {
      title,
      summary: thesisBody,
      stageComponents: [{
        id: `${entity.toLowerCase()}-${intent.layout}-stage`,
        type: "vega-chart",
        eyebrow: "channel agent",
        title,
        chart,
        note: fallbackNotice(provenance),
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
        interactions: [{ type: "click-point", action: isDepth ? "inspect_book_level" : "inspect_candle" }],
      }],
      railComponents: [{
        id: `${entity.toLowerCase()}-metrics`,
        type: "metric-strip",
        title: `${entity} Evidence Snapshot`,
        metrics: evidenceMetrics,
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: `${entity.toLowerCase()}-insight`,
        type: "insight-card",
        eyebrow: "thesis",
        title,
        body: thesisBody,
        items: whyNowItems,
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: `${entity.toLowerCase()}-source`,
        type: "source-confidence",
        title: "Evidence And Freshness",
        rows: sourceRowsWithFreshness(provenance),
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }, {
        id: `${entity.toLowerCase()}-next-actions`,
        type: "action-panel",
        title: "Inspect Next",
        items: nextActions,
        note: "Each prompt keeps the same read-only provider path and creates another shareable generated state.",
        provenanceIds: provenanceRecords.map((record) => record.id),
        sourceState,
      }],
      actions: nextActions,
      provenanceRecords,
      sourceState,
    }),
    patch: {
      title: `${channel.label}: ${title}`,
      subtitle: fallbackNotice(provenance),
      visualLabel: intent.stageIntent,
      visualCopy: `${thesisBody} The rail names the source, freshness, and three concrete follow-up prompts.`,
      feedLabel: "agent trace",
      lens: intent.layout.replace(/_/g, " "),
      tabs: ["Focus", "Data", "Provenance", "Next"],
      metrics: evidenceMetrics,
      feed: feedRows.length ? feedRows : undefined,
    },
    surfaces: [
      {
        surface: "stageOverlay",
        mode: "replace",
        components: [{
          id: `${entity.toLowerCase()}-${intent.layout}-stage`,
          type: "vega-chart",
          eyebrow: "channel agent",
          title,
          chart,
          note: fallbackNotice(provenance),
          provenanceIds: provenanceRecords.map((record) => record.id),
          sourceState,
          interactions: [{ type: "click-point", action: isDepth ? "inspect_book_level" : "inspect_candle" }],
        }],
      },
      {
        surface: "rail",
        mode: "replace",
        components: [
          {
            id: `${entity.toLowerCase()}-metrics`,
            type: "metric-strip",
            title: `${entity} Evidence Snapshot`,
            metrics: evidenceMetrics,
            note: fallbackNotice(provenance),
            provenanceIds: provenanceRecords.map((record) => record.id),
            sourceState,
          },
          {
            id: `${entity.toLowerCase()}-insight`,
            type: "insight-card",
            eyebrow: "thesis",
            title: title,
            body: thesisBody,
            items: whyNowItems,
            provenanceIds: provenanceRecords.map((record) => record.id),
            sourceState,
          },
          {
            id: `${entity.toLowerCase()}-source`,
            type: "source-confidence",
            title: "Evidence And Freshness",
            rows: sourceRowsWithFreshness(provenance),
            provenanceIds: provenanceRecords.map((record) => record.id),
            sourceState,
          },
          {
            id: `${entity.toLowerCase()}-next-actions`,
            type: "action-panel",
            title: "Inspect Next",
            items: nextActions,
            note: `Each prompt keeps the same read-only provider path and creates another shareable generated state. ${fallbackNotice(provenance)}`,
            provenanceIds: provenanceRecords.map((record) => record.id),
            sourceState,
          },
        ],
      },
      { surface: "modal", mode: "clear", components: [] },
    ],
    narration: `${title} is now the active channel focus. ${fallbackNotice(provenance)}`,
  };
}

function buildPowerGridTurnUpdate(channel, intent, result, provenance) {
  const respondent = intent.entities[0] || "US48";
  const sourceState = componentSourceState(provenance);
  const wantsRanking = intent.capability === "rankings";
  const binding = wantsRanking && intent.intent === "fuel_mix" ? "liveData.fuelMix" : wantsRanking ? "liveData.corridors" : "liveData.series";
  const chart = binding === "liveData.series"
    ? { type: "area", binding, x: "label", y: "loadMw", y2: "forecastMw", query: { respondent } }
    : { type: "bar", binding, x: "label", y: binding === "liveData.fuelMix" ? "value" : "stressPct", query: { respondent } };
  const summaryRows = tupleRowsFromAny(result.liveSummary?.metrics, 3);
  const feedRows = tupleRowsFromAny(result.liveSummary?.feed, 4);
  const primaryHighlight = result.liveSummary?.highlights?.[0] || fallbackNotice(provenance);
  const nextActions = nextActionsForIntent(channel, intent);
  const title = intent.intent === "grid_risk" ? `${respondent} Grid Risk` : intent.intent === "fuel_mix" ? `${respondent} Fuel Mix` : `${respondent} Load Vs Forecast`;
  return {
    layout: {
      template: intent.layout,
      rationale: `User asked for ${intent.topic}.`,
    },
    dataRequests: [{ capability: intent.capability, detail: "compact", params: intent.params, reason: intent.stageIntent }],
    provenanceRecords: [provenance],
    patch: {
      title: `${channel.label}: ${title}`,
      subtitle: fallbackNotice(provenance),
      visualLabel: intent.stageIntent,
      visualCopy: intent.railIntent,
      feedLabel: "agent trace",
      lens: intent.layout.replace(/_/g, " "),
      tabs: ["Load", "Risk", "Sources", "Next"],
      metrics: summaryRows.length ? summaryRows : undefined,
      feed: feedRows.length ? feedRows : undefined,
    },
    surfaces: [
      {
        surface: "stageOverlay",
        mode: "replace",
        components: [{
          id: `${respondent.toLowerCase()}-${intent.layout}-stage`,
          type: "vega-chart",
          eyebrow: "channel agent",
          title,
          chart,
          note: `${fallbackNotice(provenance)} Frequency and corridor stress are labeled display proxies where derived.`,
          provenanceIds: [provenance.id],
          sourceState,
          interactions: [{ type: "click-point", action: "inspect_grid_row" }],
        }],
      },
      {
        surface: "rail",
        mode: "replace",
        components: [
          {
            id: `${respondent.toLowerCase()}-metrics`,
            type: "metric-strip",
            title: "Grid Snapshot",
            metrics: summaryRows,
            provenanceIds: [provenance.id],
            sourceState,
          },
          {
            id: `${respondent.toLowerCase()}-insight`,
            type: "insight-card",
            eyebrow: "Kat channel state",
            title: intent.topic,
            body: `${primaryHighlight} ${fallbackNotice(provenance)}`,
            items: result.liveSummary?.highlights?.slice(1, 4) || [],
            provenanceIds: [provenance.id],
            sourceState,
          },
          {
            id: `${respondent.toLowerCase()}-source`,
            type: "source-confidence",
            title: "Data Provenance",
            rows: sourceRows(provenance),
            provenanceIds: [provenance.id],
            sourceState,
          },
          {
            id: `${respondent.toLowerCase()}-next-actions`,
            type: "action-panel",
            title: "Next Moves",
            items: nextActions,
            note: "These actions reuse the same channel agent runtime.",
            provenanceIds: [provenance.id],
            sourceState,
          },
        ],
      },
      { surface: "modal", mode: "clear", components: [] },
    ],
    narration: `${title} is now the active channel focus. ${fallbackNotice(provenance)}`,
  };
}

function buildGenericTurnUpdate(channel, intent, result, provenance) {
  const sourceState = componentSourceState(provenance);
  const nextActions = nextActionsForIntent(channel, intent);
  return {
    layout: { template: intent.layout, rationale: `User asked for ${intent.topic}.` },
    dataRequests: [{ capability: intent.capability, detail: "compact", params: intent.params, reason: intent.stageIntent }],
    provenanceRecords: [provenance],
    patch: {
      title: `${channel.label}: ${intent.topic}`,
      subtitle: fallbackNotice(provenance),
      visualLabel: intent.stageIntent,
      visualCopy: intent.railIntent,
      feedLabel: "agent trace",
      lens: intent.layout.replace(/_/g, " "),
    },
    surfaces: [
      {
        surface: "stageOverlay",
        mode: "replace",
        components: [{
          id: `${channel.id}-${intent.layout}-stage`,
          type: "insight-card",
          eyebrow: "channel agent",
          title: intent.topic,
          body: result.liveSummary?.highlights?.[0] || fallbackNotice(provenance),
          items: result.liveSummary?.highlights?.slice(1, 4) || [],
          provenanceIds: [provenance.id],
          sourceState,
        }],
      },
      {
        surface: "rail",
        mode: "replace",
        components: [{
          id: `${channel.id}-source`,
          type: "source-confidence",
          title: "Data Provenance",
          rows: sourceRows(provenance),
          provenanceIds: [provenance.id],
          sourceState,
        }, {
          id: `${channel.id}-next-actions`,
          type: "action-panel",
          title: "Next Moves",
          items: nextActions,
          provenanceIds: [provenance.id],
          sourceState,
        }],
      },
      { surface: "modal", mode: "clear", components: [] },
    ],
    narration: `${intent.topic} is now the active channel focus. ${fallbackNotice(provenance)}`,
  };
}

function buildChannelTurnUpdate(channel, intent, result, provenance) {
  if (channel.id === "crypto-trading" || channel.liveProvider === "hyperliquid") return buildCryptoTurnUpdate(channel, intent, result, provenance);
  if (channel.id === "power-grid" || channel.liveProvider === "eia-grid") return buildPowerGridTurnUpdate(channel, intent, result, provenance);
  if (channel.id === "polyrec" || channel.liveProvider === "polymarket") return buildPolyrecTurnUpdate(channel, intent, result, provenance);
  if (channel.id === "meme-coin" || channel.liveProvider === "pumpfun") return buildMemeTurnUpdate(channel, intent, result, provenance);
  return buildGenericTurnUpdate(channel, intent, result, provenance);
}

function surfaceIdsFromUpdate(surfaces = []) {
  return Object.fromEntries(generatedSurfaceNames().concat("below").map((surface) => [surface, []]));
}

function updateChannelSessionFromTurn(channel, sessionState, turnId, userText, intent, result, update, provenance, events) {
  const provenanceRecords = Array.isArray(update.provenanceRecords) && update.provenanceRecords.length ? update.provenanceRecords : [provenance];
  const nextState = {
    ...sessionState,
    focus: {
      topic: intent.topic,
      entities: intent.entities || [],
      timeframe: intent.timeframe || null,
      mode: intent.mode,
      intent: intent.intent,
    },
    layout: {
      template: update.layout?.template || intent.layout,
      rationale: update.layout?.rationale || "",
    },
    turns: [
      ...(sessionState.turns || []),
      { role: "user", text: userText, at: new Date().toISOString(), turnId },
      { role: "assistant", text: update.narration || "", at: new Date().toISOString(), turnId, voice: "Kat" },
    ].slice(-24),
    provenance: [
      ...(sessionState.provenance || []),
      ...provenanceRecords,
    ].slice(-60),
    traces: [
      ...(sessionState.traces || []),
      {
        turnId,
        at: new Date().toISOString(),
        events: events.map((event) => ({ type: event.type, at: event.at })),
      },
    ].slice(-40),
  };

  const dataset = {
    id: `${channel.id}-${intent.capability}-${Date.now().toString(36)}`,
    capability: intent.capability,
    provider: provenance.provider,
    status: provenance.status,
    sourceType: provenance.sourceType,
    provenanceId: provenance.id,
    rowCount: provenance.rowCount,
    bindingHints: result.bindingHints || [],
  };
  nextState.datasets = [dataset, ...(sessionState.datasets || [])].slice(0, 12);
  nextState.conclusions = [{
    text: update.narration || fallbackNotice(provenance),
    provenanceIds: provenanceRecords.map((record) => record.id),
  }, ...(sessionState.conclusions || [])].slice(0, 8);
  nextState.nextActions = nextActionsForIntent(channel, intent);
  nextState.unresolvedQuestions = provenance.sourceType === "synthetic_fallback" || provenance.sourceType === "unavailable"
    ? ["Connect or recover the live provider before making live-data claims."]
    : [];
  const surfaces = { ...(sessionState.surfaces || surfaceIdsFromUpdate()) };
  for (const surfaceUpdate of update.surfaces || []) {
    if (surfaceUpdate.mode === "clear") surfaces[surfaceUpdate.surface] = [];
    if (surfaceUpdate.mode === "replace") surfaces[surfaceUpdate.surface] = surfaceUpdate.components.map((component) => component.id);
    if (surfaceUpdate.mode === "append") {
      surfaces[surfaceUpdate.surface] = [
        ...(surfaces[surfaceUpdate.surface] || []),
        ...surfaceUpdate.components.map((component) => component.id),
      ].slice(-generatedSurfaceMax(surfaceUpdate.surface));
    }
  }
  nextState.surfaces = surfaces;
  return nextState;
}

async function runChannelTurn(channel, raw = {}, options = {}) {
  const userText = clampText(raw.userText || raw.text || raw.transcript || raw.message, 700);
  if (!userText) throw new Error("empty channel turn");
  const sessionId = normalizeSessionId(raw.sessionId || raw.katContext?.sessionId || raw.clientSessionId || "local-session");
  const turnId = channelTurnId();
  const events = [];
  const emit = (event) => emitChannelTurnEvent(events, options.onEvent, { channelId: channel.id, turnId, ...event });

  const forkShareId = cleanChannelShareId(raw.forkOfShareId || raw.shareId || "");
  const forkSeed = forkShareId ? seedStateFromChannelShare(channel, sessionId, getChannelShare(forkShareId)) : null;
  const currentState = forkSeed || getChannelSessionState(channel, sessionId);
  emit({ type: "channel.turn.started", sessionId, userText });
  appendChannelAnalyticsEvent({
    type: "prompt_submitted",
    sessionId,
    channelId: channel.id,
    promptText: userText,
    shareId: forkShareId,
  });

  const manifest = buildChannelAgentManifest(channel);
  const intent = parseChannelTurnIntent(channel, userText, currentState);
  emit({ type: "channel.intent.parsed", intent });

  let workingState = {
    ...currentState,
    focus: {
      topic: intent.topic,
      entities: intent.entities,
      timeframe: intent.timeframe,
      mode: intent.mode,
      intent: intent.intent,
    },
  };
  emit({ type: "channel.state.updated", state: { focus: workingState.focus } });

  emit({ type: "channel.data.query.started", capability: intent.capability, params: intent.params });
  let result;
  let provenance;
  try {
    result = intent.intent === "comparison" && (channel.id === "crypto-trading" || channel.liveProvider === "hyperliquid")
      ? await queryCryptoComparisonCapability(channel, intent)
      : await queryChannelCapability(channel, { capability: intent.capability, detail: intent.detail, params: intent.params });
    provenance = result.provenance?.[0] || buildProvenanceRecord(channel, intent.capability, intent.params, {
      source: result.source,
      stale: result.stale,
      fallbackReason: result.fallbackReason,
    }, result.rows?.length || 0);
    emit({
      type: "channel.data.query.completed",
      capability: intent.capability,
      source: result.source,
      sourceType: provenance.sourceType,
      rowCount: provenance.rowCount,
      provenanceId: provenance.id,
      fallbackReason: result.fallbackReason || null,
    });
  } catch (err) {
    provenance = {
      id: `prov_${Date.now().toString(36)}_failed`,
      sourceType: "unavailable",
      provider: channel.liveProvider || "unavailable",
      capability: intent.capability,
      params: intent.params,
      queriedAt: new Date().toISOString(),
      cache: { status: "failed", ttlMs: LIVE_API_TTL_MS },
      rowCount: 0,
      status: "failed",
      stale: false,
      fallbackReason: err.message,
    };
    result = {
      ok: false,
      source: "unavailable",
      sourceType: "unavailable",
      stale: false,
      fallbackReason: err.message,
      liveSummary: {
        source: "unavailable",
        stale: false,
        fallbackReason: err.message,
        metrics: [],
        feed: [],
        highlights: [`${channel.label} data is unavailable: ${err.message}`],
      },
      rows: [],
      bindingHints: [],
      provenance: [provenance],
    };
    emit({ type: "channel.data.query.failed", capability: intent.capability, error: err.message, provenanceId: provenance.id });
  }

  const update = buildChannelTurnUpdate(channel, intent, result, provenance);
  emit({ type: "channel.layout.selected", layout: update.layout });
  for (const surfaceUpdate of update.surfaces || []) {
    emit({
      type: surfaceUpdate.mode === "clear" ? "channel.surface.clear" : "channel.surface.replace",
      surface: surfaceUpdate.surface,
      mode: surfaceUpdate.mode,
      components: surfaceUpdate.components || [],
    });
  }

  const override = applyChannelUpdate(channel.id, update, userText, "channel-agent-turn");
  workingState = updateChannelSessionFromTurn(channel, workingState, turnId, userText, intent, result, update, provenance, events);
  workingState.generated = sanitizeGeneratedDashboard(override.generated);
  workingState.channelUpdate = sanitizeChannelUpdate(update, channel);
  workingState.patch = sanitizeDashboardPatch(update.patch || {});
  const savedState = saveChannelSessionState(channel, sessionId, workingState, {
    type: "channel_morphed",
    channel: channel.id,
    channelId: channel.id,
    sessionId,
    turnId,
    userText,
    promptText: userText,
    intent,
    source: provenance.provider,
    sourceType: provenance.sourceType,
    fallback: ["synthetic_fallback", "unavailable"].includes(provenance.sourceType),
    shareId: forkShareId,
    at: new Date().toISOString(),
  });
  if (["synthetic_fallback", "unavailable"].includes(provenance.sourceType)) {
    appendChannelAnalyticsEvent({
      type: "fallback_seen",
      sessionId,
      channelId: channel.id,
      promptText: userText,
      sourceType: provenance.sourceType,
      fallbackReason: provenance.fallbackReason || result.fallbackReason || "",
    });
  }
  if (forkShareId) {
    appendChannelAnalyticsEvent({
      type: "share_forked",
      sessionId,
      channelId: channel.id,
      shareId: forkShareId,
      promptText: userText,
      sourceType: provenance.sourceType,
      fallback: ["synthetic_fallback", "unavailable"].includes(provenance.sourceType),
    });
  }
  emit({ type: "channel.narration.delta", text: update.narration || "" });
  emit({ type: "channel.next_actions.updated", nextActions: savedState.nextActions || [] });
  emit({ type: "channel.state.updated", state: savedState });
  emit({ type: "channel.turn.completed", state: savedState, narration: update.narration || "", manifest });
  const finalState = {
    ...savedState,
    traces: [
      ...(savedState.traces || []).filter((trace) => trace.turnId !== turnId),
      {
        turnId,
        at: new Date().toISOString(),
        events: events.map((event) => ({ type: event.type, at: event.at })),
      },
    ].slice(-40),
  };
  const persistedState = saveChannelSessionState(channel, sessionId, finalState);

  return {
    ok: true,
    runtime: CHANNEL_RUNTIME_VERSION,
    channel: publicChannel(channel),
    turnId,
    sessionId,
    manifest,
    intent,
    data: result,
    provenance: result.provenance?.length ? result.provenance : [provenance],
    update: sanitizeChannelUpdate(update, channel),
    generated: sanitizeGeneratedDashboard(override.generated),
    state: persistedState,
    events,
    narration: update.narration || "",
  };
}

function buildKatContextPacket(channel, liveEnvelope, options = {}) {
  const docs = channelDocs(channel);
  const dashboard = dashboardContextFor(channel.id);
  return {
    channel: publicChannel(channel),
    liveSummary: summarizeChannelLive(channel, liveEnvelope),
    dashboard: {
      ...dashboard,
      editableFields: ["title", "subtitle", "kicker", "visualLabel", "visualCopy", "feedLabel", "lens", "caption", "tabs", "metrics", "feed", "customCss"],
      generated: dashboard.generated,
    },
    generation: channelGenerationSpec(channel),
    docs: {
      summary: docs.summary,
      contract: docs.contract,
      apiIdeas: docs.apiIdeas,
      providers: docs.providers.map((provider) => ({
        id: provider.id,
        label: provider.label,
        auth: provider.auth,
        realtime: provider.realtime,
        docsUrl: provider.docsUrl,
      })),
    },
    rules: [
      "Use liveSummary for normal spoken answers.",
      "Call get_channel_live before making specific current-data claims not present in liveSummary.",
      "Use route_channel_turn for meaningful user turns so the specialist channel agent updates state and surfaces together.",
      "Use query_channel_capability when you need data beyond liveSummary.",
      "Use apply_channel_update for generated views, panels, charts, modals, and audience-specific layouts.",
      "Prefer channel update specs over provider-specific or dashboard-specific shortcuts.",
      "Generated charts and insights must carry provenance records; synthetic fallback must stay visible.",
      "Generated surfaces replace by default; append only when the user asks to keep multiple components.",
      "Use apply_dashboard_mutation for legacy compatibility only.",
      "Use apply_dashboard_edit only for narrow copy, metric, feed, or tab edits.",
      "Do not call provider APIs directly from generated components.",
      "Do not add wallet, trading, paid, KYC, or login-only flows in v1.",
    ],
    contextMode: options.contextMode || "fast",
  };
}

function katContextBootstrap(dashboardId) {
  const channel = getChannel(dashboardId);
  if (!channel) {
    return {
      channel: null,
      liveSummary: null,
      dashboard: dashboardContextFor(dashboardId),
      docs: null,
      rules: ["No dashboard channel is active yet. Ask what panel the user wants to open."],
      contextMode: "bootstrap",
    };
  }
  return buildKatContextPacket(channel, getCachedChannelLiveEnvelope({ query: {} }, channel), { contextMode: "bootstrap" });
}

async function getKatChannelContext(req, channel) {
  const fresh = req.query?.fresh === "1" || req.query?.fresh === "true";
  const liveEnvelope = fresh
    ? await getChannelLiveEnvelope(req, channel)
    : getCachedChannelLiveEnvelope(req, channel);
  return buildKatContextPacket(channel, liveEnvelope, { contextMode: fresh ? "fresh" : "fast" });
}

app.get("/api/channels", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({
    ok: true,
    routes: {
      list: "/api/channels",
      metadata: "/api/channels/:channel",
      live: "/api/channels/:channel/live",
      context: "/api/channels/:channel/context",
      docs: "/api/channels/:channel/docs",
      manifest: "/api/channels/:channel/manifest",
      agent: "/api/channels/:channel/agent",
      state: "/api/channels/:channel/state",
      turn: "/api/channels/:channel/turn",
      turnStream: "/api/channels/:channel/turn/stream",
      query: "/api/channels/:channel/query",
      update: "/api/channels/:channel/update",
    },
    channels: listChannels().map(publicChannel),
  });
});

app.get("/api/channels/:channel", (req, res) => {
  const channel = getChannel(req.params.channel);
  if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ ok: true, channel: publicChannel(channel) });
});

app.get("/api/channels/:channel/live", async (req, res) => {
  try {
    const channel = getChannel(req.params.channel);
    if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(await getChannelLiveEnvelope(req, channel));
  } catch (err) {
    console.error("channel live error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/channels/:channel/docs", (req, res) => {
  const channel = getChannel(req.params.channel);
  if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ ok: true, docs: channelDocs(channel) });
});

app.get("/api/channels/:channel/context", async (req, res) => {
  try {
    const channel = getChannel(req.params.channel);
    if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({ ok: true, context: await getKatChannelContext(req, channel) });
  } catch (err) {
    console.error("channel context error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/channels/:channel/manifest", (req, res) => {
  const channel = getChannel(req.params.channel);
  if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
  const docs = channelDocs(channel);
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({
    ok: true,
    manifest: {
      runtime: CHANNEL_RUNTIME_VERSION,
      channel: publicChannel(channel),
      generation: docs.generation,
      manifest: docs.manifest,
      agentPath: channel.agentPath,
      statePath: channel.statePath,
      turnPath: channel.turnPath,
      rules: docs.katContract,
    },
  });
});

app.get("/api/channels/:channel/agent", (req, res) => {
  const channel = getChannel(req.params.channel);
  if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ ok: true, manifest: buildChannelAgentManifest(channel) });
});

app.get("/api/channels/:channel/state", (req, res) => {
  const channel = getChannel(req.params.channel);
  if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
  const sessionId = normalizeSessionId(req.query.sessionId || req.query.session || "local-session");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ ok: true, state: getChannelSessionState(channel, sessionId) });
});

app.post("/api/channels/:channel/turn", async (req, res) => {
  try {
    const channel = getChannel(req.params.channel);
    if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(await runChannelTurn(channel, body));
  } catch (err) {
    console.error("channel turn error:", err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

function writeSseEvent(res, event) {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

app.get("/api/channels/:channel/turn/stream", async (req, res) => {
  const channel = getChannel(req.params.channel);
  if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  try {
    const body = {
      userText: req.query.text || req.query.userText || "",
      sessionId: req.query.sessionId || req.query.session || "local-session",
      forkOfShareId: req.query.forkOfShareId || req.query.shareId || "",
    };
    const result = await runChannelTurn(channel, body, { onEvent: (event) => writeSseEvent(res, event) });
    writeSseEvent(res, { type: "channel.stream.completed", channelId: channel.id, turnId: result.turnId, ok: true });
  } catch (err) {
    writeSseEvent(res, { type: "channel.stream.failed", channelId: channel.id, ok: false, error: err.message, at: new Date().toISOString() });
  } finally {
    res.end();
  }
});

app.post("/api/channels/:channel/query", async (req, res) => {
  try {
    const channel = getChannel(req.params.channel);
    if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(await queryChannelCapability(channel, body));
  } catch (err) {
    console.error("channel query error:", err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/api/channels/:channel/update", (req, res) => {
  try {
    const channel = getChannel(req.params.channel);
    if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const override = applyChannelUpdate(channel.id, body.update || body, body.instruction, "channel-runtime-api");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      ok: true,
      channel: publicChannel(channel),
      generated: sanitizeGeneratedDashboard(override.generated),
      applied: sanitizeChannelUpdate(body.update || body, channel),
      updatedAt: override.updatedAt,
    });
  } catch (err) {
    console.error("channel update error:", err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

function latestTurnText(state, role) {
  const turns = Array.isArray(state.turns) ? state.turns : [];
  return [...turns].reverse().find((turn) => turn.role === role)?.text || "";
}

function sourceStateFromShareProvenance(provenanceRecords) {
  const record = Array.isArray(provenanceRecords) ? provenanceRecords.filter(Boolean).slice(-1)[0] : null;
  if (!record) return { sourceType: "unavailable", provider: "unavailable", fallbackReason: "no provenance recorded" };
  return {
    sourceType: record.sourceType,
    provider: record.provider,
    fallbackReason: record.fallbackReason || null,
    stale: Boolean(record.stale),
  };
}

function shareHeadline(channel, state, prompt) {
  const text = normalizeAgentText(prompt || state.focus?.topic || "");
  if (channel.id === "crypto-trading") {
    if (/\b(liquidity|depth|book)\b/.test(text)) return `${state.focus?.entities?.[0] || "BTC"} Liquidity Pocket`;
    if (/\b(compare|versus|vs)\b/.test(text) || (state.focus?.entities || []).length > 1) return `${(state.focus?.entities || ["BTC", "ETH"]).slice(0, 2).join(" vs ")} Divergence`;
    if (/\b(volatility|drawdown|range|regime)\b/.test(text)) return `${state.focus?.entities?.[0] || "BTC"} Volatility Regime`;
    return "BTC 3M Price Structure";
  }
  if (channel.id === "polyrec") {
    if (/\b(close|50 50|volume)\b/.test(text)) return "Close Odds, High Volume";
    if (/\b(election|politic|macro|fed|rate|inflation)\b/.test(text)) return "Election Market Watch";
    if (/\b(crypto|btc|bitcoin|eth|ethereum)\b/.test(text)) return "Crypto Prediction Market Drift";
    return "Weirdest Polymarket Board";
  }
  if (channel.id === "meme-coin") {
    if (/\b(decay|fade|fading|peak)\b/.test(text)) return "Narrative Decay Watch";
    if (/\b(fragile|viral)\b/.test(text)) return "Viral But Fragile";
    if (/\b(attention|liquidity|risk|mismatch|social|narrative)\b/.test(text)) return "Attention Vs Liquidity Risk";
    return "Fastest Moving Meme Coins";
  }
  return `${channel.label} Generated State`;
}

function buildChannelShareObject(channel, sessionId, options = {}) {
  const normalizedSession = normalizeSessionId(sessionId);
  const state = getChannelSessionState(channel, normalizedSession);
  const override = readDashboardOverrides().dashboards[channel.id] || {};
  const generated = sanitizeGeneratedDashboard(options.generated || state.generated || override.generated, channel);
  const generatedPage = generated.page || null;
  const channelUpdate = sanitizeChannelUpdate(options.channelUpdate || state.channelUpdate || override.channelUpdate, channel) || {};
  const provenanceRecords = Array.isArray(channelUpdate.provenanceRecords) && channelUpdate.provenanceRecords.length
    ? channelUpdate.provenanceRecords
    : Array.isArray(state.provenance) ? state.provenance.slice(-6) : [];
  const prompt = clampText(options.prompt || latestTurnText(state, "user") || state.focus?.topic || `${channel.label} overview`, 220);
  const narrationScript = clampText(channelUpdate.narration || latestTurnText(state, "assistant") || `${channel.label} state is ready to replay.`, 260);
  const sourceState = sourceStateFromShareProvenance(provenanceRecords);
  const id = newChannelShareId(channel.id);
  return {
    id,
    channelId: channel.id,
    createdAt: new Date().toISOString(),
    creatorSessionId: normalizedSession,
    prompt,
    mode: generatedPage ? "generated_page" : "slot_overrides",
    headline: clampText(options.headline || generatedPage?.thesis?.title || shareHeadline(channel, state, prompt), 120),
    summary: clampText(options.summary || generatedPage?.thesis?.summary || `${channel.label} generated a replayable market state with visible source provenance.`, 220),
    openCount: 0,
    replayCount: 0,
    forkCount: 0,
    layout: {
      template: generatedPage?.layout?.template || state.layout?.template || channelUpdate.layout?.template || generated.view || "overview",
      stage: generatedPage?.layout?.stage,
      rail: generatedPage?.layout?.rail,
      actions: generatedPage?.layout?.actions,
      rationale: state.layout?.rationale || channelUpdate.layout?.rationale || `The user asked: ${prompt}`,
    },
    patch: sanitizeDashboardPatch(options.patch || state.patch || channelUpdate.patch || override.patch || {}),
    surfaces: generated.slots,
    generatedPage,
    generated,
    dataRequests: channelUpdate.dataRequests || [],
    provenanceRecords,
    sourceState,
    sourceStateLabel: sourceLabelForType(sourceState.sourceType),
    narration: {
      script: narrationScript,
      durationSeconds: 20,
    },
    replay: {
      durationSeconds: 20,
      steps: [
        { at: 0, type: "open_channel" },
        { at: 4, type: "show_stage" },
        { at: 11, type: "show_provenance" },
        { at: 16, type: "show_next_actions" },
      ],
    },
    forkPrompts: (generatedPage?.actions || state.nextActions || nextActionsForIntent(channel, { intent: "overview", layout: "overview" })).slice(0, 4),
    parentShareId: cleanChannelShareId(options.parentShareId || ""),
  };
}

function saveChannelShare(share) {
  const db = readChannelShareDb();
  db.shares[share.id] = share;
  db.events.push({ type: "share_created", shareId: share.id, channelId: share.channelId, sessionId: share.creatorSessionId, timestamp: new Date().toISOString() });
  db.events = db.events.slice(-500);
  writeChannelShareDb(db);
  appendChannelAnalyticsEvent({
    type: "share_created",
    sessionId: share.creatorSessionId,
    channelId: share.channelId,
    shareId: share.id,
    promptText: share.prompt,
    sourceType: share.sourceState?.sourceType,
    fallback: ["synthetic_fallback", "unavailable"].includes(share.sourceState?.sourceType),
  });
  return share;
}

function getChannelShare(id) {
  return readChannelShareDb().shares[cleanChannelShareId(id)] || null;
}

app.post("/api/channel-shares", (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const channel = getChannel(body.channelId || body.channel || body.dashboardId || "crypto-trading");
    if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
    const sessionId = normalizeSessionId(body.sessionId || body.session || "local-session");
    const share = saveChannelShare(buildChannelShareObject(channel, sessionId, {
      prompt: body.prompt,
      headline: body.headline,
      summary: body.summary,
      parentShareId: body.parentShareId || body.forkOfShareId,
    }));
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({ ok: true, share, url: `/share/channel/${encodeURIComponent(share.id)}` });
  } catch (err) {
    console.error("channel share create error:", err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.get("/api/channel-shares/:id", (req, res) => {
  const share = getChannelShare(req.params.id);
  if (!share) return res.status(404).json({ ok: false, error: "unknown channel share" });
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ ok: true, share });
});

app.post("/api/channel-shares/:id/fork", async (req, res) => {
  try {
    const share = getChannelShare(req.params.id);
    if (!share) return res.status(404).json({ ok: false, error: "unknown channel share" });
    const channel = getChannel(share.channelId);
    if (!channel) return res.status(404).json({ ok: false, error: "unknown channel" });
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const userText = clampText(body.userText || body.prompt || body.text, 700);
    if (!userText) return res.status(400).json({ ok: false, error: "empty fork prompt" });
    const sessionId = normalizeSessionId(body.sessionId || `fork-${share.id}-${Date.now().toString(36)}`);
    const turn = await runChannelTurn(channel, { userText, sessionId, forkOfShareId: share.id });
    updateChannelShareStats(share.id, "share_forked", { sessionId, prompt: userText });
    const forkedShare = saveChannelShare(buildChannelShareObject(channel, sessionId, {
      prompt: userText,
      parentShareId: share.id,
    }));
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({ ok: true, parentShareId: share.id, share: forkedShare, turn, url: `/share/channel/${encodeURIComponent(forkedShare.id)}` });
  } catch (err) {
    console.error("channel share fork error:", err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

function sendChannelSharePage(req, res) {
  const share = getChannelShare(req.params.id);
  if (!share) return res.status(404).send("Unknown channel share");
  const basePath = requestBasePath(req);
  const origin = requestOrigin(req);
  const targetPath = `${basePath}/dashboards/${encodeURIComponent(share.channelId)}?fullscreen=1&autoplay=1&channelShare=${encodeURIComponent(share.id)}&replay=1`;
  const targetUrl = absoluteUrl(origin, targetPath);
  const shareUrl = absoluteUrl(origin, `${basePath}/share/channel/${encodeURIComponent(share.id)}`);
  const metadata = {
    id: share.channelId,
    label: share.headline || share.channelId,
    title: `${share.headline || "Katechon Channel State"} | Katechon`,
    description: `${share.summary || "A replayable Katechon channel state."} Fork this live market channel.`,
  };
  const imageUrl = absoluteUrl(origin, dashboardImagePath(share.channelId, basePath));
  updateChannelShareStats(share.id, "share_opened");
  appendChannelAnalyticsEvent({
    type: "share_opened",
    sessionId: normalizeSessionId(req.query.sessionId || "anonymous"),
    channelId: share.channelId,
    shareId: share.id,
    promptText: share.prompt,
    sourceType: share.sourceState?.sourceType,
    fallback: ["synthetic_fallback", "unavailable"].includes(share.sourceState?.sourceType),
  });
  res.send(renderDashboardShareHtml({ metadata, shareUrl, targetUrl, imageUrl }));
}

app.get(["/share/channel/:id", "/app/share/channel/:id"], sendChannelSharePage);

app.post("/api/launch-events", (req, res) => {
  const event = normalizeLaunchEvent(req.body && typeof req.body === "object" ? req.body : {});
  if (!event) return res.status(400).json({ ok: false, error: "unsupported launch event" });
  appendChannelAnalyticsEvent(event);
  if (event.type === "share_replayed" && event.shareId) updateChannelShareStats(event.shareId, "share_replayed", { sessionId: event.sessionId });
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json({ ok: true, event });
});

app.get("/api/launch-analytics", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json(launchAnalyticsSummary());
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

app.get("/api/dashboard-context/:dashboard", async (req, res) => {
  try {
    const channel = getChannel(req.params.dashboard);
    if (!channel) return res.json(katContextBootstrap(req.params.dashboard));
    res.json(await getKatChannelContext(req, channel));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/dashboard-overrides/:dashboard", (req, res) => {
  try {
    const dashboardId = cleanDashboardId(req.params.dashboard);
    const override = readDashboardOverrides().dashboards[dashboardId] || null;
    res.json({
      dashboard: dashboardId,
      patch: override?.patch || {},
      generated: sanitizeGeneratedDashboard(override?.generated),
      updatedAt: override?.updatedAt || null,
      instruction: override?.instruction || "",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/realtime/status", (req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.OPENAI_API_KEY),
    model: OPENAI_REALTIME_MODEL,
    voice: OPENAI_REALTIME_VOICE,
    currentWorkspace: state.currentWorkspace,
    fallback: {
      groqTranscription: Boolean(process.env.GROQ_API_KEY),
      elevenLabsVoice: Boolean(process.env.ELEVENLABS_API_KEY),
      elevenLabsVoiceId: ELEVENLABS_VOICE_ID,
      elevenLabsModel: ELEVENLABS_MODEL_ID,
    },
  });
});

app.post("/api/realtime/session", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    }
    if (!req.body || typeof req.body !== "string") {
      return res.status(400).json({ error: "SDP offer required" });
    }

    const form = new FormData();
    const dashboard = cleanDashboardId(req.query.dashboard || state.currentWorkspace);
    form.append("sdp", req.body);
    form.append("session", JSON.stringify(realtimeSessionConfig(dashboard)));
    console.log(`OpenAI realtime session request: dashboard=${dashboard || "landing"}, model=${OPENAI_REALTIME_MODEL}, voice=${OPENAI_REALTIME_VOICE}`);

    const response = await fetch(OPENAI_REALTIME_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
      timeout: 15000,
    });
    const text = await response.text();
    console.log(`OpenAI realtime session response: status=${response.status}, dashboard=${dashboard || "landing"}, model=${OPENAI_REALTIME_MODEL}, voice=${OPENAI_REALTIME_VOICE}`);
    res.status(response.status);
    res.type(response.ok ? "application/sdp" : "text/plain");
    res.send(text);
  } catch (err) {
    console.error("realtime session failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

async function runRealtimeTool(name, args = {}, fallbackDashboard = "") {
  if (name === "open_dashboard") {
    const workspace = cleanDashboardId(args.workspace);
    if (!PANELS.some((panel) => panel.id === workspace)) throw new Error("unknown dashboard");
    const action = workspace === "landing" ? "go_home" : workspace === "spectre" ? "open_spectre" : "open_dashboard";
    state.currentWorkspace = workspace;
    const remote = await dispatchRemoteCommand({
      id: `kat-realtime-tool-${Date.now()}`,
      action,
      workspace,
      transcript: `open ${workspace}`,
      speech: workspace === "landing" ? "Back to the main panel." : `Opening ${dashboardContextFor(workspace).label}.`,
    });
    return {
      ok: true,
      action,
      workspace,
      remote,
      dashboard: workspace === "landing" ? null : dashboardContextFor(workspace),
    };
  }

  if (name === "get_dashboard_context" || name === "get_channel_context") {
    const dashboardId = cleanDashboardId(args.dashboardId || fallbackDashboard || state.currentWorkspace);
    const channel = getChannel(dashboardId);
    if (!channel) return { ok: true, context: katContextBootstrap(dashboardId) };
    const req = { query: args.fresh ? { fresh: "1" } : {} };
    return { ok: true, context: await getKatChannelContext(req, channel) };
  }

  if (name === "get_channel_live") {
    const dashboardId = cleanDashboardId(args.dashboardId || fallbackDashboard || state.currentWorkspace);
    const channel = getChannel(dashboardId);
    if (!channel) throw new Error("unknown channel");
    const query = {};
    if (args.coin) query.coin = args.coin;
    if (args.interval) query.interval = args.interval;
    if (args.lookbackHours) query.lookbackHours = args.lookbackHours;
    if (args.candles) query.candles = args.candles;
    if (args.startTime) query.startTime = args.startTime;
    if (args.endTime) query.endTime = args.endTime;
    if (args.respondent) query.respondent = args.respondent;
    const req = { query };
    const envelope = await getChannelLiveEnvelope(req, channel);
    const summary = summarizeChannelLive(channel, envelope);
    if (args.detail === "compact") {
      return { ok: true, liveSummary: summary, live: compactChannelLiveEnvelope(envelope) };
    }
    return { ok: true, liveSummary: summary };
  }

  if (name === "query_channel_capability") {
    const dashboardId = cleanDashboardId(args.dashboardId || fallbackDashboard || state.currentWorkspace);
    const channel = getChannel(dashboardId);
    if (!channel) throw new Error("unknown channel");
    return queryChannelCapability(channel, args);
  }

  if (name === "route_channel_turn") {
    const dashboardId = cleanDashboardId(args.dashboardId || fallbackDashboard || state.currentWorkspace);
    const channel = getChannel(dashboardId);
    if (!channel) throw new Error("unknown channel");
    const result = await runChannelTurn(channel, {
      userText: args.userText || args.text || "",
      sessionId: args.sessionId || "realtime-session",
      katContext: { voiceMode: "openai-realtime", activeChannel: dashboardId },
    });
    return {
      ok: true,
      dashboard: dashboardContextFor(dashboardId),
      channel: publicChannel(channel),
      turnId: result.turnId,
      state: result.state,
      generated: result.generated,
      events: result.events,
      narration: result.narration,
      provenance: result.provenance,
      message: "Channel turn routed.",
    };
  }

  if (name === "summarize_channel_state") {
    const dashboardId = cleanDashboardId(args.dashboardId || fallbackDashboard || state.currentWorkspace);
    const channel = getChannel(dashboardId);
    if (!channel) throw new Error("unknown channel");
    return {
      ok: true,
      channel: publicChannel(channel),
      state: getChannelSessionState(channel, args.sessionId || "realtime-session"),
    };
  }

  if (name === "clear_channel_surfaces") {
    const dashboardId = cleanDashboardId(args.dashboardId || fallbackDashboard || state.currentWorkspace);
    const channel = getChannel(dashboardId);
    if (!channel) throw new Error("unknown channel");
    const selected = Array.isArray(args.surfaces) && args.surfaces.length ? args.surfaces : ["stageOverlay", "rail", "modal"];
    const update = {
      layout: { template: "overview", rationale: "User cleared generated channel surfaces." },
      surfaces: selected.map((surface) => ({ surface, mode: "clear", components: [] })),
      narration: "Cleared the generated channel surfaces.",
    };
    const override = applyChannelUpdate(dashboardId, update, args.instruction || "clear generated channel surfaces", "kat-realtime-channel-clear");
    const sessionId = args.sessionId || "realtime-session";
    const current = getChannelSessionState(channel, sessionId);
    const cleared = {
      ...current,
      layout: update.layout,
      surfaces: {
        ...(current.surfaces || {}),
        ...Object.fromEntries(selected.map((surface) => [surface, []])),
      },
      turns: [
        ...(current.turns || []),
        { role: "assistant", text: update.narration, at: new Date().toISOString(), voice: "Kat" },
      ].slice(-24),
      nextActions: openingPathsForChannel(channel),
    };
    const saved = saveChannelSessionState(channel, sessionId, cleared, {
      channel: channel.id,
      sessionId,
      source: "kat-realtime-channel-clear",
      at: new Date().toISOString(),
    });
    return {
      ok: true,
      dashboard: dashboardContextFor(dashboardId),
      channel: publicChannel(channel),
      state: saved,
      generated: sanitizeGeneratedDashboard(override.generated),
      message: update.narration,
    };
  }

  if (name === "apply_channel_update") {
    const dashboardId = cleanDashboardId(args.dashboardId || fallbackDashboard || state.currentWorkspace);
    const channel = getChannel(dashboardId);
    if (!channel) throw new Error("unknown channel");
    const override = applyChannelUpdate(dashboardId, args.update, args.instruction, "kat-realtime-channel");
    return {
      ok: true,
      dashboard: dashboardContextFor(dashboardId),
      channel: publicChannel(channel),
      generated: sanitizeGeneratedDashboard(override.generated),
      applied: sanitizeChannelUpdate(args.update, channel),
      updatedAt: override.updatedAt,
      message: "Channel update applied.",
    };
  }

  if (name === "apply_dashboard_edit") {
    const dashboardId = cleanDashboardId(args.dashboardId || fallbackDashboard || state.currentWorkspace);
    const override = applyDashboardOverride(dashboardId, args.patch, args.instruction, "kat-realtime");
    return {
      ok: true,
      dashboard: dashboardContextFor(dashboardId),
      applied: override.patch,
      updatedAt: override.updatedAt,
      message: "Dashboard override applied.",
    };
  }

  if (name === "apply_dashboard_chart") {
    const dashboardId = cleanDashboardId(args.dashboardId || fallbackDashboard || state.currentWorkspace);
    const override = applyDashboardChart(dashboardId, args, args.instruction, "kat-realtime-chart");
    return {
      ok: true,
      dashboard: dashboardContextFor(dashboardId),
      generated: sanitizeGeneratedDashboard(override.generated),
      applied: {
        patch: override.patch || {},
        chart: chartComponentForIntent(getChannel(dashboardId), args, args.instruction),
      },
      updatedAt: override.updatedAt,
      message: "Dashboard chart applied.",
    };
  }

  if (name === "apply_dashboard_mutation") {
    const dashboardId = cleanDashboardId(args.dashboardId || fallbackDashboard || state.currentWorkspace);
    const override = applyDashboardMutation(dashboardId, args.mutation, args.instruction, "kat-realtime");
    return {
      ok: true,
      dashboard: dashboardContextFor(dashboardId),
      generated: sanitizeGeneratedDashboard(override.generated),
      applied: {
        patch: override.patch || {},
        mutation: sanitizeMutation(args.mutation),
      },
      updatedAt: override.updatedAt,
      message: "Dashboard mutation applied.",
    };
  }

  throw new Error(`unsupported tool: ${name}`);
}

app.post("/api/realtime/tool", async (req, res) => {
  try {
    const name = String(req.body?.name || "");
    const args = req.body?.arguments && typeof req.body.arguments === "object" ? req.body.arguments : {};
    const dashboard = cleanDashboardId(req.body?.dashboard || state.currentWorkspace);
    res.json(await runRealtimeTool(name, args, dashboard));
  } catch (err) {
    console.error("realtime tool failed:", err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

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

function normalizeAgentText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function activeDashboardForAgent(options = {}) {
  const candidate = cleanDashboardId(options.dashboard || options.dashboardId || state.currentWorkspace);
  if (candidate && PANELS.some((panel) => panel.id === candidate)) return candidate;
  return state.currentWorkspace || "landing";
}

function panelMatchesTranscript(panel, normalizedText) {
  const padded = ` ${normalizedText} `;
  const aliases = [panel.id, panel.id.replace(/-/g, " "), panel.label]
    .map(normalizeAgentText)
    .filter((alias) => alias && alias !== "dashboard" && alias.length >= 3);
  return aliases.some((alias) => padded.includes(` ${alias} `));
}

function findDashboardInTranscript(normalizedText) {
  const dashboardMatches = [
    ["news", /\b(news|broadcast|feed)\b/],
    ["world-monitor", /\b(world\s*monitor|geopolitical|geopolitics|world\s+map|instability)\b/],
    ["glance", /\b(glance|rss|hacker\s*news|reddit|youtube|weather)\b/],
    ["crypto-trading", /\b(crypto\s*trading|trading\s*dashboard|backtest|backtesting|binance|coinbase|kraken)\b/],
    ["polyrec", /\b(polyrec|polymarket|prediction\s*market|order\s*book|btc)\b/],
    ["dashboard123", /\b(dashboard\s*123|portfolio\s*123|p123|macro|sentiment|technicals|stocks?)\b/],
    ["dune-deck", /\b(dune|pitch\s*deck|fundraise|fundraising|slides?|deck)\b/],
  ];
  const matchedAlias = dashboardMatches.find(([, pattern]) => pattern.test(normalizedText));
  if (matchedAlias) return matchedAlias[0];
  const matchedPanel = PANELS.find((panel) => panel.id !== "landing" && panelMatchesTranscript(panel, normalizedText));
  return matchedPanel?.id || null;
}

function looksLikeActiveDashboardQuestion(normalizedText) {
  const hasDashboardReference = /\b(this|current|active|open|dashboard|panel|board|view)\b/.test(normalizedText);
  const asksAboutState = /\b(what|whats|happening|showing|seeing|reading|summarize|explain|walk\s+me\s+through|tell\s+me)\b/.test(normalizedText);
  return hasDashboardReference && asksAboutState;
}

function looksLikeDashboardMutation(normalizedText) {
  if (/\b(clear|reset|remove|hide)\b.*\b(generated|components?|cards?|panels?|overlays?|rail|stage|columns?|metrics?|widgets?)\b/.test(normalizedText)) return true;
  const changeVerb = /\b(add|create|build|generate|make|turn|convert|reframe|reshape|put|show|replace|compose|switch|change|update|give|use|try)\b/.test(normalizedText);
  const target = /\b(cards?|panels?|widgets?|component|columns?|rows?|tables?|modals?|surfaces?|inspectors?|feeds?|charts?|graphs?|plots?|visuals?|graphics?|candles?|candlestick|ohlc|odds?|book|metrics?|kpis?|prices?|price|spread|depth|volume|volatility|range|btc|eth|sol|tokens?|tickers?|markets?|timeline|brief|briefing|investor|operator|research|market|map|city|cities|rail|stage|overlay|view|dashboard|trust|risks?|signals?)\b/.test(normalizedText);
  return changeVerb && target;
}

function titleCaseWords(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 9)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function mutationTopicFromTranscript(transcript, normalizedText, dashboardId) {
  if (/\beth\b/.test(normalizedText) && /\bprice\b/.test(normalizedText)) return "ETH Price";
  if (/\b(btc|ptc)\b/.test(normalizedText) && /\bprice\b/.test(normalizedText)) return "BTC Price";
  if (/\bspread\b/.test(normalizedText) && /\bbtc\b/.test(normalizedText)) return "BTC Spread";
  if (/\bbangladesh\b/.test(normalizedText) && /\bcheck\s*in\b/.test(normalizedText)) return "Bangladesh Check-In Opportunity";
  if (/\btrust\b/.test(normalizedText) && /\brisk/.test(normalizedText)) return "Launch Risks And Trust Signals";
  if (/\bcit(y|ies)\b/.test(normalizedText)) return "City Launch Priorities";
  if (/\bmissile\b/.test(normalizedText)) return "Missile Launch";

  const cleaned = String(transcript || "")
    .replace(/[.!?]+$/g, "")
    .replace(/\b(to|on|in)\s+the\s+(right\s+)?(rail|stage|main stage|overlay|dashboard|panel|board)\b/ig, " ")
    .replace(/\bwith\s+(one|two|three|four|five|\d+).*/ig, " ")
    .replace(/\s+/g, " ")
    .trim();
  const match = cleaned.match(/\b(?:for|about|around|called|named|tracking|showing)\s+(.+)$/i);
  if (match?.[1]) return titleCaseWords(match[1]);
  const stripped = cleaned.replace(/^(add|create|build|generate|make|turn|convert|reframe|reshape|put|show|replace|compose)\b\s*(this|the|a|an)?\s*/i, "");
  const generic = stripped.replace(/\b(cards?|panels?|widgets?|component|columns?|rows?|tables?|timeline|brief|briefing|view|dashboard)\b/ig, "").trim();
  return titleCaseWords(generic) || dashboardContextFor(dashboardId).label || "Dashboard Update";
}

function mutationSlotFromText(normalizedText) {
  if (/\b(modal|dialog|detail|drilldown|inspect)\b/.test(normalizedText)) return "modal";
  if (/\b(map|main|stage|overlay|hero|over)\b/.test(normalizedText)) return "stageOverlay";
  return "rail";
}

function mutationComponentTypeFromText(normalizedText) {
  if (/\b(charts?|graphs?|plots?|visuals?|graphics?|candles?|candlestick|ohlc|volume|volatility|range)\b/.test(normalizedText)) return "vega-chart";
  if (/\btable|rows?|records?|rankings?\b/.test(normalizedText)) return "data-table";
  if (/\bfeed|stream|queue|watchlist\b/.test(normalizedText)) return "feed-stack";
  if (/\binspect|inspector|drilldown|detail|profile|entity\b/.test(normalizedText)) return "entity-inspector";
  if (/\brelationships?|network|graph|connections?\b/.test(normalizedText)) return "relationship-graph";
  if (/\btimeline|sequence|events?\b/.test(normalizedText)) return "event-timeline";
  if (/\bmap|city|cities|geo|location\b/.test(normalizedText)) return "map-brief";
  if (/\bmetrics?|kpis?|numbers?|strip|columns?|rows?|tables?\b/.test(normalizedText)) return "metric-strip";
  if (/\bscenario|options?|paths?\b/.test(normalizedText)) return "scenario-cards";
  if (/\bsources?|confidence|verification\b/.test(normalizedText)) return "source-confidence";
  if (/\baction|next|steps?|moves?\b/.test(normalizedText)) return "action-panel";
  if (/\bmarket|price|trading|investor\b/.test(normalizedText)) return "market-widget";
  return "insight-card";
}

function fallbackComponentForMutation(transcript, dashboardId) {
  const normalizedText = normalizeAgentText(transcript);
  const topic = mutationTopicFromTranscript(transcript, normalizedText, dashboardId);
  const type = mutationComponentTypeFromText(normalizedText);
  const base = {
    type,
    eyebrow: /\binvestor\b/.test(normalizedText) ? "investor lens" : "generated",
    title: topic,
    body: `Kat generated this ${topic.toLowerCase()} block from the current voice request.`,
    items: ["Clarify the signal", "Separate evidence from speculation", "Keep the next action visible"],
  };

  if (type === "map-brief") {
    return {
      ...base,
      eyebrow: "launch map",
      body: "Prioritize launch motion by city-level trust, partner access, and repeat behavior.",
      items: ["Dhaka: trust onboarding", "Chittagong: partner pilots", "Sylhet: retention loop"],
    };
  }
  if (type === "event-timeline") {
    return {
      ...base,
      rows: [["now", `${topic} added to the active watch path.`, "voice"], ["next", "Review supporting signals before escalation.", "operator"], ["later", "Promote into a persistent view if it remains useful.", "Kat"]],
    };
  }
  if (type === "metric-strip") {
    if (/\b(eth|btc|ptc|price|spread|depth|volume)\b/.test(normalizedText)) {
      const asset = /\beth\b/.test(normalizedText) ? "ETH" : /\b(sol)\b/.test(normalizedText) ? "SOL" : "BTC";
      const topicLabel = topic.toUpperCase().includes(asset) ? topic : `${asset} ${topic}`;
      return {
        ...base,
        eyebrow: "market column",
        title: topicLabel,
        body: "A generated market column added from the voice request. Values should bind to live market data when the channel provider exposes the field.",
        binding: "liveSummary.metrics",
        metrics: [
          [asset, "live", "price"],
          ["Spread", "live", "book"],
          ["Depth", "live", "liquidity"],
        ],
        items: ["Confirm provider coverage", "Promote to a native column when stable"],
      };
    }
    return {
      ...base,
      metrics: [["Signal", "new", topic], ["Confidence", "review", "voice"], ["Action", "queued", "next"]],
    };
  }
  if (type === "action-panel") {
    return {
      ...base,
      items: ["Define the audience", "Pick the highest-signal widget", "Promote repeatable blocks"],
    };
  }
  if (/\btrust\b/.test(normalizedText) || /\brisk/.test(normalizedText)) {
    return {
      ...base,
      eyebrow: "risk lens",
      body: "Track trust signals, launch friction, and weak evidence before treating the opportunity as ready.",
      items: ["Verification clarity", "Repeat behavior", "Partner credibility", "Operational downside"],
    };
  }
  return base;
}

function chartArgsFromText(normalizedText) {
  const args = {
    coin: /\beth\b/.test(normalizedText) ? "ETH" : /\bsol\b/.test(normalizedText) ? "SOL" : /\bbtc|bitcoin\b/.test(normalizedText) ? "BTC" : undefined,
    respondent: (normalizedText.match(/\b(us48|cal|erco|pjm|miso|nyis|isne|caiso)\b/) || [])[1],
  };
  if (!args.coin) {
    const oneWordCoin = normalizedText.match(/\b([a-z][a-z0-9]{2,17}coin)\b/);
    const spacedCoin = normalizedText.match(/\b([a-z][a-z0-9]{1,12})\s+coin\b/);
    const afterFor = normalizedText.match(/\b(?:for|of|on|about)\s+([a-z][a-z0-9]{1,17})\b/);
    const candidate = oneWordCoin?.[1] || (spacedCoin ? `${spacedCoin[1]}coin` : afterFor?.[1]);
    const ignored = new Set(["the", "this", "that", "price", "chart", "total", "token", "holders", "market", "meme", "moving"]);
    if (candidate && !ignored.has(candidate)) args.coin = candidate.toUpperCase();
  }
  const intervalMatch = normalizedText.match(/\b(1m|3m|5m|15m|30m|1h|2h|4h|8h|12h|1d)\b/);
  if (intervalMatch) args.interval = intervalMatch[1];
  const lastMatch = normalizedText.match(/\b(?:last|past)\s+(\d+)\s*(minute|minutes|min|hour|hours|hr|hrs|day|days|week|weeks)\b/);
  const wordNumbers = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
  const wordPeriodMatch = normalizedText.match(/\b(?:last|past)?\s*(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(minute|minutes|min|hour|hours|hr|hrs|day|days|week|weeks|month|months)\b/);
  if (lastMatch) {
    const n = Number(lastMatch[1]);
    const unit = lastMatch[2];
    if (/minute|min/.test(unit)) args.lookbackHours = Math.max(1 / 12, n / 60);
    else if (/hour|hr/.test(unit)) args.lookbackHours = n;
    else if (/day/.test(unit)) args.lookbackHours = n * 24;
    else if (/week/.test(unit)) args.lookbackHours = n * 24 * 7;
  } else if (wordPeriodMatch) {
    const n = wordNumbers[wordPeriodMatch[1]] || 1;
    const unit = wordPeriodMatch[2];
    if (/minute|min/.test(unit)) args.lookbackHours = Math.max(1 / 12, n / 60);
    else if (/hour|hr/.test(unit)) args.lookbackHours = n;
    else if (/day/.test(unit)) args.lookbackHours = n * 24;
    else if (/week/.test(unit)) args.lookbackHours = n * 24 * 7;
    else if (/month/.test(unit)) args.lookbackHours = n * 24 * 30;
  } else if (/\b24h|one day|today\b/.test(normalizedText)) {
    args.lookbackHours = 24;
  } else if (/\b7d|one week|week\b/.test(normalizedText)) {
    args.lookbackHours = 24 * 7;
  } else if (/\b30d|month\b/.test(normalizedText)) {
    args.lookbackHours = 24 * 30;
  }
  if (!args.interval && args.lookbackHours) args.interval = defaultHyperliquidIntervalForLookback(args.lookbackHours);
  if (/\b(moving\s*average|sma|average)\b/.test(normalizedText)) args.intent = "moving_average";
  else if (/\b(candles?|candlestick|ohlc)\b/.test(normalizedText)) args.intent = "candlestick";
  else if (/\b(volume|turnover|traded)\b/.test(normalizedText)) args.intent = "volume";
  else if (/\b(volatility|range|wick|high\s*low|drawdown)\b/.test(normalizedText)) args.intent = "volatility";
  return args;
}

function definedArgs(raw = {}) {
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function activeGeneratedChart(dashboardId) {
  const id = cleanDashboardId(dashboardId);
  const record = readDashboardOverrides().dashboards[id] || {};
  const generated = sanitizeGeneratedDashboard(record.generated);
  const components = [...(generated.slots.stageOverlay || []), ...(generated.slots.rail || [])];
  return components.find((component) => component.type === "vega-chart" && component.chart) || null;
}

function chartArgsFromGenerated(component) {
  const chart = component?.chart || {};
  const query = chart.query || {};
  let intent = "price_trend";
  if (chart.type === "candlestick" || chart.variant === "ohlc") intent = "candlestick";
  else if (chart.type === "volume" || chart.variant === "volume") intent = "volume";
  else if (chart.variant === "range") intent = "volatility";
  else if (chart.variant === "moving-average" || chart.y2 === "sma") intent = "moving_average";
  else if (chart.type === "market-depth") intent = "market_depth";
  return definedArgs({
    intent,
    coin: query.coin,
    interval: query.interval,
    lookbackHours: query.lookbackHours,
    candles: query.candles,
    startTime: query.startTime,
    endTime: query.endTime,
    style: chart.type,
    variant: chart.variant,
  });
}

function looksLikeGeneratedChartRefinement(normalizedText, dashboardId) {
  if (!activeGeneratedChart(dashboardId)) return false;
  return /\b(switch|change|update|make|show|give|use|try|actually|instead|last|past|btc|bitcoin|eth|sol|hours?|hrs?|days?|weeks?|months?|1m|3m|5m|15m|30m|1h|2h|4h|8h|12h|1d|candles?|candlestick|ohlc|volume|volatility|range|moving\s*average|sma|average)\b/.test(normalizedText);
}

function fallbackMutationDecision(transcript, dashboardId) {
  const normalizedText = normalizeAgentText(transcript);
  const chartRefinement = dashboardId && dashboardId !== "landing" && looksLikeGeneratedChartRefinement(normalizedText, dashboardId);
  if (!dashboardId || dashboardId === "landing" || (!chartRefinement && !looksLikeDashboardMutation(normalizedText))) return null;

  const clear = /\b(clear|reset|remove|hide)\b.*\b(generated|components?|cards?|panels?|overlays?|rail|stage)\b/.test(normalizedText);
  const chartRequest = chartRefinement || /\b(charts?|graphs?|plots?|visuals?|graphics?|candles?|candlestick|ohlc|volume|volatility|range|moving\s*average|sma|average|depth|book|odds?)\b/.test(normalizedText);
  const instruction = clampText(transcript, 500);
  let mutation;
  let speech;

  if (clear) {
    mutation = { type: "clear_generated" };
    speech = "Cleared the generated components.";
  } else if (chartRequest) {
    const channel = getChannel(dashboardId);
    const existingChart = activeGeneratedChart(dashboardId);
    const queryArgs = {
      ...chartArgsFromGenerated(existingChart),
      ...definedArgs(chartArgsFromText(normalizedText)),
    };
    const chartArgs = {
      intent: queryArgs.intent || "auto",
      slot: /\brail\b/.test(normalizedText) ? "rail" : "stageOverlay",
      title: /\b(that|it|actually|instead)\b/.test(normalizedText) && existingChart?.title
        ? existingChart.title
        : mutationTopicFromTranscript(transcript, normalizedText, dashboardId),
      ...queryArgs,
    };
    const override = applyDashboardChart(dashboardId, chartArgs, instruction, "kat-fallback-chart");
    return {
      action: "dashboard_mutation",
      workspace: null,
      dashboardId,
      dashboard: dashboardContextFor(dashboardId),
      generated: sanitizeGeneratedDashboard(override.generated),
      applied: { chart: chartComponentForIntent(channel, chartArgs, instruction), patch: override.patch || {} },
      updatedAt: override.updatedAt,
      speech: "Added a generated chart.",
      source: "fallback-chart",
    };
  } else if (/\binvestor|briefing|bangladesh|check\s*in\b/.test(normalizedText)) {
    const topic = mutationTopicFromTranscript(transcript, normalizedText, dashboardId);
    mutation = {
      type: "replace_slot",
      slot: "rail",
      patch: {
        title: topic,
        subtitle: "A fast generated briefing assembled from reusable dashboard blocks.",
      },
      components: [
        {
          type: "insight-card",
          eyebrow: "thesis",
          title: topic,
          body: "Frame the opportunity around observed behavior, trust signals, and repeat usage before writing custom product code.",
          items: ["City launch queue", "Trust signal tracker", "Repeat check-in loops"],
        },
        {
          type: "action-panel",
          title: "Next proof points",
          items: ["Map priority cities", "Add retention signals", "Create partner outreach view"],
        },
      ],
    };
    speech = `Built an investor briefing for ${topic}.`;
  } else {
    const component = fallbackComponentForMutation(transcript, dashboardId);
    mutation = {
      type: "replace_slot",
      slot: mutationSlotFromText(normalizedText),
      components: [component],
    };
    speech = "Replaced the generated dashboard component.";
  }

  const override = applyDashboardMutation(dashboardId, mutation, instruction, "kat-fallback-mutation");
  return {
    action: "dashboard_mutation",
    workspace: null,
    dashboardId,
    dashboard: dashboardContextFor(dashboardId),
    generated: sanitizeGeneratedDashboard(override.generated),
    applied: { mutation: sanitizeMutation(mutation), patch: override.patch || {} },
    updatedAt: override.updatedAt,
    speech,
    source: "fallback-mutation",
  };
}

function looksLikeClearGeneratedRequest(normalizedText) {
  return /\b(clear|reset|remove|hide)\b.*\b(generated|components?|cards?|panels?|overlays?|rail|stage|modal|surface)\b/.test(normalizedText);
}

function shouldComposeChannelUpdateWithModel(transcript, dashboardId) {
  if (!process.env.ANTHROPIC_API_KEY) return false;
  if (!dashboardId || dashboardId === "landing") return false;
  const normalizedText = normalizeAgentText(transcript);
  if (looksLikeClearGeneratedRequest(normalizedText)) return false;
  const matchedDashboard = findDashboardInTranscript(normalizedText);
  if (matchedDashboard && matchedDashboard !== dashboardId) return false;
  return looksLikeDashboardMutation(normalizedText) || looksLikeGeneratedChartRefinement(normalizedText, dashboardId);
}

function anthropicChannelUpdateToolSchema(channel) {
  const componentTypes = Object.keys(componentRegistry());
  const surfaceEnum = Object.keys(surfaceRegistry());
  const viewEnum = Object.keys(viewPresets());
  const bindingEnum = Array.from(new Set(["none", "liveSummary.metrics", "liveSummary.feed", "liveSummary.highlights", "dashboard.metrics", "dashboard.feed", ...CHART_BINDINGS]));
  const capabilityEnum = dataCapabilitiesForChannel(channel).map((capability) => capability.id);
  return {
    type: "object",
    properties: {
      speech: {
        type: "string",
        description: "One short spoken line in Kat's voice, under 18 words.",
      },
      update: {
        type: "object",
        properties: {
          layout: {
            type: "object",
            properties: {
              template: { type: "string", enum: viewEnum },
              rationale: { type: "string" },
            },
          },
          dataRequests: {
            type: "array",
            maxItems: 4,
            items: {
              type: "object",
              properties: {
                capability: { type: "string", enum: capabilityEnum },
                detail: { type: "string", enum: ["summary", "compact", "rows"] },
                params: { type: "object" },
                reason: { type: "string" },
              },
              required: ["capability"],
            },
          },
          patch: { type: "object" },
          surfaces: {
            type: "array",
            maxItems: 4,
            items: {
              type: "object",
              properties: {
                surface: { type: "string", enum: surfaceEnum },
                mode: { type: "string", enum: ["replace", "append", "clear"] },
                components: {
                  type: "array",
                  maxItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: componentTypes },
                      eyebrow: { type: "string" },
                      title: { type: "string" },
                      body: { type: "string" },
                      value: { type: "string" },
                      note: { type: "string" },
                      variant: { type: "string" },
                      binding: { type: "string", enum: bindingEnum },
                      chart: {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: CHART_TYPES },
                          binding: { type: "string", enum: CHART_BINDINGS },
                          x: { type: "string" },
                          y: { type: "string" },
                          y2: { type: "string" },
                          color: { type: "string" },
                          variant: { type: "string" },
                          query: { type: "object" },
                        },
                        required: ["type"],
                      },
                      metrics: {
                        type: "array",
                        maxItems: 6,
                        items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
                      },
                      rows: {
                        type: "array",
                        maxItems: 8,
                        items: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
                      },
                      items: { type: "array", maxItems: 8, items: { type: "string" } },
                    },
                    required: ["type"],
                  },
                },
              },
              required: ["surface", "mode", "components"],
            },
          },
          themeTokens: { type: "object" },
          narration: { type: "string" },
        },
      },
    },
    required: ["speech", "update"],
  };
}

async function composeChannelUpdateWithModel(transcript, dashboardId) {
  const channel = getChannel(dashboardId);
  if (!channel) return null;
  const context = await getKatChannelContext({ query: {} }, channel);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 900,
      system:
        "You are Kat composing a Katechon channel update. " +
        "Use the provided runtime context to select a layout, data requests, surfaces, and components. " +
        "Do not generate code. Do not invent live facts beyond liveSummary or dashboard state. " +
        "Prefer replace mode for generated surfaces. Use stageOverlay for primary charts or graphics, rail for supporting blocks, and modal for focused drilldowns. " +
        "If data is needed beyond liveSummary, include a dataRequests entry using the channel capability names.",
      tools: [
        {
          name: "compose_channel_update",
          description: "Compose one validated channel update spec for the current user request.",
          input_schema: anthropicChannelUpdateToolSchema(channel),
        },
      ],
      tool_choice: { type: "tool", name: "compose_channel_update" },
      messages: [
        {
          role: "user",
          content:
            `Active channel context:\n${JSON.stringify(context, null, 2)}\n\n` +
            `User request:\n${transcript}`,
        },
      ],
    }),
    timeout: 4500,
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`anthropic channel update ${resp.status}: ${body.slice(0, 240)}`);
  }

  const data = await resp.json();
  const toolUse = data.content?.find((block) => block.type === "tool_use" && block.name === "compose_channel_update");
  const input = toolUse?.input || null;
  if (!input) throw new Error("anthropic did not return compose_channel_update");
  const override = applyChannelUpdate(dashboardId, input.update, transcript, "kat-model-channel");
  return {
    action: "dashboard_mutation",
    workspace: null,
    dashboardId,
    dashboard: dashboardContextFor(dashboardId),
    generated: sanitizeGeneratedDashboard(override.generated),
    applied: { channelUpdate: sanitizeChannelUpdate(input.update, channel), patch: override.patch || {} },
    updatedAt: override.updatedAt,
    speech: cleanSpeech(input.speech || input.update?.narration || "Updated the channel view."),
    source: "anthropic-channel-update",
  };
}

function compactFallbackDashboardContext(dashboardId) {
  const context = katContextBootstrap(dashboardId);
  return {
    activeDashboard: dashboardId,
    channel: context.channel
      ? {
          id: context.channel.id,
          label: context.channel.label,
          category: context.channel.category,
          description: context.channel.description,
        }
      : null,
    liveSummary: context.liveSummary,
    dashboard: {
      id: context.dashboard?.id,
      label: context.dashboard?.label,
      title: context.dashboard?.title,
      subtitle: context.dashboard?.subtitle,
      metrics: context.dashboard?.metrics,
      feed: context.dashboard?.feed,
      generated: context.dashboard?.generated,
    },
  };
}

function fallbackActiveDashboardDecision(transcript, dashboardId) {
  const context = compactFallbackDashboardContext(dashboardId);
  const dashboard = context.dashboard || dashboardContextFor(dashboardId);
  const highlights = Array.isArray(context.liveSummary?.highlights) ? context.liveSummary.highlights.filter(Boolean) : [];
  const metrics = Array.isArray(context.liveSummary?.metrics) ? context.liveSummary.metrics : [];
  const metricLine = metrics
    .slice(0, 2)
    .map((row) => Array.isArray(row) ? `${row[0]} ${row[1]}` : "")
    .filter(Boolean)
    .join(", ");
  const highlight = highlights[0] || dashboard.subtitle || "the active channel state";
  const speech = `${dashboard.label || dashboard.title || titleFromId(dashboardId)} is showing ${highlight}${metricLine ? ` Key metrics: ${metricLine}.` : "."}`;
  return {
    action: "unknown",
    workspace: null,
    speech: cleanSpeech(speech),
    source: "fallback-context",
  };
}

function fallbackAgentDecision(transcript, options = {}) {
  const text = normalizeAgentText(transcript);
  const activeDashboard = activeDashboardForAgent(options);
  const wantsHome =
    /\b(home|homepage|landing|menu)\b/.test(text) ||
    /\bhome\s+page\b/.test(text) ||
    /\bmain\s+(panel|board|screen|menu|dashboard|page)\b/.test(text) ||
    /\b(back|return|close|exit)\b/.test(text);
  const wantsSpectre =
    /\b(osint|spectre|intel|intelligence)\b/.test(text) ||
    /\bdashboard\b/.test(text);
  if (wantsHome && !/\b(osint|spectre|intel|intelligence)\b/.test(text)) {
    return {
      action: "go_home",
      workspace: "landing",
      speech: "Back to the main panel.",
      source: "fallback",
    };
  }

  const matchedDashboard = findDashboardInTranscript(text);
  if (matchedDashboard) {
    const panel = PANELS.find((candidate) => candidate.id === matchedDashboard);
    return {
      action: matchedDashboard === "spectre" ? "open_spectre" : "open_dashboard",
      workspace: matchedDashboard,
      speech: `Opening ${panel?.label || matchedDashboard} now.`,
      source: "fallback",
    };
  }

  if (activeDashboard && activeDashboard !== "landing" && looksLikeActiveDashboardQuestion(text)) {
    return fallbackActiveDashboardDecision(transcript, activeDashboard);
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

async function routeWithKatAgent(transcript, options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackAgentDecision(transcript, options);

  const activeDashboard = activeDashboardForAgent(options);
  const activeContext = activeDashboard && activeDashboard !== "landing"
    ? compactFallbackDashboardContext(activeDashboard)
    : null;
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
        "If the user asks about this/current/active dashboard and an active dashboard context is provided, do not ask which dashboard; " +
        "answer from that context with action unknown and no workspace. " +
        "If the request is unclear, do not change panels. Always produce one short spoken line in Kat's voice. " +
        "Do not invent live facts outside the active context.\n\n" +
        `Available panels:\n${panelCatalog}\n\n` +
        `Active dashboard context:\n${activeContext ? JSON.stringify(activeContext, null, 2) : "landing panel / no active dashboard"}`,
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

const ELEVENLABS_VOICE_SETTINGS = {
  stability: 0.42,
  similarity_boost: 0.26,
  speed: 1.1,
};

async function synthesizeSpeech(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
  const ttsText = speechTextForTts(text);
  const cacheKey = `${ELEVENLABS_VOICE_ID}:${ELEVENLABS_MODEL_ID}:${JSON.stringify(ELEVENLABS_VOICE_SETTINGS)}:${ttsText}`;
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
      voice_settings: ELEVENLABS_VOICE_SETTINGS,
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

async function runKatAgent(transcript, options = {}) {
  const startedAt = Date.now();
  const id = `kat-${Date.now()}`;
  const activeDashboard = activeDashboardForAgent(options);
  if (activeDashboard && PANELS.some((panel) => panel.id === activeDashboard)) {
    state.currentWorkspace = activeDashboard;
  }
  let decision = null;
  if (shouldComposeChannelUpdateWithModel(transcript, activeDashboard)) {
    try {
      decision = await composeChannelUpdateWithModel(transcript, activeDashboard);
    } catch (err) {
      console.warn("kat channel update composition failed:", err.message);
    }
  }
  if (!decision) decision = fallbackMutationDecision(transcript, activeDashboard);
  try {
    if (!decision) decision = await routeWithKatAgent(transcript, { ...options, dashboard: activeDashboard });
  } catch (err) {
    console.warn("kat agent routing failed:", err.message);
    decision = fallbackAgentDecision(transcript, { ...options, dashboard: activeDashboard });
  }

  const workspace = decision.workspace || workspaceForAction(decision.action);
  if (workspace) state.currentWorkspace = workspace;

  const routeMs = Date.now() - startedAt;
  const commandStartedAt = Date.now();
  const commandRemotePromise =
    (decision.action === "unknown" && !workspace) || decision.action === "dashboard_mutation"
      ? Promise.resolve({ ok: true, skipped: "no desktop command", elapsedMs: 0 })
      : dispatchRemoteCommand({
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
    dashboardId: decision.dashboardId,
    dashboard: decision.dashboard,
    generated: decision.generated,
    applied: decision.applied,
    updatedAt: decision.updatedAt,
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

    res.json(await runKatAgent(transcript, { dashboard: req.body?.dashboard || req.body?.workspace }));
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
    res.json(await runKatAgent(transcript, { dashboard: req.body?.dashboard || req.body?.workspace }));
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
    console.log(`user ${action}: ${email}`);
    res.json({
      ok: true,
      action,
      welcome: null,
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
  console.log(`OpenAI realtime: ${OPENAI_REALTIME_MODEL}, voice=${OPENAI_REALTIME_VOICE}`);
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
