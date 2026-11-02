import type { MetaPreset } from "./metaPresets.ts";
import greatSword from "../data/metaPresets/mh3u/great-sword.json" with { type: "json" };
import longSword from "../data/metaPresets/mh3u/long-sword.json" with { type: "json" };
import swordAndShield from "../data/metaPresets/mh3u/sword-and-shield.json" with { type: "json" };
import dualBlades from "../data/metaPresets/mh3u/dual-blades.json" with { type: "json" };
import hammer from "../data/metaPresets/mh3u/hammer.json" with { type: "json" };
import huntingHorn from "../data/metaPresets/mh3u/hunting-horn.json" with { type: "json" };
import lance from "../data/metaPresets/mh3u/lance.json" with { type: "json" };
import gunlance from "../data/metaPresets/mh3u/gunlance.json" with { type: "json" };
import switchAxe from "../data/metaPresets/mh3u/switch-axe.json" with { type: "json" };

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
] as unknown as MetaPreset[];

export const META_PRESETS_MH3U: Record<string, MetaPreset> = Object.fromEntries(
  PRESETS.map((preset) => [preset.type, preset]),
);
