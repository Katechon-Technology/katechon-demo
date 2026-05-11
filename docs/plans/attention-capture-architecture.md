# Attention Capture Architecture

## Working Thesis

Katechon should not optimize a feed of existing posts. It should optimize a stream
of generated software states.

TikTok ranks videos from inventory. Katechon should rank possible live channel
states that can be generated for a specific user at a specific moment:

```text
user context + live world data + channel capabilities
  -> candidate software states
  -> ranked by expected user value
  -> rendered as a live channel surface
  -> measured by watch, command, share, fork, replay, and act
```

The atomic unit is not a post, dashboard, or chat answer. The atomic unit is a
generated state:

```json
{
  "channelId": "meme-coin",
  "stateType": "generated_page",
  "dataRequests": [],
  "thesis": {
    "title": "Viral Looks Fragile",
    "summary": "A board of tokens where attention is outrunning visible liquidity."
  },
  "layout": {
    "template": "risk_radar",
    "stage": "risk-radar",
    "rail": "evidence_stack"
  },
  "stage": [],
  "rail": [],
  "nextActions": [],
  "provenance": [],
  "sourceState": {},
  "shareAndFork": {
    "shareable": true,
    "forkPrompts": []
  }
}
```

The product should feel like:

```text
Here are the live software states most worth your attention right now.
```

## Slide Translation: The Golden Attention Engine

This document is technical, but the final investor slide should not feel like a
systems diagram. It should feel like the viewer is seeing the attention
algorithm shine through the product for the first time.

The desired viewer reaction:

```text
Katechon is not just generating pages.
It is learning which possible software state should exist next.
```

That is the visual and strategic center. The architecture can be speculative,
but the image needs to be simple, deep, and durable.

### Core Visual Thesis

The slide should translate the architecture into one object:

```text
live signals + user context + channel capabilities
        -> possible software futures
        -> one ranked state lights up
        -> the channel surface materializes
        -> behavior feeds the graph
```

The crucial difference from a normal feed is not "better ranking". It is the
size of the choice space. A feed chooses among posts that already exist.
Katechon chooses among states that could exist if generated now.

Slide-level line:

```text
Feeds rank what exists. Katechon ranks what could exist.
```

Stronger, more speculative line:

```text
The algorithm chooses what software should exist next.
```

Use the stronger version only if the surrounding narration makes clear that this
is the north-star architecture, not a claim of fully learned production scale.

### What The Viewer Should See First

The first read should be emotional and spatial, not textual:

- a dark canvas;
- thin live-data traces entering from the left and lower edge;
- a small user-context vector entering from the upper edge;
- a field of faint ghost interfaces in the middle;
- one gold path becoming brighter than the others;
- a generated channel surface forming at the end of that path;
- a quiet feedback arc returning from the surface to the user model.

The gold line is not decoration. It is the selected future. The surrounding dim
lines are the futures Katechon considered but did not render.

This lets the audience understand the algorithm without reading the whole
architecture:

```text
Many possible states exist.
Katechon selects one.
The selected state becomes live software.
The user's behavior teaches the next selection.
```

### Three-Object Rule

Do not show the full architecture as boxes and arrows on the final slide. The
full architecture has too many nouns. Collapse it into three visible objects:

1. Signal Field
2. Possible States
3. Generated State

The detailed implementation components become small edge labels:

- `world state`
- `user model`
- `candidate generator`
- `state ranker`
- `morph engine`
- `watch / command / share / fork / act`

The viewer should not have to parse these labels to understand the slide. They
are there to make the image credible after the main idea lands.

### Visual Grammar

Use gold only for the selected path and feedback memory. If everything glows,
nothing matters.

Suggested palette:

```text
background:    #050608 or #07090C
grid line:     rgba(255,255,255,0.06)
data traces:   cold blue, green, red, and white at low opacity
candidate:     rgba(255,255,255,0.12)
inactive gold: rgba(247,201,92,0.18)
active gold:   #F7C95C
gold core:     #FFF2A8
warning red:   restrained, only for risk or uncertainty
```

Use line behavior to communicate ranking:

- faint hairlines for all candidate paths;
- segmented lines for speculative or low-confidence candidates;
- stable bright line for the selected state;
- a short burst or lens flare only at the moment of selection;
- thin returning afterimages for feedback events.

The image should feel like a financial terminal, a telescope, and a runtime
trace combined. Avoid making it look like a generic AI brain, blockchain graph,
neural network wallpaper, or sci-fi decoration detached from the product.

