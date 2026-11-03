import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildSet } from "./build.ts";
import type { GameData } from "./games.ts";
import {
  MHFU_PROGRESSIONS,
  PROGRESSION_HUNTERS,
  PROGRESSION_RANK_ARMOR,
  PROGRESSION_RANK_UNLOCK,
  PROGRESSION_RANKS,
  PROGRESSION_STYLES,
  selectionFromProgression,
  type ProgressionRank,
} from "./progressions.ts";
import { activeTier } from "./tiers.ts";
import type { Armor, Deco, SkillTree } from "./types.ts";
import {
  HUB_TIERS,
  MHFU_PROGRESSION_WEAPONS,
  VILLAGE_TIERS,
  tierHasSet,
  tierRouteCard,
  tierUnlock,
} from "./weaponRoutes.ts";

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;

const armor = readJson<Armor[]>("../data/armor.json");
const decos = readJson<Deco[]>("../data/decorations.json");
const skills = readJson<SkillTree[]>("../data/skills.json");
const skillTree = new Map(skills.map((skill) => [skill.ability, skill]));

const RANK_ORDER: Record<string, number> = { "low-rank": 0, "high-rank": 1, "g-rank": 2 };

const unlocked = (rank: ProgressionRank, item: { hr: number; elder: number }) => {
  const max = PROGRESSION_RANK_UNLOCK[rank];
  return (item.hr > 0 && item.hr <= max.hr) || (item.elder > 0 && item.elder <= max.elder);
};

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

test("every rank, hunter, and path has at least one recommended set", () => {
  const seen = new Set<string>();
  for (const set of MHFU_PROGRESSIONS) {
    assert.ok(!seen.has(set.id), `duplicate progression id: ${set.id}`);
    seen.add(set.id);
  }

  for (const rank of PROGRESSION_RANKS) {
    for (const hunter of PROGRESSION_HUNTERS) {
      for (const style of PROGRESSION_STYLES) {
        const matches = MHFU_PROGRESSIONS.filter(
          (set) => set.rank === rank.id && set.hunter === hunter.id && set.style === style.id,
        );
        assert.ok(
          matches.length >= 1,
          `expected a ${rank.id}/${hunter.id}/${style.id} set, got ${matches.length}`,
        );
      }
    }
  }
});

test("recommended sets use legal rank, hunter, and part pieces with valid jewels", () => {
  for (const set of MHFU_PROGRESSIONS) {
    assert.ok(set.summary.trim(), `${set.id} needs a summary`);
    assert.ok(set.weaponNote.trim(), `${set.id} needs a weapon note`);
    assert.ok(set.notes.length > 0, `${set.id} needs at least one note`);
    assert.equal(set.weaponSlots, 0, `${set.id} should leave weapon slots free`);
    assert.deepEqual(
      Object.keys(set.picks).sort(),
      ["arms", "body", "head", "legs", "waist"],
      `${set.id} must pick all five armor parts`,
    );

    for (const part of data.parts) {
      const piece = data.armorById.get(set.picks[part]);
      assert.ok(piece, `${set.id} has no armor for ${part}`);
      assert.equal(piece.part, part, `${set.id}/${part} points at the wrong slot`);
      assert.ok(
        RANK_ORDER[piece.rank] <= RANK_ORDER[PROGRESSION_RANK_ARMOR[set.rank]],
        `${set.id}/${part} is above ${set.rank} rank`,
      );
      assert.ok(
        piece.hunter === "both" || piece.hunter === set.hunter,
        `${set.id}/${part} is not available to ${set.hunter}`,
      );
      assert.ok(
        unlocked(set.rank, piece),
        `${set.id}/${part} is not unlocked at the end of ${set.rank} rank`,
      );
    }

    const decoItems: Deco[] = [];
    for (const id of set.decoIds) {
      const deco = data.decoById.get(id);
      assert.ok(deco, `${set.id} references missing jewel ${id}`);
      assert.ok(unlocked(set.rank, deco), `${set.id} jewel ${id} is not unlocked at ${set.rank} rank`);
      decoItems.push(deco);
    }

    const items = [
      ...Object.values(set.picks).map((id) => data.armorById.get(id)!),
      ...decoItems,
    ];
    const hubUnlock = items.every((item) => item.hr > 0)
      ? Math.max(...items.map((item) => item.hr))
      : 0;
    const villageUnlock = items.every((item) => item.elder > 0)
      ? Math.max(...items.map((item) => item.elder))
      : 0;
    assert.equal(set.unlockHr, hubUnlock > 9 ? 0 : hubUnlock, `${set.id} has a stale hub unlock`);
    assert.equal(
      set.unlockVillage,
      villageUnlock > 10 ? 0 : villageUnlock,
      `${set.id} has a stale village unlock`,
    );

    const built = buildSet(data, selectionFromProgression(set));
    assert.ok(built.valid, `${set.id} has an invalid jewel layout: ${built.slotError}`);
    assert.equal(built.armor.length, 5, `${set.id} did not resolve five pieces`);
    assert.ok(built.active.every((skill) => skill.points > 0), `${set.id} activates a negative skill`);

    const active = new Set(built.active.map((skill) => skill.ability));
    for (const ability of set.skills) {
      assert.ok(active.has(ability), `${set.id} is missing ${ability}`);
    }
  }
});

