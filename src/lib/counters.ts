import { MHFU_PROGRESSIONS, type ProgressionSet } from "./progressions.ts";
import counterData from "../data/counters/mhfu.json" with { type: "json" };

export type CounterRank = "high" | "g";

export type CounterEffect =
  | "roar-hge"
  | "roar-earplug"
  | "wind-high"
  | "wind-dragon"
  | "quake"
  | "poison"
  | "sleep"
  | "paralysis"
  | "stun";

export type CounterCombo =
  | "hge"
  | "earplug"
  | "wind"
  | "dragon-wind"
  | "quake"
  | "hge-quake"
  | "hge-wind"
  | "hge-dragon-wind"
  | "hge-poison"
  | "poison"
  | "sleep"
  | "paralysis"
  | "stun";

export type CounterMonster = {
  name: string;
  type: string;
  effects: CounterEffect[];
  counters: CounterCombo[];
  countersHigh?: CounterCombo[];
  countersG?: CounterCombo[];
  note?: string;
};

export type CounterSkill = { ability: string; points: number };

export type CounterCard = {
  combo: CounterCombo;
  label: string;
  set: ProgressionSet;
  skills: CounterSkill[];
};

export const COUNTER_EFFECTS: { id: CounterEffect; label: string }[] = [
  { id: "roar-hge", label: "HGE roar" },
  { id: "roar-earplug", label: "Earplug roar" },
  { id: "wind-high", label: "High wind" },
  { id: "wind-dragon", label: "Dragon wind" },
  { id: "quake", label: "Quake" },
  { id: "poison", label: "Poison" },
  { id: "sleep", label: "Sleep" },
  { id: "paralysis", label: "Paralysis" },
  { id: "stun", label: "Stun" },
];

type ComboDefinition = {
  label: string;
  high: string;
  g: string;
  skills: CounterSkill[];
};

export const COUNTER_COMBOS: Record<CounterCombo, ComboDefinition> = {
  hge: {
    label: "HGE",
    high: "mhfu-high-blade-comfort",
    g: "mhfu-counter-g-hge",
    skills: [{ ability: "HearProtct", points: 15 }],
  },
  earplug: {
    label: "Earplug",
    high: "mhfu-high-blade-garuga",
    g: "mhfu-g-blade-garuga",
    skills: [{ ability: "HearProtct", points: 10 }],
  },
  wind: {
    label: "High Wind Res",
    high: "mhfu-counter-high-wind",
    g: "mhfu-counter-g-wind",
    skills: [{ ability: "WindPress", points: 15 }],
  },
  "dragon-wind": {
    label: "Dragon Wind Breaker",
    high: "mhfu-counter-high-dragon-wind",
    g: "mhfu-counter-g-dragon-wind",
    skills: [{ ability: "WindPress", points: 20 }],
  },
  quake: {
    label: "Quake Res",
    high: "mhfu-counter-high-quake",
    g: "mhfu-counter-g-quake",
    skills: [{ ability: "Quake Res", points: 10 }],
  },
  "hge-quake": {
    label: "HGE + Quake",
    high: "mhfu-counter-high-hge-quake",
    g: "mhfu-counter-g-hge-quake-hub",
    skills: [{ ability: "HearProtct", points: 15 }, { ability: "Quake Res", points: 10 }],
  },
  "hge-wind": {
    label: "HGE + High Wind",
    high: "mhfu-counter-high-hge-wind-hub",
    g: "mhfu-counter-g-hge-wind-hub",
    skills: [{ ability: "HearProtct", points: 15 }, { ability: "WindPress", points: 15 }],
  },
  "hge-dragon-wind": {
    label: "HGE + Dragon Wind",
    high: "mhfu-counter-high-hge-dragon-wind",
    g: "mhfu-counter-g-hge-dragon-wind",
    skills: [{ ability: "HearProtct", points: 15 }, { ability: "WindPress", points: 20 }],
  },
  "hge-poison": {
    label: "HGE + Poison",
    high: "mhfu-counter-high-hge-poison",
    g: "mhfu-counter-g-hge-poison-hub",
    skills: [{ ability: "HearProtct", points: 15 }, { ability: "Poison", points: 15 }],
  },
  poison: {
    label: "Poison Negated",
    high: "mhfu-counter-high-poison",
    g: "mhfu-counter-g-poison",
    skills: [{ ability: "Poison", points: 15 }],
  },
  sleep: {
    label: "Sleep Negated",
    high: "mhfu-counter-high-sleep",
    g: "mhfu-counter-g-sleep",
    skills: [{ ability: "Sleep", points: 15 }],
  },
  paralysis: {
    label: "Paralysis Negated",
    high: "mhfu-counter-high-paralysis",
    g: "mhfu-counter-g-paralysis",
    skills: [{ ability: "Paralysis", points: 15 }],
  },
  stun: {
    label: "Faint Negated",
    high: "mhfu-counter-high-stun",
    g: "mhfu-counter-g-stun",
    skills: [{ ability: "Faint", points: 15 }],
  },
};

const setsById = new Map(MHFU_PROGRESSIONS.map((set) => [set.id, set]));

const monsters = (counterData as unknown as { monsters: CounterMonster[] }).monsters;
export const MHFU_LARGE_MONSTERS = [...monsters].sort((a, b) => a.name.localeCompare(b.name));

export function counterEffectLabel(effect: CounterEffect): string {
  return COUNTER_EFFECTS.find((entry) => entry.id === effect)?.label ?? effect;
}

export function counterSetFor(combo: CounterCombo, rank: CounterRank): ProgressionSet {
  const definition = COUNTER_COMBOS[combo];
  const id = rank === "high" ? definition.high : definition.g;
  const set = setsById.get(id);
  if (!set) throw new Error(`missing counter set: ${id}`);
  return set;
}

export function counterCardsFor(monster: CounterMonster, rank: CounterRank): CounterCard[] {
  const counters = rank === "high"
    ? monster.countersHigh ?? monster.counters
    : monster.countersG ?? monster.counters;
  return counters.map((combo) => ({
    combo,
    label: COUNTER_COMBOS[combo].label,
    set: counterSetFor(combo, rank),
    skills: COUNTER_COMBOS[combo].skills,
  }));
}
