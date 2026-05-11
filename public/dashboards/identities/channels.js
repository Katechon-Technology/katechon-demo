(function () {
  const steps = [
    {
      label: "A channel is three layers, packaged as one thing",
      caption: "Live data and your prompt flow into a specialist agent. A surface rebuilds in response and keeps mutating as the world changes - the whole thing is one live object.",
    },
    {
      label: "Ask, and it zooms in",
      caption: "Start with the big picture. Ask a follow-up and the channel reshapes itself: region, strait, then individual tanker positions.",
    },
    {
      label: "Share it, and others can keep going",
      caption: "When you share, people pick up where you left off. They can watch or branch the state with their own follow-up.",
    },
    {
      label: "Watching turns into doing",
      caption: "From inside the same channel: take a position on a prediction market, or place a trade. Acting on what you're seeing, in one place.",
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

  function buildSvg(uid) {
    const markerId = `${uid}-arrow`;
    return `<svg class="cc-svg" viewBox="0 0 680 440" role="img" aria-labelledby="${uid}-title ${uid}-desc">
      <title id="${uid}-title">What a channel is</title>
      <desc id="${uid}-desc">Four scenes show live inputs composing into a channel, the channel zooming in by request, shareable branch state, and action from inside the channel.</desc>
      <defs>
        <marker id="${markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>
        </marker>
      </defs>

      <g data-cc-scene="0">
        <g class="cc-an-layer cc-an-input" data-cc-an-layer="input">
          <rect class="cc-an-shell" x="40" y="40" width="600" height="92" rx="14"></rect>
          <text class="cc-an-tag" x="60" y="62" dominant-baseline="central">INPUT</text>
          <g class="cc-an-pill">
            <rect x="80" y="80" width="240" height="40" rx="20"></rect>
            <circle class="cc-an-dot cc-an-pulse cc-an-pulse-mint" cx="148" cy="100" r="4"></circle>
            <text class="cc-th" x="164" y="101" dominant-baseline="central" style="font-size:17px;">Live data</text>
          </g>
          <g class="cc-an-pill">
            <rect x="360" y="80" width="240" height="40" rx="20"></rect>
            <text class="cc-th" x="480" y="101" text-anchor="middle" dominant-baseline="central" style="font-size:17px;font-style:italic;">"what's happening?"</text>
          </g>
        </g>

        <g class="cc-an-connector" data-cc-an-connector="1">
          <line x1="340" y1="146" x2="340" y2="172" marker-end="url(#${markerId})"></line>
        </g>

        <g class="cc-an-layer cc-an-agent" data-cc-an-layer="agent">
          <rect class="cc-an-shell" x="40" y="180" width="600" height="80" rx="14"></rect>
          <text class="cc-an-tag" x="60" y="202" dominant-baseline="central">AGENT</text>
          <g class="cc-an-pill">
            <rect x="60" y="216" width="560" height="36" rx="18"></rect>
            <circle class="cc-an-dot" cx="80" cy="234" r="4"></circle>
            <text class="cc-ts" x="94" y="235" dominant-baseline="central">Specialist · picks what to query and how to show it</text>
          </g>
        </g>

        <g class="cc-an-connector" data-cc-an-connector="2">
          <line x1="340" y1="274" x2="340" y2="300" marker-end="url(#${markerId})"></line>
        </g>

        <g class="cc-an-layer cc-an-surface" data-cc-an-layer="surface">
          <rect class="cc-an-shell" x="40" y="308" width="600" height="116" rx="14"></rect>
          <text class="cc-an-tag" x="60" y="330" dominant-baseline="central">SURFACE</text>

          <g transform="translate(584,322)">
            <circle class="cc-an-pulse cc-an-pulse-amber" cx="0" cy="0" r="3.2"></circle>
            <text class="cc-an-live-text" x="9" y="0" dominant-baseline="central">LIVE</text>
          </g>

          <g class="cc-an-pill">
            <rect x="60" y="342" width="140" height="70" rx="10"></rect>
            <text class="cc-an-metric" data-cc-an-metric x="74" y="372" dominant-baseline="central">$103.2k</text>
            <text class="cc-an-delta"  data-cc-an-delta  x="74" y="394" dominant-baseline="central">+2.4%</text>
          </g>

          <g class="cc-an-pill">
            <rect x="216" y="342" width="224" height="70" rx="10"></rect>
            <line class="cc-an-axis" x1="230" y1="404" x2="426" y2="404"></line>
            <polygon class="cc-an-fill" data-cc-an-spark-fill points=""></polygon>
            <polyline class="cc-an-line" data-cc-an-spark points=""></polyline>
            <circle class="cc-an-cursor" data-cc-an-spark-cursor cx="426" cy="376" r="3"></circle>
          </g>

          <g class="cc-an-pill">
            <rect x="456" y="342" width="164" height="70" rx="10"></rect>
            <line class="cc-an-row" x1="470" y1="360" x2="606" y2="360"></line>
            <line class="cc-an-row" x1="470" y1="378" x2="606" y2="378"></line>
            <line class="cc-an-row" x1="470" y1="396" x2="606" y2="396"></line>
            <circle class="cc-an-bullet" cx="476" cy="360" r="2.2"></circle>
            <circle class="cc-an-bullet" cx="476" cy="378" r="2.2"></circle>
            <circle class="cc-an-bullet" cx="476" cy="396" r="2.2"></circle>
            <text class="cc-an-rail-time" data-cc-an-row="1" x="602" y="360" text-anchor="end" dominant-baseline="central">3s</text>
            <text class="cc-an-rail-time" data-cc-an-row="2" x="602" y="378" text-anchor="end" dominant-baseline="central">12s</text>
            <text class="cc-an-rail-time" data-cc-an-row="3" x="602" y="396" text-anchor="end" dominant-baseline="central">31s</text>
          </g>
        </g>

        <g class="cc-an-bracket" data-cc-an-bracket>
          <path d="M648 44 Q660 44 660 64 L660 224 Q660 232 670 232 Q660 232 660 240 L660 420 Q660 428 648 428"></path>
          <text x="672" y="232" text-anchor="middle" dominant-baseline="central" style="writing-mode:vertical-rl; transform: rotate(180deg); transform-origin:672px 232px;">one channel</text>
        </g>
      </g>

      <g data-cc-scene="1" style="display:none">
        <g class="cc-fill-neutral cc-card" data-cc-query>
          <rect x="56" y="28" width="568" height="58" rx="15"></rect>
          <text class="cc-th" data-cc-q x="340" y="57" text-anchor="middle" dominant-baseline="central" style="font-style:italic;font-size:22px;">"What's happening with Iran?"</text>
        </g>

        <g data-cc-view="0" class="cc-fill-agent cc-card">
          <rect x="52" y="112" width="182" height="178" rx="15"></rect>
          <text class="cc-ts" x="143" y="134" text-anchor="middle" dominant-baseline="central">High-level view</text>
          <path class="cc-map-land" d="M78 175Q92 145 130 148Q171 143 198 160Q222 180 212 217Q198 249 160 255Q119 259 92 238Q70 211 78 175Z"></path>
          <path class="cc-map-land" d="M120 185Q137 173 162 178Q182 188 177 208Q166 229 144 229Q123 223 120 203Z" opacity="0.92"></path>
          <circle class="cc-dot" cx="150" cy="204" r="4"></circle>
          <text class="cc-ts" x="143" y="272" text-anchor="middle" dominant-baseline="central">region</text>
        </g>

        <g data-cc-view="1" class="cc-fill-agent cc-card" opacity="0">
          <rect x="249" y="112" width="182" height="178" rx="15"></rect>
          <text class="cc-ts" x="340" y="134" text-anchor="middle" dominant-baseline="central">Strait of Hormuz</text>
          <path class="cc-strait-land" d="M260 154Q300 146 340 160Q347 166 332 174Q300 181 260 180Z"></path>
          <path class="cc-strait-land" d="M420 254Q380 263 340 247Q333 240 349 233Q380 226 420 229Z"></path>
          <path class="cc-water-line" d="M261 186Q302 198 340 204Q381 211 419 227"></path>
          <path class="cc-water-line" d="M261 199Q303 210 340 214Q381 221 419 241" opacity="0.46"></path>
          <circle class="cc-dot" cx="290" cy="194" r="4"></circle>
          <circle class="cc-dot" cx="340" cy="208" r="4"></circle>
          <circle class="cc-dot" cx="390" cy="225" r="4"></circle>
          <text class="cc-ts" x="340" y="272" text-anchor="middle" dominant-baseline="central">strait</text>
        </g>

        <g data-cc-view="2" class="cc-fill-agent cc-card" opacity="0">
          <rect x="446" y="112" width="182" height="178" rx="15"></rect>
          <text class="cc-ts" x="537" y="134" text-anchor="middle" dominant-baseline="central">Tankers, live</text>
          <line x1="462" y1="222" x2="612" y2="222" class="cc-water-line" opacity="0.42"></line>
          <line x1="462" y1="235" x2="612" y2="235" class="cc-water-line" opacity="0.30"></line>
          <line x1="462" y1="248" x2="612" y2="248" class="cc-water-line" opacity="0.23"></line>
          <g class="cc-ship"><rect x="474" y="180" width="38" height="10" rx="2"></rect><line x1="493" y1="180" x2="493" y2="166"></line><rect x="493" y="160" width="9" height="6" rx="1"></rect></g>
          <g class="cc-ship"><rect x="516" y="199" width="38" height="10" rx="2"></rect><line x1="535" y1="199" x2="535" y2="185"></line><rect x="535" y="179" width="9" height="6" rx="1"></rect></g>
          <g class="cc-ship"><rect x="560" y="181" width="38" height="10" rx="2"></rect><line x1="579" y1="181" x2="579" y2="167"></line><rect x="579" y="161" width="9" height="6" rx="1"></rect></g>
          <g class="cc-ship" opacity="0.7"><rect x="485" y="216" width="38" height="10" rx="2"></rect></g>
          <text class="cc-ts" x="537" y="272" text-anchor="middle" dominant-baseline="central">positions</text>
        </g>

        <path data-cc-zoom-arrow="0" d="M235 201L246 201" class="cc-arrow" marker-end="url(#${markerId})" opacity="0"></path>
        <path data-cc-zoom-arrow="1" d="M432 201L443 201" class="cc-arrow" marker-end="url(#${markerId})" opacity="0"></path>
      </g>

      <g data-cc-scene="2" style="display:none">
        <g class="cc-fill-agent cc-card" data-cc-share-source>
          <rect x="228" y="42" width="224" height="68" rx="15"></rect>
          <text class="cc-th" x="340" y="68" text-anchor="middle" dominant-baseline="central">Your channel</text>
          <text class="cc-ts" x="340" y="92" text-anchor="middle" dominant-baseline="central" style="font-size:13px;">tankers in the strait</text>
        </g>

        <line data-cc-share-line="0" x1="340" y1="109" x2="340" y2="144" class="cc-arrow" marker-end="url(#${markerId})" opacity="0"></line>
        <g class="cc-fill-share cc-card" data-cc-share-button opacity="0">
          <rect x="279" y="150" width="122" height="42" rx="21"></rect>
          <text class="cc-th" x="340" y="171" text-anchor="middle" dominant-baseline="central">Share</text>
        </g>

        <g data-cc-branches opacity="0">
          <line x1="340" y1="192" x2="120" y2="242" class="cc-arrow cc-arrow-soft" marker-end="url(#${markerId})"></line>
          <line x1="340" y1="192" x2="340" y2="242" class="cc-arrow cc-arrow-soft" marker-end="url(#${markerId})"></line>
          <line x1="340" y1="192" x2="560" y2="242" class="cc-arrow cc-arrow-soft" marker-end="url(#${markerId})"></line>

          <g class="cc-fill-agent cc-friend-card">
            <rect x="32" y="254" width="176" height="66" rx="15"></rect>
            <text class="cc-th" x="120" y="280" text-anchor="middle" dominant-baseline="central">Friend A</text>
            <text class="cc-ts" x="120" y="304" text-anchor="middle" dominant-baseline="central">just watches</text>
          </g>
          <g class="cc-fill-agent cc-friend-card">
            <rect x="252" y="254" width="176" height="66" rx="15"></rect>
            <text class="cc-th" x="340" y="280" text-anchor="middle" dominant-baseline="central">Friend B</text>
            <text class="cc-ts" x="340" y="304" text-anchor="middle" dominant-baseline="central">asks about oil</text>
          </g>
          <g class="cc-fill-agent cc-friend-card">
            <rect x="472" y="254" width="176" height="66" rx="15"></rect>
            <text class="cc-th" x="560" y="280" text-anchor="middle" dominant-baseline="central">Friend C</text>
            <text class="cc-ts" x="560" y="304" text-anchor="middle" dominant-baseline="central">zooms one tanker</text>
          </g>

          <line x1="340" y1="322" x2="340" y2="346" class="cc-arrow-soft"></line>
          <line x1="560" y1="322" x2="560" y2="346" class="cc-arrow-soft"></line>
          <g class="cc-fill-memory cc-state-card">
            <rect x="246" y="350" width="188" height="45" rx="13"></rect>
            <text class="cc-ts" x="340" y="373" text-anchor="middle" dominant-baseline="central" style="font-size:13px;">new channel state</text>
          </g>
          <g class="cc-fill-memory cc-state-card">
            <rect x="466" y="350" width="188" height="45" rx="13"></rect>
            <text class="cc-ts" x="560" y="373" text-anchor="middle" dominant-baseline="central" style="font-size:13px;">new channel state</text>
          </g>
        </g>
      </g>

      <g data-cc-scene="3" style="display:none">
        <g class="cc-fill-agent cc-card" data-cc-inside-card>
          <rect x="176" y="38" width="328" height="76" rx="16"></rect>
          <text class="cc-th" x="340" y="64" text-anchor="middle" dominant-baseline="central" style="font-size:23px;">Inside the channel</text>
          <text class="cc-ts" x="340" y="88" text-anchor="middle" dominant-baseline="central" style="font-size:13.5px;">tankers slowing - prices climbing</text>
          <text class="cc-ts" x="340" y="105" text-anchor="middle" dominant-baseline="central" style="font-size:13.5px;" opacity="0.76">"what could I do about this?"</text>
        </g>

        <line data-cc-action-arrow x1="340" y1="116" x2="340" y2="154" class="cc-arrow" marker-end="url(#${markerId})" opacity="0"></line>

        <g data-cc-actions opacity="0">
          <g class="cc-fill-action cc-action-card">
            <rect x="52" y="166" width="280" height="128" rx="16"></rect>
            <text class="cc-th" x="192" y="194" text-anchor="middle" dominant-baseline="central">Take the bet</text>
            <text class="cc-ts" x="192" y="217" text-anchor="middle" dominant-baseline="central">Polymarket:</text>
            <text class="cc-ts" x="192" y="236" text-anchor="middle" dominant-baseline="central">"Strait closed by Sep?"</text>
            <rect class="cc-progress-bg" x="95" y="256" width="194" height="17" rx="8.5"></rect>
            <rect class="cc-progress-fill" data-cc-progress x="95" y="256" width="82" height="17" rx="8.5"></rect>
            <text class="cc-ts" x="192" y="284" text-anchor="middle" dominant-baseline="central">place a position</text>
          </g>
          <g class="cc-fill-trade cc-action-card">
            <rect x="348" y="166" width="280" height="128" rx="16"></rect>
            <text class="cc-th" x="488" y="194" text-anchor="middle" dominant-baseline="central">Go long oil</text>
            <text class="cc-ts" x="488" y="220" text-anchor="middle" dominant-baseline="central">if this gets worse</text>
            <polyline class="cc-oil-line" data-cc-oil-line points="371,260 402,257 432,252 462,250 492,244 523,241 553,234 583,228 608,225"></polyline>
            <text class="cc-ts" x="488" y="284" text-anchor="middle" dominant-baseline="central">open a trade</text>
          </g>
        </g>

        <text class="cc-ts" data-cc-action-cap x="340" y="333" text-anchor="middle" opacity="0"></text>
      </g>
    </svg>`;
  }

  function cancelInstance(instance) {
    if (!instance) return;
    try {
      if (typeof instance.cancel === "function") instance.cancel();
      else if (typeof instance.pause === "function") instance.pause();
    } catch (e) {}
  }

  function hydrate(uid) {
    const root = document.querySelector(`[data-channel-concept-root="${uid}"]`);
    if (!root) return;

    if (typeof window.__channelsConceptCleanup === "function") {
      window.__channelsConceptCleanup();
    }

    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function animeApi() {
      return window.anime || null;
    }
    function canAnimateNow() {
      const api = animeApi();
      return !reduceMotion && api && typeof api.animate === "function";
    }
    function canTimelineNow() {
      const api = animeApi();
      return canAnimateNow() && typeof api.createTimeline === "function";
    }
    function stagger(value, options) {
      const api = animeApi();
      return typeof api?.stagger === "function" ? api.stagger(value, options) : 0;
    }
    const scenes = Array.from(root.querySelectorAll("[data-cc-scene]"));
    const label = root.querySelector("[data-cc-label]");
    const count = root.querySelector("[data-cc-count]");
    const caption = root.querySelector("[data-cc-caption]");
    const playButton = root.querySelector("[data-cc-play]");
    const playLabel = root.querySelector("[data-cc-play-label]");
    const prevButton = root.querySelector("[data-cc-prev]");
    const nextButton = root.querySelector("[data-cc-next]");
    let current = 0;
    let playing = false;
    let playTimer = null;
    let activeInstances = [];
    let activeTimers = [];
    let activeIntervals = [];

    function track(instance) {
      if (instance) activeInstances.push(instance);
      return instance;
    }

    function later(fn, delay) {
      const timer = window.setTimeout(fn, delay);
      activeTimers.push(timer);
      return timer;
    }

    function tickEvery(fn, delay) {
      const id = window.setInterval(fn, delay);
      activeIntervals.push(id);
      return id;
    }

    function clearMotion() {
      activeInstances.forEach(cancelInstance);
      activeInstances = [];
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers = [];
      activeIntervals.forEach((id) => window.clearInterval(id));
      activeIntervals = [];
    }

    function animate(target, params) {
      const api = animeApi();
      if (!canAnimateNow() || !target) return null;
      return track(api.animate(target, params));
    }

    function playTimeline(timeline) {
      if (!timeline) return null;
      track(timeline);
      try { timeline.restart(); }
      catch (e) {
        try { timeline.seek(0); } catch (_) {}
        try { timeline.play(); } catch (_) {}
      }
      return timeline;
    }

    function setOpacity(nodes, value) {
      Array.from(nodes || []).forEach((node) => {
        if (node) node.setAttribute("opacity", String(value));
      });
    }

    function resetTransforms(nodes) {
      Array.from(nodes || []).forEach((node) => {
        if (!node) return;
        node.style.transform = "";
        node.removeAttribute("transform");
      });
    }

    function settleScene(scene) {
      setOpacity(scene.querySelectorAll("[opacity='0'], [data-cc-center], [data-cc-view], [data-cc-zoom-arrow], [data-cc-share-line], [data-cc-share-button], [data-cc-branches], [data-cc-action-arrow], [data-cc-actions], [data-cc-action-cap]"), 1);
      const progress = scene.querySelector("[data-cc-progress]");
      if (progress) progress.style.transform = "scaleX(1)";
      const oil = scene.querySelector("[data-cc-oil-line]");
      if (oil) {
        oil.style.strokeDasharray = "";
        oil.style.strokeDashoffset = "";
      }
    }

    function animateSceneIntro(scene, direction) {
      if (!canAnimateNow()) {
        scene.style.opacity = "1";
        scene.style.transform = "";
        return;
      }
      scene.style.opacity = "0";
      scene.style.transform = `translateX(${direction * 18}px)`;
      animate(scene, {
        opacity: [0, 1],
        translateX: [direction * 18, 0],
        duration: 420,
        ease: "out(3)",
      });
    }

    function animateScene1(scene) {
      const inputLayer   = scene.querySelector('[data-cc-an-layer="input"]');
      const agentLayer   = scene.querySelector('[data-cc-an-layer="agent"]');
      const surfaceLayer = scene.querySelector('[data-cc-an-layer="surface"]');
      const connector1   = scene.querySelector('[data-cc-an-connector="1"]');
      const connector2   = scene.querySelector('[data-cc-an-connector="2"]');
      const bracket      = scene.querySelector('[data-cc-an-bracket]');
      const stages = [inputLayer, connector1, agentLayer, connector2, surfaceLayer, bracket];

      stages.forEach((el) => el && el.classList.remove("in"));

      if (reduceMotion || !canAnimateNow()) {
        stages.forEach((el) => el && el.classList.add("in"));
      } else {
        const delays = [200, 900, 1200, 2000, 2300, 3200];
        stages.forEach((el, i) => {
          if (!el) return;
          later(() => el.classList.add("in"), delays[i]);
        });
      }

      hydrateSurface(scene);
    }

    function hydrateSurface(scene) {
      const metricEl = scene.querySelector("[data-cc-an-metric]");
      const deltaEl  = scene.querySelector("[data-cc-an-delta]");
      const sparkEl  = scene.querySelector("[data-cc-an-spark]");
      const fillEl   = scene.querySelector("[data-cc-an-spark-fill]");
      const cursorEl = scene.querySelector("[data-cc-an-spark-cursor]");
      const rowEls = [
        scene.querySelector('[data-cc-an-row="1"]'),
        scene.querySelector('[data-cc-an-row="2"]'),
        scene.querySelector('[data-cc-an-row="3"]'),
      ];

      let metricVal = 103.2;
      let deltaVal = 2.4;
      if (metricEl) metricEl.textContent = `$${metricVal.toFixed(1)}k`;
      if (deltaEl)  deltaEl.textContent  = `+${deltaVal.toFixed(1)}%`;

      const SPARK_X0 = 230, SPARK_X1 = 426, SPARK_Y_BASE = 376, SPARK_AMP = 22, BASELINE_Y = 404, N = 36;
      const vals = [];
      let v = 0;
      for (let i = 0; i < N; i++) {
        v += (Math.random() - 0.5) * 9;
        v = Math.max(-SPARK_AMP, Math.min(SPARK_AMP, v));
        vals.push(v);
      }
      function drawSpark() {
        if (!sparkEl) return;
        const step = (SPARK_X1 - SPARK_X0) / (N - 1);
        const pts = vals.map((y, i) => `${SPARK_X0 + i * step},${SPARK_Y_BASE - y}`);
        sparkEl.setAttribute("points", pts.join(" "));
        if (fillEl) {
          const fillPts = [`${SPARK_X0},${BASELINE_Y}`, ...pts, `${SPARK_X1},${BASELINE_Y}`];
          fillEl.setAttribute("points", fillPts.join(" "));
        }
        if (cursorEl) {
          cursorEl.setAttribute("cy", SPARK_Y_BASE - vals[vals.length - 1]);
        }
      }
      drawSpark();

      const times = [3, 12, 31];
      function fmt(s) { return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m`; }
      rowEls.forEach((el, i) => { if (el) el.textContent = fmt(times[i]); });

      if (reduceMotion) return;

      tickEvery(() => {
        metricVal += (Math.random() - 0.48) * 0.35;
        deltaVal  += (Math.random() - 0.50) * 0.18;
        if (metricEl) metricEl.textContent = `$${metricVal.toFixed(1)}k`;
        if (deltaEl)  deltaEl.textContent  = `${deltaVal >= 0 ? "+" : ""}${deltaVal.toFixed(1)}%`;
      }, 900);

      tickEvery(() => {
        vals.shift();
        const last = vals[vals.length - 1];
        const drift = -last * 0.04;
        let next = last + drift + (Math.random() - 0.5) * 11;
        next = Math.max(-SPARK_AMP, Math.min(SPARK_AMP, next));
        vals.push(next);
        drawSpark();
      }, 200);

      tickEvery(() => {
        for (let i = 0; i < 3; i++) {
          times[i] += 1;
          if (rowEls[i]) rowEls[i].textContent = fmt(times[i]);
        }
      }, 1000);
    }

    function animateScene2(scene) {
      const q = scene.querySelector("[data-cc-q]");
      const views = scene.querySelectorAll("[data-cc-view]");
      const arrows = scene.querySelectorAll("[data-cc-zoom-arrow]");
      resetTransforms(views);
      if (q) q.textContent = "\"What's happening with Iran?\"";
      setOpacity(views, 0);
      setOpacity(arrows, 0);
      if (views[0]) views[0].setAttribute("opacity", "1");
      if (!canAnimateNow()) {
        if (q) q.textContent = "\"Where are the tankers right now?\"";
        settleScene(scene);
        return;
      }
      animate(views[0], { opacity: [0, 1], translateY: [14, 0], duration: 460, ease: "out(3)" });
      later(() => {
        if (q) q.textContent = "\"Show me the Strait of Hormuz\"";
        animate(arrows[0], { opacity: [0, 1], duration: 240, ease: "out(2)" });
        animate(views[1], { opacity: [0, 1], translateY: [18, 0], scale: [0.98, 1], duration: 540, ease: "out(3)" });
      }, 1150);
      later(() => {
        if (q) q.textContent = "\"Where are the tankers right now?\"";
        animate(arrows[1], { opacity: [0, 1], duration: 240, ease: "out(2)" });
        animate(views[2], { opacity: [0, 1], translateY: [18, 0], scale: [0.98, 1], duration: 540, ease: "out(3)" });
        animate(scene.querySelectorAll(".cc-ship"), {
          translateX: [12, 0],
          opacity: [0.25, 1],
          delay: stagger(80),
          duration: 580,
          ease: "out(3)",
        });
      }, 2350);
    }

    function animateScene3(scene) {
      const shareLine = scene.querySelector("[data-cc-share-line]");
      const shareButton = scene.querySelector("[data-cc-share-button]");
      const branches = scene.querySelector("[data-cc-branches]");
      const friends = scene.querySelectorAll(".cc-friend-card");
      const states = scene.querySelectorAll(".cc-state-card");
      setOpacity([shareLine, shareButton, branches], 0);
      resetTransforms([shareButton, branches, ...friends, ...states]);
      if (!canAnimateNow()) {
        settleScene(scene);
        return;
      }
      if (canTimelineNow()) {
        const tl = animeApi().createTimeline({ autoplay: false, defaults: { ease: "out(3)" } });
        tl.add(shareLine, { opacity: [0, 1], duration: 280 }, 380);
        tl.add(shareButton, { opacity: [0, 1], translateY: [18, 0], scale: [0.92, 1], duration: 520 }, 520);
        tl.add(branches, { opacity: [0, 1], duration: 520 }, 1180);
        tl.add(friends, { translateY: [20, 0], scale: [0.97, 1], duration: 560, delay: stagger(90) }, 1280);
        tl.add(states, { translateY: [12, 0], scale: [0.96, 1], duration: 460, delay: stagger(120) }, 1900);
        playTimeline(tl);
      } else {
        later(() => animate(shareLine, { opacity: [0, 1], duration: 280 }), 380);
        later(() => animate(shareButton, { opacity: [0, 1], translateY: [18, 0], duration: 520 }), 520);
        later(() => animate(branches, { opacity: [0, 1], duration: 520 }), 1180);
      }
    }

    function animateScene4(scene) {
      const card = scene.querySelector("[data-cc-inside-card]");
      const arrow = scene.querySelector("[data-cc-action-arrow]");
      const actions = scene.querySelector("[data-cc-actions]");
      const actionCards = scene.querySelectorAll(".cc-action-card");
      const cap = scene.querySelector("[data-cc-action-cap]");
      const progress = scene.querySelector("[data-cc-progress]");
      const oil = scene.querySelector("[data-cc-oil-line]");
      setOpacity([arrow, actions, cap], 0);
      resetTransforms([card, actions, ...actionCards]);
      if (progress) progress.style.transform = "scaleX(0)";
      if (oil) {
        oil.style.strokeDasharray = "245";
        oil.style.strokeDashoffset = "245";
      }
      if (!canAnimateNow()) {
        settleScene(scene);
        return;
      }
      animate(card, { translateY: [-12, 0], scale: [0.985, 1], duration: 520, ease: "out(3)" });
      if (canTimelineNow()) {
        const tl = animeApi().createTimeline({ autoplay: false, defaults: { ease: "out(3)" } });
        tl.add(arrow, { opacity: [0, 1], duration: 260 }, 360);
        tl.add(actions, { opacity: [0, 1], duration: 420 }, 760);
        tl.add(actionCards, { translateY: [24, 0], scale: [0.965, 1], duration: 580, delay: stagger(110) }, 820);
        tl.add(progress, { scaleX: [0, 1], duration: 720 }, 1280);
        tl.add(oil, { strokeDashoffset: [245, 0], duration: 900 }, 1280);
        tl.add(cap, { opacity: [0, 1], translateY: [10, 0], duration: 500 }, 1900);
        playTimeline(tl);
      } else {
        later(() => animate(arrow, { opacity: [0, 1], duration: 260 }), 360);
        later(() => animate(actions, { opacity: [0, 1], duration: 420 }), 760);
        later(() => animate(progress, { scaleX: [0, 1], duration: 720 }), 1280);
        later(() => animate(oil, { strokeDashoffset: [245, 0], duration: 900 }), 1280);
        later(() => animate(cap, { opacity: [0, 1], translateY: [10, 0], duration: 500 }), 1900);
      }
    }

    function animateCurrentScene(scene, direction) {
      animateSceneIntro(scene, direction);
      if (current === 0) animateScene1(scene);
      else if (current === 1) animateScene2(scene);
      else if (current === 2) animateScene3(scene);
      else if (current === 3) animateScene4(scene);
    }

    function showStep(nextIndex, options = {}) {
      const previous = current;
      current = ((nextIndex % steps.length) + steps.length) % steps.length;
      const direction = options.direction || (current >= previous ? 1 : -1);
      clearMotion();
      scenes.forEach((scene, index) => {
        scene.style.display = index === current ? "" : "none";
        scene.style.opacity = index === current ? "1" : "0";
        scene.style.transform = "";
      });
      if (label) label.textContent = steps[current].label;
      if (count) count.textContent = `${current + 1} / ${steps.length}`;
      if (caption) caption.textContent = steps[current].caption;
      const scene = scenes[current];
      if (scene) animateCurrentScene(scene, direction);
      if (options.stopPlay) stopAutoPlay();
    }

    function stopAutoPlay() {
      playing = false;
      if (playTimer) window.clearInterval(playTimer);
      playTimer = null;
      if (playLabel) playLabel.textContent = "Play";
      if (playButton) {
        playButton.classList.remove("is-playing");
        playButton.setAttribute("aria-pressed", "false");
      }
    }

    function startAutoPlay() {
      playing = true;
      if (playLabel) playLabel.textContent = "Pause";
      if (playButton) {
        playButton.classList.add("is-playing");
        playButton.setAttribute("aria-pressed", "true");
      }
      if (playTimer) window.clearInterval(playTimer);
      playTimer = window.setInterval(() => {
        showStep(current + 1, { direction: 1 });
      }, 6000);
    }

    function onPrev() {
      showStep(current - 1, { direction: -1, stopPlay: true });
    }

    function onNext() {
      showStep(current + 1, { direction: 1, stopPlay: true });
    }

    function onPlay() {
      if (playing) stopAutoPlay();
      else startAutoPlay();
    }

    function onRootClick(event) {
      const button = event.target?.closest?.("[data-cc-prev], [data-cc-next], [data-cc-play]");
      if (!button || !root.contains(button)) return;
      event.preventDefault();
      if (button.matches("[data-cc-prev]")) onPrev();
      else if (button.matches("[data-cc-next]")) onNext();
      else onPlay();
    }

    function onKey(event) {
      if (event.defaultPrevented) return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target?.isContentEditable) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrev();
      }
    }

    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "channel-concept-step") return;
      const direction = Number(event.data.direction) < 0 ? -1 : 1;
      showStep(current + direction, { direction, stopPlay: true });
    }

    root.addEventListener("click", onRootClick, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("message", onMessage);

    window.__channelsConceptCleanup = function cleanupChannelsConcept() {
      clearMotion();
      stopAutoPlay();
      root.removeEventListener("click", onRootClick, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("message", onMessage);
      if (window.__channelsConceptCleanup === cleanupChannelsConcept) {
        window.__channelsConceptCleanup = null;
      }
    };

    showStep(0);
  }

  window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
  window.KATECHON_DASHBOARD_RENDERERS.channels = function renderChannelsConcept() {
    const uid = `cc-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
    setTimeout(() => hydrate(uid), 0);

    return `<div class="scene channel-concept" data-channel-concept-root="${escapeHtml(uid)}">
      <header class="cc-toolbar">
        <div class="cc-step-label" data-cc-label aria-live="polite">${escapeHtml(steps[0].label)}</div>
        <div class="cc-controls" aria-label="Channel animation controls">
          <button class="cc-button" type="button" data-cc-prev aria-label="Previous step">
            <span class="cc-arrow-icon" aria-hidden="true">&lsaquo;</span>
          </button>
          <span class="cc-count" data-cc-count aria-live="polite">1 / ${steps.length}</span>
          <button class="cc-button" type="button" data-cc-next aria-label="Next step">
            <span class="cc-arrow-icon" aria-hidden="true">&rsaquo;</span>
          </button>
          <button class="cc-button" type="button" data-cc-play aria-label="Play animation" aria-pressed="false">
            <span class="cc-play-icon" aria-hidden="true"></span>
            <span data-cc-play-label>Play</span>
          </button>
        </div>
      </header>
      <div class="cc-viewport">${buildSvg(uid)}</div>
    </div>`;
  };
})();
