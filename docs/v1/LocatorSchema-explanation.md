# LocatorSchema

A `LocatorSchema` describes how to find an element in the DOM. Instead of storing Playwright `Locator` objects directly, POMWright keeps these schema definitions and resolves them only when a test requests the locator. The same schema can be reused across multiple page objects and test files without risking stale references.

Every schema must set `locatorMethod` to one of the `GetByMethod` enum values. The matching selector fields listed below determine which Playwright API call is executed under the hood. You can provide more than one selector field, but the method chosen by `locatorMethod` is the one that will be used when the locator is created.

When you register a schema with `GetLocatorBase.addSchema(path, schemaDetails)` the `locatorSchemaPath` is stored automatically and becomes part of the structured logs produced by POMWright.

## Selector strategies

> Note: You can define both "role" and "locator" on the same LocatorSchema, but which one is used is dictated by "locatorMethod". Too keep things clean I recommend only defining the actual type of Playwright Locator you'll be using.

Each selector strategy maps directly to a Playwright locator helper. The snippets below show the POMWright configuration alongside the equivalent raw Playwright call.

### `role` and `roleOptions`

Use [ARIA roles](https://playwright.dev/docs/api/class-page#page-get-by-role) as your primary selector. The optional `roleOptions` map to the options object accepted by `page.getByRole()`.

```ts
locators.addSchema("content.button@edit", {
  role: "button",
  roleOptions: { name: "Edit" },
  locatorMethod: GetByMethod.role
});
```

Playwright equivalent:

```ts
page.getByRole("button", { name: "Edit" });
```

### `text` and `textOptions`

Match visible text using the same semantics as [`page.getByText()`](https://playwright.dev/docs/api/class-page#page-get-by-text).

```ts
locators.addSchema("content.link.help", {
  text: "Need help?",
  textOptions: { exact: true },
  locatorMethod: GetByMethod.text
});
```

Playwright equivalent:

```ts
page.getByText("Need help?", { exact: true });
```

### `label` and `labelOptions`

Reference form controls by their accessible label. `labelOptions` accepts the same arguments as [`page.getByLabel()`](https://playwright.dev/docs/api/class-page#page-get-by-label).

```ts
locators.addSchema("content.form.password", {
  label: "Password",
  locatorMethod: GetByMethod.label
});
```

Playwright equivalent:

```ts
page.getByLabel("Password");
```

### `placeholder` and `placeholderOptions`

Target elements by placeholder text via [`page.getByPlaceholder()`](https://playwright.dev/docs/api/class-page#page-get-by-placeholder).

```ts
locators.addSchema("content.form.search", {
  placeholder: "Search",
  placeholderOptions: { exact: true },
  locatorMethod: GetByMethod.placeholder
});
```

Playwright equivalent:

```ts
page.getByPlaceholder("Search", { exact: true });
```

### `altText` and `altTextOptions`

Resolve images and other elements with alternative text via [`page.getByAltText()`](https://playwright.dev/docs/api/class-page#page-get-by-alt-text).

```ts
locators.addSchema("content.hero.image", {
  altText: "Company logo",
  locatorMethod: GetByMethod.altText
});
```

Playwright equivalent:

```ts
page.getByAltText("Company logo");
```

### `title` and `titleOptions`

Tap into the [`title` attribute](https://playwright.dev/docs/api/class-page#page-get-by-title) of an element.

```ts
locators.addSchema("content.tooltip.info", {
  title: "More information",
  locatorMethod: GetByMethod.title
});
```

Playwright equivalent:

```ts
page.getByTitle("More information");
```

### `locator` and `locatorOptions`

Fallback to raw selectors or locator chaining with [`page.locator()`](https://playwright.dev/docs/api/class-page#page-locator). `locatorOptions` is passed straight through to the Playwright call.

```ts
locators.addSchema("content.main", {
  locator: "main",
  locatorOptions: { hasText: "Profile" },
  locatorMethod: GetByMethod.locator
});
```

Playwright equivalent:

```ts
page.locator("main", { hasText: "Profile" });
```

### `frameLocator`

Create [`FrameLocator`](https://playwright.dev/docs/api/class-page#page-frame-locator) instances when your DOM interaction starts inside an iframe.

```ts
locators.addSchema("iframe.login", {
  frameLocator: "#auth-frame",
  locatorMethod: GetByMethod.frameLocator
});
```

Playwright equivalent:

```ts
page.frameLocator("#auth-frame");
```

### `testId`

Call [`page.getByTestId()`](https://playwright.dev/docs/api/class-page#page-get-by-test-id) by setting the `testId` field.

```ts
locators.addSchema("content.button.reset", {
  testId: "reset-btn",
  locatorMethod: GetByMethod.testId
});
```

Playwright equivalent:

```ts
page.getByTestId("reset-btn");
```

### `dataCy`

`dataCy` is a POMWright convenience for the legacy `data-cy` attribute used in Cypress-based projects. Under the hood it still calls `page.locator()` with the [`data-cy=` selector engine](https://playwright.dev/docs/extensibility#custom-selector-engines) registered by `BasePage`.

```ts
locators.addSchema("content.card.actions", {
  dataCy: "card-actions",
  locatorMethod: GetByMethod.dataCy
});
```

Playwright equivalent:

```ts
page.locator("data-cy=card-actions");
```

If you prefer to control the selector string yourself you can pass the full expression (`"data-cy=card-actions"`) and it will be used verbatim.

### `id`

`id` is the second POMWright-specific helper. Provide either the raw id string or a `RegExp`. Strings are normalised to CSS id selectors, so `"details"`, `"#details"`, and `"id=details"` all resolve to the same element. A regular expression matches the start of the `id` attribute, allowing you to capture generated identifiers.

```ts
locators.addSchema("content.region.details", {
  id: "profile-details",
  locatorMethod: GetByMethod.id
});

locators.addSchema("content.region.dynamic", {
  id: /^region-/,
  locatorMethod: GetByMethod.id
});
```

Playwright equivalent:

```ts
page.locator("#profile-details");
page.locator('*[id^="region-"]');
```

### `filter`

Any schema can define a `filter` object with the same shape as [`locator.filter()`](https://playwright.dev/docs/api/class-locator#locator-filter). Filters are applied immediately after the initial Playwright locator is created.

```ts
locators.addSchema("content.list.item", {
  role: "listitem",
  locatorMethod: GetByMethod.role,
  filter: { hasText: /Primary Colors/i }
});
```

Playwright equivalent:

```ts
page.getByRole("listitem").filter({ hasText: /Primary Colors/i });
```

## Putting it together

Schemas are typically registered inside `initLocatorSchemas()` of a `BasePage` subclass. The example below demonstrates reusable fragments and multiple selector strategies working together.

```ts
import { GetByMethod, type GetLocatorBase, type LocatorSchemaWithoutPath } from "pomwright";
type LocatorSchemaPath =
  | "main"
  | "main.button"
  | "main.button@continue"
  | "main.button@back";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
  locators.addSchema("main", {
    locator: "main",
    locatorMethod: GetByMethod.locator
  });

  const button: LocatorSchemaWithoutPath = {
    role: "button",
    locatorMethod: GetByMethod.role
  };

  locators.addSchema("main.button", {
    ...button
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

Once registered, the schemas can be consumed through the BasePage helpers documented in [`docs/get-locator-methods-explanation.md`](./get-locator-methods-explanation.md).
