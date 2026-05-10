// Pump.fun launchpad terminal renderer.
// Three zones: mint firehose (left), graduation track (center), fast movers (right).
// Reads `state.livePayload.data` produced by the meme-coin channel
// (see lib/pumpportal-stream.js + getPumpfunLiveData in server.js).
(function () {
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function compactUsd(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "—";
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  }

  function compactSol(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "0 SOL";
    if (n >= 1000) return `${(n / 1000).toFixed(2)}K SOL`;
    if (n >= 100) return `${n.toFixed(0)} SOL`;
    if (n >= 10) return `${n.toFixed(1)} SOL`;
    return `${n.toFixed(2)} SOL`;
  }

  function compactSec(seconds) {
    const n = Number(seconds);
    if (!Number.isFinite(n) || n < 0) return "—";
    if (n < 60) return `${Math.round(n)}s`;
    if (n < 3600) return `${Math.round(n / 60)}m`;
    if (n < 86400) return `${Math.round(n / 3600)}h`;
    return `${Math.round(n / 86400)}d`;
  }

  function shortMint(mint) {
    if (!mint) return "";
    const s = String(mint);
    if (s.length <= 10) return s;
    return `${s.slice(0, 4)}…${s.slice(-4)}`;
  }

  function pickInitial(name, symbol) {
    const source = (symbol || name || "").trim();
    if (!source) return "?";
    return source[0].toUpperCase();
  }

  function tokenAvatar(token) {
    const safeImage = token.imageUri && /^https?:\/\//i.test(token.imageUri) ? token.imageUri : "";
    const initial = pickInitial(token.name, token.symbol);
    if (safeImage) {
      return `<span class="meme-avatar" data-fallback="${escapeHtml(initial)}">
        <img src="${escapeHtml(safeImage)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('meme-avatar--broken')">
        <span class="meme-avatar-fallback">${escapeHtml(initial)}</span>
      </span>`;
    }
    return `<span class="meme-avatar meme-avatar--broken"><span class="meme-avatar-fallback">${escapeHtml(initial)}</span></span>`;
  }

  function streamBadge(data) {
    const connected = data.streamConnected;
    const source = data.streamSource || "—";
    const ageSec = data.streamLastEventAgoSec;
    const tone = connected && ageSec != null && ageSec < 60
      ? "live"
      : connected
        ? "stale"
        : "fallback";
    const label = connected
      ? (ageSec != null ? `live · ${compactSec(ageSec)} ago` : "live")
      : source === "dexscreener"
        ? "warming up · DEX fallback"
      : source === "coingecko-pump-fun"
        ? "warming up · CoinGecko fallback"
        : "stream offline";
    return `<span class="meme-stream-badge meme-stream-badge--${tone}" title="source: ${escapeHtml(source)}">
      <span class="meme-stream-dot"></span>
      <span>${escapeHtml(label)}</span>
    </span>`;
  }

  function statTile(label, value, note) {
    return `<div class="meme-stat">
      <span class="meme-stat-label">${escapeHtml(label)}</span>
      <strong class="meme-stat-value">${escapeHtml(value)}</strong>
      <span class="meme-stat-note">${escapeHtml(note || "")}</span>
    </div>`;
  }

  function renderHeaderStats(data) {
    const m = data.metrics || {};
    const sol = data.solUsd ? `SOL $${Number(data.solUsd).toFixed(2)}` : "SOL —";
    return `<div class="meme-header-stats">
      ${statTile("Mints / min", Number(m.mintsPerMin || 0).toFixed(1), "live ingest")}
      ${statTile("Trades / min", Number(m.tradesPerMin || 0).toFixed(0), "stream")}
      ${statTile("Grads · 24h", String(m.graduations24h || 0), "→ raydium")}
      ${statTile("Curve TVL", compactUsd(m.totalCurveUsd), `${Math.round(m.totalCurveSol || 0)} SOL`)}
      ${statTile("Active", String(m.activeTokenCount || 0), "tracked")}
      ${statTile("SOL", sol.replace("SOL ", ""), "ref")}
    </div>`;
  }

  function renderCommandStrip(data) {
    const lead = (data.graduationCandidates || [])[0] || {};
    const fresh = (data.recentMints || [])[0] || {};
    const mover = (data.fastMovers || [])[0] || {};
    const leadLabel = lead.mint
      ? `${lead.symbol || shortMint(lead.mint)} · ${Number(lead.fillPct || 0).toFixed(0)}% curve`
      : "watching curve leaders";
    const freshLabel = fresh.mint
      ? `${fresh.symbol || shortMint(fresh.mint)} · ${compactSec(fresh.ageSec)} old`
      : "waiting for fresh mints";
    const moverSide = mover.lastTradeType ? `${mover.lastTradeType} ` : "";
    const moverLabel = mover.mint
      ? `${mover.symbol || shortMint(mover.mint)} · ${moverSide}${compactSol(mover.lastTradeSol || 0)}`
      : "no loud trade yet";
    return `<div class="meme-command-strip">
      <div class="meme-command-lede">
        <span class="meme-zone-eyebrow">decision route</span>
        <strong>Curve → Flow → Source</strong>
        <span>Graduation pressure, first movement, and tape size stay visible together.</span>
      </div>
      <div class="meme-command-cues">
        <span><em>curve</em>${escapeHtml(leadLabel)}</span>
        <span><em>fresh</em>${escapeHtml(freshLabel)}</span>
        <span><em>tape</em>${escapeHtml(moverLabel)}</span>
      </div>
    </div>`;
  }

  function renderFirehose(data) {
    const mints = (data.recentMints || []).slice(0, 14);
    if (!mints.length) {
      return `<section class="meme-zone meme-firehose">
        <header class="meme-zone-head">
          <span class="meme-zone-eyebrow">mint firehose</span>
          <span class="meme-zone-title">New on pump.fun</span>
          ${streamBadge(data)}
        </header>
        <div class="meme-firehose-empty">awaiting first mints from PumpPortal websocket…</div>
      </section>`;
    }
    const rows = mints.map((token, index) => {
      const ageSec = Number(token.ageSec || 0);
      const fresh = ageSec < 30 ? "fresh" : ageSec < 120 ? "warm" : "settled";
      const symbol = token.symbol || token.name || shortMint(token.mint);
      const cap = compactUsd(token.marketCapUsd);
      const fill = Math.max(0, Math.min(100, Number(token.fillPct || 0)));
      const initialBuy = token.initialBuySol ? `dev buy ${compactSol(token.initialBuySol)}` : "no dev buy";
      const social = [
        token.pumpUrl ? `<a class="meme-mint-link" href="${escapeHtml(token.pumpUrl)}" target="_blank" rel="noopener" aria-label="Pump.fun">pump</a>` : "",
        token.twitter ? `<a class="meme-mint-link" href="${escapeHtml(token.twitter)}" target="_blank" rel="noopener" aria-label="X">x</a>` : "",
        token.telegram ? `<a class="meme-mint-link" href="${escapeHtml(token.telegram)}" target="_blank" rel="noopener" aria-label="Telegram">tg</a>` : "",
        token.website ? `<a class="meme-mint-link" href="${escapeHtml(token.website)}" target="_blank" rel="noopener" aria-label="Website">www</a>` : "",
      ].filter(Boolean).join("");
      return `<div class="meme-mint-row meme-mint-row--${fresh}" role="listitem" data-mint="${escapeHtml(token.mint)}" style="--row-index:${index}">
        ${tokenAvatar(token)}
        <span class="meme-mint-body">
          <span class="meme-mint-line">
            <strong class="meme-mint-symbol">${escapeHtml(symbol)}</strong>
            <span class="meme-mint-age">${compactSec(ageSec)} old</span>
          </span>
          <span class="meme-mint-meta">
            <span>${escapeHtml(cap)} cap</span>
            <span>·</span>
            <span>${escapeHtml(initialBuy)}</span>
          </span>
          <span class="meme-mint-curve" aria-label="bonding curve fill">
            <span class="meme-mint-curve-fill" style="width:${fill.toFixed(1)}%"></span>
          </span>
        </span>
        <span class="meme-mint-side">
          <span class="meme-mint-fill">${fill.toFixed(0)}%</span>
          <span class="meme-mint-socials">${social || "<span class=\"meme-mint-link meme-mint-link--ghost\">—</span>"}</span>
        </span>
      </div>`;
    }).join("");
    return `<section class="meme-zone meme-firehose">
      <header class="meme-zone-head">
        <span class="meme-zone-eyebrow">mint firehose</span>
        <span class="meme-zone-title">New on pump.fun</span>
        ${streamBadge(data)}
      </header>
      <div class="meme-firehose-list" role="list">${rows}</div>
    </section>`;
  }

  function renderGraduationTrack(data) {
    const target = Number(data.graduationSolTarget || 85);
    const candidates = (data.graduationCandidates || []).slice(0, 5);
    const recentMigrations = data.recentMigrations || [];
    if (!candidates.length) {
      return `<section class="meme-zone meme-graduation">
        <header class="meme-zone-head">
          <span class="meme-zone-eyebrow">graduation track</span>
          <span class="meme-zone-title">Bonding → ${target} SOL → Raydium</span>
          <span class="meme-zone-note">${recentMigrations.length ? `${recentMigrations.length} graduated recently` : "watching curve"}</span>
        </header>
        <div class="meme-graduation-empty">no candidates above 8% fill yet — waiting on volume.</div>
        ${recentMigrations.length ? renderMigrationStrip(recentMigrations) : ""}
      </section>`;
    }
    const rows = candidates.map((token) => {
      const fill = Math.max(0, Math.min(100, Number(token.fillPct || 0)));
      const remaining = compactSol(token.remainingSol || 0);
      const eta = token.etaSec != null ? compactSec(token.etaSec) : "stalled";
      const lastTrade = token.lastTradeAgoSec != null ? `${compactSec(token.lastTradeAgoSec)} ago` : "—";
      const lastTradeKind = token.lastTradeType === "buy" ? "buy" : token.lastTradeType === "sell" ? "sell" : "";
      const lastTradeSize = token.lastTradeSol ? compactSol(token.lastTradeSol) : "";
      const buys = Number(token.buyCount || 0);
      const sells = Number(token.sellCount || 0);
      const flow = buys + sells > 0 ? Math.round((buys / (buys + sells)) * 100) : 50;
      const symbol = token.symbol || shortMint(token.mint);
      const buyVol = compactSol(token.buyVolSol5m || 0);
      const sellVol = compactSol(token.sellVolSol5m || 0);
      return `<a class="meme-grad-row" href="${escapeHtml(token.pumpUrl)}" target="_blank" rel="noopener" data-mint="${escapeHtml(token.mint)}">
        <div class="meme-grad-head">
          ${tokenAvatar(token)}
          <div class="meme-grad-id">
            <strong>${escapeHtml(symbol)}</strong>
            <span>${escapeHtml(token.name || shortMint(token.mint))}</span>
          </div>
          <div class="meme-grad-fill-meta">
            <strong>${fill.toFixed(1)}%</strong>
            <span>${escapeHtml(remaining)} to grad</span>
          </div>
        </div>
        <div class="meme-grad-bar" aria-label="bonding curve toward graduation">
          <span class="meme-grad-bar-fill" style="width:${fill.toFixed(2)}%">
            <span class="meme-grad-bar-pulse"></span>
          </span>
          <span class="meme-grad-bar-mark" style="left:50%"></span>
          <span class="meme-grad-bar-mark" style="left:80%"></span>
        </div>
        <div class="meme-grad-flow" aria-label="buy vs sell pressure">
          <span class="meme-grad-flow-buy" style="width:${flow}%" title="buys: ${buys}">buys ${buys}</span>
          <span class="meme-grad-flow-sell" style="width:${100 - flow}%" title="sells: ${sells}">sells ${sells}</span>
        </div>
        <div class="meme-grad-meta">
          <span>cap ${escapeHtml(compactUsd(token.marketCapUsd))}</span>
          <span>age ${escapeHtml(compactSec(token.ageSec))}</span>
          <span>last ${lastTradeKind ? `<em class="meme-grad-trade meme-grad-trade--${lastTradeKind}">${escapeHtml(lastTradeKind)}</em>` : ""} ${escapeHtml(lastTradeSize)} · ${escapeHtml(lastTrade)}</span>
          <span>5m flow +${escapeHtml(buyVol)} / -${escapeHtml(sellVol)}</span>
          <span>eta ${escapeHtml(eta)}</span>
        </div>
      </a>`;
    }).join("");
    return `<section class="meme-zone meme-graduation">
      <header class="meme-zone-head">
        <span class="meme-zone-eyebrow">graduation track</span>
        <span class="meme-zone-title">Bonding → ${target} SOL → Raydium</span>
        <span class="meme-zone-note">${recentMigrations.length ? `${recentMigrations.length} graduated recently` : "live curve fill"}</span>
      </header>
      <div class="meme-graduation-list">${rows}</div>
      ${recentMigrations.length ? renderMigrationStrip(recentMigrations) : ""}
    </section>`;
  }

  function renderMigrationStrip(migrations) {
    const items = migrations.slice(0, 6).map((m) => {
      const symbol = m.symbol || shortMint(m.mint);
      return `<a class="meme-migration-pill" href="${escapeHtml(m.pumpUrl)}" target="_blank" rel="noopener">
        ${tokenAvatar(m)}
        <span>
          <strong>${escapeHtml(symbol)}</strong>
          <span>graduated ${escapeHtml(compactSec(m.ageSec))} ago · ${escapeHtml(compactUsd(m.marketCapUsd))}</span>
        </span>
      </a>`;
    }).join("");
    return `<div class="meme-migration-strip" aria-label="recent graduations">
      <span class="meme-migration-label">recent grads →</span>
      ${items}
    </div>`;
  }

  function renderFastMovers(data) {
    const movers = (data.fastMovers || []).slice(0, 8);
    if (!movers.length) {
      return `<section class="meme-zone meme-rotation">
        <header class="meme-zone-head">
          <span class="meme-zone-eyebrow">live tape</span>
          <span class="meme-zone-title">Biggest swings · 5m</span>
        </header>
        <div class="meme-rotation-empty">no recent trades on the stream yet.</div>
      </section>`;
    }
    const rows = movers.map((token) => {
      const symbol = token.symbol || shortMint(token.mint);
      const direction = token.lastTradeType === "buy" ? "buy" : token.lastTradeType === "sell" ? "sell" : "flat";
      const ago = token.lastTradeAgoSec != null ? compactSec(token.lastTradeAgoSec) : "—";
      return `<a class="meme-rotation-row meme-rotation-row--${direction}" href="${escapeHtml(token.pumpUrl)}" target="_blank" rel="noopener" data-mint="${escapeHtml(token.mint)}">
        ${tokenAvatar(token)}
        <span class="meme-rotation-id">
          <strong>${escapeHtml(symbol)}</strong>
          <span>${escapeHtml(token.name || "")}</span>
        </span>
        <span class="meme-rotation-trade">
          <em class="meme-rotation-tag meme-rotation-tag--${direction}">${escapeHtml(direction)}</em>
          <strong>${escapeHtml(compactSol(token.lastTradeSol || 0))}</strong>
          <span>${escapeHtml(ago)}</span>
        </span>
        <span class="meme-rotation-cap">
          <strong>${escapeHtml(compactUsd(token.marketCapUsd))}</strong>
          <span>${Number(token.fillPct || 0).toFixed(0)}% curve</span>
        </span>
      </a>`;
    }).join("");
    return `<section class="meme-zone meme-rotation">
      <header class="meme-zone-head">
        <span class="meme-zone-eyebrow">live tape</span>
        <span class="meme-zone-title">Latest trades by size</span>
      </header>
      <div class="meme-rotation-list">${rows}</div>
    </section>`;
  }

  function renderEmptyState() {
    return `<div class="scene meme-launchpad meme-launchpad--empty">
      <div class="meme-launchpad-empty-card">
        <span class="meme-launchpad-empty-eyebrow">pump.fun terminal</span>
        <strong>Connecting to PumpPortal websocket…</strong>
        <p>Once the stream is open you'll see fresh mints land on the left, bonding-curve fills climb in the center, and live trades scroll on the right. Until then, Kat is reading public fallback rows.</p>
      </div>
    </div>`;
  }

  window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
  window.KATECHON_DASHBOARD_RENDERERS["meme-coin"] = function renderMemeCoin(ctx) {
    const data = ctx.state?.livePayload?.data || null;
    if (!data || !data.kind || data.kind !== "pumpfun-launchpad-v1") {
      return renderEmptyState();
    }
    return `<div class="scene meme-launchpad" data-stream-source="${escapeHtml(data.streamSource || "")}">
      ${renderHeaderStats(data)}
      ${renderCommandStrip(data)}
      <div class="meme-launchpad-zones">
        ${renderFirehose(data)}
        ${renderGraduationTrack(data)}
        ${renderFastMovers(data)}
      </div>
    </div>`;
  };
})();
