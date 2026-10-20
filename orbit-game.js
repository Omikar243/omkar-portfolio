import {
  advanceOrbit,
  createOrbitState,
  getOrbitSummary,
  pauseOrbit,
  restartOrbit,
  resumeOrbit,
  setOrbitAim,
  setOrbitBounds,
  startOrbit,
} from './orbit-physics.js';
import { subscribeFrame, getQualityTier } from './frame-scheduler.js';

const MAX_DPR = 2;
const SOURCE_URL = 'https://github.com/Omikar243/omkar-portfolio';
const BEST_KEY = 'signal-orbit-best';
const TAU = Math.PI * 2;
const THEMES = {
  ember: { ink: '#f3eadc', soft: '#cdbda8', gold: '#d1ab70', bronze: '#9b7042', red: '#bd6c53', redLight: '#e4a07a', bg: ['#38281d', '#211813', '#120e0b'], line: 'rgba(209,171,112,.28)', player: '#fff0c2' },
  moon: { ink: '#e7eef2', soft: '#aebdca', gold: '#9fc4d5', bronze: '#65899b', red: '#c77d86', redLight: '#efb0a9', bg: ['#263746', '#172632', '#0b121a'], line: 'rgba(159,196,213,.3)', player: '#e8f7ff' },
  verdigris: { ink: '#e7efe4', soft: '#b4c6b0', gold: '#a9c59d', bronze: '#638b76', red: '#c48a66', redLight: '#edbd8b', bg: ['#26382f', '#17251f', '#0b1511'], line: 'rgba(169,197,157,.3)', player: '#efffe9' },
};
const POWERUP_LABELS = { shield: 'shield', magnet: 'magnet', slow: 'slow-field', boost: 'overdrive' };

