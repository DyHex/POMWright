# 2G-1: Publish's guard judges the commit CI tested, not what main's tip will do: it fails a release the next run publishes, and a version is skipped with no failing run when the Version Packages pull request is merged before it caught up with main

- **Kind**: defect
- **Area**: Release and publishing: `publish.yaml`'s step "Continue only on the commit CI tested" (the tested-commit guard)
- **Severity**: Medium (the release path; in a sequence the guide does not forbid, merging a pull request with a
  changeset and then the Version Packages pull request before Publish refreshed it, the version is never published and
  no run fails, while the changelog and main say it was released; and a commit without a changeset merged during the
  release commit's CI, which the guide allows, turns that Publish run red with an instruction to revert a release that
  the next run publishes)
- **Semver of the fix**: none (the workflow and the contributor guide; nothing published changes)
- **Pass**: 1
- **First review**: G-5: fixed incompletely (path (c) is outside both the first review's case and decision #4's rule
  and check) and regressed in part (path (a): the check 3284aa4 added for G-5, 2026-10-27, fails a release the next run
  publishes); path (b)'s cancelled or failed `CI` run is decided (#4: "has no Publish run to check; rule 1 covers it").
  Written in pass 1 as new since 54cdada; this line and *Decided* below added in pass 2.
- **Reviewed**: `d850405`, 2026-10-28T18:00:58+01:00, Opus 5.5, second review, segment 2G

## Decided (read in pass 2)

The first review's G-5 found path (b) in its plain form (a changeset merged while the release commit's `CI` ran);
decision #4 settled it with three parts: the rule in `docs/releases.md` (merge nothing with a changeset after the Version
Packages pull request until that version is on npm), the failing check on a moved-past release commit (refined to the
release-commit condition so that an ordinary commit is never named for a revert), and the corrected wording. It also
accepted that "a release commit that never gets a `CI` run, because GitHub drops its waiting run when a newer push
arrives, has no Publish run to check; rule 1 covers it". So path (b)'s cancelled-run case below is decided, and is not
claimed here as a defect; the fix proposed still covers it.

Not decided, and not covered by the rule: path (c), where the changeset is merged *before* the Version Packages pull
request, which breaks no rule; and path (a), where the check decision #4 asked for fails although the version will be
published. Decision #4's concern with a wider check (naming an ordinary commit for a revert) does not apply to the
proposed one: it names the commit that set the version, found with `git log --first-parent`, not the tested commit; and
the other case it names, a release waiting for approval on npmjs.com, ended with decision #72.

## Contract

