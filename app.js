const body = document.body;
const loader = document.querySelector('#loader');
const themeToggle = document.querySelector('#themeToggle');
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

let savedTheme = null;
try {
  savedTheme = localStorage.getItem('omkar-theme');
} catch {
  savedTheme = null;
}
if (savedTheme === 'dark') {
  body.classList.add('dark');
  themeToggle?.setAttribute('aria-pressed', 'true');
  themeToggle?.setAttribute('aria-label', 'Switch to light mode');
}
themeToggle?.addEventListener('click', () => {
  const isDark = body.classList.toggle('dark');
  try {
    localStorage.setItem('omkar-theme', isDark ? 'dark' : 'light');
  } catch {
    // Private browsing can disable storage without affecting the toggle itself.
  }
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
});

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
    toggle.querySelector('span').textContent = willOpen ? '−' : '+';
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
form?.addEventListener('submit', (event) => {
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
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const message = String(data.get('message') || '').trim();
  if (!name || !email || !message) {
    if (status) {
      status.textContent = 'Please fill in all three fields.';
      status.style.color = '#a34f35';
    }
    return;
  }
  if (status) {
    status.style.color = 'var(--gold)';
    status.textContent = 'Opening an email draft with your note…';
  }
  const subject = encodeURIComponent(`Portfolio note from ${name}`);
  const bodyText = encodeURIComponent(`${message}\n\nReply to: ${email}`);
  window.location.href = `mailto:omikar243@gmail.com?subject=${subject}&body=${bodyText}`;
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
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const particles = Array.from({ length: 42 }, (_, index) => ({
  x: Math.random() * window.innerWidth,
  y: Math.random() * window.innerHeight,
  radius: index % 5 === 0 ? 1.5 : .8,
  vx: (Math.random() - .5) * .18,
  vy: (Math.random() - .5) * .18,
  alpha: .18 + Math.random() * .35,
}));
const animateParticles = () => {
  if (!ctx || !canvas) return;
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
  if (!reduceMotion) requestAnimationFrame(animateParticles);
};
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
animateParticles();

window.addEventListener('pointermove', (event) => {
  if (window.innerWidth > 640 && cursorGlow) {
    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;
  }
});
