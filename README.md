# POMWright

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/DyHex/POMWright/main.yaml?label=CI%20on%20main) [![NPM Version](https://img.shields.io/npm/v/pomwright)](https://www.npmjs.com/package/pomwright) ![NPM Downloads](https://img.shields.io/npm/dt/pomwright) ![GitHub License](https://img.shields.io/github/license/DyHex/POMWright) [![NPM dev or peer Dependency Version](https://img.shields.io/npm/dependency-version/pomwright/peer/%40playwright%2Ftest)](https://www.npmjs.com/package/playwright) [![Static Badge](https://img.shields.io/badge/created%40-ICE-ffcd00)](https://www.ice.no/)

POMWright is a TypeScript-based framework that implements the Page Object Model Design Pattern, designed specifically to augment Playwright's testing capabilities.

POMWright provides a way of abstracting the implementation details of a web page and encapsulating them into a reusable page object. This approach makes the tests easier to read, write and maintain, and helps reduce duplicated code by breaking down the code into smaller, reusable components, making the code more maintainable and organized.

## Features

**Easy Creation of Page Object Classes:**
Extend a class with POMwright to create a Page Object Class (POC).

**Support for Multiple Domains/BaseURLs:**
Extend an abstract class with POMWright with a given BaseUrl, then create POCs for that BaseUrl by extending the abstract class.

**Custom Playwright Fixture Integration:** Create custom Playwright Fixtures from your POMWright POCs by extending test as POMWrightTestFixture.

**LocatorSchema Interface:** Offers a way to define and structure comprehensive locators per POC and share common locators between them.

**Advanced Locator Management:** Enables retrieval and automatic chaining of locators using LocatorSchemaPath.

**LocatorSchema Update/Updatess:** Allows updating single locators aswell as each locator a chained locator consist of, dynamically throughout a test.

**Deep Copy of LocatorSchemas:** Ensures original LocatorSchemas are reusable in tests.

**Custom HTML Logger:** Provides detailed logs for nested locators, aiding in debugging and integration with Playwright's HTML report.

**SessionStorage Handling:** Includes methods for managing sessionStorage, complementing Playwright's capabilities.

## Installation

```bash
npm install pomwright --save-dev
```

## Playwright Example Project

Inside the "example" folder you'll find a simple Playwright project using POMWright with POCs, fixtures, LocatorSchema's and tests you can experiment with. To run them, clone the repository and cd into the "example" folder, then do the following:

Install:

```bash
pnpm install
```

Install/download Playwright browsers:

```bash
pnpm playwright install --with-deps
```

Run each test with chromium, firefox and webkit: 

```bash
pnpm playwright test
```

The playwright.config.ts is set to run up-to 4 tests in parallell, either alter the config or override it through the commandline if needed, e.g.:

```bash
# 1 will disable parallelism and run the tests serially
pnpm playwright test --workers 2
``` 

## Usage

**Simple example of creating a Page Object Class:**

```TS
import { Page, TestInfo } from "@playwright/test";
import { POMWright, POMWrightLogger } from "pomwright";

type LocatorSchemaPath = 
  | "content"
  | "content.heading"
  | "content.region.details"
  | "content.region.details.button.edit";

export default class Profile extends POMWright<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: POMWrightLogger) {
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
      }
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("content.region.details", {
      role: "region",
      roleOptions: {
        name: "Profile Details"
      }
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("content.region.details.button.edit", {
      role: "button",
      roleOptions: {
        name: "Edit"
      }
      locatorMethod: GetByMethod.role
    });
  }

  // add your helper methods here...
}
```

**Creating a Custom Playwright Fixture for the Profile POC:**

```TS
import { POMWrightTestFixture as base } from "pomwright";
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

**Using the fixture in a Playwright tests:**

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
