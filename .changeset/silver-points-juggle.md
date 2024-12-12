---
"pomwright": minor
---

# LocatorSchema filter property and getLocatorSchema.addFilter method

Changes:

- New `filter` property for `LocatorSchema`
- New `.addFilter()` method for `LocatorSchemaWithMethods`

## New filter property for locatorSchema

The current `LocatorSchema` property `locatorOptions` is actually a `filter`, but it belongs to the `page.locator` method thus it only works for the `locator` property in a `LocatorSchema` object.

The new `filter` property on the other hand is usable for all locator type properties in `LocatorSchema` (locator, role, label, etc.), except for `frameLocator`.

If `filter` is specified on a `LocatorSchema`, it will always be applied and should always be the first filter to be applied/chained to the current locator in the chain of locators (only exception is `locatorOptions`).

Instead of:

```TS
this.locators.addSchema("main.products.radio@junior", {
  locator: "radio",
  locatorOptions: { hasText: "some text"}
  locatorMethod: GetByMethod.locator
});
```

We could use filter:

```TS
this.locators.addSchema("main.products.radio@junior", {
  locator: "input",
  filter: { hasText: "some text"}
  locatorMethod: GetByMethod.locator
});
```

Which as mentioned works for other locator types like role, label, placeholder, altText, title, testid, id, etc., not just locator...:

```TS
this.locators.addSchema("main.products.radio@junior", {
  role: "radio",
  filter: { hasText: "some text"}
  locatorMethod: GetByMethod.role
});
```

Another reason for this change is that a filter and a locator is NOT the same, say we have:

LocatorSchema_A:

```TS
this.locators.addSchema("main.subscription.form.item.section@header", {
  role: "region",
  roleOptions: { name: "Om abonnementet og tilleggstjenester" }
  locatorMethod: GetByMethod.role
});
```

LocatorSchema_B:

```TS
this.locators.addSchema("main.subscription.form.item.section@header", {
  locator: "section",
  filter: { hasText: "Om abonnementet og tilleggstjenester" }
  locatorMethod: GetByMethod.locator
});
```

The locator or nested locator created from LocatorSchema_A will resolve to a `section` in DOM which has the accessibility name "Om abonnementet og tillegstjenester".

While LocatorSchema_B will resolve to a `section` in DOM which contains the text "Om abonnementet og tillegstjenester" somewhere inside the element, possibly in a descendant element, case-insensitively. Note, an HTML `section` without an accessibility name is not an aria region.

But we can also combine them:

```TS
this.locators.addSchema("main.subscription.form.item.section@header", {
  role: "region",
  roleOptions: { name: "Om abonnementet og tillegstjenester" },
  filter: { hasText: "Mobil 2 GB" }
  locatorMethod: GetByMethod.role
});
```

## New .addFilter() method for locatorSchemaWithMethods

```ts
.addFilter(
  "locatorSchemaPath", 
  options { 
    has?: Locator | LocatorSchemaPath,
    hasNot?: Locator | LocatorSchemaPath,
    hasNotText?: string | RegExp,
    hasText?: string | RegExp 
  })
```

Similar to calling/chaining `.update()`/`.updates()` on `.getLocatorSchema(LocatorSchemaPath)` but using the playwright filter method. E.g.:

Instead of:

```TS
const allCheckboxesForFiltersRelatedToBrands = await poc
.getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
  .updates( { 3: { locatorOptions: { hasText: /Produsent/i } } })
  .getNestedLocator();
```

Which currently only works if the LocatorSchema which the whole LocatorSchemaPath resovles to is using the `locator` property, specified in the LocatorSchema by `locatorMethod`, e.g.:

```TS
// before .update
this.locators.addSchema("main.products.searchControls.filterType", {
  locator: ".filterType",
  locatorMethod: GetByMethod.locator
});
```

In most cases it is not, as we only tend to use `locator` for structural DOM elements, and prefer aria based locators for user interactive and/or visible elements, thus updating `locatorOptions` would do nothing for a more likely scenario where the `locatorSchema` uses `role`, or in this case where we're unable to create a unique reliable locator with anything other than a testid:

```TS
this.locators.addSchema("main.products.searchControls.filterType", {
  testid: "filter-type",
  locatorMethod: GetByMethod.testid
});
```

So with .addFilter() we're able to do:

```TS
const allCheckboxesForBrandFilters = await poc
  .getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
  .addFilter("main.products.searchControls.filterType", { hasText: /Produsent/i })
  .getNestedLocator();
```

Note, if one or more of the LocatorSchema we retrieve has the `filter` property defined, the filter in the locatorSchema will be applied first, then the filter(s) we add through the `.addFilter` method will be chained on. Similarly we can chain the `.addFilter` method just like we're able to chain `.update` and `.updates` methods, e.g.:

```TS
const allCheckboxesForBrandFilters = await poc
  .getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
  .addFilter("main.products.searchControls.filterType", { hasText: /Produsent/i, hasNotText: /utgått/i })
  .addFilter("main.products.searchControls.filterType.label", { hasText: "Samsung" })
  .addFilter("main.products.searchControls.filterType.label", { has: poc.page.getByRole("checkbox") })
  .getNestedLocator();
```
