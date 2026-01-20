import React, { useEffect, useState } from 'react';
import { SpectrumCanvas } from './SpectrumCanvas';
import { Inspector } from './Inspector';
import { useApp } from './store';

const SCENARIOS = [
  { id: 'starter_uhf_deconflict', label: 'UHF: Deconflict 6 nets' },
  { id: 'starter_wifi_channel_plan', label: 'Wi‑Fi 2.4: Channel planning' },
  { id: 'starter_wifi_5', label: 'Wi‑Fi 5 GHz: Channel planning' },
  { id: 'starter_satcom_carriers', label: 'SATCOM Ku down: Carrier allocation' }
];

export default function App() {
  const { bands, band, setBandById, loadScenarioFromUrl } = useApp();
  const [scenarioId, setScenarioId] = useState<string>('starter_uhf_deconflict');

  useEffect(() => {
    // Load default scenario on first mount.
    void loadScenarioFromUrl(`/scenarios/${scenarioId}.json`).catch(() => {
      // ignore
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="panel" style={{ padding: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Educational Spectrum Planning Sandbox</div>
              <div className="small">
                Choose a band + scenario, then deconflict by adjusting center frequency, bandwidth, power, and spacing.
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <label style={{ minWidth: 380 }}>
              Band
              <select value={band.id} onChange={(e) => setBandById(e.target.value)}>
                {bands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ minWidth: 340 }}>
              Scenario
              <select
                value={scenarioId}
                onChange={(e) => {
                  const id = e.target.value;
                  setScenarioId(id);
                  void loadScenarioFromUrl(`/scenarios/${id}.json`).catch(() => {
                    // ignore
                  });
                }}
              >
                {SCENARIOS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <SpectrumCanvas />
      </div>

      <Inspector />
    </div>
  );
}
