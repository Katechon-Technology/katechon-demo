const { DASHBOARD_SHARE_CATALOG, normalizeDashboardId } = require("../dashboard-share");

const PROVIDERS = {
  hyperliquid: {
    id: "hyperliquid",
    label: "Hyperliquid",
    auth: "none for public info endpoints",
    realtime: "REST polling with short server TTL; websocket can be added later",
    docsUrl: "https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint",
    routes: [
      'POST https://api.hyperliquid.xyz/info {"type":"allMids"}',
      'POST https://api.hyperliquid.xyz/info {"type":"l2Book","coin":"BTC"}',
      'POST https://api.hyperliquid.xyz/info {"type":"candleSnapshot","req":{...}}',
    ],
  },
  polymarket: {
    id: "polymarket",
    label: "Polymarket",
    auth: "none for Gamma/Data discovery; trading endpoints require auth and are out of scope",
    realtime: "REST polling with short server TTL",
    docsUrl: "https://docs.polymarket.com/api-reference",
    routes: [
      "GET https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=8",
      "future: public CLOB orderbook, midpoints, spreads, and price history",
    ],
  },
  pumpfun: {
    id: "pumpfun",
    label: "Pump.fun indexed market data",
    auth: "current v1 uses open indexed market data; no wallet or trading flow",
    realtime: "REST polling with short server TTL",
    docsUrl: "https://www.coingecko.com/en/api/launchpads/pump-fun",
    routes: [
      "GET CoinGecko/GeckoTerminal indexed Pump.fun token and pool data",
      "current compatibility route: /api/live/pumpfun",
    ],
  },
  "channel-synthetic": {
    id: "channel-synthetic",
    label: "Katechon synthetic channel state",
    auth: "none",
    realtime: "server-generated polling fallback",
    docsUrl: "/docs/channel-apis.md",
    routes: ["GET /api/channels/:channel/live"],
  },
  spectre: {
    id: "spectre",
    label: "SPECTRE local OSINT dashboard",
    auth: "none for local dashboard proxy",
    realtime: "local app/proxy first; normalized OSINT event adapters later",
    docsUrl: "local:../katechon-app/applications/SPECTRE",
    routes: ["GET /dashboards/spectre/*", "GET /api/channels/spectre/live"],
  },
};

const DEFAULT_CHANNEL = {
  category: "synthetic",
  liveProvider: "channel-synthetic",
  providers: ["channel-synthetic"],
  contract: "channel-state-v1",
  status: "synthetic-active",
};

