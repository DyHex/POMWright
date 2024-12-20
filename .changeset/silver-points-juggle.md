---
"pomwright": minor
---

# LocatorSchema Enhancements: `filter` Property, `.addFilter()`, Updated `.update()`, and Enhanced `getNestedLocator()`

## Overview

This release introduces several key enhancements to the POMWright. These improvements aim to provide greater flexibility, maintainability, and type safety when constructing and managing locators in your Page Object Models (POMs). The main updates include:

- **New `filter` Property**: Extends filtering capabilities beyond the `locator` method.
- **New `.addFilter()` Method**: Facilitates dynamic addition of filters to locators.
- **Updated `.update()` Method**: Replaces deprecated `.update` and `.updates` methods with a more intuitive interface (none-breaking).
- **Enhanced `getNestedLocator()` Method**: Shifts from index-based to subPath-based indexing for better readability and maintainability.
- **Export of `LocatorSchemaWithoutPath`**: Enables partial or full reuse of locator schemas across different contexts.

## Changes

### 1. New `filter` Property for `LocatorSchema`

#### Purpose

The existing `locatorOptions` property in `LocatorSchema` is specific to the `locator` method, limiting its applicability. The newly introduced `filter` property extends filtering capabilities to all locator types (e.g., `role`, `label`, `placeholder`, `testid`, `id`, etc.), excluding `frameLocator`.

#### Behavior

- **Global Applicability**: Unlike `locatorOptions`, the `filter` property can be applied to various locator methods, enhancing versatility.
- **Priority Application**: When a `filter` is defined, it is always applied and will always be the first filter applied to the locator created from that LocatorSchema, the only exception is `locatorOptions` used with `locator`. This ensures consistent and prioritized filtering across different locator types.

#### Usage Examples

**Before: Using `locatorOptions` (Limited to `locator` method)**
```typescript
this.locators.addSchema("main.products.radio@junior", {
  locator: "radio",
  locatorOptions: { hasText: "some text" },
  locatorMethod: GetByMethod.locator
});
```

**After: Using `filter` (Applicable to Multiple Locator Methods)**
```typescript
this.locators.addSchema("main.products.radio@junior", {
  locator: "input",
  filter: { hasText: "some text" },
  locatorMethod: GetByMethod.locator
});
```

**With `role` Locator Method:**
```typescript
this.locators.addSchema("main.products.radio@junior", {
  role: "radio",
  filter: { hasText: "some text" },
  locatorMethod: GetByMethod.role
});
```

**Combined Example:**
```typescript
this.locators.addSchema("main.subscription.form.item.section@header", {
  role: "region",
  roleOptions: { name: "Subscription Details" },
  filter: { hasText: "Mobile 2 GB" },
  locatorMethod: GetByMethod.role
});
```

#### Benefits

- **Enhanced Flexibility**: Apply default filters to various LocatorSchema.
- **Improved Locator Precision**: Chain multiple filters to narrow down locators based on complex criteria.
- **Backward Compatibility**: Existing `locatorOptions` works the same way as before, ensuring no disruption to current implementations.

### 2. New `.addFilter()` Method for `.getLocatorSchema()`

#### Purpose

The `.addFilter()` method allows dynamic addition of filters to any part of the locator chain, enhancing flexibility in locator construction without modifying the original `LocatorSchema` at any point in a test.

#### Method Signature
```typescript
.addFilter(
  subPath: SubPaths<LocatorSchemaPathType, LocatorSubstring>,
  filterData: FilterEntry
): LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>
```

#### Parameters

- `subPath`: A valid sub-path within the `LocatorSchemaPath` argument to .getLocatorSchema().
- `filterData`: An object defining the filter criteria, which can include:
  - `has?: Locator`
  - `hasNot?: Locator`
  - `hasText?: string | RegExp`
  - `hasNotText?: string | RegExp`

#### Usage Examples

**Adding Filters to Specific Sub-Paths:**
```typescript
const allCheckboxesForBrandFilters = await poc
  .getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
  .addFilter("main.products.searchControls.filterType", { hasText: /Producer/i })
  .getNestedLocator();
```

**Chaining Multiple Filters:**
```typescript
const refinedCheckboxes = await poc
  .getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
  .addFilter("main.products.searchControls.filterType", { hasText: /Producer/i, hasNotText: /discontinued/i })
  .addFilter("main.products.searchControls.filterType.label", { hasText: "Samsung" })
  .addFilter("main.products.searchControls.filterType.label", { has: poc.page.getByRole("checkbox") })
  .getNestedLocator();
```

