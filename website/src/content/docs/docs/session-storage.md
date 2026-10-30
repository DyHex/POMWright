---
title: Session storage
description: "SessionStorage: Playwright's page.sessionStorage with batches, step titles, origin checks and per-key codecs; through a page object or on its own."
---

## Introduction

Playwright reads and writes a page's session storage with
[`page.sessionStorage`](https://playwright.dev/docs/api/class-page#page-session-storage), one key at a time, strings
in and out. POMWright's `SessionStorage` is that API with what a test suite needs on top:

- one call for several keys;
- a step in the report for every call (`LoginPage.SessionStorage.set:`), at the line that made it;
- a check that a page object's helper only touches its own origin;
- codecs, so a key that holds structured data is declared once and typed everywhere;
- `seed`, which stores entries for an origin before the app's next load there (see
  [Seeding session storage](/POMWright/docs/seeding-session-storage/)).

Every page object has one, `sessionStorage`; you can also create one yourself.

## Values are strings

Session storage holds strings, and so does the helper: a value is stored and read back exactly as given, as
`sessionStorage.getItem()` in the app returns it:

```ts
import { test } from "./fixtures";

test("a token", async ({ loginPage }) => {
  await loginPage.navigation.goto();
  await loginPage.sessionStorage.set("token", "abc"); // the app reads "abc"
  const token = await loginPage.sessionStorage.get("token"); // "abc", or null when absent
});
```

## Codecs for structured values

A key whose value is JSON, or any other encoding, is declared once with a **codec**, `{ parse, stringify }`. `set`,
`get` and `seed` then take and return the decoded value, typed by key. A key typed `string` rather than a literal
may be any key, so its value is typed as a string or any declared codec's type, and so is a branded string; a pattern
such as `` `user:${string}` `` may be any declared key it matches, so its value is a string or one of those keys'
codecs' types. Pass the literal, or type the variable as the schema's keys (`keyof typeof schema`), to get one codec's
type. `json<T>()` is the one codec POMWright ships:

```ts
import type { Page } from "@playwright/test";
import { json, SessionStorage } from "pomwright";

declare const page: Page;
// ---cut---
type User = { name: string; age: number; nickname?: string };

const storage = new SessionStorage(page, {
  label: "Shop",
  origin: "https://shop.example",
  schema: { user: json<User>() },
});

await storage.set({ user: { name: "Ada", age: 36 }, token: "abc" }); // user stored as JSON, token as is
const user = await storage.get("user"); // User | null
const token = await storage.get("token"); // string | null
```

An optional property follows JSON: `{ name: "Ada", age: 36 }` is stored as `{"name":"Ada","age":36}`, without
`nickname`, and read back without it; a property set to `undefined` is left out the same way. A required property
stays required: a `user` without `name` does not compile.

A key that is not declared must be a string, at compile time and at runtime. `T` in `json<T>()` is not checked
against the parsed value, exactly like `JSON.parse(…) as T`. Some storage layers JSON-encode everything, strings
included; for such a key declare `json<string>()`, which stores the quotes the app expects.

Any other encoding is a few lines around a parser of your choice:

```ts
import type { Codec } from "pomwright";

const number = (): Codec<number> => ({
  parse: (raw) => {
    const value = Number(raw);
    if (Number.isNaN(value)) throw new TypeError(`not a number: ${raw}`);
    return value;
  },
  stringify: (value) => String(value),
});

const base64Json = <T>(): Codec<T> => ({
  parse: (raw) => JSON.parse(Buffer.from(raw, "base64").toString()) as T,
  stringify: (value) => Buffer.from(JSON.stringify(value)).toString("base64"),
});
```

A stored value its codec cannot decode makes `get` fail, naming the key and the codec's error, then the stored value,
whole and quoted, so an empty or whitespace value shows; the codec's error is also the `cause`.

## The methods

Every method takes one key or several:

```ts
import type { Page } from "@playwright/test";
import { SessionStorage } from "pomwright";

declare const page: Page;
declare const storage: SessionStorage;
// ---cut---
await storage.set("token", "abc");
await storage.set({ token: "abc", locale: "nb" });

await storage.get(); // every entry: { token: "abc", locale: "nb" }
await storage.get("token"); // "abc", or null
await storage.get(["token", "missing"]); // { token: "abc", missing: null }

await storage.clear("token");
await storage.clear(["token", "locale"]);
await storage.clear(); // everything
```

Every call takes its arguments when it is made, as Playwright's calls do: a value or a key list changed after the call,
while it waits for its turn, does not change what it does. `set` encodes every value then, before it writes any, so a
bad value writes nothing. It then writes one key at a time, as Playwright's `setItem` takes one. A literal `[]` is a
compile error for `get` and `clear`; a list that turns out empty at runtime reads or removes nothing.

