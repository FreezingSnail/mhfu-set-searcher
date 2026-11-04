import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bestPartFor,
  eligibleParts,
  elementHitzone,
  partState,
  rawHitzone,
  scoreWeaponAgainstMonster,
  scoreWeaponAgainstMonsterAuto,
  type Monster,
  type MonsterPart,
  type PartState,
} from "./monsterHitzones.ts";
import {
  MH3U_DAMAGE_PROFILE,
  MH4U_DAMAGE_PROFILE,
  MHFU_DAMAGE_PROFILE,
} from "./damageProfiles.ts";
import { DEFAULT_STRENGTH_OPTIONS } from "./weaponStrength.ts";
import mh3uMonstersJson from "../data/monsters-mh3u.json" with { type: "json" };
import mh4uMonstersJson from "../data/monsters-mh4u.json" with { type: "json" };
import type { Weapon } from "./types.ts";

const MHFU_OPTIONS = {
  ...DEFAULT_STRENGTH_OPTIONS,
  profile: MHFU_DAMAGE_PROFILE,
};

const monster: Monster = {
  name: "Test Monster",
  type: "Flying Wyvern",
  parts: [
    { part: "head", slash: 75, strike: 65, shooting: 40, fire: 0, water: 15, thunder: 30, ice: 5, dragon: 20 },
    { part: "head-enraged", slash: 80, strike: 70, shooting: 45, fire: 0, water: 15, thunder: 35, ice: 5, dragon: 20 },
    { part: "body", slash: 25, strike: 30, shooting: 20, fire: 10, water: 10, thunder: 20, ice: 10, dragon: 10 },
  ],
};

const weapon = (over: Partial<Weapon> = {}): Weapon => ({
  id: "test",
  name: "Test Blade",
  type: "great-sword",
  order: 0,
  rank: "gr",
  attack: 960,
  affinity: 0,
  slots: 0,
  rarity: 9,
  elements: [],
  bonus: null,
  sharpness: [0, 0, 0, 0, 0, 5],
  sharpnessPlus: [0, 0, 0, 0, 0, 5, 2],
  createCost: 0,
  improveCost: 0,
  improveFrom: [],
  improveTo: [],
  createMats: [],
  improveMats: [],
  ...over,
});

const monsterPart = (part: string): MonsterPart => ({
  part,
  slash: 50,
  strike: 50,
  shooting: 50,
  fire: 10,
  water: 10,
  thunder: 10,
  ice: 10,
  dragon: 10,
});

const round = (value: number) => Number(value.toFixed(4));

test("best part follows the weapon damage type", () => {
  assert.equal(bestPartFor(monster, "slash").part, "head");
  assert.equal(bestPartFor(monster, "strike").part, "head");
  assert.equal(bestPartFor(monster, "shooting").part, "head");
  assert.equal(bestPartFor(monster, "slash", true).part, "head-enraged");
  assert.equal(rawHitzone(monster.parts[0], "slash"), 75);
  assert.equal(elementHitzone(monster.parts[0], "Thunder"), 30);
});

test("element hitzones accept mixed-case element names", () => {
  assert.equal(elementHitzone(monster.parts[0], "thunder"), 30);
  assert.equal(elementHitzone(monster.parts[0], "fire"), 0);

  const row = scoreWeaponAgainstMonster(
    weapon({ elements: [["fire", 300]] }),
    monster,
    monster.parts.find((part) => part.part === "body"),
    { ...MHFU_OPTIONS, sharpness: "base", rawHitzone: 0, classModifiers: false },
  );
  assert.equal(row.elementDamage, 30 * 1.125 * 0.1);
});

test("monster scoring uses raw and element hitzones from the target part", () => {
  const row = scoreWeaponAgainstMonster(
    weapon({ elements: [["Thunder", 300]] }),
    monster,
    monster.parts.find((part) => part.part === "body"),
    { ...MHFU_OPTIONS, sharpness: "base", rawHitzone: 100, elementHitzone: 100, classModifiers: false },
  );
  assert.equal(row.damageType, "slash");
  assert.equal(row.monsterPart.part, "body");
  assert.equal(row.rawDamage, 260 * 0.25);
  assert.equal(row.elementDamage, 30 * 1.125 * 0.2);
});

test("auto target picks the best raw part for the weapon", () => {
  const row = scoreWeaponAgainstMonster(weapon(), monster, undefined, MHFU_OPTIONS);
  assert.equal(row.monsterPart.part, "head");
  assert.equal(row.score, 200 * 1.5 * 0.75);
});

test("practical state excludes late and conditional parts", () => {
  const withLate: Monster = {
    ...monster,
    parts: [
      ...monster.parts,
      { part: "stomach-post-break", slash: 90, strike: 90, shooting: 90, fire: 0, water: 90, thunder: 0, ice: 0, dragon: 0 },
      { part: "head-guard", slash: 95, strike: 95, shooting: 95, fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 },
    ],
  };
  assert.equal(eligibleParts(withLate, "practical").some((part) => part.part === "stomach-post-break"), false);
  assert.equal(eligibleParts(withLate, "practical").some((part) => part.part === "head-guard"), false);
  assert.equal(eligibleParts(withLate, "all").some((part) => part.part === "stomach-post-break"), true);
  const row = scoreWeaponAgainstMonsterAuto(weapon(), withLate, "practical", MHFU_OPTIONS);
  assert.equal(row.monsterPart.part, "head");
});

