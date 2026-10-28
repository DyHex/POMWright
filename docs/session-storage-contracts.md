# Session storage contracts

What `SessionStorage` and its seed registry promise: values and codecs, turns, origin checks and `seed`. Read it before
changing `src/helpers/sessionStorage.ts`, `sessionStorageSeed.ts` or `storageTurns.ts`, their tests, or the session
storage pages. The steps these helpers open follow [steps and logging](steps-and-logging-contracts.md). Part of the
contributor guide that [AGENTS.md](../AGENTS.md) indexes; AGENTS.md's rules apply here too.

- Session storage mirrors `page.sessionStorage`: values are strings stored verbatim unless a codec is declared for the
  key (`json<T>()`, `Codec<T>`); a schema's type and value must agree, which the compiler checks (a page object's schema
  option is keyed by the declared type's keys, `Required` of them, and a message type without any; a standalone helper
  with an explicit schema type requires the value), except a page object's type without its value (issue #58), `get` returns `null` for a missing key, a literal `[]` does not compile, and a helper
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

## Do not

- Reintroduce JSON-encoding every session storage value, or `setOnNextNavigation`.
- Give `seed` a route, a proxy or a document of POMWright's own, a script without the first-arrival check, or a
  binding exposed to the app's page.
