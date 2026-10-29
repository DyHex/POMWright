# Plan: *Upgrading from 2.x* (2E-4, 2H-4, 2H-5, 2H-7)

- **Decision**: [101](DECISIONS.md) (2026-10-29)
- **Findings**: [2E-4](E-logging-step-fixture/defect-2E-4-upgrade-page-omits-locale-check.md) (with 2H-8),
  [2H-4](H-docs-site-readme/defect-2H-4-upgrade-guide-stale-ts2339.md) (with 2A-7),
  [2H-5](H-docs-site-readme/defect-2H-5-upgrade-guide-two-compile-errors.md),
  [2H-7](H-docs-site-readme/defect-2H-7-upgrade-javascript-item-no-search.md) (all Low)
- **Bump**: none (docs)
- **Stop**: none planned
- **Depends on**: every code plan (the page quotes messages decisions 85, 86, 89 and 94 change); built before the
  contributor guide plan

## Contract

*Upgrading from 2.x* lists everything a 2.x project meets in 3.x, each item marked, and each that needs a change with
its search; it describes the upgrade from 2.x to the latest 3.x (decision 109, point 6). After this plan:

1. *Introduction*, after "grouped by area": "A project meets only some of these items, since each concerns one feature
   or one way of using it: `tsc` and the searches in *How to upgrade* show which apply to yours, and the rest can be
   skipped."
2. *Log attachments keep what was logged*: **fails at run time** for a `locale` that `Intl` rejects (`en_US`), with the
   message, a search for `locale:` in the configs, and a link to *Names in your locale*.
3. The TS2339 line quotes what the build's `tsc` prints, the three errors in its order.
4. A **compile error** item: `createRegistryWithAccessors(page)` needs its paths as a type argument (TS2345), with its
   search.
5. The storage item: **compiles** for strings; **compile error** for structured values without a codec (TS2322).
6. The frame item's search without `first()` and `last()`, on the page and in the README's mirror (`README.md` lines
   165-166).
7. The JavaScript item (`describe` and `nth`) with a search for those calls in `.js` files.

## Current behavior (checked 2026-10-29)

Line 664 marks the log item **Compiles**; line 585 quotes `TS2339 … on type 'string | null'`; no item names
`createRegistryWithAccessors`' type argument; the JavaScript item (lines 306-312) has no search. The snippet check skips
this page (`NOCHECK_PAGE`), since it shows 2.x code.

## Implementation (one commit)

Each item as the contract says. Every quoted message and type error copied from a probe against the build: the
review's `$P/E/upgrade/`, `$P/H/locale/`, `$P/H/upgrade/` (the 2.x consumer: compiled against `pomwright@2.1.0`, which
needs a v2.1.0 worktree recreated as 2H-5's finding says, and against the build) and `$P/A/t01-types.typecheck.ts`;
their outputs kept beside the plan's execution notes.

## Verification

The probes' outputs against the page's quotes, line by line; every search run from a scratch 2.x project's root finds
what its item names; `pnpm docs:build`; the grep for the external consumer projects' names.

## Decisions checklist

- [x] Decision 101: the four fixes and the *Introduction*'s sentence; every quote from a probe

## Execution

One commit, `docs: …`, with `Plan: defect-review-result-2/PLAN-2H-upgrade-guide.md` and the `Co-Authored-By:` trailer.
The maintainer pushes.
