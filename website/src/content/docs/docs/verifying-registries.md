---
title: Verifying a registry
description: "verify() resolves every registered path once and reports every mistake together; page objects run it right after defineLocators(). And the opt-in strictChains."
---

## Introduction

Playwright's locators are lazy: a mistake in one surfaces only when an action uses it, possibly late in a test or in a
test that rarely runs. Most mistakes in a registry are compile errors already, such as a path that is not in the union
or a misspelt `has` reference. The rest can be found without a browser, and POMWright finds them all at once:
`verify()` resolves every registered path and reports every failure in one error.

A page object verifies its registry right after `defineLocators()`, so a mistake fails the test in the fixture, before
its body runs, with the page object's name. A registry you create with `createRegistryWithAccessors` is verified when
you call `registry.verify()`.

## What it finds

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"list" | "list.item" | "list.titel" | "menu" | "menu.item">;
// ---cut---
registry.add("list").locator("ul");
registry.add("list.item").getByRole("listitem").filter({ has: "list.titel" }); // never registered
registry.add("menu").locator("nav");
registry.add("menu.item").locator("li").filter({ has: "menu.item" }); // refers to itself

registry.verify();
```

```text
Locator registry verification failed for 2 of 4 paths:
  "list.item": No locator schema registered for path "list.titel".
  "menu.item": Detected cyclic filter reference while resolving "menu.item": "menu.item".
```

Each path is resolved on its own, as `getLocator` resolves it, which evaluates its `has` and `hasNot` references: a
reference to a path that is never registered, a loop of references, a reference that is neither a `Locator` nor a path,
and a reference to an any-frame segment all fail, each reported at the path that owns it. An any-frame
`frameLocator()` is checked against its first-segment rule (see [Frames](/POMWright/docs/frames/)). Registration
mistakes, a duplicate path or an empty selector, throw earlier, at the call that makes them.

What it does not check: whether a selector parses (Playwright parses it at the first action), whether an element
exists, whether a locator is unique, a query's changes, and a path in the union that is never registered and never
resolved, such as a slot no page object fills (see [Locator modules](/POMWright/docs/locator-modules/#shared-slots)).
It never touches the page, and it costs about a microsecond per path.

## In a page object

A page object runs `defineLocators()` and then `verify()` once, right after it is constructed. A failure is reported
with the page object's label and the original error as `cause`, at the line that constructed it. For a `LoginPage` whose
submit button is filtered by `main.form@login.title`, a path in its union that it never registers:

```text
LoginPage: Locator registry verification failed for 1 of 5 paths:
  "main.form@login.button@submit": No locator schema registered for path "main.form@login.title".
```

There is no way to turn it off: it fails only where a resolution would fail. See [Page objects](/POMWright/docs/page-objects/)
for what a test shows when the page object is built in a fixture, `beforeEach` or `beforeAll`.

## `strictChains`: every ancestor registered

By default a segment without a locator is a name that groups paths (see
[Resolving locators](/POMWright/docs/resolving-locators/#segments-without-a-locator)). A project that registers every
segment can have `verify()` check that it did, with `strictChains: true`, so a forgotten ancestor is reported instead of
silently leaving the chain shorter:

```ts
import type { Page } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

declare const page: Page;
// ---cut---
const { registry } = createRegistryWithAccessors<"main" | "main.form.button.save">(page, { strictChains: true });
registry.add("main").locator("main");
registry.add("main.form.button.save").getByRole("button", { name: "Save" });
registry.verify();
```

```text
Locator registry verification failed for 1 of 2 paths:
  "main.form.button.save": strictChains requires every ancestor to be registered; "main.form" and "main.form.button" are not.
```

A page object takes it as a constructor option, `locators: { strictChains: true }`, usually once, in the site's
[base class](/POMWright/docs/organising-a-project/#a-base-class-for-your-site). A path that fails both checks gets both
messages on its line. `skip` works as before: it leaves a registered segment out of one query. Under the option an
any-frame segment, which may have no registered ancestor, can only be a root path.

## Reference

- [`LocatorRegistry.verify()`](/POMWright/api/class-locatorregistry/#verify),
  [`LocatorRegistryOptions`](/POMWright/api/class-locatorregistry/#locatorregistryoptions)
- [`PageObject` constructor options](/POMWright/api/class-pageobject/#new-pageobject)
- Playwright: [Locators](https://playwright.dev/docs/locators) (locators are resolved when an action uses them)
