---
"pomwright": major
---

### Breaking changes

- The query builder's `remove(subPath?)` is replaced by `skip(subPath)` and `unskip(subPath)`. `skip` leaves an
  ancestor out of the chain when the query resolves and deletes nothing, so `unskip` brings it back exactly as it was,
  with its definition, steps and description; `remove` deleted all three from the query, and a later `update()` or
  `replace()` brought back the definition only. The terminal path cannot be skipped (a compile error, and a runtime
  error from JavaScript), and `skip` has no form without a sub-path. `update`, `replace`, `filter`, `nth` and
  `clearSteps` on a skipped segment throw `<method>() cannot apply to "<sub>": it is skipped in this query; call
  unskip("<sub>") first.`, as do a second `skip` and an `unskip` without one. Migration: replace `remove("ancestor")`
  with `skip("ancestor")`; replace `remove()` followed by `update()`/`replace()` with `update()`/`replace()`, plus
  `clearSteps()` and `describe("")` where the old deletion of steps and description was wanted.
- `@step` decorates only methods that return a Promise. `test.step` always returns a Promise and runs the body after
  the caller's current line, so a decorated sync method returned a Promise typed as its value and its exceptions
  escaped the caller's `try/catch`; it is now a compile error naming `"@step decorates methods that return a Promise:
  make the method async"`, with stage-3 decorators and with `experimentalDecorators`. Migration: make decorated
  methods `async`.
- `PlaywrightReportLogger` keeps the message and string arguments exactly as given: no trailing blank lines, no
  re-formatting of JSON messages. Other arguments are printed as `console.log` prints them instead of
  `[object Object]`. A message that is a JSON object or array is attached as `application/json`, anything else
  (`"42"` included) as `text/plain`. Attachment names use Playwright's `locale` and `timezoneId` (the `log` fixture
  passes them; `attachLogsToTest(testInfo, { locale, timeZone })` takes them) instead of a fixed `nb-NO`, so with no
  config they read `08:19:55 AM 10/15/2026 - INFO : [TestCase]`. Entries are attached in call order, without sorting.
  Migration: set `use: { locale: "nb-NO" }` for the 2.x names, or pass a locale to `attachLogsToTest` in a custom
  fixture; pass `JSON.stringify(data, null, 2)` for pretty JSON or data nested deeper than two levels.
- From JavaScript, `describe(null)` and `describe(undefined)` throw `describe requires a string for "<path>"; pass ""
  to remove the description.` instead of falling back to the path, and `nth(null)` and `nth(undefined)` reach
  Playwright's `nth`, which matches nothing, instead of being dropped, which matched every element. TypeScript rejected
  all four already. Migration: call `nth` only when there is an index.

### Fixes

- A caller's options or filter object changed after `add()`, `filter()` or `createReusable`, a RegExp it passed
  rewritten with `compile()`, or a seed's step after `add(path, { reuse })`, no longer changes the registered locator:
  builders store copies, RegExps included (analysis 1.10).
- A static method decorated with `@step` is titled by its class instead of `Function`, and a bare `@step` on a static
  method compiled with `experimentalDecorators` is no longer left unwrapped (analysis 1.10).
- An array or a `filter`-only object in `has`/`hasNot` is reported as an unsupported filter reference instead of
  Playwright's `Inner "has" locator must belong to the same frame.` (analysis 1.10).
- The duplicate-registration message shows a `Locator` in a step as Playwright prints it (`locator('b')`) instead of
  its internals (analysis 1.10).
- The sub-path error adds `It is a segment of that path, but no locator schema is registered for it.` when the
  sub-path is an unregistered segment of the query's path (analysis 1.10).
- A page object's registry error and a never-applied `seed` point at the consumer's line even when the consumer's file
  is named `pageObject.ts` or `sessionStorage.ts`.

### Internal

- Unreachable branches in the registry and the query builder are removed; `getLocator` resolves a copy of the record
  without building a query builder (about twice as fast); a nested resolution copies each segment once instead of
  twice; `seed` and `PageObject` share one call-site helper (analysis sections 1.10 and 2).
