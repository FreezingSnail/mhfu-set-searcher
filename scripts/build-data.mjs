import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendor = path.join(root, "vendor");
const out = path.join(root, "src", "data");
fs.mkdirSync(out, { recursive: true });

const read = (p) => JSON.parse(fs.readFileSync(path.join(vendor, p), "utf8"));
const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Blacksmith spellings -> Athena skill-tree names. */
const ALIAS = {
  Defense: "Defence",
  Reload: "Load",
  Capacity: "Loading",
  Autoreload: "Speed Fire",
  SwrShrpner: "SwdShrpner",
  "Sword Draw": "Drawn Crit",
  ShortCharg: "Fast Chrge",
  ShortCharge: "Fast Chrge",
  Everlasting: "Everlastng",
  HearProtect: "HearProtct",
  Backpacking: "Backpackng",
  "Evade Dist": "Evade Inc",
  "NormalS up": "NormalS Up",
  "NormalS Up+1": "NormalS Up",
  "PierceS up": "PierceS Up",
  "PierceS Up+1": "PierceS Up",
  "Crag S Add": "CragS Add",
  ClustSAdd: "ClustS Add",
  PoisonCAdd: "PoisnCtAdd",
  ParalyCAdd: "Para CtAdd",
  SleepCAdd: "SleepCtAdd",
  PowerCAdd: "PowerCtAdd",
  "Ice Skill": "Ice Res",
  SpeedSetup: "Set Trap",
  ComrdGuide: "FlyneGuide",
  ComradeAtk: "Flyne Atk",
  ComradeDef: "Flyne Def",
};
const canon = (s) => ALIAS[s?.trim()] ?? s?.trim();

