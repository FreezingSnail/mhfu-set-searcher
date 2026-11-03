import { useMemo, useState } from "react";
import { useGame } from "../lib/gameContext";
import { buildSet, type SetSelection } from "../lib/build";
import { selectionFromProgression } from "../lib/progressions";
import {
  COUNTER_EFFECTS,
  MHFU_LARGE_MONSTERS,
  counterCardsFor,
  counterEffectLabel,
  type CounterEffect,
  type CounterRank,
} from "../lib/counters";

const EFFECT_SHORT: Record<CounterEffect, string> = {
  "roar-hge": "HGE",
  "roar-earplug": "Earplug",
  "wind-high": "High wind",
  "wind-dragon": "Dragon wind",
  quake: "Quake",
  poison: "Poison",
  sleep: "Sleep",
  paralysis: "Para",
  stun: "Stun",
};

function EffectBadge({ effect }: { effect: CounterEffect }) {
  return (
    <span className={`effect-badge ${effect}`} title={counterEffectLabel(effect)}>
      {EFFECT_SHORT[effect]}
    </span>
  );
}

export default function Counters({
  onOpen,
  onSolve,
}: {
  onOpen: (selection: SetSelection, name: string) => void;
  onSolve: (skills: { ability: string; points: number }[], note: string) => void;
}) {
  const { data } = useGame();
  const [rank, setRank] = useState<CounterRank>("g");
  const [effect, setEffect] = useState<"all" | CounterEffect>("all");
  const [monsterName, setMonsterName] = useState(
    () => MHFU_LARGE_MONSTERS.find((entry) => entry.name === "Diablos")?.name ?? MHFU_LARGE_MONSTERS[0].name,
  );

  const visible = useMemo(
    () =>
      MHFU_LARGE_MONSTERS.filter(
        (entry) => effect === "all" || entry.effects.includes(effect),
      ),
    [effect],
  );
  const monster =
    visible.find((entry) => entry.name === monsterName) ?? visible[0] ?? MHFU_LARGE_MONSTERS[0];
  const cards = counterCardsFor(monster, rank);

  return (
    <div className="stack">
      <section className="panel counters-hero">
        <div className="compare-head">
          <div>
            <h2>Monster counters</h2>
            <p className="dim small">
              Large monsters only. Pick a monster to see its roar / wind / quake / status effects and
              the HR or G-rank armor shell that cancels them. HGE also covers Earplug roars; sets are
              blademaster templates and weapon slots are left free.
            </p>
          </div>
          <div className="subtabs counters-rank-tabs">
            <button className={rank === "high" ? "active" : ""} onClick={() => setRank("high")}>HR</button>
            <button className={rank === "g" ? "active" : ""} onClick={() => setRank("g")}>G rank</button>
          </div>
        </div>
        <div className="counter-filters">
          <button className={effect === "all" ? "active" : ""} onClick={() => setEffect("all")}>
            All large monsters
          </button>
          {COUNTER_EFFECTS.map((option) => (
            <button
              key={option.id}
              className={effect === option.id ? "active" : ""}
              onClick={() => setEffect(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <div className="counter-layout">
        <section className="panel counter-list-panel">
          <div className="row wrap">
            <strong>Large monsters</strong>
            <span className="dim small">{visible.length} shown</span>
          </div>
          <div className="counter-list">
            {visible.map((entry) => (
              <button
                key={entry.name}
                className={`counter-monster ${entry.name === monster.name ? "active" : ""}`}
                onClick={() => setMonsterName(entry.name)}
              >
                <span className="counter-monster-name">
                  <strong>{entry.name}</strong>
                  <span className="dim small">{entry.type}</span>
                </span>
                <span className="counter-monster-effects">
                  {entry.effects.length ? (
                    entry.effects.map((id) => <EffectBadge key={id} effect={id} />)
                  ) : <span className="dim small">—</span>}
                </span>
              </button>
            ))}
            {!visible.length && <p className="empty">No large monster has that effect.</p>}
          </div>
        </section>

        <section className="stack counter-detail">
          <div className="panel">
            <div className="counter-detail-head">
              <div>
                <h3>{monster.name}</h3>
                <p className="dim small">{monster.type} · {rank === "high" ? "HR counter" : "G-rank counter"}</p>
              </div>
              <div className="counter-detail-effects">
                {monster.effects.length ? (
                  monster.effects.map((id) => <EffectBadge key={id} effect={id} />)
                ) : <span className="dim small">No documented hard counter</span>}
              </div>
            </div>
            {monster.note && <p className="counter-note">{monster.note}</p>}
            {!cards.length && (
              <p className="empty">
                No Earplug / Wind / Quake / status counter is documented for this large monster.
                Use the Solver or Progressions tab for a damage or comfort shell.
              </p>
            )}
          </div>

          {cards.map((card) => {
            const selection = selectionFromProgression(card.set);
            const built = buildSet(data, selection);
            const armor = data.parts
              .map((part) => built.armor.find((piece) => piece.part === part))
              .filter((piece): piece is NonNullable<typeof piece> => !!piece);
            const decoCounts = new Map<string, { id: string; name: string; count: number }>();
            for (const deco of built.decos) {
              const group = decoCounts.get(deco.id);
              if (group) group.count++;
              else decoCounts.set(deco.id, { id: deco.id, name: deco.name, count: 1 });
            }
            const decoGroups = [...decoCounts.values()];
            const unlockParts: string[] = [];
            if (card.set.unlockHr > 0) unlockParts.push(`Hub HR${card.set.unlockHr}`);
            if (card.set.unlockVillage > 0) unlockParts.push(`Village ${card.set.unlockVillage}★`);
            const unlock = unlockParts.length ? unlockParts.join(" · ") : "No complete unlock path";

            return (
              <article key={card.combo} className="set-card counter-card">
                <div className="set-head">
                  <div>
                    <span className="style-tag comfort">Counter</span>
                    <strong>{card.label} · {monster.name}</strong>
                    <div className="dim small">{card.set.name}</div>
                  </div>
                  <div className="row wrap">
                    <button
                      className="ghost"
                      title="Open the Solver with this counter combo pre-selected"
                      onClick={() => onSolve(card.skills, `${monster.name} · ${card.label}`)}
                    >
                      Search skills
                    </button>
                    <button
                      className="ghost"
                      onClick={() => onOpen(selection, `${monster.name} · ${card.label}`)}
                    >
                      Open in Builder
                    </button>
                  </div>
                </div>
                <p className="progress-summary">{card.set.summary}</p>
                <div className="badges">
                  {built.active.map((skill) => (
                    <span key={skill.ability} className={`badge ${skill.points < 0 ? "bad" : ""}`}>
                      {skill.name} <span className="dim">({skill.points})</span>
                    </span>
                  ))}
                </div>
                <div className="pieces">
                  {armor.map((piece) => (
                    <div key={piece.part} className="piece">
                      <span className="slot-tag">{data.partLabel[piece.part]}</span>
                      <span>{piece.name}</span>
                      <span className="dim">{piece.defense} def · {piece.slots ? "O".repeat(piece.slots) : "—"}</span>
                    </div>
                  ))}
                </div>
                <div className="deco-line">
                  <span className="slot-tag">Jewels ({built.decos.length})</span>
                  {decoGroups.length ? (
                    <span className="chips">
                      {decoGroups.map((group) => (
                        <span key={group.id} className="chip">
                          {group.count > 1 ? `${group.count}× ` : ""}{group.name}
                        </span>
                      ))}
                    </span>
                  ) : <span className="dim">none</span>}
                </div>
                <div className="progress-meta dim small">
                  <span><strong>{built.defense}</strong> def</span>
                  <span><strong>{built.spare}</strong> slots free</span>
                  <span>{unlock}</span>
                  {!built.valid && <span className="error">{built.slotError || "invalid jewel layout"}</span>}
                </div>
                <ul className="progress-notes">
                  {card.set.notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
