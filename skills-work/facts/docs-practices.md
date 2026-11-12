# Facts: what the site recommends (the practices a skill should teach)

From the site's Docs section at 7aebcb1 (`website/src/content/docs/docs/`). Page links are repo paths; the live URL is
`https://dyhex.github.io/POMWright/docs/<page>/`. These are the maintainer's documented recommendations: a skill
teaches them as the default path.

## Getting started

- Install: `npm install --save-dev pomwright` (pnpm `pnpm add --save-dev pomwright`, Yarn `yarn add --dev pomwright`);
  start from a Playwright project. Node 20+, `@playwright/test >=1.64.0 <2.0.0` peer. Import everything from
  `pomwright`; deep imports fail `ERR_PACKAGE_PATH_NOT_EXPORTED`. CJS and ESM share one build.
  ([installation.md](../../website/src/content/docs/docs/installation.md))
- TS: no setting required; TS 5.0+; TS 6 needs `"types": ["node"]` in a Playwright project. Decorators: standard or
  `experimentalDecorators`, both work. `noImplicitOverride` requires `override` on
  `pageActionsToPerformAfterNavigation()` (TS4114), never on `defineLocators()`. Docs examples compile with `strict`
  and `noUncheckedIndexedAccess`. (installation.md)
- First page object: `type Paths = …` union; `class LoginPage extends PageObject<Paths>`;
  `constructor(page: Page) { super(page, "https://shop.example", "/login"); }`;
  `protected defineLocators(): void { this.add(...)... }`; action methods use `this.getNestedLocator(path)`.
  ([first-page-object.md](../../website/src/content/docs/docs/first-page-object.md))
- The `@` in `form@login` is a naming convention ("a form, the login one"), not syntax. (first-page-object.md,
  locator-paths.md)
