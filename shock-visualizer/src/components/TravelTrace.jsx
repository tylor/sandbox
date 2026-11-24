import React, { useEffect, useRef } from 'react';
import { C, rgba, fitCanvas } from '../theme';

// Scrolling time series of travel over the last WINDOW seconds. 0% (topped out)
// is at the TOP and 100% (bottomed) at the BOTTOM, so "using travel" reads as
// the trace sinking — the same visual metaphor as the fork compressing.

const WINDOW = 8; // s
const PAD_T = 10;
const PAD_B = 16;
const PAD_R = 44;

export default function TravelTrace({ simRef, ghostRef }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;

    const frame = () => {
      rafRef.current = requestAnimationFrame(frame);
      const sim = simRef.current;
      const { ctx, w, h } = fitCanvas(canvas);
      if (!sim) return;
      const now = sim.t;
      const plotH = h - PAD_T - PAD_B;
      const plotW = w - PAD_R;

      const tx = (t) => plotW * (1 - (now - t) / WINDOW);
      const ty = (pct) => PAD_T + Math.max(0, Math.min(1.05, pct)) * plotH;

      ctx.fillStyle = C.panel;
      ctx.fillRect(0, 0, w, h);

      const b = sim.buffer;

      // airborne shading (draw first, behind everything)
      ctx.fillStyle = rgba(C.goldBright, 0.08);
      for (let i = 0; i < b.count; i++) {
        const idx = (b.head - b.count + i + b.cap) % b.cap;
        if (now - b.t[idx] > WINDOW) continue;
        if (b.airborne[idx]) {
          const x = tx(b.t[idx]);
          ctx.fillRect(x - 1, PAD_T, 2.5, plotH);
        }
      }

      // horizontal reference grid at 0/50/100%
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 1;
      ctx.fillStyle = C.ink3;
      ctx.font = '9px ui-monospace, monospace';
      ctx.textAlign = 'left';
      [0, 0.5, 1].forEach((p) => {
        const y = ty(p);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(plotW, y);
        ctx.stroke();
        ctx.fillText(`${p * 100}%`, plotW + 6, y + 3);
      });

      // sag line
      const sagY = ty(sim.out.sagPct);
      ctx.strokeStyle = rgba(C.ink2, 0.7);
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, sagY);
      ctx.lineTo(plotW, sagY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.ink2;
      ctx.fillText('sag', plotW + 6, sagY + 3);

      // time ticks every 1s
      ctx.strokeStyle = rgba(C.line, 0.8);
      ctx.fillStyle = C.ink3;
      ctx.textAlign = 'center';
      for (let s = Math.ceil(now - WINDOW); s <= now; s++) {
        if (s < 0) continue;
        const x = tx(s);
        ctx.beginPath();
        ctx.moveTo(x, PAD_T + plotH);
        ctx.lineTo(x, PAD_T + plotH + 3);
        ctx.stroke();
      }

      // ghost trace
      const ghost = ghostRef.current;
      if (ghost) {
        const gb = ghost.buffer;
        ctx.strokeStyle = rgba(C.ghost, 0.8);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < gb.count; i++) {
          const idx = (gb.head - gb.count + i + gb.cap) % gb.cap;
          if (now - gb.t[idx] > WINDOW) continue;
          const x = tx(gb.t[idx]);
          const y = ty(gb.travelPct[idx]);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // live travel trace
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < b.count; i++) {
        const idx = (b.head - b.count + i + b.cap) % b.cap;
        if (now - b.t[idx] > WINDOW) continue;
        const x = tx(b.t[idx]);
        const y = ty(b.travelPct[idx]);
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // bottom-out markers
      ctx.fillStyle = C.gripBad;
      let wasBottom = false;
      for (let i = 0; i < b.count; i++) {
        const idx = (b.head - b.count + i + b.cap) % b.cap;
        if (now - b.t[idx] > WINDOW) continue;
        const bottom = b.travelPct[idx] > 0.96;
        if (bottom && !wasBottom) {
          const x = tx(b.t[idx]);
          ctx.beginPath();
          ctx.arc(x, ty(1), 3, 0, Math.PI * 2);
          ctx.fill();
        }
        wasBottom = bottom;
      }

      ctx.textAlign = 'left';
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [simRef, ghostRef]);

  return <canvas ref={canvasRef} className="travel-trace" />;
}
