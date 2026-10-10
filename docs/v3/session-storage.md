# SessionStorage (v3)

## Overview

`SessionStorage` is Playwright's `page.sessionStorage` with the few things a test suite needs on top of it:

- Batches: one call writes, reads or clears several keys.
- Step titles: every call is a `test.step` named `<label>.SessionStorage.<method>:`.
- Origin checks: a page object's helper touches only its own origin, and an operation on a page without an origin
  fails at once with a message that names the fix.
- Codecs: a key that holds a structured value is declared once, so `set`, `get` and `seed` are typed by key.
- `seed`: entries for an origin are stored before the app's next load there, whatever kind of navigation takes the
  page there, so the app's first script already sees them.

Nothing is registered on the page unless a seed is pending, and everything is removed once it has been applied. A
test that never calls `seed` runs exactly as it would without POMWright.

Requires `@playwright/test` 1.61 or later, which added `page.sessionStorage`.

It is available as `PageObject.sessionStorage` or by direct construction.

---

## Constructor

```ts
import { json, SessionStorage } from "pomwright";

type User = { name: string; age: number };

const storage = new SessionStorage(page, {
  label: "Auth",                          // prefix for step titles and errors
  origin: "https://app.example",          // the origin this helper belongs to
  schema: { user: json<User>() },         // codecs by key; every other key is a string
});
```

