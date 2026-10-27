# Plan 12: a query's `describe()` on an any-frame terminal; a kept query's sub-path message

- **Decisions**: [DECISIONS.md](DECISIONS.md) #28, #29
- **Findings**: [C-6](C-queries/defect-C-6-query-describe-any-frame-terminal.md),
  [C-7](C-queries/defect-C-7-kept-query-not-registered-message.md); test gap #16's kept-query part
- **Bump**: patch (two changesets)
- **Stop**: no
- **Depends on**: plan 7 (the same file's types); otherwise independent

## Contract

- A query's `describe()` on a path whose definition is the any-frame `frameLocator()` throws at the call, with the
  message `filter()` and `nth()` give: `describe() cannot apply to "anyFrame": frameLocator() without a selector has no
  element to filter, index or describe; resolve a path inside it.` (AGENTS.md §5: an any-frame definition takes no
  description from any source, checked at the call). Only `describe(…)` before `replace()` on an any-frame query stops
  working, the order the query already forbids for `filter` and `nth`.
- A query kept while an ancestor of its path is registered later says so when a sub-path names that ancestor:
  `"shell.list" is not a valid sub-path of "shell.list.item". It is a segment of that path, and it was registered after
  this query was taken; take a new query with getLocatorSchema("shell.list.item") to use it.` (final text from a
  probe). When the registry still has no record, today's message stays. The query's behaviour is unchanged: it does not
  see later registrations.

## Current behaviour

- `src/locators/locatorQueryBuilder.ts:278-282` `describe` checks the description only; `ensureStepTarget` (`:484-488`)
  is typed for `"filter" | "nth"` and called by those two. So `describe` then `replace` works and `filter` then
  `replace` throws (`…-probes/C/p12-misc.mjs`, `p03-anyframe.mjs`).
- `locatorQueryBuilder.ts:464-473` `ensureSubPath` reads the query's own copy and says "It is a segment of that path,
  but no locator schema is registered for it." even when the live registry has the record now
  (`…-probes/C/p15-kept-query-message.mjs`).

## Steps

### Step 1: C-6

1. `ensureStepTarget(method: "filter" | "nth" | "describe", …)`; `describe` calls `ensureStepTarget("describe",
   this.path)` after `assertDescription`. Its doc comment `@throws` gains the message.
2. **Tests**: a unit case under *the any-frame form in a query* in `src/locators/locatorQueryBuilder.test.ts`; one line
   in `test/tests/locatorRegistry/add/add.frameLocator.spec.ts` against the packed package.
3. **Docs**: `api/class-locatorquerybuilder.md`, `describe()` **Throws**; `api/errors.md` *Queries*, the any-frame line
   gains `describe()`.
4. **Changeset** `query-describe-any-frame.md` (`patch`): "A query's `describe()` on a path registered as
   `frameLocator()` without a selector throws at the call, as its `filter()` and `nth()` do; replace the path first."

### Step 2: C-7

1. `LocatorRegistryInternal` gains `has(path)` (a `Map.has`, no clone), a member the builders call, as they call
   `get` and `getIfExists`, and outside `LocatorRegistry`'s `Pick`, so not public API (check that
   `check-api-coverage.mjs` and `publicTypes.emit.ts` see no new public member); `ensureSubPath`'s failure branch, for a
   chain segment without a record in the query, asks it and picks the message. Nothing runs on the success path.
2. **Tests**: a unit case under *sub-path errors* in `src/locators/locatorQueryBuilder.test.ts` for both forms (never
   registered: unchanged; registered after the query: the new form).
3. **Docs**: the new form in `api/errors.md` *Queries* and `api/class-locatorquerybuilder.md` *Errors of every method*;
   `docs/queries.md` *Sub-paths* unchanged.
4. **Changeset** `kept-query-sub-path-message.md` (`patch`): "A query kept while an ancestor of its path is registered
   says that the ancestor was registered after the query was taken, and how to see it, instead of that it has no
   locator schema."

## Verify

The standard checks (PLANS.md, rule 5) after each step; `pnpm docs:build`.

## Commit

```text
fix: a query's describe() on an any-frame terminal throws at the call

Plan: defect-review-result/PLAN-C-6-C-7-query-checks.md (step 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

```text
fix: a kept query's sub-path error says when the ancestor was registered after it

Plan: defect-review-result/PLAN-C-6-C-7-query-checks.md (step 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27.

**Step 1 (C-6).** `ensureStepTarget` takes `"describe"`; the query's `describe` calls it after `assertDescription`;
its doc comment `@throws` names the message. Unit test (*the any-frame form in a query*): `describe("all frames")` and
`describe("")` on a query of the any-frame path throw `describe() cannot apply to "any": …`, a query of a path inside it
describes. **Deviation, small:** the plan put "one line in `add.frameLocator.spec.ts` against the packed package", but
that spec imports `LocatorRegistryInternal` from `src` (one of the 26 source-level specs). The line went there anyway,
beside its `nth` and `filter` lines, and a packed case went into `getLocatorSchema.replace.spec.ts`, which imports
`pomwright`: the throw, and a query replaced first that describes (a described locator renders as its description, as
Playwright's do, so the chain is checked with `describe("")`). Docs: `api/class-locatorquerybuilder.md`, `describe()`
**Throws**; `api/errors.md`, *Queries* (the line, and "described"). Changeset `query-describe-any-frame.md`. Checks:
`pnpm lint` 0; `pnpm test:unit` 822 passed; `pnpm pack-test --reporter=line` exit 0 (1,524 passed, 3 skipped; doc
snippets 217; api coverage 0 problems; step locations 7); `pnpm docs:build` 0.
