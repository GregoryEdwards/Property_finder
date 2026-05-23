# Notes for AI sessions (CLAUDE.md)

Read this before making changes. Most surprises in this repo come from
not knowing one of the conventions below.

## What this is

HomeSite / Property_finder is a UK GIS multi‑criteria property finder.
The runtime is a static React + MapLibre + deck.gl SPA served from
Vite. Data lives in `public/data/regions/<id>.cells.json` and is fetched
per region. There is no backend.

## Phase landmarks

- **Phase 1.2** is the last fully shipped phase. 18 criteria, two regions
  (Greater London + West Midlands), synthetic seed data with each criterion
  carrying a forward‑looking source citation in `src/lib/methodology.ts`.
- **Phase 2** is the real‑data migration. It moves criteria from
  synthetic to real one at a time via per‑criterion ingestors under
  `scripts/ingest/`. Three criteria are migrated so far
  (`median_price`, `crime_rate`, `broadband_speed`); the rest still
  use the Phase 1 synthetic generators. See `docs/ingestion-pipeline.md`
  for the pipeline and `docs/data-sources-uk.md` for the source map.

## Critical files

| Path                                         | Why it matters                                                |
| -------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/catalog.ts`                         | Single source of truth for the 18 criteria + 5 presets.       |
| `src/lib/standardize.ts`                     | Raw → 0..100 transform. **Reuse, don't duplicate.**           |
| `src/lib/types.ts`                           | Domain types incl. `SeedFile`, `CellScores`, `CriterionProvenance`. |
| `src/lib/suitability.ts`                     | Runtime WLC + hard‑constraint masking.                        |
| `src/lib/methodology.ts`                     | Long‑form per‑criterion methodology with source citations.    |
| `src/data/loader.ts`                         | TanStack Query hooks for `cells.json` and `listings.json`.    |
| `scripts/generate-london-seed.ts`            | Phase 1 synthetic generator for London (still authoritative for unmigrated criteria). |
| `scripts/generate-west-midlands-seed.ts`     | Same for West Midlands.                                       |
| `scripts/build-region-seed.ts`               | Phase 2 combiner — merges ingestor outputs into the seed.     |
| `scripts/ingest/<criterion>.ts`              | Per‑criterion real‑data ingestors.                            |
| `scripts/ingest/lib/*.ts`                    | Shared ingest utilities — reuse before adding new ones.       |
| `public/data/regions/<id>.cells.json`        | The runtime data. Don't hand‑edit.                            |

## Commands

```bash
npm install              # one-off
npm run dev              # http://localhost:5173
npm test                 # vitest run (10 → 14 tests today)
npm run build            # tsc -b && vite build (TypeScript + production bundle)
npm run lint             # BROKEN on main (ESLint 9.39 vs config). Don't try to fix unless asked.

# Phase 1 synthetic seeds
npm run seed             # regenerate all synthetic seeds (London + WM)
npm run seed:london      # London only
npm run seed:wm          # West Midlands only

# Phase 2 real-data ingestors (one per criterion)
npm run ingest:median-price -- --region=greater-london [--fixtures]
npm run ingest:crime-rate   -- --region=greater-london [--fixtures]
npm run ingest:broadband-speed -- --region=greater-london [--fixtures]

# Phase 2 combine: merge processed/<region>/*.json into the SeedFile
npm run build-seed:london
npm run build-seed:wm
```

`--fixtures` forces ingestors to use bundled CSV samples in
`scripts/ingest/fixtures/`. Without it, ingestors look for real downloads
via env vars (see `.env.example`).

## Conventions that bite if violated

- **H3 resolution is fixed at 8.** The constant lives per generator
  (`scripts/generate-london-seed.ts:131`, etc.) and is also serialised
  into `SeedFile.h3Resolution`. Don't change it without also
  regenerating both region seeds.
- **Catalog → standardize → SeedFile is the data pipeline.** Don't add a
  parallel transform. If a criterion needs new transform behaviour, add
  a case to `Transform` in `types.ts` and `standardize()` — don't
  bypass them.
- **Each criterion carries a `dataSource` string** that ends with
  `(synthetic for Phase 1 demo)` while it's synthetic. When migrating a
  criterion to real data, the **combiner writes the `provenance` field**
  but does not yet rewrite the `dataSource` string — that's a UI‑side
  change paired with surfacing the provenance badge.
- **Demographic data never feeds the WLC.** Equality Act guardrail — the
  README and methodology page call this out. Display‑only at most.
- **No tests existed before Phase 2.0.** Adding tests is encouraged for
  any new ingestor or shared utility. Use `vitest` (already configured).
- **`scripts/data/raw/` and `scripts/data/processed/`** are gitignored —
  don't commit downloaded fixtures or processed JSON.

## Branch + PR workflow

The current development branch is `claude/audit-data-sources-zyKNr`.
Phase 2 migrations land as small PRs on top of it. Each PR migrates
one or more criteria, plus shared infra where needed. Draft PRs only —
don't mark ready for review unless asked.

The smoke‑test pattern for each migration:
1. Back up `public/data/regions/greater-london.cells.json`.
2. Run the ingestor (with `--fixtures`).
3. Run the combiner.
4. Verify `provenance.<criterion>` is written.
5. **Restore the seed file** so the PR diff stays scoped to scaffolding +
   the ingestor, not a hand‑edited seed.
6. Remove `scripts/data/processed/` between runs to avoid stale state.

## Common tasks → "look at" map

| Task                                                  | Reference                              |
| ----------------------------------------------------- | -------------------------------------- |
| Add a new criterion to the catalog                    | `src/lib/catalog.ts:19-295` + add a methodology entry in `src/lib/methodology.ts` |
| Add a new real‑data ingestor                          | `docs/ingestion-pipeline.md` cookbook  |
| Add a new region                                      | `README.md` "Adding a new region"      |
| Change how a criterion is standardised                | `src/lib/standardize.ts` + add a test  |
| Touch the WLC / hard‑constraint math                  | `src/lib/suitability.ts`               |
| Add a new transform shape                             | `src/lib/types.ts:Transform` + `standardize.ts` |

## Things that look broken but aren't

- **`npm run lint` fails** with `Cannot read properties of undefined (reading 'recommended')`. Pre‑existing ESLint 9.39 vs flat‑config mismatch. Leave it unless explicitly asked to fix.
- **Synthetic data still shipping for 15 of 18 criteria** is intentional. Phase 2 migrates one at a time.
- **The same hospital name appears at two different lat/lng across regions** (e.g. "St Thomas'") — these are synthetic placements deliberately using real‑sounding names. Documented in the audit (`docs/data-sources-uk.md` / methodology page).
