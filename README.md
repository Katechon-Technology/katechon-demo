# katechon-demo

Remote-first demo runtime for Katechon narrated dashboard channels. The remote server can still run the public UI/API, compositor container, YouTube RTMP push, and server-side recording; developer machines sync code to the server for fast iteration.

## Architecture

```
Developer machine
    │
    │ rsync / git push
    ▼
claudetorio-stream-server:/opt/katechon/katechon-demo
    │
    ├── Node UI/API :4040
    │     ├── public landing/control UI
    │     ├── push-to-talk API
    │     └── same-origin HLS proxy: /stream.m3u8 + /seg*.ts
    │
    ├── Docker: katechon-desktop :3100 -> :3000
    │     ├── entrypoint-hls.sh
    │     ├── Xvfb + Chromium desktop/avatar displays
    │     ├── Python state/control server
    │     └── FFmpeg -> HLS
    │
    ├── YouTube RTMP FFmpeg push
    └── server-side recording
```

The current public demo URL is `http://176.57.184.142:4040/`.

### Code that runs on the server

**`entrypoint-hls.sh`** — runs inside the `katechon-desktop` Docker container on the remote host. It:
- Starts two Xvfb virtual displays (desktop + avatar)
- Optionally starts PulseAudio and muxes Kat/avatar audio into HLS when `ENABLE_HLS_AUDIO=1`
- Patches `avatar-pet.html` at runtime to add the voice-polling bridge
- Launches two headless Chromium instances (background scene + avatar overlay)
- Runs a Python HTTP server (`hls_server.py`) on `:3000` that serves:
  - `GET /state` — current workspace
  - `GET /avatar/next` — next queued voice payload for the avatar
  - `POST /switch` — change workspace
  - `POST /command` — route a voice command + queue speech
  - `POST /speak` — queue a TTS payload for the avatar
  - `GET /stream.m3u8` — HLS manifest (served from `/tmp/hls/`)
- Composites the two displays with FFmpeg → HLS segments

**`Makefile`** — primary remote sprint/operator surface. It deploys code to `/opt/katechon/katechon-demo`, starts the remote UI/API, restarts the compositor, starts/stops YouTube, and starts/stops recording.

**`start.sh`** — orchestration script run locally. It uploads `entrypoint-hls.sh` to the remote host, (re)starts the Docker container, waits for HLS to be ready, opens SSH tunnels, then starts the local Express server.

## Prerequisites

- Node.js 18+
- SSH access to `claudetorio-stream-server` (configured in `~/.ssh/config`)
- Docker image `katechon-stream-client:latest` present on the remote host
- API keys (see below)

## Quickstart

### 1. Clone and install

```bash
git clone https://github.com/Katechon-Technology/katechon-demo
cd katechon-demo
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Push-to-talk transcription via Groq Whisper |
| `ELEVENLABS_API_KEY` | Yes | Kat's TTS voice |
| `KAT_VOICE_SOURCE` | No | Defaults to `pitch`, the `../katechon-pitch` narration voice |
| `ELEVENLABS_VOICE_ID` | No | Explicit override. Defaults to the selected `KAT_VOICE_SOURCE` |
| `ELEVENLABS_MODEL_ID` | No | Defaults to `eleven_turbo_v2` |
| `DASHBOARD_NARRATION_REMOTE` | No | Set to `1` to ask Anthropic for dashboard narration; defaults off for deterministic investor demos |
| `DASHBOARD_NARRATION_TTS` | No | Set to `1` to use ElevenLabs for dashboard narration; defaults off so the browser narration fallback starts immediately |
| `PITCH_DECK_URL` | No | Defaults to `http://127.0.0.1:5174/deck/`; live-linked Vite deck from `../katechon-pitch` |
| `PITCH_DECK_DIST_DIR` | No | Defaults to `../katechon-pitch/dist`; used as a snapshot fallback when the live deck is not running |
| `ENABLE_HLS_AUDIO` | No | Experimental remote audio mux. Defaults off to preserve smooth avatar rendering |
| `STREAM_AUDIO_ENABLED` | No | Legacy HLS-audio flag. Keep off for the browser-rendered avatar flow |
| `HLS_CONTROL_URL` | No | Defaults to `http://localhost:9095` |

