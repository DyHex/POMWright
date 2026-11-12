---
name: pomwright-map-site
description: >-
  Maps a running website and generates POMWright page objects, locator modules, fixtures and starter tests for the
  pages the user picks: it crawls the origin the user names, reads each page's accessibility snapshot, DOM and
  screenshot, reveals what a user can open (menus, tabs, "show more", a choice that leads to another page), designs
  user-facing locator paths with the parts pages share as common modules, writes the files and checks every path
  against the live page. Use it when the user asks to generate page objects, locators or a test project for a site or
  app, to map an origin or domain for POMWright, or to start a POMWright suite from an existing application. It builds
  on the pomwright skill.
license: Apache-2.0
compatibility: POMWright 3.x, @playwright/test >=1.64.0 <2.0.0, Node 20 or later; a browser installed for Playwright.
---

# Map a site into POMWright page objects

From a running site to page objects the tests can use: the user names the origin and picks the pages; the agent reads
each page the way a user meets it, designs its paths, generates the files, and checks every path against the live page.

## Before you start

- **Use the `pomwright` skill** for every rule this workflow applies: locators and paths
  (`guides/choosing-locators-and-paths.md`), page objects, locator modules, fixtures, test data and the project's
  structure, and its templates. If it is not installed, install it (`npx skills add DyHex/POMWright`) or follow the
  site, [dyhex.github.io/POMWright](https://dyhex.github.io/POMWright/docs/installation/).
- **Read [references/safety.md](references/safety.md)**: what mapping may click, and why nothing it does sends data.
- **The project**: `@playwright/test` 1.64 or later and `pomwright` 3.x installed, with a browser
  (`npx playwright install chromium`). A project without them starts from the `pomwright` skill's
  `guides/project-structure.md`.

## What it needs, and what helps

**Enough to map well**: Node 20 or later, the project's `@playwright/test` with Chromium, `pomwright` 3.x, the origin
reachable from the machine, and for pages behind a login a Playwright `storageState` file the user saved. With that,
`scripts/map.mjs` does every step below: crawl, snapshot, DOM, screenshot, reveal, each one command.

**Map with the script.** It reads a page in one command (its snapshot, DOM and screenshot), where Playwright's own
tools take a call per step, so it costs less and takes less time for the same pages. Those tools can help with a state
the script's `reveal` cannot reach (a control a click does not open, a widget driven by drag or hover), under the same
safety rules:

- **`playwright-cli`** with its skill (`npm install -g @playwright/cli`, then `playwright-cli install --skills`): a
  browser session the agent drives step by step (`snapshot`, `click`, `go-back`, `screenshot`, `eval`,
  `generate-locator <ref>`), useful for a page with many states to reveal. It drives Google Chrome by default; with
  `--browser chromium` it uses Playwright's Chrome for Testing, which `playwright-cli install-browser
  chrome-for-testing` installs.
- **Playwright MCP** (`@playwright/mcp`): the same as tools of the agent (`browser_snapshot`, `browser_click`,
  `browser_navigate_back`, `browser_take_screenshot`, `browser_evaluate`; `--caps=testing` adds
  `browser_generate_locator`).

At step 1, tell the user what this machine has, and map with the script. Ask before using `playwright-cli` or MCP for a
state the script cannot reach, saying which state and why; where no one can be asked, use the script, and name the
states it could not reach in your reply. Mapping goes ahead with the script either way.

## The workflow

1. **Scope.** Ask in one message, every question together: the origin (and any other origin the flow crosses), the start
   path, the environment, and whether pages need a login; what tests should check beyond the elements a user acts on:
   values, texts and states (a product's name, price and content; a status); and whether the app's source is in this
   repository or one the user can point to. The project's `POMWRIGHT.md` holds its decisions; without one, the
   `pomwright` skill writes it first, its questions in the same message. Confirm before the first navigation.
2. **Crawl** from the project's root:
   `node <this skill>/scripts/map.mjs crawl https://shop.example/ --depth 2 --limit 40`, with `--origin <url>` for each
   other origin the user named (every command takes it). It prints the pages found on the origin, grouped by path
   pattern (`/orders/[id]`), with their titles, and the links to other origins, not opened; a page that redirects to an
   origin not named is listed as not opened. Show the list; **the user picks the pages**.
3. **Read each picked page three ways**:
   `node <this skill>/scripts/map.mjs snapshot <url> --consent "<button>"`, with the cookie dialog's least-consent
   button the user agreed to, and `--wait-for "<role>=<name>"` for a page whose content arrives after it loads. It
   prints the accessibility snapshot (roles, names, states) and what the snapshot does not name (test ids, ids, text
   hidden from assistive technology), and saves the DOM and a full-page screenshot. Read the snapshot whole, search the
   DOM for what it leaves out (it is many times the snapshot's size: never read it whole), and look at the screenshot:
   what a user sees, what covers what, what reads as one card or one row. Read them as
   [references/from-snapshot-to-paths.md](references/from-snapshot-to-paths.md) says.
4. **Reveal what a user can open.** List the controls that change what the page shows: menus, tabs, accordions,
   "show more", a choice between options (an age group, a plan type), the cookie dialog. Confirm them with the user,
   then `node <this skill>/scripts/map.mjs reveal <url> --click "<role>=<name>" …`: for each it says whether the URL
   changed and what appeared, and goes back; a click that leads to an origin not named (a log-in button that sends to
   an identity provider) is not opened, and says where it leads. A choice that leads to another URL is a page of its own: the same template
   at several URLs is one page object with a RegExp path. A click another element intercepts is a fact to report, not
   one to force.
5. **Shared parts.** What several pages have (header, menus, footer, the cookie dialog) is registered once, in common
   modules the base class registers. Find them in the app's source when it is available (the components each page
   uses, their test ids); otherwise compare the pages' snapshots: the same subtree on each page is a shared part.
6. **Design** each page's path tree before writing code; for a large page, show it to the user first.
7. **Generate**, following the `pomwright` skill and the project's `POMWRIGHT.md`: the app's origin in `env.ts` (once per
   origin), then per page a locator module, its page code and its fixture. For `PageObject`, that is a page object that
   extends the app's base class, with what "loaded" means in `pageActionsToPerformAfterNavigation()`; in any shape,
   methods only for the actions the user names, and checks for the values the user named in step 1.
8. **Verify**: `npx tsc --noEmit`, then a starter spec per page that opens it and checks every path (below); run it,
   fix a path that matches nothing or too much, and run it again until it passes.
9. **Report** what was generated; the pages, states and elements left out and why; the paths that needed a test id, an
   id or CSS because nothing user-facing identified them; and the missing accessibility seen (a current choice hidden
   from assistive technology, a control with no name, a click area over a button).

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
    this.add("main").getByRole("main");

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

In the project, the spec imports `test` from the project's fixtures instead of defining its own. In another shape,
it resolves the same lists through the registry its fixture hands the test.
