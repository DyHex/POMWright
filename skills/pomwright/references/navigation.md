# URLs and navigation

A page object's `baseUrl` and `urlPath`, the `fullUrl` they make, and its `navigation` helper. Full rules:
[URLs and navigation](https://dyhex.github.io/POMWright/docs/urls-and-navigation/).

## Contents

- [baseUrl and urlPath](#baseurl-and-urlpath)
- [The navigation helper](#the-navigation-helper)
- [Options and timeouts](#options-and-timeouts)
- [Pages whose URL varies](#pages-whose-url-varies)

## baseUrl and urlPath

Every page object has its own origin, `baseUrl`, and its own path, `urlPath`, so one Playwright project tests several
sites without a shared `baseURL`. The origin comes from the app's base class, read from the environment; a page object
passes only its path. Playwright's `baseURL` works beside it, and is a project's decision: set from the same value, it
makes Playwright's relative URLs reach the page objects' origin.

- A string `baseUrl` is an origin: scheme, host, optional port, nothing after it (`https://shop.example`,
  `http://localhost:9000`).
- A string `urlPath` is `""` for the origin itself or starts with exactly one `/` (`/login`, `/orders?tab=open`).
- The constructor checks both, so a malformed value from the environment fails when the page object is constructed,
  naming it.
- `fullUrl` is `new URL(urlPath, baseUrl).href`, the form the browser reports.
- Credentials belong in Playwright's `httpCredentials` option, not in `baseUrl`, where they would show in every step
  title and message, and where `expect(page).toHaveURL(fullUrl)` cannot match them.

## The navigation helper

| method | does |
| --- | --- |
| `navigation.goto(options?)` | `page.goto(fullUrl)`, then the page object's actions after navigation |
| `navigation.goto(target, options?)` | `page.goto` to `target`, resolved against `baseUrl` as Playwright resolves against `baseURL` (`"/account"`, `"?tab=2"`); an absolute URL as it is; never runs the actions |
| `navigation.expectThisPage(options?)` | one `page.waitForURL` for this page's URL, then the actions |
| `navigation.expectAnotherPage(options?)` | one `page.waitForURL` for any other URL, then a check that the browser did not come straight back |

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

class LoginPage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/login");
  }
  protected defineLocators(): void {
    this.add("main").getByRole("main");
  }
}

class AccountPage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account");
  }
  protected defineLocators(): void {
    this.add("main").getByRole("main");
  }
}

declare const loginPage: LoginPage;
declare const accountPage: AccountPage;

await loginPage.navigation.goto();
// … log in …
await accountPage.navigation.expectThisPage();
```

- A page's identity is its exact URL: `/orders?tab=1` is not `/orders`. A page whose query varies has a RegExp path.
- `expectThisPage()` after a navigation that has already landed returns as soon as the requested load state is there;
  call it on the page a test arrives at, in place of a URL assertion.
- Each call is a step of the report, at the line that called it.

## Options and timeouts

`waitUntil` (`"load"`, `"domcontentloaded"`, `"networkidle"`, `"commit"`) and `timeout`, and on `goto()` and
`expectThisPage()` also `runPostNavigationActions: false`. Each comes from the call, then from the page object's
`navOptions`, then from Playwright (`"load"`, the project's `navigationTimeout`). POMWright sets no wait or timeout of
its own, and each method makes one waiting call. Set an app's defaults once, in its base class:
`navOptions: { waitUntil: "domcontentloaded" }`.

## Pages whose URL varies

A RegExp `baseUrl` or `urlPath`, declared in the second type argument, for a page such as `/account/42` or a login page
on an identity provider whose host changes between environments:

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

export class AccountPage extends PageObject<"main", { urlPathType: RegExp }> {
  constructor(page: Page) {
    super(page, "https://shop.example", /^\/account\/\d+$/);
  }

  protected defineLocators(): void {
    this.add("main").getByRole("main");
  }
}
```

- `fullUrl` is then a `UrlMatcher`: the base tested against the origin, the path against the rest (path, query and
  hash), each as written. It works wherever Playwright takes a URL predicate (`waitForURL`, `toHaveURL`, `route`).
- `goto()` without a target does not exist for such a page (there is no single URL); `goto(target)` does, with an
  absolute target when `baseUrl` is a RegExp.
- `^` and `$` on a RegExp base refer to the origin; a path prefix belongs in `urlPath`.
