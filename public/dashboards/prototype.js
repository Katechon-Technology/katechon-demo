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
    const baseConfig = dashboards[dashboardId] || fallbackDashboard;
    let config = { ...baseConfig };
    const identity = config.identity || {};
    document.body.dataset.dashboard = dashboardId;
    if (identity.className) document.body.classList.add(identity.className);
    const palette = palettes[config.palette] || palettes.acid;
    const generatedSlotNames = ["rail", "stageOverlay", "modal"];
    const state = {
      activeFeed: 0,
      tick: 0,
      metrics: normalizeMetrics(config.metrics),
      feed: config.feed.map((item) => [...item]),
      livePayload: null,
      liveLoading: false,
      generated: emptyGeneratedDashboard(),
    };

    const animeApi = window.anime || {};
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canMotion = !reduceMotion && typeof animeApi.animate === "function";
    const stagger = (value, options) => typeof animeApi.stagger === "function" ? animeApi.stagger(value, options) : 0;
    const $ = (id) => document.getElementById(id);
    window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
    const customRenderers = window.KATECHON_DASHBOARD_RENDERERS;
    let dashboardRendered = false;

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
        view: "default",
        slots: Object.fromEntries(generatedSlotNames.map((slot) => [slot, []])),
        themeTokens: {},
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

    function seededValue(index, min, max) {
      const seed = Math.sin((index + 1) * 9301 + dashboardId.length * 49297 + state.tick * 233) * 10000;
      const n = seed - Math.floor(seed);
      return min + n * (max - min);
    }

    function render() {
      setTheme();
      document.title = `${config.title} - Katechon`;
      document.body.dataset.generatedView = state.generated.view || "default";
      $("kicker").textContent = config.kicker;
      $("title").textContent = config.title;
      $("visual-label").textContent = config.visualLabel;
      $("visual-copy").textContent = config.visualCopy;
      $("feed-label").textContent = config.feedLabel;
      renderMetrics();
      renderFeed();
      renderStage();
      renderMiniVisual();
      renderGeneratedRail();
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

    function renderMetrics() {
      $("metrics").innerHTML = visibleMetrics().map(([label, value, note]) => `
        <article class="metric">
          <div class="metric-label">${escapeHtml(label)}</div>
          <div class="metric-value">${escapeHtml(value)}</div>
          <div class="metric-note">${escapeHtml(note)}</div>
        </article>
      `).join("");
      updateMiniFocus();
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
      return generatedSlotNames.flatMap((slot) => slots[slot] || []);
    }

    function componentByGeneratedId(id) {
      return generatedComponents().find(component => String(component.id || "") === String(id || "")) || null;
    }

    function numericValue(value) {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      const parsed = Number(String(value || "").replace(/[$,%\s,]/g, ""));
      return Number.isFinite(parsed) ? parsed : 0;
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

    function chartRowsForBinding(component) {
      const chart = component.chart || {};
      const binding = chart.binding || component.binding || "none";
      const data = component._chartPayload?.data || state.livePayload?.data || {};
      if (Array.isArray(chart.data) && chart.data.length) return chart.data.slice(0, 96);

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
          marketCap: numericValue(token.marketCap),
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
      if (binding === "liveData.tokens") return { type: chart.type || "bar", x: chart.x || "label", y: chart.y || "change" };
      if (binding === "liveData.fuelMix") return { type: chart.type || "bar", x: chart.x || "label", y: chart.y || "value" };
      if (binding === "liveData.corridors") return { type: chart.type || "bar", x: chart.x || "label", y: chart.y || "stressPct" };
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
        spec.padding = { left: 94, right: 18, top: 12, bottom: 24 };
        spec.scales = [
          { name: "x", type: "linear", domain: { data: "table", field: x }, nice: true, range: "width", zero: true },
          { name: "y", type: "band", domain: { data: "table", field: y }, range: "height", padding: 0.22 },
        ];
        spec.axes = [{ orient: "bottom", scale: "x", grid: true, ticks: false }, { orient: "left", scale: "y", ticks: false, labelLimit: 86 }];
        spec.marks = [{
          type: "rect",
          from: { data: "table" },
          encode: {
            enter: { y: { scale: "y", field: y }, height: { scale: "y", band: 1 }, x: { scale: "x", value: 0 }, x2: { scale: "x", field: x }, fill: { value: accent }, fillOpacity: { value: 0.72 }, cornerRadius: { value: 3 }, cursor: { value: "pointer" } },
            update: { fillOpacity: { value: 0.78 } },
            hover: { fillOpacity: { value: 1 } },
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
      const values = rows.length ? rows.slice(0, 8).map(row => Math.max(8, Math.min(100, numericValue(row.value ?? row.close ?? row.yes ?? row.change ?? row.loadMw ?? row.stressPct)))) : [24, 58, 36, 72, 46, 88, 54, 68];
      const max = Math.max(...values, 1);
      return `<div class="generated-chart-fallback">${values.map(value => `<span style="height:${Math.max(10, value / max * 100).toFixed(0)}%"></span>`).join("")}</div>`;
    }

    function selectedDatumText(datum) {
      if (!datum || typeof datum !== "object") return "";
      const label = datum.label ?? datum.index ?? "point";
      const fields = ["close", "sma", "open", "high", "low", "volume", "notional", "yes", "change", "loadMw", "stressPct", "value"]
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
      const label = source?.label || sourceType.replace(/_/g, " ");
      const provider = source?.provider || provenanceIds[0] || "provenance attached";
      const stale = source?.stale ? "stale" : "";
      const fallback = source?.fallbackReason ? `<span>${escapeHtml(source.fallbackReason)}</span>` : "";
      return `
        <div class="generated-source generated-source-${escapeHtml(sourceType)}">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(provider)}</span>
          ${stale ? `<span>${stale}</span>` : ""}
          ${fallback}
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
        <article class="generated-component generated-${escapeHtml(component.type || "component")}" data-generated-id="${componentId}">
          ${component.eyebrow ? `<div class="generated-eyebrow">${escapeHtml(component.eyebrow)}</div>` : ""}
          ${generatedSourceHtml(component)}
          ${component.title ? `<div class="generated-title">${escapeHtml(component.title)}</div>` : ""}
          ${component.value ? `<div class="generated-metric-value">${escapeHtml(component.value)}</div>` : ""}
          ${component.body ? `<div class="generated-body">${escapeHtml(component.body)}</div>` : ""}
          ${isChart ? `<div class="generated-chart-shell"><div class="generated-chart" data-generated-id="${componentId}"></div></div>` : ""}
          ${isChart ? `<div class="generated-chart-selection" hidden></div>` : ""}
          ${isMetric ? generatedMetricsHtml(rows) : ""}
          ${isRows ? generatedRowsHtml(rows) : ""}
          ${!isChart && !isMetric && !isRows && rows.length ? generatedRowsHtml(rows) : ""}
          ${generatedItemsHtml(items)}
          ${component.note ? `<div class="generated-note">${escapeHtml(component.note)}</div>` : ""}
        </article>
      `;
    }

    function renderGeneratedRail() {
      const rail = $("generated-rail");
      if (!rail) return;
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
      const components = state.generated.slots.stageOverlay || [];
      if (!components.length) return "";
      const hasChart = components.some(component => component.type === "vega-chart");
      return `<div class="generated-stage${hasChart ? " has-chart" : ""}">${components.map(generatedComponentHtml).join("")}</div>`;
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

    function renderStage() {
      $("stage").innerHTML = backdropHtml() + sceneHtml(config.scene) + generatedStageHtml();
      wireSceneInteractions();
      runSceneMotion();
      requestAnimationFrame(renderGeneratedCharts);
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
      return `<div class="scene newsroom">
        <section class="scene-card lead-visual">
          <div class="lead-frame"></div>
          <div class="evidence-pins">
            <span></span><span></span><span></span>
          </div>
          <div>${metricText(1)}<div class="bar" style="margin-top:8px;width:82%"></div></div>
          <span class="timeline-sweep"></span>
        </section>
        <section class="source-stack">
          ${state.feed.slice(0, 4).map((item, index) => `
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
          <div class="market-ridge"><span></span><span></span><span></span></div>
          <span class="liquidity-river"></span>
          <div class="candles">${bars(24, "candle").replace(/class="candle"/g, (_, offset) => offset % 3 ? 'class="candle"' : 'class="candle down"')}</div>
          <div class="signal-bars" style="grid-template-columns:repeat(14,1fr)">${bars(14)}</div>
        </section>
        <section class="ribbon-stack">
          ${visibleMetrics().map((metric, index) => `
            <article class="scene-card ribbon">${metricText(index)}<div class="bar" style="width:${54 + index * 11}%"></div></article>
          `).join("")}
        </section>
      </div>`;
    }

    function renderCommandMap() {
      return `<div class="scene command-map">
        <div class="map-panel"><span class="map-halo"></span><span class="route-arc arc-a"></span><span class="route-arc arc-b"></span>${nodes(14)}${lines(9)}</div>
        <div class="side-stack">${visibleMetrics().map((_, index) => `<article class="scene-card">${metricText(index)}<div class="bar"></div></article>`).join("")}</div>
      </div>`;
    }

    function renderArena() {
      const code = Array.from({ length: 12 }, (_, index) => `<span class="code-line" style="width:${seededValue(index, 42, 100)}%"></span>`).join("");
      return `<div class="scene arena-scene">
        <section class="scene-card agent-lane"><div class="source-label">agent alpha</div><div class="code-stream">${code}</div><div class="bar"></div></section>
        <section class="judge-core"><span class="score-beam beam-a"></span><span class="score-beam beam-b"></span><div class="judge-ring"><div><div class="source-label">judge</div><strong>${escapeHtml(state.metrics[0][1])}</strong><div class="arena-vs">VS</div><div class="mono">live</div></div></div></section>
        <section class="scene-card agent-lane"><div class="source-label">agent beta</div><div class="code-stream">${code}</div><div class="bar"></div></section>
      </div>`;
    }

    function renderSourceWall() {
      return `<div class="scene source-wall">
        ${Array.from({ length: 9 }, (_, index) => {
          const item = state.feed[index % state.feed.length];
          const featured = index === 0 || index === 4 ? " featured" : "";
          const visual = featured ? `<div class="wall-visual">${bars(8)}</div>` : "";
          return `<article class="scene-card wall-card${featured}">
            <span class="source-label">${escapeHtml(item[2])}</span>
            <strong>${escapeHtml(item[1])}</strong>
            ${visual}
            <div class="bar" style="width:${seededValue(index, 44, 96)}%"></div>
          </article>`;
        }).join("")}
      </div>`;
    }

    function renderOrderbook() {
      const row = (side, index) => `<div class="book-row"><span>${side === "asks" ? "ASK" : "BID"} ${index + 1}</span><span class="book-fill" style="width:${seededValue(index, 22, 100)}%"></span><span>${seededValue(index, 0.4, 9.8).toFixed(2)}</span></div>`;
      return `<div class="scene orderbook">
        <section class="scene-card book-side bids">${Array.from({ length: 10 }, (_, i) => row("bids", i)).join("")}</section>
        <section class="scene-card chart-zone"><div class="spread-core"><strong>${escapeHtml(visibleMetrics()[0]?.[1] || "live")}</strong><span>${escapeHtml(visibleMetrics()[1]?.[1] || "spread")}</span></div><div class="candles">${bars(22, "candle")}</div><div class="signal-bars" style="grid-template-columns:repeat(10,1fr)">${bars(10)}</div></section>
        <section class="scene-card heat-column">${Array.from({ length: 10 }, (_, i) => `<span class="heat-cell" style="height:${seededValue(i, 14, 42)}px"></span>`).join("")}</section>
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
      const sourceLabel = config.api || "channel";
      $("source-chip").textContent = `loading ${sourceLabel}`;
      try {
        const payload = await fetchLivePayload();
        state.livePayload = payload;
        applyLivePayload(payload);
        $("source-chip").textContent = payload.fallbackReason
          ? `${payload.source} fallback`
          : `${payload.source}${payload.stale ? " stale" : " live"}`;
      } catch (err) {
        $("source-chip").textContent = config.api ? "provider fallback failed" : "channel fallback failed";
      } finally {
        state.liveLoading = false;
      }
    }

    async function fetchLivePayload() {
      const channelUrl = `/api/channels/${encodeURIComponent(dashboardId)}/live?dashboard=${encodeURIComponent(dashboardId)}`;
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
      const provider = String(payload.liveProvider || payload.provider || config.api || payload.source || "").replace(/-synthetic$/, "");
      if (provider === "hyperliquid") applyHyperliquidData(data);
      else if (provider === "polymarket") applyPolymarketData(data);
      else if (provider === "pumpfun") applyPumpfunData(data);
      else if (provider === "eia-grid") applyPowerGridData(data);
      else applyChannelStateData(data);
      renderMetrics();
      renderFeed();
      renderGeneratedRail();
      renderStage();
      renderMiniVisual();
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

    function formatGridMw(value) {
      const n = Number(value);
      if (!Number.isFinite(n)) return "n/a";
      if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(2)}TW`;
      if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}GW`;
      return `${Math.round(n)}MW`;
    }

    function applyPowerGridData(data) {
      const latest = data.latest || (Array.isArray(data.series) ? data.series[data.series.length - 1] : null);
      if (!latest) return;
      state.metrics[0] = ["Load", formatGridMw(latest.loadMw), data.respondent || "EIA"];
      state.metrics[1] = ["Frequency", `${Number(latest.frequencyHz || 60).toFixed(3)}`, "hz proxy"];
      state.metrics[2] = ["Reserve", `${Number(latest.operatingMarginPct || 0).toFixed(1)}%`, "margin proxy"];
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
      .catch((err) => {
        console.warn(err);
      })
      .finally(render);
