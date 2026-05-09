# Viral Market Channels Goal

## Goal Contract

By Tuesday, May 12, 2026, Katechon should feel less like a broad demo library
and more like a viral market-native product:

```text
Ask a live market to become an app. Share the result.
```

The launch surface should focus on three channels:

- `crypto-trading`: live crypto market structure.
- `polyrec`: prediction-market intelligence.
- `meme-coin`: social/token velocity.

Each channel must deliver the same core loop:

1. The user opens a channel with no heavy setup.
2. The user speaks to Kat or clicks one high-intent prompt.
3. The channel visibly morphs into a new live software state.
4. Kat explains the change in one concise, useful line.
5. The user shares the resulting state as a 20-second channel object.
6. A recipient can open the shared object and fork it with one prompt.

The goal is not to finish the whole platform. The goal is to make one product
truth undeniable: Katechon turns markets into shareable live software.

## Pasteable Agent Goal

```text
/goal Build the Viral Market Channels launch wedge described in docs/plans/viral-market-channels-goal.md. Do not broaden the product beyond the three focused channels: crypto-trading, polyrec, and meme-coin. The finished experience must let a first-time user open one of those channels, run a high-impact market prompt, see the channel morph into a useful generated state with visible data provenance, share that state as a 20-second replayable channel object, and let another user open and fork the shared state. Optimize for a 100+ person launch week, wow factor, replayability, and clear investor narrative. Treat real wallet/trade execution, paid gating, and broad dashboard refactors as out of scope unless explicitly reintroduced.
```

## Strategic Frame

Katechon is not an AI dashboard product.

Katechon is a channel layer for generated software states:

```text
live feed + specialist agent + state + surface + memory + share object
```

For this launch, every product decision should reinforce four verbs:

- Watch: the channel is interesting before the user does anything.
- Command: the user can reshape the channel with natural language.
- Share: the resulting state is an object, not a screenshot.
- Fork: the recipient can continue from the saved state.

If a feature does not strengthen one of those verbs, it should be cut from the
Tuesday scope.

## Critical Product Correction

The channel should not feel like a fixed dashboard with a small generated panel
or chart added on top.

The intended effect is closer to a flipbook of live software states:

```text
prompt -> whole-channel state -> whole-channel surface -> shareable page
```

Each meaningful prompt should produce a new coherent channel page. The existing
dashboard is only the starting state, not the permanent container. A successful
mutation can change:

- page title and thesis,
- global layout,
- stage composition,
- evidence rail,
- visual density,
- primary chart/table/board type,
- interaction affordances,
- next prompts,
- share/replay framing,
- avatar/control placement.

The generated state should feel like a tailored mini-application backed by a
specific API and interaction model, not a decorative overlay inside a generic
dashboard.

### Minor Mutation Is Failure

These are not enough:

- replacing one card,
- adding one chart over the same dashboard,
- changing only the right rail,
- leaving the original dashboard information architecture intact,
- keeping irrelevant base panels visible after the user asks a new question,
- calling a state "generated" when the page still reads as the old dashboard.

The user should be able to feel the page turn.

### Full-Surface Transformation Rule

Every hero prompt must generate a complete surface spec:

```text
theme + layout + thesis + primary stage + evidence rail + interactions + next prompts + share framing
```

This spec should be validated and rendered as the active channel state. The old
dashboard can remain as a fallback, but it should not dominate the generated
state after a successful command.

## Depth Stack Interaction Model

Generated channels should feel depth-specific.

The original dashboard is depth `0`. Each meaningful mutation moves the user
one level deeper into a generated channel state:

```text
original channel > generated state >> deeper investigation >>> focused detail
```

The UI should make that depth visible. A simple first version can use `>`,
`>>`, `>>>`, or a compact breadcrumb/rail:

```text
Crypto Trading
> BTC 3M Structure
>> ETH Comparison
>>> Liquidity Detail
```

The user can always click back to any prior depth, including the original
channel.

### Depth Rules

- Depth `0` is the original/base channel.
- Depth `1` is the first generated page from a hero prompt or avatar command.
- Depth `2+` are follow-up generated pages from next-action clicks or Kat
  commands.
- Each depth owns a complete generated page state.
- Back navigation restores the exact prior state, not an approximate rerender.
- Share objects should preserve the current depth and its ancestry.
- Forking can start from any depth.

### Why Depth Matters

This is how Katechon shows generative channels instead of explaining them. The
viewer sees that every interaction creates a new live software state while the
prior states remain reachable. It should feel like browsing deeper into a
generated app, not like editing a static dashboard.

## Avatar-First Interaction Model

All user-facing interaction should happen through Kat and direct clickable
affordances.

The dashboard itself should not expose typed command boxes. The product needs to
show, not tell, how generative channels work: the user speaks to the avatar,
clicks suggested prompts or actions, watches the channel become a new page, then
shares or forks that state.

Allowed user-facing inputs:

- avatar voice command,
- clickable prompt chips,
- clickable next actions,
- share/fork buttons,
- inspector or board item clicks.

Disallowed user-facing inputs:

- dashboard text command boxes,
- generic chat inputs embedded in the dashboard,
- asking users to type custom prompts into the channel UI,
- form-heavy dashboard controls that make the experience feel like a normal app
  builder.

Implementation note: backend routes and automated tests may still pass prompt
strings to `POST /api/channels/:channel/turn`. That is an internal transport and
test mechanism, not the public interaction model.

## Audience

Primary launch audience:

- crypto-native builders,
- prediction-market users,
- meme-coin and onchain culture watchers,
- AI/product people who understand that a generated dashboard is more
  interesting when it remains live and forkable.

Secondary launch audience:

- investors evaluating whether Katechon can become a venture-scale interface
  company,
- frontier AI builders looking for new product surfaces beyond chat and
  generated media.

The week-one product should not be positioned for generic consumers yet. It
should be sharp, weird, useful, and immediately legible to market-native users.

## North Star

One sentence:

```text
Katechon turns any market moment into a live channel you can command and share.
```

One demo:

```text
Open Crypto Trading -> ask "BTC three months" -> chart appears with provenance
and next moves -> share -> recipient opens the replay and asks "compare ETH."
```

One launch metric:

```text
100+ real humans use a market channel during launch week.
```

## Success Conditions

### Product Success

- A new user reaches a useful generated market state in under 60 seconds.
- The user does not need to understand the internal channel runtime.
- Each focused channel has at least three high-impact clickable prompt actions.
- Each focused channel can accept avatar voice commands when voice is available.
- Each focused channel remains usable through clickable prompts if voice is
  degraded.
- No focused dashboard asks the user to type into a channel command box.
- Each focused channel visibly replaces the stage/rail surfaces after a prompt.
- Each generated state includes a source/provenance card.
- Each generated state has a share action that persists the generated state.
- A shared state opens directly into fullscreen channel mode.
- A recipient can fork the shared state with one follow-up prompt.

### Viral Success

- At least 100 unique users open the product during launch week.
- At least 40 users open one of the three focused market channels.
- At least 25 users run a prompt or click a prompt button.
- At least 10 share objects are created.
- At least 5 shared objects are opened by someone other than the creator.
- At least 3 users fork a shared object.

These numbers are deliberately modest. The real test is whether the product
creates a behavior that can compound.

