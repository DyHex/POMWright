# Resolving locators, and queries

How a path becomes a Playwright `Locator`, and how to change a chain for one use without touching the registry. Full
rules: [Resolving locators](https://dyhex.github.io/POMWright/docs/resolving-locators/) and
[Queries](https://dyhex.github.io/POMWright/docs/queries/).

## Contents

- [getNestedLocator and getLocator](#getnestedlocator-and-getlocator)
- [How much to chain](#how-much-to-chain)
- [Several matches](#several-matches)
- [Queries: one use, the registry unchanged](#queries-one-use-the-registry-unchanged)
- [One element among several, by what it contains](#one-element-among-several-by-what-it-contains)
- [update and replace](#update-and-replace)
- [Keeping a query, skip and unskip](#keeping-a-query-skip-and-unskip)

## getNestedLocator and getLocator

| method | resolves | use it for |
| --- | --- | --- |
| `getNestedLocator(path)` | every registered segment of the path, first to last, each with its steps | every element you act on or assert against |
| `getLocator(path)` | the path's own locator and steps, without its ancestors | a chain you build yourself, the inner locator of a filter, every match on the whole page |

Both are synchronous and lazy, as Playwright's locator methods are, and return an ordinary `Locator` described by its
path, so the report shows `Click main.form@login.button@login` while the call log shows the chain. Resolve the chain
even where the path's own locator is unique today: when the page gains a similar element elsewhere, the chain keeps
finding the right one, and when the element moves out of its ancestors, the test fails instead of following it.

## How much to chain

Register the segments a user would recognize, a landmark, a region, a form, a dialog, a table, and only as many as make
the chain unique on the page. A chain that copies the markup element by element fails on changes a user never
notices; a chain with too few segments finds a similar element elsewhere.

## Several matches

A path meant to match several elements is plural. Count them, assert on all of them, or act on each:

```ts
import { expect } from "@playwright/test";
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.table@cart" | "main.table@cart.inputs@quantity">;

registry.add("main").locator("main");
registry.add("main.table@cart").getByRole("table", { name: "Cart" });
registry.add("main.table@cart.inputs@quantity").getByLabel("Quantity");

const quantities = ["1", "2", "5"];
const inputs = registry.getNestedLocator("main.table@cart.inputs@quantity");
await expect(inputs).toHaveCount(quantities.length);
for (const [row, value] of quantities.entries()) {
  await inputs.nth(row).fill(value);
}
```

`getNestedLocator` matches inside the path's ancestors only, so a quantity field outside the cart is left alone;
`getLocator("main.table@cart.inputs@quantity")` would match every "Quantity" field on the page. To pick one element
and keep the path as its description, use a query: `getLocatorSchema(path).nth(0).getNestedLocator()`.

## Queries: one use, the registry unchanged

`getLocatorSchema(path)` returns a query: a private copy of the path's chain, its segments with their definitions,
steps and descriptions. Its methods change the copy and return it, and `getNestedLocator()` or `getLocator()`
resolves it. The registry never changes, and the next `getLocatorSchema` starts from it again.

| method | does |
| --- | --- |
| `filter([subPath,] filter)` | adds a `filter` step to a segment, after its registered steps |
| `nth([subPath,] index)` | adds an index step |
| `clearSteps(subPath?)` | removes a segment's steps, registered and added; take them away before an index that should replace them |
| `describe(text)` | sets the resolved locator's description for this query |
| `update(subPath?)` | patches a segment's definition and keeps its strategy (below) |
| `replace(subPath?)` | installs a definition of any strategy |
| `skip(subPath)`, `unskip(subPath)` | leaves an ancestor out of the chain, and brings it back |

A `subPath` is the query's own path or one of its registered ancestors; without one, a method works on the query's
own path. In a page object, a query belongs in a method that needs a variation of a registered locator.

## One element among several, by what it contains

Register the repeated element once, plural or generic, and narrow it in a query. A row of a table, found by its text,
then an element inside that row:

```ts
import type { LocatorRegistry } from "pomwright";

type Paths = "main" | "main.table@orders" | "main.table@orders.rows" | "main.table@orders.rows.button@cancel";
declare const registry: LocatorRegistry<Paths>;

registry.add("main").locator("main");
registry.add("main.table@orders").getByRole("table", { name: "Orders" });
registry.add("main.table@orders.rows").getByRole("row");
registry.add("main.table@orders.rows.button@cancel").getByRole("button", { name: "Cancel" });

const cancel = registry
  .getLocatorSchema("main.table@orders.rows.button@cancel")
  .filter("main.table@orders.rows", { hasText: "ORD-1042" })
  .getNestedLocator();
// locator('main').getByRole('table', { name: 'Orders' }).getByRole('row').filter({ hasText: 'ORD-1042' }).getByRole('button', { name: 'Cancel' })
```

When text alone is ambiguous (`hasText: "Lamp"` also matches "Desk lamp"), filter by the element that names it: a query
of that element's path, its name set for this use and resolved with `getLocator()`, which Playwright looks for inside
each candidate:

```ts
import type { LocatorRegistry } from "pomwright";

type Paths =
  | "main.list@products"
  | "main.list@products.cards"
  | "main.list@products.cards.heading"
  | "main.list@products.cards.button@addToCart";
declare const registry: LocatorRegistry<Paths>;

registry.add("main.list@products").getByRole("list", { name: "Products" });
registry.add("main.list@products.cards").getByRole("listitem");
registry.add("main.list@products.cards.heading").getByRole("heading");
registry.add("main.list@products.cards.button@addToCart").getByRole("button", { name: "Add to cart" });

const heading = registry
  .getLocatorSchema("main.list@products.cards.heading")
  .update()
  .getByRole({ name: "Lamp", exact: true })
  .getLocator();
const addToCart = registry
  .getLocatorSchema("main.list@products.cards.button@addToCart")
  .filter("main.list@products.cards", { has: heading })
  .getNestedLocator();
// getByRole('list', { name: 'Products' }).getByRole('listitem').filter({ has: getByRole('heading', { name: 'Lamp', exact: true }) }).getByRole('button', { name: 'Add to cart' })
```

## update and replace

Prefer `update`, which keeps the registered strategy and patches it in JSON Merge Patch form: a value replaces, `null`
deletes, `undefined` leaves alone. For `getByRole("button", { name: "Save", exact: true })` registered:

| call | result |
| --- | --- |
| `update().getByRole({ name: "Cancel" })` | `getByRole("button", { name: "Cancel", exact: true })` |
| `update().getByRole({ name: null })` | `getByRole("button", { exact: true })` |
| `update().getByRole("link")` | `getByRole("link", { name: "Save", exact: true })` |
| `update().getByRole("button", null)` | `getByRole("button")` |

Another strategy's method on `update()` throws and says to use `replace`, which installs a definition of any strategy
with Playwright's own arguments. Neither touches a segment's steps or description.

## Keeping a query, skip and unskip

A query kept in a variable can follow an element whose state changes; resolve it again after each change, since a
`Locator` keeps what it was built from:

```ts
import { expect } from "@playwright/test";
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.button@wishlist">;

registry.add("main").locator("main");
registry.add("main.button@wishlist").getByRole("button", { name: "Add to wishlist" });

const wishlist = registry.getLocatorSchema("main.button@wishlist");
await wishlist.getNestedLocator().click();
wishlist.update().getByRole({ name: "Remove from wishlist" });
await expect(wishlist.getNestedLocator()).toBeVisible();
```

`skip(subPath)` leaves a registered ancestor out of the chain for one query, for a variant of the page in one test;
`unskip(subPath)` brings it back as it was. The query's own path cannot be skipped. See
[Queries](https://dyhex.github.io/POMWright/docs/queries/#leaving-an-ancestor-out-skip-and-unskip).
