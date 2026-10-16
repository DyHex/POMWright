# POMWright v2.0.0 Overview

## 1) What POMWright v2 is (conceptual overview)

POMWright v2 is a TypeScript-first, Playwright companion framework that formalizes the Page Object Model (POM) with a fluent, typed locator registry. It focuses on composability, explicit locator definitions, and ergonomic, strongly typed accessors to create reliable UI automation in large test suites. v2 unifies locator registration and retrieval into a registry API, promotes functional composition over inheritance-heavy patterns, and treats navigation, logging, and session storage as modular helpers that can be adopted independently. The result is a POM framework that is explicit about page structure, predictable in how it chains locators, and easy to scale across domains.

Key ideas:

- **Typed locator paths**: Locator schema paths are a literal union that is validated both at compile time and runtime.
- **Fluent registry DSL**: Locators are registered with a fluent builder (`add(...).getByRole(...).filter(...).nth(...)`).
- **Composable POMs**: `PageObject` is a minimal base class that provides navigation, session storage, and typed locator accessors, but leaves everything else to your own composition.
- **Explicit navigation flows**: URL typing (string vs RegExp) determines available navigation methods and enforces correct usage.
- **Opt-in logging**: Logging is provided as a fixture and can be threaded into POMs only where needed.

### Requirements

- **Node.js 20 or later**, Playwright's own floor (Playwright 1.64 refuses to start on older versions). The package
  declares it in `engines`, so npm warns on an older Node.
- **`@playwright/test` 1.64 or later, below 2.0**, as a peer dependency: install it in your project; POMWright never
  brings its own copy.
- **CommonJS and ESM projects alike.** Playwright's default (no `"type"` in `package.json`) loads the CommonJS build;
  a `"type": "module"` project loads an ESM entry that re-exports that same build, so a test run never holds two
  copies of POMWright, even when some files `import` it and others `require` it. TypeScript picks the matching
  declarations under every `moduleResolution`.
- **Import from the package root only**: `import { PageObject, test } from "pomwright"`. Deep imports such as
  `pomwright/dist/index.js` are not part of the API and do not resolve (`ERR_PACKAGE_PATH_NOT_EXPORTED`);
  `pomwright/package.json` stays available for tools.

---

## 2) Public API feature set (mid-to-high level with complete examples)

This section focuses strictly on the public-facing surface of POMWright v2. Each feature includes a complete code example.

### 2.1 `PageObject` (v2 base class)

`PageObject` wires a Playwright `Page` to the v2 locator registry, navigation helper, and session storage helper. You implement `defineLocators()`, which runs right after the page object is constructed and so can use constructor arguments and fields, and you may override `pageActionsToPerformAfterNavigation()` (no actions by default). See `PageObject.md` for the lifecycle.

```ts
import { expect, type Page } from "@playwright/test";
import { PageObject, step } from "pomwright";
import type { User } from "testData";

type Paths =
  | "common.spinner"
  | "main"
  | "main.button@login"
  | "main.form@login"
  | "main.form@login.input@username"
  | "main.form@login.input@password";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://example.com", "/login", { label: "LoginPage" });
  }

  protected defineLocators(): void {
    this.add("common.spinner").getByTestId("loading-spinner");
    this.add("main").locator("main");
    this.add("main.form@login").getByRole("form", { name: "Login" });
    this.add("main.form@login.input@username").getByLabel("Username");
    this.add("main.form@login.input@password").getByLabel("Password");
    this.add("main.button@login").getByRole("button", { name: "Login" });
  }

  protected pageActionsToPerformAfterNavigation() {
    return [
      async () => {
        await expect(this.getLocator("common.spinner")).toHaveCount(0);
        await this.getNestedLocator("main.form@login").waitFor({ state: "visible" });
      },
    ];
  }

  @step()
  async loginAsUser(user: User) {
    await this.getNestedLocator("main.form@login.input@username").fill(user.username);
    await this.getNestedLocator("main.form@login.input@password").fill(user.password);
    await this.getNestedLocator("main.button@login").click();
  }
}
```

Custom Playwright fixture using the `LoginPage` POC:

```ts
import { test as base } from "@playwright/test";
import { LoginPage } from "./login.page";

type Fixtures = { loginPage: LoginPage };

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

Test example using the fixture:

```ts
import { test } from "./fixtures";

