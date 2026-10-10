import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceOrbit,
  createOrbitState,
  getOrbitSummary,
  pauseOrbit,
  restartOrbit,
  resumeOrbit,
  setOrbitAim,
  startOrbit,
} from '../orbit-physics.js';

const simulate = (frameDt, seconds) => {
  const state = createOrbitState({ width: 640, height: 420, seed: 17 });
  startOrbit(state);
  setOrbitAim(state, { x: 540, y: 180 });
  const frames = Math.round(seconds / frameDt);
  for (let index = 0; index < frames; index += 1) advanceOrbit(state, frameDt, { right: true, up: (index * frameDt) % 2 < 1 });
  return state;
};

test('fixed substeps keep 30Hz and 60Hz movement comparable', () => {
  const at30 = simulate(1 / 30, 4);
  const at60 = simulate(1 / 60, 4);
  assert.ok(Math.abs(at30.player.x - at60.player.x) < 0.8, `${at30.player.x} vs ${at60.player.x}`);
  assert.ok(Math.abs(at30.player.y - at60.player.y) < 0.8, `${at30.player.y} vs ${at60.player.y}`);
  assert.equal(at30.score, at60.score);
  assert.equal(at30.elapsed, at60.elapsed);
});

test('collecting a pickup awards score, combo, and progression points', () => {
  const state = createOrbitState({ width: 600, height: 400, seed: 9 });
  startOrbit(state);
  const pickup = state.pickups.find((item) => item.active);
  state.player.x = pickup.x;
  state.player.y = pickup.y;
  const events = advanceOrbit(state, 1 / 60);
  assert.ok(events.some((event) => event.type === 'collect'));
  assert.equal(state.combo, 1);
  assert.equal(state.score, 112);
  assert.equal(state.level, 1);
});

test('consecutive collections increase the combo multiplier', () => {
  const state = createOrbitState({ width: 600, height: 400, seed: 12 });
  startOrbit(state);
  const first = state.pickups[0];
  state.player.x = first.x;
  state.player.y = first.y;
  advanceOrbit(state, 1 / 60);
  state.player.x = state.pickups[1].x;
  state.player.y = state.pickups[1].y;
  advanceOrbit(state, 1 / 60);
  assert.equal(state.combo, 2);
  assert.equal(state.score, 252);
});

test('hazard collisions consume one life and apply a cooldown', () => {
  const state = createOrbitState({ width: 600, height: 400, seed: 3 });
  startOrbit(state);
  const hazard = state.hazards[0];
  hazard.orbitRadius = 0;
  hazard.angle = 0;
  hazard.phase = 0;
  state.player.x = state.orbitals[0].cx;
  state.player.y = state.orbitals[0].cy;
  const before = state.lives;
  const events = advanceOrbit(state, 1 / 60);
  assert.ok(events.some((event) => event.type === 'hit'));
  assert.equal(state.lives, before - 1);
  assert.ok(state.player.hitCooldown > 1);
  advanceOrbit(state, 1 / 60);
  assert.equal(state.lives, before - 1);
});

test('pause freezes simulation and restart returns a fresh playing run', () => {
  const state = createOrbitState({ width: 600, height: 400, seed: 21 });
  startOrbit(state);
  advanceOrbit(state, 0.8, { right: true });
  const snapshot = { x: state.player.x, y: state.player.y, elapsed: state.elapsed, score: state.score };
  pauseOrbit(state);
  assert.equal(state.status, 'paused');
  advanceOrbit(state, 2, { left: true, down: true });
  assert.deepEqual({ x: state.player.x, y: state.player.y, elapsed: state.elapsed, score: state.score }, snapshot);
  resumeOrbit(state);
  assert.equal(state.status, 'playing');
  restartOrbit(state, { width: 600, height: 400, seed: 21 });
  assert.equal(state.status, 'playing');
  assert.equal(state.elapsed, 0);
  assert.equal(state.score, 0);
  assert.equal(state.lives, 3);
});

test('health termination is deterministic and emits gameover', () => {
  const state = createOrbitState({ width: 600, height: 400, seed: 4 });
  startOrbit(state);
  const hazard = state.hazards[0];
  hazard.orbitRadius = 0;
  hazard.angle = 0;
  hazard.phase = 0;
  state.player.x = state.orbitals[0].cx;
  state.player.y = state.orbitals[0].cy;
  for (let hit = 0; hit < 3; hit += 1) {
    state.player.hitCooldown = 0;
    advanceOrbit(state, 1 / 60);
    if (state.status === 'gameover') break;
    state.player.hitCooldown = 0;
  }
  assert.equal(state.status, 'gameover');
  assert.equal(getOrbitSummary(state).lives, 0);
  assert.deepEqual(advanceOrbit(state, 1), []);
});

test('90 second run terminates and restart clears stale aiming', () => {
  const state = createOrbitState({ seed: 6 });
  startOrbit(state);
  state.hazards = [];
  state.pickups = [];
  setOrbitAim(state, { x: 20, y: 20 });
  state.elapsed = 89.9;
  const events = advanceOrbit(state, .2);
  assert.equal(state.status, 'gameover');
  assert.ok(events.some(event => event.type === 'gameover'));
  restartOrbit(state);
  assert.equal(state.aim, null);
  assert.equal(state.elapsed, 0);
});

test('keyboard steering takes priority over stale pointer aim', () => {
  const state = createOrbitState({ seed: 8 });
  startOrbit(state);
  state.hazards=[];
  state.pickups=[];
  setOrbitAim(state, { x: 0, y: state.player.y });
  advanceOrbit(state, .15, { right: true });
  assert.ok(state.player.vx > 0);
});

test('leveling up deploys a deterministic power-up and collecting it activates the effect', () => {
  const state = createOrbitState({ width: 600, height: 400, seed: 22 });
  startOrbit(state);
  state.score = 488;
  const pickup = state.pickups.find((item) => item.active);
  state.player.x = pickup.x;
  state.player.y = pickup.y;
  const events = advanceOrbit(state, 1 / 60);
  assert.equal(state.level, 2);
  assert.ok(events.some((event) => event.type === 'level_up' && event.powerup === 'shield'));
  const powerup = state.powerups.find((item) => item.active);
  assert.ok(powerup);
  state.player.x = powerup.x;
  state.player.y = powerup.y;
  const powerEvents = advanceOrbit(state, 1 / 60);
  assert.ok(powerEvents.some((event) => event.type === 'powerup' && event.powerup === 'shield'));
  assert.ok(state.effects.shield > 0);
});
test('shield absorbs one hazard hit without consuming a life', () => {
  const state = createOrbitState({ width: 600, height: 400, seed: 23 });
  startOrbit(state);
  state.effects.shield = 8;
  const hazard = state.hazards[0];
  hazard.orbitRadius = 0;
  hazard.angle = 0;
  hazard.phase = 0;
  state.player.x = state.orbitals[0].cx;
  state.player.y = state.orbitals[0].cy;
  const lives = state.lives;
  const events = advanceOrbit(state, 1 / 60);
  assert.equal(state.lives, lives);
  assert.equal(state.effects.shield, 0);
  assert.ok(events.some((event) => event.type === 'shield_break'));
});
