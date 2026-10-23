import { useMemo, useState } from "react";
import { ARMOR, DECOS, PARTS, PART_LABEL, RES_LABEL } from "../lib/data";
import { buildSet, emptySelection, type SetSelection } from "../lib/build";

type Props = {
  initial: SetSelection | null;
  onSave: (name: string, sel: SetSelection) => void;
};

export default function Builder({ initial, onSave }: Props) {
  const start = initial ?? emptySelection();
  const [picks, setPicks] = useState<Record<string, string>>(start.picks);
  const [decoIds, setDecoIds] = useState<string[]>(start.decoIds);
  const [weaponSlots, setWeaponSlots] = useState(start.weaponSlots);

  const build = useMemo(() => buildSet({ picks, decoIds, weaponSlots }), [picks, decoIds, weaponSlots]);

  const save = () => {
    const name = window.prompt("Set name", "Untitled set");
    if (!name) return;
    onSave(name, { picks, decoIds, weaponSlots });
  };

  return (
    <div className="stack">
      <section className="panel">
        <div className="row wrap">
          <label>Weapon slots
            <select value={weaponSlots} onChange={(e) => setWeaponSlots(Number(e.target.value))}>
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="primary" onClick={save}>Save set</button>
          <button className="ghost" onClick={() => { setPicks(emptySelection().picks); setDecoIds([]); setWeaponSlots(0); }}>Clear</button>
          <span className="dim small">Saved sets live in the Sets tab.</span>
        </div>
        <div className="build-parts">
          {PARTS.map((part) => (
            <label key={part} className="build-row">
              <span className="slot-tag">{PART_LABEL[part]}</span>
              <select value={picks[part]} onChange={(e) => setPicks((old) => ({ ...old, [part]: e.target.value }))}>
                <option value="">— none —</option>
                {ARMOR.filter((a) => a.part === part).map((a) => (
                  <option key={a.id} value={a.id}>{a.name} · {a.defense} def · {a.slots ? "O".repeat(a.slots) : "—"}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="row wrap">
          <strong>Jewels</strong>
          <span className={"dim " + (build.usedSlots > build.totalSlots ? "over" : "")}>
            {build.usedSlots}/{build.totalSlots} slots
          </span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setDecoIds((old) => [...old, e.target.value]);
            }}
          >
            <option value="">Add jewel…</option>
            {DECOS.map((d) => (
              <option key={d.id} value={d.id}>{d.name} · {d.slots} slot{d.slots > 1 ? "s" : ""} · {d.skills.map(([s, p]) => `${s} ${p > 0 ? "+" : ""}${p}`).join(", ")}</option>
            ))}
          </select>
          {build.usedSlots > build.totalSlots && <span className="error">Too many jewels for slots.</span>}
        </div>
        <div className="deco-list">
          {build.decos.length ? build.decos.map((d, i) => (
            <span key={`${d.id}-${i}`} className="chip">
              {d.name}
              <button className="icon" onClick={() => setDecoIds((old) => old.filter((_, j) => j !== i))}>×</button>
            </span>
          )) : <span className="dim">No jewels selected.</span>}
        </div>
      </section>

      <section className="panel summary">
        <div className="stat-row">
          <span><strong>{build.defense}</strong> defense</span>
          <span><strong>{build.spare}</strong> slots free</span>
          <span><strong>{build.cost.toLocaleString()}z</strong></span>
        </div>
        <div className="res-line dim">
          {Object.entries(build.res).map(([k, v]) => `${RES_LABEL[k]} ${v >= 0 ? "+" : ""}${v}`).join("  ·  ")}
        </div>
        <div className="badges">
          {build.active.length ? build.active.map((s) => (
            <span key={s.ability} className={"badge " + (s.points < 0 ? "bad" : "")}>
              {s.name} <span className="dim">({s.points})</span>
            </span>
          )) : <span className="dim">No active skills.</span>}
        </div>
        <details>
          <summary>Materials</summary>
          <div className="mats">
            {build.mats.length ? build.mats.map(([m, n]) => <span key={m}>{m} ×{n}</span>) : <span className="dim">None.</span>}
          </div>
        </details>
      </section>
    </div>
  );
}
