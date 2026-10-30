# Plan: retries paced as Playwright's, and a nested run's time (2R-5, 2R-6)

- **Decisions**: [121 and 122](DECISIONS.md), agreed 2026-10-30 with every recommendation. Decisions 81 and 118 note
  that 121 amends their point 1
- **Findings**: [2R-5](R-triage/defect-2R-5-seed-check-counts-the-lag-as-replacements.md) (defect, Medium),
  [2R-6](R-triage/defect-2R-6-outcomes-spec-timeout-under-load.md) (test defect, Low)
- **Bump**: patch, no new changeset. The bounded retry is unreleased (`53f571f`); its pending changeset,
  `.changeset/seed-redirect-chain.md`, is reworded
- **Stop**: after the commits, a report. The maintainer pushes
- **Depends on**: [PLAN-2R-4-domain-lookup.md](PLAN-2R-4-domain-lookup.md) (done). It comes before PLAN-2B-locators,
  which waits for the maintainer's word

## Contract

1. **POMWright's own questions retry as Playwright's actions do (decision 121, amending 81's point 1 and 118's point
   1).**
   - `seed`'s Navigation API check and `currentUrl` (the destination of a navigation message) pause before each retry
     for as long as Playwright pauses before each retry of its own actions: 20, 50, 100 and 100 ms, then 500 ms for
     every later one. In `playwright-core` 1.64.0 that is `retryWithProgressAndBackoff`, which locator actions and
     `waitForSelector` use.
   - The bound stays at 20 retries (21 tries), which now span at most 8,270 ms of pauses. Past it, `seed` lets
     Playwright's error through, labeled, and `currentUrl` names `page.url()` as it is.
   - The bound counts retries, not replacements, since one replacement can fail several tries (2R-5). The constant is
     renamed from `MAX_REPLACEMENTS` to `MAX_RETRIES`.
   - The rest is unchanged: `seed`'s check tries any other error once more (after the first pause); `currentUrl`
     names `page.url()` at once on any other error or a closed page; nothing is repeated on a closed page.
   - The pauses are not configurable, as Playwright's are not. Not `expect.toPass`'s or `expect.poll`'s `intervals`
     (options *Rejected*).
2. **The lifecycle outcomes spec gets the time a nested run needs (decision 122).** Its one test calls `test.slow()`,
   which triples the harness's 60-second timeout, with a comment saying why. POMWright's code does not change.

## Current behavior (verified 2026-10-30 at `c20bb82`)

