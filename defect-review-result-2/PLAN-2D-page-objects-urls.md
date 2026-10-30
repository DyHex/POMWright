# Plan: page objects and URLs (2D-1, 2D-2; docs: 2D-3, 2D-5)

- **Decisions**: [89, 90, 104 (points 1 and 2)](DECISIONS.md) (2026-10-29); decision 91 (2D-4) is not adopted and has no
  step; decision 104's point 3 (2Z-1) is built in [PLAN-2T-checks.md](PLAN-2T-checks.md)
- **Findings**: [2D-1](D-page-objects-urls-navigation/defect-2D-1-load-state-timeout-message.md),
  [2D-2](D-page-objects-urls-navigation/defect-2D-2-absolute-url-type.md),
  [2D-3](D-page-objects-urls-navigation/defect-2D-3-outcomes-table-test-body.md),
  [2D-5](D-page-objects-urls-navigation/defect-2D-5-regexp-subclass-rationale.md) (all Low)
- **Bump**: patch. Two new changesets (decisions 89 and 90)
- **Stop**: none planned (no CI change); built after the checks plan, whose outcomes spec reads the page's rows
  (decision 95)
- **Depends on**: [PLAN-2T-checks.md](PLAN-2T-checks.md) (decision 95)

## Contract

1. **A wait that times out on the load state of the right URL says so (decision 89).** In `waitForUrl`
   (`src/helpers/navigation.ts`), on a `TimeoutError` whose URL found passes the wait's own predicate (the parse of
   `page.url()` guarded, so it cannot hide Playwright's error): `ItemPage: reached "…/item/7", but its "load" state did
   not come in time (page.waitForURL: Timeout 1000ms exceeded.)`, and for `expectAnotherPage()` `ItemPage: left
   "…/item/7" for "…/item/8", but its "load" state did not come in time (…)`, naming the requested state (`load` when
   none). Other errors keep today's message.
2. **`goto`'s target on a RegExp base starts with a letter (decision 90).** `` type AbsoluteUrl =
   `${Letter}${string}:${string}` ``, `Letter` the 52 ASCII letters; its doc comment says what the type cannot check
   (`a/b:c`); the docs' "from JavaScript" becomes exact; *Pages whose URL varies* shows `` url as `https://${string}` ``.
3. **The outcomes table has the test body's row (decision 104, point 1)**, with a case in `test/lifecycle-outcomes/` and
   a sentence on *Internal → Page object lifecycle*.
4. ***Internal → URL matching* states call by call which Playwright call runs a `RegExp` subclass's matching (decision
   104, point 2).**

## Current behavior (re-checked 2026-10-29 at the branch)

- `waitForUrl` (`src/helpers/navigation.ts:195-205`) rethrows any error as `<label>: <what>; found <URL> (<detail>)`;
  the review's probe, re-run on chromium: `expected URL "…/item/7"; found "…/item/7" (page.waitForURL: Timeout 1000ms
  exceeded.)`. The message shipped in v3.0.1.
- `AbsoluteUrl` is `` `${string}:${string}` `` (`navigation.ts:14`); `docs/versioning.md` puts `GotoTarget` outside the
  type promise.
- The outcomes table has three rows; *Internal → URL matching* line 73 says Playwright never runs a subclass's matching.

## Implementation (one commit per step)

1. **The load-state message** (decision 89): `waitForUrl` and its two callers; *Error messages* (*Navigation*),
   `api/class-navigation.md` (the *Throws* of both methods), their `@throws`, *URLs and navigation* (*Options and
   timeouts*); a new changeset.
2. **`AbsoluteUrl`** (decision 90): the type and its doc comment; `api/class-navigation.md`, *Error messages* and
   `goto`'s `@throws` (the exact "from JavaScript" wording); *Pages whose URL varies*; a new changeset.
3. **The docs batch** (decision 104, points 1 and 2): the row, the lifecycle sentence and the case; the call-by-call
   sentence.

## Tests

- Unit, `src/helpers/navigation.test.ts`: a stub page whose `waitForURL` rejects with a `TimeoutError` while `url()`
  matches, and a control where it does not; another error keeps today's message.
- Harness, `test/tests/testApp/testNav.spec.ts`: both methods on the held-image route the spec already builds, on three
  browsers (the review's sketch spec: 6 fail at `d850405`, 9 of 9 with the fix).
- `test/tests/packaging/publicTypes.typecheck.ts`, *navigationCalls*: `@ts-expect-error` for `"/orders?at=12:00"`,
  `"?at=12:00"` and `"1:2"` on a RegExp-base page object and through `NavigationFor<RegExp, UrlMatcher>`; accepted
  `"HTTPS://shop.example/x"` and `` `https://${host}/x` ``.
