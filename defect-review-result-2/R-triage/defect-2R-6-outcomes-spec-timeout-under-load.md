# 2R-6: the lifecycle outcomes spec's nested run outgrows the test timeout under load

- **Kind**: test defect (a timeout sized for an idle machine)
- **Status**: found 2026-10-30; planned in
  [PLAN-2R-5-2R-6-retries-under-load.md](../PLAN-2R-5-2R-6-retries-under-load.md), agreed 2026-10-30
- **Area**: `test/tests/pageObject/lifecycle.outcomes.spec.ts`
- **Severity**: Low (the test, not POMWright)
- **Semver of the fix**: none
- **Found**: 2026-10-30, the first `pnpm test:constrained` after
  [PLAN-2R-4-domain-lookup.md](../PLAN-2R-4-domain-lookup.md): Firefox, "Test timeout of 60000ms exceeded"
- **Reviewed**: the branch at `908c816`, Opus 5.5

## Observed

- The test runs `test/lifecycle-outcomes/` as a Playwright run of its own (`execFile` of Playwright's CLI, its own
  browser) inside one test, with the harness's 60-second timeout.
- Its duration on Firefox, the packed build:

  | Shape | Duration |
  | --- | --- |
  | at rest, 1 worker | 12.5 to 12.6 s (3 runs) |
  | `taskset -c 0-3`, 8 copies at once | 49.9 to 56.8 s (8 runs) |

  Inside the whole constrained suite, with every other test running beside it, one run passed 60 s.
- A stand-in in the measurement: `PLAYWRIGHT_JSON_OUTPUT_NAME`, set to read the durations, also reached the nested
  run, which then wrote its report to that file instead of stdout. So each test failed on its assertion, after the
  nested run had finished. The durations are those of whole nested runs; the failures are the measurement's.

## Cause

A test that starts a whole Playwright run has the timeout of a single test.

## Fix

To be planned: give this test the time a nested run needs (`test.slow()`, which triples it, with a comment), probed in
the constrained shape.
