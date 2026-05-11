(function () {
  const ROOT_ATTR = "data-bwu-root";

  function pad2(n) { return String(n).padStart(2, "0"); }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function buildHtml(uid, contactEmail) {
    const rows = [1, 2, 3, 4, 5].map((idx) => `
      <div class="bwu-row bwu-row-open" data-row="${idx}" data-bwu-row>
        <span class="bwu-row-num">${pad2(idx)}</span>
        <span class="bwu-row-tag" data-bwu-row-tag></span>
        <span class="bwu-row-name" data-bwu-row-name>— open —</span>
        <span class="bwu-row-status" data-bwu-row-status></span>
        <span class="bwu-row-dot" data-bwu-row-dot></span>
      </div>
    `).join("");

    return `<div class="bwu-root" ${ROOT_ATTR}="${uid}">
      <div class="bwu-head">
        <div class="bwu-head-left">
          <span class="bwu-channel">KATECHON / SEED ROUND</span>
          <span class="bwu-status">live</span>
        </div>
        <div class="bwu-head-right">
          <span class="bwu-amount">$4,000,000</span>
          <span class="bwu-amount-label">SEED</span>
        </div>
      </div>

      <div class="bwu-table">${rows}</div>

      <div class="bwu-counter" data-bwu-counter>
        <span class="bwu-counter-num" data-bwu-counter-num>5</span>
        <span class="bwu-counter-label" data-bwu-counter-label>SEATS · OPEN</span>
      </div>

      <div class="bwu-cut" data-bwu-cut>
        <div class="bwu-cut-line">${escapeHtml(contactEmail)}</div>
      </div>
    </div>`;
  }

  function postParent(payload) {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage(payload, window.location.origin);
      } catch (_) {}
    }
  }

  function cancelPrevious() {
    const prev = window.__bwuState;
    if (!prev) return;
    if (Array.isArray(prev.timers)) prev.timers.forEach((id) => clearTimeout(id));
    window.__bwuState = null;
  }

  function hydrate(uid) {
    const root = document.querySelector(`[${ROOT_ATTR}="${uid}"]`);
    if (!root) return;

    cancelPrevious();

    const rows = Array.from(root.querySelectorAll("[data-bwu-row]"));
    const counter = root.querySelector("[data-bwu-counter]");
    const counterNum = root.querySelector("[data-bwu-counter-num]");
    const counterLabel = root.querySelector("[data-bwu-counter-label]");

    const state = { timers: [], uid };
    window.__bwuState = state;

    function schedule(delayMs, fn) {
      const id = setTimeout(() => {
        if (window.__bwuState !== state) return;
        try { fn(); } catch (err) { console.warn("[bwu] step failed:", err); }
      }, delayMs);
      state.timers.push(id);
    }

    // t = 0 — ask parent to (re)start music for this channel
    postParent({ type: "seed-channel-init" });

    // t = 1.5s — investor lands
    schedule(1500, () => {
      const investor = rows[0];
      if (!investor) return;
      investor.classList.remove("bwu-row-open");
      investor.classList.add("is-committed");
      investor.querySelector("[data-bwu-row-tag]").textContent = "INVESTOR";
      investor.querySelector("[data-bwu-row-name]").textContent = "META BOARD MEMBER";
      investor.querySelector("[data-bwu-row-status]").textContent = "committed";
      if (counterNum) counterNum.textContent = "4";
    });

    // t = 7.0s — "your row" highlights, Kat speaks
    schedule(7000, () => {
      const yours = rows[1];
      if (!yours) return;
      yours.classList.remove("bwu-row-open");
      yours.classList.add("is-yours");
      yours.querySelector("[data-bwu-row-tag]").textContent = "YOU";
      yours.querySelector("[data-bwu-row-name]").textContent = "___ your row";
      yours.querySelector("[data-bwu-row-status]").textContent = "reserved";
      if (counterNum) counterNum.textContent = "3";
      if (counterLabel) counterLabel.textContent = "OPEN · 1 YOURS";
      if (counter) counter.classList.add("is-yours");

      postParent({
        type: "seed-channel-speak",
        text: "One of these is yours.",
        id: `bwu-speak-${Date.now()}`,
      });
    });

    // t = 9.5s — glow peak
    schedule(9500, () => {
      root.classList.add("is-peak");
    });

    // t = 10.5s — HARD CUT
    schedule(10500, () => {
      root.classList.add("is-cut");
      postParent({ type: "seed-channel-cut" });
    });
  }

  window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
  window.KATECHON_DASHBOARD_RENDERERS["build-with-us"] = function renderBuildWithUs() {
    const uid = `bwu-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
    setTimeout(() => hydrate(uid), 0);
    return buildHtml(uid, "simon@katechon.technology");
  };
})();
