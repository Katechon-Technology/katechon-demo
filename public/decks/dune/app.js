const deck = document.getElementById('deck');
const progress = document.getElementById('progress');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
const sound = document.getElementById('sound');
const narrator = document.getElementById('narrator');
const params = new URLSearchParams(window.location.search);
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

function renderSlides(config) {
  deck.querySelectorAll('.slide').forEach((slide) => slide.remove());
  assetVersion = config.assetVersion || config.version || '';

  const slideConfig = Array.isArray(config.slides) ? config.slides : [];
  slideConfig.forEach((item, index) => {
    const slide = document.createElement('section');
    slide.className = ['slide', `slide-${index + 1}`, index === 0 ? 'active' : ''].filter(Boolean).join(' ');
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
    audio: deckAssetPath(item.audio, item.assetVersion || assetVersion),
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

function animateSlide(index, direction = 1) {
  if (!canMotion) return;
  const slide = slides[index];
  if (!slide) return;
  const enterX = direction >= 0 ? 26 : -26;
  const targets = slideMotionTargets(slide);

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
}

function parentAudioUrl(item) {
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
    playNarration(current);
    return;
  }
  const direction = nextIndex > current ? 1 : -1;
  current = nextIndex;
  update({ direction });
  playNarration(current);
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
  window.setTimeout(() => playNarration(current), 180);
}

init();
