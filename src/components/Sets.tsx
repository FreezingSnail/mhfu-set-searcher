import { useMemo, useState } from "react";
import { PARTS, PART_LABEL, RES_LABEL } from "../lib/data";
import { buildSet, selectionFromSaved, type SavedSet } from "../lib/build";

type Props = {
  saved: SavedSet[];
  onLoad: (s: SavedSet) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
};

const statRows = [
  ["Defense", (s: ReturnType<typeof buildSet>) => String(s.defense)],
  ["Slots free", (s: ReturnType<typeof buildSet>) => String(s.spare)],
  ["Cost", (s: ReturnType<typeof buildSet>) => `${s.cost.toLocaleString()}z`],
] as const;

export default function Sets({ saved, onLoad, onDelete, onRename }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const summaries = useMemo(
    () => new Map(saved.map((s) => [s.id, buildSet(selectionFromSaved(s))])),
    [saved],
  );
  const selectedSets = saved.filter((s) => selected.includes(s.id)).slice(0, 4);
  const compared = selectedSets.map((s) => ({ set: s, data: summaries.get(s.id)! }));

  const toggle = (id: string) => {
    setSelected((old) => old.includes(id)
      ? old.filter((x) => x !== id)
      : old.length >= 4 ? old : [...old, id]);
  };

  const skillRows = useMemo(() => {
    if (compared.length < 2) return [];
    const names = [...new Set(compared.flatMap((c) => c.data.active.map((a) => a.ability)))].sort();
    return names.map((ability) => ({
      ability,
      cells: compared.map((c) => c.data.active.find((a) => a.ability === ability) ?? null),
    }));
  }, [compared]);

  return (
    <div className="stack">
      <section className="panel">
        <div className="row wrap">
          <strong>Saved sets</strong>
          <span className="dim small">{saved.length} saved · select 2–4 to compare</span>
        </div>
        {saved.length ? (
          <div className="saved-list">
            {saved.map((set) => {
              const data = summaries.get(set.id)!;
              const isSelected = selected.includes(set.id);
              return (
                <div key={set.id} className={"saved-row " + (isSelected ? "picked" : "")}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!isSelected && selected.length >= 4}
                    onChange={() => toggle(set.id)}
                  />
                  <button className="link" onClick={() => onLoad(set)}>{set.name}</button>
                  <span className="dim small">
                    {data.defense} def · {data.active.map((a) => a.name).join(", ") || "no skills"} · {data.spare} slots
                  </span>
                  <div className="row">
                    <button className="ghost" onClick={() => onLoad(set)}>Open</button>
                    <button className="ghost" onClick={() => {
                      const name = window.prompt("Rename set", set.name);
                      if (name) onRename(set.id, name);
                    }}>Rename</button>
                    <button className="icon" onClick={() => {
                      if (window.confirm(`Delete "${set.name}"?`)) onDelete(set.id);
                    }}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty">No saved sets yet. Save from the Solver or Builder.</p>
        )}
        {selected.length === 1 && <p className="dim small">Select one more set to compare.</p>}
      </section>

      {compared.length >= 2 && (
        <section className="panel compare">
          <strong>Compare</strong>
          <div className="compare-wrap">
            <table className="compare-table">
              <thead>
                <tr>
                  <th />
                  {compared.map((c) => <th key={c.set.id}>{c.set.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {statRows.map(([label, get]) => (
                  <tr key={label}>
                    <th>{label}</th>
                    {compared.map((c) => <td key={c.set.id}>{get(c.data)}</td>)}
                  </tr>
                ))}
                {PARTS.map((part) => (
                  <tr key={part}>
                    <th>{PART_LABEL[part]}</th>
                    {compared.map((c) => <td key={c.set.id}>{c.data.armor.find((a) => a.part === part)?.name ?? "—"}</td>)}
                  </tr>
                ))}
                <tr>
                  <th>Jewels</th>
                  {compared.map((c) => (
                    <td key={c.set.id}>{c.data.decos.length ? c.data.decos.map((d) => d.name).join(", ") : "—"}</td>
                  ))}
                </tr>
                {(["fire", "water", "thunder", "ice", "dragon"] as const).map((k) => (
                  <tr key={k}>
                    <th>{RES_LABEL[k]}</th>
                    {compared.map((c) => {
                      const v = c.data.res[k];
                      return <td key={c.set.id}>{v >= 0 ? "+" : ""}{v}</td>;
                    })}
                  </tr>
                ))}
                <tr className="compare-sep"><th colSpan={compared.length + 1}>Skills</th></tr>
                {skillRows.map(({ ability, cells }) => {
                  const values = cells.map((c) => c?.name ?? "—");
                  const differs = new Set(values).size > 1;
                  return (
                    <tr key={ability} className={differs ? "diff" : ""}>
                      <th>{ability}</th>
                      {compared.map((c, i) => <td key={c.set.id}>{values[i]}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
