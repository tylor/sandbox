import React, { useEffect, useRef } from 'react';
import { C, gripColor, rgba, fitCanvas } from '../theme';

// Honest, per-axis scale — no state-dependent exaggeration. X shows ~13m of
// trail so you watch the drop arrive; Y is stretched so 170mm of travel is a
// legible ~70px without distorting the terrain profile's own proportions.
const X_SCALE = 70; // px per m horizontal
const Y_SCALE = 400; // px per m vertical
const WHEEL_R = 26; // px, fixed schematic radius
const WHEEL_R_M = 0.35; // physical radius used only to spin the spokes
const CAM_TAU = 0.8; // s, vertical camera smoothing

// Front-of-bike side view, facing left (direction of travel). The one cue that
// must read instantly is the fork compressing: the exposed gold stanchion
// between the crown and the lowers shrinks as the sprung mass drops toward the
// axle. Everything else is a quiet silhouette so that motion stands out.
function drawBike(ctx, sx, axleY, frameY, opts) {
  const { grip, ghost } = opts;
  const gold = ghost ? rgba(C.ghost, 0.55) : C.gold;
  const lowersCol = ghost ? rgba(C.ghost, 0.4) : '#333B45';
  const metal = ghost ? rgba(C.ghost, 0.5) : '#5A6672';
  const rim = ghost ? rgba(C.ghost, 0.55) : C.ink2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Fork axis: axle → crown. Crown sits up and behind the axle (bike faces
  // left), giving the head-angle rake. Its length changes with compression.
  const crownX = sx + 30;
  const crownY = frameY;
  let ux = crownX - sx, uy = crownY - axleY;
  const forkLen = Math.hypot(ux, uy) || 1;
  ux /= forkLen; uy /= forkLen;
  const lowersLen = Math.min(46, forkLen * 0.72); // fixed-length casting
  const lx = sx + ux * lowersLen;
  const ly = axleY + uy * lowersLen;

  // rear frame anchors, relative to the crown
  const bbX = crownX + 92, bbY = crownY + 26;      // bottom bracket
  const seatX = crownX + 74, seatY = crownY - 34;  // seat cluster
  const headTopX = crownX + 5, headTopY = crownY - 15;

  // --- rear triangle / stays (drawn faint, behind) ---
  ctx.strokeStyle = metal;
  ctx.lineWidth = ghost ? 2.5 : 3;
  ctx.beginPath();
  ctx.moveTo(bbX, bbY); ctx.lineTo(seatX, seatY);      // seat tube
  ctx.moveTo(headTopX, headTopY); ctx.lineTo(seatX, seatY); // top tube
  ctx.moveTo(headTopX, headTopY); ctx.lineTo(bbX, bbY);     // down tube
  ctx.stroke();
  // saddle + seatpost
  ctx.lineWidth = ghost ? 2.5 : 3;
  ctx.beginPath();
  ctx.moveTo(seatX, seatY); ctx.lineTo(seatX + 2, seatY - 8);
  ctx.moveTo(seatX - 9, seatY - 9); ctx.lineTo(seatX + 13, seatY - 7); // saddle
  ctx.stroke();
  // handlebar + stem off the head tube
  ctx.beginPath();
  ctx.moveTo(headTopX, headTopY); ctx.lineTo(headTopX - 16, headTopY - 6);
  ctx.stroke();

  // head tube (short, connects crown to top/down tubes)
  ctx.strokeStyle = metal;
  ctx.lineWidth = ghost ? 4 : 5;
  ctx.beginPath();
  ctx.moveTo(crownX, crownY); ctx.lineTo(headTopX, headTopY);
  ctx.stroke();

  // --- fork: exposed stanchion (gold) then lowers (dark casting) ---
  ctx.strokeStyle = gold;
  ctx.lineWidth = ghost ? 3.5 : 4.5;
  ctx.beginPath();
  ctx.moveTo(lx, ly); ctx.lineTo(crownX, crownY);
  ctx.stroke();

  ctx.strokeStyle = lowersCol;
  ctx.lineWidth = ghost ? 7 : 9;
  ctx.beginPath();
  ctx.moveTo(sx, axleY); ctx.lineTo(lx, ly);
  ctx.stroke();

  // crown block
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(crownX, crownY, ghost ? 3 : 4, 0, Math.PI * 2);
  ctx.fill();

  // --- front wheel ---
  ctx.strokeStyle = rim;
  ctx.lineWidth = ghost ? 3 : 4;               // tyre
  ctx.beginPath();
  ctx.arc(sx, axleY, WHEEL_R, 0, Math.PI * 2);
  ctx.stroke();

  const spin = opts.spin || 0;
  ctx.strokeStyle = ghost ? rgba(C.ghost, 0.3) : rgba(C.ink3, 0.9);
  ctx.lineWidth = 1;
  for (let k = 0; k < 5; k++) {
    const a = spin + (k * Math.PI * 2) / 5;
    ctx.beginPath();
    ctx.moveTo(sx, axleY);
    ctx.lineTo(sx + Math.cos(a) * (WHEEL_R - 4), axleY + Math.sin(a) * (WHEEL_R - 4));
    ctx.stroke();
  }
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(sx, axleY, 2, 0, Math.PI * 2);
  ctx.fill();

  // contact patch arc, coloured by grip (ghost stays neutral)
  if (!ghost) {
    ctx.strokeStyle = gripColor(grip);
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(sx, axleY, WHEEL_R, Math.PI * 0.32, Math.PI * 0.68);
    ctx.stroke();
  }
}

export default function SimScene({ simRef, ghostRef }) {
  const canvasRef = useRef(null);
  const camRef = useRef(null); // EMA of wheel height
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    let last = performance.now();

    const frame = (now) => {
      rafRef.current = requestAnimationFrame(frame);
      const sim = simRef.current;
      if (!sim) return;
      const ghost = ghostRef.current;
      const { ctx, w, h } = fitCanvas(canvas);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const out = sim.out;
      const wheelX = w * 0.25;
      const groundZ = sim.terrain.fn(sim.x);

      // vertical camera follows the wheel, smoothed
      if (camRef.current == null) camRef.current = sim.zu;
      const a = 1 - Math.exp(-dt / CAM_TAU);
      camRef.current += (sim.zu - camRef.current) * a;
      const camZ = camRef.current;
      const camPy = h * 0.62; // wheel sits low so the frame above stays in frame

      const sy = (z) => camPy - (z - camZ) * Y_SCALE;
      const spx = (x) => wheelX + (x - sim.x) * X_SCALE;

      // ---- background ----
      ctx.fillStyle = C.panel;
      ctx.fillRect(0, 0, w, h);

      // ---- terrain profile ----
      ctx.beginPath();
      let first = true;
      for (let px = -8; px <= w + 8; px += 3) {
        const wx = sim.x + (px - wheelX) / X_SCALE;
        const z = sim.terrain.fn(wx);
        const py = sy(z);
        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else ctx.lineTo(px, py);
      }
      ctx.lineTo(w + 8, h + 8);
      ctx.lineTo(-8, h + 8);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, sy(groundZ) - 20, 0, h);
      grad.addColorStop(0, '#232A33');
      grad.addColorStop(1, '#12161B');
      ctx.fillStyle = grad;
      ctx.fill();
      // surface hairline
      ctx.strokeStyle = rgba(C.gold, 0.35);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      first = true;
      for (let px = -8; px <= w + 8; px += 3) {
        const wx = sim.x + (px - wheelX) / X_SCALE;
        const py = sy(sim.terrain.fn(wx));
        if (first) { ctx.moveTo(px, py); first = false; } else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // ---- sag reference: frame height at static sag ----
      const sagFrameZ = sim.zu + sim.wheelTravel * (1 - out.sagPct);
      const sagY = sy(sagFrameZ);
      ctx.strokeStyle = rgba(C.ink3, 0.6);
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, sagY);
      ctx.lineTo(w, sagY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.ink3;
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('SAG', 8, sagY - 5);

      // ---- ghost baseline behind live ----
      if (ghost) {
        drawBike(ctx, wheelX, sy(ghost.zu), sy(ghost.zs), {
          grip: ghost.out.grip,
          ghost: true,
          spin: ghost.x / WHEEL_R_M,
        });
      }

      // ---- live bike ----
      drawBike(ctx, wheelX, sy(sim.zu), sy(sim.zs), {
        grip: out.grip,
        ghost: false,
        spin: sim.x / WHEEL_R_M,
      });

      // ---- bottom-out flash ----
      if (out.travelPct > 0.96) {
        ctx.strokeStyle = rgba(C.gripBad, 0.9);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(wheelX, sy(sim.zu), WHEEL_R + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = C.gripBad;
        ctx.font = '700 11px ui-monospace, monospace';
        ctx.fillText('BOTTOM-OUT', wheelX - 34, sy(sim.zu) - WHEEL_R - 16);
      }

      // ---- airborne indicator ----
      if (out.airborne) {
        ctx.fillStyle = C.goldBright;
        ctx.font = '700 12px ui-monospace, monospace';
        ctx.fillText('AIR', wheelX - 12, sy(sim.zu) + WHEEL_R + 20);
      }

      // ---- travel gauge, right edge ----
      const gx = w - 26;
      const gTop = 24;
      const gH = h - 90;
      ctx.fillStyle = rgba(C.ink3, 0.25);
      ctx.fillRect(gx, gTop, 8, gH);
      const tp = Math.max(0, Math.min(1, out.travelPct));
      ctx.fillStyle = gripColor(out.grip);
      ctx.fillRect(gx, gTop, 8, gH * tp);
      // sag tick on gauge
      ctx.strokeStyle = C.ink2;
      ctx.lineWidth = 1;
      const sagTickY = gTop + gH * out.sagPct;
      ctx.beginPath();
      ctx.moveTo(gx - 3, sagTickY);
      ctx.lineTo(gx + 11, sagTickY);
      ctx.stroke();

      // ---- HUD ----
      ctx.fillStyle = C.ink;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(sim.terrain.label, 12, 22);
      ctx.fillStyle = C.ink2;
      ctx.font = '11px ui-monospace, monospace';
      const kmh = (sim.terrain.speed * 3.6).toFixed(0);
      ctx.fillText(
        `${sim.terrain.speed.toFixed(1)} m/s · ${kmh} km/h`,
        12,
        38
      );
      ctx.fillStyle = C.ink2;
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillText(`travel ${(out.travelPct * 100).toFixed(0)}%`, gx - 66, gTop - 8);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [simRef, ghostRef]);

  return <canvas ref={canvasRef} className="sim-scene" />;
}
