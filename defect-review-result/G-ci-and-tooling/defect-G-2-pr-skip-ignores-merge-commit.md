# G-2: On a pull request, `changes` decides the skip on the PR's head commit while the jobs test GitHub's merge commit, so after the base branch moves a docs-only push reports green for a merge result no harness ran

- **Kind**: defect
- **Area**: CI, `changes` job (`scripts/ci-changes.sh`, `checks.yaml`), pull requests only
- **Severity**: Low (pull requests only, and only when the base branch gained code since the PR's last green run; `CI`
  on `main` runs the full harness after the merge and blocks Publish, so nothing is published from it)
- **Semver of the fix**: none (CI only)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided: drop the skip (2026-10-26, [DECISIONS.md #31](../DECISIONS.md))

## Contract

`.github/workflows/checks.yaml` lines 4-6: the changes job compares "with the last green commit of the branch ... and,
on a pull request, with its base, never with the previous push alone (that would let a docs-only push turn a red run
green)". `scripts/ci-changes.sh` lines 8-10: "The bases are commits it is safe to compare against ... <head> is the
commit under test (on a pull request its head commit, not GitHub's merge commit)". The promise behind a skip is that
the code under test equals code a green run tested.

What a pull request run tests: every job of `checks.yaml` checks out without a `ref`, which for `pull_request` is
`GITHUB_SHA`, "Last merge commit on the `GITHUB_REF` branch" (`refs/pull/N/merge`); "Note that `GITHUB_SHA` for this
event is the last merge commit of the pull request merge branch"
([Events that trigger workflows, `pull_request`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)).
So the commit under test on a pull request is the merge commit, not the head commit the comment names.

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/ci-changes/probe.sh`, case 13 (scratch repository,
the worktree's `scripts/ci-changes.sh`):

1. `X` on the PR branch adds code (`src/pr.ts`); its PR run was green (it tested X merged into `main` at the time).
2. `main` moves with a code change (`src/moved.ts`).
3. `Y` on the PR branch adds only a page under `website/`.
4. CI calls `ci-changes.sh Y X <PR base>` (`checks.yaml` line 62: head, the last green commit, the PR base).

```sh
bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/G/ci-changes/probe.sh
```

Exit 0. The last lines:

```text
PR docs push after main moved: vs last green X only        expected: code=false site=true   actual: code=false site=true   ok
PR docs push after main moved: vs PR base only             expected: code=true site=true    actual: code=true site=true    ok
PR docs push after main moved: both bases (as CI passes them) expected: code=false site=true   actual: code=false site=true   ok
files of the tested merge commit that X's run never had (git diff --name-only X MERGE):
src/a.ts
src/moved.ts
website/src/content/docs/page.md
```

(`MERGE` is `main`'s tip merged with `Y`, the commit GitHub's `pull_request` run checks out.)

## Observed / expected

Observed: `code=false`, so the harness is skipped and the gate `build` is green, while the merge commit the run tests
holds code (`src/a.ts`, `src/moved.ts` from `main`) combined with the PR's code in a way no harness ran. Expected: a
skip only when the code under test equals code a green run tested; here the harness should run (`code=true`).

The same holds for any push after `main` moved, as long as the push itself changes no code: the gate stays green on the
first combination of the PR with the new `main` that is never tested. The combination is tested only after the merge,
by `CI` on `main` (its last green commit is `main`'s previous tip, so the PR's code counts as a change there).

Not checked: whether branch protection requires branches to be up to date before merging (`strict`), which would force
an update of the PR branch that brings `main`'s code in and runs the harness. The public branch endpoint shows only the
required check `build` (`/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/github/`).

## Cause

`checks.yaml` line 59 passes `github.event.pull_request.head.sha` as the head; `scripts/ci-changes.sh` treats an output
as false when *some* base shows no change (lines 8 and 29-33), and the last green commit is a PR head whose run tested a
different merge (with an older `main`).

## Fix plan

- **Intended contract**: on a pull request, a job is skipped only when the merge commit it would test has the same code
  (or site) as one a green run tested.
- **Options**:
  - **(recommended)** On a pull request, skip on the PR base alone: compare the PR's own changes
    (`git diff <base>...<head>`, which `ci-changes.sh` already does) and stop using the last green commit there. A PR
    that changes code then runs the harness on every push (chromium only, a few minutes); a docs-only PR still skips.
    The last green commit stays the base for pushes to `main`, where the commit under test is the head.
  - Test the PR head instead of the merge commit (`ref: ${{ github.event.pull_request.head.sha }}` in every checkout)
    and require branches to be up to date in branch protection. Makes the comment true, but a PR's checks stop testing
    the merge result, and the branch rule is a setting the repository cannot check.
  - Keep the rule and correct the comment, accepting the gap (the full harness on `main` catches it before Publish).
- **Implementation steps**: `checks.yaml` line 52-55: skip the `green` step on `pull_request` (or pass an empty base);
  `scripts/ci-changes.sh` header comment; `checks.yaml` header comment.
- **Tests**: the probe's case 13 with only the PR base passed prints `code=true`; a docs-only PR (case 2 with the PR
  base) still prints `code=false site=true`.
- **Docs**: AGENTS.md §2 (`changes` "compares with the last green commit of the branch ... and, on a pull request, with
  its base"), `checks.yaml` lines 3-8, *Internal → Tests and checks*, "CI" (`changes` bullet).
- **Changeset**: none.
- **Decisions to tick**:
  - [x] which option: **none of the three; the skip is dropped** (added in the walkthrough): `ci-changes.sh`,
    `ci-last-green.sh` and the `changes` job are deleted, and every job runs on every run
  - [x] whether branch protection requires up-to-date branches: not needed; the maintainer's setting either way
    ([DECISIONS.md #31](../DECISIONS.md))
- **Execution order**: with G-1 (same script).
