import { initSideRays } from './side-rays.js';

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = window.matchMedia('(max-width: 700px)');

const vantaPalette = (dark) => dark
  ? { backgroundColor: 0x211a15, color: 0xd1ab70 }
  : { backgroundColor: 0xf3eadc, color: 0xb9894d };

const initMotionSystem = () => {
  const mount = document.querySelector('#vantaBackground');
  const lenisCtor = window.Lenis;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  let lenis = null;
  let vanta = null;
  let context = null;
  let tickerHandler = null;
  const destroySideRays = initSideRays();
  const refreshScroll = () => ScrollTrigger?.refresh();
  let destroyed = false;

  const reducedMotion = () => reduceQuery.matches;

  const initVanta = () => {
    if (destroyed || reducedMotion() || !mount || !window.VANTA?.NET || !window.THREE) return;
    try {
      vanta?.destroy();
      vanta = window.VANTA.NET({
        el: mount,
        THREE: window.THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1.5,
        scaleMobile: mobileQuery.matches ? 1.55 : 1.35,
        points: mobileQuery.matches ? 4 : 5,
        maxDistance: mobileQuery.matches ? 15 : 18,
        spacing: mobileQuery.matches ? 27 : 24,
        showDots: false,
        ...vantaPalette(false),
      });
      mount.classList.add('is-ready');
    } catch (error) {
      mount.classList.remove('is-ready');
      vanta = null;
      console.warn('Vanta background unavailable; using the static fallback.', error);
    }
  };

  const updateVantaTheme = (event) => {
    if (!mount || reducedMotion()) return;
    mount.dataset.theme = event.detail?.dark ? 'dark' : 'light';
  };

  if (lenisCtor && !reducedMotion()) {
    try {
      lenis = new lenisCtor({
        autoRaf: false,
        anchors: true,
        allowNestedScroll: false,
        prevent: (node) => Boolean(node.closest?.('[data-lenis-prevent]')) || Boolean(node.closest?.('[data-orbit-game]')),
      });
    } catch (error) {
      console.warn('Lenis unavailable; native scrolling remains enabled.', error);
    }
  }

  if (gsap && ScrollTrigger && !reducedMotion()) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      tickerHandler = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(tickerHandler);
      gsap.ticker.lagSmoothing(0);
    }
    context = gsap.context(() => {
      gsap.utils.toArray('.reveal').forEach((element) => {
        gsap.fromTo(element, { autoAlpha: 0, y: 22 }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.78,
          ease: 'power3.out',
          clearProps: 'transform',
          scrollTrigger: { trigger: element, start: 'top 88%', once: true },
        });
      });
      const heroArt = document.querySelector('.hero-art');
      if (heroArt) {
        gsap.to(heroArt, {
          yPercent: 7,
          ease: 'none',
          scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
        });
      }
      gsap.utils.toArray('.project-card').forEach((card, index) => {
        gsap.fromTo(card, { y: index % 2 ? 18 : 10 }, {
          y: index % 2 ? -8 : -3,
          ease: 'none',
          scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
        });
      });
      gsap.utils.toArray('.section-label').forEach((label) => {
        gsap.fromTo(label, { x: -12 }, {
          x: 0,
          ease: 'none',
          scrollTrigger: { trigger: label, start: 'top 92%', end: 'top 55%', scrub: 0.7 },
        });
      });
    });
  }

  document.addEventListener('portfolio:themechange', updateVantaTheme);
  window.addEventListener('load', refreshScroll, { once: true });
  reduceQuery.addEventListener?.('change', () => {
    if (reducedMotion()) {
      vanta?.destroy();
      vanta = null;
      mount?.classList.remove('is-ready');
      lenis?.stop();
      context?.revert();
    } else if (!destroyed) {
      initVanta();
      ScrollTrigger?.refresh();
    }
  });
  initVanta();

  return () => {
    if (destroyed) return;
    destroyed = true;
    document.removeEventListener('portfolio:themechange', updateVantaTheme);
    window.removeEventListener('load', refreshScroll);
    if (tickerHandler && gsap) gsap.ticker.remove(tickerHandler);
    context?.revert();
    destroySideRays();
    lenis?.destroy();
    vanta?.destroy();
    vanta = null;
    mount?.classList.remove('is-ready');
  };
};

export { initMotionSystem };
