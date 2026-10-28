# Testing

The test commands beyond the everyday ones in AGENTS.md, how to probe, and the harness in `test/`. Read it before
running, writing or changing tests or probes, or changing `test/`, `pack-*.sh`, `playwright.base.ts` or
`vitest.config.ts`. Part of the contributor guide that [AGENTS.md](../AGENTS.md) indexes; AGENTS.md's rules apply here
too.

## Commands

- `test/` depends on `file:../.pack/pomwright`, a directory, so a frozen install always installs the current
  extraction and `test/pnpm-lock.yaml` does not change with builds. `pnpm harness:install` packs and installs without
  running anything, for `pnpm typecheck` or a quick `pnpm -C test exec playwright test …` of one spec.
- `pnpm typecheck` runs `tsc --noEmit -p test` against the installed package: specs, page objects, fixtures,
  `playwright.base.ts`, and the compile-only probes; then
  `tsc -p test/tsconfig.declarations.json` (`declaration: true`, `noEmit`), the declaration emit of
  `tests/packaging/publicTypes.emit.ts`; then `tsc -p test/tsconfig.legacyDecorators.json`, `@step` under
  `experimentalDecorators` (`tests/packaging/stepLegacyDecorators.typecheck.ts`, also compiled under the standard
  decorators by the first `tsc`); then `tsc -p test/tsconfig.legacyDecorators.emit.json`, which emits
  `step-locations/legacy/legacyWidget.ts` with `experimentalDecorators`, as CommonJS, into `test/.legacy-decorators/` for
  the step-location check; then `scripts/check-doc-snippets.mjs`, every `ts` block of `website/src/content/docs` and the
  README against the installed package, `scripts/check-api-coverage.mjs`, the API reference and the doc comments against the
  installed declarations, and `scripts/check-error-messages.mjs`, *Error messages* against the messages `src/` throws
  and the compile-error messages its types define (see [documentation](documentation.md)). `pack-test.sh` runs all seven, and after the harness
  `playwright test -c playwright.steps.config.ts` (see *The harness* below).
- `pnpm pack:version <version>` (`scripts/pack-version.sh`, run by hand only) builds and packs the package with the
  given semver version in the packed `package.json` only, as `pomwright-<version>.tgz` at the root (gitignored), for
  trying a build in another project before it is released; the repository's version stays what changesets set, and
  the harness's tarball and `.pack/` are untouched.
- `pnpm bench` runs `scripts/benchmark.mjs` against the installed package (after `pnpm harness:install`): registering,
  resolving and verifying locators beside the same chains built with Playwright's locator methods, and, through
  `test/benchmarks/pageObjectFixture.spec.ts` with `test/playwright.bench.config.ts`, a page object set up as a fixture
  beside one written with Playwright alone, in time and heap; printed as the tables of *Internal → Performance*. It is not part of CI, where timings vary too much to gate on; rerun it and update
  the page, its machine line included, when a change touches the registry or resolution.
- CI switches of `pack-test.sh`: `POMWRIGHT_TARBALL=<path>` tests that tarball instead of building (it installs the
  root for `tsc` only); `PLAYWRIGHT_VERSION=<version>` swaps `@playwright/test` at the root and in `test/` together
  (one version for `tsc`; it rewrites both manifests and lockfiles, so restore them after a local try);
  `PLAYWRIGHT_INSTALL_ARGS` (CI passes `--with-deps <browser>`).

## Probing

- Verify runtime claims empirically before writing them into a plan or doc. `@playwright/test` 1.64.0 is installed
  under `test/node_modules`; a short Node script that launches chromium from there is the standard probe, and every
  runtime claim in a plan, a page or a doc comment is checked that way. Four pitfalls: the helper methods are wrapped in
  `test.step` and cannot be driven outside the Playwright runner, so runner behavior (listener errors, `test.info()`
  in teardown) is probed with a temporary spec in `test/tests/` that is deleted after the run; a script that imports
  `dist/index.mjs` must load chromium from the root package (`createRequire` of `./package.json`), otherwise
  Playwright throws "Requiring @playwright/test second time"; a page object defines and verifies its registry in a
  microtask right after construction, so a probe, spec or unit test that builds a broken page object on purpose must
  use it synchronously after `new` or capture the check (as `src/pageObject.test.ts` does), otherwise the check
  throws outside the code under test; a test that fails, even as expected under `test.fail()`, has its worker
  replaced, so a later test cannot read what it left in memory (`pageObject/callSite/callSite.spec.ts` hands a stack
  over through a file named per project and repeat).

## The harness (`test/`)

- Own `package.json`, lockfile and `tsconfig.json` (path aliases `@page-object-models/*`, `@fixtures/*`,
  `@test-data/*`). Depends on `pomwright` as `file:../.pack/pomwright`, the packed tarball extracted (above).
  Playwright is pinned to 1.64.0.
- `server.js` is an express app on port 9000. It serves `test-data/staticPage` (a W3 template page) and the routes
  `/testpath`, `/testpath/:color`, `/testfilters`, `/iframe` (with `/iframe/a`, `/b`, `/c`, a nested frame and a
  hidden iframe section), `/testids` (ids that are valid HTML but awkward as CSS selectors, and one empty
  `data-testid`), `/testnav` (with `/testnav/item/:id` and `/testnav/bounce`,
  the navigation fixture: query, hash, trailing slash, delayed and bouncing navigations), and `/teststorage` (GET and
  POST, urlencoded, multipart or `text/plain`, with `/teststorage/frame` (`?nested=1` adds `srcdoc`, `about:blank` and
  `data:` frames), `/redirect`, `/chain`, `/login`, `/login307`, `/login308`, `/api`, `/race` (an app that writes and
  leaves at once), `/bounce`, `/204`, `/download`, `/sandboxed` (a document sandboxed by its Content-Security-Policy:
  on the origin by its URL, with an opaque origin), `/shadowed-navigation` (an app whose global `navigation` shadows
  `window.navigation`), `/sw.js` and `/sw-passthrough.js`: the session storage fixture,
  whose first script snapshots `sessionStorage` and which shows the navigation's type and `document.referrer`; hops to
  the second origin `http://127.0.0.1:9000`, the same server, by every kind of navigation; iframes, COOP and COEP
  flags, and two service workers). New fixture pages go in as new routes, not into the static page.
