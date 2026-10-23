---
title: SessionStorage
description: "Playwright's page.sessionStorage with batches, report steps, an origin check and per-key codecs; set, get, clear and seed; json, Codec and SessionStorageSchema."
---

`SessionStorage` is Playwright's [`page.sessionStorage`](https://playwright.dev/docs/api/class-page#page-session-storage)
with batches, report steps, an origin check, per-key [codecs](#codec) and [`seed`](#seed). Values are strings unless the
schema declares a codec for the key. Every page object has one, `sessionStorage`; you can also create one:

```ts
import type { Page } from "@playwright/test";
import { json, SessionStorage } from "pomwright";

declare const page: Page;
// ---cut---
const storage = new SessionStorage(page, {
  label: "Shop",
  origin: "https://shop.example",
  schema: { user: json<{ name: string; age: number }>() },
});

await storage.seed({ token: "abc", user: { name: "Ada", age: 36 } });
await page.goto("https://shop.example/");
const user = await storage.get("user"); // { name: "Ada", age: 36 }
```

Guides: [session storage](/POMWright/docs/session-storage/),
[seeding session storage](/POMWright/docs/seeding-session-storage/).

---

## Constructor

### new SessionStorage()

**Usage**

```ts
import type { Page } from "@playwright/test";
import { SessionStorage } from "pomwright";

declare const page: Page;
// ---cut---
const payment = new SessionStorage(page, { label: "Payment", origin: "https://pay.example" });
```

**Arguments**

- `page` [Page](https://playwright.dev/docs/api/class-page)
- `options` Object *(optional)*
  - `label` string *(optional)*

    The prefix of step titles and error messages: `Payment` gives `Payment.SessionStorage.seed:`. Without it,
    `SessionStorage.seed:`.

  - `origin` string *(optional)*

    The origin the helper belongs to: the default origin of `seed`, and the only one `set`, `get` and `clear` touch.
    Without it, the helper works on whatever origin the page is on, and `seed` needs `{ origin }`. A scheme without an
    origin in the URL standard, such as `chrome-extension://…/` or `file://…/`, is rejected.

  - `schema` [SessionStorageSchema](#sessionstorageschema) *(optional)*

    Codecs by key, for keys that hold structured values. The helper's type parameter is the schema's type.

**Throws**

```text
Shop.SessionStorage.constructor: origin must be an origin such as "https://app.example" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "shop.example"
Shop.SessionStorage.constructor: origin must be an origin such as "https://app.example" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "chrome-extension://abcdef/", whose scheme has no URL origin
```

---

## Methods

Every method is a step of the report. Calls for one origin act in the order they were made, also when they overlap,
across every helper on the page (see [the methods](/POMWright/docs/session-storage/#the-methods)). `set`, `get` and
`clear` work on the origin the page is on, and throw when the helper belongs to another origin, or when the page has
no origin yet:

```text
AccountPage.SessionStorage.get: the page is on https://login.example, not on this page object's origin https://shop.example; another origin's sessionStorage is reachable only from a document on it. Use the page object for https://login.example, or a standalone SessionStorage without an origin
Shop.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()
```

### clear()

Removes every entry, one key, or several, one key at a time.

**Usage**

```ts
import type { SessionStorage } from "pomwright";

declare const storage: SessionStorage;
// ---cut---
await storage.clear("token");
await storage.clear(["token", "locale"]);
await storage.clear(); // everything
```

**Arguments**

- `key` string | string[] *(optional)*

  A literal `[]` does not compile; a list that is empty at run time removes nothing.

**Returns**

- Promise\<void\>

**Throws**

```text
Shop.SessionStorage.clear: the page navigated while clear() was removing keys from https://shop.example; 1 of 3 keys were removed (token)
```

When the page navigates while several keys are being removed; the keys it names are gone.

### get()

Reads every entry, one key, or several, each value through its key's codec. A missing key reads as `null`.

**Usage**

```ts
import type { SessionStorage } from "pomwright";

declare const storage: SessionStorage;
// ---cut---
await storage.get(); // every entry: { token: "abc", locale: "nb" }
await storage.get("token"); // "abc", or null
await storage.get(["token", "missing"]); // { token: "abc", missing: null }
```

**Arguments**

- `key` string | string[] *(optional)*

  A literal `[]` does not compile; a list that is empty at run time reads nothing.

**Returns**

- Promise: every present entry; the value or `null`; or a record with every key asked for, `null` for each missing one.
  Values are typed by the schema: a declared key as its codec's type, any other key as a string, and a key typed
  `string` rather than a literal as a string or any declared codec's type (see [Decoded](#decoded)).

**Throws**

```text
Shop.SessionStorage.get: value for "user" could not be decoded (SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)); stored value, 9 characters: "{not json"
```

The codec's error is the `cause`.

### seed()

Stores entries for an origin before the app's next load there, so the app's first script sees them, without leaving
the page the test is on; on the origin already, it writes at once. See
[how it works](/POMWright/docs/seeding-session-storage/#how-it-works).

Calls for one origin merge in the order they were made, later values winning per key, also when they overlap, on the
origin or before the hop. Await
`seed` before the action that starts the hop: see
[several seeds](/POMWright/docs/seeding-session-storage/#several-seeds). Entries that are empty at run time
(`seed({})`) do nothing.

**Usage**

```ts
import type { LoginPage } from "./login.page";

declare const loginPage: LoginPage;
// ---cut---
await loginPage.sessionStorage.seed({ token: "eyJ…" });
await loginPage.navigation.goto(); // the app's first script already sees the token
```

**Arguments**

- `entries` Object, or `key` string and `value`

  The keys and values: strings, or the types of the keys' codecs.

- `options` Object *(optional)*
  - `origin` string *(optional)*

    The origin to seed. Defaults to the helper's origin.

**Returns**

- Promise\<void\>

**Throws**

At the call, without an origin, in a browser without the Navigation API, when the page commits a document on the
origin while the seed is being registered, and when the page closes before it is registered; later, failing the test with this call's line in the stack, when the
browser refuses the write, when the document that arrives on the origin does not take the seed (a failed navigation
there), or when the page closes before the seed was applied:

```text
Shop.SessionStorage.seed: an origin is required; pass { origin } or construct the helper with one
Shop.SessionStorage.seed: the page committed a document on https://pay.example while seed() was registering, so the app may have started without the entries; await that navigation before seeding, or seed before starting it
Shop.SessionStorage.seed: seed() needs the Navigation API (navigation.activation) to write only on the first arrival at https://pay.example, and this browser has none (Mozilla/5.0 …); use set() on the origin and reload instead
Shop.SessionStorage.seed: the page closed while seed() was registering the seed for https://pay.example (keys: orderId); await seed() before the test ends
Shop.SessionStorage.seed: could not write sessionStorage for https://pay.example (keys: orderId): QuotaExceededError: The quota has been exceeded.; the app loaded without the entries
Shop.SessionStorage.seed: the seed for https://pay.example (keys: orderId) was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends
Shop.SessionStorage.seed: the seed for https://pay.example (keys: orderId) was not applied: the document that arrived on https://pay.example has an opaque origin (the browser's error page after a failed navigation, or a sandboxed document)
Shop.SessionStorage.seed: the seed for https://pay.example (keys: orderId) was not applied: the browser counted the page's arrival on https://pay.example as a return there (navigation.activation.from is set), as after a failed navigation to it
```

[What `seed` cannot do](/POMWright/docs/seeding-session-storage/#what-seed-cannot-do) lists every such case.

### set()

Writes one entry, or several, each value through its key's codec, or as the string it must be. Every value is
encoded before any is written, so a bad value writes nothing. The values are then written one key at a time, as
Playwright's `setItem` takes one: a navigation during the batch stops it, and the keys written before it stay.

**Usage**

```ts
import type { SessionStorage } from "pomwright";

declare const storage: SessionStorage;
// ---cut---
await storage.set("token", "abc");
await storage.set({ token: "abc", locale: "nb" });
```

**Arguments**

- `entries` Object, or `key` string and `value`

  The keys and values: strings, or the types of the keys' codecs.

**Returns**

- Promise\<void\>

**Throws**

```text
Shop.SessionStorage.set: value for "user" is not a string and no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)
Shop.SessionStorage.set: value for "user" could not be encoded
Shop.SessionStorage.set: the codec for "user" returned undefined instead of a string
Shop.SessionStorage.set: the document at https://shop.example/embed cannot use sessionStorage: its origin is opaque, as in a sandboxed document (Content-Security-Policy: sandbox without allow-same-origin)
Shop.SessionStorage.set: the page navigated while set() was writing to https://shop.example; 2 of 60 keys were written (k0, k1)
```

The second when the key's codec throws, with its error as `cause`; the third when it returns something other than a
string; the fourth on a sandboxed document, whose origin is opaque, as from `get`, `clear` and `seed` there; the fifth
when the page navigates during the batch, naming the keys already written. Any other error from
Playwright gets the label in front of its message and is the `cause`.

---

## AllEntries

What [`get()`](#get) returns without an argument: every entry, as `Record<string, string>` without a schema; with one,
the declared keys typed by their codecs and every other key a string.

```ts
import { json, type AllEntries } from "pomwright";

const accountStorage = { user: json<{ name: string }>() };
type Everything = AllEntries<typeof accountStorage>;
// { user?: { name: string } | undefined } & Record<string, string | { name: string }>
```

## Codec

`Codec<T>`: how a key's value is stored as a string and read back. Declare one per key in a schema; [`json`](#json) is
the one POMWright ships. See [codecs](/POMWright/docs/session-storage/#codecs-for-structured-values).

```ts
import type { Codec } from "pomwright";

const number = (): Codec<number> => ({
  parse: (raw) => Number(raw),
  stringify: (value) => String(value),
});
```

### parse()

Turns the stored string into the value. An error it throws makes `get` fail, naming the key, the error and the stored value.

**Arguments**

- `raw` string

**Returns**

- T

### stringify()

Turns the value into the string to store. It must return a string.

**Arguments**

- `value` T

**Returns**

- string

## Decoded

The type of a key's value under a schema: `Decoded<S, K>` is the codec's type when `K` is a declared key of `S`, and
`string` otherwise. [`get`](#get) returns it (with `null`), and [`set`](#set) and [`seed`](#seed) take it.

```ts
import { json, type Decoded } from "pomwright";

const accountStorage = { user: json<{ name: string }>() };
type User = Decoded<typeof accountStorage, "user">; // { name: string }
type Token = Decoded<typeof accountStorage, "token">; // string
type AnyKey = Decoded<typeof accountStorage, string>; // string | { name: string }
```

A key typed `string` may be any key, so its value is a string or any declared codec's type.

## json

`json<T>()`: the JSON codec, `JSON.stringify` in and `JSON.parse` out. `T` types the key and is not checked against the
parsed value. See [codecs for structured values](/POMWright/docs/session-storage/#codecs-for-structured-values).

**Returns**

- [Codec](#codec)\<T\>

## SeedOptions

The options of [`seed`](#seed).

### origin

`string` *(optional)*

The origin to seed. Defaults to the helper's origin.

## SessionStorageOptions

`SessionStorageOptions<S>`: the options of [`new SessionStorage()`](#new-sessionstorage), for a helper of your own
that forwards them. `S` is the schema's type.

### label

`string` *(optional)*

The prefix of step titles and error messages: `Shop` gives `Shop.SessionStorage.set:`.

### origin

`string` *(optional)*

The origin the helper belongs to: the default origin of `seed`, and the only one `set`, `get` and `clear` touch.

### schema

`S` *(optional)*

Codecs by key, for keys that hold structured values.

## SessionStorageSchema

`Record<string, Codec<unknown>>`: codecs by key, the `schema` option of `SessionStorage` and of a
[page object's](/POMWright/api/class-pageobject/#new-pageobject) `sessionStorage` option. A key that is not declared
holds a string. A page object names the schema's type in its second type argument:

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
