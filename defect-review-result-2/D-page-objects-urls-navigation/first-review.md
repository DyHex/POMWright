# Segment 2D: the first review's findings, claims and test gaps at `d850405`

The first review's scope D (`defect-review-result/D-page-objects-urls-navigation/`, at `54cdada`), its rows of
`report.md` and the ledger, DECISIONS.md #8, #16, #17, #19, #36, #37, #60, #68, #69, the plans 16, 17, 25 and 26 with
their *Execution notes*, and the items `PLAN-release-gates-and-audit.md` leaves for the second review in this area.
Each reproduction was copied from `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/` into
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/run1/<ID>/`, pointed at this worktree where it named the
first review's, and run there; outputs are kept beside each copy. Checked 2026-10-28, 16:18 to 16:22 (+01:00).

## Findings

| ID | Kind | First review's decision | Outcome at `d850405` | What ran and what it printed |
| --- | --- | --- | --- | --- |
| D-1 | defect | #19: `goto` as a property | **fixed** | `pnpm exec tsc --noEmit -p test` with `zz-probe-D-navfor.spec.ts` and `zz-probe-D-types.typecheck.ts` in `test/tests/`: exit 2 with one error, the navfor spec's `openAndLeave(accountPage.navigation)`: `TS2345: Argument of type 'NavigationFor<string, UrlMatcher>' is not assignable to parameter of type 'NavigationFor<string, string>'` (the documented compile error); the types probe's two `@ts-expect-error` lines (RegExp base, RegExp path as `NavigationFor<string, string>`) are used, no TS2578. Output `run1/D-1/tsc-output.txt`. `publicTypes.typecheck.ts`'s `helperMatrix` (commit `cb101bf`) asserts the whole matrix. |
| D-2 | defect | #17: `^` as `%5E` in `fullUrl`, `\|` documented | **fixed** (`^`); **fixed differently** (`\|`: documented, decision #17) | `zz-probe-D-fullurl.spec.ts` on chromium, firefox and webkit under Node 20, 22 and 24: each run 5 passed, 1 failed, the one failure the `\|` path's `toHaveURL(fullUrl)` on chromium (`fullUrl …/filter/a\|b reported …/filter/a%7Cb`), which *URLs and navigation* → *fullUrl* and `api/class-pageobject.md` now name, with `expectThisPage()` as the check that matches. The `^` path: `fullUrl …/filter/a%5Eb reported …/filter/a%5Eb` and `toHaveURL` passes on all 9 cells (failed on 6 at `54cdada`). Outputs `run1/D-2/run-v*.txt`. The docs part (a string `fullUrl` is a glob in `waitForURL`): `zz-probe-D-glob.spec.ts` shows Playwright unchanged (`{a}` times out, `a,b}` is an invalid glob); the docs now say so and *Upgrading from 2.x*'s `waitForPage` uses `toHaveURL`. |
| D-3 | documentation | #36: the four corrections, and the `Cannot resolve` message labeled | **fixed** | `node run1/D-3/goto-throws.cjs` (exit 0): `"http://" => LoginPage: goto("http://") cannot be resolved against baseUrl "https://shop.example"`; the URL-object, `null` and number messages as documented. The URL-object message is on `api/errors.md` (*Navigation*); `Cannot resolve` is on `goto()`'s **Throws** and `@throws`; `UrlMatcher.toString()` is "used in error messages" (`src/helpers/url.ts:41`, `api/class-navigation.md`); the three `@param options` say `runPostNavigationActions` defaults to `true` (`navigation.ts:58, 94, 137`). The step-title probe (`zz-probe-D-steps.spec.ts` with its reporter) prints the same four titles as at `54cdada`. |
| D-4 | documentation (code option taken) | #37: `captureCallSite(new.target)` | **fixed** | `zz-probe-D-base/base.spec.ts` (a project base class, a misspelt `has` path), chromium: exit 1 as designed; the code frame is `> 7 | await use(new OrdersPage(page));`, `at Object.ordersPage (…/base.spec.ts:7:13)`, no `shop.base.ts` frame (at `54cdada`: `shop.base.ts:7`, the base class's `super(…)`). Output `run1/D-4/run.txt`. Also probed in pass 1 for a class without a constructor of its own (p01) and on the real runner path (p04). |
| D-5 | defect | #16: a returned Promise fails the page object | **fixed** | `zz-probe-D-asyncdefine.spec.ts`, `tsc` exit 0 (it still compiles, as decided), chromium: all three cases fail with `<Label>: defineLocators() must register its locators synchronously; it returned a Promise. Read what it needs in the constructor or a fixture, and pass it in.`, the code frame at the `new` line; case 1's later `getNestedLocator` throws the same kept message (at `54cdada`: `throws: none`). Output `run1/D-5/run.txt`. |

Outcome counts: fixed 5 (D-2's `|` part fixed differently, as decided); fixed differently 0 as a whole finding; still
present 0; not fixed 0; fixed incompletely 0; regressed 0; cannot re-run 0.

## Considered and not filed by the first review (left for this review)

`report.md` §9, *Considered and not filed*, D's three; `PLAN-release-gates-and-audit.md` leaves them "for the second
review (not moved; the review decides)".

| Item | Decision here | Why |
| --- | --- | --- |
| A RegExp base's `goto(target)` type admits a relative URL with a colon; the runtime throws the documented message | **filed: 2D-2** (defect, Low, patch) | The first review called it no broken contract because the message is documented. But the three places that document the message say it arises "from JavaScript" (`api/class-navigation.md`, `api/errors.md`, `goto`'s `@throws`), and the API page's table says a RegExp base takes `goto(absoluteUrl)`: TypeScript is promised to reject a relative target, and `publicTypes.typecheck.ts` asserts it for `"/orders"`. Re-probed (p05): `"/orders?at=12:00"`, `"?at=12:00"`, `"1:2"` compile and throw. |
| `UrlMatcher.test()` with a relative string throws `TypeError: Invalid URL` | not filed (agreed) | `test(url)` is documented as taking "a URL string or a `URL`" (`src/helpers/url.ts:32-39`, `api/class-navigation.md` *test()*); a path is not a URL string, and Node's `Invalid URL` names the cause. Re-run: `run1/sound/matcher-table.txt`, `test(relative): TypeError Invalid URL`. |
| The matcher keeps the caller's RegExp objects | not filed (agreed) | The copy rule is the registry builders' (`src/locators/AGENTS.md`, *Do not*); `baseUrl`/`urlPath` are documented as "the `baseUrl` the page object was constructed with". `lastIndex` is reset before each test; only `RegExp.prototype.compile()` could change a kept RegExp. Noted in `summary.md`. |

## Claims beyond the findings

### *What is sound* (D's summary, and `report.md` §10's URL and navigation lines)

| Claim | At `d850405` |
| --- | --- |
| String `urlPath` matching: every printable ASCII character, 13 non-ASCII and 15 percent-encoded forms, 3 browsers × 3 Node lines | Holds. The ASCII sweep is now `urlForms.spec.ts` (green in the baseline, 3 browsers on Node 24, chromium on 20 and 22). Pass 1's p02 ran 29 further forms (non-ASCII in query and fragment, `%` not an escape, lower-case escapes, astral, NBSP, quotes) through `fullUrl`, `goto()`, both `expect*` methods and `toHaveURL` on all 9 cells: all match. |
| `fullUrl` differs from the reported URL only for `\|` (chromium) and `^` (Node 20 and 22) | Changed by D-2's fix: now only `\|` on chromium (run1/D-2, p02). |
| Host forms on 3 × 3 cells | Holds as far as the harness reaches: `urlHosts.spec.ts` (decision #60) runs them, green in the baseline on 3 browsers (Node 24) and chromium (Node 20, 22). Not re-run on firefox and webkit under Node 20 and 22. |
| Validation: 27 `urlPath` forms never leave the origin; the `baseUrl` rejections | Holds: `run1/sound/validation.cjs` on Node 20, 22 and 24 prints output identical to the first review's `out/validation-v*.txt`. |
| `UrlMatcher` against v3.0.1 differs only as intended | Not re-run against a v3.0.1 build; `git diff 54cdada HEAD -- src/helpers/url.ts` shows the matcher's logic unchanged (`comparable` moved into `inPathPart`, same split), so the 54cdada comparison still applies. |
| RegExp `g` and `y` flags stable; the five-row table, the port note, `toString` exact | Holds: `run1/sound/matcher-table.txt`; pass 1's p10 through `fullUrl.test`; the matcher's `lastIndex` reset is unchanged. |
| Empty `?` and `#`: `expectThisPage` and `expectAnotherPage` exact opposites | Holds: `testNav.spec.ts` ("an empty query or fragment is another URL"), green in the baseline. Known issue #59 asks for an option. |
| No POMWright default; the project's `navigationTimeout` bounds the waits | Holds: `testNav.spec.ts` (*without navOptions or a call's timeout …*), added by decision #60. |
| `goto()` arguments throw the documented message before any navigation | Holds: run1/D-3 and p06. |
| Navigation step titles and locations | Titles hold (run1/D-3). Locations are 2E's; `test/step-locations/stepLocations.spec.ts` now marks `expectThisPage` and `expectAnotherPage` (lines 105, 107). |
| Actions hook | Holds: `actions.spec.ts`, now with a rejecting action. |
| Lifecycle table (chromium) | Holds for its rows, on the three browsers through `lifecycle.outcomes.spec.ts` (decision #68). The table has no row for the test body: 2D-3. |
| Types follow the runtime, apart from D-1 | D-1 fixed. Not complete: 2D-2 (the first review noted it as an observation). |
| `errors.md` *Page objects → URLs* character for character | Holds, and now also *Navigation*'s `goto` messages: p06. |

### Test gaps (D's summary), at `d850405`

| # | Gap | At `d850405` |
| --- | --- | --- |
| 1 | No `toHaveURL(fullUrl)` for `\|` or `^` | Closed: `urlForms.spec.ts` asserts both (`^` on every browser, `\|` on firefox and webkit, `not` on chromium). |
| 2 | No type test of a RegExp page's `navigation` as `NavigationFor<string, string>` | Closed: `publicTypes.typecheck.ts`, `helperMatrix`. |
| 3 | Node 22 never runs the harness; Node 20 only chromium in CI | Partly closed: `d850405` runs chromium on Node 20 and 22 in CI (baseline, *CI on d850405*); firefox and webkit run only on the default Node. Decision #8 accepted the rest. |
| 4 | No call-site test with a consumer base class | Closed: `checkSite.spec.ts`, "with a base class of the project's own". |
| 5 | No test of an `async defineLocators()` | Closed: `src/pageObject.test.ts` (*an async definition*) and `lifecycle.spec.ts`. |
| 6 | No test of a rejecting action | Closed: `actions.spec.ts`, "an action that rejects …". |
| 7 | The table's `beforeAll` and worker-scoped rows untested | Closed: `lifecycle.outcomes.spec.ts` (decision #68). Still untested: the test body, which the table also lacks (2D-3). |
| 8 | The `navigationTimeout` fallback untested | Closed: `testNav.spec.ts`. |
| 9 | `test/step-locations` covers only `goto` | Closed: `expect-this` and `expect-another` markers. |
| 10 | Host forms never checked in a browser | Closed: `urlHosts.spec.ts`. |

### D's notes for other scopes

- *For scope H*: AGENTS.md §4's urlForms sentence. Fixed: `test/AGENTS.md` (*The harness*) now names both differences
  and the skipped characters.
- *For the consolidation*: D-4 applied to the harness's own page objects through `testApp.base.ts`; with `new.target`
  it no longer does.
