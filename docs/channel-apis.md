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

Provider compatibility routes still exist:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/live/hyperliquid?coin=BTC` | Hyperliquid mids, L2 book, and 15m candles |
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
  "liveProvider": "hyperliquid",
  "source": "hyperliquid",
  "stale": false,
  "updatedAt": 1778240000000,
  "data": {},
  "fallbackReason": null,
  "docs": "/api/channels/crypto-trading/docs"
}
```

Rules:

- `source` tells the UI and Kat what produced the current data.
- `stale=true` means cached data is being used after a live provider failure.
- `fallbackReason` is visible debugging/context for generated components.
- `data` is contract-specific, but always wrapped by the same envelope.
- Channels without a real provider use `channel-synthetic` so they still have active, timestamped state.

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

For voice, Kat should normally speak from `liveSummary`. If the user asks for details not present in the summary, Kat should call `get_channel_live` instead of guessing.

## Current Channels

| Channel | Live provider | Contract | Notes |
|---------|---------------|----------|-------|
| `crypto-trading` | `hyperliquid` | `market-depth-v1` | Read-only price, depth, and candle data |
| `dashboard123` | `hyperliquid` | `market-depth-v1` | Market Pulse starts from the same open market-data spine |
| `polyrec` | `polymarket` | `prediction-markets-v1` | Public prediction-market discovery data |
| `meme-coin` | `pumpfun` | `token-velocity-v1` | Open indexed token data; no wallet or trading flow |
| `power-grid` | `eia-grid` | `power-grid-operational-v1` | EIA hourly electric grid monitor with visible fallback if `EIA_API_KEY` is absent |
| all other channels | `channel-synthetic` | channel-specific fallback | Active fallback until real open adapters are attached |

## Provider Notes

Hyperliquid:

- Uses the public `POST https://api.hyperliquid.xyz/info` endpoint.
- Current requests are `allMids`, `l2Book`, and `candleSnapshot`.
- Public docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint

Polymarket:

- Uses public Gamma API discovery data.
- Trading/order-management endpoints are out of scope for v1.
- Public docs: https://docs.polymarket.com/api-reference

Pump.fun-style data:

- V1 uses open indexed token/pool data rather than wallet or trading APIs.
- Current compatibility route uses CoinGecko category/indexed market data and synthetic fallback.
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

## Fast Dashboard Mutation Contract

Kat should treat dashboard generation like composing a Roblox/Retool-style surface from predefined blocks, not like arbitrary source-code editing.

The Realtime tool `apply_dashboard_mutation` accepts these mutation types:

| Type | Purpose |
|------|---------|
| `set_view` | Pick a view preset such as `briefing`, `investor`, `operator`, `research`, or `market` |
| `set_copy` | Update title, subtitle, labels, tabs, metrics, or feed rows |
| `replace_slot` | Replace a dashboard slot with generated components |
| `add_component` | Append one generated component to a slot |
| `set_theme_tokens` | Set safe color tokens: `accent`, `accent2`, `accent3` |
| `clear_generated` | Remove generated components and return to the base dashboard |

Current slots:

| Slot | Render Location |
|------|-----------------|
| `rail` | Right-side generated component stack between the feed and mini insight panel |
| `stageOverlay` | Overlay cards inside the main visual stage |

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
| `action-panel` | Suggested viewer questions, watchlist items, or workflow steps |

Supported bindings:

| Binding | Meaning |
|---------|---------|
| `liveSummary.metrics` | Use the current channel metric summary |
| `liveSummary.feed` | Use the current channel feed rows |
| `liveSummary.highlights` | Use compact generated highlights from the current feed |
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