const readBest = () => {
  try { return Math.max(0, Number(window.localStorage.getItem(BEST_KEY)) || 0); } catch { return 0; }
};
const writeBest = (score) => {
  try { window.localStorage.setItem(BEST_KEY, String(score)); } catch { /* storage is optional */ }
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const initOrbitGame = (element) => {
  if (!element) return () => {};
  const canvas = element.querySelector('[data-orbit-canvas]');
  const context = canvas?.getContext('2d', { alpha: false });
  const shaderCanvas = element.querySelector('[data-orbit-shader]');
  const gl = shaderCanvas?.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
  if (!canvas || !context) return () => {};
  const startButton = element.querySelector('[data-orbit-start]');
  const pauseButton = element.querySelector('[data-orbit-pause]');
  const restartButton = element.querySelector('[data-orbit-restart]');
  const soundButton = element.querySelector('[data-orbit-sound]');
  const themeButtons = [...element.querySelectorAll('[data-orbit-theme]')];
  const powerupLabel = element.querySelector('[data-orbit-powerup] strong');
  const stateLabel = element.querySelector('[data-orbit-state]');
  const scoreLabel = element.querySelector('[data-orbit-score]');
  const bestLabel = element.querySelector('[data-orbit-best]');
  const comboLabel = element.querySelector('[data-orbit-combo]');
  const livesLabel = element.querySelector('[data-orbit-lives]');
  const levelLabel = element.querySelector('[data-orbit-level]');
  const timerLabel = element.querySelector('[data-orbit-timer]');
  const liveRegion = element.querySelector('[data-orbit-live]');
  const overlay = element.querySelector('[data-orbit-overlay]');
  const overlayTitle = element.querySelector('[data-orbit-overlay-title]');
  const overlayCopy = element.querySelector('[data-orbit-overlay-copy]');
  const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const quality = getQualityTier();
  const controller = new AbortController();
  const { signal } = controller;
  const state = createOrbitState({ width: 720, height: 460, seed: 243 });
  state.best = readBest();
  const input = { left: false, right: false, up: false, down: false };
  const particles = [];
  const waves = [];
  let lastPaint = 0;
  let ambience = 0;
  let uiClock = 0;
  const stars = Array.from({ length: 42 }, (_, index) => ({
    x: ((index * 71) % 101) / 100,
    y: ((index * 43 + 19) % 97) / 100,
    radius: index % 7 === 0 ? 1.3 : 0.65,
    alpha: 0.18 + (index % 5) * 0.055,
  }));
  let dpr = 1;
  let width = 720;
  let height = 460;
  let unsubscribeFrame = null;
  let lastTime = 0;
  let destroyed = false;
  let visible = true;
  let reducedMotion = Boolean(reducedMotionQuery?.matches);
  let audioContext = null;
  let soundEnabled = false;
  let lastSoundLevel = 1;
  let themeName = 'ember';
  let theme = THEMES[themeName];
  let shader = null;

  const hexToRgb = (hex) => {
    const value = hex.replace('#', '');
    return [parseInt(value.slice(0, 2), 16) / 255, parseInt(value.slice(2, 4), 16) / 255, parseInt(value.slice(4, 6), 16) / 255];
  };
  const setupShader = () => {
    if (!gl || !shaderCanvas) return;
    const vertexSource = `attribute vec2 position; void main(){gl_Position=vec4(position,0.0,1.0);}`;
    const fragmentSource = `precision mediump float;
      uniform vec2 resolution; uniform vec2 pointer; uniform float time; uniform float level; uniform vec3 tint;
      void main(){
        vec2 uv=gl_FragCoord.xy/resolution; vec2 p=uv*2.0-1.0; p.x*=resolution.x/resolution.y;
        vec2 target=vec2(pointer.x*2.0-1.0,1.0-pointer.y*2.0); target.x*=resolution.x/resolution.y;
        float distanceToPlayer=length(p-target); float ring=sin(distanceToPlayer*19.0-time*1.35);
        float ripple=smoothstep(0.12,0.0,abs(ring)*0.08+abs(distanceToPlayer-0.42-time*0.015));
        float beam=pow(max(0.0,cos(atan(p.y,p.x)+time*0.16)),12.0);
        float halo=smoothstep(0.78,0.0,distanceToPlayer);
        float intensity=(level-1.0)/4.0*(ripple*0.16+beam*0.035+halo*0.018);
        gl_FragColor=vec4(tint*intensity,intensity);
      }`;
    const compile = (type, source) => { const result = gl.createShader(type); gl.shaderSource(result, source); gl.compileShader(result); return gl.getShaderParameter(result, gl.COMPILE_STATUS) ? result : null; };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return;
    const program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    shader = { program, buffer, position: gl.getAttribLocation(program, 'position'), resolution: gl.getUniformLocation(program, 'resolution'), pointer: gl.getUniformLocation(program, 'pointer'), time: gl.getUniformLocation(program, 'time'), level: gl.getUniformLocation(program, 'level'), tint: gl.getUniformLocation(program, 'tint') };
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0);
  };
  const renderShader = (time) => {
    if (!gl || !shader || !shaderCanvas) return;
    const active = state.status === 'playing' && state.level >= 2 && !reducedMotion;
    gl.viewport(0, 0, shaderCanvas.width, shaderCanvas.height); gl.clear(gl.COLOR_BUFFER_BIT);
    if (!active) return;
    gl.useProgram(shader.program); gl.bindBuffer(gl.ARRAY_BUFFER, shader.buffer); gl.enableVertexAttribArray(shader.position); gl.vertexAttribPointer(shader.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(shader.resolution, shaderCanvas.width, shaderCanvas.height); gl.uniform2f(shader.pointer, state.player.x / width, state.player.y / height); gl.uniform1f(shader.time, time / 1000); gl.uniform1f(shader.level, state.level); gl.uniform3fv(shader.tint, hexToRgb(theme.gold)); gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const applyTheme = (name) => {
    if (!THEMES[name]) return;
    themeName = name;
    theme = THEMES[name];
    element.style.setProperty('--orbit-ink', theme.ink);
    element.style.setProperty('--orbit-soft', theme.soft);
    element.style.setProperty('--orbit-gold', theme.gold);
    element.style.setProperty('--orbit-bronze', theme.bronze);
    element.style.setProperty('--orbit-red', theme.red);
    element.style.setProperty('--orbit-red-light', theme.redLight);
    themeButtons.forEach((button) => {
      const active = button.dataset.orbitTheme === themeName;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.dispatchEvent(new CustomEvent('portfolio:ambienttheme', { detail: { theme: name } }));
    announce(`${name} visual field selected.`);
  };
  const announce = (message) => {
    if (liveRegion) liveRegion.textContent = message;
  };
  const updateOverlay = () => {
    if (!overlay || !overlayTitle || !overlayCopy) return;
    const status = state.status;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', String(status === 'playing'));
    overlay.classList.toggle('is-live', status === 'playing');
    if (status === 'idle') {
      overlayTitle.textContent = 'A living signal field';
      overlayCopy.textContent = 'Guide the gold signal through the orbitals. Collect ivory nodes; avoid the red unstable nodes.';
    } else if (status === 'paused') {
      overlayTitle.textContent = 'Signal held';
      overlayCopy.textContent = 'Your momentum is frozen. Resume when you are ready.';
    } else if (status === 'gameover') {
      overlayTitle.textContent = 'Signal window closed';
      overlayCopy.textContent = `Final score ${state.score.toLocaleString()} · best ${Math.max(state.best,state.score).toLocaleString()}. Restart and find a cleaner route.`;
    }
  };
  const updateUI = () => {
    const summary = getOrbitSummary(state);
    if (stateLabel) stateLabel.textContent = summary.status === 'playing' ? 'LIVE' : summary.status.toUpperCase();
    if (scoreLabel) scoreLabel.textContent = String(summary.score).padStart(4, '0');
    if (bestLabel) bestLabel.textContent = String(Math.max(state.best, summary.score)).padStart(4, '0');
    if (comboLabel) comboLabel.textContent = `×${summary.combo || 0}`;
    if (livesLabel) livesLabel.setAttribute('aria-label', `${summary.lives} lives remaining`);
    if (livesLabel) livesLabel.textContent = '●'.repeat(summary.lives) + '○'.repeat(state.maxLives - summary.lives);
    if (levelLabel) levelLabel.textContent = String(summary.level).padStart(2, '0');
    element.querySelector('.orbit-canvas-shell')?.setAttribute('data-level', String(summary.level));
    if (timerLabel) timerLabel.textContent = `${Math.ceil(summary.remaining)}s`;
    if (powerupLabel) {
      const active = Object.entries(summary.effects).find(([, seconds]) => seconds > 0);
      powerupLabel.textContent = active ? `${POWERUP_LABELS[active[0]]} · ${active[1].toFixed(1)}s` : (summary.powerups.length ? `${POWERUP_LABELS[summary.powerups[0].type]} ready` : 'none');
    }
    if (pauseButton) {
      pauseButton.disabled = state.status === 'idle' || state.status === 'gameover';
      pauseButton.textContent = state.status === 'paused' ? 'resume' : 'pause';
      pauseButton.setAttribute('aria-label', state.status === 'paused' ? 'Resume experiment' : 'Pause experiment');
    }
    if (startButton) startButton.textContent = state.status === 'idle' ? 'start experiment' : 'restart experiment';
    updateOverlay();
  };
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(220, rect.width || 720);
    height = Math.max(180, rect.height || 460);
    dpr = Math.min(window.devicePixelRatio || 1, width < 500 ? 1.5 : MAX_DPR);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (shaderCanvas) { shaderCanvas.width = canvas.width; shaderCanvas.height = canvas.height; }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    setOrbitBounds(state, width, height);
  };
  const addParticles = (event) => {
    if (reducedMotion) return;
    const count = (event.type === 'collect' ? 16 : 24) + Math.min(36, Math.max(0, state.level - 1) * 6);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * TAU + Math.random() * 0.25;
      const speed = event.type === 'collect' ? 28 + Math.random() * 70 : 45 + Math.random() * 90;
      particles.push({ x: event.x, y: event.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.5 + Math.random() * 0.45, maxLife: 0.9, size: 1.5 + Math.random() * Math.min(2.8, state.level * .35), color: event.type === 'collect' ? theme.gold : theme.redLight, twist: (Math.random() - .5) * 2 });
    }
    if (particles.length > quality.particleLimit + 80) particles.splice(0, particles.length - quality.particleLimit - 80);
  };
  const ensureAudio = () => {
    if (!soundEnabled) return null;
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      audioContext = new AudioCtor();
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(()=>{soundEnabled=false; if(soundButton){soundButton.textContent='sound off';soundButton.setAttribute('aria-pressed','false');}});
    return audioContext;
  };
  const playTone = ({ frequency, duration = 0.16, type = 'sine', volume = 0.035, slideTo = null, delay = 0 }) => {
    let audio;
    try { audio = ensureAudio(); } catch { soundEnabled = false; return; }
    if (!audio || !soundEnabled) return;
    const start = audio.currentTime + delay;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.018, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.015);
  };
  const playSound = (name, event = {}) => {
    if (!soundEnabled) return;
    if (name === 'start' || name === 'restart') {
      playTone({ frequency: 262, duration: .12, volume: .028 });
      playTone({ frequency: 392, duration: .16, volume: .032, delay: .085 });
      playTone({ frequency: 523, duration: .22, volume: .026, delay: .17 });
    } else if (name === 'pause') {
      playTone({ frequency: 330, duration: .11, type: 'triangle', volume: .026 });
      playTone({ frequency: 220, duration: .16, type: 'triangle', volume: .022, delay: .07 });
    } else if (name === 'resume') {
      playTone({ frequency: 220, duration: .11, type: 'triangle', volume: .022 });
      playTone({ frequency: 330, duration: .16, type: 'triangle', volume: .026, delay: .07 });
    } else if (name === 'collect') {
      const base = 520 + Math.min(420, state.combo * 45);
      playTone({ frequency: base, duration: .14, volume: .035 });
      playTone({ frequency: base * 1.5, duration: .18, volume: .018, delay: .045 });
    } else if (name === 'level') {
      playTone({ frequency: 494, duration: .12, volume: .026 });
      playTone({ frequency: 659, duration: .17, volume: .03, delay: .09 });
      playTone({ frequency: 988, duration: .24, volume: .022, delay: .18 });
    } else if (name === 'hit') {
      playTone({ frequency: 180, slideTo: 74, duration: .24, type: 'sawtooth', volume: .045 });
      playTone({ frequency: 92, slideTo: 48, duration: .28, type: 'triangle', volume: .025, delay: .035 });
    } else if (name === 'powerup') {
      playTone({ frequency: 660, duration: .1, volume: .024 });
      playTone({ frequency: 990, duration: .18, volume: .026, delay: .08 });
    } else if (name === 'shield') {
      playTone({ frequency: 120, slideTo: 420, duration: .22, type: 'square', volume: .025 });
    } else if (name === 'gameover') {
      playTone({ frequency: 330, slideTo: 196, duration: .24, type: 'triangle', volume: .03 });
      playTone({ frequency: 247, slideTo: 147, duration: .3, type: 'triangle', volume: .026, delay: .18 });
      playTone({ frequency: 165, slideTo: 82, duration: .42, type: 'sine', volume: .022, delay: .38 });
    }
    void event;
  };
  const blip = (event) => {
    if (event.type === 'collect') playSound('collect', event);
    if (event.type === 'hit') playSound('hit', event);
  };
  const handleEvents = (events) => {
    events.forEach((event) => {
      if (event.type === 'collect' && !reducedMotion) {
        waves.push({x:event.x,y:event.y,life:1.1,radius:0});
        if(waves.length>8)waves.shift();
      }
      if (event.type === 'collect' || event.type === 'hit') {
        addParticles(event);
        blip(event);
      }
      if (event.type === 'collect') {
        announce(`Collected. ${event.points} points. Combo times ${event.combo}.`);
        if (state.level > lastSoundLevel) { playSound('level', event); lastSoundLevel = state.level; }
      }
      if (event.type === 'level_up') announce(`Level ${event.level}. ${POWERUP_LABELS[event.powerup]} power-up deployed.`);
      if (event.type === 'powerup') { announce(`${POWERUP_LABELS[event.powerup]} activated for ${event.duration} seconds.`); playSound('powerup'); }
      if (event.type === 'shield_break') { announce('Shield absorbed the hull hit.'); playSound('shield'); }
      if (event.type === 'hit') announce(`Hull hit. ${event.lives} lives remaining.`);
      if (event.type === 'gameover') {
        if (state.score > state.best) { state.best = state.score; writeBest(state.best); }
        announce(`Experiment over. Final score ${state.score}. Best score ${state.best}.`);
        playSound('gameover', event);
      }
    });
  };
  const updateParticles = (dt) => {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= dt;
      if (particle.life <= 0) { particles.splice(index, 1); continue; }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-dt*2.1);
      particle.vy *= Math.exp(-dt*2.1);
    }
  };
  const drawPath = (orbital, time, alpha = 0.55) => {
    context.save();
    context.translate(orbital.cx, orbital.cy);
    context.rotate(orbital.rotation + Math.sin(time * 0.22 + orbital.phase) * 0.025);
    context.beginPath();
    context.ellipse(0, 0, orbital.rx, orbital.ry, 0, 0, TAU);
    context.strokeStyle = theme.line;
    context.lineWidth = 0.8;
    context.stroke();
    context.restore();
  };
  const draw = (time) => {
    const gradient = context.createRadialGradient(width * 0.5, height * 0.48, 4, width * 0.5, height * 0.5, Math.max(width, height) * 0.75);
    gradient.addColorStop(0, theme.bg[0]);
    gradient.addColorStop(0.55, theme.bg[1]);
    gradient.addColorStop(1, theme.bg[2]);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.save();
    stars.forEach((star, index) => {
      const drift = reducedMotion ? 0 : Math.sin(time * 0.00015 + index) * 2;
      context.globalAlpha = star.alpha;
      context.fillStyle = index % 4 === 0 ? theme.gold : theme.soft;
      context.beginPath();
      context.arc(star.x * width + drift, star.y * height, star.radius, 0, TAU);
      context.fill();
    });
    context.restore();
    const seconds = reducedMotion ? 0 : time / 1000;
    state.orbitals.forEach((orbital, index) => drawPath(orbital, seconds, 0.35 + index * 0.08 + Math.min(state.combo,8)*.018));
    waves.forEach(wave=>{context.beginPath();context.arc(wave.x,wave.y,wave.radius,0,TAU);context.strokeStyle=theme.line;context.lineWidth=1;context.stroke();});
    context.save();
    context.strokeStyle = theme.line;
    context.lineWidth = 0.6;
    context.setLineDash([2, 8]);
    context.beginPath();
    context.moveTo(width * 0.08, height * 0.82);
    context.quadraticCurveTo(width * 0.47, height * (0.25 + Math.sin(seconds * 0.2) * 0.03), width * 0.92, height * 0.18);
    context.stroke();
    context.restore();
    state.pickups.forEach((pickup) => {
      if (!pickup.active) return;
      const pulse = reducedMotion ? 1 : 1 + Math.sin(pickup.pulse) * 0.18;
      context.save();
      context.shadowColor = theme.gold;
      context.shadowBlur = reducedMotion ? 0 : 13;
      context.fillStyle = theme.gold;
      context.beginPath();
      context.arc(pickup.x, pickup.y, pickup.radius * pulse, 0, TAU);
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = theme.ink;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(pickup.x, pickup.y, pickup.radius * 2.05, 0, TAU);
      context.stroke();
      context.restore();
    });
    state.powerups.forEach((powerup) => {
      if (!powerup.active) return;
      const color = powerup.type === 'shield' ? theme.gold : powerup.type === 'magnet' ? theme.bronze : powerup.type === 'slow' ? theme.soft : theme.ink;
      const pulse = reducedMotion ? 1 : 1 + Math.sin(powerup.pulse) * .16;
      context.save();
      context.translate(powerup.x, powerup.y);
      context.rotate(powerup.pulse * .25);
      context.shadowColor = color;
      context.shadowBlur = reducedMotion ? 0 : 12;
      context.fillStyle = color;
      context.strokeStyle = theme.ink;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, -powerup.radius * pulse);
      context.lineTo(powerup.radius * pulse, 0);
      context.lineTo(0, powerup.radius * pulse);
      context.lineTo(-powerup.radius * pulse, 0);
      context.closePath();
      context.fill(); context.stroke();
      context.restore();
    });
    state.hazards.forEach((hazard) => {
      context.save();
      context.translate(hazard.x, hazard.y);
      context.rotate(seconds * hazard.speed + hazard.phase);
      context.shadowColor = theme.red;
      context.shadowBlur = reducedMotion ? 0 : 10;
      context.fillStyle = theme.red;
      context.strokeStyle = theme.redLight;
      context.lineWidth = 1;
      context.beginPath();
      for (let index = 0; index < 8; index += 1) {
        const radius = index % 2 ? hazard.radius * 0.55 : hazard.radius * 1.35;
        const angle = (index / 8) * TAU;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.closePath();
      context.fill();
      context.stroke();
      context.restore();
    });
    if (!reducedMotion && state.level >= 2 && state.status === 'playing') {
      const intensity = Math.min(1, (state.level - 1) / 4);
      context.save();
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = 0.08 + intensity * 0.06;
      context.strokeStyle = theme.gold;
      context.lineWidth = 1;
      for (let ring = 0; ring < state.level - 1; ring += 1) {
        const radius = 42 + ring * 27 + Math.sin(seconds * 1.8 + ring) * 4;
        context.beginPath(); context.arc(state.player.x, state.player.y, radius, 0, TAU); context.stroke();
      }
      context.globalAlpha = 0.035 + intensity * 0.025;
      for (let beam = 0; beam < 4 + state.level; beam += 1) {
        const angle = seconds * 0.12 + (beam / (4 + state.level)) * TAU;
        context.beginPath(); context.moveTo(state.player.x, state.player.y); context.lineTo(state.player.x + Math.cos(angle) * width, state.player.y + Math.sin(angle) * height); context.stroke();
      }
      context.restore();
    }
    if (!reducedMotion && state.status === 'playing') {
      context.save();
      context.globalAlpha = 0.16;
      context.strokeStyle = theme.gold;
      context.lineWidth = 8;
      context.beginPath();
      context.moveTo(state.player.x - state.player.vx * 0.045, state.player.y - state.player.vy * 0.045);
      context.lineTo(state.player.x, state.player.y);
      context.stroke();
      context.restore();
    }
    particles.forEach((particle) => {
      context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size || 2.1, 0, TAU);
      context.fill();
      if (state.level >= 3) { context.globalAlpha *= .35; context.beginPath(); context.arc(particle.x - particle.vx * .045, particle.y - particle.vy * .045, (particle.size || 2) * 1.8, 0, TAU); context.fill(); }
    });
    context.globalAlpha = 1;
    context.save();
    const playerGlow = context.createRadialGradient(state.player.x, state.player.y, 1, state.player.x, state.player.y, 30);
    playerGlow.addColorStop(0, 'rgba(255,240,190,.78)');
    playerGlow.addColorStop(1, 'rgba(218,170,91,0)');
    context.fillStyle = playerGlow;
    context.beginPath();
    context.arc(state.player.x, state.player.y, 30, 0, TAU);
    context.fill();
    context.shadowColor = '#f2d39a';
    context.shadowBlur = reducedMotion ? 0 : 18;
    context.fillStyle = state.player.hitCooldown > 0 ? theme.redLight : theme.player;
    context.beginPath();
    context.arc(state.player.x, state.player.y, state.player.radius, 0, TAU);
    context.fill();
    context.restore();
    renderShader(time);
  };
  const loop = (time) => {
    if (destroyed || !visible || document.hidden) return;
    const budget = (width < 500 || reducedMotion) && state.status !== 'playing' ? 1000/24 : width < 500 ? 1000/30 : 1000/60;
    if (time-lastPaint < budget-.6) return;
    const dt = lastTime ? Math.min(0.05, (time-lastTime)/1000) : 0;
    lastTime=time; lastPaint=time;
    if(state.status==='playing')handleEvents(advanceOrbit(state,dt,input));
    if(state.status!=='paused') {
      ambience+=dt*1000;
      updateParticles(dt);
      for(let i=waves.length-1;i>=0;i--){waves[i].life-=dt;waves[i].radius+=dt*140;if(waves[i].life<=0)waves.splice(i,1);}
    }
    uiClock += dt;
    draw(ambience);
    if (uiClock >= .12 || state.status !== 'playing') { updateUI(); uiClock = 0; }

  };
  const schedule = () => {
    if (!destroyed && visible && !document.hidden) updateUI();
  };
  const start = () => {
    if (state.status === 'idle') startOrbit(state);
    else restartOrbit(state, { width, height, seed: 243 });
    state.aim=null; Object.keys(input).forEach(k=>input[k]=false);
    particles.length=0; waves.length=0;
    lastTime = 0;
    lastSoundLevel = 1;
    playSound('start');
    announce('Experiment started. Use arrows or WASD, or aim with pointer or touch.');
    updateUI();
    canvas.focus({ preventScroll: true });
    schedule();
  };
  const clearInput = () => {Object.keys(input).forEach(k=>input[k]=false);state.aim=null;};
  const togglePause = () => {
    clearInput();
    if (state.status === 'playing') { pauseOrbit(state); playSound('pause'); }
    else if (state.status === 'paused') { resumeOrbit(state); playSound('resume'); }
    updateUI();
    schedule();
  };
  const restart = () => {
    restartOrbit(state, { width, height, seed: 243 });
    state.aim=null; Object.keys(input).forEach(k=>input[k]=false);
    particles.length=0;waves.length=0;
    lastTime = 0;
    lastSoundLevel = 1;
    playSound('restart');
    announce('New experiment ready.');
    updateUI();
    canvas.focus({ preventScroll: true });
    schedule();
  };
  const pointerAim = (event) => {
    const rect = canvas.getBoundingClientRect();
    setOrbitAim(state, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  themeButtons.forEach((button) => button.addEventListener('click', () => applyTheme(button.dataset.orbitTheme), { signal }));
  startButton?.addEventListener('click', start, { signal });
  pauseButton?.addEventListener('click', togglePause, { signal });
  restartButton?.addEventListener('click', restart, { signal });
  soundButton?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundEnabled) {
      try { if(!ensureAudio())soundEnabled=false; } catch { soundEnabled=false; }
    }
    soundButton.textContent = soundEnabled ? 'sound on' : 'sound off';
    soundButton.setAttribute('aria-pressed', String(soundEnabled));
    announce(soundEnabled ? 'Sound effects enabled.' : 'Sound effects muted.');
  }, { signal });
  canvas.addEventListener('pointermove', pointerAim, { signal });
  canvas.addEventListener('pointerdown', (event) => { pointerAim(event); canvas.setPointerCapture(event.pointerId); canvas.focus({ preventScroll: true }); }, { signal });
  canvas.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    const direction = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' }[key];
    if (direction) { input[direction] = true; event.preventDefault(); }
    if (!event.repeat && (key === 'p' || key === ' ')) { togglePause(); event.preventDefault(); }
  }, { signal });
  canvas.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    const direction = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down' }[key];
    if (direction) { input[direction] = false; event.preventDefault(); }
  }, { signal });
  canvas.addEventListener('blur',()=>{Object.keys(input).forEach(k=>input[k]=false);},{signal});
  window.addEventListener('resize', resize, { signal, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearInput(); if (state.status === 'playing') pauseOrbit(state); }
    else { lastTime = 0; updateUI(); schedule(); }
  }, { signal });
  reducedMotionQuery?.addEventListener?.('change', (event) => { reducedMotion = event.matches; if(reducedMotion){particles.length=0;waves.length=0;} schedule(); }, { signal });
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(canvas);
  const intersectionObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { clearInput(); if(state.status==='playing')pauseOrbit(state); updateUI(); }
    if (visible) { lastTime = 0; schedule(); }
  }, { threshold: 0.08 }) : null;
  intersectionObserver?.observe(element);
  element.querySelector('[data-orbit-source]')?.setAttribute('href', SOURCE_URL);
  applyTheme(themeName);
  resize();
  setupShader();
  updateUI();
  draw(0);
  unsubscribeFrame = subscribeFrame(loop, { label: 'orbit-game', fps: width < 500 ? 30 : 60 });
  schedule();

  return () => {
    if (destroyed) return;
    destroyed = true;
    controller.abort();
    unsubscribeFrame?.();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    if (audioContext) audioContext.close().catch(() => {});
  };
};

export { SOURCE_URL };
