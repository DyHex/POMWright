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
may be any key, so its value is typed as a string or any declared codec's type; pass the literal, or type the variable
as the schema's keys (`keyof typeof schema`), to get one codec's type. `json<T>()` is the one codec POMWright ships:

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

`set` encodes every value before it writes any, so a bad value writes nothing. It then writes one key at a time, as
Playwright's `setItem` takes one. A literal `[]` is a compile error for `get` and `clear`; a list that turns out empty at
runtime reads or removes nothing.

Every call checks the page's origin before and after each storage call it makes, so a navigation to another origin stops
it: the call fails, naming the keys done, which stay, and the one in flight. That one may have reached the new
document, since a call already sent cannot be taken back; the check detects it, but cannot prevent it. A `get` the page
left fails rather than return what it may have read there:

```text
Shop.SessionStorage.set: the page navigated while set() was writing to https://shop.example; 2 of 60 keys were written (k0, k1); k2 was being written and may have reached the new document
Shop.SessionStorage.get: the page navigated while get() was reading "token" from https://shop.example; it may have read the new document
```

Calls for one origin act in the order they were made, also when they overlap. In a `Promise.all`, a `get` after a `set`
reads what the `set` wrote, and two `set` calls for one key leave the later value. The order holds across helpers:
every `SessionStorage` on a page, a page object's or a standalone one, waits for the earlier calls for its origin. A call
that waited checks the origin again when its turn comes, since the page may have left it meanwhile.

## Through a page object

A page object's helper is labelled with the page object's label, belongs to the origin of its string `baseUrl`, and
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

:::note
The type and the value go together, and nothing checks that both are there. A page object that declares `storage` but
passes no `sessionStorage.schema` compiles, and its helper has no codecs: a declared key is stored and read as the raw
string, so `get("user")` returns the stored text where its type says an object, and a `json<string>()` value is stored
without its quotes. Only writing a value that is not a string fails, with the message in [Errors](#errors).
:::

A helper that belongs to an origin refuses to touch another one, since another origin's storage can only be reached
from a document on it. That holds on a page at `about:blank` too, whose document may have inherited an origin, as a
popup from `window.open()` does; the message then names the URL:

```text
AccountPage.SessionStorage.get: the page is on https://login.example, not on this page object's origin https://shop.example; another origin's sessionStorage is reachable only from a document on it. Use the page object for https://login.example, or a standalone SessionStorage without an origin
AccountPage.SessionStorage.set: the page (about:blank) is on https://login.example, not on this page object's origin https://shop.example; another origin's sessionStorage is reachable only from a document on it. Use the page object for https://login.example, or a standalone SessionStorage without an origin
```

A helper without an origin, `new SessionStorage(page)`, works on whatever origin the page is on. On a page without an
origin, before the first navigation, every call fails at once: `Shop.SessionStorage.set: the page has no origin yet
(about:blank); navigate to the origin first or use seed()`. A document whose own origin is opaque has no session
storage at all, so every call there fails too, saying so: a document served with `Content-Security-Policy: sandbox`
without `allow-same-origin`, or the error page Firefox shows at the origin's URL after a failed navigation. The message
names both, since nothing a browser guarantees tells them apart.

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

## Errors

| situation | message |
| --- | --- |
| a page without an origin | `Shop.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()` |
| a document with an opaque origin | `Shop.SessionStorage.set: the document at https://shop.example/embed cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)` |
| a page on another origin | `AccountPage.SessionStorage.get: the page is on …, not on this page object's origin …` |
| a value that is not a string, for a key without a codec | `Shop.SessionStorage.set: value for "user" is not a string and no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)` |
| a navigation during a call | `Shop.SessionStorage.set: the page navigated while set() was writing to https://shop.example; 2 of 60 keys were written (k0, k1); k2 was being written and may have reached the new document` |
| a stored value its codec cannot decode | `Shop.SessionStorage.get: value for "user" could not be decoded (SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)); stored value, 9 characters: "{not json"` |

## Reference

- [`SessionStorage`](/POMWright/api/class-sessionstorage/), [`json`, `Codec` and `SessionStorageSchema`](/POMWright/api/class-sessionstorage/#codec)
- [Seeding session storage](/POMWright/docs/seeding-session-storage/)
- Playwright: [`page.sessionStorage`](https://playwright.dev/docs/api/class-page#page-session-storage)
