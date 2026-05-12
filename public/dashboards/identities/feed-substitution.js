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

  function buildFeedRows() {
    const rows = [
      { kind: "hot", t: ["w95","w80"] },
      { kind: "",    t: ["w95","w55"] },
      { kind: "alt", t: ["w80","w95","w55"] },
      { kind: "hot", t: ["w95"] },
      { kind: "",    t: ["w80","w55"] },
      { kind: "alt", t: ["w95","w80"] },
      { kind: "hot", t: ["w95","w55"] },
      { kind: "",    t: ["w80"] },
      { kind: "alt", t: ["w95","w80","w55"] },
      { kind: "hot", t: ["w95"] },
      { kind: "",    t: ["w80","w55"] },
      { kind: "alt", t: ["w95","w80"] },
    ];
    const html = rows.map((r) => {
      const k = r.kind ? `fs-feed-row ${r.kind}` : "fs-feed-row";
      const t = r.t.map((w) => `<div class="fs-feed-text ${w}"></div>`).join("");
      return `<div class="${k}"><div class="fs-feed-av"></div><div class="fs-feed-body"><div class="fs-feed-handle"></div>${t}</div></div>`;
    }).join("");
    // Duplicate for seamless loop
    return html + html;
  }

  function wrapTitleQuestionMark() {
    const h1 = document.getElementById("title");
    if (!h1) return;
    const raw = (h1.textContent || "").trim();
    if (!raw.endsWith("?")) return;
    if (h1.querySelector(".fs-title-q")) return;
    const head = raw.slice(0, -1);
    h1.innerHTML = escapeHtml(head) + '<span class="fs-title-q">?</span>';
  }

  function cleanupPrev() {
    const prev = window.__feedSubHandler;
    if (!prev) return;
    try { document.removeEventListener("keydown", prev.onKey); } catch (_) {}
    if (prev.scene) {
      try { prev.scene.removeEventListener("click", prev.onClick); } catch (_) {}
    }
    try { window.removeEventListener("resize", prev.onResize); } catch (_) {}
    if (prev.parentDoc) {
      try { prev.parentDoc.removeEventListener("keydown", prev.onKey); } catch (_) {}
    }
    if (prev.scrambleTimer) clearTimeout(prev.scrambleTimer);
    document.body.classList.remove("escalating");
    window.__feedSubHandler = null;
  }

  function hydrate(uid) {
    cleanupPrev();

    const root = document.querySelector(`[data-fs-root="${uid}"]`);
    if (!root) return;

    wrapTitleQuestionMark();

    const cells = [
      root.querySelector(".c-google"),
      root.querySelector(".c-claude"),
      root.querySelector(".c-feed"),
      root.querySelector(".c-puzzle"),
    ];
    const qPrec   = root.querySelector(".q-precedent");
    const qRep    = root.querySelector(".q-repeat");
    const puzzle  = root.querySelector(".c-puzzle");
    const qGlyph  = root.querySelector(".puzzle-q-big");
    const qWrap   = root.querySelector(".puzzle-q-wrap");
    const overlay = root.querySelector(".puzzle-dominant");

    if (!puzzle || !qGlyph || !qWrap || !overlay) return;

    let state = 0;
    let scrambleTimer = null;
    let scrambling = false;

    function syncOffset() {
      const cellR    = puzzle.getBoundingClientRect();
      const overlayR = overlay.getBoundingClientRect();
      const dx = (cellR.left + cellR.width / 2) -
                 (overlayR.left + overlayR.width / 2);
      const dy = (cellR.top + cellR.height / 2) -
                 (overlayR.top + overlayR.height / 2);
      root.style.setProperty("--qcell-dx", dx + "px");
      root.style.setProperty("--qcell-dy", dy + "px");
      qWrap.classList.add("is-ready");
    }

    function applyStep(el, idx, step) {
      if (!el) return;
      el.classList.remove("is-future", "is-active", "is-past");
      if (idx < step) el.classList.add("is-past");
      else if (idx === step) el.classList.add("is-active");
      else el.classList.add("is-future");
    }

    function setState(n) {
      state = Math.max(0, Math.min(3, n));
      cells.forEach((cell, i) => applyStep(cell, i, state));

      if (qPrec) {
        qPrec.classList.remove("is-future", "is-active", "is-past");
        if (state < 1) qPrec.classList.add("is-active");
        else qPrec.classList.add("is-past");
      }
      if (qRep) {
        qRep.classList.remove("is-future", "is-active", "is-past");
        if (state < 2)      qRep.classList.add("is-future");
        else if (state < 3) qRep.classList.add("is-active");
        else                qRep.classList.add("is-past");
      }

      if (state === 3) {
        puzzle.classList.add("has-escalation");
        document.body.classList.add("escalating");
        startScramble();
      } else {
        puzzle.classList.remove("has-escalation");
        document.body.classList.remove("escalating");
        stopScramble();
        qGlyph.textContent = "?";
      }
    }

    const glyphs = ["█","▓","▒","░","◢","◣","╳","┼","║","═","Σ","Δ","Φ","λ","Ω","*","#"];
    function scrambleOnce() {
      if (scrambling || !puzzle.classList.contains("has-escalation")) return;
      scrambling = true;
      const steps = 7 + Math.floor(Math.random() * 4);
      let i = 0;
      const tick = () => {
        if (!puzzle.classList.contains("has-escalation")) {
          qGlyph.textContent = "?";
          scrambling = false;
          return;
        }
        if (i >= steps) {
          qGlyph.textContent = "?";
          scrambling = false;
          return;
        }
        qGlyph.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
        i += 1;
        setTimeout(tick, 38 + Math.random() * 30);
      };
      tick();
    }
    function startScramble() {
      stopScramble();
      const loop = () => {
        if (!puzzle.classList.contains("has-escalation")) return;
        scrambleOnce();
        scrambleTimer = setTimeout(loop, 6000 + Math.random() * 3000);
        if (window.__feedSubHandler) window.__feedSubHandler.scrambleTimer = scrambleTimer;
      };
      scrambleTimer = setTimeout(loop, 5200);
      if (window.__feedSubHandler) window.__feedSubHandler.scrambleTimer = scrambleTimer;
    }
    function stopScramble() {
      if (scrambleTimer) { clearTimeout(scrambleTimer); scrambleTimer = null; }
      if (window.__feedSubHandler) window.__feedSubHandler.scrambleTimer = null;
    }

    function directionForKey(event) {
      const keys = { ArrowDown: 1, ArrowUp: -1 };
      return keys[event.code] ?? keys[event.key] ?? 0;
    }

    function isActiveInParent() {
      if (!window.parent || window.parent === window) return true;
      try {
        return window.parent.document.body?.dataset?.currentDashboard === "what-comes-after-the-feed";
      } catch (_) {
        return true;
      }
    }

    function requestParentDashboardStep(direction) {
      if (!direction || !window.parent || window.parent === window) return false;
      try {
        window.parent.postMessage({
          type: "dashboard-nav-step",
          dashboard: "what-comes-after-the-feed",
          direction,
        }, window.location.origin);
        return true;
      } catch (_) {
        return false;
      }
    }

    function step(delta) {
      const nextState = state + delta;
      if (nextState < 0 || nextState > 3) return false;
      setState(nextState);
      return true;
    }

    function next() { step(1); }
    function prev() { step(-1); }

    function onKey(e) {
      if (!e || e.defaultPrevented) return;
      if (e.currentTarget !== document && !isActiveInParent()) return;
      const target = e.target;
      if (target && (target.isContentEditable ||
          target.tagName === "INPUT" || target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")) return;
      const direction = directionForKey(e);
      if (!direction) return;
      if (step(direction)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.currentTarget === document && requestParentDashboardStep(direction)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    function onClick(e) {
      if (e.shiftKey) prev(); else next();
    }
    function onResize() { syncOffset(); }

    document.addEventListener("keydown", onKey);
    root.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);

    // Also listen on parent doc if the dashboard is iframed
    let parentDoc = null;
    try {
      if (window.parent && window.parent !== window) {
        parentDoc = window.parent.document;
        if (parentDoc) parentDoc.addEventListener("keydown", onKey);
      }
    } catch (_) {
      parentDoc = null;
    }

    window.__feedSubHandler = {
      onKey, onClick, onResize, parentDoc, scene: root, scrambleTimer: null,
    };

    requestAnimationFrame(() => requestAnimationFrame(syncOffset));
    setState(0);
  }

  window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
  window.KATECHON_DASHBOARD_RENDERERS["what-comes-after-the-feed"] = function renderFeedSub() {
    const uid = `fs-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
    setTimeout(() => hydrate(uid), 0);

    const feedHtml = buildFeedRows();

    return `<div class="scene feed-sub-identity" data-fs-root="${uid}">

      <div class="query col-precedent q-precedent">
        <span class="key">precedent</span>
        best italian in brooklyn
      </div>
      <div class="query col-repeat q-repeat">
        <span class="key">repeat</span>
        what's happening with the election tonight
      </div>

      <article class="cell col-precedent c-google">
        <span class="brand">google</span>
        <div class="serp">
          <div class="serp-row"><div class="serp-url">tripadvisor.com</div><div class="serp-title"></div><div class="serp-snippet"></div></div>
          <div class="serp-row"><div class="serp-url">eater.com</div><div class="serp-title"></div><div class="serp-snippet"></div></div>
          <div class="serp-row"><div class="serp-url">reddit.com</div><div class="serp-title"></div><div class="serp-snippet"></div></div>
          <div class="serp-row"><div class="serp-url">yelp.com</div><div class="serp-title"></div><div class="serp-snippet"></div></div>
          <div class="serp-row"><div class="serp-url">nytimes.com</div><div class="serp-title"></div><div class="serp-snippet"></div></div>
        </div>
      </article>

      <article class="cell col-repeat c-feed">
        <span class="brand">the feed</span>
        <div class="fs-feed">
          <div class="fs-feed-mask"></div>
          <div class="fs-feed-scroller">${feedHtml}</div>
        </div>
      </article>

      <div class="connector col-precedent ct-precedent">↓</div>
      <div class="connector col-repeat ct-repeat">↓</div>

      <article class="cell col-precedent c-claude">
        <span class="brand">claude</span>
        <div class="claude">
          <div class="claude-bubble">
            <div class="claude-line w95"></div>
            <div class="claude-line w80"></div>
            <div class="claude-line w95"></div>
            <div class="claude-line w65"></div>
          </div>
          <div class="claude-pills">
            <span>misi</span><span>lilia</span><span>l'industrie</span>
          </div>
        </div>
      </article>

      <article class="cell puzzle col-repeat c-puzzle">
        <span class="brand">?</span>
        <div class="puzzle-hint">
          <div class="ph-strip"></div>
          <div class="ph-stage"></div>
          <div class="ph-actions"><span></span><span></span><span></span></div>
        </div>
        <div class="puzzle-mask"></div>
      </article>

      <div class="puzzle-dominant" aria-hidden="true">
        <div class="puzzle-q-wrap">
          <span class="puzzle-q-big">?</span>
        </div>
      </div>

    </div>`;
  };
})();
