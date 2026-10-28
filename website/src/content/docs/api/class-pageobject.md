---
title: PageObject
description: "The base class of a page object; its constructor, the two hooks a subclass implements, and its properties."
---

`PageObject` is the abstract base class of a page object. It binds a Playwright
[`Page`](https://playwright.dev/docs/api/class-page) to a locator registry, a navigation helper built from the page
object's URL, and a session storage helper for its origin. A subclass names its paths, calls the constructor with its
URL, and registers its locators in `defineLocators()`.

```ts title="login.page.ts"
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

type Paths = "main" | "main.button@login";

export class LoginPage extends PageObject<Paths> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.button@login").getByRole("button", { name: "Log in" });
  }
}
```

Guide: [your first page object](/POMWright/docs/first-page-object/),
[page objects](/POMWright/docs/page-objects/).

---

## Type parameters

### Paths

`Paths extends string`

The union of the page object's locator paths. TypeScript checks every path passed to the locator methods against it,
and against [the rules of a path](/POMWright/docs/locator-paths/#the-rules-of-a-path), which POMWright checks again at
runtime. See [what a path is](/POMWright/docs/locator-paths/#what-a-path-is).

### Options

`Options extends` [`PageObjectTypeOptions`](/POMWright/api/types/#pageobjecttypeoptions) *(optional)*

Types only: whether `baseUrl` and `urlPath` are RegExps (both default to `string`), and the type of the session storage
schema. See [pages whose URL varies](/POMWright/docs/urls-and-navigation/#pages-whose-url-varies) and
[session storage through a page object](/POMWright/docs/session-storage/#through-a-page-object).

```ts
import type { Page } from "@playwright/test";
import { json, PageObject } from "pomwright";

const orderStorage = { cart: json<{ items: string[] }>() };

export class OrderPage extends PageObject<"main", { urlPathType: RegExp; storage: typeof orderStorage }> {
  constructor(page: Page) {
    super(page, "https://shop.example", /^\/orders\/\d+$/, { sessionStorage: { schema: orderStorage } });
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
  }
}
```

---

## Constructor

### new PageObject()

Called from the subclass constructor as `super(...)`; the constructor is `protected`. It checks the URL parts, creates
the registry and the helpers, and schedules `defineLocators()`.

**Usage**

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

export class AccountPage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account", {
      label: "Account",
      navOptions: { waitUntil: "domcontentloaded" },
    });
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
  }
}
```

**Arguments**

- `page` [Page](https://playwright.dev/docs/api/class-page)

  The page the page object works on.

- `baseUrl` string | RegExp

  The origin, such as `https://shop.example`, or a RegExp tested against the URL's origin (declare
  `baseUrlType: RegExp` in `Options`). See
  [baseUrl and urlPath](/POMWright/docs/urls-and-navigation/#baseurl-and-urlpath).

- `urlPath` string | RegExp

  The page's path: `""` or a string that starts with one `/`, such as `/login`, or a RegExp tested against the rest of
  the URL (declare `urlPathType: RegExp` in `Options`).

- `options` [PageObjectOptions](/POMWright/api/types/#pageobjectoptions) *(optional)*
  - `label` string *(optional)*

    Prefix of the page object's step titles and error messages. Defaults to the class name.

  - `navOptions` [NavigationOptions](/POMWright/api/class-navigation/#navigationoptions) *(optional)*

    Defaults for every navigation method of `navigation` (`waitUntil`, `timeout`); a call's own options win.

  - `sessionStorage` Object *(optional)*
    - `schema` [SessionStorageSchema](/POMWright/api/class-sessionstorage/#sessionstorageschema) *(optional)*

      The codecs of the session storage keys that hold structured values; its type is `Options["storage"]`.

  - `locators` [LocatorRegistryOptions](/POMWright/api/class-locatorregistry/#locatorregistryoptions) *(optional)*
    - `strictChains` boolean *(optional)*

      `true` makes the registry verification require every ancestor of every path to be registered. Defaults to
      `false`.

**Throws**

When a URL part is not what it must be:

```text
LoginPage: baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "localhost:9000".
LoginPage: baseUrl must be a string or a RegExp; received undefined.
LoginPage: urlPath must be "" or start with exactly one "/"; received "login".
LoginPage: urlPath must be a path on the page object's origin; received "/\\login.example/account", which names the host "login.example" instead. A "/" followed by another "/" or a "\", also with a tab or line break between them, starts a host.
```

---

## Methods to implement

### defineLocators()

`protected abstract`

Registers the page object's locators with `this.add(path)`. Implement it in every page object. It runs once, right
after the constructor, so it can use the subclass's constructor arguments and fields, and the registry is verified
after it. See [when defineLocators() runs](/POMWright/docs/page-objects/#when-definelocators-runs).

**Usage**

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

const loginLabel = { en: "Log in", nb: "Logg inn" } as const;

export class LoginPage extends PageObject<"main" | "main.button@login"> {
  constructor(page: Page, private readonly locale: "en" | "nb") {
    super(page, "https://shop.example", "/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.button@login").getByRole("button", { name: loginLabel[this.locale] });
  }
}
```

**Returns**

- void

**Throws**

An error inside `defineLocators()` or from the verification after it, labeled with the page object and kept for
every later locator call; see [how a mistake is reported](/POMWright/docs/page-objects/#how-a-mistake-is-reported).

```text
LoginPage: defineLocators() failed: A locator schema with the path "main" already exists. …
LoginPage: Locator registry verification failed for 1 of 5 paths:
  "main.form@login": No locator schema registered for path "main.form@login.heading".
LoginPage: defineLocators() must register its locators synchronously; it returned a Promise. Read what it needs in the constructor or a fixture, and pass it in.
```

The last when `defineLocators()` returns a Promise, as an `async` one does: it registers synchronously; see
[what the definition cannot see](/POMWright/docs/page-objects/#when-definelocators-runs).

### pageActionsToPerformAfterNavigation()

`protected`, optional

Returns the actions to run after `navigation.goto()` without a target and after `navigation.expectThisPage()`, such as
waiting for a spinner to go away. See
[actions after navigation](/POMWright/docs/page-objects/#actions-after-navigation).

**Usage**

```ts
import { expect, type Page } from "@playwright/test";
import { PageObject } from "pomwright";

export class DashboardPage extends PageObject<"main" | "main.spinner"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/dashboard");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
    this.add("main.spinner").getByRole("progressbar");
  }

  protected pageActionsToPerformAfterNavigation() {
    return [
      async () => {
        await expect(this.getNestedLocator("main.spinner")).toBeHidden();
      },
    ];
  }
}
```

**Returns**

- Array<() => Promise\<void\>> | null

  Run in order. `[]` and `null` both mean no actions; the default returns `[]`.

---

## Properties

### add

Registers a locator for a path: `this.add(path)` followed by one of the ten locator methods. Used inside
`defineLocators()`. See [`LocatorRegistry.add()`](/POMWright/api/class-locatorregistry/#add).

**Type**

- [AddAccessor](/POMWright/api/class-locatorregistry/#addaccessor)\<Paths\>

### baseUrl

The `baseUrl` the page object was constructed with.

**Type**

- string | RegExp, as declared in `Options`

### fullUrl

The page object's URL: for two strings, `new URL(urlPath, baseUrl).href` with a `^` in the path written as `%5E`, the
form every browser reports, but for Chromium's `%7C` for a `|`; a
[`UrlMatcher`](/POMWright/api/class-navigation/#urlmatcher) when either part is a RegExp. Playwright's
`toHaveURL(fullUrl)` fails in two cases POMWright cannot change: on Chromium for a path with `|`, which Chromium reports
as `%7C`, and on every browser for a base with credentials, since `toHaveURL` compares the document's URL, which
browsers give without them. `expectThisPage()` matches in both. See
[fullUrl](/POMWright/docs/urls-and-navigation/#fullurl).

**Usage**

```ts
import { expect, type Page } from "@playwright/test";
import type { LoginPage } from "./login.page";

declare const page: Page;
declare const loginPage: LoginPage;
// ---cut---
await expect(page).toHaveURL(loginPage.fullUrl);
```

**Type**

- string | [UrlMatcher](/POMWright/api/class-navigation/#urlmatcher)

### getLocator

Resolves the locator registered for a path, alone. See
[`LocatorRegistry.getLocator()`](/POMWright/api/class-locatorregistry/#getlocator).

**Type**

- [GetLocatorAccessor](/POMWright/api/class-locatorregistry/#getlocatoraccessor)\<Paths\>

### getLocatorSchema

Starts a query of a path, to change its chain for one use. See
[`LocatorQueryBuilder`](/POMWright/api/class-locatorquerybuilder/).

**Type**

- [GetLocatorSchemaAccessor](/POMWright/api/class-locatorregistry/#getlocatorschemaaccessor)\<Paths\>

### getNestedLocator

Resolves a path to the chain of every registered segment. See
[`LocatorRegistry.getNestedLocator()`](/POMWright/api/class-locatorregistry/#getnestedlocator).

**Type**

- [GetNestedLocatorAccessor](/POMWright/api/class-locatorregistry/#getnestedlocatoraccessor)\<Paths\>

### label

The label from the constructor options, or the class name.

**Type**

- string

### locatorRegistry

`protected`

The page object's registry, for code that takes a registry, such as a [locator
module](/POMWright/docs/locator-modules/): `defineLocators(this.locatorRegistry)`. Every method of it except
`createReusable` runs `defineLocators()` first if it has not run yet.

**Type**

- [LocatorRegistry](/POMWright/api/class-locatorregistry/)\<Paths\>

### navigation

The navigation helper: `goto()`, `expectThisPage()` and `expectAnotherPage()`. See
[`NavigationFor`](/POMWright/api/class-navigation/).

**Type**

- [NavigationFor](/POMWright/api/class-navigation/)\<BaseUrl, FullUrl\>

### page

The Playwright page the page object was constructed with.

**Type**

- [Page](https://playwright.dev/docs/api/class-page)

### sessionStorage

The session storage helper for the page object's origin, typed by the schema. See
[`SessionStorage`](/POMWright/api/class-sessionstorage/) and
[through a page object](/POMWright/docs/session-storage/#through-a-page-object).

**Type**

- [SessionStorage](/POMWright/api/class-sessionstorage/)\<Schema\>

### urlPath

The `urlPath` the page object was constructed with.

**Type**

- string | RegExp, as declared in `Options`
