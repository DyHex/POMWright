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
`get` and `seed` then take and return the decoded value, typed by key. `json<T>()` is the one codec POMWright ships:

```ts
import type { Page } from "@playwright/test";
import { json, SessionStorage } from "pomwright";

declare const page: Page;
// ---cut---
type User = { name: string; age: number };

const storage = new SessionStorage(page, {
  label: "Shop",
  origin: "https://shop.example",
  schema: { user: json<User>() },
});

await storage.set({ user: { name: "Ada", age: 36 }, token: "abc" }); // user stored as JSON, token as is
const user = await storage.get("user"); // User | null
const token = await storage.get("token"); // string | null
```

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

A stored value its codec cannot decode makes `get` fail, naming the key and the value, with the codec's error as
`cause`.

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

`set` encodes every value before it writes any, so a bad value writes nothing. A literal `[]` is a compile error for
`get` and `clear`; a list that turns out empty at runtime reads or removes nothing.

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

A helper that belongs to an origin refuses to touch another one, since another origin's storage can only be reached
from a document on it:

```text
AccountPage.SessionStorage.get: the page is on https://login.example, not on this page object's origin https://shop.example; another origin's sessionStorage is reachable only from a document on it. Use the page object for https://login.example, or a standalone SessionStorage without an origin
```

A helper without an origin, `new SessionStorage(page)`, works on whatever origin the page is on. On a page without an
origin, before the first navigation, every call fails at once: `Shop.SessionStorage.set: the page has no origin yet
(about:blank); navigate to the origin first or use seed()`.

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
| a page on another origin | `AccountPage.SessionStorage.get: the page is on …, not on this page object's origin …` |
| a value that is not a string, for a key without a codec | `Shop.SessionStorage.set: value for "user" is not a string and no codec is declared for it` |
| a stored value its codec cannot decode | `Shop.SessionStorage.get: value for "user" could not be decoded: {not json` |

## Reference

- [`SessionStorage`](/POMWright/api/class-sessionstorage/), [`json`, `Codec` and `SessionStorageSchema`](/POMWright/api/class-sessionstorage/#codec)
- [Seeding session storage](/POMWright/docs/seeding-session-storage/)
- Playwright: [`page.sessionStorage`](https://playwright.dev/docs/api/class-page#page-session-storage)
