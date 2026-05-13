# Handover — lessons learned, traps, working style

A note from the previous Claude session to the next. Distinct from
[`ARCHITECTURE.md`](./ARCHITECTURE.md) (which describes *what is*) and
[`CLAUDE.md`](../CLAUDE.md) (which is operational). This file captures
*what I learned doing it* — patterns that paid off, anti-patterns I hit
and reverted from, observations about the user's working style.

If you only read one thing before touching the codebase, read **CLAUDE.md**.
If you read two, add this.

---

## 0. The 60-second mental model

- **What this app is**: a UK property suitability prototype. Per-cell
  pre-standardised scores → weighted linear combination on the client →
  Viridis heatmap. Two regions (London, West Midlands). 18 criteria.
  Synthetic listings + user-pinned properties scored by the same engine.
- **Why it works**: all the spatial computation is **upstream** (seed
  scripts standardise raw values into 0–100 per criterion). Runtime is
  a normalised weighted sum — sub-millisecond. The hard work is data and
  UX, not maths.
- **Where to find things**: file paths and recipes are in CLAUDE.md.
  Don't search from scratch; follow the trail there.

---

## 1. Workflow rules that will save you hours

### 1.1 PR everything

The Claude Code auto-mode classifier **blocks direct pushes to `main`**
for changes of any meaningful size. Don't try to push to main. Branch,
push, open a PR via the URL GitHub returns. The user is fine with
PR-per-phase; that's the rhythm.

### 1.2 Two checks, run both, every time

```bash
npx tsc -b      # strict; catches unused locals + switch-fallthrough that vite won't
npx vite build  # bundler errors, dead imports, syntax
```

There is **no test runner** today (see `docs/TESTING.md`). The build is
the safety net. Both green = safe to commit. Either red = fix first.
`npm run lint` is optional and the user hasn't asked me to gate on it.

### 1.3 Seed JSON drift is noise

Running `npm run seed` rewrites `public/data/regions/<id>.{cells,listings}.json`
with a fresh `generatedAt`. If you only changed unrelated code, **don't
commit the seed JSON** — it's a 200-line diff of one timestamp + minor
float churn. Either:

- Don't run seed if you don't need to, or
- `git checkout -- public/data/regions/` to discard the timestamp drift
  before staging

### 1.4 CRLF warnings on git add are harmless

Windows + git-bash will warn about LF→CRLF on every staged TS file.
Ignore them. Don't change `core.autocrlf`. Don't add `.gitattributes`
to silence them. They don't affect anything.

### 1.5 Commit messages are doing real work

The repo has no PR review process; the commit message + PR body is the
review. Use the HEREDOC pattern with explicit phase numbering and a
section per change. The user reads these — they're how a phase becomes
self-documenting six months later. Templates in the existing commits.

### 1.6 Use the skill files

`.claude/skills/<name>/SKILL.md` are real procedural docs. Read the
matching one before doing the work — `add-criterion`, `add-region`,
`work-with-listings`, `work-with-pinned-properties`, `release-pr`.
They list every file that must change in lockstep. Skipping any one
is how silent breakage happens.

---

## 2. Architecture calls that paid off

### 2.1 H3 + per-cell standardised scores

Everything else hinges on this. We could've gone raster-math or
per-pixel WebGL shaders; we chose **H3 hex cells with pre-standardised
0–100 scores per criterion**. Pros stack:

- WLC is a weighted sum, sub-ms for ~9k cells in plain JS
- "What's the score at this point?" is `resultsByH3.get(h3)` — O(1)
- Roll-ups to neighbourhoods are H3 hierarchy traversals
- Pinned properties join cleanly via `latLngToCell(lat, lng, 8)`

Don't try to be clever and "smooth" the visual with a HeatmapLayer
unless you're keeping the H3 grid as the picking source. The hex
discontinuity is a feature, not a bug — it makes click-to-explain
exact.

### 2.2 Shared standardiser between seed and runtime

`src/lib/standardize.ts` is imported by **both** the seed scripts
(`scripts/generate-*-seed.ts`) and the runtime (`src/lib/suitability.ts`
indirectly, via cell data). If you change the transform shape, both
sides move in lockstep automatically. This is the single most important
piece of glue in the codebase.

### 2.3 Multi-region via registry + lazy fetch

