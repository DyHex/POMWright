# Page objects

`PageObject` is a base class for Playwright's page object pattern: a subclass names its paths, passes its URL and
registers its locators, and gets a registry, a navigation helper, a session storage helper and a check of its
locators. Full rules: [Page objects](https://dyhex.github.io/POMWright/docs/page-objects/).

## Contents

- [Anatomy](#anatomy)
- [When defineLocators() runs, and what it can read](#when-definelocators-runs-and-what-it-can-read)
- [Actions after navigation](#actions-after-navigation)
- [How a mistake is reported](#how-a-mistake-is-reported)
- [A base class for each app](#a-base-class-for-each-app)

## Anatomy

```ts title="login.locators.ts"
import type { LocatorRegistry } from "pomwright";

export type Paths =
  | "main"
  | "main.form@login"
  | "main.form@login.input@email"
  | "main.form@login.input@password"
  | "main.form@login.button@login";

export function defineLocators(registry: LocatorRegistry<Paths>) {
  registry.add("main").getByRole("main");
  registry.add("main.form@login").getByRole("form", { name: "Log in" });
  registry.add("main.form@login.input@email").getByLabel("Email");
  registry.add("main.form@login.input@password").getByLabel("Password");
  registry.add("main.form@login.button@login").getByRole("button", { name: "Log in" });
}
```

```ts title="login.page.ts"
import type { Page } from "@playwright/test";
import { PageObject, step } from "pomwright";
import { defineLocators, type Paths } from "./login.locators";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/login");
  }

  protected defineLocators(): void {
    defineLocators(this.locatorRegistry);
  }

  @step()
  async logIn(options: { email: string; password: string }) {
    await this.getNestedLocator("main.form@login.input@email").fill(options.email);
    await this.getNestedLocator("main.form@login.input@password").fill(options.password);
    await this.getNestedLocator("main.form@login.button@login").click();
  }
}
```

- `PageObject<Paths>` takes the path union; a second type argument, `PageObjectTypeOptions`, declares a RegExp URL
  part or a session storage schema.
- `super(page, baseUrl, urlPath, options?)`: the page, the origin, the page's path, and `label` (the name in steps and
  errors, the class name by default), `navOptions`, `sessionStorage`, `locators` (`{ strictChains }`).
- `defineLocators()` is the one method every page object implements: `this.add(…)` calls, or a locator module called
  with `this.locatorRegistry`.
- A page object offers `add`, `getNestedLocator`, `getLocator`, `getLocatorSchema`, `page`, `baseUrl`, `urlPath`,
  `fullUrl`, `label`, `navigation` and `sessionStorage`.
- Its actions and checks are `@step()` methods; one with two or more parameters takes one options object.

## When defineLocators() runs, and what it can read

`PageObject` does not call `defineLocators()` from its constructor. It runs once, right after the code that called
`new` has finished, or at the first locator call if that comes first, followed by the registry's check. So it can read
everything the subclass's constructor sets, its arguments and parameter properties included:

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

const loginLabel = { en: "Log in", nb: "Logg inn" } as const;

export class LocalizedLoginPage extends PageObject<"main" | "main.button@login"> {
  constructor(
    page: Page,
    private readonly locale: "en" | "nb",
  ) {
    super(page, "https://shop.example", "/login", { label: "LoginPage" });
  }

  protected defineLocators(): void {
    this.add("main").getByRole("main");
    this.add("main.button@login").getByRole("button", { name: loginLabel[this.locale] });
  }

  get loginButton() {
    return this.getNestedLocator("main.button@login");
  }
}
```

- **Resolve locators in getters or methods**, as `loginButton` does, never in a field initializer: a field such as
  `readonly submit = this.getNestedLocator(…)` runs the definition while the class is still being built.
- **It registers synchronously.** What it needs from an `await` is read in the fixture and passed to the constructor;
  an `async defineLocators()` fails the page object.
- **A subclass that validates its arguments does so before `super(…)`**, since the definition scheduled by the
  constructor runs even on an object whose constructor threw afterwards.
- Every page object has its own registry; definitions may depend on the instance.

## Actions after navigation

`pageActionsToPerformAfterNavigation()` returns what the page needs before a test may use it, run after
`navigation.goto()` to this page and after `navigation.expectThisPage()`: the conditions that say "this page has
loaded". It is optional and read each time, so it can use the page object's current state:

```ts
import { expect, type Page } from "@playwright/test";
import { PageObject } from "pomwright";

export class DashboardPage extends PageObject<"main" | "main.progressbar@loading"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/dashboard");
  }

  protected defineLocators(): void {
    this.add("main").getByRole("main");
    this.add("main.progressbar@loading").getByRole("progressbar");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [
      async () => {
        await expect(this.getNestedLocator("main.progressbar@loading")).toBeHidden();
      },
    ];
  }
}
```

`{ runPostNavigationActions: false }` on `goto()` or `expectThisPage()` skips them for one call. Under the
`noImplicitOverride` compiler option the method takes `override`.

## How a mistake is reported

A mistake in `defineLocators()`, or one the check finds, fails the page object with its label and every failing path,
the original error as `cause`, and the `new` line in the stack:

```text
LoginPage: Locator registry verification failed for 1 of 5 paths:
  "main.form@login": No locator schema registered for path "main.form@login.heading".
```

Built in a fixture, the page object fails the test before its body runs, which is why page objects reach tests as
fixtures. `new` itself does not throw for such a mistake; the page object keeps the error and every later locator call
throws it again.

## A base class for each app

Every page object of one app extends that app's abstract base class, which fixes the origin (from the environment),
the navigation defaults, `strictChains` if the project wants it, and the locators and methods every page shares; a
subclass passes only its own path. The project-structure guide and its templates show it; the site's
[Organizing a project](https://dyhex.github.io/POMWright/docs/organizing-a-project/#a-base-class-for-your-site) has the
pattern with RegExp paths and a storage schema.
