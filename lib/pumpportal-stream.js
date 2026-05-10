// PumpPortal real-time websocket consumer.
//
// Maintains a single long-lived WS connection to data.pumpportal.fun, buffers
// recent mints, trades, and migration events, and exposes a snapshot used by
// the meme-coin channel. PumpPortal is community-run and free; we keep the
// surface small and reconnect on failure.
//
// Bonding-curve fill % is derived from `vSolInBondingCurve` against the pump.fun
// graduation threshold (~85 SOL). Market cap is computed in SOL by PumpPortal
// already; we convert to USD using a periodically-refreshed SOL price.

const WebSocket = require("ws");
const fetch = require("node-fetch");

const PUMPPORTAL_URL = "wss://pumpportal.fun/api/data";
const SOL_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";
// Pump.fun's bonding curve initializes with ~30 SOL of *virtual* reserves and
// graduates once ~85 real SOL have been deposited. PumpPortal reports the
// running `vSolInBondingCurve` which is virtual + real combined, so progress
// toward graduation = (vSol - virtualBase) / depositTarget.
const VIRTUAL_SOL_RESERVES = 30;
const GRADUATION_SOL_TARGET = 85; // real SOL to graduate (display constant)
const VSOL_GRADUATION_TARGET = VIRTUAL_SOL_RESERVES + GRADUATION_SOL_TARGET; // 115
const SOL_PRICE_REFRESH_MS = 90 * 1000;
const MINT_WINDOW = 60;
const TRADE_WINDOW = 400;
const MIGRATION_WINDOW = 24;
const ACTIVE_TRACK_LIMIT = 6;
const STREAM_RECONNECT_BASE_MS = 1500;
const STREAM_RECONNECT_MAX_MS = 30000;

const state = {
  ws: null,
  connected: false,
  lastConnectedAt: 0,
  lastEventAt: 0,
  reconnectAttempts: 0,
  reconnectTimer: null,
  mints: [], // newest first
  trades: [], // newest first
  migrations: [], // newest first
  tokens: new Map(), // mint -> live snapshot { mint, name, symbol, imageUri, ... }
  solUsd: 165,
  solUsdAt: 0,
  startedAt: Date.now(),
  errorCount: 0,
  lastErrorAt: 0,
  lastErrorMessage: "",
};

let solPriceTimer = null;
let started = false;

function start() {
  if (started || process.env.DISABLE_PUMPPORTAL_STREAM === "1") return;
  started = true;
  refreshSolPrice().catch(() => {});
  solPriceTimer = setInterval(() => {
    refreshSolPrice().catch(() => {});
  }, SOL_PRICE_REFRESH_MS);
  if (solPriceTimer.unref) solPriceTimer.unref();
  connect();
}

function stop() {
  started = false;
  if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
  if (solPriceTimer) clearInterval(solPriceTimer);
  state.reconnectTimer = null;
  solPriceTimer = null;
  if (state.ws) {
    try { state.ws.removeAllListeners(); state.ws.close(); } catch (_) {}
    state.ws = null;
  }
  state.connected = false;
}

async function refreshSolPrice() {
  try {
    const resp = await fetch(SOL_PRICE_URL, { timeout: 8000 });
    if (!resp.ok) throw new Error(`sol price ${resp.status}`);
    const json = await resp.json();
    const price = Number(json?.solana?.usd);
    if (Number.isFinite(price) && price > 0) {
      state.solUsd = price;
      state.solUsdAt = Date.now();
    }
  } catch (err) {
    // keep last good price
  }
}

function scheduleReconnect() {
  if (!started) return;
  state.reconnectAttempts += 1;
  const delay = Math.min(STREAM_RECONNECT_MAX_MS, STREAM_RECONNECT_BASE_MS * Math.pow(1.6, state.reconnectAttempts));
  if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    connect();
  }, delay);
  if (state.reconnectTimer.unref) state.reconnectTimer.unref();
}

function connect() {
  if (!started) return;
  let ws;
  try {
    ws = new WebSocket(PUMPPORTAL_URL, {
      handshakeTimeout: 8000,
      perMessageDeflate: false,
    });
  } catch (err) {
    state.lastErrorMessage = `connect ${err?.message || err}`;
    state.lastErrorAt = Date.now();
    state.errorCount += 1;
    scheduleReconnect();
    return;
  }
  state.ws = ws;
  ws.on("open", () => {
    state.connected = true;
    state.lastConnectedAt = Date.now();
    state.reconnectAttempts = 0;
    try {
      ws.send(JSON.stringify({ method: "subscribeNewToken" }));
      ws.send(JSON.stringify({ method: "subscribeMigration" }));
    } catch (_) {}
  });
  ws.on("message", (raw) => {
    let payload;
    try { payload = JSON.parse(raw.toString()); } catch (_) { return; }
    state.lastEventAt = Date.now();
    handleMessage(payload);
  });
  ws.on("error", (err) => {
    state.errorCount += 1;
    state.lastErrorMessage = String(err?.message || err);
    state.lastErrorAt = Date.now();
  });
  ws.on("close", () => {
    state.connected = false;
    state.ws = null;
    scheduleReconnect();
  });
}

