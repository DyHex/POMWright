# Scope C: Queries

Segment C of the final whole-project review at `54cdada`. First read [../scopes.md](../scopes.md) (where things are,
probing, the finding format, finishing), [../inventory.md](../inventory.md) (lines tagged C) and
[../baseline.md](../baseline.md). Probes go to `/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/`.

Review it as an *area* in the skill's terms. Also treat the commits since `v3.0.1` listed below as a *change set*: for
each one, list every path its promise applies to, including the paths it did not touch, and probe them through the
public API. Where a regression is possible, run the same probe on `v3.0.1` too, in a second worktree in your probes
folder (see scope A's brief for the commands; never run it at the same time as the main one).

## What is in scope

- **Source**: `src/locators/locatorQueryBuilder.ts`, `src/locators/locatorUpdateBuilder.ts`, and the parts of
  `src/locators/utils.ts` they call (patching, `mergeOptions`, the `STRATEGIES` rows they read). Read the two builders
  in full, with their doc comments, and `getLocatorSchema` in `locatorRegistry.ts`.
- **Unit tests**: `src/locators/locatorQueryBuilder.test.ts`, `src/locators/locatorUpdateBuilder.test.ts`.
- **Harness**: `test/tests/locatorRegistry/getLocatorSchema/` (every spec). Some run against the tarball (`skip`,
  `replace`) and the rest against source; note which contracts are tested only against source.
- **Docs**: `docs/queries.md`, `filters-and-indices.md`, `descriptions.md`; `api/class-locatorquerybuilder.md`,
  `class-locatorupdatebuilder.md`; the *Queries* section of `api/errors.md`; the query and update builder parts of
  `internal/builders.md`; the query parts of the *Locators* section of `docs/upgrading-from-2x.md`; the query lines of
  AGENTS.md §5 (`skip`, `describe`, `nth`, `update`, `replace`) and §8.

## Changes since v3.0.1 in this scope

```
db26390 fix: undefined as update's and a seed override's first argument compiles
2accf34 fix: an ended registration's error names the call that ended it
b1ee8dc fix: a builder kept across skip() cannot change the skipped segment
```

## Known and decided

- Decided, not planned (AGENTS.md §7): validating `nth`'s index (`nth(undefined)` is documented as matching nothing).
- AGENTS.md §8: no cross-strategy `update` with a per-type cache; no explicit `undefined` as the option-clearing value;
  no rollback of a failed seeded override; no `update()` optional patch arguments on `replace()`; no query `remove()`
  that deletes a segment's definition, steps or description; no `this` returned from a public builder step.

## Questions to answer

- **skip / unskip.** Check every method on a skipped segment, builders taken before a `skip` and used after an
  `unskip`, `skip` of an unregistered segment and of one outside the chain, `skip` with `strictChains`, and
  `getLocator` against `getNestedLocator` on a query with a skipped segment. Does `b1ee8dc` hold for an `update()` and a
  `replace()` builder alike, at every point where a change is applied?
- **update.** Does it follow JSON Merge Patch for every strategy's options: nested objects, arrays, RegExp values,
  `null` deleting, `undefined` meaning "not provided"? Check an update of the primary only, a RegExp where a string was,
  and an update on a segment that has no definition.
- **replace.** Does every strategy's argument list match Playwright's 1.64 signatures, in the types and at runtime?
  Check `replace` then `update`, `replace` of the terminal or an ancestor with steps to `frameLocator()`, and
  `frameLocator(selector)`.
- **Independence.** Check two queries from one path, a query kept while more registrations happen (does the rule that
  a registration ends at the next call touch queries?), a builder used after `getLocator`, and objects passed to
  `update`, `replace` and `filter` then mutated.
- **Steps.** Check `filter`, `nth` and `clearSteps` on sub-paths, the order of steps against the registered ones, and
  `describe` and `describe("")` against Playwright's `locator.describe`. Check `nth("first")`, `nth("last")`, negative
  numbers and non-integers as handed to Playwright.
- **Types.** Do sub-path types, `SkippablePaths` and `Mode` accept exactly what the runtime accepts?
- **Docs.** Is every rendered chain and message on these pages the one the build produces now?

## Neighbours

Registration, reuse and resolution are scope B, the page object's facade is scope D. Report what you meet there under
*outside the scope* in `summary.md`.
