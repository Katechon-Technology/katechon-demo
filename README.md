# katechon-demo

Local web frontend for the Katechon 24hr interactive livestream. It connects to a remote Docker container that composites the vtuber avatar + workspace stream via HLS, and exposes a push-to-talk voice interface powered by Groq Whisper + ElevenLabs.

## Architecture

```
Browser (localhost:4040)
    │
    │  HLS video (port 9095)
    │  REST API (push-to-talk, workspace switching)
    ▼
server.js  ──── SSH tunnels ────▶  claudetorio-stream-server (remote)
                                       │
                                       ├── Docker: katechon-desktop
                                       │     entrypoint-hls.sh
                                       │     Xvfb + Chromium (x2)
                                       │     FFmpeg → HLS
                                       │     Python state/control server :3000
                                       │
                                       ├── Open-LLM-VTuber avatar  :12393
                                       ├── SPECTRE Flask dashboard  :3010
                                       └── Minecraft HLS stream     :3003
```

### Code that runs on the server

**`entrypoint-hls.sh`** — runs inside the `katechon-desktop` Docker container on the remote host. It:
- Starts two Xvfb virtual displays (desktop + avatar)
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
| `ENABLE_HLS_AUDIO` | No | Experimental remote audio mux. Defaults off to preserve smooth avatar rendering |
| `STREAM_AUDIO_ENABLED` | No | Set with `ENABLE_HLS_AUDIO=1` so the browser waits for streamed audio instead of playing local fallback |
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
| `POST` | `/api/sessions/start/:kind` | Spawn a new broker session |
| `GET`  | `/api/sessions/:id` | Poll session status + stream URL |
| `PUT`  | `/api/sessions/:kind/:id` | Register an existing session ID |
