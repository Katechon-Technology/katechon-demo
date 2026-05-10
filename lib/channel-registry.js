const { DASHBOARD_SHARE_CATALOG, normalizeDashboardId } = require("../dashboard-share");

const PROVIDERS = {
  hyperliquid: {
    id: "hyperliquid",
    label: "Hyperliquid",
    auth: "none",
    realtime: "REST polling with stale-while-revalidate cache; websocket can be added later",
    docsUrl: "https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint",
    capabilities: ["snapshot", "timeseries", "rankings", "entity_detail", "historical_state"],
    routes: [
      'POST https://api.hyperliquid.xyz/info {"type":"allMids"}',
      'POST https://api.hyperliquid.xyz/info {"type":"l2Book","coin":"BTC"}',
      'POST https://api.hyperliquid.xyz/info {"type":"candleSnapshot","req":{"coin":"BTC","interval":"15m","startTime":...,"endTime":...}}',
      "current compatibility route: /api/channels/crypto-trading/live?coin=BTC&interval=15m&lookbackHours=24",
    ],
  },
  polymarket: {
    id: "polymarket",
    label: "Polymarket Gamma",
    auth: "none",
    realtime: "REST polling with stale-while-revalidate cache",
    docsUrl: "https://docs.polymarket.com/api-reference",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "search"],
    routes: [
      "GET https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=8",
      "future: public CLOB orderbook, midpoints, spreads, and price history",
    ],
  },
  "ai-sota": {
    id: "ai-sota",
    label: "AI SOTA Snapshot",
    auth: "none",
    realtime: "merged REST polling with stale-while-revalidate cache across LMArena and Polymarket AI market discovery",
    docsUrl: "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "relationships", "search"],
    routes: [
      "GET https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config={arena}&split=latest",
      "GET https://gamma-api.polymarket.com/public-search?q={ai-model-query}&limit_per_type=12&events_status=active",
      "current compatibility route: /api/channels/arena/live",
    ],
  },
  lmarena: {
    id: "lmarena",
    label: "LMArena Leaderboard Dataset",
    auth: "none",
    realtime: "latest leaderboard snapshots through the Hugging Face Dataset Viewer rows API",
    docsUrl: "https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset",
    capabilities: ["snapshot", "rankings", "entity_detail", "historical_state"],
    routes: [
      "GET https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config=text_style_control&split=latest",
      "GET https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config=webdev&split=latest",
    ],
  },
  "polymarket-ai": {
    id: "polymarket-ai",
    label: "Polymarket AI Markets",
    auth: "none",
    realtime: "public Gamma markets polling for model-release, AI benchmark, and lab expectation markets",
    docsUrl: "https://docs.polymarket.com/api-reference",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "search"],
    routes: [
      "GET https://gamma-api.polymarket.com/public-search?q=OpenAI&limit_per_type=12&events_status=active",
      "GET https://gamma-api.polymarket.com/public-search?q=Anthropic+Claude&limit_per_type=12&events_status=active",
      "future: public CLOB orderbook, midpoints, spreads, and price history",
    ],
  },
  dexscreener: {
    id: "dexscreener",
    label: "DEX Screener",
    auth: "none",
    realtime: "REST polling with stale-while-revalidate cache",
    docsUrl: "https://docs.dexscreener.com/api/reference",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "search"],
    routes: [
      "GET https://api.dexscreener.com/token-profiles/latest/v1",
      "GET https://api.dexscreener.com/token-boosts/top/v1",
      "GET https://api.dexscreener.com/tokens/v1/{chainId}/{tokenAddresses}",
      "current compatibility route: /api/live/pumpfun",
    ],
  },
  "coingecko-pumpfun": {
    id: "coingecko-pumpfun",
    label: "CoinGecko Pump.fun category",
    auth: "none",
    realtime: "secondary REST polling cache",
    docsUrl: "https://www.coingecko.com/en/api/launchpads/pump-fun",
    capabilities: ["snapshot", "rankings", "entity_detail"],
    routes: [
      "GET CoinGecko/GeckoTerminal indexed Pump.fun token and pool data",
      "current compatibility route: /api/live/pumpfun",
    ],
  },
  pumpportal: {
    id: "pumpportal",
    label: "PumpPortal real-time stream",
    auth: "none",
    realtime: "long-lived websocket (subscribeNewToken / subscribeTokenTrade / subscribeMigration)",
    docsUrl: "https://pumpportal.fun/data-api/real-time/",
    capabilities: ["snapshot", "events", "rankings", "entity_detail"],
    routes: [
      "WSS wss://pumpportal.fun/api/data",
      "current compatibility route: /api/live/pumpportal",
      "current compatibility route: /api/channels/meme-coin/live",
    ],
  },
  "eia-grid": {
    id: "eia-grid",
    label: "U.S. EIA Hourly Electric Grid Monitor",
    auth: "free_key_required",
    realtime: "REST polling with stale-while-revalidate cache against EIA hourly balancing-authority data",
    docsUrl: "https://www.eia.gov/opendata/index.php/browser/electricity/electric-power-operational-data",
    capabilities: ["snapshot", "timeseries", "events", "rankings", "entity_detail", "historical_state"],
    routes: [
      "GET https://api.eia.gov/v2/electricity/rto/region-data/data/?frequency=hourly&data[0]=value&facets[respondent][]=US48",
      "GET https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/?frequency=hourly&data[0]=value&facets[respondent][]=US48",
      "current compatibility route: /api/live/eia-grid?respondent=US48",
    ],
  },
  rss: {
    id: "rss",
    label: "Public RSS Feeds",
    auth: "none",
    realtime: "server-side RSS polling with stale-while-revalidate cache",
    docsUrl: "https://www.rssboard.org/rss-specification",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "search"],
    routes: ["GET publisher RSS feeds through /api/channels/:channel/live"],
  },
  gdelt: {
    id: "gdelt",
    label: "GDELT DOC 2.0",
    auth: "none",
    realtime: "public document API polling with stale-while-revalidate cache",
    docsUrl: "https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "relationships", "search"],
    routes: ["GET https://api.gdeltproject.org/api/v2/doc/doc?query=...&mode=ArtList&format=json"],
  },
  "hackernews-algolia": {
    id: "hackernews-algolia",
    label: "Hacker News Algolia",
    auth: "none",
    realtime: "public search API polling with stale-while-revalidate cache",
    docsUrl: "https://hn.algolia.com/api",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "search"],
    routes: ["GET https://hn.algolia.com/api/v1/search_by_date?tags=story"],
  },
  "open-meteo": {
    id: "open-meteo",
    label: "Open-Meteo",
    auth: "none",
    realtime: "public forecast API polling with stale-while-revalidate cache",
    docsUrl: "https://open-meteo.com/en/docs",
    capabilities: ["snapshot", "timeseries", "events"],
    routes: ["GET https://api.open-meteo.com/v1/forecast?latitude=...&longitude=..."],
  },
  clinicaltrials: {
    id: "clinicaltrials",
    label: "ClinicalTrials.gov API v2",
    auth: "none",
    realtime: "public registry polling with stale-while-revalidate cache",
    docsUrl: "https://clinicaltrials.gov/data-api/api",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "search"],
    routes: ["GET https://clinicaltrials.gov/api/v2/studies?query.term=..."],
  },
  "nasa-exoplanet": {
    id: "nasa-exoplanet",
    label: "NASA Exoplanet Archive TAP",
    auth: "none",
    realtime: "public TAP sync queries with stale-while-revalidate cache",
    docsUrl: "https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html",
    capabilities: ["snapshot", "timeseries", "events", "rankings", "entity_detail", "search", "historical_state"],
    routes: ["GET https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=...&format=json"],
  },
  arxiv: {
    id: "arxiv",
    label: "arXiv API",
    auth: "none",
    realtime: "public Atom API polling with stale-while-revalidate cache",
    docsUrl: "https://info.arxiv.org/help/api/index.html",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "search"],
    routes: ["GET https://export.arxiv.org/api/query?search_query=..."],
  },
  openalex: {
    id: "openalex",
    label: "OpenAlex",
    auth: "none",
    realtime: "public works API polling with stale-while-revalidate cache",
    docsUrl: "https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/search-entities",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "relationships", "search"],
    routes: ["GET https://api.openalex.org/works?search=..."],
  },
  "noaa-ndbc": {
    id: "noaa-ndbc",
    label: "NOAA NDBC",
    auth: "none",
    realtime: "public realtime buoy files with stale-while-revalidate cache",
    docsUrl: "https://www.ndbc.noaa.gov/faq/realtime.shtml",
    capabilities: ["snapshot", "timeseries", "events", "rankings", "entity_detail", "historical_state"],
    routes: ["GET https://www.ndbc.noaa.gov/data/realtime2/{station}.txt"],
  },
  "cdc-socrata": {
    id: "cdc-socrata",
    label: "CDC Open Data",
    auth: "none",
    realtime: "public Socrata catalog/data polling with stale-while-revalidate cache",
    docsUrl: "https://dev.socrata.com",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "search"],
    routes: ["GET https://api.us.socrata.com/api/catalog/v1?domains=data.cdc.gov&search=..."],
  },
  "github-actions": {
    id: "github-actions",
    label: "GitHub Actions",
    auth: "free_key_optional",
    realtime: "public repository workflow polling when ARENA_GITHUB_REPO is configured",
    docsUrl: "https://docs.github.com/en/rest/actions/workflow-runs",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "search"],
    routes: ["GET https://api.github.com/repos/{owner}/{repo}/actions/runs"],
  },
  "local-deck-json": {
    id: "local-deck-json",
    label: "Local Deck JSON",
    auth: "none",
    realtime: "server-side local deck snapshot",
    docsUrl: "/decks/dune/deck.json",
    capabilities: ["snapshot", "events", "rankings", "entity_detail", "search"],
    routes: ["GET public/decks/dune/deck.json through the channel runtime"],
  },
  "channel-synthetic": {
    id: "channel-synthetic",
    label: "Katechon synthetic channel fixture",
    auth: "none",
    realtime: "local/dev fixture only; not used for public live claims",
    docsUrl: "/docs/channel-apis.md",
    capabilities: ["snapshot", "events"],
    routes: ["dev/test fixture behind CHANNEL_SYNTHETIC_FALLBACK=1"],
  },
};

