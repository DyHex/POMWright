---
name: pomwright
description: >-
  Writes, reviews and refactors Playwright tests that use POMWright (the pomwright package): page objects
  (PageObject, or the project's own classes, functions or fixtures over a registry), dot-delimited locator paths and locator modules (add, getNestedLocator, getLocator, getLocatorSchema,
  createReusable, createRegistryWithAccessors), fixtures and test data, navigation, session storage (SessionStorage,
  seed), the log fixture and the @step decorator. Use it whenever code imports from "pomwright", when a project's tests
  use page objects with locator paths such as "main.form@login.button@login", when a project has a POMWRIGHT.md, when setting up or restructuring a
  Playwright project with page objects, or when the user mentions POMWright. It says what POMWright adds to Playwright
  and leaves everything else to Playwright.
license: Apache-2.0
compatibility: POMWright 3.x, @playwright/test >=1.64.0 <2.0.0, Node 20 or later, TypeScript.
---

# POMWright

POMWright is a library for Playwright Test. It names every locator with a dot-delimited path, registers one locator per
path, and builds the Playwright locator chain from the path; page objects, session storage, a report logger and test
steps build on that. Your tests stay Playwright tests.

## First, the installed version

Read the version in `node_modules/pomwright/package.json`.

- **3.x**: follow this skill.
- **2.x or 1.x**: say so before changing anything; the upgrade is its own task:
  [guides/upgrading-from-2x.md](guides/upgrading-from-2x.md).
- **Not installed**: `npm install --save-dev pomwright` (or `pnpm add --save-dev pomwright`) in a project that has
  `@playwright/test` 1.64 or later; see [Installation](https://dyhex.github.io/POMWright/docs/installation/).

## Then, the project's POMWRIGHT.md

A project keeps its POMWright decisions in `POMWRIGHT.md`: the shape of its page code, Playwright's `baseURL`, path
names, test data, and the other choices POMWright leaves open. Look for it beside the Playwright config the task
concerns, then in each folder above it, up to the repository root.

- **Found**: follow it, the model and effort it names for the task included. Its decisions replace this skill's
  defaults (rules 3 to 6 and 10 below, and the conventions in the guides); how POMWright and Playwright behave is not
  a decision. When the user states a new preference, or
  changes one, update the file.
- **Missing**: creating it is the first task in the project, before any other, also when the project has tests and
  page code: ask the user each decision, showing what the project's code already does, write the answers into a copy
  of [assets/templates/POMWRIGHT.md](assets/templates/POMWRIGHT.md), and offer a line in the agent instructions the
  project uses (`AGENTS.md`, `CLAUDE.md`) that points to it. The decisions, their options and how to ask them:
  [guides/project-decisions.md](guides/project-decisions.md).
- A question about POMWright that works on no project's code needs no file.

## What POMWright adds, and what stays Playwright

| Playwright's, used as playwright.dev documents it | what POMWright adds on it |
| --- | --- |
| locators, `filter`, `nth`, chaining | a path per locator, a registry with one locator per path, the chain built from a path, queries for one use |
| page object classes, `page.goto`, `page.waitForURL`, `baseURL` | `PageObject`, a base class to extend or not: a page's origin and path, a navigation helper, its registry checked at construction |
| `page.sessionStorage` | `SessionStorage`: codecs, report steps, and `seed` before an app's first script |
| `test.step` | `@step()`, an async method as a report step |
| the test runner, `test`, fixtures, configuration, projects | `test` with a `log` fixture, whose entries go into the report |
| actions, auto-waiting, `expect`, `storageState`, tracing, reports | nothing: a resolved path is an ordinary `Locator` |

Use Playwright for everything in the first column, as playwright.dev documents it; POMWright changes none of it. Each
part in the second column works without the others.

## Where facts come from

- **Signatures, options, error messages**: the installed declarations, `node_modules/pomwright/dist/index.d.ts`, which
  carry every doc comment with an example and a link to its API page. The file is large: search it for the name you
  need, do not read it whole. Never write a signature or a message from memory.
- **Concepts and the full rules**: the site page each section of this skill links, under
  `https://dyhex.github.io/POMWright/`.
- **Playwright itself**: playwright.dev.

## The rules for every task

They hold in every shape of page code ([guides/choosing-a-shape.md](guides/choosing-a-shape.md)). Rules 3 to 6 and 10
are defaults: where the project's `POMWRIGHT.md` decides otherwise, follow it.

1. **Act on and assert against `getNestedLocator(path)`**: the chain of the path's registered segments. Use
   `getLocator(path)`, the path's own locator without its ancestors, only to build a chain yourself, inside a filter, or
   to count every match on the page.
2. **One locator per path, registered once**, in `defineLocators()` or a locator module. A change to the page is an
   edit in one place.
3. **Locators in Playwright's order of preference**: `getByRole` with the accessible name (interactive elements, and
   landmarks, forms, dialogs, tables), `getByText` (non-interactive text), `getByLabel` (form fields),
   `getByPlaceholder` (a field without a label), `getByAltText`, `getByTitle`, then `getByTestId`, and POMWright's
   `getById` beside it, when nothing user-facing identifies the element; `locator(css)` last, for a segment the app
   gives no role, label or text.
