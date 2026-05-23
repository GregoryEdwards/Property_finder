# Phase 2 Ingestion Pipeline

How real upstream data flows into `SeedFile.cells[].raw` and `.scores`.
Phase 2 replaces Phase 1's synthetic seed generators **one criterion at a
time**, without breaking the runtime UI: the combiner merges any subset of
migrated criteria into the existing seed and re‑runs `standardize()` per
cell. Unmigrated criteria pass through untouched.

---

## Pipeline shape

```
   ┌──────────────┐     ┌──────────┐     ┌──────────────┐     ┌─────────────┐
   │ upstream CSV │ ──▶ │ ingestor │ ──▶ │ processed/   │ ──▶ │  combiner   │ ──▶  public/data/
   │   (PPD,      │     │  (one    │     │  <region>/   │     │ build-seed  │      regions/<id>.cells.json
   │  police.uk,  │     │   per    │     │  <crit>.json │     │             │      (raw + scores + provenance)
   │  Ofcom, …)   │     │ criterion)     └──────────────┘     └─────────────┘
   └──────────────┘     └──────────┘
```

- Every ingestor is independent. No ordering, no shared state.
- The combiner is idempotent: rerunning produces byte‑stable output for
  the same inputs.
- The runtime app continues to read the same `SeedFile` shape it always
  has (`src/data/loader.ts`); only the `provenance` field is new and is
  optional.

---

## Ingestor contract

Every `scripts/ingest/<criterion>.ts`:

```ts
export async function ingest(opts: IngestOptions): Promise<IngestResult>
```

`IngestOptions` (see `scripts/ingest/lib/types.ts`):

| Field             | Required | Purpose                                                |
| ----------------- | -------- | ------------------------------------------------------ |
| `regionId`        | yes      | e.g. `'greater-london'`. Used for region‑scoped data.  |
| `h3Cells`         | yes      | Allow‑list of cells to populate.                       |
| `h3Resolution`    | yes      | Must match the cells; usually `8`.                     |
| `bbox`            | yes      | West/south/east/north — for bounding queries.          |
| `outDir`          | yes      | `scripts/data/processed/<regionId>/`.                  |
| `useFixtures`     | no       | When true, ignore env‑var overrides and use bundled fixtures. |
| `today`           | no       | Inject `Date` for deterministic trailing‑window tests. |
| `regionCellCount` | no       | Override denominator for ratio metrics in tests.       |

`IngestResult`: `{ criterionId, count, outPath, provenance }`.

Each ingestor also has a CLI `main()` gated by
`process.argv[1]?.endsWith('<name>.ts')` and is wired into `package.json`
as `npm run ingest:<criterion>`.

---

## Adding a new ingestor — cookbook

1. **Pick the criterion id** from the `CRITERIA` array in
   `src/lib/catalog.ts`. The id is the only thing the combiner uses to
   look up the transform.
2. **Author** `scripts/ingest/<criterion>.ts` modelled on the closest
   existing ingestor (see "reference implementations" below).
3. **Add a fixture** under `scripts/ingest/fixtures/<source>-sample.csv`
   — a tiny representative slice so tests and CI run without network.
4. **Add a unit test** `scripts/ingest/<criterion>.test.ts`. Use the
   patterns in the reference implementations (compute expected H3 cells
   with `latLngToCell`, inject `today` and `regionCellCount`, write to
   a `mkdtempSync` directory).
5. **Wire scripts**:
   - `package.json`: `"ingest:<criterion>": "tsx scripts/ingest/<criterion>.ts"`
   - `.env.example`: document the override env var for real downloads
6. **Verify**:
   ```bash
   npm test
   npm run ingest:<criterion> -- --region=greater-london --fixtures
   npm run build-seed:london
   ```
7. **Smoke‑test in the UI** if the criterion is reaching production — run
   the build, load `npm run dev`, and confirm the cell scores look plausible.

### Reference implementations

| Pattern needed                                 | Look at                                |
| ---------------------------------------------- | -------------------------------------- |
| Postcode CSV → H3 (median aggregation)         | `scripts/ingest/median-price.ts`       |
| Postcode CSV → H3 (max aggregation)            | `scripts/ingest/broadband-speed.ts`    |
| Direct lat/lng points → H3 (count → ratio)     | `scripts/ingest/crime-rate.ts`         |
| Trailing‑window date filtering                 | `median-price.ts`, `crime-rate.ts`     |
| K‑ring fallback for sparse cells               | `median-price.ts`                      |

---

## Shared utilities (`scripts/ingest/lib/`)

| File              | Exports                                                  |
| ----------------- | -------------------------------------------------------- |
| `types.ts`        | `IngestOptions`, `IngestResult`, `RawByCell`, `RawValue` |
| `region.ts`       | `loadRegion`, `processedDirFor`, `rawCacheDir`, `repoRoot` |
| `cache.ts`        | `DownloadCache` (filesystem, SHA‑1 keyed)                |
| `onspd.ts`        | `loadPostcodeIndex`, `normalisePostcode`                 |
| `h3-aggregate.ts` | `groupPointsByH3`, `median`, `max`                       |
| `population.ts`   | `populationPerCell`, `regionTotalPopulation`             |

When the same logic shows up in a third ingestor, lift it into `lib/`.
Don't pre‑abstract: the existing utilities exist because two or more
ingestors needed them.

