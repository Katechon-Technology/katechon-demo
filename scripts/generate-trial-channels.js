#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const SOURCE_FILE = path.join(ROOT, "data", "trial-sources", "memia-2026-18.json");
const OUT_DIR = path.join(ROOT, "data", "trial-capsules", "memia-2026-18");
const GENERATED_CLIP_DIR = "generated/trial-clips";
const SOURCE_URL = "https://memia.substack.com/p/memia-202618-planetary-solvency-goblin";

const VIDEO_ROTATION = [
  "videos/build-with-us/iran.mp4",
  "videos/build-with-us/strait-of-hormuz.mp4",
  "videos/build-with-us/tanker-night.mp4",
  "videos/build-with-us/tanker.mp4",
];
const VIDEO_POSTERS = {
  "videos/build-with-us/iran.mp4": "generated/trial-posters/iran.jpg",
  "videos/build-with-us/strait-of-hormuz.mp4": "generated/trial-posters/strait-of-hormuz.jpg",
  "videos/build-with-us/tanker-night.mp4": "generated/trial-posters/tanker-night.jpg",
  "videos/build-with-us/tanker.mp4": "generated/trial-posters/tanker.jpg",
};
const VIDEO_WEBM = {
  "videos/build-with-us/iran.mp4": "generated/trial-videos/iran.webm",
  "videos/build-with-us/strait-of-hormuz.mp4": "generated/trial-videos/strait-of-hormuz.webm",
  "videos/build-with-us/tanker-night.mp4": "generated/trial-videos/tanker-night.webm",
  "videos/build-with-us/tanker.mp4": "generated/trial-videos/tanker.webm",
};

const TOOL_KEYS = [
  "OPENAI_API_KEY",
  "STITCH_API_KEY",
  "PIPEDREAM_CLIENT_ID",
  "PIPEDREAM_CLIENT_SECRET",
  "PIPEDREAM_PROJECT_ID",
  "PIPEDREAM_ENVIRONMENT",
  "REPLICATE_API_TOKEN",
  "REPLICATE_API_KEY",
  "VERCEL_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
];

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\w-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sha(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 12);
}

function toolStatus() {
  return TOOL_KEYS.map((key) => ({
    key,
    present: Boolean(process.env[key]),
    fingerprint: process.env[key] ? sha(process.env[key]) : null,
  }));
}

function capsuleForStory(source, story, index) {
  const channelId = slugify(story.slug || story.title);
  const scenes = story.beats.map((beat, beatIndex) => {
    const video = VIDEO_ROTATION[(index + beatIndex) % VIDEO_ROTATION.length];
    return {
      id: `${channelId}-${beatIndex + 1}`,
      startMs: beatIndex * 5000,
      durationMs: 5000,
      video,
      webm: VIDEO_WEBM[video],
      poster: VIDEO_POSTERS[video],
      kicker: beat.kicker,
      headline: beat.headline,
      caption: beat.caption,
      evidence: beat.evidence,
      avatarSafeZone: {
        edge: "bottom-right",
        xPct: 68,
        yPct: 50,
        widthPct: 28,
        heightPct: 42,
      },
    };
  });

  return {
    schemaVersion: "katechon.trial-capsule.v1",
    id: channelId,
    channelId,
    createdAt: new Date().toISOString(),
    source: {
      id: source.id,
      title: source.title,
      url: source.url || SOURCE_URL,
      access: source.access,
      capturedAt: source.capturedAt,
      note: source.note,
    },
    story: {
      slug: channelId,
      title: story.title,
      deck: story.deck,
      thesis: story.thesis,
      accent: story.accent,
      sourceAngle: story.sourceAngle,
    },
    sceneSpec: {
      durationMs: 15000,
      format: "vertical-safe-landscape",
      targetClipSeconds: 15,
      backgroundAudio: "source-video",
      scenes,
    },
    ui: {
      renderer: "dashboards/identities/memia-story.js",
      css: "dashboards/identities/memia-story.css",
      katPlacement: "lower-right broadcast safe zone",
      captionPlacement: "lower-left, max 58vw desktop, full-width mobile",
      shareModel: "public clip preview, logged-in channel can replay or fork",
    },
    tools: {
      status: toolStatus(),
      localReady: {
        openai: Boolean(process.env.OPENAI_API_KEY),
        stitch: Boolean(process.env.STITCH_API_KEY),
        replicate: Boolean(process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY),
        pipedream: Boolean(process.env.PIPEDREAM_CLIENT_ID && process.env.PIPEDREAM_CLIENT_SECRET && process.env.PIPEDREAM_PROJECT_ID),
        vercel: Boolean(process.env.VERCEL_TOKEN),
        cloudflare: Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
      },
    },
    review: {
      requiredChecks: [
        "desktop screenshot is nonblank",
        "mobile screenshot is nonblank",
        "headline and caption fit inside stage",
        "caption does not overlap Kat lower-right safe zone",
        "share actions are visible",
        "video media is present",
      ],
      lastRun: null,
    },
    share: {
      channelPath: `/dashboards/${channelId}/`,
      clip: `${GENERATED_CLIP_DIR}/${channelId}.mp4`,
      title: `${story.title} - 15s Katechon trial channel`,
      teaser: story.thesis,
      forkPrompts: [
        `Show the evidence behind ${story.title}`,
        `Turn ${story.title} into a 30 second channel`,
        `Compare this story to another Memia post`,
      ],
    },
  };
}

function main() {
  loadEnvFile(path.join(ROOT, ".env"));
  loadEnvFile(path.join(ROOT, ".env.local"));
  loadEnvFile(path.join(ROOT, "..", ".env"));
  loadEnvFile(path.join(ROOT, "..", ".env.local"));

  const source = JSON.parse(fs.readFileSync(SOURCE_FILE, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const capsules = source.stories.map((story, index) => capsuleForStory(source, story, index));
  for (const capsule of capsules) {
    fs.writeFileSync(path.join(OUT_DIR, `${capsule.channelId}.json`), `${JSON.stringify(capsule, null, 2)}\n`);
  }

  console.log(JSON.stringify({
    ok: true,
    capsules: capsules.map((capsule) => ({
      channelId: capsule.channelId,
      scenes: capsule.sceneSpec.scenes.length,
      durationMs: capsule.sceneSpec.durationMs,
      path: path.relative(ROOT, path.join(OUT_DIR, `${capsule.channelId}.json`)),
    })),
  }, null, 2));
}

main();
