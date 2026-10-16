---
title: Your first page object
description: "Name the elements of a page with paths, register one locator per path, and let POMWright build the Playwright locator chain."
---

## Introduction

A [page object](https://playwright.dev/docs/pom) keeps the locators and actions of one page in one class, so that
tests read as steps on that page instead of as selectors. POMWright's `PageObject` adds one idea to the pattern: every
element gets a **path** that says where it sits on the page, you register one locator per path, and POMWright chains
them into the Playwright locator for you.

**You will learn**

- How to name the elements of a page with paths
- How to write a page object and register its locators
- What locator a path resolves to
- How to navigate to the page and use it in a test

## The page

A login page at `https://shop.example/login`. It has a second "Log in" button outside the form, as real pages often
do:

```html
<main>
  <form aria-label="Log in">
    <label>Email <input name="email" /></label>
    <label>Password <input name="password" type="password" /></label>
    <button>Log in</button>
  </form>
  <aside><button>Log in</button></aside>
</main>
```

## Name the elements with paths

A path is a name made of segments separated by dots, one segment for each element the locator should pass through
on its way down the page. The segment names are yours; the `@` in `form@login` is an ordinary character, a convention
for "a form, the login one".

```ts
type Paths =
  | "main"
  | "main.form@login"
  | "main.form@login.input@email"
  | "main.form@login.input@password"
  | "main.form@login.button@submit";
```

The union is the list of everything the page object can locate. TypeScript checks every path you pass against it
and offers the paths as completions.

## Write the page object

```ts title="login.page.ts"
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

type Paths =
  | "main"
  | "main.form@login"
  | "main.form@login.input@email"
  | "main.form@login.input@password"
  | "main.form@login.button@submit";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.form@login").getByRole("form", { name: "Log in" });
    this.add("main.form@login.input@email").getByLabel("Email");
    this.add("main.form@login.input@password").getByLabel("Password");
    this.add("main.form@login.button@submit").getByRole("button", { name: "Log in" });
  }

  async logIn(email: string, password: string) {
    await this.getNestedLocator("main.form@login.input@email").fill(email);
    await this.getNestedLocator("main.form@login.input@password").fill(password);
    await this.getNestedLocator("main.form@login.button@submit").click();
  }
}
```

- `super(page, baseUrl, urlPath)` takes the Playwright page, the origin the page lives on and the page's own path.
  Together they are the page object's URL, `https://shop.example/login`.
- `defineLocators()` registers one locator per path: `add(path)` followed by one of Playwright's locator methods,
  with the same name and arguments as [`page.getByRole()`](https://playwright.dev/docs/api/class-page#page-get-by-role),
  [`page.getByLabel()`](https://playwright.dev/docs/api/class-page#page-get-by-label) or
  [`page.locator()`](https://playwright.dev/docs/api/class-page#page-locator). Each locator describes its element on
  its own; the path says where it is. POMWright calls `defineLocators()` once, right after the page object is
  constructed.

## What a path resolves to

`getNestedLocator(path)` returns a Playwright [`Locator`](https://playwright.dev/docs/api/class-locator) that chains
the locator of every segment of the path, from the first to the last. In `logIn` above,
`this.getNestedLocator("main.form@login.button@submit")` is the locator you would otherwise write by hand:

```ts
import type { Page } from "@playwright/test";

declare const page: Page;
// ---cut---
page.locator("main").getByRole("form", { name: "Log in" }).getByRole("button", { name: "Log in" });
```

Each step of the chain searches inside the previous one, as
[matching inside a locator](https://playwright.dev/docs/locators#matching-inside-a-locator) does in Playwright, so
the button in the aside does not match. The result is an ordinary `Locator`: actions wait for the element, and
[strictness](https://playwright.dev/docs/locators#strictness) applies. Its description is its path, so the HTML
report shows `main.form@login.button@submit` next to the step instead of the chain.

`getLocator(path)` resolves the path's own locator without its ancestors. Here that is
`getByRole('button', { name: 'Log in' })` on the whole page, which matches both buttons; it is meant for building a
chain yourself, as [Resolving locators](/POMWright/docs/resolving-locators/) explains.

## Use it in a test

Every page object has a `navigation` helper built from its URL: `goto()` opens `https://shop.example/login`, and
`expectThisPage()` waits until the browser is there.

```ts title="login.spec.ts"
import { expect, test } from "@playwright/test";
import { LoginPage } from "./login.page";

test("a registered customer can log in", async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.navigation.goto();
  await loginPage.logIn("ada@shop.example", "correct horse");

  await expect(page).toHaveURL("https://shop.example/account");
});
```

Run it with `npx playwright test`, as any Playwright test.

:::note
Creating the page object inside the test keeps this first example short. The next page turns it into a
[fixture](https://playwright.dev/docs/test-fixtures), as Playwright's fixtures guide does with its page objects, and
every later example on this site receives page objects that way.
:::

## What's next

- [Page objects in tests](/POMWright/docs/page-objects-in-tests/): page objects as fixtures
- [Resolving locators](/POMWright/docs/resolving-locators/): `getNestedLocator` and `getLocator` in depth
- [Registering locators](/POMWright/docs/registering-locators/): the ten locator methods and their steps
