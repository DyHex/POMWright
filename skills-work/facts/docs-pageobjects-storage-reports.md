# Facts: page objects, navigation, session storage, logging, steps, TypeScript (site Docs section)

From `website/src/content/docs/docs/` at 7aebcb1. Practices the skills teach are marked **Practice**.

## Page objects ([page-objects.md](../../website/src/content/docs/docs/page-objects.md))

- Anatomy: `PageObject<Paths>` (+ optional `PageObjectTypeOptions`), `super(page, baseUrl, urlPath, options?)` with
  `label`, `navOptions`, `sessionStorage`, `locators`. `defineLocators()` is the one required method. A page object
  offers `add`, `getNestedLocator`, `getLocator`, `getLocatorSchema`, `page`, `baseUrl`, `urlPath`, `fullUrl`, `label`,
  `navigation`, `sessionStorage`; its registry is `this.locatorRegistry`.
- **Practice**: action methods decorated `@step()`, e.g. `@step() async logIn(email, password) { await this.getNestedLocator("…email").fill(email); … }`.
- `defineLocators()` runs once after the `new` expression finishes (or at the first locator call), then `verify()`. It
  can read constructor args, parameter properties (`private readonly locale`), fields.
- It cannot see: a value assigned after an `await` following `new` (pass it to the constructor); what is set after a
  field that resolves a locator (`readonly submit = this.getNestedLocator(…)` runs the definition too early) —
  **Practice: a getter** `get submit() { return this.getNestedLocator("…"); }` is always safe; anything it would
  `await` (read it in the fixture, pass to the constructor).
- Check arguments **before** `super(…)` when a subclass constructor validates (otherwise a scheduled definition runs on
  a half-built object and reports a second error).
- Where a page object is built: fixture -> test fails before body (best); `beforeEach`/`beforeAll`/test body -> later.
  `new` itself never throws for a registry mistake; to assert one, use it synchronously right after `new`.
- `pageActionsToPerformAfterNavigation()`: optional, returns `[async () => { await expect(this.getNestedLocator("main.spinner")).toBeHidden(); }]`;
  runs after `navigation.goto()` (no target) and `navigation.expectThisPage()`; skip per call with
  `{ runPostNavigationActions: false }`; `override` needed under `noImplicitOverride`.
- One registry per page object instance; definitions can depend on instance state.

## URLs and navigation ([urls-and-navigation.md](../../website/src/content/docs/docs/urls-and-navigation.md))

- Each page object has its own `baseUrl` (origin) and `urlPath`, so one Playwright project can test several sites with
  no shared `baseURL`.
- Validation messages, e.g. `LoginPage: baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "shop.example".`
- Credentials in `baseUrl` work but leak into reports and break `toHaveURL`: **Practice** use Playwright's
  `httpCredentials`.
- `fullUrl` table: `"https://shop.example"` + `""` -> `https://shop.example/`; `"/søk"` -> `/s%C3%B8k`.
- `navigation`: `goto(options?)` (to `fullUrl`, then actions), `goto(target, options?)` (resolved against `baseUrl`
  like Playwright's `baseURL`; absolute URL as is; never runs actions), `expectThisPage(options?)` (one
  `page.waitForURL`, then actions), `expectAnotherPage(options?)` (wait for any other URL, then check it did not come
  straight back). Each call is a report step `LoginPage: Navigate to this Page`, `LoginPage: Expect this Page`, …
- A page's identity is its exact URL (`/orders?tab=1` ≠ `/orders`). Calling `expectThisPage()` after a navigation that
  already landed is fine.
- Options: `{ waitUntil?, timeout? }`; precedence call > `navOptions` > Playwright (`load`, `navigationTimeout`).
  POMWright sets no timeout of its own; one waiting call per method.
- Timeout messages: `OrdersPage: expected URL "…"; found "…" (page.waitForURL: Timeout 15000ms exceeded.)` etc.
- **Pages whose URL varies**: RegExp `baseUrl` and/or `urlPath`, declared in the type options
  (`PageObject<"main", { urlPathType: RegExp }>`, `super(page, "https://shop.example", /^\/account\/\d+$/)`).
  `fullUrl` becomes a `UrlMatcher` (origin tested by base, rest by path; works in `waitForURL`, `toHaveURL`, `route`).
  `goto()` without a target is unavailable (compile error); `goto(target)` works; on a RegExp `baseUrl` the target must
  be absolute (`` goto(url as `https://${string}`) ``). Varying query: RegExp path; fixed query: string path.

## Session storage ([session-storage.md](../../website/src/content/docs/docs/session-storage.md))

- `SessionStorage` = `page.sessionStorage` + batches, a report step per call (`LoginPage.SessionStorage.set:`), origin
  checks, codecs, `seed`.
- Values are strings, stored verbatim; codecs `{ parse, stringify }` for structured values; `json<T>()` is the one
  shipped codec. `get` returns `null` for missing.
