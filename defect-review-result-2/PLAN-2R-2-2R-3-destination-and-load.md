# Plan: where the page went, and the harness under load (2R-2, 2R-3)

- **Decisions**: [118 and 119](DECISIONS.md), agreed 2026-10-30 with every recommendation; decision 86 notes that 118
  amends its point 2
- **Findings**: [2R-2](R-triage/defect-2R-2-navigation-message-names-the-start-page.md) (defect, Low),
  [2R-3](R-triage/defect-2R-3-opaque-origin-test-wait-under-load.md) (test defect, Low)
- **Bump**: patch, no new changeset: the navigation messages are unreleased, and `batch-navigation-message.md` already
  says the message names where the page went
- **Stop**: after this plan is written, for the maintainer's review; after the commits, a report. The maintainer pushes
- **Depends on**: nothing. It comes before PLAN-2B-locators, which waits for the maintainer's word

## Contract

1. **The message names where the page went (decision 118, amending 86's point 2).** A call fails because its
   document went away when a storage call or the document check fails with "Execution context was destroyed". The
   message then names the URL the page's current document reports, `location.href`, asked after the failure.
   Playwright runs the evaluation in the document that replaced the call's once it exists. The evaluation is repeated
   while a navigation destroys it and the page is open, up to `MAX_REPLACEMENTS` (20, as `seed`'s check does, decision
   81). Past that, or on any other error (a closed page), the message names `page.url()` as it is.
   - It is `location.href`, not `document.URL`: on Firefox's error page, `document.URL` is `about:neterror?…`, while
     `location.href` and `page.url()` are the failed URL.
   - A call that succeeds costs nothing more. The message's form, its keys and the order of the checks do not change.
   - The storage call is never repeated. Only POMWright's own question, which URL the page is on, is asked again.
2. **The principles say which retries POMWright does not make (decision 118).** *What POMWright does not do* now says
   "retry anything", which `seed`'s check (decision 81, in 3.0.1) already does not hold to. It says instead that
   POMWright never retries what the test asked for. A question of its own that a navigation cut off is asked again in
   the next document, bounded, as Playwright's own waits do.
3. **The harness under load (decision 119).**
   1. `globalTimeout` is 15 minutes.
   2. `workers` is `process.env.CI ? "50%" : "50%"`, so the local value can be tuned later without touching CI's.
   3. `pnpm test:constrained` runs `pnpm test` with 8 workers on 4 CPUs (`taskset -c 0-3`). It is Linux only, run
      locally, and not part of CI.
   4. The guide says when to run it and what a failure under it means.
   5. 2R-3's test waits for the error page in a way a failed navigation does not reject.

## Current behavior (verified 2026-10-29 at `9a437a3`)

- [sessionStorage.ts:425-432](../src/helpers/sessionStorage.ts#L425-L432), `guarded`, names `page.url()` at once.
  `access` ([sessionStorage.ts:360-368](../src/helpers/sessionStorage.ts#L360-L368)) evaluates `document.domain`
  once on any failure. That lookup sometimes waits for the new document, which hides the defect; sometimes it reaches
  the old document and fails too. The order is quoted from Playwright's channel log in 2R-2, with the failure rates:
  - `set` at rest: 125 of 300 failed (0 of 300 at `c7d998c`, before decision 114);
  - with 4 CPUs and 2 workers: `set` 104 of 300, `get(keys)` 14 of 300.
- [sessionStorageSeed.ts:79](../src/helpers/sessionStorageSeed.ts#L79) holds `MAX_REPLACEMENTS = 20`.
  [sessionStorageSeed.ts:386](../src/helpers/sessionStorageSeed.ts#L386) tests for "Execution context was destroyed",
  and so does `guarded` (line 425).
- [playwright.base.ts:7](../playwright.base.ts#L7) sets a 5-minute `globalTimeout`; line 17 sets `workers: "50%"`.
  - CI's two reports give 2 workers (`actualWorkers`), so the runner has 4 threads.
  - Each harness job runs one browser ([checks.yaml:125](../.github/workflows/checks.yaml#L125), line 164), and no job
    sets `timeout-minutes`. The chromium job's run took 97 s and 71 s.
  - The maintainer's `pnpm run test --workers=1` stopped at 300 s, with 1,235 of 1,845 tests run (one failed: 2R-2).
- [package.json:55](../package.json#L55) defines `test` as `pnpm test:unit && pnpm pack-test`. Arguments go to
  `pack-test`, as the maintainer's `--workers=1` run shows.
- The maintainer's machine, per `lscpu`:
  - CPUs 0-15 are 8 performance cores with two threads each (5.4 GHz); 16-31 are 16 efficiency cores (4.0 GHz).
  - `taskset -c 0-3` is two performance cores with four threads: the runner's shape (2 cores, 4 threads), on faster
    cores.

## The probe of the fix (a prototype in `guarded`, reverted)

After the error, the prototype evaluated `location.href`, repeated while destroyed (at most 5 times). It logged
`page.url()` before and after, and the message took `page.url()` after. That is option A below; option B names the
`location.href` the same evaluation returned, which the last column compares. It used the packed build, the test's
real pages and `--retries=0`.

| Shape | Tests | Passed | Stale URL at the error | Evaluations needed | `page.url()` after = `location.href` |
| --- | --- | --- | --- | --- | --- |
| 1 worker, at rest, Chromium | `set` and `get(keys)`, 150 each | 300 of 300 | 54 | 1, every time | every time |
| `taskset -c 0-3`, 2 workers, three browsers | the same, 100 each | 600 of 600 | 12 | 1 | every time |
| `taskset -c 0-1`, 4 workers, Chromium | the same, 200 each | 400 of 400 | 66 | 1 | every time |
| `taskset -c 0-3`, 2 workers, three browsers | the navigation, document and opaque-origin tests, 10 each | 986 of 990 | 9, and 231 same-URL reloads | 1 | every time |

- The four failures are 2R-3, in the test's own wait before any storage call. It fails 1 of 60 without the prototype
  too.
- "1 evaluation" is the second one after the error: `access`'s lookup is the first, and when it failed, the next one
  succeeded.

### Where `location.href` and `page.url()` differ (probed 2026-10-30)

Playwright 1.64.0 was driven from a plain Node script, not the runner. It went offline and navigated to
`http://example.invalid/`, not to the test server.

- That is a stand-in for the runner and the server: a comparison of two URLs needs neither.
- It could hide nothing about timing, and it makes no claim about timing.

| Browser | New page | `data:` URL | After a failed navigation |
| --- | --- | --- | --- |
| Chromium | equal (`about:blank`) | equal | equal: `chrome-error://chromewebdata/` |
| Firefox | equal | equal | equal: the failed URL. `document.URL` is `about:neterror?…` |
| WebKit | equal | equal | equal: it stays on the page it was on |

### When no new document follows (probed 2026-10-30)

The same kind of script, with a local server. The crash row is Chromium only (`chrome://crash`); Playwright's source
marks a crashed page's session the same way in all three browsers.

| Case | The evaluation in flight | The next evaluation |
| --- | --- | --- |
| The page closes (three browsers) | rejects: "Target page, context or browser has been closed" | the same, at once |
| The page crashes (Chromium) | rejects: "Target crashed" | the same, at once |
| `document.open()` and `write` (three browsers) | keeps waiting: nothing is destroyed | answers, same URL |
| `Content-Security-Policy: sandbox` without scripts, `javaScriptEnabled: false` (three browsers) | not tried | answers |

- A closed or crashed page is never "destroyed": Playwright rewrites an evaluation's protocol error into "Execution
  context was destroyed, most likely because of a navigation" only when it is not a JavaScript error and the session is
  not closed or crashed (`rewriteError` per browser, `isSessionClosedError`). So contract point 1 does not run, and
  the error is Playwright's with the label in front, as today.
- A page that closes after the destruction makes the question reject at once, and the message names `page.url()`.
- A frame's wait for its next context ends with "Frame was detached" when the frame detaches (`_onDetached`), so the
  question cannot wait on a page that is gone.
- That rewrite also turns any other protocol failure into "destroyed". The document is then still there, and the
  question answers at once with its URL. `guarded` already reads every "destroyed" as a navigation (decisions 86 and
  114), and this does not change that. No probe produced such a failure.

Why one more evaluation is enough, from Playwright's source (`playwright-core` 1.64.0, `lib/coreBundle.js`):

- A frame's `context(world)` waits on a promise that a destroyed context resets and the next context resolves. So an
  evaluation made while the document is replaced runs in its successor.
- Playwright's own waits (locator actions, web-first assertions) repeat their evaluation on every error except the
  non-retriable ones (`isNonRetriableError`). A destroyed context is not one of those.

## Options

For 2R-2:

- **B, recommended: ask the new document for its `location.href`.**
  - It does not depend on the order in which Playwright's client hears of the commit, because the URL comes from the
    document that answered.
  - It agrees with `page.url()` on every page probed, error pages included, and `page.url()` after the evaluation
    equaled it in all 141 stale cases.
  - Its cost: a destroyed call's destination comes from the page, while the other paths take `page.url()`. The two
    agree whenever Playwright's client has caught up.
- **A: wait for the new document, then read `page.url()`.**
  - It has the same cost and passed the same probes.
  - It relies on Playwright's client hearing of the commit before the new document answers an evaluation, which
    Playwright does not document. If that fails, the message is as stale as today's.
  - The first draft of this plan recommended A, on the grounds that error pages would make B report another URL. The
    probe above shows that they do not.
- **Rejected:**
  - waiting for `framenavigated`, whose order is not documented (option A2's reason in decision 114);
  - loosening the tests, which would accept a wrong message;
  - leaving the destination out when it is not yet known, which changes the message and loses the reload case.

For 2R-3, the recommendation is `await expect.poll(() => page.url()).not.toBe(`${B}/testpath`)`. It changes the test
only; POMWright's code does not change.

- Playwright's `waitForURL` rejects as soon as a `navigated` event it is waiting through carries an error (the
  client's `waitForNavigation` in `coreBundle.js`). The test's own failed `goto` produces such an event.
- A failed navigation does not reject the poll, and the poll waits within the expect timeout.
- It is to be probed in CI's shape, against today's 1 of 60.

For the shared code (step 1), the recommendation is to export `MAX_REPLACEMENTS` and `replacedByNavigation(error)`
from `sessionStorageSeed.ts`.

- `sessionStorage.ts` already imports `originOf` from there, so this needs no new file.
- A module of their own was the first draft's choice, which would mean one more file for two names.

## Implementation (one commit per step)

1. **One place for a replaced document (a refactor, decision 117).**
   - `sessionStorageSeed.ts` exports `MAX_REPLACEMENTS` with its comment, beside `originOf`. It also exports
     `replacedByNavigation(error)`, the "Execution context was destroyed" test, written once instead of twice.
   - `guarded` and `seed`'s check use them. Behavior is unchanged, and the existing tests pass unchanged.
   - `src/helpers/AGENTS.md` (*Files*) says what `sessionStorage.ts` takes from the seed module.
2. **The destination (decision 118), with the records.**
   - In `guarded`, a failure read as a replaced document names the destination from a helper that does what contract
     point 1 says. Its result goes through `destinationOf`, as now.
   - The doc comment of `guarded` says "the URL the page's current document reports".
   - `src/helpers/AGENTS.md` (*Session storage*) gets the same.
   - *What POMWright does not do* on the principles page, as in contract point 2.
   - Unit tests in `sessionStorage.test.ts`, *a call whose document is replaced*:
     - the storage call fails as destroyed while `url()` still reads the start, and the evaluation of `location.href`
       fails once as destroyed, then answers: the message names the URL it answered;
     - a closed page names `page.url()` as it is;
     - past the bound, `page.url()` as it is.
     The fakes are stand-ins for the moment Chromium reports the destruction first. Their comment says so, and points
     to the two harness tests, which show the real timing.
   - A deterministic harness case if a probe finds one: the page starts a navigation to the other origin and a call is
     made at once. It is added if it fails every time on Chromium without the fix. Otherwise the gap is recorded here.
   - The records: decisions 118 and 119 in DECISIONS.md, 86's note, 2R-2's and 2R-3's status, and the ledger.
3. **2R-3's wait.** The poll of the options, in
   [sessionStorage.spec.ts:118](../test/tests/testApp/sessionStorage.spec.ts#L118).
4. **The harness under load (decision 119).**
   - `playwright.base.ts`: `globalTimeout: 60_000 * 15`, and the `workers` ternary, with a comment that says CI's is
     half the runner's threads and the local one is to be tuned. The comment is there so that the identical branches
     are not simplified away.
   - `package.json`: `"test:constrained": "taskset -c 0-3 pnpm test --workers=8"`.
   - `test/AGENTS.md` (*Commands*) explains:
     - what the script runs and that it is Linux only (`taskset`, util-linux);
     - which CPUs it uses and why: on a hybrid Intel CPU, 0-3 are performance threads;
     - when to run it: before a release, and after a change to storage, navigation or steps;
     - what a failure under it means: a POMWright bug that shows only under load, or a test that relies on timing,
       each fixed at its cause and never by a retry.
   - The root `AGENTS.md`: decision 113's realistic conditions gain "a machine about as small as CI's runner
     (`pnpm test:constrained`)".
5. **The execution notes** of this plan, and the statuses set to done.

## Tests

- Unit: step 2's three cases, which fail against the code without step 2 (the first one) and pass with it.
- Harness: the `set` and `get(keys)` tests stay as they are; they are right.
  - At rest, on 1 worker on Chromium, the `set` test is run 300 times (it fails 125 of 300 today).
  - With `taskset -c 0-3` and 2 workers, `set` and `get(keys)` are run 100 times each on three browsers (Chromium
    fails 118 of 600 today).
  - With `taskset -c 0-1` and 4 workers on Chromium, 200 times each.
  - All must be 0.
- 2R-3: the Firefox case is run 100 times with `taskset -c 0-3` and 2 workers (1 of 60 today), and must be 0.

## Docs

- *Session storage* does not change: it already says the message names where the page went, and this makes it true.
- *Principles*, *What POMWright does not do* (step 2).
- The doc comment of `guarded` and `src/helpers/AGENTS.md` (step 2).
- `test/AGENTS.md` and the root `AGENTS.md` (step 4).

## Verification

- Per step: `pnpm lint`, `pnpm test:unit`, and the storage specs on three browsers.
- At the end:
  - `pnpm typecheck`, `pnpm docs:build` and `pnpm lint:guide`;
  - the full `pnpm pack-test --reporter=line`;
  - one full `pnpm test:constrained`, whose time is checked against the 15 minutes. If it needs more, the script
    passes its own `--global-timeout`, and the note says so.
- The grep for the external consumer projects' names.

## Decisions checklist

Each item has a default, so "agreed" settles them all.

1. [x] Decision 118, option B: on a failure read as a replaced document, the new document's `location.href`, asked
   again while destroyed, up to `MAX_REPLACEMENTS`; otherwise `page.url()`. Default: yes.
2. [x] Decision 118, the principles page: "retry anything" becomes "never what the test asked for", with POMWright's
   own bounded questions named. Default: yes.
3. [x] The refactor first (step 1): export the bound and the test from `sessionStorageSeed.ts`, no new file.
   Default: yes.
4. [x] A deterministic harness case if a probe finds one; otherwise the gap is recorded. Default: yes.
5. [x] 2R-3 fixed in the test with `expect.poll` on `page.url()`, probed. Default: yes.
6. [x] `globalTimeout` 15 minutes. Default: yes.
7. [x] `workers: process.env.CI ? "50%" : "50%"`, with the comment. Default: yes.
8. [x] `test:constrained` as `taskset -c 0-3 pnpm test --workers=8`. Default: yes.
9. [x] When to run it: before a release, and after a change to storage, navigation or steps, in `test/AGENTS.md`.
   Default: yes.
10. [x] Decision 113's realistic conditions gain a machine about as small as CI's runner, in the root `AGENTS.md`.
    Default: yes.

## Execution

Steps 1 to 5 in order, each verified and committed with the trailer. Then a report; anything unexpected is reported
with a recommendation.

## Execution notes

- 2026-10-30. The agreed plan was committed in `f33683e`, then one commit per step: `fc6ce43` (1), `f816c2e` (2),
  `751fe70` (3), `fdc7918` (4), and this record (5).
- **Step 1 exported only `replacedByNavigation`.** `MAX_REPLACEMENTS` was exported in step 2, together with its first
  user outside the seed module, so that no commit carries an export nothing uses. The helper of step 2 is
  `SessionStorage`'s private `currentUrl`.
- **No harness case reproduces 2R-2 every time; the gap is recorded here.** A temporary spec ran three shapes 50 times
  each on Chromium, 1 worker, against the build without the fix:
  - a call made right after the page starts a navigation named the right page 50 of 50 times, for both `set` and
    `get(keys)`;
  - the existing `set` test's shape named the start page 34 of 50 times, and 50 of 50 were right with the fix.

  The unit tests cover the logic with a stand-in. The existing `set` test and `get(keys)`'s parallel reads remain the
  real-timing checks.
- **The unit tests' fakes now tell `location.href` apart by the question's text.** This is in `sessionStorage.test.ts`
  (`evaluations`) and `storageTurns.test.ts`, because before the fix a fake answered every `page.evaluate` alike. The
  three new tests failed against step 1's code and pass with step 2's.
- **Verification of 2R-2,** with the packed build and `--retries=0`:

  | Shape | Runs | Result |
  | --- | --- | --- |
  | `set` at rest, 1 worker, Chromium | 300 | 300 of 300 |
  | `set` and `get(keys)`, `taskset -c 0-3`, 2 workers, three browsers | 100 each | 600 of 600 |
  | the same two, `taskset -c 0-1`, 4 workers, Chromium | 200 each | 400 of 400 |

- **Verification of 2R-3:** 4 workers rather than the plan's 2, to raise the failure rate before the fix.
  - Before the fix: 4 of 100 failed on Firefox with `taskset -c 0-3` and 4 workers, each with `NS_ERROR_OFFLINE`.
  - After the fix, in the same shape: 200 of 200 on Firefox, and 100 of 100 on Chromium and WebKit.
- **The first full `pnpm test:constrained`:** 960 unit tests; 1842 passed and 3 skipped on three browsers in 4.1
  minutes; 33 step locations; 27 test-server tests. It took 265 s in all, well inside the 15-minute cap, so the script
  needs no `--global-timeout` of its own. Pass `--reporter=line` when it runs unattended, as for `pack-test`.
- **Final verification at `fdc7918`:**
  - The full `pnpm pack-test --reporter=line` at rest, 16 workers: 1842 passed and 3 skipped on three browsers in 2.1
    minutes; 33 step locations; 27 test-server tests.
  - The checks inside it: 227 page blocks and 96 doc examples compiled; API coverage of 40 exports and 108 members;
    error messages 78 and 9.
  - Unit: 960. `pnpm lint`, `pnpm docs:build` and `pnpm lint:guide` (56 links) pass.
  - No name of the external consumer projects appears on the branch.
- **Corrected in step 4:** decision 119's reason, committed in step 2, said the race never showed on the whole machine.
  It did, under 48 workers (136 of 1,500). It now cites 900 of 900 passing with 6 workers.
- **Debt noticed, not fixed:** `access` still asks `document.domain` after a call fails as destroyed. `guarded` then
  throws the navigation message whatever the answer, so that round trip on the failure path is never used. Suggested
  remedy: `access` skips the lookup when `replacedByNavigation(error)`, as a behavior-preserving refactor with a unit
  test that counts the evaluations.
