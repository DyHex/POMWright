# 2H-1: *Internal → Documentation* says CI's site job runs all three checks only on changes that touch code or pages, and that the harness runs two; the site job runs two, on every run, and the harness runs all three

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 107 in [DECISIONS.md](../DECISIONS.md)
- **Area**: *Internal → Documentation* (`internal/documentation.md`), *What keeps it true*
- **Severity**: Low (a contributor-facing statement about which job runs which check; no behavior is wrong, but a
  contributor who relies on the site job to catch an *Error messages* drift, or who expects a docs-only push to skip
  the harness, is misled)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: new since 54cdada (429f2c2 added the error-message check to the list and to `pnpm typecheck` and
  `pack-test.sh` but not to the site job; f866325 made every job run on every run; neither updated the sentence, written
  at 84a550f when the three checks were the snippets, the API coverage and the links)
- **Reviewed**: `d850405`, 2026-10-28T19:08:33+01:00, Opus 5.5, second review, segment 2H

## Contract

`website/src/content/docs/internal/documentation.md`, *What keeps it true*, lines 44–45, after five bullets (the chains,
examples compile, nothing is skipped silently, the API is complete, every message is listed, links resolve):

> CI's site job runs all three checks and builds the site on every change that touches code or the pages, and the
> harness's type check runs the first two as well.

The rule the page follows: `website/AGENTS.md`, *Rules*, "Internal pages state what a part is for, how it works and
why"; and `AGENTS.md`, *How to work*, "Verified claims only".

## Reproduction

```sh
cd /home/magdys/workspace/dyhex/POMWright-second-review
sed -n '252,295p' .github/workflows/checks.yaml | grep -nE 'run: node scripts/check-'
grep -n '"typecheck"' package.json
grep -nE 'check-(doc-snippets|api-coverage|error-messages)' pack-test.sh
sed -n '3,5p' .github/workflows/checks.yaml
```

Exit 0 for each. Output:

```text
30:        run: node scripts/check-doc-snippets.mjs
32:        run: node scripts/check-api-coverage.mjs
12:  "typecheck": "tsc --noEmit -p test && … && node scripts/check-doc-snippets.mjs && node scripts/check-api-coverage.mjs && node scripts/check-error-messages.mjs",
44:node "$SCRIPT_DIR/scripts/check-doc-snippets.mjs"
45:node "$SCRIPT_DIR/scripts/check-api-coverage.mjs"
46:node "$SCRIPT_DIR/scripts/check-error-messages.mjs"
# The jobs of every CI run, called by pr.yaml (pull requests) and main.yaml (pushes to main). Every job runs on every
# run, whatever changed, so a run always tests what it reports on (on a pull request, GitHub's merge commit); skipping
# jobs by what changed saved minutes on docs-only pushes only. Lint runs biome and actionlint.
```

## Observed / expected

- The site job runs `check-doc-snippets.mjs` and `check-api-coverage.mjs` and builds the site (the link check); it does
  not run `check-error-messages.mjs`. "All three checks" now reads as three of the five bullets above it, and whichever
  three a reader picks, the site job runs two scripts and the build.
- The harness (`pack-test.sh`, and `pnpm typecheck`) runs all three scripts, not "the first two".
- No job is conditional on what changed since f866325 (the `changes` job and `scripts/ci-changes.sh` are gone), so "on
  every change that touches code or the pages" describes v3.0.1's CI.

Expected, for example: "CI's site job runs the snippet and API checks and builds the site on every run; the harness runs
all three scripts in every harness job." (Or, if the site job is meant to run all three, that is a change to
`checks.yaml`, 2G's and 2T's area, not to this page.)

## Cause

The sentence dates from 84a550f (2026-10-17), when the page listed three checks (snippets, API coverage, links) and CI
skipped jobs by what changed. 429f2c2 inserted *Every message is listed* (and *Nothing is skipped silently* came with
ff8a2ac), and f866325 removed the path-based skipping, without revisiting the closing sentence.

## Fix plan

- Intended contract: the page states which job runs which check, as `checks.yaml` and `pack-test.sh` do.
- Option A (recommended): rewrite lines 44–45 to name the scripts per job and drop "on every change that touches code
  or the pages". Cost: one sentence.
- Option B: also add `node scripts/check-error-messages.mjs` to the site job, so a docs-only pull request that edits
  *Error messages* is checked in the job that owns the pages. It already runs in every harness job, so this only moves
  where a failure shows; it is 2G's call, not needed for this finding.
- Tests: none; the page is prose.
- Docs: `internal/documentation.md` only. No changeset (docs only).
