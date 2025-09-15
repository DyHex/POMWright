# LocatorSchema

A `LocatorSchema` describes how to find an element in the DOM.  Instead of storing Playwright `Locator` objects directly, POMWright stores these schemas and generates locators on demand.

## Important properties

Each schema can use one or more selector strategies:

- `role` – [ARIA role](https://playwright.dev/docs/api/class-page#page-get-by-role); recommended primary selector.
- `role` & `roleOptions`
- `text`
- `text` & `textOptions`
- `label`
- `label` & `labelOptions`
- `placeholder`
- `placeholder` & `placeholderOptions`
- `altText`
- `altText` & `altTextOptions`
- `title`
- `title` & `titleOptions`
- `locator` – raw selector or existing `Locator`.
- `locator` & `locatorOptions`
- `frameLocator`
- `testId`
- `dataCy` – legacy support for `data-cy` attributes.
- `id` – string or `RegExp` matching an element id.
- `filter` – equivalent to Playwright's `locator.filter()`.
- `locatorMethod` – (REQUIRED) a value from the `GetByMethod` enum specifying which selector should be used to create the initial locator.

> Note: You can define both "role" and "locator" on the same LocatorSchema, but which one is used is dictated by "locatorMethod". Too keep things clean I recommend only defining the actual type of Playwright Locator you'll be using.

When adding a schema with `GetLocatorBase.addSchema(path, schemaDetails)` the `locatorSchemaPath` is automatically assigned and used for logging and type safety.

## Example

```ts
import { GetByMethod, type GetLocatorBase } from "pomwright";

export type LocatorSchemaPath =
  | "main"
  | "main.form"
  | "main.form.username"
  | "main.form.password"
  | "main.button@login";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
  locators.addSchema("main", {
    locator: "main",
    locatorMethod: GetByMethod.locator
  });

  locators.addSchema("main.form", {
    role: "form",
    locatorMethod: GetByMethod.role
  });

  locators.addSchema("main.form.username", {
    role: "textbox",
    roleOptions: { name: "Username" },
    locatorMethod: GetByMethod.role
  });

  locators.addSchema("main.form.password", {
    role: "textbox",
    roleOptions: { name: "Password" },
    locatorMethod: GetByMethod.role
  });

  locators.addSchema("main.button@login", {
    role: "button",
    roleOptions: { name: "Sign in" },
    locatorMethod: GetByMethod.role
  });
}
```

For reusable pieces you can import and declare `LocatorSchemaWithoutPath` objects and reuse them within the file or across locatorSchema files.
