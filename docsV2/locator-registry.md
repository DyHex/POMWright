# Locator registry (v2)

v2 exposes a single registry factory, `createRegistryWithAccessors(page, logger)`, which returns the locator registry instance
**and** the bound helpers (`getLocator`, `getNestedLocator`, `getLocatorSchema`). The factory always requires a
`PlaywrightReportLogger` instance so registry logs stay attached to your desired logger hierarchy.

## BasePageV2 wiring

`BasePageV2` passes a child logger to the factory and threads the accessors onto the page object:

```ts
const { registry, getLocator, getNestedLocator, getLocatorSchema } =
        createRegistryWithAccessors<LocatorSchemaPaths>(
                page,
                this.log.getNewChildLogger("LocatorRegistry"),
        );
```

You still define locators in `defineLocators()` and use `this.getLocator(...)` / `this.getNestedLocator(...)` in page methods
and tests.

## Standalone usage (outside BasePageV2)

Create or reuse a logger, pass it to the factory, and destructure what you need:

```ts
import { PlaywrightReportLogger, createRegistryWithAccessors } from "pomwright";

const log = new PlaywrightReportLogger({ current: "debug", initial: "debug" }, [], "my-test");
const registryLog = log.getNewChildLogger("registry");

const { registry, getLocator, getNestedLocator, getLocatorSchema } =
        createRegistryWithAccessors<"root" | "root.child">(page, registryLog);

registry.add("root").locator("div.root");
registry.add("root.child").locator("div.child");

await getNestedLocator("root.child").filter("root.child", { hasText: "leaf" }).nth("root", 0);
const schemaBuilder = getLocatorSchema("root").nth("root", 1);
await schemaBuilder.getNestedLocator();
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

const locator = await getLocatorSchema("list.item")
  .filter("list", { hasText: "List" })
  .nth("list", 0)
  .filter("list.item", { hasText: "Row" })
  .nth("list.item", 2)
  .getNestedLocator();
```

Filters and indices apply exactly where they are chained, mirroring manual Playwright locator chaining.

## Updating definitions without altering steps

`update(path)` performs a PATCH-style merge of the locator definition only. To change filters or indices, chain `.filter()`,
`.nth()`, or `.clearSteps()` on the query builder instead of passing optional config objects:

```ts
const updated = await getLocatorSchema("body.section.button")
  .filter("body.section.button", { hasText: /Click me!/ })
  .nth("body.section", "first")
  .update("body.section.button")
  .getByRole("button", { name: "Click me!" })
  .getNestedLocator();
```

## Error handling

- Locator path validation happens at compile time via the factory signature; invalid unions surface as type errors when you
  call `createRegistryWithAccessors`.
- Locator path validation happens at run time; invalid unions will throw errors during setup.
