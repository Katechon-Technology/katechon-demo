# Channel Agent Runtime Architecture

## Goal Contract

Build Katechon channels as live, stateful, agent-driven software surfaces.

The user should experience Kat as the constant companion, voice, narrator, and
guide. Each channel should have its own specialist agent that understands the
channel context, can query real data feeds, can update the channel's state, and
can rebuild the visible surface around the conversation in near realtime.

This is not a chart-generation feature. The goal is for each channel to evolve
as the user talks to Kat. A request like "let's dive into BTC three month price"
should rebuild the channel around that investigation: focus, layout, data,
stage visualization, supporting context, provenance, and next useful actions.

## Product Thesis

Katechon turns live software into channels people can watch, scroll, and
eventually act inside.

Each channel is built around a specific data feed. As the user interacts with
the channel, it becomes their own: the focus, visible surfaces, suggested next
actions, and explanatory context adapt to the conversation.

The target feeling is closer to a configurable world than a static dashboard:
approachable like Roblox or Minecraft, but grounded in real data, clean
interaction, and the Katechon aesthetic.

## Codex Goal Style

OpenAI's Codex `/goal` guidance says a good long-running objective needs a
clear target, a validation loop, files or docs to read first, scoped progress
checkpoints, and a verifiable stopping condition.

The implementation goal should be handed off like this:

```text
/goal Implement the Channel Agent Runtime described in docs/plans/channel-agent-runtime-architecture.md without stopping until the app has a working crypto channel agent and at least one second channel agent, both capable of using real data where available, updating channel session state, morphing the visible channel layout around user requests, and proving through tests/traces that generated charts and insights are backed by real provider data or clearly labeled fallback data.
```

The implementation agent must read this file first, then:

- `docs/channel-apis.md`
- `docs/plans/channel-runtime-generalization.md`
- `lib/channel-registry.js`
- `server.js`
- `public/index.html`
- `public/dashboards/prototype.js`
- `public/prototype-dashboard.html`
- `public/dashboards/catalog.js`

## Core Definitions

### Kat

Kat is the universal agent. She is always with the user.

Kat owns:

- voice and speech interaction
- user continuity across channels
- channel switching
- narration
- high-level routing
- continuity of user preferences
- deciding when to ask clarifying questions

Kat should not be the domain expert for every channel. She should route active
channel work to the current channel agent and speak the result in her voice.

### Channel Agent

A channel agent is the specialist brain for one channel.

It owns:

- domain context
- data source knowledge
- API query planning
- channel session state
- layout selection
- visualization and component composition
- provenance requirements
- suggested next actions
- channel-specific examples and vocabulary

The user should not feel like they are talking to multiple characters. Kat is
the voice. The channel agent is the intelligence inside the channel.

### Channel

A channel is:

```text
feed + channel agent + session state + layout grammar + render surfaces + memory
```

A channel is not:

- a fixed dashboard
- a collection of hardcoded charts
- a generic renderer with shallow prompts
- a carousel of pregenerated layouts

### Channel Session State

The channel session state is the source of truth for what the channel currently
means.

It should include:

- active focus
- entities
- timeframe
- user intent
- selected layout mode
- queried datasets
- generated surfaces
- visible conclusions
- unresolved questions
- next suggested actions
- provenance records
- recent conversation turns

Every meaningful user turn should update this state.

## Target Experience

### Landing On A Channel

When the user opens a channel:

1. Kat remains present and connected.
2. The channel agent wakes with its manifest and current feed state.
3. The channel shows a high-level overview based on real data where possible.
4. Kat gives a concise spoken orientation.
5. The channel presents useful next paths as native UI affordances.

Example for crypto:

```text
Kat: Crypto is live. BTC is the anchor right now. I can look at price structure,
liquidity, anomalies, or compare it against ETH.
```

The UI should not display a tutorial. It should feel like an active channel that
already knows what can be done next.

### Conversation Turn

Every user turn follows this loop:

1. Parse intent.
2. Update channel focus.
3. Query data.
4. Select layout.
5. Build or replace surfaces.
6. Explain what changed.
7. Offer the next useful move.

The important behavior is that the whole channel morphs around the user's
request. The chart is one artifact inside a broader state transition.

### Example: BTC Three Month Price

User:

```text
Let's dive into the BTC three month price.
```

The crypto channel agent should infer:

