import skillJson from "../data/skills.json";
import type { SkillTree } from "./types";

export const SKILL_TREES = (skillJson as unknown as SkillTree[]).filter((t) => t.tiers.length);
export const SKILL_TREE = new Map(SKILL_TREES.map((t) => [t.ability, t]));

export function activeTier(ability: string, points: number) {
  const tree = SKILL_TREE.get(ability);
  if (!tree) return null;
  if (points >= 0) {
    const usable = tree.tiers.filter((t) => t.points > 0 && t.points <= points);
    return usable.length ? usable.reduce((best, t) => (t.points > best.points ? t : best)) : null;
  }
  const usable = tree.tiers.filter((t) => t.points < 0 && t.points >= points);
  return usable.length ? usable.reduce((best, t) => (t.points < best.points ? t : best)) : null;
}
