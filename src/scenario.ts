import type { Tx, RadioProfile } from './model';

export type Scenario = {
  id: string;
  name: string;
  bandId: string;
  description: string;
  nets: Array<{
    name: string;
    profileName: string;
    pTxdBm: number;
    fcHz?: number; // optional hint/starting point
    bwHz?: number; // optional override
    spacingHz?: number; // optional override
  }>;
};

function normalizeProfileName(name: string): string {
  return name
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .toLowerCase()
    .trim();
}

export function buildTxsFromScenario(
  scenario: Scenario,
  profiles: RadioProfile[],
  uid: () => string
): Tx[] {
  return scenario.nets.map((n, idx) => {
    const targetName = normalizeProfileName(n.profileName);
    const p = profiles.find((x) => normalizeProfileName(x.name) === targetName) ?? profiles[0];
    return {
      id: uid(),
      name: n.name || `Net ${idx + 1}`,
      fcHz: n.fcHz ?? NaN,
      bwHz: n.bwHz ?? p.defaultBWHz,
      spacingHz: n.spacingHz ?? p.defaultSpacingHz,
      pTxdBm: n.pTxdBm,
      profile: p,
      snapToGrid: true
    };
  });
}
