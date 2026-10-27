# C-4: The API reference leaves out two errors of the query's members: `describe()`'s, and the skipped-segment error that `b1ee8dc` made the update builder's ten methods throw

- **Kind**: documentation
- **Area**: Docs: `api/class-locatorquerybuilder.md` *describe()*, `api/class-locatorupdatebuilder.md` and the doc
  comments of `LocatorUpdateBuilderInternal`'s ten methods; change set `b1ee8dc`
- **Severity**: Low (the errors are real and documented elsewhere; the member's own entry and hover do not list them)
- **Semver of the fix**: none (docs and doc comments only)
- **Reviewed**: `54cdada`, 2026-10-23, Claude Opus 5.5 (scope C)
- **Status**: decided (2026-10-26, [DECISIONS.md #36](../DECISIONS.md))
- **Merged with**: A-6, B-7, D-3, H-2 (see report.md)

## Contract

- AGENTS.md §9: "say what fails and how (concept pages show the common errors, API pages and doc comments every one per
  member, *Error messages* all of them)"; API pages have per member "**Throws** (the real messages)"; doc comments have
  "`@throws` with the real message".
- `b1ee8dc` moved an error into the update builder: "applyUpdate and applyReplacement now check again, with the same
  message", so the builder's `getByRole()`, `locator()` and the other eight now throw it. The skill's change-set
  question: did the docs keep up?

## Reproduction

`/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p11-thrown-by-builder.mjs` (with `lib.mjs` beside it):

```sh
node /home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p11-thrown-by-builder.mjs; echo exit=$?
```

```text
query describe(null): THROWS describe requires a string for "main.list.item"; pass "" to remove the description.
update builder method after skip: THROWS update() cannot apply to "main.list": it is skipped in this query; call unskip("main.list") first.
replace builder method after skip: THROWS replace() cannot apply to "main.list": it is skipped in this query; call unskip("main.list") first.
exit=0
```

The pages and comments:

```sh
awk '/^### describe\(\)/,/^### filter\(\)/' website/src/content/docs/api/class-locatorquerybuilder.md | grep -c "Throws"   # 0
grep -n -i "skipped in this query" website/src/content/docs/api/class-locatorupdatebuilder.md src/locators/locatorUpdateBuilder.ts; echo exit=$?   # exit 1, no match
```

- `api/class-locatorquerybuilder.md`, *describe()*: Usage, Arguments, Returns, no **Throws**. The same method on the
  registration builder (`api/class-registrationbuilder.md`, *describe()*) and on a seed (`api/class-reusablelocator.md`,
  *describe()*) each list their message under **Throws**. The query's doc comment has it
  (`src/locators/locatorQueryBuilder.ts:268-269`).
- `api/class-locatorupdatebuilder.md`, *Methods*: "Every method throws, in `update` mode, for a segment registered with
  another strategy, and in `replace` mode, from JavaScript, when the first argument is missing", plus the empty string;
  nothing about a builder kept across `skip()`. The ten doc comments in `src/locators/locatorUpdateBuilder.ts`
  (`:163`, `:192`, `:220`, `:248`, `:276`, `:304`, `:332`, `:360`, `:382`, `:409`) list only the strategy error; the
  one of `frameLocator` (`:360`) lists only the any-frame errors of `replace` mode, not even the strategy error that
  `update().frameLocator(…)` on a segment of another strategy throws. The error is documented on the query's side only: the `update()` and
  `replace()` doc comments (`locatorQueryBuilder.ts:97-100`, `:303-306`), *skip()* on the query's API page, and
  `docs/queries.md`.

## Observed / expected

Observed: as above. Expected: the query's *describe()* entry has a **Throws** with
`describe requires a string for "main.list.item"; pass "" to remove the description.`; the update builder's page says,
next to the strategy error, that a method of a builder taken before `skip()` of its segment throws
`update() cannot apply to "main.list": it is skipped in this query; call unskip("main.list") first.` (or `replace()`),
and the ten `@throws` say so in one clause.

## Cause

`b1ee8dc` updated the query's pages and comments (the builder's call site) but not the builder's (the throw site);
the query's *describe()* entry was written without a **Throws**.

## Fix plan

- **Intended contract**: every error a member throws is on its API entry and in its `@throws`.
- **Options**:
  1. *(recommended)* Add the **Throws** block to the query's *describe()*; add one sentence and the message to the
     update builder page's *Methods* intro; add a clause to the ten `@throws` ("…, or, for a builder taken before
     `skip()` of its segment: `update() cannot apply to "main.list": it is skipped in this query; …`").
  2. Pages only, leaving the hovers. Cheaper; the editor stays silent.
- **Implementation steps**: the two API pages; `src/locators/locatorUpdateBuilder.ts` doc comments.
- **Tests**: `pnpm typecheck` (API coverage check), `pnpm docs:build`.
- **Docs**: as above; `api/errors.md` *Queries* already has the message.
- **Changeset**: none for the pages; a doc-comment change ships in the declarations but needs no changeset of its own
  (or rides any patch changeset of this release).
- **Decisions to tick**:
  - [x] Option 1 or 2: **option 1** (pages and hovers), with C-6's new `describe()` error ([DECISIONS.md #36](../DECISIONS.md)).
- **Execution order**: with C-3 (same pages) if both are taken.
