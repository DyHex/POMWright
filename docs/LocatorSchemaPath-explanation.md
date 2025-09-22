# LocatorSchemaPath

A `LocatorSchemaPath` is a string used as the unique key for a `LocatorSchema` which POMWright creates a Playwright Locator from.

## Format, rules & nuances

A `LocatorSchemaPath` must be a string or a union of strings.

```ts
type LocatorSchemaPath = "main";
```

Each word or segment of a string are separated by `.` (dot), where each dot represents a new element in the chain. Thus we end up with paths describing the hierarchy of elements on a page through dot notation.

```ts
type LocatorSchemaPath = 
  | "main"
  | "main.heading";
```

A path must start and end with a "word", a word is any combination of characters except `.` (dot). The following paths will throw during runtime:

```ts
type LocatorSchemaPath = 
  | ""              // Empty string throws 
  | ".main"         // Starting with a dot throws           
  | "main."         // Ending with a dot throws
  | "main..heading" // Consecutive dots throws
```

Paths must be unique within its scope, or POMWright will throw a run-time error when Playwright initializes the fixtures (POCs) for the test. In other words, POMWright will make sure to fail your test before it begins so you can fix the mistake.

```ts
type LocatorSchemaPath = 
  | "main"
  | "main.heading"  // Gets added to the POC's Locator Map
  | "main.heading"; // Already exists in the Map, thus POMWright will throw
```

Especially useful when we import and reuse LocatorSchemaPaths and LocatorSchema between POCs.

```ts
import { GetByMethod, type GetLocatorBase } from "pomwright";
import { type LocatorSchemaPath as common, initLocatorSchemas as initCommon } from "../page-components/common.locatorSchema";

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
```

As briefly mentioned, LocatorSchemaPath strings are used as Keys in a Map of LocatorSchema. Thus the last rule is:

Each LocatorSchemaPath string must be referenced by a addSchema call in the initLocatorSchemas function. POMwright will throw a "not implemented" run-time error for the LocatorSchemaPath if you forget.

A practical nuance is that a LocatorSchemaPath string can have "words" or sub-paths that doesn't reference any actual LocatorSchema.

```ts
type LocatorSchemaPath = 
  | "main"
  | "main.button.continue";  // "button" is here used for human context

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

The word "button" just tells us (the tester/developer) that "continue" is a button, which is perfecly valid, POMWright will see that there exists no key in the map for "main.button" when building a nested/chained Locator from the path "main.button.continue" and will just skip it, thus chaining the Locators created from the sub-path "main" and "main.button.continue" when creating the nested Locator.

Another way to do this is by not using a whole word, and instead use `@` to make the paths more human-readable.

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

  const button: LocatorSchemaWithoutPath = { role: "button", locatorMethod: GetByMethod.role}

  locators.addSchema("main.button", {
    ...button,
  });

  locators.addSchema("main.button@continue", {
    ...button,
    roleOptions: { name: "Continue" },
  });

  locators.addSchema("main.button@back", {
    ...button,
    roleOptions: { name: "Back" },
  });
}
```

> We can use `main.button` to count all buttons, and `main.button@continue` to interact with the continue button etc.

The portion before `@` usually describes the element type (`section`, `button`), while the part after `@` is a friendly identifier (`playground`, `reset`).  This makes long chains readable while still conveying intent.

> **Note:** We do not aim to map the DOM structure of elements 1:1 through LocatorSchemaPath's. This would result in very long paths... We just map the relevant elements and enough of them to ensure unique paths through elements we want to validate and interact with in our tests. Thus we get some free validation of DOM structure, elements are where we expect them to be and we can create and maintain a "library" of quite simple Locators to produce unique and reliable selectors for our tests through POMWright's automatic chaining.

## Sub paths & intellisense/autocomplete

Every dot‑delimited segment forms a sub path. POMWright uses these to scope updates and filters or to select specific `nth` occurrences for any Locator which makes up the chain.

```ts
await profile
  .getLocatorSchema("body.section@playground.button@reset") // auto-complete for all LocatorSchemaPath's
  .addFilter("body.section@playground", { hasText: /Primary Colors/i }) // auto-complete for all valid sub-paths of the LocatorSchemaPath referenced in the getLocatorSchema call
  .getNestedLocator();
```

The TypeScript union of all `LocatorSchemaPath` strings gives you auto‑complete and prevents typos during compilation. Making the LocatorSchemaPath's searchable, need to click a specific button but don't remember the path? Write "button" and get an intellisense list of all paths containing the letters "button" etc.

Did an element change? Update the LocatorSchema definition, keep using the same LocatorSchemaPath. All tests using said LocatorSchemaPath will now work again.

Need to change a path because the DOM structure changed? Rename the LocatorSchemaPath string, and it will automatically be updated in the addSchema call and in any test or POC referencing it (might depend on your VSCode settings). Or alternatively search and replace.

Either way, it's a lot less work compared to dealing with hardcoded and duplication of said locators in every test. Making maintanence pretty easy.
