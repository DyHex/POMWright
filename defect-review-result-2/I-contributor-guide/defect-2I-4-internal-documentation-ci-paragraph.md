# 2I-4: *Internal → Documentation* says CI's site job runs "all three checks … on every change that touches code or the pages"; it runs on every run, runs two of the page's four checks, and the harness runs the error-message check the sentence leaves out

- **Kind**: documentation
- **Area**: the Internal pages' account of how the documentation is checked (`website/src/content/docs/internal/documentation.md`, *What keeps it true*)
- **Severity**: Low (a contributor-facing page describes CI's coverage of the docs wrongly; no check is missing from CI)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: new since 54cdada (f866325 made every job run on every run; 429f2c2 added the error-message check as a fourth bullet; the sentence, from 84a550f, was not updated by either)
- **Reviewed**: `d850405`, 2026-10-28 20:03 +0100, Opus 5.5, second review, segment 2I

## Contract

The page's sentence must describe the workflow (`website/AGENTS.md` *Rules*: "The code and its tests decide what the
docs say", and "a change of design updates them"). `.github/AGENTS.md` line 10: "`checks.yaml` (reusable), every job on
every run, whatever changed".

## Reproduction

`website/src/content/docs/internal/documentation.md` lines 44–45, closing *What keeps it true*:

> CI's site job runs all three checks and builds the site on every change that touches code or the pages, and the
> harness's type check runs the first two as well.

The section above it has four check bullets: **Examples compile** (`check-doc-snippets.mjs`), **The API is complete**
(`check-api-coverage.mjs`), **Every message is listed** (`check-error-messages.mjs`), **Links resolve** (the site build).

The workflow, `.github/workflows/checks.yaml`:

- lines 3–4 (header): "Every job runs on every run, whatever changed, so a run always tests what it reports on"; the
  `site` job has no `if:` (lines 252–293).
- the `site` job's steps: "Compile the documentation's examples" (`node scripts/check-doc-snippets.mjs`), "Check the API
  reference and the doc comments" (`node scripts/check-api-coverage.mjs`), "Build the site", "Render every diagram". No
  `check-error-messages.mjs`.
- the harness's type check (`pack-test.sh` lines 39–46, the same as `pnpm typecheck`) runs `check-doc-snippets.mjs`,
  `check-api-coverage.mjs` and `check-error-messages.mjs`.

History: `git log -S"runs all three checks" -- website/src/content/docs/internal/documentation.md` gives only `84a550f`
(2026-10-17), when the section had three check bullets (snippets, API coverage, links) and a `changes` job skipped jobs
by what changed. `f866325` (2026-10-27, "run every job on every run") removed that job; `429f2c2` (2026-10-28) added the
error-message check and its bullet.

## Observed / expected

Observed: "on every change that touches code or the pages" (there is no such condition since `f866325`); "all three
checks" (the section now lists four, and the site job runs the first two plus the build); "the harness's type check runs
the first two" (it runs three: the error-message check too).

Expected: "CI's site job, on every run, compiles the examples, checks the API reference and builds the site, which checks
the links; the harness's type check runs the snippet, API and error-message checks." (or the like, naming them).

## Cause

The sentence names its checks by count and position; two later commits changed both and neither edited it.

## Fix plan

- Intended contract: the page says which job runs which check, by name.
- Steps: rewrite the sentence as above, naming each check. Optionally the same pass checks *Internal → Tests and checks*
  for the same count-based wording.
- Docs: `website/src/content/docs/internal/documentation.md` *What keeps it true*. `website/AGENTS.md`'s rule
  "a change of design updates them" already covers it; 2I-2 is why such updates are missed.
- Changeset: none.
- Note: this page is in 2I's brief for its claims about the guide; the sentence is about CI, so 2H or 2G may report it
  too.
