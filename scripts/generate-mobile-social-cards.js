const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const outDir = path.join(__dirname, "..", "public", "social");
const magick = process.env.MAGICK || "magick";

const cards = [
  {
    slug: "spectre",
    channel: "01 / OSINT",
    title: "SPECTRE",
    subtitle: "Watch the OSINT event room as a one-minute Katechon channel.",
    accent: "#00e87b",
    accent2: "#7de8ff",
    bg: "#030608",
  },
  {
    slug: "news",
    channel: "02 / NEWS",
    title: "News Situation Room",
    subtitle: "Source cards, visual context, and editorial state in motion.",
    accent: "#ffbf5f",
    accent2: "#7de8ff",
    bg: "#080607",
  },
  {
    slug: "market-pulse",
    channel: "03 / MARKETS",
    title: "Market Pulse",
    subtitle: "A narrated market desk for breadth, macro pressure, and signal.",
    accent: "#00e87b",
    accent2: "#58d0ff",
    bg: "#04070a",
  },
  {
    slug: "world-monitor",
    channel: "04 / WORLD",
    title: "World Monitor",
    subtitle: "Geopolitical risk, map movement, and market context in one pass.",
    accent: "#00e87b",
    accent2: "#7de8ff",
    bg: "#050608",
  },
  {
    slug: "ai-arena",
    channel: "05 / AGENTS",
    title: "AI Arena",
    subtitle: "Two models, one task, judged like a live match.",
    accent: "#b993ff",
    accent2: "#65f0ff",
    bg: "#070611",
  },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapWords(text, maxChars) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textLines(lines, x, y, size, weight, fill, lineHeight) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="DejaVu Sans" font-size="${size}" font-weight="${weight}">
    ${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join("")}
  </text>`;
}

function panelBars(card) {
  return Array.from({ length: 12 }, (_, index) => {
    const h = 34 + ((index * 37) % 118);
    const x = 710 + index * 24;
    return `<rect x="${x}" y="${392 - h}" width="14" height="${h}" rx="4" fill="${index % 3 === 0 ? card.accent2 : card.accent}" opacity="${index % 3 === 0 ? "0.72" : "0.86"}"/>`;
  }).join("");
}

function nodeField(card) {
  return Array.from({ length: 18 }, (_, index) => {
    const x = 690 + ((index * 83) % 370);
    const y = 102 + ((index * 47) % 210);
    const r = 3 + (index % 4);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${index % 2 ? card.accent : card.accent2}" opacity="0.82"/>`;
  }).join("");
}

function svg(card) {
  const title = wrapWords(card.title.toUpperCase(), 18);
  const subtitle = wrapWords(card.subtitle, 42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${card.bg}"/>
      <stop offset="0.58" stop-color="#081012"/>
      <stop offset="1" stop-color="#000000"/>
    </linearGradient>
    <radialGradient id="hot" cx="0.72" cy="0.26" r="0.62">
      <stop offset="0" stop-color="${card.accent}" stop-opacity="0.24"/>
      <stop offset="1" stop-color="${card.accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#hot)"/>
  <g opacity="0.16">
    ${Array.from({ length: 18 }, (_, i) => `<line x1="0" y1="${i * 38}" x2="1200" y2="${i * 38}" stroke="#ffffff" stroke-width="1"/>`).join("")}
    ${Array.from({ length: 31 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="630" stroke="#ffffff" stroke-width="1"/>`).join("")}
  </g>
  <rect x="48" y="48" width="1104" height="534" rx="28" fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.14)"/>
  <text x="74" y="98" fill="${card.accent}" font-family="DejaVu Sans Mono" font-size="22" font-weight="700">${escapeXml(card.channel)}</text>
  ${textLines(title, 72, 213, title.length > 1 ? 74 : 92, "800", "#f4f7f5", 78)}
  ${textLines(subtitle, 78, title.length > 1 ? 384 : 352, 29, "400", "rgba(244,247,245,0.76)", 40)}
  <g transform="translate(646 76)">
    <rect x="0" y="0" width="444" height="384" rx="22" fill="rgba(3,7,9,0.82)" stroke="rgba(255,255,255,0.16)"/>
    <rect x="25" y="26" width="394" height="54" rx="10" fill="rgba(255,255,255,0.06)"/>
    <circle cx="48" cy="53" r="7" fill="#ff625f"/><circle cx="72" cy="53" r="7" fill="#ffbf5f"/><circle cx="96" cy="53" r="7" fill="${card.accent}"/>
    <rect x="25" y="102" width="188" height="112" rx="12" fill="rgba(255,255,255,0.055)" stroke="rgba(255,255,255,0.10)"/>
    <rect x="231" y="102" width="188" height="112" rx="12" fill="rgba(255,255,255,0.055)" stroke="rgba(255,255,255,0.10)"/>
    <rect x="25" y="238" width="394" height="112" rx="12" fill="rgba(255,255,255,0.055)" stroke="rgba(255,255,255,0.10)"/>
    <g filter="url(#glow)">${nodeField(card)}${panelBars(card)}</g>
    <line x1="42" y1="290" x2="402" y2="290" stroke="${card.accent2}" stroke-width="3" opacity="0.62"/>
    <line x1="42" y1="322" x2="330" y2="322" stroke="${card.accent}" stroke-width="3" opacity="0.72"/>
  </g>
  <g transform="translate(926 380)">
    <circle cx="82" cy="82" r="72" fill="rgba(0,0,0,0.58)" stroke="${card.accent}" stroke-width="3"/>
    <circle cx="82" cy="68" r="42" fill="rgba(244,247,245,0.88)"/>
    <circle cx="66" cy="66" r="6" fill="${card.accent}"/>
    <circle cx="98" cy="66" r="6" fill="${card.accent}"/>
    <rect x="60" y="89" width="44" height="6" rx="3" fill="${card.accent2}"/>
    <path d="M35 144 C48 110 118 110 131 144 Z" fill="${card.accent}" opacity="0.64"/>
  </g>
  <rect x="74" y="510" width="328" height="48" rx="24" fill="${card.accent}"/>
  <text x="104" y="542" fill="#031008" font-family="DejaVu Sans Mono" font-size="20" font-weight="800">WATCH THIS DASHBOARD</text>
  <text x="74" y="583" fill="rgba(244,247,245,0.48)" font-family="DejaVu Sans Mono" font-size="18">KATECHON WATCH</text>
</svg>`;
}

fs.mkdirSync(outDir, { recursive: true });
for (const card of cards) {
  const output = path.join(outDir, `${card.slug}.png`);
  execFileSync(magick, ["-background", "none", "svg:-", output], {
    input: svg(card),
    stdio: ["pipe", "inherit", "inherit"],
  });
  console.log(`generated ${path.relative(path.join(__dirname, ".."), output)}`);
}
