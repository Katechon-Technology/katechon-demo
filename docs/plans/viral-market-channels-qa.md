# Viral Market Channels Demo QA

Scope: `crypto-trading`, `polyrec`, and `meme-coin`.

## Deterministic Loop

1. Open `/` with no query string.
2. Confirm there is no email gate before the market cards.
3. Confirm the first three cards are Crypto Trading, Polyrec, and Meme Coin.
4. Click each primary prompt:
   - Crypto Trading: `BTC three months`
   - Polyrec: `Weirdest active markets`
   - Meme Coin: `Viral but fragile`
5. Confirm the dashboard opens fullscreen and runs the prompt through the channel turn path.
6. Confirm the generated stage, rail provenance, and next action/fork prompts are visible.
7. Click `Share` and confirm a `/share/channel/:id` URL is created.
8. Open the share URL and confirm it redirects with `channelShare=:id` and `replay=1`.
9. Confirm the replay highlights the generated state and provenance.
10. Enter one new prompt in the shared dashboard and confirm it forks into a new share object.

## API Smoke

- `GET /api/channels/:channel/context?fresh=1`
- `POST /api/channels/:channel/turn`
- `POST /api/channel-shares`
- `GET /api/channel-shares/:id`
- `GET /share/channel/:id`
- `POST /api/channel-shares/:id/fork`
- `GET /api/launch-analytics`

## Expected Analytics

The launch loop should record: `visit`, `focused_launch_viewed`, `channel_opened`, `prompt_clicked`, `prompt_submitted`, `channel_morphed`, `share_created`, `share_opened`, `share_replayed`, `share_forked`, plus `fallback_seen` or `error_seen` when applicable.

## Automated Launch QA

Run the full generated component launch gate with:

```bash
npm run launch:qa
```

Supporting commands:

```bash
npm run launch:smoke
npm run launch:e2e
npm run launch:visual
```

`launch:qa` starts an isolated local server with temporary channel/share/session
data, then runs:

1. API contract checks for all nine hero prompts across `crypto-trading`,
   `polyrec`, and `meme-coin`.
2. Share-object creation, clean restore, and fork checks for every hero prompt.
3. Headless Chrome rendering checks for desktop and narrow/mobile viewports.
4. Nonblank generated stage screenshot checks for chart/table/board surfaces.
5. Share metadata checks for title, description, image, and canonical URL.
6. Launch analytics checks for prompt, morph, share, replay, fork, and fallback
   events.

Artifacts are written to:

- `artifacts/launch-qa/launch-qa-report.json`
- `artifacts/launch-qa/screenshots/*.png`
