# Plan 35: docs: renaming a path; the any-frame form in a query

- **Decisions**: [DECISIONS.md](DECISIONS.md) #43, #44
- **Findings**: [B-6](B-registration-and-resolution/defect-B-6-rename-skips-has-paths.md),
  [C-3](C-queries/defect-C-3-queries-page-no-any-frame.md)
- **Bump**: none (docs)
- **Stop**: no
- **Depends on**: plan 7 (*Paths with a dynamic part*), plan 12 (the query's `describe()` on any-frame)

## Contract

- *Locator paths*, *One path gets a new name*, leads with one find and replace, regular expressions on, that renames a
  path and every path below it: ``(["'`])main\.list(["'`.])`` replaced with `$1main.items$2` (without regex, two
  replacements: `"main.list"` → `"main.items"`, then `"main.list.` → `"main.items.`). It reaches the `Paths` members (a
  template member with a literal prefix too), resolutions, sub-paths, `reuse`, `has` and `hasNot` paths, in any quotes,
  and leaves siblings (`main.listArchive`, `main.list@open`) and other paths containing the text (`shell.main.list`)
  alone; a path composed from a variable is not found, and TypeScript flags it once `Paths` changes. A `:::note` for the
  trap: renaming only the exact path of a path with descendants leaves them on the old segment, where they still compile
  (the segment is then a namespace) and resolve without its locator; only `strictChains: true` reports it.
- The editor's rename (F2) stays as an alternative for a path with no paths below it, in three steps: from a use
  (resolutions, sub-paths, `reuse`), from a `has`/`hasNot` path, then the member; TypeScript then flags anything left.
- *A wrapper is removed* keeps its prefix replace. *Internal → Builders*, *Path parameters are generic*: the rename
  groups (a `has` value's contextual type includes `Locator`, so its literals form a group of their own) and that a type
  change cannot merge them.
- *Queries* gains "The any-frame form in a query", after *A new definition: `replace`*: the example
  `skip("main").replace("main.frame@payment").frameLocator()` and its chain, the rules with their messages (registered
  ancestors must be skipped; the query's own path cannot be replaced; a segment with steps needs `clearSteps` first;
  afterwards `filter`, `nth` and `describe` reject it). *Frames*, *Any frame*, and `api/class-locatorupdatebuilder.md`,
  *frameLocator()*, link the section's anchor.

## Current behaviour

- `docs/locator-paths.md:150-157` says a rename from a use reaches every use; `has`/`hasNot` paths are a separate rename
  group (`…-probes/B/p11-rename.out`); a quoted find and replace of one path misses its descendants
  (`…-probes/R/walkthrough/b6/regex.out` verifies the regex).
- *Frames* sends readers to *Queries* for `replace(subPath).frameLocator()`, and *Queries* never mentions frames
  (`…-probes/C/p03-anyframe.mjs`).

## Steps

1. The pages above; every message and chain copied from a probe against the build; the regex re-run on a scratch
   project with the walkthrough's cases before it is written into the page.
2. The *Queries* example compiled by the snippet check; `pnpm docs:build` checks the new anchors.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
docs: renaming a path and its descendants; the any-frame form in a query

Plan: defect-review-result/PLAN-B-6-C-3-docs.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28.

- Probes re-run at this build: the walkthrough's regex cases (`regex.mjs`, the same nine results: five renamed, the
  siblings and `shell.main.list` unchanged, the variable-composed path not found); the rename groups through TypeScript
  6's language service against `index.ts` (`rename.cjs`, the same three groups as at the review: the member alone;
  `add`, resolutions, sub-paths and `reuse`; `has` and `hasNot` paths); a path left under a renamed segment (resolves as
  `locator('main').getByRole('listitem')`, `verify()` passes, `strictChains: true` reports `"main.list.item":
  strictChains requires every ancestor to be registered; "main.list" is not.`); the any-frame query (the chain and the
  four messages, from a spec on the packed package).
- *Locator paths*, *One path gets a new name*: the find and replace first, the two-replacement form for double quotes,
  the variable-composed path, the `:::note` with the probed chain and message, then the editor's rename in its three
  groups. *A wrapper is removed* already used the prefix replace with the closing dot; unchanged.
- *Internal → Builders*, *Path parameters are generic*: the `has`/`hasNot` group and the generic-`has` probe
  (`rename.generic.out`: still apart from the uses, and a `has` beside a `hasNot` split into a group of one).
- *Queries*, *The any-frame form in a query*, after *A new definition: `replace`*: the example and its chain, and the
  rules with their messages. **Worded more precisely than decision 44**: `describe()` takes no sub-path, so after the
  replace only `filter` and `nth` reject the segment; `describe` rejects a query whose own path is registered as the
  any-frame form (decision 28), which the list says in the same item. *Frames* (*Any frame*) and the update builder's
  *frameLocator()* link the section.
- `docsChains.spec.ts` gained the two new chains (the query's on *Queries*, the renamed path's in *Locator paths*' note),
  as the spec covers every chain a page shows.
- DECISIONS.md #70 (plan 34's outcome, agreed at its stop) is in this commit.
- Checks: `pnpm lint` 0; `pnpm test:unit` 900 passed; `pnpm pack-test --reporter=line` exit 0 (2,427 passed, 3
  skipped; doc snippets 226; api coverage 0 problems; error messages 0 problems; step locations 31); `pnpm docs:build` 0.
