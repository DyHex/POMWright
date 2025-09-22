# BasePage

`BasePage` is the foundation for all Page Object Classes (POCs) in POMWright.  It provides common plumbing for Playwright pages, logging, locator management and session storage.

## Generics

```ts
BasePage<LocatorSchemaPathType, Options = { urlOptions: { baseUrlType: string; urlPathType: string } }, LocatorSubstring>
```

* **LocatorSchemaPathType** – union of valid locator paths for the POC.
* **Options** – optional configuration that allows the `baseUrl` or `urlPath` to be typed as a `RegExp` when dynamic values are required for mapping certain resource paths. See [intTest/page-object-models/testApp/with-options/base/baseWithOptions.page.ts](https://github.com/DyHex/POMWright/blob/main/intTest/page-object-models/testApp/with-options/base/baseWithOptions.page.ts)
* **LocatorSubstring** – internal type used when working with sub paths; normally left undefined.

## Constructor

```ts
constructor(
  page: Page,
  testInfo: TestInfo,
  baseUrl: ExtractBaseUrlType<Options>,
  urlPath: ExtractUrlPathType<Options>,
  pocName: string,
  pwrl: PlaywrightReportLogger
)
```

The base class stores these values and derives `fullUrl`.  A child [`PlaywrightReportLogger`](./PlaywrightReportLogger-explanation.md) is created for the POC and a [`SessionStorage`](./sessionStorage-methods-explanation.md) helper is exposed as `sessionStorage`.

## Required implementation

Every POC extending `BasePage` must:

1. Define a `LocatorSchemaPath` union describing available locators.
2. Implement the `initLocatorSchemas()` method which adds schemas to the internal `GetLocatorBase` instance.

```ts
// login.page.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, type PlaywrightReportLogger } from "pomwright";
import { test } from "@fixtures/all.fixtures";
import { type LocatorSchemaPath, initLocatorSchemas } from "./login.locatorSchema";

export default class Login extends BasePage<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://example.com", "/login", Login.name, pwrl);
  }

  protected initLocatorSchemas() {
    initLocatorSchemas(this.locators);
  }

  public async login(user: string, pass: string) {
    await test.step(`${this.pocName}: Fill login form and login`, async () => {

      await test.step(`${this.pocName}: Fill username field`, async () => {
        const locator = await this.getNestedLocator("main.section@login.form.textbox@username");
        await locator.fill(user);
        await locator.blur();
      });

      await test.step(`${this.pocName}: Fill password field`, async () => {
        const locator = await this.getNestedLocator("main.section@login.form.textbox@password");
        await locator.fill(pass);
        await locator.blur();
      });

      await test.step(`${this.pocName}: Click login button`, async () => {
        const locator = await this.getNestedLocator("main.section@login.button@login");
        await locator.click();
      });

      /** 
       * We probably don't want to await navigation here, instead we do it in the test, 
       * using the POC representing the page we are navigated to (e.g. /profile) 
       */
    });
  }
}
```

## Helper methods

`BasePage` exposes a small API built around `LocatorSchema` definitions:

* `getLocatorSchema(path)` – returns a chainable object; see [locator methods](./get-locator-methods-explanation.md).
* `getLocator(path)` – wrapper method for `getLocatorSchema(path).getLocator();` - resolves the locator for the final segment of a path, e.g. the Locator created from the LocatorSchema the full LocatorSchemaPath references.
* `getNestedLocator(path, indices?)` – wrapper method for `getLocatorSchema(path).getNestedLocator();` - automatically chains locators along the path and optionally selects nth occurrences.

All locators are strongly typed, giving compile‑time suggestions and preventing typos in `LocatorSchemaPath` strings.

## Recommendation

Instead of extending each of your POC's with BasePage from POMWright, opt instead to create an abstract BasePage class for your domain and have it extend BasePage from POMWright. Then have each of your POC's extend your abstract POC instead. This allows us to easily sentralize common helper methods, LocatorSchema, etc. and reuse it across all our POC's for the given domain.

For examples see [intTest/page-object-models/testApp](https://github.com/DyHex/POMWright/tree/main/intTest/page-object-models/testApp)
