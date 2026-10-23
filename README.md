# MHFU Set Searcher

A small, offline-friendly web tool for Monster Hunter Freedom Unite:

**Live:** https://freezingsnail.github.io/mhfu-set-searcher/

- **Solver** — pick target skills and constraints, get legal armor + jewel combinations; skills are grouped as Attack, Sharpness, Gunner, Defense, Evasion, Comfort, Resistance, Gathering, and Felyne. Click any piece or jewel to inspect stats, skills, and materials.
- **Extend search** — groups extra active skills into class sections (Attack, Sharpness, Defense, etc.) as tuples; click a tuple to see matching sets, then add any tuple skill to the targets and rerun.
- **Builder** — assemble a set manually, add jewels, see live skills/defense/materials.
- **Sets** — save sets, compare 2–4 side by side, load or rename them.
- **Weapons** — fully expanded upgrade trees with branch guides, global search across all types, an All Types browse mode, rank badges (LR/HR/G), element/sharpness filters, stats, and materials.

No backend. Static Vite + React app.

## Run

```bash
npm install
npm run data   # regenerate src/data/*.json from vendor/
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
| [vallode/mhfu-blacksmith](https://github.com/vallode/mhfu-blacksmith) | Armor, weapon trees, stats, materials | MIT |
| [AthenaADP/MHFU-ASS](https://github.com/AthenaADP/MHFU-ASS) | Skill trees, jewel values, solver reference | MIT |

`npm run data` normalizes both into `src/data/`:

- 2,081 armor pieces
- 168 jewels
- 1,500 weapons
- 102 skill trees

Blacksmith armor values match ASS. Jewel **values** come from ASS (Blacksmith has a few spelling/semantic differences). Weapon data and tree order come from Blacksmith. Weapon rank is derived from rarity: 1–3 LR, 4–7 HR, 8–10 G.

Monster, quest, and item databases are intentionally out of scope.

## Solver notes

The search follows the Athena's ASS approach:

1. Filter armor by gender, hunter type, HR, elder star, and piercings. Dummy pieces are excluded; Torso Inc pieces are always considered and repeat the body piece's skill points.
2. Reduce each part to non-dominated pieces.
3. Depth-first search over parts with suffix bounds and a decoration upper bound.
4. At each leaf, assign jewels by slot size (1/2/3) until target gaps are closed.
5. Reject sets that activate bad skills unless allowed.

Jewels are assumed unlimited/craftable. Armor rank filters are cumulative: High includes Low, and G includes High + Low. Exhaustive searches are partitioned by head armor across a worker pool (up to 6 workers), and results stream progressively. Searches are capped at 3 seconds or 500 results to prevent runaway memory use. Results can be sorted by defense high/low, fewest jewels, most free slots, or lowest cost.

## Attribution

Monster Hunter is a trademark of Capcom. This is a personal fan tool, not affiliated with Capcom. Data remains subject to its upstream licenses and attribution requirements.
