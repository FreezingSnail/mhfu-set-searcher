import assert from "node:assert/strict";
import { test } from "node:test";
import type { GameData } from "./games.ts";
import { makeShareLink, makeShareToken, parseShareToken, resolveSharedSet } from "./share.ts";
import type { Charm } from "./types.ts";

const charm: Charm = {
  id: "charm-1",
  name: "Handicraft +4",
  slots: 2,
  table: 3,
  rarity: 0,
  skills: [["Handicraft", 4]],
};

const set = {
  game: "mh3u" as const,
  name: "Nargacuga Mix",
  selection: {
    picks: {
      head: "head:lagiacrus-helm",
      body: "",
      arms: "arms:lagiacrus-bracers",
      waist: "",
      legs: "legs:lagiacrus-greaves",
    },
    decoIds: ["deco:attack-jewel", "deco:attack-jewel"],
    weaponSlots: 2,
    charmId: charm.id,
  },
  charm,
};

test("share token round-trips a set and its charm", () => {
  const decoded = parseShareToken(makeShareToken(set));
  assert.ok(decoded);
  assert.equal(decoded.game, "mh3u");
  assert.equal(decoded.name, "Nargacuga Mix");
  assert.deepEqual(decoded.selection.picks, set.selection.picks);
  assert.deepEqual(decoded.selection.decoIds, set.selection.decoIds);
  assert.equal(decoded.selection.weaponSlots, 2);
  assert.deepEqual(decoded.charm, charm);
});

test("share link points at the set's game and carries the token", () => {
  const link = makeShareLink(set, "https://example.com/mhfu-set-searcher/#mhfu");
  const url = new URL(link);
  assert.equal(url.hash, "#mh3u");
  assert.ok(url.searchParams.get("share"));
  assert.equal(url.searchParams.get("share"), makeShareToken(set));
});

test("shared IDs are validated against the game data", () => {
  const data = {
    parts: ["head", "body", "arms", "waist", "legs"],
    charmSupport: true,
    armorById: new Map([
      ["head:lagiacrus-helm", { id: "head:lagiacrus-helm", part: "head" }],
      ["arms:lagiacrus-bracers", { id: "arms:lagiacrus-bracers", part: "arms" }],
      ["legs:lagiacrus-greaves", { id: "legs:lagiacrus-greaves", part: "legs" }],
    ]),
    decoById: new Map([["deco:attack-jewel", {}]]),
  } as unknown as GameData;
  const decoded = parseShareToken(makeShareToken(set));
  assert.ok(decoded);

  const resolved = resolveSharedSet(decoded, data, []);
  assert.deepEqual(resolved.selection.picks, {
    head: "head:lagiacrus-helm",
    body: "",
    arms: "arms:lagiacrus-bracers",
    waist: "",
    legs: "legs:lagiacrus-greaves",
  });
  assert.deepEqual(resolved.selection.decoIds, ["deco:attack-jewel", "deco:attack-jewel"]);
  assert.equal(resolved.selection.charmId, "charm-1");
  assert.equal(resolved.charms.length, 1);

  const again = resolveSharedSet(decoded, data, resolved.charms);
  assert.equal(again.selection.charmId, "charm-1");
  assert.equal(again.charms.length, 1, "reopening a link should not duplicate the charm");
});

test("a conflicting local charm id is replaced instead of overwritten", () => {
  const data = {
    parts: ["head", "body", "arms", "waist", "legs"],
    charmSupport: true,
    armorById: new Map(),
    decoById: new Map(),
  } as unknown as GameData;
  const decoded = parseShareToken(makeShareToken(set));
  assert.ok(decoded);
  const local: Charm = { ...charm, skills: [["Attack", 3]] };

  const resolved = resolveSharedSet(decoded, data, [local]);
  assert.notEqual(resolved.selection.charmId, "charm-1");
  assert.equal(resolved.charms[0].id, resolved.selection.charmId);
  assert.deepEqual(resolved.charms[0].skills, [["Handicraft", 4]]);
  assert.equal(resolved.charms.length, 2);
});

test("malformed tokens are rejected", () => {
  assert.equal(parseShareToken(null), null);
  assert.equal(parseShareToken("not-base64!"), null);
  assert.equal(parseShareToken(""), null);
  assert.equal(parseShareToken("e30"), null);
});
