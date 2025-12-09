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

## Error handling

- Locator path validation happens at compile time via the factory signature; invalid unions surface as type errors when you
  call `createRegistryWithAccessors`.
- Locator path validation happens at run time; invalid unions will throw errors during setup.
