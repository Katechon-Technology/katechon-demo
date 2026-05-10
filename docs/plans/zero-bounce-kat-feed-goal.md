# Zero Bounce Kat Feed Goal

## Goal Contract

By Tuesday, May 12, 2026, Katechon should open like a live show, not a menu.

The first user should land on the application and immediately understand the
current surface without choosing, configuring, typing, or reading product
explanation.

```text
Open Katechon -> watch Kat narrate live channels -> scroll or command the surface.
```

The demo should preserve the strongest existing idea:

- vertical movement means watching the next live channel,
- horizontal movement means mutating the current live surface,
- Kat is the host, narrator, and command interface,
- useful mutations become durable shareable states.

This is a desktop-only demo goal. Mobile should be treated as explicitly out of
scope for this pass.

## Pasteable Agent Goal

```text
/goal Build the Zero Bounce Kat Feed demo described in docs/plans/zero-bounce-kat-feed-goal.md. Keep Kat as the central host. On desktop, the root route must open directly into a faded, already-moving vertical watch feed focused on meme-coin, polyrec, and crypto-trading. A single play action should start Kat narration, brighten the active surface, and make the feed feel live without requiring signup, grid selection, typing, or dashboard comprehension. Users can scroll vertically to watch the next live channel or ask/click Kat horizontally to mutate the current surface. Most mutations should stay inside the current card; only shareable thesis changes should spawn a new public card/state. Massively simplify each dashboard for immediate comprehension and hide grid, legacy controls, raw source errors, and analyst details behind optional disclosure. Do not implement mobile in this goal.
```

## Strategic Frame

Katechon should feel like a living channel stack.

The user does not start by understanding the platform. The user starts by
watching something that is already happening. The aha comes after the first
command:

```text
I was watching a live surface, then Kat changed it because I asked.
```

The product should support two modes without explaining them:

- Watch: scroll vertically through live channels.
- Mutate: ask Kat or click one action to change the current channel.

If a decision makes the first screen feel like a menu, settings page, dashboard
library, or app-builder UI, cut it from this goal.

## Desktop-Only Scope

This pass is for desktop demo quality only.

Required:

- desktop viewport is the primary target,
- keyboard, mouse, and trackpad scrolling should feel good,
- fullscreen channel feed should be reliable on laptop and desktop screens,
- desktop share/fork paths should work.

Out of scope:

- mobile layouts,
- mobile gesture design,
- responsive mobile QA,
- mobile onboarding,
- mobile-specific video or audio tuning.

If existing mobile gates remain, they can stay. Do not spend time making this
experience good on mobile during this goal.

## First Screen

The root route should not present a grid by default.

On `/`, the user should see:

- a fullscreen active channel surface,
- the surface already moving,
- the surface slightly faded or muted before play,
- Kat presented as a clear play affordance,
- one primary button: `Play Kat`,
- minimal channel labels, not a full dashboard picker.

The user should not see:

- `connecting...`,
- `View Grid`,
- the 18-channel library,
- `Legacy`,
- voice mode toggles,
- raw provider errors,
- source/provenance pills as primary content,
- command text boxes.

The old grid can remain available behind an explicit secondary path such as
`/?grid=1`, `More`, or an investor/demo drawer.

## Kat Interaction Model

Kat stays central.

Before play:

- Kat is visible as the host,
- visuals are moving but dimmed,
- no narration audio is required yet,
- the page feels muted, not locked.

After play:

- Kat starts narrating the active surface,
- the active surface brightens,
- the first channel read is concise and useful,
- Kat offers one obvious next action,
- the user can keep scrolling or command the active surface.

Kat should not appear as raw product chrome. Avoid labels such as `KAT CONTROL`,
`LEGACY`, or implementation-mode toggles in the public demo surface.

## Vertical Watch Feed

Vertical scroll is the passive entertainment layer.

The initial feed should focus on three channels:

- `meme-coin`: what is pumping and whether the hype is real.
- `polyrec`: weird or moving prediction markets.
- `crypto-trading`: whether BTC is calm, trapped, or breaking.

Each vertical card should be instantly legible:

1. one headline,
2. one moving visual,
3. three big facts,
4. Kat's one-sentence read,
5. one primary action.

The user should be able to scroll and absorb without interacting.

## Horizontal Mutation Model

