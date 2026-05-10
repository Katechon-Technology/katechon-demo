# Channel APIs

Katechon channels expose active dashboard data through one normalized API layer. The goal is for the dashboard runtime and Kat-generated components to read the same channel contract instead of binding directly to one provider.

## Route Reference

All routes are served by `server.js`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/channels` | List all channel ids, live paths, docs paths, provider ids, and contracts |
| `GET` | `/api/channels/:channel` | Fetch one channel's metadata |
| `GET` | `/api/channels/:channel/live` | Fetch the latest normalized live payload for one channel |
| `GET` | `/api/channels/:channel/context` | Fetch Kat's compact channel context packet for voice and generated components |
| `GET` | `/api/channels/:channel/docs` | Fetch structured docs for one channel and its providers |
| `GET` | `/api/channels/:channel/manifest` | Fetch the runtime manifest: capabilities, layouts, surfaces, components, and rules |
| `GET` | `/api/channels/:channel/agent` | Fetch the specialist channel agent manifest Kat routes through |
| `GET` | `/api/channels/:channel/state?sessionId=local-session` | Inspect persisted channel session state |
| `POST` | `/api/channels/:channel/turn` | Route one user turn through the specialist channel agent and return morph events |
| `GET` | `/api/channels/:channel/turn/stream?sessionId=local-session&text=...` | Stream the same channel turn as Server-Sent Events |
| `POST` | `/api/channels/:channel/query` | Query generic channel capabilities such as snapshot, timeseries, events, rankings, and historical state |
| `POST` | `/api/channels/:channel/update` | Apply a validated channel update spec with layout, surface replacements, components, and theme tokens |

Provider compatibility routes still exist:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/live/hyperliquid?coin=BTC&interval=15m&lookbackHours=24` | Hyperliquid mids, L2 book, and historical candles |
| `GET` | `/api/live/polymarket` | Polymarket active market discovery |
| `GET` | `/api/live/pumpfun` | Indexed Pump.fun-style token market data |
| `GET` | `/api/live/eia-grid?respondent=US48` | EIA hourly grid load, forecast, generation, interchange, and fuel mix |

## Live Envelope

Every channel live route returns the same envelope:

```json
{
  "ok": true,
  "channel": "crypto-trading",
  "label": "Crypto Trading",
  "category": "markets",
  "contract": "market-depth-v1",
  "providers": ["hyperliquid"],
  "providerIds": ["hyperliquid"],
  "liveProvider": "hyperliquid",
  "source": "hyperliquid",
  "freshness": "live",
  "stale": false,
  "updatedAt": 1778240000000,
  "data": {},
  "health": {"status": "ok"},
  "provenance": [],
  "dataBinding": {
    "channelId": "crypto-trading",
    "providerIds": ["hyperliquid"],
    "capability": "snapshot",
    "query": {},
    "freshness": "live",
    "provenanceIds": [],
    "publicSourceUrls": ["https://api.hyperliquid.xyz/info"]
  },
  "fallbackReason": null,
  "docs": "/api/channels/crypto-trading/docs"
}
```

Rules:

- `source` tells the UI and Kat what produced the current data.
- `freshness` is one of `live`, `cached`, or `unavailable`.
- `stale=true` means cached public data is being used after a provider refresh failed or is still revalidating.
- `fallbackReason` is public retry/cache context for generated components; raw provider errors stay out of public UI copy.
- `dataBinding` names the channel, providers, capability, query, freshness, provenance ids, and public source URLs that generated cards must carry forward.
- `data` is contract-specific, but always wrapped by the same envelope.
- If a provider fails and no cache exists, the envelope returns `freshness: "unavailable"` with an explicit data gap instead of synthetic live motion.

## Kat Context Packet

Kat should use the context route when entering or switching channels:

```bash
curl "http://localhost:4040/api/channels/crypto-trading/context?fresh=1"
```

The response is intentionally compact:

```json
{
  "ok": true,
  "context": {
    "channel": {
      "id": "crypto-trading",
      "label": "Crypto Trading",
      "contract": "market-depth-v1",
      "providers": ["hyperliquid"],
      "livePath": "/api/channels/crypto-trading/live",
      "docsPath": "/api/channels/crypto-trading/docs"
    },
    "liveSummary": {
      "source": "hyperliquid",
      "stale": false,
      "metrics": [["BTC", "$79,580", "mid"]],
      "feed": [["now", "BTC candle closed at $79,580.", "Hyperliquid"]],
      "highlights": ["BTC mid is $79,580."]
    },
    "dashboard": {
      "id": "crypto-trading",
      "title": "Crypto Trading",
      "editableFields": ["title", "subtitle", "tabs", "metrics", "feed", "customCss"]
    },
    "rules": ["Use liveSummary for normal spoken answers."]
  }
}
```

