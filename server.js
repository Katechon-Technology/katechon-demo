const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const BROKER_URL = "https://api.claudetorio.ai";
const BROKER_KEY = "tjkwns%gow214";

// Session IDs tracked at runtime — pre-seed known sessions
const state = {
  sessions: {
    minecraft: process.env.MINECRAFT_SESSION_ID || "minecraft-3161c210",
    news: process.env.NEWS_SESSION_ID || "playwright-browser-385b1d22",
  },
  currentWorkspace: "spectre",
};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// GET current state
app.get("/api/state", (req, res) => {
  res.json({ workspace: state.currentWorkspace, sessions: state.sessions });
});

// POST /api/switch/:workspace
app.post("/api/switch/:workspace", async (req, res) => {
  const { workspace } = req.params;
  state.currentWorkspace = workspace;

  // Tell the container's background.html to switch workspace
  fetch("http://localhost:3100/switch", {
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

// POST /api/register — email gate (just records & returns ok)
app.post("/api/register", (req, res) => {
  const { email } = req.body;
  console.log("registered:", email);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4040;
app.listen(PORT, () => {
  console.log(`katechon-demo running at http://localhost:${PORT}`);
  console.log("tunnels needed:");
  console.log("  HLS (vtuber):  ssh -fN -L 9090:172.20.0.2:3000 claudetorio-stream-server");
  console.log("  Avatar:        ssh -fN -L 9091:172.20.0.2:12393 claudetorio-stream-server");
  console.log("  Avatar WS:     ssh -fN -L 12393:172.20.0.2:12393 claudetorio-stream-server");
  console.log("  SPECTRE:       ssh -fN -L 9092:localhost:3004 claudetorio-stream-server");
  console.log("  Minecraft HLS: ssh -fN -L 9093:localhost:3003 claudetorio-stream-server");
});
