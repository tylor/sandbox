// 2-DOF quarter-car in SI units (m, m/s, kg, N, Pa).
//
// Sprung mass rides on an air spring + 4-way damper above the unsprung
// mass (wheel), which touches ground through a unilateral tire spring.
// The shock's damper/spring live in shaft space and are reflected to wheel
// space through the leverage ratio (force /L, velocity ×1/L → rate /L²).
//
// Sign conventions:
//   z up, positive. s = shaft compression (0 = topped out, stroke = bottom).
//   vShaft = ds/dt > 0 while compressing.
//   Suspension force F > 0 pushes the bodies apart (extension force).

import { GRAVITY, P_ATM, PSI_TO_PA } from './presets.js';

const SUB_HZ = 5000;
const SAMPLE_HZ = 240; // instrumentation ring-buffer rate
const BUFFER_CAP = 2048;

// ---------------------------------------------------------------------------
// Air spring: polytropic gas, F(s) = Pabs·A·(e0/(e0−s))^γ − Patm·A.
// A is a fixed piston area calibrated once so that defaultPressure gives
// sagTarget under the static sprung load.
// ---------------------------------------------------------------------------

export function calibrateArea(preset) {
  const e0 = preset.airColumnRatio * preset.stroke;
  const sSag = preset.sagTarget * preset.stroke;
  const wShaft = preset.sprungMass * GRAVITY * preset.leverage;
  const pAbs = preset.defaultPressure * PSI_TO_PA + P_ATM;
  const ratio = Math.pow(e0 / (e0 - sSag), preset.airGamma);
  return wShaft / (pAbs * ratio - P_ATM);
}

// Static sag (shaft, m) at a given pressure — used for setup + the sag line.
export function sagShaft(preset, area, pressurePsi) {
  const e0 = preset.airColumnRatio * preset.stroke;
  const wShaft = preset.sprungMass * GRAVITY * preset.leverage;
  const pAbs = pressurePsi * PSI_TO_PA + P_ATM;
  const ratio = (wShaft / area + P_ATM) / pAbs;
  if (ratio <= 1) return 0; // pressure so high there's no sag
  const s = e0 * (1 - Math.pow(ratio, -1 / preset.airGamma));
  return Math.min(s, preset.stroke * 0.95);
}

function airForceShaft(preset, area, pAbs, s) {
  const e0 = preset.airColumnRatio * preset.stroke;
  const stroke = preset.stroke;
  let f;
  const sEff = Math.min(s, stroke * 1.03); // guard: keep e0−s well positive
  if (sEff <= 0) {
    // Topped out: gas force at s=0 minus a stiff top-out stop
    f = (pAbs - P_ATM) * area + sEff * 1e5;
  } else {
    f = pAbs * area * Math.pow(e0 / (e0 - sEff), preset.airGamma) - P_ATM * area;
  }
  if (s > stroke) f += (s - stroke) * 2e5; // hard bottom stop
  return f;
}

// ---------------------------------------------------------------------------
// Damper: piecewise force–velocity curve with a C¹-smoothed knee.
// Below the knee the low-speed circuit sets the slope; above it the
// high-speed valve blows off to a shallower slope.
// ---------------------------------------------------------------------------

export function getDamperCoeffs(preset, settings) {
  const r = preset.damperRange;
  const mc = preset.maxClicks;
  const map = ([lo, hi], clicks) => lo + (hi - lo) * (clicks / mc);
  return {
    clsC: map(r.lsc, settings.lsc),
    chsC: map(r.hsc, settings.hsc),
    clsR: map(r.lsr, settings.lsr),
    chsR: map(r.hsr, settings.hsr),
    knee: preset.kneeSpeed,
  };
}

export function damperForceShaft(coeffs, v) {
  const av = Math.abs(v);
  const cls = v >= 0 ? coeffs.clsC : coeffs.clsR;
  const chs = v >= 0 ? coeffs.chsC : coeffs.chsR;
  const k = coeffs.knee;
  const w = k * 0.35; // smoothing half-width
  let f;
  if (av <= k - w) {
    f = cls * av;
  } else if (av >= k + w) {
    f = cls * k + chs * (av - k);
  } else {
    // slope blends linearly cls→chs across the window → quadratic force
    const t = av - (k - w);
    f = cls * (k - w) + cls * t + ((chs - cls) * t * t) / (4 * w);
  }
  return Math.sign(v) * f;
}

