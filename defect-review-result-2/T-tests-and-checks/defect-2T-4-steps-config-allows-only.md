# 2T-4: The step-location run accepts a stray `test.only` in CI, and then checks only the focused test's file and passes

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 98 in [DECISIONS.md](../DECISIONS.md) (forbidOnly in the steps and outcomes configs); planned in the checks plan
- **Area**: run-level checks: `test/playwright.steps.config.ts`, `test/step-locations/locationReporter.ts`
- **Severity**: Low (needs a `test.only` committed by mistake; then 31 location checks drop out of every CI run without
  a sign)
- **Semver of the fix**: none (test configuration only)
- **Pass**: 1
- **First review**: new since 54cdada (b19de77 made the reporter require every marker of the files in the run;
  69bc09a added the second spec file). It narrows the first review's test gap 1 (G's gap 4: no marker was
  required), which decision 12 closed with that reporter; the config itself is unchanged since 54cdada
- **Reviewed**: `d850405`, 2026-10-28T18:37+01:00, Opus 5.5, second review, segment 2T

## Contract

- `test/AGENTS.md`, *The harness*: "its reporter fails the run when a step or an error with that id is reported on
  another line, or a marked line is never reported"; it "runs from `test/playwright.steps.config.ts`, which
  `pack-test.sh` runs after the harness, so no `--reporter` given to the harness can switch it off."
- `locationReporter.ts:16-17`: "Fails the run ... when a marked line is never checked (a probe that stops reporting
  would otherwise pass)."
- The harness's own rule, `playwright.base.ts:13`: `forbidOnly: !!process.env.CI`, which the harness config and the
  test-server config spread in; the steps config does not (`test/playwright.steps.config.ts` sets only `testDir` and
  `reporter`).

## Reproduction

Probe sources in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/steps/`, each copied into the worktree,
run, and removed.

1. The reporter does what it says for a wrong line (control). `zz-probe-T-wrong.spec.ts` in `test/step-locations/`:

   ```sh
   pnpm -C test exec playwright test -c playwright.steps.config.ts zz-probe-T-wrong
   ```

   exit 1:

   ```text
   step locations: 2 wrong
     step "probe-wrong": expected zz-probe-T-wrong.spec.ts:11, reported zz-probe-T-wrong.spec.ts:12
     "probe-never" at zz-probe-T-wrong.spec.ts:13: no step or error with this id was reported
   ```

2. A focused test. `zz-probe-T-only.spec.ts` (one `test.only` calling a `@step` marked on its line) in
   `test/step-locations/`, the whole steps run as `pack-test.sh` starts it, with `CI=1`:

   ```sh
   CI=1 pnpm -C test exec playwright test -c playwright.steps.config.ts
   ```

   exit 0:

   ```text
   [1/1] step-locations/zz-probe-T-only.spec.ts:10:6 › a focused probe
     1 passed (332ms)
   step locations: 1 checked, all where they were called
   ```

   The baseline's steps run checks 31 locations in 11 tests (`baseline.md`, pack-test row).
3. The same file under the harness config, `CI=1`, in `test/tests/`:

   ```sh
   CI=1 pnpm -C test exec playwright test tests/zz-probe-T-only.spec.ts --project=chromium --reporter=line
   ```

   exit 1: `Error: item focused with '.only' is not allowed due to the 'forbidOnly' option in '../playwright.config.ts': "zz-probe-T-only.spec.ts a focused probe"`.

## Observed / expected

Observed: with a `test.only` anywhere under `test/step-locations/`, Playwright runs only the focused tests; the reporter
reads markers only from the files of the tests in the run (`onBegin`, `suite.allTests()`), so the other file's markers
are never loaded and never missed. A `test.only` in `legacyDecorators.spec.ts` drops all of `stepLocations.spec.ts` the
same way. The run prints a passing summary and exits 0, in CI too.

Expected: as in the harness, a focused test fails a CI run (`forbidOnly`), so the step-location check cannot be narrowed
by accident, and "a marked line is never reported" covers every marked line of the folder.

## Cause

`test/playwright.steps.config.ts` does not spread `baseConfig` (it does not need its browsers or reporters) and so lacks
its `forbidOnly`; `LocationReporter.onBegin` collects markers per file of the tests that run, not of the files in
`testDir`.

## Fix plan

- **Intended contract**: the step-location run checks every marker of `test/step-locations/` in CI.
- **Options**:
  1. (recommended) Add `forbidOnly: !!process.env.CI` to `test/playwright.steps.config.ts` (and to
     `test/lifecycle-outcomes/playwright.config.ts` for consistency, though there a focus already fails the outcomes
     comparison). Cost: one line each.
  2. Also make the reporter read the markers of every `*.spec.ts` in its `testDir` in `onBegin`, so a filter or a
     focus that leaves a marked file out fails locally too. Cost: a filter given on purpose
     (`... -c playwright.steps.config.ts stepLocations`) would then fail; acceptable only if the docs say to run the
     folder whole.
- **Implementation steps**: the config line; for option 2, `locationReporter.ts`, `onBegin`.
- **Tests**: the probe above, run again with `CI=1`, exits 1 with Playwright's `forbidOnly` error.
- **Docs**: none.
- **Changeset**: none.
- **Decisions to tick**: option 2's effect on filtered local runs.
