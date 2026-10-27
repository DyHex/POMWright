# Plan 3: CI without the docs-only skip; actionlint in the lint job

- **Decisions**: [DECISIONS.md](DECISIONS.md) #31, #32, #8 (point 4)
- **Findings**: [G-2](G-ci-and-tooling/defect-G-2-pr-skip-ignores-merge-commit.md),
  [G-1](G-ci-and-tooling/defect-G-1-rename-hides-old-path.md); test gap #3's actionlint part
- **Bump**: none (CI only, no changeset)
- **Stop**: **yes**, after the commit: the maintainer pushes, and plan 4 starts once PR #60's run is green
- **Depends on**: plan 1

## Contract

Every CI run runs every job: lint, the package, the harness (and its Node 20 floor job), the site. Nothing is skipped
by what changed, so a run always tests what it reports on (on a pull request, GitHub's merge commit). The lint job also
runs actionlint over the workflows, pinned, so a workflow change is syntax- and expression-checked on the pull request.

## Current behaviour

- `.github/workflows/checks.yaml:36-62`: the `changes` job runs `scripts/ci-last-green.sh` (the runs API, hence
  `actions: read`) and `scripts/ci-changes.sh`; `package` (line 81-82), `harness` (106-107), `harness-node-floor`
  (161-162) and `site` (198-199) need it and skip on its outputs. The `workflow` input (lines 22-25) exists only for it.
  `pr.yaml:11,18` and `main.yaml:12,27` pass `workflow:` and grant `actions: read`.
- On a pull request the jobs test the merge commit while the skip compared the PR head with its last green commit:
  after `main` moved, a docs-only push skipped the harness on an untested merge (`…-probes/G/ci-changes/probe.sh`,
  case 13). `ci-changes.sh` also lists a rename under its new path only (G-1).
- The lint job runs biome only (`checks.yaml:64-77`); no actionlint anywhere.

## Steps

1. Delete `scripts/ci-changes.sh` and `scripts/ci-last-green.sh`.
2. `checks.yaml`:
   - remove the `changes` job, every `needs: changes` (keep `needs: package` where it is), every `if:` built on its
     outputs (`harness-node-floor` keeps `if: inputs.node-floor`), the `workflow` input, and `actions: read`;
   - the lint job: after `pnpm lint`, a step that downloads actionlint at a pinned version
     (`https://github.com/rhysd/actionlint/releases/download/v<version>/actionlint_<version>_linux_amd64.tar.gz`, the
     latest release at implementation, recorded with its checksum; scope G ran 1.7.12), verifies its SHA-256 against the value
     written in the step (from the release's `checksums.txt`), and runs `./actionlint -color`; a comment says the
     version and checksum move together, by hand, since Dependabot does not see them;
   - the header comment rewritten: every job on every run, and why there is no skip (a run tests what it reports on;
     the skip saved minutes on docs-only pushes only); the lint job runs biome and actionlint.
3. `pr.yaml` and `main.yaml`: drop `workflow:` and `actions: read` with its comment; `pr.yaml`'s header unchanged
   otherwise.
4. Run actionlint locally (the same version, downloaded to the scratchpad) over all five workflows: no findings. If
   shellcheck is on the runner image (`ubuntu-latest` has it), actionlint also checks `run:` scripts; run it locally
   with shellcheck too, and treat any finding as unexpected (fix it in this plan if it is in a line this plan touches,
   otherwise report).
5. Docs:
   - AGENTS.md §2, the `.github/workflows/` row: no `changes` job and none of the statements built on it (`package` on
     either, `harness` on `code`, `site` on `site`, the last-green comparison); every job runs on every run; the lint job
     runs biome and actionlint (pinned version and checksum in the step). The `scripts/` row loses `ci-last-green.sh`
     and `ci-changes.sh` (keeps `ci-playwright-version.sh`).
   - *Internal → Tests and checks*, *CI*: the **changes** bullet goes; the job list loses the `(code)`/`(site)`
     conditions; **lint** says biome and actionlint; one sentence on why every job runs every time.

## Tests

None for the deleted scripts. The push itself validates: the run on PR #60 shows every job running, lint with
actionlint green.

## Verify

The standard checks (PLANS.md, rule 5), actionlint locally, `pnpm docs:build`. Then **stop**: report the commit and ask
the maintainer to push; confirm on the PR run that the `Changes` job is gone, every job ran, and lint ran actionlint.

## Commit

```text
ci: run every job on every run, and lint the workflows with actionlint

The changes job compared a pull request's head with its last green commit,
while the jobs test GitHub's merge commit, so a docs-only push could skip
the harness on an untested merge. Every job now runs every time, and the two
scripts that fed the skip are gone. The lint job runs actionlint, pinned by
version and checksum.

Plan: defect-review-result/PLAN-G-2-G-1-checks-workflow.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
