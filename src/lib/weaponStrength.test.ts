import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_STRENGTH_OPTIONS,
  isEndTreeG,
  isEndTreeHr,
  isObtainableWeapon,
  scoreWeapon,
  sharpnessTier,
  trueElementValue,
  weaponElements,
  weaponMatchesElement,
} from "./weaponStrength.ts";
import { MHFU_DAMAGE_PROFILE } from "./damageProfiles.ts";
import type { Weapon } from "./types.ts";

const MHFU_OPTIONS = {
  ...DEFAULT_STRENGTH_OPTIONS,
  profile: MHFU_DAMAGE_PROFILE,
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

test("MHFU sharpness table", () => {
  assert.deepEqual(MHFU_DAMAGE_PROFILE.sharpness.map((tier) => tier.name), [
    "Red", "Orange", "Yellow", "Green", "Blue", "White", "Purple",
  ]);
  assert.equal(MHFU_DAMAGE_PROFILE.sharpness[5].raw, 1.3);
  assert.equal(MHFU_DAMAGE_PROFILE.sharpness[5].element, 1.125);
  assert.equal(MHFU_DAMAGE_PROFILE.sharpness[6].raw, 1.5);
  assert.equal(MHFU_DAMAGE_PROFILE.sharpness[6].element, 1.2);
});

test("sharpness tier uses the highest non-zero colour", () => {
  assert.equal(sharpnessTier(weapon(), false, MHFU_DAMAGE_PROFILE.sharpness).name, "White");
  assert.equal(sharpnessTier(weapon(), true, MHFU_DAMAGE_PROFILE.sharpness).name, "Purple");
});

test("raw uses class coefficient, sharpness, and expected crit", () => {
  const row = scoreWeapon(weapon(), {
    ...MHFU_OPTIONS,
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
    ...MHFU_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
  });
  const negative = scoreWeapon(weapon({ affinity: -20 }), {
    ...MHFU_OPTIONS,
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
    ...MHFU_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
  });
  const negative = scoreWeapon(weapon({ affinity: -100 }), {
    ...MHFU_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
  });
  assert.equal(positive.critExpected, 1.25);
  assert.equal(negative.critExpected, 0.75);
});

test("Crit Draw forces a crit and ignores negative affinity on draw attacks", () => {
  const row = scoreWeapon(weapon({ affinity: -15 }), {
    ...MHFU_OPTIONS,
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
    ...MHFU_OPTIONS,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
    affinityBonus: 30,
  });
  const positive = scoreWeapon(weapon({ affinity: 20 }), {
    ...MHFU_OPTIONS,
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
    ...MHFU_OPTIONS,
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
    ...MHFU_OPTIONS,
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
      ...MHFU_OPTIONS,
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
      ...MHFU_OPTIONS,
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
      ...MHFU_OPTIONS,
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
    ...MHFU_OPTIONS,
    sharpness: "base",
    rawHitzone: 0,
    elementHitzone: 100,
    classModifiers: false,
  });
  assert.equal(row.elementDamage, 0);
  assert.equal(row.status, 45);
  assert.equal(row.score, 0);
});

test("hidden element only counts when Awaken is enabled", () => {
  const hidden = weapon({
    type: "sword-and-shield",
    attack: 280,
    elements: [["Fire", 300]],
    awaken: true,
  });
  const options = {
    ...MHFU_OPTIONS,
    sharpness: "base" as const,
    rawHitzone: 0,
    elementHitzone: 100,
    classModifiers: false,
  };
  const off = scoreWeapon(hidden, options);
  const on = scoreWeapon(hidden, { ...options, awaken: true });

  assert.equal(off.hiddenElementActive, false);
  assert.equal(off.elementDamage, 0);
  assert.deepEqual(off.elementParts, []);
  assert.equal(on.hiddenElementActive, true);
  assert.equal(on.elementDamage, 33.75);
  assert.deepEqual(on.elementParts, [{ name: "Fire", displayed: 300, value: 33.75 }]);
});

test("hidden status only counts when Awaken is enabled", () => {
  const hidden = weapon({ elements: [["Slime", 400]], awaken: true });
  const options = {
    ...MHFU_OPTIONS,
    sharpness: "base" as const,
    rawHitzone: 0,
    classModifiers: false,
  };
  assert.equal(scoreWeapon(hidden, options).status, 0);
  assert.equal(scoreWeapon(hidden, { ...options, awaken: true }).status, 45);
});

test("sharpness plus falls back to base when missing", () => {
  const row = scoreWeapon(weapon({ sharpnessPlus: [] }), {
    ...MHFU_OPTIONS,
    sharpness: "plus",
    rawHitzone: 100,
    classModifiers: false,
  });
  assert.equal(row.sharpnessUsed.name, "White");
  assert.equal(row.score, 260);
});

test("non-numeric coating markers do not produce NaN", () => {
  const row = scoreWeapon(weapon({ type: "bow", elements: [["Paralysis", "Add" as unknown as number]] }), {
    ...MHFU_OPTIONS,
    sharpness: "base",
    rawHitzone: 0,
  });
  assert.equal(Number.isFinite(row.score), true);
  assert.equal(row.elementDamage, 0);
  assert.equal(row.status, 0);
});

test("true element divides displayed values and preserves markers", () => {
  assert.equal(trueElementValue(220), 22);
  assert.equal(trueElementValue(10), 1);
  assert.equal(trueElementValue("Add"), "Add");
});

test("element filter normalises names and separates raw, element, and status", () => {
  const fire = weapon({ elements: [["fire", 220]] });
  const mixed = weapon({ elements: [["Thunder", 300], ["Poison", 200]] });
  const raw = weapon({ elements: [] });

  assert.deepEqual(weaponElements(fire), ["Fire"]);
  assert.deepEqual(weaponElements(mixed), ["Thunder", "Poison"]);

  assert.equal(weaponMatchesElement(fire, "all"), true);
  assert.equal(weaponMatchesElement(fire, "Fire"), true);
  assert.equal(weaponMatchesElement(fire, "fire"), true);
  assert.equal(weaponMatchesElement(fire, "Ice"), false);
  assert.equal(weaponMatchesElement(mixed, "Poison"), true);
  assert.equal(weaponMatchesElement(mixed, "Thunder"), true);
  assert.equal(weaponMatchesElement(raw, "none"), true);
  assert.equal(weaponMatchesElement(fire, "none"), false);
  assert.equal(weaponMatchesElement(raw, "Fire"), false);
});

test("end-tree G filter excludes upgrades and other ranks", () => {
  assert.equal(isEndTreeG(weapon()), true);
  assert.equal(isEndTreeG(weapon({ improveTo: ["Next"] })), false);
  assert.equal(isEndTreeG(weapon({ rank: "hr" })), false);
});

test("end-tree HR filter keeps HR caps and excludes HR upgrade steps", () => {
  const hrCap = weapon({ name: "HR Cap", rank: "hr" });
  const hrMid = weapon({ name: "HR Mid", rank: "hr", improveTo: ["HR Cap"] });
  const gNext = weapon({ name: "G Next" });
  const byName = new Map([
    [hrCap.name, hrCap],
    [hrMid.name, hrMid],
    [gNext.name, gNext],
  ]);

  assert.equal(isEndTreeHr(hrCap, byName), true);
  assert.equal(isEndTreeHr(hrMid, byName), false);
  assert.equal(isEndTreeHr(weapon({ rank: "hr", improveTo: ["G Next"] }), byName), true);
  assert.equal(isEndTreeHr(weapon({ rank: "gr" }), byName), false);
});

test("placeholder and no-path weapons are hidden, but tree-linked material-less weapons are not", () => {
  assert.equal(isObtainableWeapon(weapon({ name: "dummy (Test Blade)" })), false);
  assert.equal(isObtainableWeapon(weapon({ name: "Dummy/Hammer 2" })), false);
  assert.equal(isObtainableWeapon(weapon({ name: "Buster Sword", createCost: 500 })), true);
  assert.equal(
    isObtainableWeapon(
      weapon({
        name: "Dancing Mad",
        createCost: 0,
        improveCost: 0,
        createMats: [],
        improveMats: [],
        improveFrom: [],
        improveTo: [],
      }),
    ),
    false,
  );
  assert.equal(
    isObtainableWeapon(
      weapon({
        name: "Worn Blades",
        createCost: 0,
        improveCost: 0,
        createMats: [],
        improveMats: [],
        improveFrom: [],
        improveTo: ["Weathered Blades"],
      }),
    ),
    true,
  );
});
