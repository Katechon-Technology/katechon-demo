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

    const catalog = window.KATECHON_DASHBOARD_CATALOG || { palettes: {}, dashboards: {} };
    const palettes = catalog.palettes || {};
    const dashboards = catalog.dashboards || {};

    const fallbackDashboard = dashboards["world-monitor"] || Object.values(dashboards)[0];
    if (!fallbackDashboard) throw new Error("No dashboard catalog entries loaded.");
    const config = dashboards[dashboardId] || fallbackDashboard;
    const identity = config.identity || {};
    document.body.dataset.dashboard = dashboardId;
    if (identity.className) document.body.classList.add(identity.className);
    const palette = palettes[config.palette] || palettes.acid;
    const state = {
      activeTab: config.tabs[0],
      activeFeed: 0,
      tick: 0,
      metrics: config.metrics.map((item) => [...item]),
      feed: config.feed.map((item) => [...item]),
      livePayload: null,
    };

    const animeApi = window.anime || {};
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canMotion = !reduceMotion && typeof animeApi.animate === "function";
    const stagger = (value, options) => typeof animeApi.stagger === "function" ? animeApi.stagger(value, options) : 0;
    const $ = (id) => document.getElementById(id);
    window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
    const customRenderers = window.KATECHON_DASHBOARD_RENDERERS;

    function animate(target, params) {
      if (!canMotion) return null;
      return animeApi.animate(target, params);
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

    function setTheme() {
      document.documentElement.style.setProperty("--accent", palette[0]);
      document.documentElement.style.setProperty("--accent2", palette[1]);
      document.documentElement.style.setProperty("--accent3", palette[2]);
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

    function seededValue(index, min, max) {
      const seed = Math.sin((index + 1) * 9301 + dashboardId.length * 49297 + state.tick * 233) * 10000;
      const n = seed - Math.floor(seed);
      return min + n * (max - min);
    }

    function render() {
      setTheme();
      document.title = `${config.title} - Katechon`;
      $("kicker").textContent = config.kicker;
      $("title").textContent = config.title;
      $("subtitle").textContent = config.subtitle;
      $("visual-label").textContent = config.visualLabel;
      $("visual-copy").textContent = config.visualCopy;
      $("feed-label").textContent = config.feedLabel;
      $("lens").textContent = config.lens;
      $("caption").textContent = config.caption;
      renderTabs();
      renderMetrics();
      renderFeed();
      renderStage();
      updateClock();
      runIntroMotion();
      loadLiveData();
      setInterval(tickDashboard, 4200);
      setInterval(updateClock, 10000);
    }

    function renderTabs() {
      $("tabs").innerHTML = config.tabs.map((tab) => `
        <button class="tab ${tab === state.activeTab ? "active" : ""}" type="button" data-tab="${escapeHtml(tab)}">${escapeHtml(tab)}</button>
      `).join("");
      document.querySelectorAll(".tab").forEach((button) => {
        button.addEventListener("click", () => {
          state.activeTab = button.dataset.tab;
          renderTabs();
          pulseState(false);
          animate(button, { scale: [0.98, 1.04, 1], duration: 420, ease: "out(3)" });
        });
      });
    }

    function renderMetrics() {
      $("metrics").innerHTML = state.metrics.map(([label, value, note]) => `
        <article class="metric">
          <div class="metric-label">${escapeHtml(label)}</div>
          <div class="metric-value">${escapeHtml(value)}</div>
          <div class="metric-note">${escapeHtml(note)}</div>
        </article>
      `).join("");
    }

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
    }

    function backdropHtml() {
      const assetStyle = config.asset ? `style="--asset:url('${escapeHtml(appUrl(config.asset))}')"` : "";
      const asset = config.asset ? `<div class="asset-plane" ${assetStyle}></div>` : "";
      const video = config.video ? `<video class="texture-video" src="${escapeHtml(appUrl(config.video))}" autoplay muted loop playsinline preload="metadata"></video>` : "";
      return `${asset}${video}<div class="scene-grid"></div><div class="scan-line"></div>`;
    }

    function renderStage() {
      $("stage").innerHTML = backdropHtml() + sceneHtml(config.scene);
      wireSceneInteractions();
      runSceneMotion();
    }

    function metricText(index) {
      const metric = state.metrics[index % state.metrics.length];
      return `<span class="source-label">${escapeHtml(metric[0])}</span><strong>${escapeHtml(metric[1])}</strong><span>${escapeHtml(metric[2])}</span>`;
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
        return `<span class="${className}" style="left:${x}%;top:${y}%;width:${w}%;transform:rotate(${r}deg)"></span>`;
      }).join("");
    }

    function renderNewsroom() {
      return `<div class="scene newsroom">
        <section class="scene-card lead-visual">
          <div class="lead-frame"></div>
          <div>${metricText(1)}<div class="bar" style="margin-top:8px;width:82%"></div></div>
          <span class="timeline-sweep"></span>
        </section>
        <section class="source-stack">
          ${state.feed.slice(0, 5).map((item, index) => `
            <article class="scene-card source-row">
              <span class="source-label">${escapeHtml(item[0])}</span>
              <div><strong>${escapeHtml(item[2])}</strong><div class="bar" style="margin-top:7px;width:${58 + index * 8}%"></div></div>
              <span class="mono">${72 + index * 5}%</span>
            </article>
          `).join("")}
        </section>
      </div>`;
    }

    function renderMarketMesh() {
      return `<div class="scene market-mesh">
        <section class="scene-card chart-zone">
          <div class="candles">${bars(30, "candle").replace(/class="candle"/g, (_, offset) => offset % 3 ? 'class="candle"' : 'class="candle down"')}</div>
          <div class="signal-bars" style="grid-template-columns:repeat(18,1fr)">${bars(18)}</div>
        </section>
        <section class="ribbon-stack">
          ${state.metrics.map((metric, index) => `
            <article class="scene-card ribbon">${metricText(index)}<div class="bar" style="width:${54 + index * 11}%"></div></article>
          `).join("")}
        </section>
      </div>`;
    }

    function renderCommandMap() {
      return `<div class="scene command-map">
        <div class="map-panel">${nodes(18)}${lines(13)}</div>
        <div class="side-stack">${state.metrics.map((_, index) => `<article class="scene-card">${metricText(index)}<div class="bar"></div></article>`).join("")}</div>
      </div>`;
    }

    function renderArena() {
      const code = Array.from({ length: 12 }, (_, index) => `<span class="code-line" style="width:${seededValue(index, 42, 100)}%"></span>`).join("");
      return `<div class="scene arena-scene">
        <section class="scene-card agent-lane"><div class="source-label">agent alpha</div><div class="code-stream">${code}</div><div class="bar"></div></section>
        <section class="judge-core"><div class="judge-ring"><div><div class="source-label">judge</div><strong>${escapeHtml(state.metrics[0][1])}</strong><div class="mono">live</div></div></div></section>
        <section class="scene-card agent-lane"><div class="source-label">agent beta</div><div class="code-stream">${code}</div><div class="bar"></div></section>
      </div>`;
    }

    function renderSourceWall() {
      return `<div class="scene source-wall">
        ${Array.from({ length: 12 }, (_, index) => {
          const item = state.feed[index % state.feed.length];
          return `<article class="scene-card wall-card">
            <span class="source-label">${escapeHtml(item[2])}</span>
            <strong>${escapeHtml(item[1])}</strong>
            <div class="bar" style="width:${seededValue(index, 44, 96)}%"></div>
          </article>`;
        }).join("")}
      </div>`;
    }

    function renderOrderbook() {
      const row = (side, index) => `<div class="book-row"><span>${side === "asks" ? "ASK" : "BID"} ${index + 1}</span><span class="book-fill" style="width:${seededValue(index, 22, 100)}%"></span><span>${seededValue(index, 0.4, 9.8).toFixed(2)}</span></div>`;
      return `<div class="scene orderbook">
        <section class="scene-card book-side bids">${Array.from({ length: 14 }, (_, i) => row("bids", i)).join("")}</section>
        <section class="scene-card chart-zone"><div class="candles">${bars(26, "candle")}</div><div class="signal-bars" style="grid-template-columns:repeat(12,1fr)">${bars(12)}</div></section>
        <section class="scene-card heat-column">${Array.from({ length: 14 }, (_, i) => `<span class="heat-cell" style="height:${seededValue(i, 14, 42)}px"></span>`).join("")}</section>
      </div>`;
    }

    function renderPrediction() {
      return `<div class="scene prediction">
        <section class="scene-card probability-stage"><div class="prob-curve"></div><div class="prob-curve"></div><div class="prob-curve"></div>${nodes(10)}</section>
        <section class="outcome-stack">
          ${state.feed.slice(0, 5).map((item, index) => `
            <article class="scene-card outcome-card"><div><span class="source-label">${escapeHtml(item[2])}</span><strong>${escapeHtml(item[1])}</strong></div><div class="prob-value">${Math.round(seededValue(index, 24, 78))}%</div></article>
          `).join("")}
        </section>
      </div>`;
    }

    function renderBioLab() {
      return `<div class="scene bio-lab">
        <section class="scene-card molecule">
          <div class="molecule-orbit"></div><div class="molecule-orbit" style="width:48%;transform:translate(-50%,-50%) rotate(62deg)"></div>
          ${Array.from({ length: 14 }, (_, index) => `<span class="protein-node" style="left:${seededValue(index, 14, 84)}%;top:${seededValue(index + 8, 13, 82)}%"></span>`).join("")}
        </section>
        <section class="scene-card pipeline">${state.metrics.map((_, i) => `<div>${metricText(i)}<div class="bar" style="margin-top:9px;width:${50 + i * 12}%"></div></div>`).join("")}</section>
      </div>`;
    }

    function renderObservatory() {
      return `<div class="scene observatory">
        ${nodes(70, "star")}
        <span class="pulsar-ring" style="width:26%;height:26%"></span><span class="pulsar-ring" style="width:42%;height:42%"></span><span class="pulsar-ring" style="width:60%;height:60%"></span>
        <div class="transit"><span class="transit-path"></span>${nodes(9)}</div>
      </div>`;
    }

    function renderGeoSignal() {
      return `<div class="scene geo-signal">
        <div class="map-panel">${nodes(15)}${lines(10)}<span class="scan-line"></span></div>
        <div class="side-stack">${state.metrics.map((_, index) => `<article class="scene-card">${metricText(index)}<div class="bar"></div></article>`).join("")}</div>
      </div>`;
    }

    function renderMeme() {
      return `<div class="scene meme-scene">
        <section class="scene-card bonding-curve"><div class="curve-segment"></div>${nodes(26)}</section>
        <section class="scene-card social-swarm">${nodes(48)}${lines(9)}</section>
      </div>`;
    }

    function renderQuantum() {
      return `<div class="scene quantum-field">
        <span class="state-orb" style="left:14%;top:14%"></span><span class="state-orb" style="left:42%;top:28%;width:182px;height:182px"></span><span class="state-orb" style="left:28%;top:52%;width:150px;height:150px"></span><span class="state-orb" style="left:58%;top:10%;width:118px;height:118px"></span>
        ${Array.from({ length: 28 }, (_, index) => `<span class="qbit" style="left:${seededValue(index, 9, 88)}%;top:${seededValue(index + 12, 9, 86)}%"></span>`).join("")}
        <div class="quantum-shelf">${Array.from({ length: 8 }, (_, index) => `<span class="bar" style="top:${16 + index * 14}px;width:${seededValue(index, 34, 96)}%"></span>`).join("")}</div>
        <div class="quantum-stack">${state.metrics.map((_, index) => `<article class="scene-card">${metricText(index)}<div class="bar"></div></article>`).join("")}</div>
      </div>`;
    }

    function renderAbyss() {
      return `<div class="scene abyss">
        ${Array.from({ length: 6 }, (_, index) => `<span class="wave" style="top:${12 + index * 12}%"></span>`).join("")}
        ${Array.from({ length: 5 }, (_, index) => `<span class="vent" style="left:${12 + index * 17}%;height:${seededValue(index, 62, 126)}px"></span>`).join("")}
        ${nodes(18)}
      </div>`;
    }

    function renderGridOps() {
      return `<div class="scene gridops">
        ${Array.from({ length: 18 }, (_, index) => `<span class="grid-node" style="left:${seededValue(index, 8, 86)}%;top:${seededValue(index + 30, 10, 84)}%"></span>`).join("")}
        ${lines(20, "power-line")}
        <div class="side-stack">${state.metrics.map((_, index) => `<article class="scene-card">${metricText(index)}<div class="bar"></div></article>`).join("")}</div>
      </div>`;
    }

    function renderViralNet() {
      return `<div class="scene viralnet">
        ${Array.from({ length: 42 }, (_, index) => `<span class="person" style="left:${seededValue(index, 8, 90)}%;top:${seededValue(index + 3, 8, 86)}%"></span>`).join("")}
        ${lines(22)}
        <span class="scenario-curve" style="bottom:8%;border-color:var(--accent)"></span>
        <span class="scenario-curve" style="bottom:16%;border-color:var(--accent2)"></span>
        <span class="scenario-curve" style="bottom:24%;border-color:var(--accent3)"></span>
      </div>`;
    }

    function renderDarkWatch() {
      return `<div class="scene darkwatch">
        ${nodes(80, "star")}
        ${Array.from({ length: 90 }, (_, index) => `<span class="catalog-cell" style="left:${seededValue(index, 4, 94)}%;top:${seededValue(index + 16, 6, 82)}%;opacity:${seededValue(index, 0.22, 0.72)}"></span>`).join("")}
        <div class="silence-window"></div>
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
      animate(".prob-curve, .state-orb, .pulsar-ring, .molecule-orbit", { rotate: [0, 360], duration: 14000, loop: true, ease: "linear" });
      animate(".wave, .scenario-curve, .curve-segment", { translateX: [-18, 18, -18], opacity: [0.35, 0.82, 0.42], delay: stagger(120), duration: 3600, loop: true, ease: "inOut(2)" });
      animate(".timeline-sweep, .transit-path", { translateX: ["-120%", "120%"], duration: 2600, loop: true, ease: "inOut(2)" });
      animate(".texture-video", { opacity: [0.12, 0.24, 0.16], duration: 5200, loop: true, ease: "inOut(2)" });
    }

    function updateClock() {
      $("clock").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    function tickDashboard() {
      state.tick += 1;
      if (state.tick % 2 === 0) pulseState(false);
      state.activeFeed = (state.activeFeed + 1) % state.feed.length;
      renderFeed();
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
      animate(".metric", { scale: [1, 1.025, 1], delay: stagger(35), duration: 420, ease: "out(3)" });
    }

    async function loadLiveData() {
      if (!config.api) {
        $("source-chip").textContent = "deterministic synthetic state";
        return;
      }
      $("source-chip").textContent = `loading ${config.api}`;
      try {
        const resp = await fetch(appUrl(`/api/live/${config.api}?dashboard=${encodeURIComponent(dashboardId)}`), { cache: "no-store" });
        const payload = await resp.json();
        state.livePayload = payload;
        applyLivePayload(payload);
        $("source-chip").textContent = payload.fallbackReason
          ? `${payload.source} fallback`
          : `${payload.source}${payload.stale ? " stale" : " live"}`;
      } catch (err) {
        $("source-chip").textContent = "synthetic fallback";
      }
    }

    function applyLivePayload(payload) {
      const data = payload && payload.data;
      if (!data) return;
      if (config.api === "hyperliquid") applyHyperliquidData(data);
      if (config.api === "polymarket") applyPolymarketData(data);
      if (config.api === "pumpfun") applyPumpfunData(data);
      renderMetrics();
      renderFeed();
      renderStage();
      animate(".metric, .feed-item.active", { scale: [1, 1.025, 1], duration: 520, ease: "out(3)" });
    }

    function applyHyperliquidData(data) {
      const mid = Number(data.mid || data.mark || 0);
      const spread = Number(data.spreadBps || 4.2);
      const depth = Number(data.depthUsd || 72000);
      if (mid > 0) state.metrics[0] = [data.coin || "BTC", `$${Math.round(mid).toLocaleString()}`, "hyperliquid"];
      state.metrics[1] = state.metrics[1][0] === "Spread" ? ["Spread", `${spread.toFixed(2)}bp`, "book"] : state.metrics[1];
      state.metrics[2] = state.metrics[2][0] === "Depth" ? ["Depth", `$${Math.round(depth / 1000)}K`, "two-sided"] : state.metrics[2];
      if (Array.isArray(data.candles) && data.candles.length) {
        state.feed = data.candles.slice(-5).reverse().map((candle, index) => [
          `${index * 3}m`,
          `${data.coin || "BTC"} candle closed at $${Math.round(Number(candle.c || candle.close || mid)).toLocaleString()}.`,
          "read-only market data",
        ]);
      }
    }

    function applyPolymarketData(data) {
      const markets = Array.isArray(data.markets) ? data.markets.slice(0, 5) : [];
      if (!markets.length) return;
      state.metrics[0] = ["Markets", String(markets.length), "polymarket"];
      state.metrics[1] = ["Top YES", `${Math.round((markets[0].yes || 0.5) * 100)}%`, "implied"];
      state.feed = markets.map((market, index) => [
        `${index * 4}m`,
        market.question || "Public prediction market updated.",
        `${Math.round((market.yes || 0.5) * 100)}% yes / ${market.category || "market"}`,
      ]);
    }

    function applyPumpfunData(data) {
      const tokens = Array.isArray(data.tokens) ? data.tokens.slice(0, 5) : [];
      if (!tokens.length) return;
      state.metrics[0] = ["Tokens", String(tokens.length), "pump style"];
      state.metrics[1] = ["Leader", String(tokens[0].symbol || tokens[0].name || "MEME").slice(0, 8).toUpperCase(), "velocity"];
      state.metrics[2] = ["1H", `${Number(tokens[0].change1h || tokens[0].change24h || 0).toFixed(1)}%`, "change"];
      state.feed = tokens.map((token, index) => [
        index === 0 ? "now" : `${index * 3}m`,
        `${token.name || token.symbol || "Token"} moved through the social market watchlist.`,
        `mcap ${token.marketCap || "synthetic"} / read-only`,
      ]);
    }

    $("pulse-btn").addEventListener("click", () => pulseState(true));
    $("refresh-btn").addEventListener("click", () => loadLiveData());
    $("focus-btn").addEventListener("click", () => {
      state.activeFeed = (state.activeFeed + 1) % state.feed.length;
      renderFeed();
      animate(".feed-item.active", { x: [12, 0], scale: [1.015, 1], duration: 420, ease: "out(3)" });
    });

    loadDashboardIdentity()
      .catch((err) => {
        console.warn(err);
      })
      .finally(render);
