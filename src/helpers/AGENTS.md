# Helpers

What the helpers promise: session storage and its seed registry; `@step`, where steps are reported, the logger and the
`log` fixture (`src/fixture/`); URLs and navigation. Claude Code loads this file when it reads a file under
`src/helpers/`; with another client, read it before working there. Read it before changing `src/fixture/`, the storage,
navigation or URL specs, `test/step-locations/` or their pages too. Part of the contributor guide that the root
[AGENTS.md](../../AGENTS.md) indexes; its rules apply here too.

## Files

`url.ts` (`assertBaseUrl`, `assertUrlPath`, `resolveUrl`, `createUrlMatcher`, `composeFullUrl`), `navigation.ts`
(`NavigationFor`, one `page.waitForURL` per wait), `sessionStorage.ts` (`SessionStorage`: `page.sessionStorage` with
batches, step titles, origin checks and per-key codecs; `set`, `get`, `clear`, `seed`), `sessionStorageSeed.ts` (the
seed registry, one per page: in the call's turn, a write at once on the origin, or an init script per pending origin
that writes only in the main frame, on the origin, on the first arrival, disposed at the main frame's commit there, with
its entries as `[key, value]` pairs; the Navigation API check, the commit-during-registration check, the refused-write,
not-applied and never-applied failures), `storageTurns.ts` (`takeTurn`: per page and origin, every `SessionStorage` call
in the order it was made; on a page whose URL has no origin, a page-wide turn after every earlier call), `callSite.ts`
(`captureCallSite(boundary)` and `atCallSite`: a later error pointed at the consumer's call, for `seed` and the
page-object check, which cuts at `new.target`; `callerLocation(boundary)`: a boxed step's `location`, the caller's
line), `playwrightReportLogger.ts` (messages kept as given, other arguments as `console.log` prints them, one attachment
per entry in call order, names in Playwright's `locale` and `timezoneId`), `stepDecorator.ts` (`@step`, for methods that
return a Promise; an `async` wrapper for a boxed step, a plain one otherwise), `thenable.ts` (`isThenable`, for the
Promise checks of `@step` and `defineLocators()`).

## Session storage