// ---------------------------------------------------------------------------
// Simulation
// ---------------------------------------------------------------------------

const TIRE_K = 24000; // N/m — trail tire at ~22psi, big envelope
const TIRE_C = 430;   // N·s/m, ground-relative — knobby casing scrub
const WHEEL_R = 0.35; // m — 29er wheel+tire radius

// The wheel is not a knife-edge follower: a 0.35m-radius circle bridges
// small gaps and turns square faces into ramps (the "attack angle").
// Effective ground height for the wheel's contact point is the highest
// position where the rolling circle touches the raw profile. Evaluated on
// a 4mm grid with a cache since x advances ~1mm per substep.
function makeGround(fn) {
  const GRID = 0.004;
  const SAMPLES = 10; // per side across the contact span
  const cache = new Map();
  const zAt = (i) => {
    let v = cache.get(i);
    if (v === undefined) {
      const x = i * GRID;
      v = -Infinity;
      for (let k = -SAMPLES; k <= SAMPLES; k++) {
        const u = (k / SAMPLES) * WHEEL_R * 0.95;
        const lift = Math.sqrt(WHEEL_R * WHEEL_R - u * u) - WHEEL_R;
        const z = fn(x + u) + lift;
        if (z > v) v = z;
      }
      if (cache.size > 20000) cache.clear();
      cache.set(i, v);
    }
    return v;
  };
  return (x) => {
    const fi = x / GRID;
    const i = Math.floor(fi);
    const a = zAt(i);
    const b = zAt(i + 1);
    return { z: a + (b - a) * (fi - i), slope: (b - a) / GRID };
  };
}

export function createSim(preset, terrain, settings) {
  const area = calibrateArea(preset);
  const L = preset.leverage;
  const wheelTravel = preset.stroke * L;
  const staticLoad = (preset.sprungMass + preset.unsprungMass) * GRAVITY;

  const ground = makeGround(terrain.fn);
  const zg0 = ground(0).z;
  const zu0 = zg0 - staticLoad / TIRE_K; // static tire deflection
  const sag = sagShaft(preset, area, settings.airPressure) * L;
  const zs0 = zu0 + wheelTravel - sag;

  return {
    preset,
    terrain,
    ground,
    settings: { ...settings },
    area,
    wheelTravel,
    staticLoad,
    t: 0,
    x: 0,
    zs: zs0,
    vs: 0,
    zu: zu0,
    vu: 0,
    sampleAcc: 0,
    bottomedOut: false,
    bottomOutTimes: [],
    deepHitTimer: 0,
    out: {
      travelPct: sag / wheelTravel,
      sagPct: sag / wheelTravel,
      vShaft: 0,
      fDamper: 0,
      tireLoad: staticLoad,
      grip: 1,
      airborne: false,
      compressing: false,
      // metrics (exponentially windowed)
      gripAvg: 1,
      accelSqEma: 0,
      rmsAccel: 0,
      meanTravelPct: sag / wheelTravel,
      maxTravelPct: sag / wheelTravel,
      airborneFrac: 0,
      bottomOutCount: 0,
      maxVsUp: 0, // decaying max upward sprung velocity
      // The "buck": how far past sag the rebound overshoots in the moments
      // after a deep compression (decaying max, fraction of travel)
      reboundOvershoot: 0,
    },
    buffer: {
      cap: BUFFER_CAP,
      head: 0,
      count: 0,
      t: new Float32Array(BUFFER_CAP),
      travelPct: new Float32Array(BUFFER_CAP),
      vShaft: new Float32Array(BUFFER_CAP),
      fDamper: new Float32Array(BUFFER_CAP),
      grip: new Float32Array(BUFFER_CAP),
      airborne: new Uint8Array(BUFFER_CAP),
    },
  };
}

// Deep-copy dynamic state (for pinning a ghost baseline mid-run).
export function cloneSim(sim) {
  const c = createSim(sim.preset, sim.terrain, sim.settings);
  c.t = sim.t;
  c.x = sim.x;
  c.zs = sim.zs;
  c.vs = sim.vs;
  c.zu = sim.zu;
  c.vu = sim.vu;
  c.out = { ...sim.out };
  return c;
}

