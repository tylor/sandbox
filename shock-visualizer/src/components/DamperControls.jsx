import React from 'react';
import ControlKnob from './ControlKnob';

export default function DamperControls({
  settings, preset, onChange, onActive, activeKnob, sagPct,
}) {
  const { maxClicks, labels } = preset;
  const set = (key) => (val) => onChange({ ...settings, [key]: val });

  const sagOk = sagPct != null && sagPct >= preset.sagTarget - 0.05 && sagPct <= preset.sagTarget + 0.05;

  const knob = (key) => (
    <ControlKnob
      knobKey={key}
      label={labels[key].name}
      fullName={labels[key].full}
      description={labels[key].desc}
      value={settings[key]}
      max={maxClicks}
      onChange={set(key)}
      onActive={onActive}
      active={activeKnob === key}
    />
  );

  return (
    <div className="damper-controls">
      <div className="controls-row">
        <div className="controls-group">
          <div className="group-label">Compression</div>
          <div className="knobs-pair">{knob('lsc')}{knob('hsc')}</div>
        </div>
        <div className="controls-group">
          <div className="group-label">Rebound</div>
          <div className="knobs-pair">{knob('lsr')}{knob('hsr')}</div>
        </div>
        <div className="controls-group air-group">
          <div className="group-label">
            Air spring
            <span className={`sag-badge ${sagOk ? 'ok' : ''}`}>
              sag {sagPct != null ? `${Math.round(sagPct * 100)}%` : '—'}
            </span>
          </div>
          <div className="air-pressure-control">
            <div className="pressure-label">
              <span>{settings.airPressure}<span className="knob-max"> {preset.pressureUnit}</span></span>
              <span className="pressure-target">target {Math.round(preset.sagTarget * 100)}%</span>
            </div>
            <input
              type="range"
              min={preset.minPressure}
              max={preset.maxPressure}
              step={1}
              value={settings.airPressure}
              aria-label="Air pressure"
              onChange={(e) => onChange({ ...settings, airPressure: parseInt(e.target.value, 10) })}
              className="pressure-slider"
            />
            <div className="knob-desc">Sets sag &amp; ride height — not a damping control</div>
          </div>
        </div>
      </div>
      <div className="help-text">{preset.helpText}</div>
    </div>
  );
}
