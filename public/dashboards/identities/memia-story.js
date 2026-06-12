(function () {
  const EMBEDDED_DASHBOARD = Boolean(window.parent && window.parent !== window);
  document.body.classList.toggle("memia-embedded-dashboard", EMBEDDED_DASHBOARD);
  document.body.classList.toggle("memia-direct-dashboard", !EMBEDDED_DASHBOARD);

  const FALLBACK_VIDEO = "videos/build-with-us/tanker-night.mp4";
  const FALLBACK_SCENES = [
    {
      kicker: "01 / SOURCE",
      headline: "A source becomes a channel state",
      caption: "The post is captured as provenance, story, scene timing, assets, and share path.",
      evidence: "source, capsule, render",
      video: "videos/build-with-us/iran.mp4",
      webm: "generated/trial-videos/iran.webm",
      poster: "generated/trial-posters/iran.jpg",
    },
    {
      kicker: "02 / SURFACE",
      headline: "The UI renders from the saved capsule",
      caption: "The channel keeps the visual, captions, evidence rail, and safe space parameterized.",
      evidence: "scene spec, captions, safe zone",
      video: "videos/build-with-us/strait-of-hormuz.mp4",
      webm: "generated/trial-videos/strait-of-hormuz.webm",
      poster: "generated/trial-posters/strait-of-hormuz.jpg",
    },
    {
      kicker: "03 / SHARE",
      headline: "The clip points back to a forkable channel",
      caption: "A viewer gets a 15 second preview, then can open the live state and continue.",
      evidence: "clip, replay, fork",
      video: "videos/build-with-us/tanker.mp4",
      webm: "generated/trial-videos/tanker.webm",
      poster: "generated/trial-posters/tanker.jpg",
    },
  ];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function appUrl(path) {
    if (!path) return path;
    if (/^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) return path;
    const base = /^\/app(?:\/|$)/.test(window.location.pathname) ? "/app" : "";
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized}`;
  }

  function normalizeScenes(capsule, config) {
    const scenes = Array.isArray(capsule?.sceneSpec?.scenes) && capsule.sceneSpec.scenes.length
      ? capsule.sceneSpec.scenes
      : FALLBACK_SCENES;
    return scenes.slice(0, 3).map((scene, index) => ({
      kicker: scene.kicker || `0${index + 1} / SCENE`,
      headline: scene.headline || config.title || "Trial Channel",
      caption: scene.caption || config.subtitle || "",
      evidence: scene.evidence || "capsule state",
      video: scene.video || FALLBACK_VIDEO,
      webm: scene.webm || "",
      poster: scene.poster || "",
    }));
  }

  function activeSceneIndex(durationMs, sceneCount) {
    const now = Date.now() % Math.max(1, durationMs || 15000);
    const span = Math.max(1, Math.floor((durationMs || 15000) / Math.max(1, sceneCount)));
    return Math.min(sceneCount - 1, Math.floor(now / span));
  }

  function buildScene(scene, index, activeIndex) {
    const active = index === activeIndex ? " is-active" : "";
    const posterUrl = scene.poster ? appUrl(scene.poster) : "";
    const posterStyle = posterUrl ? ` style="background-image:url('${escapeHtml(posterUrl)}')"` : "";
    return `<section class="memia-scene${active}" data-memia-scene="${index}" aria-hidden="${index === activeIndex ? "false" : "true"}"${posterStyle}>
      <video class="memia-video"${posterUrl ? ` poster="${escapeHtml(posterUrl)}"` : ""} autoplay muted loop playsinline preload="auto">
        ${scene.webm ? `<source src="${escapeHtml(appUrl(scene.webm))}" type="video/webm">` : ""}
        <source src="${escapeHtml(appUrl(scene.video))}" type="video/mp4">
      </video>
      <div class="memia-video-shade"></div>
      <div class="memia-caption-block">
        <div class="memia-kicker">${escapeHtml(scene.kicker)}</div>
        <h2>${escapeHtml(scene.headline)}</h2>
        <p>${escapeHtml(scene.caption)}</p>
      </div>
      <div class="memia-evidence-chip">${escapeHtml(scene.evidence)}</div>
    </section>`;
  }

  function buildRail(scenes, capsule, config) {
    return `<aside class="memia-rail" data-memia-review-panel>
      <div class="memia-source">
        <span>source</span>
        <strong>${escapeHtml(capsule?.source?.title || "Memia 2026.18")}</strong>
      </div>
      <div class="memia-story">
        <span>thesis</span>
        <p>${escapeHtml(capsule?.story?.thesis || config.subtitle || "")}</p>
      </div>
      <div class="memia-beats">
        ${scenes.map((scene, index) => `<div class="memia-beat" data-memia-beat="${index}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <strong>${escapeHtml(scene.headline)}</strong>
        </div>`).join("")}
      </div>
    </aside>`;
  }

  function buildActions(capsule, channelId) {
    const clip = capsule?.share?.clip || `generated/trial-clips/${channelId}.mp4`;
    return `<div class="memia-actions" data-memia-share-actions>
      <a href="${escapeHtml(appUrl(clip))}" target="_blank" rel="noreferrer">Clip</a>
      <a href="${escapeHtml(appUrl(`/dashboards/${channelId}/`))}">Channel</a>
      <span>Fork ready</span>
    </div>`;
  }

  function buildInlineKat() {
    if (EMBEDDED_DASHBOARD) return "";
    return `<div class="memia-inline-kat" aria-hidden="true">
      <iframe src="${escapeHtml(appUrl("avatar-pet.html?model=0&xFactor=0.8&v=8"))}" allow="autoplay" loading="eager" fetchpriority="high"></iframe>
    </div>`;
  }

  function buildHtml(args, capsule) {
    const config = args.config || {};
    const channelId = capsule?.channelId || config.trialCapsule || args.dashboardId || "planetary-solvency";
    const durationMs = capsule?.sceneSpec?.durationMs || 15000;
    const scenes = normalizeScenes(capsule, config);
    const activeIndex = activeSceneIndex(durationMs, scenes.length);
    const title = capsule?.story?.title || config.title || "Trial Channel";
    const deck = capsule?.story?.deck || config.subtitle || "";
    const qaState = capsule?.review?.lastRun?.status || "draft";

    return `<div class="scene memia-trial-identity" data-memia-root data-channel-id="${escapeHtml(channelId)}" data-capsule="${escapeHtml(config.trialCapsule || channelId)}">
      <div class="memia-scenes" data-memia-scenes>
        ${scenes.map((scene, index) => buildScene(scene, index, activeIndex)).join("")}
      </div>
      <div class="memia-topline">
        <div>
          <div class="memia-eyebrow">MEMIA / GENERATED CHANNEL</div>
          <h1>${escapeHtml(title)}</h1>
        </div>
        <div class="memia-status" data-review-status="${escapeHtml(qaState)}">QA ${escapeHtml(qaState)}</div>
      </div>
      <div class="memia-deck">${escapeHtml(deck)}</div>
      ${buildRail(scenes, capsule, config)}
      ${buildActions(capsule, channelId)}
      ${buildInlineKat()}
      <div class="memia-avatar-safe" data-memia-avatar-safe aria-hidden="true"></div>
      <div class="memia-ticker" aria-hidden="true">
        <span>CAPSULE STATE</span>
        <span>SOURCE LOCKED</span>
        <span>15 SECOND LOOP</span>
        <span>REPLAY AND FORK</span>
      </div>
    </div>`;
  }

  function capsuleUrl(slug) {
    return appUrl(`/api/trial-capsules/${slug}`);
  }

  function hydrate(root, args) {
    if (!root || root.dataset.memiaHydrated === "1") return;
    root.dataset.memiaHydrated = "1";
    const slug = root.dataset.capsule || args.config?.trialCapsule || args.dashboardId;
    fetch(capsuleUrl(slug), { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!payload?.capsule) return;
        root.outerHTML = buildHtml(args, payload.capsule);
        wire(document.querySelector(`[data-memia-root][data-channel-id="${CSS.escape(payload.capsule.channelId)}"]`), args);
      })
      .catch(() => {});
  }

  function wire(root, args) {
    if (!root) return;
    hydrate(root, args);
    const videos = root.querySelectorAll("video");
    videos.forEach((video) => {
      video.muted = true;
      const markReady = () => {
        video.dataset.ready = "1";
        video.play().catch(() => {});
      };
      try { video.load(); } catch (_) {}
      if (video.readyState >= 2) markReady();
      else {
        video.addEventListener("loadeddata", markReady, { once: true });
        video.addEventListener("canplay", markReady, { once: true });
      }
    });
    const scenes = [...root.querySelectorAll("[data-memia-scene]")];
    const beats = [...root.querySelectorAll("[data-memia-beat]")];
    if (!scenes.length || root.dataset.memiaTimer === "1") return;
    root.dataset.memiaTimer = "1";
    let index = scenes.findIndex((scene) => scene.classList.contains("is-active"));
    if (index < 0) index = 0;
    const setActive = (next) => {
      index = next % scenes.length;
      scenes.forEach((scene, sceneIndex) => {
        scene.classList.toggle("is-active", sceneIndex === index);
        scene.setAttribute("aria-hidden", sceneIndex === index ? "false" : "true");
      });
      beats.forEach((beat, beatIndex) => beat.classList.toggle("is-active", beatIndex === index));
    };
    setActive(index);
    window.setInterval(() => setActive(index + 1), 5000);
  }

  window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
  window.KATECHON_DASHBOARD_RENDERERS["memia-story"] = function renderMemiaStory(args) {
    const html = buildHtml(args || {}, null);
    window.setTimeout(() => wire(document.querySelector("[data-memia-root]"), args || {}), 0);
    return html;
  };
  ["planetary-solvency", "cloud-canary", "runtime-governance"].forEach((id) => {
    window.KATECHON_DASHBOARD_RENDERERS[id] = window.KATECHON_DASHBOARD_RENDERERS["memia-story"];
  });
})();
