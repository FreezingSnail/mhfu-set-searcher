import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useGame } from "../lib/gameContext";
import type { AmmoGroup, Weapon } from "../lib/types";

const SHARP_COLORS = ["#c0392b", "#d35400", "#d4ac0d", "#27ae60", "#2980b9", "#ecf0f1", "#8e44ad"];
const SHARP_NAMES = ["Red", "Orange", "Yellow", "Green", "Blue", "White", "Purple"];
const ELEMENTS = ["Fire", "Water", "Thunder", "Ice", "Dragon", "Poison", "Paralysis", "Sleep", "Slime", "Blast"];
const GUN_TYPES = new Set(["light-bowgun", "heavy-bowgun"]);
const AMMO_GROUPS: { key: AmmoGroup; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "status", label: "Status" },
  { key: "element", label: "Element" },
  { key: "misc", label: "Misc" },
];
/* Physical ammo types offered by the ammo filter. */
const PHYSICAL_AMMO = ["Normal S", "Pierce S", "Pellet S", "Crag S", "Clust S"];
const isPhysicalAmmo = (value: string) => PHYSICAL_AMMO.includes(value);
const ammoBase = (name: string) => name.replace(/\s*Lv\d+$/i, "");
const shotBase = (name: string) => name.replace(/\s*L\d+$/i, "");
/* Element/status ammo -> the element filter value it satisfies. */
const AMMO_ELEMENT: Record<string, string> = {
  "Flame S": "Fire",
  "Flaming S": "Fire",
  "Water S": "Water",
  "Thunder S": "Thunder",
  "Freeze S": "Ice",
  "Dragon S": "Dragon",
  "Poison S": "Poison",
  "Paralysis S": "Paralysis",
  "Sleep S": "Sleep",
  "Blast S": "Blast",
};
const maxSharp = (w: Weapon) => {
  for (let i = w.sharpness.length - 1; i >= 0; i--) if (w.sharpness[i] > 0) return i;
  return -1;
};
const isBowgun = (w: Weapon) => GUN_TYPES.has(w.type);
const supportsAmmo = (w: Weapon, predicate: (ammo: NonNullable<Weapon["ammo"]>[number]) => boolean) =>
  (w.ammo ?? []).some((ammo) => ammo.caps.some((cap) => cap > 0) && predicate(ammo));
const rapidFiresElement = (w: Weapon, element: string) =>
  (w.rapidFire ?? []).some((rapid) => AMMO_ELEMENT[rapid.replace(/\s+Lv\d+$/i, "")] === element);
const prettyCase = (s?: string | null) =>
  s ? s.replace(/([a-z])([A-Z])/g, "$1 $2") : "—";
const bonusLabel = (bonus: string) =>
  /^\+?\d+$/.test(bonus) ? `Defense ${bonus.startsWith("+") ? bonus : `+${bonus}`}` : `Bonus: ${bonus}`;
const matchesWord = (text: string, word: string) =>
  word.length === 1 ? text.split(" ").includes(word) : text.includes(word);

