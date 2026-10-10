# POMWright 3.0.0 release notes

> Working draft, maintained in `release-3.0.0/` while the release is built. It lists only changes that are done or
> committed to by a plan in this folder. It is not a summary of the analysis. Status markers:
> **[planned]** covered by a plan, not yet implemented. **[done]** implemented on the working branch.
> **[roadmap]** decided for 3.0.0 but not yet planned. Where a planned item depends on an open decision, the
> decision number from the plan is given. When 3.0.0 ships, drop the markers and this note; what remains is the basis
> for the changelog entry and the announcement.
>
> Last updated 2026-10-10. Plans covered: 1.1-1.2 (getById), executed and committed on
> `chore/bugfixes-quality-improvements-and-docs` (commits e709d0c to 735066b); 1.3-1.4 (URL composition and
> navigation), executed and committed on the same branch on 2026-10-08 (commits bc8d980 to 4682146); 1.5 (session
> storage), executed and committed on the same branch on 2026-10-10 (commits a05e8fd to ab76175).

## Overview

POMWright 3.0.0 is a major release focused on fixing bugs, maintenance, removing dead, redundant, or unnecessary
code, structural improvements, and improving packaging, tooling, CI, quality, reliability, performance, test coverage,
and documentation.

Requirements: peer dependency `@playwright/test >=1.61.0 <2.0.0`, raised from `>=1.57.0` because `SessionStorage`
uses `page.sessionStorage` (added in Playwright 1.61) **[done, plan 1.5]**.

## Breaking changes

### `getById(string)` matches ids verbatim **[done, plan 1.1-1.2]**

In 2.x, `getById("#login")` and `getById("id=login")` were normalised to `login`, and the resolved selector was
`#<id>` passed through a CSS escape that did not work for most real-world ids. In 3.0.0:

- The string is matched verbatim and case-sensitively against the element's `id` attribute. `getById("#x")` now
  looks for `id="#x"`. No prefixes are recognised.
- The resolved selector is `[id="…"]` with proper CSS string escaping, so ids containing `.`, `:`, `[`, `]`, spaces,
  quotes, backslashes, `>>`, non-ASCII characters, or a leading digit all work.
- `toString()` and error output render `locator('[id="x"]')` instead of `locator('#x')`.
- `getById("")` throws at registration instead of failing at resolution. The message names the registry path, or
  `createReusable.getById` for reusable seeds.

**Migration.** Find stale prefixed call sites with

