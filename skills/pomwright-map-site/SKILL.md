---
name: pomwright-map-site
description: >-
  Maps a running website and generates POMWright page objects, locator modules, fixtures and starter tests for the
  pages the user picks: it crawls the origin the user names, reads each page's accessibility snapshot, designs
  user-facing locator paths, writes the files and runs a check of every path against the live page. Use it when the
  user asks to generate page objects, locators or a test project for a site or app, to map an origin or domain for
  POMWright, or to start a POMWright suite from an existing application. It builds on the pomwright skill.
license: Apache-2.0
compatibility: POMWright 3.x, @playwright/test >=1.64.0 <2.0.0, Node 20 or later; a browser installed for Playwright.
---

# Map a site into POMWright page objects

From a running site to page objects the tests can use: the user names the origin and picks the pages; the agent reads
each page, designs its paths, generates the files, and checks every path against the live page.

## Before you start

- **Use the `pomwright` skill** for every rule this workflow applies: locators and paths
  (`guides/choosing-locators-and-paths.md`), page objects, locator modules, fixtures, test data and the project's
  structure, and its templates. If it is not installed, install it (`npx skills add DyHex/POMWright`) or follow the
  site, [dyhex.github.io/POMWright](https://dyhex.github.io/POMWright/docs/installation/).
- **Read [references/safety.md](references/safety.md)**: mapping only navigates, on the origins the user names.
- **The project**: `@playwright/test` 1.64 or later and `pomwright` 3.x installed, with a browser
  (`npx playwright install chromium`). A project without them starts from the `pomwright` skill's
  `guides/project-structure.md`.

## The workflow

1. **Scope.** Ask for the origin (and any other origin the flow crosses), the start path, the environment, and whether
   pages need a login; for a login, a Playwright `storageState` file the user saves, or credentials the user types for
   a setup step. Confirm before the first navigation.
2. **Crawl** from the project's root:
   `node <this skill>/scripts/map.mjs crawl https://shop.example/ --depth 2 --limit 40`. It prints the pages found on
   the origin, grouped by path pattern (`/orders/[id]`), with their titles. Show the list; **the user picks the pages**.
3. **Snapshot** each picked page: `node <this skill>/scripts/map.mjs snapshot <url>`. Read it as
   [references/from-snapshot-to-paths.md](references/from-snapshot-to-paths.md) says: containers become segments,
   elements become paths, the suggested locators are evidence.
4. **Design** each page's path tree before writing code; for a large page, show it to the user first.
5. **Generate**, following the `pomwright` skill: the app's base class with its origin from `env.ts` (once per origin),
   then per page a locator module, a page object that extends the base class (with what "loaded" means in
   `pageActionsToPerformAfterNavigation()`, and methods only for the actions the user names), and its fixture.
   Parts every page has (header, footer, dialogs) become composed modules registered by the base class.
6. **Verify**: `npx tsc --noEmit`, then a starter spec per page that opens it and checks every path (below); run it,
   fix a path that matches nothing or too much, and run it again until it passes.
7. **Report** what was generated, the pages and elements left out and why, and the paths that needed a test id, an id
   or CSS because nothing user-facing identified them.

## The starter spec

One test per page object, kept with the tests: it fails when the page changes under a path. Every singular path
matches exactly one element, every plural path at least one:

```ts title="orders.page.ts"
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

export type Paths = "main" | "main.table@orders" | "main.table@orders.rows" | "main.button@export";

export class OrdersPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/orders");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.table@orders").getByRole("table", { name: "Orders" });
    this.add("main.table@orders.rows").getByRole("row");
    this.add("main.button@export").getByRole("button", { name: "Export" });
  }
}
```

```ts title="orders.map.spec.ts"
import { expect, test as base } from "@playwright/test";
import { OrdersPage, type Paths } from "./orders.page";

const test = base.extend<{ ordersPage: OrdersPage }>({
  ordersPage: async ({ page }, use) => {
    await use(new OrdersPage(page));
  },
});

const singular: Paths[] = ["main", "main.table@orders", "main.button@export"];
const plural: Paths[] = ["main.table@orders.rows"];

test("every path of OrdersPage matches the page", async ({ ordersPage }) => {
  await ordersPage.navigation.goto();
  for (const path of singular) {
    await expect(ordersPage.getNestedLocator(path), path).toHaveCount(1);
  }
  for (const path of plural) {
    await expect(ordersPage.getNestedLocator(path).first(), path).toBeVisible();
  }
});
```

In the project, the spec imports `test` from the project's fixtures instead of defining its own.

## Other ways to explore

The script needs nothing beyond the project's Playwright. An agent that already has the official `playwright-cli`
(`snapshot`, `generate-locator <ref>`) or Playwright MCP (`browser_snapshot`, and `browser_generate_locator` with
`--caps=testing`) may use it instead, under the same rules: its snapshot and suggested locators feed steps 3 to 7
unchanged.
