const AMBIENT_PROFILES = {
  light: { frequencies: [196, 293.66], waveforms: ['sine', 'triangle'], level: 0.018 },
  dark: { frequencies: [110, 164.81], waveforms: ['triangle', 'sine'], level: 0.021 },
  ember: { frequencies: [146.83, 220], waveforms: ['sine', 'triangle'], level: 0.019 },
  moon: { frequencies: [174.61, 261.63], waveforms: ['sine', 'sine'], level: 0.017 },
  verdigris: { frequencies: [130.81, 196], waveforms: ['triangle', 'sine'], level: 0.018 },
};

const initAmbientTheme = () => {
  const button = document.querySelector('[data-ambient-toggle]');
  const label = button?.querySelector('[data-ambient-label]');
  let audio = null;
  let master = null;
  let voices = [];
  let enabled = false;
  let currentTheme = document.querySelector('[data-orbit-theme].is-active')?.dataset.orbitTheme || (document.body.classList.contains('dark') ? 'dark' : 'light');

  const setLabel = () => {
    if (!button) return;
    button.setAttribute('aria-pressed', String(enabled));
    button.classList.toggle('is-on', enabled);
    if (label) label.textContent = enabled ? 'Ambient on' : 'Ambient off';
  };

  const profile = () => AMBIENT_PROFILES[currentTheme] || AMBIENT_PROFILES.light;

  const applyProfile = () => {
    if (!audio || !master || !voices.length) return;
    const next = profile();
    const now = audio.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(next.level, now, 0.8);
    voices.forEach((voice, index) => {
      voice.oscillator.frequency.setTargetAtTime(next.frequencies[index], now, 1.4);
      voice.oscillator.type = next.waveforms[index];
      voice.gain.gain.setTargetAtTime(index ? next.level * 0.46 : next.level * 0.7, now, 0.9);
    });
  };

  const start = () => {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    try {
      audio ||= new AudioCtor();
      master ||= audio.createGain();
      master.gain.value = 0.0001;
      master.connect(audio.destination);
      if (!voices.length) {
        voices = profile().frequencies.map((frequency, index) => {
          const oscillator = audio.createOscillator();
          const gain = audio.createGain();
          oscillator.type = profile().waveforms[index];
          oscillator.frequency.value = frequency;
          gain.gain.value = 0.0001;
          oscillator.connect(gain).connect(master);
          oscillator.start();
          return { oscillator, gain };
        });
      }
      enabled = true;
      if (audio.state === 'suspended') audio.resume();
      applyProfile();
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

  const toggle = () => {
    if (enabled) stop();
    else start();
  };

  const onTheme = (event) => {
    currentTheme = event.detail?.theme || currentTheme;
    applyProfile();
  };
  const onPageTheme = (event) => {
    currentTheme = event.detail?.dark ? 'dark' : 'light';
    applyProfile();
  };
  const onVisibility = () => {
    if (!audio || !enabled) return;
    if (document.hidden) audio.suspend();
    else audio.resume();
  };

  button?.addEventListener('click', toggle);
  document.addEventListener('portfolio:ambienttheme', onTheme);
  document.addEventListener('portfolio:themechange', onPageTheme);
  document.addEventListener('visibilitychange', onVisibility);
  setLabel();

  return () => {
    button?.removeEventListener('click', toggle);
    document.removeEventListener('portfolio:ambienttheme', onTheme);
    document.removeEventListener('portfolio:themechange', onPageTheme);
    document.removeEventListener('visibilitychange', onVisibility);
    voices.forEach(({ oscillator }) => oscillator.stop());
    audio?.close().catch(() => {});
    voices = [];
    audio = null;
    master = null;
  };
};

export { initAmbientTheme };
