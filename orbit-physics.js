const TAU = Math.PI * 2;
const MAX_DT = 0.25;
const SUBSTEP = 1 / 120;
const DEFAULT_WIDTH = 720;
const DEFAULT_HEIGHT = 460;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distanceSquared = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

const seeded = (seed) => {
  let value = (Number(seed) >>> 0) || 0x9e3779b9;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
};

const makeOrbitalNetwork = (width, height) => {
  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height);
  return [
    { cx, cy, rx: scale * 0.32, ry: scale * 0.13, rotation: -0.22, speed: 0.18, phase: 0.8 },
    { cx, cy, rx: scale * 0.18, ry: scale * 0.34, rotation: 0.55, speed: -0.12, phase: 2.4 },
    { cx, cy, rx: scale * 0.41, ry: scale * 0.27, rotation: 0.08, speed: 0.075, phase: 4.1 },
  ];
};

const safePoint = (state, random, index, hazard = false) => {
  const margin = 38;
  const width = state.bounds.width;
  const height = state.bounds.height;
  const angle = random() * TAU + index * 1.71;
  const radius = Math.min(width, height) * (hazard ? 0.2 + random() * 0.26 : 0.16 + random() * 0.34);
  const x = clamp(width / 2 + Math.cos(angle) * radius, margin, width - margin);
  const y = clamp(height / 2 + Math.sin(angle) * radius * 0.78, margin, height - margin);
  return { x, y };
};

const buildField = (state) => {
  const random = seeded(state.seed);
  const pickupCount = 7;
  const hazardCount = 3;
  state.pickups = Array.from({ length: pickupCount }, (_, index) => {
    const point = safePoint(state, random, index);
    return { id: index, x: point.x, y: point.y, radius: 6, active: true, pulse: random() * TAU };
  });
  state.hazards = Array.from({ length: hazardCount }, (_, index) => {
    const point = safePoint(state, random, index + 4, true);
    return {
      id: index,
      x: point.x,
      y: point.y,
      radius: 12,
      angle: random() * TAU,
      orbitRadius: Math.min(state.bounds.width, state.bounds.height) * (0.16 + random() * 0.17),
      speed: (0.45 + random() * 0.55) * (index % 2 ? -1 : 1),
      phase: random() * TAU,
      active: true,
    };
  });
};

const createOrbitState = ({ width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, seed = 243 } = {}) => {
  const state = {
    status: 'idle',
    elapsed: 0,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    level: 1,
    lives: 3,
    maxLives: 3,
    width: 0,
    seed,
    bounds: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
    player: { x: 0, y: 0, vx: 0, vy: 0, radius: 9, hitCooldown: 0 },
    pickups: [],
    hazards: [],
    orbitals: [],
    respawnQueue: [],
    spawnClock: 0,
    lastEvent: null,
  };
  resetOrbitState(state, { width, height, seed });
  return state;
};

const resetOrbitState = (state, { width = state.bounds.width, height = state.bounds.height, seed = state.seed } = {}) => {
  state.status = 'idle';
  state.elapsed = 0;
  state.score = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.level = 1;
  state.lives = state.maxLives || 3;
  state.seed = seed;
  state.bounds.width = Math.max(220, Number(width) || DEFAULT_WIDTH);
  state.bounds.height = Math.max(180, Number(height) || DEFAULT_HEIGHT);
  state.player.x = state.bounds.width / 2;
  state.player.y = state.bounds.height / 2;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.hitCooldown = 0;
  state.orbitals = makeOrbitalNetwork(state.bounds.width, state.bounds.height);
  state.baseOrbitals = makeOrbitalNetwork(state.bounds.width, state.bounds.height);
  state.respawnQueue = [];
  state.spawnClock = 0;
  state.lastEvent = null;
  state.aim = null;
  state.highestRoute = 0;
  buildField(state);
  return state;
};

