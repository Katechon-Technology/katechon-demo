# Katechon Open Slide Workspace

This workspace is the Open Slide authoring target for the realtime Katechon investor deck. The live Express deck at `/dashboards/dune-deck/` generates a validated slide state, renders it immediately in the browser, and also materializes the latest result as an Open Slide React page at `slides/live-generated/index.tsx`.

Slides are React components. Each slide lives under `slides/<id>/index.tsx` and default-exports an array of page components. The `@open-slide/core` runtime handles layout, scaling, navigation, thumbnails, fullscreen play mode, and export.

## Getting started

```bash
npm --prefix open-slide/katechon-investor run dev
```

The dev server uses port `5175` by default. The generated slide target is `slides/live-generated/index.tsx`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dune:slides:dev` | Start the Open Slide dev server from the repo root. |
| `npm run dune:slides:build` | Build the Open Slide workspace from the repo root. |
| `npm run dev` | Start the Open Slide dev server from this folder. |
| `npm run build` | Build a static Open Slide bundle. |
| `npm run preview` | Preview the built bundle locally. |

## Authoring a slide

```tsx
// slides/my-slide/index.tsx
import type { Page, SlideMeta } from '@open-slide/core';

const Cover: Page = () => (
  <div style={{ width: '100%', height: '100%' }}>Hello</div>
);

export const meta: SlideMeta = { title: 'My slide' };
export default [Cover] satisfies Page[];
```

Every page renders into a fixed **1920 × 1080** canvas — design with absolute pixel values. Put images, videos, and fonts under `slides/<id>/assets/` and import them directly.

Read these files before making investor-facing slides:

- `../../docs/katechon-company-context.md`
- `AGENTS.md`
- `.agents/skills/slide-authoring/SKILL.md`
- `themes/katechon-generative.md`
- `examples/live-generated-slide.example.tsx`

## Navigation

- Arrow keys / PageUp / PageDown move between pages.
- `F` enters fullscreen play mode; Esc exits.
- In play mode: Space / → next, ← prev.

## Agent integration

This workspace ships with local agent skills under `.agents/skills/`. Ask the agent to make or edit Open Slide pages and the skills describe the framework contract. Use `apply-comments` to iterate via inspector-style markers inside source.

## Config

Optional `open-slide.config.ts` at the workspace root:

```ts
import type { OpenSlideConfig } from '@open-slide/core';

const openSlideConfig: OpenSlideConfig = {
  port: 5173,
};

export default openSlideConfig;
```

Supported fields: `slidesDir`, `port`.
