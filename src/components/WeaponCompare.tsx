import { useMemo, useState, type ReactNode } from "react";
import { useGame } from "../lib/gameContext";
import { WeaponDetail } from "./Weapons";
import type { Weapon } from "../lib/types";
import { META_PRESETS_BY_GAME } from "../lib/metaPresets";
import { DAMAGE_PROFILES } from "../lib/damageProfiles";
import {
  DEFAULT_STRENGTH_OPTIONS,
  ELEMENT_ORDER,
  isObtainableWeapon,
  scoreEndTreeG,
  weaponElements,
  weaponMatchesElement,
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

const ATTACK_UP_TIERS = ["S", "M", "L", "XL"];

function skillOptions(values: readonly number[], format: (value: number, index: number) => string) {
  return [
    { value: 0, label: "None" },
    ...values.map((value, index) => ({ value, label: format(value, index) })),
  ];
}

function huntingHornSongOptions(values: readonly number[]) {
  return [
    { value: 1, label: "None" },
    ...values.map((value, index) => ({
      value,
      label:
        index === 0
          ? `Attack Up L (${value}x)`
          : `Attack Up L + encore (${value}x)`,
    })),
  ];
}

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
  if (parts.length) return parts.join(" / ");
  return row.weapon.awaken ? "Hidden (Awaken off)" : "—";
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
  const [detail, setDetail] = useState<{ x: number; y: number; weapon: Weapon } | null>(null);
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

  const showDetail = (event: React.MouseEvent<SVGTextElement>, weapon: Weapon) => {
    event.stopPropagation();
    const width = 420;
    const x =
      event.clientX + 18 + width > window.innerWidth
        ? event.clientX - width - 18
        : event.clientX + 18;
    const y = Math.min(event.clientY + 18, window.innerHeight - 480);
    setDetail({ x: Math.max(8, x), y: Math.max(8, y), weapon });
  };

  return (
    <>
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
              ? `Crit Draw: ${fmt(row.critExpected, 3)}x raw on draw attacks`
              : `Crit ${row.critChance >= 0 ? "+" : ""}${row.critChance}%${row.affinityBonus ? ` + Crit Eye ${row.affinityBonus}%` : ""} → ${row.effectiveCritChance >= 0 ? "+" : ""}${row.effectiveCritChance}% → ${fmt(row.critExpected, 3)}x raw`,
            `Sharpness ${row.sharpnessBase.name} → +1 ${row.sharpnessPlus.name}`,
            row.bow
              ? `Bow ${row.bow.shotName} Lv${row.bow.shotLevel} · charge ${row.bow.charge} · ${row.bow.elementHits} element hit(s) · ${row.bow.powerCoating ? "Power Coating" : "no Power Coating"}`
              : "",
            `Element ${elementLabel(row)}${row.elementAttackUp !== 1 ? ` · Element Up ${row.elementAttackUp}x` : ""}`,
            row.weapon.awaken && !row.hiddenElementActive
              ? "Hidden element inactive (enable Awaken)"
              : "",
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
                onMouseEnter={(event) => showDetail(event, row.weapon)}
                onMouseMove={(event) => showDetail(event, row.weapon)}
                onMouseLeave={() => setDetail(null)}
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
        {tip && !detail && (
          <div className="compare-tooltip" style={{ left: tip.x, top: tip.y }}>
            {tip.text}
          </div>
        )}
      </div>
      {detail && (
        <div
          className="weapon-hover-panel"
          style={{ left: detail.x, top: detail.y }}
          aria-hidden="true"
        >
          <WeaponDetail weapon={detail.weapon} onSelect={() => {}} compact />
        </div>
      )}
    </>
  );
}

