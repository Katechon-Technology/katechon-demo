---
id: katechon-generative
mode: dark
---

# Katechon Generative Slide Theme

Use this theme for investor-facing Open Slide pages generated from live prompts.

## Intent

The slide should prove the product while explaining it. It should look like a live software object becoming a presentation artifact, not like a static template with changed words.

## Canvas

- Fixed Open Slide canvas: 1920 x 1080.
- Root fills the full canvas with `width: '100%'` and `height: '100%'`.
- Prefer absolute positioning for rails, traces, nodes, and panels.
- Use one generated page per investor prompt unless the user explicitly asks for a multi-page deck.

## Palette

```ts
const palette = {
  bg: '#050608',
  panel: '#0d1110',
  panelHi: '#141a18',
  text: '#f5f2ea',
  soft: '#b8b0a4',
  muted: '#716b63',
  line: 'rgba(245,242,234,0.14)',
  red: '#e04a2f',
  green: '#31d07f',
  blue: '#53a7ff',
  amber: '#f3c85e',
};
```

Pick one accent per slide. Do not turn the whole slide into one hue.

## Typography

- Display: system sans, 132 to 190 px.
- Heading: 74 to 108 px.
- Body: 30 to 42 px.
- Labels: 20 to 26 px, uppercase, monospace.
- Letter spacing must be `0`.
- Keep the headline under three lines.

## Layout Grammar

Default composition:

- top-left metadata rail: context, model, generated state;
- large left headline block;
- right or lower-right generated object diagram;
- bottom state rail or provenance/action line;
- thin traces and signal nodes in the background.

Recommended page types:

- Problem chain: generated software -> screenshot/video/post -> state loss.
- Object model: feed + agent + state + surface + memory + share.
- Runtime loop: intent -> data -> layout -> surface -> narration -> next action.
- Wedge loop: watch -> command -> share -> fork -> act.
- Moat map: state graph + provider graph + interaction graph + distribution.

## Variation Contract

Generated slides must not default to the same card stack. Choose the composition from the content:

- `chain`: problem, failure, before/after, state loss.
- `orbit`: object model, channel definition, Kat plus agents.
- `timeline`: runtime, state transition, how it works.
- `matrix`: moat, comparison, evidence, investor tradeoff.
- `constellation`: graph, distribution, discovery, actions, share/fork loop.
- `terminal`: live proof, code, schema, provenance, realtime stream.
- `stack`: layers, system architecture, model/data/state/surface.
- `splitCards`: only for a plain thesis where none of the above fits.

If the previous generated page used one composition, the next page should choose a different one unless the user's prompt explicitly asks for the same structure.

## Copy Rules

- One sharp headline.
- One support sentence.
- Two to four proof cards.
- Optional state rail labels.
- Narration under 55 words.
- No invented metrics, traction, customers, deals, revenue, valuation, or live data.

## Background Template

Keep the background stable enough that every slide feels Katechon-native:

- black-green base;
- faint grid or traces;
- one red/green/blue/amber accent;
- small signal nodes and rails;
- no decorative bokeh, no stock gradients, no mascot imagery.

## Realtime Signal

The slide should make generation visible through content or structure. Use labels like:

- repo context;
- company memory;
- Open Slide page;
- schema validated;
- state mounted.

Do not write tutorial text. The visible signal should feel like product telemetry.
