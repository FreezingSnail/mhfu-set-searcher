import type { RankFilter, SolverResult } from "./types";

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

const TOP_RANK: Partial<Record<RankFilter, string>> = {
  "high-below": "high-rank",
  "g-below": "g-rank",
};

const resultKey = (result: SolverResult): string =>
  result.armor.map((a) => a.id).join("|") +
  "|" + (result.charm?.id ?? "") +
  "|" + result.decos.map((d) => d.id).join("|");

/**
 * Inclusive rank filters must keep top-tier-only sets as well as mixed sets.
 * A pure combined search can spend its whole result budget on mixed sets, so
 * reserve half the cap for top-tier-only and half for mixed, then use any
 * remaining space for lower-tier-only sets.
 */
export function mergeRankDiverse(
  results: SolverResult[],
  filter: RankFilter,
  cap: number,
): SolverResult[] {
  const topRank = TOP_RANK[filter];
  if (!topRank) return results.slice(0, cap);

  const seen = new Set<string>();
  const top: SolverResult[] = [];
  const mixed: SolverResult[] = [];
  const lower: SolverResult[] = [];
  for (const result of results) {
    const key = resultKey(result);
    if (seen.has(key)) continue;
    seen.add(key);
    const ranks = new Set(result.armor.map((a) => a.rank));
    if (!ranks.has(topRank)) lower.push(result);
    else if (ranks.size === 1) top.push(result);
    else mixed.push(result);
  }

  const half = Math.ceil(cap / 2);
  const out = [...top.slice(0, half), ...mixed.slice(0, half)];
  for (const result of [...top.slice(half), ...mixed.slice(half), ...lower]) {
    if (out.length >= cap) break;
    out.push(result);
  }
  return out.slice(0, cap);
}
