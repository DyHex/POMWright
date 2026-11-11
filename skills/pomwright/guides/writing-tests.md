# Writing tests

A test with POMWright is a Playwright test whose steps are page-object calls. Playwright's own
[Best practices](https://playwright.dev/docs/best-practices) apply as written; this guide adds what page objects change.

## Contents

- [A test reads as steps](#a-test-reads-as-steps)
- [Assertions](#assertions)
- [Data, and several cases](#data-and-several-cases)
- [Waiting](#waiting)
- [Overlays that appear at random](#overlays-that-appear-at-random)

## A test reads as steps

```ts title="orders.page.ts"
import { expect, type Page } from "@playwright/test";
import { PageObject, step } from "pomwright";

type Paths =
  | "main"
  | "main.table@orders"
  | "main.table@orders.rows"
  | "main.table@orders.rows.rowheader"
  | "main.table@orders.rows.button@cancel";

export class OrdersPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/orders");
  }

  protected defineLocators(): void {
    this.add("main").getByRole("main");
    this.add("main.table@orders").getByRole("table", { name: "Orders" });
    this.add("main.table@orders.rows").getByRole("row");
    this.add("main.table@orders.rows.rowheader").getByRole("rowheader");
    this.add("main.table@orders.rows.button@cancel").getByRole("button", { name: "Cancel" });
  }

  @step()
  async cancel(options: { order: string }) {
    const orderNumber = this.getLocatorSchema("main.table@orders.rows.rowheader")
      .update()
      .getByRole({ name: options.order, exact: true })
      .getLocator();
    await this.getLocatorSchema("main.table@orders.rows.button@cancel")
      .filter("main.table@orders.rows", { has: orderNumber })
      .getNestedLocator()
      .click();
  }

  @step()
  async expectOpenOrders(count: number) {
    await expect(this.getNestedLocator("main.table@orders.rows.button@cancel")).toHaveCount(count);
  }
}
```

```ts title="test-data.ts"
export const testData = {
  orders: {
    open: { id: "ORD-1042" },
    alsoOpen: { id: "ORD-1043" },
  },
} as const;
```

```ts title="fixtures.ts"
import { test as base } from "pomwright";
import { OrdersPage } from "./orders.page";
import { testData } from "./test-data";

export { expect } from "@playwright/test";

export const test = base.extend<{ ordersPage: OrdersPage; testData: typeof testData }>({
  ordersPage: async ({ page }, use) => {
    await use(new OrdersPage(page));
  },
  // a value, not a function: the same data for every test
  testData,
});
```

```ts title="orders.spec.ts"
import { test } from "./fixtures";

test("a customer cancels one of two open orders", async ({ ordersPage, testData }) => {
  await ordersPage.navigation.goto();
  await ordersPage.expectOpenOrders(2);
  await ordersPage.cancel({ order: testData.orders.open.id });
  await ordersPage.expectOpenOrders(1);
});
```

- The test imports `test` from the project's fixtures and asks for the page objects and data it uses.
- One behavior per test, independent of every other test: each gets its own page objects on its own `page`.
- Each page-object call is a report step; a test wraps steps in `test.step` only to group several page-object calls
  under one name the report needs.

## Assertions

Assert with Playwright's web-first assertions, `await expect(locator).toBeVisible()`, which retry until the page
matches; `expect(await locator.isVisible()).toBe(true)` reads the page once, before it may be ready. A check a test repeats belongs in the page object as an `expect…`
`@step()` method; a one-off assertion in a test resolves the path itself:
`await expect(ordersPage.getNestedLocator("main.table@orders")).toBeVisible()`.

## Data, and several cases

Data comes from the test-data fixture by default (`guides/fixtures-and-test-data.md`, or what the project's
`POMWRIGHT.md` decides), and page code takes it as arguments, so one page object serves every case. Several
cases of one behavior are a loop of uniquely titled tests over typed cases, with hooks outside the loop, as
Playwright's [Parameterize tests](https://playwright.dev/docs/test-parameterize) shows; each case can carry its own
tags.

## Waiting

Let Playwright wait: actions wait for their element, web-first assertions retry, and `navigation.expectThisPage()`
waits for a page the test arrives at. No sleeps, and no `waitUntil: "networkidle"`, which Playwright's own
declarations mark discouraged ("rely on web assertions to assess readiness instead"). What every test of a page needs
before it starts belongs in its `pageActionsToPerformAfterNavigation()`.

## Overlays that appear at random

An overlay that appears predictably (a cookie dialog on a first visit) is part of the flow: dismiss it in a step, or
set the consent before navigating so it never shows. One that appears unpredictably (a survey, a chat invitation) gets
Playwright's `page.addLocatorHandler()`, with the overlay's path as the trigger, registered where the page object is
created:

```ts title="home.page.ts"
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

type Paths = "main" | "main.button@subscribe" | "dialog@survey" | "dialog@survey.button@close";

export class HomePage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "");
  }

  protected defineLocators(): void {
    this.add("main").getByRole("main");
    this.add("main.button@subscribe").getByRole("button", { name: "Subscribe" });
    this.add("dialog@survey").getByRole("dialog", { name: "Survey" });
    this.add("dialog@survey.button@close").getByRole("button", { name: "Close" });
  }
}
```

```ts title="home.fixtures.ts"
import { test as base } from "pomwright";
import { HomePage } from "./home.page";

export const test = base.extend<{ homePage: HomePage }>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await page.addLocatorHandler(homePage.getNestedLocator("dialog@survey"), async () => {
      await homePage.getNestedLocator("dialog@survey.button@close").click();
    });
    await use(homePage);
  },
});
```

Playwright checks for the overlay before each action and auto-waiting assertion, and runs the handler when it is
visible; see [addLocatorHandler](https://playwright.dev/docs/api/class-page#page-add-locator-handler) for its rules.
