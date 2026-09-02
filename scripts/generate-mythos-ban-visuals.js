#!/usr/bin/env node
// Pre-generate the mythos-ban channel-snapshot assets via Replicate.
// Videos default to bytedance/seedance-2.0 and the schematic image
// defaults to bytedance/seedream-4.5. Mirrors generate-build-with-us-visuals.js.
//
//   REPLICATE_API_TOKEN=... node scripts/generate-mythos-ban-visuals.js
//   node scripts/generate-mythos-ban-visuals.js --only=directive
//   node scripts/generate-mythos-ban-visuals.js --only=jailbreak-schematic
//   node scripts/generate-mythos-ban-visuals.js --force

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const root = path.resolve(__dirname, "..");
const videoOutDir = path.join(root, "public", "videos", "mythos-ban");
const generatedOutDir = path.join(root, "public", "generated", "mythos-ban");
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
  path.join(root, "..", "katechon-fast-image-gen", ".env"),
  path.join(root, "..", "katechon-fast-image-gen", ".env.local"),
].forEach((file) => {
  loadEnvKeyFromFile(file, "REPLICATE_API_TOKEN");
  loadEnvKeyFromFile(file, "REPLICATE_API_KEY");
});

const apiKey = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;

// Aesthetic Profile: futuristic anime, Ghost in the Shell meets the Anthropic
// palette (warm clay/coral ~#CC785C accents over ink/slate darks; cyan reserved
// for the generated schematic state). Source packet: the June 12 2026 US
// export-control directive forcing Anthropic to disable Fable 5 / Mythos 5.
const SHOTS = [
  {
    id: "directive",
    kind: "video",
    file: "directive.mp4",
    prompt:
      "Cel-shaded futuristic anime cyberpunk city at night, Ghost in the Shell mood, a single tall corporate data-tower glowing warm terracotta and coral, a stark red official government seal glyph slamming down over it as the tower lights cut to cold grey, light rain and neon reflections on wet streets, slow forward push-in, deep ink-blue and slate palette with clay-coral accents, cinematic anime, no text, no logos.",
    duration: 5,
    aspect_ratio: "16:9",
  },
  {
    id: "models-offline",
    kind: "video",
    file: "models-offline.mp4",
    prompt:
      "Interior of a vast dark server cathedral in a cel-shaded anime style, two enormous glowing model cores powering down side by side, warm coral light draining out of them to cold grey, smaller cores still faintly lit in the background, volumetric haze and god rays, slow cinematic dolly, deep navy and slate palette with terracotta accents, Ghost in the Shell atmosphere, no text, no logos.",
    duration: 5,
    aspect_ratio: "16:9",
  },
  {
    id: "jailbreak",
    kind: "video",
    file: "jailbreak.mp4",
    prompt:
      "Extreme close cinematic anime shot of a single glowing AI model core suspended in a dark reflective chamber, fine streams of cyan code threads probing and wrapping around it, one thread turning warm coral as it finds a seam in the guardrails, Ghost in the Shell net-dive mood, slow orbit, deep ink-blue darkness with coral and cyan light, cel-shaded, no text, no logos.",
    duration: 5,
    aspect_ratio: "16:9",
  },
  {
    id: "closer",
    kind: "video",
    file: "closer.mp4",
    prompt:
      "Quiet wide cel-shaded anime night shot, a single darkened corporate data-tower standing alone in steady rain, one faint warm coral light still pulsing near its peak, wet neon street far below, deep ink-blue sky, slow aerial pullback, melancholy and cinematic, Ghost in the Shell mood, no interface, no text, no logos.",
    duration: 5,
    aspect_ratio: "16:9",
  },
  {
    id: "jailbreak-schematic",
    kind: "image",
    file: "jailbreak-schematic.jpg",
    outDir: generatedOutDir,
    model: IMAGE_MODEL,
    prompt:
      "Transparent technical diagram, drafting-board style, of a software jailbreak of an AI model. On the left a code-repository graph of nodes and edges; on the right a central model core. One highlighted exploit path threads from a flagged flaw node in the repo into the model core, bypassing a guardrail ring. Precise cyan-and-white engineering linework on a dark transparent glass surface, clean annotations reading READ CODEBASE, FIX FLAW, GUARDRAIL BYPASS, the exploit path highlighted in warm coral, realtime intelligence schematic, professional, no logos, no watermark.",
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
  const body = { input };
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

async function generate(shot) {
  const target = path.join(shot.outDir || videoOutDir, shot.file);
  if (fs.existsSync(target) && !force) {
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
