# Refactor Notes - Remote Demo Runtime

## Goal

Keep development fast while making the remote server the canonical demo runtime. The live YouTube stream should not depend on a laptop staying connected.

## Current Runtime

```
developer machine
  rsync / git push
      |
      v
claudetorio-stream-server:/opt/katechon/katechon-demo
  Node UI/API on :4040
      |
      | HLS proxy + control calls
      v
katechon-desktop container on :3100 -> :3000
  Xvfb + Chromium + avatar overlay + FFmpeg HLS
      |
      +-> YouTube RTMP push
      +-> server-side recording
```

The browser UI loads HLS from same-origin `/stream.m3u8`. `server.js` proxies the manifest and `.ts` segments to `HLS_CONTROL_URL`, which is set to `http://127.0.0.1:3100` on the remote host and can remain `http://localhost:9095` for local tunnel-based development.

## Operational Targets

`Makefile` is the main sprint operator surface:

```makefile
deploy             # rsync repo to server, rebuild env, install deps, restart remote Node
remote-start       # restart only the remote Node UI/API
compositor-start   # cold-restart katechon-desktop
youtube-start      # push HLS to YouTube RTMP with generated silent AAC audio
youtube-stop       # stop YouTube FFmpeg
record-start       # record the HLS feed to recordings/*.mkv
record-stop        # stop recording
status             # check Node, HLS, container, YouTube, recording
logs               # tail server/container/YouTube/record logs
```

Runtime files are intentionally ignored:

- `.env`
- `logs/`
- `run/`
- `recordings/`
- `public/debug-audio.*`

## Why Same-Origin HLS Matters

The old UI hardcoded `http://localhost:9095/stream.m3u8`, which only works from a developer laptop with SSH tunnels. Once the UI is served from the remote host, that URL points at the viewer's machine. Same-origin `/stream.m3u8` works in both modes because the server chooses the upstream HLS URL through `HLS_CONTROL_URL`.

## Current Tradeoffs

- The compositor still needs a cold restart when `entrypoint-hls.sh` changes.
- `background.html` and `hls_server.py` are still embedded in `entrypoint-hls.sh`.
- The current deployed HLS stream is video-only by default, so the YouTube/recording FFmpeg processes add silent AAC audio.
- `supervisord` is not available in the current image, so it should not block sprint iteration.

## Next Refactor

Extract the mutable container assets into repo-controlled files and mount them read-only:

```
remote/
  background.html
  hls_server.py
  avatar-bridge.js
```

Then update the entrypoint to run the Python control server and Chromium pages from those mounted files. Without changing the image, a shell restart loop plus `docker exec ... pkill -f hls_server.py` is enough to hot-reload the API server. `supervisord` can wait until the image is rebuilt.

The highest-value next improvement is a real `deploy-remote` target that only syncs `remote/` and reloads the affected in-container process, leaving Xvfb, Chromium, and FFmpeg alive.
