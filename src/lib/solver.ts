/**
 * Search model follows Athena's ASS:
 * - only pieces that can contribute to a requested skill or slots matter;
 * - jewels consume contiguous slots inside one piece (tracked as 1/2/3-slot groups);
 * - negative skills are rejected at -10 unless "allow bad skills" is on.
 * Unlike ASS this uses a pruned DFS instead of per-part equivalence classes.
 */
import armorJson from "../data/armor.json";
import decoJson from "../data/decorations.json";
import type { Armor, Deco, SolverInput, SolverResult } from "./types";
import { SKILL_TREE, activeTier } from "./tiers";
import { sortSets } from "./sort";
import { RESULT_CAP } from "./constants";

const ARMOR = armorJson as unknown as Armor[];
const DECOS = decoJson as unknown as Deco[];
const TREE = SKILL_TREE;
const PARTS = ["head", "body", "arms", "waist", "legs"] as const;
const RANK_ORDER: Record<string, number> = { "low-rank": 0, "high-rank": 1, "g-rank": 2 };
const RANK_LIMIT: Record<string, number> = { low: 0, high: 1, g: 2 };

type Cand = { a: Armor; points: number[]; vec: [number, number][]; torso: boolean };
type Counts = [number, number, number, number];

const filterCandidates = (input: SolverInput, abilities: string[], ai: Map<string, number>): Record<string, Cand[]> => {
  const filtered: Record<string, Armor[]> = {};
  for (const part of PARTS) {
    filtered[part] = ARMOR.filter((a) => {
      if (a.part !== part) return false;
      if (a.sex !== "both" && a.sex !== input.gender) return false;
      if (a.hunter !== "both" && a.hunter !== input.hunter) return false;
      if (input.rank !== "all" && (RANK_ORDER[a.rank] ?? 99) > RANK_LIMIT[input.rank]) return false;
      if (a.hr > input.hr || a.elder > input.elder) return false;
      if (!input.allowPiercings && a.name.includes("Piercing")) return false;
      if (a.name.includes("(dummy)")) return false;
      return true;
    });
  }

  const out: Record<string, Cand[]> = {};
  for (const part of PARTS) {
    const seen = new Map<string, Cand>();
    for (const a of filtered[part]) {
      const points = new Array(abilities.length).fill(0);
      for (const [s, p] of a.skills) points[ai.get(s)!] += p;
      const torso = a.skills.some(([s]) => s === "Torso Inc");
      const vec = points
        .map((p, i) => [i, p] as [number, number])
        .filter(([, p]) => p !== 0);
      const sig = `${a.slots}|${torso}|${points.join(",")}`;
      const prev = seen.get(sig);
      if (!prev || a.defense > prev.a.defense) seen.set(sig, { a, points, vec, torso });
    }
    let list = [...seen.values()];
    // A piece is useless if it contributes nothing and has no slots.
    list = list.filter((c) => c.a.slots > 0 || c.torso || c.points.some((p) => p !== 0));
    // Remove pieces strictly dominated by another piece in the same slot.
    list.sort((x, y) => y.a.slots - x.a.slots || y.a.defense - x.a.defense);
    const kept: Cand[] = [];
    for (const c of list) {
      const dominated = kept.some(
        (k) =>
          k.torso === c.torso &&
          k.a.slots >= c.a.slots &&
          k.a.defense >= c.a.defense &&
          c.points.every((p, i) => k.points[i] >= p),
      );
      if (!dominated) kept.push(c);
    }
    out[part] = kept;
  }
  return out;
};

const slotsLeft = (free: Counts) => free[1] + free[2] * 2 + free[3] * 3;

