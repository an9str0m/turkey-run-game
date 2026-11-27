// All drawing. Canvas 2D only — every sprite is vector shapes painted here,
// so the game ships no image files at all. The renderer reads the world and
// never changes it.

import { FARMER, RUN, TURKEY, VIEW } from './config.js';
import { KIND_CORN, KIND_FENCE, KIND_GOLDEN, KIND_HAY, KIND_KNIFE, KIND_OVEN, KIND_PUDDLE, distanceMeters } from './world.js';

const FONT = '"Trebuchet MS", "Comic Sans MS", "Chalkboard SE", sans-serif';

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColour(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}

function rgb(c) {
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

// Deterministic decoration hash: the same field looks the same every frame.
function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, { size = 28, colour = '#fff', align = 'center', weight = 'bold', stroke = null, strokeWidth = 6 } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.strokeText(value, x, y);
  }
  ctx.fillStyle = colour;
  ctx.fillText(value, x, y);
}

// --- Sky and scenery -------------------------------------------------------

function drawSky(ctx, world, progress) {
  const top = mixColour([86, 165, 219], [43, 46, 99], progress);
  const mid = mixColour([164, 216, 240], [178, 84, 110], progress);
  const low = mixColour([253, 238, 205], [255, 167, 82], progress);
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.groundY);
  grad.addColorStop(0, rgb(top));
  grad.addColorStop(0.55, rgb(mid));
  grad.addColorStop(1, rgb(low));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.groundY + 2);

  // Sun: rises bright, sinks and reddens toward the finish.
  const sunX = lerp(1050, 240, progress);
  const sunY = lerp(110, 330, progress);
  const sunColour = mixColour([255, 236, 150], [255, 122, 61], progress);
  ctx.fillStyle = 'rgba(255, 240, 190, 0.35)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgb(sunColour);
  ctx.beginPath();
  ctx.arc(sunX, sunY, 58, 0, Math.PI * 2);
  ctx.fill();

  // Clouds drift slowly against the run.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  const cloudOff = (world.distancePx * 0.06 + world.time * 4) % 460;
  for (let i = -1; i < 4; i += 1) {
    const cx = i * 460 - cloudOff + hash(i * 7 + 1) * 120;
    const cy = 62 + hash(i * 13 + 2) * 110;
    const s = 0.8 + hash(i * 3 + 5) * 0.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 62 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 38 * s, cy + 5 * s, 44 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 42 * s, cy + 6 * s, 40 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHills(ctx, world, progress) {
  const off = (world.distancePx * 0.22) % 720;
  ctx.fillStyle = rgb(mixColour([110, 184, 120], [94, 84, 128], progress));
  ctx.beginPath();
  ctx.moveTo(0, VIEW.groundY);
  for (let x = 0; x <= VIEW.width; x += 24) {
    const wx = x + off;
    const y = VIEW.groundY - 128 - Math.sin(wx * 0.006) * 52 - Math.sin(wx * 0.017 + 2) * 22;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(VIEW.width, VIEW.groundY);
  ctx.closePath();
  ctx.fill();
}

function drawMidground(ctx, world, progress) {
  // Fences, the old barn near the start, and pines that thicken near the goal.
  const spacing = 300;
  const off = (world.distancePx * 0.55) % spacing;
  const firstIndex = Math.floor((world.distancePx * 0.55) / spacing);
  for (let i = -1; i < VIEW.width / spacing + 2; i += 1) {
    const seg = firstIndex + i;
    const x = i * spacing - off;
    const roll = hash(seg * 3.3);
    if (seg === 1) {
      drawBarn(ctx, x - 40, VIEW.groundY);
    } else if (progress > 0.72 && roll < (progress - 0.72) * 2.6) {
      drawPine(ctx, x + 90, VIEW.groundY, 150 + roll * 60);
    } else {
      drawFenceRun(ctx, x, VIEW.groundY);
    }
  }
}

function drawBarn(ctx, x, groundY) {
  ctx.fillStyle = '#a83c32';
  ctx.fillRect(x, groundY - 150, 190, 150);
  ctx.fillStyle = '#7e2a23';
  ctx.beginPath();
  ctx.moveTo(x - 14, groundY - 150);
  ctx.lineTo(x + 95, groundY - 224);
  ctx.lineTo(x + 204, groundY - 150);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f3e2c7';
  ctx.fillRect(x + 66, groundY - 96, 58, 96);
  ctx.strokeStyle = '#7e2a23';
  ctx.lineWidth = 5;
  ctx.strokeRect(x + 66, groundY - 96, 58, 96);
  ctx.beginPath();
  ctx.moveTo(x + 66, groundY - 96);
  ctx.lineTo(x + 124, groundY);
  ctx.moveTo(x + 124, groundY - 96);
  ctx.lineTo(x + 66, groundY);
  ctx.stroke();
  ctx.fillStyle = '#fff7e6';
  ctx.fillRect(x + 78, groundY - 196, 34, 30);
  ctx.strokeRect(x + 78, groundY - 196, 34, 30);
}

export function drawPine(ctx, x, groundY, height) {
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(x - 7, groundY - height * 0.22, 14, height * 0.22);
  ctx.fillStyle = '#2e6b3e';
  const tiers = 3;
  for (let t = 0; t < tiers; t += 1) {
    const w = (height * 0.52) * (1 - t * 0.24);
    const yBase = groundY - height * 0.16 - t * height * 0.26;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, yBase);
    ctx.lineTo(x, yBase - height * 0.34);
    ctx.lineTo(x + w / 2, yBase);
    ctx.closePath();
    ctx.fill();
  }
}

function drawFenceRun(ctx, x, groundY) {
  ctx.strokeStyle = '#e8ddc8';
  ctx.fillStyle = '#efe4cd';
  ctx.lineWidth = 7;
  for (const railY of [groundY - 58, groundY - 30]) {
    ctx.beginPath();
    ctx.moveTo(x, railY);
    ctx.lineTo(x + 300, railY - 3);
    ctx.stroke();
  }
  for (const px of [x + 12, x + 148, x + 284]) {
    ctx.fillRect(px, groundY - 76, 11, 76);
  }
}

function drawGround(ctx, world) {
  const gy = VIEW.groundY;
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(0, gy, VIEW.width, VIEW.height - gy);
  ctx.fillStyle = '#6f4525';
  const off = world.distancePx % 90;
  for (let x = -90; x < VIEW.width + 90; x += 90) {
    const seg = Math.floor((world.distancePx + x) / 90);
    ctx.beginPath();
    ctx.ellipse(x - off + 20 + hash(seg) * 40, gy + 44 + hash(seg * 2) * 60, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#58a34c';
  ctx.fillRect(0, gy - 6, VIEW.width, 14);
  ctx.fillStyle = '#6fbf5e';
  const tuftOff = world.distancePx % 130;
  for (let x = -130; x < VIEW.width + 130; x += 130) {
    const seg = Math.floor((world.distancePx + x) / 130);
    const tx = x - tuftOff + hash(seg * 5) * 60;
    ctx.beginPath();
    ctx.moveTo(tx, gy - 4);
    ctx.lineTo(tx + 5, gy - 20 - hash(seg * 7) * 8);
    ctx.lineTo(tx + 10, gy - 4);
    ctx.closePath();
    ctx.fill();
  }
}

// --- Items -----------------------------------------------------------------

function drawOven(ctx, item, now) {
  const { x, y, width: w, height: h } = item;
  ctx.fillStyle = '#3a3f4a';
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = '#23262e';
  ctx.fillRect(x + 10, y - 20, 16, 22); // chimney
  const puff = (now * 0.7 + item.x * 0.01) % 1;
  ctx.fillStyle = `rgba(230, 230, 230, ${0.5 - puff * 0.4})`;
  ctx.beginPath();
  ctx.arc(x + 18, y - 30 - puff * 26, 7 + puff * 9, 0, Math.PI * 2);
  ctx.fill();
  // Glowing door: the fire inside.
  const flicker = 0.75 + Math.sin(now * 11 + item.x) * 0.25;
  ctx.fillStyle = `rgba(255, ${Math.floor(110 * flicker)}, 30, 1)`;
  roundRect(ctx, x + 14, y + 18, w - 28, h - 36, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 12, y + h - 22);
  ctx.lineTo(x + w / 2, y + 30);
  ctx.lineTo(x + w / 2 + 12, y + h - 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  roundRect(ctx, x + w / 2 - 22, y + 4, 44, 13, 4);
  ctx.fill();
  text(ctx, 'HOT!', x + w / 2, y + 11, { size: 11, colour: '#7a2c00' });
}

function drawKnife(ctx, item, now) {
  const { x, y, width: w, height: h } = item;
  const cy = y + h / 2 + Math.sin(now * 9 + item.x * 0.05) * 3;
  ctx.save();
  ctx.translate(x + w / 2, cy);
  ctx.rotate(Math.sin(now * 6 + item.x * 0.03) * 0.14);
  // Motion streaks behind the blade.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  for (const dy of [-8, 0, 8]) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + 6, dy);
    ctx.lineTo(w / 2 + 30, dy);
    ctx.stroke();
  }
  // Blade, pointing back toward the turkey it was thrown at.
  ctx.fillStyle = '#dfe6ee';
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(w / 2 - 16, -h / 2 + 2);
  ctx.lineTo(w / 2 - 10, h / 2 - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 8, -1);
  ctx.lineTo(w / 2 - 20, -h / 2 + 6);
  ctx.lineTo(w / 2 - 18, -2);
  ctx.closePath();
  ctx.fill();
  // Handle.
  ctx.fillStyle = '#8a5a33';
  roundRect(ctx, w / 2 - 14, -5, 18, 10, 4);
  ctx.fill();
  ctx.restore();
}

function drawHay(ctx, item) {
  const { x, y, width: w, height: h } = item;
  ctx.fillStyle = '#e3b341';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = '#c1912a';
  ctx.lineWidth = 3;
  for (const fx of [0.25, 0.5, 0.75]) {
    ctx.beginPath();
    ctx.moveTo(x + w * fx, y + 5);
    ctx.lineTo(x + w * fx, y + h - 5);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(160, 116, 32, 0.8)';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, 13, 0.4, Math.PI * 1.6);
  ctx.stroke();
}

function drawFenceItem(ctx, item) {
  const { x, y, width: w, height: h } = item;
  ctx.fillStyle = '#efe4cd';
  ctx.fillRect(x + 4, y, 10, h);
  ctx.fillRect(x + w - 14, y, 10, h);
  ctx.fillRect(x, y + 8, w, 9);
  ctx.fillRect(x, y + h - 17, w, 9);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(x, y + h - 4, w, 4);
}

function drawPuddle(ctx, item, now) {
  const { x, y, width: w } = item;
  ctx.fillStyle = '#5aa7cf';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 8, w / 2, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  const r = ((now * 0.9 + item.x * 0.01) % 1) * w * 0.32;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 8, r, r * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.36, y + 5, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCorn(ctx, item, now, golden) {
  const { x, y, width: w, height: h } = item;
  const bob = Math.sin(now * 3 + item.x * 0.05) * 4;
  const cx = x + w / 2;
  const cy = y + h / 2 + bob;
  if (golden) {
    ctx.fillStyle = 'rgba(255, 217, 77, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, 30 + Math.sin(now * 6) * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(now * 2.4 + item.x * 0.04) * 0.16);
  // Husk leaves.
  ctx.fillStyle = '#4d9b47';
  ctx.beginPath();
  ctx.moveTo(-6, 6);
  ctx.quadraticCurveTo(-20, 18, -14, 26);
  ctx.quadraticCurveTo(-4, 20, 0, 10);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, 6);
  ctx.quadraticCurveTo(20, 18, 14, 26);
  ctx.quadraticCurveTo(4, 20, 0, 10);
  ctx.closePath();
  ctx.fill();
  // Cob.
  ctx.fillStyle = golden ? '#ffcf3f' : '#ffd94d';
  roundRect(ctx, -10, -h / 2, 20, h - 6, 9);
  ctx.fill();
  ctx.fillStyle = golden ? '#e8a91c' : '#eab543';
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      ctx.beginPath();
      ctx.arc(-4.5 + col * 9, -h / 2 + 8 + row * 10, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawItem(ctx, item, now) {
  if (item.kind === KIND_OVEN) drawOven(ctx, item, now);
  else if (item.kind === KIND_KNIFE) drawKnife(ctx, item, now);
  else if (item.kind === KIND_HAY) drawHay(ctx, item);
  else if (item.kind === KIND_FENCE) drawFenceItem(ctx, item);
  else if (item.kind === KIND_PUDDLE) drawPuddle(ctx, item, now);
  else if (item.kind === KIND_CORN) drawCorn(ctx, item, now, false);
  else if (item.kind === KIND_GOLDEN) drawCorn(ctx, item, now, true);
  // The first two hazards of a run teach the controls, with a bouncing label.
  if (item.tutorial) {
    const label = item.tutorial === 'jump' ? 'JUMP! ↑' : 'DUCK! ↓';
    const ly = item.y - 34 + Math.sin(now * 6) * 5;
    ctx.fillStyle = 'rgba(38, 32, 24, 0.75)';
    roundRect(ctx, item.x + item.width / 2 - 52, ly - 17, 104, 32, 9);
    ctx.fill();
    text(ctx, label, item.x + item.width / 2, ly, { size: 21, colour: '#ffd94d' });
  }
}

// --- Characters --------------------------------------------------------------

export function drawTurkey(ctx, opts) {
  const {
    x, bottom, runPhase = 0, airborne = false, ducking = false,
    flap = 0, worried = false, dizzy = false, celebrate = false, now = 0,
  } = opts;
  const squash = ducking ? 0.62 : 1;
  const bodyW = 96;
  const bodyH = 62 * squash;
  const bodyY = bottom - bodyH - 18;
  ctx.save();
  ctx.translate(x, 0);

  // Legs (behind body), running cycle.
  ctx.strokeStyle = '#e8862e';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  const legSwing = airborne ? 0.4 : Math.sin(runPhase) * 16;
  for (const [phase, back] of [[0, false], [Math.PI, true]]) {
    const sw = airborne ? (back ? -8 : 10) : Math.sin(runPhase + phase) * 16;
    const hipX = 34 + (back ? -8 : 6);
    const footX = hipX + sw;
    const footY = airborne ? bottom - 16 - (back ? 4 : 0) : bottom - Math.max(0, Math.sin(runPhase + phase)) * 7;
    ctx.beginPath();
    ctx.moveTo(hipX, bodyY + bodyH - 4);
    ctx.lineTo(footX, footY - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(footX, footY - 4);
    ctx.lineTo(footX + 10, footY - 4);
    ctx.stroke();
  }

  // Tail fan: five feathers fanned behind.
  const fan = celebrate ? 0.5 : 0;
  for (let i = 0; i < 5; i += 1) {
    const angle = -0.5 - i * 0.24 - fan * i * 0.08;
    const fx = 16;
    const fy = bodyY + bodyH * 0.45;
    const len = 52 + (i === 2 ? 8 : 0);
    const ex = fx + Math.cos(angle + Math.PI) * len * 0.4 - 14;
    const ey = fy + Math.sin(angle) * len - 8;
    ctx.fillStyle = ['#8a4b23', '#c96f2e', '#a83c32', '#c96f2e', '#8a4b23'][i];
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(angle - 0.5);
    ctx.beginPath();
    ctx.ellipse(-len / 2, 0, len / 2, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 220, 150, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-len / 2 - 6, 0, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    void ex; void ey;
  }

  // Body.
  const bodyGrad = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH);
  bodyGrad.addColorStop(0, '#b06a35');
  bodyGrad.addColorStop(1, '#8a4b23');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(bodyW / 2 + 8, bodyY + bodyH / 2, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.ellipse(bodyW / 2 + 2, bodyY + bodyH * 0.36, bodyW * 0.3, bodyH * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Wing: flaps when airborne or celebrating, pumps while running.
  const wingAngle = airborne || celebrate ? Math.sin(now * 26) * 0.7 - 0.4 : Math.sin(runPhase * 0.5) * 0.14;
  ctx.save();
  ctx.translate(bodyW / 2 + 4, bodyY + bodyH * 0.42);
  ctx.rotate(wingAngle + flap);
  ctx.fillStyle = '#7a3f1d';
  ctx.beginPath();
  ctx.ellipse(4, 10, 30, 15, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60, 30, 10, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, 8);
  ctx.quadraticCurveTo(4, 18, 24, 16);
  ctx.stroke();
  ctx.restore();

  // Neck and head.
  const headX = bodyW + 16;
  const headY = bodyY + (ducking ? 16 : -2);
  ctx.strokeStyle = '#9db3c8';
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(bodyW - 4, bodyY + bodyH * 0.4);
  ctx.quadraticCurveTo(headX - 6, bodyY + 16, headX, headY + 12);
  ctx.stroke();
  ctx.fillStyle = '#aebfd2';
  ctx.beginPath();
  ctx.arc(headX, headY, 17, 0, Math.PI * 2);
  ctx.fill();
  // Wattle and snood.
  ctx.fillStyle = '#d64541';
  ctx.beginPath();
  ctx.ellipse(headX + 9, headY + 12, 6, 10, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(headX + 13, headY - 4, 4, 8, 0.7, 0, Math.PI * 2);
  ctx.fill();
  // Beak.
  ctx.fillStyle = '#f2a007';
  ctx.beginPath();
  ctx.moveTo(headX + 12, headY - 2);
  ctx.lineTo(headX + 30, headY + 3);
  ctx.lineTo(headX + 12, headY + 8);
  ctx.closePath();
  ctx.fill();
  // Eye: dizzy spirals, worried, or bright.
  if (dizzy) {
    ctx.strokeStyle = '#26303a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(headX + 4, headY - 4, 5, now * 4, now * 4 + Math.PI * 1.5);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(headX + 4, headY - 4, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#26303a';
    ctx.beginPath();
    ctx.arc(headX + 6, headY - 4, 3.6, 0, Math.PI * 2);
    ctx.fill();
    if (worried) {
      ctx.strokeStyle = '#26303a';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(headX - 4, headY - 14);
      ctx.lineTo(headX + 10, headY - 10);
      ctx.stroke();
    }
  }
  // Sweat drop when the farmer is close.
  if (worried && !dizzy) {
    const dropY = headY - 20 + Math.sin(now * 7) * 3;
    ctx.fillStyle = '#7ec8e3';
    ctx.beginPath();
    ctx.ellipse(headX - 12, dropY, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawFarmer(ctx, opts) {
  const { x, bottom, runPhase = 0, reach = 0, now = 0, holding = false } = opts;
  ctx.save();
  ctx.translate(x, 0);
  const bodyTop = bottom - 148;
  // Legs in overalls, running.
  ctx.strokeStyle = '#33549e';
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  for (const phase of [0, Math.PI]) {
    const sw = Math.sin(runPhase + phase) * 22;
    ctx.beginPath();
    ctx.moveTo(26, bottom - 52);
    ctx.lineTo(26 + sw, bottom - 6 - Math.max(0, Math.sin(runPhase + phase)) * 8);
    ctx.stroke();
  }
  ctx.fillStyle = '#4a3220';
  for (const phase of [0, Math.PI]) {
    const sw = Math.sin(runPhase + phase) * 22;
    ctx.fillRect(18 + sw, bottom - 10 - Math.max(0, Math.sin(runPhase + phase)) * 8, 20, 8);
  }
  // Torso: plaid shirt and overalls bib.
  ctx.fillStyle = '#c23b2e';
  roundRect(ctx, 2, bodyTop + 34, 54, 66, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  for (const lx of [14, 28, 42]) {
    ctx.beginPath();
    ctx.moveTo(lx, bodyTop + 36);
    ctx.lineTo(lx, bodyTop + 98);
    ctx.stroke();
  }
  ctx.fillStyle = '#33549e';
  roundRect(ctx, 10, bodyTop + 62, 38, 42, 5);
  ctx.fill();
  // Back arm pumps; front arm reaches for the turkey.
  ctx.strokeStyle = '#c23b2e';
  ctx.lineWidth = 11;
  const pump = Math.sin(runPhase) * 14;
  ctx.beginPath();
  ctx.moveTo(8, bodyTop + 44);
  ctx.lineTo(-8, bodyTop + 74 + pump);
  ctx.stroke();
  const reachLen = 34 + reach * 30;
  ctx.beginPath();
  ctx.moveTo(52, bodyTop + 44);
  ctx.lineTo(52 + reachLen, bodyTop + 56 - reach * 8);
  ctx.stroke();
  // Hand, opening and closing.
  ctx.fillStyle = '#f0b98a';
  const handX = 52 + reachLen + 6;
  const handY = bodyTop + 56 - reach * 8;
  ctx.beginPath();
  ctx.arc(handX, handY, 8, 0, Math.PI * 2);
  ctx.fill();
  const grab = 3 + Math.sin(now * 9) * 1.6;
  for (const a of [-0.7, 0, 0.7]) {
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(handX + Math.cos(a) * (9 + grab), handY + Math.sin(a) * (9 + grab));
    ctx.strokeStyle = '#f0b98a';
    ctx.lineWidth = 3.4;
    ctx.stroke();
  }
  // Carving fork in the back hand.
  ctx.strokeStyle = '#cfd6de';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-8, bodyTop + 74 + pump);
  ctx.lineTo(-20, bodyTop + 44 + pump);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-20, bodyTop + 44 + pump);
  ctx.lineTo(-25, bodyTop + 30 + pump);
  ctx.moveTo(-20, bodyTop + 44 + pump);
  ctx.lineTo(-14, bodyTop + 30 + pump);
  ctx.stroke();
  // Head and straw hat.
  ctx.fillStyle = '#f0b98a';
  ctx.beginPath();
  ctx.arc(30, bodyTop + 20, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#26303a';
  ctx.beginPath();
  ctx.arc(36, bodyTop + 18, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#26303a';
  ctx.lineWidth = 3;
  ctx.beginPath(); // determined brow
  ctx.moveTo(28, bodyTop + 8);
  ctx.lineTo(42, bodyTop + 12);
  ctx.stroke();
  ctx.beginPath(); // open shouting mouth
  ctx.ellipse(38, bodyTop + 29, 4.5, 3.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e8c95a';
  ctx.beginPath();
  ctx.ellipse(30, bodyTop + 4, 30, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  roundRect(ctx, 14, bodyTop - 14, 32, 15, 5);
  ctx.fill();
  if (holding) {
    text(ctx, 'GOTCHA!', 44, bodyTop - 34, { size: 24, colour: '#ffd94d', stroke: '#5b3413', strokeWidth: 5 });
  }
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    const fade = 1 - p.age / p.life;
    ctx.globalAlpha = Math.max(0, fade);
    ctx.fillStyle = p.colour;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.size, p.size * 0.55, p.age * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// --- HUD and screens ---------------------------------------------------------

function drawHeart(ctx, x, y, filled) {
  ctx.fillStyle = filled ? '#e8452c' : 'rgba(40, 30, 30, 0.45)';
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.bezierCurveTo(x - 16, y - 8, x - 6, y - 20, x, y - 10);
  ctx.bezierCurveTo(x + 6, y - 20, x + 16, y - 8, x, y + 10);
  ctx.fill();
}

function drawHud(ctx, world) {
  // Score panel.
  ctx.fillStyle = 'rgba(38, 32, 24, 0.55)';
  roundRect(ctx, 18, 16, 246, 62, 12);
  ctx.fill();
  text(ctx, `SCORE ${String(world.score).padStart(6, '0')}`, 36, 40, { size: 25, align: 'left', colour: '#ffe9b0' });
  text(ctx, `CORN × ${world.corn}`, 36, 66, { size: 17, align: 'left', colour: '#fff' });

  // Progress to the Freedom Pines.
  const progress = Math.min(1, distanceMeters(world) / RUN.goalMeters);
  const barX = 400;
  const barW = 480;
  ctx.fillStyle = 'rgba(38, 32, 24, 0.55)';
  roundRect(ctx, barX - 14, 16, barW + 28, 62, 12);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, barX, 34, barW, 14, 7);
  ctx.fill();
  ctx.fillStyle = '#7ed957';
  roundRect(ctx, barX, 34, Math.max(14, barW * progress), 14, 7);
  ctx.fill();
  drawPine(ctx, barX + barW + 4, 52, 44);
  ctx.fillStyle = '#e8862e';
  ctx.beginPath();
  ctx.arc(barX + barW * progress, 41, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const left = Math.max(0, RUN.goalMeters - distanceMeters(world));
  text(ctx, left > 0 ? `${left} m to the Freedom Pines` : 'THE PINES!', barX + barW / 2, 66, { size: 16, colour: '#dff5d2' });

  // Lives.
  for (let i = 0; i < 3; i += 1) drawHeart(ctx, 1180 - i * 44, 44, i < world.lives);

  // Farmer gap gauge.
  const danger = world.gap < 26;
  ctx.fillStyle = 'rgba(38, 32, 24, 0.55)';
  roundRect(ctx, 18, VIEW.height - 52, 300, 36, 10);
  ctx.fill();
  text(ctx, 'FARMER', 30, VIEW.height - 34, { size: 16, align: 'left', colour: danger ? '#ff9d8a' : '#fff' });
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(ctx, 116, VIEW.height - 44, 150, 14, 7);
  ctx.fill();
  ctx.fillStyle = danger ? '#e8452c' : '#ffd94d';
  roundRect(ctx, 116, VIEW.height - 44, Math.max(8, 150 * (world.gap / FARMER.maxGap)), 14, 7);
  ctx.fill();
  if (danger) text(ctx, 'HE\'S RIGHT BEHIND YOU!', 330, VIEW.height - 34, { size: 16, align: 'left', colour: '#ff9d8a' });
}

function panelAt(ctx, cx, w, h) {
  const x = cx - w / 2;
  const y = (VIEW.height - h) / 2 - 10;
  ctx.fillStyle = 'rgba(30, 24, 18, 0.62)';
  roundRect(ctx, x, y, w, h, 22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 233, 176, 0.8)';
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, 22);
  ctx.stroke();
}

function panel(ctx, w, h) {
  panelAt(ctx, VIEW.width / 2, w, h);
}

function statsLines(ctx, world, cx, top) {
  text(ctx, `SCORE  ${world.score}`, cx, top, { size: 30, colour: '#ffe9b0' });
  text(ctx, `Distance ${distanceMeters(world)} m   •   Corn ${world.corn}   •   Time ${world.time.toFixed(1)} s`, cx, top + 40, { size: 21, colour: '#fff' });
}

function drawTitleScreen(ctx, world, now) {
  // The chase, frozen as a poster behind the logo — the turkey bursting off
  // the dinner plate it was meant to be served on.
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.ellipse(748, VIEW.groundY + 8, 128, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d9d4c8';
  ctx.beginPath();
  ctx.ellipse(748, VIEW.groundY + 6, 128, 17, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.save(); // the serving cloche, knocked clean off its plate
  ctx.translate(952, VIEW.groundY - 4);
  ctx.rotate(2.5);
  ctx.fillStyle = '#c8ccd4';
  ctx.beginPath();
  ctx.arc(0, 0, 40, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-40, -3, 80, 6);
  ctx.restore();
  drawTurkey(ctx, { x: 690, bottom: VIEW.groundY, runPhase: now * 11, worried: true, now });
  drawFarmer(ctx, { x: 470, bottom: VIEW.groundY, runPhase: now * 11, reach: 0.55, now });
  ctx.fillStyle = 'rgba(43, 30, 16, 0.35)';
  ctx.fillRect(0, 0, VIEW.width, 300);
  text(ctx, 'OFF THE MENU!', VIEW.width / 2, 118, { size: 100, colour: '#ffd94d', stroke: '#7a2c00', strokeWidth: 14 });
  text(ctx, '— THE GREAT TURKEY ESCAPE —', VIEW.width / 2, 196, { size: 34, colour: '#fff', stroke: '#5b3413', strokeWidth: 7 });
  text(ctx, 'Dinner is at six. You are NOT on the menu.', VIEW.width / 2, 248, { size: 25, colour: '#ffe9b0' });
  text(ctx, `Outrun the farmer for ${RUN.goalMeters} m to reach the Freedom Pines!`, VIEW.width / 2, 282, { size: 22, colour: '#fff' });
  ctx.fillStyle = 'rgba(30, 24, 18, 0.6)';
  roundRect(ctx, VIEW.width / 2 - 330, VIEW.height - 118, 660, 62, 14);
  ctx.fill();
  text(ctx, 'SPACE  jump ×2      ↓ / S  duck & dive      CLICK  jump, HOLD  duck      P  pause      M  sound', VIEW.width / 2, VIEW.height - 86, { size: 20, colour: '#fff' });
  if (Math.floor(now * 1.6) % 2 === 0) {
    text(ctx, 'PRESS SPACE OR CLICK TO RUN!', VIEW.width / 2, VIEW.height - 34, { size: 27, colour: '#ffd94d', stroke: '#7a2c00', strokeWidth: 6 });
  }
}

function drawCaughtScreen(ctx, world, now) {
  ctx.fillStyle = 'rgba(24, 14, 10, 0.45)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Left: the farmer, triumphant, the turkey dangling from his grip by its feet.
  drawFarmer(ctx, { x: 150, bottom: VIEW.groundY, runPhase: 0, reach: 1, now, holding: true });
  ctx.save();
  ctx.translate(252, 490);
  ctx.rotate(Math.PI + Math.sin(now * 2) * 0.07);
  drawTurkey(ctx, { x: -46, bottom: 0, dizzy: true, now });
  ctx.restore();
  // Right: the verdict.
  const cx = 838;
  panelAt(ctx, cx, 600, 250);
  text(ctx, 'CAUGHT!', cx, 262, { size: 64, colour: '#ff8a70', stroke: '#5b1400', strokeWidth: 10 });
  text(ctx, 'The farmer finally got his dinner…', cx, 318, { size: 23, colour: '#fff' });
  text(ctx, `Just ${Math.max(0, RUN.goalMeters - distanceMeters(world))} m short of the Freedom Pines`, cx, 348, { size: 19, colour: '#ffd9c9' });
  statsLines(ctx, world, cx, 392);
  if (Math.floor(now * 1.6) % 2 === 0) {
    text(ctx, 'PRESS R OR CLICK TO RUN AGAIN', cx, 462, { size: 23, colour: '#ffd94d' });
  }
}

function drawEscapedScreen(ctx, world, now) {
  // The Freedom Pines, at last — and the farmer, stopped at the fence line.
  for (const [px, ph] of [[90, 260], [210, 320], [1030, 300], [1160, 250], [960, 210], [300, 200]]) {
    drawPine(ctx, px, VIEW.groundY, ph);
  }
  drawFenceRun(ctx, -30, VIEW.groundY);
  drawFarmer(ctx, { x: 96, bottom: VIEW.groundY, runPhase: 1.2, reach: 0, now });
  text(ctx, 'NEXT YEAR, TURKEY!', 128, VIEW.groundY - 196, { size: 19, colour: '#fff', stroke: 'rgba(60,35,10,0.85)', strokeWidth: 5 });
  drawTurkey(ctx, { x: 560, bottom: VIEW.groundY, celebrate: true, runPhase: now * 4, now });
  drawTurkey(ctx, { x: 730, bottom: VIEW.groundY, celebrate: true, runPhase: now * 4 + 2, now });
  // Falling leaves as confetti.
  for (let i = 0; i < 26; i += 1) {
    const lx = hash(i * 3.1) * VIEW.width;
    const ly = (hash(i * 7.7) * 500 + now * (26 + hash(i) * 30)) % 560;
    ctx.fillStyle = ['#e8862e', '#c96f2e', '#7ed957', '#ffd94d'][i % 4];
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(now * 2 + i);
    ctx.fillRect(-6, -3, 12, 6);
    ctx.restore();
  }
  panel(ctx, 620, 250);
  text(ctx, 'ESCAPED!', VIEW.width / 2, 258, { size: 68, colour: '#a5ec8f', stroke: '#14500f', strokeWidth: 10 });
  text(ctx, 'Free as a bird — see you next Thanksgiving!', VIEW.width / 2, 316, { size: 23, colour: '#fff' });
  statsLines(ctx, world, VIEW.width / 2, 366);
  if (Math.floor(now * 1.6) % 2 === 0) {
    text(ctx, 'PRESS R OR CLICK TO RUN AGAIN', VIEW.width / 2, 442, { size: 23, colour: '#ffd94d' });
  }
}

// --- The frame ---------------------------------------------------------------

export function drawFrame(ctx, world, now) {
  const progress = Math.min(1, distanceMeters(world) / RUN.goalMeters);
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake * 22;
    ctx.translate((hash(Math.floor(now * 40)) - 0.5) * s, (hash(Math.floor(now * 40) + 9) - 0.5) * s);
  }
  drawSky(ctx, world, progress);
  drawHills(ctx, world, progress);
  drawMidground(ctx, world, progress);
  drawGround(ctx, world);

  if (world.screen === 'title') {
    drawTitleScreen(ctx, world, now);
    ctx.restore();
    return;
  }
  if (world.screen === 'escaped') {
    drawEscapedScreen(ctx, world, now);
    ctx.restore();
    return;
  }

  // Items, then the farmer (behind), then the turkey.
  for (const item of world.items) drawItem(ctx, item, now);
  const gapPx = world.gap * 3.4;
  const farmerX = TURKEY.x - 96 - gapPx;
  const caughtPose = world.screen === 'caught';
  if (!caughtPose && farmerX > -190) {
    drawFarmer(ctx, {
      x: farmerX, bottom: VIEW.groundY, runPhase: world.turkey.runPhase * 0.92,
      reach: Math.max(0, 1 - world.gap / 55), now,
    });
  }
  const turkey = world.turkey;
  const airborne = turkey.y < VIEW.groundY - TURKEY.height - 1;
  const blink = world.invincibleFor > 0 && Math.floor(now * 14) % 2 === 0;
  if (!blink && !caughtPose) {
    drawTurkey(ctx, {
      x: TURKEY.x,
      bottom: turkey.y + TURKEY.height,
      runPhase: turkey.runPhase,
      airborne,
      ducking: turkey.ducking,
      worried: world.gap < 34,
      now,
    });
  }
  drawParticles(ctx, world);

  if (world.screen === 'play') {
    drawHud(ctx, world);
    if (world.time < 4) {
      text(ctx, 'Jump the ovens • Duck the knives • Grab corn to stay ahead!', VIEW.width / 2, 120, { size: 21, colour: '#fff', stroke: 'rgba(60,35,10,0.8)', strokeWidth: 5 });
    }
  } else if (caughtPose) {
    drawCaughtScreen(ctx, world, now);
  }
  ctx.restore();
}