Phase 1.1 was the pivotal architectural move. Before: seed JSON
inlined as ES modules — every new region inflated the initial bundle.
After: `src/lib/regions.ts` is a small registry of metadata + asset
URLs; `public/data/regions/*.json` is fetched on demand via TanStack
Query. Adding a region is now a registry entry + a seed script. The
initial bundle does **not** grow.

If a future session is asked to add Manchester / Bristol / Edinburgh /
etc., follow `.claude/skills/add-region/SKILL.md`. Do not ship region
data via static import.

### 2.4 Methodology lives next to the catalog

Every criterion in `catalog.ts` has a paired entry in `methodology.ts`
carrying authored prose, cited real sources (URL, publisher, licence,
cadence, last-known publication), and caveats. The ⓘ link on each
priority row deep-links into the rendered page at `/methodology/<id>`.

**Hard rule**: when you add a criterion, you MUST add the methodology
entry. There's no compile-time check enforcing this; the page just
404s. Add a `for (const c of CRITERIA) assert METHODOLOGY_BY_ID[c.id]`
test the moment a test runner exists.

### 2.5 The runtime portals fallback

`resolveListingPortals(listing)` in `src/lib/listings.ts` rebuilds the
URL structure from `lat/lng/postcode/price/beds` if `listing.portals`
is missing. This came from a real bug — a user with stale HTTP-cached
pre-Phase-1.4 listing JSON had no `portals` and the panel crashed.

**Take the lesson generally**: any field added to a persisted/fetched
shape should be either (a) optional with a resolver fallback, or (b)
backed by a versioned migration. Adding a field straight to a required
shape is asking for support load.

### 2.6 ErrorBoundary around third-party-prone subtrees

`src/components/util/ErrorBoundary.tsx` is a class component (hooks
can't catch render-time errors). It catches anything in its subtree
and renders a recoverable error UI. PropertyDetail is wrapped because
of the third-party iframe history (Phase 1.5 → 1.5.1 → 1.5.2). Any
new widget that loads cross-origin content or potentially-stale data
should also be wrapped.

The boundary auto-resets when its `key` prop changes — pass the
selected entity id so a new selection always remounts fresh.

### 2.7 `useNormalizedWeights()` as a single source of truth

The same "live %" share appears in CriterionRow, RankView, and the
LayerPanel header summary. Computing it three times would have been
fine performance-wise, but it would also be three places to forget
to update if the normalisation logic ever changes. Centralising in
a hook means changes propagate.

Pattern: when a derived value shows up in 3+ places, hoist to a hook
even if it's just a `useMemo`.

---

## 3. Anti-patterns that bit us — don't repeat

### 3.1 Iframe embeds of third-party maps

Phase 1.5 shipped a tabbed Google Maps / OpenStreetMap iframe preview
on PropertyDetail. **It worked for me locally and broke for the user**.
Two reasons:

- Google's `output=embed` pattern increasingly returns
  `X-Frame-Options: SAMEORIGIN`, producing a silent blank iframe.
- Corporate networks / privacy extensions block both providers
  outright.

When both fail, the panel reads as broken. Phase 1.5.1 swapped to an
inline MapLibre map; Phase 1.5.2 removed the embedded map entirely
because the main map already flies to the listing on selection.

**Rule**: don't add new iframe embeds of third-party services. Use
deep-links (open in new tab) for content that lives on those services.
If you must embed, expect blocking and add a graceful fallback that
matches the layout when the iframe doesn't load.

### 3.2 Single flat outbound URL field

Phase 1.3's `propertyUrl: string` couldn't expand cleanly when we
wanted multi-portal CTAs (Phase 1.4). The fix was a structured
`portals: { rightmoveSearch, zooplaSearch, … }`. Every time a field
might grow into siblings, model it as an object up front — even if
there's only one URL today.

### 3.3 Duplicating context the main map already shows

The inline MapLibre mini-map (Phase 1.5.1) duplicated what the main
map showed after fly-to-on-select. It looked good in isolation, but
it didn't add information. Phase 1.5.2 removed it.

**Rule**: ask "what does this surface add that an existing surface
doesn't?" before adding a new visualisation. Coverage is not the
same as value.

### 3.4 Trusting the cached data shape

Browser HTTP cache + `cache: 'force-cache'` + a schema change =
a runtime crash for some users. Phase 1.5.2 added the resolver
fallback. Phase 2 should add explicit cache-busting (hashed URLs)
to seed JSON.

### 3.5 Over-trusting deck.gl type signatures

`WebMercatorViewport.getBounds()` is typed as `[number, number,
number, number]` but older deck.gl versions returned `[[w,s],[e,n]]`.
The code in `MapView.tsx` accepts both shapes defensively because
this is the kind of upstream typing drift that bites silently.
Worth keeping the same belt-and-braces pattern around any deck.gl
call that returns coordinates.

---

## 4. Per-subsystem traps

### 4.1 Criteria

- The seed scripts and the runtime BOTH import `standardize()`. If you
  change the `Transform` shape in `types.ts`, both sides update on
  next compile — but you still have to **bump SEED_VERSION** in the
  generator and regenerate.
- Presets in `catalog.ts` MUST have a weight key for every criterion.
  When you add a criterion, add an entry to all 5 presets. Forgetting
  this means `preset.weights[<new_id>]` is `undefined`, the slider
  shows 0, and the user can't tell why their preset isn't using the
  new criterion.
- Demographic data must never feed the WLC (Equality Act guardrail).
  This is documented but easy to forget when adding a "population
  density" criterion. The catalog category `demographics` should
  always be `defaultEnabled: false` and excluded from hard-constraint
  options.

### 4.2 Regions

- The runtime is region-agnostic. Don't refactor it to be region-aware
  unless something genuinely needs it. Per-region behaviour is a
  registry entry + a seed script.
- PTAL outside London is a *proxy* (synthesised from rail/bus density).
  The criterion's name is "Transit accessibility (PTAL)" for shared
  comprehension, but the methodology page is explicit that it's not
  the TfL PTAL grid outside London. If you add a fourth region,
  remember to compute a PTAL proxy.

### 4.3 Listings

- Listings JSON is fetched from `public/data/regions/<id>.listings.json`
  with `cache: 'force-cache'`. Bumping the listing schema = stale-cache
  crashes for some users. Defensive resolvers required (see §2.5).
- `Listing.photos` are Unsplash *example* photos, surfaced in
  PropertyDetail with an "Example photo" overlay. Don't remove the
  overlay or rename the field — the honesty caption is the
  contract with the user.
- Portal URLs build from the listing's own fields (postcode, price,
  beds, lat/lng). They land on REAL Rightmove / Zoopla / OnTheMarket
  pages. Don't add a portal URL that 404s.

