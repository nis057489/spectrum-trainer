import type { Band } from './bands';

export type RadioProfile = {
  name: string;
  requiredSINRdB: number;
  defaultBWHz: number;
  defaultSpacingHz: number;
  note?: string;
};

export type Tx = {
  id: string;
  name: string;
  fcHz: number;
  bwHz: number;
  spacingHz: number;
  pTxdBm: number;
  profile: RadioProfile;
  snapToGrid: boolean;
};

export type Conflict = {
  aId: string;
  bId: string;
  kind: 'cochannel' | 'adjacent';
  overlapHz: number;
  separationHz: number;
  severity: number; // 0..1
};

export function rectEdges(tx: Tx) {
  return { fLo: tx.fcHz - tx.bwHz / 2, fHi: tx.fcHz + tx.bwHz / 2 };
}

export function overlapHz(a: Tx, b: Tx): number {
  const A = rectEdges(a), B = rectEdges(b);
  const lo = Math.max(A.fLo, B.fLo);
  const hi = Math.min(A.fHi, B.fHi);
  return Math.max(0, hi - lo);
}

export function separationHz(a: Tx, b: Tx): number {
  const A = rectEdges(a), B = rectEdges(b);
  if (overlapHz(a, b) > 0) return 0;
  if (A.fHi < B.fLo) return B.fLo - A.fHi;
  return A.fLo - B.fHi;
}

export function conflicts(txs: Tx[]): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i < txs.length; i++) {
    for (let j = i + 1; j < txs.length; j++) {
      const a = txs[i], b = txs[j];
      const ov = overlapHz(a, b);
      const sep = separationHz(a, b);
      const guard = 0.1 * Math.max(a.bwHz, b.bwHz);

      if (ov > 0) {
        const sev = Math.min(1, ov / Math.min(a.bwHz, b.bwHz));
        out.push({ aId: a.id, bId: b.id, kind: 'cochannel', overlapHz: ov, separationHz: sep, severity: sev });
      } else if (sep < guard) {
        const sev = Math.min(1, (guard - sep) / guard);
        out.push({ aId: a.id, bId: b.id, kind: 'adjacent', overlapHz: 0, separationHz: sep, severity: sev });
      }
    }
  }
  return out;
}

export function noiseFloor_dBm(bwHz: number, noiseFigure_dB: number): number {
  return -174 + 10 * Math.log10(bwHz) + noiseFigure_dB;
}

export function dBmTo_mW(dBm: number): number {
  return Math.pow(10, dBm / 10);
}

export function mWTo_dBm(mW: number): number {
  return 10 * Math.log10(mW);
}

export function sinrEstimates_dB(txs: Tx[], noiseFigure_dB = 6): Record<string, number> {
  const res: Record<string, number> = {};
  for (const rx of txs) {
    const N_dBm = noiseFloor_dBm(rx.bwHz, noiseFigure_dB);
    let I_mW = 0;

    for (const itx of txs) {
      if (itx.id === rx.id) continue;
      const ov = overlapHz(rx, itx);
      const frac = ov / rx.bwHz; // 0..1
      if (frac <= 0) continue;
      I_mW += dBmTo_mW(itx.pTxdBm) * Math.min(1, frac);
    }

    const S_mW = dBmTo_mW(rx.pTxdBm);
    const N_mW = dBmTo_mW(N_dBm);
    const SINR = S_mW / (I_mW + N_mW);
    res[rx.id] = 10 * Math.log10(SINR);
  }
  return res;
}

export function snapFrequencyHz(fcHz: number, band: Band, spacingHz: number): number {
  if (spacingHz <= 0) return fcHz;
  const offset = fcHz - band.fMinHz;
  const steps = Math.round(offset / spacingHz);
  const snapped = band.fMinHz + steps * spacingHz;
  return Math.min(band.fMaxHz, Math.max(band.fMinHz, snapped));
}