- `test/lifecycle-outcomes/`: the test-body case, shown to fail the outcomes spec before the page's row exists.
- The review's three-browser probe of a `RegExp` subclass (`$P/D/p12-regexp-subclass/`), re-run for 2D-5's sentence.

## Changesets

- New, `navigation-load-state-message.md` (patch): "A navigation wait that times out on the load state of the right URL
  says so (`reached …, but its "load" state did not come in time`), instead of naming the URL it found as the one it
  did not expect."
- New, `goto-absolute-url-type.md` (patch): "On a page object whose `baseUrl` is a RegExp, `goto(target)` no longer
  compiles for a relative target that holds a colon (`"/orders?at=12:00"`), which it always rejected at run time."

## Verification

Per step: `pnpm lint`, `pnpm test:unit`, the page object and navigation specs on chromium. At the end: `pnpm typecheck`,
`pnpm docs:build`, the full `pnpm pack-test --reporter=line`, the grep for the external consumer projects' names.

## Decisions checklist

- [x] Decision 89: the load-state message, "reached …"; both messages listed; a changeset
- [x] Decision 90: `AbsoluteUrl` starts with a letter; the docs exact; the narrowing cast shown; a changeset
- [x] Decision 104, points 1 and 2: the test body's row and case; the call-by-call sentence

## Execution

Three commits, one per step, `fix(navigation): …` or `docs: …`, each with `Plan:
defect-review-result-2/PLAN-2D-page-objects-urls.md` and the `Co-Authored-By:` trailer. The maintainer pushes.

## Execution notes

- 2026-10-30. The commits, one per step:
  - `aa70821` (1, decision 89);
  - `088f46c` (2, decision 90);
  - `f3234ea` (3, decision 104, points 1 and 2);
  - and this record.
- **Verification:**
  - the full `pnpm pack-test --reporter=line`: 1863 passed and 3 skipped on three browsers;
  - `pnpm test:constrained`, which `test/AGENTS.md` asks for after a navigation change: 1863 passed and 3 skipped in
    279 s;
  - 1000 unit tests; `pnpm typecheck`, `pnpm docs:build` and `pnpm lint` pass; no name of the external consumer
    projects on the branch.
- **Each new test against the code before its step:**
  - Step 1: the harness case failed on all three browsers with the old, self-contradicting message ("expected URL
    …/item/7; found …/item/7"). The unit case for the reached URL failed; the case for today's messages passes both
    ways, as intended.
  - Step 2: all six new `@ts-expect-error` lines were unused against the old type (TS2578).
  - Step 3: the outcomes spec failed with the two test-body cases before the page had their row.
- How the steps were built, within the plan:
  - **Step 1's unit test calls the private `waitForUrl` with a stub page.** `navigation.test.ts` does not mock
    `test.step`, which the two public methods run in. The harness case checks the two methods' wording on real pages;
    the image is held by `page.route`, as in the test beside it, a stand-in its comment names.
  - **Step 2's `Letter` is `Characters<"abcdefghijklmnopqrstuvwxyz">`**, a small recursive type, with
    `Uppercase<Letter>` for the other case. Biome writes a union of the letters as 26 lines.
  - **Step 3's cases await a timer, not a navigation.** The outcome was then the same in 30 runs per browser. A
    Playwright call in flight when the runner ends the test can add a second error, as the review saw; *Internal → Page
    object lifecycle* says so, and the table's row does not depend on it.
  - **The review's `RegExp` subclass probe was re-run** on three browsers, copied into `test/tests/` and deleted
    afterwards. Its result was the same as the review's.
- Nothing unexpected.
