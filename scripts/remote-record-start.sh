#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p logs run recordings

if [ -f run/record.pid ]; then
    old="$(cat run/record.pid || true)"
    if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
        kill "$old"
        sleep 1
    fi
fi

hls_url="${HLS_URL:-http://127.0.0.1:3100/stream.m3u8}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="recordings/katechon-demo-$stamp.mkv"

if ffprobe -v error -select_streams a:0 -show_entries stream=index -of csv=p=0 "$hls_url" | grep -q .; then
    nohup ffmpeg -hide_banner -loglevel info -re -fflags +genpts \
        -i "$hls_url" \
        -map 0:v:0 -map 0:a:0 \
        -c:v copy -c:a aac -b:a 128k -ar 44100 \
        "$out" > logs/record.log 2>&1 &
else
    nohup ffmpeg -hide_banner -loglevel info -re -fflags +genpts \
        -i "$hls_url" \
        -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 \
        -map 0:v:0 -map 1:a:0 \
        -c:v copy -c:a aac -b:a 128k -ar 44100 \
        "$out" > logs/record.log 2>&1 &
fi

echo $! > run/record.pid
printf "%s/%s\n" "$(pwd)" "$out" > run/record.path
sleep 3
kill -0 "$(cat run/record.pid)"
cat run/record.path
