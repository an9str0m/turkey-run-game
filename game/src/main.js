// Gobble Run — entry point. Owns the screen state machine, the fixed-step
// loop, and the deterministic ?shot= staging used to take the screenshots
// in screenshots/ (each shot steps the real simulation with a scripted
// autopilot, so every screenshot is a true render of this code).

import { SCREENS, TURKEY, VIEW } from './config.js';
import { sound } from './audio.js';
import { bindInput, endFrame, input, readDucking, takePress } from './input.js';
import { drawFrame } from './render.js';
import { KIND_CORN, KIND_GOLDEN, KIND_KNIFE, KIND_OVEN, createWorld, finishRun, placeItem, startRun, stepWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? 7) || 7;

let world = createWorld(seed);
let paused = false;
let lastStamp = null;
let accumulator = 0;
const STEP = 1 / 120;

function playEffects(effects) {
  for (const effect of effects) {
    if (effect === 'jump') sound.jump();
    else if (effect === 'doubleJump') sound.doubleJump();
    else if (effect === 'corn') sound.corn();
    else if (effect === 'golden') sound.golden();
    else if (effect === 'hit') sound.hit();
    else if (effect === 'shakeFree') {
      sound.hit();
      sound.gobble();
    }
    else if (effect === 'splash') sound.splash();
    else if (effect === 'caught') {
      finishRun(world, SCREENS.caught);
      sound.stopMusic();
      sound.caught();
    } else if (effect === 'escaped') {
      finishRun(world, SCREENS.escaped);
      sound.stopMusic();
      sound.escaped();
    }
  }
}

function handlePresses() {
  if (takePress('mute')) {
    sound.toggleMute();
  }
  if (world.screen === SCREENS.title) {
    if (takePress('jump') || takePress('confirm') || input.clicked) {
      startRun(world);
      sound.unlock();
      sound.startMusic();
      sound.gobble();
    }
    return;
  }
  if (world.screen === SCREENS.caught || world.screen === SCREENS.escaped) {
    if (takePress('restart') || takePress('confirm') || input.clicked) {
      startRun(world);
      sound.startMusic();
    }
    return;
  }
  if (takePress('pause')) paused = !paused;
}

function frame(stamp) {
  requestAnimationFrame(frame);
  if (lastStamp === null) lastStamp = stamp;
  let elapsed = Math.min(0.1, (stamp - lastStamp) / 1000);
  lastStamp = stamp;
  handlePresses();
  if (world.screen === SCREENS.play && !paused) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      const effects = stepWorld(world, STEP, { jump: takePress('jump'), ducking: readDucking() });
      playEffects(effects);
      accumulator -= STEP;
      if (world.screen !== SCREENS.play) {
        accumulator = 0;
        break;
      }
    }
  } else {
    world.time += 0; // screens other than play keep their own clock below
  }
  const now = stamp / 1000;
  drawFrame(ctx, world, world.screen === SCREENS.play ? world.time : now);
  if (paused && world.screen === SCREENS.play) {
    ctx.fillStyle = 'rgba(20, 14, 8, 0.5)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.font = 'bold 54px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9b0';
    ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2);
  }
  endFrame();
}

// --- Screenshot staging ------------------------------------------------------
// A tiny autopilot: jump when a ground obstacle is close, duck under high
// knives. Good enough to look alive; the end scenes use a hopeless pilot.

function autopilot(world, careless) {
  const reach = careless ? 30 : 58; // how close an obstacle gets before jumping
  let jump = false;
  let ducking = false;
  for (const item of world.items) {
    const ahead = item.x - (TURKEY.x + TURKEY.width); // distance from the turkey's front
    if (item.kind === 'knife') {
      // A knife threatens until its tail has fully passed the turkey.
      if (ahead < -190 || ahead > 320) continue;
      if (item.y > VIEW.groundY - 60) {
        if (ahead < 130 && ahead > -50) jump = true; // ankle height: jump it
      } else if (ahead < 230) {
        ducking = true; // chest height: duck under it, and stay down
      }
    } else if (item.kind !== 'corn' && item.kind !== 'golden') {
      if (ahead < -130 || ahead > 280) continue;
      if (ahead < reach && ahead > -20) jump = true;
    }
  }
  return { jump, ducking };
}

function stageShot(name) {
  world = createWorld(seed);
  if (name === 'title') {
    world.time = 1.5; // a blink phase where the start prompt is visible
    drawFrame(ctx, world, 1.5);
    return;
  }
  startRun(world);
  const careless = name === 'caught';
  const maxSteps = careless ? 120 * 300 : 120 * 240;
  let steps = 0;
  let prevRawJump = false;
  while (world.screen === SCREENS.play && steps < maxSteps) {
    const raw = autopilot(world, careless);
    if (careless && steps > 120 * 26) raw.jump = false; // fate arrives
    const onGround = world.turkey.y >= VIEW.groundY - TURKEY.height - 0.5;
    // One press per jump — but if the turkey is already falling onto something
    // wide, spend the double jump to stay up, as a player would.
    let jump = false;
    if (raw.jump && (!prevRawJump || onGround)) jump = true;
    else if (raw.jump && world.turkey.jumps === 1 && world.turkey.vy > 260) jump = true;
    // Never duck mid-air: that would dive the turkey onto the obstacle below.
    const controls = { jump, ducking: raw.ducking && onGround };
    prevRawJump = raw.jump;
    const effects = stepWorld(world, STEP, controls);
    for (const effect of effects) {
      if (effect === 'caught') finishRun(world, SCREENS.caught);
      if (effect === 'escaped') finishRun(world, SCREENS.escaped);
    }
    steps += 1;
    if (name === 'play' && world.time > 16) break;
    if (name === 'escaped' && world.screen === SCREENS.escaped) break;
  }
  if (name === 'play') {
    // Compose the cover action frame from the game's own pieces, in a
    // configuration normal play reaches: the farmer right behind, the
    // turkey mid-leap over an oven, a knife and corn up ahead.
    world.items = world.items.filter((item) => item.x > 1080 || item.x < 180);
    placeItem(world, KIND_OVEN, 400, 'ground');
    placeItem(world, KIND_KNIFE, 905, 'high');
    placeItem(world, KIND_CORN, 700, 'ground');
    placeItem(world, KIND_GOLDEN, 1060, 'air');
    world.turkey.y = VIEW.groundY - TURKEY.height - 118; // mid-leap over the oven
    world.turkey.vy = -260;
    world.turkey.jumps = 1;
    world.gap = 21; // the farmer, reaching, right at the turkey's tail
    drawFrame(ctx, world, world.time);
    return;
  }
  // End screens: freeze on a blink phase where the restart prompt shows.
  drawFrame(ctx, world, 3.0);
}

if (shotName) {
  stageShot(shotName);
  window.__shotReady = shotName;
} else {
  bindInput(canvas, () => sound.unlock());
  requestAnimationFrame(frame);
}
