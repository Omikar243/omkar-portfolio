import { initSideRays } from './side-rays.js';
import { hasCoarsePointer, getQualityTier } from './frame-scheduler.js';

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = window.matchMedia('(max-width: 700px)');

const vantaPalette = (dark) => dark
  ? { backgroundColor: 0x211a15, color: 0xd1ab70 }
  : { backgroundColor: 0xf3eadc, color: 0xb9894d };

const initMotionSystem = () => {
  const mount = document.querySelector('#vantaBackground');
  const quality = getQualityTier();
  const touchDevice = hasCoarsePointer();
  const reducedMotion = () => reduceQuery.matches;
  let lenis = null;
  let vanta = null;
  let context = null;
  let tickerHandler = null;
  let destroyed = false;
  let librariesLoaded = false;
  let vantaRequested = false;
  const destroySideRays = initSideRays();
  const refreshScroll = () => window.ScrollTrigger?.refresh();

  const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-lazy-src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src; script.async = true; script.dataset.lazySrc = src;
    script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
  });

  const initVanta = () => {
    if (destroyed || reducedMotion() || touchDevice || !quality.vanta || !mount || !window.VANTA?.NET || !window.THREE) return;
    try {
      vanta?.destroy();
      vanta = window.VANTA.NET({ el: mount, THREE: window.THREE, mouseControls: true, touchControls: false, gyroControls: false,
        minHeight: 200, minWidth: 200, scale: 1.5, scaleMobile: 1.2, points: 5, maxDistance: 18, spacing: 24, showDots: false, ...vantaPalette(false) });
      mount.classList.add('is-ready');
    } catch (error) { mount.classList.remove('is-ready'); vanta = null; console.warn('Vanta fallback active.', error); }
  };

  const requestVanta = () => {
    if (vantaRequested || destroyed || reducedMotion() || touchDevice || !quality.vanta || !mount) return;
    vantaRequested = true;
    const boot = () => loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js')
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js'))
      .then(initVanta).catch(() => mount.classList.remove('is-ready'));
    if ('requestIdleCallback' in window) window.requestIdleCallback(boot, { timeout: 2500 }); else window.setTimeout(boot, 900);
  };

  const activateScrollMotion = () => {
    if (librariesLoaded || destroyed || reducedMotion() || touchDevice) return;
    const Lenis = window.Lenis;
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    librariesLoaded = true;
    if (Lenis) {
      try { lenis = new Lenis({ autoRaf: false, anchors: true, allowNestedScroll: false, lerp: .085, smoothWheel: true,
        prevent: (node) => Boolean(node.closest?.('[data-lenis-prevent]')) || Boolean(node.closest?.('[data-orbit-game]')) }); }
      catch (error) { console.warn('Lenis unavailable; native scrolling remains enabled.', error); }
    }
    if (!(gsap && ScrollTrigger)) return;
    gsap.registerPlugin(ScrollTrigger);
    document.body.dataset.scene = 'hero';
    if (lenis) { lenis.on('scroll', ScrollTrigger.update); tickerHandler = (time) => lenis.raf(time * 1000); gsap.ticker.add(tickerHandler); gsap.ticker.lagSmoothing(0); }
    context = gsap.context(() => {
      const setScene = (scene) => { document.body.dataset.scene = scene; document.querySelector('#heroVisual')?.setAttribute('data-scene', scene); };
      gsap.utils.toArray('main > section[id]').forEach((section) => ScrollTrigger.create({ trigger: section, start: 'top 58%', end: 'bottom 42%', onEnter: () => setScene(section.id), onEnterBack: () => setScene(section.id) }));
      gsap.utils.toArray('.reveal').forEach((element) => gsap.fromTo(element, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: .94, ease: 'power2.out', clearProps: 'transform', scrollTrigger: { trigger: element, start: 'top 91%', once: true, fastScrollEnd: true } }));
      const heroArt = document.querySelector('.hero-art');
      if (heroArt) gsap.to(heroArt, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: .62 } });
      gsap.utils.toArray('.project-card').forEach((card, index) => gsap.fromTo(card, { '--card-depth-y': `${index % 2 ? 18 : 10}px` }, { '--card-depth-y': `${index % 2 ? -8 : -3}px`, ease: 'none', scrollTrigger: { trigger: card, start: 'top 96%', end: 'bottom 12%', scrub: .82 } }));
      gsap.utils.toArray('.section-label').forEach((label) => gsap.fromTo(label, { x: -12 }, { x: 0, ease: 'none', scrollTrigger: { trigger: label, start: 'top 94%', end: 'top 58%', scrub: .52 } }));
    });
    refreshScroll();
  };

  const scheduleLibraries = () => {
    if (destroyed || reducedMotion() || touchDevice || librariesLoaded) return;
    const boot = () => Promise.all([
      loadScript('https://unpkg.com/lenis@1.3.27/dist/lenis.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js'),
    ]).then(activateScrollMotion).catch(() => {});
    if ('requestIdleCallback' in window) window.requestIdleCallback(boot, { timeout: 6500 }); else window.setTimeout(boot, 6500);
  };

  const updateVantaTheme = (event) => { if (mount && !reducedMotion()) mount.dataset.theme = event.detail?.dark ? 'dark' : 'light'; };
  document.addEventListener('portfolio:themechange', updateVantaTheme);
  if (!touchDevice) {
    window.addEventListener('load', scheduleLibraries, { once: true });
    window.addEventListener('pointerdown', requestVanta, { once: true, passive: true });
  }
  window.addEventListener('load', refreshScroll, { once: true });
  reduceQuery.addEventListener?.('change', () => { if (reducedMotion()) { vanta?.destroy(); vanta = null; mount?.classList.remove('is-ready'); lenis?.stop(); context?.revert(); } else if (!destroyed) scheduleLibraries(); });

  return () => {
    if (destroyed) return;
    destroyed = true;
    document.removeEventListener('portfolio:themechange', updateVantaTheme);
    window.removeEventListener('load', scheduleLibraries);
    window.removeEventListener('load', refreshScroll);
    window.removeEventListener('pointerdown', requestVanta);
    if (tickerHandler && window.gsap) window.gsap.ticker.remove(tickerHandler);
    context?.revert(); lenis?.destroy(); vanta?.destroy();
    destroySideRays(); mount?.classList.remove('is-ready');
  };
};

export { initMotionSystem };
