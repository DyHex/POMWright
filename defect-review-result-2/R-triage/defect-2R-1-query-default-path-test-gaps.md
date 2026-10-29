# 2R-1: the tests do not compare `update()`, `replace()` and `clearSteps()` without a path with their explicit form, nor reject `unskip()` and `unskip(ownPath)` at compile time

- **Kind**: test gap
- **Status**: decided 2026-10-29, decision 93 in [DECISIONS.md](../DECISIONS.md): cover both gaps; planned in the locators plan
- **Area**: the query builder's path-less forms (`src/locators/locatorQueryBuilder.ts`) and their tests
- **Severity**: Low (the code is right; a later change could break the equivalence or the types unnoticed)
- **Semver of the fix**: none (tests only)
- **Found**: 2026-10-29, in the triage (item 14), checking the maintainer's statement of the contract
- **Reviewed**: the branch at `b30818d` (its `src/` and `test/` equal `d850405`), Opus 5.5, second review's triage

## Contract

Without a path, `update()`, `replace()`, `nth()`, `filter()` and `clearSteps()` act on the query's own path, exactly as
with that path written out (`subPath ?? this.path`, or `this.path` for the one-argument `nth` and `filter`:
`locatorQueryBuilder.ts` lines 119-123, 162-170, 208-213, 246-252, 328-332). `skip()` and `unskip()` always take a path,
never the query's own (`SkippablePaths`); `describe()` takes no path and applies to the query's own.

## Observed

- `nth` and `filter` are compared side by side with their explicit form
  (`test/tests/locatorRegistry/getLocatorSchema/getLocatorSchema.clearSteps.spec.ts` lines 51-70); `update`, `replace`
  and `clearSteps` are checked only against an expected chain (lines 72-99), never with their explicit form.
- `skip` is covered at compile time and at run time for the query's own path and for the form without a path
  (`getLocatorSchema.skip.spec.ts` lines 7-20, `locatorQueryBuilder.test.ts` lines 166-180); `unskip` only for a stray
  call at run time: no `@ts-expect-error` shows that `unskip()` and `unskip(ownPath)` do not compile.

## Fix

Tests only: in `getLocatorSchema.clearSteps.spec.ts`, `update()`, `replace()` and `clearSteps()` each compared with the
same call given the query's path; in `getLocatorSchema.skip.spec.ts` (or `publicTypes.typecheck.ts`), `@ts-expect-error`
for `unskip()` and `unskip(ownPath)`.
