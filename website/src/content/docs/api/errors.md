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

Thrown by `add(path)` and by the resolving methods, when a path breaks the path rules. TypeScript rejects these paths
where they are written, so the messages come from JavaScript or from a path built at run time. See
[paths and the registry](/POMWright/docs/locator-paths/).

```text
LocatorSchemaPath must be a string; received 42.
LocatorSchemaPath string cannot be empty
LocatorSchemaPath string cannot contain whitespace chars: main\u00A0.form
LocatorSchemaPath string cannot start with a dot: .main
LocatorSchemaPath string cannot end with a dot: main.
LocatorSchemaPath string cannot contain consecutive dots: main..list
LocatorSchemaPath string cannot contain whitespace chars and cannot start with a dot: .main list
```

A path that breaks several rules gets one message naming them all, in this order. Whitespace is shown escaped, so a
non-breaking space is visible. Fix the path.

Where a path is written as a literal, TypeScript reports the same rules:

```text
Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<"", "String can't be empty">'.
Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<"main list", "String can't contain whitespace chars">'.
Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<".main", "String can't start with '.'">'.
Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<"main.", "String can't end with '.'">'.
Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<"main..list", "String can't contain consecutive '.'">'.
Argument of type 'string' is not assignable to parameter of type 'LocatorSchemaPathError<".main list", "String can't contain whitespace chars; String can't start with '.'">'.
```

```text
Argument of type '"main"' is not assignable to parameter of type '"createRegistryWithAccessors needs its paths as a type argument: createRegistryWithAccessors<Paths>(page)"'.
```

A compile error, on every path of a registry created without its paths. Pass them as the type argument:
`createRegistryWithAccessors<Paths>(page)`; `<string>` takes any path, unchecked at compile time.

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
locator() cannot apply to "section@inline": its registration was ended by getLocator("heading@explorer"). If that call is in this locator's options, which run first, resolve the locator before add(…), or filter by a path in a step: .filter({ has: "heading@explorer" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
filter() cannot apply to "section@inline": its registration was ended by getLocatorSchema("heading@explorer"). If that query is in this filter's arguments, which run first, resolve it before add(…). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
locator() cannot apply to "section@inline": its registration was ended by a query's resolution of "heading@explorer". If that query is in this locator's options, which run first, resolve it before add(…). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
```

A method of a registration kept in a variable, called after the registry was called again (the next `add`,
`getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify`, or the resolution of a query), which the message names.
Give the registration all its steps before that, in its chain; for a variation of one use, query the path. A
`getLocator` or `getNestedLocator` in a filter's own arguments or a `locator`'s options runs before that method: pass a
path (in a `filter` step after `locator`), or resolve the locator before `add(…)`. A query there runs first too: resolve
it before `add(…)`. See
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
nth() cannot apply to "frames": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

A seed of the any-frame `frameLocator()` with steps or a description, which it cannot have; and `filter`, `nth` or
`describe` on a copy of an any-frame path, which has no element either. Resolve a path inside it.

```text
reuse requires a role value for "main.button@save".
reuse requires a non-empty selector for "main.list".
reuse requires a non-empty id for "main.panel".
```

Thrown by `add(path, { reuse })` for a seed object made by hand, from JavaScript, whose first argument is missing, of the
wrong type, or empty where Playwright cannot use one, as the locator methods check it (see
[a first argument that is missing or empty](#a-first-argument-that-is-missing-or-empty)). Make the seed with
`createReusable`.

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
"shell.list" is not a valid sub-path of "shell.list.item". It is a segment of that path, and it was registered after this query was taken; take a new query with getLocatorSchema("shell.list.item") to use it.
```

A `subPath` must be the query's path or one of its registered ancestors. A query copies the chain when it is taken, so
an ancestor registered after that is not in it: take a new query.

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
describe() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
```

The any-frame form has no element: it cannot be the query's own path, carry steps, or be filtered, indexed or
described.

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
LoginPage: defineLocators() must register its locators synchronously; it returned a Promise. Read what it needs in the constructor or a fixture, and pass it in.
```

