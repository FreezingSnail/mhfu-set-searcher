import type { GameData } from "./games";
import type { SetSelection } from "./build";
import type { Charm, Game } from "./types";

const PARTS = ["head", "body", "arms", "waist", "legs"] as const;
const GAME_IDS: readonly Game[] = ["mhfu", "mh3u", "mh4u", "mh4u+"];
const MAX_TOKEN_LENGTH = 20_000;
const MAX_NAME_LENGTH = 80;
const MAX_ID_LENGTH = 120;
const MAX_DECOS = 200;

export type SharedSetPayload = {
  game: Game;
  name: string;
  selection: SetSelection;
  charm: Charm | null;
};

export type ResolvedSharedSet = {
  selection: SetSelection;
  charms: Charm[];
};

const isGame = (value: unknown): value is Game =>
  typeof value === "string" && (GAME_IDS as readonly string[]).includes(value);

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const clampInt = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback;
};

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const toBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string): string => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};

const wireCharm = (charm: Charm) => ({
  i: charm.id,
  n: charm.name,
  s: charm.slots,
  t: charm.table,
  r: charm.rarity,
  k: charm.skills,
});

const parseCharm = (value: unknown): Charm | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const slots = clampInt(raw.s, 0, 3, 0);
  const skills = Array.isArray(raw.k)
    ? raw.k
        .filter((entry): entry is [unknown, unknown] => Array.isArray(entry) && entry.length >= 2)
        .map(([ability, points]) => [text(ability, 40), clampInt(points, -99, 99, 0)] as [string, number])
        .filter(([ability]) => ability)
        .slice(0, 2)
    : [];
  if (!slots && !skills.length) return null;
  const name = text(raw.n, MAX_NAME_LENGTH);
  return {
    id: text(raw.i, MAX_ID_LENGTH),
    name:
      name ||
      skills.map(([ability, points]) => `${ability} ${points > 0 ? "+" : ""}${points}`).join(" / ") ||
      `${slots}-slot charm`,
    slots,
    table: clampInt(raw.t, 0, 17, 0),
    rarity: clampInt(raw.r, 0, 99, 0),
    skills,
  };
};

export function makeShareToken(set: SharedSetPayload): string {
  const payload = {
    v: 1,
    g: set.game,
    n: set.name,
    p: PARTS.map((part) => set.selection.picks[part] ?? ""),
    d: set.selection.decoIds,
    w: set.selection.weaponSlots,
    ...(set.charm ? { c: wireCharm(set.charm) } : {}),
  };
  return toBase64Url(JSON.stringify(payload));
}

export function makeShareLink(set: SharedSetPayload, currentHref: string): string {
  const url = new URL(currentHref);
  url.searchParams.set("share", makeShareToken(set));
  url.hash = set.game;
  return url.toString();
}

export function parseShareToken(token: string | null | undefined): SharedSetPayload | null {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  try {
    const raw: unknown = JSON.parse(fromBase64Url(token));
    if (!raw || typeof raw !== "object") return null;
    const payload = raw as Record<string, unknown>;
    if (payload.v !== 1 || !isGame(payload.g)) return null;
    const picks = Array.isArray(payload.p) ? payload.p : [];
    const decoIds = Array.isArray(payload.d)
      ? payload.d
          .map((id) => text(id, MAX_ID_LENGTH))
          .filter(Boolean)
          .slice(0, MAX_DECOS)
      : [];
    return {
      game: payload.g,
      name: text(payload.n, MAX_NAME_LENGTH) || "Shared set",
      selection: {
        picks: Object.fromEntries(
          PARTS.map((part, index) => [part, text(picks[index], MAX_ID_LENGTH)]),
        ),
        decoIds,
        weaponSlots: clampInt(payload.w, 0, 3, 0),
        charmId: "",
      },
      charm: parseCharm(payload.c),
    };
  } catch {
    return null;
  }
}

const sameCharm = (a: Charm, b: Charm): boolean =>
  a.slots === b.slots &&
  a.skills.length === b.skills.length &&
  a.skills.every(([ability, points], index) =>
    b.skills[index]?.[0] === ability && b.skills[index]?.[1] === points,
  );

export function resolveSharedSet(
  payload: SharedSetPayload,
  data: GameData,
  charms: Charm[],
): ResolvedSharedSet {
  const picks: Record<string, string> = {};
  for (const part of data.parts) {
    const id = payload.selection.picks[part] ?? "";
    const armor = id ? data.armorById.get(id) : undefined;
    picks[part] = armor && armor.part === part ? armor.id : "";
  }
  const decoIds = payload.selection.decoIds.filter((id) => data.decoById.has(id));

  let nextCharms = charms;
  let charmId = "";
  if (payload.charm && data.charmSupport) {
    const existing = charms.find((charm) => sameCharm(charm, payload.charm!));
    if (existing) {
      charmId = existing.id;
    } else {
      // Reuse the sender's id when it is free so repeated imports stay stable.
      const id =
        payload.charm.id && !charms.some((charm) => charm.id === payload.charm!.id)
          ? payload.charm.id
          : newId();
      nextCharms = [{ ...payload.charm, id }, ...charms];
      charmId = id;
    }
  }

  return {
    selection: {
      picks,
      decoIds,
      weaponSlots: clampInt(payload.selection.weaponSlots, 0, 3, 0),
      charmId,
    },
    charms: nextCharms,
  };
}
