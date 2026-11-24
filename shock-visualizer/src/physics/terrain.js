// Terrain generators. Each terrain is a pure deterministic function
// z_g(x) → ground height in meters (x in meters travelled), plus the speed
// it's ridden at. Determinism matters: the ghost/baseline sim replays the
// exact same ground, so trajectory differences are purely settings.

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(t) {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

// Repeating rounded humps ~0.7m apart, 50–75mm tall, with slight
// per-bump height variation. The classic corner-entry washboard.
export function brakingBumps(x) {
  const period = 0.7;
  const i = Math.floor(x / period);
  const pos = x - i * period;
  const amp = 0.035 + 0.018 * hash(i);
  return amp * 0.5 * (1 - Math.cos((2 * Math.PI * pos) / period));
}

// Pseudo-random cosine boulders (40–120mm, 0.2–0.45m wide) on a bed of
// small chatter. Cells of 0.55m, each with one bump placed by hash.
export function rockGarden(x) {
  const cell = 0.8;
  let h = 0;
  const ci = Math.floor(x / cell);
  for (let i = ci - 1; i <= ci + 1; i++) {
    const H = 0.025 + 0.05 * hash(i * 3 + 1);
    const halfW = 0.14 + 0.14 * hash(i * 3 + 2);
    const center = (i + 0.25 + 0.5 * hash(i * 3)) * cell;
    const d = Math.abs(x - center);
    if (d < halfW) h += H * 0.5 * (1 + Math.cos((Math.PI * d) / halfW));
  }
  return h;
}

// Repeated curb/rock face: sharp 0.17m step-up over 50mm, short flat top,
// gentle ramp back down. Pure high-speed compression event.
export function squareEdge(x) {
  const period = 6;
  const pos = ((x % period) + period) % period;
  const H = 0.15;
  if (pos < 2.0) return 0;
  if (pos < 2.05) return H * smoothstep((pos - 2.0) / 0.05);
  if (pos < 3.5) return H;
  if (pos < 4.3) return H * (1 - smoothstep((pos - 3.5) / 0.8));
  return 0;
}

// Long swooping undulations near the sprung resonance — the terrain where
// low-speed support (or wallow) shows up.
export function rollers(x) {
  return (
    0.075 * Math.sin((2 * Math.PI * x) / 7) +
    0.025 * Math.sin((2 * Math.PI * x) / 4.3 + 1.2)
  );
}

// Descending staircase: 4m of flat, a 0.5m drop-off, then ~10m of flat
// landing before the next one. Never climbs back up — a climb would put
// steady upward frame velocity into the "buck" metric and mask the rebound
// kick that this terrain exists to isolate.
export function drop(x) {
  const period = 14;
  const i = Math.floor(x / period);
  const pos = x - i * period;
  const D = 0.5;
  const base = -D * i;
  if (pos < 4.0) return base;
  if (pos < 4.05) return base - D * smoothstep((pos - 4.0) / 0.05);
  return base - D;
}

export const terrainTypes = [
  {
    key: 'braking',
    label: 'Braking Bumps',
    description: 'Washboard into a corner',
    speed: 5,
    teaches: 'LSR — too slow and the fork packs down',
    fn: brakingBumps,
  },
  {
    key: 'rocks',
    label: 'Rock Garden',
    description: 'Random 25–75mm hits',
    speed: 3.2,
    teaches: 'HSC spike vs LSR recovery',
    fn: rockGarden,
  },
  {
    key: 'square',
    label: 'Square Edge',
    description: 'Repeated curb-height faces',
    speed: 5.5,
    teaches: 'HSC — harshness on sharp hits',
    fn: squareEdge,
  },
  {
    key: 'rollers',
    label: 'Rollers',
    description: 'Swooping undulations',
    speed: 6.5,
    teaches: 'LSC — support vs wallow',
    fn: rollers,
  },
  {
    key: 'drop',
    label: 'Drop',
    description: '0.45m drop to flat',
    speed: 7,
    teaches: 'HSR — buck vs mule-kick recovery',
    fn: drop,
  },
];
