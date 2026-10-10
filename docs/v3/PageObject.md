# PageObject (v2)

## Overview

`PageObject` is the core v2 abstraction that wires a Playwright `Page` to:

- A typed locator registry (`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`).
- The navigation helper (`navigation`).
- The session storage helper (`sessionStorage`).

It is intentionally minimal: you provide locator definitions and any post-navigation actions, then compose additional behavior on top.

---

## Constructor and generics

```ts
export abstract class PageObject<
  LocatorSchemaPathType extends string,
  Options extends UrlTypeOptions = { baseUrlType: string; urlPathType: string },
> {
  protected constructor(
    page: Page,
    baseUrl: BaseUrlTypeFromOptions<Options>,
    urlPath: UrlPathTypeFromOptions<Options>,
    options?: {
      label?: string;
      navOptions?: NavigationOptions;
      sessionStorage?: { schema?: StorageTypeFromOptions<Options> };
    },
  )
}
```

### `LocatorSchemaPathType`

A literal union of dot-delimited locator paths. The registry validates this union at compile time and runtime.

```ts
type Paths =
  | "common.spinner"
  | "main"
  | "main.form@login"
  | "main.form@login.input@username"
  | "main.form@login.input@password"
  | "main.button@login";
```

### `Options` (`UrlTypeOptions`)

`UrlTypeOptions` declares which of `baseUrl` and `urlPath` are RegExps, both defaulting to `string`, and names
the session storage schema the page object's helper is typed with:

```ts
type UrlTypeOptions = {
  baseUrlType?: string | RegExp;
  urlPathType?: string | RegExp;
  storage?: SessionStorageSchema; // codecs by key; see session-storage.md
};
```

- With two strings, `fullUrl` is the resolved URL string and every navigation method is available.
- When either is a `RegExp`, `fullUrl` is a `UrlMatcher` (see *How `fullUrl` is composed*), `goto()` without a target is
  unavailable, and on a RegExp `baseUrl` `goto(target)` accepts only absolute URLs.
- `storage` types `sessionStorage` (`StorageTypeFromOptions<Options>`), so `set`, `get` and `seed` know each declared
  key's type; the schema value itself is passed in the constructor options. Without it every key is a string. It lives
  in this options bag rather than in a generic of its own because generics cannot be skipped: a subclass with a schema
  would otherwise have to spell out the URL defaults.

```ts
const loginStorage = { user: json<User>() };

class LoginPage extends PageObject<Paths, { storage: typeof loginStorage }> {
  constructor(page: Page) {
    super(page, "https://app.example", "/login", { sessionStorage: { schema: loginStorage } });
  }
  // …
}

class AccountPage extends PageObject<Paths, { urlPathType: RegExp; storage: typeof loginStorage }> { /* … */ }
```

#### String `baseUrl`: a non-empty origin

`scheme://host[:port]`, with or without a trailing slash: `https://app.example`, `https://app.example/`,
`http://localhost:9000`. No path, query, or hash; not scheme-less (`localhost:9000` is rejected, and Playwright's own
`baseURL` cannot resolve paths against it either); not empty. POMWright resolves relative targets against it exactly as
Playwright resolves `page.goto` against `use.baseURL`, so each page object can carry its own base.

#### String `urlPath`: `""` or a single-slash path

`""` is the homepage; otherwise the value starts with exactly one `/`: `/login`, `/app/login`, `/orders?tab=1`.
`login`, `?tab=1`, `#section`, absolute URLs, and `//other.example/x` are rejected (a leading `//` would resolve to
another host).

Both are plain `string` parameters: literals, variables, and environment values are passed directly. The constructor
validates every value and throws with the class name and the reason:

```
ShopLogin: baseUrl must be an origin such as "https://example.com" or "http://localhost:9000"
(scheme, host, optional port, no path, query or hash); received "localhost:9000".
```

```ts
abstract class ShopApp<Paths extends string> extends PageObject<Paths> {
  protected constructor(page: Page, urlPath: string) {
    super(page, process.env.SHOP_BASE_URL ?? "http://localhost:9000", urlPath);
  }
}
```

#### How `fullUrl` is composed

Two strings: `new URL(urlPath, baseUrl).href`. `https://app.example` + `/login` is `https://app.example/login`;
`https://app.example` + `""` is `https://app.example/`, the form the browser reports.

