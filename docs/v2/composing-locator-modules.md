# POMWright v2 Paths and Locator Module Composition

## Overview

POMWright v2 uses typed string literal unions to describe all valid locator paths in a registry:

```ts
type Paths =
 | "main"
 | "main.form@login"
 | "main.form@login.input@username"
 | "main.form@login.input@password"
 | "main.button@login";
```

That union is passed to `PageObject`, `LocatorRegistry`, or `createRegistryWithAccessors`.

The path union gives TypeScript enough information to:

- validate path literals passed to `add`, `getLocator`, `getNestedLocator`, and `getLocatorSchema`;
- provide autocomplete for valid path strings;
- prevent accidental use of paths that are not part of the registry;
- preserve precise path types when locator definitions are composed across multiple files.

When all locator definitions live in one file, the type model is straightforward:

```ts
import type { LocatorRegistry } from "pomwright";
export type Paths =
 | "main"
 | "main.form@login"
 | "main.form@login.input@username"
 | "main.form@login.input@password"
 | "main.button@login";

export function defineLocators(registry: LocatorRegistry<Paths>) {
registry.add("main").locator("main");
registry.add("main.form@login").getByRole("form", { name: "Login" });
registry.add("main.form@login.input@username").getByLabel("Username");
registry.add("main.form@login.input@password").getByLabel("Password");
registry.add("main.button@login").getByRole("button", { name: "Login" });
}
```

When locator definitions are split across multiple `*.locators.ts` files, each file should:

1. Export the paths it owns/registers.
2. Export a `defineLocators` function with an overload signature that accepts larger composed registries.
3. Use a narrow implementation signature so `registry.add(...)` autocomplete stays focused on that file's local paths.

## Recommended Locator Module Pattern

Use this pattern for locator modules that may be composed into a larger registry:

```ts
// header.locators.ts
import type { LocatorRegistry } from "pomwright";

export type Paths =
 | "header"
 | "header.link@logo"
 | "header.link@help";

export function defineLocators<ExternalPaths extends string = never>(
 registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
 registry.add("header").getByRole("banner");
 registry.add("header.link@logo").getByRole("link", { name: "Logo" });
 registry.add("header.link@help").getByRole("link", { name: "Help" });
}
```

There is still only one runtime function. The first signature is the public overload signature. The second signature is the implementation.

The public overload:

```ts
export function defineLocators<ExternalPaths extends string = never>(
 registry: LocatorRegistry<Paths | ExternalPaths>,
): void;
```

says that this module can be called with a registry containing this module's `Paths` plus any other paths from the caller.

The implementation:

```ts
export function defineLocators(registry: LocatorRegistry<Paths>) {
 // registry.add(...) calls
}
```

keeps the function body typed to this module's local `Paths`. That gives precise autocomplete for partially typed string literals in `registry.add(...)`.

## Composing Modules

A parent module can import child path unions and child `defineLocators` functions, then expose its own composed path union:

```ts
// common.locators.ts
import type { LocatorRegistry } from "pomwright";
import { defineLocators as addHeader, type Paths as Header } from "./header.locators";
import { defineLocators as addFooter, type Paths as Footer } from "./footer.locators";

export type Paths = Header | Footer | "main";

export function defineLocators<ExternalPaths extends string = never>(
 registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
 addHeader(registry);
 addFooter(registry);
 registry.add("main").locator("main");
}
```

The parent module can also be composed into an even larger page-specific module:

```ts
// login.locators.ts
import type { LocatorRegistry } from "pomwright";
import { defineLocators as addCommon, type Paths as Common } from "../common.locators";

export type Paths =
 | Common
 | "main.form@login"
 | "main.form@login.input@username"
 | "main.form@login.input@password"
 | "main.button@login";

export function defineLocators(registry: LocatorRegistry<Paths>) {
 addCommon(registry);
 registry.add("main.form@login").getByRole("form", { name: "Login" });
 registry.add("main.form@login.input@username").getByLabel("Username");
 registry.add("main.form@login.input@password").getByLabel("Password");
 registry.add("main.button@login").getByRole("button", { name: "Login" });
}
```

> Note: Since a PageObject's locator file is usually at the top of the hierarchy, it does not need the overload signature unless it will itself be composed into a larger locator module (e.g. similar sub-pages).

Then the `PageObject` uses the final composed path union:

```ts
// login.page.ts
import { type Page } from "@playwright/test";
import { PageObject } from "pomwright";
import { defineLocators, type Paths } from "./login.locators";

export class LoginPage extends PageObject<Paths> {
 constructor(page: Page) {
  super(page, "https://example.com", "/login");
 }

 protected defineLocators(): void {
  defineLocators(this.locatorRegistry);
 }

 protected pageActionsToPerformAfterNavigation() {
  return [];
 }
}
```

## How The Generic Works

