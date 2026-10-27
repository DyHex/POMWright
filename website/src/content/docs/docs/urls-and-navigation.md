---
title: URLs and navigation
description: "A page object's baseUrl and urlPath, the fullUrl they make, the navigation helper's goto, expectThisPage and expectAnotherPage, and pages whose URL varies."
---

## Introduction

Playwright resolves a relative `page.goto("/login")` against the project's
[`baseURL`](https://playwright.dev/docs/api/class-testoptions#test-options-base-url), and waits for a URL with
[`page.waitForURL()`](https://playwright.dev/docs/api/class-page#page-wait-for-url). POMWright gives every page object
its own base, the `baseUrl`, and its own path, the `urlPath`, so a suite that spans several sites needs no shared
setting, and builds a navigation helper from them: `goto` to go there, `expectThisPage` and `expectAnotherPage` to wait
until the browser is there or has left. Each is one Playwright call, with Playwright's waits and timeouts.

## `baseUrl` and `urlPath`

A string `baseUrl` is an origin: scheme, host and an optional port, with or without a trailing slash, and nothing
after it (`https://shop.example`, `http://localhost:9000`). A string `urlPath` is `""` for the origin itself, or starts
with exactly one `/` (`/login`, `/orders?tab=open`). The constructor checks both, so a value from the environment is
checked like a literal:

```text
LoginPage: baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "shop.example".
LoginPage: urlPath must be "" or start with exactly one "/"; received "login".
LoginPage: urlPath must be a path on the page object's origin; received "/\\login.example/account", which names the host "login.example" instead. A "/" followed by another "/" or a "\", also with a tab or line break between them, starts a host.
LoginPage: baseUrl must be a string or a RegExp; received undefined.
```

`localhost:9000` without a scheme and a base with a path are rejected: Playwright could not resolve paths against the
first, and would drop the path of the second for every path that starts with `/`. A base that ends in a bare `?` or
`#` is rejected too, and so is a scheme without an origin in the URL standard, such as `chrome-extension://…/` or
`file://…/`: there is no origin to resolve paths against or compare URLs with. A path that starts with `//` names another host, and so does one whose first `/` is followed by a
backslash, or by a tab or line break and then `/` or a backslash: the URL standard reads a backslash as `/` and drops
tabs and line breaks. The constructor resolves the path and rejects it when it leaves the base's origin.

:::note
A base with credentials, `http://user:secret@shop.example`, is accepted and works: browsers send them when the server
asks. But the credentials are part of every URL the page object shows, `fullUrl`, step titles and error messages, so
they reach reports and traces:

```text
AccountPage: expected to have left "http://user:secret@shop.example/account"; found "http://user:secret@shop.example/account" (page.waitForURL: Timeout 500ms exceeded.)
```

And Playwright's `expect(page).toHaveURL(fullUrl)` fails with them on every browser, which POMWright cannot change: it
compares the document's URL, which browsers give without credentials, where `page.url()`, `page.waitForURL()` and
POMWright's navigation methods keep them.

Give them to Playwright instead, with the `httpCredentials` option
([HTTP authentication](https://playwright.dev/docs/network#http-authentication)), and keep the base an origin without
them.
:::

## `fullUrl`

For two strings, `fullUrl` is `new URL(urlPath, baseUrl).href`, the URL in the form the browser reports it:

| `baseUrl` | `urlPath` | `fullUrl` |
| --- | --- | --- |
| `"https://shop.example"` | `""` | `https://shop.example/` |
| `"https://shop.example/"` | `"/login"` | `https://shop.example/login` |
| `"https://shop.example"` | `"/søk"` | `https://shop.example/s%C3%B8k` |
| `"http://localhost:9000"` | `"/orders?tab=1"` | `http://localhost:9000/orders?tab=1` |

Every browser writes a `^` in the path as `%5E`, as `new URL` does on Node 24 while Node 20 and 22 keep it, so
`fullUrl` writes `%5E` on every Node version. One character is reported differently by the browsers: Chromium writes a
`|` in the path as `%7C`, where Firefox, WebKit and `fullUrl` keep it. So for a path with `|`,
`expect(page).toHaveURL(fullUrl)` fails on Chromium; `expectThisPage()` treats `|` and `%7C` as one and matches on
every browser, as it does `^` and `%5E`.

A string `fullUrl` is exact in Playwright's `expect(page).toHaveURL()`, which never matches it for a base with
credentials (see
[`baseUrl` and `urlPath`](/POMWright/docs/urls-and-navigation/#baseurl-and-urlpath)). In `page.waitForURL()` and `page.route()` Playwright reads a
string as a glob, where `*`, `**` and a `{a,b}` group are patterns; the navigation helper's own waits use a matcher
instead.

## Navigating

Every page object has a `navigation` helper:

| method | does |
| --- | --- |
| `goto(options?)` | `page.goto(fullUrl)`, then the page object's [actions after navigation](/POMWright/docs/page-objects/#actions-after-navigation) |
| `goto(target, options?)` | `page.goto` to `target`, resolved against `baseUrl` exactly as Playwright resolves against `baseURL` (`goto("/account")`, `goto("?tab=2")`), and an absolute URL as it is, on any domain (`goto("https://help.example/faq")`); never runs the actions |
| `expectThisPage(options?)` | one `page.waitForURL` for this page's URL, then the actions |
| `expectAnotherPage(options?)` | one `page.waitForURL` for any other URL, then a check that the browser did not come straight back |

```ts
import { test } from "./fixtures";

test("the account link", async ({ loginPage }) => {
  await loginPage.navigation.goto();
  await loginPage.logIn("ada@shop.example", "correct horse");
  await loginPage.navigation.expectAnotherPage();
  await loginPage.navigation.goto("/account");
});
```

As with `page.goto`, a complete URL is used as it is, so `goto(target)` also leaves the page object's origin:
`loginPage.navigation.goto("https://help.example/faq")` goes from `https://shop.example` to the help site.

A page's identity is its exact URL: `/orders?tab=1` is not `/orders` for `expectThisPage`, and counts as another page
for `expectAnotherPage`. The same holds for an empty query or fragment, `/orders?` or `/orders#`, as it does for
Playwright's `toHaveURL`; a page that may carry one has a RegExp path such as `/^\/orders\??$/`. When the URL is
already right, `page.waitForURL` returns at once, after the requested load state, so calling `expectThisPage()` after
a navigation that has already landed is fine. A `goto(target)` whose target happens to equal `fullUrl` is ordinary
navigation and does not run the actions.

Each call is a step of the report (`LoginPage: Navigate to this Page`, `LoginPage: Expect this Page`, …), shown at the
line that called it.

## Options and timeouts

```ts
type NavigationOptions = {
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  timeout?: number;
};
```

`goto()` and `expectThisPage()` also take `runPostNavigationActions: false`. Each option comes from the call, then
from the page object's `navOptions`, then from Playwright: `waitUntil` defaults to `"load"`, and `timeout` to the
project's [`navigationTimeout`](https://playwright.dev/docs/api/class-testoptions#test-options-navigation-timeout).
POMWright sets no timeout or load state of its own, and every method makes one waiting call, so its limit is one
timeout:

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

export class OrdersPage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/orders", {
      navOptions: { waitUntil: "domcontentloaded", timeout: 15_000 },
    });
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
  }
}
```

A wait that times out names the page object, what it expected and the URL found, with Playwright's error as `cause`:

```text
OrdersPage: expected URL "https://shop.example/orders"; found "https://shop.example/orders?tab=1" (page.waitForURL: Timeout 15000ms exceeded.)
OrdersPage: expected to have left "https://shop.example/orders"; found "https://shop.example/orders" (page.waitForURL: Timeout 15000ms exceeded.)
OrdersPage: left "https://shop.example/orders" but returned to it; found "https://shop.example/orders"
```

## Pages whose URL varies

A `baseUrl` or `urlPath` may be a RegExp: an account page at `/account/42`, or a login page on an identity provider
whose host changes between environments. Declare which in the page object's second type argument:

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

export class AccountPage extends PageObject<"main", { urlPathType: RegExp }> {
  constructor(page: Page) {
    super(page, "https://shop.example", /^\/account\/\d+$/);
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
  }
}
```

`fullUrl` is then a `UrlMatcher`, which tests the two parts of a URL separately, each part as written, with its own
flags; a string part must match exactly:

```mermaid
flowchart LR
  url["https://login.identity-provider.example/authorize?client=shop"] --> origin["the origin<br/>https://login.identity-provider.example"]
  url --> rest["the rest: path, query, hash<br/>/authorize?client=shop"]
  origin -->|tested by| base["baseUrl"]
  rest -->|tested by| path["urlPath"]
```

| `baseUrl` + `urlPath` | matches `https://login.identity-provider.example/authorize?client=shop` |
| --- | --- |
| `/identity-provider/` + `/\/authorize/` | yes |
| `/identity-provider/` + `"/authorize"` | no: a string path is exact, and the query follows |
| `/\.example$/` + `/^\/authorize\?client=\w+$/` | yes |
| `/authorize/` + `/\/authorize/` | no: the base only sees the origin |
| `"https://login.identity-provider.example/"` + `/\/authorize/` | yes |

So `^` and `$` on a base refer to the origin, a path prefix belongs in `urlPath`, and `$` on a base includes the port
(`/example(?::\d+)?$/` allows one). A `UrlMatcher` works wherever Playwright takes a URL predicate:
`page.waitForURL(fullUrl)`, `expect(page).toHaveURL(fullUrl)`, `page.route(fullUrl, …)`. It also has `test(url)`,
`base`, `path`, and a readable `toString()` (`origin "https://shop.example" + path /^\/account\/\d+$/`).

Such a page has no single URL to go to, so `goto()` without a target is not available (a compile error, and from
JavaScript: `AccountPage: goto() without a URL needs a string fullUrl; this page object has a RegExp URL. Pass an
absolute URL instead.`). `goto(target)` still works; on a RegExp `baseUrl` the target must be absolute.

A page whose query varies, `/orders?tab=2` and `/orders?tab=3` alike, is such a page too:
`urlPath: /^\/orders\?tab=\d+$/`. A page with one fixed query is a string: `urlPath: "/orders?tab=2"`.

## Reference

- [Navigation](/POMWright/api/class-navigation/): `NavigationFor`, `NavigationOptions`, `ThisPageOptions`, `UrlMatcher`
- [`PageObject` constructor](/POMWright/api/class-pageobject/#new-pageobject)
- Playwright: [`baseURL`](https://playwright.dev/docs/api/class-testoptions#test-options-base-url),
  [`page.goto()`](https://playwright.dev/docs/api/class-page#page-goto),
  [`page.waitForURL()`](https://playwright.dev/docs/api/class-page#page-wait-for-url),
  [`toHaveURL()`](https://playwright.dev/docs/api/class-pageassertions#page-assertions-to-have-url)
