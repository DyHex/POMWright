---
title: Locator modules
description: "Keep locators in modules that register them on a registry: typing a module so it composes, passing it state, sharing locators between modules, and slots."
---

## Introduction

A locator module is a function that registers locators on a registry. A page object calls it from `defineLocators()`
with its own registry, `this.locatorRegistry`, and modules call each other, so the header that every page shares is
written once. There is nothing to learn beyond TypeScript, except one typing pattern that lets a module be composed
into a larger registry while it only offers its own paths.

## A module

```ts title="header.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths = "header" | "header.link@logo" | "header.link@help";

export function defineLocators<ExternalPaths extends string = never>(
  registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("header").getByRole("banner");
  registry.add("header.link@logo").getByRole("link", { name: "Shop" });
  registry.add("header.link@help").getByRole("link", { name: "Help" });
}
```

There is one function with two signatures. The first, the overload, is what callers see: it accepts a registry that
holds this module's paths and any others (`ExternalPaths`), so a page object with more paths can pass its registry.
The second is the implementation, typed with this module's paths only, so `registry.add(…)` inside the module offers
exactly these paths as completions. A module that no other module composes, typically a page's own, can drop the
overload.

## Composing modules

A module that composes others imports their paths and functions, and its union is theirs plus its own:

```ts title="footer.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths = "footer" | "footer.link@terms";

export function defineLocators<ExternalPaths extends string = never>(
  registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("footer").getByRole("contentinfo");
  registry.add("footer.link@terms").getByRole("link", { name: "Terms" });
}
```

```ts title="common.locators.ts"
import type { LocatorRegistry } from "pomwright";
import { defineLocators as addFooter, type Paths as Footer } from "./footer.locators";
import { defineLocators as addHeader, type Paths as Header } from "./header.locators";

export type Paths = Header | Footer | "main" | "main.heading";

export function defineLocators<ExternalPaths extends string = never>(
  registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
  addHeader(registry);
  addFooter(registry);
  registry.add("main").locator("main");
  // "main.heading" is a slot: each page registers its own (see Shared slots)
}
```

```ts title="login.locators.ts"
import type { LocatorRegistry } from "pomwright";
import { defineLocators as addCommon, type Paths as Common } from "./common.locators";

export type Paths = Common | "main.form@login" | "main.form@login.button@submit";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  addCommon(registry);
  registry.add("main.heading").getByRole("heading", { name: "Log in" });
  registry.add("main.form@login").getByRole("form", { name: "Log in" });
  registry.add("main.form@login.button@submit").getByRole("button", { name: "Log in" });
}
```

```ts title="login.page.ts"
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";
import { defineLocators, type Paths } from "./login.locators";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/login");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }
}
```

Each registry registers a path once: two modules that register the same path on one registry fail with the duplicate
error. A module is called once per page object, every time a page object is constructed.

## Passing state to a module

A module is a plain function, so it can take more than the registry. A definition that depends on the page object, such
as a locale passed to its constructor, takes that value as an argument:

```ts title="greeting.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Locale = "en" | "nb";
export type Paths = "main" | "main.button@login";

const loginLabel = { en: "Log in", nb: "Logg inn" } as const;

export function defineLocators<ExternalPaths extends string = never>(
  registry: LocatorRegistry<Paths | ExternalPaths>,
  locale: Locale,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>, locale: Locale) {
  registry.add("main").locator("main");
  registry.add("main.button@login").getByRole("button", { name: loginLabel[locale] });
}
```

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";
import { defineLocators, type Locale, type Paths } from "./greeting.locators";

export class GreetingPage extends PageObject<Paths> {
  constructor(page: Page, private readonly locale: Locale) {
    super(page, "https://shop.example", "/");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry, this.locale);
  }
}
```

This works because `defineLocators()` runs right after the constructor has finished, when `this.locale` is set (see
[Page objects](/POMWright/docs/page-objects/)).

## Sharing a locator between modules

The way to share one locator between modules is to reuse its path (see [Reusing locators](/POMWright/docs/reusing-locators/)).
The module that owns it registers it once; a module that composes it registers a copy at its own path and narrows the
copy:

```ts title="shared.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths = "shared.listItem" | "shared.alert";

export function defineLocators<ExternalPaths extends string = never>(
  registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("shared.listItem").getByRole("listitem");
  registry.add("shared.alert").getByRole("alert");
}
```

```ts title="orders.locators.ts"
import type { LocatorRegistry } from "pomwright";
import { defineLocators as addShared, type Paths as Shared } from "./shared.locators";

export type Paths = Shared | "main" | "main.orders" | "main.orders.item" | "main.orders.lastItem" | "main.error";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  addShared(registry);
  registry.add("main").locator("main");
  registry.add("main.orders").getByRole("list", { name: "Orders" });
  registry.add("main.orders.item", { reuse: "shared.listItem" });
  registry.add("main.orders.lastItem", { reuse: "shared.listItem" }).nth("last").describe("Last order");
  registry.add("main.error", { reuse: "shared.alert" }).filter({ hasText: "Order" });
}
```

Nothing is exported but the path types the modules compose anyway, and the source never changes.

## Shared slots

A slot is a path that a shared module declares in its union but does not register, so that each page fills it with its
own locator. `common.locators.ts` above declares `main.heading`, and `login.locators.ts` registers it as the login
page's heading; another page's module registers its own heading at the same path.

A slot that a page forgets to fill is found only when the path is resolved:
`No locator schema registered for path "main.heading".` The registry's verification does not report it, because it
checks registered paths, and a slot has no registration to check. A page object that registers the slot's descendants
under `strictChains` gets the missing slot reported as an unregistered ancestor.

## What a module may return

A module usually returns nothing. One that hands out a seed or a query names its type with POMWright's exported types,
so the module also compiles with `declaration: true`, as a page-object package built with declarations needs:

```ts title="list.locators.ts"
import type { LocatorQueryBuilder, LocatorRegistry, ReusableLocator } from "pomwright";

export type Paths = "list" | "list.item";

export const rowSeed = (registry: LocatorRegistry<Paths>): ReusableLocator<Paths, "role"> =>
  registry.createReusable.getByRole("listitem");

export const lastRow = (registry: LocatorRegistry<Paths>): LocatorQueryBuilder<Paths, "list.item"> =>
  registry.getLocatorSchema("list.item").nth("last");

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("list").locator("ul");
  registry.add("list.item", { reuse: rowSeed(registry) });
}
```

Keep a function that registers free of a return value: a block body, as above, or a `: void` annotation. An arrow whose
body is `registry.add(…).locator(…)` returns the registration builder by accident, a type POMWright does not export,
and `declaration: true` reports TS4023 for it.

## Reference

- [`LocatorRegistry`](/POMWright/api/class-locatorregistry/), [`ReusableLocator`](/POMWright/api/class-reusablelocator/),
  [`LocatorQueryBuilder`](/POMWright/api/class-locatorquerybuilder/)
- [TypeScript](/POMWright/docs/typescript/): the types to import, and `declaration: true`
