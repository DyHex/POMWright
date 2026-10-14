# AGENTS.md

Persistent context and working rules for AI agents and humans contributing to POMWright. Read it fully before
changing anything. Repo-specific facts here override generic defaults. Last revised 2026-10-14, after the
packaging, tooling and CI plan (analysis section 4) was executed.

## 1. What POMWright is

- A TypeScript companion library for `@playwright/test`, published to npm as `pomwright` under Apache-2.0. Peer
  range `@playwright/test >=1.64.0 <2.0.0` (1.61 added `page.sessionStorage`, 1.63 the any-frame `frameLocator()`,
  1.64 the per-element regex reset that makes every RegExp flag deterministic). Playwright is never a runtime
  dependency. Node 20 or later (`engines`), Playwright's own floor; re-read it from Playwright's `engines` whenever
  the peer floor moves.
- Packaging mirrors `@playwright/test`: one CommonJS build (`dist/index.js`, `dist/index.d.ts`) behind an `exports`
  map; `dist/index.mjs` and `dist/index.d.mts` are written by `scripts/write-esm-entry.mjs` and re-export that build
  by name, so `import` and `require` share one copy. Only the root and `pomwright/package.json` are importable.
- Core idea: register one locator definition per dot-delimited path (`"main.form.submit"`) in a `LocatorRegistry`,
  and POMWright composes the full Playwright locator chain from the path. The registry, `PageObject`,
  `SessionStorage`, the `log` fixture and the `step` decorator are each usable on their own.
- The public API is exactly what the root [index.ts](index.ts) re-exports: `test` (fixture providing `log`),
  `PageObject` and its URL and storage typing helpers, `createRegistryWithAccessors`, the accessor types and the
  `LocatorRegistry` type (`add`, `createReusable`, `getLocator`, `getLocatorSchema`, `getNestedLocator`, `verify`),
  `SessionStorage` with the `json` codec and the `Codec` and `SessionStorageSchema` types, `PlaywrightReportLogger`,
  `step`, `NavigationOptions`. Everything else under `src/` is internal even when it
  carries an `export` keyword, so renaming or deleting it is not by itself a breaking change.
- Published version: 2.1.0. The next release is 3.0.0, a major. Section 6 describes how that work is organised.

## 2. Repository map

