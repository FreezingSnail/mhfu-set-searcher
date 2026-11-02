import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_STRENGTH_OPTIONS,
  SHARPNESS,
  isEndTreeG,
  scoreWeapon,
  sharpnessTier,
} from "./weaponStrength.ts";
import type { Weapon } from "./types.ts";

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

test("MHFU sharpness table", () => {
  assert.deepEqual(SHARPNESS.map((tier) => tier.name), [
    "Red", "Orange", "Yellow", "Green", "Blue", "White", "Purple",
  ]);
  assert.equal(SHARPNESS[5].raw, 1.3);
  assert.equal(SHARPNESS[5].element, 1.125);
  assert.equal(SHARPNESS[6].raw, 1.5);
  assert.equal(SHARPNESS[6].element, 1.2);
});

test("sharpness tier uses the highest non-zero colour", () => {
  assert.equal(sharpnessTier(weapon()).name, "White");
  assert.equal(sharpnessTier(weapon(), true).name, "Purple");
});

test("raw uses class coefficient, sharpness, and expected crit", () => {
  const row = scoreWeapon(weapon(), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
  });
  assert.equal(row.trueRaw, 200);
  assert.equal(row.critChance, 0);
  assert.equal(row.critExpected, 1);
  assert.equal(row.effectiveRaw, 260);
  assert.equal(row.score, 260);
});

test("affinity crit chance is included as expected raw", () => {
  const positive = scoreWeapon(weapon({ affinity: 20 }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
  });
  const negative = scoreWeapon(weapon({ affinity: -20 }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
  });
  assert.equal(positive.critChance, 20);
  assert.equal(positive.critExpected, 1.05);
  assert.equal(negative.critChance, -20);
  assert.equal(negative.critExpected, 0.95);
});

test("100% and -100% affinity use full crit and bad-crit multipliers", () => {
  const positive = scoreWeapon(weapon({ affinity: 100 }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
  });
  const negative = scoreWeapon(weapon({ affinity: -100 }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
  });
  assert.equal(positive.critExpected, 1.25);
  assert.equal(negative.critExpected, 0.75);
});

test("Crit Draw forces a crit and ignores negative affinity on draw attacks", () => {
  const row = scoreWeapon(weapon({ affinity: -15 }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
    critDraw: true,
  });
  assert.equal(row.critChance, -15);
  assert.equal(row.critExpected, 1.25);
  assert.equal(row.score, 260 * 1.25);
});

test("Crit Eye adds affinity before the expected crit calculation", () => {
  const negative = scoreWeapon(weapon({ affinity: -20 }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
    affinityBonus: 30,
  });
  const positive = scoreWeapon(weapon({ affinity: 20 }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
    affinityBonus: 30,
  });
  assert.equal(negative.effectiveCritChance, 20);
  assert.equal(negative.critExpected, 1.05);
  assert.equal(positive.effectiveCritChance, 50);
  assert.equal(positive.critExpected, 1.125);
});

test("Hunting Horn Attack Up song multiplies raw", () => {
  const row = scoreWeapon(weapon({ type: "hunting-horn", attack: 1040 }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
    songAttackUp: 1.2,
  });
  assert.equal(row.trueRaw, 200);
  assert.equal(row.effectiveRaw, 312);
  assert.equal(row.score, 312);
});

test("Attack Up adds flat true raw before sharpness and crit", () => {
  const row = scoreWeapon(weapon(), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
    attackUp: 20,
  });
  assert.equal(row.trueRaw, 200);
  assert.equal(row.effectiveRaw, 286);
  assert.equal(row.score, 286);
});

test("bow element uses charge, shot hit count, and elemental hitzone", () => {
  const row = scoreWeapon(
    weapon({
      type: "bow",
      attack: 240,
      elements: [["Fire", 300]],
      sharpness: [],
      sharpnessPlus: [],
      shots: [{ name: "Rapid", level: 3 }],
      coatings: ["Power"],
    }),
    {
      ...DEFAULT_STRENGTH_OPTIONS,
      sharpness: "base",
      rawHitzone: 100,
      elementHitzone: 100,
      classModifiers: false,
      bowCharge: 3,
      bowPowerCoating: true,
      bowCriticalDistance: true,
    },
  );
  assert.equal(row.trueRaw, 200);
  assert.equal(row.bow?.shotName, "Rapid");
  assert.equal(row.bow?.elementHits, 3);
  assert.equal(row.rawDamage, 128.25);
  assert.equal(row.elementDamage, 90);
  assert.equal(row.score, 218.25);
});

test("bow element ignores Power Coating and critical distance", () => {
  const row = scoreWeapon(
    weapon({
      type: "bow",
      attack: 240,
      elements: [["Fire", 300]],
      sharpness: [],
      sharpnessPlus: [],
      shots: [{ name: "Rapid", level: 3 }],
      coatings: ["Power"],
    }),
    {
      ...DEFAULT_STRENGTH_OPTIONS,
      sharpness: "base",
      rawHitzone: 100,
      elementHitzone: 100,
      classModifiers: false,
      bowCharge: 3,
      bowPowerCoating: false,
      bowCriticalDistance: false,
    },
  );
  assert.equal(row.rawDamage, 57);
  assert.equal(row.elementDamage, 90);
});

test("element uses displayed / 10 and sharpness element modifier", () => {
  const row = scoreWeapon(
    weapon({ type: "sword-and-shield", attack: 280, elements: [["Fire", 300]] }),
    {
      ...DEFAULT_STRENGTH_OPTIONS,
      sharpness: "base",
      rawHitzone: 0,
      elementHitzone: 100,
      classModifiers: false,
    },
  );
  assert.equal(row.trueRaw, 200);
  assert.equal(row.elementDamage, 33.75);
  assert.equal(row.score, 33.75);
});

test("status is separate from damage", () => {
  const row = scoreWeapon(weapon({ elements: [["Poison", 400]] }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 0,
    elementHitzone: 100,
    classModifiers: false,
  });
  assert.equal(row.elementDamage, 0);
  assert.equal(row.status, 45);
  assert.equal(row.score, 0);
});

test("sharpness plus falls back to base when missing", () => {
  const row = scoreWeapon(weapon({ sharpnessPlus: [] }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "plus",
    rawHitzone: 100,
    classModifiers: false,
  });
  assert.equal(row.sharpnessUsed.name, "White");
  assert.equal(row.score, 260);
});

test("non-numeric coating markers do not produce NaN", () => {
  const row = scoreWeapon(weapon({ type: "bow", elements: [["Paralysis", "Add" as unknown as number]] }), {
    ...DEFAULT_STRENGTH_OPTIONS,
    sharpness: "base",
    rawHitzone: 0,
  });
  assert.equal(Number.isFinite(row.score), true);
  assert.equal(row.elementDamage, 0);
  assert.equal(row.status, 0);
});

test("end-tree G filter excludes upgrades and other ranks", () => {
  assert.equal(isEndTreeG(weapon()), true);
  assert.equal(isEndTreeG(weapon({ improveTo: ["Next"] })), false);
  assert.equal(isEndTreeG(weapon({ rank: "hr" })), false);
});
