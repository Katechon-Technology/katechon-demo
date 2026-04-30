const path = require("path");
const fs = require("fs");
require("dotenv").config();

function loadEnvKeyFromFile(file, key) {
  if (process.env[key] || !fs.existsSync(file)) return;
  const prefix = `${key}=`;
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((entry) => entry.startsWith(prefix));
  if (!line) return;
  process.env[key] = line.slice(prefix.length).trim().replace(/^['"]|['"]$/g, "");
}

const katechonAppEnv = path.join(__dirname, "..", "katechon-app", ".env.local");
loadEnvKeyFromFile(katechonAppEnv, "ELEVENLABS_API_KEY");
loadEnvKeyFromFile(katechonAppEnv, "ELEVENLABS_MODEL_ID");
loadEnvKeyFromFile(katechonAppEnv, "ANTHROPIC_API_KEY");

const express = require("express");
const fetch = require("node-fetch");
const FormData = require("form-data");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const BROKER_URL = "https://api.claudetorio.ai";
const BROKER_KEY = "tjkwns%gow214";
const HLS_CONTROL_URL = process.env.HLS_CONTROL_URL || "http://localhost:9095";
const VOICES = {
  app: "pFZP5JQG7iQjIQuC4Bku",
  pitch: "jqcCZkN6Knx8BJ5TBdYR",
};
const VOICE_SOURCE = process.env.KAT_VOICE_SOURCE || "pitch";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || VOICES[VOICE_SOURCE] || VOICES.pitch;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const STREAM_AUDIO_ENABLED = process.env.STREAM_AUDIO_ENABLED === "1";
const SPECTRE_PROXY_PREFIX = "/dashboards/spectre";
const SPECTRE_DASHBOARD_UPSTREAMS = [
  process.env.SPECTRE_DASHBOARD_URL,
  process.env.SPECTRE_URL,
  "http://127.0.0.1:3010",
  "http://127.0.0.1:9092",
]
  .filter(Boolean)
  .map((url) => String(url).replace(/\/+$/, ""))
  .filter((url, index, all) => all.indexOf(url) === index);

async function proxyHls(req, res) {
  try {
    const upstream = await fetch(`${HLS_CONTROL_URL}${req.path}`, { timeout: 3000 });
    if (!upstream.ok) {
      return res.status(upstream.status).send(await upstream.text());
    }

    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(await upstream.buffer());
  } catch (err) {
    res.status(502).send(`HLS proxy failed: ${err.message}`);
  }
}

const PANELS = [
  {
    id: "landing",
    label: "main panel",
    description: "The main Katechon panel with available demos/apps.",
  },
  {
    id: "spectre",
    label: "SPECTRE OSINT dashboard",
    description: "The live OSINT/intelligence dashboard running on the remote desktop.",
  },
];

// Session IDs tracked at runtime — pre-seed known sessions
const state = {
  sessions: {
    minecraft: process.env.MINECRAFT_SESSION_ID || "minecraft-3161c210",
    news: process.env.NEWS_SESSION_ID || "playwright-browser-385b1d22",
  },
  currentWorkspace: "landing",
};

const DASHBOARD_NARRATION = {
  spectre: {
    label: "SPECTRE OSINT dashboard",
    voice:
      "You are Kat narrating a live OSINT dashboard. Keep it sharp, observational, and useful. " +
      "React to intelligence workflows, maps, signals, risk, and analyst posture without inventing specific facts.",
    fallback: [
      "SPECTRE is online. I'm watching the signal layer for anything that deserves attention.",
      "This is the OSINT board. Maps, feeds, and posture signals are all in view.",
      "I'm scanning the dashboard like an analyst: movement first, corroboration second.",
      "The useful part here is correlation. One signal is noise, patterns are where the story starts.",
    ],
  },
};
const narrationCursor = {};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/stream.m3u8", proxyHls);
app.get(/^\/seg\d+\.ts$/, proxyHls);

function spectreProxyPath(originalUrl) {
  const url = new URL(originalUrl, "http://katechon.local");
  const pathname = url.pathname.slice(SPECTRE_PROXY_PREFIX.length) || "/";
  return `${pathname}${url.search}`;
}

function rewriteSpectreHtml(html) {
  return html
    .replaceAll("fetch('/api/", "fetch('/dashboards/spectre/api/")
    .replaceAll('fetch("/api/', 'fetch("/dashboards/spectre/api/')
    .replaceAll("EventSource('/api/", "EventSource('/dashboards/spectre/api/")
    .replaceAll('EventSource("/api/', 'EventSource("/dashboards/spectre/api/');
}

async function fetchSpectreUpstream(proxyPath, req) {
  let lastErr = null;
  for (const baseUrl of SPECTRE_DASHBOARD_UPSTREAMS) {
    try {
      const upstream = await fetch(`${baseUrl}${proxyPath}`, {
        method: req.method,
        headers: {
          Accept: req.get("accept") || "*/*",
          "User-Agent": req.get("user-agent") || "katechon-demo",
        },
        timeout: proxyPath.startsWith("/api/stream") ? 0 : 8000,
      });
      return { upstream };
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("no SPECTRE upstream configured");
}

async function proxySpectreDashboard(req, res) {
  const proxyPath = spectreProxyPath(req.originalUrl);
  try {
    const { upstream } = await fetchSpectreUpstream(proxyPath, req);
    const contentType = upstream.headers.get("content-type") || "";

    if (!upstream.ok) {
      return res.status(upstream.status).send(await upstream.text());
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    if (contentType) res.setHeader("Content-Type", contentType);

    if (contentType.includes("text/event-stream")) {
      res.setHeader("Connection", "keep-alive");
      upstream.body.pipe(res);
      return;
    }

    const body = await upstream.buffer();
    if (contentType.includes("text/html")) {
      res.send(rewriteSpectreHtml(body.toString("utf8")));
      return;
    }

    res.send(body);
  } catch (err) {
    res.status(502).send(`SPECTRE proxy failed for ${proxyPath}: ${err.message}`);
  }
}

app.get(/^\/dashboards\/spectre(?:\/.*)?$/, proxySpectreDashboard);

// GET current state
app.get("/api/state", (req, res) => {
  res.json({ workspace: state.currentWorkspace, sessions: state.sessions });
});

// POST /api/switch/:workspace
app.post("/api/switch/:workspace", async (req, res) => {
  const { workspace } = req.params;
  state.currentWorkspace = workspace;

  // Tell the container's background.html to switch workspace
  fetch(`${HLS_CONTROL_URL}/switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspace }),
  }).catch(() => {});

  const sessionId = state.sessions[workspace];
  if (sessionId && workspace !== "spectre") {
    try {
      // Stop any existing livestream
      for (const [, sid] of Object.entries(state.sessions)) {
        if (sid && sid !== sessionId) {
          await fetch(`${BROKER_URL}/api/sessions/${sid}/livestream/stop`, {
            method: "POST",
            headers: { Authorization: `Bearer ${BROKER_KEY}` },
          }).catch(() => {});
        }
      }
      // Start livestream for this workspace
      await fetch(`${BROKER_URL}/api/sessions/${sessionId}/livestream/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${BROKER_KEY}` },
      });
    } catch (err) {
      console.error("broker switch error:", err.message);
    }
  }

  res.json({ ok: true, workspace });
});

// POST /api/sessions/start/:kind  — spawn a session and remember its ID
app.post("/api/sessions/start/:kind", async (req, res) => {
  try {
    const r = await fetch(`${BROKER_URL}/api/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BROKER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ kind: req.params.kind }),
    });
    const session = await r.json();
    const wsKey = req.params.kind === "minecraft" ? "minecraft" : req.params.kind;
    state.sessions[wsKey] = session.id;
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id  — poll session status + stream_url
app.get("/api/sessions/:id", async (req, res) => {
  try {
    const r = await fetch(`${BROKER_URL}/api/sessions/${req.params.id}`, {
      headers: { Authorization: `Bearer ${BROKER_KEY}` },
    });
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sessions/:kind/:id  — register an existing session
app.put("/api/sessions/:kind/:id", (req, res) => {
  state.sessions[req.params.kind] = req.params.id;
  console.log("registered session:", req.params.kind, req.params.id);
  res.json({ ok: true });
});

function workspaceForAction(action) {
  if (action === "open_spectre") return "spectre";
  if (action === "go_home") return "landing";
  return null;
}

function fallbackAgentDecision(transcript) {
  const text = transcript.toLowerCase().replace(/[^\w\s]/g, " ");
  const wantsHome =
    /\b(home|homepage|landing|menu)\b/.test(text) ||
    /\bhome\s+page\b/.test(text) ||
    /\bmain\s+(panel|board|screen|menu|dashboard|page)\b/.test(text) ||
    /\b(back|return|close|exit)\b/.test(text);
  const wantsSpectre =
    /\b(osint|spectre|intel|intelligence)\b/.test(text) ||
    /\bdashboard\b/.test(text);

  if (wantsHome && !/\b(osint|spectre|intel|intelligence)\b/.test(text)) {
    return {
      action: "go_home",
      workspace: "landing",
      speech: "Back to the main panel.",
      source: "fallback",
    };
  }

  if (wantsSpectre) {
    return {
      action: "open_spectre",
      workspace: "spectre",
      speech: "Opening the SPECTRE OSINT dashboard now.",
      source: "fallback",
    };
  }
  return {
    action: "unknown",
    workspace: null,
    speech: "I can open SPECTRE or return to the main panel. Say the panel you want.",
    source: "fallback",
  };
}

function normalizeAgentDecision(raw, transcript, source) {
  const action = String(raw.action || raw.tool || "unknown");
  let workspace = raw.workspace ? String(raw.workspace) : null;
  if (action === "go_home") workspace = "landing";
  if (action === "open_spectre") workspace = "spectre";
  if (workspace && !PANELS.some((panel) => panel.id === workspace)) workspace = null;

  let normalizedAction = action;
  if (workspace === "landing") normalizedAction = "go_home";
  if (workspace === "spectre") normalizedAction = "open_spectre";
  if (!["go_home", "open_spectre", "unknown"].includes(normalizedAction)) normalizedAction = "unknown";

  const speech = String(raw.speech || raw.reply || "").trim();
  if (!speech) return fallbackAgentDecision(transcript);

  return {
    action: normalizedAction,
    workspace,
    speech,
    source,
  };
}

async function routeWithKatAgent(transcript) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackAgentDecision(transcript);

  const panelCatalog = PANELS.map((panel) => `- ${panel.id}: ${panel.label}. ${panel.description}`).join("\n");
  const resp = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 240,
      system:
        "You are Kat, the VTuber agent operating a remote Linux desktop for the viewer. " +
        "Route each transcript into exactly one control decision. Be snappy. " +
        "If the user asks for an app/panel/dashboard, choose that panel. If they ask to go back/home/main, choose landing. " +
        "If the request is unclear, do not change panels. Always produce one short spoken line in Kat's voice.\n\n" +
        `Available panels:\n${panelCatalog}`,
      tools: [
        {
          name: "control_desktop",
          description: "Choose what Kat should do with the remote desktop and what she should say.",
          input_schema: {
            type: "object",
            properties: {
              action: {
                type: "string",
                enum: ["open_spectre", "go_home", "unknown"],
              },
              workspace: {
                type: "string",
                enum: PANELS.map((panel) => panel.id),
                description: "Target panel when action changes the desktop.",
              },
              speech: {
                type: "string",
                description: "One short spoken response, under 14 words, in Kat's voice. No markdown.",
              },
            },
            required: ["action", "speech"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "control_desktop" },
      messages: [{ role: "user", content: transcript }],
    }),
    timeout: 2500,
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`anthropic ${resp.status}: ${body.slice(0, 240)}`);
  }

  const data = await resp.json();
  const toolUse = data.content?.find((block) => block.type === "tool_use" && block.name === "control_desktop");
  if (!toolUse) throw new Error("anthropic did not return control_desktop");
  return normalizeAgentDecision(toolUse.input || {}, transcript, "anthropic");
}

async function synthesizeSpeech(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL_ID,
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`ElevenLabs ${resp.status}: ${body.slice(0, 300)}`);
  }

  return (await resp.buffer()).toString("base64");
}

function cleanSpeech(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim()
    .slice(0, 360);
}

function fallbackNarration(dashboardId) {
  const dashboard = DASHBOARD_NARRATION[dashboardId] || DASHBOARD_NARRATION.spectre;
  const index = narrationCursor[dashboardId] || 0;
  narrationCursor[dashboardId] = index + 1;
  return dashboard.fallback[index % dashboard.fallback.length];
}

async function generateDashboardNarration(dashboardId) {
  const dashboard = DASHBOARD_NARRATION[dashboardId];
  if (!dashboard) throw new Error(`unknown dashboard: ${dashboardId}`);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackNarration(dashboardId);

  try {
    const resp = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 90,
        system:
          `${dashboard.voice} Speak as one short narration beat, 1 sentence, under 22 words. ` +
          "No markdown, no stage directions, no unverifiable claims.",
        messages: [
          {
            role: "user",
            content: `Generate the next live narration line for ${dashboard.label}.`,
          },
        ],
      }),
      timeout: 2500,
    });
    if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 180)}`);
    const data = await resp.json();
    const textBlock = data.content?.find((block) => block.type === "text");
    const generated = cleanSpeech(textBlock?.text);
    return generated || fallbackNarration(dashboardId);
  } catch (err) {
    console.warn("dashboard narration failed:", err.message);
    return fallbackNarration(dashboardId);
  }
}

async function postStreamControl(pathname, payload) {
  const resp = await fetch(`${HLS_CONTROL_URL}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    timeout: 1200,
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`${pathname} ${resp.status}: ${JSON.stringify(body).slice(0, 240)}`);
  return body;
}

