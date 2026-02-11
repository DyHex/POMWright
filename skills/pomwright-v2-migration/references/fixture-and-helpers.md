# Fixtures and Helpers: Navigation, SessionStorage, @step, Logging

## Fixture migration

v1 fixtures inject `page`, `log`, and `testInfo` into PageObject constructors. v2 fixtures only inject `page`.

```ts
// v1
import TestPage from "./testPage.page";
import { test as base } from "pomwright";

type Fixtures = {
  testPage: TestPage;
};

const test = base.extend<Fixtures>({
  testPage: async ({ page, log }, use, testInfo) => {
    const testPage = new TestPage(page, testInfo, log);
    await use(testPage);
  },
});

export { test };

// v2
import TestPage from "./testPage.page";
import { test as base } from "pomwright";

type Fixtures = {
  testPage: TestPage;
};

const test = base.extend<Fixtures>({
  testPage: async ({ page }, use) => {
    const testPage = new TestPage(page);
    await use(testPage);
  },
});

export { test };
```

Key changes:
- Remove `testInfo` parameter from fixture callback (no longer needed by PageObject).
- Remove `log` parameter from fixture callback (no longer injected into PageObject).
- Constructor call simplified to `new TestPage(page)`.
- The `log` fixture from `pomwright` is still available in tests if needed for test-level logging.

## Navigation helper

v2 `PageObject` exposes a `navigation` property with URL-based navigation methods. This replaces manual `page.goto()` patterns from v1.

### Available when fullUrl is string (baseUrl: string, urlPath: string)

```ts
// Navigate to the PageObject's own URL
await poc.navigation.gotoThisPage();

// Navigate to a different path under the same baseUrl
await poc.navigation.goto("/other-path");

// Assert current page matches this PageObject's URL
await poc.navigation.expectThisPage();

// Assert current page does NOT match this PageObject's URL
await poc.navigation.expectAnotherPage();
```

### Available when fullUrl is RegExp (baseUrl or urlPath is RegExp)

```ts
// Only assertion methods available (no goto - can't construct URL from RegExp)
await poc.navigation.expectThisPage();
await poc.navigation.expectAnotherPage();
```

### Navigation options

```ts
// At construction time (defaults for all navigation calls)
super(page, "https://example.com", "/login", {
  navOptions: {
    waitUntil: "networkidle",
    waitForLoadState: "domcontentloaded",
  },
});

// Per navigation call (overrides defaults)
await poc.navigation.gotoThisPage({
  waitUntil: "commit",
  waitForLoadState: "load",
});
```

### Post-navigation actions

The `pageActionsToPerformAfterNavigation()` method runs automatically after `navigation.gotoThisPage()` and `navigation.goto()`:

```ts
protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
  return [
    async () => {
      // Wait for page to be ready
      await this.getNestedLocator("main.spinner").waitFor({ state: "hidden" });
    },
    async () => {
      // Additional setup
      await this.getNestedLocator("main.content").waitFor({ state: "visible" });
    },
  ];
}
```

### Migration from v1 navigation patterns

```ts
// v1 (manual navigation in tests)
test("login flow", async ({ loginPage }) => {
  await loginPage.page.goto(loginPage.fullUrl);
  await loginPage.page.waitForLoadState("networkidle");
  // ... test logic
});

// v2 (navigation helper)
test("login flow", async ({ loginPage }) => {
  await loginPage.navigation.gotoThisPage();
  // post-navigation actions run automatically
  // ... test logic
});
```

## SessionStorage helper

Available on PageObject as `this.sessionStorage`. API changed from v1.

### Constructor

```ts
// v1: SessionStorage was instantiated internally by BasePage
// v2: SessionStorage is instantiated internally by PageObject
// Both expose it as this.sessionStorage

// v2 also supports standalone usage:
import { SessionStorage } from "pomwright";
const sessionStorage = new SessionStorage(page, { label: "MyLabel" });
```

### Method signatures

```ts
// set: write items to sessionStorage
await poc.sessionStorage.set({ token: "abc", theme: "dark" });
await poc.sessionStorage.set({ token: "abc" }, { reload: true });        // reload page after
await poc.sessionStorage.set({ token: "abc" }, { waitForContext: true }); // wait for page context

// setOnNextNavigation: queue items to be written on next page navigation
await poc.sessionStorage.setOnNextNavigation({ token: "abc" });

// get: read items from sessionStorage
const all = await poc.sessionStorage.get();                              // all items
const specific = await poc.sessionStorage.get(["token", "theme"]);       // specific keys
const waited = await poc.sessionStorage.get(["token"], { waitForContext: true });

// clear: remove items from sessionStorage
await poc.sessionStorage.clear();                                        // all items
await poc.sessionStorage.clear("token");                                 // specific key
await poc.sessionStorage.clear(["token", "theme"]);                      // specific keys
await poc.sessionStorage.clear("token", { waitForContext: true });       // with wait
```

### v1 -> v2 signature changes

| v1 | v2 |
|---|---|
| `.set(states, reload: boolean)` | `.set(states, { reload?: boolean; waitForContext?: boolean })` |
| `.get()` | `.get(keys?, { waitForContext?: boolean })` |
| `.clear()` | `.clear(keys?, { waitForContext?: boolean })` |

## @step decorator

v2 provides a `@step` decorator that wraps methods in `test.step()` for Playwright reporting.

