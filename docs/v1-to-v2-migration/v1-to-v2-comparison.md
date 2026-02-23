# v1 ➜ v2 Feature Comparison

This document compares the **complete** v1 and v2 public feature sets, highlights differences, and provides example-by-example mappings.

---

## High-level feature matrix

| Area | v1 (BasePage + GetLocatorBase) | v2 (PageObject + LocatorRegistry) | Notes |
| --- | --- | --- | --- |
| Base class | `BasePage` (requires `Page`, `testInfo` and `PlaywrightReportLogger`) | `PageObject` (requires `Page`) | `BasePage` is deprecated. `PageObject` is the v2 replacement. `PageObject` comes with a few basic navigation helper methods (`goto`, `gotoThisPage`, `expectThisPage` and `expectAnotherPage`) |
| Usage | v1 requires you to import `test` through pomwright and all features (except `log`) are made available by extending a class with `BasePage` | The use of `PageObject` is for convenience and is **optional**, if you prefer, the following pomwright features bundled through `PageObject` can be implemented/used directly: `LocatorRegistry`, `SessionStorage`, `PlaywrightReportLogger` and `Step`. | |
| URL typing | `BasePageOptions.urlOptions` + `Extract*Type` helpers | `UrlTypeOptions` + `*FromOptions` helpers | v2 uses flattened UrlTypeOptions (`baseUrlType`, `urlPathType`). |
| Locator definitions | `locators.addSchema(path, LocatorSchemaObject)` | Fluent registry DSL (`add(path).getByRole(...)`) | v2 eliminates schema objects and replaces it with a fluent DSL resembling native playwright syntax |
| Locator registry | `GetLocatorBase` | `LocatorRegistry` via `createRegistryWithAccessors` | v2 is fluent and typed. `createRegistryWithAccessors` can be used to implement the LocatorRegistry feature functionally or as part of any class without the use of the `PageObject`. |
| Locator retrieval | `await getLocatorSchema(path).getLocator()`, `await getLocatorSchema(path).getNestedLocator()`, `await getLocator(path)`, `await getNestedLocator(path, indices?)` | `getLocatorSchema(path).getLocator()`, `getLocatorSchema(path).getNestedLocator()`, `getLocator(path)`, `getNestedLocator(path)` | v2 retrieval methods are synchronous while v1 retrieval methods are async. v2 uses `getLocatorSchema(...).nth(...)` for indexing, see mutation. |
| Locator mutation | `getLocatorSchema(...)` with `addFilter(...)` and `.update(...)` | `getLocatorSchema(...)` with `filter(...)`, `nth(...)`, `.update(...)`, `replace(...)`, `remove(...)` and `describe(...)` | v2 replaces `addFilter` with `filter` and adds `nth`, `replace`, `remove`, `clearSteps` and `describe`. In v1 filters are chained in call order followed by **one** optional nth call. In v2 both filters and indices are chained in call order, no limit. In comparison to the v1 update method, the update/replace/remove methods in v2 do not mutate steps (filter & nth), this is done through the new dedicated methods. |
| Reusable locators | `LocatorSchemaWithoutPath` object with `addSchema(path, locatorSchemaWithoutPath)` | `createReusable.getByRole(...)` with `add(path, { reuse: reusable }` or `add(path, { reuse: path} )` | v2 provides a fluent DSL resembling native playwright syntax for creating a reusable Locator to be used as the base for multiple variations or alternatively reusing a previously added Locator definiton from the registry to a new chain/scope by referencing its `Path`. Ensuring single definitions, eliminating code duplication. |
| Frame handling | `frameLocator` returned as `Locator` (cast) | A terminal (path) frame resolves to a `frameLocator.owner` locator, while none terminal frames resolve to a `locator.contentFrame`framelocator e.g.: `locator('#noneTerminalFrame').contentFrame().locator('#terminalFrame')` | v2 avoids returning a `FrameLocator` at the terminal node. |
| Session storage | `SessionStorage` (v1 signatures) | `SessionStorage` (v2 signatures) | v2 adds `waitForContext` and key-based `clear`. |
| Logging | Requires you to import test through pomwright as `BasePage` requires the `log` fixture it provides. BasePage initializes with a `log` child of the `log` fixture. | In v2 it is optional to import test through POMWright to aquire the `log` fixture, alternatively you can copy-paste the fixture code-snippet from `logging.md` instead. `PageObject` does not provide a `log` child, but you can add one if you want it though this will requires the `log` fixture. | v2 does not provide a logger through PageObject. The `log` fixture is optional in v2 and PageObject does not provide a `log` child unless you add it. |
| Step decorator | Not available | `step` decorator | New in v2. |
| Base API | `BaseApi` | Not provided | Must supply your own API base class. |
| `data-cy` | Custom selector engine in BasePage | Removed | Use `locator('[data-cy="..."]')` or add custom engine in Playwright. |
| Bridge | `BasePageV1toV2` | N/A | Transitional class in v1 to bridge to v2. |

