// Acceptance harness for the suspension physics. Run: node test/physics.mjs
// Optional: node test/physics.mjs --report   (operating-point distributions)
//
// These criteria are the contract that makes the visualizer teach anything:
// every knob must produce a large, correctly-signed, terrain-appropriate
// effect, with no numerical blowups anywhere in the settings space.

import { presets } from '../src/physics/presets.js';
import { terrainTypes } from '../src/physics/terrain.js';
import { createSim, stepSim } from '../src/physics/suspension.js';

const terrains = Object.fromEntries(terrainTypes.map((t) => [t.key, t]));
const flat = { key: 'flat', fn: () => 0, speed: 5 };

const READ_HZ = 240;
const WARMUP = 3;

function defaults(preset, over = {}) {
  return { ...preset.defaults, airPressure: preset.defaultPressure, ...over };
}

function run(preset, terrain, settings, seconds) {
  const sim = createSim(preset, terrain, settings);
  const dt = 1 / READ_HZ;
  const accels = [];
  let prevVs = 0;
  let meanTravel = 0, maxTravel = 0, minTravel = 1, n = 0;
  let airborneN = 0, maxVs = -Infinity, bottomOuts = 0, wasBottomed = false;
  let gripSum = 0;
  let finite = true;
  let airEp = 0, longestAir = 0;
  // "Buck": in the 1s after a deep landing, the max upward frame velocity
  // and how far past sag the rebound overshoots (top-out pop)
  let wasAirborne = false, buckWindow = 0, buckVs = 0, buckArmed = false;
  let inLanding = false, buckMinTravel = 1;

  const steps = Math.round(seconds * READ_HZ);
  for (let i = 0; i < steps; i++) {
    stepSim(sim, dt);
    const o = sim.out;
    if (!Number.isFinite(sim.zs) || !Number.isFinite(sim.vu)) { finite = false; break; }
    const t = i * dt;
    if (t < WARMUP) { prevVs = sim.vs; continue; }
    accels.push(Math.abs((sim.vs - prevVs) / dt));
    prevVs = sim.vs;
    meanTravel += o.travelPct; n++;
    maxTravel = Math.max(maxTravel, o.travelPct);
    minTravel = Math.min(minTravel, o.travelPct);
    if (o.airborne) { airborneN++; airEp += dt; longestAir = Math.max(longestAir, airEp); }
    else airEp = 0;
    maxVs = Math.max(maxVs, sim.vs);
    gripSum += o.airborne ? 0 : Math.min(1, o.tireLoad / sim.staticLoad);
    if (o.travelPct > 0.96 && !wasBottomed) { bottomOuts++; wasBottomed = true; }
    else if (o.travelPct < 0.9) wasBottomed = false;
    // buck detection: airborne → contact arms it; a compression past 50%
    // travel (a real landing) starts a 1s observation window
    if (wasAirborne && !o.airborne) buckArmed = true;
    wasAirborne = o.airborne;
    if (buckArmed && o.travelPct > 0.5) { inLanding = true; buckWindow = 1.0; buckArmed = false; }
    if (inLanding) {
      buckVs = Math.max(buckVs, sim.vs);
      buckMinTravel = Math.min(buckMinTravel, o.travelPct);
      buckWindow -= dt;
      if (buckWindow <= 0) inLanding = false;
    }
  }
  const sorted = [...accels].sort((a, b) => a - b);
  const pct = (p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : NaN;
  const rms = Math.sqrt(accels.reduce((s, a) => s + a * a, 0) / Math.max(1, accels.length));
  return {
    finite,
    rmsAccel: rms,
    p99Accel: pct(0.99),
    pkAccel: pct(0.998), // near-max: isolates the repeated face-hit spike
    meanTravel: meanTravel / Math.max(1, n),
    maxTravel,
    minTravel,
    airborneFrac: airborneN / Math.max(1, n),
    longestAir,
    grip: gripSum / Math.max(1, n),
    maxVs,
    buckVs,
    buckMinTravel,
    bottomOuts,
  };
}

function opReport(preset, terrain, settings, seconds) {
  const sim = createSim(preset, terrain, settings);
  const dt = 1 / READ_HZ;
  const vels = [];
  const steps = Math.round(seconds * READ_HZ);
  for (let i = 0; i < steps; i++) {
    stepSim(sim, dt);
    if (i * dt < WARMUP) continue;
    const av = Math.abs(sim.out.vShaft);
    if (av > 0.005) vels.push(av);
  }
  vels.sort((a, b) => a - b);
  const q = (p) => vels.length ? vels[Math.min(vels.length - 1, Math.floor(p * vels.length))] : 0;
  const belowKnee = vels.filter((v) => v < preset.kneeSpeed).length / Math.max(1, vels.length);
  return { belowKnee, p50: q(0.5), p95: q(0.95), max: vels[vels.length - 1] || 0 };
}

// ---------------------------------------------------------------------------

let failures = 0;
function check(name, cond, detail) {
  const tag = cond ? 'PASS' : 'FAIL';
  if (!cond) failures++;
  console.log(`${tag}  ${name}${detail ? `  — ${detail}` : ''}`);
}
const fmt = (x, d = 2) => Number(x).toFixed(d);

if (process.argv.includes('--report')) {
  for (const pk of ['fork', 'shock']) {
    const preset = presets[pk];
    console.log(`\n=== ${preset.name} — shaft-speed operating points (defaults, knee=${preset.kneeSpeed}m/s) ===`);
    for (const t of terrainTypes) {
      const r = opReport(preset, t, defaults(preset), 25);
      const s = run(preset, t, defaults(preset), 25);
      console.log(
        `${t.key.padEnd(8)} belowKnee:${fmt(100 * r.belowKnee, 0).padStart(3)}%  ` +
        `|v| p50:${fmt(r.p50)} p95:${fmt(r.p95)} max:${fmt(r.max)} m/s  ` +
        `travel:${fmt(100 * s.minTravel, 0)}–${fmt(100 * s.maxTravel, 0)}% (mean ${fmt(100 * s.meanTravel, 0)}%)  ` +
        `air:${fmt(100 * s.airborneFrac, 0)}%  grip:${fmt(s.grip)}  rms:${fmt(s.rmsAccel, 1)}`
      );
    }
  }
  process.exit(0);
}

console.log('1. Stability: 60s... (all knob corners × min/max pressure, every terrain)');
{
  let bad = [];
  for (const pk of ['fork', 'shock']) {
    const preset = presets[pk];
    for (const t of terrainTypes) {
      for (let mask = 0; mask < 16; mask++) {
        for (const pr of [preset.minPressure, preset.maxPressure]) {
          const s = defaults(preset, {
            lsc: mask & 1 ? preset.maxClicks : 0,
            hsc: mask & 2 ? preset.maxClicks : 0,
            lsr: mask & 4 ? preset.maxClicks : 0,
            hsr: mask & 8 ? preset.maxClicks : 0,
            airPressure: pr,
          });
          const r = run(preset, t, s, 15);
          if (!r.finite) bad.push(`${pk}/${t.key} mask=${mask} p=${pr}`);
        }
      }
    }
  }
  check('no divergence at any corner setting', bad.length === 0, bad.slice(0, 3).join('; ') || 'all finite');
}

console.log('\n2. LSC support on rollers (fork)');
{
  // Wallow is a travel signature, not an acceleration one: sub-resonant
  // G-outs are low-frequency, so RMS accel barely moves even when the bike
  // is visibly plowing through half its travel. Measure the travel range.
  const lo = run(presets.fork, terrains.rollers, defaults(presets.fork, { lsc: 0 }), 30);
  const hi = run(presets.fork, terrains.rollers, defaults(presets.fork, { lsc: presets.fork.maxClicks }), 30);
  const rangeLo = lo.maxTravel - lo.minTravel;
  const rangeHi = hi.maxTravel - hi.minTravel;
  const change = (rangeLo - rangeHi) / rangeLo;
  check('LSC 0→max shrinks roller travel oscillation >30%', change > 0.3,
    `travel range ${fmt(100 * rangeLo, 0)}% → ${fmt(100 * rangeHi, 0)}% (−${fmt(100 * change, 0)}%), rms ${fmt(lo.rmsAccel, 1)}→${fmt(hi.rmsAccel, 1)} m/s²`);
}

console.log('\n3. LSR packing on braking bumps (fork)');
{
  const fast = run(presets.fork, terrains.braking, defaults(presets.fork, { lsr: 0 }), 30);
  const slow = run(presets.fork, terrains.braking, defaults(presets.fork, { lsr: presets.fork.maxClicks }), 30);
  const sink = slow.meanTravel - fast.meanTravel;
  check('LSR max rides >15% travel deeper (packing)', sink > 0.15,
    `mean travel ${fmt(100 * fast.meanTravel, 0)}% → ${fmt(100 * slow.meanTravel, 0)}% (+${fmt(100 * sink, 0)}%), grip ${fmt(fast.grip)}→${fmt(slow.grip)}`);
}

console.log('\n4. HSR buck on the drop (fork)');
{
  const open = run(presets.fork, terrains.drop, defaults(presets.fork, { hsr: 0 }), 30);
  const closed = run(presets.fork, terrains.drop, defaults(presets.fork, { hsr: presets.fork.maxClicks }), 30);
  // The visible buck: after landing, soft HSR lets the rebound blow back
  // past sag toward top-out (the mule kick); firm HSR settles it.
  const overshoot = closed.buckMinTravel - open.buckMinTravel;
  check('HSR 0 overshoots toward top-out after landing; HSR max holds',
    open.buckMinTravel < 0.07 && overshoot > 0.08,
    `post-landing min travel ${fmt(100 * open.buckMinTravel, 0)}% vs ${fmt(100 * closed.buckMinTravel, 0)}%; frame kick ${fmt(open.buckVs)} vs ${fmt(closed.buckVs)} m/s`);
}

console.log('\n5. HSC effect on square edge (fork)');
{
  const open = run(presets.fork, terrains.square, defaults(presets.fork, { hsc: 0 }), 30);
  const closed = run(presets.fork, terrains.square, defaults(presets.fork, { hsc: presets.fork.maxClicks }), 30);
  // HSC's real trade: open = blows deep into travel with softer peaks,
  // closed = holds the bike up but transmits a sharper jolt. Both sides
  // must show: travel consumption drops a lot, peak accel rises.
  const travelDelta = open.maxTravel - closed.maxTravel;
  const accelRise = (closed.pkAccel - open.pkAccel) / open.pkAccel;
  check('HSC 0→max: >15% less travel consumed AND sharper face-hit jolt',
    travelDelta > 0.15 && accelRise > 0.10,
    `max travel ${fmt(100 * open.maxTravel, 0)}%→${fmt(100 * closed.maxTravel, 0)}%, peak accel ${fmt(open.pkAccel, 1)}→${fmt(closed.pkAccel, 1)} m/s² (+${fmt(100 * accelRise, 0)}%)`);
}

console.log('\n6. Honest travel usage');
{
  for (const pk of ['fork', 'shock']) {
    const preset = presets[pk];
    const sag = run(preset, flat, defaults(preset), 10);
    check(`${pk}: static sag ≈ target (${fmt(100 * preset.sagTarget, 0)}%)`,
      Math.abs(sag.meanTravel - preset.sagTarget) < 0.02,
      `sits at ${fmt(100 * sag.meanTravel, 1)}%`);
  }
  const soft = run(presets.fork, terrains.drop, defaults(presets.fork, { lsc: 2, hsc: 2, lsr: 4, hsr: 2 }), 30);
  check('fork: drop reaches >85% travel at soft settings', soft.maxTravel > 0.85,
    `max ${fmt(100 * soft.maxTravel, 0)}%`);
  const rocks = run(presets.fork, terrains.rocks, defaults(presets.fork), 30);
  check('fork: rock garden uses meaningful travel (30–95%)',
    rocks.maxTravel > 0.3 && rocks.maxTravel < 0.95,
    `max ${fmt(100 * rocks.maxTravel, 0)}%`);
}

console.log('\n7. Ground contact sanity');
{
  // A rigid quarter-car (no rider limbs absorbing) genuinely unweights the
  // wheel over each rock — measured airtime is many sub-150ms hops, never
  // sustained flight. The real regression guard (the old bug was the wheel
  // LAUNCHING for seconds at walking pace) is "no sustained flight", plus a
  // gross cap so the grip readout stays meaningful.
  const rocks = run(presets.fork, terrains.rocks, defaults(presets.fork), 30);
  check('fork: rock garden hops only — no flight >250ms, airborne <30%',
    rocks.longestAir < 0.25 && rocks.airborneFrac < 0.30,
    `${fmt(100 * rocks.airborneFrac, 1)}% airborne, longest ${fmt(1000 * rocks.longestAir, 0)}ms, grip ${fmt(rocks.grip)}`);
  const braking = run(presets.fork, terrains.braking, defaults(presets.fork), 30);
  check('fork: airborne <25% on braking bumps', braking.airborneFrac < 0.25,
    `${fmt(100 * braking.airborneFrac, 1)}%`);
  const rollers = run(presets.fork, terrains.rollers, defaults(presets.fork), 30);
  check('fork: rollers stay grounded (<2%)', rollers.airborneFrac < 0.02,
    `${fmt(100 * rollers.airborneFrac, 1)}%`);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