```json
{
  "focus": {
    "topic": "BTC price structure",
    "entities": ["BTC"],
    "timeframe": "3 months",
    "mode": "historical_deep_dive"
  },
  "requiredData": [
    {
      "capability": "historical_timeseries",
      "provider": "hyperliquid",
      "params": {
        "coin": "BTC",
        "interval": "1d",
        "lookbackDays": 90
      }
    }
  ],
  "layout": "historical_replay",
  "stageIntent": "primary historical price visualization",
  "railIntent": "trend summary, key levels, data provenance, next actions"
}
```

The channel should then rebuild:

- Stage: BTC three-month price visualization.
- Rail: current market stats, trend shifts, key levels, notable drawdowns.
- Secondary surfaces: next actions such as compare ETH, zoom last 7 days, add
  liquidity/depth, inspect volatility regime.
- Kat: short explanation of the new focus and where to go next.

## Non-Negotiable Requirements

1. Kat is always the voice and companion.
2. Every channel has a specialist agent contract.
3. Channels morph through state transitions, not one-off widget insertion.
4. Generated charts and insights must be grounded in real data or clearly
   labeled fallback data.
5. Synthetic data must never be presented as real.
6. Generated surfaces replace by default. They do not stack into clutter.
7. The app should keep the Katechon aesthetic across all channels.
8. OpenAI Realtime voice should be the primary voice path and should not silently
   fall back to legacy after the first command.
9. The model gets meaningful freedom inside strict constraints: layouts,
   surfaces, tools, style tokens, components, and provenance rules.
10. The runtime must be generalizable across channels, not crypto-specific.

## Current Implementation Reality

The current repo already has useful pieces:

- channel registry and provider metadata
- channel context and live data routes
- channel capability querying
- generated surface rendering
- stage/rail/modal generated surfaces
- OpenAI Realtime session support
- legacy dashboard mutation tools

The current repo also has problems this architecture must fix:

- Kat is still too generic.
- Channel-specific intelligence is thin.
- Synthetic fallback is too easy to confuse with real feed-backed output.
- UI changes are applied as final mutations instead of streamed morph events.
- Voice can flip from OpenAI Realtime into legacy `/api/agent`.
- Anthropic and ElevenLabs are still active control/voice paths, which makes the
  runtime hard to reason about.
- Generated views can feel like selected templates rather than channel evolution.

## High-Level Architecture

```text
Browser
  |
  | OpenAI Realtime voice session
  v
Kat Runtime
  |
  | routes active channel turn
  v
Channel Agent Runtime
  |
  | reads manifest + session state
  | calls data tools
  | emits morph events
  v
Channel Morph Engine
  |
  | validates layouts, surfaces, components, provenance
  v
Dashboard Renderer
  |
  | replaces stage, rail, modal, supporting surfaces
  v
Live Channel UI
```

### Runtime Components

#### Kat Runtime

Responsible for:

- maintaining one active OpenAI Realtime voice session
- applying `session.update` when the active channel changes
- exposing Kat-level tools
- forwarding channel-specific turns to the current channel agent
- speaking concise summaries from channel results
- never inventing channel-specific facts

#### Agent Router

Responsible for:

- resolving the active channel
- loading the channel agent manifest
- loading or creating channel session state
- forwarding user turns to the channel agent
- handling channel switch events

#### Channel Agent Runtime

Responsible for:

- interpreting the user's channel-specific intent
- querying the right data capabilities
- updating channel session state
- choosing a layout mode
- composing surface updates
- attaching provenance
- emitting progressive events

#### Data Adapter Layer

Responsible for:

- provider-specific API calls
- normalized data envelopes
- historical query support
- cache metadata
- failure metadata
- explicit fallback labeling

#### Morph Engine

Responsible for:

- validating channel agent output
- applying layout changes
- replacing surfaces
- preserving aesthetic constraints
- rejecting unsupported component specs
- keeping surface transitions clean

#### Renderer

Responsible for:

- rendering generated components
- rendering Vega or chart specs
- keeping charts clickable
- placing primary charts over the background graphic
- making generated surfaces feel native to the channel

#### Eval And Trace Layer

Responsible for:

- recording every agent turn
- proving which API query backed each insight
- detecting synthetic fallback use
- validating that voice stayed on OpenAI Realtime
- running prompt and behavior evals

## Agent Contracts

### ChannelAgentManifest

Each channel should expose a manifest. This is stable context that can be cached
and prompt-cached.

