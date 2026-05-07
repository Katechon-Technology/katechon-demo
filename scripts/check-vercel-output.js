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
  "dist/data/index.html",
  "dist/pdf/index.html",
  "dist/katechon.pdf",
  "dist/og-data.jpg",
  "dist/app/index.html",
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
  "dist/share-thumbnails/spectre.jpg",
];

if (!fs.existsSync(dist)) {
  throw new Error("Missing dist directory. Run node scripts/build-vercel.js first.");
}

for (const file of requiredFiles) {
  requireFile(file);
}

requireContains("dist/index.html", "KATECHON", "landing page brand");
requireContains("dist/index.html", "/app/", "landing page app link");
requireContains("dist/data/index.html", "https://katechon.technology/data/", "canonical data-room URL");
requireContains("dist/data/index.html", "/app/dashboards/dune-deck/", "data-room deck link");
requireContains("dist/pdf/index.html", "/katechon.pdf", "one-pager PDF link");
requireContains("dist/app/index.html", '<base href="/app/">', "the /app base tag");
requireContains("dist/app/dashboards/catalog.js", "window.KATECHON_DASHBOARD_CATALOG", "dashboard catalog registration");
requireContains("dist/app/dashboards/prototype.js", "function appUrl", "dashboard appUrl helper");
requireContains("dist/app/prototype-dashboard.html", "/app/dashboards/catalog.js", "app catalog script include");
requireContains("dist/app/dashboards/spectre/index.html", "/app/dashboards/catalog.js", "app dashboard catalog script include");
requireContains("dist/app/share/spectre/index.html", "https://katechon.technology/app/share/spectre", "canonical /app share URL");
requireContains("dist/app/share/dune-deck/index.html", "https://katechon.technology/app/share/dune-deck", "Dune deck /app share URL");
requireContains("dist/app/dashboards/dune-deck/index.html", '<base href="/app/decks/dune/">', "Dune deck /app base tag");
requireContains("dist/app/decks/dune/deck.json", '"slides"', "Dune deck slides manifest");
requireNotHtml("dist/app/dashboards/catalog.js");
requireNotHtml("dist/app/dashboards/prototype.js");

console.log("Vercel output smoke check passed.");
