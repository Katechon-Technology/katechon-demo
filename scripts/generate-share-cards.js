const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  DASHBOARD_SHARE_CATALOG,
} = require("../dashboard-share");

const root = path.resolve(__dirname, "..");
const thumbnailDir = path.join(root, "public", "share-thumbnails");
const cardDir = path.join(root, "public", "share-cards");
const tmpDir = path.join(root, ".tmp-share-cards");
const dataRoomCard = path.join(root, "site", "og-data.jpg");

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fileDataUrl(file, mime) {
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

function wrapText(text, maxChars, maxLines = 2) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.length === maxLines) {
    const used = lines.join(" ").length;
    if (text.length > used + 2) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?-]+$/, "")}...`;
  }
  return lines;
}

function markSvg(x, y, size) {
  const scale = size / 64;
  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <rect x="4" y="4" width="56" height="56" rx="15" fill="#050608"/>
      <rect x="14" y="12" width="10" height="40" rx="3" fill="#f2f4f7"/>
      <path d="M31 12h12L27 32l16 20H31L15 32 31 12Z" fill="#00e87b"/>
      <rect x="10" y="20" width="3" height="24" rx="1.5" fill="#7de8ff"/>
    </g>`;
}

function dashboardCardSvg({ id, label, description, backgroundPath }) {
  const titleLines = wrapText(label, 23, 2);
  const descLines = wrapText(description, 80, 2);
  const bg = fileDataUrl(backgroundPath, "image/jpeg");
  const titleY = titleLines.length > 1 ? 414 : 454;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#020405" stop-opacity=".72"/>
      <stop offset=".46" stop-color="#020405" stop-opacity=".30"/>
      <stop offset="1" stop-color="#020405" stop-opacity=".82"/>
    </linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#020405" stop-opacity="0"/>
      <stop offset=".42" stop-color="#020405" stop-opacity=".74"/>
      <stop offset="1" stop-color="#020405" stop-opacity=".94"/>
    </linearGradient>
    <linearGradient id="rail" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#00e87b"/>
      <stop offset=".5" stop-color="#7de8ff"/>
      <stop offset="1" stop-color="#00e87b" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <image href="${bg}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1200" height="630" fill="url(#shade)"/>
  <rect y="248" width="1200" height="382" fill="url(#floor)"/>
  <path d="M0 0H1200V630H0Z" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="2"/>
  ${markSvg(72, 58, 62)}
  <text x="152" y="92" fill="#f2f4f7" font-family="Inter, Arial, Helvetica, sans-serif" font-size="24" font-weight="800" letter-spacing="5">KATECHON</text>
  <text x="152" y="122" fill="#7de8ff" font-family="SFMono-Regular, Consolas, monospace" font-size="14" font-weight="700" letter-spacing="4">LIVE SOFTWARE CHANNEL</text>
  <rect x="72" y="164" width="438" height="2" fill="url(#rail)" opacity=".92"/>
  <text x="72" y="${titleY}" fill="#ffffff" font-family="Inter, Arial, Helvetica, sans-serif" font-size="74" font-weight="900" letter-spacing="-1">
    ${titleLines.map((line, index) => `<tspan x="72" dy="${index === 0 ? 0 : 78}">${escapeXml(line)}</tspan>`).join("")}
  </text>
  <text x="76" y="552" fill="#d5dde2" opacity=".82" font-family="Inter, Arial, Helvetica, sans-serif" font-size="24" font-weight="500">
    ${descLines.map((line, index) => `<tspan x="76" dy="${index === 0 ? 0 : 31}">${escapeXml(line)}</tspan>`).join("")}
  </text>
  <text x="942" y="568" fill="#00e87b" font-family="SFMono-Regular, Consolas, monospace" font-size="15" font-weight="700" letter-spacing="3">${escapeXml(id.toUpperCase())}</text>
</svg>`;
}

function dataRoomSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx=".5" cy=".48" r=".7">
      <stop offset="0" stop-color="#1b2b28"/>
      <stop offset=".42" stop-color="#101111"/>
      <stop offset="1" stop-color="#050608"/>
    </radialGradient>
    <linearGradient id="rail" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#00e87b"/>
      <stop offset=".48" stop-color="#7de8ff"/>
      <stop offset="1" stop-color="#e04a2f" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <path d="M0 0H1200V630H0Z" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="2"/>
  ${markSvg(512, 74, 92)}
  <text x="600" y="206" text-anchor="middle" fill="#f2f4f7" font-family="Inter, Arial, Helvetica, sans-serif" font-size="29" font-weight="800" letter-spacing="8">KATECHON TECHNOLOGY</text>
  <text x="600" y="374" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, Helvetica, sans-serif" font-size="128" font-weight="900" letter-spacing="2">DATA ROOM</text>
  <rect x="540" y="418" width="120" height="4" rx="2" fill="url(#rail)"/>
  <text x="600" y="500" text-anchor="middle" fill="#cbd3d6" opacity=".86" font-family="Inter, Arial, Helvetica, sans-serif" font-size="25" font-weight="500" letter-spacing="12">INVESTOR ACCESS</text>
</svg>`;
}

function renderSvgToJpg(svg, output) {
  const tmpSvg = path.join(tmpDir, `${path.basename(output, ".jpg")}.svg`);
  fs.writeFileSync(tmpSvg, svg);
  execFileSync("convert", [tmpSvg, "-quality", "92", output], { stdio: "inherit" });
}

fs.mkdirSync(cardDir, { recursive: true });
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

for (const [id, entry] of Object.entries(DASHBOARD_SHARE_CATALOG)) {
  const backgroundPath = path.join(thumbnailDir, `${id}.jpg`);
  if (!fs.existsSync(backgroundPath)) {
    throw new Error(`Missing share thumbnail: ${path.relative(root, backgroundPath)}`);
  }
  renderSvgToJpg(dashboardCardSvg({
    id,
    label: entry.label,
    description: entry.description,
    backgroundPath,
  }), path.join(cardDir, `${id}.jpg`));
}

renderSvgToJpg(dataRoomSvg(), dataRoomCard);
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(`Generated ${Object.keys(DASHBOARD_SHARE_CATALOG).length} dashboard share cards and site/og-data.jpg`);
