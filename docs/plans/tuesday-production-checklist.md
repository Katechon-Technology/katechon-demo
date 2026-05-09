# Tuesday Production Checklist

## Current State

- The app is a lightweight Node/Express runtime with static frontend dashboards.
- `server.js` currently owns channel APIs, OpenAI Realtime session brokering, legacy Kat agent routes, email capture, live data adapters, and dashboard mutation tools.
- `lib/channel-registry.js` and `docs/channel-apis.md` already define the channel runtime direction: normalized live envelopes, channel manifests, generic capabilities, generated surfaces, and provenance.
- OpenAI Realtime exists but is still mixed with Anthropic, ElevenLabs, Groq, and legacy `/api/agent` paths.
- Vercel production has a ready deploy, but the active `fundraise-demo` branch is ahead of `main`; production deploy state needs to be merged cleanly into `main`.
- The current worktree has local changes, so merge and deploy work should start with branch hygiene.

## Implementation Checklist

### 1. Deploy And Repo Hygiene

- Update the company logo across `site/`, `public/`, share pages/cards, and generated Vercel output.
- Build and validate the active branch.
- Commit the current production-runtime changes intentionally.
- Merge the deploy branch back to `main`.
- Make `main` the clear production source of truth.
- Redeploy Vercel production from the merged state.
- Replace hardcoded backend IPs and any sensitive constants with environment variables before external production use.

### 2. Server Architecture

- Split the large Express server into focused modules:
  - `auth`
  - `usage`
  - `realtime`
  - `channels`
  - `providers`
  - `wallets`
  - `shares`
- Move user, usage, channel session, and share state out of local JSON files and into a real database.
- Add auth middleware and thread user/session IDs through channel state, Realtime tools, share objects, and usage events.
- Keep the existing channel routes stable while the internals are cleaned up.

### 3. OpenAI Runtime

- Make OpenAI Realtime the primary voice path.
- Use `gpt-realtime-2` with low reasoning effort for the default production voice agent.
- Follow the Realtime prompting guidance:
  - concise labeled instructions
  - short preambles only when useful
  - explicit tool-calling rules
  - clear confirmation boundaries for write/trade actions
  - dynamic `session.update` when channels change
  - no silent fallback to legacy voice after a failed turn
- Move Anthropic channel composition to OpenAI structured/tool outputs.
- Keep Replicate only for image generation.
- Remove Groq and ElevenLabs from the critical runtime path, except for explicit legacy/demo fallback or cached assets.

### 4. Auth, Usage, And Paid Upgrade

- Use Privy for email login and embedded wallet provisioning.
- Keep login simple: email-first auth with a callback flow.
- Add user tracking for:
  - channel visits
  - voice turns
  - generated surfaces
  - share creation
  - wallet/trading actions
- Give each user 30 minutes of free interaction context.
- Meter free usage by Realtime duration, model/tool calls, channel morphs, and relevant token usage.
- Gate further interaction behind a paid upgrade when the free quota expires.
- Support ChatGPT account login only if routing and identity mapping work cleanly.

### 5. Channel Runtime

- Treat every channel as:

```text
feed + channel agent + session state + layout grammar + render surfaces + memory
```

- On first channel landing, Kat gives one concise summary of the channel, then stays silent unless addressed.
- Build 5-10 reusable layout/object types for channels.
- Ensure every generated chart, table, graph, feed, card, and object is backed by:
  - normalized live data,
  - explicit user-provided input,
  - existing channel state, or
  - clearly labeled synthetic/unavailable fallback.
- Add an inspect card that shows:
  - channel inputs
  - outputs
  - live provider
  - model context
  - capabilities
  - provenance
  - current layout/state
- Keep generated surfaces replacing by default so channels do not accumulate clutter.

### 6. Crypto And Wallets

- Enable crypto channels:
  - Pump.fun-style channel
  - HYPE/Hyperliquid channel
  - Polymarket channel
- Use Privy for the universal wallet.
- The user should only interact directly with deposit/auth UX.
- All crypto actions should be handled by the agent through backend tools.
- Keep v1 integrations pragmatic:
  - enough public/live data for useful agent context
  - clean backend route boundaries
  - no overbuilt trading/security infrastructure before the core demo works
- Add explicit confirmation before any trade, deposit route, purchase, or other external-effect action.
- Log every attempted and completed crypto action into the channel inspect card.

### 7. Shareable Channel Objects

- Add shareable channel objects, not just dashboard URLs.
- A share object should persist:
  - channel id
  - generated surfaces
  - layout state
  - data provenance
  - narration script
  - transition plan
  - source/fallback state
- Target experience: every channel can be shared as a 20-second click.
- The shared 20-second click includes:
  - about 20 seconds of Kat speaking
  - three transitions between generated objects
  - a direct launch into the saved channel state

## Tuesday Success Bar

- Katechon app is live on Vercel from `main`.
- Backend servers are linked to the Vercel frontend through environment-based URLs.
- Login works with simple email auth.
- Privy wallet setup works and deposit flow is available.
- Usage is metered and users get 30 free minutes before upgrade.
- OpenAI Realtime remains the primary voice path across repeated commands.
- Channel context, agent state, and provenance are inspectable.
- Every channel can be modified in realtime through verbal input.
- Crypto, Polymarket, and Pump.fun-style channels have enough live data for the agent to act intelligently.
- Shareable 20-second channel objects work.
- Final success metric: verbal trading works end-to-end on Polymarket, HYPE/Hyperliquid, and Pump.fun-style channels. The user gives a spoken intent, the agent maps it to the correct backend route, reads back the exact action, requires explicit confirmation, executes through the wallet/trading adapter, and logs the result in the channel inspect card.

