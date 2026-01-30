# Navigation helper (v2)

When you extend a POC with `PageObject`, your POC will get access to a navigation helper for common navigation and 
URL validation based on the given POC's url properties. E.g. `await myPage.navigation.gotoThisPage();` etc.

## What the helper provides

The helper exposes different methods based on wether the `fullUrl` property is of type `string` xor `RegExp`:

- **`fullUrl: string`**
  - `goto(urlPathOrUrl)`
  - `gotoThisPage()`
  - `expectThisPage()`
  - `expectAnotherPage()`
- **`fullUrl: RegExp`**
  - `expectThisPage()`
  - `expectAnotherPage()`

This ensures navigation methods are unavailable when URL matching relies on `RegExp`.

### Notes

- `goto(urlPathOrUrl)` prefixes the POC `baseUrl` only when `urlPathOrUrl` starts with `/`, it does **not** execute navigation actions.
- `gotoThisPage()` and `expectThisPage()` execute `pageActionsToPerformAfterNavigation()`.
- `expectAnotherPage()` does **not** execute navigation actions; it only validates navigation away from the page.

## Method behavior summary

- **`goto`**: Uses `page.goto` directly; only prefixes `baseUrl` when passed a path that starts with `/`.
- **`gotoThisPage`**: Navigates to `fullUrl` (string-only) and runs post-navigation actions.
- **`expectThisPage`**: Uses `page.waitForURL(fullUrl)` and a follow-up assertion for clear error messages.
- **`expectAnotherPage`**: Waits for `waitForLoadState` and asserts that the current URL is not `fullUrl`.

## Default wait behavior

Navigation defaults use Playwright's `load` behavior:

- `waitUntil` defaults to `"load"` for `goto`, `gotoThisPage`, and `expectThisPage`.
- `waitForLoadState` defaults to `"load"` for `expectAnotherPage`.

You can override defaults per Page Object (recommended) or per call.

## Using navigation from `PageObject`

`PageObject` now exposes `navigation`, and accepts `navOptions` at construction time:

```ts
import type { Page } from "@playwright/test";
import { PageObject, type UrlTypeOptions } from "pomwright";

type Paths = "main.order" | "main.order.submit";

export class OrderPage extends PageObject<Paths, { baseUrlType: string; urlPathType: string }> {
  constructor(page: Page) {
    super(page, "https://example.com", "/orders", {
      label: "OrderPage",
      navOptions: {
        waitUntil: "domcontentloaded",
        waitForLoadState: "domcontentloaded",
      },
    });
  }

  protected defineLocators(): void {
    this.add("main.order").locator("main");
    this.add("main.order.submit").getByRole("button", { name: "Submit" });
  }

  protected pageActionsToPerformAfterNavigation() {
    return [
      async () => {
        await this.getNestedLocator("main.order.submit").waitFor({ state: "visible" });
      },
    ];
  }
}
```

### Domain-specific base POCs (`BaseWithOptionsV2`)

If multiple page objects share a common domain (for example, a local test app), it can be useful to create an abstract
base class that hardcodes the shared `baseUrl` and exposes common helper methods and shared locator unions. The base
class can still preserve the string XOR RegExp behavior for `urlPath` by using a small helper type:

```ts
import type { Page } from "@playwright/test";
import { type NavigationOptions, PageObject, type UrlPathTypeFromOptions, type UrlTypeOptions } from "pomwright";

type BaseOptions<Options extends UrlTypeOptions> = {
  baseUrlType: string;
  urlPathType: UrlPathTypeFromOptions<Options>;
};

export default abstract class BaseWithOptionsV2<
  LocatorSchemaPathType extends string,
  Options extends UrlTypeOptions = { baseUrlType: string; urlPathType: string },
> extends PageObject<LocatorSchemaPathType, BaseOptions<Options>> {
  protected constructor(
    page: Page,
    urlPath: UrlPathTypeFromOptions<BaseOptions<Options>>,
    options?: { label?: string; navOptions?: NavigationOptions },
  ) {
    super(page, "http://localhost:8080", urlPath, options);
  }
}
```

#### Why a domain base class helps

- **Shared helpers**: add common actions (navbar, cookie consent, errors, spinners etc.) once for all POCs in the domain.
- **Shared locators**: define a common `LocatorSchemaPathType` union for shared UI elements.
- **Consistent defaults**: centralize navigation defaults and other shared configuration.

### Direct `PageObject` usage (no domain base)

If you don’t need shared domain behavior, you can extend `PageObject` directly:

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

type Paths = "main.order" | "main.order.submit";

export class OrderPage extends PageObject<
  Paths,
  { baseUrlType: string; urlPathType: string }
> {
  constructor(page: Page) {
    super(page, "https://example.com", "/orders", { label: "OrderPage" });
  }

  protected defineLocators(): void {
    this.add("main.order").locator("main");
    this.add("main.order.submit").getByRole("button", { name: "Submit" });
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}
```

If you need dynamic or data-driven URLs, or you want a shared POC to represent multiple
routes, you can accept `urlPath` as a constructor parameter.
