# Testing

## State of testing today

There is **no automated test suite** in the Phase-1 codebase. This is a known
gap, not an oversight. The current safety net is:

| Check | Command | Catches |
|---|---|---|
| TypeScript strict compile | `npx tsc -b` | type errors, unused locals, switch-fallthrough |
| Vite production build | `npx vite build` | bundler-resolution errors, syntax issues, dead imports |
| `npm run lint` (ESLint) | `npm run lint` | a small set of React-hooks / refresh rules |
| Manual smoke test | `npm run dev` + click around | the rest |

**Both `tsc -b` and `vite build` must pass before any commit.** Treat the
build as the test runner until the real one lands.

---

## When to add tests

Add tests *now* if you are:

- **Touching the suitability engine** (`src/lib/suitability.ts`) — the WLC
  and constraint masking are correctness-critical. Property-based tests on
  `scoreCell` are appropriate.
- **Touching `src/lib/standardize.ts`** — every criterion's display value
  flows through here. Snapshot the transforms.
- **Adding a new criterion** — at minimum, assert that the catalog entry
  and the methodology entry both exist for the same id, that the transform
  passes a few representative raw values into 0..100, and that every preset
  includes a weight for the new criterion.
- **Refactoring the region loader** — verify the cache key shape and that
  switching regions doesn't leak the previous region's data into the new
  region's scoring.

Defer tests for:

- Pure UI styling.
- Map rendering — deck.gl + MapLibre are tested upstream; we'd be testing
  React glue we'd refactor anyway in Phase 2.

---

## Recommended stack (when we add it)

- **Vitest** — Vite-native, matches the project's runtime. Configure to run
  TypeScript directly via `tsx` or Vitest's built-in TS support.
- **React Testing Library** + **@testing-library/user-event** for component
  tests. Avoid Enzyme-style shallow rendering.
- **fast-check** for property-based tests of the WLC and the standardiser.
  Genuinely useful for catching off-by-one and direction errors.
- **Playwright** for the one or two end-to-end happy paths (open the app,
  swap a region, the heatmap repaints). Don't write a thousand UI tests in
  Playwright — that's brittle. A handful of smoke tests.

Add these as `devDependencies` and a `test` script in `package.json` when
you write the first test. Document the commands here when you do.

---

## What good tests look like for this codebase

### Suitability engine

```ts
import { scoreCell, normalizeWeights } from '@/lib/suitability'

test('weights normalise to 1', () => {
  const profile = makeProfile({ weights: { a: 5, b: 5 } })
  const w = normalizeWeights(profile, CATALOG)
  expect(w.a + w.b).toBeCloseTo(1)
})

test('hard constraint masks the cell', () => {
  const cell = makeCell({ raw: { flood_risk: 'HIGH' } })
  const profile = makeProfile({
    constraints: [{ criterionId: 'flood_risk', excludeCategories: ['HIGH'] }],
  })
  expect(scoreCell(cell, profile, CATALOG).score).toBeNull()
})
```

### Standardiser

```ts
test('fuzzy_decay returns 100 below idealMax', () => {
  expect(standardize(5, FUZZY_DECAY_5_30, 'less_is_better')).toBe(100)
})
test('fuzzy_decay returns 0 above acceptableMax', () => {
  expect(standardize(40, FUZZY_DECAY_5_30, 'less_is_better')).toBe(0)
})
```

### Catalog / methodology integrity

```ts
test('every criterion has a methodology entry', () => {
  for (const c of CRITERIA) {
    expect(METHODOLOGY_BY_ID[c.id]).toBeDefined()
  }
})
test('every preset weights every catalog criterion', () => {
  for (const p of PRESETS) {
    for (const c of CRITERIA) {
      expect(p.weights[c.id]).toBeDefined()
    }
  }
})
```

These three small tests would prevent the most likely Phase-2 regressions.

---

## CI

Not configured today. When you add a test suite, also add `.github/workflows/ci.yml`
with three jobs: `type-check`, `build`, `test` — gated on PRs to `main`.
Don't skip the type-check job even after adding Vitest; they catch different
things.
