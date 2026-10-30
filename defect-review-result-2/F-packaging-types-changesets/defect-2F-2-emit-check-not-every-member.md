# 2F-2: The declaration emit check is said to return every public member on its own; it returns 35 expressions, and about a hundred public members are never returned

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 106 in [DECISIONS.md](../DECISIONS.md); done 2026-10-30 in `d672c5b`
- **Area**: Harness: `test/tests/packaging/publicTypes.emit.ts`, `test/tsconfig.declarations.json`; Docs:
  `internal/packaging.md` *Checked on the packed package*; guide: `test/AGENTS.md` *The harness*
- **Severity**: Low (the package is sound: every public member emits, probed below; the claim overstates what the
  check guards, so a future member whose type a consumer cannot name could ship unnoticed)
- **Semver of the fix**: none (a test and the text that describes it)
- **Pass**: 1
- **First review**: new since 54cdada (7f90436, 2026-10-27, which added `members` and the claim; carried into the guide by
  1b15aff and 6d1de0e). It follows F-2's decision 24, which defined "every public member" as the walkthrough's
  34-member probe; F-2 itself is fixed (`first-review.md`)
- **Reviewed**: `d850405`, 2026-10-28T17:27:09+01:00, Opus 5.5, second review, segment 2F

## Contract

- `test/AGENTS.md:96`: "`publicTypes.typecheck.ts`, `publicTypes.emit.ts` and `stepLegacyDecorators.typecheck.ts`,
  compile-only, …; the emit check returns every public member on its own".
- `website/src/content/docs/internal/packaging.md:143-144`: "`publicTypes.emit.ts`, which a project with
  `declaration: true` must be able to emit without annotations, every public member returned on its own, so a type that
  is not exported fails it".
- `test/tsconfig.declarations.json:2-3` and the file's own header (`publicTypes.emit.ts:1-3, 82`) say the same.
- `test/AGENTS.md:120`: "A change to the public types adds to both."

## Reproduction

1. The check's member list: `test/tests/packaging/publicTypes.emit.ts:97-141` has 35 entries: `registry verify
   getLocator getNestedLocator getLocatorSchema add createReusable factory factoryAdd query queryChain updateBuilder
   afterUpdate replaceBuilder afterReplace seed seedChain seedDefinition seedSteps pageAdd pageGetLocator
   pageGetNestedLocator pageGetLocatorSchema navigation navigationGoto pageSessionStorage pageSessionStorageGet fullUrl
   baseUrl label sessionStorage childLogger codec step stepWithOptions`.
2. Every public member, generated from the declarations: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/F/emit/gen-members.mjs`
   reads `emit/seed.ts` (one value of every exported class and type with members: a registry, its accessors, a query,
   both builder modes, a role seed and a wide seed, the seed factory, a string page object and a RegExp one, both
   navigation types, a `UrlMatcher`, a storage with and without a schema, a logger, a codec, a `StepDecorator`, and the
   values `PageObject`, `SessionStorage`, `PlaywrightReportLogger`, `step`, `json`, `test`, `createRegistryWithAccessors`)
   with the TypeScript compiler API and writes `members.ts`, each public property returned on its own (161 entries).

```bash
cd /home/magdys/workspace/dyhex/POMWright-second-review-probes/F/npmproj   # npm project: the baseline tarball, @playwright/test 1.64.0, TypeScript 6.0.3
cp ../emit/seed.ts seed.ts && node ../emit/gen-members.mjs .
node node_modules/typescript/bin/tsc --strict --target es2022 --types node --module esnext --moduleResolution bundler \
  --declaration --emitDeclarationOnly --outDir emit-typescript members.ts; echo "exit $?"
```

Output: `members.ts: 161 entries`, then `exit 0`. The same file emits with exit 0 on TypeScript 5.0.4 (with
`--skipLibCheck`), 5.4.5, 5.9.3 and 7.0.2 in this project, and on 6.0.3 in a pnpm project
(`/home/magdys/workspace/dyhex/POMWright-second-review-probes/F/pnpmproj`). `emit/coverage-vs-emit-check.txt` lists
what the harness check never returns on its own (116 of the 144 POMWright entries; some are reached through a returned
chain, such as the results of `filter` and `nth`).

## Observed / expected

Observed: among the members the check never returns are the query's `getLocator` and `getNestedLocator`; nine of the
ten methods of each builder mode and of `createReusable`; a seed's `type` and `description`; a page object's `page` and
`urlPath`; everything of a RegExp page object (its `fullUrl`, a `UrlMatcher`, and its `navigation`,
`NavigationFor<RegExp, UrlMatcher>`), and `expectThisPage` and `expectAnotherPage` of any; `set`, `get`, `clear` and
`seed` as methods; every logger method but `getNewChildLogger`; a codec's `parse` and `stringify`; and the exported
values `json`, `test`, `PageObject`, `SessionStorage`, `PlaywrightReportLogger` and `createRegistryWithAccessors`
themselves. All of them emit today (above), so nothing ships broken.

Expected: either the check returns every public member, as the guide and *Internal → Packaging* say, or the text says
what it covers.

## Cause

`publicTypes.emit.ts`'s `members` is written by hand and grew with the fixes that needed it (the registry's `add` and
`createReusable`, `step()`'s decorator, the storage reads); members no fix touched were never added.

## Fix plan

- Intended contract: the emit check guards every public member, as written.
- Options: (a, recommended) generate the member list from the published declarations, as `gen-members.mjs` does
  (the TypeScript compiler API over a seed module of one value per exported type), so a new member is covered without a
  hand edit; it runs in `pnpm typecheck` beside the existing emit; (b) extend `members` by hand with the members listed
  above and keep "A change to the public types adds to both"; cheaper now, and it drifts again; (c) narrow the claim in
  `test/AGENTS.md`, `internal/packaging.md`, the tsconfig comment and the file header to "the members the fixes
  needed".
- Tests: the generated module under `test/tsconfig.declarations.json`, on the packed package, under pnpm (the harness)
  as now; CI's consumer job could run the same emit under npm, where the declarations name `playwright/test` and
  `playwright-core`.
- Docs: `internal/packaging.md` *Checked on the packed package*, `test/AGENTS.md` *The harness*.
- Changeset: none.