test("login flow", async ({ loginPage, testData }) => {
  await loginPage.navigation.goto();
  await loginPage.loginAsUser(testData.user.alice);
  await loginPage.navigation.expectAnotherPage();
});
```

### 2.2 Typed locator registry: `createRegistryWithAccessors`, `LocatorRegistry` and accessor types

Use this when you want the registry without `PageObject` (e.g., for custom POCs or functional helpers).

**Example — custom POC with `createRegistryWithAccessors` (similar wiring to `PageObject`):**

```ts
import { expect, type Page } from "@playwright/test";
import { 
  type AddAccessor,
  createRegistryWithAccessors,
  type GetLocatorAccessor,
  type GetLocatorSchemaAccessor,
  type GetNestedLocatorAccessor,
  type LocatorRegistry
  step 
} from "pomwright";
import type { User } from "testData";

type Paths =
  | "common.spinner"
  | "main"
  | "main.button@login"
  | "main.form@login"
  | "main.form@login.input@username"
  | "main.form@login.input@password";

export class LoginPage<Paths> {
  public readonly urlPath: string = "/login"
  public readonly page: Page;
  protected readonly locatorRegistry: LocatorRegistry<Paths>;
  public readonly add: AddAccessor<Paths>;
  public readonly getLocator: GetLocatorAccessor<Paths>;
  public readonly getLocatorSchema: GetLocatorSchemaAccessor<Paths>;
  public readonly getNestedLocator: GetNestedLocatorAccessor<Paths>;

  constructor(page: Page) {
    this.page = page;
    const { registry, add, getLocator, getNestedLocator, getLocatorSchema } =
      createRegistryWithAccessors<Paths>(page);
    this.locatorRegistry = registry;
    this.add = add;
    this.getLocator = getLocator;
    this.getNestedLocator = getNestedLocator;
    this.getLocatorSchema = getLocatorSchema;
    this.defineLocators();
  }

  private defineLocators() {
    this.add("common.spinner").getByTestId("loading-spinner");
    this.add("main").locator("main");
    this.add("main.form@login").getByRole("form", { name: "Login" });
    this.add("main.form@login.input@username").getByLabel("Username");
    this.add("main.form@login.input@password").getByLabel("Password");
    this.add("main.button@login").getByRole("button", { name: "Login" });
  }

  @step()
  async loginAsUser(user: User) {
    await this.getNestedLocator("main.form@login.input@username").fill(user.username);
    await this.getNestedLocator("main.form@login.input@password").fill(user.password);
    await this.getNestedLocator("main.button@login").click();
  }

  @step()
  async goto() {
    await this.page.goto(this.urlPath);
    await expect(this.getLocator("common.spinner")).toHaveCount(0);
    await this.getNestedLocator("main.form@login").waitFor({ state: "visible" });
  }
}
```

### 2.3 Locator registration: `add(path)` with fluent steps

Each `add` call registers one locator strategy and any number of ordered steps (`filter` and `nth`).

```ts
add("main").locator("main");
add("main.button@login").getByRole("button", { name: "Login" });
add("main.form@login").getByRole("form", { name: "Login" });
add("main.form@login.input@username").getByLabel("Username");
add("main.form@login.input@password").getByLabel("Password");
add("main.list").locator("ul.list").filter({ hasText: "List" }).nth(0);
add("main.list.item").getByRole("listitem", { name: /Row/ }).filter({ hasText: "Row" }).nth("last");
add("main.frame@login").frameLocator("iframe#login");
add("main.link@forgot").getByText("Forgot password?");
add("main.banner@error").getById("error-banner");
```

### 2.4 Locator retrieval: `getLocator`, `getNestedLocator`

- `getLocator(path)` resolves only the terminal locator (ignores ancestor steps).
- `getNestedLocator(path)` chains each segment along the dot-delimited path.
- Both use the terminal path as the locator description by default; a `.describe(...)` value overrides it. The
  description is what the HTML report's step rows and an assertion's `Locator:` line show; the call log of every
  action and assertion always shows the chain that was tried.
- A path segment without a registration of its own is a name that groups paths and is left out of the chain; with
  `strictChains: true` (an option of `createRegistryWithAccessors` and of a page object) `verify()` requires every
  segment to be registered instead.

```ts
import { test } from "./fixtures";

