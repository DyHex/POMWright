---
title: LocatorRegistry
description: "A locator registry: add, getNestedLocator, getLocator, getLocatorSchema, verify and createReusable; createRegistryWithAccessors, its options and the accessor types."
---

A `LocatorRegistry` holds one locator per dot-delimited path and builds the chain of a path's registered segments
from them. `add` registers, `getNestedLocator` and `getLocator` resolve, `getLocatorSchema` starts a query, `verify`
checks every path, and `createReusable` makes seeds. Every [page object](/POMWright/api/class-pageobject/) has one
and offers its methods as `this.add`, `this.getNestedLocator`, …; [`createRegistryWithAccessors`](#createregistrywithaccessors)
makes one on its own.

The examples on this page use this registry:

```ts title="shop.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths =
  | "main"
  | "main.form@login"
  | "main.form@login.button@login"
  | "main.list"
  | "main.list.items";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.form@login").getByRole("form", { name: "Log in" });
  registry.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
  registry.add("main.list").locator("ul");
  registry.add("main.list.items").getByRole("listitem");
}
```

Guides: [paths and the registry](/POMWright/docs/locator-paths/),
[registering locators](/POMWright/docs/registering-locators/), [resolving locators](/POMWright/docs/resolving-locators/).

---

## Methods

### add()

Registers a locator at a path: `add(path)`, one of the ten locator methods, then any `filter`, `nth` and `describe`
steps. See [the registration](/POMWright/api/class-registrationbuilder/) and
[registering locators](/POMWright/docs/registering-locators/).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./shop.locators";

declare const registry: LocatorRegistry<Paths | "main.list.item@open">;
// ---cut---
registry.add("main.list.item@open").getByRole("listitem").filter({ hasText: "Open" }).nth(0);
```

With `{ reuse }`, a copy of a registered path or a seed is registered at once; see
[reusing locators](/POMWright/docs/reusing-locators/):

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./shop.locators";

declare const registry: LocatorRegistry<Paths | "main.list.item@last">;
// ---cut---
registry.add("main.list.item@last", { reuse: "main.list.items" }).nth("last");
```

**Arguments**

- `path` string

  A path of the registry's union, following [the rules of a path](/POMWright/docs/locator-paths/#the-rules-of-a-path).

- `options` Object *(optional)*
  - `reuse` string | [ReusableLocator](/POMWright/api/class-reusablelocator/)

    A registered path other than `path`, or a seed from [`createReusable`](#createreusable). See
    [reuse by path](/POMWright/docs/reusing-locators/#reuse-by-path) and
    [changing a seed's options](/POMWright/docs/reusing-locators/#changing-a-seeds-options).

**Returns**

- [the registration](/POMWright/api/class-registrationbuilder/): the ten locator methods, or after `{ reuse }`
  `filter`, `nth` and `describe` (and, after a seed, the seed's own locator method)

**Throws**

`add` throws when the path breaks the path rules (from JavaScript or a path built at run time; a literal is a compile
error), naming every rule it breaks. The locator method throws when the path is registered already (with `{ reuse }`,
`add` itself throws, since it registers at once), and when the first argument is missing or is an empty string where
Playwright cannot use one:

```text
A locator schema with the path "main" already exists.
locator requires a non-empty selector for "main.list".
LocatorSchemaPath string cannot contain consecutive dots: main..list
```

The duplicate message goes on with the existing and the attempted locator. `add` with `{ reuse }` throws when the
reused path is not registered, when it is the registration path itself (through a variable; one literal reusing itself
is a compile error), or when the value is neither a path nor a seed (from JavaScript):

```text
No locator schema registered for path "main.list.items".
Locator reuse path cannot be the same as registration path: "main.heading".
reuse requires a registered path or a seed from createReusable for "main.list.item@last".
```

### getLocator()

Resolves the locator registered for a path alone, with its own steps and without its ancestors, described by the path:
for chains you build yourself, filters and every match on the page at once. See
[a locator without its ancestors](/POMWright/docs/resolving-locators/#a-locator-without-its-ancestors-getlocator).

**Usage**

```ts
import { expect, type Page } from "@playwright/test";
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./shop.locators";

declare const page: Page;
declare const registry: LocatorRegistry<Paths>;
// ---cut---
const items = registry.getLocator("main.list.items"); // getByRole('listitem')
await expect(page.locator("section").filter({ has: items })).toHaveCount(1);
```

**Arguments**

- `path` string

  A registered path.

**Returns**

- [Locator](https://playwright.dev/docs/api/class-locator)

**Throws**

```text
No locator schema registered for path "main.list.items".
```

### getLocatorSchema()

Starts a query of a path: a private copy of its chain to change for one use and then resolve. See
[`LocatorQueryBuilder`](/POMWright/api/class-locatorquerybuilder/) and [queries](/POMWright/docs/queries/).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./shop.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
const lastItem = registry.getLocatorSchema("main.list.items").nth("last").getNestedLocator();
// locator('main').locator('ul').getByRole('listitem').last()
```

**Arguments**

- `path` string

  A registered path.

**Returns**

- [LocatorQueryBuilder](/POMWright/api/class-locatorquerybuilder/)

**Throws**

```text
No locator schema registered for path "main.list.items".
```

### getNestedLocator()

Resolves a path to the chain of its registered segments, each with its steps, described by the path: the locator to
act on and assert against. See
[chaining every segment](/POMWright/docs/resolving-locators/#chaining-every-segment-getnestedlocator).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./shop.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
await registry.getNestedLocator("main.form@login.button@login").click();
// locator('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })
```

**Arguments**

- `path` string

  A registered path.

**Returns**

- [Locator](https://playwright.dev/docs/api/class-locator)

**Throws**

```text
No locator schema registered for path "main.list.items".
```

A segment that cannot be resolved throws as `verify()` reports it, for example a `has` path that is not registered.

### verify()

Checks every registered path once, without touching the page, and reports every failure in one error. A page object
calls it after `defineLocators()`; a standalone registry calls it once its locators are registered. See
[what it finds](/POMWright/docs/verifying-registries/#what-it-finds).

**Usage**

```ts
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

declare const page: Page;
// ---cut---
const { registry } = createRegistryWithAccessors<"list" | "list.items" | "list.items.title">(page);
registry.add("list").locator("ul");
registry.add("list.items").getByRole("listitem").filter({ has: "list.items.title" });
registry.verify();
```

**Returns**

- void

**Throws**

Every failing path, with its reason:

```text
Locator registry verification failed for 1 of 2 paths:
  "list.items": No locator schema registered for path "list.items.title".
```

---

## Properties

### createReusable

Makes seeds: locators registered under no path until `add(path, { reuse: seed })` registers one. See
[`ReusableLocator`](/POMWright/api/class-reusablelocator/) and
[seeds](/POMWright/docs/reusing-locators/#seeds-createreusable).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.heading@orders">;
// ---cut---
const heading = registry.createReusable.getByRole("heading", { level: 2 });
registry.add("main.heading@orders", { reuse: heading.filter({ hasText: "Orders" }) });
```

**Type**

- [ReusableLocatorFactory](/POMWright/api/class-reusablelocator/#reusablelocatorfactory)\<Paths\>: the ten locator
  methods, each returning a [ReusableLocator](/POMWright/api/class-reusablelocator/)

---

## createRegistryWithAccessors

`createRegistryWithAccessors<Paths>(page, options?)` creates a registry on a page, without a page object, and returns
it with its `add`, `getLocator`, `getNestedLocator` and `getLocatorSchema` as functions of their own. Call
`registry.verify()` once the locators are registered. See [the registry](/POMWright/docs/locator-paths/#the-registry).

The path union is a required type argument. Without it, the registry takes no path, and the first path is a compile
error:

```text
Argument of type '"main"' is not assignable to parameter of type '"createRegistryWithAccessors needs its paths as a type argument: createRegistryWithAccessors<Paths>(page)"'.
```

`<string>` is accepted, and gives up every compile-time check of the paths, which the runtime still makes.

**Usage**

```ts
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

declare const page: Page;
// ---cut---
const { registry, getNestedLocator } = createRegistryWithAccessors<"main" | "main.button@save">(page);
registry.add("main").locator("main");
registry.add("main.button@save").getByRole("button", { name: "Save" });
registry.verify();

await getNestedLocator("main.button@save").click();
```

**Arguments**

- `page` [Page](https://playwright.dev/docs/api/class-page)

  The page the locators resolve on.

- `options` [LocatorRegistryOptions](#locatorregistryoptions) *(optional)*

**Returns**

- Object
  - `registry` [LocatorRegistry](/POMWright/api/class-locatorregistry/)\<Paths\>
  - `add` [AddAccessor](#addaccessor)\<Paths\>
  - `getLocator` [GetLocatorAccessor](#getlocatoraccessor)\<Paths\>
  - `getNestedLocator` [GetNestedLocatorAccessor](#getnestedlocatoraccessor)\<Paths\>
  - `getLocatorSchema` [GetLocatorSchemaAccessor](#getlocatorschemaaccessor)\<Paths\>

---

## LocatorRegistryOptions

The options of a registry: the second argument of `createRegistryWithAccessors`, and the `locators` option of a
[page object](/POMWright/api/class-pageobject/#new-pageobject).

### strictChains

`boolean` *(optional)*

`true` makes [`verify()`](#verify) require every ancestor of every registered path to be registered too. Defaults to
`false`. See [strictChains](/POMWright/docs/verifying-registries/#strictchains-every-ancestor-registered).

```text
"main.form.button.save": strictChains requires every ancestor to be registered; "main.form" and "main.form.button" are not.
```

---

## AddAccessor

`AddAccessor<Paths>`: the type of [`add()`](#add) as a function of its own, as `createRegistryWithAccessors` returns
it and a page object has it (`this.add`).

## GetLocatorAccessor

`GetLocatorAccessor<Paths>`: the type of [`getLocator()`](#getlocator) as a function of its own (`this.getLocator`).

## GetLocatorSchemaAccessor

`GetLocatorSchemaAccessor<Paths>`: the type of [`getLocatorSchema()`](#getlocatorschema) as a function of its own
(`this.getLocatorSchema`).

## GetNestedLocatorAccessor

`GetNestedLocatorAccessor<Paths>`: the type of [`getNestedLocator()`](#getnestedlocator) as a function of its own
(`this.getNestedLocator`).
