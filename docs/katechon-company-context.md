# Katechon Company Context For Generative Investor Slides

This file is the starting context for the realtime investor slide agent. It is intentionally long-form and should be treated as the highest-priority product memory when a user asks the deck to generate a slide. The agent should combine this document with the repo map, planning docs, and Open Slide authoring rules, then create one concrete investor-grade slide in realtime.

## One-Line Company Thesis

Katechon is building the channel layer for generated software: live, stateful software objects that people can watch, command, share, fork, and eventually transact inside.

## Short Investor Version

AI has made software cheap to generate, but the current internet still distributes generated software as screenshots, videos, posts, and static links. That flattens the most valuable part of software: state. Katechon turns generated software into live channels. A channel is not a page, feed, dashboard, video, or chatbot. It is a software object with a data feed, a specialist agent, memory, state, a mutable surface, and a shareable history.

The first wedge is market-native channels because markets already have urgency, live feeds, communities, and embedded actions. A user opens a channel, asks Kat for a focused state, watches the surface rebuild around that request, and shares the result as a live object instead of a screenshot. The recipient can replay it, fork it, and keep going.

## Core Problem

The internet's main containers were built for static or semi-static artifacts:

- Pages are documents.
- Feeds are streams of posts.
- Dashboards are fixed information layouts.
- Videos are compressed demonstrations of software rather than software itself.
- Screenshots prove demand but destroy state.

AI changes the supply side. People can now generate interfaces, charts, data views, explanations, workflows, and applications around a prompt. The bottleneck is no longer making the interface. The bottleneck is keeping the generated state alive, navigable, shareable, and actionable.

When a generated app is posted as media, four things are lost:

- state: the current focus, filters, data, and reasoning path;
- agency: the ability to command or modify the surface;
- provenance: the source data and tools behind the result;
- compounding: the next person cannot fork and extend the object.

Katechon exists because generated software needs a native internet container.

## Product Definition

A Katechon channel is:

```text
live feed + specialist agent + session state + layout grammar + render surface + memory + share object
```

A channel is not:

- a generic chatbot embedded beside a dashboard;
- a static dashboard with one generated widget;
- a gallery of hardcoded demo pages;
- a content feed dressed up as software;
- a chart generator with narration.

The channel should feel like a live software state that can be watched passively, commanded actively, and shared as an object.

## Kat

Kat is the user's universal companion, voice, narrator, and router. The user should feel like they are interacting with one continuous guide, even when specialist channel agents are doing the domain work underneath.

Kat owns:

- voice and conversational continuity;
- high-level routing across channels;
- narration of what changed;
- user preference memory;
- deciding when to ask clarifying questions;
- making the generated state understandable without turning the UI into a tutorial.

Kat should not pretend to be the domain expert for every channel. Channel-specific agents own domain context, tools, provider knowledge, and surface composition. Kat speaks the result.

## Channel Agents

A channel agent is the specialist brain for one channel. It owns:

- the channel manifest and vocabulary;
- data-source knowledge;
- API query planning;
- provenance rules;
- session-state updates;
- layout and visualization selection;
- generated surface composition;
- suggested next actions.

The channel agent should be constrained but not decorative. It gets freedom inside a grammar of layouts, components, data tools, style tokens, and provenance requirements. It should not fabricate live market data, customer traction, revenue, partnerships, or metrics.

## Runtime Loop

Every meaningful user turn should become a state transition:

1. Parse intent.
2. Update channel focus.
3. Query or identify required data.
4. Select layout.
5. Replace the active surface.
6. Explain what changed.
7. Offer the next useful move.

The important behavior is whole-surface evolution. The user should feel the page turn. If a prompt only adds a card while the old dashboard dominates, the mutation failed.

## First Wedge

The focused launch wedge is:

```text
Ask a live market to become an app. Share the result.
```

The priority channels are:

- Crypto Trading: live crypto market structure.
- Polyrec: prediction-market intelligence.
- Meme Coin: social and token velocity.

The shared product loop is:

1. Open a market channel with no setup.
2. Speak to Kat or click a high-intent prompt.
3. Watch the channel visibly morph into a new live software state.
4. Hear Kat explain the change in one concise line.
5. Share the resulting state as a replayable channel object.
6. Let a recipient fork the state with one prompt.

The point is not to finish the entire platform. The point is to make one product truth undeniable: Katechon turns markets into shareable live software.

## Investor Narrative Spine

Use this spine when constructing slides:

1. Builder-market fit: the team sits at the intersection of capital formation, crypto distribution, and frontier computer science.
2. Inflection: AI makes software generation feel like the iPhone camera moment, but generated software needs a native container.
3. Broken container: software is currently flattened into screenshots, videos, and posts, which proves demand while destroying state.
4. Product: Katechon packages generated software as live channels: watchable, stateful, narrated, personalized surfaces.
5. Prize: the platform that learns what generated software people watch, modify, command, share, fork, and act inside owns a new discovery graph.

## Current Demo Truths

The repo already contains:

- a Node/Express UI and API server;
- channel registry and provider metadata;
- prototype dashboards and channel catalog;
- OpenAI Realtime session support;
- legacy narration and TTS paths;
- channel turn routes and generated-surface rendering;
- share/replay/fork concepts for generated channel states;
- the Dune investor deck route at `/dashboards/dune-deck/`;
- realtime slide generation endpoints for the deck;
- an Open Slide workspace at `open-slide/katechon-investor`.

