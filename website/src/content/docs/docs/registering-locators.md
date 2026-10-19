---
title: Registering locators
description: "add(path) and the ten locator methods, each with Playwright's own arguments; the rules for the first argument, steps and duplicates."
---

## Introduction

Playwright creates locators with methods such as [`page.getByRole()`](https://playwright.dev/docs/locators#locate-by-role)
and [`page.locator()`](https://playwright.dev/docs/locators#locate-by-css-or-xpath). POMWright registers them under a
path with the same methods and the same arguments: `add(path)` followed by one method. The locator is created when the
path is resolved, from the page or from the locator of the segment before it.

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.form@login" | "main.form@login.button@submit">;
// ---cut---
registry.add("main").locator("main");
registry.add("main.form@login").getByRole("form", { name: "Log in" });
registry.add("main.form@login.button@submit").getByRole("button", { name: "Log in" });
```

In a page object the same calls are `this.add(…)` inside `defineLocators()`.

## The ten methods

| method | the Playwright method it mirrors |
| --- | --- |
| `getByRole(role, options?)` | [`getByRole`](https://playwright.dev/docs/api/class-page#page-get-by-role) |
| `getByText(text, options?)` | [`getByText`](https://playwright.dev/docs/api/class-page#page-get-by-text) |
| `getByLabel(text, options?)` | [`getByLabel`](https://playwright.dev/docs/api/class-page#page-get-by-label) |
| `getByPlaceholder(text, options?)` | [`getByPlaceholder`](https://playwright.dev/docs/api/class-page#page-get-by-placeholder) |
| `getByAltText(text, options?)` | [`getByAltText`](https://playwright.dev/docs/api/class-page#page-get-by-alt-text) |
| `getByTitle(text, options?)` | [`getByTitle`](https://playwright.dev/docs/api/class-page#page-get-by-title) |
| `locator(selector, options?)` | [`locator`](https://playwright.dev/docs/api/class-page#page-locator) |
| `getByTestId(testId)` | [`getByTestId`](https://playwright.dev/docs/api/class-page#page-get-by-test-id) |
| `frameLocator(selector)` | the `<iframe>` element, entered with [`contentFrame()`](https://playwright.dev/docs/api/class-locator#locator-content-frame); see [Frames](/POMWright/docs/frames/) |
| `getById(id)` | none: POMWright's own, see [Locating by id](/POMWright/docs/locating-by-id/) |

The arguments are Playwright's, and so are their types: which strings are ARIA roles, which options each method takes.
A registration resolves to what Playwright's method returns:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"cart" | "cart.total">;
// ---cut---
registry.add("cart").locator("section.cart", { hasText: "Total" });
// locator('section.cart').filter({ hasText: 'Total' })
registry.add("cart.total").getByText("Total", { exact: true });
// getByText('Total', { exact: true })
```

## Steps after the method

After the method you can chain the steps Playwright chains after a locator, in any order and number:
[`filter`](/POMWright/docs/filters-and-indices/), [`nth`](/POMWright/docs/filters-and-indices/#indices-nth) and
[`describe`](/POMWright/docs/descriptions/). They apply every time the path is resolved, in the order you chain them:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.list.item">;
// ---cut---
registry
  .add("main.list.item")
  .getByRole("listitem", { name: /Row/ })
  .filter({ hasText: "Row" })
  .nth("last")
  .describe("Last matching row");
// getByRole('listitem', { name: /Row/ }).filter({ hasText: 'Row' }).last(), described "Last matching row"
```

A step needs a method before it. `add(path)` offers only the ten methods, so `add("main").filter(…)` is a compile error;
from JavaScript it throws:

```text
filter() needs a locator strategy first for "main"; call getByRole, getByText, getByLabel, getByPlaceholder, getByAltText, getByTitle, locator, frameLocator, getByTestId or getById before it.
```

## The first argument

The first argument is required, as it is in Playwright. A registration without it throws at the call, naming the
method and the path:

```text
getByRole requires a role value for "main.button".
```

An empty string is rejected only where Playwright cannot use it: `locator("")` and `frameLocator("")` are selectors
that do not parse, `getByRole("")` names no role, and an empty id is invalid HTML (see
[Locating by id](/POMWright/docs/locating-by-id/#validation)):

```text
locator requires a non-empty selector for "main.list".
getByRole requires a non-empty role for "main.button".
```

`getByTestId("")` and the text methods keep an empty string, because Playwright matches it: `getByTestId("")` finds an
element with `data-testid=""`. From JavaScript, a first argument Playwright cannot take, such as `null`, a number or an
object where a string belongs, gets the missing-value message: `locator requires a selector value for "main.list".`

The only call without a first argument is `frameLocator()`, which registers Playwright's any-frame locator (see
[Frames](/POMWright/docs/frames/#any-frame-framelocator-without-a-selector)).

## One registration per path

A path holds one locator. Registering it again throws at the second method call and shows both records, the existing
one and the attempted one:

```text
A locator schema with the path "list.item" already exists.
Existing and attempted schemas: {
  "existing": {
    "locatorSchemaPath": "list.item",
    "definition": { "type": "locator", "selector": "li" },
    "steps": [{ "kind": "filter", "filter": { "has": "locator('b')" } }]
  },
  "attempted": {
    "locatorSchemaPath": "list.item",
    "definition": { "type": "locator", "selector": "li" },
    "steps": []
  }
}
```

The message spreads the JSON over more lines; it is shortened here. Calling a second method on the same `add(path)`
throws too: `A locator definition for "main.button" has already been provided; only one locator type can be set for a
registration.` A call that throws registers nothing and changes nothing that is registered.

## Registered locators do not change

The registry keeps a copy of every options and filter object you pass, so changing the object afterwards changes
nothing:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"form.button">;
// ---cut---
const options = { name: "Save" };
registry.add("form.button").getByRole("button", options);
options.name = "Cancel";

registry.getLocator("form.button"); // getByRole('button', { name: 'Save' })
```

The copy is one level deep: a `Locator` or a RegExp inside an options object is kept as it is, since neither can be
changed through Playwright's API. To change a locator for one use, query it; see [Queries](/POMWright/docs/queries/).

## When locators are registered

A page object registers its locators in `defineLocators()`, which runs once, right after the page object is
constructed. For filters the order does not matter: a `has` or `hasNot` path may be registered after the filter that
names it, and the check that runs after `defineLocators()` reports a name that is never registered (see
[Verifying a registry](/POMWright/docs/verifying-registries/)). A path you reuse must be registered before the copy (see
[Reusing locators](/POMWright/docs/reusing-locators/#reuse-by-path)).

## Reference

- [Registration builder](/POMWright/api/class-registrationbuilder/): every method of `add(path)`
- [`LocatorRegistry.add()`](/POMWright/api/class-locatorregistry/#add)
- Playwright: [Locators](https://playwright.dev/docs/locators), [`Page`](https://playwright.dev/docs/api/class-page)
