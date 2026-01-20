import React from 'react';
import { Stage, Layer, Rect, Text, Line, Group } from 'react-konva';
import { useApp } from './store';
import { rectEdges } from './model';

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

export const SpectrumCanvas: React.FC = () => {
  const { band, txs, selectedId, select, updateTx } = useApp();
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dragFcHz, setDragFcHz] = React.useState<number | null>(null);

  const W = 1000;
  const H = 340;
  const padding = 50;
  const barY = 88; // raised so there's more room between labels and the spectrum band
  const barH = 220;

  const fToX = (fHz: number) => {
    const t = (fHz - band.fMinHz) / (band.fMaxHz - band.fMinHz);
    return padding + t * (W - 2 * padding);
  };

  const xToF = (x: number) => {
    const t = (x - padding) / (W - 2 * padding);
    return band.fMinHz + clamp(t, 0, 1) * (band.fMaxHz - band.fMinHz);
  };

  const noiseAreaPoints = React.useMemo(() => {
    const seedBase = Math.floor((band.fMinHz + band.fMaxHz) / 1e3);
    let seed = seedBase % 2147483647;
    const rand = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };

    const sampleCount = 80;
    const raw: number[] = [];
    let trend = rand() * 0.5 + 0.22;
    for (let i = 0; i < sampleCount; i++) {
      trend += (rand() - 0.5) * 0.16;
      trend = clamp(trend, 0.1, 0.95);
      const spike = rand() > 0.88 ? rand() * 0.6 + 0.6 : 0;
      raw.push(clamp(trend * (0.78 + rand() * 0.65) + spike, 0, 1.4));
    }

    const smooth: number[] = raw.map((_, i) => {
      const a = raw[Math.max(0, i - 1)];
      const b = raw[i];
      const c = raw[Math.min(sampleCount - 1, i + 1)];
      return (a + b + c) / 3;
    });

    const floorY = barY + barH - 6;
    const minHeight = 8;
    const maxHeight = barH * 0.55;

    const linePoints: number[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const t = i / (sampleCount - 1);
      const x = padding + t * (W - 2 * padding);
      const h = minHeight + smooth[i] * maxHeight;
      const y = floorY - h;
      linePoints.push(x, y);
    }

    return [
      ...linePoints,
      padding + (W - 2 * padding),
      barY + barH,
      padding,
      barY + barH,
    ];
  }, [band.fMinHz, band.fMaxHz, W, padding, barY, barH]);

  // Draw a simple tick grid (10 ticks)
  const ticks = Array.from({ length: 11 }, (_, i) => i);

  function channelLabelsForBand() {
    type L = { label: string; fHz: number };

    if (band.id === 'wifi_24') {
      // Channels 1..14 (2412 MHz + 5 MHz * (n-1)). Show those inside band range.
      const labels: L[] = [];
      for (let ch = 1; ch <= 14; ch++) {
        const fHz = 2412e6 + 5e6 * (ch - 1);
        if (fHz >= band.fMinHz && fHz <= band.fMaxHz) labels.push({ label: `CH ${ch}`, fHz });
      }
      return labels;
    }

    if (band.id === 'wifi_5') {
      const known = [
        36, 40, 44, 48, 52, 56, 60, 64,
        100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144,
        149, 153, 157, 161, 165
      ];
      // channel -> center freq (MHz) = 5000 + 5 * channel
      const labels = known
        .map((ch) => ({ label: `CH ${ch}`, fHz: (5000 + ch * 5) * 1e6 }))
        .filter((l) => l.fHz >= band.fMinHz && l.fHz <= band.fMaxHz);
      return labels;
    }

    if (band.id === 'uhf_225_400') {
      // UHF: commonly uses 25 kHz spacing in training. We show every ~2.5 MHz label to avoid clutter.
      const spacing = 25e3;
      const step = 2.5e6; // label every 100 channels
      const labels: L[] = [];
      for (let f = band.fMinHz; f <= band.fMaxHz; f += step) {
        const ch = Math.round((f - band.fMinHz) / spacing) + 1;
        const fCenter = Math.min(band.fMaxHz, f);
        labels.push({ label: `CH ${ch}`, fHz: fCenter });
      }
      return labels;
    }

    if (band.id.startsWith('sat_')) {
      // Satcom: show coarse carrier slots at ~250 MHz steps to indicate large carrier allocations.
      const carrierStep = 250e6;
      const labels: L[] = [];
      let idx = 1;
      // start at the first carrier boundary >= fMinHz
      const first = Math.ceil(band.fMinHz / carrierStep) * carrierStep;
      for (let f = first; f <= band.fMaxHz; f += carrierStep) {
        labels.push({ label: `Carrier ${idx}`, fHz: f });
        idx++;
      }
      return labels;
    }

    return [] as L[];
  }

  const channelLabels = channelLabelsForBand();

  // Filter labels so they don't visually overlap on small screens or dense bands
  const displayedChannelLabels = (() => {
    const minPx = band.id === 'uhf_225_400' ? 70 : 40; // UHF needs more horizontal spacing
    const out: { label: string; fHz: number }[] = [];
    let lastX = -Infinity;
    for (const l of channelLabels) {
      const x = fToX(l.fHz);
      if (x - lastX >= minPx) {
        out.push(l);
        lastX = x;
      }
    }
    return out;
  })();

  return (
    <div className="panel" style={{ padding: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700 }}>Spectrum View</div>
          <div className="small">
            {band.name}
          </div>
        </div>
        <div className="small">Drag nets left/right to change center frequency</div>
      </div>

      <Stage width={W} height={H}>
        <Layer>
          <Rect x={padding} y={barY} width={W - 2 * padding} height={barH} stroke="black" />

          {ticks.map((i) => {
            const t = i / 10;
            const x = padding + t * (W - 2 * padding);
            const f = band.fMinHz + t * (band.fMaxHz - band.fMinHz);
            const labelMHz = f >= 1e9 ? `${(f / 1e9).toFixed(3)} GHz` : `${(f / 1e6).toFixed(1)} MHz`;
            return (
              <React.Fragment key={i}>
                <Line points={[x, barY, x, barY + barH]} stroke="#eee" />
                <Text x={x - 30} y={barY - 32} text={labelMHz} fontSize={11} fill="#555" />
              </React.Fragment>
            );
          })}

          <Line
            points={noiseAreaPoints}
            closed
            fill="rgba(255, 0, 0, 0.14)"
            stroke="rgba(255, 0, 0, 0.35)"
            strokeWidth={1}
          />

          {displayedChannelLabels.map((c, i) => {
            const x = fToX(c.fHz);
            const labelY = Math.max(8, barY - 18); // keep labels from overlapping the top and add more gap from frequency labels
            return (
              <React.Fragment key={i}>
                <Text x={x - 20} y={labelY} width={40} align="center" text={c.label} fontSize={10} fill="#333" />
              </React.Fragment>
            );
          })}

          {txs.map((tx, idx) => {
            const activeFcHz = draggingId === tx.id && dragFcHz !== null ? dragFcHz : tx.fcHz;
            const fLo = activeFcHz - tx.bwHz / 2;
            const fHi = activeFcHz + tx.bwHz / 2;
            const x = fToX(fLo);
            const w = fToX(fHi) - fToX(fLo);
            const y = barY + 16 + (idx % 7) * 28;

            return (
              <Group
                key={tx.id}
                x={x}
                y={y}
                draggable
                onDragStart={() => {
                  setDraggingId(tx.id);
                  setDragFcHz(tx.fcHz);
                }}
                onMouseDown={() => select(tx.id)}
                onDragMove={(e) => {
                  const newFc = xToF(e.target.x() + w / 2);
                  setDragFcHz(newFc);
                }}
                onDragEnd={(e) => {
                  const newFc = xToF(e.target.x() + w / 2);
                  updateTx(tx.id, { fcHz: newFc });
                  setDraggingId(null);
                  setDragFcHz(null);
                }}
              >
                <Rect
                  x={0}
                  y={0}
                  width={Math.max(10, w)}
                  height={22}
                  fill={tx.id === selectedId ? '#cfe8ff' : '#e9f0ff'}
                  stroke={tx.id === selectedId ? '#1a1a1a' : '#999'}
                />
                <Text
                  x={4}
                  y={4}
                  text={`${tx.name}`}
                  fontSize={12}
                  fill="#111"
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>

      <div className="small" style={{ marginTop: 6 }}>
        <span style={{ display: 'inline-block', width: 12, height: 10, background: 'rgba(255, 0, 0, 0.2)', border: '1px solid rgba(255, 0, 0, 0.45)', verticalAlign: 'middle', marginRight: 6 }} />
        Background interference (noise floor)
      </div>

      <div className="small">
        Tip: if a net is set to “snap to grid”, it will jump to multiples of its channel spacing.
      </div>
    </div>
  );
};
