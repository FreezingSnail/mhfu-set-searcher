import type { RankFilter } from "./types";

export const RANK_FILTERS: { value: RankFilter; label: string }[] = [
  { value: "all", label: "All ranks" },
  { value: "low", label: "Low only" },
  { value: "high", label: "High only" },
  { value: "high-below", label: "High and below" },
  { value: "g", label: "G only" },
  { value: "g-below", label: "G and below" },
];

const RANK_ORDER: Record<string, number> = {
  "low-rank": 0,
  "high-rank": 1,
  "g-rank": 2,
};

export function rankAllowed(rank: string, filter: RankFilter): boolean {
  if (filter === "all") return true;
  const order = RANK_ORDER[rank];
  if (order === undefined) return false;
  if (filter === "low") return order === 0;
  if (filter === "high") return order === 1;
  if (filter === "high-below") return order <= 1;
  if (filter === "g") return order === 2;
  return order <= 2;
}
