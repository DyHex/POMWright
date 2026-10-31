---
title: Upgrading from 2.x
description: "Every change a POMWright 2.x project meets in 3.x: what changed and why, how to find the affected code, and what to write instead."
---

## Introduction

POMWright 3 is a major release. Most of what a 2.x project wrote keeps working; this page lists everything that
does not, grouped by area. A project meets only some of these items, since each concerns one feature or one way of
using it: `tsc` and the searches in *How to upgrade* show which apply to yours, and the rest can be skipped. Each item
stands on its own: what changed and why, how it shows up in your project, what to
write instead, and the page that explains the concept. The 2.x documentation stays available at the
[`v2.1.0` tag](https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2).

## How to upgrade

1. Upgrade `@playwright/test` to 1.64 or later and `pomwright` to the latest 3.x, on Node 20 or later.
2. Run `tsc`. Removed and renamed APIs are compile errors: the items marked **compile error** say what to write
   instead.
3. Search for the changes that still compile but behave differently, the items marked **compiles**. Each item that
   needs a change gives the search, run from the project's root; the others say they need none.
   `--exclude-dir=node_modules` keeps out the installed packages, whose own files (Playwright's and POMWright's type
   declarations among them) would otherwise fill the results.
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
grep -rn "pomwright/" --include=*.ts --exclude-dir=node_modules .
```

See [Installation](/POMWright/docs/installation/).

## Locators

### `createRegistryWithAccessors` takes its paths

**Compile error.** 2.x inferred the paths as `string` when `createRegistryWithAccessors(page)` had no type argument, so
no path was checked. 3.x requires the union, and every path of a registry created without it is a compile error:

```text
error TS2345: Argument of type '"main"' is not assignable to parameter of type '"createRegistryWithAccessors needs its paths as a type argument: createRegistryWithAccessors<Paths>(page)"'.
```

Pass the union, `createRegistryWithAccessors<Paths>(page)`, or `<string>` for paths known only at run time (see
[the registry](/POMWright/docs/locator-paths/#the-registry)). Find the calls with
`grep -rn 'createRegistryWithAccessors(' --include=*.ts --exclude-dir=node_modules .`.

### `getById` matches the id as written

**Compiles.** 2.x removed a leading `#` or `id=` from the string and built a `#id` selector through a CSS escape that
broke on most real ids. 3.x matches the string exactly and case-sensitively as `[id="…"]`, so ids with `.`, `:`,
spaces, quotes or a leading digit work, and `getById("#login")` looks for `id="#login"`. Find the prefixed calls:

