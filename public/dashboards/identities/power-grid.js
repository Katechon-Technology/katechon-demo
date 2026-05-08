(function () {
  const VEGA_URL = "https://cdn.jsdelivr.net/npm/vega@6/build/vega.min.js";
  let vegaLoad = null;

  function loadVega() {
    if (window.vega) return Promise.resolve(window.vega);
    if (vegaLoad) return vegaLoad;
    vegaLoad = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = VEGA_URL;
      script.async = true;
      script.onload = () => window.vega ? resolve(window.vega) : reject(new Error("Vega did not initialize"));
      script.onerror = () => reject(new Error("Could not load Vega"));
      document.head.appendChild(script);
    });
    return vegaLoad;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function number(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatMw(value) {
    const n = number(value, NaN);
    if (!Number.isFinite(n)) return "n/a";
    if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(2)} TW`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)} GW`;
    return `${Math.round(n)} MW`;
  }

  function syntheticSeries(ctx) {
    return Array.from({ length: 28 }, (_, index) => {
      const base = 420000;
      const loadMw = base + Math.sin(index / 27 * Math.PI * 2) * 36000 + ctx.helpers.seededValue(index, -9000, 9000);
      const forecastMw = loadMw * (1 + ctx.helpers.seededValue(index + 40, -0.014, 0.018));
      const stressPct = ctx.helpers.seededValue(index + 80, 28, 76);
      return {
        period: `T-${27 - index}`,
        label: `${27 - index}h`,
        loadMw,
        forecastMw,
        stressPct,
        operatingMarginPct: ctx.helpers.seededValue(index + 120, 5, 20),
        frequencyHz: 60 + ctx.helpers.seededValue(index + 160, -0.018, 0.018),
      };
    });
  }

  function normalizeSeries(data, ctx) {
    const raw = Array.isArray(data.series) && data.series.length ? data.series : syntheticSeries(ctx);
    return raw.slice(-32).map((row, index) => ({
      index,
      label: row.label || row.period || `${index}`,
      loadGw: number(row.loadMw) / 1000,
      forecastGw: number(row.forecastMw || row.loadMw) / 1000,
      stressPct: number(row.stressPct, 42),
      marginPct: number(row.operatingMarginPct, 12),
    }));
  }

  function normalizeFuel(data) {
    const fallback = [
      { label: "Natural Gas", sharePct: 36 },
      { label: "Nuclear", sharePct: 19 },
      { label: "Coal", sharePct: 16 },
      { label: "Wind", sharePct: 12 },
      { label: "Solar", sharePct: 9 },
    ];
    const fuel = Array.isArray(data.fuelMix) && data.fuelMix.length ? data.fuelMix : fallback;
    return fuel.slice(0, 5).map((row) => ({
      label: String(row.label || row.fueltype || "Other"),
      sharePct: Math.max(0, Math.min(100, number(row.sharePct, 0))),
    }));
  }

  function normalizeCorridors(data, latest) {
    const fallback = [
      { from: "PJM", to: "MISO", stressPct: 54 },
      { from: "SPP", to: "ERCOT", stressPct: 61 },
      { from: "CAISO", to: "BANC", stressPct: 47 },
    ];
    const corridors = Array.isArray(data.corridors) && data.corridors.length ? data.corridors : fallback;
    return corridors.slice(0, 3).map((row, index) => ({
      name: `${row.from || "BA"}-${row.to || index + 1}`,
      stressPct: Math.max(0, Math.min(100, number(row.stressPct, latest.stressPct || 45))),
    }));
  }

  function buildSpec(series, colors, width, height) {
    return {
      $schema: "https://vega.github.io/schema/vega/v6.json",
      width,
      height,
      padding: { left: 42, right: 14, top: 10, bottom: 34 },
      background: null,
      data: [
        { name: "series", values: series },
        { name: "stress", source: "series", transform: [{ type: "filter", expr: "datum.index % 3 === 0" }] },
      ],
      scales: [
        { name: "x", type: "linear", domain: { data: "series", field: "index" }, range: "width", nice: false, zero: false },
        {
          name: "y",
          type: "linear",
          domain: {
            fields: [
              { data: "series", field: "loadGw" },
              { data: "series", field: "forecastGw" },
            ],
          },
          range: "height",
          nice: true,
          zero: false,
        },
        { name: "stressY", type: "linear", domain: [0, 100], range: [0, 54], nice: false },
      ],
      axes: [
        { orient: "left", scale: "y", tickCount: 4, labelColor: "rgba(243,246,248,0.58)", domainColor: "rgba(255,255,255,0.14)", tickColor: "rgba(255,255,255,0.14)", grid: true, gridColor: "rgba(255,255,255,0.07)", title: "GW", titleColor: "rgba(243,246,248,0.54)" },
        { orient: "bottom", scale: "x", tickCount: 5, labels: false, domainColor: "rgba(255,255,255,0.14)", tickColor: "rgba(255,255,255,0.14)" },
      ],
      marks: [
        {
          type: "rect",
          from: { data: "stress" },
          encode: {
            enter: {
              x: { scale: "x", field: "index" },
              width: { value: 4 },
              y: { signal: "height - scale('stressY', datum.stressPct)" },
              y2: { signal: "height" },
              fill: { value: colors.accent3 },
              fillOpacity: { value: 0.28 },
            },
          },
        },
        {
          type: "area",
          from: { data: "series" },
          encode: {
            enter: {
              x: { scale: "x", field: "index" },
              y: { scale: "y", field: "loadGw" },
              y2: { signal: "height" },
              fill: { value: colors.accent },
              fillOpacity: { value: 0.12 },
            },
          },
        },
        {
          type: "line",
          from: { data: "series" },
          encode: {
            enter: {
              x: { scale: "x", field: "index" },
              y: { scale: "y", field: "loadGw" },
              stroke: { value: colors.accent },
              strokeWidth: { value: 2.4 },
              strokeOpacity: { value: 0.94 },
            },
          },
        },
        {
          type: "line",
          from: { data: "series" },
          encode: {
            enter: {
              x: { scale: "x", field: "index" },
              y: { scale: "y", field: "forecastGw" },
              stroke: { value: colors.accent2 },
              strokeDash: { value: [6, 5] },
              strokeWidth: { value: 1.7 },
              strokeOpacity: { value: 0.82 },
            },
          },
        },
        {
          type: "symbol",
          from: { data: "series" },
          encode: {
            enter: {
              x: { scale: "x", field: "index" },
              y: { scale: "y", field: "loadGw" },
              size: { signal: "datum.index === data('series').length - 1 ? 90 : 18" },
              fill: { value: colors.accent },
              fillOpacity: { signal: "datum.index === data('series').length - 1 ? 1 : 0.38" },
              stroke: { value: "#ffffff" },
              strokeOpacity: { value: 0.28 },
            },
          },
        },
      ],
    };
  }

  function fallbackChartHtml(series) {
    const loads = series.map((row) => row.loadGw);
    const forecasts = series.map((row) => row.forecastGw);
    const min = Math.min(...loads, ...forecasts);
    const max = Math.max(...loads, ...forecasts);
    const span = Math.max(1, max - min);
    const x = (index) => series.length <= 1 ? 0 : index / (series.length - 1) * 100;
    const y = (value) => 88 - ((value - min) / span) * 68;
    const loadPoints = series.map((row, index) => `${x(index).toFixed(2)},${y(row.loadGw).toFixed(2)}`).join(" ");
    const forecastPoints = series.map((row, index) => `${x(index).toFixed(2)},${y(row.forecastGw).toFixed(2)}`).join(" ");
    const areaPath = `M 0 92 L ${loadPoints.replace(/ /g, " L ")} L 100 92 Z`;
    const bars = series.filter((_, index) => index % 3 === 0).map((row, index) => {
      const left = x(index * 3);
      const h = Math.max(5, Math.min(44, row.stressPct * 0.44));
      return `<rect class="stress-bar" x="${left.toFixed(2)}" y="${(92 - h).toFixed(2)}" width="1.1" height="${h.toFixed(2)}"></rect>`;
    }).join("");
    return `<svg class="grid-fallback-chart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      ${bars}
      <path class="load-area" d="${areaPath}"></path>
      <polyline class="load-line" points="${loadPoints}"></polyline>
      <polyline class="forecast-line" points="${forecastPoints}"></polyline>
    </svg>`;
  }

  function hydrateVega(id, series) {
    loadVega().then((vega) => {
      const mount = document.getElementById(id);
      if (!mount) return;
      if (mount.__vegaView) mount.__vegaView.finalize();
      mount.textContent = "";
      const styles = getComputedStyle(document.documentElement);
      const colors = {
        accent: styles.getPropertyValue("--accent").trim() || "#f9e66e",
        accent2: styles.getPropertyValue("--accent2").trim() || "#62ffbd",
        accent3: styles.getPropertyValue("--accent3").trim() || "#ff705f",
      };
      const width = Math.max(260, mount.clientWidth || 520);
      const height = Math.max(180, mount.clientHeight || 280);
      const spec = buildSpec(series, colors, width, height);
      const view = new vega.View(vega.parse(spec), { renderer: "svg", container: mount, hover: true });
      mount.__vegaView = view;
      view.runAsync().then(() => animateGrid(mount.closest(".power-grid-identity"))).catch(() => {});
    }).catch(() => {
      const mount = document.getElementById(id);
      if (mount) mount.innerHTML = '<div class="grid-panel-meta" style="padding:12px">vega unavailable</div>';
    });
  }

  function animateGrid(root) {
    if (!root || !window.anime || typeof window.anime.animate !== "function") return;
    const animate = window.anime.animate;
    const stagger = typeof window.anime.stagger === "function" ? window.anime.stagger : () => 0;
    animate(root.querySelectorAll(".grid-node-visual"), {
      scale: [0.82, 1.2, 0.92],
      opacity: [0.48, 1, 0.72],
      delay: stagger(70),
      duration: 2200,
      loop: true,
      ease: "inOut(2)",
    });
    animate(root.querySelectorAll(".grid-flow-line"), {
      opacity: [0.18, 0.82, 0.26],
      scaleX: [0.62, 1, 0.74],
      delay: stagger(90),
      duration: 2400,
      loop: true,
      ease: "inOut(2)",
    });
    animate(root.querySelectorAll(".grid-fuel-track span, .grid-corridor-bar span"), {
      scaleX: [0.84, 1, 0.9],
      transformOrigin: "left center",
      delay: stagger(45),
      duration: 2100,
      loop: true,
      ease: "inOut(2)",
    });
  }

  function nodeHtml() {
    const nodes = [
      ["GEN", 16, 24],
      ["LOAD", 66, 21],
      ["RES", 38, 48],
      ["INT", 73, 64],
      ["ISO", 23, 72],
    ];
    const lines = [
      [18, 28, 45, 9],
      [42, 50, 34, -20],
      [28, 72, 48, -12],
      [40, 48, 38, 24],
      [64, 24, 28, 42],
    ];
    return `
      <div class="grid-network-map">
        <span class="grid-stability-ring"><strong data-grid-stress>--</strong></span>
        ${lines.map(([left, top, width, rotate]) => `<span class="grid-flow-line" style="left:${left}%;top:${top}%;width:${width}%;rotate:${rotate}deg"></span>`).join("")}
        ${nodes.map(([label, left, top]) => `<span class="grid-node-visual" data-label="${label}" style="left:${left}%;top:${top}%"></span>`).join("")}
      </div>
    `;
  }

  function fuelHtml(fuel) {
    return fuel.map((row) => `
      <div class="grid-fuel-row">
        <span class="grid-fuel-label">${escapeHtml(row.label)}</span>
        <span class="grid-fuel-track"><span style="width:${row.sharePct.toFixed(1)}%"></span></span>
        <span class="grid-fuel-share">${Math.round(row.sharePct)}%</span>
      </div>
    `).join("");
  }

  function corridorHtml(corridors) {
    return corridors.map((row) => `
      <div class="grid-corridor-row">
        <span class="grid-corridor-name">${escapeHtml(row.name)}</span>
        <span class="grid-corridor-bar"><span style="width:${row.stressPct.toFixed(1)}%"></span></span>
        <span class="grid-corridor-value">${Math.round(row.stressPct)}%</span>
      </div>
    `).join("");
  }

  window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
  window.KATECHON_DASHBOARD_RENDERERS["power-grid"] = function renderPowerGrid(ctx) {
    const data = ctx.state.livePayload?.data || {};
    const series = normalizeSeries(data, ctx);
    const latestRaw = data.latest || {};
    const latest = {
      loadMw: number(latestRaw.loadMw, series[series.length - 1].loadGw * 1000),
      frequencyHz: number(latestRaw.frequencyHz, 60),
      stressPct: number(latestRaw.stressPct, series[series.length - 1].stressPct),
    };
    const fuel = normalizeFuel(data);
    const corridors = normalizeCorridors(data, latest);
    const id = `power-grid-vega-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    setTimeout(() => hydrateVega(id, series), 0);
    setTimeout(() => {
      const root = document.getElementById(id)?.closest(".power-grid-identity");
      const stress = root?.querySelector("[data-grid-stress]");
      if (stress) stress.textContent = `${Math.round(latest.stressPct)}%`;
    }, 0);

    return `<div class="scene power-grid-identity">
      <section class="grid-vega-panel">
        <div class="grid-panel-head">
          <span class="grid-panel-title">${escapeHtml(data.respondentName || data.respondent || "Grid load")}</span>
          <span class="grid-panel-meta">${formatMw(latest.loadMw)} / ${latest.frequencyHz.toFixed(3)} hz</span>
        </div>
        <div class="grid-vega-mount" id="${id}">${fallbackChartHtml(series)}</div>
      </section>
      <section class="grid-network-panel">
        ${nodeHtml()}
        <div class="grid-corridor-list">${corridorHtml(corridors)}</div>
      </section>
      <section class="grid-fuel-panel">${fuelHtml(fuel)}</section>
    </div>`;
  };
})();
