import { ARMOR_BY_ID, DECO_BY_ID, PARTS, SKILLS } from "./data";
import { activeTier } from "./tiers";
import type { SolverResult } from "./types";

export type SetSelection = {
  picks: Record<string, string>;
  decoIds: string[];
  weaponSlots: number;
};

export type SavedSet = SetSelection & {
  id: string;
  name: string;
  createdAt: number;
};

const STORE = "mhfu-saved-sets";

export function emptySelection(): SetSelection {
  return { picks: Object.fromEntries(PARTS.map((p) => [p, ""])), decoIds: [], weaponSlots: 0 };
}

export function selectionFromResult(r: SolverResult): SetSelection {
  return {
    picks: Object.fromEntries(PARTS.map((p) => [p, r.armor.find((a) => a.part === p)?.id ?? ""])),
    decoIds: r.decos.map((d) => d.id),
    weaponSlots: r.weaponSlots,
  };
}

export function selectionFromSaved(s: SavedSet): SetSelection {
  return { picks: s.picks, decoIds: s.decoIds, weaponSlots: s.weaponSlots };
}

export function makeSavedSet(name: string, sel: SetSelection): SavedSet {
  return {
    ...sel,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    name,
    createdAt: Date.now(),
  };
}

export function loadSavedSets(): SavedSet[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((x) => x && typeof x.name === "string" && x.picks)
      .map((x) => ({
        id: x.id ?? Math.random().toString(36).slice(2),
        name: x.name,
        picks: x.picks,
        decoIds: Array.isArray(x.decoIds) ? x.decoIds : [],
        weaponSlots: Number(x.weaponSlots) || 0,
        createdAt: Number(x.createdAt) || 0,
      }));
  } catch {
    return [];
  }
}

export function persistSavedSets(sets: SavedSet[]) {
  localStorage.setItem(STORE, JSON.stringify(sets));
}

export function buildSet(sel: SetSelection) {
  const armor = PARTS.map((p) => ARMOR_BY_ID.get(sel.picks[p])).filter((a): a is NonNullable<typeof a> => !!a);
  const decos = sel.decoIds.map((id) => DECO_BY_ID.get(id)).filter((d): d is NonNullable<typeof d> => !!d);
  const points = new Map<string, number>();
  const add = (s: string, p: number) => points.set(s, (points.get(s) ?? 0) + p);
  for (const a of armor) for (const [s, p] of a.skills) add(s, p);
  const torso = armor.filter((a) => a.skills.some(([s]) => s === "Torso Inc")).length;
  const body = armor.find((a) => a.part === "body");
  if (torso && body) for (const [s, p] of body.skills) add(s, p * torso);
  for (const d of decos) for (const [s, p] of d.skills) add(s, p);

  const active = SKILLS.map((tree) => {
    const p = points.get(tree.ability) ?? 0;
    const tier = activeTier(tree.ability, p);
    return tier ? { ability: tree.ability, points: p, name: tier.name } : null;
  }).filter((x): x is { ability: string; points: number; name: string } => !!x);

  const totalSlots = armor.reduce((n, a) => n + a.slots, 0) + sel.weaponSlots;
  const usedSlots = decos.reduce((n, d) => n + d.slots, 0);
  const mats = new Map<string, number>();
  for (const a of armor) for (const [m, n] of a.mats) mats.set(m, (mats.get(m) ?? 0) + n);
  for (const d of decos) for (const [m, n] of d.mats) mats.set(m, (mats.get(m) ?? 0) + n);

  return {
    armor,
    decos,
    points,
    active,
    totalSlots,
    usedSlots,
    spare: totalSlots - usedSlots,
    defense: armor.reduce((n, a) => n + a.defense, 0),
    res: armor.reduce(
      (r, a) => ({
        fire: r.fire + a.res.fire,
        water: r.water + a.res.water,
        thunder: r.thunder + a.res.thunder,
        ice: r.ice + a.res.ice,
        dragon: r.dragon + a.res.dragon,
      }),
      { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 },
    ),
    cost: armor.reduce((n, a) => n + a.cost, 0) + decos.reduce((n, d) => n + d.cost, 0),
    mats: [...mats.entries()].sort((a, b) => b[1] - a[1]),
  };
}