test("locator helpers", async ({ loginPage }) => {
  const terminal = loginPage.getLocator("main.form@login.input@username");
  // terminal => getByLabel('Username')
  // terminal.description() => "main.form@login.input@username"

  const chained = loginPage.getNestedLocator("main.form@login.input@username");
  // chained => locator('main').getByRole('form', { name: 'Login' }).getByLabel('Username')
  // chained.description() => "main.form@login.input@username"
});
```

### 2.5 Fluent schema mutation: `getLocatorSchema` builder

Use `getLocatorSchema(path)` when you want to patch definitions, append filters, or change indices in a test. `getLocatorSchema(path)` retrieves a clone which all mutations are applied to, thus you can always fetch a new clone of the original from the registry when needed.

```ts
import { test } from "./fixtures";

test("schema builder", async ({ loginPage }) => {
  const updated = loginPage
    .getLocatorSchema("main.form@login.input@username")
    .update("main.form@login.input@username")
    .getByLabel("Username", { exact: true })
    .filter("main.form@login.input@username", { hasText: /User/i })
    .nth("main.form@login.input@username", 0)
    .getNestedLocator();
  // updated =>
  // locator('main').getByRole('form', { name: 'Login' }).getByLabel('Username', { exact: true }).filter({ hasText: /User/i }).first()
});
```

> **Tip:** `filter` accepts Playwright `Locator` instances. That means you can pass locators returned from
> `getLocator(path)`, `getNestedLocator(path)`, or `getLocatorSchema(path)...getLocator/getNestedLocator`, in addition to
> `page.locator(...)` and `page.getBy...(...)`.

### 2.6 `update`, `replace` and `skip` on the schema builder

- `update(subPath?)` patches an existing definition (PATCH semantics).
- `replace(subPath?)` overwrites a definition (POST semantics).
- `skip(subPath)` leaves an ancestor out of the chain, and `unskip(subPath)` brings it back exactly as it was; the
  terminal path cannot be skipped, and a skipped segment rejects changes until it is unskipped.
All of the above change the retrieved clone only, leaving the registry original as defined by its add call; none of
them touches steps or descriptions (`clearSteps()` and `describe("")` take those away).

```ts
import { test } from "./fixtures";

test("update/replace/skip", async ({ loginPage }) => {
  const patched = loginPage
    .getLocatorSchema("main.button@login")
    .update()
    .getByRole({ name: "Sign in" })
    .getNestedLocator();
  // patched => locator('main').getByRole('button', { name: 'Sign in' })

  const replaced = loginPage
    .getLocatorSchema("main.button@login")
    .replace()
    .locator("button.primary", { hasText: "Sign in" })
    .getNestedLocator();
  // replaced => locator('main').locator('button.primary').filter({ hasText: 'Sign in' })

  const skippedAncestor = loginPage
    .getLocatorSchema("main.form@login.input@username")
    .skip("main")
    .getNestedLocator();
  // skippedAncestor => getByRole('form', { name: 'Login' }).getByLabel('Username')
});
```

### 2.7 Reusable locators: `registry.createReusable`

A registered path can be reused at another path: `add(path, { reuse: "other.path" })` registers a copy (strategy,
steps, an explicit description) and returns `filter`, `nth` and `describe` to narrow it. A seed from `createReusable`
holds a definition and steps without registering them; it is a value, like a Playwright `Locator` (`filter`, `nth` and
`describe` return a new seed), and `add(path, { reuse: seed })` registers it with one optional override of its
strategy, patched as `update()` patches.

```ts
// reuse by path: the preferred way to share a locator, across locator modules too
registry.add("errors.invalidPassword").getByText("Invalid password");
registry.add("main.form@login.error@invalidPassword", { reuse: "errors.invalidPassword" });
registry.add("main.region@profile.form@changePassword.error@invalidPassword", { reuse: "errors.invalidPassword" })
  .describe("Password change error");

