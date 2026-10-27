# G-8: A re-run of an older `CI` run that ends green redeploys that older commit's site over the newer one; `pages.yaml` has no check that `main` has moved on

- **Kind**: suspected
- **Area**: CI, `pages.yaml`; the ordering promise of `main.yaml`'s concurrency
- **Severity**: Low (the site shows an older commit's pages until the next push to `main` deploys again; nothing is
  published to npm, which `publish.yaml`'s guard prevents)
- **Semver of the fix**: none (workflow only)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided: the guard (2026-10-27, [DECISIONS.md #53](../DECISIONS.md))

## Contract

- `.github/workflows/main.yaml` lines 14-17: "One run at a time, in push order, so publish.yaml and pages.yaml, which
  start when a run succeeds, follow the order of the commits: an older commit's run can never finish after a newer
  one's and deploy its site over the newer site."
- `website/src/content/docs/internal/documentation.md` lines 45-47: pages.yaml deploys "from the commit that run tested,
  so the site follows `main` and never shows a commit whose checks failed. `CI` runs one push to `main` at a time, in
  order, so the deployments come in the order of the commits too. It is guarded as the publish workflow is".
- AGENTS.md §2: `pages.yaml` deploys "after `CI` succeeds on a push to `main`, guarded as `publish.yaml` is and
  building the commit that run tested".

## Reproduction

Not reproduced: it needs runs on GitHub, and nothing may be pushed or re-run from this review. What the files and
GitHub's documentation give:

1. `pages.yaml` lines 25-30 run the build for any `workflow_run` of `CI` that concluded `success` on a push to `main`
   in this repository, and line 36 checks out `github.event.workflow_run.head_sha`, the commit that run tested. Unlike
   `publish.yaml` (lines 27-37) it does not compare that commit with `main`'s tip.
2. A re-run "will also use the same `GITHUB_SHA` (commit SHA) and `GITHUB_REF` (git ref) of the original event"
   ([Re-running workflows and jobs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)).
3. "The `requested` activity type does not occur when a workflow is re-run"
   ([Events that trigger workflows, `workflow_run`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)):
   the page singles out `requested`, which implies that `completed`, the type both workflows listen to, does occur
   for a re-run. Not confirmed on a real run: the public run history of this repository has no re-run of `CI`
   (every `run_attempt` is 1, `github/ci-runs.json`).

The sequence: `CI` for commit A fails on a flaky job; B is pushed, `CI` for B succeeds and Pages deploys B; someone
re-runs A's failed jobs, they pass, the run concludes `success`, Pages builds and deploys A. Publish for the same event
stops at its guard (`main` is at B).

## Observed / expected

Expected by the documents above: deployments in commit order, and the site never older than the newest green commit.
Suspected: a re-run of an older run breaks both, since `main.yaml`'s concurrency orders only first attempts (a re-run
starts after the newer run has finished).

## Cause

`pages.yaml` builds the tested commit without asking whether it is still `main`'s tip; the ordering argument in
`main.yaml` assumes each commit's run completes once.

## Fix plan

- **Intended contract**: Pages deploys a commit only while it is `main`'s tip (or by hand).
- **Options**:
  - **(recommended)** Give `pages.yaml` the guard `publish.yaml` has: fetch `main` and continue only when
    `git rev-parse origin/main` equals `head_sha`. Cost: a run that is overtaken deploys nothing, as for Publish; the
    next green run deploys. (Testing `github.event.workflow_run.run_attempt == 1` instead would not do: it also skips a
    re-run of the newest commit, which should deploy.)
  - Accept it and correct `main.yaml`'s comment and `documentation.md` ("re-running an older run redeploys it").
- **Implementation steps**: `pages.yaml` build job, a first step as in `publish.yaml`; `workflow_dispatch` keeps
  building `github.sha`.
- **Tests**: none locally; a re-run on GitHub after a newer green commit shows a skipped deploy.
- **Docs**: `main.yaml` lines 14-17, `internal/documentation.md` "Building and publishing", AGENTS.md §2 (pages.yaml).
- **Changeset**: none.
- **Decisions to tick**:
  - [x] guard or documented limitation: **the guard** ([DECISIONS.md #53](../DECISIONS.md))
- **Execution order**: independent; the same step shape as `publish.yaml`'s guard (see G-5 if that guard changes).
