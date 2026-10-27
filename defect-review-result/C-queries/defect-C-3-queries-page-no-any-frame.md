# C-3: *Frames* sends readers to *Queries* for `replace(subPath).frameLocator()`, and *Queries* never mentions frames or the any-frame rules of a query

- **Kind**: documentation
- **Area**: Docs: `docs/queries.md` against `docs/frames.md`; `replace(sub).frameLocator()` and the any-frame checks of
  `filter`/`nth` in a query
- **Severity**: Low (a link to a page that does not have what it promises; the rules are on the API page)
- **Semver of the fix**: none (docs only)
- **Reviewed**: `54cdada`, 2026-10-23, Claude Opus 5.5 (scope C)
- **Status**: decided: option 1 (2026-10-27, [DECISIONS.md #44](../DECISIONS.md))

## Contract

- AGENTS.md §9, *Principles*: "one home per fact (a rule is explained on its concept page and linked elsewhere; the
  API page and the doc comment state it briefly and link there)"; concept pages "show the common errors".
- `website/src/content/docs/docs/frames.md`, end of *Any frame*: "A query can install the any-frame form on an ancestor
  with `replace(subPath).frameLocator()`; see [Queries](/POMWright/docs/queries/)."
- AGENTS.md §5: "`replace(sub).frameLocator()` throws at the call on the query's own path and on a segment with steps in
  the query (`clearSteps` first)."

## Reproduction

```sh
grep -n -i "frame" website/src/content/docs/docs/queries.md; echo exit=$?
grep -n "see \[Queries\]" website/src/content/docs/docs/frames.md
```

The first prints nothing (exit 1): the Queries page has no occurrence of "frame". The second prints
`130:on an ancestor with \`replace(subPath).frameLocator()\`; see [Queries](/POMWright/docs/queries/).`

What a reader of *Queries* does not learn, each confirmed against the build with
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/p03-anyframe.mjs` (`node …/p03-anyframe.mjs`, exit 0):

```text
docs: skip main, replace frame any: OK frameLocator().getByRole('button', { name: 'Confirm' })
replace non-first to any (resolve): THROWS frameLocator() without a selector must be the first segment of the chain; "main.frame@payment" has the ancestor "main".
replace terminal to any: THROWS replace() cannot apply to "main.frame@payment": it is the path this query resolves, and frameLocator() without a selector has no element to resolve to; replace an ancestor instead.
replace frame-with-steps to any: THROWS replace() cannot apply to "main.frame@payment": it has filter or nth steps, and frameLocator() without a selector takes none; call clearSteps("main.frame@payment") first.
filter after replace to any: THROWS filter() cannot apply to "main.frame@payment": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

That is: the any-frame replacement needs its registered ancestors skipped (or the resolution throws), cannot replace the
query's own path, needs `clearSteps` first on a segment with steps, and rejects `filter`/`nth` afterwards. The rules are
written only on the API pages (`api/class-locatorupdatebuilder.md` *frameLocator()*, `api/class-locatorquerybuilder.md`
*filter()*/*nth()*/*replace()*) and in `api/errors.md` *Queries*.

## Observed / expected

Observed: the concept page the *Frames* page links for this feature does not describe it; its *Steps* section does not
say that `filter` and `nth` reject an any-frame segment, and its *A new definition: `replace`* section does not mention
`frameLocator()` without a selector.

Expected: *Queries* has a short section (or a paragraph in *A new definition: `replace`*) with the example the API page
already has (`skip("main").replace("main.frame@payment").frameLocator()`), the rules above and their messages, and
*Frames* links to that heading.

## Cause

`docs/frames.md:129-130` links the page, not a heading, and `docs/queries.md` was never given the section.

## Fix plan

- **Intended contract**: the any-frame rules of a query are explained on *Queries*, linked from *Frames* and from the API
  pages.
- **Options**:
  1. *(recommended)* Add a section "The any-frame form in a query" to `docs/queries.md` after *A new definition*, with
     the example, the four rules and the three messages; link it from `docs/frames.md:130` with its anchor and from
     `api/class-locatorupdatebuilder.md` *frameLocator()*.
  2. Point *Frames* at `api/class-locatorupdatebuilder.md#framelocator` instead. Smaller, but the concept page stays
     silent on it.
- **Implementation steps**: the two pages above; every chain and message copied from the probe output.
- **Tests**: `pnpm typecheck` (the snippet check compiles the new example), `pnpm docs:build` (the anchor exists).
- **Docs**: as above.
- **Changeset**: none (docs only; the site deploys from `main`).
- **Decisions to tick**:
  - [x] Option 1 or 2: **option 1**, with `describe` among the methods that reject the segment ([DECISIONS.md #44](../DECISIONS.md))
- **Execution order**: independent.