- [sessionStorageSeed.ts:88](../src/helpers/sessionStorageSeed.ts#L88) holds `MAX_REPLACEMENTS = 20`. Its comment and
  decision 81 reason that each failed try is one replacement.
- `assertNavigationApi` ([sessionStorageSeed.ts:379-403](../src/helpers/sessionStorageSeed.ts#L379-L403)) retries at
  once, as does `currentUrl` ([sessionStorage.ts:462-473](../src/helpers/sessionStorage.ts#L462-L473)).
- Playwright's own retry: `retryWithProgressAndBackoff` and `retryWithProgressAndTimeouts` in `playwright-core`
  1.64.0, `lib/coreBundle.js`. Before each retry it waits 20, 50, 100, 100, then 500 ms, dropping the entries longer
  than a fifth of the action's timeout, and the action's timeout bounds it.
- What the user can configure is a different kind of retry, that of their own code:
  - `expect(…).toPass()`: `intervals` per call and in the config (`expect: { toPass: { intervals } }`), default 100,
    250, 500, 1000 ms;
  - `expect.poll`: `intervals` per call only.

  Neither changes the action backoff (`playwright/types/test.d.ts`).
- 2R-5's numbers: the 5-redirect seed test failed 4 of 100 runs at `908c816` and 5 of 100 at `9a437a3` (Chromium,
  `taskset -c 0-3`, 8 workers). Playwright's log showed 21 failed tries against 2 to 5 commits. In the same shape,
  Firefox and WebKit passed 200 of 200. With 2 CPUs and 8 workers it was 1 of 300 across the 2, 3 and 5 redirect tests.
- 2R-6: [lifecycle.outcomes.spec.ts:127](../test/tests/pageObject/lifecycle.outcomes.spec.ts#L127) runs
  `test/lifecycle-outcomes/` as a Playwright run of its own; [playwright.base.ts:9](../playwright.base.ts#L9) gives it
  60 seconds. It is the only spec that starts a nested run.

## The probes (prototypes in the working tree, reverted)

Each ran on the packed build, the test server's pages, the runner and `--retries=0`.

**A prototype of option A**: `RETRY_PAUSES = [20, 50, 100, 100, 500]` and a pause before each retry, in both loops.

| Probe | Today | With the pauses |
| --- | --- | --- |
| 5-redirect seed test, Chromium, `taskset -c 0-3`, 8 workers | 4 of 100 failed | 300 of 300 passed |
| 2, 3 and 5 redirects, three browsers, same shape, 50 each | (Chromium as above) | 450 of 450 |
| the `set` and `get(keys)` navigation tests, CI's shape, three browsers, 50 each | 600 of 600 (2R-4) | 300 of 300 |
| a page's first `seed` during 5 script redirects, at rest, 20 runs: median (max) | Chromium 27 (32) ms, Firefox 65 (159), WebKit 19 (25) | Chromium 31 (84) ms, Firefox 234 (384), WebKit 32 (34) |
| an app that reloads every document at once (an init script), 3 runs per browser | Chromium fails in 74 to 88 ms | Chromium fails in 8,314 to 8,317 ms |

In the reload probe, Firefox and WebKit answered the check between two reloads in either build: 8 to 129 ms today,
10 to 2,353 ms with the pauses. Their seeds were then never applied, and failed the probe at its close, as `seed`
does. The reload loop is a stand-in for an app stuck in a redirect loop: an init script plays the app. It shows how long
the check takes to give up, not how often a real loop lets it answer.

**A prototype of 2R-6's fix**: `test.slow()` in the test, Firefox, `taskset -c 0-3`, 12 copies at once.

| Build | Result |
| --- | --- |
| today | 12 of 12 failed: "Test timeout of 60000ms exceeded" |
| with `test.slow()` | 12 of 12 passed (1.7 minutes for the run) |

## Options

For 2R-5:

- **A, recommended: Playwright's pauses before each retry, the same bound.**
  - It is what Playwright does when its own actions meet a replaced document, so POMWright retries no faster than
    Playwright would. The principles page can say so plainly.
  - The lag after a replacement, Playwright's server still sending to the old context, lasted at most a few tens of
    milliseconds in the failing runs' log. The pauses outlast it, so the retries stop counting it.
  - Costs: a realistic chain takes about 0.2 s longer on Firefox (median 234 against 65 ms). An app stuck in a
    redirect loop fails after about 8.3 s instead of at once; that is still well inside a test's timeout, which is the
    bound's purpose (decision 81).
- **B: count the commits Playwright reports, and wait for the next one after a failed try.**
  - It is exact about replacements, but it waits on `framenavigated` with no timeout of Playwright's.
  - A "destroyed" that no commit follows would wait until the test's timeout. Playwright words any protocol failure of
    an evaluation that way, as 118's probe found in its source.
  - It also relies on an event for every new document, which decision 114 declined to depend on.
- **C: a larger bound, retrying at once.** The bound would be a guess at how many failures the lag makes under some
  load. Meanwhile a loop of failing round trips competes for the CPU that the browser needs to finish the navigation.

Rejected for the pauses: **the user's `toPass` or `poll` intervals**. Those pace the user's own retries of their code,
and the docs' example is `[1_000, 2_000, 10_000]`. POMWright's question is like Playwright's internal action retry,
whose pauses are fixed.

For 2R-6:

- **`test.slow()`, recommended.** It is Playwright's own marker for a slow test and follows the configured timeout
  (three times it).
- **Rejected:**
  - `test.setTimeout(n)`, a number of the harness's own;
  - a larger timeout for every test, which would hide a slow test elsewhere.

## Implementation (one commit each)

1. **The pauses (decision 121), with the records.**
   - `sessionStorageSeed.ts`:
     - `MAX_RETRIES` (renamed from `MAX_REPLACEMENTS`), its comment saying it counts retries and why;
     - `RETRY_PAUSES` and `pauseBeforeRetry(retry)`, whose comment cites `retryWithProgressAndBackoff`;
     - `assertNavigationApi` pauses before each retry, and its doc comment says so.
   - `sessionStorage.ts`: `currentUrl` the same, with its doc comment.
   - Unit tests, with vitest's fake timers as a stand-in for time, which their comment says. They check:
     - the pauses before each retry, 20, 50, 100, 100, 500, 500 ms, in both loops;
     - that no retry starts before its pause ends.

     The existing tests of the bound ("takes up to 20 replacements", "fails on the 21st…", "asks through up to 20
     replacements…") run under the fake timers and are renamed for retries.
   - Docs:
     - `.changeset/seed-redirect-chain.md`;
     - *Internal → Seed registry*, both paragraphs that give the bound, without the one-failure-per-replacement
       reasoning;
     - *Principles*, *What POMWright does not do*: "it asks again in the next document, pausing as Playwright's own
       actions do, up to 20 times";
     - `src/helpers/AGENTS.md`.
   - The records: decisions 121 and 122, the notes on 81 and 118, 2R-5's status, the ledger.
2. **The nested run's time (decision 122).** `test.slow()` in the outcomes spec, with its comment: a whole Playwright
   run of its own, about 12.5 s at rest and up to about 57 s with 8 copies on 4 CPUs.
3. **The execution notes**, and the statuses set to done.

## Tests

- **Unit**: step 1's tests fail on today's code (no pause) and pass with it.
- **Harness**, with `--retries=0`:

  | Test | Shape | Runs | Must |
  | --- | --- | --- | --- |
  | the 5-redirect seed test | Chromium, `taskset -c 0-3`, 8 workers | 300 | pass all (4 of 100 fail today) |
  | the 2, 3 and 5 redirect tests | three browsers, the same shape | 50 each | pass all |
  | the `set` and `get(keys)` navigation tests | three browsers, `taskset -c 0-3`, 2 workers | 50 each | pass all |
  | the outcomes spec | Firefox, `taskset -c 0-3`, 12 copies at once | 12 | pass all (12 of 12 fail today) |

- No harness case for a redirect loop. The browsers differ there: in the probe, Firefox and WebKit answered between
  two reloads. The bound and its pauses are unit-tested, and the probe's numbers are recorded here.

## Docs

The changeset, *Internal → Seed registry*, *Principles* and `src/helpers/AGENTS.md` (step 1). No Docs or API page
gives the bound.

## Verification

- `pnpm lint`, `pnpm test:unit`, `pnpm docs:build`, `pnpm lint:guide`.
- The full `pnpm test:constrained --reporter=line` (it must pass), and the full `pnpm pack-test --reporter=line`.
- The grep for the external consumer projects' names.

## Decisions checklist

Each item has a default, so "agreed" settles them all.

1. [x] Decision 121, option A: Playwright's action pauses (20, 50, 100, 100, then 500 ms) before each retry of `seed`'s
   check and `currentUrl`, the bound kept at 20 retries. Default: yes.
2. [x] `MAX_REPLACEMENTS` renamed `MAX_RETRIES`, and the one-failure-per-replacement reasoning removed everywhere it is
   written. Default: yes.
3. [x] The pauses are fixed, as Playwright's are; not read from `toPass` or `poll` intervals. Default: yes.
4. [x] Unit tests with fake timers; no harness case for a redirect loop, the probe recorded instead. Default: yes.
5. [x] Decision 122: `test.slow()` for the lifecycle outcomes spec, with its comment. Default: yes.

## Execution

Steps 1 to 3 in order, each verified and committed with the trailer. Then a report; anything unexpected is reported
with a recommendation.

## Execution notes

- 2026-10-30. The plan was committed in `39e531f`, then one commit per step: `2b9a7d8` (1), `f4f4fe0` (2), and this
  record (3).
- **Unit:** the four pause tests failed on the code before step 1 (no pause) and pass with it; the tests of the bound
  run under fake timers. 970 unit tests.
- **Harness** (the packed build, `--retries=0`):

  | Run | Result |
  | --- | --- |
  | the storage specs, three browsers | 357 passed, 3 skipped; error messages unchanged (78 thrown) |
  | the 5-redirect seed test, Chromium, `taskset -c 0-3`, 8 workers, 300 runs | 300 of 300 (4 of 100 failed before) |
  | the 2, 3 and 5 redirect tests, three browsers, the same shape, 50 each | 450 of 450 |
  | the `set` and `get(keys)` navigation tests, three browsers, `taskset -c 0-3`, 2 workers, 50 each | 300 of 300 |
  | the outcomes spec with `test.slow()`, Firefox, 12 copies on 4 CPUs | 12 of 12 (12 of 12 timed out before) |

- **Full runs:**
  - `pnpm test:constrained --reporter=line`: 1842 passed and 3 skipped in 276 s; 970 unit; 33 step locations; 27
    test-server tests. It passed in full, as the plan required.
  - `pnpm lint`, `pnpm docs:build` and `pnpm lint:guide` pass, and no name of the external consumer projects appears on
    the branch.
  - **Unexpected:** the full `pnpm pack-test --reporter=line` at rest (16 workers) failed 1 test: 1841 passed, 3
    skipped, 136 s. It is outside this plan and pre-existing, and is filed for the maintainer as
    [2R-7](R-triage/defect-2R-7-seed-writes-into-an-arrived-document.md).
    - The test: `sessionStorageOverlay.spec.ts` on Firefox. A seed called on `about:blank` resolved, and the
      document's first script saw no entry.
    - Its rate on Firefox at 16 workers: 5 of 200 runs here, and 4 of 200 at `908c816`, before this plan. Chromium
      and WebKit were 0 of 200 at `908c816`, and the same race without the overlay was 0 of 200 here.
    - Playwright's log shows the cause: `seed`'s write-at-once path for an inherited origin asked `self.origin` of the
      document that had arrived on the origin during the call.
- The scratch worktree of `908c816` used for 2R-7's baseline was removed.