/* Full text index so ammo, coatings, recoil, reload and charge levels are searchable. */
function weaponSearchText(w: Weapon, typeLabel: Record<string, string>) {
  const parts: (string | null | undefined)[] = [
    w.name,
    typeLabel[w.type],
    w.rank === "lr" ? "low rank" : w.rank === "hr" ? "high rank" : "g rank",
    `rarity ${w.rarity}`,
    `attack ${w.attack}`,
    `affinity ${w.affinity}`,
    `slots ${w.slots}`,
    ...w.elements.flatMap(([name, attack]) => [name, `${name} ${attack}`]),
  ];
  for (const ammo of w.ammo ?? []) {
    if (!ammo.caps.some((cap) => cap > 0)) continue;
    parts.push(ammo.name, `${ammo.name} ammo`, `${ammo.group} ammo`);
    const element = AMMO_ELEMENT[ammo.name];
    if (element) parts.push(element, `${element} ammo`);
    ammo.caps.forEach((cap, i) => {
      if (cap > 0) parts.push(`${ammo.name} lv${i + 1}`, `${ammo.name} level ${i + 1}`, `${ammo.name} x${cap}`);
    });
  }
  if (w.recoil) parts.push(`recoil ${w.recoil}`, `recoil ${prettyCase(w.recoil)}`);
  if (w.reload) parts.push(`reload ${w.reload}`, `reload ${prettyCase(w.reload)}`);
  if (w.rapidFire?.length) parts.push("rapid fire", "rf", ...w.rapidFire);
  for (const coating of w.coatings ?? []) parts.push(coating, `${coating} coating`);
  for (const [i, shot] of (w.shots ?? []).entries()) {
    parts.push(
      `charge ${i + 1}`,
      `charge ${i + 1} ${shot.name}`,
      `${shot.name} lv${shot.level}`,
      `${shot.name} level ${shot.level}`,
    );
  }
  if (w.bonus) parts.push(`defense ${w.bonus}`);
  if (w.deviation) parts.push(`deviation ${w.deviation}`, `deviation ${prettyCase(w.deviation)}`);
  if (w.phial) parts.push(w.phial);
  if (w.kinsect) parts.push(`kinsect ${w.kinsect}`, w.kinsect);
  if (w.shell) parts.push(`shelling ${w.shell}`, w.shell);
  if (w.arc) parts.push(`arc shot ${w.arc}`, w.arc);
  if (w.awaken) parts.push("awaken", "hidden element");
  for (const ammo of w.crouch ?? []) parts.push(`crouching fire ${ammo}`, ammo);
  for (const note of w.notes ?? []) parts.push(`${note} note`, note);
  for (const song of w.songs ?? []) parts.push(song.name);
  return parts.filter(Boolean).join(" ").toLowerCase();
}
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
  Slime: "slime",
  Blast: "blast",
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
      {weapon.awaken && <span className="dim small" title="Needs Awaken skill"> (awaken)</span>}
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

function WeaponMeta({ weapon }: { weapon: Weapon }) {
  if (weapon.type === "bow") {
    const coatings = weapon.coatings ?? [];
    const charges = weapon.shots?.length ?? 0;
    return (
      <span className="dim small" title={coatings.map((c) => `${c} Coating`).join(" · ")}>
        {" · "}{weapon.arc ? `${weapon.arc} arc · ` : ""}{charges} charge{charges === 1 ? "" : "s"} · {coatings.length} coating{coatings.length === 1 ? "" : "s"}
      </span>
    );
  }
  if (weapon.phial) {
    return <span className="dim small">{" · "}{weapon.phial}</span>;
  }
  if (weapon.kinsect) {
    return <span className="dim small">{" · "}{weapon.kinsect} kinsect</span>;
  }
  if (weapon.shell) {
    return <span className="dim small">{" · "}{weapon.shell} shelling</span>;
  }
  if (weapon.notes?.length) {
    return <span className="dim small">{" · "}{weapon.notes.join(" + ")} notes</span>;
  }
  if (!isBowgun(weapon)) return null;
  const ammo = (weapon.ammo ?? []).filter((a) => a.caps.some((cap) => cap > 0)).length;
  const rapid = weapon.rapidFire?.join(" / ");
  return (
    <span
      className="dim small"
      title={[
        weapon.reload && `Reload: ${prettyCase(weapon.reload)}`,
        weapon.recoil && `Recoil: ${prettyCase(weapon.recoil)}`,
        rapid && `Rapid fire: ${rapid}`,
      ].filter(Boolean).join(" · ")}
    >
      {" · "}{prettyCase(weapon.reload)} reload · {prettyCase(weapon.recoil)} recoil · {ammo} ammo types
      {rapid && (
        <span className="rf-badge" title={`Rapid fire: ${rapid}`}>RF</span>
      )}
    </span>
  );
}

