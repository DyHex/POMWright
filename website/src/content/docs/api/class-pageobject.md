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

The union of the page object's locator paths. Every path is checked against it where it is written, and against the
path rules (no empty segment, no whitespace) at compile time and at runtime.

### Options

`Options extends` [`PageObjectTypeOptions`](/POMWright/api/types/#pageobjecttypeoptions) *(optional)*

Types only, no runtime value: whether `baseUrl` and `urlPath` are strings or RegExps (both default to `string`) and the
type of the session storage schema. A RegExp in either part makes `fullUrl` a [`UrlMatcher`](/POMWright/api/class-navigation/#urlmatcher)
and removes `goto()` without a target.

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

Called from the subclass constructor as `super(...)`; the constructor is `protected`. It validates the URL parts,
creates the registry and the helpers, and schedules `defineLocators()`. It does not call `defineLocators()` itself.

**Usage**

```ts
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

export class AccountPage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account", {
      label: "AccountPage",
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

  The origin of the page: a string `scheme://host[:port]`, with or without a trailing slash and nothing after it
  (`https://shop.example`, `http://localhost:9000`), or a RegExp tested against the URL's origin. Declare a RegExp in
  `Options` (`baseUrlType: RegExp`).

- `urlPath` string | RegExp

  The page's own path: `""` for the origin itself, or a string that starts with exactly one `/` (`/login`,
  `/orders?tab=open`), or a RegExp tested against the rest of the URL (path, query and hash). Declare a RegExp in
  `Options` (`urlPathType: RegExp`).

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

When a URL part is not what it must be, before anything else is created:

```text
LoginPage: baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "localhost:9000".
LoginPage: baseUrl must be a string or a RegExp; received undefined.
LoginPage: urlPath must be "" or start with exactly one "/"; received "login".
```

---

## Methods to implement

### defineLocators()

`protected abstract`

Registers the page object's locators with `this.add(path)`. Implement it in every page object.

It runs once per page object: right after the code that called `new` has finished (in a fixture, before the test
body), or at the first locator call on the page object if that comes earlier. Because it runs after the constructor,
it can use the subclass's constructor arguments, parameter properties and fields. Right after it, the registry is
[verified](/POMWright/docs/verifying-registries/).

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

An error thrown inside `defineLocators()`, or by the verification after it, is reported with the page object's
label and the original error as `cause`, and its stack points at the line that constructed the page object. The page
object keeps the error: every later locator call on it throws it again, and `defineLocators()` never runs a second
time.

```text
LoginPage: defineLocators() failed: A locator schema with the path "main" already exists. …
LoginPage: Locator registry verification failed for 1 of 5 paths:
  "main.form@login.button@submit": No locator schema registered for path "main.form@login.title".
```

### pageActionsToPerformAfterNavigation()

`protected`, optional

Returns the actions to run after `navigation.goto()` without a target and after `navigation.expectThisPage()`, such as
waiting for a spinner to go away. It is called each time the actions run, so it can read the page object's current
state. Omit it when there are none.

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

The page object's URL. For a string `baseUrl` and `urlPath` it is `new URL(urlPath, baseUrl).href`, the form the
browser reports (`https://shop.example/` for an empty path, `https://shop.example/s%C3%B8k` for `/søk`); when either
part is a RegExp, it is a matcher that tests the origin and the rest of a URL separately.

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

The navigation helper: `goto()` to this page, `goto(target)` to any page resolved against `baseUrl`,
`expectThisPage()` and `expectAnotherPage()`. Which forms exist depends on the URL types. See
[`Navigation`](/POMWright/api/class-navigation/).

**Type**

- [NavigationFor](/POMWright/api/class-navigation/)\<BaseUrl, FullUrl\>

### page

The Playwright page the page object was constructed with.

**Type**

- [Page](https://playwright.dev/docs/api/class-page)

### sessionStorage

The session storage helper, labelled with `label` and typed by the schema. With a string `baseUrl` it works on that
origin only, and `seed()` needs no origin argument. See [`SessionStorage`](/POMWright/api/class-sessionstorage/).

**Type**

- [SessionStorage](/POMWright/api/class-sessionstorage/)\<Schema\>

### urlPath

The `urlPath` the page object was constructed with.

**Type**

- string | RegExp, as declared in `Options`