### Investor Success

An investor should be able to understand this in one minute:

- Katechon is not a dashboard gallery.
- A channel is a live software object.
- The user can command a channel.
- The resulting state can be shared and forked.
- The company can own a graph of watched, commanded, shared, and acted-inside
  software states.

### Technical Success

- The three focused channels use the existing channel runtime routes:
  - `GET /api/channels/:channel/context`
  - `POST /api/channels/:channel/query`
  - `POST /api/channels/:channel/turn`
  - `POST /api/channels/:channel/update`
- New work preserves the normalized live envelope and provenance model.
- Share objects persist enough state to replay and fork:
  - channel id,
  - user prompt,
  - generated layout,
  - generated surfaces,
  - data requests,
  - provenance records,
  - source/fallback state,
  - Kat narration,
  - next actions.
- If voice fails, clickable prompt execution still works.
- Synthetic/fallback data is never presented as live data.

## Fail Conditions

The launch fails if any of these are true:

- A first-time user sees 18 equal choices and does not know what to do.
- The user can only watch dashboards but cannot command them.
- The product requires email before the user sees the core magic.
- The share button only shares a generic dashboard URL.
- Shared links do not preserve the generated state.
- The product claims live data when it is using fallback/synthetic state.
- Realtime voice instability blocks the core prompt-to-morph loop.
- The dashboard relies on typed prompt input to demonstrate the core loop.
- The team spends the sprint on server refactors, paid gating, wallets, or
  broad architecture instead of the three visible wow moments.
- The demo depends on real trading execution to feel impressive.
- An investor describes the product as "AI dashboards" after seeing it.

## Explicit Non-Goals For Tuesday

- No real wallet deposits.
- No real trade execution.
- No paid quota or upgrade wall.
- No full auth migration.
- No broad server modularization.
- No attempt to polish all 18 channels.
- No provider-perfect historical data across every domain.
- No arbitrary user-generated code execution.
- No hidden fallback data.

Wallets, trade execution, paid gating, and broad channel expansion become more
valuable after the command/share/fork loop is proven.

## Product Architecture

### Shared Object Model

Every focused channel should produce a `channelShareObject`.

```json
{
  "id": "share_crypto_abc123",
  "channelId": "crypto-trading",
  "createdAt": "2026-05-12T00:00:00.000Z",
  "creatorSessionId": "local-session",
  "depth": 1,
  "ancestry": [
    {
      "depth": 0,
      "label": "Crypto Trading",
      "stateId": "base:crypto-trading"
    }
  ],
  "prompt": "BTC three months",
  "headline": "BTC 3M Price Structure",
  "summary": "A live BTC price-structure replay with source provenance.",
  "layout": {
    "template": "historical_replay",
    "rationale": "The user asked for a three-month BTC price view."
  },
  "surfaces": {
    "stageOverlay": [],
    "rail": [],
    "modal": []
  },
  "dataRequests": [],
  "provenanceRecords": [],
  "sourceState": {
    "sourceType": "live_api",
    "provider": "hyperliquid",
    "fallbackReason": null
  },
  "narration": {
    "script": "BTC three-month structure is now on stage, backed by Hyperliquid candles.",
    "durationSeconds": 20
  },
  "replay": {
    "durationSeconds": 20,
    "steps": [
      { "at": 0, "type": "open_channel" },
      { "at": 4, "type": "show_stage" },
      { "at": 11, "type": "show_provenance" },
      { "at": 16, "type": "show_next_actions" }
    ]
  },
  "forkPrompts": [
    "Compare ETH over the same window",
    "Zoom into the last 7 days",
    "Add liquidity and depth"
  ]
}
```

This can initially live in a file-backed store if necessary. Durability matters
less than proving the loop, but the schema should be designed so it can move to
a database without changing the public contract.

### Launch UI Shape

The first screen should not present every dashboard equally.

Recommended launch hierarchy:

1. Hero command area:
   - "Turn a market into a live channel."
   - Three cards: Crypto, Polymarket, Meme.
   - Each card has one primary prompt and two secondary prompts.
2. Focused channel row:
   - `crypto-trading`
   - `polyrec`
   - `meme-coin`
3. Labs drawer:
   - other existing channels remain accessible but visually secondary.

The app can still keep the current 18-channel grid for investor walkthroughs,
but the public launch route should push users into one of the three market
loops quickly.

### Avatar And Click Command Model

Kat owns the command interaction. The dashboard should provide clickable
suggestions and direct actions, not typed command boxes.

Each focused channel needs:

- visible prompt chips,
- visible next-action buttons,
- push-to-talk through Kat when stable,
- same result path for clicked prompts, clicked next actions, and avatar voice.

The runtime event should be the same regardless of user-facing source:

```text
Kat/click -> channel turn -> data query -> state update -> full-page surface -> share object
```

### Wow Rule

Every generated state must produce one obvious visual transformation:

- The stage changes.
- The rail changes.
- The source/provenance card changes.
- The next actions change.

If a user cannot tell that the channel became a new software state, the turn
does not count.

## Component Part 1: Crypto Trading Agent

### Assignment

Agent 1 owns `crypto-trading`.

### Mission

Make Crypto Trading the clearest proof that a user can turn a market question
into a live software state.

### Target Feeling

The user should feel:

```text
I asked for BTC structure and the whole terminal rebuilt itself around the investigation.
```

### Hero Prompts

- `BTC three months`
- `Compare BTC and ETH over the last week`
- `Show liquidity and depth around BTC right now`

### Required Modes

- Historical replay.
- BTC/ETH/SOL comparison.
- Liquidity/depth inspection.
- Volatility or drawdown anomaly.

### Required Surfaces

Stage:

- Primary chart from Hyperliquid-backed data where available.
- `line`, `candlestick`, `market-depth`, or `volume` visualization.

Rail:

- market stats,
- insight card,
- provenance/source card,
- next actions.

Modal:

- optional candle/book-level inspector,
- can remain cleared for Tuesday if stage and rail are excellent.

### Share Object Examples

- "BTC 3M Price Structure"
- "ETH vs BTC 7D Divergence"
- "BTC Liquidity Pocket"
- "SOL Volatility Regime"

### Viral Packaging

Suggested share copy:

```text
I asked Katechon for BTC 3M and it built a live market channel.
```

Suggested clip:

```text
0s: empty Crypto channel
2s: prompt appears: BTC three months
5s: stage morphs into chart
10s: provenance card appears
14s: next actions appear
18s: share link appears
```

### Agent 1 Success Conditions

- `crypto-trading` supports all three hero prompts.
- Prompt result appears in under 6 seconds on a normal connection.
- Hyperliquid source state is visible when live data succeeds.
- Fallback state is explicit if live data fails.
- Share object preserves generated stage and rail.
- Fork prompt can create a second valid channel state.

### Agent 1 Fail Conditions

- Crypto looks like a static trading dashboard.
- The generated view is just a chart without state, provenance, or next action.
- The user cannot share the generated state.
- The channel implies trading execution is available when it is not.

### Suggested Ownership

Primary files:

- `server.js` channel turn/query paths for `crypto-trading`.
- `lib/channel-registry.js` crypto manifest/capability copy.
- `public/dashboards/catalog.js` crypto public copy and hero prompts.
- `public/dashboards/prototype.js` generated component rendering if needed.