async function dispatchRemoteCommand(command) {
  const workspace = command.workspace || workspaceForAction(command.action);
  if (workspace) state.currentWorkspace = workspace;

  try {
    return {
      ok: true,
      data: await postStreamControl("/agent", {
        id: command.id,
        action: command.action,
        transcript: command.transcript || "",
        speech: command.speech || command.reply || "",
        reply: command.speech || command.reply || "",
        workspace,
      }),
    };
  } catch (err) {
    console.warn("remote command dispatch failed:", err.message);
    if (!workspace) return { ok: false, error: err.message };

    try {
      await postStreamControl("/switch", { workspace });
      return { ok: true, fallback: "switch" };
    } catch (fallbackErr) {
      console.warn("remote switch fallback failed:", fallbackErr.message);
      return { ok: false, error: fallbackErr.message };
    }
  }
}

async function dispatchRemoteSpeech(payload) {
  try {
    return {
      ok: true,
      data: await postStreamControl("/speak", payload),
    };
  } catch (err) {
    console.warn("remote speech dispatch failed:", err.message);
    return { ok: false, error: err.message };
  }
}

async function runKatAgent(transcript) {
  const startedAt = Date.now();
  const id = `kat-${Date.now()}`;
  let decision;
  try {
    decision = await routeWithKatAgent(transcript);
  } catch (err) {
    console.warn("kat agent routing failed:", err.message);
    decision = fallbackAgentDecision(transcript);
  }

  const workspace = decision.workspace || workspaceForAction(decision.action);
  if (workspace) state.currentWorkspace = workspace;

  const routeMs = Date.now() - startedAt;
  const commandStartedAt = Date.now();
  const commandRemotePromise = dispatchRemoteCommand({
    id,
    transcript,
    action: decision.action,
    speech: decision.speech,
    workspace,
  }).then((result) => ({ ...result, elapsedMs: Date.now() - commandStartedAt }));

  let audio = "";
  const ttsStartedAt = Date.now();
  let ttsMs = 0;
  try {
    audio = await synthesizeSpeech(decision.speech);
  } catch (err) {
    console.warn("kat speech TTS failed:", err.message);
  } finally {
    ttsMs = Date.now() - ttsStartedAt;
  }

  const speechStartedAt = Date.now();
  const speechRemote = audio
    ? await dispatchRemoteSpeech({
        id,
        text: decision.speech,
        audio,
        muted: false,
      }).then((result) => ({ ...result, elapsedMs: Date.now() - speechStartedAt }))
    : { ok: false, error: "no audio" };
  const commandRemote = await commandRemotePromise;

  return {
    id,
    transcript,
    action: decision.action,
    workspace,
    speech: decision.speech,
    source: decision.source,
    audio,
    muted: !audio,
    remote: {
      command: commandRemote,
      speech: speechRemote,
    },
    streamAudio: STREAM_AUDIO_ENABLED,
    timings: {
      routeMs,
      ttsMs,
      totalMs: Date.now() - startedAt,
    },
  };
}

