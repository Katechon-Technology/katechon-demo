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

  function buildStaticSvg(uid) {
    const cols = [22, 80, 138];
    const rows = [22, 88, 154];
    const pages = [];
    let i = 0;
    for (const y of rows) {
      for (const x of cols) {
        const jx = ((i * 31) % 7) - 3;
        const jy = ((i * 17) % 5) - 2;
        pages.push(`<rect class="ti-page" data-page="${i}" x="${x + jx}" y="${y + jy}" width="40" height="30" rx="2" opacity="0.32"></rect>`);
        i += 1;
      }
    }
    return `<svg id="${uid}-static-svg" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g data-pages>${pages.join("")}</g>
      <circle class="ti-cursor-ring" data-cursor-ring cx="100" cy="218" r="6" opacity="0"></circle>
      <circle class="ti-cursor-dot" data-cursor-dot cx="100" cy="218" r="1.6" opacity="0"></circle>
      <circle class="ti-user" cx="100" cy="218" r="6"></circle>
    </svg>`;
  }

  function buildSocialSvg(uid) {
    const nodes = [
      { x: 32,  y: 50 },
      { x: 76,  y: 32 },
      { x: 124, y: 32 },
      { x: 168, y: 50 },
      { x: 50,  y: 95 },
      { x: 104, y: 78 },
      { x: 156, y: 96 },
      { x: 74,  y: 146 },
      { x: 132, y: 144 },
      { x: 100, y: 200 },
    ];
    const userIdx = 9;
    const edges = [
      [0, 1], [1, 2], [2, 3],
      [0, 4], [1, 4], [1, 5], [2, 5], [2, 6], [3, 6],
      [4, 5], [5, 6],
      [4, 7], [5, 7], [5, 8], [6, 8],
      [7, 8],
      [7, 9], [8, 9], [5, 9],
    ];
    const edgeSvg = edges.map(([a, b]) =>
      `<line class="ti-edge" x1="${nodes[a].x}" y1="${nodes[a].y}" x2="${nodes[b].x}" y2="${nodes[b].y}"></line>`
    ).join("");
    const nodeSvg = nodes.map((n, idx) => {
      if (idx === userIdx) {
        return `<circle class="ti-user" data-node="${idx}" cx="${n.x}" cy="${n.y}" r="8"></circle>`;
      }
      return `<circle class="ti-friend" data-node="${idx}" cx="${n.x}" cy="${n.y}" r="5.4"></circle>`;
    }).join("");
    const posts = [0, 1, 2].map((i) =>
      `<rect class="ti-post-social" data-post="${i}" x="-20" y="-20" width="9" height="6.5" rx="1.4" opacity="0"></rect>`
    ).join("");
    return `<svg id="${uid}-social-svg" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true" data-nodes='${JSON.stringify(nodes)}' data-user-idx="${userIdx}">
      <g>${edgeSvg}</g>
      <g data-nodes>${nodeSvg}</g>
      <g data-posts>${posts}</g>
    </svg>`;
  }

  function buildAlgoSvg(uid) {
    const cols = 6;
    const rows = 4;
    const positions = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const x = 16 + c * 28 + ((r * 13) % 9) - 4;
        const y = 16 + r * 18 + ((c * 7) % 5) - 2;
        positions.push({ x, y });
      }
    }
    const posts = positions
      .map((p, idx) => `<rect class="ti-post-algo" data-post="${idx}" data-ox="${p.x}" data-oy="${p.y}" x="${p.x}" y="${p.y}" width="9" height="6" rx="1.2" opacity="0.9"></rect>`)
      .join("");
    return `<svg id="${uid}-algo-svg" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g data-posts>${posts}</g>
      <g data-algo>
        <rect class="ti-algo-box" x="70" y="118" width="60" height="36" rx="4"></rect>
        <text class="ti-algo-label" x="100" y="140" text-anchor="middle">algo</text>
      </g>
      <rect class="ti-algo-output" data-output x="92" y="160" width="16" height="10" rx="1.6" opacity="0"></rect>
      <circle class="ti-user" cx="100" cy="216" r="7"></circle>
    </svg>`;
  }

  function animateStatic(uid, anime) {
    const svg = document.getElementById(`${uid}-static-svg`);
    if (!svg) return null;
    const pages = svg.querySelectorAll("[data-page]");
    const ring = svg.querySelector("[data-cursor-ring]");
    const dot = svg.querySelector("[data-cursor-dot]");
    if (!ring || !dot || !pages.length) return null;
    const positions = Array.from(pages).map((p) => ({
      cx: Number(p.getAttribute("x")) + Number(p.getAttribute("width")) / 2,
      cy: Number(p.getAttribute("y")) + Number(p.getAttribute("height")) / 2,
    }));
    const order = [4, 0, 5, 7, 2];
    const cursorTargets = [ring, dot];
    const tl = anime.createTimeline({ loop: true, loopDelay: 600, autoplay: false, defaults: { ease: "inOutSine" } });
    tl.add(cursorTargets, { cx: 100, cy: 218, duration: 1 }, 0);
    tl.add(cursorTargets, { opacity: [0, 1], duration: 320 }, 0);
    let t = 320;
    order.forEach((pageIdx) => {
      const pos = positions[pageIdx];
      const page = pages[pageIdx];
      tl.add(cursorTargets, { cx: pos.cx, cy: pos.cy, duration: 720 }, t);
      tl.add(page, { opacity: [0.32, 1], duration: 260, ease: "outQuad" }, t + 480);
      tl.add(page, { opacity: 0.6, duration: 420, ease: "inOutSine" }, t + 900);
      t += 900;
    });
    tl.add(cursorTargets, { opacity: 0, duration: 320 }, t + 320);
    tl.add(pages, { opacity: 0.32, duration: 500, delay: anime.stagger(28), ease: "inOutSine" }, t + 320);
    return tl;
  }

  function animateSocial(uid, anime) {
    const svg = document.getElementById(`${uid}-social-svg`);
    if (!svg) return null;
    const nodes = JSON.parse(svg.dataset.nodes || "[]");
    const posts = svg.querySelectorAll("[data-post]");
    const nodeEls = Array.from(svg.querySelectorAll("[data-node]"));
    if (!posts.length || !nodes.length || !nodeEls.length) return null;

    const POST_W = 9;
    const POST_H = 6.5;
    const HOP_MS = 620;
    const PULSE_MS = 320;
    const APPEAR_MS = 220;
    const FADE_MS = 280;
    const paths = [
      [0, 4, 7, 9],
      [3, 6, 8, 9],
      [1, 5, 9],
    ];
    const startOffsets = [0, 800, 1600];

    const tl = anime.createTimeline({ loop: true, loopDelay: 600, autoplay: false, defaults: { ease: "inOutSine" } });

    paths.forEach((path, pathIdx) => {
      const post = posts[pathIdx];
      if (!post) return;
      const start = startOffsets[pathIdx];
      const first = nodes[path[0]];

      tl.add(post, {
        x: first.x - POST_W / 2,
        y: first.y - POST_H / 2,
        opacity: 0,
        duration: 1,
      }, start);
      tl.add(post, { opacity: [0, 1], duration: APPEAR_MS, ease: "outQuad" }, start);
      tl.add(nodeEls[path[0]], { scale: [1, 1.35, 1], duration: PULSE_MS, ease: "inOutSine" }, start);

      let t = start + APPEAR_MS;
      for (let i = 1; i < path.length; i += 1) {
        const target = nodes[path[i]];
        tl.add(post, {
          x: target.x - POST_W / 2,
          y: target.y - POST_H / 2,
          duration: HOP_MS,
          ease: "inOutSine",
        }, t);
        t += HOP_MS;
        tl.add(nodeEls[path[i]], { scale: [1, 1.35, 1], duration: PULSE_MS, ease: "inOutSine" }, t - 60);
      }

      tl.add(post, { opacity: [1, 0], duration: FADE_MS, ease: "outQuad" }, t);
    });

    return tl;
  }

  function animateAlgo(uid, anime) {
    const svg = document.getElementById(`${uid}-algo-svg`);
    if (!svg) return null;
    const posts = svg.querySelectorAll("[data-post]");
    const algoBox = svg.querySelector("[data-algo] .ti-algo-box");
    const output = svg.querySelector("[data-output]");
    if (!posts.length || !algoBox || !output) return null;
    const tl = anime.createTimeline({ loop: true, loopDelay: 500, autoplay: false, defaults: { ease: "inOutSine" } });
    tl.add(posts, {
      x: (el) => Number(el.dataset.ox),
      y: (el) => Number(el.dataset.oy),
      width: 9,
      height: 6,
      opacity: 0.85,
      duration: 1,
    }, 0);
    tl.add(posts, {
      x: 96,
      y: 134,
      width: 4,
      height: 4,
      opacity: [0.85, 0.32],
      duration: 1100,
      delay: anime.stagger(38),
      ease: "in(2)",
    }, 200);
    tl.add(algoBox, {
      scale: [1, 1.06, 1],
      duration: 540,
      ease: "inOutSine",
    }, 1100);
    tl.add(output, {
      opacity: [0, 1],
      y: [156, 198],
      duration: 720,
      ease: "outQuad",
    }, 1500);
    tl.add(output, {
      opacity: [1, 0],
      duration: 360,
      ease: "inOutSine",
    }, 2160);
    tl.add(posts, {
      opacity: 0,
      duration: 1,
    }, 2520);
    tl.add(posts, {
      x: (el) => Number(el.dataset.ox),
      y: (el) => Number(el.dataset.oy),
      width: 9,
      height: 6,
      opacity: [0, 0.85],
      duration: 640,
      delay: anime.stagger(22),
      ease: "outQuad",
    }, 2540);
    return tl;
  }

  function hydrate(uid) {
    const anime = window.anime;
    if (!anime || typeof anime.createTimeline !== "function" || typeof anime.animate !== "function") return;
    const root = document.querySelector(`[data-ti-root="${uid}"]`);
    if (!root) return;

    const prev = window.__threeInternetsAnims;
    if (Array.isArray(prev)) {
      prev.forEach((inst) => {
        if (!inst) return;
        try {
          if (typeof inst.cancel === "function") inst.cancel();
          else if (typeof inst.pause === "function") inst.pause();
        } catch (e) {}
      });
    }
    const prevHandler = window.__threeInternetsKeyHandler;
    if (prevHandler) {
      try { document.removeEventListener("keydown", prevHandler.fn); } catch (_) {}
      if (prevHandler.parentDoc) {
        try { prevHandler.parentDoc.removeEventListener("keydown", prevHandler.fn); } catch (_) {}
      }
      window.__threeInternetsKeyHandler = null;
    }

    const timelines = [
      animateStatic(uid, anime),
      animateSocial(uid, anime),
      animateAlgo(uid, anime),
    ];
    window.__threeInternetsAnims = timelines.filter(Boolean);

    const panels = Array.from(root.querySelectorAll(".ti-panel"));
    let activeIdx = 0;

    function directionForKey(event) {
      const keys = { ArrowDown: 1, ArrowUp: -1 };
      return keys[event.code] ?? keys[event.key] ?? 0;
    }

    function isActiveInParent() {
      if (!window.parent || window.parent === window) return true;
      try {
        return window.parent.document.body?.dataset?.currentDashboard === "three-internets";
      } catch (_) {
        return true;
      }
    }

    function requestParentDashboardStep(direction) {
      if (!direction || !window.parent || window.parent === window) return false;
      try {
        window.parent.postMessage({
          type: "dashboard-nav-step",
          dashboard: "three-internets",
          direction,
        }, window.location.origin);
        return true;
      } catch (_) {
        return false;
      }
    }

    function setActive(idx) {
      activeIdx = Math.max(0, Math.min(panels.length - 1, idx));
      panels.forEach((panel, i) => {
        panel.classList.toggle("is-active", i === activeIdx);
        panel.classList.toggle("is-inactive", i !== activeIdx);
      });
      timelines.forEach((tl, i) => {
        if (!tl) return;
        if (i === activeIdx) {
          try { tl.restart(); }
          catch (e) {
            try { tl.seek(0); } catch (_) {}
            try { tl.play(); } catch (_) {}
          }
        } else {
          try { tl.pause(); } catch (_) {}
          try { tl.seek(0); } catch (_) {}
        }
      });
    }

    function stepActive(direction) {
      const nextIdx = activeIdx + direction;
      if (nextIdx < 0 || nextIdx >= panels.length) return false;
      setActive(nextIdx);
      return true;
    }

    function onKey(event) {
      if (event.defaultPrevented) return;
      if (event.currentTarget !== document && !isActiveInParent()) return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target?.isContentEditable) return;
      const direction = directionForKey(event);
      if (!direction) return;
      if (stepActive(direction)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.currentTarget === document && requestParentDashboardStep(direction)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    document.addEventListener("keydown", onKey);
    let parentDoc = null;
    try {
      if (window.parent && window.parent !== window) {
        parentDoc = window.parent.document;
        if (parentDoc) parentDoc.addEventListener("keydown", onKey);
      }
    } catch (_) {
      parentDoc = null;
    }
    window.__threeInternetsKeyHandler = { fn: onKey, parentDoc };

    setActive(0);
  }

  window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
  window.KATECHON_DASHBOARD_RENDERERS["three-internets"] = function renderThreeInternets() {
    const uid = `ti-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
    setTimeout(() => hydrate(uid), 0);

    return `<div class="scene three-internets-identity" data-ti-root="${uid}">
      <article class="ti-panel is-static">
        <header class="ti-panel-head">
          <span class="ti-era-range">1991 — 2003</span>
          <span class="ti-era-label">Static</span>
        </header>
        <div class="ti-stage">${buildStaticSvg(uid)}</div>
        <footer class="ti-footer">${escapeHtml("Navigate by hand. Pages publish.")}</footer>
      </article>
      <article class="ti-panel is-social">
        <header class="ti-panel-head">
          <span class="ti-era-range">2004 — 2012</span>
          <span class="ti-era-label">Social</span>
        </header>
        <div class="ti-stage">${buildSocialSvg(uid)}</div>
        <footer class="ti-footer">${escapeHtml("Your friends decide. Feeds rank.")}</footer>
      </article>
      <article class="ti-panel is-algo">
        <header class="ti-panel-head">
          <span class="ti-era-range">2012 — today</span>
          <span class="ti-era-label">Algo</span>
        </header>
        <div class="ti-stage">${buildAlgoSvg(uid)}</div>
        <footer class="ti-footer">${escapeHtml("A machine decides. Attention routes.")}</footer>
      </article>
    </div>`;
  };
})();
