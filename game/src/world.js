// The world: one run's whole state and the fixed-step simulation that moves
// it. Rendering reads this; nothing here touches the canvas.

import { FARMER, ITEMS, RUN, TURKEY, VIEW } from './config.js';
import { makeRandom, range } from './random.js';

export const KIND_OVEN = 'oven';
export const KIND_KNIFE = 'knife';
export const KIND_HAY = 'hay';
export const KIND_FENCE = 'fence';
export const KIND_PUDDLE = 'puddle';
export const KIND_CORN = 'corn';
export const KIND_GOLDEN = 'golden';

const OBSTACLE_KINDS = [KIND_OVEN, KIND_KNIFE, KIND_HAY, KIND_FENCE, KIND_PUDDLE];

const SIZES = {
  [KIND_OVEN]: { width: 96, height: 92 },
  [KIND_KNIFE]: { width: 74, height: 26 },
  [KIND_HAY]: { width: 84, height: 56 },
  [KIND_FENCE]: { width: 92, height: 48 },
  [KIND_PUDDLE]: { width: 104, height: 16 },
  [KIND_CORN]: { width: 34, height: 44 },
  [KIND_GOLDEN]: { width: 38, height: 48 },
};

export function createWorld(seed) {
  return {
    random: makeRandom(seed),
    screen: 'title',
    time: 0,
    distancePx: 0,
    speed: RUN.startSpeed,
    score: 0,
    corn: 0,
    lives: ITEMS.startLives,
    gap: FARMER.startGap,
    invincibleFor: 0,
    shake: 0,
    finishedAt: 0,
    turkey: {
      y: VIEW.groundY - TURKEY.height,
      vy: 0,
      jumps: 0,
      ducking: false,
      runPhase: 0,
      stumbleFor: 0,
    },
    items: [],
    particles: [],
    nextSpawnIn: 340,
    nextCornIn: 520,
    hazardsSpawned: 0,
  };
}

export function distanceMeters(world) {
  return Math.floor(world.distancePx / RUN.pixelsPerMeter);
}

export function turkeyHitbox(world) {
  const height = world.turkey.ducking && world.turkey.y >= VIEW.groundY - TURKEY.height - 0.5
    ? TURKEY.duckHeight
    : TURKEY.height;
  const bottom = world.turkey.y + TURKEY.height;
  return { x: TURKEY.x + 10, y: bottom - height, width: TURKEY.width - 18, height };
}

export function placeItem(world, kind, x, lane) {
  const size = SIZES[kind];
  let y;
  if (kind === KIND_KNIFE) {
    // A thrown knife flies either at chest height (duck under it!) or low
    // across the ankles (jump it!). Heights are tuned to the turkey's boxes:
    // standing top = groundY-76, ducking top = groundY-48.
    y = lane === 'high' ? VIEW.groundY - 88 : VIEW.groundY - 40;
  } else if (kind === KIND_CORN || kind === KIND_GOLDEN) {
    y = lane === 'air' ? VIEW.groundY - 168 : VIEW.groundY - size.height - 6;
  } else {
    y = VIEW.groundY - size.height;
    if (kind === KIND_PUDDLE) y = VIEW.groundY - 4;
  }
  const item = {
    kind,
    x,
    y,
    width: size.width,
    height: size.height,
    speed: kind === KIND_KNIFE ? world.speed + range(world.random, 210, 320) : 0,
    spin: range(world.random, -0.6, 0.6),
    active: true,
    tutorial: null,
  };
  world.items.push(item);
  return item;
}

function burst(world, x, y, colour, count, spread = 190) {
  for (let i = 0; i < count; i += 1) {
    world.particles.push({
      x,
      y,
      vx: range(world.random, -spread, spread),
      vy: range(world.random, -260, -30),
      life: range(world.random, 0.35, 0.8),
      age: 0,
      colour,
      size: range(world.random, 3, 7),
    });
  }
}

