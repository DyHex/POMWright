---
"pomwright": major
---

### Breaking changes

`PageObject` URLs now behave exactly like Playwright's `baseURL` handling, with one base per page object, and the
navigation helper waits the way Playwright does.

- `gotoThisPage()` is removed. `goto()` without a target replaces it: it navigates to `fullUrl` and runs the
  post-navigation actions unless `{ runPostNavigationActions: false }`. `goto(target)` never runs the actions.
  Migration: `grep -rn 'gotoThisPage(' --include=*.ts .` and drop `ThisPage`.
- `NavigationOptions.waitForLoadState` is removed; `waitUntil` covers every method. POMWright no longer defaults
  `waitUntil` to `"load"` itself; an unset value means Playwright's own default. Migration: rename the option in
  `navOptions` and in per-call options.
- A string `baseUrl` must be a non-empty origin (`scheme://host[:port]`, optional trailing slash; no path, query,
  hash, or scheme-less value such as `localhost:9000`). A string `urlPath` must be `""` or start with exactly one
  `/`. Both are checked at construction and the error names the page object.
- `goto(target)` resolves relative input against the page object's `baseUrl` exactly as Playwright resolves
  `page.goto` against `use.baseURL` (`goto("login")`, `goto("?tab=1")` are resolved; 2.x passed them through). On a
  RegExp `baseUrl` only absolute URLs are accepted, at compile time and at runtime.
- On a page object with a RegExp `baseUrl` or `urlPath`, `fullUrl` is a `UrlMatcher` instead of a `RegExp`: the base
  is matched against the URL's origin and the path against the rest (pathname, query, hash), each regex as written
  with its own flags. Pass it to `page.waitForURL`, `expect(page).toHaveURL`, or `page.route` as before, or use
  `fullUrl.test(url)` instead of `toMatch`. A base regex that contains a path prefix must move that prefix into
  `urlPath`.
- `expectThisPage` and `expectAnotherPage` are each one `page.waitForURL` call under the project's
  `use.navigationTimeout` (overridable with `NavigationOptions.timeout`) instead of a navigation wait followed by an
  unbounded exact-string retry. A failure names the page object, the expected URL or matcher, and the URL found.
  `expectAnotherPage` waits for the URL to change and then fails at once if it bounced back.
- `fullUrl` for a homepage page object (`urlPath` `""`) is `https://app.example/` with the trailing slash, the form
  the browser reports.

New exports: `ThisPageOptions`, `NavigationFor`, `UrlMatcher`.

### Fixes

- A fully anchored RegExp `urlPath` such as `/^\/account\/\d+$/` no longer produces a `fullUrl` that can never match.
- A substring RegExp `baseUrl` no longer needs to match the URL up to the start of the path.
- RegExp flags on `baseUrl` or `urlPath` are no longer dropped.
- `fullUrl` and `goto` no longer produce a double slash for a `baseUrl` with a trailing slash.
- `expectThisPage` no longer retries forever when `fullUrl` lacks the trailing slash the browser reports, and
  navigation failures name the expected and found URLs.
- `expectAnotherPage` no longer passes while still on the page.
- `goto` is no longer unavailable on a page object whose `urlPath` is a RegExp.
