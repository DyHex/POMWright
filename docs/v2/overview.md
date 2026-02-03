# POMWright v2.0.0 Overview

## 1) What POMWright v2 is (conceptual overview)

POMWright v2 is a TypeScript-first, Playwright companion framework that formalizes the Page Object Model (POM) with a fluent, typed locator registry. It focuses on composability, explicit locator definitions, and ergonomic, strongly typed accessors to create reliable UI automation in large test suites. v2 unifies locator registration and retrieval into a registry API, promotes functional composition over inheritance-heavy patterns, and treats navigation, logging, and session storage as modular helpers that can be adopted independently. The result is a POM framework that is explicit about page structure, predictable in how it chains locators, and easy to scale across domains.

Key ideas:

- **Typed locator paths**: Locator schema paths are a literal union that is validated both at compile time and runtime.
- **Fluent registry DSL**: Locators are registered with a fluent builder (`add(...).getByRole(...).filter(...).nth(...)`).
- **Composable POMs**: `PageObject` is a minimal base class that provides navigation, session storage, and typed locator accessors, but leaves everything else to your own composition.
- **Explicit navigation flows**: URL typing (string vs RegExp) determines available navigation methods and enforces correct usage.
- **Opt-in logging**: Logging is provided as a fixture and can be threaded into POMs only where needed.

---

## 2) Public API feature set (mid-to-high level with complete examples)

This section focuses strictly on the public-facing surface of POMWright v2. Each feature includes a complete code example.

### 2.1 `PageObject` (v2 base class)

`PageObject` wires a Playwright `Page` to the v2 locator registry, navigation helper, and session storage helper. You implement `defineLocators()` and `pageActionsToPerformAfterNavigation()`.

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
import  { type Page, test as base } from "@playwright/test";
import { LoginPage } from "./login.page";

type Fixtures = { loginPage: LoginPage };

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page as Page));
  },
});
```

Test example using the fixture:

```ts
import { test } from "./fixtures";

test("login flow", async ({ loginPage, testData }) => {
  await loginPage.navigation.gotoThisPage();
  await loginPage.loginAsUser(testData.user.alice);
  await loginPage.navigation.expectAnotherPage();
});
```

### 2.2 Typed locator registry: `createRegistryWithAccessors` and `LocatorRegistry`

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
  async gotoThisPage() {
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

```ts
import { test } from "./fixtures";