An error from `defineLocators()`, or from the check of every path after it, labeled with the page object and with
the original as `cause`; the last, without a `cause`, when `defineLocators()` returns a Promise, as an `async` one does
(read what it needs in the fixture and pass it to the constructor). It fails the fixture that created the page object, before the test body, with the line that
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
LoginPage: goto("http://") cannot be resolved against baseUrl "https://shop.example"
LoginPage: goto() takes a URL string or options; received a URL object; pass its href.
```

Thrown by `goto()`: from JavaScript on a page object whose URL is a RegExp; for a target that cannot be resolved
against `baseUrl`, such as a scheme with nothing after it, with the URL parser's error as `cause`; and from JavaScript
for a first argument that is neither a URL string nor options (`received null`, `received a number`), a `URL` object
included: pass its `href`.

---

## Session storage

```text
Type '{ user: Codec<{ name: string; }>; }' is not assignable to type 'Record<string, "declare the schema's type in the page object's type options: PageObject<Paths, { storage: typeof schema }>, or a base class's options type parameter">'.
```

A compile error, on a page object that passes `sessionStorage.schema` without declaring its type. Take the type from
the value: `PageObject<Paths, { storage: typeof schema }>`. A subclass of a base class that forwards `PageObjectOptions`
cannot declare it there: the base class takes the options as a type parameter, and the subclass declares
`{ storage: typeof schema }` in it (see [a base class for your
site](/POMWright/docs/organizing-a-project/#a-base-class-for-your-site)). A value without a codec for a declared key, and a standalone
helper given a schema type without its value, are compile errors too, in TypeScript's own words. See
[through a page object](/POMWright/docs/session-storage/#through-a-page-object).

Thrown by the methods of [`SessionStorage`](/POMWright/api/class-sessionstorage/), prefixed with the helper's label
and method.

```text
Shop.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()
Shop.SessionStorage.set: the document at https://shop.example/embed cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)
AccountPage.SessionStorage.get: the page is on https://login.example, not on this page object's origin https://shop.example; another origin's sessionStorage is reachable only from a document on it. Use the page object for https://login.example, or a standalone SessionStorage without an origin
```

`set`, `get` and `clear` work on the page's current origin, so the page must be on one, and a helper that belongs to
an origin must be on it. A document whose own origin is opaque has no session storage, although its URL has an
origin: a sandboxed document, or the error page Firefox shows at the origin's URL after a failed navigation.

```text
Shop.SessionStorage.set: the page navigated to https://shop.example/home while set() was writing to https://shop.example; 2 of 60 keys were written ("k0", "k1"); "k2" was being written and may have reached the new document
Shop.SessionStorage.clear: the page navigated to https://shop.example/home while clear() was removing keys from https://shop.example; 1 of 3 keys were removed ("token"); "locale" was being removed and may have reached the new document
Shop.SessionStorage.get: the page navigated to https://login.example/ while get() was reading "token" from https://shop.example; it may have read the new document
Shop.SessionStorage.clear: the page navigated to https://shop.example/home while clear() was removing every entry from https://shop.example; it may have reached the new document
```

Every call checks the page's origin before and after each storage call, so a navigation to another origin stops it,
whether or not the storage call failed, and so does a reload or a redirect within the origin that interrupts it. The
message names where the page went, by its origin and path. The keys named as done stay so; the one in flight, or a
single call, may have reached the new document, and a `get` fails rather than return what it may have read there. Any
other error from Playwright gets the label in front of its message and is the `cause`.

```text
Shop.SessionStorage.set: the page left https://shop.example for https://login.example while set() waited for its turn; the call did nothing
```

A call of a helper without an origin that waited for its turn, behind an overlapping call on the page, fails when the
page has left the origin the call was made on, or, on a page whose URL has no origin, when the URL has changed. It does
nothing, rather than act on an origin it was not called on. A helper with an origin gets the origin message above
instead.

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
Shop.SessionStorage.seed: value for "orderId" is not a string and no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)
Shop.SessionStorage.seed: value for "orderId" could not be encoded
Shop.SessionStorage.seed: the codec for "orderId" returned undefined instead of a string
Shop.SessionStorage.seed: the page committed a document on https://pay.example while seed() was registering, so the app may have started without the entries; await that navigation before seeding, or seed before starting it
Shop.SessionStorage.seed: seed() needs the Navigation API (navigation.activation) to write only on the first arrival at https://pay.example, and this browser has none (Mozilla/5.0 …); use set() on the origin and reload instead
Shop.SessionStorage.seed: the page closed while seed() was registering the seed for https://pay.example (keys: "orderId"); await seed() before the test ends
Shop.SessionStorage.seed: the document at https://shop.example/embed cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)
Shop.SessionStorage.seed: the page navigated to https://shop.example/home while seed() was writing to https://shop.example; 1 of 2 keys were written ("orderId"); "amount" was being written and may have reached the new document
```

At the call: the seventh when the page closes before the seed is registered, the last two from a seed on the origin
already, which writes as `set` does. The others fail the test later, when the app's document loads or when the page closes, with the line of
the `seed` call in the stack:

```text
Shop.SessionStorage.seed: could not write sessionStorage for https://pay.example (keys: "orderId"): QuotaExceededError: The quota has been exceeded.; the app loaded without the entries
Shop.SessionStorage.seed: the seed for https://pay.example (keys: "orderId") was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends
Shop.SessionStorage.seed: the seed for https://pay.example (keys: "orderId") was not applied: the document that arrived on https://pay.example has an opaque origin (the browser's error page after a failed navigation, or a sandboxed document)
Shop.SessionStorage.seed: the seed for https://pay.example (keys: "orderId") was not applied: the browser counted the page's arrival on https://pay.example as a return there (navigation.activation.from is set): the document before it was already on the origin, as after a failed navigation to it
```

When seeds for several origins are never applied, one error lists each seed with its helper and the line that called
it; the stack points at the first:

```text
Shop.SessionStorage.seed: 2 seeds were never applied: the page closed without navigating to their origins; remove the seed calls, or navigate to the origins before the test ends:
  Shop.SessionStorage.seed at tests/checkout.spec.ts:12:5, for https://pay.example (keys: "orderId")
  Login.SessionStorage.seed at tests/checkout.spec.ts:13:5, for https://login.example (keys: "consent")
```

See [what `seed` cannot do](/POMWright/docs/seeding-session-storage/#what-seed-cannot-do).

---

## `@step`

```text
@step decorates methods that return a Promise: make the method async
```

A compile error, on a method that does not return a Promise. Make the method `async`. From JavaScript, the same text
is a `TypeError` thrown in the step, when the method returns something that is not a Promise.

```text
@step decorator can only be applied to methods.
```

From JavaScript, on something that is not a method.

---

## Logging

```text
log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"
log fixture: timezoneId "Invalid/Zone" is not a time zone Node's Intl knows
```

The `log` fixture checks Playwright's `locale` and `timezoneId` when the test starts, since it names its attachments in
them. Playwright passes `locale` to the browser unchecked, and an underscore form works in Chromium only; write the tag
with hyphens, and the time zone as an IANA name such as `Europe/Oslo`. `""` is no value. `attachLogsToTest` called in a
fixture of your own gives the same messages, starting `attachLogsToTest:` and naming `timeZone`, before it attaches
anything. See [names in your locale](/POMWright/docs/logging/#names-in-your-locale).
