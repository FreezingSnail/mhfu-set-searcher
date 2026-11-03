import { useState } from "react";
import { useGame } from "../lib/gameContext";
import { buildSet, type SetSelection } from "../lib/build";
import {
  PROGRESSION_STYLES,
  selectionFromProgression,
  type ProgressionRank,
  type ProgressionSet,
  type ProgressionStyle,
} from "../lib/progressions";
import {
  HUB_TIERS,
  MHFU_PROGRESSION_WEAPONS,
  VILLAGE_TIERS,
  tierBySource,
  tierRouteCard,
  type ProgressionSource,
  type ProgressionTier,
  type ProgressionWeapon,
} from "../lib/weaponRoutes";

const RANK_SHORT: Record<ProgressionRank, string> = { low: "LR", high: "HR", g: "G" };
const RANK_CLASS: Record<ProgressionRank, string> = { low: "lr", high: "hr", g: "gr" };

function ProgressionCard({
  weapon,
  tier,
  style,
  recommended,
  variants,
  note,
  next,
  onOpen,
  onWeapon,
  onTier,
}: {
  weapon: ProgressionWeapon;
  tier: ProgressionTier;
  style: ProgressionStyle;
  recommended: ProgressionSet;
  variants: ProgressionSet[];
  note: string;
  next: { name: string; tier: ProgressionTier } | null;
  onOpen: (selection: SetSelection, name: string) => void;
  onWeapon: (weaponId: string) => void;
  onTier: (tier: ProgressionTier) => void;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = previewId ? variants.find((set) => set.id === previewId) ?? null : null;
  const entry = preview ?? recommended;
  const isVariant = preview !== null;
  const { data } = useGame();
  const selection = selectionFromProgression(entry);
  const summary = buildSet(data, selection);
  const styleInfo = PROGRESSION_STYLES.find((s) => s.id === style)!;
  const armor = data.parts
    .map((part) => summary.armor.find((a) => a.part === part))
    .filter((a): a is NonNullable<typeof a> => !!a);
  const decoCounts = new Map<string, { id: string; name: string; count: number }>();
  for (const deco of summary.decos) {
    const group = decoCounts.get(deco.id);
    if (group) group.count++;
    else decoCounts.set(deco.id, { id: deco.id, name: deco.name, count: 1 });
  }
  const decoGroups = [...decoCounts.values()];
  const unlockParts: string[] = [];
  if (entry.unlockHr > 0) unlockParts.push(`Hub HR${entry.unlockHr}`);
  if (entry.unlockVillage > 0) unlockParts.push(`Village ${entry.unlockVillage}★`);
  const otherTier =
    tier.source === "village" && entry.unlockHr > 0
      ? tierBySource("hub", entry.unlockHr)
      : tier.source === "hub" && entry.unlockVillage > 0
        ? tierBySource("village", entry.unlockVillage)
        : null;

  return (
    <article className={`set-card progress-card ${style}`}>
      <div className="set-head progress-head">
        <div className="progress-title">
          <div className="progress-rank-line">
            <span className={`rank-tag ${RANK_CLASS[entry.rank]}`}>{RANK_SHORT[entry.rank]}</span>
            <span className={`style-tag ${style}`}>{styleInfo.label}</span>
            {isVariant && <span className="style-tag variant">Variant</span>}
            <span className="dim small">{tier.label}</span>
          </div>
          <strong>{weapon.label} · {entry.name}</strong>
        </div>
        <button className="ghost" onClick={() => onOpen(selection, `${weapon.label} ${tier.label}`)}>
          Open in Builder
        </button>
      </div>

      <div className="weapon-tab-row" role="tablist" aria-label={`${tier.label} weapon`}>
        {MHFU_PROGRESSION_WEAPONS.map((option) => (
          <button
            key={option.id}
            role="tab"
            aria-selected={option.id === weapon.id}
            className={option.id === weapon.id ? "active" : ""}
            title={`${option.label} · ${option.role}`}
            onClick={() => onWeapon(option.id)}
          >
            {option.short}
          </button>
        ))}
      </div>

      {variants.length > 0 && (
        <div className="progress-variants">
          <span className="slot-tag">Also available</span>
          <div className="chips">
            {variants.map((set) => (
              <button
                key={set.id}
                className={`chip link ${set.id === previewId ? "active" : ""}`}
                onClick={() => setPreviewId(set.id)}
              >
                {set.name}
              </button>
            ))}
          </div>
          {isVariant && (
            <button className="link" onClick={() => setPreviewId(null)}>
              Back to recommended
            </button>
          )}
        </div>
      )}

      <div className="progress-unlocks">
        <span className="slot-tag">Unlocks</span>
        <span>{unlockParts.length ? unlockParts.join(" · ") : "No complete unlock path"}</span>
        {otherTier && (
          <button className="link" onClick={() => onTier(otherTier)}>
            Also at {otherTier.label}
          </button>
        )}
      </div>

      <p className="progress-summary">{entry.summary}</p>
      <div className="progress-priority">
        <span className="slot-tag">Priority</span>
        <span>{weapon.priority}</span>
      </div>
      <div className="badges">
        {summary.active.map((skill) => (
          <span
            key={skill.ability}
            className={`badge ${skill.points < 0 ? "bad" : ""}`}
          >
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
        <span className="slot-tag">Jewels ({summary.decos.length})</span>
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
        <span><strong>{summary.defense}</strong> def</span>
        <span><strong>{summary.spare}</strong> slots free</span>
        <span><strong>{summary.cost.toLocaleString()}z</strong></span>
        {!summary.valid && <span className="error">{summary.slotError || "invalid jewel layout"}</span>}
      </div>
      <ul className="progress-notes">
        {entry.notes.map((item) => <li key={item}>{item}</li>)}
      </ul>
      <div className="progress-weapon-note">
        <span className="slot-tag">Weapon</span>
        <span>{note}</span>
      </div>
      <div className="progress-next">
        <span className="slot-tag">{isVariant ? "Recommended" : "Next"}</span>
        {isVariant ? (
          <button className="link" onClick={() => setPreviewId(null)}>
            {recommended.name}
          </button>
        ) : next ? (
          <button className="link" onClick={() => onTier(next.tier)}>
            {next.name} at {next.tier.label}
          </button>
        ) : <span className="dim">End of this track.</span>}
      </div>
    </article>
  );
}

function TierRow({
  title,
  tiers,
  weaponId,
  style,
  selected,
  onSelect,
}: {
  title: string;
  tiers: ProgressionTier[];
  weaponId: string;
  style: ProgressionStyle;
  selected: ProgressionTier;
  onSelect: (tier: ProgressionTier) => void;
}) {
  return (
    <div className="tier-row">
      <span className="tier-row-label">{title}</span>
      <div className="tier-scroll">
        {tiers.map((tier) => {
          const card = tierRouteCard(weaponId, style, tier);
          const active = selected.source === tier.source && selected.level === tier.level;
          return (
            <button
              key={`${tier.source}-${tier.level}`}
              className={`tier-cell ${active ? "active" : ""}`}
              onClick={() => onSelect(tier)}
              title={`${tier.label}: ${card.set.name}`}
            >
              <span className="tier-level">{tier.short}</span>
              <span className="tier-set">{card.set.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Progressions({
  onOpen,
}: {
  onOpen: (selection: SetSelection, name: string) => void;
}) {
  const [style, setStyle] = useState<ProgressionStyle>("dps");
  const [weaponId, setWeaponId] = useState(MHFU_PROGRESSION_WEAPONS[0].id);
  const [source, setSource] = useState<ProgressionSource>("village");
  const [level, setLevel] = useState(1);
  const tier = tierBySource(source, level);
  const card = tierRouteCard(weaponId, style, tier);

  const selectTier = (next: ProgressionTier) => {
    setSource(next.source);
    setLevel(next.level);
  };

  return (
    <div className="stack">
      <section className="panel progress-hero">
        <div className="progress-hero-head">
          <div>
            <h2>MHFU progression sets</h2>
            <p className="dim small">
              Every village star and hub HR has a card. Pick a weapon and a path, then follow the track.
              The same set can appear on both tracks; use “Also at” to jump to its other unlock.
            </p>
          </div>
          <div className="subtabs progress-hunter-tabs">
            {PROGRESSION_STYLES.map((option) => (
              <button
                key={option.id}
                className={style === option.id ? "active" : ""}
                onClick={() => setStyle(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="progress-legend">
          {PROGRESSION_STYLES.map((option) => (
            <span key={option.id}>
              <span className={`style-tag ${option.id}`}>{option.label}</span>
              <span className="dim small">{option.blurb}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="panel progress-timeline-panel">
        <TierRow
          title="Village"
          tiers={VILLAGE_TIERS}
          weaponId={weaponId}
          style={style}
          selected={tier}
          onSelect={selectTier}
        />
        <TierRow
          title="Hub"
          tiers={HUB_TIERS}
          weaponId={weaponId}
          style={style}
          selected={tier}
          onSelect={selectTier}
        />
      </section>

      <ProgressionCard
        key={`${weaponId}-${tier.source}-${tier.level}-${style}`}
        weapon={card.weapon}
        tier={tier}
        style={style}
        recommended={card.set}
        variants={card.variants}
        note={card.note}
        next={card.next ? { name: card.next.set.name, tier: card.next.tier } : null}
        onOpen={onOpen}
        onWeapon={setWeaponId}
        onTier={selectTier}
      />
    </div>
  );
}
