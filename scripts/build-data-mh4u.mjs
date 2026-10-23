import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assDir = path.join(root, "vendor/mh4u-ass/Run/Data");
const trackerDir = path.join(root, "vendor/mh4u-tracker/data");
const out = path.join(root, "src/data/mh4u");
fs.mkdirSync(out, { recursive: true });

const read = (p) => fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
const lines = (p) => read(p).split(/\r?\n/).filter((l) => l.trim());
const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const norm = (s) =>
  s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const TAGS = new Set(["Offensive", "Defensive", "Blademaster", "Bow/Gunner", "Farming", "Resistance"]);

/* ---------- skills ---------- */
const enSkillLines = read(path.join(assDir, "Languages/English/skills.txt")).split(/\r?\n/);
const enBlank = enSkillLines.findIndex((l) => !l.trim());
const enTrees = enSkillLines.slice(0, enBlank).map((s) => s.trim()).filter(Boolean);
const enTiers = enSkillLines.slice(enBlank + 1).map((s) => s.trim()).filter(Boolean);

const jpSkillRows = lines(path.join(assDir, "skills.txt"))
  .slice(1)
  .map((line) => {
    const f = line.split(",");
    return {
      tier: f[0],
      tree: f[1],
      points: Number(f[2]) || 0,
      tags: f.slice(4).filter((x) => TAGS.has(x)),
    };
  });

const treeOrder = [];
const seenTree = new Set();
for (const row of jpSkillRows) {
  if (!seenTree.has(row.tree)) {
    seenTree.add(row.tree);
    treeOrder.push(row.tree);
  }
}
if (treeOrder.length !== enTrees.length) {
  console.warn("tree count mismatch", treeOrder.length, enTrees.length);
}
const jpToEnTree = new Map(treeOrder.map((t, i) => [t, enTrees[i]]));
jpToEnTree.set("胴系統倍加", "Torso Up");
jpToEnTree.set("胴系統倍化", "Torso Up");

const skillRows = jpSkillRows.map((row, i) => ({
  ...row,
  treeEn: jpToEnTree.get(row.tree) ?? row.tree,
  tierEn: row.tree === "" ? "Torso Up" : enTiers[i] ?? row.tier,
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
for (const group of skills) group.tiers.sort((a, b) => b.points - a.points);
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

const trackerArmor = new Map();
for (const [file, trackerPart] of Object.entries(TRACKER_PART)) {
  const mats = JSON.parse(read(path.join(trackerDir, "materials", `armor_${trackerPart}.json`)));
  const stats = JSON.parse(read(path.join(trackerDir, "stats", `armor_${trackerPart}.json`)));
  const byName = new Map(catalog.armor[trackerPart].entries.map((e) => [e[1], String(e[0])]));
  for (const [name, id] of byName) {
    const s = stats.byId?.[id];
    const create = mats.create?.[id];
    trackerArmor.set(norm(name), {
      mats: (create ?? []).map(([m, n]) => [mats.mats[m], n]),
      price: s?.price ?? 0,
    });
  }
  void file;
}

const armor = [];
for (const [file, part] of Object.entries(PARTS)) {
  const jp = lines(path.join(assDir, `${file}.txt`)).slice(1);
  const en = lines(path.join(assDir, `Languages/English/${file}.txt`)).map((s) => s.replace(/^\uFEFF/, "").trim());
  jp.forEach((line, i) => {
    const f = line.split(",");
    const name = en[i];
    if (!name) return;
    const skillsOut = [];
    for (let s = 14; s <= 22; s += 2) {
      if (!f[s]) continue;
      skillsOut.push([skillName(f[s]), Number(f[s + 1]) || 0]);
    }
    const rarity = Number(f[3]) || 0;
    const extra = trackerArmor.get(norm(name));
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
        thunder: Number(f[11]) || 0,
        ice: Number(f[12]) || 0,
        dragon: Number(f[13]) || 0,
      },
      sex: SEX[Number(f[1])] ?? "both",
      hunter: HUNTER[Number(f[2])] ?? "both",
      hr: Number(f[5]) || 0,
      elder: Number(f[6]) || 0,
      slots: Number(f[4]) || 0,
      skills: skillsOut,
      mats: extra?.mats ?? [],
      cost: extra?.price ?? 0,
    });
  });
}

/* ---------- decorations ---------- */
const enDecos = lines(path.join(assDir, "Languages/English/decorations.txt")).map((s) =>
  s.replace(/^\uFEFF/, "").trim(),
);
const decos = [];
lines(path.join(assDir, "decorations.txt"))
  .slice(1)
  .forEach((line, i) => {
    const f = line.split(",");
    const name = enDecos[i];
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
  charge_blade: "charge-blade",
  insect_glaive: "insect-glaive",
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
const shotParts = (name) => {
  const m = name.match(/^(.*?)\s*L(\d+)$/i);
  return m ? { name: m[1], level: Number(m[2]) } : { name, level: 0 };
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
    const arc = typeof s.arc === "string" ? s.arc.replace(/^Arc Shot:\s*/i, "") : null;
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
      createCost: createMats.length ? s.price ?? 0 : 0,
      improveCost: improveMats.length ? s.price ?? 0 : 0,
      improveFrom: parentName ? [parentName] : [],
      improveTo: (s.children ?? []).map((c) => names.get(c)).filter(Boolean),
      createMats,
      improveMats,
      phial: s.phial ?? null,
      kinsect: s.kinsect ?? null,
      shell: s.shell ?? null,
      arc,
      reload: s.reload ?? null,
      recoil: s.recoil ?? null,
      deviation: s.deviation ? String(s.deviation).replace(/^\(|\)$/g, "") : null,
      rapidFire: (s.rapid ?? []).map(([ammo]) => ammo),
      ammo: (s.ammo ?? []).map(([aName, cap]) => ({
        name: aName,
        group: AMMO_GROUP(aName),
        caps: [cap],
      })),
      crouch: (s.crouch ?? []).map((aName) => (Array.isArray(aName) ? aName[0] : aName)),
      coatings: s.coatings ?? [],
      shots: (s.charges ?? []).map(([shot]) => shotParts(shot)),
      notes: (s.notes ?? []).map(([note]) => note),
      songs: (s.songs ?? []).map(([notes, songName]) => ({ notes, name: songName })),
    };
    if (!RANGED.has(type)) {
      weapon.reload = null;
      weapon.recoil = null;
      weapon.deviation = null;
      weapon.rapidFire = null;
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

/* ---------- charm maxima ---------- */
const charmMax = {};
const charmDir = path.join(assDir, "Charm Generation");
for (const file of fs.readdirSync(charmDir)) {
  if (!/_skill[12]\.csv$/.test(file)) continue;
  const rows = read(path.join(charmDir, file)).split(/\r?\n/).filter(Boolean).slice(1);
  for (const line of rows) {
    const [jp, , max] = line.split(",");
    const ability = skillName(jp);
    if (!ability) continue;
    charmMax[ability] = Math.max(charmMax[ability] ?? 0, Number(max) || 0);
  }
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
  }),
);
