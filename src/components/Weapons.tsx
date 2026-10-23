import { useCallback, useEffect, useMemo, useState } from "react";
import { TYPE_LABEL, WEAPONS, WEAPON_BY_NAME, WEAPON_TYPES } from "../lib/data";
import type { Weapon } from "../lib/types";

const SHARP_COLORS = ["#c0392b", "#d35400", "#d4ac0d", "#27ae60", "#2980b9", "#ecf0f1", "#8e44ad"];
const SHARP_NAMES = ["Red", "Orange", "Yellow", "Green", "Blue", "White", "Purple"];
const ELEMENTS = ["Fire", "Water", "Thunder", "Ice", "Dragon", "Poison", "Paralysis", "Sleep"];
const maxSharp = (w: Weapon) => {
  for (let i = w.sharpness.length - 1; i >= 0; i--) if (w.sharpness[i] > 0) return i;
  return -1;
};
const RANK_LABEL = { lr: "LR", hr: "HR", gr: "G" };
const Rank = ({ rank }: { rank: Weapon["rank"] }) => (
  <span className={`rank-tag ${rank}`}>{RANK_LABEL[rank]}</span>
);
const ELEMENT_CLASS: Record<string, string> = {
  Fire: "fire",
  Water: "water",
  Thunder: "thunder",
  Ice: "ice",
  Dragon: "dragon",
  Poison: "poison",
  Paralysis: "paralysis",
  Sleep: "sleep",
};
function Elements({ weapon, values = false }: { weapon: Weapon; values?: boolean }) {
  if (!weapon.elements.length) return null;
  return (
    <span className="elements">
      {weapon.elements.map(([name, attack]) => (
        <span
          key={name}
          className={`elem-tag ${ELEMENT_CLASS[name] ?? ""}`}
          title={`${name} ${attack}`}
        >
          {name}{values ? ` ${attack}` : ""}
        </span>
      ))}
    </span>
  );
}

function Sharpness({ values, label }: { values: number[]; label: string }) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="sharp">
      <span className="dim small">{label}</span>
      <div className="sharp-bar">
        {values.map((v, i) => v > 0 ? (
          <span
            key={i}
            title={`${SHARP_NAMES[i] ?? i}: ${v}`}
            style={{ width: `${(v / total) * 100}%`, background: SHARP_COLORS[i] ?? "#555" }}
          />
        ) : null)}
      </div>
    </div>
  );
}

function Tree({
  weapons,
  onSelect,
  query,
}: {
  weapons: Weapon[];
  onSelect: (w: Weapon) => void;
  query: string;
}) {
  const names = new Set(weapons.map((w) => w.name));
  const q = query.trim().toLowerCase();
  const children = new Map<string, Weapon[]>();
  for (const w of weapons) {
    for (const p of w.improveFrom) {
      if (!names.has(p)) continue;
      const list = children.get(p) ?? [];
      list.push(w);
      children.set(p, list);
    }
  }
  const roots = weapons.filter((w) => !w.improveFrom.some((p) => names.has(p)));
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const isOpen = (name: string) => manual[name] ?? true;

  const toggle = (name: string, open: boolean) => {
    setManual((prev) => ({ ...prev, [name]: open }));
  };

  const render = (w: Weapon): React.ReactNode => (
    <details
      key={w.name}
      className={q && w.name.toLowerCase().includes(q) ? "match" : ""}
      open={isOpen(w.name)}
      onToggle={(e) => toggle(w.name, e.currentTarget.open)}
    >
      <summary>
        <Rank rank={w.rank} />
        <button
          className="link"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(w); }}
        >
          {w.name}
        </button>
        <Elements weapon={w} />
        <span className="dim small"> · {w.attack} atk · r{w.rarity}</span>
      </summary>
      {(children.get(w.name) ?? []).map((c) => render(c))}
    </details>
  );
  if (!roots.length) return <p className="dim">No tree roots.</p>;
  return <div className="tree">{roots.map((w) => render(w))}</div>;
}