- `.github/AGENTS.md`, *The workflows* (lines 31–34): Publish "goes no further when `main` has moved past the commit that
  run tested (… the newer commit's own run continues the release, and publishes only when no changeset is pending), and
  fails when that commit is a release commit (its version differs from its parent's) whose version is not on npm, saying
  to revert it".
- `.github/AGENTS.md`, *Publish and Pages* (lines 47–51): "the newer commit's run continues the release, and publishes
  only when no changeset is pending. If the tested commit is a release commit whose version is not on npm, **that version
  would never be published**, so the run fails and names the commit."
- `website/src/content/docs/internal/tests-and-checks.md`, *CI* (lines 100–104): the same, "it would never be published,
  so the run fails and names the commit to revert".
- `docs/releases.md`, *Carrying out a release* (lines 48–52): "After merging the Version Packages pull request, merge
  nothing **with a changeset** until that version is on npm: a commit with a changeset merged while the release commit's
  `CI` runs, or before its Publish run, makes that run stop, and the version is never published. If it happens, revert
  the release commit before merging the next Version Packages pull request." A commit without a changeset may be merged;
  nothing is said about a changeset merged *before* the Version Packages pull request.
- `publish.yaml` lines 41–44 (comment) and 63 (the message): "Version $version of commit $TESTED_SHA was not published:
  main moved past it before its Publish run. Revert $TESTED_SHA before merging the next Version Packages pull request."
- `main.yaml` lines 13–17: CI runs one push at a time; "A run that is waiting gives way to a newer push (GitHub keeps one
  waiting run per group)". GitHub's docs (*Control workflow concurrency*, saved as `G/ghdocs/concurrency.html`): "any
  existing pending job or workflow in the same concurrency group will be canceled and the new queued job or workflow
  will take its place". Publish's job runs only when `github.event.workflow_run.conclusion == 'success'`
  (`publish.yaml` line 28).

The guide's whole point is that a version main moved past without publishing is reported, so it can be reverted and
released with the next one. A version is skipped exactly when main's tip carries a version npm does not have while
changesets are pending there: the next Version Packages pull request then bumps past it. The guard instead asks whether
the *tested* commit is a release commit, and only on a run main has moved past.

## Reproduction

`G/` is `/home/magdys/workspace/dyhex/POMWright-second-review-probes/G/`. `G/guard/sim.sh` builds throwaway git
repositories (P: a fix with a changeset at 3.0.1; a Version Packages commit at 3.0.2 consuming it; other commits per
path, merged with merge commits where main uses them), takes the guard's `run:` script verbatim from the worktree's
`publish.yaml` (`G/guard/extract-step.mjs`, parsed with the root's `yaml` 2.9.1) and runs it as GitHub runs `shell: bash`
(`bash --noprofile --norc -eo pipefail`) with `TESTED_SHA` and `GITHUB_OUTPUT` set, in the checkout a `workflow_run`
gets (main's tip when CI completed). `npm view pomwright versions` is the real registry, read-only (3.0.0 and 3.0.1 are
on it, 3.0.2 is not). For a run that goes on, `G/guard/plan.mjs` computes what changesets/action v2.1.2 decides there,
read-only, with the libraries it uses: pending changesets (`@changesets/read`) open or update the Version Packages pull
request (the version from `@changesets/assemble-release-plan`); none run the publish script, and `changeset publish`
publishes the local version when npm lacks it (`@changesets/cli` 3.0.3, `getUnpublishedPackages` in
`dist/getPublishPlan.mjs` lines 604–658; the action's switch is `src/index.ts` lines 68–137 at the pinned commit, saved in
`G/changesets-action/`). Nothing is versioned or published.

```sh
bash /home/magdys/workspace/dyhex/POMWright-second-review-probes/G/guard/sim.sh   # exit 0; output in G/guard/sim.out
```

## Observed / expected

The two normal paths behave as documented (a changeset pending at 3.0.1: the pull request 3.0.1 -> 3.0.2; the release
commit as the tip: `changeset publish` publishes 3.0.2). Three paths do not.

Path (c), no rule broken: a pull request with a changeset (C) is merged, and the Version Packages pull request, made
before C, is merged a few minutes later, before C's CI and Publish runs refreshed it (on `main` CI takes about five
minutes: runs of 2026-10-20/21 in `G/api/runs-main.yaml.json`). GitHub merges it with a merge commit V:

```text
=== main: P -> C (merge, changeset b) -> V (merge of the Version Packages pull request made from P, 3.0.2); V = 0b6c265c…
--- Publish run for CI(C), started after V was pushed (checkout = V, tested = C):
main has moved past 9ed3878d… to 0b6c265c…; the newer commit's own run continues the release, and publishes only when no changeset is pending
  step outputs: current=false exit code: 0
  (the run stops here: the changesets action does not run)
--- Publish run for CI(V) (checkout = V, tested = V):
  step outputs: current=true exit code: 0
  checkout: version 3.0.2 (not on npm), pending changesets: 1
  action: opens or updates the Version Packages pull request: pomwright 3.0.2 -> 3.0.3
  => 3.0.2 is skipped: the pull request bumps past it, and it is never published
```

Main and `CHANGELOG.md` say 3.0.2 was released; npm never gets it, no tag or GitHub release is made for it, and no run
fails. Expected: the failure that names the release commit to revert.

Path (b), the case the guide describes (a commit with a changeset after the release commit B) when B's own CI run never
succeeds (decided, #4; shown for completeness):

```text
=== main: P -> B (Version Packages, 3.0.2) -> C (C: another fix, with a changeset)
--- Publish run for CI(B), started after C was pushed (checkout = C, tested = B):
::error::Version 3.0.2 of commit fd08b686… was not published: main moved past it before its Publish run. Revert fd08b686… before merging the next Version Packages pull request.
  step outputs: current=false exit code: 1
--- Publish run for CI(C) (checkout = C, tested = C):
  step outputs: current=true exit code: 0
  checkout: version 3.0.2 (not on npm), pending changesets: 1
  action: opens or updates the Version Packages pull request: pomwright 3.0.2 -> 3.0.3
  => 3.0.2 is skipped: the pull request bumps past it, and it is never published
```

The failure comes only from B's own Publish run. That run does not exist when CI(B) does not succeed: when B and C are
both pushed while an earlier CI run is in progress, CI(B) waits and is cancelled by C's push (`main.yaml`'s concurrency,
GitHub's rule above), and Publish's job is skipped for a conclusion other than `success`; likewise when CI(B) fails and is
not re-run before C's. The same holds for Publish's own concurrency group (`publish.yaml` line 17): a pending Publish run
for B is cancelled when C's is queued while an earlier Publish run is still going (its attestation check can wait ten
minutes). C's run then opens the pull request that skips 3.0.2, and no run fails.

Path (a), a commit **without** a changeset merged while the release commit's CI runs, which the guide allows:

```text
=== main: P -> B (Version Packages, 3.0.2) -> C (C: docs only, no changeset)
--- Publish run for CI(B), started after C was pushed (checkout = C, tested = B):
::error::Version 3.0.2 of commit fd08b686… was not published: main moved past it before its Publish run. Revert fd08b686… before merging the next Version Packages pull request.
  step outputs: current=false exit code: 1
--- Publish run for CI(C) (checkout = C, tested = C):
  step outputs: current=true exit code: 0
  checkout: version 3.0.2 (not on npm), pending changesets: 0
  action: no changesets -> runs the publish script -> changeset publish publishes pomwright@3.0.2
```

B's Publish run fails and tells the maintainer to revert B; C's run, minutes later, publishes 3.0.2 (from C's tree,
which holds B). Expected, by the guide's own words: the version is not "never published", so B's run stops like any
moved-on run. Followed after C's run, the instruction reverts a published release: the revert restores 3.0.1 and B's
changeset, the next Version Packages pull request sets 3.0.2 again, and `changeset publish` then finds 3.0.2 on npm and
publishes nothing (read from `getUnpublishedPackages`, lines 636–648, which skips a local version npm lists; not run).

## Cause

`publish.yaml` lines 51–66: the step decides from `TESTED_SHA` (is it a release commit, is its version on npm), but
whether a version is skipped depends on main's tip (its version is not on npm, and changesets are pending on it). The
step returns at once when the tested commit is the tip (`current=true`, lines 52–55), before looking at the tip's version
(paths b and c), and fails on a moved-past release commit without looking at whether the tip has a changeset (path a).

## Fix plan

Intended contract: whichever commit's Publish run finds main's tip at a version npm does not have while changesets are
pending on it fails, and names the commit that set that version; a run whose tested commit main has moved past otherwise
stops quietly; everything else is unchanged.

Options:

1. **Recommended**: judge main's tip (the checkout) in the guard: read its `package.json` version and `npm view
   pomwright versions`; if the version is not on npm and `.changeset/` holds pending changesets (as `@changesets/read`
   counts them: `*.md` but dotfiles, `README.md`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`), fail with the version, the
   commit on main that set it (`git log -1 --first-parent --format=%H -G'"version":' -- package.json`, which names the
   merge commit of the Version Packages pull request, the one to revert) and "revert it before merging the Version
   Packages pull request"; then the existing `current` comparison. Fixes all three paths. Cost: every Publish run reads
   the registry (one `npm view`), so a registry outage fails a run that would only have opened the pull request; the
   failure repeats on every run until the release commit is reverted, which is the point. A sketch is proposed:
   `G/sketch/2G-1.diff` (applies to `d850405`: `git apply --check` from the worktree root; actionlint 1.7.12, the pinned
   version and checksum, exit 0 on the patched workflows in `G/sketch/wf/`) and `G/sketch/2G-1.run.sh` (from the
   worktree root: actionlint, then `sim.sh` on the worktree's `publish.yaml`; exit 1 at `d850405` with three `FAIL`
   lines, exit 0 and `PASS` on the patched copy, `G/sketch/2G-1.run.sketch.out`). On the sketch (`G/guard/sim-sketch.out`):
   path (c) both runs fail with "Version 3.0.2, set by V, is not on npm, and 1 changeset(s) are pending on main: the
   next Version Packages pull request would skip 3.0.2. Revert V before merging that pull request."; path (b) B's and
   C's runs fail with the same message; path (a) B's run prints "main has moved past … the newer commit's own run
   continues the release", exit 0, and C's run publishes 3.0.2; the two normal paths are unchanged.
