# 2G-3: The guide says every merge updates the site once its checks pass, but a green commit main has moved past is never deployed when the newer commit's CI fails

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 107 in [DECISIONS.md](../DECISIONS.md)
- **Area**: Pages: which commit `pages.yaml` deploys on each path; `.github/AGENTS.md` *Publish and Pages*
- **Severity**: Low (the deploy rule is sound and decided, only to deploy main's tip; the guide's broader promise and the
  workflow's comment overstate it, and a reader expecting a green fix to be live will not find it)
- **Semver of the fix**: none (docs and comments only)
- **Pass**: 1
- **First review**: new since 54cdada (3284aa4 made Pages deploy only main's tip; the promise, from 4d125f1, was true
  of the earlier rule, which deployed every green run)
- **Reviewed**: `d850405`, 2026-10-28T18:04:31+01:00, Opus 5.5, second review, segment 2G

## Contract

- `.github/AGENTS.md`, *Publish and Pages* (lines 52–54): "`pages.yaml` deploys the documentation site after `CI`
  succeeds on a push to `main`, … from the commit that run tested and only while it is `main`'s tip, **so every merge
  updates the site once its checks have passed** and deployments follow commit order, re-runs included".
- `pages.yaml` lines 40–41: "The newer commit's own run deploys a site that already holds this commit's changes, so only
  main's tip is deployed." The tip step's message (line 57): "that commit's own run deploys a site that already holds
  this one".
- `website/src/content/docs/internal/documentation.md`, *Building and publishing* (lines 61–66): Pages deploys "from the
  commit that run tested, so the site follows `main` and never shows a commit whose checks failed … skips a commit `main`
  has moved past, whose changes the newer commit's site already holds."
- `test/AGENTS.md` (lines 121–123): pull requests run chromium only, "so a firefox- or webkit-only failure shows in `CI`
  after the merge": the guide expects a red `CI` run on `main` now and then.

## Reproduction

`G/pages/sim.sh` (in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/`): a bare `origin` with A -> B (a docs
fix whose `CI` is green) -> C (merged while B's `CI` ran; its `CI` fails); the tip step of `pages.yaml`'s build job,
verbatim from the worktree, run as GitHub runs `shell: bash` in a checkout of B with `EVENT=workflow_run` and
`TESTED_SHA=B`; then the build job's condition for C's run, read from the workflow.

```sh
bash /home/magdys/workspace/dyhex/POMWright-second-review-probes/G/pages/sim.sh   # exit 0; output in G/pages/sim.out
```

```text
=== Pages run for CI(B) (green), main's tip is C:
main has moved past c3a725dd… to 34b3bd12…; that commit's own run deploys a site that already holds this one
  exit code: 0; outputs: deploy=false
=== Pages run for CI(C) (failed): the build job's condition
  if: github.event_name == 'workflow_dispatch' || ( github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push' && github.event.workflow_run.head_branch == 'main' && github.event.workflow_run.head_repository.full_name == github.repository)
  with event_name=workflow_run and workflow_run.conclusion=failure: false, so neither job runs; the site stays at A
```

## Observed / expected

B passed its checks and is never deployed; C's run deploys nothing either, because C's `CI` failed. The site stays at A
until a later commit's `CI` succeeds or someone starts Pages by hand. The same happens when B's waiting `CI` run gives
way to C's push (`main.yaml` lines 15–16) and C's fails. The guide promises that every merge updates the site once its
checks have passed, and the workflow's message says C's run "deploys a site that already holds this one", which it does
not when C's checks fail.

Two smaller overstatements on the same page of claims:

- `main.yaml` lines 13–14: "One run at a time, in push order, … an older commit's run can never finish after a newer
  one's". GitHub's docs (*Control workflow concurrency*, `G/ghdocs/concurrency.html`): runs in a concurrency group "are
  processed in first-in-first-out (FIFO) order according to the time each one started waiting on the concurrency group,
  not the time each workflow was dispatched. Since the actual start time of a job or run may vary, ordering is not
  guaranteed." Two pushes seconds apart can run out of order. No older site is deployed over a newer one even then: the
  tip check, not the order, prevents it (the probe above shows the tip check on its own).
- `documentation.md` line 63: "never shows a commit whose checks failed": a manual run (`workflow_dispatch`, which the
  same paragraph allows) builds main's tip whatever its checks say (`pages.yaml` lines 39 and 49–52: no check of `CI`).

## Cause

The guide describes the intent (every green merge reaches the site) rather than the rule the workflow implements (only a
green tip of main is deployed).

## Fix plan

Intended contract: the site shows the newest commit of `main` whose `CI` run succeeded while it was the tip, or what a
manual run built.

Options:

1. **Recommended**, docs only: `.github/AGENTS.md` lines 52–54: "so the site follows `main`'s tip once its checks have
   passed; a green commit that `main` has moved past waits for the next green run (a manual run deploys it sooner)";
   `pages.yaml` lines 40–41 and the message at line 57: "that commit's own run deploys, once its checks pass, a site that
   holds this one"; `main.yaml` lines 13–14: say that the tip check, not the queue's order, keeps an older site from
   replacing a newer one; `documentation.md` lines 61–66: the same, and "a manual run deploys main's tip as it is".
2. Behaviour: on a moved-on run, deploy the tested commit when the tip's `CI` has not succeeded. Costs a GitHub API read
   per run, and an older site could be deployed while the tip's run is still going, then replaced; not worth it for a
   documentation site.

Tests: none. Changeset: none. Decisions to tick: option 1.
