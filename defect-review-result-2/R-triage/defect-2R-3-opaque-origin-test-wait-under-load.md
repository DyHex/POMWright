# 2R-3: the Firefox case of "a document with an opaque origin" fails under load in its own wait

- **Kind**: test defect (flaky under load)
- **Status**: decided 2026-10-30, decision 119 in [DECISIONS.md](../DECISIONS.md) (the test waits with
  `expect.poll`); planned in [PLAN-2R-2-2R-3-destination-and-load.md](../PLAN-2R-2-2R-3-destination-and-load.md)
- **Area**: `test/tests/testApp/sessionStorage.spec.ts`, *a document with an opaque origin*
- **Severity**: Low (the test, not POMWright; the shape CI's runner has can hit it, on `main`, where Firefox runs)
- **Semver of the fix**: none (a test)
- **Found**: 2026-10-29, probing 2R-2's fix with the CPUs constrained
- **Reviewed**: the branch at `9a437a3`, Opus 5.5

## Observed

- The test ([sessionStorage.spec.ts:107-131](../../test/tests/testApp/sessionStorage.spec.ts#L107-L131)) goes offline,
  lets `page.goto` to the seeded origin fail, and on Chromium and Firefox waits for the error page with
  `page.waitForURL((url) => url.href !== B/testpath, { waitUntil: "commit" })` (line 118). On Firefox that wait
  rejected with `page.waitForURL: NS_ERROR_OFFLINE`, before any storage call.
- The packed build, Firefox, `--retries=0`: 1 of 60 failed with `taskset -c 0-3` and 2 workers (CI's shape), 0 of 60 at
  rest (1 worker); 4 of 30 in a run of every navigation test in the same shape.

## Cause

Inferred, not traced: under load the failed navigation reaches the test's wait before Firefox's error page commits,
and `waitForURL` fails with that navigation's error instead of waiting for the commit after it.

## Fix

In the plan: wait for the error page in a way a failed navigation does not reject, probed in the same shape.