---

## Method-by-method mapping

### 1) Base class construction

**v1: `BasePage`**

```ts
class LoginPage extends BasePage<Paths> {
  constructor(page: Page, testInfo: TestInfo, log: PlaywrightReportLogger) {
    super(page, testInfo, "https://example.com", "/login", "LoginPage", log);
  }

  protected initLocatorSchemas() {
    // v1 schemas
  }
}
```

**v2: `PageObject`**

```ts
class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://example.com", "/login", { label: "LoginPage" });
  }

  protected defineLocators() {
    // v2 registry DSL
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}
```

#### **Key changes**

- v2 removes `testInfo` and `PlaywrightReportLogger` from the base class.
- v2 requires `pageActionsToPerformAfterNavigation()`.
- v2 uses `label` instead of `pocName`.

---

### 2) URL typing

**v1: `BasePageOptions.urlOptions`**

```ts
type Options = { urlOptions: { baseUrlType: string; urlPathType: RegExp } };

class ReceiptPage extends BasePage<Paths, Options> {
  constructor(page: Page, testInfo: TestInfo, log: PlaywrightReportLogger) {
    super(page, testInfo, "https://example.com", /\/^[A-Za-z0-9]{12}$/, "ReceiptPage", log);
  }
}
```

**v2: `UrlTypeOptions`**

```ts
type Options = { baseUrlType: string; urlPathType: RegExp };

class ReceiptPage extends PageObject<Paths, Options> {
  constructor(page: Page) {
    super(page, "https://example.com", /\/^[A-Za-z0-9]{12}$/);
  }
}
```

---

### 3) Locator schema definitions

#### **v1: `LocatorSchema` + `GetByMethod`**

```ts
type Paths = "main" | "main.button@login";

// initLocatorSchemas:
this.locators.addSchema("main", {
  locatorMethod: GetByMethod.locator,
  locator: "main",
});

this.locators.addSchema("main.button@login", {
  locatorMethod: GetByMethod.role,
  role: "button",
  roleOptions: { name: "Login" },
});
```

#### **v2: Fluent DSL**

```ts
type Paths = "main" | "main.button@login";

// defineLocators:
this.add("main").locator("main");
this.add("main.button@login").getByRole("button", { name: "Login" });
```

Similar to how you would do natively in playwright:

```ts
readonly main: Locator;
readonly loginButton: Locator;

// constructor:
this.main = page.locator("main");
this.loginButton = this.main.getByRole("button", { name: "Login" });
```

---

### 4) `getLocator` and `getNestedLocator`

#### **v1 (async, optional index map)**

```ts
const login = await poc.getLocator("navbar.button@login");
await login.click();

const logout = await poc.getNestedLocator("navbar.button@logout");
await logout.click();

const submit = await poc.getNestedLocator("main.form.button@submit", { "main.form": 0 });
await submit.click();
```

**v2 (sync, use `nth`)**

```ts
await poc.getLocator("navbar.button@login").click();

await poc.getNestedLocator("navbar.button@logout").click();

await poc.getLocatorSchema("main.form.button@submit").nth("main.form", 0).getNestedLocator().click();
```

---

### 5) Mutating locator definitions

#### **v1: update**

```ts
const patched = await poc
  .getLocatorSchema("main.button@login")
  .update("main.button@login", { roleOptions: { name: "Sign in" } })
  .getNestedLocator();
```

**v1** has no equivalent to v2's `replace` and `remove`.

#### **v2: update/replace/remove**

```ts
const patch = poc
  .getLocatorSchema("main.button@login")
  .update() // defaults to the terminal path when no path is provided
  .getByRole({ name: "Sign in" })
  .getNestedLocator();

const post = poc
  .getLocatorSchema("main.button@login")
  .replace() // defaults to the terminal path when no path is provided
  .getByText("Sign in")
  .getNestedLocator();

const delete = poc
  .getLocatorSchema("main.button@login")
  .remove("main")
  .getNestedLocator();
```

---

### 6) Filtering and indexing

**v1: `addFilter` + index map**

```ts
const filtered = await poc
  .getLocatorSchema("main.list.item")
  .addFilter("main.list", { hasText: "list" })
  .addFilter("main.list.item", { hasText: "Row" })
  .getNestedLocator({ 
    "main.list": 0,
    "main.list.item": -1
  });
```

**v2: `filter` + `nth`**

```ts
const filtered = poc
  .getLocatorSchema("main.list.item")
  .filter("main.list", { hasText: "list" })
  .nth("main.list", 0)
  .filter({ hasText: "Row" }) // not providing a path will default to the terminal-path
  .nth(-1) // not providing a path will default to the terminal-path
  .getNestedLocator();
```

