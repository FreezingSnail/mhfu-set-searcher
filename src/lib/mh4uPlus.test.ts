import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Deco, SkillTree } from "./types.ts";

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;

const decos = readJson<Deco[]>("../data/mh4u-plus/decorations.json");
const baseDecos = readJson<Deco[]>("../data/mh4u/decorations.json");
const skills = readJson<SkillTree[]>("../data/mh4u/skills.json");
const meta = readJson<{ armor: number; decorations: number; weapons: number; skills: number }>(
  "../data/mh4u-plus/meta.json",
);
const skillTree = new Set(skills.map((skill) => skill.ability));
const byName = new Map(decos.map((deco) => [deco.name, deco]));

test("MH4U+ replaces the MH4U jewel set", () => {
  assert.equal(decos.length, 289);
  assert.equal(meta.decorations, 289);
  assert.notDeepEqual(
    decos.map((deco) => [deco.name, deco.slots, deco.skills]),
    baseDecos.map((deco) => [deco.name, deco.slots, deco.skills]),
  );
});

test("MH4U+ jewel values and relic jewels come from the update CSV", () => {
  assert.deepEqual(byName.get("Attack Jewel 1")?.skills, [
    ["Attack", 2],
    ["Defense", -2],
  ]);
  assert.deepEqual(byName.get("Handicraft Jwl 2")?.skills, [
    ["Handicraft", 2],
    ["Sharpness", -1],
  ]);
  assert.deepEqual(byName.get("Honed Jwl 1")?.skills, [["Edgemaster", 2]]);
  assert.deepEqual(byName.get("True Honed Jwl 3")?.skills, [["Edgemaster", 7]]);
});

test("every MH4U+ jewel skill exists in the MH4U skill tree", () => {
  for (const deco of decos) {
    for (const [ability] of deco.skills) {
      assert.ok(skillTree.has(ability), `${deco.name} references ${ability}`);
    }
  }
});
