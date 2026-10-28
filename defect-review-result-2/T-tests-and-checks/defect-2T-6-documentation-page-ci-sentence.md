# 2T-6: Internal → Documentation says CI's site job runs all three checks only when code or pages change, and the harness two of them; the site job runs two, every job runs on every change, and the harness runs all three

- **Kind**: documentation
- **Area**: docs of the checks: `website/src/content/docs/internal/documentation.md`, *What keeps it true*
- **Severity**: Low (an Internal page misdescribes where a check runs; a contributor relying on it would expect the
  site job to catch a missing error message, which only the harness jobs do)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: new since 54cdada: the sentence is unchanged since then and was accurate at 54cdada (its three
  checks were the snippet check, the coverage check and the links of the site build, and a `changes` job skipped
  jobs by path); f866325 (every job on every run) and 429f2c2 (the error-message check, in the harness only) made
  it stale
- **Reviewed**: `d850405`, 2026-10-28T18:43+01:00, Opus 5.5, second review, segment 2T

## Contract

The page itself, and what the repository does:

- `internal/documentation.md:44-45`: "CI's site job runs all three checks and builds the site on every change that
  touches code or the pages, and the harness's type check runs the first two as well." The section above it names three
  check scripts: `check-doc-snippets.mjs` ("Examples compile"), `check-api-coverage.mjs` ("The API is complete") and
  `check-error-messages.mjs` ("Every message is listed").
- `internal/tests-and-checks.md`, *CI*: "Every job runs on every run, whatever changed ... Skipping jobs by what changed
  was tried and dropped". `.github/AGENTS.md`: "`checks.yaml` (reusable), every job on every run, whatever changed".

## Reproduction

From the worktree root:

```sh
grep -n "check-" .github/workflows/checks.yaml pack-test.sh
grep -n "paths" .github/workflows/pr.yaml .github/workflows/main.yaml
```

```text
.github/workflows/checks.yaml:281:        run: node scripts/check-doc-snippets.mjs
.github/workflows/checks.yaml:283:        run: node scripts/check-api-coverage.mjs
.github/workflows/checks.yaml:292:          node scripts/check-diagrams.mjs
pack-test.sh:44:node "$SCRIPT_DIR/scripts/check-doc-snippets.mjs"
pack-test.sh:45:node "$SCRIPT_DIR/scripts/check-api-coverage.mjs"
pack-test.sh:46:node "$SCRIPT_DIR/scripts/check-error-messages.mjs"
```

(exit 0; the second command prints nothing and exits 1: no path filter). The `site` job (`checks.yaml:252-292`) runs
the snippet check, the coverage check, the build and the diagram check; the `harness` and `harness-node` jobs run
`pack-test.sh`, which runs all three check scripts.

## Observed / expected

Observed: the site job runs two of the three checks (not `check-error-messages.mjs`), on every run whatever changed;
the harness runs all three.

Expected (what the page should say): the site job runs the snippet and coverage checks, builds the site and renders
every diagram; every harness job runs all three checks through `pnpm typecheck`'s steps in `pack-test.sh`; every job
runs on every change.

## Cause

The sentence predates 429f2c2 (the error-message check, added to `pack-test.sh` and `pnpm typecheck` only) and the
removal of path filtering; neither change updated it.

## Fix plan

- **Intended contract**: the page says where each check runs, as `.github/AGENTS.md` and *Tests and checks* already do.
- **Options**:
  1. (recommended) Replace the sentence: "CI's site job runs the snippet and coverage checks, builds the site and
     renders every diagram; every harness job runs all three checks, as `pnpm typecheck` does. Every job runs on every
     change." Cost: none.
  2. Also run `check-error-messages.mjs` in the site job, so the sentence's "all three" becomes true. Cost: a step;
     it duplicates the harness's run, and the site job is where a docs-only change would most likely fail first.
- **Implementation steps**: `website/src/content/docs/internal/documentation.md`, the paragraph after the list; for
  option 2, `.github/workflows/checks.yaml`, the site job (2G's area).
- **Tests**: none; the site build checks the page's links.
- **Docs**: the page itself.
- **Changeset**: none.
- **Decisions to tick**: option 2, if the site job should carry every docs check.

## Pass 3: the two readings

At 54cdada the section listed three checks (*Examples compile*, *The API is complete*, *Links resolve*), and "all three
checks" meant those, which the site job still runs. Read that way, two parts of the sentence are stale, not three: "on
every change that touches code or the pages" (since f866325 every job runs on every run), and the error-message check,
which the section now lists between them, is left out of where checks run (the harness jobs only). Read as the three
scripts the section names today, the site job runs two of them. Either way the recommended text above holds.
