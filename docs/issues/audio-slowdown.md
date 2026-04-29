# Investigate avatar slowdown after enabling remote HLS audio

## Summary

Enabling the remote audio path makes the streamed avatar visibly laggy compared with the known-smooth video-only baseline.

## Stable baseline

Remote server was restored to commit `8fa20e9` (`Run demo from remote server`).

Verified after rollback:

- UI: `200` on port `4040`
- HLS: `200` on port `3100`
- HLS contains `h264` video only, no `aac`
- compositor log: `HLS audio mux disabled; using smooth video-only stream.`
- YouTube/recording stopped during rollback

## Regression window

- `8fa20e9`: known-smooth remote baseline
- `8586c2f`: adds optional PulseAudio/HLS speech muxing and remote avatar voice bridge
- `4969f84`: makes remote ops prefer audio via `make stream-audio-restart`

## Findings

- GPU passthrough/Vulkan reduced compositor CPU dramatically, but did not fix the visible lag.
- FFmpeg timestamp fixes removed duplicate-frame warnings in testing, but did not fix perceived lag.
- Direct avatar speech probe started WebAudio quickly, around 24 ms after queueing.
- Likely suspect: HLS player/live-edge latency when UI relies on streamed audio. Current path uses 2s HLS segments and hls.js `liveSyncDurationCount: 3`.

## Next steps

1. Reproduce from `8fa20e9` in video-only and audio-enabled modes.
2. Measure browser HLS live-edge delay.
3. Test low-latency HLS settings: shorter segments, smaller hls.js live sync, and clearing stale segments on start.
4. Consider keeping immediate local/WebAudio playback for the operator UI while muxing audio only for YouTube/recording.

## Acceptance criteria

- Avatar remains as smooth as `8fa20e9`.
- Kat audio is audible in streamed/recorded output.
- Local demo UI does not sit multiple HLS segments behind speech/avatar events.