- Page objects live under `page-object-models/testApp/pages/<name>/` as `<name>.locatorSchema.ts` plus
  `<name>.page.ts`, all extending `testApp.base.ts` (which carries a storage schema through its options type);
  `teststorage/` also has `teststorage-second.page.ts`, a `PageObject` on the second origin. `fixtures/testApp.fixtures.ts`
  exposes them to specs.
- Specs live under `tests/`: `locatorRegistry/` (`add`, `getLocator`, `getLocatorSchema`, `getNestedLocator`,
  `registry`, `validation`), `pageObject/` (construction-time URL validation, registry verification, the lifecycle,
  the actions hook, `lifecycle.outcomes.spec.ts`, which runs `test/lifecycle-outcomes/` as a Playwright run of its own on
  its project's browser and compares the JSON report with the docs' table of where a broken page object is built (which
  tests fail, how far each body gets, which do not run: what a test cannot see of itself, and what `test.fail()` would
  change), and `callSite/`: errors raised after the consumer's line point at it even in consumer files named
  `pageObject.ts` and `sessionStorage.ts`; a page object's check at the `new` line, with a base class too, and the `add`
  lines in its `cause`), `logging/` (the `log` fixture's attachments, read by an auto fixture torn
  down after it), `step/`, `testApp/`, `docs/` (`docsChains.spec.ts`: every chain the site and the README show in a
  `text` block, a code comment or the running text, rebuilt through the packed package, one test per page), `packaging/` (`esmEntry.spec.mts`, ESM inside the CommonJS harness: the
  published entries, one shared copy, closed deep imports, the manifest; `packageFiles.spec.ts`, the installed
  package's exact file list; `publicTypes.typecheck.ts`, `publicTypes.emit.ts` and `stepLegacyDecorators.typecheck.ts`,
  compile-only, the last also under `experimentalDecorators`; the emit check returns every public member on its own). `benchmarks/` holds the fixture benchmark of `pnpm bench`, run only through
  `playwright.bench.config.ts`, never by `pack-test`. `testApp/urlForms.spec.ts` sweeps the printable ASCII
  characters through the URL each browser reports (but `# ? / % \`), with the known differences listed: Chromium's `|`
  in a path, and, on Node 20 and 22, whose `new URL` keeps a `^`, every browser's `%5E`. `testApp/urlHosts.spec.ts`
  takes each host form `new URL` normalizes (case, default ports, IDN, IPv6, IPv4 shorthands, credentials) through a page
  object, every request fulfilled by `page.route`; with credentials, `toHaveURL` sees the document's URL, which has none.
  `test/step-locations/` is the step-location check: its specs mark each probed call with `// LOCATION <id>` (a step
  titled by its class and method is marked with that title), and its reporter fails the run when a step or an error
  with that id is reported on another line, or a marked line is never reported; `legacyDecorators.spec.ts` runs `@step`'s
  legacy decorator calls as `tsc` emits them (`pnpm typecheck` writes them; the spec fails clearly without); it needs no browser and
  runs from `test/playwright.steps.config.ts`, which `pack-test.sh` runs after the harness, so no `--reporter` given to
  the harness can switch it off. `testApp/sessionStorageOverlay.spec.ts` runs with Playwright's step overlay
  (`video: { show: { test } }`), which delays a step's body. One spec file per DSL method,
  for example `add.getById.spec.ts` or `getLocatorSchema.update.spec.ts`; one DOM-level spec per fixture page under
  `testApp/`, for example `testIds.spec.ts`.
- Every spec imports `pomwright`, the packed tarball, never `src/`: what a spec checks is what npm would publish. The
  `locatorRegistry/` specs observe a registration through the public API (`createRegistryWithAccessors`): on the DOM,
  in Playwright's rendering of the same call (`locator.describe("")`) and in `description()`. What is stored inside, the
  records, is the unit tests' (`src/locators/*.test.ts`), which read them directly; a check of a record belongs there,
  not in a spec.
- `validation.locatorSchemaPath.typecheck.ts` and `packaging/publicTypes.typecheck.ts` are compile-only probes:
  Playwright does not match the file names, and `pnpm typecheck` (in `pack-test` and CI) enforces their
  `@ts-expect-error` directives. `publicTypes.typecheck.ts` holds the public types against the published declarations
  (every export, replace's arguments, the private internals, seeds, path forwarding); `publicTypes.emit.ts` must emit
  declarations without annotations. A change to the public types adds to both.
- The harness runs on chromium, firefox and webkit (`pnpm pack-test` and CI on `main`; pull requests run chromium
  only, so a firefox- or webkit-only failure shows in `CI` after the merge and blocks Publish until fixed), in CI at
  the Playwright pin and at the latest 1.x in the peer range. A real behavior difference between browsers on one Playwright version uses the `browserName` fixture (as
  `sessionStorage.spec.ts` does for WebKit's iframe storage). Rendered locator strings depend on the Playwright
  version, not the browser.

## Do not

- Reintroduce a `file:` tarball dependency, or sudo in the harness scripts.
