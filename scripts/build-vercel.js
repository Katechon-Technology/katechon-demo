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
const source = path.join(root, "public");
const output = path.join(root, "dist");
const appOutput = path.join(output, "app");
const prototypeDashboard = path.join(source, "prototype-dashboard.html");
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

fs.rmSync(output, { recursive: true, force: true });
fs.cpSync(source, output, { recursive: true });
fs.cpSync(source, appOutput, { recursive: true });

const appIndex = path.join(appOutput, "index.html");
const appIndexHtml = fs.readFileSync(appIndex, "utf8");
fs.writeFileSync(appIndex, appIndexHtml.replace("<head>", '<head>\n  <base href="/app/">'));

for (const id of dashboardIds) {
  const dashboardDir = path.join(appOutput, "dashboards", id);
  fs.mkdirSync(dashboardDir, { recursive: true });
  fs.copyFileSync(prototypeDashboard, path.join(dashboardDir, "index.html"));
}

fs.rmSync(path.join(appOutput, "dashboards", "dune-deck"), { recursive: true, force: true });
fs.cpSync(path.join(source, "decks", "dune"), path.join(appOutput, "dashboards", "dune-deck"), { recursive: true });
fs.rmSync(path.join(appOutput, "dashboards", "rosadelmar-deck"), { recursive: true, force: true });
fs.cpSync(path.join(source, "decks", "rosadelmar"), path.join(appOutput, "dashboards", "rosadelmar-deck"), { recursive: true });

writeSharePages(output, "");
writeSharePages(appOutput, "/app");

console.log(`Copied ${path.relative(root, source)} to ${path.relative(root, output)} and ${path.relative(root, appOutput)}`);
