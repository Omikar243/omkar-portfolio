import { buildTree, cloneTree, interpolateTree, quintic, TREE_PROFILES } from './tree-geometry.js';

export function initFractalTree(shell, canvas, button) {
  // An opaque, synchronized surface avoids transparent fast-path corruption on
  // some mobile GPU/browser combinations. Every backing pixel is painted below.
  const ctx = canvas?.getContext('2d', { alpha: false, desynchronized: false });
  if (!shell || !canvas || !button || !ctx) return () => {};
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 640px)');
  const constrainedCPU = (navigator.hardwareConcurrency || 8) <= 4;
  let lowPower = mobileQuery.matches || constrainedCPU;
  // Each power tier has a stable topology; switching tiers rebuilds all poses together.
  let depth = lowPower ? 6 : 7;
  let fps = lowPower ? 30 : 60;
  let ratio = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
  let poses = TREE_PROFILES.map((_, state) => buildTree(state, depth));
  let current = cloneTree(poses[0]);
  let source = cloneTree(current);
  let target = poses[0];
  let state = 0;
  let morphStart = -Infinity;
  const duration = 1600;
  const totalDuration = duration + 9 * 32;
  let width = 0;
  let height = 0;
  let scale = 1;
  let raf = 0;
  let active = false;
  let visible = true;
  let disposed = false;
  let contextLost = false;
  let lastFrame = -Infinity;
  let clock = 0;
  let lastTick = 0;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, hover: 0, targetHover: 0 };
  const listeners = new AbortController();
  let resizeObserver;
  let visibilityObserver;
  const soundButton = shell.querySelector('#treeSoundToggle');
  const geometricO = shell.querySelector('#geometricO');
  const oRound = geometricO?.querySelector('[data-o-round]');
  const oSquare = geometricO?.querySelector('[data-o-square]');
  let soundEnabled = false;
  let audio = null;
  let feedbackAt = -Infinity;
  let feedbackSequence = 0;
  let fromState = 0;
  let leafBuffer = null;
  const rustleVoices = new Set();
  const leafProfiles = [
    { low: 4300, high: 480, length: .84 },
    { low: 4900, high: 650, length: .76 },
    { low: 3900, high: 390, length: .94 },
    { low: 5500, high: 730, length: .88 },
    { low: 4600, high: 560, length: .72 },
  ];

  function fadeRustles() {
    if (!audio || audio.state === 'closed') return;
    for (const voice of rustleVoices) {
      try {
        voice.gain.gain.cancelScheduledValues(audio.currentTime);
        voice.gain.gain.setTargetAtTime(.0001, audio.currentTime, .025);
        voice.source.stop(audio.currentTime + .1);
      } catch { /* A completed source may already be disconnected. */ }
    }
  }

  function makeLeaves() {
    // A cached mono noise texture, not a pitched note or downloaded recording.
    const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 1.15), audio.sampleRate);
    const samples = buffer.getChannelData(0);
    let breeze = 0;
    for (let i = 0; i < samples.length; i++) {
      const time = i / audio.sampleRate;
      const white = Math.random() * 2 - 1;
      breeze = .985 * breeze + .015 * white;
      const flutter = .7 + .12 * Math.sin(time * 23) + .08 * Math.sin(time * 41 + .6);
      samples[i] = (white * .7 + breeze * 1.4) * flutter;
    }
    return buffer;
  }

  function setSound(enabled) {
    soundEnabled = enabled;
    if (!enabled) { feedbackSequence += 1; fadeRustles(); }
    if (!soundButton) return;
    soundButton.setAttribute('aria-pressed', String(enabled));
    soundButton.setAttribute('aria-label', enabled ? 'Mute wind-through-leaves sound' : 'Enable wind-through-leaves sound');
    soundButton.querySelector('[data-tree-sound-label]').textContent = enabled ? 'Leaves on' : 'Leaves off';
  }

  async function signatureFeedback(event) {
    // Only real visitor gestures produce feedback. No autoplay or synthetic tests.
    if (!event?.isTrusted || disposed || performance.now() - feedbackAt < 110) return;
    feedbackAt = performance.now();
    if (!motion.matches && navigator.vibrate) {
      try { navigator.vibrate(8); } catch { /* Not supported on many iOS browsers. */ }
    }
    if (!soundEnabled) return;
    const sequence = ++feedbackSequence;
    const tappedState = state;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) { setSound(false); return; }
      if (!audio || audio.state === 'closed') {
        leafBuffer = null;
        rustleVoices.clear();
        audio = new Audio();
      }
      if (audio.state === 'suspended') await audio.resume();
      if (disposed || !soundEnabled || sequence !== feedbackSequence || audio.state !== 'running') return;
      if (!leafBuffer) leafBuffer = makeLeaves();
      fadeRustles(); // New gust fades the previous one instead of stacking volume.
      if (rustleVoices.size >= 2) return;
      const profile = leafProfiles[tappedState];
      const source = audio.createBufferSource();
      const highPass = audio.createBiquadFilter();
      const lowPass = audio.createBiquadFilter();
      const envelope = audio.createGain();
      const now = audio.currentTime;
      source.buffer = leafBuffer;
      source.playbackRate.value = .93 + tappedState * .025;
      highPass.type = 'highpass';
      highPass.frequency.setValueAtTime(profile.high, now);
      highPass.Q.value = .55;
      lowPass.type = 'lowpass';
      lowPass.Q.value = .45;
      lowPass.frequency.setValueAtTime(profile.low * .62, now);
      lowPass.frequency.linearRampToValueAtTime(profile.low, now + .22);
      lowPass.frequency.linearRampToValueAtTime(profile.low * .7, now + profile.length);
      envelope.gain.setValueAtTime(.0001, now);
      envelope.gain.exponentialRampToValueAtTime(.075, now + .13);
      envelope.gain.exponentialRampToValueAtTime(.042, now + .34);
      envelope.gain.exponentialRampToValueAtTime(.0001, now + profile.length);
      source.connect(highPass).connect(lowPass).connect(envelope).connect(audio.destination);
      const voice = { source, gain: envelope };
      rustleVoices.add(voice);
      source.onended = () => {
        source.disconnect(); highPass.disconnect(); lowPass.disconnect(); envelope.disconnect();
        rustleVoices.delete(voice);
      };
      source.start(now, .02 * tappedState);
      source.stop(now + profile.length + .025);
    } catch { setSound(false); }
  }
  const orbitPaths = [
    { rx: .49, ry: .19, rotation: -.28, speed: .18, alpha: .25, particles: [{ phase: .1, size: 1.8 }, { phase: 3.45, size: 1.1 }] },
    { rx: .39, ry: .31, rotation: .57, speed: -.12, alpha: .3, particles: [{ phase: 1.2, size: 1.5 }, { phase: 4.15, size: .9 }] },
    { rx: .53, ry: .12, rotation: .08, speed: .1, alpha: .22, particles: [{ phase: 2.1, size: 1.25 }] },
    { rx: .3, ry: .44, rotation: -.9, speed: .075, alpha: .2, particles: [{ phase: .35, size: 1.05 }] },
  ];
  const colors = { background: '', branch: '', tip: '', orbit: '', particle: '' };
  const growthLight = new Float32Array(10);
  const listen = (element, event, handler, options = {}) => {
    element.addEventListener(event, handler, { ...options, signal: listeners.signal });
  };

  function updatePalette() {
    const dark = document.body.classList.contains('dark');
    shell.dataset.theme = canvas.dataset.theme = dark ? 'dark' : 'light';
    colors.background = dark ? '#211a15' : '#f5ebdd';
    colors.branch = dark ? '213,175,119' : '130,92,49';
    colors.tip = dark ? 'rgba(225,194,141,.68)' : 'rgba(175,129,64,.53)';
    colors.orbit = dark ? '209,176,121' : '139,102,57';
    colors.particle = dark ? '#debd83' : '#aa814d';
    paint();
  }

  function sample(now) {
    if (morphStart === -Infinity) return;
    interpolateTree(source, target, now - morphStart, duration, current);
    if (now - morphStart >= totalDuration) {
      morphStart = -Infinity;
      shell.dataset.morphing = 'false';
      announceForm(false);
    }
  }

  // One gentle deformation shared by every branch and loop node. No junction drift.
  function point(n) {
    const heightWeight = Math.max(0, .865 - n.y);
    const wind = motion.matches ? 0 : Math.sin(clock * .44) * .0016 * heightWeight;
    return {
      x: width / 2 + (n.x - .5 + pointer.x * .015 * heightWeight + wind) * scale,
      y: height * .53 + (n.y - .53 + pointer.y * .004 * heightWeight) * scale,
    };
  }

  function syncGeometricO(now = performance.now()) {
    if (!geometricO || !oRound || !oSquare || !width || !height) return;
    geometricO.setAttribute('viewBox', `0 0 ${width} ${height}`);
    // Anchor nodes provide placement only. The letterform itself is always a
    // true SVG ellipse or rect, never a procedural curve from the tree graph.
    const lowerLeft = point(current.nodes[2]);
    const lowerRight = point(current.nodes[6]);
    const upperLeft = point(current.nodes[3]);
    const upperRight = point(current.nodes[5]);
    const split = point(current.nodes[1]);
    const reunion = point(current.nodes[4]);
    const cx = (split.x + reunion.x) * .5;
    const cy = (split.y + reunion.y) * .5;
    const rx = Math.max(1, ((lowerRight.x - lowerLeft.x) + (upperRight.x - upperLeft.x)) * .25);
    const top = (upperLeft.y + upperRight.y) * .5;
    const bottom = (lowerLeft.y + lowerRight.y) * .5;
    const ry = Math.max(1, (bottom - top) * .5);
    const shapeT = morphStart === -Infinity
      ? (TREE_PROFILES[state].square >= .5 ? 1 : 0)
      : quintic((now - morphStart - 32) / duration);
    const fromSquare = TREE_PROFILES[fromState].square;
    const toSquare = TREE_PROFILES[state].square;
    const square = fromSquare + (toSquare - fromSquare) * shapeT;
    const roundOpacity = toSquare >= fromSquare ? 1 - shapeT : shapeT;
    const squareOpacity = toSquare >= fromSquare ? shapeT : 1 - shapeT;
    oRound.setAttribute('cx', cx.toFixed(2));
    oRound.setAttribute('cy', cy.toFixed(2));
    oRound.setAttribute('rx', rx.toFixed(2));
    oRound.setAttribute('ry', ry.toFixed(2));
    oRound.style.opacity = String(Math.max(0, Math.min(1, roundOpacity)));
    oSquare.setAttribute('x', (cx - rx).toFixed(2));
    oSquare.setAttribute('y', top.toFixed(2));
    oSquare.setAttribute('width', (rx * 2).toFixed(2));
    oSquare.setAttribute('height', (bottom - top).toFixed(2));
    oSquare.setAttribute('rx', Math.max(2.2, Math.min(rx * .32, ry * (.08 + (1 - square) * .28))).toFixed(2));
    oSquare.style.opacity = String(Math.max(0, Math.min(1, squareOpacity)));
  }

  function paintOrbits() {
    for (const orbit of orbitPaths) {
      const rx = orbit.rx * scale;
      const ry = orbit.ry * scale;
      const cos = Math.cos(orbit.rotation);
      const sin = Math.sin(orbit.rotation);
      ctx.save();
      ctx.translate(width / 2, height * .53);
      ctx.rotate(orbit.rotation);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.lineWidth = .65;
      ctx.strokeStyle = `rgba(${colors.orbit},${orbit.alpha})`;
      if (orbit.alpha < .26) ctx.setLineDash([1.4, 5]);
      ctx.stroke();
      ctx.restore();
      for (const particle of orbit.particles) {
        const phase = particle.phase + clock * orbit.speed;
        const x = Math.cos(phase) * rx;
        const y = Math.sin(phase) * ry;
        ctx.beginPath();
        ctx.arc(width / 2 + x * cos - y * sin, height * .53 + x * sin + y * cos,
          particle.size, 0, Math.PI * 2);
        ctx.fillStyle = colors.particle;
        ctx.fill();
      }
    }
  }

  function paintCircuitDetails() {
    // These traces continue from real twig endpoints; they are not a second
    // illustration layered over the tree. Keep the density intentionally low
    // on mobile so the canopy stays botanical rather than schematic.
    const limit = lowPower ? 12 : 18;
    let drawn = 0;
    ctx.save();
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    for (let i = 0; i < current.tips.length && drawn < limit; i += 1) {
      if ((i + state) % 3 !== 0) continue;
      const tipIndex = current.tips[i];
      const parentEdge = current.edges.find((edge) => edge.b === tipIndex);
      if (!parentEdge) continue;
      const a = current.nodes[parentEdge.a];
      const b = current.nodes[parentEdge.b];
      const start = point(b);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      const ux = dx / length;
      const uy = dy / length;
      const turn = i % 2 ? -1 : 1;
      const bendX = (ux * Math.cos(Math.PI / 4) - turn * uy * Math.sin(Math.PI / 4));
      const bendY = (uy * Math.cos(Math.PI / 4) + turn * ux * Math.sin(Math.PI / 4));
      const first = { x: start.x + ux * scale * .016, y: start.y + uy * scale * .016 };
      const pad = { x: first.x + bendX * scale * .018, y: first.y + bendY * scale * .018 };
      const pulse = motion.matches ? 0 : Math.max(0, Math.sin(clock * 1.35 + i * 1.7)) ** 8;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(first.x, first.y);
      ctx.lineTo(pad.x, pad.y);
      ctx.lineWidth = Math.max(.55, scale * .00145);
      ctx.strokeStyle = `rgba(${colors.branch},${.48 + pulse * .3})`;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, Math.max(1.8, scale * .0058 + pulse * scale * .0024), 0, Math.PI * 2);
      ctx.globalAlpha = .7 + pulse * .3;
      ctx.fillStyle = colors.tip;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, Math.max(.55, scale * .0018), 0, Math.PI * 2);
      ctx.fillStyle = colors.background;
      ctx.fill();
      drawn += 1;
    }
    ctx.restore();
  }

  function paint() {
    if (!width || !height || disposed || contextLost) return;
    // Paint in physical pixels first, including rounded-DPR border pixels.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    paintOrbits();
    syncGeometricO();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const elapsed = performance.now() - morphStart;
    for (let level = 0; level < growthLight.length; level += 1) {
      const progress = (elapsed - level * 45) / 760;
      growthLight[level] = !motion.matches && morphStart !== -Infinity && progress > 0 && progress < 1
        ? Math.sin(progress * Math.PI) : 0;
    }
    // Trunk, canopy and twig edges remain procedural; the precise O is SVG.
    for (const edge of current.edges) {
      const a = current.nodes[edge.a];
      const b = current.nodes[edge.b];
      const start = point(a);
      const end = point(b);
      const control1 = point({ x: a.x + edge.c1x, y: a.y + edge.c1y });
      const control2 = point({ x: b.x + edge.c2x, y: b.y + edge.c2y });
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, end.x, end.y);
      ctx.lineWidth = Math.max(.38, edge.width * scale);
      const alpha = Math.min(1, Math.max(.31, .87 - edge.level * .055)
        + pointer.hover * .035 + growthLight[Math.min(edge.level, 9)] * .13);
      ctx.strokeStyle = `rgba(${colors.branch},${alpha})`;
      ctx.stroke();
    }
    paintCircuitDetails();
    // Terminal particles share the twig endpoint coordinates during every morph.
    ctx.fillStyle = colors.tip;
    ctx.beginPath();
    for (let i = 0; i < current.tips.length; i += 1) {
      const node = current.nodes[current.tips[i]];
      const tip = point(node);
      const radius = (i % 7 === 0 ? .9 : .55) + growthLight[Math.min(node.level, 9)] * .3;
      ctx.moveTo(tip.x + radius, tip.y);
      ctx.arc(tip.x, tip.y, radius, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  function tick(now) {
    if (disposed || !active) return;
    if (now - lastFrame >= 1000 / fps - .5) {
      const dt = lastTick ? Math.min(.06, (now - lastTick) / 1000) : 0;
      lastTick = now;
      lastFrame = now;
      clock += dt; // Never reset on interaction. Pause/resume has no phase jump.
      const smooth = 1 - Math.exp(-dt * 7);
      pointer.x += (pointer.targetX - pointer.x) * smooth;
      pointer.y += (pointer.targetY - pointer.y) * smooth;
      pointer.hover += (pointer.targetHover - pointer.hover) * smooth;
      sample(now);
      paint();
    }
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (active || disposed || contextLost || !visible || document.hidden || motion.matches) return;
    active = true;
    lastTick = 0;
    lastFrame = -Infinity;
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    active = false;
    cancelAnimationFrame(raf);
    raf = 0;
    lastTick = 0;
  }
  function pause() {
    stop();
    feedbackSequence += 1;
    fadeRustles();
  }
  function resize() {
    const bounds = shell.getBoundingClientRect();
    const nextLowPower = mobileQuery.matches || constrainedCPU;
    if (nextLowPower !== lowPower) {
      lowPower = nextLowPower;
      depth = lowPower ? 6 : 7;
      poses = TREE_PROFILES.map((_, poseState) => buildTree(poseState, depth));
      current = cloneTree(poses[state]);
      source = cloneTree(current);
      target = poses[state];
      morphStart = -Infinity;
      shell.dataset.morphing = 'false';
      canvas.dataset.branchCount = String(current.edges.length);
      announceForm(false);
    }
    fps = lowPower ? 30 : 60;
    const nextRatio = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
    canvas.dataset.renderTier = lowPower ? 'mobile-30fps' : 'desktop-60fps';
    if (width === bounds.width && height === bounds.height && ratio === nextRatio) return;
    ratio = nextRatio;
    width = bounds.width;
    height = bounds.height;
    scale = Math.min(width, height) * .96;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    canvas.dataset.branchCount = String(current.edges.length);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint();
  }

  function announceForm(morphing) {
    const name = TREE_PROFILES[state].name;
    button.setAttribute('aria-label', `Morph the fractal tree. ${morphing ? 'Transforming into' : 'Current form'}: ${name}.`);
    const status = shell.querySelector('#treeStatus');
    if (status) status.textContent = `${morphing ? 'Growing into' : 'Current form:'} ${name}. Form ${state + 1} of ${poses.length}.`;
    const hint = shell.querySelector('#glyphHint');
    if (hint) hint.textContent = `tap the tree · form ${state + 1} / ${poses.length}`;
  }

  function advance(event) {
    const now = performance.now();
    sample(now); // Exact currently interpolated node/control geometry, even mid-morph.
    source = cloneTree(current);
    fromState = state;
    state = (state + 1) % poses.length;
    target = poses[state];
    morphStart = now;
    shell.dataset.morphing = 'true';
    button.dataset.state = String(state);
    announceForm(true);
    signatureFeedback(event);
    if (motion.matches) {
      current = cloneTree(target);
      morphStart = -Infinity;
      shell.dataset.morphing = 'false';
      announceForm(false);
      paint();
    } else start();
  }

  function motionChanged() {
    if (motion.matches) {
      stop();
      current = cloneTree(target);
      morphStart = -Infinity;
      pointer.x = 0; pointer.y = 0; pointer.hover = 0;
      pointer.targetX = 0; pointer.targetY = 0; pointer.targetHover = 0;
      shell.dataset.morphing = 'false';
      announceForm(false);
      paint();
    } else start();
  }
  if (soundButton) listen(soundButton, 'click', () => { setSound(!soundEnabled); });
  listen(button, 'click', advance);
  listen(button, 'keydown', (event) => {
    if (!event.repeat && ['ArrowRight', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      advance(event);
    }
  });
  listen(shell, 'pointermove', (event) => {
    if (motion.matches || event.pointerType === 'touch') return;
    const rect = shell.getBoundingClientRect();
    pointer.targetX = (event.clientX - rect.left) / rect.width - .5;
    pointer.targetY = (event.clientY - rect.top) / rect.height - .5;
  }, { passive: true });
  listen(shell, 'pointerenter', () => { pointer.targetHover = 1; });
  listen(shell, 'pointerleave', () => {
    pointer.targetX = 0; pointer.targetY = 0; pointer.targetHover = 0;
  });
  listen(document, 'portfolio:themechange', updatePalette);
  listen(motion, 'change', motionChanged);
  listen(mobileQuery, 'change', resize);
  listen(window, 'resize', resize, { passive: true });
  listen(canvas, 'contextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    pause();
  });
  listen(canvas, 'contextrestored', () => {
    contextLost = false;
    sample(performance.now());
    updatePalette();
    start();
  });
  listen(document, 'visibilitychange', () => { if (document.hidden) pause(); else start(); });
  // Page cache pauses instead of disposing; permanent navigation releases resources.
  listen(window, 'pagehide', (event) => { if (event.persisted) pause(); else destroy(); });
  listen(window, 'pageshow', start);
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell);
  }
  if ('IntersectionObserver' in window) {
    visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { sample(performance.now()); paint(); start(); } else pause();
    }, { threshold: .02 });
    visibilityObserver.observe(shell);
  }
  function destroy() {
    if (disposed) return;
    stop();
    disposed = true;
    listeners.abort();
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    fadeRustles();
    leafBuffer = null;
    if (audio && audio.state !== 'closed') audio.close().catch(() => {});
  }
  canvas.dataset.renderTier = lowPower ? 'mobile-30fps' : 'desktop-60fps';
  canvas.dataset.branchCount = String(current.edges.length);
  canvas.dataset.surface = 'opaque-synchronized';
  announceForm(false);
  updatePalette();
  resize();
  start();
  return destroy;
}
