---
title: Upgrading from 2.x
description: "Every change a POMWright 2.x project meets in 3.0.0: what changed and why, how to find the affected code, and what to write instead."
---

## Introduction

POMWright 3.0.0 is a major release. Most of what a 2.x project wrote keeps working; this page lists everything that
does not, grouped by area. Each item stands on its own: what changed and why, how it shows up in your project, what to
write instead, and the page that explains the concept. The 2.x documentation stays available at the
[`v2.1.0` tag](https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2).

## How to upgrade

1. Upgrade `@playwright/test` to 1.64 or later and `pomwright` to 3.0.0, on Node 20 or later.
2. Run `tsc`. Removed and renamed APIs are compile errors: the items marked **compile error** say what to write
   instead.
3. Search for the changes that still compile but behave differently, the items marked **compiles**. Each gives the
   search.
4. Run the suite. What is left fails with a message that names the fix: a URL the constructor rejects, a registration
   without its first argument, a locator reference that does not verify, a seed that was never applied. Those items
   are marked **fails at run time**.

## Requirements

### Playwright 1.64 and Node 20

**Install.** The peer range is `@playwright/test >=1.64.0 <2.0.0`, raised from `>=1.57.0`: session storage is built on
`page.sessionStorage` (Playwright 1.61), the any-frame `frameLocator()` on 1.63, and 1.64 makes every RegExp flag
behave the same for every element. Node 20 or later, Playwright's own requirement, is declared in `engines`.

```sh
npm install --save-dev @playwright/test@latest pomwright@3
```

### Import from `pomwright` only

**Fails at run time.** The package has an `exports` map. `import { … } from "pomwright"` works in CommonJS and ESM
projects alike; a deep import such as `pomwright/dist/index.js` fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Import
everything from the root:

```sh
grep -rn "pomwright/" --include=*.ts .
```

See [Installation](/POMWright/docs/installation/).

## Locators

### `getById` matches the id as written

**Compiles.** 2.x removed a leading `#` or `id=` from the string and built a `#id` selector through a CSS escape that
broke on most real ids. 3.0.0 matches the string exactly and case-sensitively as `[id="…"]`, so ids with `.`, `:`,
spaces, quotes or a leading digit work, and `getById("#login")` looks for `id="#login"`. Find the prefixed calls:

