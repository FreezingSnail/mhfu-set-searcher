import { solve } from "./lib/solver";
import { SKILL_TREE } from "./lib/tiers";
import type { SolverInput, SolverResult } from "./lib/types";

type Request = {
  id: number;
  input: SolverInput;
  candidates?: string[];
};

const setKey = (r: SolverResult) =>
  r.armor.map((a) => a.id).join("|") + "|" + r.decos.map((d) => d.id).join("|");

function extend(input: SolverInput, candidates: string[]) {
  const original = new Set(input.skills.map((s) => s.ability));
  const found: SolverResult[] = [];
  const seen = new Set<string>();
  const started = Date.now();

  for (const ability of candidates) {
    if (Date.now() - started > 12_000) break;
    if (original.has(ability)) continue;
    const tree = SKILL_TREE.get(ability);
    const tier = tree?.tiers.filter((t) => t.points > 0).sort((a, b) => a.points - b.points)[0];
    if (!tier) continue;
    const out = solve({
      ...input,
      skills: [...input.skills, { ability, points: tier.points }],
      limit: 5,
      stopAtLimit: true,
      sort: "defense",
      timeLimitMs: 400,
    });
    for (const r of out.results) {
      const key = setKey(r);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({
        ...r,
        extra: r.active.filter((a) => !original.has(a.ability)),
      });
    }
  }

  const extras = (r: SolverResult) => r.extra.filter((e) => e.points > 0).length;
  found.sort((a, b) => extras(b) - extras(a) || b.defense - a.defense);
  return { results: found, nodes: 0, elapsed: Date.now() - started, truncated: false };
}

self.onmessage = (event: MessageEvent<Request>) => {
  const { id, input, candidates } = event.data;
  try {
    if (candidates) {
      self.postMessage({ id, ...extend(input, candidates) });
      return;
    }

    const pending: SolverResult[] = [];
    let lastPost = performance.now();
    const flush = () => {
      if (!pending.length) return;
      self.postMessage({ id, batch: pending.splice(0) });
      lastPost = performance.now();
    };
    const out = solve(input, (result) => {
      pending.push(result);
      if (pending.length >= 40 || performance.now() - lastPost > 100) flush();
    });
    flush();
    self.postMessage({
      id,
      done: true,
      results: out.results,
      nodes: out.nodes,
      elapsed: out.elapsed,
      truncated: out.truncated,
    });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
