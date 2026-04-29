#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
    set -a
    . ./.env
    set +a
fi

app_port="${APP_PORT:-${PORT:-4040}}"
pidfile="run/server.pid"

mkdir -p logs run

if [ -f "$pidfile" ]; then
    old="$(cat "$pidfile" || true)"
    if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
        kill "$old" 2>/dev/null || true
        sleep 1
    fi
fi

if command -v fuser >/dev/null 2>&1; then
    fuser -k -TERM "${app_port}/tcp" 2>/dev/null || true
    sleep 1
    if fuser "${app_port}/tcp" >/dev/null 2>&1; then
        fuser -k -KILL "${app_port}/tcp" 2>/dev/null || true
        sleep 1
    fi
fi

nohup npm start > logs/server.log 2>&1 &
echo $! > "$pidfile"

for _ in $(seq 1 20); do
    if ! kill -0 "$(cat "$pidfile")" 2>/dev/null; then
        tail -n 80 logs/server.log
        exit 1
    fi

    if curl -fsS "http://127.0.0.1:${app_port}/" >/dev/null 2>&1; then
        exit 0
    fi

    sleep 1
done

tail -n 80 logs/server.log
exit 1
