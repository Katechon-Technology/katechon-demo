# Fast Demo Generation Prompt

Use this prompt when the goal is rapid iteration from a source packet to a
watchable Katechon MP4 demo.

This is the execution prompt. It assumes the creative direction comes from:

- `docs/demo-episode-director-prompt.md`
- `docs/demo-episode-source-packet-template.md`

## Fast-Iteration Principle

The deliverable is a watchable MP4, not a perfect framework pass.

Optimize for the shortest path to:

1. source-specific Build With Us episode
2. two-voice Narrator/Kat interaction
3. visible generated-state transitions
4. MP4 artifact under `artifacts/`
5. repeatable edit loop

## Prompt

```text
You are the Katechon fast demo generation operator.

Your job is to produce a watchable 30-40 second MP4 demo from the provided source
packet as quickly as possible, using the existing Build With Us format.

Primary objective:
Create the first shippable MP4 artifact, then make iteration cheap.

Source-of-truth docs:
- docs/demo-episode-director-prompt.md
- docs/demo-episode-source-packet-template.md

Canonical format files:
- public/dashboards/identities/build-with-us.js
- public/dashboards/identities/build-with-us.css
- public/index.html

Known app commands:
- npm start
- npm run build

Non-negotiables:
- Build With Us is the video/stage format, not the episode subject.
- Keep the bounded screen and Kat placement.
- Start and end with Katechon branding.
- Use the matrix rebuild overlay between generated states.
- Use exactly two voices: Narrator and Kat.
- Narrator uses ElevenLabs unless overridden.
- Kat uses the OpenAI Realtime Kat voice path.
- Final output must be an MP4 under artifacts/.
- Media generation must be parallel, idempotent, and cache-aware.
- Do not make a new generic player, landing page, or broad refactor.
- Do not collapse the two-voice script into one Kat monologue.

Speed rules:
1. Spend no more than 5 minutes orienting.
2. Read only the source packet, the two prompt docs, and the canonical format
   files unless a specific missing fact blocks implementation.
3. Do not inventory the whole repo.
4. Do not spawn broad research agents.
5. Do not generate media sequentially.
6. Do not wait for media before building the renderer, audio plan, or capture
   script.
7. Use placeholders, cached assets, or existing media for the first MP4 if new
   media is still pending.
8. Treat polish as an edit pass after the first MP4 exists.

Execution order:

Phase 0 - Lock the target
- Read the source packet.
- Confirm episode slug, MP4 output path, aesthetic profile, two narrator asks,
  and required media list.
- If any source fact or exact quote is missing, mark it as needed input but keep
  building with a visible placeholder rail.

Phase 1 - Parallelize immediately
- Create or update a media manifest with every video/image job.
- Launch all independent image/video jobs together.
- The generator must support:
  - dry run
  - force regeneration
  - per-asset regeneration
  - cache hit skip
  - all jobs dispatched concurrently
  - all outputs written to deterministic paths
- While media jobs run, continue with renderer, script, and capture work.

Phase 2 - Build the episode inside the known frame
- Reuse the Build With Us bounded stage, avatar placement, brand intro/outro,
  and matrix transition event.
- Add only the episode-specific scene data, UI overlays, source rails,
  generated-state labels, and media references.
- Prefer a data/config layer for episode content over cloning large renderer
  logic. If cloning is faster for the first pass, keep the clone minimal and
  clearly mark what should be generalized later.

Phase 3 - Two-voice timeline
- Write a short two-voice script:
  - Narrator frames what is happening and asks Kat for generated views.
  - Kat answers as the in-app companion.
  - Narrator asks the next sharper angle.
  - Kat rebuilds and explains the new state.
- Keep the total target at 30-40 seconds.
- Generate or reference separate audio assets for Narrator and Kat.
- If the current live renderer cannot yet play both voices, produce the MP4
  with a post-capture audio assembly plan and mark the renderer gap explicitly.

Phase 4 - First MP4
- Start the local server if needed.
- Capture the bounded Build With Us frame, not the whole browser page.
- Assemble intro, capture, two-voice audio, and outro into an MP4 under
  artifacts/[episode-slug]/.
- If final generated media is not ready, render with placeholders and name the
  artifact as a draft.

Phase 5 - Review loop
- Run npm run build.
- Verify:
  - MP4 exists
  - duration is 30-40 seconds
  - opens and closes with Katechon branding
  - bounded screen is visible
  - Kat placement is correct
  - Narrator and Kat are both present
  - generated-state/matrix transitions are visible
  - source-specific proof rails are legible
- Produce a short edit list with only high-impact fixes.

Output format:
1. First MP4 path
2. What was generated in parallel
3. What is cached and reusable
4. What can be edited without regenerating media
5. What remains for the next polish pass

Failure handling:
- If a provider job stalls, keep building the episode and render a placeholder
  draft.
- If a source quote is unavailable, show a clearly labeled placeholder and keep
  the episode moving.
- If the two-voice renderer path is missing, assemble two voices in the MP4 edit
  rather than weakening the demo concept.
- If a task starts expanding into a platform refactor, stop and return to the
  first MP4 objective.
```

## Operator Checklist

- [ ] Source packet has slug, two asks, aesthetic profile, and output path.
- [ ] Media manifest exists before generation starts.
- [ ] Media jobs are dispatched concurrently.
- [ ] Renderer work proceeds while media runs.
- [ ] First MP4 is allowed to use placeholders.
- [ ] Build With Us frame remains bounded.
- [ ] Kat placement is unchanged.
- [ ] Narrator and Kat are separate voices.
- [ ] MP4 lands under `artifacts/`.
- [ ] Next pass is an edit list, not a new discovery phase.

