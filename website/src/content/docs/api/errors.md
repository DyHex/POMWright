---
title: Error messages
description: "Every message POMWright throws, by the call that throws it, with what it means and what to change."
---

Every message names what it is about: the path, the method you called, the page object's label or the session
storage helper's. Messages are grouped by the call that throws them; `…` stands for the part that varies. A page
object adds its label in front of a message thrown by `defineLocators()` or the check after it (see
[page objects](#page-objects)).

---

## Paths

Thrown by a locator method of `add(path)` and by the resolving methods, when a path breaks the path rules. TypeScript
rejects these paths where they are written, so the messages come from JavaScript or from a path built at run time. See
[paths and the registry](/POMWright/docs/locator-paths/).

```text
LocatorSchemaPath must be a string; received 42.
LocatorSchemaPath string cannot be empty
LocatorSchemaPath string cannot contain whitespace chars: main\u00A0.form
LocatorSchemaPath string cannot start with a dot: .main
LocatorSchemaPath string cannot end with a dot: main.
LocatorSchemaPath string cannot contain consecutive dots: main..list
```

Whitespace is shown escaped, so a non-breaking space is visible. Fix the path.

---

## Registering

### A path registered twice

```text
A locator schema with the path "main" already exists.
Existing and attempted schemas: { … }
```

Thrown by the locator method of a second `add(path)` for the same path, or, with `{ reuse }`, by `add` itself, which
registers at once. Each path has one locator: give the second one its own path, or change the first.

### Two locator methods on one registration

```text
A locator definition for "main" has already been provided; only one locator type can be set for a registration.
```

Thrown by a second locator method on the same `add(path)`. Register one locator per path.

### A first argument that is missing or empty

```text
getByRole requires a role value for "main.button@save".
getByRole requires a non-empty role for "main.heading".
locator requires a non-empty selector for "main.list".
frameLocator requires a non-empty selector for "shell.frame".
getById requires a non-empty id for "main.panel@settings".
getByTestId requires a testId value for "main.row@order".
```

Thrown by a locator method of `add`, `createReusable` (`createReusable.getByRole requires a role value.`, without a
path) and `replace` when the first argument is missing (from JavaScript), and by those and by `update` and a seeded
`add` when it is not a string or RegExp where one is needed, or is an empty string where Playwright cannot use one:
`locator`, `frameLocator`, `getByRole` and `getById`. On `update` and a seeded `add` an omitted first argument keeps
the registered one. `getByText("")`, `getByTestId("")` and the other text methods store the
empty string, which Playwright matches. See [registering locators](/POMWright/docs/registering-locators/#the-first-argument).

### A registration that has ended

```text
nth() cannot apply to "main.button@save": its registration was ended by add("main.list.item"); give a registration all its steps in its add(…) chain, or query the path for one use.
filter() cannot apply to "list.item@open": its registration was ended by getLocator("badge"). If that call is in this filter's arguments, which run first, resolve the locator before add(…), or pass a path, which resolves to that path's own locator: filter({ has: "badge" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
```

A method of a registration kept in a variable, called after the registry was called again (the next `add`,
`getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify`, or the resolution of a query), which the message names.
Give the registration all its steps before that, in its chain; for a variation of one use, query the path. A
`getLocator` or `getNestedLocator` in a filter's own arguments runs before the filter: pass a path, or resolve the
locator before `add(…)`. See
[registering locators](/POMWright/docs/registering-locators/#registered-locators-do-not-change).

### A step before the locator method

```text
filter() needs a locator strategy first for "main.list.item"; call getByRole, getByText, getByLabel, getByPlaceholder, getByAltText, getByTitle, locator, frameLocator, getByTestId or getById before it.
```

From JavaScript; TypeScript offers `filter`, `nth` and `describe` only after a locator method. Call the locator method
first.

### A description that is not a string

```text
describe requires a string for "main.list.item@first"; pass "" to remove the description.
createReusable.describe requires a string; pass "" to remove the description.
```

From JavaScript. `describe("")` removes a description.

---

## Reusing

```text
No locator schema registered for path "main.nothing".
Locator reuse path cannot be the same as registration path: "main.same".
reuse requires a registered path or a seed from createReusable for "main.list.item@null".
```

Thrown by `add(path, { reuse })`: the reused path is not registered (register it first, or fix its name); the path
reuses itself; or the value is neither a path nor a seed (from JavaScript).

```text
Invalid reuse path configuration for "main.same": Invalid reuse path, reuse path cannot be the same as registration path: main.same
```

Thrown from JavaScript by `add(path, { reuse })` when `reuse` is an array: the form in which the types report a path
that reuses itself, so only JavaScript can pass it. Reuse another path.

```text
The locator definition for "main.button@cancel" must use the "role" strategy when reusing a locator.
A locator definition for "main.link@help" was already provided from reuse; only one matching override is allowed.
```

Thrown by the locator method after `add(path, { reuse: seed })`: another strategy than the seed's, or a second call on a
registration kept in a variable.
A seed's locator can be patched once, with its own method; for another strategy, make another seed.

```text
reuse cannot apply to "bannerFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

A seed of the any-frame `frameLocator()` with steps or a description, which it cannot have.

---

## Resolving and verifying

Thrown by `getNestedLocator`, `getLocator`, a query's resolving methods, and `verify()`, which collects every one of
them for every path:

```text
Locator registry verification failed for 1 of 2 paths:
  "list.items": No locator schema registered for path "list.titel".
```

### A path that is not registered

```text
No locator schema registered for path "main.list.item".
```

The path, or a path a `has` or `hasNot` filter names, has no locator. Register it, or fix the name. A segment of a
path that is not registered is left out of the chain and is not an error; with
[`strictChains`](/POMWright/api/class-locatorregistry/#strictchains) it is:

```text
"main.form.button.save": strictChains requires every ancestor to be registered; "main.form" and "main.form.button" are not.
```

### A cycle of filter paths

```text
Detected cyclic filter reference while resolving "list@orders": "list@archive".
```

Two paths whose `has` or `hasNot` filters name each other, directly or through others. Remove one reference.

### A filter reference that is neither a Locator nor a path

```text
Unsupported filter reference while resolving "list". Filter has/hasNot supports Playwright Locator instances or registry path strings.
```

From JavaScript. Pass a Playwright `Locator` or a registered path.

### The any-frame `frameLocator()` in the wrong place

```text
frameLocator() without a selector must be the first segment of the chain; "shell.anyFrame" has the ancestor "shell".
frameLocator() without a selector does not point to a particular iframe; "anyFrame" cannot be resolved on its own, filtered or indexed; resolve a path inside it.
```

The any-frame segment must be the first registered segment of its chain, and it has no element of its own: resolve a
path inside it, or give it a selector. See [frames](/POMWright/docs/frames/#any-frame-framelocator-without-a-selector).

---

## Queries

Thrown at the call by the methods of a [query](/POMWright/api/class-locatorquerybuilder/).

```text
"main.button@save" is not a valid sub-path of "main.list.item".
"main.form" is not a valid sub-path of "main.form.button@save". It is a segment of that path, but no locator schema is registered for it.
```

A `subPath` must be the query's path or one of its registered ancestors.

```text
filter() cannot apply to "main.list": it is skipped in this query; call unskip("main.list") first.
skip() cannot skip "main.list": it is already skipped in this query.
skip() cannot skip "main.button@save": it is the path this query resolves; skip one of its ancestors.
unskip() cannot unskip "main.list": it is not skipped in this query.
```

`update`, `replace`, `filter`, `nth` and `clearSteps` reject a skipped segment until `unskip`; the query's own path
cannot be skipped (a compile error, and this message from JavaScript).

```text
update("main.button@save") cannot change the strategy from "role" to "locator"; use replace("main.button@save").locator(…) instead.
```

`update` patches the registered locator and keeps its strategy; `replace` installs one of another strategy.

```text
replace() cannot apply to "main.frame@payment": it is the path this query resolves, and frameLocator() without a selector has no element to resolve to; replace an ancestor instead.
replace() cannot apply to "main.list": it has filter or nth steps, and frameLocator() without a selector takes none; call clearSteps("main.list") first.
filter() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

The any-frame form has no element: it cannot be the query's own path, carry steps, or be filtered or indexed.

---

## Page objects

### URLs

```text
LoginPage: baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "localhost:9000".
LoginPage: baseUrl must be an origin such as "https://example.com" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "chrome-extension://abcdef/", whose scheme has no URL origin.
LoginPage: baseUrl must be a string or a RegExp; received undefined.
LoginPage: urlPath must be "" or start with exactly one "/"; received "login".
LoginPage: urlPath must be a path on the page object's origin; received "/\\login.example/account", which names the host "login.example" instead. A "/" followed by another "/" or a "\", also with a tab or line break between them, starts a host.
```

Thrown by the constructor. A string `baseUrl` is an origin with a scheme and nothing after it; a path goes in
`urlPath`. `undefined` usually means an environment variable that is not set. See
[URLs and navigation](/POMWright/docs/urls-and-navigation/#baseurl-and-urlpath).

### Locators

```text
LoginPage: defineLocators() failed: A locator schema with the path "main" already exists. …
LoginPage: Locator registry verification failed for 1 of 5 paths:
  "main.form@login": No locator schema registered for path "main.form@login.heading".
```

An error from `defineLocators()`, or from the check of every path after it, labelled with the page object and with
the original as `cause`. It fails the fixture that created the page object, before the test body, with the line that
constructed the page object in its stack, and every later locator call on the page object throws it again. Fix the
message after the label. See [page objects](/POMWright/docs/page-objects/#how-a-mistake-is-reported).

---

## Navigation

```text
OrdersPage: expected URL "https://shop.example/orders"; found "https://shop.example/orders?tab=1" (page.waitForURL: Timeout 15000ms exceeded.)
OrdersPage: expected to have left "https://shop.example/orders"; found "https://shop.example/orders" (page.waitForURL: Timeout 15000ms exceeded.)
OrdersPage: left "https://shop.example/orders" but returned to it; found "https://shop.example/orders"
```

Thrown by `expectThisPage()` and `expectAnotherPage()` when the browser is not where they wait for it within the
timeout, with Playwright's error as `cause`. A page's identity is its exact URL; a page whose URL varies has a RegExp
part.

```text
AccountPage: goto() without a URL needs a string fullUrl; this page object has a RegExp URL. Pass an absolute URL instead.
AccountPage: goto("/account") needs an absolute URL because baseUrl is a RegExp.
Cannot resolve "http://" against baseUrl "https://shop.example".
```

Thrown by `goto()`: from JavaScript on a page object whose URL is a RegExp, and for a target that is not a URL, such as
a scheme with nothing after it.

---

## Session storage

Thrown by the methods of [`SessionStorage`](/POMWright/api/class-sessionstorage/), prefixed with the helper's label
and method.

```text
Shop.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()
Shop.SessionStorage.set: the document at https://shop.example/embed cannot use sessionStorage: its origin is opaque, as in a sandboxed document (Content-Security-Policy: sandbox without allow-same-origin)
AccountPage.SessionStorage.get: the page is on https://login.example, not on this page object's origin https://shop.example; another origin's sessionStorage is reachable only from a document on it. Use the page object for https://login.example, or a standalone SessionStorage without an origin
```

`set`, `get` and `clear` work on the page's current origin, so the page must be on one, and a helper that belongs to
an origin must be on it. A sandboxed document has no session storage, although its URL has an origin.

```text
Shop.SessionStorage.set: the page navigated while set() was writing to https://shop.example; 2 of 60 keys were written (k0, k1)
Shop.SessionStorage.clear: the page navigated while clear() was removing keys from https://shop.example; 1 of 3 keys were removed (token)
```

Playwright writes and removes one key per call, so a navigation can stop a batch; the keys named were done, and stay
so. Any other error from Playwright gets the label in front of its message and is the `cause`.

```text
Shop.SessionStorage.set: value for "user" is not a string and no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)
Shop.SessionStorage.set: value for "user" could not be encoded
Shop.SessionStorage.set: the codec for "user" returned undefined instead of a string
Shop.SessionStorage.get: value for "user" could not be decoded (SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)); stored value, 9 characters: "{not json"
```

A key without a codec holds a string; declare a codec for a key that holds anything else. A codec's own error is the
`cause`.

```text
Shop.SessionStorage.constructor: origin must be an origin such as "https://app.example" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "shop.example"
Shop.SessionStorage.constructor: origin must be an origin such as "https://app.example" or "http://localhost:9000" (scheme, host, optional port, no path, query or hash); received "chrome-extension://abcdef/", whose scheme has no URL origin
```

### seed

```text
Shop.SessionStorage.seed: an origin is required; pass { origin } or construct the helper with one
Shop.SessionStorage.seed: the page committed a document on https://pay.example while seed() was registering, so the app may have started without the entries; await that navigation before seeding, or seed before starting it
Shop.SessionStorage.seed: seed() needs the Navigation API (navigation.activation) to write only on the first arrival at https://pay.example, and this browser has none (Mozilla/5.0 …); use set() on the origin and reload instead
Shop.SessionStorage.seed: the page closed while seed() was registering the seed for https://pay.example (keys: orderId); await seed() before the test ends
```

At the call, the last when the page closes before the seed is registered. The others fail the test later, when the app's document loads or when the page closes, with the line of
the `seed` call in the stack:

```text
Shop.SessionStorage.seed: could not write sessionStorage for https://pay.example (keys: orderId): QuotaExceededError: The quota has been exceeded.; the app loaded without the entries
Shop.SessionStorage.seed: the seed for https://pay.example (keys: orderId) was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends
Shop.SessionStorage.seed: the seed for https://pay.example (keys: orderId) was not applied: the document that arrived on https://pay.example has an opaque origin (the browser's error page after a failed navigation, or a sandboxed document)
Shop.SessionStorage.seed: the seed for https://pay.example (keys: orderId) was not applied: the browser counted the page's arrival on https://pay.example as a return there (navigation.activation.from is set), as after a failed navigation to it
```

See [what `seed` cannot do](/POMWright/docs/seeding-session-storage/#what-seed-cannot-do).

---

## `@step`

```text
@step decorates methods that return a Promise: make the method async
```

A compile error, on a method that does not return a Promise. Make the method `async`.

```text
@step decorator can only be applied to methods.
```

From JavaScript, on something that is not a method.