function hitObstacle(world, item, effects) {
  item.active = false;
  const box = turkeyHitbox(world);
  if (item.kind === KIND_PUDDLE) {
    world.gap = Math.max(0, world.gap - FARMER.puddlePenalty);
    world.turkey.stumbleFor = 0.35;
    burst(world, box.x + box.width / 2, VIEW.groundY, '#7ec8e3', 12, 130);
    effects.push('splash');
    return;
  }
  // A stumble costs ground, not a life: the farmer is the only real threat.
  // Lives are spent shaking free of his grip (see updateFarmerGap).
  world.gap = Math.max(0, world.gap - FARMER.stumblePenalty);
  world.invincibleFor = ITEMS.invincibleSeconds;
  world.turkey.stumbleFor = 0.45;
  world.shake = 0.35;
  burst(world, box.x + box.width / 2, box.y + 20, '#f5efe0', 14, 230);
  burst(world, box.x + box.width / 2, box.y + 30, '#c96f2e', 8, 200);
  effects.push('hit');
}

export function startRun(world) {
  const fresh = createWorld(Math.floor(world.random() * 1e9));
  fresh.screen = 'play';
  Object.assign(world, fresh);
}

// The chase itself. The farmer always closes in a little; clean running
// opens the gap again, corn opens it more, and stumbles slam it shut. When
// his hand lands (gap 0) the turkey can shake free twice — a burst of
// feathers, one heart, and a head start — and the third catch is dinner.
export function updateFarmerGap(world, dt, effects) {
  const pressure = FARMER.pressurePerSecond * (1 + world.time / 240);
  world.gap -= pressure * dt;
  if (world.turkey.stumbleFor <= 0) world.gap += FARMER.recoveryPerSecond * dt;
  world.gap = Math.max(0, Math.min(FARMER.maxGap, world.gap));
  if (world.gap > 0) return;
  world.lives -= 1;
  if (world.lives <= 0) {
    effects.push('caught');
    return;
  }
  world.gap = 46;
  world.invincibleFor = 1.6;
  world.shake = 0.4;
  burst(world, TURKEY.x + 30, world.turkey.y + 30, '#f5efe0', 22, 280);
  burst(world, TURKEY.x + 30, world.turkey.y + 30, '#c96f2e', 12, 240);
  effects.push('shakeFree');
}

// Hazard and corn spawning, ahead of the right edge. The first two hazards
// of a run are a gentle tutorial — a low oven to jump, then a high knife to
// duck — and later spacing grows with speed, so a jump always has room to
// land before the next hazard arrives (no impossible chains).
export function spawnHazards(world, dt) {
  world.nextSpawnIn -= world.speed * dt;
  if (world.nextSpawnIn <= 0) {
    let kind;
    let lane = world.random() < 0.5 ? 'high' : 'low';
    let tutorial = null;
    if (world.hazardsSpawned === 0) {
      kind = KIND_OVEN;
      tutorial = 'jump';
    } else if (world.hazardsSpawned === 1) {
      kind = KIND_KNIFE;
      lane = 'high';
      tutorial = 'duck';
    } else {
      kind = OBSTACLE_KINDS[Math.floor(world.random() * OBSTACLE_KINDS.length)];
    }
    const item = placeItem(world, kind, VIEW.width + 80, lane);
    if (tutorial) item.tutorial = tutorial;
    world.hazardsSpawned += 1;
    const tightness = Math.min(0.8, world.time / 170);
    world.nextSpawnIn = range(world.random, 430, 730) + world.speed * 0.35 - tightness * 90;
    if (tutorial) world.nextSpawnIn = Math.max(world.nextSpawnIn, 640);
  }
  world.nextCornIn -= world.speed * dt;
  if (world.nextCornIn <= 0) {
    const golden = world.random() < 0.14;
    const lane = world.random() < 0.4 ? 'air' : 'ground';
    placeItem(world, golden ? KIND_GOLDEN : KIND_CORN, VIEW.width + 60, lane);
    world.nextCornIn = range(world.random, 380, 900);
  }
}

