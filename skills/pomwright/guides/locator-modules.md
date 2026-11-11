# Locator modules

A locator module is a function that registers locators on a registry. Page objects call them from
`defineLocators()`, and modules compose, so the parts every page shares are written once. Full rules:
[Locator modules](https://dyhex.github.io/POMWright/docs/locator-modules/).

## Contents

- [A module that others compose](#a-module-that-others-compose)
- [Locators every page shares, in the base class](#locators-every-page-shares-in-the-base-class)
- [Slots](#slots)
- [Sharing one locator between modules](#sharing-one-locator-between-modules)
- [Passing state or the page](#passing-state-or-the-page)
- [What a module returns](#what-a-module-returns)

## A module that others compose

A module of a part several pages have (a header, a dialog) has two signatures: the overload callers see, which accepts
a registry holding its paths and any others, and the implementation, typed with its own paths only, so `registry.add`
offers exactly those:

```ts title="header.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths = "header" | "header.link@cart" | "header.link@help";

export function defineLocators<ExternalPaths extends string = never>(
  registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("header").getByRole("banner");
  registry.add("header.link@cart").getByRole("link", { name: "Cart" });
  registry.add("header.link@help").getByRole("link", { name: "Help" });
}
```

A dialog gets a module of its own, `dialog.<name>.locators.ts` with paths `dialog@<name>…`, so the dialogs sit side by
side. A module that composes others imports their `Paths` and functions and unions them with its own:

```ts title="common.locators.ts"
import type { LocatorRegistry } from "pomwright";
import { defineLocators as addHeader, type Paths as Header } from "./header.locators";

export type Paths = Header | "main" | "main.heading";

export function defineLocators<ExternalPaths extends string = never>(
  registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
  addHeader(registry);
  registry.add("main").getByRole("main");
  // "main.heading" is a slot: each page registers its own
}
```

## Locators every page shares, in the base class

The app's base class registers the common module and has each page register its own locators after it; it is also the
place for the methods that use the common locators:

```ts title="shop.page.ts"
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";
import { defineLocators as addCommon, type Paths as CommonPaths } from "./common.locators";

export abstract class ShopPage<Paths extends string> extends PageObject<Paths | CommonPaths> {
  protected constructor(page: Page, urlPath: string) {
    super(page, process.env.SHOP_URL ?? "https://shop.example", urlPath);
  }

  protected defineLocators(): void {
    addCommon(this.locatorRegistry);
    this.definePageLocators();
  }

  /** Registers the page's own locators; the common ones are registered already. */
  protected abstract definePageLocators(): void;

  async openCart() {
    await this.getNestedLocator("header.link@cart").click();
  }
}
```

```ts title="orders.page.ts"
import type { Page } from "@playwright/test";
import { ShopPage } from "./shop.page";

type Paths = "main.list@orders" | "main.list@orders.items";

export class OrdersPage extends ShopPage<Paths> {
  constructor(page: Page) {
    super(page, "/orders");
  }

  protected definePageLocators(): void {
    this.add("main.heading").getByRole("heading", { name: "Orders" });
    this.add("main.list@orders").getByRole("list", { name: "Orders" });
    this.add("main.list@orders.items").getByRole("listitem");
  }
}
```

A page that registers a common path again fails with the duplicate error. A page's own module, called from
`definePageLocators()`, lists the common paths in its union when it reuses one or names one in a `has` filter.

## Slots

A slot is a path a shared module declares but does not register, so each page fills it with its own locator
(`main.heading` above). A page that forgets fails only when the path is resolved, since the check covers registered
paths.

## Sharing one locator between modules

The module that owns a locator registers it once; another registers a copy at its own path with
`add(path, { reuse: "owner.path" })` and narrows it (`references/reusing.md`).

## Passing state or the page

A module is a plain function and takes what its definitions need: a locale for its names, or the page for a `has`
filter by a Playwright `Locator`. A page object passes its own, `defineLocators(this.locatorRegistry, this.locale)`,
which works because `defineLocators()` runs after the constructor. Prefer a registered path in `has` to a `Locator`:
it is named and checked.

## What a module returns

Nothing: a block body or `: void`. One that hands out a seed or a query names its type with POMWright's exported types
(`references/typescript.md`).