| Path | What it is | Edit? |
| --- | --- | --- |
| `index.ts` | Package entry. tsup bundles the CommonJS build from here; `scripts/write-esm-entry.mjs` then writes the ESM entry. | yes |
| `src/` | Runtime: 16 files, about 4,500 lines, plus colocated vitest unit tests (`**/*.test.ts`: `pageObject.test.ts`, `locators/utils.test.ts`, `locators/locatorRegistrationBuilder.test.ts`, `locators/locatorUpdateBuilder.test.ts`, `helpers/url.test.ts`, `helpers/navigation.test.ts`, `helpers/sessionStorage.test.ts`, `helpers/sessionStorageSeed.test.ts`). | yes |
| `src/locators/` | `locatorRegistry.ts` (registry, resolution with frames as `locator` plus `contentFrame()` and the any-frame segment, cycle detection, `verify()`), `locatorRegistrationBuilder.ts` (`add(path).getByRole(...)` DSL, seeded registrations, the boundary checks), `locatorUpdateBuilder.ts` (`update` as a same-strategy JSON Merge Patch, `replace`), `locatorQueryBuilder.ts` (`getLocatorSchema(path)` chain: `filter`, `nth`, `remove`, `describe`, `getLocator`, `getNestedLocator`), `reusableLocatorBuilder.ts` (`createReusable`), `types.ts` (definitions, `OptionsPatch`, compile-time path validation), `utils.ts` (path validation, `assertPrimaryValue` and `assertIdValue`, the id selector helpers, `createLocator`, `isAnyFrameDefinition`, `methodForStrategy`, cloning, patching). | yes |
| `src/helpers/` | `url.ts` (`assertBaseUrl`, `assertUrlPath`, `resolveUrl`, `createUrlMatcher`, `composeFullUrl`), `navigation.ts` (`NavigationFor`, one `page.waitForURL` per wait), `sessionStorage.ts` (`SessionStorage`: `page.sessionStorage` with batches, step titles, origin checks and per-key codecs; `set`, `get`, `clear`, `seed`), `sessionStorageSeed.ts` (the seed registry, one per page: the writer and redirect documents, the proxy while a seed is pending, the bypass and never-applied failures), `playwrightReportLogger.ts`, `stepDecorator.ts`. | yes |
| `src/pageObject.ts`, `src/fixture/base.fixtures.ts` | Abstract `PageObject`: `defineLocators()` and `verify()` run once, right after construction (a check scheduled with `queueMicrotask`) or at the first locator call, through a facade on `locatorRegistry`; labelled, sticky errors with the construction site; the optional actions hook, evaluated per run. The `test` fixture that provides `log`. | yes |
| `test/` | Standalone pnpm project that installs the packed package from `.pack/pomwright` and runs Playwright against it. Section 4. | yes |
| `docs/v3/` | Working documentation for 3.0.0, created 2026-10-06 as a verbatim copy of `docs/v2`. The `getById` deep dive in `locator-registry.md` is already rewritten for 3.0.0. Every doc edit goes here. | yes |
| `docs/v2/` | Frozen 2.x reference. | no |
| `docs/v1/`, `docs/v1-to-v2-migration/` | Archived. | no |
| `release-3.0.0/` | Working folder for the 3.0.0 release: analysis, numbered plans, release notes, decisions log. Section 6. | yes |
| `.changeset/` | Changesets config. `CHANGELOG.md` is generated from changesets at release time. | config only |
| `.github/workflows/` | `checks.yaml` (reusable): `changes`, `lint` (always), `package` (unit tests, build and pack once, the tarball as a run artifact) and `harness` (chromium, firefox, webkit at the Playwright pin and at the latest 1.x, each testing that tarball); `package` and `harness` are skipped when only `*.md` files changed. `pr.yaml` (`PR`) runs it for every pull request, draft or not; `main.yaml` (`CI`) for pushes to `main` only; both end with the gate job `build`, `main`'s required status check. `publish.yaml` runs the changesets action after `CI` succeeds on a push to `main`, guarded by its job condition. | yes |
| `pack-build.sh`, `pack-extract.sh`, `pack-test.sh`, `playwright.base.ts` | Build and pack the tarball and extract it into `.pack/pomwright`; the extraction; run the harness (section 3); shared Playwright config. | yes |
| `scripts/` | `write-esm-entry.mjs` (part of `pnpm build`), `ci-changes.sh` and `ci-playwright-version.sh` (the two decisions of `checks.yaml`, runnable locally). | yes |
| `vitest.config.ts` | Unit-test discovery limited to `src/**/*.test.ts`, node environment, so Playwright specs are never picked up; typecheck mode on, so `expectTypeOf` and `// @ts-expect-error` assertions are enforced. | yes |
| `tsconfig.vitest.json` | The tsconfig vitest's typecheck uses: extends the root, scoped to `src/`, target `es2024` (the root has no `include` and would sweep `dist/` and `test/`). | yes |
| `biome.json`, `tsconfig.json`, `.editorconfig` | Lint and format, strict TypeScript, tabs. | yes |
| `dist/`, `*.tgz`, `.pack/`, `node_modules/`, `.pnpm-store/` | Build and install artefacts, gitignored. | no |

## 3. Toolchain and commands

- Node 24 and pnpm 9.12.0 for contributors (the `packageManager` field; CI uses the same; vitest needs 22.12 or
  later). Use pnpm only. `@playwright/test` is an exact root dev dependency at the peer floor (1.64.0): the peer
  floor, the root dev pin and the harness pin in `test/package.json` move together, by decision.
- `pnpm install --frozen-lockfile`
- `pnpm lint` runs `biome check .` (lint, import order and format check over the whole repository; biome does not
  process `.md`; `test/test-data` and `.pack` are excluded). `pnpm format` (`biome format --write .`) rewrites
  formatting only; import order and lint fixes come from `biome check --write`.
- `pnpm build` runs `tsup index.ts --format cjs --dts` into `dist/`, then `scripts/write-esm-entry.mjs`.
- `pnpm test:unit` runs the vitest unit tests for the pure helpers in seconds and type-checks the test files and
  what they import (vitest typecheck mode; `vitest` is pinned exactly because the mode is experimental). `pnpm test`
  runs them and then `pack-test`.
