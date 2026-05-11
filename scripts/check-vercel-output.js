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
  "dist/og-data.jpg",
  "dist/brand/katechon-motion.gif",
  "dist/prototype-dashboard.html",
  "dist/dashboards/catalog.js",
  "dist/dashboards/prototype.js",
  "dist/dashboards/spectre/index.html",
  "dist/dashboards/news/index.html",
  "dist/dashboards/dune-deck/index.html",
  "dist/decks/dune/deck.json",
  "dist/app/index.html",
  "dist/app/deck/index.html",
  "dist/app/brand/katechon-motion.gif",
  "dist/app/prototype-dashboard.html",
  "dist/app/dashboards/catalog.js",
  "dist/app/dashboards/prototype.js",
  "dist/app/dashboards/spectre/index.html",
  "dist/app/dashboards/news/index.html",
  "dist/app/dashboards/dune-deck/index.html",
  "dist/app/decks/dune/deck.json",
  "dist/app/decks/dune/assets/narration/dune-01-founder-v2.mp3",
  "dist/app/decks/dune/assets/narration/dune-02-inflection-v2.mp3",
  "dist/app/decks/dune/assets/narration/dune-03-container-v2.mp3",
  "dist/app/decks/dune/assets/narration/dune-04-channels-v2.mp3",
  "dist/app/decks/dune/assets/narration/dune-05-monetization-v2.mp3",
  "dist/app/share/spectre/index.html",
  "dist/app/share/dune-deck/index.html",
  "dist/share/spectre/index.html",
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
  "dune-deck",
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

requireContains("dist/index.html", "dashboard-build-effects", "root app dashboard transition layer");
requireContains("dist/deck/index.html", '<base href="/">', "root deck base tag");
requireContains("dist/deck/index.html", "DECK_CHANNEL_IDS", "deck-mode dashboard subset");
requireContains("dist/deck/index.html", "dune-deck", "deck starts at dashboard 18");
requireContains("dist/deck/index.html", "build-with-us", "deck includes dashboard 27");
requireContains("dist/index.html", "build-terminal-row", "root app terminal transition markup");
requireContains("dist/index.html", "dashboard-music-toggle", "root app channel music toggle");
requireContains("dist/index.html", "channelMusicAudio", "root app channel music runtime");
requireContains("dist/data/index.html", "https://katechon.technology/data/", "canonical data-room URL");
requireContains("dist/data/index.html", "/app/dashboards/dune-deck/", "data-room deck link");
requireContains("dist/pdf/index.html", "/katechon.pdf", "one-pager PDF link");
requireContains("dist/dashboards/catalog.js", "window.KATECHON_DASHBOARD_CATALOG", "root dashboard catalog registration");
requireContains("dist/dashboards/prototype.js", "function appUrl", "root dashboard appUrl helper");
requireContains("dist/prototype-dashboard.html", "/dashboards/catalog.js", "root catalog script include");
requireContains("dist/dashboards/spectre/index.html", "/dashboards/catalog.js", "root dashboard catalog script include");
requireContains("dist/share/spectre/index.html", "https://katechon.technology/share/spectre", "canonical root share URL");
requireContains("dist/share/spectre/index.html", "https://katechon.technology/?dashboard=spectre", "root share launch URL");
requireContains("dist/share/spectre/index.html", "https://katechon.technology/share-cards/spectre.jpg", "branded root share card");
requireContains("dist/share/dune-deck/index.html", "https://katechon.technology/share/dune-deck", "Dune deck root share URL");
requireContains("dist/dashboards/dune-deck/index.html", "/dashboards/catalog.js", "Dune deck root prototype dashboard");
requireContains("dist/app/index.html", '<base href="/app/">', "the /app base tag");
requireContains("dist/app/deck/index.html", '<base href="/app/">', "the /app deck base tag");
requireContains("dist/app/deck/index.html", "DECK_CHANNEL_IDS", "app deck-mode dashboard subset");
requireContains("dist/app/index.html", "dashboard-build-effects", "app dashboard transition layer");
requireContains("dist/app/dashboards/catalog.js", "window.KATECHON_DASHBOARD_CATALOG", "dashboard catalog registration");
requireContains("dist/app/dashboards/prototype.js", "function appUrl", "dashboard appUrl helper");
requireContains("dist/app/prototype-dashboard.html", "/app/dashboards/catalog.js", "app catalog script include");
requireContains("dist/app/dashboards/spectre/index.html", "/app/dashboards/catalog.js", "app dashboard catalog script include");
requireContains("dist/app/share/spectre/index.html", "https://katechon.technology/app/share/spectre", "canonical /app share URL");
requireContains("dist/app/share/spectre/index.html", "https://katechon.technology/app/share-cards/spectre.jpg", "branded /app share card");
requireContains("dist/app/share/dune-deck/index.html", "https://katechon.technology/app/share/dune-deck", "Dune deck /app share URL");
requireContains("dist/app/dashboards/dune-deck/index.html", "/app/dashboards/catalog.js", "Dune deck /app prototype dashboard");
requireContains("dist/app/decks/dune/deck.json", '"slides"', "Dune deck slides manifest");
requireNotHtml("dist/dashboards/catalog.js");
requireNotHtml("dist/dashboards/prototype.js");
requireNotHtml("dist/app/dashboards/catalog.js");
requireNotHtml("dist/app/dashboards/prototype.js");

console.log("Vercel output smoke check passed.");
