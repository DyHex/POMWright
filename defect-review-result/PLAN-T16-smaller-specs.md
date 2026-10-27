# Plan 28: the smaller untested behaviours

- **Decisions**: [DECISIONS.md](DECISIONS.md) #60
- **Findings**: none (test gap #16's unfiled parts; scope D's probes in `…-probes/D/`, scope A's bfcache log)
- **Bump**: none (tests and one sentence on an Internal page)
- **Stop**: no
- **Depends on**: plan 16 (step locations), plan 25 (URL matching), plan 17 (`lifecycle.spec.ts`)

## Contract

Behaviours the docs promise and probes confirmed get harness specs: a rejecting action, the lifecycle table's
`beforeAll` and worker-fixture rows, the `navigationTimeout` fallback, the `expect*` step locations, host forms in a
browser. The back/forward-cache restore of a seeded origin, which no browser reproduces, is named on *Internal → The seed
registry*. No change under `src/`, `server.js` or the published package.

## Current behaviour

- No test of a `pageActionsToPerformAfterNavigation()` that rejects (D's probe: the error propagates and later actions do
  not run; `…-probes/D/zz-probe-D-nav.spec.ts`).
- `test/tests/pageObject/lifecycle.spec.ts` covers test-scoped fixtures and `beforeEach`; *How a mistake is reported*'s
  `beforeAll` rows (serial and not) and worker-scoped fixture row are untested (`…-probes/D/workerfixture/`).
- No test of the project's `navigationTimeout` bounding `goto()` and `expectThisPage` when neither `navOptions` nor the
  call sets a `timeout` (`…-probes/D/defaults/zz-probe-D-defaults.spec.ts`).
- `test/step-locations` checks `goto` only; D's `…-probes/D/steps/zz-probe-D-steploc.spec.ts` confirmed
  `expectThisPage` and `expectAnotherPage` report the caller's line.
- Host forms (IDN, IPv6, default ports, credentials, upper case) are checked against `new URL` in unit tests only
  (`…-probes/D/zz-probe-D-hosts.spec.ts`: every form matches on 3 browsers × 3 Node versions).
- A bfcache restore was never observed: Playwright disables it in Chromium, Firefox and WebKit did not restore on a
  cross-origin back, every `/teststorage` route sends `no-store`; a back navigation to a seeded, cacheable page is a
  fresh load and is seeded (`…-probes/A/out/bfcache.095919.log`).

## Steps

1. `test/tests/pageObject/actions.spec.ts` (the existing spec of the actions hook): a page object whose actions
   reject; `goto()` rejects with that error and a later action does not run.
2. `test/tests/pageObject/lifecycle.spec.ts` (or a sibling `lifecycle.workerAndHooks.spec.ts`): a broken page object built
   in `beforeAll` (serial and default mode) and in a worker-scoped fixture, each failing as the table says; failing tests
   hand their result over through a file named per project and repeat (AGENTS.md §3), as
   `pageObject/callSite/callSite.spec.ts` does.
3. `test/tests/testApp/testNav.spec.ts` (or a new `navigationTimeout.spec.ts`): `test.use({ navigationTimeout })` with the
   `/testnav` delayed navigation; `goto()` and `expectThisPage()` fail at that timeout when neither `navOptions` nor the
   call sets one, and a call's own `timeout` wins.
4. `test/step-locations/stepLocations.spec.ts`: `expectThisPage()` and `expectAnotherPage()` calls with `// LOCATION`
   markers, beside `goto`'s.
5. `test/tests/testApp/urlHosts.spec.ts`, from `zz-probe-D-hosts.spec.ts`: every request fulfilled by `page.route`, a
   page object per host form, `expectThisPage()` passing and `toHaveURL(fullUrl)` matching where the probe showed it;
   no route, DNS or IPv6 listener added.
6. *Internal → The seed registry*: one sentence: a back/forward-cache restore of a seeded origin would take the seed out
   of pending at `framenavigated` with no document to write or report; no browser Playwright drives restores one
   reproducibly, so it is untested.
7. AGENTS.md §4 lists the new specs.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
test: a rejecting action, the beforeAll and worker rows, navigationTimeout, expect* locations, host forms

Behaviours the docs promise and probes confirmed, now covered by harness
specs; the back/forward-cache case, which no browser reproduces, is named on
the seed registry page.

Plan: defect-review-result/PLAN-T16-smaller-specs.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28.

- Step 1: `actions.spec.ts`, a page object whose first action rejects: `goto()` and `expectThisPage()` reject with that
  error (`toThrow(new Error(…))`, the message as thrown), the page is on `fullUrl`, and the second action never runs.
- Step 2, **a deviation**: `test.fail()` cannot show the serial row. Playwright skips the rest of a serial group only
  after an unexpected failure (`isFailure = status !== expectedStatus` in the dispatcher), so with the first test marked
  `test.fail()` the second ran (probe: it printed, then failed from its own `beforeAll`). The table's outcomes are the
  run's, not a test's, so instead of failing tests that hand their result over through a file,
  `pageObject/lifecycle.outcomes.spec.ts` starts `test/lifecycle-outcomes/` (a config with Playwright's defaults and one
  project per browser, and `brokenPageObject.spec.ts`, a page object with a `has` typo built in each place of the table)
  as a run of its own on the project's browser (`--reporter=json`, `--output` in the test's output directory), and
  compares the report: test-scoped and worker-scoped fixtures, both tests failed before the body; `beforeEach` and
  `beforeAll`, each test failed, its body reaching its first use and no further; `beforeAll` in a serial group, the
  first failed at its first use, the second skipped. Every error is the labelled message (the distinct errors per test,
  so the count, one or two, is Playwright's). About 4 s per browser. The existing `test.fail()` cases in
  `lifecycle.spec.ts` stay.
- Step 3: `testNav.spec.ts`, `test.use({ navigationTimeout: 700 })` without `navOptions`: `expectAnotherPage()` and
  `expectThisPage()` reject with `Timeout 700ms exceeded`, and `expectThisPage({ timeout: 10_000 })` waits out the
  delayed navigation; `goto()` to a route that answers after 2 s rejects at 700 ms, and `goto({ timeout: 10_000 })`
  arrives. **Not predicted**: on Chromium a second `goto` started while the timed-out navigation was still in flight
  failed with `net::ERR_ABORTED` (Firefox and WebKit passed); the test waits for the first navigation
  (`page.waitForURL`) before the second call. `DelayedItemNav`'s `navOptions` became optional.
- Step 4: `expectThisPage()` and `expectAnotherPage()` marked beside `goto` (the fake page gained `waitForURL` and a URL
  argument); the step-location check reports 31 checked.
- Step 5: `testApp/urlHosts.spec.ts`, 23 host forms from the probe (upper case, default ports, IDN, IPv6, IPv4
  shorthands, credentials), one test each: `fullUrl` is the normalized URL; reached by the form as written and by
  `goto()`, `page.url()` is `fullUrl`, `expectThisPage()` passes and `page.waitForURL(fullUrl)` resolves. Left out of the
  probe's list: the forms that are not hosts (spaces, a tab, `ws:`, `ftp:`). **Not predicted** (the probe never ran
  `toHaveURL`): with credentials, `toHaveURL(fullUrl)` fails on every browser. A probe on the three browsers:
  `page.url()` and the request URL keep the credentials (`http://user:pass@shop.example/x`), so `waitForURL` and
  `expectThisPage()` match, while the document's `location.href` has none (`http://shop.example/x`), and that is what
  `toHaveURL` compares. The spec pins it (`toHaveURL` of the URL without credentials passes, `not.toHaveURL(fullUrl)`).
  The docs do not say it: *URLs and navigation*'s credentials note says such a base "is accepted and works", and
  `fullUrl`'s doc comment names Chromium's `|` as the only form `toHaveURL` sees differently. A docs fix is left to the
  maintainer (reported at the stop).
- Step 6: *Internal → The seed registry*, *Limits*: the back/forward-cache restore, untested; the claim that Playwright
  turns the cache off in Chromium read from `chromiumSwitches` (`--disable-back-forward-cache`) in playwright-core 1.64.
- Step 7: AGENTS.md §4 (`lifecycle.outcomes.spec.ts` and `test/lifecycle-outcomes/`, `urlHosts.spec.ts`, 85 spec
  files, about 13,300 lines); *Internal → Tests and checks* explains the run of its own.
- Checks: `pnpm lint` 0; `pnpm test:unit` 900 passed; `pnpm pack-test --reporter=line` exit 0 (2,367 passed, 27 new
  tests on each of three browsers, 3 skipped; doc snippets 221; api coverage 0 problems; step locations 31);
  `pnpm docs:build` 0.