### 4.4 Pinned properties

- The pin's `regionId` and `h3` are computed at **save time**. If the
  user later edits coordinates, `usePinnedStore.update` recomputes
  both. Don't move this to query-time — it would mean recomputing for
  every render of the list.
- `Pinned.portals` is *not* a field — pin URLs are built on demand in
  PinnedDetail from coordinates/postcode/price/beds. Pins only carry
  data the user provided.
- postcodes.io has no API key and no advertised rate limit at this
  usage level. Don't add a paid geocoder unless usage actually grows.

### 4.5 Scoring transparency

- `useNormalizedWeights()` is the source of truth for live %. Compute
  it once per render via the hook; don't recompute inline. (You'll get
  the same answer but re-running `normalizeWeights` per row across
  18 rows is wasteful.)
- The two priority modes (Manual / Ranked) write to the same `weights`
  field. Switching modes doesn't reset weights — they're preserved.
  Don't try to "isolate" them by mode; the current shared-state model
  is what makes "drag-then-fine-tune" possible.
- Within Ranked mode, the two algorithms (reciprocal / linear) re-derive
  weights when the user switches scheme. The `queueMicrotask` defer in
  `RankView` matters — without it, `setOrderedRank` reads the previous
  scheme value because the React state update hasn't committed.

---

## 5. The user's working style — observations

These are inferences from how the user has worked with me across phases.
Treat as hypotheses, but worth biasing toward.

### 5.1 They want pragmatic, opinionated decisions

They rarely ask for options. They say "do as you feel is necessary"
and let me decide. The right move is to make a clear call, ship it,
and explain the reasoning in the commit + summary. Don't ask back-and-
forth questions when the answer is reasonable.

### 5.2 They surface UX problems specifically

When something doesn't work, they describe the symptom precisely:
"selecting a property takes me to a blank screen", "I find it hard to
source the original property listing", "the inspect tab isn't doing
what I expected". Listen to the friction. The fix usually isn't more
code; it's clarity.

### 5.3 They expect documentation to keep up

Every feature gets:
- Code
- A docs entry in `docs/` or an update to an existing doc
- A CLAUDE.md update if the source layout / patterns changed
- A skill if the change is procedural

They explicitly asked for this hierarchy in the docs/handover prompt
and the CLAUDE.md prompt. Don't shortcut it.

