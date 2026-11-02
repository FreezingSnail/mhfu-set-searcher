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

/** How a recorded hitzone row is qualified relative to the monster's normal state. */
export type PartState = "normal" | "pre-break" | "enraged" | "late" | "conditional";

/** Neutral hitzone used for monsters that have no recorded parts (e.g. MH4U Fatalis). */
export const NO_MONSTER_PART: MonsterPart = {
  part: "none",
  slash: 0,
  strike: 0,
  shooting: 0,
  fire: 0,
  water: 0,
  thunder: 0,
  ice: 0,
  dragon: 0,
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

/**
 * Known state suffixes, longest first so compound labels such as
 * `-tail-inflated` and `-post-break-guard` are stripped correctly.
 */
const STATE_SUFFIXES: readonly (readonly [suffix: string, state: Exclude<PartState, "normal">])[] = [
  ["-brokenshell", "late"],
  ["-brokenstomach", "late"],
  ["-while-rotating", "conditional"],
  ["-tail-inflated", "conditional"],
  ["-post-break", "late"],
  ["-pre-break", "pre-break"],
  ["-ice-shield", "conditional"],
  ["-ice-mode", "conditional"],
  ["-fatigued", "conditional"],
  ["-enraged", "enraged"],
  ["-virused", "conditional"],
  ["-harden", "conditional"],
  ["-hidden", "conditional"],
  ["-savaged", "conditional"],
  ["-charged", "enraged"],
  ["-windwrap", "conditional"],
  ["-flamewrap", "conditional"],
  ["-fished", "conditional"],
  ["-guardy", "conditional"],
  ["-g-rank", "late"],
  ["-weakness", "conditional"],
  ["-inflated", "conditional"],
  ["-rotating", "conditional"],
  ["-guard", "conditional"],
];

/**
 * Classify a part name by its trailing state suffix(es).
 *
 * Normal and pre-break rows are practical. Enraged and charged rows are only
 * added by the enraged mode. Late (post-break, broken, G-rank variant) and
 * conditional (guard, harden, element/terrain modes, fatigue, etc.) rows are
 * only available in the all-states mode.
 */
export function partState(part: string): PartState {
  const states = new Set<PartState>();
  let base = part;
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const [suffix, state] of STATE_SUFFIXES) {
      if (base.length > suffix.length && base.endsWith(suffix)) {
        states.add(state);
        base = base.slice(0, -suffix.length);
        stripped = true;
        break;
      }
    }
  }
  // Post-break rows are never available outside all-states. A row that combines
  // enraged with a conditional label (e.g. `head-weakness-enraged`) still counts
  // as enraged; purely conditional rows stay out of enraged mode.
  if (states.has("late")) return "late";
  if (states.has("enraged")) return "enraged";
  if (states.has("conditional")) return "conditional";
  if (states.has("pre-break")) return "pre-break";
  return "normal";
}

/** Best practical raw hitzone for the weapon's damage type. Enraged parts are opt-in. */
export function bestPartFor(
  monster: Monster,
  type: DamageType,
  includeEnraged = false,
): MonsterPart {
  const candidates = eligibleParts(monster, includeEnraged ? "enraged" : "practical");
  if (!candidates.length) return NO_MONSTER_PART;
  return candidates.reduce(
    (best, part) => (rawHitzone(part, type) > rawHitzone(best, type) ? part : best),
    candidates[0],
  );
}

/**
 * Practical = normal/unsuffixed and pre-break parts only. Enraged = practical
 * plus enraged/charged. All = every recorded state. When a monster has no
 * normal/pre-break rows, fall back to all rows so the page still has a target.
 */
export function eligibleParts(monster: Monster, state: MatchupState): MonsterPart[] {
  if (state === "all") return monster.parts;
  const practical = monster.parts.filter((part) => {
    const value = partState(part.part);
    return value === "normal" || value === "pre-break";
  });
  if (!practical.length) return monster.parts;
  if (state === "practical") return practical;
  const enraged = monster.parts.filter((part) => partState(part.part) === "enraged");
  return [...practical, ...enraged];
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
