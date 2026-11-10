# Writing a page object

From a page to its locator module, its page object and its fixture, step by step. It applies
`guides/choosing-locators-and-paths.md`; the API is in `references/page-objects.md` and `references/registering.md`.

## Contents

- [1. List what tests need from the page](#1-list-what-tests-need-from-the-page)
- [2. The locator module](#2-the-locator-module)
- [3. The page object](#3-the-page-object)
- [4. The fixture, and a first test](#4-the-fixture-and-a-first-test)
- [5. Check it](#5-check-it)

## 1. List what tests need from the page

Look at the page (the running app, a screenshot, an accessibility snapshot) and list the elements tests act on or
check, and no others: a page object is the tests' vocabulary for the page, not a copy of its markup. Group them by the
containers a user sees, which become the path tree.

## 2. The locator module

`<name>.locators.ts` beside the page object exports the paths and a function that registers them. A module that no
other module composes needs no overload signature (see `guides/locator-modules.md` for one that does):

```ts title="checkout.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths =
  | "main"
  | "main.form@delivery"
  | "main.form@delivery.input@postcode"
  | "main.form@delivery.button@continue"
  | "main.region@summary"
  | "main.region@summary.text@total";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.form@delivery").getByRole("form", { name: "Delivery" });
  registry.add("main.form@delivery.input@postcode").getByLabel("Postcode");
  registry.add("main.form@delivery.button@continue").getByRole("button", { name: "Continue" });
  registry.add("main.region@summary").getByRole("region", { name: "Order summary" });
  registry.add("main.region@summary.text@total").getByTestId("order-total");
}
```

## 3. The page object

`<name>.page.ts` extends the app's base class and passes only its path. Its methods are what a test does and checks on
the page, as `@step()` methods named in the user's words; one with two or more parameters takes one options object.
A method that reads a value returns it; a check is an `expect…` method that asserts with Playwright's web-first
assertions:

```ts title="shop.page.ts"
import type { Page } from "@playwright/test";
import { PageObject, type PageObjectOptions } from "pomwright";

export abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
  protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
    super(page, process.env.SHOP_URL ?? "https://shop.example", urlPath, {
      navOptions: { waitUntil: "domcontentloaded" },
      ...options,
    });
  }
}
```

```ts title="checkout.page.ts"
import { expect, type Page } from "@playwright/test";
import { step } from "pomwright";
import { defineLocators, type Paths } from "./checkout.locators";
import { ShopPage } from "./shop.page";

export class CheckoutPage extends ShopPage<Paths> {
  constructor(page: Page) {
    super(page, "/checkout");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }

  protected pageActionsToPerformAfterNavigation() {
    return [
      async () => {
        await expect(this.getNestedLocator("main.form@delivery")).toBeVisible();
      },
    ];
  }

  @step()
  async continueWithPostcode(postcode: string) {
    await this.getNestedLocator("main.form@delivery.input@postcode").fill(postcode);
    await this.getNestedLocator("main.form@delivery.button@continue").click();
  }

  @step()
  async expectTotal(total: string) {
    await expect(this.getNestedLocator("main.region@summary.text@total")).toHaveText(total);
  }
}
```

- Locators stay inside the page object: tests call its methods, and reach `getNestedLocator` only for a one-off
  assertion no method covers.
- `pageActionsToPerformAfterNavigation()` holds what "this page has loaded" means, so `navigation.goto()` and
  `navigation.expectThisPage()` wait for it.
- Data comes in as arguments; the page object does not import test data.
- Page objects import Playwright's `expect` from `@playwright/test`, never the project's fixtures module, which imports
  the page objects.

## 4. The fixture, and a first test

Add the page object to the app's fixtures file (see `guides/fixtures-and-test-data.md`) and write a test that reads
as steps:

```ts title="fixtures.ts"
import { test as base } from "pomwright";
import { CheckoutPage } from "./checkout.page";

export { expect } from "@playwright/test";

export const test = base.extend<{ checkoutPage: CheckoutPage }>({
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
});
```

```ts title="checkout.spec.ts"
import { test } from "./fixtures";

test("the delivery step keeps the total", async ({ checkoutPage }) => {
  await checkoutPage.navigation.goto();
  await checkoutPage.continueWithPostcode("0150");
  await checkoutPage.expectTotal("249 kr");
});
```

## 5. Check it

Compile with `tsc`: a path not in `Paths` is a compile error. Run the test: a registry mistake fails the page object in
its fixture, with every failing path, before the test's body runs. A chain that finds nothing times out naming the
path and, in the call log, the chain Playwright waited for; `describe("")` on a query prints a path's chain.