const setOrbitBounds = (state, width, height) => {
  const oldWidth = state.bounds.width || DEFAULT_WIDTH;
  const oldHeight = state.bounds.height || DEFAULT_HEIGHT;
  const nextWidth = Math.max(220, Number(width) || oldWidth);
  const nextHeight = Math.max(180, Number(height) || oldHeight);
  const sx = nextWidth / oldWidth;
  const sy = nextHeight / oldHeight;
  state.bounds.width = nextWidth;
  state.bounds.height = nextHeight;
  state.player.x *= sx;
  state.player.y *= sy;
  state.pickups.forEach((pickup) => { pickup.x *= sx; pickup.y *= sy; });
  state.hazards.forEach((hazard) => { hazard.x *= sx; hazard.y *= sy; hazard.orbitRadius *= Math.min(nextWidth,nextHeight)/Math.min(oldWidth,oldHeight); });
  if (state.aim) { state.aim.x *= sx; state.aim.y *= sy; }
  state.orbitals = makeOrbitalNetwork(nextWidth, nextHeight);
  state.baseOrbitals = makeOrbitalNetwork(nextWidth, nextHeight);
  state.player.x = clamp(state.player.x, state.player.radius, nextWidth - state.player.radius);
  state.player.y = clamp(state.player.y, state.player.radius, nextHeight - state.player.radius);
  return state;
};

const startOrbit = (state) => {
  if (state.status === 'gameover') resetOrbitState(state);
  if (state.status === 'idle' || state.status === 'paused') state.status = 'playing';
  return state;
};

const pauseOrbit = (state) => {
  if (state.status === 'playing') state.status = 'paused';
  return state;
};

const resumeOrbit = (state) => {
  if (state.status === 'paused') state.status = 'playing';
  return state;
};

const restartOrbit = (state, options = {}) => {
  resetOrbitState(state, options);
  state.status = 'playing';
  return state;
};

const setOrbitAim = (state, aim) => {
  if (!aim || !Number.isFinite(aim.x) || !Number.isFinite(aim.y)) return state;
  state.aim = {
    x: clamp(aim.x, 0, state.bounds.width),
    y: clamp(aim.y, 0, state.bounds.height),
  };
  return state;
};

const emit = (events, type, payload = {}) => events.push({ type, ...payload });

const respawnPickup = (state, pickup, index) => {
  const random = seeded((state.seed + state.score + state.elapsed * 1000 + index * 991) | 0);
  const point = safePoint(state, random, index + state.level);
  pickup.x = point.x;
  pickup.y = point.y;
  pickup.active = true;
  pickup.pulse = random() * TAU;
};

