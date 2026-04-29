#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

set -a
. ./.env
set +a

mkdir -p logs run

if [ -f run/youtube.pid ]; then
    old="$(cat run/youtube.pid || true)"
    if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
        kill "$old"
        sleep 1
    fi
fi

hls_url="${HLS_URL:-http://127.0.0.1:3100/stream.m3u8}"
base="${YOUTUBE_RTMP_URL:-rtmp://a.rtmp.youtube.com/live2}"
key="${YOUTUBE_STREAM_KEY:-}"
if [ -n "$key" ]; then
    case "$base" in
        *"$key"*) out="$base" ;;
        *) out="${base%/}/$key" ;;
    esac
else
    out="$base"
fi

if ffprobe -v error -select_streams a:0 -show_entries stream=index -of csv=p=0 "$hls_url" | grep -q .; then
    nohup ffmpeg -hide_banner -loglevel info -re -fflags +genpts \
        -i "$hls_url" \
        -map 0:v:0 -map 0:a:0 \
        -c:v copy -c:a aac -b:a 128k -ar 44100 \
        -f flv "$out" > logs/youtube.log 2>&1 &
else
    nohup ffmpeg -hide_banner -loglevel info -re -fflags +genpts \
        -i "$hls_url" \
        -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
        -map 0:v:0 -map 1:a:0 \
        -c:v copy -c:a aac -b:a 128k -ar 44100 \
        -f flv "$out" > logs/youtube.log 2>&1 &
fi

echo $! > run/youtube.pid
sleep 3
kill -0 "$(cat run/youtube.pid)"
bash scripts/remote-redact-youtube-log.sh
