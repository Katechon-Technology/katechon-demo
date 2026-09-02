# Katechon Demo Episode Source Packet Template

Use this as the second prompt after loading the canonical director prompt at
`docs/demo-episode-director-prompt.md`.

For rapid implementation after this source packet is filled in, use
`docs/fast-demo-generation-prompt.md`.

```text
Use the canonical Katechon demo episode director prompt at:
docs/demo-episode-director-prompt.md

Then execute rapidly using:
docs/fast-demo-generation-prompt.md

Create a 30-40 second MP4 demo from the source packet below.

Remember:
- Build With Us is the format and capture frame, not the episode subject.
- The episode must use exactly two voices: Narrator and Kat.
- Narrator uses ElevenLabs unless overridden.
- Kat uses the OpenAI Realtime Kat voice path.
- The interaction pattern should match fast-image-gen: narrator frames, asks Kat
  for a generated view, Kat answers, the screen rebuilds, narrator asks for a
  sharper angle, Kat responds again.
- All media jobs should be planned as a parallel batch before capture.
- Final output must be an MP4 under artifacts/.

## Episode Slug
[short-slug]

## Source Set
- [source link 1]
  - distilled fact:
  - exact quote:
  - timestamp/date:
- [source link 2]
  - distilled fact:
  - exact quote:
  - timestamp/date:
- [market/source/API/embed]
  - key state:
  - visible number/odds/status:
  - retrieval timestamp:

## Demo Thesis
[One sentence: what this demo proves about Katechon.]

## Interaction Intent
1. Narrator ask #1:
   [Example: "Kat, build me the channel around this source."]
2. Narrator ask #2:
   [Example: "Show me the hidden mechanism and what the market thinks happens next."]

## Voice Guidance
- Narrator voice: [George / Simon / other ElevenLabs voice]
- Kat voice: [OpenAI Realtime Kat voice]
- Pronunciation notes:
- Tone: casual, direct, fourth-wall-aware, fast but not frantic.

## Aesthetic Profile
- Overall look:
  [Example: futuristic anime, sober market intelligence, documentary tactical,
  editorial financial terminal, etc.]
- Palette:
  [specific color references or brand palette]
- Motion:
  [slow push-ins, UI rebuilds, scanline/matrix overlay, hard cuts, crossfades]
- UI texture:
  [market rails, source logs, schematic overlays, data cards, provenance chips]
- Media texture:
  [photoreal / cel-shaded / archival / satellite / studio product footage]
- Avoid:
  [stock footage look, illegible text, clutter, unrelated symbols, etc.]
- Brand constraints:
  Katechon branded intro and outro; keep the Build With Us bounded stage and Kat
  placement.

## Asset Briefs
Provide enough direction that the episode director does not have to invent the
top-level media ideas.

Videos, 3-4:
- id:
  purpose:
  brief:
  target path:
- id:
  purpose:
  brief:
  target path:

Images/stills, 3-4:
- id:
  purpose:
  brief:
  target path:

UI/graphics, 2-3:
- id:
  purpose:
  visible text/data:
  target path or renderer section:

## Required On-Screen Proof
- source/provenance rail:
- generated-state labels:
- market/data values:
- timestamps:
- model/generator labels:

## Output
- MP4 path: artifacts/[episode-slug]/[episode-slug]-demo.mp4
- Target duration: 30-40 seconds.
- Capture/review notes:
```
