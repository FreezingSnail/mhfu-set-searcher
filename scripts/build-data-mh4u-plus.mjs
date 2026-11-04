import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mh4uDir = path.join(root, "src/data/mh4u");
const csvPath = path.join(root, "vendor/4U+ Weapons_Item Changes - Deco Changes.csv");
const out = path.join(root, "src/data/mh4u-plus");
fs.mkdirSync(out, { recursive: true });

const read = (p) => fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "");
const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const mh4uDecos = JSON.parse(read(path.join(mh4uDir, "decorations.json")));
const vanillaByName = new Map(mh4uDecos.map((deco) => [deco.name, deco]));

const decos = [];
for (const row of parseCsv(read(csvPath)).slice(1)) {
  const name = row[0]?.trim();
  if (!name) continue;
  const skills = [];
  const positive = row[2]?.trim();
  const positiveValue = Number(row[3]);
  if (positive) skills.push([positive, Number.isFinite(positiveValue) ? positiveValue : 0]);
  const negative = row[4]?.trim();
  const negativeValue = Number(row[5]);
  if (negative && negative !== "None") {
    skills.push([negative, Number.isFinite(negativeValue) ? negativeValue : 0]);
  }

  const vanilla = vanillaByName.get(name);
  decos.push({
    id: `deco:${slug(name)}`,
    name,
    slots: Number(row[1]) || 0,
    // Relic jewels are new to 4U+ and have no vanilla availability record.
    // Treat them as G-rank hub rewards; keep vanilla unlock data otherwise.
    hr: vanilla?.hr ?? 8,
    elder: vanilla?.elder ?? 99,
    cost: vanilla?.cost ?? 0,
    skills,
    mats: vanilla?.mats ?? [],
  });
}

const mh4uMeta = JSON.parse(read(path.join(mh4uDir, "meta.json")));
fs.writeFileSync(path.join(out, "decorations.json"), JSON.stringify(decos));
fs.writeFileSync(
  path.join(out, "meta.json"),
  JSON.stringify({
    armor: mh4uMeta.armor,
    decorations: decos.length,
    weapons: mh4uMeta.weapons,
    skills: mh4uMeta.skills,
    builtAt: new Date().toISOString(),
  }),
);
console.log("decorations.json", decos.length);
