    const APP_BASE_PATH = /^\/app(?:\/|$)/.test(window.location.pathname) ? "/app" : "";
    function appUrl(path) {
      if (!path) return path;
      if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) return path;
      const normalized = path.startsWith("/") ? path : `/${path}`;
      return `${APP_BASE_PATH}${normalized}`;
    }

    const dashboardParams = new URLSearchParams(location.search);
    const dashboardId = String(
      dashboardParams.get("dashboard") ||
      (location.pathname.match(/(?:^|\/)dashboards\/([^/]+)/) || [])[1] ||
      "world-monitor"
    ).toLowerCase().replace(/[^\w-]/g, "");
    const channelShareId = String(dashboardParams.get("channelShare") || dashboardParams.get("shareId") || dashboardParams.get("share") || "")
      .toLowerCase()
      .replace(/[^\w-]/g, "")
      .slice(0, 96);
    const initialPrompt = String(dashboardParams.get("prompt") || "").trim().slice(0, 700);
    const replayRequested = /^(1|true|yes)$/i.test(String(dashboardParams.get("replay") || ""));

    const catalog = window.KATECHON_DASHBOARD_CATALOG || { palettes: {}, dashboards: {} };
    const palettes = catalog.palettes || {};
    const dashboards = catalog.dashboards || {};

    const fallbackDashboard = dashboards["world-monitor"] || Object.values(dashboards)[0];
    if (!fallbackDashboard) throw new Error("No dashboard catalog entries loaded.");
    const baseConfig = dashboards[dashboardId] || fallbackDashboard;
    let config = { ...baseConfig };
    const baseChannelTitle = baseConfig.title || config.title || "Katechon";
    const identity = config.identity || {};
    document.body.dataset.dashboard = dashboardId;
    if (identity.className) document.body.classList.add(identity.className);
    const palette = palettes[config.palette] || palettes.acid;
    const generatedSlotNames = ["rail", "stageOverlay", "modal"];
    const blankDashboardMode = true;
    const state = {
      activeFeed: 0,
      tick: 0,
      metrics: normalizeMetrics(config.metrics),
      feed: config.feed.map((item) => [...item]),
      livePayload: null,
      liveLoading: false,
      generated: emptyGeneratedDashboard(),
      commandRunning: false,
      commandStatus: "",
      lastPrompt: config.primaryPrompt || "",
      currentShareId: channelShareId || "",
      headline: null,
      pitchMorph: null,
      pitchMorphNonce: 0,
    };
    const katTarget = {
      mode: false,
      selection: null,
      voicePointerId: null,
    };

    const animeApi = window.anime || {};
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canMotion = !reduceMotion && typeof animeApi.animate === "function";
    const stagger = (value, options) => typeof animeApi.stagger === "function" ? animeApi.stagger(value, options) : 0;
    const $ = (id) => document.getElementById(id);
    window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
    const customRenderers = window.KATECHON_DASHBOARD_RENDERERS;
    let dashboardRendered = false;
    let initialPromptRan = false;
    let replayStarted = false;
    const PITCH_MORPH_FRAMES = [
      {
        id: "founder-fit",
        topic: "founder-market fit",
        sentence: "Katechon is built by people who have already lived this market.",
        visual: "lineage",
        labels: ["Index Coop", "Ingonyama", "EPFL", "Katechon"],
        keywords: ["founder market fit", "founder", "builder", "simon", "index coop", "ingonyama", "epfl"],
      },
      {
        id: "inflection",
        topic: "AI software inflection",
        sentence: "AI has turned software from static pages into generated state.",
        visual: "firehose",
        labels: ["AI", "data", "code", "UI", "state"],
        keywords: ["ai software inflection", "inflection", "why now", "ai software", "generated state"],
      },
      {
        id: "state-not-pixels",
        topic: "state, not pixels",
        sentence: "Screenshots are the broken container for software state.",
        visual: "stateLoss",
        labels: ["screenshot", "video", "post", "state"],
        keywords: ["camera moment", "screenshot", "screenshots", "state not pixels", "broken container", "pixels"],
      },
      {
        id: "channel-object",
        topic: "live software channels",
        sentence: "A channel is a live object with data, agents, memory, and UI.",
        visual: "channelOrbit",
        labels: ["feed", "agent", "state", "surface", "memory", "share"],
        keywords: ["live software channel", "live software channels", "channel object", "what is a channel", "shared channel"],
      },
      {
        id: "kat-agents",
        topic: "Kat and specialist agents",
        sentence: "Kat routes intent to specialist agents that mutate the channel.",
        visual: "agentMesh",
        labels: ["planner", "data", "layout", "copy", "provenance", "share"],
        keywords: ["specialist agent", "specialist agents", "agent routing", "kat", "channel agents"],
      },
      {
        id: "discovery-graph",
        topic: "discovery graph",
        sentence: "Every generated state becomes a node in the software feed.",
        visual: "discoveryGraph",
        labels: ["watch", "command", "share", "fork", "act", "feed"],
        keywords: ["discovery graph", "software feed", "moat", "graph", "feed"],
      },
    ];
    const PITCH_MORPH_KEYWORDS = PITCH_MORPH_FRAMES.map((frame) => ({
      ...frame,
      normalizedKeywords: frame.keywords.map((keyword) => normalizeDunePitchText(keyword)),
    }));

    function animate(target, params) {
      if (!canMotion) return null;
      return animeApi.animate(target, params);
    }

    function normalizeDunePitchText(value) {
      return String(value || "")
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }

    function hasDunePitchIntent(normalized) {
      return /\b(?:generate|create|make|build|show|open|go|take)\b/.test(normalized) &&
        /\b(?:slide|frame|pitch)\b/.test(normalized);
    }

    function matchDunePitchMorph(prompt, options = {}) {
      if (dashboardId !== "dune-deck") return null;
      const normalized = normalizeDunePitchText(prompt);
      if (!normalized) return null;
      if (!options.allowTopicOnly && !hasDunePitchIntent(normalized)) return null;
      let best = null;
      let bestScore = 0;
      PITCH_MORPH_KEYWORDS.forEach((frame) => {
        const score = frame.normalizedKeywords.reduce((sum, keyword) => {
          if (!keyword || !normalized.includes(keyword)) return sum;
          return sum + Math.max(1, keyword.split(" ").length);
        }, 0);
        if (score > bestScore) {
          best = frame;
          bestScore = score;
        }
      });
      return best;
    }

    function isDunePitchMorphMessage(message) {
      if (dashboardId !== "dune-deck" || !message) return false;
      return message.type === "dune-generate-slide" ||
        message.type === "deck-generate-slide" ||
        message.type === "kat-deck-prompt";
    }

    function activateDunePitchMorph(prompt, options = {}) {
      const frame = matchDunePitchMorph(prompt, { allowTopicOnly: options.allowTopicOnly });
      if (!frame) return false;
      state.pitchMorph = frame;
      state.pitchMorphNonce += 1;
      state.lastPrompt = String(prompt || `generate a slide on ${frame.topic}`).trim();
      state.commandRunning = false;
      setCommandStatus(`morphed channel: ${frame.topic}`);
      render();
      return true;
    }

    function clearDunePitchMorph() {
      if (!state.pitchMorph) return;
      state.pitchMorph = null;
      const morph = $("pitch-morph");
      if (morph) {
        morph.hidden = true;
        morph.innerHTML = "";
        morph.removeAttribute("data-render-key");
      }
      document.body.classList.remove("pitch-morph-active");
      delete document.body.dataset.pitchMorph;
    }

    function loadStylesheet(href) {
      if (!href) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = appUrl(href);
      document.head.appendChild(link);
    }

    function loadScript(src) {
      if (!src) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = appUrl(src);
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Could not load dashboard identity script: ${src}`));
        document.head.appendChild(script);
      });
    }

    async function loadDashboardIdentity() {
      loadStylesheet(identity.css);
      if (identity.script) await loadScript(identity.script);
    }

    function applyDashboardCustomCss(css) {
      if (!css) return;
      let style = document.getElementById("dashboard-voice-override-css");
      if (!style) {
        style = document.createElement("style");
        style.id = "dashboard-voice-override-css";
        document.head.appendChild(style);
      }
      style.textContent = css;
    }

    function emptyGeneratedDashboard() {
      return {
        mode: "slot_overrides",
        view: "default",
        slots: Object.fromEntries(generatedSlotNames.map((slot) => [slot, []])),
        themeTokens: {},
        page: null,
      };
    }

    function normalizeGeneratedPage(raw) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
      const template = String(raw.layout?.template || raw.template || raw.view || "").replace(/[^\w-]/g, "");
      if (!template) return null;
      const stageRaw = raw.stage && typeof raw.stage === "object" && !Array.isArray(raw.stage) ? raw.stage : {};
      const thesisRaw = raw.thesis && typeof raw.thesis === "object" && !Array.isArray(raw.thesis) ? raw.thesis : {};
      const layoutRaw = raw.layout && typeof raw.layout === "object" && !Array.isArray(raw.layout) ? raw.layout : {};
      const themeRaw = raw.theme && typeof raw.theme === "object" && !Array.isArray(raw.theme) ? raw.theme : {};
      const stageComponents = Array.isArray(stageRaw.components) ? stageRaw.components.slice(0, 3) : [];
      const railComponents = Array.isArray(raw.rail) ? raw.rail.slice(0, 5) : [];
      const depthValue = Number.isFinite(Number(raw.depth)) ? Math.max(0, Math.floor(Number(raw.depth))) : 1;
      const ancestry = Array.isArray(raw.ancestry)
        ? raw.ancestry.filter((entry) => entry && typeof entry === "object").slice(0, 8).map((entry) => ({
            depth: Math.max(0, Math.floor(Number(entry.depth) || 0)),
            stateId: String(entry.stateId || "").slice(0, 80),
            label: String(entry.label || entry.title || `Depth ${entry.depth || 0}`).slice(0, 120),
            prompt: String(entry.prompt || "").slice(0, 220),
          }))
        : [];
      return {
        mode: "generated_page",
        channelId: String(raw.channelId || dashboardId).replace(/[^\w-]/g, ""),
        prompt: String(raw.prompt || "").trim().slice(0, 300),
        depth: depthValue,
        stateId: String(raw.stateId || "").slice(0, 80),
        parentStateId: String(raw.parentStateId || "").slice(0, 80),
        ancestry,
        theme: {
          density: String(themeRaw.density || "board").replace(/[^\w-]/g, ""),
          accent: String(themeRaw.accent || "channel").replace(/[^\w-]/g, ""),
          avatarMode: String(themeRaw.avatarMode || "docked").replace(/[^\w-]/g, ""),
        },
        layout: {
          template,
          stage: String(layoutRaw.stage || stageRaw.type || template).replace(/[^\w-]/g, ""),
          rail: String(layoutRaw.rail || "evidence_stack").replace(/[^\w-]/g, ""),
          actions: String(layoutRaw.actions || "fork_prompts").replace(/[^\w-]/g, ""),
        },
        thesis: {
          title: String(thesisRaw.title || raw.title || "").trim().slice(0, 120),
          summary: String(thesisRaw.summary || raw.summary || "").trim().slice(0, 320),
        },
        stage: {
          type: String(stageRaw.type || layoutRaw.stage || template).replace(/[^\w-]/g, ""),
          components: stageComponents,
        },
        rail: railComponents,
        actions: Array.isArray(raw.actions) ? raw.actions.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6) : [],
        provenance: Array.isArray(raw.provenance) ? raw.provenance.slice(0, 12) : [],
        sourceState: raw.sourceState && typeof raw.sourceState === "object" ? raw.sourceState : null,
      };
    }

    function normalizeGeneratedDashboard(raw) {
      const generated = emptyGeneratedDashboard();
      if (!raw || typeof raw !== "object") return generated;
      if (raw.view) generated.view = String(raw.view);
      const slots = raw.slots && typeof raw.slots === "object" ? raw.slots : {};
      generatedSlotNames.forEach(slot => {
        const max = slot === "modal" ? 1 : 4;
        generated.slots[slot] = Array.isArray(slots[slot]) ? slots[slot].slice(0, max) : [];
      });
      generated.themeTokens = raw.themeTokens && typeof raw.themeTokens === "object" ? raw.themeTokens : {};
      const page = normalizeGeneratedPage(raw.page || raw.generatedPage);
      if (page) {
        generated.mode = "generated_page";
        generated.view = page.layout.template || generated.view;
        generated.page = page;
      }
      return generated;
    }

    async function loadDashboardOverride() {
      try {
        const resp = await fetch(appUrl(`/api/dashboard-overrides/${encodeURIComponent(dashboardId)}`), { cache: "no-store" });
        if (!resp.ok) return;
        const payload = await resp.json();
        if (!payload.patch || typeof payload.patch !== "object") return;
        config = { ...baseConfig, ...payload.patch };
        state.metrics = normalizeMetrics(config.metrics);
        state.feed = Array.isArray(config.feed) ? config.feed.map((item) => [...item]) : [];
        state.activeFeed = 0;
        state.generated = normalizeGeneratedDashboard(payload.generated);
        applyDashboardCustomCss(payload.patch.customCss);
      } catch (_) {}
    }

    async function loadChannelShareObject() {
      if (!channelShareId) return;
      try {
        const resp = await fetch(appUrl(`/api/channel-shares/${encodeURIComponent(channelShareId)}`), { cache: "no-store" });
        if (!resp.ok) return;
        const payload = await resp.json();
        const share = payload.share || payload.object;
        if (!share || share.channelId !== dashboardId) return;
        document.body.dataset.channelShare = share.id || channelShareId;
        state.currentShareId = share.id || channelShareId;
        state.lastPrompt = share.prompt || state.lastPrompt;
        state.commandStatus = "share loaded";
        if (share.patch && typeof share.patch === "object") config = { ...config, ...share.patch };
        if (share.headline && !config.title) config.title = share.headline;
        if (Array.isArray(share.metrics) && share.metrics.length) state.metrics = normalizeMetrics(share.metrics);
        if (Array.isArray(share.feed) && share.feed.length) state.feed = share.feed.map((item) => Array.isArray(item) ? [...item] : item);
        state.activeFeed = 0;
        state.generated = normalizeGeneratedDashboard(share.generated || { page: share.generatedPage, slots: share.surfaces });
        applyDashboardCustomCss(share.patch?.customCss);
        if (replayRequested) trackLaunchEvent("share_replayed", { shareId: state.currentShareId, source: "share-load" });
      } catch (_) {}
    }

    function setTheme() {
      document.documentElement.style.setProperty("--accent", palette[0]);
      document.documentElement.style.setProperty("--accent2", palette[1]);
      document.documentElement.style.setProperty("--accent3", palette[2]);
      Object.entries(state.generated.themeTokens || {}).forEach(([key, value]) => {
        if (["accent", "accent2", "accent3"].includes(key) && /^#[0-9a-f]{3,6}$/i.test(String(value))) {
          document.documentElement.style.setProperty(`--${key}`, value);
        }
      });
      document.documentElement.style.setProperty("--bg0", palette[3]);
      document.documentElement.style.setProperty("--bg1", palette[4]);
    }

    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char]);
    }

    function normalizeMetrics(metrics) {
      return (Array.isArray(metrics) ? metrics : [])
        .slice(0, 3)
        .map((item) => Array.isArray(item)
          ? [item[0] ?? "", item[1] ?? "", item[2] ?? ""]
          : [item ?? "", "", ""]);
    }

    function visibleMetrics() {
      return state.metrics.slice(0, 3);
    }

    function activeGeneratedPage() {
      return state.generated?.mode === "generated_page" && state.generated.page
        ? state.generated.page
        : null;
    }

    function commandPrompts() {
      const page = activeGeneratedPage();
      const heroPrompts = Array.isArray(config.heroPrompts) ? config.heroPrompts : [];
      const pagePrompts = Array.isArray(page?.actions) ? page.actions : [];
      const primary = config.primaryPrompt ? [config.primaryPrompt] : [];
      return Array.from(new Set([...heroPrompts, ...pagePrompts, ...primary].filter(Boolean))).slice(0, 6);
    }

    function setCommandStatus(message) {
      state.commandStatus = message || "";
      const status = $("command-status");
      if (status) status.textContent = state.commandStatus;
      const tickerLine = $("narration-line");
      const ticker = $("narration-ticker");
      if (tickerLine && ticker) {
        if (state.commandStatus) {
          ticker.hidden = false;
          tickerLine.textContent = state.commandStatus;
          ticker.classList.toggle("has-update", state.commandRunning || /(generated|building|replaying|restoring|share)/i.test(state.commandStatus));
        }
      }
    }

    async function copyText(value) {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        return true;
      }
      return false;
    }

    function trackLaunchEvent(type, detail = {}) {
      fetch(appUrl("/api/launch-events"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          channelId: dashboardId,
          sessionId: `prototype-${dashboardId}`,
          shareId: state.currentShareId || channelShareId || "",
          prompt: detail.prompt || state.lastPrompt || "",
          source: detail.source || "prototype-dashboard",
          detail,
        }),
      }).catch(() => {});
    }

    function applyChannelTurnPayload(payload) {
      if (!payload || typeof payload !== "object") return;
      const patch = payload.update?.patch || {};
      if (patch && typeof patch === "object") {
        config = { ...config, ...patch };
        state.metrics = normalizeMetrics(config.metrics);
        state.feed = Array.isArray(config.feed) ? config.feed.map((item) => Array.isArray(item) ? [...item] : item) : state.feed;
      }
      if (payload.generated) state.generated = normalizeGeneratedDashboard(payload.generated);
      applyDynamicHeadline(payload.state?.headline || payload.update?.headline || (patch.title ? { title: patch.title } : null), { force: true });
      state.activeFeed = 0;
      if (payload.narration) state.commandStatus = payload.narration;
    }

    function applyDynamicHeadline(headline, options = {}) {
      const title = String(headline?.title || "").replace(/\s+/g, " ").trim().slice(0, 80);
      if (!title) return false;
      const sameTitle = state.headline?.title === title;
      state.headline = { ...(headline || {}), title };
      if (sameTitle && !options.force) return false;
      config = { ...config, title };
      const page = activeGeneratedPage();
      if (page?.thesis) page.thesis.title = title;
      document.title = `${title} - Katechon`;
      const titleNode = $("title");
      if (titleNode) titleNode.textContent = title;
      return true;
    }

    function serializeKatTarget(target) {
      if (!target || typeof target !== "object") return null;
      return {
        id: String(target.id || "").slice(0, 80),
        kind: String(target.kind || "dashboard region").slice(0, 80),
        label: String(target.label || "Dashboard region").slice(0, 140),
        value: String(target.value || "").slice(0, 140),
        note: String(target.note || "").slice(0, 180),
      };
    }

    function targetInstructionText(prompt, target) {
      const cleanPrompt = String(prompt || "").trim();
      const cleanTarget = serializeKatTarget(target);
      if (!cleanTarget) return cleanPrompt;
      const parts = [
        `Selected dashboard target: ${cleanTarget.label}`,
        cleanTarget.value ? `value: ${cleanTarget.value}` : "",
        cleanTarget.note ? `context: ${cleanTarget.note}` : "",
        `target kind: ${cleanTarget.kind}`,
      ].filter(Boolean).join("; ");
      return `${cleanPrompt}\n\n${parts}. Modify this selected part of the current dashboard. Prefer a generated overlay or focused drilldown instead of replacing unrelated surfaces.`;
    }

    async function runChannelCommand(prompt, options = {}) {
      const rawPrompt = String(prompt || "").trim();
      const target = serializeKatTarget(options.target);
      const userText = targetInstructionText(rawPrompt, target);
      if (!userText || state.commandRunning) return;
      if (!target && activateDunePitchMorph(rawPrompt)) {
        state.lastPrompt = rawPrompt;
        trackLaunchEvent("prompt_submitted", {
          prompt: rawPrompt,
          source: options.source || "command",
          target: null,
        });
        return;
      }
      clearDunePitchMorph();
      state.commandRunning = true;
      state.lastPrompt = rawPrompt || userText;
      trackLaunchEvent("prompt_submitted", {
        prompt: rawPrompt || userText,
        source: options.source || (state.currentShareId ? "share-fork" : "command"),
        target,
      });
      setCommandStatus("building channel state");
      renderCommandPanel();
      try {
        const forkId = state.currentShareId || channelShareId;
        const body = {
          userText,
          sessionId: `prototype-${dashboardId}`,
          target,
        };
        const endpoint = forkId
          ? `/api/channel-shares/${encodeURIComponent(forkId)}/fork`
          : `/api/channels/${encodeURIComponent(dashboardId)}/turn`;
        const resp = await fetch(appUrl(endpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const rawPayload = await resp.json().catch(() => ({}));
        if (!resp.ok || rawPayload.ok === false) throw new Error(rawPayload.error || `turn ${resp.status}`);
        if (rawPayload.share?.id) {
          state.currentShareId = rawPayload.share.id;
          document.body.dataset.channelShare = rawPayload.share.id;
        }
        applyChannelTurnPayload(rawPayload.turn || rawPayload);
        const turnPayload = rawPayload.turn || rawPayload;
        trackLaunchEvent("channel_morphed", {
          prompt: rawPrompt || userText,
          source: options.source || (rawPayload.share?.id ? "share-fork" : "command"),
          target,
          fallback: Boolean(turnPayload.provenance?.some((record) => ["synthetic_fallback", "unavailable"].includes(record.sourceType))),
        });
        if (turnPayload.provenance?.some((record) => ["synthetic_fallback", "unavailable"].includes(record.sourceType))) {
          trackLaunchEvent("fallback_seen", { prompt: rawPrompt || userText, source: options.source || "command", target });
        }
        setCommandStatus("generated state ready");
        render();
      } catch (err) {
        console.warn("channel command failed:", err);
        trackLaunchEvent("error_seen", { prompt: rawPrompt || userText, source: options.source || "command", target, message: err.message || String(err) });
        setCommandStatus(`command failed: ${err.message || err}`);
      } finally {
        state.commandRunning = false;
        renderCommandPanel();
      }
    }

    async function shareChannelState() {
      if (state.commandRunning) return;
      state.commandRunning = true;
      setCommandStatus("saving share object");
      renderCommandPanel();
      try {
        const resp = await fetch(appUrl("/api/channel-shares"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: dashboardId,
            sessionId: `prototype-${dashboardId}`,
            prompt: state.lastPrompt || config.primaryPrompt || config.title,
          }),
        });
        const payload = await resp.json().catch(() => ({}));
        if (!resp.ok || payload.ok === false) throw new Error(payload.error || `share ${resp.status}`);
        const share = payload.share;
        state.currentShareId = share?.id || state.currentShareId;
        if (state.currentShareId) document.body.dataset.channelShare = state.currentShareId;
        const url = new URL(payload.url || `/share/channel/${state.currentShareId}`, window.location.origin).href;
        const copied = await copyText(url).catch(() => false);
        trackLaunchEvent("share_created", { shareId: state.currentShareId, prompt: state.lastPrompt || "", source: "share-button" });
        setCommandStatus(copied ? "Link copied" : "Share ready");
        if (state.currentShareId && window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: "channel-share-created",
            dashboard: dashboardId,
            shareId: state.currentShareId,
            url,
            copied,
          }, window.location.origin);
        }
      } catch (err) {
        console.warn("channel share failed:", err);
        trackLaunchEvent("error_seen", { source: "share-button", message: err.message || String(err) });
        setCommandStatus(`share failed: ${err.message || err}`);
      } finally {
        state.commandRunning = false;
        renderCommandPanel();
      }
    }

    function renderCommandPanel() {
      const panel = $("command-panel");
      if (!panel) return;
      const status = $("command-status");
      const statusText = state.commandStatus || (state.currentShareId ? "share object loaded" : "");
      const hasStatus = Boolean(statusText);
      panel.hidden = !hasStatus;
      document.body.classList.toggle("has-command-panel", hasStatus);
      if (status) status.textContent = statusText;
      const promptStrip = $("prompt-strip");
      if (promptStrip) {
        promptStrip.innerHTML = commandPrompts().map((prompt) =>
          `<button class="prompt-chip" type="button" data-testid="channel-hero-prompt" data-prompt="${escapeHtml(prompt)}" title="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`
        ).join("");
        promptStrip.querySelectorAll("[data-prompt]").forEach((button) => {
          button.addEventListener("click", () => {
            const promptText = button.dataset.prompt || button.textContent || "";
            trackLaunchEvent("prompt_clicked", { prompt: promptText, source: "dashboard-pill" });
            runChannelCommand(promptText);
          });
        });
      }
      const shareButton = $("command-share");
      if (shareButton) {
        shareButton.disabled = state.commandRunning;
        shareButton.onclick = () => shareChannelState();
      }
    }

    function compactTargetText(value, max = 120) {
      const text = String(value || "").replace(/\s+/g, " ").trim();
      return text.length > max ? `${text.slice(0, max - 3)}...` : text;
    }

    function textFrom(root, selector, max = 120) {
      return compactTargetText(root?.querySelector?.(selector)?.textContent || "", max);
    }

    function targetFromElement(element) {
      const node = element?.closest?.([
        "[data-kat-label]",
        ".generated-component",
        ".evidence-card",
        ".metric",
        ".feed-item",
        ".rank-row",
        ".dense-panel",
        ".scene-card",
        ".stage-badge",
        "#pulse-strip",
        "#stage-thesis",
        "#small-multiples",
        "#mini-visual",
        "#stage",
        ".module",
        ".topbar",
      ].join(","));
      const rectNode = node || element?.closest?.(".app") || document.body;
      const rect = rectNode.getBoundingClientRect();
      const base = {
        id: rectNode.id || rectNode.dataset?.generatedId || rectNode.dataset?.katTarget || rectNode.className || "dashboard-region",
        kind: "dashboard region",
        label: config.title || "Dashboard region",
        value: "",
        note: config.lens || config.visualLabel || "",
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      };
      if (!node) return base;
      if (node.dataset?.katLabel) {
        return { ...base, kind: node.dataset.katKind || base.kind, label: compactTargetText(node.dataset.katLabel), value: compactTargetText(node.dataset.katValue || "") };
      }
      if (node.matches(".metric")) {
        return { ...base, kind: "metric", label: textFrom(node, ".metric-label") || "Metric", value: textFrom(node, ".metric-value"), note: textFrom(node, ".metric-note") };
      }
      if (node.matches("#pulse-strip")) {
        return { ...base, kind: "live pulse", label: textFrom(node, "#pulse-kicker") || "Channel pulse", value: textFrom(node, "#pulse-now"), note: textFrom(node, "#pulse-range") };
      }
      if (node.matches("#stage-thesis")) {
        return { ...base, kind: "thesis", label: textFrom(node, "#thesis-headline") || "Channel thesis", value: textFrom(node, "#thesis-big"), note: textFrom(node, "#thesis-trail") };
      }
      if (node.matches(".generated-component")) {
        return { ...base, kind: "generated component", label: textFrom(node, ".generated-title") || textFrom(node, ".generated-eyebrow") || "Generated component", value: textFrom(node, ".generated-metric-value"), note: textFrom(node, ".generated-body, .generated-note, .generated-source") };
      }
      if (node.matches(".evidence-card")) {
        return { ...base, kind: "evidence card", label: textFrom(node, ".ev-label") || "Evidence card", value: textFrom(node, ".ev-value"), note: textFrom(node, ".ev-foot") || textFrom(node, ".ev-meta") };
      }
      if (node.matches(".feed-item")) {
        return { ...base, kind: "feed item", label: textFrom(node, ".feed-title") || "Feed item", value: textFrom(node, ".feed-time"), note: textFrom(node, ".feed-meta") };
      }
      if (node.matches(".rank-row")) {
        return { ...base, kind: "ranked row", label: textFrom(node, ".rk-name") || "Ranked row", value: textFrom(node, ".rk-delta"), note: textFrom(node, ".rk-source") };
      }
      if (node.matches(".dense-panel")) {
        return { ...base, kind: "dashboard panel", label: textFrom(node, ".dense-panel-title") || "Dashboard panel", value: textFrom(node, ".dense-panel-meta"), note: compactTargetText(node.textContent, 160) };
      }
      if (node.matches(".stage-badge")) {
        return { ...base, kind: "stage badge", label: compactTargetText(node.textContent, 100) || "Stage badge" };
      }
      if (node.matches("#mini-visual")) {
        return { ...base, kind: "mini visual", label: textFrom(node, "#mini-label") || "Mini visual", value: textFrom(node, "#mini-chip") };
      }
      if (node.matches("#small-multiples")) {
        return { ...base, kind: "small multiples", label: "Small multiples", note: config.lens || config.title || "" };
      }
      if (node.matches("#stage, .scene-card")) {
        return { ...base, kind: "stage visual", label: $("visual-label")?.textContent || "Stage visual", note: $("visual-copy")?.textContent || "" };
      }
      if (node.matches(".module")) {
        return { ...base, kind: "module", label: textFrom(node, ".section-label") || textFrom(node, ".pulse-kicker") || "Dashboard module", note: compactTargetText(node.textContent, 160) };
      }
      if (node.matches(".topbar")) {
        return { ...base, kind: "dashboard header", label: config.title || "Dashboard header", note: config.kicker || config.subtitle || "" };
      }
      return base;
    }

    function setKatTargetMode(active) {
      katTarget.mode = Boolean(active);
      document.body.classList.toggle("kat-target-mode", katTarget.mode);
      const toggle = $("kat-target-toggle");
      if (toggle) {
        toggle.classList.toggle("active", katTarget.mode);
        toggle.setAttribute("aria-pressed", String(katTarget.mode));
      }
    }

    function updateKatTargetStatus(message = "") {
      const status = $("kat-target-status");
      if (status) status.textContent = message;
    }

    function positionKatTargetModal(point) {
      const modal = $("kat-target-modal");
      if (!modal) return;
      modal.hidden = false;
      modal.style.left = "0px";
      modal.style.top = "0px";
      const rect = modal.getBoundingClientRect();
      const margin = 12;
      const x = Math.min(Math.max(point.x + 14, margin), Math.max(margin, window.innerWidth - rect.width - margin));
      const y = Math.min(Math.max(point.y + 14, margin), Math.max(margin, window.innerHeight - rect.height - margin));
      modal.style.left = `${x}px`;
      modal.style.top = `${y}px`;
    }

    function showKatTargetRing(target) {
      const ring = $("kat-target-ring");
      if (!ring || !target?.rect) return;
      ring.hidden = false;
      ring.style.left = `${Math.max(4, target.rect.left - 4)}px`;
      ring.style.top = `${Math.max(4, target.rect.top - 4)}px`;
      ring.style.width = `${Math.max(24, target.rect.width + 8)}px`;
      ring.style.height = `${Math.max(24, target.rect.height + 8)}px`;
    }

    function hideKatTargetModal() {
      katTarget.selection = null;
      katTarget.voicePointerId = null;
      const modal = $("kat-target-modal");
      const ring = $("kat-target-ring");
      const input = $("kat-target-input");
      if (modal) modal.hidden = true;
      if (ring) ring.hidden = true;
      if (input) input.value = "";
      $("kat-target-voice")?.classList.remove("listening");
      updateKatTargetStatus("");
    }

    function openKatTargetModal(target, point) {
      setKatTargetMode(false);
      katTarget.selection = { target: serializeKatTarget(target), point };
      $("kat-target-name").textContent = target.label || "Dashboard region";
      $("kat-target-input").value = "";
      updateKatTargetStatus(target.value ? compactTargetText(target.value, 80) : target.kind || "");
      showKatTargetRing(target);
      positionKatTargetModal(point);
      requestAnimationFrame(() => $("kat-target-input")?.focus());
    }

    async function submitKatTargetPrompt(instruction, source = "target-modal") {
      const text = String(instruction || "").trim();
      const target = katTarget.selection?.target;
      if (!text || !target) {
        $("kat-target-input")?.focus();
        return;
      }
      updateKatTargetStatus("building targeted mutation");
      $("kat-target-submit").disabled = true;
      try {
        await runChannelCommand(text, { target, source });
        hideKatTargetModal();
      } finally {
        $("kat-target-submit").disabled = false;
      }
    }

    function shouldIgnoreKatTargetClick(event) {
      const interactive = "button, a, input, textarea, select, label, [contenteditable], .kat-target-modal, .action-rail, .generated-modal, [data-kat-target-ignore]";
      return Boolean(event.target?.closest?.(interactive));
    }

    function wireKatTargetInteractions() {
      $("kat-target-toggle")?.addEventListener("click", () => setKatTargetMode(!katTarget.mode));
      $("kat-target-close")?.addEventListener("click", hideKatTargetModal);
      $("kat-target-form")?.addEventListener("submit", (event) => {
        event.preventDefault();
        submitKatTargetPrompt($("kat-target-input")?.value || "");
      });
      document.querySelectorAll("[data-target-quick]").forEach((button) => {
        button.addEventListener("click", () => {
          const value = button.getAttribute("data-target-quick") || "";
          $("kat-target-input").value = value;
          $("kat-target-input").focus();
        });
      });
      document.addEventListener("click", (event) => {
        if (!katTarget.mode && !event.shiftKey) return;
        if (shouldIgnoreKatTargetClick(event)) return;
        if (!event.target?.closest?.(".app")) return;
        event.preventDefault();
        event.stopPropagation();
        const target = targetFromElement(event.target);
        openKatTargetModal(target, { x: event.clientX, y: event.clientY });
      }, true);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          if (katTarget.mode) setKatTargetMode(false);
          if (!$("kat-target-modal")?.hidden) hideKatTargetModal();
        }
      });
      const voice = $("kat-target-voice");
      voice?.addEventListener("pointerdown", (event) => {
        if (!katTarget.selection?.target) return;
        event.preventDefault();
        katTarget.voicePointerId = event.pointerId;
        voice.classList.add("listening");
        updateKatTargetStatus("listening");
        try { voice.setPointerCapture(event.pointerId); } catch (_) {}
        window.parent?.postMessage({
          type: "kat-target-voice-start",
          dashboard: dashboardId,
          target: katTarget.selection.target,
        }, window.location.origin);
      });
      const releaseVoice = (event) => {
        if (katTarget.voicePointerId !== event.pointerId) return;
        try { voice?.releasePointerCapture(event.pointerId); } catch (_) {}
        katTarget.voicePointerId = null;
        voice?.classList.remove("listening");
        updateKatTargetStatus("processing voice");
        window.parent?.postMessage({
          type: "kat-target-voice-stop",
          dashboard: dashboardId,
          target: katTarget.selection?.target || null,
        }, window.location.origin);
      };
      voice?.addEventListener("pointerup", releaseVoice);
      voice?.addEventListener("pointercancel", releaseVoice);
    }

    function startShareReplay() {
      if (!replayRequested || replayStarted || !state.currentShareId) return;
      replayStarted = true;
      document.body.classList.add("share-replay-active", "replay-stage");
      setCommandStatus("replaying shared state");
      setTimeout(() => {
        document.body.classList.remove("replay-stage");
        document.body.classList.add("replay-provenance");
      }, 3600);
      setTimeout(() => {
        document.body.classList.remove("replay-provenance");
        document.body.classList.add("replay-next");
      }, 7600);
      setTimeout(() => {
        document.body.classList.remove("share-replay-active", "replay-next");
        setCommandStatus("fork this state with one prompt");
      }, 11800);
    }

    function maybeRunInitialPrompt() {
      if (!initialPrompt || initialPromptRan || state.currentShareId) return;
      initialPromptRan = true;
      runChannelCommand(initialPrompt);
    }

    function seededValue(index, min, max) {
      const seed = Math.sin((index + 1) * 9301 + dashboardId.length * 49297 + state.tick * 233) * 10000;
      const n = seed - Math.floor(seed);
      return min + n * (max - min);
    }

    /* ============================================================
       COCKPIT COMPONENT LIBRARY
       Pure functions: data in, HTML/SVG out. Information-density
       primitives shared by every channel.
       ============================================================ */

    const liveCollectionSpecs = [
      { field: "articles", label: "article stream", singular: "article", provider: "GDELT" },
      { field: "items", label: "source feed", singular: "item", provider: "RSS" },
      { field: "hn", label: "HN stream", singular: "story", provider: "Hacker News" },
      { field: "studies", label: "clinical studies", singular: "study", provider: "ClinicalTrials.gov" },
      { field: "objects", label: "catalog objects", singular: "object", provider: "NASA TAP" },
      { field: "papers", label: "paper stream", singular: "paper", provider: "arXiv" },
      { field: "sensors", label: "sensor stations", singular: "station", provider: "NOAA" },
      { field: "datasets", label: "public datasets", singular: "dataset", provider: "CDC" },
      { field: "runs", label: "workflow runs", singular: "run", provider: "GitHub" },
      { field: "slides", label: "deck slides", singular: "slide", provider: "local JSON" },
      { field: "arenaBoards", label: "Arena boards", singular: "board", provider: "LMArena" },
      { field: "frontierModels", label: "frontier models", singular: "model", provider: "LMArena" },
      { field: "capabilityMatrix", label: "capability matrix", singular: "model", provider: "Arena SOTA" },
      { field: "polymarketMarkets", label: "AI market odds", singular: "market", provider: "Polymarket" },
      { field: "marketSignals", label: "market signals", singular: "signal", provider: "Polymarket" },
      { field: "divergence", label: "benchmark-market divergence", singular: "signal", provider: "Arena SOTA" },
      { field: "technologyStack", label: "technology stack", singular: "layer", provider: "Katechon" },
      { field: "runtimeLoop", label: "runtime loop", singular: "step", provider: "Katechon" },
      { field: "contentSeeds", label: "content seeds", singular: "seed", provider: "Katechon" },
    ];

    function liveCollectionFromData(data = state.livePayload?.data || {}, fieldHint = "") {
      const specs = fieldHint
        ? liveCollectionSpecs.filter((spec) => spec.field === fieldHint)
        : liveCollectionSpecs;
      for (const spec of specs) {
        const rows = Array.isArray(data[spec.field]) ? data[spec.field] : [];
        if (rows.length) return { ...spec, rows };
      }
      return null;
    }

    function compactLiveText(value, max = 90) {
      const text = String(value || "").replace(/\s+/g, " ").trim();
      return text.length > max ? `${text.slice(0, max - 3)}...` : text;
    }

    function liveRecordTitle(row, index = 0) {
      return compactLiveText(
        row?.title ||
        row?.question ||
        row?.modelName ||
        row?.boardLabel ||
        row?.layer ||
        row?.step ||
        row?.entity ||
        row?.name ||
        row?.briefTitle ||
        row?.headline ||
        row?.id ||
        `row ${index + 1}`,
        110
      );
    }

    function liveRecordMeta(row, fallback = "source") {
      return compactLiveText(
        row?.domain ||
        row?.organization ||
        row?.role ||
        row?.detail ||
        row?.entity ||
        row?.source ||
        row?.sourceCountry ||
        row?.category ||
        row?.status ||
        row?.conclusion ||
        row?.station ||
        row?.host ||
        row?.sponsor ||
        row?.publishedAt ||
        row?.updatedAt ||
        row?.createdAt ||
        row?.seendate ||
        fallback,
        70
      );
    }

    function liveRecordGroup(row, fallback = "source") {
      return compactLiveText(
        row?.domain ||
        row?.organization ||
        row?.role ||
        row?.detail ||
        row?.entity ||
        row?.source ||
        row?.sourceCountry ||
        row?.status ||
        row?.conclusion ||
        row?.station ||
        row?.host ||
        row?.domain ||
        fallback,
        40
      );
    }

    function liveRecordTime(row) {
      return row?.publishedAt || row?.updatedAt || row?.createdAt || row?.seendate || row?.startDate || row?.time || "";
    }

    function recencyScore(row, index, total) {
      const parsed = Date.parse(liveRecordTime(row));
      if (!Number.isFinite(parsed)) return Math.max(1, total - index);
      const ageHours = Math.max(0, (Date.now() - parsed) / 3600000);
      return Math.max(1, 100 - Math.min(96, ageHours));
    }

    function statusScore(value) {
      const text = String(value || "").toLowerCase();
      if (/success|completed|recruiting|active|posted|available/.test(text)) return 88;
      if (/progress|queued|running|not_yet|unknown/.test(text)) return 58;
      if (/fail|error|terminated|suspended|withdrawn|cancel/.test(text)) return 22;
      return 48;
    }

    function liveRecordMetricValue(collection, row, index, metricIndex = 0, total = collection?.rows?.length || 1) {
      if (!row || typeof row !== "object") return Math.max(1, total - index);
      if (collection.field === "hn") {
        const fields = ["points", "comments", "num_comments"];
        return numericValue(row[fields[metricIndex] || "points"]) || Math.max(1, total - index);
      }
      if (collection.field === "studies") {
        if (metricIndex === 0) return statusScore(row.status);
        const yearText = String(row.startDate || "").slice(0, 4);
        const year = /^\d{4}$/.test(yearText) ? Number(yearText) : NaN;
        return Number.isFinite(year) ? year : recencyScore(row, index, total);
      }
      if (collection.field === "objects") {
        const fields = dashboardId === "dark-forest"
          ? ["periodDays", "distancePc", "radiusEarth", "year"]
          : ["year", "distancePc", "radiusEarth", "massEarth"];
        const value = numericValue(row[fields[metricIndex] || fields[0]]);
        return value || Math.max(1, total - index);
      }
      if (collection.field === "sensors") {
        const fields = ["windSpeedMs", "waveHeightM", "pressureHpa", "waterTempC", "airTempC"];
        const value = numericValue(row[fields[metricIndex] || fields[0]]);
        return value || Math.max(1, total - index);
      }
      if (collection.field === "datasets") {
        if (metricIndex === 0) return recencyScore(row, index, total);
        return numericValue(row.rows) || Math.max(1, total - index);
      }
      if (collection.field === "runs") return statusScore(row.conclusion || row.status) - index;
      if (collection.field === "slides") return numericValue(row.index) + 1 || index + 1;
      if (collection.field === "technologyStack") return Math.max(16, 92 - index * 10);
      if (collection.field === "runtimeLoop") return Math.max(16, 84 - index * 8);
      if (collection.field === "contentSeeds") return Math.max(16, 76 - index * 7);
      if (collection.field === "arenaBoards") return numericValue(row.leaders?.[0]?.rating || row.visibleRows || row.modelCount) || Math.max(1, total - index);
      if (collection.field === "frontierModels" || collection.field === "capabilityMatrix") return numericValue(row.topThreeCount) * 20 + numericValue(row.topTenCount) * 4 + Math.max(0, 20 - numericValue(row.avgRank));
      if (collection.field === "polymarketMarkets") return numericValue(row.yesPct ?? row.yes) || Math.max(1, total - index);
      if (collection.field === "marketSignals") return numericValue(row.impliedYesPct) || Math.max(1, total - index);
      if (collection.field === "divergence") return numericValue(row.value) || Math.max(1, total - index);
      return recencyScore(row, index, total);
    }

    function liveRecordValues(collection, metricIndex = 0, limit = 60) {
      if (!collection?.rows?.length) return [];
      return collection.rows
        .slice(0, limit)
        .map((row, index, rows) => liveRecordMetricValue(collection, row, index, metricIndex, rows.length))
        .filter((value) => Number.isFinite(value));
    }

    function liveRecordValueLabel(collection, row, index = 0) {
      if (collection.field === "studies") return compactLiveText(row.status || row.startDate || `study ${index + 1}`, 32);
      if (collection.field === "objects") {
        if (dashboardId === "dark-forest" && row.periodDays) return `${Number(row.periodDays).toFixed(0)}d`;
        return row.year ? String(row.year) : (row.distancePc ? `${Math.round(Number(row.distancePc))} pc` : `object ${index + 1}`);
      }
      if (collection.field === "sensors") {
        const wind = Number(row.windSpeedMs);
        const wave = Number(row.waveHeightM);
        if (Number.isFinite(wind)) return `${wind.toFixed(1)} m/s`;
        if (Number.isFinite(wave)) return `${wave.toFixed(1)} m`;
      }
      if (collection.field === "runs") return compactLiveText(row.conclusion || row.status || "run", 34);
      if (collection.field === "hn" && row.points !== undefined) return `${Math.round(numericValue(row.points))} pts`;
      if (collection.field === "datasets") return compactLiveText(row.updatedAt || row.domain || "dataset", 34);
      if (collection.field === "slides") return `slide ${numericValue(row.index) + 1 || index + 1}`;
      if (collection.field === "technologyStack") return compactLiveText(row.status || "layer", 34);
      if (collection.field === "runtimeLoop") return compactLiveText(row.signal || "step", 34);
      if (collection.field === "contentSeeds") return compactLiveText(row.status || row.source || "seed", 34);
      if (collection.field === "arenaBoards") return row.leaders?.[0]?.modelName ? `#1 ${compactLiveText(row.leaders[0].modelName, 28)}` : "board";
      if (collection.field === "frontierModels" || collection.field === "capabilityMatrix") return row.bestRank ? `best #${row.bestRank}` : `${numericValue(row.topTenCount)} top-10`;
      if (collection.field === "polymarketMarkets") return `${Math.round(numericValue(row.yesPct ?? row.yes) || 0)}% YES`;
      if (collection.field === "marketSignals") return `${Math.round(numericValue(row.impliedYesPct) || 0)}%`;
      if (collection.field === "divergence") return compactLiveText(row.value || row.label || "divergence", 34);
      return liveRecordMeta(row, collection.provider || collection.label);
    }

    function liveRecordBarPct(collection, row, index, total) {
      const value = liveRecordMetricValue(collection, row, index, 0, total);
      if (collection.field === "objects" && value > 1800) return Math.max(10, Math.min(100, 24 + (value - 1990) * 2));
      if (collection.field === "sensors" && value > 100) return Math.max(8, Math.min(100, value / 12));
      if (collection.field === "slides") return Math.max(10, Math.min(100, (index + 1) / Math.max(1, total) * 100));
      if (collection.field === "technologyStack" || collection.field === "runtimeLoop" || collection.field === "contentSeeds") return Math.max(16, Math.min(100, value));
      return Math.max(8, Math.min(100, value));
    }

    function liveRecordSpark(collection, row, index) {
      const values = liveRecordValues(collection, index % 3, 24);
      return values.length ? values : Array.from({ length: 8 }, (_, i) => Math.max(1, 8 - i + index));
    }

    function feedRankValues(limit = 24) {
      const rows = state.feed.slice(0, limit);
      return rows.map((_, index) => Math.max(1, rows.length - index));
    }

    function pulseSourceData() {
      const data = state.livePayload?.data || {};
      if (Array.isArray(data.candles) && data.candles.length) {
        const candles = data.candles.slice(-60);
        return {
          values: candles.map((c) => numericValue(c.c ?? c.close ?? c.mark)),
          label: `${(data.coin || config.title || "price").toString().toUpperCase().slice(0, 18)} close`,
          kind: "price", unit: "$", live: true,
        };
      }
      if (Array.isArray(data.series) && data.series.length) {
        const series = data.series.slice(-60);
        return {
          values: series.map((row) => numericValue(row.loadMw ?? row.value ?? row.frequencyHz ?? row.stressPct)),
          label: data.respondentName || data.respondent || "grid load",
          kind: "load", unit: "MW", live: true,
        };
      }
      if (Array.isArray(data.markets) && data.markets.length) {
        return {
          values: data.markets.slice(0, 60).map((m) => numericValue(m.yes) * 100),
          label: "market YES%", kind: "yes", unit: "%", live: true,
        };
      }
      if (Array.isArray(data.tokens) && data.tokens.length) {
        return {
          values: data.tokens.slice(0, 60).map((t) => numericValue(t.attentionScore ?? t.change1h ?? t.fragilityScore)),
          label: "token velocity", kind: "velocity", unit: "", live: true,
        };
      }
      if (Array.isArray(data.fuelMix) && data.fuelMix.length) {
        return {
          values: data.fuelMix.map((f) => numericValue(f.sharePct ?? f.mw)),
          label: "fuel mix share", kind: "share", unit: "%", live: true,
        };
      }
      const collection = liveCollectionFromData(data);
      if (collection) {
        return {
          values: liveRecordValues(collection, 0, 60),
          label: collection.label,
          kind: "records",
          unit: "",
          live: true,
        };
      }
      if (Array.isArray(data.feed) && data.feed.length) {
        return {
          values: data.feed.slice(0, 60).map((_, index, rows) => Math.max(1, rows.length - index)),
          label: `${state.livePayload?.source || "provider"} feed`,
          kind: "records",
          unit: "",
          live: true,
        };
      }
      const palette = sceneFlavor();
      const values = Array.from({ length: 60 }, (_, i) => seededValue(i, palette.lo, palette.hi));
      return { values, label: palette.label, kind: "synthetic", unit: palette.unit || "", live: false };
    }

    function sceneFlavor() {
      const map = {
        "command-map": { label: "event flux", lo: 8, hi: 92, unit: "events" },
        "newsroom": { label: "story flux", lo: 12, hi: 88, unit: "stories" },
        "source-wall": { label: "source flux", lo: 14, hi: 96, unit: "sources" },
        "market-mesh": { label: "breadth", lo: 18, hi: 92, unit: "%" },
        "orderbook": { label: "spread bps", lo: 1, hi: 14, unit: "bps" },
        "prediction": { label: "implied yes", lo: 22, hi: 86, unit: "%" },
        "geo-signal": { label: "regional pressure", lo: 18, hi: 84, unit: "" },
        "arena": { label: "score delta", lo: 0, hi: 24, unit: "pts" },
        "bio-lab": { label: "evidence weight", lo: 18, hi: 88, unit: "" },
        "observatory": { label: "transit depth", lo: 0, hi: 8, unit: "%" },
        "meme": { label: "attention", lo: 12, hi: 96, unit: "" },
        "quantum": { label: "coherence", lo: 28, hi: 92, unit: "" },
        "abyss": { label: "thermal Δ", lo: 0, hi: 12, unit: "" },
        "gridops": { label: "load %", lo: 32, hi: 92, unit: "%" },
        "viralnet": { label: "active R0", lo: 60, hi: 180, unit: "" },
        "darkwatch": { label: "σ deviation", lo: 0, hi: 4, unit: "σ" },
        "katechon-system": { label: "runtime depth", lo: 12, hi: 96, unit: "" },
      };
      return map[config.scene] || { label: "channel signal", lo: 14, hi: 86, unit: "" };
    }

    function formatPulseValue(value, unit, kind) {
      if (!Number.isFinite(value)) return "—";
      if (kind === "price" || unit === "$") {
        if (Math.abs(value) >= 1000) return `$${Math.round(value).toLocaleString()}`;
        return `$${value.toFixed(2)}`;
      }
      if (unit === "%") return `${value.toFixed(1)}%`;
      if (unit === "MW") return formatGridMw(value);
      if (unit === "bps") return `${value.toFixed(2)}bp`;
      if (unit === "σ") return `${value.toFixed(2)}σ`;
      if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
      if (Math.abs(value) >= 100) return value.toFixed(0);
      return value.toFixed(2);
    }

    function pulseStripCells(payload) {
      const values = payload.values || [];
      if (!values.length) return { html: "", now: "—", delta: { text: "—", dir: "flat" }, range: "—" };
      const last = values[values.length - 1];
      const first = values[0];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const cells = values.map((v, i) => {
        const norm = (v - min) / range;
        const h = Math.max(6, Math.round(norm * 100));
        const dir = i === 0 ? "" : (v > values[i - 1] ? "" : v < values[i - 1] ? "down" : "flat");
        const pinned = i === values.length - 1 ? " pinned" : "";
        return `<span class="pulse-cell ${dir}${pinned}" style="height:${h}%"></span>`;
      }).join("");
      const deltaPct = first ? ((last - first) / Math.abs(first)) * 100 : 0;
      const deltaDir = deltaPct > 0.001 ? "up" : deltaPct < -0.001 ? "down" : "flat";
      const sign = deltaPct > 0 ? "+" : "";
      return {
        html: cells,
        now: formatPulseValue(last, payload.unit, payload.kind),
        delta: {
          text: payload.kind === "price" ? `${sign}${deltaPct.toFixed(2)}%` : `${sign}${(last - first).toFixed(2)}`,
          dir: deltaDir,
        },
        range: `${formatPulseValue(min, payload.unit, payload.kind)} – ${formatPulseValue(max, payload.unit, payload.kind)}`,
      };
    }

    function sparklinePath(values, w, h) {
      if (!values.length) return { line: "", area: "" };
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const step = values.length > 1 ? w / (values.length - 1) : w;
      const pts = values.map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / range) * (h - 4) - 2;
        return [x, y];
      });
      const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
      const area = `${line}L${w.toFixed(1)},${h}L0,${h}Z`;
      return { line, area };
    }

    function sparklineSvg(values, opts) {
      const w = (opts && opts.width) || 100;
      const h = (opts && opts.height) || 22;
      if (!values || !values.length) {
        return `<svg class="spark ${(opts && opts.color) || ""}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><line class="baseline" x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}"/></svg>`;
      }
      const path = sparklinePath(values, w, h);
      const dir = values[values.length - 1] >= values[0] ? "" : " down";
      return `<svg class="spark ${(opts && opts.color) || ""}${dir}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        ${(!opts || opts.area !== false) ? `<path class="area" d="${path.area}"/>` : ""}
        <path class="line" d="${path.line}"/>
      </svg>`;
    }

    function metricSparkValues(metricIndex) {
      const data = state.livePayload?.data || {};
      if (Array.isArray(data.candles) && data.candles.length) {
        return data.candles.slice(-24).map((c) => numericValue(c.c ?? c.close ?? c.mark));
      }
      if (Array.isArray(data.series) && data.series.length) {
        const fields = ["loadMw", "frequencyHz", "operatingMarginPct"];
        const field = fields[metricIndex] || "loadMw";
        return data.series.slice(-24).map((r) => numericValue(r[field]));
      }
      if (Array.isArray(data.markets) && data.markets.length) {
        return data.markets.slice(0, 24).map((m) => numericValue(m.yes) * 100);
      }
      if (Array.isArray(data.tokens) && data.tokens.length) {
        const fields = ["change1h", "fragilityScore", "attentionScore"];
        const field = fields[metricIndex] || "fragilityScore";
        return data.tokens.slice(0, 24).map((t) => numericValue(t[field]));
      }
      const collection = liveCollectionFromData(data);
      if (collection) return liveRecordValues(collection, metricIndex, 24);
      if (Array.isArray(data.feed) && data.feed.length) return feedRankValues(24);
      const m = visibleMetrics()[metricIndex] || ["", "0", ""];
      const base = numericValue(m[1]) || (50 + metricIndex * 12);
      return Array.from({ length: 24 }, (_, i) => base + seededValue(i + metricIndex * 31, -base * 0.08, base * 0.08));
    }

    function metricDelta(values) {
      if (!values || values.length < 2) return { text: "—", dir: "flat" };
      const a = values[0];
      const b = values[values.length - 1];
      if (!Number.isFinite(a) || !a) return { text: "—", dir: "flat" };
      const pct = ((b - a) / Math.abs(a)) * 100;
      if (Math.abs(pct) < 0.05) return { text: "flat", dir: "flat" };
      const sign = pct > 0 ? "+" : "";
      return { text: `${sign}${pct.toFixed(1)}%`, dir: pct > 0 ? "up" : "down" };
    }

    function smallMultiplesPlan() {
      const data = state.livePayload?.data || {};
      const items = [];
      if (Array.isArray(data.candles) && data.candles.length) {
        const candles = data.candles.slice(-30);
        const closes = candles.map((c) => numericValue(c.c ?? c.close));
        const vols = candles.map((c) => numericValue(c.v ?? c.volume));
        const ranges = candles.map((c) => numericValue(c.h ?? c.high) - numericValue(c.l ?? c.low));
        items.push({ label: "close", spark: closes, value: formatPulseValue(closes[closes.length - 1], "$", "price"), note: `${candles.length}p`, kind: "spark" });
        items.push({ label: "volume", spark: vols, value: vols.length ? compactMoney(vols[vols.length - 1]) : "—", note: "per bar", kind: "bars" });
        items.push({ label: "range", spark: ranges, value: ranges.length ? `${ranges[ranges.length - 1].toFixed(1)}` : "—", note: "h-l", kind: "bars" });
        return items;
      }
      if (Array.isArray(data.series) && data.series.length) {
        const series = data.series.slice(-30);
        const load = series.map((r) => numericValue(r.loadMw));
        const freq = series.map((r) => numericValue(r.frequencyHz));
        const stress = series.map((r) => numericValue(r.stressPct));
        items.push({ label: "load MW", spark: load, value: formatGridMw(load[load.length - 1] || 0), note: "live", kind: "spark" });
        items.push({ label: "frequency Hz", spark: freq, value: (freq[freq.length - 1] || 60).toFixed(3), note: "stability", kind: "spark", color: "cyan" });
        items.push({ label: "corridor stress", spark: stress, value: `${(stress[stress.length - 1] || 0).toFixed(0)}%`, note: "operator", kind: "bars", color: "amber" });
        return items;
      }
      if (Array.isArray(data.markets) && data.markets.length) {
        const m = data.markets.slice(0, 30);
        const yes = m.map((x) => numericValue(x.yes) * 100);
        const vol = m.map((x) => numericValue(x.volume));
        const close = m.map((x) => Math.abs(numericValue(x.yes) * 100 - 50));
        items.push({ label: "YES distribution", spark: yes, value: yes.length ? `${yes[0].toFixed(0)}%` : "—", note: "top", kind: "bars" });
        items.push({ label: "volume rank", spark: vol, value: vol.length ? compactMoney(vol[0]) : "—", note: "lead", kind: "bars", color: "cyan" });
        items.push({ label: "near 50/50", spark: close, value: `${close.length}`, note: "tracked", kind: "bars", color: "amber" });
        return items;
      }
      if (Array.isArray(data.tokens) && data.tokens.length) {
        const t = data.tokens.slice(0, 24);
        const att = t.map((x) => numericValue(x.attentionScore));
        const liq = t.map((x) => numericValue(x.liquidityRisk));
        const frag = t.map((x) => numericValue(x.fragilityScore));
        items.push({ label: "attention", spark: att, value: att.length ? att[0].toFixed(0) : "—", note: "lead", kind: "bars" });
        items.push({ label: "liquidity risk", spark: liq, value: liq.length ? liq[0].toFixed(0) : "—", note: "thin = risk", kind: "bars", color: "amber" });
        items.push({ label: "fragility", spark: frag, value: frag.length ? frag[0].toFixed(0) : "—", note: "leader", kind: "bars", color: "down" });
        return items;
      }
      const collection = liveCollectionFromData(data);
      if (collection) {
        const rows = collection.rows.slice(0, 30);
        const primary = liveRecordValues(collection, 0, 30);
        const secondary = liveRecordValues(collection, 1, 30);
        const groups = [];
        const seen = new Set();
        rows.forEach((row) => {
          const group = liveRecordGroup(row, collection.provider);
          if (group) seen.add(group);
          groups.push(seen.size);
        });
        const lead = rows[0] || {};
        items.push({ label: collection.singular, spark: primary, value: String(collection.rows.length), note: collection.provider, kind: "bars" });
        items.push({ label: "source spread", spark: groups, value: String(seen.size || 1), note: "groups", kind: "bars", color: "cyan" });
        items.push({ label: "lead row", spark: secondary.length ? secondary : primary, value: liveRecordValueLabel(collection, lead, 0), note: liveRecordMeta(lead, collection.provider), kind: "spark", color: "amber" });
        return items;
      }
      if (Array.isArray(data.feed) && data.feed.length) {
        const values = feedRankValues(30);
        items.push({ label: "feed rows", spark: values, value: String(data.feed.length), note: state.livePayload?.source || "provider", kind: "bars" });
        items.push({ label: "latest row", spark: values, value: data.feed[0]?.[0] || "now", note: data.feed[0]?.[2] || "API", kind: "spark", color: "cyan" });
        items.push({ label: "freshness", spark: values, value: freshnessLabel(state.livePayload?.freshness || "unavailable"), note: "source", kind: "bars", color: "amber" });
        return items;
      }

      const v = visibleMetrics();
      [0, 1, 2].forEach((i) => {
        if (items.length >= 3) return;
        const m = v[i] || [`signal ${i + 1}`, "—", ""];
        const spark = metricSparkValues(i);
        const delta = metricDelta(spark);
        items.push({
          label: m[0] || `signal ${i + 1}`,
          spark,
          value: m[1] || "—",
          note: m[2] || delta.text,
          kind: i === 1 ? "bars" : "spark",
          color: i === 0 ? "" : i === 1 ? "cyan" : "amber",
        });
      });
      return items.slice(0, 3);
    }

    function smallMultiplesHtml(items) {
      if (!items || !items.length) return "";
      return items.map((item) => {
        const vis = item.kind === "bars"
          ? `<div class="sm-bars">${(item.spark || []).slice(-30).map((v, i, arr) => {
              const min = Math.min(...arr);
              const max = Math.max(...arr);
              const rng = (max - min) || 1;
              const h = Math.max(6, Math.round(((v - min) / rng) * 100));
              const cls = i === arr.length - 1 ? " pinned" : (v < (arr[i - 1] || v) ? " down" : "");
              return `<span class="${cls.trim()}" style="height:${h}%"></span>`;
            }).join("")}</div>`
          : sparklineSvg(item.spark || [], { color: item.color || "", area: true });
        return `<article class="small-multi">
          <div class="sm-label">${escapeHtml(item.label)}</div>
          <div class="sm-vis">${vis}</div>
          <div class="sm-foot"><span class="sm-value">${escapeHtml(item.value || "—")}</span><span class="sm-note">${escapeHtml(item.note || "")}</span></div>
        </article>`;
      }).join("");
    }

    function evidenceFieldsForChannel() {
      const data = state.livePayload?.data || {};
      const cards = [];

      if (Array.isArray(data.markets) && data.markets.length) {
        data.markets.slice(0, 4).forEach((m, i) => {
          const yes = Math.round(numericValue(m.yes) * 100);
          const tone = i === 0 ? "" : Math.abs(yes - 50) < 8 ? "is-warn" : "";
          cards.push({
            label: i === 0 ? "lead market" : `market ${i + 1}`,
            value: `${yes}%`,
            sub: m.question || m.title || "polymarket",
            spark: [50, yes, yes + (i % 2 === 0 ? 4 : -4), yes],
            meta: m.category || "polymarket",
            barPct: yes,
            tone,
          });
        });
      } else if (Array.isArray(data.tokens) && data.tokens.length) {
        data.tokens.slice(0, 4).forEach((t, i) => {
          const change = numericValue(t.change1h ?? t.change24h);
          const tone = numericValue(t.fragilityScore) > 60 ? "is-alert" : numericValue(t.liquidityRisk) > 60 ? "is-warn" : "";
          cards.push({
            label: i === 0 ? "leader" : `mover ${i + 1}`,
            value: t.symbol || t.name || "token",
            sub: `${change >= 0 ? "+" : ""}${change.toFixed(1)}% / liq ${compactMoney(t.liquidityUsd)}`,
            spark: metricSparkValues(i),
            meta: `frag ${Math.round(numericValue(t.fragilityScore))}`,
            barPct: Math.min(100, Math.max(4, numericValue(t.attentionScore))),
            tone,
          });
        });
      } else if (Array.isArray(data.candles) && data.candles.length) {
        const last = data.candles[data.candles.length - 1] || {};
        const closes = data.candles.slice(-24).map((c) => numericValue(c.c ?? c.close));
        const vols = data.candles.slice(-24).map((c) => numericValue(c.v ?? c.volume));
        const high = Math.max(...closes);
        const low = Math.min(...closes);
        const close = numericValue(last.c ?? last.close);
        cards.push({ label: "last close", value: formatPulseValue(close, "$", "price"), sub: data.coin || "market", spark: closes, meta: "live", barPct: ((close - low) / ((high - low) || 1)) * 100, tone: "" });
        cards.push({ label: "volume", value: compactMoney(vols[vols.length - 1] || 0), sub: "last bar", spark: vols, meta: "ticks", barPct: 60, tone: "" });
        cards.push({ label: "range hi/lo", value: `${formatPulseValue(high, "$", "price")} / ${formatPulseValue(low, "$", "price")}`, sub: "24-bar window", spark: closes, meta: "envelope", barPct: 80, tone: "" });
        cards.push({ label: "spread", value: data.spreadBps ? `${Number(data.spreadBps).toFixed(2)}bp` : "—", sub: "book depth", spark: [], meta: "live", barPct: 36, tone: "" });
      } else if (Array.isArray(data.series) && data.series.length) {
        const last = data.series[data.series.length - 1] || {};
        cards.push({ label: "load now", value: formatGridMw(numericValue(last.loadMw)), sub: data.respondent || "grid", spark: data.series.map(r => numericValue(r.loadMw)), meta: "EIA", barPct: numericValue(last.stressPct) || 50, tone: numericValue(last.stressPct) > 75 ? "is-warn" : "" });
        cards.push({ label: "frequency", value: `${numericValue(last.frequencyHz).toFixed(3)} Hz`, sub: "stability", spark: data.series.map(r => numericValue(r.frequencyHz)), meta: "proxy", barPct: 70, tone: "" });
        cards.push({ label: "reserve margin", value: `${numericValue(last.operatingMarginPct).toFixed(1)}%`, sub: "operator", spark: data.series.map(r => numericValue(r.operatingMarginPct)), meta: "proxy", barPct: numericValue(last.operatingMarginPct), tone: numericValue(last.operatingMarginPct) < 12 ? "is-alert" : "" });
        if (Array.isArray(data.corridors) && data.corridors.length) {
          const c = data.corridors[0];
          cards.push({ label: "corridor stress", value: `${numericValue(c.stressPct).toFixed(0)}%`, sub: `${c.from}-${c.to}`, spark: data.corridors.map(x => numericValue(x.stressPct)), meta: "topology", barPct: numericValue(c.stressPct), tone: numericValue(c.stressPct) > 80 ? "is-alert" : "is-warn" });
        }
      } else {
        const collection = liveCollectionFromData(data);
        if (collection) {
          const total = collection.rows.length;
          collection.rows.slice(0, 4).forEach((row, i) => {
            const score = liveRecordMetricValue(collection, row, i, 0, total);
            cards.push({
              label: i === 0 ? `lead ${collection.singular}` : `${collection.singular} ${i + 1}`,
              value: liveRecordValueLabel(collection, row, i),
              sub: liveRecordTitle(row, i),
              spark: liveRecordSpark(collection, row, i),
              meta: liveRecordMeta(row, collection.provider),
              barPct: liveRecordBarPct(collection, row, i, total),
              tone: score < 30 ? "is-warn" : "",
            });
          });
        }
      }

      const needed = Math.max(0, 4 - cards.length);
      for (let i = 0; i < needed && i < state.feed.length; i += 1) {
        const [time, title, meta] = state.feed[i] || [];
        cards.push({
          label: state.feed[i] ? (i === 0 ? "now" : `feed ${i + 1}`) : `signal ${i + 1}`,
          value: meta || (title || "").split(" ").slice(0, 4).join(" ") || "—",
          sub: title || "channel state",
          spark: metricSparkValues(i % 3),
          meta: time || "—",
          barPct: 30 + i * 18,
          tone: "",
        });
      }

      return cards.slice(0, 5);
    }

    function evidenceCardHtml(card) {
      return `<article class="evidence-card ${card.tone || ""}" data-testid="evidence-card">
        <div class="ev-head">
          <span class="ev-label">${escapeHtml(card.label || "signal")}</span>
          <span class="ev-meta">${escapeHtml(card.meta || "")}</span>
        </div>
        <div class="ev-row">
          <span class="ev-value">${escapeHtml(card.value || "—")}</span>
          <span class="ev-vis">${sparklineSvg(card.spark || [], { width: 100, height: 18 })}</span>
        </div>
        <div class="ev-foot">
          <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${escapeHtml(card.sub || "")}</span>
          <span class="ev-bar" style="--rk-w:${Math.max(4, Math.min(100, Math.round(card.barPct || 50)))}%;width:${Math.max(40, Math.min(120, Math.round((card.barPct || 50) * 0.6) + 32))}px;"></span>
        </div>
      </article>`;
    }

    function rankedRowHtml(row) {
      const tone = row.tone || (row.delta && String(row.delta).startsWith("-") ? "is-down" : row.warn ? "is-warn" : row.delta === "—" ? "is-flat" : "");
      const pct = Math.max(2, Math.min(100, Math.round(row.barPct || 50)));
      return `<article class="rank-row ${tone}">
        <div class="rk-name">${escapeHtml(row.name || "—")}${row.source ? `<span class="rk-source">${escapeHtml(row.source)}</span>` : ""}</div>
        <div class="rk-bar" style="--rk-w:${pct}%"></div>
        <div class="rk-delta">${escapeHtml(row.delta || "—")}</div>
        <div class="rk-spark">${sparklineSvg(row.spark || [], { width: 56, height: 18 })}</div>
      </article>`;
    }

    function heatStripRowHtml(name, cells) {
      const max = Math.max(...cells, 1);
      const inner = cells.map((v, i) => {
        const norm = v / max;
        const lvl = norm > 0.92 ? "l5" : norm > 0.78 ? "l4" : norm > 0.56 ? "l3" : norm > 0.32 ? "l2" : norm > 0.08 ? "l1" : "";
        const pinned = i === cells.length - 1 ? " pinned" : "";
        return `<span class="hs-cell ${lvl}${pinned}"></span>`;
      }).join("");
      return `<div class="heat-strip-row">
        <span class="hs-name">${escapeHtml(name)}</span>
        <div class="hs-cells">${inner}</div>
      </div>`;
    }

    function actionPromptsForCockpit() {
      const heroPrompts = Array.isArray(config.heroPrompts) ? config.heroPrompts : [];
      const page = activeGeneratedPage();
      const pagePrompts = Array.isArray(page?.actions) ? page.actions : [];
      const primary = config.primaryPrompt ? [config.primaryPrompt] : [];
      const seeded = [...heroPrompts, ...pagePrompts, ...primary].filter(Boolean);
      if (seeded.length) return Array.from(new Set(seeded)).slice(0, 6);
      return [
        `Inspect the strongest signal in ${config.title || "this channel"}`,
        `Show what changed in the last hour`,
        `Build a focused board for ${config.kicker || "this lens"}`,
      ];
    }

    function thesisLine() {
      const data = state.livePayload?.data || {};
      const lead = state.feed[0] || ["", "", ""];
      const m = visibleMetrics();
      const headline = lead[1] || `${config.title || "Channel"} state holding.`;
      const trail = [];
      if (data.coin) trail.push(`${data.coin}`);
      if (data.respondent) trail.push(`${data.respondent}`);
      const collection = liveCollectionFromData(data);
      if (collection) trail.push(`${collection.rows.length} ${collection.label}`);
      if (m[0]) trail.push(`${m[0][0] || ""} ${m[0][1] || ""}`.trim());
      if (config.lens) trail.push(config.lens);
      const liveTimestamp = state.livePayload?.updatedAt || state.livePayload?.timestamp;
      const liveTime = liveTimestamp ? new Date(Number(liveTimestamp)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      if (liveTime) trail.push(`updated ${liveTime}`);
      return { headline, trail: trail.slice(0, 4) };
    }

    function thesisFigure() {
      const data = state.livePayload?.data || {};
      const m = visibleMetrics();
      if (Array.isArray(data.candles) && data.candles.length > 1) {
        const closes = data.candles.slice(-24).map((c) => numericValue(c.c ?? c.close));
        const last = closes[closes.length - 1];
        const first = closes[0];
        const pct = first ? ((last - first) / Math.abs(first)) * 100 : 0;
        return { big: formatPulseValue(last, "$", "price"), small: `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% / 24p`, dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat" };
      }
      if (m[0]) return { big: m[0][1] || "—", small: m[0][0] || "", dir: "flat" };
      return { big: "—", small: "", dir: "flat" };
    }

    function provenanceState() {
      const payload = state.livePayload || {};
      const freshness = payload.freshness || payload.dataBinding?.freshness || (payload.stale ? "cached" : payload.fallbackReason ? "unavailable" : "live");
      let kind = freshness === "cached" ? "cached" : freshness === "unavailable" ? "unavailable" : "live";
      if (/synthetic/i.test(String(payload.source || ""))) kind = "synthetic";
      const label = freshnessLabel(freshness);
      const ts = payload.updatedAt || payload.timestamp ? new Date(Number(payload.updatedAt || payload.timestamp)) : null;
      const age = ts ? Math.max(0, Math.floor((Date.now() - ts.getTime()) / 1000)) : null;
      const ageText = age == null ? "—" : age < 60 ? `${age}s` : age < 3600 ? `${Math.floor(age / 60)}m` : `${Math.floor(age / 3600)}h`;
      return { label, kind, age: ageText };
    }

    function freshnessLabel(value) {
      if (value === "live") return "Live data";
      if (value === "cached") return "Data cached";
      return "Data unavailable";
    }

    function pitchVisualHtml(frame) {
      const labels = frame.labels || [];
      if (frame.visual === "lineage") {
        return `
          <div class="pitch-visual pitch-lineage" aria-hidden="true">
            <div class="pitch-lineage-sources">
              ${labels.slice(0, 3).map((label, index) => `<span class="pitch-node" style="--i:${index}">${escapeHtml(label)}</span>`).join("")}
            </div>
            <div class="pitch-lineage-paths">
              <span class="pitch-path"></span><span class="pitch-path"></span><span class="pitch-path"></span>
            </div>
            <div class="pitch-core">${escapeHtml(labels[3] || "Katechon")}</div>
          </div>`;
      }
      if (frame.visual === "firehose") {
        return `
          <div class="pitch-visual pitch-firehose" aria-hidden="true">
            <div class="pitch-token-stream">
              ${labels.map((label, index) => `<span class="pitch-token" style="--i:${index}">${escapeHtml(label)}</span>`).join("")}
            </div>
            <div class="pitch-state-cube">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>`;
      }
      if (frame.visual === "stateLoss") {
        return `
          <div class="pitch-visual pitch-state-loss" aria-hidden="true">
            <div class="pitch-capture-stack">
              ${labels.slice(0, 3).map((label, index) => `<span class="pitch-capture pitch-node" style="--i:${index}">${escapeHtml(label)}</span>`).join("")}
            </div>
            <div class="pitch-compressor"><span></span></div>
            <div class="pitch-state-object">
              <strong>${escapeHtml(labels[3] || "state")}</strong>
              <i></i><i></i><i></i>
            </div>
          </div>`;
      }
      if (frame.visual === "channelOrbit") {
        return `
          <div class="pitch-visual pitch-channel-orbit" aria-hidden="true">
            <div class="pitch-orbit-ring"></div>
            <div class="pitch-core pitch-orbit-core">channel</div>
            ${labels.map((label, index) => `<span class="pitch-orbit-node pitch-node" style="--i:${index}">${escapeHtml(label)}</span>`).join("")}
          </div>`;
      }
      if (frame.visual === "agentMesh") {
        return `
          <div class="pitch-visual pitch-agent-mesh" aria-hidden="true">
            <div class="pitch-kat-core">Kat</div>
            ${labels.map((label, index) => `<span class="pitch-agent-node pitch-node" style="--i:${index}">${escapeHtml(label)}</span>`).join("")}
            <span class="pitch-beam pitch-beam-a"></span>
            <span class="pitch-beam pitch-beam-b"></span>
            <span class="pitch-beam pitch-beam-c"></span>
          </div>`;
      }
      return `
        <div class="pitch-visual pitch-discovery-graph" aria-hidden="true">
          ${labels.map((label, index) => `<span class="pitch-graph-node pitch-node" style="--i:${index}">${escapeHtml(label)}</span>`).join("")}
          <span class="pitch-edge pitch-edge-a"></span>
          <span class="pitch-edge pitch-edge-b"></span>
          <span class="pitch-edge pitch-edge-c"></span>
          <span class="pitch-edge pitch-edge-d"></span>
        </div>`;
    }

    function animatePitchMorph() {
      const root = $("pitch-morph");
      if (!root || root.hidden) return;
      animate(root.querySelector(".pitch-sentence"), {
        opacity: [0, 1],
        y: [16, 0],
        duration: 560,
        ease: "out(3)",
      });
      animate(root.querySelectorAll(".pitch-node, .pitch-core, .pitch-token, .pitch-state-object, .pitch-kat-core"), {
        opacity: [0, 1],
        scale: [0.94, 1],
        y: [10, 0],
        delay: stagger(62),
        duration: 620,
        ease: "out(3)",
      });
      animate(root.querySelectorAll(".pitch-path, .pitch-beam, .pitch-edge"), {
        opacity: [0, 1],
        delay: stagger(76),
        duration: 680,
        ease: "out(3)",
      });
    }

    function renderPitchMorph() {
      const root = $("pitch-morph");
      const frame = dashboardId === "dune-deck" ? state.pitchMorph : null;
      document.body.classList.toggle("pitch-morph-active", Boolean(frame));
      if (frame) document.body.dataset.pitchMorph = frame.id;
      else delete document.body.dataset.pitchMorph;
      if (!root) return;
      if (!frame) {
        root.hidden = true;
        root.innerHTML = "";
        root.removeAttribute("data-render-key");
        return;
      }
      const renderKey = `${frame.id}-${state.pitchMorphNonce}`;
      if (!root.hidden && root.dataset.renderKey === renderKey) return;
      root.hidden = false;
      root.dataset.renderKey = renderKey;
      root.dataset.pitchId = frame.id;
      root.innerHTML = `
        <article class="pitch-frame pitch-frame-${escapeHtml(frame.id)}" data-testid="pitch-morph-frame">
          <h2 class="pitch-sentence">${escapeHtml(frame.sentence)}</h2>
          ${pitchVisualHtml(frame)}
        </article>`;
      requestAnimationFrame(animatePitchMorph);
    }

    function render() {
      setTheme();
      if (blankDashboardMode) {
        renderBlankDashboard();
        return;
      }
      const page = activeGeneratedPage();
      const pitchMorph = dashboardId === "dune-deck" ? state.pitchMorph : null;
      const title = pitchMorph ? baseChannelTitle : page?.thesis?.title || config.title;
      document.title = `${title} - Katechon`;
      document.body.dataset.generatedView = state.generated.view || "default";
      document.body.dataset.generatedMode = page ? "generated_page" : "slot_overrides";
      document.body.dataset.generatedTemplate = page?.layout?.template || "";
      document.body.classList.toggle("generated-page-active", Boolean(page));
      $("kicker").textContent = config.kicker;
      $("title").textContent = title;
      $("visual-label").textContent = page?.layout?.template?.replace(/_/g, " ") || config.visualLabel;
      $("visual-copy").textContent = page?.thesis?.summary || config.visualCopy;
      $("feed-label").textContent = config.feedLabel;
      renderCommandPanel();
      renderPitchMorph();
      requestAnimationFrame(() => {
        startShareReplay();
        maybeRunInitialPrompt();
      });
      renderMetrics();
      renderFeed();
      renderStage();
      renderMiniVisual();
      renderPulseStrip();
      renderStageThesis();
      renderSmallMultiples();
      renderEvidenceStack();
      renderProvenanceChip();
      renderLensChip();
      renderNarrationTicker();
      renderActionRail();
      renderGeneratedRail();
      renderGeneratedPage();
      renderGeneratedModal();
      updateClock();
      runIntroMotion();
      loadLiveData();
      if (!dashboardRendered) {
        dashboardRendered = true;
        setInterval(tickDashboard, 4200);
        setInterval(updateClock, 10000);
        setInterval(loadLiveData, 12000);
      }
    }

    function renderBlankDashboard() {
      const title = baseChannelTitle || config.title || "Katechon";
      document.title = `${title} - Katechon`;
      document.documentElement.classList.add("blank-dashboard-root");
      document.body.classList.add("blank-dashboard");
      document.body.classList.remove("generated-page-active", "pitch-morph-active", "has-command-panel", "replay-stage", "replay-provenance", "replay-next");
      document.body.dataset.generatedView = "blank";
      document.body.dataset.generatedMode = "blank";
      document.body.dataset.generatedTemplate = "";
      const overrideStyle = document.getElementById("dashboard-voice-override-css");
      if (overrideStyle) overrideStyle.textContent = "";
      $("title").textContent = title;
      [
        "kicker",
        "command-status",
        "visual-label",
        "visual-copy",
        "feed-label",
        "pulse-kicker",
        "pulse-now",
        "pulse-delta",
        "pulse-range",
        "thesis-headline",
        "thesis-trail",
        "thesis-big",
        "thesis-small",
        "source-chip",
        "clock",
        "evidence-label",
        "evidence-chip",
      ].forEach((id) => {
        const node = $(id);
        if (node) node.textContent = "";
      });
      [
        "metrics",
        "pulse-cells",
        "small-multiples",
        "feed",
        "evidence-cards",
        "generated-rail",
        "generated-page",
        "generated-breadcrumb",
        "pitch-morph",
        "generated-modal",
      ].forEach((id) => {
        const node = $(id);
        if (!node) return;
        node.innerHTML = "";
        if ("hidden" in node) node.hidden = true;
      });
      ["command-panel", "provenance-chip", "lens-chip", "narration-ticker"].forEach((id) => {
        const node = $(id);
        if (node && "hidden" in node) node.hidden = true;
      });
      if (config.stageQuote) {
        $("stage").innerHTML = cleanBackdropHtml() + stageQuoteHtml(config.stageQuote);
        runSceneMotion();
      } else if (config.renderScene && customRenderers[dashboardId]) {
        $("stage").innerHTML = customRenderers[dashboardId]({
          dashboardId,
          config,
          state,
          helpers: { appUrl, bars: null, escapeHtml, lines: null, metricText: null, nodes: null, seededValue },
        });
        runSceneMotion();
      } else {
        renderBlankStage();
      }
      if (!dashboardRendered) dashboardRendered = true;
    }

    function renderMetrics() {
      $("metrics").innerHTML = visibleMetrics().map(([label, value, note], index) => {
        const spark = metricSparkValues(index);
        const delta = metricDelta(spark);
        const toneCls = delta.dir === "down" ? "is-down" : "";
        return `<article class="metric spark-tile ${toneCls}" data-testid="metric-tile">
          <div class="metric-label">${escapeHtml(label || `signal ${index + 1}`)}</div>
          <div class="metric-row">
            <div class="metric-value">${escapeHtml(value || "—")}</div>
            <div class="metric-delta ${delta.dir}">${escapeHtml(delta.text)}</div>
          </div>
          ${sparklineSvg(spark, { width: 220, height: 22 }).replace("<svg ", "<svg class=\"metric-spark spark\" ")}
          ${note ? `<div class="metric-note">${escapeHtml(note)}</div>` : ""}
        </article>`;
      }).join("");
      updateMiniFocus();
    }

    /* Cockpit-zone renderers (additive) */
    function renderPulseStrip() {
      const node = $("pulse-strip");
      if (!node) return;
      const payload = pulseSourceData();
      const cells = pulseStripCells(payload);
      $("pulse-kicker").textContent = `${payload.label}${payload.live ? "" : " · simulated backup"}`;
      $("pulse-now").textContent = cells.now;
      $("pulse-cells").innerHTML = cells.html;
      const deltaEl = $("pulse-delta");
      deltaEl.textContent = cells.delta.text;
      deltaEl.className = `delta ${cells.delta.dir}`;
      $("pulse-range").textContent = cells.range;
    }

    function renderStageThesis() {
      const node = $("stage-thesis");
      if (!node) return;
      const t = thesisLine();
      const f = thesisFigure();
      const headline = t.headline.length > 220 ? `${t.headline.slice(0, 217)}…` : t.headline;
      $("thesis-headline").innerHTML = `<strong>${escapeHtml((headline.split(/[.;:—–-]/)[0] || "").trim().slice(0, 80))}</strong>${headline.length > 80 ? `&nbsp;${escapeHtml(headline.slice((headline.split(/[.;:—–-]/)[0] || "").length).trim().slice(0, 200))}` : ""}`;
      $("thesis-trail").innerHTML = t.trail.map((segment, i) => `${i > 0 ? '<span class="pip"></span>' : ""}<span>${escapeHtml(segment)}</span>`).join("");
      const big = $("thesis-big");
      big.textContent = f.big;
      big.className = `big ${f.dir}`;
      $("thesis-small").textContent = f.small;
    }

    function renderSmallMultiples() {
      const node = $("small-multiples");
      if (!node) return;
      const items = smallMultiplesPlan();
      node.innerHTML = smallMultiplesHtml(items);
    }

    function renderEvidenceStack() {
      const cardsNode = $("evidence-cards");
      if (!cardsNode) return;
      const cards = evidenceFieldsForChannel();
      cardsNode.innerHTML = cards.map(evidenceCardHtml).join("");
      const chip = $("evidence-chip");
      if (chip) {
        const label = freshnessLabel(state.livePayload?.freshness || state.livePayload?.dataBinding?.freshness || (state.livePayload?.stale ? "cached" : "unavailable"));
        chip.textContent = `${cards.length} cards · ${label}`;
      }
      const label = $("evidence-label");
      if (label) label.textContent = `${config.lens || "evidence rail"}`;
    }

    function renderProvenanceChip() {
      const chip = $("provenance-chip");
      if (!chip) return;
      const p = provenanceState();
      chip.hidden = false;
      chip.className = `provenance-chip is-${p.kind}`;
      $("provenance-source").textContent = p.label;
      $("provenance-meta").textContent = `${p.age}`;
    }

    function renderLensChip() {
      const chip = $("lens-chip");
      if (!chip) return;
      const lens = config.lens || (config.scene || "").replace(/-/g, " ");
      if (!lens) { chip.hidden = true; return; }
      chip.hidden = false;
      $("lens-text").textContent = lens;
    }

    function renderNarrationTicker() {
      const ticker = $("narration-ticker");
      if (!ticker) return;
      const message = state.commandStatus || (state.lastPrompt ? `last prompt: ${state.lastPrompt}` : "");
      if (!message) { ticker.hidden = true; return; }
      ticker.hidden = false;
      $("narration-line").textContent = message;
      ticker.classList.toggle("has-update", state.commandRunning || /(generated|share|building|replaying|restoring)/i.test(message));
    }

    function renderActionRail() {
      const rail = $("action-rail");
      if (!rail) return;
      const prompts = actionPromptsForCockpit();
      const list = $("action-rail-prompts");
      if (!list) return;
      if (!prompts.length) {
        rail.classList.add("is-empty");
        list.innerHTML = "";
        return;
      }
      rail.classList.remove("is-empty");
      list.innerHTML = prompts.map((p) =>
        `<button class="action-chip-btn prompt-chip" type="button" data-testid="channel-hero-prompt" data-prompt="${escapeHtml(p)}" title="${escapeHtml(p)}">${escapeHtml(p.length > 80 ? p.slice(0, 78) + "…" : p)}</button>`
      ).join("");
      list.querySelectorAll("[data-prompt]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const value = btn.getAttribute("data-prompt") || "";
          const input = $("command-input");
          if (input) input.value = value;
          trackLaunchEvent("prompt_clicked", { prompt: value, source: "cockpit-action" });
          runChannelCommand(value);
        });
      });
      const shareBtn = $("action-rail-share");
      if (shareBtn) shareBtn.onclick = () => shareChannelState();
    }

    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;
      const message = event.data || {};
      if (message.dashboard && message.dashboard !== dashboardId) return;
      if (isDunePitchMorphMessage(message)) {
        activateDunePitchMorph(message.prompt || message.text || "", { allowTopicOnly: true });
        return;
      }
      if (message.type === "watch-run-prompt") {
        const targeted = Boolean(message.target);
        if (targeted) updateKatTargetStatus("building voice mutation");
        runChannelCommand(message.prompt || "", { target: message.target || null, source: message.source || "watch-run-prompt" })
          .finally(() => {
            if (targeted) hideKatTargetModal();
          });
      }
      if (message.type === "watch-share-state") {
        shareChannelState();
      }
      if (message.type === "kat-target-voice-status") {
        if (message.status === "listening") $("kat-target-voice")?.classList.add("listening");
        else $("kat-target-voice")?.classList.remove("listening");
        updateKatTargetStatus(message.label || message.status || "");
      }
    });

    function renderFeed() {
      $("feed").innerHTML = state.feed.map(([time, title, meta], index) => `
        <article class="feed-item ${index === state.activeFeed ? "active" : ""}" data-index="${index}">
          <div class="feed-time">${escapeHtml(time)}</div>
          <div class="feed-title">${escapeHtml(title)}</div>
          <div class="feed-meta">${escapeHtml(meta)}</div>
        </article>
      `).join("");
      document.querySelectorAll(".feed-item").forEach((item) => {
        item.addEventListener("click", () => {
          state.activeFeed = Number(item.dataset.index);
          renderFeed();
          animate(item, { x: [8, 0], scale: [1.01, 1], duration: 420, ease: "out(3)" });
        });
      });
      updateMiniFocus();
    }

    function bindingRows(binding) {
      if (binding === "liveSummary.metrics" || binding === "dashboard.metrics") return visibleMetrics();
      if (binding === "liveSummary.feed" || binding === "dashboard.feed") return state.feed.slice(0, 5);
      if (binding === "liveSummary.highlights") {
        return state.feed.slice(0, 4).map((item, index) => [`0${index + 1}`, item[1] || "", item[2] || "highlight"]);
      }
      return [];
    }

    function componentRows(component) {
      const bound = bindingRows(component.binding);
      if (bound.length) return bound;
      if (Array.isArray(component.rows) && component.rows.length) return component.rows;
      if (Array.isArray(component.metrics) && component.metrics.length) return component.metrics;
      return [];
    }

    function componentItems(component) {
      if (Array.isArray(component.items) && component.items.length) return component.items;
      if (component.binding === "liveSummary.highlights") return state.feed.slice(0, 4).map(item => item[1]).filter(Boolean);
      return [];
    }

    function generatedComponents() {
      const slots = state.generated.slots || {};
      const page = activeGeneratedPage();
      const pageComponents = page
        ? [...(page.stage?.components || []), ...(page.rail || [])]
        : [];
      return [...generatedSlotNames.flatMap((slot) => slots[slot] || []), ...pageComponents];
    }

    function componentByGeneratedId(id) {
      return generatedComponents().find(component => String(component.id || "") === String(id || "")) || null;
    }

    function numericValue(value) {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      const parsed = Number(String(value || "").replace(/[$,%\s,]/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function compactMoney(value) {
      const n = numericValue(value);
      if (!n) return "n/a";
      if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
      if (Math.abs(n) >= 1000) return `$${Math.round(n / 1000)}K`;
      return `$${Math.round(n).toLocaleString()}`;
    }

    function candleLabel(candle, index, component) {
      if (candle.label) return String(candle.label).includes("T")
        ? String(candle.label).slice(5, 10)
        : String(candle.label).slice(0, 16);
      const timestamp = Number(candle.t || candle.time);
      if (!Number.isFinite(timestamp)) return String(index + 1);
      const interval = String(component.chart?.query?.interval || candle.i || "").toLowerCase();
      const iso = new Date(timestamp).toISOString();
      if (/(?:^|[^0-9])\d+d$/.test(interval) || interval === "1d") return iso.slice(5, 10);
      if (/(?:^|[^0-9])\d+h$/.test(interval)) return iso.slice(5, 13).replace("T", " ");
      return iso.slice(11, 16);
    }

    function liveCollectionChartRows(collection, limit = 48) {
      if (!collection?.rows?.length) return [];
      return collection.rows.slice(0, limit).map((row, index, rows) => ({
        index,
        label: liveRecordTitle(row, index).slice(0, 42),
        title: liveRecordTitle(row, index),
        meta: liveRecordMeta(row, collection.provider),
        group: liveRecordGroup(row, collection.provider),
        value: liveRecordMetricValue(collection, row, index, 0, rows.length),
        score: liveRecordMetricValue(collection, row, index, 0, rows.length),
        secondary: liveRecordMetricValue(collection, row, index, 1, rows.length),
        tertiary: liveRecordMetricValue(collection, row, index, 2, rows.length),
        barPct: liveRecordBarPct(collection, row, index, rows.length),
      }));
    }

    function chartRowsForBinding(component) {
      const chart = component.chart || {};
      const binding = chart.binding || component.binding || "none";
      const data = component._chartPayload?.data || state.livePayload?.data || {};
      if (Array.isArray(chart.data) && chart.data.length) return chart.data.slice(0, 96);

      const liveCollectionMatch = String(binding).match(/^liveData\.(articles|items|hn|studies|objects|papers|sensors|datasets|runs|slides|arenaBoards|frontierModels|capabilityMatrix|polymarketMarkets|marketSignals|divergence|technologyStack|runtimeLoop|contentSeeds|records)$/);
      if (liveCollectionMatch) {
        const collection = liveCollectionFromData(data, liveCollectionMatch[1] === "records" ? "" : liveCollectionMatch[1]);
        return liveCollectionChartRows(collection);
      }

      if (binding === "liveData.candles" && Array.isArray(data.candles)) {
        const candles = data.candles.slice(-48);
        const closes = candles.map(candle => numericValue(candle.c || candle.close));
        return candles.map((candle, index) => {
          const open = numericValue(candle.o || candle.open);
          const high = numericValue(candle.h || candle.high);
          const low = numericValue(candle.l || candle.low);
          const close = closes[index];
          const windowStart = Math.max(0, index - 7);
          const smaWindow = closes.slice(windowStart, index + 1).filter(value => Number.isFinite(value));
          const sma = smaWindow.length ? smaWindow.reduce((sum, value) => sum + value, 0) / smaWindow.length : close;
          return {
            index,
            label: candleLabel(candle, index, component),
            open,
            high,
            low,
            close,
            sma,
            volume: numericValue(candle.v || candle.volume),
            returnPct: open ? ((close - open) / open) * 100 : 0,
            rangePct: low ? ((high - low) / low) * 100 : 0,
          };
        });
      }

      if (binding === "liveData.book" && Array.isArray(data.book?.levels)) {
        const bids = Array.isArray(data.book.levels[0]) ? data.book.levels[0].slice(0, 10) : [];
        const asks = Array.isArray(data.book.levels[1]) ? data.book.levels[1].slice(0, 10) : [];
        return [
          ...bids.map((level, index) => ({ side: "bid", label: `B${index + 1}`, price: numericValue(level.px), size: numericValue(level.sz), notional: numericValue(level.px) * numericValue(level.sz) })),
          ...asks.map((level, index) => ({ side: "ask", label: `A${index + 1}`, price: numericValue(level.px), size: numericValue(level.sz), notional: numericValue(level.px) * numericValue(level.sz) })),
        ];
      }

      if (binding === "liveData.series" && Array.isArray(data.series)) {
        return data.series.slice(-48).map((row, index) => ({
          index,
          label: row.label || (row.time ? new Date(Number(row.time)).toISOString().slice(5, 13).replace("T", " ") : String(index + 1)),
          loadMw: numericValue(row.loadMw),
          forecastMw: numericValue(row.forecastMw),
          stressPct: numericValue(row.stressPct),
          marginPct: numericValue(row.operatingMarginPct),
          frequencyHz: numericValue(row.frequencyHz),
        }));
      }

      if (binding === "liveData.markets" && Array.isArray(data.markets)) {
        return data.markets.slice(0, 12).map((market, index) => ({
          index,
          label: String(market.question || market.title || `Market ${index + 1}`).slice(0, 42),
          yes: numericValue(market.yes) * 100,
          no: numericValue(market.no) * 100,
          volume: numericValue(market.volume),
        }));
      }

      if (binding === "liveData.tokens" && Array.isArray(data.tokens)) {
        return data.tokens.slice(0, 12).map((token, index) => ({
          index,
          label: String(token.symbol || token.name || `Token ${index + 1}`).toUpperCase().slice(0, 16),
          change: numericValue(token.change1h || token.change24h),
          price: numericValue(token.price),
          marketCap: numericValue(token.marketCapUsd || token.marketCap),
          liquidityUsd: numericValue(token.liquidityUsd),
          volume24hUsd: numericValue(token.volume24hUsd),
          attentionScore: numericValue(token.attentionScore),
          liquidityRisk: numericValue(token.liquidityRisk),
          fragilityScore: numericValue(token.fragilityScore),
          decayScore: numericValue(token.decayScore),
        }));
      }

      if (binding === "liveData.fuelMix" && Array.isArray(data.fuelMix)) {
        return data.fuelMix.slice(0, 10).map((fuel, index) => ({
          index,
          label: String(fuel.label || fuel.fueltype || `Fuel ${index + 1}`).slice(0, 24),
          value: numericValue(fuel.sharePct || fuel.mw),
          mw: numericValue(fuel.mw),
        }));
      }

      if (binding === "liveData.corridors" && Array.isArray(data.corridors)) {
        return data.corridors.slice(0, 10).map((corridor, index) => ({
          index,
          label: `${corridor.from || "A"}-${corridor.to || "B"}`.slice(0, 24),
          stressPct: numericValue(corridor.stressPct),
          mw: numericValue(corridor.mw),
        }));
      }

      if (binding === "liveSummary.metrics" || binding === "dashboard.metrics") {
        return visibleMetrics().map(([label, value, note], index) => ({ index, label, value: numericValue(value), note }));
      }

      if (binding === "liveSummary.feed" || binding === "dashboard.feed") {
        return state.feed.slice(0, 12).map(([time, title, meta], index) => ({ index, label: time || String(index + 1), value: index + 1, title, meta }));
      }

      return [];
    }

    function chartQuery(component) {
      const query = component.chart?.query;
      if (!query || typeof query !== "object") return "";
      const params = new URLSearchParams();
      if (query.coin) params.set("coin", String(query.coin).toUpperCase().replace(/[^A-Z0-9:_-]/g, "").slice(0, 18));
      if (query.interval) params.set("interval", String(query.interval).toLowerCase().replace(/[^0-9mhd]/g, "").slice(0, 4));
      if (query.lookbackHours) params.set("lookbackHours", String(Number(query.lookbackHours)));
      if (query.candles) params.set("candles", String(Number(query.candles)));
      if (query.startTime) params.set("startTime", String(query.startTime));
      if (query.endTime) params.set("endTime", String(query.endTime));
      if (query.respondent) params.set("respondent", String(query.respondent).toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 12));
      return params.toString();
    }

    async function ensureChartPayload(component) {
      const query = chartQuery(component);
      if (!query) return;
      if (component._chartPayloadKey === query && component._chartPayload && Date.now() - (component._chartPayloadAt || 0) < 12000) return;
      const url = `/api/channels/${encodeURIComponent(dashboardId)}/live?${query}`;
      const resp = await fetch(appUrl(url), { cache: "no-store" });
      if (!resp.ok) throw new Error(`chart live ${resp.status}`);
      component._chartPayload = await resp.json();
      component._chartPayloadKey = query;
      component._chartPayloadAt = Date.now();
    }

    function chartDefaults(component, rows) {
      const chart = component.chart || {};
      const binding = chart.binding || component.binding || "none";
      if (binding === "liveData.candles") {
        const type = chart.type || (chart.variant === "ohlc" ? "candlestick" : chart.variant === "volume" ? "volume" : "line");
        if (type === "volume") return { type, x: chart.x || "label", y: chart.y || "volume" };
        if (type === "candlestick") return { type, x: chart.x || "label", y: chart.y || "close" };
        if (type === "scatter") return { type, x: chart.x || "index", y: chart.y || "close" };
        if (chart.variant === "range") return { type: chart.type || "area", x: chart.x || "label", y: chart.y || "high", y2: chart.y2 || "low" };
        return { type, x: chart.x || "label", y: chart.y || "close", y2: chart.y2 };
      }
      if (binding === "liveData.book") return { type: chart.type || "market-depth", x: chart.x || "label", y: chart.y || "notional", color: chart.color || "side" };
      if (binding === "liveData.series") return { type: chart.type || "area", x: chart.x || "label", y: chart.y || "loadMw", y2: chart.y2 || "forecastMw" };
      if (binding === "liveData.markets") return { type: chart.type || "horizontal-bar", x: chart.x || "yes", y: chart.y || "label" };
      if (binding === "liveData.polymarketMarkets" || binding === "liveData.marketSignals") return { type: chart.type || "horizontal-bar", x: chart.x || "value", y: chart.y || "label" };
      if (binding === "liveData.arenaBoards" || binding === "liveData.frontierModels" || binding === "liveData.capabilityMatrix" || binding === "liveData.divergence") return { type: chart.type || "horizontal-bar", x: chart.x || "value", y: chart.y || "label" };
      if (binding === "liveData.tokens") return { type: chart.type || "bar", x: chart.x || "label", y: chart.y || "change" };
      if (binding === "liveData.fuelMix") return { type: chart.type || "bar", x: chart.x || "label", y: chart.y || "value" };
      if (binding === "liveData.corridors") return { type: chart.type || "bar", x: chart.x || "label", y: chart.y || "stressPct" };
      if (/^liveData\.(articles|items|hn|studies|objects|papers|sensors|datasets|runs|slides|technologyStack|runtimeLoop|contentSeeds|records)$/.test(binding)) return { type: chart.type || "horizontal-bar", x: chart.x || "value", y: chart.y || "label" };
      const first = rows[0] || {};
      return { type: chart.type || "bar", x: chart.x || "label", y: chart.y || (Object.prototype.hasOwnProperty.call(first, "value") ? "value" : "index") };
    }

    function cssToken(name, fallback) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    }

    function chartBaseSpec(rows, width, height) {
      const accent = cssToken("--accent", "#00e87b");
      const accent2 = cssToken("--accent2", "#7de8ff");
      const accent3 = cssToken("--accent3", "#ffbf5f");
      const text = cssToken("--text", "#f3f6f8");
      const muted = "rgba(243,246,248,0.56)";
      return {
        $schema: "https://vega.github.io/schema/vega/v6.json",
        background: "transparent",
        width,
        height,
        padding: { left: 36, right: 12, top: 12, bottom: 30 },
        autosize: { type: "fit", contains: "padding" },
        data: [{ name: "table", values: rows }],
        config: {
          axis: {
            domainColor: "rgba(255,255,255,0.14)",
            gridColor: "rgba(255,255,255,0.07)",
            labelColor: muted,
            labelFont: "SFMono-Regular, Consolas, monospace",
            labelFontSize: 9,
            tickColor: "rgba(255,255,255,0.14)",
            titleColor: muted,
            titleFont: "SFMono-Regular, Consolas, monospace",
            titleFontSize: 9,
          },
          style: { guideLabel: { fill: muted }, guideTitle: { fill: text } },
          range: { category: [accent, accent2, accent3, "#ff625f"] },
        },
      };
    }

    function buildVegaSpec(component, rows, width, height) {
      const defaults = chartDefaults(component, rows);
      const type = defaults.type;
      const x = defaults.x;
      const y = defaults.y;
      const y2 = defaults.y2;
      const color = defaults.color;
      const accent = cssToken("--accent", "#00e87b");
      const accent2 = cssToken("--accent2", "#7de8ff");
      const danger = cssToken("--danger", "#ff625f");
      const spec = chartBaseSpec(rows, width, height);
      const hasY2 = y2 && rows.some(row => Number.isFinite(Number(row[y2])));
      const yDomain = hasY2 ? { fields: [{ data: "table", field: y }, { data: "table", field: y2 }] } : { data: "table", field: y };
      const numericScale = { name: "y", type: "linear", domain: yDomain, nice: true, range: "height", zero: !["line", "candlestick"].includes(type) && !hasY2 };
      const xBand = { name: "x", type: "band", domain: { data: "table", field: x }, range: "width", padding: 0.22 };
      const xPoint = { name: "x", type: "point", domain: { data: "table", field: x }, range: "width", padding: 0.45 };
      const seriesFields = Array.isArray(component.chart?.seriesFields)
        ? component.chart.seriesFields.filter(field => rows.some(row => Number.isFinite(Number(row[field])))).slice(0, 6)
        : [];

      if ((type === "line" || type === "area") && seriesFields.length > 1) {
        spec.data = [
          { name: "table", values: rows },
          { name: "series", source: "table", transform: [{ type: "fold", fields: seriesFields, as: ["series", "value"] }] },
        ];
        spec.scales = [
          xPoint,
          { name: "y", type: "linear", domain: { data: "series", field: "value" }, nice: true, range: "height", zero: false },
          { name: "color", type: "ordinal", domain: seriesFields, range: [accent, accent2, cssToken("--accent3", "#ffbf5f"), danger, "#b993ff", "#62ffbd"] },
        ];
        spec.axes = [{ orient: "bottom", scale: "x", ticks: false, labelOverlap: "parity" }, { orient: "left", scale: "y", grid: true, ticks: false }];
        spec.legends = [{ stroke: "color", orient: "top-right", labelColor: "rgba(243,246,248,0.72)", labelFont: "SFMono-Regular, Consolas, monospace", labelFontSize: 9, symbolSize: 70 }];
        spec.marks = [{
          type: "group",
          from: { facet: { name: "seriesGroup", data: "series", groupby: "series" } },
          marks: [{
            type: "line",
            from: { data: "seriesGroup" },
            encode: {
              enter: {
                x: { scale: "x", field: x },
                y: { scale: "y", field: "value" },
                stroke: { scale: "color", field: "series" },
                strokeWidth: { value: 2 },
                strokeOpacity: { value: 0.86 },
                interpolate: { value: "monotone" },
                cursor: { value: "pointer" },
              },
              hover: { strokeWidth: { value: 3 } },
            },
          }],
        }];
        return spec;
      }

      if (type === "candlestick") {
        spec.padding = { left: 42, right: 14, top: 12, bottom: 30 };
        spec.scales = [
          xBand,
          { name: "y", type: "linear", domain: { fields: [{ data: "table", field: "high" }, { data: "table", field: "low" }] }, nice: true, range: "height", zero: false },
        ];
        spec.axes = [{ orient: "bottom", scale: "x", ticks: false, labelOverlap: "parity" }, { orient: "left", scale: "y", grid: true, ticks: false }];
        spec.marks = [
          {
            type: "rule",
            from: { data: "table" },
            encode: {
              enter: {
                x: { scale: "x", field: x, band: 0.5 },
                y: { scale: "y", field: "high" },
                y2: { scale: "y", field: "low" },
                strokeWidth: { value: 1 },
                strokeOpacity: { value: 0.72 },
                cursor: { value: "pointer" },
              },
              update: {
                stroke: [
                  { test: "datum.close >= datum.open", value: accent },
                  { value: danger },
                ],
              },
            },
          },
          {
            type: "rect",
            from: { data: "table" },
            encode: {
              enter: {
                x: { scale: "x", field: x },
                width: { scale: "x", band: 0.72 },
                y: { scale: "y", field: "open" },
                y2: { scale: "y", field: "close" },
                fillOpacity: { value: 0.72 },
                stroke: { value: "rgba(255,255,255,0.20)" },
                strokeWidth: { value: 0.5 },
                cornerRadius: { value: 2 },
                cursor: { value: "pointer" },
              },
              update: {
                fill: [
                  { test: "datum.close >= datum.open", value: accent },
                  { value: danger },
                ],
              },
              hover: { fillOpacity: { value: 1 } },
            },
          },
        ];
        return spec;
      }

      if (type === "volume") {
        spec.scales = [xBand, { name: "y", type: "linear", domain: { data: "table", field: y }, nice: true, range: "height", zero: true }];
        spec.axes = [{ orient: "bottom", scale: "x", ticks: false, labelOverlap: "parity" }, { orient: "left", scale: "y", grid: true, ticks: false }];
        spec.marks = [{
          type: "rect",
          from: { data: "table" },
          encode: {
            enter: {
              x: { scale: "x", field: x },
              width: { scale: "x", band: 1 },
              y: { scale: "y", field: y },
              y2: { scale: "y", value: 0 },
              fillOpacity: { value: 0.68 },
              cornerRadius: { value: 3 },
              cursor: { value: "pointer" },
            },
            update: {
              fill: [
                { test: "datum.close >= datum.open", value: accent },
                { value: danger },
              ],
            },
            hover: { fillOpacity: { value: 1 } },
          },
        }];
        return spec;
      }

      if (type === "horizontal-bar") {
        const labelLimit = Math.max(96, Math.min(160, Math.floor(width * 0.26)));
        spec.padding = { left: labelLimit + 18, right: 22, top: 12, bottom: 28 };
        spec.scales = [
          { name: "x", type: "linear", domain: { data: "table", field: x }, nice: true, range: "width", zero: true },
          { name: "y", type: "band", domain: { data: "table", field: y }, range: "height", padding: 0.22 },
        ];
        spec.axes = [{ orient: "bottom", scale: "x", grid: true, ticks: false }, { orient: "left", scale: "y", ticks: false, labelLimit }];
        const colorField = color && /^[\w.]+$/.test(color) ? color : "";
        const fillUpdate = colorField ? {
          fill: [
            { test: `datum.${colorField} === 'sell' || datum.${colorField} === 'ask'`, value: danger },
            { test: `datum.${colorField} === 'buy' || datum.${colorField} === 'bid'`, value: accent2 },
            { value: accent },
          ],
          fillOpacity: { value: 0.82 },
        } : { fillOpacity: { value: 0.78 } };
        spec.marks = [{
          type: "rect",
          from: { data: "table" },
          encode: {
            enter: { y: { scale: "y", field: y }, height: { scale: "y", band: 1 }, x: { scale: "x", value: 0 }, x2: { scale: "x", field: x }, fill: { value: accent }, fillOpacity: { value: 0.72 }, cornerRadius: { value: 3 }, cursor: { value: "pointer" } },
            update: fillUpdate,
            hover: { fillOpacity: { value: 1 } },
          },
        }, {
          type: "text",
          from: { data: "table" },
          encode: {
            enter: {
              x: { scale: "x", field: x, offset: 6 },
              y: { scale: "y", field: y, band: 0.5 },
              align: { value: "left" },
              baseline: { value: "middle" },
              fill: { value: "rgba(243,246,248,0.72)" },
              font: { value: "SFMono-Regular, Consolas, monospace" },
              fontSize: { value: 10 },
              text: { signal: `datum.valueLabel ? datum.valueLabel : datum.${x} < 10 ? format(datum.${x}, ',.2f') : format(datum.${x}, ',.0f')` },
            },
          },
        }];
        return spec;
      }

      if (type === "market-depth") {
        spec.scales = [
          xBand,
          numericScale,
          { name: "sideColor", type: "ordinal", domain: ["bid", "ask"], range: [accent, danger] },
        ];
        spec.axes = [{ orient: "bottom", scale: "x", ticks: false, labelAngle: 0 }, { orient: "left", scale: "y", grid: true, ticks: false }];
        spec.marks = [{
          type: "rect",
          from: { data: "table" },
          encode: {
            enter: {
              x: { scale: "x", field: x },
              width: { scale: "x", band: 1 },
              y: { scale: "y", field: y },
              y2: { scale: "y", value: 0 },
              fill: { scale: "sideColor", field: color || "side" },
              fillOpacity: { value: 0.72 },
              cornerRadius: { value: 3 },
              cursor: { value: "pointer" },
            },
            hover: { fillOpacity: { value: 1 } },
          },
        }];
        return spec;
      }

      if (type === "line" || type === "area") {
        spec.scales = [xPoint, numericScale];
        spec.axes = [{ orient: "bottom", scale: "x", ticks: false, labelOverlap: "parity" }, { orient: "left", scale: "y", grid: true, ticks: false }];
        spec.marks = [];
        if (type === "area") {
          spec.marks.push({
            type: "area",
            from: { data: "table" },
            encode: {
              enter: { x: { scale: "x", field: x }, y: { scale: "y", field: y }, y2: hasY2 ? { scale: "y", field: y2 } : { scale: "y", value: 0 }, fill: { value: accent }, fillOpacity: { value: hasY2 ? 0.24 : 0.18 }, cursor: { value: "pointer" } },
            },
          });
        }
        spec.marks.push({
          type: "line",
          from: { data: "table" },
          encode: {
            enter: { x: { scale: "x", field: x }, y: { scale: "y", field: y }, stroke: { value: accent }, strokeWidth: { value: 2.2 }, interpolate: { value: "monotone" }, cursor: { value: "pointer" } },
          },
        });
        if (hasY2) {
          spec.marks.push({
            type: "line",
            from: { data: "table" },
            encode: {
              enter: { x: { scale: "x", field: x }, y: { scale: "y", field: y2 }, stroke: { value: accent2 }, strokeWidth: { value: 1.4 }, strokeOpacity: { value: 0.72 }, interpolate: { value: "monotone" }, cursor: { value: "pointer" } },
            },
          });
        }
        return spec;
      }

      if (type === "scatter") {
        spec.scales = [
          { name: "x", type: "linear", domain: { data: "table", field: x }, nice: true, range: "width", zero: false },
          numericScale,
        ];
        spec.axes = [{ orient: "bottom", scale: "x", grid: true, ticks: false }, { orient: "left", scale: "y", grid: true, ticks: false }];
        spec.marks = [{
          type: "symbol",
          from: { data: "table" },
          encode: {
            enter: { x: { scale: "x", field: x }, y: { scale: "y", field: y }, size: { value: 72 }, fill: { value: accent2 }, fillOpacity: { value: 0.72 }, stroke: { value: accent }, strokeWidth: { value: 1 }, cursor: { value: "pointer" } },
          },
        }];
        return spec;
      }

      spec.scales = [xBand, numericScale];
      spec.axes = [{ orient: "bottom", scale: "x", ticks: false, labelOverlap: "parity" }, { orient: "left", scale: "y", grid: true, ticks: false }];
      spec.marks = [{
        type: "rect",
        from: { data: "table" },
        encode: {
          enter: {
            x: { scale: "x", field: x },
            width: { scale: "x", band: 1 },
            y: { scale: "y", field: y },
            y2: { scale: "y", value: 0 },
            fill: { value: accent },
            fillOpacity: { value: 0.72 },
            cornerRadius: { value: 3 },
            cursor: { value: "pointer" },
          },
          hover: { fill: { value: accent2 }, fillOpacity: { value: 0.95 } },
        },
      }];
      return spec;
    }

    function fallbackChartHtml(rows) {
      if (!rows.length) {
        return `<div class="generated-chart-empty">No chart rows returned for this provider refresh.</div>`;
      }
      const values = rows.slice(0, 8).map(row => Math.max(8, Math.min(100, numericValue(row.value ?? row.score ?? row.secondary ?? row.tertiary ?? row.barPct ?? row.close ?? row.yesPct ?? row.yes ?? row.closeOddsPct ?? row.change ?? row.fillPct ?? row.freshnessScore ?? row.lastTradeSol ?? row.attentionScore ?? row.fragilityScore ?? row.decayScore ?? row.loadMw ?? row.stressPct))));
      const max = Math.max(...values, 1);
      return `<div class="generated-chart-fallback">${values.map(value => `<span style="height:${Math.max(10, value / max * 100).toFixed(0)}%"></span>`).join("")}</div>`;
    }

    function selectedDatumText(datum) {
      if (!datum || typeof datum !== "object") return "";
      const label = datum.label ?? datum.index ?? "point";
      const fields = ["valueLabel", "close", "sma", "open", "high", "low", "volume", "notional", "yesPct", "closeOddsPct", "score", "secondary", "tertiary", "yes", "change", "fillPct", "freshnessScore", "ageSec", "lastTradeSol", "tradeType", "attentionScore", "liquidityRisk", "fragilityScore", "decayScore", "loadMw", "stressPct", "value"]
        .filter(key => datum[key] !== undefined && datum[key] !== null)
        .slice(0, 4)
        .map(key => `${key} ${typeof datum[key] === "number" ? Number(datum[key]).toLocaleString(undefined, { maximumFractionDigits: 4 }) : datum[key]}`);
      return `${label}${fields.length ? ` / ${fields.join(" / ")}` : ""}`;
    }

    function updateChartSelection(node, datum) {
      const text = selectedDatumText(datum);
      if (!text) return;
      const selection = node.closest(".generated-component")?.querySelector(".generated-chart-selection");
      if (!selection) return;
      selection.textContent = text;
      selection.hidden = false;
    }

    async function renderGeneratedCharts() {
      const nodes = Array.from(document.querySelectorAll(".generated-chart[data-generated-id]"));
      if (!nodes.length) return;
      for (const node of nodes) {
        const component = componentByGeneratedId(node.dataset.generatedId);
        if (!component) continue;
        try {
          await ensureChartPayload(component);
        } catch (_) {}
        const rows = chartRowsForBinding(component);
        if (!rows.length || typeof window.vega?.View !== "function" || typeof window.vega?.parse !== "function") {
          node.innerHTML = fallbackChartHtml(rows);
          continue;
        }
        const width = Math.max(160, Math.floor(node.clientWidth || 320));
        const height = Math.max(118, Math.floor(node.clientHeight || 160));
        try {
          node.innerHTML = "";
          const spec = buildVegaSpec(component, rows, width, height);
          const view = new window.vega.View(window.vega.parse(spec), {
            renderer: "canvas",
            container: node,
            hover: true,
          });
          await view.runAsync();
          view.addEventListener("click", (event, item) => {
            if (item?.datum) updateChartSelection(node, item.datum);
          });
          animate(node, { opacity: [0.65, 1], scale: [0.985, 1], duration: 520, ease: "out(3)" });
        } catch (err) {
          node.innerHTML = fallbackChartHtml(rows);
        }
      }
    }

    function generatedMetricsHtml(rows) {
      if (!rows.length) return "";
      return `<div class="generated-metrics">${rows.map(([label, value, note]) => `
        <article class="generated-metric">
          <div class="generated-row-k">${escapeHtml(label)}</div>
          <div class="generated-metric-value">${escapeHtml(value)}</div>
          <div class="generated-metric-note">${escapeHtml(note || "")}</div>
        </article>
      `).join("")}</div>`;
    }

    function generatedRowsHtml(rows) {
      if (!rows.length) return "";
      return `<div class="generated-rows">${rows.map(([time, title, meta]) => `
        <article class="generated-row">
          <div class="generated-row-k">${escapeHtml(time)}</div>
          <div class="generated-row-v">${escapeHtml(title)}</div>
          <div class="generated-row-m">${escapeHtml(meta || "")}</div>
        </article>
      `).join("")}</div>`;
    }

    function generatedItemsHtml(items) {
      if (!items.length) return "";
      return `<div class="generated-list">${items.map(item => `<div class="generated-item">${escapeHtml(item)}</div>`).join("")}</div>`;
    }

    function generatedSourceHtml(component) {
      const source = component.sourceState && typeof component.sourceState === "object" ? component.sourceState : null;
      const provenanceIds = Array.isArray(component.provenanceIds) ? component.provenanceIds : [];
      if (!source && !provenanceIds.length) return "";
      const sourceType = String(source?.sourceType || "derived_from_api").replace(/[^\w-]/g, "");
      const label = source?.label || freshnessLabel(source?.freshness || (source?.stale || sourceType === "cached_api" ? "cached" : sourceType === "unavailable" ? "unavailable" : "live"));
      const meta = source?.provider || component.dataBinding?.providerIds?.[0] || (provenanceIds.length ? "details available" : "source attached");
      return `
        <div class="generated-source generated-source-${escapeHtml(sourceType)}" data-testid="generated-source">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(meta)}</span>
        </div>
      `;
    }

    function generatedComponentHtml(component) {
      const rows = componentRows(component);
      const items = componentItems(component);
      const isMetric = component.type === "metric-strip" || component.type === "market-widget";
      const isRows = ["event-timeline", "source-confidence"].includes(component.type);
      const isChart = component.type === "vega-chart";
      const componentId = escapeHtml(component.id || "");
      return `
        <article class="generated-component generated-${escapeHtml(component.type || "component")}" data-testid="generated-component" data-generated-id="${componentId}">
          ${component.eyebrow ? `<div class="generated-eyebrow">${escapeHtml(component.eyebrow)}</div>` : ""}
          ${generatedSourceHtml(component)}
          ${component.title ? `<div class="generated-title">${escapeHtml(component.title)}</div>` : ""}
          ${component.value ? `<div class="generated-metric-value">${escapeHtml(component.value)}</div>` : ""}
          ${component.body ? `<div class="generated-body">${escapeHtml(component.body)}</div>` : ""}
          ${isChart ? `<div class="generated-chart-shell"><div class="generated-chart" data-testid="generated-chart" data-generated-id="${componentId}"></div></div>` : ""}
          ${isChart ? `<div class="generated-chart-selection" hidden></div>` : ""}
          ${isMetric ? generatedMetricsHtml(rows) : ""}
          ${isRows ? generatedRowsHtml(rows) : ""}
          ${!isChart && !isMetric && !isRows && rows.length ? generatedRowsHtml(rows) : ""}
          ${generatedItemsHtml(items)}
          ${component.note ? `<div class="generated-note">${escapeHtml(component.note)}</div>` : ""}
        </article>
      `;
    }

    function generatedPageSourceHtml(page) {
      const source = page?.sourceState && typeof page.sourceState === "object" ? page.sourceState : null;
      const latestProvenance = Array.isArray(page?.provenance) ? page.provenance[page.provenance.length - 1] : null;
      const sourceType = String(source?.sourceType || latestProvenance?.sourceType || "derived_from_api").replace(/[^\w-]/g, "");
      const label = source?.label || freshnessLabel(source?.freshness || latestProvenance?.freshness || (source?.stale || latestProvenance?.stale || sourceType === "cached_api" ? "cached" : sourceType === "unavailable" ? "unavailable" : "live"));
      const rowCount = latestProvenance?.rowCount !== undefined ? `<span>${escapeHtml(latestProvenance.rowCount)} rows</span>` : "";
      const provider = source?.provider || latestProvenance?.provider || page?.dataBinding?.providerIds?.[0] || "details available";
      return `
        <div class="generated-page-source generated-source generated-source-${escapeHtml(sourceType)}" data-testid="generated-source">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(provider)}</span>
          ${rowCount}
        </div>
      `;
    }

    function renderGeneratedBreadcrumb() {
      const node = document.getElementById("generated-breadcrumb");
      if (!node) return;
      const page = activeGeneratedPage();
      if (!page) {
        node.hidden = true;
        node.innerHTML = "";
        return;
      }
      const ancestry = Array.isArray(page.ancestry) && page.ancestry.length
        ? page.ancestry
        : [{ depth: 0, stateId: `base:${dashboardId}`, label: config.title || dashboardId }];
      const currentLabel = page.thesis?.title || (page.layout?.template || "generated").replace(/_/g, " ");
      const crumbs = [
        ...ancestry,
        { depth: page.depth || ancestry.length, stateId: page.stateId || "", label: currentLabel, current: true },
      ];
      node.hidden = false;
      node.dataset.depth = String(page.depth ?? 0);
      node.innerHTML = crumbs
        .map((entry, index) => {
          const sep = index > 0 ? `<span class="generated-breadcrumb-sep" aria-hidden="true">${"&gt;".repeat(Math.max(1, entry.depth || index))}</span>` : "";
          const isCurrent = entry.current === true || index === crumbs.length - 1;
          const attrs = isCurrent
            ? `aria-current="page" disabled`
            : `data-back-depth="${escapeHtml(String(entry.depth ?? 0))}"`;
          return `${sep}<button type="button" class="generated-breadcrumb-step" data-testid="generated-breadcrumb-step" ${attrs}>${escapeHtml(entry.label || `Depth ${entry.depth ?? 0}`)}</button>`;
        })
        .join("");
      node.querySelectorAll("[data-back-depth]").forEach((button) => {
        button.addEventListener("click", () => {
          const target = Number(button.dataset.backDepth);
          if (Number.isFinite(target)) goBackToDepth(target);
        });
      });
    }

    async function goBackToDepth(toDepth) {
      if (state.commandRunning) return;
      const target = Math.max(0, Math.floor(Number(toDepth) || 0));
      state.commandRunning = true;
      setCommandStatus(target === 0 ? "returning to base channel" : `restoring depth ${target}`);
      try {
        const resp = await fetch(appUrl(`/api/channels/${encodeURIComponent(dashboardId)}/back`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: `prototype-${dashboardId}`, toDepth: target }),
        });
        const payload = await resp.json().catch(() => ({}));
        if (!resp.ok || payload.ok === false) throw new Error(payload.error || `back ${resp.status}`);
        state.generated = normalizeGeneratedDashboard(payload.generated || (payload.state && payload.state.generated));
        trackLaunchEvent("depth_navigated", { toDepth: target, source: "breadcrumb" });
        setCommandStatus(target === 0 ? "base channel restored" : `depth ${target} restored`);
        render();
      } catch (err) {
        console.warn("channel back failed:", err);
        trackLaunchEvent("error_seen", { source: "breadcrumb", message: err.message || String(err) });
        setCommandStatus(`back failed: ${err.message || err}`);
      } finally {
        state.commandRunning = false;
        renderCommandPanel();
      }
    }

    function renderGeneratedPage() {
      const pageNode = $("generated-page");
      if (!pageNode) return;
      const page = activeGeneratedPage();
      if (!page) {
        pageNode.hidden = true;
        pageNode.innerHTML = "";
        renderGeneratedBreadcrumb();
        return;
      }
      const stageComponents = page.stage?.components || [];
      const railComponents = page.rail || [];
      const actions = Array.isArray(page.actions) ? page.actions : [];
      const hasChart = stageComponents.some((component) => component.type === "vega-chart");
      pageNode.hidden = false;
      pageNode.dataset.template = page.layout?.template || "";
      pageNode.dataset.stage = page.stage?.type || page.layout?.stage || "";
      pageNode.innerHTML = `
        <header class="generated-page-head" data-testid="generated-page-head">
          <div>
            <div class="generated-page-kicker">${escapeHtml((page.layout?.template || "generated_page").replace(/_/g, " "))}</div>
            <h2>${escapeHtml(page.thesis?.title || config.title)}</h2>
            ${page.thesis?.summary ? `<p>${escapeHtml(page.thesis.summary)}</p>` : ""}
          </div>
          ${generatedPageSourceHtml(page)}
        </header>
        <div class="generated-page-grid">
          <section class="generated-page-stage" data-testid="generated-page-stage" data-stage-type="${escapeHtml(page.stage?.type || "")}">
            <div class="generated-page-section-label">primary stage</div>
            <div class="generated-page-stage-body${hasChart ? " has-chart" : ""}" data-testid="generated-stage">
              ${stageComponents.map(generatedComponentHtml).join("")}
            </div>
          </section>
          <aside class="generated-page-rail" data-testid="generated-rail">
            <div class="generated-page-section-label">evidence rail</div>
            ${railComponents.map(generatedComponentHtml).join("")}
          </aside>
        </div>
        <footer class="generated-page-actions" data-testid="generated-page-actions">
          ${actions.map((prompt) => `<button class="generated-page-action" type="button" data-testid="channel-hero-prompt" data-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join("")}
          <button class="generated-page-action generated-page-share" type="button" data-testid="channel-share" data-share-current>Share</button>
        </footer>
      `;
      pageNode.querySelectorAll("[data-prompt]").forEach((button) => {
        button.addEventListener("click", () => runChannelCommand(button.dataset.prompt || button.textContent || ""));
      });
      pageNode.querySelector("[data-share-current]")?.addEventListener("click", () => shareChannelState());
      renderGeneratedBreadcrumb();
      requestAnimationFrame(renderGeneratedCharts);
    }

    function renderGeneratedRail() {
      const rail = $("generated-rail");
      if (!rail) return;
      if (activeGeneratedPage()) {
        rail.innerHTML = "";
        rail.classList.add("hidden");
        rail.closest(".rail")?.classList.remove("has-generated");
        return;
      }
      const components = state.generated.slots.rail || [];
      rail.innerHTML = components.map(generatedComponentHtml).join("");
      rail.classList.toggle("hidden", !components.length);
      rail.closest(".rail")?.classList.toggle("has-generated", Boolean(components.length));
      requestAnimationFrame(renderGeneratedCharts);
    }

    function clearGeneratedModal() {
      if (!state.generated.slots) state.generated.slots = {};
      state.generated.slots.modal = [];
      renderGeneratedModal();
    }

    function renderGeneratedModal() {
      const modal = $("generated-modal");
      if (!modal) return;
      const components = state.generated.slots.modal || [];
      if (!components.length) {
        modal.hidden = true;
        modal.innerHTML = "";
        return;
      }
      modal.hidden = false;
      modal.innerHTML = `
        <div class="generated-modal-backdrop" data-modal-close></div>
        <section class="generated-modal-panel" role="dialog" aria-modal="true" aria-label="Generated channel detail">
          <button class="generated-modal-close" type="button" aria-label="Close generated detail">&times;</button>
          <div class="generated-modal-content">${components.map(generatedComponentHtml).join("")}</div>
        </section>
      `;
      modal.querySelector(".generated-modal-close")?.addEventListener("click", clearGeneratedModal);
      modal.querySelector("[data-modal-close]")?.addEventListener("click", clearGeneratedModal);
      requestAnimationFrame(renderGeneratedCharts);
    }

    function generatedStageHtml() {
      if (activeGeneratedPage()) return "";
      const components = state.generated.slots.stageOverlay || [];
      if (!components.length) return "";
      const hasChart = components.some(component => component.type === "vega-chart");
      return `<div class="generated-stage${hasChart ? " has-chart" : ""}" data-testid="generated-stage">${components.map(generatedComponentHtml).join("")}</div>`;
    }

    function renderMiniVisual() {
      const mini = $("mini-visual");
      if (!mini) return;
      $("mini-label").textContent = miniLabel(config.scene);
      $("mini-chip").textContent = config.lens || config.scene.replace(/-/g, " ");
      mini.innerHTML = miniVisualHtml(config.scene);
      updateMiniFocus();
      runMiniMotion();
    }

    function updateMiniFocus() {
      const focus = $("mini-focus");
      if (!focus) return;
      const metrics = visibleMetrics();
      const metric = metrics[state.tick % Math.max(1, metrics.length)] || ["Signal", "live", ""];
      const feed = state.feed[state.activeFeed] || state.feed[0] || ["", "Monitoring active source state.", ""];
      focus.textContent = `${feed[1]} / ${metric[0]} ${metric[1]}`.trim();
    }

    function miniLabel(scene) {
      const labels = {
        newsroom: "source signal",
        "source-wall": "source signal",
        "market-mesh": "market signal",
        orderbook: "depth signal",
        prediction: "probability signal",
        "command-map": "map signal",
        "geo-signal": "regional signal",
        gridops: "grid signal",
        "bio-lab": "research signal",
        viralnet: "transmission signal",
        quantum: "state signal",
        observatory: "observation signal",
        abyss: "sensor signal",
        darkwatch: "catalog signal",
        arena: "match signal",
        meme: "social signal",
        "katechon-system": "platform signal",
      };
      return labels[scene] || "signal sketch";
    }

    function miniVisualHtml(scene) {
      if (scene === "market-mesh") return `<div class="mini-line-chart"></div>${miniBars(14)}`;
      if (scene === "orderbook") return `${miniBars(12)}${miniDepth()}`;
      if (scene === "prediction") return `${miniProbability()}`;
      if (scene === "newsroom" || scene === "source-wall") return miniSignalStack(4);
      if (scene === "command-map" || scene === "geo-signal") return `${miniNodes(10, "mini-map-node")}${miniLinks(7, "mini-map-line")}<div class="mini-gauge"></div>`;
      if (scene === "gridops") return `${miniNodes(9, "mini-map-node")}${miniLinks(9, "mini-map-line")}<div class="mini-gauge"></div>`;
      if (scene === "bio-lab") return `${miniDna()}${miniNodes(10, "mini-dot")}`;
      if (scene === "viralnet") return `${miniNodes(18, "mini-person")}${miniLinks(10, "mini-link")}`;
      if (scene === "quantum") return `<span class="mini-orbit"></span><span class="mini-orbit"></span>${miniNodes(12, "mini-qbit")}`;
      if (scene === "observatory") return `${miniNodes(26, "mini-star")}<span class="mini-orbit"></span><span class="mini-orbit"></span><div class="mini-line-chart"></div>`;
      if (scene === "abyss") return `${miniWaves()}${miniVents()}`;
      if (scene === "darkwatch") return `${miniNodes(32, "mini-star")}<div class="mini-silence"></div>`;
      if (scene === "arena") return `${miniSignalStack(4)}<div class="mini-gauge"></div>`;
      if (scene === "meme") return `<div class="mini-line-chart"></div>${miniNodes(20, "mini-person")}${miniLinks(8, "mini-link")}`;
      if (scene === "katechon-system") return `${miniSignalStack(5)}${miniNodes(12, "mini-map-node")}${miniLinks(9, "mini-link")}<div class="mini-gauge"></div>`;
      return `${miniNodes(10, "mini-map-node")}${miniLinks(7, "mini-map-line")}<div class="mini-gauge"></div>`;
    }

    function miniBars(count) {
      return `<div class="mini-bars">${Array.from({ length: count }, (_, index) => {
        const h = seededValue(index, 24, 94);
        const side = index % 5 === 2 ? " down" : "";
        return `<span class="mini-bar${side}" style="height:${h}%"></span>`;
      }).join("")}</div>`;
    }

    function miniDepth() {
      return `<div class="mini-depth">${Array.from({ length: 3 }, (_, index) => {
        const w = seededValue(index + 20, 44, 96);
        return `<span class="mini-depth-row" style="width:${w}%"></span>`;
      }).join("")}</div>`;
    }

    function miniSignalStack(count) {
      return `<div class="mini-stack">${Array.from({ length: count }, (_, index) => {
        const w = seededValue(index + 35, 42, 96);
        return `<span class="mini-signal-row" style="width:${w}%"></span>`;
      }).join("")}</div>`;
    }

    function miniNodes(count, className) {
      return Array.from({ length: count }, (_, index) => {
        const x = seededValue(index + 80, 8, 88);
        const y = seededValue(index + 110, 10, 84);
        const opacity = className === "mini-star" ? seededValue(index + 140, 0.35, 0.92).toFixed(2) : "1";
        return `<span class="${className}" style="left:${x}%;top:${y}%;opacity:${opacity}"></span>`;
      }).join("");
    }

    function miniLinks(count, className) {
      return Array.from({ length: count }, (_, index) => {
        const x = seededValue(index + 150, 8, 72);
        const y = seededValue(index + 170, 14, 78);
        const w = seededValue(index + 190, 18, 42);
        const r = seededValue(index + 210, -32, 32);
        return `<span class="${className}" style="left:${x}%;top:${y}%;width:${w}%;rotate:${r}deg"></span>`;
      }).join("");
    }

    function miniProbability() {
      const metric = visibleMetrics()[1] || visibleMetrics()[0] || ["", "50%", ""];
      const match = String(metric[1]).match(/\d+/);
      const value = match ? `${Math.max(1, Math.min(99, Number(match[0])))}%` : `${Math.round(seededValue(4, 35, 76))}%`;
      return `<span class="mini-prob-ring"></span><span class="mini-prob-ring"></span>${miniNodes(8, "mini-dot")}<strong class="mini-prob-label">${escapeHtml(value)}</strong>`;
    }

    function miniDna() {
      return `<div class="mini-dna">${Array.from({ length: 7 }, (_, index) => `<span style="top:${12 + index * 12}%"></span>`).join("")}</div>`;
    }

    function miniWaves() {
      return Array.from({ length: 4 }, (_, index) => `<span class="mini-wave" style="top:${16 + index * 17}%"></span>`).join("");
    }

    function miniVents() {
      return Array.from({ length: 4 }, (_, index) => {
        const h = seededValue(index + 240, 38, 84);
        return `<span class="mini-vent" style="left:${16 + index * 20}%;height:${h}px"></span>`;
      }).join("");
    }

    function backdropHtml() {
      const assetStyle = config.asset ? `style="--asset:url('${escapeHtml(appUrl(config.asset))}')"` : "";
      const asset = config.asset ? `<div class="asset-plane" ${assetStyle}></div>` : "";
      const video = config.video ? `<video class="texture-video" src="${escapeHtml(appUrl(config.video))}" autoplay muted loop playsinline preload="metadata"></video>` : "";
      return `${asset}${video}<div class="scene-grid"></div><div class="scan-line"></div>`;
    }

    function cleanBackdropHtml() {
      return `<div class="scene-grid"></div><div class="scan-line"></div>`;
    }

    function renderStage() {
      $("stage").innerHTML = (config.stageQuote ? cleanBackdropHtml() : backdropHtml()) + sceneHtml(config.scene) + generatedStageHtml();
      wireSceneInteractions();
      runSceneMotion();
      requestAnimationFrame(renderGeneratedCharts);
    }

    function renderBlankStage() {
      const stage = $("stage");
      if (!stage) return;
      if (dashboardId === "dune-deck") {
        stage.innerHTML = `
          <div class="blank-brand-lockup" aria-label="Katechon">
            <span class="blank-brand-ring blank-brand-ring-a" aria-hidden="true"></span>
            <span class="blank-brand-ring blank-brand-ring-b" aria-hidden="true"></span>
            <img class="blank-brand-wordmark" src="${escapeHtml(appUrl("brand/katechon-wordmark.svg"))}" alt="Katechon">
          </div>`;
        return;
      }
      stage.innerHTML = "";
    }

    function metricText(index) {
      const metrics = visibleMetrics();
      const metric = metrics[index % Math.max(1, metrics.length)] || ["Signal", "live", ""];
      return `<span class="source-label">${escapeHtml(metric[0])}</span><strong>${escapeHtml(metric[1])}</strong><span>${escapeHtml(metric[2])}</span>`;
    }

    function stageBadgesHtml(className = "") {
      return `<div class="stage-badges ${className}">
        ${visibleMetrics().map((_, index) => `<article class="stage-badge">${metricText(index)}<div class="bar"></div></article>`).join("")}
      </div>`;
    }

    function sceneHtml(scene) {
      const customRenderer = customRenderers[dashboardId] || customRenderers[scene];
      if (typeof customRenderer === "function") {
        return customRenderer({
          dashboardId,
          config,
          state,
          helpers: { appUrl, bars, escapeHtml, lines, metricText, nodes, seededValue },
        });
      }

      const renderers = {
        newsroom: renderNewsroom,
        "market-mesh": renderMarketMesh,
        "command-map": renderCommandMap,
        arena: renderArena,
        "source-wall": renderSourceWall,
        orderbook: renderOrderbook,
        prediction: renderPrediction,
        "bio-lab": renderBioLab,
        observatory: renderObservatory,
        "geo-signal": renderGeoSignal,
        meme: renderMeme,
        quantum: renderQuantum,
        abyss: renderAbyss,
        gridops: renderGridOps,
        viralnet: renderViralNet,
        darkwatch: renderDarkWatch,
        "katechon-system": renderKatechonSystem,
      };
      return (renderers[scene] || renderCommandMap)();
    }

    function bars(count, className = "bar") {
      return Array.from({ length: count }, (_, index) => {
        const h = seededValue(index, 22, 96);
        return `<div class="${className}" style="height:${h}%"></div>`;
      }).join("");
    }

    function nodes(count, className = "node") {
      return Array.from({ length: count }, (_, index) => {
        const x = seededValue(index, 6, 86);
        const y = seededValue(index + 50, 10, 86);
        return `<span class="${className}" style="left:${x}%;top:${y}%"></span>`;
      }).join("");
    }

    function lines(count, className = "line") {
      return Array.from({ length: count }, (_, index) => {
        const x = seededValue(index, 4, 70);
        const y = seededValue(index + 18, 12, 82);
        const w = seededValue(index + 26, 16, 42);
        const r = seededValue(index + 34, -34, 34);
        return `<span class="${className}" style="left:${x}%;top:${y}%;width:${w}%;rotate:${r}deg"></span>`;
      }).join("");
    }

    function renderNewsroom() {
      // Lead-story dossier with ranked sources, confidence bars, evidence timeline.
      const lead = state.feed[0] || ["", "Lead story holding.", "editorial"];
      const sources = state.feed.slice(0, 6).map((item, i) => {
        const conf = Math.round(seededValue(i + 11, 56, 96));
        const spark = Array.from({ length: 12 }, (_, j) => seededValue(i * 13 + j, 30, 100));
        return {
          name: item[1] || `source ${i + 1}`,
          source: item[2] || "newsroom",
          delta: `${conf}%`,
          barPct: conf,
          spark,
          tone: conf < 64 ? "is-warn" : "",
        };
      });
      return `<div class="dense-scene with-aside">
        <section class="dossier dense-panel">
          <div class="doss-eyebrow">lead story · ${escapeHtml(lead[0] || "now")}</div>
          <div class="doss-headline">${escapeHtml(lead[1])}</div>
          <div class="doss-list">
            ${state.feed.slice(0, 4).map((item, i) => `
              <div class="rank-row" style="grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.2fr) auto;">
                <div class="rk-name">${escapeHtml(item[1] || "")}<span class="rk-source">${escapeHtml(item[0] || "")}</span></div>
                <div class="rk-bar" style="--rk-w:${Math.round(seededValue(i + 22, 38, 92))}%"></div>
                <div class="rk-delta">${Math.round(seededValue(i + 30, 64, 92))}%</div>
              </div>
            `).join("")}
          </div>
        </section>
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">source stack</span>
            <span class="dense-panel-meta">${sources.length} sources · agreement</span>
          </div>
          <div class="dense-panel-body rank-list">
            ${sources.map(rankedRowHtml).join("")}
          </div>
        </section>
      </div>`;
    }

    function renderMarketMesh() {
      // Breadth × volatility quadrant + sector heat strip + ranked drivers.
      const data = state.livePayload?.data || {};
      const breadth = numericValue((visibleMetrics()[1] || ["", "60", ""])[1]) || 60;
      const volatility = numericValue((visibleMetrics()[2] || ["", "55", ""])[1]) || 55;
      const sectors = ["energy", "tech", "fin", "health", "ind", "stap", "disc", "util"];
      const drivers = (Array.isArray(data.candles) && data.candles.length ? data.candles.slice(-8) : Array.from({ length: 8 })).map((c, i) => {
        const ret = c ? numericValue(c.c ?? c.close) - numericValue(c.o ?? c.open) : seededValue(i, -2, 2);
        return {
          name: sectors[i] || `s${i + 1}`,
          source: "sector",
          delta: `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}`,
          barPct: 30 + Math.abs(ret) * 14,
          spark: Array.from({ length: 16 }, (_, j) => seededValue(i * 7 + j, -2, 2)),
          tone: ret < 0 ? "is-down" : "",
        };
      });
      return `<div class="dense-scene with-aside">
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">breadth × volatility</span>
            <span class="dense-panel-meta">b ${breadth.toFixed(0)} · v ${volatility.toFixed(0)}</span>
          </div>
          <div class="dense-panel-body" style="grid-template-rows:minmax(0,1fr) auto;gap:8px;">
            <div class="scatter-board" data-testid="market-scatter">
              <span class="sc-axis-x">breadth →</span>
              <span class="sc-axis-y">↑ vol</span>
              <span class="sc-frontier"></span>
              ${sectors.map((s, i) => {
                const x = Math.min(94, Math.max(6, seededValue(i + 7, 12, 92)));
                const y = Math.min(94, Math.max(6, 100 - seededValue(i + 12, 12, 92)));
                const cls = i === 0 ? "" : i === 1 ? "warn" : i === 2 ? "alert" : "";
                return `<span class="scatter-dot ${cls}" style="left:${x}%;top:${y}%"><span class="sc-label">${escapeHtml(s)}</span></span>`;
              }).join("")}
            </div>
            <div class="heat-strip">
              ${heatStripRowHtml("breadth", Array.from({ length: 24 }, (_, i) => seededValue(i + 50, 10, 100)))}
              ${heatStripRowHtml("vol pressure", Array.from({ length: 24 }, (_, i) => seededValue(i + 80, 8, 100)))}
            </div>
          </div>
        </section>
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">sector drivers</span>
            <span class="dense-panel-meta">8 / 24h</span>
          </div>
          <div class="dense-panel-body rank-list">
            ${drivers.map(rankedRowHtml).join("")}
          </div>
        </section>
      </div>`;
    }

    function renderCommandMap() {
      // SPECTRE event-cluster matrix: 8 clusters × 30-min cells, color = source confidence.
      const clusters = state.feed.slice(0, 8).concat(Array.from({ length: Math.max(0, 8 - state.feed.length) }));
      const cellsPerRow = 30;
      const matrix = clusters.map((item, i) => {
        const name = (item && item[1]) || `cluster ${i + 1}`;
        const meta = (item && item[2]) || "watchlist";
        const cells = Array.from({ length: cellsPerRow }, (_, c) => {
          const v = seededValue(i * 41 + c, 0, 1);
          const norm = v ** 0.6;
          const lvl = norm > 0.92 ? "l5" : norm > 0.78 ? "l4" : norm > 0.56 ? "l3" : norm > 0.32 ? "l2" : norm > 0.10 ? "l1" : "";
          const pinned = c === cellsPerRow - 1 ? " pinned" : "";
          return `<span class="cl-cell ${lvl}${pinned}"></span>`;
        }).join("");
        const conf = Math.round(seededValue(i + 7, 60, 96));
        return `<div class="cluster-row">
          <div class="cl-name">${escapeHtml(String(name).slice(0, 28))}<span class="cl-meta">${escapeHtml(String(meta).slice(0, 22))}</span></div>
          <div class="cl-cells">${cells}</div>
          <div class="cl-conf">${conf}%</div>
        </div>`;
      }).join("");
      const sources = Array.from({ length: 6 }, (_, i) => ({
        name: `source ${String.fromCharCode(65 + i)}`,
        source: i < 2 ? "OSINT" : i < 4 ? "social" : "field",
        delta: `${Math.round(seededValue(i + 90, 64, 96))}%`,
        barPct: seededValue(i + 90, 50, 96),
        spark: Array.from({ length: 14 }, (_, j) => seededValue(i * 11 + j, 30, 100)),
      }));
      return `<div class="dense-scene with-aside">
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">event cluster matrix</span>
            <span class="dense-panel-meta">${cellsPerRow} × 1m · ${clusters.length} clusters</span>
          </div>
          <div class="dense-panel-body cluster-matrix">${matrix}</div>
        </section>
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">source confidence</span>
            <span class="dense-panel-meta">${sources.length} weighted</span>
          </div>
          <div class="dense-panel-body rank-list">
            ${sources.map(rankedRowHtml).join("")}
          </div>
        </section>
      </div>`;
    }

    function renderArena() {
      const data = state.livePayload?.data || {};
      const boards = Array.isArray(data.arenaBoards) ? data.arenaBoards : [];
      const models = Array.isArray(data.frontierModels) ? data.frontierModels : [];
      const markets = Array.isArray(data.polymarketMarkets) ? data.polymarketMarkets : [];
      const columns = Array.isArray(data.boardColumns) && data.boardColumns.length
        ? data.boardColumns.slice(0, 5)
        : boards.filter((board) => board.preferred).slice(0, 5).map((board) => ({ id: board.id, label: board.label, domain: board.domain }));
      const leaders = columns.map((column) => {
        const board = boards.find((candidate) => candidate.id === column.id) || {};
        const leader = board.leaders?.[0] || {};
        return {
          label: column.label || board.label || column.id,
          domain: column.domain || board.domain || "arena",
          model: leader.modelName || "loading",
          org: leader.organization || "LMArena",
          rank: leader.rank || "—",
          rating: leader.rating || "—",
        };
      });
      const modelRows = models.slice(0, 7).map((model, index) => {
        const score = Math.max(12, Math.min(100, numericValue(model.topThreeCount) * 18 + numericValue(model.topTenCount) * 5 + Math.max(0, 18 - numericValue(model.avgRank))));
        return `<article class="rank-row" style="grid-template-columns:minmax(0,1.25fr) minmax(0,0.85fr) auto;">
          <div class="rk-name">${escapeHtml(model.label || model.modelName || `model ${index + 1}`)}<span class="rk-source">${escapeHtml(model.organization || "unknown")} · ${escapeHtml(model.license || "license n/a")}</span></div>
          <div class="rk-bar" style="--rk-w:${Math.round(score)}%"></div>
          <div class="rk-delta">#${escapeHtml(String(model.bestRank || "—"))}</div>
        </article>`;
      }).join("");
      const boardRows = leaders.map((leader) => {
        const score = numericValue(leader.rating);
        const width = score ? Math.max(22, Math.min(96, (score - 900) / 5)) : 42;
        return `<article class="rank-row" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) auto;">
          <div class="rk-name">${escapeHtml(leader.label)}<span class="rk-source">${escapeHtml(leader.model)} · ${escapeHtml(leader.org)}</span></div>
          <div class="rk-bar" style="--rk-w:${Math.round(width)}%"></div>
          <div class="rk-delta">${escapeHtml(String(leader.rating))}</div>
        </article>`;
      }).join("");
      const marketRows = markets.slice(0, 5).map((market) => {
        const yes = Math.round(numericValue(market.yesPct ?? market.yes));
        return `<article class="rank-row ${yes > 65 ? "is-warn" : ""}" style="grid-template-columns:minmax(0,1.35fr) auto;">
          <div class="rk-name">${escapeHtml(market.question || "AI market")}<span class="rk-source">${escapeHtml(market.volumeLabel || "n/a")} vol · ${escapeHtml((market.entities || []).join(", ") || "AI")}</span></div>
          <div class="rk-delta">${yes}%</div>
        </article>`;
      }).join("");
      return `<div class="dense-scene with-aside">
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">SOTA capability matrix</span>
            <span class="dense-panel-meta">${boards.length || "—"} Arena boards · ${models.length || "—"} models</span>
          </div>
          <div class="dense-panel-body" style="grid-template-rows:auto minmax(0,1fr);gap:8px;">
            <div class="rank-list">${boardRows || `<div class="rank-row"><div class="rk-name">awaiting LMArena rows<span class="rk-source">public dataset</span></div><div class="rk-delta">—</div></div>`}</div>
            <div class="rank-list">${modelRows || `<div class="rank-row"><div class="rk-name">frontier model matrix loading<span class="rk-source">server-side adapter</span></div><div class="rk-delta">—</div></div>`}</div>
          </div>
        </section>
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">model-release odds</span>
            <span class="dense-panel-meta">${markets.length || "—"} Polymarket rows</span>
          </div>
          <div class="dense-panel-body rank-list">
            ${marketRows || `<div class="rank-row"><div class="rk-name">awaiting AI market discovery<span class="rk-source">Polymarket Gamma</span></div><div class="rk-delta">—</div></div>`}
          </div>
        </section>
      </div>`;
    }

    function renderSourceWall() {
      // Glance: 4×3 source-card grid each with mini-vis + delta + freshness.
      const cells = Array.from({ length: 12 }, (_, index) => {
        const item = state.feed[index % state.feed.length] || ["", `source ${index + 1}`, "feed"];
        const change = seededValue(index + 5, -8, 12);
        const tone = change < -2 ? "is-down" : change > 6 ? "is-warn" : "";
        const spark = Array.from({ length: 14 }, (_, j) => seededValue(index * 17 + j, 20, 100));
        return `<article class="rank-row ${tone}" style="grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto auto; padding:8px 9px;">
          <div class="rk-name">${escapeHtml(item[1] || "—")}<span class="rk-source">${escapeHtml(item[0] || "")} · ${escapeHtml(item[2] || "")}</span></div>
          <div class="rk-bar" style="--rk-w:${Math.round(seededValue(index + 100, 28, 96))}%"></div>
          <div class="rk-delta">${change >= 0 ? "+" : ""}${change.toFixed(1)}</div>
          <div class="rk-spark">${sparklineSvg(spark, { width: 56, height: 18 })}</div>
        </article>`;
      }).join("");
      return `<div class="dense-scene full">
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">source mosaic</span>
            <span class="dense-panel-meta">12 sources · ranked by velocity</span>
          </div>
          <div class="dense-panel-body" style="grid-template-columns:1fr 1fr 1fr;display:grid;gap:6px;">
            ${cells}
          </div>
        </section>
      </div>`;
    }

    function renderKatechonSystem() {
      if (config.stageQuote) return stageQuoteHtml(config.stageQuote);
      const data = state.livePayload?.data || {};
      const stack = (Array.isArray(data.technologyStack) && data.technologyStack.length
        ? data.technologyStack
        : [
          { layer: "Channel runtime", role: "Normalized state, manifest, query, update, share, and replay routes.", status: "active" },
          { layer: "Kat continuity", role: "Voice-native guide that routes across channel agents and explains state.", status: "active" },
          { layer: "Specialist agents", role: "Domain planners for data, layouts, components, and provenance.", status: "scoped" },
          { layer: "Mutable surfaces", role: "Stage, rail, modal, evidence, and action slots replaced by validated specs.", status: "live" },
          { layer: "Share graph", role: "Replayable and forkable channel states instead of screenshots.", status: "building" },
        ]).slice(0, 6);
      const loop = (Array.isArray(data.runtimeLoop) && data.runtimeLoop.length
        ? data.runtimeLoop
        : [
          { step: "Watch", detail: "Open a channel and read current state.", signal: "live" },
          { step: "Command", detail: "Ask Kat for a sharper question or surface.", signal: "voice" },
          { step: "Query", detail: "Use channel capabilities against normalized data.", signal: "tools" },
          { step: "Morph", detail: "Replace the surface with validated components.", signal: "surface" },
          { step: "Share", detail: "Persist, replay, and fork the software state.", signal: "graph" },
        ]).slice(0, 6);
      const seeds = (Array.isArray(data.contentSeeds) && data.contentSeeds.length
        ? data.contentSeeds
        : state.feed.map((item) => ({ title: item[1], source: item[2], status: item[0] }))).slice(0, 5);
      const stackRows = stack.map((item, index) => rankedRowHtml({
        name: item.layer || item.title || `layer ${index + 1}`,
        source: item.role || item.detail || "Katechon runtime",
        delta: item.status || item.signal || "ready",
        barPct: 92 - index * 9,
        spark: Array.from({ length: 14 }, (_, j) => seededValue(index * 17 + j, 28, 94)),
      })).join("");
      const loopRows = loop.map((item, index) => `
        <article class="rank-row" style="grid-template-columns:minmax(0,0.55fr) minmax(0,1.45fr) auto;">
          <div class="rk-name">${escapeHtml(item.step || item.layer || `step ${index + 1}`)}<span class="rk-source">${escapeHtml(item.signal || item.status || "runtime")}</span></div>
          <div class="rk-name">${escapeHtml(item.detail || item.role || "state transition")}<span class="rk-source">${escapeHtml(index === 0 ? "entry" : `phase ${index + 1}`)}</span></div>
          <div class="rk-delta">${String(index + 1).padStart(2, "0")}</div>
        </article>
      `).join("");
      const seedRows = seeds.map((seed, index) => `
        <article class="rank-row" style="grid-template-columns:minmax(0,1.25fr) auto;">
          <div class="rk-name">${escapeHtml(seed.title || seed.headline || seed.layer || `content seed ${index + 1}`)}<span class="rk-source">${escapeHtml(seed.source || seed.status || seed.slug || "Katechon")}</span></div>
          <div class="rk-delta">${escapeHtml(seed.status || seed.signal || "ready")}</div>
        </article>
      `).join("");
      return `<div class="dense-scene with-aside">
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">channel technology stack</span>
            <span class="dense-panel-meta">${stack.length} layers · platform object</span>
          </div>
          <div class="dense-panel-body" style="grid-template-rows:minmax(0,1fr) auto;gap:8px;">
            <div class="rank-list">${stackRows}</div>
            <div class="heat-strip">
              ${heatStripRowHtml("state continuity", Array.from({ length: 24 }, (_, i) => seededValue(i + 310, 28, 100)))}
              ${heatStripRowHtml("surface mutation", Array.from({ length: 24 }, (_, i) => seededValue(i + 340, 18, 100)))}
            </div>
          </div>
        </section>
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">watch · command · share</span>
            <span class="dense-panel-meta">${loop.length} runtime steps</span>
          </div>
          <div class="dense-panel-body rank-list">
            ${loopRows}
            ${seedRows}
          </div>
        </section>
      </div>`;
    }

    function renderOrderbook() {
      // Crypto Trading: depth ladder bound to livePayload.book + price + tape.
      const data = state.livePayload?.data || {};
      const bids = (data.book?.levels?.[0] || []).slice(0, 10);
      const asks = (data.book?.levels?.[1] || []).slice(0, 10);
      const mid = numericValue(data.mid || data.mark || 0);
      const useFake = !bids.length || !asks.length;
      const fakeBid = (i) => ({ px: mid ? mid * (1 - (i + 1) * 0.0008) : 65000 - (i + 1) * 30, sz: seededValue(i, 0.3, 4.2) });
      const fakeAsk = (i) => ({ px: mid ? mid * (1 + (i + 1) * 0.0008) : 65000 + (i + 1) * 30, sz: seededValue(i + 30, 0.3, 4.2) });
      const sizes = [
        ...(useFake ? Array.from({ length: 10 }, (_, i) => fakeBid(i).sz) : bids.map(b => numericValue(b.sz))),
        ...(useFake ? Array.from({ length: 10 }, (_, i) => fakeAsk(i).sz) : asks.map(a => numericValue(a.sz))),
      ];
      const maxSz = Math.max(...sizes, 1);
      const bidRow = (lvl) => `<div class="depth-ladder-row bid">
        <span class="dl-px">${formatPulseValue(numericValue(lvl.px), "$", "price")}</span>
        <div class="dl-bar" style="--dl-w:${Math.round((numericValue(lvl.sz) / maxSz) * 100)}%"></div>
        <span class="dl-sz">${numericValue(lvl.sz).toFixed(3)}</span>
      </div>`;
      const askRow = (lvl) => `<div class="depth-ladder-row ask">
        <span class="dl-px">${formatPulseValue(numericValue(lvl.px), "$", "price")}</span>
        <div class="dl-bar" style="--dl-w:${Math.round((numericValue(lvl.sz) / maxSz) * 100)}%"></div>
        <span class="dl-sz">${numericValue(lvl.sz).toFixed(3)}</span>
      </div>`;
      const bidsHtml = (useFake ? Array.from({ length: 10 }, (_, i) => fakeBid(i)) : bids).map(bidRow).join("");
      const asksHtml = (useFake ? Array.from({ length: 10 }, (_, i) => fakeAsk(i)) : asks.slice().reverse()).map(askRow).join("");
      const tape = Array.from({ length: 24 }, (_, i) => seededValue(i + 200, -3, 3));
      const candles = (data.candles || []).slice(-24);
      const closes = candles.length ? candles.map(c => numericValue(c.c ?? c.close)) : Array.from({ length: 24 }, (_, i) => seededValue(i + 11, 64500, 65500));
      return `<div class="dense-scene with-aside">
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">order book depth</span>
            <span class="dense-panel-meta">${useFake ? "Data unavailable" : "Live data"} · top 10</span>
          </div>
          <div class="dense-panel-body" style="grid-template-rows:minmax(0,1fr) auto minmax(0,1fr);">
            <div class="depth-ladder">${asksHtml}</div>
            <div class="depth-spread">SPREAD ${data.spreadBps ? `${Number(data.spreadBps).toFixed(2)}bp` : "—"} · MID ${formatPulseValue(mid, "$", "price")}</div>
            <div class="depth-ladder">${bidsHtml}</div>
          </div>
        </section>
        <section class="dense-panel">
          <div class="dense-panel-head">
            <span class="dense-panel-title">price · band · tape</span>
            <span class="dense-panel-meta">${candles.length || 24}p</span>
          </div>
          <div class="dense-panel-body" style="grid-template-rows:minmax(0,1fr) auto minmax(0,1fr);gap:8px;">
            <div style="min-height:0;padding:6px;border:1px solid rgba(255,255,255,0.08);border-radius:5px;background:rgba(0,0,0,0.20);">
              ${sparklineSvg(closes, { width: 280, height: 80 }).replace("<svg ", "<svg style=\"width:100%;height:100%;\" ")}
            </div>
            <div class="dist-band" style="margin-bottom:14px;">
              <div class="db-track"></div>
              <div class="db-band" style="left:18%;right:24%;"></div>
              <div class="db-now" style="left:62%;"></div>
              <span class="db-label" style="left:18%;">p10</span>
              <span class="db-label" style="left:50%;">p50</span>
              <span class="db-label" style="left:76%;">p90</span>
            </div>
            <div class="sm-bars" style="height:auto;min-height:48px;">${tape.map((v, i, arr) => {
              const min = Math.min(...arr);
              const max = Math.max(...arr);
              const rng = (max - min) || 1;
              const h = Math.max(8, Math.round(((v - min) / rng) * 100));
              return `<span class="${v < 0 ? "down" : ""}" style="height:${h}%"></span>`;
            }).join("")}</div>
          </div>
        </section>
      </div>`;
    }

    function renderPrediction() {
      return `<div class="scene prediction">
        <section class="scene-card probability-stage"><div class="prob-curve"></div><div class="prob-curve"></div><div class="prob-curve"></div><div class="oracle-clock"><span></span></div>${nodes(10)}</section>
        <section class="outcome-stack">
          ${state.feed.slice(0, 4).map((item, index) => `
            <article class="scene-card outcome-card"><div><span class="source-label">${escapeHtml(item[2])}</span><strong>${escapeHtml(item[1])}</strong></div><div class="prob-value">${Math.round(seededValue(index, 24, 78))}%</div></article>
          `).join("")}
        </section>
      </div>`;
    }

    function renderBioLab() {
      return `<div class="scene bio-lab">
        <section class="scene-card molecule">
          <div class="gene-ladder">${Array.from({ length: 8 }, (_, index) => `<span style="top:${10 + index * 11}%"></span>`).join("")}</div>
          <div class="molecule-orbit"></div><div class="molecule-orbit" style="width:48%;rotate:62deg"></div>
          ${Array.from({ length: 10 }, (_, index) => `<span class="protein-node" style="left:${seededValue(index, 14, 84)}%;top:${seededValue(index + 8, 13, 82)}%"></span>`).join("")}
        </section>
        <section class="scene-card pipeline">${visibleMetrics().map((_, i) => `<div>${metricText(i)}<div class="bar" style="margin-top:9px;width:${50 + i * 12}%"></div></div>`).join("")}</section>
      </div>`;
    }

    function renderObservatory() {
      return `<div class="scene observatory">
        <span class="observatory-beam"></span>
        ${nodes(46, "star")}
        <span class="pulsar-ring" style="width:26%;height:26%"></span><span class="pulsar-ring" style="width:42%;height:42%"></span><span class="pulsar-ring" style="width:60%;height:60%"></span>
        <div class="transit"><span class="transit-path"></span>${nodes(9)}</div>
      </div>`;
    }

    function renderGeoSignal() {
      return `<div class="scene geo-signal">
        <div class="map-panel"><span class="map-halo"></span><span class="orbital-sweep"></span><span class="route-arc arc-a"></span>${nodes(12)}${lines(8)}<span class="scan-line"></span></div>
        ${stageBadgesHtml("geo-badges")}
      </div>`;
    }

    function renderMeme() {
      return `<div class="scene meme-scene">
        <section class="scene-card bonding-curve"><span class="meme-flare"></span><div class="curve-segment"></div>${nodes(18)}</section>
        <section class="scene-card social-swarm"><div class="attention-spikes">${bars(14)}</div>${nodes(30)}${lines(7)}</section>
      </div>`;
    }

    function renderQuantum() {
      return `<div class="scene quantum-field">
        <span class="measurement-line"></span>
        <span class="state-orb" style="left:12%;top:22%"></span><span class="state-orb" style="left:39%;top:34%;width:182px;height:182px"></span><span class="state-orb" style="left:24%;top:58%;width:150px;height:150px"></span><span class="state-orb" style="left:62%;top:24%;width:118px;height:118px"></span>
        ${Array.from({ length: 20 }, (_, index) => `<span class="qbit" style="left:${seededValue(index, 9, 88)}%;top:${seededValue(index + 12, 9, 86)}%"></span>`).join("")}
        <div class="quantum-shelf">${Array.from({ length: 8 }, (_, index) => `<span class="bar" style="top:${16 + index * 14}px;width:${seededValue(index, 34, 96)}%"></span>`).join("")}</div>
        ${stageBadgesHtml("quantum-badges")}
      </div>`;
    }

    function renderAbyss() {
      return `<div class="scene abyss">
        ${Array.from({ length: 6 }, (_, index) => `<span class="wave" style="top:${12 + index * 12}%"></span>`).join("")}
        ${Array.from({ length: 3 }, (_, index) => `<span class="sensor-ping" style="left:${20 + index * 24}%;top:${32 + index * 12}%"></span>`).join("")}
        ${Array.from({ length: 5 }, (_, index) => `<span class="vent" style="left:${12 + index * 17}%;height:${seededValue(index, 62, 126)}px"></span>`).join("")}
        ${nodes(12)}
      </div>`;
    }

    function renderGridOps() {
      return `<div class="scene gridops">
        <span class="grid-backbone backbone-a"></span><span class="grid-backbone backbone-b"></span>
        ${Array.from({ length: 13 }, (_, index) => `<span class="grid-node" style="left:${seededValue(index, 8, 86)}%;top:${seededValue(index + 30, 10, 84)}%"></span>`).join("")}
        ${lines(14, "power-line")}
        ${stageBadgesHtml("grid-badges")}
      </div>`;
    }

    function renderViralNet() {
      return `<div class="scene viralnet">
        <span class="outbreak-core core-a"></span><span class="outbreak-core core-b"></span><span class="outbreak-core core-c"></span>
        ${Array.from({ length: 24 }, (_, index) => `<span class="person" style="left:${seededValue(index, 8, 90)}%;top:${seededValue(index + 3, 8, 86)}%"></span>`).join("")}
        ${lines(8)}
        <span class="scenario-curve" style="bottom:8%;border-color:var(--accent)"></span>
        <span class="scenario-curve" style="bottom:16%;border-color:var(--accent2)"></span>
        <span class="scenario-curve" style="bottom:24%;border-color:var(--accent3)"></span>
      </div>`;
    }

    function renderDarkWatch() {
      return `<div class="scene darkwatch">
        ${nodes(48, "star")}
        <span class="anomaly-core"></span><span class="dark-vector vector-a"></span><span class="dark-vector vector-b"></span>
        ${Array.from({ length: 42 }, (_, index) => `<span class="catalog-cell" style="left:${seededValue(index, 4, 94)}%;top:${seededValue(index + 16, 6, 82)}%;opacity:${seededValue(index, 0.22, 0.72)}"></span>`).join("")}
        <div class="silence-window"></div>
      </div>`;
    }

    function quoteWordsHtml(text) {
      return String(text || "").split(/\s+/).filter(Boolean)
        .map((word) => `<span class="quote-word">${escapeHtml(word)}</span>`)
        .join(" ");
    }

    function quoteLinesHtml(text) {
      return String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean)
        .map((line) => quoteWordsHtml(line))
        .map((line) => `<span class="quote-line">${line}</span>`)
        .join("");
    }

    function stageQuoteHtml(quote) {
      const text = quote && typeof quote === "object" ? quote.text : "";
      if (!text) return "";
      const author = quote.author || "";
      const kicker = quote.kicker || config.kicker || "";
      const quoteMarks = quote.quoteMarks !== false;
      const isMultiline = /\n/.test(text);
      const multilineClass = isMultiline ? " quote-text-multiline" : "";
      const lockupClass = isMultiline ? " quote-lockup-multiline" : "";
      const quoteBody = isMultiline ? quoteLinesHtml(text) : quoteWordsHtml(text);
      const openQuote = quoteMarks ? "&ldquo;" : "";
      const closeQuote = quoteMarks ? "&rdquo;" : "";
      return `<div class="dense-scene quote-scene full" aria-label="${escapeHtml(`${text}${author ? ` ${author}` : ""}`)}">
        <span class="quote-field-line line-a"></span>
        <span class="quote-field-line line-b"></span>
        <span class="quote-field-line line-c"></span>
        <figure class="quote-lockup${lockupClass}">
          ${kicker ? `<div class="quote-kicker">${escapeHtml(kicker)}</div>` : ""}
          <blockquote class="quote-text${multilineClass}">${openQuote}${quoteBody}${closeQuote}</blockquote>
          ${author ? `<figcaption class="quote-author">${escapeHtml(author)}</figcaption>` : ""}
        </figure>
      </div>`;
    }

    function wireSceneInteractions() {
      document.querySelectorAll(".scene-card, .node, .grid-node, .person, .qbit, .protein-node").forEach((el) => {
        el.addEventListener("mouseenter", () => animate(el, { scale: 1.035, duration: 260, ease: "out(3)" }));
        el.addEventListener("mouseleave", () => animate(el, { scale: 1, duration: 300, ease: "out(3)" }));
      });
    }

    function runIntroMotion() {
      animate(".topbar", { opacity: [0, 1], y: [-12, 0], duration: 560, ease: "out(3)" });
      animate(".metric", { opacity: [0, 1], y: [14, 0], delay: stagger(42), duration: 520, ease: "out(3)" });
      animate(".feed-item", { opacity: [0, 1], x: [12, 0], delay: stagger(36), duration: 520, ease: "out(3)" });
    }

    function runSceneMotion() {
      animate(".scan-line", { y: ["0%", "100%"], opacity: [0.15, 0.82, 0.15], duration: 3100, loop: true, ease: "inOut(2)" });
      animate(".node, .person, .qbit, .protein-node, .grid-node", { scale: [0.72, 1.22, 0.86], opacity: [0.42, 1, 0.66], delay: stagger(38), duration: 2200, loop: true, ease: "inOut(2)" });
      animate(".line, .power-line", { opacity: [0.18, 0.92, 0.22], scaleX: [0.25, 1, 0.62], delay: stagger(55), duration: 2100, loop: true, ease: "inOut(2)" });
      animate(".candle, .bar, .book-fill, .heat-cell, .code-line", { scaleY: [0.72, 1, 0.82], opacity: [0.46, 1, 0.72], delay: stagger(28), duration: 1850, loop: true, ease: "inOut(2)" });
      animate(".prob-curve, .state-orb, .pulsar-ring, .molecule-orbit, .oracle-clock", { rotate: [0, 360], duration: 14000, loop: true, ease: "linear" });
      animate(".wave, .scenario-curve, .curve-segment", { translateX: [-18, 18, -18], opacity: [0.35, 0.82, 0.42], delay: stagger(120), duration: 3600, loop: true, ease: "inOut(2)" });
      animate(".market-ridge span", { opacity: [0.35, 0.82, 0.42], delay: stagger(120), duration: 3600, loop: true, ease: "inOut(2)" });
      animate(".map-halo, .sensor-ping, .anomaly-core, .outbreak-core", { scale: [0.88, 1.08, 0.94], opacity: [0.42, 0.84, 0.52], delay: stagger(90), duration: 2600, loop: true, ease: "inOut(2)" });
      animate(".route-arc, .orbital-sweep, .measurement-line, .dark-vector, .grid-backbone", { opacity: [0.22, 0.78, 0.34], scaleX: [0.72, 1, 0.82], delay: stagger(70), duration: 2400, loop: true, ease: "inOut(2)" });
      animate(".evidence-pins span, .meme-flare", { scale: [0.78, 1.18, 0.88], opacity: [0.42, 1, 0.58], delay: stagger(80), duration: 2200, loop: true, ease: "inOut(2)" });
      animate(".timeline-sweep, .transit-path", { translateX: ["-120%", "120%"], duration: 2600, loop: true, ease: "inOut(2)" });
      animate(".texture-video", { opacity: [0.18, 0.30, 0.22], duration: 5200, loop: true, ease: "inOut(2)" });
      animate(".quote-lockup", { opacity: [0, 1], y: [18, 0], scale: [0.985, 1], duration: 760, ease: "out(3)" });
      animate(".quote-word", { opacity: [0, 1], y: [16, 0], filter: ["blur(10px)", "blur(0px)"], delay: stagger(46), duration: 880, ease: "out(3)" });
      animate(".quote-kicker, .quote-author", { opacity: [0, 1], y: [8, 0], delay: 360, duration: 620, ease: "out(3)" });
      animate(".quote-field-line", { opacity: [0.12, 0.46, 0.18], scaleX: [0.64, 1, 0.76], delay: stagger(180), duration: 3200, loop: true, ease: "inOut(2)" });
    }

    function runMiniMotion() {
      animate(".mini-bar, .mini-depth-row, .mini-signal-row", { scaleY: [0.72, 1, 0.84], opacity: [0.50, 1, 0.74], delay: stagger(26), duration: 1600, loop: true, ease: "inOut(2)" });
      animate(".mini-map-node, .mini-dot, .mini-qbit, .mini-person", { scale: [0.82, 1.22, 0.92], opacity: [0.50, 1, 0.70], delay: stagger(34), duration: 1900, loop: true, ease: "inOut(2)" });
      animate(".mini-map-line, .mini-link", { opacity: [0.20, 0.88, 0.28], scaleX: [0.45, 1, 0.68], delay: stagger(42), duration: 1800, loop: true, ease: "inOut(2)" });
      animate(".mini-wave, .mini-line-chart", { translateX: [-10, 10, -10], opacity: [0.42, 0.86, 0.52], duration: 2800, loop: true, ease: "inOut(2)" });
    }

    function updateClock() {
      $("clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function tickDashboard() {
      state.tick += 1;
      if (state.tick % 2 === 0) pulseState(false);
      state.activeFeed = (state.activeFeed + 1) % state.feed.length;
      renderFeed();
      renderMiniVisual();
      animate(".feed-item.active", { x: [8, 0], borderColor: [palette[0], "rgba(255,255,255,0.12)"], duration: 650, ease: "out(3)" });
    }

    function pulseState(rebuildStage = true) {
      state.metrics = state.metrics.map(([label, value, note], index) => {
        if (/%$/.test(value)) return [label, `${Math.max(1, Math.min(99, Number(value.replace("%", "")) + Math.round(seededValue(index, -4, 5))))}%`, note];
        if (/^\d+(\.\d+)?$/.test(value)) return [label, String(Math.max(1, Math.round(Number(value) + seededValue(index, -3, 4)))), note];
        return [label, value, note];
      });
      renderMetrics();
      if (rebuildStage) renderStage();
      renderMiniVisual();
      animate(".metric", { scale: [1, 1.025, 1], delay: stagger(35), duration: 420, ease: "out(3)" });
    }

    async function loadLiveData() {
      if (state.liveLoading) return;
      state.liveLoading = true;
      $("source-chip").textContent = "Loading live data";
      try {
        const payload = await fetchLivePayload();
        state.livePayload = payload;
        applyLivePayload(payload);
        $("source-chip").textContent = freshnessLabel(payload.freshness || payload.dataBinding?.freshness || (payload.stale ? "cached" : "live"));
      } catch (err) {
        $("source-chip").textContent = "Data unavailable";
      } finally {
        state.liveLoading = false;
      }
    }

    async function fetchLivePayload() {
      const query = new URLSearchParams({
        dashboard: dashboardId,
        sessionId: `prototype-${dashboardId}`,
      });
      const channelUrl = `/api/channels/${encodeURIComponent(dashboardId)}/live?${query.toString()}`;
      try {
        const resp = await fetch(appUrl(channelUrl), { cache: "no-store" });
        if (!resp.ok) throw new Error(`channel ${resp.status}`);
        return resp.json();
      } catch (err) {
        if (!config.api) throw err;
        const resp = await fetch(appUrl(`/api/live/${config.api}?dashboard=${encodeURIComponent(dashboardId)}`), { cache: "no-store" });
        if (!resp.ok) throw new Error(`provider ${resp.status}`);
        return resp.json();
      }
    }

    function applyLivePayload(payload) {
      const data = payload && payload.data;
      if (!data) return;
      const headlineChanged = applyDynamicHeadline(payload.headline);
      const provider = String(payload.liveProvider || payload.provider || config.api || payload.source || "").replace(/-synthetic$/, "");
      if (provider === "hyperliquid") applyHyperliquidData(data);
      else if (provider === "polymarket") applyPolymarketData(data);
      else if (provider === "pumpfun" || provider === "pumpportal" || provider === "dexscreener" || provider === "coingecko-pumpfun") applyPumpfunData(data);
      else if (provider === "eia-grid") applyPowerGridData(data);
      else applyChannelStateData(data);
      renderMetrics();
      renderFeed();
      renderGeneratedRail();
      renderStage();
      renderMiniVisual();
      renderStageThesis();
      if (headlineChanged) renderGeneratedPage();
      animate(".metric, .feed-item.active", { scale: [1, 1.025, 1], duration: 520, ease: "out(3)" });
    }

    function applyChannelStateData(data) {
      if (Array.isArray(data.metrics) && data.metrics.length) {
        state.metrics = normalizeMetrics(data.metrics);
      }
      if (Array.isArray(data.feed) && data.feed.length) {
        state.feed = data.feed.slice(0, 8).map((item) => Array.isArray(item)
          ? [item[0] ?? "", item[1] ?? "", item[2] ?? ""]
          : [item.time ?? "", item.title ?? item.message ?? "", item.meta ?? item.source ?? ""]);
      }
    }

    function applyHyperliquidData(data) {
      const mid = Number(data.mid ?? data.mark);
      const spread = Number(data.spreadBps);
      const depth = Number(data.depthUsd);
      const coin = data.coin || "BTC";
      state.metrics[0] = [coin, Number.isFinite(mid) && mid > 0 ? `$${Math.round(mid).toLocaleString()}` : "—", "live"];
      state.metrics[1] = ["Spread", Number.isFinite(spread) ? `${spread.toFixed(2)}bp` : "—", "tight"];
      state.metrics[2] = ["Depth", Number.isFinite(depth) ? `$${Math.round(depth / 1000)}K` : "—", "nearby"];
      if (Array.isArray(data.candles) && data.candles.length) {
        state.feed = data.candles.slice(-5).reverse().map((candle, index) => {
          const close = Number(candle.c ?? candle.close);
          return [
            `${index * 3}m`,
            Number.isFinite(close)
              ? `${coin} candle closed at $${Math.round(close).toLocaleString()}.`
              : `${coin} candle missing close price.`,
            "read-only market data",
          ];
        });
      } else {
        state.feed = [["—", "no candles in /api/channels/crypto-trading/live", "loading"]];
      }
    }

    function applyPolymarketData(data) {
      const allMarkets = Array.isArray(data.markets) ? data.markets : [];
      const markets = allMarkets.slice(0, 5);
      if (!markets.length) {
        state.metrics[0] = ["Markets", "—", "ranked"];
        state.metrics[1] = ["Top YES", "—", "close"];
        state.feed = [["—", "no markets in /api/channels/polyrec/live", "loading"]];
        return;
      }
      state.metrics[0] = ["Markets", String(allMarkets.length), "ranked"];
      const topYes = Number(markets[0].yes);
      state.metrics[1] = ["Top YES", Number.isFinite(topYes) ? `${Math.round(topYes * 100)}%` : "—", "implied"];
      state.feed = markets.map((market, index) => {
        const yes = Number(market.yes);
        return [
          `${index * 4}m`,
          market.question || "Public prediction market (no question text).",
          `${Number.isFinite(yes) ? Math.round(yes * 100) + "%" : "—"} yes / ${market.category || "market"}`,
        ];
      });
    }

    function applyPumpfunData(data) {
      if (data && data.kind === "pumpfun-launchpad-v1") {
        return applyPumpfunLaunchpadData(data);
      }
      const allTokens = Array.isArray(data.tokens) ? data.tokens : [];
      const tokens = allTokens.slice(0, 5);
      if (!tokens.length) {
        state.metrics[0] = ["Tokens", "—", "ranked"];
        state.metrics[1] = ["Leader", "—", "velocity"];
        state.metrics[2] = ["Fragility", "—", "risk"];
        state.feed = [["—", "no tokens in /api/channels/meme-coin/live", "loading"]];
        return;
      }
      state.metrics[0] = ["Tokens", String(allTokens.length), "ranked"];
      const leader = String(tokens[0].symbol || tokens[0].name || "").slice(0, 8).toUpperCase();
      state.metrics[1] = ["Leader", leader || "—", "velocity"];
      const fragility = Number(tokens[0].fragilityScore);
      state.metrics[2] = ["Fragility", Number.isFinite(fragility) ? `${Math.round(fragility)}/100` : "—", tokens[0].riskLabel || "risk"];
      state.feed = tokens.map((token, index) => [
        index === 0 ? "now" : `${index * 3}m`,
        token.name || token.symbol
          ? `${token.name || token.symbol} on the social market watchlist with ${token.riskLabel || "no risk label"} liquidity risk.`
          : "Token missing name and symbol.",
        `liq ${compactMoney(token.liquidityUsd)} / read-only`,
      ]);
    }

    function applyPumpfunLaunchpadData(data) {
      const m = (data && data.metrics) || {};
      const mintsPerMin = Number(m.mintsPerMin || 0);
      const grads24h = Number(m.graduations24h || 0);
      const tradesPerMin = Number(m.tradesPerMin || 0);
      const totalCurveUsd = Number(m.totalCurveUsd || 0);
      const totalCurveSol = Number(m.totalCurveSol || 0);
      const streamLabel = data.streamConnected
        ? (data.streamSource === "pumpportal" ? "pumpportal · live" : `${data.streamSource}`)
        : (data.streamSource === "coingecko-pump-fun" ? "fallback" : "warming up");
      state.metrics[0] = ["Mints/min", mintsPerMin.toFixed(1), streamLabel];
      state.metrics[1] = ["Grads · 24h", String(grads24h), "→ raydium"];
      state.metrics[2] = ["Curve TVL", compactMoney(totalCurveUsd) || "—", `${Math.round(totalCurveSol)} SOL`];
      const mints = Array.isArray(data.recentMints) ? data.recentMints : [];
      const grads = Array.isArray(data.graduationCandidates) ? data.graduationCandidates : [];
      const movers = Array.isArray(data.fastMovers) ? data.fastMovers : [];
      const feedRows = [];
      grads.slice(0, 2).forEach((token) => {
        const sym = String(token.symbol || token.name || "TOKEN").toUpperCase();
        feedRows.push([
          `${Math.round(Number(token.fillPct || 0))}%`,
          `${sym} filling toward 85 SOL · ${token.remainingSol ? token.remainingSol.toFixed(1) : "?"} SOL to graduate.`,
          `cap ${compactMoney(token.marketCapUsd)} · pump.fun`,
        ]);
      });
      mints.slice(0, 3).forEach((token) => {
        const sym = String(token.symbol || token.name || "TOKEN").toUpperCase();
        const ageSec = Number(token.ageSec || 0);
        const ageLabel = ageSec < 60 ? `${Math.round(ageSec)}s` : `${Math.round(ageSec / 60)}m`;
        feedRows.push([
          ageLabel,
          `${sym} just minted on pump.fun.`,
          `cap ${compactMoney(token.marketCapUsd)} · ${token.creator ? "dev " + String(token.creator).slice(0, 4) : "live"}`,
        ]);
      });
      movers.slice(0, 2).forEach((token) => {
        const sym = String(token.symbol || token.name || "TOKEN").toUpperCase();
        const sol = Number(token.lastTradeSol || 0).toFixed(2);
        const ago = Number(token.lastTradeAgoSec || 0);
        const agoLabel = ago < 60 ? `${ago}s` : `${Math.round(ago / 60)}m`;
        feedRows.push([
          agoLabel,
          `${sym} ${token.lastTradeType || "trade"} ${sol} SOL hit the tape.`,
          `cap ${compactMoney(token.marketCapUsd)} · ${Math.round(Number(token.fillPct || 0))}% curve`,
        ]);
      });
      if (!feedRows.length) {
        feedRows.push(["—", "PumpPortal websocket connected, waiting for first event…", `${tradesPerMin.toFixed(0)} trades/min`]);
      }
      state.feed = feedRows.slice(0, 8);
    }

    function formatGridMw(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return "n/a";
      if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(2)}TW`;
      if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}GW`;
      return `${Math.round(n)}MW`;
    }

    function applyPowerGridData(data) {
      const latest = data.latest || (Array.isArray(data.series) ? data.series[data.series.length - 1] : null);
      if (!latest) {
        state.metrics[0] = ["Load", "—", data.respondent || "EIA"];
        state.metrics[1] = ["Frequency", "—", "hz proxy"];
        state.metrics[2] = ["Reserve", "—", "margin proxy"];
        state.feed = [["—", "no latest in /api/channels/power-grid/live", "loading"]];
        return;
      }
      state.metrics[0] = ["Load", formatGridMw(latest.loadMw), data.respondent || "EIA"];
      const hz = Number(latest.frequencyHz);
      state.metrics[1] = ["Frequency", Number.isFinite(hz) ? hz.toFixed(3) : "—", "hz proxy"];
      const margin = Number(latest.operatingMarginPct);
      state.metrics[2] = ["Reserve", Number.isFinite(margin) ? `${margin.toFixed(1)}%` : "—", "margin proxy"];
      if (Array.isArray(data.feed) && data.feed.length) {
        state.feed = data.feed.slice(0, 6).map((item) => Array.isArray(item)
          ? [item[0] ?? "", item[1] ?? "", item[2] ?? ""]
          : [item.time ?? "", item.title ?? item.message ?? "", item.meta ?? item.source ?? ""]);
      } else if (Array.isArray(data.series) && data.series.length) {
        state.feed = data.series.slice(-5).reverse().map((row, index) => [
          index === 0 ? "now" : `${index}h`,
          `${data.respondentName || data.respondent || "Grid"} load at ${formatGridMw(row.loadMw)}; forecast ${formatGridMw(row.forecastMw)}.`,
          `${Number(row.stressPct || 0).toFixed(0)}% stress proxy`,
        ]);
      }
    }

    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "dashboard-overrides-updated" && event.data.dashboard === dashboardId) {
        loadDashboardOverride().finally(render);
      }
    });

    loadDashboardIdentity()
      .then(loadDashboardOverride)
      .then(loadChannelShareObject)
      .catch((err) => {
        console.warn(err);
      })
      .finally(() => {
        wireKatTargetInteractions();
        render();
      });
