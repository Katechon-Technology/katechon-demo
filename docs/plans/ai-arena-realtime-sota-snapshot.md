# AI Arena Realtime SOTA Snapshot Plan

Date: 2026-05-10

## Goal

Turn the `arena` channel from a synthetic head-to-head match view into a realtime SOTA snapshot for frontier AI capabilities. The channel should answer:

- Who is leading right now by capability area?
- What changed recently across public benchmark boards?
- What are prediction markets pricing about model releases and benchmark outcomes?
- Where do benchmark signals and market expectations disagree?

## Source Spine

### LMArena / Arena Leaderboards

Use the official `lmarena-ai/leaderboard-dataset` Hugging Face dataset as the primary benchmark source. It exposes latest and historical leaderboard data for text, vision, search, document, webdev/code, image, and video arenas.

Source: https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset

The adapter should read the `latest` split for:

- `text`, `text_style_control`
- `vision`, `vision_style_control`
- `search`, `search_style_control`
- `document`, `document_style_control`
- `webdev`
- `text_to_image`
- `image_edit`
- `text_to_video`
- `image_to_video`
- `video_edit`

The first implementation should use the Hugging Face Dataset Viewer rows API, which supports server-side slices of parquet-backed datasets.

Source: https://huggingface.co/docs/datasets-server/en/rows

### Polymarket AI Markets

Use read-only public Polymarket APIs:

- Gamma public-search for AI/model/release market discovery, with markets used as a fallback discovery pass.
- Later: CLOB public endpoints for orderbook depth, spreads, and price history.
- Later: Data API for activity/open-interest context.

Source: https://docs.polymarket.com/api-reference

### External Benchmark Spine

Add adapters incrementally after the first SOTA board works:

- LiveBench: https://github.com/livebench/livebench
- LiveCodeBench: https://github.com/livecodebench/livecodebench
- SWE-bench: https://github.com/SWE-bench/SWE-bench
- Hugging Face official benchmark leaderboard API: https://huggingface.co/docs/hub/leaderboard-data-guide
- Epoch AI Benchmarking Hub / ECI: https://epoch.ai/benchmarks/use-this-data
- Artificial Analysis API, if an API key is configured: https://artificialanalysis.ai/documentation

## Normalized Data Model

The channel should normalize feeds into these objects:

- `arenaBoards`: one row per Arena board, with leaders, model count, publish date, license mix, and source health.
- `frontierModels`: one row per model across boards, with top-3/top-10 counts, average rank, best board, organization, and license.
- `capabilityMatrix`: model-by-domain board scores for the main visual.
- `polymarketMarkets`: active AI/model/release markets with implied probability, volume, liquidity, and mapped model/lab entities.
- `marketSignals`: aggregate market expectations by lab/model.
- `divergence`: benchmark-vs-market disagreement cards.
- `sourceHealth`: per-feed freshness/error state.

Every generated or rendered component must carry source freshness and public source URLs. Stale benchmark data must look explicitly cached, not minute-live.

## UI Shape

- Top metrics: boards tracked, leading model, active AI markets.
- Primary stage: capability matrix showing frontier models across Arena boards.
- Right rail/feed: Polymarket AI release/model bets and source health.
- Inspector prompts: model detail, domain leaders, market odds, benchmark-market divergence.
- Feed rows: SOTA leaders, new/available market signals, source gaps.

## Implementation Order

1. Add a Markdown plan.
2. Register an `ai-sota` provider plus `lmarena` and `polymarket-ai` source metadata.
3. Rewire `arena` to use `ai-sota` as its live provider.
4. Implement the server-side adapter for LMArena latest boards and Polymarket AI market search.
5. Normalize the arena payload into metrics/feed/highlights plus rich data arrays.
6. Update the `arena` catalog copy, default prompts, and dense scene renderer.
7. Run endpoint checks against `/api/channels/arena/live`.

## Non-Goals For V1

- No trading, wallet, auth, or order placement.
- No browser-side provider fetches.
- No synthetic live claims when a provider fails.
- No broad external benchmark ingestion until the Arena plus Polymarket spine is working.