Avoid touching:

- Polymarket-specific prompt copy.
- Meme-specific data semantics.
- Broad landing-page routing unless coordinated.

## Component Part 2: Polyrec Agent

### Assignment

Agent 2 owns `polyrec`.

### Mission

Make Polyrec the best shareable prediction-market intelligence surface on the
internet for a casual but market-literate user.

### Target Feeling

The user should feel:

```text
I can ask what prediction markets are mispricing, and Katechon gives me a live board I can share.
```

### Hero Prompts

- `Show the weirdest active markets`
- `Find markets with high volume and close odds`
- `Build a live board for election and macro markets`

### Required Modes

- Active market discovery.
- Weird/interesting market ranking.
- Close-odds/high-volume board.
- Category board for politics, macro, sports, crypto, or culture.

### Required Surfaces

Stage:

- ranked prediction market board,
- odds/probability chart,
- volume/spread board,
- category comparison.

Rail:

- top market inspector,
- source/provenance card,
- "why this is interesting" card,
- next actions.

Modal:

- focused market detail if available,
- can be a generated inspector backed by Gamma data for Tuesday.

### Share Object Examples

- "Weirdest Polymarket Board"
- "Close Odds, High Volume"
- "Election Market Watch"
- "Crypto Prediction Market Drift"

### Viral Packaging

Suggested share copy:

```text
Katechon found the weirdest live Polymarket board and made it forkable.
```

Suggested clip:

```text
0s: Polyrec opens
3s: prompt appears: weirdest active markets
6s: ranked board materializes
11s: Kat explains why one market is interesting
15s: provenance/source card appears
19s: viewer sees "fork this board"
```

### Agent 2 Success Conditions

- `polyrec` supports all three hero prompts.
- The channel returns a visually clear ranked board from public Polymarket data.
- The user can understand why the selected markets are interesting.
- The board is shareable and replayable.
- Recipient can fork by category, odds range, volume, or keyword.

### Agent 2 Fail Conditions

- Polyrec only lists raw market questions without interpretation.
- The channel does not explain why the market set matters.
- It claims order-book or trading precision not present in available data.
- Share replay opens a generic Polyrec dashboard instead of the generated board.

### Suggested Ownership

Primary files:

- `server.js` channel capability normalization for `polyrec`.
- `lib/channel-registry.js` Polyrec manifest/capability copy.
- `public/dashboards/catalog.js` Polyrec public copy and hero prompts.
- `public/dashboards/prototype.js` table/board rendering if needed.

Avoid touching:

- Hyperliquid-specific crypto code.
- Meme/token velocity heuristics.
- General share-object schema without coordination.

## Component Part 3: Meme Coin Agent

### Assignment

Agent 3 owns `meme-coin`.

### Mission

Make Meme Coin the most culturally viral channel: a funny, sharp, useful social
market radar that people want to share even when they do not trade.

### Target Feeling

The user should feel:

```text
This is a live radar for attention, liquidity, narrative velocity, and decay.
```

### Hero Prompts

- `Find the fastest moving meme coins`
- `Show attention vs liquidity risk`
- `Build a board for tokens that look viral but fragile`

### Required Modes

- Token velocity ranking.
- Attention/liquidity mismatch.
- Viral-but-fragile board.
- Narrative decay board.

### Required Surfaces

Stage:

- token velocity leaderboard,
- attention vs liquidity scatter,
- risk/fragility board,
- narrative decay timeline.

Rail:

- top token inspector,
- source/provenance card,
- "why this might be fragile" card,
- next actions.

Modal:

- optional token detail inspector.

### Share Object Examples

- "Fastest Moving Meme Coins"
- "Attention vs Liquidity Risk"
- "Viral But Fragile"
- "Narrative Decay Watch"

### Viral Packaging

Suggested share copy:

```text
Katechon built a live meme-coin radar for attention vs liquidity.
```

Suggested clip:

```text
0s: Meme Coin opens
2s: prompt appears: viral but fragile
6s: token board appears
10s: fragility/risk card appears
15s: provenance card labels the data source
19s: share/fork prompt appears
```

### Agent 3 Success Conditions

- `meme-coin` supports all three hero prompts.
- The generated board is visually distinctive and culturally legible.
- The channel does not present itself as financial advice.
- Risk, liquidity, and fallback/source state are visible.
- Share object preserves the generated board.
- Fork prompt can refine by speed, liquidity, fragility, or narrative decay.

### Agent 3 Fail Conditions

- Meme Coin feels like a generic crypto dashboard.
- The channel encourages trading without guardrails.
- The generated output is funny but not useful.
- The generated output is useful but not shareable.
- Source/fallback state is hidden.

### Suggested Ownership

Primary files:

- `server.js` channel capability normalization for `meme-coin`.
- `lib/channel-registry.js` Meme Coin manifest/capability copy.
- `public/dashboards/catalog.js` Meme Coin public copy and hero prompts.
- `public/dashboards/prototype.js` generated board/scatter rendering if needed.

Avoid touching:

- Polymarket-specific market ranking.
- Hyperliquid crypto chart logic.
- General share-object schema without coordination.

## Shared Integration Requirements

The three agents must converge on one consistent product loop.

### Prompt Buttons

Each channel must expose three visible clickable prompts.

Prompt button payload:

```json
{
  "channelId": "crypto-trading",
  "label": "BTC three months",
  "prompt": "BTC three months",
  "intent": "historical_replay"
}
```

Clicking a prompt should call the same channel turn path as avatar voice.

### No Typed Dashboard Commands

Focused channels should not expose text command inputs. Freeform natural
language belongs to Kat's avatar voice path.

If voice is degraded, the fallback is not typing. The fallback is a richer set
of clickable prompt chips and next-action buttons.

Example clickable prompts:

- Crypto: `BTC three months`, `Compare BTC and ETH`, `Inspect BTC depth`
- Polyrec: `Weirdest markets`, `Close odds and high volume`, `Politics board`
- Meme: `Fastest moving`, `Attention vs liquidity`, `Viral but fragile`

### Share Action

The share action should create a persisted channel object.

Minimum route shape:

```text
POST /api/channel-shares
GET /api/channel-shares/:id
GET /share/channel/:id
```

If the final route differs, the public contract must still support:

- create,
- resolve,
- open replay,
- fork.

### Replay

The replay can be simple for Tuesday:

- open channel fullscreen,
- restore the current depth and its generated page state,
- show the visible depth breadcrumb/back controls,
- play or show 20-second Kat narration,
- sequence visual emphasis across stage, provenance, and next actions.

It does not need video export in v1. It needs to feel like a shareable live
object when opened in the browser.

### Fork

Forking means:

- start from the shared channel state,
- preserve the shared depth ancestry,
- send a new user prompt,
- produce a new generated state one level deeper,
- allow sharing the fork.

Forking does not require account identity in v1.

### Instrumentation

Add event tracking even if it is initially file-backed:

- `visit`
- `channel_opened`
- `prompt_clicked`
- `prompt_submitted`
- `channel_morphed`
- `share_created`
- `share_opened`
- `share_forked`

Each event should include:

- timestamp,
- session id,
- channel id,
- current depth,
- parent depth or source state id when relevant,
- share id when relevant,
- prompt text when relevant,
- source state/fallback flag when relevant.

