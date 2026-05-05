const fs = require("fs");
const path = require("path");

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

console.log(`Copied ${path.relative(root, source)} to ${path.relative(root, output)} and ${path.relative(root, appOutput)}`);
