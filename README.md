# POMWright

[![CI on main](https://img.shields.io/github/actions/workflow/status/DyHex/POMWright/main.yaml?branch=main&label=CI%20on%20main)](https://github.com/DyHex/POMWright/actions/workflows/main.yaml)
[![Docs](https://img.shields.io/badge/docs-dyhex.github.io%2FPOMWright-2ea44f)](https://dyhex.github.io/POMWright/)
[![npm version](https://img.shields.io/npm/v/pomwright)](https://www.npmjs.com/package/pomwright)
[![npm downloads](https://img.shields.io/npm/d18m/pomwright)](https://www.npmjs.com/package/pomwright)
[![Playwright peer dependency](https://img.shields.io/npm/dependency-version/pomwright/peer/%40playwright%2Ftest)](https://www.npmjs.com/package/@playwright/test)
[![Node version](https://img.shields.io/node/v/pomwright)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-%E2%89%A55.0-3178c6)](https://dyhex.github.io/POMWright/docs/installation/#typescript-settings)
[![License](https://img.shields.io/github/license/DyHex/POMWright)](https://github.com/DyHex/POMWright/blob/main/LICENSE)
[![Created at ICE](https://img.shields.io/badge/created%40-ICE-ffcd00)](https://www.ice.no/)

POMWright is a TypeScript library for [Playwright Test](https://playwright.dev/) that gives a suite's locators one
place to live. You register each locator once, under a dot-delimited path, with Playwright's own methods; POMWright
builds the chain from the path, and what you get back is a plain Playwright `Locator`. Page objects, session storage,
report logging and steps build on that, and each part works on its own.

## Example

An orders page lists the orders the app keeps in session storage, in a table. The rows are registered once; two methods
narrow them to one order, and each reaches a different element in that row:

```ts
// orders.page.ts
import { expect, type Page } from "@playwright/test";
import { json, PageObject, step } from "pomwright";

// the known statuses are suggested; any other string is accepted too
type OrderStatus = "Open" | "Approved" | "Completed" | "Cancelled" | (string & {});
export type Order = { id: string; status: OrderStatus };

const ordersStorage = { orders: json<Order[]>() };

type Paths =
  | "main"
  | "main.table@orders"
  | "main.table@orders.row"
  | "main.table@orders.row.button@cancel"
  | "main.table@orders.row.cell@status";

export class OrdersPage extends PageObject<Paths, { storage: typeof ordersStorage }> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/orders", { sessionStorage: { schema: ordersStorage } });
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.table@orders").getByRole("table", { name: "Orders" });
    this.add("main.table@orders.row").getByRole("row");
    this.add("main.table@orders.row.button@cancel").getByRole("button", { name: "Cancel" });
    this.add("main.table@orders.row.cell@status").getByTestId("order-status");
  }

  @step()
  async cancel(options: { order: string }) {
    const { order } = options;
    await this.getLocatorSchema("main.table@orders.row.button@cancel")
      .filter("main.table@orders.row", { hasText: order })
      .getNestedLocator()
      .click();
  }

  @step()
  async expectStatus(options: { order: string; status: OrderStatus }) {
    const { order, status } = options;
    const cell = this.getLocatorSchema("main.table@orders.row.cell@status")
      .filter("main.table@orders.row", { hasText: order })
      .getNestedLocator();
    await expect(cell).toHaveText(status);
  }
}
```

The test receives the page object as a Playwright fixture, seeds the orders and logs them to the report, then opens the
page:

```ts
// orders.spec.ts
import { expect } from "@playwright/test";
import { test as base } from "pomwright";
import { type Order, OrdersPage } from "./orders.page";

const test = base.extend<{ ordersPage: OrdersPage }>({
  ordersPage: async ({ page }, use) => {
    await use(new OrdersPage(page));
  },
});

const orders: [Order, Order] = [
  { id: "ORD-1042", status: "Open" },
  { id: "ORD-1043", status: "Open" },
];

test("a customer cancels an open order", async ({ ordersPage, log }) => {
  await ordersPage.sessionStorage.seed({ orders });
  log.info("seeded sessionStorage", { orders });

  await ordersPage.navigation.goto();
  await expect(ordersPage.getNestedLocator("main.table@orders")).toBeVisible();
  await ordersPage.expectStatus({ order: orders[0].id, status: "Open" });
  await ordersPage.cancel({ order: orders[0].id });
  await ordersPage.expectStatus({ order: orders[0].id, status: "Cancelled" });
});
```

Cancelling `ORD-1042` clicks this locator, which the report and the trace viewer show by its path,
`main.table@orders.row.button@cancel`:

```text
locator('main').getByRole('table', { name: 'Orders' }).getByRole('row').filter({ hasText: 'ORD-1042' }).getByRole('button', { name: 'Cancel' })
```

`getNestedLocator(path)` resolves a path's registered chain as it is: the shorthand for the locators you use most, as
the test does with the table. `getLocatorSchema(path)` returns a copy of the chain to narrow, index, patch or replace
for one use, as both methods do; the registered locators never change.

`seed` stores entries before the app's first script reads them, typed by the schema the page object declares, and the
`log` fixture of `pomwright`'s `test` attaches each entry it records to the report.

A path that is not in `Paths` does not compile, and a mistake the compiler cannot see fails the fixture before the test
body runs. Say `Paths` also declared
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
there. The registry pays off as a suite grows:

- **The same structure, located again and again,** with a variation for one use, while the registered locator stays
  as it is.
- **Locators shared** across page objects, or across applications, through locator modules and seeds.
- **Many similar elements on a page.** Every path resolves as a chain scoped by its ancestors, so a Cancel button is
  found in its row, in the orders table, in `main`. The scope is written once, in the registry, not at every use.

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