In this signature:

```ts
export function defineLocators<ExternalPaths extends string = never>(
 registry: LocatorRegistry<Paths | ExternalPaths>,
): void;
```

`Paths` means:

> The path union owned or registered by this locator module.

`ExternalPaths` means:

> Any other paths present in the same registry at the call site.

For example, if `common.locators.ts` has:

```ts
export type Paths = Header | Footer | "main" | SlotPaths;
```

and it calls:

```ts
addHeader(registry);
```

then, from `header.locators.ts`, `ExternalPaths` conceptually accounts for the paths that are not part of the header module, such as `Footer | "main" | SlotPaths`.

Those paths are external only relative to the current module. They may be local to the caller.

## Shared Slot Paths

Sometimes a path name should be shared across every PageObject in a domain, while its concrete locator definition varies by page. Treat these as shared slot paths.

The most common pattern is to declare the slot in the common parent module without registering a locator for it there. The top-level PageObject locator module then fills the slot with its page-specific definition.

In the earlier `common.locators.ts` example we can declare `"main.heading"` as a slot path:

```ts
// common.locators.ts
import type { LocatorRegistry } from "pomwright";
import { defineLocators as addHeader, type Paths as Header } from "./header.locators";
import { defineLocators as addFooter, type Paths as Footer } from "./footer.locators";

export type Paths = Header | Footer | "main" | "main.heading";

export function defineLocators<ExternalPaths extends string = never>(
 registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
 addHeader(registry);
 addFooter(registry);
 registry.add("main").locator("main");
 // "main.heading" is intentionally not registered here.
}
```

The top-level `login.locators.ts` module receives `"main.heading"` through `Common` and registers the concrete locator for the login page:

```ts
// login.locators.ts
import type { LocatorRegistry } from "pomwright";
import { defineLocators as addCommon, type Paths as Common } from "../common.locators";

export type Paths =
 | Common
 | "main.form@login"
 | "main.form@login.input@username"
 | "main.form@login.input@password"
 | "main.button@login";

export function defineLocators(registry: LocatorRegistry<Paths>) {
 addCommon(registry);
 registry.add("main.heading").getByRole("heading", { name: "Login" }); // add "main.heading" locator here
 registry.add("main.form@login").getByRole("form", { name: "Login" });
 registry.add("main.form@login.input@username").getByLabel("Username");
 registry.add("main.form@login.input@password").getByLabel("Password");
 registry.add("main.button@login").getByRole("button", { name: "Login" });
}
```

Another top-level locator module can fill the same slot differently for its own PageObject registry:

```ts
// accessories.locators.ts
import type { LocatorRegistry } from "pomwright";
import { defineLocators as addCommon, type Paths as Common } from "../common.locators";

export type Paths = Common | "main.list@accessories";

export function defineLocators(registry: LocatorRegistry<Paths>) {
 addCommon(registry);
 registry.add("main.heading").getByRole("heading", { name: "Accessories" }); // add "main.heading" locator
 registry.add("main.list@accessories").getByRole("list", { name: "Accessories" });
}
```

> If you forget to register a slot path in a top-level module, pomwright will throw a descriptive error during runtime.

Because these files are at the top of their respective locator hierarchies, they do not need an overload signature. Each PageObject creates a separate registry, so each top-level module can register its own definition for the same shared slot path.

## Ownership Rule

The path union describes which paths are allowed. Registration still happens only where `registry.add(...)` is called.

If a module calls:

```ts
registry.add("main.heading").getByRole("heading", { name: "Login" });
```

then `"main.heading"` must be included in that module's implementation `Paths`, either directly or through a composed path union such as `Common`.

Each concrete registry should register a given path once. If multiple modules register the same path on the same registry instance, the duplicate registration will make POMWright throw an error at runtime.

## Recommended Checklist

For each locator module:

- Export a `Paths` union for the paths the module owns, declares as slots, or registers.
- Use the overload signature with `ExternalPaths` for modules/components/children.
- Keep the implementation signature as `LocatorRegistry<Paths>` for local autocomplete.
- Declare domain-wide shared slots in the nearest common parent module.
- Register each shared slot in exactly one top-level or composed module per concrete registry.
- Let parent modules compose child `Paths` unions and call child `defineLocators` functions.

## Summary

Use the overload pattern whenever a locator module may be composed into a larger registry:

```ts
export function defineLocators<ExternalPaths extends string = never>(
 registry: LocatorRegistry<Paths | ExternalPaths>,
): void;

export function defineLocators(registry: LocatorRegistry<Paths>) {
 // local registry.add(...) calls
}
```

This gives parent modules the flexibility to pass larger registries while preserving precise `registry.add(...)` autocomplete inside each locator module.

The overload pattern can be dropped for the locator files at the top of the hierarchy (usually PageObject locator files).