- Standalone: `new SessionStorage(page, { label: "Shop", origin: "https://shop.example", schema: { user: json<User>() } })`.
  Undeclared keys must be strings. `json<string>()` for storage layers that JSON-encode strings.
- Custom codec example: `const number = (): Codec<number> => ({ parse: (raw) => {…}, stringify: (value) => String(value) })`.
- Methods: `set(key, value)`, `set({…})`, `get()` (all), `get(key)`, `get([keys])`, `clear(key)`, `clear([keys])`,
  `clear()`. Literal `[]` is a compile error.
- Origin checks around every storage call; a navigation during a call fails it (message names keys done/in flight).
  Calls for one origin act in call order, also when overlapping, across helpers on the page.
- **Through a page object**: `const accountStorage = { user: json<{ name: string; age: number }>() };`
  `class AccountPage extends PageObject<"main", { storage: typeof accountStorage }> { constructor(page) { super(page, "https://shop.example", "/account", { sessionStorage: { schema: accountStorage } }); } … }`.
  **Practice**: write the schema once as a value, take the type from it, pass the value. Known gaps (issue #58): a
  declared type without a passed value, and a schema via a variable with an undeclared codec, still compile.
- A page object's helper (string `baseUrl`) refuses other origins. A helper without an origin works on whatever origin
  the page is on; before the first navigation every call fails (`the page has no origin yet (about:blank); navigate to the origin first or use seed()`).
- **As a fixture**: `base.extend<{ storage: SessionStorage<{ user: Codec<User> }> }>({ storage: async ({ page }, use) => { await use(new SessionStorage(page, { label: "Shop", origin: "https://shop.example", schema: { user: json<User>() } })); } })`.
- **When the app navigates by itself**: wait for where the app ends up (`expectThisPage()`, or a visible element when
  the URL does not change), then call; or `seed` before the navigation. A wait every test needs goes in the page
  object's actions after navigation. Retrying the storage call (`toPass`) does not help.
- Cost: one round trip per key + a document check; quota 5,242,880 chars per origin.

## Seeding ([seeding-session-storage.md](../../website/src/content/docs/docs/seeding-session-storage.md))

- `seed` stores entries for an origin before the app's next load there (init script, first arrival only, removed
  after). On the origin already: writes at once. Never intercepts navigation.
- **Practice**: `await loginPage.sessionStorage.seed({ token: "eyJ…" }); await loginPage.navigation.goto();`.
  Seed every origin first when known up front (standalone `new SessionStorage(page, { label: "Login", origin: "https://login.example" })`
  for other origins); seed the next origin before the hop when learned on the way.
- **Always `await` seed before the action that starts the hop**; typescript-eslint `no-floating-promises` finds a
  missing await. Calls for one origin merge (later wins per key). `Promise.all` of seeds for several origins is fine.
- Cannot: a seed still pending when the page closes fails the test (**do not seed in a fixture that some tests never
  use**); a new tab (use `browserContext.addInitScript` or set + reload); seeding after the document committed
  (`await link.click()`) writes too late; failed navigation, sandboxed document, no Navigation API, quota.
- A RegExp-`baseUrl` page object's `seed` needs `{ origin }`.

## Logging ([logging.md](../../website/src/content/docs/docs/logging.md))

- `log` fixture: entries attached to the test, one attachment per entry, named `11:39:57 PM 10/16/2026 - WARN : [TestCase]`
  in Playwright's `locale`/`timezoneId`.
- Levels `debug`, `info`, `warn`, `error`; the fixture records from `warn` on the first run and from `debug` on a retry.
  `setLogLevel`, `resetLogLevel`, `getCurrentLogLevel`, `isCurrentLogLevel`, `isLogLevelEnabled`.
- Messages/strings attached as written; other values as `console.log` prints them (depth 2; pass
  `JSON.stringify(data, null, 2)` for all of it); a message that is a JSON object/array alone is `application/json`.
- `locale` must be a BCP 47 tag (`en-US`, not `en_US`): `log fixture: locale "en_US" is not a BCP 47 language tag; …`.
- **Child loggers**: `log.getNewChildLogger("CheckoutPage")` shares entries and level; named `[TestCase -> CheckoutPage]`;
  a page object takes the test's `log` in its constructor and its fixture passes it:
  `checkoutPage: async ({ page, log }, use) => use(new CheckoutPage(page, log))`.
- Entries logged after the fixture attached them are lost; a fixture logging in teardown depends on `log` so it is
  torn down first.
- **Your own fixture**: `base.extend<{ log: PlaywrightReportLogger }>({ log: async ({ locale, timezoneId }, use, testInfo) => { const level: LogLevel = testInfo.retry === 0 ? "warn" : "debug"; const entries: LogEntry[] = []; const log = new PlaywrightReportLogger({ current: level, initial: level }, entries, "TestCase"); await use(log); log.attachLogsToTest(testInfo, { locale, timeZone: timezoneId }); } })`.
  Variant: record everything, keep only warn/error when `testInfo.status === testInfo.expectedStatus`.

