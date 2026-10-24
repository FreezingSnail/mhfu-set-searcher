import type { GameData } from "./games";
import type { Charm, SolverResult } from "./types";

export type SetSelection = {
  picks: Record<string, string>;
  decoIds: string[];
  weaponSlots: number;
  charmId?: string;
};

export type SavedSet = SetSelection & {
  id: string;
  name: string;
  createdAt: number;
};

export function emptySelection(data: GameData): SetSelection {
  return {
    picks: Object.fromEntries(data.parts.map((p) => [p, ""])),
    decoIds: [],
    weaponSlots: 0,
    charmId: "",
  };
}

export function selectionFromResult(r: SolverResult): SetSelection {
  return {
    picks: Object.fromEntries(
      (["head", "body", "arms", "waist", "legs"] as const).map((p) => [
        p,
        r.armor.find((a) => a.part === p)?.id ?? "",
      ]),
    ),
    decoIds: r.decos.map((d) => d.id),
    weaponSlots: r.weaponSlots,
    charmId: r.charm?.id ?? "",
  };
}

export function selectionFromSaved(s: SavedSet): SetSelection {
  return {
    picks: s.picks,
    decoIds: s.decoIds,
    weaponSlots: s.weaponSlots,
    charmId: s.charmId ?? "",
  };
}

export function makeSavedSet(name: string, sel: SetSelection): SavedSet {
  return {
    ...sel,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    name,
    createdAt: Date.now(),
  };
}

export function loadSavedSets(key: string): SavedSet[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((x) => x && typeof x.name === "string" && x.picks)
      .map((x) => ({
        id: x.id ?? Math.random().toString(36).slice(2),
        name: x.name,
        picks: x.picks,
        decoIds: Array.isArray(x.decoIds) ? x.decoIds : [],
        weaponSlots: Number(x.weaponSlots) || 0,
        charmId: typeof x.charmId === "string" ? x.charmId : "",
        createdAt: Number(x.createdAt) || 0,
      }));
  } catch {
    return [];
  }
}

export function persistSavedSets(key: string, sets: SavedSet[]) {
  localStorage.setItem(key, JSON.stringify(sets));
}

function fitJewels(groups: number[], decos: { slots: number }[]) {
  let g1 = 0;
  let g2 = 0;
  let g3 = 0;
  for (const slots of groups) {
    if (slots === 1) g1++;
    else if (slots === 2) g2++;
    else if (slots === 3) g3++;
  }

  let d1 = 0;
  let d2 = 0;
  let d3 = 0;
  for (const deco of decos) {
    if (deco.slots === 1) d1++;
    else if (deco.slots === 2) d2++;
    else if (deco.slots === 3) d3++;
  }

  if (d3 > g3) {
    return { valid: false, spare: 0, slotError: "A 3-slot jewel needs a 3-slot piece." };
  }
  g3 -= d3;

  const useTwoSlotGroups = Math.min(d2, g2);
  g2 -= useTwoSlotGroups;
  d2 -= useTwoSlotGroups;
  if (d2 > g3) {
    return { valid: false, spare: 0, slotError: "A 2-slot jewel needs 2 slots on one piece." };
  }
  g3 -= d2;
  // Each 2-slot jewel placed in a 3-slot group leaves one usable slot.
  g1 += d2;

  const free = g1 + g2 * 2 + g3 * 3;
  if (d1 > free) {
    return { valid: false, spare: 0, slotError: "Not enough open slots for 1-slot jewels." };
  }
  return { valid: true, spare: free - d1, slotError: "" };
}

export function buildSet(data: GameData, sel: SetSelection, charms: Charm[] = []) {
  const armor = data.parts
    .map((p) => data.armorById.get(sel.picks[p]))
    .filter((a): a is NonNullable<typeof a> => !!a);
  const decos = sel.decoIds
    .map((id) => data.decoById.get(id))
    .filter((d): d is NonNullable<typeof d> => !!d);
  const charm = sel.charmId ? charms.find((c) => c.id === sel.charmId) ?? null : null;
  const points = new Map<string, number>();
  const add = (s: string, p: number) => points.set(s, (points.get(s) ?? 0) + p);
  for (const a of armor) for (const [s, p] of a.skills) add(s, p);
  const torso = armor.filter((a) => a.skills.some(([s]) => s === data.torsoSkill)).length;
  const body = armor.find((a) => a.part === "body");
  if (torso && body) for (const [s, p] of body.skills) add(s, p * torso);
  for (const d of decos) for (const [s, p] of d.skills) add(s, p);
  for (const [s, p] of charm?.skills ?? []) add(s, p);

  const active = data.skills
    .map((tree) => {
      const p = points.get(tree.ability) ?? 0;
      const tier = data.activeTier(tree.ability, p);
      return tier ? { ability: tree.ability, points: p, name: tier.name } : null;
    })
    .filter((x): x is { ability: string; points: number; name: string } => !!x);

  const slotGroups = [
    ...armor.map((a) => a.slots),
    sel.weaponSlots,
    charm?.slots ?? 0,
  ].filter((slots) => slots > 0);
  const totalSlots = slotGroups.reduce((n, slots) => n + slots, 0);
  const usedSlots = decos.reduce((n, d) => n + d.slots, 0);
  const fit = fitJewels(slotGroups, decos);
  const mats = new Map<string, number>();
  for (const a of armor) for (const [m, n] of a.mats) mats.set(m, (mats.get(m) ?? 0) + n);
  for (const d of decos) for (const [m, n] of d.mats) mats.set(m, (mats.get(m) ?? 0) + n);

  return {
    armor,
    decos,
    charm,
    points,
    active,
    totalSlots,
    usedSlots,
    valid: fit.valid,
    slotError: fit.slotError,
    spare: fit.spare,
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
