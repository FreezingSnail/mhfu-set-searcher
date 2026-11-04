import { useMemo, useState } from "react";
import { useGame } from "../lib/gameContext";
import { DAMAGE_PROFILES, type DamageProfile } from "../lib/damageProfiles";
import { META_PRESETS_BY_GAME, type MetaPreset } from "../lib/metaPresets";
import {
  DEFAULT_STRENGTH_OPTIONS,
  isEndTreeG,
  isObtainableWeapon,
  type StrengthOptions,
} from "../lib/weaponStrength";
import {
  eligibleParts,
  rawHitzone,
  scoreWeaponAgainstMonster,
  scoreWeaponAgainstMonsterAuto,
  type MatchupState,
  type Monster,
  type MonsterPart,
  type MonsterWeaponScore,
} from "../lib/monsterHitzones";
import type { Game, Weapon } from "../lib/types";
import monstersMhfuJson from "../data/monsters.json";
import monstersMh3uJson from "../data/monsters-mh3u.json";
import monstersMh4uJson from "../data/monsters-mh4u.json";

const sortMonsters = (monsters: Monster[]) =>
  [...monsters].sort((a, b) => a.name.localeCompare(b.name));

const MONSTERS_BY_GAME: Record<Game, Monster[]> = {
  mhfu: sortMonsters(monstersMhfuJson as unknown as Monster[]),
  mh3u: sortMonsters(monstersMh3uJson as unknown as Monster[]),
  mh4u: sortMonsters(monstersMh4uJson as unknown as Monster[]),
  "mh4u+": sortMonsters(monstersMh4uJson as unknown as Monster[]),
};

const EMPTY_MONSTER: Monster = { name: "—", type: "Unknown", parts: [] };

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

function optionsFor(
  presets: Record<string, MetaPreset>,
  profile: DamageProfile,
  type: string,
): StrengthOptions {
  const preset = presets[type];
  return {
    ...DEFAULT_STRENGTH_OPTIONS,
    ...(preset?.skills ?? {}),
    profile,
    awaken: preset?.skills.awaken ?? false,
    songAttackUp: preset?.skills.songAttackUp ?? 1,
  };
}

function scoreFor(
  monster: Monster,
  part: MonsterPart | undefined,
  state: MatchupState,
  weapon: Weapon,
  presets: Record<string, MetaPreset>,
  profile: DamageProfile,
) {
  const options = optionsFor(presets, profile, weapon.type);
  return part
    ? scoreWeaponAgainstMonster(weapon, monster, part, options)
    : scoreWeaponAgainstMonsterAuto(weapon, monster, state, options);
}

export default function MonsterMatchups({
  onOpenWeapon,
}: {
  onOpenWeapon: (name: string) => void;
}) {
  const { game, data } = useGame();
  const profile = DAMAGE_PROFILES[game];
  const presets = META_PRESETS_BY_GAME[game];
  const monsters = MONSTERS_BY_GAME[game];
  const weaponTypes = useMemo(
    () =>
      game === "mhfu"
        ? data.weaponTypes
        : data.weaponTypes.filter((weaponType) => !data.rangedTypes.has(weaponType)),
    [game, data.weaponTypes, data.rangedTypes],
  );
  const [monsterName, setMonsterName] = useState(
    () =>
      monsters.find((entry) => entry.name === "Black Gravios")?.name ??
      monsters[0]?.name ??
      "",
  );
  const [partName, setPartName] = useState("auto");
  const [state, setState] = useState<MatchupState>("practical");
  const [type, setType] = useState("great-sword");
  const [includeUnavailable, setIncludeUnavailable] = useState(false);

  const monster = useMemo(
    () =>
      monsters.find((entry) => entry.name === monsterName) ??
      monsters[0] ??
      EMPTY_MONSTER,
    [monsterName, monsters],
  );
  const activePartName =
    partName !== "auto" && monster.parts.some((part) => part.part === partName)
      ? partName
      : "auto";
  const selectedPart = useMemo(
    () =>
      activePartName === "auto"
        ? undefined
        : monster.parts.find((part) => part.part === activePartName),
    [activePartName, monster],
  );
  const parts = useMemo(
    () => (selectedPart ? [selectedPart] : eligibleParts(monster, state)),
    [monster, selectedPart, state],
  );
  const activeType = weaponTypes.includes(type)
    ? type
    : (weaponTypes[0] ?? "great-sword");
  const availableWeapons = useMemo(
    () =>
      data.weapons.filter(
        (weapon) => includeUnavailable || isObtainableWeapon(weapon),
      ),
    [data.weapons, includeUnavailable],
  );

  const bestByType = useMemo(
    () =>
      weaponTypes
        .map((weaponType) => {
          const rows = availableWeapons
            .filter((weapon) => weapon.type === weaponType && isEndTreeG(weapon))
            .map((weapon) =>
              scoreFor(monster, selectedPart, state, weapon, presets, profile),
            )
            .sort((a, b) => b.score - a.score);
          return rows[0] ? { type: weaponType, row: rows[0] } : null;
        })
        .filter(
          (entry): entry is { type: string; row: MonsterWeaponScore } => !!entry,
        ),
    [availableWeapons, monster, selectedPart, state, weaponTypes, presets, profile],
  );

  const ranked = useMemo(
    () =>
      availableWeapons
        .filter((weapon) => weapon.type === activeType && isEndTreeG(weapon))
        .map((weapon) =>
          scoreFor(monster, selectedPart, state, weapon, presets, profile),
        )
        .sort((a, b) => b.score - a.score),
    [activeType, availableWeapons, monster, selectedPart, state, presets, profile],
  );

  const preset = presets[activeType];
  const targetLabel = selectedPart
    ? selectedPart.part
    : monster.parts.length
      ? `auto · ${parts.length} eligible parts`
      : "no recorded hitzones";

  return (
    <div className="stack monster-matchups">
      <section className="panel">
        <div className="compare-head">
          <div>
            <h2>Monster Matchup</h2>
            <p className="dim small">
              Find the best end-tree G weapon for a monster. Practical mode includes only normal
              and pre-break hitzones, so enraged, charged, guard, harden, post-break, broken,
              G-rank, and other conditional states do not decide the result. Auto picks each
              weapon&apos;s best eligible part using both raw and elemental hitzones.{" "}
              {game === "mhfu"
                ? "Bow uses charge 3, Power Coating when available, and critical distance."
                : "Ranged classes are omitted; only blademaster hitzones are scored."}
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
              {monsters.map((entry) => (
                <option key={entry.name} value={entry.name}>{entry.name}</option>
              ))}
            </select>
          </label>
          <label>
            Part
            <select value={activePartName} onChange={(event) => setPartName(event.target.value)}>
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
            <select value={activeType} onChange={(event) => setType(event.target.value)}>
              {weaponTypes.map((weaponType) => (
                <option key={weaponType} value={weaponType}>{data.typeLabel[weaponType]}</option>
              ))}
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={includeUnavailable}
              onChange={(event) => setIncludeUnavailable(event.target.checked)}
            />
            Show non-obtainable
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
              className={`best-card${bestType === activeType ? " active" : ""}`}
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
            <h3>{data.typeLabel[activeType]} ranking vs {monster.name}</h3>
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
                  <td>
                    <button
                      type="button"
                      className="link"
                      title="Open weapon details"
                      onClick={() => onOpenWeapon(row.weapon.name)}
                    >
                      {row.weapon.name}
                    </button>
                  </td>
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
