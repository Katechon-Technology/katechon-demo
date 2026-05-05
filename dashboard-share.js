const DASHBOARD_SHARE_CATALOG = {
  spectre: {
    label: "SPECTRE Event Room",
    description: "OSINT intelligence room with maps, signals, analyst posture, and live narration.",
  },
  news: {
    label: "News Situation Room",
    description: "Source cards, timeline updates, visual evidence, and editorial state in one watchable news channel.",
  },
  dashboard123: {
    label: "Market Pulse",
    description: "Markets desk with breadth, macro pressure, sentiment, technicals, and portfolio context.",
  },
  "world-monitor": {
    label: "World Monitor",
    description: "Geopolitical intelligence dashboard with maps, briefs, risk signals, and market context.",
  },
  arena: {
    label: "AI Arena",
    description: "Live AI agent competition with parallel tasks, streamed work, and real-time judging.",
  },
  glance: {
    label: "Glance",
    description: "Daily source wall for feeds, markets, weather, communities, and video streams.",
  },
  "crypto-trading": {
    label: "Crypto Trading",
    description: "Read-only crypto cockpit with depth, candles, strategy context, backtests, and risk bands.",
  },
  polyrec: {
    label: "Polyrec",
    description: "Prediction market terminal for BTC markets, oracle timing, order books, and backtesting.",
  },
  biotech: {
    label: "Biotech",
    description: "CRISPR, protein folding, drug pipeline, and nanoscale biology signals in one research surface.",
  },
  space: {
    label: "Deep Space",
    description: "Pulsar timing, exoplanet transits, survey drift, and long-baseline signal intelligence.",
  },
  iran: {
    label: "Iran Signal",
    description: "Measured geopolitical tracker for infrastructure nodes, orbital windows, and regional pressure.",
  },
  "meme-coin": {
    label: "Meme Coin",
    description: "Social market monitor with bonding curve state, holder clusters, liquidity, and narrative velocity.",
  },
  quantum: {
    label: "Quantum States",
    description: "Quantum computing and probability monitor for coherence, fidelity, outcomes, and state changes.",
  },
  "deep-sea": {
    label: "Abyssal Monitor",
    description: "Deep sea sensor network for hydrothermal activity, pressure anomalies, currents, and events.",
  },
  "power-grid": {
    label: "Power Grid",
    description: "Infrastructure operations board for load balancing, frequency drift, corridor stress, and cascade risk.",
  },
  viral: {
    label: "Viral Spread",
    description: "Epidemiology model with R0 estimates, contact networks, scenario curves, and detection lag.",
  },
  "dark-forest": {
    label: "Dark Forest",
    description: "Anomalous astronomy monitor for stellar dimming, catalog irregularities, silence, and clusters.",
  },
  "dune-deck": {
    label: "Dune Fundraise Deck",
    description: "Katechon x Dune fundraise deck with generated visuals and per-slide avatar narration.",
  },
  "rosadelmar-deck": {
    label: "Rosadelmar Deck",
    description: "Rosadelmar pitch deck and one-pager rendered as a fullscreen narrated dashboard.",
  },
};

const DEFAULT_DASHBOARD_ID = "spectre";
const SHARE_THUMBNAIL_DIR = "/share-thumbnails";

function normalizeDashboardId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w-]/g, "");
}

function dashboardShareIds() {
  return Object.keys(DASHBOARD_SHARE_CATALOG);
}

function dashboardShareMetadata(value) {
  const id = normalizeDashboardId(value);
  const dashboard = DASHBOARD_SHARE_CATALOG[id];
  if (!dashboard) return null;
  return {
    id,
    label: dashboard.label,
    title: `${dashboard.label} | Katechon`,
    description: `${dashboard.description} Open the live dashboard in fullscreen channel mode.`,
    imagePath: `${SHARE_THUMBNAIL_DIR}/${id}.jpg`,
  };
}

function dashboardLaunchPath(value, basePath = "") {
  const id = normalizeDashboardId(value) || DEFAULT_DASHBOARD_ID;
  const prefix = normalizeBasePath(basePath);
  return `${prefix}/?dashboard=${encodeURIComponent(id)}&fullscreen=1&autoplay=1`;
}

function dashboardSharePath(value, basePath = "") {
  const id = normalizeDashboardId(value) || DEFAULT_DASHBOARD_ID;
  const prefix = normalizeBasePath(basePath);
  return `${prefix}/share/${encodeURIComponent(id)}`;
}

function dashboardImagePath(value, basePath = "") {
  const id = normalizeDashboardId(value) || DEFAULT_DASHBOARD_ID;
  const prefix = normalizeBasePath(basePath);
  return `${prefix}${SHARE_THUMBNAIL_DIR}/${encodeURIComponent(id)}.jpg`;
}

function normalizeBasePath(value) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (!base || base === "/") return "";
  return base.startsWith("/") ? base : `/${base}`;
}

function absoluteUrl(origin, pathname) {
  const cleanOrigin = String(origin || "").replace(/\/+$/, "");
  return new URL(pathname, `${cleanOrigin || "http://localhost:4040"}/`).href;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDashboardShareHtml({ metadata, shareUrl, targetUrl, imageUrl }) {
  const title = metadata.title;
  const description = metadata.description;
  const escapedTarget = escapeHtml(targetUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(shareUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Katechon">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(`${metadata.label} dashboard thumbnail`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta http-equiv="refresh" content="0;url=${escapedTarget}">
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    html, body { min-height: 100%; margin: 0; background: #050608; color: #f2f4f7; }
    body {
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: Inter, "Helvetica Neue", Arial, sans-serif;
    }
    a {
      color: #00e87b;
      font: 700 13px/1 monospace;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <a href="${escapedTarget}">Open ${escapeHtml(metadata.label)}</a>
  <script>
    window.location.replace(${JSON.stringify(targetUrl)});
  </script>
</body>
</html>`;
}

module.exports = {
  DEFAULT_DASHBOARD_ID,
  DASHBOARD_SHARE_CATALOG,
  SHARE_THUMBNAIL_DIR,
  absoluteUrl,
  dashboardImagePath,
  dashboardLaunchPath,
  dashboardShareIds,
  dashboardShareMetadata,
  dashboardSharePath,
  normalizeDashboardId,
  renderDashboardShareHtml,
};