2. `queue: max` on `main.yaml`'s concurrency, so every push's CI run waits instead of giving way and the release
   commit's own run always comes. Fixes the cancelled-run part of path (b) only; more CI minutes when merges bunch up;
   actionlint 1.7.12 (the latest release) rejects the key: `unexpected key "queue" for "concurrency" section` (probed on
   a copy).
3. Docs only: a rule in `docs/releases.md` to merge the Version Packages pull request only after Publish refreshed it,
   drop "would never be published", and soften the message. Leaves all three paths to a person's timing.
4. With option 1, and found in pass 4: the same check as a step of `checks.yaml` on pull requests, on the merge commit
   a pull request run tests. The Version Packages pull request's merge commit then fails when a changeset reached
   `main` after Publish last refreshed it (path c), and so does any pull request with a changeset while `main`'s
   version is not on npm (rule 1 of `docs/releases.md`, as a check). It prevents rather than detects, but only as of the
   run: a merge after the run is not seen, since a pull request's checks do not re-run when `main` moves (and the Version
   Packages pull request's run waits for the maintainer's approval: PR #52's run was `action_required` until approved,
   `G/api/run-39586762544-attempt1.json`). So it complements option 1, it does not replace it.

What option 1 changes in decision #4: the failing check names the commit that set the version, so the worry that led to
the release-commit condition (an ordinary commit named for a revert) does not arise; but the run fails until that
commit is reverted, and since it fails before the changesets action runs, no next Version Packages pull request is
opened meanwhile. Decision #4's point 4 ("if the next Version Packages pull request has already been merged, the gap is
accepted") then has no path unless that pull request was already open. A decision to tick: fail until reverted (recommended: the revert is the guide's recovery), or warn and go
on, which keeps decision #4's acceptance but can be missed.

