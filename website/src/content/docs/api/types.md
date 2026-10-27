---
title: Types
description: "PageObjectTypeOptions and the types it produces, PageObjectOptions, FilterDefinition, IndexSelector, and the path types."
---

The types a project names when its own code holds what POMWright hands out or forwards its options. Every type is
imported from `pomwright` with `import type`. Guide: [TypeScript](/POMWright/docs/typescript/).

---

## PageObjectTypeOptions

The second type argument of [`PageObject`](/POMWright/api/class-pageobject/), types only: whether `baseUrl` and
`urlPath` are RegExps, and the session storage schema. See
[pages whose URL varies](/POMWright/docs/urls-and-navigation/#pages-whose-url-varies) and
[the URL types](/POMWright/docs/typescript/#the-url-types).

```ts
import type { Page } from "@playwright/test";
import { json, PageObject } from "pomwright";

const orderStorage = { cart: json<{ items: string[] }>() };

export class OrderPage extends PageObject<"main", { urlPathType: RegExp; storage: typeof orderStorage }> {
  constructor(page: Page) {
    super(page, "https://shop.example", /^\/orders\/\d+$/, { sessionStorage: { schema: orderStorage } });
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
  }
}
```

### baseUrlType

`string | RegExp` *(optional)*

`RegExp` when `baseUrl` is a RegExp, tested against the URL's origin. Defaults to `string`.

### storage

[SessionStorageSchema](/POMWright/api/class-sessionstorage/#sessionstorageschema) *(optional)*

The type of the session storage schema, `typeof schema`, so `sessionStorage.set`, `get` and `seed` are typed per key.
The schema itself goes in the constructor's `sessionStorage` option. Pass both: without the value, the declared keys
are stored and read without their codecs (see
[through a page object](/POMWright/docs/session-storage/#through-a-page-object)).

### urlPathType

`string | RegExp` *(optional)*

`RegExp` when `urlPath` is a RegExp, tested against the rest of the URL: path, query and hash. Defaults to `string`.

## BaseUrlTypeFromOptions

`BaseUrlTypeFromOptions<Options>`: the type of `baseUrl`, `RegExp` when `baseUrlType` is `RegExp`, otherwise `string`.

## UrlPathTypeFromOptions

`UrlPathTypeFromOptions<Options>`: the type of `urlPath`, `RegExp` when `urlPathType` is `RegExp`, otherwise `string`.

## FullUrlTypeFromOptions

`FullUrlTypeFromOptions<Options>`: the type of `fullUrl`, [`UrlMatcher`](/POMWright/api/class-navigation/#urlmatcher)
when either part is a RegExp, otherwise `string`. A type of your own that looks at `fullUrl` tests it against
`UrlMatcher`, not `RegExp`:

```ts
import type { FullUrlTypeFromOptions, UrlMatcher } from "pomwright";

type AccountUrl = FullUrlTypeFromOptions<{ urlPathType: RegExp }>;
const isMatcher: AccountUrl extends UrlMatcher ? true : false = true;
```

## StorageTypeFromOptions

`StorageTypeFromOptions<Options>`: the session storage schema type, `storage`, or a schema without declared keys.

---

## PageObjectOptions

`PageObjectOptions<Options>`: the options of the `PageObject` constructor, for a base class of your own that forwards
them. `Options` is the page object's `PageObjectTypeOptions`, which types the session storage schema.

```ts
import type { Page } from "@playwright/test";
import { PageObject, type PageObjectOptions } from "pomwright";

export abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
  protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
    super(page, "https://shop.example", urlPath, { ...options, locators: { strictChains: true } });
  }
}
```

### label

`string` *(optional)*

The name in the page object's step titles and error messages. Defaults to the class name.

### locators

[LocatorRegistryOptions](/POMWright/api/class-locatorregistry/#locatorregistryoptions) *(optional)*

The registry's options: `strictChains: true` makes the check after `defineLocators()` require every ancestor of every
registered path to be registered as well. Set it once in a base class of your own.

### navOptions

[NavigationOptions](/POMWright/api/class-navigation/#navigationoptions) *(optional)*

Defaults for every navigation method (`waitUntil`, `timeout`); a call's own options win.

### sessionStorage

`{ schema?: SessionStorageSchema }` *(optional)*

The codecs of the session storage keys that hold structured values, typed by `Options["storage"]`.

---

## FilterDefinition

`FilterDefinition<Paths>`: the argument of `filter`, Playwright's
[`locator.filter()`](https://playwright.dev/docs/api/class-locator#locator-filter) options, where `has` and `hasNot`
also take a registered path. See [filters](/POMWright/docs/filters-and-indices/#filters-filter).

```ts
import type { FilterDefinition } from "pomwright";

type Paths = "list" | "list.items" | "list.items.badge";

export const withBadge: FilterDefinition<Paths> = { has: "list.items.badge" };
```

### has

`Locator | Paths` *(optional)*

Keeps the elements that contain this one. A registered path resolves to that path's own locator, without its
ancestors; see [filters](/POMWright/docs/filters-and-indices/#filters-filter). A path that is not registered, and a
cycle of such paths, fail [`verify()`](/POMWright/api/class-locatorregistry/#verify).

### hasNot

`Locator | Paths` *(optional)*

Keeps the elements that do not contain this one; a registered path as for `has`.

### hasNotText

`string | RegExp` *(optional)*

Keeps the elements that do not contain this text, as Playwright's option.

### hasText

`string | RegExp` *(optional)*

Keeps the elements that contain this text, as Playwright's option.

### visible

`boolean` *(optional)*

Keeps only visible, or only hidden, elements, as Playwright's option.

## IndexSelector

`number | "first" | "last"`: the argument of `nth`. `"first"` and `"last"` become Playwright's `first()` and `last()`,
and a number goes to `nth()` as given, `-1` being the last element.

---

## LocatorSchemaPathFormat

`LocatorSchemaPathFormat<Path>`: the path rules as a type. It is `Path` itself when the path is well formed (not
empty, no leading, trailing or consecutive `.`, no whitespace), and otherwise a tuple naming the rule it breaks, which
TypeScript shows in the error:

```text
Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<"main..list", "String can't contain consecutive '.'">'.
```

A wide `string` is not checked by the type; the same rules are checked at run time for every path. A registry typed
`<string>` gives up every compile-time check of its paths, and is best kept to paths known only at run time (see
[the registry](/POMWright/docs/locator-paths/#the-registry)). See
[the rules of a path](/POMWright/docs/locator-paths/#the-rules-of-a-path).

## LocatorSchemaPathArgument

`LocatorSchemaPathArgument<Path>`: the type of the path parameter of `add` and the resolving methods, the path itself
when it is well formed. A helper in a base class that is generic in its paths takes its path with it; see
[paths in a generic base class](/POMWright/docs/typescript/#paths-in-a-generic-base-class).

```ts
import { type LocatorSchemaPathArgument, PageObject } from "pomwright";

export abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
  protected async clickOn<Path extends Paths>(path: LocatorSchemaPathArgument<Path>): Promise<void> {
    await this.getNestedLocator(path).click();
  }
}
```
