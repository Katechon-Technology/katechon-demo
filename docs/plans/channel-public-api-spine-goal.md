# Channel Public API Spine Goal

## Objective

Build every public Katechon channel on a server-side data spine where cards and Kat mutations read from a normalized public provider envelope, a cached public snapshot, or an explicit unavailable state.

Core invariant: Kat can mutate presentation, focus, layout, and query parameters, but a card's data dependency must stay explicit and provider-backed. Spawned or mutated cards must carry a `dataBinding` with channel, provider, capability, query, freshness, provenance ids, and source URLs.

## Freshness States

- `live`: provider returned a usable public snapshot within its TTL.
- `cached`: stale-while-revalidate returned the last known good public snapshot.
- `unavailable`: provider failed and no cached public snapshot exists.

Synthetic data is allowed only behind local/dev fixtures and tests. Public demo claims should never use synthetic motion as a live fallback.

## Provider Rollout

| Tier | Channel | Primary | Secondary | Contract |
|---|---|---|---|---|
| 1 | `meme-coin` | DEX Screener | CoinGecko Pump.fun/indexed data | token velocity, liquidity, boosts, pair movement |
| 1 | `polyrec` | Polymarket Gamma | Polymarket public CLOB/Data APIs | active markets, odds, volume, history |
| 1 | `crypto-trading` | Hyperliquid Info | CoinGecko + DeFiLlama later | mids, candles, L2 depth |
| 1 | `power-grid` | EIA API v2 | Open-Meteo/NOAA weather later | load, forecast, generation, fuel mix |
| 2 | `news` | RSS | GDELT DOC 2.0 | source queue, story clusters |
| 2 | `spectre` | GDELT DOC/GEO | OpenStreetMap Overpass later | OSINT events and regions |
| 2 | `world-monitor` | GDELT | EIA/FRED optional later | geopolitical risk and macro pressure |
| 2 | `iran` | GDELT | EIA/Overpass later | regional signal and infrastructure context |
| 2 | `glance` | RSS | Hacker News Algolia + Open-Meteo | source wall and daily ops context |
| 3 | `biotech` | ClinicalTrials.gov API v2 | OpenAlex | trial and paper updates |
| 3 | `space` | NASA Exoplanet Archive TAP | JPL/NASA metadata later | candidates and observation queues |
| 3 | `quantum` | arXiv API | OpenAlex | paper velocity and topics |
| 3 | `deep-sea` | NOAA NDBC realtime files | NOAA/ERDDAP later | buoy and ocean sensor timelines |
| 3 | `viral` | CDC Open Data/Socrata | WHO Athena later | public health surveillance context |
| 3 | `dark-forest` | NASA Exoplanet Archive TAP | SIMBAD/VizieR later | stellar/catalog anomaly watch |
| 3 | `arena` | GitHub Actions | local benchmark JSON later | model/run scoreboards |
| 3 | `dune-deck` | local deck JSON | product analytics later | pitch progress and engagement |

## Runtime Requirements

- Browser components call Katechon channel routes, not external provider APIs.
- `/api/channels/:id/live`, `/context`, `/query`, and `/turn` expose shared freshness, provenance, and data-binding fields.
- Provider cache persists to `data/provider-cache.json` by default so reloads can use last-known-good snapshots.
- Provider health maps to `ok`, `rate_limited`, `empty`, `schema_changed`, or `timeout`.
- Public UI copy is limited to `Live data`, `Data cached`, and `Data unavailable`; provider details stay in provenance rows.

## Verification

- Every registered channel returns `ok`, `data`, `freshness`, `providerIds`, `provenance`, and `dataBinding` from `/live`.
- `/context` includes Kat-safe summaries from the same envelope.
- `/query` returns provenance and `dataBinding` for each supported capability.
- Zero-bounce channels load Crypto, Polyrec, and Meme from live/cached/unavailable public envelopes, never unlabeled synthetic state.
