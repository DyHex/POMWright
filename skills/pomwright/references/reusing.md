# Reusing locators

Two ways to register one definition at several paths: reuse by path, to share a locator, and seeds from
`createReusable`, to make variants of one base. Full rules:
[Reusing locators](https://dyhex.github.io/POMWright/docs/reusing-locators/).

## Contents

- [Reuse by path: sharing](#reuse-by-path-sharing)
- [Seeds: variants of one base](#seeds-variants-of-one-base)
- [Which to use](#which-to-use)

## Reuse by path: sharing

`add(path, { reuse: "other.path" })` registers a copy of a registered path at `path`: its strategy, its steps, and its
description if it has one of its own. `filter`, `nth` and `describe` narrow the copy, after the copied steps. The copy
resolves inside its own ancestors, and the source never changes:

```ts
import type { LocatorRegistry } from "pomwright";

type Paths = "shared.list.items" | "main.list@orders" | "main.list@orders.item@last";
declare const registry: LocatorRegistry<Paths>;

registry.add("shared.list.items").getByRole("listitem");
registry.add("main.list@orders").getByRole("list", { name: "Orders" });
registry.add("main.list@orders.item@last", { reuse: "shared.list.items" }).nth("last").describe("Last order");
// getNestedLocator("main.list@orders.item@last"), described "Last order":
// getByRole('list', { name: 'Orders' }).getByRole('listitem').last()
```

- The source is registered before the copy: a reused path is read at the `add` call.
- A copy only narrows: no strategy method after a path and no `clearSteps`. A different base is a path of its own.
- It is the way to share one locator between locator modules: the module that owns it registers it once, and a module
  that composes it registers a copy at its own path.

## Seeds: variants of one base

`registry.createReusable` has the ten locator methods of `add(path)` and returns a **seed**: a definition with steps
and a description, registered nowhere until a path reuses it. A seed is a value, like a Playwright `Locator`: `filter`,
`nth` and `describe` return a new seed and leave the one they are called on unchanged, so use their result.

A path that reuses a seed may change the seed's definition once, with the method of the seed's strategy, as `update()`
patches one: a value replaces, `null` deletes, an omitted or `undefined` value keeps the seed's:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"card" | "card.heading@summary" | "card.headings">;

const heading = registry.createReusable.getByRole("heading", { level: 2 });

registry.add("card").getByRole("article");
registry.add("card.heading@summary", { reuse: heading }).getByRole({ name: "Summary" });
// getLocator("card.heading@summary"): getByRole('heading', { name: 'Summary', level: 2 })
registry.add("card.headings", { reuse: heading });
// getLocator("card.headings"): getByRole('heading', { level: 2 })
```

The seed's strategy decides which method a path may call: on a role seed, `locator(…)` is a compile error, and from
JavaScript another strategy's method, or a second change, throws. A module hands a seed out typed
`ReusableLocator<Paths, "role">`, which keeps its strategy:

```ts
import type { LocatorRegistry, ReusableLocator } from "pomwright";

export type Paths = "card" | "card.heading@summary";

export const headingSeed = (registry: LocatorRegistry<Paths>): ReusableLocator<Paths, "role"> =>
  registry.createReusable.getByRole("heading", { level: 2 });

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("card").getByRole("article");
  registry.add("card.heading@summary", { reuse: headingSeed(registry) }).getByRole({ name: "Summary" });
}
```

A frame seed needs its selector, `createReusable.frameLocator("iframe")`: the any-frame form has no element to carry.

## Which to use

| need | use |
| --- | --- |
| the same element in several places, or one locator shared between modules | reuse by path |
| several variants of one base inside a module, each changing its options | a seed from `createReusable` |
| a variation for one test or one method call | neither: a query, `getLocatorSchema(path)` |
