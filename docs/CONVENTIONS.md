# Conventions

Style, naming, and architectural rules. When you're about to add a file or a
pattern that isn't here, check the closest existing example first.

---

## File-level

- **Every source file opens with a docblock** explaining what it is, who
  consumes it, and any non-obvious decisions. The catalog, the suitability
  engine, every store, every page have one — match the tone. Bullet lists are
  fine; over-explaining the obvious is not.
- **One concern per file.** A 600-line component is a smell; break it down
  before crossing 400 lines.
- **Co-locate small helpers** at the bottom of the file that uses them. Once a
  helper is needed in a second file, move it to `src/lib/utils.ts` or its
  domain module.
- **No `index.ts` re-export barrels.** Direct imports from `@/components/foo/Foo`
  are clearer in PRs and friendlier to Vite's HMR.

---

## TypeScript

- **`strict: true`** in `tsconfig.app.json`. No `any` — if you need to escape
  the type system, prefer `unknown` plus a narrowing function. Add a comment.
- **`noUnusedLocals` and `noUnusedParameters`** are on. Prefix intentionally
  unused params with `_`.
- **`verbatimModuleSyntax`** is off (Phase-0 scaffold was on, Phase 1 turned
  it off to allow type-only imports more freely). Still prefer `import type`
  for types-only imports.
- **Use the domain types in `src/lib/types.ts`.** If you find yourself defining
  a `CellScores`-shaped local type, you're duplicating; import.
- **Discriminated unions** for variant shapes (see `Transform` in `types.ts`):
  use `switch (t.type) { case 'linear': ... }` not `if`/`else`.

---

## React

- **Function components only.** No class components.
- **Hooks** at the top of the component, ordered: state → store selectors →
  memos → callbacks → effects. Read the existing `MapView.tsx` if unsure.
- **Memoise heavy derivations** with `useMemo` — the suitability calculation,
  layer data, `cellByH3` lookups. Don't over-memoise trivial work; the React
  compiler isn't here yet.
- **Zustand selectors are fine-grained**: `useFooStore((s) => s.field)`. Don't
  destructure the whole store unless you need every field.
- **No prop drilling past two levels.** Promote to a store or co-locate.
- **Use the existing UI primitives** in `src/components/ui/` — `Slider`,
  `Checkbox`, `IconButton`. They handle accessibility (Radix-backed). Don't
  reinvent them.

---

## Styling

- **Tailwind utility classes everywhere.** No CSS Modules, no styled-components.
- **Color tokens live in `tailwind.config.js`** under `theme.extend.colors`.
  Use the semantic names (`bg-bg-panel`, `text-ink-secondary`, `border-border`)
  rather than literal Tailwind colour numbers. If a token is missing, add it.
- **Spacing scale** is the default Tailwind scale (`px-3`, `py-2`, etc.).
- **Dark theme is the only theme** today. The CSS variables in `index.css`
  set the body background; component styling is dark-only.
- **`cn()` from `@/lib/utils`** for conditional class merging. Don't string-
  concatenate class names.
- **Icons from `lucide-react`** at consistent sizes: `h-3 w-3` for micro
  (inline indicators), `h-3.5 w-3.5` for small (panel rows), `h-4 w-4` for
  toolbar / nav. Don't add another icon library.

---

## Imports

- **`@/` alias** points to `src/`. Always use it for cross-feature imports.
- **Group imports**: external libs first, then `@/` imports, then relative.
  No empty lines between, just a single trailing newline.
- **Type-only imports**: `import type { Foo } from '@/lib/types'`.

---

## State

- **Don't add a new store** before checking that an existing one can hold the
  field. The Phase 1 stores are intentionally small.
- **Persisted stores** use Zustand's `persist` middleware with versioned keys
  (`homesite.<name>.v<n>`). When changing shape, bump the version and write a
  migration; never silently break stored data.
- **Selection state** is in `useUIStore` and is *not* persisted. A refresh
  drops the selected cell / listing.

---

## Files & naming

- **Component files** are `PascalCase.tsx`.
- **Hook files** are `useCamelCase.ts`.
- **Library / utility files** are `kebab-case.ts` — actually, **single-word
  lower-camel** like `catalog.ts`, `suitability.ts`. Multi-word with a hyphen
  like `color-ramp.ts` is fine; we have a mix (`colorRamp.ts` and similar) —
  prefer matching the directory's existing style.
- **Avoid abbreviations**. `useFavouritesStore`, not `useFavStore`.
- **British English** in UI copy and methodology prose (`favourites`,
  `neighbourhood`, `centre`). Code identifiers can be American (`color`,
  `behavior`) where it matches the underlying library.

---

## Map + deck.gl

- **`updateTriggers`** are mandatory on any layer accessor that closes over
  state outside the data array. Forgetting one is the canonical source of
  "the map stops updating."
- **One layer per concern**: `suitability-hex`, `listings`. Add a new id
  for any new layer and dispatch in `MapView.handleClick`.
- **Click resolution**: top-most picked object wins; if you add a layer
  that overlaps existing ones, audit the click handler.

---

## Routing

- **`react-router-dom` v6 `<Link>`** for in-app navigation. Don't use bare
  `<a href="/...">` for internal links — it hard-reloads the page.
- **Routes are declared in `src/App.tsx`.** Keep that file shallow; new
  routes should add a top-level component, not nest a router.

---

## Commits

- **Imperative subject line** under ~72 chars.
- **Body lines wrap at ~80 chars.** Use blank lines as paragraph breaks.
- **Co-author trailer for Claude work**:
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- **One concern per commit** ideally; tightly coupled refactors are OK to
  bundle but flag in the body.
- **Never `git commit --amend` after pushing.** Forward-only.
- **Never push to `main` directly.** PR every time. (Even if the auto-mode
  classifier didn't block it, the workflow is PR-first.)

---

## PRs

- Title under 72 chars; the body carries the detail.
- **Test plan** as a checklist in the body — see `.claude/skills/release-pr/SKILL.md`.
- **Reviewer notes**: call out any architecture decisions, anything that
  needs a deeper look, anything you're unsure about.
- **`tsc -b` and `vite build` must be green** before opening the PR.
