# Bridge Migration Guide (BasePage ➜ BasePageV1toV2 ➜ PageObject)

This guide is for teams that want a **two-step migration**:

1. Move from `BasePage` (v1) to `BasePageV1toV2` (bridge).
2. Then move from `BasePageV1toV2` to `PageObject` (v2).

The bridge preserves v1 locator schema ingestion while exposing v2 registries, allowing gradual conversion.

> `BasePageV1toV2` is deprecated and will be removed in 2.0.0. Use it only as a temporary bridge.

---

## Step 1: Migrate `BasePage` to `BasePageV1toV2`

### v1 BasePage

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

### Bridge: BasePageV1toV2

```ts
class LoginPage extends BasePageV1toV2<Paths> {
  constructor(page: Page, testInfo: TestInfo, log: PlaywrightReportLogger) {
    super(page, testInfo, "https://example.com", "/login", "LoginPage", log);
  }

  protected defineLocators(): void {
    // Start migrating here with v2 add(...) calls.
    this.add("main.button@login").getByRole("button", { name: "Login" });
  }

  protected initLocatorSchemas(): void {
    // Keep v1 schemas temporarily until you migrate them all.
    this.locators.addSchema({
      locatorSchemaPath: "main.form@login",
      locatorMethod: GetByMethod.role,
      role: "form",
      roleOptions: { name: "Login" },
    });
  }
}
```

Key points:

- `BasePageV1toV2` still requires `testInfo` and `PlaywrightReportLogger`.
- It exposes **both** v1 schema ingestion (`initLocatorSchemas`) and v2 accessors (`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`).
- You can migrate locators incrementally by moving schemas from `initLocatorSchemas` to `defineLocators`.

---

## Step 2: Gradually migrate locators to v2 DSL

### Convert one schema at a time

```ts
// v1 schema
this.locators.addSchema({
  locatorSchemaPath: "main.form@login.input@username",
  locatorMethod: GetByMethod.label,
  label: "Username",
});

// v2 DSL (preferred)
this.add("main.form@login.input@username").getByLabel("Username");
```

### Replace v1 mutations

```ts
// v1
await page
  .getLocatorSchema("main.form@login.input@username")
  .addFilter("main.form@login", { hasText: "Login" })
  .getNestedLocator();

// v2
page
  .getLocatorSchema("main.form@login.input@username")
  .filter("main.form@login", { hasText: "Login" })
  .getNestedLocator();
```

---

## Step 3: Remove v1 schema ingestion entirely

When all schemas are converted to `defineLocators`, delete `initLocatorSchemas` and switch to `PageObject`.

```ts
class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://example.com", "/login", { label: "LoginPage" });
  }

  protected defineLocators(): void {
    this.add("main.form@login.input@username").getByLabel("Username");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}
```

---

## Step 4: Update API usage

After switching to `PageObject`, update the remaining call sites:

- `getLocator` / `getNestedLocator` are synchronous and the latter no longer accept index maps.
- `SessionStorage` signatures changed (`set(states, { reload, waitForContext })`).
- PageObject does not implement `testInfo` and `PlaywrightReportLogger` while v1 `BasePage` does, if you want them in your POCs you'll need to add them.

---

## Bridge checklist

- [ ] Replace extend `BasePage` with extend `BasePageV1toV2`.
- [ ] Add `defineLocators()` and start migrating schemas.
- [ ] Migrate all locator schemas to `defineLocators`.
  - [ ] Update FrameLocators (see [v1-to-v2-comparison.md](docs/v1-to-v2-migration/v1-to-v2-comparison.md))
  - [ ] Update getById regex patterns (see [v1-to-v2-comparison.md](docs/v1-to-v2-migration/v1-to-v2-comparison.md))
- [ ] Replace v1 `getLocatorSchema(path).addFilter(...)` with v2 `getLocatorSchema(path).filter(...)`.
- [ ] Replace v1 getNestedLocator index maps with v2 `getLocatorSchema(path).nth(...)`.
- [ ] Update v1 `getLocatorSchema(path).update(...)` with v2 `getLocatorSchema(path)`... `.update(...)` / `.nth(...)` / `.filter(...)` etc.
- [ ] Replace extend `BasePageV1toV2` with extend `PageObject`. See [direct-migration-guide.md](docs/v1-to-v2-migration/direct-migration-guide.md)
- [ ] Update logging and session storage usage.

---

## When to avoid the bridge

Skip `BasePageV1toV2` if:

- You can migrate all locators and method calls quickly.
- You want to adopt v2 URL typing and navigation immediately.
- You do not need the old `GetLocatorBase` or schema objects.

---

For a full feature comparison and method mapping, see [v1-to-v2-comparison.md](docs/v1-to-v2-migration/v1-to-v2-comparison.md).
