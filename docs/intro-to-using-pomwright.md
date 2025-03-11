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

- [BasePage](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/src/basePage.ts) - An abstract class which is the foundation of all POC's in POMWright.
- [PlaywrightReportLogger](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/src/helpers/playwrightReportLogger.ts) - A custom logger which records log messages and attaches them to the Playwright HTML report per test.
- [GetByMethod](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/src/helpers/locatorSchema.interface.ts#L7) - Dictates which Playwright Locator method POMWright uses for a given LocatorSchema when creating single or nested Locators

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
- pwrl - see [PlaywrightReportLogger](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/src/helpers/playwrightReportLogger.ts)

Since each POC we create will be initialized as a custom Playwright fixture, we'll need to provide atleast three of these parameters to the constructor, namely [Page](https://playwright.dev/docs/api/class-page), [TestInfo](https://playwright.dev/docs/api/class-testinfo) and [PlaywrightReportLogger](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/src/fixture/base.fixtures.ts), as they will be provided by their respective fixtures. The rest can be defined in the POC as above or in the custom fixture initializing the POC.

For an indepth explanation of BasePage see [BasePage-explanation.md](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/docs/BasePage-explanation.md)

#### We can now define the POC's LocatorSchemaPath's and corresponding LocatorSchema

Playwright Docs loosely explain the concept of the [Page Object Model Pattern](https://playwright.dev/docs/pom) with some examples. The principle is the same but the structure and how we go about it is a bit different in POMWright.

Instead of defining Locators as properties or methods in our POC's, we define them through [LocatorSchema](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/docs/LocatorSchema-explanation.md)'s with their own unique [LocatorSchemaPath](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/docs/LocatorSchemaPath-explanation.md)'s. In short, each Page Object Class (POC) extending BasePage should define its own LocatorSchemaPath Type, which is a union of strings with the following rules:

1. The only character of significance is `.` (dot/period), any other single character or combination of characters are considered words.
2. A LocatorSchemaPath string must start and end with a word.
3. Words are seperated by `.` (dot/period).
4. Each LocatorSchemaPath string must be unique within its scope.

Though the rules are simple, there are some nuances, I advise you to read the more indepth explanation [here](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/docs/LocatorSchemaPath-explanation.md).

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

We havn't introduced them yet, but as it stands, if we were to invoke any of POMWright's methods with any of these LocatorSchemaPath's we'd get a "not implemented" error, thus we need to add our LocatorSchema's which our LocatorSchemaPath's will reference.

The LocatorSchema interface lets us define an object for creating a Locator with any of Playwright's locator methods, I advise you to read the more indepth explanation [here](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/docs/LocatorSchema-explanation.md) or the interface itself [here](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/src/helpers/locatorSchema.interface.ts#L28).

Now lets add our LocatorSchema, we do this through the `initLocatorSchemas()` method, through the POC's `locators` property which it gets from extending BasePage. The `locators` property is an instance of the GetLocatorBase class, which handles LocatorSchema management and provides the POC with POMWright's locator methods, see [get-locator-methods-explanation.mb](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/docs/get-locator-methods-explanation.md) for further details.

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

For an indepth explanation of POMWright's locator methods, see [get-locator-methods-explanation.md](https://github.com/DyHex/POMWright/blob/docs/improve-documentation/docs/get-locator-methods-explanation.md)

To make sure we can use Playwright test.step in our helper method, we'll import test from Playwright through POMWright.

```TS
// login.page.ts
import type { Page, TestInfo } from "@playwright/test";
import { BasePage, GetByMethod, type PlaywrightReportLogger, test } from "pomwright";

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

You can extend playwright/test with as many fixtures you want, Playwright will only load the fixtures we specify and whichever fixtures are needed to build them for a given test.
