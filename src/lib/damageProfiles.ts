import type { Game } from "./types.ts";
import mh3uJson from "../data/damage/mh3u.json" with { type: "json" };
import mh4uJson from "../data/damage/mh4u.json" with { type: "json" };

export type SharpnessDefinition = {
  name: string;
  raw: number;
  element: number;
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
  elementAttackUp: number;
  notes: string;
  sources: readonly string[];
};

type RawDamageProfile = {
  game: string;
  coefficients: Record<string, number>;
  rawModifiers: Record<string, number>;
  sharpness: SharpnessDefinition[];
  elementAttackUp: number;
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
    elementAttackUp: raw.elementAttackUp,
    notes: raw.notes,
    sources: raw.sources,
  };
}

/** MHFU/MHP2G values retained as the default for the original compare page. */
export const MHFU_DAMAGE_PROFILE: DamageProfile = {
  id: "mhfu",
  coefficients: {
    "great-sword": 4.8,
    "long-sword": 4.8,
    "sword-and-shield": 1.4,
    "dual-blades": 1.4,
    hammer: 5.2,
    "hunting-horn": 5.2,
    lance: 2.3,
    gunlance: 2.3,
    "light-bowgun": 1.2,
    "heavy-bowgun": 1.2,
    bow: 1.2,
  },
  rawModifiers: {
    "sword-and-shield": 1.12,
    gunlance: 0.97,
    "light-bowgun": 1.15,
    "heavy-bowgun": 1.15,
  },
  conditionalRawModifiers: new Set(),
  sharpness: [
    { name: "Red", raw: 0.5, element: 0.25 },
    { name: "Orange", raw: 0.75, element: 0.5 },
    { name: "Yellow", raw: 1, element: 0.75 },
    { name: "Green", raw: 1.125, element: 1 },
    { name: "Blue", raw: 1.25, element: 1.0625 },
    { name: "White", raw: 1.3, element: 1.125 },
    { name: "Purple", raw: 1.5, element: 1.2 },
  ],
  elementAttackUp: 1.2,
  notes: "MHFU/MHP2G blademaster defaults used by the original compare page.",
  sources: [],
};

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
