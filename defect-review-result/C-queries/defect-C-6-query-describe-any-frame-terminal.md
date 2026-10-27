# C-6: A query's `describe()` on an any-frame terminal is accepted at the call, where `filter()` and `nth()` on it, and `describe()` at registration, are rejected

- **Kind**: defect
- **Area**: `LocatorQueryBuilder.describe()` against the any-frame rule; queries of a path registered as
  `frameLocator()` without a selector
- **Severity**: Low (an inconsistency without wrong behaviour: the description is never shown, since resolving the
  any-frame terminal throws anyway, and it applies correctly if the terminal is replaced first)
- **Semver of the fix**: patch (brings the query in line with AGENTS.md §5; option 2 is docs-only, none)
- **Reviewed**: `54cdada`, 2026-10-23, Claude Opus 5.5 (scope C)
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #28](../DECISIONS.md))

## Contract

- AGENTS.md §5: "An any-frame `frameLocator()` definition takes no steps or description from any source (checked at the
  call)".
- The query's own message for this case names `describe`: `filter() cannot apply to "anyFrame": frameLocator() without
  a selector has no element to filter, index or describe; resolve a path inside it.` (`src/locators/utils.ts:537-538`,
  "A step or description offered to an any-frame definition: by `filter()`, `nth()`, `describe()` or a reused seed").
- `api/errors.md` *Queries*: "The any-frame form has no element: it cannot be the query's own path, carry steps, or be
  filtered or indexed."

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p12-misc.mjs` and `p03-anyframe.mjs` (with `lib.mjs`
beside them), on a registry with `add("anyFrame").frameLocator()`:

```sh
node /home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p12-misc.mjs; echo exit=$?
node /home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p03-anyframe.mjs; echo exit=$?
```

## Observed / expected

Both exit 0. The relevant lines:

```text
query describe on any-frame terminal: OK accepted at the call
query filter on any-frame terminal: THROWS filter() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
query any-frame terminal: nth: THROWS nth() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
query any-frame terminal: describe then getNestedLocator: THROWS frameLocator() without a selector does not point to a particular iframe; "anyFrame" cannot be resolved on its own, filtered or indexed; resolve a path inside it.
query any-frame terminal: describe then replace: OK x
query any-frame terminal: replace then filter: OK locator('iframe').visible()
```

Expected, by AGENTS.md §5: `getLocatorSchema("anyFrame").describe("x")` throws at the call with
`describe() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.`,
as `filter()` and `nth()` on the same query do, and as the registration's `describe()` does. Observed: it is accepted,
and the query then behaves differently by order: `describe` then `replace` works, `filter` then `replace` throws.

## Cause

`src/locators/locatorQueryBuilder.ts:278-282`: `describe` calls `assertDescription` and sets the description; it has no
`ensureStepTarget` check, which `filter` (`:177`) and `nth` (`:256`) have.

## Fix plan

- **Intended contract**: one rule for a query's any-frame segment, whichever method offers it a step or a description.
- **Options**:
  1. *(recommended)* Check `describe` at the call as `filter` and `nth` are: `ensureStepTarget("describe", this.path)`
     (widen its method type). Breaks only `describe(…)` before `replace()` on an any-frame query, which the same query
     already forbids for `filter`/`nth`; write the change in the changeset.
  2. Document the exception: a query's description is checked when the query resolves. Semver none; the rule in
     AGENTS.md §5 gets a qualifier.
  3. Relax `filter`/`nth` on an any-frame *terminal* to be checked at resolution instead, so any order works before a
     `replace()`. A larger change to a decided check; not recommended.
- **Implementation steps**: `src/locators/locatorQueryBuilder.ts` (`describe`, `ensureStepTarget`'s method union).
- **Tests**: a unit case in `src/locators/locatorQueryBuilder.test.ts` (*the any-frame form in a query*); one line in
  `test/tests/locatorRegistry/add/add.frameLocator.spec.ts`.
- **Docs**: `api/class-locatorquerybuilder.md` *describe()* **Throws** (with C-4); `api/errors.md` *Queries* (the
  any-frame line gains `describe()`).
- **Changeset**: patch. "A query's `describe()` on a path registered as `frameLocator()` without a selector throws at the
  call, as its `filter()` and `nth()` do; replace the path first."
- **Decisions to tick**:
  - [x] Option 1, 2 or 3: **option 1**, with the tests, docs and changeset above ([DECISIONS.md #28](../DECISIONS.md)).
- **Execution order**: with C-4 (the same API entry).