**Combining `filter` Property and `.addFilter()`:**
```typescript
this.locators.addSchema("main.subscription.form.item.section@header", {
  role: "region",
  roleOptions: { name: "Subscription Details" },
  filter: { hasText: "Mobile 2 GB" },
  locatorMethod: GetByMethod.role
});

const specificSection = await poc
  .getLocatorSchema("main.subscription.form.item.section@header")
  .addFilter("main.subscription.form.item.section@header", { hasText: "Additional Services" })
  .getNestedLocator();
```

#### Benefits

- **Dynamic Filtering**: Add or modify filters on-the-fly without altering the original schema definitions.
- **Chainability**: Easily chain multiple `.addFilter()` calls to build complex locator chains.
- **Error Handling**: Attempts to add filters to invalid sub-paths will throw descriptive errors (compile & run-time), ensuring only valid paths are modified.

### 3. Updated `.update()` Method

#### Purpose

The existing `.update` and `.updates` methods are deprecated and will be removed in version 2.0.0. `.update` could only update the last LocatorSchema in the chain and `.updates` relied on index-based updates, which posed maintainability challenges, especially when renaming `LocatorSchemaPath` strings. The new `.update` method leverages valid `subPaths` of `LocatorSchemaPath` instead of indices, enhancing readability and reducing manual maintenance.

#### New Method Signature
```typescript
.update(
  subPath: SubPaths<LocatorSchemaPathType, LocatorSubstring>,
  modifiedSchema: Partial<LocatorSchemaWithoutPath>
): LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>
```

#### Deprecation of Old Methods

- **Old `.update(updates: Partial<LocatorSchemaWithoutPath>): LocatorSchemaWithMethods`**
- **Old `.updates(indexedUpdates: { [index: number]: Partial<LocatorSchemaWithoutPath> | null }): LocatorSchemaWithMethods`**

These methods are marked as deprecated and will be removed in version 2.0.0.

#### Usage Examples

**Case A: Update the Last `LocatorSchema` in the Chain**
```typescript
const editBtn = await profile
  .getLocatorSchema("content.region.details.button.edit")
  .update("content.region.details.button.edit", { 
    roleOptions: { name: "new accessibility name" }
  })
  .getNestedLocator();
```

**Case B: Update a `LocatorSchema` Earlier in the Chain**
```typescript
const editBtn = await profile
  .getLocatorSchema("content.region.details.button.edit")
  .update("content.region.details", { 
    roleOptions: { name: "new accessibility name" }
  })
  .getNestedLocator();
```

**Case C: Update Multiple `LocatorSchema` in the Chain**
```typescript
const editBtn = await profile
  .getLocatorSchema("content.region.details.button.edit")
  .update("content", { roleOptions: { name: "new accessibility name" } })
  .update("content.region", { roleOptions: { name: "new accessibility name" } })
  .update("content.region.details", { roleOptions: { name: "new accessibility name" } })
  .update("content.region.details.button", { roleOptions: { name: "new accessibility name" } })
  .update("content.region.details.button.edit", { roleOptions: { name: "new accessibility name" } })
  .getNestedLocator();
```

#### Benefits

- **Enhanced Readability**: Using `LocatorSchemaPath` strings makes the code more intuitive and easier to understand.
- **Reduced Maintenance**: Eliminates the need to manage index-based references, especially when `LocatorSchemaPath` strings are renamed or restructured.
- **Type Safety**: Leverages TypeScript's type system to ensure only valid `subPath` strings are used, enhancing developer experience with accurate Intellisense suggestions.

### 4. Enhanced `getNestedLocator()` Method

#### Purpose

The `getNestedLocator()` method has been updated to utilize valid `subPath`'s of `LocatorSchemaPath` instead of numeric indices when specifying `.nth(n)` occurrences within a locator chain. The old index-based method is deprecated and will be removed in version 2.0.0.

#### New Method Signature
```typescript
getNestedLocator(
  subPathIndices?: { [K in SubPaths<LocatorSchemaPathType, LocatorSubstring>]: number | null }
): Promise<Locator>
```

#### Deprecation of Old Method

- **Old `getNestedLocator(indices?: { [key: number]: number | null }): Promise<Locator>`**

This method is marked as deprecated and will be removed in version 2.0.0.

#### Usage Examples

**Old Usage (Deprecated):**
```typescript
const saveBtn = await profile.getNestedLocator("content.region.details.button.save", { 4: 2 });

const editBtn = await profile.getLocatorSchema("content.region.details.button.edit")
  .getNestedLocator({ 2: index });
```

**New Usage:**
```typescript
const saveBtn = await profile.getNestedLocator("content.region.details.button.save", {
  "content.region.details.button.save": 2 
});

const editBtn = await profile.getLocatorSchema("content.region.details.button.edit")
  .getNestedLocator({ "content.region.details": index });
```

#### Benefits

