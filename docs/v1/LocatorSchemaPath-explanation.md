# LocatorSchemaPath

A `LocatorSchemaPath` is the unique key that identifies a `LocatorSchema`.  Paths let POMWright build nested Playwright locators while keeping the definitions type‑safe and searchable.

## Path syntax

A `LocatorSchemaPath` is declared as a union of string literals.

```ts
type LocatorSchemaPath = "main";
```

Each word or segment of a string are separated by `.` (dot), where each dot represents a new element in the chain. Thus we end up with paths describing the hierarchy of elements on a page through dot notation.

```ts
type LocatorSchemaPath = 
  | "main"
  | "main.heading";
```

In other words, each `.` (dot) separates a new segment in the chain. A LocatorSchemaPath string:

- Cannot be empty.
- The string cannot start or end with `.`.
- The string cannot contain consecutive dots.

A path must start and end with a "word", a word is any combination of characters except `.` (dot). The following paths will throw during runtime:

```ts
// These throw at runtime
type LocatorSchemaPath =
  | ""              // empty string
  | ".main"         // starting with a dot
  | "main."         // ending with a dot
  | "main..heading" // consecutive dots
```

Every path represents a chain of locators that describe the hierarchy of elements on the page. POMWright enforces uniqueness, so registering the same path twice causes fixture initialisation to fail before any test using them can runs.

```ts
import { GetByMethod, type GetLocatorBase } from "pomwright";

export type LocatorSchemaPath =
  | "main"
  | "main.heading";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
  locators.addSchema("main.heading", { /* ... */ });
  locators.addSchema("main.heading", { /* ... */ }); // duplicate – throws
}
```

## Referencing schemas

Each path declared in the type must be implemented with `addSchema` inside `initLocatorSchemas`.  Missing implementations raise a `not implemented` error when the fixtures are created, helping you catch mistakes early.

Locator paths can be shared across Page Object Classes by re‑exporting the union of strings:

```ts
import { GetByMethod, type GetLocatorBase } from "pomwright";
import {
  type LocatorSchemaPath as common,
  initLocatorSchemas as initCommon
} from "../page-components/common.locatorSchema";

export type LocatorSchemaPath =
  | common
  | "main.heading";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
  initCommon(locators);

  locators.addSchema("main.heading", {
    role: "heading",
    roleOptions: { name: "Welcome!" },
    locatorMethod: GetByMethod.role
  });
}
```

## Descriptive segments

A path may include segments that exist purely for readability.  POMWright skips any missing intermediate keys when chaining the locator.

```ts
import { GetByMethod, type GetLocatorBase } from "pomwright";

type LocatorSchemaPath = 
  | "main"
  | "main.button.continue";  // "button" communicates intent

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {

  locators.addSchema("main", {
    locator: "main",
    locatorMethod: GetByMethod.locator
  });

  locators.addSchema("main.button.continue", {
    role: "button",
    roleOptions: { name: "Continue" },
    locatorMethod: GetByMethod.role
  });
}
```

You can also suffix segments with a friendly name using `@`.  POMWright treats `@` like any other character—it simply improves readability for humans. You're free to use any special character to improve readability.

```ts
import { GetByMethod, type GetLocatorBase, type LocatorSchemaWithoutPath } from "pomwright";

type LocatorSchemaPath = 
  | "main"
  | "main.button"
  | "main.button@continue"
  | "main.button@back";  // "button" is here used for human context

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {

  locators.addSchema("main", {
    locator: "main",
    locatorMethod: GetByMethod.locator
  });

  const button: LocatorSchemaWithoutPath = { 
      role: "button", 
      locatorMethod: GetByMethod.role
    }

  locators.addSchema("main.button", {
    ...button,
  });

  locators.addSchema("main.button@continue", {
    ...button,
    roleOptions: { name: "Continue" }
  });

  locators.addSchema("main.button@back", {
    ...button,
    roleOptions: { name: "Back" }
  });
}
```

> Use something like `main.button` when you need a broad locator (for example, to count buttons) and `main.button@continue` or `main.button@back` when you need a specific instance.

The portion before `@` usually describes the element type (`section`, `button`), while the part after `@` is a friendly identifier (`playground`, `reset`).  This makes long chains readable while still conveying intent.

> **Note:** There is nothing special about the character `@`, in the eyes of POMWright it's just another character in a word. The only "special" character is `.` dot.

Remember: the goal is not to mirror the DOM structure 1:1. Just enough to ensure a descriptive and unique path to the elements you interact with and validate through the use of simple Locators.

## LocatorSchemaPath, Sub-paths and IntelliSense

Every dot‑delimited segment forms a sub path.  Sub paths power IntelliSense and let you scope updates or filters to a specific part of the chain.

```ts
const resetBtn = await profile
  .getLocatorSchema("body.section@playground.button@reset")
  .addFilter("body.section@playground", { hasText: /Primary Colors/i })
  .getNestedLocator();
```

The TypeScript union of all paths enables autocomplete, prevents typos, and makes refactors simple.  Update a single `LocatorSchema` definition and every test using that path immediately benefits from the change.
