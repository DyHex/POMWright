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
| `PageObject<Paths, Options>` | the base class (a value and a type) |
| `PageObjectOptions<Options>` | the constructor's options: `label`, `navOptions`, `sessionStorage`, `locators` |
| `PageObjectTypeOptions` | the second type argument: `baseUrlType`, `urlPathType`, `storage` |
| `BaseUrlTypeFromOptions`, `UrlPathTypeFromOptions`, `FullUrlTypeFromOptions`, `StorageTypeFromOptions` | the types those options produce |
| `LocatorRegistry<Paths>` | a registry: `add`, `createReusable`, `getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify` |
| `LocatorRegistryOptions` | the registry's options: `strictChains` |
| `AddAccessor`, `GetLocatorAccessor`, `GetNestedLocatorAccessor`, `GetLocatorSchemaAccessor` | the registry's methods as standalone functions, as `createRegistryWithAccessors` returns them |
| `LocatorQueryBuilder<Paths, Path>` | a query, what `getLocatorSchema(path)` and its methods return |
| `LocatorUpdateBuilder<Paths, Path, SubPath, Mode>` | what a query's `update()` and `replace()` return |
| `ReusableLocator<Paths, Strategy>` | a seed from `createReusable` |
| `FilterDefinition<Paths>` | the argument of `filter`, with paths as `has` and `hasNot` |
| `IndexSelector` | the argument of `nth`: a number, `"first"` or `"last"` |
| `LocatorSchemaPathFormat<Path>` | the path rules as a type |
| `LocatorSchemaPathArgument<Path>` | the path parameter of `add` and the resolving methods |
| `NavigationFor`, `NavigationOptions`, `ThisPageOptions`, `UrlMatcher` | the navigation helper, its options, a varying page's URL |
| `SessionStorage`, `SessionStorageSchema`, `Codec<T>` | the storage helper, its schema, a codec |
| `PlaywrightReportLogger`, `LogEntry`, `LogLevel` | the logger and its entries |

What `add(path)` returns is not exported: it registers as you chain and is not meant to be held. See the
[API reference](/POMWright/api/) for each.

## Naming what the registry hands out

A function that returns a query or a seed names it:

```ts
import type { FilterDefinition, LocatorQueryBuilder, LocatorRegistry } from "pomwright";

type Paths = "list" | "list.item" | "list.item.badge";

export const lastItem = (registry: LocatorRegistry<Paths>): LocatorQueryBuilder<Paths, "list.item"> =>
  registry.getLocatorSchema("list.item").nth("last");

export const withBadge: FilterDefinition<Paths> = { has: "list.item.badge" };
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

A subclass calls `this.clickOn("main.button@save")`, and a misspelt path is a compile error at that call.

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
type to be nameable. With the types above it is. One pattern fails: an arrow function whose body is a registration,
`(registry) => registry.add("list").locator("ul")`, returns what `add(path)` returns, which is not exported, and
TypeScript reports TS4023. A function that registers returns nothing: give it a block body or a `: void` return type.
See [Locator modules](/POMWright/docs/locator-modules/#what-a-module-may-return).

## Reference

- [Types](/POMWright/api/types/) and the [API reference](/POMWright/api/)
- Playwright: [TypeScript](https://playwright.dev/docs/test-typescript)
