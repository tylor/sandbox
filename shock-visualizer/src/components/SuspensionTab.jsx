import React, { useEffect, useRef, useState } from 'react';
import SimScene from './SimScene';
import DamperCurve from './DamperCurve';
import TravelTrace from './TravelTrace';
import MetricTiles from './MetricTiles';
import DamperControls from './DamperControls';
import ScenarioPanel from './ScenarioPanel';
import { terrainTypes } from '../physics/terrain';
import { createSim, cloneSim, stepSim } from '../physics/suspension';
import { scenarios, scenarioMisset, scenarioFix, baseSettings } from '../scenarios';

const TIME_SCALES = [
  { v: 1, label: 'Play', glyph: '▶' },
  { v: 0.25, label: 'Slow-mo', glyph: '◑' },
  { v: 0, label: 'Pause', glyph: '❚❚' },
];

export default function SuspensionTab({
  preset, suspKey, mode, scenarioKey, onSelectScenario,
}) {
  const [settings, setSettings] = useState(() => baseSettings(preset));
  const [terrainKey, setTerrainKey] = useState(terrainTypes[0].key);
  const [timeScale, setTimeScale] = useState(1);
  const [activeKnob, setActiveKnob] = useState(null);
  const [ghostPinned, setGhostPinned] = useState(false);
  const [runNonce, setRunNonce] = useState(0);
  const [outSnap, setOutSnap] = useState(null);
  const [ghostOutSnap, setGhostOutSnap] = useState(null);

  const terrain = terrainTypes.find((t) => t.key === terrainKey);

  // Refs read by the draw loops + step loop without re-subscribing.
  const simRef = useRef(null);
  const ghostRef = useRef(null);
  const settingsRef = useRef(settings);
  const timeScaleRef = useRef(timeScale);
  settingsRef.current = settings; // always current before any effect runs
  timeScaleRef.current = timeScale;

  // (Re)create the live sim when the preset, terrain, or run resets. Reads the
  // current settings via the ref so a fresh sim starts from the live tune.
  useEffect(() => {
    simRef.current = createSim(preset, terrain, settingsRef.current);
    ghostRef.current = null;
    setGhostPinned(false);
    setOutSnap({ ...simRef.current.out });
    setGhostOutSnap(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, terrainKey, runNonce]);

  // Live-apply settings to the running sim; the ghost keeps its frozen tune.
  useEffect(() => {
    if (simRef.current) simRef.current.settings = { ...settings };
  }, [settings]);

  // Single stepping loop — the ONLY place physics advances. Ghost steps with the
  // identical dt so determinism keeps the two runs in exact lockstep.
  useEffect(() => {
    let raf;
    let last = performance.now();
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.033, (now - last) / 1000) * timeScaleRef.current;
      last = now;
      if (dt > 0 && simRef.current) {
        stepSim(simRef.current, dt);
        if (ghostRef.current) stepSim(ghostRef.current, dt);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 5Hz snapshot for the tiles + scenario checker.
  useEffect(() => {
    const id = setInterval(() => {
      if (simRef.current) setOutSnap({ ...simRef.current.out });
      setGhostOutSnap(ghostRef.current ? { ...ghostRef.current.out } : null);
    }, 200);
    return () => clearInterval(id);
  }, []);

  // Guided mode: applying a scenario sets its terrain + mis-set tune and forces
  // a fresh run so the fault is reproduced from the top.
  useEffect(() => {
    if (mode !== 'guided') return;
    const sc = scenarios.find((s) => s.key === scenarioKey && s.suspension === suspKey);
    if (!sc) return;
    setSettings(scenarioMisset(sc, preset));
    setTerrainKey(sc.terrainKey);
    setRunNonce((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioKey, mode, suspKey]);

  const activeScenario =
    mode === 'guided'
      ? scenarios.find((s) => s.key === scenarioKey && s.suspension === suspKey) || null
      : null;

  const pinBaseline = () => {
    if (!simRef.current) return;
    ghostRef.current = cloneSim(simRef.current);
    setGhostPinned(true);
    setGhostOutSnap({ ...ghostRef.current.out });
  };
  const clearBaseline = () => {
    ghostRef.current = null;
    setGhostPinned(false);
    setGhostOutSnap(null);
  };

  const applyScenarioSettings = (partial) => setSettings(partial);

  return (
    <div className="suspension-tab">
      {mode === 'guided' && (
        <ScenarioPanel
          activeScenarioKey={scenarioKey}
          activeScenario={activeScenario}
          out={outSnap}
          onSelect={onSelectScenario}
          onShowMe={() => applyScenarioSettings(scenarioFix(activeScenario, preset))}
          onReset={() => applyScenarioSettings(scenarioMisset(activeScenario, preset))}
        />
      )}

      <div className="instrument-grid">
        <div className="panel scene-wrap">
          <SimScene key={terrainKey} simRef={simRef} ghostRef={ghostRef} />
        </div>
        <div className="panel curve-wrap">
          <div className="panel-head">Damper dyno · force vs shaft speed</div>
          <DamperCurve
            preset={preset}
            settings={settings}
            activeKnob={activeKnob}
            simRef={simRef}
            ghostRef={ghostRef}
          />
        </div>
      </div>

      <div className="panel trace-wrap">
        <div className="panel-head">Travel over time · last 8s</div>
        <TravelTrace simRef={simRef} ghostRef={ghostRef} />
      </div>

      <MetricTiles out={outSnap} ghostOut={ghostPinned ? ghostOutSnap : null} />

      <div className="control-bar">
        <div className="toolbar">
          <div className="toolbar-group">
            <span className="toolbar-label">Terrain</span>
            <div className="terrain-picker">
              {terrainTypes.map((t) => (
                <button
                  key={t.key}
                  className={`terrain-btn ${terrainKey === t.key ? 'active' : ''}`}
                  onClick={() => setTerrainKey(t.key)}
                  title={t.teaches}
                  disabled={mode === 'guided'}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="toolbar-group">
            <span className="toolbar-label">Time</span>
            <div className="timescale-picker">
              {TIME_SCALES.map((ts) => (
                <button
                  key={ts.v}
                  className={`ts-btn ${timeScale === ts.v ? 'active' : ''}`}
                  onClick={() => setTimeScale(ts.v)}
                  title={ts.label}
                >
                  <span className="ts-glyph">{ts.glyph}</span>
                </button>
              ))}
            </div>
          </div>

          {mode === 'sandbox' && (
            <div className="toolbar-group">
              <span className="toolbar-label">Baseline</span>
              {ghostPinned ? (
                <button className="btn ghost" onClick={clearBaseline}>Clear pin</button>
              ) : (
                <button className="btn accent" onClick={pinBaseline}>Pin baseline</button>
              )}
            </div>
          )}
        </div>

        <DamperControls
          settings={settings}
          preset={preset}
          onChange={setSettings}
          onActive={setActiveKnob}
          activeKnob={activeKnob}
          sagPct={outSnap ? outSnap.sagPct : null}
        />
      </div>
    </div>
  );
}
