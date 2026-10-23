import type { SkillTier, SkillTree } from "./types";

export function activeTier(tree: SkillTree | undefined, points: number): SkillTier | null {
  if (!tree) return null;
  if (points >= 0) {
    const usable = tree.tiers.filter((t) => t.points > 0 && t.points <= points);
    return usable.length ? usable.reduce((best, t) => (t.points > best.points ? t : best)) : null;
  }
  const usable = tree.tiers.filter((t) => t.points < 0 && t.points >= points);
  return usable.length ? usable.reduce((best, t) => (t.points < best.points ? t : best)) : null;
}
