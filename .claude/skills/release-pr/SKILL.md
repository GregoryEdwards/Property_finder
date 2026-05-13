---
name: release-pr
description: Use when the user asks to commit and open a PR, or when finishing a phase of work. Walks the verification + commit + branch + push + PR-body steps. Direct pushes to main are blocked by the Claude Code classifier — always branch.
---

# Releasing changes via PR

A pre-flight checklist plus the canonical command sequence. The shape is
deliberately the same every time so reviewers know what to expect.

---

## 1. Pre-flight

Run these in order. Stop and fix on any red.

```bash
npx tsc -b                # type-check
npx vite build            # production build
npm run lint              # eslint (optional; flag don't block)
```

If the change touches `src/lib/catalog.ts`, `src/lib/standardize.ts`, or any
`scripts/generate-*-seed.ts`:

```bash
npm run seed              # regenerate region JSON
```

Otherwise skip the seed step — region JSON regenerating only changes
`generatedAt`, which is noise.

If you changed something rendered on the map, run a manual smoke test:

```bash
npm run dev
```

…then click around: change a slider, switch regions, open a listing,
visit `/methodology/<some_id>`. The build won't catch runtime errors in
React rendering.

## 2. Branch naming

- **Feature**: `phase-<N>-<short-slug>` or `feat/<slug>`
- **Fix**: `fix/<slug>`
- **Docs**: `docs/<slug>`
- **Refactor**: `refactor/<slug>`

The project's phase branches are the canonical pattern:
`phase-1-uk`, `phase-1.1-multi-region`, `phase-1.2-methodology`. Keep that
shape for substantial features.

## 3. Commit

Use a HEREDOC for the message to preserve formatting. Trail with the
Claude co-author line.

```bash
git -c user.email="..." -c user.name="..." commit -m "$(cat <<'EOF'
<imperative subject under 72 chars>

<body — explain *why* and the high-level *what*. Bullets are fine.
Wrap at ~80 chars. Use blank lines between paragraphs.>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Never** `git commit --amend` after pushing. Forward-only.

## 4. Push

```bash
git push -u origin <branch>
```

If the classifier blocks a push to `main`, **do not work around it** — branch
instead (the block is intentional).

## 5. PR body

Open via `gh pr create` (when `gh` is available) or via the web URL
GitHub returns after a push. Suggested body shape:

```markdown
## Summary
<2–3 bullets — what changed at the highest level and why>

## What landed
<more detail; sub-bullets per area: catalog, seed, UI, etc.>

## Test plan
- [ ] `npx tsc -b` clean
- [ ] `npx vite build` clean
- [ ] Manually verified: <list of paths exercised>
- [ ] Region switch works
- [ ] Methodology page loads for any new criterion

## Reviewer notes
<call out architectural decisions, anything unsure, anything risky>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Title under 72 chars; the body carries detail. The PR URL goes in a
`<pr-created>` tag in the chat reply so the UI can render a status card:

```
<pr-created>https://github.com/owner/repo/pull/123</pr-created>
```

## 6. After the PR opens

- Don't merge with the auto-mode classifier's approval as a proxy for
  human review. The classifier gates the *push*, not the *merge*.
- If CI lights up red, fix on the branch and force-with-lease only if the
  user explicitly asks. Otherwise add follow-up commits.

---

## Anti-patterns

- ❌ Pushing to `main` directly (blocked anyway).
- ❌ Skipping `tsc -b` because "vite build will catch it" — it won't catch
  unused locals.
- ❌ Bundling seed regeneration into a PR that doesn't change seed-relevant
  code. The 8 MB of JSON drift is reviewer noise.
- ❌ Committing `dist/`. It's gitignored; keep it that way.
- ❌ Committing `CLAUDE.local.md` (gitignored — personal scratch).
- ❌ A 30-bullet PR description. Aim for "I could read this in 60 seconds."
