# Segment 2T: The tests and the checks

Segment 2T of the second review at `d850405`. Read [../segments.md](../segments.md) first (the four passes, where things
are, probing, what to write), then [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/`. Review it as an *area* in the skill's terms, with the commits
since `v3.0.1` as a change set. The area segments judged whether each contract holds; this segment judges whether the
tests and the checks can be trusted to say so.

## The guide, read first

`AGENTS.md`, `test/AGENTS.md`, `website/AGENTS.md` (the docs checks) and `.github/AGENTS.md` (how CI runs them), in
full, in the worktree.

## In scope

- **The harness's mechanics**: `test/package.json` and its pin, `test/playwright.config.ts`, `playwright.steps.config.ts`,
  `playwright.test-server.config.ts`, `playwright.base.ts`, `vitest.config.ts`, `tsconfig.vitest.json`, `test/tsconfig*.json`,
  `pack-test.sh`, `test-server-check.sh`, `test/fixtures/`, `test/.env` and `test/.gitignore`.
- **The test server**: `test/server.js` (every route), `test/test-data/staticPage/`, and the external-request check
  (`test/test-server/externalRequests.spec.ts`).
- **The run-level checks**: the lifecycle-outcomes run (`test/lifecycle-outcomes/`,
  `test/tests/pageObject/lifecycle.outcomes.spec.ts`), the step-location check (`test/step-locations/`, its reporter
  and config), the documentation chains (`test/tests/docs/docsChains.spec.ts`).
- **The documentation checks**: `scripts/check-doc-snippets.mjs`, `check-api-coverage.mjs`, `check-error-messages.mjs`,
  `check-diagrams.mjs`.
- **The specs as a whole**: whether each spec tests what its title says, against the packed package where it matters
  (sample across the folders of `test/tests/`; the area segments read their own specs in full).
- **Docs**: `website/src/content/docs/internal/tests-and-checks.md` (all but the CI section), the checks parts of
  `internal/documentation.md`, `test/AGENTS.md`.

## The change set

`git -C /home/magdys/workspace/dyhex/POMWright-second-review log --format='%h %ad %s' --date=short v3.0.1..HEAD -- test pack-test.sh test-server-check.sh playwright.base.ts vitest.config.ts tsconfig.vitest.json scripts/check-doc-snippets.mjs scripts/check-api-coverage.mjs scripts/check-error-messages.mjs scripts/check-diagrams.mjs ':!defect-review-result'`.
Read each diff; the commits after `54cdada` first.

## Questions for pass 1

On top of the skill's checklist; questions, not suspicions.

- **Does each check catch what it says?** Break the thing it guards in a sketch (a stale chain on a page, a message
  missing from *Error messages*, an export without an API section or `@see`, an example that does not compile, a page
  that loads from another host, a step reported on another line, a row of the outcomes table that changed) and see it
  fail; then restore. And does it flag only that?
- **False passes**: a spec that passes whatever the code does (an assertion that never runs, a swallowed error, a soft
  assertion without a hard one, a skip or `test.fail` that hides more than it says).
- **What runs against what**: the packed package or the source, which browsers, which Node line, which Playwright.
- **Stability**: timeouts, ordering, shared state, the fixed port, anything a slow machine or CI would turn into a flake.
- **Test gaps across the repository**: contracts no test covers, most important first. This list is the
  consolidation's main input for the report's test gaps.

## Pass 2: the first review

The first review had no scope for this; its test findings and gaps are spread out. Read: the test and check findings of
`defect-review-result/G-ci-and-tooling/`; the test gaps in `defect-review-result/report.md` and in every scope's
`summary.md` (`defect-review-result/*/summary.md`); the ledger rows and plans whose ID starts with `T`, and the
`DECISIONS.md` entries they name; the items `PLAN-release-gates-and-audit.md` leaves for the second review in this area,
and `PLAN-static-page.md`; the first `inventory.md`'s *Tests and tooling* lines. For each first-review test gap: closed
by a test since (name it), or still open. Probes: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/G/` and the
other scopes' folders as the findings name them.

## Neighbours

CI's workflows are 2G's, the contracts the specs check are the area segments', the docs pages' content 2H's. Report what
you meet there under *outside the segment*.
