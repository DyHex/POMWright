# Plan 27: packed twins of the source-level locator specs

- **Decisions**: [DECISIONS.md](DECISIONS.md) #55 (phase 1; phase 2 is plan 39)
- **Findings**: none (test gap #10, source-only coverage)
- **Bump**: none (tests only)
- **Stop**: no
- **Depends on**: plans 7 to 13 (the locator fixes: the twins are written against the final behaviour and messages)

## Contract

Every scenario of the 26 spec files that import `LocatorRegistryInternal` from `src/locators` also runs through
`pomwright`'s public API (`createRegistryWithAccessors<Paths>(page)`, `PageObject`) against the packed package,
asserting against the DOM first (AGENTS.md §4), so a bundling problem cannot hide behind a green source-level spec. The
source specs stay as they are until plan 39 evaluates them.

## Current behaviour

These 26 run against `src/` only:

- `add/`: `add.describe`, `add.filter`, `add.frameLocator`, `add.getByAltText`, `add.getById`, `add.getByLabel`,
  `add.getByPlaceholder`, `add.getByRole`, `add.getByTestId`, `add.getByText`, `add.getByTitle`, `add.get.clone`,
  `add.locator`, `add.reuseExisting`, `add.reuseReusable`, `add`;
- `filter.cycle`; `getLocator/getLocator`; `getNestedLocator/getNestedLocator`;
- `getLocatorSchema/`: `getLocatorSchema.describe`, `.filter`, `.nth`, `.update`;
- `registry/`: `registry.strictChains`, `registry.verify`; `validation/validation.locatorSchemaPath`.

They read internal records 79 times through `registry.get(…)` and 4 through `getIfExists(…)`.

## Steps

1. For each source spec, a twin beside it named `<name>.packed.spec.ts` (for example `add.describe.packed.spec.ts`),
   importing only from `pomwright` and `@playwright/test`, on the fixture pages the source spec uses. Each scenario of
   the source spec gets a test in the twin with the same title.
2. What the source spec reads from records is observed through the public API where it can be:
   - a stored copy: change the caller's options, filter or RegExp object after registration, and assert the resolved
     locator still matches the original elements (DOM);
   - steps and descriptions: the resolved chain's elements (DOM), and the locator's description where Playwright
     exposes it (`locator.toString()` / `describe` rendering, by the AGENTS.md §4 preference: DOM first);
   - presence and absence: `getLocatorSchema`, `verify()` and the errors (messages copied from the build).
   What cannot be observed publicly (for example the exact stored record shape, a definition's key order) is listed,
   assertion by assertion with its reason, in *Execution notes* (a table: source spec, assertion, why it stays
   source-only). Plan 39 reads that table.
3. At least the features of test gap #10 are covered by twins: reuse, frames, `getById`, cycles, `verify`, `update`'s
   merge patch, the query's `describe`, the any-frame query.
4. **Docs**: AGENTS.md §4 ("Know what each spec exercises"): the twins (`*.packed.spec.ts`) run the source-level
   scenarios against the packed tarball; the source specs add precision on what is stored; plan 39 decides which stay.

## Commits

One commit per folder is fine (`add/` may be two: strategies, then the rest), each green on its own:

```text
test: packed twins of the add specs

Each scenario of the source-level add specs also runs through pomwright's
public API against the packed package, asserting against the DOM, so a
bundling problem cannot hide behind a green spec against src/.

Plan: defect-review-result/PLAN-T10-packed-twins.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Verify

The standard checks (PLANS.md, rule 5) after each commit; the twins run in every project of `pnpm pack-test`.

## Execution notes

(filled in at execution, with the table of source-only assertions)