- `pnpm pack-test` is the authoritative integration run and needs no sudo: `pack-build.sh` (frozen root install,
  build, pack `pomwright-test-build.tgz`, extract into `.pack/pomwright`), a frozen install of `test/`, `tsc` over
  `test/`, `playwright install` (browsers only), then every project (chromium, firefox, webkit). Arguments go to
  `playwright test`, for example `pnpm pack-test --project=chromium tests/testApp/testIds.spec.ts --reporter=line`.
  Use the line reporter in non-interactive runs, because the local html reporter opens on failure and blocks.
  Playwright's system libraries are a once-per-machine step (`pnpm -C test exec playwright install-deps`, with
  sudo; `install-deps --dry-run` lists what is missing without it).
- `test/` depends on `file:../.pack/pomwright`, a directory, so a frozen install always installs the current
  extraction and `test/pnpm-lock.yaml` does not change with builds. `pnpm harness:install` packs and installs without
  running anything, for `pnpm typecheck` or a quick `pnpm -C test exec playwright test …` of one spec.
- `pnpm typecheck` runs `tsc --noEmit -p test` against the installed package: specs, page objects, fixtures,
  `playwright.base.ts`, the `src/locators` files the source-level specs import, and the compile-only path probe.
- CI switches of `pack-test.sh`: `POMWRIGHT_TARBALL=<path>` tests that tarball instead of building (it installs the
  root for `tsc` only); `PLAYWRIGHT_VERSION=<version>` swaps `@playwright/test` at the root and in `test/` together
  (one version for `tsc`; it rewrites both manifests and lockfiles, so restore them after a local try);
  `PLAYWRIGHT_INSTALL_ARGS` (CI passes `--with-deps <browser>`).
- Verify runtime claims empirically before writing them into a plan or doc. `@playwright/test` 1.64.0 is installed
  under `test/node_modules`; a short Node script that launches chromium from there is the standard probe. Every
  claim in the analysis was verified that way. Keep that standard. Three pitfalls: the helper methods are wrapped in
  `test.step` and cannot be driven outside the Playwright runner, so runner behaviour (listener errors, `test.info()`
  in teardown) is probed with a temporary spec in `test/tests/` that is deleted after the run; a script that imports
  `dist/index.mjs` must load chromium from the root package (`createRequire` of `./package.json`), otherwise
  Playwright throws "Requiring @playwright/test second time"; a page object defines and verifies its registry in a
  microtask right after construction, so a probe, spec or unit test that builds a broken page object on purpose must
  use it synchronously after `new` or capture the check (as `src/pageObject.test.ts` does), otherwise the check
  throws outside the code under test.

## 4. Test harness (`test/`)

- Own `package.json`, lockfile and `tsconfig.json` (path aliases `@page-object-models/*`, `@fixtures/*`,
  `@test-data/*`). Depends on `pomwright` as `file:../.pack/pomwright`, the packed tarball extracted (section 3).
  Playwright is pinned to 1.64.0.
- `server.js` is an express app on port 9000. It serves `test-data/staticPage` (a W3 template page) and the routes
  `/testpath`, `/testpath/:color`, `/testfilters`, `/iframe` (with `/iframe/a`, `/b`, `/c`, a nested frame and a
  hidden iframe section), `/testids` (ids that are valid HTML but awkward as CSS selectors, and one empty
  `data-testid`), `/testnav` (with `/testnav/item/:id` and `/testnav/bounce`,
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
  `registry`, `validation`), `pageObject/` (construction-time URL validation, registry verification, the lifecycle
  and the actions hook), `step/`, `testApp/`, `packaging/` (`esmEntry.spec.mts`, ESM inside the CommonJS harness:
  the published entries, one shared copy, closed deep imports, the manifest). 48 spec files, about 6,300 lines. One spec file per DSL method,
  for example `add.getById.spec.ts` or `getLocatorSchema.update.spec.ts`; one DOM-level spec per fixture page under
  `testApp/`, for example `testIds.spec.ts`.
- Know what each spec exercises. Most `locatorRegistry/` specs import `LocatorRegistryInternal` from
  `../../../../src/locators`, so they run against source. Fixture-based specs and anything importing from
  `pomwright` (the page objects, `testApp/`, `remove`, `replace`, `registry.binding`) run against the packed
  tarball. A green source-level spec says nothing about a stale tarball install.
- `validation.locatorSchemaPath.typecheck.ts` is a compile-only probe: Playwright does not match the file name, and
  `pnpm typecheck` (in `pack-test` and CI) enforces its `@ts-expect-error` directives.