Use `?fresh=1` when Kat needs a fresh provider read. Omit it for a fast cache-first context update.

For voice, Kat should normally speak from `liveSummary`. If the user asks for details not present in the summary, Kat should call `query_channel_capability` or `get_channel_live` instead of guessing.

## Channel Runtime Manifest

The channel runtime is the general contract Kat uses across all dashboards. It keeps the hardcoded layer focused on constraints and lets Kat choose the actual query plan and generated view.

```bash
curl "http://localhost:4040/api/channels/crypto-trading/manifest"
```

Each manifest exposes:

| Field | Meaning |
|-------|---------|
| `runtime` | Runtime contract version, currently `channel-runtime-v1` |
| `channel` | Public channel metadata and route paths |
| `generation.capabilities` | Generic query actions Kat can use for the channel |
| `generation.layouts` | Valid layout templates Kat can choose from |
| `generation.surfaces` | Replaceable UI surfaces such as `stageOverlay`, `rail`, and `modal` |
| `generation.availableComponents` | Safe component primitives Kat can compose |
| `generation.updateContract` | Preferred tools and replacement/default behavior |

## Channel Agent And Session State

Each live channel has a specialist agent contract:

```bash
curl "http://localhost:4040/api/channels/crypto-trading/agent"
```

The response names Kat as the voice, exposes the specialist agent role, domain vocabulary, generic capabilities, allowed layouts, replaceable surfaces, component grammar, and provenance policy.

Session state is inspectable:

```bash
curl "http://localhost:4040/api/channels/crypto-trading/state?sessionId=local-session"
```

The state packet includes active focus, entities, timeframe, layout, queried datasets, visible surfaces, conclusions, next actions, provenance records, recent turns, and turn traces. Every meaningful channel turn should update this state.

Route a turn through the specialist runtime:

```bash
curl -X POST "http://localhost:4040/api/channels/crypto-trading/turn" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "local-session",
    "userText": "Lets dive into the BTC three month price."
  }'
```

The turn response returns:

- parsed intent and selected layout
- data query result with provenance
- generated stage/rail/modal surface operations
- updated session state
- a full trace of morph events
- Kat-ready narration

The SSE form streams events progressively:

```bash
curl -N "http://localhost:4040/api/channels/crypto-trading/turn/stream?sessionId=local-session&text=BTC%203%20month%20price"
```

Required event types emitted by the runtime:

- `channel.turn.started`
- `channel.intent.parsed`
- `channel.state.updated`
- `channel.data.query.started`
- `channel.data.query.completed` or `channel.data.query.failed`
- `channel.layout.selected`
- `channel.surface.replace`
- `channel.surface.clear`
- `channel.narration.delta`
- `channel.next_actions.updated`
- `channel.turn.completed`

Generated charts and insight components include `provenanceIds`, `sourceState`, and `dataBinding`. If the provider cannot refresh and no cached public snapshot exists, `sourceState.sourceType` is `unavailable`; it is displayed as `Data unavailable` in the dashboard source chip and included in Kat's narration.

Generic layouts:

| Layout | Use |
|--------|-----|
| `overview` | Broad scan of current state, top entities, movement, and likely next drilldown |
| `deep_dive` | One entity, source, asset, market, object, or issue gets primary focus |
| `comparison` | Compare entities, metrics, sources, scenarios, or time windows |
| `event_investigation` | Trace an event or anomaly through evidence, timeline, and uncertainty |
| `historical_replay` | Reconstruct prior state or compare current vs historical windows |
| `risk_anomaly` | Surface stress, weak signals, outliers, uncertainty, and next checks |
| `relationship_map` | Show how entities, sources, locations, assets, or tasks connect |

Generic surfaces:

| Surface | Behavior |
|---------|----------|
| `stageOverlay` | Primary generated visual over the dashboard graphic; replace by default |
| `rail` | Supporting stack for timelines, inspectors, metrics, and action panels |
| `modal` | Single focused drilldown; each modal update replaces the prior modal |

## Generic Capability Query

Kat should prefer generic capability queries over provider-specific assumptions:

