# Inventory

The map of the final review of POMWright at `54cdada` (branch `fix/review-3-0-2`), written before any hunting. One line
per item: what it is, the files that implement it, where it is documented. The tag in brackets is the scope that owns
the item (see [scopes.md](scopes.md)); a scope reads the lines with its tag in full and the others as far as its items
touch them.

Abbreviations: `S` = `src/helpers/`, `L` = `src/locators/`, `D` = `website/src/content/docs/`, `T` = `test/tests/`.
Section numbers (§) are those of [AGENTS.md](../AGENTS.md).

## 1. Public exports (`index.ts`)

Read from the built `dist/index.d.ts` (tool: `POMWright-final-review-probes/phase0/members.mjs`).

| Export | Kind | Implemented in | API page | Scope |
| --- | --- | --- | --- | --- |
| `test` | fixture (`log`) | `src/fixture/base.fixtures.ts` | `D/api/fixtures.md` | E |
| `PageObject` | abstract class: `page`, `baseUrl`, `urlPath`, `fullUrl`, `label`, `sessionStorage`, `navigation`, protected `locatorRegistry`, `add`, `getLocator`, `getLocatorSchema`, `getNestedLocator`, protected constructor, protected `defineLocators`, protected `pageActionsToPerformAfterNavigation` | `src/pageObject.ts` | `D/api/class-pageobject.md` | D |
| `PageObjectOptions` | `label`, `navOptions`, `sessionStorage`, `locators.strictChains` | `src/pageObject.ts` | `D/api/types.md` | D |
| `PageObjectTypeOptions`, `BaseUrlTypeFromOptions`, `UrlPathTypeFromOptions`, `FullUrlTypeFromOptions`, `StorageTypeFromOptions` | types | `src/pageObject.ts` | `D/api/types.md` | D |
| `NavigationFor` | `goto(target, options?)`, `goto(options?)`, `expectThisPage(options?)`, `expectAnotherPage(options?)` | `S/navigation.ts` | `D/api/class-navigation.md` | D |
| `NavigationOptions` (`waitUntil`, `timeout`), `ThisPageOptions` (`runPostNavigationActions` + navigation options) | types | `S/navigation.ts` | `D/api/class-navigation.md` | D |
| `UrlMatcher` | `base`, `path`, `test()`, `toString()` | `S/url.ts` | `D/api/class-navigation.md` | D |
| `SessionStorage` | class: constructor, `set`, `get`, `clear`, `seed` (overloads: one key, entries, keys) | `S/sessionStorage.ts`, `S/sessionStorageSeed.ts`, `S/storageTurns.ts` | `D/api/class-sessionstorage.md` | A |
| `json`, `Codec` (`parse`, `stringify`), `SessionStorageSchema`, `SessionStorageOptions` (`label`, `origin`, `schema`), `SeedOptions` (`origin`), `Decoded`, `AllEntries` | codec and types | `S/sessionStorage.ts` | `D/api/class-sessionstorage.md` | A |
| `PlaywrightReportLogger` | class: constructor, `getNewChildLogger`, `debug`, `info`, `warn`, `error`, `setLogLevel`, `getCurrentLogLevel`, `getCurrentLogLevelIndex`, `resetLogLevel`, `isCurrentLogLevel`, `isLogLevelEnabled`, `attachLogsToTest` | `S/playwrightReportLogger.ts` | `D/api/class-playwrightreportlogger.md` | E |
| `LogEntry` (`timestamp`, `logLevel`, `prefix`, `message`), `LogLevel` | types | `S/playwrightReportLogger.ts` | same | E |
| `step` | decorator (standard and `experimentalDecorators`, bare and with title/options) | `S/stepDecorator.ts` | `D/api/step.md` | E |
| `createRegistryWithAccessors`, `LocatorRegistryOptions` (`strictChains`), `AddAccessor`, `GetLocatorAccessor`, `GetLocatorSchemaAccessor`, `GetNestedLocatorAccessor` | function and types | `L/locatorRegistry.ts`, `L/index.ts` | `D/api/class-locatorregistry.md` | B |
| `LocatorRegistry` | `Pick<LocatorRegistryInternal, "add" \| "createReusable" \| "getLocator" \| "getLocatorSchema" \| "getNestedLocator" \| "verify">` | `L/locatorRegistry.ts` | `D/api/class-locatorregistry.md` | B |
| registration builder of `add(path)` (not exported by name): ten locator methods, `filter`, `nth`, `describe`; `{ reuse: path }` and `{ reuse: seed }` | builder | `L/locatorRegistrationBuilder.ts` | `D/api/class-registrationbuilder.md` | B |
| `ReusableLocator` (`type`, `definition`, `steps`, `description`, `filter`, `nth`, `describe`); `createReusable` (ten methods) | seed | `L/reusableLocatorBuilder.ts` | `D/api/class-reusablelocator.md` | B |
| `FilterDefinition` (`has`, `hasNot`, `hasText`, `hasNotText`, `visible`), `IndexSelector` | types | `L/types.ts` | `D/api/types.md` | B |
| `LocatorSchemaPathFormat`, `LocatorSchemaPathArgument` | path types | `L/types.ts` | `D/api/types.md` | B |
| `LocatorQueryBuilder` | `filter`, `nth`, `clearSteps`, `skip`, `unskip`, `describe`, `update`, `replace`, `getLocator`, `getNestedLocator` | `L/locatorQueryBuilder.ts` | `D/api/class-locatorquerybuilder.md` | C |
| `LocatorUpdateBuilder` | ten locator methods in `update` and `replace` modes | `L/locatorUpdateBuilder.ts` | `D/api/class-locatorupdatebuilder.md` | C |

