import { useMemo, useState, type ReactNode } from "react";
import { useGame } from "../lib/gameContext";
import { META_PRESETS } from "../lib/metaPresets";
import {
  DEFAULT_STRENGTH_OPTIONS,
  scoreEndTreeG,
  type SharpnessMode,
  type WeaponScore,
  median,
  percentile,
} from "../lib/weaponStrength";

const ROW_H = 21;
const LABEL_W = 250;
const CHART_W = 650;
const RIGHT_W = 80;
const TOP = 38;
const BOTTOM = 22;
const WIDTH = LABEL_W + CHART_W + RIGHT_W;
const MAX_COMPARE = 4;

const SHARP_OPTIONS: { value: SharpnessMode; label: string }[] = [
  { value: "best", label: "Sharpness +1 if better" },
  { value: "base", label: "Base sharpness" },
  { value: "plus", label: "Sharpness +1" },
];

const ATTACK_UP_OPTIONS = [
  { value: 0, label: "None" },
  { value: 10, label: "Attack Up S (+10)" },
  { value: 15, label: "Attack Up M (+15)" },
  { value: 20, label: "Attack Up L (+20)" },
];

const CRIT_EYE_OPTIONS = [
  { value: 0, label: "None" },
  { value: 10, label: "Crit Eye +1 (+10%)" },
  { value: 20, label: "Crit Eye +2 (+20%)" },
  { value: 30, label: "Crit Eye +3 (+30%)" },
];

const ELEMENT_UP_OPTIONS = [
  { value: 1, label: "None" },
  { value: 1.2, label: "Element Attack Up (1.2x)" },
];

const HH_SONG_OPTIONS = [
  { value: 1, label: "None" },
  { value: 1.15, label: "Attack Up L (1.15x)" },
  { value: 1.2, label: "Attack Up L + encore (1.2x)" },
];

const NOTE_CLASS: Record<string, string> = {
  White: "white",
  Red: "red",
  Blue: "blue",
  Green: "green",
  Yellow: "yellow",
  Purple: "purple",
  Aqua: "aqua",
  Orange: "orange",
  Cyan: "cyan",
};

type Sort = "score" | "attack" | "name";
type Limit = "all" | "25" | "10";
type Tip = { x: number; y: number; text: string };

const fmt = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

function truncate(text: string, length = 30) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function elementLabel(row: WeaponScore) {
  const parts = [...row.elementParts, ...row.statusParts].map(
    (part) => `${part.name} ${part.displayed}`,
  );
  return parts.length ? parts.join(" / ") : "—";
}

function NoteChips({ notes }: { notes?: string[] }) {
  if (!notes?.length) return <>—</>;
  return (
    <span className="note-chips">
      {notes.map((note) => (
        <span key={note} className={`note-chip ${NOTE_CLASS[note] ?? "other"}`} title={note}>
          {note.slice(0, 1)}
        </span>
      ))}
    </span>
  );
}

function axisStep(max: number) {
  if (max > 200) return 50;
  if (max > 100) return 25;
  if (max > 50) return 10;
  return 5;
}