### 3. Configure SSH

Ensure `~/.ssh/config` has an entry for the stream server:

```
Host claudetorio-stream-server
    HostName <remote-ip>
    User <user>
    IdentityFile ~/.ssh/your-key
```

### 4. Start everything

```bash
./start.sh
```

This will:
1. Upload `entrypoint-hls.sh` to the remote host
2. Restart the `katechon-desktop` Docker container
3. Wait for the HLS stream to be ready (~15s)
4. Open SSH tunnels on ports 9091–9095
5. Start the local Express server on `http://localhost:4040`

### 5. Open the demo

Navigate to `http://localhost:4040` and enter your email to access the stream.

## Remote Demo Operations

The remote host is the canonical runtime for the live demo:

```bash
make deploy
make status
```

### GitHub Auto Deploy

Pushes to `main` run `.github/workflows/deploy.yml`, which validates the app and then runs `make deploy` over SSH. Configure these repository secrets before relying on the workflow:

| Secret | Purpose |
|---|---|
| `DEPLOY_HOST` | Remote server host or IP |
| `DEPLOY_USER` | SSH user for the remote server |
| `DEPLOY_SSH_KEY` | Private deploy key with access to the remote server |
| `DEPLOY_PORT` | Optional SSH port, defaults to `22` |
| `DEPLOY_KNOWN_HOSTS` | Optional pinned known_hosts entry; workflow uses `ssh-keyscan` if absent |
| `DEPLOY_REMOTE_DIR` | Optional remote path, defaults to `/opt/katechon/katechon-demo` |

Useful operator commands:

| Command | Purpose |
|---|---|
| `make deploy` | Sync repo to `/opt/katechon/katechon-demo`, rebuild remote `.env`, install deps, restart remote Node |
| `make remote-start` | Restart only the remote Node UI/API |
| `make compositor-start` | Cold-restart `katechon-desktop`; defaults to video-only with the remote avatar disabled |
| `make stream-audio-restart` | Stop YouTube/recording, restart compositor with audio, wait for HLS, then restart YouTube and recording |
| `make youtube-start` / `make youtube-stop` | Start/stop the remote YouTube RTMP push |
| `make record-start` / `make record-stop` | Start/stop server-side recording under `recordings/` |
| `make logs` | Tail Node, compositor, YouTube, and recording logs |
| `make status` | Check Node, HLS, container, YouTube, and recording process health |

YouTube stream keys stay on the server in `/opt/katechon/katechon-demo/.env`, which is generated from existing remote secrets and is not committed. The saved YouTube log is redacted after startup, but the running FFmpeg process arguments still contain the RTMP destination, so avoid sharing raw remote `ps` output while the stream is live.

### Browser Avatar + Audio

The demo UI now renders the Live2D avatar directly in the user's browser. The avatar iframe mounts as soon as the page opens, and dashboard-specific narration starts when the user opens a dashboard such as SPECTRE. This keeps iteration fast and avoids coupling avatar rendering to the remote Xvfb/PulseAudio/FFmpeg HLS pipeline.

The remote compositor defaults to `REMOTE_AVATAR_ENABLED=0` and `ENABLE_HLS_AUDIO=0`; it should be treated as a passive desktop/backdrop stream for this flow.

SPECTRE is embedded through the same-origin `/dashboards/spectre/` proxy so viewers do not need direct browser access to port `3010`. The proxy tries `SPECTRE_DASHBOARD_URL`, `SPECTRE_URL`, `http://127.0.0.1:3010`, then the local tunnel `http://127.0.0.1:9092`.

### Prototype Dashboards

The investor path is a focused feed of narrated dashboard channels. By default, each iframe renders the local `public/prototype-dashboard.html` experience so the demo is reliable: distinct dashboard visuals, tabs, feed-item clicks, live data pulsing, and dashboard-specific Kat narration through `GET /api/narration/:dashboard`.

| Dashboard | Iframe route | Narration lens |
|---|---|---|
| SPECTRE Event Room | `/dashboards/spectre/` | Correlation |
| News Situation Room | `/dashboards/news/` | Source fusion |
| Market Pulse | `/dashboards/dashboard123/` | Macro context |
| World Monitor | `/dashboards/world-monitor/` | Risk correlation |
| AI Arena | `/dashboards/arena/` | Speed and accuracy |
| Fundraise Deck | `/dashboards/pitch-deck/` | Deck preview, narration later |

