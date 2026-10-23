export type SkillGroup =
  | "Attack"
  | "Sharpness"
  | "Gunner"
  | "Defense"
  | "Evasion"
  | "Comfort"
  | "Resistance"
  | "Gathering"
  | "Felyne"
  | "Other";

export const GROUP_ORDER: SkillGroup[] = [
  "Attack",
  "Sharpness",
  "Gunner",
  "Defense",
  "Evasion",
  "Comfort",
  "Resistance",
  "Gathering",
  "Felyne",
  "Other",
];

type Meta = [SkillGroup, number];

// Lower priority number = shown earlier within its class.
const MAP: Record<string, Meta> = {
  // Attack / DPS
  Attack: ["Attack", 10],
  Expert: ["Attack", 20],
  Potential: ["Attack", 30],
  "Spc Attack": ["Attack", 40],
  ElementAtk: ["Attack", 50],
  BombStrUp: ["Attack", 60],
  Rage: ["Attack", 70],
  Gunnery: ["Attack", 80],
  "Fast Chrge": ["Attack", 90],

  // Blademaster / sharpness
  Artisan: ["Sharpness", 10],
  Sharpness: ["Sharpness", 20],
  SwdShrpner: ["Sharpness", 30],
  Fencing: ["Sharpness", 40],
  "Drawn Crit": ["Sharpness", 50],
  SwdMastery: ["Sharpness", 60],

  // Gunner / bow
  "NormalS Up": ["Gunner", 10],
  "PierceS Up": ["Gunner", 20],
  "PelletS Up": ["Gunner", 30],
  NormalSAdd: ["Gunner", 40],
  PierceSAdd: ["Gunner", 50],
  PelletSAdd: ["Gunner", 60],
  "CragS Add": ["Gunner", 70],
  "ClustS Add": ["Gunner", 80],
  Loading: ["Gunner", 90],
  Load: ["Gunner", 100],
  "Speed Fire": ["Gunner", 110],
  Recoil: ["Gunner", 120],
  Precision: ["Gunner", 130],
  Marksman: ["Gunner", 140],
  PoisnCtAdd: ["Gunner", 150],
  "Para CtAdd": ["Gunner", 160],
  SleepCtAdd: ["Gunner", 170],
  PowerCtAdd: ["Gunner", 180],
  RazorCtAdd: ["Gunner", 190],
  "Shot Mix": ["Gunner", 200],

  // Defense / survival
  Defence: ["Defense", 10],
  Health: ["Defense", 20],
  Guard: ["Defense", 30],
  "Guard Up": ["Defense", 40],
  "Auto-Guard": ["Defense", 50],
  Protection: ["Defense", 60],
  Guts: ["Defense", 70],
  Recovery: ["Defense", 80],
  "Rec Speed": ["Defense", 90],
  Survival: ["Defense", 100],
  HearProtct: ["Defense", 110],
  WindPress: ["Defense", 120],

  // Evasion / stamina
  Evade: ["Evasion", 10],
  "Evade Inc": ["Evasion", 20],
  Constitutn: ["Evasion", 30],
  Stamina: ["Evasion", 40],
  Technique: ["Evasion", 50],

  // Comfort / utility
  "Set Trap": ["Comfort", 10],
  "Wide Area": ["Comfort", 20],
  Gluttony: ["Comfort", 30],
  Cooking: ["Comfort", 40],
  BBQ: ["Comfort", 50],
  Whim: ["Comfort", 60],
  Map: ["Comfort", 70],
  PsychicVis: ["Comfort", 80],
  Observance: ["Comfort", 90],
  Perceive: ["Comfort", 100],
  Tranquilzr: ["Comfort", 110],
  Sneak: ["Comfort", 120],
  "Anti-Theft": ["Comfort", 130],
  Backpackng: ["Comfort", 140],
  Everlastng: ["Comfort", 150],
  Throw: ["Comfort", 160],
  Horn: ["Comfort", 170],
  MixSucRate: ["Comfort", 180],
  Alchemy: ["Comfort", 190],
  Hunger: ["Comfort", 200],

  // Resistances
  "All Resist": ["Resistance", 10],
  "Fire Res": ["Resistance", 20],
  "Water Res": ["Resistance", 30],
  ThunderRes: ["Resistance", 40],
  "Ice Res": ["Resistance", 50],
  "Dragon Res": ["Resistance", 60],
  "Status Res": ["Resistance", 70],
  Poison: ["Resistance", 80],
  Paralysis: ["Resistance", 90],
  Sleep: ["Resistance", 100],
  Faint: ["Resistance", 110],
  Fatigue: ["Resistance", 120],
  Antiseptic: ["Resistance", 130],
  "Snow Res": ["Resistance", 140],
  "Quake Res": ["Resistance", 150],
  "Heat Res": ["Resistance", 160],
  "Cold Res": ["Resistance", 170],
  Terrain: ["Resistance", 180],
  FireDrgRes: ["Resistance", 190],
  "Daora Res": ["Resistance", 200],
  ChmleosRes: ["Resistance", 210],

  // Gathering / farming
  Gathering: ["Gathering", 10],
  Carving: ["Gathering", 20],
  HiSpdGathr: ["Gathering", 30],
  Fishing: ["Gathering", 40],
  Fate: ["Gathering", 50],
  Trapper: ["Gathering", 60],

  // Felyne / comrade
  "Flyne Atk": ["Felyne", 10],
  "Flyne Def": ["Felyne", 20],
  FlyneGuide: ["Felyne", 30],

  "Torso Inc": ["Other", 10],
};

export function skillMeta(ability: string, tags: string[] = []): { group: SkillGroup; priority: number } {
  const hit = MAP[ability];
  if (hit) return { group: hit[0], priority: hit[1] };

  if (tags.includes("Offensive")) return { group: "Attack", priority: 100 };
  if (tags.includes("Blademaster")) return { group: "Sharpness", priority: 100 };
  if (tags.includes("Bowgun") || tags.includes("Bow")) return { group: "Gunner", priority: 100 };
  if (tags.includes("Defensive")) return { group: "Defense", priority: 100 };
  if (tags.includes("Resistance")) return { group: "Resistance", priority: 100 };
  if (tags.includes("Farming") || tags.includes("Treasure Hunting")) return { group: "Gathering", priority: 100 };
  if (tags.includes("Map") || tags.includes("Monster")) return { group: "Comfort", priority: 100 };
  return { group: "Other", priority: 100 };
}

export function skillRank(ability: string, tags: string[] = []): number {
  const { group, priority } = skillMeta(ability, tags);
  return GROUP_ORDER.indexOf(group) * 1000 + priority;
}
