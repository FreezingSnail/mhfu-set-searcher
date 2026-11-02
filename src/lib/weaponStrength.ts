import type { Weapon } from "./types";
import {
  MHFU_DAMAGE_PROFILE,
  type DamageProfile,
  type SharpnessDefinition,
} from "./damageProfiles.ts";

/** MHFU defaults retained for backwards compatibility. */
export const CLASS_COEFFICIENT: Record<string, number> =
  MHFU_DAMAGE_PROFILE.coefficients;
export const CLASS_RAW_MODIFIER: Record<string, number> =
  MHFU_DAMAGE_PROFILE.rawModifiers;

const BOW_CHARGE_RAW = [0.4, 1.0, 1.5, 1.7];
const BOW_CHARGE_ELEMENT = [0.5, 0.75, 1.0, 1.125];
const BOW_MOTION: Record<string, number[]> = {
  Rapid: [12, 16, 19, 21, 22],
  Scatter: [13, 16, 23, 24, 26],
  Pierce: [18, 24, 30, 30, 30],
};
const BOW_ELEMENT_HITS: Record<string, number[]> = {
  Rapid: [1, 2, 3, 4, 4],
  Scatter: [3, 3, 5, 5, 5],
  Pierce: [3, 4, 5, 5, 5],
};

/** MHFU defaults retained for backwards compatibility. */
export const SHARPNESS = MHFU_DAMAGE_PROFILE.sharpness;

export const STATUS_ELEMENTS = new Set(["Poison", "Paralysis", "Sleep", "Slime", "Blast"]);
export type SharpnessMode = "base" | "plus" | "best";

export type StrengthOptions = {
  /** Game-specific coefficients, raw modifiers, and sharpness table. */
  profile: DamageProfile;
  motionValue: number;
  rawHitzone: number;
  elementHitzone: number;
  elementHitzones?: Record<string, number>;
  elementAttackUp: number;
  statusWeight: number;
  sharpness: SharpnessMode;
  classModifiers: boolean;
  /** Dual Blades Demon Mode: enables the profile's conditional 1.15x raw. */
  demonMode: boolean;
  /** Switch Axe sword mode with a Power Phial: enables the conditional 1.2x raw. */
  powerPhial: boolean;
  /** MHP2G Crit Draw: draw attacks always crit, ignoring weapon affinity. */
  critDraw: boolean;
  /** Flat true raw from Attack Up skills. */
  attackUp: number;
  /** Flat affinity from Crit Eye / 見切り. */
  affinityBonus: number;
  /** Hunting Horn Attack Up song multiplier. */
  songAttackUp: number;
  /** Bow charge level (1-4). */
  bowCharge: number;
  /** Apply Power Coating when the bow supports it. */
  bowPowerCoating: boolean;
  /** Assume shots land at critical distance. */
  bowCriticalDistance: boolean;
};

export const DEFAULT_STRENGTH_OPTIONS: StrengthOptions = {
  profile: MHFU_DAMAGE_PROFILE,
  motionValue: 100,
  rawHitzone: 45,
  elementHitzone: 25,
  elementAttackUp: 1,
  statusWeight: 0,
  sharpness: "best",
  classModifiers: true,
  demonMode: false,
  powerPhial: false,
  critDraw: false,
  attackUp: 0,
  affinityBonus: 0,
  songAttackUp: 1,
  bowCharge: 3,
  bowPowerCoating: true,
  bowCriticalDistance: true,
};

export type SharpnessTier = {
  index: number;
  name: string;
  raw: number;
  element: number;
  units: number;
  totalUnits: number;
};

export type ElementPart = { name: string; displayed: number | string; value: number };

export type BowProfile = {
  charge: number;
  shotName: string;
  shotLevel: number;
  rawMotion: number;
  rawCharge: number;
  elementHits: number;
  elementCharge: number;
  powerCoating: boolean;
  criticalDistance: boolean;
};

