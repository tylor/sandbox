// Shared visual tokens for the canvas instruments. The CSS in App.css mirrors
// these as custom properties; canvas 2D can't read CSS vars cheaply, so the
// source of truth for pixel drawing lives here. Palette is grounded in Fox
// hardware: Kashima-gold stanchions on a cool graphite chassis.

export const C = {
  bg: '#0F1216',        // page plane
  panel: '#161A20',     // chart surface
  raised: '#1D222A',    // tiles / controls
  line: '#262C35',      // hairline grid
  edge: '#333B45',      // stronger border
  ink: '#E9ECF0',       // primary
  ink2: '#98A2AE',      // secondary
  ink3: '#5E6873',      // muted (axis labels)
  gold: '#D8A94B',      // Kashima accent
  goldBright: '#EFC169',
  comp: '#3987E5',      // compression (cool)
  reb: '#D95926',       // rebound (warm)
  gripGood: '#0CA30C',
  gripWarn: '#FAB219',
  gripBad: '#D03B3B',
  ghost: '#7A8592',     // baseline overlay
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(h1, h2, t) {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  return `rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(
    lerp(a[1], b[1], t)
  )},${Math.round(lerp(a[2], b[2], t))})`;
}

// grip 0 (lost) → red, 0.5 → amber, 1 (planted) → green.
// Sanctioned status ramp; strong lightness spread keeps it legible under CVD.
export function gripColor(g) {
  const t = Math.max(0, Math.min(1, g));
  if (t < 0.5) return mix(C.gripBad, C.gripWarn, t / 0.5);
  return mix(C.gripWarn, C.gripGood, (t - 0.5) / 0.5);
}

export function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Size a canvas to its container with devicePixelRatio backing and return a
// context already scaled to logical (CSS) pixels. Cheap enough to call each
// frame — it only touches canvas.width when the layout actually changed.
export function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