const updateSubstep = (state, dt, input, events) => {
  const { player, bounds } = state;
  state.elapsed += dt;
  state.spawnClock += dt;
  state.lastEvent = null;
  player.hitCooldown = Math.max(0, player.hitCooldown - dt);

  const left = Boolean(input.left || input.a);
  const right = Boolean(input.right || input.d);
  const up = Boolean(input.up || input.w);
  const down = Boolean(input.down || input.s);
  let ax = (right ? 1 : 0) - (left ? 1 : 0);
  let ay = (down ? 1 : 0) - (up ? 1 : 0);
  const centerX = bounds.width / 2;
  const centerY = bounds.height / 2;
  // The center is a gentle gravity well; the aim vector adds a direct, tactile pull.
  ax += (centerX - player.x) * 0.0009;
  ay += (centerY - player.y) * 0.0009;
  if (state.aim && !(left || right || up || down)) {
    ax += (state.aim.x - player.x) * 0.0042;
    ay += (state.aim.y - player.y) * 0.0042;
  }
  const keyboardLength = Math.hypot((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
  if (keyboardLength > 1) { ax /= keyboardLength; ay /= keyboardLength; }
  // The same paths used by moving nodes slowly unfold with progression.
  state.orbitals.forEach((orbital, index) => {
    const base = state.baseOrbitals[index];
    const expansion = 1 + Math.min(.18, (state.level-1)*.025);
    const respond = 1-Math.exp(-dt*1.4);
    orbital.rx += (base.rx*expansion-orbital.rx)*respond;
    orbital.ry += (base.ry*expansion-orbital.ry)*respond;
    orbital.rotation += (base.rotation + Math.sin(state.elapsed*.15 + index)*.05 + Math.min(state.combo,8)*.015-orbital.rotation)*respond;
  });
  const acceleration = 390 + state.level * 18;
  player.vx += ax * acceleration * dt;
  player.vy += ay * acceleration * dt;
  const damping = Math.pow(0.82, dt);
  player.vx *= damping;
  player.vy *= damping;
  const speed = Math.hypot(player.vx, player.vy);
  const maxSpeed = 245 + state.level * 18;
  if (speed > maxSpeed) {
    player.vx = (player.vx / speed) * maxSpeed;
    player.vy = (player.vy / speed) * maxSpeed;
  }
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  if (player.x < player.radius) { player.x = player.radius; player.vx = Math.abs(player.vx) * 0.68; }
  if (player.x > bounds.width - player.radius) { player.x = bounds.width - player.radius; player.vx = -Math.abs(player.vx) * 0.68; }
  if (player.y < player.radius) { player.y = player.radius; player.vy = Math.abs(player.vy) * 0.68; }
  if (player.y > bounds.height - player.radius) { player.y = bounds.height - player.radius; player.vy = -Math.abs(player.vy) * 0.68; }

  state.hazards.forEach((hazard) => {
    hazard.angle += hazard.speed * (1 + state.level * 0.055) * dt;
    const target = state.orbitals[hazard.id % state.orbitals.length];
    hazard.orbitRadius = Math.min(hazard.orbitRadius,Math.min(bounds.width,bounds.height)*.38);
    const wobble = Math.sin(state.elapsed * 1.1 + hazard.phase) * 12;
    hazard.x = target.cx + Math.cos(hazard.angle + hazard.phase) * (hazard.orbitRadius + wobble);
    hazard.y = target.cy + Math.sin(hazard.angle + hazard.phase) * (hazard.orbitRadius + wobble) * 0.63;
    const hitDistance = player.radius + hazard.radius;
    if (player.hitCooldown <= 0 && distanceSquared(player, hazard) < hitDistance * hitDistance) {
      player.hitCooldown = 1.25;
      player.vx *= -0.58;
      player.vy *= -0.58;
      state.lives -= 1;
      state.combo = 0;
      state.comboTimer = 0;
      state.score = Math.max(0, state.score - 60);
      state.lastEvent = 'hit';
      emit(events, 'hit', { lives: state.lives, x: player.x, y: player.y });
      if (state.lives <= 0) {
        state.status = 'gameover';
        emit(events, 'gameover', { score: state.score, reason: 'hull breach' });
      }
    }
  });

  state.pickups.forEach((pickup, index) => {
    if (!pickup.active) return;
    pickup.pulse += dt * (1.5 + state.level * 0.08);
    const collectDistance = player.radius + pickup.radius + 3;
    if (distanceSquared(player, pickup) < collectDistance * collectDistance) {
      pickup.active = false;
      state.combo = state.comboTimer > 0 ? state.combo + 1 : 1;
      state.comboTimer = 3.8;
      const multiplier = 1 + Math.min(4, state.combo - 1) * 0.25;
      const points = Math.round((100 + state.level * 12) * multiplier);
      state.score += points;
      state.level = Math.min(12, 1 + Math.floor(state.score / 500));
      const route = Math.floor(state.elapsed/20);
      if (route > state.highestRoute) {
        state.highestRoute=route;
        state.score += 50;
        emit(events,'route',{points:50});
      }
      state.lastEvent = 'collect';
      state.respawnQueue.push({ pickup, at: state.elapsed + 0.65, index });
      emit(events, 'collect', { points, combo: state.combo, x: player.x, y: player.y });
    }
  });

  if (state.comboTimer > 0) {
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer === 0) state.combo = 0;
  }
  state.respawnQueue = state.respawnQueue.filter((item) => {
    if (item.at <= state.elapsed) {
      respawnPickup(state, item.pickup, item.index);
      return false;
    }
    return true;
  });

  if (state.elapsed >= 90 && state.status === 'playing') {
    state.status = 'gameover';
    emit(events, 'gameover', { score: state.score, reason: 'signal window closed' });
  }
};

const advanceOrbit = (state, dt, input = {}) => {
  if (state.status !== 'playing') return [];
  const safeDt = clamp(Number.isFinite(dt) ? dt : 0, 0, MAX_DT);
  const events = [];
  let remaining = safeDt;
  while (remaining > 0 && state.status === 'playing') {
    const slice = Math.min(SUBSTEP, remaining);
    updateSubstep(state, slice, input, events);
    remaining -= slice;
  }
  return events;
};

const getOrbitSummary = (state) => ({
  status: state.status,
  score: state.score,
  combo: state.combo,
  lives: state.lives,
  level: state.level,
  remaining: Math.max(0, 90 - state.elapsed),
});

export {
  advanceOrbit,
  createOrbitState,
  getOrbitSummary,
  pauseOrbit,
  resetOrbitState,
  restartOrbit,
  resumeOrbit,
  setOrbitAim,
  setOrbitBounds,
  startOrbit,
};
