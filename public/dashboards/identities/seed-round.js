// Final closer slide. Two centered lines, nothing else.
//   $4M
//   SEED ROUND
(function () {
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function buildHtml(contactEmail) {
    return `<div class="sr-root">
      <div class="sr-stack">
        <div class="sr-amount">$4M</div>
        <div class="sr-rule"></div>
        <div class="sr-label">SEED ROUND</div>
      </div>
      <div class="sr-contact">${escapeHtml(contactEmail)}</div>
    </div>`;
  }

  window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
  window.KATECHON_DASHBOARD_RENDERERS["seed-round"] = function renderSeedRound() {
    return buildHtml("simon@katechon.technology");
  };
})();
