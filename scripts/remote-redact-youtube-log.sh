#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

log_file="logs/youtube.log"
[ -f "$log_file" ] || exit 0

key="$(awk -F= '/^YOUTUBE_STREAM_KEY=/{sub(/^[^=]*=/,""); print; exit}' .env 2>/dev/null || true)"
base="$(awk -F= '/^YOUTUBE_RTMP_URL=/{sub(/^[^=]*=/,""); print; exit}' .env 2>/dev/null || true)"

if [ -n "$key" ]; then
    KEY="$key" perl -0pi -e 's/\Q$ENV{KEY}\E/[redacted]/g' "$log_file"
fi

if [ -n "$base" ]; then
    BASE="$base" perl -0pi -e 's/\Q$ENV{BASE}\E/rtmp:\/\/[redacted]/g' "$log_file"
fi
