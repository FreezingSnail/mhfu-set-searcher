import { useMemo, useState } from "react";
import { useGame } from "../lib/gameContext";
import { META_PRESETS } from "../lib/metaPresets";
import {
  DEFAULT_STRENGTH_OPTIONS,
  isEndTreeG,
  type StrengthOptions,
} from "../lib/weaponStrength";
import {
  eligibleParts,
  rawHitzone,
  scoreWeaponAgainstMonster,
  scoreWeaponAgainstMonsterAuto,
  type MatchupState,
  type Monster,
  type MonsterWeaponScore,
} from "../lib/monsterHitzones";
import monstersJson from "../data/monsters.json";

const MONSTERS = [...(monstersJson as unknown as Monster[])].sort((a, b) =>
  a.name.localeCompare(b.name),
);

const STATE_OPTIONS: { value: MatchupState; label: string }[] = [
  { value: "practical", label: "Practical (normal / pre-break)" },
  { value: "enraged", label: "Include enraged" },
  { value: "all", label: "All recorded states" },
];

const fmt = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

function elementHitzoneLabel(row: MonsterWeaponScore) {
  const parts = row.elementParts.map(
    (part) => `${part.name} ${row.elementHitzones[part.name] ?? 0}%`,
  );
  return parts.length ? parts.join(" / ") : "—";
}

function optionsFor(type: string): StrengthOptions {
  const preset = META_PRESETS[type];
  return {
    ...DEFAULT_STRENGTH_OPTIONS,
    ...(preset?.skills ?? {}),
    songAttackUp: preset?.skills.songAttackUp ?? 1,
  };
}

function scoreFor(
  monster: Monster,
  type: string,
  part: MonsterWeaponScore["monsterPart"] | undefined,
  state: MatchupState,
  weapon: Parameters<typeof scoreWeaponAgainstMonster>[0],
) {
  return part
    ? scoreWeaponAgainstMonster(weapon, monster, part, optionsFor(type))
    : scoreWeaponAgainstMonsterAuto(weapon, monster, state, optionsFor(type));
}

