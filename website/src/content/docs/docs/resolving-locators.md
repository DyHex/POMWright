---
title: Resolving locators
description: "How a path becomes a Playwright locator: getNestedLocator chains every registered segment, getLocator gives the path's own locator, for chains you build yourself, filters and every match on the page."
---

## Introduction

In Playwright you narrow a search by chaining: `page.locator("main").getByRole("button")` finds buttons inside
`main` ([matching inside a locator](https://playwright.dev/docs/locators#matching-inside-a-locator)). POMWright builds
that chain from a path. You register one locator per path, and resolving a path returns the Playwright
[`Locator`](https://playwright.dev/docs/api/class-locator) that chains them.

There are two ways to resolve a path:

| method | resolves | use it for |
| --- | --- | --- |
| `getNestedLocator(path)` | every registered segment of the path, first to last | every element you act on or assert |
| `getLocator(path)` | the path's own locator, without its ancestors | a chain you build yourself, a locator inside a filter, every match on the page, etc. |

Both are synchronous and lazy, like Playwright's own locator methods: they build a `Locator` and touch nothing in the
browser until an action or assertion uses it.

The examples on this page use this registry:

```ts title="login.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths =
  | "main"
  | "main.form@login"
  | "main.form@login.button@login";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.form@login").getByRole("form", { name: "Log in" });
  registry.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
}
```

against a page with two more "Log in" buttons, one beside the form and one in a dialog:

```html
<main>
  <form aria-label="Log in">
    <button>Log in</button>
  </form>
  <aside><button>Log in</button></aside>
</main>
<div role="dialog" aria-label="Session expired"><button>Log in</button></div>
```

## Chaining every segment: `getNestedLocator`

`getNestedLocator(path)` walks the path from its first segment to its last and chains the locator registered for each
one, with that segment's `filter` and `nth` steps right after it:

```ts
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./login.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
const submit = registry.getNestedLocator("main.form@login.button@login");
// locator('main').getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })

await submit.click();
```

Each segment's locator is resolved inside the one before it:

```mermaid
flowchart LR
  main["main<br/>locator('main')"] -->|inside| form["main.form@login<br/>getByRole('form', { name: 'Log in' })"]
  form -->|inside| submit["main.form@login.button@login<br/>getByRole('button', { name: 'Log in' })"]
```

The chain finds the form's button and not the other two, because each step searches inside the previous one. This is
why chaining is the default: the locator of the last segment can stay short (a role and a name) and still be unique,
since the path supplies the context. When the page changes structure, the path stops matching and the test fails,
instead of quietly finding a similar element elsewhere.

In a page object the same method is `this.getNestedLocator(path)`; see [your first page
object](/POMWright/docs/first-page-object/).

### How much to chain

A path does not need a segment for every element between the page and its target. Each registered segment is a
condition the page must keep, so register the ones a user would recognize, such as a landmark, a form, a dialog or a
table, and only as many as it takes to make the chain unique on the page. `main.form@login.button@login` registers
`main`, the form and the button; the layout `div`s between them are not segments, so wrapping the form in another
`div` changes nothing, while moving the button out of the form fails the test.

A chain that copies the markup element by element fails on changes a user never notices. A chain with too few segments
finds a similar element elsewhere. A segment you want in the path's name but not in the chain stays unregistered; see
[segments without a locator](/POMWright/docs/resolving-locators/#segments-without-a-locator).

## A locator without its ancestors: `getLocator`

`getLocator(path)` resolves only the locator registered for the path itself, with its own steps. It brings no context
of its own: used on the page it searches the whole page, chained under another locator it searches inside that one.
Use it when you build the chain yourself, for example to find the registered button in a dialog that is not part of
its path:

```ts
import type { Page } from "@playwright/test";
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./login.locators";

declare const page: Page;
declare const registry: LocatorRegistry<Paths>;
// ---cut---
const submit = registry.getLocator("main.form@login.button@login");

await page.getByRole("dialog", { name: "Session expired" }).locator(submit).click();
// getByRole('dialog', { name: 'Session expired' }).locator(getByRole('button', { name: 'Log in' }))
```

or as the inner locator of a filter, `page.getByRole("form").filter({ has: submit })`. A path given to
`filter({ has })` is resolved the same way, automatically, because Playwright evaluates `has` inside the element being
filtered; see [filters and indices](/POMWright/docs/filters-and-indices/). Because it searches the whole page, it is
also the locator for every match on the page at once; see [several matches](/POMWright/docs/resolving-locators/#several-matches).

To act on one element, resolve the chain instead. On its own, `getLocator` gives up the context the chain provides:
here it matches all three "Log in" buttons, and an action fails with Playwright's strict mode error:

```text
locator.click: Error: strict mode violation: getByRole('button', { name: 'Log in' }) resolved to 3 elements:
    1) <button>Log in</button> aka getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })
    2) <button>Log in</button> aka getByRole('complementary').getByRole('button', { name: 'Log in' })
    3) <button>Log in</button> aka getByRole('dialog', { name: 'Session expired' }).getByRole('button', { name: 'Log in' })
```

Resolve the chain even where a path's own locator is unique on the page today: when the page gains a similar element
elsewhere, `getNestedLocator` keeps finding the one under its ancestors, and when the element moves out of them, the
test fails instead of following it. Which moves count depends on the segments you register; see
[how much to chain](/POMWright/docs/resolving-locators/#how-much-to-chain).

## Several matches

A locator that matches several elements is a Playwright locator like any other: assert on all of them, count them, or
act on each with `nth`. Which method resolves it decides where the matches are counted.

A path can be meant to match several elements: every row of a table, every order in a list. Name such a path in the
plural, so that a test that uses it reads as acting on several elements, and give one of them a singular path of its
own:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<
  "main" | "main.list@orders" | "main.list@orders.items" | "main.list@orders.item@first"
>;
// ---cut---
registry.add("main").locator("main");
registry.add("main.list@orders").getByRole("list", { name: "Orders" });
registry.add("main.list@orders.items").getByRole("listitem");
// locator('main').getByRole('list', { name: 'Orders' }).getByRole('listitem'): every order
registry.add("main.list@orders.item@first", { reuse: "main.list@orders.items" }).nth("first");
// locator('main').getByRole('list', { name: 'Orders' }).getByRole('listitem').first(): one order
```

The `item@first` path is there to show the naming. Usually you register only `main.list@orders.items` and pick one
order where a test needs it: `getNestedLocator("main.list@orders.items").nth(0)`, or, to keep the path as the
description in the report, a query, `getLocatorSchema("main.list@orders.items").nth(0).getNestedLocator()` (see
[queries](/POMWright/docs/queries/)). A singular path of its own pays off when many tests use that one element.

`getLocator(path)` matches the element wherever it is on the page, so it answers a question about the whole page, such
as how many "Log in" buttons it has:

```ts
import { expect } from "@playwright/test";
import type { LocatorRegistry } from "pomwright";
import type { Paths } from "./login.locators";

declare const registry: LocatorRegistry<Paths>;
// ---cut---
await expect(registry.getLocator("main.form@login.button@login")).toHaveCount(3);
// the form's, the aside's and the dialog's; getNestedLocator matches only the form's
```

`getNestedLocator(path)` matches every element inside its ancestors. To fill in every row of one table, iterate over
the chain, which leaves alone the same kind of input elsewhere on the page:

```html
<main>
  <table aria-label="Cart">
    <tr><td>Lamp</td><td><input aria-label="Quantity" /></td></tr>
    <tr><td>Chair</td><td><input aria-label="Quantity" /></td></tr>
    <tr><td>Desk</td><td><input aria-label="Quantity" /></td></tr>
  </table>
  <aside><label>Quantity <input /></label></aside>
</main>
```

```ts
import { expect } from "@playwright/test";
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.table@cart" | "main.table@cart.inputs@quantity">;
// ---cut---
registry.add("main").locator("main");
registry.add("main.table@cart").getByRole("table", { name: "Cart" });
registry.add("main.table@cart.inputs@quantity").getByLabel("Quantity");

const quantities = ["1", "2", "5"];
const quantityInputs = registry.getNestedLocator("main.table@cart.inputs@quantity");
// locator('main').getByRole('table', { name: 'Cart' }).getByLabel('Quantity'): 3 inputs, the aside's is not one

await expect(quantityInputs).toHaveCount(quantities.length);
for (const [row, value] of quantities.entries()) {
  await quantityInputs.nth(row).fill(value);
}
```

`getLocator("main.table@cart.inputs@quantity")` would match all four inputs.

## Segments without a locator

A segment does not need a locator of its own. A segment that has none is only a name that groups paths, and
resolution leaves it out of the chain:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.form" | "main.form.button.submit">;
// ---cut---
registry.add("main.form").getByRole("form", { name: "Log in" });
registry.add("main.form.button.submit").getByRole("button", { name: "Log in" });

registry.getNestedLocator("main.form.button.submit");
// getByRole('form', { name: 'Log in' }).getByRole('button', { name: 'Log in' })
// "main" and "main.form.button" are names, not locators
```

The chain is then as specific as its registered segments. Only the path you resolve must be registered; resolving a
path that is not throws `No locator schema registered for path "main.form.button".` A project that wants every
segment registered can ask the registry to check it: see [`strictChains`](/POMWright/docs/verifying-registries/).

## What the report shows

A resolved locator carries its path as its [description](https://playwright.dev/docs/api/class-locator#locator-describe):
the HTML report shows the path next to each action and assertion, while the call log and a strict mode error show the
chain Playwright waited for. See [Descriptions](/POMWright/docs/descriptions/#where-playwright-shows-it).

## Changing a chain in one test

`getNestedLocator` and `getLocator` always resolve what is registered. To change a chain for one test (another name,
one more filter, an index, an ancestor left out) start a query with `getLocatorSchema(path)`; the registry itself never
changes. See [queries](/POMWright/docs/queries/).

## Frames

A segment registered with `frameLocator(selector)` is the `<iframe>` element, and the segments below it resolve
inside the frame, as Playwright's [`locator.contentFrame()`](https://playwright.dev/docs/api/class-locator#locator-content-frame)
does. See [frames](/POMWright/docs/frames/).

## Reference

- [`LocatorRegistry.getNestedLocator()`](/POMWright/api/class-locatorregistry/#getnestedlocator) and
  [`getLocator()`](/POMWright/api/class-locatorregistry/#getlocator)
- [`PageObject`](/POMWright/api/class-pageobject/), whose `getNestedLocator` and `getLocator` are the same methods
- Playwright: [Locators](https://playwright.dev/docs/locators), [`Locator`](https://playwright.dev/docs/api/class-locator)
