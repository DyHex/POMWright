---
"pomwright": patch
---

### Fixes

- A string `urlPath` is compared in the form the browser reports it, as `fullUrl` is and as Playwright's
  `toHaveURL(string)` compares: for a path such as `/søk`, `/a b` or `/x?q=a b`, `expectThisPage` timed out and
  `expectAnotherPage` passed while the browser was on the page.
- A `baseUrl` or `urlPath` that is neither a string nor a RegExp throws at construction
  (`LoginPage: baseUrl must be a string or a RegExp; received undefined.`) instead of building a page object that never
  matched its page, passed `expectAnotherPage` and gave its session storage no origin. Migration: a page object built
  from an unset environment variable now fails at construction; set the variable.
- `sessionStorage.seed` keeps the URL fragment of the navigation it seeds, directly and through a server redirect
  (`#/orders/7`, `#access_token=…`): a hash-routed app opened on its default route and a login callback lost its
  token. A redirect whose `Location` has a fragment of its own keeps that one.
- On WebKit, `page.goto()` to an origin with a pending `seed` returns once the app's document has loaded, as on
  Chromium and Firefox; it returned before, so `page.url()`, `page.title()` or `page.evaluate()` right after it read
  POMWright's writer document or a document still loading.
- A hand-made seed object passed to `add(path, { reuse })` is checked as every builder checks its first argument
  (`reuse requires a selector value for "<path>".`, `reuse requires a non-empty selector for "<path>".`) instead of
  registering an empty or missing value that failed at the first action.
- `replace(sub).frameLocator()` throws at the call on a segment with `filter` or `nth` steps in the query (call
  `clearSteps(sub)` first) and on the query's own path, which the any-frame form cannot resolve to, instead of failing
  at resolution. `filter` and `nth` on an any-frame segment in a query give the same message as on `add`.
- A path that is not a string, from JavaScript, throws `LocatorSchemaPath must be a string; received 42.` instead of
  a `TypeError`.
- The duplicate-registration message prints a RegExp used twice in each place instead of `"[Circular]"`, and is
  headed `Existing and attempted schemas:`.