export default function MonsterMatchups() {
  const { data } = useGame();
  const [monsterName, setMonsterName] = useState("Black Gravios");
  const [partName, setPartName] = useState("auto");
  const [state, setState] = useState<MatchupState>("practical");
  const [type, setType] = useState("great-sword");

  const monster = useMemo(
    () => MONSTERS.find((entry) => entry.name === monsterName) ?? MONSTERS[0],
    [monsterName],
  );
  const selectedPart = useMemo(
    () => (partName === "auto" ? undefined : monster.parts.find((part) => part.part === partName)),
    [monster, partName],
  );
  const parts = useMemo(
    () => (selectedPart ? [selectedPart] : eligibleParts(monster, state)),
    [monster, selectedPart, state],
  );

  const bestByType = useMemo(
    () =>
      data.weaponTypes
        .map((weaponType) => {
          const rows = data.weapons
            .filter((weapon) => weapon.type === weaponType && isEndTreeG(weapon))
            .map((weapon) => scoreFor(monster, weaponType, selectedPart, state, weapon))
            .sort((a, b) => b.score - a.score);
          return rows[0] ? { type: weaponType, row: rows[0] } : null;
        })
        .filter((entry): entry is { type: string; row: MonsterWeaponScore } => !!entry),
    [data.weaponTypes, data.weapons, monster, selectedPart, state],
  );

  const ranked = useMemo(
    () =>
      data.weapons
        .filter((weapon) => weapon.type === type && isEndTreeG(weapon))
        .map((weapon) => scoreFor(monster, type, selectedPart, state, weapon))
        .sort((a, b) => b.score - a.score),
    [data.weapons, monster, selectedPart, state, type],
  );

  const preset = META_PRESETS[type];
  const targetLabel = selectedPart?.part ?? `auto · ${parts.length} eligible parts`;

  return (
    <div className="stack monster-matchups">
      <section className="panel">
        <div className="compare-head">
          <div>
            <h2>Monster Matchup</h2>
            <p className="dim small">
              Find the best end-tree G weapon for a monster. Practical mode excludes enraged,
              guard, harden, post-break, and broken-shell parts, so late-fight hitzones do not
              decide the result. Auto picks each weapon's best eligible part using both raw and
              elemental hitzones. Bow uses charge 3, Power Coating when available, and critical
              distance.
            </p>
          </div>
        </div>
        <div className="row wrap compare-controls">
          <label>
            Monster
            <select
              value={monster.name}
              onChange={(event) => {
                setMonsterName(event.target.value);
                setPartName("auto");
              }}
            >
              {MONSTERS.map((entry) => (
                <option key={entry.name} value={entry.name}>{entry.name}</option>
              ))}
            </select>
          </label>
          <label>
            Part
            <select value={partName} onChange={(event) => setPartName(event.target.value)}>
              <option value="auto">Auto (best per weapon)</option>
              {monster.parts.map((part) => (
                <option key={part.part} value={part.part}>{part.part}</option>
              ))}
            </select>
          </label>
          <label>
            State
            <select
              value={state}
              disabled={!!selectedPart}
              onChange={(event) => setState(event.target.value as MatchupState)}
            >
              {STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            Weapon class
            <select value={type} onChange={(event) => setType(event.target.value)}>
              {data.weaponTypes.map((weaponType) => (
                <option key={weaponType} value={weaponType}>{data.typeLabel[weaponType]}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="dim small compare-preset-note">
          <strong>{monster.name}:</strong> {targetLabel}. State:{" "}
          {selectedPart ? "explicit part" : state}.{" "}
          {preset ? `${preset.label} meta: ${preset.note}` : ""}
        </p>
      </section>

      <section className="panel">
        <div className="compare-chart-head">
          <div>
            <h3>Best per class vs {monster.name}</h3>
            <p className="dim small">
              Each class uses its Meta preset. Same 100 MV per-hit metric; not a DPS model.
            </p>
          </div>
        </div>
        <div className="best-grid">
          {bestByType.map(({ type: bestType, row }) => (
            <button
              key={bestType}
              type="button"
              className={`best-card${bestType === type ? " active" : ""}`}
              onClick={() => setType(bestType)}
            >
              <span className="dim small">{data.typeLabel[bestType]}</span>
              <strong>{row.weapon.name}</strong>
              <span className="small">
                {fmt(row.score)} · {row.monsterPart.part} · {row.damageType}{" "}
                {rawHitzone(row.monsterPart, row.damageType)}%
              </span>
              <span className="small dim">{elementHitzoneLabel(row)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="compare-chart-head">
          <div>
            <h3>{data.typeLabel[type]} ranking vs {monster.name}</h3>
            <p className="dim small">
              {preset ? `${preset.metaLabel}; ` : ""}
              top {Math.min(15, ranked.length)} of {ranked.length}. Target: {targetLabel}.
            </p>
          </div>
        </div>
        <div className="compare-wrap">
          <table className="compare-table matchup-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Weapon</th>
                <th>Score</th>
                <th>Part</th>
                <th>Raw HZ</th>
                <th>Element HZ</th>
                <th>Raw dmg</th>
                <th>Elem dmg</th>
              </tr>
            </thead>
            <tbody>
              {ranked.slice(0, 15).map((row, index) => (
                <tr key={row.weapon.name}>
                  <td>{index + 1}</td>
                  <td>{row.weapon.name}</td>
                  <td>{fmt(row.score)}</td>
                  <td>{row.monsterPart.part}</td>
                  <td>{row.damageType} {rawHitzone(row.monsterPart, row.damageType)}%</td>
                  <td>{elementHitzoneLabel(row)}</td>
                  <td>{fmt(row.rawDamage)}</td>
                  <td>{fmt(row.elementDamage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