```json
{
  "id": "crypto-trading",
  "label": "Crypto Trading",
  "agent": {
    "name": "crypto-channel-agent",
    "role": "Specialist market structure agent for crypto trading surfaces.",
    "openingBehavior": {
      "brief": "Summarize current market state in one short Kat-ready line.",
      "suggestedPaths": [
        "price structure",
        "liquidity and depth",
        "volatility regime",
        "BTC vs ETH comparison",
        "historical replay"
      ]
    }
  },
  "domain": {
    "entities": ["BTC", "ETH", "SOL"],
    "vocabulary": ["price", "candles", "liquidity", "spread", "drawdown", "volatility"],
    "defaultTimeframes": ["24h", "7d", "30d", "90d"]
  },
  "data": {
    "adapters": ["hyperliquid"],
    "capabilities": [
      "snapshot",
      "timeseries",
      "historical_timeseries",
      "entity_detail",
      "rankings"
    ],
    "provenanceRequired": true,
    "syntheticPolicy": "label_only_never_claim_real"
  },
  "layouts": [
    "overview",
    "historical_replay",
    "deep_dive",
    "comparison",
    "risk_anomaly"
  ],
  "surfaces": ["stageOverlay", "rail", "modal", "below"],
  "components": [
    "vega-chart",
    "metric-strip",
    "insight-card",
    "data-table",
    "event-timeline",
    "action-panel"
  ],
  "style": {
    "inherits": "katechon",
    "allowedTokens": ["accent", "danger", "muted", "panelGlass", "gridLine"],
    "rules": [
      "Primary charts render over the stage graphic.",
      "Generated surfaces replace by default.",
      "Do not add decorative one-off themes."
    ]
  }
}
```

### ChannelSessionState

Dynamic state for a user's current channel session.

```json
{
  "channelId": "crypto-trading",
  "sessionId": "local-session-id",
  "focus": {
    "topic": "BTC three month price structure",
    "entities": ["BTC"],
    "timeframe": {
      "label": "3 months",
      "start": "2026-02-08T00:00:00.000Z",
      "end": "2026-05-08T00:00:00.000Z"
    },
    "mode": "historical_replay"
  },
  "layout": {
    "template": "historical_replay",
    "rationale": "User asked for a historical BTC deep dive."
  },
  "datasets": [
    {
      "id": "btc-90d-candles",
      "capability": "historical_timeseries",
      "provider": "hyperliquid",
      "status": "ready",
      "provenanceId": "prov_123"
    }
  ],
  "surfaces": {
    "stageOverlay": ["btc-90d-price-chart"],
    "rail": ["btc-market-structure-summary", "btc-next-actions"],
    "modal": []
  },
  "conclusions": [
    {
      "text": "BTC is being inspected through three-month price structure.",
      "provenanceIds": ["prov_123"]
    }
  ],
  "nextActions": [
    "Compare ETH over the same window",
    "Zoom into the last 7 days",
    "Add liquidity/depth context",
    "Inspect volatility regime"
  ],
  "turns": [
    {
      "role": "user",
      "text": "Let's dive into the BTC three month price.",
      "at": "2026-05-08T00:00:00.000Z"
    }
  ]
}
```

### ChannelTurnRequest

```json
{
  "channelId": "crypto-trading",
  "userText": "Let's dive into the BTC three month price.",
  "katContext": {
    "voiceMode": "openai-realtime",
    "activeChannel": "crypto-trading"
  },
  "state": {},
  "manifest": {},
  "clientCapabilities": {
    "surfaces": ["stageOverlay", "rail", "modal", "below"],
    "supportsStreaming": true,
    "supportsVega": true,
    "supportsClickableCharts": true
  }
}
```

### ChannelTurnEvent

The channel agent should stream events. The browser should render progress and
surface changes as soon as events arrive.

```json
{
  "type": "channel.surface.replace",
  "channelId": "crypto-trading",
  "turnId": "turn_123",
  "surface": "stageOverlay",
  "components": []
}
```

Required event types:

- `channel.turn.started`
- `channel.intent.parsed`
- `channel.state.updated`
- `channel.data.query.started`
- `channel.data.query.completed`
- `channel.data.query.failed`
- `channel.layout.selected`
- `channel.surface.replace`
- `channel.surface.clear`
- `channel.narration.delta`
- `channel.next_actions.updated`
- `channel.turn.completed`

### SurfaceUpdate

