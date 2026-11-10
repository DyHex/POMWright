# Choosing a shape

POMWright's registry works with `PageObject` and without it. A project picks the shape of its page code: `PageObject`
subclasses, its own page object classes, functions, or fixtures, each over the same locator modules. In a project with
tests, follow the shape it uses; in a new one, the user picks. The site's version of the registry on its own:
[The registry](https://dyhex.github.io/POMWright/docs/locator-paths/#the-registry).

## Contents

- [What each shape writes for you](#what-each-shape-writes-for-you)
- [The locator module they share](#the-locator-module-they-share)
- [PageObject](#pageobject)
- [Your own class](#your-own-class)
- [Functions](#functions)
- [A fixture](#a-fixture)

## What each shape writes for you

| | `PageObject` | your own class, functions, a fixture |
| --- | --- | --- |
| the registry | its own, filled in `defineLocators()` | `createRegistryWithAccessors<Paths>(page)` |
| the registry checked | right after construction, naming the page object | when you call `registry.verify()`, once everything is registered |
| the page's URL | `baseUrl`, `urlPath`, `fullUrl`, checked at construction | yours; `page.goto("/products")` resolves against Playwright's `baseURL` |
| navigation | `navigation.goto()`, `expectThisPage()`, `expectAnotherPage()`, as report steps | `page.goto`, `page.waitForURL` |
| session storage | a `sessionStorage` helper for its origin | `new SessionStorage(page, { origin })` |
| report steps | `@step()` methods, titled `ClassName.method` | `@step()` methods in a class; `test.step` in a function |

Everything else is the same in every shape: paths, locators, queries, reuse, the `log` fixture, and tests that get
their page code from fixtures and their data from the test-data fixture.

## The locator module they share

A locator module registers on any registry, so it does not change with the shape:

```ts title="products.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths =
  | "main"
  | "main.list@products"
  | "main.list@products.card"
  | "main.list@products.card.heading"
  | "main.list@products.card.button@addToCart"
  | "main.status";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.list@products").getByRole("list", { name: "Products" });
  registry.add("main.list@products.card").getByRole("listitem");
  registry.add("main.list@products.card.heading").getByRole("heading");
  registry.add("main.list@products.card.button@addToCart").getByRole("button", { name: "Add to cart" });
  registry.add("main.status").getByRole("status");
}
```

## PageObject

```ts title="products.page.ts"
import type { Page } from "@playwright/test";
import { PageObject, step } from "pomwright";
import { defineLocators, type Paths } from "./products.locators";

export class ProductsPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/products");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }

  @step()
  async addToCart(options: { product: string }) {
    const heading = this.getLocatorSchema("main.list@products.card.heading")
      .update()
      .getByRole({ name: options.product, exact: true })
      .getLocator();
    await this.getLocatorSchema("main.list@products.card.button@addToCart")
      .filter("main.list@products.card", { has: heading })
      .getNestedLocator()
      .click();
  }
}
```

A test opens it with `await productsPage.navigation.goto()`.

## Your own class

The registry is created and checked in the constructor; the class keeps it, and goes to its page with Playwright:

```ts title="products.class.ts"
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors, type LocatorRegistry, step } from "pomwright";
import { defineLocators, type Paths } from "./products.locators";

export class ProductsPage {
  private readonly registry: LocatorRegistry<Paths>;

  constructor(readonly page: Page) {
    const { registry } = createRegistryWithAccessors<Paths>(page);
    defineLocators(registry);
    registry.verify();
    this.registry = registry;
  }

  @step()
  async goto() {
    await this.page.goto("/products");
  }

  @step()
  async addToCart(options: { product: string }) {
    const heading = this.registry
      .getLocatorSchema("main.list@products.card.heading")
      .update()
      .getByRole({ name: options.product, exact: true })
      .getLocator();
    await this.registry
      .getLocatorSchema("main.list@products.card.button@addToCart")
      .filter("main.list@products.card", { has: heading })
      .getNestedLocator()
      .click();
  }
}
```

`page.goto("/products")` needs the config's `baseURL`; without one, the class builds its full URL from `env.ts`.

## Functions

A function takes the page, creates and checks the registry, and returns the page's actions, each a `test.step`:

```ts title="products.functions.ts"
import { type Page, test } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";
import { defineLocators, type Paths } from "./products.locators";

export function productsPage(page: Page) {
  const { registry, getLocatorSchema } = createRegistryWithAccessors<Paths>(page);
  defineLocators(registry);
  registry.verify();

  return {
    goto: () => test.step("products.goto", () => page.goto("/products")),
    addToCart: (options: { product: string }) =>
      test.step(`products.addToCart ${options.product}`, async () => {
        const heading = getLocatorSchema("main.list@products.card.heading")
          .update()
          .getByRole({ name: options.product, exact: true })
          .getLocator();
        await getLocatorSchema("main.list@products.card.button@addToCart")
          .filter("main.list@products.card", { has: heading })
          .getNestedLocator()
          .click();
      }),
  };
}
```

## A fixture

A fixture creates and checks the registry and hands tests its accessors; a test acts on paths itself:

```ts title="test-data.ts"
export const testData = {
  shop: {
    products: { lamp: "Lamp" },
  },
} as const;
```

```ts title="fixtures.ts"
import { test as base, createRegistryWithAccessors } from "pomwright";
import { defineLocators, type Paths } from "./products.locators";
import { testData } from "./test-data";

type Accessors<P extends string> = ReturnType<typeof createRegistryWithAccessors<P>>;

export const test = base.extend<{ products: Accessors<Paths>; testData: typeof testData }>({
  products: async ({ page }, use) => {
    const products = createRegistryWithAccessors<Paths>(page);
    defineLocators(products.registry);
    products.registry.verify();
    await use(products);
  },
  testData,
});
```

```ts title="products.spec.ts"
import { expect } from "@playwright/test";
import { test } from "./fixtures";

test("a customer adds the lamp to the cart", async ({ page, products, testData }) => {
  const product = testData.shop.products.lamp;
  await page.goto("/products");
  const heading = products
    .getLocatorSchema("main.list@products.card.heading")
    .update()
    .getByRole({ name: product, exact: true })
    .getLocator();
  await products
    .getLocatorSchema("main.list@products.card.button@addToCart")
    .filter("main.list@products.card", { has: heading })
    .getNestedLocator()
    .click();
  await expect(products.getNestedLocator("main.status")).toHaveText(`Added ${product}`);
});
```

The test holds what a page object's method would. When several tests repeat it, a function or a class gives it a name
and a report step.