Every call checks the page's origin before and after each storage call it makes, so a navigation to another origin stops
it: the call fails, naming where the page went, the keys done, which stay, and the one in flight. That one may have
reached the new document, since a call already sent cannot be taken back; the check detects it, but cannot prevent it.
A `get` the page left fails rather than return what it may have read there. A reload or a redirect within the origin
stops a call too, whether it lands during one of the call's storage calls or between two: the call also checks after
each that the page's document is the one it started in, since the app's next document may read storage before the
rest of the keys land, so the call fails where the race is. A `pushState` or a hash change keeps the document, and the
call goes on. Wait for the app to settle first, or seed before the navigation (see [when the app navigates by
itself](#when-the-app-navigates-by-itself)). The message names where the page went by its origin and path, without the
query or fragment, which may hold a redirect's tokens:

```text
Shop.SessionStorage.set: the page navigated to https://shop.example/home while set() was writing to https://shop.example; 2 of 60 keys were written ("k0", "k1"); "k2" was being written and may have reached the new document
Shop.SessionStorage.get: the page navigated to https://login.example/ while get() was reading "token" from https://shop.example; it may have read the new document
```

Calls for one origin act in the order they were made, also when they overlap. In a `Promise.all`, a `get` after a `set`
reads what the `set` wrote, and two `set` calls for one key leave the later value. The order holds across helpers:
every `SessionStorage` on a page, a page object's or a standalone one, waits for the earlier calls for its origin. A call
that waited checks the origin again when its turn comes, since the page may have left it meanwhile.

## Through a page object

A page object's helper is labeled with the page object's label, belongs to the origin of its string `baseUrl`, and
is typed by the schema the page object declares: the type goes in the second type argument, under `storage`, and the
value in the constructor's options:

```ts
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
```

Write the schema once, as a value, take the type from it (`storage: typeof accountStorage`), and pass that value.
TypeScript then holds the two together: a value without its type, and a value missing a codec for a declared key, are
compile errors, and so is a standalone `new SessionStorage<typeof accountStorage>(page)` without the value.

:::note
Two cases still compile. A page object that declares `storage` but passes no `sessionStorage.schema`: its helper has no
codecs, so a declared key is stored and read as the raw string, `get("user")` returns the stored text where its type
says an object, and a `json<string>()` value is stored without its quotes; only writing a value that is not a string
fails, with the message in [Errors](#errors). And a schema passed through a variable, with a codec its type does not
declare: TypeScript checks an object literal for keys its type lacks, not a variable, so the helper decodes that key
while its type says a string, and `get("count")` returns `42`, a number, typed `string | null`. [Issue
#58](https://github.com/DyHex/POMWright/issues/58), planned for the next major version, would close both.
:::

A helper that belongs to an origin refuses to touch another one, since another origin's storage can only be reached
from a document on it. That holds on a page at `about:blank` too, whose document may have inherited an origin, as a
popup from `window.open()` does; the message then names the URL:

```text
AccountPage.SessionStorage.get: the page is on https://login.example, not on this page object's origin https://shop.example; another origin's sessionStorage is reachable only from a document on it. Use the page object for https://login.example, or a standalone SessionStorage without an origin
AccountPage.SessionStorage.set: the page (about:blank) is on https://login.example, not on this page object's origin https://shop.example; another origin's sessionStorage is reachable only from a document on it. Use the page object for https://login.example, or a standalone SessionStorage without an origin
```

A helper without an origin, `new SessionStorage(page)`, works on whatever origin the page is on, the one its call is
made on: a call that waited for its turn behind an overlapping one, while the page left that origin, fails and does
nothing, rather than act on an origin it was not called on (`Shop.SessionStorage.set: the page left https://shop.example
for https://login.example while set() waited for its turn; the call did nothing`). On a page without an origin, before
the first navigation, every call fails at once: `Shop.SessionStorage.set: the page has no origin yet (about:blank);
navigate to the origin first or use seed()`. An `about:blank` popup from `window.open()` is not such a page: its
document inherited its opener's origin, so a call there works on that origin's storage, and when the browser refuses one
(its storage quota), the error is the browser's, labeled. A document whose own origin is opaque has no session storage
at all, so every call there fails too, saying so: a document served with `Content-Security-Policy: sandbox` without
`allow-same-origin`, or the error page Firefox shows at the origin's URL after a failed navigation. The message names
both, since nothing a browser guarantees tells them apart.

## As a fixture

A helper of its own is a fixture like a page object:

```ts
import { type Codec, json, SessionStorage, test as base } from "pomwright";

type User = { name: string };

export const test = base.extend<{ storage: SessionStorage<{ user: Codec<User> }> }>({
  storage: async ({ page }, use) => {
    await use(new SessionStorage(page, { label: "Shop", origin: "https://shop.example", schema: { user: json<User>() } }));
  },
});
```

## When the app navigates by itself

An app may reload or redirect itself as it loads (a login guard, a locale redirect, a reload after it writes a flag),
or after an action, once a request or a timer is done. A storage call made while that is under way fails with the
navigation message above. `page.goto()`, and a page object's `navigation.goto()` that calls it, waits for the page's
`load` event, as Playwright [documents](https://playwright.dev/docs/navigations); a navigation the app starts after
that, after a request, a timer, or as it finishes loading, is not waited for. So wait, in the test, for where the app
ends up, then call:

```ts
import { expect, test } from "./fixtures";

test("the app redirects to the account page as it loads", async ({ page, accountPage }) => {
  await page.goto("https://shop.example/");
  // the page object's URL and load state, then its actions after navigation
  await accountPage.navigation.expectThisPage();
  await accountPage.sessionStorage.set("theme", "dark");
});

test("the app reloads itself as it loads", async ({ accountPage }) => {
  await accountPage.navigation.goto();
  // the URL does not change, so expectThisPage would not wait: wait for what the app shows once it has settled
  await expect(accountPage.getNestedLocator("main.heading")).toBeVisible();
  await accountPage.sessionStorage.set("theme", "dark");
});

test("the app needs the value as it starts", async ({ accountPage }) => {
  await accountPage.sessionStorage.seed("theme", "dark");
  await accountPage.navigation.goto();
});
```

A wait that every test of a page needs belongs in the page object's
[actions after navigation](/POMWright/docs/page-objects/#actions-after-navigation), which `navigation.goto()` and
`navigation.expectThisPage()` run. A retry around the storage call, such as `expect(…).toPass()`, does not help: the
app may already have started without the values.

## Size and cost

Each key of a call is one of Playwright's storage calls, a round trip to the browser, as with `page.sessionStorage`
itself, since `setItem`, `getItem` and `removeItem` take one key. POMWright adds the document check: one more round
trip after each, and two per call to take and release its handle to the document (see [Internal → Seed
registry](/POMWright/internal/seed-registry/#the-origin-around-every-call)). A call has no timeout of its own, as
Playwright's storage calls have none; the test's timeout applies.

For the sizes tests use, a few to a few dozen keys, a call takes milliseconds. Its time grows with the number of keys
far more than with the size of the values: a long value takes a little longer to send, with Playwright's calls alone as
through POMWright, while every key adds round trips. Only thousands of keys add up to a second or more, about twice
what the same Playwright calls take alone. [Internal → Performance](/POMWright/internal/performance/#session-storage)
measures each call on three browsers, beside Playwright's calls and `seed` beside init scripts written by hand.

The browser's quota is 5,242,880 characters per origin, keys and values together, in each browser Playwright 1.64
ships; one value may take nearly all of it. A write past it fails with the browser's error, labeled, and the keys
written before it stay.

Neither the number of keys nor their size makes a call fail, apart from the quota: a navigation during the call does,
and a longer call is a longer window for one. Wait for the app to settle first, as above.

## Errors

| situation | message |
| --- | --- |
| a page without an origin | `Shop.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()` |
| a document with an opaque origin | `Shop.SessionStorage.set: the document at https://shop.example/embed cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)` |
| a page on another origin | `AccountPage.SessionStorage.get: the page is on …, not on this page object's origin …` |
| a value that is not a string, for a key without a codec | `Shop.SessionStorage.set: value for "user" is not a string and no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)` |
| a navigation during a call | `Shop.SessionStorage.set: the page navigated to https://shop.example/home while set() was writing to https://shop.example; 2 of 60 keys were written ("k0", "k1"); "k2" was being written and may have reached the new document` |
| a call of a helper without an origin that waited while the page left its origin | `Shop.SessionStorage.set: the page left https://shop.example for https://login.example while set() waited for its turn; the call did nothing` |
| a stored value its codec cannot decode | `Shop.SessionStorage.get: value for "user" could not be decoded (SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)); stored value, 9 characters: "{not json"` |

## Reference

- [`SessionStorage`](/POMWright/api/class-sessionstorage/), [`json`, `Codec` and `SessionStorageSchema`](/POMWright/api/class-sessionstorage/#codec)
- [Seeding session storage](/POMWright/docs/seeding-session-storage/)
- Playwright: [`page.sessionStorage`](https://playwright.dev/docs/api/class-page#page-session-storage)