### 5.4 They like the synthesised-but-honest model

Don't try to fake real data. Don't pretend a synthetic listing is on
Rightmove. The "Example photo" overlay, the disclosure banner, the
Rightmove-search-for-comparables-not-the-listing pattern — these all
came from listening to their UX feedback. Honesty + useful outbound
links scaled better than fake-realism would have.

### 5.5 They want "modes" to read as modes, not tabs

Phase 1.7 → 1.8 history: priority tabs (Manual / Ranked) became
"modes" with explicit labelling, helper text, and persistent choice.
If a future phase introduces another either/or surface, frame it as
modes from the start.

### 5.6 They push back on duplicate visual surfaces

The PropertyLocationPreview map (Phase 1.5.1) → removed in 1.5.2
because "the main map already flies to it." If you're about to add
a second visualisation of the same information, expect them to ask
"do we need both?"

---

## 6. Phase progression — where we got to

```
phase-0-scaffold              Austin, 6 criteria, prove the UX
phase-1-uk                    UK retarget, London, 15 criteria, listings
phase-1.1-multi-region        West Midlands, +salary +gym, runtime fetch
phase-1.2-methodology         +nature_access, cited methodology pages
docs/claude-md                CLAUDE.md + skills hierarchy
feat/listings-discovery       filter / sort / postcode / viewport
feat/listings-portal-accuracy multi-portal URLs + Street View
feat/listings-embedded-preview iframe preview (reverted in 1.5.1)
fix/listings-preview-reliability inline MapLibre preview (reverted in 1.5.2)
fix/listings-portals-fallback optional portals + resolver + Street View card
feat/pinned-properties        user-added homes via postcode / map click
feat/scoring-transparency     live %, formula, hover tip, top-zones
feat/rank-schemes             reciprocal vs linear rank algorithms
docs/handover                 this file
```

Each phase is a branch. None have been merged to `main` yet — they
exist as a chain of PR-ready branches. The natural next moves:

1. **Merge the chain** — open PRs in order and merge to `main` once
   the user has approved each. The auto-mode classifier won't block
   merges, only direct pushes.
2. **Add a test runner** — Vitest + RTL + fast-check, starting with
   the catalog ↔ methodology integrity test and the suitability
   engine property tests in `docs/TESTING.md`.
3. **Real-data pipeline** — replace the synthetic seed generators
   with real ingest. The catalog and runtime don't change — the seed
   generators do. See `docs/data-sources-uk.md` for the per-criterion
   plan.
4. **A third region** — Manchester or Bristol. Follow
   `.claude/skills/add-region/SKILL.md`. Should take ~30 minutes if
   the synthetic generator pattern is followed.

---

## 7. Stuff I'd do differently if starting over

- **Add Vitest in Phase 0**, not "later." Three trivial tests
  (catalog-methodology pairing, normalizeWeights sums to 1,
  scoreCell respects hard constraints) would have caught more than
  the build does.
- **Hashed seed-file URLs** from Phase 1.1, not after a stale-cache
  bug. `public/data/regions/<id>.cells.<hash>.json` invalidates the
  HTTP cache automatically on every regen.
- **Mark all fields optional on first introduction**, then promote
  to required only after a deploy + cache window. Phase 1.4's
  `portals: ListingPortalUrls` (required) cost us a bug; same field
  as `portals?: ListingPortalUrls` (optional) would not have.
- **One ErrorBoundary at the App root** plus targeted ones around
  obvious-failure subtrees. The current single boundary around
  PropertyDetail catches a lot but leaves the rest of the panels
  unguarded.

---

## 8. Files to read in order, day one

1. `CLAUDE.md` — daily-driver brief
2. `docs/ARCHITECTURE.md` — design rationale, especially §2 (engine)
   and §2.4.1 (rank schemes)
3. `docs/LISTINGS.md` — most-iterated subsystem; lessons here
   generalise
4. `docs/PINNED.md` — user-owned data parallel to listings
5. `docs/data-sources-uk.md` — Phase 2 ingestion plan
6. `docs/TESTING.md` — current state, recommended stack
7. `docs/CONVENTIONS.md` — style rules
8. This file — meta-lessons
9. The relevant skill in `.claude/skills/<name>/SKILL.md`

That's about 90 minutes of reading. Worth every minute before touching
the code.

---

*Handover authored at the end of Phase 1.8. Build green, all branches
pushed, none yet merged to main.*