function Detail({ weapon, onSelect }: { weapon: Weapon; onSelect: (w: Weapon) => void }) {
  const chain: Weapon[] = [];
  let cur = weapon;
  while (cur.improveFrom.length) {
    const parent = WEAPON_BY_NAME.get(cur.improveFrom[0]);
    if (!parent || chain.includes(parent)) break;
    chain.unshift(parent);
    cur = parent;
  }
  return (
    <div className="weapon-detail">
      <h3>{weapon.name}</h3>
      <p className="dim small"><Rank rank={weapon.rank} /> {TYPE_LABEL[weapon.type]} · rarity {weapon.rarity}</p>
      <div className="stat-row">
        <span><strong>{weapon.attack}</strong> attack</span>
        <span><strong>{weapon.affinity > 0 ? "+" : ""}{weapon.affinity}%</strong> affinity</span>
        <span><strong>{weapon.slots}</strong> slots</span>
      </div>
      {weapon.elements.length > 0 && (
        <p className="elements-line"><Elements weapon={weapon} values /></p>
      )}
      {weapon.bonus && <p className="dim">Bonus: {weapon.bonus}</p>}
      {weapon.sharpness.length > 0 && <Sharpness values={weapon.sharpness} label="Sharpness" />}
      {weapon.sharpnessPlus.length > 0 && <Sharpness values={weapon.sharpnessPlus} label="Sharpness +1" />}

      {chain.length > 0 && (
        <p className="small">
          Path: {chain.map((w) => <button key={w.name} className="link" onClick={() => onSelect(w)}>{w.name}</button>).reduce((a, b) => <>{a} → {b}</>)}
        </p>
      )}

      <div className="two-col">
        <div>
          <h4>Create</h4>
          <p className="dim small">{weapon.createCost.toLocaleString()}z</p>
          <div className="mats">{weapon.createMats.map(([m, n]) => <span key={m}>{m} ×{n}</span>)}</div>
        </div>
        <div>
          <h4>Improve</h4>
          <p className="dim small">{weapon.improveCost.toLocaleString()}z</p>
          <div className="mats">{weapon.improveMats.map(([m, n]) => <span key={m}>{m} ×{n}</span>)}</div>
        </div>
      </div>

      {weapon.improveTo.length > 0 && (
        <div>
          <h4>Upgrades to</h4>
          <div className="chips">
            {weapon.improveTo.map((name) => {
              const next = WEAPON_BY_NAME.get(name);
              return next
                ? <button key={name} className="chip link" onClick={() => onSelect(next)}>{name}</button>
                : <span key={name} className="dim">{name} (other tree)</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Weapons() {
  const [type, setType] = useState(WEAPON_TYPES[0]);
  const [query, setQuery] = useState("");
  const [element, setElement] = useState("any");
  const [rankFilter, setRankFilter] = useState<"all" | "lr" | "hr" | "gr">("all");
  const [minSharp, setMinSharp] = useState(0);
  const [selected, setSelected] = useState<Weapon | null>(null);

  const filterMatch = useCallback((w: Weapon) => {
    if (rankFilter !== "all" && w.rank !== rankFilter) return false;
    if (element !== "any") {
      if (element === "none") {
        if (w.elements.length) return false;
      } else if (!w.elements.some(([e]) => e.toLowerCase() === element.toLowerCase())) {
        return false;
      }
    }
    if (minSharp > 0 && maxSharp(w) < minSharp) return false;
    return true;
  }, [element, minSharp, rankFilter]);

  const q = query.trim().toLowerCase();
  const treeByType = useMemo(() => {
    const out: Record<string, { weapons: Weapon[]; matches: Weapon[] }> = {};
    for (const t of WEAPON_TYPES) {
      const base = WEAPONS.filter((w) => w.type === t);
      const matches = base.filter(filterMatch);
      if (matches.length === base.length) {
        out[t] = { weapons: base, matches };
        continue;
      }
      const visible = new Set(matches.map((w) => w.name));
      const byName = new Map(base.map((w) => [w.name, w]));
      const addAncestors = (w: Weapon) => {
        for (const p of w.improveFrom) {
          const parent = byName.get(p);
          if (parent && !visible.has(parent.name)) {
            visible.add(parent.name);
            addAncestors(parent);
          }
        }
      };
      for (const w of matches) addAncestors(w);
      out[t] = { weapons: base.filter((w) => visible.has(w.name)), matches };
    }
    return out;
  }, [filterMatch]);

  const allMatches = useMemo(
    () => q ? WEAPONS.filter((w) => filterMatch(w) && w.name.toLowerCase().includes(q)) : [],
    [q, filterMatch],
  );
  const matchingTypes = useMemo(
    () => q ? WEAPON_TYPES.filter((t) => allMatches.some((w) => w.type === t)) : [],
    [q, allMatches],
  );
  const displayTypes = q
    ? matchingTypes
    : type === "all" ? WEAPON_TYPES : [type];
  const totalFiltered = WEAPON_TYPES.reduce((n, t) => n + treeByType[t].matches.length, 0);

  useEffect(() => {
    if (!q) return;
    const el = document.querySelector(".tree details.match");
    if (el) el.scrollIntoView({ block: "center" });
  }, [q, type]);

  const pick = (w: Weapon) => {
    setSelected(w);
    setType(w.type);
  };

  return (
    <div className="weapon-layout">
      <section className="panel weapon-list">
        <div className="row wrap">
          <select value={type} onChange={(e) => { setType(e.target.value); setSelected(null); }}>
            <option value="all">All types</option>
            {WEAPON_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          <select value={rankFilter} onChange={(e) => setRankFilter(e.target.value as "all" | "lr" | "hr" | "gr")}>
            <option value="all">Any rank</option>
            <option value="lr">Low rank</option>
            <option value="hr">High rank</option>
            <option value="gr">G rank</option>
          </select>
          <select value={element} onChange={(e) => setElement(e.target.value)}>
            <option value="any">Any element</option>
            {ELEMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
            <option value="none">No element</option>
          </select>
          <select value={minSharp} onChange={(e) => setMinSharp(Number(e.target.value))}>
            <option value={0}>Any sharpness</option>
            <option value={3}>Green+</option>
            <option value={4}>Blue+</option>
            <option value={5}>White+</option>
            <option value={6}>Purple+</option>
          </select>
        </div>
        <div className="row">
          <input placeholder="Search weapon…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <p className="dim small">
          {q
            ? `${allMatches.length} matches across ${matchingTypes.length} types`
            : `${type === "all" ? totalFiltered : treeByType[type].matches.length} weapons`}
          {" · "}rank from rarity: LR 1–3 / HR 4–7 / G 8–10
        </p>
        <div className="scroll">
          {displayTypes.length ? displayTypes.map((t) => {
            const tree = treeByType[t];
            if (!tree.weapons.length) return null;
            const count = q ? allMatches.filter((w) => w.type === t).length : tree.matches.length;
            return (
              <section key={t} className="weapon-type-section">
                <h4>{TYPE_LABEL[t]} <span className="dim small">{count}</span></h4>
                <Tree key={`${t}-${q}`} weapons={tree.weapons} onSelect={setSelected} query={query} />
              </section>
            );
          }) : (
            <p className="dim">No weapons match those filters.</p>
          )}
        </div>
      </section>
      <section className="panel weapon-info">
        {selected ? <Detail weapon={selected} onSelect={pick} /> : <p className="empty">Pick a weapon from the tree.</p>}
      </section>
    </div>
  );
}
