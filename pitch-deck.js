const initPitchDeck = () => {
  const toggle = document.querySelector('#pitchToggle');
  const rail = document.querySelector('#pitchRail');
  const stage = document.querySelector('#pitchDeckStage');
  const label = document.querySelector('[data-pitch-label]');
  const chapters = [...document.querySelectorAll('[data-pitch-target]')];
  const slides = [...document.querySelectorAll('[data-pitch-slide]')];
  const progress = document.querySelector('[data-pitch-progress]');
  const current = document.querySelector('[data-pitch-current]');
  const prev = document.querySelector('[data-pitch-prev]');
  const next = document.querySelector('[data-pitch-next]');
  const exit = document.querySelector('[data-pitch-exit]');
  const exitTo = [...document.querySelectorAll('[data-pitch-exit-to]')];
  const skillTokens = [...document.querySelectorAll('.pitch-toolkit span')];
  if (!toggle || !rail || !stage || !slides.length) return () => {};
  let active = 0;
  let wheelLock = false;
  const syncVisualViewport = () => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    stage.style.setProperty('--pitch-vh', `${viewport.height}px`);
  };
  const setActive = (index, focus = false) => {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      const on = i === active;
      slide.classList.toggle('is-active', on);
      slide.setAttribute('aria-hidden', String(!on));
    });
    chapters.forEach((button, i) => {
      const on = i === active;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-current', on ? 'step' : 'false');
    });
    if (progress) progress.style.width = `${((active + 1) / slides.length) * 100}%`;
    if (current) current.textContent = String(active + 1).padStart(2, '0');
    if (focus) slides[active].focus({ preventScroll: true });
  };
  const setMode = (enabled, persist = true) => {
    document.body.classList.toggle('pitch-mode', enabled);
    document.documentElement.classList.toggle('pitch-mode', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Exit Pitch Deck Mode' : 'Enter Pitch Deck Mode');
    if (label) label.textContent = enabled ? 'Presentation on' : 'Pitch deck';
    rail.hidden = !enabled;
    stage.hidden = !enabled;
    document.body.classList.toggle('pitch-active', enabled);
    if (persist) try { localStorage.setItem('omkar-pitch-mode', enabled ? 'on' : 'off'); } catch {}
    if (enabled) { setActive(active); stage.focus({ preventScroll: true }); }
    document.dispatchEvent(new CustomEvent('portfolio:pitchchange', { detail: { enabled } }));
  };
  const chapterClick = (event) => {
    const index = chapters.indexOf(event.currentTarget);
    if (index >= 0) setActive(index, true);
  };
  chapters.forEach((button) => button.addEventListener('click', chapterClick));
  prev?.addEventListener('click', () => setActive(active - 1, true));
  next?.addEventListener('click', () => setActive(active + 1, true));
  exit?.addEventListener('click', () => setMode(false));
  const exitToClick = (event) => {
    const target = event.currentTarget.getAttribute('data-pitch-exit-to');
    if (!target) return;
    setMode(false);
    window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40);
  };
  exitTo.forEach((button) => button.addEventListener('click', exitToClick));
  const skillEnter = (event) => {
    const index = skillTokens.indexOf(event.currentTarget);
    skillTokens.forEach((token, tokenIndex) => {
      const distance = Math.abs(tokenIndex - index);
      token.style.setProperty('--skill-distance', String(distance));
      token.classList.toggle('is-pulsing', distance <= 2);
    });
  };
  const skillLeave = () => skillTokens.forEach((token) => { token.style.removeProperty('--skill-distance'); token.classList.remove('is-pulsing'); });
  skillTokens.forEach((token) => { token.addEventListener('pointerenter', skillEnter); token.addEventListener('pointerleave', skillLeave); });
  toggle.addEventListener('click', () => setMode(!document.body.classList.contains('pitch-mode')));
  const keydown = (event) => {
    if (!document.body.classList.contains('pitch-mode')) return;
    if (event.key === 'Escape') { event.preventDefault(); setMode(false); }
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') { event.preventDefault(); setActive(active + 1, true); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); setActive(active - 1, true); }
  };
  const wheel = (event) => {
    if (!document.body.classList.contains('pitch-mode') || Math.abs(event.deltaY) < 12 || wheelLock) return;
    event.preventDefault(); wheelLock = true; setActive(active + (event.deltaY > 0 ? 1 : -1)); window.setTimeout(() => { wheelLock = false; }, 560);
  };
  const touchStart = (event) => { stage.dataset.pitchTouchY = String(event.touches[0].clientY); };
  const touchEnd = (event) => {
    const start = Number(stage.dataset.pitchTouchY || 0); const delta = start - event.changedTouches[0].clientY;
    if (Math.abs(delta) > 45) setActive(active + (delta > 0 ? 1 : -1));
  };
  document.addEventListener('keydown', keydown);
  stage.addEventListener('wheel', wheel, { passive: false });
  stage.addEventListener('touchstart', touchStart, { passive: true });
  stage.addEventListener('touchend', touchEnd, { passive: true });
  window.visualViewport?.addEventListener('resize', syncVisualViewport, { passive: true });
  window.addEventListener('resize', syncVisualViewport, { passive: true });
  syncVisualViewport();
  let saved = null;
  try { saved = localStorage.getItem('omkar-pitch-mode'); } catch {}
  setMode(saved === 'on', false);
  return () => {
    document.removeEventListener('keydown', keydown); stage.removeEventListener('wheel', wheel); stage.removeEventListener('touchstart', touchStart); stage.removeEventListener('touchend', touchEnd);
    chapters.forEach((button) => button.removeEventListener('click', chapterClick)); exitTo.forEach((button) => button.removeEventListener('click', exitToClick)); skillTokens.forEach((token) => { token.removeEventListener('pointerenter', skillEnter); token.removeEventListener('pointerleave', skillLeave); }); window.visualViewport?.removeEventListener('resize', syncVisualViewport); window.removeEventListener('resize', syncVisualViewport);
  };
};
export { initPitchDeck };