const DEFAULT_CHANNEL = {
  category: "public-data",
  liveProvider: "rss",
  providers: ["rss"],
  contract: "channel-state-v1",
  status: "public-adapter",
};

const CHANNEL_RUNTIME_VERSION = "channel-runtime-v1";

const SURFACE_REGISTRY = {
  stageOverlay: {
    label: "Primary Stage",
    mode: "replace-first",
    maxComponents: 2,
    use: "Primary generated visual or component over the dashboard graphic.",
  },
  rail: {
    label: "Right Rail",
    mode: "replace-or-append",
    maxComponents: 4,
    use: "Supporting components, timelines, inspectors, and action panels.",
  },
  modal: {
    label: "Modal",
    mode: "single-replace",
    maxComponents: 1,
    use: "Focused drilldown, table, entity inspector, or explanation that should replace the prior modal.",
  },
};

const COMPONENT_REGISTRY = {
  "metric-strip": {
    label: "Metric Strip",
    slots: ["rail", "stageOverlay", "modal"],
    props: ["title", "metrics", "binding", "note"],
    bindings: ["liveSummary.metrics", "dashboard.metrics"],
    use: "Compact KPI summary for the active channel.",
  },
  "insight-card": {
    label: "Insight Card",
    slots: ["rail", "stageOverlay", "modal"],
    props: ["eyebrow", "title", "body", "items", "binding", "note"],
    bindings: ["liveSummary.highlights", "dashboard.feed"],
    use: "A short generated explanation, thesis, or user-specific framing card.",
  },
  "event-timeline": {
    label: "Event Timeline",
    slots: ["rail", "stageOverlay", "modal"],
    props: ["title", "rows", "binding", "note"],
    bindings: ["liveSummary.feed", "dashboard.feed"],
    use: "Time-ordered source, event, or task rows.",
  },
  "source-confidence": {
    label: "Source Confidence",
    slots: ["rail", "stageOverlay", "modal"],
    props: ["title", "rows", "binding", "note"],
    bindings: ["liveSummary.feed", "none"],
    use: "Confidence/source-quality breakdown without claiming facts not in context.",
  },
  "scenario-cards": {
    label: "Scenario Cards",
    slots: ["rail", "stageOverlay", "modal"],
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
    slots: ["rail", "stageOverlay", "modal"],
    props: ["title", "metrics", "rows", "binding", "note"],
    bindings: ["liveSummary.metrics", "liveSummary.feed", "none"],
    use: "Market-specific compact widget for prices, spreads, token movement, or prediction markets.",
  },
  "vega-chart": {
    label: "Vega Chart",
    slots: ["rail", "stageOverlay", "modal"],
    props: ["title", "chart", "binding", "variant", "note"],
    bindings: [
      "liveData.candles",
      "liveData.series",
      "liveData.markets",
      "liveData.arenaBoards",
      "liveData.frontierModels",
      "liveData.capabilityMatrix",
      "liveData.polymarketMarkets",
      "liveData.marketSignals",
      "liveData.divergence",
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
  "data-table": {
    label: "Data Table",
    slots: ["rail", "stageOverlay", "modal"],
    props: ["title", "rows", "binding", "note"],
    bindings: ["liveSummary.metrics", "liveSummary.feed", "dashboard.metrics", "dashboard.feed", "none"],
    use: "Dense rows for arbitrary channel data, rankings, records, or query results.",
  },
  "feed-stack": {
    label: "Feed Stack",
    slots: ["rail", "stageOverlay", "modal"],
    props: ["title", "rows", "binding", "note"],
    bindings: ["liveSummary.feed", "dashboard.feed", "none"],
    use: "Scrollable-looking feed or watch queue assembled from channel events or user context.",
  },
  "entity-inspector": {
    label: "Entity Inspector",
    slots: ["rail", "stageOverlay", "modal"],
    props: ["eyebrow", "title", "body", "metrics", "rows", "items", "binding", "note"],
    bindings: ["liveSummary.metrics", "liveSummary.feed", "dashboard.metrics", "dashboard.feed", "none"],
    use: "Focused entity, asset, investor, source, service, node, or object drilldown.",
  },
  "relationship-graph": {
    label: "Relationship Graph",
    slots: ["stageOverlay", "modal", "rail"],
    props: ["title", "rows", "items", "binding", "note"],
    bindings: ["liveSummary.feed", "dashboard.feed", "none"],
    use: "Lightweight relationship map rendered from rows/items when a full graph adapter is not present.",
  },
  "action-panel": {
    label: "Action Panel",
    slots: ["rail", "modal"],
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
  "liveData.arenaBoards",
  "liveData.frontierModels",
  "liveData.capabilityMatrix",
  "liveData.polymarketMarkets",
  "liveData.marketSignals",
  "liveData.divergence",
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
  "overview": {
    label: "Overview",
    description: "Broad scan of the channel's current state, top entities, feed movement, and next useful drilldown.",
  },
  "deep_dive": {
    label: "Deep Dive",
    description: "One entity, issue, source, asset, or object gets the primary stage with supporting context in the rail.",
  },
  "comparison": {
    label: "Comparison",
    description: "Compare entities, metrics, periods, sources, scenarios, or outcomes side by side.",
  },
  "event_investigation": {
    label: "Event Investigation",
    description: "Trace a current event or anomaly through evidence, timeline, source state, and uncertainty.",
  },
  "historical_replay": {
    label: "Historical Replay",
    description: "Reconstruct a prior state or compare the current channel state against a historical window.",
  },
  "risk_anomaly": {
    label: "Risk Or Anomaly",
    description: "Surface stress, weak signals, outliers, uncertainty, and possible next checks without overclaiming.",
  },
  "relationship_map": {
    label: "Relationship Map",
    description: "Show how entities, sources, locations, assets, or tasks connect inside the channel.",
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
  "market_structure": {
    label: "Market Structure",
    description: "Full-page price, history, liquidity, and depth investigations with source provenance visible.",
  },
  "ranked_board": {
    label: "Ranked Board",
    description: "Full-page ranked markets, tokens, entities, or records with a dominant board and evidence rail.",
  },
  "comparison_board": {
    label: "Comparison Board",
    description: "Full-page comparison across assets, categories, markets, or tokens with shared context.",
  },
  "risk_radar": {
    label: "Risk Radar",
    description: "Full-page volatility, fragility, weird-market, or anomaly radar with explicit risk/source labels.",
  },
  "detail_inspector": {
    label: "Detail Inspector",
    description: "Full-page focused entity, market, token, source, or asset inspection with next prompts.",
  },
};

const DATA_CAPABILITIES = {
  snapshot: {
    label: "Current Snapshot",
    params: ["entity", "entities", "metric", "detail"],
    returns: ["summary", "metrics", "feed", "liveEnvelope"],
    use: "Read the current normalized channel state before answering or composing.",
  },
  timeseries: {
    label: "Time Series",
    params: ["entity", "entities", "interval", "lookbackHours", "startTime", "endTime", "limit"],
    returns: ["series", "rows", "bindingHints"],
    use: "Query historical or current series data where the channel adapter supports it.",
  },
  events: {
    label: "Events",
    params: ["entity", "topic", "lookbackHours", "limit"],
    returns: ["feed", "rows"],
    use: "Fetch or derive a timeline/watch queue for source, market, incident, or system movement.",
  },
  rankings: {
    label: "Rankings",
    params: ["metric", "direction", "limit"],
    returns: ["rows", "bindingHints"],
    use: "Rank entities, records, sources, markets, tokens, corridors, or metrics.",
  },
  entity_detail: {
    label: "Entity Detail",
    params: ["entity", "detail"],
    returns: ["summary", "metrics", "rows", "feed"],
    use: "Inspect a specific asset, market, source, person, node, region, object, or task.",
  },
  relationships: {
    label: "Relationships",
    params: ["entity", "depth", "limit"],
    returns: ["nodes", "edges", "rows"],
    use: "Build a relationship map from current channel entities or feed context.",
  },
  search: {
    label: "Search",
    params: ["query", "entity", "limit"],
    returns: ["rows", "feed"],
    use: "Search available normalized state; adapters may later attach external indexes.",
  },
  historical_state: {
    label: "Historical State",
    params: ["entity", "startTime", "endTime", "lookbackHours", "compareTo"],
    returns: ["summary", "series", "rows"],
    use: "Inspect a prior window or compare current channel state against history.",
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
    { id: "lmarena-leaderboard-dataset", use: "official Arena leaderboard history and latest snapshots", fit: "SOTA leaders across text, vision, search, document, code, image, and video boards" },
    { id: "polymarket-ai", use: "public AI/model/release prediction markets", fit: "market-implied expectations for frontier labs, release timing, and benchmark outcomes" },
    { id: "hf-official-benchmark-leaderboards", use: "official Hugging Face benchmark leaderboard API", fit: "structured external benchmark spine for SWE, math, and model-centric score cards" },
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
    { id: "pumpportal", use: "real-time pump.fun mint/trade/migration websocket stream", fit: "live mint firehose, bonding-curve fill toward 85 SOL graduation, trade tape" },
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
  const bindings = [];
  const add = (...items) => items.forEach((item) => {
    if (item && !bindings.includes(item)) bindings.push(item);
  });
  for (const provider of [channel.liveProvider, ...(channel.providers || [])]) {
    if (provider === "hyperliquid") add("liveData.candles", "liveData.book");
    else if (provider === "polymarket") add("liveData.markets");
    else if (provider === "pumpportal") add("liveData.recentMints", "liveData.graduationCandidates", "liveData.fastMovers", "liveData.recentMigrations", "liveData.tokens");
    else if (["pumpfun", "dexscreener", "coingecko-pumpfun"].includes(provider)) add("liveData.tokens");
    else if (provider === "eia-grid") add("liveData.series", "liveData.fuelMix", "liveData.corridors");
    else if (provider === "gdelt") add("liveData.articles");
    else if (provider === "rss") add("liveData.items", "liveData.hn");
    else if (provider === "clinicaltrials") add("liveData.studies");
    else if (provider === "nasa-exoplanet") add("liveData.objects");
    else if (provider === "arxiv") add("liveData.papers");
    else if (provider === "noaa-ndbc") add("liveData.sensors");
    else if (provider === "cdc-socrata") add("liveData.datasets");
    else if (provider === "github-actions") add("liveData.runs");
    else if (provider === "ai-sota" || provider === "lmarena" || provider === "polymarket-ai") add("liveData.capabilityMatrix", "liveData.arenaBoards", "liveData.frontierModels", "liveData.polymarketMarkets", "liveData.marketSignals", "liveData.divergence");
    else if (provider === "local-deck-json") add("liveData.slides");
  }
  add("liveSummary.metrics", "liveSummary.feed", "dashboard.metrics", "dashboard.feed");
  return bindings;
}

function dataCapabilitiesForChannel(channel) {
  const ids = new Set(["snapshot", "events", "rankings", "entity_detail", "relationships", "search"]);
  for (const providerId of channel.providers || [channel.liveProvider]) {
    const provider = providerById(providerId);
    for (const capability of provider?.capabilities || []) ids.add(capability);
  }
  return Array.from(ids).map((id) => ({
    id,
    ...DATA_CAPABILITIES[id],
  })).filter((capability) => capability.label);
}

const CHANNEL_OVERRIDES = {
  spectre: {
    category: "osint",
    liveProvider: "gdelt",
    providers: ["gdelt", "rss"],
    contract: "osint-events-v1",
    status: "public-adapter",
    summary: "OSINT event room grounded in public GDELT document/event signals, with unavailable states shown explicitly when public data cannot refresh.",
  },
  news: {
    category: "news",
    liveProvider: "rss",
    providers: ["rss", "gdelt"],
    contract: "source-feed-v1",
    status: "public-adapter",
    summary: "Source-fusion news room backed by server-side public RSS and GDELT source queues.",
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
    liveProvider: "gdelt",
    providers: ["gdelt", "eia-grid"],
    contract: "risk-feed-v1",
    status: "public-adapter",
    summary: "Geopolitical risk monitor grounded in public GDELT coverage, with energy/macro adapters kept explicit when configured.",
  },
  arena: {
    category: "ai-eval",
    liveProvider: "ai-sota",
    providers: ["ai-sota", "lmarena", "polymarket-ai"],
    contract: "ai-sota-snapshot-v1",
    status: "live",
    summary: "AI Arena merges official LMArena leaderboard snapshots with public Polymarket AI/model-release markets into a source-attributed realtime SOTA snapshot.",
    commandPlaceholder: "Ask for SOTA leaders, coding models, release odds, or benchmark-market divergence...",
    heroPrompts: [
      "Show the current frontier model SOTA snapshot",
      "Rank models across Arena boards",
      "Find benchmark-market divergence in AI model bets",
    ],
  },
  glance: {
    category: "source-wall",
    liveProvider: "rss",
    providers: ["rss", "hackernews-algolia", "open-meteo"],
    contract: "source-feed-v1",
    status: "public-adapter",
    summary: "Glance exposes a public source wall backed by RSS, Hacker News Algolia, and Open-Meteo context.",
  },
  "crypto-trading": {
    category: "markets",
    liveProvider: "hyperliquid",
    providers: ["hyperliquid"],
    contract: "market-depth-v1",
    status: "live",
    defaultQuery: { coin: "BTC" },
    summary: "Crypto Trading uses Hyperliquid read-only market data for mids, L2 depth, candles, comparison charts, and shareable generated market states.",
    commandPlaceholder: "Ask for BTC three months, compare ETH, or inspect BTC liquidity",
    heroPrompts: [
      "BTC three months",
      "Compare BTC and ETH over the last week",
      "Show liquidity and depth around BTC right now",
    ],
  },
  polyrec: {
    category: "prediction-markets",
    liveProvider: "polymarket",
    providers: ["polymarket"],
    contract: "prediction-markets-v1",
    status: "live",
    summary: "Polyrec turns public Polymarket discovery data into ranked, shareable prediction-market intelligence boards with visible source state.",
    commandPlaceholder: "Ask for weird markets, close odds, volume, or a category...",
    heroPrompts: [
      "Show the weirdest active markets",
      "Find markets with high volume and close odds",
      "Build a live board for election and macro markets",
    ],
  },
  biotech: {
    category: "research",
    liveProvider: "clinicaltrials",
    providers: ["clinicaltrials", "openalex"],
    contract: "research-feed-v1",
    status: "public-adapter",
    summary: "Biotech reads ClinicalTrials.gov API v2 and public research metadata for trial, paper, and target update surfaces.",
  },
  space: {
    category: "space",
    liveProvider: "nasa-exoplanet",
    providers: ["nasa-exoplanet"],
    contract: "observatory-feed-v1",
    status: "public-adapter",
    summary: "Deep Space reads NASA Exoplanet Archive TAP data for candidates, catalogs, and observation queues.",
  },
  iran: {
    category: "geo-intel",
    liveProvider: "gdelt",
    providers: ["gdelt", "eia-grid"],
    contract: "risk-feed-v1",
    status: "public-adapter",
    summary: "Iran Signal reads public GDELT regional coverage and keeps energy/infrastructure context as explicit provider-backed bindings.",
  },
  "meme-coin": {
    category: "social-markets",
    liveProvider: "pumpportal",
    providers: ["pumpportal", "dexscreener", "coingecko-pumpfun"],
    contract: "token-velocity-v1",
    status: "live",
    summary: "Meme Coin turns PumpPortal pump.fun websocket events plus public DEX/token fallback data into shareable mint, graduation, trade-tape, liquidity-risk, fragility, and narrative-decay boards.",
    commandPlaceholder: "Ask for graduations, fresh mints, loud buys, dev sells, or liquidity risk...",
    heroPrompts: [
      "Show me what's about to graduate",
      "Which mints are under one minute old?",
      "Find the loudest buy in the last five minutes",
    ],
  },
  quantum: {
    category: "science",
    liveProvider: "arxiv",
    providers: ["arxiv", "openalex"],
    contract: "science-feed-v1",
    status: "public-adapter",
    summary: "Quantum reads arXiv and OpenAlex public research metadata for paper velocity, topics, and institutions.",
  },
  "deep-sea": {
    category: "sensors",
    liveProvider: "noaa-ndbc",
    providers: ["noaa-ndbc"],
    contract: "sensor-feed-v1",
    status: "public-adapter",
    summary: "Abyssal Monitor reads NOAA NDBC realtime buoy files for ocean sensor timelines.",
  },
  "power-grid": {
    category: "infrastructure",
    liveProvider: "eia-grid",
    providers: ["eia-grid", "open-meteo"],
    contract: "power-grid-operational-v1",
    status: "public-adapter-keyed",
    defaultQuery: { respondent: "US48" },
    summary: "Power Grid uses EIA hourly electric-system operating data for load, forecast, net generation, interchange, and fuel mix, with cached public snapshots or explicit unavailable states when EIA cannot refresh.",
  },
  viral: {
    category: "epidemiology",
    liveProvider: "cdc-socrata",
    providers: ["cdc-socrata"],
    contract: "model-feed-v1",
    status: "public-adapter",
    summary: "Viral Spread reads CDC Open Data/Socrata public health datasets and catalog signals for surveillance context.",
  },
  "dark-forest": {
    category: "astronomy",
    liveProvider: "nasa-exoplanet",
    providers: ["nasa-exoplanet"],
    contract: "observatory-feed-v1",
    status: "public-adapter",
    summary: "Dark Forest reads NASA Exoplanet Archive TAP catalog data for stellar and transit anomaly watch surfaces.",
  },
  "dune-deck": {
    category: "deck",
    liveProvider: "local-deck-json",
    providers: ["local-deck-json"],
    contract: "deck-state-v1",
    status: "public-adapter-local",
    summary: "Investor deck channel backed by the checked-in deck JSON and optional product analytics endpoints.",
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
  channel.manifestPath = `/api/channels/${encodeURIComponent(id)}/manifest`;
  channel.agentPath = `/api/channels/${encodeURIComponent(id)}/agent`;
  channel.statePath = `/api/channels/${encodeURIComponent(id)}/state`;
  channel.turnPath = `/api/channels/${encodeURIComponent(id)}/turn`;
  channel.queryPath = `/api/channels/${encodeURIComponent(id)}/query`;
  channel.updatePath = `/api/channels/${encodeURIComponent(id)}/update`;
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
    sourcePolicy: "public_provider_or_cached_snapshot",
    livePath: channel.livePath,
    contextPath: channel.contextPath,
    docsPath: channel.docsPath,
    manifestPath: channel.manifestPath,
    agentPath: channel.agentPath,
    statePath: channel.statePath,
    turnPath: channel.turnPath,
    queryPath: channel.queryPath,
    updatePath: channel.updatePath,
    heroPrompts: channel.heroPrompts || [],
    commandPlaceholder: channel.commandPlaceholder || "",
  };
}

function componentRegistry() {
  return COMPONENT_REGISTRY;
}

function viewPresets() {
  return VIEW_PRESETS;
}

function surfaceRegistry() {
  return SURFACE_REGISTRY;
}

function dataCapabilities() {
  return DATA_CAPABILITIES;
}

function channelGenerationSpec(channel) {
  const hints = CATEGORY_GENERATION_HINTS[channel.category] || {
    audience: "dashboard viewers",
    preferredViews: ["briefing", "operator"],
    preferredComponents: ["metric-strip", "insight-card", "event-timeline", "data-table", "action-panel"],
  };
  const componentIds = Array.from(new Set([
    ...hints.preferredComponents,
    "vega-chart",
    "metric-strip",
    "insight-card",
    "event-timeline",
    "data-table",
    "feed-stack",
    "entity-inspector",
    "relationship-graph",
  ]));
  return {
    runtime: CHANNEL_RUNTIME_VERSION,
    purpose: channel.summary || `${channel.label} is a generated channel surface backed by ${channel.contract}.`,
    heroPrompts: channel.heroPrompts || [],
    commandPlaceholder: channel.commandPlaceholder || "",
    audience: hints.audience,
    availableViews: Array.from(new Set(["default", "overview", "deep_dive", "comparison", "event_investigation", "historical_replay", "risk_anomaly", "relationship_map", "market_structure", "ranked_board", "comparison_board", "risk_radar", "detail_inspector", ...hints.preferredViews])).map((id) => ({
      id,
      ...VIEW_PRESETS[id],
    })).filter((view) => view.label),
    layouts: Array.from(new Set(["overview", "deep_dive", "comparison", "event_investigation", "historical_replay", "risk_anomaly", "relationship_map", "market_structure", "ranked_board", "comparison_board", "risk_radar", "detail_inspector", ...hints.preferredViews])).map((id) => ({
      id,
      ...VIEW_PRESETS[id],
    })).filter((layout) => layout.label),
    surfaces: Object.entries(SURFACE_REGISTRY).map(([id, surface]) => ({ id, ...surface })),
    capabilities: dataCapabilitiesForChannel(channel),
    availableComponents: componentIds.map((id) => ({
      id,
      ...COMPONENT_REGISTRY[id],
    })).filter((component) => component.label),
    editableSlots: Object.keys(SURFACE_REGISTRY),
    visualization: {
      runtime: "Vega rendered in the dashboard iframe, with Anime.js used for entrance/update motion.",
      chartTypes: CHART_TYPES,
      bindings: chartBindingsForChannel(channel),
      guidance: [
        "Use vega-chart for generated graphs.",
        "Prefer liveData bindings after calling query_channel_capability with compact detail.",
        "Use liveSummary bindings for spoken answers and small charts.",
        "Use stageOverlay for primary charts so they replace the generated stage surface over the dashboard graphic.",
        "For focused launch channels, prefer generated_page mode with page layout, thesis, stage, rail, actions, and provenance over slot-only mutations.",
        "For crypto history, pass query.coin, query.interval, query.lookbackHours, query.startTime, or query.endTime instead of changing provider APIs.",
      ],
    },
    provenance: {
      requiredFor: ["vega-chart", "insight-card", "metric-strip", "data-table", "event-timeline", "entity-inspector", "relationship-graph", "action-panel"],
      sourceTypes: ["live_api", "historical_api", "cached_api", "derived_from_api", "synthetic_fallback", "unavailable"],
      syntheticPolicy: "Synthetic data is a local/dev fixture only. Public channels must use live, cached, or unavailable provider-backed bindings.",
      dataBindingRequired: true,
    },
    updateContract: {
      preferredTool: "apply_channel_update",
      queryTool: "query_channel_capability",
      defaultSurfaceMode: "replace",
      generatedCode: "not allowed; compose validated component specs only",
    },
    allowedMutations: [
      "apply_channel_update",
      "query_channel_capability",
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
      manifest: channel.manifestPath,
      agent: channel.agentPath,
      state: channel.statePath,
      turn: channel.turnPath,
      query: channel.queryPath,
      update: channel.updatePath,
    },
    responseEnvelope: {
      ok: true,
      channel: channel.id,
      providerIds: channel.providers,
      source: channel.liveProvider,
      freshness: "live | cached | unavailable",
      updatedAt: "epoch milliseconds",
      data: "provider-specific normalized payload",
      fallbackReason: "public retry/cache state or null",
      provenance: ["provider provenance records"],
      dataBinding: {
        channelId: channel.id,
        providerIds: channel.providers,
        capability: "snapshot",
        query: {},
        freshness: "live | cached | unavailable",
        provenanceIds: [],
        publicSourceUrls: [],
      },
      docs: channel.docsPath,
    },
    katContract: [
      "Read live state from the channel live route instead of provider APIs directly.",
      "Use generic channel capabilities for query planning before composing generated components.",
      "Apply generated views through a validated channel update spec, not arbitrary source code.",
      "Generate channel-scoped renderers/components only.",
      "Treat stale=true or fallbackReason as visible UI state.",
      "Attach provenance and DataBinding objects to generated charts, insights, tables, metrics, timelines, and actions.",
      "If a provider fails and no cache exists, render Data unavailable instead of synthetic live motion.",
      "Do not add wallet, trading, paid, KYC, or login-only flows in v1.",
    ],
    generation: channelGenerationSpec(channel),
    manifest: {
      runtime: CHANNEL_RUNTIME_VERSION,
      surfaces: SURFACE_REGISTRY,
      layouts: VIEW_PRESETS,
      capabilities: dataCapabilitiesForChannel(channel),
      components: COMPONENT_REGISTRY,
    },
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
  CHANNEL_RUNTIME_VERSION,
  DATA_CAPABILITIES,
  channelGenerationSpec,
  channelDocs,
  componentRegistry,
  dataCapabilities,
  dataCapabilitiesForChannel,
  getChannel,
  apiIdeasForChannel,
  listChannels,
  providerById,
  publicChannel,
  surfaceRegistry,
  syntheticChannelData,
  viewPresets,
};
