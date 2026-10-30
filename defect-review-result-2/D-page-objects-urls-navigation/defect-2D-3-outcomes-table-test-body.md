# 2D-3: The table of where a broken page object is built has no row for the test body, the place the docs' first example builds it

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 104 in [DECISIONS.md](../DECISIONS.md); planned in the page objects and URLs plan (docs); done 2026-10-30 in `f3234ea`
- **Area**: Page objects: how a mistake is reported (*Page objects* → *How a mistake is reported*, the outcomes table)
- **Severity**: Low (a hole in the docs; the run does fail, at the right line, but in a way no page describes)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: missed by the first review (the table has had the same three rows since v3.0.1; D confirmed those rows and listed the untested ones as test gap 7, but not the missing one)
- **Reviewed**: `d850405`, 2026-10-28T16:11:06+01:00, Opus 5.5, second review, segment 2D

## Contract

- `website/src/content/docs/docs/page-objects.md`, *How a mistake is reported*: "Where the page object is built decides
  what the test run shows", then a table with three rows: a test-scoped or worker-scoped fixture, `beforeEach`,
  `beforeAll` (with the serial case).
- `website/src/content/docs/docs/first-page-object.md`, *Use it in a test*, builds the page object in the test body:
  `const loginPage = new LoginPage(page);` followed by `await loginPage.navigation.goto();`. The harness does the same
  (`test/tests/pageObject/lifecycle.spec.ts`, "the same, for a second instance with other arguments built in the test
  body").
- `internal/page-object-lifecycle.md`, *Sticky, labeled failures*, describes the fixture and hook cases only.

No page says what a run shows when the page object is built in the test body (or in a `test.step` inside it).

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p04-outcomes/zz-probe-d04.spec.ts`, a page object
whose check fails (a misspelt `has` path), built in the body, in a `test.step`, and in a fixture that navigates before
`use()`; each body records how far it got as an annotation. From the worktree root:

```sh
cp /home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p04-outcomes/zz-probe-d04.spec.ts test/tests/
pnpm -C test exec playwright test tests/zz-probe-d04.spec.ts --project=chromium --reporter=json --retries=0 > /home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p04-outcomes/report-chromium.json
rm test/tests/zz-probe-d04.spec.ts
```

Exit 1 (the tests fail on purpose). The report is kept beside the probe; the summary below was read from it with
`node /home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p04-outcomes/summarize.cjs <report>` (each spec's
status, its `reached` annotations, each error's first line and location; paths shortened below).

## Observed / expected

Observed (from the JSON report):

```text
## built in the body, used after an await | failed | reached: body, after the await
   error: Error: TypoPage: Locator registry verification failed for 1 of 2 paths:   location: zz-probe-d04.spec.ts:30:15 (the new line)
   error: Error: TypoPage: Locator registry verification failed for 1 of 2 paths:   location: zz-probe-d04.spec.ts:30:15
## built in the body, navigated with its own helper | failed | reached: body, after goto
   error: Error: TypoPage: Locator registry verification failed for 1 of 2 paths:   location: zz-probe-d04.spec.ts:39:15 (the new line)
   error: Error: page.waitForTimeout: Test ended.                                    location: zz-probe-d04.spec.ts:43:13
## built in a test.step | failed | reached: in the step
   error: Error: TypoPage: Locator registry verification failed for 1 of 2 paths:   location: zz-probe-d04.spec.ts:49:16 (the new line)
   error: Error: page.waitForTimeout: Test ended.                                    location: zz-probe-d04.spec.ts:51:14
## built in a fixture that navigates before use() | failed | reached:
   error: Error: TypoPage: Locator registry verification failed for 1 of 2 paths:   location: zz-probe-d04.spec.ts:23:16 (the new line)
```

So, built in the body: the test fails with the labeled error at the `new` line, but the body goes on past the failure
(here past an `await page.goto(…)` and a whole `navigation.goto()`), until its next use of the page object throws the
kept error again or the runner ends the test, which can add a second error (`page.waitForTimeout: Test ended.`). The
fixture row holds also for a fixture that awaits a navigation between `new` and `use()`.

Expected: the table has a row for the test body (and says a `test.step` behaves the same), for example: *the test body
or a step in it | the test fails at the `new` line; the body runs on until its next use of the page object or until the
runner ends it, which may add a second error*. The page's advice for a test that asserts the mistake (use the page
object right after `new`, with no `await` between) already covers the case where the body wants to catch it.

## Cause

The table was written for the places `test/lifecycle-outcomes/brokenPageObject.spec.ts` builds the page object, which
`test/tests/pageObject/lifecycle.outcomes.spec.ts` compares with the table; the test body is not one of them. The
behavior is Playwright's handling of an uncaught exception during a test (the test fails, the worker is stopped), which
the check's microtask throws.

## Fix plan

- **Intended contract**: the table covers every place the docs build a page object.
- **Options**:
  1. *(recommended)* Add the row on *Page objects* → *How a mistake is reported*, and a sentence on
     `internal/page-object-lifecycle.md` → *Sticky, labeled failures*; add a `describe("the test body")` to
     `test/lifecycle-outcomes/brokenPageObject.spec.ts` (built in the body, `reached("body")`, an `await`,
     `reached("after the await")`, a first use) and its expected outcome to the table in
     `lifecycle.outcomes.spec.ts`, so the row is checked like the others on the three browsers.
  2. Only the row, unchecked. Cheaper; the other rows are checked, so this one would be the exception.
- **Docs**: the two pages above. No doc comment changes (the `PageObject` class comment does not list the places).
- **Changeset**: none (docs and tests only).
- **Decisions to tick**: the row's wording; whether the second error is worth naming.
- **Relative to other findings**: none.
