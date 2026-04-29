#!/bin/bash
# katechon-stream-client: HLS output mode
# Desktop display (Chromium background.html) + Avatar overlay (avatar-pet.html)
# → FFmpeg x11grab composite → HLS segments → Python http.server :3000

set -euo pipefail

log()  { echo "[katechon-hls] $*"; }
fail() { echo "[katechon-hls] ERROR: $*" >&2; exit 1; }

DISPLAY_DESK=":1"
DISPLAY_AVT=":2"
W=1920; H=1080
AVT_W=640; AVT_H=1080
OVERLAY_X=1280; OVERLAY_Y=0   # right-side full-height

export XDG_RUNTIME_DIR=/tmp/xdg-runtime
mkdir -p "$XDG_RUNTIME_DIR" /tmp/.X11-unix /tmp/hls
chmod 700 "$XDG_RUNTIME_DIR"
chmod 1777 /tmp/.X11-unix

XVFB1_PID="" XVFB2_PID="" CHROME1_PID="" CHROME2_PID="" AVTSRV_PID="" FFMPEG_PID=""

cleanup() {
    log "shutting down..."
    for p in FFMPEG_PID CHROME2_PID CHROME1_PID AVTSRV_PID; do
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
# Chromakey background — green screen so FFmpeg can key out the avatar BG
sed -i 's/background: transparent/background: #00ff00/g' /var/www/avatar/avatar-pet.html

# ── 2. Avatar HTTP server on :8080 ────────────────────────────────
log "Starting avatar HTTP server on :8080..."
cd /var/www/avatar
python3 -m http.server 8080 >/tmp/avtsrv.log 2>&1 &
AVTSRV_PID=$!
e=0
until curl -sf http://localhost:8080/avatar-pet.html >/dev/null 2>&1; do
    [ "$e" -ge 15 ] && fail "Avatar HTTP server timeout"
    sleep 1; e=$((e+1))
done
log "Avatar HTTP server ready (${e}s)"

# ── 3. Desktop display: Chromium showing background page ──────────
log "Launching desktop Chromium on $DISPLAY_DESK..."
WALLPAPER="/root/.local/share/unit3-assets/wallpapers/video-games-nier-automata-2b-nier-automata-wallpaper-3816fda860c05c98705c019e3812740a.jpg"
cat > /tmp/background.html << BGEOF
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
    font-family: "JetBrains Mono", monospace;
  }
  .bg {
    position: absolute; inset: 0;
    background: url('file://${WALLPAPER}') center/cover no-repeat;
    filter: brightness(0.55) saturate(0.9);
  }
  .grain {
    position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
    pointer-events: none;
    opacity: 0.4;
  }
  .vignette {
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%);
  }
  /* Content placeholder area — windows will go here */
  .content-frame {
    position: absolute;
    top: 80px; left: 60px;
    width: 1100px; height: 880px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    background: rgba(13,13,15,0.55);
    backdrop-filter: blur(2px);
  }
  .frame-bar {
    height: 32px;
    background: rgba(0,0,0,0.4);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex; align-items: center;
    padding: 0 14px;
    gap: 8px;
    border-radius: 8px 8px 0 0;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dot-r { background: #ff5f57; }
  .dot-y { background: #ffbd2e; }
  .dot-g { background: #28c941; }
  .frame-title {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.15em;
    margin-left: 8px;
    font-family: monospace;
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
      <span class="frame-title">// KATECHON — INTELLIGENCE PLATFORM</span>
    </div>
  </div>
</body>
</html>
BGEOF

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
    "file:///tmp/background.html" \
    >/tmp/chrome-desk.log 2>&1 &
CHROME1_PID=$!
log "Desktop Chrome started (PID $CHROME1_PID)"

# ── 4. Avatar display: Chromium showing avatar-pet.html ───────────
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

# ── 5. HLS file server on :3000 (Python http.server) ─────────────
log "Starting HLS HTTP server on :3000..."
cd /tmp/hls
python3 -m http.server 3000 >/tmp/hlssrv.log 2>&1 &
# Add CORS headers via a tiny wrapper
python3 - >/tmp/hls-cors.log 2>&1 &
cat > /tmp/hls_server.py << 'PYEOF'
import os, sys
sys.path.insert(0, '')
from http.server import HTTPServer, SimpleHTTPRequestHandler

class CORSHandler(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

os.chdir('/tmp/hls')
HTTPServer(('', 3000), CORSHandler).serve_forever()
PYEOF
python3 /tmp/hls_server.py &
HLS_SRV_PID=$!
log "HLS server started (PID $HLS_SRV_PID)"

# ── 6. FFmpeg: composite → HLS ────────────────────────────────────
log "Starting FFmpeg → HLS..."
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