| option | meaning |
| --- | --- |
| `label?` | Prefix for step titles (`Auth.SessionStorage.set:`) and error messages (`Auth.SessionStorage.set: …`). |
| `origin?` | The origin the helper belongs to: the default target of `seed`, and the only origin `set`, `get` and `clear` touch. An origin is `scheme://host[:port]`, nothing else; anything else is rejected at construction. |
| `schema?` | Codecs by key, see [Values and codecs](#values-and-codecs). |

A page object constructs its helper with its `label`, the origin of its string `baseUrl` (none for a RegExp
`baseUrl`), and the schema named in its options type, see [Through a page object](#through-a-page-object). A helper
without an `origin` operates on whatever origin the page is on, and its `seed` needs an explicit `{ origin }`.

---

## Values and codecs

**Values are strings, stored and read back exactly as given.** This is the Web Storage contract and Playwright's: an
app that does `sessionStorage.getItem("token")` gets what you wrote, no quotes added. A string you produced with
`JSON.stringify` is a string like any other and is stored verbatim.

```ts
await storage.set({ token: "eyJ…" });
// app: sessionStorage.getItem("token") === "eyJ…"
await storage.set({ user: JSON.stringify(user) });
// app: JSON.parse(sessionStorage.getItem("user")) → the object; storage.get("user") → the JSON string
```

**A codec moves the encoding into the helper and types the key.** Declare it once per key in the `schema`; `set`,
`get` and `seed` then take and return the decoded type for that key, and TypeScript checks key names and shapes
where they are written:

```ts
import { type Codec, json } from "pomwright";

const schema = { user: json<User>(), attempts: number() };
const storage = new SessionStorage(page, { schema });

await storage.set({ user, attempts: 3, token: "abc" }); // user → JSON, attempts → "3", token as is
const u = await storage.get("user");                      // User | null
const n = await storage.get("attempts");                  // number | null
const t = await storage.get("token");                     // string | null
await storage.set("attempts", "3");                       // compile-time error: attempts is a number
await storage.set({ other: { x: 1 } });                   // compile-time error, and a runtime TypeError: no codec for "other"
```

A codec is `{ parse(raw: string): T; stringify(value: T): string }`. `json<T>()` ships; `T` is a phantom type, so the
parsed value is not validated against it, exactly like `JSON.parse(...) as T`. Anything else is a few lines around
a parser of your choice; POMWright ships no other parser:

```ts
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

// over the XML parser your project already uses
const xml = <T>(): Codec<T> => ({
  parse: (raw) => parser.parse(raw) as T,
  stringify: (value) => builder.build(value),
});
```

A stored value that its codec cannot decode makes `get` reject naming the key and the raw value, with the codec's
error as `cause`. An undeclared key is never guessed at: `"123"` comes back as the string `"123"`.

**Which keys need a codec?** Only those your app stores as something other than a plain string. Note that some
storage layers JSON-encode everything, strings included: an Angular `ngx-webstorage` app stores a token as `"abc"`
with the quotes. For such keys declare `json<string>()`, which stores the quotes the app expects.

---

## Methods

Every method takes either one key or a record, and every value is typed by its key's codec.

### `set`

```ts
await storage.set("token", "abc");
await storage.set({ token: "abc", user });
```

Writes through `page.sessionStorage.setItem`. The whole record is encoded before anything is written, so a bad
value fails the call without a partial write.

### `get`

```ts
const all = await storage.get();                      // every present entry; declared keys decoded
const token = await storage.get("token");             // string | null
const some = await storage.get(["token", "user"]);    // { token: string | null; user: User | null }
```

A missing key is `null`, as `getItem` returns it; `get(keys)` always has every requested key. Without a schema
`get()` is `Record<string, string>`; with one, declared keys are decoded and optional, other keys are strings.

A literal `get([])` does not compile. A computed list that happens to be empty reads nothing and returns `{}`.

### `clear`

```ts
await storage.clear();                 // everything
await storage.clear("token");
await storage.clear(["token", "user"]);
```

A literal `clear([])` does not compile; a computed empty list removes nothing.

### `seed`

```ts
await loginPage.sessionStorage.seed({ token: "eyJ…", user }); // the page object's own origin
await storage.seed("token", "eyJ…", { origin: "https://b.example" });
```

`seed` makes sure the origin's `sessionStorage` holds the entries before the app's next load there, without
leaving the page the test is on:

- **On the origin already:** the entries are written at once. The app sees them the next time it reads storage,
  so reload or navigate if it reads only at startup.
- **Elsewhere:** the entries become pending for the origin. The next main-frame navigation that reaches the origin,
  by `goto`, a link, a script redirect, a meta refresh, a form POST, a server redirect or a redirect chain, is
  answered with a small document of POMWright's own that stores the entries and then continues the navigation. The
  app's document is loaded after that, so its first script already sees the entries.

The two patterns:

```ts
// 1. Everything known up front: seed every origin, then start the flow. Storage is per tab and per origin, so
//    each origin keeps its entries while the page is elsewhere.
await idpPage.sessionStorage.seed({ consent: "given" });
await loginPage.sessionStorage.seed({ token: "eyJ…" });
await loginPage.navigation.goto();
await loginPage.getLocator("main.continue").click();      // the app sends the user to the identity provider
await idpPage.navigation.expectThisPage();                // its first script saw consent

// 2. Data learned on the way: seed the next origin right before the hop.
await loginPage.navigation.goto();
const orderId = await loginPage.getLocator("main.order.id").textContent();
await paymentPage.sessionStorage.seed({ orderId });       // page stays on the login origin
await loginPage.getLocator("main.pay").click();           // the app hops to the payment origin
await paymentPage.navigation.expectThisPage();            // its first script saw orderId
```

Call `seed` as late as you can, right before the hop. While a seed is pending, main-frame navigations to other
origins are fetched by Playwright and handed back to the browser, which is how a server redirect towards the
pending origin can be seen; everything else, sub-resources, API calls, iframes, passes through untouched. The
window closes the moment the seed is applied.

**What a seeded hop looks like to the app.** The document POMWright serves occupies the target URL for a few
milliseconds, then replaces itself with the real request; `goto`, `waitForURL` and `expectThisPage` with the
default `load` wait resolve on the real document. The real request carries no `Referer` and
`Sec-Fetch-Site: same-origin`, since a document on the origin issues it. A navigation fetched by Playwright during
the window carries the browser's own `User-Agent`, cookies and client hints, and synthesised `Sec-Fetch-*` headers.
A form POST is re-submitted with the same fields; a 307 or 308 keeps method and body.

**What `seed` cannot do, and what happens instead:**

| case | behaviour |
| --- | --- |
| A seed is still pending when the page closes | The test fails, naming the origin and the keys. Remove the seed call, or navigate to the origin before the test ends. Do not seed defensively in a fixture that some tests never use. |
| A service worker registered by the app answers the navigation | Playwright's routes never see it, the app loads without the entries, and the test fails at once with the fixes. See [Service workers](#service-workers). |
| A route the test registered after `seed` fulfils the hop | Same failure; let that route call `route.fallback()` for the navigation. |
| A whole-page mock registered before `seed` for a navigation on another origin | Bypassed during the window: the real page loads. Register whole-page mocks after `seed`. Mocks of API and sub-resource requests are unaffected. |
| A multipart or text/plain POST navigation to the origin | Cannot be re-issued; it passes through unseeded and the test fails naming the method. |
| A fetch of a proxied navigation fails | The navigation is aborted and the tab shows the browser's error page; the next helper call, or the test's end, reports the failure with the cause. |
| The hop opens a new tab | A new tab has its own session storage; the seed stays pending and fails the test at close. |
| `waitUntil: "commit"` | The committed document is POMWright's; an `evaluate` right after can race. Use `load` or `domcontentloaded`, or wait for an element. |
| The app reads `Referer` on the hop | It sees none. |
| An app that inspects `response.request().redirectedFrom()` | During the window a redirect is a fresh navigation; there is no chain. |

Every one of these errors names the test line that called `seed`, not the listener that raised it.

---

## Through a page object

A page object names its schema type in its options type, under `storage`, and passes the schema value in the
constructor options. The URL options keep their defaults:

```ts
import type { Page } from "@playwright/test";
import { json, PageObject } from "pomwright";

const loginStorage = { user: json<User>(), attempts: number() };

class LoginPage extends PageObject<Paths, { storage: typeof loginStorage }> {
  constructor(page: Page) {
    super(page, "https://app.example", "/login", { sessionStorage: { schema: loginStorage } });
  }
  // defineLocators, pageActionsToPerformAfterNavigation …
}

class AccountPage extends PageObject<Paths, { urlPathType: RegExp; storage: typeof loginStorage }> { /* … */ }

await loginPage.sessionStorage.set({ user, attempts: 1 });   // typed by key
const user = await loginPage.sessionStorage.get("user");     // User | null
await loginPage.sessionStorage.seed({ user });                // this page object's origin, no argument needed
```

The helper takes the page object's `label` and the origin of its string `baseUrl`. On a RegExp `baseUrl` there is no
origin to take, so `seed` needs `{ origin }`. A page object without a `storage` option type has a helper where every
key is a string, as before.

**A page object's helper is bound to its origin.** `set`, `get` and `clear` throw when the page is on another
origin, because another origin's session storage is reachable only from a document on it:

```
LoginPage.SessionStorage.get: the page is on https://idp.example, not on this page object's origin
https://app.example; another origin's sessionStorage is reachable only from a document on it. Use the page object
for https://idp.example, or a standalone SessionStorage without an origin
```

`seed` is exempt, since reaching the origin is its job.

---

## Multi-origin flows

Session storage is per tab and per origin. In one tab, each origin's entries survive while the page is on another
origin: seed A and B, load A, let the app hop to B, come back to A, and A still has what was seeded and written
there. Nothing ever carries entries from one origin to another; an app that hands state across origins does it
through the URL, `postMessage` or a backend, and the receiving app writes its own storage.

A page object's helper reads and writes its own origin only; use the page object for the origin the page is on, or
a standalone helper without an origin, which follows the page.

---

## Frames

The helper and Playwright's API address the main frame's document. A same-origin iframe shares the main frame's
storage, so it sees what the helper writes. A cross-site iframe of a seeded origin shares that origin's tab storage
in Chromium and Firefox; WebKit partitions it. A hop started from inside an iframe with `top.location` is a
main-frame navigation and is seeded like a link.

---

## Service workers

Playwright's routes do not see a navigation that a service worker answers. If the app has registered a worker
that serves navigations itself, an app-shell or navigation-fallback strategy, a pending seed for that origin is
bypassed: the app loads without the entries, and the test fails at once:

```
LoginPage.SessionStorage.seed: the page navigated to https://app.example/orders but the pending seed for
https://app.example was not applied; the navigation was not intercepted: a service worker registered by the app
answered it, or a route the test registered after seed() fulfilled it; the app ran without the entries. Fixes: set
use: { serviceWorkers: "block" } in the Playwright config; seed before the app's first load in this context;
unregister the worker in the test before seeding; or let the test's own route call route.fallback() for that
navigation
```

The fixes, and what each changes:

- **`serviceWorkers: "block"`** in `playwright.config.ts` or `test.use(...)`: the worker never registers, so
  anything that needs it (offline caching, push, background sync, worker-side auth) is not exercised.
- **Seed before the app's first load in the context.** A new context has no worker until the app registers one, so
  the first navigation to the origin is always interceptable.
- **Unregister the worker in the test** (`navigator.serviceWorker.getRegistrations()`, then `unregister()`) before
  seeding; the app re-registers it on its next load.
- When the worker must stay active and the seed must come after the app has loaded, use `set` and reload: the app's
  next load sees the values, which is what 2.x's `reload` option gave.

A worker that lets navigations through (no `respondWith`) does not interfere.

---

## Errors

Every message starts with the step title.

| situation | message |
| --- | --- |
| page without an origin (`about:blank`) | `Auth.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()` |
| page on another origin | `LoginPage.SessionStorage.get: the page is on …, not on this page object's origin …` |
| `seed` without an origin | `Auth.SessionStorage.seed: an origin is required; pass { origin } or construct the helper with one` |
| undeclared key, non-string value | `Auth.SessionStorage.set: value for "user" is not a string and no codec is declared for it` |
| declared key, undecodable value | `Auth.SessionStorage.get: value for "user" could not be decoded: {not json` |
| seed bypassed | see [Service workers](#service-workers) |
| seed never applied | `Auth.SessionStorage.seed: the seed for https://b.example (keys: token, user) was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends` |

---

## As a fixture

```ts
import { json, SessionStorage, test as base } from "pomwright";

type Fixtures = { storage: SessionStorage<{ user: Codec<User> }> };

export const test = base.extend<Fixtures>({
  storage: async ({ page }, use) => {
    await use(new SessionStorage(page, { label: "Storage", origin: "https://app.example", schema: { user: json<User>() } }));
  },
});
```

---

## Migration from 2.x

| 2.x | 3.0 |
| --- | --- |
| `set({ token: "abc" })` reached the app as `"abc"` with quotes; every value was JSON-encoded | stored verbatim; declare `json<T>()` for structured keys, `json<string>()` for string keys the app parses as JSON |
| `set<T>()` / `get<T>()` generics as unchecked casts | the schema types every key; no per-call generics |
| `get(["a", "missing"])` → `{ a }` | `{ a, missing: null }` |
| `get([])` and `clear([])` meant everything | a literal `[]` does not compile; a computed empty list means no keys |
| `setOnNextNavigation(x)` | `seed(x)`, which also works for server redirects and never leaves the page |
| `set(x, { reload: true })` | `set(x)` then `page.reload()` |
| `waitForContext: true` | removed; a page without an origin fails at once, and `seed` covers the first load |
| `get` or `set` from any page object touched whatever origin the page was on | a page object's helper refuses another origin |
| a seed that never fired was silent | the test fails at close |

```sh
grep -rnE 'setOnNextNavigation|waitForContext|reload: true' --include=*.ts .
```

Requires `@playwright/test` 1.61 or later.
