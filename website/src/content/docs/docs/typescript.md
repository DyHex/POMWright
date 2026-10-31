---
title: TypeScript
description: "The types POMWright exports and when you need them: naming what the registry hands out, forwarding paths in generic base classes, and declaration: true."
---

## Introduction

Most code that uses POMWright needs no type annotations: the path union you give a page object or a registry types
everything else. The exported types matter when your own code names what POMWright hands out: a helper that takes a
query, a module that returns a seed, a base class generic in its paths, or a package of page objects built with
`declaration: true`. Every type is imported from `pomwright`.

## The types

| type | what it is |
| --- | --- |
| [`PageObject<Paths, Options>`](/POMWright/api/class-pageobject/) | the base class (a value and a type) |
| [`PageObjectOptions<Options>`](/POMWright/api/types/#pageobjectoptions) | the constructor's options: `label`, `navOptions`, `sessionStorage`, `locators` |
| [`PageObjectTypeOptions`](/POMWright/api/types/#pageobjecttypeoptions) | the second type argument: `baseUrlType`, `urlPathType`, `storage` |
| [`BaseUrlTypeFromOptions`](/POMWright/api/types/#baseurltypefromoptions), [`UrlPathTypeFromOptions`](/POMWright/api/types/#urlpathtypefromoptions), [`FullUrlTypeFromOptions`](/POMWright/api/types/#fullurltypefromoptions), [`StorageTypeFromOptions`](/POMWright/api/types/#storagetypefromoptions) | the types those options produce |
| [`LocatorRegistry<Paths>`](/POMWright/api/class-locatorregistry/) | a registry: `add`, `createReusable`, `getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify` |
| [`LocatorRegistryOptions`](/POMWright/api/class-locatorregistry/#locatorregistryoptions) | the registry's options: `strictChains` |
| [`AddAccessor`](/POMWright/api/class-locatorregistry/#addaccessor), [`GetLocatorAccessor`](/POMWright/api/class-locatorregistry/#getlocatoraccessor), [`GetNestedLocatorAccessor`](/POMWright/api/class-locatorregistry/#getnestedlocatoraccessor), [`GetLocatorSchemaAccessor`](/POMWright/api/class-locatorregistry/#getlocatorschemaaccessor) | the registry's methods as standalone functions, as `createRegistryWithAccessors` returns them |
| [`LocatorQueryBuilder<Paths, Path>`](/POMWright/api/class-locatorquerybuilder/) | a query, what `getLocatorSchema(path)` and its methods return |
| [`LocatorUpdateBuilder<Paths, Path, SubPath, Mode>`](/POMWright/api/class-locatorupdatebuilder/) | what a query's `update()` and `replace()` return |
| [`ReusableLocatorFactory<Paths>`](/POMWright/api/class-reusablelocator/#reusablelocatorfactory) | `createReusable`: the ten locator methods that make a seed |
| [`ReusableLocator<Paths, Strategy>`](/POMWright/api/class-reusablelocator/) | a seed from `createReusable` |
| [`FilterDefinition<Paths>`](/POMWright/api/types/#filterdefinition) | the argument of `filter`, with paths as `has` and `hasNot` |
| [`IndexSelector`](/POMWright/api/types/#indexselector) | the argument of `nth`: a number, `"first"` or `"last"` |
| [`LocatorSchemaPathFormat<Path>`](/POMWright/api/types/#locatorschemapathformat) | the path rules as a type |
| [`LocatorSchemaPathArgument<Path>`](/POMWright/api/types/#locatorschemapathargument) | the path parameter of `add` and the resolving methods |
| [`NavigationFor`](/POMWright/api/class-navigation/#navigationfor), [`NavigationOptions`](/POMWright/api/class-navigation/#navigationoptions), [`ThisPageOptions`](/POMWright/api/class-navigation/#thispageoptions), [`UrlMatcher`](/POMWright/api/class-navigation/#urlmatcher) | the navigation helper, its options, a varying page's URL |
| [`SessionStorage`](/POMWright/api/class-sessionstorage/), [`SessionStorageSchema`](/POMWright/api/class-sessionstorage/#sessionstorageschema), [`Codec<T>`](/POMWright/api/class-sessionstorage/#codec) | the storage helper, its schema, a codec |
| [`SessionStorageOptions<S>`](/POMWright/api/class-sessionstorage/#sessionstorageoptions), [`SeedOptions`](/POMWright/api/class-sessionstorage/#seedoptions) | the helper's options (`label`, `origin`, `schema`) and `seed`'s (`origin`) |
| [`Decoded<S, K>`](/POMWright/api/class-sessionstorage/#decoded), [`AllEntries<S>`](/POMWright/api/class-sessionstorage/#allentries) | a key's value under a schema, and what `get()` returns without an argument |
| [`PlaywrightReportLogger`](/POMWright/api/class-playwrightreportlogger/), [`LogEntry`](/POMWright/api/class-playwrightreportlogger/#logentry), [`LogLevel`](/POMWright/api/class-playwrightreportlogger/#loglevel-1) | the logger and its entries |
| [`StepDecorator`](/POMWright/api/step/#stepdecorator) | the decorator `step()` returns |

What `add(path)` returns is not exported: it registers as you chain and is not meant to be held. See the
[API reference](/POMWright/api/) for each.

## Naming what the registry hands out

A function that returns a query or a seed names it:

```ts
import type { FilterDefinition, LocatorQueryBuilder, LocatorRegistry } from "pomwright";

type Paths = "list" | "list.items" | "list.items.badge";

export const lastItem = (registry: LocatorRegistry<Paths>): LocatorQueryBuilder<Paths, "list.items"> =>
  registry.getLocatorSchema("list.items").nth("last");

export const withBadge: FilterDefinition<Paths> = { has: "list.items.badge" };
```

## Paths in a generic base class

A helper in a base class that is generic in its paths takes a path with `LocatorSchemaPathArgument`. A parameter typed
with the plain union does not compile there, because the resolving methods check each path where it is passed, and a
path that is still a type parameter cannot be checked:

```ts
import { type LocatorSchemaPathArgument, PageObject } from "pomwright";

export abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
  protected async clickOn<Path extends Paths>(path: LocatorSchemaPathArgument<Path>): Promise<void> {
    await this.getNestedLocator(path).click();
  }
}
```

A subclass calls `this.clickOn("main.button@save")`, and a misspelled path is a compile error at that call.

## The URL types

`PageObjectTypeOptions` decides what `baseUrl`, `urlPath` and `fullUrl` are. With a RegExp in either part, `fullUrl` is
a [`UrlMatcher`](/POMWright/docs/urls-and-navigation/#pages-whose-url-varies), not a `RegExp`; a type of your own that
looks at it tests against `UrlMatcher`:

```ts
import type { FullUrlTypeFromOptions, UrlMatcher } from "pomwright";

type AccountUrl = FullUrlTypeFromOptions<{ urlPathType: RegExp }>;
const isMatcher: AccountUrl extends UrlMatcher ? true : false = true;
```

## `declaration: true`

A project that publishes page objects as a package compiles with `declaration: true`, which needs every exported value's
type to be nameable. With the types above it is, with two exceptions:

- **A registration.** What `add(path)` returns is not exported, by design: a registration ends at the next call on its
  registry. Don't return one: give a function that registers a block body or `: void` (see
  [Locator modules](/POMWright/docs/locator-modules/#what-a-module-may-return)), and share a locator by reuse by path or
  by a seed instead (see [Reusing locators](/POMWright/docs/reusing-locators/)). Otherwise TypeScript reports TS4023.
- **Playwright's types under pnpm.** A value that holds Playwright's types, such as an extended `test` or a seed's
  `definition`, is named through `@playwright/test`. Under pnpm, TypeScript can do so only when the compilation imports
  `@playwright/test`; when no file does, it reports TS2883: `The inferred type of 'test' cannot be named without a
  reference to 'TestType' from '.pnpm/playwright@…/node_modules/playwright/test'. This is likely not portable. A type
  annotation is necessary.` Import
  from `@playwright/test` in the module that exports the value, as the fixture examples do with `expect`, or annotate
  the value with POMWright's types, such as `ReusableLocator<Paths>["definition"]`.

A module that takes the `Page` imports it from `@playwright/test` anyway, which is all it needs; the second function
shows the annotation:

```ts title="list.locators.ts"
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors, type ReusableLocator } from "pomwright";

type Paths = "list" | "list.items";

export function listItems(page: Page) {
  const { registry, getNestedLocator } = createRegistryWithAccessors<Paths>(page);
  registry.add("list").locator("ul");
  registry.add("list.items").getByRole("listitem");
  registry.verify();
  return getNestedLocator("list.items");
}

export const definitionOf = (seed: ReusableLocator<Paths>): ReusableLocator<Paths>["definition"] => seed.definition;
```

Under npm the declarations name `playwright/test` and `playwright-core` instead, as they do for code that uses
Playwright alone. Why TypeScript needs the import is explained on
[Packaging](/POMWright/internal/packaging/#declarations).

## Reference

- [Types](/POMWright/api/types/) and the [API reference](/POMWright/api/)
- Playwright: [TypeScript](https://playwright.dev/docs/test-typescript)
