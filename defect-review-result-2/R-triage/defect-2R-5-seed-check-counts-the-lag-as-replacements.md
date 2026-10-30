# 2R-5: `seed`'s Navigation API check counts Playwright's lag as replacements, and gives up during a short chain

- **Kind**: defect
- **Status**: found 2026-10-30; planned in
  [PLAN-2R-5-2R-6-retries-under-load.md](../PLAN-2R-5-2R-6-retries-under-load.md), agreed 2026-10-30
- **Area**: `assertNavigationApi` in `src/helpers/sessionStorageSeed.ts` (decision 81); in principle also `currentUrl`
  in `src/helpers/sessionStorage.ts` (decision 118), which uses the same bound
- **Severity**: Medium, as [2A-1](../A-session-storage/defect-2A-1-seed-fails-during-redirect-chain.md), whose fix
  this limits: a page's first `seed` while the app redirects itself on load fails, under load only
- **Semver of the fix**: patch, unreleased (the bounded retry is new in 3.0.2, `53f571f`)
- **Found**: 2026-10-30, the first `pnpm test:constrained` after
  [PLAN-2R-4-domain-lookup.md](../PLAN-2R-4-domain-lookup.md): *a page's first seed while the page redirects itself 5
  times by script registers* failed on Chromium
- **Reviewed**: the branch at `908c816`, Opus 5.5

## Observed

- The check ([sessionStorageSeed.ts](../../src/helpers/sessionStorageSeed.ts), `assertNavigationApi`) repeats its
  evaluation at once while it fails as a replaced document, up to `MAX_REPLACEMENTS` (20) failures. Decision 81 reasoned
  that "each failed try is one replacement (Playwright evaluates in the new document once it exists)".
- The harness test, 100 runs (3 fresh pages each), Chromium, `taskset -c 0-3`, 8 workers, `--retries=0`, all with the
  packed build:

  | Build | Failed runs | Error |
  | --- | --- | --- |
  | `908c816` | 4 of 100 | `Second.SessionStorage.seed: page.evaluate: Execution context was destroyed, …` |
  | `9a437a3`, before the day's plans | 5 of 100 | the same |

  The check's code is unchanged in behavior since `53f571f`; today's commits only moved its test into
  `replacedByNavigation`.
- Playwright's log (`DEBUG=pw:api`, captured in each result) for 7 failed runs out of 100: 21 failed evaluations while
  Playwright's client heard of only 2 to 5 commits. After a replacement, the evaluations fail within 0 to 1 ms each,
  several in a row, before the next commit is heard. These lines are from one run, the URL shortened:

  ```text
  => page.evaluate started +0ms
  <= page.evaluate failed +1ms
  => page.evaluate started +17ms
  <= page.evaluate failed +0ms
  => page.evaluate started +1ms
    "commit" event fired +3ms
    navigated to "http://localhost:9000/teststorage/bounce?to=…"
  <= page.evaluate failed +20ms
  ```

## Cause

Inferred from the log and decision 118's probe: while Playwright's server still holds the replaced document's context,
an evaluation is sent to it and fails at once, so one replacement can produce several failures, and the loop, which does
not wait between tries, counts each. Under load that window is longer, and five script redirects use up 21 tries.

`currentUrl` (decision 118) counts the same way. It asks once a document is gone, so one replacement's window would have
to hold 21 failures before it names `page.url()` as it is. 1300 runs of the two navigation tests, at rest and on 2 and 4
CPUs, showed none, but nothing bounds it.

## Fix

To be planned: count replacements by something other than failed tries (the commits Playwright reports, or a wait for
the next one between tries), or raise the bound; probed in this shape, against these numbers.
