const AMBIENT_PROFILES = {
  light: { frequencies: [196, 293.66], detune: [0, -2], waveforms: ['sine', 'triangle'], level: 0.016, cutoff: 1320 },
  dark: { frequencies: [110, 164.81], detune: [0, -3], waveforms: ['triangle', 'sine'], level: 0.019, cutoff: 900 },
  ember: { frequencies: [146.83, 220], detune: [0, 4], waveforms: ['sine', 'triangle'], level: 0.020, cutoff: 1260 },
  moon: { frequencies: [164.81, 246.94], detune: [0, 5], waveforms: ['sine', 'sine'], level: 0.018, cutoff: 1760 },
  verdigris: { frequencies: [130.81, 196], detune: [0, -4], waveforms: ['triangle', 'sine'], level: 0.019, cutoff: 1380 },
};

// Section scenes keep the portfolio feeling like one authored world while
// giving each chapter a quiet sonic identity.
const SECTION_SCENES = {
  hero: { ratio: 1, level: 1, cutoff: 1.05, waveforms: null },
  about: { ratio: 1.125, level: 0.86, cutoff: 1.18, waveforms: ['sine', 'triangle'] },
  experience: { ratio: 0.84, level: 0.92, cutoff: 0.82, waveforms: ['triangle', 'sine'] },
  work: { ratio: 1.26, level: 1.04, cutoff: 1.28, waveforms: ['sine', 'sine'] },
  playground: { ratio: 1.34, level: 1.08, cutoff: 1.32, waveforms: ['triangle', 'square'] },
  skills: { ratio: 0.94, level: 0.82, cutoff: 0.9, waveforms: ['sine', 'triangle'] },
  testimonials: { ratio: 0.72, level: 0.76, cutoff: 0.68, waveforms: ['sine', 'sine'] },
  contact: { ratio: 1.08, level: 0.88, cutoff: 1.12, waveforms: ['triangle', 'sine'] },
};