A RegExp in either part: `fullUrl` is a `UrlMatcher`, a predicate `(url: URL) => boolean` that tests the base against
the URL's origin (`scheme://host:port`) and the path against the rest (`pathname + search + hash`). A string part is
exact; a RegExp part runs as written, with its own flags. Nothing is concatenated, so a substring base needs no tail,
and `^` and `$` mean the start and end of the origin on the base and of the rest on the path.

| `baseUrl` + `urlPath` | matches `https://login.identity-provider.example/authorize?client=shop` |
| --- | --- |
| `/identity-provider/` + `/\/authorize/` | yes |
| `/identity-provider/` + `"/authorize"` | no: a string path is exact and the query follows |
| `/\.example$/` + `/^\/authorize\?client=\w+$/` | yes |
| `/authorize/` + `/\/authorize/` | no: the base only sees the origin |
| `"https://login.identity-provider.example/"` + `/\/authorize/` | yes |

A base regex that contains a path prefix never matches, so the prefix belongs in `urlPath`; `$` on a base regex includes
the port, so use `(?::\d+)?$` when it varies. A `UrlMatcher` is accepted by `page.waitForURL`,
`expect(page).toHaveURL`, and `page.route`, and exposes `.base`, `.path`, `.test(url)`, and a readable `toString()`.

### Constructor options

- `label`: Optional label used in navigation and session storage step titles and in error messages. Defaults to the
  class name.
- `navOptions`: Default `NavigationOptions` (`waitUntil`, `timeout`) for the navigation helper; every method can
  override them per call.
- `sessionStorage.schema`: The codecs by key, whose type is named by the `storage` member of `Options`.

---

## Required abstract methods

### `defineLocators()`

Define every locator path for the page using the v2 registry DSL (`add(...).getByRole(...)`, etc.). This is called in the constructor before navigation is created.

### `pageActionsToPerformAfterNavigation()`

Return a list of async callbacks to run after `goto()` without a target and after `expectThisPage()`.

- Return `[]` to run no actions.
- Return `null` to skip the actions list entirely.

---

## Public properties

| Property | Type | Purpose |
| --- | --- | --- |
| `page` | `Page` | Playwright `Page` instance. |
| `baseUrl` / `urlPath` | `string` or `RegExp` | The values passed to the constructor, typed by `UrlTypeOptions`. |
| `fullUrl` | `string` or `UrlMatcher` | The resolved URL for two strings; a structured matcher when either part is a RegExp. |
| `label` | `string` | Label used for navigation and session storage steps. |
| `sessionStorage` | `SessionStorage<StorageTypeFromOptions<Options>>` | Session storage helper, labeled with `label`, bound to the origin of a string `baseUrl`, typed by the `storage` option. |
| `navigation` | `NavigationFor<BaseUrl, FullUrl>` | Navigation helper; the available `goto` forms depend on the URL types. |
| `add` | `AddAccessor<Paths>` | Registry `add` method for locator definitions. |
| `getLocator` | `GetLocatorAccessor<Paths>` | Terminal locator resolver. |
| `getNestedLocator` | `GetNestedLocatorAccessor<Paths>` | Full chained locator resolver. |
| `getLocatorSchema` | `GetLocatorSchemaAccessor<Paths>` | Builder clone for filters/indices/updates. |

---

## Example: basic `PageObject` class

```ts
import { expect, type Page } from "@playwright/test";
import { PageObject, step } from "pomwright";
import type { User } from "testData";

type Paths =
  | "common.spinner"
  | "main"
  | "main.form@login"
  | "main.form@login.input@username"
  | "main.form@login.input@password"
  | "main.button@login";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://example.com", "/login", { label: "LoginPage" });
  }

  protected defineLocators(): void {
    this.add("common.spinner").getByTestId("loading-spinner");
    this.add("main").locator("main");
    this.add("main.form@login").getByRole("form", { name: "Login" });
    this.add("main.form@login.input@username").getByLabel("Username");
    this.add("main.form@login.input@password").getByLabel("Password");
    this.add("main.button@login").getByRole("button", { name: "Login" });
  }

  protected pageActionsToPerformAfterNavigation() {
    return [
      async () => {
        await expect(this.getLocator("common.spinner")).toHaveCount(0);
        await this.getNestedLocator("main.form@login").waitFor({ state: "visible" });
      },
    ];
  }

  @step()
  async loginAsUser(user: User) {
    await this.getNestedLocator("main.form@login.input@username").fill(user.username);
    await this.getNestedLocator("main.form@login.input@password").fill(user.password);
    await this.getNestedLocator("main.button@login").click();
  }
}
```

