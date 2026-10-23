import { useMemo, useState } from "react";
import { useGame } from "../lib/gameContext";
import { makeCharm } from "../lib/charms";
import type { Charm } from "../lib/types";

type Props = {
  charms: Charm[];
  onChange: (charms: Charm[]) => void;
};

export default function Charms({ charms, onChange }: Props) {
  const { data } = useGame();
  const [slots, setSlots] = useState(0);
  const [table, setTable] = useState(0);
  const [skill1, setSkill1] = useState("");
  const [points1, setPoints1] = useState(0);
  const [skill2, setSkill2] = useState("");
  const [points2, setPoints2] = useState(0);
  const [filter, setFilter] = useState(0);

  const options = useMemo(
    () => data.skillOptions.map((s) => s.ability),
    [data],
  );
  const shown = useMemo(
    () => charms.filter((c) => !filter || c.table === filter),
    [charms, filter],
  );

  const addSlot = (slotCount: number) => {
    onChange([makeCharm({ slots: slotCount, table, skills: [] }), ...charms]);
  };

  const add = () => {
    const skills: [string, number][] = [];
    if (skill1 && points1) skills.push([skill1, points1]);
    if (skill2 && points2 && skill2 !== skill1) skills.push([skill2, points2]);
    if (!skills.length && !slots) return;
    const charm = makeCharm({ slots, table, skills });
    onChange([charm, ...charms]);
    setSkill1("");
    setPoints1(0);
    setSkill2("");
    setPoints2(0);
    setSlots(0);
  };

  return (
    <div className="stack">
      <section className="panel">
        <div className="row wrap">
          <strong>Add a charm</strong>
          <span className="dim small">Stored in this browser. The solver uses these when charm mode is “My charms”.</span>
        </div>
        <div className="charm-form">
          <label>Slots
            <select value={slots} onChange={(e) => setSlots(Number(e.target.value))}>
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>{data.id === "mh4u" ? "Charm type" : "Table"}
            <select value={table} onChange={(e) => setTable(Number(e.target.value))}>
              <option value={0}>Any / unknown</option>
              {data.charmTables.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label>Skill 1
            <select value={skill1} onChange={(e) => setSkill1(e.target.value)}>
              <option value="">— none —</option>
              {options.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label>Points
            <input type="number" min={-10} max={10} value={points1} onChange={(e) => setPoints1(Number(e.target.value))} />
          </label>
          <label>Skill 2
            <select value={skill2} onChange={(e) => setSkill2(e.target.value)}>
              <option value="">— none —</option>
              {options.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label>Points
            <input type="number" min={-10} max={10} value={points2} onChange={(e) => setPoints2(Number(e.target.value))} />
          </label>
          <button className="primary" onClick={add}>Add charm</button>
        </div>
        <div className="row wrap charm-quick">
          <span className="dim small">Quick add slot-only charm:</span>
          {[1, 2, 3].map((n) => (
            <button key={n} className="ghost" onClick={() => addSlot(n)}>
              {n} slot{n > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="row wrap">
          <strong>My charms ({charms.length})</strong>
          <label>{data.id === "mh4u" ? "Filter type" : "Filter table"}
            <select value={filter} onChange={(e) => setFilter(Number(e.target.value))}>
              <option value={0}>All</option>
              {data.charmTables.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          {charms.length > 0 && (
            <button className="ghost" onClick={() => onChange([])}>Clear all</button>
          )}
        </div>
        {shown.length === 0 ? (
          <p className="dim">No charms yet.</p>
        ) : (
          <div className="charm-list">
            {shown.map((c) => (
              <div key={c.id} className="charm-row">
                <span className="slot-tag">{c.slots ? "O".repeat(c.slots) : "—"}</span>
                <div className="charm-skills">
                  {c.skills.length ? c.skills.map(([a, p]) => (
                    <span key={a} className={"badge " + (p < 0 ? "bad" : "")}>{a} <span className="dim">({p > 0 ? "+" : ""}{p})</span></span>
                  )) : <span className="dim">slot charm</span>}
                </div>
                <span className="dim small">{c.table ? data.charmTables.find((t) => t.value === c.table)?.label ?? `Type ${c.table}` : data.id === "mh4u" ? "Any type" : "Any table"}</span>
                <button className="ghost" onClick={() => onChange(charms.filter((x) => x.id !== c.id))}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