// seeds: variants with other options, usually inside one locator module
const h1 = registry.createReusable.getByRole("heading", { level: 1 });
registry.add("heading", { reuse: h1 });
registry.add("heading@summary", { reuse: h1 }).getByRole({ name: "Summary" });
registry.add("heading@first", { reuse: h1.nth(0) });
```

Use reuse by path to share a locator, narrowed where needed with `filter`, `nth` and `describe`, across DOM scopes,
nesting levels and locator modules; use `createReusable` for a base with variants that change its options, mainly
within one locator module (a seed can still be exported and imported).

### 2.8 Navigation helper: `navigation` (on `PageObject`)

The navigation helper is **only available through `PageObject`**. Which `goto` forms exist depends on the URL types:
`goto()` without a target needs a string `fullUrl`, `goto(target)` always exists and takes only absolute URLs on a
RegExp `baseUrl`, and `expectThisPage` / `expectAnotherPage` always exist. Override
`pageActionsToPerformAfterNavigation()` to provide any number of actions (including Playwright calls or
`this.getNestedLocator(...).waitFor(...)` calls); omit it when there are none (`[]` and `null` also mean none).

Below is the same `LoginPage` example from 2.1:

```ts
protected pageActionsToPerformAfterNavigation() {
  return [
    async () => {
      await expect(this.getLocator("common.spinner")).toHaveCount(0);
      await this.getNestedLocator("main.form@login").waitFor({ state: "visible" });
    },
  ];
}

// Usage:
// await loginPage.navigation.goto();                          // this page, runs the actions
// await loginPage.navigation.goto("/profile");                // resolved against this.baseUrl, no actions
// await loginPage.navigation.goto("https://another.example/"); // absolute, no actions
// await loginPage.navigation.expectThisPage();                // waits for the URL and load state, runs the actions
// await loginPage.navigation.expectAnotherPage();             // waits until the URL has left this page
```

Only `goto()` without a target and `expectThisPage()` call `pageActionsToPerformAfterNavigation`, each time they run;
both accept `{ runPostNavigationActions: false }`. See `PageObject.md` for the options, timeouts, and failure messages.

### 2.9 `SessionStorage` helper

`SessionStorage` is Playwright's `page.sessionStorage` with batches, step titles, origin checks, per-key codecs,
and `seed`, which stores entries for an origin before the app's next load there, whatever navigation takes the page
there. It is available as `PageObject.sessionStorage` or by direct construction. Values are strings unless a codec
is declared for the key. See `session-storage.md` for the full contract.

**Example A — a page object with a declared key, seeding before the first load:**

```ts
import type { Page } from "@playwright/test";
import { json, PageObject } from "pomwright";

type User = { name: string; age: number };
const loginStorage = { user: json<User>() };

class LoginPage extends PageObject<Paths, { storage: typeof loginStorage }> {
  constructor(page: Page) {
    super(page, "https://app.example", "/login", { sessionStorage: { schema: loginStorage } });
  }
  // defineLocators …
}

test("session storage via PageObject", async ({ loginPage }) => {
  await loginPage.sessionStorage.seed({ token: "abc", user: { name: "Ada", age: 36 } }); // pending for the origin
  await loginPage.navigation.goto(); // the app's first script already sees both

  const user = await loginPage.sessionStorage.get("user"); // User | null
  const { token } = await loginPage.sessionStorage.get(["token"]); // { token: string | null }
  await loginPage.sessionStorage.clear("token");
  expect(user?.name).toBe("Ada");
  expect(token).toBe("abc");
});
```

**Example B — a standalone helper as a fixture:**

```ts
import { type Codec, json, SessionStorage, test as base } from "pomwright";

type Fixtures = { storage: SessionStorage<{ user: Codec<User> }> };

export const test = base.extend<Fixtures>({
  storage: async ({ page }, use) => {
    await use(
      new SessionStorage(page, { label: "Storage", origin: "https://app.example", schema: { user: json<User>() } }),
    );
  },
});
```

```ts
import { test } from "./fixtures";
import { expect } from "@playwright/test";

test("session storage via custom fixture", async ({ page, storage }) => {
  await page.goto("https://app.example/login");
  await storage.set({ token: "abc" });
  expect(await storage.get("token")).toBe("abc");
});
```

### 2.10 `step` decorator

The `step` decorator wraps a method in `test.step` (only works within a Class), defaulting the title to `ClassName.methodName`, for a static method too. Here it is applied to the `LoginPage` helper method from 2.1.

The method must return a Promise, as an `async` method does: `test.step` always returns one and runs the body after
the caller's current line, so a decorated method that returned a plain value would hand its caller a Promise typed as
that value. TypeScript therefore rejects `@step` on such a method, with
`"@step decorates methods that return a Promise: make the method async"` in the error.

```ts
import { step } from "pomwright";
import type { User } from "somewhere";

