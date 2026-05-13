---
name: add-criterion
description: Use when the user asks to add a new spatial criterion to the HomeSite suitability engine (e.g. "add a metric for X"). The skill walks the full set of files that must change in lockstep so the catalog, presets, both regions' seeds, and the methodology page all stay in sync.
---

# Adding a new criterion

A criterion change touches **six locations**. Skipping any of them yields a
silent break (the new criterion disappears from the layer panel, or the
methodology page 404s, or the WM region scores it as zero, etc.).

Touch all of them in one PR.

---

## 0. Decide the shape

Pin these before you touch any code:

- **`id`** (snake_case, stable forever; this is the persistence key).
- **`category`** — one of `safety | facilities | real_estate | environment | infrastructure | employment | demographics`. Demographics is display-only; see the hard rule in `CLAUDE.md`.
- **`unit`** — display string (`'minutes'`, `'GBP'`, `'µg/m³ annual mean'`, etc.).
- **`direction`** — `more_is_better | less_is_better | category`.
- **`transform`** — `linear` (with `min` + `max`), `fuzzy_decay` (with `idealMax`, `acceptableMax`, `curve`), or `categorical` (with `mapping`).
- **`defaultWeight`** — 0..10 on the UI scale.
- **`defaultEnabled`** — `true` for headline criteria, `false` for advanced.
- **`defaultHardConstraint`** — only if there's a natural "must not" semantic.

---

## 1. `src/lib/catalog.ts` — add the criterion definition

Add a `CriterionDefinition` object inside `CRITERIA` in the appropriate
category group. Keep neighbours alphabetically or thematically ordered with
the existing entries.

## 2. `src/lib/catalog.ts` — update every preset

Every entry in `PRESETS` must have a `weights[<new_id>]` value. Pick a
weight that matches the persona's logic (e.g. retiree weights GP-walk and
A&E highly, first-time-buyer weights price). Update `enabled` is computed
from weight > 0 in `applyPreset`, so weight 0 disables it.

If you skip this, the preset-picker silently shows weights of `undefined`.

## 3. Seed generators — add a `rawXxx()` function in **both** regions

- `scripts/generate-london-seed.ts`
- `scripts/generate-west-midlands-seed.ts`

For each region, add a generator function that returns the raw value for a
`(lat, lng)` cell. Use the existing helpers (`distKm`, `distToPolyline`,
`smoothField`) and the region's anchor points.

Phase 1 is synthetic — your raw values should be **spatially coherent**
with what a user familiar with the region would expect. Bias toward
plausible patterns; avoid pure noise.

Call the new generator inside the `for (const h3 of indexes)` loop and
write the result into `raw[<id>] = ...`. The `standardize()` call below
picks it up automatically because it iterates `CRITERIA`.

Bump `SEED_VERSION` in **both** scripts so cached payloads invalidate.

## 4. `src/lib/methodology.ts` — add the methodology entry

Author a `CriterionMethodology` for the new id with:

- `whatItMeasures` — 2–3 sentences, plain English.
- `whyItMatters` — 1–2 sentences, who weights it and why.
- `phase1Estimation` — describe exactly what you just wrote in step 3.
- `realSources` — at least one citation. Use the catalog's `dataSource`
  string as a hint; you may need to research the real publisher URL.
  Each citation needs: `name`, `publisher`, `url`, `licence`, `cadence`,
  `publisherLastKnown`.
- `caveats` — optional but encouraged.

Add the entry to the `METHODOLOGIES` array (preserves the index page
ordering).

If you skip this, the ⓘ link on the new criterion's row navigates to a
"Criterion not found" page.

## 5. Regenerate the seeds

```bash
npm run seed
```

This rewrites both regions' cell JSON. Verify the output:

```bash
ls -lh public/data/regions/
```

Both `<region>.cells.json` files should have an updated `generatedAt` and
larger file size if the criterion added new raw + score fields.

## 6. Type-check + build

```bash
npx tsc -b && npx vite build
```

Both must pass before commit.

---

## Final commit checklist

- [ ] Catalog entry in `src/lib/catalog.ts`
- [ ] Weight added to all five presets
- [ ] Raw-value generator in **both** seed scripts; `SEED_VERSION` bumped
- [ ] `npm run seed` ran; both region JSON files refreshed
- [ ] Methodology entry in `src/lib/methodology.ts` with at least one real source citation
- [ ] `npx tsc -b` clean
- [ ] `npx vite build` clean

If you don't tick all seven, the new criterion will silently break somewhere.
