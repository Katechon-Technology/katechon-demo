#!/usr/bin/env node
// Pre-generate the build-with-us channel-snapshot assets via Replicate.
// Videos default to bytedance/seedance-2.0 and the schematic image
// defaults to bytedance/seedream-4.5.
//
//   REPLICATE_API_TOKEN=... node scripts/generate-build-with-us-visuals.js
//   node scripts/generate-build-with-us-visuals.js --only=iran
//   node scripts/generate-build-with-us-visuals.js --only=tanker-schematic
//   node scripts/generate-build-with-us-visuals.js --only=tanker-night
//   node scripts/generate-build-with-us-visuals.js --force

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { execFile } = require("child_process");

const root = path.resolve(__dirname, "..");
const videoOutDir = path.join(root, "public", "videos", "build-with-us");
const generatedOutDir = path.join(root, "public", "generated", "build-with-us");
const VIDEO_MODEL = process.env.REPLICATE_VIDEO_MODEL || process.env.REPLICATE_MODEL || "bytedance/seedance-2.0";
const IMAGE_MODEL = process.env.REPLICATE_IMAGE_MODEL || "bytedance/seedream-4.5";
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",").map((s) => s.trim()).filter(Boolean) : null;

function loadEnvKeyFromFile(file, key) {
  if (process.env[key] || !fs.existsSync(file)) return;
  const prefix = `${key}=`;
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  if (!line) return;
  process.env[key] = line.slice(prefix.length).trim().replace(/^['"]|['"]$/g, "");
}

[
  path.join(root, ".env"),
  path.join(root, ".env.local"),
  path.join(root, "..", ".env"),
  path.join(root, "..", ".env.local"),
  path.join(root, "..", "katechon-pitch", ".env"),
  path.join(root, "..", "katechon-pitch", ".env.local"),
  path.join(root, "..", "katechon-app", ".env.local"),
].forEach((file) => {
  loadEnvKeyFromFile(file, "REPLICATE_API_TOKEN");
  loadEnvKeyFromFile(file, "REPLICATE_API_KEY");
});

const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;

const SHOTS = [
  {
    id: "iran",
    kind: "video",
    file: "iran.mp4",
    prompt:
      "Cinematic aerial shot at night over the Iranian plateau, sparse city lights of Tehran in the deep distance, faint missile contrails rising slowly through a thin layer of cloud, dark sky with a cold blue-grey palette, slow forward dolly, photoreal, documentary news drone footage style, no text, no logos.",
    duration: 5,
    aspect_ratio: "16:9",
  },
  {
    id: "strait-of-hormuz",
    kind: "video",
    file: "strait-of-hormuz.mp4",
    prompt:
      "Slow cinematic dolly over the Strait of Hormuz at golden hour, massive oil tanker silhouetted against shimmering water, distant refinery flare stack burning on the horizon, dark sea, warm amber sky bleeding into deep navy, photoreal satellite-to-aerial blend, documentary geopolitical news b-roll, no text, no logos.",
    duration: 5,
    aspect_ratio: "16:9",
  },
  {
    id: "tanker",
    kind: "video",
    file: "tanker.mp4",
    prompt:
      "Slow cinematic top-down aerial dolly at sunrise over a single enormous crude oil supertanker cutting through dark blue water in the Strait of Hormuz, long white wake trailing behind, deck details visible — red pipes, white storage domes, crane silhouettes, distant Iranian coastline faintly on the horizon, warm amber and deep navy palette, photoreal documentary news drone footage, satellite-to-aerial blend, no text, no logos.",
    duration: 5,
    aspect_ratio: "16:9",
  },
  {
    id: "tanker-night",
    kind: "video",
    file: "tanker-night.mp4",
    prompt:
      "Elegant cinematic night shot in the Strait of Hormuz, a single enormous crude oil tanker moving slowly through black water, sparse warm deck lights and navigation lights reflecting on the sea, faint dark coastline and a few distant refinery lights on the horizon, moonless deep navy sky, quiet geopolitical documentary b-roll, slow aerial pullback, no interface, no text, no logos.",
    duration: 5,
    aspect_ratio: "16:9",
  },
  {
    id: "tanker-schematic",
    kind: "image",
    file: "tanker-schematic.jpg",
    outDir: generatedOutDir,
    model: IMAGE_MODEL,
    prompt:
      "Transparent technical diagram of a crude oil supertanker, drafting board style, precise cyan and white engineering linework on a dark transparent glass surface, side elevation and top-down cutaway visible, hull compartments, cargo tanks, ballast tanks, deck manifold piping, pump room, engine room, bow and stern annotations, realtime intelligence schematic, clean professional naval architecture drawing, no logos, no watermark.",
    size: "2K",
    aspect_ratio: "16:9",
  },
];

function selected() {
  if (!only) return SHOTS;
  const wanted = new Set(only);
  return SHOTS.filter((s) => wanted.has(s.id));
}

async function createPrediction(shot) {
  const model = shot.model || VIDEO_MODEL;
  const url = `https://api.replicate.com/v1/models/${model}/predictions`;
  const input = shot.kind === "image"
    ? {
        prompt: shot.prompt,
        size: shot.size || "2K",
        aspect_ratio: shot.aspect_ratio || "16:9",
        sequential_image_generation: "disabled",
        max_images: 1,
      }
    : {
        prompt: shot.prompt,
        duration: shot.duration,
        aspect_ratio: shot.aspect_ratio,
        resolution: "1080p",
      };
  const body = {
    input,
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`replicate create ${resp.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

async function getPrediction(id) {
  const resp = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`replicate poll ${resp.status}: ${text.slice(0, 500)}`);
  }
  return resp.json();
}

async function downloadTo(url, target) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`download ${resp.status} for ${url}`);
  const buffer = await resp.buffer();
  const tmp = `${target}.tmp`;
  fs.writeFileSync(tmp, buffer);
  fs.renameSync(tmp, target);
}

function webmTargetFor(target) {
  return target.replace(/\.mp4$/i, ".webm");
}

function execFilePromise(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd: root }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function transcodeWebmFallback(target) {
  if (!/\.mp4$/i.test(target)) return;
  const webmTarget = webmTargetFor(target);
  const tmp = `${webmTarget}.tmp`;
  await execFilePromise("ffmpeg", [
    "-y",
    "-i", target,
    "-an",
    "-c:v", "libvpx-vp9",
    "-pix_fmt", "yuv420p",
    "-b:v", "0",
    "-crf", "34",
    "-row-mt", "1",
    "-cpu-used", "5",
    "-f", "webm",
    tmp,
  ]);
  fs.renameSync(tmp, webmTarget);
  console.log(`wrote ${path.relative(root, webmTarget)}`);
}

async function generate(shot) {
  const target = path.join(shot.outDir || videoOutDir, shot.file);
  if (fs.existsSync(target) && !force) {
    if (shot.kind === "video" && !fs.existsSync(webmTargetFor(target))) {
      console.log(`transcoding ${shot.id}: ${path.relative(root, webmTargetFor(target))}`);
      if (!dryRun) await transcodeWebmFallback(target);
      return;
    }
    console.log(`skip ${shot.id}: ${path.relative(root, target)} exists (use --force to regenerate)`);
    return;
  }

  const model = shot.model || VIDEO_MODEL;
  console.log(`${dryRun ? "plan" : "generating"} ${shot.id} via ${model} -> ${path.relative(root, target)}`);
  if (dryRun) {
    console.log(`  prompt: ${shot.prompt}`);
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });

  let prediction = await createPrediction(shot);
  const startedAt = Date.now();
  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
      throw new Error(`replicate timeout after ${POLL_TIMEOUT_MS}ms for ${shot.id}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    prediction = await getPrediction(prediction.id);
    process.stdout.write(`.`);
  }
  process.stdout.write("\n");

  if (prediction.status !== "succeeded") {
    throw new Error(`replicate ${prediction.status} for ${shot.id}: ${JSON.stringify(prediction.error || prediction).slice(0, 500)}`);
  }

  const out = prediction.output;
  const assetUrl = Array.isArray(out) ? out[0] : (typeof out === "string" ? out : out?.video || out?.url);
  if (!assetUrl) throw new Error(`no asset url in prediction output: ${JSON.stringify(out).slice(0, 300)}`);

  await downloadTo(assetUrl, target);
  console.log(`wrote ${path.relative(root, target)}`);
  if (shot.kind === "video") await transcodeWebmFallback(target);
}

async function main() {
  if (!apiKey && !dryRun) {
    console.error("REPLICATE_API_TOKEN (or REPLICATE_API_KEY) is not set. Add it to env or .env.");
    process.exit(1);
  }
  const shots = selected();
  if (!shots.length) {
    console.error(`no shots matched --only=${only?.join(",")}`);
    process.exit(1);
  }
  for (const shot of shots) {
    try {
      await generate(shot);
    } catch (err) {
      console.error(`FAILED ${shot.id}: ${err.message}`);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
