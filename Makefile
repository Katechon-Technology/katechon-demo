REMOTE ?= claudetorio-stream-server
REMOTE_DIR ?= /opt/katechon/katechon-demo
CONTAINER ?= katechon-desktop
IMAGE ?= katechon-stream-client:latest
HOST_HLS_PORT ?= 3100

.SILENT:

RSYNC_EXCLUDES := \
	--exclude .git \
	--exclude node_modules \
	--exclude .env \
	--exclude logs \
	--exclude run \
	--exclude recordings \
	--exclude 'public/debug-audio.*'

.PHONY: deploy remote-env remote-install remote-start compositor-start status logs youtube-start youtube-stop record-start record-stop

deploy:
	rsync -az --delete $(RSYNC_EXCLUDES) ./ $(REMOTE):$(REMOTE_DIR)/
	$(MAKE) remote-env remote-install remote-start

remote-env:
	ssh $(REMOTE) 'set -eu; cd $(REMOTE_DIR); src=/opt/katechon/katechon-app/.env.local; [ -f "$$src" ] || src=/opt/katechon/.env; umask 077; : > .env; for key in GROQ_API_KEY ELEVENLABS_API_KEY ELEVENLABS_MODEL_ID ANTHROPIC_API_KEY YOUTUBE_RTMP_URL YOUTUBE_STREAM_KEY; do awk -F= -v k="$$key" '\''$$1 == k { print; exit }'\'' "$$src" >> .env || true; done; printf "%s\n" PORT=4040 HLS_CONTROL_URL=http://127.0.0.1:$(HOST_HLS_PORT) KAT_VOICE_SOURCE=pitch STREAM_AUDIO_ENABLED=1 >> .env; chmod 600 .env'

remote-install:
	ssh $(REMOTE) 'cd $(REMOTE_DIR) && npm ci --omit=dev --no-audit --no-fund'

remote-start:
	ssh $(REMOTE) 'set -eu; cd $(REMOTE_DIR); mkdir -p logs run; if [ -f run/server.pid ]; then old=$$(cat run/server.pid || true); if [ -n "$$old" ] && kill -0 "$$old" 2>/dev/null; then kill "$$old"; sleep 1; fi; fi; nohup npm start > logs/server.log 2>&1 & echo $$! > run/server.pid; sleep 1; kill -0 "$$(cat run/server.pid)"'

compositor-start:
	ssh $(REMOTE) 'docker rm -f $(CONTAINER) 2>/dev/null || true; docker run -d --name $(CONTAINER) --network psychic_train_net --add-host=host.docker.internal:host-gateway -p $(HOST_HLS_PORT):3000 --shm-size=2g -e ANGLE_BACKEND=swiftshader -v $(REMOTE_DIR)/entrypoint-hls.sh:/entrypoint-hls.sh:ro $(IMAGE) bash /entrypoint-hls.sh'

youtube-start:
	ssh $(REMOTE) 'set -eu; cd $(REMOTE_DIR); set -a; . ./.env; set +a; mkdir -p logs run; if [ -f run/youtube.pid ]; then old=$$(cat run/youtube.pid || true); if [ -n "$$old" ] && kill -0 "$$old" 2>/dev/null; then kill "$$old"; sleep 1; fi; fi; base=$${YOUTUBE_RTMP_URL:-rtmp://a.rtmp.youtube.com/live2}; key=$${YOUTUBE_STREAM_KEY:-}; if [ -n "$$key" ]; then case "$$base" in *"$$key"*) out="$$base" ;; *) out="$${base%/}/$$key" ;; esac; else out="$$base"; fi; nohup ffmpeg -hide_banner -loglevel info -re -fflags +genpts -i http://127.0.0.1:$(HOST_HLS_PORT)/stream.m3u8 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 128k -ar 44100 -f flv "$$out" > logs/youtube.log 2>&1 & echo $$! > run/youtube.pid; sleep 3; kill -0 "$$(cat run/youtube.pid)"'

youtube-stop:
	ssh $(REMOTE) 'cd $(REMOTE_DIR); [ -f run/youtube.pid ] && kill "$$(cat run/youtube.pid)" 2>/dev/null || true'

record-start:
	ssh $(REMOTE) 'set -eu; cd $(REMOTE_DIR); mkdir -p logs run recordings; if [ -f run/record.pid ]; then old=$$(cat run/record.pid || true); if [ -n "$$old" ] && kill -0 "$$old" 2>/dev/null; then kill "$$old"; sleep 1; fi; fi; stamp=$$(date -u +%Y%m%dT%H%M%SZ); out="$(REMOTE_DIR)/recordings/katechon-demo-$$stamp.mkv"; nohup ffmpeg -hide_banner -loglevel info -re -fflags +genpts -i http://127.0.0.1:$(HOST_HLS_PORT)/stream.m3u8 -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 128k -ar 44100 "$$out" > logs/record.log 2>&1 & echo $$! > run/record.pid; printf "%s\n" "$$out" > run/record.path; sleep 3; kill -0 "$$(cat run/record.pid)"; cat run/record.path'

record-stop:
	ssh $(REMOTE) 'cd $(REMOTE_DIR); [ -f run/record.pid ] && kill "$$(cat run/record.pid)" 2>/dev/null || true'

status:
	ssh $(REMOTE) 'set +e; echo "node: $$(curl -fsS -o /dev/null -w "%{http_code}" http://127.0.0.1:4040/)"; echo "hls: $$(curl -fsS -o /dev/null -w "%{http_code}" http://127.0.0.1:$(HOST_HLS_PORT)/stream.m3u8)"; docker ps --filter name=$(CONTAINER) --format "{{.Names}} {{.Status}} {{.Ports}}"; for name in server youtube record; do pidfile=$(REMOTE_DIR)/run/$$name.pid; if [ -f "$$pidfile" ] && kill -0 "$$(cat "$$pidfile")" 2>/dev/null; then echo "$$name: running pid=$$(cat "$$pidfile")"; else echo "$$name: stopped"; fi; done; [ -f $(REMOTE_DIR)/run/record.path ] && echo "recording: $$(cat $(REMOTE_DIR)/run/record.path)"'

logs:
	ssh $(REMOTE) 'cd $(REMOTE_DIR); tail -n 80 logs/server.log 2>/dev/null; echo "--- compositor"; docker logs --tail 80 $(CONTAINER); echo "--- youtube"; tail -n 40 logs/youtube.log 2>/dev/null | sed -E "s#rtmp://[^ ]+#rtmp://[redacted]#g"; echo "--- record"; tail -n 40 logs/record.log 2>/dev/null'
