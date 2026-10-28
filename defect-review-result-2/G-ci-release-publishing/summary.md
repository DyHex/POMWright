<!-- Saved by the orchestrator from the segment agent's final message: the agent's own write of this file was refused by
the harness rule "Subagents should return findings as text, not write report files". The text below is the agent's,
unchanged. -->

# Segment 2G: CI, release and publishing — summary

- **Scope**: the workflows (`checks.yaml`, `pr.yaml`, `main.yaml`, `publish.yaml`, `pages.yaml`), `dependabot.yml`,
  `CODEOWNERS`, `scripts/ci-playwright-version.sh` and what the jobs run inline; the path from a merge to a published
  version and a deployed site; the benchmark and *Performance*; `.github/AGENTS.md`, `docs/releases.md`'s *Carrying out
  a release*, the CI section of *Tests and checks* and *Building and publishing* of *Documentation*; with the 13 commits
  since `v3.0.1` in this area as a change set (7 after `54cdada`).
- **Commit**: `d850405`, worktree `/home/magdys/workspace/dyhex/POMWright-second-review`.
- **Reviewer**: Opus 5.5, second review, segment 2G. **Date**: 2026-10-28, 17:44 to 18:22 (+01:00, `log.md`).
- **Probes**: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/G/` (`G/` below).
- **The blind pass was breached once**, by accident, at about 18:07: a recursive grep excluded the first review's folder
  with a pipe filter that did not match, and some 25 lines of `report.md`, `inventory.md`, `PLANS.md` and five plans
  reached the context (`log.md` lists them). 2G-1 to 2G-3 were written before it; nothing after it was taken from those
  lines, and the one topic they touched (Node 20's end of life and the Node matrix) is marked *not blind* in
  `inventory-blind.md`.

## What I read

The skill (the worktree's copy), `segments.md`, `baseline.md`, the brief; the guide files the brief names, in full:
`AGENTS.md`, `.github/AGENTS.md`, `test/AGENTS.md`, `docs/releases.md`, `docs/versioning.md`. Every file in scope in
full, and `pack-test.sh`, `pack-build.sh`, `test-server-check.sh`, `playwright.base.ts`, the Playwright configs'
reporters, `pnpm-workspace.yaml`, the three manifests. The diffs of e856a80, 3284aa4, 8beb9d0, 01d1096, 6d8642f,
d850405 (workflows) and 0905892 (stat). Outside the repository: changesets/action v2.1.2's source at the pinned commit
(`G/changesets-action/`), `@changesets/cli` 3.0.3's publish code, pnpm 12.14.0's CHANGELOG, npm 11's `view` code,
GitHub's docs on concurrency, re-runs, `workflow_run` and environments (`G/ghdocs/`), npm's Trusted Publishing docs
(`G/npmdocs/`). GitHub's public API, read-only, about 25 requests (`G/api/`). Pass 2: the first review's scope G and
its decisions and plans (`first-review.md`).

## Inventory lines reviewed

- **Fully** (`inventory-reconciled.md` lines): 1–6, 8–13, 15–20, 22–28; the publish guard, the Pages tip step and the
  re-run paths simulated with the steps' own scripts, verbatim.
- **Partly**: 7 (the consumer job, read as a job; its script is 2F's), 14 (`CODEOWNERS`: the users exist; their access
  and any code-owner review rule are not public), 19 (the Trusted Publisher's settings on npmjs.com are not visible),
  21 (known, #56).
- **Not**: 29–33 (2T's and 2F's now; G-9's `.editorconfig` re-checked only for its finding).
- **Not run**: the workflows on GitHub (nothing may be pushed, re-run or dispatched); a real publish, so whether 3.0.2
  gets an attestation (`npm view pomwright@3.0.2 dist --json` after the release); the harness at the latest 1.x locally
  (CI ran it on PR #60); the consumer check; Node 26. No harness spec was needed: no finding depends on one.

## Test gaps, most important first

1. **Nothing tests Publish's and Pages' decision logic.** The guard and the tip step are shell inside YAML; only actionlint
   sees them. The simulations here (`G/guard/sim.sh`, `rerun.sh`, `G/pages/sim.sh`, `rerun.sh`: the steps extracted
   from the workflow and run on scratch histories, the action's decision computed with changesets' own libraries) would
   catch 2G-1 and 2G-2; a script of that kind run by the lint job would keep them caught.
2. **Nothing checks, before the Version Packages pull request is merged, that it holds every pending changeset** (2G-1,
   path c; option 4 there).
3. **Provenance is only warned about, after publishing** (decided, #3); the first attestation is unproven until 3.0.2.
4. **The workflows' GitHub behaviour** (concurrency, re-runs, environments, the Version Packages pull request's
   approval-gated run) cannot run before a merge (accepted, #8).
5. **The round-trip comparison on *Performance* has no script** (2G-4).

## What is sound (path probed)

- **Action pins**: all 8 SHAs equal their tags and are each action's latest (`git ls-remote`, `G/pins/`); no unpinned
  third-party action.
- **actionlint and ShellCheck**: both archives match the step's SHA-256 (and actionlint's own checksums file); actionlint
  1.7.12 exit 0 on the five workflows; ShellCheck clean on the CI shell scripts but the known SC2016 info.
- **`ci-playwright-version.sh`**: `pin` empty; `latest` 1.64.1, `skip=false`; a pin equal to the latest `skip=true`;
  an unknown row exit 1; `npm view` sorts versions (npm 11 `view.js` lines 48, 167); no Playwright 1.x released out of
  order since 1.30.
- **The gate and branch protection**: required check `build` (GitHub Actions, `non_admins`), no rulesets; both callers'
  gates fail unless `checks` succeeded; PR #60's nine jobs and the gate are green on `d850405`.
- **Publish's trigger**: success, `push`, `main`, this repository; a fork's or branch's run never reaches it; values
  reach the scripts through `env`, not inline expressions; no artifact of the triggering run is used.
- **The publish guard on the normal paths** (`G/guard/sim.sh`): a changeset pending at a published version opens the
  pull request; the release commit as main's tip publishes it; a moved-past release commit with a changeset after it
  fails with the revert instruction (decided, #4).
- **The `npm` environment**: branch policy `main` only, no reviewers, `can_admins_bypass: false` (`G/api/`).
- **changesets/action v2.1.2 with CLI 3.0.3**: the action refuses a v2 CLI; the CLI runs `pnpm publish --no-git-checks`
  and publishes a local version npm lacks; the action reads the CLI's `CHANGESETS_OUTPUT` for tags and releases; a
  failed publish fails the run.
- **The provenance check**: the attestation endpoint answers 200 for four packages with provenance and 404 for
  `pomwright@3.0.1`; the step's `jq` matches the action's `published-packages` format.
- **Pages**: the tip step skips a commit main moved past, on a first run and on a re-run of an older `CI` run, and
  deploys a re-run of the tip (`G/pages/`, `run1/G-8/`); the Pages build needs nothing outside `website/`, so it is the
  site job's build; `github-pages` allows `main` only (admins may bypass: `can_admins_bypass: true`).
- **Dependabot**: minor and patch grouped per ecosystem and directory, majors alone; `@playwright/test` ignored at the
  root and in `test/`; `typescript` and `@types/node` majors held as the guide says; pnpm 12's lockfiles handled (PR #49).
- **The benchmark**: the method on the page is the script's (call counts, warm-up, medians, heap, one worker, five
  repeats); `pnpm bench` at `d850405` reproduces the tables within about 10–25% and every stated ratio.
- **The guide's CI *Do not* items** hold: no second build or site build in a harness job; the environment, its rule, the
  guard and the gate name in place; no banner or `noindex` on the site; README's CI badge names `main.yaml`.

## Outside the segment

- **The publish job builds with publishing credentials in reach**: `pnpm install` (esbuild's allowed install script)
  and `pnpm run build` run in the job that holds `contents: write`, `pull-requests: write`, the persisted checkout token
  and the OIDC token the Trusted Publisher accepts; the environment and the publisher stop other branches and other
  workflows, not code that runs inside this job. Issue #56 (publish the tested tarball) argues from bytes; this is a
  second reason for it. A note for #56, not a finding.
- **The Version Packages pull request's PR run waits for approval**: PR #52's run was `action_required` until the
  maintainer approved it (`G/api/run-39586762544-attempt1.json`); `docs/releases.md` does not say so. Process, for 2I.
- **`.changeset/trusted-publishing.md`** says "no npm token is stored"; decision #72 deletes the repository's
  `NPM_TOKEN` secret only after the release, and secrets are not public. 2F's (changesets).
- **`playwright.base.ts`'s `globalTimeout: 60_000 * 5`** caps a harness run at five minutes; PR runs took about 2.5
  minutes per row. 2T's; no failure seen.

## Pass 2 outcomes

Of the first review's nine findings in this area: fixed 5 (G-3, G-6, G-8, G-9, G-11); fixed differently 4 (G-1, G-2,
G-5, G-10), of which G-5 also fixed incompletely (→ 2G-1, with a part regressed by its fix); still present 0; not fixed
0; cannot re-run 0. Left to 2F and 2T: G-4, G-7. Its *what is sound* lines hold, but two are moot (the deleted scripts)
and one needs a caveat (`github-pages` admin bypass); of its test gaps, 1 and 2 are closed in part, 3 is moot, the rest
are 2T's and 2F's (`first-review.md`).

## What passes 3 and 4 changed

- 2G-1 gained its first-review link (G-5), the decided part of path (b) (#4: the cancelled run is covered by the rule)
  and, in its fix plan, a pull-request check as a complement and the cost to decision #4's point 4.
- 2G-2's sketch was refined so that a re-run of a release commit whose publish failed still publishes it, the recovery
  the current code allows; `rerun.sh` gained that case.
- The reconciliation found no first-review line in this area that both maps leave unprobed; the hunt found no new
  finding (the publish job's privileges and the Version Packages pull request's approval are notes above).

## Findings

| ID | Kind | Severity | Semver | Pass | First review | One line |
| --- | --- | --- | --- | --- | --- | --- |
| [2G-1](defect-2G-1-publish-guard-judges-the-tested-commit.md) | defect | Medium | none | 1 | G-5: fixed incompletely; regressed in part | Publish's guard judges the tested commit, not main's tip: a Version Packages pull request merged before Publish refreshed it skips its version with no failing run, and a docs-only commit after a release commit fails a release the next run publishes |
| [2G-2](defect-2G-2-publish-rerun-goes-on-after-main-moved.md) | defect | Low | none | 1 | missed | A re-run of a Publish run keeps its first checkout, so it goes on after main moved and rebuilds the Version Packages pull request from an older commit |
| [2G-3](defect-2G-3-pages-every-merge-claim.md) | documentation | Low | none | 1 | new since 54cdada (3284aa4) | The guide says every merge updates the site once its checks pass; a green commit main moved past is never deployed when the newer commit's CI fails |
| [2G-4](defect-2G-4-performance-scale-line-not-reproducible.md) | documentation | Low | none | 1 | new since 54cdada (f3a058a) | *Performance*'s round-trip comparison comes from no script, so `pnpm bench` cannot refresh it, and a re-measurement does not support "under 5%" |
| [2G-5](defect-2G-5-ci-descriptions-lag-the-jobs.md) | documentation | Low | none | 1 | new since 54cdada (0905892, d850405) | *Tests and checks* lists no test-server job, and `pr.yaml`'s header names Node 20 only |

Counts: defect 2, documentation 3, suspected 0, design question 0.

## Sketches proposed (for the orchestrator)

- `G/sketch/2G-1.diff` + `2G-1.run.sh`: the guard fails when main's tip has a version npm lacks and changesets are
  pending, naming the first-parent commit that set the version; a moved-on run stops quietly otherwise. actionlint 0;
  `run.sh` exit 1 at `d850405` (three `FAIL` lines), exit 0 on the patched copy.
- `G/sketch/2G-2.diff` + `2G-2.run.sh`: the guard reads main's tip with `git ls-remote` and goes on only when tip and
  checkout are the tested commit, or the checkout is a release commit whose version npm lacks. actionlint 0; `run.sh`
  exit 1 at `d850405`, exit 0 on the patched copy.

Both are workflow diffs, checked with actionlint (1.7.12, the pinned version and checksum) and by running the step's
script on scratch histories; neither can be run as a workflow before a merge. They touch the same step and are written
each against `d850405`.

## Finishing state

The worktree is clean (`git status --porcelain` empty; `--ignored` lists exactly `baseline.md`'s entries); no probe was
left in it; no second worktree was added; port 9000 was free before and after (`pnpm bench` used no server).