## Component Part 4: Viral Loop And Demo Orchestration Agent

### Assignment

Agent 4 owns the shared launch shell, share/replay/fork substrate,
instrumentation, and demo-readiness layer.

This agent does not own the internals of `crypto-trading`, `polyrec`, or
`meme-coin`. Its job is to make the work from Agents 1-3 land as one coherent
product.

### Mission

Make the three channel agents feel like one viral application:

```text
open -> prompt -> morph -> share -> replay -> fork
```

The agent should optimize for first-session clarity, shareability, launch-week
measurement, and a demo that does not break under pressure.

### Why This Is Needed

The three channel agents can each build impressive generated states, but a viral
loop requires shared infrastructure and choreography:

- a focused first screen,
- no email wall before the magic moment,
- one Kat/click command path,
- share-object creation,
- share-object replay,
- fork flow,
- social metadata,
- instrumentation,
- demo fallbacks,
- QA script.

If no one owns this layer, the product can still regress into three impressive
but disconnected dashboards.

### Required Launch Shell

The public launch route should prioritize the three focused channels.

Required elements:

- headline: `Turn a market into a live channel.`
- subcopy: `Ask about crypto, prediction markets, or meme coins. Katechon builds a live software state you can share and fork.`
- three primary cards:
  - Crypto: `BTC three months`
  - Polymarket: `Weirdest active markets`
  - Meme: `Viral but fragile`
- avatar voice entry through Kat,
- prompt chips and next-action buttons for each channel,
- clear share/fork controls after a successful morph,
- secondary access to the broader channel grid without making it the first
  decision.

### Required Share Object System

Implement or prepare the shared route contract:

```text
POST /api/channel-shares
GET /api/channel-shares/:id
GET /share/channel/:id
```

The implementation can be file-backed for Tuesday, but it must persist enough
state to restore a generated channel object.

Minimum persisted fields:

- share id,
- channel id,
- session id,
- current depth,
- depth ancestry/breadcrumbs,
- source prompt,
- generated layout,
- generated surfaces,
- generated patch/copy,
- data requests,
- provenance records,
- source state,
- narration text,
- fork prompts,
- created timestamp.

### Required Replay Flow

A shared channel object should open directly into a replayable state.

Minimum acceptable replay:

1. Open target channel fullscreen.
2. Restore the current generated depth.
3. Show the original prompt and depth breadcrumb.
4. Highlight the stage, provenance, and next actions in sequence.
5. Show back navigation to prior depths.
6. Show `Fork this` with suggested prompts.

The replay does not need to be a rendered video. It must feel like a saved live
software state, not a generic dashboard deep link.

### Required Fork Flow

Forking should:

- load the shared state,
- preserve the shared state's depth ancestry,
- let the recipient choose a suggested prompt or speak to Kat,
- call the same channel turn path,
- create a new deeper generated state,
- allow sharing that fork.

Account identity is not required in v1. The fork can be session-based.

### Required Instrumentation

Track launch events in a simple file-backed store or equivalent:

- `visit`
- `focused_launch_viewed`
- `channel_opened`
- `prompt_clicked`
- `prompt_submitted`
- `channel_morphed`
- `share_created`
- `share_opened`
- `share_replayed`
- `share_forked`
- `fallback_seen`
- `error_seen`

Expose a simple operator-readable summary route or script by Wednesday,
May 13, 2026:

- visitors,
- channel opens,
- prompt submissions,
- successful morphs,
- shares,
- share opens,
- forks,
- top channel,
- top prompt,
- live/fallback split,
- top error.

### Required Social Metadata

Share pages should have good Open Graph/Twitter metadata.

Minimum:

- title derived from share object headline,
- description derived from channel summary and prompt,
- image from the channel or generated share-card fallback,
- canonical URL for the share page.

Ideal:

- generated share card per channel object,
- text that says "Fork this live market channel" rather than "Open dashboard."

### Required Demo Mode

Add a deterministic demo path or mode so the Tuesday demo can succeed even if a
provider is slow or a browser blocks audio.

Demo mode should preserve truthfulness:

- If live data is unavailable, show fallback state clearly.
- Do not hide source/fallback labels.
- Keep a stable successful prompt path for each focused channel.
- Make the share/replay/fork loop testable before going live.

### Required QA Checklist

Agent 4 should produce or update a checklist covering:

- cold load on production URL,
- first prompt success,
- all three focused channels,
- share creation,
- shared link cold open,
- fork prompt,
- mobile/narrow viewport viability,
- no pre-magic email wall,
- no hidden fallback data,
- no console-breaking errors,
- no broken share metadata,
- no stalled loading state after provider failure.

### Agent 4 Success Conditions

- A new user can experience the core loop without email signup.
- The first screen drives users into Crypto, Polymarket, or Meme.
- Prompt chips, next-action buttons, and avatar voice use the same channel turn
  path.
- Share objects are created from generated channel states.
- Shared links restore the current generated depth, not just the base dashboard.
- Shared links expose depth breadcrumbs and back navigation to prior states.
- Shared links include strong social metadata.
- Forking a shared object creates a new deeper generated state.
- Basic launch analytics are recorded.
- There is a deterministic demo path for all three channels.

### Agent 4 Fail Conditions

- The first screen still feels like a dashboard library.
- Share links only point at `/share/:dashboard`.
- The replay does not preserve generated surfaces or depth ancestry.
- Forking is described in copy but not usable.
- Forking flattens the user back to the original dashboard.
- Email capture blocks first magic.
- Analytics cannot answer whether the viral loop worked.
- The demo depends on voice/audio working perfectly.

### Suggested Ownership

Primary files:

- `server.js` share routes, event routes, and restore/fork APIs.
- `dashboard-share.js` or a new `lib/channel-shares.js` for share-object logic.
- `public/index.html` launch shell, prompt cards, share/fork controls, replay handling.
- `public/dashboards/prototype.js` restore/replay affordances if needed.
- `scripts/` for launch analytics reporting if a route is too much.

Avoid touching:

- channel-specific ranking logic unless needed for integration,
- channel-specific data adapters owned by Agents 1-3,
- Dune deck visuals unless a demo script explicitly requires it.

## Component Part 5: Generated Component QA Agent

### Assignment

Agent 5 owns automated visual, functional, and share-restore testing for the
generated component system.

This agent does not own product behavior. Its job is to make sure the generated
states produced by Agents 1-4 are visibly correct, usable, restorable, and
hard to regress.

### Mission

Build a launch QA loop that catches the failures humans will notice first:

- blank generated surfaces,
- broken charts,
- unreadable text,
- overlapping components,
- missing source labels,
- stale or incorrect share restore,
- fork controls that do not work,
- mobile/narrow viewport breakage,
- generated states that technically exist but do not create a wow moment.

API success is not enough. A generated channel state only passes if it is
visually legible, functionally usable, source-labeled, shareable, restorable,
and forkable.

### Required Test Layers

#### 1. Generated Component Contract Tests

For every focused channel and hero prompt, validate the generated update object
before browser rendering.

Required assertions:

