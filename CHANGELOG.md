# pomwright

## 1.1.0

### Minor Changes

- [#27](https://github.com/DyHex/POMWright/pull/27) [`ab778b2`](https://github.com/DyHex/POMWright/commit/ab778b268fcc77c03289f24617efa74518dcbe12) Thanks [@DyHex](https://github.com/DyHex)! - **Added optional support for dynamic URL types (`string` and/or `RegExp`) for `baseUrl` and `urlPath` via an options-based approach.**

  - **WHAT**: This update allows `baseUrl` and `urlPath` to be defined as either `string` or `RegExp` using `BasePageOptions`. The `fullUrl` is automatically inferred based on the types of `baseUrl` and `urlPath`. If either `baseUrl` or `urlPath` is a `RegExp`, `fullUrl` will also be a `RegExp`.

  - **WHY**: This change provides flexibility for handling dynamic URLs, such as those containing variables or patterns. It allows validating URLs that follow a predictable format but may have dynamic values that are not known before navigation.

  - **HOW**:
    - No changes are required for existing implementations since `string` remains the default type.
    - To use `RegExp` for `baseUrl` or `urlPath`, define them explicitly in the POC using `BasePageOptions`, which will automatically infer `fullUrl`.
    - **Note**: POCs using `RegExp` for `baseUrl` or `urlPath` cannot use `page.goto(fullUrl)` since it requires a `string`. Instead, methods like `page.waitForURL()`, which accept `RegExp`, can be used to validate navigation. This feature is ideal for scenarios where URL values are dynamic and can only be validated by format.

  # Examples

  ## Example: Abstract Base Class extending BasePage without BasePageOptions (default, same as prior versions)

  ```ts
  import { type Page, type TestInfo } from "@playwright/test";
  import { BasePage, PlaywrightReportLogger } from "pomwright";
  // import helper methods / classes etc, here... (To be used in the Base POC)

  export default abstract class Base<
    LocatorSchemaPathType extends string
  > extends BasePage<LocatorSchemaPathType> {
    // add properties here (available to all POCs extending this abstract Base POC)

    constructor(
      page: Page,
      testInfo: TestInfo,
      urlPath: string,
      pocName: string,
      pwrl: PlaywrightReportLogger
    ) {
      super(page, testInfo, "http://localhost:8080", urlPath, pocName, pwrl);

      // initialize properties here (available to all POCs extending this abstract Base POC)
    }

    // add helper methods here (available to all POCs extending this abstract Base POC)
  }
  ```

  ## Example: POC extending abstract Base Class without BasePageOptions (default, same as prior versions)

  ```ts
  import { type Page, type TestInfo } from "@playwright/test";
  import { PlaywrightReportLogger } from "pomwright";
  import Base from "../base/base.page";
  import {
    type LocatorSchemaPath,
    initLocatorSchemas,
  } from "./testPage.locatorSchema";

  export default class TestPage extends Base<LocatorSchemaPath> {
    constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
      super(page, testInfo, "/", TestPage.name, pwrl);
    }

    protected initLocatorSchemas() {
      initLocatorSchemas(this.locators);
    }

    // add your helper methods here...
  }
  ```

  ## Example: Abstract Base Class extending BasePage with BasePageOptions, allows urlPath type as string xOR RegExp

  ```ts
  import { type Page, type TestInfo } from "@playwright/test";
  import {
    BasePage,
    type BasePageOptions,
    type ExtractUrlPathType,
    PlaywrightReportLogger,
  } from "pomwright";

  // BaseWithOptions extends BasePage and enforces baseUrlType as string
  export default abstract class BaseWithOptions<
    LocatorSchemaPathType extends string,
    Options extends BasePageOptions = {
      urlOptions: { baseUrlType: string; urlPathType: string };
    }
  > extends BasePage<
    LocatorSchemaPathType,
    {
      urlOptions: {
        baseUrlType: string;
        urlPathType: ExtractUrlPathType<Options>;
      };
    }
  > {
    constructor(
      page: Page,
      testInfo: TestInfo,
      urlPath: ExtractUrlPathType<{
        urlOptions: { urlPathType: ExtractUrlPathType<Options> };
      }>, // Ensure the correct type for urlPath
      pocName: string,
      pwrl: PlaywrightReportLogger
    ) {
      // Pass baseUrl as a string and let urlPath be flexible
      super(page, testInfo, "http://localhost:8080", urlPath, pocName, pwrl);

      // Initialize additional properties if needed
    }

    // Add any helper methods here, if needed
  }
  ```

  ## Example: POC extending abstract Base Class with BasePageOptions, but uses defaults (type string)

  ```ts
  import {
    type LocatorSchemaPath,
    initLocatorSchemas,
  } from "@page-object-models/testApp/without-options/pages/testPage.locatorSchema"; // same page & same locator schema as above
  import { type Page, type TestInfo } from "@playwright/test";
  import { PlaywrightReportLogger } from "pomwright";
  import BaseWithOptions from "../base/baseWithOptions.page";

  // Note, if BasePageOptions aren't specified, default options are used
  export default class TestPage extends BaseWithOptions<LocatorSchemaPath> {
    constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
      super(page, testInfo, "/", TestPage.name, pwrl);
    }

    protected initLocatorSchemas() {
      initLocatorSchemas(this.locators);
    }

    // add your helper methods here...
  }
  ```

  ## Example: POC extending abstract Base Class with BasePageOptions, and defines urlPath type as RegExp

  ```ts
  import { test } from "@fixtures/withOptions";
  import BaseWithOptions from "@page-object-models/testApp/with-options/base/baseWithOptions.page";
  import { type Page, type TestInfo, expect } from "@playwright/test";
  import { PlaywrightReportLogger } from "pomwright";
  import {
    type LocatorSchemaPath,
    initLocatorSchemas,
  } from "./color.locatorSchema";

  // By providing the urlOptions, the urlPath property now has RegExp type instead of string type (default) for this POC
  export default class Color extends BaseWithOptions<
    LocatorSchemaPath,
    { urlOptions: { urlPathType: RegExp } }
  > {
    constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
      /**
       * Matches "/testpath/randomcolor/" followed by a valid 3 or 6-character hex color code.
       */
      const urlPathRegex = /\/testpath\/([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

      super(page, testInfo, urlPathRegex, Color.name, pwrl);
    }

    protected initLocatorSchemas() {
      initLocatorSchemas(this.locators);
    }

    async expectThisPage() {
      await test.step("Expect color page", async () => {
        await this.page.waitForURL(this.fullUrl);

        const heading = await this.getNestedLocator("body.heading");
        await heading.waitFor({ state: "visible" });
      });
    }

    // add your helper methods here...
  }
  ```

  # Summary of Changes

  - **Dynamic URL Support**: You can now define `baseUrl` and `urlPath` as `RegExp` for dynamic URL handling.
  - **Backward Compatibility**: No changes are required for existing implementations using `string`.
  - **Restructuring of tests**: Unit tests moved from ./src to ./test, integration tests moved from ./test to ./intTest
  - **New unit tests**: To cover optional-dynamic-url-types (string xOR RegExp)
  - **New integration tests with Playwright/test**: To cover optional-dynamic-url-types (string xOR RegExp)
  - **peerDependencies change**: Bumped minimum Playwright/test version from 1.39.0 to 1.41.0 as everything below 1.41.0 is deprecated. Also excluded v. 2.x.x as they have known bugs for chaining of locators. Limited max version to <2.0.0

  Changes have additionally been tested with two seperate playwright/test projects (130+ E2E tests) without issues, and against the latest Playwright/test versions.

## 1.0.2

### Patch Changes

- [#25](https://github.com/DyHex/POMWright/pull/25) [`993b0ad`](https://github.com/DyHex/POMWright/commit/993b0adc0f437c2c30b436ef6583a59811e0a6a5) Thanks [@DyHex](https://github.com/DyHex)! - # Change

  buildNestedLocator will no longer attempt to auto-scroll to the final nested locator

  Was done previously in an attempt to improve test recordings, but it sometimes causes tearing in screenshots and isn't ideal when using nested locators for visual regression tests.

  ## Playwright/test compatibility

  Tested with the following Playwright/test versions:

  - 1.43.1
  - 1.43.0
  - 1.42.1
  - 1.42.0 (not recommended)
  - 1.41.2
  - 1.41.1
  - 1.41.0
  - 1.40.1
  - 1.40.0
  - 1.39.0

## 1.0.1

### Patch Changes

- [#23](https://github.com/DyHex/POMWright/pull/23) [`0cfc19f`](https://github.com/DyHex/POMWright/commit/0cfc19f057575365853f9df41bbd661bf45172e2) Thanks [@DyHex](https://github.com/DyHex)! - # Continuous testing & bug fixes

  ## Bug fixes

  - getLocatorBase.applyUpdate() now correctly updates the LocatorSchemaWithMethod and maintains a circular ref. for the entry representing itself in schemasMap
  - getLocatorBase.applyUpdates() now correctly updates the LocatorSchemaWithMethod and maintains a circular ref. for the entry representing itself in schemasMap while updating other LocatorSchema in SchemasMap directly.
  - getLocatorBase.deepMerge() now correctly validates valid nested properties of LocatorSchema

  ## Continuous testing

  - Build workflow now runs unit tests (vitest)
  - New shell script enabling testing new packages before release
  - New test workflow for POMWright integration tests (Playwright/test)
  - 52 new unit tests, more to come..
  - 4 new integration tests, more to come..

  New release has also been tested with a seperate Playwright/test project leveraging POMWright (~100 E2E tests)

  ## Playwright/test compatibility

  Tested with the following Playwright/test versions:

  - 1.43.1
  - 1.43.0
  - 1.42.1
  - 1.42.0 (not recommended)
  - 1.41.2
  - 1.41.1
  - 1.41.0
  - 1.40.1
  - 1.40.0
  - 1.39.0

## 1.0.0

### Major Changes

- 130784f: BREAKING: The following index.ts exports have been renamed:

  - "POMWright" changed to "BasePage"
  - "POMWrightTestFixture" changed to "test"
  - "POMWrightLogger" changed to "PlaywrightReportLogger"
  - "POMWrightGetLocatorBase" changed to "GetLocatorBase"
  - "POMWrightApi" changed to "BaseApi"

  Documentation updated

  README updated

## 0.0.9

### Patch Changes

- 7e8b7d1: removes an abstract method from POMWright/BasePage which should have been removed previously

## 0.0.8

### Patch Changes

- 0d4924e: adds additional inforamtion to package.json and shields in readme

## 0.0.7

### Patch Changes

- 5b7ed8a: Update README

## 0.0.6

### Patch Changes

- 8c2af7d: fix: ensure base fixture log follows playwright's api

## 0.0.5

### Patch Changes

- 0c96ab7: Add Biome for linting and formatting
- 0c96ab7: Move indices with default value to the end of arguments for buildNestedLocator

## 0.0.4

### Patch Changes

- f2fea3b: add codeowners

## 0.0.3

### Patch Changes

- fa2a954: adds release script to package.json

## 0.0.2

### Patch Changes

- 1e5433a: Adds changeset to repository