```sh
grep -rnE 'getById\(\s*["'"'"'`](#|id=)' --include=*.ts .
```

and drop the prefix. Tests that compare rendered locator strings need `#x` changed to `[id="x"]`.

### `getById(RegExp)` is a real pattern match **[done, plan 1.1-1.2]**

In 2.x a RegExp id was flattened to `[id*="<source>"]`: the regex source text was used as a literal substring match
on the id. Plain patterns such as `/btn-submit/` worked by coincidence, `/a.b/` matched only the literal text `a.b`,
anchored patterns matched nothing, and flags were ignored. In 3.0.0 the regex is evaluated against each element's
`id` with its flags. An unanchored pattern is still a substring match; anchor with `^` and `$` to match a whole id.

- All flags pass through to Playwright unchanged, as with Playwright's own locators. The sticky `y` flag acts as a
  start anchor on Playwright 1.64 and later, and is unreliable on earlier versions because of a Playwright bug fixed
  in 1.64.0 (microsoft/playwright#42818). Prefer `^`.
- The rendered selector changes from `[id*="…"]` to `internal:attr=[id=/…/flags]`, the same engine Playwright's own
  `getByTestId(RegExp)` compiles to.

### `goto()` replaces `gotoThisPage()` **[done, plan 1.3-1.4]**

`navigation.goto()` without an argument navigates to the page object's `fullUrl` and runs the post-navigation
actions, as `gotoThisPage()` did; it is available only when `fullUrl` is a string. `goto(target)` navigates
anywhere, never runs the actions, and resolves relative input against the page object's `baseUrl` exactly as
Playwright resolves `page.goto` against `use.baseURL`. On a RegExp `baseUrl` only absolute URLs are accepted, at
compile time and at runtime. A new `runPostNavigationActions` option (default `true`) on `goto()` and
`expectThisPage()` skips the actions. `NavigationOptions` gains `timeout`.

**Migration.** `grep -rn 'gotoThisPage(' --include=*.ts .` and drop `ThisPage`.

### String `baseUrl` and `urlPath` are validated at construction **[done, plan 1.3-1.4]**

A string `baseUrl` must be a non-empty origin: `scheme://host[:port]`, optional trailing slash, no path, query, or
hash, and not scheme-less (`localhost:9000` is rejected, `http://localhost:9000` is fine). A string `urlPath` must be
`""` or start with exactly one `/`. The constructor checks every value, literal or variable, and throws with the
class name and the reason. `fullUrl` for two strings is `new URL(urlPath, baseUrl).href`, so a homepage page object
now has `https://app.example/` with the trailing slash, the form the browser reports.

### RegExp URLs match structurally; `fullUrl` becomes a `UrlMatcher` **[done, plan 1.3-1.4]**

In 2.x the two regexes were concatenated into one, which silently required the base regex to match the URL up to the
exact character where the path begins, dropped all flags, and broke `^`-anchored paths. In 3.0.0 a page object with a
RegExp `baseUrl` or `urlPath` has a `fullUrl` that is a `UrlMatcher`: the base is matched against the URL's origin
(`scheme://host:port`) and the path against the rest (pathname, query, hash), each regex exactly as written, with its
own flags. A substring base such as `/identity-provider/` works without any tail. `^` and `$` on the base refer to
the origin; on the path, to the whole rest. The matcher is a predicate accepted by `page.waitForURL`,
`expect(page).toHaveURL`, and `page.route`, and exposes `.base`, `.path`, `.test(url)`, and a readable `toString()`.

**Migration.** Code that treated `fullUrl` as a `RegExp` on such pages: `expect(url).toMatch(poc.fullUrl)` becomes
`expect(page).toHaveURL(poc.fullUrl)` or `poc.fullUrl.test(url)`; `.source` and `.flags` become `.base` and `.path`.
A base regex that contains a path prefix never matches, because the base sees only the origin; move the prefix into
`urlPath`. `$` on a base regex includes the port.

### `expectThisPage` and `expectAnotherPage` are one `waitForURL` each; `waitForLoadState` option removed **[done, plan 1.3-1.4]**

Each method is now a single `page.waitForURL` call under the project's `use.navigationTimeout`, overridable with
`NavigationOptions.timeout`, instead of a navigation wait followed by an unbounded exact-string retry. A failure
names the page object, the expected URL or matcher, and the URL found at failure time. `expectAnotherPage` waits
for the URL to change and then fails at once if it bounced back. POMWright no longer defaults `waitUntil` to
`"load"` itself; an unset value means Playwright's own default. `NavigationOptions.waitForLoadState` is removed,
since `waitUntil` now covers every method. Migration: rename `waitForLoadState` to `waitUntil` in `navOptions` and
in per-call options.

### `SessionStorage` rebuilt on Playwright's WebStorage API **[done, plan 1.5]**

The helper now reads and writes through `page.sessionStorage` and adds only what Playwright lacks: batches, step
titles, origin checks, typed values, and seeding before the app loads.

- Values are strings, stored and read exactly as given. 2.x JSON-encoded every value, so `set({ token: "abc" })`
  reached the app as `"abc"` with quotes. Structured values are declared once per key with a codec:
  `new SessionStorage(page, { schema: { user: json<User>() } })`, or the `sessionStorage: { schema }` option of a
  page object, with the schema type named through the `storage` member of the page object's options type. `json<T>()` ships; `Codec<T>` is exported for custom
  codecs. An undeclared key must be a string, at compile time and at runtime.
- `set`, `get`, `clear` and `seed` each take a single key or a record: `set("token", "abc")`, `get("token")`,
  `clear(["a", "b"])`, `seed({ token })`.
- `get(keys)` returns every requested key with `null` when absent; `get()` returns the present entries. A literal
  `get([])` or `clear([])` no longer compiles; a computed empty list reads nothing or removes nothing (2.x read or
  cleared everything).
- `setOnNextNavigation` is replaced by `seed(entries, { origin? })`. It intercepts the next navigation to the origin,
  whether by `goto`, a link, a script redirect, a form POST or a server redirect, and stores the entries in the
  browser before the app's document exists, so the app's first script sees them. It never leaves the page the test
  is on, so an origin can be seeded with data learned on the previous one. Already on the origin, it writes at once.
  While a seed is pending, and only then, navigations to other origins pass through Playwright so that server
  redirects can be seen; nothing is registered on a page that never seeds. A seed that is still pending when the
  page closes fails the test; two page objects seeding the same origin merge. Whole-page navigation mocks must be
  registered after `seed`; API mocks are unaffected.
- `waitForContext` is removed: an operation on a page without an origin fails at once with a message naming the
  fix. `reload` is removed: call `page.reload()`.
- A page object's helper operates on that page object's origin and throws, naming both origins, when the page is on
  another one. A standalone helper without an origin operates on the current origin; its `seed` needs `{ origin }`.
- Service workers: a worker registered by the app that answers navigations also answers a pending seed, and
  Playwright's routes cannot see it. The test then fails at once with a message naming the fixes: `serviceWorkers:
  "block"`, seeding before the app's first load in the context, or unregistering the worker in the test.

**Migration.** `grep -rn 'setOnNextNavigation\|waitForContext' --include=*.ts .`; replace `setOnNextNavigation(x)`
with `seed(x)`, drop `waitForContext`, replace `set(x, { reload: true })` with `set(x)` plus `page.reload()`. Where
2.x stored objects, declare a codec for the key and drop the `set<T>` / `get<T>` generics; where it stored strings
that the app parsed as JSON (an `ngx-webstorage` style layer), declare `json<string>()` for those keys to keep the
quotes. Replace `get(keys)` checks for `undefined` with `null`.

## Bug fixes

- `getById(string)` no longer breaks on ids with punctuation, whitespace, quotes, or a leading digit (analysis 1.1).
  **[done]**
- `getById(RegExp)` no longer silently matches nothing for patterns with metacharacters (analysis 1.2). **[done]**
- Resolving an id definition that lacks an id now throws a descriptive error instead of falling back to an empty
  id. **[done]**
- A fully anchored RegExp `urlPath` such as `/^\/account\/\d+$/` no longer produces a `fullUrl` that can never match
  (analysis 1.3). **[done]**
- RegExp flags on `baseUrl` or `urlPath` are no longer dropped (analysis 1.3). **[done]**
- `fullUrl` and `goto` no longer produce a double slash for a `baseUrl` with a trailing slash (analysis 1.3).
  **[done]**
- `expectThisPage` no longer retries forever when `fullUrl` lacks the trailing slash the browser reports (analysis
  1.4). **[done]**
- A substring RegExp `baseUrl` no longer needs to match up to the start of the path (analysis 1.3). **[done]**
- `expectAnotherPage` no longer passes while still on the page (analysis 1.4). **[done]**
- `goto` is no longer unavailable on a page object whose `urlPath` is a RegExp (analysis 1.10). **[done]**
- `SessionStorage.set` no longer stores strings with JSON quotes (analysis 1.5a). **[done, plan 1.5]**
- Seeding before the app's first load no longer loses the race against the app's first script (analysis 1.5b), no
  longer merges and wipes concurrent calls (1.5c), and no longer leaks a listener after a failure (1.5d).
  **[done, plan 1.5]**
- `get([])` and `clear([])` no longer mean "everything" (analysis 1.5e). **[done, plan 1.5]**
- An empty string in session storage no longer reads back as `null` (analysis 1.5f). **[done, plan 1.5]**
- No session storage operation waits without a timeout any more (analysis 1.5g). **[done, plan 1.5]**

## Removed and internal cleanup

- The internal helpers `cssEscape` and `normalizeIdValue` are removed from `src/locators/utils.ts`. Neither was
  exported from the package entry point. **[done]**
- The id-specific normalisation repeated across `add`, `update`, `replace`, and resolution is gone with them
  (analysis 1.10, third bullet). **[done]**
- `PageObject.composeFullUrl` and the internal `NavigationString` / `NavigationRegExp` / `ExtractNavigationType`
  types are replaced by `src/helpers/url.ts` and a single `NavigationFor` type. `UrlPathTypeFromOptions` no longer
  spells `"" | string` (analysis section 2). **[done]**
- `SessionStorage.setOnNextNavigation`, the `waitForContext` and `reload` options, the `set<T>` / `get<T>` generics,
  and the internal `SessionStorageState` type are removed; `json`, `Codec` and `SessionStorageSchema` are exported
  instead. **[done, plan 1.5]**

## Tooling, CI, and tests

- A unit-test layer for the pure helpers, with `pnpm test:unit` and `pnpm test` running unit tests before the
  packed integration suite. CI runs the unit tests after lint. The runner is vitest, with tests colocated as
  `src/**/*.test.ts`; they never enter the bundle or the published tarball. **[done]**
- A new `/testids` fixture route in the test server, a `testIds` page object and fixture, and a spec that covers
  tricky ids, verbatim matching, case sensitivity, shadow DOM, frames, and RegExp matching against real DOM.
  **[done]**
- Existing `getById` specs extended for registration-time validation, flag preservation, seeded inheritance, and
  the new rendered selectors. **[done]**
- Unit tests for URL validation, resolution, and composition in `src/helpers/url.test.ts`, including the Playwright
  parity table for relative inputs. **[done]**
- Vitest typecheck mode enabled for the unit tests, so the compile-time rules (the `BaseUrl` and `UrlPath` shapes,
  the `goto` overloads) are enforced by `pnpm test:unit` and CI through `@ts-expect-error` and `expectTypeOf`
  assertions. `vitest` is pinned exactly because the mode is experimental. **[done]**
- A new `/testnav` fixture route with delayed, query, hash, trailing-slash, and bounce-back navigations; `testNav`
  and `testNavItem` page objects and fixtures; a navigation spec covering `goto()`, `goto(target)`, the actions
  option, timeouts, RegExp bases, flags, and the empty-base case; and a construction-time validation spec.
  **[done]**
- A new `/teststorage` fixture route (GET and POST) with a startup snapshot, a link and a form POST hop to a second
  origin, a COOP variant and a service worker; `testStorage` and `testStorageSecond` page objects; a
  `sessionStorage.spec.ts` covering codecs, every method form, the no-origin and wrong-origin errors, seeding by
  `goto`, link and form POST, multi-origin chains, COOP, and the service-worker cases; unit tests for the pure
  parts and the type contract. The spec passes on Firefox and WebKit as well. **[done, plan 1.5]**

## Documentation

- `docs/v3` created as the working documentation set for 3.0.0. `docs/v2` is frozen as the 2.x reference.
  **[done]**
- The `getById` section of `docs/v3/locator-registry.md` rewritten: string and RegExp semantics, validation,
  multiple matches, what the resolved selector looks like, and a 2.x to 3.0 migration subsection. **[done]**
- `AGENTS.md` rewritten as the persistent contributor guide, including the 3.0.0 workflow. Removes the incorrect
  "thenable query builders" wording (analysis section 5, AGENTS.md). **[done]**
- The `PageObject` and navigation sections of `docs/v3/PageObject.md` and `docs/v3/overview.md` rewritten: URL
  rules and guards, how `fullUrl` is composed, the four navigation methods and their options, a real failure
  message, and a 2.x to 3.0 migration note. **[done]**
- `docs/v3/session-storage.md` rewritten: codecs with worked examples, every method form, `seed` and what it
  supports and costs, multi-origin flows, the service-worker limitation with every fix, and a 2.x to 3.0 migration
  with usage cases side by side. `overview.md` and `PageObject.md` follow. **[done, plan 1.5]**
- A new documentation site built with Starlight and hosted on GitHub Pages, using `docs/v3` as its source.
  **[roadmap]**

## Upgrade checklist (2.x to 3.0.0)

Grows as plans land.

1. Run the grep above and remove `#` and `id=` prefixes from `getById` calls.
2. Update any assertions on rendered locator strings for id-based locators.
3. Plain unanchored `getById(/pattern/)` calls keep working unchanged, because an unanchored regex is a substring
   match. Review patterns that contain regex metacharacters (`.`, `[`, `]`, `(`, `)`, `+`, `*`, `?`, `^`, `$`,
   `|`) or flags: 2.x matched them as literal text, 3.0.0 interprets them. Escape characters meant literally
   (`/a\.b/`) and expect flags such as `i` to take effect.
4. Replace `gotoThisPage()` with `goto()`.
5. Make every string `baseUrl` an origin with a scheme and no path, and every string `urlPath` empty or
   `/`-rooted. Environment-derived values are passed as they are; the constructor validates them.
6. On pages with a RegExp `baseUrl` or `urlPath`, `fullUrl` is a `UrlMatcher`: keep passing it to Playwright APIs,
   replace `toMatch(fullUrl)` with `toHaveURL(fullUrl)` or `fullUrl.test(url)`, and move any path prefix out of a
   base regex into `urlPath`. Flags on RegExp parts now apply.
7. Navigation waits follow `use.navigationTimeout`; override it with `navOptions: { timeout }` on the page object
   or a per-call `timeout`.
8. Rename `waitForLoadState` to `waitUntil` in `navOptions` and per-call navigation options.
9. Upgrade `@playwright/test` to 1.61 or later.
10. Replace `setOnNextNavigation` with `seed`, drop `waitForContext`, and replace `reload: true` with a
    `page.reload()` call.
11. Declare a codec for every session storage key that holds a structured value, and `json<string>()` for string
    keys the app parses as JSON; drop the `set<T>` / `get<T>` generics.
12. A check for `undefined` from `get(keys)` becomes a check for `null`; a literal `get([])` or `clear([])` must go.
13. If the app registers a service worker and a test seeds after the app has loaded, add `serviceWorkers: "block"`
    to the Playwright config or seed before the first load.
14. Remove `seed` calls that are not followed by a navigation to that origin, including defensive seeding in
    fixtures; seed in the test, right before the hop. Register whole-page navigation mocks after `seed`.
