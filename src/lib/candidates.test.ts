import assert from "node:assert/strict";
import { test } from "node:test";
import { armorAllowed, extraSkillCandidates } from "./candidates.ts";
import type { GameData } from "./games.ts";
import type { Armor, Deco, SkillTree, SolverInput } from "./types.ts";

const armor = (over: Partial<Armor>): Armor => ({
  id: "head:test",
  name: "Test Head",
  part: "head",
  rank: "high-rank",
  rarity: 5,
  defense: 10,
  res: { fire: 0, thunder: 0, dragon: 0, water: 0, ice: 0 },
  sex: "both",
  hunter: "both",
  hr: 5,
  elder: 0,
  slots: 0,
  skills: [],
  mats: [],
  cost: 0,
  ...over,
});

const skills: SkillTree[] = [
  { ability: "Loading", tags: [], tiers: [{ points: 10, name: "Load Up" }] },
  { ability: "Evade", tags: [], tiers: [{ points: 10, name: "Evade +1" }] },
  { ability: "Attack", tags: [], tiers: [{ points: 10, name: "Attack Up (Small)" }] },
];

const data = {
  availability: "or",
  armor: [
    armor({ id: "head:barrage-piercing", name: "Barrage Piercing", rank: "low-rank", hr: 5, elder: 5, skills: [["Loading", 10]] }),
    armor({ id: "head:low", name: "Low Head", rank: "low-rank", hr: 5, elder: 5, skills: [["Attack", 2]] }),
    armor({ id: "head:high", name: "High Head", rank: "high-rank", hr: 8, skills: [["Attack", 3]] }),
  ],
  decos: [
    {
      id: "deco:evade",
      name: "Evade Jewel",
      slots: 1,
      hr: 1,
      elder: 1,
      cost: 0,
      skills: [["Evade", 1]],
      mats: [],
    } satisfies Deco,
  ],
  skillTree: new Map(skills.map((s) => [s.ability, s])),
} as unknown as GameData;

const input: SolverInput = {
  skills: [{ ability: "Loading", points: 10 }],
  gender: "male",
  hunter: "gunner",
  weaponSlots: 0,
  sort: "defense",
  rank: "high",
  hr: 9,
  elder: 10,
  allowBad: false,
  allowPiercings: true,
};

test("allowed piercings ignore the armor rank filter", () => {
  const barrage = data.armor[0];
  assert.equal(armorAllowed(data, input, barrage), true);
  assert.equal(armorAllowed(data, { ...input, allowPiercings: false }, barrage), false);
});

test("non-piercing armor still respects the armor rank filter", () => {
  assert.equal(armorAllowed(data, input, data.armor[1]), false);
  assert.equal(armorAllowed(data, input, data.armor[2]), true);
});

test("extra skill candidates come from data, not the capped result list", () => {
  const candidates = extraSkillCandidates(data, input);
  assert.ok(candidates.includes("Evade"), "jewel-only skill should be a candidate");
  assert.ok(candidates.includes("Attack"), "skill on eligible armor should be a candidate");
  assert.ok(!candidates.includes("Loading"), "target skills are not extras");
});
