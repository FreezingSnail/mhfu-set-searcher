import type { GameData } from "./games.ts";
import type { Armor, SolverInput } from "./types.ts";
import { rankAllowed } from "./ranks.ts";

/** A piercing is rank-ambiguous: the armor-rank filter should not hide it
 * when the user has explicitly allowed piercings. */
export const isPiercing = (a: Armor) => a.name.includes("Piercing");

export function armorAllowed(data: GameData, input: SolverInput, a: Armor): boolean {
  if (a.sex !== "both" && a.sex !== input.gender) return false;
  if (a.hunter !== "both" && a.hunter !== input.hunter) return false;
  const piercing = isPiercing(a);
  if (!input.allowPiercings && piercing) return false;
  if (!rankAllowed(a.rank, input.rank) && !(input.allowPiercings && piercing)) return false;
  // MH3U records port star and village star separately; 99 means "not from
  // that source", so a piece is available if either source is unlocked.
  const hrOk = a.hr > 0 && a.hr <= input.hr;
  const elderOk = a.elder > 0 && a.elder <= input.elder;
  if (data.availability === "or" ? !hrOk && !elderOk : !hrOk || !elderOk) return false;
  if (a.name.includes("(dummy)")) return false;
  return true;
}

const decoAllowed = (input: SolverInput, d: { hr: number; elder: number }) =>
  (d.hr > 0 && d.hr <= input.hr) || (d.elder > 0 && d.elder <= input.elder);

/**
 * Skills that can appear as an extra active skill on a set satisfying the
 * current targets. Enumerating from the data rather than the capped result
 * list keeps rare combinations (e.g. a piercing-only set) discoverable.
 */
export function extraSkillCandidates(data: GameData, input: SolverInput): string[] {
  const target = new Set(input.skills.map((s) => s.ability));
  const weight = new Map<string, number>();
  const add = (skills: readonly (readonly [string, number])[]) => {
    for (const [ability, points] of skills) {
      if (points <= 0 || target.has(ability)) continue;
      if (!data.skillTree.get(ability)?.tiers.some((t) => t.points > 0)) continue;
      weight.set(ability, (weight.get(ability) ?? 0) + points);
    }
  };

  for (const a of data.armor) {
    if (armorAllowed(data, input, a)) add(a.skills);
  }
  for (const d of data.decos) {
    if (decoAllowed(input, d) && d.skills.some(([, p]) => p > 0)) add(d.skills);
  }
  if (input.charmMode === "owned") {
    for (const charm of input.charms ?? []) {
      if (input.charmTable && charm.table && charm.table !== input.charmTable) continue;
      add(charm.skills);
    }
  }

  return [...weight.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([ability]) => ability);
}
