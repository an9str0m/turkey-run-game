// Gobble Run — tuning constants for the whole game.
// Everything gameplay-shaping lives here so the world, the renderer and the
// screenshot staging all read the same numbers.

export const VIEW = {
  width: 1280,
  height: 720,
  groundY: 596, // top edge of the dirt the turkey runs on
};

export const TURKEY = {
  x: 330, // the turkey stays near here; the world scrolls past it
  width: 92,
  height: 76,
  duckHeight: 48,
  gravity: 2500,
  jumpVelocity: -1085,
  doubleJumpVelocity: -945,
  fastFallVelocity: 1500,
};

export const RUN = {
  startSpeed: 385, // px per second at the whistle
  maxSpeed: 715,
  speedRamp: 5.2, // extra px per second, per second survived
  pixelsPerMeter: 46,
  goalMeters: 1000, // reach the Freedom Pines at this distance to escape
};

export const FARMER = {
  startGap: 58, // 0 = his hand is on the turkey's tail feathers
  maxGap: 100,
  pressurePerSecond: 1.55, // how fast he closes in while you just run
  recoveryPerSecond: 0.4, // how fast clean running opens the gap again
  stumblePenalty: 24, // gap lost when the turkey trips on something
  puddlePenalty: 10,
  cornBonus: 2.2,
  goldenBonus: 6,
};

export const ITEMS = {
  cornScore: 100,
  goldenScore: 500,
  invincibleSeconds: 1.25,
  startLives: 3,
};

export const SCREENS = {
  title: 'title',
  play: 'play',
  caught: 'caught',
  escaped: 'escaped',
};
