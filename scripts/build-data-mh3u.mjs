import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assDir = path.join(root, "vendor/mh3u-ass/Data");
const trackerDir = path.join(root, "vendor/mh3u-tracker/data");
const out = path.join(root, "src/data/mh3u");
fs.mkdirSync(out, { recursive: true });

const read = (p) => fs.readFileSync(p, "utf8");
const lines = (p) => read(p).split(/\r?\n/).filter((l) => l.trim());
const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const norm = (s) =>
  s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/* ---------- skills ---------- */
const EN_SKILLS = read(path.join(assDir, "Languages/English/skills.txt")).split(/\r?\n/);
const enBlank = EN_SKILLS.findIndex((l) => !l.trim());
const enTrees = EN_SKILLS.slice(0, enBlank).map((s) => s.trim()).filter(Boolean);
const enTiers = EN_SKILLS.slice(enBlank + 1).map((s) => s.trim()).filter(Boolean);

const jpSkillRows = lines(path.join(assDir, "skills.txt"))
  .slice(1)
  .map((line) => {
    const f = line.split(",");
    return {
      id: Number(f[0]),
      gid: Number(f[1]),
      tier: f[2],
      tree: f[3],
      points: Number(f[4]),
      tags: f.slice(6).filter(Boolean),
    };
  });

/* Group IDs are 1..123. Group 1 is Torso Up; the rest shift by one in the
   English tree list, with Torso Up appended at the end. */
const treeNames = new Map();
for (const row of jpSkillRows) {
  if (treeNames.has(row.gid)) continue;
  treeNames.set(row.gid, row.gid === 1 ? "Torso Up" : enTrees[row.gid - 2]);
}
const jpToEnTree = new Map();
for (const row of jpSkillRows) {
  if (!jpToEnTree.has(row.tree)) {
    jpToEnTree.set(row.tree, treeNames.get(row.gid));
  }
}
jpToEnTree.set("胴系統倍化", "Torso Up");

const skillRows = jpSkillRows.map((row, i) => ({
  ...row,
  tierEn: row.gid === 1 ? "Torso Up" : enTiers[i],
  treeEn: treeNames.get(row.gid),
}));

const skillGroups = new Map();
for (const row of skillRows) {
  if (!row.treeEn) continue;
  let group = skillGroups.get(row.treeEn);
  if (!group) {
    group = { ability: row.treeEn, tags: [], tiers: [] };
    skillGroups.set(row.treeEn, group);
  }
  for (const tag of row.tags) if (!group.tags.includes(tag)) group.tags.push(tag);
  if (row.tierEn) group.tiers.push({ points: row.points, name: row.tierEn });
}
const skills = [...skillGroups.values()];
for (const g of skills) g.tiers.sort((a, b) => b.points - a.points);
const knownSkills = new Set(skills.map((s) => s.ability));

const skillName = (jp) => jpToEnTree.get(jp) ?? jp;

/* ---------- tracker catalog ---------- */
const catalog = JSON.parse(
  read(path.join(trackerDir, "catalog.js"))
    .replace(/^window\.CATALOG = /, "")
    .replace(/;\s*$/, ""),
);

/* ---------- armor ---------- */
const PARTS = { head: "head", body: "body", arms: "arms", waist: "waist", legs: "legs" };
const TRACKER_PART = { head: "head", body: "chest", arms: "arms", waist: "waist", legs: "legs" };
const SEX = { 0: "both", 1: "male", 2: "female" };
const HUNTER = { 0: "both", 1: "blade", 2: "gunner" };
const rankOf = (rarity) => (rarity <= 3 ? "low-rank" : rarity <= 6 ? "high-rank" : "g-rank");

const trackerArmorMats = new Map();
for (const [part, file] of Object.entries(TRACKER_PART)) {
  const mats = JSON.parse(read(path.join(trackerDir, "materials", `armor_${file}.json`)));
  const byName = new Map(catalog.armor[file].entries.map((e) => [e[1], String(e[0])]));
  for (const [name, id] of byName) {
    const create = mats.create?.[id];
    if (create) trackerArmorMats.set(norm(name), create.map(([m, n]) => [mats.mats[m], n]));
  }
  void part;
}

