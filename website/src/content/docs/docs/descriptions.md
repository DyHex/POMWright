---
title: Descriptions
description: "Every resolved locator is described by its path; where Playwright shows a description, and how to set or remove one."
---

## Introduction

Playwright lets you name a locator with [`locator.describe()`](https://playwright.dev/docs/api/class-locator#locator-describe):
the report and some error messages then show the name instead of the selector chain. POMWright gives every locator it
resolves a description, its path, so a report reads `main.form@login.button@login` where it would otherwise show a
long chain.

## The path by default

`getNestedLocator` and `getLocator` both describe the locator by its path:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.button@login">;
// ---cut---
registry.add("main").locator("main");
registry.add("main.button@login").getByRole("button", { name: "Log in" });

registry.getNestedLocator("main.button@login").description(); // "main.button@login"
registry.getLocator("main.button@login").description(); // "main.button@login"
```

Only the resolved path's description is used; the descriptions of its ancestors never show.

## Where Playwright shows it

| where | with the description | without one |
| --- | --- | --- |
| `toString()`, `description()` | `main.button@login` | the chain; `description()` is `null` |
| the HTML report's row of an action or assertion | `Click main.button@login` | the chain |
| an assertion error's `Locator:` line | `Locator: main.button@login` | the chain |
| the call log of every action and assertion | `waiting for locator('main').getByRole('button', { name: 'Log in' })` | the same |
| a strict mode error | `strict mode violation: locator('main').getByRole('button', { name: 'Log in' }) resolved to 2 elements` | the same |

So a report stays readable, and a failure's call log still shows the chain Playwright waited for.

## Your own description

`describe` on a registration replaces the path with your text for every use:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.submit">;
// ---cut---
registry.add("main.submit").getByRole("button", { name: "Submit" }).describe("Primary submit button");

registry.getLocator("main.submit").description(); // "Primary submit button"
```

On a query it replaces the registered description or the path for that one use, and leaves the registry as it is:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.submit">;
// ---cut---
registry.getLocatorSchema("main.submit").describe("Submit after editing").getLocator();
```

A seed and a path reuse carry an explicit description to the paths they are registered at; without one, the new path
describes itself (see [Reusing locators](/POMWright/docs/reusing-locators/)).

## No description

`describe("")` removes the description, as Playwright's own `describe("")` does: the locator prints as its chain.
That is the quickest way to see what a path resolves to:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main.submit">;
// ---cut---
registry.getLocatorSchema("main.submit").describe("").getLocator().toString();
// getByRole('button', { name: 'Submit' })
```

The argument is a string. From JavaScript, `describe(null)` or `describe(undefined)` throws:
`describe requires a string for "main.submit"; pass "" to remove the description.`

## Chaining further

A locator you chain further yourself is a new Playwright locator, and Playwright gives it no description:
`registry.getNestedLocator("main").locator("li")` prints `locator('main').locator('li')`. Register the path instead
when it is worth a name.

## Reference

- [`describe()`](/POMWright/api/class-registrationbuilder/#describe) on the registration builder, on a
  [query](/POMWright/api/class-locatorquerybuilder/#describe) and on a [seed](/POMWright/api/class-reusablelocator/#describe)
- Playwright: [`locator.describe()`](https://playwright.dev/docs/api/class-locator#locator-describe),
  [`locator.description()`](https://playwright.dev/docs/api/class-locator#locator-description)
