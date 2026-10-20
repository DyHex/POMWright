---
title: Reusing locators
description: "Register a copy of a registered path elsewhere, narrowed with filter, nth and describe; or build variants of one seed from createReusable."
---

## Introduction

In Playwright, reusing a locator means keeping it in a variable and chaining from it. In POMWright the same element
often appears in several places on a page, an error message inside every form or a list item in every list, and each
place has its own path. Two tools register one definition at several paths:

- **Reuse by path**: register a copy of a path that is already registered, and narrow the copy where it is used. This
  is the way to share a locator, also between [locator modules](/POMWright/docs/locator-modules/).
- **Seeds**: `createReusable` builds a definition with steps without registering it, and every path that reuses it can
  change its options. This is the way to make variants, usually inside one module.

## Reuse by path

`add(path, { reuse: "other.path" })` registers a copy of `other.path` at `path`: its strategy, its steps, and its
description if it has one of its own. `filter`, `nth` and `describe` narrow the copy, after the copied steps:

```ts
import type { LocatorRegistry } from "pomwright";

type Paths =
  | "shared.list.items"
  | "shared.error@invalidPassword"
  | "main.list"
  | "main.list.item@last"
  | "main.form.error@invalidPassword";
declare const registry: LocatorRegistry<Paths>;
// ---cut---
registry.add("shared.list.items").getByRole("listitem");
registry.add("shared.error@invalidPassword").getByText("Invalid password");

registry.add("main.list").locator("ul");
registry.add("main.list.item@last", { reuse: "shared.list.items" }).nth("last").describe("Last item");
// locator('ul').getByRole('listitem').last(), described "Last item"

registry.add("main.form.error@invalidPassword", { reuse: "shared.error@invalidPassword" });
// getByText('Invalid password'), described "main.form.error@invalidPassword"
```

The source never changes, and the copy is a registration like any other: it resolves inside its own ancestors. A copy
only narrows: there is no strategy method after a path, and no `clearSteps`, because TypeScript does not know the
source's strategy and a copy without the source's steps would be another locator. A different base is a path of its own,
registered once and reused where needed.

The source must be registered before the copy: `No locator schema registered for path "nope.path".` otherwise. A path
cannot reuse itself (a compile error).

## Seeds: `createReusable`

`registry.createReusable` has the ten locator methods of `add(path)`. It returns a **seed**: a definition with its
steps and description, registered nowhere until a path reuses it. A seed is a value, like a Playwright `Locator`:
`filter`, `nth` and `describe` return a new seed and leave the one they are called on as it was, so variants of one
base do not affect each other:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"table.rows" | "table.row@first" | "table.row@last">;
// ---cut---
const row = registry.createReusable.locator("tr");

registry.add("table.rows", { reuse: row }); // locator('tr')
registry.add("table.row@first", { reuse: row.nth(0) }); // locator('tr').first()
registry.add("table.row@last", { reuse: row.nth("last") }); // locator('tr').last()
```

Use the result of a seed's method: `row.nth(0);` on its own line does nothing.

## Changing a seed's options

A path that reuses a seed may change the seed's definition once, with the method of the seed's strategy, as `update()`
patches a definition (see [Queries](/POMWright/docs/queries/#patching-a-definition-update)): a value replaces, `null`
deletes, an omitted value keeps the seed's. `filter`, `nth` and `describe` follow as usual:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"card.heading@summary" | "card.links" | "card.headings">;
// ---cut---
const heading = registry.createReusable.getByRole("heading", { level: 2 });

registry.add("card.heading@summary", { reuse: heading }).getByRole({ name: "Summary" });
// getByRole('heading', { name: 'Summary', level: 2 })
registry.add("card.links", { reuse: heading }).getByRole("link", null);
// getByRole('link'): the role replaced, the options cleared
registry.add("card.headings", { reuse: heading }).getByRole({ level: null });
// getByRole('heading'): the level deleted
```

The seed's strategy decides which method is offered: on a role seed, `locator(…)` is a compile error. From
JavaScript, another strategy's method throws, and so does a second change:

```text
The locator definition for "card.text@summary" must use the "role" strategy when reusing a locator.
A locator definition for "card.heading@summary" was already provided from reuse; only one matching override is allowed.
```

When you keep the registration in a variable, the one change may come before or after its `filter`, `nth` and
`describe` calls, until the registry is called again (see
[Registering locators](/POMWright/docs/registering-locators/#registered-locators-do-not-change)). Its place makes no
difference to the result: the change patches the seed's locator, and the steps always follow the locator, in the order
they were given:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"card.heading@summary">;
const heading = registry.createReusable.getByRole("heading", { level: 2 });
// ---cut---
const summaryHeading = registry.add("card.heading@summary", { reuse: heading });
summaryHeading.filter({ hasText: "Summary" }).nth(0);
summaryHeading.getByRole({ name: "Summary" });
// getByRole('heading', { name: 'Summary', level: 2 }).filter({ hasText: 'Summary' }).first(),
// as getByRole({ name: "Summary" }).filter({ hasText: "Summary" }).nth(0) in one chain
```

## Seeds in modules

A seed has a type, `ReusableLocator<Paths, Strategy>`, so a module can hand one out:

```ts title="headings.locators.ts"
import type { LocatorRegistry, ReusableLocator } from "pomwright";

export type Paths = "card" | "card.heading@summary";

export const headingSeed = (registry: LocatorRegistry<Paths>): ReusableLocator<Paths, "role"> =>
  registry.createReusable.getByRole("heading", { level: 2 });

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("card").locator("article");
  registry.add("card.heading@summary", { reuse: headingSeed(registry) }).getByRole({ name: "Summary" });
}
```

`ReusableLocator<Paths, "role">` keeps the strategy, so the path that reuses it offers only `getByRole`.
`ReusableLocator<Paths>` accepts a seed of any strategy, and a wrong method then throws at runtime instead.

## Frames and odd seeds

A frame seed needs a selector, `createReusable.frameLocator("iframe")`: the any-frame form has no element a seed could
carry (`createReusable.frameLocator requires a selector value.`). A copy of an any-frame path takes no steps or
description, as the original takes none:

```text
nth() cannot apply to "bannerFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

A seed object made by hand is checked like a builder's first argument (`reuse requires a non-empty selector for
"main.list".`), and a reuse value that is neither a path nor a seed throws `reuse requires a registered path or a seed
from createReusable for "main.list.item".`

## Reference

- [`createReusable` and `ReusableLocator`](/POMWright/api/class-reusablelocator/)
- [`LocatorRegistry.add()`](/POMWright/api/class-locatorregistry/#add), both reuse forms
- Playwright: [Locators](https://playwright.dev/docs/locators)