The current demo is still a prototype. Slides should not claim production-scale usage, revenue, signed customers, regulated trading, live wallet execution, audited model reliability, or any metric that is not present in the repo context.

## Positioning Language

Prefer these phrases:

- live software object;
- channel layer;
- generated software state;
- watch, command, share, fork, act;
- stateful surfaces;
- full-surface transformation;
- specialist channel agents;
- Kat as continuity layer;
- provenance-backed views;
- post-page internet.

Use "dashboard" only when contrasting with the old category or describing current implementation reality. The strategic category is channel, not dashboard.

## What To Avoid

Do not say:

- "AI dashboard builder" as the main category.
- "Chatbot for dashboards" as the product.
- "We have traction" unless a cited metric exists in the current context.
- "Autonomous trading" unless the slide is explicitly hypothetical and clearly future-facing.
- "All data is live" if a fallback/synthetic source may be used.
- "The model knows" without provenance or state.

Avoid overexplaining the UI. The investor should understand the slide as a product claim, not a tutorial.

## Aesthetic Direction

Katechon should feel like quiet, high-conviction infrastructure for live software:

- dark canvas;
- restrained red, green, blue, and amber accents;
- crisp geometric systems;
- thin lines, rails, traces, and state nodes;
- large concise typography;
- no marketing-card clutter;
- no decorative gradients as the main idea;
- no stock imagery unless it reveals a real product, market, or person;
- no cute or playful tone.

Slides should be dense enough for investors but not crowded. They should look generated from code in realtime: structured, dynamic, compositional, and specific to the user prompt.

## Slide Content Rules

Every generated slide should answer the user prompt directly. The slide should contain:

- one sharp headline;
- one support line;
- a visual primitive or Open Slide composition;
- two to four concrete supporting points;
- a short narration/talk track;
- optional state rail labels that make the realtime pipeline visible.

Slides should not repeat the same shape. When the prompt asks for a problem, use a contrast or failure chain. When it asks for product, use an object model or runtime loop. When it asks for go-to-market, use a wedge and compounding loop. When it asks for moat, use data/state/distribution accumulation. When it asks for demo proof, use a concrete turn example.

## Slide Strategy And Variation Rules

The agent should treat every prompt as a new editorial decision, not as a new title on the same template. Choose one strategy and one composition before writing copy:

- `problemChain`: show failure or state loss as a causal chain. Use for pain, broken internet container, why current tools fail.
- `objectModel`: define the new object. Use for "what is a channel", product architecture, Kat plus specialist agents.
- `runtimeLoop`: show state transition over time. Use for "how it works", realtime generation, channel morphing.
- `wedgeLoop`: show a product loop. Use for market wedge, viral launch, watch-command-share-fork-act.
- `moatMap`: show compounding assets. Use for defensibility, discovery graph, state graph, provider graph.
- `proofTurn`: show one concrete generated interaction. Use for demo proof and "what happens when I ask X".
- `categoryDesign`: name the category and contrast it with dashboards/pages/feeds.
- `teamCredibility`: connect founder/team background to the wedge.
- `askClose`: synthesize why now, why this team, and what investors should remember.

Compositions should vary visibly:

- `chain`: staggered cards connected by traces;
- `orbit`: a central channel/object with surrounding components;
- `timeline`: numbered runtime steps;
- `matrix`: comparison, moat, or evidence grid;
- `constellation`: network graph for discovery, actions, or compounding loops;
- `terminal`: visible generation/provenance/code stream;
- `stack`: layers of agent/data/state/surface;
- `splitCards`: fallback only when the prompt needs plain argumentation.

Do not repeat the previous strategy/composition/accent if a different one can answer the prompt. The investor should feel that the slide is generated, not merely filled in.

## Canonical Example Prompts And Intended Angles

Prompt: "Tell me about the core problem Katechon solves."

Angle: generated software has no native container. Screenshots and videos prove demand but destroy state. Katechon preserves state as live channels.

Prompt: "Why now?"

Angle: AI makes interface generation abundant. Markets, feeds, and tools are live. The web container has not caught up.

Prompt: "What is a channel?"

Angle: feed plus agent plus state plus surface plus memory plus share object.

Prompt: "Show the runtime loop."

Angle: intent to state to data to layout to surface to narration to next action.

Prompt: "How does this become a venture-scale company?"

Angle: discovery graph for generated software states, starting with market-native channels where watch, command, share, fork, and transact are already natural.

Prompt: "What is the moat?"

Angle: state graph, channel-specific agents, data/provider integrations, share/fork loops, and learned interaction patterns around generated software.

Prompt: "What should investors remember?"

Angle: Katechon is not making dashboards smarter; it is replacing pages and dashboards with live software channels.

## A Good Slide Feels Like

The user types a question. The generation console streams context and code. A slide mounts with content that could not have been fully preauthored because it reflects the exact prompt. The source also materializes as an Open Slide React page so the artifact is reviewable and editable as code.

The investor should see the claim and the proof at the same time: the slide about realtime generation was itself generated in realtime.