## 2. Features and stated contracts

### Session storage [A]

- Values are strings stored verbatim unless the key has a codec (`json<T>()`, `Codec<T>`); `get` returns `null` for a
  missing key; a literal `[]` does not compile. `S/sessionStorage.ts`; §5; `D/docs/session-storage.md`.
- Per-key codecs from `schema`; the error for a non-string value without a codec says where codecs are declared
  (`adffd1e`). `D/docs/session-storage.md#codecs-for-structured-values`.
- `origin` option: a helper with an origin touches only that origin; the origin's scheme must have a URL origin
  (`0028097`); the check applies on an `about:blank` page that inherited an origin (`d4cffbb`). `S/sessionStorage.ts`.
- Keys are never property names on the way to the page: a `__proto__` key is stored (`7131d3d`).
- Batches: a navigation during a batch fails with the label and the keys done (`e8831b8`); a sandboxed document's
  refusal is explained (`17426a5`); a decode error gives the reason, the length and the quoted value (`ea330ef`).
- Every call (`set`, `get`, `clear`, `seed`) takes its turn on a per-page, per-origin chain joined synchronously at the
  step's start; overlapping calls end as awaited ones; a call that waited checks the origin again; a failing call
  leaves the pending seed as it was. `S/storageTurns.ts`; §5; `D/internal/seed-registry.md#overlapping-calls`.
- `seed`: never navigates or intercepts; on the origin writes at once, away from it registers one init script per
  pending origin (main frame only, on the origin by `location.origin` and `self.origin`, first arrival only by
  `navigation.activation.from === null`), disposed at the main frame's commit there. `S/sessionStorageSeed.ts`; §5;
  `D/docs/seeding-session-storage.md`, `D/internal/seed-registry.md`.
- `seed` decides at the call (reads the page and starts its commit watch before its step body, `5ceb13c`); with no
  entries does nothing (`a6ecacf`); throws at the call without the Navigation API (checked on the interface,
  `bfbc00f`) and when the main frame commits on the origin during registration; a page closing during registration
  fails with label and call site (`d12966a`).
- `seed` failures: refused write, skipped by the arriving document (opaque document, a return), never applied — each
  fails the test with the `seed` call site (`a23aa0d`); a seed's failure no longer stops the page's other listeners
  (`819c477`). The four listeners (`framenavigated`, `domcontentloaded`, `console`, `close`) live only while needed.
- Call sites: a later error points at the consumer's call (`S/callSite.ts`), never by filtering file names except
  POMWright's own bundle. §5; `D/internal/call-sites.md`; `T/pageObject/callSite/`.
- Types: string keys typed as any of the schema's values (`64cd0b7`); the types public signatures use are exported
  (`7447754`). `D/api/class-sessionstorage.md`.
- Session storage through a page object (`sessionStorage` option and property, the schema in the type options).
  `src/pageObject.ts`; `D/docs/session-storage.md#through-a-page-object`. [A, D]

### Registration and resolution [B]

- `add(path)` then exactly one of ten locator methods, then `filter`, `nth`, `describe` steps; one registration per
  path; boundary checks before anything is registered (`assertStrategyPrimary`, `assertIdValue`, `assertDescription`).
  `L/locatorRegistrationBuilder.ts`, `L/utils.ts`; `D/docs/registering-locators.md`.
