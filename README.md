# HomeSite — Property Finder

> A GIS multi-criteria decision-analysis tool for house hunters. Weight the
> spatial factors that matter to *you* (schools, commute, flood risk,
> hospitals, price, crime), and the app continuously surfaces the best zones
> on a map.

This repository is **Phase 0** of the project: a working web prototype that
proves the live, weight-driven suitability UX on a synthetic Austin metro
dataset. See [`docs/`](#documents) for the full requirements and tech specs.

---

## Quick start

```bash
npm install            # one-time
npm run seed           # regenerate the Austin demo dataset (optional)
npm run dev            # http://localhost:5173
```

Then move the priority sliders on the left panel and watch the heatmap
update in real time. Click any hex cell to see a contribution breakdown
in the right panel.

## What's included in Phase 0

- **Three-column desktop-style workspace** — priorities (left), map
  (center, dominant), results (right). Both side panels are collapsible.
- **Live suitability engine** running a weighted linear combination (WLC)
  over an H3 hexagonal grid client-side. ~3,000 cells × 6 criteria scored
  in well under one millisecond per slider move.
- **Six criteria** with category-grouped controls: flood risk, school
  rating, crime rate, hospital drive time, commute to anchor, median home
  price.
- **Hard constraints** modelled (cells violating any are masked, never
  rendered as "low score").
- **Explanation card** — clicking any cell shows the composite score and
  the ranked factor contributions. This is the most important UX feature;
  the entire architecture is shaped to make it cheap and exact.
- **Persona presets** — Family / Retiree / Remote-work / First-time buyer
  / Investor — wired to one-click weight loading.
- **Color-blind safe Viridis ramp** with a legend; switchable basemaps
  (dark, light, satellite).

## Architecture (Phase 0)

```
┌─────────────────────────────────────────────────────────┐
│ React + TypeScript + Vite                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  UI shell (Tailwind + Radix)                     │   │
│  │  Map: MapLibre basemap + deck.gl H3HexagonLayer  │   │
│  │  State: Zustand (profile, UI)                    │   │
│  │  Math: scoreCells() — WLC over per-cell scores   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Data: src/data/austin-seed.json (synthetic, 3k cells)  │
└─────────────────────────────────────────────────────────┘
```

The suitability engine is intentionally tiny: a normalized weighted sum
plus hard-constraint masking. The product work is in *standardization*
(turning native units like minutes/dollars into a 0–100 score per
criterion) and in the *UX of explanation*, not in the WLC math itself.

## Source layout

```
src/
  components/
    layout/       TopBar
    map/          MapView, Legend, basemap styles
    panels/       LayerPanel, ResultsPanel, ExplanationCard, RankedList
    ui/           Slider, Checkbox, IconButton
  data/
    austin-seed.json     synthetic seed dataset (regenerable)
    loader.ts            tiny accessor over the seed file
  lib/
    catalog.ts           6 Phase-0 criterion definitions + 5 presets
    suitability.ts       runtime WLC + constraint masking
    standardize.ts       raw -> 0..100 transform (shared w/ seed script)
    colorRamp.ts         Viridis sampler for deck.gl + CSS legend
    types.ts             domain types
    utils.ts             cn(), clamp(), value formatters
  state/
    useProfileStore.ts   weights, enabled flags, hard constraints
    useUIStore.ts        ephemeral UI (selection, opacity, basemap, panels)
scripts/
  generate-austin-seed.ts  deterministic synthetic data generator
```

## Roadmap

Phase 0 (this repo) → Phase 1: real data pipeline + MLS integration +
auth/profiles, then Phase 2: Tauri desktop wrapper, offline cache,
AHP weight derivation, sensitivity analysis. See the full spec for
the staged plan.

## Cartographic guardrails

- Suitability ramp is **Viridis** (perceptually uniform, color-blind safe).
- Cells that fail a hard constraint are **transparent**, not colored low.
- The explanation card always accompanies the score — never the score alone.
- Demographics layers will never feed the WLC (fair-housing guardrail).

## Documents

The product requirements and tech spec live in the original spec docs
that drove this scaffold. Phase 1 will land them as `docs/requirements.md`
and `docs/tech-spec.md` in this repo.

## License

TBD.
