import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { GameData } from "./games.ts";
import { solve } from "./solver.ts";
import { activeTier } from "./tiers.ts";
import type { Armor, Deco, SkillTree } from "./types.ts";

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;

const armor = readJson<Armor[]>("../data/mh4u/armor.json");
const decos = readJson<Deco[]>("../data/mh4u/decorations.json");
const skills = readJson<SkillTree[]>("../data/mh4u/skills.json");
const skillTree = new Map(skills.map((s) => [s.ability, s]));

const data = {
  availability: "or",
  torsoSkill: "Torso Up",
  charmMax: {},
  armor,
  decos,
  skillTree,
  activeTier: (ability: string, points: number) =>
    activeTier(skillTree.get(ability), points),
} as unknown as GameData;

const base = {
  skills: [{ ability: "Handicraft", points: 10 }],
  gender: "male" as const,
  hunter: "blade" as const,
  weaponSlots: 0,
  sort: "defense" as const,
  hr: 12,
  elder: 10,
  allowBad: false,
  allowPiercings: false,
  charmMode: "none" as const,
};

test("high and below keeps high-only and mixed sets", () => {
  const high = solve(data, { ...base, rank: "high", maxResults: 100, timeLimitMs: 1000 });
  assert.ok(high.results.length > 0);
  assert.ok(high.results.every((r) => r.armor.every((a) => a.rank === "high-rank")));

  const below = solve(data, { ...base, rank: "high-below", maxResults: 100, timeLimitMs: 2000 });
  assert.ok(
    below.results.some((r) => r.armor.every((a) => a.rank === "high-rank")),
    "expected at least one all-high-rank set",
  );
  assert.ok(
    below.results.some(
      (r) =>
        r.armor.some((a) => a.rank === "high-rank") &&
        r.armor.some((a) => a.rank === "low-rank"),
    ),
    "expected at least one mixed high/low set",
  );
});

test("high and below keeps high-only sets alongside mixed sets", () => {
  const below = solve(data, {
    ...base,
    skills: [
      { ability: "Handicraft", points: 10 },
      { ability: "Evasion", points: 10 },
    ],
    rank: "high-below",
    maxResults: 100,
    timeLimitMs: 1500,
  });
  assert.ok(
    below.results.some((r) => r.armor.every((a) => a.rank === "high-rank")),
    "expected at least one all-high-rank set",
  );
  assert.ok(
    below.results.some(
      (r) =>
        r.armor.some((a) => a.rank === "high-rank") &&
        r.armor.some((a) => a.rank === "low-rank"),
    ),
    "expected at least one mixed high/low set",
  );
});