function BowgunInfo({ weapon }: { weapon: Weapon }) {
  const rapid = new Set(weapon.rapidFire ?? []);
  const groups = AMMO_GROUPS.map((group) => ({
    ...group,
    items: (weapon.ammo ?? []).filter(
      (a) => a.group === group.key && a.caps.some((cap) => cap > 0),
    ),
  })).filter((group) => group.items.length);
  return (
    <div className="gunner-info">
      <div className="stat-row gun-stats">
        <span><strong>{prettyCase(weapon.reload)}</strong> reload</span>
        <span><strong>{prettyCase(weapon.recoil)}</strong> recoil</span>
        {weapon.deviation && <span><strong>{prettyCase(weapon.deviation)}</strong> deviation</span>}
      </div>
      {weapon.rapidFire?.length ? (
        <p className="small rapid-line">
          <span className="dim">Rapid fire:</span>{" "}
          {weapon.rapidFire.map((ammo) => (
            <span className="chip rf-chip" key={ammo}>{ammo}</span>
          ))}
        </p>
      ) : (
        <p className="small dim">No rapid fire.</p>
      )}
      <h4>Ammo capacity</h4>
      <div className="ammo-groups">
        {groups.map((group) => (
          <div className="ammo-group" key={group.key}>
            <span className="ammo-group-name">{group.label}</span>
            <div className="ammo-rows">
              {group.items.map((ammo) => {
                const rapidRow = ammo.caps.some(
                  (cap, i) => cap > 0 && (rapid.has(ammo.name) || rapid.has(`${ammo.name} Lv${i + 1}`)),
                );
                return (
                  <div className={`ammo-row${rapidRow ? " rapid" : ""}`} key={ammo.name}>
                    <span>{ammo.name}</span>
                    <span className="ammo-caps">
                      {ammo.caps.map((cap, i) => cap > 0 ? (
                        <span
                          className={`ammo-cap${rapid.has(ammo.name) || rapid.has(`${ammo.name} Lv${i + 1}`) ? " rapid" : ""}`}
                          key={i}
                          title={rapid.has(ammo.name) || rapid.has(`${ammo.name} Lv${i + 1}`) ? "Rapid fire" : undefined}
                        >
                          {/Lv\d/.test(ammo.name) ? `×${cap}` : `Lv${i + 1} ×${cap}`}
                        </span>
                      ) : null)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {weapon.crouch?.length ? (
        <>
          <h4>Crouching fire</h4>
          <div className="chips">
            {weapon.crouch.map((ammo) => <span className="chip" key={ammo}>{ammo}</span>)}
          </div>
        </>
      ) : null}
    </div>
  );
}

function BowInfo({ weapon }: { weapon: Weapon }) {
  const coatings = weapon.coatings ?? [];
  const shots = weapon.shots ?? [];
  return (
    <div className="gunner-info">
      {weapon.arc && <p className="small"><span className="dim">Arc shot:</span> <strong>{weapon.arc}</strong></p>}
      <h4>Coatings</h4>
      {coatings.length ? (
        <div className="chips">
          {coatings.map((coating) => (
            <span className="chip" key={coating}>{coating} Coating</span>
          ))}
        </div>
      ) : <p className="dim small">No coatings.</p>}
      <h4>Charge levels</h4>
      {shots.length ? (
        <div className="charge-rows">
          {shots.map((shot, i) => (
            <div className="charge-row" key={i}>
              <span className="dim small">Charge {i + 1}</span>
              <span className={`chip shot-${shot.name.toLowerCase()}`}>{shot.name} Lv{shot.level}</span>
            </div>
          ))}
        </div>
      ) : <p className="dim small">No charge data.</p>}
    </div>
  );
}

function Tree({
  weapons,
  onSelect,
  matches,
}: {
  weapons: Weapon[];
  onSelect: (w: Weapon) => void;
  matches: Set<string>;
}) {
  const { data } = useGame();
  const names = new Set(weapons.map((w) => w.name));
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

  const crossParents = (w: Weapon) =>
    w.improveFrom
      .map((name) => data.weaponByName.get(name))
      .filter((p): p is Weapon => !!p && p.type !== w.type);

  const render = (w: Weapon): React.ReactNode => {
    const cross = crossParents(w);
    return (
      <Fragment key={w.name}>
        {cross.length > 0 && (
          <div className="tree-cross">
            <span>↳ from</span>
            {cross.map((p) => (
              <button key={p.name} className="link" onClick={() => onSelect(p)}>{p.name}</button>
            ))}
            <span className="dim">({data.typeLabel[cross[0].type]})</span>
          </div>
        )}
        <details
          className={matches.has(w.name) ? "match" : ""}
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
            <WeaponMeta weapon={w} />
          </summary>
          {(children.get(w.name) ?? []).map((c) => render(c))}
        </details>
      </Fragment>
    );
  };
  if (!roots.length) return <p className="dim">No tree roots.</p>;
  return <div className="tree">{roots.map((w) => render(w))}</div>;
}

function Detail({ weapon, onSelect }: { weapon: Weapon; onSelect: (w: Weapon) => void }) {
  const { data } = useGame();
  const chain: Weapon[] = [];
  let cur = weapon;
  while (cur.improveFrom.length) {
    const parent = data.weaponByName.get(cur.improveFrom[0]);
    if (!parent || chain.includes(parent)) break;
    chain.unshift(parent);
    cur = parent;
  }
  return (
    <div className="weapon-detail">
      <h3>{weapon.name}</h3>
      <p className="dim small"><Rank rank={weapon.rank} /> {data.typeLabel[weapon.type]} · rarity {weapon.rarity}</p>
      <div className="stat-row">
        <span><strong>{weapon.attack}</strong> attack</span>
        <span><strong>{weapon.affinity > 0 ? "+" : ""}{weapon.affinity}%</strong> affinity</span>
        <span><strong>{weapon.slots}</strong> slots</span>
      </div>
      {weapon.elements.length > 0 && (
        <p className="elements-line"><Elements weapon={weapon} values /></p>
      )}
      {weapon.bonus && <p className="dim">{bonusLabel(weapon.bonus)}</p>}
      {weapon.phial && <p className="small"><span className="dim">Phial:</span> <strong>{weapon.phial}</strong></p>}
      {weapon.kinsect && <p className="small"><span className="dim">Kinsect:</span> <strong>{weapon.kinsect}</strong></p>}
      {weapon.shell && <p className="small"><span className="dim">Shelling:</span> <strong>{weapon.shell}</strong></p>}
      {weapon.notes?.length ? (
        <div>
          <h4>Hunting Horn notes</h4>
          <div className="chips">{weapon.notes.map((n) => <span className="chip" key={n}>{n}</span>)}</div>
          <h4>Songs</h4>
          <div className="song-list">
            {weapon.songs?.map((song) => (
              <div className="song-row" key={song.name}>
                <span>{song.name}</span>
                <span className="dim small">{song.notes.map((i) => weapon.notes?.[i] ?? "?").join(" · ")}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {isBowgun(weapon) && <BowgunInfo weapon={weapon} />}
      {weapon.type === "bow" && <BowInfo weapon={weapon} />}
      {weapon.sharpness.length > 0 && <Sharpness values={weapon.sharpness} label="Sharpness" />}
      {weapon.sharpnessPlus.length > 0 && <Sharpness values={weapon.sharpnessPlus} label="Sharpness +1" />}

      {chain.length > 0 && (
        <p className="small">
          Path: {chain.map((w) => <button key={w.name} className="link" onClick={() => onSelect(w)}>{w.name}</button>).reduce((a, b) => <>{a} → {b}</>)} → <span>{weapon.name}</span>
        </p>
      )}

      <div className="two-col">
        <div>
          <h4>Create</h4>
          <p className="dim small">{weapon.createCost ? `${weapon.createCost.toLocaleString()}z` : "—"}</p>
          <div className="mats">{weapon.createMats.length ? weapon.createMats.map(([m, n]) => <span key={m}>{m} ×{n}</span>) : <span className="dim">—</span>}</div>
        </div>
        <div>
          <h4>Improve</h4>
          <p className="dim small">{weapon.improveCost ? `${weapon.improveCost.toLocaleString()}z` : "—"}</p>
          <div className="mats">{weapon.improveMats.length ? weapon.improveMats.map(([m, n]) => <span key={m}>{m} ×{n}</span>) : <span className="dim">—</span>}</div>
        </div>
      </div>

      {weapon.improveTo.length > 0 && (
        <div>
          <h4>Upgrades to</h4>
          <div className="chips">
            {weapon.improveTo.map((name) => {
              const next = data.weaponByName.get(name);
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
  const { data } = useGame();
  const RANGED_TYPES = useMemo(() => [...data.rangedTypes], [data]);
  const BLADE_TYPES = useMemo(() => data.weaponTypes.filter((t) => !data.rangedTypes.has(t)), [data]);
  const hasRapidWeapons = useMemo(() => data.weapons.some((w) => (w.rapidFire?.length ?? 0) > 0), [data]);
  const shotNames = useMemo(
    () => [...new Set(data.weapons.flatMap((w) => (w.shots ?? []).map((s) => s.name.replace(/\s*L\d+$/, ""))))],
    [data],
  );
  const [scope, setScope] = useState<"blade" | "ranged">("blade");
  const [type, setType] = useState(data.weaponTypes[0]);
  const [query, setQuery] = useState("");
  const [ammoFilter, setAmmoFilter] = useState("any");
  const [rankFilter, setRankFilter] = useState<"all" | "lr" | "hr" | "gr">("all");
  const [minSharp, setMinSharp] = useState(0);
  const [rapidFilter, setRapidFilter] = useState<"any" | "rf" | "none">("any");
  const [shotFilter, setShotFilter] = useState("any");
  const [selected, setSelected] = useState<Weapon | null>(null);

  const scopeTypes = useMemo(
    () => scope === "ranged" ? RANGED_TYPES : BLADE_TYPES,
    [scope, RANGED_TYPES, BLADE_TYPES],
  );

  const q = query.trim().toLowerCase();
  const queryWords = useMemo(() => q.split(/\s+/).filter(Boolean), [q]);
  const searchIndex = useMemo(
    () => new Map(data.weapons.map((w) => [w.name, weaponSearchText(w, data.typeLabel)])),
    [data],
  );

  const filterMatch = useCallback((w: Weapon) => {
    if (!scopeTypes.includes(w.type)) return false;
    if (rankFilter !== "all" && w.rank !== rankFilter) return false;
    if (ammoFilter !== "any") {
      if (ammoFilter === "none") {
        if (w.elements.length) return false;
        if (supportsAmmo(w, (ammo) => !!AMMO_ELEMENT[ammoBase(ammo.name)])) return false;
      } else if (isPhysicalAmmo(ammoFilter)) {
        if (!supportsAmmo(w, (ammo) => ammoBase(ammo.name).startsWith(ammoFilter))) return false;
      } else if (
        !w.elements.some(([e]) => e.toLowerCase() === ammoFilter.toLowerCase()) &&
        !supportsAmmo(w, (ammo) => AMMO_ELEMENT[ammoBase(ammo.name)] === ammoFilter)
      ) {
        return false;
      }
    }
    if (scope === "blade" && minSharp > 0 && maxSharp(w) < minSharp) return false;
    if (rapidFilter !== "any") {
      const hasRapid = (w.rapidFire?.length ?? 0) > 0;
      if (rapidFilter === "rf" ? !hasRapid : hasRapid) return false;
      if (rapidFilter === "rf" && ammoFilter !== "any" && ammoFilter !== "none") {
        const rapidMatch = isPhysicalAmmo(ammoFilter)
          ? (w.rapidFire ?? []).some((rapid) => rapid.replace(/\s+Lv\d+$/i, "") === ammoFilter)
          : rapidFiresElement(w, ammoFilter);
        if (!rapidMatch) return false;
      }
    }
    if (shotFilter !== "any" && !(w.shots ?? []).some((shot) => shotBase(shot.name) === shotFilter)) {
      return false;
    }
    if (queryWords.length) {
      const text = searchIndex.get(w.name) ?? "";
      if (!queryWords.every((word) => matchesWord(text, word))) return false;
    }
    return true;
  }, [ammoFilter, minSharp, queryWords, rankFilter, rapidFilter, scope, scopeTypes, searchIndex, shotFilter]);

  const treeByType = useMemo(() => {
    const out: Record<string, { weapons: Weapon[]; matches: Weapon[] }> = {};
    for (const t of scopeTypes) {
      const base = data.weapons.filter((w) => w.type === t);
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
  }, [filterMatch, scopeTypes, data]);

  const allMatches = useMemo(
    () => q ? data.weapons.filter(filterMatch) : [],
    [q, filterMatch, data],
  );
  const matchingNames = useMemo(
    () => new Set(allMatches.map((w) => w.name)),
    [allMatches],
  );
  const matchingTypes = useMemo(
    () => q ? scopeTypes.filter((t) => allMatches.some((w) => w.type === t)) : [],
    [q, allMatches, scopeTypes],
  );
  const displayTypes = q
    ? matchingTypes
    : type === "all" ? scopeTypes : [type];
  const totalFiltered = scopeTypes.reduce((n, t) => n + treeByType[t].matches.length, 0);

  useEffect(() => {
    if (!q) return;
    const el = document.querySelector(".tree details.match");
    if (el) el.scrollIntoView({ block: "center" });
  }, [q, type]);

  const chooseType = (next: string) => {
    setType(next);
    setSelected(null);
    if (next === "bow") setRapidFilter("any");
    if (GUN_TYPES.has(next)) setShotFilter("any");
  };

  const switchScope = (next: "blade" | "ranged") => {
    if (next === scope) return;
    setScope(next);
    setType("all");
    setSelected(null);
    setAmmoFilter("any");
    setMinSharp(0);
    setRapidFilter("any");
    setShotFilter("any");
  };

  const pick = (w: Weapon) => {
    setSelected(w);
    setScope(RANGED_TYPES.includes(w.type) ? "ranged" : "blade");
    setType(w.type);
    if (w.type === "bow") setRapidFilter("any");
    if (GUN_TYPES.has(w.type)) setShotFilter("any");
  };

  return (
    <div className="weapon-layout">
      <section className="panel weapon-list">
        <div className="subtabs">
          <button
            type="button"
            className={scope === "blade" ? "active" : ""}
            onClick={() => switchScope("blade")}
          >
            Blademaster
          </button>
          <button
            type="button"
            className={scope === "ranged" ? "active" : ""}
            onClick={() => switchScope("ranged")}
          >
            Ranged
          </button>
        </div>
        <div className="row wrap">
          <select value={type} onChange={(e) => chooseType(e.target.value)}>
            <option value="all">{scope === "ranged" ? "All ranged" : "All blademaster"}</option>
            {scopeTypes.map((t) => <option key={t} value={t}>{data.typeLabel[t]}</option>)}
          </select>
          <select value={rankFilter} onChange={(e) => setRankFilter(e.target.value as "all" | "lr" | "hr" | "gr")}>
            <option value="all">Any rank</option>
            <option value="lr">Low rank</option>
            <option value="hr">High rank</option>
            <option value="gr">G rank</option>
          </select>
          <select value={ammoFilter} onChange={(e) => setAmmoFilter(e.target.value)}>
            <option value="any">{scope === "ranged" ? "Any element/ammo" : "Any element"}</option>
            {scope === "ranged" && (
              <optgroup label="Physical ammo">
                {PHYSICAL_AMMO.map((ammo) => <option key={ammo} value={ammo}>{ammo}</option>)}
              </optgroup>
            )}
            <optgroup label="Element / status">
              {ELEMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
            </optgroup>
            <option value="none">No element</option>
          </select>
          {scope === "ranged" && type !== "bow" && hasRapidWeapons && (
            <select
              value={rapidFilter}
              onChange={(e) => {
                const next = e.target.value as "any" | "rf" | "none";
                setRapidFilter(next);
                if (next !== "any") setShotFilter("any");
              }}
            >
              <option value="any">Any rapid fire</option>
              <option value="rf">Rapid fire</option>
              <option value="none">No rapid fire</option>
            </select>
          )}
          {scope === "ranged" && (type === "bow" || type === "all") && (
            <select
              value={shotFilter}
              onChange={(e) => {
                const next = e.target.value;
                setShotFilter(next);
                if (next !== "any") setRapidFilter("any");
              }}
            >
              <option value="any">Any shot type</option>
              {shotNames.map((shot) => (
                <option key={shot} value={shot}>{shot} shot</option>
              ))}
            </select>
          )}
          {scope === "blade" && (
            <select value={minSharp} onChange={(e) => setMinSharp(Number(e.target.value))}>
              <option value={0}>Any sharpness</option>
              <option value={3}>Green+</option>
              <option value={4}>Blue+</option>
              <option value={5}>White+</option>
              <option value={6}>Purple+</option>
            </select>
          )}
        </div>
        <div className="row">
          <input
            placeholder={scope === "ranged" ? "Search name, ammo, coating, recoil…" : "Search weapon…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="dim small">
          {q
            ? `${allMatches.length} matches across ${matchingTypes.length} types`
            : `${type === "all" ? totalFiltered : treeByType[type].matches.length} weapons`}
          {" · "}rank from rarity: {data.id === "mhfu" ? "LR 1–3 / HR 4–7 / G 8–10" : "LR 1–3 / HR 4–6 / G 7–10"}
        </p>
        <div className="scroll">
          {displayTypes.length ? displayTypes.map((t) => {
            const tree = treeByType[t];
            if (!tree.weapons.length) return null;
            const count = q ? allMatches.filter((w) => w.type === t).length : tree.matches.length;
            return (
              <section key={t} className="weapon-type-section">
                <h4>{data.typeLabel[t]} <span className="dim small">{count}</span></h4>
                <Tree key={`${t}-${q}`} weapons={tree.weapons} onSelect={setSelected} matches={matchingNames} />
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
