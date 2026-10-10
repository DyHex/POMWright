---
"pomwright": major
---

### Breaking changes

`SessionStorage` is rebuilt on Playwright's `page.sessionStorage` and adds only what Playwright lacks: batches, step
titles, origin checks, typed values, and seeding before the app loads.

- Requires `@playwright/test` 1.61 or later; the peer range is now `>=1.61.0 <2.0.0`.
- Values are strings, stored and read exactly as given. 2.x JSON-encoded every value, so `set({ token: "abc" })`
  reached the app as `"abc"` with quotes. A structured value is declared once per key with a codec:
  `new SessionStorage(page, { schema: { user: json<User>() } })`, or on a page object the `storage` member of its
  options type plus the `sessionStorage: { schema }` constructor option. `json<T>()` ships; `Codec<T>` is exported
  for custom codecs. An undeclared key must be a string, at compile time and at runtime. Migration: declare a codec
  for keys that held objects and drop the `set<T>` / `get<T>` generics; declare `json<string>()` for string keys an
  app parses as JSON (an `ngx-webstorage` style layer), which keeps the quotes.
- `set`, `get`, `clear` and `seed` each take a single key or a record: `set("token", "abc")`, `get("token")`,
  `clear(["a", "b"])`, `seed({ token })`.
- `get(keys)` returns every requested key with `null` when absent; `get()` returns the present entries. A literal
  `get([])` or `clear([])` no longer compiles; a computed empty list reads nothing or removes nothing (2.x read or
  cleared everything). Migration: a check for `undefined` becomes a check for `null`.
- `setOnNextNavigation` is replaced by `seed(entries, { origin? })`. It intercepts the next navigation to the origin,
  by `goto`, a link, a script redirect, a form POST or a server redirect, and stores the entries in the browser before
  the app's document exists, so the app's first script sees them. It never leaves the page the test is on, so an
  origin can be seeded with data learned on the previous one. Already on the origin, it writes at once. While a seed
  is pending, and only then, navigations to other origins pass through Playwright so that server redirects can be
  seen; a page that never seeds has nothing registered. A seed still pending when the page closes fails the test;
  two page objects seeding the same origin merge; whole-page navigation mocks must be registered after `seed`.
  Migration: `grep -rn 'setOnNextNavigation' --include=*.ts .` and rename to `seed`.
- `waitForContext` is removed: an operation on a page without an origin fails at once with a message naming the
  fix. `reload` is removed: call `page.reload()`.
- A page object's helper operates on that page object's origin and throws, naming both origins, when the page is on
  another one. A standalone helper without an origin operates on the current origin; its `seed` needs `{ origin }`.
- Service workers: a worker registered by the app that answers navigations also answers a pending seed, and
  Playwright's routes cannot see it. The test then fails at once with a message naming the fixes:
  `serviceWorkers: "block"`, seeding before the app's first load in the context, or unregistering the worker in the
  test.

New exports: `json`, `Codec`, `SessionStorageSchema`, `StorageTypeFromOptions`.

### Fixes

- `set` no longer stores strings with JSON quotes.
- Seeding before the app's first load no longer loses the race against the app's first script, no longer merges and
  wipes concurrent calls, and no longer leaks a listener after a failure.
- `get([])` and `clear([])` no longer mean "everything".
- An empty string no longer reads back as `null`.
- No session storage operation waits without a timeout any more.
