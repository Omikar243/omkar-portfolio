import { subscribeFrame, getQualityTier } from './frame-scheduler.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const initSideRays = () => {
  const mount = document.querySelector('#sideRaysBackground');
  if (!mount) return () => {};

  const canvas = document.createElement('canvas');
  canvas.className = 'side-rays-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  mount.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => canvas.remove();

  const heroShell = document.querySelector('#heroVisual');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 700px)');
  const quality = getQualityTier();
  const pointer = { x: .68, y: .34, targetX: .68, targetY: .34 };
  const rayCount = quality.rayCount;
  const raySeeds = Array.from({ length: rayCount }, (_, index) => ({
    phase: index * 1.73 + .4,
    width: .045 + (index % 4) * .012,
    alpha: .22 + (index % 5) * .025,
  }));
  let width = 0;
  let height = 0;
  let ratio = 1;
  let disposed = false;
  let pulse = 0;
  let lastTime = 0;
  let lastDraw = -Infinity;

  const resizeCanvas = (target, targetCtx, nextWidth, nextHeight, maxRatio) => {
    const nextRatio = Math.min(window.devicePixelRatio || 1, maxRatio);
    target.width = Math.max(1, Math.round(nextWidth * nextRatio));
    target.height = Math.max(1, Math.round(nextHeight * nextRatio));
    target.style.width = `${nextWidth}px`;
    target.style.height = `${nextHeight}px`;
    targetCtx.setTransform(nextRatio, 0, 0, nextRatio, 0, 0);
    return nextRatio;
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    ratio = resizeCanvas(canvas, ctx, width, height, mobile.matches ? 1.25 : 1.6);
    draw(performance.now());
  };

  const colors = () => document.body.classList.contains('dark')
    ? { first: [224, 190, 131], second: [151, 119, 80], glow: [220, 181, 116] }
    : { first: [191, 143, 79], second: [143, 103, 58], glow: [218, 170, 96] };

  const drawRay = (targetCtx, originX, originY, angle, length, ray, focus, palette, strength = 1) => {
    const endX = originX + Math.cos(angle) * length;
    const endY = originY + Math.sin(angle) * length;
    const halfWidth = length * ray.width * (.9 + focus * .28) * strength;
    const normalX = Math.cos(angle + Math.PI / 2) * halfWidth;
    const normalY = Math.sin(angle + Math.PI / 2) * halfWidth;
    const gradient = targetCtx.createLinearGradient(originX, originY, endX, endY);
    const boost = 1 + pulse * .8;
    const alpha = clamp(ray.alpha * boost * (0.72 + focus * .34) * strength, .035, .44);
    gradient.addColorStop(0, `rgba(${palette.glow.join(',')},${alpha * .04})`);
    gradient.addColorStop(.12, `rgba(${palette.first.join(',')},${alpha})`);
    gradient.addColorStop(.52, `rgba(${palette.second.join(',')},${alpha * .28})`);
    gradient.addColorStop(1, `rgba(${palette.second.join(',')},0)`);
    targetCtx.beginPath();
    targetCtx.moveTo(originX, originY);
    targetCtx.lineTo(endX + normalX, endY + normalY);
    targetCtx.lineTo(endX - normalX, endY - normalY);
    targetCtx.closePath();
    targetCtx.fillStyle = gradient;
    targetCtx.fill();
  };

  const paintRays = (targetCtx, targetWidth, targetHeight, targetRatio, target, spread, strength, palette, time, originOverride, angleOverride) => {
    targetCtx.setTransform(targetRatio, 0, 0, targetRatio, 0, 0);
    targetCtx.clearRect(0, 0, targetWidth, targetHeight);
    const dark = document.body.classList.contains('dark');
    targetCtx.globalCompositeOperation = dark ? 'screen' : 'multiply';

    const originX = originOverride?.x ?? targetWidth * (.98 - (pointer.x - .5) * .045);
    const originY = originOverride?.y ?? -targetHeight * (.04 + (pointer.y - .5) * .025);
    const glowRadius = Math.max(targetWidth, targetHeight) * (target.isHero ? .64 : .52);
    const glow = targetCtx.createRadialGradient(originX, originY, 0, originX, originY, glowRadius);
    const glowAlpha = dark ? .17 : .11;
    glow.addColorStop(0, `rgba(${palette.glow.join(',')},${glowAlpha + pulse * .11})`);
    glow.addColorStop(.16, `rgba(${palette.first.join(',')},${glowAlpha * .34 + pulse * .04})`);
    glow.addColorStop(1, `rgba(${palette.first.join(',')},0)`);
    targetCtx.fillStyle = glow;
    targetCtx.fillRect(0, 0, targetWidth, targetHeight);

    const centerAngle = angleOverride ?? Math.atan2(target.targetY - originY, target.targetX - originX);
    const length = Math.hypot(targetWidth, targetHeight) * (target.isHero ? 1.3 : 1.42);
    raySeeds.forEach((ray, index) => {
      const normalized = raySeeds.length === 1 ? 0 : index / (raySeeds.length - 1) - .5;
      // Layered, deterministic noise makes each shaft flow like light through water
      // while the shared origin/axis keeps the composition aligned with the tree.
      const flow = reduceMotion.matches ? 0 : Math.sin(time * .00062 + ray.phase * 1.7) * .012
        + Math.sin(time * .00031 + ray.phase * 2.9) * .008
        + Math.sin(time * .0011 + ray.phase * .43) * .003;
      const sway = reduceMotion.matches ? 0 : Math.sin(time * .00018 + ray.phase) * .034
        + Math.sin(time * .000095 + ray.phase * .7) * .018 + flow;
      const angle = centerAngle + normalized * spread + sway + (pointer.y - .5) * .035;
      const focus = 1 - clamp(Math.abs(index / (raySeeds.length - 1) - pointer.x) * 1.6, 0, 1);
      const flowingRay = { ...ray, width: ray.width * (1 + flow * 1.8), alpha: ray.alpha * (1 + flow * 2.2) };
      drawRay(targetCtx, originX, originY, angle, length * (1 + flow * .8), flowingRay, focus, palette, strength);
    });
    targetCtx.globalCompositeOperation = 'source-over';
  };

  function draw(time) {
    if (disposed || !width || !height) return;
    const frameBudget = mobile.matches ? 1000 / 30 : 1000 / 60;
    if (!reduceMotion.matches && time - lastDraw < frameBudget) return;
    const elapsed = time - lastTime;
    lastTime = time;
    lastDraw = time;
    if (!reduceMotion.matches) {
      pointer.x += (pointer.targetX - pointer.x) * .035;
      pointer.y += (pointer.targetY - pointer.y) * .035;
      pulse = Math.max(0, pulse - Math.max(elapsed, 16) * .0011);
    }
    const palette = colors();
    const heroRect = heroShell?.getBoundingClientRect();
    const heroTargetX = heroRect?.width ? clamp(heroRect.left + heroRect.width * .52, width * .2, width * .8) : width * .52;
    const heroTargetY = heroRect?.height ? clamp(heroRect.top + heroRect.height * .44, height * .22, height * .68) : height * .46;
    const pageOrigin = {
      x: width * (.98 - (pointer.x - .5) * .045),
      y: -height * (.04 + (pointer.y - .5) * .025),
    };
    const sharedAngle = Math.atan2(heroTargetY - pageOrigin.y, heroTargetX - pageOrigin.x);
    paintRays(ctx, width, height, ratio, { targetX: heroTargetX, targetY: heroTargetY, isHero: false }, mobile.matches ? .82 : .98, 1, palette, time, pageOrigin, sharedAngle);
  }

  const move = (event) => {
    pointer.targetX = clamp(event.clientX / Math.max(window.innerWidth, 1), 0, 1);
    pointer.targetY = clamp(event.clientY / Math.max(window.innerHeight, 1), 0, 1);
  };
  const touch = () => { pulse = 1; };
  const visibility = () => {
    if (!document.hidden && !reduceMotion.matches) draw(performance.now());
  };
  const reducedChanged = () => {
    draw(performance.now());
  };
  const themeChanged = () => draw(performance.now());

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerdown', touch, { passive: true });
  document.addEventListener('visibilitychange', visibility);
  document.addEventListener('portfolio:themechange', themeChanged);
  reduceMotion.addEventListener?.('change', reducedChanged);
  resize();
  mount.classList.add('is-ready');
  const unsubscribe = subscribeFrame(draw);

  return () => {
    disposed = true;
    unsubscribe();
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerdown', touch);
    document.removeEventListener('visibilitychange', visibility);
    document.removeEventListener('portfolio:themechange', themeChanged);
    reduceMotion.removeEventListener?.('change', reducedChanged);
    canvas.remove();
    mount.classList.remove('is-ready');
  };
};

export { initSideRays };