function handleMessage(payload) {
  if (!payload || typeof payload !== "object") return;
  // PumpPortal echoes subscription confirmations; skip those.
  if (payload.message && !payload.txType && !payload.mint) return;
  const txType = String(payload.txType || "").toLowerCase();
  if (txType === "create") return upsertMint(payload);
  if (txType === "buy" || txType === "sell") return upsertTrade(payload);
  if (txType === "migrate" || payload.pool === "raydium" || payload.method === "subscribeMigration") {
    return upsertMigration(payload);
  }
  // Unknown shape; if it has a mint and curve fields, treat it as a trade-update.
  if (payload.mint && (payload.vSolInBondingCurve != null || payload.marketCapSol != null)) {
    upsertTrade(payload);
  }
}

function clampString(value, max) {
  if (value == null) return "";
  return String(value).slice(0, max);
}

function deriveImageUri(payload) {
  const direct = payload.imageUri || payload.image_uri || payload.image;
  if (direct) return clampString(direct, 400);
  const uri = payload.uri || payload.metadata_uri;
  if (uri && /\.(png|jpe?g|gif|webp)$/i.test(uri)) return clampString(uri, 400);
  return "";
}

function deriveTokenSnapshot(payload, prior = {}) {
  const mint = clampString(payload.mint || payload.tokenMint || prior.mint || "", 64);
  if (!mint) return null;
  const vSol = Number(payload.vSolInBondingCurve);
  const vTokens = Number(payload.vTokensInBondingCurve);
  const marketCapSol = Number(payload.marketCapSol);
  const usdMcap = Number.isFinite(marketCapSol) ? marketCapSol * state.solUsd : prior.marketCapUsd || 0;
  const fillPct = Number.isFinite(vSol) && vSol > 0
    ? Math.max(0, Math.min(100, ((vSol - VIRTUAL_SOL_RESERVES) / GRADUATION_SOL_TARGET) * 100))
    : prior.fillPct || 0;
  const txType = String(payload.txType || "").toLowerCase();
  const lastTradeSol = txType === "buy" || txType === "sell"
    ? Math.abs(Number(payload.solAmount) || 0)
    : prior.lastTradeSol || 0;
  return {
    mint,
    name: clampString(payload.name || prior.name || "", 80),
    symbol: clampString(payload.symbol || prior.symbol || "", 24).toUpperCase(),
    description: clampString(payload.description || prior.description || "", 240),
    imageUri: deriveImageUri(payload) || prior.imageUri || "",
    twitter: clampString(payload.twitter || prior.twitter || "", 200),
    telegram: clampString(payload.telegram || prior.telegram || "", 200),
    website: clampString(payload.website || prior.website || "", 200),
    creator: clampString(payload.traderPublicKey || payload.creator || prior.creator || "", 64),
    pool: clampString(payload.pool || prior.pool || "", 24),
    createdAt: prior.createdAt || Date.now(),
    updatedAt: Date.now(),
    vSolInBondingCurve: Number.isFinite(vSol) ? vSol : prior.vSolInBondingCurve || 0,
    vTokensInBondingCurve: Number.isFinite(vTokens) ? vTokens : prior.vTokensInBondingCurve || 0,
    marketCapSol: Number.isFinite(marketCapSol) ? marketCapSol : prior.marketCapSol || 0,
    marketCapUsd: usdMcap,
    fillPct,
    lastTradeSol,
    lastTradeType: txType === "buy" || txType === "sell" ? txType : prior.lastTradeType || "",
    lastTradeAt: txType === "buy" || txType === "sell" ? Date.now() : prior.lastTradeAt || prior.createdAt || Date.now(),
    buyCount: (prior.buyCount || 0) + (txType === "buy" ? 1 : 0),
    sellCount: (prior.sellCount || 0) + (txType === "sell" ? 1 : 0),
    graduated: Boolean(prior.graduated),
  };
}