- layout template exists,
- `stageOverlay` has at least one component,
- `rail` has at least one component,
- each component has a supported `type`,
- each component has a stable `id`,
- charts include a supported chart type and binding,
- data requests match the displayed chart or board,
- provenance records exist,
- component `sourceState` exists where applicable,
- fallback/unavailable source states are explicit,
- text fields are not empty or absurdly long,
- action panels include forkable next prompts.

Full-surface assertions:

- generated update changes the active page thesis,
- generated update declares a layout mode,
- generated update controls the primary stage,
- generated update controls the evidence rail,
- generated update provides state-specific next prompts,
- generated update can suppress or de-emphasize irrelevant base dashboard
  elements,
- generated update can be restored as a coherent page from a share object.

Failure examples:

- `stageOverlay` exists but has zero components.
- A `vega-chart` has no chart binding.
- The rail includes insight copy but no provenance card.
- A fallback result is labeled as live.
- The generated state is just a small overlay on the old dashboard.

#### 2. Browser Rendering Tests

Use Playwright or equivalent browser automation to render each generated state.

Required test matrix:

- `crypto-trading`: all three hero prompts.
- `polyrec`: all three hero prompts.
- `meme-coin`: all three hero prompts.
- desktop viewport.
- narrow/mobile-ish viewport if launch access allows mobile.
- share replay view.
- forked state view.

Required visual assertions:

- generated stage is visible,
- generated rail is visible,
- at least one source/provenance label is visible,
- share button/control is visible after morph,
- fork button/control is visible on shared object,
- no obvious blank dashboard after morph,
- no loading state remains after success,
- no uncaught console errors,
- no component text escapes its container,
- no key controls overlap the generated stage,
- chart/table/board has non-empty rendered content.

For canvas/SVG/chart surfaces, add a nonblank visual check:

- screenshot the generated stage region,
- verify it contains enough non-background pixels,
- verify the bounding box is not near-zero,
- verify the chart/table area is not a single flat color.

#### 3. Screenshot And Visual Regression Tests

Capture deterministic screenshots for every hero prompt.

Recommended snapshot names:

```text
crypto-trading__btc-three-months__desktop.png
crypto-trading__btc-eth-week__desktop.png
crypto-trading__btc-depth__desktop.png
polyrec__weirdest-markets__desktop.png
polyrec__close-odds-volume__desktop.png
polyrec__election-macro__desktop.png
meme-coin__fastest-moving__desktop.png
meme-coin__attention-liquidity__desktop.png
meme-coin__viral-fragile__desktop.png
```

The first version can save screenshots as launch artifacts without strict pixel
diffs. The important part is that failures leave images humans can inspect
quickly.

Once the visuals stabilize, add threshold-based screenshot comparison:

- allow minor live-data/content changes,
- fail on blank/major layout shifts,
- fail on missing generated components,
- fail on missing share/fork controls.

#### 4. Share Restore Equivalence Tests

A generated state must survive sharing.

For each focused channel:

1. Run hero prompt.
2. Capture generated state summary:
   - channel id,
   - current depth,
   - depth ancestry/breadcrumb labels,
   - generated component ids,
   - layout template,
   - provenance ids/source state,
   - headline/title.
3. Create share object.
4. Open share URL in a clean browser context.
5. Verify restored state matches the captured state.
6. Capture screenshot of restored state.
7. Click back to the original/base depth and verify it restores.
8. Return to the shared generated depth.
9. Click a fork prompt.
10. Verify a new deeper generated state is created.

Required assertions:

- shared page does not open the base dashboard only,
- restored page preserves current depth and visible ancestry,
- back navigation can restore the original/base depth,
- generated component ids or equivalent component count are restored,
- source/provenance labels are restored,
- original prompt is visible,
- fork prompt works,
- new forked state differs from original state and increments depth.

#### 5. Negative And Fallback Tests

Force or simulate provider failure where practical.

Required assertions:

- user still sees a completed generated state or clear unavailable state,
- source label says fallback/cached/unavailable,
- Kat narration does not claim live data,
- share still works if the generated state is useful,
- share is blocked or labeled clearly if the state is unavailable.

#### 6. Launch Analytics Verification

Automated tests should verify analytics events are emitted during the loop:

- `prompt_clicked`
- `prompt_submitted`
- `channel_morphed`
- `share_created`
- `share_opened`
- `share_replayed`
- `share_forked`
- `fallback_seen` when applicable.

This prevents the launch from producing product usage without measurable
evidence.

### Required Commands

The repo should expose one high-level command for launch verification.

Recommended scripts:

```bash
npm run launch:smoke
npm run launch:e2e
npm run launch:visual
npm run launch:qa
```

`launch:qa` should run the full practical suite:

```text
API contract checks -> browser e2e -> screenshots -> share restore -> fork -> analytics verification
```

If Playwright or browser automation cannot be added immediately, Agent 5 should
still create the script structure and implement as much as possible with the
current stack. The final output must include exact commands a human or CI runner
can execute.

### Visual Pass Conditions

A generated state passes visual QA only if:

- the stage visibly changed from the base channel,
- the generated stage content is nonblank,
- the rail contains useful generated content,
- source/provenance is visible,
- text is readable,
- controls are reachable,
- share is visible,
- restored share looks substantially like the generated state,
- back navigation can return to the original/base state,
- fork produces a new visible deeper state.

### Visual Fail Conditions

A generated state fails visual QA if:

- the stage is blank,
- the chart/table/board is empty,
- generated components overlap core controls,
- text is clipped beyond recognition,
- source/provenance is missing,
- share opens only the base dashboard,
- share loses the generated depth or ancestry,
- back navigation to the original/base state is missing or broken,
- fork button is present but not functional,
- fork does not create a deeper state,
- a loading spinner remains after success,
- the page logs uncaught errors during the core loop,
- fallback data is visually indistinguishable from live data.

### Agent 5 Success Conditions

- All nine hero prompts have automated API contract coverage.
- All nine hero prompts have automated browser rendering coverage.
- Share restore and fork are tested for all three focused channels.
- Depth restore, back-to-original navigation, and deeper fork creation are tested.
- Screenshots are saved for successful and failed visual runs.
- Blank/empty generated surfaces fail tests.
- Missing provenance/source labels fail tests.
- Analytics events are checked during the test loop.
- The final QA command is documented and can be run before every demo.

### Agent 5 Fail Conditions

- Tests only check status codes.
- Tests do not render generated components in a browser.
- Tests do not open share links in a clean context.
- Tests do not verify fork behavior.
- Tests do not verify depth ancestry or back navigation.
- Tests cannot catch blank charts or missing provenance.
- Test output does not include screenshots or actionable failure details.

### Suggested Ownership

Primary files:

- `scripts/launch-smoke.js`
- `scripts/launch-e2e.js` or Playwright test files.
- `scripts/launch-visual.js`
- `package.json` scripts.
- `docs/plans/viral-market-channels-goal.md` QA notes if needed.

Possible test artifact directories:

- `test-results/launch/`
- `test-results/launch/screenshots/`
- `test-results/launch/state/`

Avoid touching:

- channel ranking/chart generation logic except to add test hooks,
- production visual design except to add stable selectors or test IDs,
- provider adapters except to add deterministic demo/fallback fixtures.

## Component Part 6: Visual Intelligence And Information Design Agent

### Assignment