export function stepSim(sim, dtSec) {
  const dt = Math.min(dtSec, 0.05);
  const steps = Math.max(1, Math.ceil(dt * SUB_HZ));
  const h = dt / steps;

  const { preset, terrain, settings, area, wheelTravel, staticLoad, out } = sim;
  const L = preset.leverage;
  const ms = preset.sprungMass;
  const mu = preset.unsprungMass;
  const V = terrain.speed;
  const ground = sim.ground;
  const coeffs = getDamperCoeffs(preset, settings);
  const pAbs = settings.airPressure * PSI_TO_PA + P_ATM;
  out.sagPct = (sagShaft(preset, area, settings.airPressure) * L) / wheelTravel;

  for (let i = 0; i < steps; i++) {
    sim.t += h;
    sim.x += V * h;
    const g = ground(sim.x);
    const zg = g.z;
    const vg = g.slope * V;

    // Suspension (shaft space → wheel space through leverage)
    const uComp = wheelTravel - (sim.zs - sim.zu); // wheel-space compression
    const s = uComp / L;
    const vShaft = (sim.vu - sim.vs) / L;
    const fAir = airForceShaft(preset, area, pAbs, s);
    const fDamp = damperForceShaft(coeffs, vShaft);
    const fWheel = (fAir + fDamp) / L; // extension force in wheel space

    // Tire: unilateral contact, damped against ground-relative velocity
    const defl = zg - sim.zu;
    let fTire = 0;
    if (defl > 0) fTire = Math.max(0, TIRE_K * defl + TIRE_C * (vg - sim.vu));
    const airborne = fTire <= 0;

    const as = fWheel / ms - GRAVITY;
    const au = (-fWheel + fTire) / mu - GRAVITY;

    sim.vs += as * h;
    sim.zs += sim.vs * h;
    sim.vu += au * h;
    sim.zu += sim.vu * h;

    // Outputs + metrics
    const travelPct = Math.max(0, Math.min(1.05, uComp / wheelTravel));
    out.travelPct = travelPct;
    out.vShaft = vShaft;
    out.fDamper = fDamp;
    out.tireLoad = fTire;
    out.airborne = airborne;
    out.compressing = vShaft > 0;

    const gripInst = airborne ? 0 : Math.min(1, fTire / staticLoad);
    const aFast = h / 0.12;
    out.grip += (gripInst - out.grip) * aFast;
    const aSlow = h / 2.5;
    out.gripAvg += (gripInst - out.gripAvg) * aSlow;
    out.accelSqEma += (as * as - out.accelSqEma) * aSlow;
    out.meanTravelPct += (travelPct - out.meanTravelPct) * aSlow;
    out.airborneFrac += ((airborne ? 1 : 0) - out.airborneFrac) * aSlow;
    out.maxTravelPct = Math.max(travelPct, out.maxTravelPct - 0.08 * h);
    out.maxVsUp = Math.max(sim.vs, out.maxVsUp - 0.6 * h);
    if (travelPct > 0.55) sim.deepHitTimer = 1.5;
    else sim.deepHitTimer = Math.max(0, sim.deepHitTimer - h);
    const overshoot = sim.deepHitTimer > 0 ? Math.max(0, out.sagPct - travelPct) : 0;
    out.reboundOvershoot = Math.max(overshoot, out.reboundOvershoot - 0.04 * h);

    // Bottom-out events (rolling 8s count)
    if (travelPct > 0.96 && !sim.bottomedOut) {
      sim.bottomedOut = true;
      sim.bottomOutTimes.push(sim.t);
    } else if (travelPct < 0.90) {
      sim.bottomedOut = false;
    }

    // Instrumentation samples at SAMPLE_HZ
    sim.sampleAcc += h;
    if (sim.sampleAcc >= 1 / SAMPLE_HZ) {
      sim.sampleAcc -= 1 / SAMPLE_HZ;
      const b = sim.buffer;
      b.t[b.head] = sim.t;
      b.travelPct[b.head] = travelPct;
      b.vShaft[b.head] = vShaft;
      b.fDamper[b.head] = fDamp;
      b.grip[b.head] = out.grip;
      b.airborne[b.head] = airborne ? 1 : 0;
      b.head = (b.head + 1) % b.cap;
      b.count = Math.min(b.count + 1, b.cap);
    }
  }

  while (sim.bottomOutTimes.length && sim.bottomOutTimes[0] < sim.t - 8) {
    sim.bottomOutTimes.shift();
  }
  out.bottomOutCount = sim.bottomOutTimes.length;
  out.rmsAccel = Math.sqrt(out.accelSqEma);

  return sim;
}