function upsertMint(payload) {
  const snapshot = deriveTokenSnapshot(payload, {});
  if (!snapshot) return;
  state.tokens.set(snapshot.mint, snapshot);
  const event = {
    mint: snapshot.mint,
    name: snapshot.name,
    symbol: snapshot.symbol,
    imageUri: snapshot.imageUri,
    creator: snapshot.creator,
    initialBuySol: Math.abs(Number(payload.solAmount) || 0),
    marketCapUsd: snapshot.marketCapUsd,
    marketCapSol: snapshot.marketCapSol,
    twitter: snapshot.twitter,
    telegram: snapshot.telegram,
    website: snapshot.website,
    at: Date.now(),
  };
  state.mints = [event, ...state.mints].slice(0, MINT_WINDOW);
  // Subscribe to its trades so we can fill the bonding curve over time.
  if (state.connected && state.ws && snapshot.mint) {
    try {
      state.ws.send(JSON.stringify({ method: "subscribeTokenTrade", keys: [snapshot.mint] }));
    } catch (_) {}
  }
  pruneTokens();
}

function upsertTrade(payload) {
  const mint = clampString(payload.mint || "", 64);
  if (!mint) return;
  const prior = state.tokens.get(mint) || { mint, createdAt: Date.now() };
  const snapshot = deriveTokenSnapshot(payload, prior);
  if (!snapshot) return;
  state.tokens.set(mint, snapshot);
  state.trades = [{
    mint,
    txType: snapshot.lastTradeType || String(payload.txType || "").toLowerCase(),
    solAmount: Math.abs(Number(payload.solAmount) || 0),
    tokenAmount: Math.abs(Number(payload.tokenAmount) || 0),
    marketCapUsd: snapshot.marketCapUsd,
    fillPct: snapshot.fillPct,
    symbol: snapshot.symbol,
    at: Date.now(),
  }, ...state.trades].slice(0, TRADE_WINDOW);
}

function upsertMigration(payload) {
  const mint = clampString(payload.mint || "", 64);
  if (!mint) return;
  const prior = state.tokens.get(mint);
  if (prior) {
    prior.graduated = true;
    prior.fillPct = 100;
    prior.updatedAt = Date.now();
    state.tokens.set(mint, prior);
  }
  state.migrations = [{
    mint,
    symbol: prior?.symbol || "",
    name: prior?.name || "",
    imageUri: prior?.imageUri || "",
    marketCapUsd: prior?.marketCapUsd || 0,
    at: Date.now(),
  }, ...state.migrations].slice(0, MIGRATION_WINDOW);
}

function pruneTokens() {
  if (state.tokens.size < 240) return;
  // Keep newest 200 by updatedAt.
  const sorted = [...state.tokens.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 200);
  state.tokens.clear();
  for (const token of sorted) state.tokens.set(token.mint, token);
}

function tokenAgeSec(token) {
  return Math.max(0, Math.round((Date.now() - (token.createdAt || Date.now())) / 1000));
}

function ratePerMinute(events, windowMs) {
  if (!events.length) return 0;
  const cutoff = Date.now() - windowMs;
  const count = events.filter((event) => event.at >= cutoff).length;
  return count / (windowMs / 60000);
}

function getSnapshot() {
  const allTokens = [...state.tokens.values()];
  const active = allTokens.filter((token) => !token.graduated && (token.fillPct > 0 || token.vSolInBondingCurve > 0));
  const graduationCandidates = active
    .filter((token) => token.fillPct > 8)
    .sort((a, b) => b.fillPct - a.fillPct)
    .slice(0, ACTIVE_TRACK_LIMIT)
    .map(formatGraduationCandidate);
  const recentMints = state.mints.slice(0, 18).map(formatMintCard);
  const fastMovers = active
    .filter((token) => token.lastTradeAt && (Date.now() - token.lastTradeAt) < 5 * 60 * 1000)
    .sort((a, b) => (b.lastTradeSol || 0) - (a.lastTradeSol || 0))
    .slice(0, 8)
    .map(formatFastMover);
  const mintsPerMin = ratePerMinute(state.mints, 60 * 1000);
  const tradesPerMin = ratePerMinute(state.trades, 60 * 1000);
  const graduations24h = state.migrations.filter((event) => event.at > Date.now() - 24 * 60 * 60 * 1000).length;
  const totalCurveSol = active.reduce((sum, token) => sum + (token.vSolInBondingCurve || 0), 0);
  return {
    connected: state.connected,
    lastEventAt: state.lastEventAt,
    lastEventAgoSec: state.lastEventAt ? Math.max(0, Math.round((Date.now() - state.lastEventAt) / 1000)) : null,
    solUsd: state.solUsd,
    solUsdAt: state.solUsdAt,
    streamUptimeSec: state.lastConnectedAt ? Math.round((Date.now() - state.lastConnectedAt) / 1000) : 0,
    errorCount: state.errorCount,
    lastErrorMessage: state.lastErrorMessage,
    lastErrorAt: state.lastErrorAt,
    mintsPerMin,
    tradesPerMin,
    graduations24h,
    activeTokenCount: active.length,
    totalCurveSol,
    totalCurveUsd: totalCurveSol * state.solUsd,
    recentMints,
    graduationCandidates,
    fastMovers,
    recentMigrations: state.migrations.slice(0, 6).map(formatMigration),
  };
}