```bash
curl -X POST "http://localhost:4040/api/channels/crypto-trading/query" \
  -H "Content-Type: application/json" \
  -d '{
    "capability": "timeseries",
    "detail": "compact",
    "params": {
      "entity": "ETH",
      "interval": "1h",
      "lookbackHours": 72
    }
  }'
```

Supported capability names:

| Capability | Purpose |
|------------|---------|
| `snapshot` | Current normalized channel state |
| `timeseries` | Historical/current series where the adapter supports it |
| `events` | Feed, timeline, source, task, or incident rows |
| `rankings` | Ranked entities, metrics, sources, markets, tokens, corridors, or records |
| `entity_detail` | Focused inspection of one entity or object |
| `relationships` | Rows suitable for a relationship map |
| `search` | Search available normalized state |
| `historical_state` | Prior window or current-vs-history inspection |

The response includes `liveSummary`, `rows`, `bindingHints`, `source`, `stale`, and `fallbackReason`. For `detail: "compact"`, it also includes trimmed provider data.

## Channel Update Spec

Kat should now use `apply_channel_update` or `POST /api/channels/:channel/update` for generated views. This is the preferred path for arbitrary information feeds, not `apply_dashboard_chart`.

```json
{
  "instruction": "Compare ETH structure over the last three days.",
  "update": {
    "layout": {
      "template": "deep_dive",
      "rationale": "The user asked for one asset and one historical window."
    },
    "dataRequests": [
      {
        "capability": "timeseries",
        "detail": "compact",
        "params": {
          "entity": "ETH",
          "interval": "1h",
          "lookbackHours": 72
        }
      }
    ],
    "surfaces": [
      {
        "surface": "stageOverlay",
        "mode": "replace",
        "components": [
          {
            "type": "vega-chart",
            "eyebrow": "generated",
            "title": "ETH 72H Structure",
            "chart": {
              "type": "line",
              "binding": "liveData.candles",
              "x": "label",
              "y": "close",
              "query": {
                "coin": "ETH",
                "interval": "1h",
                "lookbackHours": 72
              }
            },
            "note": "Rendered from the normalized channel API."
          }
        ]
      },
      {
        "surface": "rail",
        "mode": "replace",
        "components": [
          {
            "type": "entity-inspector",
            "title": "What To Inspect Next",
            "items": ["Depth", "Volume expansion", "Current range", "Prior window comparison"]
          }
        ]
      }
    ],
    "narration": "I put ETH's 72-hour structure on the stage and kept follow-up checks in the rail."
  }
}
```

Rules:

- `replace` is the default mode. Use `append` only when the user asks to keep multiple generated blocks.
- Use `stageOverlay` for primary charts so they sit over the channel graphic.
- Use `modal` for one focused drilldown; modal updates replace previous modal content.
- Generated components must use supported component types and bindings.
- `dataRequests` document the intended query plan and should match any chart query or explanation.

## Current Channels

| Channel | Live provider | Contract | Notes |
|---------|---------------|----------|-------|
| `crypto-trading` | `hyperliquid` | `market-depth-v1` | Read-only price, depth, and candle data |
| `dashboard123` | `hyperliquid` | `market-depth-v1` | Market Pulse starts from the same open market-data spine |
| `polyrec` | `polymarket` | `prediction-markets-v1` | Public prediction-market discovery data |
| `meme-coin` | `dexscreener` | `token-velocity-v1` | Public DEX pair, boost, liquidity, and price-change data; no wallet or trading flow |
| `power-grid` | `eia-grid` | `power-grid-operational-v1` | EIA hourly electric grid monitor with cached/unavailable states if `EIA_API_KEY` is absent |
| `news`, `glance` | `rss` | `source-feed-v1` | Public feed queues, with GDELT/HN/weather adapters where declared |
| `spectre`, `world-monitor`, `iran` | `gdelt` | `osint-events-v1` / `risk-feed-v1` | Public GDELT document/event signals |
| `biotech` | `clinicaltrials` | `research-feed-v1` | ClinicalTrials.gov API v2 |
| `space`, `dark-forest` | `nasa-exoplanet` | `observatory-feed-v1` | NASA Exoplanet Archive TAP |
| `quantum` | `arxiv` | `science-feed-v1` | arXiv public Atom API |
| `deep-sea` | `noaa-ndbc` | `sensor-feed-v1` | NOAA NDBC realtime files |
| `viral` | `cdc-socrata` | `model-feed-v1` | CDC Open Data/Socrata catalog/data |
| `arena` | `github-actions` | `agent-match-v1` | Public GitHub Actions when configured; otherwise unavailable |
| `dune-deck` | `local-deck-json` | `deck-state-v1` | Checked-in deck JSON |

