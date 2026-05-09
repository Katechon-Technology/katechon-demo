# Channel Runtime Generalization Plan

## Goal

Turn each Katechon dashboard into a configurable live software channel: a watchable, scrollable, agent-shaped surface built around a feed, where Kat can query data, compose useful views, and let the channel become personalized through conversation.

The implementation should hand maximum useful work to the agent while keeping it inside a constrained runtime. The hardcoded layer should define the world rules; Kat should choose the query plan, layout, surface, component mix, copy, and explanation.

## Product Principles

- A channel is not a crypto dashboard, news board, or grid panel. A channel is `context + capabilities + state + surfaces + renderers + style`.
- Kat should produce structured channel update specs, not arbitrary browser code.
- Generated content should replace named surfaces by default so the interface stays clean.
- Chart and visual components should render over the channel graphic when they are the primary stage output.
- Every generated view must be grounded in either normalized live data, explicit user-provided rows, or existing channel/dashboard state.
- The runtime should feel open-ended because Kat composes primitives dynamically, not because the app cycles through canned options.

## Runtime Contract

Every channel exposes a manifest with:

- `context`: label, description, audience, domain vocabulary, active dashboard copy.
- `capabilities`: generic query actions such as `snapshot`, `timeseries`, `events`, `rankings`, `entity_detail`, `relationships`, `search`, and `historical_state`.
- `layouts`: reusable templates such as `overview`, `deep_dive`, `comparison`, `event_investigation`, `historical_replay`, `risk_anomaly`, and `relationship_map`.
- `surfaces`: replaceable output areas such as `stageOverlay`, `rail`, and `modal`.
- `components`: constrained render primitives such as chart, metric strip, timeline, table, feed stack, relationship graph, entity inspector, and action panel.
- `style`: allowed theme tokens and channel-specific aesthetic rules.

Kat produces:

```json
{
  "layout": { "template": "deep_dive" },
  "dataRequests": [
    { "capability": "timeseries", "params": { "entity": "BTC", "lookbackHours": 72 } }
  ],
  "surfaces": [
    {
      "surface": "stageOverlay",
      "mode": "replace",
      "components": [
        {
          "type": "vega-chart",
          "title": "BTC 72H Structure",
          "chart": {
            "type": "line",
            "binding": "liveData.candles",
            "x": "label",
            "y": "close"
          }
        }
      ]
    }
  ],
  "narration": "I put the 72-hour structure on the stage and kept depth available for inspection."
}
```

## Implementation Steps

1. Extract a channel manifest layer from `lib/channel-registry.js`.
   - Add generic data capabilities, layout templates, surface metadata, and component affordances.
   - Keep provider details as adapters behind generic capability names.

2. Add a generic capability query route.
   - `POST /api/channels/:channel/query`
   - Accepts `{ capability, params, detail }`.
   - Maps generic capabilities to each channel's current provider or synthetic fallback.
   - Returns normalized summaries, rows, and binding hints.

3. Add a generic channel update route and tool.
   - `POST /api/channels/:channel/update`
   - Realtime tool: `apply_channel_update`
   - Accepts one structured update containing layout, patch, theme tokens, and multiple surface operations.
   - Validates everything through the existing sanitizer layer before writing overrides.

4. Keep legacy dashboard mutation tools.
   - `apply_dashboard_chart`, `apply_dashboard_mutation`, and `apply_dashboard_edit` remain as compatibility helpers.
   - Prompt Kat to prefer generic `query_channel_capability` plus `apply_channel_update`.

5. Expand the renderer without loosening safety.
   - Add `modal` as a replaceable generated surface.
   - Add generic component types that render through existing card/table/list patterns.
   - Preserve the current visual system and chart-over-background behavior.

6. Add non-model fallbacks only as safety nets.
   - Deterministic parsing should remain available when model APIs are absent.
   - When model APIs are available, route generation requests through the model-created channel update spec first.

## Test Plan

- Syntax check modified JavaScript files with `node --check`.
- Build with `npm run build`.
- Smoke test channel manifest/context contains capabilities, surfaces, and layouts.
- Smoke test `POST /api/channels/:channel/query` for `snapshot`, `timeseries`, and a non-market channel fallback.
- Smoke test `POST /api/channels/:channel/update` writes a valid generated stage component to a temporary override DB.
- Smoke test browser rendering enough to confirm generated stage, rail, and modal surfaces do not stack unexpectedly.

## Demo Readiness Criteria

- A user can ask broad questions like "what is going on here?" and Kat can inspect channel state.
- A user can ask for arbitrary feed-shaped views without naming a hardcoded chart intent.
- Kat can choose a layout and surfaces from context.
- Generated components replace cleanly by default.
- Historical/stateful queries work through capabilities, not provider-specific browser code.
- The aesthetic still reads as Katechon across all channels.