Agent 6 owns the visual usefulness, legibility, information hierarchy, and
exploration affordances of the three focused channels.

This agent should treat the current generated dashboards as too visually noisy
and too semantically thin until proven otherwise. The mission is not to add more
decoration. The mission is to make every generated state feel like a useful
market object a person wants to keep exploring and share.

### Mission

Turn generated market surfaces from "cool-looking dashboards" into legible,
high-signal decision boards.

Every generated state must answer three questions in the first five seconds:

1. What am I looking at?
2. Why does it matter right now?
3. What should I inspect next?

If a viewer cannot answer those questions from the visible page, the generated
state fails even if the API, chart, and share object all work.

### Problems To Fix

Observed risks in the current generated surfaces:

- charts look decorative instead of explanatory,
- labels are truncated or too small,
- generated boards contain low-relevance rows,
- the stage is visually busy but low-information,
- side rails can be obscured by the avatar/control layer,
- source labels exist but do not explain trust or usefulness,
- next actions appear generic or empty,
- the page does not create an obvious jumping-off point,
- generated states lack a clear "why this is interesting" thesis.

The fix is not more density. The fix is stronger hierarchy.

### Canonical Channel Layout

Each generated market state should use the same information hierarchy:

1. **Thesis Header**
   - one sentence,
   - market-specific,
   - explains what changed or why this board exists.
2. **Primary Stage**
   - one dominant visualization or board,
   - no more than one primary chart/table at a time,
   - chart labels must be readable,
   - top entity/market/token should be visually emphasized.
3. **Evidence Rail**
   - three to five cards maximum,
   - each card must have a job:
     - `Why It Matters`
     - `Top Entity`
     - `Source And Freshness`
     - `Next Moves`
     - `Share/Fork`
4. **Exploration Actions**
   - three concrete follow-up prompts,
   - specific to the generated state,
   - never generic placeholders.

### Component Usefulness Bar

Every generated component must have a product job.

Allowed component jobs:

- explain the current thesis,
- compare entities,
- rank opportunities,
- show evidence,
- expose uncertainty/source quality,
- suggest next exploration,
- support sharing/forking.

Components should be removed if they are only:

- decorative,
- redundant,
- too small to read,
- unsupported by data,
- generic "agent trace" filler,
- visually impressive but semantically unclear.

### Channel-Specific Information Design

#### Crypto Trading

The crypto channel should not show abstract market art when the user asks for
market structure.

For `BTC three months`, the useful state is:

- thesis: BTC trend/range/drawdown over 90 days,
- primary stage: readable price chart or candlestick chart,
- rail:
  - current price,
  - range high/low,
  - drawdown or volatility note,
  - source/freshness,
  - next prompts: compare ETH, zoom 7D, inspect depth.

For liquidity/depth, the useful state is:

- thesis: where liquidity is concentrated and whether spread/depth is healthy,
- primary stage: bid/ask depth with clear labels,
- rail:
  - spread,
  - top bid/ask,
  - depth imbalance,
  - source/freshness,
  - next prompts: compare ETH depth, add 24H price, inspect volatility.

Avoid:

- unlabeled bar forests,
- decorative overlays that hide the chart,
- tiny axis labels,
- depth charts without bid/ask meaning,
- empty "Next Moves" cards.

#### Polyrec

The Polyrec channel must feel like a prediction-market intelligence board, not
a random list of active markets.

For `Show the weirdest active markets`, the useful state is:

- thesis: why these markets are weird or attention-worthy,
- primary stage: ranked board with reason codes,
- rail:
  - top market inspector,
  - weirdness criteria,
  - volume/liquidity context,
  - source/freshness,
  - next prompts: filter by politics, close odds, high volume.

For category boards, rows must match the category. A politics board should not
lead with unrelated entertainment rows unless the source data is unavailable and
that fallback is explicitly explained.

Useful Polyrec row fields:

- question,
- yes/no price or probability,
- volume/liquidity,
- category,
- time/resolution if available,
- reason this is interesting,
- suggested follow-up.

Avoid:

- arbitrary market lists,
- truncated questions that cannot be understood,
- boards where the title and row content disagree,
- charts that encode probabilities without explaining what they mean,
- source labels that say only "Polymarket" without freshness/fallback context.

#### Meme Coin

The Meme channel should feel culturally sharp but still analytically useful.

Useful states:

- `Fastest moving`: rank by velocity/change with liquidity context.
- `Attention vs liquidity risk`: scatter or board that separates hype from
  tradable depth.
- `Viral but fragile`: board with fragility reason codes.
- `Narrative decay`: time/velocity board showing fading attention.

Useful Meme row fields:

- token/name,
- velocity/change,
- liquidity/market cap,
- risk reason,
- narrative tag,
- source/freshness,
- suggested next exploration.

Avoid:

- generic token dashboards,
- jokes without useful risk signal,
- financial-advice language,
- hidden fallback data,
- unreadable neon density.

### Avatar And Control Layer Rules

The avatar is part of the Katechon identity, but it must not block generated
market information.

Rules:

- In demo/share/replay mode, avatar should be docked, reduced, or hidden if it
  overlaps the evidence rail or share/fork controls.
- The Kat control panel must never cover primary CTA, fork prompt, source card,
  or top market/token inspector.
- Screenshots and share replays should prioritize the generated state over the
  avatar.
- If the avatar is visible, it should reinforce narration, not steal the layout.

### Visual Hierarchy Rules

Use these rules for all generated states:

- one dominant visual per stage,
- one clear thesis sentence,
- three to five rail cards,
- three concrete next actions,
- readable labels at desktop screenshot size,
- no text that depends on hover to be understood,
- no chart without a plain-English interpretation,
- no decorative overlays that reduce chart readability,
- no generated card stack that pushes share/fork below the fold.

### Jumping-Off Point Rule

Every generated state must end with concrete exploration prompts.

Bad:

- `Next Moves`
- `Inspect market`
- `Open overview`

Good:

- `Compare ETH over the same 90D window`
- `Filter to politics markets with >$1M volume`
- `Show tokens with high velocity but thin liquidity`

The user should always know what to do next without thinking.

### Share Preview Rules

A share preview must make the saved state intelligible on its own.

Required:

- title from generated thesis,
- visible original prompt,
- visible primary generated object,
- visible source/freshness label,
- visible fork prompts,
- no avatar/control overlap on the saved object.

### Agent 6 Success Conditions

- Each focused channel has a clear visual/information template.
- All nine hero prompts produce a readable thesis, primary visual, evidence
  rail, source label, and concrete next actions.
- The generated state feels useful before the viewer reads any docs.
- Avatar/control UI no longer obscures important information in demo/share mode.
- Polyrec rows match the prompt/category or explain fallback clearly.
- Crypto charts explain market structure rather than just showing abstract bars.
- Meme boards are culturally legible and analytically useful.
- Screenshots of generated states look good enough to post publicly.

### Agent 6 Fail Conditions

- A screenshot looks impressive but the market meaning is unclear.
- The viewer cannot identify the top entity/market/token.
- The viewer cannot tell why the state matters.
- The viewer does not have an obvious next prompt.
- Avatar/control elements cover important rail or share content.
- Labels are too small or truncated to understand.
- The stage uses visual noise to hide weak information.

### Suggested Ownership

Primary files:

