# 2R-7: a seed called on `about:blank` can write at once into the document that arrives during the call

- **Kind**: defect
- **Status**: found 2026-10-30; planned in
  [PLAN-2R-7-seed-inherited-arrival.md](../PLAN-2R-7-seed-inherited-arrival.md), agreed 2026-10-30; decision 123
- **Area**: `seed`'s write-at-once path for a page whose URL has no origin (`writeOnOrigin` in
  `src/helpers/sessionStorage.ts`, the `mayHaveInherited` branch of `SeedRegistry.add` in
  `src/helpers/sessionStorageSeed.ts`)
- **Severity**: Medium. The call resolves, and the app's first script ran without the entries: what `seed` promises
  never happens. Real timing hit it only with Playwright's step overlay, on Firefox; once the timing lands, every
  browser writes into the arrived document (the plan's deterministic case).
- **Semver of the fix**: patch
- **Found**: 2026-10-30, the full `pnpm pack-test` after
  [PLAN-2R-5-2R-6-retries-under-load.md](../PLAN-2R-5-2R-6-retries-under-load.md):
  `sessionStorageOverlay.spec.ts`, *a seed raced by the hop fails at the call, never resolving without its entries*,
  Firefox, round 3: the call resolved and the document's first script saw `{}`
- **Reviewed**: the branch at `f4f4fe0`, Opus 5.5

## Observed

- The test makes 5 fresh pages per run. On each it calls `seed` without awaiting it, then `page.goto` to the seeded
  origin, with `video: { show: { test } }`, whose overlay delays a step's body by a round trip to the browser.
- Firefox, the packed build, 16 workers, `--retries=0`, 200 runs each:

  | Build | Test | Failed runs |
  | --- | --- | --- |
  | `f4f4fe0` | the overlay test | 5 of 200 |
  | `908c816`, before the day's pause change | the overlay test | 4 of 200 |
  | `908c816` | the overlay test on Chromium and WebKit, 100 each | 0 of 200 |
  | `f4f4fe0` | *a seed not awaited before the hop … (5 fresh pages)*, the same race without the overlay | 0 of 200 |

- Playwright's log (`DEBUG=pw:api`, in each failed result's stderr), one failed round, in order:
  1. `page.goto` starts;
  2. "commit" and `navigated to "http://127.0.0.1:9000/teststorage"`;
  3. `page.evaluate` (the `self.origin` question) starts and succeeds;
  4. `page.evaluateHandle`, `webStorage.setItem` and `elementHandle.evaluate` follow: the write at once.
  The same order appears in the other failed round read.

- A deterministic case: Playwright's `page.evaluate` and `page.evaluateHandle` were wrapped so that the page commits
  on the seeded origin right before the seed's first evaluation, a stand-in for the timing. Today the call resolved, and
  the arrived document's storage held the entry, 30 of 30 runs on three browsers.

## Cause

At the call the page was on `about:blank`, so the call may write at once if the document inherited the seeded origin,
as a popup's does (`52f2d4c`). In its turn `SeedRegistry.add` read the main frame's URL, still without an
origin, and called `writeOnOrigin`. That function asks the page for `self.origin`, and Playwright evaluated it in the
document that had meanwhile arrived on the origin. The answer matched, so `seed` wrote into that document after its
first script had run.

The registry watches commits on the origin from the call on (`snapshot.committed`), and `register` fails such a call
with the in-flight message. The write-at-once path does not consult the watch, and its answer comes from whichever
document answers.

## Fix

To be planned: decide from the document that answers. For example, ask `location.href` with `self.origin` and count a
document whose URL has the origin as an arrival, which fails with the in-flight message as `register` does; and keep
the write in that same document (its handle), so a commit between the question and the write is caught too. Probed in
the overlay shape on Firefox, against these numbers.
