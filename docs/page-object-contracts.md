# Page object, URL and navigation contracts

How a page object defines and checks its locators, and how its URLs are validated, resolved and compared. Read it before
changing `src/pageObject.ts`, `src/helpers/url.ts` or `src/helpers/navigation.ts`, their tests, or the page object and
URL pages. The steps the navigation methods open follow [steps and logging](steps-and-logging-contracts.md). Part of the
contributor guide that [AGENTS.md](../AGENTS.md) indexes; AGENTS.md's rules apply here too.

- `PageObject` never calls `defineLocators()` from its constructor: it registers synchronously and runs, followed by
  `verify()`, once per instance, right after construction (a check scheduled as the constructor's last statement) or at
  the first locator call if that comes earlier; a registry mistake still fails the fixture, labeled `<label>: …` with
  the original as `cause` and the construction site (the `new` line) in the stack; a definition that returns a Promise
  (an `async` one) fails the page object the same way, without a `cause`, and its own rejection is handled.
  `pageActionsToPerformAfterNavigation()` is optional and called each time the actions run. A standalone registry calls
  `verify()` itself. Never move either hook back into the constructor.
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

- Reintroduce a call to `defineLocators()` or `pageActionsToPerformAfterNavigation()` from the `PageObject`
  constructor, or the `UrlTypeOptions` name.
