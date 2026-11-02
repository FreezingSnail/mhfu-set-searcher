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

export type MatchupState = "practical" | "enraged" | "all";

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

function partState(part: string) {
  if (part.endsWith("-enraged")) return "enraged";
  if (part.endsWith("-post-break") || part.endsWith("-brokenshell")) return "late";
  if (part.endsWith("-guard") || part.endsWith("-harden")) return "conditional";
  return "normal";
}

/**
 * Practical = normal and pre-break parts only. Enraged = practical plus enraged.
 * All = every recorded state.
 */
export function eligibleParts(monster: Monster, state: MatchupState): MonsterPart[] {
  if (state === "all") return monster.parts;
  const practical = monster.parts.filter((part) => {
    const value = partState(part.part);
    return value === "normal";
  });
  const base = practical.length ? practical : monster.parts;
  if (state === "practical") return base;
  const enraged = monster.parts.filter((part) => partState(part.part) === "enraged");
  return [...base, ...enraged];
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

export function scoreWeaponAgainstMonsterAuto(
  weapon: Weapon,
  monster: Monster,
  state: MatchupState,
  options: Partial<StrengthOptions> = {},
): MonsterWeaponScore {
  const parts = eligibleParts(monster, state);
  let best = scoreWeaponAgainstMonster(weapon, monster, parts[0], options);
  for (const part of parts.slice(1)) {
    const row = scoreWeaponAgainstMonster(weapon, monster, part, options);
    if (row.score > best.score) best = row;
  }
  return best;
}

export function scoreWeaponsAgainstMonster(
  weapons: Weapon[],
  monster: Monster,
  part: MonsterPart | undefined,
  options: Partial<StrengthOptions> = {},
  state: MatchupState = "practical",
): MonsterWeaponScore[] {
  return weapons.map((weapon) =>
    part
      ? scoreWeaponAgainstMonster(weapon, monster, part, options)
      : scoreWeaponAgainstMonsterAuto(weapon, monster, state, options),
  );
}