## Steps ([test-steps.md](../../website/src/content/docs/docs/test-steps.md))

- `@step()` wraps a method in `test.step`, titled `ClassName.methodName` (the runtime class, so inherited methods show
  the subclass name). Works on any class, generic and static methods.
- `@step("Title")`, `@step({ box: true })` (error points at the caller), `@step("Title", { timeout: 10_000 })`.
- Only methods that return a Promise (compile error otherwise; `TypeError` at runtime from JS).
- Await on the line that calls for the step to be reported at that line.
- Shared config: `export const boxedStep: StepDecorator = step({ box: true });` then `@boxedStep`.
- Standard and legacy (`experimentalDecorators`) decorators both work.

## TypeScript ([typescript.md](../../website/src/content/docs/docs/typescript.md))

- Most code needs no annotations. Every type imported from `pomwright`. What `add(path)` returns is not exported by
  design.
- Naming: `LocatorQueryBuilder<Paths, "list.items">`, `FilterDefinition<Paths>`, `ReusableLocator<Paths, "role">`.
- **Generic base class helpers take paths as `LocatorSchemaPathArgument<Path>`**:
  `protected async clickOn<Path extends Paths>(path: LocatorSchemaPathArgument<Path>) { await this.getNestedLocator(path).click(); }`
  (a plain-union parameter does not compile there).
- `declaration: true`: never return a registration (TS4023); under pnpm, import from `@playwright/test` in a module
  that exports a value holding Playwright types (TS2883), e.g. re-export `expect` in the fixtures file.

## Upgrading from 2.x ([upgrading-from-2x.md](../../website/src/content/docs/docs/upgrading-from-2x.md))

- Section list (for a migration/review skill): requirements (PW 1.64, Node 20, root imports); locators
  (`createRegistryWithAccessors<Paths>`, `getById` verbatim, `getById(RegExp)`, frame steps apply, `update` keeps
  strategy / `replace` changes it, `update` deletes with `null`, `replace` takes Playwright args, first argument
  required, steps after strategy, registration ends at next call, `remove` -> `skip`/`unskip`, seeds immutable, reuse by
  path returns filter/nth/describe, page objects verified, JS `describe`/`nth`); page objects (`defineLocators()` after
  constructor, `pageActionsToPerformAfterNavigation()` optional, `UrlTypeOptions` -> `PageObjectTypeOptions`); URLs
  (`goto()` replaces `gotoThisPage()`, `waitForLoadState` -> `waitUntil`, URLs checked at construction, RegExp
  `fullUrl` is `UrlMatcher`, waits end at navigation timeout); session storage (values as written, `seed` replaces
  `setOnNextNavigation`, `waitForContext`/`reload` gone, `get` null for missing, page object helper stays on origin);
  reports (`@step` needs Promise-returning methods, log attachments keep what was logged). Each item has a grep. Not
  yet read in full: read it fully before writing a migration skill.

## Signatures from the source ([src/helpers/](../../src/helpers/))

- `class SessionStorage<S extends SessionStorageSchema = Record<never, never>>`; constructor
  `(page, options?: { label?, origin?, schema? })`; with an explicit schema type, `schema` (a codec per key) is required
  ([sessionStorage.ts#L331-L361](../../src/helpers/sessionStorage.ts#L331)). Step/error prefix `Shop.SessionStorage.set:`.
- `set(key, value)`, `set(entries)`; `get()`, `get(key)` -> `Decoded | null`, `get(keys)` -> record;
  `clear()`, `clear(key)`, `clear(keys)`; `seed(key, value, options?)`, `seed(entries, options?)` with
  `SeedOptions = { origin?: string }` (sessionStorage.ts L669-851, L147-155).
- `Codec<T> = { parse(raw: string): T; stringify(value: T): string }`; `json<T>()`; `SessionStorageSchema = Record<string, Codec<unknown>>`.
- `NavigationOptions = { waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit"; timeout?: number }`;
  `ThisPageOptions = NavigationOptions & { runPostNavigationActions?: boolean }`. A function that takes any page
  object's helper types it `NavigationFor<RegExp, UrlMatcher>` ([navigation.ts#L42-L175](../../src/helpers/navigation.ts#L42)).
- `step()` overloads: `step()`, `step(title)`, `step(options)`, `step(title, options)` ([stepDecorator.ts#L187](../../src/helpers/stepDecorator.ts#L187)).
- `LogLevel = "debug" | "info" | "warn" | "error"`; `initialLogLevel(retry) = retry === 0 ? "warn" : "debug"`
  ([playwrightReportLogger.ts#L10-L29](../../src/helpers/playwrightReportLogger.ts#L10)).
