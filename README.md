# Monster Hunter Set Searcher

A small, offline-friendly web tool for **Monster Hunter Freedom Unite** and **Monster Hunter 3 Ultimate**:

**Live:** https://freezingsnail.github.io/mhfu-set-searcher/

Switch games from the MHFU / MH3U control in the header (or open `#mh3u` / `#mhfu` directly). Each game has its own saved sets.

## MHFU

- **Solver** — pick target skills and constraints, get legal armor + jewel combinations; skills are grouped as Attack, Sharpness, Gunner, Defense, Evasion, Comfort, Resistance, Gathering, and Felyne. Click any piece or jewel to inspect stats, skills, and materials.
- **Extend search** — groups extra active skills into class sections as tuples; click a tuple to see matching sets, then add any tuple skill to the targets and rerun.
- **Builder** — assemble a set manually, add jewels, see live skills/defense/materials.
- **Sets** — save sets, compare 2–4 side by side, load or rename them.
- **Weapons** — fully expanded upgrade trees split into Blademaster and Ranged sub-pages, with branch guides, search, rank badges (LR/HR/G), element/sharpness filters, stats, and materials. Ranged adds physical ammo, element/status, rapid-fire, and bow shot-type filters. Bowguns show reload, recoil, rapid fire, and full ammo capacities; bows show coatings and charge levels.

## MH3U

Same solver, builder, sets, and weapon-tree bones, plus charms:

- **Charms** — add your own charms (table, slots, up to two skills and point values). They are stored in the browser and can be used by the solver and builder.
- **Solver charm modes** — no charm, my charms, a best-possible single-skill charm, or a slot-only charm (O / OO / OOO with no skills).
- **Builder** — pick an owned charm alongside armor and jewels.
- **Sets** — charm is saved and compared with the rest of the set.
- **Weapons** — all 12 MH3U classes, including Switch Axe, Gunlance, Hunting Horn, bowguns, and bows. Weapon details cover phials, shelling, horn notes/songs, arc shots, coatings, deviation, crouching fire, and ammo capacities.

MHFU and MH3U saved sets live under separate local-storage keys, so switching games never mixes them.

No backend. Static Vite + React app.

## Run

```bash
npm install
npm run data   # regenerate src/data/ and src/data/mh3u/ from vendor/
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Pushes to `main` build and deploy to GitHub Pages via `.github/workflows/deploy.yml`.

## Data

Vendored snapshots, pinned under `vendor/`:

| Source | Used for | License |
|---|---|---|
| [vallode/mhfu-blacksmith](https://github.com/vallode/mhfu-blacksmith) | MHFU armor, weapon trees, stats, materials | MIT |
| [AthenaADP/MHFU-ASS](https://github.com/AthenaADP/MHFU-ASS) | MHFU skill trees, jewel values, solver reference | MIT |
| [AthenaADP/MH3U-ASS](https://github.com/AthenaADP/MH3U-ASS) | MH3U armor, jewels, skills, charm table maxima | MIT |
| [ArmoredRaven17/mh3u-collection-tracker](https://github.com/ArmoredRaven17/mh3u-collection-tracker) | MH3U weapon trees/stats, English armor + weapon materials | MIT code; game-derived data © Capcom |

`npm run data` normalizes them into `src/data/`:

- MHFU: 2,081 armor pieces, 168 jewels, 1,500 weapons, 103 skill trees
- MH3U: 1,651 armor pieces, 196 jewels, 1,395 weapons, 123 skill trees, 115 charm skill maxima

MH3U materials for a small number of DLC/collaboration pieces are absent from the tracker source and are left empty. Jewels have no cost/material data in the MH3U source.

Monster, quest, and item databases are intentionally out of scope.

## Solver notes

The search follows the Athena's ASS approach:

1. Filter armor by gender, hunter type, HR, elder star, and piercings. Dummy pieces are excluded; Torso Inc / Torso Up pieces are always considered and repeat the body piece's skill points.
2. Reduce each part to non-dominated pieces.
3. Depth-first search over parts with suffix bounds and a decoration upper bound.
4. At each leaf, assign jewels by slot size (1/2/3) until target gaps are closed.
5. Reject sets that activate bad skills unless allowed.

Jewels are assumed unlimited/craftable. Armor rank filters are cumulative: High includes Low, and G includes High + Low. MH3U treats port star and village star as alternative unlock sources (99 means “not from that source”), so village-only and port-only armor are both handled correctly.

Exhaustive searches are partitioned by head armor across a worker pool (up to 6 workers), and results stream progressively. Searches are capped at 3 seconds or 500 results to prevent runaway memory use. Results can be sorted by defense high/low, fewest jewels, most free slots, or lowest cost.

Charms are treated as an optional sixth equipment piece: owned charms add their skills and slots, and the best-charm mode adds the maximum single-skill roll plus 0–3 slots for each target skill. The solver does not assume two-skill best charms, because the legal pair/value combinations depend on the charm table.

## Attribution

Monster Hunter is a trademark of Capcom. This is a personal fan tool, not affiliated with Capcom. Data remains subject to its upstream licenses and attribution requirements.
