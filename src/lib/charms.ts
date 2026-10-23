import type { Charm } from "./types";

export function loadCharms(key: string): Charm[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((c) => c && typeof c.id === "string" && Array.isArray(c.skills))
      .map((c) => ({
        id: c.id,
        name: typeof c.name === "string" && c.name ? c.name : "Charm",
        slots: Math.max(0, Math.min(3, Number(c.slots) || 0)),
        table: Math.max(0, Math.min(17, Number(c.table) || 0)),
        rarity: Number(c.rarity) || 0,
        skills: c.skills
          .filter((s: unknown): s is [string, number] => Array.isArray(s) && typeof s[0] === "string")
          .map(([ability, points]: [string, number]) => [ability, Number(points) || 0]),
      }));
  } catch {
    return [];
  }
}

export function persistCharms(key: string, charms: Charm[]) {
  localStorage.setItem(key, JSON.stringify(charms));
}

export function makeCharm(input: Omit<Charm, "id" | "name" | "rarity"> & { name?: string }): Charm {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const label = input.skills
    .filter(([, points]) => points !== 0)
    .map(([ability, points]) => `${ability} ${points > 0 ? "+" : ""}${points}`)
    .join(" / ");
  return {
    ...input,
    id,
    name: input.name?.trim() || label || `${input.slots}-slot charm`,
    rarity: 0,
  };
}