4. **Paths from the outside in**, one segment per element a user would recognize (a landmark, a form, a dialog, a
   table), only as many as make the chain unique; each segment names its kind and which one, `kind@which`, the kind
   being the element's role (`button@save`, `dialog@consent`); a segment that matches several elements in its scope
   is plural (`main.list@products.cards`), one that matches one is singular (`main.list@products.card`).
5. **Page code reaches tests as Playwright fixtures**; what every page of one app shares (its origin, its common
   locators) is in one place, such as the app's base class; a test reads as steps on the page code.
6. **The page code's actions and checks are report steps**: `@step()` methods in a class, `test.step` in a function;
   one with two or more parameters takes one options object.
7. **A variation for one use is a query**, `getLocatorSchema(path)`, changed and resolved; `update` before `replace`.
   Registered locators never change.
8. **A `PageObject`'s `defineLocators()` registers synchronously** and runs right after the constructor, so it may read
   constructor arguments and fields; resolve a locator in a getter or a method, never in a field initializer. A
   registry you create yourself is checked when you call `registry.verify()`, after the last registration.
9. **Resolution is synchronous**: `getNestedLocator`, `getLocator` and `getLocatorSchema` return at once; await the
   action or the assertion, never the resolution.
10. **Test data comes from one test-data fixture**, by dot paths (`testData.orders.open`); page code takes data as
    arguments.
11. **Wait as Playwright waits**: web-first assertions, `navigation.expectThisPage()` or `page.waitForURL()` after a
    navigation; no sleeps.

## One complete example

An orders page as a `PageObject`: its locator module, its page object, the fixtures that hand it and the test data to
tests, and a test.

```ts title="orders.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths =
  | "main"
  | "main.table@orders"
  | "main.table@orders.rows"
  | "main.table@orders.rows.button@cancel"
  | "main.table@orders.rows.cell@status";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.table@orders").getByRole("table", { name: "Orders" });
  registry.add("main.table@orders.rows").getByRole("row");
  registry.add("main.table@orders.rows.button@cancel").getByRole("button", { name: "Cancel" });
  registry.add("main.table@orders.rows.cell@status").getByTestId("order-status");
}
```

```ts title="orders.page.ts"
import { expect, type Page } from "@playwright/test";
import { PageObject, step } from "pomwright";
import { defineLocators, type Paths } from "./orders.locators";

export type OrderStatus = "Open" | "Cancelled";

export class OrdersPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/orders");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }

  @step()
  async cancel(options: { order: string }) {
    await this.getLocatorSchema("main.table@orders.rows.button@cancel")
      .filter("main.table@orders.rows", { hasText: options.order })
      .getNestedLocator()
      .click();
  }

  @step()
  async expectStatus(options: { order: string; status: OrderStatus }) {
    const cell = this.getLocatorSchema("main.table@orders.rows.cell@status")
      .filter("main.table@orders.rows", { hasText: options.order })
      .getNestedLocator();
    await expect(cell).toHaveText(options.status);
  }
}
```

```ts title="test-data.ts"
export const testData = {
  orders: {
    open: { id: "ORD-1042" },
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

test("a customer cancels an open order", async ({ ordersPage, testData }) => {
  const order = testData.orders.open.id;
  await ordersPage.navigation.goto();
  await ordersPage.expectStatus({ order, status: "Open" });
  await ordersPage.cancel({ order });
  await ordersPage.expectStatus({ order, status: "Cancelled" });
});
```

Canceling `ORD-1042` clicks this chain, which the report shows as `main.table@orders.rows.button@cancel`:

```text
locator('main').getByRole('table', { name: 'Orders' }).getByRole('row').filter({ hasText: 'ORD-1042' }).getByRole('button', { name: 'Cancel' })
```

The status cell uses a test id because a cell has no name of its own to find it by; every other segment is found the
way a user finds it.

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
| write a page object for a page, with its locator module and fixture | [guides/writing-page-objects.md](guides/writing-page-objects.md) |
| locator modules: composing, common locators in the base class, slots | [guides/locator-modules.md](guides/locator-modules.md) |
| write tests: steps, assertions, data, waiting, random overlays | [guides/writing-tests.md](guides/writing-tests.md) |
| fixtures for page objects, the test-data fixture, setup some tests need | [guides/fixtures-and-test-data.md](guides/fixtures-and-test-data.md) |
| a project's layout, one app or several, starting from the templates | [guides/project-structure.md](guides/project-structure.md) |
| review or refactor a project, its page objects or its tests | [guides/reviewing.md](guides/reviewing.md) |
| upgrade a 2.x project | [guides/upgrading-from-2x.md](guides/upgrading-from-2x.md) |

## When something fails

POMWright's messages name the page object and the path, and most say the fix. A page object checks its registry right
after it is constructed, so a registry mistake fails the test in the fixture, before its body runs, listing every
failing path. Search the message in the installed declarations or on the site's
[Error messages](https://dyhex.github.io/POMWright/api/errors/) page before changing code.