Horizontal mutation means changing the current live surface.

Allowed public inputs:

- Kat voice command,
- one-click Kat action,
- next-action chips,
- share/fork buttons after a meaningful mutation.

Avoid public text command boxes for this goal. Backend prompt strings can remain
as internal transport and test paths.

### Stay Within The Card

Most mutations should stay inside the current card.

Use in-card mutation for:

- sorting differently,
- changing timeframe,
- focusing one token, market, or entity,
- adding a comparison,
- revealing risk/source detail,
- asking `why`,
- changing chart emphasis,
- adding a temporary overlay.

This is where the aha happens: the live thing on screen changes under Kat's
control.

### Spawn A New Card

Only spawn a new public card/state when the mutation creates a shareable thesis.

Spawn a card for:

- `Make a board of fragile meme coins`,
- `Turn this into a BTC vs ETH battle`,
- `Find weird political markets like this`,
- cross-channel pivots,
- explicit fork actions,
- explicit shareable state creation.

Every spawned card should be durable and forkable, but the feed should not
become chaotic. The viewer experience should prioritize a small number of
high-signal public cards over logging every tiny interaction as a new feed item.

## Public Stack Model

Good mutations can become public stack cards.

The public stack should communicate:

```text
base live channel -> Kat mutation -> shareable state -> forkable continuation
```

For the demo:

- base channel cards are always present,
- generated mutation cards can be added to the visible stack,
- each generated card has a short title and one reason it matters,
- each generated card can be opened, shared, or forked,
- the stack should feel curated, not like an activity log.

## Dashboard Simplification Rules

Each focused dashboard should collapse to one immediately understood question.

`meme-coin`:

```text
What's pumping, and is the hype real?
```

`polyrec`:

```text
What weird markets are moving?
```

`crypto-trading`:

```text
Is BTC calm, trapped, or breaking?
```

Default surface rules:

- one title that a nontechnical user understands,
- one primary visual,
- three metrics maximum,
- one short Kat read,
- one primary action,
- secondary details hidden.

Copy replacements:

- `Fastest Moving Meme Coins` -> `What's pumping?`
- `Attention Vs Liquidity Risk` -> `Is the hype real?`
- `Viral But Fragile` -> `Looks viral, might break`
- `Narrative Decay Watch` -> `Is it fading?`
- `Election + Macro Market Watch` -> `What bets are moving?`
- `BTC Liquidity And Depth` -> `Is BTC trapped?`

Avoid words like:

- dashboard,
- runtime,
- provider,
- stale/cache,
- API,
- generated component,
- source confidence,
- fallback reason.

These can exist in details drawers, test output, internal state, and investor
QA, but not as first-order public copy.

## Source And Error Display

Source truth should remain available but not dominate the experience.

Public surface labels:

- `Live data`
- `Data cached`
- `Simulated backup`

Details drawer labels:

- provider,
- freshness,
- fallback reason,
- row count,
- provenance ids.

Never show raw adapter errors such as `api.coingecko.com 429` in the primary
stage or rail. Convert them to normie-safe copy:

```text
Data cached. Live source is rate-limited.
```

The `No Faculty Data Available` state must not appear in `meme-coin`. Replace
channel mismatches with channel-specific empty states:

```text
No fresh token rows. Showing cached movers.
```

## Share And Fork Behavior

Share should feel like a payoff, not a technical event.

After a meaningful mutation:

- show `Share` and `Fork`,
- on share, copy the replay URL or use native share,
- show a toast: `Link copied`,
- optionally show `Post this` and `Fork this`,
- do not replace primary visible copy with a long URL.

Share pages should still open directly into fullscreen replay mode. That is a
good mechanic and should stay.

## Implementation Plan

### 1. Add Desktop Watch Mode

Primary files:

- `public/index.html`
- `public/dashboards/catalog.js`
- `public/local-desktop.html` if needed for background behavior

Tasks:

- add a default root watch mode for desktop,
- auto-open `meme-coin` with a strong default prompt,
- keep old grid behind `?grid=1` or a drawer,
- hide status chrome, legacy voice controls, and broad channel library in watch
  mode,
- add a simple bottom or side rail for `Meme`, `Bets`, and `BTC`,
- preserve vertical scrolling between the three focused surfaces.

