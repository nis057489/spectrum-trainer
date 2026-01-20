import React, { useMemo } from 'react';
import { useApp } from './store';
import { conflicts, sinrEstimates_dB } from './model';

export const Inspector: React.FC = () => {
  const { txs, selectedId, profiles, updateTx, removeTx, addTx, scenario, resetToScenario } = useApp();
  const tx = txs.find((t) => t.id === selectedId) ?? null;

  const conf = useMemo(() => conflicts(txs), [txs]);
  const sinr = useMemo(() => sinrEstimates_dB(txs), [txs]);

  const conflictsForSelected = tx
    ? conf.filter((c) => c.aId === tx.id || c.bId === tx.id)
    : [];

  return (
    <div className="panel" style={{ padding: 12, width: 380 }}>
      <h3>Spectrum Planner (Training)</h3>

      {scenario ? (
        <div style={{ marginBottom: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="badge">Scenario</span>
            <button onClick={() => resetToScenario()}>Reset scenario</button>
          </div>
          <div style={{ fontWeight: 600, marginTop: 6 }}>{scenario.name}</div>
          <div className="small" style={{ marginTop: 4 }}>{scenario.description}</div>
        </div>
      ) : null}

      <div className="row">
        <button onClick={() => addTx()}>+ Add net</button>
      </div>

      <hr />

      {tx ? (
        <>
          <h4>Selected: {tx.name}</h4>

          <div className="controls">
            <label>
              Name
              <input value={tx.name} onChange={(e) => updateTx(tx.id, { name: e.target.value })} />
            </label>

            <label>
              Profile
              <select
                value={tx.profile.name}
                onChange={(e) => {
                  const p = profiles.find((x) => x.name === e.target.value)!;
                  updateTx(tx.id, {
                    profile: p,
                    bwHz: p.defaultBWHz,
                    spacingHz: p.defaultSpacingHz
                  });
                }}
              >
                {profiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Center frequency
              <input
                type="number"
                value={(tx.fcHz / 1e6).toFixed(6)}
                onChange={(e) => updateTx(tx.id, { fcHz: Number(e.target.value) * 1e6 })}
              />
              <div className="small">Units: MHz</div>
            </label>

            <label>
              Bandwidth
              <input
                type="number"
                value={(tx.bwHz / 1e3).toFixed(1)}
                onChange={(e) => updateTx(tx.id, { bwHz: Number(e.target.value) * 1e3 })}
              />
              <div className="small">Units: kHz</div>
            </label>

            <label>
              Channel spacing (grid)
              <input
                type="number"
                value={(tx.spacingHz / 1e3).toFixed(1)}
                onChange={(e) => updateTx(tx.id, { spacingHz: Number(e.target.value) * 1e3, fcHz: tx.fcHz })}
              />
              <div className="small">Units: kHz</div>
            </label>

            <label>
              Snap to grid
              <select
                value={tx.snapToGrid ? 'on' : 'off'}
                onChange={(e) => updateTx(tx.id, { snapToGrid: e.target.value === 'on', fcHz: tx.fcHz })}
              >
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>

            <label>
              Tx power
              <input
                type="number"
                value={tx.pTxdBm}
                onChange={(e) => updateTx(tx.id, { pTxdBm: Number(e.target.value) })}
              />
              <div className="small">Units: dBm</div>
            </label>
          </div>

          <div style={{ marginTop: 12, padding: 10, border: '1px solid #eee', borderRadius: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div><b>Estimated SINR:</b> {sinr[tx.id]?.toFixed(1)} dB</div>
              <div>
                <span className="badge">
                  req {tx.profile.requiredSINRdB} dB {sinr[tx.id] >= tx.profile.requiredSINRdB ? '✅' : '⚠️'}
                </span>
              </div>
            </div>
            <div className="small" style={{ marginTop: 6 }}>
              This SINR estimate is intentionally simplified: it uses spectral overlap fractions and a basic noise floor.
            </div>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={() => removeTx(tx.id)}>Remove net</button>
          </div>

          <hr />

          <h4>Conflicts (selected)</h4>
          {conflictsForSelected.length === 0 ? (
            <div className="small">No conflicts for this net.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {conflictsForSelected
                .slice(0, 12)
                .map((c, i) => (
                  <li key={i}>
                    <b>{c.kind}</b> with <b>{c.aId === tx.id ? c.bId : c.aId}</b> —{' '}
                    {c.kind === 'cochannel'
                      ? `overlap ${(c.overlapHz / 1e3).toFixed(1)} kHz`
                      : `separation ${(c.separationHz / 1e3).toFixed(1)} kHz`}
                  </li>
                ))}
            </ul>
          )}

          <hr />

          <h4>Conflicts (all)</h4>
          {conf.length === 0 ? (
            <div className="small">No conflicts detected.</div>
          ) : (
            <div className="small">Total conflicts: {conf.length}</div>
          )}
        </>
      ) : (
        <div className="small">Select a net in the spectrum view to edit its settings.</div>
      )}
    </div>
  );
};
