import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DAMAGE_PROFILES,
  MH3U_DAMAGE_PROFILE,
  MH4U_DAMAGE_PROFILE,
  MH4U_PLUS_DAMAGE_PROFILE,
  MHFU_DAMAGE_PROFILE,
} from "./damageProfiles.ts";
import {
  DEFAULT_STRENGTH_OPTIONS,
  scoreWeapon,
  sharpnessTier,
} from "./weaponStrength.ts";
import { META_PRESETS_MH3U } from "./metaPresetsMh3u.ts";
import { META_PRESETS_MH4U } from "./metaPresetsMh4u.ts";
import type { Weapon } from "./types.ts";

const MHFU_OPTIONS = {
  ...DEFAULT_STRENGTH_OPTIONS,
  profile: MHFU_DAMAGE_PROFILE,
};

const MH3U_BLADEMASTER = [
  "great-sword",
  "long-sword",
  "sword-and-shield",
  "dual-blades",
  "hammer",
  "hunting-horn",
  "lance",
  "gunlance",
  "switch-axe",
];
const MH4U_BLADEMASTER = [
  ...MH3U_BLADEMASTER,
  "charge-blade",
  "insect-glaive",
];

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

const round = (value: number) => Number(value.toFixed(4));

test("MH3U and MH4U coefficient tables", () => {
  assert.equal(MH3U_DAMAGE_PROFILE.coefficients["long-sword"], 3.3);
  assert.equal(MH3U_DAMAGE_PROFILE.coefficients["hunting-horn"], 4.6);
  assert.equal(MH3U_DAMAGE_PROFILE.coefficients["switch-axe"], 4.6);
  assert.equal(MH3U_DAMAGE_PROFILE.coefficients["great-sword"], 4.8);

  assert.equal(MH4U_DAMAGE_PROFILE.coefficients["switch-axe"], 5.4);
  assert.equal(MH4U_DAMAGE_PROFILE.coefficients["charge-blade"], 3.6);
  assert.equal(MH4U_DAMAGE_PROFILE.coefficients["insect-glaive"], 3.1);
  assert.equal(MH4U_DAMAGE_PROFILE.coefficients["hunting-horn"], 5.2);
});

test("MH3U sharpness values differ from MHFU", () => {
  const values = Object.fromEntries(
    MH3U_DAMAGE_PROFILE.sharpness.map((tier) => [tier.name, tier]),
  );
  assert.deepEqual(values.Green, { name: "Green", raw: 1.05, element: 1 });
  assert.deepEqual(values.Blue, { name: "Blue", raw: 1.2, element: 1.0625 });
  assert.deepEqual(values.White, { name: "White", raw: 1.32, element: 1.125 });
  assert.deepEqual(values.Purple, { name: "Purple", raw: 1.44, element: 1.2 });

  assert.equal(sharpnessTier(weapon(), false, MH3U_DAMAGE_PROFILE.sharpness).raw, 1.32);
  assert.equal(sharpnessTier(weapon(), true, MH3U_DAMAGE_PROFILE.sharpness).raw, 1.44);
  assert.equal(MHFU_DAMAGE_PROFILE.sharpness[6].raw, 1.5);
});

test("MH4U purple and element attack up values", () => {
  const purple = MH4U_DAMAGE_PROFILE.sharpness.find((tier) => tier.name === "Purple");
  assert.deepEqual(purple, { name: "Purple", raw: 1.45, element: 1.2 });
  assert.equal(MH4U_DAMAGE_PROFILE.elementAttackUp, 1.1);
  assert.equal(MH3U_DAMAGE_PROFILE.elementAttackUp, 1.2);
  assert.equal(MHFU_DAMAGE_PROFILE.elementAttackUp, 1.2);
});