### Suggested Composition

Use a 16:9 dark stage with a strong diagonal or central beam.

```text
LEFT / LOWER EDGE          CENTER FIELD                    RIGHT EDGE

world signals              ghost state candidates           live channel state
market data                faint generated UIs              one crisp surface
chain data        --->     ranked possibility cloud  --->   source-backed view
feed data                  small score ticks                next actions
user behavior              rejected paths dim               share/fork object

                         feedback arc returns underneath
```

The center field is the important invention. It should not look like a queue of
posts. It should look like a space of possible interfaces:

- small wireframe pages;
- chart fragments;
- source rails;
- prompt chips;
- ranked boards;
- risk radars;
- comparison states;
- replay/fork continuations.

Only one of these becomes vivid. That is the "attention capture" moment.

### Information Hierarchy

The slide should work in four time horizons:

```text
0.5 seconds:
Something luminous is selecting one future from many.

3 seconds:
Katechon ranks possible software states, not posts.

10 seconds:
Signals, user context, and channel agents generate candidates; the ranker
selects one state; the morph engine renders it; behavior feeds the graph.

30 seconds with narration:
This becomes a discovery graph for generated software.
```

This hierarchy matters because final slides often get only a few seconds of
clean attention. The architecture has to reward deeper inspection without
requiring it.

### Density Budget

The slide should have one dominant visual event and no more than six readable
labels. Everything else should be structural texture.

Use this budget:

```text
1 headline
1 support line
3 primary zones
5 to 6 edge labels
1 selected gold path
3 to 5 ghost candidate states
1 feedback arc
```

Do not label every line. Do not show every metric. Do not expose every route.
The algorithm should feel vast, but the slide should remain calm.

Recommended visible labels:

```text
world state
user context
candidate states
ranked state
live channel
feedback graph
```

Everything else can live in speaker notes or the technical appendix.

### Storyboard

If animated, use a three-beat sequence:

```text
Beat 1: Signals
Cold traces enter from the edges. The viewer sees live reality and user context
as separate signal streams.

Beat 2: Possibility
The traces intersect in the center and reveal faint ghost interfaces. The viewer
understands that the system is considering multiple possible software states.

Beat 3: Selection
One path turns gold, the other candidates dim, and a single generated channel
state resolves on the right. A thin feedback arc returns underneath.
```

If static, compose the slide as the final frame of that animation. The audience
should be able to infer the before and after from the still image.

The most important still-frame detail is the contrast between the ghost states
and the selected state. That contrast carries the whole thesis.

### On-Slide Copy

Recommended headline:

```text
The Discovery Graph For Generated Software
```

Recommended support line:

```text
Every watch, command, share, and fork teaches Katechon which live software state
should exist next.
```

Alternative headline options:

- `The Attention Architecture For Live Software`
- `Ranking Software Futures, Not Posts`
- `The Algorithm That Chooses The Next State`
- `Generated Software Needs A Discovery Graph`

Alternative support lines:

- `Feeds optimize inventory. Katechon optimizes state.`
- `The unit of discovery becomes a live, source-backed software object.`
- `The system learns what people want software to become in response to live
  reality.`

Tiny edge labels, if needed:

```text
user context
world state
candidate states
state ranker
morph engine
live channel
behavior graph
```

Avoid writing all of the scoring terms on the slide. If an equation appears, use
one simplified equation:

```text
expected value =
relevance + urgency + actionability + trust
- load - latency - risk
```

The full ranker formula belongs in appendix or speaker notes.

### Talk Track

Short version:

```text
The feed ranks inventory. Katechon ranks futures. For every user and moment, the
system can propose possible live channel states, choose the one most worth
generating, render it as software, and learn from what the user does next.
```

More emotional version:

```text
When software becomes cheap to generate, discovery changes. The scarce thing is
not another post about the world. It is the right live state of software for
this person, at this moment, with this data, and this next action. That is the
attention graph Katechon is building.
```

More technical version:

```text
The system combines a compact world-state packet, a user attention profile, and
channel capabilities to create candidate state specs. A transparent ranker picks
the best state under trust, latency, legibility, and actionability constraints.
The morph engine renders the state, and every interaction updates the graph.
```

### How To Keep It Speculative But Credible

This slide can be ambitious, but it should not overclaim. Use language that
signals a north-star architecture:

- `future architecture`
- `attention graph`
- `candidate state`
- `north-star loop`
- `prototype spine`
- `learns over time`

