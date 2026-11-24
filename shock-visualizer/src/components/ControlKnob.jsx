import React from 'react';

// A single 4-way clicker. `active` brightens it and fires onActive(key|null) on
// pointer/focus so the DamperCurve can highlight the matching force–velocity
// region — the knob↔curve link is the teaching mechanism.
export default function ControlKnob({
  knobKey, label, fullName, description, value, max, onChange, onActive, active,
}) {
  return (
    <div className={`control-knob ${active ? 'active' : ''}`}>
      <div className="knob-header">
        <span className="knob-label">{label}</span>
        <span className="knob-value">{value}<span className="knob-max">/{max}</span></span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        aria-label={`${fullName} — ${value} of ${max} clicks`}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        onPointerDown={() => onActive && onActive(knobKey)}
        onPointerUp={() => onActive && onActive(null)}
        onFocus={() => onActive && onActive(knobKey)}
        onBlur={() => onActive && onActive(null)}
        className="knob-slider"
      />
      <div className="knob-desc">{description}</div>
    </div>
  );
}