export type WeaponScore = {
  weapon: Weapon;
  coefficient: number;
  trueRaw: number;
  critChance: number;
  effectiveCritChance: number;
  critExpected: number;
  critDraw: boolean;
  attackUp: number;
  affinityBonus: number;
  elementAttackUp: number;
  elementHitzones: Record<string, number>;
  songAttackUp: number;
  bow?: BowProfile;
  sharpnessBase: SharpnessTier;
  sharpnessPlus: SharpnessTier;
  sharpnessUsed: SharpnessTier;
  effectiveRaw: number;
  rawDamage: number;
  elementDamage: number;
  status: number;
  elementParts: ElementPart[];
  statusParts: ElementPart[];
  score: number;
};

/** Sharpness arrays are positional from red, with trailing zero colours omitted. */
export function sharpnessTier(
  weapon: Weapon,
  plus = false,
  sharpnessTable: readonly SharpnessDefinition[] = SHARPNESS,
): SharpnessTier {
  const values = plus ? weapon.sharpnessPlus : weapon.sharpness;
  if (!values?.length) {
    return { index: -1, name: "None", raw: 1, element: 1, units: 0, totalUnits: 0 };
  }
  let index = -1;
  for (let i = 0; i < values.length; i++) {
    if ((values[i] ?? 0) > 0) index = i;
  }
  if (index < 0) {
    return { index: -1, name: "None", raw: 1, element: 1, units: 0, totalUnits: 0 };
  }
  const tier =
    sharpnessTable[index] ?? sharpnessTable[sharpnessTable.length - 1];
  return {
    ...tier,
    index,
    units: values[index],
    totalUnits: values.reduce((sum, value) => sum + (value ?? 0), 0),
  };
}

function sharpnessAffinityBonus(tier: SharpnessTier) {
  if (tier.index >= 5) return 10;
  if (tier.index === 4) return 5;
  return 0;
}

function bestSharpness(
  weapon: Weapon,
  mode: SharpnessMode,
  sharpnessTable: readonly SharpnessDefinition[],
): SharpnessTier {
  const base = sharpnessTier(weapon, false, sharpnessTable);
  const plus = sharpnessTier(weapon, true, sharpnessTable);
  if (mode === "base") return base;
  if (mode === "plus") return plus.index >= 0 ? plus : base;
  return plus.index > base.index ? plus : base;
}

function rawClassModifier(
  profile: DamageProfile,
  type: string,
  options: Pick<StrengthOptions, "demonMode" | "powerPhial">,
): number {
  const modifier = profile.rawModifiers[type] ?? 1;
  if (!profile.conditionalRawModifiers.has(type)) return modifier;
  if (type === "dual-blades") return options.demonMode ? modifier : 1;
  if (type === "switch-axe") return options.powerPhial ? modifier : 1;
  return 1;
}

