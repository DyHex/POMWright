# Locator Registration: defineLocators and the v2 add() DSL

## Overview

v2 locator registration uses a fluent builder API inside `defineLocators()`. The `add(path)` method returns a builder with Playwright-matching method names. No `GetByMethod` enum or schema objects are needed.

## File structure

v2 separates path types and registration into a companion `.locatorSchema.ts` file:

```ts
// myPage.locatorSchema.ts
import type { LocatorRegistry } from "pomwright";

export type Paths =
  | "main"
  | "main.form"
  | "main.form.input@username"
  | "main.form.button@submit";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").locator("main");
  registry.add("main.form").locator("form.login");
  registry.add("main.form.input@username").getByLabel("Username");
  registry.add("main.form.button@submit").getByRole("button", { name: "Submit" });
}
```

```ts
// myPage.page.ts
import { defineLocators, type Paths } from "./myPage.locatorSchema";

export default class MyPage extends PageObject<Paths> {
  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }
}
```

This pattern separates concerns (types/registration vs class behavior) and allows locator definitions to be shared across page objects.

## GetByMethod mapping

| v1 `locatorMethod` | v1 schema field | v1 options field | v2 method | v2 arguments |
|---|---|---|---|---|
| `GetByMethod.role` | `role` | `roleOptions` | `getByRole(role, options?)` | role value, roleOptions as second arg |
| `GetByMethod.text` | `text` | `textOptions` | `getByText(text, options?)` | text value, textOptions as second arg |
| `GetByMethod.label` | `label` | `labelOptions` | `getByLabel(text, options?)` | label value, labelOptions as second arg |
| `GetByMethod.placeholder` | `placeholder` | `placeholderOptions` | `getByPlaceholder(text, options?)` | placeholder value, placeholderOptions |
| `GetByMethod.altText` | `altText` | `altTextOptions` | `getByAltText(text, options?)` | altText value, altTextOptions |
| `GetByMethod.title` | `title` | `titleOptions` | `getByTitle(text, options?)` | title value, titleOptions |
| `GetByMethod.locator` | `locator` (string) | `locatorOptions` | `locator(selector, options?)` | locator string, locatorOptions |
| `GetByMethod.frameLocator` | `frameLocator` | - | `frameLocator(selector)` | frameLocator string |
| `GetByMethod.testId` | `testId` | - | `getByTestId(testId)` | testId value |
| `GetByMethod.id` | `id` | - | `getById(id)` | id string or RegExp |
| `GetByMethod.dataCy` | `dataCy` | - | `locator('[data-cy="value"]')` | CSS attribute selector string |

## Translation examples

### Role

```ts
// v1
this.locators.addSchema("main.button@login", {
  role: "button",
  roleOptions: { name: "Login" },
  locatorMethod: GetByMethod.role,
});

// v2
this.add("main.button@login").getByRole("button", { name: "Login" });
```

### Locator (CSS/XPath)

```ts
// v1
this.locators.addSchema("main", {
  locator: "main",
  locatorMethod: GetByMethod.locator,
});

// v2
this.add("main").locator("main");
```

### Locator with options

```ts
// v1
this.locators.addSchema("body.section@playground", {
  locator: "section",
  locatorOptions: { hasText: /Playground/i },
  locatorMethod: GetByMethod.locator,
});

// v2
this.add("body.section@playground").locator("section", { hasText: /Playground/i });
```

### Label

```ts
// v1
this.locators.addSchema("main.form.input@username", {
  label: "Username",
  locatorMethod: GetByMethod.label,
});

// v2
this.add("main.form.input@username").getByLabel("Username");
```

### Text

```ts
// v1
this.locators.addSchema("main.heading", {
  text: "Welcome",
  textOptions: { exact: true },
  locatorMethod: GetByMethod.text,
});

// v2
this.add("main.heading").getByText("Welcome", { exact: true });
```

### Placeholder

```ts
// v1
this.locators.addSchema("main.form.input@search", {
  placeholder: "Search...",
  locatorMethod: GetByMethod.placeholder,
});

// v2
this.add("main.form.input@search").getByPlaceholder("Search...");
```

### Title

```ts
// v1
this.locators.addSchema("topMenu.news", {
  title: "News",
  locatorMethod: GetByMethod.title,
});

// v2
this.add("topMenu.news").getByTitle("News");
```

### TestId

```ts
// v1
this.locators.addSchema("main.toggle", {
  testId: "toggle-a",
  locatorMethod: GetByMethod.testId,
});

// v2
this.add("main.toggle").getByTestId("toggle-a");
```

### FrameLocator

```ts
// v1
this.locators.addSchema("main.frame@login", {
  frameLocator: "#auth",
  locatorMethod: GetByMethod.frameLocator,
});

// v2
this.add("main.frame@login").frameLocator("#auth");
```

Terminal frameLocator paths in v2 resolve to `frameLocator.owner()` (the iframe element), not the frame itself. Non-terminal frames scope into the frame for subsequent segments. This is a behavioral change from v1.

