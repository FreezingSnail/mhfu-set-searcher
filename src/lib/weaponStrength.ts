import type { Weapon } from "./types";
import {
  type DamageProfile,
  type SharpnessDefinition,
} from "./damageProfiles.ts";

export const STATUS_ELEMENTS = new Set(["Poison", "Paralysis", "Sleep", "Slime", "Blast"]);

/** Display and filter order for elemental and status damage types. */
export const ELEMENT_ORDER = [
  "Fire",
  "Water",
  "Thunder",
  "Ice",
  "Dragon",
  "Poison",
  "Paralysis",
  "Sleep",
  "Slime",
  "Blast",
] as const;

/** Weapons data mixes cases (for example `fire`); filter against canonical names. */
export function canonicalElement(name: string) {
  const normalized = name.trim().toLowerCase();
  return ELEMENT_ORDER.find((element) => element.toLowerCase() === normalized) ?? name;
}

export function weaponElements(weapon: Pick<Weapon, "elements">): string[] {
  return [...new Set((weapon.elements ?? []).map(([name]) => canonicalElement(name)))];
}

/** `all` matches every weapon; `none` matches weapons without element or status. */
export function weaponMatchesElement(weapon: Pick<Weapon, "elements">, filter: string) {
  if (filter === "all") return true;
  const elements = weaponElements(weapon);
  if (filter === "none") return elements.length === 0;
  return elements.includes(canonicalElement(filter));
}

export type SharpnessMode = "base" | "plus" | "best";

export type StrengthOptions = {
  /** Game-specific coefficients, raw modifiers, and sharpness table. */
  profile: DamageProfile;
  motionValue: number;
  rawHitzone: number;
  elementHitzone: number;
  elementHitzones?: Record<string, number>;
  elementAttackUp: number;
  /** Awaken skill: unlocks hidden elements (and hidden status) on awaken weapons. */
  awaken: boolean;
  statusWeight: number;
  sharpness: SharpnessMode;
  classModifiers: boolean;
  /** Dual Blades Demon Mode: enables the profile's conditional 1.15x raw. */
  demonMode: boolean;
  /** Switch Axe sword mode with a Power Phial: enables the conditional 1.2x raw. */
  powerPhial: boolean;
  /** Apply the profile's Crit Draw model to draw attacks. */
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

export type StrengthOptionsInput = Partial<StrengthOptions> &
  Pick<StrengthOptions, "profile">;

export const DEFAULT_STRENGTH_OPTIONS: Omit<StrengthOptions, "profile"> = {
  motionValue: 100,
  rawHitzone: 45,
  elementHitzone: 25,
  elementAttackUp: 1,
  awaken: false,
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
  /** True when a hidden element is actually active (no hidden element, or Awaken). */
  hiddenElementActive: boolean;
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
  plus: boolean,
  sharpnessTable: readonly SharpnessDefinition[],
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

function sharpnessAffinityBonus(tier: SharpnessTier, profile: DamageProfile) {
  if (tier.index < 0) return 0;
  return profile.sharpnessAffinity[tier.index] ?? 0;
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

function expectedCritMultiplier(chance: number, profile: DamageProfile) {
  const clamped = Math.max(-100, Math.min(100, chance));
  if (clamped >= 0) {
    return 1 + (clamped / 100) * (profile.criticalMultiplier - 1);
  }
  return 1 + (clamped / 100) * (1 - profile.negativeCriticalMultiplier);
}

/** Expected damage per hit against the configured hitzones. */
export function scoreWeapon(weapon: Weapon, options: StrengthOptionsInput): WeaponScore {
  const opts: StrengthOptions = { ...DEFAULT_STRENGTH_OPTIONS, ...options };
  const profile = opts.profile;
  const coefficient = profile.coefficients[weapon.type] ?? 1;
  const trueRaw = weapon.attack / coefficient;
  const critChance = weapon.affinity ?? 0;
  const sharpnessBase = sharpnessTier(weapon, false, profile.sharpness);
  const sharpnessUsed = bestSharpness(weapon, opts.sharpness, profile.sharpness);
  const baseAffinity =
    critChance - (critChance > 0 ? sharpnessAffinityBonus(sharpnessBase, profile) : 0);
  const affinityBeforeSharpness = baseAffinity + opts.affinityBonus;
  const affinityAfterSharpness =
    affinityBeforeSharpness > 0
      ? affinityBeforeSharpness + sharpnessAffinityBonus(sharpnessUsed, profile)
      : affinityBeforeSharpness;
  const effectiveCritChance = Math.max(-100, Math.min(100, affinityAfterSharpness));
  const critExpected = opts.critDraw
    ? profile.critDraw.mode === "guaranteed"
      ? profile.criticalMultiplier
      : expectedCritMultiplier(
          effectiveCritChance + profile.critDraw.amount,
          profile,
        )
    : expectedCritMultiplier(effectiveCritChance, profile);
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
    const bowCalc = profile.bow;
    const rawCharge = bowCalc.chargeRaw[charge - 1] ?? 1;
    const elementCharge = bowCalc.chargeElement[charge - 1] ?? 1;
    const rawMotion = bowCalc.motion[shotName]?.[shotLevel - 1] ?? 100;
    const elementHits = bowCalc.elementHits[shotName]?.[shotLevel - 1] ?? 1;
    const powerCoating =
      opts.bowPowerCoating && (weapon.coatings ?? []).includes("Power");
    const powerMultiplier = powerCoating ? bowCalc.powerCoating : 1;
    const rangeMultiplier = opts.bowCriticalDistance ? bowCalc.criticalDistance : 1;
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

  const hiddenElementActive = !weapon.awaken || opts.awaken;
  let elementDamage = 0;
  let status = 0;
  const elementParts: ElementPart[] = [];
  const statusParts: ElementPart[] = [];
  for (const [name, displayed] of weapon.elements ?? []) {
    if (!hiddenElementActive) continue;
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
    hiddenElementActive,
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
  options: StrengthOptionsInput,
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