function StrengthChart({
  rows,
  selected,
  onToggle,
}: {
  rows: WeaponScore[];
  selected: Set<string>;
  onToggle: (name: string) => void;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  if (!rows.length) return <p className="empty">No weapons match.</p>;

  const maxScore = Math.max(...rows.map((row) => row.score), 1);
  const step = axisStep(maxScore);
  const max = Math.max(step, Math.ceil(maxScore / step) * step);
  const height = TOP + rows.length * ROW_H + BOTTOM;
  const x = (score: number) => LABEL_W + (Math.max(0, score) / max) * CHART_W;
  const med = median(rows.map((row) => row.score));

  const showTip = (event: React.MouseEvent<SVGGElement>, text: string) => {
    const width = 320;
    const x = Math.min(event.clientX + 14, window.innerWidth - width - 8);
    const y = Math.min(event.clientY + 14, window.innerHeight - 150);
    setTip({ x: Math.max(8, x), y: Math.max(8, y), text });
  };

  return (
    <div className="compare-chart-scroll">
      <svg
        className="compare-chart"
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label="Effective weapon strength chart"
      >
        {Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step).map((tick) => (
          <g key={tick}>
            <line
              className="compare-grid"
              x1={x(tick)}
              y1={TOP - 8}
              x2={x(tick)}
              y2={height - BOTTOM + 2}
            />
            <text className="compare-axis-label" x={x(tick)} y={TOP - 16} textAnchor="middle">
              {tick}
            </text>
          </g>
        ))}
        <line
          className="compare-axis"
          x1={LABEL_W}
          y1={TOP - 8}
          x2={LABEL_W}
          y2={height - BOTTOM + 2}
        />
        <line
          className="compare-median"
          x1={x(med)}
          y1={TOP - 8}
          x2={x(med)}
          y2={height - BOTTOM + 2}
        />
        <text className="compare-median-label" x={x(med)} y={TOP - 16} textAnchor="middle">
          median {fmt(med)}
        </text>

        {rows.map((row, index) => {
          const y = TOP + index * ROW_H;
          const rawWidth = Math.max(0, x(row.rawDamage) - LABEL_W);
          const elementWidth = Math.max(0, x(row.score) - x(row.rawDamage));
          const active = selected.has(row.weapon.name);
          const tipText = [
            row.weapon.name,
            `Score ${fmt(row.score)} · raw ${fmt(row.rawDamage)} · element ${fmt(row.elementDamage)}`,
            `Attack ${row.weapon.attack} → true raw ${fmt(row.trueRaw)}${row.attackUp ? ` (+${row.attackUp} Attack Up)` : ""}`,
            row.critDraw
              ? "Crit Draw: 1.25x raw on draw attacks (affinity ignored)"
              : `Crit ${row.critChance >= 0 ? "+" : ""}${row.critChance}%${row.affinityBonus ? ` + Crit Eye ${row.affinityBonus}%` : ""} → ${row.effectiveCritChance >= 0 ? "+" : ""}${row.effectiveCritChance}% → ${fmt(row.critExpected, 3)}x raw`,
            `Sharpness ${row.sharpnessBase.name} → +1 ${row.sharpnessPlus.name}`,
            `Element ${elementLabel(row)}${row.elementAttackUp !== 1 ? ` · Element Up ${row.elementAttackUp}x` : ""}`,
            row.weapon.notes?.length ? `Notes ${row.weapon.notes.join(" · ")}` : "",
            row.songAttackUp !== 1 ? `HH song ${row.songAttackUp}x` : "",
            row.status > 0 ? `Status accumulation ${fmt(row.status)}` : "",
          ].filter(Boolean).join("\n");

          return (
            <g
              key={row.weapon.name}
              className={`compare-bar-group${active ? " selected" : ""}`}
              onClick={() => onToggle(row.weapon.name)}
              onMouseEnter={(event) => showTip(event, tipText)}
              onMouseMove={(event) => showTip(event, tipText)}
              onMouseLeave={() => setTip(null)}
            >
              <rect
                className={`compare-row-bg${index % 2 ? " odd" : ""}`}
                x={0}
                y={y}
                width={WIDTH}
                height={ROW_H}
              />
              <text
                className="compare-weapon-label"
                x={LABEL_W - 18}
                y={y + ROW_H / 2}
                textAnchor="end"
                dominantBaseline="middle"
              >
                {truncate(row.weapon.name)}
              </text>
              {row.status > 0 && (
                <circle className="compare-status-dot" cx={LABEL_W - 10} cy={y + ROW_H / 2} r={2.5} />
              )}
              <rect
                className="compare-raw-bar"
                x={LABEL_W}
                y={y + 3}
                width={rawWidth}
                height={ROW_H - 6}
                rx={1.5}
              />
              <rect
                className="compare-element-bar"
                x={x(row.rawDamage)}
                y={y + 3}
                width={elementWidth}
                height={ROW_H - 6}
                rx={1.5}
              />
              <text
                className="compare-score-label"
                x={LABEL_W + CHART_W + 8}
                y={y + ROW_H / 2}
                dominantBaseline="middle"
              >
                {fmt(row.score)}
              </text>
            </g>
          );
        })}
      </svg>
      {tip && (
        <div className="compare-tooltip" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}

function CompareTable({ rows }: { rows: WeaponScore[] }) {
  if (!rows.length) {
    return <p className="empty">Pick weapons from the chart to compare up to four.</p>;
  }
  const metrics: { label: string; value: (row: WeaponScore) => ReactNode }[] = [
    { label: "Score", value: (row) => fmt(row.score) },
    { label: "Effective raw", value: (row) => fmt(row.effectiveRaw) },
    { label: "Raw damage", value: (row) => fmt(row.rawDamage) },
    { label: "Element damage", value: (row) => fmt(row.elementDamage) },
    { label: "Status", value: (row) => (row.status > 0 ? fmt(row.status) : "—") },
    { label: "Displayed attack", value: (row) => String(row.weapon.attack) },
    { label: "True raw", value: (row) => fmt(row.trueRaw) },
    {
      label: "Crit chance",
      value: (row) => `${row.critChance >= 0 ? "+" : ""}${row.critChance}%`,
    },
    {
      label: "Effective crit",
      value: (row) =>
        `${row.effectiveCritChance >= 0 ? "+" : ""}${row.effectiveCritChance}%`,
    },
    { label: "Crit expected", value: (row) => `${fmt(row.critExpected, 3)}x` },
    { label: "Crit Draw", value: (row) => (row.critDraw ? "Yes (draw)" : "No") },
    { label: "Crit Eye", value: (row) => (row.affinityBonus ? `+${row.affinityBonus}%` : "—") },
    { label: "Attack Up", value: (row) => (row.attackUp ? `+${row.attackUp}` : "—") },
    {
      label: "Sharpness",
      value: (row) =>
        row.sharpnessBase.name === row.sharpnessPlus.name
          ? row.sharpnessBase.name
          : `${row.sharpnessBase.name} → ${row.sharpnessPlus.name}`,
    },
    { label: "Element", value: elementLabel },
    { label: "Element Up", value: (row) => (row.elementAttackUp !== 1 ? `${row.elementAttackUp}x` : "—") },
    { label: "Notes", value: (row) => <NoteChips notes={row.weapon.notes} /> },
    { label: "HH song", value: (row) => (row.songAttackUp !== 1 ? `${row.songAttackUp}x` : "—") },
    { label: "Slots", value: (row) => String(row.weapon.slots) },
    { label: "Defense", value: (row) => String(row.weapon.defense ?? 0) },
    { label: "Rarity", value: (row) => String(row.weapon.rarity) },
  ];

  return (
    <div className="compare-wrap">
      <table className="compare-table weapon-compare-table">
        <thead>
          <tr>
            <th>Metric</th>
            {rows.map((row) => (
              <th key={row.weapon.name}>{row.weapon.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={metric.label}>
              <th>{metric.label}</th>
              {rows.map((row) => (
                <td key={row.weapon.name}>{metric.value(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WeaponCompare() {
  const { data } = useGame();
  const [type, setType] = useState("great-sword");
  const [sharpness, setSharpness] = useState<SharpnessMode>("best");
  const [sort, setSort] = useState<Sort>("score");
  const [limit, setLimit] = useState<Limit>("all");
  const [query, setQuery] = useState("");
  const [critDraw, setCritDraw] = useState(false);
  const [attackUp, setAttackUp] = useState(0);
  const [affinityBonus, setAffinityBonus] = useState(0);
  const [elementUp, setElementUp] = useState(1);
  const [songAttackUp, setSongAttackUp] = useState(1);
  const [selected, setSelected] = useState<string[] | null>(null);
  const blademaster = !data.rangedTypes.has(type);
  const critDrawActive = critDraw && blademaster;
  const affinityBonusActive = blademaster ? affinityBonus : 0;
  const songAttackUpActive = type === "hunting-horn" ? songAttackUp : 1;
  const preset = META_PRESETS[type];
  const options = useMemo(
    () => ({
      ...DEFAULT_STRENGTH_OPTIONS,
      sharpness,
      critDraw: critDrawActive,
      attackUp,
      affinityBonus: affinityBonusActive,
      elementAttackUp: elementUp,
      songAttackUp: songAttackUpActive,
    }),
    [
      sharpness,
      critDrawActive,
      attackUp,
      affinityBonusActive,
      elementUp,
      songAttackUpActive,
    ],
  );

  const allScores = useMemo(
    () => scoreEndTreeG(data.weapons, options),
    [data.weapons, options],
  );
  const typeRows = useMemo(
    () => allScores.filter((row) => row.weapon.type === type),
    [allScores, type],
  );
  const defaultSelectedNames = useMemo(
    () =>
      [...typeRows]
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((row) => row.weapon.name),
    [typeRows],
  );
  const selectedNames = selected ?? defaultSelectedNames;

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? typeRows.filter((row) => row.weapon.name.toLowerCase().includes(q))
      : typeRows;
    const sorted = [...filtered];
    if (sort === "name") {
      sorted.sort((a, b) => a.weapon.name.localeCompare(b.weapon.name));
    } else if (sort === "attack") {
      sorted.sort((a, b) => b.weapon.attack - a.weapon.attack);
    } else {
      sorted.sort((a, b) => b.score - a.score);
    }
    return limit === "all" ? sorted : sorted.slice(0, Number(limit));
  }, [typeRows, query, sort, limit]);

  const selectedRows = useMemo(
    () =>
      selectedNames
        .map((name) => typeRows.find((row) => row.weapon.name === name))
        .filter((row): row is WeaponScore => !!row),
    [selectedNames, typeRows],
  );
  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);
  const scores = typeRows.map((row) => row.score);

  const toggle = (name: string) => {
    setSelected((old) => {
      const current = old ?? defaultSelectedNames;
      if (current.includes(name)) return current.filter((value) => value !== name);
      if (current.length >= MAX_COMPARE) return [...current.slice(1), name];
      return [...current, name];
    });
  };

  const resetSelection = () => setSelected(null);

  const resetSkills = () => {
    setSharpness("base");
    setCritDraw(false);
    setAttackUp(0);
    setAffinityBonus(0);
    setElementUp(1);
    setSongAttackUp(1);
  };

  const applyPreset = () => {
    if (!preset) return;
    setSharpness(preset.skills.sharpness);
    setCritDraw(preset.skills.critDraw);
    setAttackUp(preset.skills.attackUp);
    setAffinityBonus(preset.skills.affinityBonus);
    setElementUp(preset.skills.elementAttackUp);
    setSongAttackUp(preset.skills.songAttackUp ?? 1);
  };

  return (
    <div className="stack weapon-compare">
      <section className="panel">
        <div className="compare-head">
          <div>
            <h2>Weapon Comparison</h2>
            <p className="dim small">
              MHFU end-tree G-rank weapons. Damage per hit at 100 MV using the dummy 45/25 raw
              and element hitzones. Compare within a type; click bars to add up to {MAX_COMPARE}
              weapons. Base clears
              skills; Meta applies the standard endgame skill package for the selected type.
              Crit Draw models MHP2G draw attacks: 100% crit and negative affinity ignored on that
              hit. Crit Eye adds flat affinity for sustained weapons such as Long Sword. Hunting
              Horn shows note colours and can apply the Attack Up L / encore song.
            </p>
          </div>
          <div className="compare-cards">
            <div><span className="dim small">Weapons</span><strong>{typeRows.length}</strong></div>
            <div><span className="dim small">Median</span><strong>{fmt(median(scores))}</strong></div>
            <div><span className="dim small">p10 / p90</span><strong>{fmt(percentile(scores, 0.1))} / {fmt(percentile(scores, 0.9))}</strong></div>
          </div>
        </div>
        <div className="row wrap compare-controls">
          <label>
            Weapon type
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setSelected(null);
              }}
            >
              {data.weaponTypes.map((value) => (
                <option key={value} value={value}>{data.typeLabel[value]}</option>
              ))}
            </select>
          </label>
          <label>
            Sharpness
            <select value={sharpness} onChange={(event) => setSharpness(event.target.value as SharpnessMode)}>
              {SHARP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Attack Up
            <select value={attackUp} onChange={(event) => setAttackUp(Number(event.target.value))}>
              {ATTACK_UP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Crit Eye
            <select
              value={affinityBonusActive}
              disabled={!blademaster}
              onChange={(event) => setAffinityBonus(Number(event.target.value))}
            >
              {CRIT_EYE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Element Up
            <select value={elementUp} onChange={(event) => setElementUp(Number(event.target.value))}>
              {ELEMENT_UP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          {type === "hunting-horn" && (
            <label>
              HH song
              <select value={songAttackUp} onChange={(event) => setSongAttackUp(Number(event.target.value))}>
                {HH_SONG_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={critDrawActive}
              disabled={!blademaster}
              onChange={(event) => setCritDraw(event.target.checked)}
            />
            Crit Draw
          </label>
          <label>
            Sort
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              <option value="score">Score</option>
              <option value="attack">Displayed attack</option>
              <option value="name">Name</option>
            </select>
          </label>
          <label>
            Show
            <select value={limit} onChange={(event) => setLimit(event.target.value as Limit)}>
              <option value="all">All</option>
              <option value="25">25 rows</option>
              <option value="10">10 rows</option>
            </select>
          </label>
          <input
            className="compare-search"
            type="search"
            placeholder="Filter weapon names…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="ghost" type="button" onClick={resetSkills}>
            Base
          </button>
          <button className="ghost" type="button" onClick={applyPreset} disabled={!preset}>
            {preset ? preset.metaLabel : "Meta"}
          </button>
        </div>
        {preset && (
          <p className="dim small compare-preset-note">
            <strong>{preset.label} meta:</strong> {preset.note}
          </p>
        )}
        <div className="compare-legend dim small">
          <span><i className="compare-swatch raw" /> Raw damage</span>
          <span><i className="compare-swatch element" /> Element damage</span>
          <span><i className="compare-swatch status" /> Status weapon</span>
          <span>Dashed line = type median</span>
          <span>Affinity: 1 + 0.25 × crit chance</span>
          {type === "hunting-horn" && <span>Note chips = horn note colours</span>}
        </div>
      </section>

      <section className="panel">
        <div className="compare-chart-head">
          <h3>{data.typeLabel[type]} <span className="dim small">{typeRows.length} end-tree G weapons</span></h3>
          <div className="row">
            <span className="dim small">{selectedRows.length}/{MAX_COMPARE} selected</span>
            <button className="ghost" type="button" onClick={resetSelection}>Reset</button>
          </div>
        </div>
        <StrengthChart rows={visibleRows} selected={selectedSet} onToggle={toggle} />
      </section>

      <section className="panel">
        <div className="compare-chart-head">
          <div>
            <h3>Selected weapons</h3>
            <p className="dim small">Side-by-side stats for the selected chart bars.</p>
          </div>
        </div>
        <CompareTable rows={selectedRows} />
      </section>
    </div>
  );
}
