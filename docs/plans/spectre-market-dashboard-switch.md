# SPECTRE Market Dashboard Switch Plan

## Goal

Replace the demo stream's vanilla SPECTRE dashboard with the market-enhanced SPECTRE surface from `../katechon-app`, while keeping the stream focused on market intelligence only. The target experience is raw SPECTRE as the base OSINT map, with Katechon market overlays on top: Polymarket rotation, market ticker, and generated market dashboards.

This plan intentionally does not implement the switch. It defines the migration path, validation points, and rollback surface for a follow-up implementation PR.

## Current State

- `katechon-demo` runs the public demo UI/API on the remote host at `/opt/katechon/katechon-demo`.
- The stream compositor is defined in `entrypoint-hls.sh` and serves an iframe workspace for SPECTRE.
- The SPECTRE workspace currently points directly at raw Flask SPECTRE:
  - `http://host.docker.internal:3010/?kiosk=1`
- On `claudetorio-stream-server`, port `3010` is the running Flask SPECTRE process from `/opt/katechon/katechon-app/applications/SPECTRE`.
- The richer SPECTRE experience lives in `../katechon-app/src/app/spectre`, but that page also includes avatar, narration, microphone, and background audio behavior.

## Target State

- Raw Flask SPECTRE remains available on remote port `3010`.
- A new market-only Next.js SPECTRE route runs from `katechon-app` on a separate remote port, proposed as `3020`.
- The demo compositor points its SPECTRE iframe to the market-only route:
  - `http://host.docker.internal:3020/spectre/markets?kiosk=1`
- The market route keeps:
  - raw SPECTRE base map/dashboard
  - scrolling market ticker
  - rotating Polymarket market embed
  - market dashboard overlays
- The market route omits:
  - Live2D/avatar iframe
  - narration loop
  - microphone and voice-agent UI
  - background music
  - click-to-start narration gate

## Proposed Migration

1. Add a market-only route in `katechon-app`.
   - Create a dedicated route such as `/spectre/markets`.
   - Reuse the existing `MarketTicker`, `/api/markets`, Polymarket rotation logic, and dashboard overlay components.
   - Keep the full existing `/spectre` page intact for local demos that still need narration/avatar behavior.

2. Proxy raw SPECTRE through the Next.js app.
   - Add a same-origin path such as `/spectre-raw/:path*`.
   - Rewrite or proxy that path to `http://127.0.0.1:3010/:path*`.
   - Point the market-only page's base iframe at `/spectre-raw/` instead of directly at a remote host/port.

3. Add a remote service entry point for the market route.
   - Start Next.js from `/opt/katechon/katechon-app` on remote port `3020`.
   - Prefer production mode if the app can build reliably on the server.
   - Keep logs and pid files separate from raw SPECTRE, for example under `applications/.logs/katechon-market.*`.

4. Wire the demo compositor to the new route.
   - Update the `spectre` workspace URL in `entrypoint-hls.sh`.
   - Keep the existing workspace id and voice routing behavior unchanged.
   - Do not change the landing page switch API.

5. Extend operations visibility.
   - Add status/log checks for the market Next.js service.
   - Document the remote ports:
     - `3010`: raw Flask SPECTRE
     - `3020`: market-enhanced SPECTRE route
     - `3100`: compositor/HLS control
     - `4040`: public demo UI/API

## Validation Checklist

- Local:
  - `../katechon-app` builds or runs the market-only route.
  - `/api/markets` returns Polymarket and oil payloads.
  - The market-only route renders without avatar, narration, mic controls, or start overlay.
  - The raw SPECTRE iframe loads through the same-origin proxy.

- Remote:
  - `curl http://127.0.0.1:3010/` returns raw SPECTRE.
  - `curl http://127.0.0.1:3020/spectre/markets?kiosk=1` returns the market route.
  - `curl http://127.0.0.1:3020/api/markets` returns live market data.
  - `make compositor-start` points the HLS view at the market route.
  - `make wait-hls` succeeds.
  - A remote screenshot or HLS preview shows raw SPECTRE plus market overlays.

## Rollout Plan

1. Deploy the `katechon-app` route/service without changing `katechon-demo`.
2. Verify the market route directly on the remote host.
3. Update `katechon-demo` compositor URL in a follow-up PR.
4. Restart the compositor while YouTube push is stopped.
5. Confirm HLS preview and recording output.
6. Restart YouTube only after the visual output is confirmed.

## Rollback Plan

- Revert the `entrypoint-hls.sh` workspace URL to:
  - `http://host.docker.internal:3010/?kiosk=1`
- Restart the compositor with `make compositor-start`.
- The raw Flask SPECTRE service remains unchanged, so rollback does not depend on the Next.js market route.

## Open Questions

- Should the market-only route live at `/spectre/markets`, `/spectre/kiosk`, or behind a query mode on `/spectre`?
- Should remote `katechon-app` run with `next start` from a production build, or is `npm run dev` acceptable for the stream server during iteration?
- Do we want the generated dashboard overlays to be voice-triggered later, or should the first implementation be passive ticker plus Polymarket only?
