# Direct v1 ➜ v2 Migration Guide

This guide shows how to migrate directly from `BasePage` (v1) to `PageObject` (v2). It focuses on the structural changes, locator conversion, and API differences you must address.

> v1 is deprecated and will be removed in 2.0.0. v1.5.0 is the final v1 release.

---

## 1) Inventory your v1 usage

Before changing code, list where the following appear:

- `BasePage` subclasses.
- `initLocatorSchemas` definitions.
- `LocatorSchema` objects and `GetByMethod` usage.
- `getLocatorSchema(...).update(...)` and `addFilter(...)` chains.
- `getLocator` / `getNestedLocator` wrappers.
- `SessionStorage` usage (old signatures).
- `PlaywrightReportLogger` usage in constructors.
- Any `data-cy` selectors or custom selector engines.

---

## 2) Convert `BasePage` to `PageObject`

### v1

```ts
class LoginPage extends BasePage<Paths> {
  constructor(page: Page, testInfo: TestInfo, log: PlaywrightReportLogger) {
    super(page, testInfo, "https://example.com", "/login", "LoginPage", log);
  }

  protected initLocatorSchemas() {
    this.locators.addSchema({
      locatorSchemaPath: "main.button@login",
      locatorMethod: GetByMethod.role,
      role: "button",
      roleOptions: { name: "Login" },
    });
  }
}
```

### v2

```ts
class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://example.com", "/login", { label: "LoginPage" });
  }

  protected defineLocators(): void {
    this.add("main.button@login").getByRole("button", { name: "Login" });
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}
```

Key changes:

- Remove `testInfo`, `PlaywrightReportLogger`, and `pocName` constructor args.
- Use `defineLocators()` instead of `initLocatorSchemas()`.
- Provide `pageActionsToPerformAfterNavigation()`.

---

## 3) Translate v1 locator schemas to v2 `add(...)`

### v1 locator schema

```ts
this.locators.addSchema({
  locatorSchemaPath: "main.form@login.input@username",
  locatorMethod: GetByMethod.label,
  label: "Username",
});
```

### v2 registry DSL

```ts
this.add("main.form@login.input@username").getByLabel("Username");
```

Mapping guide:

| v1 `locatorMethod` | v2 method |
| --- | --- |
| `role` | `getByRole(...)` |
| `text` | `getByText(...)` |
| `label` | `getByLabel(...)` |
| `placeholder` | `getByPlaceholder(...)` |
| `altText` | `getByAltText(...)` |
| `title` | `getByTitle(...)` |
| `locator` | `locator(...)` |
| `frameLocator` | `frameLocator(...)` |
| `testId` | `getByTestId(...)` |
| `id` (custom) | `getById(...)` (custom) |
| `dataCy` (custom) | `locator('[data-cy="..."]')` |

---

## 4) Replace `getLocator` / `getNestedLocator`

In v1 these were async wrappers and accepted index maps. In v2 they are synchronous and do not accept index maps.

### v1

```ts
const submit = await poc.getNestedLocator("main.form.button@submit", {
  "main.form": 0,
});
```

### v2

```ts
const submit = poc
  .getLocatorSchema("main.form.button@submit")
  .nth("main.form", 0)
  .getNestedLocator();
```

---

## 5) Replace v1 `getLocatorSchema().update()` and `addFilter()`

### v1

```ts
const submit = await poc
  .getLocatorSchema("main.form.button@submit")
  .update("main.form.button@submit", { roleOptions: { name: "Sign in" } })
  .addFilter("main.form.button@submit", { hasText: /Sign in/i })
  .getNestedLocator();
```

### v2

```ts
const submit = poc
  .getLocatorSchema("main.form.button@submit")
  .update("main.form.button@submit")
  .getByRole({ name: "Sign in" })
  .filter("main.form.button@submit", { hasText: /Sign in/i })
  .getNestedLocator();
```

---

## 6) Update SessionStorage usage

### v1

```ts
await poc.sessionStorage.set({ token: "abc" }, true);
const data = await poc.sessionStorage.get(["token"]);
await poc.sessionStorage.clear();
```

### v2

```ts
await poc.sessionStorage.set({ token: "abc" }, { reload: true });
const data = await poc.sessionStorage.get(["token"], { waitForContext: true });
await poc.sessionStorage.clear({ waitForContext: true });
```

---

## 7) Replace BasePage logging

In v1, `BasePage` receives `PlaywrightReportLogger` and keeps it internally. In v2, logging is provided by the `test` fixture.

### v2 fixture

```ts
import { test } from "pomwright";

test("login flow", async ({ page, log }) => {
  log.info("starting login");
});
```

If you want logging inside POMs, pass a child logger explicitly.

---

## 8) Update navigation flows

v2 adds a navigation helper to `PageObject` and expects a `pageActionsToPerformAfterNavigation()` method.

```ts
protected pageActionsToPerformAfterNavigation() {
  return [
    async () => {
      await this.getNestedLocator("main.form@login").waitFor({ state: "visible" });
    },
  ];
}

await loginPage.navigation.gotoThisPage();
await loginPage.navigation.expectAnotherPage();
```

---

## 9) Remove v1-only APIs

- `BaseApi` is deprecated and not part of v2. Use your own API base class.
- `GetBy` and `LocatorSchema` objects are replaced by the registry DSL.
- `data-cy` selector engine is removed; use `locator('[data-cy="..."]')` or register your own selector engine in Playwright.

---

## 10) Validate after migration

- Run tests.
- Check all POMs compile with strict types.
- Confirm registry paths match the new dot-delimited rules (no whitespace).

---

## Summary checklist

- [ ] Replace `BasePage` with `PageObject`.
- [ ] Move `initLocatorSchemas` → `defineLocators`.
- [ ] Convert `LocatorSchema` objects to `add(...).getBy...` calls.
- [ ] Replace `addFilter` and index maps with `filter` + `nth`.
- [ ] Update `SessionStorage` signatures.
- [ ] Remove `data-cy` and custom selector engine assumptions.
- [ ] Adopt the v2 `test` fixture for logging or implement it directly, see docs/v2/logging.md.

For the bridge option, see `bridge-migration-guide.md`.
