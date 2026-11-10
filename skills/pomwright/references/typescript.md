# TypeScript

The types POMWright exports and when your own code names them. Most code needs no annotation: the path union a page
object or a registry takes types everything else. Every type is imported from `pomwright`. Full rules:
[TypeScript](https://dyhex.github.io/POMWright/docs/typescript/).

## Naming what the registry hands out

A function that returns a query, a seed or a filter names it with the exported types:

```ts
import type { FilterDefinition, LocatorQueryBuilder, LocatorRegistry, ReusableLocator } from "pomwright";

type Paths = "list" | "list.items" | "list.items.badge";

export const lastItem = (registry: LocatorRegistry<Paths>): LocatorQueryBuilder<Paths, "list.items"> =>
  registry.getLocatorSchema("list.items").nth("last");

export const itemSeed = (registry: LocatorRegistry<Paths>): ReusableLocator<Paths, "role"> =>
  registry.createReusable.getByRole("listitem");

export const withBadge: FilterDefinition<Paths> = { has: "list.items.badge" };
```

What `add(path)` returns is not exported, by design: a registration ends at the next call on its registry. A function
that registers has a block body or a `: void` return type, never an arrow that returns `registry.add(…).locator(…)`.

## Paths in a generic base class

A helper in a base class that is generic in its paths takes a path as `LocatorSchemaPathArgument<Path>`; a parameter
typed with the plain union does not compile there:

```ts
import { type LocatorSchemaPathArgument, PageObject } from "pomwright";

export abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
  protected async clickOn<Path extends Paths>(path: LocatorSchemaPathArgument<Path>): Promise<void> {
    await this.getNestedLocator(path).click();
  }
}
```

A subclass calls `this.clickOn("main.button@save")`, and a misspelled path is a compile error there.

## The URL and storage types

`PageObjectTypeOptions` is a page object's second type argument (`baseUrlType`, `urlPathType`, `storage`), and
`PageObjectOptions<Options>` its constructor's options, which a base class forwards. With a RegExp URL part, `fullUrl`
is a `UrlMatcher`. A function that takes any page object's navigation helper types it `NavigationFor<RegExp, UrlMatcher>`.

## declaration: true

A project that publishes page objects as a package compiles with `declaration: true`, which needs every exported
value's type to be nameable: never return a registration, and under pnpm import from `@playwright/test` in a module
that exports a value holding Playwright's types, such as an extended `test` (re-exporting `expect` from the fixtures
file does it). See [declaration: true](https://dyhex.github.io/POMWright/docs/typescript/#declaration-true).
