# Channels Architecture

Katechon uses "channels" as the native container for generated software state. A channel is not just a dashboard, video, feed, or chatbot. It is a live software object that combines data, agent behavior, memory, render surfaces, and sharing into one stateful unit.

In this application, the practical definition is:

```text
live feed + specialist agent + session state + layout grammar + render surfaces + memory + share object
```

The viewer can watch a channel passively, ask Kat to change it, see the visible surface rebuild around that request, then share or fork the resulting state. The strategic point is that software generated from a prompt stays alive as an inspectable object instead of being flattened into a screenshot or static link.

## What A Channel Contains

Each channel has a stable identity and a mutable runtime state.

The stable identity comes from `dashboard-share.js`, `public/dashboards/catalog.js`, and `lib/channel-registry.js`. These files define the channel id, label, description, category, default provider, visual shell, hero prompts, and public routes. For example, `crypto-trading` is a market channel backed by Hyperliquid, `polyrec` is a prediction-market channel backed by Polymarket, and `meme-coin` is a social market channel backed by PumpPortal plus token data fallbacks.

The mutable state is owned by the channel runtime in `server.js`. It tracks the current focus, entities, timeframe, selected layout, queried datasets, generated surfaces, conclusions, next actions, provenance, recent turns, and depth stack. That state is persisted in `data/channel-sessions.json` by session id, so a channel can remember what it currently means for a user instead of resetting to a static dashboard after every prompt.

## The Data Spine

Channels read through Katechon's normalized API layer rather than letting generated components call external provider APIs directly.

The main route is:

```text
GET /api/channels/:channel/live
```

It returns a live envelope with a consistent shape across providers:

- `channel`, `label`, `category`, and `contract` identify the channel.
- `providers`, `providerIds`, and `liveProvider` identify the source adapters.
- `freshness` is `live`, `cached`, or `unavailable`.
- `data` contains the provider-specific normalized payload.
- `provenance` records where the data came from.
- `dataBinding` names the channel, providers, capability, query, freshness, provenance ids, and public source URLs.

That envelope is the core safety boundary. Kat can change presentation, query parameters, layout, and focus, but generated charts and insights must carry their data binding forward. If a provider cannot refresh and there is no cache, the channel shows `Data unavailable` instead of pretending synthetic data is live.

## Kat And Specialist Agents

Kat is the single user-facing voice. Channel agents are specialist runtimes behind Kat, not separate characters.

Kat handles continuity, narration, routing, and user interaction. The channel agent owns the domain-specific work for one channel: vocabulary, provider knowledge, query planning, layout selection, surface composition, provenance policy, and next actions.

The runtime exposes this contract through:

```text
GET /api/channels/:channel/context
GET /api/channels/:channel/manifest
GET /api/channels/:channel/agent
```

The context route is compact and Kat-friendly. It includes current `liveSummary` metrics, feed rows, highlights, dashboard copy, provider docs, and rules. The manifest and agent routes expose the channel grammar: capabilities such as `snapshot`, `timeseries`, `events`, `rankings`, and `entity_detail`; layouts such as `overview`, `deep_dive`, `comparison`, and `historical_replay`; surfaces such as `stageOverlay`, `rail`, and `modal`; and safe component types such as `vega-chart`, `metric-strip`, `event-timeline`, `data-table`, and `entity-inspector`.

## Runtime Loop

Meaningful channel requests go through `route_channel_turn`, implemented by `POST /api/channels/:channel/turn`.

The loop is:

1. Parse the user's intent.
2. Update channel focus, entities, timeframe, and mode.
3. Query the normalized capability layer.
4. Select a layout.
5. Build a generated page or replace named surfaces.
6. Persist the new channel session state.
7. Emit morph events and Kat-ready narration.
8. Offer next useful actions.

This is why a request such as "BTC three months" should not merely add a chart. It should create a coherent channel state: a historical market layout, BTC as the active entity, three months as the timeframe, provider-backed candles, provenance-visible charting, supporting rail context, next prompts, and a shareable generated state id.

The streaming version, `GET /api/channels/:channel/turn/stream`, emits events such as `channel.intent.parsed`, `channel.data.query.completed`, `channel.layout.selected`, `channel.surface.replace`, and `channel.turn.completed`. The UI can use those events to make the channel feel like it is actively morphing rather than waiting for a static response.

## Rendering Model

The browser keeps a shared dashboard shell, but channel output is structured.

`public/dashboards/catalog.js` defines the base visual identity: scene, palette, labels, metrics, feed rows, prompts, and thumbnails. `public/dashboards/prototype.js` renders the shared shell and the generated runtime layer. Generated output is not arbitrary browser code. It is a validated spec that can set a layout, patch copy, update theme tokens, or replace known surfaces.

There are two main generated modes:

- Slot overrides: replace or append components in `stageOverlay`, `rail`, or `modal`.
- Generated page: a full channel page with thesis, stage, evidence rail, actions, provenance, ancestry, and depth.

The generated page path is the preferred product direction for important prompts because it makes the whole channel feel transformed. The base dashboard remains depth `0`; each meaningful prompt can push a new state onto the `depthStack`, producing an interaction like:

```text
Crypto Trading > BTC 3M Structure > ETH Comparison > Liquidity Detail
```

## Share, Replay, And Fork

A generated channel state can become a share object through `/api/channel-shares`. The share captures the channel id, prompt, headline, generated page, surfaces, provenance, data requests, narration, ancestry, and fork prompts. Shares are persisted in `data/channel-shares.json`.

When a recipient opens a share, the frontend loads the saved generated state and can replay it. When they fork it, the server seeds a new session from the share's state and runs the next channel turn from that point. This makes a shared channel more than a static permalink: it is a continuation point in the state graph.

## Architectural Principle

The hardcoded application defines the rules of the world: providers, freshness policy, manifests, allowed layouts, safe components, surfaces, sanitizers, persistence, and rendering. Kat and the specialist channel runtime choose the useful state inside those rules: what to query, what layout to use, what surface to replace, what to say, and what action should come next.

That split is the core architecture. It gives the product room to feel open-ended while preserving provenance, consistency, and user trust.

For endpoint-level details, see `docs/channel-apis.md`.