- Session storage mirrors `page.sessionStorage`: values are strings stored verbatim unless a codec is declared for the
  key (`json<T>()`, `Codec<T>`); a schema's type and value must agree, which the compiler checks (a page object's schema
  option is keyed by the declared type's keys, `Required` of them, and a message type without any; a standalone helper
  with an explicit schema type requires the value), except a page object's type without its value (issue #58) and a schema
  value passed through a variable with a codec its type does not declare (TypeScript checks extra keys on literals
  only, so that key is decoded while typed as a string), `get` returns `null` for a missing key, a literal `[]` does not compile, and a helper
  with an origin touches only that origin. `seed` never navigates and never intercepts a navigation: away from the
  origin it adds one `page.addInitScript` per pending origin, which writes only in the main frame, on the origin (`location.origin` and
  the document's own `self.origin`, so never into a browser's error page), on the first arrival there
  (`navigation.activation.from` is `null`, so a reload or a hop within the origin keeps what the app wrote), and disposes of it when the main frame commits on the origin. Its four listeners (`framenavigated`,
  `domcontentloaded`, `console`, `close`) exist only while a seed is pending or an applied document may still report a
  refused write, until that document's `domcontentloaded` or the next commit. Every `SessionStorage` call (`set`, `get`,
  `clear`, `seed`) takes its turn on a per-page, per-origin chain (`storageTurns.ts`) that it joins synchronously when its
  step starts, so overlapping calls (a `Promise.all`, a missing `await`) end exactly as awaited ones, across every
  helper on the page; on a page whose URL has no origin (an `about:blank` popup), `set`, `get` and `clear` take a
  page-wide turn after every earlier call on the page instead, and `seed` keeps its origin's chain, so seeds for several
  origins still register side by side; a call that waited checks the origin again when its turn starts, and a failing call leaves the
  pending seed as it was. Every storage call (each key of a batch, a single call, each read of `get(keys)`) reads the
  page's origin before and after it (`page.url()`, no round trip) and fails with the navigation message when it moved,
  whether or not the call threw, naming the keys done and the one in flight; a call in flight is detected, not prevented. `seed` decides in its turn whether to write at once (the page was on the origin at the call
  and still is, or its URL has no origin and its document inherited the seeded one) or to register; it reads the page and starts its commit watch at the call, before its step's body,
  which Playwright may delay (the step overlay). Keys are never property names on the way to the page: a `__proto__` key is stored. `seed` throws at
  the call in a browser without the Navigation API (checked once per page) and when the main frame commits on the
  origin between the call reaching the registry and the end of its registration; a refused write, a seed the arriving document skipped (an opaque document, or a
  return there, as after a failed navigation: retrying it is not attempted) and a never-applied seed fail the test
  with the `seed` call site in the stack. Never
  reintroduce JSON-encoding every value, or a write from a `framenavigated` listener (it loses the race against the
  app's first script).

## Steps and logging

- `@step` decorates methods that return a Promise; `test.step` always returns one. TypeScript refuses any other, and the
  wrapper checks it at run time too: a method that returns something that is not a thenable throws, in the step, a
  `TypeError` with the compile error's text. The navigation and session storage
  helpers pass `{ box: true }` to their steps, so the report shows the line that called them. Playwright takes an
  unboxed step's location from the first frame of the async stack (only `async` functions waiting in an `await`), and a
  boxed step's from the frame after it only when no ancestor step is boxed; so every boxed step (a boxed `@step`, the
  navigation and session storage helpers) passes `location`, the caller's line from `callerLocation(boundary)`, cut at
  the method the consumer called, unless the caller gave one. A boxed error's stack is still Playwright's (the async
  stack after its first frame, or the outermost boxed step's), so exactly one `async` POMWright frame sits between the
  caller and a boxed `test.step`: the navigation methods are `async` and open their steps themselves; a `SessionStorage`
  method is `async` and awaits a helper that is not; `@step`'s wrapper is `async` for a boxed step and a plain function
  otherwise. A caller awaits rather than returns such a Promise, which would cut the stack. `test/step-locations` checks
  the result, nested boxed steps included, and fails when a marked line is never reported. The logger keeps the message and
  string arguments as given, prints other arguments as `console.log` does, attaches one attachment per entry in call
  order, and names them in Playwright's `locale` and `timezoneId`, which the `log` fixture checks with Node's `Intl`
  when the test starts (`""` is no value).

## URLs and navigation

- URLs mirror Playwright's `baseURL` handling with one base per page object: each part is a string or a RegExp, a
  string `baseUrl` is a non-empty origin (no bare `?` or `#`, and a scheme with a URL origin, so not `chrome-extension:` or `file:`, as for `SessionStorage`'s `origin`) and a string `urlPath` is `""` or a single-slash path
  that stays on the base's origin once resolved, all validated at construction; two strings resolve with `new URL`, a `^` in the path part written as `%5E` (every
  browser's form, which `new URL` keeps before Node 24),
  and a page is compared as Playwright compares URLs: the rest of the URL as `href` writes it, an empty `?` or `#`
  included, a string path in the form `new URL` gives it, with `|` and `%7C`, and `^` and `%5E`, equal in its path part (Chromium reports
  a `|` as `%7C`; every browser reports a `^` as `%5E`, which `new URL` keeps as `^` before Node 24); a RegExp in either part makes `fullUrl` a `UrlMatcher` (base against the origin, path against the
  rest, each regex as written). `goto` takes a URL string or options, as `page.goto` does. `goto()` without a target is the this-page navigation; `expectThisPage` and
  `expectAnotherPage` are one `page.waitForURL` each. POMWright sets no timeout or `waitUntil` default of its own.

## Do not

- Reintroduce JSON-encoding every session storage value, or `setOnNextNavigation`.
- Give `seed` a route, a proxy or a document of POMWright's own, a script without the first-arrival check, or a
  binding exposed to the app's page.
- Reintroduce `@step` on methods that do not return a Promise, a hard-coded log locale or sorted log entries, JSON
  re-formatting of log messages, or a navigation or session storage step without `box: true`.
