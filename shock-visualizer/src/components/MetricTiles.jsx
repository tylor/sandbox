import React from 'react';
import { gripColor } from '../theme';

// Each tile reads the 5Hz snapshot. When a baseline is pinned, the delta vs the
// ghost is shown with direction-aware good/bad colour (green = improvement).
const TILES = [
  {
    key: 'grip',
    label: 'Grip',
    value: (o) => `${Math.round(o.gripAvg * 100)}%`,
    metric: (o) => o.gripAvg,
    fmtDelta: (d) => `${d > 0 ? '+' : ''}${Math.round(d * 100)}%`,
    betterWhen: 'higher',
    accent: (o) => gripColor(o.gripAvg),
  },
  {
    key: 'harsh',
    label: 'Harshness',
    unit: 'm/s²',
    value: (o) => o.rmsAccel.toFixed(1),
    metric: (o) => o.rmsAccel,
    fmtDelta: (d) => `${d > 0 ? '+' : ''}${d.toFixed(1)}`,
    betterWhen: 'lower',
  },
  {
    key: 'ride',
    label: 'Ride height',
    value: (o) => `${Math.round(o.meanTravelPct * 100)}%`,
    sub: (o) => (o.meanTravelPct > o.sagPct + 0.11 ? 'packing' : `sag ${Math.round(o.sagPct * 100)}%`),
    subWarn: (o) => o.meanTravelPct > o.sagPct + 0.11,
    metric: (o) => o.meanTravelPct,
    fmtDelta: (d) => `${d > 0 ? '+' : ''}${Math.round(d * 100)}%`,
    betterWhen: 'lower',
  },
  {
    key: 'max',
    label: 'Max travel',
    value: (o) => `${Math.round(Math.min(1, o.maxTravelPct) * 100)}%`,
    metric: (o) => o.maxTravelPct,
    fmtDelta: (d) => `${d > 0 ? '+' : ''}${Math.round(d * 100)}%`,
    betterWhen: 'lower',
  },
  {
    key: 'bottom',
    label: 'Bottom-outs',
    sub: () => 'per 8s',
    value: (o) => `${o.bottomOutCount}`,
    metric: (o) => o.bottomOutCount,
    fmtDelta: (d) => `${d > 0 ? '+' : ''}${d}`,
    betterWhen: 'lower',
  },
  {
    key: 'buck',
    label: 'Buck',
    sub: () => 'rebound past sag',
    value: (o) => `${Math.round(o.reboundOvershoot * 100)}%`,
    metric: (o) => o.reboundOvershoot,
    fmtDelta: (d) => `${d > 0 ? '+' : ''}${Math.round(d * 100)}%`,
    betterWhen: 'lower',
  },
];

function deltaClass(delta, betterWhen) {
  if (Math.abs(delta) < 1e-4) return 'flat';
  const improved = betterWhen === 'higher' ? delta > 0 : delta < 0;
  return improved ? 'good' : 'bad';
}

export default function MetricTiles({ out, ghostOut }) {
  if (!out) return <div className="metric-tiles" />;
  return (
    <div className="metric-tiles">
      {TILES.map((t) => {
        const warn = t.subWarn && t.subWarn(out);
        const delta = ghostOut ? t.metric(out) - t.metric(ghostOut) : null;
        return (
          <div className="metric-tile" key={t.key}>
            <div className="tile-label">{t.label}</div>
            <div className="tile-value" style={t.accent ? { color: t.accent(out) } : undefined}>
              {t.value(out)}
              {t.unit && <span className="tile-unit">{t.unit}</span>}
            </div>
            {t.sub && (
              <div className={`tile-sub ${warn ? 'warn' : ''}`}>{t.sub(out)}</div>
            )}
            {delta != null && (
              <div className={`tile-delta ${deltaClass(delta, t.betterWhen)}`}>
                {t.fmtDelta(delta)} <span className="tile-delta-tag">vs pin</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
