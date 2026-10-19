import { initOrbitGame } from './orbit-game.js';
import { forwardContact } from './contact-delivery.js';
import { initFractalTree } from './fractal-tree.js';
import { initPrivateWebAnalytics, initResumeTracking } from './resume-tracking.js';
import { initMotionSystem } from './motion-system.js';
import { initAmbientTheme } from './ambient-theme.js';

const body = document.body;
const loader = document.querySelector('#loader');
const menuToggle = document.querySelector('#menuToggle');
const nav = document.querySelector('.main-nav');
const progress = document.querySelector('#scrollProgress');
const canvas = document.querySelector('#particleCanvas');
const ctx = canvas?.getContext('2d');
const cursorGlow = document.querySelector('#cursorGlow');

window.addEventListener('load', () => {
  window.setTimeout(() => {
    loader?.classList.add('is-done');
    body.classList.remove('is-loading');
  }, 1250);
});

const themeControls = [...document.querySelectorAll('[data-theme-toggle]')];
const applyTheme = (dark) => {
  body.classList.toggle('dark', dark);
  themeControls.forEach((control) => {
    control.setAttribute('aria-pressed', String(dark));
    const next = dark ? 'light' : 'dark';
    control.setAttribute('aria-label', `Switch artwork and website to ${next} mode`);
    const label = control.querySelector('[data-theme-label]');
    if (label) label.textContent = dark ? 'Light canvas' : 'Dark canvas';
  });
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#211a15' : '#f3eadc');
  document.dispatchEvent(new CustomEvent('portfolio:themechange', { detail: { dark } }));
};
let savedTheme = null;
try { savedTheme = localStorage.getItem('omkar-theme'); } catch { /* optional persistence */ }
applyTheme(savedTheme === 'dark');
themeControls.forEach((control) => control.addEventListener('click', () => {
  const dark = !body.classList.contains('dark');
  applyTheme(dark);
  try { localStorage.setItem('omkar-theme', dark ? 'dark' : 'light'); } catch { /* optional persistence */ }
}));

menuToggle?.addEventListener('click', () => {
  const isOpen = nav?.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
});
nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('is-open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

const reveals = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.13 });
reveals.forEach((element) => revealObserver.observe(element));

document.querySelectorAll('.timeline-toggle').forEach((toggle) => {
  const detail = document.getElementById(toggle.getAttribute('aria-controls'));
  const item = toggle.closest('.timeline-item');
  toggle.addEventListener('click', () => {
    const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(willOpen));
    toggle.classList.toggle('is-open', willOpen);
    toggle.querySelector('.chapter-symbol').textContent = willOpen ? '−' : '+';
    toggle.querySelector('.chapter-label').textContent = willOpen ? 'close chapter' : 'open chapter';
    if (detail) detail.hidden = !willOpen;
    item?.classList.toggle('is-expanded', willOpen);
  });
});

const updateProgress = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.width = `${scrollable ? (window.scrollY / scrollable) * 100 : 0}%`;
};
window.addEventListener('scroll', updateProgress, { passive: true });
updateProgress();

const toast = document.querySelector('#toast');
let toastTimer;
document.querySelectorAll('[data-toast]').forEach((button) => button.addEventListener('click', () => {
  if (!toast) return;
  toast.textContent = button.dataset.toast;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3200);
}));

const form = document.querySelector('#contactForm');
const status = document.querySelector('#formStatus');
const submitButton = form?.querySelector('button[type="submit"]');
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const fields = [...form.elements].filter((field) => field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement);
  fields.forEach((field) => field.removeAttribute('aria-invalid'));
  if (!form.checkValidity()) {
    const invalid = fields.find((field) => !field.checkValidity());
    invalid?.setAttribute('aria-invalid', 'true');
    invalid?.focus();
    if (status) {
      status.textContent = 'Please check the highlighted field and try again.';
      status.style.color = '#a34f35';
    }
    return;
  }
  const payload = Object.fromEntries(new FormData(form).entries());
  if (status) {
    status.style.color = 'var(--gold)';
    status.textContent = 'Sending your note…';
  }
  if (submitButton) submitButton.disabled = true;
  try {
    // The same email backend works from Vercel and the static GitHub Pages backup.
    const result = await forwardContact(payload);
    if (!result.ok) throw new Error(result.message);
    form.reset();
    if (status) status.textContent = result.message;
  } catch (error) {
    if (status) {
      status.style.color = '#a34f35';
      status.textContent = error.message || 'Email delivery could not be confirmed. Your text is still here. Please try again later.';
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

const resizeCanvas = () => {
  if (!canvas || !ctx) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
};
const particleMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = particleMotion.matches;
let particleFrame = 0;
const particles = Array.from({ length: 42 }, (_, index) => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  radius: index % 5 === 0 ? 1.5 : .8,
  vx: (Math.random() - .5) * .18,
  vy: (Math.random() - .5) * .18,
  alpha: .18 + Math.random() * .35,
}));
const animateParticles = () => {
  particleFrame = 0;
  if (!ctx || !canvas || document.hidden) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  const dark = body.classList.contains('dark');
  particles.forEach((particle) => {
    if (!reduceMotion) {
      particle.x += particle.vx;
      particle.y += particle.vy;
    }
    if (particle.x < -10) particle.x = window.innerWidth + 10;
    if (particle.x > window.innerWidth + 10) particle.x = -10;
    if (particle.y < -10) particle.y = window.innerHeight + 10;
    if (particle.y > window.innerHeight + 10) particle.y = -10;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fillStyle = dark ? `rgba(209,171,112,${particle.alpha})` : `rgba(115,83,51,${particle.alpha * .45})`;
    ctx.fill();
  });
  if (!reduceMotion) particleFrame = requestAnimationFrame(animateParticles);
};
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
animateParticles();
particleMotion.addEventListener('change', () => {
  reduceMotion = particleMotion.matches;
  cancelAnimationFrame(particleFrame);
  animateParticles();
});
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(particleFrame);
  if (!document.hidden) animateParticles();
});
document.addEventListener('portfolio:themechange', () => { if (reduceMotion) animateParticles(); });

window.addEventListener('pointermove', (event) => {
  if (window.innerWidth > 640 && cursorGlow) {
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
  }
});


const destroyOrbitGame = initOrbitGame(document.querySelector('[data-orbit-game]'));
const destroyFractalTree = initFractalTree(document.querySelector('#heroVisual'), document.querySelector('#fractalCanvas'), document.querySelector('#signatureGlyph'));
const destroyResumeTracking = initResumeTracking();
const destroyMotionSystem = initMotionSystem();
const destroyAmbientTheme = initAmbientTheme();
initPrivateWebAnalytics();

window.addEventListener('pagehide', (event) => {
  cancelAnimationFrame(particleFrame);
  if (!event.persisted) { destroyMotionSystem(); destroyAmbientTheme(); destroyFractalTree(); destroyOrbitGame(); destroyResumeTracking(); }
});
window.addEventListener('pageshow', () => {
  if (!particleFrame && !document.hidden) animateParticles();
});
