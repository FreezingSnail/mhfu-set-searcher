import type { SetSelection } from "./build.ts";
import type { Part } from "./types.ts";
import mhfuProgressions from "../data/progressions/mhfu.json" with { type: "json" };

export type ProgressionRank = "low" | "high" | "g";
export type ProgressionHunter = "blade" | "gunner";
export type ProgressionStyle = "dps" | "comfort";

export type ProgressionSet = {
  id: string;
  rank: ProgressionRank;
  hunter: ProgressionHunter;
  style: ProgressionStyle;
  name: string;
  summary: string;
  /** Abilities that must be active on the built set. */
  skills: string[];
  notes: string[];
  weaponNote: string;
  picks: Record<Part, string>;
  decoIds: string[];
  weaponSlots: number;
  /** 0 means the set cannot be completed through hub unlocks alone. */
  unlockHr: number;
  /** 0 means the set cannot be completed through village unlocks alone. */
  unlockVillage: number;
};

export const MHFU_PROGRESSIONS = mhfuProgressions as unknown as ProgressionSet[];

export const PROGRESSION_RANKS: { id: ProgressionRank; label: string; detail: string }[] = [
  { id: "low", label: "Low rank", detail: "Village 1–5★ · Hub 1–3★" },
  { id: "high", label: "High rank", detail: "Village 6–9★ · Hub 4–8★" },
  { id: "g", label: "G rank", detail: "Hub 9★ · G1–G3" },
];

export const PROGRESSION_RANK_ARMOR: Record<ProgressionRank, string> = {
  low: "low-rank",
  high: "high-rank",
  g: "g-rank",
};

/** Availability at the end of each rank, matching the solver's "or" rule. */
export const PROGRESSION_RANK_UNLOCK: Record<ProgressionRank, { hr: number; elder: number }> = {
  low: { hr: 3, elder: 5 },
  high: { hr: 8, elder: 9 },
  g: { hr: 9, elder: 10 },
};

export const PROGRESSION_HUNTERS: { id: ProgressionHunter; label: string }[] = [
  { id: "blade", label: "Blademaster" },
  { id: "gunner", label: "Gunner" },
];

export const PROGRESSION_STYLES: {
  id: ProgressionStyle;
  label: string;
  blurb: string;
}[] = [
  { id: "dps", label: "DPS path", blurb: "Damage skills first; keep the hunt short." },
  { id: "comfort", label: "Comfort path", blurb: "Roars, evades, and health so the damage actually lands." },
];

export function selectionFromProgression(set: ProgressionSet): SetSelection {
  return {
    picks: set.picks,
    decoIds: set.decoIds,
    weaponSlots: set.weaponSlots,
    charmId: "",
  };
}
