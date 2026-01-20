import { create } from 'zustand';
import { BANDS, type Band } from './bands';
import type { RadioProfile, Tx } from './model';
import { buildTxsFromScenario, type Scenario } from './scenario';
import { snapFrequencyHz } from './model';

const PROFILES: RadioProfile[] = [
  { name: 'Narrowband Voice', requiredSINRdB: 10, defaultBWHz: 25_000, defaultSpacingHz: 25_000, note: 'Typical FM/AM voice channel width (training).' },
  { name: 'Narrowband Data', requiredSINRdB: 12, defaultBWHz: 50_000, defaultSpacingHz: 50_000 },
  { name: 'Wideband Data', requiredSINRdB: 15, defaultBWHz: 200_000, defaultSpacingHz: 200_000 },
  { name: 'Wi‑Fi (20 MHz)', requiredSINRdB: 18, defaultBWHz: 20_000_000, defaultSpacingHz: 5_000_000 },
  { name: 'Wi‑Fi (40 MHz)', requiredSINRdB: 20, defaultBWHz: 40_000_000, defaultSpacingHz: 5_000_000 },
  { name: 'Cellular (5 MHz)', requiredSINRdB: 18, defaultBWHz: 5_000_000, defaultSpacingHz: 100_000 },
  { name: 'Cellular (20 MHz)', requiredSINRdB: 22, defaultBWHz: 20_000_000, defaultSpacingHz: 100_000 },
  { name: 'SATCOM (250 MHz)', requiredSINRdB: 24, defaultBWHz: 250_000_000, defaultSpacingHz: 1_000_000 }
];

function uid() {
  return Math.random().toString(16).slice(2, 10);
}

function defaultBand(): Band {
  return BANDS.find((b) => b.id === 'uhf_225_400') ?? BANDS[0];
}

export type AppState = {
  bands: Band[];
  band: Band;
  profiles: RadioProfile[];
  txs: Tx[];
  selectedId: string | null;
  scenario: Scenario | null;

  setBandById: (id: string) => void;
  addTx: (profileName?: string) => void;
  updateTx: (id: string, patch: Partial<Tx>) => void;
  removeTx: (id: string) => void;
  select: (id: string | null) => void;

  loadScenarioFromUrl: (url: string) => Promise<void>;
  resetToScenario: () => void;
};

export const useApp = create<AppState>((set, get) => {
  const band = defaultBand();

  const initialScenario: Scenario = {
    id: 'starter_uhf_deconflict',
    name: 'Starter: Deconflict 6 nets (UHF)',
    bandId: band.id,
    description:
      'Goal: Move the nets so none overlap, and keep each on its channel grid. Bonus: improve estimated SINR for all nets. Use center frequency, bandwidth, power, and channel spacing.',
    nets: [
      { name: 'Cmd Voice', profileName: 'Narrowband Voice', pTxdBm: 33, fcHz: 300.000e6 },
      { name: 'Log Voice', profileName: 'Narrowband Voice', pTxdBm: 33, fcHz: 300.010e6 },
      { name: 'Air Voice', profileName: 'Narrowband Voice', pTxdBm: 33, fcHz: 300.020e6 },
      { name: 'Data A', profileName: 'Narrowband Data', pTxdBm: 30, fcHz: 300.030e6 },
      { name: 'Data B', profileName: 'Narrowband Data', pTxdBm: 30, fcHz: 300.040e6 },
      { name: 'Wide Link', profileName: 'Wideband Data', pTxdBm: 27, fcHz: 300.050e6 }
    ]
  };

  const txs = buildTxsFromScenario(initialScenario, PROFILES, uid).map((t) => {
    const snapped = snapFrequencyHz(t.fcHz, band, t.spacingHz);
    return { ...t, fcHz: snapped };
  });

  return {
    bands: BANDS,
    band,
    profiles: PROFILES,
    txs,
    selectedId: txs[0]?.id ?? null,
    scenario: initialScenario,

    setBandById: (id) => {
      const b = get().bands.find((x) => x.id === id);
      if (!b) return;
      set({ band: b });
      // Snap any existing nets into the new band bounds.
      set((s) => ({
        txs: s.txs.map((t) => ({
          ...t,
          fcHz: snapFrequencyHz(t.fcHz, b, t.snapToGrid ? t.spacingHz : 0)
        }))
      }));
    },

    addTx: (profileName) =>
      set((s) => {
        const p = s.profiles.find((x) => x.name === profileName) ?? s.profiles[0];
        const mid = (s.band.fMinHz + s.band.fMaxHz) / 2;
        const tx: Tx = {
          id: uid(),
          name: `Net ${String.fromCharCode(65 + s.txs.length)}`,
          fcHz: snapFrequencyHz(mid, s.band, p.defaultSpacingHz),
          bwHz: p.defaultBWHz,
          spacingHz: p.defaultSpacingHz,
          pTxdBm: 30,
          profile: p,
          snapToGrid: true
        };
        return { txs: [...s.txs, tx], selectedId: tx.id };
      }),

    updateTx: (id, patch) =>
      set((s) => ({
        txs: s.txs.map((t) => {
          if (t.id !== id) return t;
          const merged = { ...t, ...patch };
          if (patch.fcHz !== undefined) {
            merged.fcHz = snapFrequencyHz(
              merged.fcHz,
              get().band,
              merged.snapToGrid ? merged.spacingHz : 0
            );
          }
          return merged;
        })
      })),

    removeTx: (id) =>
      set((s) => ({
        txs: s.txs.filter((t) => t.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId
      })),

    select: (id) => set({ selectedId: id }),

    loadScenarioFromUrl: async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load scenario: ${res.status}`);
      const scenario = (await res.json()) as Scenario;
      const band = get().bands.find((b) => b.id === scenario.bandId) ?? get().band;
      const txs = buildTxsFromScenario(scenario, get().profiles, uid).map((t, i) => {
        // If no start frequency provided, sprinkle them across the band.
        const fc = Number.isFinite(t.fcHz)
          ? t.fcHz
          : band.fMinHz + ((i + 1) / (scenario.nets.length + 1)) * (band.fMaxHz - band.fMinHz);
        return {
          ...t,
          fcHz: snapFrequencyHz(fc, band, t.spacingHz)
        };
      });
      set({ scenario, band, txs, selectedId: txs[0]?.id ?? null });
    },

    resetToScenario: () => {
      const sc = get().scenario;
      if (!sc) return;
      void get().loadScenarioFromUrl(`/scenarios/${sc.id}.json`).catch(() => {
        // Fallback to existing scenario in state.
        const band = get().band;
        const txs = buildTxsFromScenario(sc, get().profiles, uid).map((t, i) => {
          const fc = Number.isFinite(t.fcHz)
            ? t.fcHz
            : band.fMinHz + ((i + 1) / (sc.nets.length + 1)) * (band.fMaxHz - band.fMinHz);
          return { ...t, fcHz: snapFrequencyHz(fc, band, t.spacingHz) };
        });
        set({ txs, selectedId: txs[0]?.id ?? null });
      });
    }
  };
});
