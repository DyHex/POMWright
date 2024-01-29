# POMWright

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/DyHex/POMWright/main.yaml?label=CI%20on%20main) [![NPM Version](https://img.shields.io/npm/v/pomwright)](https://www.npmjs.com/package/pomwright) ![NPM Downloads](https://img.shields.io/npm/dt/pomwright) ![GitHub License](https://img.shields.io/github/license/DyHex/POMWright) [![NPM dev or peer Dependency Version](https://img.shields.io/npm/dependency-version/pomwright/peer/%40playwright%2Ftest)](https://www.npmjs.com/package/playwright) [![Static Badge](https://img.shields.io/badge/created%40-ICE-ffcd00)](https://www.ice.no/)

POMWright is a TypeScript-based framework that implements the Page Object Model Design Pattern, designed specifically to augment Playwright's testing capabilities.

POMWright provides a way of abstracting the implementation details of a web page and encapsulating them into a reusable page object. This approach makes the tests easier to read, write and maintain, and helps reduce duplicated code by breaking down the code into smaller, reusable components, making the code more maintainable and organized.

## Features

### Easy Creation of Page Object Classes

Simply extend a class with BasePage to create a Page Object Class (POC).

### Support for Multiple Domains/BaseURLs

Define different base URLs by extending an abstract class with BasePage and have your POCs extend it.

### Custom Playwright Fixture Integration

Seamlessly integrate custom Playwright Fixtures with your POMWright POCs.

### LocatorSchema Interface

Define comprehensive locators for each POC and share common locators between them.

### Advanced Locator Management

Efficiently manage and chain locators through LocatorSchemaPaths.

### Dynamic Locator Schema Updates

Modify single or multiple locators within a chained locator dynamically during tests.

### Deep Copy of LocatorSchemas

Ensure that original LocatorSchemas remain immutable and reusable across tests.

### Custom HTML Logger

Gain insights with detailed logs for nested locators, integrated with Playwright's HTML report. Or use the Log fixture throughout your own POCs and tests to easily attach them to the HTML report based on log levels.

### SessionStorage Handling

Enhance your tests with advanced sessionStorage handling capabilities.

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

### Playwright browsers

Install or update Playwright browsers:

```bash
pnpm playwright install --with-deps
```

### Run tests

Execute tests across chromium, firefox, and webkit:

```bash
pnpm playwright test
```

### Parallelism

Control parallel test execution. By default, up to 4 tests run in parallel. Modify this setting as needed:

```bash
pnpm playwright test --workers 2  # Set the number of parallel workers
```

### Reports

After the tests complete, a Playwright HTML report is available in ./example/playwright-report. Open the index.html file in your browser to view the results.

## Usage

Dive into using POMWright with these examples:

### Create a Page Object Class (POC)

```TS
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

```TS
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

### Using the fixture in a Playwright tests

#### Click edit button with a single locator

```TS
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

#### Click edit button with a nested locator

```TS
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

#### Specify index for nested locator(s)

```TS
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
    3: 0, 4: 1
  });

  await editBtn.click();

});
```

#### Update a locator before use

```TS
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
    .update({ roleOptions: { name: "Edit details" }})
    .getNestedLocator();

  await editBtn.click();

});
```

#### Update a nested locator before use

```TS
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
    .updates({ 
      2: { // content.region.details
        locator: ".profile-details",
        locatorMethod: GetByMethod.locator
        } 
      })
    .getNestedLocator();

  await editBtn.click();

});
```

#### Make multiple versions of a locator

```TS
import { test } from ".../fixtures";

test("make multiple versions of a locator", async ({ profile }) => {
  // perform setup/navigation...

  await profile.page.waitForURL(profile.fullUrl);

  const editBtnSchema = profile.getLocatorSchema("content.region.details.button.edit");

  const editBtn = await editBtnSchema.getLocator();
  await editBtn.click();

  editBtnSchema.update({ roleOptions: { name: "Edit details" }});

  const editBtnUpdated = await editBtnSchema.getNestedLocator();
  await editBtnUpdated.click();

  /**
   * Calling profile.getLocatorSchema("content.region.details.button.edit") again 
   * will return a new deepCopy of the original LocatorSchema
   */

});
```

## Troubleshooting and Support

If you encounter any issues or have questions, please check our issues page or reach out to us directly.

## Contributing

We welcome contributions! Please refer to our contribution guidelines for details on how to submit pull requests, report bugs, or request features.

## License

POMWright is open-source software licensed under the Apache-2.0 license
