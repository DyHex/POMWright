# PageObject (v2)

## Overview

`PageObject` is the core v2 abstraction that wires a Playwright `Page` to:

- A typed locator registry (`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`).
- The navigation helper (`navigation`).
- The session storage helper (`sessionStorage`).

It is intentionally minimal: you provide locator definitions and any post-navigation actions, then compose additional behavior on top.

---

## Constructor and generics

```ts
export abstract class PageObject<
  LocatorSchemaPathType extends string,
  Options extends UrlTypeOptions = { baseUrlType: string; urlPathType: string },
> {
  protected constructor(
    page: Page,
    baseUrl: BaseUrlTypeFromOptions<Options>,
    urlPath: UrlPathTypeFromOptions<Options>,
    options?: { label?: string; navOptions?: NavigationOptions },
  )
}
```

### `LocatorSchemaPathType`

A literal union of dot-delimited locator paths. The registry validates this union at compile time and runtime.

```ts
type Paths =
  | "common.spinner"
  | "main"
  | "main.form@login"
  | "main.form@login.input@username"
  | "main.form@login.input@password"
  | "main.button@login";
```

### `Options` (`UrlTypeOptions`)

`UrlTypeOptions` controls how `baseUrl`, `urlPath`, and `fullUrl` are typed and interpreted:

```ts
type UrlTypeOptions = {
  baseUrlType?: string | RegExp;
  urlPathType?: string | RegExp;
};
```

- If both are strings, `fullUrl` is a string and all navigation methods are available.
- If either is `RegExp`, `fullUrl` is a `RegExp`, and navigation is limited to URL assertions (`expectThisPage`, `expectAnotherPage`).

### Constructor options

- `label`: Optional label used in navigation and session storage step titles. Defaults to the class name.
- `navOptions`: Default `NavigationOptions` (`waitUntil`, `waitForLoadState`) used by the navigation helper.

---

## Required abstract methods

### `defineLocators()`

Define every locator path for the page using the v2 registry DSL (`add(...).getByRole(...)`, etc.). This is called in the constructor before navigation is created.

### `pageActionsToPerformAfterNavigation()`

Return a list of async callbacks to run after `gotoThisPage()` and `expectThisPage()`.

- Return `[]` to run no actions.
- Return `null` to skip the actions list entirely.

---

## Public properties

| Property | Type | Purpose |
| --- | --- | --- |
| `page` | `Page` | Playwright `Page` instance. |
| `baseUrl` / `urlPath` / `fullUrl` | `string` or `RegExp` | URL values typed based on `UrlTypeOptions`. |
| `label` | `string` | Label used for navigation and session storage steps. |
| `sessionStorage` | `SessionStorage` | Session storage helper, labeled with `label`. |
| `navigation` | `ExtractNavigationType<FullUrlType>` | Navigation helper (methods vary by URL type). |
| `add` | `AddAccessor<Paths>` | Registry `add` method for locator definitions. |
| `getLocator` | `GetLocatorAccessor<Paths>` | Terminal locator resolver. |
| `getNestedLocator` | `GetNestedLocatorAccessor<Paths>` | Full chained locator resolver. |
| `getLocatorSchema` | `GetLocatorSchemaAccessor<Paths>` | Builder clone for filters/indices/updates. |

---

## Example: basic `PageObject` class

```ts
import { expect, type Page } from "@playwright/test";
import { PageObject, step } from "pomwright";
import type { User } from "testData";

type Paths =
  | "common.spinner"
  | "main"
  | "main.form@login"
  | "main.form@login.input@username"
  | "main.form@login.input@password"
  | "main.button@login";

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

---

## Navigation helper details

The navigation helper is created automatically and exposed as `pageObject.navigation`.

### When `fullUrl` is a string

Available methods:

- `goto(urlPathOrUrl, options?)` – resolves paths starting with `/` against `baseUrl`.
- `gotoThisPage(options?)` – navigates to `fullUrl` and runs `pageActionsToPerformAfterNavigation()`.
- `expectThisPage(options?)` – waits for `fullUrl` and runs actions.
- `expectAnotherPage(options?)` – waits for a non-matching URL.

### When `fullUrl` is a `RegExp`

Available methods:

- `expectThisPage(options?)` – matches against the regex.
- `expectAnotherPage(options?)` – asserts URL does not match.

### Default vs per-call options

You can pass `navOptions` into the `PageObject` constructor and override per call:

```ts
class OrdersPage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://example.com", "/orders", {
      label: "OrdersPage",
      navOptions: { waitUntil: "domcontentloaded", waitForLoadState: "domcontentloaded" },
    });
  }

  protected defineLocators() {
    this.add("main").locator("main");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}

await ordersPage.navigation.gotoThisPage({ waitUntil: "load" });
```

---

## URL typing examples

### All-string URLs (full navigation support)

```ts
class ProfilePage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://example.com", "/profile", { label: "ProfilePage" });
  }

  protected defineLocators() {
    this.add("main").locator("main");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}
```

### RegExp URL path (assert-only navigation)

```ts
type UrlOptions = { baseUrlType: string; urlPathType: RegExp };

class AccountPage extends PageObject<"main", UrlOptions> {
  constructor(page: Page) {
    super(page, "https://example.com", /\/account\/.+/, { label: "AccountPage" });
  }

  protected defineLocators() {
    this.add("main").locator("main");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}

await accountPage.navigation.expectThisPage();
```

---

## Accessing locators

- `getLocator(path)` returns the **terminal** locator only (no ancestor chaining).
- `getNestedLocator(path)` returns the **fully chained** locator.
- `getLocatorSchema(path)` returns a mutable clone to add filters, indices, or update/replace definitions before resolving.

```ts
const terminal = loginPage.getLocator("main.form@login.input@username");
const chained = loginPage.getNestedLocator("main.form@login.input@username");

const filtered = loginPage
  .getLocatorSchema("main.form@login.input@username")
  .filter("main.form@login.input@username", { hasText: /User/i })
  .getNestedLocator();
```

---

## SessionStorage helper

`PageObject` constructs `SessionStorage` with `label` as a prefix, so step titles are easy to track.

```ts
await loginPage.sessionStorage.set({ token: "abc" }, { reload: true });
await loginPage.sessionStorage.setOnNextNavigation({ theme: "dark" });
const data = await loginPage.sessionStorage.get(["token", "theme"], { waitForContext: true });
await loginPage.sessionStorage.clear(["token"], { waitForContext: true });
```

---

## Fixture wiring example

```ts
import { test as base } from "@playwright/test";
import type { Page } from "@playwright/test";
import { LoginPage } from "./login.page";

type Fixtures = { loginPage: LoginPage };

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page as Page));
  },
});
```

---

## Key differences vs v1

- `PageObject` replaces `BasePage` and does **not** carry Playwright `testInfo` or a logger.
- Registry APIs are fluent (`add(...).getByRole(...)`) instead of schema objects.
- `getLocator`/`getNestedLocator` are synchronous and do not accept index maps; use `getLocatorSchema(...).nth(...)`.
- Navigation is built into the base class and depends on URL typing.

See the migration docs in `docs/v1-to-v2-migration` for a step-by-step guide.
