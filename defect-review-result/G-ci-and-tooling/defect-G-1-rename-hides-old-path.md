# G-1: `ci-changes.sh` sees only the new name of a renamed file, so moving a file into `website/` or to a `*.md` name skips the jobs its old path needs

- **Kind**: defect
- **Area**: CI, `changes` job (`scripts/ci-changes.sh`)
- **Severity**: Low (a commit whose only change outside `website/` is such a rename skips the harness, or everything but lint; a rename that is the only change outside `website/` is rare)
- **Semver of the fix**: none (CI script only; the published package does not change)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer G
- **Status**: decided: settled by dropping the CI skip (2026-10-26, [DECISIONS.md #32](../DECISIONS.md), with #31)

## Contract

`scripts/ci-changes.sh` lines 3-7: "For each <base>, it looks at the files changed between it and <head> ... code: a file
outside website/ that is not a *.md file changed; ... site: code, or a file under website/ changed". The same rule in
`.github/workflows/checks.yaml` lines 4-7, AGENTS.md §2 (`changes` "outputs `code` (a change outside `website/` that is
not `*.md`) and `site` (`code` or a change under `website/`)") and *Internal → Tests and checks*, "CI". A renamed file
is a change at its old path (the file is gone there) and at its new one.

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/ci-changes/probe.sh` (builds a scratch repository
in that folder and runs the worktree's `scripts/ci-changes.sh` on it; output in `probe.out` beside it).

```sh
bash /home/magdys/workspace/dyhex/POMWright-final-review-probes/G/ci-changes/probe.sh
```

Exit 0. The two rename cases, each a commit with nothing but `git mv`:

```text
rename scripts/check.mjs -> website/scripts/check.mjs      expected: code=true site=true    actual: code=false site=true   MISMATCH
rename src/a.ts -> docs/a.md                               expected: code=true site=true    actual: code=false site=false  MISMATCH
```

The cause in one command, in the probe's repository (`git diff --name-only` lists a rename under its new name only):

```sh
git diff --name-only <base>...<rename commit>      # prints website/scripts/check.mjs, not scripts/check.mjs
git diff --name-only --no-renames <base>...<rename commit>   # prints both paths
```

## Observed / expected

Observed: a file moved from outside `website/` into it gives `code=false`, so the harness is skipped; a file renamed to
a `*.md` name outside `website/` gives `code=false site=false`, so the package job, the harness and the site job are all
skipped and only lint runs, although `src/a.ts` is gone. Expected: `code=true site=true` in both cases, since a file
outside `website/` that is not `*.md` (the old path) changed.

## Cause

`scripts/ci-changes.sh` line 22: `git diff --name-only "$BASE...$HEAD_SHA"`. `git diff` detects renames by default
(`diff.renames`, on since git 2.9) and `--name-only` then prints the destination path alone.

## Fix plan

- **Intended contract**: a rename counts as a change at both of its paths.
- **Options**:
  - **(recommended)** `git diff --no-renames --name-only ...`: a rename is listed as a deletion and an addition. Costs
    nothing; can only turn a skip into a run.
  - `git diff --name-status` and read both columns of `R` lines: more code for the same result.
- **Implementation steps**: `scripts/ci-changes.sh` line 22, add `--no-renames`.
- **Tests**: rerun the probe above; both rename cases print `code=true site=true`. No harness spec (CI script).
- **Docs**: none (the rule as documented is what the fix delivers).
- **Changeset**: none (no consumer-facing change).
- **Decisions to tick**:
  - [x] `--no-renames` in `ci-changes.sh`: not needed; the script is deleted with the skip ([DECISIONS.md #31](../DECISIONS.md), #32)
- **Execution order**: independent; can go with G-2 since both touch `ci-changes.sh`.