---

## Navigation helper details

The navigation helper is created automatically and exposed as `pageObject.navigation`. Which `goto` forms exist is
decided by the URL types declared through `Options`; the two `expect` methods always exist.

| method | available | does |
| --- | --- | --- |
| `goto(options?)` | `fullUrl` is a string | `page.goto(fullUrl)`, then `pageActionsToPerformAfterNavigation()` unless `runPostNavigationActions: false` |
| `goto(target, options?)` | always; `target` is any string on a string `baseUrl`, an absolute URL on a RegExp `baseUrl` | `page.goto` to the target; a relative target is resolved against the page object's `baseUrl` exactly as Playwright resolves against `use.baseURL` (`goto("login")`, `goto("/login")`, `goto("?tab=1")`). Never runs the actions |
| `expectThisPage(options?)` | always | one `page.waitForURL` for this page's URL and the requested load state, then the actions unless `runPostNavigationActions: false` |
| `expectAnotherPage(options?)` | always | one `page.waitForURL` for any other URL and the load state of the page the browser moved to, then fails at once if the URL is back on this page (a redirect that bounced) |

`page.waitForURL` resolves immediately, after the requested load state, when the URL already matches, so calling
`expectThisPage()` right after a navigation that has already landed is fine. A `goto(target)` whose target happens to
equal `fullUrl` is ordinary navigation and does not run the actions.

### Options and timeouts

```ts
type NavigationOptions = {
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  timeout?: number;
};
type ThisPageOptions = NavigationOptions & { runPostNavigationActions?: boolean }; // goto() and expectThisPage()
```