```sh
grep -rnE 'getById\(\s*["'"'"'`](#|id=)' --include=*.ts .
```

```ts title="2.x" nocheck
registry.add("main.button@login").getById("#login");
```

```ts title="3.0.0"
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.button@login">;
// ---cut---
registry.add("main.button@login").getById("login");
```

A test that compares rendered locator strings changes `#login` to `[id="login"]`. `getById("")` throws at
registration. See [Locating by id](/POMWright/docs/locating-by-id/).

### `getById(RegExp)` is a regular expression

**Compiles.** 2.x used the RegExp's source as literal text: `/order.row/` matched only the text `order.row`, an
anchored pattern matched nothing, and flags were ignored. 3.0.0 tests the RegExp against each element's id, with its
flags. An unanchored pattern without special characters, such as `/btn-submit/`, matches as before. Find the RegExp
ids:

```sh
grep -rnE 'getById\(\s*/' --include=*.ts .
```

Review each pattern that contains `.`, `[`, `]`, `(`, `)`, `+`, `*`, `?`, `^`, `$` or `|`, or has flags: escape a
character meant literally (`/order\.row/`), and expect a flag such as `i` to take effect. See
[Locating by id](/POMWright/docs/locating-by-id/).

### Steps on a frame segment apply

**Compiles.** In 2.x, a `filter`, `nth`, `first` or `last` on a `frameLocator(selector)` registration was dropped when
the chain was built; with several matching iframes, the action failed with a strict mode violation. In 3.0.0 a frame
segment is `locator(selector)` with its steps, then `contentFrame()`, so the step selects the `<iframe>`:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"shell.frame@payment" | "shell.frame@payment.button@pay">;
// ---cut---
registry.add("shell.frame@payment").frameLocator("iframe").nth(1);
registry.add("shell.frame@payment.button@pay").getByRole("button", { name: "Pay" });
// 2.x:   the nth(1) was dropped
// 3.0.0: locator('iframe').nth(1).contentFrame().getByRole('button', { name: 'Pay' })
```

Review every `frameLocator(…)` registration followed by `.nth(`, `.filter(`, `.first(` or `.last(`; the step now
takes effect. Telling frames apart by their ancestor segments is still the better way:

```sh
grep -rn 'frameLocator(' --include=*.ts .
```

`frameLocator()` without a selector is new: Playwright's any-frame locator. See [Frames](/POMWright/docs/frames/).

### `update` keeps the strategy; `replace` changes it

**Fails at run time.** 2.x let `update()` switch a definition to another strategy, and kept a cache to switch back.
In 3.0.0 `update()` patches the registered definition and keeps its strategy; another strategy's method throws:

```text
update("main.button@save") cannot change the strategy from "role" to "text"; use replace("main.button@save").getByText(…) instead.
```

```ts title="2.x" nocheck
registry.getLocatorSchema("main.button@save").update().getByText("Save").getNestedLocator();
```

```ts title="3.0.0"
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.button@save">;
// ---cut---
registry.getLocatorSchema("main.button@save").replace().getByText("Save").getNestedLocator();
```

See [Queries](/POMWright/docs/queries/).

### `update` deletes with `null`

**Compiles.** `update()` follows JSON Merge Patch: a value replaces, `null` deletes, and `undefined` or a missing key
leaves the field alone. In 2.x, `undefined` as the options cleared them, and `{ key: undefined }` removed a key:

```ts title="2.x" nocheck
query.update().getByRole("button", undefined); // cleared every option
query.update().getByRole("button", { exact: undefined }); // removed exact
```

```ts title="3.0.0"
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.button@save">;
const query = registry.getLocatorSchema("main.button@save");
// ---cut---
query.update().getByRole("button", null); // clears every option
query.update().getByRole("button", { exact: null }); // removes exact
```

```sh
grep -rn 'update(' --include=*.ts . | grep undefined
```

See [Queries](/POMWright/docs/queries/).

### `replace` takes Playwright's arguments

**Compile error.** `replace()`'s methods take the argument lists of Playwright's own: the first argument is required,
and the options are Playwright's option types. `replace().getByRole({ name: "Save" })` and the other calls without a
first argument, which always threw, no longer compile, and neither do `null` options, which meant omission. Pass the
first argument and drop the `null`. See [Queries](/POMWright/docs/queries/).

### Every strategy method needs its first argument

**Fails at run time.** `add`, a seeded `add`, `createReusable`, `update` and `replace` throw at the call when the first
argument is missing, or when it is an empty string for `locator`, `frameLocator` and `getByRole`, which Playwright
cannot use. In 2.x such a registration was stored and failed later, or registered without its value. A page object
then fails in its fixture:

```text
locator requires a non-empty selector for "main.list".
getByRole requires a role value for "main.button@save".
```

`getByTestId("")`, `getByText("")` and the other text methods store the empty string, since Playwright matches elements
with an empty attribute. See [Registering locators](/POMWright/docs/registering-locators/).

### Steps come after the strategy

**Compile error.** `add(path).filter(…)`, `.nth(…)` and `.describe(…)` before a strategy method no longer compile:
call the strategy first, `add("list.item").getByRole("listitem").nth(0)`. A seeded registration keeps its optional
override as the first call. See [Registering locators](/POMWright/docs/registering-locators/).

### `remove` is `skip` and `unskip`

**Compile error.** 2.x's `remove(subPath)` deleted a segment's definition, steps and description from the query, and a
later `update()` brought back the definition only. 3.0.0's `skip(subPath)` leaves an ancestor out of the chain, and
`unskip(subPath)` brings it back exactly as it was. The terminal path cannot be skipped:

```ts title="2.x" nocheck
registry.getLocatorSchema("main.list.item").remove("main.list").getNestedLocator();
```

```ts title="3.0.0"
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.list" | "main.list.item">;
// ---cut---
registry.getLocatorSchema("main.list.item").skip("main.list").getNestedLocator(); // locator('main').getByRole('listitem')
```

`remove()` on the terminal followed by `update()` or `replace()` becomes the `update()` or `replace()` alone, plus
`clearSteps()` and `describe("")` where the steps and the description were meant to go. See
[Queries](/POMWright/docs/queries/).

### Seeds never change

**Compiles.** `filter`, `nth` and `describe` on a seed from `createReusable` return a new seed and leave the seed as it
was, as a Playwright `Locator` does. In 2.x they changed the seed itself, so two variants of one seed carried each
other's steps:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"table" | "table.row@first" | "table.row@last">;
// ---cut---
registry.add("table").locator("table");
const row = registry.createReusable.locator("tr");
registry.add("table.row@first", { reuse: row.nth(0) });
registry.add("table.row@last", { reuse: row.nth("last") });
// 2.x:   table.row@last resolved to locator('table').locator('tr').first().last(), the first row
// 3.0.0: table.row@last resolves to locator('table').locator('tr').last()
```

A seed method called as a statement no longer changes the seed; use its result:

```ts title="2.x" nocheck
row.filter({ hasText: "Total" });
registry.add("table.row@total", { reuse: row });
```

```ts title="3.0.0"
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"table" | "table.row@total">;
const row = registry.createReusable.locator("tr");
// ---cut---
registry.add("table.row@total", { reuse: row.filter({ hasText: "Total" }) });
```

```sh
grep -rn 'createReusable' --include=*.ts .
```

See [Reusing locators](/POMWright/docs/reusing-locators/).

### Reuse by path returns `filter`, `nth` and `describe`

**Compile error**, where code relied on the old return type. `add(path, { reuse: "other.path" })` copies the other
path as before, and now returns `filter`, `nth` and `describe`, where 2.x returned nothing. Drop a `void` annotation on
the result. A locator module compiled with `declaration: true` whose arrow function returns the result gets TS4023:
give it a block body or a `: void` return type. See [Reusing locators](/POMWright/docs/reusing-locators/) and
[Locator modules](/POMWright/docs/locator-modules/#what-a-module-may-return).

### A page object's locators are verified

**Fails at run time.** A page object resolves every registered path once, right after `defineLocators()`, so a
mistyped `has` or `hasNot` path, a cycle, or an any-frame segment in the wrong place fails its fixture, with every
failing path named, instead of failing the first action that used it:

```text
LoginPage: Locator registry verification failed for 1 of 2 paths:
  "list.item": No locator schema registered for path "list.titel".
```

Fix the reference. A standalone registry from `createRegistryWithAccessors` calls `registry.verify()` itself. See
[Verifying a registry](/POMWright/docs/verifying-registries/).

### From JavaScript: `describe` and `nth`

**Fails at run time** or **compiles**; TypeScript rejected these calls already. `describe(null)` and
`describe(undefined)` throw, where 2.x fell back to the path; `describe("")` removes a description, as in Playwright.
`nth(null)` and `nth(undefined)` reach Playwright's `nth`, which matches nothing, where 2.x dropped them and matched
every element. Call `nth` only when there is an index: `if (index !== undefined) query.nth(index)`. See
[Filters and indices](/POMWright/docs/filters-and-indices/) and [Descriptions](/POMWright/docs/descriptions/).

## Page objects

### `defineLocators()` runs after the constructor

**Compiles.** 2.x called `defineLocators()` inside `super(...)`, before the subclass had set anything, so a definition
that used a constructor argument, a field or an assignment in the constructor silently registered `undefined`. 3.0.0
runs it, followed by the check of the locators, right after the code that called `new` has finished, or at the first
locator call if that comes earlier. Page objects need no change, with three consequences:

- `new` no longer throws for a mistake in the locators; the fixture still fails before the test body, now with the
  page object's label. A test that expects the throw uses the page object right after creating it:

  ```ts title="2.x" nocheck
  expect(() => new BrokenPage(page)).toThrow();
  ```

  ```ts title="3.0.0"
  import { expect, type Page } from "@playwright/test";
  import { PageObject } from "pomwright";

  class BrokenPage extends PageObject<"main"> {
    constructor(page: Page) {
      super(page, "https://shop.example", "/");
    }
    protected defineLocators(): void {
      this.add("main").locator("main");
      this.add("main").locator("main");
    }
  }
  declare const page: Page;
  // ---cut---
  expect(() => new BrokenPage(page).getNestedLocator("main")).toThrow("BrokenPage: defineLocators() failed");
  ```

- A value assigned to a page object after an `await` that follows `new` is not seen by `defineLocators()`: pass it to
  the constructor.
- A page object built in `beforeEach` or `beforeAll` still fails the tests the hook runs for, but each test body runs
  until its first use of the page object. In a `beforeAll` group that is not `serial`, every test of the group fails,
  where 2.x failed the first and did not run the rest.

See [Page objects](/POMWright/docs/page-objects/#when-definelocators-runs).

### `pageActionsToPerformAfterNavigation()` is optional

**Compiles**, except with the `noImplicitOverride` compiler option. The method now has a default with no actions, and
is called each time the actions run, after `goto()` and `expectThisPage()`, instead of once at construction, so it reads
the page object's current state. Delete implementations that return `[]` or `null`:

```ts title="2.x" nocheck
protected pageActionsToPerformAfterNavigation() {
  return [];
}
```

With `noImplicitOverride`, an implementation that stays needs the `override` keyword, or TypeScript reports TS4114:

```ts title="3.0.0"
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

  protected override pageActionsToPerformAfterNavigation() {
    return [
      async () => {
        await expect(this.getNestedLocator("main.spinner")).toBeHidden();
      },
    ];
  }
}
```

See [Page objects](/POMWright/docs/page-objects/#actions-after-navigation).

### `UrlTypeOptions` is `PageObjectTypeOptions`

**Compile error.** `PageObject`'s second type argument also carries the session storage schema now, so its type is
named `PageObjectTypeOptions`. There is no alias; rename it in imports and constraints:

```sh
grep -rn 'UrlTypeOptions' --include=*.ts .
```

See [TypeScript](/POMWright/docs/typescript/).

## URLs and navigation

### `goto()` replaces `gotoThisPage()`

**Compile error.** `navigation.goto()` without a target navigates to the page object's `fullUrl` and runs its actions
after navigation, as `gotoThisPage()` did. `goto(target)` navigates anywhere and never runs them; it resolves a relative
target against `baseUrl` exactly as Playwright resolves one against `baseURL`, where 2.x prefixed only a target that
started with `/` and passed the rest to `page.goto` unchanged:

```ts title="2.x" nocheck
await loginPage.navigation.gotoThisPage();
```

```ts title="3.0.0"
import type { LoginPage } from "./login.page";

declare const loginPage: LoginPage;
// ---cut---
await loginPage.navigation.goto();
```

```sh
grep -rn 'gotoThisPage(' --include=*.ts .
```

See [URLs and navigation](/POMWright/docs/urls-and-navigation/#navigating).

### `waitForLoadState` is `waitUntil`

**Compile error.** In 2.x, `goto` and `expectThisPage` used `waitUntil` and `expectAnotherPage` used
`waitForLoadState`. In 3.0.0 every method is one `page.waitForURL` or `page.goto` call that takes `waitUntil`, so
`waitForLoadState` is removed from `NavigationOptions`, which gains `timeout`. Rename it in `navOptions` and in options
passed to a call. POMWright no longer sets `"load"` itself; Playwright's default, also `"load"`, applies. See
[URLs and navigation](/POMWright/docs/urls-and-navigation/#options-and-timeouts).

### URLs are checked when a page object is constructed

**Fails at run time.** A string `baseUrl` must be an origin with a scheme and nothing after it, and a string `urlPath`
must be `""` or start with exactly one `/`. The constructor checks every value, a literal or one from the environment:

```text
LoginPage: baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "https://shop.example/app".
```

A base with a path moves the path into `urlPath`:

```ts title="2.x" nocheck
super(page, "https://shop.example/app", "/login");
```

```ts title="3.0.0"
import type { Page } from "@playwright/test";
import { PageObject } from "pomwright";

export class LoginPage extends PageObject<"main"> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/app/login");
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
  }
}
```

For two strings, `fullUrl` is `new URL(urlPath, baseUrl).href`, the form the browser reports: a page object for the
origin itself has `https://shop.example/`, with the slash, where 2.x had `https://shop.example`. A test that compares
`fullUrl` with a literal follows. See [URLs and navigation](/POMWright/docs/urls-and-navigation/#baseurl-and-urlpath).

### The `fullUrl` of a RegExp page is a `UrlMatcher`

**Compile error**, where code used it as a `RegExp`. 2.x joined the two parts into one RegExp, so a base RegExp had to
match up to the exact character where the path began, flags were dropped, and a `^` on the path broke the match. In
3.0.0, on a page object with a RegExp `baseUrl` or `urlPath`, `fullUrl` is a `UrlMatcher`: the base is tested against
the URL's origin and the path against the rest, each as written, with its own flags. Pass it to Playwright as before:
`page.waitForURL(fullUrl)`, `expect(page).toHaveURL(fullUrl)`, `page.route(fullUrl, …)`.

```ts title="2.x" nocheck
expect(page.url()).toMatch(accountPage.fullUrl);
const { source, flags } = accountPage.fullUrl;
```

```ts title="3.0.0"
import { expect, type Page } from "@playwright/test";
import type { UrlMatcher } from "pomwright";

declare const page: Page;
declare const accountPage: { fullUrl: UrlMatcher };
// ---cut---
await expect(page).toHaveURL(accountPage.fullUrl);
const onAccountPage = accountPage.fullUrl.test(page.url());
const { base, path } = accountPage.fullUrl;
```

A base RegExp that includes a path never matches, since the base only sees the origin: move the path into `urlPath`.
`$` on a base includes the port. A type of your own that tests `fullUrl` or `FullUrlTypeFromOptions` against `RegExp`,
or a parameter typed `string | RegExp` that receives `fullUrl`, tests or takes `UrlMatcher` instead:

```ts title="3.0.0"
import type { Page } from "@playwright/test";
import type { UrlMatcher } from "pomwright";

export async function waitForPage(page: Page, url: string | UrlMatcher) {
  await page.waitForURL(url);
}
```

See [URLs and navigation](/POMWright/docs/urls-and-navigation/#pages-whose-url-varies).

### Waits end at the navigation timeout

**Compiles.** In 2.x, `expectThisPage` retried an exact comparison of the URL without a limit of its own, and
`expectAnotherPage` could pass while the browser was still on the page. In 3.0.0 each is one `page.waitForURL`, bounded
by the project's `navigationTimeout` or a `timeout` in `navOptions` or in the call, and a failure names the page
object, the URL it expected and the URL it found. `expectAnotherPage` waits until the browser has left, and fails at once
if it came straight back. See [URLs and navigation](/POMWright/docs/urls-and-navigation/#options-and-timeouts).

## Session storage

### Values are stored as written

**Compiles.** 2.x JSON-encoded every value: `set({ token: "abc" })` reached the app as `"abc"`, with the quotes, and
objects were stored as JSON. 3.0.0 stores strings exactly as given, as Playwright's `page.sessionStorage` does; a key
that holds structured data is declared once with a codec, which also types it. The `set<T>` and `get<T>` type
arguments are gone:

```ts title="2.x" nocheck
await accountPage.sessionStorage.set<User>({ user: { name: "Ada", age: 36 } });
const { user } = await accountPage.sessionStorage.get<User>(["user"]);
```

```ts title="3.0.0"
import type { Page } from "@playwright/test";
import { json, PageObject } from "pomwright";

const accountStorage = { user: json<{ name: string; age: number }>() };

export class AccountPage extends PageObject<"main", { storage: typeof accountStorage }> {
  constructor(page: Page) {
    super(page, "https://shop.example", "/account", { sessionStorage: { schema: accountStorage } });
  }

  protected defineLocators(): void {
    this.add("main").locator("main");
  }
}

declare const accountPage: AccountPage;
// ---cut---
await accountPage.sessionStorage.set({ user: { name: "Ada", age: 36 } });
const user = await accountPage.sessionStorage.get("user"); // { name: string; age: number } | null
```

Where the app parses a string key as JSON, as a storage layer that encodes everything does, declare `json<string>()`
for that key to keep the quotes. See [Session storage](/POMWright/docs/session-storage/#codecs-for-structured-values).

### `seed` replaces `setOnNextNavigation`

**Compile error.** `seed(entries)` stores the entries for an origin before the app's next load there, whatever
navigation takes the page there: `goto`, a link, a script, a form POST or a server redirect. It never leaves the page
the test is on, and on the origin already it writes at once. A page object's helper seeds its own origin; a helper
without one takes `{ origin }`.

```ts title="2.x" nocheck
await loginPage.sessionStorage.setOnNextNavigation({ token: "eyJ…" });
await loginPage.navigation.gotoThisPage();
```

```ts title="3.0.0"
import type { LoginPage } from "./login.page";

declare const loginPage: LoginPage;
// ---cut---
await loginPage.sessionStorage.seed({ token: "eyJ…" });
await loginPage.navigation.goto();
```

A seed that has not been applied when the page closes fails the test: remove `seed` calls that no navigation to the
origin follows, defensive ones in fixtures included, and seed in the test, right before the hop. Register a mock for a
whole page after `seed`. An app whose service worker answers navigations needs one of the fixes on
[Seeding session storage](/POMWright/docs/seeding-session-storage/#service-workers).

### `waitForContext` and `reload` are gone

**Compile error.** `set(entries, { reload: true })` becomes `set(entries)` followed by `page.reload()`. `waitForContext`
is gone: on a page without an origin every call fails at once with a message that names the fix, which is to navigate
first or use `seed`.

```sh
grep -rnE 'setOnNextNavigation|waitForContext|reload: true' --include=*.ts .
```

See [Session storage](/POMWright/docs/session-storage/#the-methods).

### `get` returns `null` for a missing key

**Compiles.** `get(["token", "missing"])` returns `{ token: "abc", missing: null }`, where 2.x left `missing` out;
`get("token")` returns the value or `null`. A check for `undefined` becomes a check for `null`. A literal `get([])` or
`clear([])`, which meant every key in 2.x, no longer compiles, and a list that turns out empty reads or removes nothing:
call `get()` or `clear()` for every key. See [Session storage](/POMWright/docs/session-storage/#the-methods).

### A page object's helper stays on its origin

**Fails at run time.** In 2.x a page object's `sessionStorage` read and wrote whatever origin the page was on. In 3.0.0 it
refuses another origin, naming both. Use the page object for that origin, or a `SessionStorage` without an origin. See
[Session storage](/POMWright/docs/session-storage/#through-a-page-object).

## Reports

### `@step` decorates methods that return a Promise

**Compile error.** `test.step` always returns a Promise, so a decorated method that returned a plain value handed its
caller a Promise, ran after the caller's next line, and its errors escaped the caller's `try`. TypeScript now rejects
`@step` on it with `@step decorates methods that return a Promise: make the method async`. Make every decorated method
`async`. A decorated static method is titled by its class (`AccountPage.create`), where 2.x wrote `Function.create`;
update anything that looks for that title. See [Test steps](/POMWright/docs/test-steps/).

### Log attachments keep what was logged

**Compiles.** Attachment names use Playwright's `locale` and `timezoneId`, where 2.x always wrote them in `nb-NO`; set
`use: { locale: "nb-NO" }` for the 2.x names, or pass a locale to `attachLogsToTest` in a fixture of your own. A
message is attached exactly as written, where 2.x re-formatted one that parsed as JSON: pass
`JSON.stringify(data, null, 2)` for indented JSON. Further arguments are printed as `console.log` prints them, where 2.x
wrote `[object Object]`. See [Logging to the report](/POMWright/docs/logging/).

## Reference

- [Release notes](https://github.com/DyHex/POMWright/releases) and the
  [changelog](https://github.com/DyHex/POMWright/blob/main/CHANGELOG.md)
- The 2.x documentation, at the [`v2.1.0` tag](https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2)
