# Locator Registry (v2)

## Overview

The v2 locator registry is a typed, fluent DSL for defining and resolving locators. It provides:

- A **typed path union** for locator schema paths.
- A **fluent builder** for registration (`add(path).getByRole(...).filter(...).nth(...)`).
- **Two resolution modes**:
  - `getLocator(path)` for the terminal segment only.
  - `getNestedLocator(path)` for a fully chained locator.
- A **query builder clone** (`getLocatorSchema`) for filters, indices, and definition updates without mutating the registry.

The registry is available by directly implementing `createRegistryWithAccessors` or extending a class with `PageObject`.

---

## Path format rules

Locator schema paths must:

- Be dot-delimited (e.g. `"main.form.submit"`).
- No leading/trailing dots or consecutive dots (compile-time and runtime validation).
- No whitespace characters (compile-time and runtime validation).

```ts
type Paths =
  | "main"
  | "main.form@login"
  | "main.form@login.input@username"
  | "main.form@login.input@password"
  | "main.button@login";
```

---

## Creating a registry

### `createRegistryWithAccessors`

`createRegistryWithAccessors` binds helpers to a Playwright `Page` and returns both the registry and convenient accessors. The most practical usage is inside a page object class or a custom fixture so the same registry wiring is reused across tests.

#### **Example implementation:**

```ts
import { test as base, expect, type Page } from "@playwright/test";
import {
  createRegistryWithAccessors,
  type AddAccessor,
  type GetLocatorAccessor,
  type GetLocatorSchemaAccessor,
  type GetNestedLocatorAccessor,
  type LocatorRegistry,
  step,
} from "pomwright";
import type { User } from "testData";

type Paths =
  | "common.spinner"
  | "main"
  | "main.button@login"
  | "main.form@login"
  | "main.form@login.input@username"
  | "main.form@login.input@password";

class LoginRegistry {
  public readonly page: Page;
  public readonly urlPath = "/login";
  public readonly locatorRegistry: LocatorRegistry<Paths>;
  public readonly add: AddAccessor<Paths>;
  public readonly getLocator: GetLocatorAccessor<Paths>;
  public readonly getLocatorSchema: GetLocatorSchemaAccessor<Paths>;
  public readonly getNestedLocator: GetNestedLocatorAccessor<Paths>;

  constructor(page: Page) {
    this.page = page;
    const { registry, add, getLocator, getNestedLocator, getLocatorSchema } =
      createRegistryWithAccessors<Paths>(page);

    this.locatorRegistry = registry;
    this.add = add;
    this.getLocator = getLocator;
    this.getNestedLocator = getNestedLocator;
    this.getLocatorSchema = getLocatorSchema;

    this.defineLocators();
  }

  private defineLocators() {
    this.add("common.spinner").getByTestId("loading-spinner");
    this.add("main").locator("main");
    this.add("main.form@login").getByRole("form", { name: "Login" });
    this.add("main.form@login.input@username").getByLabel("Username");
    this.add("main.form@login.input@password").getByLabel("Password");
    this.add("main.button@login").getByRole("button", { name: "Login" });
  }

  @step()
  async loginAsUser(user: User) {
    await this.getNestedLocator("main.form@login.input@username").fill(user.username);
    await this.getNestedLocator("main.form@login.input@password").fill(user.password);
    await this.getNestedLocator("main.button@login").click();
  }

  @step()
  async gotoThisPage() {
    await this.page.goto(this.urlPath);
    await expect(this.getLocator("common.spinner")).toHaveCount(0);
    await this.getNestedLocator("main.form@login").waitFor({ state: "visible" });
  }
}

type Fixtures = { loginRegistry: LoginRegistry };

export const test = base.extend<Fixtures>({
  loginRegistry: async ({ page }, use) => {
    await use(new LoginRegistry(page));
  },
});
```

#### **Usage in a test:**

```ts
import { test } from "./fixtures";

test("login flow", async ({ loginRegistry, testData }) => {
  await loginRegistry.gotoThisPage();
  await loginRegistry.loginAsUser(testData.user.alice);
});
```

### Using the registry inside a PageObject

`PageObject` wraps the same API under `this.add`, `this.getLocator`, `this.getNestedLocator`, and `this.getLocatorSchema`.

---

## Registering locators (`add`)

Each `add(path)` call registers a **single locator strategy** and any number of ordered steps (`filter`, `nth`, `describe`).

```ts
add("main").locator("main");
add("main.button@login").getByRole("button", { name: "Login" });
add("main.form@login").getByRole("form", { name: "Login" });
add("main.form@login.input@username").getByLabel("Username");
add("main.form@login.input@password").getByLabel("Password");
add("main.list").locator("ul.list").filter({ hasText: "List" }).nth(0);
add("main.list.item").getByRole("listitem", { name: /Row/ }).filter({ hasText: "Row" }).nth("last");
add("main.frame@login").frameLocator("iframe#login");
add("main.link@forgot").getByText("Forgot password?");
add("main.banner@error").getById("error-banner");
```

### Locator strategies

The registry supports the following strategies (matching Playwright semantics):

- `getByRole(role, options?)`
- `getByText(text, options?)`
- `getByLabel(text, options?)`
- `getByPlaceholder(text, options?)`
- `getByAltText(text, options?)`
- `getByTitle(text, options?)`
- `locator(selector, options?)`
- `frameLocator(selector)`
- `getByTestId(testId)`
- `getById(id)` (custom)

#### `getById` normalization

String `id` inputs are normalized:

