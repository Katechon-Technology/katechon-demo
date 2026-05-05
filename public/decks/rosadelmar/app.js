const slides = Array.from(document.querySelectorAll('.slide'));
const progress = document.getElementById('progress');
const counter = document.getElementById('counter');
const prev = document.getElementById('prev');
const next = document.getElementById('next');
const sound = document.getElementById('sound');
const narrator = document.getElementById('narrator');
const params = new URLSearchParams(window.location.search);
const useParentAvatar = window.parent !== window && params.get('avatar') !== '0';
const useAvatarLayout = (useParentAvatar || params.get('embed') === 'dashboard') && params.get('avatar') !== '0';

document.body.classList.toggle('parent-avatar', useAvatarLayout);

const narration = [
  {
    audio: './assets/narration/rosadelmar-01.mp3',
    text: 'Rosadelmar is an alpha search engine, turning strategy discovery from scarce craft into computable software.',
  },
  {
    audio: './assets/narration/rosadelmar-02.mp3',
    text: 'The team combines discretionary trading, Wintermute HFT experience, physics depth, and frontier tech company building.',
  },
  {
    audio: './assets/narration/rosadelmar-03.mp3',
    text: 'Today alpha research is handcrafted. Rosadelmar moves the loop to compute scale, where hypotheses can multiply.',
  },
  {
    audio: './assets/narration/rosadelmar-04.mp3',
    text: 'The cost curve is the argument: ten thousand hypotheses move from labor budgets to software economics.',
  },
  {
    audio: './assets/narration/rosadelmar-05.mp3',
    text: 'Small edges become attractive when search cost collapses. Rosadelmar targets the long tail humans cannot cover.',
  },
  {
    audio: './assets/narration/rosadelmar-06.mp3',
    text: 'The system discovers offline, refines online, and keeps a live registry of candidate strategies.',
  },
  {
    audio: './assets/narration/rosadelmar-07.mp3',
    text: 'Early runs show an order-of-magnitude lift across generations, suggesting search quality compounds.',
  },
  {
    audio: './assets/narration/rosadelmar-08.mp3',
    text: 'The frontier matters because better candidates emerged for less than a dollar of API cost per run.',
  },
  {
    audio: './assets/narration/rosadelmar-09.mp3',
    text: 'The open question is execution: turning cheap search into durable live P and L without overfitting.',
  },
  {
    audio: './assets/narration/rosadelmar-10.mp3',
    text: 'The memo frames the wedge: start in software-speed HFT, learn fast, then expand wherever alpha search is manual.',
  },
];

const requestedSlide = Number.parseInt(params.get('slide') || '1', 10);
let current = Number.isFinite(requestedSlide)
  ? Math.max(0, Math.min(slides.length - 1, requestedSlide - 1))
  : 0;
let speechUtterance = null;
let parentNarrationId = '';

function update() {
  slides.forEach((slide, index) => slide.classList.toggle('active', index === current));
  document.body.dataset.slide = String(current + 1);
  progress.style.width = `${((current + 1) / slides.length) * 100}%`;
  counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
}

function stopNarration() {
  document.body.classList.remove('narrating');
  narrator.pause();
  narrator.removeAttribute('src');
  narrator.load();

  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function parentAudioUrl(item) {
  const url = new URL(item.audio, window.location.href);
  return `${url.pathname}${url.search}`;
}

function narrateWithParentAvatar(index) {
  const item = narration[index];
  if (!item) return;

  parentNarrationId = `rosadelmar-deck-${index + 1}-${Date.now()}`;
  document.body.classList.add('narrating');
  window.parent.postMessage({
    type: 'deck-narration',
    deck: 'rosadelmar-deck',
    id: parentNarrationId,
    slide: index + 1,
    slideCount: slides.length,
    text: item.text,
    audioUrl: parentAudioUrl(item),
  }, window.location.origin);
}

function speakFallback(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  speechUtterance = new SpeechSynthesisUtterance(text);
  speechUtterance.rate = 0.95;
  speechUtterance.pitch = 0.9;
  speechUtterance.volume = 0.92;
  speechUtterance.onstart = () => document.body.classList.add('narrating');
  speechUtterance.onend = () => document.body.classList.remove('narrating');
  speechUtterance.onerror = () => document.body.classList.remove('narrating');
  window.speechSynthesis.speak(speechUtterance);
}

async function playNarration(index) {
  const item = narration[index];
  if (!item) return;

  stopNarration();
  if (useParentAvatar) {
    narrateWithParentAvatar(index);
    return;
  }

  document.body.classList.add('narrating');
  narrator.src = item.audio;

  try {
    await narrator.play();
  } catch {
    speakFallback(item.text);
  }
}

narrator.addEventListener('ended', () => document.body.classList.remove('narrating'));
narrator.addEventListener('error', () => speakFallback(narration[current].text));

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin || !event.data) return;
  if (event.data.type !== 'deck-narration-ended') return;
  if (event.data.id && event.data.id !== parentNarrationId) return;
  document.body.classList.remove('narrating');
});

function goTo(index) {
  const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
  if (nextIndex === current) {
    playNarration(current);
    return;
  }
  current = nextIndex;
  update();
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

update();
window.addEventListener('load', () => {
  window.setTimeout(() => playNarration(current), 180);
});