Steps (option 1): `publish.yaml`, the guard step and its comment (lines 41–67). Tests: no test in the repository runs a
workflow; keep `G/guard/sim.sh` as the reproduction, and the lint job's actionlint. Docs: `.github/AGENTS.md` *The
workflows* (lines 31–34) and *Publish and Pages* (lines 47–51); `tests-and-checks.md` *CI* (lines 100–104);
`docs/releases.md` *Carrying out a release*, first bullet (what makes a version skipped, and that the next Publish run
fails, whichever commit it is for). Changeset: none (not consumer-facing). Decisions to tick: option 1; whether a
moved-on run for a version that is unpublished with no changeset pending prints a notice (the newer run publishes it).
Independent of the other findings of this segment.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`, workflow mode): the run script at `d850405`, then `git apply` of the diff and the run script again (each run checks the edited `publish.yaml` with actionlint 1.7.12, the pinned version and checksum, and runs the guard step's own script on scratch histories); then `git checkout -- .` and the worktree clean. A workflow cannot run before a merge, so this is the strongest check available. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/G/sketch/2G-1.gate.out`.

- At `d850405`: `2G-1.run.sh` exit 1, actionlint passing, with three `FAIL` lines: a false alarm when the commit after a release commit has no changeset; 3.0.2 skipped silently by the newer commit's run; 3.0.2 skipped silently after a stale Version Packages pull request. With the sketch: exit 0, actionlint passing, `PASS`.
- **Verdict: approved; the cause is confirmed.** For the fix plan: 2G-1 and 2G-2 change the same step, each written against `d850405`; the fix combines them, and the combination needs the same simulations (`G/guard/sim.sh`, `rerun.sh`) run on it.
