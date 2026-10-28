# Segment 2F inventory (blind pass)

Written 2026-10-28T17:31:09+01:00, in pass 1, before anything of the first review was opened. Not edited after pass 1.
One line per item: what it is; the files; where it is documented; how deeply pass 1 probed it.

## The package

- **Entry `index.ts`**: 7 values (`test`, `PlaywrightReportLogger`, `json`, `SessionStorage`, `step`,
  `createRegistryWithAccessors`, `PageObject`) and 33 types; `AGENTS.md` *What POMWright is* lists them; *API reference*
  (`api/index.md`) and *TypeScript* (`docs/typescript.md` *The types*) table them. Probed: the export list against the
  guide and both tables (40 each); the bundle's `Object.keys` (7) against `index.mjs`.
- **Exports added since v3.0.1**: `AllEntries`, `Decoded`, `SeedOptions`, `SessionStorageOptions`, `StepDecorator`,
  `ReusableLocatorFactory`; each has `Added in: v3.0.2` on its API page (`website/AGENTS.md` rule). Probed: markers
  present; the changesets' "before" claims (TS4023, TS4094) on `pomwright@3.0.1`.
- **`package.json`**: `main`, `types`, `exports` (`.` with `import` {d.mts, mjs}, `require` {d.ts, js}, `default`
  {d.ts, js}; `./package.json`), `files` (`dist/**`, README, LICENSE, CHANGELOG), `engines.node >=20`, peer
  `@playwright/test >=1.64.0 <2.0.0`, no dependencies, `packageManager` (stripped by `pnpm pack`). Docs:
  `internal/packaging.md` *The `exports` map*, `docs/installation.md` *Requirements*, README *Installation*. Probed:
  the packed manifest against the source (only `scripts` moved and `packageManager` dropped); Node resolution of
  root, deep import (`ERR_PACKAGE_PATH_NOT_EXPORTED`) and `package.json` on Node 20, 22, 24.
- **Build**: `tsup index.ts --format cjs --dts --clean`, then `scripts/write-esm-entry.mjs` (names from
  `require(dist/index.js)`); target es2022 from `tsconfig.json`. Docs: `internal/packaging.md` *One build, two entries*,
  `docs/repository.md` *Packaging*. Probed: the bundle uses no Node API newer than 16.9 and no Playwright private member;
  `index.mjs` exports exactly the 7 names; no ESM default export (none documented).
- **Declarations**: one bundled `dist/index.d.ts` (2,878 lines; imports only `@playwright/test`; no Node types), and
  `dist/index.d.mts` (`export * from "./index.js"`). Docs: `internal/packaging.md` *Declarations*, `src/AGENTS.md`
  *Conventions* (type aliases over internal classes; every public method returns an importable type except the
  registration builders), `docs/versioning.md` (parameter-only utility types outside the promise). Probed: the 74
  unexported names reachable from public declarations (`F/emit/unexported-refs.out`); the parameter-only four appear
  only in parameters; a declaration emit of every public member (161) under npm and pnpm.
- **`pack-build.sh`, `pack-extract.sh`**: frozen install, build, `pnpm pack`, extract to `.pack/pomwright`. Docs:
  `test/AGENTS.md` *Commands*, root `AGENTS.md` *Commands*. Read; exercised by the baseline.
- **`scripts/pack-version.sh`** (`pnpm pack:version`): a tarball with a chosen version in the packed manifest only.
  Docs: `test/AGENTS.md`, `internal/packaging.md` *A build for testing before a release*. Probed: one run
  (`3.0.2-probe.1`): exit 0, the same 8 files, `dist/` unchanged, version set.
- **`tsconfig.json`**: strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, bundler resolution, `types: ["node"]`
  (TypeScript 6). Docs: `docs/repository.md` *Toolchain*. Read.
- **The baseline tarball**: `phase0/pomwright-test-build.tgz`, 8 files, identical to the worktree's. Probed: file
  list; same 8 files as `pomwright@3.0.0` and `3.0.1` on npm.

## Consumers

