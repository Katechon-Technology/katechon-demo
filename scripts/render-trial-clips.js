#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const CAPSULE_DIR = path.join(ROOT, "data", "trial-capsules", "memia-2026-18");
const OUT_DIR = path.join(ROOT, "public", "generated", "trial-clips");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "trial-clips");

function readCapsules() {
  if (!fs.existsSync(CAPSULE_DIR)) return [];
  return fs.readdirSync(CAPSULE_DIR)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(fs.readFileSync(path.join(CAPSULE_DIR, name), "utf8")));
}

function ffmpegPath() {
  return process.env.FFMPEG || "ffmpeg";
}

function fontPath() {
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/run/current-system/sw/share/X11/fonts/TTF/DejaVuSans-Bold.ttf",
    "/run/current-system/sw/share/fonts/truetype/DejaVuSans-Bold.ttf",
  ];
  const direct = candidates.find((file) => fs.existsSync(file));
  if (direct) return direct;
  const matched = spawnSync("fc-match", ["-v", "sans"], { encoding: "utf8" });
  const fileMatch = String(matched.stdout || "").match(/file:\s+"([^"]+)"/);
  return fileMatch && fs.existsSync(fileMatch[1]) ? fileMatch[1] : "";
}

function wrapText(value, width = 34, maxLines = 3) {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (!line) {
      line = word;
    } else if ((line.length + word.length + 1) <= width) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.join("\n");
}

function writeTextFile(dir, name, text) {
  const file = path.join(dir, `${name}.txt`);
  fs.writeFileSync(file, `${text}\n`);
  return file;
}

function drawText(input, output, options) {
  const {
    font,
    file,
    x,
    y,
    size,
    color = "white",
    box = false,
    enable = null,
    lineSpacing = 8,
  } = options;
  const parts = [
    `drawtext=fontfile=${font}`,
    `textfile=${file}`,
    `x=${x}`,
    `y=${y}`,
    `fontsize=${size}`,
    `fontcolor=${color}`,
    `line_spacing=${lineSpacing}`,
  ];
  if (box) {
    parts.push("box=1", "boxcolor=black@0.58", "boxborderw=18");
  }
  if (enable) parts.push(`enable='${enable}'`);
  return `${input}${parts.join(":")}${output}`;
}

function renderCapsule(capsule, font) {
  const scenes = (capsule.sceneSpec?.scenes || []).slice(0, 3);
  if (scenes.length !== 3) throw new Error(`${capsule.channelId} needs exactly 3 scenes`);

  const tmpDir = path.join(ARTIFACT_DIR, capsule.channelId);
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const titleFile = writeTextFile(tmpDir, "title", capsule.story?.title || capsule.channelId);
  const deckFile = writeTextFile(tmpDir, "deck", wrapText(capsule.story?.deck || capsule.story?.thesis || "", 52, 2));
  const sceneFiles = scenes.map((scene, index) => writeTextFile(
    tmpDir,
    `scene-${index + 1}`,
    `${scene.kicker || `0${index + 1}`}\n${wrapText(scene.headline || "", 32, 2)}\n${wrapText(scene.caption || "", 46, 2)}`
  ));

  const inputs = scenes.flatMap((scene) => ["-i", path.join(ROOT, "public", scene.video)]);
  const prep = scenes.map((_, index) => [
    `[${index}:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,trim=duration=5,setpts=PTS-STARTPTS[v${index}]`,
    `[${index}:a]atrim=duration=5,asetpts=PTS-STARTPTS[a${index}]`,
  ]).flat();
  const concatInputs = scenes.map((_, index) => `[v${index}][a${index}]`).join("");
  const filters = [
    ...prep,
    `${concatInputs}concat=n=3:v=1:a=1[vcat][aout]`,
    "[vcat]drawbox=x=0:y=0:w=iw:h=ih:color=black@0.18:t=fill[shade]",
    drawText("[shade]", "[title]", { font, file: titleFile, x: 54, y: 46, size: 42 }),
    drawText("[title]", "[deck]", { font, file: deckFile, x: 58, y: 106, size: 19, color: "white@0.78" }),
    drawText("[deck]", "[s0]", { font, file: sceneFiles[0], x: 58, y: 442, size: 28, box: true, enable: "between(t,0,5)" }),
    drawText("[s0]", "[s1]", { font, file: sceneFiles[1], x: 58, y: 442, size: 28, box: true, enable: "between(t,5,10)" }),
    drawText("[s1]", "[outv]", { font, file: sceneFiles[2], x: 58, y: 442, size: 28, box: true, enable: "between(t,10,15)" }),
  ];

  const outFile = path.join(OUT_DIR, `${capsule.channelId}.mp4`);
  const args = [
    "-y",
    ...inputs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[outv]",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "22",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "-shortest",
    outFile,
  ];
  const result = spawnSync(ffmpegPath(), args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${capsule.channelId}: ${result.stderr || result.stdout}`);
  }
  return outFile;
}

function main() {
  const font = fontPath();
  if (!font) throw new Error("No usable TTF font found for ffmpeg drawtext");
  const capsules = readCapsules();
  if (!capsules.length) throw new Error("No trial capsules found. Run scripts/generate-trial-channels.js first.");
  const outputs = capsules.map((capsule) => ({
    channelId: capsule.channelId,
    clip: path.relative(ROOT, renderCapsule(capsule, font)),
  }));
  console.log(JSON.stringify({ ok: true, outputs }, null, 2));
}

main();
