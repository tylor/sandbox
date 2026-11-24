// Guided-mode diagnosis exercises. Each presents a rider-language symptom from a
// deliberately mis-set suspension; the learner tunes until `check(out)` holds
// continuously for the required hold time, then the physics explanation unlocks.
//
// THRESHOLDS — these gate "solved" and will be recalibrated after physics
// tuning. Kept together and named so they're a single edit surface.
export const SOLVE_HOLD_MS = 3000; // check(out) must stay true this long

// Calibrated empirically (scratchpad scenario sweeps, 2026-07): each value
// sits in the gap between the mis-set tune's range and the fix's range so
// the mis-set never satisfies the check and the fix holds continuously.
const T = {
  packRideHeightMargin: 0.09, // meanTravel must recover to within sag+this
  packGripFloor: 0.60,
  harshMaxTravelFloor: 0.66, // fork must actually use travel on the face
  harshRms: 9.5, // m/s² ceiling for "square edges tamed"
  wallowMaxTravel: 0.52,
  wallowOvershoot: 0.04, // near-zero rebound overshoot = settled, not seasick
  buckOvershoot: 0.165, // fraction of travel blown past sag after landing
  overdampGrip: 0.64,
  overdampRms: 7.8,
  springSagFloor: 0.26, // sag must sink to at least this fraction
};

export const scenarios = [
  {
    key: 'brake-pack',
    title: 'Packing under braking',
    suspension: 'fork',
    terrainKey: 'braking',
    missetSettings: { lsr: 15 },
    symptom:
      'Into the third corner the fork is riding low and skipping — it never recovers between bumps, and the front feels vague right when I need to trust it.',
    hint: 'Watch the ride-height tile drift below sag as the bumps stack up. Which circuit controls how fast the fork returns after each hit?',
    fix: { lsr: 6 },
    explanation:
      'Low-speed rebound was cranked so slow the fork could not re-extend between the closely-spaced braking bumps, so each impact started deeper than the last — classic packing-down. Opening LSR lets it recover to ride height between hits, keeping the tire loaded and the geometry where you expect it.',
    check: (o) =>
      o.meanTravelPct < o.sagPct + T.packRideHeightMargin &&
      o.gripAvg > T.packGripFloor,
  },
  {
    key: 'square-harsh',
    title: 'Harsh on square edges',
    suspension: 'fork',
    terrainKey: 'square',
    missetSettings: { hsc: 16 },
    symptom:
      'Every curb and square-edged rock punches straight into my hands. It is not bottoming — it just feels like the fork refuses to get out of the way.',
    hint: 'The spikes hit hard and fast. That is the high-speed compression valve talking, not the low-speed one.',
    fix: { hsc: 4 },
    explanation:
      'High-speed compression was maxed, so the sharp, fast shaft speeds from square edges met a wall of damping and transmitted the hit into the bars instead of absorbing it. Backing off HSC lets the valve blow off on fast impacts while low-speed support stays intact.',
    check: (o) =>
      o.maxTravelPct > T.harshMaxTravelFloor && o.rmsAccel < T.harshRms,
  },
  {
    key: 'roller-wallow',
    title: 'Wallowing through rollers',
    suspension: 'shock',
    terrainKey: 'rollers',
    missetSettings: { lsc: 1 },
    symptom:
      'On flowy, rolling trail the back end feels seasick — it dives into every dip and wallows through the transitions instead of holding a line.',
    hint: 'The motion is slow and deep, near the spring resonance. Which compression circuit gives low-speed support?',
    fix: { lsc: 12 },
    explanation:
      'With almost no low-speed compression the shock had nothing resisting the slow, deep shaft speeds of rolling terrain, so it sank through its travel and wallowed. Adding LSC gives platform-like support against slow inputs without harshening fast hits.',
    check: (o) =>
      o.maxTravelPct < T.wallowMaxTravel && o.reboundOvershoot < T.wallowOvershoot,
  },
  {
    key: 'drop-buck',
    title: 'Bucked off the drop',
    suspension: 'shock',
    terrainKey: 'drop',
    missetSettings: { hsr: 0 },
    symptom:
      'Coming off the drop the bike kicks me forward — the rear snaps back so fast on landing it tries to pitch me over the bars.',
    hint: 'The buck is the rear extending too violently after the big compression. High-speed rebound controls that recovery.',
    fix: { hsr: 12 },
    explanation:
      'High-speed rebound was fully open, so after the deep compression of the landing the shock released its stored energy all at once and flung the frame upward — the buck. Adding HSR meters that fast return so the bike settles instead of catapulting.',
    check: (o) => o.reboundOvershoot < T.buckOvershoot,
  },
  {
    key: 'over-damped',
    title: 'Dead everywhere',
    suspension: 'fork',
    terrainKey: 'rocks',
    missetSettings: { lsc: 14, hsc: 14, lsr: 14, hsr: 12 },
    symptom:
      'Someone wound every dial in. The fork feels wooden in the rock garden — it barely moves, deflects off everything, and the front tire skates instead of gripping.',
    hint: 'All four circuits are near max. Grip comes from the tire tracking the ground — too much damping stops the wheel from following the terrain.',
    fix: { lsc: 6, hsc: 5, lsr: 7, hsr: 5 },
    explanation:
      'Over-damping on every circuit stopped the wheel from moving fast enough to follow the rocks, so the tire skipped across the tops and lost contact — grip collapsed. Bringing all four back toward sensible mid-range lets the wheel track the ground, which is where traction actually comes from.',
    check: (o) => o.gripAvg > T.overdampGrip && o.rmsAccel < T.overdampRms,
  },
  {
    key: 'spring-not-damper',
    title: 'It is the spring, not the damper',
    suspension: 'fork',
    terrainKey: 'rollers',
    missetSettings: null, // filled per-preset below (needs minPressure)
    missetFrom: (p) => ({ airPressure: p.minPressure + 5 }),
    symptom:
      'I keep fiddling with clickers but the fork blows through its travel and sits way too deep. No amount of damping seems to fix the ride height.',
    hint: 'Check your sag before touching a single clicker. Damping controls speed of motion, not where the fork rests.',
    fixFrom: (p) => ({ airPressure: p.defaultPressure }),
    explanation:
      'The air pressure was far too low, so sag was enormous and the fork rode deep no matter what the dampers did — damping controls how fast the suspension moves, never its resting height. Setting pressure for correct sag fixes ride height at the source; only then do the clickers do their job.',
    check: (o) => o.sagPct < T.springSagFloor && o.bottomOutCount === 0,
  },
];

// Merge a scenario's mis-set (or fix) settings over the preset defaults.
export function baseSettings(preset) {
  return {
    lsc: preset.defaults.lsc,
    hsc: preset.defaults.hsc,
    lsr: preset.defaults.lsr,
    hsr: preset.defaults.hsr,
    airPressure: preset.defaultPressure,
  };
}

export function scenarioMisset(scenario, preset) {
  const partial = scenario.missetFrom
    ? scenario.missetFrom(preset)
    : scenario.missetSettings || {};
  return { ...baseSettings(preset), ...partial };
}

export function scenarioFix(scenario, preset) {
  const partial = scenario.fixFrom ? scenario.fixFrom(preset) : scenario.fix || {};
  return { ...baseSettings(preset), ...partial };
}
