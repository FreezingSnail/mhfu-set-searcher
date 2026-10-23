import type { SkillGroup } from "./skillOrder";
import { GROUP_ORDER } from "./skillOrder";

type Meta = [SkillGroup, number];

const MAP: Record<string, Meta> = {
  Attack: ["Attack", 10],
  Expert: ["Attack", 20],
  Potential: ["Attack", 30],
  "Gloves Off": ["Attack", 40],
  Spirit: ["Attack", 50],
  Challenger: ["Attack", 60],
  Unscathed: ["Attack", 70],
  Fury: ["Attack", 80],
  Elemental: ["Attack", 90],
  "Bomb Boost": ["Attack", 100],
  Artillery: ["Attack", 110],
  Maestro: ["Attack", 120],
  KO: ["Attack", 130],
  "Stam Drain": ["Attack", 140],
  Destroyer: ["Attack", 150],
  Tenderizer: ["Attack", 160],
  FastCharge: ["Attack", 170],
  Edgemaster: ["Attack", 180],
  SteadyHand: ["Attack", 190],

  Handicraft: ["Sharpness", 10],
  Sharpness: ["Sharpness", 20],
  Sharpener: ["Sharpness", 30],
  Fencing: ["Sharpness", 40],
  "Crit Draw": ["Sharpness", 50],
  PunishDraw: ["Sharpness", 60],

  "Normal Up": ["Gunner", 10],
  "Pierce Up": ["Gunner", 20],
  "Pellet Up": ["Gunner", 30],
  "Normal S+": ["Gunner", 40],
  "Pierce S+": ["Gunner", 50],
  "Pellet S+": ["Gunner", 60],
  "Crag S+": ["Gunner", 70],
  "Clust S+": ["Gunner", 80],
  "Slicing S+": ["Gunner", 90],
  "Slime S+": ["Gunner", 100],
  Loading: ["Gunner", 110],
  "Reload Spd": ["Gunner", 120],
  Recoil: ["Gunner", 130],
  Precision: ["Gunner", 140],
  "Rapid Fire": ["Gunner", 150],
  "Power C+": ["Gunner", 160],
  "C.Range C+": ["Gunner", 170],
  "Exhaust C+": ["Gunner", 180],
  "Poison C+": ["Gunner", 190],
  "Para C+": ["Gunner", 200],
  "Sleep C+": ["Gunner", 210],

  Defense: ["Defense", 10],
  Health: ["Defense", 20],
  Guard: ["Defense", 30],
  "Guard Up": ["Defense", 40],
  "Auto-Guard": ["Defense", 50],
  Protection: ["Defense", 60],
  Guts: ["Defense", 70],
  "Rec Level": ["Defense", 80],
  "Rec Speed": ["Defense", 90],
  Hearing: ["Defense", 100],
  "Wind Res": ["Defense", 110],

  Evasion: ["Evasion", 10],
  "Evade Dist": ["Evasion", 20],
  "Dive Dist": ["Evasion", 30],
  Constitutn: ["Evasion", 40],
  Stamina: ["Evasion", 50],
  "Stam Recov": ["Evasion", 60],
  Survivor: ["Evasion", 70],

  Sheathing: ["Comfort", 10],
  Eating: ["Comfort", 20],
  "Wide-Range": ["Comfort", 30],
  LastingPwr: ["Comfort", 40],
  Hunger: ["Comfort", 50],
  Gluttony: ["Comfort", 60],
  "Combo Rate": ["Comfort", 70],
  "Combo Plus": ["Comfort", 80],
  Whim: ["Comfort", 90],
  Psychic: ["Comfort", 100],
  Perception: ["Comfort", 110],
  Tranquilzr: ["Comfort", 120],
  "Anti-Theft": ["Comfort", 130],
  SpeedSetup: ["Comfort", 140],
  Transportr: ["Comfort", 150],
  Ranger: ["Comfort", 160],
  Sense: ["Comfort", 170],
  Biology: ["Comfort", 180],
  Dungmaster: ["Comfort", 190],
  Swimming: ["Comfort", 200],
  Oxygen: ["Comfort", 210],
  CurrentRes: ["Comfort", 220],
  "Flame Aura": ["Comfort", 230],
  TeamPlayer: ["Comfort", 240],
  TeamLeader: ["Comfort", 250],

  Gathering: ["Gathering", 10],
  "Spd Gather": ["Gathering", 20],
  Fate: ["Gathering", 30],
  Carving: ["Gathering", 40],
  Charmer: ["Gathering", 50],
  Honey: ["Gathering", 60],

  "Fire Res": ["Resistance", 10],
  "Water Res": ["Resistance", 20],
  ThunderRes: ["Resistance", 30],
  "Ice Res": ["Resistance", 40],
  "Dragon Res": ["Resistance", 50],
  "Status Res": ["Resistance", 60],
  Poison: ["Resistance", 70],
  Paralysis: ["Resistance", 80],
  Sleep: ["Resistance", 90],
  Stun: ["Resistance", 100],
  "Mud/Snow": ["Resistance", 110],
  Antiseptic: ["Resistance", 120],
  "Heat Res": ["Resistance", 130],
  "Cold Res": ["Resistance", 140],
  "Tremor Res": ["Resistance", 150],
  "Blight Res": ["Resistance", 160],
  "Def Lock": ["Resistance", 170],

  "Torso Up": ["Other", 10],
};

export function skillMetaMh3u(ability: string, tags: string[] = []): { group: SkillGroup; priority: number } {
  const hit = MAP[ability];
  if (hit) return { group: hit[0], priority: hit[1] };
  if (tags.includes("Offensive")) return { group: "Attack", priority: 100 };
  if (tags.includes("Blademaster")) return { group: "Sharpness", priority: 100 };
  if (tags.includes("Bow/Gunner")) return { group: "Gunner", priority: 100 };
  if (tags.includes("Defensive")) return { group: "Defense", priority: 100 };
  if (tags.includes("Resistance")) return { group: "Resistance", priority: 100 };
  if (tags.includes("Farming")) return { group: "Gathering", priority: 100 };
  return { group: "Comfort", priority: 100 };
}

export function skillRankMh3u(ability: string, tags: string[] = []): number {
  const { group, priority } = skillMetaMh3u(ability, tags);
  return GROUP_ORDER.indexOf(group) * 1000 + priority;
}