const initAmbientTheme = () => {
  const button = document.querySelector('[data-ambient-toggle]');
  const label = button?.querySelector('[data-ambient-label]');
  let audio = null;
  let master = null;
  let filter = null;
  let interactionGain = null;
  let voices = [];
  let enabled = false;
  let currentTheme = document.querySelector('[data-orbit-theme].is-active')?.dataset.orbitTheme || (document.body.classList.contains('dark') ? 'dark' : 'light');
  let activeScene = 'hero';
  let sectionObserver = null;
  const visibleSections = new Map();

  const setLabel = () => {
    if (!button) return;
    button.setAttribute('aria-pressed', String(enabled));
    button.classList.toggle('is-on', enabled);
    button.dataset.ambientScene = activeScene;
    if (label) label.textContent = enabled ? 'Ambient on' : 'Ambient off';
  };

  const scene = () => SECTION_SCENES[activeScene] || SECTION_SCENES.hero;
  const profile = () => {
    const base = AMBIENT_PROFILES[currentTheme] || AMBIENT_PROFILES.light;
    const current = scene();
    return {
      frequencies: base.frequencies.map((frequency) => frequency * current.ratio),
      detune: base.detune || [0, 0],
      waveforms: current.waveforms || base.waveforms,
      level: base.level * current.level,
      cutoff: base.cutoff * current.cutoff,
    };
  };

  const applyProfile = (timeConstant = 0.8) => {
    if (!audio || !master || !voices.length) return;
    const next = profile();
    const now = audio.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(next.level, now, timeConstant);
    filter?.frequency.setTargetAtTime(next.cutoff, now, Math.max(0.35, timeConstant));
    voices.forEach((voice, index) => {
      voice.oscillator.frequency.setTargetAtTime(next.frequencies[index], now, Math.max(0.45, timeConstant + 0.25));
      voice.oscillator.detune.setTargetAtTime(next.detune[index] || 0, now, Math.max(0.45, timeConstant + 0.25));
      voice.oscillator.type = next.waveforms[index];
      voice.gain.gain.setTargetAtTime(index ? next.level * 0.46 : next.level * 0.7, now, Math.max(0.4, timeConstant));
    });
  };

  const chooseScene = () => {
    const next = [...visibleSections.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'hero';
    if (next === activeScene) return;
    activeScene = next;
    setLabel();
    applyProfile(0.88);
    document.dispatchEvent(new CustomEvent('portfolio:ambientsection', { detail: { scene: activeScene } }));
  };

  const observeSections = () => {
    const sections = [...document.querySelectorAll('main > section[id]')];
    if (!sections.length || !('IntersectionObserver' in window)) return;
    sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleSections.set(entry.target.id, entry.intersectionRatio);
        else visibleSections.delete(entry.target.id);
      });
      chooseScene();
    }, { threshold: [0.08, 0.22, 0.45, 0.7], rootMargin: '-16% 0px -30% 0px' });
    sections.forEach((section) => sectionObserver.observe(section));
  };

  const start = () => {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    try {
      audio ||= new AudioCtor();
      master ||= audio.createGain();
      filter ||= audio.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.35;
      filter.connect(master);
      master.gain.value = 0.0001;
      master.connect(audio.destination);
      if (!voices.length) {
        voices = profile().frequencies.map((frequency, index) => {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.type = profile().waveforms[index];
          oscillator.frequency.value = frequency;
          oscillator.detune.value = profile().detune[index] || 0;
          gain.gain.value = 0.0001;
          oscillator.connect(gain).connect(filter);
          oscillator.start();
          return { oscillator, gain };
        });
      }
      enabled = true;
      if (audio.state === 'suspended') audio.resume();
      applyProfile(0.55);
      setLabel();
    } catch {
      enabled = false;
      setLabel();
    }
  };

  const stop = () => {
    if (!audio || !master) return;
    const now = audio.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(0.0001, now, 0.25);
    enabled = false;
    setLabel();
  };

  const playInteraction = (event) => {
    if (!enabled || !audio || !filter || event.target.closest?.('[data-ambient-toggle],#treeSoundToggle,[data-orbit-sound]')) return;
    if (!event.target.closest?.('button,a,summary,[role="button"]')) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    const note = event.target.closest?.('[data-orbit-theme],.timeline-toggle') ? 330 : 440;
    if (!interactionGain) {
      interactionGain = audio.createGain();
      interactionGain.gain.value = 1;
      interactionGain.connect(filter);
    }
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(note, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, profile().level * 0.45), now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain).connect(interactionGain);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
  };

  const toggle = () => {
    if (enabled) stop();
    else start();
  };

  const onTheme = (event) => {
    currentTheme = event.detail?.theme || currentTheme;
    applyProfile(0.95);
  };
  const onPageTheme = (event) => {
    currentTheme = event.detail?.dark ? 'dark' : 'light';
    applyProfile(1.05);
  };
  const onVisibility = () => {
    if (!audio || !enabled) return;
    if (document.hidden) audio.suspend();
    else audio.resume().then(() => applyProfile(0.45)).catch(() => {});
  };

  button?.addEventListener('click', toggle);
  document.addEventListener('portfolio:ambienttheme', onTheme);
  document.addEventListener('portfolio:themechange', onPageTheme);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('pointerdown', playInteraction, { capture: true, passive: true });
  observeSections();
  setLabel();

  return () => {
    button?.removeEventListener('click', toggle);
    document.removeEventListener('portfolio:ambienttheme', onTheme);
    document.removeEventListener('portfolio:themechange', onPageTheme);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('pointerdown', playInteraction, { capture: true });
    sectionObserver?.disconnect();
    voices.forEach(({ oscillator }) => oscillator.stop());
    audio?.close().catch(() => {});
    voices = [];
    audio = null;
    filter = null;
    interactionGain = null;
    master = null;
  };
};

export { initAmbientTheme };
