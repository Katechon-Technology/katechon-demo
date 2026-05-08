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

SPECTRE and OSINT:

- Raw SPECTRE stays available through the existing dashboard proxy.
- The channel route exposes normalized event-room state now and can later attach source/event adapters behind the same contract.

## Kat Component Contract

Kat-generated dashboard components should:

- Read channel state from `/api/channels/:channel/live`.
- Read compact voice/build context from `/api/channels/:channel/context`.
- Read docs and provider context from `/api/channels/:channel/docs`.
- Render only from the normalized payload passed into the component.
- Treat `stale`, `source`, and `fallbackReason` as first-class UI state.
- Stay channel-scoped so a generated component can be enabled, replaced, or rolled back without changing the shared shell.

Kat-generated dashboard components should not:

- Fetch Hyperliquid, Polymarket, CoinGecko, or other provider APIs directly from the browser component.
- Add trading, wallet, KYC, paid, or login-only flows in v1.
- Hide fallback state from the user.

## Example Calls

```bash
curl http://localhost:4040/api/channels
curl http://localhost:4040/api/channels/crypto-trading/live
curl http://localhost:4040/api/channels/polyrec/docs
curl "http://localhost:4040/api/channels/dashboard123/live?coin=ETH"
```
