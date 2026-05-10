const fs = require("fs");
const path = require("path");
const vm = require("vm");
const fetch = require("node-fetch");

const root = path.resolve(__dirname, "..");
const catalogPath = path.join(root, "public", "dashboards", "catalog.js");
const defaultLengthMs = Number(process.env.CHANNEL_MUSIC_LENGTH_MS || 120000);
const modelId = process.env.ELEVENLABS_MUSIC_MODEL_ID || "music_v1";
const outputFormat = process.env.ELEVENLABS_MUSIC_OUTPUT_FORMAT || "mp3_44100_128";
const timeoutMs = Number(process.env.ELEVENLABS_MUSIC_TIMEOUT_MS || 600000);
const force = process.argv.includes("--force") || process.env.CHANNEL_MUSIC_FORCE === "1";
const dryRun = process.argv.includes("--dry-run");

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
  path.join(root, "..", "katechon-app", ".env.local"),
  path.join(root, "..", "katechon-pitch", ".env.local"),
].forEach((file) => loadEnvKeyFromFile(file, "ELEVENLABS_API_KEY"));

function loadCatalog() {
  const sandbox = { window: {}, console: { warn() {}, error() {}, log() {} } };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(catalogPath, "utf8"), sandbox, { filename: catalogPath, timeout: 1000 });
  return sandbox.window.KATECHON_DASHBOARD_CATALOG || { channels: {}, channelOrder: [] };
}

function selectedIds(catalog) {
  const selectors = process.argv.slice(2)
    .filter((arg) => !arg.startsWith("--"))
    .concat(String(process.env.CHANNEL_MUSIC_IDS || "").split(","))
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  const order = Array.isArray(catalog.channelOrder) ? catalog.channelOrder : Object.keys(catalog.channels || {});
  if (!selectors.length) return order;
  const wanted = new Set(selectors);
  return order.filter((id) => wanted.has(id));
}

async function composeMusic({ id, music }) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");
  const target = path.join(root, "public", music.src);
  const tmp = `${target}.tmp`;

  if (fs.existsSync(target) && !force) {
    console.log(`skip ${id}: ${path.relative(root, target)} exists`);
    return;
  }

  const body = {
    prompt: music.prompt,
    music_length_ms: Number(music.durationMs || defaultLengthMs),
    model_id: modelId,
    force_instrumental: true,
  };

  console.log(`${dryRun ? "plan" : "generating"} ${id}: ${music.title || music.src}`);
  if (dryRun) {
    console.log(JSON.stringify(body, null, 2));
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  const resp = await fetch(`https://api.elevenlabs.io/v1/music?output_format=${encodeURIComponent(outputFormat)}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
    timeout: timeoutMs,
  });

  const buffer = await resp.buffer();
  if (!resp.ok) {
    throw new Error(`ElevenLabs music ${resp.status} for ${id}: ${buffer.toString("utf8").slice(0, 500)}`);
  }

  fs.writeFileSync(tmp, buffer);
  fs.renameSync(tmp, target);
  const songId = resp.headers.get("song-id");
  console.log(`wrote ${path.relative(root, target)}${songId ? ` song-id=${songId}` : ""}`);
}

async function main() {
  const catalog = loadCatalog();
  const ids = selectedIds(catalog);
  for (const id of ids) {
    const music = catalog.channels?.[id]?.music;
    if (!music?.src || !music.prompt) {
      throw new Error(`Missing music metadata for ${id}`);
    }
    await composeMusic({ id, music });
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
