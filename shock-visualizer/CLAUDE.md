# Suspension Bench

Interactive teaching tool for Fox 38 GRIP2 fork and Fox Float X2 rear shock. Builds intuition for how 4-way damping (LSC, HSC, LSR, HSR) plus air pressure affect wheel tracking, ride height, and harshness across different terrain — by instrumenting a physically honest quarter-car sim with a live damper dyno curve, a travel trace, and metric tiles, plus guided diagnosis scenarios.

## Tech Stack

- Parcel + React (JSX, hooks; matches sibling `360-video-example` project)
- Canvas 2D for all rendering (scene + dyno curve + travel trace)
- Hand-rolled quarter-car physics in SI units (no libraries)

## Commands

- `npm start` — dev server with hot reload
- `npm run build` — production build to `dist/` for GitHub Pages (`--public-url ./`)
- `node test/physics.mjs` — physics acceptance harness (must pass before touching physics)
- `node test/physics.mjs --report` — shaft-speed operating-point report per terrain

## Architecture

### Physics (`src/physics/`) — SI units throughout (m, m/s, kg, N, Pa)

**2-DOF quarter-car** (`suspension.js`): sprung mass on an air spring + 4-way damper above the unsprung mass (wheel), which contacts ground through a unilateral tire spring.

- **Air spring** — polytropic gas: `F = Pabs·A·(e0/(e0−s))^1.3 − Patm·A`. Piston area `A` is calibrated once (`calibrateArea`) so the default pressure gives target sag (fork 20%, shock 30%) under static sprung load. The pressure slider changes `Pabs` directly; `sagShaft` inverts the model for the sag readout. Progression is real, not an ad-hoc cubic. Stiff top-out and bottom-out stops.
- **Damper** — piecewise force–velocity curve per side (`damperForceShaft`): low-speed slope `c_ls` below the knee, high-speed blow-off slope `c_hs` above it, with a C¹-smoothed knee. Clicks map linearly to coefficients via `getDamperCoeffs`. This curve is exactly what `DamperCurve.jsx` plots.
- **Tire** — unilateral contact spring (`TIRE_K`) + ground-relative damping (`TIRE_C`); force clamps at ≥0, wheel goes airborne when it would go tensile. **No position clamping** (the old model's launch bug). A `makeGround` wrapper convolves the raw terrain with a 0.35m wheel radius so the tire bridges gaps and rounds square faces (the attack-angle effect) — this is what keeps the wheel grounded on rough terrain.
- **Leverage** — shock damper/spring live in shaft space; wheel-space motion goes through the leverage ratio (force ÷L, rate ÷L²).
- **Integration** — semi-implicit Euler, 5000 Hz substeps. Deterministic given (terrain, settings) — required for exact ghost/baseline alignment.
- **Instrumentation** — `sim.out` holds live scalars (travelPct, vShaft, fDamper, grip, airborne, plus windowed metrics: gripAvg, rmsAccel, meanTravelPct, maxTravelPct, bottomOutCount, reboundOvershoot). `sim.buffer` is a 240 Hz ring buffer feeding the curve trail and travel trace.
- `createSim` / `stepSim` / `cloneSim` are the public API; `cloneSim` snapshots a running sim as the grey baseline ghost.

`terrain.js` — five pure deterministic `z_g(x)→m` generators, each with a ridden `speed` and the knob it teaches: braking bumps (LSR/packing), rock garden (HSC/LSR), square edge (HSC), rollers (LSC/wallow), drop (HSR/buck, a descending staircase so no climb pollutes the buck metric).

`presets.js` — SI constants for both units: stroke, leverage, masses, sag target, air-spring geometry, knee speed, and the `damperRange` click→coefficient ranges. `PSI_TO_PA`, `P_ATM`, `GRAVITY` exported here.

### Rendering & UI (`src/components/`, `src/theme.js`, `src/scenarios.js`)

- `SuspensionTab.jsx` — owns `simRef`/`ghostRef`; the **single** rAF loop that advances physics (`dt = min(33ms, elapsed)×timeScale`, ghost stepped with identical dt for lockstep). 5 Hz snapshot interval drives the tiles + scenario checker. Pin/clear baseline (sandbox), scenario application (guided).
- `SimScene.jsx` — large canvas, honest anisotropic scale (X 70 px/m, Y 400 px/m — **no state-dependent exaggeration**), EMA vertical camera. Draws terrain, a side-view bike whose gold fork stanchion visibly telescopes into the lowers as it compresses, grip-tinted contact patch, sag line, bottom-out/airborne flags, travel gauge, and the grey baseline ghost.
- `DamperCurve.jsx` — the force–velocity dyno plot (compression upper-right, rebound lower-left). Four segments; dragging a knob brightens its segment (the knob→curve-region mapping is the core teaching device). Live operating point + ~2s heat trail from the ring buffer; ghost dot when pinned. F-axis fixed from max-click coeffs so it doesn't jump while dragging.
- `TravelTrace.jsx` — 8s scrolling strip, 0% travel at top / 100% at bottom, sag line, airborne shading, bottom-out marks, ghost line.
- `MetricTiles.jsx` — grip, harshness (RMS accel), ride height (flags packing), max travel, bottom-outs, buck (rebound past sag); each shows a direction-aware delta vs the pinned baseline.
- `DamperControls.jsx` / `ControlKnob.jsx` — LSC/HSC/LSR/HSR sliders + air pressure with live sag badge; `onActive(key)` feeds `activeKnob` to the curve.
- `ScenarioPanel.jsx` + `scenarios.js` — guided mode: 6 diagnosis exercises, each a rider-language symptom from a deliberately mis-set tune; `check(out)` must hold continuously for `SOLVE_HOLD_MS` to unlock the physics explanation. `theme.js` holds the shared canvas palette + `gripColor` ramp + `fitCanvas` DPR helper.
- `App.jsx` — fork/shock tabs (remount via `key`) + Sandbox|Guided switch.

## Physics & calibration notes

The model is validated by `test/physics.mjs`, which encodes the contract that makes the tool teach: **every knob must produce a large, correctly-signed, terrain-appropriate effect, with no blowups anywhere in the settings space.** Run it (and the scenario check) after any physics change.

Lessons carried from the earlier broken version and this rewrite:

1. **Units must be consistent.** Everything is SI now; the old mm/ms/kg mix caused 1000× force imbalances. Keep it SI.
2. **Realistic speed matters.** The old sim ran at 0.2 m/s so shaft speeds never reached the high-speed regime and HSC/HSR did nothing. Terrains now specify real ride speeds (3–8 m/s) and the knee lives where the operating points actually straddle it (see `--report`).
3. **No position clamping on the wheel.** Forcing `wheelY ≥ groundY` injected energy and launched the wheel (59% airborne on 8mm chatter). Use a unilateral contact *force* instead; let the wheel leave the ground honestly.
4. **The wheel has a radius.** `makeGround` (0.35m envelope) is what turns "skitters off every rock" into realistic tracking — don't treat the contact point as a knife edge.
5. **Symptoms are the right metrics, not just RMS accel.** Wallow is a travel-range signature; packing is a ride-height drift; buck is rebound overshoot past sag. The acceptance tests and scenario checks measure the *symptom*, and thresholds are tuned to sit in the gap between the mis-set and fixed tunes (see `scenarios.js` `T`).
6. **Determinism is load-bearing.** The ghost baseline replays the identical ground; both sims must step with the same dt. Don't introduce randomness into `stepSim`.
7. **Test in Node before the browser.** `node test/physics.mjs` must be green before touching rendering.
