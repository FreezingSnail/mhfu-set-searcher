import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../lib/gameContext";
import type { Charm, RankFilter, SolverInput, SolverResult } from "../lib/types";
import type { GameData } from "../lib/games";
import { GROUP_ORDER } from "../lib/skillOrder";
import { sortSets } from "../lib/sort";
import { RANK_FILTERS } from "../lib/ranks";
import { RESULT_CAP } from "../lib/constants";
import PieceDetail, { type DetailItem } from "./PieceDetail";

type Target = { ability: string; points: number } | null;
type Reply = {
  id: number;
  batch?: SolverResult[];
  done?: boolean;
  results?: SolverResult[];
  nodes?: number;
  elapsed?: number;
  truncated?: boolean;
  timedOut?: boolean;
  error?: string;
};

type ExtraSkill = { ability: string; points: number; name: string };
type ExtensionGroup = {
  key: string;
  skills: ExtraSkill[];
  sets: SolverResult[];
  rank: number;
  group: string;
};

const clock = () => performance.now();
const rankOf = (data: GameData, ability: string) =>
  data.skillRank(ability, data.skillTree.get(ability)?.tags ?? []);

const EMPTY: Target[] = [null, null, null, null, null];

function SetCard({
  result,
  onOpen,
  onSave,
  onDetail,
}: {
  result: SolverResult;
  onOpen: (r: SolverResult) => void;
  onSave: (r: SolverResult) => void;
  onDetail: (item: DetailItem) => void;
}) {
  const { data } = useGame();
  const armor = [...result.armor].sort(
    (a, b) => data.parts.indexOf(a.part) - data.parts.indexOf(b.part),
  );
  return (
    <article className="set-card">
      <div className="set-head">
        <div>
          <strong>{result.defense} def</strong>
          <span className="dim"> · {result.spare} slots free · {result.cost.toLocaleString()}z</span>
        </div>
        <div className="row">
          <button className="ghost" onClick={() => onSave(result)}>Save set</button>
          <button className="ghost" onClick={() => onOpen(result)}>Open in builder</button>
        </div>
      </div>
      <div className="pieces">
        {armor.map((a) => (
          <button key={a.part} className="piece piece-btn" onClick={() => onDetail({ kind: "armor", data: a })}>
            <span className="slot-tag">{data.partLabel[a.part]}</span>
            <span>{a.name}</span>
            <span className="dim">{a.defense} def · {a.slots ? "O".repeat(a.slots) : "—"}</span>
          </button>
        ))}
      </div>
      {result.charm && (
        <div className="deco-line">
          <span className="slot-tag">Charm</span>
          <span className="chips">
            <span className="chip">{result.charm.name}</span>
          </span>
        </div>
      )}
      <div className="deco-line">
        <span className="slot-tag">Jewels ({result.decos.length})</span>
        {result.decos.length ? (
          <span className="chips">
            {result.decos.map((d, i) => (
              <button key={`${d.id}-${i}`} className="chip link" onClick={() => onDetail({ kind: "deco", data: d })}>
                {d.name}
              </button>
            ))}
          </span>
        ) : <span className="dim">none</span>}
      </div>
      <div className="badges">
        {result.active.map((s) => (
          <span key={s.ability} className={"badge " + (result.extra.some((e) => e.ability === s.ability) ? "extra" : "")}>
            {s.name} <span className="dim">({s.points})</span>
          </span>
        ))}
      </div>
      <div className="res-line dim">
        {Object.entries(result.res).map(([k, v]) => `${data.resLabel[k]} ${v >= 0 ? "+" : ""}${v}`).join("  ·  ")}
      </div>
      <details>
        <summary>Materials</summary>
        <div className="mats">
          {result.mats.map(([m, n]) => <span key={m}>{m} ×{n}</span>)}
        </div>
      </details>
    </article>
  );
}