```sh
grep -rnE 'getById\(\s*["'"'"'`](#|id=)' --include=*.ts --exclude-dir=node_modules .
```

```ts title="2.x" nocheck
registry.add("main.button@login").getById("#login");
```

```ts title="3.x"
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.button@login">;
// ---cut---
registry.add("main.button@login").getById("login");
```

A test that compares rendered locator strings changes `#login` to `[id="login"]`. `getById("")` throws at
registration. See [Locating by id](/POMWright/docs/locating-by-id/).

### `getById(RegExp)` is a regular expression

**Compiles.** 2.x used the RegExp's source as literal text: `/order.row/` matched only the text `order.row`, an
anchored pattern matched nothing, and flags were ignored. 3.x tests the RegExp against each element's id, with its
flags. An unanchored pattern without special characters, such as `/btn-submit/`, matches as before. Find the RegExp
ids:

```sh
grep -rnE 'getById\(\s*/' --include=*.ts --exclude-dir=node_modules .
```

Review each pattern that contains `.`, `[`, `]`, `(`, `)`, `+`, `*`, `?`, `^`, `$` or `|`, or has flags: escape a
character meant literally (`/order\.row/`), and expect a flag such as `i` to take effect. See
[Locating by id](/POMWright/docs/locating-by-id/).

### Steps on a frame segment apply

**Compiles.** In 2.x, a `filter` or `nth` on a `frameLocator(selector)` registration was dropped when the chain was
built; with several matching iframes, the action failed with a strict mode violation. In 3.x a frame
segment is `locator(selector)` with its steps, then `contentFrame()`, so the step selects the `<iframe>`:

```ts
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"shell.frame@payment" | "shell.frame@payment.button@pay">;
// ---cut---
registry.add("shell.frame@payment").frameLocator("iframe").nth(1);
registry.add("shell.frame@payment.button@pay").getByRole("button", { name: "Pay" });
// 2.x:   the nth(1) was dropped
// 3.x: locator('iframe').nth(1).contentFrame().getByRole('button', { name: 'Pay' })
```

Review every `frameLocator(…)` registration followed by `.nth(` or `.filter(`; the step now takes effect. Telling frames apart by their ancestor segments is still the better way:

```sh
grep -rn 'frameLocator(' --include=*.ts --exclude-dir=node_modules .
```

`frameLocator()` without a selector is new: Playwright's any-frame locator. See [Frames](/POMWright/docs/frames/).

### `update` keeps the strategy; `replace` changes it

**Fails at run time.** 2.x let `update()` switch a definition to another strategy, and kept a cache to switch back.
In 3.x `update()` patches the registered definition and keeps its strategy; another strategy's method throws:

```text
update("main.button@save") cannot change the strategy from "role" to "text"; use replace("main.button@save").getByText(…) instead.
```

```ts title="2.x" nocheck
registry.getLocatorSchema("main.button@save").update().getByText("Save").getNestedLocator();
```

```ts title="3.x"
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

```ts title="3.x"
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"main" | "main.button@save">;
const query = registry.getLocatorSchema("main.button@save");
// ---cut---
query.update().getByRole("button", null); // clears every option
query.update().getByRole("button", { exact: null }); // removes exact
```

```sh
grep -rn 'update(' --include=*.ts --exclude-dir=node_modules . | grep undefined
```

See [Queries](/POMWright/docs/queries/).

### `replace` takes Playwright's arguments

**Compile error.** `replace()`'s methods take the argument lists of Playwright's own: the first argument is required,
and the options are Playwright's option types. `replace().getByRole({ name: "Save" })` and the other calls without a
first argument, which always threw, no longer compile, and neither do `null` options, which meant omission. Pass the
first argument and drop the `null`. See [Queries](/POMWright/docs/queries/).

### Every strategy method needs its first argument

**Fails at run time.** `add`, `createReusable` and `replace` throw at the call when the first argument is missing.
Every builder, `update` and a seeded `add` included, throws when it is an empty string for `locator`, `frameLocator`,
`getByRole` and `getById`, which Playwright cannot use, or, from JavaScript, not a value Playwright takes (`null`, a
number or an object where a string belongs). In 2.x such a registration was stored and failed later, or registered
without its value. A page object then fails in its fixture:

```text
locator requires a non-empty selector for "main.list".
getByRole requires a role value for "main.button@save".
getById requires a non-empty id for "main.panel@settings".
```

On `update` and a seeded `add`, leaving the first argument out still keeps the registered one, as in 2.x: the options
alone, `update().getByRole({ name: "Cancel" })`, and no argument, `update().getByRole()`, are unaffected.
`getByTestId("")`, `getByText("")` and the other text methods store the empty string, since Playwright matches elements
with an empty attribute. See [Registering locators](/POMWright/docs/registering-locators/).

### Steps come after the strategy

**Compile error.** `add(path).filter(…)`, `.nth(…)` and `.describe(…)` before a strategy method no longer compile:
call the strategy first, `add("list.item").getByRole("listitem").nth(0)`. In one chain, a seeded registration's
optional override comes first too; a registration kept in a variable may take it after its `filter`, `nth` and
`describe` calls (see [changing a seed's options](/POMWright/docs/reusing-locators/#changing-a-seeds-options)). See
[Registering locators](/POMWright/docs/registering-locators/).

### A registration ends at the next call on the registry

**Fails at run time.** In 2.x a registration kept in a variable could be given more steps at any time: after other
registrations, after its path was resolved, from a page object's method in the middle of a test, and the registered
locator changed with them. In 3.x it ends at the next call on its registry (`add`, `getLocator`, `getNestedLocator`,
`getLocatorSchema`, `verify`, or resolving a query), and a later step, locator method or seeded override of it throws:

```text
filter() cannot apply to "list.item": its registration was ended by add("list"); give a registration all its steps in its add(…) chain, or query the path for one use.
```

Find the registrations kept in variables, and give each all its steps before the registry is called again; a step
meant for one use becomes a query:

```sh
grep -rnE '((const|let) +\w+|this\.\w+) *= .*\badd\(' --include=*.ts --exclude-dir=node_modules .
```

See [Registering locators](/POMWright/docs/registering-locators/#registered-locators-do-not-change).

### `remove` is `skip` and `unskip`

**Compile error.** 2.x's `remove(subPath)` deleted a segment's definition, steps and description from the query, and a
later `update()` brought back the definition only. 3.x's `skip(subPath)` leaves an ancestor out of the chain, and
`unskip(subPath)` brings it back exactly as it was. The terminal path cannot be skipped:

```ts title="2.x" nocheck
registry.getLocatorSchema("main.list.item").remove("main.list").getNestedLocator();
```

```ts title="3.x"
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
// 3.x: table.row@last resolves to locator('table').locator('tr').last()
```

A seed method called as a statement no longer changes the seed; use its result:

```ts title="2.x" nocheck
row.filter({ hasText: "Total" });
registry.add("table.row@total", { reuse: row });
```

```ts title="3.x"
import type { LocatorRegistry } from "pomwright";

declare const registry: LocatorRegistry<"table" | "table.row@total">;
const row = registry.createReusable.locator("tr");
// ---cut---
registry.add("table.row@total", { reuse: row.filter({ hasText: "Total" }) });
```

```sh
grep -rn 'createReusable' --include=*.ts --exclude-dir=node_modules .
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
LoginPage: Locator registry verification failed for 1 of 5 paths:
  "main.form@login": No locator schema registered for path "main.form@login.heading".
```

Fix the reference. A standalone registry from `createRegistryWithAccessors` calls `registry.verify()` itself. See
[Verifying a registry](/POMWright/docs/verifying-registries/).

### From JavaScript: `describe` and `nth`

**Fails at run time** or **compiles**; TypeScript rejected these calls already. `describe(null)` and
`describe(undefined)` throw, where 2.x fell back to the path; `describe("")` removes a description, as in Playwright.
`nth(null)` and `nth(undefined)` reach Playwright's `nth`, which matches nothing, where 2.x dropped them and matched
every element. Call `nth` only when there is an index: `if (index !== undefined) query.nth(index)`. Find the calls in
JavaScript files, and review each whose argument can be `null` or `undefined`:
`grep -rnE '\.(nth|describe)\(' --include=*.js --include=*.mjs --include=*.cjs --exclude-dir=node_modules .`. See
[Filters and indices](/POMWright/docs/filters-and-indices/) and [Descriptions](/POMWright/docs/descriptions/).

## Page objects

### `defineLocators()` runs after the constructor

**Compiles.** 2.x called `defineLocators()` inside `super(...)`, before the subclass had set anything, so a definition
that used a constructor argument, a field or an assignment in the constructor silently registered `undefined`. 3.x
runs it, followed by the check of the locators, right after the code that called `new` has finished, or at the first
locator call if that comes earlier. Page objects need no change, with three consequences:

- `new` no longer throws for a mistake in the locators; the fixture still fails before the test body, now with the
  page object's label. A test that expects the throw uses the page object right after creating it. Find the tests that
  expect `new` to throw:

  ```sh
  grep -rn "expect(() => new" --include=*.ts --exclude-dir=node_modules .
  ```

  ```ts title="2.x" nocheck
  expect(() => new BrokenPage(page)).toThrow();
  ```

  ```ts title="3.x"
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
the page object's current state. Find the implementations, and delete those that return `[]` or `null`:

```sh
grep -rn "pageActionsToPerformAfterNavigation" --include=*.ts --exclude-dir=node_modules .
```

```ts title="2.x" nocheck
protected pageActionsToPerformAfterNavigation() {
  return [];
}
```

With `noImplicitOverride`, an implementation that stays needs the `override` keyword, or TypeScript reports TS4114:

```ts title="3.x"
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
grep -rn 'UrlTypeOptions' --include=*.ts --exclude-dir=node_modules .
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

```ts title="3.x"
import type { LoginPage } from "./login.page";

declare const loginPage: LoginPage;
// ---cut---
await loginPage.navigation.goto();
```

```sh
grep -rn 'gotoThisPage(' --include=*.ts --exclude-dir=node_modules .
```

See [URLs and navigation](/POMWright/docs/urls-and-navigation/#navigating).

### `waitForLoadState` is `waitUntil`

**Compile error.** In 2.x, `goto` and `expectThisPage` used `waitUntil` and `expectAnotherPage` used
`waitForLoadState`. In 3.x every method is one `page.waitForURL` or `page.goto` call that takes `waitUntil`, so
`waitForLoadState` is removed from `NavigationOptions`, which gains `timeout`. Rename it in `navOptions` and in options
passed to a call. POMWright no longer sets `"load"` itself; Playwright's default, also `"load"`, applies. See
[URLs and navigation](/POMWright/docs/urls-and-navigation/#options-and-timeouts).

### URLs are checked when a page object is constructed

**Fails at run time.** A string `baseUrl` must be an origin with a scheme and nothing after it, and a string `urlPath`
must be `""` or start with exactly one `/`, and stay on the base's origin once resolved. The constructor checks every
value, a literal or one from the environment:

```text
LoginPage: baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "https://shop.example/app".
```

A base with a path moves the path into `urlPath`:

```ts title="2.x" nocheck
super(page, "https://shop.example/app", "/login");
```

```ts title="3.x"
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

A `urlPath` that is a complete URL throws too. 2.x joined it to `baseUrl`, `https://shop.examplehttps://login.example`,
a URL no browser reaches, so a page object with one never used its own URL; its origin belongs in `baseUrl`, with
`""` or the rest of the URL as `urlPath`:

```text
LoginPage: urlPath must be "" or start with exactly one "/"; received "https://login.example".
```

For two strings, `fullUrl` is `new URL(urlPath, baseUrl).href`, the form the browser reports: a page object for the
origin itself has `https://shop.example/`, with the slash, where 2.x had `https://shop.example`. A test that compares
`fullUrl` with a literal follows. See [URLs and navigation](/POMWright/docs/urls-and-navigation/#baseurl-and-urlpath).

### The `fullUrl` of a RegExp page is a `UrlMatcher`

**Compile error**, where code used it as a `RegExp`. 2.x joined the two parts into one RegExp, so a base RegExp had to
match up to the exact character where the path began, flags were dropped, and a `^` on the path broke the match. In
3.x, on a page object with a RegExp `baseUrl` or `urlPath`, `fullUrl` is a `UrlMatcher`: the base is tested against
the URL's origin and the path against the rest, each as written, with its own flags. Pass it to Playwright as before:
`page.waitForURL(fullUrl)`, `expect(page).toHaveURL(fullUrl)`, `page.route(fullUrl, …)`.

```ts title="2.x" nocheck
expect(page.url()).toMatch(accountPage.fullUrl);
const { source, flags } = accountPage.fullUrl;
```

```ts title="3.x"
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

```ts title="3.x"
import { expect, type Page } from "@playwright/test";
import type { UrlMatcher } from "pomwright";

export async function waitForPage(page: Page, url: string | UrlMatcher) {
  // toHaveURL compares a string exactly, where waitForURL reads it as a glob
  await expect(page).toHaveURL(url);
}
```

See [URLs and navigation](/POMWright/docs/urls-and-navigation/#pages-whose-url-varies).

### Waits end at the navigation timeout

**Compiles.** In 2.x, `expectThisPage` retried an exact comparison of the URL without a limit of its own, and
`expectAnotherPage` could pass while the browser was still on the page. In 3.x each is one `page.waitForURL`, bounded
by the project's `navigationTimeout` or a `timeout` in `navOptions` or in the call, and a failure names the page
object, the URL it expected and the URL it found. `expectAnotherPage` waits until the browser has left, and fails at once
if it came straight back. This needs no change. See [URLs and navigation](/POMWright/docs/urls-and-navigation/#options-and-timeouts).

## Session storage

### Values are stored as written

**Compiles** for strings; **compile error** for structured values without a codec. 2.x JSON-encoded every value: `set({ token: "abc" })` reached the app as `"abc"`, with the quotes, and
objects were stored as JSON. 3.x stores strings exactly as given, as Playwright's `page.sessionStorage` does; a key
that holds structured data is declared once with a codec, which also types it. The `set<T>` and `get<T>` type
arguments are gone:

```ts title="2.x" nocheck
await accountPage.sessionStorage.set<User>({ user: { name: "Ada", age: 36 } });
const { user } = await accountPage.sessionStorage.get<User>(["user"]);
```

```ts title="3.x"
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

A leftover type argument does not point at this item. `set` and `get` still have a type parameter, for the key
names, so TypeScript reads the old `<User>` as a key and reports, for the 2.x lines above:

```text
error TS2353: Object literal may only specify known properties, and 'user' does not exist in type 'EntriesFor<{ user: Codec<{ name: string; age: number; }>; }, User>'.
error TS2339: Property 'user' does not exist on type 'string | { name: string; age: number; } | null'.
error TS2344: Type 'User' does not satisfy the constraint 'string'.
```

A structured value for a key without a codec, which 2.x stored as JSON, is a compile error too:
`error TS2322: Type '{ name: string; age: number; }' is not assignable to type 'string'.`

Delete the type argument and declare the key's codec. Find them with
`grep -rnE '\.(get|set|seed)<' --include=*.ts --exclude-dir=node_modules .`. Keys with a codec and keys without one,
which hold strings, mix in one call: `set({ user: { name: "Ada", age: 36 }, token: "abc" })`.

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

```ts title="3.x"
import type { LoginPage } from "./login.page";

declare const loginPage: LoginPage;
// ---cut---
await loginPage.sessionStorage.seed({ token: "eyJ…" });
await loginPage.navigation.goto();
```

A seed that has not been applied when the page closes fails the test: remove `seed` calls that no navigation to the
origin follows, defensive ones in fixtures included, and seed in the test, before the hop. See
[Seeding session storage](/POMWright/docs/seeding-session-storage/).

### `waitForContext` and `reload` are gone

**Compile error.** `set(entries, { reload: true })` becomes `set(entries)` followed by `page.reload()`. `waitForContext`
is gone: on a page without an origin every call fails at once with a message that names the fix, which is to navigate
first or use `seed`.

```sh
grep -rnE 'setOnNextNavigation|waitForContext|reload: true' --include=*.ts --exclude-dir=node_modules .
```

See [Session storage](/POMWright/docs/session-storage/#the-methods).

### `get` returns `null` for a missing key

**Compiles.** `get(["token", "missing"])` returns `{ token: "abc", missing: null }`, where 2.x left `missing` out;
`get("token")` returns the value or `null`. A check for `undefined` becomes a check for `null`. A literal `get([])` or
`clear([])`, which meant every key in 2.x, no longer compiles, and a list that turns out empty reads or removes nothing:
call `get()` or `clear()` for every key. Find the `get` calls of a page object's helper, and review the check after each,
as after the `get` calls of a `SessionStorage` you create yourself:

```sh
grep -rn "sessionStorage.get(" --include=*.ts --exclude-dir=node_modules .
```

See [Session storage](/POMWright/docs/session-storage/#the-methods).

### A page object's helper stays on its origin

**Fails at run time.** In 2.x a page object's `sessionStorage` read and wrote whatever origin the page was on. In 3.x it
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

**Compiles**; **fails at run time** for a `locale` that Node's `Intl` rejects. The `log` fixture checks Playwright's
`locale` and `timezoneId` when a test starts, where 2.x ignored them, so a locale Chromium accepts but that is not a
BCP 47 tag, such as `en_US`, fails every test that requests `log`:

```text
log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"
```

Write it with hyphens. Find it with `grep -rn 'locale:' --include=*.ts --exclude-dir=node_modules .` in the configs and
the `test.use()` calls (see [Names in your locale](/POMWright/docs/logging/#names-in-your-locale)).

Attachment names use Playwright's `locale` and `timezoneId`, where 2.x always wrote them in `nb-NO`. For
the 2.x names, set `use: { locale: "nb-NO" }` in the config. POMWright's `log` fixture passes the test's `locale` and
`timezoneId`. A fixture of your own that calls `attachLogsToTest(testInfo)` gets the project's `use.locale` and
`use.timezoneId` from the config; to follow `test.use()` as well, it passes them:
`log.attachLogsToTest(testInfo, { locale, timeZone: timezoneId })`. Find such fixtures with
`grep -rn 'attachLogsToTest(' --include=*.ts --exclude-dir=node_modules .`.

A message is attached exactly as written, where 2.x re-formatted one that parsed as JSON: pass
`JSON.stringify(data, null, 2)` for indented JSON. Further arguments are printed as `console.log` prints them, where 2.x
wrote `[object Object]`. See [Logging to the report](/POMWright/docs/logging/).

## Reference

- [Release notes](https://github.com/DyHex/POMWright/releases) and the
  [changelog](https://github.com/DyHex/POMWright/blob/main/CHANGELOG.md)
- The 2.x documentation, at the [`v2.1.0` tag](https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2)