- A registration ends at the next call on its registry; an ended registration's methods throw naming the call that
  ended it (`2accf34`, `61e266c`); a `getLocator` inside an `add` chain's filter arguments ends it, with the two ways to
  write it. §5; `T/locatorRegistry/add/add.registrationEnds.spec.ts`.
- Registered locators do not change: copies of options and filter objects read as Playwright reads them (`readFields`,
  own then prototype properties, methods left out, `9dc8048`), `copyValue` for RegExps, a `Locator` kept; every read on a
  clone. §5; `D/internal/registry-records.md`.
- Paths: dot-delimited, `validateLocatorSchemaPath` and `LocatorSchemaPathFormat` agree; whitespace from
  `LOCATOR_SCHEMA_PATH_WHITESPACE`. `L/utils.ts`, `L/types.ts`; `D/docs/locator-paths.md`;
  `T/locatorRegistry/validation/`.
- `getById`: strings as `[id="…"]` verbatim, RegExps as `internal:attr=[id=/source/flags]`, every flag passed through.
  `D/docs/locating-by-id.md`.
- `STRATEGIES` table: one row per strategy, read by creation, cloning, the seeded patch, `update`, `replace`; no
  per-strategy `switch` elsewhere. `L/utils.ts`; `D/internal/strategies-table.md`.
- Primary argument rules: required through `assertStrategyPrimary`; empty string rejected only for `locator`,
  `frameLocator`, `getByRole`, `getById`; `undefined` means not provided; `null`, a number, an object or a RegExp where a
  string is expected gets the missing-value message; a lone `null` where options may stand is the options; a throwing
  DSL call changes nothing. §5.
- Resolution: `getNestedLocator` chains every registered ancestor, `getLocator` the path alone; unregistered segments
  group paths and are left out; default description is the path; `has`/`hasNot` path references terminal-only,
  resolved alone; cycle detection. `L/locatorRegistry.ts`; `D/docs/resolving-locators.md`, `D/internal/resolution.md`.
- Frames: `frameLocator(selector)` is `locator(selector)` plus steps, then `contentFrame()` for descendants and the
  `<iframe>` element as a terminal; `frameLocator()` (any frame) first segment only, no steps or description, no
  terminal form. §5; `D/docs/frames.md`.
- `verify()`: what it finds; `strictChains` (registry option and `PageObject` `locators.strictChains`) requires every
  ancestor; never the default. `D/docs/verifying-registries.md`.
- Reuse: by path (copies strategy, steps, explicit description; returns `filter`, `nth`, `describe`; no strategy
  override or `clearSteps`); by seed (`createReusable`, seeds immutable, methods return new seeds, `definition` and
  `steps` copies); seeded override parses and merges as `update` (`db26390`); a hand-made seed object gets the primary
  check (method `reuse`). `L/reusableLocatorBuilder.ts`, `L/locatorRegistry.ts`; `D/docs/reusing-locators.md`.
- `createRegistryWithAccessors` and the accessor types for a standalone registry; a standalone registry calls `verify()`
  itself. `D/api/class-locatorregistry.md`; `T/locatorRegistry/registry/`.
- Locator modules: patterns of registering locators from functions shared between page objects.
  `D/docs/locator-modules.md`. [B, H]

### Queries [C]

- `getLocatorSchema(path)` returns an independent clone per call; `filter`, `nth`, `clearSteps` on the path or a
  sub-path; `describe` (`describe("")` removes); `nth` hands every index but `"first"`/`"last"` to Playwright as given.
  `L/locatorQueryBuilder.ts`; `D/docs/queries.md`, `D/docs/filters-and-indices.md`, `D/docs/descriptions.md`.
- `update(sub?)`: same strategy, JSON Merge Patch (`null` deletes), `undefined` first argument compiles (`db26390`);
  `replace(sub?)`: changes the strategy, Playwright's argument lists, first argument required; neither touches steps or
  the description. `L/locatorUpdateBuilder.ts`; `D/docs/queries.md`.
- `replace(sub).frameLocator()` throws on the query's own path and on a segment with steps in the query.
- `skip(sub)`/`unskip(sub)`: a flag, the terminal cannot be skipped (types and runtime); `update`, `replace`, `filter`,
  `nth`, `clearSteps` on a skipped segment throw; double `skip` and stray `unskip` throw; a builder taken before the
  `skip` throws when it applies (`b1ee8dc`). §5; `T/locatorRegistry/getLocatorSchema/getLocatorSchema.skip.spec.ts`.