export default function Solver({
  charms,
  onOpen,
  onSave,
}: {
  charms: Charm[];
  onOpen: (r: SolverResult) => void;
  onSave: (r: SolverResult) => void;
}) {
  const { game, data } = useGame();
  const [targets, setTargets] = useState<Target[]>(EMPTY);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [hunter, setHunter] = useState<"blade" | "gunner">("blade");
  const [rank, setRank] = useState<RankFilter>("all");
  const [weaponSlots, setWeaponSlots] = useState(0);
  const [sort, setSort] = useState<"defense" | "defenseLow" | "jewels" | "spare" | "cost">("defense");
  const [hr, setHr] = useState(data.maxHub);
  const [elder, setElder] = useState(data.maxVillage);
  const [allowBad, setAllowBad] = useState(false);
  const [allowPiercings, setAllowPiercings] = useState(false);
  const [charmMode, setCharmMode] = useState<"none" | "owned" | "best" | "slots">(
    data.charmSupport ? "owned" : "none",
  );
  const [charmTable, setCharmTable] = useState(0);

  const [results, setResults] = useState<SolverResult[]>([]);
  const [stats, setStats] = useState<{ nodes: number; elapsed: number; truncated: boolean; timedOut: boolean } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [detail, setDetail] = useState<DetailItem | null>(null);
  const [extended, setExtended] = useState(false);
  const [extendResults, setExtendResults] = useState<SolverResult[]>([]);
  const [extendLoading, setExtendLoading] = useState(false);
  const [tupleKey, setTupleKey] = useState<string | null>(null);
  const worker = useRef<Worker | null>(null);
  const pool = useRef<Worker[]>([]);
  const poolTimer = useRef<number | null>(null);
  const requestId = useRef(0);
  const lastInput = useRef<SolverInput | null>(null);

  useEffect(() => () => {
    worker.current?.terminate();
    pool.current.forEach((w) => w.terminate());
    if (poolTimer.current !== null) window.clearTimeout(poolTimer.current);
  }, []);

  const extensions = useMemo<ExtensionGroup[]>(() => {
    const groups = new Map<string, ExtensionGroup>();
    for (const set of (extended ? extendResults : results)) {
      const byAbility = new Map<string, ExtraSkill>();
      for (const e of set.extra.filter((s) => s.points > 0)) {
        byAbility.set(e.ability, { ability: e.ability, points: e.points, name: e.name });
      }
      const skills = [...byAbility.values()].sort((a, b) => rankOf(data, a.ability) - rankOf(data, b.ability));
      if (!skills.length) continue;
      const key = JSON.stringify(skills.map((s) => s.ability));
      const group = groups.get(key);
      if (group) group.sets.push(set);
      else {
        const primary = skills[0];
        groups.set(key, {
          key,
          skills,
          sets: [set],
          rank: rankOf(data, primary.ability),
          group: data.skillMeta(primary.ability, data.skillTree.get(primary.ability)?.tags ?? []).group,
        });
      }
    }
    return [...groups.values()].sort(
      (a, b) => a.rank - b.rank || b.sets.length - a.sets.length
        || a.skills.map((s) => s.name).join(" ").localeCompare(b.skills.map((s) => s.name).join(" ")),
    );
  }, [results, extended, extendResults, data]);
  const groupedExtensions = useMemo(
    () => GROUP_ORDER
      .map((group) => ({ group, items: extensions.filter((e) => e.group === group) }))
      .filter((g) => g.items.length),
    [extensions],
  );
  const selectedExtension = tupleKey ? extensions.find((g) => g.key === tupleKey) : null;

  const update = (i: number, next: Target) => {
    setTargets((old) => old.map((t, j) => (j === i ? next : t)));
  };

  const runWorker = (
    input: SolverInput,
    handlers: { onBatch?: (batch: SolverResult[]) => void; onFinal: (reply: Reply) => void },
    candidates?: string[],
  ) => {
    worker.current?.terminate();
    const w = new Worker(new URL("../solver.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    const id = ++requestId.current;
    w.onmessage = (event: MessageEvent<Reply>) => {
      if (event.data.id !== id) return;
      if (event.data.batch) {
        handlers.onBatch?.(event.data.batch);
        return;
      }
      w.terminate();
      if (worker.current === w) worker.current = null;
      handlers.onFinal(event.data);
    };
    w.onerror = () => {
      w.terminate();
      if (worker.current === w) worker.current = null;
      handlers.onFinal({ id, error: "Solver worker failed." });
    };
    w.postMessage({ id, game, input, candidates });
  };

  const runPool = (
    input: SolverInput,
    handlers: { onBatch: (batch: SolverResult[]) => void; onFinal: (reply: Reply) => void },
  ) => {
    worker.current?.terminate();
    worker.current = null;
    pool.current.forEach((w) => w.terminate());
    pool.current = [];
    if (poolTimer.current !== null) {
      window.clearTimeout(poolTimer.current);
      poolTimer.current = null;
    }
    const count = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 4) - 1));
    const id = ++requestId.current;
    const started = clock();
    const all: SolverResult[] = [];
    let active = count;
    let nodes = 0;
    let elapsed = 0;
    let truncated = false;
    let stopped = false;
    const cap = RESULT_CAP;

    const finish = (timedOut = false) => {
      if (stopped) return;
      stopped = true;
      if (poolTimer.current !== null) {
        window.clearTimeout(poolTimer.current);
        poolTimer.current = null;
      }
      handlers.onFinal({
        id,
        results: sortSets(all.slice(0, cap), input.sort),
        nodes,
        elapsed: Math.max(elapsed, clock() - started),
        truncated: truncated || all.length >= cap || timedOut,
        timedOut,
      });
    };

    const spawn = (index: number) => {
      const w = new Worker(new URL("../solver.worker.ts", import.meta.url), { type: "module" });
      pool.current.push(w);
      w.onmessage = (event: MessageEvent<Reply>) => {
        if (event.data.id !== id || stopped) return;
        const data = event.data;
        if (data.batch) {
          all.push(...data.batch);
          handlers.onBatch(data.batch);
          if (all.length >= cap) {
            stopped = true;
            if (poolTimer.current !== null) {
              window.clearTimeout(poolTimer.current);
              poolTimer.current = null;
            }
            pool.current.forEach((x) => x.terminate());
            pool.current = [];
            handlers.onFinal({
              id,
              results: sortSets(all.slice(0, cap), input.sort),
              nodes,
              elapsed: Math.max(elapsed, clock() - started),
              truncated: true,
              timedOut: false,
            });
          }
          return;
        }
        if (data.error) {
          truncated = true;
        } else {
          nodes += data.nodes ?? 0;
          elapsed = Math.max(elapsed, data.elapsed ?? 0);
          truncated ||= data.truncated ?? false;
        }
        active--;
        if (active === 0) finish();
      };
      w.onerror = () => {
        if (stopped) return;
        truncated = true;
        active--;
        if (active === 0) finish();
      };
      w.postMessage({ id, game, input: { ...input, shard: { index, count } } });
    };

    poolTimer.current = window.setTimeout(() => {
      if (stopped) return;
      stopped = true;
      poolTimer.current = null;
      pool.current.forEach((x) => x.terminate());
      pool.current = [];
      handlers.onFinal({
        id,
        results: sortSets(all.slice(0, cap), input.sort),
        nodes,
        elapsed: clock() - started,
        truncated: true,
        timedOut: true,
      });
    }, 3000);

    if (count === 1) spawn(0);
    else for (let i = 0; i < count; i++) spawn(i);
  };

  const runSearch = (rows: Target[]) => {
    const chosen = rows.filter((t): t is { ability: string; points: number } => !!t);
    if (!chosen.length) {
      setError("Pick at least one skill.");
      return;
    }
    const input: SolverInput = {
      skills: chosen,
      gender,
      hunter,
      rank,
      weaponSlots,
      sort,
      hr,
      elder,
      allowBad,
      allowPiercings,
      charmMode: data.charmSupport ? charmMode : "none",
      charmTable,
      charms,
    };
    lastInput.current = input;
    setError("");
    setLoading(true);
    setCancelled(false);
    setResults([]);
    setStats(null);
    setExtended(false);
    setExtendResults([]);
    setExtendLoading(false);
    setTupleKey(null);
    runPool(input, {
      onBatch: (batch) => setResults((old) => [...old, ...batch]),
      onFinal: (data) => {
        setLoading(false);
        if (data.error) {
          setError(data.error);
        } else {
          setResults(data.results ?? []);
          setStats({
            nodes: data.nodes ?? 0,
            elapsed: data.elapsed ?? 0,
            truncated: data.truncated ?? false,
            timedOut: data.timedOut ?? false,
          });
        }
      },
    });
  };

  const search = () => runSearch(targets);

  const addSkillToSearch = (skill: ExtraSkill) => {
    if (targets.some((t) => t?.ability === skill.ability)) {
      setError(`${skill.ability} is already a target skill.`);
      return;
    }
    const slot = targets.findIndex((t) => !t);
    if (slot < 0) {
      setError("All 5 skill slots are used. Clear one first.");
      return;
    }
    const threshold = data.skillTree.get(skill.ability)?.tiers.find((t) => t.name === skill.name)?.points ?? skill.points;
    const next = targets.map((t, i) => (i === slot ? { ability: skill.ability, points: threshold } : t));
    setTargets(next);
    setError("");
    runSearch(next);
  };

  const extend = () => {
    if (!lastInput.current || loading) return;
    if (extendResults.length) {
      setExtended(true);
      setTupleKey(null);
      return;
    }
    const target = new Set(lastInput.current.skills.map((s) => s.ability));
    const weight = new Map<string, number>();
    for (const r of results) {
      for (const a of r.armor) {
        for (const [s, p] of a.skills) {
          if (!target.has(s)) weight.set(s, (weight.get(s) ?? 0) + Math.max(0, p));
        }
      }
      for (const [s, p] of r.charm?.skills ?? []) {
        if (!target.has(s)) weight.set(s, (weight.get(s) ?? 0) + Math.max(0, p));
      }
    }
    const candidates = [...weight.entries()]
      .sort((a, b) => rankOf(data, a[0]) - rankOf(data, b[0]) || b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([s]) => s);
    setExtended(true);
    setTupleKey(null);
    setExtendLoading(true);
    setError("");
    runWorker(
      { ...lastInput.current, sort: "extras" },
      {
        onFinal: (data) => {
          setExtendLoading(false);
          if (data.error) setError(data.error);
          else setExtendResults(data.results ?? []);
        },
      },
      candidates,
    );
  };

  const cancel = () => {
    worker.current?.terminate();
    worker.current = null;
    pool.current.forEach((w) => w.terminate());
    pool.current = [];
    if (poolTimer.current !== null) {
      window.clearTimeout(poolTimer.current);
      poolTimer.current = null;
    }
    setLoading(false);
    setCancelled(true);
  };

  const clear = () => {
    worker.current?.terminate();
    worker.current = null;
    pool.current.forEach((w) => w.terminate());
    pool.current = [];
    if (poolTimer.current !== null) {
      window.clearTimeout(poolTimer.current);
      poolTimer.current = null;
    }
    setTargets(EMPTY);
    setResults([]);
    setStats(null);
    setError("");
    setCancelled(false);
    setExtended(false);
    setExtendResults([]);
    setExtendLoading(false);
    setTupleKey(null);
    lastInput.current = null;
  };

  return (
    <div className="stack">
      <section className="panel">
        <div className="row wrap">
          <label>Type
            <select value={hunter} onChange={(e) => setHunter(e.target.value as "blade" | "gunner")}>
              <option value="blade">Blademaster</option>
              <option value="gunner">Gunner</option>
            </select>
          </label>
          <label>Gender
            <select value={gender} onChange={(e) => setGender(e.target.value as "male" | "female")}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label>Armor rank
            <select value={rank} onChange={(e) => setRank(e.target.value as RankFilter)}>
              {RANK_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </label>
          <label>Weapon slots
            <select value={weaponSlots} onChange={(e) => setWeaponSlots(Number(e.target.value))}>
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          {data.charmSupport && (
            <label>Charms
              <select value={charmMode} onChange={(e) => setCharmMode(e.target.value as "none" | "owned" | "best" | "slots")}>
                <option value="none">No charm</option>
                <option value="owned">My charms ({charms.length})</option>
                <option value="best">Best possible charm</option>
                <option value="slots">Slot-only charm (O / OO / OOO)</option>
              </select>
            </label>
          )}
          {data.charmSupport && charmMode === "owned" && (
            <label>{data.id === "mh4u" ? "Charm type" : "Charm table"}
              <select value={charmTable} onChange={(e) => setCharmTable(Number(e.target.value))}>
                <option value={0}>{data.id === "mh4u" ? "All types" : "All tables"}</option>
                {data.charmTables.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
          )}
          <label>Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as "defense" | "defenseLow" | "jewels" | "spare" | "cost")}>
              <option value="defense">Defense (high)</option>
              <option value="defenseLow">Defense (low)</option>
              <option value="jewels">Fewest jewels</option>
              <option value="spare">Most free slots</option>
              <option value="cost">Lowest cost</option>
            </select>
          </label>
          <label title="0 ignores this source">{data.id === "mh3u" ? "Port ★" : data.id === "mh4u" ? "Hub ★" : "HR"}
            <input type="number" min={0} max={data.maxHub} value={hr} onChange={(e) => setHr(Number(e.target.value))} />
          </label>
          <label title="0 ignores this source">{data.id === "mhfu" ? "Elder" : "Village ★"}
            <input type="number" min={0} max={data.maxVillage} value={elder} onChange={(e) => setElder(Number(e.target.value))} />
          </label>
        </div>

        <div className="skills-grid">
          {targets.map((t, i) => {
            const option = t ? data.skillOptions.find((s) => s.ability === t.ability) : null;
            return (
              <div className="skill-row" key={i}>
                <select
                  value={t?.ability ?? ""}
                  onChange={(e) => {
                    const next = data.skillOptions.find((s) => s.ability === e.target.value);
                    update(i, next ? { ability: next.ability, points: next.tiers[next.tiers.length - 1].points } : null);
                  }}
                >
                  <option value="">— skill —</option>
                  {GROUP_ORDER.map((group) => {
                    const options = data.skillOptions.filter((s) => s.group === group);
                    return options.length ? (
                      <optgroup key={group} label={group}>
                        {options.map((s) => <option key={s.ability} value={s.ability}>{s.ability}</option>)}
                      </optgroup>
                    ) : null;
                  })}
                </select>
                <select
                  value={t?.points ?? ""}
                  disabled={!option}
                  onChange={(e) => t && update(i, { ...t, points: Number(e.target.value) })}
                >
                  {option?.tiers.map((tier) => (
                    <option key={tier.points} value={tier.points}>{tier.points} · {tier.name}</option>
                  ))}
                </select>
                <button className="icon" title="Clear" onClick={() => update(i, null)}>×</button>
              </div>
            );
          })}
        </div>

        <div className="row wrap">
          <label className="check"><input type="checkbox" checked={allowBad} onChange={(e) => setAllowBad(e.target.checked)} /> Allow bad skills</label>
          {data.id === "mhfu" && (
            <label className="check"><input type="checkbox" checked={allowPiercings} onChange={(e) => setAllowPiercings(e.target.checked)} /> Piercings</label>
          )}
          <button className="primary" onClick={search}>{loading ? "Restart search" : "Search sets"}</button>
          {loading && <button className="ghost" onClick={cancel}>Cancel</button>}
          <button className="ghost" onClick={clear}>Clear</button>
        </div>
        {data.charmSupport && charmMode === "owned" && charms.length === 0 && (
          <p className="dim small">No owned charms yet. Add them in the Charms tab, or use “Best table charm”.</p>
        )}
        {error && <p className="error">{error}</p>}
        {loading && <p className="dim small">{results.length} sets loaded… searching</p>}
        {cancelled && <p className="dim small">Search cancelled. Partial results shown.</p>}
        {stats && !loading && (
          <p className="dim small">
            {results.length} sets · {stats.nodes ? `${stats.nodes.toLocaleString()} nodes · ` : ""}
            {Math.round(stats.elapsed)} ms
            {stats.timedOut ? " · 3s cap" : stats.truncated ? " · 500-result cap" : " · complete"}
          </p>
        )}
      </section>

      <section className="results">
        {results.length > 0 && (
          <div className="extend-bar">
            <button
              className="ghost"
              disabled={extendLoading || loading}
              onClick={() => {
                if (extended) {
                  setExtended(false);
                  setTupleKey(null);
                } else {
                  extend();
                }
              }}
            >
              {extended ? "← Back to sets" : extendLoading ? "Extending…" : "Extend search"}
            </button>
            {extended && (
              <span className="dim small">
                {extendLoading
                  ? "Searching for sets with extra skills…"
                  : `Extra active skills across ${extendResults.length} sets. Click a tuple to see its sets.`}
              </span>
            )}
          </div>
        )}

        {extended ? (
          selectedExtension ? (
            <>
              <div className="extend-selected">
                <button className="ghost" onClick={() => setTupleKey(null)}>← All tuples</button>
                <div>
                  <strong>{selectedExtension.skills.map((s) => s.name).join(" + ")}</strong>
                  <div className="extend-skills">
                    <span className="dim small">Add to search:</span>
                    {selectedExtension.skills.map((s) => (
                      <button
                        key={s.ability}
                        className="chip link"
                        title={`Search for ${s.ability} ${s.points}+`}
                        onClick={() => addSkillToSearch(s)}
                      >
                        + {s.name}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="dim small">{selectedExtension.sets.length} sets</span>
              </div>
              {selectedExtension.sets.map((r, i) => (
                <SetCard key={i} result={r} onOpen={onOpen} onSave={onSave} onDetail={setDetail} />
              ))}
            </>
          ) : groupedExtensions.length ? (
            <div className="extend-sections">
              {groupedExtensions.map(({ group, items }) => (
                <section key={group} className="extend-section">
                  <h4>{group} <span className="dim small">{items.length}</span></h4>
                  <div className="extend-grid">
                    {items.map((g) => (
                      <button key={g.key} className="extend-tuple" onClick={() => setTupleKey(g.key)}>
                        <span>{g.skills.map((s) => s.name).join(" + ")}</span>
                        <span className="dim small">{g.sets.length} set{g.sets.length > 1 ? "s" : ""}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="empty">{extendLoading ? "Searching…" : "No extra skills found."}</p>
          )
        ) : (
          results.map((r, i) => <SetCard key={i} result={r} onOpen={onOpen} onSave={onSave} onDetail={setDetail} />)
        )}

        {!loading && !results.length && !error && (
          stats
            ? <p className="empty">No sets found. Relax the targets, raise HR/elder, or allow bad skills.</p>
            : <p className="empty">Pick target skills and search. Results include jewels and spare slots.</p>
        )}
      </section>
      <PieceDetail item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
