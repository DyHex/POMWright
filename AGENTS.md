# AGENTS.md

Persistent context and working rules for AI agents and humans contributing to POMWright. Read it fully before
changing anything. Repo-specific facts here override generic defaults. Last revised 2026-10-06.

## 1. What POMWright is

- A TypeScript companion library for `@playwright/test`, published to npm as `pomwright` under Apache-2.0. Peer
  range `@playwright/test >=1.57.0 <2.0.0`. Playwright is never a runtime dependency.
- Core idea: register one locator definition per dot-delimited path (`"main.form.submit"`) in a `LocatorRegistry`,
  and POMWright composes the full Playwright locator chain from the path. The registry, `PageObject`,
  `SessionStorage`, the `log` fixture and the `step` decorator are each usable on their own.
- The public API is exactly what the root [index.ts](index.ts) re-exports: `test` (fixture providing `log`),
  `PageObject` and its URL typing helpers, `createRegistryWithAccessors` and the accessor types, `SessionStorage`,
  `PlaywrightReportLogger`, `step`, `NavigationOptions`. Everything else under `src/` is internal even when it
  carries an `export` keyword, so renaming or deleting it is not by itself a breaking change.
- Published version: 2.1.0. The next release is 3.0.0, a major. Section 6 describes how that work is organised.

## 2. Repository map

| Path | What it is | Edit? |
| --- | --- | --- |
| `index.ts` | Package entry. tsup bundles from here. | yes |
| `src/` | Runtime: 14 files, about 2,850 lines of code. | yes |
| `src/locators/` | `locatorRegistry.ts` (registry, resolution, cycle detection), `locatorRegistrationBuilder.ts` (`add(path).getByRole(...)` DSL, seeded registrations), `locatorUpdateBuilder.ts` (`update` and `replace`), `locatorQueryBuilder.ts` (`getLocatorSchema(path)` chain: `filter`, `nth`, `remove`, `describe`, `getLocator`, `getNestedLocator`), `reusableLocatorBuilder.ts` (`createReusable`), `types.ts` (definitions and compile-time path validation), `utils.ts` (path validation, `createLocator`, cloning, patching). | yes |
| `src/helpers/` | `sessionStorage.ts`, `navigation.ts`, `playwrightReportLogger.ts`, `stepDecorator.ts`. | yes |
| `src/pageObject.ts`, `src/fixture/base.fixtures.ts` | Abstract `PageObject`; the `test` fixture that provides `log`. | yes |
| `src/dist/` | Stray local build output, gitignored. Never read it as source. | no |
| `test/` | Standalone pnpm project that installs the packed tarball and runs Playwright against it. Section 4. | yes |
| `docs/v3/` | Working documentation for 3.0.0. Created as a verbatim copy of `docs/v2` by the first 3.0.0 plan that touches docs (plan 1.1-1.2). If it does not exist yet, that copy is the first docs step. | yes |
| `docs/v2/` | Frozen 2.x reference. | no |
| `docs/v1/`, `docs/v1-to-v2-migration/` | Archived. | no |
| `release-3.0.0/` | Working folder for the 3.0.0 release: analysis, numbered plans, release notes, decisions log. Section 6. | yes |
| `.changeset/` | Changesets config. `CHANGELOG.md` is generated from changesets at release time. | config only |
| `.github/workflows/` | `main.yaml` runs lint and build on every push. `test.yaml` runs `pack-test` (chromium) on PRs and on `main`. `publish.yaml` runs the changesets action after `CI` succeeds on `main`. | yes |
| `pack-build.sh`, `pack-test.sh`, `playwright.base.ts` | Build and pack the tarball; run the harness; shared Playwright config. | yes |
| `biome.json`, `tsconfig.json`, `.editorconfig` | Lint and format, strict TypeScript, tabs. | yes |
| `dist/`, `*.tgz`, `node_modules/`, `.pnpm-store/` | Build and install artefacts, gitignored. | no |

## 3. Toolchain and commands

