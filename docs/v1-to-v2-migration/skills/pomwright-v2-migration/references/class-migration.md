# Class Migration: Inheritance, Constructor, Generics, Abstract Methods

## Inheritance change

```ts
// v1
import { BasePage } from "pomwright";
class MyPage extends BasePage<Paths> { ... }

// v1.5 bridge
import { BasePageV1toV2 } from "pomwright";
class MyPage extends BasePageV1toV2<Paths> { ... }

// v2
import { PageObject } from "pomwright";
class MyPage extends PageObject<Paths> { ... }
```

## Constructor signature

v1/bridge constructor:

```ts
constructor(
  page: Page,
  testInfo: TestInfo,
  baseUrl: string | RegExp,
  urlPath: string | RegExp,
  pocName: string,
  pwrl: PlaywrightReportLogger,
)
```

v2 constructor:

```ts
constructor(
  page: Page,
  baseUrl: string | RegExp,
  urlPath: string | RegExp,
  options?: { label?: string; navOptions?: NavigationOptions },
)
```

Changes:
- `testInfo` removed entirely (not needed by PageObject).
- `pocName` replaced by `options.label`. Defaults to `this.constructor.name`, so it can usually be omitted unless the v1 pocName differed from the class name.
- `PlaywrightReportLogger` removed from constructor; use the `log` fixture from `pomwright` in tests instead.
- Optional `navOptions` added for configuring `waitUntil` and `waitForLoadState` defaults.

### Migration example: concrete page object

```ts
// v1
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, type PlaywrightReportLogger } from "pomwright";

export default class LoginPage extends BasePage<Paths> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://example.com", "/login", "LoginPage", pwrl);
  }
}

// v2
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

export default class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://example.com", "/login");
    // label defaults to "LoginPage" (class name), so no need to pass it
  }
}
```

If pocName differed from the class name:

```ts
// v1
super(page, testInfo, "https://example.com", "/login", "MyCustomLabel", pwrl);

// v2
super(page, "https://example.com", "/login", { label: "MyCustomLabel" });
```

### Migration example: abstract base class

v1 abstract base classes typically wrap `baseUrl` and forward the rest:

```ts
// v1
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, type PlaywrightReportLogger } from "pomwright";

export default abstract class AppBase<Paths extends string> extends BasePage<Paths> {
  constructor(page: Page, testInfo: TestInfo, urlPath: string, pocName: string, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "http://localhost:8080", urlPath, pocName, pwrl);
  }
}

// v2
import type { Page } from "@playwright/test";
import { type NavigationOptions, PageObject, type UrlPathTypeFromOptions, type UrlTypeOptions } from "pomwright";

type BaseOptions<Options extends UrlTypeOptions> = {
  baseUrlType: string;
  urlPathType: UrlPathTypeFromOptions<Options>;
};

export default abstract class AppBase<
  Paths extends string,
  Options extends UrlTypeOptions = { baseUrlType: string; urlPathType: string },
> extends PageObject<Paths, BaseOptions<Options>> {
  protected constructor(
    page: Page,
    urlPath: UrlPathTypeFromOptions<BaseOptions<Options>>,
    options?: { label?: string; navOptions?: NavigationOptions },
  ) {
    super(page, "http://localhost:8080", urlPath, options);
  }
}
```

Concrete subclass in v2:

```ts
import type { Page } from "@playwright/test";
import AppBase from "../base/appBase";

export default class LoginPage extends AppBase<Paths> {
  constructor(page: Page) {
    super(page, "/login");
  }
}
```

## Generic type parameters

### Simple case (string baseUrl, string urlPath)

```ts
// v1
class MyPage extends BasePage<Paths> { ... }

// v2 (identical shape, just different base class)
class MyPage extends PageObject<Paths> { ... }
```

### With URL type options (e.g. RegExp urlPath)