test("every weapon has a legal card at every village star and hub HR", () => {
  assert.equal(MHFU_PROGRESSION_WEAPONS.length, 11);
  assert.equal(new Set(MHFU_PROGRESSION_WEAPONS.map((weapon) => weapon.id)).size, 11);
  assert.equal(VILLAGE_TIERS.length, 10);
  assert.equal(HUB_TIERS.length, 9);

  for (const weapon of MHFU_PROGRESSION_WEAPONS) {
    for (const style of PROGRESSION_STYLES) {
      for (const tier of [...VILLAGE_TIERS, ...HUB_TIERS]) {
        const route = tierRouteCard(weapon.id, style.id, tier);
        assert.equal(route.weapon.id, weapon.id);
        assert.equal(route.tier.source, tier.source);
        assert.equal(route.tier.level, tier.level);
        assert.ok(
          tierHasSet(route.set, tier),
          `${weapon.id}/${style.id}/${tier.label} selected an unavailable set`,
        );
        assert.ok(route.note.trim(), `${weapon.id}/${style.id}/${tier.label} needs a weapon note`);
        assert.equal(
          new Set(route.variants.map((set) => set.id)).size,
          route.variants.length,
          `${weapon.id}/${style.id}/${tier.label} has duplicate variants`,
        );
        for (const variant of route.variants) {
          assert.notEqual(variant.id, route.set.id, `${weapon.id}/${style.id}/${tier.label} repeats the selected set as a variant`);
          assert.ok(
            tierHasSet(variant, tier),
            `${weapon.id}/${style.id}/${tier.label} offers an unavailable variant`,
          );
        }
        if (route.next) {
          assert.equal(route.next.tier.source, tier.source);
          assert.ok(route.next.tier.level > tier.level, `${weapon.id}/${style.id}/${tier.label} next tier is not later`);
        }

        const built = buildSet(data, selectionFromProgression(route.set));
        assert.ok(built.valid, `${weapon.id}/${style.id}/${tier.label} route is invalid`);
        for (const piece of built.armor) {
          assert.ok(
            piece.hunter === "both" || piece.hunter === weapon.hunter,
            `${weapon.id}/${style.id}/${tier.label} uses ${piece.name}, which is not available to ${weapon.hunter}`,
          );
        }
      }
    }
  }

  assert.ok(
    MHFU_PROGRESSIONS.some((set) => set.unlockHr > 0 && set.unlockVillage > 0),
    "expected at least one set with overlapping hub and village unlocks",
  );
});

test("Garuga earplug sets surface at high and G rank", () => {
  const high = tierRouteCard("hammer", "comfort", HUB_TIERS[7]);
  const highSets = [high.set, ...high.variants].map((set) => set.id);
  assert.ok(highSets.includes("mhfu-high-blade-garuga"), "high Garuga should be offered at HR8");

  const village = tierRouteCard("hammer", "comfort", VILLAGE_TIERS[7]);
  assert.equal(village.set.id, "mhfu-high-blade-garuga-hge", "Village 8* should recommend HGE Garuga");

  const g = tierRouteCard("heavy-bowgun", "dps", HUB_TIERS[7]);
  assert.equal(g.set.id, "mhfu-g-gunner-garuga", "HR8 HBG should recommend Garuga X");

  const gunner = tierRouteCard("bow", "comfort", HUB_TIERS[7]);
  const gunnerSets = [gunner.set, ...gunner.variants].map((set) => set.id);
  assert.ok(gunnerSets.includes("mhfu-high-gunner-garuga"), "gunner Garuga should be offered at HR8");
});

test("village and hub tracks never regress to an earlier unlock", () => {
  for (const weapon of MHFU_PROGRESSION_WEAPONS) {
    for (const style of PROGRESSION_STYLES) {
      for (const tiers of [VILLAGE_TIERS, HUB_TIERS]) {
        let lastUnlock = 0;
        for (const tier of tiers) {
          const route = tierRouteCard(weapon.id, style.id, tier);
          const unlock = tierUnlock(route.set, tier.source);
          assert.ok(unlock > 0, `${weapon.id}/${style.id}/${tier.label} has no unlock level`);
          assert.ok(
            unlock >= lastUnlock,
            `${weapon.id}/${style.id}/${tier.label} regressed from ${lastUnlock} to ${unlock}`,
          );
          lastUnlock = unlock;
        }
      }
    }
  }
});