export function solve(
  input: SolverInput,
  onResult?: (result: SolverResult) => void,
): { results: SolverResult[]; nodes: number; elapsed: number; truncated: boolean } {
  const started = performance.now();
  const target = input.skills.filter((s) => TREE.has(s.ability) && s.points > 0);
  const abilities = [...new Set([
    ...target.map((s) => s.ability),
    ...ARMOR.flatMap((a) => a.skills.map(([s]) => s)),
    ...DECOS.flatMap((d) => d.skills.map(([s]) => s)),
  ])];
  const ai = new Map(abilities.map((s, i) => [s, i]));
  const ti = new Map(target.map((s, i) => [s.ability, i]));

  const targetIdx = target.map((s) => ai.get(s.ability)!);
  const candidates = filterCandidates(input, abilities, ai);
  for (const part of PARTS) {
    candidates[part] = candidates[part].filter(
      (c) => c.a.slots > 0 || c.torso || targetIdx.some((i) => c.points[i] > 0),
    );
    const score = (c: Cand) => targetIdx.reduce((n, i) => n + Math.max(0, c.points[i]), 0);
    candidates[part].sort((a, b) => score(b) - score(a) || b.a.slots - a.a.slots || b.a.defense - a.a.defense);
  }
  if (input.shard && input.shard.count > 1) {
    const { index, count } = input.shard;
    candidates.head = candidates.head.filter((_, i) => i % count === index);
  }
  if (!candidates.head.length) {
    return { results: [], nodes: 0, elapsed: performance.now() - started, truncated: false };
  }
  const partOrder = [...PARTS].sort((a, b) => candidates[a].length - candidates[b].length);
  const bodyMax = new Array(abilities.length).fill(0);
  for (const c of candidates.body ?? []) {
    for (let a = 0; a < abilities.length; a++) if (c.points[a] > bodyMax[a]) bodyMax[a] = c.points[a];
  }

  // Max points per ability per remaining part, used for pruning.
  const suffix = Array.from({ length: partOrder.length + 1 }, () => new Array(abilities.length).fill(0));
  const suffixSlots = new Array(partOrder.length + 1).fill(0);
  for (let i = partOrder.length - 1; i >= 0; i--) {
    const part = partOrder[i];
    const local = new Array(abilities.length).fill(0);
    let maxSlots = 0;
    for (const c of candidates[part]) {
      maxSlots = Math.max(maxSlots, c.a.slots);
      for (let a = 0; a < abilities.length; a++) if (c.points[a] > local[a]) local[a] = c.points[a];
    }
    for (let a = 0; a < abilities.length; a++) suffix[i][a] = suffix[i + 1][a] + local[a];
    suffixSlots[i] = suffixSlots[i + 1] + maxSlots;
  }

  // Unbounded per-ability upper bound for decorations (target abilities only).
  const bestDeco = new Map<number, number[]>();
  for (const a of new Set(targetIdx)) {
    const dp = new Array(19).fill(0);
    for (let s = 1; s <= 18; s++) {
      for (const d of DECOS) {
        if (d.slots > s) continue;
        const p = d.skills.find(([x]) => x === abilities[a])?.[1] ?? 0;
        if (p > 0) dp[s] = Math.max(dp[s], dp[s - d.slots] + p);
      }
      dp[s] = Math.max(dp[s], dp[s - 1]);
    }
    bestDeco.set(a, dp);
  }

  const usableDecos = DECOS.filter(
    (d) => d.hr <= input.hr && d.elder <= input.elder,
  ).filter((d) => d.skills.some(([, p]) => p > 0));


  const decoByAbility = new Map<string, Deco[]>();
  for (const ability of target.map((s) => s.ability)) {
    decoByAbility.set(
      ability,
      usableDecos
        .filter((d) => d.skills.some(([s, p]) => s === ability && p > 0))
        .sort((x, y) => {
          const sx = x.skills.reduce((n, [, p]) => n + Math.max(0, p), 0) / x.slots;
          const sy = y.skills.reduce((n, [, p]) => n + Math.max(0, p), 0) / y.slots;
          return sy - sx;
        }),
    );
  }

  let nodes = 0;
  let truncated = false;
  const maxNodes = 20_000_000;
  const results: SolverResult[] = [];
  const seenResults = new Set<string>();
  const deadline = input.timeLimitMs === undefined ? Infinity : started + input.timeLimitMs;
  const limit = input.limit ?? Infinity;
  const maxResults = input.maxResults ?? RESULT_CAP;

  const consume = (free: Counts, size: number): Counts | null => {
    for (let s = size; s <= 3; s++) {
      if (free[s] > 0) {
        const next = [...free] as Counts;
        next[s]--;
        if (s > size) next[s - size]++;
        return next;
      }
    }
    return null;
  };

  const decoSolve = (base: number[], free: Counts): { decos: Deco[]; free: Counts } | null => {
    const memo = new Map<string, { decos: Deco[]; free: Counts } | null>();
    const gaps = target.map((s) => Math.max(0, s.points - base[ai.get(s.ability)!]));
    if (gaps.every((g) => g <= 0)) return { decos: [], free };
    let decoNodes = 0;

    const walk = (g: number[], f: Counts, totals: number[]): { decos: Deco[]; free: Counts } | null => {
      if (++decoNodes > 150_000) return null;
      let key = `${g.join(",")}|${f[1]},${f[2]},${f[3]}`;
      if (!input.allowBad) {
        for (let i = 0; i < abilities.length; i++) if (totals[i] < 0) key += `|${i}:${totals[i]}`;
      }
      if (memo.has(key)) return memo.get(key)!;
      const first = g.findIndex((x) => x > 0);
      if (first < 0) return { decos: [], free: f };
      const ability = target[first].ability;
      for (const d of decoByAbility.get(ability) ?? []) {
        const nf = consume(f, d.slots);
        if (!nf) continue;
        const nt = [...totals];
        let bad = false;
        for (const [s, p] of d.skills) {
          nt[ai.get(s)!] += p;
          if (!input.allowBad && nt[ai.get(s)!] <= -10) bad = true;
        }
        if (bad) continue;
        const ng = [...g];
        for (const [s, p] of d.skills) {
          const idx = ti.get(s);
          if (idx !== undefined) ng[idx] -= p;
        }
        const rest = walk(ng, nf, nt);
        if (rest) {
          const out = { decos: [d, ...rest.decos], free: rest.free };
          memo.set(key, out);
          return out;
        }
      }
      memo.set(key, null);
      return null;
    };
    return walk(gaps, [...free] as Counts, [...base]);
  };

  const chosen: Cand[] = [];
  const points = new Array(abilities.length).fill(0);
  const free: Counts = [0, 0, 0, 0];

  const leaf = () => {
    // Torso Inc repeats the body piece's skill points.
    const torsoCount = chosen.filter((c) => c.torso).length;
    const body = chosen.find((c) => c.a.part === "body");
    const effective = [...points];
    if (torsoCount && body) {
      for (let a = 0; a < abilities.length; a++) effective[a] += body.points[a] * torsoCount;
    }
    const totalFree = slotsLeft(free);
    for (let i = 0; i < target.length; i++) {
      const a = ai.get(target[i].ability)!;
      if (target[i].points - effective[a] > (bestDeco.get(a)?.[Math.min(18, totalFree)] ?? 0)) return;
    }
    const d = decoSolve(effective, [...free] as Counts);
    if (!d) return;

    const all = chosen.map((c) => c.a);
    const key = all.map((a) => a.id).join("|") + "|" + d.decos.map((x) => x.id).join("|");
    if (seenResults.has(key)) return;
    seenResults.add(key);

    const totals = [...effective];
    for (const deco of d.decos) for (const [s, p] of deco.skills) totals[ai.get(s)!] += p;
    if (!input.allowBad) {
      for (let a = 0; a < abilities.length; a++) if (totals[a] <= -10) return;
    }
    const active = abilities
      .map((ability) => {
        const tier = activeTier(ability, totals[ai.get(ability)!]);
        return tier ? { ability, points: totals[ai.get(ability)!], name: tier.name } : null;
      })
      .filter((x): x is { ability: string; points: number; name: string } => !!x);
    const targetSet = new Set(target.map((s) => s.ability));
    const extra = active.filter((s) => !targetSet.has(s.ability));
    const mats = new Map<string, number>();
    for (const a of all) for (const [m, n] of a.mats) mats.set(m, (mats.get(m) ?? 0) + n);
    for (const deco of d.decos) for (const [m, n] of deco.mats) mats.set(m, (mats.get(m) ?? 0) + n);
    const res: SolverResult = {
      armor: all,
      decos: d.decos,
      points: Object.fromEntries(abilities.map((a) => [a, totals[ai.get(a)!]])),
      active,
      extra,
      defense: all.reduce((n, a) => n + a.defense, 0),
      res: all.reduce(
        (r, a) => ({
          fire: r.fire + a.res.fire,
          thunder: r.thunder + a.res.thunder,
          dragon: r.dragon + a.res.dragon,
          water: r.water + a.res.water,
          ice: r.ice + a.res.ice,
        }),
        { fire: 0, thunder: 0, dragon: 0, water: 0, ice: 0 },
      ),
      cost: all.reduce((n, a) => n + a.cost, 0) + d.decos.reduce((n, x) => n + x.cost, 0),
      mats: [...mats.entries()].sort((a, b) => b[1] - a[1]),
      spare: slotsLeft(d.free),
      weaponSlots: input.weaponSlots,
    };
    results.push(res);
    onResult?.(res);
  };

  const dfs = (depth: number) => {
    nodes++;
    let timeUp = false;
    if (input.timeLimitMs !== undefined && (nodes & 1023) === 0) {
      timeUp = performance.now() > deadline;
    }
    if (nodes > maxNodes || timeUp) {
      truncated = true;
      return;
    }
    if (input.stopAtLimit && results.length >= limit) return;
    if (results.length >= maxResults) {
      truncated = true;
      return;
    }
    if (depth === partOrder.length) {
      leaf();
      return;
    }
    const part = partOrder[depth];
    for (const c of candidates[part]) {
      for (const [i, p] of c.vec) points[i] += p;
      free[c.a.slots]++;
      chosen.push(c);

      // Bound: remaining armor + best possible decorations.
      const totalSlots = slotsLeft(free) + suffixSlots[depth + 1] + input.weaponSlots;
      let possible = true;
      for (let i = 0; i < target.length; i++) {
        const a = ai.get(target[i].ability)!;
        const torsoBonus = 4 * Math.max(0, bodyMax[a]);
        const best = points[a] + suffix[depth + 1][a] + (bestDeco.get(a)?.[Math.min(18, totalSlots)] ?? 0) + torsoBonus;
        if (best < target[i].points) {
          possible = false;
          break;
        }
      }
      if (possible) dfs(depth + 1);

      chosen.pop();
      free[c.a.slots]--;
      for (const [i, p] of c.vec) points[i] -= p;
      if (truncated) return;
    }
  };

  // Weapon slots are a free-floating slot group.
  if (input.weaponSlots > 0) free[input.weaponSlots]++;
  dfs(0);
  if (input.weaponSlots > 0) free[input.weaponSlots]--;

  const sorted = sortSets(results, input.sort);
  return {
    results: input.stopAtLimit ? sorted.slice(0, limit) : sorted,
    nodes,
    elapsed: performance.now() - started,
    truncated,
  };
}
