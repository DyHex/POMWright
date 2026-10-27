# Plan 31: a docs-chains spec

- **Decisions**: [DECISIONS.md](DECISIONS.md) #59 (point 3)
- **Findings**: none (test gap #15's chains part)
- **Bump**: none
- **Stop**: no
- **Depends on**: plan 27 (the shape of packed specs); after every plan that changes a page's chains (7–26, 30)

## Contract

Every rendered locator chain the documentation shows in a `text` block or a comment is rebuilt by a harness spec through
the packed package and compared, so a change to a chain fails until the spec and the page are updated together
(AGENTS.md §9: every chain a page shows is copied from a probe).

## Current behaviour

Nothing re-probes the chains pages show; they were copied from probes when written and are checked by eye since.

## Steps

1. Inventory: list every chain the site and the README show (grep `text` blocks and `// locator(…)`-style comments for
   `locator(`, `getBy`, `contentFrame`, `internal:`), with page and line, in *Execution notes*.
2. `test/tests/docs/docsChains.spec.ts` (new): one test per page (titled with the page's path), which builds each
   example's registry or page object on a blank page (`page.setContent` of an empty document; a chain renders without
   matching anything) through `pomwright`'s public API and asserts `locator.toString()` (or `${locator}`) equals the
   chain string, kept as data at the top of the test with a comment naming the page and the block. Strings that depend on
   the Playwright version (AGENTS.md §4) are pinned to the harness's Playwright; the latest-1.x CI rows run the same
   spec, so a new rendering shows there first.
3. Where a page shows a chain that hides an option (AGENTS.md §9: "where a rendered string hides an option, the stored
   record is read instead"), the spec asserts what the public API can show (`getLocatorSchema`'s chain, the DOM on a
   small fixture) and the inventory says so.
4. **Docs**: AGENTS.md §9: the chains a page shows are checked by `docsChains.spec.ts`, which changes with the page;
   AGENTS.md §4 lists the spec; *Internal → Tests and checks*.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build` if a page's chain was found stale and corrected (a stale
chain is unexpected: correct it in this plan and report it).

## Commit

```text
test: every chain the docs show is rebuilt and compared

Plan: defect-review-result/PLAN-T15-docs-chains.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution, with the inventory)