- Node 24 and pnpm 9.12.0 (the `packageManager` field; CI uses the same). Use pnpm only.
- `pnpm install --frozen-lockfile`
- `pnpm lint` runs `biome check ./src` (lint plus format check). `pnpm format` rewrites. Root `index.ts`,
  `playwright.base.ts` and `test/` are not covered by the script even though `biome.json` includes them.
- `pnpm build` runs `tsup index.ts --format cjs,esm --dts` into `dist/`.
- `pnpm pack-test` is the authoritative test run. It installs, builds, packs `pomwright-test-build.tgz`, installs
  that into `test/`, installs browsers, and runs the Playwright `chromium` project. It takes minutes.
- To re-run one spec after a full `pack-test`: `cd test && pnpm playwright test tests/<spec> --project=chromium`.
  The harness tests the tarball, not `src/`. After changing `src/`, run `pnpm pack-test` again, or
  `./pack-build.sh` followed by `pnpm install --no-frozen-lockfile` inside `test/`.
- There is no unit-test layer and no `tsc` step yet. Both are planned for 3.0.0.
- Verify runtime claims empirically before writing them into a plan or doc. `@playwright/test` 1.62.1 is installed
  under `test/node_modules`; a short Node script that launches chromium from there is the standard probe. Every
  claim in the analysis was verified that way. Keep that standard.

## 4. Test harness (`test/`)

- Own `package.json`, lockfile and `tsconfig.json` (path aliases `@page-object-models/*`, `@fixtures/*`,
  `@test-data/*`). Depends on `pomwright` as `file:../pomwright-test-build.tgz`. Playwright is pinned to 1.62.1.
- `server.js` is an express app on port 9000. It serves `test-data/staticPage` (a W3 template page) and the routes
  `/testpath`, `/testpath/:color`, `/testfilters`, `/iframe`. New fixture pages go in as new routes, not into the
  static page.
- Page objects live under `page-object-models/testApp/pages/<name>/` as `<name>.locatorSchema.ts` plus
  `<name>.page.ts`, all extending `testApp.base.ts`. `fixtures/testApp.fixtures.ts` exposes them to specs.
- Specs live under `tests/`: `locatorRegistry/` (`add`, `getLocator`, `getLocatorSchema`, `getNestedLocator`,
  `registry`, `validation`), `step/`, `testApp/`. About 3,900 lines. One spec file per DSL method, for example
  `add.getById.spec.ts` or `getLocatorSchema.update.spec.ts`.
- `validation.locatorSchemaPath.typecheck.ts` is a compile-only probe that nothing runs today: there is no `tsc`
  in CI and Playwright does not match the file name.
- When changing locator behaviour: add focused specs next to the existing ones, keep the existing coverage (add,
  do not replace), and assert against real DOM where possible rather than only against `toString()`.

## 5. Coding conventions

- Tabs, width 2, line width 120 (biome). TypeScript strict with `noUncheckedIndexedAccess`. `verbatimModuleSyntax`
  is on, so types are imported with `import type`.
- Preserve the fluent registry API and its semantics: `add(path).getByRole(...)`, seeded registrations,
  `getLocatorSchema(path)` followed by `update()`, `replace()`, `filter()`, `nth()`, `remove()`, `describe()`,
  `getLocator()`, `getNestedLocator()`; `createReusable`; clone-on-read; cycle detection; terminal-only `has:`
  path references. Builders are synchronous. There are no thenables anywhere in `src`; do not add any.
- Keep the dot-delimited path guarantees. The runtime `validateLocatorSchemaPath` and the type-level
  `LocatorSchemaPathFormat` family in `types.ts` must stay in agreement.
- Error messages name the registry path (`formatLocatorSchemaPathForError`) and the DSL method the user called.
- Descriptive path names in docs and tests. No anonymous segments.
- `// biome-ignore` only with a one-line justification. No `try/catch` around imports.
- Prefer behaviour-preserving refactors. A contract change (anything a documented 2.x behaviour relies on) goes
  through a plan and the decisions log, never in silently.
