import {
  MHFU_PROGRESSIONS,
  type ProgressionSet,
  type ProgressionStyle,
} from "./progressions.ts";

export type ProgressionWeapon = {
  id: string;
  label: string;
  short: string;
  hunter: "blade" | "gunner";
  role: string;
  priority: string;
  dpsNote: string;
  comfortNote: string;
};

export const MHFU_PROGRESSION_WEAPONS: ProgressionWeapon[] = [
  {
    id: "great-sword",
    label: "Great Sword",
    short: "GS",
    hunter: "blade",
    role: "Draw burst",
    priority: "Crit Draw · Sharpness +1 · Focus",
    dpsNote: "Crit Draw makes every draw hit crit; add Focus when you can. Charged draw attacks are the whole game plan.",
    comfortNote: "HGE lets you land charged draw attacks through roars; Health keeps the trade honest.",
  },
  {
    id: "long-sword",
    label: "Long Sword",
    short: "LS",
    hunter: "blade",
    role: "Spirit combo",
    priority: "Sharpness +1 · Razor Sharp · Crit Eye",
    dpsNote: "Sharpness +1 and Razor Sharp keep the spirit combo flowing; Crit Eye is the usual raw filler.",
    comfortNote: "Evade +2 or HGE covers the long combo animations; Health is a fine spare-slot filler.",
  },
  {
    id: "sword-and-shield",
    label: "Sword & Shield",
    short: "SnS",
    hunter: "blade",
    role: "Element + support",
    priority: "Element Atk Up · Sharpness +1 · Razor Sharp",
    dpsNote: "Element Atk Up plus Sharpness +1 / Razor Sharp. Elemental SnS wants a different set per monster.",
    comfortNote: "Evade +2 or HGE keeps you alive while you stick to the legs; Wide Area is optional support.",
  },
  {
    id: "dual-blades",
    label: "Dual Blades",
    short: "DB",
    hunter: "blade",
    role: "Element DPS",
    priority: "Element Atk Up · Sharpness +1 · Razor Sharp",
    dpsNote: "Element Atk Up + Sharpness +1 + Razor Sharp. Stamina upkeep matters as much as the armor skills.",
    comfortNote: "Evade +2 and Constitution / Runner; HGE for roar-heavy fights.",
  },
  {
    id: "hammer",
    label: "Hammer",
    short: "Hammer",
    hunter: "blade",
    role: "KO burst",
    priority: "Sharpness +1 · HGE · Attack Up",
    dpsNote: "Sharpness +1 + HGE + Attack Up. The head is the damage zone; roars interrupt your charges.",
    comfortNote: "HGE is the comfort skill that matters most. Add Health or Evade if you are still learning the monster.",
  },
  {
    id: "hunting-horn",
    label: "Hunting Horn",
    short: "HH",
    hunter: "blade",
    role: "Buffs + KO",
    priority: "Sharpness +1 · Attack Up · Maestro",
    dpsNote: "Sharpness +1 + Attack Up + Maestro; encore the Attack Up song when the opening is safe.",
    comfortNote: "HGE and Evade protect recitals; Maestro reduces the time you spend playing.",
  },
  {
    id: "lance",
    label: "Lance",
    short: "Lance",
    hunter: "blade",
    role: "Guard / evade",
    priority: "Sharpness +1 · Guard +2 or Evade +2",
    dpsNote: "Sharpness +1 + Attack Up, then Guard +2 for blocking or Evade +2 for hopping.",
    comfortNote: "Guard +2 and Guard Up for blocking; Evade +2 for hop play. Pick one and commit.",
  },
  {
    id: "gunlance",
    label: "Gunlance",
    short: "GL",
    hunter: "blade",
    role: "Shelling + guard",
    priority: "Sharpness +1 · Gunnery · Guard",
    dpsNote: "Sharpness +1, Gunnery, and Guard. Shelling ignores raw, so Artillery is damage and comfort at once.",
    comfortNote: "Guard +2 / Guard Up; shelling from behind the shield is the comfortable way to learn a monster.",
  },
  {
    id: "light-bowgun",
    label: "Light Bowgun",
    short: "LBG",
    hunter: "gunner",
    role: "Rapid element",
    priority: "Element Atk Up · Load / Recoil",
    dpsNote: "Element Atk Up plus Load / Recoil. Rapid-fire elemental shots are the damage; raw Attack is secondary.",
    comfortNote: "Evade +2 and Health; reload speed / recoil for your bowgun. Status LBG loves Status Atk Up.",
  },
  {
    id: "heavy-bowgun",
    label: "Heavy Bowgun",
    short: "HBG",
    hunter: "gunner",
    role: "Pierce / raw",
    priority: "Pierce Up · Attack Up · Recoil / Load",
    dpsNote: "Pierce Up + Attack Up, with Recoil / Load on the weapon. Stay in critical distance.",
    comfortNote: "Evade +2 + Health; recoil / reload gems for your bowgun so you can keep firing.",
  },
  {
    id: "bow",
    label: "Bow",
    short: "Bow",
    hunter: "gunner",
    role: "Charge / shot up",
    priority: "Focus · shot-type Up · Element Atk Up",
    dpsNote: "Focus + the matching shot-type skill + Element Atk Up. Charge level and hit count matter more than raw.",
    comfortNote: "Evade +2 and stamina skills; Focus is both damage and comfort.",
  },
];