Avoid language that implies current production maturity:

- `fully autonomous`
- `proven engagement model`
- `real-time personalized for every user`
- `optimized revenue engine`
- `guaranteed best state`
- `all data is live`

Good framing:

```text
The prototype already proves the object: live channel states that can be
watched, commanded, shared, replayed, and forked. This is the architecture that
turns those interactions into the discovery graph.
```

### What Not To Draw

Avoid these failure modes:

- a generic neural network cloud with no product surface;
- a normal feed with shinier cards;
- a dashboard architecture diagram with too many boxes;
- a crypto-looking node graph that suggests token mechanics;
- a pure data pipeline that hides the user;
- a pure personalization diagram that hides the generated software object;
- a glowing background with no clear selected path;
- a score formula so dense that the slide becomes homework.

The viewer should feel the system's intelligence before they understand every
module. The product surface must appear in the composition so the claim stays
anchored in live software, not abstract AI.

### Slide Sequence Option

If this becomes two final slides, use this sequence:

```text
Slide 1:
Feeds rank what exists.

Visual:
flattened inventory, posts/cards compressing toward sameness.

Slide 2:
Katechon ranks what could exist.

Visual:
golden possibility field, one software state selected and materialized.
```

If this must be one final slide, make the feed contrast a small left-side ghost
or top-left line only. Do not split the slide evenly. The final memory should be
Katechon's golden state-selection image, not a comparison chart.

### Open Slide Implementation Notes

This can be built as an Open Slide composition with layered HTML/SVG:

- dark base layer with subtle grid or star-field traces;
- SVG paths for incoming data lines, candidate paths, selected gold path, and
  feedback arc;
- HTML/SVG mini-surfaces for ghost candidate states;
- one crisp generated channel surface on the right;
- tiny score ticks or confidence bars near candidate states;
- optional animation where candidate paths pulse once, then the selected path
  brightens and the live channel surface resolves.

Keep animation restrained. The final frame has to look strong as a still image.

The selected state should include concrete Katechon primitives:

- stage;
- rail;
- provenance marker;
- next action;
- share/fork affordance.

That prevents the image from becoming pure abstraction. The architecture is
futuristic, but the object is specific: a generated channel state.

## Strategic Difference From A Normal Feed

Normal feeds rank media objects that already exist. Katechon can rank things
that could exist if generated now.

This matters because the system can tailor not only which topic the user sees,
but also the interface, depth, explanation, evidence, and next action.

Two users opening the same channel should receive different useful states:

- A trader gets `BTC liquidity pocket with order-book depth`.
- A casual crypto-native user gets `Is BTC trapped or breaking?`.
- A prediction-market user gets `Close odds, high volume macro board`.
- A meme-coin watcher gets `Viral but fragile token radar`.
- An investor gets `share/fork loop proof from current market channels`.

The same provider data can generate different surfaces depending on the user's
attention profile.

## Personalization Definition

Personalization should not mean changing labels or sorting channels by prior
click count. It should mean choosing the best generated state for the user.

The user model should capture:

- interests: assets, markets, domains, creators, channels, topics;
- intent style: watcher, analyst, trader, builder, investor, researcher;
- preferred depth: headline, board, chart, source trail, detail inspector;
- preferred primitives: rankings, timelines, maps, charts, briefs, comparisons;
- behavior: watch time, scrolls, prompts, next-action clicks, shares, forks;
- risk posture: novelty tolerance, uncertainty tolerance, source sensitivity;
- session context: current channel, previous generated states, active share/fork;
- fatigue: repeated channels, repeated layouts, repeated topics to down-rank.

The ranking engine should answer:

```text
Given this user, this moment, and this world state, what software state should
Katechon generate next?
```

## Core Architecture

```text
                    Public APIs / Chain Data / Market Data / Feeds
                                      |
                                      v
                              World State Layer
                         normalized provider envelopes
                                      |
                                      v
User Events ---> User Model ---> Candidate Generator ---> State Ranker
     ^              |                    |                    |
     |              |                    v                    v
     |              |            Candidate State Specs ---> Morph Engine
     |              |                                         |
     |              +-----------------------------------------v
     |                                             Live Channel Surface
     |                                                      |
     +---------------- watch / command / share / fork / act-+
```

### 1. World State Layer

This is mostly present in the current repo.

Current spine:

- `GET /api/channels/:channel/live`
- `GET /api/channels/:channel/context`
- `POST /api/channels/:channel/query`
- provider cache in `data/provider-cache.json`
- provenance and `dataBinding` records on generated components