### Page objects, URLs and navigation [D]

- `PageObject` constructor: `(page, baseUrl, urlPath, options?)`; URL parts validated at construction (`assertBaseUrl`,
  `assertUrlPath`): string `baseUrl` a non-empty origin with a URL origin, no bare `?`/`#`; string `urlPath` `""` or a
  single-slash path that stays on the base's origin (`c9c8f34`). `src/pageObject.ts`, `S/url.ts`;
  `D/docs/urls-and-navigation.md`.
- Lifecycle: `defineLocators()` and `verify()` once per instance, right after construction (microtask) or at the first
  locator call; never from the constructor; labelled sticky errors with the original as `cause` and the construction
  site in the stack. `src/pageObject.ts`; `D/docs/page-objects.md`, `D/internal/page-object-lifecycle.md`.
- Actions hook: `pageActionsToPerformAfterNavigation()` optional, evaluated per run; `runPostNavigationActions`.
  `T/pageObject/actions.spec.ts`.
- `fullUrl`: a string when both parts are strings, a `UrlMatcher` when either is a RegExp (base against the origin, path
  against the rest). `S/url.ts`; `D/internal/url-matching.md`.
- URL comparison as Playwright's: the rest of the URL as `href` writes it, an empty `?`/`#` is another URL (`c75ab43`);
  `|` and `%7C` (`d710c12`), `^` and `%5E` (`54cdada`) equal in the path part. `S/url.ts`;
  `T/testApp/urlForms.spec.ts`, `T/testApp/testNav.spec.ts`.
- `goto(target | options)`: a URL string or options as `page.goto` takes; a URL object throws (`fa424ad`); `goto()`
  without a target is the this-page navigation; `expectThisPage`/`expectAnotherPage` are one `page.waitForURL` each; no
  timeout or `waitUntil` default of POMWright's own; boxed steps. `S/navigation.ts`; `D/api/class-navigation.md`.
- Credentials in a base URL end up in reports (`8ccfbd4`, docs warning).

### Logging, steps and the fixture [E]

- `log` fixture: one `PlaywrightReportLogger` per test, entries attached one per entry in call order, named in
  Playwright's `locale` and `timezoneId`; message and string arguments kept as given, others printed as `console.log`
  does. `S/playwrightReportLogger.ts`, `src/fixture/base.fixtures.ts`; `D/docs/logging.md`.
- Levels, child loggers (shared level state?), `attachLogsToTest(testInfo, format?)`. `D/api/class-playwrightreportlogger.md`.
- `@step`: methods returning a Promise; title and options; boxed step reported at the calling line (`333a928`); a method
  called without its object runs (`d807acb`); bare `@step` compiles with `experimentalDecorators` (`4f80b37`,
  `d91fa33`). `S/stepDecorator.ts`; `D/docs/test-steps.md`, `D/api/step.md`; `test/step-locations/`.
- Step locations of the navigation and session storage helpers (one `async` POMWright frame between caller and a boxed
  `test.step`). §5; `D/internal/call-sites.md#steps-at-the-tests-line`. [E, A, D]

## 3. Errors and messages

`D/api/errors.md` lists every message by section; each scope checks its sections against the throw sites, character for
character, and checks that the concept and API pages show the same text.

| `errors.md` section | Throw sites | Scope |
| --- | --- | --- |
| Paths | `L/utils.ts` (path validation) | B |
| Registering (path twice, two locator methods, missing or empty first argument, ended registration, step before the method, description not a string) | `L/locatorRegistrationBuilder.ts`, `L/utils.ts`, `L/locatorRegistry.ts` | B |
| Reusing | `L/locatorRegistry.ts`, `L/reusableLocatorBuilder.ts` | B |
| Resolving and verifying (not registered, cycle, filter reference, any-frame in the wrong place) | `L/locatorRegistry.ts` | B |
| Queries | `L/locatorQueryBuilder.ts`, `L/locatorUpdateBuilder.ts` | C |
| Page objects (URLs, locators) | `src/pageObject.ts`, `S/url.ts` | D |
| Navigation | `S/navigation.ts` | D |
| Session storage, `seed` | `S/sessionStorage.ts` (12 throw sites), `S/sessionStorageSeed.ts` (6) | A |
| `@step` | `S/stepDecorator.ts` (2) | E |