/** Expected damage per hit against the configured hitzones. */
export function scoreWeapon(weapon: Weapon, options: Partial<StrengthOptions> = {}): WeaponScore {
  const opts = { ...DEFAULT_STRENGTH_OPTIONS, ...options };
  const profile = opts.profile;
  const coefficient = profile.coefficients[weapon.type] ?? 1;
  const trueRaw = weapon.attack / coefficient;
  const critChance = weapon.affinity ?? 0;
  const sharpnessBase = sharpnessTier(weapon, false, profile.sharpness);
  const sharpnessUsed = bestSharpness(weapon, opts.sharpness, profile.sharpness);
  const baseAffinity = critChance - (critChance > 0 ? sharpnessAffinityBonus(sharpnessBase) : 0);
  const affinityBeforeSharpness = baseAffinity + opts.affinityBonus;
  const affinityAfterSharpness =
    affinityBeforeSharpness > 0 ? affinityBeforeSharpness + sharpnessAffinityBonus(sharpnessUsed) : affinityBeforeSharpness;
  const effectiveCritChance = Math.max(-100, Math.min(100, affinityAfterSharpness));
  const critExpected = opts.critDraw ? 1.25 : 1 + (effectiveCritChance / 100) * 0.25;
  const rawModifier = opts.classModifiers
    ? rawClassModifier(profile, weapon.type, opts)
    : 1;

  const effectiveRaw =
    (trueRaw + opts.attackUp) *
    sharpnessUsed.raw *
    critExpected *
    rawModifier *
    opts.songAttackUp;

  let rawDamage: number;
  let elementMultiplier = 1;
  let bow: BowProfile | undefined;
  if (weapon.type === "bow") {
    const charge = Math.max(1, Math.min(4, Math.round(opts.bowCharge)));
    const shots = weapon.shots ?? [];
    const shot = shots[charge - 1] ?? shots[shots.length - 1];
    const shotName = shot?.name ?? "Rapid";
    const shotLevel = shot?.level ?? 1;
    const rawCharge = BOW_CHARGE_RAW[charge - 1] ?? 1;
    const elementCharge = BOW_CHARGE_ELEMENT[charge - 1] ?? 1;
    const rawMotion = BOW_MOTION[shotName]?.[shotLevel - 1] ?? 100;
    const elementHits = BOW_ELEMENT_HITS[shotName]?.[shotLevel - 1] ?? 1;
    const powerCoating =
      opts.bowPowerCoating && (weapon.coatings ?? []).includes("Power");
    const powerMultiplier = powerCoating ? 1.5 : 1;
    const rangeMultiplier = opts.bowCriticalDistance ? 1.5 : 1;
    rawDamage =
      effectiveRaw *
      rawCharge *
      (rawMotion / 100) *
      powerMultiplier *
      rangeMultiplier *
      (opts.rawHitzone / 100);
    elementMultiplier = elementCharge * elementHits;
    bow = {
      charge,
      shotName,
      shotLevel,
      rawMotion,
      rawCharge,
      elementHits,
      elementCharge,
      powerCoating,
      criticalDistance: opts.bowCriticalDistance,
    };
  } else {
    rawDamage = effectiveRaw * (opts.motionValue / 100) * (opts.rawHitzone / 100);
  }

  let elementDamage = 0;
  let status = 0;
  const elementParts: ElementPart[] = [];
  const statusParts: ElementPart[] = [];
  for (const [name, displayed] of weapon.elements ?? []) {
    const numeric = Number(displayed);
    const trueValue = Number.isFinite(numeric) ? numeric / 10 : 0;
    if (STATUS_ELEMENTS.has(name)) {
      const value = trueValue * sharpnessUsed.element;
      status += value;
      statusParts.push({ name, displayed, value });
    } else {
      const value =
        trueValue *
        sharpnessUsed.element *
        opts.elementAttackUp *
        elementMultiplier;
      const hitzone = opts.elementHitzones?.[name] ?? opts.elementHitzone;
      elementDamage += value * (hitzone / 100);
      elementParts.push({ name, displayed, value });
    }
  }

  const score = rawDamage + elementDamage + status * opts.statusWeight;

  return {
    weapon,
    coefficient,
    trueRaw,
    critChance,
    effectiveCritChance,
    critExpected,
    critDraw: opts.critDraw,
    attackUp: opts.attackUp,
    affinityBonus: opts.affinityBonus,
    elementAttackUp: opts.elementAttackUp,
    elementHitzones: opts.elementHitzones ?? {},
    songAttackUp: opts.songAttackUp,
    bow,
    sharpnessBase,
    sharpnessPlus: sharpnessTier(weapon, true, profile.sharpness),
    sharpnessUsed,
    effectiveRaw,
    rawDamage,
    elementDamage,
    status,
    elementParts,
    statusParts,
    score,
  };
}

export function isEndTreeG(weapon: Weapon) {
  return weapon.rank === "gr" && weapon.improveTo.length === 0;
}

/**
 * Placeholder rows use names such as "dummy (...)" and are not obtainable.
 * Event/relic weapons with missing material rows are still real weapons.
 */
const PLACEHOLDER_NAME = /\b(dummy|test|unused|nothing)\b/i;

function hasAcquisitionPath(weapon: Weapon) {
  return (
    weapon.createCost > 0 ||
    weapon.improveCost > 0 ||
    weapon.createMats.length > 0 ||
    weapon.improveMats.length > 0 ||
    weapon.improveFrom.length > 0 ||
    weapon.improveTo.length > 0
  );
}

export function isObtainableWeapon(weapon: Weapon) {
  return !PLACEHOLDER_NAME.test(weapon.name) && hasAcquisitionPath(weapon);
}

export function scoreEndTreeG(
  weapons: Weapon[],
  options: Partial<StrengthOptions> = {},
): WeaponScore[] {
  return weapons.filter(isEndTreeG).map((weapon) => scoreWeapon(weapon, options));
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)];
}