const armor = [];
for (const [file, part] of Object.entries(PARTS)) {
  const jp = lines(path.join(assDir, `${file}.txt`)).slice(1);
  const en = lines(path.join(assDir, `Languages/English/${file}.txt`));
  jp.forEach((line, i) => {
    const f = line.split(",");
    const name = en[i]?.trim();
    if (!name) return;
    const skillsOut = [];
    for (let s = 14; s <= 22; s += 2) {
      if (!f[s]) continue;
      skillsOut.push([skillName(f[s]), Number(f[s + 1]) || 0]);
    }
    const rarity = Number(f[3]) || 0;
    armor.push({
      id: `${part}:${slug(name)}`,
      name,
      part,
      rank: rankOf(rarity),
      rarity,
      defense: Number(f[8]) || 0,
      defenseBase: Number(f[7]) || 0,
      res: {
        fire: Number(f[9]) || 0,
        water: Number(f[10]) || 0,
        ice: Number(f[11]) || 0,
        thunder: Number(f[12]) || 0,
        dragon: Number(f[13]) || 0,
      },
      sex: SEX[Number(f[1])] ?? "both",
      hunter: HUNTER[Number(f[2])] ?? "both",
      hr: Number(f[5]) || 0,
      elder: Number(f[6]) || 0,
      slots: Number(f[4]) || 0,
      skills: skillsOut,
      mats: trackerArmorMats.get(norm(name)) ?? [],
      cost: Number(f[32]) || 0,
    });
  });
}

/* ---------- decorations ---------- */
const enDecos = lines(path.join(assDir, "Languages/English/decorations.txt"));
const decos = [];
lines(path.join(assDir, "decorations.txt"))
  .slice(1)
  .forEach((line, i) => {
    const f = line.split(",");
    const name = enDecos[i]?.trim();
    if (!name) return;
    const skillsOut = [];
    for (const s of [5, 7]) {
      if (f[s]) skillsOut.push([skillName(f[s]), Number(f[s + 1]) || 0]);
    }
    decos.push({
      id: `deco:${slug(name)}`,
      name,
      slots: Number(f[2]) || 0,
      hr: Number(f[3]) || 0,
      elder: Number(f[4]) || 0,
      cost: 0,
      skills: skillsOut,
      mats: [],
    });
  });

/* ---------- weapons ---------- */
const TYPE = {
  great_sword: "great-sword",
  long_sword: "long-sword",
  sword_and_shield: "sword-and-shield",
  dual_blades: "dual-blades",
  hammer: "hammer",
  hunting_horn: "hunting-horn",
  lance: "lance",
  gunlance: "gunlance",
  switch_axe: "switch-axe",
  light_bowgun: "light-bowgun",
  heavy_bowgun: "heavy-bowgun",
  bow: "bow",
};
const RANGED = new Set(["light-bowgun", "heavy-bowgun", "bow"]);
const AMMO_GROUP = (name) => {
  if (/^(Normal|Pierce|Pellet|Crag|Clust|Slicing|WyvernFire|Dragon|Flaming|Water|Thunder|Freeze|Ice|Slime)/i.test(name)) {
    if (/^(Flaming|Water|Thunder|Freeze|Ice|Dragon|Slime)/i.test(name)) return "element";
    return "normal";
  }
  if (/^(Poison|Para|Sleep|Exhaust|Blast)/i.test(name)) return "status";
  return "misc";
};
const weaponTypeLabel = {
  "great-sword": "Great Sword",
  "long-sword": "Long Sword",
  "sword-and-shield": "Sword & Shield",
  "dual-blades": "Dual Blades",
  hammer: "Hammer",
  "hunting-horn": "Hunting Horn",
  lance: "Lance",
  gunlance: "Gunlance",
  "switch-axe": "Switch Axe",
  "light-bowgun": "Light Bowgun",
  "heavy-bowgun": "Heavy Bowgun",
  bow: "Bow",
};

