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
  | "main.list.item";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.form@login").getByRole("form", { name: "Log in" });
  registry.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
  registry.add("main.list").locator("ul");
  registry.add("main.list.item").getByRole("listitem");
}
```

Guides: [paths and the registry](/POMWright/docs/locator-paths/),
[registering locators](/POMWright/docs/registering-locators/), [resolving locators](/POMWright/docs/resolving-locators/).

---

## Methods

### add()

Registers a locator at a path. `add(path)` is followed by one of the ten locator methods, which take Playwright's
arguments, and then by any `filter`, `nth` and `describe` steps, applied in the order chained. The locator method
registers the path; a path has one locator. See [the registration](/POMWright/api/class-registrationbuilder/).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./shop.locators";

declare const registry: LocatorRegistry<Paths | "main.list.item@open">;
// ---cut---
registry.add("main.list.item@open").getByRole("listitem").filter({ hasText: "Open" }).nth(0);
```

With `{ reuse }`, the path is registered at once, as a copy of a registered path or from a seed of
[`createReusable`](#createreusable):

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./shop.locators";

declare const registry: LocatorRegistry<Paths | "main.list.item@last">;
// ---cut---
registry.add("main.list.item@last", { reuse: "main.list.item" }).nth("last");
```

**Arguments**

- `path` string

  A path of the registry's union. No empty segment and no whitespace, checked where it is written and again at run
  time.

- `options` Object *(optional)*
  - `reuse` string | [ReusableLocator](/POMWright/api/class-reusablelocator/)

    A registered path other than `path`, copied with its locator, its steps and an explicit description; or a seed.
    After a path, `filter`, `nth` and `describe` narrow the copy. After a seed, one call of the seed's own locator
    method may patch it first, as [`update()`](/POMWright/api/class-locatorquerybuilder/#update) patches.

**Returns**

- [the registration](/POMWright/api/class-registrationbuilder/): the ten locator methods, or after `{ reuse }`
  `filter`, `nth` and `describe` (and, after a seed, the seed's own locator method)

**Throws**

The locator method throws when the path is registered already, when the first argument is missing or is an empty
string where Playwright cannot use one, and, from JavaScript, when the path breaks the path rules:

```text
A locator schema with the path "main" already exists.
locator requires a non-empty selector for "main.list".
LocatorSchemaPath string cannot contain consecutive dots: main..list
```

The duplicate message goes on with the existing and the attempted locator. `add` with `{ reuse }` throws when the
reused path is not registered, or when the value is neither a path nor a seed (from JavaScript):

```text
No locator schema registered for path "main.list.item".
reuse requires a registered path or a seed from createReusable for "main.list.item@last".
```

### getLocator()

Resolves the locator registered for a path alone: its locator and its own steps, without its ancestors, described by
the path. Use it for chains you build yourself and for filters; act on elements with
[`getNestedLocator()`](#getnestedlocator), whose chain keeps finding the right element when the page gains a similar
one. See [resolving locators](/POMWright/docs/resolving-locators/#a-locator-without-its-ancestors-getlocator).

**Usage**

```ts
import { expect, type Page } from "@playwright/test";
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./shop.locators";

declare const page: Page;
declare const registry: LocatorRegistry<Paths>;
// ---cut---
const item = registry.getLocator("main.list.item"); // getByRole('listitem')
await expect(page.locator("section").filter({ has: item })).toHaveCount(1);
```

**Arguments**

- `path` string

  A registered path.

**Returns**

- [Locator](https://playwright.dev/docs/api/class-locator)

**Throws**

```text
No locator schema registered for path "main.list.item".
```

### getLocatorSchema()

Starts a query of a path: a private copy of its chain, every registered segment with its locator, steps and
description, to change for one use and then resolve. The registry never changes, and every call starts a new copy.
See [`LocatorQueryBuilder`](/POMWright/api/class-locatorquerybuilder/).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./shop.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
const lastItem = registry.getLocatorSchema("main.list.item").nth("last").getNestedLocator();
// locator('main').locator('ul').getByRole('listitem').last()
```

**Arguments**

- `path` string

  A registered path.

**Returns**

- [LocatorQueryBuilder](/POMWright/api/class-locatorquerybuilder/)

**Throws**

```text
No locator schema registered for path "main.list.item".
```

### getNestedLocator()

Resolves a path to the chain of its registered segments, first to last, each with its steps, described by the path:
the locator to act on and assert against. A segment that is not registered is left out of the chain, and a
`frameLocator(selector)` segment enters its frame for the segments after it.

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
No locator schema registered for path "main.list.item".
```

A segment that cannot be resolved throws as `verify()` reports it, for example a `has` path that is not registered.

### verify()

Checks every registered path once, without touching the page, and reports every failure in one error: a `has` or
`hasNot` path that is not registered, a cycle of such references, an unsupported reference value, and a
`frameLocator()` without a selector that is not the first segment of its chain. With
[`strictChains`](#strictchains), every ancestor of every path must be registered too. A page object calls it right
after `defineLocators()`; a standalone registry calls it once its locators are registered. See
[verifying a registry](/POMWright/docs/verifying-registries/).

**Usage**

```ts
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

declare const page: Page;
// ---cut---
const { registry } = createRegistryWithAccessors<"list" | "list.item" | "list.item.title">(page);
registry.add("list").locator("ul");
registry.add("list.item").getByRole("listitem").filter({ has: "list.item.title" });
registry.verify();
```

**Returns**

- void

**Throws**

Every failing path, with its reason:

```text
Locator registry verification failed for 1 of 2 paths:
  "list.item": No locator schema registered for path "list.item.title".
```

---

## Properties

### createReusable

Makes seeds: a locator with its arguments, then `filter`, `nth` and `describe` steps, registered under no path.
`add(path, { reuse: seed })` registers a seed. A seed is a value, as a Playwright `Locator` is: its methods return a
new seed. To share a locator between [locator modules](/POMWright/docs/locator-modules/), reusing a registered path
is usually simpler. See [`ReusableLocator`](/POMWright/api/class-reusablelocator/).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.heading@orders">;
// ---cut---
const heading = registry.createReusable.getByRole("heading", { level: 2 });
registry.add("main.heading@orders", { reuse: heading.filter({ hasText: "Orders" }) });
```

**Type**

- the ten locator methods, each returning a [ReusableLocator](/POMWright/api/class-reusablelocator/)

---

## createRegistryWithAccessors

`createRegistryWithAccessors<Paths>(page, options?)` creates a registry on a page, without a page object, and returns
it with its `add`, `getLocator`, `getNestedLocator` and `getLocatorSchema` as functions of their own. Pass the path
union as the type argument, and call `registry.verify()` once the locators are registered.

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

`true` makes [`verify()`](#verify) require every ancestor of every registered path to be registered too, naming each
one that is not. Defaults to `false`, where an unregistered segment is a name that groups paths and is left out of the
chain.

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