- `public/dashboards/prototype.js`
- `public/prototype-dashboard.html`
- `public/dashboards/catalog.js`
- `server.js` generated copy defaults if needed.
- `docs/plans/viral-market-channels-goal.md` if the visual rubric changes.

Avoid touching:

- provider adapters except to request clearer fields,
- share route persistence unless needed for share preview layout,
- unrelated Dune deck work.

## Component Part 7: Full-Surface Morph Runtime Agent

### Assignment

Agent 7 owns the runtime and renderer changes needed for prompts to transform
the whole dashboard surface, not just mutate one generated slot.

This is the architectural bridge between the channel agents and the visual
design goal. Agents 1-3 can decide what the state means. Agent 6 can define what
good information design looks like. Agent 7 makes the app capable of rendering
that as a complete page/state.

### Mission

Build the "page turn" behavior:

```text
base channel -> generated channel page -> shareable generated page -> forked generated page
```

The output should feel closer to a flipbook of tailored live app states than a
static dashboard with an inserted widget.

### Required Runtime Concept

Introduce or formalize a full-surface channel state, separate from slot-only
overrides.

Suggested shape:

```json
{
  "mode": "generated_page",
  "channelId": "polyrec",
  "prompt": "Build a politics market watch",
  "theme": {
    "density": "board",
    "accent": "violet",
    "avatarMode": "docked"
  },
  "layout": {
    "template": "market_board",
    "stage": "ranked_board",
    "rail": "evidence_stack",
    "actions": "fork_prompts"
  },
  "thesis": {
    "title": "Politics Market Watch",
    "summary": "Active politics markets ranked by volume, close odds, and source freshness."
  },
  "stage": {
    "type": "ranked-board",
    "items": []
  },
  "rail": [],
  "actions": [],
  "provenance": []
}
```

The exact schema can differ, but it must represent a whole generated page, not
only `stageOverlay`, `rail`, and `modal` component fragments.

### Required Renderer Behavior

After a successful hero prompt:

- base dashboard panels that are irrelevant to the prompt are hidden,
  suppressed, or visually de-emphasized,
- the generated page title/thesis becomes the primary header,
- the primary stage is owned by the generated state,
- the evidence rail is owned by the generated state,
- interaction controls and next prompts are owned by the generated state,
- avatar/control placement adapts to the generated page,
- share/replay restores this generated page mode directly.

### Transition Behavior

The generated page should appear through a full-surface transition, not a tiny
card insertion.

Acceptable first version:

- fade/slide base dashboard down,
- materialize generated page shell,
- animate title/thesis,
- animate primary stage,
- animate evidence rail,
- reveal next actions/share.

Later versions can add richer flipbook/page-turn transitions. For Tuesday, the
important part is semantic: the viewer should feel the channel became a new
page.

### Page Templates

Agent 7 should support a small set of full-page templates:

- `market_structure`: crypto price/history/depth investigations.
- `ranked_board`: Polyrec and meme rankings.
- `comparison_board`: BTC/ETH, category, or token comparisons.
- `risk_radar`: volatility, fragile tokens, weird markets.
- `detail_inspector`: focused entity/market/token deep dive.

Each template should define:

- header behavior,
- stage layout,
- rail layout,
- action area,
- avatar/control placement,
- share/replay restore behavior.

### Compatibility With Existing Runtime

Existing generated slot behavior can remain as fallback. The new runtime should
prefer full-page generated states for the focused launch channels.

Compatibility rules:

- `apply_channel_update` may continue to accept `surfaces`, but focused-channel
  hero prompts should emit or be upgraded into full-page state.
- Existing share objects should persist full-page state when present.
- Existing generated components can be reused inside the full-page state.
- Legacy dashboard mutation should not dominate the focused launch experience.

### Agent 7 Success Conditions

- A hero prompt visibly changes the whole channel page.
- The old dashboard shell no longer dominates after a successful generated
  state.
- Full-page generated state can be shared and restored.
- Full-page generated state can be forked.
- The renderer supports at least `market_structure`, `ranked_board`, and
  `risk_radar` templates.
- Avatar/control placement adapts for generated page mode.
- Tests can detect whether generated page mode is active.

### Agent 7 Fail Conditions

- A prompt only adds a chart/card inside the old dashboard.
- The page title, layout, and information architecture remain mostly unchanged.
- Share restore loses full-page mode.
- Forking returns to the base dashboard instead of continuing from the generated
  page.
- The transition is decorative but the information architecture stays fixed.

### Suggested Ownership

Primary files:

- `server.js` generated update/share state shape if needed.
- `public/dashboards/prototype.js` full-page render mode.
- `public/prototype-dashboard.html` full-page generated layout CSS/HTML.
- `public/index.html` replay/fork/fullscreen integration if needed.
- `docs/channel-apis.md` if the public runtime contract changes.

Avoid touching:

- provider-specific data fetching except to pass through clearer state,
- launch analytics except to emit generated-page mode events,
- channel-specific prompt heuristics unless needed to prove templates.

## Launch Page Requirements

The public app should sell the action, not the architecture.

Recommended headline:

```text
Turn a market into a live channel.
```

Recommended subcopy:

```text
Ask about crypto, prediction markets, or meme coins. Katechon builds a live software state you can share and fork.
```

Recommended primary cards:

- Crypto: `BTC three months`
- Polymarket: `Weirdest active markets`
- Meme: `Viral but fragile`

Recommended CTA language:

- `Build channel`
- `Fork this`
- `Share state`
- `Open live`

Avoid:

- "dashboard gallery"
- "AI dashboard"
- "demo stream"
- "real-time content generation"
- explaining the runtime before the user experiences it.

## Data And Provenance Rules

Every generated state must label its backing source:

- `live_api`
- `cached_api`
- `synthetic_fallback`
- `unavailable`

Rules:

- If live data works, say the provider.
- If cached data is used, say cached.
- If fallback is used, say fallback.
- If the channel cannot answer, make the gap visible.
- Do not imply trading, prediction, certainty, or advice.

Recommended visible source labels:

- `Hyperliquid live`
- `Polymarket Gamma`
- `Indexed token data`
- `Cached`
- `Fallback`
- `Unavailable`

## Voice Strategy

Voice is a wow multiplier, not the foundation of the launch.

The core path must work through Kat voice and clickable prompts/actions.
Push-to-talk routes into the same turn path when stable. If voice is degraded,
clickable prompts and next actions keep the demo moving without introducing a
typed dashboard command box.

Kat should speak in one short turn:

```text
I rebuilt the channel around BTC three-month structure and kept Hyperliquid provenance visible.
```

Kat should not:

- monologue,
- invent data,
- claim execution,
- over-explain the product,
- read every row in the board.

## Product Quality Bar

Each focused channel must be:

- useful enough to answer a real market question,
- visually transformed enough to feel like software generation,
- shareable enough to invite another user,
- bounded enough to avoid false claims.

The right feeling is:

```text
This is a market-native toy that is also a real tool.
```

## Validation Plan

### Local Validation

For each focused channel:

1. Open channel from launch page.
2. Click each hero prompt.
3. Speak one avatar command where voice is available.
4. Verify generated stage changes.
5. Verify generated rail changes.
6. Verify provenance/source state appears.
7. Create share object.
8. Open share link in a clean browser session.
9. Fork the shared state with a follow-up prompt.
10. Verify event tracking captured the path.

