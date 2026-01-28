# Locator registry (v2)

v2 exposes a single registry factory, `createRegistryWithAccessors(page)`, which returns the locator registry instance
**and** the bound helpers (`getLocator`, `getNestedLocator`, `getLocatorSchema`). No logger is required; the registry no
longer emits PlaywrightReportLogger entries when resolving locators.

- **Preferred base class:** Extend `PageObject` for v2 work. Use the deprecated `BasePageV1toV2` bridge only for short-lived
  staged migrations and plan to remove it before 2.0.0.

## PageObject wiring

`PageObject` threads the accessors onto the page object:

```ts
const { registry, add, getLocator, getNestedLocator, getLocatorSchema } =
        createRegistryWithAccessors<LocatorSchemaPaths>(page);
```

You still define locators in `defineLocators()` and use `this.getLocator(...)` / `this.getNestedLocator(...)` in page methods
and tests.

`getLocator(path)` and `getNestedLocator(path)` now return Playwright `Locator` instances synchronously and do **not** accept
override arguments. Use `getLocatorSchema(path)` when you need to patch definitions or add filters/indices to nested chains
through the fluent builder.

> Note: the `registry` returned from the factory exposes only the public surface (`add`, `createReusable`, and the locator
> getters/builders). Internal methods such as `get`, `replace`, `register`, and `unregister` are intentionally omitted from the
> factory return type so end users cannot call them directly.

## Standalone usage (outside PageObject)

Call the factory with your Playwright `page` and destructure what you need:

```ts
import { createRegistryWithAccessors } from "pomwright";

const { registry, add, getLocator, getNestedLocator, getLocatorSchema } =
        createRegistryWithAccessors<"root" | "root.child">(page);

registry.add("root").locator("div.root");
registry.add("root.child").locator("div.child");

const nested = getNestedLocator("root.child");
const schemaBuilder = getLocatorSchema("root").nth("root", 1);
const patchedNested = schemaBuilder.getNestedLocator();
```

## Chaining filters and indices

Record filters and indices by chaining `.filter()` and `.nth()` in call order. This works during registration and when mutating a
schema builder returned by `getLocatorSchema`:

```ts
registry
  .add("list.item")
  .getByRole("listitem", { name: /Row/ })
  .filter({ hasText: "Row" })
  .nth("last");

const locator = getLocatorSchema("list.item")
  .filter("list", { hasText: "List" })
  .nth("list", 0)
  .filter("list.item", { hasText: "Row" })
  .nth("list.item", 2)
  .getNestedLocator();
```

Filters and indices apply exactly where they are chained, mirroring manual Playwright locator chaining.

## Descriptions

Use `.describe()` to attach a Playwright locator description to a registered path. Descriptions apply only to the terminal
path you resolve: `getNestedLocator("a")` will use the description on `a`, while `getNestedLocator("a.b")` ignores `a` and
applies only the description on `a.b`.

```ts
registry.add("list").locator("ul.list").describe("List container");
registry.add("list.item").getByRole("listitem").describe("List item");

const list = getNestedLocator("list");
const item = getNestedLocator("list.item");
// list.description() === "List container"
// item.description() === "List item"
```

You can override the terminal description on a query builder without mutating the registry:

```ts
const locator = getLocatorSchema("list.item")
  .describe("List item (override)")
  .getNestedLocator();
```

## Reusable locators

Build a locator once and reuse it across multiple paths without registering it immediately. The registry exposes
`createReusable` with the same locator-type helpers as `add` (`getByRole`, `getByText`, `locator`, and friends). Once a
locator type is chosen, you may chain `filter` and `nth` any number of times, but no additional locator types can be
set:

```ts
const h2 = registry.createReusable.getByRole("heading", { level: 2 }).filter({ hasText: /Summary/ });
const firstHeading = registry.createReusable.getByRole("heading", { level: 1 }).nth(0);
const sectionWithText = registry.createReusable.locator("section").filter({ hasText: "someText" });
const summaryHeading = registry.createReusable.getByRole("heading", { level: 2 }).describe("Summary heading");
```

