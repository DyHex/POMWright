---
title: NavigationFor
description: "A page object's navigation helper: goto, expectThisPage and expectAnotherPage, their options, and the UrlMatcher of a page whose URL varies."
---

Every page object has a navigation helper, `navigation`, built from its `baseUrl` and `urlPath`. Its type,
`NavigationFor<BaseUrl, FullUrl>`, follows the page object's URL types: `goto()` without a target exists only when
`fullUrl` is a string, and on a RegExp `baseUrl` `goto(target)` takes an absolute URL only. Each method is one
Playwright call, with Playwright's waits and timeouts, and a step of the report at the line that called it.

```ts
import { test } from "./fixtures";

test("the account link", async ({ loginPage }) => {
  await loginPage.navigation.goto(); // step: LoginPage: Navigate to this Page
  await loginPage.logIn("ada@shop.example", "correct horse");
  await loginPage.navigation.expectAnotherPage(); // step: LoginPage: Expect any other Page
  await loginPage.navigation.goto("/account"); // step: LoginPage: Navigate to https://shop.example/account
});
```

Guide: [URLs and navigation](/POMWright/docs/urls-and-navigation/).

---

## Methods

### expectAnotherPage()

Waits until the browser has left this page, with one
[`page.waitForURL()`](https://playwright.dev/docs/api/class-page#page-wait-for-url), and fails if it came straight back.
See [navigating](/POMWright/docs/urls-and-navigation/#navigating).

**Usage**

```ts
import type { LoginPage } from "./login.page";

declare const loginPage: LoginPage;
// ---cut---
await loginPage.navigation.expectAnotherPage({ timeout: 10_000 });
```

**Arguments**

- `options` [NavigationOptions](#navigationoptions) *(optional)*

**Returns**

- Promise\<void\>

**Throws**

```text
OrdersPage: expected to have left "https://shop.example/orders"; found "https://shop.example/orders" (page.waitForURL: Timeout 15000ms exceeded.)
OrdersPage: left "https://shop.example/orders" but returned to it; found "https://shop.example/orders"
```

### expectThisPage()

Waits until the browser is on this page, with one `page.waitForURL()`, then runs the page object's
[actions after navigation](/POMWright/api/class-pageobject/#pageactionstoperformafternavigation). See
[navigating](/POMWright/docs/urls-and-navigation/#navigating).

**Usage**

```ts
import type { LoginPage } from "./login.page";

declare const loginPage: LoginPage;
// ---cut---
await loginPage.navigation.expectThisPage();
await loginPage.navigation.expectThisPage({ runPostNavigationActions: false, waitUntil: "domcontentloaded" });
```

**Arguments**

- `options` [ThisPageOptions](#thispageoptions) *(optional)*

**Returns**

- Promise\<void\>

**Throws**

```text
OrdersPage: expected URL "https://shop.example/orders"; found "https://shop.example/orders?tab=1" (page.waitForURL: Timeout 15000ms exceeded.)
```

Playwright's error is the `cause`.

### goto()

Navigates with [`page.goto()`](https://playwright.dev/docs/api/class-page#page-goto): without a target to `fullUrl`,
then runs the actions after navigation; with a target to that URL, resolved against `baseUrl` as Playwright resolves
one against [`baseURL`](https://playwright.dev/docs/api/class-testoptions#test-options-base-url), without the actions.
See [navigating](/POMWright/docs/urls-and-navigation/#navigating).

**Usage**

```ts
import type { LoginPage } from "./login.page";

declare const loginPage: LoginPage;
// ---cut---
await loginPage.navigation.goto();
await loginPage.navigation.goto("/account");
await loginPage.navigation.goto("?tab=2", { waitUntil: "domcontentloaded" });
await loginPage.navigation.goto("https://help.shop.example/");
```

**Arguments**

- `target` string *(optional)*

  A path, a query, or an absolute URL. On a RegExp `baseUrl`, an absolute URL. Without it, the page itself; that
  form exists only when `fullUrl` is a string.

- `options` [NavigationOptions](#navigationoptions), or [ThisPageOptions](#thispageoptions) without a target
  *(optional)*

**Returns**

- Promise\<void\>

**Throws**

What `page.goto()` throws. From JavaScript, on a page object whose URL is a RegExp:

```text
AccountPage: goto() without a URL needs a string fullUrl; this page object has a RegExp URL. Pass an absolute URL instead.
AccountPage: goto("/account") needs an absolute URL because baseUrl is a RegExp.
```

---

## NavigationOptions

The options of every navigation method, and the type of a page object's `navOptions`. Each option comes from the call,
then from `navOptions`, then from Playwright; see
[options and timeouts](/POMWright/docs/urls-and-navigation/#options-and-timeouts).

### timeout

`number` *(optional)*

The limit of the method's one waiting call, in milliseconds. Defaults to the project's
[`navigationTimeout`](https://playwright.dev/docs/api/class-testoptions#test-options-navigation-timeout).

### waitUntil

`"load" | "domcontentloaded" | "networkidle" | "commit"` *(optional)*

The load state to wait for, as `page.goto()` and `page.waitForURL()` take it. Playwright's default is `"load"`.

## ThisPageOptions

The options of `goto()` without a target and of `expectThisPage()`: `timeout` and `waitUntil`, and:

### runPostNavigationActions

`boolean` *(optional)*

`false` skips the page object's actions after navigation for this call. Defaults to `true`.

---

## UrlMatcher

The `fullUrl` of a page object whose `baseUrl` or `urlPath` is a RegExp: a URL predicate that tests the origin against
the base and the rest of the URL against the path, which
[`page.waitForURL()`](https://playwright.dev/docs/api/class-page#page-wait-for-url),
[`toHaveURL()`](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-url) and
[`page.route()`](https://playwright.dev/docs/api/class-page#page-route) take.

```ts
import { expect, type Page } from "@playwright/test";
import type { UrlMatcher } from "pomwright";

declare const page: Page;
declare const accountPage: { fullUrl: UrlMatcher };
// ---cut---
await expect(page).toHaveURL(accountPage.fullUrl);
const onAccountPage = accountPage.fullUrl.test(page.url());
```

See [pages whose URL varies](/POMWright/docs/urls-and-navigation/#pages-whose-url-varies).

### base

`string | RegExp`

The `baseUrl` the page object was constructed with.

### path

`string | RegExp`

The `urlPath` the page object was constructed with.

### test()

Tests a URL, as the predicate does.

**Arguments**

- `url` string | URL

**Returns**

- boolean

### toString()

A readable form, used in step titles and error messages: `origin "https://shop.example" + path /^\/account\/\d+$/`.

**Returns**

- string