- **Improved Readability**: SubPath-based indexing is more intuitive and aligns with the hierarchical nature of locator paths.
- **Enhanced Maintainability**: Reduces confusion and manual updates when `LocatorSchemaPath` strings are modified.
- **Type Safety and Intellisense**: TypeScript provides accurate suggestions for valid `subPath` keys, enhancing the developer experience and reducing errors.

### 5. Export of `LocatorSchemaWithoutPath`

#### Purpose

The `LocatorSchemaWithoutPath` type is now exported through `index.ts`, enabling full or partial reuse of `LocatorSchema` definitions across different `addSchema` calls within the same or different `initLocatorSchemas` functions.

#### Usage Example
```typescript
import { GetByMethod, LocatorSchemaWithoutPath } from "pomwright";
import { missingInputError } from "@common/page-components/errors.locatorSchema.ts";

export type LocatorSchemaPath =
  | "body"
  | "body.main"
  | "body.main.section"
  | "body.main.section@products"
  | "body.main.section@userInfo"
  | "body.main.section@userInfo.input@email"
  | "body.main.section@userInfo.inputError"
  | "body.main.section@deliveryInfo";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
  locators.addSchema("body", {
    locator: "body",
    locatorMethod: GetByMethod.locator,
  });

  locators.addSchema("body.main", {
    locator: "main",
    locatorMethod: GetByMethod.locator,
  });

  const region: LocatorSchemaWithoutPath = { role: "region", locatorMethod: GetByMethod.role };

  locators.addSchema("body.main.section", {
    ...region,
  });

  locators.addSchema("body.main.section@products", {
    ...region,
    roleOptions: { name: "Products" },
  });

  locators.addSchema("body.main.section@userInfo", {
    ...region,
    roleOptions: { name: "Contact Info" },
    filter: { hasText: /e-mail/i },
  });

  locators.addSchema("body.main.section@userInfo.input@email", {
    role: "textbox",
    roleOptions: { name: "Input your e-mail" },
    locatorMethod: GetByMethod.role,
  });

  locators.addSchema("body.main.section@userInfo.inputError", {
    ...missingInputError,
  });

  locators.addSchema("body.main.section@deliveryInfo", {
    ...region,
    roleOptions: { name: "Delivery Info" },
  });
}
```

#### Benefits

- **Code Reusability**: Facilitates the reuse of common locator schema fragments across different contexts, reducing redundancy.
- **Modular Definitions**: Encourages a modular approach to defining locators, enhancing organization and scalability.

## Deprecations

### 1. Deprecated `.update` and `.updates` Methods

- **Old `.update(updates: Partial<LocatorSchemaWithoutPath>): LocatorSchemaWithMethods`**
- **Old `.updates(indexedUpdates: { [index: number]: Partial<LocatorSchemaWithoutPath> | null }): LocatorSchemaWithMethods`**

**Reason:**  
`.updates` relied on index-based updates, which are prone to errors and require manual maintenance, especially when `LocatorSchemaPath` strings are renamed or restructured. While the old `.update` method could only update the last LocatorSchema in the path. Confusing with multiple methods instead of just one.

**Replacement:**  
Use the new `.update(subPath, modifiedSchema)` method, which leverages `subpath`'s of valid `LocatorSchemaPath` strings for more intuitive and maintainable updates.

**Removal Schedule:**  
These methods are deprecated and will be removed in version 2.0.0.

### 2. Deprecated Old `getNestedLocator` Method

- **Old `getNestedLocator(indices?: { [key: number]: number | null }): Promise<Locator>`**

**Reason:**  
Index-based indexing is less readable and requires manual updates when `LocatorSchemaPath` strings change.

**Replacement:**  
Use the updated `getNestedLocator(subPathIndices?: { [K in SubPaths<LocatorSchemaPathType, LocatorSubstring>]: number | null }): Promise<Locator>` method, which utilizes `LocatorSchemaPath` strings for indexing.

**Removal Schedule:**  
This method is deprecated and will be removed in version 2.0.0.

## Migration Guide

### Updating `.update` and `.updates` Methods

**Old Usage:**
```typescript
const allCheckboxes = await poc
  .getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
  .updates({ 3: { locatorOptions: { hasText: /Producer/i } } })
  .getNestedLocator();
```

**New Usage:**
```typescript
const allCheckboxes = await poc
  .getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
  .update("main.products.searchControls.filterType", { locatorOptions: { hasText: /Producer/i } })
  .getNestedLocator();
```

### Updating `getNestedLocator` Method

**Old Usage (Deprecated):**
```typescript
const saveBtn = await profile.getNestedLocator("content.region.details.button.save", { 4: 2 });

const editBtn = await profile.getLocatorSchema("content.region.details.button.edit")
  .getNestedLocator({ 2: index });
```