The missing piece is a cross-channel world-state summary route:

```text
GET /api/attention/world-state?sessionId=...
```

It should return a compact state packet for ranking:

```json
{
  "channels": [
    {
      "channelId": "crypto-trading",
      "freshness": "live",
      "topSignals": ["BTC spread widened", "Depth concentrated near current price"],
      "availableIntents": ["price_structure", "liquidity_depth", "comparison"],
      "sourceConfidence": 0.92,
      "latencyMs": 180
    }
  ],
  "generatedAt": "2026-05-11T00:00:00.000Z"
}
```

### 2. User Event Layer

The repo already records useful events:

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

These are the right primitive events for an attention graph, but they need more
structure.

Add event properties:

```json
{
  "eventId": "evt_...",
  "sessionId": "launch-...",
  "userId": "anon_or_account_id",
  "channelId": "polyrec",
  "stateId": "state_polyrec_...",
  "shareId": "share_polyrec_...",
  "eventType": "channel_morphed",
  "inputSource": "watch-feed|voice|prompt-chip|share-fork",
  "prompt": "Find markets with high volume and close odds",
  "layoutTemplate": "ranked_board",
  "componentTypes": ["vega-chart", "entity-inspector", "source-confidence"],
  "sourceType": "live_api",
  "freshness": "live",
  "latencyMs": 1260,
  "visibleMs": 18000,
  "depth": 1,
  "at": "2026-05-11T00:00:00.000Z"
}
```

The core product metrics become:

- open rate by generated state;
- dwell time by state, not only by channel;
- command rate after a state;
- next-action click-through;
- share creation rate;
- share open rate;
- replay completion;
- fork rate;
- fallback/error abandonment;
- repeated-user return to similar states.

### 3. User Model

Start with an interpretable model, not a black box.

```json
{
  "sessionId": "launch-abc",
  "interestWeights": {
    "crypto-trading": 0.71,
    "meme-coin": 0.64,
    "polyrec": 0.58
  },
  "entityWeights": {
    "BTC": 0.9,
    "ETH": 0.55,
    "pump.fun": 0.48
  },
  "layoutWeights": {
    "market_structure": 0.8,
    "ranked_board": 0.7,
    "risk_radar": 0.62
  },
  "behavior": {
    "watcherScore": 0.35,
    "commanderScore": 0.82,
    "sharerScore": 0.46,
    "forkerScore": 0.38
  },
  "depthPreference": "board_plus_evidence",
  "noveltyTolerance": 0.58,
  "sourceSensitivity": 0.73,
  "fatigue": {
    "recentChannelIds": ["meme-coin", "meme-coin", "crypto-trading"],
    "recentLayoutTemplates": ["ranked_board", "ranked_board"]
  }
}
```

Cold start can infer a temporary profile from:

- referrer or share object;
- first channel opened;
- first prompt clicked;
- dwell on the first state;
- whether the user scrolls or commands;
- device/session mode;
- explicit launch cohort, if available.

### 4. Candidate Generator

The candidate generator proposes possible states before the user asks.

Inputs:

- user model;
- world state;
- channel manifests;
- previous session state;
- share/fork ancestry;
- source health;
- generation latency budget.

Output:

```json
{
  "candidates": [
    {
      "candidateId": "cand_crypto_liquidity_btc",
      "channelId": "crypto-trading",
      "prompt": "Show liquidity and depth around BTC right now",
      "intent": "liquidity_depth",
      "layout": "market_structure",
      "dataRequests": [
        {
          "capability": "entity_detail",
          "params": { "entity": "BTC", "coin": "BTC" }
        }
      ],
      "expectedSurface": "order-book stage plus source rail",
      "cost": {
        "latencyMs": 900,
        "providerRisk": 0.08,
        "generationRisk": 0.12
      },
      "reason": "User recently watched BTC and tends to click market-structure prompts."
    }
  ]
}
```

Candidate families:

- current live state: "what is happening now?";
- anomaly state: "what changed or broke pattern?";
- comparison state: "what should this be compared against?";
- risk state: "what looks fragile?";
- opportunity state: "what deserves action or follow-up?";
- recap state: "what did the user miss since last session?";
- shareable thesis state: "what would be worth sending to someone?";
- fork continuation state: "what is the best next state from this shared object?".

### 5. State Ranker

The ranker chooses what to show and what to offer as next actions.

Use a transparent scoring function first:

