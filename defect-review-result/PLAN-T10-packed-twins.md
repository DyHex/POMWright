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

2026-10-27.

- 26 twins, `<name>.packed.spec.ts` beside each source spec, every scenario under the source's title, importing
  `pomwright` (and the harness fixtures, themselves on the packed package) instead of `src/`; 227 tests per browser. Ten were
  written by hand (the eight one-strategy specs, `add.getById`, `add.describe`); sixteen began as a mechanical
  conversion (the import, `createRegistryWithAccessors<Paths>(page).registry` for `new LocatorRegistryInternal`,
  `LocatorRegistry` for the class type), and `tsc` then named every internal call, each rewritten by hand.
- What the source specs read from records is observed publicly: an absent record as `getLocator(path)`'s
  `No locator schema registered for path "…".`; a definition with its steps as the rendered chain against Playwright's
  own call with the same arguments (`locator.describe("")`, which drops the description that would stand in for the
  chain); a description as `description()`; DOM checks through `page.setContent` (as `add.get.clone.spec.ts` and
  `getLocatorSchema.skip.spec.ts` already do) where a scenario is about matching (the strategies, ids, RegExp flags,
  a query that leaves the registry unchanged), and the fixture pages the source specs already use.
- The features of test gap #10 are all twinned: reuse (`add.reuseExisting`, `add.reuseReusable`), frames
  (`add.frameLocator`), `getById`, cycles (`filter.cycle`), `verify` (`registry.verify`, `registry.strictChains`),
  `update`'s merge patch (`getLocatorSchema.update`), the query's `describe` and the any-frame query
  (`getLocatorSchema.describe`, `add.frameLocator`).

Source-only assertions (plan 39 reads this table):

| Source spec | Assertion | Why it stays source-only | What the twin checks instead |
| --- | --- | --- | --- |
| every spec with record reads | the record's field names and step objects (`locatorSchemaPath`, `kind`, `{ id, type }`) | the record is internal | Playwright's rendering of the same call: strategy, arguments, flags, options and steps |
| `add.get.clone` | `registry.get` and `getIfExists` return a copy; changing it leaves the stored record | both methods are internal | a query is a copy: changing it (`update`, `nth`) leaves `getLocator` as registered (DOM and rendering) |
| `add.reuseExisting` | the internal `replace` of a copy's record leaves the source path unchanged | `replace` is internal; a registered path cannot change publicly | a query's `replace` of the copy changes neither the copy nor the source |
| `add.reuseReusable` (matching overrides) | the record read between a refused `getById` and the allowed `getByRole` on one registration | any public read ends the registration (the twin's first draft met `its registration was ended by getLocator`) | the later override succeeding, and the result |
| `add.spec` (regex strategies) | `options: { exact: true }` stored with a RegExp text | Playwright renders `getByText(/Seeded/i)` alike with and without `exact` | the rendering and the DOM match |
| `add.describe` (defaults at resolution) | the record has no `description` until a resolution | the record is internal | a copy by path made after a resolution defaults to its own path |
| `validation.locatorSchemaPath` | the escaping of whitespace in messages, through `formatLocatorSchemaPathForError` | the function is internal | a local copy of its rule, the messages compared as before |

- Docs: AGENTS.md §4 (the 26 source specs and their twins; the spec count, 83 files, about 13,000 lines); *Internal →
  Tests and checks* (the twins).
- Checks: every source spec and its twin list the same number of tests (227 in 26 files); `pnpm lint` 0;
  `pnpm pack-test --reporter=line` exit 0 (2,286 passed: 1,605 before and 227 twins on each of three browsers, 3
  skipped; doc snippets 221; api coverage 0 problems; step locations 29); `pnpm docs:build` 0. Committed in three
  folders: `add/`; the resolution and query specs; `registry/` and `validation/` with the docs and these notes.