```json
{
  "surface": "stageOverlay",
  "mode": "replace",
  "components": [
    {
      "id": "btc-90d-price-chart",
      "type": "vega-chart",
      "title": "BTC 3M Price Structure",
      "body": "Daily BTC closes over the last 90 days.",
      "chart": {
        "type": "line",
        "binding": "dataset:btc-90d-candles",
        "x": "time",
        "y": "close",
        "variant": "price-structure"
      },
      "interactions": [
        {
          "type": "click-point",
          "action": "inspect_candle"
        }
      ],
      "provenanceIds": ["prov_123"]
    }
  ]
}
```

### ProvenanceRecord

```json
{
  "id": "prov_123",
  "sourceType": "live_api",
  "provider": "hyperliquid",
  "capability": "historical_timeseries",
  "params": {
    "coin": "BTC",
    "interval": "1d",
    "lookbackDays": 90
  },
  "queriedAt": "2026-05-08T00:00:00.000Z",
  "cache": {
    "status": "miss",
    "ttlMs": 15000
  },
  "rowCount": 90,
  "status": "success"
}
```

Valid `sourceType` values:

- `live_api`
- `historical_api`
- `cached_api`
- `user_supplied`
- `derived_from_api`
- `synthetic_fallback`
- `unavailable`

If `sourceType` is `synthetic_fallback`, the UI and Kat's response must make
that explicit.

## Tool Design

### Kat-Level Tools

Kat should have a small universal tool surface:

- `open_channel`
- `get_active_channel`
- `route_channel_turn`
- `clear_channel_surfaces`
- `summarize_channel_state`

Kat should not directly call provider-specific APIs unless no channel is active.

### Channel-Level Tools

Each channel agent should receive tools selected from its manifest:

- `query_feed`
- `query_history`
- `query_entity`
- `query_rankings`
- `query_relationships`
- `query_events`
- `build_surface`
- `replace_surface`
- `clear_surface`
- `update_channel_state`
- `suggest_next_actions`

The server executes tools and returns structured outputs. The model composes
inside the allowed runtime; it does not write arbitrary browser code.

### OpenAI Realtime Integration

Use OpenAI Realtime as the primary voice path.

The browser should maintain a persistent Realtime session while Kat is active.
On channel switch, send `session.update` with:

- current channel manifest summary
- current channel session state summary
- available Kat-level tools
- active channel tool definitions or a `route_channel_turn` tool
- voice settings

Function tools are the right default because Katechon owns the private business
logic and data adapters. The model emits a function call, the server runs the
tool, and the client returns `function_call_output`.

Do not silently fall back from OpenAI Realtime to legacy voice after the first
command. If Realtime fails:

- show explicit voice degraded state
- preserve the user's selected voice mode
- allow reconnect
- record trace event
- avoid permanently setting the session to legacy unless the user requests it

## Channel Morphing

The morph engine should treat every turn as a possible layout transition.

Examples:

| User request | Layout | Stage | Rail | Next actions |
| --- | --- | --- | --- | --- |
| "What is going on?" | `overview` | market/feed overview | top signals | dive, compare, inspect |
| "BTC 3 month price" | `historical_replay` | BTC historical chart | trend summary | compare ETH, zoom 7d |
| "Compare BTC and ETH" | `comparison` | dual series chart | divergence summary | add SOL, inspect spread |
| "What changed today?" | `event_investigation` | event/timeline view | source rows | open details, replay |
| "Show anomalies" | `risk_anomaly` | anomaly chart/map | risk drivers | inspect entity |

The user should feel the channel becoming the query.

## Layout Grammar

Initial layout set:

- `overview`: current state and suggested paths
- `deep_dive`: one topic/entity with supporting evidence
- `historical_replay`: time-window investigation
- `comparison`: two or more entities, feeds, or periods
- `event_investigation`: source/event/timeline-led analysis
- `risk_anomaly`: outlier/risk/threshold view
- `relationship_map`: entities and edges

The model chooses among these, but the renderer owns the final CSS and visual
constraints.

## Surface Grammar

Initial surfaces:

- `stageOverlay`: primary generated visual over the channel graphic
- `rail`: compact supporting insights and actions
- `modal`: focused drilldown, replacing any previous modal
- `below`: optional lower expanded view if the dashboard supports it

Default mode is `replace`.

`append` is only valid when:

- the user explicitly asks to keep multiple items
- the target surface is designed as a feed
- the update stays within the surface's max component count

## Component Grammar

Initial components:

- `vega-chart`
- `metric-strip`
- `insight-card`
- `data-table`
- `event-timeline`
- `feed-stack`
- `entity-inspector`
- `relationship-graph`
- `action-panel`

The component grammar can grow, but each component must have:

- schema validation
- responsive layout rules
- provenance support
- empty/error state
- click interaction contract where applicable

## Data Policy

The agent may only make live claims from:

- current API response
- cached API response with visible freshness
- derived calculations from API data
- user-provided data

The agent may not:

- invent prices
- invent market moves
- invent events
- hide synthetic fallback
- use generated copy as evidence
- imply historical availability if the adapter cannot query history

If data is unavailable, the channel should still morph around the request, but
the state should be an honest "adapter unavailable" or "connect feed" state.

Example:

```text
Kat: I can rebuild this as a three-month BTC view, but the current adapter did
not return historical candles. I am showing the requested structure with the
data gap called out.
```

## Realtime Insight Generation

The desired interaction is not "wait, then replace everything." It should feel
progressive:

1. User releases push-to-talk.
2. Kat acknowledges or preambles.
3. Channel shows query/build status.
4. Stage skeleton changes to the target investigation.
5. Data lands.
6. Chart renders.
7. Rail updates with interpretation and next actions.
8. Kat gives a concise explanation.

Target latency budgets for the demo:

- Intent acknowledgement: under 500 ms after transcript is available.
- Layout skeleton: under 1 second.
- First real data query response: provider-dependent, but visible status must
  appear immediately.
- Surface replacement after data: under 500 ms after tool result.
- Full turn: ideally under 5 seconds for common crypto/grid requests.

## Evaluation Plan

### Contract Tests

Add tests that validate:

- every channel manifest has required fields
- every channel capability has a data adapter or explicit unavailable state
- every surface update validates against the component grammar
- every generated chart has at least one provenance record
- synthetic fallback cannot be labeled as `live_api`

### Agent Trace Tests

For each eval prompt, assert the trace shape:

1. intent parsed
2. data query started
3. data query completed or failed honestly
4. state updated
5. layout selected
6. surface replaced
7. provenance attached

### Voice Path Tests

Test that OpenAI Realtime stays active across repeated commands:

- enable Realtime voice
- issue five consecutive mock turns
- assert no `/api/agent` call was made
- assert no ElevenLabs TTS call was made for Realtime responses
- assert session context updates on channel switch
- assert a Realtime failure produces visible degraded state, not silent permanent
  legacy fallback

### Browser Smoke Tests

Use browser automation to verify:

- channel opens
- generated stage appears over the background graphic
- rail updates
- modal replaces rather than stacks
- chart is visible and nonblank
- chart has clickable points or regions where the component declares
  interactions
- text does not overlap badly at desktop and mobile widths

### Demo Evals

Initial prompts:

- "What is going on here?"
- "Let's dive into BTC three month price."
- "Compare BTC and ETH over the last month."
- "Show me what changed today."
- "Clear that and look at liquidity instead."
- "What should I inspect next?"
- "Switch to power grid and tell me what matters."
- "Show grid risk over the last day."

Each prompt should produce a visible channel morph, not only a spoken answer.

## Implementation Milestones

### Milestone 0: Stabilize Voice Routing

Objective:

Make OpenAI Realtime the sticky primary voice path.

Tasks:

- remove or gate silent legacy fallback
- add voice provider trace events
- ensure channel switches call `session.update`
- ensure Realtime tools include channel routing
- keep legacy voice available only as explicit degraded mode

Validation:

- repeated voice commands stay on OpenAI Realtime
- logs show Realtime session, tool call, function output, response completion
- legacy `/api/agent` is not called from Realtime mode

### Milestone 1: Manifest And State Runtime

Objective:

Introduce explicit channel agent manifests and session state.

Tasks:

- add manifest schema
- add session state schema
- add state storage
- add `GET /api/channels/:channel/agent`
- add `GET /api/channels/:channel/state`
- add `POST /api/channels/:channel/turn`

Validation:

- crypto and power grid expose complete manifests
- state persists across multiple turns in one browser session
- state updates are inspectable through API

### Milestone 2: Crypto Channel Agent

Objective:

Make crypto the first convincing specialist channel.

Tasks:

- implement BTC/ETH/SOL intent parsing through model/tool schema
- support current snapshot and historical timeseries
- build overview, historical replay, comparison, and risk/anomaly layouts
- attach Hyperliquid provenance
- expose next action suggestions

Validation:

- "BTC three month price" queries real historical data or reports unavailable
- channel morphs into historical replay
- generated chart has provenance
- rail includes data-backed summary and next actions

### Milestone 3: Streaming Morph Events

Objective:

Make building feel realtime.

Tasks:

