# POMWright

[![CI on main](https://img.shields.io/github/actions/workflow/status/DyHex/POMWright/main.yaml?branch=main&label=CI%20on%20main)](https://github.com/DyHex/POMWright/actions/workflows/main.yaml)
[![Docs](https://img.shields.io/badge/docs-dyhex.github.io%2FPOMWright-2ea44f)](https://dyhex.github.io/POMWright/)
[![npm version](https://img.shields.io/npm/v/pomwright)](https://www.npmjs.com/package/pomwright)
[![npm downloads](https://img.shields.io/npm/d18m/pomwright)](https://www.npmjs.com/package/pomwright)
[![Playwright peer dependency](https://img.shields.io/npm/dependency-version/pomwright/peer/%40playwright%2Ftest)](https://www.npmjs.com/package/@playwright/test)
[![Node version](https://img.shields.io/node/v/pomwright)](https://nodejs.org/)
[![License](https://img.shields.io/github/license/DyHex/POMWright)](https://github.com/DyHex/POMWright/blob/main/LICENSE)
[![Created at ICE](https://img.shields.io/badge/created%40-ICE-ffcd00)](https://www.ice.no/)

POMWright is a TypeScript library for [Playwright Test](https://playwright.dev/) that gives a suite's locators one
place to live. You register each locator once, under a dot-delimited path, with Playwright's own methods; POMWright
builds the chain from the path, and what you get back is a plain Playwright `Locator`. Page objects, session storage,
report logging and steps build on that, and each part works on its own.

## Example

An orders page lists orders in a table. The rows are registered once; two methods narrow them to one order, and each
reaches a different element in that row:

```ts
// orders.page.ts
import { expect, type Page } from "@playwright/test";
import { PageObject, step } from "pomwright";

type Paths =
  | "main"
  | "main.table@orders"
  | "main.table@orders.row"
  | "main.table@orders.row.button@cancel"
  | "main.table@orders.row.cell@status";

export class OrdersPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/orders");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.table@orders").getByRole("table", { name: "Orders" });
    this.add("main.table@orders.row").getByRole("row");
    this.add("main.table@orders.row.button@cancel").getByRole("button", { name: "Cancel" });
    this.add("main.table@orders.row.cell@status").getByTestId("order-status");
  }

  @step()
  async cancel(order: string) {
    await this.getLocatorSchema("main.table@orders.row.button@cancel")
      .filter("main.table@orders.row", { hasText: order })
      .getNestedLocator()
      .click();
  }

  @step()
  async expectStatus(order: string, status: string) {
    const cell = this.getLocatorSchema("main.table@orders.row.cell@status")
      .filter("main.table@orders.row", { hasText: order })
      .getNestedLocator();
    await expect(cell).toHaveText(status);
  }
}
```

The test receives the page object as a Playwright fixture:

```ts
// orders.spec.ts
import { expect } from "@playwright/test";
import { test as base } from "pomwright";
import { OrdersPage } from "./orders.page";

const test = base.extend<{ ordersPage: OrdersPage }>({
  ordersPage: async ({ page }, use) => {
    await use(new OrdersPage(page));
  },
});

test("a customer cancels an open order", async ({ ordersPage }) => {
  await ordersPage.navigation.goto();
  await ordersPage.cancel("ORD-1042");
  await ordersPage.expectStatus("ORD-1042", "Cancelled");
});

test("two orders are still open", async ({ ordersPage }) => {
  await ordersPage.navigation.goto();
  const openOrders = ordersPage
    .getLocatorSchema("main.table@orders.row")
    .filter({ hasText: "Open" })
    .getNestedLocator();
  await expect(openOrders).toHaveCount(2);
});
```

`cancel("ORD-1042")` clicks this locator, which the report and the trace viewer show by its path,
`main.table@orders.row.button@cancel`:

```text
locator('main').getByRole('table', { name: 'Orders' }).getByRole('row').filter({ hasText: 'ORD-1042' }).getByRole('button', { name: 'Cancel' })
```

`getLocatorSchema(path)` returns a copy of the path's chain to narrow, index, patch or replace for one use, as both
methods and the second test do; the registered locators never change. A path that is not in `Paths` does not compile,
and a mistake the compiler cannot see fails the fixture before the test body runs. Say `Paths` also declared
`main.table@orders.caption`, and the table were registered with `filter({ has: "main.table@orders.caption" })`, but the
caption itself never was:

```text
OrdersPage: Locator registry verification failed for 1 of 5 paths:
  "main.table@orders": No locator schema registered for path "main.table@orders.caption".
```

## The parts on their own

POMWright does not replace Playwright's API, runner or assertions, and `@playwright/test` is a peer dependency. Use as
much of it as you need:

| part | on its own |
| --- | --- |
| the locator registry | `const { add, getNestedLocator } = createRegistryWithAccessors<Paths>(page);` |
| page objects | `class OrdersPage extends PageObject<Paths>`, with `goto`, `expectThisPage` and `expectAnotherPage` from its URL |
| session storage | `await new SessionStorage(page, { origin }).seed({ token });` stores entries before the app's first script reads them |
| report logging | `test` from `pomwright`, whose `log` fixture attaches its entries to the test's report |
| report steps | `@step()` on any `async` method makes it a step of the report |

A suite with a few pages and little repetition may need none of it: plain Playwright locators in a class are enough
there. The registry pays off where the same structure is located again and again, with variations.

## Installation

```bash
npm install --save-dev pomwright
```

POMWright 3 needs `@playwright/test` 1.64 or later (below 2) and Node 20 or later.

## Documentation

- [Getting started](https://dyhex.github.io/POMWright/docs/installation/): installation, a first page object, page
  objects as fixtures, organising a project
- [API reference](https://dyhex.github.io/POMWright/api/): every export and member, and every error message
- [Upgrading from 2.x](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/): every change in 3.0.0 a 2.x project
  meets, and what to write instead
- [Internal](https://dyhex.github.io/POMWright/internal/): how POMWright works

Using POMWright 2.x? Its documentation is in this repository at the
[`v2.1.0` tag](https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2). Still on 1.x? The
[1.x to 2.x migration guide](https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v1-to-v2-migration) is at the same tag.

## Support

If you run into issues or have questions, please use the
[GitHub issues page](https://github.com/DyHex/POMWright/issues).

## Contributing

Pull requests are welcome. [AGENTS.md](./AGENTS.md) is the contributor guide: the repository, the commands, the
conventions, and how the tests and the documentation are checked.

## License

POMWright is open-source software licensed under [Apache-2.0](./LICENSE).
