(function () {
  const frame = document.getElementById("deck-frame");
  const titleNode = document.getElementById("slide-title");
  const kickerNode = document.getElementById("deck-kicker");
  const countNode = document.getElementById("slide-count");
  const progressNode = document.getElementById("deck-progress");
  const playToggle = document.getElementById("play-toggle");
  const playLabel = document.getElementById("play-label");
  const pdfLink = document.getElementById("pdf-link");
  const prevButton = document.getElementById("prev-slide");
  const nextButton = document.getElementById("next-slide");

  const params = new URLSearchParams(window.location.search);
  const appBase = /^\/app(?:\/|$)/.test(window.location.pathname) ? "/app" : "";
  let manifest = null;
  let slides = [];
  let currentIndex = 0;
  let secondsPerSlide = 14;
  let playing = !/^(0|false|no|off)$/i.test(String(params.get("autoplay") || "1"));
  let slideStartedAt = Date.now();
  let idleTimer = null;

  function clampIndex(index) {
    if (!slides.length) return 0;
    return ((index % slides.length) + slides.length) % slides.length;
  }

  function dashboardUrl(slide) {
    const query = new URLSearchParams({
      dashboard: slide.id,
      deck: "1",
      fullscreen: "1",
      autoplay: "0",
      audio: "0"
    });
    return `${appBase}/dashboards/${encodeURIComponent(slide.id)}/?${query.toString()}`;
  }

  function requestedStartIndex() {
    const raw = String(params.get("slide") || params.get("dashboard") || "").trim().toLowerCase();
    if (!raw) return 0;
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) {
      const byNumber = slides.findIndex((slide) => slide.number === numeric);
      if (byNumber >= 0) return byNumber;
      if (numeric >= 1 && numeric <= slides.length) return numeric - 1;
    }
    const byId = slides.findIndex((slide) => slide.id === raw);
    return byId >= 0 ? byId : 0;
  }

  function render() {
    const slide = slides[currentIndex];
    if (!slide) return;
    slideStartedAt = Date.now();
    frame.src = dashboardUrl(slide);
    titleNode.textContent = slide.title || slide.id;
    kickerNode.textContent = `${manifest.subtitle || "VC deck"} / ${currentIndex + 1} of ${slides.length}`;
    countNode.textContent = `${slide.number || currentIndex + 1} / ${slides[slides.length - 1].number || slides.length}`;
    progressNode.style.width = "0%";
    document.body.dataset.currentDashboard = slide.id;
    params.set("slide", String(slide.number || currentIndex + 1));
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  }

  function setPlaying(value) {
    playing = Boolean(value);
    playLabel.textContent = playing ? "Pause" : "Play";
    playToggle.setAttribute("aria-label", playing ? "Pause autoplay" : "Play autoplay");
    slideStartedAt = Date.now();
  }

  function go(delta) {
    currentIndex = clampIndex(currentIndex + delta);
    render();
  }

  function tick() {
    if (playing && slides.length) {
      const elapsed = (Date.now() - slideStartedAt) / 1000;
      const pct = Math.max(0, Math.min(1, elapsed / secondsPerSlide));
      progressNode.style.width = `${pct * 100}%`;
      if (elapsed >= secondsPerSlide) go(1);
    }
    requestAnimationFrame(tick);
  }

  function markActive() {
    document.body.classList.remove("is-idle");
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (playing) document.body.classList.add("is-idle");
    }, 2600);
  }

  async function init() {
    const response = await fetch("./vc-deck.json", { cache: "no-store" });
    manifest = await response.json();
    slides = Array.isArray(manifest.slides) ? manifest.slides : [];
    secondsPerSlide = Math.max(5, Number(params.get("seconds") || manifest.defaultSecondsPerSlide || 14));
    if (manifest.pdfPath) pdfLink.href = appBase ? `${appBase}${manifest.pdfPath}` : manifest.pdfPath;
    currentIndex = requestedStartIndex();
    setPlaying(playing);
    render();
    markActive();
    requestAnimationFrame(tick);
  }

  prevButton.addEventListener("click", () => {
    markActive();
    go(-1);
  });
  nextButton.addEventListener("click", () => {
    markActive();
    go(1);
  });
  playToggle.addEventListener("click", () => {
    markActive();
    setPlaying(!playing);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      markActive();
      go(-1);
    }
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault();
      markActive();
      go(1);
    }
    if (event.key.toLowerCase() === "p") {
      event.preventDefault();
      markActive();
      setPlaying(!playing);
    }
  });
  ["pointermove", "pointerdown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, markActive, { passive: true });
  });

  init().catch((error) => {
    titleNode.textContent = "Deck unavailable";
    kickerNode.textContent = error.message || "load failed";
    console.error(error);
  });
})();