```text
score =
  user_relevance
+ world_urgency
+ novelty
+ actionability
+ source_confidence
+ visual_legibility
+ shareability
+ learning_value
- hallucination_risk
- cognitive_load
- latency_cost
- repetition_fatigue
```

Suggested feature definitions:

- `user_relevance`: match between user profile and channel/entity/layout.
- `world_urgency`: recent movement, anomaly, volume, velocity, volatility, source freshness.
- `novelty`: new enough to be interesting, not so alien it feels random.
- `actionability`: clear next action exists.
- `source_confidence`: live or cached provider-backed data beats unavailable data.
- `visual_legibility`: can be rendered in one clear stage and rail.
- `shareability`: likely to produce a state someone else can understand and fork.
- `learning_value`: teaches the user what the channel can become.
- `hallucination_risk`: high when data is sparse or provider semantics are weak.
- `cognitive_load`: penalize dense charts for casual users.
- `latency_cost`: penalize slow provider/model paths for first-screen content.
- `repetition_fatigue`: down-rank repeated channels, prompts, or layouts.

Initial deterministic ranker:

```js
function scoreCandidate(candidate, user, world) {
  return (
    0.24 * userRelevance(candidate, user) +
    0.18 * worldUrgency(candidate, world) +
    0.12 * actionability(candidate) +
    0.10 * sourceConfidence(candidate) +
    0.10 * shareability(candidate, user) +
    0.08 * novelty(candidate, user) +
    0.06 * visualLegibility(candidate, user) +
    0.04 * learningValue(candidate, user) -
    0.10 * hallucinationRisk(candidate) -
    0.07 * cognitiveLoad(candidate, user) -
    0.05 * latencyCost(candidate) -
    0.04 * repetitionFatigue(candidate, user)
  );
}
```

This can later become a learned model, but the first version should stay
inspectable because trust, provenance, and product taste matter more than raw
engagement early on.

### 6. Morph Engine

The existing channel turn runtime already provides the right direction:

```text
intent -> query -> generated page -> surfaces -> provenance -> next actions
```

The attention system should reuse that path. The ranker should not directly
render HTML. It should choose a candidate and call the same channel runtime:

```text
POST /api/channels/:channel/turn
```

or a new lower-latency internal function:

```text
generateChannelState(candidate, userContext)
```

The output remains a validated generated page:

- layout template;
- stage components;
- rail components;
- source/provenance records;
- next actions;
- share/fork metadata.

## Proposed New Routes

```text
GET  /api/attention/profile?sessionId=...
POST /api/attention/events
GET  /api/attention/world-state?sessionId=...
POST /api/attention/candidates
POST /api/attention/rank
GET  /api/attention/feed?sessionId=...
POST /api/attention/feedback
```

### `GET /api/attention/feed`

Returns the ranked states to render for the current user.

```json
{
  "ok": true,
  "sessionId": "launch-abc",
  "items": [
    {
      "rank": 1,
      "candidateId": "cand_meme_graduation",
      "channelId": "meme-coin",
      "prompt": "Show me what's about to graduate",
      "score": 0.84,
      "reason": "Live launchpad movement and prior user interest in meme boards.",
      "renderMode": "lazy_generate",
      "preview": {
        "title": "Pump.fun Graduation Watch",
        "summary": "Fresh tokens closest to the bonding-curve threshold.",
        "sourceLabel": "Live data"
      }
    }
  ],
  "debug": {
    "model": "deterministic-v1",
    "generatedAt": "2026-05-11T00:00:00.000Z"
  }
}
```

## Storage Model

Short-term file-backed storage can work for the prototype, but the production
shape should be database-backed.

Core tables or collections:

```text
users
sessions
attention_events
user_profiles
world_state_snapshots
candidate_states
ranked_slates
generated_channel_states
channel_shares
```

Important IDs:

- `sessionId`: current user session;
- `userId`: account or anonymous durable identity;
- `candidateId`: proposed state before rendering;
- `stateId`: generated state after rendering;
- `shareId`: public replay/fork object;
- `parentStateId`: depth ancestry;
- `sourceEventId`: feedback event that caused an update.

## Realtime Generation Loop

### Landing

```text
1. Load or create user profile.
2. Read compact world state for launch channels.
3. Generate candidates.
4. Rank candidates.
5. Render the highest-ranked preview immediately.
6. Generate the full state lazily when the user lands, plays, or pauses.
7. Track visible time and interaction.
```

### Scroll