export type ProgressionSource = "village" | "hub";

export type ProgressionTier = {
  source: ProgressionSource;
  level: number;
  label: string;
  short: string;
};

export const VILLAGE_TIERS: ProgressionTier[] = Array.from({ length: 10 }, (_, index) => {
  const level = index + 1;
  return {
    source: "village" as const,
    level,
    label: `Village ${level}★`,
    short: `V${level}`,
  };
});

export const HUB_TIERS: ProgressionTier[] = Array.from({ length: 9 }, (_, index) => {
  const level = index + 1;
  return {
    source: "hub" as const,
    level,
    label: `Hub HR${level}`,
    short: `HR${level}`,
  };
});

export const PROGRESSION_TIERS = [...VILLAGE_TIERS, ...HUB_TIERS];

const BLADE_DPS = [
  "mhfu-village1-blade-dps",
  "mhfu-low-blade-battle",
  "mhfu-low-blade-kutku",
  "mhfu-low-blade-raw",
  "mhfu-low-blade-dps",
  "mhfu-high-blade-starter",
  "mhfu-high-blade-garuga",
  "mhfu-high-blade-garuga-hge",
  "mhfu-high-blade-raw",
  "mhfu-high-blade-dps",
  "mhfu-g-blade-garuga",
  "mhfu-g-blade-garuga-hge",
  "mhfu-g-blade-dps",
];

const BLADE_DPS_GS = [
  "mhfu-village1-blade-dps",
  "mhfu-low-blade-battle",
  "mhfu-low-blade-kutku",
  "mhfu-low-blade-raw",
  "mhfu-low-blade-dps",
  "mhfu-high-blade-starter",
  "mhfu-high-blade-garuga",
  "mhfu-high-blade-garuga-hge",
  "mhfu-high-blade-raw",
  "mhfu-high-blade-dps",
  "mhfu-g-blade-garuga",
  "mhfu-g-blade-garuga-hge",
  "mhfu-g-gs-draw",
];

const BLADE_DPS_GUARD = [
  "mhfu-village1-blade-dps",
  "mhfu-low-blade-battle",
  "mhfu-low-blade-kutku",
  "mhfu-low-blade-raw",
  "mhfu-low-blade-dps",
  "mhfu-high-blade-starter",
  "mhfu-high-blade-garuga",
  "mhfu-high-blade-garuga-hge",
  "mhfu-high-blade-guard",
  "mhfu-g-blade-garuga",
  "mhfu-g-blade-garuga-hge",
  "mhfu-g-blade-guard",
];

const BLADE_COMFORT = [
  "mhfu-village1-comfort",
  "mhfu-low-comfort-evade",
  "mhfu-low-blade-comfort",
  "mhfu-high-blade-garuga",
  "mhfu-high-blade-garuga-hge",
  "mhfu-high-blade-comfort",
  "mhfu-g-blade-garuga",
  "mhfu-g-blade-comfort",
  "mhfu-g-blade-garuga-hge",
];

const BLADE_COMFORT_GUARD = [
  "mhfu-village1-comfort",
  "mhfu-low-comfort-evade",
  "mhfu-low-blade-comfort",
  "mhfu-high-blade-garuga",
  "mhfu-high-blade-garuga-hge",
  "mhfu-high-blade-guard",
  "mhfu-g-blade-garuga",
  "mhfu-g-blade-guard",
  "mhfu-g-blade-garuga-hge",
];

const LBG_DPS = [
  "mhfu-village1-gunner-dps",
  "mhfu-low-gunner-dps",
  "mhfu-high-gunner-starter",
  "mhfu-high-gunner-garuga",
  "mhfu-high-gunner-garuga-hge",
  "mhfu-high-element",
  "mhfu-g-gunner-garuga",
  "mhfu-g-gunner-dps",
  "mhfu-g-gunner-garuga-hge",
];

const HBG_DPS = [
  "mhfu-village1-gunner-dps",
  "mhfu-low-gunner-dps",
  "mhfu-high-gunner-starter",
  "mhfu-high-gunner-garuga",
  "mhfu-high-gunner-garuga-hge",
  "mhfu-high-gunner-dps",
  "mhfu-g-gunner-garuga",
  "mhfu-g-hbg-pierce",
  "mhfu-g-gunner-garuga-hge",
];

const BOW_DPS = [
  "mhfu-village1-gunner-dps",
  "mhfu-low-gunner-dps",
  "mhfu-high-gunner-starter",
  "mhfu-high-gunner-garuga",
  "mhfu-high-gunner-garuga-hge",
  "mhfu-high-bow-focus",
  "mhfu-g-gunner-garuga",
  "mhfu-g-gunner-dps",
  "mhfu-g-gunner-garuga-hge",
];