function CompareTable({
  rows,
  onOpenWeapon,
}: {
  rows: WeaponScore[];
  onOpenWeapon: (name: string) => void;
}) {
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
    {
      label: "Awaken",
      value: (row) =>
        row.weapon.awaken ? (row.hiddenElementActive ? "Active" : "Needed") : "—",
    },
    { label: "Notes", value: (row) => <NoteChips notes={row.weapon.notes} /> },
    { label: "HH song", value: (row) => (row.songAttackUp !== 1 ? `${row.songAttackUp}x` : "—") },
    {
      label: "Bow shot",
      value: (row) => (row.bow ? `${row.bow.shotName} Lv${row.bow.shotLevel}` : "—"),
    },
    { label: "Bow charge", value: (row) => (row.bow ? String(row.bow.charge) : "—") },
    { label: "Element hits", value: (row) => (row.bow ? String(row.bow.elementHits) : "—") },
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
              <th key={row.weapon.name}>
                <button
                  type="button"
                  className="link"
                  title="Open weapon details"
                  onClick={() => onOpenWeapon(row.weapon.name)}
                >
                  {row.weapon.name}
                </button>
              </th>
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

export default function WeaponCompare({
  onOpenWeapon,
}: {
  onOpenWeapon: (name: string) => void;
}) {
  const { game, data } = useGame();
  const profile = DAMAGE_PROFILES[game];
  const presets = META_PRESETS_BY_GAME[game];
  const weaponTypes =
    game === "mhfu"
      ? data.weaponTypes
      : data.weaponTypes.filter((value) => !data.rangedTypes.has(value));
  const attackUpOptions = skillOptions(profile.skills.attackUp, (value, index) =>
    `Attack Up ${ATTACK_UP_TIERS[index]} (+${value})`,
  );
  const critEyeOptions = skillOptions(profile.skills.critEye, (value, index) =>
    `Crit Eye +${index + 1} (+${value}%)`,
  );
  const songOptions = huntingHornSongOptions(
    profile.skills.huntingHornAttackUp,
  );
  const elementUpOptions = [
    { value: 1, label: "None" },
    {
      value: profile.elementAttackUp,
      label: `Element Attack Up (${profile.elementAttackUp}x)`,
    },
  ];
  const [type, setType] = useState("great-sword");
  const [elementFilter, setElementFilter] = useState("all");
  const [sharpness, setSharpness] = useState<SharpnessMode>("best");
  const [sort, setSort] = useState<Sort>("score");
  const [limit, setLimit] = useState<Limit>("all");
  const [query, setQuery] = useState("");
  const [critDraw, setCritDraw] = useState(false);
  const [attackUp, setAttackUp] = useState(0);
  const [affinityBonus, setAffinityBonus] = useState(0);
  const [elementUp, setElementUp] = useState(1);
  const [awaken, setAwaken] = useState(false);
  const [songAttackUp, setSongAttackUp] = useState(1);
  const [bowCharge, setBowCharge] = useState(3);
  const [bowPowerCoating, setBowPowerCoating] = useState(true);
  const [bowCriticalDistance, setBowCriticalDistance] = useState(true);
  const [includeUnavailable, setIncludeUnavailable] = useState(false);
  const [selected, setSelected] = useState<string[] | null>(null);
  const blademaster = !data.rangedTypes.has(type);
  const critDrawActive = critDraw && blademaster;
  const affinityBonusActive = blademaster ? affinityBonus : 0;
  const songAttackUpActive = type === "hunting-horn" ? songAttackUp : 1;
  const preset = presets[type];
  const options = useMemo(
    () => ({
      ...DEFAULT_STRENGTH_OPTIONS,
      profile,
      sharpness,
      critDraw: critDrawActive,
      attackUp,
      affinityBonus: affinityBonusActive,
      elementAttackUp: elementUp,
      awaken,
      songAttackUp: songAttackUpActive,
      bowCharge,
      bowPowerCoating,
      bowCriticalDistance,
    }),
    [
      profile,
      sharpness,
      critDrawActive,
      attackUp,
      affinityBonusActive,
      elementUp,
      awaken,
      songAttackUpActive,
      bowCharge,
      bowPowerCoating,
      bowCriticalDistance,
    ],
  );

  const allScores = useMemo(
    () =>
      scoreEndTreeG(data.weapons, options).filter(
        (row) => includeUnavailable || isObtainableWeapon(row.weapon),
      ),
    [data.weapons, options, includeUnavailable],
  );
  const typeRows = useMemo(
    () => allScores.filter((row) => row.weapon.type === type),
    [allScores, type],
  );
  const elementOptions = useMemo(() => {
    const present = new Set<string>();
    for (const row of typeRows) {
      for (const name of weaponElements(row.weapon)) present.add(name);
    }
    return ELEMENT_ORDER.filter((name) => present.has(name));
  }, [typeRows]);
  const elementRows = useMemo(
    () =>
      elementFilter === "all"
        ? typeRows
        : typeRows.filter((row) => weaponMatchesElement(row.weapon, elementFilter)),
    [typeRows, elementFilter],
  );
  const defaultSelectedNames = useMemo(
    () =>
      [...elementRows]
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((row) => row.weapon.name),
    [elementRows],
  );
  const selectedNames = selected ?? defaultSelectedNames;

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? elementRows.filter((row) => row.weapon.name.toLowerCase().includes(q))
      : elementRows;
    const sorted = [...filtered];
    if (sort === "name") {
      sorted.sort((a, b) => a.weapon.name.localeCompare(b.weapon.name));
    } else if (sort === "attack") {
      sorted.sort((a, b) => b.weapon.attack - a.weapon.attack);
    } else {
      sorted.sort((a, b) => b.score - a.score);
    }
    return limit === "all" ? sorted : sorted.slice(0, Number(limit));
  }, [elementRows, query, sort, limit]);

  const selectedRows = useMemo(
    () =>
      selectedNames
        .map((name) => typeRows.find((row) => row.weapon.name === name))
        .filter((row): row is WeaponScore => !!row),
    [selectedNames, typeRows],
  );
  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);
  const scores = elementRows.map((row) => row.score);
  const elementFilterLabel =
    elementFilter === "all"
      ? "All elements"
      : elementFilter === "none"
        ? "No element / status"
        : elementFilter;

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
    setAwaken(false);
    setSongAttackUp(1);
    setBowCharge(3);
    setBowPowerCoating(true);
    setBowCriticalDistance(true);
  };

  const applyPreset = () => {
    if (!preset) return;
    setSharpness(preset.skills.sharpness);
    setCritDraw(preset.skills.critDraw);
    setAttackUp(preset.skills.attackUp);
    setAffinityBonus(preset.skills.affinityBonus);
    setElementUp(preset.skills.elementAttackUp);
    setAwaken(preset.skills.awaken ?? false);
    setSongAttackUp(preset.skills.songAttackUp ?? 1);
  };

  return (
    <div className="stack weapon-compare">
      <section className="panel">
        <div className="compare-head">
          <div>
            <h2>Weapon Comparison</h2>
            {game === "mhfu" ? (
              <p className="dim small">
                MHFU end-tree G-rank weapons. Melee and bowguns use 100 MV against the dummy
                45/25 hitzones; Bow uses the selected charge's real motion values and elemental
                hit count. Compare within a type; click bars to add up to {MAX_COMPARE} weapons.
                Base clears
                skills; Meta applies the standard endgame skill package for the selected type.
                Crit Draw models MHP2G draw attacks: 100% crit and negative affinity ignored on that
                hit. Crit Eye adds flat affinity for sustained weapons such as Long Sword. Hunting
                Horn shows note colours and can apply the Attack Up L / encore song. The Element
                filter narrows the chart to one element or status type, or to raw weapons.
              </p>
            ) : (
              <p className="dim small">
                {data.label} end-tree G-rank blademaster weapons. Melee uses 100 MV against the
                dummy 45/25 hitzones. Compare within a type; click bars to add up to {MAX_COMPARE}{" "}
                weapons. Base clears skills; Meta applies the standard endgame skill package for
                the selected type.{" "}
                {game === "mh4u"
                  ? "Crit Draw adds +100% affinity on draw attacks, so negative weapon affinity still applies."
                  : "Crit Draw guarantees a critical hit on draw attacks."}{" "}
                Crit Eye adds flat affinity for sustained weapons such as Long
                Sword. Hunting Horn shows note colours and can apply the Attack Up L / encore song.
                Hidden elements and hidden status only contribute when Awaken is enabled; Meta
                presets include Awaken when the target set uses it. Ranged weapons are excluded
                because ranged damage is not modeled for this game. The Element filter narrows the
                chart to one element or status type, or to raw weapons.
              </p>
            )}
          </div>
          <div className="compare-cards">
            <div><span className="dim small">Weapons</span><strong>{elementRows.length}</strong></div>
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
                setElementFilter("all");
                setSelected(null);
              }}
            >
              {weaponTypes.map((value) => (
                <option key={value} value={value}>{data.typeLabel[value]}</option>
              ))}
            </select>
          </label>
          <label>
            Element
            <select
              value={elementFilter}
              onChange={(event) => {
                setElementFilter(event.target.value);
                setSelected(null);
              }}
            >
              <option value="all">All elements</option>
              <option value="none">No element / status</option>
              {elementOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
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
              {attackUpOptions.map((option) => (
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
              {critEyeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Element Up
            <select value={elementUp} onChange={(event) => setElementUp(Number(event.target.value))}>
              {elementUpOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          {game !== "mhfu" && (
            <label className="check">
              <input
                type="checkbox"
                checked={awaken}
                onChange={(event) => setAwaken(event.target.checked)}
              />
              Awaken (hidden element)
            </label>
          )}
          {type === "hunting-horn" && (
            <label>
              HH song
              <select value={songAttackUp} onChange={(event) => setSongAttackUp(Number(event.target.value))}>
                {songOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          )}
          {game === "mhfu" && type === "bow" && (
            <>
              <label>
                Charge
                <select value={bowCharge} onChange={(event) => setBowCharge(Number(event.target.value))}>
                  <option value={1}>Charge 1</option>
                  <option value={2}>Charge 2</option>
                  <option value={3}>Charge 3</option>
                  <option value={4}>Charge 4 (Load Up)</option>
                </select>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={bowPowerCoating}
                  onChange={(event) => setBowPowerCoating(event.target.checked)}
                />
                Power Coating
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={bowCriticalDistance}
                  onChange={(event) => setBowCriticalDistance(event.target.checked)}
                />
                Critical Distance
              </label>
            </>
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
          <label className="check">
            <input
              type="checkbox"
              checked={includeUnavailable}
              onChange={(event) => setIncludeUnavailable(event.target.checked)}
            />
            Show non-obtainable
          </label>
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
          <h3>
            {data.typeLabel[type]}{" "}
            <span className="dim small">
              {elementRows.length} end-tree G weapons
              {elementFilter !== "all" ? ` · ${elementFilterLabel}` : ""}
            </span>
          </h3>
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
        <CompareTable rows={selectedRows} onOpenWeapon={onOpenWeapon} />
      </section>
    </div>
  );
}