### API Validation

For each focused channel:

```bash
curl http://localhost:4040/api/channels/<channel>/context?fresh=1
curl -X POST http://localhost:4040/api/channels/<channel>/turn \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"local-session","userText":"<hero prompt>"}'
curl http://localhost:4040/api/channels/<channel>/state?sessionId=local-session
```

Share routes should also be smoke-tested once implemented:

```bash
curl -X POST http://localhost:4040/api/channel-shares \
  -H "Content-Type: application/json" \
  -d '{"channelId":"crypto-trading","sessionId":"local-session"}'
curl http://localhost:4040/api/channel-shares/<shareId>
```

### Browser Validation

Check:

- desktop first,
- mobile or narrow viewport if launch traffic will include phones,
- shared link cold load,
- fallback data labels,
- no broken media,
- no hidden email wall before first magic moment.

## Tuesday Demo Script

### Public Launch Demo

1. Open the product.
2. Show three cards: Crypto, Polymarket, Meme.
3. Click Crypto: `BTC three months`.
4. Watch the channel morph.
5. Share the state.
6. Open the shared state.
7. Fork it: `Compare ETH`.
8. Say the company thesis:

```text
This is not a dashboard. It is a live software state that can be watched, commanded, shared, and forked.
```

### Investor Demo

1. Start with the Katechon deck as prelude.
2. State "pages -> feeds -> channels."
3. Open the focused market launch surface.
4. Run Crypto command.
5. Run Polyrec command.
6. Run Meme command.
7. Share one object and fork it.
8. Explain the graph:

```text
We learn what people watch, command, share, fork, and act inside. That is the discovery graph for generated software.
```

## Launch Content Pack

Create at least five clips:

1. `BTC 3M live channel`
2. `Weirdest Polymarket board`
3. `Viral but fragile meme coins`
4. `Share and fork a market state`
5. `Three channels in 30 seconds`

Each clip should show:

- the prompt,
- the morph,
- provenance,
- share/fork.

Each clip should avoid:

- long narration,
- internal architecture,
- static dashboard browsing,
- claims of real trading.

## Metrics To Report After Launch

Report these by Wednesday, May 13, 2026:

- total visitors,
- focused channel opens,
- prompt clicks,
- avatar commands,
- successful morphs,
- share objects created,
- share opens,
- forks,
- most shared channel,
- most used prompt,
- fallback/live source split,
- top failure reason.

Investor-facing metrics:

- command rate = prompts / focused channel opens,
- share rate = shares / successful morphs,
- fork rate = forks / share opens,
- source quality = live-backed morphs / total morphs.

## Agent Handoff Prompts

### Agent 1: Crypto Trading

```text
You own the crypto-trading channel for the Viral Market Channels goal in docs/plans/viral-market-channels-goal.md. Make the BTC/ETH/SOL prompt-to-morph loop maximally impressive and useful. Implement the three hero prompts, live/fallback provenance, generated stage and rail surfaces, and share/fork compatibility for crypto-generated states. Keep real trading out of scope. Do not modify Polyrec or Meme Coin behavior except through shared interfaces agreed in the goal doc. List every file you change.
```

### Agent 2: Polyrec

```text
You own the polyrec channel for the Viral Market Channels goal in docs/plans/viral-market-channels-goal.md. Make prediction-market discovery feel like a shareable live intelligence board. Implement the three hero prompts, ranked/interesting market surfaces, provenance, generated stage and rail surfaces, and share/fork compatibility for Polyrec-generated states. Do not claim trading/order-book precision unless the data supports it. Do not modify Crypto or Meme Coin behavior except through shared interfaces agreed in the goal doc. List every file you change.
```

### Agent 3: Meme Coin

```text
You own the meme-coin channel for the Viral Market Channels goal in docs/plans/viral-market-channels-goal.md. Make the channel culturally sharp, useful, and shareable: token velocity, attention/liquidity mismatch, viral-but-fragile boards, and narrative decay. Implement the three hero prompts, visible risk/source labels, generated stage and rail surfaces, and share/fork compatibility for Meme-generated states. Do not present content as financial advice or execution. Do not modify Crypto or Polyrec behavior except through shared interfaces agreed in the goal doc. List every file you change.
```

### Agent 4: Viral Loop And Demo Orchestration

```text
You own the shared viral loop and demo orchestration layer for the Viral Market Channels goal in docs/plans/viral-market-channels-goal.md. Make the three channel agents land as one coherent product: focused launch surface, no pre-magic email wall, avatar-first voice interaction, clickable prompt chips and next actions, no typed dashboard command boxes, channel share-object creation, share replay, fork flow, social metadata, launch analytics, and deterministic demo QA. Do not own the internal ranking/chart logic for crypto-trading, polyrec, or meme-coin except through shared integration contracts. The finished loop must be open -> Kat/click prompt -> morph -> share -> replay -> fork. List every file you change.
```

### Agent 5: Generated Component QA

```text
You own generated component QA for the Viral Market Channels goal in docs/plans/viral-market-channels-goal.md. Build an automated launch verification loop that tests all nine hero prompts across crypto-trading, polyrec, and meme-coin for API contract validity, browser rendering, nonblank generated stage/rail content, visible provenance/source labels, share-object restore, fork behavior, screenshots, and analytics events. The test suite must catch blank charts, empty boards, missing source labels, broken share restore, broken fork controls, layout overlap, stuck loading states, and uncaught console errors. Do not change channel behavior except to add stable selectors, test hooks, or deterministic demo fixtures. Provide the exact command to run the full launch QA suite and list every file you change.
```

### Agent 6: Visual Intelligence And Information Design

```text
You own visual intelligence and information design for the Viral Market Channels goal in docs/plans/viral-market-channels-goal.md. Make the generated Crypto, Polyrec, and Meme states legible, useful, high-signal, and share-worthy. Every generated state must answer: what am I looking at, why does it matter right now, and what should I inspect next? Build or refine the shared dashboard templates so each hero prompt produces a clear thesis, one dominant readable primary visual, an evidence rail with source/freshness, and three concrete exploration prompts. Fix avatar/control overlap in demo/share modes. Remove decorative visual noise, tiny/truncated labels, generic next-action cards, and low-relevance rows. Do not change provider/data behavior except to request or expose clearer fields. List every file you change.
```

### Agent 7: Full-Surface Morph Runtime

```text
You own the full-surface morph runtime for the Viral Market Channels goal in docs/plans/viral-market-channels-goal.md. The focused launch channels must stop feeling like fixed dashboards with small generated overlays. Build or formalize a generated_page mode where a hero prompt transforms the whole channel page: title/thesis, global layout, primary stage, evidence rail, next prompts, avatar/control placement, and share/replay state. Support at least market_structure, ranked_board, and risk_radar page templates. Existing slot-based mutations can remain as fallback, but Crypto, Polyrec, and Meme hero prompts should render as complete generated pages that can be shared, restored, and forked. Do not change provider logic except to pass through clearer full-page state. List every file you change.
```

## Final Decision Rule

When scope conflicts arise, choose the path that improves:

```text
first prompt -> visible morph -> share -> fork
```

Everything else is secondary until that loop works.
