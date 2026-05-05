# Dashboard Tunnel Transition

## Goal

Replace the dashboard iframe's vertical swap with a centered, high-performance tunnel materialization effect that preserves the existing overlay, channel order, narration, fullscreen behavior, and two-iframe buffering model.

## Option 1: Snap Tunnel Compositor

The current active iframe expands forward and fades as if passing the camera. The buffered iframe starts centered behind it at a smaller scale and lower opacity, then sharpens into the active surface.

- Uses only compositor-friendly CSS properties: opacity, transform, and light filter.
- Keeps the existing iframe lifecycle and load timeout fallback.
- Adds non-interactive stage layers for a radial depth grid, aperture glow, scan streaks, and vignette.
- Uses Anime.js timelines when available, with CSS transitions as the fallback path.

This is the lowest-risk path because it changes the reveal animation without changing iframe ownership, routing, dashboard internals, or scroll semantics.

## Option 2: Scroll-Scrubbed Endless Tunnel

Dashboard transitions are mapped continuously to wheel or trackpad input. The active and next dashboards would live on a depth rail, with scroll progress controlling scale, opacity, and depth until a threshold commits the switch.

- Gives the strongest sense of continuous navigation.
- Requires more state for partial progress, cancelation, and velocity handling.
- Increases risk of iframe desync during fast input or delayed frame loads.
- Needs tighter input normalization across mouse wheels, trackpads, and keyboard navigation.

This is better suited for a later version after the snap transition proves reliable.

## Option 3: Generative Portal Mask

Dashboard switches use a generated mask or shader-like portal overlay to reveal the incoming iframe through an aperture, with visual noise or energy bands hiding the handoff.

- Can look distinctive and branded.
- Risks adding raster/video assets or canvas rendering to a surface that currently only needs DOM/CSS.
- Requires more tuning for fullscreen, reduced motion, and performance on lower-end hardware.
- Adds more moving parts without improving iframe lifecycle reliability.

This should wait until the interaction model is stable and there is a stronger art direction for the portal itself.

## Recommendation

Implement Option 1 first. It is fast, centered, reliable, and least disruptive to the current dashboard architecture. It also leaves a clear upgrade path: the same tunnel state classes and effect layers can later support scroll-scrubbed progress or a richer portal mask.

## Validation

- `npm run build`
- `npm run dev`
- Wheel down advances dashboards with tunnel materialization.
- Wheel up reverses the depth feel without moving content vertically.
- Arrow, page, and space keys still switch dashboards.
- Back returns home and clears both iframe buffers.
- Fullscreen mode preserves the stage effect.
- Reduced-motion mode uses an opacity-only swap.
- Repeated fast wheel input does not desync active and buffer iframe state.
