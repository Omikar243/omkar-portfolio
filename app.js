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

const rulesRange = document.querySelector('#rulesRange');
const retrievalRange = document.querySelector('#retrievalRange');
const llmRange = document.querySelector('#llmRange');
const updateModelPlayground = () => {
  if (!rulesRange || !retrievalRange || !llmRange) return;
  const rules = Number(rulesRange.value);
  const retrieval = Number(retrievalRange.value);
  const llm = Number(llmRange.value);
  const score = Math.round((rules * .35) + (retrieval * .35) + (llm * .30));
  const route = rules >= 86 ? 'Deterministic rules → safe match' : retrieval >= 78 ? 'Dense retrieval → peer context' : 'Few-shot LLM → analyst review';
  const reason = rules >= 86 ? 'The structured signals are decisive, so the fastest safe route wins.' : retrieval >= 78 ? 'The evidence is strong enough to retrieve a trusted comparison before reasoning.' : 'The model is uncertain; keep a human in the loop before the decision ships.';
  document.querySelector('#rulesValue').textContent = `${rules}%`;
  document.querySelector('#retrievalValue').textContent = `${retrieval}%`;
  document.querySelector('#llmValue').textContent = `${llm}%`;
  document.querySelector('#decisionRoute').textContent = route;
  document.querySelector('#decisionReason').textContent = reason;
  document.querySelector('#decisionScore').textContent = `${score}%`;
  document.querySelector('#confidenceMeter').style.width = `${score}%`;
};
[rulesRange, retrievalRange, llmRange].forEach((range) => range?.addEventListener('input', updateModelPlayground));
updateModelPlayground();

