#!/usr/bin/env bash
# Capture the mythos-ban deck demo (Kat + matrix overlay + two-voice audio)
# to an MP4 using an offscreen Xvfb display, a PulseAudio null sink, a kiosk
# Chromium, and ffmpeg. Requires the katechon-demo server running on :4040 with
# the deck home pointed at mythos-ban.
set -uo pipefail
cd "$(dirname "$0")/.."

XVFB_STORE="$(cat /tmp/mb-xvfb-path.txt 2>/dev/null)"
XVFB="${XVFB_STORE}/bin/Xvfb"
DISP=":99"
URL="${URL:-http://localhost:4040/deck/}"
OUT="artifacts/mythos-ban/mythos-ban-demo.mp4"
DUR="${DUR:-40}"
SINK="mbcap"
FF="$(cat /tmp/mb-ff-path.txt 2>/dev/null)/bin/ffmpeg"
[ -x "$FF" ] || FF="ffmpeg"

PREV_SINK="$(pactl get-default-sink 2>/dev/null)"
cleanup() {
  [ -n "${CHROME_PID:-}" ] && kill "$CHROME_PID" 2>/dev/null
  [ -n "${XVFB_PID:-}" ] && kill "$XVFB_PID" 2>/dev/null
  [ -n "${PREV_SINK:-}" ] && pactl set-default-sink "$PREV_SINK" 2>/dev/null
  [ -n "${SINK_MOD:-}" ] && pactl unload-module "$SINK_MOD" 2>/dev/null
}
trap cleanup EXIT

mkdir -p artifacts/mythos-ban

# Null audio sink (made default) so all Chromium audio is capturable via its
# monitor. Restored on exit.
SINK_MOD="$(pactl load-module module-null-sink sink_name=$SINK sink_properties=device.description=$SINK 2>/dev/null)"
pactl set-default-sink "$SINK" 2>/dev/null
echo "pulse null sink module: $SINK_MOD (prev default: $PREV_SINK)"

# Offscreen display.
"$XVFB" "$DISP" -screen 0 1280x720x24 -nolisten tcp >/tmp/mb-xvfb.log 2>&1 &
XVFB_PID=$!
sleep 1.5

# Kiosk Chromium routed to the null sink.
env -u WAYLAND_DISPLAY PULSE_SINK="$SINK" DISPLAY="$DISP" GDK_BACKEND=x11 chromium \
  --no-sandbox --no-first-run --no-default-browser-check \
  --disable-infobars --disable-translate \
  --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader \
  --disable-accelerated-video-decode --disable-gpu-memory-buffer-video-frames \
  --disable-features=UseChromeOSDirectVideoDecoder,AcceleratedVideoDecodeLinuxGL \
  --default-background-color=00000000 \
  --ozone-platform=x11 --ozone-platform-hint=x11 \
  --autoplay-policy=no-user-gesture-required \
  --kiosk --window-size=1280,720 --window-position=0,0 \
  --user-data-dir=/tmp/mb-chrome-profile \
  "$URL" >/tmp/mb-chrome.log 2>&1 &
CHROME_PID=$!

# Let the window paint and the reel begin.
sleep 2

echo "recording ${DUR}s -> $OUT"
"$FF" -y -hide_banner -loglevel warning \
  -f x11grab -video_size 1280x720 -framerate 30 -i "$DISP" \
  -f pulse -i "${SINK}.monitor" \
  -t "$DUR" \
  -c:v libx264 -preset veryfast -pix_fmt yuv420p -crf 20 \
  -c:a aac -b:a 192k -movflags +faststart \
  "$OUT"
RC=$?

echo "ffmpeg rc=$RC"
ls -la "$OUT" 2>/dev/null
exit $RC
