import assert from "node:assert/strict";
import { test } from "node:test";
import mh3uArmor from "../data/mh3u/armor.json" with { type: "json" };
import mh3uWeapons from "../data/mh3u/weapons.json" with { type: "json" };
import mh4uArmor from "../data/mh4u/armor.json" with { type: "json" };
import mh4uWeapons from "../data/mh4u/weapons.json" with { type: "json" };
import type { Armor, Weapon } from "./types.ts";
import { trueElementValue } from "./weaponStrength.ts";

const armorRank = (rarity: number): Armor["rank"] =>
  rarity <= 3 ? "low-rank" : rarity <= 7 ? "high-rank" : "g-rank";
const weaponRank = (rarity: number): Weapon["rank"] =>
  rarity <= 3 ? "lr" : rarity <= 7 ? "hr" : "gr";

const mh3uArmorData = mh3uArmor as unknown as Armor[];
const mh3uWeaponData = mh3uWeapons as unknown as Weapon[];
const mh4uArmorData = mh4uArmor as unknown as Armor[];
const mh4uWeaponData = mh4uWeapons as unknown as Weapon[];

test("MH3U armor and weapon ranks follow rarity bands", () => {
  for (const armor of mh3uArmorData) {
    assert.equal(armor.rank, armorRank(armor.rarity), armor.name);
  }
  for (const weapon of mh3uWeaponData) {
    assert.equal(weapon.rank, weaponRank(weapon.rarity), weapon.name);
  }
});

test("MH4U armor and weapon ranks follow rarity bands", () => {
  for (const armor of mh4uArmorData) {
    assert.equal(armor.rank, armorRank(armor.rarity), armor.name);
  }
  for (const weapon of mh4uWeaponData) {
    assert.equal(weapon.rank, weaponRank(weapon.rarity), weapon.name);
  }
});

test("rarity 7 high-rank caps stay high rank in MH3U and MH4U", () => {
  const alatreon = mh3uWeaponData.find(
    (weapon) => weapon.name === "Alatreon Great Sword",
  );
  assert.equal(alatreon?.rank, "hr");

  const selene = mh4uWeaponData.find(
    (weapon) => weapon.name === "Selene Moonbroken",
  );
  const selenePlus = mh4uWeaponData.find(
    (weapon) => weapon.name === "Selene Moonbroken+",
  );
  assert.equal(selene?.rank, "hr");
  assert.equal(selenePlus?.rank, "gr");
});

test("MH3U and MH4U weapon elements store displayed values", () => {
  const alatreon = mh3uWeaponData.find(
    (weapon) => weapon.name === "Alatreon Great Sword",
  );
  const selene = mh4uWeaponData.find(
    (weapon) => weapon.name === "Selene Moonbroken",
  );
  assert.equal(trueElementValue(alatreon?.elements[0]?.[1] ?? 0), 30);
  assert.equal(trueElementValue(selene?.elements[0]?.[1] ?? 0), 24);
});
