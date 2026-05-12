(function () {
  const SVG_VIEWBOX = "0 0 1680 900";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);
  }

  function buildHtml(uid, appUrl) {
    const v = (name) => escapeHtml(appUrl("videos/" + name));
    return `<div class="aa-root" data-aa-root="${escapeHtml(uid)}" tabindex="0">
      <div class="aa-grid"></div>

      <div class="aa-status">
        <span class="aa-status-dot"></span>
        <span data-aa-status>generating · <b>state_iran_001</b></span>
      </div>

      <div class="aa-phase">
        <div class="aa-phase-num" data-aa-phase-num>PHASE 01</div>
        <div class="aa-phase-name" data-aa-phase-name>read</div>
      </div>

      <svg viewBox="${SVG_VIEWBOX}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="aaGoldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stop-color="#FFF2A8" stop-opacity="0.30"/>
            <stop offset="65%"  stop-color="#F7C95C" stop-opacity="0.10"/>
            <stop offset="100%" stop-color="#F7C95C" stop-opacity="0"/>
          </radialGradient>
          <marker id="aaArrow" viewBox="0 0 10 10" refX="8" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="#F7C95C" stroke-width="1.5" stroke-linecap="round"/>
          </marker>
        </defs>

        <line x1="380" y1="60" x2="380" y2="840" class="band-rule"/>
        <line x1="780" y1="60" x2="780" y2="840" class="band-rule"/>

        <!-- LEFT BAND : inputs -->
        <text class="band-label" x="50" y="80" data-band="read">read · inputs</text>

        <g transform="translate(50,108)">
          <rect class="cand-bg" x="0" y="0" width="300" height="120" rx="6"/>
          <text class="chip-text" x="14" y="22">world</text>
          <g transform="translate(14,42)">
            <rect class="pref-bar-bg" x="0" y="0"  width="272" height="6"/>
            <rect class="pref-bar"    x="0" y="0"  width="0" height="6" id="aa-world-1"/>
            <rect class="pref-bar-bg" x="0" y="22" width="272" height="6"/>
            <rect class="pref-bar"    x="0" y="22" width="0" height="6" id="aa-world-2"/>
            <rect class="pref-bar-bg" x="0" y="44" width="272" height="6"/>
            <rect class="pref-bar"    x="0" y="44" width="0" height="6" id="aa-world-3"/>
            <rect class="pref-bar-bg" x="0" y="66" width="272" height="6"/>
            <rect class="pref-bar"    x="0" y="66" width="0" height="6" id="aa-world-4"/>
          </g>
        </g>

        <g transform="translate(50,256)">
          <rect class="cand-bg" x="0" y="0" width="300" height="240" rx="6"/>
          <text class="chip-text" x="14" y="22">you</text>
          <g transform="translate(14,42)">
            <rect class="pref-bar-bg" x="0"   y="0"  width="272" height="6"/>
            <rect class="pref-bar"    x="0"   y="0"  width="190" height="6" id="aa-pref-1"/>
            <rect class="pref-bar-bg" x="0"   y="22" width="272" height="6"/>
            <rect class="pref-bar"    x="0"   y="22" width="148" height="6" id="aa-pref-2"/>
            <rect class="pref-bar-bg" x="0"   y="44" width="272" height="6"/>
            <rect class="pref-bar"    x="0"   y="44" width="102" height="6" id="aa-pref-3"/>
            <rect class="pref-bar-bg" x="0"   y="66" width="272" height="6"/>
            <rect class="pref-bar"    x="0"   y="66" width="220" height="6" id="aa-pref-4"/>
          </g>
          <line x1="14" y1="138" x2="286" y2="138" class="band-rule"/>
          <g transform="translate(14,156)">
            <rect class="chip" x="0"   y="0"  width="84"  height="22" rx="11"/>
            <text class="chip-text" x="14"  y="15">meme</text>
            <rect class="chip" x="92"  y="0"  width="92"  height="22" rx="11"/>
            <text class="chip-text" x="106" y="15">crypto</text>
            <rect class="chip" x="192" y="0"  width="80"  height="22" rx="11"/>
            <text class="chip-text" x="208" y="15">forks</text>
            <rect class="chip" x="0"   y="32" width="120" height="22" rx="11"/>
            <text class="chip-text" x="14"  y="47">risk-radar</text>
            <rect class="chip" x="128" y="32" width="86"  height="22" rx="11"/>
            <text class="chip-text" x="142" y="47">board</text>
          </g>
        </g>

        <g transform="translate(50,524)">
          <rect class="cand-bg" x="0" y="0" width="300" height="200" rx="6"/>
          <text class="chip-text" x="14" y="22">agents</text>
          <g transform="translate(14,38)">
            <rect class="strip-row" x="0" y="0"   width="272" height="28" rx="4"/>
            <text class="chip-text" x="14" y="18">crypto</text>
            <rect class="strip-row" x="0" y="36"  width="272" height="28" rx="4"/>
            <text class="chip-text" x="14" y="54">meme</text>
            <rect class="strip-row" x="0" y="72"  width="272" height="28" rx="4"/>
            <text class="chip-text" x="14" y="90">polyrec</text>
            <rect class="strip-row" x="0" y="108" width="272" height="28" rx="4"/>
            <text class="chip-text" x="14" y="126">spectre</text>
          </g>
        </g>

        <!-- CENTER BAND : ranker -->
        <text class="band-label" x="412" y="80" data-band="rank">rank · candidates</text>

        <g class="cand-row" data-cand="1" transform="translate(412,108)">
          <rect class="cand-bg" x="0" y="0" width="340" height="74" rx="8"/>
          <foreignObject class="cand-thumb" x="12" y="14" width="72" height="46">
            <video xmlns="http://www.w3.org/1999/xhtml" src="${v("crypto-trading.mp4")}" autoplay muted loop playsinline preload="auto"></video>
          </foreignObject>
          <text class="cand-title" x="96" y="28">BTC liquidity</text>
          <g transform="translate(96,40)">
            <rect class="bar-bg" x="0" y="0" width="200" height="6"/>
            <rect class="bar-fill" id="aa-cand-bar-1" x="0" y="0" width="0" height="6"/>
          </g>
          <text class="score-text" x="304" y="46" data-score="1">—</text>
        </g>

        <g class="cand-row" data-cand="2" transform="translate(412,196)">
          <rect class="cand-bg" x="0" y="0" width="340" height="74" rx="8"/>
          <foreignObject class="cand-thumb" x="12" y="14" width="72" height="46">
            <video xmlns="http://www.w3.org/1999/xhtml" src="${v("meme-coin.mp4")}" autoplay muted loop playsinline preload="auto"></video>
          </foreignObject>
          <text class="cand-title" x="96" y="28">Pump.fun graduation</text>
          <g transform="translate(96,40)">
            <rect class="bar-bg" x="0" y="0" width="200" height="6"/>
            <rect class="bar-fill" id="aa-cand-bar-2" x="0" y="0" width="0" height="6"/>
          </g>
          <text class="score-text" x="304" y="46" data-score="2">—</text>
        </g>

        <g class="cand-row" data-cand="3" data-winner="true" transform="translate(412,284)">
          <rect class="cand-bg" x="0" y="0" width="340" height="74" rx="8"/>
          <foreignObject class="cand-thumb" x="12" y="14" width="72" height="46">
            <video xmlns="http://www.w3.org/1999/xhtml" src="${v("iran.mp4")}" autoplay muted loop playsinline preload="auto"></video>
          </foreignObject>
          <text class="cand-title" x="96" y="28">Hormuz tanker risk</text>
          <g transform="translate(96,40)">
            <rect class="bar-bg" x="0" y="0" width="200" height="6"/>
            <rect class="bar-fill" id="aa-cand-bar-3" x="0" y="0" width="0" height="6"/>
          </g>
          <text class="score-text" x="304" y="46" data-score="3">—</text>
        </g>

        <g class="cand-row" data-cand="4" transform="translate(412,372)">
          <rect class="cand-bg" x="0" y="0" width="340" height="74" rx="8"/>
          <foreignObject class="cand-thumb" x="12" y="14" width="72" height="46">
            <video xmlns="http://www.w3.org/1999/xhtml" src="${v("polyrec.mp4")}" autoplay muted loop playsinline preload="auto"></video>
          </foreignObject>
          <text class="cand-title" x="96" y="28">Polymarket close odds</text>
          <g transform="translate(96,40)">
            <rect class="bar-bg" x="0" y="0" width="200" height="6"/>
            <rect class="bar-fill" id="aa-cand-bar-4" x="0" y="0" width="0" height="6"/>
          </g>
          <text class="score-text" x="304" y="46" data-score="4">—</text>
        </g>

        <g class="cand-row" data-cand="5" transform="translate(412,460)">
          <rect class="cand-bg" x="0" y="0" width="340" height="74" rx="8"/>
          <foreignObject class="cand-thumb" x="12" y="14" width="72" height="46">
            <video xmlns="http://www.w3.org/1999/xhtml" src="${v("spectre.mp4")}" autoplay muted loop playsinline preload="auto"></video>
          </foreignObject>
          <text class="cand-title" x="96" y="28">SPECTRE cluster</text>
          <g transform="translate(96,40)">
            <rect class="bar-bg" x="0" y="0" width="200" height="6"/>
            <rect class="bar-fill" id="aa-cand-bar-5" x="0" y="0" width="0" height="6"/>
          </g>
          <text class="score-text" x="304" y="46" data-score="5">—</text>
        </g>

        <g id="aa-beam" opacity="0">
          <path class="gold-beam"      d="M760,322 C 800,322 820,330 850,360"/>
          <path class="gold-beam core" d="M760,322 C 800,322 820,330 850,360"/>
          <path class="gold-beam live" d="M760,322 C 800,322 820,330 850,360"/>
        </g>

        <!-- RIGHT BAND : realtime generation -->
        <text class="band-label" x="812" y="80" data-band="generate">generate</text>
        <ellipse cx="1230" cy="450" rx="500" ry="380" fill="url(#aaGoldGlow)" opacity="0.7"/>

        <!-- code editor -->
        <g transform="translate(812,100)">
          <rect class="code-panel-frame" x="0" y="0" width="360" height="700" rx="10"/>
          <g transform="translate(14,14)">
            <circle cx="6"  cy="6" r="4" fill="rgba(255,255,255,0.18)"/>
            <circle cx="22" cy="6" r="4" fill="rgba(255,255,255,0.18)"/>
            <circle cx="38" cy="6" r="4" fill="rgba(255,255,255,0.18)"/>
            <text x="60" y="10" class="surface-meta">channel.tsx</text>
          </g>
          <line x1="0" y1="34" x2="360" y2="34" stroke="rgba(255,255,255,0.06)"/>
          <g id="aa-code-lines" transform="translate(20,60)"></g>
          <rect id="aa-code-caret" class="aa-caret" x="0" y="0" width="7" height="14"/>
        </g>

        <!-- generated channel surface -->
        <g transform="translate(1200,100)">
          <rect id="aa-s-frame" class="surface-frame stage-elem" x="0" y="0" width="460" height="700" rx="12"/>

          <g id="aa-s-title-group" class="stage-elem">
            <text class="surface-kicker" x="24" y="44">live channel · iran-monitor</text>
            <text class="surface-title"  x="24" y="76">Strait of Hormuz tensions escalate</text>
            <line x1="24" y1="92" x2="436" y2="92" class="surface-rule"/>
          </g>

          <g id="aa-s-stage" class="stage-elem">
            <rect class="surface-video-frame" x="20" y="108" width="420" height="294" rx="10"/>
            <foreignObject class="surface-video" x="22" y="110" width="416" height="290">
              <video xmlns="http://www.w3.org/1999/xhtml" src="${v("iran.mp4")}" autoplay muted loop playsinline preload="auto"></video>
            </foreignObject>

            <g transform="translate(36,122)">
              <rect class="live-pill" x="0" y="0" width="64" height="22" rx="11"/>
              <circle class="live-dot" cx="14" cy="11" r="3.5"/>
              <text class="live-text" x="26" y="15">LIVE</text>
            </g>

            <g transform="translate(294,118)">
              <rect class="ticker-card" x="0" y="0" width="132" height="52" rx="6"/>
              <text class="ticker-symbol" x="12" y="20">BRENT</text>
              <text class="ticker-price"  x="12"  y="40" id="aa-ticker-price">87.42</text>
              <text class="ticker-change" x="120" y="40" id="aa-ticker-change" text-anchor="end">↑ 4.2%</text>
            </g>

            <g transform="translate(36,346)">
              <rect class="spark-bg" x="0" y="0" width="184" height="44" rx="6"/>
              <polyline id="aa-spark-line" class="spark-line" points=""/>
            </g>

            <g transform="translate(236,358)">
              <text class="mini-stat-label" x="0"   y="0">tankers</text>
              <text class="mini-stat-value" x="0"   y="22" id="aa-stat-holders">184</text>
              <text class="mini-stat-label" x="100" y="0">transit</text>
              <text class="mini-stat-value" x="100" y="22" id="aa-stat-vol">24/d</text>
            </g>
          </g>

          <line id="aa-s-rule-1" class="surface-rule stage-elem" x1="24" y1="414" x2="436" y2="414"/>

          <g id="aa-s-rail-1" class="stage-elem" transform="translate(24,422)">
            <rect class="surface-rail-row" x="0" y="0" width="412" height="40" rx="6"/>
            <circle class="surface-rail-dot" cx="16" cy="20" r="3"/>
            <text class="surface-text" x="32"  y="25">Maxar</text>
            <text class="surface-meta" x="384" y="25" id="aa-rail-time-1">3s</text>
          </g>
          <g id="aa-s-rail-2" class="stage-elem" transform="translate(24,470)">
            <rect class="surface-rail-row" x="0" y="0" width="412" height="40" rx="6"/>
            <circle class="surface-rail-dot" cx="16" cy="20" r="3"/>
            <text class="surface-text" x="32"  y="25">MarineTraffic</text>
            <text class="surface-meta" x="384" y="25" id="aa-rail-time-2">12s</text>
          </g>
          <g id="aa-s-rail-3" class="stage-elem" transform="translate(24,518)">
            <rect class="surface-rail-row" x="0" y="0" width="412" height="40" rx="6"/>
            <circle class="surface-rail-dot" cx="16" cy="20" r="3"/>
            <text class="surface-text" x="32"  y="25">Reuters</text>
            <text class="surface-meta" x="384" y="25" id="aa-rail-time-3">31s</text>
          </g>

          <g id="aa-s-next" class="stage-elem" transform="translate(24,560)">
            <rect class="surface-bet-frame" x="0" y="0" width="412" height="100" rx="12"/>
            <circle cx="22" cy="16" r="3.2" class="live-dot"/>
            <text class="bet-kicker"  x="32"  y="20">polymarket · live odds</text>
            <text class="bet-volume"  x="398" y="20" text-anchor="end" id="aa-bet-volume">vol $184k</text>
            <text class="bet-question" x="14" y="46">Will Hormuz transit halt by EOM?</text>
            <g transform="translate(14,54)">
              <rect class="bet-yes-btn" x="0" y="0" width="190" height="34" rx="6"/>
              <text class="bet-yes-label" x="22"  y="22">YES</text>
              <text class="bet-yes-price" x="178" y="22" text-anchor="end" id="aa-bet-yes">$0.34</text>
            </g>
            <g transform="translate(212,54)">
              <rect class="bet-no-btn" x="0" y="0" width="186" height="34" rx="6"/>
              <text class="bet-no-label" x="22"  y="22">NO</text>
              <text class="bet-no-price" x="174" y="22" text-anchor="end" id="aa-bet-no">$0.66</text>
            </g>
          </g>
        </g>

        <path id="aa-feedback" class="feedback-arc"
              d="M1430,820 C 1000,870 540,870 220,820 C 80,790 30,640 80,500"
              marker-end="url(#aaArrow)"/>
      </svg>
    </div>`;
  }

  function hydrate(uid) {
    const root = document.querySelector(`[data-aa-root="${uid}"]`);
    if (!root) return;
    const q  = (sel) => root.querySelector(sel);

    // ===== element references =====
    const sparkLine     = q("#aa-spark-line");
    const beam          = q("#aa-beam");
    const feedback      = q("#aa-feedback");
    const phaseNumEl    = q("[data-aa-phase-num]");
    const phaseNameEl   = q("[data-aa-phase-name]");
    const statusEl      = q("[data-aa-status]");
    const codeLayer     = q("#aa-code-lines");
    const codeCaret     = q("#aa-code-caret");
    const tickerPriceEl  = q("#aa-ticker-price");
    const tickerChangeEl = q("#aa-ticker-change");
    const statHoldersEl  = q("#aa-stat-holders");
    const statVolEl      = q("#aa-stat-vol");
    const betYesEl       = q("#aa-bet-yes");
    const betNoEl        = q("#aa-bet-no");
    const betVolumeEl    = q("#aa-bet-volume");

    // ===== constants =====
    const PREF_FINAL  = [190, 148, 102, 220];
    const WORLD_BASE  = [220, 168, 188, 132];
    const WORLD_AMP   = [60, 70, 80, 50];
    const WORLD_PER   = [520, 680, 600, 760];
    const SCORES      = [0.71, 0.78, 0.84, 0.62, 0.54];
    const BAR_WIDTH   = 200;
    const CODE_PLAN = [
      [["comment", "// generate channel state for launch-abc"], null],
      [["blank"], null],
      [["key","const "],["text","state "],["punct","= {"], null],
      [["indent"],["prop","channelId: "],["str",'"iran-monitor"'],["punct",","], null],
      [["indent"],["prop","layout: "],["str",'"hormuz_board"'],["punct",","], "aa-s-frame"],
      [["indent"],["prop","thesis: "],["punct","{"], null],
      [["indent2"],["prop","title: "],["str",'"Hormuz tensions escalate"'],["punct",","], "aa-s-title-group"],
      [["indent"],["punct","},"], null],
      [["indent"],["prop","stage: "],["tag","<HormuzBoard />"],["punct",","], "aa-s-stage"],
      [["indent"],["prop","rail: ["], "aa-s-rule-1"],
      [["indent2"],["tag","<Source "],["prop","name"],["punct","="],["str",'"Maxar"'],["tag"," />"],["punct",","], "aa-s-rail-1"],
      [["indent2"],["tag","<Source "],["prop","name"],["punct","="],["str",'"MarineTraffic"'],["tag"," />"],["punct",","], "aa-s-rail-2"],
      [["indent2"],["tag","<Source "],["prop","name"],["punct","="],["str",'"Reuters"'],["tag"," />"], "aa-s-rail-3"],
      [["indent"],["punct","],"], null],
      [["indent"],["prop","bet: "],["str",'"YES · Hormuz halt by EOM"'], "aa-s-next"],
      [["punct","}"], null],
    ];
    const SURFACE_IDS = ["aa-s-frame","aa-s-title-group","aa-s-stage","aa-s-rule-1","aa-s-rail-1","aa-s-rail-2","aa-s-rail-3","aa-s-next"];

    // ===== timers / intervals =====
    let timeouts = [];
    const intervals = [];
    const later = (fn, ms) => { const t = setTimeout(fn, ms); timeouts.push(t); return t; };
    const clearAll = () => { timeouts.forEach(clearTimeout); timeouts = []; };
    const tracked  = (id) => { intervals.push(id); return id; };

    // ===== sparkline =====
    const SPARK_W = 184, SPARK_H = 44, SPARK_PAD = 4, SPARK_N = 36;
    let sparkValues = [];
    function initSpark() {
      sparkValues = [];
      let v = SPARK_H / 2;
      for (let i = 0; i < SPARK_N; i++) {
        v += (Math.random() - 0.5) * 6;
        v = Math.max(SPARK_PAD, Math.min(SPARK_H - SPARK_PAD, v));
        sparkValues.push(v);
      }
      drawSpark();
    }
    function tickSpark() {
      sparkValues.shift();
      const last = sparkValues[sparkValues.length - 1] || SPARK_H / 2;
      const drift = (SPARK_H / 2 - last) * 0.03 + (Math.random() - 0.42) * 5;
      let v = last + drift;
      v = Math.max(SPARK_PAD, Math.min(SPARK_H - SPARK_PAD, v));
      sparkValues.push(v);
      drawSpark();
    }
    function drawSpark() {
      if (!sparkLine) return;
      const step = (SPARK_W - 8) / (SPARK_N - 1);
      sparkLine.setAttribute("points", sparkValues.map((y, i) => `${4 + i * step},${y}`).join(" "));
    }
    initSpark();
    tracked(setInterval(tickSpark, 320));

    // ===== brent ticker =====
    let pBase = 87.42, chBase = 4.2, tankers = 184, transit = 24;
    tracked(setInterval(() => {
      pBase += (Math.random() - 0.46) * 0.18;
      if (tickerPriceEl) tickerPriceEl.textContent = pBase.toFixed(2);
    }, 280));
    tracked(setInterval(() => {
      chBase += (Math.random() - 0.45) * 0.35;
      if (tickerChangeEl) tickerChangeEl.textContent = `↑ ${chBase.toFixed(1)}%`;
    }, 900));
    tracked(setInterval(() => {
      tankers += Math.round((Math.random() - 0.45) * 3);
      transit += Math.round((Math.random() - 0.55) * 2);
      if (statHoldersEl) statHoldersEl.textContent = `${tankers}`;
      if (statVolEl)     statVolEl.textContent     = `${transit}/d`;
    }, 1400));

    // ===== polymarket bet odds =====
    let yesBase = 0.34, betVol = 184;
    tracked(setInterval(() => {
      yesBase += (Math.random() - 0.42) * 0.014;
      yesBase = Math.max(0.18, Math.min(0.58, yesBase));
      if (betYesEl) betYesEl.textContent = `$${yesBase.toFixed(2)}`;
      if (betNoEl)  betNoEl.textContent  = `$${(1 - yesBase).toFixed(2)}`;
    }, 1100));
    tracked(setInterval(() => {
      betVol += Math.round(Math.random() * 4);
      if (betVolumeEl) betVolumeEl.textContent = `vol $${betVol}k`;
    }, 1700));

    // ===== rail timestamps =====
    const railTimes = [3, 12, 31];
    const railEls = [q("#aa-rail-time-1"), q("#aa-rail-time-2"), q("#aa-rail-time-3")];
    const fmt = (s) => s < 60 ? `${s}s` : `${Math.floor(s/60)}m`;
    tracked(setInterval(() => {
      for (let i = 0; i < 3; i++) {
        railTimes[i] += 1;
        if (railEls[i]) railEls[i].textContent = fmt(railTimes[i]);
      }
    }, 1000));
    function resetRailTimes() {
      railTimes[0] = 3; railTimes[1] = 12; railTimes[2] = 31;
      railEls.forEach((el, i) => { if (el) el.textContent = fmt(railTimes[i]); });
    }

    // ===== world jitter =====
    const worldIntervals = [];
    function startWorldJitter() {
      if (worldIntervals.length) return;
      WORLD_BASE.forEach((base, i) => {
        const id = setInterval(() => {
          const delta = (Math.random() - 0.5) * WORLD_AMP[i];
          const w = Math.max(50, Math.min(272, base + delta));
          const el = q(`#aa-world-${i+1}`);
          if (el) el.setAttribute("width", w);
        }, WORLD_PER[i]);
        worldIntervals.push(id);
        intervals.push(id);
      });
    }
    function stopWorldJitter() {
      worldIntervals.forEach(clearInterval);
      worldIntervals.length = 0;
    }

    // ===== phase helpers =====
    function setPhase(n, name) {
      if (phaseNumEl)  phaseNumEl.textContent  = "PHASE 0" + n;
      if (phaseNameEl) phaseNameEl.textContent = name;
      root.querySelectorAll("[data-band]").forEach(b => b.classList.remove("phase-active"));
      const map = { 1: "read", 2: "rank", 3: "generate", 4: "generate" };
      const el = root.querySelector(`[data-band="${map[n]}"]`);
      if (el) el.classList.add("phase-active");
    }
    function setStatus(html) { if (statusEl) statusEl.innerHTML = html; }

    // ===== phases =====
    function phaseRead(done) {
      setPhase(1, "read inputs");
      setStatus("reading <b>world + you</b>");
      stopWorldJitter();
      WORLD_BASE.forEach((w, i) => {
        const el = q(`#aa-world-${i+1}`);
        if (el) el.setAttribute("width", "0");
        later(() => { if (el) el.setAttribute("width", w); }, 80 + i * 100);
      });
      PREF_FINAL.forEach((w, i) => {
        const el = q(`#aa-pref-${i+1}`);
        if (el) el.setAttribute("width", "0");
        later(() => { if (el) el.setAttribute("width", w); }, 280 + i * 100);
      });
      later(startWorldJitter, 700);
      later(done, 1400);
    }

    function phaseRank(done) {
      setPhase(2, "rank candidates");
      setStatus("ranking · <b>5 candidates</b>");
      for (let i = 1; i <= 5; i++) {
        const bar = q(`#aa-cand-bar-${i}`);
        if (bar) bar.setAttribute("width", "0");
        const score = root.querySelector(`[data-score="${i}"]`);
        if (score) score.textContent = "—";
        const row = root.querySelector(`[data-cand="${i}"]`);
        if (row) row.classList.remove("is-winner");
      }
      if (beam) beam.style.opacity = "0";

      const order = [0, 1, 3, 4, 2];
      order.forEach((idx, i) => {
        const score = SCORES[idx];
        later(() => {
          const bar = q(`#aa-cand-bar-${idx+1}`);
          if (bar) bar.setAttribute("width", Math.round(BAR_WIDTH * score));
          const txt = root.querySelector(`[data-score="${idx+1}"]`);
          if (txt) txt.textContent = score.toFixed(2);
          if (idx === 2) {
            const win = root.querySelector(`[data-cand="3"]`);
            if (win) win.classList.add("is-winner");
          }
        }, 100 + i * 320);
      });

      later(() => { if (beam) beam.style.opacity = "1"; }, 100 + 5 * 320 + 220);
      later(done, 100 + 5 * 320 + 700);
    }

    function phaseGenerate(done) {
      setPhase(3, "generate state");
      setStatus("generating · <b>state_iran_001</b>");
      SURFACE_IDS.forEach(id => { const el = q("#" + id); if (el) el.classList.remove("is-on"); });
      if (codeLayer) codeLayer.innerHTML = "";
      if (feedback) feedback.classList.remove("is-on");
      resetRailTimes();

      const LINE_H = 20;
      let y = 0;
      CODE_PLAN.forEach((entry, idx) => {
        const tokens = entry.slice(0, -1);
        const hook = entry[entry.length - 1];
        later(() => {
          if (tokens.length === 1 && tokens[0][0] === "blank") {
            y += LINE_H * 0.6;
            positionCaret(0, y);
            return;
          }
          const line = document.createElementNS("http://www.w3.org/2000/svg", "text");
          line.setAttribute("class", "code-line");
          line.setAttribute("x", "0");
          line.setAttribute("y", y);
          let x = 0;
          tokens.forEach(([type, text]) => {
            if (type === "indent")  { x += 14; return; }
            if (type === "indent2") { x += 28; return; }
            if (type === "blank")   { return; }
            const t = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
            t.setAttribute("class", "tok-" + type);
            t.setAttribute("x", x);
            t.setAttribute("y", y);
            t.textContent = text;
            line.appendChild(t);
            x += text.length * 7.0;
          });
          if (codeLayer) codeLayer.appendChild(line);
          positionCaret(approxLineEnd(tokens), y);
          if (hook) {
            const el = q("#" + hook);
            if (el) el.classList.add("is-on");
          }
          y += LINE_H;
        }, 100 + idx * 230);
      });

      later(done, 100 + CODE_PLAN.length * 230 + 200);
    }

    function approxLineEnd(tokens) {
      let x = 0;
      tokens.forEach(([type, text]) => {
        if (type === "indent")  { x += 14; return; }
        if (type === "indent2") { x += 28; return; }
        if (type === "blank")   { return; }
        x += (text || "").length * 7.0;
      });
      return x;
    }
    function positionCaret(x, y) {
      if (!codeCaret) return;
      codeCaret.setAttribute("x", 832 + x);
      codeCaret.setAttribute("y", 160 + y);
    }

    function phaseHold(done) {
      setPhase(4, "live · learning");
      setStatus("live · <b>watch · share · fork</b>");
      if (feedback) feedback.classList.add("is-on");
      later(done, 3200);
    }

    // ===== orchestrator =====
    const PHASES = [
      { name: "read",     fn: phaseRead },
      { name: "rank",     fn: phaseRank },
      { name: "generate", fn: phaseGenerate },
      { name: "hold",     fn: phaseHold },
    ];
    let phaseIdx = 0;
    let paused = false;

    function runPhase(idx, onComplete) {
      phaseIdx = ((idx % PHASES.length) + PHASES.length) % PHASES.length;
      clearAll();
      PHASES[phaseIdx].fn(onComplete || (() => {}));
    }
    function runLoop() {
      if (paused) return;
      runPhase(phaseIdx, () => {
        if (paused) return;
        phaseIdx = (phaseIdx + 1) % PHASES.length;
        later(runLoop, 600);
      });
    }
    function stepPhase(delta) {
      const nextIdx = phaseIdx + delta;
      if (nextIdx < 0 || nextIdx >= PHASES.length) return false;
      paused = true;
      runPhase(nextIdx);
      return true;
    }
    function setPaused(v) {
      paused = v;
      if (!paused) runLoop();
    }

    // ===== keyboard + postMessage navigation =====
    function directionForKey(e) {
      const keys = { ArrowDown: 1, ArrowUp: -1 };
      return keys[e.code] ?? keys[e.key] ?? 0;
    }
    function isActiveInParent() {
      if (!window.parent || window.parent === window) return true;
      try {
        return window.parent.document.body?.dataset?.currentDashboard === "attention-architecture";
      } catch (_) {
        return true;
      }
    }
    function requestParentDashboardStep(direction) {
      if (!direction || !window.parent || window.parent === window) return false;
      try {
        window.parent.postMessage({
          type: "dashboard-nav-step",
          dashboard: "attention-architecture",
          direction,
        }, window.location.origin);
        return true;
      } catch (_) {
        return false;
      }
    }
    function onKey(e) {
      const tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target && e.target.isContentEditable)) return;
      if (e.currentTarget !== document && !isActiveInParent()) return;
      const direction = directionForKey(e);
      if (direction) {
        if (stepPhase(direction)) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (e.currentTarget === document && requestParentDashboardStep(direction)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (e.key === " ") { e.preventDefault(); setPaused(!paused); }
      else if (e.key === "r" || e.key === "R") { phaseIdx = 0; setPaused(false); }
    }
    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.type !== "attention-arch-step") return;
      const direction = Number(data.direction) < 0 ? -1 : 1;
      stepPhase(direction);
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
    window.addEventListener("message", onMessage);

    // ===== cleanup =====
    if (typeof window.__attentionArchCleanup === "function") {
      try { window.__attentionArchCleanup(); } catch (_) {}
    }
    window.__attentionArchCleanup = function cleanup() {
      clearAll();
      stopWorldJitter();
      intervals.forEach(clearInterval);
      intervals.length = 0;
      document.removeEventListener("keydown", onKey);
      if (parentDoc) {
        try { parentDoc.removeEventListener("keydown", onKey); } catch (_) {}
      }
      window.removeEventListener("message", onMessage);
      if (window.__attentionArchCleanup === cleanup) {
        window.__attentionArchCleanup = null;
      }
    };

    runLoop();
  }

  window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
  window.KATECHON_DASHBOARD_RENDERERS["attention-architecture"] = function (args) {
    const helpers = (args && args.helpers) || {};
    const appUrl = typeof helpers.appUrl === "function" ? helpers.appUrl : (p) => p;
    const uid = `aa-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000).toString(36)}`;
    setTimeout(() => hydrate(uid), 0);
    return buildHtml(uid, appUrl);
  };
})();