## Provider Notes

Hyperliquid:

- Uses the public `POST https://api.hyperliquid.xyz/info` endpoint.
- Current requests are `allMids`, `l2Book`, and `candleSnapshot`.
- Crypto chart routes accept `coin`, `interval`, `lookbackHours`, `candles`, `startTime`, and `endTime`; values are sanitized and capped server-side.
- Supported intervals are `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `8h`, `12h`, and `1d`.
- Public docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint

Polymarket:

- Uses public Gamma API discovery data.
- Trading/order-management endpoints are out of scope for v1.
- Public docs: https://docs.polymarket.com/api-reference

Meme coin public data:

- Primary source is DEX Screener token profiles, boosts, token-pair liquidity, volume, and price-change data.
- The `/api/live/pumpfun` compatibility route still exists, but public channel state no longer claims a synthetic fallback as live.
- Cached DEX/CoinGecko snapshots are the default fallback; no cache means `Data unavailable`.
- DEX Screener docs: https://docs.dexscreener.com/api/reference
- CoinGecko Pump.fun API overview: https://www.coingecko.com/en/api/launchpads/pump-fun

EIA Power Grid:

- Uses EIA Open Data hourly electric-system operating data.
- Set `EIA_API_KEY` for live EIA reads; optional `EIA_GRID_RESPONDENT` defaults to `US48`.
- Current requests read `electricity/rto/region-data` and `electricity/rto/fuel-type-data`.
- EIA fields include load (`D`), load forecast (`DF`), net generation (`NG`), and total interchange (`TI`).
- Frequency and corridor stress are dashboard display proxies derived from the normalized packet, not raw EIA measurements.
- Public docs: https://www.eia.gov/opendata/index.php/browser/electricity/electric-power-operational-data

SPECTRE and OSINT:

- Raw SPECTRE stays available through the existing dashboard proxy.
- The channel route exposes normalized event-room state now and can later attach source/event adapters behind the same contract.

## Kat Component Contract

Kat-generated dashboard components should:

- Read channel state from `/api/channels/:channel/live`.
- Read compact voice/build context from `/api/channels/:channel/context`.
- Read docs and provider context from `/api/channels/:channel/docs`.
- Render only from the normalized payload or generated component config passed into the component.
- Treat `stale`, `source`, and `fallbackReason` as first-class UI state.
- Stay channel-scoped so a generated component can be enabled, replaced, or rolled back without changing the shared shell.

Kat-generated dashboard components should not:

- Fetch Hyperliquid, Polymarket, CoinGecko, or other provider APIs directly from the browser component.
- Add trading, wallet, KYC, paid, or login-only flows in v1.
- Hide fallback state from the user.

## Kat Visualization Contract

Generated visualizations use a constrained chart component instead of arbitrary browser code. Kat should query the normalized channel capability layer, summarize what matters, then compose a `vega-chart` component through `apply_channel_update`.

Runtime:

- Vega renders the chart inside the dashboard iframe.
- Anime.js handles chart/card entrance and update motion through the existing shell.
- Chart data must come from `/api/channels/:channel/live`, `/api/channels/:channel/context`, `/api/channels/:channel/query`, or explicit safe rows in the generated component.
- Generated components must not fetch provider APIs directly from the browser.
- Primary generated charts should use the `stageOverlay` slot and replace the slot by default, so the chart becomes the active surface over the dashboard graphic instead of stacking multiple panels.
- The dashboard refreshes live/channel state on the same short polling cadence as the server cache and generated charts can be clicked to inspect the selected row inline.

Supported chart component:

```json
{
  "type": "vega-chart",
  "title": "BTC Candle Trend",
  "chart": {
    "type": "candlestick",
    "binding": "liveData.candles",
    "x": "label",
    "y": "close",
    "query": {
      "coin": "BTC",
      "interval": "15m",
      "lookbackHours": 24
    }
  },
  "note": "Read-only chart from normalized channel data."
}
```

Supported chart types:

| Type | Best For |
|------|----------|
| `line` | Candles, trends, and time series |
| `area` | Load, forecast, volume, or intensity over time |
| `bar` | Metrics, token movement, fuel mix, category comparisons |
| `horizontal-bar` | Long labels such as prediction market questions |
| `scatter` | Pairwise numeric comparisons |
| `market-depth` | Bid/ask book summaries |
| `candlestick` | OHLC crypto candles |
| `volume` | Candle volume bars |

Supported chart bindings:

| Binding | Source |
|---------|--------|
| `liveData.candles` | Hyperliquid candle payload |
| `liveData.book` | Hyperliquid L2 payload |
| `liveData.markets` | Polymarket market discovery payload |
| `liveData.tokens` | Pump.fun-style token payload |
| `liveData.series` | EIA grid time series |
| `liveData.fuelMix` | EIA grid fuel mix |
| `liveData.corridors` | Grid corridor stress proxy |
| `liveSummary.metrics` | Compact Kat context metrics |
| `liveSummary.feed` | Compact Kat context rows |
| `dashboard.metrics` | Dashboard catalog/override metrics |
| `dashboard.feed` | Dashboard catalog/override feed |

Kat workflow for graph requests:

1. Call `get_channel_context` for normal dashboard state.
2. Call `query_channel_capability` when the user asks for a specific graph, feed, market, token, grid respondent, entity, ranking, relationship, or history.
3. Prefer `apply_channel_update` for chart requests; it applies a complete layout and surface update spec.
4. Talk through the chart using `liveSummary.highlights`, visible chart axes, and `fallbackReason` if present.

`apply_dashboard_chart` accepts these intents:

| Intent | Default Binding |
|--------|-----------------|
| `auto` | Server chooses from active channel/provider and request text |
| `price_trend` | `liveData.candles` |
| `moving_average` | `liveData.candles` |
| `candlestick` | `liveData.candles` |
| `volume` | `liveData.candles` |
| `volatility` | `liveData.candles` |
| `market_depth` | `liveData.book` |
| `market_odds` | `liveData.markets` |
| `token_velocity` | `liveData.tokens` |
| `grid_load` | `liveData.series` |
| `fuel_mix` | `liveData.fuelMix` |
| `corridor_stress` | `liveData.corridors` |
| `metrics` | `liveSummary.metrics` |
| `feed_timeline` | `liveSummary.feed` |

Example mutation:

```json
{
  "dashboardId": "power-grid",
  "instruction": "Show the grid load against forecast.",
  "mutation": {
    "type": "replace_slot",
    "slot": "stageOverlay",
    "component": {
      "type": "vega-chart",
      "title": "Load vs Forecast",
      "chart": {
        "type": "area",
        "binding": "liveData.series",
        "x": "label",
        "y": "loadMw",
        "y2": "forecastMw"
      },
      "note": "Frequency and corridor stress remain modeled display proxies."
    }
  }
}
```

## API Roadmap Ideas

These are recommended provider directions behind the normalized channel layer. Kat receives compact per-channel ideas in `/api/channels/:channel/context`, but implementation should still happen server-side.

| Channel | API Ideas |
|---------|-----------|
| `spectre` | GDELT, ACLED, OpenStreetMap |
| `news` | RSS, GDELT, NewsAPI/MediaStack-style search |
| `dashboard123` | Hyperliquid, Finnhub/Polygon, FRED |
| `world-monitor` | GDELT, ACLED, EIA/FRED |
| `arena` | eval harness logs, model-router run data, GitHub Actions benchmark runs |
| `glance` | RSS, Hacker News Algolia, Open-Meteo/NWS |
| `crypto-trading` | Hyperliquid, CoinGecko, DefiLlama |
| `polyrec` | Polymarket Gamma, Polymarket CLOB, Chainlink/reference prices |
| `biotech` | ClinicalTrials.gov, PubMed/Europe PMC, UniProt/AlphaFold |
| `space` | NASA Exoplanet Archive, MAST, JPL Horizons |
| `iran` | GDELT, EIA, OpenStreetMap |
| `meme-coin` | CoinGecko Pump.fun category, DexScreener, public social trend signals |
| `quantum` | arXiv, OpenAlex, curated benchmark feeds |
| `deep-sea` | NOAA NDBC, NOAA Tides & Currents, ERDDAP |
| `power-grid` | EIA, NREL, NOAA weather |
| `viral` | CDC, WHO, public mobility/open datasets |
| `dark-forest` | MAST, NASA Exoplanet Archive, SIMBAD/VizieR |
| `dune-deck` | local deck JSON, product analytics |

## Fast Dashboard Mutation Contract

This legacy dashboard mutation contract still exists for compatibility. New work should prefer the channel runtime: `query_channel_capability` followed by `apply_channel_update`.

Kat should treat dashboard generation like composing a Roblox/Retool-style surface from predefined blocks, not like arbitrary source-code editing.

The Realtime tool `apply_dashboard_mutation` accepts these mutation types:

| Type | Purpose |
|------|---------|
| `set_view` | Pick a view preset such as `briefing`, `investor`, `operator`, `research`, or `market` |
| `set_copy` | Update title, subtitle, labels, tabs, metrics, or feed rows |
| `replace_slot` | Replace a dashboard slot/surface with generated components |
| `add_component` | Append one generated component to a slot |
| `set_theme_tokens` | Set safe color tokens: `accent`, `accent2`, `accent3` |
| `clear_generated` | Remove generated components and return to the base dashboard |

Current slots:

| Slot | Render Location |
|------|-----------------|
| `rail` | Right-side generated component stack between the feed and mini insight panel |
| `stageOverlay` | Overlay cards inside the main visual stage |
| `modal` | Single replaceable generated drilldown modal |

Current component types:

| Component | Best For |
|-----------|----------|
| `metric-strip` | Compact KPIs, optionally bound to `liveSummary.metrics` |
| `insight-card` | Generated framing, thesis, or user-specific explanation |
| `event-timeline` | Time-ordered feed/source/task rows |
| `source-confidence` | Source quality, assumptions, and uncertainty |
| `scenario-cards` | Options, scenarios, or next-step cards |
| `map-brief` | Stage overlay callouts for map/geospatial/network dashboards |
| `market-widget` | Read-only market or prediction-market snippets |
| `vega-chart` | Safe generated Vega visualization from normalized live/dashboard data |
| `data-table` | Dense rows for arbitrary channel query results |
| `feed-stack` | Feed/watch queue assembled from channel events |
| `entity-inspector` | Focused entity or object drilldown |
| `relationship-graph` | Lightweight relationship map from rows/items |
| `action-panel` | Suggested viewer questions, watchlist items, or workflow steps |

Supported bindings:

| Binding | Meaning |
|---------|---------|
| `liveSummary.metrics` | Use the current channel metric summary |
| `liveSummary.feed` | Use the current channel feed rows |
| `liveSummary.highlights` | Use compact generated highlights from the current feed |
| `liveData.candles` | Use compact Hyperliquid candles for Vega charts |
| `liveData.book` | Use compact Hyperliquid L2 depth for Vega charts |
| `liveData.markets` | Use compact Polymarket markets for Vega charts |
| `liveData.tokens` | Use compact token rows for Vega charts |
| `liveData.series` | Use compact EIA grid time series for Vega charts |
| `liveData.fuelMix` | Use compact EIA fuel mix for Vega charts |
| `liveData.corridors` | Use compact grid corridor rows for Vega charts |
| `dashboard.metrics` | Use dashboard metrics |
| `dashboard.feed` | Use dashboard feed rows |
| `none` | Render only supplied component props |

Example mutation:

```json
{
  "dashboardId": "iran",
  "instruction": "Make this an investor briefing for a Bangladesh check-in app opportunity.",
  "mutation": {
    "type": "replace_slot",
    "slot": "rail",
    "patch": {
      "title": "Bangladesh Check-In Opportunity",
      "subtitle": "A market-entry dashboard for check-in behavior, trust signals, and early growth loops.",
      "visualLabel": "market entry signal map",
      "visualCopy": "Kat is reframing this channel around audience behavior, adoption triggers, and launch sequencing."
    },
    "components": [
      {
        "type": "insight-card",
        "eyebrow": "thesis",
        "title": "Behavior-first market entry",
        "body": "Use the dashboard to track trust, frequency, and social proof before writing product code.",
        "items": ["Target repeat check-ins", "Measure invite loops", "Separate hype from retained behavior"]
      },
      {
        "type": "action-panel",
        "title": "Next dashboard blocks",
        "items": ["Persona map", "City launch queue", "Retention signal tracker"]
      }
    ]
  }
}
```

## Example Calls

```bash
curl http://localhost:4040/api/channels
curl http://localhost:4040/api/channels/crypto-trading/live
curl http://localhost:4040/api/channels/polyrec/docs
curl "http://localhost:4040/api/channels/dashboard123/live?coin=ETH"
```
