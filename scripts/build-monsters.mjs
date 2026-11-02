import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "vendor/mhfu-db/Monsters");
const out = path.join(root, "src/data/monsters.json");

const read = (name) => JSON.parse(fs.readFileSync(path.join(source, name), "utf8"));
const monsters = read("monsters.json");
const weaponData = read("weapon-effectiveness.json");
const elementData = read("element-effectiveness.json");

const PART_ALIASES = {
  wings: "wing",
  feet: "legs",
  frontlegs: "forelegs",
  claws: "claw",
  arms: "arm",
  "wing membrane": "wing membrane",
  "wings membrane": "wing membrane",
  clawss: "claw",
  bodybrokenshell: "body-brokenshell",
  "body-guardy": "body-guard",
  face: "head",
};

const SUFFIXES = ["-enraged", "-guard", "-harden", "-brokenshell", "-pre-break", "-post-break"];

function normalizePart(value) {
  const text = String(value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const suffix = SUFFIXES.find((s) => text.endsWith(s)) ?? "";
  const base = suffix ? text.slice(0, -suffix.length) : text;
  return `${PART_ALIASES[base] ?? base}${suffix}`;
}

function elementValue(part, key) {
  return Number(part?.[key] ?? 0) || 0;
}

const elementByMonster = new Map();
for (const entry of elementData) {
  const parts = new Map();
  for (const part of entry.parts ?? []) {
    parts.set(normalizePart(part.part), part);
  }
  elementByMonster.set(entry.monster, parts);
}

const output = [];
for (const monster of monsters) {
  const weapon = weaponData.find((entry) => entry.monster === monster.name);
  if (!weapon) continue;
  const elements = elementByMonster.get(monster.name) ?? new Map();
  const parts = (weapon.parts ?? []).map((part) => {
    const element =
      elements.get(normalizePart(part.part)) ??
      elements.get("other") ??
      elements.get("body") ??
      {};
    return {
      part: part.part,
      slash: Number(part.slash ?? 0) || 0,
      strike: Number(part.strike ?? 0) || 0,
      shooting: Number(part.shooting ?? 0) || 0,
      fire: elementValue(element, "fire"),
      water: elementValue(element, "water"),
      thunder: elementValue(element, "thundr"),
      ice: elementValue(element, "ice"),
      dragon: elementValue(element, "dragon"),
    };
  });
  output.push({ name: monster.name, type: monster.type, parts });
}

fs.writeFileSync(out, JSON.stringify(output));
console.log("monsters.json", output.length);
