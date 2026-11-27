// Keyboard and mouse input, gathered in one place. The game polls `pressed`
// for one-shot actions (jump, start, restart) and reads `ducking` as a level.

export const input = {
  ducking: false,
  pressed: new Set(),
  clicked: false,
  pointerHeld: false,
  pointerDownAt: 0,
};

const DUCK_KEYS = new Set(['ArrowDown', 'KeyS']);
const JUMP_KEYS = new Set(['ArrowUp', 'KeyW', 'Space']);

export function bindInput(canvas, onAnyGesture) {
  window.addEventListener('keydown', (event) => {
    if (JUMP_KEYS.has(event.code) || DUCK_KEYS.has(event.code) || event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      event.preventDefault();
    }
    if (event.repeat) return;
    onAnyGesture();
    if (JUMP_KEYS.has(event.code)) input.pressed.add('jump');
    if (event.code === 'Enter') input.pressed.add('confirm');
    if (event.code === 'KeyR') input.pressed.add('restart');
    if (event.code === 'KeyP' || event.code === 'Escape') input.pressed.add('pause');
    if (event.code === 'KeyM') input.pressed.add('mute');
    if (DUCK_KEYS.has(event.code)) input.ducking = true;
  });
  window.addEventListener('keyup', (event) => {
    if (DUCK_KEYS.has(event.code)) input.ducking = false;
  });
  canvas.addEventListener('pointerdown', () => {
    onAnyGesture();
    input.clicked = true;
    input.pressed.add('jump');
    input.pointerHeld = true;
    input.pointerDownAt = performance.now();
  });
  window.addEventListener('pointerup', () => {
    input.pointerHeld = false;
  });
  window.addEventListener('pointercancel', () => {
    input.pointerHeld = false;
  });
}

// Ducking is the down key, or a pointer held down past a tap: a quick click
// jumps, a press-and-hold ducks, so mouse-only play can do both.
export function readDucking() {
  return input.ducking || (input.pointerHeld && performance.now() - input.pointerDownAt > 170);
}

export function takePress(action) {
  if (!input.pressed.has(action)) return false;
  input.pressed.delete(action);
  return true;
}

export function endFrame() {
  input.pressed.clear();
  input.clicked = false;
}
