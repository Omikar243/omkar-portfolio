import { buildTree, cloneTree, interpolateTree, TREE_PROFILES } from './tree-geometry.js';

export function initFractalTree(shell, canvas, button) {
  const ctx = canvas?.getContext('2d', { alpha: true, desynchronized: true });
  if (!shell || !canvas || !button || !ctx) return () => {};
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = window.matchMedia('(max-width: 640px)');
  const constrainedCPU = (navigator.hardwareConcurrency || 8) <= 4;
  let lowPower = mobileQuery.matches || constrainedCPU;
  // Fixed lifetime topology prevents twigs popping on orientation/breakpoint changes.
  const depth = lowPower ? 6 : 7;
  let fps = lowPower ? 30 : 60;
  let ratio = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
  const poses = TREE_PROFILES.map((_, state) => buildTree(state, depth));
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
  let lastFrame = -Infinity;
  let clock = 0;
  let lastTick = 0;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, hover: 0, targetHover: 0 };
  const listeners = new AbortController();
  let resizeObserver;
  let visibilityObserver;
  const orbitPaths = [
    { rx: .49, ry: .19, rotation: -.28, speed: .18, alpha: .25, particles: [{ phase: .1, size: 1.8 }, { phase: 3.45, size: 1.1 }] },
    { rx: .39, ry: .31, rotation: .57, speed: -.12, alpha: .3, particles: [{ phase: 1.2, size: 1.5 }, { phase: 4.15, size: .9 }] },
    { rx: .53, ry: .12, rotation: .08, speed: .1, alpha: .22, particles: [{ phase: 2.1, size: 1.25 }] },
    { rx: .3, ry: .44, rotation: -.9, speed: .075, alpha: .2, particles: [{ phase: .35, size: 1.05 }] },
  ];
  const colors = { branch: '', tip: '', orbit: '', particle: '' };
  const listen = (element, event, handler, options = {}) => {
    element.addEventListener(event, handler, { ...options, signal: listeners.signal });
  };

  function updatePalette() {
    const dark = document.body.classList.contains('dark');
    shell.dataset.theme = canvas.dataset.theme = dark ? 'dark' : 'light';
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

  function paint() {
    if (!width || !height || disposed) return;
    ctx.clearRect(0, 0, width, height);
    paintOrbits();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // All trunk, O-limb, canopy and twig edges use the same procedural graph.
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
      const alpha = Math.max(.31, .87 - edge.level * .055) + pointer.hover * .035;
      ctx.strokeStyle = `rgba(${colors.branch},${alpha})`;
      ctx.stroke();
    }
    // Terminal particles share the twig endpoint coordinates during every morph.
    ctx.fillStyle = colors.tip;
    ctx.beginPath();
    for (let i = 0; i < current.tips.length; i += 1) {
      const tip = point(current.nodes[current.tips[i]]);
      const radius = i % 7 === 0 ? .9 : .55;
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
    if (active || disposed || !visible || document.hidden || motion.matches) return;
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
  function resize() {
    const bounds = shell.getBoundingClientRect();
    lowPower = mobileQuery.matches || constrainedCPU;
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

  function advance() {
    const now = performance.now();
    sample(now); // Exact currently interpolated node/control geometry, even mid-morph.
    source = cloneTree(current);
    state = (state + 1) % poses.length;
    target = poses[state];
    morphStart = now;
    shell.dataset.morphing = 'true';
    button.dataset.state = String(state);
    announceForm(true);
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
  listen(button, 'click', advance);
  listen(button, 'keydown', (event) => {
    if (!event.repeat && ['ArrowRight', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      advance();
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
  listen(document, 'visibilitychange', () => { if (document.hidden) stop(); else start(); });
  // Page cache pauses instead of disposing; permanent navigation releases resources.
  listen(window, 'pagehide', (event) => { if (event.persisted) stop(); else destroy(); });
  listen(window, 'pageshow', start);
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell);
  }
  if ('IntersectionObserver' in window) {
    visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) { sample(performance.now()); paint(); start(); } else stop();
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
  }
  canvas.dataset.renderTier = lowPower ? 'mobile-30fps' : 'desktop-60fps';
  canvas.dataset.branchCount = String(current.edges.length);
  announceForm(false);
  updatePalette();
  resize();
  start();
  return destroy;
}