```text
1. User scrolls vertically.
2. Record skip/visible time on prior state.
3. Pull next ranked candidate.
4. If not generated, call channel turn path.
5. Render generated state.
6. Update profile with watch/skip behavior.
```

### Command

```text
1. User speaks or clicks a prompt.
2. Route through current channel agent.
3. Generate depth +1 state.
4. Add state to ancestry.
5. Re-rank next actions based on the new state and user profile.
6. If share/fork likely, make share affordance more prominent.
```

### Share/Fork

```text
1. User shares current state.
2. Save generated state, provenance, ancestry, and replay plan.
3. Recipient opens share.
4. Seed recipient session from share object.
5. Candidate generator proposes continuations from that state.
6. Fork action creates a new state with parentShareId.
```

## MVP Implementation Plan

### Phase 1: Attention Events

Extend existing analytics into a more useful event stream.

Primary files:

- `server.js`
- `public/index.html`
- `public/dashboards/prototype.js`

Tasks:

- add `stateId`, `layoutTemplate`, `componentTypes`, `sourceType`, `freshness`,
  `visibleMs`, `latencyMs`, and `depth` to events;
- record visible time when switching channels or generated states;
- record skip events when the user scrolls away quickly;
- keep the current launch analytics endpoint as a summary view.

### Phase 2: Profile Builder

Add a deterministic profile builder.

Primary files:

- new `lib/attention-profile.js`
- `server.js`

Tasks:

- compute interest weights from events;
- compute layout and channel preferences;
- compute share/fork tendency;
- compute source sensitivity from fallback abandonment;
- expose `GET /api/attention/profile`.

### Phase 3: Candidate Generator

Add candidate generation from existing manifests.

Primary files:

- new `lib/attention-candidates.js`
- `lib/channel-registry.js`
- `server.js`

Tasks:

- generate candidates from each focused channel's `heroPrompts`;
- add channel-specific candidate families for Crypto, Polyrec, and Meme;
- attach required data capabilities and estimated cost;
- expose `POST /api/attention/candidates`.

### Phase 4: Ranker

Add transparent scoring.

Primary files:

- new `lib/attention-ranker.js`
- `server.js`

Tasks:

- implement deterministic scoring formula;
- return ranked slate with debug features;
- expose `GET /api/attention/feed`;
- use the ranked feed in watch mode instead of the hardcoded
  `meme-coin -> polyrec -> crypto-trading` sequence.

### Phase 5: Lazy State Generation

Generate the winning state through the existing channel turn runtime.

Tasks:

- add `renderMode: preview | lazy_generate | pregenerated`;
- when a ranked item becomes visible, call `/api/channels/:channel/turn`;
- cache generated states by candidate signature;
- preserve provenance and share/fork compatibility.

## Evaluation

The system should optimize for durable useful behavior, not cheap engagement.

Primary metrics:

- generated-state dwell time;
- prompt-to-morph conversion;
- next-action click rate;
- share rate per generated state;
- share open rate;
- replay completion rate;
- fork rate;
- return rate to similar state families;
- explicit fallback/error abandonment rate.

Quality metrics:

- source-backed claim rate;
- unavailable-data honesty rate;
- median prompt-to-visible-state latency;
- repeated-layout fatigue;
- generated state legibility;
- hallucination or unsupported-claim incidents.

North-star metric:

```text
useful generated states per user session
```

Where "useful" means the user watched, commanded, shared, forked, replayed, or
acted from the state without hitting a source/error failure.

## Product Guardrails

The ranker should not blindly maximize time spent. For live market and data
channels, compulsion without trust is a product failure.

Guardrails:

- never rank unavailable or synthetic data as if it were live;
- do not over-personalize into a filter bubble;
- preserve provenance on every generated claim;
- down-rank high-uncertainty states unless the uncertainty is the point;
- avoid financial advice or execution claims;
- add diversity across channel, layout, and domain;
- make "why am I seeing this?" inspectable for internal QA and eventually users.

## Long-Term Moat

The defensible graph is:

```text
user -> intent -> world state -> generated surface -> action -> share/fork
```

This is richer than a media engagement graph because it shows what people want
software to become in response to live reality.

Over time, Katechon can learn:

- which live data moments deserve generated surfaces;
- which layouts fit which users and domains;
- which generated states become shareable;
- which prompts create useful fork chains;
- which providers and data contracts produce reliable attention;
- which actions naturally belong inside each channel.

The billion-dollar opportunity is not a better dashboard generator. It is the
discovery and personalization layer for generated software states.