function formatMintCard(event) {
  const token = state.tokens.get(event.mint);
  return {
    mint: event.mint,
    name: event.name,
    symbol: event.symbol,
    imageUri: event.imageUri,
    creator: event.creator,
    initialBuySol: event.initialBuySol,
    marketCapUsd: token?.marketCapUsd || event.marketCapUsd,
    marketCapSol: token?.marketCapSol || event.marketCapSol,
    fillPct: token?.fillPct || 0,
    ageSec: Math.max(0, Math.round((Date.now() - event.at) / 1000)),
    twitter: event.twitter,
    telegram: event.telegram,
    website: event.website,
    pumpUrl: `https://pump.fun/coin/${event.mint}`,
  };
}

function formatGraduationCandidate(token) {
  const vSol = Number(token.vSolInBondingCurve) || 0;
  const remainingSol = Math.max(0, VSOL_GRADUATION_TARGET - vSol);
  const recentTradeWindowMs = 5 * 60 * 1000;
  const recentTrades = state.trades.filter((trade) => trade.mint === token.mint && trade.at > Date.now() - recentTradeWindowMs);
  const buyVol = recentTrades.filter((trade) => trade.txType === "buy").reduce((sum, trade) => sum + trade.solAmount, 0);
  const sellVol = recentTrades.filter((trade) => trade.txType === "sell").reduce((sum, trade) => sum + trade.solAmount, 0);
  const netSolPerSec = ((buyVol - sellVol) / Math.max(1, recentTradeWindowMs / 1000));
  const etaSec = netSolPerSec > 0.0001 ? Math.round(remainingSol / netSolPerSec) : null;
  return {
    mint: token.mint,
    name: token.name,
    symbol: token.symbol,
    imageUri: token.imageUri,
    fillPct: Math.round(token.fillPct * 10) / 10,
    vSolInBondingCurve: token.vSolInBondingCurve,
    graduationSolTarget: GRADUATION_SOL_TARGET,
    remainingSol,
    marketCapUsd: token.marketCapUsd,
    marketCapSol: token.marketCapSol,
    ageSec: tokenAgeSec(token),
    lastTradeSol: token.lastTradeSol,
    lastTradeType: token.lastTradeType,
    lastTradeAgoSec: token.lastTradeAt ? Math.max(0, Math.round((Date.now() - token.lastTradeAt) / 1000)) : null,
    buyCount: token.buyCount,
    sellCount: token.sellCount,
    buyVolSol5m: Math.round(buyVol * 100) / 100,
    sellVolSol5m: Math.round(sellVol * 100) / 100,
    netSolPerSec,
    etaSec,
    pumpUrl: `https://pump.fun/coin/${token.mint}`,
    twitter: token.twitter,
    telegram: token.telegram,
    website: token.website,
  };
}

function formatFastMover(token) {
  return {
    mint: token.mint,
    symbol: token.symbol,
    name: token.name,
    imageUri: token.imageUri,
    fillPct: Math.round(token.fillPct * 10) / 10,
    marketCapUsd: token.marketCapUsd,
    lastTradeSol: token.lastTradeSol,
    lastTradeType: token.lastTradeType,
    lastTradeAgoSec: token.lastTradeAt ? Math.max(0, Math.round((Date.now() - token.lastTradeAt) / 1000)) : null,
    pumpUrl: `https://pump.fun/coin/${token.mint}`,
  };
}

function formatMigration(event) {
  return {
    mint: event.mint,
    symbol: event.symbol,
    name: event.name,
    imageUri: event.imageUri,
    marketCapUsd: event.marketCapUsd,
    ageSec: Math.max(0, Math.round((Date.now() - event.at) / 1000)),
    pumpUrl: `https://pump.fun/coin/${event.mint}`,
  };
}

module.exports = {
  start,
  stop,
  getSnapshot,
  GRADUATION_SOL_TARGET,
};
