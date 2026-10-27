# Plan 32: the API coverage check: own `@see` headings, the *TypeScript* table

- **Decisions**: [DECISIONS.md](DECISIONS.md) #49, #48
- **Findings**: [G-7](G-ci-and-tooling/defect-G-7-api-coverage-see-target-unchecked.md),
  [F-4](F-packaging-types-changesets/defect-F-4-typescript-page-type-table.md); test gap #12's `@see` part
- **Bump**: none
- **Stop**: no (`check-api-coverage.mjs` runs in `pnpm typecheck`; the `site` job calls it unchanged)
- **Depends on**: plans 13 and 15 (the new exports and members), plan 1 (the file-list spec *Packaging* names)

## Contract

- `scripts/check-api-coverage.mjs` requires a method's or class property's `@see` to be its owner's API page with its
  own anchor (the slug of its heading, a repeated heading's `-1` suffix allowed), and an export's to be its page or its
  page with its own anchor; `createReusable`'s methods linking `#createreusable` stays the known exception. A member's
  `### heading` must be in its own type's `## Name` section on a page with several.
- The check also fails when an exported type is missing from the *TypeScript* page's type table.
- *TypeScript*, *The types* lists every exported type, each linked to its API section: the storage row gains
  `SessionStorageOptions`, `SeedOptions`, `Decoded` and `AllEntries`; the table gains `StepDecorator` and
  `ReusableLocatorFactory`.
- *Internal → Packaging* names every check of the packed package: the three compile-only files
  (`publicTypes.typecheck.ts`, `publicTypes.emit.ts` and `stepLegacyDecorators.typecheck.ts`, the last under
  `experimentalDecorators`), the emit check of every public member (plan 13), the file-list spec (plan 1).

## Current behaviour

- The script accepts any `@see` and looks headings up on the whole page (`…-probes/G/apicov/plant.out`), while
  *Internal → Tests and checks* and *Internal → Documentation* promise a `@see` to the member's own heading.
- `docs/typescript.md`'s table lacks the four storage types exported in 3.0.2; *Packaging* and AGENTS.md §4 count two
  compile-only files where there are three; nothing checks the table against the exports.

## Steps

1. `check-api-coverage.mjs`, from `…-probes/G/apicov/see-scan.mjs`: the own-anchor rule and the section scoping; the
   `createReusable` exception; then the *TypeScript* table rule (every exported type name appears in the table, linked).
   Its header comment says what it checks (with plan 40's rewrite of the CI sentence, decision 51).
2. `docs/typescript.md`, *The types*: the rows above, linked to their API sections.
3. *Internal → Packaging*: the checks of the packed package; AGENTS.md §4's `packaging/` list aligned (three
   compile-only files, the emit check, `esmEntry.spec.mts`, `packageFiles.spec.ts`).
4. **Tests**: scope G's planted cases (`…/apicov/plant.sh`: a `@see` to another member's heading, a `@see` without a URL,
   a heading present only in another type's section) and a type left out of the table fail; the repository stays at 0
   problems. Recorded in *Execution notes*.
5. **Docs**: AGENTS.md §9's description of the script; *Internal → Tests and checks* and *Internal → Documentation*.

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`.

## Commit

```text
test: the API coverage check requires each @see's own heading and the TypeScript table

A member's @see must link its own heading in its own type's section, and
every exported type must be in the TypeScript page's table, which now lists
the storage types, StepDecorator and ReusableLocatorFactory. Packaging names
every check of the packed package.

Plan: defect-review-result/PLAN-G-7-F-4-api-coverage.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

(filled in at execution)
