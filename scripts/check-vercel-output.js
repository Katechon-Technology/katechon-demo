const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function requireFile(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required build output: ${file}`);
  }
  return fs.statSync(fullPath);
}

function requireContains(file, pattern, label) {
  const content = read(file);
  const ok = pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern);
  if (!ok) {
    throw new Error(`${file} does not contain ${label || pattern}`);
  }
}

function requireNotContains(file, pattern, label) {
  const content = read(file);
  const ok = pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern);
  if (ok) {
    throw new Error(`${file} unexpectedly contains ${label || pattern}`);
  }
}

function requireNotHtml(file) {
  const content = read(file).trimStart();
  if (/^<!doctype html/i.test(content) || /^<html/i.test(content)) {
    throw new Error(`${file} unexpectedly contains HTML`);
  }
}

const requiredFiles = [
  "dist/index.html",
  "dist/deck/index.html",
  "dist/data/index.html",
  "dist/pdf/index.html",
  "dist/katechon.pdf",
  "dist/whitepaper/index.html",
  "dist/whitepaper/katechon-whitepaper.pdf",
  "dist/og-data.jpg",
  "dist/brand/katechon-motion.gif",
  "dist/prototype-dashboard.html",
  "dist/dashboards/catalog.js",
  "dist/dashboards/prototype.js",
  "dist/dashboards/spectre/index.html",
  "dist/dashboards/news/index.html",
  "dist/dashboards/katechon-technology/index.html",
  "dist/dashboards/what-is-a-channel/index.html",
  "dist/dashboards/live-generated-states/index.html",
  "dist/dashboards/what-should-exist-next/index.html",
  "dist/app/index.html",
  "dist/app/deck/index.html",
  "dist/app/brand/katechon-motion.gif",
  "dist/app/prototype-dashboard.html",
  "dist/app/dashboards/catalog.js",
  "dist/app/dashboards/prototype.js",
  "dist/app/dashboards/spectre/index.html",
  "dist/app/dashboards/news/index.html",
  "dist/app/dashboards/katechon-technology/index.html",
  "dist/app/dashboards/what-is-a-channel/index.html",
  "dist/app/dashboards/live-generated-states/index.html",
  "dist/app/dashboards/what-should-exist-next/index.html",
  "dist/app/share/spectre/index.html",
  "dist/app/share/katechon-technology/index.html",
  "dist/share/spectre/index.html",
  "dist/share/katechon-technology/index.html",
  "dist/app/share-cards/spectre.jpg",
  "dist/share-cards/spectre.jpg",
  "dist/share-thumbnails/spectre.jpg",
];

const channelMusicIds = [
  "crypto-trading",
  "polyrec",
  "meme-coin",
  "spectre",
  "news",
  "dashboard123",
  "world-monitor",
  "arena",
  "glance",
  "biotech",
  "space",
  "iran",
  "quantum",
  "deep-sea",
  "power-grid",
  "viral",
  "dark-forest",
];

for (const id of channelMusicIds) {
  requiredFiles.push(`dist/music/channels/${id}.mp3`);
  requiredFiles.push(`dist/app/music/channels/${id}.mp3`);
}

if (!fs.existsSync(dist)) {
  throw new Error("Missing dist directory. Run node scripts/build-vercel.js first.");
}

for (const file of requiredFiles) {
  requireFile(file);
}

// The production root landing page now lives in ../katechon-landing-page.
// This repo may keep dist/index.html as a project-local fallback, but it is not
// the guardrail for https://www.katechon.technology/.
requireContains("dist/deck/index.html", '<base href="/">', "root deck base tag");
requireContains("dist/deck/index.html", "DECK_CHANNEL_IDS", "demo deck channel list");
requireContains("dist/deck/index.html", "build-with-us", "demo deck includes build-with-us");
requireContains("dist/deck/index.html", /const DECK_CHANNEL_IDS = \[DEMO_HOME_DASHBOARD_ID\];/, "demo deck only contains build-with-us");
requireContains("dist/data/index.html", "https://www.katechon.technology/data/", "canonical data-room URL");
requireContains("dist/data/index.html", "/app/deck/", "data-room deck link");
requireContains("dist/pdf/index.html", "/katechon.pdf", "one-pager PDF link");
requireContains("dist/whitepaper/index.html", "From inference to real time content", "whitepaper title");
requireContains("dist/whitepaper/index.html", "/api/whitepaper-auth", "whitepaper auth endpoint");
requireContains("dist/dashboards/catalog.js", "window.KATECHON_DASHBOARD_CATALOG", "root dashboard catalog registration");
requireContains("dist/dashboards/prototype.js", "function appUrl", "root dashboard appUrl helper");
requireContains("dist/prototype-dashboard.html", "/dashboards/catalog.js", "root catalog script include");
requireContains("dist/dashboards/spectre/index.html", "/dashboards/catalog.js", "root dashboard catalog script include");
requireContains("dist/share/spectre/index.html", "https://www.katechon.technology/share/spectre", "canonical root share URL");
requireContains("dist/share/spectre/index.html", "https://www.katechon.technology/app/?dashboard=spectre", "root share launch URL");
requireContains("dist/share/spectre/index.html", "https://www.katechon.technology/share-cards/spectre.jpg", "branded root share card");
requireContains("dist/share/katechon-technology/index.html", "https://www.katechon.technology/share/katechon-technology", "Katechon Technology root share URL");
requireContains("dist/dashboards/katechon-technology/index.html", "/dashboards/catalog.js", "Katechon Technology root prototype dashboard");
requireContains("dist/dashboards/what-is-a-channel/index.html", "/dashboards/catalog.js", "What Is a Channel root prototype dashboard");
requireContains("dist/dashboards/live-generated-states/index.html", "/dashboards/catalog.js", "Live Generated States root prototype dashboard");
requireContains("dist/dashboards/what-should-exist-next/index.html", "/dashboards/catalog.js", "What Should Exist Next root prototype dashboard");
requireContains("dist/dashboards/seed-round/index.html", "/dashboards/catalog.js", "Seed Round root prototype dashboard");
requireContains("dist/app/index.html", '<base href="/app/">', "the /app base tag");
requireContains("dist/app/deck/index.html", '<base href="/app/">', "the /app deck base tag");
requireContains("dist/app/deck/index.html", "DECK_CHANNEL_IDS", "app deck-mode dashboard subset");
requireContains("dist/app/index.html", "dashboard-build-effects", "app dashboard transition layer");
requireContains("dist/app/dashboards/catalog.js", "window.KATECHON_DASHBOARD_CATALOG", "dashboard catalog registration");
requireContains("dist/app/dashboards/prototype.js", "function appUrl", "dashboard appUrl helper");
requireContains("dist/app/prototype-dashboard.html", "/app/dashboards/catalog.js", "app catalog script include");
requireContains("dist/app/dashboards/spectre/index.html", "/app/dashboards/catalog.js", "app dashboard catalog script include");
requireContains("dist/app/share/spectre/index.html", "https://www.katechon.technology/app/share/spectre", "canonical /app share URL");
requireContains("dist/app/share/spectre/index.html", "https://www.katechon.technology/app/share-cards/spectre.jpg", "branded /app share card");
requireContains("dist/app/share/katechon-technology/index.html", "https://www.katechon.technology/app/share/katechon-technology", "Katechon Technology /app share URL");
requireContains("dist/app/dashboards/katechon-technology/index.html", "/app/dashboards/catalog.js", "Katechon Technology /app prototype dashboard");
requireContains("dist/app/dashboards/what-is-a-channel/index.html", "/app/dashboards/catalog.js", "What Is a Channel /app prototype dashboard");
requireContains("dist/app/dashboards/what-should-exist-next/index.html", "/app/dashboards/catalog.js", "What Should Exist Next /app prototype dashboard");
requireNotHtml("dist/dashboards/catalog.js");
requireNotHtml("dist/dashboards/prototype.js");
requireNotHtml("dist/app/dashboards/catalog.js");
requireNotHtml("dist/app/dashboards/prototype.js");

console.log("Vercel output smoke check passed.");
