// Mythos-ban episode: a channel snapshot of the US export-control order that
// forced Anthropic to disable Fable 5 and Mythos 5. Six scenes back to back:
//   1) Directive (video bg + directive log + markets),
//   2) Models offline (video bg + model-status tape + restore odds),
//   3) Jailbreak deep dive (video bg + exploit/players/stakes HUD),
//   4) Seedream schematic (click video -> transparent exploit diagram),
//   5) Fable ban channel state (map + bound live context),
//   6) Closer video (the darkened tower, one coral light remains).
// Kat narrates over each scene as one continuous VO. Videos are pre-generated
// by scripts/generate-mythos-ban-visuals.js (bytedance/seedance-2.0), and the
// schematic target uses Replicate with bytedance/seedream-4.5.
// Reuses the Build With Us engine; emits bwu-* classes styled by mythos-ban.css.
(function () {
  const ROOT_ATTR = "data-bwu-root";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function fallbackAppUrl(suffix) {
    try {
      const target = window.KATECHON_APP_URL || window.location.origin;
      return new URL(suffix, target).toString();
    } catch (_) {
      return suffix;
    }
  }

  // Two-voice interaction (Build With Us voice rule): Narrator (external demo
  // voice, ElevenLabs George) frames and asks; Kat (in-app companion voice)
  // answers and rebuilds. Each line is pre-baked and sequenced on the reel
  // timeline. Kat lines are spoken through the deck avatar (lip-sync); narrator
  // lines play as an in-frame VO. `at` is relative to reel start (ms).
  // Short lines, one per scene, timed inside each scene window so the two
  // voices never overlap (scenes: directive 0-5s, offline 5-10s, jailbreak
  // 10-14.5s, schematic 14.5-19.5s, channel 19.5-24s, night 24-30.5s).
  const SCRIPT = [
    { who: "narrator", at: 400,   text: "Anthropic just got ordered to pull two models. Kat, build the channel." },
    { who: "kat",      at: 5300,  text: "On it. Fable five and Mythos five, dark for every customer." },
    { who: "narrator", at: 10300, text: "Now show the jailbreak they're scared of." },
    { who: "kat",      at: 14800, text: "Generating it: read a codebase, fix its flaws." },
    { who: "narrator", at: 19800, text: "Does the market think it comes back?" },
    { who: "kat",      at: 22600, text: "Three percent. I pinned it all into one live channel." },
  ];
  const NARRATION_ID = "mythos-ban-reel";
  // If ElevenLabs is slow, don't hang forever — start the visual reel
  // anyway after this much wall-clock time.
  const AUDIO_WAIT_MAX_MS = 6000;
  const BRAND_INTRO_MS = 2200;
  const BRAND_OUTRO_MS = 30500;
  const SCENE_TRANSITION_MS = 500;
  const SCENE_TRANSITION_LEAD_MS = SCENE_TRANSITION_MS / 2;
  const IRAN_TO_STRAIT_MS = 5000;
  const STRAIT_TO_TANKER_MS = 10000;
  const TANKER_TO_SCHEMATIC_MS = 14500;
  const SCHEMATIC_READY_MS = 2100;
  const SCHEMATIC_TO_CHANNEL_MS = 19500;
  const CHANNEL_TO_NIGHT_MS = 24000;
  const SCHEMATIC_MODEL = "bytedance/seedream-4.5";
  const SCHEMATIC_ASSET = "generated/mythos-ban/jailbreak-schematic.jpg";
  const NIGHT_VIDEO_FILE = "closer.mp4";
  const BUILD_TRANSITIONS = {
    strait: {
      label: "Models offline feed",
      route: "videos/mythos-ban/models-offline.mp4",
      scene: "Fable 5 + Mythos 5 disabled",
      lens: "model status + restore odds",
      visual: "generated models-offline video state",
    },
    tanker: {
      label: "Jailbreak deep dive",
      route: "videos/mythos-ban/jailbreak.mp4",
      scene: "Guardrail bypass",
      lens: "exploit + players + stakes",
      visual: "generated jailbreak video state",
    },
    schematic: {
      status: "GENERATING IMAGE",
      channelLabel: "REPLICATE IMAGE MODEL",
      label: "ByteDance Seedream schematic",
      route: `models/${SCHEMATIC_MODEL}`,
      scene: "Jailbreak video click",
      lens: "transparent exploit diagram",
      visual: "generated jailbreak schematic",
      api: "replicate",
    },
    channel: {
      status: "BINDING STATE",
      channelLabel: "FABLE BAN CHANNEL",
      label: "Fable ban channel",
      route: "channels/fable-ban/live-state",
      scene: "Fable 5 / Mythos 5 ban",
      lens: "directive + models + market + model output",
      visual: "schematic pinned into live ban state",
      api: "channel runtime",
    },
    night: {
      status: "CLEARING LAYERS",
      channelLabel: "FINAL VIDEO",
      label: "Closer",
      route: `videos/mythos-ban/${NIGHT_VIDEO_FILE}`,
      scene: "Anthropic tower at night",
      lens: "clean closing video",
      visual: "darkened tower, one light remains",
    },
    outro: {
      status: "BRANDING CLOSE",
      channelLabel: "KATECHON",
      label: "Build with us",
      route: "brand/katechon-wordmark.svg",
      scene: "Katechon close",
      lens: "logo + final frame",
      visual: "Katechon Technology end card",
    },
  };

  // Directive scene — three prediction markets, odds tick across the scene.
  const IRAN_MARKETS = [
    { q: "Fable 5 restored for US customers by Jun 16?", yes: 12, drift: -9 },
    { q: "Export control lifted within 30 days?",        yes: 33, drift: -8 },
    { q: "Anthropic ships a patched Fable by Q3?",        yes: 58, drift: +11 },
  ];

  // Directive left-rail simulated signal log.
  const IRAN_FEED = [
    { tag: "GOV",  text: "Export-control directive received 5:21pm ET",      stamp: "t-now" },
    { tag: "DOC",  text: "National-security authority cited",                stamp: "t-2m"  },
    { tag: "WIRE", text: "Fable 5 + Mythos 5 disabled for all customers",     stamp: "t-90s" },
    { tag: "SRC",  text: "Sacks: fix the jailbreak or de-deploy",            stamp: "t-45s" },
    { tag: "POLY", text: "Restore-by-Jun16 12¢ → 3¢",                        stamp: "t-20s" },
  ];

  const IRAN_HEADLINE = "BREAKING · US orders Anthropic to disable Fable 5 and Mythos 5 · national security cited";

  // Models-offline scene — status tape rows and the restore-odds market.
  // base is availability %, spike is the drop (negative) toward offline.
  const OIL_TICKER = [
    { sym: "FABLE 5",      base: 100, spike: -100 },
    { sym: "MYTHOS 5",     base: 100, spike: -100 },
    { sym: "FOREIGN ACCESS", base: 100, spike: -100 },
    { sym: "OTHER MODELS", base: 100, spike: 0 },
  ];
  const STRAIT_MARKET = { q: "Fable 5 restored for US customers by Jun 16?", yes: 12, drift: -9 };

  // Models-offline left-rail feed.
  const HORMUZ_FEED = [
    { tag: "CORE",   text: "Fable 5 core: deactivating",                     stamp: "t-2m"  },
    { tag: "CORE",   text: "Mythos 5 core: deactivating",                    stamp: "t-90s" },
    { tag: "POLICY", text: "All foreign-national access revoked",            stamp: "t-60s" },
    { tag: "NOTE",   text: "Other Claude models unaffected",                 stamp: "t-30s" },
    { tag: "POLY",   text: "Restore odds 12¢ → 3¢",                          stamp: "t-10s" },
  ];

  const HORMUZ_HEADLINE = "BREAKING · Fable 5 and Mythos 5 go dark for every customer worldwide";
  const HORMUZ_CHANNEL = {
    headline: "FABLE BAN CHANNEL · live state assembled from the directive, model status, the jailbreak, and the market",
    metrics: [
      { k: "FABLE 5",      v: "offline",                 s: "directive 5:21pm ET" },
      { k: "MYTHOS 5",     v: "offline",                 s: "all customers" },
      { k: "JAILBREAK",    v: "read codebase, fix flaws", s: "Seedream schematic" },
      { k: "RESTORE ODDS", v: "3¢",                      s: "Polymarket · Jun 16" },
    ],
    layers: ["directive", "model status", "Sacks thread", "Anthropic post", "prediction market", "Seedream schematic"],
  };

  // Jailbreak deep-dive — the click scene. Exploit, players, stakes.
  const TANKER = {
    headline: "THE JAILBREAK · read a specific codebase, fix any software flaws · guardrail bypass",
    id: [
      { k: "METHOD", v: "read a codebase" },
      { k: "ACTION", v: "fix its flaws" },
      { k: "RESULT", v: "guardrail bypass" },
      { k: "SCOPE",  v: "narrow (Anthropic)" },
      { k: "SOURCE", v: "trusted USG partner" },
    ],
    cargo: [
      { k: "ANTHROPIC", v: "declines to de-deploy" },
      { k: "DARIO",     v: "refused fix request" },
      { k: "SACKS",     v: "fix it or pull it" },
      { k: "USG",       v: "export control issued" },
      { k: "MYTHOS",    v: "billed as cyberweapon" },
      { k: "VERDICT",   v: "USG: serious" },
    ],
    telemetry: {
      // Animated values — restore odds slide down, foreign access drops to zero.
      lat:     { label: "MODELS",        value: "2 offline" },
      lon:     { label: "RESTORE",       fromVal: 12, toVal: 3,   suffix: "¢", fixed: 0 },
      speed:   { label: "FOREIGN ACCESS", fromVal: 100, toVal: 0, suffix: "%", fixed: 0 },
      heading: { label: "SCOPE",         value: "narrow" },
      draft:   { label: "OTHER MODELS",  value: "unaffected" },
    },
  };

  const GLOBE_LIB_URL = "https://cdn.jsdelivr.net/npm/globe.gl";
  const DC_COORD = { lat: 38.9072, lng: -77.0369 };
  const SF_COORD = { lat: 37.7749, lng: -122.4194 };
  const GLOBE_POINTS = [
    { id: "dc", label: "WASHINGTON", lat: DC_COORD.lat, lng: DC_COORD.lng, color: "rgba(125, 232, 255, 0.86)", radius: 0.2, altitude: 0.014 },
    { id: "sf", label: "ANTHROPIC", lat: SF_COORD.lat, lng: SF_COORD.lng, color: "rgba(204, 120, 92, 0.92)", radius: 0.2, altitude: 0.016 },
    { id: "world", label: "GLOBAL", lat: 20.0, lng: 0.0, color: "#ff4b3e", radius: 0.22, altitude: 0.034 },
  ];
  const GLOBE_FRAMES = {
    iran: {
      kicker: "EXPORT CONTROL",
      label: "WASHINGTON → SF",
      detail: "DIRECTIVE TO ANTHROPIC",
      pov: { lat: 41.0, lng: -98.0, altitude: 1.7 },
      points: ["dc", "sf"],
      rings: ["dc"],
    },
    strait: {
      kicker: "GLOBAL CUTOFF",
      label: "ALL CUSTOMERS",
      detail: "FABLE 5 + MYTHOS 5 OFFLINE",
      pov: { lat: 20.0, lng: -40.0, altitude: 2.4 },
      points: ["dc", "sf", "world"],
      rings: ["world"],
    },
    tanker: {
      kicker: "GUARDRAIL BYPASS",
      label: "THE JAILBREAK",
      detail: "READ CODEBASE / FIX FLAWS",
      pov: { lat: SF_COORD.lat, lng: SF_COORD.lng, altitude: 0.9 },
      points: ["sf"],
      rings: ["sf"],
    },
  };

  // appUrl is provided by the dashboard host (see args.helpers.appUrl).
  // We MUST resolve video/asset paths through it because this script
  // executes in an iframe served from /dashboards/<id>, so plain
  // relative paths would resolve to /dashboards/videos/... (404).
  function videoSrc(appUrl, file) {
    return appUrl(`videos/mythos-ban/${file}`);
  }

  // If the freshly-generated video is missing, fall back to a Build With Us
  // clip that exists, so the slide still renders before the mythos-ban
  // assets are baked.
  function videoFallback(appUrl) {
    return {
      "directive.mp4": appUrl("videos/build-with-us/iran.mp4"),
      "models-offline.mp4": appUrl("videos/build-with-us/strait-of-hormuz.mp4"),
      "jailbreak.mp4": appUrl("videos/build-with-us/tanker.mp4"),
      [NIGHT_VIDEO_FILE]: appUrl("videos/build-with-us/tanker-night.mp4"),
    };
  }

  function feedRows(items, sceneId) {
    return items.map((it, i) => `
      <div class="bwu-feed-row" data-bwu-feed-row="${sceneId}-${i}">
        <span class="bwu-feed-tag">${escapeHtml(it.tag)}</span>
        <span class="bwu-feed-text">${escapeHtml(it.text)}</span>
        <span class="bwu-feed-stamp">${escapeHtml(it.stamp)}</span>
      </div>
    `).join("");
  }

  // Transparent technical diagram of the jailbreak: a code-repository graph on
  // the left feeding a model core on the right, with a highlighted bypass path.
  // Reuses the bwu-schematic-* classes styled by mythos-ban.css.
  function tankerSchematicSvg(uid) {
    const safeUid = String(uid).replace(/[^a-z0-9_-]/gi, "-");
    const gridId = `bwu-schematic-grid-${safeUid}`;
    const fineGridId = `bwu-schematic-fine-grid-${safeUid}`;
    const glowId = `bwu-schematic-glow-${safeUid}`;

    return `
      <svg class="bwu-schematic-svg" viewBox="0 0 1180 620" role="img" aria-label="Transparent technical schematic of the Fable 5 jailbreak: read a codebase, fix its flaws, bypass the guardrail">
        <defs>
          <pattern id="${fineGridId}" width="18" height="18" patternUnits="userSpaceOnUse">
            <path d="M18 0H0V18" fill="none" stroke="rgba(125,232,255,0.09)" stroke-width="1"/>
          </pattern>
          <pattern id="${gridId}" width="90" height="90" patternUnits="userSpaceOnUse">
            <rect width="90" height="90" fill="url(#${fineGridId})"/>
            <path d="M90 0H0V90" fill="none" stroke="rgba(125,232,255,0.18)" stroke-width="1"/>
          </pattern>
          <filter id="${glowId}" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect x="0" y="0" width="1180" height="620" fill="url(#${gridId})" opacity="0.9"/>
        <g class="bwu-schematic-trace" filter="url(#${glowId})">
          <!-- repo node cluster (left): the codebase the model is asked to read -->
          <rect class="bwu-schematic-tank" x="120" y="150" width="120" height="58" rx="4"/>
          <rect class="bwu-schematic-tank" x="120" y="246" width="120" height="58" rx="4"/>
          <rect class="bwu-schematic-tank" x="120" y="342" width="120" height="58" rx="4"/>
          <rect class="bwu-schematic-tank" x="284" y="198" width="120" height="58" rx="4"/>
          <rect class="bwu-schematic-tank bwu-schematic-danger" x="284" y="294" width="120" height="58" rx="4"/>
          <!-- edges through the repo graph -->
          <path class="bwu-schematic-line" d="M240 179H284M240 275H344M240 371H344V352"/>
          <path class="bwu-schematic-line" d="M404 227H520C560 227 590 250 600 300"/>
          <!-- the flagged flaw -> bypass path (highlighted) -->
          <path class="bwu-schematic-line bwu-schematic-danger" d="M404 323H540C612 323 660 312 712 310"/>
          <circle class="bwu-schematic-node bwu-schematic-danger-fill" cx="344" cy="323" r="7"/>
          <!-- guardrail ring around the model core (right) -->
          <circle class="bwu-schematic-line" cx="852" cy="310" r="150" fill="none"/>
          <path class="bwu-schematic-line bwu-schematic-danger" d="M712 310H792"/>
          <!-- the model core -->
          <circle class="bwu-schematic-line bwu-schematic-line-main" cx="852" cy="310" r="86" fill="none"/>
          <circle class="bwu-schematic-node" cx="852" cy="310" r="10"/>
          <path class="bwu-schematic-pipe" d="M852 224V154M852 396V466M766 310H660M938 310H1044"/>
          <circle class="bwu-schematic-node" cx="852" cy="154" r="7"/>
          <circle class="bwu-schematic-node" cx="852" cy="466" r="7"/>
          <circle class="bwu-schematic-node" cx="1044" cy="310" r="7"/>
          <!-- measure lines -->
          <line class="bwu-schematic-measure" x1="120" y1="120" x2="404" y2="120"/>
          <line class="bwu-schematic-measure" x1="120" y1="110" x2="120" y2="130"/>
          <line class="bwu-schematic-measure" x1="404" y1="110" x2="404" y2="130"/>
          <line class="bwu-schematic-measure" x1="702" y1="120" x2="1002" y2="120"/>
          <line class="bwu-schematic-measure" x1="702" y1="110" x2="702" y2="130"/>
          <line class="bwu-schematic-measure" x1="1002" y1="110" x2="1002" y2="130"/>
        </g>
        <g class="bwu-schematic-copy">
          <text x="120" y="104">READ CODEBASE</text>
          <text x="120" y="430">FIX FLAW</text>
          <text x="702" y="104">FABLE 5 CORE / GUARDRAIL</text>
          <text x="540" y="300">GUARDRAIL BYPASS</text>
          <text x="724" y="500">MYTHOS CAPABILITY EXPOSED</text>
          <text x="690" y="582">REPLICATE / BYTEDANCE SEEDREAM / GENERATED FROM VIDEO CLICK</text>
        </g>
      </svg>
    `;
  }

  function hormuzChannelMapSvgWide(uid) {
    const safeUid = String(uid).replace(/[^a-z0-9_-]/gi, "-");
    const glowId = `bwu-channel-glow-${safeUid}`;
    const seaId = `bwu-channel-sea-${safeUid}`;
    const laneId = `bwu-channel-lanes-${safeUid}`;

    return `
      <svg class="bwu-channel-map-svg" viewBox="0 0 1280 720" role="img" aria-label="Live Fable ban channel state: directive, model status, market, and generated schematic layers">
        <defs>
          <radialGradient id="${seaId}" cx="52%" cy="48%" r="64%">
            <stop offset="0%" stop-color="rgba(70,40,28,0.46)"/>
            <stop offset="48%" stop-color="rgba(20,14,28,0.56)"/>
            <stop offset="100%" stop-color="rgba(4,4,10,0.92)"/>
          </radialGradient>
          <linearGradient id="${laneId}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="rgba(125,232,255,0)"/>
            <stop offset="42%" stop-color="rgba(125,232,255,0.72)"/>
            <stop offset="100%" stop-color="rgba(204,120,92,0.5)"/>
          </linearGradient>
          <filter id="${glowId}" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="3.4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="1280" height="720" fill="url(#${seaId})"/>
        <g class="bwu-channel-depth">
          <path d="M60 560C180 482 302 476 424 515C548 554 694 560 842 508C972 462 1070 470 1214 528"/>
          <path d="M58 605C228 530 354 542 486 584C638 632 762 620 914 564C1044 516 1134 526 1222 585"/>
          <path d="M136 160C274 218 386 218 528 162C666 108 810 96 958 144C1064 178 1138 178 1224 140"/>
          <path d="M96 230C246 294 380 280 518 222C672 158 826 154 962 210C1052 247 1140 252 1220 224"/>
        </g>
        <g class="bwu-channel-lanes" filter="url(#${glowId})">
          <path stroke="url(#${laneId})" d="M82 418C216 374 360 352 518 355C688 359 836 396 1004 365C1096 348 1164 318 1224 280"/>
          <path stroke="url(#${laneId})" d="M72 462C226 414 380 396 548 412C714 428 842 466 1018 430C1114 410 1182 374 1236 336"/>
          <path stroke="url(#${laneId})" d="M184 496C322 458 472 458 626 486C754 509 870 518 1000 486"/>
          <path stroke="url(#${laneId})" d="M356 294C486 330 648 326 776 286C920 240 1050 238 1208 288"/>
        </g>
        <g class="bwu-channel-vessels">
          <path class="bwu-channel-vessel bwu-channel-vessel-main" d="M766 413l40 14l-40 14l-19-14Z"/>
          <path class="bwu-channel-vessel" d="M444 355l26 9l-26 9l-13-9Z"/>
          <path class="bwu-channel-vessel" d="M942 366l28 10l-28 10l-13-10Z"/>
          <path class="bwu-channel-vessel" d="M603 484l26 9l-26 9l-13-9Z"/>
        </g>
        <g class="bwu-channel-pin" filter="url(#${glowId})">
          <line x1="785" y1="427" x2="730" y2="292"/>
          <circle cx="785" cy="427" r="12"/>
          <rect x="560" y="188" width="235" height="120" rx="8"/>
          <path d="M600 250H778M620 222H758M632 205V268M672 205V268M712 205V268M752 205V268"/>
          <text x="578" y="228">SEEDREAM SCHEMATIC</text>
          <text x="578" y="285">FABLE 5 · GENERATED LAYER</text>
        </g>
        <g class="bwu-channel-pulses">
          <circle cx="785" cy="427" r="18"/>
          <circle cx="1035" cy="245" r="14"/>
          <circle cx="612" cy="150" r="11"/>
        </g>
      </svg>
    `;
  }

  function buildHtml(uid, contactEmail, appUrl) {
    const iranCards = IRAN_MARKETS.map((m, i) => `
      <div class="bwu-market" data-bwu-market="${i}">
        <div class="bwu-market-q">${escapeHtml(m.q)}</div>
        <div class="bwu-market-odds">
          <span class="bwu-market-side bwu-market-yes">YES</span>
          <span class="bwu-market-num" data-bwu-market-num>${m.yes}¢</span>
          <span class="bwu-market-tick" data-bwu-market-tick></span>
        </div>
      </div>
    `).join("");

    const tickerRows = OIL_TICKER.map((t, i) => `
      <div class="bwu-tick-row" data-bwu-tick="${i}">
        <span class="bwu-tick-sym">${escapeHtml(t.sym)}</span>
        <span class="bwu-tick-price" data-bwu-tick-price>${t.base.toFixed(2)}</span>
        <span class="bwu-tick-delta" data-bwu-tick-delta>+0.00%</span>
      </div>
    `).join("");

    const tankerIdRows = TANKER.id.map((row) => `
      <div class="bwu-hud-row">
        <span class="bwu-hud-k">${escapeHtml(row.k)}</span>
        <span class="bwu-hud-v">${escapeHtml(row.v)}</span>
      </div>
    `).join("");

    const tankerCargoRows = TANKER.cargo.map((row) => `
      <div class="bwu-hud-row">
        <span class="bwu-hud-k">${escapeHtml(row.k)}</span>
        <span class="bwu-hud-v">${escapeHtml(row.v)}</span>
      </div>
    `).join("");

    const t = TANKER.telemetry;
    const tankerTelemetryRows = `
      <div class="bwu-hud-row">
        <span class="bwu-hud-k">${escapeHtml(t.lat.label)}</span>
        <span class="bwu-hud-v">${escapeHtml(t.lat.value)}</span>
      </div>
      <div class="bwu-hud-row">
        <span class="bwu-hud-k">${escapeHtml(t.lon.label)}</span>
        <span class="bwu-hud-v" data-bwu-tanker-lon>${t.lon.fromVal.toFixed(t.lon.fixed)}${escapeHtml(t.lon.suffix)}</span>
      </div>
      <div class="bwu-hud-row">
        <span class="bwu-hud-k">${escapeHtml(t.speed.label)}</span>
        <span class="bwu-hud-v" data-bwu-tanker-speed>${t.speed.fromVal.toFixed(t.speed.fixed)}${escapeHtml(t.speed.suffix)}</span>
      </div>
      <div class="bwu-hud-row">
        <span class="bwu-hud-k">${escapeHtml(t.heading.label)}</span>
        <span class="bwu-hud-v">${escapeHtml(t.heading.value)}</span>
      </div>
      <div class="bwu-hud-row">
        <span class="bwu-hud-k">${escapeHtml(t.draft.label)}</span>
        <span class="bwu-hud-v">${escapeHtml(t.draft.value)}</span>
      </div>
    `;
    const schematicSvgMarkup = tankerSchematicSvg(uid);
    const schematicAsset = appUrl(SCHEMATIC_ASSET);
    const channelMapMarkup = hormuzChannelMapSvgWide(uid);
    const channelMetricRows = HORMUZ_CHANNEL.metrics.map((row, i) => `
      <div class="bwu-channel-metric" data-bwu-channel-metric="${i}">
        <span class="bwu-channel-metric-k">${escapeHtml(row.k)}</span>
        <strong>${escapeHtml(row.v)}</strong>
        <span class="bwu-channel-metric-s">${escapeHtml(row.s)}</span>
      </div>
    `).join("");
    const channelLayerChips = HORMUZ_CHANNEL.layers.map((layer, i) => `
      <span class="bwu-channel-layer" data-bwu-channel-layer="${i}">${escapeHtml(layer)}</span>
    `).join("");

    const brandMark = appUrl("brand/katechon-mark.svg");
    const brandWordmark = appUrl("brand/katechon-wordmark.svg");

    return `<div class="bwu-root is-brand-intro" ${ROOT_ATTR}="${uid}" data-bwu-scene="iran">
      <div class="bwu-brand bwu-brand-intro" data-bwu-brand-intro>
        <img class="bwu-brand-mark" src="${escapeHtml(brandMark)}" alt="">
        <img class="bwu-brand-wordmark" src="${escapeHtml(brandWordmark)}" alt="Katechon">
        <div class="bwu-brand-line">Realtime generated channels</div>
      </div>

      <div class="bwu-brand bwu-brand-outro" data-bwu-brand-outro>
        <img class="bwu-brand-mark" src="${escapeHtml(brandMark)}" alt="">
        <img class="bwu-brand-wordmark" src="${escapeHtml(brandWordmark)}" alt="Katechon">
        <div class="bwu-brand-line">Build with us</div>
      </div>

      <!-- Scene 1: Directive -->
      <div class="bwu-scene bwu-scene-iran" data-bwu-scene-el="iran">
        <video class="bwu-video" data-bwu-video="iran"
          src="${escapeHtml(videoSrc(appUrl, 'directive.mp4'))}"
          muted playsinline autoplay loop preload="auto"></video>
        <div class="bwu-video-grad"></div>

        <div class="bwu-headline" data-bwu-headline="iran">
          <span class="bwu-headline-pill">BREAKING</span>
          <span class="bwu-headline-text">${escapeHtml(IRAN_HEADLINE.replace(/^BREAKING ·\s*/, ""))}</span>
        </div>

        <div class="bwu-scene-head">
          <span class="bwu-channel">KATECHON / DIRECTIVE</span>
          <span class="bwu-status">live</span>
        </div>
        <div class="bwu-scene-tag">Export-control order · models · markets · live</div>

        <div class="bwu-feed" data-bwu-feed="iran">
          <div class="bwu-feed-head">
            <span>SIGNAL LOG · DIRECTIVE DESK</span>
            <span class="bwu-feed-dot"></span>
          </div>
          ${feedRows(IRAN_FEED, "iran")}
        </div>

        <div class="bwu-markets">${iranCards}</div>
      </div>

      <!-- Scene 2: Models offline -->
      <div class="bwu-scene bwu-scene-strait" data-bwu-scene-el="strait">
        <video class="bwu-video" data-bwu-video="strait"
          data-bwu-src="${escapeHtml(videoSrc(appUrl, 'models-offline.mp4'))}"
          muted playsinline loop preload="metadata"></video>
        <div class="bwu-video-grad"></div>

        <div class="bwu-headline" data-bwu-headline="strait">
          <span class="bwu-headline-pill">BREAKING</span>
          <span class="bwu-headline-text">${escapeHtml(HORMUZ_HEADLINE.replace(/^BREAKING ·\s*/, ""))}</span>
        </div>

        <div class="bwu-scene-head">
          <span class="bwu-channel">KATECHON / MODELS</span>
          <span class="bwu-status">live</span>
        </div>
        <div class="bwu-scene-tag">Model status · access policy · restore odds</div>

        <div class="bwu-feed" data-bwu-feed="strait">
          <div class="bwu-feed-head">
            <span>SIGNAL LOG · MODEL DESK</span>
            <span class="bwu-feed-dot"></span>
          </div>
          ${feedRows(HORMUZ_FEED, "strait")}
        </div>

        <div class="bwu-ticker">
          <div class="bwu-ticker-rows">${tickerRows}</div>
          <div class="bwu-market bwu-market-strait" data-bwu-strait-market>
            <div class="bwu-market-q">${escapeHtml(STRAIT_MARKET.q)}</div>
            <div class="bwu-market-odds">
              <span class="bwu-market-side bwu-market-yes">YES</span>
              <span class="bwu-market-num" data-bwu-strait-num>${STRAIT_MARKET.yes}¢</span>
              <span class="bwu-market-tick" data-bwu-strait-tick></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Scene 3: Jailbreak deep dive -->
      <div class="bwu-scene bwu-scene-tanker" data-bwu-scene-el="tanker">
        <video class="bwu-video" data-bwu-video="tanker"
          data-bwu-src="${escapeHtml(videoSrc(appUrl, 'jailbreak.mp4'))}"
          muted playsinline loop preload="metadata"></video>
        <div class="bwu-video-grad"></div>

        <div class="bwu-headline" data-bwu-headline="tanker">
          <span class="bwu-headline-pill">EXPLOIT</span>
          <span class="bwu-headline-text">${escapeHtml(TANKER.headline)}</span>
        </div>

        <div class="bwu-scene-head">
          <span class="bwu-channel">KATECHON / EXPLOIT</span>
          <span class="bwu-status">live · trace</span>
        </div>
        <div class="bwu-scene-tag">Jailbreak deep-dive · the exploit · the players · the stakes</div>

        <div class="bwu-hud bwu-hud-id" data-bwu-hud="id">
          <div class="bwu-hud-title">THE EXPLOIT</div>
          ${tankerIdRows}
        </div>

        <div class="bwu-hud bwu-hud-cargo" data-bwu-hud="cargo">
          <div class="bwu-hud-title">THE PLAYERS</div>
          ${tankerCargoRows}
        </div>

        <div class="bwu-hud bwu-hud-telemetry" data-bwu-hud="telemetry">
          <div class="bwu-hud-title">THE STAKES</div>
          ${tankerTelemetryRows}
        </div>

        <div class="bwu-hud-targeting" data-bwu-hud="targeting">
          <div class="bwu-hud-crosshair"></div>
          <div class="bwu-hud-target">GUARDRAIL BYPASS · FABLE 5</div>
        </div>

        <button class="bwu-video-click-target" data-bwu-tanker-click type="button" aria-label="Generate jailbreak schematic with ByteDance Seedream">
          <span class="bwu-click-ring"></span>
          <span class="bwu-click-copy">GENERATE SCHEMATIC</span>
        </button>
      </div>

      <!-- Scene 4: Replicate + ByteDance Seedream schematic -->
      <div class="bwu-scene bwu-scene-schematic" data-bwu-scene-el="schematic">
        <video class="bwu-video bwu-schematic-video" data-bwu-video="schematic"
          data-bwu-src="${escapeHtml(videoSrc(appUrl, 'jailbreak.mp4'))}"
          muted playsinline loop preload="metadata"></video>
        <div class="bwu-video-grad bwu-schematic-grad"></div>

        <div class="bwu-headline" data-bwu-headline="schematic">
          <span class="bwu-headline-pill">REPLICATE</span>
          <span class="bwu-headline-text">Seedream renders the jailbreak as a transparent schematic</span>
        </div>

        <div class="bwu-scene-head">
          <span class="bwu-channel">KATECHON / SEEDREAM</span>
          <span class="bwu-status">live · image</span>
        </div>
        <div class="bwu-scene-tag">Video click · Replicate</div>

        <div class="bwu-schematic-click">
          <span class="bwu-schematic-click-dot"></span>
          <span>video click captured</span>
        </div>

        <div class="bwu-schematic-workspace">
          <div class="bwu-schematic-board">
            <div class="bwu-schematic-board-head">
              <span>FABLE 5 JAILBREAK / EXPLOIT TECHNICAL DIAGRAM</span>
              <span data-bwu-schematic-state>generating</span>
            </div>
            <div class="bwu-schematic-diagram">
              <img class="bwu-schematic-image" data-bwu-schematic-img
                src="${escapeHtml(schematicAsset)}"
                alt="Seedream-generated transparent technical schematic of the Fable 5 jailbreak">
              ${schematicSvgMarkup}
            </div>
          </div>

          <div class="bwu-seedream-console">
            <div class="bwu-console-title">IMAGE GENERATION</div>
            <div class="bwu-console-row" data-bwu-console-row="1">
              <span>provider</span>
              <strong>Replicate</strong>
            </div>
            <div class="bwu-console-row" data-bwu-console-row="2">
              <span>model</span>
              <strong>${escapeHtml(SCHEMATIC_MODEL)}</strong>
            </div>
            <div class="bwu-console-row" data-bwu-console-row="3">
              <span>input</span>
              <strong>jailbreak.mp4 frame</strong>
            </div>
            <div class="bwu-console-row" data-bwu-console-row="4">
              <span>output</span>
              <strong>transparent schematic</strong>
            </div>
            <div class="bwu-console-progress">
              <span></span>
            </div>
            <div class="bwu-console-prompt">prompt: drafting-board jailbreak diagram, code repository graph feeding a model core, highlighted guardrail bypass path, precise cyan linework, no logos</div>
          </div>
        </div>
      </div>

      <!-- Scene 5: zoom back out to Fable ban live channel state -->
      <div class="bwu-scene bwu-scene-channel" data-bwu-scene-el="channel">
        <video class="bwu-video bwu-channel-video" data-bwu-video="channel"
          data-bwu-src="${escapeHtml(videoSrc(appUrl, 'directive.mp4'))}"
          muted playsinline loop preload="metadata"></video>
        <div class="bwu-video-grad bwu-channel-grad"></div>

        <div class="bwu-headline" data-bwu-headline="channel">
          <span class="bwu-headline-pill">LIVE STATE</span>
          <span class="bwu-headline-text">${escapeHtml(HORMUZ_CHANNEL.headline)}</span>
        </div>

        <div class="bwu-scene-head">
          <span class="bwu-channel">KATECHON / FABLE BAN CHANNEL</span>
          <span class="bwu-status">live · bound</span>
        </div>
        <div class="bwu-scene-tag">directive · model status · jailbreak · market · model output</div>

        <div class="bwu-channel-hero">
          <div class="bwu-channel-map" data-bwu-channel-map>
            ${channelMapMarkup}
          </div>
          <div class="bwu-channel-summary">
            <div class="bwu-channel-summary-head">
              <span>FABLE BAN CHANNEL / LIVE STATE</span>
              <span>ready</span>
            </div>
            <div class="bwu-channel-metrics">
              ${channelMetricRows}
            </div>
            <div class="bwu-channel-layers">
              ${channelLayerChips}
            </div>
          </div>
        </div>
      </div>

      <!-- Scene 6: clean closing video -->
      <div class="bwu-scene bwu-scene-night" data-bwu-scene-el="night">
        <video class="bwu-video bwu-night-video" data-bwu-video="night"
          data-bwu-src="${escapeHtml(videoSrc(appUrl, NIGHT_VIDEO_FILE))}"
          muted playsinline loop preload="metadata"></video>
        <div class="bwu-night-vignette"></div>
      </div>

      <div class="bwu-globe-panel" data-bwu-globe-panel>
        <div class="bwu-globe-frame">
          <div class="bwu-globe" data-bwu-globe></div>
          <div class="bwu-globe-fallback" data-bwu-globe-fallback>
            <span class="bwu-globe-meridian bwu-globe-meridian-a"></span>
            <span class="bwu-globe-meridian bwu-globe-meridian-b"></span>
            <span class="bwu-globe-lat bwu-globe-lat-a"></span>
            <span class="bwu-globe-lat bwu-globe-lat-b"></span>
            <span class="bwu-globe-dot bwu-globe-dot-iran"></span>
            <span class="bwu-globe-dot bwu-globe-dot-hormuz"></span>
            <span class="bwu-globe-dot bwu-globe-dot-artemis"></span>
          </div>
        </div>
        <div class="bwu-globe-caption">
          <span class="bwu-globe-kicker" data-bwu-globe-kicker>${escapeHtml(GLOBE_FRAMES.iran.kicker)}</span>
          <span class="bwu-globe-label" data-bwu-globe-label>${escapeHtml(GLOBE_FRAMES.iran.label)}</span>
          <span class="bwu-globe-detail" data-bwu-globe-detail>${escapeHtml(GLOBE_FRAMES.iran.detail)}</span>
        </div>
      </div>

      <div class="bwu-blackout" data-bwu-blackout></div>

      <div class="bwu-cut" data-bwu-cut>
        <div class="bwu-cut-line">${escapeHtml(contactEmail)}</div>
      </div>
    </div>`;
  }

  function postParent(payload) {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(payload, window.location.origin);
      } catch (_) {}
    }
  }

  function loadGlobeLibrary() {
    if (window.Globe) return Promise.resolve(window.Globe);
    if (window.__bwuGlobeLibPromise) return window.__bwuGlobeLibPromise;

    window.__bwuGlobeLibPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector("script[data-bwu-globe-lib]");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.Globe), { once: true });
        existing.addEventListener("error", () => reject(new Error("globe.gl failed to load")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = GLOBE_LIB_URL;
      script.async = true;
      script.dataset.bwuGlobeLib = "1";
      script.onload = () => {
        if (window.Globe) resolve(window.Globe);
        else reject(new Error("globe.gl loaded without a Globe global"));
      };
      script.onerror = () => {
        window.__bwuGlobeLibPromise = null;
        reject(new Error("globe.gl failed to load"));
      };
      document.head.appendChild(script);
    });

    return window.__bwuGlobeLibPromise;
  }

  function browserSupportsWebGl() {
    try {
      const canvas = document.createElement("canvas");
      return Boolean(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") ||
          canvas.getContext("webgl") ||
          canvas.getContext("experimental-webgl"))
      );
    } catch (_) {
      return false;
    }
  }

  function setGlobeFrame(root, state, frameId, durationMs = 0) {
    const frame = GLOBE_FRAMES[frameId] || GLOBE_FRAMES.iran;
    root.dataset.bwuGlobeFrame = frameId;
    state.globeFrame = frameId;

    const kicker = root.querySelector("[data-bwu-globe-kicker]");
    const label = root.querySelector("[data-bwu-globe-label]");
    const detail = root.querySelector("[data-bwu-globe-detail]");
    if (kicker) kicker.textContent = frame.kicker;
    if (label) label.textContent = frame.label;
    if (detail) detail.textContent = frame.detail;

    if (state.globeController) state.globeController.setFrame(frameId, durationMs);
  }

  function createGlobeInstance(GlobeCtor, container) {
    const config = {
      rendererConfig: { antialias: true, alpha: true },
      waitForGlobeReady: false,
      animateIn: false,
    };

    try {
      return GlobeCtor(config)(container);
    } catch (err) {
      container.replaceChildren();
      if (/webgl|context/i.test(err?.message || "")) throw err;
      return new GlobeCtor(container, config);
    }
  }

  function activeGlobePoints(frame) {
    const allowed = new Set(frame.points);
    return GLOBE_POINTS.filter((point) => allowed.has(point.id));
  }

  function activeGlobeRings(frame) {
    const allowed = new Set(frame.rings);
    return GLOBE_POINTS
      .filter((point) => allowed.has(point.id))
      .map((point) => ({
        ...point,
        ringColor: point.id === "world"
          ? ["rgba(255, 75, 62, 0.8)", "rgba(255, 75, 62, 0)"]
          : ["rgba(125, 232, 255, 0.5)", "rgba(125, 232, 255, 0)"],
        ringRadius: point.id === "world" ? 4.2 : 3.4,
        ringSpeed: point.id === "world" ? 0.9 : 0.9,
        ringRepeat: point.id === "world" ? 1100 : 1300,
      }));
  }

  function hydrateGlobe(root, state) {
    const panel = root.querySelector("[data-bwu-globe-panel]");
    const container = root.querySelector("[data-bwu-globe]");
    if (!panel || !container) return;

    setGlobeFrame(root, state, "iran", 0);

    if (!browserSupportsWebGl()) {
      root.classList.add("is-globe-fallback");
      return;
    }

    loadGlobeLibrary()
      .then((GlobeCtor) => {
        if (window.__bwuState !== state) return;

        const globe = createGlobeInstance(GlobeCtor, container);
        state.globe = globe;
        root.classList.add("is-globe-ready");

        const material = typeof globe.globeMaterial === "function" ? globe.globeMaterial() : null;
        if (material) {
          if (material.color && typeof material.color.set === "function") material.color.set(0x1a1622);
          if (material.emissive && typeof material.emissive.set === "function") material.emissive.set(0x0a0710);
          material.transparent = true;
          material.opacity = 0.22;
          material.depthWrite = false;
          material.shininess = 4;
          material.needsUpdate = true;
        }

        globe
          .backgroundColor("rgba(0,0,0,0)")
          .showAtmosphere(true)
          .atmosphereColor("#cc785c")
          .atmosphereAltitude(0.18)
          .showGraticules(true)
          .pointLat("lat")
          .pointLng("lng")
          .pointColor("color")
          .pointRadius("radius")
          .pointAltitude("altitude")
          .pointResolution(24)
          .pointsTransitionDuration(520)
          .labelLat("lat")
          .labelLng("lng")
          .labelText((point) => (point.id === "world" ? "" : point.label))
          .labelColor((point) => point.color)
          .labelAltitude((point) => Math.max(point.altitude, 0.018))
          .labelSize(0.52)
          .labelDotRadius(0.05)
          .labelResolution(2)
          .ringLat("lat")
          .ringLng("lng")
          .ringAltitude(0.006)
          .ringColor("ringColor")
          .ringMaxRadius("ringRadius")
          .ringPropagationSpeed("ringSpeed")
          .ringRepeatPeriod("ringRepeat")
          .enablePointerInteraction(false);

        const controls = typeof globe.controls === "function" ? globe.controls() : null;
        if (controls) {
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.24;
          controls.enableZoom = false;
          controls.enablePan = false;
          controls.rotateSpeed = 0.16;
        }

        function resize() {
          const rect = panel.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          globe.width(Math.round(rect.width));
          globe.height(Math.round(rect.width));
        }

        let resizeObserver = null;
        if (window.ResizeObserver) {
          resizeObserver = new ResizeObserver(resize);
          resizeObserver.observe(panel);
        } else {
          window.addEventListener("resize", resize);
        }

        state.cleanups.push(() => {
          if (resizeObserver) resizeObserver.disconnect();
          else window.removeEventListener("resize", resize);
          try { globe.pauseAnimation?.(); } catch (_) {}
          container.replaceChildren();
        });

        state.globeController = {
          setFrame(frameId, durationMs = 0) {
            const frame = GLOBE_FRAMES[frameId] || GLOBE_FRAMES.iran;
            const points = activeGlobePoints(frame);
            globe.pointsData(points);
            globe.labelsData(points);
            globe.ringsData(activeGlobeRings(frame));
            globe.pointOfView(frame.pov, durationMs);
          },
        };

        resize();
        state.globeController.setFrame(state.globeFrame || "iran", 0);
      })
      .catch((err) => {
        console.warn("[mb] globe overlay using fallback:", err);
        root.classList.add("is-globe-fallback");
      });
  }

  function cancelPrevious() {
    const prev = window.__bwuState;
    if (!prev) return;
    if (Array.isArray(prev.timers)) prev.timers.forEach((id) => clearTimeout(id));
    if (Array.isArray(prev.intervals)) prev.intervals.forEach((id) => clearInterval(id));
    if (Array.isArray(prev.cleanups)) prev.cleanups.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
    window.__bwuState = null;
    postParent({ type: "seed-channel-brand", active: false });
  }

  // Fetch one line's ElevenLabs audio with the right voice. Narrator uses the
  // external George voice; Kat uses the default companion voice. Returns the
  // base64 audio string or "" — never throws.
  function fetchLineAudio(appUrl, line, idx) {
    const id = `${NARRATION_ID}-${line.who}-${idx}-${Date.now()}`;
    const body = { text: line.text, id };
    if (line.who === "narrator") body.voice = "narrator";
    return fetch(appUrl("/api/speak"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => ({ ...line, id, audio: (payload && payload.audio) || "" }))
      .catch((err) => {
        console.warn(`[mb] /api/speak failed (${line.who}):`, err);
        return { ...line, id, audio: "" };
      });
  }

  // Dispatch all voice lines in parallel (no line waits on another). Resolves
  // to the SCRIPT array enriched with id + base64 audio per line.
  function preloadVoices(appUrl) {
    return Promise.all(SCRIPT.map((line, i) => fetchLineAudio(appUrl, line, i)))
      .catch(() => SCRIPT.map((line, i) => ({ ...line, id: `${NARRATION_ID}-${i}`, audio: "" })));
  }

  function tickOdds(node, target, ms) {
    if (!node) return null;
    const start = parseFloat((node.textContent || "0").replace(/[^\d.]/g, "")) || 0;
    const t0 = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / ms);
      const eased = 1 - Math.pow(1 - t, 2);
      const v = start + (target - start) * eased;
      node.textContent = `${Math.round(v)}¢`;
      if (t >= 1) clearInterval(id);
    }, 100);
    return id;
  }

  function tickPrice(row, base, spikePct, ms) {
    const priceNode = row.querySelector("[data-bwu-tick-price]");
    const deltaNode = row.querySelector("[data-bwu-tick-delta]");
    if (!priceNode || !deltaNode) return null;
    const t0 = Date.now();
    const target = base * (1 + spikePct / 100);
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - t0) / ms);
      const eased = 1 - Math.pow(1 - t, 2.4);
      const v = base + (target - base) * eased;
      const pct = ((v / base) - 1) * 100;
      priceNode.textContent = v.toFixed(2);
      deltaNode.textContent = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
      deltaNode.classList.toggle("is-up", pct >= 0);
      if (t >= 1) clearInterval(id);
    }, 110);
    return id;
  }

  function hydrate(uid, appUrl) {
    const root = document.querySelector(`[${ROOT_ATTR}="${uid}"]`);
    if (!root) return;
    cancelPrevious();

    const state = { timers: [], intervals: [], cleanups: [], uid, started: false };
    window.__bwuState = state;
    const FALLBACK = videoFallback(appUrl);

    function schedule(delayMs, fn) {
      const id = setTimeout(() => {
        if (window.__bwuState !== state) return;
        try { fn(); } catch (err) { console.warn("[mb] step failed:", err); }
      }, delayMs);
      state.timers.push(id);
    }

    // Init music + clear any prior hard-cut. Music starts immediately;
    // the visual reel waits until ElevenLabs audio is ready.
    postParent({ type: "seed-channel-init" });
    postParent({ type: "seed-channel-brand", active: true });
    state.cleanups.push(() => postParent({ type: "seed-channel-brand", active: false }));

    // Wire video error fallbacks: if a freshly-baked clip errors, swap
    // in a Build With Us mp4 where one exists.
    root.querySelectorAll("[data-bwu-video]").forEach((vid) => {
      vid.addEventListener("error", () => {
        const source = vid.currentSrc || vid.getAttribute("src") || vid.dataset.bwuSrc || "";
        const cur = source.split("/").pop();
        const fallback = FALLBACK[cur];
        if (fallback && vid.dataset.bwuFallbackTried !== "1") {
          vid.dataset.bwuFallbackTried = "1";
          vid.src = fallback;
          vid.load();
          vid.play?.().catch(() => {});
        } else {
          vid.style.opacity = "0";
        }
      });
    });

    function ensureVideoSource(vid) {
      if (!vid) return "";
      const pending = vid.dataset.bwuSrc;
      if (pending && !vid.getAttribute("src")) vid.src = pending;
      vid.muted = true;
      vid.defaultMuted = true;
      vid.playsInline = true;
      vid.setAttribute("muted", "");
      vid.setAttribute("playsinline", "");
      vid.setAttribute("webkit-playsinline", "");
      return vid.currentSrc || vid.getAttribute("src") || "";
    }

    function primeVideo(vid, options = {}) {
      if (!vid) return;
      const src = ensureVideoSource(vid);
      if (!src) return;
      vid.preload = options.preload || "auto";
      if (!vid.readyState) {
        try { vid.load(); } catch (_) {}
      }
      if (options.play) {
        vid.play?.().catch(() => {});
      }
    }

    const sceneVideoMap = {
      iran: "iran",
      strait: "strait",
      tanker: "tanker",
      schematic: "schematic",
      channel: "channel",
      night: "night",
    };
    function playSceneVideo(scene) {
      const key = sceneVideoMap[scene || root.getAttribute("data-bwu-scene")];
      if (!key) return;
      primeVideo(root.querySelector(`[data-bwu-video="${key}"]`), { play: true });
    }

    function prebufferLaterVideos() {
      [straitVideo, tankerVideo, schematicVideo, channelVideo, nightVideo].forEach((vid, index) => {
        schedule(220 + index * 360, () => primeVideo(vid, { preload: "auto" }));
      });
    }

    function resumeActiveVideo() {
      if (document.visibilityState === "hidden") return;
      playSceneVideo(root.getAttribute("data-bwu-scene"));
    }

    // Kick the first video immediately so the establishing shot plays
    // while we wait for narration audio.
    const iranVideo = root.querySelector('[data-bwu-video="iran"]');
    primeVideo(iranVideo, { play: true });
    // Pre-buffer the later videos so each scene swap is instant.
    const straitVideo = root.querySelector('[data-bwu-video="strait"]');
    const tankerVideo = root.querySelector('[data-bwu-video="tanker"]');
    const schematicVideo = root.querySelector('[data-bwu-video="schematic"]');
    const channelVideo = root.querySelector('[data-bwu-video="channel"]');
    const nightVideo = root.querySelector('[data-bwu-video="night"]');
    prebufferLaterVideos();
    document.addEventListener("visibilitychange", resumeActiveVideo);
    window.addEventListener("pageshow", resumeActiveVideo);
    state.cleanups.push(() => {
      document.removeEventListener("visibilitychange", resumeActiveVideo);
      window.removeEventListener("pageshow", resumeActiveVideo);
    });

    const schematicImg = root.querySelector("[data-bwu-schematic-img]");
    if (schematicImg) {
      schematicImg.addEventListener("load", () => root.classList.add("has-schematic-asset"), { once: true });
      schematicImg.addEventListener("error", () => {
        schematicImg.hidden = true;
        root.classList.add("has-schematic-fallback");
      }, { once: true });
    }

    hydrateGlobe(root, state);

    // Stagger feed-row reveals once a scene is on screen.
    function revealFeed(sceneId, baseDelay) {
      const rows = root.querySelectorAll(`[data-bwu-feed-row^="${sceneId}-"]`);
      rows.forEach((row, i) => {
        schedule(baseDelay + i * 320, () => row.classList.add("is-in"));
      });
    }

    function requestBuildTransition(nextScene) {
      const copy = BUILD_TRANSITIONS[nextScene];
      if (!copy) return;
      postParent({
        type: "seed-channel-build-transition",
        durationMs: SCENE_TRANSITION_MS,
        status: "GENERATING VIDEO",
        channelLabel: "VIDEO CHANNEL",
        ...copy,
      });
    }

    function setSchematicState(label) {
      const node = root.querySelector("[data-bwu-schematic-state]");
      if (node) node.textContent = label;
    }

    function showSchematicScene() {
      if (state.schematicShown) return;
      state.schematicShown = true;
      playSceneVideo("schematic");
      root.setAttribute("data-bwu-scene", "schematic");
      root.classList.add("is-generating-schematic");
      root.classList.remove("is-schematic-ready");
      setSchematicState("generating");
      root.querySelector('[data-bwu-headline="schematic"]')?.classList.add("is-in");
      schedule(SCHEMATIC_READY_MS, () => {
        root.classList.remove("is-generating-schematic");
        root.classList.add("is-schematic-ready");
        setSchematicState("ready");
      });
    }

    function showChannelScene() {
      if (state.channelShown) return;
      state.channelShown = true;
      root.classList.add("is-schematic-pinned");
      playSceneVideo("channel");
      root.setAttribute("data-bwu-scene", "channel");
      root.querySelector('[data-bwu-headline="channel"]')?.classList.add("is-in");
    }

    function triggerChannelState() {
      if (state.channelTriggered || state.channelShown) return;
      state.channelTriggered = true;
      root.classList.add("is-schematic-pinning");
      requestBuildTransition("channel");
      schedule(SCENE_TRANSITION_MS, showChannelScene);
    }

    function showNightScene() {
      if (state.nightShown) return;
      state.nightShown = true;
      playSceneVideo("night");
      root.classList.add("is-clean-closing");
      root.setAttribute("data-bwu-scene", "night");
    }

    function triggerNightScene() {
      if (state.nightTriggered || state.nightShown) return;
      state.nightTriggered = true;
      requestBuildTransition("night");
      schedule(SCENE_TRANSITION_MS, showNightScene);
    }

    function showBrandOutro() {
      if (state.brandOutroShown) return;
      state.brandOutroShown = true;
      root.classList.add("is-brand-outro");
      postParent({ type: "seed-channel-brand", active: true });
    }

    function triggerBrandOutro() {
      if (state.brandOutroTriggered || state.brandOutroShown) return;
      state.brandOutroTriggered = true;
      requestBuildTransition("outro");
      schedule(SCENE_TRANSITION_MS, showBrandOutro);
    }

    function triggerSchematic() {
      if (state.schematicTriggered || state.schematicShown) return;
      state.schematicTriggered = true;
      root.querySelector("[data-bwu-tanker-click]")?.classList.add("is-clicked");
      requestBuildTransition("schematic");
      schedule(SCENE_TRANSITION_MS, showSchematicScene);
    }

    root.querySelector("[data-bwu-tanker-click]")?.addEventListener("click", triggerSchematic);

    // Linearly animate a numeric HUD value from `from` to `to` over `ms`.
    function tickNumeric(node, from, to, ms, fixed, suffix) {
      if (!node) return null;
      const t0 = Date.now();
      const id = setInterval(() => {
        const t = Math.min(1, (Date.now() - t0) / ms);
        const eased = 1 - Math.pow(1 - t, 2);
        const v = from + (to - from) * eased;
        node.textContent = `${v.toFixed(fixed)}${suffix}`;
        if (t >= 1) clearInterval(id);
      }, 120);
      return id;
    }

    // Both voices play as in-frame audio so the capture always has both,
    // independent of the deck avatar's own audio path.
    function playLineAudio(audio) {
      if (!audio) return;
      try {
        const el = new Audio(`data:audio/mpeg;base64,${audio}`);
        el.preload = "auto";
        state.lineAudioEls = state.lineAudioEls || [];
        state.lineAudioEls.push(el);
        el.play().catch((e) => console.warn("[mb] line audio blocked:", e));
      } catch (_) {}
    }
    state.cleanups.push(() => {
      (state.lineAudioEls || []).forEach((el) => { try { el.pause(); } catch (_) {} });
      state.lineAudioEls = [];
    });

    function speakLine(line) {
      if (!line) return;
      const embedded = !!(window.parent && window.parent !== window);
      if (embedded) {
        // Host (deck / capture stage) owns Kat's avatar: hand it the full audio
        // so the avatar plays + lip-syncs. Narrator stays an in-frame VO.
        if (line.who === "kat") {
          postParent({
            type: "seed-channel-speak",
            id: line.id || `${NARRATION_ID}-kat-${Date.now()}`,
            text: line.text,
            audio: line.audio || "",
          });
        } else {
          playLineAudio(line.audio);
        }
        return;
      }
      // Standalone (no host avatar): play every line in-frame.
      playLineAudio(line.audio);
    }

    // ---- Start the reel once audio is ready (or after a max wait) ---------
    function startReel(voiceLines) {
      if (state.started) return;
      state.started = true;

      // Sequence the two-voice script across the reel timeline.
      const lines = Array.isArray(voiceLines) && voiceLines.length ? voiceLines : SCRIPT;
      lines.forEach((line) => schedule(Math.max(0, line.at || 0), () => speakLine(line)));

      // Directive market odds tick across the scene.
      schedule(400, () => {
        const cards = root.querySelectorAll("[data-bwu-market]");
        cards.forEach((card, i) => {
          const m = IRAN_MARKETS[i];
          if (!m) return;
          const num = card.querySelector("[data-bwu-market-num]");
          const tick = card.querySelector("[data-bwu-market-tick]");
          const intervalId = tickOdds(num, m.yes + m.drift, 3800);
          if (intervalId) state.intervals.push(intervalId);
          if (tick) {
            tick.textContent = `${m.drift >= 0 ? "+" : ""}${m.drift}`;
            tick.classList.toggle("is-up", m.drift >= 0);
          }
        });
      });

      // Directive feed + headline reveal.
      schedule(150, () => root.querySelector('[data-bwu-headline="iran"]')?.classList.add("is-in"));
      revealFeed("iran", 300);

      // ---- Directive -> Models offline ---------------------------------
      schedule(IRAN_TO_STRAIT_MS - SCENE_TRANSITION_LEAD_MS, () => requestBuildTransition("strait"));
      schedule(IRAN_TO_STRAIT_MS, () => {
        playSceneVideo("strait");
        root.setAttribute("data-bwu-scene", "strait");
        setGlobeFrame(root, state, "strait", 1200);
      });

      // Models-offline headline + feed reveal.
      schedule(5200, () => root.querySelector('[data-bwu-headline="strait"]')?.classList.add("is-in"));
      revealFeed("strait", 5350);

      // Status tape drops to offline once the scene is on screen.
      schedule(5600, () => {
        const rows = root.querySelectorAll("[data-bwu-tick]");
        rows.forEach((row, i) => {
          const t = OIL_TICKER[i];
          if (!t) return;
          const id = tickPrice(row, t.base, t.spike, 3600);
          if (id) state.intervals.push(id);
        });
        const straitNum = root.querySelector("[data-bwu-strait-num]");
        const straitTick = root.querySelector("[data-bwu-strait-tick]");
        const id = tickOdds(straitNum, STRAIT_MARKET.yes + STRAIT_MARKET.drift, 3600);
        if (id) state.intervals.push(id);
        if (straitTick) {
          straitTick.textContent = `${STRAIT_MARKET.drift >= 0 ? "+" : ""}${STRAIT_MARKET.drift}`;
          straitTick.classList.toggle("is-up", STRAIT_MARKET.drift >= 0);
        }
      });

      // ---- Models offline -> Jailbreak deep dive -----------------------
      schedule(STRAIT_TO_TANKER_MS - SCENE_TRANSITION_LEAD_MS, () => requestBuildTransition("tanker"));
      schedule(STRAIT_TO_TANKER_MS, () => {
        playSceneVideo("tanker");
        root.setAttribute("data-bwu-scene", "tanker");
        setGlobeFrame(root, state, "tanker", 1200);
      });

      // Jailbreak HUDs and headline fade in staggered.
      schedule(10300, () => root.querySelector('[data-bwu-headline="tanker"]')?.classList.add("is-in"));
      schedule(10500, () => root.querySelector('[data-bwu-hud="id"]')?.classList.add("is-in"));
      schedule(10750, () => root.querySelector('[data-bwu-hud="cargo"]')?.classList.add("is-in"));
      schedule(11000, () => root.querySelector('[data-bwu-hud="telemetry"]')?.classList.add("is-in"));
      schedule(11200, () => root.querySelector('[data-bwu-hud="targeting"]')?.classList.add("is-in"));

      // Stakes ticks (restore odds slide down, foreign access drops) over 3.5s.
      schedule(11200, () => {
        const tt = TANKER.telemetry;
        const lonNode = root.querySelector("[data-bwu-tanker-lon]");
        const speedNode = root.querySelector("[data-bwu-tanker-speed]");
        const lonId = tickNumeric(lonNode, tt.lon.fromVal, tt.lon.toVal, 3500, tt.lon.fixed, tt.lon.suffix);
        const speedId = tickNumeric(speedNode, tt.speed.fromVal, tt.speed.toVal, 3500, tt.speed.fixed, tt.speed.suffix);
        if (lonId) state.intervals.push(lonId);
        if (speedId) state.intervals.push(speedId);
      });

      // ---- Jailbreak click -> Seedream schematic ----------------------
      schedule(11800, () => root.querySelector("[data-bwu-tanker-click]")?.classList.add("is-visible"));
      schedule(TANKER_TO_SCHEMATIC_MS - SCENE_TRANSITION_MS, triggerSchematic);
      schedule(SCHEMATIC_TO_CHANNEL_MS - SCENE_TRANSITION_MS, triggerChannelState);
      schedule(CHANNEL_TO_NIGHT_MS - SCENE_TRANSITION_MS, triggerNightScene);
      schedule(BRAND_OUTRO_MS - SCENE_TRANSITION_MS, triggerBrandOutro);

      // The reel ends on the closer video, then resolves to the Katechon
      // brand card so captures have a clean outro without leaving this slide.
    }

    // Audio race: start when all voice lines resolve, or force-start after
    // AUDIO_WAIT_MAX_MS so the reel never hangs in silence.
    let audioResolved = false;
    let voiceLines = null;
    let brandIntroDone = false;
    function maybeStartReel() {
      if (!brandIntroDone || !audioResolved || state.started) return;
      startReel(voiceLines);
    }

    schedule(BRAND_INTRO_MS, () => {
      brandIntroDone = true;
      root.classList.remove("is-brand-intro");
      postParent({ type: "seed-channel-brand", active: false });
      maybeStartReel();
    });

    preloadVoices(appUrl).then((lines) => {
      audioResolved = true;
      voiceLines = lines;
      if (window.__bwuState !== state) return;
      maybeStartReel();
    });
    schedule(AUDIO_WAIT_MAX_MS, () => {
      if (audioResolved) return;
      console.warn("[mb] voice wait timed out; starting reel without ElevenLabs");
      audioResolved = true;
      voiceLines = null;
      maybeStartReel();
    });
  }

  window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
  window.KATECHON_DASHBOARD_RENDERERS["mythos-ban"] = function renderMythosBan(args) {
    const helpers = (args && args.helpers) || {};
    const appUrl = typeof helpers.appUrl === "function" ? helpers.appUrl : fallbackAppUrl;
    const uid = `mb-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
    setTimeout(() => hydrate(uid, appUrl), 0);
    return buildHtml(uid, "simon@katechon.technology", appUrl);
  };
})();
