export type Part = "head" | "body" | "arms" | "waist" | "legs";

export type Armor = {
  id: string;
  name: string;
  part: Part;
  rank: string;
  rarity: number;
  defense: number;
  res: { fire: number; thunder: number; dragon: number; water: number; ice: number };
  sex: "both" | "male" | "female";
  hunter: "both" | "blade" | "gunner";
  hr: number;
  elder: number;
  slots: number;
  skills: [string, number][];
  mats: [string, number][];
  cost: number;
};

export type Deco = {
  id: string;
  name: string;
  slots: number;
  hr: number;
  elder: number;
  cost: number;
  skills: [string, number][];
  mats: [string, number][];
};

export type SkillTier = { points: number; name: string };
export type SkillTree = { ability: string; tags: string[]; tiers: SkillTier[] };

export type Weapon = {
  id: string;
  name: string;
  type: string;
  order: number;
  rank: "lr" | "hr" | "gr";
  attack: number;
  affinity: number;
  slots: number;
  rarity: number;
  elements: [string, number][];
  bonus: string | null;
  sharpness: number[];
  sharpnessPlus: number[];
  createCost: number;
  improveCost: number;
  improveFrom: string[];
  improveTo: string[];
  createMats: [string, number][];
  improveMats: [string, number][];
};

export type SolverInput = {
  skills: { ability: string; points: number }[];
  gender: "male" | "female";
  hunter: "blade" | "gunner";
  weaponSlots: number;
  sort: "defense" | "defenseLow" | "jewels" | "spare" | "cost" | "extras";
  rank: "all" | "low" | "high" | "g";
  hr: number;
  elder: number;
  allowBad: boolean;
  allowPiercings: boolean;
  limit?: number;
  stopAtLimit?: boolean;
  maxResults?: number;
  timeLimitMs?: number;
  shard?: { index: number; count: number };
};

export type SolverResult = {
  armor: Armor[];
  decos: Deco[];
  points: Record<string, number>;
  active: { ability: string; points: number; name: string }[];
  extra: { ability: string; points: number; name: string }[];
  defense: number;
  res: { fire: number; thunder: number; dragon: number; water: number; ice: number };
  cost: number;
  mats: [string, number][];
  spare: number;
  weaponSlots: number;
};