// POST /api/agent — central Kat control path for voice transcripts
app.post("/api/agent", async (req, res) => {
  try {
    const transcript = String(req.body?.transcript || "").trim();
    if (!transcript) return res.status(400).json({ error: "empty transcript" });

    res.json(await runKatAgent(transcript));
  } catch (err) {
    console.error("agent error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Backcompat while the browser migrates to /api/agent.
app.post("/api/command", async (req, res) => {
  try {
    const transcript = String(req.body?.transcript || "").trim();
    if (!transcript) return res.status(400).json({ error: "empty transcript" });
    res.json(await runKatAgent(transcript));
  } catch (err) {
    console.error("command error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/speak — synthesize Kat's reply and forward it to the remote avatar
app.post("/api/speak", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ error: "empty text" });

    const id = String(req.body?.id || `speech-${Date.now()}`);
    let audio = "";
    try {
      audio = await synthesizeSpeech(text);
    } catch (err) {
      console.warn("speech TTS failed:", err.message);
    }

    const payload = {
      id,
      text,
      audio,
      muted: !audio,
    };
    const remote = audio ? await dispatchRemoteSpeech(payload) : { ok: false, error: "no audio" };

    res.json({ ...payload, remote, streamAudio: STREAM_AUDIO_ENABLED });
  } catch (err) {
    console.error("speech error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/narration/:dashboard — one browser-avatar narration payload.
app.get("/api/narration/:dashboard", async (req, res) => {
  try {
    const dashboardId = String(req.params.dashboard || "").toLowerCase().replace(/[^\w-]/g, "");
    if (!DASHBOARD_NARRATION[dashboardId]) {
      return res.status(404).json({ error: `unknown dashboard: ${dashboardId}` });
    }

    const text = await generateDashboardNarration(dashboardId);
    let audio = "";
    try {
      audio = await synthesizeSpeech(text);
    } catch (err) {
      console.warn("dashboard narration TTS failed:", err.message);
    }

    res.json({
      type: "audio",
      id: `narration-${dashboardId}-${Date.now()}`,
      dashboard: dashboardId,
      text,
      audio,
      muted: !audio,
    });
  } catch (err) {
    console.error("narration error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/transcribe — receives audio blob, returns transcript via Groq Whisper
app.post("/api/transcribe", express.raw({ type: "*/*", limit: "10mb" }), async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: "No audio data received" });
    }

    const ct = (req.headers["content-type"] || "audio/webm").split(";")[0].trim();
    const ext = ct.includes("ogg") ? "ogg" : ct.includes("mp4") ? "mp4" : "webm";
    console.log(`transcribe: ${req.body.length} bytes, type=${ct}`);

    // Save for debugging: play /debug-audio.webm to verify mic capture.
    fs.writeFileSync(path.join(__dirname, "public", `debug-audio.${ext}`), req.body);

    const form = new FormData();
    form.append("file", req.body, {
      filename: `audio.${ext}`,
      contentType: ct,
      knownLength: req.body.length,
    });
    form.append("model", "whisper-large-v3");
    form.append("language", "en");
    form.append("response_format", "verbose_json");

    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    const data = await r.json().catch(() => ({}));
    console.log("groq response:", JSON.stringify(data));
    if (!r.ok) {
      const message = data.error?.message || data.error || r.statusText || "Groq transcription failed";
      return res.status(r.status).json({ error: message });
    }

    res.json({ text: data.text || "" });
  } catch (err) {
    console.error("transcribe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/register — email gate (just records & returns ok)
app.post("/api/register", (req, res) => {
  const { email } = req.body;
  console.log("registered:", email);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4040;
app.listen(PORT, () => {
  console.log(`katechon-demo running at http://localhost:${PORT}`);
  console.log(`Kat voice: ${VOICE_SOURCE} (${ELEVENLABS_VOICE_ID}), model=${ELEVENLABS_MODEL_ID}`);
  console.log(`HLS control: ${HLS_CONTROL_URL}`);
});