- No new runtime dependencies. A new dev dependency needs a line in `release-3.0.0/DECISIONS.md`.

## 6. The 3.0.0 workflow

Everything for the release lives in [release-3.0.0/](release-3.0.0/). The folder is temporary. At release the notes
become the basis for the changelog entry and announcement, and `docs/v3` becomes the source for the new docs site.

| File | Role |
| --- | --- |
| `POMWRIGHT-2.1.0-ANALYSIS.md` | Source-verified findings numbered 1.1 to 1.10, 2, 3.1 to 3.8, 4, 5. Each has `Fix / Skip / Discuss` boxes and a `Notes:` block. Section 6 is the working order. |
| `PLAN-<items>-<slug>.md` | One plan per analysis item or tightly coupled pair, numbered after the items it covers. `PLAN-1.1-1.2-GETBYID.md` is the first; the next would be `PLAN-1.3-COMPOSEFULLURL.md`. |
| `RELEASE-NOTES-3.0.0.md` | Consumer-facing notes. Only what is done or committed to by a plan in this folder, each item with a status marker. Never a copy of the analysis. |
| `DECISIONS.md` | Every decision, big and small, across all plans, with date and reason. Open questions at the bottom. |

Rules:

1. **Plan first, one item at a time.** Before touching code for an analysis item, write the plan file and stop for
   review. Execute only after explicit confirmation, and only the ticked decisions. The existing plan shows the
   expected shape: intended contract, verified current behaviour with line references, options with a
   recommendation, implementation steps, tests, docs, changeset, versioning, decisions checklist, execution order.
2. **Verified claims only.** Every runtime or type claim in a plan is backed by a probe or a test run and cites the
   exact file and line.
3. **Keep the three ledgers current.** When a plan is agreed: add its decisions to `DECISIONS.md` and its
   consumer-facing items to `RELEASE-NOTES-3.0.0.md` as *planned*. When it is executed: tick `Fix` or `Skip` with
   notes in the analysis, flip the release-note items to *done*, and append any execution-time decisions.
4. **Docs go to `docs/v3` only.** `docs/v2` is frozen. README and CHANGELOG keep linking to v2 until release.
5. **Links inside `release-3.0.0/` are relative to that folder**, for example `../src/locators/utils.ts#L64`, so
   they stay clickable in VS Code.
6. **3.0.0 is one major.** Breaking changes from any plan ride it; there are no intermediate 2.x releases from this
   work. Each consumer-facing change still gets its own changeset (`major` for breaking, `minor` or `patch`
   otherwise); changesets collapse them into the single 3.0.0 entry.
7. **The docs site is release work.** A Starlight site on GitHub Pages, built from `docs/v3`, ships with 3.0.0. Do
   not fold Starlight setup, Pages workflows or README repointing into feature plans.

## 7. Versioning and release mechanics

- Changesets: `pnpm changeset` creates `.changeset/<name>.md`. The `publish.yaml` workflow opens a "Version
  Packages" PR and publishes when it merges. Do not edit `package.json#version` or `CHANGELOG.md` by hand.
- Call out consumer-facing API or behaviour changes in the changeset body, with a migration hint whenever something
  a 2.x user wrote stops working.
- `publish.yaml` is gated on the `CI` workflow (lint plus build) only, not on `test.yaml`. Analysis item 4 covers
  fixing that.

## 8. Do not

- Edit `docs/v2`, `docs/v1*`, `CHANGELOG.md`, or `package.json#version`.
- Commit `dist/`, `src/dist/`, `*.tgz`, `test/node_modules`, or Playwright reports.
- Change the Playwright peer range or the `test/` pin without a decision.
- Treat `src/dist/index.d.ts` or `dist/` as source when counting, grepping, or reasoning about behaviour.
- Reintroduce behaviour listed as removed in `RELEASE-NOTES-3.0.0.md`, such as `#` and `id=` prefix handling in
  `getById`.
- Re-derive findings that are already in the analysis. Cite the item number instead.
