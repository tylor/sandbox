import React, { useEffect, useRef, useState } from 'react';
import { scenarios, SOLVE_HOLD_MS } from '../scenarios';

const SUSP_LABEL = { fork: 'Fork', shock: 'Shock' };

export default function ScenarioPanel({
  activeScenarioKey, activeScenario, out, onSelect, onShowMe, onReset,
}) {
  const [solved, setSolved] = useState(false);
  const [hold, setHold] = useState(0); // 0..1 progress toward solved
  const holdStartRef = useRef(null);

  // Reset diagnosis state whenever the selected scenario changes.
  useEffect(() => {
    setSolved(false);
    setHold(0);
    holdStartRef.current = null;
  }, [activeScenarioKey]);

  // Evaluate the check on each 5Hz snapshot; require a continuous hold.
  useEffect(() => {
    if (!activeScenario || !out || solved) return;
    if (activeScenario.check(out)) {
      const now = performance.now();
      if (holdStartRef.current == null) holdStartRef.current = now;
      const held = now - holdStartRef.current;
      if (held >= SOLVE_HOLD_MS) {
        setSolved(true);
        setHold(1);
      } else {
        setHold(held / SOLVE_HOLD_MS);
      }
    } else {
      holdStartRef.current = null;
      setHold(0);
    }
  }, [out, activeScenario, solved]);

  const handleReset = () => {
    setSolved(false);
    setHold(0);
    holdStartRef.current = null;
    onReset();
  };

  return (
    <section className="scenario-panel">
      <div className="scenario-list">
        <div className="scenario-eyebrow">Diagnose the ride</div>
        <div className="scenario-chips">
          {scenarios.map((s) => (
            <button
              key={s.key}
              className={`scenario-chip ${activeScenarioKey === s.key ? 'active' : ''}`}
              onClick={() => onSelect(s.key)}
            >
              <span className="chip-susp">{SUSP_LABEL[s.suspension]}</span>
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {activeScenario ? (
        <div className="scenario-detail">
          <div className="scenario-symptom">
            <span className="quote-mark">“</span>
            {activeScenario.symptom}
          </div>

          {!solved && (
            <>
              <div className="scenario-hint">{activeScenario.hint}</div>
              <div className="scenario-actions">
                <div
                  className={`hold-meter ${hold > 0 ? 'active' : ''}`}
                  role="progressbar"
                  aria-valuenow={Math.round(hold * 100)}
                >
                  <div className="hold-fill" style={{ width: `${hold * 100}%` }} />
                  <span className="hold-label">
                    {hold > 0 ? 'holding…' : 'tune until it holds 3s'}
                  </span>
                </div>
                <button className="btn ghost" onClick={onShowMe}>Show me</button>
                <button className="btn ghost" onClick={handleReset}>Reset</button>
              </div>
            </>
          )}

          <div className={`scenario-explain ${solved ? 'open' : ''}`}>
            <div className="explain-inner">
              <div className="solved-badge">Solved</div>
              <p>{activeScenario.explanation}</p>
              <div className="scenario-actions">
                <button className="btn ghost" onClick={handleReset}>Try again</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="scenario-detail scenario-empty">
          Pick a symptom above. Read what the rider feels, then tune the clickers
          until the fault clears and holds — the physics reveals itself when it does.
        </div>
      )}
    </section>
  );
}