---

## Combiner

`scripts/build-region-seed.ts`:
- Reads `public/data/regions/<id>.cells.json` to get the cell layout.
- Reads every `scripts/data/processed/<id>/*.json` produced by ingestors.
- For each migrated criterion, overwrites `cell.raw[criterionId]` and
  recomputes `cell.scores[criterionId] = round(standardize(...))`.
- Writes `provenance[criterionId] = { kind: 'real', sourceName, sourceUrl, fetchedAt, version }`.
- Unmigrated criteria pass through unchanged.

The combiner does **not** download data. It only merges what ingestors
have already produced.

---

## Provenance

`SeedFile.provenance: Record<CriterionId, CriterionProvenance>` is an
optional field added in Phase 2.0. Each entry is one of:

```ts
{ kind: 'synthetic', generator: string, seedVersion: number }
{ kind: 'real', sourceName, sourceUrl, fetchedAt, version? }
```

The runtime UI is expected to surface this on the methodology page so a
"REAL (HM Land Registry, fetched 2026‑05‑13)" badge can replace the
generic "(synthetic for Phase 1 demo)" disclaimer once the wiring lands.

---

## Env‑var matrix

Real data is opt‑in per ingestor. Unset → fall back to the bundled
fixture. See `.env.example`.

| Variable                      | Used by               | Source                                                                                              |
| ----------------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| `ONSPD_CSV_PATH`              | `onspd.ts` (shared)   | <https://geoportal.statistics.gov.uk/search?q=ONSPD>                                                |
| `PPD_CSV_PATH`                | `median-price.ts`     | <https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads>                     |
| `POLICE_UK_CSV_PATH`          | `crime-rate.ts`       | <https://data.police.uk/data/>                                                                      |
| `OFCOM_BROADBAND_CSV_PATH`    | `broadband-speed.ts`  | <https://www.ofcom.org.uk/research-and-data/multi-sector-research/infrastructure-research/connected-nations> |

---

## Testing conventions

- Tests live next to the ingestor: `scripts/ingest/<criterion>.test.ts`.
- Always pass `useFixtures: true` from tests.
- For trailing‑window logic, **inject `today`** to avoid wall‑clock
  flake (`new Date('2026-05-13T00:00:00Z')`).
- For ratio metrics, **pass `regionCellCount`** so the denominator
  doesn't scale with the test's h3Cells subset.
- Compute expected H3 cells with `latLngToCell(lat, lng, 8)` directly
  rather than hard‑coding cell strings.

---

## Current migration status

| Criterion           | Status      | Source / Notes                                       |
| ------------------- | ----------- | ---------------------------------------------------- |
| `median_price`      | ✅ real     | HM Land Registry Price Paid Data (Phase 2.0)         |
| `crime_rate`        | ✅ real     | data.police.uk; uniform per‑cell pop denominator v1 (Phase 2.1) |
| `broadband_speed`   | ✅ real     | Ofcom Connected Nations (Phase 2.2)                  |
| `median_salary`     | ⏳ synthetic | ONS ASHE Table 8 — needs LSOA → H3 mapping infra     |
| `council_tax`       | ⏳ synthetic | VOA stock by band — same LSOA → H3 infra             |
| `flood_risk`        | ⏳ synthetic | EA Flood Map for Planning (point‑in‑polygon)         |
| `air_quality_no2`   | ⏳ synthetic | DEFRA UK‑AIR (raster sample)                         |
| `green_space`       | ⏳ synthetic | OS Open Greenspace (nearest polygon)                 |
| `nature_access`     | ⏳ synthetic | Multi‑layer polygon distance                         |
| `noise_road`        | ⏳ synthetic | DEFRA Strategic Noise Maps                           |
| `primary_school`    | ⏳ synthetic | Ofsted + GIAS (nearest school)                       |
| `secondary_school`  | ⏳ synthetic | Ofsted + GIAS                                        |
| `ptal`              | ⏳ synthetic | TfL WebCAT (London); compute proxy elsewhere         |
| `gym_access`        | ⏳ synthetic | OSM POIs + walk routing (needs router)               |
| `gp_walk_time`      | ⏳ synthetic | NHS ODS + walk routing                               |
| `ae_drive_time`     | ⏳ synthetic | NHS ODS + car routing                                |
| `fire_response`     | ⏳ synthetic | Stations + drive routing (modelled)                  |
| `commute_time`      | ⏳ synthetic | OpenTripPlanner / multi‑modal routing                |

---

## Known limitations

- **Uniform‑density population (v1)**: `crime_rate` uses a single
  population‑per‑cell value across each region. Replace with LSOA‑
  area‑weighted distribution when the LSOA boundary loader lands.
- **No download cache yet for HTTP fetches**: `cache.ts` is filesystem
  only. Add ETag + DuckDB once monthly multi‑GB downloads land.
- **No routing service yet**: Tier‑3 criteria (`gym_access`,
  `gp_walk_time`, `ae_drive_time`, `fire_response`, `commute_time`)
  are blocked on standing up OSRM / OpenTripPlanner in
  `docker-compose.yml`.
- **`npm run lint` is broken** on the base branch (ESLint 9.39 vs the
  current `eslint.config.js` flat‑config shape). Unrelated to ingestion.
