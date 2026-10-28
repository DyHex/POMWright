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

2026-10-28.

- Step 1, `check-api-coverage.mjs`:
  - Sections: each API page is read heading by heading (fences skipped, anchors as the site makes them, a repeated one
    with `-1`). A `## Name` of an export starts that export's section; the page's title owns the headings before it and
    under its other `##` headings (Constructor, Methods, Properties, Locator methods, …). The builders of `add(path)` are
    owned by the page titled Registration.
  - A member's `### heading` must be in the section of the export that **declares** it, so `ThisPageOptions`'
    `timeout` and `waitUntil` are found under `NavigationOptions`, whose type it intersects, as its section says. **Not
    predicted**: the section scoping alone failed them (the page-wide lookup had found them).
  - Every `@see` must be a link to the site and its entry's own: an export's page or that page at its own `## Name`
    anchor; a member's or constructor's own `###` anchor in its section (`new X()` included). The `createReusable`
    exception the plan names is no longer needed: since plan 13 the factory's methods link their own headings in the
    `## ReusableLocatorFactory` section of *ReusableLocator*.
  - The *TypeScript* table rule: every exported type (class, interface or type alias: 36) appears in *The types* as a
    link whose target is its API page or section.
  - The header comment describes the rules; its CI sentence ("CI passes the tarball's declarations") was wrong, since
    CI extracts the tarball and the script reads its default path, and now says so.
- **Found by the check**: `LogLevel`'s `@see` linked `class-playwrightreportlogger/#loglevel`, which is `LogEntry`'s
  `### logLevel` field (it comes first on the page); the `## LogLevel` section is `#loglevel-1`. The same wrong link was
  on the API index page. Both corrected (the doc comment in `src/helpers/playwrightReportLogger.ts`, `api/index.md`).
- Step 2, *TypeScript*: **beyond the rows the plan names**, the table had no links at all, while the contract wants each
  type linked to its API section: every type is now a link (computed from the pages' headings, then held by the check),
  the storage rows gain `SessionStorageOptions<S>`, `SeedOptions`, `Decoded<S, K>` and `AllEntries<S>`, and the table
  gains `ReusableLocatorFactory<Paths>` and `StepDecorator`.
- Step 3: *Internal → Packaging*, *Checked on the packed package*, as a list: `esmEntry.spec.mts`, `packageFiles.spec.ts`,
  the three compile-only files (`stepLegacyDecorators.typecheck.ts` under both decorator modes), the legacy-decorator
  emit run by the step-location check, and CI's `consumer` job. AGENTS.md §4's `packaging/` list names the three files
  and the emit check.
- Step 4, tests (in place, restored; declarations planted in a scratch copy passed as the argument): SeedOptions' `###
  origin` removed while SessionStorageOptions keeps its own; `get`'s `@see` to `#set`; `get`'s `@see` without a URL
  (`@see SessionStorage.set`); `### get()` demoted to `####`; `### get()` removed while a fenced example shows it; a
  type left out of the table; `LogLevel` linked to `#loglevel` in the table. Each failed with exit 1 and its problem
  named; the repository is at 0 problems.
- Step 5: AGENTS.md §9; *Internal → Tests and checks* (item 6) and *Internal → Documentation* (*The API is complete*).
- Checks: `pnpm lint` 0; `pnpm test:unit` 900 passed; `pnpm pack-test --reporter=line` exit 0 (2,424 passed, 3
  skipped; doc snippets 223; api coverage 0 problems; error messages 0 problems; step locations 31); `pnpm docs:build` 0.
