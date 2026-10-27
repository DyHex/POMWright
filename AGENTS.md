# AGENTS.md

Persistent context and working rules for AI agents and humans contributing to POMWright. Read it fully before
changing anything. Repo-specific facts here override generic defaults. Last revised 2026-10-23, with the 3.0.2 fixes
from two reviews of 3.0.1 and from the triage of the session storage findings that followed.

## 1. What POMWright is

- A TypeScript companion library for `@playwright/test`, published to npm as `pomwright` under Apache-2.0. Peer
  range `@playwright/test >=1.64.0 <2.0.0` (1.59 made `addInitScript` return a `Disposable`, 1.61 added
  `page.sessionStorage`, 1.63 the any-frame `frameLocator()`, 1.64 the per-element regex reset that makes every RegExp flag deterministic). Playwright is never a runtime
  dependency. Node 20 or later (`engines`), Playwright's own floor; re-read it from Playwright's `engines` whenever
  the peer floor moves.
- Packaging mirrors `@playwright/test`: one CommonJS build (`dist/index.js`, `dist/index.d.ts`) behind an `exports`
  map whose root has `import`, `require` and, last, `default` (the CommonJS build); `dist/index.mjs` and `dist/index.d.mts` are written by `scripts/write-esm-entry.mjs` and re-export that build
  by name, so `import` and `require` share one copy. Only the root and `pomwright/package.json` are importable.
- Core idea: register one locator definition per dot-delimited path (`"main.form.submit"`) in a `LocatorRegistry`,
  and POMWright composes the full Playwright locator chain from the path. The registry, `PageObject`,
  `SessionStorage`, the `log` fixture and the `step` decorator are each usable on their own.
- The public API is exactly what the root [index.ts](index.ts) re-exports: `test` (fixture providing `log`),
  `PageObject` with `PageObjectTypeOptions`, `PageObjectOptions` (its constructor options) and the `*TypeFromOptions`
  helpers, `createRegistryWithAccessors` with `LocatorRegistryOptions`, the accessor types, the `LocatorRegistry` type (`add`, `createReusable`, `getLocator`, `getLocatorSchema`,
  `getNestedLocator`, `verify`), what the registry hands out (`LocatorQueryBuilder`, `LocatorUpdateBuilder`,
  `ReusableLocator`, `FilterDefinition`, `IndexSelector`) and the path types (`LocatorSchemaPathFormat`,
  `LocatorSchemaPathArgument`), `SessionStorage` with the `json` codec and the `Codec`, `SessionStorageSchema`,
  `SessionStorageOptions`, `SeedOptions`, `Decoded` and `AllEntries` types, `PlaywrightReportLogger` with `LogEntry` and `LogLevel`, `step`, `NavigationFor`, `NavigationOptions`,
  `ThisPageOptions` and `UrlMatcher`. Everything else under `src/` is internal even when it carries an `export`
  keyword, so renaming or deleting it is not by itself a breaking change.
- The published version is `package.json`'s `version`, which changesets sets; the next release is the changesets in
  `.changeset/` (section 7). Neither is restated here, so this file does not go stale at a release. Section 6 describes
  how release work is organised.

## 2. Repository map