### getById

```ts
// v1
this.locators.addSchema("main.modal@close", {
  id: "close-modal",
  locatorMethod: GetByMethod.id,
});

// v2
this.add("main.modal@close").getById("close-modal");
```

Note: v1 regex IDs use prefix match `*[id^="pattern"]`; v2 regex IDs use substring match `[id*="pattern"]` with CSS escaping. Results may differ for edge cases.

### dataCy (removed in v2)

```ts
// v1
this.locators.addSchema("main.widget", {
  dataCy: "my-widget",
  locatorMethod: GetByMethod.dataCy,
});

// v2 (translate to CSS attribute selector)
this.add("main.widget").locator('[data-cy="my-widget"]');
```

v2 does not include a built-in `data-cy` selector engine. Use `locator()` with a CSS attribute selector, or register a custom Playwright selector engine in your test fixtures.

## Filter translation

v1 `filter` property on schema -> v2 chained `.filter()` call:

```ts
// v1
this.locators.addSchema("body.section@playground", {
  locator: "section",
  locatorMethod: GetByMethod.locator,
  filter: { hasText: /Playground/i },
});

// v2
this.add("body.section@playground").locator("section").filter({ hasText: /Playground/i });

// OR, if the filter only has hasText/hasNotText, use locator options instead:
this.add("body.section@playground").locator("section", { hasText: /Playground/i });
```

v2 `filter` accepts `has`/`hasNot` as **registry path strings or Playwright Locator instances**. Path strings are often preferred for registry-native references:

```ts
// v2 filter with has/hasNot as path references
this.add("main.card").locator(".card").filter({
  has: "main.card.badge",      // path string, not Locator
  hasText: "Active",
});
```

## Registration with filter + nth at definition time

```ts
// v2 supports chaining filter and nth on add():
this.add("one.two").locator("div.two").filter({ hasText: "two" }).nth(0);
```

This registers the locator with a filter step and an nth step baked into the schema.

## Reusable locator patterns

### v1: LocatorSchemaWithoutPath + spread

```ts
const buttonSchema: LocatorSchemaWithoutPath = {
  role: "button",
  locatorMethod: GetByMethod.role,
};

this.locators.addSchema("main.button@submit", { ...buttonSchema, roleOptions: { name: "Submit" } });
this.locators.addSchema("main.button@cancel", { ...buttonSchema, roleOptions: { name: "Cancel" } });
```

### v2: createReusable

```ts
// createReusable is available on the LocatorRegistry
const button = this.locatorRegistry.createReusable.getByRole("button");

// Reuse with PATCH-style override (only provide options to merge)
this.add("main.button@submit", { reuse: button }).getByRole({ name: "Submit" });
this.add("main.button@cancel", { reuse: button }).getByRole({ name: "Cancel" });
```

### v2: reuse by path reference

```ts
// Register the first path normally
this.add("main.button@submit").getByRole("button", { name: "Submit" });

// Clone its definition to another path (exact clone, no override chaining)
this.add("main.button@cancel", { reuse: "main.button@submit" });
```

`add(path, { reuse: "existing.path" })` clones the existing schema and returns `void`, so it cannot be chained with additional overrides.

### v2: createReusable with steps

```ts
const activeItem = this.locatorRegistry.createReusable
  .locator(".item")
  .filter({ hasText: "Active" });

this.add("main.list.item@active", { reuse: activeItem });
```

## Programmatic registration with loops

v2 supports template literal types and programmatic registration for DRY code:

```ts
const tableVariants = ["body.table", "body.table@hexCode"] as const;

type TableVariants = (typeof tableVariants)[number];
type TableChildren = "row" | "row.rowheader" | "row.cell";

export type Paths = "body" | "body.heading" | TableVariants | `${TableVariants}.${TableChildren}`;

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("body").locator("body");
  registry.add("body.heading").getByRole("heading", { name: "Your Random Color is:" });

  for (const variant of tableVariants) {
    registry.add(variant).getByRole("table");
    registry.add(`${variant}.row`).getByRole("row");
    registry.add(`${variant}.row.rowheader`).getByRole("rowheader");
    registry.add(`${variant}.row.cell`).getByRole("cell");
  }
}
```

## Path validation rules

v2 enforces stricter path validation than v1:

| Rule | v1 | v2 |
|---|---|---|
| Leading/trailing dots | Allowed | Rejected |
| Whitespace in paths | Allowed | Rejected |
| Empty path segments (`a..b`) | Allowed | Rejected |
| Duplicate registration | Overwrites silently | Throws error |
| Missing parent path | Allowed | Registration does not require parent-first order; chain semantics depend on registered segments |

Parent-first registration is recommended for readability and predictable chain behavior: `"main"` before `"main.form"` before `"main.form.input"`.

## describe() at registration time

```ts
this.add("main.button@submit")
  .getByRole("button", { name: "Submit" })
  .describe("The main submit button in the login form");
```

Adds a descriptive label to the locator (uses Playwright's `locator.describe()`).