**New Usage:**
```typescript
const saveBtn = await profile.getNestedLocator("content.region.details.button.save", {
  "content.region.details.button.save": 2 
});

const editBtn = await profile.getLocatorSchema("content.region.details.button.edit")
  .getNestedLocator({ "content.region.details": index });
```

### Utilizing `LocatorSchemaPath` Instead of Indices

Transition from index-based to `LocatorSchemaPath`-based indexing to improve code readability and maintainability.

**Old Example:**
```typescript
const allCheckboxes = await poc
  .getLocatorSchema("main.form.item.checkbox")
  .updates({ 3: { locatorOptions: { hasText: /Producer/i } } })
  .getNestedLocator();
```

**New Example:**
```typescript
const allCheckboxes = await poc
  .getLocatorSchema("main.form.item.checkbox")
  .update("main.form.item", { locatorOptions: { hasText: /Producer/i } })
  .getNestedLocator();
```

## Example in Context

### Defining a LocatorSchema with `filter` and Using `.addFilter()`

```typescript
// Defining LocatorSchemas
this.locators.addSchema("body.main.section@userInfo", {
  role: "region",
  roleOptions: { name: "Contact Info" },
  filter: { hasText: /e-mail/i },
  locatorMethod: GetByMethod.role
});

// Dynamically adding additional filters using `.addFilter()`
const specificSection = await poc
  .getLocatorSchema("body.main.section@userInfo")
  .addFilter("body.main.section@userInfo", { hasText: "Additional Services" })
  .getNestedLocator();
```

### Updating LocatorSchemas with the New `.update()` Method

```typescript
const editBtn = await profile
  .getLocatorSchema("content.region.details.button.edit")
  .update("content.region.details.button.edit", { 
    roleOptions: { name: "new accessibility name" }
  })
  .getNestedLocator();
```

### Reusing LocatorSchemas with `LocatorSchemaWithoutPath`

```typescript
import { GetByMethod, LocatorSchemaWithoutPath } from "pomwright";
import { missingInputError } from "@common/page-components/errors.locatorSchema.ts";

export type LocatorSchemaPath =
  | "body"
  | "body.main"
  | "body.main.section"
  | "body.main.section@products"
  | "body.main.section@userInfo"
  | "body.main.section@userInfo.input@email"
  | "body.main.section@userInfo.inputError"
  | "body.main.section@deliveryInfo";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
  locators.addSchema("body", {
    locator: "body",
    locatorMethod: GetByMethod.locator,
  });

  locators.addSchema("body.main", {
    locator: "main",
    locatorMethod: GetByMethod.locator,
  });

  const region: LocatorSchemaWithoutPath = { role: "region", locatorMethod: GetByMethod.role };

  locators.addSchema("body.main.section", {
    ...region,
  });

  locators.addSchema("body.main.section@products", {
    ...region,
    roleOptions: { name: "Products" },
  });

  locators.addSchema("body.main.section@userInfo", {
    ...region,
    roleOptions: { name: "Contact Info" },
    filter: { hasText: /e-mail/i },
  });

  locators.addSchema("body.main.section@userInfo.input@email", {
    role: "textbox",
    roleOptions: { name: "Input your e-mail" },
    locatorMethod: GetByMethod.role,
  });

  locators.addSchema("body.main.section@userInfo.inputError", {
    ...missingInputError,
  });

  locators.addSchema("body.main.section@deliveryInfo", {
    ...region,
    roleOptions: { name: "Delivery Info" },
  });
}
```

## Notes

- **Filter Application Order:**  
  The `filter` property in `LocatorSchema` is always applied first, followed by any filters added via `.addFilter()`. This ensures that predefined filters have priority over dynamically added ones.

- **Exclusion of `frameLocator`:**  
  The `filter` property does not apply to `frameLocator` locators. If you need to filter within frames, use the appropriate Playwright frame methods.

- **Type Safety and Intellisense:**  
  The new `.update()` and enhanced `getNestedLocator()` methods leverage TypeScript's type system to provide accurate Intellisense suggestions, enhancing developer experience and reducing errors.

## Conclusion

These enhancements to `LocatorSchema` and its associated methods significantly improve the flexibility, readability, and maintainability of locator management within your POMs. By adopting the new `filter` property, `.addFilter()` method, and updated `.update()` & `getNestedLocator()` methods, you can construct more precise and adaptable locators, facilitating robust and scalable test automation.

**Note:**  
Ensure to migrate away from the deprecated `.update`, `.updates`, and old `getNestedLocator` methods before upgrading to version 2.0.0 to maintain compatibility and leverage the full benefits of these enhancements.