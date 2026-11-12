# Facts: the registry, registration, queries, seeds, page object core

Read at 7aebcb1. Links relative to this file. Each bullet is from the source cited; behavior claims not yet probed are
marked *(source only)* until a probe or a harness spec backs them (most are pinned by the harness specs; to cite them
when a skill relies on the claim).

## Public surface ([index.ts](../../index.ts))

- Values: `test`, `PlaywrightReportLogger`, `json`, `SessionStorage`, `step`, `createRegistryWithAccessors`,
  `PageObject`. Everything else exported is a type.
- Types: `NavigationFor`, `NavigationOptions`, `ThisPageOptions`, `LogEntry`, `LogLevel`, `AllEntries`, `Codec`,
  `Decoded`, `SeedOptions`, `SessionStorageOptions`, `SessionStorageSchema`, `StepDecorator`, `UrlMatcher`,
  `AddAccessor`, `FilterDefinition`, `GetLocatorAccessor`, `GetLocatorSchemaAccessor`, `GetNestedLocatorAccessor`,
  `IndexSelector`, `LocatorQueryBuilder`, `LocatorRegistry`, `LocatorRegistryOptions`, `LocatorSchemaPathArgument`,
  `LocatorSchemaPathFormat`, `LocatorUpdateBuilder`, `ReusableLocator`, `ReusableLocatorFactory`,
  `BaseUrlTypeFromOptions`, `FullUrlTypeFromOptions`, `PageObjectOptions`, `PageObjectTypeOptions`,
  `StorageTypeFromOptions`, `UrlPathTypeFromOptions`.
