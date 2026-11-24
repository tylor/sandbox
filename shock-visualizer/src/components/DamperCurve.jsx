import React, { useEffect, useRef } from 'react';
import { C, rgba, fitCanvas } from '../theme';
import { getDamperCoeffs, damperForceShaft } from '../physics/suspension';

// Force–velocity dyno plot. Dyno convention: compression in the upper-right
// quadrant (v>0, F>0), rebound lower-left. The knob→curve-region mapping is the
// core teaching device — dragging a slider brightens exactly the segment it owns.

const PAD_L = 46;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 30;

// Which shaft-velocity range each knob owns (sign + speed band).
function segmentOf(v, knee) {
  if (v >= 0) return v <= knee ? 'lsc' : 'hsc';
  return v >= -knee ? 'lsr' : 'hsr';
}

export default function DamperCurve({ preset, settings, activeKnob, simRef, ghostRef }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const settingsRef = useRef(settings);
  const activeRef = useRef(activeKnob);
  settingsRef.current = settings;
  activeRef.current = activeKnob;

  // Axis bounds computed once per preset from max-click coeffs so the frame
  // stays rock-steady while dragging.
  const vMax = 3.0 / preset.leverage;
  const fMax = (() => {
    const maxc = getDamperCoeffs(preset, {
      lsc: preset.maxClicks, hsc: preset.maxClicks,
      lsr: preset.maxClicks, hsr: preset.maxClicks,
    });
    return Math.max(
      Math.abs(damperForceShaft(maxc, vMax)),
      Math.abs(damperForceShaft(maxc, -vMax))
    ) * 1.05;
  })();

  useEffect(() => {
    const canvas = canvasRef.current;

    const frame = () => {
      rafRef.current = requestAnimationFrame(frame);
      const sim = simRef.current;
      const { ctx, w, h } = fitCanvas(canvas);
      const s = settingsRef.current;
      const active = activeRef.current;
      const coeffs = getDamperCoeffs(preset, s);
      const knee = coeffs.knee;

      const plotW = w - PAD_L - PAD_R;
      const plotH = h - PAD_T - PAD_B;
      const cx = PAD_L + plotW / 2; // v = 0
      const cy = PAD_T + plotH / 2; // F = 0
      const vx = (v) => cx + (v / vMax) * (plotW / 2);
      const fy = (f) => cy - (f / fMax) * (plotH / 2);

      ctx.fillStyle = C.panel;
      ctx.fillRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, PAD_T); ctx.lineTo(cx, PAD_T + plotH);
      ctx.moveTo(PAD_L, cy); ctx.lineTo(PAD_L + plotW, cy);
      ctx.stroke();

      // knee guides
      ctx.strokeStyle = rgba(C.ink3, 0.5);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(vx(knee), PAD_T); ctx.lineTo(vx(knee), PAD_T + plotH);
      ctx.moveTo(vx(-knee), PAD_T); ctx.lineTo(vx(-knee), PAD_T + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      // axis labels
      ctx.fillStyle = C.ink3;
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('COMPRESSION →', cx + plotW / 4, PAD_T + plotH + 18);
      ctx.fillText('← REBOUND', cx - plotW / 4, PAD_T + plotH + 18);
      ctx.textAlign = 'right';
      ctx.fillText(`${(fMax / 1000).toFixed(1)}kN`, PAD_L - 6, PAD_T + 10);
      ctx.fillText('0', PAD_L - 6, cy + 3);
      ctx.textAlign = 'left';
      ctx.save();
      ctx.translate(12, cy);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('DAMPER FORCE', 0, 0);
      ctx.restore();

      // region labels near their segments
      ctx.font = '600 10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      const dim = (key) => (active && active !== key ? rgba(C.ink3, 0.5) : C.ink2);
      ctx.fillStyle = dim('lsc'); ctx.fillText('LSC', vx(knee * 0.15), fy(damperForceShaft(coeffs, knee * 0.5)) - 8);
      ctx.fillStyle = dim('hsc'); ctx.fillText('HSC', vx(knee + (vMax - knee) * 0.45), fy(damperForceShaft(coeffs, knee + (vMax - knee) * 0.6)) - 8);
      ctx.textAlign = 'right';
      ctx.fillStyle = dim('lsr'); ctx.fillText('LSR', vx(-knee * 0.15), fy(damperForceShaft(coeffs, -knee * 0.5)) + 16);
      ctx.fillStyle = dim('hsr'); ctx.fillText('HSR', vx(-(knee + (vMax - knee) * 0.45)), fy(damperForceShaft(coeffs, -(knee + (vMax - knee) * 0.6))) + 16);

      // ---- the curve, drawn per-segment so we can highlight one ----
      const drawSeg = (vFrom, vTo, key) => {
        const isActive = active === key;
        const dimmed = active && !isActive;
        const base = vFrom >= 0 ? C.comp : C.reb;
        ctx.strokeStyle = isActive ? C.goldBright : dimmed ? rgba(base, 0.28) : base;
        ctx.lineWidth = isActive ? 3.5 : 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const steps = 40;
        for (let i = 0; i <= steps; i++) {
          const v = vFrom + ((vTo - vFrom) * i) / steps;
          const f = damperForceShaft(coeffs, v);
          if (i === 0) ctx.moveTo(vx(v), fy(f));
          else ctx.lineTo(vx(v), fy(f));
        }
        ctx.stroke();
      };
      drawSeg(-vMax, -knee, 'hsr');
      drawSeg(-knee, 0, 'lsr');
      drawSeg(0, knee, 'lsc');
      drawSeg(knee, vMax, 'hsc');

      // ---- fading operating-point trail from the ring buffer (~2s) ----
      if (sim) {
        const b = sim.buffer;
        const now = sim.t;
        for (let i = 0; i < b.count; i++) {
          const idx = (b.head - b.count + i + b.cap) % b.cap;
          const age = now - b.t[idx];
          if (age > 2) continue;
          const v = b.vShaft[idx];
          const f = b.fDamper[idx];
          const alpha = (1 - age / 2) * 0.5;
          ctx.fillStyle = rgba(v >= 0 ? C.comp : C.reb, alpha);
          ctx.beginPath();
          ctx.arc(vx(v), fy(f), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // ghost operating point
        const ghost = ghostRef.current;
        if (ghost) {
          ctx.fillStyle = rgba(C.ghost, 0.9);
          ctx.beginPath();
          ctx.arc(vx(ghost.out.vShaft), fy(ghost.out.fDamper), 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // live operating point with surface ring
        const out = sim.out;
        ctx.beginPath();
        ctx.arc(vx(out.vShaft), fy(out.fDamper), 6, 0, Math.PI * 2);
        ctx.fillStyle = C.panel; // ring
        ctx.fill();
        ctx.beginPath();
        ctx.arc(vx(out.vShaft), fy(out.fDamper), 4.5, 0, Math.PI * 2);
        ctx.fillStyle = C.goldBright;
        ctx.fill();
      }

      ctx.textAlign = 'left';
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [preset, simRef, ghostRef, vMax, fMax]);

  return <canvas ref={canvasRef} className="damper-curve" />;
}
