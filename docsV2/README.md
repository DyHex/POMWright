# POMWright v2 quick start and migration overview

## Default path: PageObject

`PageObject` is the preferred base class. v1.5 ships v1 and v2 APIs from the same `pomwright` package, so v2 consumers
continue to import from `pomwright` while migrating. Define locators in `defineLocators` and use the v2 accessors:

```ts
import { PageObject } from "pomwright";

export class LoginPage extends PageObject<"main" | "main.button@login"> {
  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.button@login").getByRole("button", { name: "Login" });
  }
}
```

Recommended checklist for one-step migrations:

- Import `PageObject` and drop v1 base classes.
- Move locator definitions into `defineLocators` with `add(...)`.
- The update syntax of methods `getLocator`, `getNestedLocator`, and `getLocatorSchema` in code.
- Delete any `initLocatorSchemas` blocks.

## PageObjectOptions and URL typing

`PageObjectOptions` is a **type-level** helper that controls the *types* of `baseUrl`, `urlPath`, and `fullUrl`
(string vs `RegExp`). It is **not** the runtime `options` argument passed to the constructor; the constructor only
accepts `{ label?: string }` for label overrides.

Example (type-level URL typing using a `Paths` union):

```ts
import type { Page } from "@playwright/test";
import { PageObject, type ExtractUrlPathType, type PageObjectOptions } from "pomwright";

type Paths = "main.order" | "main.order.submit";

export class OrderPage extends PageObject<
  Paths,
  { urlOptions: { baseUrlType: string; urlPathType: RegExp } }
> {
  constructor(page: Page, urlPath: ExtractUrlPathType<{ urlOptions: { urlPathType: RegExp } }>) {
    super(page, "https://example.com", urlPath, { label: "ProductOrderPage" });
  }

  protected defineLocators(): void {
    this.add("main.order").locator("main");
    this.add("main.order.submit").getByRole("button", { name: "Submit" });
  }
}
```

## Logging and TestInfo are opt-in

`PageObject` no longer stores `PlaywrightReportLogger` or `TestInfo` by default. Keep logging as a standalone fixture and
opt into `log`/`testInfo` on your own page objects when needed.

See: [Logging and TestInfo (v2)](./logging.md)

## Playwright step decorator

POMWright v2 exports a `step` decorator that wraps methods in Playwright `test.step` calls. The decorator reuses the
Playwright `test.step` parameters and defaults the title to `ClassName.methodName` when no title is provided.

```ts
import { step } from "pomwright";

class AccountPage {
  @step
  async openAccount() {
    await this.page.goto("/account");
  }

  @step("Fill profile", { box: true })
  async fillProfile() {
    await this.page.fill("#firstName", "Ada");
  }

  @step({ timeout: 5000 })
  async saveProfile() {
    await this.page.click("button[type='submit']");
  }
}
```

## SessionStorage helper (v2)

`PageObject` exposes a `sessionStorage` helper for managing `window.sessionStorage`, the helper uses the `PageObject`
label (defaults to the class name) to prefix Playwright step titles in sessionStorage calls. It can also be imported
directly and used seperately without going through PageObject.

See: [SessionStorage helper (v2)](./sessionStorage.md)

## Bridge option (short-lived)

`BasePageV1toV2` still accepts v1 `addSchema` definitions via `initLocatorSchemas`, translating them into the v2
registry while exposing only the v2 accessors. It is marked deprecated and will be removed in 2.0.0.

Use the bridge only when you need staged migration across layered base classes. Prefer switching directly to
`PageObject` when feasible to surface remaining v1 syntax quickly.

### Bridge cautions

- Translator warnings flag v1 schemas that cannot be migrated (e.g., `locator` fields that are already `Locator`
instances or missing required fields). Rewrite these paths in `defineLocators`.
- Constructing `BasePageV1toV2` or invoking `initLocatorSchemas` logs deprecation warnings; plan to remove them before 2.0.0.
