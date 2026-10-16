---
title: SessionStorage
description: "Playwright's page.sessionStorage with batches, report steps, an origin check and per-key codecs; set, get, clear and seed; json, Codec and SessionStorageSchema."
---

`SessionStorage` is Playwright's [`page.sessionStorage`](https://playwright.dev/docs/api/class-page#page-session-storage)
with what a test suite adds: one call for several keys, a step in the report for every call, at the line that made it
(`Shop.SessionStorage.set:`), an origin check, per-key codecs, and [`seed`](#seed), which stores entries before the
app's next load on an origin. Values are strings, stored and read exactly as given, unless the schema declares a
[codec](#codec) for the key.

Every page object has one, `sessionStorage`, labelled with the page object's label, belonging to the origin of its
string `baseUrl`, and typed by its schema. You can also create one:

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
    Without it, the helper works on whatever origin the page is on, and `seed` needs `{ origin }`.

  - `schema` [SessionStorageSchema](#sessionstorageschema) *(optional)*

    Codecs by key, for keys that hold structured values. The helper's type parameter is the schema's type.

**Throws**

```text
Shop.SessionStorage.constructor: origin must be an origin such as "https://app.example" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "shop.example"
```

---

## Methods

Every method is a step of the report. `set`, `get` and `clear` work on the origin the page is on, and throw when the
helper belongs to another origin, or when the page has no origin yet:

```text
AccountPage.SessionStorage.get: the page is on https://login.example, not on this page object's origin https://shop.example; another origin's sessionStorage is reachable only from a document on it. Use the page object for https://login.example, or a standalone SessionStorage without an origin
Shop.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()
```

### clear()

Removes every entry, one key, or several.

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
  Values are typed by the schema: a declared key as its codec's type, any other key as a string.

**Throws**

```text
Shop.SessionStorage.get: value for "user" could not be decoded: {not json
```

The codec's error is the `cause`.

### seed()

Stores entries for an origin before the app's next load there, so the app's first script sees them, without leaving
the page the test is on. On the origin already, it writes at once. Elsewhere, the next navigation of the main frame
that reaches the origin, by `goto`, a link, a script, a form POST, a server redirect or a chain of them, is answered
with a document that stores the entries and continues the navigation, keeping its URL fragment; the app loads after
it. See [seeding session storage](/POMWright/docs/seeding-session-storage/).

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

At the call, without an origin; later, failing the test with this call's line in the stack, when the seed was
bypassed or never applied:

```text
Shop.SessionStorage.seed: an origin is required; pass { origin } or construct the helper with one
Shop.SessionStorage.seed: the seed for https://pay.example (keys: orderId) was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends
```

[What `seed` cannot do](/POMWright/docs/seeding-session-storage/#what-seed-cannot-do) lists every such case.

### set()

Writes one entry, or several, each value through its key's codec, or as the string it must be. Every value is
encoded before any is written, so a bad value writes nothing.

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
Shop.SessionStorage.set: value for "user" is not a string and no codec is declared for it
```

---

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

Turns the stored string into the value. An error it throws makes `get` fail, naming the key and the value.

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

## json

`json<T>()`: the JSON codec, `JSON.stringify` in and `JSON.parse` out. `T` types the key; the parsed value is not
checked against it, exactly as `JSON.parse(…) as T`. For a string key that the app reads as JSON, `json<string>()`
stores the quotes it expects.

**Returns**

- [Codec](#codec)\<T\>

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
