#!/bin/bash
# katechon-stream-client: HLS output mode
# Desktop display (background.html via HTTP) + Avatar overlay (avatar-pet.html)
# → FFmpeg x11grab composite → HLS segments + state API → :3000

set -euo pipefail

log()  { echo "[katechon-hls] $*"; }
fail() { echo "[katechon-hls] ERROR: $*" >&2; exit 1; }

DISPLAY_DESK=":1"
DISPLAY_AVT=":2"
W=1920; H=1080
AVT_W=640; AVT_H=1080
OVERLAY_X=1280; OVERLAY_Y=0
ENABLE_HLS_AUDIO="${ENABLE_HLS_AUDIO:-0}"

export XDG_RUNTIME_DIR=/tmp/xdg-runtime
mkdir -p "$XDG_RUNTIME_DIR" /tmp/.X11-unix /tmp/hls
chmod 700 "$XDG_RUNTIME_DIR"
chmod 1777 /tmp/.X11-unix
if [ "$ENABLE_HLS_AUDIO" = "1" ]; then
    export PULSE_SERVER="unix:${XDG_RUNTIME_DIR}/pulse/native"
fi

XVFB1_PID="" XVFB2_PID="" CHROME1_PID="" CHROME2_PID="" AVTSRV_PID="" FFMPEG_PID="" HLS_SRV_PID=""

