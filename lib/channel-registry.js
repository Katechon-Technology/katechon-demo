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
      'POST https://api.hyperliquid.xyz/info {"type":"candleSnapshot","req":{"coin":"BTC","interval":"15m","startTime":...,"endTime":...}}',
      "current compatibility route: /api/channels/crypto-trading/live?coin=BTC&interval=15m&lookbackHours=24",
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
  "eia-grid": {
    id: "eia-grid",
    label: "U.S. EIA Hourly Electric Grid Monitor",
    auth: "free EIA API key via EIA Open Data; synthetic fallback when EIA_API_KEY is absent",
    realtime: "REST polling with short server TTL against EIA hourly balancing-authority data",
    docsUrl: "https://www.eia.gov/opendata/index.php/browser/electricity/electric-power-operational-data",
    routes: [
      "GET https://api.eia.gov/v2/electricity/rto/region-data/data/?frequency=hourly&data[0]=value&facets[respondent][]=US48",
      "GET https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/?frequency=hourly&data[0]=value&facets[respondent][]=US48",
      "current compatibility route: /api/live/eia-grid?respondent=US48",
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

const COMPONENT_REGISTRY = {
  "metric-strip": {
    label: "Metric Strip",
    slots: ["rail", "stageOverlay"],
    props: ["title", "metrics", "binding", "note"],
    bindings: ["liveSummary.metrics", "dashboard.metrics"],
    use: "Compact KPI summary for the active channel.",
  },
  "insight-card": {
    label: "Insight Card",
    slots: ["rail", "stageOverlay"],
    props: ["eyebrow", "title", "body", "items", "binding", "note"],
    bindings: ["liveSummary.highlights", "dashboard.feed"],
    use: "A short generated explanation, thesis, or user-specific framing card.",
  },
  "event-timeline": {
    label: "Event Timeline",
    slots: ["rail"],
    props: ["title", "rows", "binding", "note"],
    bindings: ["liveSummary.feed", "dashboard.feed"],
    use: "Time-ordered source, event, or task rows.",
  },
  "source-confidence": {
    label: "Source Confidence",
    slots: ["rail", "stageOverlay"],
    props: ["title", "rows", "binding", "note"],
    bindings: ["liveSummary.feed", "none"],
    use: "Confidence/source-quality breakdown without claiming facts not in context.",
  },
  "scenario-cards": {
    label: "Scenario Cards",
    slots: ["rail", "stageOverlay"],
    props: ["title", "items", "note"],
    bindings: ["none"],
    use: "Small generated scenario/options cards.",
  },
  "map-brief": {
    label: "Map Brief",
    slots: ["stageOverlay"],
    props: ["eyebrow", "title", "items", "binding", "note"],
    bindings: ["liveSummary.highlights", "none"],
    use: "Overlay callouts for map, region, network, or spatial dashboards.",
  },
  "market-widget": {
    label: "Market Widget",
    slots: ["rail", "stageOverlay"],
    props: ["title", "metrics", "rows", "binding", "note"],
    bindings: ["liveSummary.metrics", "liveSummary.feed", "none"],
    use: "Market-specific compact widget for prices, spreads, token movement, or prediction markets.",
  },
  "vega-chart": {
    label: "Vega Chart",
    slots: ["rail", "stageOverlay"],
    props: ["title", "chart", "binding", "variant", "note"],
    bindings: [
      "liveData.candles",
      "liveData.series",
      "liveData.markets",
      "liveData.tokens",
      "liveData.book",
      "liveData.fuelMix",
      "liveData.corridors",
      "liveSummary.metrics",
      "liveSummary.feed",
      "dashboard.metrics",
      "dashboard.feed",
      "none",
    ],
    use: "A safe generated Vega visualization rendered from normalized channel data and animated with the dashboard shell.",
  },
  "action-panel": {
    label: "Action Panel",
    slots: ["rail"],
    props: ["title", "items", "note"],
    bindings: ["none"],
    use: "Viewer-facing next questions, watchlist items, or operator workflow steps.",
  },
};

const CHART_TYPES = [
  "line",
  "area",
  "bar",
  "horizontal-bar",
  "scatter",
  "market-depth",
  "candlestick",
  "volume",
];

const CHART_BINDINGS = [
  "liveData.candles",
  "liveData.series",
  "liveData.markets",
  "liveData.tokens",
  "liveData.book",
  "liveData.fuelMix",
  "liveData.corridors",
  "liveSummary.metrics",
  "liveSummary.feed",
  "dashboard.metrics",
  "dashboard.feed",
  "none",
];

const VIEW_PRESETS = {
  "default": {
    label: "Default",
    description: "Keep the channel's existing scene and add generated components only where requested.",
  },
  "briefing": {
    label: "Briefing",
    description: "Tight executive brief: metric strip, source/event timeline, and one concise insight card.",
  },
  "investor": {
    label: "Investor",
    description: "Market-facing story: opportunity, scale, confidence, and next decision cards.",
  },
  "operator": {
    label: "Operator",
    description: "Actionable control-room readout: current signals, risks, and workflow steps.",
  },
  "research": {
    label: "Research",
    description: "Evidence-first layout for papers, sources, assumptions, and uncertainty.",
  },
  "market": {
    label: "Market",
    description: "Trading/market structure layout with read-only metrics and visible source state.",
  },
};

const CATEGORY_GENERATION_HINTS = {
  osint: {
    audience: "analysts and operators",
    preferredViews: ["operator", "briefing"],
    preferredComponents: ["event-timeline", "source-confidence", "map-brief", "metric-strip"],
  },
  news: {
    audience: "editors and intelligence readers",
    preferredViews: ["briefing", "operator"],
    preferredComponents: ["event-timeline", "source-confidence", "insight-card", "action-panel"],
  },
  markets: {
    audience: "investors and market operators",
    preferredViews: ["market", "investor", "briefing"],
    preferredComponents: ["market-widget", "metric-strip", "event-timeline", "insight-card"],
  },
  "geo-intel": {
    audience: "regional analysts and strategic operators",
    preferredViews: ["operator", "briefing", "investor"],
    preferredComponents: ["map-brief", "source-confidence", "event-timeline", "metric-strip"],
  },
  "prediction-markets": {
    audience: "prediction market analysts",
    preferredViews: ["market", "briefing"],
    preferredComponents: ["market-widget", "event-timeline", "metric-strip", "insight-card"],
  },
  "social-markets": {
    audience: "social market analysts",
    preferredViews: ["market", "briefing"],
    preferredComponents: ["market-widget", "metric-strip", "event-timeline", "scenario-cards"],
  },
  research: {
    audience: "research analysts",
    preferredViews: ["research", "briefing"],
    preferredComponents: ["insight-card", "source-confidence", "event-timeline", "scenario-cards"],
  },
  infrastructure: {
    audience: "infrastructure operators",
    preferredViews: ["operator", "briefing"],
    preferredComponents: ["metric-strip", "event-timeline", "source-confidence", "action-panel"],
  },
};

const CHANNEL_API_IDEAS = {
  spectre: [
    { id: "gdelt", use: "global news/event discovery", fit: "event clusters, source overlap, and regional pressure" },
    { id: "acled", use: "conflict and protest event data", fit: "operator maps and escalation timelines" },
    { id: "openstreetmap", use: "base geospatial context", fit: "infrastructure and location overlays" },
  ],
  news: [
    { id: "rss", use: "publisher-native feeds", fit: "low-friction source cards and editorial queues" },
    { id: "gdelt", use: "global news indexing", fit: "cross-source story clustering" },
    { id: "mediastack-or-newsapi", use: "commercial news search", fit: "broad fallback source discovery" },
  ],
  dashboard123: [
    { id: "hyperliquid", use: "open crypto market microstructure", fit: "reference prices, depth, and candles" },
    { id: "finnhub-or-polygon", use: "equities and macro market data", fit: "indices, movers, factors, and portfolio context" },
    { id: "fred", use: "macro time series", fit: "rates, inflation, liquidity, and cross-asset pressure" },
  ],
  "world-monitor": [
    { id: "gdelt", use: "world news and event signals", fit: "risk maps and regional source density" },
    { id: "acled", use: "conflict/protest events", fit: "instability timelines" },
    { id: "eia-and-fred", use: "energy and macro data", fit: "market pressure linked to geopolitics" },
  ],
  arena: [
    { id: "openai-evals", use: "evaluation datasets and scoring harnesses", fit: "task rounds, judge outputs, and latency charts" },
    { id: "openrouter-or-litellm", use: "multi-model routing", fit: "side-by-side agent match data" },
    { id: "github-actions", use: "benchmark run logs", fit: "repeatable model competitions" },
  ],
  glance: [
    { id: "rss", use: "personal and publisher feeds", fit: "source wall and unread triage" },
    { id: "hackernews-algolia", use: "HN stories and search", fit: "developer/community trend cards" },
    { id: "open-meteo-or-nws", use: "weather data", fit: "daily ops context without auth friction" },
  ],
  "crypto-trading": [
    { id: "hyperliquid", use: "mids, L2 depth, and candles", fit: "read-only market cockpit" },
    { id: "coingecko", use: "asset metadata and market caps", fit: "cross-token context" },
    { id: "defillama", use: "protocol and stablecoin metrics", fit: "liquidity and sector pressure" },
  ],
  polyrec: [
    { id: "polymarket-gamma", use: "market discovery", fit: "active questions, categories, and volumes" },
    { id: "polymarket-clob", use: "order books and trades", fit: "spread, depth, and market-clock charts" },
    { id: "chainlink-or-reference-price", use: "oracle/reference state", fit: "settlement and basis context" },
  ],
  biotech: [
    { id: "clinicaltrials", use: "trial registry data", fit: "pipeline timelines and status changes" },
    { id: "pubmed-or-europepmc", use: "papers and biomedical literature", fit: "evidence cards and source confidence" },
    { id: "uniprot-or-alphafold", use: "protein and structure metadata", fit: "target and structure panels" },
  ],
  space: [
    { id: "nasa-exoplanet-archive", use: "exoplanet catalog data", fit: "transit and candidate charts" },
    { id: "mast", use: "TESS/Hubble/Webb archive metadata", fit: "survey and observation queues" },
    { id: "jpl-horizons", use: "ephemerides", fit: "object-position and orbital-window context" },
  ],
  iran: [
    { id: "gdelt", use: "regional news/event signals", fit: "measured pressure and source-density panels" },
    { id: "eia", use: "energy market context", fit: "oil, route, and infrastructure sensitivity" },
    { id: "openstreetmap", use: "infrastructure geography", fit: "node and corridor maps" },
  ],
  "meme-coin": [
    { id: "coingecko-pumpfun", use: "indexed Pump.fun-style token data", fit: "token velocity and market-cap charts" },
    { id: "dexscreener", use: "DEX pairs and liquidity", fit: "liquidity decay and holder-risk panels" },
    { id: "social-search", use: "public social trend signals", fit: "narrative velocity without trading actions" },
  ],
  quantum: [
    { id: "arxiv", use: "research preprints", fit: "paper velocity and topic timelines" },
    { id: "openalex", use: "research graph metadata", fit: "institution/source confidence" },
    { id: "benchmark-feeds", use: "curated benchmark results", fit: "coherence, fidelity, and error-correction charts" },
  ],
  "deep-sea": [
    { id: "noaa-ndbc", use: "buoy and marine observations", fit: "sensor timelines" },
    { id: "noaa-tides-currents", use: "water level and current data", fit: "pressure/current context" },
    { id: "erddap", use: "oceanographic datasets", fit: "temperature and anomaly charts" },
  ],
  "power-grid": [
    { id: "eia-grid", use: "hourly grid operating data", fit: "load, forecast, generation, interchange, and fuel mix" },
    { id: "nrel", use: "renewables and grid datasets", fit: "resource and reserve context" },
    { id: "noaa-weather", use: "weather stressors", fit: "load and outage-risk context" },
  ],
  viral: [
    { id: "cdc", use: "public health surveillance", fit: "case/signal trends and lag charts" },
    { id: "who", use: "global disease reports", fit: "country-level dashboards" },
    { id: "mobility-or-open-data", use: "contact proxy data", fit: "scenario and network assumptions" },
  ],
  "dark-forest": [
    { id: "mast", use: "survey archive metadata", fit: "dimming and observation queues" },
    { id: "nasa-exoplanet-archive", use: "stellar and transit candidates", fit: "catalog deviation charts" },
    { id: "simbad-or-vizier", use: "astronomical catalog lookup", fit: "cross-catalog anomaly checks" },
  ],
  "dune-deck": [
    { id: "local-deck-json", use: "slide and narration state", fit: "pitch progress and section emphasis" },
    { id: "product-analytics", use: "viewer/channel engagement", fit: "fundraise proof and channel discovery charts" },
  ],
};

function apiIdeasForChannel(channel) {
  return CHANNEL_API_IDEAS[channel.id] || [];
}

function chartBindingsForChannel(channel) {
  if (channel.liveProvider === "hyperliquid") return ["liveData.candles", "liveData.book", "liveSummary.metrics", "dashboard.metrics"];
  if (channel.liveProvider === "polymarket") return ["liveData.markets", "liveSummary.metrics", "liveSummary.feed"];
  if (channel.liveProvider === "pumpfun") return ["liveData.tokens", "liveSummary.metrics", "liveSummary.feed"];
  if (channel.liveProvider === "eia-grid") return ["liveData.series", "liveData.fuelMix", "liveData.corridors", "liveSummary.metrics"];
  return ["liveSummary.metrics", "liveSummary.feed", "dashboard.metrics", "dashboard.feed"];
}

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
    liveProvider: "eia-grid",
    providers: ["eia-grid", "channel-synthetic"],
    contract: "power-grid-operational-v1",
    status: "live-with-fallback",
    defaultQuery: { respondent: "US48" },
    summary: "Power Grid uses EIA hourly electric-system operating data for load, forecast, net generation, interchange, and fuel mix, with visible synthetic fallback.",
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

function componentRegistry() {
  return COMPONENT_REGISTRY;
}

function viewPresets() {
  return VIEW_PRESETS;
}

function channelGenerationSpec(channel) {
  const hints = CATEGORY_GENERATION_HINTS[channel.category] || {
    audience: "dashboard viewers",
    preferredViews: ["briefing", "operator"],
    preferredComponents: ["metric-strip", "insight-card", "event-timeline", "action-panel"],
  };
  const componentIds = Array.from(new Set([...hints.preferredComponents, "vega-chart", "metric-strip", "insight-card", "event-timeline"]));
  return {
    purpose: channel.summary || `${channel.label} is a generated channel surface backed by ${channel.contract}.`,
    audience: hints.audience,
    availableViews: Array.from(new Set(["default", ...hints.preferredViews])).map((id) => ({
      id,
      ...VIEW_PRESETS[id],
    })).filter((view) => view.label),
    availableComponents: componentIds.map((id) => ({
      id,
      ...COMPONENT_REGISTRY[id],
    })).filter((component) => component.label),
    editableSlots: ["rail", "stageOverlay"],
    visualization: {
      runtime: "Vega rendered in the dashboard iframe, with Anime.js used for entrance/update motion.",
      chartTypes: CHART_TYPES,
      bindings: chartBindingsForChannel(channel),
      guidance: [
        "Use vega-chart for generated graphs.",
        "Prefer liveData bindings after calling get_channel_live with compact detail.",
        "Use liveSummary bindings for spoken answers and small charts.",
        "Use stageOverlay for primary charts so they replace the generated stage surface over the dashboard graphic.",
        "For crypto history, pass query.coin, query.interval, query.lookbackHours, query.startTime, or query.endTime instead of changing provider APIs.",
      ],
    },
    allowedMutations: [
      "set_view",
      "set_copy",
      "replace_slot",
      "add_component",
      "set_theme_tokens",
      "clear_generated",
    ],
    forbiddenMutations: [
      "arbitrary_js",
      "browser_provider_fetches",
      "wallet_actions",
      "trading_actions",
      "paid_or_login_only_flows",
      "unverified_live_claims",
    ],
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
    generation: channelGenerationSpec(channel),
    apiIdeas: apiIdeasForChannel(channel),
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
  CHART_BINDINGS,
  CHART_TYPES,
  channelGenerationSpec,
  channelDocs,
  componentRegistry,
  getChannel,
  apiIdeasForChannel,
  listChannels,
  providerById,
  publicChannel,
  syntheticChannelData,
  viewPresets,
};
