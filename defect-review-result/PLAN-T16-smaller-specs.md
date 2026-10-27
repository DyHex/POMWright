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

(filled in at execution)
