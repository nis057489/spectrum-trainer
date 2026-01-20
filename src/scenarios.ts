import type { Band } from './bands';
import type { Tx } from './model';

export type Scenario = {
  id: string;
  name: string;
  description: string;
  bandId: string;
  goal: {
    targetPassCount: number;
    maxConflicts: number;
  };
  txs: Array<{
    name: string;
    profileName: string;
    fcHz: number;
    bwHz: number;
    pTxdBm: number;
    channelSpacingHz: number;
  }>;
};

export async function loadScenario(id: string): Promise<Scenario> {
  const res = await fetch(`/scenarios/${id}.json`);
  if (!res.ok) throw new Error(`Failed to load scenario ${id}`);
  return res.json();
}

export function validateScenarioBand(bands: Band[], bandId: string): Band {
  const b = bands.find(x => x.id === bandId);
  if (!b) throw new Error(`Scenario references unknown bandId: ${bandId}`);
  return b;
}
