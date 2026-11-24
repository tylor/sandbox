// SI units throughout: m, m/s, kg, N, Pa.
//
// Damper click→coefficient ranges and air-spring geometry are calibrated
// against the acceptance criteria in test/physics.mjs — retune there, not here.
//
// Damper coefficients are N·s/m *at the damper shaft*. The shock sees wheel
// motion through the leverage ratio; suspension.js converts. Click convention
// matches the physical knobs rendered in the UI: higher slider value = more
// damping (CW on GRIP2 / X2 hardware).

export const PSI_TO_PA = 6894.76;
export const P_ATM = 101325; // Pa
export const GRAVITY = 9.81; // m/s²

export const presets = {
  fork: {
    name: 'Fox 38 GRIP2',
    stroke: 0.170,         // m of shaft travel
    leverage: 1,           // wheel travel = stroke × leverage
    maxClicks: 16,
    defaultPressure: 85,   // psi (≈180lb rider per Fox chart)
    minPressure: 55,
    maxPressure: 115,
    pressureUnit: 'psi',
    sagTarget: 0.20,       // fraction of travel at static equilibrium
    sprungMass: 35,        // kg — front share of bike + 80kg rider
    unsprungMass: 4.5,     // kg — wheel + tire + lowers
    airGamma: 1.3,         // polytropic exponent
    airColumnRatio: 1.15,  // equivalent air column e0 = ratio × stroke
    kneeSpeed: 0.18,       // m/s shaft speed where HS circuit takes over
    // [min, max] N·s/m at shaft, indexed by click fraction (0 = fully open)
    damperRange: {
      lsc: [150, 1600],
      hsc: [100, 650],
      lsr: [220, 2000],
      hsr: [110, 2100],
    },
    defaults: { lsc: 8, hsc: 6, lsr: 8, hsr: 6 },
    labels: {
      lsc: { name: 'LSC', full: 'Low-Speed Compression', desc: 'Support under pumping, brake dive, berms' },
      hsc: { name: 'HSC', full: 'High-Speed Compression', desc: 'Square-edge & big-hit harshness' },
      lsr: { name: 'LSR', full: 'Low-Speed Rebound', desc: 'Return speed; too slow = packing' },
      hsr: { name: 'HSR', full: 'High-Speed Rebound', desc: 'Recovery from deep hits; too fast = buck' },
    },
    helpText: 'All GRIP2 adjusters: higher = CW = more damping = firmer',
  },
  shock: {
    name: 'Fox Float X2',
    stroke: 0.065,
    leverage: 2.7,         // ≈176mm rear wheel travel
    maxClicks: 16,
    defaultPressure: 195,
    minPressure: 140,
    maxPressure: 260,
    pressureUnit: 'psi',
    sagTarget: 0.30,
    sprungMass: 52,        // kg — rear share of bike + rider
    unsprungMass: 5.5,     // kg — wheel + tire + swingarm share
    airGamma: 1.3,
    airColumnRatio: 1.18,
    kneeSpeed: 0.15,
    // Shaft-space coefficients; wheel-space effect is /leverage²
    damperRange: {
      lsc: [1100, 11000],
      hsc: [700, 4800],
      lsr: [1600, 14500],
      hsr: [950, 10000],
    },
    defaults: { lsc: 8, hsc: 6, lsr: 8, hsr: 6 },
    labels: {
      lsc: { name: 'LSC', full: 'Low-Speed Compression', desc: 'Pedal support, pumping, G-outs' },
      hsc: { name: 'HSC', full: 'High-Speed Compression', desc: 'Square-edge & landing harshness' },
      lsr: { name: 'LSR', full: 'Low-Speed Rebound', desc: 'Return speed; too slow = packing' },
      hsr: { name: 'HSR', full: 'High-Speed Rebound', desc: 'Recovery from deep hits; too fast = buck' },
    },
    helpText: 'All Float X2 adjusters: higher = CW = more damping = firmer',
  },
};
