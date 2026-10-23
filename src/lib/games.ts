import mhfuArmorJson from "../data/armor.json";
import mhfuDecoJson from "../data/decorations.json";
import mhfuSkillJson from "../data/skills.json";
import mhfuWeaponJson from "../data/weapons.json";
import mhfuMetaJson from "../data/meta.json";
import mh3uArmorJson from "../data/mh3u/armor.json";
import mh3uDecoJson from "../data/mh3u/decorations.json";
import mh3uSkillJson from "../data/mh3u/skills.json";
import mh3uWeaponJson from "../data/mh3u/weapons.json";
import mh3uMetaJson from "../data/mh3u/meta.json";
import mh3uCharmMaxJson from "../data/mh3u/charm-max.json";
import type {
  Armor,
  Deco,
  Game,
  Part,
  SkillTree,
  Weapon,
} from "./types";
import type { SkillGroup } from "./skillOrder";
import { skillMeta, skillRank } from "./skillOrder";
import { skillMetaMh3u, skillRankMh3u } from "./skillOrderMh3u";
import { activeTier } from "./tiers";

export type SkillOption = {
  ability: string;
  tiers: { points: number; name: string }[];
  tags: string[];
  group: SkillGroup;
  rank: number;
};

type Meta = {
  armor: number;
  decorations: number;
  weapons: number;
  skills: number;
  builtAt: string;
};

export type GameData = {
  id: Game;
  label: string;
  title: string;
  blurb: string;
  storageKey: string;
  torsoSkill: string;
  charmSupport: boolean;
  armor: Armor[];
  decos: Deco[];
  weapons: Weapon[];
  skills: SkillTree[];
  meta: Meta;
  armorById: Map<string, Armor>;
  decoById: Map<string, Deco>;
  weaponByName: Map<string, Weapon>;
  skillTree: Map<string, SkillTree>;
  skillOptions: SkillOption[];
  parts: readonly Part[];
  partLabel: Record<string, string>;
  resLabel: Record<string, string>;
  typeLabel: Record<string, string>;
  weaponTypes: string[];
  rangedTypes: Set<string>;
  charmMax: Record<string, number>;
  skillMeta: (ability: string, tags?: string[]) => { group: SkillGroup; priority: number };
  skillRank: (ability: string, tags?: string[]) => number;
  activeTier: (ability: string, points: number) => { points: number; name: string } | null;
};

const PARTS = ["head", "body", "arms", "waist", "legs"] as const;
const PART_LABEL: Record<string, string> = {
  head: "Head",
  body: "Body",
  arms: "Arms",
  waist: "Waist",
  legs: "Legs",
};
const RES_LABEL: Record<string, string> = {
  fire: "Fire",
  water: "Water",
  thunder: "Thunder",
  ice: "Ice",
  dragon: "Dragon",
};

const RANGED = ["light-bowgun", "heavy-bowgun", "bow"];
const MH3U_TYPE_LABEL: Record<string, string> = {
  "great-sword": "Great Sword",
  "long-sword": "Long Sword",
  "sword-and-shield": "Sword & Shield",
  "dual-blades": "Dual Blades",
  hammer: "Hammer",
  "hunting-horn": "Hunting Horn",
  lance: "Lance",
  gunlance: "Gunlance",
  "switch-axe": "Switch Axe",
  "light-bowgun": "Light Bowgun",
  "heavy-bowgun": "Heavy Bowgun",
  bow: "Bow",
};

function makeGame(
  base: Omit<
    GameData,
    | "armorById"
    | "decoById"
    | "weaponByName"
    | "skillTree"
    | "skillOptions"
    | "activeTier"
  >,
): GameData {
  const skillTree = new Map(base.skills.map((s) => [s.ability, s]));
  const skillOptions = base.skills
    .map((s) => {
      const meta = base.skillMeta(s.ability, s.tags);
      return {
        ability: s.ability,
        tiers: s.tiers.filter((t) => t.points > 0),
        tags: s.tags,
        group: meta.group,
        rank: base.skillRank(s.ability, s.tags),
      };
    })
    .filter((s) => s.tiers.length)
    .sort((a, b) => a.rank - b.rank || a.ability.localeCompare(b.ability));

  return {
    ...base,
    armorById: new Map(base.armor.map((a) => [a.id, a])),
    decoById: new Map(base.decos.map((d) => [d.id, d])),
    weaponByName: new Map(base.weapons.map((w) => [w.name, w])),
    skillTree,
    skillOptions,
    activeTier: (ability, points) => activeTier(skillTree.get(ability), points),
  };
}

const mhfuTypeLabel: Record<string, string> = {
  "great-sword": "Great Sword",
  "long-sword": "Long Sword",
  "sword-and-shield": "Sword & Shield",
  "dual-blades": "Dual Blades",
  hammer: "Hammer",
  "hunting-horn": "Hunting Horn",
  lance: "Lance",
  gunlance: "Gunlance",
  "light-bowgun": "Light Bowgun",
  "heavy-bowgun": "Heavy Bowgun",
  bow: "Bow",
};

export const MHFU: GameData = makeGame({
  id: "mhfu",
  label: "MHFU",
  title: "MHFU Set Searcher",
  blurb: "Freedom Unite armor solver, builder, and weapon trees",
  storageKey: "mhfu-saved-sets",
  torsoSkill: "Torso Inc",
  charmSupport: false,
  armor: mhfuArmorJson as unknown as Armor[],
  decos: mhfuDecoJson as unknown as Deco[],
  weapons: mhfuWeaponJson as unknown as Weapon[],
  skills: (mhfuSkillJson as unknown as SkillTree[]).filter((s) => s.tiers.length),
  meta: mhfuMetaJson as Meta,
  parts: PARTS,
  partLabel: PART_LABEL,
  resLabel: RES_LABEL,
  typeLabel: mhfuTypeLabel,
  weaponTypes: Object.keys(mhfuTypeLabel),
  rangedTypes: new Set(RANGED),
  charmMax: {},
  skillMeta,
  skillRank,
});

export const MH3U: GameData = makeGame({
  id: "mh3u",
  label: "MH3U",
  title: "MH3U Set Searcher",
  blurb: "Ultimate armor solver, builder, charms, and weapon trees",
  storageKey: "mh3u-saved-sets",
  torsoSkill: "Torso Up",
  charmSupport: true,
  armor: mh3uArmorJson as unknown as Armor[],
  decos: mh3uDecoJson as unknown as Deco[],
  weapons: mh3uWeaponJson as unknown as Weapon[],
  skills: (mh3uSkillJson as unknown as SkillTree[]).filter((s) => s.tiers.length),
  meta: mh3uMetaJson as Meta,
  parts: PARTS,
  partLabel: PART_LABEL,
  resLabel: RES_LABEL,
  typeLabel: MH3U_TYPE_LABEL,
  weaponTypes: Object.keys(MH3U_TYPE_LABEL),
  rangedTypes: new Set(RANGED),
  charmMax: mh3uCharmMaxJson as Record<string, number>,
  skillMeta: skillMetaMh3u,
  skillRank: skillRankMh3u,
});

export const GAMES: Record<Game, GameData> = { mhfu: MHFU, mh3u: MH3U };