test("auto part scoring considers elemental hitzones", () => {
  const elemental: Monster = {
    ...monster,
    parts: [
      { part: "raw-part", slash: 30, strike: 30, shooting: 30, fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 },
      { part: "water-part", slash: 20, strike: 20, shooting: 20, fire: 0, water: 100, thunder: 0, ice: 0, dragon: 0 },
    ],
  };
  const row = scoreWeaponAgainstMonsterAuto(
    weapon({ elements: [["Water", 300]] }),
    elemental,
    "practical",
    { ...MHFU_OPTIONS, sharpness: "base", rawHitzone: 100, elementHitzone: 100, classModifiers: false },
  );
  assert.equal(row.monsterPart.part, "water-part");
});

test("part state normalization covers MHFU, MH3U, and MH4U suffixes", () => {
  const cases: [string, PartState][] = [
    ["head", "normal"],
    ["stomach-pre-break", "pre-break"],
    ["head-post-break", "late"],
    ["shell-brokenshell", "late"],
    ["stomach-brokenstomach", "late"],
    ["head-g-rank", "late"],
    ["head-enraged", "enraged"],
    ["head-charged", "enraged"],
    ["head-weakness-enraged", "enraged"],
    ["head-guard", "conditional"],
    ["body-guardy", "conditional"],
    ["head-harden", "conditional"],
    ["head-fished", "conditional"],
    ["head-ice-mode", "conditional"],
    ["head-fatigued", "conditional"],
    ["head-virused", "conditional"],
    ["head-windwrap", "conditional"],
    ["head-flamewrap", "conditional"],
    ["tail-inflated", "conditional"],
    ["tail-tail-inflated", "conditional"],
    ["head-ice-shield", "conditional"],
    ["head-hidden", "conditional"],
    ["head-savaged", "conditional"],
    ["head-weakness", "conditional"],
    ["while-rotating", "conditional"],
    ["claw-post-break-guard", "late"],
    ["claw-pre-break-guard", "conditional"],
  ];
  for (const [part, expected] of cases) {
    assert.equal(partState(part), expected, part);
  }
});

test("state eligibility keeps practical normal/pre-break and enraged separate", () => {
  const stateMonster: Monster = {
    name: "State Test",
    type: "Flying Wyvern",
    parts: [
      monsterPart("head"),
      monsterPart("stomach-pre-break"),
      monsterPart("head-enraged"),
      monsterPart("tail-charged"),
      monsterPart("head-post-break"),
      monsterPart("head-g-rank"),
      monsterPart("head-harden"),
      monsterPart("head-fished"),
      monsterPart("head-windwrap"),
      monsterPart("tail-inflated"),
      monsterPart("head-ice-shield"),
      monsterPart("head-hidden"),
      monsterPart("head-savaged"),
    ],
  };
  const names = (state: "practical" | "enraged" | "all") =>
    eligibleParts(stateMonster, state).map((part) => part.part);

  assert.deepEqual(names("practical"), ["head", "stomach-pre-break"]);
  assert.deepEqual(names("enraged"), [
    "head",
    "stomach-pre-break",
    "head-enraged",
    "tail-charged",
  ]);
  assert.equal(names("all").length, stateMonster.parts.length);
});

test("practical state falls back to all parts when no normal row exists", () => {
  const savageOnly: Monster = {
    name: "Savage Only",
    type: "Brute Wyvern",
    parts: [monsterPart("head-enraged"), monsterPart("head-savaged")],
  };
  assert.deepEqual(
    eligibleParts(savageOnly, "practical").map((part) => part.part),
    ["head-enraged", "head-savaged"],
  );
});

test("empty monster data scores without crashing", () => {
  const fatalis: Monster = { name: "Crimson Fatalis", type: "Elder Dragon", parts: [] };
  assert.deepEqual(eligibleParts(fatalis, "practical"), []);
  assert.equal(bestPartFor(fatalis, "slash").part, "none");

  const row = scoreWeaponAgainstMonsterAuto(weapon(), fatalis, "practical", {
    profile: MH4U_DAMAGE_PROFILE,
    sharpness: "base",
  });
  assert.equal(row.monsterPart.part, "none");
  assert.equal(row.rawDamage, 0);
  assert.equal(row.elementDamage, 0);
  assert.equal(row.score, 0);
});

test("MH3U profile scores a real Abyssal Lagiacrus head hitzone", () => {
  const monster = (mh3uMonstersJson as unknown as Monster[]).find(
    (entry) => entry.name === "Abyssal Lagiacrus",
  );
  const head = monster?.parts.find((part) => part.part === "head");
  assert.ok(monster && head);

  const row = scoreWeaponAgainstMonster(
    weapon({ type: "great-sword", attack: 960, elements: [["Dragon", 350]] }),
    monster,
    head,
    {
      profile: MH3U_DAMAGE_PROFILE,
      sharpness: "base",
      classModifiers: false,
    },
  );
  assert.equal(row.coefficient, 4.8);
  assert.equal(row.trueRaw, 200);
  assert.equal(row.sharpnessUsed.name, "White");
  assert.equal(row.rawDamage, 39.6);
  assert.equal(row.elementDamage, 13.78125);
  assert.equal(row.score, 53.38125);
});

test("MH4U profile scores a real Kushala Daora head hitzone", () => {
  const monster = (mh4uMonstersJson as unknown as Monster[]).find(
    (entry) => entry.name === "Kushala Daora",
  );
  const head = monster?.parts.find((part) => part.part === "head");
  assert.ok(monster && head);

  const row = scoreWeaponAgainstMonster(
    weapon({ type: "switch-axe", attack: 1080, elements: [["Dragon", 350]] }),
    monster,
    head,
    {
      profile: MH4U_DAMAGE_PROFILE,
      sharpness: "base",
      powerPhial: true,
    },
  );
  assert.equal(row.coefficient, 5.4);
  assert.equal(row.trueRaw, 200);
  assert.equal(row.rawDamage, 158.4);
  assert.equal(row.elementDamage, 13.78125);
  assert.equal(round(row.score), 172.1813);
});
