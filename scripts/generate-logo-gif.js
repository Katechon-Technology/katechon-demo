const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const publicBrandDir = path.join(root, "public", "brand");
const siteBrandDir = path.join(root, "site", "brand");
const tmpDir = path.join(root, ".tmp-logo-gif");
const output = path.join(publicBrandDir, "katechon-motion.gif");
const frameCount = 40;
const delay = 5;

function n(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, "");
}

function pulse(frame, phase = 0) {
  const t = (frame / frameCount + phase) * Math.PI * 2;
  return (Math.sin(t) + 1) / 2;
}

function railRects(frame) {
  const offset = (frame / frameCount) * 96;
  return Array.from({ length: 8 }, (_, index) => {
    const x = ((index * 82 + offset) % 660) - 74;
    const alpha = 0.08 + pulse(frame, index / 8) * 0.18;
    const color = index % 2 ? "#7de8ff" : "#00e87b";
    return `<rect x="${n(x)}" y="0" width="2" height="512" rx="1" fill="${color}" opacity="${n(alpha)}"/>`;
  }).join("\n");
}

function mark(frame) {
  const breathe = 1 + pulse(frame) * 0.045;
  const green = 0.78 + pulse(frame, 0.1) * 0.22;
  const cyan = 0.72 + pulse(frame, 0.6) * 0.28;
  const glow = 0.18 + pulse(frame, 0.2) * 0.28;
  const scanY = 90 + pulse(frame, 0.72) * 332;
  return `
    <g transform="translate(256 256) scale(${n(breathe)}) translate(-128 -128) scale(4)">
      <rect x="4" y="4" width="56" height="56" rx="15" fill="#050608"/>
      <rect x="4" y="4" width="56" height="56" rx="15" fill="none" stroke="#ffffff" stroke-opacity=".10"/>
      <rect x="14" y="12" width="10" height="40" rx="3" fill="#f2f4f7"/>
      <path d="M31 12h12L27 32l16 20H31L15 32 31 12Z" fill="#00e87b" opacity="${n(green)}"/>
      <rect x="10" y="20" width="3" height="24" rx="1.5" fill="#7de8ff" opacity="${n(cyan)}"/>
    </g>
    <rect x="112" y="${n(scanY)}" width="288" height="3" rx="1.5" fill="#7de8ff" opacity="${n(glow)}"/>
  `;
}

function frameSvg(frame) {
  const ringOpacity = 0.1 + pulse(frame, 0.34) * 0.18;
  const ringScale = 0.92 + pulse(frame, 0.34) * 0.12;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx=".5" cy=".48" r=".72">
      <stop offset="0" stop-color="#10231d"/>
      <stop offset=".48" stop-color="#071012"/>
      <stop offset="1" stop-color="#020303"/>
    </radialGradient>
    <radialGradient id="halo" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#00e87b" stop-opacity=".42"/>
      <stop offset=".42" stop-color="#7de8ff" stop-opacity=".16"/>
      <stop offset="1" stop-color="#00e87b" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  ${railRects(frame)}
  <circle cx="256" cy="256" r="${n(176 * ringScale)}" fill="none" stroke="#00e87b" stroke-width="2" opacity="${n(ringOpacity)}"/>
  <circle cx="256" cy="256" r="196" fill="url(#halo)" opacity=".42"/>
  ${mark(frame)}
</svg>`;
}

fs.mkdirSync(publicBrandDir, { recursive: true });
fs.mkdirSync(siteBrandDir, { recursive: true });
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

const frames = [];
for (let frame = 0; frame < frameCount; frame += 1) {
  const file = path.join(tmpDir, `frame-${String(frame).padStart(3, "0")}.svg`);
  fs.writeFileSync(file, frameSvg(frame));
  frames.push(file);
}

execFileSync("magick", [
  "-delay", String(delay),
  "-loop", "0",
  ...frames,
  "-layers", "OptimizeTransparency",
  output,
], { stdio: "inherit" });

fs.copyFileSync(output, path.join(siteBrandDir, "katechon-motion.gif"));
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(`Generated ${path.relative(root, output)} and ${path.relative(root, path.join(siteBrandDir, "katechon-motion.gif"))}`);