| Path | What it is | Edit? |
| --- | --- | --- |
| `index.ts` | Package entry. tsup bundles the CommonJS build from here; `scripts/write-esm-entry.mjs` then writes the ESM entry. | yes |
| `src/` | Runtime: 18 files, about 6,400 lines, plus colocated vitest unit tests (`**/*.test.ts`: `pageObject.test.ts`, `locators/utils.test.ts`, `locators/locatorRegistry.test.ts`, `locators/locatorRegistrationBuilder.test.ts`, `locators/locatorUpdateBuilder.test.ts`, `locators/locatorQueryBuilder.test.ts`, `locators/reusableLocatorBuilder.test.ts`, `helpers/url.test.ts`, `helpers/navigation.test.ts`, `helpers/sessionStorage.test.ts`, `helpers/sessionStorageSeed.test.ts`, `helpers/storageTurns.test.ts`, `helpers/callSite.test.ts`, `helpers/playwrightReportLogger.test.ts`, `helpers/stepDecorator.test.ts`, `helpers/stepLocations.test.ts`), the type-only `helpers/stepDecorator.test-d.ts` (decorator syntax, which vitest's runtime cannot load), and `locators/fakePage.ts`, test support only: a page whose locators record the chain they were built from, never imported by the runtime and so never bundled. | yes |
| `src/locators/` | `locatorRegistry.ts` (registry, the open registration it ends at its next call, resolution with frames as `locator` plus `contentFrame()` and the any-frame segment, cycle detection, `verify()` with the opt-in `strictChains`, reuse by path and by seed through one seeded builder), `locatorRegistrationBuilder.ts` (`add(path).getByRole(...)` DSL, seeded registrations with `update`'s argument shapes, the boundary checks, no steps on an any-frame definition), `locatorUpdateBuilder.ts` (`update` as a same-strategy JSON Merge Patch, `replace` with Playwright's argument lists through a `Mode` type parameter; the class `LocatorUpdateBuilderInternal`, the public alias `LocatorUpdateBuilder`), `locatorQueryBuilder.ts` (`getLocatorSchema(path)` chain: `filter`, `nth`, `clearSteps`, `skip`/`unskip`, `describe`, `update`, `replace`, `getLocator`, `getNestedLocator`; the class `LocatorQueryBuilderInternal`, the public alias `LocatorQueryBuilder`), `reusableLocatorBuilder.ts` (`createReusable`; a seed is a value whose methods return new seeds), `types.ts` (definitions, `ReusableLocator`, `FilterDefinition`, `IndexSelector`, `OptionsPatch`, compile-time path validation), `utils.ts` (the `STRATEGIES` table, one row per strategy, that creation, cloning, the seeded patch, `update` and `replace` read; path validation with `LOCATOR_SCHEMA_PATH_WHITESPACE`, `assertStrategyPrimary` over `assertPrimaryValue` and `assertIdValue`, `assertDescription`, the id selector helpers, `createLocator`, `applyIndexSelector`, `isAnyFrameDefinition`, `isLocatorInstance`, `isReusableLocator`, `methodForStrategy`, `mergeOptions`, cloning and copying (`copyValue`, `copyFields`, `copyFilter`, `normalizeSteps`), patching). | yes |
| `src/helpers/` | `url.ts` (`assertBaseUrl`, `assertUrlPath`, `resolveUrl`, `createUrlMatcher`, `composeFullUrl`), `navigation.ts` (`NavigationFor`, one `page.waitForURL` per wait), `sessionStorage.ts` (`SessionStorage`: `page.sessionStorage` with batches, step titles, origin checks and per-key codecs; `set`, `get`, `clear`, `seed`), `sessionStorageSeed.ts` (the seed registry, one per page: in the call's turn, a write at once on the origin, or an init script per pending origin that writes only in the main frame, on the origin, on the first arrival, disposed at the main frame's commit there, with its entries as `[key, value]` pairs; the Navigation API check, the commit-during-registration check, the refused-write, not-applied and never-applied failures), `storageTurns.ts` (`takeTurn`: per page and origin, every `SessionStorage` call in the order it was made), `callSite.ts` (`captureCallSite(boundary)` and `atCallSite`: a later error pointed at the consumer's call, for `seed` and the page-object check), `playwrightReportLogger.ts` (messages kept as given, other arguments as `console.log` prints them, one attachment per entry in call order, names in Playwright's `locale` and `timezoneId`), `stepDecorator.ts` (`@step`, for methods that return a Promise; an `async` wrapper for a boxed step, a plain one otherwise). | yes |
| `src/pageObject.ts`, `src/fixture/base.fixtures.ts` | Abstract `PageObject` (constructor options `label`, `navOptions`, `sessionStorage`, `locators: { strictChains }`): `defineLocators()` and `verify()` run once, right after construction (a check scheduled with `queueMicrotask`) or at the first locator call, through a facade on `locatorRegistry`; labelled, sticky errors with the construction site; the optional actions hook, evaluated per run. The `test` fixture that provides `log`. | yes |
| `test/` | Standalone pnpm project that installs the packed package from `.pack/pomwright` and runs Playwright against it. Section 4. | yes |
| `website/` | The documentation site's content (section 9): `src/content/docs/docs/`, the Docs section (24 pages: Getting started, Principles, one page per concept, *Upgrading from 2.x*); `src/content/docs/api/`, the API reference (14 pages, one per class or group, `errors` and the index); `src/content/docs/internal/`, how POMWright works (13 pages, `performance` among them); `snippets/`, the docs' example app (`login.page.ts`, `account.page.ts`, `orders.page.ts`, `checkout.page.ts`, `fixtures.ts`) that every page's examples import. Around them the Starlight site, a pnpm project of its own (`package.json`, `pnpm-lock.yaml`, exact versions): `astro.config.mjs` (base `/POMWright`, the link check, Mermaid, the edit links to `main`), `sidebar.mjs` (the three sections), `plugins/expressive-code-cut.mjs` (hides an example's `// ---cut---` prelude), `src/components/SiteTitle.astro` (the sections as tabs), `src/styles/custom.css`, `src/content/docs/index.mdx` (the home page). | yes |
| `docs/v2/` | Frozen 2.x reference. | no |
| `docs/v1/`, `docs/v1-to-v2-migration/` | Archived. | no |
| `skills/` | Agent skills in the Claude Code and claude.ai format, one folder per skill with its `SKILL.md` and the scripts it ships: `defect-review/`, an evidence-based defect review of a whole project, a change set or one area, with `scripts/review-status.mjs` (the status table, cost projections and cost caps of a review whose segments run as subagents). Not published (`package.json#files`), not on the site yet: kept for a later Skills section. biome checks the scripts but not the `SKILL.md` (it does not process `.md`). Their evals and test runs are not in the repository. | yes |
| `.changeset/` | Changesets config. `CHANGELOG.md` is generated from changesets at release time. | config only |
| `.github/workflows/` | `checks.yaml` (reusable): `changes`, `lint` (always), `package` (unit tests, build and pack once, the tarball as a run artifact) and `harness` (the browsers the caller passes, each at the Playwright pin and at the latest 1.x, each testing that tarball), and with the `node-floor` input, which `pr.yaml` and `main.yaml` set, `harness-node-floor` (chromium at the pin on Node 20, the `engines` floor); every third-party action is pinned to a commit with its version in a comment, kept current by `.github/dependabot.yml` (monthly, grouped), which also proposes the npm versions of the root, `test/` and `website/`, never `@playwright/test`; `changes` (`scripts/ci-changes.sh`) compares with the last green commit of the branch (the newest commit whose run of the same workflow succeeded) and, on a pull request, with its base, never with the previous push alone (which would let a docs-only push turn a red run green), and outputs `code` (a change outside `website/` that is not `*.md`) and `site` (`code` or a change under `website/`); `package` runs on either, `harness` on `code`, and `site` on `site`: the tarball installed into `test/`, the snippet and coverage checks, the site's frozen install and build on Node 24. `pr.yaml` (`PR`) runs it for every pull request, draft or not, with the harness on chromium only; `main.yaml` (`CI`) for pushes to `main` only, on chromium, firefox and webkit, one run at a time in push order (a `concurrency` group without `cancel-in-progress`, so Publish and Pages follow the order of the commits and an older run never deploys over a newer site; a waiting run gives way to a newer push); both end with the gate job `build`, `main`'s required status check. `publish.yaml` runs the changesets action after `CI` succeeds on a push to `main`, guarded by its job condition and by a step that goes no further when `main` has moved past the commit that run tested (a `workflow_run` checks out the newest commit; the newer commit's own run publishes), and publishes with npm provenance (`id-token: write`, `NPM_CONFIG_PROVENANCE`). `pages.yaml` builds `website/` and deploys it to GitHub Pages (`https://dyhex.github.io/POMWright/`) after `CI` succeeds on a push to `main`, guarded as `publish.yaml` is and building the commit that run tested, or by `workflow_dispatch`. | yes |
| `pack-build.sh`, `pack-extract.sh`, `pack-test.sh`, `playwright.base.ts` | Build and pack the tarball and extract it into `.pack/pomwright`; the extraction; run the harness (section 3); shared Playwright config. | yes |
| `scripts/` | `write-esm-entry.mjs` (part of `pnpm build`), `check-doc-snippets.mjs` (compiles the docs' TypeScript examples) and `check-api-coverage.mjs` (the API reference and the doc comments against the installed declarations), both part of `pnpm typecheck` (section 9), `benchmark.mjs` (`pnpm bench`, the tables of *Internal → Performance*), `pack-version.sh` (`pnpm pack:version`, a tarball with a chosen version for trying a build elsewhere), `ci-last-green.sh`, `ci-changes.sh` and `ci-playwright-version.sh` (the decisions of `checks.yaml`; `ci-last-green.sh` reads the runs API through `gh`, the other two run locally as they are). | yes |
| `vitest.config.ts` | Unit-test discovery limited to `src/**/*.test.ts`, node environment, so Playwright specs are never picked up; typecheck mode on, so `expectTypeOf` and `// @ts-expect-error` assertions are enforced, in `src/**/*.test.ts` and in the type-only `src/**/*.test-d.ts`. | yes |
| `tsconfig.vitest.json` | The tsconfig vitest's typecheck uses: extends the root, scoped to `src/`, target `es2024` (the root has no `include` and would sweep `dist/` and `test/`). | yes |
| `biome.json`, `tsconfig.json`, `.editorconfig` | Lint and format, strict TypeScript, tabs. | yes |
| `pnpm-workspace.yaml` | pnpm settings for the root: `allowBuilds`, the dependencies whose install scripts may run (section 3). It lists no packages: `test/` and `website/` stay projects of their own. | yes |
| `dist/`, `*.tgz`, `.pack/`, `node_modules/`, `.pnpm-store/`, `test/.doc-snippets/`, `website/dist/`, `website/.astro/` | Build and install artefacts, the snippet check's projects and the site's build and generated types, gitignored. | no |

## 3. Toolchain and commands

- Node 24 and pnpm 12.14.0 for contributors (the `packageManager` field of the root, `test/` and `website/`; CI's
  `pnpm/action-setup` steps name the same version; vitest needs Node 22.12 or later). Use pnpm only; pnpm 9.7 and later
  switch to the version the field names. pnpm runs no dependency's install script unless the root
  `pnpm-workspace.yaml` allows it (`allowBuilds`: esbuild, for tsup); a new one fails the install until it is allowed
  there, after a look at what it runs. Each lockfile pins pnpm itself by integrity. TypeScript is 6 (its compiler API
  is what tsup's declaration build and the two doc checks use, and 7 has none); TypeScript 6 includes only the
  `@types` packages a tsconfig lists, so the root `tsconfig.json` lists `node`.
  `@playwright/test` is an exact root dev dependency at the peer floor (1.64.0): the peer floor, the root dev pin and
  the harness pin in `test/package.json` move together, by decision.
- `pnpm install --frozen-lockfile`
- `pnpm lint` runs `biome check --error-on-warnings .`, so a warning fails it and CI (lint, import order and format check over the whole repository; biome does not
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
  `playwright.base.ts`, the `src/locators` files the source-level specs import, and the compile-only probes; then
  `tsc -p test/tsconfig.declarations.json` (`declaration: true`, `noEmit`), the declaration emit of
  `tests/packaging/publicTypes.emit.ts`; then `tsc -p test/tsconfig.legacyDecorators.json`, `@step` under
  `experimentalDecorators` (`tests/packaging/stepLegacyDecorators.typecheck.ts`, also compiled under the standard
  decorators by the first `tsc`); then `scripts/check-doc-snippets.mjs`, every `ts` block of
  `website/src/content/docs` against the installed package, and `scripts/check-api-coverage.mjs`, the API reference and
  the doc comments against the installed declarations (section 9). `pack-test.sh` runs all five, and after the harness
  `playwright test -c playwright.steps.config.ts` (section 4).
- `pnpm pack:version <version>` (`scripts/pack-version.sh`, run by hand only) builds and packs the package with the
  given semver version in the packed `package.json` only, as `pomwright-<version>.tgz` at the root (gitignored), for
  trying a build in another project before it is released; the repository's version stays what changesets set, and
  the harness's tarball and `.pack/` are untouched.
- `pnpm bench` runs `scripts/benchmark.mjs` against the installed package (after `pnpm harness:install`): registering,
  resolving and verifying locators beside the same chains built with Playwright's locator methods, and, through
  `test/benchmarks/pageObjectFixture.spec.ts` with `test/playwright.bench.config.ts`, a page object set up as a fixture
  beside one written with Playwright alone, in time and heap; printed as the tables of *Internal → Performance*. It is not part of CI, where timings vary too much to gate on; rerun it and update
  the page, its machine line included, when a change touches the registry or resolution.
- The documentation site, each script after a frozen install of `website/`: `pnpm docs:dev`, a dev server that reloads
  on every edit, at `http://localhost:4391/POMWright/` (the harness keeps 9000), without the link check; `pnpm
  docs:build`, into `website/dist`, failing on a link or an anchor that does not exist; `pnpm docs:preview`, that build
  served as it deploys, at `http://localhost:4392/POMWright/`, the check to run before a push. Astro 7 needs Node 22.22
  or later; the site builds on Node 24, and the library's Node 20 floor is untouched. The site's dependencies never
  enter the root `package.json`, whose scripts only call into `website/`.
- CI switches of `pack-test.sh`: `POMWRIGHT_TARBALL=<path>` tests that tarball instead of building (it installs the
  root for `tsc` only); `PLAYWRIGHT_VERSION=<version>` swaps `@playwright/test` at the root and in `test/` together
  (one version for `tsc`; it rewrites both manifests and lockfiles, so restore them after a local try);
  `PLAYWRIGHT_INSTALL_ARGS` (CI passes `--with-deps <browser>`).
- Verify runtime claims empirically before writing them into a plan or doc. `@playwright/test` 1.64.0 is installed
  under `test/node_modules`; a short Node script that launches chromium from there is the standard probe, and every
  runtime claim in a plan, a page or a doc comment is checked that way. Four pitfalls: the helper methods are wrapped in
  `test.step` and cannot be driven outside the Playwright runner, so runner behaviour (listener errors, `test.info()`
  in teardown) is probed with a temporary spec in `test/tests/` that is deleted after the run; a script that imports
  `dist/index.mjs` must load chromium from the root package (`createRequire` of `./package.json`), otherwise
  Playwright throws "Requiring @playwright/test second time"; a page object defines and verifies its registry in a
  microtask right after construction, so a probe, spec or unit test that builds a broken page object on purpose must
  use it synchronously after `new` or capture the check (as `src/pageObject.test.ts` does), otherwise the check
  throws outside the code under test; a test that fails, even as expected under `test.fail()`, has its worker
  replaced, so a later test cannot read what it left in memory (`pageObject/callSite/callSite.spec.ts` hands a stack
  over through a file named per project and repeat).

## 4. Test harness (`test/`)

- Own `package.json`, lockfile and `tsconfig.json` (path aliases `@page-object-models/*`, `@fixtures/*`,
  `@test-data/*`). Depends on `pomwright` as `file:../.pack/pomwright`, the packed tarball extracted (section 3).
  Playwright is pinned to 1.64.0.
- `server.js` is an express app on port 9000. It serves `test-data/staticPage` (a W3 template page) and the routes
  `/testpath`, `/testpath/:color`, `/testfilters`, `/iframe` (with `/iframe/a`, `/b`, `/c`, a nested frame and a
  hidden iframe section), `/testids` (ids that are valid HTML but awkward as CSS selectors, and one empty
  `data-testid`), `/testnav` (with `/testnav/item/:id` and `/testnav/bounce`,
  the navigation fixture: query, hash, trailing slash, delayed and bouncing navigations), and `/teststorage` (GET and
  POST, urlencoded, multipart or `text/plain`, with `/teststorage/frame` (`?nested=1` adds `srcdoc`, `about:blank` and
  `data:` frames), `/redirect`, `/chain`, `/login`, `/login307`, `/login308`, `/api`, `/race` (an app that writes and
  leaves at once), `/bounce`, `/204`, `/download`, `/sw.js` and `/sw-passthrough.js`: the session storage fixture,
  whose first script snapshots `sessionStorage` and which shows the navigation's type and `document.referrer`; hops to
  the second origin `http://127.0.0.1:9000`, the same server, by every kind of navigation; iframes, COOP and COEP
  flags, and two service workers). New fixture pages go in as new routes, not into the static page.
- Page objects live under `page-object-models/testApp/pages/<name>/` as `<name>.locatorSchema.ts` plus
  `<name>.page.ts`, all extending `testApp.base.ts` (which carries a storage schema through its options type);
  `teststorage/` also has `teststorage-second.page.ts`, a `PageObject` on the second origin. `fixtures/testApp.fixtures.ts`
  exposes them to specs.
- Specs live under `tests/`: `locatorRegistry/` (`add`, `getLocator`, `getLocatorSchema`, `getNestedLocator`,
  `registry`, `validation`), `pageObject/` (construction-time URL validation, registry verification, the lifecycle,
  the actions hook, and `callSite/`: errors raised after the consumer's line point at it even in consumer files named
  `pageObject.ts` and `sessionStorage.ts`), `logging/` (the `log` fixture's attachments, read by an auto fixture torn
  down after it), `step/`, `testApp/`, `packaging/` (`esmEntry.spec.mts`, ESM inside the CommonJS harness: the
  published entries, one shared copy, closed deep imports, the manifest; `publicTypes.typecheck.ts` and
  `publicTypes.emit.ts`, compile-only). `benchmarks/` holds the fixture benchmark of `pnpm bench`, run only through
  `playwright.bench.config.ts`, never by `pack-test`. `testApp/urlForms.spec.ts` sweeps the printable ASCII
  characters through the URL each browser reports, with the one known difference (Chromium's `|` in a path) listed.
  `test/step-locations/` is the step-location check: its spec marks each probed call with `// LOCATION <id>`, and its
  reporter fails the run when a step or an error with that id is reported on another line; it needs no browser and
  runs from `test/playwright.steps.config.ts`, which `pack-test.sh` runs after the harness, so no `--reporter` given to
  the harness can switch it off. `testApp/sessionStorageOverlay.spec.ts` runs with Playwright's step overlay
  (`video: { show: { test } }`), which delays a step's body. 55 spec files, about 8,400 lines. One spec file per DSL method,
  for example `add.getById.spec.ts` or `getLocatorSchema.update.spec.ts`; one DOM-level spec per fixture page under
  `testApp/`, for example `testIds.spec.ts`.
- Know what each spec exercises. Most `locatorRegistry/` specs import `LocatorRegistryInternal` from
  `../../../../src/locators`, so they run against source. Fixture-based specs and anything importing from
  `pomwright` (the page objects, `testApp/`, `skip`, `replace`, `registry.binding`, `callSite/`, `logging/`) run against the packed
  tarball. A green source-level spec says nothing about a stale tarball install.
- `validation.locatorSchemaPath.typecheck.ts` and `packaging/publicTypes.typecheck.ts` are compile-only probes:
  Playwright does not match the file names, and `pnpm typecheck` (in `pack-test` and CI) enforces their
  `@ts-expect-error` directives. `publicTypes.typecheck.ts` holds the public types against the published declarations
  (every export, replace's arguments, the private internals, seeds, path forwarding); `publicTypes.emit.ts` must emit
  declarations without annotations. A change to the public types adds to both.
- The harness runs on chromium, firefox and webkit (`pnpm pack-test` and CI on `main`; pull requests run chromium
  only, so a firefox- or webkit-only failure shows in `CI` after the merge and blocks Publish until fixed), in CI at
  the Playwright pin and at the latest 1.x in the peer range. A real behaviour difference between browsers on one Playwright version uses the `browserName` fixture (as
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
  `getLocatorSchema(path)` followed by `update()`, `replace()`, `filter()`, `nth()`, `clearSteps()`, `skip()`,
  `unskip()`, `describe()`, `getLocator()`, `getNestedLocator()`; `createReusable`; clone-on-read; cycle detection;
  terminal-only `has:` path references. Builders are synchronous. There are no thenables anywhere in `src`; do not
  add any.
- A registered locator cannot change after registration: builders store copies of the options and filter objects
  callers pass, read as Playwright reads them (`readFields`: own properties, then those of each prototype up to
  `Object.prototype`, methods left out), and of every value in them, a RegExp included (`copyValue`: `RegExp.prototype.compile()` rewrites one
  in place; a `Locator` is kept, since its methods return new ones), the registration builder keeps its own copy of
  the definition it re-registers from, and every read (`getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify`,
  `has` paths) works on a clone of the record; each `getLocatorSchema` call is a new, independent clone. A
  registration ends at the next call on its registry (`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`,
  `verify`, a resolution): the registry ends the open one, and every method of an ended registration throws first,
  naming the call that ended it, so a registration kept in a variable cannot change its path once anything else has
  happened. A `getLocator` in an `add` chain's filter arguments runs first and ends that registration; the message shows
  the two ways to write it (a path, or a locator resolved before `add`). The rule stays "the next call", not "the next
  call that could read it" (considered and not adopted).
- `skip(subPath)` is a flag on the query: it leaves an ancestor out of the chain and deletes nothing, and
  `unskip(subPath)` restores it exactly as it was. The terminal path cannot be skipped (types and runtime);
  `update`, `replace`, `filter`, `nth` and `clearSteps` on a skipped segment throw, as do a second `skip` and a
  stray `unskip`; an `update()` or `replace()` builder taken before the `skip` throws when it applies its change. `update` and `replace` never touch steps or the description; `clearSteps()` and `describe("")`
  take those away.
- `describe` takes a string on every builder; `describe("")` removes the description (Playwright's meaning), and
  the default stays the path. `nth` hands every index but `"first"`/`"last"` to Playwright's `nth` as given.
- A deferred error (the page object's scheduled check, a pending `seed`) points at the consumer's call through
  `src/helpers/callSite.ts`, which cuts the stack at a boundary function with V8's `Error.captureStackTrace`. Never
  filter stack frames by file name: a consumer's file may share a POMWright file name. The one exception is the frames
  of POMWright's own published bundle (`/pomwright/dist/index.(js|mjs|cjs)`), which `atCallSite` drops so the report's
  code frame is the consumer's line.
- `@step` decorates methods that return a Promise; `test.step` always returns one. The navigation and session storage
  helpers pass `{ box: true }` to their steps, so the report shows the line that called them. Playwright takes a step's
  location from the async stack (only `async` functions waiting in an `await`): an unboxed step's from its first frame,
  a boxed step's from the frame after it. So exactly one `async` POMWright frame sits between the caller and a boxed
  `test.step`: the navigation methods are `async` and open their steps themselves; a `SessionStorage` method is `async`
  and awaits a helper that is not; `@step`'s wrapper is `async` for a boxed step and a plain function otherwise. A caller
  awaits rather than returns such a Promise, which would cut the stack. `test/step-locations` checks the result. The logger keeps the message and
  string arguments as given, prints other arguments as `console.log` does, attaches one attachment per entry in call
  order, and names them in Playwright's `locale` and `timezoneId`.
- Keep the dot-delimited path guarantees. The runtime `validateLocatorSchemaPath` and the type-level
  `LocatorSchemaPathFormat` family in `types.ts` must stay in agreement; the whitespace both reject comes from one
  list, `LOCATOR_SCHEMA_PATH_WHITESPACE` in `utils.ts`.
- Public types are type aliases declared under their public name (`LocatorQueryBuilder` over
  `LocatorQueryBuilderInternal`), never a class re-exported as a type: tsup's bundle writes such a class into the
  export list as a value. Every public method returns a type a consumer can import from the root, except the
  registration builders of `add(path)`; a builder step returns the public alias, not `this`. Internals are
  TypeScript-`private`, never hidden with `@internal` and `stripInternal`.
- Error messages name the registry path (`formatLocatorSchemaPathForError`) and the DSL method the user called.
  Validate DSL input at the boundary, before anything is registered; `assertIdValue` is the pattern.
- `getById` stores values verbatim: strings resolve as `[id="…"]` (exact, case-sensitive, no prefix handling),
  RegExps as `internal:attr=[id=/source/flags]` with every flag passed through. POMWright adds no regex semantics of
  its own.
- Per-strategy rules live in one place, the `STRATEGIES` table in `utils.ts`; a new strategy is a row plus its method
  on each builder, and the type tests fail until both exist. No per-strategy `switch` elsewhere.
- Every builder requires the strategy's first argument through `assertStrategyPrimary`; an empty string is rejected
  only where Playwright cannot use it (`locator`, `frameLocator`, `getByRole`, `getById`) and stored verbatim
  otherwise; `undefined` means "not provided" (it inherits on seeded and update builders). A primary is always a
  value: `null`, a number, an object or a RegExp where Playwright takes a string gets the missing-value message on
  every builder; with two arguments the first is the primary, and a lone `null` where options may stand is the
  options. A throwing DSL call changes nothing. `update` keeps the registered strategy and follows JSON Merge Patch
  (`null` deletes); a seeded override parses and merges exactly as `update` does; `replace` changes the strategy and
  takes Playwright's argument lists (the first argument required, Playwright's option types); none touches steps.
  Roles are Playwright's compile-time type; there is no runtime role list.
- A seed never changes: `filter`, `nth` and `describe` return a new seed, `definition` and `steps` are copies. Reuse
  by path copies the record (strategy, steps, an explicit description) and returns `filter`, `nth` and `describe`;
  no strategy override and no `clearSteps` after a path. An any-frame `frameLocator()` definition takes no steps or
  description from any source (checked at the call); its position is `verify()`'s first-segment check. A hand-made
  seed object gets the primary check every builder applies (method `reuse`). `replace(sub).frameLocator()` throws at
  the call on the query's own path and on a segment with steps in the query (`clearSteps` first).
- An unregistered path segment is a name that groups paths and is left out of the chain; `strictChains: true` (an
  option of the registry and of `PageObject`) makes `verify()` require every ancestor to be registered. It is never
  the default. The default description of a resolved locator is its path.
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
  with an origin touches only that origin. `seed` never navigates and never intercepts a navigation: away from the
  origin it adds one `page.addInitScript` per pending origin, which writes only in the main frame, on the origin (`location.origin` and
  the document's own `self.origin`, so never into a browser's error page), on the first arrival there
  (`navigation.activation.from` is `null`, so a reload or a hop within the origin keeps what the app wrote), and disposes of it when the main frame commits on the origin. Its four listeners (`framenavigated`,
  `domcontentloaded`, `console`, `close`) exist only while a seed is pending or an applied document may still report a
  refused write, until that document's `domcontentloaded` or the next commit. Every `SessionStorage` call (`set`, `get`,
  `clear`, `seed`) takes its turn on a per-page, per-origin chain (`storageTurns.ts`) that it joins synchronously when its
  step starts, so overlapping calls (a `Promise.all`, a missing `await`) end exactly as awaited ones, across every
  helper on the page; a call that waited checks the origin again when its turn starts, and a failing call leaves the
  pending seed as it was. `seed` decides in its turn whether to write at once (the page was on the origin at the call
  and still is) or to register; it reads the page and starts its commit watch at the call, before its step's body,
  which Playwright may delay (the step overlay). Keys are never property names on the way to the page: a `__proto__` key is stored. `seed` throws at
  the call in a browser without the Navigation API (checked once per page) and when the main frame commits on the
  origin between the call reaching the registry and the end of its registration; a refused write, a seed the arriving document skipped (an opaque document, or a
  return there, as after a failed navigation: retrying it is not attempted) and a never-applied seed fail the test
  with the `seed` call site in the stack. Never
  reintroduce JSON-encoding every value, or a write from a `framenavigated` listener (it loses the race against the
  app's first script).
- URLs mirror Playwright's `baseURL` handling with one base per page object: each part is a string or a RegExp, a
  string `baseUrl` is a non-empty origin (no bare `?` or `#`, and a scheme with a URL origin, so not `chrome-extension:` or `file:`, as for `SessionStorage`'s `origin`) and a string `urlPath` is `""` or a single-slash path
  that stays on the base's origin once resolved, all validated at construction; two strings resolve with `new URL`,
  and a page is compared as Playwright compares URLs: the rest of the URL as `href` writes it, an empty `?` or `#`
  included, a string path in the form `new URL` gives it, with `|` and `%7C`, and `^` and `%5E`, equal in its path part (Chromium reports
  a `|` as `%7C`; every browser reports a `^` as `%5E`, which `new URL` keeps as `^` before Node 24); a RegExp in either part makes `fullUrl` a `UrlMatcher` (base against the origin, path against the
  rest, each regex as written). `goto` takes a URL string or options, as `page.goto` does. `goto()` without a target is the this-page navigation; `expectThisPage` and
  `expectAnotherPage` are one `page.waitForURL` each. POMWright sets no timeout or `waitUntil` default of its own.
- Descriptive path names in docs and tests. No anonymous segments.
- `// biome-ignore` only with a one-line justification. No `try/catch` around imports.
- Prefer behaviour-preserving refactors. A contract change (anything documented behaviour relies on) goes through a
  plan (section 6), never in silently. A fix enforces what the code already promises; it never adds a capability that
  keeps a failing test going (a navigation to a seeded origin that fails fails the test; no retry is made to apply the
  seed, since that would rest on browser behaviour without a guarantee).
- No new runtime dependencies. A new dev dependency is recorded, with its reason, in the plan or the commit that adds
  it, and in the working folder's decisions log while one exists (section 6).

## 6. Release work

How a release is planned and carried out. 3.0.0 was prepared this way; its working folder was removed before the
merge, and git history keeps it (`git show 08bdcac^:release-3.0.0/DECISIONS.md`, and the analysis, plans and release
notes beside it), for the rare question that the code, the tests, the site and this file do not answer.

While a release is planned, its working documents live in a `release-<version>/` folder at the root: the findings it
works from when there are any (an analysis, a review), one plan per item or tightly coupled pair
(`PLAN-<items>-<slug>.md`), `PLANS.md` (the ordered plans and their status), `DECISIONS.md` (the decisions in force,
each with date and reason; a reversed one is replaced, and open questions are at the bottom) and the release notes
(consumer-facing, only what is done or committed to by a plan, each item marked *planned* or *done*). The folder is
temporary.

Rules:

1. **Plan first, one item at a time.** Before touching code for an item, write the plan file and stop for review.
   Execute only after explicit confirmation, and only the ticked decisions. A plan has the intended contract, the
   verified current behaviour with file and line references, options with a recommendation, implementation steps,
   tests, docs, changeset, versioning, a decisions checklist and the execution order.
2. **Verified claims only.** Every runtime or type claim in a plan is backed by a probe or a test run (section 3) and
   cites the exact file and line.
3. **Keep the ledgers current.** When a plan is agreed: add its decisions to the decisions log and its consumer-facing
   items to the release notes as *planned*. When it is executed: flip them to *done* and append any execution-time
   decisions.
4. **Docs are written in `website/src/content/docs/`** (section 9). `docs/v2` is frozen.
5. **Links inside the working folder are relative to it**, for example `../src/locators/utils.ts#L64`, so they stay
   clickable in VS Code.
6. **Breaking changes ride one major.** There are no intermediate releases of a major's work. Each consumer-facing
   change still gets its own changeset (`major` for breaking, `minor` or `patch` otherwise), which the release
   collapses into one changelog entry; the changesets, not the release notes, are what consumers read.
7. **Nothing of the folder is kept.** Before the merge, an audit reads every file of the folder and moves what a later
   reader needs into the code, its tests, the doc comments, the site (the reasons behind a design on the Internal
   pages), the changesets or this file, and work left for later into a GitHub issue (section 7); no reference to the
   folder, a plan, a finding or a decision number stays outside it. Then the folder is deleted.
8. **Commits only when asked.** Never commit on your own. When the user asks for one commit per execution step,
   commit exactly those steps, name the plan and step in the message, and leave everything else uncommitted.
9. **A commit an AI wrote or helped write says so.** Its message ends with a `Co-Authored-By:` trailer naming the
   model, after a blank line, for example `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. This holds for
   every commit in the repository, not only release work: leaving the trailer out would misstate who wrote the change.

## 7. Versioning and release mechanics

- Changesets: `pnpm changeset` creates `.changeset/<name>.md`. The `publish.yaml` workflow opens a "Version
  Packages" PR and publishes when it merges. Do not edit `package.json#version` or `CHANGELOG.md` by hand.
- Call out consumer-facing API or behaviour changes in the changeset body, with a migration hint whenever something
  a 2.x user wrote stops working.
- Bumps: behaviour brought in line with what the docs, the doc comments or this file already promise is a patch; so
  is an export that such a promise requires (section 5: every public method returns a type a consumer can import), and
  a type corrected to what the docs promise and the runtime does, even when code that relied on the wrong type stops
  compiling (its changeset gives the migration). A new export, member, option or accepted input is a minor; code
  written against the docs that stops compiling for any other reason, or documented behaviour removed, is a major.
- The changelog is written by `@changesets/changelog-github` with `disableThanks: true` (`.changeset/config.json`): an
  entry is ``- [#PR](…) [`sha`](…) - <the changeset's first line>``, its further lines indented below. So a changeset
  starts with a sentence, never a heading: a heading on that line does not render, in `CHANGELOG.md` or in the GitHub
  release taken from it (3.0.0's entries show it).
- `publish.yaml` starts after `CI` succeeds, and `CI` runs only for pushes to `main` and includes the whole harness;
  its job condition also requires a push run on `main` in this repository. Pull requests run the same jobs through
  `PR`, which Publish does not listen to. CI runs only for pull requests (drafts included) and `main`. The gate job
  `build` of `pr.yaml` and `main.yaml` is `main`'s required status check. The published package is rebuilt by
  `pnpm run release`, not taken from the CI artifact (an open issue). A `workflow_run` checks out the newest commit on
  `main`, so `publish.yaml` compares it with the commit the run tested and goes no further when `main` has moved on.
- `pages.yaml` deploys the documentation site after `CI` succeeds on a push to `main`, guarded as `publish.yaml` is,
  from the commit that run tested, so every merge updates the site once its checks have passed; since nothing reaches
  `main` before it is ready to release, the site is ahead of npm only until the Version Packages pull request is
  merged.
- Pending changesets are the files in `.changeset/` other than `config.json` and `README.md`.
- Before a release, outside CI, the packaging probes run against the packed tarball in a scratchpad project: the packed
  file list (`dist/index.js` and `dist/index.d.ts` from tsup, `dist/index.mjs` and `dist/index.d.mts` from
  `scripts/write-esm-entry.mjs`, nothing else in `dist`); Node 20 and 24 loading `index.js` for `require` and
  `index.mjs` for `import` with one shared `PageObject`; TypeScript under `node10`, `node16`, `nodenext` and `bundler`
  resolution; attw (`@arethetypeswrong/cli`, downloaded, never a dependency) reporting no problem; Playwright's runner in
  a CommonJS and a `"type": "module"` project; and, when `engines` changes, npm's `EBADENGINE` warning on a Node
  version below the new floor.
- Work planned for later is tracked as open GitHub issues labelled `backlog` (`gh issue list --label backlog`), not in
  this file: read them before planning a release, and turn a working folder's deferred items into issues before the
  folder is deleted. A breaking item also carries `breaking`.
- Considered and not planned: a scheduled workflow that tests the latest release against each new Playwright release
  (GitHub has no event for another repository's releases); linting Markdown (biome does not process `.md`); ending a
  registration only at calls that could read it (section 5); and validating `nth`'s index, which Playwright's
  `locator.nth` takes as given (rejecting `nth(undefined)`, documented as matching nothing, would be breaking).

## 8. Do not

- Edit `docs/v2`, `docs/v1*`, `CHANGELOG.md`, or `package.json#version`.
- Commit `dist/`, `.pack/`, `*.tgz`, `test/node_modules`, or Playwright reports.
- Change the Playwright peer range or the `test/` pin without a decision.
- Treat `dist/` or `.pack/` as source when counting, grepping, or reasoning about behaviour.
- Reintroduce behaviour that 3.0.0 removed: `#` and `id=` prefix handling in
  `getById`, JSON-encoding every session storage value, `setOnNextNavigation`, dropping steps on frame segments, a
  cross-strategy `update` with a per-type cache, explicit `undefined` as the option-clearing value, the rollback
  of a failed seeded override, a call to `defineLocators()` or `pageActionsToPerformAfterNavigation()` from the
  `PageObject` constructor, `update()`'s optional patch arguments on `replace()`, the `UrlTypeOptions` name, a query
  `remove()` that deletes a segment's definition, steps or description, `@step` on methods that do not return a
  Promise, a hard-coded log locale or sorted log entries, JSON re-formatting of log messages, a seed method that
  changes the seed, a `void` path reuse, a `null` stored as a primary or as a seeded option key, steps on an
  any-frame definition, or a navigation or session storage step without `box: true`.
- Give `seed` a route, a proxy or a document of POMWright's own, a script without the first-arrival check, or a binding
  exposed to the app's page (section 5).
- Add a per-strategy `switch` outside the `STRATEGIES` table, or make `strictChains` the default (section 5).
- Keep a reference to an object a caller passed to a builder, a RegExp included, let a registration take a call after
  its registry was called again, or filter stack frames by file name other than POMWright's own bundle (section 5).
- Re-export a class as a public type, return `this` from a public builder step, or hide internals with `@internal`
  and `stripInternal` (section 5).
- Commit without being asked, or commit what an AI wrote or helped write without its `Co-Authored-By:` trailer
  (section 6).
- Reintroduce a `file:` tarball dependency, a second build in a harness job, or sudo in the harness scripts.
- Let `CI` (`main.yaml`) run on pull requests, remove the publish guard, or rename the gate job `build` without
  changing the branch-protection rule with it (every pull request would be blocked for non-admins).
- Write a chain, description or message into the docs without reading it from a probe, or change one in the code
  without updating the pages that show it (section 9).
- Add an export or a public member without its doc comment, its `@see` and its heading on an API page (section 9).
- Add the site's dependencies to the root `package.json`, or build the site in a harness job.
- Deploy the site from anything but a green `CI` run on `main` or a manual run, or give the released site a
  pre-release banner or a `noindex` meta.

## 9. Documentation

- The documentation is the Starlight site in `website/`, served at `https://dyhex.github.io/POMWright/`, with its
  content in `website/src/content/docs/`, in three sections: `docs/` to learn, `api/` to look up, `internal/` to
  understand. The 2.x docs are linked at the tag,
  `https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2`. The README says what POMWright is, shows one example, and
  links the site rather than repeating it; its examples are compiled by hand when they change, since the snippet check
  reads only the site.
- The doc comments in `src/` are the API reference in the editor, written from the same facts as the API pages: every
  export and every public or protected member has a summary, `@param` for each parameter (nested options as
  `@param options.label`), `@returns` where the type does not say it, `@throws` with the real message, an `@example`,
  and a `@see` with its API page: on an export the page, on every method, every property of a class and every
  constructor its own heading (`https://dyhex.github.io/POMWright/api/class-sessionstorage/#set`), the methods of what
  `add(path)` and `createReusable` return included; a field of an option or data type needs none. The API entry, not
  the hover, links the Docs section. An overload without a comment shows its method's first one, so the first
  overload carries the full comment; a type a chain hovers (the view after a locator method, `NavigationFor`) carries
  comments on its own members. A decorator at the start of a comment line is read as a JSDoc tag, so `@step`'s comment
  has no example block.
- Principles: mirror Playwright in the docs as in the code (explain each feature as the Playwright feature it builds on
  plus what POMWright adds, use Playwright's names, link playwright.dev for what Playwright owns instead of restating
  it); teach the recommended path first (chains, page objects as fixtures, reuse by path, `update` before `replace`) and
  document a decided contract as decided; one home per fact (a rule is explained on its concept page and linked
  elsewhere; the API page and the doc comment state it briefly and link there); show, then explain (a short example,
  the rule, the edge cases last); say what fails and how (concept pages show the common errors, API pages and doc
  comments every one per member, *Error messages* all of them).
- API pages follow playwright.dev's class pages: a summary with one example, then *Type parameters*, *Constructor*,
  *Methods* (or *Methods to implement*) and *Properties*, the members as `###` headings, alphabetical within their
  group, each with **Usage**, **Arguments** (name, type, *(optional)*, nested options indented), **Returns** and
  **Throws** (the real messages); a type of the page has a `## Name` section; types link to their API page or to
  playwright.dev. Internal pages state what a part is for, how it works and why, including the alternatives that were
  rejected and the reason, with the files involved and no line numbers, and link `AGENTS.md` rather than copy it. The
  reasons behind a design live on the Internal pages; a change of design updates them.
- The code and its tests decide what the docs say. Every chain, description and message a page shows is copied from a
  probe against the build (section 3); where a rendered string hides an option, the stored record is read instead. A
  change to a message, a rendering or a mechanism greps `website/` for the old text and updates the pages with it, and a
  consumer-facing change updates the page that describes it.
- Page shapes follow playwright.dev. Getting started pages: *Introduction*, "You will learn", short sections whose
  example grows from the last, *What's next*; one page, one outcome. Concept pages open with the Playwright concept
  beneath them, linked, and say what POMWright adds; then a small fixture (the HTML and the registry or page object the
  page's examples use), sections from the common case to the edge cases, `:::note` asides only for traps, and a closing
  *Reference* list (POMWright's API pages, then Playwright's). Every page is Markdown (`.md`; MDX only where a component
  earns it, as on the home page) with a `title` and a quoted `description`; links within the site are root-absolute
  with the base and anchor (`/POMWright/docs/<page>/#<heading>`), links to Playwright go to playwright.dev's current
  pages. Plain sentences, one idea each, no marketing, no "simply" or "just", American spelling. No "Added in" markers
  on 3.0.0 pages; from the first 3.x addition on, a new member or option carries one.
- Diagrams are Mermaid, where one explains better than prose, each checked against the code: a sentence before it says
  what it shows, at most about a dozen nodes, the theme's colours (the charts of *Internal → Performance* set their two
  series colours, which the light theme would otherwise draw too pale), and text around it that says the same, so a
  reader of the text loses nothing.
- Examples: page objects reach tests as Playwright fixtures (only *Your first page object* creates one in its test);
  the example app in `website/snippets/` is importable from every page (`./login.page`, `./fixtures`, …), and a page
  that needs its own version of an app file defines a block with the same title; code that is not test code (a
  `defineLocators()`, a locator module, a query in a page object's method) is shown as such; TypeScript with two-space
  indentation, `*.example` hosts and descriptive paths; a rendered chain or message goes in a comment or a `text`
  block.
- `scripts/check-doc-snippets.mjs` compiles every `ts` block, one project per page with the example app, against the
  installed package with the harness's options and `declaration: true`, in `test/.doc-snippets/`. `title="name.ts"`
  makes a block a file the page's other blocks import; lines up to `// ---cut---` are compiled but hidden on the site
  and only declare what the visible lines use; `nocheck` skips a block and lists it (used only for 2.x code on
  *Upgrading from 2.x*); a deliberate error is shown with `// @ts-expect-error`, which the check enforces.
  It runs in `pnpm typecheck` (so in every harness job) and in CI's `site` job, which runs on every change to code or
  to `website/`.
- `scripts/check-api-coverage.mjs` reads the installed declarations (`.pack/pomwright/dist/index.d.ts`, the extracted
  tarball in CI; a path argument overrides it) and fails on an export without an API page (its `title`) or a `## Name`
  section, a public or protected member without a `### member` heading on that page, or an export, member or
  constructor without a summary or a `@param` for each parameter, an export, method, class property or constructor
  without a `@see` (the methods of what `add(path)` and `createReusable` return too), and a
  `https://dyhex.github.io/POMWright/` URL in the declarations whose page or heading does not exist in
  `website/src/content/docs`. A union, a conditional type or a tuple has no members to check. A Mermaid diagram renders in the browser, so the build does not catch its syntax: render the page and look
  (a semicolon in a sequence message, or parentheses in an unquoted edge label, break it).
- Deployment: `pages.yaml` builds `website/` exactly as the `site` job does and deploys `website/dist` to GitHub Pages
  (the `github-pages` environment, which allows `main`; Pages' source is "GitHub Actions"), after `CI` succeeds on a
  push to `main`, from the commit that run tested.
