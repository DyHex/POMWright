# 2G-2: A re-run of a Publish run goes on after main has moved past the commit CI tested, and rebuilds the Version Packages pull request from that older commit

- **Kind**: defect
- **Area**: Release and publishing: `publish.yaml`'s guard on a re-run (every path through `publish.yaml`: a re-run)
- **Severity**: Low (needs a Publish run that failed, re-run after a later merge; its effect is a Version Packages pull
  request that silently drops the changesets merged since, and, if that pull request is merged, the skipped version of
  2G-1's path (c))
- **Semver of the fix**: none (the workflow and the contributor guide)
- **Pass**: 1
- **First review**: missed by the first review (the guard dates from e856a80, 2026-10-22, before 54cdada; its
  comparison with `git rev-parse HEAD` is unchanged since)
- **Reviewed**: `d850405`, 2026-10-28T18:03:15+01:00, Opus 5.5, second review, segment 2G

## Contract

- `.github/AGENTS.md`, *The workflows* (lines 31–33): Publish is "guarded … by a step that goes no further when `main`
  has moved past the commit that run tested (a `workflow_run` checks out the newest commit; …)".
- `.github/AGENTS.md`, *Publish and Pages* (lines 47–49): "A `workflow_run` checks out the newest commit on `main`, so
  `publish.yaml` compares it with the commit the run tested and goes no further when `main` has moved on".
- `main.yaml` lines 16–17: "A re-run of an older run keeps its commit, so pages.yaml deploys only main's tip and
  publish.yaml goes on only on it: deployments follow commit order, re-runs included."
- `website/src/content/docs/internal/tests-and-checks.md`, *CI* (lines 99–102): "A run that `workflow_run` starts checks
  out the newest commit on `main` … so `publish.yaml` first compares the two and goes no further when `main` has moved
  on".
- GitHub's docs, *Re-running workflows and jobs* (saved as `G/ghdocs/rerun.html`): "The workflow will also use the same
  GITHUB_SHA (commit SHA) and GITHUB_REF (git ref) of the original event that triggered the workflow run." For
  `workflow_run`, `GITHUB_SHA` is the "Last commit on default branch" (*Events that trigger workflows*,
  `G/ghdocs/events.html`), and `actions/checkout` checks it out.

So a re-run of a Publish run checks out main's tip as it was when the run first started, not the newest commit, and the
guard's `git rev-parse HEAD` (`publish.yaml` line 51) compares that old commit with the tested one. `pages.yaml` reads the
live tip with `git ls-remote origin refs/heads/main` (line 53) and is not affected.

## Reproduction

`G/guard/rerun.sh` (in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/`) makes a bare `origin` and a runner
clone: O (3.0.1, released) -> P (a fix with a changeset) is pushed, the runner checks out P (the original run's
`GITHUB_SHA`); then C (another fix with a changeset) is pushed to `origin`, and the guard's `run:` script, taken verbatim
from the worktree's `publish.yaml`, runs in the runner's checkout as GitHub runs `shell: bash`, with `TESTED_SHA=P`.
`G/guard/plan.mjs` then computes, read-only, what changesets/action v2.1.2 does there (see 2G-1). The action's version
path resets the `changeset-release/main` branch to `context.sha` (the run's `GITHUB_SHA`) and force-pushes it
(`src/github.ts` lines 239–257 at the pinned commit, saved in `G/changesets-action/src_github.ts`: `prepareBranch` runs
`git reset --hard context.sha`; `pushChanges` commits with `base: { commit: context.sha }, force: true`).

```sh
bash /home/magdys/workspace/dyhex/POMWright-second-review-probes/G/guard/rerun.sh   # exit 0; output in G/guard/rerun.out
```

## Observed / expected

```text
=== origin main: O -> P. The Publish run for CI(P), or its re-run before main moves: checkout = P, tested = P
  step outputs: current=true exit code: 0
  origin's main is 8adac6ef, the checkout 8adac6ef
  checkout: version 3.0.1 (on npm), pending changesets: 1 (a-fix)
  action: opens or updates the Version Packages pull request: pomwright 3.0.1 -> 3.0.2
=== origin main: O -> P -> C. Re-run of the Publish run for CI(P): checkout = P (the original GITHUB_SHA), tested = P
  step outputs: current=true exit code: 0
  origin's main is d33f4a3e, the checkout 8adac6ef
  checkout: version 3.0.1 (on npm), pending changesets: 1 (a-fix)
  action: opens or updates the Version Packages pull request: pomwright 3.0.1 -> 3.0.2
  (changesets/action v2.1.2 resets the version branch to GITHUB_SHA and force-pushes it: src/github.ts prepareBranch and pushChanges)
--- for comparison, C's own run (checkout = C):
    C's Publish run: checkout = C, tested = C
  step outputs: current=true exit code: 0
  origin's main is d33f4a3e, the checkout d33f4a3e
  checkout: version 3.0.1 (on npm), pending changesets: 2 (a-fix, b-fix)
  action: opens or updates the Version Packages pull request: pomwright 3.0.1 -> 3.0.2
=== origin main: … -> B (3.0.2, its publish failed) -> D. Re-run of the Publish run for CI(B): checkout = B, tested = B
  step outputs: current=true exit code: 0
  origin's main is 70f4da5e, the checkout f4ffca6e
  checkout: version 3.0.2 (not on npm), pending changesets: 0
  action: no changesets -> runs the publish script -> changeset publish publishes pomwright@3.0.2
```

The re-run of P's run goes on although `origin`'s main is C: the Version Packages pull request, which C's own run had
built with `a-fix` and `b-fix`, is force-pushed back to P's, without `b-fix`. Merged as it stands, main gets 3.0.2 with
`b-fix` still pending, which is 2G-1's path (c): 3.0.2 is never published. Expected, by the guide and `main.yaml`'s
comment: a run whose tested commit main has moved past goes no further, re-runs included.

The last case is what a re-run is for and should stay: a release commit whose publish failed, re-run after a later
merge, publishes its own version from its own tree.

## Cause

`publish.yaml` line 51: `head="$(git rev-parse HEAD)"` is the checkout, which on a re-run is the original event's
`GITHUB_SHA`, so the comparison at line 52 does not see that main moved on after the run first started.

## Fix plan

Intended contract: a Publish run, first run or re-run, goes on only while the tested commit is main's tip now.

Options:

1. **Recommended**: read main's tip from the remote, as `pages.yaml` does, and go on only when both it and the checkout
   are the tested commit, with one exception kept on purpose: when the checkout is the tested commit, it is a release
   commit and its version is not on npm (a re-run of a release whose publish failed), the run goes on and publishes it.
   A sketch is proposed: `G/sketch/2G-2.diff` (applies to `d850405`: `git apply --check`; actionlint 1.7.12 exit 0 on
   the patched workflows in `G/sketch/wf2/`; it also corrects the checkout's comment) and `G/sketch/2G-2.run.sh` (from
   the worktree root: actionlint, then `rerun.sh` on the worktree's `publish.yaml`; exit 1 at `d850405` with "FAIL: a
   re-run goes on after main moved past the tested commit", exit 0 and `PASS` on the patched copy,
   `G/sketch/2G-2.run.sketch.out`). On the sketch (`G/guard/rerun-sketch.out`): the first run goes on as before; the
   re-run of P's run prints "main has moved past d235789d… to a7a8eca6…; …", `current=false`, exit 0; the re-run of B's
   run prints "main has moved on to dfddac8c…, but 3.0.2 of release commit c57b498b… is not on npm: publishing it from
   that commit" and publishes 3.0.2. The two sketches (2G-1's and this) touch the same step and are written each
   against `d850405`; combined, 2G-1's check of main's tip should read the remote's main (`git fetch origin main`,
   `git show origin/main:package.json`, `git ls-tree origin/main .changeset/`), since a re-run's checkout may be older.
   Cost: one `git ls-remote` per run; a race remains between the check and the action's push, as in `pages.yaml`.
2. Docs only: say that a re-run of a Publish run works on the commit that was main's tip when it first started, and that
   it should not be re-run after main moved on. Leaves the behaviour.

Steps (option 1): `publish.yaml`, the guard step and the checkout's comment (lines 37–67). Tests: none run a workflow;
keep `G/guard/rerun.sh` and the lint job's actionlint. Docs: `.github/AGENTS.md` lines 31–33 and 47–49 ("checks out the
newest commit on `main` when the run started; a re-run keeps that commit"); `tests-and-checks.md` lines 99–102;
`main.yaml` lines 16–17 (true for a re-run of a `CI` run, which starts a new Publish run; say what a re-run of a Publish
run does). Changeset: none. Decisions to tick: option 1; whether to combine it with 2G-1's in one change to the step.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`, workflow mode): the run script at `d850405`, then `git apply` of the diff and the run script again (each run checks the edited `publish.yaml` with actionlint 1.7.12, the pinned version and checksum, and runs the guard step's own script on scratch histories); then `git checkout -- .` and the worktree clean. A workflow cannot run before a merge, so this is the strongest check available. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/G/sketch/2G-2.gate.out`.

- At `d850405`: `2G-2.run.sh` exit 1, actionlint passing (`FAIL: a re-run goes on after main moved past the tested commit`). With the sketch: exit 0, actionlint passing, `PASS` (the run goes on while main is at the tested commit, a re-run after main moved stops, and a re-run of a release commit whose version is not on npm still publishes it).
- **Verdict: approved; a narrow fix suffices.** For the fix plan: it changes the same step as 2G-1's sketch; see there.
