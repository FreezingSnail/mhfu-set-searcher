import type { SharpnessMode } from "./weaponStrength";
import type { Game } from "./types";
import { META_PRESETS_MH3U } from "./metaPresetsMh3u.ts";
import { META_PRESETS_MH4U } from "./metaPresetsMh4u.ts";
import greatSword from "../data/metaPresets/great-sword.json";
import longSword from "../data/metaPresets/long-sword.json";
import swordAndShield from "../data/metaPresets/sword-and-shield.json";
import dualBlades from "../data/metaPresets/dual-blades.json";
import hammer from "../data/metaPresets/hammer.json";
import huntingHorn from "../data/metaPresets/hunting-horn.json";
import lance from "../data/metaPresets/lance.json";
import gunlance from "../data/metaPresets/gunlance.json";
import lightBowgun from "../data/metaPresets/light-bowgun.json";
import heavyBowgun from "../data/metaPresets/heavy-bowgun.json";
import bow from "../data/metaPresets/bow.json";

export type MetaPresetSkills = {
  sharpness: SharpnessMode;
  critDraw: boolean;
  attackUp: number;
  affinityBonus: number;
  elementAttackUp: number;
  /** Meta set includes the Awaken skill, unlocking hidden elements. */
  awaken?: boolean;
  songAttackUp?: number;
};

export type MetaPreset = {
  type: string;
  label: string;
  metaLabel: string;
  note: string;
  skills: MetaPresetSkills;
  sources: string[];
};

const PRESETS = [
  greatSword,
  longSword,
  swordAndShield,
  dualBlades,
  hammer,
  huntingHorn,
  lance,
  gunlance,
  lightBowgun,
  heavyBowgun,
  bow,
] as unknown as MetaPreset[];

export const META_PRESETS: Record<string, MetaPreset> = Object.fromEntries(
  PRESETS.map((preset) => [preset.type, preset]),
);

export const META_PRESETS_BY_GAME: Record<Game, Record<string, MetaPreset>> = {
  mhfu: META_PRESETS,
  mh3u: META_PRESETS_MH3U,
  mh4u: META_PRESETS_MH4U,
  "mh4u+": META_PRESETS_MH4U,
};
