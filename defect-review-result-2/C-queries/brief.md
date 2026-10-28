# Segment 2C: Queries

Segment 2C of the second review at `d850405`. Read [../segments.md](../segments.md) first (the four passes, where things
are, probing, what to write), then [../baseline.md](../baseline.md). Probes go to
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/C/`. Review it as an *area* in the skill's terms, with the commits
since `v3.0.1` as a change set.

## The guide, read first

`AGENTS.md`, `src/AGENTS.md`, `src/locators/AGENTS.md` and `test/AGENTS.md`, in full, in the worktree.

## In scope

- **Source**: `src/locators/locatorQueryBuilder.ts`, `locatorUpdateBuilder.ts`, and the parts of `utils.ts`,
  `types.ts` and `locatorRegistry.ts` they use or that hand them out (`getLocatorSchema`). Read all of the two builders,
  with their doc comments.
- **Unit tests**: the two builders' tests, and the query parts of the registry's.
- **Harness**: `test/tests/locatorRegistry/getLocatorSchema/`, `add/add.filter.spec.ts`, `add/add.describe.spec.ts`,
  `test/tests/testApp/testFilters.spec.ts`, and the query parts of `test/tests/packaging/publicTypes.typecheck.ts`.
- **Docs** (under `website/src/content/docs/`): `docs/queries.md`, `filters-and-indices.md`, `descriptions.md`;
  `api/class-locatorquerybuilder.md`, `class-locatorupdatebuilder.md`; the query sections of `api/errors.md`; the query
  parts of `internal/builders.md` and `internal/resolution.md`.

## The change set

`git -C /home/magdys/workspace/dyhex/POMWright-second-review log --format='%h %ad %s' --date=short v3.0.1..HEAD -- src/locators test/tests/locatorRegistry/getLocatorSchema website/src/content/docs .changeset ':!defect-review-result'`,
narrowed to what touches queries. Read each diff and its changeset; the commits after `54cdada` first.

## Questions for pass 1

On top of the skill's checklist; questions, not suspicions.

- **Sub-path arguments**: on every form of path (literal, wide, generic, from a reused definition), in the types and at
  runtime.
- **Combinations and order**: `update`, `replace`, `filter`, `nth`, `skip`, `clearSteps`, `describe` in every order and
  repeated; a query resolved twice; a query kept and used after the registry changed.
- **Frames**: queries on frame and any-frame paths, and the methods that end at a frame.
- **Inputs**: the skill's list for options objects and filters (`has`, `hasNot`, text and RegExp forms with flags).
- **Messages and types**: every message the pages and the `@throws` show, character for character, raised at the call
  the docs say; the public types against the runtime.

## Pass 2: the first review

Its scope C: `defect-review-result/C-queries/`; the ledger rows of `defect-review-result/report.md` whose area is
queries, their `DECISIONS.md` entries and their plans; the items `PLAN-release-gates-and-audit.md` leaves for the second
review in this area; the first `inventory.md`'s lines tagged `[C]`. Probes:
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/C/`.

## Neighbours

Registration and resolution are 2B's, packaging 2F's. Report what you meet there under *outside the segment*.
