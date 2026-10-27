# D-3: The navigation docs list `goto()`'s messages incompletely, say `UrlMatcher.toString()` is used in step titles, which it is not, and give `runPostNavigationActions` a `navOptions` default it does not have

- **Kind**: documentation
- **Area**: errors and messages, *Navigation* (`api/errors.md`, `api/class-navigation.md`, doc comments in
  `src/helpers/navigation.ts` and `src/helpers/url.ts`)
- **Severity**: Low (a reader who looks a message up does not find it, or finds a use that does not exist; no behaviour
  is wrong)
- **Semver of the fix**: none (docs and doc comments only)
- **Reviewed**: `54cdada`, 2026-10-23, Claude (scope D)
- **Status**: decided (2026-10-26, [DECISIONS.md #36](../DECISIONS.md))
- **Merged with**: A-6, B-7, C-4, H-2 (see report.md)

## Contract

AGENTS.md §9: "say what fails and how (concept pages show the common errors, API pages and doc comments every one per
member, *Error messages* all of them)", and "The code and its tests decide what the docs say."

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/goto-throws.cjs` (calls `navigation.goto` of a page
object built on `dist/index.js`; every message below is thrown before the step opens, so no runner is needed):

```sh
node ../POMWright-final-review-probes/D/goto-throws.cjs   # from the worktree root, exit 0
```

```text
"http://" => Cannot resolve "http://" against baseUrl "https://shop.example".
"https://" => Cannot resolve "https://" against baseUrl "https://shop.example".
"https://shop.example/x" => LoginPage: goto() takes a URL string or options; received a URL object; pass its href.
"null" => LoginPage: goto() takes a URL string or options; received null.
"42" => LoginPage: goto() takes a URL string or options; received a number.
```

Step titles, from `/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/steps/` (a spec on a page object whose
`fullUrl` is a `UrlMatcher`, and a reporter that prints every `test.step` title):

```sh
cp ../POMWright-final-review-probes/D/steps/zz-probe-D-steps.spec.ts test/tests/
pnpm -C test exec playwright test tests/zz-probe-D-steps.spec.ts --project=chromium \
  --reporter=/home/magdys/workspace/dyhex/POMWright-final-review-probes/D/steps/steps-reporter.cjs
rm test/tests/zz-probe-D-steps.spec.ts
```

```text
STEP ItemPage: Navigate to http://localhost:9000/testnav/item/7
STEP ItemPage: Expect this Page
STEP ItemPage: Navigate to http://localhost:9000/testnav
STEP ItemPage: Expect any other Page
```

## Observed / expected

1. **`api/errors.md`, *Navigation*** lists `goto()`'s messages as the RegExp-URL pair and
   `Cannot resolve "http://" against baseUrl "https://shop.example".`, but not
   `LoginPage: goto() takes a URL string or options; received a URL object; pass its href.` (added by `fa424ad`, which
   updated `class-navigation.md` and the doc comment but not `errors.md`). Its prose ("Thrown by `goto()`: from
   JavaScript on a page object whose URL is a RegExp, and for a target that is not a URL") does not cover it either.
   Expected: the message, with its `received null` / `received a number` forms named, and a sentence on when it is
   thrown.
2. **`api/class-navigation.md`, *goto()*, Throws**, and the `@throws` of `goto` in `src/helpers/navigation.ts:99-102`
   list "What `page.goto()` throws" and three POMWright messages, not `Cannot resolve "…" against baseUrl "…".`, which
   POMWright throws itself (`src/helpers/url.ts:134-142`) before `page.goto` runs. Expected: the message on the API page
   and in the doc comment.
3. **`UrlMatcher.toString()`** is described as "A readable form, used in step titles and error messages"
   (`src/helpers/url.ts:40-41`, `api/class-navigation.md` *toString()*). No step title uses it (above: the titles are
   `Expect this Page`, `Expect any other Page`, and `Navigate to <resolved target>`); only the messages of
   `expectThisPage` and `expectAnotherPage` do (`src/helpers/navigation.ts:161-163`). Expected: "used in error
   messages".

4. **`runPostNavigationActions`'s default.** The `@param options` of `expectThisPage` and of both `goto` forms
   (`src/helpers/navigation.ts:62-63`, `97-98`, `118-119`) say "`waitUntil`, `timeout` and
   `runPostNavigationActions`; each defaults to the page object's `navOptions`." `runPostNavigationActions` never comes
   from `navOptions` (`NavigationOptions` has no such field, and `navigation.ts:235` and `:263` read the call's options
   only); it defaults to `true`, as `ThisPageOptions`' own comment and `api/class-navigation.md` say. Expected:
   "`waitUntil` and `timeout` default to the page object's `navOptions`; `runPostNavigationActions` defaults to `true`".

A side observation for the fix: `Cannot resolve …` is the only navigation message without the page object's label,
and it is thrown before the step opens, so the report shows no `Navigate to` step for it.

## Cause

`fa424ad` updated the API page only; the `Cannot resolve` message predates the per-member Throws convention; the
`toString` wording names a use that the step titles never had.

## Fix plan

- **Intended contract**: every navigation message appears in `errors.md`, on the API page of the method that throws
  it, and in that method's `@throws`; `toString()` is described by what uses it.
- **Options**:
  1. **Recommended**: docs only, the four corrections above. None.
  2. Also label `Cannot resolve …` (`LoginPage: goto("http://") cannot be resolved against baseUrl …`), as every other
     navigation message is. A message change, patch; it touches `src/helpers/url.test.ts:134` and `errors.md`.
- **Implementation steps**: `website/src/content/docs/api/errors.md` (*Navigation*), `api/class-navigation.md`
  (*goto()* Throws, *toString()*), `src/helpers/navigation.ts` (`@throws` of `goto`; the three `@param options`),
  `src/helpers/url.ts` (doc comment of `toString`).
- **Tests**: none for option 1 (the snippet and API checks still run); for option 2 a unit test of the new message and
  a harness assertion in `testNav.spec.ts`.
- **Docs**: the pages above.
- **Changeset**: none for option 1; for option 2, patch: "`goto(target)` names the page object when the target cannot
  be resolved against its `baseUrl`."
- **Decisions to tick**:
  - [x] Docs only, or also label the `Cannot resolve` message: **also label it** (a patch changeset, a unit test and a
    `testNav.spec.ts` assertion) ([DECISIONS.md #36](../DECISIONS.md)).
- **Execution order**: any time; if D-2 or D-1 changes `class-navigation.md`, edit it once.