cleanup() {
    log "shutting down..."
    for p in FFMPEG_PID CHROME2_PID CHROME1_PID HLS_SRV_PID AVTSRV_PID; do
        eval "pid=\${${p}:-}"
        [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
    done
    [ -n "${XVFB2_PID:-}" ] && kill "$XVFB2_PID" 2>/dev/null || true
    [ -n "${XVFB1_PID:-}" ] && kill "$XVFB1_PID" 2>/dev/null || true
}
trap cleanup SIGTERM SIGINT

wait_display() {
    local d="$1" e=0
    until DISPLAY="$d" xdpyinfo >/dev/null 2>&1; do
        [ "$e" -ge 30 ] && fail "Display $d not ready"
        sleep 1; e=$((e+1))
    done
    log "display $d ready (${e}s)"
}

# ── 1. Xvfb displays ──────────────────────────────────────────────
log "Starting Xvfb displays..."
Xvfb "$DISPLAY_DESK" -screen 0 "${W}x${H}x24" +extension GLX -ac &
XVFB1_PID=$!
Xvfb "$DISPLAY_AVT"  -screen 0 "${AVT_W}x${AVT_H}x24" +extension GLX -ac &
XVFB2_PID=$!
wait_display "$DISPLAY_DESK"
wait_display "$DISPLAY_AVT"

# ── 1b. Optional virtual audio sink for HLS speech muxing ─────────
if [ "$ENABLE_HLS_AUDIO" = "1" ]; then
    log "Starting PulseAudio virtual speaker..."
    pulseaudio --kill >/dev/null 2>&1 || true
    rm -rf "${XDG_RUNTIME_DIR}/pulse"
    pulseaudio --daemonize=yes --exit-idle-time=-1 --log-target=file:/tmp/pulseaudio.log --log-level=warning
    e=0
    until pactl info >/dev/null 2>&1; do
        [ "$e" -ge 15 ] && fail "PulseAudio timeout"
        sleep 1; e=$((e+1))
    done
    pactl load-module module-null-sink sink_name=kat_sink sink_properties=device.description=KatSink >/dev/null 2>&1 || true
    pactl set-default-sink kat_sink >/dev/null 2>&1 || true
    pactl set-sink-volume kat_sink 100% >/dev/null 2>&1 || true
    log "PulseAudio ready (${e}s)"
else
    log "HLS audio mux disabled; using smooth video-only stream."
fi

sed -i 's/background: transparent/background: #00ff00/g' /var/www/avatar/avatar-pet.html
python3 - <<'PYEOF'
from pathlib import Path

path = Path('/var/www/avatar/avatar-pet.html')
html = path.read_text()
old_marker = '// KATECHON_REMOTE_VOICE_BRIDGE'
old_start = html.find(old_marker)
if old_start != -1:
    old_end = html.find('setInterval(pollKatechonVoice, 80);', old_start)
    if old_end != -1:
        old_end = html.find('\n', old_end)
        if old_end != -1:
            html = html[:old_start] + html[old_end + 1:]

marker = 'KATECHON_REMOTE_VOICE_BRIDGE_V2'
needle = "switchModel(INITIAL_MODEL).catch(err => console.error('[avatar] switchModel failed:', err));"
bridge = r"""

// KATECHON_REMOTE_VOICE_BRIDGE_V2: poll the local HLS control server for Kat speech.
let katechonVoiceSeq = 0;
let katechonVoicePolling = false;

function reportKatechonAvatar(event, data = {}) {
  try {
    fetch('http://127.0.0.1:3000/avatar/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...data, at: Date.now() }),
      keepalive: true,
    }).catch(() => {});
  } catch (e) {}
  try { console.log('[katechon-avatar]', event, data); } catch (e) {}
}

async function pollKatechonVoice() {
  if (katechonVoicePolling) return;
  katechonVoicePolling = true;
  try {
    const resp = await fetch(`http://127.0.0.1:3000/avatar/next?since=${katechonVoiceSeq}`, { cache: 'no-store' });
    if (resp.ok) {
      const payload = await resp.json();
      if (Number(payload.seq) > katechonVoiceSeq) katechonVoiceSeq = Number(payload.seq);
      if (payload.audio) {
        const queuedAgeMs = payload.queuedAt ? Math.max(0, Date.now() - Number(payload.queuedAt)) : null;
        reportKatechonAvatar('voice-payload', { id: payload.id, seq: payload.seq, audioChars: payload.audio.length, queuedAgeMs });
        playPayload({ id: payload.id, audio: payload.audio, text: payload.text || '', queuedAt: payload.queuedAt || 0 });
      }
    }
  } catch (e) {
    // HLS control server starts after the avatar page; keep polling quietly.
  } finally {
    katechonVoicePolling = false;
  }
}

reportKatechonAvatar('bridge-ready');
setInterval(pollKatechonVoice, 80);
"""

if marker not in html:
    if needle not in html:
        raise SystemExit('avatar-pet.html patch anchor not found')
    if "let lipSyncUntil = 0;" not in html:
        html = html.replace(
            "let currentSource = null, currentMouth = 0, playbackSeq = 0;",
            "let currentSource = null, currentMouth = 0, playbackSeq = 0;\nlet lipSyncUntil = 0;",
        )
    html = html.replace(
        "  if (!analyser || !currentSource) return 0;",
        "  if (!currentSource) return 0;",
    )
    if "const measured = Math.min(1, Math.sqrt(sum / analyserData.length) * RMS_GAIN);" not in html:
        html = html.replace(
            "  return Math.min(1, Math.sqrt(sum / analyserData.length) * RMS_GAIN);",
            "  const measured = Math.min(1, Math.sqrt(sum / analyserData.length) * RMS_GAIN);\n"
            "  if (measured > 0.015) return measured;\n"
            "  if (performance.now() < lipSyncUntil) return 0.14 + 0.24 * Math.abs(Math.sin(performance.now() / 85));\n"
            "  return 0;",
        )
    if "reportKatechonAvatar('audio-started'" not in html:
        html = html.replace(
            "    source.start(0, offsetSeconds);",
            "    source.start(0, offsetSeconds);\n"
            "    lipSyncUntil = performance.now() + Math.max(600, (audioBuffer.duration - offsetSeconds) * 1000);\n"
            "    if (typeof reportKatechonAvatar === 'function') reportKatechonAvatar('audio-started', { id, durationMs: Math.round(audioBuffer.duration * 1000), offsetMs: Math.round(offsetSeconds * 1000), queuedAgeMs: payload.queuedAt ? Math.max(0, Date.now() - Number(payload.queuedAt)) : null, state: audioCtx.state });",
        )
    if "reportKatechonAvatar('audio-error'" not in html:
        html = html.replace(
            "  } catch (err) { console.error('[avatar] audio decode error:', err); }",
            "  } catch (err) { console.error('[avatar] audio decode error:', err); if (typeof reportKatechonAvatar === 'function') reportKatechonAvatar('audio-error', { id, message: String(err && err.message || err) }); }",
        )
    html = html.replace(needle, needle + bridge)
    path.write_text(html)
PYEOF

# ── 2. Write background.html + wallpaper to avatar server dir ─────
log "Preparing background.html..."
WALLPAPER="/root/.local/share/unit3-assets/wallpapers/video-games-nier-automata-2b-nier-automata-wallpaper-3816fda860c05c98705c019e3812740a.jpg"
cp "$WALLPAPER" /var/www/avatar/wallpaper.jpg

cat > /var/www/avatar/background.html << 'BGEOF'
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 1920px; height: 1080px;
    overflow: hidden;
    background: #0d0d0f;
  }
  .bg {
    position: absolute; inset: 0;
    background: url('/wallpaper.jpg') center/cover no-repeat;
    filter: brightness(0.55) saturate(0.9);
  }
  .grain {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
    pointer-events: none; opacity: 0.4;
  }
  .vignette {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%);
  }
  .content-frame {
    position: absolute;
    top: 80px; left: 60px;
    width: 1100px; height: 880px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    background: rgba(13,13,15,0.55);
    backdrop-filter: blur(2px);
    overflow: hidden;
    display: flex; flex-direction: column;
  }
  .frame-bar {
    height: 32px; flex-shrink: 0;
    background: rgba(0,0,0,0.4);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center;
    padding: 0 14px; gap: 8px;
    border-radius: 8px 8px 0 0;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-r { background: #ff5f57; }
  .dot-y { background: #ffbd2e; }
  .dot-g { background: #28c941; }
  .frame-title {
    font-size: 11px; color: rgba(255,255,255,0.35);
    letter-spacing: 0.15em; margin-left: 8px; font-family: monospace;
  }
  #ws-iframe {
    flex: 1; border: none; display: block; visibility: hidden;
    opacity: 0; transition: opacity 120ms ease;
    background: #050607;
  }
  #ws-iframe.active {
    visibility: visible;
    opacity: 1;
  }
</style>
</head>
<body>
  <div class="bg"></div>
  <div class="grain"></div>
  <div class="vignette"></div>
  <div class="content-frame">
    <div class="frame-bar">
      <div class="dot dot-r"></div>
      <div class="dot dot-y"></div>
      <div class="dot dot-g"></div>
      <span class="frame-title" id="frame-title">// KATECHON — INTELLIGENCE PLATFORM</span>
    </div>
    <iframe id="ws-iframe"></iframe>
  </div>
  <script>
    const WORKSPACES = {
      spectre: { url: 'http://host.docker.internal:3010/?kiosk=1', title: '// OSINT — SPECTRE INTELLIGENCE' },
    };
    let cur = null;
    const iframe = document.getElementById('ws-iframe');
    const titleEl = document.getElementById('frame-title');
    iframe.src = WORKSPACES.spectre.url;

    setInterval(async () => {
      try {
        const r = await fetch('http://127.0.0.1:3000/state', { cache: 'no-store' });
        const { workspace } = await r.json();
        if (workspace === cur) return;
        cur = workspace;
        const ws = WORKSPACES[workspace];
        if (ws) {
          if (iframe.src !== ws.url) iframe.src = ws.url;
          iframe.classList.add('active');
          titleEl.textContent = ws.title;
        } else {
          iframe.classList.remove('active');
          titleEl.textContent = '// KATECHON — INTELLIGENCE PLATFORM';
        }
      } catch(e) {}
    }, 80);
  </script>
</body>
</html>
BGEOF

# ── 3. Avatar HTTP server on :8080 ────────────────────────────────
log "Starting avatar HTTP server on :8080..."
cd /var/www/avatar
python3 -m http.server 8080 >/tmp/avtsrv.log 2>&1 &
AVTSRV_PID=$!
e=0
until curl -sf http://localhost:8080/background.html >/dev/null 2>&1; do
    [ "$e" -ge 15 ] && fail "Avatar HTTP server timeout"
    sleep 1; e=$((e+1))
done
log "Avatar HTTP server ready (${e}s)"

# ── 4. Desktop display: Chromium showing background.html via HTTP ──
log "Launching desktop Chromium on $DISPLAY_DESK..."
rm -rf /tmp/chrome-desk-profile
DISPLAY="$DISPLAY_DESK" chromium \
    --no-sandbox --no-first-run --disable-infobars --disable-dev-shm-usage \
    --window-size="${W},${H}" --window-position=0,0 --kiosk \
    --use-gl=angle --use-angle="${ANGLE_BACKEND:-swiftshader}" \
    --ignore-gpu-blocklist --enable-webgl \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --autoplay-policy=no-user-gesture-required \
    --user-data-dir=/tmp/chrome-desk-profile \
    "http://localhost:8080/background.html" \
    >/tmp/chrome-desk.log 2>&1 &
CHROME1_PID=$!
log "Desktop Chrome started (PID $CHROME1_PID)"

# ── 5. Avatar display: Chromium showing avatar-pet.html ───────────
log "Launching avatar Chromium on $DISPLAY_AVT..."
rm -rf /tmp/chrome-avt-profile
DISPLAY="$DISPLAY_AVT" chromium \
    --no-sandbox --no-first-run --disable-infobars --disable-dev-shm-usage \
    --window-size="${AVT_W},${AVT_H}" --window-position=0,0 --kiosk \
    --use-gl=angle --use-angle="${ANGLE_BACKEND:-swiftshader}" \
    --ignore-gpu-blocklist --enable-webgl \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --autoplay-policy=no-user-gesture-required \
    --user-data-dir=/tmp/chrome-avt-profile \
    "http://localhost:8080/avatar-pet.html?model=0&w=${AVT_W}&h=${AVT_H}" \
    >/tmp/chrome-avt.log 2>&1 &
CHROME2_PID=$!

log "Waiting 14s for Chromium renders..."
sleep 14

# ── 6. HLS + state API server on :3000 ────────────────────────────
log "Starting HLS+state/control server on :3000..."
cat > /tmp/hls_server.py << 'PYEOF'
import os, sys, json, time
from urllib.parse import urlparse, parse_qs
sys.path.insert(0, '')
from http.server import HTTPServer, SimpleHTTPRequestHandler

_state = {"workspace": "landing"}
_voice_seq = 0
_voice_queue = []
_avatar_events = []
_last_agent = None

def _json(handler, status, obj):
    body = json.dumps(obj).encode()
    handler.send_response(status)
    handler.send_header('Content-Type', 'application/json')
    handler.send_header('Content-Length', str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)

def _read_json(handler):
    length = int(handler.headers.get('Content-Length', 0))
    if length <= 0:
        return {}
    return json.loads(handler.rfile.read(length))

def _queue_voice(data):
    global _voice_seq, _voice_queue
    audio = data.get('audio') or ''
    if not audio:
        return None
    _voice_seq += 1
    payload = {
        "seq": _voice_seq,
        "id": data.get('id') or f"voice-{_voice_seq}",
        "text": data.get('text') or data.get('reply') or "",
        "audio": audio,
        "queuedAt": int(time.time() * 1000),
    }
    _voice_queue.append(payload)
    _voice_queue = _voice_queue[-20:]
    return payload

def _record_avatar_event(data):
    global _avatar_events
    _avatar_events.append(data)
    _avatar_events = _avatar_events[-80:]

def _workspace_for_action(action):
    if action == "open_spectre":
        return "spectre"
    if action == "go_home":
        return "landing"
    return None

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def do_OPTIONS(self):
        self.send_response(200); self.end_headers()
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/state':
            _json(self, 200, _state)
        elif parsed.path == '/avatar/next':
            qs = parse_qs(parsed.query)
            since = int((qs.get('since') or ['0'])[0] or 0)
            payload = next((item for item in _voice_queue if int(item.get('seq', 0)) > since), None)
            _json(self, 200, payload or {"seq": _voice_seq})
        elif parsed.path == '/avatar/debug':
            _json(self, 200, {
                "workspace": _state.get("workspace"),
                "voiceSeq": _voice_seq,
                "queueDepth": len(_voice_queue),
                "lastVoice": _voice_queue[-1] if _voice_queue else None,
                "lastAgent": _last_agent,
                "events": _avatar_events[-20:],
            })
        else:
            super().do_GET()
    def do_POST(self):
        global _last_agent
        if self.path == '/switch':
            data = _read_json(self)
            _state['workspace'] = data.get('workspace', 'landing')
            _json(self, 200, {"ok": True, "workspace": _state["workspace"]})
        elif self.path == '/command':
            data = _read_json(self)
            workspace = data.get('workspace') or _workspace_for_action(data.get('action'))
            if workspace:
                _state['workspace'] = workspace
            _last_agent = {
                "id": data.get("id"),
                "action": data.get("action"),
                "workspace": workspace,
                "reply": data.get("reply") or data.get("text") or "",
            }
            queued = _queue_voice(data)
            _json(self, 200, {"ok": True, "workspace": _state["workspace"], "voiceSeq": queued and queued["seq"]})
        elif self.path == '/agent':
            data = _read_json(self)
            workspace = data.get('workspace') or _workspace_for_action(data.get('action'))
            if workspace:
                _state['workspace'] = workspace
            _last_agent = {
                "id": data.get("id"),
                "action": data.get("action"),
                "workspace": workspace,
                "reply": data.get("speech") or data.get("reply") or data.get("text") or "",
                "transcript": data.get("transcript") or "",
            }
            queued = _queue_voice(data)
            _json(self, 200, {"ok": True, "workspace": _state["workspace"], "voiceSeq": queued and queued["seq"]})
        elif self.path == '/speak':
            data = _read_json(self)
            queued = _queue_voice(data)
            _json(self, 200, {"ok": True, "voiceSeq": queued and queued["seq"]})
        elif self.path == '/avatar/event':
            data = _read_json(self)
            _record_avatar_event(data)
            _json(self, 200, {"ok": True})
        else:
            _json(self, 404, {"error": "not found"})

os.chdir('/tmp/hls')
HTTPServer(('', 3000), Handler).serve_forever()
PYEOF
python3 /tmp/hls_server.py &
HLS_SRV_PID=$!
log "HLS+state server started (PID $HLS_SRV_PID)"

# ── 7. FFmpeg: composite → HLS ────────────────────────────────────
log "Starting FFmpeg → HLS..."
if [ "$ENABLE_HLS_AUDIO" = "1" ]; then
    ffmpeg -loglevel warning \
        -thread_queue_size 512 \
        -f x11grab -framerate 30 -video_size "${W}x${H}" -draw_mouse 0 -i "${DISPLAY_DESK}.0" \
        -thread_queue_size 512 \
        -f x11grab -framerate 30 -video_size "${AVT_W}x${AVT_H}" -draw_mouse 0 -i "${DISPLAY_AVT}.0" \
        -thread_queue_size 512 \
        -f pulse -i kat_sink.monitor \
        -filter_complex "[1:v]colorkey=0x00ff00:0.3:0.1[ov];[0:v][ov]overlay=${OVERLAY_X}:${OVERLAY_Y}[vout]" \
        -map "[vout]" -map 2:a \
        -c:v libx264 -preset ultrafast -tune zerolatency \
        -pix_fmt yuv420p -g 60 -sc_threshold 0 -b:v 3000k \
        -c:a aac -b:a 128k -ac 2 -ar 44100 \
        -f hls -hls_time 2 -hls_list_size 5 \
        -hls_flags delete_segments+append_list \
        -hls_segment_filename /tmp/hls/seg%05d.ts \
        /tmp/hls/stream.m3u8 &
else
    ffmpeg -loglevel warning \
        -thread_queue_size 512 \
        -f x11grab -framerate 30 -video_size "${W}x${H}" -draw_mouse 0 -i "${DISPLAY_DESK}.0" \
        -thread_queue_size 512 \
        -f x11grab -framerate 30 -video_size "${AVT_W}x${AVT_H}" -draw_mouse 0 -i "${DISPLAY_AVT}.0" \
        -filter_complex "[1:v]colorkey=0x00ff00:0.3:0.1[ov];[0:v][ov]overlay=${OVERLAY_X}:${OVERLAY_Y}" \
        -c:v libx264 -preset ultrafast -tune zerolatency \
        -pix_fmt yuv420p -g 60 -sc_threshold 0 -b:v 3000k \
        -f hls -hls_time 2 -hls_list_size 5 \
        -hls_flags delete_segments+append_list \
        -hls_segment_filename /tmp/hls/seg%05d.ts \
        /tmp/hls/stream.m3u8 &
fi
FFMPEG_PID=$!

log "Waiting for HLS manifest..."
e=0
until [ -f /tmp/hls/stream.m3u8 ]; do
    kill -0 "$FFMPEG_PID" 2>/dev/null || fail "FFmpeg died"
    [ "$e" -ge 30 ] && fail "HLS manifest not ready after 30s"
    sleep 1; e=$((e+1))
done
log "=== HLS ready: http://localhost:3000/stream.m3u8 (${e}s) ==="

while true; do
    kill -0 "${XVFB1_PID}"  2>/dev/null || { log "Xvfb :1 died"; cleanup; exit 1; }
    kill -0 "${FFMPEG_PID}" 2>/dev/null || { log "FFmpeg died";   cleanup; exit 1; }
    sleep 5
done