Set `EXTERNAL_DASHBOARD_UPSTREAMS=1` to use the old same-origin proxy behavior for real upstream apps. In that mode optional upstream env vars such as `WORLD_MONITOR_DASHBOARD_URL`, `GLANCE_DASHBOARD_URL`, `CRYPTO_TRADING_DASHBOARD_URL`, `POLYREC_DASHBOARD_URL`, and `DASHBOARD123_DASHBOARD_URL` still work, but those deferred paths are not part of the focused investor walkthrough.

The fundraise deck dashboard is linked to the sibling repo rather than copied. For live updates while editing `../katechon-pitch` on its current branch, run this in a second terminal:

```bash
npm run pitch:dev
```

`/dashboards/pitch-deck/` will embed that Vite server. If it is not running, the route falls back to the last built `../katechon-pitch/dist` snapshot.

This repo includes a minimal Glance config at `glance-config/glance.yml` for upstream testing:

```bash
docker run --rm -p 8080:8080 -v "$PWD/glance-config:/app/config" glanceapp/glance:latest -config /app/config/glance.yml
```

### Legacy Audio Streaming

The compositor supports two modes:

| Mode | How | Notes |
|---|---|---|
| Video-only browser-avatar mode | `make compositor-start` | Default mode for rapid local/demo iteration |
| Video + remote avatar/audio | `make stream-audio-restart REMOTE_AVATAR_ENABLED=1` | Legacy path; starts PulseAudio, captures `kat_sink.monitor`, and muxes AAC into HLS |

After switching audio modes, restart the YouTube and recording FFmpeg processes so they ingest the new HLS stream cleanly. `make stream-audio-restart` does this in one command. The YouTube and recording scripts use `ffprobe` to detect whether the HLS feed has an audio track; if it does, they forward that audio, and if it does not, they fall back to generated silent AAC so YouTube ingest stays valid.

For local tunnel-based development, keep `HLS_CONTROL_URL=http://localhost:9095`. On the remote host, `.env` uses `HLS_CONTROL_URL=http://127.0.0.1:3100`, and the browser always loads same-origin `/stream.m3u8`.

## Local-only dev (no remote server)

Run just the Express API server without the stream:

```bash
node server.js
```

The UI will show "reconnecting…" for the video but all API endpoints work. Useful for testing voice transcription and workspace switching logic.

## Port reference

| Port | Tunnel target | Purpose |
|------|--------------|---------|
| 4040 | — | Local Express server (this app) |
| 5174 | — | Optional local Vite server for `../katechon-pitch` (`npm run pitch:dev`) |
| 9095 | remote:3100 | Vtuber desktop HLS stream |
| 9091 | 172.20.0.2:12393 | Open-LLM-VTuber avatar + WS |
| 9092 | remote:3010 | SPECTRE Flask dashboard |
| 9093 | remote:3003 | Minecraft HLS stream |

## API reference

All endpoints are served by `server.js` on port 4040.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/register` | Record email, gate to main UI |
| `GET`  | `/api/state` | Current workspace + session IDs |
| `POST` | `/api/switch/:workspace` | Switch active workspace (`spectre`, `minecraft`, `news`, `landing`) |
| `POST` | `/api/transcribe` | Transcribe audio blob → text (Groq Whisper) |
| `POST` | `/api/command` | Parse transcript → action, route to remote control server |
| `POST` | `/api/speak` | Synthesize TTS (ElevenLabs) + forward to avatar |
| `GET`  | `/api/narration/:dashboard` | Generate one Kat narration payload for a dashboard iframe |
| `POST` | `/api/sessions/start/:kind` | Spawn a new broker session |
| `GET`  | `/api/sessions/:id` | Poll session status + stream URL |
| `PUT`  | `/api/sessions/:kind/:id` | Register an existing session ID |
| `GET`  | `/dashboards/spectre/*` | Same-origin proxy for the SPECTRE dashboard iframe |
| `GET`  | `/dashboards/:external/*` | Generated prototype dashboard iframe by default; external proxy when `EXTERNAL_DASHBOARD_UPSTREAMS=1` |
