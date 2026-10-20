---
title: ReusableLocator
description: "A seed from createReusable: a locator with its steps and description, registered under no path; a value whose filter, nth and describe return new seeds."
---

A seed is a locator with its arguments, steps and description, registered under no path.
[`registry.createReusable`](/POMWright/api/class-locatorregistry/#createreusable) makes one, and
`add(path, { reuse: seed })` registers it at a path. A seed is a value, as a Playwright `Locator` is: `filter`, `nth`
and `describe` return a new seed.

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"table" | "table.row@first" | "table.rows@open" | "table.row@lastOpen">;
// ---cut---
registry.add("table").locator("table");

const row = registry.createReusable.locator("tr");
const openRow = row.filter({ hasText: "Open" });

registry.add("table.row@first", { reuse: row.nth(0) });
// locator('table').locator('tr').first()
registry.add("table.rows@open", { reuse: openRow });
// locator('table').locator('tr').filter({ hasText: 'Open' })
registry.add("table.row@lastOpen", { reuse: openRow.nth("last").describe("Last open row") });
// locator('table').locator('tr').filter({ hasText: 'Open' }).last()
```

A function that returns a seed names its type, `ReusableLocator<Paths, Strategy>`, where `Strategy` is one of
`"role"`, `"text"`, `"label"`, `"placeholder"`, `"altText"`, `"title"`, `"locator"`, `"frameLocator"`, `"testId"` and
`"id"`; without it the type accepts a seed of any. Guide: [reusing locators](/POMWright/docs/reusing-locators/).

---

## createReusable

`registry.createReusable` has the ten [locator methods](/POMWright/api/class-registrationbuilder/#locator-methods) of
the registration, with the same arguments, each returning a seed. `frameLocator(selector)` requires its selector, since
the any-frame form takes no steps.

Each throws at the call when its first argument is missing (from JavaScript), or is an empty string where Playwright
cannot use one:

```text
createReusable.getByRole requires a role value.
createReusable.locator requires a non-empty selector.
createReusable.getById requires a non-empty id.
```

A path registered from a seed may patch the seed's own locator once; see
[after `{ reuse }`](/POMWright/api/class-registrationbuilder/#a-seed).

---

## Methods

### describe()

Returns a new seed with a description; this seed is unchanged. A path registered from it is described by it instead of
the path; see [descriptions](/POMWright/docs/descriptions/).

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"table" | "table.row@total">;
// ---cut---
const totalRow = registry.createReusable.locator("tr").filter({ hasText: "Total" }).describe("Total row");
registry.add("table.row@total", { reuse: totalRow });
```

**Arguments**

- `description` string

  `""` removes the description.

**Returns**

- ReusableLocator

**Throws**

```text
createReusable.describe requires a string; pass "" to remove the description.
```

### filter()

Returns a new seed with a [`locator.filter()`](https://playwright.dev/docs/api/class-locator#locator-filter) step
added; this seed is unchanged.

**Usage**

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.heading@orders">;
// ---cut---
const heading = registry.createReusable.getByRole("heading", { level: 2 });
registry.add("main.heading@orders", { reuse: heading.filter({ hasText: "Orders" }) });
// getByRole('heading', { level: 2 }).filter({ hasText: 'Orders' })
```

**Arguments**

- `filter` [FilterDefinition](/POMWright/api/types/#filterdefinition)

  Playwright's filter options; `has` and `hasNot` also take a registered path.

**Returns**

- ReusableLocator

### nth()

Returns a new seed with an index step added; this seed is unchanged. `"first"` and `"last"` become `first()` and
`last()`, a number goes to `nth()` as given.

**Usage**

```ts
import type { ReusableLocator } from "pomwright";

declare const row: ReusableLocator<"table.row@last", "locator">;
// ---cut---
const lastRow = row.nth("last");
```

**Arguments**

- `index` number | "first" | "last"

**Returns**

- ReusableLocator

---

## Properties

### definition

A copy of the seed's locator: its strategy and arguments, such as `{ type: "locator", selector: "tr" }`.

### description

The seed's description, or `undefined` when it has none; a path registered from it then shows its own path.

### steps

A copy of the seed's `filter` and `nth` steps, in the order they were added, such as
`[{ kind: "filter", filter: { hasText: "Open" } }]`.

### type

The seed's strategy, such as `"locator"`.
