#!/bin/bash
# Katechon demo quickstart
# Usage: ./start.sh
# Uploads entrypoint, (re)starts container, opens tunnels, starts local server.

set -euo pipefail

REMOTE="claudetorio-stream-server"
REMOTE_ENTRYPOINT="/tmp/entrypoint-hls.sh"
CONTAINER="katechon-desktop"
CONTAINER_IMAGE="katechon-stream-client:latest"
HOST_HLS_PORT=3100

log() { echo "[start] $*"; }

# ── 1. Upload entrypoint ───────────────────────────────────────────
log "Uploading entrypoint-hls.sh..."
scp "$(dirname "$0")/entrypoint-hls.sh" "${REMOTE}:${REMOTE_ENTRYPOINT}"

# ── 2. Restart container ───────────────────────────────────────────
log "Restarting ${CONTAINER} on ${REMOTE}..."
ssh "${REMOTE}" "
  docker rm -f ${CONTAINER} 2>/dev/null || true
  docker run -d --name ${CONTAINER} \
    --network psychic_train_net \
    --add-host=host.docker.internal:host-gateway \
    -p ${HOST_HLS_PORT}:3000 \
    --shm-size=2g \
    -e ANGLE_BACKEND=swiftshader \
    -v ${REMOTE_ENTRYPOINT}:/${REMOTE_ENTRYPOINT##*/}:ro \
    ${CONTAINER_IMAGE} \
    ${REMOTE_ENTRYPOINT}
"

# ── 3. Wait for HLS manifest ───────────────────────────────────────
log "Waiting for HLS stream to be ready..."
for i in $(seq 1 40); do
  result=$(ssh "${REMOTE}" "docker logs ${CONTAINER} 2>&1 | grep -c 'HLS ready' || true")
  [ "$result" -ge 1 ] && break
  sleep 2
done
log "HLS ready."

# ── 4. SSH tunnels ─────────────────────────────────────────────────
log "Opening SSH tunnels..."
# Kill any stale tunnels on our ports
for port in 9091 9092 9093 9095; do
  fuser -k "${port}/tcp" 2>/dev/null || true
done

# vtuber desktop HLS  →  container port 3100 on remote host
ssh -fN -L 9095:localhost:${HOST_HLS_PORT} "${REMOTE}"
# Open-LLM-VTuber avatar + WS
ssh -fN -L 9091:172.20.0.2:12393 "${REMOTE}"
# SPECTRE Flask dashboard
ssh -fN -L 9092:localhost:3010 "${REMOTE}"
# Minecraft HLS
ssh -fN -L 9093:localhost:3003 "${REMOTE}"

log "Tunnels open: 9091 (avatar) | 9092 (spectre) | 9093 (minecraft) | 9095 (vtuber HLS)"

# ── 5. Local Express server ────────────────────────────────────────
log "Starting local server on :4040..."
cd "$(dirname "$0")"
npm start
