# AGENTS.md

Persistent context and working rules for AI agents and humans contributing to POMWright. Read it fully before
changing anything. Repo-specific facts here override generic defaults. Last revised 2026-10-10, after the
session storage plan (analysis item 1.5) was executed.

## 1. What POMWright is

- A TypeScript companion library for `@playwright/test`, published to npm as `pomwright` under Apache-2.0. Peer
  range `@playwright/test >=1.61.0 <2.0.0` (1.61 added `page.sessionStorage`). Playwright is never a runtime dependency.
- Core idea: register one locator definition per dot-delimited path (`"main.form.submit"`) in a `LocatorRegistry`,
  and POMWright composes the full Playwright locator chain from the path. The registry, `PageObject`,
  `SessionStorage`, the `log` fixture and the `step` decorator are each usable on their own.
- The public API is exactly what the root [index.ts](index.ts) re-exports: `test` (fixture providing `log`),
  `PageObject` and its URL and storage typing helpers, `createRegistryWithAccessors` and the accessor types,
  `SessionStorage` with the `json` codec and the `Codec` and `SessionStorageSchema` types, `PlaywrightReportLogger`,
  `step`, `NavigationOptions`. Everything else under `src/` is internal even when it
  carries an `export` keyword, so renaming or deleting it is not by itself a breaking change.
- Published version: 2.1.0. The next release is 3.0.0, a major. Section 6 describes how that work is organised.

## 2. Repository map

| Path | What it is | Edit? |
| --- | --- | --- |
| `index.ts` | Package entry. tsup bundles from here. | yes |
| `src/` | Runtime: 16 files, about 3,300 lines of code, plus colocated vitest unit tests (`**/*.test.ts`: `locators/utils.test.ts`, `helpers/url.test.ts`, `helpers/navigation.test.ts`, `helpers/sessionStorage.test.ts`, `helpers/sessionStorageSeed.test.ts`). | yes |
| `src/locators/` | `locatorRegistry.ts` (registry, resolution, cycle detection), `locatorRegistrationBuilder.ts` (`add(path).getByRole(...)` DSL, seeded registrations), `locatorUpdateBuilder.ts` (`update` and `replace`), `locatorQueryBuilder.ts` (`getLocatorSchema(path)` chain: `filter`, `nth`, `remove`, `describe`, `getLocator`, `getNestedLocator`), `reusableLocatorBuilder.ts` (`createReusable`), `types.ts` (definitions and compile-time path validation), `utils.ts` (path validation, the id selector helpers `escapeCssString`, `escapeRegExpForSelector`, `buildIdSelector`, `assertIdValue`, `createLocator`, cloning, patching). | yes |
| `src/helpers/` | `url.ts` (`assertBaseUrl`, `assertUrlPath`, `resolveUrl`, `createUrlMatcher`, `composeFullUrl`), `navigation.ts` (`NavigationFor`, one `page.waitForURL` per wait), `sessionStorage.ts` (`SessionStorage`: `page.sessionStorage` with batches, step titles, origin checks and per-key codecs; `set`, `get`, `clear`, `seed`), `sessionStorageSeed.ts` (the seed registry, one per page: the writer and redirect documents, the proxy while a seed is pending, the bypass and never-applied failures), `playwrightReportLogger.ts`, `stepDecorator.ts`. | yes |
| `src/pageObject.ts`, `src/fixture/base.fixtures.ts` | Abstract `PageObject`; the `test` fixture that provides `log`. | yes |
| `src/dist/` | Stray local build output, gitignored. Never read it as source. | no |
| `test/` | Standalone pnpm project that installs the packed tarball and runs Playwright against it. Section 4. | yes |
| `docs/v3/` | Working documentation for 3.0.0, created 2026-10-06 as a verbatim copy of `docs/v2`. The `getById` deep dive in `locator-registry.md` is already rewritten for 3.0.0. Every doc edit goes here. | yes |
| `docs/v2/` | Frozen 2.x reference. | no |
| `docs/v1/`, `docs/v1-to-v2-migration/` | Archived. | no |
| `release-3.0.0/` | Working folder for the 3.0.0 release: analysis, numbered plans, release notes, decisions log. Section 6. | yes |
| `.changeset/` | Changesets config. `CHANGELOG.md` is generated from changesets at release time. | config only |
| `.github/workflows/` | `main.yaml` runs lint, unit tests and build on every push. `test.yaml` runs `pack-test` (chromium) on PRs and on `main`. `publish.yaml` runs the changesets action after `CI` succeeds on `main`. | yes |
| `pack-build.sh`, `pack-test.sh`, `playwright.base.ts` | Build and pack the tarball; run the harness; shared Playwright config. | yes |
| `vitest.config.ts` | Unit-test discovery limited to `src/**/*.test.ts`, node environment, so Playwright specs are never picked up; typecheck mode on, so `expectTypeOf` and `// @ts-expect-error` assertions are enforced. | yes |
| `tsconfig.vitest.json` | The tsconfig vitest's typecheck uses: extends the root, scoped to `src/`, target `es2024` (the root has no `include` and would sweep `dist/` and `test/`). | yes |
| `biome.json`, `tsconfig.json`, `.editorconfig` | Lint and format, strict TypeScript, tabs. | yes |
| `dist/`, `*.tgz`, `node_modules/`, `.pnpm-store/` | Build and install artefacts, gitignored. | no |

