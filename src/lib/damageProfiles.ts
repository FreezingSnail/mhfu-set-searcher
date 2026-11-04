import type { Game } from "./types.ts";
import mhfuJson from "../data/damage/mhfu.json" with { type: "json" };
import mh3uJson from "../data/damage/mh3u.json" with { type: "json" };
import mh4uJson from "../data/damage/mh4u.json" with { type: "json" };

export type SharpnessDefinition = {
  name: string;
  raw: number;
  element: number;
};

export type CritDrawModel =
  | { mode: "guaranteed" }
  | { mode: "affinity"; amount: number };

export type BowCalculation = {
  /** Raw charge multipliers for charge levels 1-4. */
  chargeRaw: readonly number[];
  /** Elemental charge multipliers for charge levels 1-4. */
  chargeElement: readonly number[];
  /** Total motion value per shot level (1-5), keyed by shot name. */
  motion: Record<string, readonly number[]>;
  /** Elemental hit count per shot level (1-5), keyed by shot name. */
  elementHits: Record<string, readonly number[]>;
  powerCoating: number;
  criticalDistance: number;
};

export type SkillCalculations = {
  /** Flat true raw values for Attack Up S/M/L/XL. */
  attackUp: readonly number[];
  /** Flat affinity values for Crit Eye +1/+2/+3. */
  critEye: readonly number[];
  /** Multipliers for Hunting Horn Attack Up L and its encore. */
  huntingHornAttackUp: readonly number[];
};

export type DamageProfile = {
  id: Game;
  /** Displayed attack / coefficient = true raw. Missing types fall back to 1. */
  coefficients: Record<string, number>;
  /** Always-on raw modifiers. Conditional mode bonuses are listed separately. */
  rawModifiers: Record<string, number>;
  /** Weapon types whose raw modifier only applies in a specific mode/phial state. */
  conditionalRawModifiers: ReadonlySet<string>;
  sharpness: readonly SharpnessDefinition[];
  /** Bonus affinity granted by each sharpness tier, in tier order. */
  sharpnessAffinity: readonly number[];
  elementAttackUp: number;
  criticalMultiplier: number;
  negativeCriticalMultiplier: number;
  critDraw: CritDrawModel;
  skills: SkillCalculations;
  bow: BowCalculation;
  notes: string;
  sources: readonly string[];
};

type RawDamageProfile = {
  game: string;
  coefficients: Record<string, number>;
  rawModifiers: Record<string, number>;
  sharpness: SharpnessDefinition[];
  sharpnessAffinity: number[];
  elementAttackUp: number;
  criticalMultiplier: number;
  negativeCriticalMultiplier: number;
  critDraw: CritDrawModel;
  skills: SkillCalculations;
  bow: BowCalculation;
  notes: string;
  sources: string[];
};

function defineProfile(
  raw: RawDamageProfile,
  conditionalRawModifiers: readonly string[] = [],
): DamageProfile {
  return {
    id: raw.game as Game,
    coefficients: raw.coefficients,
    rawModifiers: raw.rawModifiers,
    conditionalRawModifiers: new Set(conditionalRawModifiers),
    sharpness: raw.sharpness,
    sharpnessAffinity: raw.sharpnessAffinity,
    elementAttackUp: raw.elementAttackUp,
    criticalMultiplier: raw.criticalMultiplier,
    negativeCriticalMultiplier: raw.negativeCriticalMultiplier,
    critDraw: raw.critDraw,
    skills: raw.skills,
    bow: raw.bow,
    notes: raw.notes,
    sources: raw.sources,
  };
}

export const MHFU_DAMAGE_PROFILE = defineProfile(
  mhfuJson as unknown as RawDamageProfile,
);

/**
 * MH3U: DB Demon Mode (1.15x) and SA sword-mode Power Phial (1.2x) are
 * conditional, so they are never included in the baseline score.
 */
export const MH3U_DAMAGE_PROFILE = defineProfile(
  mh3uJson as unknown as RawDamageProfile,
  ["dual-blades", "switch-axe"],
);

/**
 * MH4U: DB Demon Mode (1.15x) and SA sword-mode Power Phial (1.2x) are
 * conditional, so they are never included in the baseline score.
 */
export const MH4U_DAMAGE_PROFILE = defineProfile(
  mh4uJson as unknown as RawDamageProfile,
  ["dual-blades", "switch-axe"],
);

export const DAMAGE_PROFILES: Record<Game, DamageProfile> = {
  mhfu: MHFU_DAMAGE_PROFILE,
  mh3u: MH3U_DAMAGE_PROFILE,
  mh4u: MH4U_DAMAGE_PROFILE,
};
