# C-7: A query kept while an ancestor is registered says the ancestor has "no locator schema registered", after it has been registered

- **Kind**: defect
- **Area**: Independence: a query kept across later registrations; the sub-path error of `ensureSubPath`
- **Severity**: Low (a misleading message in a rare order: registering an ancestor after querying a descendant; the
  query's behaviour itself, a copy taken at `getLocatorSchema`, is as documented)
- **Semver of the fix**: patch (message only)
- **Reviewed**: `54cdada`, 2026-10-23, Claude Opus 5.5 (scope C)
- **Status**: decided: fix, option 1, second form (2026-10-26, [DECISIONS.md #29](../DECISIONS.md))

## Contract

- A query is "a private copy of the path's chain" taken at `getLocatorSchema(path)`, and "the next `getLocatorSchema`
  starts from the registry again" (`docs/queries.md`, *Introduction*); "A query does not end when the registry is called
  again [...]: keep it as long as the test needs it" (*Keeping a query*). So a kept query not seeing a later
  registration is as documented.
- AGENTS.md §5: "Error messages name the registry path [...]"; the skill's rule: a message names the actual cause.
  `docs/queries.md` *Sub-paths* shows the message
  `"main.form" is not a valid sub-path of "main.form.button@save". It is a segment of that path, but no locator schema is registered for it.`

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p15-kept-query-message.mjs` (with `lib.mjs` beside it):

```js
add("shell.list.item").locator("li");
const kept = getLocatorSchema("shell.list.item");
add("shell.list").locator("ul");
registry.verify();
kept.filter("shell.list", { hasText: "x" });
```

```sh
node /home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p15-kept-query-message.mjs; echo exit=$?
```

## Observed / expected

Exit 0:

```text
registry has shell.list: OK locator('ul')
kept query: THROWS "shell.list" is not a valid sub-path of "shell.list.item". It is a segment of that path, but no locator schema is registered for it.
kept query resolves: OK locator('li')
new query: OK locator('ul').filter({ hasText: 'x' }).locator('li')
```

The registry has `shell.list`; the message says it has no locator schema. Expected: the message says what is true,
that the segment was not registered when this query was taken, and that a new `getLocatorSchema` sees it.

## Cause

`src/locators/locatorQueryBuilder.ts:464-473` (`ensureSubPath`) words the reason in the present tense about the
registry, while the check reads the query's own copy (`this.definitions`), taken in the constructor (`:66-83`).

## Fix plan

- **Intended contract**: unchanged behaviour; the message describes the query's copy.
- **Options**:
  1. *(recommended)* Word the reason for the copy: `It is a segment of that path, but it had no locator schema when this
     query was taken.`, or keep today's wording when the registry still has none and add the "taken before" wording
     only when `registry.getIfExists(subPath)` now finds one (the message stays the same in the common case, so the
     docs need no change).
  2. Leave it. The order is rare: a page object registers everything in `defineLocators()` before any query.
- **Implementation steps**: `ensureSubPath` in `src/locators/locatorQueryBuilder.ts`.
- **Tests**: a unit case in `src/locators/locatorQueryBuilder.test.ts` (*sub-path errors*).
- **Docs**: none with the second form of option 1; with the first, `docs/queries.md` *Sub-paths*,
  `api/class-locatorquerybuilder.md` *Errors of every method* and `api/errors.md` *Queries*.
- **Changeset**: patch, if option 1. "A query kept while an ancestor of its path is registered says that the ancestor
  was registered after the query was taken."
- **Decisions to tick**:
  - [x] Option 1 (which wording) or 2: **option 1, the second form**: today's text unless the registry now has the
    path (checked through a new internal `has(path)`, only on the failure branch); the new form named in `api/errors.md`
    and the query's API page ([DECISIONS.md #29](../DECISIONS.md)).
- **Execution order**: independent.