## 3. Toolchain and commands

- Node 24 and pnpm 9.12.0 (the `packageManager` field; CI uses the same). Use pnpm only.
- `pnpm install --frozen-lockfile`
- `pnpm lint` runs `biome check ./src` (lint plus format check). `pnpm format` rewrites. Root `index.ts`,
  `playwright.base.ts` and `test/` are not covered by the script even though `biome.json` includes them.
- `pnpm build` runs `tsup index.ts --format cjs,esm --dts` into `dist/`.
- `pnpm test:unit` runs the vitest unit tests for the pure helpers in seconds and type-checks the test files and
  what they import (vitest typecheck mode; `vitest` is pinned exactly because the mode is experimental). `pnpm test`
  runs them and then `pack-test`.
- `pnpm pack-test` is the authoritative integration run. It installs, builds, packs `pomwright-test-build.tgz`,
  installs that into `test/`, installs browsers and OS dependencies, and runs the Playwright `chromium` project.
  It takes minutes, and it needs sudo: `playwright install --with-deps` and the harness postinstall both call it,
  so without a terminal or passwordless sudo it fails at the `test/` install step.
- Non-interactive equivalent, once browsers are installed:

  ```sh
  ./pack-build.sh
  cd test
  pnpm add -D "pomwright@file:../pomwright-test-build.tgz" --ignore-scripts
  pnpm exec playwright test --project=chromium --reporter=line
  ```

  Use `pnpm add`, not `pnpm install`: a plain install does not refresh a `file:` tarball whose specifier is
  unchanged, so the harness silently keeps testing the previous build. Check with
  `grep -c <new symbol> test/node_modules/pomwright/dist/index.js` when in doubt. Use the line reporter, because
  the configured html reporter opens on failure and blocks. Append `tests/<spec>` to run one file.
- There is no `tsc` step yet; analysis section 4 covers adding one.
- Verify runtime claims empirically before writing them into a plan or doc. `@playwright/test` 1.62.1 is installed
  under `test/node_modules`; a short Node script that launches chromium from there is the standard probe. Every
  claim in the analysis was verified that way. Keep that standard. Two pitfalls: the helper methods are wrapped in
  `test.step` and cannot be driven outside the Playwright runner, so runner behaviour (listener errors, `test.info()`
  in teardown) is probed with a temporary spec in `test/tests/` that is deleted after the run; a script that imports
  `dist/index.mjs` must load chromium from the root package (`createRequire` of `./package.json`), otherwise
  Playwright throws "Requiring @playwright/test second time".

## 4. Test harness (`test/`)

- Own `package.json`, lockfile and `tsconfig.json` (path aliases `@page-object-models/*`, `@fixtures/*`,
  `@test-data/*`). Depends on `pomwright` as `file:../pomwright-test-build.tgz`. Playwright is pinned to 1.62.1.
- `server.js` is an express app on port 9000. It serves `test-data/staticPage` (a W3 template page) and the routes
  `/testpath`, `/testpath/:color`, `/testfilters`, `/iframe` (with `/iframe/a`, `/b`, `/c`), `/testids` (ids
  that are valid HTML but awkward as CSS selectors), `/testnav` (with `/testnav/item/:id` and `/testnav/bounce`,
  the navigation fixture: query, hash, trailing slash, delayed and bouncing navigations), and `/teststorage` (GET and
  POST, with `/teststorage/frame`, `/redirect`, `/chain`, `/login`, `/login307`, `/api`, `/sw.js` and
  `/sw-passthrough.js`: the session storage fixture, whose first script snapshots `sessionStorage`; hops to the
  second origin `http://127.0.0.1:9000`, the same server, by every kind of navigation; iframes, COOP and COEP flags,
  and two service workers). New fixture pages go in as new routes, not into the static page.
- Page objects live under `page-object-models/testApp/pages/<name>/` as `<name>.locatorSchema.ts` plus
  `<name>.page.ts`, all extending `testApp.base.ts` (which carries a storage schema through its options type);
  `teststorage/` also has `teststorage-second.page.ts`, a `PageObject` on the second origin. `fixtures/testApp.fixtures.ts`
  exposes them to specs.
- Specs live under `tests/`: `locatorRegistry/` (`add`, `getLocator`, `getLocatorSchema`, `getNestedLocator`,
  `registry`, `validation`), `pageObject/` (construction-time URL validation), `step/`, `testApp/`. 42 spec files,
  about 4,900 lines. One spec file per DSL method,
  for example `add.getById.spec.ts` or `getLocatorSchema.update.spec.ts`; one DOM-level spec per fixture page under
  `testApp/`, for example `testIds.spec.ts`.
