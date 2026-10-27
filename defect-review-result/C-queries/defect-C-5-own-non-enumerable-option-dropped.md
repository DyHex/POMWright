# C-5: An own non-enumerable property of an options, patch or filter object is dropped silently, where Playwright reads it

- **Kind**: defect
- **Area**: Copies of inputs (`readFields`, `copyFields`, `mergeOptions` in `src/locators/utils.ts`) as a query's
  `update()`, `replace()` and `filter()` use them; the same function serves `add(path)` and `createReusable` (scope B)
- **Severity**: Low (silent loss of an option, so the locator matches more than written; but only for an object whose
  property was defined non-enumerable, which plain literals and class instances never are)
- **Semver of the fix**: patch (behaviour brought in line with AGENTS.md §5, "read as Playwright reads them")
- **Reviewed**: `54cdada`, 2026-10-23, Claude Opus 5.5 (scope C)
- **Status**: merged into B-1, decided with it (2026-10-26, [DECISIONS.md #15](../DECISIONS.md))
- **Merged with**: B-1 (see report.md)

## Contract

AGENTS.md §5: "builders store copies of the options and filter objects callers pass, read as Playwright reads them
(`readFields`: own properties, then those of each prototype up to `Object.prototype`, methods left out)".
`src/locators/utils.ts:187-191`: "The entries of an options, patch or filter object as Playwright reads them, by
property access". `website/src/content/docs/docs/registering-locators.md` (*Registered locators do not change*): "The
copy reaches every value you pass, and reads an options or filter object as Playwright does: [...] This holds for
`add`, `createReusable` and queries alike." Playwright reads each option by property access (`options.name`), so an own
non-enumerable property counts; probed below.

## Reproduction

Through the public API, `/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p13-readfields.mjs` (with `lib.mjs`
beside it):

```js
const hidden = Object.defineProperty({}, "name", { value: "Hidden", enumerable: false });
page.getByRole("listitem", hidden).toString();                                        // Playwright
getLocatorSchema("list.item").replace().getByRole("listitem", hidden).getLocator();   // a query
add("x").getByRole("listitem", hidden);                                               // a registration
```

```sh
node /home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p13-readfields.mjs; echo exit=$?
```

To explain it at the unit, `/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p14-readfields-unit.test.ts`:

```sh
cp /home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p14-readfields-unit.test.ts src/zz-probe-C5.test.ts
pnpm vitest run src/zz-probe-C5.test.ts; echo exit=$?
rm src/zz-probe-C5.test.ts
```

## Observed / expected

`p13-readfields.mjs`, exit 0 (the first three lines show that class instances, the case `9dc8048` fixed, work through
the query):

```text
query filter class instance: OK locator('ul').getByRole('listitem', { name: 'A', exact: true }).filter({ hasText: 'Open' }).visible()
update patch class instance: OK locator('ul').getByRole('listitem', { name: 'B' })
replace options class instance: OK locator('ul').filter({ hasText: 'Items' }).getByRole('listitem', { name: 'A', exact: true })
playwright getByRole own non-enumerable: OK getByRole('listitem', { name: 'Hidden' })
query replace own non-enumerable: OK getByRole('listitem')
add own non-enumerable: OK getByRole('listitem')
```

Playwright keeps `name: 'Hidden'`; the query and the registration drop it. The unit probe, exit 1:

```text
AssertionError: expected undefined to be 'Hidden' // Object.is equality   (copyFields keeps it)
AssertionError: expected undefined to be 'Hidden' // Object.is equality   (mergeOptions keeps it)
```

Expected: the copy keeps every property Playwright would read, an own non-enumerable one included.

## Cause

`src/locators/utils.ts:192-213`: `readFields` starts from `Object.entries(fields)`, which lists own *enumerable*
properties only, then walks the prototypes with `Object.getOwnPropertyNames`. An own non-enumerable property is in
neither list. `copyFields` (`:220`) and `mergeOptions` (`:491`) both read through it.

## Fix plan

- **Intended contract**: unchanged; the copy reads what Playwright reads.
- **Options**:
  1. *(recommended)* Read the object's own property names with `Object.getOwnPropertyNames` as well (after
     `Object.entries`, by property access, functions left out as for the prototypes), before the plain-object fast path.
     Sketched in the worktree: the unit probe goes from 2 failed to 4 passed, and `pnpm vitest run src/locators` stays
     green (12 files, 501 tests, no type errors). Cost: one more `getOwnPropertyNames` per copied object.
  2. Document that only enumerable own properties are read. Semver none; the copy still differs from Playwright.
- **Implementation steps**: `readFields` in `src/locators/utils.ts`.
- **Tests**: unit cases in `src/locators/utils.test.ts` beside the class-instance ones; a harness case against the
  packed package (an `update` patch and a `filter` with a non-enumerable key, DOM assertion).
- **Docs**: `internal/registry-records.md` if it describes `readFields`'s reading order.
- **Changeset**: patch. "An options, patch or filter object's own non-enumerable property is kept, as Playwright reads
  it; it was dropped."
- **Decisions to tick**:
  - [ ] Option 1 or 2.
- **Execution order**: shared with scope B (`readFields` serves `add` and `createReusable` too); one fix covers both.
