# Using POMWright

POMWright is a small TypeScript-based framework implementing the Page Object Model Design Pattern for Playwright.

POMWright has Playwright/test as a peer dependency and will use whichever supported installed version of Playwright.

## Requirements

![NPM dev or peer Dependency Version](https://img.shields.io/npm/dependency-version/pomwright/peer/%40playwright%2Ftest)

## Installation

```bash
npm install pomwright --save-dev
```

or

```bash
pnpm i -D pomwright
```

## Getting Started

To begin using POMWright you don't need much, be it an existing or new Playwright project the approach is the same.

> Tip: Implementing POMWright in an existing Playwright project can be done in increments by implementing new Page Object Classes (POC's) with POMWright and/or refactoring existing POC's to POMWright one at a time. POMWright is just TypeScript and Playwright, and can be used along side your existing Playwright code in tests.

### Creating a Page Object Class (POC)

Lets begin by creating a Page Object Class for a simple login page using POMWright.

#### First we'll need a few imports

```TS
// login.page.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, type PlaywrightReportLogger, GetByMethod } from "pomwright";
```

From playwright we import:

- [Page](https://playwright.dev/docs/api/class-page) - Page provides methods to interact with a single tab in a Browser.
- [TestInfo](https://playwright.dev/docs/api/class-testinfo) - TestInfo contains information about the currently running test.

From POMWright we import:

- [BasePage](../src/basePage.ts) - An abstract class which is the foundation of all POC's in POMWright.
- [PlaywrightReportLogger](../src/helpers/playwrightReportLogger.ts) - A custom logger which records log messages and attaches them to the Playwright HTML report in chronological order (timestamp) per test.
- [GetByMethod](../src/helpers/locatorSchema.interface.ts#L7) - Dictates which Playwright Locator method POMWright uses for a given LocatorSchema when creating single or nested Locators.

#### We can now create a minimal implementation of our POC

```TS
// login.page.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, GetByMethod, type PlaywrightReportLogger } from "pomwright";

type LocatorSchemaPath = "";

export default class Login extends BasePage<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://someDomain.com", "/login", Login.name, pwrl);
  }

  protected initLocatorSchemas() {}
}
```

As you can see, when we extend our POC with `BasePage` we must provide a type called `LocatorSchemaPath` and our POC must also implement the abstract method `initLocatorSchemas()`. For now you only need to know that they are needed, they will be explained in a moment.

The constructor has to invoke super with the following parameters:

- page - see [Page](https://playwright.dev/docs/api/class-page)
- testInfo - see [TestInfo](https://playwright.dev/docs/api/class-testinfo)
- baseUrl - a string, similar to [BaseURL](https://playwright.dev/docs/api/class-testoptions#test-options-base-url) in playwright.config
- urlPath - a string, the resource path of the POCs page URL
- pocName - a string, the POCs human-readable name, used for logging and enriching the playwright HTML report
- pwrl - see [PlaywrightReportLogger](../src/helpers/playwrightReportLogger.ts)

Since each POC we create will be initialized as a custom Playwright fixture, we'll need to provide atleast three of these parameters to the constructor, namely [Page](https://playwright.dev/docs/api/class-page), [TestInfo](https://playwright.dev/docs/api/class-testinfo) and [PlaywrightReportLogger](../src/fixture/base.fixtures.ts), as they will be provided by their respective fixtures. The rest can be defined in the POC as above or in the custom fixture initializing the POC.

For an indepth explanation of BasePage see [BasePage-explanation.md](BasePage-explanation.md)

#### We can now define the POC's LocatorSchemaPath's and corresponding LocatorSchema

Playwright Docs loosely explain the concept of the [Page Object Model Pattern](https://playwright.dev/docs/pom) with some examples. The principle is the same but the structure and how we go about it is a bit different in POMWright.

Instead of defining Locators as properties or methods in our POC's, we define them through [LocatorSchema](./LocatorSchema-explanation.md)'s with their own unique [LocatorSchemaPath](./LocatorSchemaPath-explanation.md)'s. In short, each Page Object Class (POC) extending BasePage should define its own LocatorSchemaPath Type, which is a union of strings with the following rules:

1. The only character of significance is `.` (dot/period), any other single character or combination of characters are considered words (human readable).
2. A LocatorSchemaPath string must start and end with a word.
3. Words are seperated by `.` (dot/period).
4. Each LocatorSchemaPath string must be unique within its scope.

In practice, a LocatorSchemaPath functions as a unique identifier. While the rules are straightforward, there are important nuances. Because LocatorSchemaPath is a core concept of POMWright, I strongly recommend reading the more in-depth explanation [here](./LocatorSchemaPath-explanation.md) before you proceed.

Back to our example, lets add some LocatorSchemaPath's to our POC representing our simple login page:

```TS
// login.page.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, GetByMethod, type PlaywrightReportLogger } from "pomwright";

type LocatorSchemaPath = 
  | "main"
  | "main.section@login"
  | "main.section@login.heading"
  | "main.section@login.form"
  | "main.section@login.form.input@email"
  | "main.section@login.form.input@password"
  | "main.section@login.form.button@login"
  | "main.section@login.link@createUser";

export default class Login extends BasePage<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://someDomain.com", "/login", Login.name, pwrl);
  }

  protected initLocatorSchemas() {}

}
```

We havn't introduced them yet, but as it stands, if we were to invoke any of POMWright's methods with any of these LocatorSchemaPath's we'd get a "not implemented" error, thus we need to add our LocatorSchema's which our LocatorSchemaPath's reference.

The LocatorSchema interface lets us define an object for creating a Locator with any of Playwright's locator methods, I advise you to read the more in-depth explanation [here](./LocatorSchema-explanation.md).

Now lets add our LocatorSchema, we do this through the `initLocatorSchemas()` method, through the POC's `locators` property which it gets from extending BasePage. The `locators` property is an instance of the GetLocatorBase class, which handles LocatorSchema management and provides the POC with POMWright's locator methods, see [get-locator-methods-explanation.mb](./get-locator-methods-explanation.md) for further details.

```TS
// login.page.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, GetByMethod, type PlaywrightReportLogger } from "pomwright";

type LocatorSchemaPath = 
  | "main"
  | "main.section@login"
  | "main.section@login.heading"
  | "main.section@login.form"
  | "main.section@login.form.input@email"
  | "main.section@login.form.input@password"
  | "main.section@login.form.button@login"
  | "main.section@login.link@createUser";

export default class Login extends BasePage<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://someDomain.com", "/login", Login.name, pwrl);
  }

  protected initLocatorSchemas() {
    this.locators.addSchema("main", {
      locator: "main",
      locatorMethod: GetByMethod.locator
    });

    this.locators.addSchema("main.section@login", {
      role: "region",
      roleOptions: {
        name: "Login"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.heading", {
      role: "heading",
      roleOptions: {
        name: "Welcome",
        level: 1
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.form", {
      role: "form",
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.form.input@email", {
      role: "textbox",
      roleOptions: {
        name: "E-mail"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.form.input@password", {
      role: "textbox",
      roleOptions: {
        name: "Password"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.form.button@login", {
      role: "button",
      roleOptions: {
        name: "Login"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.link@createUser", {
      role: "link",
      roleOptions: {
        name: "Create an account"
      },
      locatorMethod: GetByMethod.role
    });
  }
}
```

#### We can then create helper methods for our POC which uses the LocatorSchema's we defined

For an indepth explanation of POMWright's locator methods, see [get-locator-methods-explanation.md](./get-locator-methods-explanation.md)

To make sure we can use Playwright test.step in our helper method, we'll import test from Playwright through POMWright.

```TS
// login.page.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, GetByMethod, type PlaywrightReportLogger, test } from "pomwright";
import User from "@test-data/user.type";

type LocatorSchemaPath = 
  | "main"
  | "main.section@login"
  | "main.section@login.heading"
  | "main.section@login.form"
  | "main.section@login.form.input@email"
  | "main.section@login.form.input@password"
  | "main.section@login.form.button@login"
  | "main.section@login.link@createUser";

export default class Login extends BasePage<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://someDomain.com", "/login", Login.name, pwrl);
  }

  protected initLocatorSchemas() {
    this.locators.addSchema("main", {
      locator: "main",
      locatorMethod: GetByMethod.locator
    });

    this.locators.addSchema("main.section@login", {
      role: "region",
      roleOptions: {
        name: "Login"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.heading", {
      role: "heading",
      roleOptions: {
        name: "Welcome",
        level: 1
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.form", {
      role: "form",
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.form.input@email", {
      role: "textbox",
      roleOptions: {
        name: "E-mail"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.form.input@password", {
      role: "textbox",
      roleOptions: {
        name: "Password"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.form.button@login", {
      role: "button",
      roleOptions: {
        name: "Login"
      },
      locatorMethod: GetByMethod.role
    });

    this.locators.addSchema("main.section@login.link@createUser", {
      role: "link",
      roleOptions: {
        name: "Create an account"
      },
      locatorMethod: GetByMethod.role
    });
  }

  async fillLoginFormAndLoginAs(user: User) {
    await test.step(`${this.pocName}: Fill login form and login as '${user.firstName}'`, async () => {
      const email = await this.getNestedLocator("main.section@login.form.input@email");
      await email.fill(user.email);

      const password = await this.getNestedLocator("main.section@login.form.input@password");
      await password.fill(user.password);

      const loginBtn = await this.getNestedLocator("main.section@login.form.button@login");
      await loginBtn.click();
    });
  }
}
```

#### Improved readability, maintainability and re-usability of LocatorSchema

This is all well and good, but the Page Object Class quickly becomes large and daunting when we keep our LocatorSchema's inside it. To resolve this lets move our LocatorSchemaPath's and LocatorSchema's into a seperate file.

To do this we need to import `GetLocatorBase` from POMWright and implement an initLocatorSchemas function.

```TS
// login.locatorSchema.ts
import { GetByMethod, type GetLocatorBase } from "pomwright";

export type LocatorSchemaPath = 
  | "main"
  | "main.section@login"
  | "main.section@login.heading"
  | "main.section@login.form"
  | "main.section@login.form.input@email"
  | "main.section@login.form.input@password"
  | "main.section@login.form.button@login"
  | "main.section@login.link@createUser";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
  locators.addSchema("main", {
    locator: "main",
    locatorMethod: GetByMethod.locator
  });

  locators.addSchema("main.section@login", {
    role: "region",
    roleOptions: {
      name: "Login"
    },
    locatorMethod: GetByMethod.role
  });

  locators.addSchema("main.section@login.heading", {
    role: "heading",
    roleOptions: {
      name: "Welcome",
      level: 1
    },
    locatorMethod: GetByMethod.role
  });

  locators.addSchema("main.section@login.form", {
    role: "form",
    locatorMethod: GetByMethod.role
  });

  locators.addSchema("main.section@login.form.input@email", {
    role: "textbox",
    roleOptions: {
      name: "E-mail"
    },
    locatorMethod: GetByMethod.role
  });

  locators.addSchema("main.section@login.form.input@password", {
    role: "textbox",
    roleOptions: {
      name: "Password"
    },
    locatorMethod: GetByMethod.role
  });

  locators.addSchema("main.section@login.form.button@login", {
    role: "button",
    roleOptions: {
      name: "Login"
    },
    locatorMethod: GetByMethod.role
  });

  locators.addSchema("main.section@login.link@createUser", {
    role: "link",
    roleOptions: {
      name: "Create an account"
    },
    locatorMethod: GetByMethod.role
  });
}
```

We can then update our login POC as follows:

```TS
// login.page.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, type PlaywrightReportLogger, test } from "pomwright";
import { type LocatorSchemaPath, initLocatorSchemas } from "./login.locatorSchema";
import User from "@test-data/user.type";

export default class Login extends BasePage<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://someDomain.com", "/login", Login.name, pwrl);
  }

  protected initLocatorSchemas() {
    initLocatorSchemas(this.locators);
  }

  async fillLoginFormAndLoginAs(user: User) {
    await test.step(`${this.pocName}: Fill login form and login as '${user.firstName}'`, async () => {
      const email = await this.getNestedLocator("main.section@login.form.input@email");
      await email.fill(user.email);

      const password = await this.getNestedLocator("main.section@login.form.input@password");
      await password.fill(user.password);

      const loginBtn = await this.getNestedLocator("main.section@login.form.button@login");
      await loginBtn.click();
    });
  }
}
```

By moving the POC's LocatorSchemaPath's and LocatorSchema's into a seperate file, our Page Object Class will only contain its helper methods, making both easier to read and maintain. Especially considering that a POC can have well over a hundred LocatorSchema's/LocatorSchemaPath's.

#### Now lets use our POC to create a custom Playwright fixture so we can use it in our tests

You can read further about fixtures in [Playwrights documentation](https://playwright.dev/docs/test-fixtures).

```TS
// myApp.fixtures.ts
import { test as base } from "pomwright";
import Login from "../pom/myApp/pages/login/login.page";

type myApp = {
  login: Login;
}

export const test = base.extend<myApp>({
  login: async ({ page, log }, use, testInfo) => {
    const login = new Login(page, testInfo, log);
    await use(login);
  }
});
```

For us to access and use POMWright's `log` fixture (PlaywrightReportLogger) which our POC needs, we'll need to import test from POMWright. POMWright itself extends and exports playwright test the same way we've done above.

We'll then import our POCs and extend test (base) from POMWright/Playwright with our new custom fixtures and export it as test. We're basically just adding additional fixtures to Playwright/test.

Say we've created additional POCs for myApp's home page and profile page we'll just add them to the same fixture file like so:

```TS
// myApp.fixtures.ts
import { test as base } from "pomwright";
import Home from "../pom/myApp/pages/home.page";
import Login from "../pom/myApp/pages/login/login.page";
import Profile from "../pom/myApp/pages/profile/profile.page";

type myApp = {
  home: Home;
  login: Login;
  profile: Profile;
}

export const test = base.extend<myApp>({
  home: async ({ page, log }, use, testInfo) => {
    const home = new Home(page, testInfo, log);
    await use(home);
  },

  login: async ({ page, log }, use, testInfo) => {
    const login = new Login(page, testInfo, log);
    await use(login);
  },

  profile: async ({ page, log }, use, testInfo) => {
    const profile = new Profile(page, testInfo, log);
    await use(profile);
  }
});
```

Likely we'll want multiple types of fixtures, seperate fixtures for different apps/domains, fixtures for third-party solutions we might need to interact with, automatic fixtures etc. Thus it makes sense to seperate different fixtures into seperate files giving us a more maintainable structure. As all our fixture files extends test with additional fixtures and exports test, we'll want a main fixture file to merge them so we only need one import of test to access all our fixtures when writing our tests.

```TS
// all.fixtures.ts
import { mergeTests } from "@playwright/test";
import { test as myAppFixtures } from "./myApp/myApp.fixtures";
import { test as testUser } from "./testData/testUser.fixtures";

export const test = mergeTests(myAppFixtures, testUser);
```

#### Using our POC fixture in a test

```TS
import { test } from "@fixtures/all.fixtures";

test("Login to myApp as Bob", async ({ home, login, profile, testUser }) => {
  await test.step(`${home.pocName}: Navigate to '${home.fullUrl}' and initiate login`, async () => {
    await home.page.goto(home.fullUrl);

    const loginBtn = await home.getNestedLocator("common.navMenu.link@login");
    await loginBtn.click();
  })
  
  await login.page.waitForURL(login.fullUrl);

  await login.fillLoginFormAndLoginAs(testUser.bob);

  await profile.page.waitForURL(profile.fullUrl);
});
```

You can extend playwright/test with as many fixtures as you want, Playwright will only load the fixtures we specify and whichever fixtures are needed to build them for a given test.

### Creating an abstract BasePage as the foundation of all POC's for a given domain/app

So far, we’ve extended POCs directly from POMWright’s BasePage. However, most pages in a domain share common components and functionality. To avoid duplication in every POC, we define an abstract BasePage for the domain and let all POCs extend it.

```ts
// myApp.basePage.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, type PlaywrightReportLogger } from "pomwright";
// import common helper methods / classes etc, here...

export default abstract class MyAppBase<LocatorSchemaPathType extends string> extends BasePage<LocatorSchemaPathType> {
  // add common properties here

  constructor(page: Page, testInfo: TestInfo, urlPath: string, pocName: string, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, "https://someDomain.com", urlPath, pocName, pwrl);

    // initialize common properties here
  }

  // add/implement common helper methods/classes here
}
```

And we'll update our login.page.ts to extend it instead of BasePage from POMWright.

```TS
// login.page.ts
import type { Page, TestInfo } from "@playwright/test";
import { type PlaywrightReportLogger, test } from "pomwright";
import MyAppBase from "../base/myApp.basePage";
import { type LocatorSchemaPath, initLocatorSchemas } from "./login.locatorSchema";
import User from "@test-data/user.type";

export default class Login extends MyAppBase<LocatorSchemaPath> {
  constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
    super(page, testInfo,"/login", Login.name, pwrl);
  }

  protected initLocatorSchemas() {
    initLocatorSchemas(this.locators);z
  }

  async fillLoginFormAndLoginAs(user: User) {
    await test.step(`${this.pocName}: Fill login form and login as '${user.firstName}'`, async () => {
      const email = await this.getNestedLocator("main.section@login.form.input@email");
      await email.fill(user.email);

      const password = await this.getNestedLocator("main.section@login.form.input@password");
      await password.fill(user.password);

      const loginBtn = await this.getNestedLocator("main.section@login.form.button@login");
      await loginBtn.click();
    });
  }
}
```

We can now add functionality all POC's for the given domain have in common to our abstract BasePage. We might have a collection of utility functions and other helper methods etc. Something along the line of:

```ts
// myApp.basePage.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, type PlaywrightReportLogger } from "pomwright";
import { utils } from "../utils/utils";
import { Axe } from "./helpers/axe.accessibility";
import { CookieConsent } from "./helpers/cookieConsent.actions";
import { Navigation } from "./helpers/navigation.actions";
import { env } from "@env";

export default abstract class MyAppBase<LocatorSchemaPathType extends string> extends BasePage<LocatorSchemaPathType> {
  /** Accessibility testing methods using @axe-core/playwright */
  axe: Axe;
  
  /** Common navigation operations, context is dictated by the Fixture it's invoked on */
  navigation: Navigation;

  /** Common methods for cookie consent dialog and cookie injection/mock and extraction */
  cookieConsent: CookieConsent;

  /** Collection of different utility functions */
  utils = utils;

  constructor(page: Page, testInfo: TestInfo, urlPath: string, pocName: string, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, env.BASEURL_MYAPP, urlPath, pocName, pwrl);

    this.axe = new Axe(this.page, this.pocName, this.log);

    this.navigation = new Navigation(
      this.page,
      this.baseUrl,
      this.urlPath,
      this.fullUrl,
      this.pocName,
      this.pageActionsToPerformAfterNavigation()
    );

    this.cookieConsent = new CookieConsent(
      this.page,
      this.baseUrl,
      this.fullUrl
    );
  }

  /**
   * A class extending Base must implement pageActionsToPerformAfterNavigation(),
   * if no actions are needed have it return an empty array or null.
   *
   * Intended to be used for actions that should be performed after the page has been navigated to,
   * such as waiting for elements to be visible or not etc. E.g. waiting for a spinner to disappear.
   *
   * @example
   * protected pageActionsToPerformAfterNavigation(): (() => Promise<void>)[] {
   *   return [
   *     async () => {
   *       await expect.soft(await this.getNestedLocator("common.spinner")).toHaveCount(0);
   *     }
   *   ];
   * }
   */
  protected abstract pageActionsToPerformAfterNavigation(): (() => Promise<void>)[];
}
```

Allowing all POC's extending MyAppBase to use these these methods:

```TS
import { test } from "@fixtures/all.fixtures";

test("Login to myApp as Bob", { tag: ["@login", "@a11y"] }, async ({ home, login, profile, testUser }) => {
  await test.step(`${home.pocName}: Navigate to '${home.fullUrl}' and initiate login`, async () => {
    await home.cookieConsent.set("necessary");
    await home.navigation.gotoThisPage();

    await home.axe.a11y();

    const loginBtn = await home.getNestedLocator("common.navMenu.link@login");
    await loginBtn.click();
  })
  
  await login.navigation.expectThisPage();

  await login.axe.a11y();

  await login.fillLoginFormAndLoginAs(testUser.bob);

  await profile.navigation.expectThisPage();

  await profile.axe.a11y();
});
```

### Sharing common LocatorSchema's across POC's for a given domain or domains

In the example test above we've called:

```ts
const loginBtn = await home.getNestedLocator("common.navMenu.link@login");
```

As you might have notices, we have no such LocatorSchemaPath or LocatorSchema in the initial login.locatorSchema.ts file. This is because we've defined it in a seperate file "navMenu.locatorSchema.ts" which do not belong to any specific POC as the navMenu is the same component present for all the pages on our imagined app/domain. The same goes for all other components and locators that are shared among all pages.

```ts
import { GetByMethod, type GetLocatorBase } from "pomwright";

export type LocatorSchemaPath =
 | "common.navMenu"
 | "common.navMenu.link@login"
 | "common.navMenu.section.search"
 | "common.navMenu.section.search.input.textfield"
 | "common.navMenu.section.search.button.search";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
  locators.addSchema("common.navMenu", {
    locator: "nav.main-nav",
    locatorMethod: GetByMethod.locator,
  });

  locators.addSchema("common.navMenu.link@login", {
    role: "link",
    roleOptions: {
      name: "Login",
    },
    locatorMethod: GetByMethod.role,
  });

  locators.addSchema("common.navMenu.section.search", {
    locator: ".inline-search",
    locatorMethod: GetByMethod.locator,
  });

  locators.addSchema("common.navMenu.section.search.input.textfield", {
    role: "combobox",
    roleOptions: {
      name: "Search",
    },
    locatorMethod: GetByMethod.role,
  });

  locators.addSchema("common.navMenu.section.search.button.search", {
    text: "Search",
    textOptions: {
      exact: true,
    },
    locatorMethod: GetByMethod.text,
  });
}
```

We do this for all common components and elements that do not exclusively belong to a given page. We then collect them in a single file e.g. "common.locatorSchema.ts" like so:

```ts
// common.locatorSchema.ts
import { GetByMethod, type GetLocatorBase } from "pomwright";
import { type LocatorSchemaPath as alert, initLocatorSchemas as initAlert } from "...alert.locatorSchema";
// ...rest of imports here

export type LocatorSchemaPath =
  | alert
  | mainHeader
  | cookieConsent
  | freshChat
  | shoppingCart
  | footer
  | navMenu
  | popupFeedback
  | "main";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
  initAlert(locators);
  initMainHeader(locators);
  initCookieConsent(locators);
  initFreshChat(locators);
  initShoppingCart(locators);
  initFooter(locators);
  initNavMenu(locators);
  initPopupFeedback(locators);

  locators.addSchema("main", {
    locator: "main",
    locatorMethod: GetByMethod.locator,
  });
}

```

Then we can make these available to all POC's in atleast two different ways:

#### Sharing common LocatorSchema through the abstract base class

Likely the easiest and cleanest solution. Additionally it allows us to create common helper methods in our abstract base class using the shared LocatorSchema's.

```ts
// myApp.basePage.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, type PlaywrightReportLogger } from "pomwright";
import { utils } from "../utils/utils";
import { Axe } from "./helpers/axe.accessibility";
import { CookieConsent } from "./helpers/cookieConsent.actions";
import { Navigation } from "./helpers/navigation.actions";
import { env } from "@env";
// We import the common locatorSchema here:
import { type LocatorSchemaPath as CommonLocatorSchemaPath, initLocatorSchemas as initCommonLocatorSchemas } from "../page-components/common.locatorSchema";

// We then make a union type when extending with BasePage from POMWright
export default abstract class MyAppBase<LocatorSchemaPathType extends string> extends BasePage<LocatorSchemaPathType | CommonLocatorSchemaPath> {
  axe: Axe;
  navigation: Navigation;
  cookieConsent: CookieConsent;
  utils = utils;

  constructor(page: Page, testInfo: TestInfo, urlPath: string, pocName: string, pwrl: PlaywrightReportLogger) {
    super(page, testInfo, env.BASEURL_MYAPP, urlPath, pocName, pwrl);

    this.axe = new Axe(this.page, this.pocName, this.log);

    this.navigation = new Navigation(
      this.page,
      this.baseUrl,
      this.urlPath,
      this.fullUrl,
      this.pocName,
      this.pageActionsToPerformAfterNavigation()
    );

    this.cookieConsent = new CookieConsent(
      this.page,
      this.baseUrl,
      this.fullUrl
    );

    // And initialize the common LocatorSchema in the constructor:
    initCommonLocatorSchemas(this.locators);
  }

  protected abstract pageActionsToPerformAfterNavigation(): (() => Promise<void>)[];

  // This allows us to create helper methods for interacting with common components and elements, usable by all POC's extending this class
  async expectCookieConsentDialogToBeHidden() {
    await test.step("Cookie consent dialog should be hidden", async () => {
      const cookieDialog = await this.getNestedLocator("common.dialog.cookieConsent");
      await expect(cookieDialog).toBeHidden();
    });
  }
}
```

#### Sharing common LocatorSchema through each POC's locatorSchema.ts file

I would recommend you use the first solution mentioned, and only use this approach for when a sub-page has the same LocatorSchema as the "parent" with some additional ones.

If you only use this approach though, the drawback is that we'll not be able to use common locatorSchema's in our abstract base class for our shared helper methods, but it's easier to reuse common locatorSchema's in custom locator chains for a given page. E.g. You have a LocatorSchema for a common alert message located in the same DOM structure on every single page, except for one or two specific pages, where this alert is shown inside a different DOM structure.

Note it is still possible to reuse common locatorSchema in custom locator chains for a given page with the first solution, you'll just need to relying on exporting and importing the `LocatorSchemaWithoutPath` objects you need from one locatorSchema file to the other.

Anyway, you can also share the common LocatorSchema's by importing them the same way we did for common.locatorSchema.ts, so for login.locatorSchema.ts we would simply do:

```ts
import { GetByMethod, type GetLocatorBase } from "pomwright";
import { type LocatorSchemaPath as common, initLocatorSchemas as initCommon } from "../page-components/common.locatorSchema";

export type LocatorSchemaPath =
  | common
  | "common.navMenu"
  | "common.navMenu.link@login"
  | "common.navMenu.section.search"
  | "common.navMenu.section.search.input.textfield"
  | "common.navMenu.section.search.button.search";

export function initLocatorSchemas(locators: GetLocatorBase<LocatorSchemaPath>) {
  initCommon(locators);

  locators.addSchema("common.navMenu", {
    locator: "nav.main-nav",
    locatorMethod: GetByMethod.locator,
  });

  locators.addSchema("common.navMenu.link@login", {
    role: "link",
    roleOptions: {
      name: "Login",
    },
    locatorMethod: GetByMethod.role,
  });

  locators.addSchema("common.navMenu.section.search", {
    locator: ".inline-search",
    locatorMethod: GetByMethod.locator,
  });

  locators.addSchema("common.navMenu.section.search.input.textfield", {
    role: "combobox",
    roleOptions: {
      name: "Search",
    },
    locatorMethod: GetByMethod.role,
  });

  locators.addSchema("common.navMenu.section.search.button.search", {
    text: "Search",
    textOptions: {
      exact: true,
    },
    locatorMethod: GetByMethod.text,
  });
}
```

Note: You can combine both these solutions as mentioned, but not for the same LocatorSchemaPath's as they must always be unique. If you initialize the common.locatorSchema through the abstract base class and on a POCs locatorSchema file POMWright won't know which one is the correct one and will throw an error stating you're trying the add the same LocatorSchemaPath twice.

## More practical examples see ./intTest

If the website you're writing tests for only have URL's with static / predefined resource path's, have a look at `intTest/page-object-models/testApp/without-options`

If the website you're writing tests for have one or more pages where the URL contains a generated value that always changes or changes depending on some context and you want to create a POC to represent and interact with it, have a look at `intTest/page-object-models/testApp/with-options`