### 2. Convert Kat From Control Panel To Play Host

Primary files:

- `public/index.html`
- `public/avatar-pet.html`
- dashboard narration helpers in `public/index.html`

Tasks:

- replace public `KAT CONTROL` / `LEGACY` chrome with `Play Kat`,
- keep audio unlock tied to user gesture,
- brighten active surface after play,
- start concise narration for the active channel,
- update narration on vertical card change,
- keep command affordances Kat-centered.

### 3. Simplify Focused Dashboard Surfaces

Primary files:

- `server.js`
- `public/dashboards/prototype.js`
- `public/prototype-dashboard.html`

Tasks:

- reduce default visible text per focused channel,
- update title/copy mappings for normie comprehension,
- make each focused channel render one primary visual and three facts,
- hide source/provenance detail by default,
- remove channel-inappropriate empty states from `meme-coin`,
- keep detailed provenance in disclosure for QA and investor trust.

### 4. Implement Mutation Rules

Primary files:

- `server.js`
- `public/dashboards/prototype.js`
- channel session/share routes in `server.js`

Tasks:

- classify next actions as `in_card_mutation` or `spawn_public_card`,
- keep simple follow-ups inside the active card,
- spawn durable cards only for shareable thesis changes,
- preserve current depth/share object support for spawned states,
- expose a visible stack only for curated generated cards.

### 5. Tighten Share Payoff

Primary files:

- `public/dashboards/prototype.js`
- `server.js`
- `dashboard-share.js`

Tasks:

- keep share page redirect/replay behavior,
- change in-app share feedback to `Link copied`,
- stop replacing the main visible line with a long URL,
- show `Fork this` after share creation,
- keep share/fork analytics.

### 6. Desktop QA Harness

Primary files:

- `scripts/launch-qa-core.js`
- optional new `scripts/watch-feed-qa.js`

Tasks:

- validate desktop root opens watch mode,
- validate no broad grid appears by default,
- validate `Play Kat` is visible before narration,
- validate active surface brightens after play,
- validate vertical scroll changes focused channel,
- validate one mutation changes the current card,
- validate a thesis mutation creates a shareable state,
- validate no raw provider error appears in primary visible copy.

Do not add mobile QA for this goal.

## Acceptance Criteria

Desktop root:

- `/` opens to watch mode, not the full grid.
- First visible focused surface is active within one second on local demo.
- User sees a moving channel surface before clicking.
- User sees one clear Kat play affordance.
- `connecting...`, `Legacy`, and raw voice-mode controls are not visible.

Kat:

- clicking play starts or attempts narration through a user gesture,
- active surface visually brightens after play,
- Kat gives one concise read and one next action.

Vertical watch:

- user can scroll through `meme-coin`, `polyrec`, and `crypto-trading`,
- each focused surface is understandable from title, visual, and three facts,
- broad 18-channel grid is not part of default first-run flow.

Horizontal mutate:

- one click or Kat command mutates the current surface without leaving the feed,
- simple mutations stay within the current card,
- thesis-level mutations create a durable shareable state/card.

Share/fork:

- share copies or invokes native share,
- UI says `Link copied` rather than showing a long URL as the main content,
- share URL opens directly into fullscreen replay,
- fork can continue from the shared state.

Source/error:

- primary UI never shows raw provider errors,
- `No Faculty Data Available` never appears in Meme Coin,
- details remain available behind disclosure.

## Explicit Non-Goals

- No mobile implementation.
- No mobile responsiveness pass.
- No wallet or trade execution.
- No paid gating.
- No broad polish across all 18 channels.
- No investor-only explanation page as the first screen.
- No generic app-builder controls in the public flow.

## Demo Script

```text
1. Open /.
2. Meme Coin is already moving, faded.
3. Click Play Kat.
4. Kat explains what is pumping and why it may be fake hype.
5. Scroll down to Bets.
6. Kat updates the read for weird markets.
7. Scroll down to BTC.
8. Click "Is BTC trapped?"
9. The current BTC card mutates in place.
10. Click a thesis-level action.
11. A new public card/state appears.
12. Click Share.
13. Link copied.
14. Open the share URL.
15. Fork the state with one Kat action.
```

The demo should make one idea obvious:

```text
This is not a video and not a dashboard. It is a live surface Kat can change.
```

