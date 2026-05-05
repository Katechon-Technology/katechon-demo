#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = process.env.DUNE_DECK_MANIFEST || path.join(root, "deck.json");
const outputPath = path.join(root, "voiceover-script.md");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const slides = Array.isArray(manifest.slides) ? manifest.slides : [];

const lines = [
  `# ${manifest.title || "Katechon Technology"} Voiceover`,
  "",
  "Source of truth: `deck.json`. Run `npm run dune:voiceover` after changing narration copy.",
  "",
];

if (manifest.targetRuntime) {
  lines.push(`Target runtime: ${manifest.targetRuntime}`, "");
}

slides.forEach((slide, index) => {
  lines.push(`## Slide ${index + 1}`, "", slide.narration || "", "");
});

fs.writeFileSync(outputPath, `${lines.join("\n").trimEnd()}\n`);
console.log(`wrote ${path.relative(process.cwd(), outputPath)}`);
