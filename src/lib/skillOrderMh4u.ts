import type { SkillGroup } from "./skillOrder";
import { skillMetaMh3u } from "./skillOrderMh3u";
import { GROUP_ORDER } from "./skillOrder";

const EXTRA: Record<string, [SkillGroup, number]> = {
  Mounting: ["Evasion", 10],
  "Edge Lore": ["Sharpness", 10],
  Readiness: ["Sharpness", 20],
  Nimbleness: ["Evasion", 20],
  Brawn: ["Attack", 10],
  Ferocity: ["Attack", 20],
  Brutality: ["Attack", 30],
  Amplify: ["Attack", 40],
  Arcana: ["Attack", 50],
  Status: ["Attack", 60],
  CritElemnt: ["Attack", 70],
  CritStatus: ["Attack", 80],
  Prudence: ["Defense", 10],
  Stalwart: ["Defense", 20],
  Resilience: ["Defense", 30],
  Prayer: ["Defense", 40],
  "Dead Eye": ["Gunner", 10],
  LightEater: ["Gunner", 20],
  Mycology: ["Comfort", 10],
  Carnivore: ["Comfort", 20],
  Covert: ["Comfort", 30],
  Hoarding: ["Gathering", 10],
  Avarice: ["Gathering", 20],
};

export function skillMetaMh4u(ability: string, tags: string[] = []) {
  const hit = EXTRA[ability];
  if (hit) return { group: hit[0], priority: hit[1] };
  return skillMetaMh3u(ability, tags);
}

export function skillRankMh4u(ability: string, tags: string[] = []) {
  const { group, priority } = skillMetaMh4u(ability, tags);
  return GROUP_ORDER.indexOf(group) * 1000 + priority;
}