- `"#login"` → `"login"`
- `"id=login"` → `"login"`

`RegExp` ids are converted to an attribute selector containing the pattern:

```ts
add("panel").getById(/panel-/);
```

See [overview.md](docs/v2/overview.md) for further details.

---

## `filter`, `nth`, and `describe`

### `filter`

`filter` records Playwright-style filters and can reference:

- A `Locator`
- A registry path
- A locator strategy definition

```ts
add("main.banner@warning")
  .locator(".banner")
  .filter({ hasText: /Warning/i });

add("main.banner@warning")
  .locator(".banner")
  .filter({ has: "main.icon@warning" });
```

### `nth`

`nth` records indices or `"first"` / `"last"` selectors. These are applied in the order they are chained.

```ts
add("main.list.item")
  .getByRole("listitem")
  .nth(0)
  .nth("last");
```

### `describe`

`describe` sets a Playwright locator description on the terminal locator. The description applies only to the final locator, not to intermediate segments.

```ts
add("main.button@login")
  .getByRole("button", { name: "Login" })
  .describe("Login submit button");
```

---

## Resolving locators

### `getLocator(path)`

Resolves **only** the terminal locator for a path.

```ts
const terminal = registry.getLocator("main.form@login.input@username");
// -> getByLabel("Username")
```

### `getNestedLocator(path)`

Resolves the full chain for a path.

```ts
const chained = registry.getNestedLocator("main.form@login.input@username");
// -> locator("main").getByRole("form", { name: "Login" }).getByLabel("Username")
```

### Frame locator behavior

If a terminal segment is a `frameLocator`, the registry returns the **owner locator** (the iframe element), not the frame target. If you need to query inside the frame, register a child path after the frame segment.

```ts
add("main.frame@login").frameLocator("iframe#login");
add("main.frame@login.input@username").getByLabel("Username");

const frameOwner = registry.getNestedLocator("main.frame@login");
const insideFrame = registry.getNestedLocator("main.frame@login.input@username");
```

---

## `getLocatorSchema` (query builder clone)

`getLocatorSchema(path)` returns a **mutable clone** of the registry chain for the path. Changes never mutate the registry; they only affect the builder instance.

```ts
const builder = registry.getLocatorSchema("main.form@login.input@username");

const updated = builder
  .update("main.form@login.input@username")
  .getByLabel("Username", { exact: true })
  .filter("main.form@login.input@username", { hasText: /User/i })
  .nth("main.form@login.input@username", 0)
  .getNestedLocator();
```

### Supported builder operations

- `filter(subPath?, filter)`
- `nth(subPath?, index)`
- `clearSteps(subPath?)`
- `describe(description)` (terminal only)
- `update(subPath?)` – PATCH-style update
- `replace(subPath?)` – POST-style replace
- `remove(subPath?)` – soft-delete for this builder only
- `getLocator()` / `getNestedLocator()`

#### `update` vs `replace`

`update` merges with the current definition; `replace` overwrites the definition at that segment.

```ts
const patched = registry
  .getLocatorSchema("main.button@login")
  .update()
  .getByRole({ name: "Sign in" })
  .getNestedLocator();

const replaced = registry
  .getLocatorSchema("main.button@login")
  .replace()
  .locator("button.primary", { hasText: "Sign in" })
  .getNestedLocator();
```

#### `remove`

`remove` deletes a segment on the builder clone only. Removing a terminal segment requires you to `update` or `replace` before resolving.

```ts
const removedAncestor = registry
  .getLocatorSchema("main.form@login.input@username")
  .remove("main")
  .getNestedLocator();
```

---

## Reusable locators (`createReusable`)

Reusable locators let you seed a locator definition and steps without registering them. You can then reuse the seed across paths, optionally providing a **single matching override**.

```ts
const h1 = registry.createReusable.getByRole("heading", { level: 1 });

registry.add("heading", { reuse: h1 });
registry.add("heading@summary", { reuse: h1 }).getByRole({ name: "Summary" });
```

### Reuse by path

If you want to copy an existing path **as-is**, pass the path to `{ reuse }`:

```ts
registry.add("errors.invalidPassword").getByText("Invalid password");
registry.add("main.form@login.error@invalidPassword", { reuse: "errors.invalidPassword" });
```

---

## Common patterns

### Shared registry in a fixture

```ts
import { test as base } from "@playwright/test";
import { createRegistryWithAccessors } from "pomwright";

export const test = base.extend<{ locators: ReturnType<typeof createRegistryWithAccessors<Paths>> }>({
  locators: async ({ page }, use) => {
    const registry = createRegistryWithAccessors<Paths>(page);
    registry.add("main").locator("main");
    registry.add("main.button@login").getByRole("button", { name: "Login" });
    await use(registry);
  },
});
```

### Filters with locator references

```ts
const form = registry.getNestedLocator("main.form@login");

registry
  .add("main.form@login.section@account")
  .locator("section.account")
  .filter({ has: form });
```

---

## Key differences vs v1

- Paths are validated at compile time and runtime (no whitespace).
- `add` is fluent and only accepts one locator strategy per path.
- `getLocator` / `getNestedLocator` return `Locator` synchronously and are not `await`-able.
- `getLocatorSchema` is a mutable clone and supports `update`, `replace`, `remove`, `filter`, `nth`, and `clearSteps`.
- v1 `addFilter` and index maps are replaced by `filter` and `nth` on the builder.

For migration guidance and detailed comparisons, see `docs/v1-to-v2-migration`.
