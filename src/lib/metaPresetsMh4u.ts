import type { MetaPreset } from "./metaPresets.ts";
import greatSword from "../data/metaPresets/mh4u/great-sword.json" with { type: "json" };
import longSword from "../data/metaPresets/mh4u/long-sword.json" with { type: "json" };
import swordAndShield from "../data/metaPresets/mh4u/sword-and-shield.json" with { type: "json" };
import dualBlades from "../data/metaPresets/mh4u/dual-blades.json" with { type: "json" };
import hammer from "../data/metaPresets/mh4u/hammer.json" with { type: "json" };
import huntingHorn from "../data/metaPresets/mh4u/hunting-horn.json" with { type: "json" };
import lance from "../data/metaPresets/mh4u/lance.json" with { type: "json" };
import gunlance from "../data/metaPresets/mh4u/gunlance.json" with { type: "json" };
import switchAxe from "../data/metaPresets/mh4u/switch-axe.json" with { type: "json" };
import chargeBlade from "../data/metaPresets/mh4u/charge-blade.json" with { type: "json" };
import insectGlaive from "../data/metaPresets/mh4u/insect-glaive.json" with { type: "json" };

const PRESETS = [
  greatSword,
  longSword,
  swordAndShield,
  dualBlades,
  hammer,
  huntingHorn,
  lance,
  gunlance,
  switchAxe,
  chargeBlade,
  insectGlaive,
] as unknown as MetaPreset[];

export const META_PRESETS_MH4U: Record<string, MetaPreset> = Object.fromEntries(
  PRESETS.map((preset) => [preset.type, preset]),
);
