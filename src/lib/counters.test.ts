import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildSet } from "./build.ts";
import {
  COUNTER_COMBOS,
  COUNTER_EFFECTS,
  MHFU_LARGE_MONSTERS,
  counterCardsFor,
  counterSetFor,
  type CounterCombo,
} from "./counters.ts";
import { MHFU_PROGRESSIONS, selectionFromProgression } from "./progressions.ts";
import { activeTier } from "./tiers.ts";
import type { GameData } from "./games.ts";
import type { Armor, Deco, SkillTree } from "./types.ts";

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;

const armor = readJson<Armor[]>("../data/armor.json");
const decos = readJson<Deco[]>("../data/decorations.json");
const skills = readJson<SkillTree[]>("../data/skills.json");
const monsters = readJson<{ name: string; type: string }[]>("../data/monsters.json");
const skillTree = new Map(skills.map((skill) => [skill.ability, skill]));

const data = {
  parts: ["head", "body", "arms", "waist", "legs"],
  torsoSkill: "Torso Inc",
  armor,
  decos,
  skills,
  armorById: new Map(armor.map((piece) => [piece.id, piece])),
  decoById: new Map(decos.map((deco) => [deco.id, deco])),
  skillTree,
  activeTier: (ability: string, points: number) =>
    activeTier(skillTree.get(ability), points),
} as unknown as GameData;

const REQUIRED: Record<CounterCombo, string[]> = {
  hge: ["HearProtct"],
  earplug: ["HearProtct"],
  wind: ["WindPress"],
  "dragon-wind": ["WindPress"],
  quake: ["Quake Res"],
  "hge-quake": ["HearProtct", "Quake Res"],
  "hge-wind": ["HearProtct", "WindPress"],
  "hge-dragon-wind": ["HearProtct", "WindPress"],
  "hge-poison": ["HearProtct", "Poison"],
  poison: ["Poison"],
  sleep: ["Sleep"],
  paralysis: ["Paralysis"],
  stun: ["Faint"],
};

const SMALL_MONSTERS = new Set([
  "Felyne", "Melynx", "Shakalaka", "Vespoid", "Hornetaur", "Great Thunderbug",
  "Anteka", "Popo", "Kelbi", "Mosswine", "Aptonoth", "Apceros",
  "Giaprey", "Velociprey", "Genprey", "Ioprey", "Remobra",
  "Hermitaur", "Ceanataur", "Bullfango", "Conga", "Blango",
]);

test("counter data only contains known large monsters", () => {
  const known = new Set(monsters.map((monster) => monster.name));
  const seen = new Set<string>();
  for (const monster of MHFU_LARGE_MONSTERS) {
    assert.ok(known.has(monster.name), `unknown counter monster: ${monster.name}`);
    assert.ok(!SMALL_MONSTERS.has(monster.name), `small monster in counter data: ${monster.name}`);
    assert.ok(!seen.has(monster.name), `duplicate counter monster: ${monster.name}`);
    seen.add(monster.name);
  }
  const expected = monsters
    .filter((monster) => !SMALL_MONSTERS.has(monster.name))
    .map((monster) => monster.name)
    .sort();
  assert.deepEqual(
    MHFU_LARGE_MONSTERS.map((monster) => monster.name).sort(),
    expected,
    "counter data should cover every large monster",
  );
  for (const effect of COUNTER_EFFECTS) {
    assert.ok(
      MHFU_LARGE_MONSTERS.some((monster) => monster.effects.includes(effect.id)),
      `effect ${effect.id} has no monster`,
    );
  }
});

test("every monster counter resolves to a legal set with the counter skill", () => {
  const ids = new Set(MHFU_PROGRESSIONS.map((set) => set.id));

  for (const definition of Object.values(COUNTER_COMBOS)) {
    assert.ok(ids.has(definition.high), `missing high counter set ${definition.high}`);
    assert.ok(ids.has(definition.g), `missing G counter set ${definition.g}`);
  }

  for (const monster of MHFU_LARGE_MONSTERS) {
    for (const rank of ["high", "g"] as const) {
      for (const card of counterCardsFor(monster, rank)) {
        const required = REQUIRED[card.combo];
        assert.ok(card.skills.length > 0, `${monster.name}/${rank}/${card.combo} needs Solver skills`);
        for (const skill of card.skills) {
          assert.ok(data.skillTree.has(skill.ability), `unknown Solver skill: ${skill.ability}`);
          assert.ok(skill.points > 0, `non-positive Solver target: ${skill.ability}`);
        }
        assert.ok(
          card.set.unlockHr > 0,
          `${monster.name}/${rank}/${card.combo} must be buildable through hub HR`,
        );
        const built = buildSet(data, selectionFromProgression(card.set));
        assert.ok(built.valid, `${monster.name}/${rank}/${card.combo} is invalid: ${built.slotError}`);
        assert.equal(built.armor.length, 5, `${monster.name}/${rank}/${card.combo} needs five pieces`);
        const active = new Map(built.active.map((skill) => [skill.ability, skill.points]));
        for (const ability of required) {
          assert.ok(active.has(ability), `${monster.name}/${rank}/${card.combo} misses ${ability}`);
        }
        assert.ok(
          built.active.every((skill) => skill.points > 0),
          `${monster.name}/${rank}/${card.combo} activates a negative skill`,
        );
      }
    }
  }
});

test("the direct counter lookup is rank-specific", () => {
  assert.equal(counterSetFor("hge", "high").id, "mhfu-high-blade-comfort");
  assert.equal(counterSetFor("hge", "g").id, "mhfu-counter-g-hge");
  assert.notEqual(counterSetFor("wind", "high").id, counterSetFor("wind", "g").id);
});