Register a path with a reusable locator by passing `{ reuse }` to `add`:

```ts
registry.add("body.section.heading", { reuse: h2 });
registry.add("body.section.firstHeading", { reuse: firstHeading }).filter({ hasText: "Intro" });
```

When `{ reuse }` is provided, locator-type calls behave like PATCH operations: omitted selector/role/text values are inherited
from the reused definition, and provided fields merge with existing options instead of replacing them. Examples:

```ts
const seed = registry.createReusable.getByRole("heading", { level: 2 });

// inherits `role: "heading"` and `level: 2`, only overrides the name
registry.add("heading.summary", { reuse: seed }).getByRole({ name: "Summary" });

// inherits the selector from the seed when only options are provided
registry.add("main.error", { reuse: seed }).locator({ hasText: /invalid password/ });

// overrides selector while merging options
registry
  .add("main.errorOverride", { reuse: seed })
  .locator("other-selector", { hasText: /invalid password/ });

// getByRole patch keeps the seeded discriminant (role) and merges options
const seededRole = registry.createReusable.getByRole("heading", { level: 1 });
registry.add("heading.updated", { reuse: seededRole }).getByRole({ name: "New heading" });

// getByText patch inherits the seeded text when only options are supplied
const seededText = registry.createReusable.getByText(/Hello/);
registry.add("greeting", { reuse: seededText }).getByText({ exact: true });

// locator patch can omit selector, inherit it, or override it explicitly
const seed = registry.createReusable.locator("error-message");
registry.add("main.error", { reuse: seed }).locator({ hasText: /invalid/ }); // inherits selector
registry
  .add("main.errorOverride", { reuse: seed })
  .locator("other-selector", { hasText: /invalid/ }); // overrides selector
```

### Chaining rules when adding locators

- Each `add` call can set **only one** locator-type method (e.g., `getByRole`, `locator`). When `{ reuse }` is provided,
  one matching override is allowed; otherwise, additional locator-type calls throw.
- `filter` and `nth` can be chained any number of times and in any order, including after `{ reuse }`.
- After a locator method is chosen, the builder returns a `filter`/`nth`-only view, so IntelliSense surfaces only those methods
  (plus the single matching override when seeded with `reuse`); other locator methods become compile-time errors.

## Updating definitions without altering steps

`update(path)` performs a PATCH-style merge of the locator definition only. To change filters or indices, chain `.filter()`,
`.nth()`, or `.clearSteps()` on the query builder instead of passing optional config objects. When you omit `subPath` on any of
these chainable methods (`update`, `filter`, `clearSteps`, `nth`, `replace`, `remove`), the terminal path supplied to
`getLocatorSchema` is used automatically:

```ts
const updated = getLocatorSchema("body.section.button")
  .filter({ hasText: /Click me!/ })
  .nth("first")
  .update()
  .getByRole("button", { name: "Click me!" })
  .getNestedLocator();
```

## Replacing or removing definitions without altering registry state

- `replace(subPath)` performs a POST-style overwrite of the definition for the given subpath on the query builder’s cloned data.
- `remove(subPath)` performs a soft delete: it clears the definition/steps/cache for that subpath on the builder clone. Non-terminal removals are skipped during resolution; terminal removals throw unless you repopulate the subpath with `update`/`replace` later in the chain.

Examples:

```ts
getLocatorSchema("section.button")
  .replace("section.button")
  .getByRole("button", { name: "Submit" })
  .getNestedLocator();

const builder = getLocatorSchema("section.button");
builder.remove("section.button");
expect(() => builder.getNestedLocator()).toThrowError('No locator schema registered for path "section.button".');
```

## Error handling

- Locator path validation happens at compile time via the factory signature; invalid unions surface as type errors when you
  call `createRegistryWithAccessors`.
- Locator path validation happens at run time; invalid unions will throw errors during setup.
