import { useEffect } from "react";
import { useGame } from "../lib/gameContext";
import type { Armor, Deco } from "../lib/types";

export type DetailItem =
  | { kind: "armor"; data: Armor }
  | { kind: "deco"; data: Deco };

const RANK_LABEL: Record<string, string> = {
  "low-rank": "Low rank",
  "high-rank": "High rank",
  "g-rank": "G rank",
};
const SEX_LABEL: Record<string, string> = { both: "Male/Female", male: "Male", female: "Female" };
const HUNTER_LABEL: Record<string, string> = { both: "Blade/Gunner", blade: "Blademaster", gunner: "Gunner" };

export default function PieceDetail({ item, onClose }: { item: DetailItem | null; onClose: () => void }) {
  const { data } = useGame();
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;
  const armor = item.kind === "armor" ? item.data : null;
  const a = item.data;
  const skills = a.skills;
  const mats = a.mats;
  const slots = a.slots;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{armor ? armor.name : `${a.name} (jewel)`}</h3>
            <p className="dim small">
              {armor
                ? `${data.partLabel[armor.part]} · ${RANK_LABEL[armor.rank] ?? armor.rank} · rarity ${armor.rarity} · ${SEX_LABEL[armor.sex]} · ${HUNTER_LABEL[armor.hunter]}`
                : `Requires ${slots} slot${slots > 1 ? "s" : ""}`}
            </p>
          </div>
          <button className="icon" onClick={onClose} aria-label="Close">×</button>
        </div>

        {armor ? (
          <>
            <div className="detail-stats">
              <span><strong>{armor.defense}</strong> defense</span>
              <span><strong>{armor.slots}</strong> slots</span>
              <span><strong>{armor.hr}</strong> {data.id === "mh3u" ? "port" : data.id === "mh4u" ? "hub" : "HR"} / <strong>{armor.elder}</strong> {data.id === "mhfu" ? "elder" : "village"}</span>
              <span><strong>{armor.cost.toLocaleString()}z</strong></span>
            </div>
            <div className="detail-res">
              {Object.entries(armor.res).map(([k, v]) => (
                <span key={k}>{data.resLabel[k]} {v >= 0 ? "+" : ""}{v}</span>
              ))}
            </div>
          </>
        ) : (
          <div className="detail-stats">
            <span><strong>{a.slots}</strong> slot{a.slots > 1 ? "s" : ""}</span>
            <span><strong>{a.hr}</strong> {data.id === "mh3u" ? "port" : data.id === "mh4u" ? "hub" : "HR"} / <strong>{a.elder}</strong> {data.id === "mhfu" ? "elder" : "village"}</span>
            <span><strong>{a.cost.toLocaleString()}z</strong></span>
          </div>
        )}

        <h4>Skills</h4>
        <div className="detail-skills">
          {skills.length
            ? skills.map(([s, p]) => (
                <span key={s} className="detail-skill">
                  {s} <strong>{p > 0 ? "+" : ""}{p}</strong>
                </span>
              ))
            : <span className="dim">None.</span>}
        </div>

        <h4>Materials</h4>
        <div className="mats">
          {mats.length ? mats.map(([m, n]) => <span key={m}>{m} ×{n}</span>) : <span className="dim">None.</span>}
        </div>
      </div>
    </div>
  );
}