const CHANNEL_OVERRIDES = {
  spectre: {
    category: "osint",
    liveProvider: "channel-synthetic",
    providers: ["spectre", "channel-synthetic"],
    contract: "osint-events-v1",
    status: "proxy-plus-synthetic",
    summary: "OSINT event room with a local SPECTRE surface and normalized event-state fallback for Kat.",
  },
  news: {
    category: "news",
    contract: "source-feed-v1",
    summary: "Source-fusion news room; v1 returns active source queue state until provider adapters are added.",
  },
  dashboard123: {
    category: "markets",
    liveProvider: "hyperliquid",
    providers: ["hyperliquid"],
    contract: "market-depth-v1",
    status: "live",
    defaultQuery: { coin: "BTC" },
    summary: "Market Pulse uses Hyperliquid as the open market-data spine for price, depth, and candles.",
  },
  "world-monitor": {
    category: "geo-intel",
    contract: "risk-feed-v1",
    summary: "Geopolitical risk monitor; v1 returns active risk-state fallback pending open provider adapters.",
  },
  arena: {
    category: "ai-eval",
    contract: "agent-match-v1",
    summary: "AI Arena exposes active match-state fallback pending model-run provider adapters.",
  },
  glance: {
    category: "source-wall",
    contract: "source-feed-v1",
    summary: "Glance exposes active source-wall state; RSS/weather/feed adapters can attach behind the same route.",
  },
  "crypto-trading": {
    category: "markets",
    liveProvider: "hyperliquid",
    providers: ["hyperliquid"],
    contract: "market-depth-v1",
    status: "live",
    defaultQuery: { coin: "BTC" },
    summary: "Crypto Trading uses Hyperliquid read-only market data for mids, L2 depth, and candles.",
  },
  polyrec: {
    category: "prediction-markets",
    liveProvider: "polymarket",
    providers: ["polymarket"],
    contract: "prediction-markets-v1",
    status: "live",
    summary: "Polyrec uses Polymarket public market discovery data now, with public CLOB data planned next.",
  },
  biotech: {
    category: "research",
    contract: "research-feed-v1",
    summary: "Biotech exposes active research-signal fallback pending open paper/trial/provider adapters.",
  },
  space: {
    category: "space",
    contract: "observatory-feed-v1",
    summary: "Deep Space exposes active observatory-state fallback pending open astronomy feeds.",
  },
  iran: {
    category: "geo-intel",
    contract: "risk-feed-v1",
    summary: "Iran Signal exposes active regional-risk fallback pending OSINT/geospatial adapters.",
  },
  "meme-coin": {
    category: "social-markets",
    liveProvider: "pumpfun",
    providers: ["pumpfun"],
    contract: "token-velocity-v1",
    status: "live",
    summary: "Meme Coin uses open indexed Pump.fun-style token data for prices, changes, and market caps.",
  },
  quantum: {
    category: "science",
    contract: "science-feed-v1",
    summary: "Quantum exposes active science-signal fallback pending open benchmark and research feeds.",
  },
  "deep-sea": {
    category: "sensors",
    contract: "sensor-feed-v1",
    summary: "Abyssal Monitor exposes active sensor-state fallback pending open ocean data adapters.",
  },
  "power-grid": {
    category: "infrastructure",
    contract: "infrastructure-feed-v1",
    summary: "Power Grid exposes active infrastructure-state fallback pending public grid data adapters.",
  },
  viral: {
    category: "epidemiology",
    contract: "model-feed-v1",
    summary: "Viral Spread exposes active model-state fallback pending open health/statistical feeds.",
  },
  "dark-forest": {
    category: "astronomy",
    contract: "observatory-feed-v1",
    summary: "Dark Forest exposes active anomaly-watch fallback pending open astronomy catalog adapters.",
  },
  "dune-deck": {
    category: "deck",
    contract: "deck-state-v1",
    summary: "Investor deck channel; v1 exposes lightweight deck state for Kat but no external provider.",
  },
};

function providerById(id) {
  return PROVIDERS[id] || null;
}

function channelIds() {
  return Object.keys(DASHBOARD_SHARE_CATALOG);
}

function getChannel(value) {
  const id = normalizeDashboardId(value);
  if (!id || !DASHBOARD_SHARE_CATALOG[id]) return null;
  const catalog = DASHBOARD_SHARE_CATALOG[id];
  const override = CHANNEL_OVERRIDES[id] || {};
  const channel = {
    id,
    label: catalog.label,
    description: catalog.description,
    ...DEFAULT_CHANNEL,
    ...override,
  };

  channel.providers = Array.from(new Set(channel.providers || [channel.liveProvider]));
  channel.docsPath = `/api/channels/${encodeURIComponent(id)}/docs`;
  channel.livePath = `/api/channels/${encodeURIComponent(id)}/live`;
  channel.contextPath = `/api/channels/${encodeURIComponent(id)}/context`;
  return channel;
}

function listChannels() {
  return channelIds().map(getChannel).filter(Boolean);
}

function publicChannel(channel) {
  return {
    id: channel.id,
    label: channel.label,
    description: channel.description,
    category: channel.category,
    status: channel.status,
    providers: channel.providers,
    liveProvider: channel.liveProvider,
    contract: channel.contract,
    livePath: channel.livePath,
    contextPath: channel.contextPath,
    docsPath: channel.docsPath,
  };
}

function channelDocs(channel) {
  const providers = channel.providers.map(providerById).filter(Boolean);
  return {
    id: channel.id,
    label: channel.label,
    summary: channel.summary || `${channel.label} exposes normalized channel data for Kat and the dashboard runtime.`,
    status: channel.status,
    category: channel.category,
    contract: channel.contract,
    routes: {
      metadata: `/api/channels/${channel.id}`,
      live: channel.livePath,
      context: channel.contextPath,
      docs: channel.docsPath,
    },
    responseEnvelope: {
      ok: true,
      channel: channel.id,
      providers: channel.providers,
      source: channel.liveProvider,
      stale: false,
      updatedAt: "epoch milliseconds",
      data: "provider-specific normalized payload",
      fallbackReason: null,
      docs: channel.docsPath,
    },
    katContract: [
      "Read live state from the channel live route instead of provider APIs directly.",
      "Generate channel-scoped renderers/components only.",
      "Treat stale=true or fallbackReason as visible UI state.",
      "Do not add wallet, trading, paid, KYC, or login-only flows in v1.",
    ],
    providers,
  };
}