- Know what each spec exercises. Most `locatorRegistry/` specs import `LocatorRegistryInternal` from
  `../../../../src/locators`, so they run against source. Fixture-based specs and anything importing from
  `pomwright` (the page objects, `testApp/`, `remove`, `replace`, `registry.binding`) run against the packed
  tarball. A green source-level spec says nothing about a stale tarball install.
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
  Validate DSL input at the boundary, before anything is registered; `assertIdValue` is the pattern.
- `getById` stores values verbatim: strings resolve as `[id="…"]` (exact, case-sensitive, no prefix handling),
  RegExps as `internal:attr=[id=/source/flags]` with every flag passed through. POMWright adds no regex semantics of
  its own.
- Session storage mirrors `page.sessionStorage`: values are strings stored verbatim unless a codec is declared for the
  key (`json<T>()`, `Codec<T>`), `get` returns `null` for a missing key, a literal `[]` does not compile, and a helper
  with an origin touches only that origin. `seed` never navigates itself: it registers one route and two listeners on
  the page only while a seed is pending and removes them once the writer document has committed and issued its
  replace; a bypassed, unsupported or never-applied seed fails the test with the `seed` call site in the stack. Never
  reintroduce `addInitScript`, JSON-encoding every value, or a write from a `framenavigated` listener.
- URLs mirror Playwright's `baseURL` handling with one base per page object: a string `baseUrl` is a non-empty
  origin and a string `urlPath` is `""` or a single-slash path, both validated at construction; two strings resolve
  with `new URL`; a RegExp in either part makes `fullUrl` a `UrlMatcher` (base against the origin, path against the
  rest, each regex as written). `goto()` without a target is the this-page navigation; `expectThisPage` and
  `expectAnotherPage` are one `page.waitForURL` each. POMWright sets no timeout or `waitUntil` default of its own.
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
| `PLAN-<items>-<slug>.md` | One plan per analysis item or tightly coupled pair, numbered after the items it covers. `PLAN-1.1-1.2-GETBYID.md` (executed 2026-10-06), `PLAN-1.3-1.4-URL-NAVIGATION.md` (executed 2026-10-08) and
  `PLAN-1.5-SESSION-STORAGE.md` (executed 2026-10-10) are done, one commit per execution step each. The remaining
  plans, their scope, and their order are in `PLANS.md`; the next one is `PLAN-1.6-1.8-REGISTRATION-AND-FRAMES.md`. |
| `PLANS.md` | The ordered list of remaining plans with the analysis items each covers and its status. Updated when a plan is written, split, or executed. |
| `RELEASE-NOTES-3.0.0.md` | Consumer-facing notes. Only what is done or committed to by a plan in this folder, each item with a status marker. Never a copy of the analysis. |
| `DECISIONS.md` | Current decisions across all plans, big and small, with date and reason. A reversed decision is replaced, not kept; git history has the rest. Open questions at the bottom. |

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
8. **Commits only when asked.** Never commit on your own. When the user asks for one commit per execution step,
   commit exactly those steps, name the plan and step in the message, and leave everything else uncommitted.

## 7. Versioning and release mechanics

- Changesets: `pnpm changeset` creates `.changeset/<name>.md`. The `publish.yaml` workflow opens a "Version
  Packages" PR and publishes when it merges. Do not edit `package.json#version` or `CHANGELOG.md` by hand.
- Call out consumer-facing API or behaviour changes in the changeset body, with a migration hint whenever something
  a 2.x user wrote stops working.
- `publish.yaml` is gated on the `CI` workflow (lint, unit tests, build) only, not on `test.yaml`. Analysis
  section 4 covers fixing that.
- Pending 3.0.0 changesets so far: `.changeset/getbyid-verbatim-ids-and-regex.md`,
  `.changeset/url-composition-and-navigation.md` and `.changeset/session-storage-on-webstorage.md` (all `major`).

## 8. Do not

- Edit `docs/v2`, `docs/v1*`, `CHANGELOG.md`, or `package.json#version`.
- Commit `dist/`, `src/dist/`, `*.tgz`, `test/node_modules`, or Playwright reports.
- Change the Playwright peer range or the `test/` pin without a decision.
- Treat `src/dist/index.d.ts` or `dist/` as source when counting, grepping, or reasoning about behaviour.
- Reintroduce behaviour listed as removed in `RELEASE-NOTES-3.0.0.md`, such as `#` and `id=` prefix handling in
  `getById`, JSON-encoding every session storage value, or `setOnNextNavigation`.
- Re-derive findings that are already in the analysis. Cite the item number instead.
- Commit without being asked.
- Expect `pnpm install` in `test/` to pick up a freshly packed tarball; use `pnpm add` as shown in section 3.
