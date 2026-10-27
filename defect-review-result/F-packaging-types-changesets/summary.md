# Scope F: Packaging, public types and changesets — summary

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file, and of its five finding files, was refused by a harness rule ("Subagents should return findings as text, not write report files").

- **Reviewed**: `54cdada` (`fix/review-3-0-2`) in the worktree `/home/magdys/workspace/dyhex/POMWright-final-review`, 2026-10-23, 12:00 to 12:40 (+02:00), by Claude (Opus 5.5).
- **Probes and notes**: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/F/`.
- **Status**: done. 2 defects, 2 documentation, 0 suspected, 1 design question.
- **Tooling note**: the Write tool refused this file and the finding files (report files from a subagent), so their text went to the caller in the final message, as the instructions say.

## What I read

- Setup: scopes.md, inventory.md, baseline.md, brief.md.
- AGENTS.md at `54cdada`. It is identical to the user's checkout except the `skills/` row of §2.
- Code and manifests: `index.ts`, `package.json`, `tsconfig.json`, `scripts/write-esm-entry.mjs`, `scripts/pack-version.sh`, `pack-build.sh`, `pack-extract.sh`, `pack-test.sh`, `LICENSE` (start) and the published README.
- Changesets: `.changeset/config.json` and the 29 pending changesets.
- Build output: `dist/` and the packed tarball.
- Harness: `test/tests/packaging/*` and `test/tsconfig.declarations.json`.
- Docs: the opening of `scripts/check-api-coverage.mjs`, `docs/installation.md`, `docs/typescript.md`, `internal/packaging.md`, `api/index.md`, `api/types.md` (outline), *Requirements* of `docs/upgrading-from-2x.md`, `docs/locator-modules.md#what-a-module-may-return`, and the fixture examples in `docs/page-objects-in-tests.md` and `api/fixtures.md`.
- History: the commits since `v3.0.1` with their changesets and diffs, and the published `pomwright@3.0.1` tarball from npm.

## Decisions taken without asking

1. **Changeset count.** There are 29 pending changesets, not 31. The 31 in the brief and inventory counts the directory's entries, which include `config.json` and `README.md`. 30 `fix:` commits since v3.0.1; 29 add one changeset each. The 30th, `d91fa33`, changes only `step`'s implementation signature, which is not emitted, so the declarations are unchanged and it needs none. `61e266c` (perf, behaviour unchanged) needs none either.
2. **Latest-1.x harness.** I ran it in the worktree, as the brief says. Afterwards I restored `package.json`, `pnpm-lock.yaml`, `test/package.json` and `test/pnpm-lock.yaml` with `git checkout`, then ran `pnpm install --frozen-lockfile` and `pnpm harness:install`. The rebuilt `dist` is byte-identical to a fresh build of 54cdada.
3. **Throwaway clone.** The dry `changeset status`, `changeset version` and `pack:version` ran in a clone in the probes folder, removed at the end. `changeset version` needs GitHub's API, and `gh` is logged out, so I stubbed `@changesets/get-github-info` with a preload (`stub-github-info.cjs`, PR number `#53` assumed). The format around the links is changelog-github's own code.
4. **The TS2883 note from an earlier scope.** I put it under documentation (F-3), not packaging. The reasons:
   - It is TypeScript's portability check meeting pnpm's strict layout. Any import from `@playwright/test` in the module removes it (probe `e/`).
   - Under npm the emit succeeds but writes `import("playwright-core")`.
   - POMWright's share is the inlined, unexported definition types behind `seed.definition`. For `test.extend`, the types that can't be named are Playwright's own.
5. **F-5 is a design question, not a defect.** The patch was decided and recorded in the commit message, and whether option types count is a judgment for the maintainer.
6. **The `dist` cleaning issue is not a finding.** tsup runs without `--clean`, so `pack-build.sh` and `pack:version` pack stale files left in `dist/`. Publishing runs on a fresh CI checkout, so the published package is not reached. It is listed under outside the scope.

## Inventory lines reviewed

**Fully:**
- §1, the export surface: 38 exports, 7 runtime names, every type-only export an alias or interface.
- §6, the F items: declaration emit, importable return types, aliases.
- §7 in full:
  - the packed file list;
  - Node 20, 22 and 24 one-copy loading;
  - TypeScript `node10`, `node16`, `nodenext` and `bundler`;
  - attw;
  - the runner in CommonJS and `"type": "module"` projects, plus `experimentalDecorators`;
  - the peer range at 1.64.1;
  - the 29 changesets: bump, first line, text, coverage, format;
  - `.changeset/config.json`;
  - `pnpm pack:version`.
- The pages in the brief.

**Partly:**
- installation.md's sentence "paths, the first argument of every locator method, URLs and session storage values are checked at runtime as the types check them": only spot-checked. Its probes belong to scopes B, D and A.
- The changesets' quoted messages: checked at runtime only for the registry and URL ones (ended registration in both forms, builder after skip, urlPath host, `baseUrl` with `?`, origins without a URL origin). The session storage and `@step` messages were checked against the source templates and doc comments only; their runtime checks belong to scopes A and E.

**Not run:**
- npm's `EBADENGINE` check: `engines` is unchanged since v3.0.1 (`git diff v3.0.1..54cdada -- package.json`).
- The harness at 1.64.1 on Firefox and WebKit (chromium only, per the brief's budget).
- The harness on Node 22.
- The GitHub workflows (scope G).

## Test gaps, most important first

1. No emit probe exports a preconfigured `@step` decorator. `publicTypes.emit.ts` uses `@step()` only inline, which is why F-1 went unseen.
2. No emit probe covers a module that imports only from `pomwright` under pnpm. `publicTypes.emit.ts` imports `type Page` from `@playwright/test`, which hides the TS2883 class of failure (F-3).
3. No check that every public function's or method's return type is exported. `check-api-coverage.mjs` checks documentation only; the walk I did (`surface.mjs`) could be a check.
4. `createRegistryWithAccessors()`'s whole result and `registry.createReusable` are not emitted anywhere. The emit probe's comment accepts the first as not emitting.
5. The §7 packaging probes are manual. CI runs only `esmEntry.spec.mts` and the CommonJS harness: no `"type": "module"` runner project, no TypeScript resolution matrix, no attw.
6. Consumers' TypeScript versions are not checked. 7.0.2 is npm's `latest` today and 5.x is common; I checked 5.0 to 7.0 once.
7. Nothing asserts the packed file list automatically (see outside the scope, `dist` cleaning).

## What is sound

Each line names the path probed; the evidence is in the probes folder.

**Packaging and runtimes:**
- **Packed file list.** The tarball has exactly CHANGELOG.md, LICENSE, README.md, package.json and `dist/index.{js,mjs,d.ts,d.mts}`. Checked with `tar -tzvf pomwright-test-build.tgz` and `npm pack --dry-run --json` (`npmpack/`); `pnpm pack` drops only `packageManager`.
- **One copy across `import` and `require`** on Node 20.20.2, 22.18.0 and 24.22.0 (`consumer-cjs/shared.mjs`, `shared.cjs`; `node-shared.log`):
  - `import` resolves `dist/index.mjs`, `require` resolves `dist/index.js`, and both see the same 7 names;
  - `PageObject`, `SessionStorage`, `test` and `json` are the same objects either way;
  - `pomwright/dist/index.js` and `index.mjs` fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`, and `pomwright/package.json` resolves.
- **TypeScript resolutions.** A consumer compiles with real types under `node10`, `node16` (CommonJS and ESM), `nodenext` (CommonJS and ESM), and `bundler` with `esnext` and `preserve`. A `// @ts-expect-error` on a wrong path is enforced each time, and `--listFiles` shows `index.d.ts`, or `index.d.mts` from ESM (`consumer-cjs/ts/`).
- **attw 0.18.5**: "No problems found"; node10, node16 from CJS and ESM, and bundler all green (`attw.log`).
- **Playwright's runner**, all exit 0 (`runner-*`, `runner.log`):
  - a CommonJS project and a `"type": "module"` project, including `require` and `import` sharing one copy in the ESM project, on Node 24 and Node 20;
  - an `experimentalDecorators` project, where bare and titled `@step` run and are reported as steps.
- **Peer range at the top.** `PLAYWRIGHT_VERSION=1.64.1 bash pack-test.sh --project=chromium --reporter=line` exits 0 (`harness-1.64.1.log`):
  - `tsc` over `test/`, the declaration emit and legacy decorators pass;
  - doc snippets: 215 checked; API coverage: 0 problems;
  - 503 passed; step locations: 4 passed.
- **TypeScript 5.0.4 to 7.0.2** (`ts-versions/`):
  - the consumer compiles on every version; 5.0 needs `skipLibCheck`, because of errors in Playwright's and @types/node's declarations, none in POMWright's;
  - bare, called, titled and static `@step`, and the rejected sync method, behave the same under both decorator modes on every version;
  - the declarations need no DOM lib and no Node types beyond Playwright's;
  - they compile with `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns` and `noImplicitOverride` with `skipLibCheck false`.

**Export surface and declarations:**
- **Exports.** The 38 exports match AGENTS §1 and `api/index.md`. Every type-only export is a type alias, or an interface (`UrlMatcher`); no class is re-exported as a type; no public builder step returns `this`.
- **Public results.**
  - Every other public method's result emits without an annotation in a module that imports `@playwright/test` (`emit-pnpm/i/returns.ts`): query and update builders, seeds, the page object's properties, navigation, storage, logger and `test.extend`.
  - With exported names, annotations emit for the cases in F-2 and F-3 (`emit-pnpm/j/annotated.ts`).
- **Declarations against 3.0.1.** Every change since the published 3.0.1 is covered by a changeset (comments stripped, `dts.diff`):
  - `Decoded` and `KeyOnly`: storage-string-key-types;
  - the legacy `step` overloads: legacy-bare-step;
  - `Primary | undefined`: undefined-first-argument;
  - the four new exports: export-storage-types;
  - `RegistrationEnd`: internal.
- **storage-string-key-types** is accurate. Against the published 3.0.1, `set` and `seed` of a declared key with a raw string were already rejected; only `get(stringKey)` narrows, and its migration hint is right (`types-301/` and `types-head/`).
- **exports-default-condition** is accurate. The root map ends with `default`, matching `@playwright/test`'s map (types, import, require, default).

**Changesets:**
- Every changeset starts with a sentence.
- No line matches changelog-github's `pr:`, `commit:` or `user:` rewrites, or the `#N` issue linking.
- `changeset status --verbose`: 29 at patch, so pomwright 3.0.2; no minor, no major.
- A dry `changeset version` writes `- [#PR](…) [`sha`](…) - <first line>` with the further lines indented and no "Thanks", as §7 describes (`changelog-3.0.2.md`).
- The pages the changesets name were updated: *Filters and indices* has "A path, a locator or a chain", and *Session storage* says "nothing checks that both are there".
- The registry and URL messages quoted in the changesets match at runtime (`changeset-messages.cjs`).

**README and docs:**
- **README.** Both examples and the "parts on their own" snippets compile against the tarball (`consumer-cjs/readme/`). "@playwright/test 1.64 or later (below 2) and Node 20 or later" matches the manifest.
- **installation.md** holds for:
  - requirements;
  - the deep-import error and the one-copy promise;
  - TypeScript 6 and 7 needing `"types": ["node"]` (TS 5.9 does not; TS 6 and 7 fail with TS2591 without it, with `skipLibCheck false`);
  - TS4114 for `pageActionsToPerformAfterNavigation()` under `noImplicitOverride`, and none for `defineLocators()`;
  - decorators in both modes in the editor and the runner.
- **typescript.md.** A path parameter typed `LocatorSchemaPathArgument<Path>` compiles; a plain union does not; a misspelt path fails at the subclass's call (`consumer-cjs/ts/generic.ts`).
- **packaging.md** layout, exports, `engines` and `files` claims hold.
- **upgrading-from-2x.md, *Requirements*.** "raised from `>=1.57.0`" matches v2.1.0's manifest.
- **`pnpm pack:version 3.0.2-rc.1`** packs the same 8 files with the version only in the packed manifest. Run in the throwaway clone.

## Outside the scope (for the consolidation)

- **G: `dist` is not cleaned.**
  - `pnpm build` runs tsup without `--clean`, so a stale file in `dist/` survives the build and is packed by `pack-build.sh` and `pack:version`. Shown with `sketch/`: `echo stale > dist/old-chunk.js && pnpm build && npm pack --dry-run` lists `dist/old-chunk.js` and `dist/index.js.map`.
  - Not reached when publishing, which runs on a fresh CI checkout. It does contradict packaging.md's "builds and packs the package as npm would publish it" on a machine with leftovers. 2.x wrote the same file names, so switching branches leaves none.
- **A and D, a cross-scope style difference (not a finding).** The page object's `baseUrl` message ends with a period. `SessionStorage`'s origin message ends without one, with or without the ", whose scheme has no URL origin" reason (`origin-message.cjs`).

## Finding files

| ID | File | Kind | Severity | Semver | One line |
| --- | --- | --- | --- | --- | --- |
| F-1 | defect-F-1-step-factory-type-not-exported.md | defect | Low | patch | `step(title/options)` returns the unexported `StepDecoratorFactory`; an exported preconfigured decorator fails `declaration: true` (TS4023) and cannot be annotated |
| F-2 | defect-F-2-registry-values-do-not-emit.md | defect | Low | patch | `createRegistryWithAccessors()`'s result, its `add`, and `registry.createReusable` cannot be emitted (TS4023, TS4094), against the docs' "except in one pattern" |
| F-3 | defect-F-3-declaration-true-docs-pnpm.md | documentation | Low | none | the `declaration: true` paragraphs omit the pnpm TS2883 case (a module importing only `pomwright`: `test.extend`, `seed.definition`) and the cases of F-1 and F-2 |
| F-4 | defect-F-4-typescript-page-type-table.md | documentation | Low | none | the TypeScript page's table of exported types lacks the four session storage types 3.0.2 exports; Packaging says two compile-only files, there are three |
| F-5 | defect-F-5-storage-option-types-bump.md | design question | — | (release: patch or minor) | exporting `SeedOptions` and `SessionStorageOptions` is a minor by §7 unless §5's promise covers parameter types |
