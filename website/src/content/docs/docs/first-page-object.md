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
- How one locator is reused at a second path
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
  | "main.aside"
  | "main.aside.button@login"
  | "main.form@login"
  | "main.form@login.input@email"
  | "main.form@login.input@password"
  | "main.form@login.button@login";
```

The union is the list of everything the page object can locate. TypeScript checks every path you pass against it
and offers the paths as completions.

## Write the page object

```ts title="login.page.ts"
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

type Paths =
  | "main"
  | "main.aside"
  | "main.aside.button@login"
  | "main.form@login"
  | "main.form@login.input@email"
  | "main.form@login.input@password"
  | "main.form@login.button@login";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.aside").locator("aside");
    this.add("main.aside.button@login").getByRole("button", { name: "Log in" });
    this.add("main.form@login").getByRole("form", { name: "Log in" });
    this.add("main.form@login.input@email").getByLabel("Email");
    this.add("main.form@login.input@password").getByLabel("Password");
    this.add("main.form@login.button@login", { reuse: "main.aside.button@login" });
  }

  async logIn(email: string, password: string) {
    await this.getNestedLocator("main.form@login.input@email").fill(email);
    await this.getNestedLocator("main.form@login.input@password").fill(password);
    await this.getNestedLocator("main.form@login.button@login").click();
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
- The two "Log in" buttons are found the same way and differ only in where they are, which their paths say. So the
  form's button reuses the aside's: `add(path, { reuse: "main.aside.button@login" })` registers a copy of that path's
  locator at the new path. A path you reuse is registered before the copy; see
  [Reusing locators](/POMWright/docs/reusing-locators/#reuse-by-path).

## What a path resolves to

`getNestedLocator(path)` returns a Playwright [`Locator`](https://playwright.dev/docs/api/class-locator) that chains
the locator of every segment of the path, from the first to the last. In `logIn` above,
`this.getNestedLocator("main.form@login.button@login")` is the locator you would otherwise write by hand:

```ts
import type { Page } from "@playwright/test";

declare const page: Page;
// ---cut---
page.locator("main").getByRole("form", { name: "Log in" }).getByRole("button", { name: "Log in" });
```

Each step of the chain searches inside the previous one, as
[matching inside a locator](https://playwright.dev/docs/locators#matching-inside-a-locator) does in Playwright, so
the button in the aside does not match; `getNestedLocator("main.aside.button@login")` finds that one, as
`locator('main').locator('aside').getByRole('button', { name: 'Log in' })`. The result is an ordinary `Locator`:
actions wait for the element, and [strictness](https://playwright.dev/docs/locators#strictness) applies. Its
description is its path, so the HTML report and the [trace viewer](https://playwright.dev/docs/trace-viewer)'s list of
actions show `Click main.form@login.button@login` instead of the chain. The chain is one click away: select the action
in the trace viewer, and its **Call** tab shows it as the `locator` parameter, and its **Log** tab starts with
`waiting for locator('main').getByRole('form', { name: 'Log in' })…`.

`getLocator(path)` resolves the path's own locator without its ancestors. `getLocator("main.aside.button@login")` is
`getByRole('button', { name: 'Log in' })` on the whole page, which matches both buttons. It is meant for building a
chain yourself, for a filter, for every element of one kind at once, such as all the "Log in" buttons, and for any
other use that needs the locator without its context, as [Resolving locators](/POMWright/docs/resolving-locators/)
explains.

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
This first test creates its page object itself, to keep it short. A suite hands page objects to its tests as
[fixtures](https://playwright.dev/docs/test-fixtures) instead, as Playwright's
[page object models](https://playwright.dev/docs/pom) guide does: the test names the page objects it uses, and
Playwright creates them for it. Every later example on this site gets its page objects that way.
:::

With a `loginPage` fixture and one for the account page the customer lands on, the same test reads as steps on the
two pages. `expectThisPage()` replaces the URL assertion: it waits until the browser is on the account page.

```ts
import { test } from "./fixtures";

test("a registered customer can log in", async ({ loginPage, accountPage }) => {
  await loginPage.navigation.goto();
  await loginPage.logIn("ada@shop.example", "correct horse");

  await accountPage.navigation.expectThisPage();
});
```

[Page objects in tests](/POMWright/docs/page-objects-in-tests/) writes the `fixtures.ts` this test imports.

## What's next

- [Page objects in tests](/POMWright/docs/page-objects-in-tests/): page objects as fixtures
- [Resolving locators](/POMWright/docs/resolving-locators/): `getNestedLocator` and `getLocator` in depth
- [Registering locators](/POMWright/docs/registering-locators/): the ten locator methods and their steps
