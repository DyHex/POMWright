# Working with Locator Schemas

`getLocatorSchema()` returns a chainable object that lets you refine locator definitions before resolving them to Playwright `Locator`s.  The methods operate on the chain but do not mutate the original `LocatorSchema` definitions.

```ts
const chain = page.getLocatorSchema("topMenu.notifications.dropdown.item");
```

## update

`update(subPath, partial)` modifies properties of any schema in the chain.  Multiple calls can be chained and are applied in order.

```ts
const item = await page
  .getLocatorSchema("topMenu.notifications.dropdown.item")
  .update("topMenu.notifications.dropdown.item", { text: "New" })
  .getNestedLocator();
```

## addFilter

Adds additional filters, equivalent to Playwright's `locator.filter()`. Multiple calls can be chained and are applied in order.

```ts
const resetButton = await page
  .getLocatorSchema("body.section@playground.button@reset")
  .addFilter("body.section@playground", { hasText: /Primary Colors/i })
  .getNestedLocator();
```

## getNestedLocator

Builds a locator by chaining all schemas that make up the LocatorSchemaPath. Optional indices can select specific occurrences. Indices may be numeric (legacy) or keyed by sub path:

```ts
// third item in the dropdown
const third = await page
  .getLocatorSchema("topMenu.notifications.dropdown.item")
  .getNestedLocator({ "topMenu.notifications.dropdown.item": 2 });
```
> Note: numeric indices will be removed in a future update, so use keyed sub-paths instead, as shown in the example above.

## getLocator

Resolves the LocatorSchema the full LocatorSchemaPath references and returns it as a Playwright Locator, alternatively you can think of it as resolving only the last locator of the path without chaining preceding schemas:

```ts
const badge = await page.getLocator("topMenu.notifications.button.countBadge");
```

The chainable API ensures locators remain immutable and encourages small, readable updates close to where they are used.
