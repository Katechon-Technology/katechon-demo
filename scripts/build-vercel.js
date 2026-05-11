const fs = require("fs");
const path = require("path");
const {
  absoluteUrl,
  dashboardImagePath,
  dashboardLaunchPath,
  dashboardShareIds,
  dashboardShareMetadata,
  dashboardSharePath,
  renderDashboardShareHtml,
} = require("../dashboard-share");

const root = path.resolve(__dirname, "..");
const appSource = path.join(root, "public");
const siteSource = path.join(root, "site");
const output = path.join(root, "dist");
const appOutput = path.join(output, "app");
const dashboardIds = [
  "spectre",
  "news",
  "world-monitor",
  "glance",
  "crypto-trading",
  "polyrec",
  "dashboard123",
  "arena",
  "biotech",
  "space",
  "iran",
  "meme-coin",
  "quantum",
  "deep-sea",
  "power-grid",
  "viral",
  "dark-forest",
  "dune-deck",
  "three-internets",
  "every-age-thinks-its-the-last",
  "what-comes-after-the-feed",
  "channels",
  "attention-architecture",
  "reality-glix",
  "build-with-us",
];

function publicOrigin() {
  const configured =
    process.env.KATECHON_PUBLIC_URL ||
    process.env.PUBLIC_SHARE_ORIGIN;
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.VERCEL_ENV === "production") return "https://katechon.technology";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
  return "https://katechon.technology";
}

function writeSharePages(outputRoot, basePath) {
  const origin = publicOrigin();
  for (const id of dashboardShareIds()) {
    const metadata = dashboardShareMetadata(id);
    const targetUrl = absoluteUrl(origin, dashboardLaunchPath(id, basePath));
    const shareUrl = absoluteUrl(origin, dashboardSharePath(id, basePath));
    const imageUrl = absoluteUrl(origin, dashboardImagePath(id, basePath));
    const shareDir = path.join(outputRoot, "share", id);
    fs.mkdirSync(shareDir, { recursive: true });
    fs.writeFileSync(path.join(shareDir, "index.html"), renderDashboardShareHtml({ metadata, shareUrl, targetUrl, imageUrl }));
  }
}

function setHtmlBase(file, href) {
  const html = fs.readFileSync(file, "utf8");
  if (html.includes("<base ")) return;
  fs.writeFileSync(file, html.replace("<head>", `<head>\n  <base href="${href}">`));
}

function rewriteAppPrototypeScripts(file) {
  const html = fs.readFileSync(file, "utf8");
  fs.writeFileSync(file, html
    .replaceAll('src="/dashboards/catalog.js"', 'src="/app/dashboards/catalog.js"')
    .replaceAll('src="/dashboards/prototype.js"', 'src="/app/dashboards/prototype.js"'));
}

function materializeDashboardRoutes(targetRoot, prototypeDashboard) {
  for (const id of dashboardIds) {
    const dashboardDir = path.join(targetRoot, "dashboards", id);
    fs.mkdirSync(dashboardDir, { recursive: true });
    fs.copyFileSync(prototypeDashboard, path.join(dashboardDir, "index.html"));
  }
}

function materializeDeckEntrypoint(targetRoot, indexFile, baseHref = "") {
  const deckDir = path.join(targetRoot, "deck");
  const deckIndex = path.join(deckDir, "index.html");
  fs.mkdirSync(deckDir, { recursive: true });
  fs.copyFileSync(indexFile, deckIndex);
  if (baseHref) setHtmlBase(deckIndex, baseHref);
}

fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(siteSource, output, { recursive: true });
fs.cpSync(appSource, output, { recursive: true, force: true });
fs.cpSync(appSource, appOutput, { recursive: true, force: true });
fs.cpSync(path.join(appSource, "share-thumbnails"), path.join(output, "share-thumbnails"), { recursive: true });
fs.cpSync(path.join(appSource, "share-cards"), path.join(output, "share-cards"), { recursive: true });

const rootPrototypeDashboard = path.join(output, "prototype-dashboard.html");
materializeDashboardRoutes(output, rootPrototypeDashboard);
materializeDeckEntrypoint(output, path.join(output, "index.html"), "/");
setHtmlBase(path.join(output, "decks", "dune", "index.html"), "/decks/dune/");

const appIndex = path.join(appOutput, "index.html");
const appIndexHtml = fs.readFileSync(appIndex, "utf8");
fs.writeFileSync(appIndex, appIndexHtml.replace("<head>", '<head>\n  <base href="/app/">'));
const appPrototypeDashboard = path.join(appOutput, "prototype-dashboard.html");
rewriteAppPrototypeScripts(appPrototypeDashboard);
materializeDashboardRoutes(appOutput, appPrototypeDashboard);
materializeDeckEntrypoint(appOutput, appIndex);

setHtmlBase(path.join(appOutput, "decks", "dune", "index.html"), "/app/decks/dune/");

writeSharePages(output, "");
writeSharePages(appOutput, "/app");

console.log(`Copied ${path.relative(root, appSource)} to ${path.relative(root, output)} and ${path.relative(root, appOutput)}; preserved site data/pdf assets`);
