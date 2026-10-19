---
title: Organising a project
description: "A base class for your site's page objects, locator modules beside them, and a folder layout that scales."
---

## Introduction

As a suite grows, every page object repeats the same few things: the site's origin, its navigation defaults, and the
locators every page shares, such as the header. POMWright has no framework of its own for this; ordinary TypeScript
does it. A base class holds what the site's page objects share, and
[locator modules](/POMWright/docs/locator-modules/) hold the locators, one module per page or part of a page.

**You will learn**

- How to write a base class for your site's page objects
- How to keep locators in modules beside the page objects
- One folder layout that works

## A base class for your site

A base class extends `PageObject` and fixes what every page of the site shares. Its subclasses pass only their own
path:

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

```ts title="account.page.ts"
import type { Page } from "@playwright/test";
import { ShopPage } from "./shop.page";

type Paths = "main" | "main.heading";

export class AccountPage extends ShopPage<Paths> {
  constructor(page: Page) {
    super(page, "/account");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.heading").getByRole("heading", { level: 1 });
  }
}
```

`PageObjectOptions` is the type of the constructor's options, so the base class forwards them without restating their
shape. The origin comes from the environment here; the constructor checks it, so a malformed value fails when the
page object is constructed, naming the page object. A base class is also the place for options the whole site shares,
such as `locators: { strictChains: true }` (see [Verifying a registry](/POMWright/docs/verifying-registries/)), and
for the locators every page shares, with the methods that use them (see
[Locator modules](/POMWright/docs/locator-modules/#locators-every-page-shares-in-a-base-class)).

Some page objects of a site have a path that varies, a RegExp (see [URLs and navigation](/POMWright/docs/urls-and-navigation/)).
A base class that allows that takes the options type as its second type parameter and keeps the origin a string:

```ts
import type { Page } from "@playwright/test";
import {
  PageObject,
  type PageObjectOptions,
  type PageObjectTypeOptions,
  type StorageTypeFromOptions,
  type UrlPathTypeFromOptions,
} from "pomwright";

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
    super(page, "https://shop.example", urlPath, options);
  }
}
```

`ShopOptions` turns a subclass's options into the ones `PageObject` receives. `baseUrlType` is always `string`, since
every page of the shop is on its origin. `urlPathType` and `storage` are passed through: a subclass that declares
`{ urlPathType: RegExp }` takes a RegExp path, and one that declares `storage` gets a typed session storage helper. A
subclass with neither is written `ShopPage<Paths>`, as with the first base class.

## Locators in modules

A page object with many locators keeps them in a module beside it, a function that registers them on a registry. The
page object calls it from `defineLocators()`:

```ts title="login.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths = "main" | "main.form@login" | "main.form@login.button@login";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.form@login").getByRole("form", { name: "Log in" });
  registry.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
}
```

```ts title="login.page.ts"
import type { Page } from "@playwright/test";
import { step } from "pomwright";
import { defineLocators, type Paths } from "./login.locators";
import { ShopPage } from "./shop.page";

export class LoginPage extends ShopPage<Paths> {
  constructor(page: Page) {
    super(page, "/login");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }

  @step()
  async submit() {
    await this.getNestedLocator("main.form@login.button@login").click();
  }
}
```

Modules compose: a module for the header that every page shares is called by each page's module, and its paths join
each page's union. [Locator modules](/POMWright/docs/locator-modules/) shows how to type them so that each module only
offers its own paths, and how to share one locator between modules.

`@step` turns `submit` into a step of the test's report, titled `LoginPage.submit`; see
[Test steps](/POMWright/docs/test-steps/).

## A folder layout

One layout that keeps each page's code together:

```text
playwright.config.ts
fixtures.ts                  page objects as fixtures (Page objects in tests)
page-objects/
  shop.page.ts               the site's base class
  common.locators.ts         locators every page shares: header, footer
  login/
    login.locators.ts
    login.page.ts
  account/
    account.locators.ts
    account.page.ts
tests/
  login.spec.ts
  account.spec.ts
```

## What's next

- [Principles](/POMWright/docs/principles/): the ideas POMWright is built on
- [Paths and the registry](/POMWright/docs/locator-paths/): how paths work, in depth
