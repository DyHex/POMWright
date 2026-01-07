# POMWright v2 quick start and migration overview

## Default path: PageObject

`PageObject` is the preferred base class. Define locators in `defineLocators` and use the v2 accessors:

```ts
import { PageObject } from "pomwright";

export class LoginPage extends PageObject<"main" | "main.button@login"> {
  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.button@login").getByRole("button", { name: "Login" });
  }
}
```

Recommended checklist for one-step migrations:

- Import `PageObject` and drop v1 base classes.
- Move locator definitions into `defineLocators` with `add(...)`.
- The update syntax of methods `getLocator`, `getNestedLocator`, and `getLocatorSchema` in code.
- Delete any `initLocatorSchemas` blocks.

## Bridge option (short-lived)

`BasePageV1toV2` still accepts v1 `addSchema` definitions via `initLocatorSchemas`, translating them into the v2 registry while
exposing only the v2 accessors. It is marked deprecated and will be removed in 2.0.0.

Use the bridge only when you need staged migration across layered base classes. Prefer switching directly to `PageObject` when
feasible to surface remaining v1 syntax quickly.

### Bridge cautions

- Translator warnings flag v1 schemas that cannot be migrated (e.g., `locator` fields that are already `Locator` instances or
  missing required fields). Rewrite these paths in `defineLocators`.
- Constructing `BasePageV1toV2` or invoking `initLocatorSchemas` logs deprecation warnings; plan to remove them before 2.0.0.
