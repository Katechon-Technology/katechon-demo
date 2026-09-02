#!/usr/bin/env node
// Attach to a running Chromium (--remote-debugging-port=9222), wait, and dump
// the deck's mount state + console errors so we can see why the dashboard
// channel does/doesn't render. Uses the `ws` dep already in node_modules.
const http = require("http");
const WebSocket = require("ws");

function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: "127.0.0.1", port: 9222, path }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}

const EXPR = `(() => {
  const out = {};
  out.currentDashboard = document.body.dataset.currentDashboard || null;
  out.bodyClasses = document.body.className;
  const frames = Array.from(document.querySelectorAll('iframe')).map(f => ({
    id: f.id, cls: f.className, src: f.getAttribute('src') || f.src || '',
    w: f.clientWidth, h: f.clientHeight,
  }));
  out.iframes = frames;
  // Try to peek into the active dashboard frame for the reel root.
  out.frameProbe = frames.map(f => {
    try {
      const el = document.getElementById(f.id);
      const doc = el && el.contentDocument;
      if (!doc) return { id: f.id, doc: false };
      return {
        id: f.id, doc: true,
        hasBwuRoot: !!doc.querySelector('[data-bwu-root]'),
        scene: (doc.querySelector('[data-bwu-root]')||{}).getAttribute ? doc.querySelector('[data-bwu-root]').getAttribute('data-bwu-scene') : null,
        bodyDash: doc.body && doc.body.dataset ? doc.body.dataset.dashboard : null,
        title: doc.title,
      };
    } catch (e) { return { id: f.id, crossOrigin: true, err: String(e).slice(0,80) }; }
  });
  out.buildEffects = (() => { const e=document.getElementById('dashboard-build-effects'); return e? {present:true, transition:e.getAttribute('data-transition'), dash:e.dataset.dashboardId, vis:getComputedStyle(e).opacity}:{present:false}; })();
  out.avatarWrap = (() => { const e=document.getElementById('browser-avatar-wrap'); if(!e) return {present:false}; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); return {present:true, opacity:cs.opacity, x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height)}; })();
  return JSON.stringify(out);
})()`;

(async () => {
  const targets = await getJson("/json/list");
  const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!page) { console.log("no page target"); process.exit(1); }
  console.log("page url:", page.url);
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
  const logs = [];
  let id = 0;
  const send = (method, params) => ws.send(JSON.stringify({ id: ++id, method, params: params || {} }));
  ws.on("open", () => {
    send("Runtime.enable");
    send("Log.enable");
    send("Console.enable");
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 999, method: "Runtime.evaluate", params: { expression: EXPR, returnByValue: true } }));
    }, 1000);
  });
  ws.on("message", (raw) => {
    const m = JSON.parse(raw);
    if (m.method === "Log.entryAdded") logs.push(`[${m.params.entry.level}] ${m.params.entry.text}`.slice(0, 200));
    if (m.method === "Runtime.consoleAPICalled") {
      const t = (m.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ");
      logs.push(`[console.${m.params.type}] ${t}`.slice(0, 200));
    }
    if (m.id === 999) {
      console.log("\n=== STATE ===");
      try { console.log(JSON.stringify(JSON.parse(m.result.result.value), null, 2)); }
      catch (e) { console.log(m.result); }
      console.log("\n=== CONSOLE/LOG (last 30) ===");
      console.log(logs.slice(-30).join("\n"));
      ws.close();
      process.exit(0);
    }
  });
  ws.on("error", (e) => { console.log("ws error", e.message); process.exit(1); });
})();