---

### 7) `describe` (v2 only)

**v1** has no equivalent.

**v2**:

```ts
const changePasswordBtn = poc
  .getLocatorSchema("main.region@security.button@edit")
  .filter({ hasText: "Change password"})
  .describe("Change password")
  .getNestedLocator();
```

See Playwright [locator.describe](https://playwright.dev/docs/api/class-locator#locator-describe).

---

### 8) Reusable locators (v2 only)

**v1**:

```ts
import { GetByMethod, GetLocatorBase, LocatorSchemaWithoutPath } from "pomwright";

...

const orderItemDetails: LocatorSchemaWithoutPath = {
  locator: ".order-item-details",
  locatorMethod: GetByMethod.locator
};

addSchema("main.confirmation.region@yourSubscriptions.orderItem.details", {
  ...orderItemDetails
});

addSchema("main.confirmation.region@yourSubscriptions.orderItem.details@activationTime", {
  ...orderItemDetails,
  locatorOptions: {
    hasText: "Activation date:"
  }
});
```

v1 does not support reusing a LocatorSchema from an existing path.

**v2** provides a reusable seed and reuse-by-path:

```ts
import type { LocatorRegistry } from "pomwright";

...
// createReusable:
const orderItemDetails = createReusable.locator(".order-item-details");

add("main.confirmation.region@yourSubscriptions.orderItem.details", { reuse: orderItemDetails });

add("main.confirmation.region@yourSubscriptions.orderItem.details@activationTime", { reuse: orderItemDetails })
.locator({ hasText: "Activation date:"})

// reuse a previously added locator definition by path reference
add("main.confirmation.region@yourSubscriptions.orderItem.details@activationTimeError", { 
  reuse: "errors.invalidActivationTime"
});
```

---

### 9) Frame locators

**v1** returns a `frameLocator` cast as a `Locator` (for chaining), which might be surprising...

```ts
this.locators.addSchema("main.frame@login", {
  locatorMethod: GetByMethod.frameLocator,
  frameLocator: "#auth",
});
```

**v2**:

```ts
this.add("main.frame@login").frameLocator("#auth");
this.add("main.frame@login.input@username").getByLabel("Username");
```

When you register a frame locator using add("path.to.frame").frameLocator("iframe#id"), POMWright v2 stores a frameLocator strategy (Playwright frameLocator semantics). During resolution:

- Non‑terminal frame locator paths: if the frame locator is not the last segment in the path, the registry enters the frame by using the FrameLocator as the current target. The next segments are resolved inside that frame. This is why you can chain frameLocator → getByRole and reliably target elements inside the iframe.
- Terminal frame locator paths: if the frame locator is the last segment, the registry returns frameLocator.owner() — i.e., the iframe element locator — rather than a FrameLocator. This keeps the terminal locator a standard Locator and makes it safe to assert visibility or existence of the iframe itself.

In short: non‑terminal frame locators scope the chain into the frame; terminal frame locators return the iframe element. The chain is built directly with Playwright’s frameLocator(...) API and frameLocator.owner() for terminal paths.

---

### 10) `getById` behavior

#### **v1 getById**

```ts
// string example
addSchema({
  locatorMethod: GetByMethod.id,
  locatorSchemaPath: "main.modal@close",
  id: "close-modal",
});

// regex example
addSchema({
  locatorMethod: GetByMethod.id,
  locatorSchemaPath: "main.modal@close",
  id: /close-modal/,
});
```

#### **v2 getById**

```ts
// string example
add("main.modal@close").getById("close-modal");

// regex example
add("main.modal@close").getById(/close-modal/);
```

#### **v1 vs v2 regex ID mapping**

- v1 regex id mapping uses `*[id^="pattern"]`.
- v2 regex id mapping uses `[id*="pattern"]` and escapes special characters.

What v1 does (regex IDs)
In v1, GetByMethod.id uses a prefix match selector for regex IDs: *[id^="pattern"]. This means it matches elements whose id starts with the regex source string (anchored to the beginning of the attribute value). It does not escape special characters in the regex source before inserting it into the selector.

What v2 does (regex IDs)
In v2, getById uses a substring match selector: [id*="pattern"]. This means it matches elements whose id contains the regex source string anywhere, not just at the start. Importantly, v2 escapes special characters from the regex source before inserting it into the selector (via cssEscape), so characters like . or [ are treated as literal characters in the selector rather than CSS syntax.

Why this matters:

- v1 regex IDs are effectively prefix matches and can break if the regex source contains CSS‑special characters (since it is not escaped).
- v2 regex IDs are substring matches and are safer with special characters due to escaping, but can be broader because they match anywhere in the id value. So v2 is more robust but potentially less strict (unless you choose a more specific regex pattern or switch to string IDs for exact matches).

---

### 11) SessionStorage

#### **v1 SessionStorage**

```ts
await poc.sessionStorage.set({ token: "abc" }, true);

await poc.sessionStorage.setOnNextNavigation({ theme: "dark" });

const data = await poc.sessionStorage.get(); // retrieves all key-value pairs

const data = await poc.sessionStorage.get(["token"]); // retrieves specified key-value pair only

await poc.sessionStorage.clear();
```

#### **v2 SessionStorage**

```ts
await poc.sessionStorage.set({ token: "abc" }, { reload: true });

await poc.sessionStorage.setOnNextNavigation({ theme: "dark" });

const data = await poc.sessionStorage.get(); // retrieves all key-value pairs

const data = await poc.sessionStorage.get(["token"], { waitForContext: true }); // only retrieves the specified key-value pair

await poc.sessionStorage.clear(); // deletes all key-value pairs

await poc.sessionStorage.clear(["token"], { waitForContext: true }); // deletes specified key-value pairs only
```

#### v2 generic typing example

```ts
type SessionState = { // or import the actual type
  token: string;
  theme: string;
};

await poc.sessionStorage.set<SessionState>({ token: "abc", theme: "dark" });

const all = await poc.sessionStorage.get<SessionState>();
// all: Record<string, SessionState> (all keys, typed as SessionState values)

const onlyToken = await poc.sessionStorage.get<SessionState>(["token"], { waitForContext: true });
// onlyToken: Record<string, SessionState>
```

**Important**: the generic is not runtime validation. It only tells TypeScript what value shape you expect to store/retrieve. The underlying storage is still string‑serialized JSON, and invalid shapes won’t be rejected at runtime by SessionStorage itself.

#### What waitForContext does and when to use it

`waitForContext` tells the helper to wait for a main‑frame execution context if none exists yet (e.g., before the first navigation, during reloads, or after a context was destroyed). Without it, v2 throws to avoid silent failures. With it, v2 listens for a navigation and retries once a valid context is available.

- Use `waitForContext`: true when calling `get`, `set`, or `clear` around navigation boundaries.
- Keep it `false` (default) when you’re sure the page already has a valid execution context.

---

### 12) Logging

#### **v1: logger passed into BasePage**

```ts
class LoginPage extends BasePage<Paths> {
  constructor(page: Page, testInfo: TestInfo, log: PlaywrightReportLogger) {
    super(page, testInfo, "https://example.com", "/login", "LoginPage", log);
  }
}
```

#### **v2: log fixture**

```ts
import { test } from "pomwright";

test("login flow", async ({ page, log }) => {
  log.info("starting login");
});
```

---

### 13) Navigation

**v1** has no built-in navigation helper.

**v2** provides `navigation` on `PageObject`:

```ts
await loginPage.navigation.goto("https://anotherDomain.com");
await loginPage.navigation.goto("/anotherResourcePath"); // prefixes with loginPage.baseUrl
await loginPage.navigation.gotoThisPage(); // navigates to loginPage.fullUrl
await loginPage.navigation.expectThisPage(); // url === loginPage.fullUrl
await loginPage.navigation.expectAnotherPage(); // url != loginPage.fullUrl after navigation
```

- If `loginPage.fullUrl` is of type string then all four methods are available.
- If `loginPage.fullUrl` is of type RegExp then only `expectThisPage` and `expectAnotherPage` are available.

---

### 14) Step decorator (v2 only)

```ts
import { step } from "pomwright";

class LoginPage {
  @step()
  async loginAsUser(user: User) {
    // ...
  }
}
```

---

### 15) Base API

#### **v1 BaseAPI**

```ts
class UsersApi extends BaseApi {
  constructor(context: APIRequestContext, log: PlaywrightReportLogger) {
    super("https://example.com", "UsersApi", context, log);
  }
}
```

#### **v2 BaseAPI**

There is no built-in `BaseApi`. Implement your own base class or wrapper.

---

### 16) Bridge class: `BasePageV1toV2`

`BasePageV1toV2` allows v1 schemas and v2 registry accessors to coexist:

```ts
class LoginPage extends BasePageV1toV2<Paths> {
  protected defineLocators() {
    this.add("main.button@login").getByRole("button", { name: "Login" });
  }

  protected initLocatorSchemas() {
    this.locators.addSchema({
      locatorSchemaPath: "main.form@login",
      locatorMethod: GetByMethod.role,
      role: "form",
      roleOptions: { name: "Login" },
    });
  }
}
```

---

## Summary

- v2 is a complete redesign of the locator system around a fluent, typed registry.
- v1 features are largely replaced rather than extended.
- Use `PageObject` for new work and plan to fully remove `BasePage` and `BasePageV1toV2` before v2.0.0.

For step-by-step guides, see:

- `direct-migration-guide.md`
- `bridge-migration-guide.md`