class LoginPage {
  @step()
  async loginAsUser(user: User) {
    // ...
  }
}
```

@step supports all the same arguments as playwright test.step

### 2.11 Logging: `PlaywrightReportLogger` and `test` fixture

POMWright v2 exports a `test` fixture that injects a `log` instance. You can also create loggers manually or add a child of the log fixture to each of your POCs if you want.

```ts
import { test, expect } from "pomwright";

test("logs are attached to the HTML report", async ({ page, log }) => {
  log.info("navigating to login");
  await page.goto("https://example.com/login");
  expect(page.url()).toContain("/login");
});
```

---

## 3) Public vs internal API (technical breakdown)

This section separates public API from internal implementation details and explains how internal pieces support the public surface.

### 3.1 Public API (what users import and rely on)

#### `PageObject`

- **Role**: Base class that binds locators, navigation, and session storage to a Playwright `Page`.
- **Key members**: `add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`, `navigation`, `sessionStorage`.
- **Contracts**: `defineLocators()` is the one required hook; it runs once, right after construction or at the first
  locator call, and the registry is verified right after it. `pageActionsToPerformAfterNavigation()` is optional and is
  called each time the post-navigation actions run.

#### `createRegistryWithAccessors` + `LocatorRegistry`

- **Role**: Standalone registry factory returning the registry plus bound helpers.
- **Key outputs**: `registry` (with `verify()`), `add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`.
- **Contract**: Typed path unions are validated both at compile time and runtime; every strategy's first argument is
  required at the call; a standalone registry calls `registry.verify()` once registration is done, where a
  `PageObject` does so itself after `defineLocators()`. `createRegistryWithAccessors(page, { strictChains: true })`
  makes `verify()` require every ancestor of every path to be registered.

#### Locator builder methods (public usage)

- **Registration**: `add(path).getByRole(...)`, `getByText`, `locator`, `frameLocator(selector)` (the `<iframe>`
  element; descendants resolve inside), `frameLocator()` (Playwright's any-frame locator), `getByTestId`, `getById`, etc.
- **Steps**: `filter(...)`, `nth(...)`, `describe(...)`, available once a strategy is chosen, on frames too.
- **Retrieval**: `getLocator(path)`, `getNestedLocator(path)`, `getLocatorSchema(path)`.
- **Schema builder**: `update` (same strategy, JSON Merge Patch with `null` to delete), `replace` (any strategy),
  `skip`/`unskip` (leave an ancestor out of the chain and bring it back), `clearSteps`.

#### Helpers

- **Navigation**: `navigation.goto()` (this page, string `fullUrl` only), `goto(target)`, `expectThisPage`, `expectAnotherPage`; the `goto` forms depend on the string vs RegExp URL typing.
- **SessionStorage**: `set`, `get`, `clear`, `seed`, each taking a key or a record; values typed by the codecs declared
  in the schema (`json<T>()`, `Codec<T>`).
- **Step decorator**: `step`.
- **Logging**: `PlaywrightReportLogger` and `test` fixture.

#### Type exports

- `PageObjectTypeOptions`, `BaseUrlTypeFromOptions`, `UrlPathTypeFromOptions`, `FullUrlTypeFromOptions`,
  `StorageTypeFromOptions`, and `PageObjectOptions`, the constructor's options, for a domain base class that forwards
  them.
- `Codec`, `SessionStorageSchema`, and the `json` codec.
- `NavigationOptions`, `ThisPageOptions`, `NavigationFor`, `UrlMatcher`.
- `LocatorRegistry`, `LocatorRegistryOptions` (the `strictChains` option), the accessor types, and what the registry
  hands out: `LocatorQueryBuilder`,
  `LocatorUpdateBuilder`, `ReusableLocator`, `FilterDefinition`, `IndexSelector`, `LocatorSchemaPathFormat` and
  `LocatorSchemaPathArgument` (see *Types you can import* in `locator-registry.md`).

### 3.2 Internal API (implementation details and dependencies)

This is not intended for direct usage but explains the building blocks used by the public API.

#### `LocatorRegistryInternal`

- **Purpose**: Stores locator schemas and implements resolution logic.
- **Used by**: `createRegistryWithAccessors`, `PageObject` (via factory), and all public locator accessors.
- **Key responsibilities**:
  - Registration and replacement of schema records.
  - Path validation and error handling.
  - Locator chain resolution (`buildLocatorChain`).

#### `LocatorRegistrationBuilder`

- **Purpose**: Implements `add(path)` fluent chaining and enforces the “one locator strategy per registration” rule.
- **Used by**: `LocatorRegistryInternal.add` (public `add` method returns its fluent surface).

#### `LocatorQueryBuilderInternal` (public type `LocatorQueryBuilder`)

- **Purpose**: Implements `getLocatorSchema(path)` mutable clones for filters, indices, update/replace, skip/unskip, and resolution.
- **Used by**: `LocatorRegistryInternal.getLocatorSchema` (public `getLocatorSchema`).

#### `LocatorUpdateBuilderInternal` (public type `LocatorUpdateBuilder`)

- **Purpose**: Patch/replace logic for locator strategies, with correct overload parsing; a `Mode` type parameter
  gives `replace` Playwright's own argument lists.
- **Used by**: `update` and `replace` of the query builder (public schema builder API).

#### `ReusableLocatorFactory` and `ReusableLocatorBuilder`

- **Purpose**: Build reusable locator seeds (definition + steps) without registry mutation; a seed's public type is
  `ReusableLocator`.
- **Used by**: `LocatorRegistryInternal.createReusable` and public `{ reuse }` registration flows.

#### Locator types and validation helpers (`types.ts`, `utils.ts`)

- **Purpose**: Encode type-level path validation, locator strategy shapes, steps, and filters.
- **Used by**: All locator registry builders and accessors.
- **Dependencies**:
  - `LocatorSchemaPathFormat` -> compile-time path validation.
  - `validateLocatorSchemaPath` -> runtime path validation.
  - `createLocator` / `applyIndexSelector` -> core chaining mechanics.

#### `createNavigation` + `Navigation` class

- **Purpose**: Provide the navigation API (one `page.waitForURL` per wait) and the type narrowing based on URL type.
- **Used by**: `PageObject` constructor to build `navigation`.
- **Dependencies**: `src/helpers/url.ts` for validation, `new URL` resolution, and the `UrlMatcher`.

#### `SessionStorage`

- **Purpose**: Playwright's `page.sessionStorage` with batches, step titles, origin checks, per-key codecs, and the
  deferred `seed`. The seed registry in `src/helpers/sessionStorageSeed.ts`, one per page, registers a route and two
  listeners only while a seed is pending and removes them once it is applied.
- **Used by**: `PageObject` (as `sessionStorage`) and can be used directly.

#### `PlaywrightReportLogger` and `test` fixture

- **Purpose**: Create and attach log entries to Playwright HTML reports.
- **Used by**: Public `test` export and optional injection into custom POMs.

---

## 4) Glossary (quick reference)

- **Locator schema path**: Or just "Paths", is a Dot-delimited string union defining a page structure, e.g. `"main.form.submit"` and is the key to a unique Locator definition.
- **Terminal locator**: The locator produced by resolving only the last path segment of the full path.
- **Nested locator**: The locator produced by chaining all segments in a path.
- **Filter step**: A recorded `locator.filter(...)` operation applied in sequence.
- **Index step**: A recorded `first`, `last`, or `nth(n)` applied in sequence.
- **Reusable locator**: A seed definition (strategy + steps) that can be reused across paths via `{ reuse }`.

---

## 5) Suggested next documents

This overview pairs with more focused documents:

- `docs/v1-to-v2-migration` (migration guide, API differances and similarities)
- `docs/v2/PageObject.md` (Indepth documentation of the PageObject Class)
- `docs/v2/locator-registry.md` (Indepth documentation of locator registry and all its methods)
- `docs/v2/session-storage.md` (Indepth documentation of SessiosStorage and its methods)
- `docs/v2/logging.md` (Indepth documentation of PlaywrightReportLogger/log fixture)