- add SSE or WebSocket channel turn stream
- emit channel turn events
- render skeleton and status events
- apply surface replacements progressively

Validation:

- browser visibly changes before final assistant response
- trace records every build step
- failed data query still produces an honest, useful channel state

### Milestone 4: Second Channel Generalization

Objective:

Prove this is not crypto-specific.

Tasks:

- implement power grid channel agent
- map EIA capabilities into the same turn/state/surface contract
- support overview, historical/state view, anomaly/risk view

Validation:

- same runtime handles crypto and power grid
- channel-specific manifests differ, runtime code remains generic
- eval prompts pass for both channels

### Milestone 5: Demo Hardening

Objective:

Make the flow smooth enough for a live demo.

Tasks:

- clean transitions
- add source/provenance chips
- add empty and failed states
- add "suggested next move" affordances
- tune Kat narration
- remove confusing provider toggles

Validation:

- demo script can flow across at least two channels
- no obvious fake-live charts
- no silent voice model flip
- generated layouts replace cleanly

## Handoff Instructions For Implementation Agent

Read these first:

1. `docs/plans/channel-agent-runtime-architecture.md`
2. `docs/channel-apis.md`
3. `docs/plans/channel-runtime-generalization.md`
4. `server.js`
5. `lib/channel-registry.js`
6. `public/index.html`
7. `public/dashboards/prototype.js`
8. `public/prototype-dashboard.html`
9. `public/dashboards/catalog.js`

Do not start by adding more chart templates.

Start by making the runtime honest and stateful:

1. stabilize voice routing
2. define channel agent manifest/state contracts
3. implement crypto end to end
4. stream morph events
5. generalize with power grid

Do not remove existing legacy routes until replacement behavior is verified.

Do not present synthetic fallback as real.

Do not let generated components stack without explicit user intent.

Keep changes scoped. Prefer adding the new runtime beside current compatibility
routes, then route the UI to it when verified.

## Suggested `/goal` Prompt

```text
/goal Implement docs/plans/channel-agent-runtime-architecture.md without stopping until the app has a working Channel Agent Runtime for crypto and power grid. Read the architecture doc, docs/channel-apis.md, docs/plans/channel-runtime-generalization.md, server.js, lib/channel-registry.js, public/index.html, public/dashboards/prototype.js, public/prototype-dashboard.html, and public/dashboards/catalog.js before editing. Work in checkpoints: first stabilize OpenAI Realtime voice routing so it does not silently fall back to legacy after the first command; then add channel agent manifests and session state; then implement the crypto agent turn flow with real/synthetic provenance; then add streamed morph events and renderer support; then prove the same runtime with power grid. Validate with node --check, npm run build, API smoke tests for manifest/state/turn/query/update, and browser smoke tests showing generated stage/rail/modal replacement. Stop only when repeated voice/channel turns stay on the intended path, BTC three-month price rebuilds the crypto channel around real historical data or an explicitly labeled data gap, generated charts include provenance, and power grid proves the runtime is not crypto-specific. Pause if implementation requires new external credentials, a destructive migration, or product guidance about unsupported data claims.
```

## Progress Report Format

During implementation, progress updates should be compact:

```text
Checkpoint: [name]
Verified: [commands, traces, or screenshots that passed]
Remaining: [next concrete work]
Blocked: [none or exact blocker]
```

## Stopping Condition

The goal is complete when:

- Kat remains the universal voice/narrator.
- Crypto and power grid each have channel agent manifests.
- Channel session state changes after each meaningful turn.
- At least one user request rebuilds the whole crypto channel around BTC
  three-month price.
- The runtime queries real provider data when available.
- Every generated chart/insight has provenance.
- Synthetic or unavailable data is explicitly labeled.
- Generated surfaces replace cleanly by default.
- OpenAI Realtime does not silently flip to legacy after the first command.
- Tests and smoke checks prove the behavior.

## References

- OpenAI Codex `/goal`: https://developers.openai.com/codex/use-cases/follow-goals
- OpenAI Realtime voice sessions: https://developers.openai.com/api/docs/guides/realtime#voice-agent-sessions
- OpenAI Realtime tools: https://developers.openai.com/api/docs/guides/realtime-mcp
- OpenAI `gpt-realtime-2`: https://developers.openai.com/api/docs/models/gpt-realtime-2
- Pi skills model for package/context inspiration: https://pi.dev/docs/latest/skills
- Pi RPC/event stream inspiration: https://pi.dev/docs/latest/rpc
