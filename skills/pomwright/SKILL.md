---
name: pomwright
description: >-
  Writes, reviews, refactors and upgrades (from POMWright 2.x) Playwright tests that use POMWright (the pomwright
  package): page objects (PageObject, or the project's own classes, functions or fixtures over a registry),
  dot-delimited locator paths and locator modules (add, getNestedLocator, getLocator, getLocatorSchema, createReusable,
  createRegistryWithAccessors), fixtures and test data, navigation, session storage (SessionStorage, seed), the log
  fixture and the @step decorator. Use it whenever code imports from "pomwright", when a project's tests use page
  objects with locator paths such as "main.form@login.button@login", when a project has a POMWRIGHT.md, when setting up
  or restructuring a Playwright project with page objects, when upgrading from POMWright 2.x, or when the user mentions
  POMWright. It says what POMWright adds to Playwright and leaves everything else to Playwright.
license: Apache-2.0
compatibility: POMWright 3.x, @playwright/test >=1.64.0 <2.0.0, Node 20 or later, TypeScript.
---

# POMWright

POMWright, for Playwright Test, names each locator with a dot-delimited path, registers one per path and builds the
chain from it; page objects, session storage, a logger and steps build on that. Tests stay Playwright tests.

## First, the installed versions

Read the versions in `node_modules/pomwright/package.json` and `node_modules/@playwright/test/package.json`.

- **POMWright 3.x**: follow this skill. **2.x or 1.x**: say so before changing anything; the upgrade is its own task:
  [guides/upgrading-from-2x.md](guides/upgrading-from-2x.md). **Not installed**: `npm install --save-dev pomwright`
  (or `pnpm add --save-dev pomwright`); see [Installation](https://dyhex.github.io/POMWright/docs/installation/).
- **`@playwright/test`**: inside the range in POMWright's `peerDependencies` (3.x: `>=1.64.0 <2.0.0`). Outside it, say
  so before changing anything: POMWright relies on that range's Playwright, and upgrading Playwright is the user's
  call (`npm install --save-dev @playwright/test@latest`, then `npx playwright install`). Write Playwright code for the
  installed version: its API is in the installed declarations.

## Then, the project's POMWRIGHT.md

A project keeps its POMWright decisions in `POMWRIGHT.md`: which parts of POMWright it uses, the shape of its page
code, Playwright's `baseURL`, path names, test data, and the other choices POMWright leaves open. Look for it beside the
Playwright config the task concerns, then in each folder above it, up to the repository root.

- **Only the parts it uses.** Its *POMWright's parts* names which of `PageObject`, a `LocatorRegistry` of its own,
  `@step`, `SessionStorage` and the `log` fixture the project uses: write code with those alone, and Playwright's own
  API for the rest. Each part brings what belongs to it: its types, options and helpers (the `json` codec with session
  storage, the `LocatorRegistry` type a page object's locator module takes). A file without that section: the parts
  the project's code uses; ask before bringing in another.

- **Found**: follow it. Its decisions replace this skill's defaults (rules 3 to 6 and 10 below, its examples' and
  templates' names, the guides' conventions); how POMWright and Playwright behave is not a decision. Where the project's
  code does otherwise, say so in your reply and ask which holds. Where it names another model or effort, say so; the
  session does the task unless the file or the user hands it to a subagent. Record new preferences.
- **Missing**: creating it is the first task in the project, also when it has tests and page code and when the request
  asks for code: ask the user every decision in one message, showing what the project does now beside the default, then
  stop and write no code until they answer; write the answers into a copy of
  [assets/templates/POMWRIGHT.md](assets/templates/POMWRIGHT.md) and offer a line pointing to it in the project's agent
  instructions (`AGENTS.md`, `CLAUDE.md`). Each decision and how to ask it:
  [guides/project-decisions.md](guides/project-decisions.md). A question that works on no project's code needs no file.

## What POMWright adds, and what stays Playwright

| Playwright's, used as playwright.dev documents it; POMWright changes none of it | what POMWright adds on it; each part stands alone |
| --- | --- |
| locators, `filter`, `nth`, chaining | a path per locator, a registry with one locator per path, the chain built from a path, queries for one use |
| page object classes, `page.goto`, `page.waitForURL`, `baseURL` | `PageObject`, a base class to extend or not: a page's origin and path, a navigation helper, its registry checked at construction |
| `page.sessionStorage` | `SessionStorage`: codecs, report steps, and `seed` before an app's first script |
| `test.step` | `@step()`, an async method as a report step |
| the test runner, `test`, fixtures, configuration, projects | `test` with a `log` fixture, whose entries go into the report |
| actions, auto-waiting, `expect`, `storageState`, tracing, reports | nothing: a resolved path is an ordinary `Locator` |

## Where facts come from

- **Signatures, options, error messages**: the installed `node_modules/pomwright/dist/index.d.ts`, with every doc
  comment, its example and API page link. Search the large file for a name; never read it whole or write from memory.
- **Concepts and the full rules**: the site page each section links, under `https://dyhex.github.io/POMWright/`.
- **Playwright itself**: playwright.dev.
- **When something fails**: POMWright's messages name the page object and the path, and most say the fix; a registry
  mistake fails the test in its fixture, listing every failing path. Search the message in the installed declarations
  or on [Error messages](https://dyhex.github.io/POMWright/api/errors/) before changing code.

## The rules for every task

They hold in every shape of page code ([guides/choosing-a-shape.md](guides/choosing-a-shape.md)). Rules 8 and 9 are how
POMWright works; the others are defaults with their reasons: look at the project and the page first, follow the
project's `POMWRIGHT.md` where it decides otherwise (rules 3 to 6 and 10), and where a page takes away a rule's reason,
depart from it and say why. Where several ways are right and nothing says which, ask, all open questions at once; where
no one can be asked, take a tester's way and say why. Examples and templates show reasoning, not a pattern to copy.

1. **Act on and assert against `getNestedLocator(path)`**, the chain of the path's segments; use `getLocator(path)`, the
   path's own locator alone, only to build a chain yourself, inside a filter, or to count every match on the page.
2. **One locator per path, registered once**, in `defineLocators()` or a locator module: a page's change is one edit.
3. **Locators as a user finds the element**, usually the first in this order that identifies it in its scope:
   `getByRole` with the accessible name (interactive elements, landmarks, forms, dialogs, tables), `getByLabel` (form
   fields), `getByPlaceholder` (a field without a label), `getByText` (non-interactive text), `getByAltText`,
   `getByTitle`, then `getByTestId` and POMWright's `getById` when nothing user-facing identifies it, and `locator(css)`
   last; never XPath. The element and the page decide, not the order alone. One that matches several is narrowed
   before the next is tried: by the method's own options, each for its situation (`getByRole`'s `name`, `exact`,
   `description`, `level`, `checked`, `pressed`, `selected`, `expanded`, `disabled`, `includeHidden`; `exact` on the
   text methods), then `filter()` (`hasText`, `hasNotText`, `has`, `hasNot`, `visible`); `nth` last. `hasText` matches
   part of a text, ignoring case ("Lamp" passes "Desk lamp"): one item of several is picked by the element inside that
   names it, with its exact name, through `has`.
4. **Paths from the outside in**, one segment per element a user would recognize (a landmark, a form, a dialog, a
   table), only as many as make the chain unique; a segment can be there for its scope: `main` keeps a path's search in
   the main content, a dialog outside main starts a path of its own (`dialog@cookies.button@accept`), a page with no
   main has no `main`. A segment's kind says what the element does (`input` for any field, `button`, `link`), or its
   role where POMWRIGHT.md says so (`textbox`, `banner`); its `@which` names what the locator picks it by, in a user's
   words, by what it does or is for (`button@login`, not `button@submit`); a status found without a name is
   `main.status`. Several matches in its scope make a segment plural (`main.list@products.cards`, a row's `cells`), also
   when a query picks one; one, singular; a row with no row header is picked by one of its `cells`.
5. **Page code reaches tests as Playwright fixtures**; what every page of one app shares (its origin, its common
   locators) is in one place, such as the app's base class; a test reads as steps on the page code.
6. **The page code's actions and checks are report steps**: `@step()` methods in a class, `test.step` in a function;
   one with two or more parameters takes one options object.
7. **A variation for one use is a query**, `getLocatorSchema(path)`, changed and resolved; `update` before `replace`.
   Registered locators never change.
8. **A `PageObject`'s `defineLocators()` registers synchronously** and runs right after the constructor, so it may read
   constructor arguments and fields; resolve a locator in a getter or a method, never in a field initializer. A
   registry you create yourself is checked when you call `registry.verify()`, after the last registration.
9. **Resolution is synchronous**: `getNestedLocator`, `getLocator`, `getLocatorSchema` return at once; never await them.
10. **Test data comes from one test-data fixture**, by dot paths (`testData.orders.open`): values, data imported from
    files (JSON too), and generators, builders and helpers for data a case makes; page code takes data as arguments.
11. **Wait as Playwright waits**: web-first assertions, not a value read once (`count()`, `isVisible()`) and asserted;
    `navigation.expectThisPage()` or `page.waitForURL()` after a navigation; no sleeps. A page whose content arrives
    after it loads says what "loaded" means in `pageActionsToPerformAfterNavigation()`, so `goto()` waits for it.

## One complete example

An orders page: its locator module, the least a page object needs, the base class of the app's origin with every
option, the page object written on it, then fixtures, test data and a test.

```ts title="orders.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths =
  | "main"
  | "main.table@orders"
  | "main.table@orders.rows"
  | "main.table@orders.rows.rowheader"
  | "main.table@orders.rows.button@cancel"
  | "main.table@orders.rows.cell@status";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").getByRole("main");

  registry.add("main.table@orders").getByRole("table", { name: "Orders" });

  registry.add("main.table@orders.rows").getByRole("row");

  registry.add("main.table@orders.rows.rowheader").getByRole("rowheader");

  registry.add("main.table@orders.rows.button@cancel").getByRole("button", { name: "Cancel" });

  registry.add("main.table@orders.rows.cell@status").getByTestId("order-status");
}
```

The least a page object needs is its origin, its path and its locators:

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";
import { defineLocators, type Paths } from "./orders.locators";

export class MinimalOrdersPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/orders");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }
}
```

In a project, every page of an origin extends the origin's base class, which sets what they share and forwards every
option with its type, so a page passes only what it needs and never casts. It is also where the parts every page has
are registered (`guides/writing-page-objects.md`):

```ts title="shop.page.ts"
import type { Page } from "@playwright/test";
import {
  PageObject,
  type PageObjectOptions,
  type PageObjectTypeOptions,
  type StorageTypeFromOptions,
  type UrlPathTypeFromOptions,
} from "pomwright";

// the origin is a string; a page's own path type (a RegExp for a URL that varies) and storage schema pass through
type ShopOptions<Options extends PageObjectTypeOptions> = {
  baseUrlType: string;
  urlPathType: UrlPathTypeFromOptions<Options>;
  storage: StorageTypeFromOptions<Options>;
};

export abstract class ShopPage<
  Paths extends string,
  Options extends PageObjectTypeOptions = { urlPathType: string },
> extends PageObject<Paths, ShopOptions<Options>> {
  protected constructor(
    page: Page,
    urlPath: UrlPathTypeFromOptions<ShopOptions<Options>>,
    options?: PageObjectOptions<ShopOptions<Options>>,
  ) {
    // a page's label and storage schema pass through; the navigation and registry defaults are the shop's, and a
    // page may change them
    super(page, process.env.SHOP_URL ?? "https://shop.example", urlPath, {
      ...options,
      navOptions: { waitUntil: "domcontentloaded", ...options?.navOptions },
      locators: { strictChains: false, ...options?.locators },
    });
  }
}
```

The orders page passes its path and the schema of the session storage the app keeps its orders in:

```ts title="orders.page.ts"
import { expect, type Page } from "@playwright/test";
import { json, step } from "pomwright";
import { defineLocators, type Paths } from "./orders.locators";
import { ShopPage } from "./shop.page";

export type OrderStatus = "Open" | "Cancelled";
export type Order = { id: string; status: OrderStatus };

const ordersStorage = { orders: json<Order[]>() };

export class OrdersPage extends ShopPage<Paths, { storage: typeof ordersStorage }> {
  constructor(page: Page) {
    super(page, "/orders", { sessionStorage: { schema: ordersStorage } });
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }

  private orderNumber(order: string) {
    return this.getLocatorSchema("main.table@orders.rows.rowheader")
      .update()
      .getByRole({ name: order, exact: true })
      .getLocator();
  }

  @step()
  async cancel(options: { order: string }) {
    await this.getLocatorSchema("main.table@orders.rows.button@cancel")
      .filter("main.table@orders.rows", { has: this.orderNumber(options.order) })
      .getNestedLocator()
      .click();
  }

  @step()
  async expectStatus(options: { order: string; status: OrderStatus }) {
    const cell = this.getLocatorSchema("main.table@orders.rows.cell@status")
      .filter("main.table@orders.rows", { has: this.orderNumber(options.order) })
      .getNestedLocator();
    await expect(cell).toHaveText(options.status);
  }
}
```

```ts title="test-data.ts"
import type { Order } from "./orders.page";

export const testData = { orders: { open: { id: "ORD-1042", status: "Open" } satisfies Order } };
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

test("a customer cancels an open order", async ({ ordersPage, testData }) => {
  const order = testData.orders.open.id;
  await ordersPage.sessionStorage.seed({ orders: [testData.orders.open] });
  await ordersPage.navigation.goto();
  await ordersPage.expectStatus({ order, status: "Open" });
  await ordersPage.cancel({ order });
  await ordersPage.expectStatus({ order, status: "Cancelled" });
});
```

Canceling `ORD-1042` clicks this chain, which the report shows as `main.table@orders.rows.button@cancel`:

```text
getByRole('main').getByRole('table', { name: 'Orders' }).getByRole('row').filter({ has: getByRole('rowheader', { name: 'ORD-1042', exact: true }) }).getByRole('button', { name: 'Cancel' })
```

The row is found by its header's exact name (`hasText` would match `ORD-10420` too), the rest as a user finds them; the
status is what tests check, so it can't find its own cell: a test id does, or without one its column (`nth`), as a moved
column then fails with what it found, like a wrong status. `expectStatus` is page code: most tests here check a status.

## Which file to read for which task

| task | read |
| --- | --- |
| register locators: the ten methods, `filter`, `nth`, `describe`, `getById`, frames | [references/registering.md](references/registering.md) |
| paths, their rules, the registry, `createRegistryWithAccessors`, `verify`, `strictChains`, when the page changes | [references/paths-and-registry.md](references/paths-and-registry.md) |
| `getNestedLocator`, `getLocator`, several matches, queries (`getLocatorSchema`, `update`, `replace`, `skip`), one row or card among several | [references/resolving-and-queries.md](references/resolving-and-queries.md) |
| share a locator (reuse by path) or make variants (`createReusable`) | [references/reusing.md](references/reusing.md) |
| a page object: its parts, when `defineLocators()` runs, actions after navigation, how a mistake is reported | [references/page-objects.md](references/page-objects.md) |
| URLs, the navigation helper, `baseURL` beside it, pages whose URL varies | [references/navigation.md](references/navigation.md) |
| session storage, codecs, `seed` | [references/session-storage.md](references/session-storage.md) |
| the `log` fixture, child loggers, `@step` | [references/reports.md](references/reports.md) |
| the exported types, generic base classes, `declaration: true` | [references/typescript.md](references/typescript.md) |
| a project's decisions: asking them, writing and keeping `POMWRIGHT.md` | [guides/project-decisions.md](guides/project-decisions.md) |
| choose the shape: `PageObject`, your own classes, functions or fixtures over a registry | [guides/choosing-a-shape.md](guides/choosing-a-shape.md) |
| choose a locator, the segments of a path, its name | [guides/choosing-locators-and-paths.md](guides/choosing-locators-and-paths.md) |
| write a page object for a page, with its locator module and fixture; pages not yet read are mapped by the `pomwright-map-site` skill (installed with this one) | [guides/writing-page-objects.md](guides/writing-page-objects.md) |
| locator modules: composing, common locators in the base class, slots | [guides/locator-modules.md](guides/locator-modules.md) |
| write tests: steps, assertions, data, waiting, random overlays | [guides/writing-tests.md](guides/writing-tests.md) |
| fixtures for page objects, the test-data fixture, setup some tests need | [guides/fixtures-and-test-data.md](guides/fixtures-and-test-data.md) |
| a project's layout, one app or several, starting from the templates | [guides/project-structure.md](guides/project-structure.md) |
| review or refactor a project, its page objects or its tests | [guides/reviewing.md](guides/reviewing.md) |
| upgrade a 2.x project | [guides/upgrading-from-2x.md](guides/upgrading-from-2x.md) |
