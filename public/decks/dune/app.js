const deck = document.getElementById('deck');
const progress = document.getElementById('progress');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
const sound = document.getElementById('sound');
const narrator = document.getElementById('narrator');
const params = new URLSearchParams(window.location.search);
const truthyParam = name => /^(1|true|yes)$/i.test(String(params.get(name) || ''));
const LOCAL_DEV_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);
const isLocalDevelopment = LOCAL_DEV_HOSTS.has(window.location.hostname) || window.location.protocol === 'file:';
const localDevPauseAutoNarration = isLocalDevelopment && !truthyParam('narration');
const useParentAvatar = window.parent !== window && params.get('avatar') !== '0';
const animeApi = window.anime || {};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canMotion = !reduceMotion && typeof animeApi.animate === 'function';
const staggerMotion = (value, options) =>
  typeof animeApi.stagger === 'function' ? animeApi.stagger(value, options) : 0;
const animateMotion = (target, params) => {
  if (!canMotion || !target) return null;
  return animeApi.animate(target, params);
};

let slides = [];
let narration = [];
let current = 0;
let speechUtterance = null;
let parentNarrationId = '';
let narrationWaveAnimation = null;
let assetVersion = '';

function deckAssetPath(value, version = assetVersion) {
  if (!value) return '';
  const path = /^(?:https?:)?\/\//.test(value) || value.startsWith('/') || value.startsWith('./')
    ? value
    : `./${value}`;
  if (!version || path.startsWith('data:') || path.startsWith('blob:')) return path;
  return `${path}${path.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
}

function setTextElement(parent, tagName, className, text) {
  if (!text) return null;
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function primitiveEl(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  element.dataset.animate = 'primitive';
  return element;
}

function appendPrimitiveArrow(parent) {
  const arrow = primitiveEl('span', 'primitive-arrow', '->');
  parent.appendChild(arrow);
  return arrow;
}

function renderLineage(parent, lineage) {
  if (!Array.isArray(lineage) || !lineage.length) return;

  const rail = document.createElement('div');
  rail.className = 'lineage';
  lineage.forEach((item) => {
    const step = document.createElement('div');
    step.className = 'lineage-step';
    setTextElement(step, 'span', 'lineage-format', item.format);
    setTextElement(step, 'strong', 'lineage-owner', item.owner);
    rail.appendChild(step);
  });
  parent.appendChild(rail);
}

function renderContainerShift(root, primitive) {
  const track = document.createElement('div');
  track.className = 'container-track';
  (primitive.items || []).forEach((item, index, items) => {
    const card = primitiveEl('article', 'primitive-card container-card', '');
    setTextElement(card, 'span', 'primitive-label', item.label);
    setTextElement(card, 'strong', 'primitive-body', item.body);
    setTextElement(card, 'span', 'primitive-note', item.note);
    track.appendChild(card);
    if (index < items.length - 1) appendPrimitiveArrow(track);
  });
  root.appendChild(track);
}

function renderEquation(root, primitive) {
  const row = document.createElement('div');
  row.className = 'equation-row';
  (primitive.terms || []).forEach((term, index, terms) => {
    row.appendChild(primitiveEl('span', 'primitive-term', term));
    if (index < terms.length - 1) row.appendChild(primitiveEl('span', 'primitive-plus', '+'));
  });

  const output = primitiveEl('div', 'primitive-output', '');
  setTextElement(output, 'span', 'primitive-label', '=');
  setTextElement(output, 'strong', 'primitive-body', primitive.output);
  setTextElement(output, 'span', 'primitive-note', primitive.caption);
  root.appendChild(row);
  root.appendChild(output);
}

function renderAgentStack(root, primitive) {
  const stack = document.createElement('div');
  stack.className = 'agent-stack';
  const kat = primitiveEl('div', 'agent-node agent-kat', primitive.kat || 'Kat');
  const router = primitiveEl('div', 'agent-node agent-router', primitive.router || 'agent router');
  stack.appendChild(kat);
  stack.appendChild(primitiveEl('span', 'agent-line', ''));
  stack.appendChild(router);

  const lanes = document.createElement('div');
  lanes.className = 'agent-lanes';
  (primitive.agents || []).forEach((agent) => {
    lanes.appendChild(primitiveEl('span', 'agent-node agent-specialist', agent));
  });
  stack.appendChild(lanes);
  root.appendChild(stack);
}

function renderMutationLoop(root, primitive) {
  const loop = document.createElement('div');
  loop.className = 'mutation-loop';
  const source = primitiveEl('div', 'mutation-source', primitive.source || 'intent');
  loop.appendChild(source);
  appendPrimitiveArrow(loop);
  const steps = document.createElement('div');
  steps.className = 'loop-steps';
  (primitive.steps || []).forEach((step, index) => {
    const item = primitiveEl('span', 'loop-step', step);
    item.style.setProperty('--step-index', index);
    steps.appendChild(item);
  });
  loop.appendChild(steps);
  root.appendChild(loop);
}

function renderSurfaceMap(root, primitive) {
  const map = document.createElement('div');
  map.className = 'surface-map';
  const [stage, rail, modal, components] = primitive.areas || [];

  const stageCell = primitiveEl('div', 'surface-cell surface-stage', '');
  setTextElement(stageCell, 'strong', '', stage && stage.label);
  setTextElement(stageCell, 'span', '', stage && stage.body);
  map.appendChild(stageCell);

  const railCell = primitiveEl('div', 'surface-cell surface-rail', '');
  setTextElement(railCell, 'strong', '', rail && rail.label);
  setTextElement(railCell, 'span', '', rail && rail.body);
  map.appendChild(railCell);

  const modalCell = primitiveEl('div', 'surface-cell surface-modal', '');
  setTextElement(modalCell, 'strong', '', modal && modal.label);
  setTextElement(modalCell, 'span', '', modal && modal.body);
  map.appendChild(modalCell);

  const componentCell = primitiveEl('div', 'surface-cell surface-components', '');
  setTextElement(componentCell, 'strong', '', components && components.label);
  setTextElement(componentCell, 'span', '', components && components.body);
  map.appendChild(componentCell);

  root.appendChild(map);
}

function renderRuntimeLoop(root, primitive) {
  const loop = document.createElement('div');
  loop.className = 'runtime-loop';
  (primitive.steps || []).forEach((step, index) => {
    const item = primitiveEl('div', 'runtime-step', '');
    setTextElement(item, 'span', 'runtime-index', String(index + 1).padStart(2, '0'));
    setTextElement(item, 'strong', '', step);
    loop.appendChild(item);
  });
  root.appendChild(loop);
}

function renderEventTrace(root, primitive) {
  const trace = document.createElement('div');
  trace.className = 'event-trace';
  (primitive.rows || []).forEach((row) => {
    const item = primitiveEl('div', 'trace-row', '');
    setTextElement(item, 'span', 'trace-event', row.event);
    setTextElement(item, 'strong', 'trace-value', row.value);
    trace.appendChild(item);
  });
  root.appendChild(trace);
}

function visualEl(tagName, className, text) {
  const element = primitiveEl(tagName, className, text);
  element.dataset.visual = 'true';
  return element;
}

function renderShift(root, primitive) {
  const stage = document.createElement('div');
  stage.className = 'system-visual shift-visual';

  const labels = primitive.labels || ['PAGE', 'FEED', 'CHANNEL'];
  const page = visualEl('div', 'shift-page', labels[0]);
  const feed = visualEl('div', 'shift-feed', labels[1]);
  const channel = visualEl('div', 'shift-channel', labels[2]);

  for (let i = 0; i < 9; i += 1) {
    page.appendChild(visualEl('span', 'page-line', ''));
  }
  for (let i = 0; i < 14; i += 1) {
    feed.appendChild(visualEl('span', 'feed-card', ''));
  }
  for (let i = 0; i < 12; i += 1) {
    channel.appendChild(visualEl('span', `channel-cell channel-cell-${(i % 4) + 1}`, ''));
  }

  stage.appendChild(page);
  stage.appendChild(visualEl('span', 'shift-beam beam-a', ''));
  stage.appendChild(feed);
  stage.appendChild(visualEl('span', 'shift-beam beam-b', ''));
  stage.appendChild(channel);
  stage.appendChild(visualEl('span', 'signal-ring ring-a', ''));
  stage.appendChild(visualEl('span', 'signal-ring ring-b', ''));
  root.appendChild(stage);
}

function renderChannelObject(root, primitive) {
  const map = document.createElement('div');
  map.className = 'system-visual channel-object';
  const orbit = visualEl('div', 'core-orbit', '');
  const core = visualEl('div', 'channel-core', primitive.center || 'CHANNEL');
  orbit.appendChild(core);

  (primitive.nodes || []).forEach((label, index, nodes) => {
    const node = visualEl('div', `core-node core-node-${index + 1}`, label);
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
    node.style.setProperty('--x', `${Math.cos(angle) * 35}%`);
    node.style.setProperty('--y', `${Math.sin(angle) * 33}%`);
    orbit.appendChild(node);
  });

  for (let i = 0; i < 18; i += 1) {
    const particle = visualEl('span', 'core-particle', '');
    particle.style.setProperty('--p', i);
    orbit.appendChild(particle);
  }
  map.appendChild(orbit);
  root.appendChild(map);
}

function renderAgentMesh(root, primitive) {
  const mesh = document.createElement('div');
  mesh.className = 'system-visual agent-mesh';
  const center = visualEl('div', 'mesh-center', primitive.center || 'KAT');
  mesh.appendChild(center);
  (primitive.agents || []).forEach((agent, index, agents) => {
    const node = visualEl('div', `mesh-agent mesh-agent-${index + 1}`, agent);
    const angle = (index / Math.max(1, agents.length)) * Math.PI * 2 - Math.PI / 2;
    node.style.setProperty('--x', `${Math.cos(angle) * 38}%`);
    node.style.setProperty('--y', `${Math.sin(angle) * 34}%`);
    mesh.appendChild(node);
    const beam = visualEl('span', `mesh-beam mesh-beam-${index + 1}`, '');
    beam.style.setProperty('--rot', `${angle}rad`);
    beam.style.setProperty('--len', `${13 + (index % 2) * 4}rem`);
    mesh.appendChild(beam);
  });
  root.appendChild(mesh);
}

function renderMutableSurface(root, primitive) {
  const shell = document.createElement('div');
  shell.className = 'system-visual mutable-visual';
  shell.appendChild(visualEl('div', 'command-chip', primitive.command || 'ASK'));

  const surface = visualEl('div', 'mutable-frame', '');
  (primitive.states || []).forEach((state, index) => {
    const tile = visualEl('div', `mutable-tile mutable-tile-${index + 1}`, state);
    surface.appendChild(tile);
  });
  for (let i = 0; i < 4; i += 1) {
    surface.appendChild(visualEl('span', `morph-path morph-path-${i + 1}`, ''));
  }
  shell.appendChild(surface);
  root.appendChild(shell);
}

function renderDashboardSurface(root, primitive) {
  const board = document.createElement('div');
  board.className = 'system-visual dashboard-surface';
  const zones = primitive.zones || ['STAGE', 'RAIL', 'MODAL', 'ACTIONS'];
  board.appendChild(visualEl('div', 'dash-zone dash-stage', zones[0]));
  board.appendChild(visualEl('div', 'dash-zone dash-rail', zones[1]));
  board.appendChild(visualEl('div', 'dash-zone dash-modal', zones[2]));
  board.appendChild(visualEl('div', 'dash-zone dash-actions', zones[3]));
  for (let i = 0; i < 22; i += 1) {
    board.appendChild(visualEl('span', 'surface-pixel', ''));
  }
  root.appendChild(board);
}

function renderTurnFlow(root, primitive) {
  const flow = document.createElement('div');
  flow.className = 'system-visual turn-flow';
  const steps = primitive.steps || [];
  steps.forEach((step, index) => {
    flow.appendChild(visualEl('div', `flow-step flow-step-${index + 1}`, step));
    if (index < steps.length - 1) {
      flow.appendChild(visualEl('span', 'flow-link', ''));
    }
  });
  for (let i = 0; i < 5; i += 1) {
    flow.appendChild(visualEl('span', `flow-packet flow-packet-${i + 1}`, ''));
  }
  root.appendChild(flow);
}

function renderLiveExample(root, primitive) {
  const example = document.createElement('div');
  example.className = 'system-visual live-example';
  example.appendChild(visualEl('div', 'example-command', primitive.command || 'BTC 3M'));

  const chart = visualEl('div', 'example-chart', '');
  for (let i = 0; i < 26; i += 1) {
    const bar = visualEl('span', 'chart-bar', '');
    bar.style.setProperty('--h', `${18 + ((i * 17) % 64)}%`);
    chart.appendChild(bar);
  }
  chart.appendChild(visualEl('span', 'chart-line', ''));
  example.appendChild(chart);

  const signals = document.createElement('div');
  signals.className = 'example-signals';
  (primitive.signals || []).forEach((signal) => signals.appendChild(visualEl('span', 'example-signal', signal)));
  example.appendChild(signals);
  root.appendChild(example);
}

function renderDiscoveryMap(root, primitive) {
  const map = document.createElement('div');
  map.className = 'system-visual discovery-map';
  map.appendChild(visualEl('div', 'discovery-core', primitive.center || 'CHANNEL GRAPH'));
  (primitive.actions || []).forEach((action, index, actions) => {
    const node = visualEl('div', `discovery-action discovery-action-${index + 1}`, action);
    const angle = (index / Math.max(1, actions.length)) * Math.PI * 2 - Math.PI / 4;
    node.style.setProperty('--x', `${Math.cos(angle) * 36}%`);
    node.style.setProperty('--y', `${Math.sin(angle) * 32}%`);
    map.appendChild(node);
  });
  for (let i = 0; i < 46; i += 1) {
    const dot = visualEl('span', 'discovery-dot', '');
    dot.style.setProperty('--x', `${8 + ((i * 23) % 84)}%`);
    dot.style.setProperty('--y', `${8 + ((i * 41) % 78)}%`);
    dot.style.setProperty('--d', `${i * 57}ms`);
    map.appendChild(dot);
  }
  root.appendChild(map);
}

function renderPrimitive(slide, primitive) {
  if (!primitive || !primitive.type) return;
  const root = document.createElement('div');
  root.className = `primitive primitive-${primitive.type}`;
  root.dataset.primitive = primitive.type;

  if (primitive.type === 'containerShift') renderContainerShift(root, primitive);
  if (primitive.type === 'equation') renderEquation(root, primitive);
  if (primitive.type === 'agentStack') renderAgentStack(root, primitive);
  if (primitive.type === 'mutationLoop') renderMutationLoop(root, primitive);
  if (primitive.type === 'surfaceMap') renderSurfaceMap(root, primitive);
  if (primitive.type === 'runtimeLoop') renderRuntimeLoop(root, primitive);
  if (primitive.type === 'eventTrace') renderEventTrace(root, primitive);
  if (primitive.type === 'shift') renderShift(root, primitive);
  if (primitive.type === 'channelObject') renderChannelObject(root, primitive);
  if (primitive.type === 'agentMesh') renderAgentMesh(root, primitive);
  if (primitive.type === 'mutableSurface') renderMutableSurface(root, primitive);
  if (primitive.type === 'dashboardSurface') renderDashboardSurface(root, primitive);
  if (primitive.type === 'turnFlow') renderTurnFlow(root, primitive);
  if (primitive.type === 'liveExample') renderLiveExample(root, primitive);
  if (primitive.type === 'discoveryMap') renderDiscoveryMap(root, primitive);

  if (root.childNodes.length) slide.appendChild(root);
}

function renderSlides(config) {
  deck.querySelectorAll('.slide').forEach((slide) => slide.remove());
  assetVersion = config.assetVersion || config.version || '';

  const slideConfig = Array.isArray(config.slides) ? config.slides : [];
  slideConfig.forEach((item, index) => {
    const slide = document.createElement('section');
    slide.className = [
      'slide',
      `slide-${index + 1}`,
      item.primitive ? 'has-primitive' : '',
      index === 0 ? 'active' : '',
    ].filter(Boolean).join(' ');
    slide.dataset.slide = String(index);
    if (item.slug) slide.dataset.slug = item.slug;

    const image = document.createElement('img');
    image.className = 'slide-visual';
    image.src = deckAssetPath(item.image);
    image.alt = item.imageAlt || '';
    slide.appendChild(image);

    const shade = document.createElement('div');
    shade.className = 'shade';
    slide.appendChild(shade);

    const grain = document.createElement('div');
    grain.className = 'grain';
    slide.appendChild(grain);

    const copy = document.createElement('div');
    copy.className = ['copy', item.copyClass || ''].filter(Boolean).join(' ');
    setTextElement(copy, 'p', 'eyebrow', item.eyebrow);
    setTextElement(copy, 'h1', '', item.headline);
    setTextElement(copy, 'p', 'line', item.line);
    renderLineage(copy, item.lineage);
    slide.appendChild(copy);
    renderPrimitive(slide, item.primitive);

    if (Array.isArray(item.stateRail) && item.stateRail.length) {
      const rail = document.createElement('div');
      rail.className = 'state-rail';
      rail.setAttribute('aria-hidden', 'true');
      item.stateRail.forEach((label) => setTextElement(rail, 'span', '', label));
      slide.appendChild(rail);
    }

    deck.appendChild(slide);
  });

  slides = Array.from(document.querySelectorAll('.slide'));
  narration = slideConfig.map((item) => ({
    audio: item.audio ? deckAssetPath(item.audio, item.assetVersion || assetVersion) : '',
    text: item.narration || '',
  }));
}

function renderManifestError(error) {
  deck.querySelectorAll('.slide').forEach((slide) => slide.remove());

  const slide = document.createElement('section');
  slide.className = 'slide active';
  slide.dataset.slide = '0';

  const shade = document.createElement('div');
  shade.className = 'shade';
  slide.appendChild(shade);

  const grain = document.createElement('div');
  grain.className = 'grain';
  slide.appendChild(grain);

  const copy = document.createElement('div');
  copy.className = 'copy';
  setTextElement(copy, 'p', 'eyebrow', 'Deck error');
  setTextElement(copy, 'h1', '', 'Deck manifest did not load.');
  setTextElement(copy, 'p', 'line', error && error.message ? error.message : String(error));
  slide.appendChild(copy);

  deck.appendChild(slide);
  slides = [slide];
  narration = [];
  update({ animate: false });
}

async function loadDeckConfig() {
  const response = await fetch('./deck.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`deck.json returned HTTP ${response.status}`);
  return response.json();
}

function update(options = {}) {
  const { animate = true, direction = 1 } = options;
  slides.forEach((slide, index) => slide.classList.toggle('active', index === current));
  document.body.dataset.slide = String(current + 1);
  const progressWidth = slides.length ? `${((current + 1) / slides.length) * 100}%` : '0%';
  if (canMotion && animate) {
    animateMotion(progress, {
      width: progressWidth,
      duration: 520,
      ease: 'out(3)',
    });
  } else {
    progress.style.width = progressWidth;
  }
  if (animate) animateSlide(current, direction);
}

function stopNarration() {
  document.body.classList.remove('narrating');
  stopNarrationMotion();
  narrator.pause();
  narrator.removeAttribute('src');
  narrator.load();

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function cancelAnimation(animation) {
  if (animation && typeof animation.cancel === 'function') animation.cancel();
}

function startAmbientMotion() {
  if (!canMotion) return;

  animateMotion('.vector', {
    translateX: ['-5%', '6%'],
    scaleX: [0.86, 1.08],
    opacity: [0.10, 0.34],
    duration: 4200,
    delay: staggerMotion(460),
    loop: true,
    alternate: true,
    ease: 'inOut(2)',
  });

  animateMotion('.pulse-node', {
    scale: [0.72, 1.42],
    opacity: [0.24, 0.86],
    duration: 2100,
    delay: staggerMotion(320),
    loop: true,
    alternate: true,
    ease: 'inOut(2)',
  });
}

function startNarrationMotion() {
  if (!canMotion) return;
  cancelAnimation(narrationWaveAnimation);
  narrationWaveAnimation = animateMotion('.narration-wave', {
    opacity: [0, 0.62, 0],
    scaleX: [0.72, 1.16],
    scaleY: [0.28, 0.52],
    duration: 1700,
    delay: staggerMotion(360),
    loop: true,
    ease: 'out(2)',
  });
}

function stopNarrationMotion() {
  cancelAnimation(narrationWaveAnimation);
  narrationWaveAnimation = null;
  document.querySelectorAll('.narration-wave').forEach((wave) => {
    wave.style.opacity = '';
    wave.style.transform = '';
  });
}

function slideMotionTargets(slide) {
  return [
    ...slide.querySelectorAll('.eyebrow, h1, .line'),
    ...slide.querySelectorAll('.lineage-step'),
    ...slide.querySelectorAll('.state-rail span'),
  ];
}

function primitiveMotionTargets(slide) {
  return [...slide.querySelectorAll('.primitive [data-animate]')];
}

function animatePrimitiveSystem(slide) {
  const primitive = slide.querySelector('.primitive');
  if (!primitive || !canMotion) return;
  const type = primitive.dataset.primitive;

  if (type === 'shift') {
    animateMotion(primitive.querySelectorAll('.shift-page, .shift-feed, .shift-channel'), {
      opacity: [0, 1],
      translateY: [34, 0],
      scale: [0.92, 1],
      duration: 820,
      delay: staggerMotion(150),
      ease: 'out(3)',
    });
    animateMotion(primitive.querySelectorAll('.feed-card, .channel-cell'), {
      opacity: [0.18, 0.86],
      scale: [0.82, 1],
      duration: 1200,
      delay: staggerMotion(55, { start: 420 }),
      loop: true,
      alternate: true,
      ease: 'inOut(2)',
    });
    animateMotion(primitive.querySelectorAll('.signal-ring'), {
      opacity: [0, 0.58, 0],
      scale: [0.5, 1.12],
      duration: 1900,
      delay: staggerMotion(460),
      loop: true,
      ease: 'out(2)',
    });
  }

  if (type === 'channelObject') {
    animateMotion(primitive.querySelectorAll('.channel-core, .core-node'), {
      scale: [0.96, 1.04],
      opacity: [0.82, 1],
      duration: 1700,
      delay: staggerMotion(180),
      loop: true,
      alternate: true,
      ease: 'inOut(2)',
    });
    animateMotion(primitive.querySelectorAll('.core-particle'), {
      opacity: [0.08, 0.78, 0.08],
      scale: [0.6, 1.35],
      duration: 2100,
      delay: staggerMotion(90),
      loop: true,
      ease: 'inOut(2)',
    });
  }

  if (type === 'agentMesh') {
    animateMotion(primitive.querySelectorAll('.mesh-beam'), {
      opacity: [0.08, 0.55, 0.08],
      scaleX: [0.35, 1],
      duration: 1800,
      delay: staggerMotion(140),
      loop: true,
      ease: 'inOut(2)',
    });
    animateMotion(primitive.querySelectorAll('.mesh-agent'), {
      translateY: [-7, 7],
      duration: 2300,
      delay: staggerMotion(210),
      loop: true,
      alternate: true,
      ease: 'inOut(2)',
    });
    animateMotion(primitive.querySelector('.mesh-center'), {
      scale: [0.94, 1.08],
      boxShadow: ['0 0 24px rgba(224,74,47,.2)', '0 0 72px rgba(224,74,47,.52)'],
      duration: 1600,
      loop: true,
      alternate: true,
      ease: 'inOut(2)',
    });
  }

  if (type === 'mutableSurface') {
    animateMotion(primitive.querySelector('.command-chip'), {
      translateX: ['-18vw', '0vw', '0vw'],
      opacity: [0, 1, 1],
      scale: [0.84, 1.02, 1],
      duration: 1200,
      ease: 'out(3)',
    });
    animateMotion(primitive.querySelectorAll('.mutable-tile'), {
      translateX: [28, 0],
      translateY: [20, 0],
      opacity: [0, 1],
      scale: [0.88, 1],
      duration: 780,
      delay: staggerMotion(140, { start: 420 }),
      ease: 'out(3)',
    });
    animateMotion(primitive.querySelectorAll('.morph-path'), {
      opacity: [0.1, 0.68, 0.1],
      scaleX: [0.28, 1],
      duration: 1700,
      delay: staggerMotion(240),
      loop: true,
      ease: 'inOut(2)',
    });
  }

  if (type === 'dashboardSurface') {
    animateMotion(primitive.querySelectorAll('.dash-zone'), {
      opacity: [0, 1],
      scale: [0.92, 1],
      translateY: [18, 0],
      duration: 760,
      delay: staggerMotion(120),
      ease: 'out(3)',
    });
    animateMotion(primitive.querySelectorAll('.surface-pixel'), {
      opacity: [0.08, 0.82, 0.08],
      translateY: [-10, 10],
      duration: 2200,
      delay: staggerMotion(55),
      loop: true,
      alternate: true,
      ease: 'inOut(2)',
    });
  }

  if (type === 'turnFlow') {
    animateMotion(primitive.querySelectorAll('.flow-step'), {
      opacity: [0, 1],
      translateY: [22, 0],
      duration: 650,
      delay: staggerMotion(110),
      ease: 'out(3)',
    });
    animateMotion(primitive.querySelectorAll('.flow-packet'), {
      translateX: ['-38vw', '38vw'],
      opacity: [0, 1, 1, 0],
      duration: 2600,
      delay: staggerMotion(420),
      loop: true,
      ease: 'inOut(2)',
    });
    animateMotion(primitive.querySelectorAll('.flow-link'), {
      scaleX: [0.2, 1],
      opacity: [0.16, 0.72],
      duration: 1100,
      delay: staggerMotion(160, { start: 240 }),
      loop: true,
      alternate: true,
      ease: 'inOut(2)',
    });
  }

  if (type === 'liveExample') {
    animateMotion(primitive.querySelectorAll('.chart-bar'), {
      scaleY: [0.2, 1],
      opacity: [0.22, 0.82],
      duration: 1100,
      delay: staggerMotion(36),
      ease: 'out(3)',
    });
    animateMotion(primitive.querySelector('.chart-line'), {
      scaleX: [0, 1],
      opacity: [0.1, 0.9],
      duration: 1400,
      ease: 'out(3)',
    });
    animateMotion(primitive.querySelectorAll('.example-signal'), {
      opacity: [0.62, 1, 0.62],
      translateY: [7, 0, 7],
      duration: 2100,
      delay: staggerMotion(220),
      loop: true,
      ease: 'inOut(2)',
    });
  }

  if (type === 'discoveryMap') {
    animateMotion(primitive.querySelectorAll('.discovery-action'), {
      scale: [0.92, 1.08],
      opacity: [0.75, 1],
      duration: 1700,
      delay: staggerMotion(180),
      loop: true,
      alternate: true,
      ease: 'inOut(2)',
    });
    animateMotion(primitive.querySelectorAll('.discovery-dot'), {
      opacity: [0.08, 0.76, 0.08],
      scale: [0.6, 1.4],
      duration: 2400,
      delay: staggerMotion(48),
      loop: true,
      ease: 'inOut(2)',
    });
    animateMotion(primitive.querySelector('.discovery-core'), {
      rotate: ['-1deg', '1deg'],
      scale: [0.98, 1.03],
      duration: 2200,
      loop: true,
      alternate: true,
      ease: 'inOut(2)',
    });
  }
}

function animateSlide(index, direction = 1) {
  if (!canMotion) return;
  const slide = slides[index];
  if (!slide) return;
  const enterX = direction >= 0 ? 26 : -26;
  const targets = slideMotionTargets(slide);
  const primitiveTargets = primitiveMotionTargets(slide);

  animateMotion(slide.querySelector('.slide-visual'), {
    scale: [1.075, 1],
    opacity: [0.52, 0.76],
    duration: 1600,
    ease: 'out(3)',
  });

  animateMotion(targets, {
    opacity: [0, 1],
    translateX: [enterX, 0],
    translateY: [18, 0],
    duration: 720,
    delay: staggerMotion(64),
    ease: 'out(3)',
  });

  animateMotion(primitiveTargets, {
    opacity: [0, 1],
    translateY: [20, 0],
    scale: [0.97, 1],
    duration: 680,
    delay: staggerMotion(70, { start: 180 }),
    ease: 'out(3)',
  });
  animatePrimitiveSystem(slide);
}

function parentAudioUrl(item) {
  if (!item || !item.audio) return '';
  const url = new URL(item.audio, document.baseURI || window.location.href);
  return `${url.pathname}${url.search}`;
}

function narrateWithParentAvatar(index) {
  const item = narration[index];
  if (!item || !item.text) return;

  parentNarrationId = `dune-deck-${index + 1}-${Date.now()}`;
  document.body.classList.add('narrating');
  startNarrationMotion();
  window.parent.postMessage({
    type: 'deck-narration',
    deck: 'dune-deck',
    id: parentNarrationId,
    slide: index + 1,
    slideCount: slides.length,
    text: item.text,
    audioUrl: parentAudioUrl(item),
  }, window.location.origin);
}

function speakFallback(text) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  speechUtterance = new SpeechSynthesisUtterance(text);
  speechUtterance.rate = 0.95;
  speechUtterance.pitch = 0.88;
  speechUtterance.volume = 0.92;
  speechUtterance.onstart = () => {
    document.body.classList.add('narrating');
    startNarrationMotion();
  };
  speechUtterance.onend = () => {
    document.body.classList.remove('narrating');
    stopNarrationMotion();
  };
  speechUtterance.onerror = () => {
    document.body.classList.remove('narrating');
    stopNarrationMotion();
  };
  window.speechSynthesis.speak(speechUtterance);
}

async function playNarration(index) {
  const item = narration[index];
  if (!item || !item.text) return;

  stopNarration();
  if (useParentAvatar) {
    narrateWithParentAvatar(index);
    return;
  }

  document.body.classList.add('narrating');
  startNarrationMotion();
  if (!item.audio) {
    speakFallback(item.text);
    return;
  }
  narrator.src = item.audio;

  try {
    await narrator.play();
  } catch {
    speakFallback(item.text);
  }
}

narrator.addEventListener('ended', () => {
  document.body.classList.remove('narrating');
  stopNarrationMotion();
});
narrator.addEventListener('error', () => speakFallback(narration[current] && narration[current].text));

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin || !event.data) return;
  if (event.data.type !== 'deck-narration-ended') return;
  if (event.data.id && event.data.id !== parentNarrationId) return;
  document.body.classList.remove('narrating');
  stopNarrationMotion();
});

function goTo(index) {
  if (!slides.length) return;
  const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
  if (nextIndex === current) {
    if (!localDevPauseAutoNarration) playNarration(current);
    return;
  }
  const direction = nextIndex > current ? 1 : -1;
  current = nextIndex;
  update({ direction });
  if (!localDevPauseAutoNarration) playNarration(current);
}

prev.addEventListener('click', () => goTo(current - 1));
next.addEventListener('click', () => goTo(current + 1));
sound.addEventListener('click', () => playNarration(current));

document.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'ArrowDown') {
    event.preventDefault();
    goTo(current + 1);
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault();
    goTo(current - 1);
  }
});

let touchStartX = 0;
document.addEventListener('touchstart', (event) => {
  touchStartX = event.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchend', (event) => {
  const dx = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) < 46) return;
  goTo(current + (dx < 0 ? 1 : -1));
}, { passive: true });

async function init() {
  try {
    const config = await loadDeckConfig();
    if (config.title) document.title = config.title;
    renderSlides(config);
  } catch (error) {
    renderManifestError(error);
    return;
  }

  const requestedSlide = Number.parseInt(params.get('slide') || '1', 10);
  current = Number.isFinite(requestedSlide)
    ? Math.max(0, Math.min(slides.length - 1, requestedSlide - 1))
    : 0;

  update({ animate: false });
  startAmbientMotion();
  window.setTimeout(() => animateSlide(current, 1), 80);
  if (!localDevPauseAutoNarration) window.setTimeout(() => playNarration(current), 180);
}

init();
