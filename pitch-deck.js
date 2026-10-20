const initPitchDeck = () => {
  const toggle = document.querySelector('#pitchToggle');
  const rail = document.querySelector('#pitchRail');
  const label = document.querySelector('[data-pitch-label]');
  const chapters = [...document.querySelectorAll('[data-pitch-target]')];
  const sections = chapters.map((button) => document.getElementById(button.dataset.pitchTarget)).filter(Boolean);
  if (!toggle || !rail || !sections.length) return () => {};
  let active = 0;
  let observer;
  const syncVisualViewport = () => {
    const viewport = window.visualViewport;
    if (!viewport || !window.matchMedia('(max-width: 900px)').matches) return;
    const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    rail.style.setProperty('--pitch-viewport-offset', `${offset}px`);
    rail.style.setProperty('--pitch-viewport-width', `${viewport.width}px`);
  };
  const setMode = (enabled, persist = true) => {
    document.body.classList.toggle('pitch-mode', enabled);
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Exit Pitch Deck Mode' : 'Enter Pitch Deck Mode');
    if (label) label.textContent = enabled ? 'Pitch deck on' : 'Pitch deck';
    rail.hidden = !enabled;
    if (persist) try { localStorage.setItem('omkar-pitch-mode', enabled ? 'on' : 'off'); } catch {}
    document.dispatchEvent(new CustomEvent('portfolio:pitchchange', { detail: { enabled } }));
  };
  const setActive = (index) => {
    active = Math.max(0, Math.min(index, chapters.length - 1));
    chapters.forEach((button, i) => {
      const on = i === active;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-current', on ? 'step' : 'false');
    });
  };
  toggle.addEventListener('click', () => setMode(!document.body.classList.contains('pitch-mode')));
  chapters.forEach((button, index) => button.addEventListener('click', () => {
    setActive(index);
    document.getElementById(button.dataset.pitchTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) setActive(sections.indexOf(entry.target)); });
  }, { rootMargin: '-32% 0px -48% 0px', threshold: 0 });
  sections.forEach((section) => observer.observe(section));
  const keydown = (event) => { if (event.key === 'Escape' && document.body.classList.contains('pitch-mode')) setMode(false); };
  document.addEventListener('keydown', keydown);
  window.visualViewport?.addEventListener('resize', syncVisualViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', syncVisualViewport, { passive: true });
  window.addEventListener('resize', syncVisualViewport, { passive: true });
  syncVisualViewport();
  let saved = null;
  try { saved = localStorage.getItem('omkar-pitch-mode'); } catch {}
  setMode(saved === 'on', false);
  return () => { observer?.disconnect(); document.removeEventListener('keydown', keydown); window.visualViewport?.removeEventListener('resize', syncVisualViewport); window.visualViewport?.removeEventListener('scroll', syncVisualViewport); window.removeEventListener('resize', syncVisualViewport); };
};
export { initPitchDeck };
