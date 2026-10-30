---
title: Filters and indices
description: "filter and nth on a registered locator, as Playwright's locator.filter() and nth(), with registered paths as has and hasNot references."
---

## Introduction

Playwright narrows a locator with [`locator.filter()`](https://playwright.dev/docs/locators#filtering-locators) and
picks one of several matches with [`first()`, `last()` and `nth()`](https://playwright.dev/docs/locators#get-by-nth).
POMWright records the same steps with a registration and applies them every time the path is resolved, right after
the segment's locator and in the order they were chained. One addition: `has` and `hasNot` also take a registered path.

The examples on this page use this page:

```html
<main>
  <section>
    <h2>Orders</h2>
    <ul><li>Open #1</li><li>Shipped #2</li></ul>
  </section>
  <section>
    <h2>Wishlist</h2>
    <ul><li>Lamp</li></ul>
  </section>
</main>
```

## Filters: `filter`

`filter` takes Playwright's filter options, `hasText`, `hasNotText`, `has`, `hasNot` and `visible`, and adds a
[`locator.filter()`](https://playwright.dev/docs/api/class-locator#locator-filter) step:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"section@orders" | "section@orders.item@open">;
// ---cut---
registry.add("section@orders").locator("section").filter({ hasText: "Orders" });
registry.add("section@orders.item@open").getByRole("listitem").filter({ hasText: "Open" });
// locator('section').filter({ hasText: 'Orders' }).getByRole('listitem').filter({ hasText: 'Open' })
```

`has` and `hasNot` take a Playwright `Locator`, as in Playwright, or a registered path:

```ts
import type { LocatorRegistry } from "pomwright";

type Paths =
  | "main"
  | "main.section@orders"
  | "main.section@orders.heading"
  | "main.section@orders.item@open";
declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.add("main").locator("main");
registry.add("main.section@orders").locator("section").filter({ has: "main.section@orders.heading" });
registry.add("main.section@orders.heading").getByRole("heading", { name: "Orders" });
registry.add("main.section@orders.item@open").getByRole("listitem").filter({ hasText: "Open" });

registry.getNestedLocator("main.section@orders.item@open");
// locator('main').locator('section').filter({ has: getByRole('heading', { name: 'Orders' }) })
//   .getByRole('listitem').filter({ hasText: 'Open' })
```

A path given to `has` or `hasNot` resolves to that path's own locator with its own steps, without its ancestors,
because Playwright evaluates `has` inside the element being filtered: the heading is looked for inside each section,
not from the top of the page. A misspelled path is a compile error. The path may be registered after the filter that
names it; the registry's [verification](/POMWright/docs/verifying-registries/) reports a name that is never registered.

### A path, a locator or a chain

There are three ways to filter by another registered locator. Inside an `add(…)` chain, resolve a locator before the
`add`: a `getLocator` in the filter's own arguments runs first, and ends the registration, as does a query
(`getLocatorSchema(…)`) there (see
[registering locators](/POMWright/docs/registering-locators/#registered-locators-do-not-change)).

```ts
import type { LocatorRegistry } from "pomwright";

type Paths =
  | "card"
  | "card.badge@new"
  | "list.item@withBadge"
  | "list.item@withBadgeLocator"
  | "list.item@withBadgeInCard";
declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.add("card").locator(".card");
registry.add("card.badge@new").getByText("New");

// a path: resolved at each use, to that path's own locator; verify() checks it exists
registry.add("list.item@withBadge").getByRole("listitem").filter({ has: "card.badge@new" });

// a Locator resolved before add(…): kept as it is; verify() does not see it
const badge = registry.getLocator("card.badge@new");
registry.add("list.item@withBadgeLocator").getByRole("listitem").filter({ has: badge });

// a chain resolved before add(…): for a filter that needs the ancestors a path leaves out
const badgeInCard = registry.getNestedLocator("card.badge@new");
registry.add("list.item@withBadgeInCard").getByRole("listitem").filter({ has: badgeInCard });
```

A path is the shortest and may name a path registered later. A `Locator` needs its path registered before the line
that resolves it.

Filters that refer to each other in a loop cannot be resolved, and verification reports every path in the loop:

```text
Locator registry verification failed for 2 of 2 paths:
  "main.list@orders": Detected cyclic filter reference while resolving "main.list@orders": "main.list@archive".
  "main.list@archive": Detected cyclic filter reference while resolving "main.list@archive": "main.list@orders".
```

A reference that is neither a `Locator` nor a path, from JavaScript, fails the same way:
`Unsupported filter reference while resolving "main.list@orders". Filter has/hasNot supports Playwright Locator
instances or registry path strings.`

## Indices: `nth`

`nth` picks one element: `"first"` and `"last"` become Playwright's
[`first()`](https://playwright.dev/docs/api/class-locator#locator-first) and
[`last()`](https://playwright.dev/docs/api/class-locator#locator-last), and a number goes to
[`nth()`](https://playwright.dev/docs/api/class-locator#locator-nth) as given, so `-1` is the last element:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"list" | "list.item@first" | "list.item@third" | "list.item@last">;
// ---cut---
registry.add("list").locator("ul");
registry.add("list.item@first").getByRole("listitem").nth("first");
registry.add("list.item@third").getByRole("listitem").nth(2);
registry.add("list.item@last").getByRole("listitem").nth(-1);
```

As in Playwright, an index belongs at the end of a chain that cannot be made unique otherwise; a filter on what
identifies the element survives changes to the page that an index does not.

## Steps in order

Steps apply in the order they are chained, so a filter after an index filters the one element the index picked:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"list.item">;
// ---cut---
registry.add("list.item").locator("li").filter({ hasText: "Open" }).nth(0).filter({ hasNotText: "#9" });
// locator('li').filter({ hasText: 'Open' }).first().filter({ hasNotText: '#9' })
```

When a path resolves to a chain, each segment's steps apply right after that segment's locator, before the next
segment.

## Steps for one use

A step registered with the path applies to every use. A step for one test, such as the row with a given order number,
goes on a query instead, which leaves the registry as it is:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"list" | "list.items">;
// ---cut---
const order = registry.getLocatorSchema("list.items").filter({ hasText: "#1042" }).getNestedLocator();
```

See [Queries](/POMWright/docs/queries/). A step on a [frame segment](/POMWright/docs/frames/) applies to the
`<iframe>` element, before the frame is entered.

## Reference

- [`filter()`](/POMWright/api/class-registrationbuilder/#filter) and [`nth()`](/POMWright/api/class-registrationbuilder/#nth)
  on the registration builder; [`FilterDefinition`](/POMWright/api/types/#filterdefinition)
- Playwright: [Filtering locators](https://playwright.dev/docs/locators#filtering-locators),
  [`locator.filter()`](https://playwright.dev/docs/api/class-locator#locator-filter),
  [`locator.nth()`](https://playwright.dev/docs/api/class-locator#locator-nth)