const gameRounds = [
  { prompt: 'UPI debit · FreshBasket Supermarket · monthly groceries', answer: 'P2M' },
  { prompt: 'NEFT credit · Rahul S Shetty · monthly transfer', answer: 'P2P' },
  { prompt: 'IMPS debit · Apex Cloud Services Pvt Ltd · annual renewal', answer: 'P2M' },
];
let gameRound = 0;
let gameScore = 0;
let roundLocked = false;
const gamePrompt = document.querySelector('#gamePrompt');
const gameFeedback = document.querySelector('#gameFeedback');
const gameScoreLabel = document.querySelector('#gameScore');
const roundCount = document.querySelector('#roundCount');
const gameOptions = [...document.querySelectorAll('#gameOptions button')];
const renderGameRound = () => {
  const round = gameRounds[gameRound];
  if (!round || !gamePrompt) return;
  gamePrompt.textContent = round.prompt;
  roundCount.textContent = `${String(gameRound + 1).padStart(2, '0')} / ${String(gameRounds.length).padStart(2, '0')}`;
  gameFeedback.textContent = 'Choose a label to make the call.';
  gameFeedback.className = 'game-feedback';
  gameOptions.forEach((button) => {
    button.disabled = false;
    button.classList.remove('is-correct', 'is-wrong');
  });
  roundLocked = false;
};
gameOptions.forEach((button) => button.addEventListener('click', () => {
  if (roundLocked) return;
  roundLocked = true;
  const correct = button.dataset.answer === gameRounds[gameRound].answer;
  if (correct) {
    gameScore += 1;
    gameFeedback.textContent = 'Correct — the funnel would route this with confidence.';
    gameFeedback.classList.add('is-correct');
    button.classList.add('is-correct');
  } else {
    gameFeedback.textContent = `Not quite — the resume logic would call this ${gameRounds[gameRound].answer}.`;
    gameFeedback.classList.add('is-wrong');
    button.classList.add('is-wrong');
  }
  gameScoreLabel.textContent = String(gameScore);
  gameOptions.forEach((option) => { option.disabled = true; });
  window.setTimeout(() => {
    if (gameRound < gameRounds.length - 1) {
      gameRound += 1;
      renderGameRound();
    } else {
      gameFeedback.textContent = `Round complete — ${gameScore}/${gameRounds.length}. Reset and try again.`;
    }
  }, 850);
}));
document.querySelector('#gameReset')?.addEventListener('click', () => {
  gameRound = 0;
  gameScore = 0;
  gameScoreLabel.textContent = '0';
  renderGameRound();
});
renderGameRound();

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
    const response = await fetch('api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'The note could not be sent.');
    form.reset();
    if (status) status.textContent = result.message || 'Your note is in. I’ll get back to you soon.';
  } catch (error) {
    if (status) {
      status.style.color = '#a34f35';
      status.textContent = error.message || 'I could not send that note. Please try again.';
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

/* Interactive fractal tree + orbital system for the hero visual */
const heroVisual = document.querySelector('#heroVisual');
const fractalCanvas = document.querySelector('#fractalCanvas');
const fractalContext = fractalCanvas?.getContext('2d');
const signatureGlyph = document.querySelector('#signatureGlyph');
const glyphLetter = document.querySelector('#glyphLetter');

if (heroVisual && fractalCanvas && fractalContext) {
  const branchSegments = [];
  const tipNodes = [];
  const pointer = { x: 0, y: 0, intensity: 0 };
  const glyphNames = ['calligraphic O', 'geometric O', 'orbital O', 'botanical O', 'mathematical O'];
  const orbitConfig = [
    { rx: .49, ry: .19, rotation: -.28, speed: .18, phase: .12, front: false, particles: [{ phase: .1, size: 1.8 }, { phase: 3.45, size: 1.1 }] },
    { rx: .39, ry: .31, rotation: .57, speed: -.12, phase: 1.1, front: true, particles: [{ phase: 1.2, size: 1.5 }, { phase: 4.15, size: .9 }] },
    { rx: .53, ry: .12, rotation: .08, speed: .1, phase: 2.4, front: false, particles: [{ phase: 2.1, size: 1.25 }] },
    { rx: .3, ry: .44, rotation: -.9, speed: .075, phase: .7, front: true, particles: [{ phase: .35, size: 1.05 }] },
  ];
  let dimensions = { width: 0, height: 0, scale: 0, centerX: 0, centerY: 0 };
  let seed = 314159;
  let glyphState = 0;
  let animationId = 0;
  let animationActive = false;
  const startedAt = performance.now();

  const seededRandom = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const buildFractal = () => {
    branchSegments.length = 0;
    tipNodes.length = 0;
    seed = 314159;
    const grow = (x, y, length, angle, width, depth, level = 0) => {
      const bend = (seededRandom() - .5) * .15;
      const branchAngle = angle + bend;
      const endX = x + Math.cos(branchAngle) * length;
      const endY = y + Math.sin(branchAngle) * length;
      const normal = branchAngle + Math.PI / 2;
      const curve = (seededRandom() - .5) * length * .34;
      branchSegments.push({ x, y, endX, endY, controlX: (x + endX) / 2 + Math.cos(normal) * curve, controlY: (y + endY) / 2 + Math.sin(normal) * curve, width, depth, level });
      if (depth <= 0) {
        tipNodes.push({ x: endX, y: endY, level });
        return;
      }
      const nextLength = length * (.665 + seededRandom() * .055);
      const nextWidth = Math.max(.006, width * (.64 + seededRandom() * .06));
      const split = .42 + seededRandom() * .1;
      const asymmetry = (seededRandom() - .5) * .12;
      grow(endX, endY, nextLength, branchAngle - split + asymmetry, nextWidth, depth - 1, level + 1);
      grow(endX, endY, nextLength * (.97 + seededRandom() * .05), branchAngle + split + asymmetry, nextWidth, depth - 1, level + 1);
    };
    grow(.5, .82, .24, -Math.PI / 2, .07, 8);
  };

  const resizeFractal = () => {
    const rect = heroVisual.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    dimensions = {
      width: rect.width,
      height: rect.height,
      scale: Math.min(rect.width, rect.height) * .96,
      centerX: rect.width / 2,
      centerY: rect.height * .53,
    };
    fractalCanvas.width = Math.max(1, Math.round(rect.width * ratio));
    fractalCanvas.height = Math.max(1, Math.round(rect.height * ratio));
    fractalCanvas.style.width = `${rect.width}px`;
    fractalCanvas.style.height = `${rect.height}px`;
    fractalContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (reduceMotion) drawFrame(performance.now());
  };

  const mapPoint = (x, y, offsetX = 0, offsetY = 0) => ({
    x: dimensions.centerX + (x - .5) * dimensions.scale + offsetX,
    y: dimensions.centerY + (y - .53) * dimensions.scale + offsetY,
  });

  const orbitPoint = (orbit, theta) => {
    const rawX = Math.cos(theta) * orbit.rx * dimensions.scale;
    const rawY = Math.sin(theta) * orbit.ry * dimensions.scale;
    return {
      x: dimensions.centerX + rawX * Math.cos(orbit.rotation) - rawY * Math.sin(orbit.rotation),
      y: dimensions.centerY + rawX * Math.sin(orbit.rotation) + rawY * Math.cos(orbit.rotation),
    };
  };

  const drawOrbit = (orbit, time, dark) => {
    const color = dark ? 'rgba(218,183,124,.38)' : 'rgba(142,101,53,.34)';
    fractalContext.save();
    fractalContext.translate(dimensions.centerX, dimensions.centerY);
    fractalContext.rotate(orbit.rotation);
    fractalContext.beginPath();
    fractalContext.ellipse(0, 0, orbit.rx * dimensions.scale, orbit.ry * dimensions.scale, 0, 0, Math.PI * 2);
    fractalContext.strokeStyle = color;
    fractalContext.lineWidth = .7;
    fractalContext.setLineDash(orbit.front ? [] : [1.4, 5]);
    fractalContext.stroke();
    fractalContext.restore();
    orbit.particles.forEach((particle, index) => {
      const theta = particle.phase + time * orbit.speed;
      const point = orbitPoint(orbit, theta);
      const pulse = 1 + Math.sin(time * 1.8 + index) * .18;
      fractalContext.beginPath();
      fractalContext.arc(point.x, point.y, particle.size * pulse, 0, Math.PI * 2);
      fractalContext.fillStyle = dark ? 'rgba(238,208,155,.92)' : 'rgba(153,108,57,.85)';
      fractalContext.shadowColor = dark ? 'rgba(238,208,155,.75)' : 'rgba(185,137,77,.55)';
      fractalContext.shadowBlur = 7;
      fractalContext.fill();
      fractalContext.shadowBlur = 0;
    });
  };

  const drawTree = (time, growth, dark) => {
    const treeOffsetX = pointer.x * dimensions.scale * .015;
    const treeOffsetY = pointer.y * dimensions.scale * .008;
    const baseRed = dark ? 224 : 132;
    const baseGreen = dark ? 190 : 91;
    const baseBlue = dark ? 132 : 47;
    branchSegments.forEach((segment) => {
      const segmentGrowth = Math.max(0, Math.min(1, (growth * 1.25) - segment.level * .08));
      if (segmentGrowth <= 0) return;
      const start = mapPoint(segment.x, segment.y, treeOffsetX, treeOffsetY);
      const end = mapPoint(segment.endX, segment.endY, treeOffsetX, treeOffsetY);
      const control = mapPoint(segment.controlX, segment.controlY, treeOffsetX, treeOffsetY);
      const partialEnd = { x: start.x + (end.x - start.x) * segmentGrowth, y: start.y + (end.y - start.y) * segmentGrowth };
      const partialControl = { x: start.x + (control.x - start.x) * segmentGrowth, y: start.y + (control.y - start.y) * segmentGrowth };
      const alpha = .3 + (8 - segment.level) * .065;
      fractalContext.beginPath();
      fractalContext.moveTo(start.x, start.y);
      fractalContext.quadraticCurveTo(partialControl.x, partialControl.y, partialEnd.x, partialEnd.y);
      fractalContext.strokeStyle = `rgba(${baseRed},${baseGreen},${baseBlue},${Math.min(.9, alpha)})`;
      fractalContext.lineWidth = Math.max(.45, segment.width * dimensions.scale * .18);
      fractalContext.lineCap = 'round';
      fractalContext.stroke();
    });
    if (growth > .78) {
      tipNodes.forEach((tip, index) => {
        const point = mapPoint(tip.x, tip.y, treeOffsetX, treeOffsetY);
        const pulse = 1 + Math.sin(time * 1.35 + index) * .16;
        fractalContext.beginPath();
        fractalContext.arc(point.x, point.y, (tip.level % 3 ? .8 : 1.25) * pulse, 0, Math.PI * 2);
        fractalContext.fillStyle = dark ? 'rgba(238,208,155,.7)' : 'rgba(185,137,77,.58)';
        fractalContext.fill();
      });
    }
  };

  function drawFrame(now) {
    if (!dimensions.width || !dimensions.height) return;
    const time = reduceMotion ? 0 : (now - startedAt) / 1000;
    const growth = reduceMotion ? 1 : Math.min(1, Math.max(0, (now - startedAt) / 1400));
    const dark = body.classList.contains('dark');
    fractalContext.clearRect(0, 0, dimensions.width, dimensions.height);
    orbitConfig.filter((orbit) => !orbit.front).forEach((orbit) => drawOrbit(orbit, time, dark));
    drawTree(time, growth, dark);
    orbitConfig.filter((orbit) => orbit.front).forEach((orbit) => drawOrbit(orbit, time, dark));
    if (!reduceMotion && !document.hidden) {
      animationId = requestAnimationFrame(drawFrame);
    } else {
      animationActive = false;
    }
  }

  const startHeroAnimation = () => {
    if (reduceMotion || animationActive) return;
    animationActive = true;
    animationId = requestAnimationFrame(drawFrame);
  };

  const updateGlyph = () => {
    signatureGlyph.dataset.state = String(glyphState);
    signatureGlyph.setAttribute('aria-label', `Change the central O signature. Current style: ${glyphNames[glyphState]}.`);
    if (glyphLetter) glyphLetter.textContent = 'O';
    if (reduceMotion) drawFrame(performance.now());
  };

  const advanceGlyph = () => {
    glyphState = (glyphState + 1) % glyphNames.length;
    updateGlyph();
  };

  buildFractal();
  resizeFractal();
  startHeroAnimation();
  window.addEventListener('resize', resizeFractal, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(resizeFractal).observe(heroVisual);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animationId) cancelAnimationFrame(animationId);
      animationActive = false;
    } else {
      startHeroAnimation();
    }
  });

  heroVisual.addEventListener('pointerenter', () => {
    heroVisual.classList.add('is-hovered');
    pointer.intensity = 1;
  });
  heroVisual.addEventListener('pointermove', (event) => {
    const rect = heroVisual.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width - .5;
    pointer.y = (event.clientY - rect.top) / rect.height - .5;
    if (reduceMotion) drawFrame(performance.now());
  });
  heroVisual.addEventListener('pointerleave', () => {
    heroVisual.classList.remove('is-hovered');
    pointer.x = 0;
    pointer.y = 0;
    pointer.intensity = 0;
    if (reduceMotion) drawFrame(performance.now());
  });
  signatureGlyph?.addEventListener('click', advanceGlyph);
  signatureGlyph?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      advanceGlyph();
    }
  });
}
