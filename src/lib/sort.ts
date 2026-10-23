import type { SolverInput, SolverResult } from "./types";

export function sortSets(results: SolverResult[], sort: SolverInput["sort"]): SolverResult[] {
  const extraCount = (r: SolverResult) => r.extra.filter((e) => e.points > 0).length;
  return results.sort((a, b) => {
    if (sort === "jewels") return a.decos.length - b.decos.length || b.defense - a.defense;
    if (sort === "spare") return b.spare - a.spare || b.defense - a.defense;
    if (sort === "cost") return a.cost - b.cost || b.defense - a.defense;
    if (sort === "defenseLow") return a.defense - b.defense || b.spare - a.spare;
    if (sort === "extras") return extraCount(b) - extraCount(a) || b.defense - a.defense;
    return b.defense - a.defense || b.spare - a.spare;
  });
}