const GUNNER_COMFORT = [
  "mhfu-village1-comfort",
  "mhfu-low-gunner-comfort-evade",
  "mhfu-low-gunner-comfort",
  "mhfu-high-gunner-garuga",
  "mhfu-high-gunner-garuga-hge",
  "mhfu-high-gunner-comfort",
  "mhfu-g-gunner-garuga",
  "mhfu-g-gunner-comfort",
  "mhfu-g-gunner-garuga-hge",
];

const STAGES: Record<string, { dps: string[]; comfort: string[] }> = {
  "great-sword": { dps: BLADE_DPS_GS, comfort: BLADE_COMFORT },
  "long-sword": { dps: BLADE_DPS, comfort: BLADE_COMFORT },
  "sword-and-shield": { dps: BLADE_DPS, comfort: BLADE_COMFORT },
  "dual-blades": { dps: BLADE_DPS, comfort: BLADE_COMFORT },
  hammer: { dps: BLADE_DPS, comfort: BLADE_COMFORT },
  "hunting-horn": { dps: BLADE_DPS, comfort: BLADE_COMFORT },
  lance: { dps: BLADE_DPS_GUARD, comfort: BLADE_COMFORT_GUARD },
  gunlance: { dps: BLADE_DPS_GUARD, comfort: BLADE_COMFORT_GUARD },
  "light-bowgun": { dps: LBG_DPS, comfort: GUNNER_COMFORT },
  "heavy-bowgun": { dps: HBG_DPS, comfort: GUNNER_COMFORT },
  bow: { dps: BOW_DPS, comfort: GUNNER_COMFORT },
};

const setsById = new Map(MHFU_PROGRESSIONS.map((set) => [set.id, set]));

export function tierUnlock(set: ProgressionSet, source: ProgressionSource): number {
  return source === "hub" ? set.unlockHr : set.unlockVillage;
}

export function tierHasSet(set: ProgressionSet, tier: ProgressionTier): boolean {
  const unlock = tierUnlock(set, tier.source);
  return unlock > 0 && unlock <= tier.level;
}

export type TierUpgrade = {
  set: ProgressionSet;
  tier: ProgressionTier;
};

export type TierRouteCard = {
  weapon: ProgressionWeapon;
  tier: ProgressionTier;
  set: ProgressionSet;
  /** Other legal sets from this weapon/style track at the same tier. */
  variants: ProgressionSet[];
  note: string;
  next: TierUpgrade | null;
};

function tierFor(source: ProgressionSource, level: number): ProgressionTier {
  const tier = (source === "hub" ? HUB_TIERS : VILLAGE_TIERS).find(
    (entry) => entry.level === level,
  );
  if (!tier) throw new Error(`unknown ${source} tier ${level}`);
  return tier;
}

export function tierRouteCard(
  weaponId: string,
  style: ProgressionStyle,
  tier: ProgressionTier,
): TierRouteCard {
  const weapon = MHFU_PROGRESSION_WEAPONS.find((entry) => entry.id === weaponId);
  if (!weapon) throw new Error(`unknown MHFU weapon: ${weaponId}`);
  const stageIds = STAGES[weapon.id]?.[style];
  if (!stageIds?.length) throw new Error(`missing progression stages for ${weapon.id}/${style}`);

  const stages = stageIds.map((id) => {
    const set = setsById.get(id);
    if (!set) throw new Error(`missing progression set: ${id}`);
    return set;
  });

  let selected = stages[0];
  let selectedIndex = 0;
  for (let index = 0; index < stages.length; index++) {
    if (tierHasSet(stages[index], tier)) {
      selected = stages[index];
      selectedIndex = index;
    }
  }

  const future = stages
    .map((set, index) => ({ set, index, unlock: tierUnlock(set, tier.source) }))
    .filter((entry) => entry.index > selectedIndex && entry.unlock > tier.level);
  let next: TierUpgrade | null = null;
  if (future.length) {
    const nextLevel = Math.min(...future.map((entry) => entry.unlock));
    const candidates = future
      .filter((entry) => entry.unlock === nextLevel)
      .sort((a, b) => b.index - a.index);
    next = {
      set: candidates[0].set,
      tier: tierFor(tier.source, nextLevel),
    };
  }

  const variants = stages
    .map((set, index) => ({ set, index }))
    .filter((entry) => entry.set.id !== selected.id && tierHasSet(entry.set, tier))
    .sort((a, b) => b.index - a.index)
    .slice(0, 4)
    .map((entry) => entry.set);

  return {
    weapon,
    tier,
    set: selected,
    variants,
    note: style === "dps" ? weapon.dpsNote : weapon.comfortNote,
    next,
  };
}

export function tierBySource(source: ProgressionSource, level: number): ProgressionTier {
  return tierFor(source, level);
}