Throw sites per file (`grep -c 'throw '`): navigation 5, sessionStorageSeed 6, sessionStorage 12, stepDecorator 2, url 5,
locatorQueryBuilder 9, locatorRegistrationBuilder 9, locatorRegistry 14, locatorUpdateBuilder 3, utils 14, pageObject 3.
Messages raised from the browser side (the seed script's `console` reports) are in `S/sessionStorageSeed.ts`.

## 4. Lifecycles and ordering

- Page object: construction → scheduled check (microtask) or first locator call → `defineLocators()` → `verify()`;
  sticky failure. [D]
- Registry: open registration → ended by the next registry call. [B]
- Session storage: turns per page and origin; seed registry per page (pending origins, init script per origin, dispose
  at commit, listeners attached and removed); page close; a navigation during a batch; the step overlay delaying a
  step's body (`T/testApp/sessionStorageOverlay.spec.ts`). [A]
- Logger: entries collected during the test, attached at teardown by the fixture. [E]
- `@step`: the wrapper's `async`-ness decides the reported location. [E]
- CI: `changes` → `lint`/`package` → `harness` (pin and latest 1.x) and `harness-node-floor` → `site` → gate `build`;
  `main.yaml` concurrency; `publish.yaml` and `pages.yaml` after `CI` on the tested commit only. [G]

## 5. Inputs at the boundary

- Paths (strings, whitespace, empty segments, dots), primaries per strategy (`null`, numbers, objects, RegExps, empty
  strings), options objects (prototypes, getters, class instances, mutation after the call), `FilterDefinition`
  (`has` as a `Locator` or a path), `IndexSelector` (numbers, `"first"`, `"last"`, negatives, non-integers, NaN),
  descriptions. [B, C]
- URLs: `baseUrl` and `urlPath` strings and RegExps (flags, `g`/`y` state), credentials, backslashes, tabs and
  newlines, empty `?`/`#`, `|`, `^`, percent-encoding, unicode hosts; `goto` targets (strings, URL objects, options
  objects). [D]
- Storage keys and values: `__proto__` and prototype names, unicode, empty strings, very long values, non-string values
  with and without codecs, codecs that throw; `origin` strings (schemes without a URL origin, trailing slashes, paths).
  [A]
- Logger arguments (objects, errors, cyclic values, symbols), level names. [E]
- `@step` on non-Promise methods, getters, static methods, detached calls. [E]

## 6. Types

- Path types (`LocatorSchemaPathFormat`, sub-path types, `SkippablePaths`) against the runtime validation. [B, C]
- `replace`'s argument lists through `Mode`; `update`'s patch types (`OptionsPatch`); `null` and `undefined`. [C]
- `PageObject` generics (`Paths`, `Options`), `*TypeFromOptions`, `fullUrl` as string or `UrlMatcher`, `NavigationFor`. [D]
- Storage schema types: `Decoded`, `AllEntries`, `KeyOnly`, `EntriesFor`, `NonEmpty`, literal `[]` rejected. [A]
- `@step` under standard and legacy decorators (`test/tsconfig.legacyDecorators.json`). [E]
- Declaration emit without annotations (`T/packaging/publicTypes.emit.ts`); every public method returns an importable
  type; public types are aliases, no class re-exported as a type. [F]

## 7. Packaging and distribution [F]

- One CommonJS build (`dist/index.js`, `dist/index.d.ts`) and the ESM wrapper (`dist/index.mjs`, `dist/index.d.mts`)
  from `scripts/write-esm-entry.mjs`; `exports` with `import`, `require`, `default` (`2bab383`) and
  `./package.json`; deep imports closed. `package.json`, `D/internal/packaging.md`, `T/packaging/esmEntry.spec.mts`.
- `files` (`dist/**`, `README.md`, `LICENSE`, `CHANGELOG.md`), peer `@playwright/test >=1.64.0 <2.0.0`, `engines`
  `node >=20`. `D/docs/installation.md`.
- The §7 pre-release packaging probes (packed file list; Node 20 and 24 `require`/`import` sharing one `PageObject`;
  TypeScript `node10`, `node16`, `nodenext`, `bundler`; attw; the runner in CommonJS and `"type": "module"` projects).
  Not yet run for this release.
- The 31 pending changesets in `.changeset/`: bump level per §7's rules, first line a sentence, migration hints where a
  user's code changes, each matching its commit. `.changeset/config.json` (`@changesets/changelog-github`,
  `disableThanks`).
- `pnpm pack:version` (`scripts/pack-version.sh`).

## 8. Documentation

