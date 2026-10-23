# POMWright 3.0.2 — release notes (draft)

Consumer-facing changes, each marked *planned* or *done*. The changesets, not this file, are what consumers read.

## Fixes

### Session storage

- *done* — Overlapping `seed` calls for an origin the page is already on merge in call order, as they already do
  before a navigation. Overlapping `set`, `get` and `clear` calls for one origin act in the order they were made.
  (PLAN-D1)
- *done* — `set` and `seed` store an entry whose key is `__proto__`; it was dropped without an error. (PLAN-D2)
- *done* — Writing a value that is not a string to a key without a codec says where codecs are declared; the docs
  say that a page object's declared `storage` type needs its schema value too. (PLAN-D8)
- *done* — A seed that the document arriving at its origin does not write fails the test at the `seed` line
  instead of passing silently (Chromium, after a failed navigation there); Firefox no longer reports a refused write on
  its error page. (D18)
- *done* — With Playwright's step overlay (`video.show.test`), a racing `seed` fails instead of resolving without
  its entries. (D19)
- *done* — A page that closes while `seed` registers fails with the helper's label and the `seed` call site.
  (D28)
- *done* — The docs say what `seed` does once the page has committed a document on the origin, and list the
  encoding errors `seed` throws. (D20, D29)
- *done* — On an `about:blank` page that inherited an origin (a popup from `window.open()`), a helper keeps to its
  own origin. (D21)
- *done* — An app that declares its own global `navigation` no longer makes `seed` report that the browser lacks
  the Navigation API. (D22)
- *done* — `chrome-extension://…/`, `app://…/` and `file://…/` are rejected as origins, by `SessionStorage` and as a
  page object's `baseUrl`, with the origin message. (D23)
- *done* — `seed({})` does nothing; it failed the test at close. (D24)
- *done* — A key typed `string` rather than a literal is typed as `string` or any declared codec's type, as the
  docs say; code that used such a value as a string may need the literal key or a narrowing. (D25)
- *done* — `AllEntries`, `Decoded`, `SeedOptions` and `SessionStorageOptions` are exported. (D26)
- *done* — A sandboxed document's refusal of `sessionStorage` is explained, with the helper's label, on every
  browser. (D27)
- *done* — A refused write or a never-applied seed no longer stops the page's other `console` or `close`
  listeners. (D30)
- *done* — A navigation during a multi-key `set` fails with the helper's label and the keys already written. (D31)
- *done* — A decode error gives the codec's reason, the value's length and the quoted value. (D32)

### URLs and navigation

- *done* — A `urlPath` that resolves to another host (a backslash, a tab or a newline after its first `/`), and a
  `baseUrl` ending in a bare `?` or `#`, are rejected at construction. (PLAN-D3)
- *done* — On Chromium, a string `urlPath` containing `|` matches the page; `expectAnotherPage()` no longer passes
  while the browser is on it. (PLAN-D9)
- *done* — From JavaScript, `goto()` with a `URL` object throws instead of navigating to the page object's own URL.
  (PLAN-D10)
- *done* — `expectThisPage()` and `expectAnotherPage()` treat `/orders?` and `/orders#` as URLs different from
  `/orders`, as Playwright's `toHaveURL` does. (D17, PLAN-R2 item 5)

### Locators

- *done* — An `update()` or `replace()` builder kept while its segment is skipped throws when it is applied, so a
  skipped segment is never changed until `unskip`. (PLAN-D4)
- *done* — When a registry call ends a registration before its chain is complete, the error names that call and
  shows the two ways to write the filter: by path, or with a locator resolved before `add(…)`. (PLAN-D11)
- *done* — `update()` and a seeded registration accept `undefined` as the first argument in their types, as they
  already did at runtime. (PLAN-D13)
- *done* — Options passed as a class instance keep values from its prototype, such as getters.
  (PLAN-D14)

### `@step`

- *done* — `@step({ box: true })` reports the step, and an error thrown inside it, at the line that called the
  method. (PLAN-D5)
- *done* — A `@step` method called without a receiver runs instead of throwing a `TypeError`. (PLAN-D6)
- *done* — Bare `@step` compiles with `experimentalDecorators: true`. (PLAN-D7)

### Packaging

- *done* — The `exports` map has a `default` condition, as `@playwright/test`'s has. (PLAN-D16)

## Documentation

- *done* — The README shows what POMWright adds through an example that uses the same definitions twice, what a
  mistake looks like, and which parts work alone. (PLAN-R1)
- *done* — Corrections: where a duplicate with `{ reuse }` throws, a missing error message, what is checked at
  runtime, TypeScript 6's `types`, the seeded override's place, the performance
  conclusion, and validating a page object's arguments before `super()`. (PLAN-R2)
- *done* — A section on following a change of the page's structure in the paths: the smallest edit for each common
  change, and what catches a missed spot. (PLAN-R4)