- The harness runs on chromium, firefox and webkit, in CI at the Playwright pin and at the latest 1.x in the peer
  range. A real behaviour difference between browsers on one Playwright version uses the `browserName` fixture (as
  `sessionStorage.spec.ts` does for WebKit's iframe storage). Rendered locator strings depend on the Playwright
  version, not the browser.
- When changing locator behaviour: add focused specs next to the existing ones, keep the existing coverage (add,
  do not replace), and assert against real DOM where possible rather than only against `toString()`. New specs
  prefer DOM assertions over rendered locator strings; an existing string assertion is converted when a newer
  Playwright renders it differently.

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
- Every builder requires the strategy's first argument through `assertPrimaryValue`; an empty string is rejected only
  where Playwright cannot use it (`locator`, `frameLocator`, `getByRole`, `getById`) and stored verbatim otherwise;
  `undefined` means "not provided" (it inherits on seeded and update builders). A throwing DSL call changes nothing.
  `update` keeps the registered strategy and follows JSON Merge Patch (`null` deletes); `replace` changes the
  strategy; neither touches steps. Roles are Playwright's compile-time type; there is no runtime role list.
- A `frameLocator(selector)` segment is `locator(selector)` plus its steps, then `contentFrame()` for the descendants
  and the `<iframe>` element as a terminal; `frameLocator()` is Playwright's any-frame locator, first segment only, no
  steps, no terminal form. Never reintroduce `target.frameLocator(selector)` with dropped steps.
- `PageObject` never calls `defineLocators()` from its constructor: it runs, followed by `verify()`, once per instance,
  right after construction (a check scheduled as the constructor's last statement) or at the first locator call if
  that comes earlier; a registry mistake still fails the fixture, labelled `<label>: …` with the original as `cause`
  and the construction site in the stack. `pageActionsToPerformAfterNavigation()` is optional and called each time the
  actions run. A standalone registry calls `verify()` itself. Never move either hook back into the constructor.
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
  `PLAN-1.5-SESSION-STORAGE.md` (executed 2026-10-10), `PLAN-1.6-1.8-REGISTRATION-AND-FRAMES.md` (executed
  2026-10-13), `PLAN-1.7-PAGEOBJECT-LIFECYCLE.md` (executed 2026-10-13) and `PLAN-4-PACKAGING-TOOLING-CI.md` (executed
  2026-10-14) are done, one commit per execution step each. The remaining plans, their scope, and their order are in
  `PLANS.md`; the next one is `PLAN-1.9-TYPES-AND-EXPORTS.md`. |
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
- `publish.yaml` starts after `CI` succeeds, and `CI` runs only for pushes to `main` and includes the whole harness;
  its job condition also requires a push run on `main` in this repository. Pull requests run the same jobs through
  `PR`, which Publish does not listen to. CI runs only for pull requests (drafts included) and `main`. The gate job
  `build` of `pr.yaml` and `main.yaml` is `main`'s required status check. The published package is rebuilt by
  `pnpm run release`, not taken from the CI artifact (left for after 3.0.0).
- Pending 3.0.0 changesets so far: `.changeset/getbyid-verbatim-ids-and-regex.md`,
  `.changeset/url-composition-and-navigation.md`, `.changeset/session-storage-on-webstorage.md`,
  `.changeset/registration-guards-and-frames.md`, `.changeset/pageobject-lifecycle.md` and
  `.changeset/package-exports-and-engines.md` (all `major`).

## 8. Do not

- Edit `docs/v2`, `docs/v1*`, `CHANGELOG.md`, or `package.json#version`.
- Commit `dist/`, `.pack/`, `*.tgz`, `test/node_modules`, or Playwright reports.
- Change the Playwright peer range or the `test/` pin without a decision.
- Treat `dist/` or `.pack/` as source when counting, grepping, or reasoning about behaviour.
- Reintroduce behaviour listed as removed in `RELEASE-NOTES-3.0.0.md`, such as `#` and `id=` prefix handling in
  `getById`, JSON-encoding every session storage value, `setOnNextNavigation`, dropping steps on frame segments, a
  cross-strategy `update` with a per-type cache, explicit `undefined` as the option-clearing value, the rollback
  of a failed seeded override, or a call to `defineLocators()` or `pageActionsToPerformAfterNavigation()` from the
  `PageObject` constructor.
- Re-derive findings that are already in the analysis. Cite the item number instead.
- Commit without being asked.
- Reintroduce a `file:` tarball dependency, a second build in a harness job, or sudo in the harness scripts.
- Let `CI` (`main.yaml`) run on pull requests, remove the publish guard, or rename the gate job `build` without
  changing the branch-protection rule with it (every pull request would be blocked for non-admins).