Each option resolves per call, then from the page object's `navOptions`, then to Playwright's own default. POMWright
sets no timeout or load state of its own: `page.goto` and `page.waitForURL` keep the project's `use.navigationTimeout`
(Playwright's default is 0, no timeout, so the test timeout governs), and `waitUntil` defaults to `"load"`.
`timeout: 0` disables the timeout, as everywhere in Playwright. Every method makes exactly one waiting call, so its
ceiling is one timeout, never a sum.

```ts
class OrdersPage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://app.example", "/orders", {
      label: "OrdersPage",
      navOptions: { waitUntil: "domcontentloaded", timeout: 15_000 },
    });
  }

  protected defineLocators() {
    this.add("main").locator("main");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}

await ordersPage.navigation.goto({ waitUntil: "load" });
await ordersPage.navigation.goto("/orders/42", { timeout: 5_000 });
await ordersPage.navigation.expectThisPage({ runPostNavigationActions: false });
```

### Failure messages

A wait that times out names the page object, what was expected, and the URL found at failure time, with Playwright's
own error attached as `cause`:

```
OrdersPage: expected URL "https://app.example/orders"; found "https://app.example/orders?tab=1" (page.waitForURL: Timeout 10000ms exceeded.)
AccountPage: expected URL origin "https://app.example" + path /^\/account\/\d+$/; found "https://app.example/login" (page.waitForURL: Timeout 10000ms exceeded.)
OrdersPage: expected to have left "https://app.example/orders"; found "https://app.example/orders" (page.waitForURL: Timeout 10000ms exceeded.)
OrdersPage: left "https://app.example/orders" but returned to it; found "https://app.example/orders"
```

A string page's identity is its exact URL: `/orders?tab=1` is not `/orders` for `expectThisPage`, and it is another
page for `expectAnotherPage`. A page whose identity should tolerate a query is a RegExp page object (see below).

---

## URL typing examples

### All-string URLs (every navigation method)

```ts
class ProfilePage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://app.example", "/profile", { label: "ProfilePage" });
  }

  protected defineLocators() {
    this.add("main").locator("main");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}

await profilePage.navigation.goto(); // https://app.example/profile, then the actions
await profilePage.navigation.goto("/settings"); // https://app.example/settings, no actions
```

### RegExp `urlPath` (a dynamic segment)

```ts
type UrlOptions = { baseUrlType: string; urlPathType: RegExp };

class AccountPage extends PageObject<"main", UrlOptions> {
  constructor(page: Page) {
    super(page, "https://app.example", /^\/account\/\d+$/, { label: "AccountPage" });
  }

  protected defineLocators() {
    this.add("main").locator("main");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}

await accountPage.navigation.goto("/account/42"); // targets are still available
await accountPage.navigation.expectThisPage(); // origin exact, path matches /^\/account\/\d+$/
```

### RegExp `baseUrl` (a third-party host that varies)

```ts
class ConsentPage extends PageObject<"main", { baseUrlType: RegExp; urlPathType: RegExp }> {
  constructor(page: Page) {
    super(page, /identity-provider/, /\/authorize/, { label: "ConsentPage" });
  }

  protected defineLocators() {
    this.add("main").locator("main");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }
}

await consentPage.navigation.expectThisPage(); // any origin containing identity-provider
await consentPage.navigation.goto("https://login.identity-provider.example/authorize"); // absolute URLs only
```

### A page whose identity includes a query

```ts
class OrdersTabPage extends PageObject<"main", { urlPathType: RegExp }> {
  constructor(page: Page) {
    super(page, "https://app.example", /^\/orders\?tab=\d+$/, { label: "OrdersTabPage" });
  }

  protected defineLocators() {
    this.add("main").locator("main");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [];
  }

  async open(tab: number) {
    await this.navigation.goto(`/orders?tab=${tab}`);
    await this.navigation.expectThisPage();
  }
}
```

### Migration from 2.x

- `gotoThisPage()` is `goto()` without a target. Find call sites with `grep -rn 'gotoThisPage(' --include=*.ts .`
- `navOptions.waitForLoadState` is `waitUntil`, which now covers every method. The `"load"` default is Playwright's,
  not POMWright's.
- A string `baseUrl` must be a non-empty origin with a scheme; a string `urlPath` must be `""` or start with exactly
  one `/`. A base that carried a path prefix moves it into `urlPath`.
- On a RegExp page, `fullUrl` is a `UrlMatcher`, not a `RegExp`. Keep passing it to `page.waitForURL`,
  `expect(page).toHaveURL`, or `page.route`; replace `expect(url).toMatch(fullUrl)` with `fullUrl.test(url)`;
  `.source` and `.flags` are `.base` and `.path`. A base regex matches the origin only, flags now apply, and `^` and
  `$` refer to the origin or the rest rather than to a concatenated pattern.
- `goto(target)` resolves `login`, `./x`, and `?tab=1` against the page object's `baseUrl`; 2.x passed them to
  `page.goto` unchanged.
- `expectThisPage` and `expectAnotherPage` are bounded by `use.navigationTimeout` or the `timeout` option; 2.x retried
  an exact comparison without limit.

---

## Accessing locators

- `getLocator(path)` returns the **terminal** locator only (no ancestor chaining).
- `getNestedLocator(path)` returns the **fully chained** locator.
- `getLocatorSchema(path)` returns a mutable clone to add filters, indices, or update/replace definitions before resolving.

```ts
const terminal = loginPage.getLocator("main.form@login.input@username");
const chained = loginPage.getNestedLocator("main.form@login.input@username");

const filtered = loginPage
  .getLocatorSchema("main.form@login.input@username")
  .filter("main.form@login.input@username", { hasText: /User/i })
  .getNestedLocator();
```

---

## SessionStorage helper

`PageObject` constructs `SessionStorage` with its `label`, the origin of a string `baseUrl` (so `seed` needs no
argument and `set`, `get` and `clear` touch only this origin), and the schema given as `sessionStorage.schema`.

```ts
await loginPage.sessionStorage.seed({ token: "abc", user }); // before the app's next load on this origin
await loginPage.navigation.goto();
const user = await loginPage.sessionStorage.get("user"); // typed by the schema
await loginPage.sessionStorage.set("token", "def");
await loginPage.sessionStorage.clear(["token"]);
```

On a RegExp `baseUrl` there is no origin to take: `seed` then needs `{ origin }`, and the other methods follow the
page. See `session-storage.md` for codecs, every hop `seed` supports, multi-origin flows, frames, and service
workers.

---

## Fixture wiring example

```ts
import { test as base } from "@playwright/test";
import type { Page } from "@playwright/test";
import { LoginPage } from "./login.page";

type Fixtures = { loginPage: LoginPage };

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page as Page));
  },
});
```

---

## Key differences vs v1

- `PageObject` replaces `BasePage` and does **not** carry Playwright `testInfo` or a logger.
- Registry APIs are fluent (`add(...).getByRole(...)`) instead of schema objects.
- `getLocator`/`getNestedLocator` are synchronous and do not accept index maps; use `getLocatorSchema(...).nth(...)`.
- Navigation is built into the base class and depends on URL typing.

See the migration docs in `docs/v1-to-v2-migration` for a step-by-step guide.
