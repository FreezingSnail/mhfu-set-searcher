import type { Weapon } from "./types";
import {
  scoreWeapon,
  type StrengthOptions,
  type WeaponScore,
} from "./weaponStrength.ts";

export type DamageType = "slash" | "strike" | "shooting";

export type MonsterPart = {
  part: string;
  slash: number;
  strike: number;
  shooting: number;
  fire: number;
  water: number;
  thunder: number;
  ice: number;
  dragon: number;
};

export type Monster = {
  name: string;
  type: string;
  parts: MonsterPart[];
};

export type MonsterWeaponScore = WeaponScore & {
  monsterPart: MonsterPart;
  damageType: DamageType;
};

const DAMAGE_TYPE: Record<string, DamageType> = {
  "great-sword": "slash",
  "long-sword": "slash",
  "sword-and-shield": "slash",
  "dual-blades": "slash",
  hammer: "strike",
  "hunting-horn": "strike",
  lance: "slash",
  gunlance: "slash",
  "light-bowgun": "shooting",
  "heavy-bowgun": "shooting",
  bow: "shooting",
};

const ELEMENT_KEY: Record<string, keyof MonsterPart> = {
  Fire: "fire",
  Water: "water",
  Thunder: "thunder",
  Ice: "ice",
  Dragon: "dragon",
};

export function damageTypeFor(weapon: Weapon): DamageType {
  return DAMAGE_TYPE[weapon.type] ?? "slash";
}

export function rawHitzone(part: MonsterPart, type: DamageType) {
  return part[type] ?? 0;
}

export function elementHitzone(part: MonsterPart, element: string) {
  const key = ELEMENT_KEY[element];
  return key ? Number(part[key] ?? 0) : 0;
}

/** Best raw hitzone for the weapon's damage type. Enraged parts are opt-in. */
export function bestPartFor(
  monster: Monster,
  type: DamageType,
  includeEnraged = false,
): MonsterPart {
  const normal = monster.parts.filter((part) => !part.part.endsWith("-enraged"));
  const candidates = includeEnraged || normal.length === 0 ? monster.parts : normal;
  return candidates.reduce(
    (best, part) => (rawHitzone(part, type) > rawHitzone(best, type) ? part : best),
    candidates[0],
  );
}

export function scoreWeaponAgainstMonster(
  weapon: Weapon,
  monster: Monster,
  part: MonsterPart | undefined,
  options: Partial<StrengthOptions> = {},
): MonsterWeaponScore {
  const damageType = damageTypeFor(weapon);
  const monsterPart = part ?? bestPartFor(monster, damageType);
  const elementHitzones = Object.fromEntries(
    (weapon.elements ?? []).map(([name]) => [name, elementHitzone(monsterPart, name)]),
  );
  const score = scoreWeapon(weapon, {
    ...options,
    rawHitzone: rawHitzone(monsterPart, damageType),
    elementHitzones,
  });
  return { ...score, monsterPart, damageType };
}

export function scoreWeaponsAgainstMonster(
  weapons: Weapon[],
  monster: Monster,
  part: MonsterPart | undefined,
  options: Partial<StrengthOptions> = {},
): MonsterWeaponScore[] {
  return weapons.map((weapon) =>
    scoreWeaponAgainstMonster(weapon, monster, part, options),
  );
}
