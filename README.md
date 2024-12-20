# POMWright

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/DyHex/POMWright/main.yaml?label=CI%20on%20main) [![NPM Version](https://img.shields.io/npm/v/pomwright)](https://www.npmjs.com/package/pomwright) ![NPM Downloads](https://img.shields.io/npm/dt/pomwright) ![GitHub License](https://img.shields.io/github/license/DyHex/POMWright) [![NPM dev or peer Dependency Version](https://img.shields.io/npm/dependency-version/pomwright/peer/%40playwright%2Ftest)](https://www.npmjs.com/package/playwright) [![Static Badge](https://img.shields.io/badge/created%40-ICE-ffcd00)](https://www.ice.no/)

POMWright is a TypeScript-based framework that implements the Page Object Model Design Pattern, designed specifically to augment Playwright's testing capabilities.

POMWright provides a way of abstracting the implementation details of a web page and encapsulating them into a reusable page object. This approach makes the tests easier to read, write, and maintain, and helps reduce duplicated code by breaking down the code into smaller, reusable components, making the code more maintainable and organized.

## Features

### Easy Creation of Page Object Classes

Simply extend a class with `BasePage` to create a Page Object Class (POC).

### Support for Multiple Domains/BaseURLs

Define different base URLs by extending an abstract class with `BasePage` per domain and have your POCs for each domain extend the abstract classes.

### Custom Playwright Fixture Integration

Seamlessly integrate custom Playwright Fixtures with your POMWright POCs.

### LocatorSchema Interface

Define comprehensive locators for each POC and share common locators between them.

### Advanced Locator Management

Efficiently manage and chain locators through `LocatorSchemaPath`s.

### Dynamic Locator Schema Updates

Modify single or multiple locators within a chained locator dynamically during tests using the new `.update()` and `.addFilter()` methods.

### Deep Copy of LocatorSchemas

Ensure that original `LocatorSchemas` remain immutable and reusable across tests.

### Custom HTML Logger

Gain insights with detailed logs for nested locators, integrated with Playwright's HTML report. Or use the Log fixture throughout your own POCs and tests to easily attach them to the HTML report based on log levels.

### SessionStorage Handling

Enhance your tests with advanced `sessionStorage` handling capabilities.

### Enhanced Locator Filtering

- **New `filter` Property**: Apply filters across various locator types beyond just the `locator` method.
- **New `.addFilter()` Method**: Dynamically add filters to any part of the locator chain.

## Installation

Ensure you have Node.js installed, then run:

```bash
npm install pomwright --save-dev
```

or

```bash
pnpm i -D pomwright
```

## Playwright Example Project

Explore POMWright in action by diving into the example project located in the "example" folder. Follow these steps to get started:

### Install

Navigate to the "example" folder and install the necessary dependencies:

```bash
pnpm install
```

### Playwright Browsers

Install or update Playwright browsers:

```bash
pnpm playwright install --with-deps
```

### Run Tests

Execute tests across Chromium, Firefox, and WebKit:

```bash
pnpm playwright test
```

### Parallelism

Control parallel test execution. By default, up to 4 tests run in parallel. Modify this setting as needed:

```bash
pnpm playwright test --workers 2  # Set the number of parallel workers
```

### Reports

After the tests complete, a Playwright HTML report is available in `./example/playwright-report`. Open the `index.html` file in your browser to view the results.

## Usage

Dive into using POMWright with these examples:

### Create a Page Object Class (POC)

```typescript
import { Page, TestInfo } from "@playwright/test";
import { BasePage, PlaywrightReportLogger, GetByMethod } from "pomwright";

type LocatorSchemaPath = 
  | "content"
  | "content.heading"
  | "content.region.details"
  | "content.region.details.button.edit";

export default class Profile extends BasePage<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://someDomain.com", "/profile", Profile.name, pwrl);
  }

  protected initLocatorSchemas() {
    this.locators.addSchema("content", {
      locator: ".main-content",
      locatorMethod: GetByMethod.locator
    });

    this.locators.addSchema("content.heading", {
      role: "heading",
      roleOptions: {
        name: "Your Profile"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("content.region.details", {
      role: "region",
      roleOptions: {
        name: "Profile Details"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("content.region.details.button.edit", {
      role: "button",
      roleOptions: {
        name: "Edit"
      },
      locatorMethod: GetByMethod.role
    });
  }

  // add your helper methods here...
}
```

### Creating a Custom Playwright Fixture

```typescript
import { test as base } from "pomwright";
import Profile from "...";

type fixtures = {
  profile: Profile;
}

export const test = base.extend<fixtures>({
  profile: async ({ page, log }, use, testInfo) => {
    const profile = new Profile(page, testInfo, log);
    await use(profile);
  }
});
```

### Using the Fixture in Playwright Tests

#### Click Edit Button with a Single Locator

```typescript
import { test } from ".../fixtures";

test("click edit button with a single locator", async ({ profile }) => {
  // perform setup/navigation...

  await profile.page.waitForURL(profile.fullUrl);

  /** 
   * returns the locator resolving to the full locatorSchemaPath
   */
  const editBtn = await profile.getLocator("content.region.details.button.edit");

  await editBtn.click();
});
```

#### Click Edit Button with a Nested Locator

```typescript
import { test } from ".../fixtures";

test("click edit button with a nested locator", async ({ profile }) => {
  // perform setup/navigation...

  await profile.page.waitForURL(profile.fullUrl);

  /** 
   * returns a nested/chained locator consisting of the 3 locators: 
   * content, 
   * content.region.details
   * content.region.details.button.edit
   */
  const editBtn = await profile.getNestedLocator("content.region.details.button.edit");

  await editBtn.click();
});
```

#### Specify Index for Nested Locators

```typescript
import { test } from ".../fixtures";

test("specify index for nested locator(s)", async ({ profile }) => {
  // perform setup/navigation...

  await profile.page.waitForURL(profile.fullUrl);

  /** 
   * returns a nested/chained locator consisting of the 3 locators: 
   * content 
   * content.region.details with .first()
   * content.region.details.button.edit with .nth(1)
   */
  const editBtn = await profile.getNestedLocator("content.region.details.button.edit", {
    "content.region.details": 0, 
    "content.region.details.button.edit": 1
  });

  await editBtn.click();
});
```

#### Update a Locator Before Use

```typescript
import { test } from ".../fixtures";

test("update a locator before use", async ({ profile }) => {
  // perform setup/navigation...

  await profile.page.waitForURL(profile.fullUrl);

  /** 
   * returns a nested/chained locator consisting of the 3 locators: 
   * content, 
   * content.region.details
   * content.region.details.button.edit (updated)
   */
  const editBtn = await profile.getLocatorSchema("content.region.details.button.edit")
    .update("content.region.details.button.edit", { 
      roleOptions: { name: "Edit details" }
    })
    .getNestedLocator();

  await editBtn.click();
});
```

#### Update a Nested Locator Before Use

```typescript
import { test } from ".../fixtures";

test("update a nested locator before use", async ({ profile }) => {
  // perform setup/navigation...

  await profile.page.waitForURL(profile.fullUrl);

  /** 
   * returns a nested/chained locator consisting of the 3 locators: 
   * content, 
   * content.region.details (updated)
   * content.region.details.button.edit
   */
  const editBtn = await profile.getLocatorSchema("content.region.details.button.edit")
    .update("content.region.details", { 
      locator: ".profile-details",
      locatorMethod: GetByMethod.locator
    })
    .getNestedLocator();

  await editBtn.click();
});
```

#### Make Multiple Versions of a Locator

```typescript
import { test } from ".../fixtures";

test("make multiple versions of a locator", async ({ profile }) => {
  // perform setup/navigation...

  await profile.page.waitForURL(profile.fullUrl);

  const editBtnSchema = profile.getLocatorSchema("content.region.details.button.edit");

  const editBtn = await editBtnSchema.getLocator();
  await editBtn.click();

  editBtnSchema.update("content.region.details.button.edit", { roleOptions: { name: "Edit details" } });

  const editBtnUpdated = await editBtnSchema.getNestedLocator();
  await editBtnUpdated.click();

  /**
   * Calling profile.getLocatorSchema("content.region.details.button.edit") again 
   * will return a new deepCopy of the original LocatorSchema
   */
});
```

## Deprecations

### 1. Deprecated `.update` and `.updates` Methods

- **Old `.update(updates: Partial<LocatorSchemaWithoutPath>): LocatorSchemaWithMethods`**
- **Old `.updates(indexedUpdates: { [index: number]: Partial<LocatorSchemaWithoutPath> | null }): LocatorSchemaWithMethods`**

**Reason:**  
The `.updates` method relied on index-based updates, which are prone to errors and require manual maintenance, especially when `LocatorSchemaPath` strings are renamed or restructured. Additionally, the old `.update` method could only update the last `LocatorSchema` in the chain, making it less flexible.

**Replacement:**  
Use the new `.update(subPath, modifiedSchema)` method, which leverages valid `subPath`s of `LocatorSchemaPath` strings for more intuitive and maintainable updates.

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

## Troubleshooting and Support

If you encounter any issues or have questions, please check our [issues page](https://github.com/DyHex/POMWright/issues) or reach out to us directly.

## Contributing

Pull Requests are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

POMWright is open-source software licensed under the [Apache-2.0 license](https://github.com/DyHex/POMWright/blob/main/LICENSE).
