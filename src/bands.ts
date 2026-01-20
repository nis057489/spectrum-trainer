export type Band = {
  id: string;
  name: string;
  fMinHz: number;
  fMaxHz: number;
  note?: string;
};

// Illustrative training bands (not authoritative allocations).
export const BANDS: Band[] = [
  { id: 'vhf_30_88', name: 'VHF (30–88 MHz) — Training', fMinHz: 30e6, fMaxHz: 88e6 },
  { id: 'uhf_225_400', name: 'UHF (225–400 MHz) — Training', fMinHz: 225e6, fMaxHz: 400e6 },
  { id: 'wifi_24', name: 'Wi‑Fi (2.4 GHz, 2400–2483.5 MHz) — Training', fMinHz: 2400e6, fMaxHz: 2483.5e6 },
  { id: 'wifi_5', name: 'Wi‑Fi (5 GHz, 5150–5850 MHz) — Training', fMinHz: 5150e6, fMaxHz: 5850e6 },
  { id: 'cell_mid', name: '4G/5G (mid-band, 3300–3800 MHz) — Training', fMinHz: 3300e6, fMaxHz: 3800e6 },
  { id: 'cell_mmwave', name: '5G (mmWave, 26000–28000 MHz) — Training', fMinHz: 26000e6, fMaxHz: 28000e6 },
  { id: 'sat_ku_dl', name: 'SATCOM example (Ku down, 10.7–12.7 GHz) — Training', fMinHz: 10700e6, fMaxHz: 12700e6 },
  { id: 'sat_ku_ul', name: 'SATCOM example (Ku up, 14.0–14.5 GHz) — Training', fMinHz: 14000e6, fMaxHz: 14500e6 },
  { id: 'sat_ka_dl', name: 'SATCOM example (Ka down, 17.8–18.6 GHz) — Training', fMinHz: 17800e6, fMaxHz: 18600e6 },
  { id: 'sat_ka_ul', name: 'SATCOM example (Ka up, 27.5–30.0 GHz) — Training', fMinHz: 27500e6, fMaxHz: 30000e6 }
];