- **Page objects reach tests as fixtures** ("A suite hands page objects to its tests as fixtures instead … Every later
  example on this site gets its page objects that way"). Only *Your first page object* creates one in its test.
  (first-page-object.md note; website/AGENTS.md *Examples*)
- `expectThisPage()` replaces a URL assertion: waits until the browser is on that page. (first-page-object.md)

## Page objects in tests ([page-objects-in-tests.md](../../website/src/content/docs/docs/page-objects-in-tests.md))

- `fixtures.ts`: `import { test as base } from "pomwright"`; `export { expect } from "@playwright/test"`;
  `type PageObjects = { loginPage: LoginPage; accountPage: AccountPage }`;
  `export const test = base.extend<PageObjects>({ loginPage: async ({ page }, use) => { await use(new LoginPage(page)); }, … })`.
  Specs `import { test } from "./fixtures"` and destructure `{ loginPage, accountPage, log }`.
- Re-exporting `expect` from the fixtures file: one import place; under pnpm with `declaration: true` it lets TS name
  Playwright types in `test`'s type.
- Fixtures are per test and lazy; several page objects share the test's `page`, so a test acts on one and waits on
  another in one tab.
- Several fixture files: `mergeTests(pomwright, pageObjects)`.
- A broken page object fails in the fixture before the test body, with its name, every failing path, and the
  fixture's `new` line in the stack.

## Organizing a project ([organizing-a-project.md](../../website/src/content/docs/docs/organizing-a-project.md))

- **A base class per site/application** extends `PageObject` and fixes the origin (e.g. from `process.env.SHOP_URL ?? "https://shop.example"`),
  `navOptions` (e.g. `{ waitUntil: "domcontentloaded" }`), `locators: { strictChains: true }` if wanted, and the
  locators every page shares. Subclasses pass only their path: `super(page, "/account")`. Forward options with
  `PageObjectOptions`.
- A base class that allows RegExp paths and storage schemas: second type parameter `Options extends PageObjectTypeOptions = { urlPathType: string }`
  mapped through `ShopOptions<Options> = { baseUrlType: string; urlPathType: UrlPathTypeFromOptions<Options>; storage: StorageTypeFromOptions<Options> }`.
  Without it, a subclass cannot pass a storage schema (compile error `declare the schema's type in the page object's type options: …, or a base class's options type parameter`).
- **Locator modules** beside page objects: `login.locators.ts` exports `type Paths` and
  `function defineLocators(registry: LocatorRegistry<Paths>)`; the page object's `defineLocators()` calls
  `defineLocators(this.locatorRegistry)`.
- `@step()` on page-object action methods -> report step titled `LoginPage.submit`.
- **Folder layout (one app)**: `fixtures/{automatic/, expects/, shop/shop.fixtures.ts, fixtures.ts}`,
  `page-objects/common/{helpers/, page-components/{dialog/dialog.<name>.locators.ts, common.locators.ts, footer.locators.ts, header.locators.ts}, utils/, shop.page.ts}`,
  `page-objects/pages/<url path folders>/<name>.locators.ts + <name>.page.ts` (a page below another is a folder inside
  it), `tests/` mirrors page objects, `tests/features/` for cross-page features. `fixtures.ts` merges with
  `mergeTests` and `mergeExpects`.
- **Several apps**: the same layout one level down per app (`fixtures/<app>/`, `page-objects/<app>/{common/, pages/}`,
  `tests/<app>/`), `page-objects/common/` for what all apps share, `tests/e2e/` for flows across apps; each app its own
  base class and origin.

## Principles ([principles.md](../../website/src/content/docs/docs/principles.md))

1. Mirror Playwright, add only what it lacks (names for locators, chains, self-checking page objects, typed session
   storage seeded before app load, a report logger).
2. One locator per path, chained by default: a short locator stays unique in context; a structural change fails the
   test instead of finding a similar element elsewhere.
3. Nothing changes behind your back: registrations immutable after the chain; queries are private copies; seeds are
   values.
4. Fail early, at fixture setup.
5. Check at runtime; types where they cost nothing.
6. No hidden state, one meaning per method (`update` keeps strategy, `replace` swaps; `skip` deletes nothing; `null`
   deletes an option, `undefined` = not given). No timeouts/waits of its own.
7. Not a runner, reporter or assertion library; does not structure your suite beyond page object + registry.

## Paths ([locator-paths.md](../../website/src/content/docs/docs/locator-paths.md))

- Segments from outside in; ancestors are prefixes. Names say what and which: `form@login`, `input@email`.
- **List every path in full where you can** (searchable, shown in errors and report). Compose with a template literal
  from a `const` array only when a page repeats an element for enough known values
  (`` `main.toolbar.button@${Action}` `` + loop). An open part `` `main.list.item@${string}` `` accepts any value;
  values must not contain dots (a dot adds segments).
- When the page changes: removed wrapper -> delete its `add` (or rename paths below with find/replace keeping the
  trailing dot); added wrapper -> rename with two replaces and register it; moved element -> replace prefix; changed
  locator -> edit its one `add`; one-test variant -> `skip` in a query. Rename regex:
  find ``(["'`])main\.list(["'`.])`` replace `$1main.items$2`.
- `<string>` registry: accepted, best avoided (loses completions, union check, sub-paths); for runtime-only paths or
  migration.

## Registering ([registering-locators.md](../../website/src/content/docs/docs/registering-locators.md))

- Ten methods = Playwright's (`getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`,
  `getByTitle`, `locator`, `getByTestId`, `frameLocator`, `getById`), same args and types.
  `locator("section.cart", { hasText: "Total" })` renders `locator('section.cart').filter({ hasText: 'Total' })`.
- Steps after the method in any order: `filter`, `nth`, `describe`; applied in chain order at every resolution.
- RegExp pitfalls (Playwright's): with `u`/`v` flag and a quote/apostrophe/backtick, Playwright-built locators break
  once anything follows (POMWright always adds `.describe`), so write the char by code `/don\x27t save/iu` or drop `u`.
  Outside unicode mode, two quote chars in a row or a named group's `>` before `>`: write by code. `getById` handles
  these itself.
- Registered locators never change (copies of options/filters/RegExps); a registration ends at the next registry call
  (so give each registration all its steps in its `add` chain); a registry call inside a step's arguments ends it too
  (resolve the `Locator` before `add`, or pass a path to `has`).
- Order inside `defineLocators()`: a `has`/`hasNot` path is a reference (may be registered later); a reused path is a
  copy (must be registered first).

## Resolving ([resolving-locators.md](../../website/src/content/docs/docs/resolving-locators.md))

- `getNestedLocator(path)`: **for every element you act on or assert**. `getLocator(path)`: a chain you build
  yourself, a locator inside a filter, every match on the page.
- **How much to chain**: register segments a user would recognize (landmark, form, dialog, table), only as many as it
  takes to make the chain unique on the page; layout `div`s are not segments. Too many = fails on changes a user never
  notices; too few = finds a similar element elsewhere.
- Resolve the chain even where the own locator is unique today.
- **Plural paths** for multi-match (`main.list@orders.items`); pick one in a test with `.nth(0)` on the resolved
  locator or a query `getLocatorSchema(...).nth(0).getNestedLocator()` (keeps the path description). A singular path of
  its own (`item@first` via reuse + `nth`) pays off when many tests use that one element.
- Iterate a multi-match chain: `const inputs = getNestedLocator("main.table@cart.inputs@quantity"); await expect(inputs).toHaveCount(n); for (...) await inputs.nth(i).fill(v)`.
- Segments without a locator are grouping names, left out of the chain.

## Filters, indices ([filters-and-indices.md](../../website/src/content/docs/docs/filters-and-indices.md))

- `has`/`hasNot` take a `Locator` or a registered path (path resolves to its own locator without ancestors, since
  Playwright evaluates `has` inside each element). Three ways: a path (shortest, may be registered later, verified), a
  `Locator` resolved before `add` (kept as is, not verified), a chain resolved before `add` (when the filter needs the
  ancestors).
- **An index belongs at the end of a chain that cannot be made unique otherwise**; a filter on what identifies the
  element survives changes an index does not.
- A step for one test goes on a query, not the registration.

## Descriptions ([descriptions.md](../../website/src/content/docs/docs/descriptions.md))

- Every resolved locator is described by its path (report row `Click main.button@login`, assertion `Locator:` line);
  call log and strict-mode errors still show the chain. `describe("…")` replaces it; `describe("")` removes it (prints
  the chain: quickest way to see what a path resolves to). A locator chained further by hand has no description:
  register the path when it is worth a name.

## Queries ([queries.md](../../website/src/content/docs/docs/queries.md))

- `getLocatorSchema(path)` -> private copy; methods chain; resolve with `getNestedLocator()`/`getLocator()`.
  Typical in a page-object method: `order(number) { return this.getLocatorSchema("main.list.item").clearSteps().filter({ hasText: number }).getNestedLocator(); }`.
- Registered `nth` stays unless `clearSteps()` first.
- `update()` table (registered `getByRole("button", { name: "Save", exact: true })`): `update().getByRole("link")`
  replaces role keeps options; `update().getByRole({ name: "Cancel" })` sets one option; `{ name: null }` deletes one;
  `getByRole("button", null)` / `getByRole(null)` deletes all; `undefined` = unchanged; `getByRole(undefined, {...})`
  keeps the role. Another strategy: `update("x") cannot change the strategy from "role" to "locator"; use replace("x").locator(…) instead.`
- `replace(subPath?)` installs any strategy with Playwright's args.
- **Teach `update` before `replace`** (website/AGENTS.md *Principles*).
- A kept query follows state: `wishlistButton.update().getByRole({ name: "Remove from wishlist" })`, then resolve
  again. A query does not end on registry calls. One path + a query can cover every state of a button.
- `skip`/`unskip` for one-use variants.

## Reuse ([reusing-locators.md](../../website/src/content/docs/docs/reusing-locators.md))

- **Reuse by path** = the way to share a locator, also between modules (copy + narrow with filter/nth/describe; no
  strategy override, no clearSteps; source registered first).
- **Seeds** (`createReusable`) = the way to make variants, usually inside one module; one strategy override per path
  (JSON Merge Patch), then steps. Use the seed method's result (`row.nth(0);` alone does nothing).
- A module can hand out a seed typed `ReusableLocator<Paths, "role">`.
- Teach **reuse by path** first (website/AGENTS.md: "reuse by path" is the recommended path).

## Frames ([frames.md](../../website/src/content/docs/docs/frames.md))

- `frameLocator(selector)` = the `<iframe>` element; paths below resolve inside via `contentFrame()`. Tell frames
  apart by their surroundings (register under the distinguishing segment); else steps on the frame segment
  (`nth`, `filter({ visible })`); `hasText` never matches an iframe.
- `frameLocator()` (any frame): first segment only, no steps, not resolvable alone, not a `has` reference.

## Verifying ([verifying-registries.md](../../website/src/content/docs/docs/verifying-registries.md))

- Page objects verify automatically; standalone registries call `registry.verify()`. Finds: unregistered `has` paths,
  cycles, bad references, any-frame placement, `add(path)` without a method. Does not check: selector parse, existence,
  uniqueness, query changes, never-registered never-resolved union members (slots).
- `strictChains: true` (opt-in, typically in the base class): every ancestor registered.

## Locator modules ([locator-modules.md](../../website/src/content/docs/docs/locator-modules.md))

- Module = function registering locators on a registry. A composable module has two signatures: the overload
  `defineLocators<ExternalPaths extends string = never>(registry: LocatorRegistry<Paths | ExternalPaths>): void;` and
  the implementation `defineLocators(registry: LocatorRegistry<Paths>)`. A page's own module (not composed) can drop
  the overload.
- Composing: `import { defineLocators as addHeader, type Paths as Header } from "./header.locators"`; union
  `Header | Footer | …`; call each.
- Dialog naming: `dialog@consent`, `dialog@newsletter`, module `dialog.<name>.locators.ts`.
- **Common locators in the base class**: `ShopPage<Paths> extends PageObject<Paths | CommonPaths>`, base implements
  `defineLocators() { addCommon(this.locatorRegistry); this.definePageLocators(); }` with
  `protected abstract definePageLocators(): void`; shared methods (`acceptCookies`, `openHelp`) live in the base.
  A page module that reuses common paths lists `CommonPaths` in its union.
- Passing state (locale) or the page to a module: extra parameters; works because `defineLocators()` runs after the
  constructor. Prefer a registered path in `has` over a `Locator` (named, verified).
- Sharing between modules: reuse by path.
- **Shared slots**: a path declared in a shared union but registered by each page (`main.heading`); an unfilled slot
  fails only when resolved.
- Module return types: return nothing (block body or `: void`); hand out seeds/queries typed with exported types
  (`ReusableLocator`, `LocatorQueryBuilder`) for `declaration: true`. An arrow returning `registry.add(…).locator(…)`
  leaks an unexported type (TS4023).

## The docs' example app ([website/snippets/](../../website/snippets/))

- `login.page.ts`, `account.page.ts`, `checkout.page.ts`, `orders.page.ts`, `fixtures.ts`: each page object extends
  `PageObject<Paths>` directly with `"https://shop.example"`; `checkout.page.ts` has a value-returning method
  `async orderId(): Promise<string> { return (await this.getNestedLocator("main.text@orderId").textContent()) ?? ""; }`
  (no `@step`) and a `@step() async pay()`. `fixtures.ts` extends POMWright's `test`, re-exports `expect`.

## The harness's page objects ([test/page-object-models/](../../test/page-object-models/))

- Purpose: fixtures for testing POMWright itself, not a style guide. Naming differs from the docs:
  `<name>.locatorSchema.ts` + `<name>.page.ts`, default exports, path aliases `@page-object-models/*`, `@fixtures/*`,
  `@test-data/*`. The docs' recommended naming is `<name>.locators.ts` + `<name>.page.ts`.
- `testApp.base.ts`: the generic base-class pattern with `BaseOptions<Options>` mapping (as on organizing-a-project.md),
  `super(page, "http://localhost:9000", urlPath, options)`.
- `testPath/[color]/` shows a parameter route as a folder `[color]` and `TestApp<Paths, { urlPathType: RegExp }>`.
  Its `color.page.ts` defines its own `expectThisPage()` with manual `test.step` and `waitForURL` instead of using
  `navigation.expectThisPage()` + `pageActionsToPerformAfterNavigation()`: older style, not the docs' path.
- `color.locatorSchema.ts`: template paths over a `const` array of variants
  (`` `${TableVariants}.${TableChildren}` ``) registered in loops.
- Harness locators often use `getById` because the fixture pages are built for the tests; not a model for locator
  choice.

## The README's example ([README.md](../../README.md), 186 lines)

- `OrdersPage extends PageObject<Paths, { storage: typeof ordersStorage }>` with `const ordersStorage = { orders: json<Order[]>() }`
  and a status type `"Open" | … | (string & {})` (known values suggested, any string accepted).
- **The canonical "one row by its text, then an element in it" pattern**: a query on the element's path with a filter
  on the row ancestor: `this.getLocatorSchema("main.table@orders.row.button@cancel").filter("main.table@orders.row", { hasText: order }).getNestedLocator().click()`
  -> `locator('main').getByRole('table', { name: 'Orders' }).getByRole('row').filter({ hasText: 'ORD-1042' }).getByRole('button', { name: 'Cancel' })`.
- `@step()` methods take one options object (`cancel(options: { order: string })`, `expectStatus(options: { order; status })`);
  the verification lives in the page object (`expectStatus` with `expect(cell).toHaveText(status)`).
- The spec: a fixture made inline with `base.extend` from `pomwright`'s `test`; `seed({ orders })`, `log.info(…, { orders })`,
  `navigation.goto()`, then page-object steps.