```ts
import { step } from "pomwright";

class LoginPage extends PageObject<Paths> {
  // Step title defaults to "LoginPage.login"
  @step
  async login(username: string, password: string) {
    await this.getNestedLocator("main.form.input@username").fill(username);
    await this.getNestedLocator("main.form.input@password").fill(password);
    await this.getNestedLocator("main.form.button@submit").click();
  }

  // Custom step title
  @step("Perform logout")
  async logout() {
    await this.getNestedLocator("topMenu.button@logout").click();
  }

  // With Playwright step options
  @step({ box: true })
  async waitForDashboard() {
    await this.getNestedLocator("main.dashboard").waitFor({ state: "visible" });
  }

  // Custom title + options
  @step("Submit login form", { box: true, timeout: 5000 })
  async submitForm() {
    await this.getNestedLocator("main.form.button@submit").click();
  }
}
```

### Decorator forms

| Form | Description |
|---|---|
| `@step` | No parentheses; title defaults to `ClassName.methodName` |
| `@step()` | Empty call; same as `@step` |
| `@step("title")` | Custom step title |
| `@step({ box: true })` | Playwright step options |
| `@step("title", { box: true })` | Custom title + options |

### Migration from v1 manual test.step patterns

```ts
// v1 (manual step wrapping in the POC)
async login(username: string) {
  await test.step("LoginPage.login", async () => {
    const input = await this.getNestedLocator("main.form.input@username");
    await input.fill(username);
  });
}

// v2 (decorator)
@step()
async login(username: string) {
  await this.getNestedLocator("main.form.input@username").fill(username);
}
```

## Logging

### v1: Logger injected into constructor

```ts
// v1
class LoginPage extends BasePage<Paths> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://example.com", "/login", "LoginPage", pwrl);
  }

  async doSomething() {
    this.log.info("Doing something");  // this.log available on BasePage
  }
}

// v1 fixture
const test = base.extend<Fixtures>({
  loginPage: async ({ page, log }, use, testInfo) => {
    await use(new LoginPage(page, testInfo, log));
  },
});
```

### v2: Logger decoupled from PageObject

PageObject does not have a built-in `this.log`. If logging is needed:

**Option A: Use the `log` fixture in tests (recommended)**

```ts
import { test } from "pomwright";

test("login flow", async ({ page, log }) => {
  log.info("Starting login flow");
  const loginPage = new LoginPage(page);
  // ...
});
```

**Option B: Pass logger to PageObject manually**

```ts
import { type PlaywrightReportLogger, PageObject } from "pomwright";

class LoginPage extends PageObject<Paths> {
  constructor(page: Page, private log: PlaywrightReportLogger) {
    super(page, "https://example.com", "/login");
  }

  @step()
  async doSomething() {
    this.log.info("Doing something");
  }
}

// Fixture
const test = base.extend<Fixtures>({
  loginPage: async ({ page, log }, use) => {
    await use(new LoginPage(page, log));
  },
});
```

**Option C: Create a child logger in the fixture**

```ts
const test = base.extend<Fixtures>({
  loginPage: async ({ page, log }, use) => {
    const childLog = log.getNewChildLogger("LoginPage");
    await use(new LoginPage(page, childLog));
  },
});
```

## Complete migration example

### v1 (before)

```ts
// loginPage.page.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, GetByMethod, type PlaywrightReportLogger } from "pomwright";

type Paths = "main" | "main.form" | "main.form.input@username" | "main.form.button@submit";

export default class LoginPage extends BasePage<Paths> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://example.com", "/login", "LoginPage", pwrl);
  }

  protected initLocatorSchemas() {
    this.locators.addSchema("main", { locator: "main", locatorMethod: GetByMethod.locator });
    this.locators.addSchema("main.form", { locator: "form.login", locatorMethod: GetByMethod.locator });
    this.locators.addSchema("main.form.input@username", { label: "Username", locatorMethod: GetByMethod.label });
    this.locators.addSchema("main.form.button@submit", {
      role: "button", roleOptions: { name: "Submit" }, locatorMethod: GetByMethod.role,
    });
  }

  async login(username: string) {
    const input = await this.getNestedLocator("main.form.input@username");
    await input.fill(username);
    const btn = await this.getNestedLocator("main.form.button@submit");
    await btn.click();
  }
}

// fixture
const test = base.extend<Fixtures>({
  loginPage: async ({ page, log }, use, testInfo) => {
    await use(new LoginPage(page, testInfo, log));
  },
});

// test
test("login", async ({ loginPage }) => {
  await loginPage.page.goto(loginPage.fullUrl);
  await loginPage.login("admin");
});
```

### v2 (after)

```ts
// loginPage.locatorSchema.ts
import type { LocatorRegistry } from "pomwright";

export type Paths = "main" | "main.form" | "main.form.input@username" | "main.form.button@submit";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.form").locator("form.login");
  registry.add("main.form.input@username").getByLabel("Username");
  registry.add("main.form.button@submit").getByRole("button", { name: "Submit" });
}
```

```ts
// loginPage.page.ts
import type { Page } from "@playwright/test";
import { PageObject, step } from "pomwright";
import { defineLocators, type Paths } from "./loginPage.locatorSchema";

export default class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://example.com", "/login");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }

  protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
    return null;
  }

  @step()
  async login(username: string) {
    await this.getNestedLocator("main.form.input@username").fill(username);
    await this.getNestedLocator("main.form.button@submit").click();
  }
}
```

```ts
// fixture
const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
```

```ts
// test
test("login", async ({ loginPage }) => {
  await loginPage.navigation.gotoThisPage();
  await loginPage.login("admin");
});
```