/* ---------- skills ---------- */
const skillGroups = [];
let current = null;
for (const raw of fs.readFileSync(path.join(vendor, "ass/skills.txt"), "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line) continue;
  if (line.startsWith('"') && !/^-?\d+\s/.test(line)) {
    current = { ability: line.slice(1, -1), tags: [], tiers: [] };
    skillGroups.push(current);
    continue;
  }
  if (line.startsWith("tag=")) {
    current?.tags.push(line.slice(5).replace(/^"|"$/g, ""));
    continue;
  }
  const m = line.match(/^(-?\d+)\s+"(.*)"$/);
  if (m && current) current.tiers.push({ points: Number(m[1]), name: m[2] });
}
/* Decoration-only trees that are absent from ASS's armor-skill list. */
skillGroups.push(
  { ability: "Guts", tags: ["Defensive"], tiers: [{ points: 10, name: "Guts" }] },
  { ability: "Constitutn", tags: ["Defensive"], tiers: [{ points: 15, name: "Constitution +2" }, { points: 10, name: "Constitution +1" }] },
  { ability: "Perceive", tags: ["Monster"], tiers: [{ points: 10, name: "Tranq Guru" }] },
  { ability: "Tranquilzr", tags: ["Monster"], tiers: [{ points: 15, name: "Tranq Celeb" }, { points: 10, name: "Tranq Whiz" }] },
);
for (const g of skillGroups) g.tiers.sort((a, b) => b.points - a.points);
const known = new Set(skillGroups.map((g) => g.ability));

/* ---------- armor ---------- */
const PART = { helmet: "head", plate: "body", gauntlets: "arms", waist: "waist", leggings: "legs" };
const SEX = { "Male/Female": "both", Male: "male", Female: "female" };
const HUNTER = { "Blademaster/Gunner": "both", Blademaster: "blade", Gunner: "gunner" };
const armor = [];
for (const [file, part] of Object.entries(PART)) {
  for (const r of read(`blacksmith/armor/${file}.json`).armor) {
    armor.push({
      id: `${part}:${slug(r.name)}`,
      name: r.name,
      part,
      rank: r.rank,
      rarity: r.rarity,
      defense: r.defence,
      res: { fire: r.fire_res, thunder: r.thunder_res, dragon: r.dragon_res, water: r.water_res, ice: r.ice_res },
      sex: SEX[r.sex] ?? "both",
      hunter: HUNTER[r.hunter_type] ?? "both",
      hr: Number(r.hr) || 0,
      elder: Number(r.elder) || 0,
      slots: r.slots,
      skills: (r.skills ?? []).map((s) => [canon(s.name), s.amount]),
      mats: (r.create_mats ?? []).map((m) => [m.name, m.amount]),
      cost: r.create_cost,
    });
  }
}

/* ---------- decorations (ASS is authoritative for values) ---------- */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
const decos = [];
for (const row of parseCsv(fs.readFileSync(path.join(vendor, "ass/decorations.csv"), "utf8"))) {
  const name = row[0].replace(/^\uFEFF/, "").trim();
  if (!name || name.startsWith(";")) continue;
  const cells = row.slice(1).map((x) => x.trim());
  if (cells.length < 20) continue;
  const skills = [];
  for (let i = 0; i < 2; i++) {
    const points = Number(cells[4 + i * 2]);
    const skill = cells[5 + i * 2];
    if (skill) skills.push([canon(skill), points]);
  }
  const mats = [];
  for (let i = 0; i < 4; i++) {
    const amount = Number(cells[8 + i * 2]);
    const mat = cells[9 + i * 2];
    if (mat) mats.push([mat, amount]);
  }
  decos.push({
    id: `deco:${slug(name)}`,
    name,
    slots: cells[1].split("").filter((c) => c === "O").length,
    hr: Number(cells[2]) || 0,
    elder: Number(cells[3]) || 0,
    cost: Number(String(cells[0]).replace(/z/i, "")) || 0,
    skills,
    mats,
  });
}

/* ---------- weapons ---------- */
// Preserve the Blacksmith tree order: main Iron/Bone branches come first.
const weaponOrder = new Map();
for (const file of fs.readdirSync(path.join(vendor, "blacksmith/maps"))) {
  if (!file.endsWith(".json")) continue;
  const type = file.replace(/\.json$/, "");
  const order = new Map();
  let i = 0;
  const walk = (nodes) => {
    for (const n of nodes) {
      order.set(n.name, i++);
      if (n.children) walk(n.children);
    }
  };
  walk(read(`blacksmith/maps/${file}`).map);
  weaponOrder.set(type, order);
}
const weapons = [];
for (const file of fs.readdirSync(path.join(vendor, "blacksmith/weapons"))) {
  if (!file.endsWith(".json")) continue;
  for (const w of read(`blacksmith/weapons/${file}`).weapons) {
    const from = w.improve_from ? (Array.isArray(w.improve_from) ? w.improve_from : [w.improve_from]) : [];
    weapons.push({
      id: w.name,
      name: w.name,
      type: w.type,
      order: weaponOrder.get(w.type)?.get(w.name) ?? 9999,
      rank: w.rarity <= 3 ? "lr" : w.rarity <= 7 ? "hr" : "gr",
      attack: w.attack,
      affinity: Number(String(w.affinity ?? "0").replace("%", "")) || 0,
      slots: w.slots,
      rarity: w.rarity,
      elements: (w.elements ?? []).map((e) => [e.name, e.attack]),
      bonus: w.bonus ?? null,
      sharpness: w.sharpness ?? [],
      sharpnessPlus: w.sharpness_plus ?? [],
      createCost: w.create_cost ?? 0,
      improveCost: w.improve_cost ?? 0,
      improveFrom: from,
      improveTo: w.improve_to ?? [],
      createMats: (w.create_mats ?? []).map((m) => [m.name, m.amount]),
      improveMats: (w.improve_mats ?? []).map((m) => [m.name, m.amount]),
    });
  }
}
weapons.sort((a, b) => a.type.localeCompare(b.type) || a.order - b.order || a.name.localeCompare(b.name));

const missing = new Set();
for (const a of armor) for (const [s] of a.skills) if (!known.has(s)) missing.add(s);
for (const d of decos) for (const [s] of d.skills) if (!known.has(s)) missing.add(s);
if (missing.size) console.warn("skills missing from tree:", [...missing].join(", "));

const write = (name, data) => {
  fs.writeFileSync(path.join(out, name), JSON.stringify(data));
  console.log(name, Array.isArray(data) ? data.length : Object.keys(data).length);
};
write("armor.json", armor);
write("decorations.json", decos);
write("weapons.json", weapons);
write("skills.json", skillGroups);
fs.writeFileSync(
  path.join(out, "meta.json"),
  JSON.stringify({
    armor: armor.length,
    decorations: decos.length,
    weapons: weapons.length,
    skills: skillGroups.length,
    builtAt: new Date().toISOString(),
  }),
);
