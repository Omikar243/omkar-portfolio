const subscribers = new Set();
let raf = 0;
let running = false;

const pump = (time) => {
  raf = 0;
  if (document.hidden) return;
  subscribers.forEach((subscriber) => {
    try { subscriber(time); } catch (error) { console.warn('Animation subscriber failed.', error); }
  });
  if (subscribers.size && !document.hidden) raf = requestAnimationFrame(pump);
};

const ensure = () => {
  if (!running && subscribers.size && !document.hidden) {
    running = true;
    raf = requestAnimationFrame((time) => {
      running = false;
      pump(time);
    });
  }
};

const subscribeFrame = (subscriber) => {
  subscribers.add(subscriber);
  ensure();
  return () => {
    subscribers.delete(subscriber);
    if (!subscribers.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
};

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) ensure();
});

const hasCoarsePointer = () => matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
const getQualityTier = () => {
  const touch = hasCoarsePointer();
  const narrow = matchMedia('(max-width: 700px)').matches;
  const constrained = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  if (touch || narrow || constrained) return { name: 'mobile', fps: 30, dpr: 1.5, treeDepth: 6, rayCount: 8, particleLimit: 80, vanta: false };
  return { name: 'desktop', fps: 60, dpr: 2, treeDepth: 7, rayCount: 12, particleLimit: 220, vanta: true };
};

export { subscribeFrame, hasCoarsePointer, getQualityTier };