- Docs section, 24 pages (`D/docs/`); API reference, 14 pages (`D/api/`); Internal, 13 pages (`D/internal/`); home page
  `D/index.mdx`; example app `website/snippets/` (`login.page.ts`, `account.page.ts`, `orders.page.ts`,
  `checkout.page.ts`, `fixtures.ts`). Each scope owns the pages listed in its brief; H owns the rest and the whole.
- README (one example, links the site). [H]
- Doc comments in `src/` as the editor's API reference: summary, `@param`, `@returns`, `@throws` with the real message,
  `@example`, `@see` to the heading (§9). Each scope checks its own files' comments.
- `D/docs/upgrading-from-2x.md` (660 lines): every 2.x → 3.x statement. [H]
- `D/api/errors.md`: every message. [each scope its sections; H the whole]
- Site: `website/astro.config.mjs` (base, link check, Mermaid, edit links), `website/sidebar.mjs`,
  `website/plugins/expressive-code-cut.mjs`, `website/src/components/SiteTitle.astro`. [H, G]

## 9. Tests and tooling

- Unit tests (vitest, typecheck mode): 16 `src/**/*.test.ts` plus `S/stepDecorator.test-d.ts`, about 5,500 lines,
  against source. `vitest.config.ts`, `tsconfig.vitest.json`. [each scope its files; G the setup]
- Harness `test/`: 55 spec files (per AGENTS.md), about 8,400 lines; `locatorRegistry/` mostly against source
  (`LocatorRegistryInternal` from `../../../../src/locators`), page objects, `testApp/`, `logging/`, `callSite/` and
  `packaging/` against the packed tarball. `test/server.js` (port 9000, the fixture routes). [each scope its specs; G
  the setup]
- Type probes: `T/locatorRegistry/validation/validation.locatorSchemaPath.typecheck.ts`,
  `T/packaging/publicTypes.typecheck.ts`, `T/packaging/publicTypes.emit.ts`,
  `T/packaging/stepLegacyDecorators.typecheck.ts`. [B, F, E]
- Step-location check: `test/step-locations/` with `test/playwright.steps.config.ts`. [E]
- Scripts: `pack-build.sh`, `pack-extract.sh`, `pack-test.sh` (`POMWRIGHT_TARBALL`, `PLAYWRIGHT_VERSION`,
  `PLAYWRIGHT_INSTALL_ARGS`), `scripts/check-doc-snippets.mjs`, `scripts/check-api-coverage.mjs`,
  `scripts/benchmark.mjs`, `scripts/pack-version.sh`, `scripts/ci-last-green.sh`, `scripts/ci-changes.sh`,
  `scripts/ci-playwright-version.sh`, `scripts/write-esm-entry.mjs` [F]. [G]
- Workflows: `checks.yaml` (reusable: `changes`, `lint`, `package`, `harness`, `harness-node-floor`, `site`, gate
  `build`), `pr.yaml`, `main.yaml` (concurrency), `publish.yaml` (guard: the run's commit is still `main`'s head;
  provenance), `pages.yaml` (same guard, or `workflow_dispatch`); `.github/dependabot.yml`. [G]
- Config: `biome.json`, `tsconfig.json`, `.editorconfig`, `pnpm-workspace.yaml` (`allowBuilds`), `playwright.base.ts`,
  `test/playwright.config.ts` (local `reuseExistingServer: true`), `test/playwright.bench.config.ts`. [G]

## 10. The contributor guide

- `AGENTS.md`: does every count, path, file list, command and rule still describe the repository at `54cdada`
  (sections 2 to 9)? [H; each scope reports a line of its own area that is wrong]

## 11. Decided design and known issues (not findings)

A scope that meets one of these marks it *known* and reports it only if the code no longer does what was decided.

- Decided in AGENTS.md §5 and §7 (not planned): ending a registration only at calls that could read it; validating
  `nth`'s index; `strictChains` as the default; a scheduled workflow against new Playwright releases; linting
  Markdown; a retry that applies a seed after a failed navigation (issue draft 08, deliberately not filed). The §8
  "Do not" list.
- Filed backlog issues (drafts in `git show 2f06702:release-3.0.2/issues/`):
  - 01 release tooling to changesets CLI 3, action v2, npm Trusted Publishing [G]
  - 02 TypeScript 7 once it has a compiler API [F, G]
  - 03 Node 26 for contributors and CI once LTS [G]
  - 04 publish the tarball CI tested instead of rebuilding [G]
  - 05 a browser-context-wide `seed` option [A]
  - 06 write a page object's storage schema once (breaking) [A, D]
  - 07 an option to treat an empty `?` or `#` as the same page [D]
