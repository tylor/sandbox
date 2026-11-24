import React, { useState } from 'react';
import SuspensionTab from './components/SuspensionTab';
import { presets } from './physics/presets';
import { scenarios } from './scenarios';
import './App.css';

const tabs = [
  { key: 'fork', label: 'Fox 38 GRIP2', spec: '170mm · front' },
  { key: 'shock', label: 'Float X2', spec: '176mm · rear' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('fork');
  const [mode, setMode] = useState('sandbox');
  const [scenarioKey, setScenarioKey] = useState(null);

  // A scenario can belong to the other suspension — selecting it switches tabs.
  const selectScenario = (key) => {
    const sc = scenarios.find((s) => s.key === key);
    if (sc && sc.suspension !== activeTab) setActiveTab(sc.suspension);
    setScenarioKey(key);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Suspension Bench</h1>
            <p className="brand-sub">4-way damping, read like a dyno</p>
          </div>
        </div>

        <div className="header-controls">
          <div className="tab-bar" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="tab-name">{tab.label}</span>
                <span className="tab-spec">{tab.spec}</span>
              </button>
            ))}
          </div>

          <div className="mode-switch" role="tablist" aria-label="Mode">
            {['sandbox', 'guided'].map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                className={`mode-btn ${mode === m ? 'active' : ''}`}
                onClick={() => setMode(m)}
              >
                {m === 'sandbox' ? 'Sandbox' : 'Guided'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main>
        <SuspensionTab
          key={activeTab}
          preset={presets[activeTab]}
          suspKey={activeTab}
          mode={mode}
          scenarioKey={scenarioKey}
          onSelectScenario={selectScenario}
        />
      </main>
    </div>
  );
}