- Only the root and `pomwright/package.json` are importable ([docs/repository.md](../../docs/repository.md#packaging)).

## PageObject ([src/pageObject.ts](../../src/pageObject.ts))

- `abstract class PageObject<Paths extends string, Options extends PageObjectTypeOptions = {baseUrlType: string; urlPathType: string}>`
  (L159-162). Constructor is `protected` (L288): `(page, baseUrl, urlPath, options?)`.
- `PageObjectTypeOptions` = `{ baseUrlType?: string | RegExp; urlPathType?: string | RegExp; storage?: SessionStorageSchema }`
  (L32-42), types only.
- `PageObjectOptions<Options>` = `{ label?, navOptions?, sessionStorage?: { schema? }, locators?: LocatorRegistryOptions }`
  (L109-125). `label` defaults to the class name (L295). `navOptions` are defaults for every navigation method
  (`waitUntil`, `timeout`); a call's own options win.
- Public readonly members: `page`, `baseUrl`, `urlPath`, `fullUrl`, `label`, `sessionStorage`, `navigation`, `add`,
  `getLocator`, `getLocatorSchema`, `getNestedLocator`. Protected: `locatorRegistry` (for locator modules:
  `defineLocators(this.locatorRegistry)`), abstract `defineLocators(): void`, optional
  `pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null` (default `[]`).
  **`add`, `getLocator`, `getLocatorSchema`, `getNestedLocator` are public** (L237-263), so tests can call them on a
  page object fixture.
- `fullUrl`: string parts -> `new URL(urlPath, baseUrl).href` (`^` as `%5E`); a RegExp in either part -> `UrlMatcher`
  (L181-196).
- `sessionStorage`: labeled with `label`; string `baseUrl` -> scoped to that origin, `seed()` needs no origin; RegExp
  `baseUrl` -> no origin, works on the page's current origin, `seed()` needs `{ origin }` (L203-210, L341-345).
- `navigation`: `goto()` (this page; only when `fullUrl` is a string), `goto(target)` resolved against `baseUrl`,
  `expectThisPage()`, `expectAnotherPage()` (L211-217).
- Lifecycle: the constructor never calls `defineLocators()`. It is run, then `registry.verify()`, once, in a microtask
  queued as the constructor's last statement, or at the first locator call if earlier (L356-368, L372-407). Errors are
  labeled `<label>: defineLocators() failed: …` or `<label>: <verify message>`, sticky (every later locator call
  rethrows), with the `new` line as the call site. An `async defineLocators()` fails:
  `"<label>: defineLocators() must register its locators synchronously; it returned a Promise. Read what it needs in the constructor or a fixture, and pass it in."`
  (L402-404). => **defineLocators can read constructor arguments and subclass fields** (it runs after the constructor).
- `pageActionsToPerformAfterNavigation()` runs after `navigation.goto()` without a target and after
  `navigation.expectThisPage()`; called each time (reads current state); `{ runPostNavigationActions: false }` skips
  for one call (L430-453).
- URL checks at construction: `baseUrl` string = origin `scheme://host[:port]` (trailing slash allowed); `urlPath`
  string = `""` or starts with exactly one `/`, stays on the origin. Example error:
  `LoginPage: urlPath must be "" or start with exactly one "/"; received "login".` (L272-285).
- Doc-comment example of a base class forwarding options (L99-106):
  `abstract class ShopPage<Paths extends string> extends PageObject<Paths> { protected constructor(page, urlPath, options?: PageObjectOptions) { super(page, "https://shop.example", urlPath, { ...options, locators: { strictChains: true } }); } }`

## The `test` fixture ([src/fixture/base.fixtures.ts](../../src/fixture/base.fixtures.ts))

- `test = base.extend<{ log: PlaywrightReportLogger }>` (L34). `log` is named `TestCase`, checks `locale` and
  `timezoneId` at test start, records `warn`/`error` on a first run and every level on a retry (`initialLogLevel`),
  attaches its entries to the report at the end. Doc example: `export const test = base.extend<{ loginPage: LoginPage }>({ loginPage: async ({ page }, use) => { await use(new LoginPage(page)); } });`

## Registry ([src/locators/locatorRegistry.ts](../../src/locators/locatorRegistry.ts))

- `LocatorRegistry<Paths>` = `createReusable`, `getLocator`, `getLocatorSchema`, `getNestedLocator`, `verify`, `add`
  (L764-801).
- `createRegistryWithAccessors<Paths>(page, { strictChains }?)` returns
  `{ registry, add, getLocator, getNestedLocator, getLocatorSchema }` (bound functions) (L827-838). Without the type
  argument, the first path is a compile error `createRegistryWithAccessors needs its paths as a type argument: createRegistryWithAccessors<Paths>(page)`
  (L47-48). `<string>` accepts any path (loses suggestions and sub-path typing). **A standalone registry must call
  `registry.verify()` itself.**
- `add(path)` -> one of ten locator methods, then `filter`, `nth`, `describe` (L768-797).
  `add(path, { reuse: "other.path" })` registers a copy at once (strategy, steps, explicit description) and returns
  `filter`, `nth`, `describe` only (L271-281). `add(path, { reuse: seed })` registers the seed at once and returns the
  seed's own strategy method (optional, patches like `update`) plus `filter`/`nth`/`describe` (L288-313).
- A registration ends at the next call on its registry (`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`,
  `verify`, a resolution); a later method on it throws, naming the call that ended it (L158-193). `add(path)` without a
  locator method registers nothing and `verify()` reports it:
  `add("…") ended without a locator method (at …); give it one or remove it` (L126-127, L559-561).
- Duplicate path: `A locator schema with the path "…" already exists.` (L339-342).
- `getLocator(path)`: the path's own locator with its own steps, no ancestors, described by the path (L569-589).
- `getNestedLocator(path)`: the chain of registered segments, each with its steps, described by the path
  (= `getLocatorSchema(path).getNestedLocator()`) (L591-610).
- `getLocatorSchema(path)`: a query on a private clone of the chain (L478-506).
- `verify()`: checks every path once without touching the page, all failures in one error
  `Locator registry verification failed for N of M paths:` (L508-567). With `strictChains`, every ancestor must be
  registered: `strictChains requires every ancestor to be registered; "a" and "b" are not.` (L129-133).
- Resolution (`buildLocatorChain`, L616-681): ancestors in chain order, **unregistered or skipped ancestors are left
  out** (a grouping name), each segment = strategy then its steps; a `frameLocator(selector)` segment enters the frame
  (`contentFrame()`) for descendants and is the `<iframe>` element as a terminal; `frameLocator()` without a selector
  = `page.frameLocator()` any-frame, first segment only, no steps, no terminal. The terminal is `.describe(description ?? path)`.
- `filter({ has: "path" })` / `hasNot`: a registered path resolves to **that path's own locator (no ancestors)**;
  cycles detected: `Detected cyclic filter reference while resolving "…": "…".` (L390-435).
- Reuse path same as registration path: compile error for one literal (`InvalidReusePath`), runtime
  `Locator reuse path cannot be the same as registration path: "…".` (L83-108, L273-275).

## Registration builder ([src/locators/locatorRegistrationBuilder.ts](../../src/locators/locatorRegistrationBuilder.ts))

- The ten locator methods: `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`,
  `locator`, `frameLocator`, `getByTestId`, `getById`, each with Playwright's arguments (types are
  `Parameters<Page["…"]>`).
- `getById(id: string | RegExp)`: by the `id` attribute, a string as written without `#`, a RegExp with its flags
  (L717-751). Strings resolve to `[id="…"]` exact; RegExp `internal:attr=[id=/source/flags]`
  ([src/locators/AGENTS.md](../../src/locators/AGENTS.md#contracts)).
- Empty primary rejected only for `locator`, `frameLocator`, `getByRole`, `getById`; stored verbatim for text-like and
  `getByTestId` (AGENTS + L280-751).
- After a strategy: `filter(FilterDefinition)`, `nth(number | "first" | "last")`, `describe(string)` (`""` removes)
  (L32-94). Only one strategy per registration (L851-855). `filter`/`nth`/`describe` before a strategy throws
  `filter() needs a locator strategy first for "…"; call … before it.` (L858-862).
- Seeded override: must use the seed's strategy
  (`The locator definition for "…" must use the "role" strategy when reusing a locator.`), once only (L834-849).
  Arguments follow `update`'s shapes: two args = primary + options patch; a lone object or `null` = options patch
  (JSON Merge Patch, `null` deletes a key) (L768-786).

## Query builder ([src/locators/locatorQueryBuilder.ts](../../src/locators/locatorQueryBuilder.ts))

- `getLocatorSchema(path)` clones every registered segment of the chain at that moment (L64-90).
- Methods (change this query, return it): `update(subPath?)` (same strategy, JSON Merge Patch; returns an update
  builder), `replace(subPath?)` (any strategy, Playwright's argument lists), `filter([subPath,] filter)`,
  `nth([subPath,] index)`, `clearSteps(subPath?)` (removes filter and nth steps of a segment, registered and added),
  `describe(description)` (the terminal only), `skip(ancestor)`, `unskip(ancestor)`; resolve with `getLocator()` (the
  path alone, with this query's steps and description; ancestor changes make no difference) or `getNestedLocator()`
  (L92-467).
- `subPath` must be the path or a registered ancestor: `"x" is not a valid sub-path of "y".` (+ reason) (L469-482).
- `skip`: terminal cannot be skipped (type + runtime); second skip, stray unskip, and update/replace/filter/nth/
  clearSteps on a skipped segment throw (L361-418, L484-490).
- `update` and `replace` never touch steps or description (L92-95, L301-304).

## Seeds ([src/locators/reusableLocatorBuilder.ts](../../src/locators/reusableLocatorBuilder.ts), [types.ts](../../src/locators/types.ts))

- `registry.createReusable.<strategy>(…)` -> `ReusableLocator<Paths, Type>`: `type`, `definition` (copy), `steps`
  (copy), `description`, and `filter`/`nth`/`describe` returning **new** seeds (immutable values, like a Playwright
  `Locator`) (reusable L23-82, types L212-266).
- `createReusable.frameLocator(selector)` requires a selector (L280-298). `createReusable` is not wrapped by the page
  object facade, so it does not trigger `defineLocators()` (pageObject.ts L320).

## Types ([src/locators/types.ts](../../src/locators/types.ts))

- Path rules (compile time for literals, runtime always): not empty, no whitespace, no leading/trailing `.`, no `..`
  (L27-51). A `string` is not checked at compile time.
- `LocatorChainPaths`: the sub-paths a query accepts, per union member (literal segment, template member per matching
  segment, `string` member as any) (L63-80).
- `FilterDefinition<Paths>` = Playwright's `locator.filter()` options (`hasText`, `hasNotText`, `has`, `hasNot`,
  `visible`) with `has`/`hasNot` also accepting a registered path (L284-295).
- `IndexSelector` = `number | "first" | "last"` (L340).
- `OptionsPatch`: a provided key replaces, `null` deletes, absent/`undefined` leaves alone (L309-313).

## Strategies table ([src/locators/utils.ts](../../src/locators/utils.ts#L348))

- `role`→`getByRole` (primary `role`, options, no empty), `text`→`getByText`, `label`→`getByLabel`,
  `placeholder`→`getByPlaceholder`, `altText`→`getByAltText`, `title`→`getByTitle` (primary `text`, options, empty
  allowed), `locator`→`locator` (primary `selector`, options, no empty), `frameLocator` (selector optional, no
  options), `testId`, `id`.
