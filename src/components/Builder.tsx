import { useMemo, useState } from "react";
import { useGame } from "../lib/gameContext";
import { buildSet, emptySelection, type SetSelection } from "../lib/build";
import type { Charm, RankFilter } from "../lib/types";
import { RANK_FILTERS, rankAllowed } from "../lib/ranks";

type Props = {
  initial: SetSelection | null;
  charms: Charm[];
  onSave: (name: string, sel: SetSelection) => void;
};

export default function Builder({ initial, charms, onSave }: Props) {
  const { data } = useGame();
  const start = initial ?? emptySelection(data);
  const [picks, setPicks] = useState<Record<string, string>>(start.picks);
  const [decoIds, setDecoIds] = useState<string[]>(start.decoIds);
  const [weaponSlots, setWeaponSlots] = useState(start.weaponSlots);
  const [charmId, setCharmId] = useState(start.charmId ?? "");
  const [rank, setRank] = useState<RankFilter>("all");

  const build = useMemo(
    () => buildSet(data, { picks, decoIds, weaponSlots, charmId }, charms),
    [data, picks, decoIds, weaponSlots, charmId, charms],
  );

  const save = () => {
    const name = window.prompt("Set name", "Untitled set");
    if (!name) return;
    onSave(name, { picks, decoIds, weaponSlots, charmId });
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
          <label>Armor rank
            <select value={rank} onChange={(e) => setRank(e.target.value as RankFilter)}>
              {RANK_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>
          {data.charmSupport && (
            <label>Charm
              <select value={charmId} onChange={(e) => setCharmId(e.target.value)}>
                <option value="">— none —</option>
                {charms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.slots ? `${c.slots}-slot` : "0-slot"} · {c.skills.map(([a, p]) => `${a} ${p > 0 ? "+" : ""}${p}`).join(", ") || "no skills"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="primary" disabled={!build.valid} onClick={save}>Save set</button>
          <button
            className="ghost"
            onClick={() => {
              setPicks(emptySelection(data).picks);
              setDecoIds([]);
              setWeaponSlots(0);
              setCharmId("");
            }}
          >
            Clear
          </button>
          <span className="dim small">Saved sets live in the Sets tab.</span>
        </div>
        <div className="build-parts">
          {data.parts.map((part) => (
            <label key={part} className="build-row">
              <span className="slot-tag">{data.partLabel[part]}</span>
              <select value={picks[part] ?? ""} onChange={(e) => setPicks((old) => ({ ...old, [part]: e.target.value }))}>
                <option value="">— none —</option>
                {data.armor.filter((a) => a.part === part && (rankAllowed(a.rank, rank) || picks[part] === a.id)).map((a) => (
                  <option key={a.id} value={a.id}>{a.name} · {a.defense} def · {a.slots ? "O".repeat(a.slots) : "—"}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {build.charm && (
          <p className="dim small">
            Charm: {build.charm.name} · {build.charm.slots ? "O".repeat(build.charm.slots) : "no slots"}
          </p>
        )}
      </section>

      <section className="panel">
        <div className="row wrap">
          <strong>Jewels</strong>
          <span className={"dim " + (build.valid ? "" : "over")}>
            {build.usedSlots}/{build.totalSlots} slots
          </span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setDecoIds((old) => [...old, e.target.value]);
            }}
          >
            <option value="">Add jewel…</option>
            {data.decos.map((d) => (
              <option key={d.id} value={d.id}>{d.name} · {d.slots} slot{d.slots > 1 ? "s" : ""} · {d.skills.map(([s, p]) => `${s} ${p > 0 ? "+" : ""}${p}`).join(", ")}</option>
            ))}
          </select>
          {!build.valid && <span className="error">{build.slotError}</span>}
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
          {Object.entries(build.res).map(([k, v]) => `${data.resLabel[k]} ${v >= 0 ? "+" : ""}${v}`).join("  ·  ")}
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