// Advance the simulation one fixed step. Returns sound-effect names to play.
export function stepWorld(world, dt, controls) {
  const effects = [];
  if (world.screen !== 'play') return effects;
  const turkey = world.turkey;
  world.time += dt;

  // Speed and distance.
  world.speed = Math.min(RUN.maxSpeed, RUN.startSpeed + world.time * RUN.speedRamp);
  world.distancePx += world.speed * dt;
  world.score += Math.floor(world.speed * dt * 0.06);

  // The farmer.
  updateFarmerGap(world, dt, effects);
  if (effects.includes('caught')) return effects;

  // Turkey vertical physics.
  const onGround = turkey.y >= VIEW.groundY - TURKEY.height - 0.5;
  turkey.ducking = controls.ducking && onGround;
  if (controls.jump) {
    if (onGround) {
      turkey.vy = TURKEY.jumpVelocity;
      turkey.jumps = 1;
      effects.push('jump');
    } else if (turkey.jumps === 1) {
      turkey.vy = TURKEY.doubleJumpVelocity;
      turkey.jumps = 2;
      burst(world, TURKEY.x + 40, turkey.y + TURKEY.height, '#f5efe0', 6, 90);
      effects.push('doubleJump');
    }
  }
  if (controls.ducking && !onGround) turkey.vy = Math.max(turkey.vy, TURKEY.fastFallVelocity);
  turkey.vy += TURKEY.gravity * dt;
  turkey.y += turkey.vy * dt;
  if (turkey.y > VIEW.groundY - TURKEY.height) {
    turkey.y = VIEW.groundY - TURKEY.height;
    turkey.vy = 0;
    turkey.jumps = 0;
  }
  turkey.runPhase += dt * (6 + world.speed / 46);
  if (turkey.stumbleFor > 0) turkey.stumbleFor -= dt;
  if (world.invincibleFor > 0) world.invincibleFor -= dt;
  if (world.shake > 0) world.shake -= dt;

  // Spawning ahead of the right edge.
  spawnHazards(world, dt);

  // Move items, collide, collect.
  const box = turkeyHitbox(world);
  for (const item of world.items) {
    if (!item.active) continue;
    const ownSpeed = item.kind === KIND_KNIFE ? item.speed : world.speed;
    item.x -= ownSpeed * dt;
    if (item.x + item.width < -140) {
      item.active = false;
      continue;
    }
    const isPickup = item.kind === KIND_CORN || item.kind === KIND_GOLDEN;
    // Obstacle boxes are a touch forgiving (a trailing-edge graze is a miss);
    // pickups stay generous.
    const ix = isPickup ? item.x : item.x + 8;
    const iy = isPickup ? item.y : item.y + 6;
    const iw = isPickup ? item.width : item.width - 16;
    const ih = isPickup ? item.height : item.height - 6;
    const overlap = ix < box.x + box.width && ix + iw > box.x
      && iy < box.y + box.height && iy + ih > box.y;
    if (!overlap) continue;
    if (isPickup) {
      item.active = false;
      world.corn += 1;
      const golden = item.kind === KIND_GOLDEN;
      world.score += golden ? ITEMS.goldenScore : ITEMS.cornScore;
      world.gap = Math.min(FARMER.maxGap, world.gap + (golden ? FARMER.goldenBonus : FARMER.cornBonus));
      burst(world, item.x + item.width / 2, item.y + 10, golden ? '#ffd94d' : '#ffe066', golden ? 14 : 8, 120);
      effects.push(golden ? 'golden' : 'corn');
    } else if (world.invincibleFor <= 0) {
      hitObstacle(world, item, effects);
      if (effects.includes('caught')) return effects;
    }
  }
  world.items = world.items.filter((item) => item.active);

  // Particles.
  for (const p of world.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 620 * dt;
  }
  world.particles = world.particles.filter((p) => p.age < p.life);
  if (onGround && Math.random() < 0.3) {
    world.particles.push({
      x: TURKEY.x + 16, y: VIEW.groundY - 2, vx: range(world.random, -70, -20),
      vy: range(world.random, -60, -10), life: 0.4, age: 0, colour: '#cbb590', size: range(world.random, 2, 4),
    });
  }

  // The goal: the Freedom Pines.
  if (distanceMeters(world) >= RUN.goalMeters) effects.push('escaped');
  return effects;
}

export function finishRun(world, outcome) {
  world.screen = outcome;
  world.finishedAt = world.time;
}
