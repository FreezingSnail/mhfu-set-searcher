import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bestPartFor,
  elementHitzone,
  rawHitzone,
  scoreWeaponAgainstMonster,
  type Monster,
} from "./monsterHitzones.ts";
import type { Weapon } from "./types.ts";

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

test("best part follows the weapon damage type", () => {
  assert.equal(bestPartFor(monster, "slash").part, "head");
  assert.equal(bestPartFor(monster, "strike").part, "head");
  assert.equal(bestPartFor(monster, "shooting").part, "head");
  assert.equal(bestPartFor(monster, "slash", true).part, "head-enraged");
  assert.equal(rawHitzone(monster.parts[0], "slash"), 75);
  assert.equal(elementHitzone(monster.parts[0], "Thunder"), 30);
});

test("monster scoring uses raw and element hitzones from the target part", () => {
  const row = scoreWeaponAgainstMonster(
    weapon({ elements: [["Thunder", 300]] }),
    monster,
    monster.parts.find((part) => part.part === "body"),
    { sharpness: "base", rawHitzone: 100, elementHitzone: 100, classModifiers: false },
  );
  assert.equal(row.damageType, "slash");
  assert.equal(row.monsterPart.part, "body");
  assert.equal(row.rawDamage, 260 * 0.25);
  assert.equal(row.elementDamage, 30 * 1.125 * 0.2);
});

test("auto target picks the best raw part for the weapon", () => {
  const row = scoreWeaponAgainstMonster(weapon(), monster, undefined);
  assert.equal(row.monsterPart.part, "head");
  assert.equal(row.score, 200 * 1.5 * 0.75);
});
