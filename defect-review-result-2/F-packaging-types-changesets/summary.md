<!-- Saved by the orchestrator from the segment agent's final message: the agent's own write of this file was refused by
the harness rule "Subagents should return findings as text, not write report files". The text below is the agent's,
unchanged. -->

# Segment 2F: Packaging, public types and changesets — summary

- **Reviewed**: `d850405` (`fix/review-3-0-2`) in the worktree `/home/magdys/workspace/dyhex/POMWright-second-review`,
  2026-10-28, 17:08 to 17:40 (+01:00), by Opus 5.5, second review, segment 2F.
- **Probes and notes**: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/F/`.
- **Result**: 0 defects, 4 documentation findings (all Low, semver none), 0 suspected, 0 design questions. No source
  sketch proposed: no finding needs one to settle its cause or its fix.
- **Passes**: 1 done 17:32:17, 2 done (after the first review's re-runs), 3 done 17:37:11, 4 done 17:40:47 (`log.md`).

## What I read

- Method and setup: the worktree's `skills/defect-review/SKILL.md` in full, `segments.md`, `baseline.md`, `brief.md`.
- The guide, in full: `AGENTS.md`, `src/AGENTS.md`, `test/AGENTS.md`, `docs/repository.md`, `docs/versioning.md`; the
  "Added in" rule of `website/AGENTS.md`.
- The package: `index.ts`, `package.json`, `tsconfig.json`, `tsconfig.vitest.json`, `pack-build.sh`, `pack-extract.sh`,
  `pack-test.sh`, `scripts/write-esm-entry.mjs`, `scripts/pack-version.sh`, `pnpm-workspace.yaml`, `.gitignore`,
  `LICENSE`; `dist/index.d.ts` (its declarations and export lists), `dist/index.mjs`, `dist/index.d.mts`; the baseline
  tarball's file list and packed manifest.
- The consumer check: `scripts/consumer-check.sh`, `scripts/consumer/consumer.ts`, `shared.mjs`, `runner/*`.
- Harness: `test/tests/packaging/` (all five files), `test/tsconfig.json`, `test/tsconfig.declarations.json`,
  `test/tsconfig.legacyDecorators*.json`, `test/package.json`.
- Changesets: all 50 pending files and `config.json`; `CHANGELOG.md`'s head (format only); the installed
  `@changesets/changelog-github@1.0.1` and `@changesets/apply-release-plan@8.1.1` (how an entry and a section are built),
  `@changesets/format@0.1.3` (no formatter applies: biome is excluded, no prettier, dprint or oxfmt config).
- Docs: `docs/installation.md`, `docs/typescript.md`, `api/index.md`, `api/types.md`, `internal/packaging.md`, the
  README; the base-class section of `docs/organizing-a-project.md` (now and at v3.0.1); *Upgrading from 2.x*'s outline
  and *Requirements*.
- History (pathspec `':!defect-review-result'` throughout pass 1; one slip in pass 1, logged: a `git show --stat`
  without it listed two file names of the first review's folder, no content): every commit `v3.0.1..d850405` touching
  this segment's files (the brief's list) and every commit touching `src/` or `index.ts`, each mapped to its changeset;
  the diffs of the commits without one.
- Pass 2: the first review's scope F (brief, summary, F-1 to F-5), `report.md`'s ledger and sections for this area,
  `DECISIONS.md` #6, #7, #8, #23, #24, #33, #39, #48, #58, #70, the execution notes of plans F-1, F-2, F-5/H-8, G-4 and
  T14, `PLAN-release-gates-and-audit.md`'s items for the second review, the first `inventory.md` (§1, §6 [F], §7).

## Coverage

**Reviewed fully** (each with probes; `inventory-reconciled.md` has the depth per line):
- The export surface (40 exports) against the guide, `api/index.md` and *TypeScript*'s table; the six 3.0.2 exports and
  their markers; the member and option names of 3.0.1 against 3.0.2 (no new member or option).
- The declarations: unexported names reachable from public ones; the four parameter-only types; declaration emit of
  every public member (161, generated) under npm and pnpm, on TypeScript 5.0, 5.4, 5.9, 6.0.3 and 7.0.2; `@step`'s
  decorator forms in both decorator modes.
- Module systems and resolutions, `import` and `require` in one process on Node 20, 22, 24, deep imports, attw, the
  runner in CommonJS, ESM and `experimentalDecorators` projects (`consumer-check.sh` and the first review's legacy
  probe).
- The TypeScript floor: the harness's three type probes and the consumer fixture on 5.0 to 5.9 and 7.0.2, with and
  without `skipLibCheck`, by `@types/node` 20, 22 and 24; consumer compiler settings and older `lib`s.
- The build, `--clean`, the ESM entry, the bundle's runtime APIs (nothing newer than Node 16.9) and Playwright internals
  (none); `pack:version`.
- The changesets: bump (`changeset status`: `pomwright -> 3.0.2`, 50 at patch), first lines, changelog-github's
  rewrites, coverage of every consumer-facing commit, the type-level "before" claims of ten changesets against
  `pomwright@3.0.1`, the four announced compile breaks and their docs basis, migration hints, the rendered 3.0.2
  section's structure.
- The docs pages of the brief.

**Reviewed partly**:
- The changesets' runtime claims (messages, storage, navigation, `@step` behavior): read against the code's commits,
  not re-probed; they are the area segments' (2A to 2E), and the release-gates audit ran the error-message matcher
  over `.changeset/`.
- The peer range's top: CI's latest-1.x harness (chromium, 1.64.1) is green on `d850405`; not run locally.

**Not run**:
- `changeset version` and any publish (forbidden); the section was rendered from the same functions instead.
- A Yarn install (Yarn is named on *Installation*); `EBADENGINE` (`engines` unchanged since v3.0.1, decision 58);
  Node 26 (issue #55, known); the harness at the latest 1.x on firefox and webkit.

## Test gaps, most important first

1. The declaration emit check (`publicTypes.emit.ts`) returns 35 expressions; about a hundred public members are never
   emitted on their own (2F-2). Pass 1's generated emit found none failing today; nothing would catch a future one.
2. TypeScript 5.1 to 5.8 are compiled by nothing in CI (the loop is 5.0 with `skipLibCheck`, latest 5.x, latest 6.x,
   latest); 5.1 is the version where the `skipLibCheck` sentence is wrong (2F-1).
3. No check emits declarations under npm's layout (the harness is pnpm); the consumer job compiles with `--noEmit`.
4. Nothing checks that a changeset's migration hint covers every shape of code its change stops compiling (2F-4 was
   found by hand); the v3.0.1 docs' snippets against the new package (pass 1, exit 0) would catch documented code only.
5. A module importing only `pomwright` under pnpm (TS2883) stays unchecked by decision (#70).

## What is sound

- **Packed files**: the baseline tarball holds exactly `CHANGELOG.md`, `LICENSE`, `README.md`, `package.json` and the
  four `dist/` files, as `pomwright@3.0.0` and `3.0.1` on npm do; `pnpm pack` drops `packageManager` only
  (`tar -tzvf`; `npm pack --dry-run --json`).
- **Clean build**: a planted `dist/old-chunk.js` is gone after `pnpm build`, and `dist/` is byte-identical before and
  after (`run1/G-4/`).
- **Entries**: `import` gives the 7 names of the CommonJS build and no default export; `require` and `import` share one
  copy on Node 20.20.2, 22.18.0, 24.22.0; `pomwright/dist/index.mjs` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`;
  `pomwright/package.json` imports (`consumer-check.sh --node-floor`, `npmproj/shared.mjs`, `npmproj/esm-default.mjs`).
- **Resolutions and attw**: `consumer-check.sh` on Node 24, exit 0: node10, node16 and nodenext from CJS and ESM,
  bundler (esnext, preserve), each reading the right declarations; attw 0.18.5 "No problems found"; the runner in a
  CommonJS and a `"type": "module"` project (`consumer-check/node24.log`).
- **Legacy decorators in the runner**: the first review's `runner-legacy` project on the new tarball, 1 passed; the
  runner's Babel always transpiles decorators as `2023-05` (`playwright/lib/transform/babelBundle.js:72398`).
- **TypeScript 5.0 to 7.0.2**: `publicTypes.typecheck.ts`, `publicTypes.emit.ts` (with `--declaration`) and
  `stepLegacyDecorators.typecheck.ts` compile on 5.0 to 5.9 (5.0 and 5.1 with `skipLibCheck`) and 7.0.2, every
  `@ts-expect-error` used (`npmproj/pt-results.txt`); POMWright's declarations have no error on any 5.x without
  `skipLibCheck` (`floor/run.out`).
- **Consumer settings**: no declaration error under `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`,
  `noUnused*`, `isolatedModules`, nodenext, `lib` es2017 to es2021, or without the DOM lib (errors there are
  Playwright's only); `noImplicitOverride` asks `override` for `pageActionsToPerformAfterNavigation()` only (TS4114), as
  *Installation* says (`npmproj/flags/`).
- **Declaration emit**: 161 public members emit without annotations under npm (TS 5.0, 5.4, 5.9, 6.0.3, 7.0.2) and pnpm
  (6.0.3); under npm the declarations name `playwright/test` and `playwright-core`, under pnpm `@playwright/test`, and a
  module importing only `pomwright` fails with TS2883 under pnpm, all as *TypeScript* says (`emit/`, `pnpmproj/`).
- **Generic base class**: `LocatorSchemaPathArgument<Path>` compiles and keeps the subclass's path check; a plain union
  and a bare type parameter fail with TS2345, as the page says (`npmproj/generic-base.ts`).
- **Compatibility with 3.0.1 code**: v3.0.1's 209 doc snippets and v3.0.1's harness `tsc` compile against 3.0.2 (exit 0
  both); the four compile breaks the changesets announce reproduce and each rests on the v3.0.1 docs or doc comments
  with a migration in its changeset (`breaks/breaks.ts`; patch holds by `docs/versioning.md` *Bumps*).
- **Type-level changeset claims**: emit failures before (TS4023 ×4, TS4094 ×89; TS4023 for `step({ box: true })`),
  TS1241/TS1270 for bare legacy `@step`, TS1270 for generic `@step`, TS2589 from a 999-character path (998 compiles),
  reuse-by-path variables, template sub-paths, `undefined` first arguments: each fails on `pomwright@3.0.1` and compiles
  on the tarball (`before/run.out`).
- **Release version**: `pnpm exec changeset status --verbose`: `pomwright -> 3.0.2`, 50 changesets, patch; the docs'
  markers say v3.0.2.
- **Changelog format**: the 3.0.2 section rendered with the repository's `changelog-github` and `apply-release-plan`'s
  assembly is one `### Patch Changes` list of 50 entries, ``- [#60](…) [`sha`](…) - <first line>`` with the rest
  indented, no "Thanks" (`changelog/changelog-3.0.2.md`, `structure.mjs`); no changeset line is rewritten by
  `changelog-github`'s `pr:`, `commit:`, `author:`/`user:` or `#<number>` rules.
- **Changeset coverage**: every `src/` or `index.ts` commit since v3.0.1 that changes behavior or types has a changeset;
  those without one change doc comments, the guide, an implementation signature no caller sees (`d91fa33`), or
  performance (`61e266c`).
- **Trusted-publishing changeset**: `pomwright@3.0.0` and `3.0.1` have no attestation on npm today; `CHANGELOG.md:93`
  has the 3.0.0 promise it corrects.
- **Ranges**: Playwright 1.64.0 and 1.64.1 declare `engines.node >=20`; the README, *Installation*, *Packaging* and
  *Upgrading from 2.x* agree with the manifest; 2.1.0's peer floor was `>=1.57.0`, as *Upgrading* says.
- **`pack:version`**: `3.0.2-probe.1` packs the same 8 files with the version in the packed manifest only, leaves
  `dist/` unchanged, and installs and loads in an npm consumer (`packversion-consumer/`).

## Outside the segment

- **2H, *Upgrading from 2.x***: `pomwright@2.1.0` compiled a registry created without its paths
  (`createRegistryWithAccessors(page)` then `add("main")`, `F/npm210/noargs.ts`, exit 0; 2.1.0's docs wrote
  `createRegistryWithAccessors(page)` in their text), and 3.0.2 refuses it (`breaks/breaks.ts` case 1, TS2345 "needs its
  paths as a type argument"). The README calls the page "every change in 3.x a 2.x project meets"; the page does not
  name this one. Not probed further.
- **2G**: `publish.yaml` relies on `pnpm publish` recording provenance under Trusted Publishing; the changeset says
  releases are published with it. Not probed here.
- **Small, not filed**: `internal/packaging.md` *A build for testing before a release* uses `3.0.0-rc.1` as its example
  version, a version already released; harmless.

## The first review (pass 2)

`first-review.md` has the table. Outcomes: fixed 5 (F-1, F-2, F-3, F-4, G-4); fixed differently 2 (F-5, H-8);
still present, decided 1 (R-3); not fixed 0; fixed incompletely 0; regressed 0; cannot re-run 0. The changeset parts of
G-10 and of *Act before the next merge* item 2 hold as text; their behavior is 2A's, 2E's and 2G's. Of its *What is
sound* lines, all hold, with two narrowings: "5.0 needs `skipLibCheck`" (5.1 too, by `@types/node`: 2F-1) and the
emit check covering "every public member" (2F-2). Of its seven test gaps, four are closed, two partly (2F-1, 2F-2),
one open by decision (#70).

## What passes 3 and 4 changed

- Pass 3 added to the map what only the first review had (`LICENSE`, `EBADENGINE`, *Upgrading*'s *Requirements*, what
  `check-api-coverage.mjs` checks of the exports) and checked each; it confirmed no blind spot (F-1 to F-4 are fixed,
  so the blind pass met their fixed state) and classed the four blind findings: 2F-1, 2F-2, 2F-4 new since `54cdada`,
  2F-3 missed by the first review.
- Pass 4 probed what both maps left out: the member and option surface of 3.0.1 against 3.0.2 (no marker missing), the
  rendered changelog section, the `pack:version` tarball in a consumer, older consumer `lib`s, and 2.1.0's registry
  without paths (outside the segment). No new finding.

## Finding files

| ID | File | Kind | Severity | Semver | Pass | First review | One line |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2F-1 | `defect-2F-1-skiplibcheck-floor-sentence.md` | documentation | Low | none | 1 | new since `54cdada` (612a62a) | *Installation* says TypeScript 5.0 needs `skipLibCheck` for Playwright's declarations; it is 5.0 and 5.1, by `@types/node` version, for Node's declarations too |
| 2F-2 | `defect-2F-2-emit-check-not-every-member.md` | documentation | Low | none | 1 | new since `54cdada` (7f90436) | the declaration emit check is said to return every public member; it returns 35 expressions and about a hundred members are never emitted |
| 2F-3 | `defect-2F-3-migration-hint-rule-names-2x.md` | documentation | Low | none | 1 | missed by the first review | `docs/versioning.md` asks for a migration hint when code "a 2.x user wrote" stops working; in 3.x it is the previous 3.x release's code |
| 2F-4 | `defect-2F-4-schema-migration-misses-base-class.md` | documentation | Low | none | 1 | new since `54cdada` (e05b84d) | `schema-type-and-value`'s migration and its compile message do not cover a subclass of the forwarding base class *Organizing a project* shows first |