test("locator helpers", async ({ loginPage }) => {
  const terminal = loginPage.getLocator("main.form@login.input@username");
  // terminal => getByLabel('Username')

  const chained = loginPage.getNestedLocator("main.form@login.input@username");
  // chained => locator('main').getByRole('form', { name: 'Login' }).getByLabel('Username')
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

### 2.6 `update` vs `replace` vs `remove` on the schema builder

- `update(subPath?)` patches an existing definition (PATCH semantics).
- `replace(subPath?)` overwrites a definition (POST semantics).
- `remove(subPath?)` soft-deletes a segment for the builder resolution only.
All of the above mutate the retrieved clone only, leaving the registry original as defined by its add call.

```ts
import { test } from "./fixtures";

test("update/replace/remove", async ({ loginPage }) => {
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

  const removedAncestor = loginPage
    .getLocatorSchema("main.form@login.input@username")
    .remove("main")
    .getNestedLocator();
  // removedAncestor => getByRole('form', { name: 'Login' }).getByLabel('Username')
});
```

### 2.7 Reusable locators: `registry.createReusable`

Reusable locators let you seed a locator definition and steps without immediately registering it, then reuse it across paths with optional PATCH-style overrides. You can also reuse an existing path directly by referencing that path in `{ reuse }`.

```ts
const h1 = registry.createReusable.getByRole("heading", { level: 1 });

registry.add("heading", { reuse: h1 });

registry.add("heading@summary", { reuse: h1 }).getByRole({ name: "Summary" });

// Alternative reuse: clone from an existing registered path, as is.
registry.add("main.form@login.error@invalidPassword", { reuse: "errors.invalidPassword" });

registry.add("main.region@profile.form@changePassword.error@invalidPassword", 
  { reuse: "errors.invalidPassword" });
```

Thus use createReusable if you need a reusable definition as base for creating multiple variations, and reuse by path to reuse an exact locator definition across different DOM-scopes/nesting levels.

### 2.8 Navigation helper: `navigation` (on `PageObject`)

The navigation helper is **only available through `PageObject`**. Its methods depend on the type of `fullUrl` (string vs RegExp). You can return `[]` or `null` from `pageActionsToPerformAfterNavigation()` to skip actions, or provide any number of actions (including Playwright calls or `this.getNestedLocator(...).waitFor(...)` calls).

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
// await loginPage.navigation.gotoThisPage();
// await loginPage.navigation.goto("/profil"); prefixes with this.baseUrl
// await loginPage.navigation.goto("https://anotherDomain.com/");
// await loginPage.navigation.expectThisPage();
// await loginPage.navigation.expectAnotherPage();
```

Only `.gotoThisPage()` and `.expectThisPage()` calls `pageActionsToPerformAfterNavigation`.

### 2.9 `SessionStorage` helper

`SessionStorage` is available via `PageObject.sessionStorage` or direct instantiation.

**Example A — using `LoginPage.sessionStorage` in a test:**

```ts
import { test, expect } from "./fixtures";

test("session storage via PageObject", async ({ loginPage }) => {
  await loginPage.navigation.gotoThisPage();
  await loginPage.sessionStorage.set({ token: "abc" }, { reload: true });
  await loginPage.sessionStorage.setOnNextNavigation({ theme: "dark" });

  const data = await loginPage.sessionStorage.get(["token", "theme"], { waitForContext: true });
  await loginPage.sessionStorage.clear(["token"], { waitForContext: true });

  expect(data.token).toBe("abc");
  expect(data.theme).not.toBe("dark")
  await loginPage.page.reload();
  expect(data.theme).toBe("dark")
});
```

**Example B — custom SessionStorage fixture:**

```ts
import { test as base } from "pomwright";
import type { SessionStorage } from "pomwright";
import { SessionStorage as SessionStorageHelper } from "pomwright";

type Fixtures = { sessionStorage: SessionStorage };

export const test = base.extend<Fixtures>({
  sessionStorage: async ({ page }, use) => {
    await use(new SessionStorageHelper(page, { label: "SessionStorage" }));
  },
});
```

```ts
import { test } from "./fixtures";
import { expect } from "@playwright/test";

test("session storage via custom fixture", async ({ page, sessionStorage }) => {
  await page.goto("https://example.com/login");
  await sessionStorage.set({ token: "abc" });

  const data = await sessionStorage.get(["token"]);
  expect(data.token).toBe("abc");
});
```

### 2.10 `step` decorator

The `step` decorator wraps a method in `test.step` (only works within a Class), defaulting the title to `ClassName.methodName`. Here it is applied to the `LoginPage` helper method from 2.1.

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
- **Contracts**: `defineLocators()` and `pageActionsToPerformAfterNavigation()` are required abstract hooks.

#### `createRegistryWithAccessors` + `LocatorRegistry`

- **Role**: Standalone registry factory returning the registry plus bound helpers.
- **Key outputs**: `registry`, `add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`.
- **Contract**: Typed path unions are validated both at compile time and runtime.

#### Locator builder methods (public usage)

- **Registration**: `add(path).getByRole(...)`, `getByText`, `locator`, `frameLocator`, `getByTestId`, `getById`, etc.
- **Steps**: `filter(...)`, `nth(...)`, `describe(...)`.
- **Retrieval**: `getLocator(path)`, `getNestedLocator(path)`, `getLocatorSchema(path)`.
- **Schema builder**: `update`, `replace`, `remove`, `clearSteps`.

#### Helpers

- **Navigation**: `navigation.goto`, `gotoThisPage`, `expectThisPage`, `expectAnotherPage` (availability depends on string vs RegExp URL typing).
- **SessionStorage**: `set`, `setOnNextNavigation`, `get`, `clear`.
- **Step decorator**: `step`.
- **Logging**: `PlaywrightReportLogger` and `test` fixture.

#### Type exports

- `UrlTypeOptions`, `BaseUrlTypeFromOptions`, `UrlPathTypeFromOptions`, `FullUrlTypeFromOptions`.
- `NavigationOptions`.
- `LocatorRegistry` type.

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

#### `LocatorQueryBuilder`

- **Purpose**: Implements `getLocatorSchema(path)` mutable clones for filters, indices, update/replace/remove, and resolution.
- **Used by**: `LocatorRegistryInternal.getLocatorSchema` (public `getLocatorSchema`).

#### `LocatorUpdateBuilder`

- **Purpose**: Patch/replace logic for locator strategies, with correct overload parsing.
- **Used by**: `LocatorQueryBuilder.update` and `LocatorQueryBuilder.replace` (public schema builder API).

#### `ReusableLocatorFactory` and `ReusableLocatorBuilder`

- **Purpose**: Build reusable locator seeds (definition + steps) without registry mutation.
- **Used by**: `LocatorRegistryInternal.createReusable` and public `{ reuse }` registration flows.

#### Locator types and validation helpers (`types.ts`, `utils.ts`)

- **Purpose**: Encode type-level path validation, locator strategy shapes, steps, and filters.
- **Used by**: All locator registry builders and accessors.
- **Dependencies**:
  - `LocatorSchemaPathFormat` -> compile-time path validation.
  - `validateLocatorSchemaPath` -> runtime path validation.
  - `createLocator` / `applyIndexSelector` -> core chaining mechanics.

#### `createNavigation` + `Navigation` class

- **Purpose**: Provide navigation API and correct type narrowing based on URL type.
- **Used by**: `PageObject` constructor to build `navigation`.

#### `SessionStorage`

- **Purpose**: Manage session storage with robust context handling and Playwright `test.step` reporting.
- **Used by**: `PageObject` (as `sessionStorage`) and can be used directly.

#### `PlaywrightReportLogger` and `test` fixture

- **Purpose**: Create and attach log entries to Playwright HTML reports.
- **Used by**: Public `test` export and optional injection into custom POMs.

#### `addV1SchemaToV2Registry`

- **Purpose**: Migration helper translating v1 `LocatorSchema` objects into v2 registry definitions.
- **Used by**: v1-to-v2 bridge workflows and migration paths.

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