- **Module systems and resolutions**: node10, node16 and nodenext from CommonJS and ESM, bundler (esnext, preserve);
  `import` and `require` in one process. `scripts/consumer-check.sh` + `scripts/consumer/` (CI's consumer job).
  Probed: the full check on Node 24 (exit 0, attw no problems), `--node-floor` on Node 20 and 22 (exit 0),
  `shared.mjs` on Node 24.
- **TypeScript floor 5.0** (README badge, *Installation*, `consumer-check.sh`'s loop; `docs/versioning.md` ties them).
  Probed: `consumer.ts` and the three harness type probes on 5.0 to 5.9 and 7.0.2; `consumer.ts` without
  `skipLibCheck` by `@types/node` 20, 22, 24 (finding 2F-1).
- **Decorator modes**: standard and `experimentalDecorators`. Probed: both on every 5.x and 7; Playwright's runner
  transpiles decorators as 2023-05 whatever the tsconfig says (read in `playwright/lib/transform/babelBundle.js`).
- **Consumer compiler settings**: *Installation* says none is needed and names three that matter. Probed:
  `noImplicitOverride` (TS4114 on `pageActionsToPerformAfterNavigation` only), `exactOptionalPropertyTypes`,
  `noPropertyAccessFromIndexSignature`, `noUnused*`, `isolatedModules`, nodenext: no error in the declarations.
- **Declaration emit** (`declaration: true`): *TypeScript* → *`declaration: true`* (two exceptions). Probed: every
  member under npm and pnpm; the TS2883 exception under pnpm; the paths in emitted declarations (`playwright/test` and
  `playwright-core` under npm, `@playwright/test` under pnpm), as the page says.
- **Generic base class path forwarding** (`LocatorSchemaPathArgument`): *TypeScript* → *Paths in a generic base
  class*. Probed: the documented form compiles, a plain union and a bare type parameter do not.

## Harness

- `test/tests/packaging/packageFiles.spec.ts` (exact file list), `esmEntry.spec.mts` (entries, one copy, deep imports,
  manifest), `publicTypes.typecheck.ts`, `publicTypes.emit.ts` (+ `test/tsconfig.declarations.json`),
  `stepLegacyDecorators.typecheck.ts`. Docs: `test/AGENTS.md` *The harness*, `internal/packaging.md` *Checked on the
  packed package*. Probed: the type files on TS 5.0-5.9 and 7 outside the harness; the emit file's coverage against
  every member (finding 2F-2).

## Ranges

- **Peer range** `>=1.64.0 <2.0.0`: the root dev pin and the harness pin are 1.64.0 (`docs/versioning.md`). npm's
  latest is 1.64.1; CI runs it. Read.
- **`engines` `>=20`**: Playwright 1.64.0 and 1.64.1 declare `>=20`. Node 26 (LTS on 2026-10-28) is not tested: known,
  issue #55.

## Changesets

- **50 pending changesets**, all `"pomwright": patch`; `changeset status --verbose`: `pomwright -> 3.0.2`.
  `config.json`: `@changesets/changelog-github` (1.0.1) with `disableThanks`, schema of `@changesets/config@4.0.1`
  (installed). Docs: `docs/versioning.md` *Changesets*. Probed: every `src`/`index.ts` commit since v3.0.1 mapped to
  its changeset (commits without one change doc comments, the guide, an implementation signature no caller sees, or
  performance); no line that `changelog-github` rewrites (`pr:`, `commit:`, `author:`, `user:`, `#<number>`); first
  lines are sentences; the type-level "before" claims of ten changesets on `pomwright@3.0.1` (all hold:
  `F/before/run.out`); the four announced compile breaks on 3.0.1 vs 3.0.2 and their docs basis (patch holds);
  v3.0.1's 209 doc snippets and v3.0.1's harness `tsc` against 3.0.2 (exit 0 both); the trusted-publishing
  changeset's claim against npm (3.0.0 and 3.0.1 without attestations).
- **Migration hints**: findings 2F-3 (the rule names 2.x users) and 2F-4 (`schema-type-and-value` misses the
  forwarding base class).
- **CHANGELOG format**: `apply-release-plan` 8.1.1 writes `### Patch Changes` as 3.0.1's entry has; an entry is
  ``- [#PR](…) [`sha`](…) - <first line>`` with further lines indented two spaces (read in
  `changelog-github/dist/index.mjs`).

## Docs in scope

- `docs/installation.md` (Requirements, Install, Import, TypeScript settings): probed as above; 2F-1.
- `docs/typescript.md` (the types table, naming, generic base class, URL types, `declaration: true`): probed as above.
- `api/index.md`, `api/types.md`: export tables against `index.ts`; read.
- `internal/packaging.md`: every claim checked against the build, the manifest and the harness; 2F-2.
- README *Installation* and the badges: peer range, Node and TypeScript floor agree with the manifest and the pages.