```ts
// v1
import { type BasePageOptions, type ExtractUrlPathType, BasePage } from "pomwright";

class ColorPage extends BasePage<
  Paths,
  { urlOptions: { baseUrlType: string; urlPathType: RegExp } }
> { ... }

// v2 (flattened options shape, renamed types)
import { type UrlTypeOptions, type UrlPathTypeFromOptions, PageObject } from "pomwright";

class ColorPage extends PageObject<
  Paths,
  { baseUrlType: string; urlPathType: RegExp }
> { ... }
```

### URL type helper renames

| v1 | v2 |
|---|---|
| `BasePageOptions` | `UrlTypeOptions` |
| `ExtractBaseUrlType<T>` | `BaseUrlTypeFromOptions<T>` |
| `ExtractUrlPathType<T>` | `UrlPathTypeFromOptions<T>` |
| `ExtractFullUrlType<T>` | `FullUrlTypeFromOptions<T>` |

The options shape itself flattened:

```ts
// v1
{ urlOptions: { baseUrlType: string; urlPathType: RegExp } }

// v2
{ baseUrlType: string; urlPathType: RegExp }
```

## Required abstract methods

v2 `PageObject` requires two abstract methods:

### defineLocators()

Same as bridge. See [locator-registration.md](locator-registration.md) for the full DSL mapping.

```ts
protected defineLocators(): void {
  this.add("main").locator("main");
  this.add("main.button@login").getByRole("button", { name: "Login" });
}
```

### pageActionsToPerformAfterNavigation()

New in v2. Returns an array of async callbacks to run after `navigation.gotoThisPage()`, or `null` if none are needed.

```ts
// No post-navigation actions
protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
  return null;
}

// With post-navigation actions (e.g., wait for loading state)
protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] | null {
  return [
    async () => {
      await this.getNestedLocator("main.spinner").waitFor({ state: "hidden" });
    },
  ];
}
```

If the v1 page object had post-navigation logic scattered in tests (e.g., waiting for elements after `page.goto`), consider moving it here.

## Properties available on PageObject

| Property | Description |
|---|---|
| `this.page` | Playwright `Page` instance |
| `this.baseUrl` | Base URL (string or RegExp) |
| `this.urlPath` | URL path (string or RegExp) |
| `this.fullUrl` | Composed full URL |
| `this.label` | PageObject identifier (defaults to class name) |
| `this.sessionStorage` | SessionStorage helper |
| `this.navigation` | Navigation helper (type depends on URL types) |
| `this.locatorRegistry` | Internal LocatorRegistry (for sharing with external `defineLocators` functions) |
| `this.add` | Locator registration accessor |
| `this.getLocator` | Terminal locator accessor |
| `this.getNestedLocator` | Chained locator accessor |
| `this.getLocatorSchema` | Schema query builder accessor |

## Removed v1 properties

| v1 property | v2 replacement |
|---|---|
| `this.testInfo` | Not available; use test fixture if needed |
| `this.log` | Not built-in; use `log` fixture from `pomwright` |
| `this.pocName` | `this.label` |
| `this.selector` | Not available; locator strategies are in the registry |
| `this.locators` (GetLocatorBase) | `this.locatorRegistry` / `this.add` / `this.getLocator` etc. |

## Import changes

```ts
// v1
import { BasePage, GetByMethod, type BasePageOptions, type ExtractUrlPathType,
         type ExtractBaseUrlType, type ExtractFullUrlType, type GetLocatorBase,
         type PlaywrightReportLogger, type LocatorSchemaWithoutPath } from "pomwright";

// v2
import { PageObject, type UrlTypeOptions, type UrlPathTypeFromOptions,
         type BaseUrlTypeFromOptions, type FullUrlTypeFromOptions,
         type LocatorRegistry, type NavigationOptions } from "pomwright";
```

Remove imports that no longer exist: `GetByMethod`, `BasePage`, `BasePageV1toV2`, `BasePageOptions`, `ExtractUrlPathType`, `ExtractBaseUrlType`, `ExtractFullUrlType`, `GetLocatorBase`, `LocatorSchemaWithoutPath`.
