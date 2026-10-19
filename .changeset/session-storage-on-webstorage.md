---
"pomwright": major
---

### Breaking changes

`SessionStorage` is rebuilt on Playwright's `page.sessionStorage` and adds only what Playwright lacks: batches, step
titles, origin checks, typed values, and seeding before the app loads.

- Requires `@playwright/test` 1.64 or later; the peer range is now `>=1.64.0 <2.0.0`. `page.sessionStorage` needs
  1.61, the any-frame `frameLocator()` needs 1.63, and the fix that makes every RegExp flag deterministic across
  elements (microsoft/playwright#42818) is in 1.64.0.
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
- `setOnNextNavigation` is replaced by `seed(entries, { origin? })`. Away from the origin, it adds an init script
  that stores the entries when the page's main frame first arrives at the origin, by any navigation (`goto`, a link,
  a script, a form POST, a server redirect, a page a service worker or a mock serves), before the app's first script
  runs, and removes it once that document has run it, so a reload never overwrites what the app wrote. Navigations
  are never intercepted: the app sees the same request, headers and history as without a seed. It never leaves the
  page the test is on, so an origin can be seeded with data learned on the previous one. Already on the origin, it
  writes at once. A page that never seeds has nothing registered; two page objects seeding the same origin merge. A
  seed still pending when the page closes fails the test, as does a write the browser refuses; `seed` itself throws
  in a browser without the Navigation API and when the page commits a document on the origin while it registers.
  Migration: `grep -rn 'setOnNextNavigation' --include=*.ts .` and rename to `seed`.
- `waitForContext` is removed: an operation on a page without an origin fails at once with a message naming the
  fix. `reload` is removed: call `page.reload()`.
- A page object's helper operates on that page object's origin and throws, naming both origins, when the page is on
  another one. A standalone helper without an origin operates on the current origin; its `seed` needs `{ origin }`.

New exports: `json`, `Codec`, `SessionStorageSchema`, `StorageTypeFromOptions`.

### Fixes

- `set` no longer stores strings with JSON quotes.
- Seeding before the app's first load no longer loses the race against the app's first script, no longer merges and
  wipes concurrent calls, and no longer leaks a listener after a failure.
- `get([])` and `clear([])` no longer mean "everything".
- An empty string no longer reads back as `null`.
- No session storage operation waits without a timeout any more.
