# G-5: A merged Version Packages commit is never published when a pull request with a changeset lands before its CI run ends; the guard says "that commit's own CI run publishes", but that run opens a version pull request instead

- **Kind**: defect
- **Area**: release, `publish.yaml` (the guard step and the changesets action)
- **Severity**: Low (needs a merge with a changeset inside the few minutes `CI` takes after the release merge; the
  result is a version that is in `CHANGELOG.md` and in `main`'s history but never on npm, and the next release skips
  past it; nothing says so)
- **Semver of the fix**: none (workflow and process only)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided: fix (2026-10-26, [DECISIONS.md #4](../DECISIONS.md)); reclassified as a documentation finding
  (the false promise) with a process rule and a safety-net check

## Contract

- `publish.yaml` lines 33-36, the guard: when `main` has moved past the tested commit it prints "main has moved past
  $TESTED_SHA to ...; that commit's own CI run publishes" and stops.
- AGENTS.md §2: "a step that goes no further when `main` has moved past the commit that run tested (a `workflow_run`
  checks out the newest commit; the newer commit's own run publishes)".
- *Internal → Tests and checks*, "CI": "the newer commit's own `CI` run starts Publish again".
- changesets/action v1.9.0 (pinned), `src/index.ts` lines 57-73 and 157 (fetched to
  `/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/github/v1-index.ts`): with no changeset it runs the
  `publish` script; with any changeset it runs the version flow (opens or updates the Version Packages pull request) and
  publishes nothing.

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/publish-guard/probe.sh`. It builds a scratch history
`V` (the merged Version Packages commit, `package.json` at 3.0.2, no changeset) then `W` (a fix with a changeset), runs
the guard's script exactly as `publish.yaml` has it (extracted from the file) for the two `CI` completions with
`GITHUB_SHA` at `W` (a `workflow_run` checks out "Last commit on default branch",
[Events that trigger workflows, `workflow_run`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)),
and applies the action's first decision.

```sh
bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/G/publish-guard/probe.sh
```

Exit 0:

```text
== CI(V) completes while main is at W
main has moved past a055bcf... to 304ae28...; that commit's own CI run publishes
current=false
== CI(W) completes while main is at W
current=true
action: 1 changeset(s) -> opens or updates the Version Packages pull request; nothing is published
```

## Observed / expected

Observed: neither run publishes 3.0.2. Publish for `V` stops at the guard; Publish for `W` sees `W`'s changeset and opens
a Version Packages pull request that bumps 3.0.2 to 3.0.3. When that is merged, 3.0.3 is published and 3.0.2, with its
changelog entry, never is. Expected, by the guard's own message and AGENTS.md: the newer commit's run publishes what the
older one skipped.

The window is real in this repository's practice: on 2026-10-21 pull request #51 was merged at 10:38:47 and the
Version Packages pull request #52 at 10:55:01, and `CI` on `main` took about five minutes per run
(`/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/github/ci-runs.json`); the order there was the safe one.

## Cause

The guard hands the release to the next run without checking what that run will do; the changesets action publishes
only when no changeset is pending. The same happened before the guard existed (a `workflow_run` always checked out the
newest commit), so the guard did not cause it, but its message and AGENTS.md now promise otherwise.

## Fix plan

- **Intended contract**: a version that reaches `main` through the Version Packages pull request is published, or a
  run says loudly that it was not.
- **Options**:
  - **(recommended)** Make the skip visible: when `main` has moved on and the tested commit has no pending changeset
    (`.changeset/*.md` other than `README.md`), print a `::warning::` (or fail the job) naming the unpublished version
    and the commit; and state the rule in AGENTS.md §7: merge nothing with a changeset until Publish has run for the
    release commit. Costs a few lines in the guard step.
  - Publish the tested commit itself when it is a release commit (`git checkout $TESTED_SHA`, then the action with
    no changesets runs only its publish script, which needs no branch). Closes the hole, but runs the action on a
    detached head, which *Internal → Tests and checks* rejected for the version flow because it cannot be tried
    without a release; the publish flow's tag push would need the same trial.
  - Correct the message and AGENTS.md only ("the newer commit's own run continues the release: it publishes when no
    changeset is pending").
- **Implementation steps**: `publish.yaml` guard step; AGENTS.md §2 and §7; *Internal → Tests and checks*, "CI".
- **Tests**: the probe above, extended with the warning; nothing can run the workflow locally.
- **Docs**: AGENTS.md §2 (the `publish.yaml` sentence), §7; `website/src/content/docs/internal/tests-and-checks.md`
  "CI" paragraph on Publish.
- **Changeset**: none.
- **Decisions to tick**:
  - [x] which option: the first (make the skip visible), as a failing run, with the recovery below. The second
    (publish the tested commit) is not adopted: the recovery covers the case, and it would be a second untried change
    to `publish.yaml` in the release that moves to `changesets/action` v2.
  - [x] the process rule in AGENTS.md §7: after merging the Version Packages pull request, merge nothing with a
    changeset until that version is on npm.
  - [x] (added) the check: when the guard stops because `main` has moved on and the tested commit's `package.json`
    version is not on npm, the Publish run fails with an error naming the version and the commit, and saying "revert
    `<commit>` before merging the next Version Packages pull request".
  - [x] (added) recovery: revert the release commit. That restores its changesets, the previous version and the
    changelog, and the next Publish run puts all pending changesets into that version again. If the next Version
    Packages pull request has already been merged, the gap is accepted (the next release carries the changes).
  - [x] (added) the guard's message, AGENTS.md §2 and *Internal → Tests and checks* stop promising that the newer
    commit's run publishes: it continues the release, and publishes only when no changeset is pending.
  - [x] (added) the same holds for changesets CLI 2 / `changesets/action` v1.9.0 and for CLI 3 / v2 (both publish only
    when no changeset is pending; `changeset version` bumps from `package.json`), so the fix does not depend on
    decision 1.
- **Execution order**: with issue 01 (release tooling), which rewrites `publish.yaml` for action v2; the guard step
  survives that move.
