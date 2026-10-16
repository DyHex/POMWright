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
  Options extends PageObjectTypeOptions = { baseUrlType: string; urlPathType: string },
> {
  protected constructor(
    page: Page,
    baseUrl: BaseUrlTypeFromOptions<Options>,
    urlPath: UrlPathTypeFromOptions<Options>,
    options?: {
      label?: string;
      navOptions?: NavigationOptions;
      sessionStorage?: { schema?: StorageTypeFromOptions<Options> };
      locators?: { strictChains?: boolean };
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

### `Options` (`PageObjectTypeOptions`)

`PageObjectTypeOptions` declares which of `baseUrl` and `urlPath` are RegExps, both defaulting to `string`, and names
the session storage schema the page object's helper is typed with:

```ts
type PageObjectTypeOptions = {
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
- `locators.strictChains`: `true` makes the automatic `verify()` require every ancestor of every registered path to
  be registered as well (see *`strictChains`* in `locator-registry.md`). A boolean, `false` by default: without it an
  unregistered segment is a name that groups paths and is left out of the chain.

The second type argument, `PageObjectTypeOptions`, names types only; the constructor options are runtime values. One
class that sets every type option and every constructor option:

```ts
import type { Page } from "@playwright/test";
import { json, PageObject } from "pomwright";

const checkoutStorage = { cart: json<{ items: string[] }>() };
type CheckoutPaths = "main" | "main.cart" | "main.cart.checkout";

export class CheckoutPage extends PageObject<
  CheckoutPaths,
  { baseUrlType: string; urlPathType: RegExp; storage: typeof checkoutStorage } // PageObjectTypeOptions: types only
> {
  constructor(page: Page) {
    super(page, "https://shop.example", /\/checkout\/\d+/, {
      label: "Checkout",
      navOptions: { waitUntil: "domcontentloaded", timeout: 15_000 },
      sessionStorage: { schema: checkoutStorage },
      locators: { strictChains: true },
    });
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.cart").getByRole("region", { name: "Cart" });
    this.add("main.cart.checkout").getByRole("button", { name: "Checkout" });
  }
}
```

A project that registers every segment usually sets `strictChains` once, in its domain base class:

```ts
export abstract class Shop<Paths extends string> extends PageObject<Paths> {
  protected constructor(page: Page, urlPath: string, options?: { label?: string }) {
    super(page, "https://shop.example", urlPath, { ...options, locators: { strictChains: true } });
  }
}
```

---

## Hooks and lifecycle

A page object implements one hook and may override a second:

- `defineLocators()` (required) registers the page object's locators with the registry DSL
  (`add(...).getByRole(...)`, etc.).
- `pageActionsToPerformAfterNavigation()` (optional) returns the actions to run after navigating to this page.

### When `defineLocators()` runs, and what it can read

`PageObject` does not call `defineLocators()` from its own constructor. It runs once per page object, right after the
code that called `new` has finished, or at the first locator call (`getNestedLocator`, `getLocator`,
`getLocatorSchema`, `add`, or a `this.locatorRegistry` method) if that comes earlier. In a fixture that is right after
`new LoginPage(page)`, before the test body starts. Nothing needs to be called for this.

So the definition can use everything the page object's own constructor sets: constructor arguments, including
parameter properties, field initialisers, and assignments in the constructor body.

```ts
const loginLabel = { en: "Log in", nb: "Logg inn" } as const;

export class LocalizedLoginPage extends PageObject<Paths> {
  constructor(page: Page, private readonly locale: "en" | "nb") {
    super(page, "https://app.example", "/login", { label: "LoginPage" });
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.button@login").getByRole("button", { name: loginLabel[this.locale] }); // "Logg inn" for "nb"
  }
}
```

A locator module can take the same state as an extra argument, `defineLocators(this.locatorRegistry, this.locale)`; see
[Passing page-object state to a module](./composing-locator-modules.md#passing-page-object-state-to-a-module).

In 2.x `defineLocators()` ran inside `super(...)`, before the page object had stored anything, so `this.locale` was
`undefined` there and the locator above silently lost its name.

### Verification, and how a registry mistake is reported

Right after `defineLocators()` the registry is verified (`verify()` in `locator-registry.md`): every path is resolved
once, without touching the DOM. Most mistakes are compile errors already (a path outside the union, a misspelt `has`
path, a step before a strategy). The rest (a duplicate path, an empty selector, a `has` reference to a path that is
never registered, a cycle) fail right after construction, in the fixture, before the test body, with the page
object's label in the message, the line that constructed the page object in the stack, and the original error as
`cause`:

```
LoginPage: Locator registry verification failed for 1 of 14 paths:
  "list.item": No locator schema registered for path "list.titel".

LoginPage: defineLocators() failed: A locator schema with the path "main" already exists. …

LoginPage: Locator registry verification failed for 1 of 14 paths:
  "main.form.button.save": strictChains requires every ancestor to be registered; "main.form.button" is not.
```

The last form appears only with `locators: { strictChains: true }`.

`new LoginPage(page)` itself does not throw for such a mistake. A test that asserts one does it through a first use,
constructed and used with no `await` in between, so that the use comes first:

```ts
expect(() => new LoginPage(page).getNestedLocator("main")).toThrow("LoginPage: Locator registry verification failed");
```

The error is kept: every later locator call on that page object throws it again, and `defineLocators()` does not run a
second time.

Where the page object is built decides what a test run shows:

| built in | result |
| --- | --- |
| a test-scoped or worker-scoped fixture | the test fails before its body |
| `beforeEach` | each test fails; each body runs until its first use of the page object |
| `beforeAll` | every test of the group fails, each body running until its first use; in a `serial` group the first test fails and the others do not run |

### What the definition cannot see

- **A value assigned after an `await` that follows `new`.** The definition has already run by then. Pass such values
  to the constructor.
- **Fields declared below a field initialiser that resolves a locator.** `readonly submit =
  this.getNestedLocator("…")` runs the definition while the class is still being built: fields declared above it are
  set, fields below it are not, and whether parameter properties are set depends on the compiler (they are under
  Playwright's test runner, they are not under `tsc` with its default for `es2022` and later). A getter resolves when
  it is read and is always safe:

  ```ts
  get submit() {
    return this.getNestedLocator("main.button@login");
  }
  ```

- **State a constructor never set because it threw after `super(...)`.** The definition still runs on the discarded
  page object and reports its own error if it reads that state. Validate arguments before calling `super(...)` (code
  that does not use `this` may run there), or keep the definition independent of them.

### `pageActionsToPerformAfterNavigation()`

Optional. Return the async callbacks to run after `goto()` without a target and after `expectThisPage()`; omit the
method when there are none. It is called each time the actions run, not when the page object is constructed, so it
may read the page object's current state, constructor arguments included. `[]` and `null` both mean no actions.

```ts
protected pageActionsToPerformAfterNavigation() {
  return this.waitForSpinner
    ? [async () => { await expect(this.getLocator("common.spinner")).toHaveCount(0); }]
    : [];
}
```

With the `noImplicitOverride` compiler option, an implementation needs the `override` keyword.

### One registry per page object

Each page object has its own registry, defined once. Definitions may depend on the page object's own state (the locale
above), so they are not shared or cached between instances. Defining and verifying costs about a microsecond per path.

---

## Public properties

| Property | Type | Purpose |
| --- | --- | --- |
| `page` | `Page` | Playwright `Page` instance. |
| `baseUrl` / `urlPath` | `string` or `RegExp` | The values passed to the constructor, typed by `PageObjectTypeOptions`. |
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
| `goto(options?)` | `fullUrl` is a string | `page.goto(fullUrl)`, then calls `pageActionsToPerformAfterNavigation()` and runs its actions unless `runPostNavigationActions: false` |
| `goto(target, options?)` | always; `target` is any string on a string `baseUrl`, an absolute URL on a RegExp `baseUrl` | `page.goto` to the target; a relative target is resolved against the page object's `baseUrl` exactly as Playwright resolves against `use.baseURL` (`goto("login")`, `goto("/login")`, `goto("?tab=1")`). Never runs the actions |
| `expectThisPage(options?)` | always | one `page.waitForURL` for this page's URL and the requested load state, then calls `pageActionsToPerformAfterNavigation()` and runs its actions unless `runPostNavigationActions: false` |
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
- `defineLocators()` runs right after construction instead of inside the constructor, so it sees constructor
  arguments and fields. `new` no longer throws for a registry mistake: the fixture still fails before the test body,
  now with the page object's label in the message. A test that expected `new X(page)` to throw asserts on a first use
  instead (see *Verification, and how a registry mistake is reported*).
- `pageActionsToPerformAfterNavigation()` is optional, and it is called each time the actions run instead of once at
  construction. Delete implementations that return `[]` or `null`; with `noImplicitOverride`, add `override` to the
  ones that stay.
- `UrlTypeOptions` is renamed `PageObjectTypeOptions`, since it also carries `storage`; there is no alias. Rename it
  in imports and constraints (`grep -rn 'UrlTypeOptions' --include=*.ts .`).

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

A helper in a domain base class that is generic in its paths forwards a path with `LocatorSchemaPathArgument`; a
parameter typed with the bare union does not compile there (see *Types you can import* in `locator-registry.md`):

```ts
import type { Locator } from "@playwright/test";
import { type LocatorSchemaPathArgument, PageObject } from "pomwright";

abstract class ShopApp<Paths extends string> extends PageObject<Paths> {
  protected async clickOn<Path extends Paths>(path: LocatorSchemaPathArgument<Path>): Promise<void> {
    await this.getNestedLocator(path).click();
  }
}
// a subclass calls this.clickOn("main.button@login"); a misspelt path is a compile error at that call
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
import { LoginPage } from "./login.page";

type Fixtures = { loginPage: LoginPage };

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
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