test("sharpness affinity bonus is game specific", () => {
  assert.deepEqual(MHFU_DAMAGE_PROFILE.sharpnessAffinity, [0, 0, 0, 0, 5, 10, 10]);
  assert.deepEqual(MH3U_DAMAGE_PROFILE.sharpnessAffinity, [0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(MH4U_DAMAGE_PROFILE.sharpnessAffinity, [0, 0, 0, 0, 0, 0, 0]);

  const options = {
    ...MHFU_OPTIONS,
    sharpness: "base" as const,
    rawHitzone: 100,
    classModifiers: false,
    affinityBonus: 30,
  };
  assert.equal(
    scoreWeapon(weapon(), { ...options, profile: MHFU_DAMAGE_PROFILE }).effectiveCritChance,
    40,
  );
  assert.equal(
    scoreWeapon(weapon(), { ...options, profile: MH3U_DAMAGE_PROFILE }).effectiveCritChance,
    30,
  );
  assert.equal(
    scoreWeapon(weapon(), { ...options, profile: MH4U_DAMAGE_PROFILE }).effectiveCritChance,
    30,
  );
});

test("crit draw uses each game's model", () => {
  const options = {
    ...MHFU_OPTIONS,
    sharpness: "base" as const,
    rawHitzone: 100,
    classModifiers: false,
    critDraw: true,
  };
  const negative = weapon({ affinity: -20 });

  assert.equal(
    scoreWeapon(negative, { ...options, profile: MHFU_DAMAGE_PROFILE }).critExpected,
    1.25,
  );
  assert.equal(
    scoreWeapon(negative, { ...options, profile: MH3U_DAMAGE_PROFILE }).critExpected,
    1.25,
  );
  // MH4U adds +100% affinity instead of guaranteeing a critical hit.
  assert.equal(
    scoreWeapon(negative, { ...options, profile: MH4U_DAMAGE_PROFILE }).critExpected,
    1.2,
  );
});

test("skill values are game specific", () => {
  assert.deepEqual(MHFU_DAMAGE_PROFILE.skills, {
    attackUp: [10, 15, 20],
    critEye: [10, 20, 30],
    huntingHornAttackUp: [1.2, 1.25],
  });
  assert.deepEqual(MH3U_DAMAGE_PROFILE.skills, {
    attackUp: [10, 15, 20],
    critEye: [10, 20, 30],
    huntingHornAttackUp: [1.15, 1.2],
  });
  assert.deepEqual(MH4U_DAMAGE_PROFILE.skills, {
    attackUp: [10, 15, 20, 25],
    critEye: [10, 15, 20],
    huntingHornAttackUp: [1.15, 1.2],
  });
});

test("bow shot tables use each game's shot names", () => {
  assert.ok(MHFU_DAMAGE_PROFILE.bow.motion.Scatter);
  assert.ok(MH3U_DAMAGE_PROFILE.bow.motion.Spread);
  assert.ok(MH4U_DAMAGE_PROFILE.bow.motion.Spread);
  assert.equal(MH3U_DAMAGE_PROFILE.bow.motion.Scatter, undefined);
});

test("bow charge element multipliers are game specific", () => {
  const bow = weapon({
    type: "bow",
    attack: 240,
    elements: [["Fire", 300]],
    sharpness: [],
    sharpnessPlus: [],
    shots: [{ name: "Rapid", level: 3 }],
    coatings: ["Power"],
  });
  const options = {
    ...MHFU_OPTIONS,
    sharpness: "base" as const,
    rawHitzone: 0,
    elementHitzone: 100,
    classModifiers: false,
    bowCharge: 2,
    bowPowerCoating: false,
    bowCriticalDistance: false,
  };

  assert.equal(
    scoreWeapon(bow, { ...options, profile: MHFU_DAMAGE_PROFILE }).elementDamage,
    67.5,
  );
  assert.equal(
    scoreWeapon(bow, { ...options, profile: MH3U_DAMAGE_PROFILE }).elementDamage,
    67.5,
  );
  // MH4U charge 2 is 0.85x element rather than 0.75x.
  assert.equal(
    scoreWeapon(bow, { ...options, profile: MH4U_DAMAGE_PROFILE }).elementDamage,
    76.5,
  );
});

test("profile scoring uses the game coefficient and sharpness table", () => {
  const row = scoreWeapon(weapon({ type: "long-sword", attack: 660 }), {
    ...MHFU_OPTIONS,
    profile: MH3U_DAMAGE_PROFILE,
    sharpness: "base",
    rawHitzone: 100,
    classModifiers: false,
  });
  assert.equal(row.coefficient, 3.3);
  assert.equal(row.trueRaw, 200);
  assert.equal(row.sharpnessUsed.name, "White");
  assert.equal(row.sharpnessUsed.raw, 1.32);
  assert.equal(row.effectiveRaw, 264);
  assert.equal(row.score, 264);
});

test("MH4U SnS always-on raw modifier applies on the profile table", () => {
  const base = scoreWeapon(weapon({ type: "sword-and-shield", attack: 280 }), {
    ...MHFU_OPTIONS,
    profile: MH4U_DAMAGE_PROFILE,
    sharpness: "base",
    rawHitzone: 100,
  });
  assert.equal(base.trueRaw, 200);
  assert.equal(round(base.effectiveRaw), 279.84);

  const purple = scoreWeapon(weapon({ type: "sword-and-shield", attack: 280 }), {
    ...MHFU_OPTIONS,
    profile: MH4U_DAMAGE_PROFILE,
    sharpness: "best",
    rawHitzone: 100,
  });
  assert.equal(purple.sharpnessUsed.name, "Purple");
  assert.equal(round(purple.effectiveRaw), 307.4);
});

test("conditional DB/SA modifiers are baseline 1.0 unless explicitly enabled", () => {
  const db = weapon({ type: "dual-blades", attack: 280 });
  const dbBase = scoreWeapon(db, {
    ...MHFU_OPTIONS,
    profile: MH3U_DAMAGE_PROFILE,
    sharpness: "base",
    rawHitzone: 100,
  });
  const dbDemon = scoreWeapon(db, {
    ...MHFU_OPTIONS,
    profile: MH3U_DAMAGE_PROFILE,
    sharpness: "base",
    rawHitzone: 100,
    demonMode: true,
  });
  assert.equal(round(dbBase.effectiveRaw), 264);
  assert.equal(round(dbDemon.effectiveRaw), 303.6);

  const sa = weapon({ type: "switch-axe", attack: 1080 });
  const saBase = scoreWeapon(sa, {
    ...MHFU_OPTIONS,
    profile: MH4U_DAMAGE_PROFILE,
    sharpness: "base",
    rawHitzone: 100,
  });
  const saPower = scoreWeapon(sa, {
    ...MHFU_OPTIONS,
    profile: MH4U_DAMAGE_PROFILE,
    sharpness: "base",
    rawHitzone: 100,
    powerPhial: true,
  });
  assert.equal(round(saBase.effectiveRaw), 264);
  assert.equal(round(saPower.effectiveRaw), 316.8);
});

test("game profile registry covers all four games", () => {
  assert.equal(DAMAGE_PROFILES.mhfu, MHFU_DAMAGE_PROFILE);
  assert.equal(DAMAGE_PROFILES.mh3u, MH3U_DAMAGE_PROFILE);
  assert.equal(DAMAGE_PROFILES.mh4u, MH4U_DAMAGE_PROFILE);
  assert.equal(DAMAGE_PROFILES["mh4u+"], MH4U_PLUS_DAMAGE_PROFILE);
});

test("MH3U and MH4U meta registries cover their blademaster types", () => {
  for (const type of MH3U_BLADEMASTER) {
    assert.ok(META_PRESETS_MH3U[type], `missing MH3U preset for ${type}`);
  }
  for (const type of MH4U_BLADEMASTER) {
    assert.ok(META_PRESETS_MH4U[type], `missing MH4U preset for ${type}`);
  }
  assert.equal(META_PRESETS_MH4U["hunting-horn"].skills.attackUp, 25);
  assert.equal(META_PRESETS_MH3U["dual-blades"].skills.elementAttackUp, 1.2);
  assert.equal(META_PRESETS_MH4U["dual-blades"].skills.elementAttackUp, 1.1);
  assert.equal(META_PRESETS_MH3U["hammer"].skills.awaken, true);
  assert.equal(META_PRESETS_MH3U["dual-blades"].skills.awaken ?? false, false);
});
