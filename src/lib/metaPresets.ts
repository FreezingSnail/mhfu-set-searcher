import type { SharpnessMode } from "./weaponStrength";
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