const weapons = [];
for (const [key, type] of Object.entries(TYPE)) {
  const meta = catalog.weapons[key];
  if (!meta) continue;
  const stats = JSON.parse(read(path.join(trackerDir, "stats", `${key}.json`)));
  const mats = JSON.parse(read(path.join(trackerDir, "materials", `${key}.json`)));
  const names = new Map(meta.entries.map((e) => [e[0], e[1]]));

  const order = new Map();
  let n = 0;
  const seen = new Set();
  const walk = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    order.set(id, n++);
    for (const child of stats.byId[id]?.children ?? []) walk(child);
  };
  for (const [id, s] of Object.entries(stats.byId)) if (s.parent == null) walk(Number(id));
  for (const id of Object.keys(stats.byId)) walk(Number(id));

  for (const [rawId, s] of Object.entries(stats.byId)) {
    const id = Number(rawId);
    const name = names.get(id);
    if (!name) continue;
    const cr = mats.create?.[String(id)];
    const createMats = (cr?.d ?? []).map(([m, q]) => [mats.mats[m], q]);
    const upgrade = cr?.f;
    const improveMats = (upgrade?.[2] ?? []).map(([m, q]) => [mats.mats[m], q]);
    const parentName = s.parent != null ? names.get(s.parent) : undefined;
    const weapon = {
      id: `${type}:${id}`,
      name,
      type,
      order: order.get(id) ?? 9999,
      rank: s.rar <= 3 ? "lr" : s.rar <= 6 ? "hr" : "gr",
      attack: s.atk ?? 0,
      affinity: s.aff ?? 0,
      slots: s.slots ?? 0,
      rarity: s.rar ?? 0,
      elements: (s.ele ?? []).map(([el, value]) => [el, value]),
      awaken: (s.ele ?? []).some(([, , hidden]) => hidden),
      bonus: s.def ? String(s.def) : null,
      defense: s.def ?? 0,
      sharpness: s.sh?.[0] ?? [],
      sharpnessPlus: s.sh?.[1] ?? [],
      createCost: 0,
      improveCost: 0,
      improveFrom: parentName ? [parentName] : [],
      improveTo: (s.children ?? []).map((c) => names.get(c)).filter(Boolean),
      createMats,
      improveMats,
      phial: s.phial ?? null,
      shell: s.shell ?? null,
      arc: s.arc ?? null,
      reload: s.reload ?? null,
      recoil: s.recoil ?? null,
      deviation: s.deviation ?? null,
      rapidFire: null,
      ammo: (s.ammo ?? []).map(([aName, cap]) => ({
        name: aName,
        group: AMMO_GROUP(aName),
        caps: [cap],
      })),
      crouch: (s.crouch ?? []).map(([aName]) => aName),
      coatings: (s.coatings ?? []).map(([c]) => c),
      shots: (s.charges ?? []).map(([shot, level]) => ({ name: shot, level: Number(level) || 1 })),
      notes: (s.notes ?? []).map(([note]) => note),
      songs: (s.songs ?? []).map(([notes, songName]) => ({ notes, name: songName })),
    };
    if (!RANGED.has(type)) {
      weapon.reload = null;
      weapon.recoil = null;
      weapon.deviation = null;
      weapon.ammo = [];
      weapon.crouch = [];
      weapon.coatings = [];
      weapon.shots = [];
      weapon.arc = null;
    }
    weapons.push(weapon);
  }
}
weapons.sort((a, b) => a.type.localeCompare(b.type) || a.order - b.order || a.name.localeCompare(b.name));

/* ---------- charm max points ---------- */
const charmSource = fs.readFileSync(
  path.join(root, "vendor/mh3u-ass/CharmDatabase.cpp"),
  "utf16le",
);
const charmStart = charmSource.indexOf("skill1_table =");
const charmEnd = charmSource.indexOf("#pragma endregion", charmStart);
const charmBlock = charmSource.slice(charmStart, charmEnd);
const charmMax = {};
for (const m of charmBlock.matchAll(/(\d+),\s*(\d+),\s*(\d+)/g)) {
  const skillIndex = Number(m[1]);
  const max = Number(m[3]);
  const ability = enTrees[skillIndex];
  if (!ability) continue;
  charmMax[ability] = Math.max(charmMax[ability] ?? 0, max);
}

const missing = new Set();
for (const a of armor) for (const [s] of a.skills) if (!knownSkills.has(s)) missing.add(s);
for (const d of decos) for (const [s] of d.skills) if (!knownSkills.has(s)) missing.add(s);
if (missing.size) console.warn("skills missing from tree:", [...missing].join(", "));

const write = (name, data) => {
  fs.writeFileSync(path.join(out, name), JSON.stringify(data));
  console.log(name, Array.isArray(data) ? data.length : Object.keys(data).length);
};
write("armor.json", armor);
write("decorations.json", decos);
write("weapons.json", weapons);
write("skills.json", skills);
write("charm-max.json", charmMax);
fs.writeFileSync(
  path.join(out, "meta.json"),
  JSON.stringify({
    armor: armor.length,
    decorations: decos.length,
    weapons: weapons.length,
    skills: skills.length,
    builtAt: new Date().toISOString(),
    weaponTypes: Object.fromEntries(Object.keys(TYPE).map((k) => [TYPE[k], weaponTypeLabel[TYPE[k]]])),
  }),
);
