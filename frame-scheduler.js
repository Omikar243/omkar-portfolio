const subscribers = new Set();
const metadata = new Map();
const profileEnabled = new URLSearchParams(location.search).has('profile');
let raf = 0;
let running = false;

const pump = (time) => {
  raf = 0;
  if (document.hidden) return;
  subscribers.forEach((subscriber) => {
    const info = metadata.get(subscriber) || {};
    if (info.minInterval && time - (info.lastTime || -Infinity) < info.minInterval) return;
    info.lastTime = time;
    const start = profileEnabled ? performance.now() : 0;
    try { subscriber(time); } catch (error) { console.warn('Animation subscriber failed.', error); }
    if (profileEnabled) performance.measure(`scheduler:${info.label || subscriber.name || 'anonymous'}`, { start, end: performance.now() });
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

const subscribeFrame = (subscriber, options = {}) => {
  subscribers.add(subscriber);
  metadata.set(subscriber, { label: options.label, minInterval: options.fps ? 1000 / options.fps : 0, lastTime: -Infinity });
  ensure();
  return () => {
    subscribers.delete(subscriber);
    metadata.delete(subscriber);
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
