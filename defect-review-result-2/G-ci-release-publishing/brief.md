# Segment 2G: CI, release and publishing

Segment 2G of the second review at `d850405`. Read [../segments.md](../segments.md) first (the four passes, where things
are, probing, what to write), then [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/G/`. Review it as an *area* in the skill's terms, with the commits
since `v3.0.1` as a change set.

## The guide, read first

`AGENTS.md`, `.github/AGENTS.md`, `test/AGENTS.md`, `docs/releases.md` and `docs/versioning.md`, in full, in the
worktree.

## In scope

- **Workflows**: `.github/workflows/checks.yaml`, `pr.yaml`, `main.yaml`, `publish.yaml`, `pages.yaml`;
  `.github/dependabot.yml`; `.github/CODEOWNERS`; the scripts only CI runs (`scripts/ci-playwright-version.sh`, and what
  the jobs run inline).
- **Release and publishing**: the path from a merge to a published version and a deployed site, as the workflows and
  the guide describe it: the `workflow_run` trigger, the tested-commit guard, the changesets action, the `npm`
  environment, Trusted Publishing and provenance, and the Pages deploy.
- **The benchmark**: `scripts/benchmark.mjs`, `test/playwright.bench.config.ts`, `test/benchmarks/`, and
  `internal/performance.md`'s claims about it.
- **Docs**: `.github/AGENTS.md`, `docs/releases.md`'s *Carrying out a release*, the CI section of
  `website/src/content/docs/internal/tests-and-checks.md`, and the building and publishing part of
  `internal/documentation.md`.
- **Real runs**: GitHub's public API, read-only (`curl https://api.github.com/repos/DyHex/POMWright/...`): the workflow
  runs of PR #60 and of `main`, their jobs and, where a finding needs it, their logs. The branch's last run, on
  `d850405`, is listed in [../baseline.md](../baseline.md).

## The change set

`git -C /home/magdys/workspace/dyhex/POMWright-second-review log --format='%h %ad %s' --date=short v3.0.1..HEAD -- .github scripts/ci-playwright-version.sh scripts/benchmark.mjs test/playwright.bench.config.ts test/benchmarks docs/releases.md ':!defect-review-result'`.
Read each diff; the commits after `54cdada` first.

## Questions for pass 1

On top of the skill's checklist; questions, not suspicions.

- **What is tested**: for each job, which commit it tests and which it reports on, on a pull request, a push to `main`,
  a re-run, and when `main` moves on during a run; what the required check covers.
- **Publishing**: every path through `publish.yaml` (a normal push, a release commit, `main` moving on, a re-run, a
  failed publish, a fork), and whether each ends as the guide says; what the environment and the Trusted Publisher
  together allow, and what they do not stop.
- **Pages**: which commit it deploys on each path.
- **Supply chain**: permissions per job, pinned actions and tools, what Dependabot proposes against the decided pins.
- **The Node and Playwright matrix**: against the guide's rules and `engines`, and what a contributor's local run covers
  that CI does not, and the reverse.
- **The benchmark**: does it measure what the performance page says, and is the page's data reproducible?

## Pass 2: the first review

Its scope G: `defect-review-result/G-ci-and-tooling/` (the CI, release, publishing and benchmark findings; its test and
check findings are 2T's); the ledger rows of `defect-review-result/report.md` whose area is CI, release, publishing or
tooling, their `DECISIONS.md` entries and their plans; the items `PLAN-release-gates-and-audit.md` leaves for the second
review in this area, and its notes on the GitHub environment (`PLAN-publish-environment-node-lines.md`); the first
`inventory.md`'s lines tagged `[G]`. Probes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/`.

## Neighbours

The test harness, the test server and the docs checks are 2T's, packaging 2F's, the guide as a whole 2I's. Report what
you meet there under *outside the segment*.