function syntheticChannelData(channel) {
  const now = Date.now();
  const phase = Math.floor(now / 10000);
  const seed = liveSeed(`${channel.id}:${phase}`);
  const signal = 42 + (seed % 48);
  const velocity = ((seed % 170) - 55) / 10;
  const confidence = 55 + (liveSeed(`${channel.id}:confidence:${phase}`) % 38);
  const nouns = wordsForCategory(channel.category);

  return {
    kind: channel.contract,
    mode: "synthetic-active",
    metrics: [
      [nouns.primary, String(signal), "active"],
      [nouns.secondary, `${velocity >= 0 ? "+" : ""}${velocity.toFixed(1)}`, "delta"],
      ["Confidence", `${confidence}%`, "fallback"],
    ],
    feed: [
      ["now", `${channel.label} refreshed ${nouns.feedPrimary} state for Kat.`, channel.category],
      ["02m", `${nouns.feedSecondary} queue reprioritized around the highest-signal panel.`, channel.contract],
      ["05m", `Renderer contract stayed stable while live adapters remain swappable.`, "kat-ready"],
      ["09m", `Fallback data marked visible so generated components can explain uncertainty.`, "source hygiene"],
      ["13m", `${channel.label} kept polling cadence aligned with the shared channel API.`, "polling"],
    ],
    updatedAt: now,
  };
}

function wordsForCategory(category) {
  const byCategory = {
    osint: { primary: "Events", secondary: "Pressure", feedPrimary: "event", feedSecondary: "Source" },
    news: { primary: "Sources", secondary: "Priority", feedPrimary: "source", feedSecondary: "Editorial" },
    markets: { primary: "Signals", secondary: "Breadth", feedPrimary: "market", feedSecondary: "Signal" },
    "geo-intel": { primary: "Risk", secondary: "Pressure", feedPrimary: "regional", feedSecondary: "Risk" },
    "ai-eval": { primary: "Rounds", secondary: "Score", feedPrimary: "match", feedSecondary: "Judge" },
    "source-wall": { primary: "Sources", secondary: "Unread", feedPrimary: "source", feedSecondary: "Feed" },
    "prediction-markets": { primary: "Markets", secondary: "Spread", feedPrimary: "market", feedSecondary: "Outcome" },
    research: { primary: "Targets", secondary: "Evidence", feedPrimary: "research", feedSecondary: "Evidence" },
    space: { primary: "Signals", secondary: "Drift", feedPrimary: "observatory", feedSecondary: "Survey" },
    "social-markets": { primary: "Tokens", secondary: "Velocity", feedPrimary: "token", feedSecondary: "Social" },
    science: { primary: "States", secondary: "Fidelity", feedPrimary: "science", feedSecondary: "Benchmark" },
    sensors: { primary: "Sensors", secondary: "Anomaly", feedPrimary: "sensor", feedSecondary: "Telemetry" },
    infrastructure: { primary: "Nodes", secondary: "Load", feedPrimary: "grid", feedSecondary: "Infrastructure" },
    epidemiology: { primary: "Scenarios", secondary: "R0", feedPrimary: "model", feedSecondary: "Scenario" },
    astronomy: { primary: "Stars", secondary: "Sigma", feedPrimary: "catalog", feedSecondary: "Anomaly" },
    deck: { primary: "Slides", secondary: "Focus", feedPrimary: "deck", feedSecondary: "Narrative" },
  };
  return byCategory[category] || { primary: "Signals", secondary: "Delta", feedPrimary: "channel", feedSecondary: "Signal" };
}

function liveSeed(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

module.exports = {
  PROVIDERS,
  channelDocs,
  getChannel,
  listChannels,
  providerById,
  publicChannel,
  syntheticChannelData,
};
