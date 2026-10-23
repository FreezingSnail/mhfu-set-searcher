import armorJson from "../data/armor.json";
import decoJson from "../data/decorations.json";
import skillJson from "../data/skills.json";
import weaponJson from "../data/weapons.json";
import metaJson from "../data/meta.json";
import type { Armor, Deco, SkillTree, Weapon } from "./types";
import { skillMeta, skillRank } from "./skillOrder";

export const ARMOR = armorJson as unknown as Armor[];
export const DECOS = decoJson as unknown as Deco[];
export const SKILLS = (skillJson as unknown as SkillTree[]).filter((s) => s.tiers.length);
export const WEAPONS = weaponJson as unknown as Weapon[];
export const META = metaJson as { armor: number; decorations: number; weapons: number; skills: number; builtAt: string };

export const ARMOR_BY_ID = new Map(ARMOR.map((a) => [a.id, a]));
export const DECO_BY_ID = new Map(DECOS.map((d) => [d.id, d]));
export const WEAPON_BY_NAME = new Map(WEAPONS.map((w) => [w.name, w]));

export const PARTS = ["head", "body", "arms", "waist", "legs"] as const;
export const PART_LABEL: Record<string, string> = {
  head: "Head",
  body: "Body",
  arms: "Arms",
  waist: "Waist",
  legs: "Legs",
};

export const TYPE_LABEL: Record<string, string> = {
  "great-sword": "Great Sword",
  "long-sword": "Long Sword",
  "sword-and-shield": "Sword & Shield",
  "dual-blades": "Dual Blades",
  hammer: "Hammer",
  "hunting-horn": "Hunting Horn",
  lance: "Lance",
  gunlance: "Gunlance",
  "light-bowgun": "Light Bowgun",
  "heavy-bowgun": "Heavy Bowgun",
  bow: "Bow",
};
export const WEAPON_TYPES = Object.keys(TYPE_LABEL);

export const SKILL_OPTIONS = SKILLS.map((s) => {
  const meta = skillMeta(s.ability, s.tags);
  return {
    ability: s.ability,
    tiers: s.tiers.filter((t) => t.points > 0),
    tags: s.tags,
    group: meta.group,
    rank: skillRank(s.ability, s.tags),
  };
})
  .filter((s) => s.tiers.length)
  .sort((a, b) => a.rank - b.rank || a.ability.localeCompare(b.ability));

export const RES_LABEL: Record<string, string> = {
  fire: "Fire",
  water: "Water",
  thunder: "Thunder",
  ice: "Ice",
  dragon: "Dragon",
};
