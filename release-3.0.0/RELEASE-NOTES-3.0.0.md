# POMWright 3.0.0 release notes

> Working draft, maintained in `release-3.0.0/` while the release is built. It lists only changes that are done or
> committed to by a plan in this folder. It is not a summary of the analysis. Status markers:
> **[planned]** covered by a plan, not yet implemented. **[done]** implemented on the working branch.
> **[roadmap]** decided for 3.0.0 but not yet planned. Where a planned item depends on an open decision, the
> decision number from the plan is given. When 3.0.0 ships, drop the markers and this note; what remains is the basis
> for the changelog entry and the announcement.
>
> Last updated 2026-10-14. Plans covered: 1.1-1.2 (getById), executed and committed on
> `chore/bugfixes-quality-improvements-and-docs` (commits e709d0c to 735066b); 1.3-1.4 (URL composition and
> navigation), executed and committed on the same branch on 2026-10-08 (commits bc8d980 to 4682146); 1.5 (session
> storage), executed and committed on the same branch on 2026-10-10 (commits a05e8fd to ab76175); 1.6-1.8
> (registration guards, frames, `update` semantics, the Playwright 1.64 floor), executed and committed on the same
> branch on 2026-10-13 (commits 7105c92 to 803455c); 1.7 (the `PageObject` lifecycle), executed and committed on the
> same branch on 2026-10-13 (commits 66e9481 to 2301bee); 4 (packaging, tooling and CI), executed and committed on
> the same branch on 2026-10-14 (commits fc33244 to 837f1c8).

## Overview

POMWright 3.0.0 is a major release focused on fixing bugs, maintenance, removing dead, redundant, or unnecessary
code, structural improvements, and improving packaging, tooling, CI, quality, reliability, performance, test coverage,
and documentation.

Requirements: peer dependency `@playwright/test >=1.64.0 <2.0.0`, raised from `>=1.57.0`. `SessionStorage` uses
`page.sessionStorage` (Playwright 1.61) **[done, plan 1.5]**; the any-frame `frameLocator()` needs 1.63 and the regex
fix that makes every RegExp flag deterministic is in 1.64.0, so the floor is 1.64.0 and the harness runs it
**[done, plan 1.6-1.8]**. Node 20 or later, Playwright 1.64's own requirement, declared in `engines`
**[done, plan 4]**.

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

- All flags pass through to Playwright unchanged, as with Playwright's own locators. The sticky `y` flag is a start
  anchor (Playwright 1.64.0 resets the regex state per element, microsoft/playwright#42818, and 1.64 is the floor)
  **[done, plans 1.1-1.2 and 1.6-1.8]**.
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

### Steps on frame segments apply, and `frameLocator()` is Playwright's any-frame locator **[done, plan 1.6-1.8]**

In 2.x a `filter`, `nth`, `first` or `last` chained on a `frameLocator(selector)` registration was recorded and
dropped at resolution; when it mattered the action failed with a strict mode violation naming the frame selector.
In 3.0.0 a frame segment resolves as Playwright recommends since 1.43: `locator(selector)`, then its steps, then
`contentFrame()` for the descendants, and the `<iframe>` element itself when the frame is the last segment or a
`has`/`hasNot` reference. Steps work at registration, on seeds and on the query builder (`nth("shell.frame", 1)`,
`filter("shell.frame", { visible: true })`). A step-less frame renders exactly as before; a stepped one renders
`locator('iframe').nth(1).contentFrame()…`. Disambiguate frames by their ancestor segments first; a step on the
iframe element is the last resort, as for any locator, and `filter({ hasText })` on an iframe never matches because
the frame's document is not part of the parent's text.

`add(path).frameLocator()` with no selector registers Playwright's any-frame locator (1.63): the descendants resolve
in whichever single frame holds them, the main frame included, and Playwright throws when several frames match. It
must be the first segment of its chain, takes no steps and has no terminal form; `replace().frameLocator()` makes a
sub-path any-frame. `frameLocator("")` throws on every builder.

**Migration.** `grep -rn 'frameLocator(' --include=*.ts .` and review every chain that follows with `.nth(`,
`.filter(`, `.first(` or `.last(`: the step now takes effect.

### `update` keeps the strategy and follows JSON Merge Patch; `replace` changes the strategy **[done, plan 1.6-1.8]**

`getLocatorSchema(path).update(subPath?)` patches the definition registered for the sub-path and keeps its
strategy: a provided primary replaces the primary, options merge key by key, `null` deletes an option
(`{ name: null }`) or every option (`getByRole("button", null)`, `getByRole(null)`), and `undefined` or an absent
value leaves the field alone. Calling another strategy's method on `update()` throws and names `replace()`.
`replace(subPath?)` installs a new definition of any strategy with the primary argument required. Neither verb
touches steps or the description. The builder-local cache that let 2.x switch strategies in `update` and switch
back for free is gone.

**Migration.** Rename cross-strategy `update(...).<method>(...)` calls to `replace` and state the primary argument.
`update(x, undefined)` no longer wipes options and `{ key: undefined }` no longer removes a key: use `null`.
`grep -rn 'update(' --include=*.ts . | grep undefined` finds both.

### Every builder requires the strategy's primary argument **[done, plan 1.6-1.8]**

`add`, seeded `add`, `createReusable`, `update` and `replace` throw at the call, naming the method and the path,
when the primary argument is missing (`getByRole requires a role for "main.button"`), and when it is an empty string
for `locator`, `frameLocator` and `getByRole`, which Playwright cannot use (`locator requires a non-empty selector
for "list"`); `getById("")` already threw. `getByTestId("")`, `getByText("")`, `getByLabel("")`,
`getByPlaceholder("")`, `getByAltText("")` and `getByTitle("")` are stored verbatim, because Playwright matches
elements with empty attributes. Which strings are ARIA roles remains a compile-time check through Playwright's own
role type, with autocompletion, as in 2.x; there is no runtime list. In 2.x `getByTestId("")` and `frameLocator("")`
registered without their value and failed at resolution, a seeded `getByTestId("")` silently inherited, and an
options-only `getByRole` from JavaScript registered without a role.

### Steps before a strategy no longer compile; a failed seeded override keeps the seed **[done, plan 1.6-1.8]**

`add(path).filter(…)`, `.nth(…)` and `.describe(…)` are compile errors; after a strategy they are available as
before, and a seeded registration keeps them before its override. At runtime the message names the method and the
strategies to call first. A seeded registration whose override throws keeps the seeded definition; 2.x unregistered
it for a wrong-type override and kept it for a second override.

### Page objects verify their registry after `defineLocators()` **[done, plan 1.6-1.8]**

`PageObject` resolves every registered path once right after `defineLocators()`, so a mistyped `has`/`hasNot` path
reference, a cycle, or an any-frame segment used as a terminal fails right after construction, in the fixture, with
every failing path listed, instead of at the first action that resolves it (the timing is plan 1.7's, next section). Registration itself is unchanged: forward references are still
allowed. The cost is about a microsecond per path. Standalone registries from `createRegistryWithAccessors` call
`registry.verify()` themselves.

### Page objects define their locators after construction; the post-navigation hook is optional **[done, plan 1.7]**

`PageObject` no longer calls `defineLocators()` from its constructor. It runs, followed by the registry
verification, right after the page object is constructed (once the code that called `new` has finished: in a
fixture, before the test body), or at its first locator call if that comes earlier, once per instance. In 2.x it ran
inside `super(...)`, before the subclass had stored anything, so a definition that used a constructor argument, a
field or a constructor-body assignment silently registered `undefined` (a lost name option, `undefined-submit`, or
the wrong branch). Now it sees the whole page object; nothing in page objects, locator files or fixtures needs to
change.

- A registry mistake still fails the fixture before the test body, now with the page object's label in the message
  (`LoginPage: Locator registry verification failed …`, `LoginPage: defineLocators() failed: …`), the construction
  site in the stack and the original error as `cause`. `new X(page)` itself no longer throws for it.
- A page object built in `beforeEach` or `beforeAll` still fails the tests the hook runs for, but each body runs
  until its first use of that page object, where the same error is rethrown. In a `beforeAll` group that is not
  `serial`, every test of the group fails, where 2.x failed the first and did not run the rest.
- A value assigned to a page object after an `await` that follows `new` is not seen by `defineLocators()`.
- `pageActionsToPerformAfterNavigation()` is optional, with no actions by default, and is called each time the
  actions run (after `goto()` and `expectThisPage()`) instead of once at construction, so it reads the page object's
  current state. `null` and `[]` both mean no actions, as they always did.

**Migration.** Delete `pageActionsToPerformAfterNavigation()` implementations that return `[]` or `null`; with the
`noImplicitOverride` compiler flag, add `override` to the ones that stay. A test that expects `new X(page)` to throw
for a registry mistake asserts on a first use instead: `expect(() => new X(page).getNestedLocator(path)).toThrow(…)`.
Pass values that `defineLocators()` depends on to the constructor.

### The package has an `exports` map and declares Node 20 **[done, plan 4]**

The package root is the public API: `import { … } from "pomwright"` works as before, in CommonJS and ESM projects
alike, and deep imports such as `pomwright/dist/index.js` fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`
(`pomwright/package.json` stays available). There is one CommonJS build; ESM projects load an ESM entry that
re-exports it by name, so a process that reaches pomwright through both `import` and `require` holds one copy, and
TypeScript reads ESM declarations for `import`. The `module` field and the separate ESM build are gone. `engines.node`
is `>=20`, Playwright 1.64's own requirement: npm warns on older Node, where Playwright already refuses to start.

**Migration.** Replace deep imports with imports from `"pomwright"`.

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
- `filter` and `nth` on a `frameLocator` segment are no longer dropped at resolution (analysis 1.6, 3.2).
  **[done, plan 1.6-1.8]**
- A registration, seed, update or replacement without its primary argument no longer registers and fails later
  (analysis 1.8). **[done, plan 1.6-1.8]**
- `update(x, undefined)` no longer wipes the registered options (analysis 1.8). **[done, plan 1.6-1.8]**
- `filter`, `nth` and `describe` before a strategy are compile errors and the runtime message says what to call
  first (analysis 1.9e). **[done, plan 1.6-1.8]**
- A seeded registration is no longer unregistered by a wrong-type override (analysis 1.10). **[done, plan 1.6-1.8]**
- `defineLocators()` and `pageActionsToPerformAfterNavigation()` see the page object's constructor arguments, fields
  and constructor-body assignments instead of `undefined` (analysis 1.7). **[done, plan 1.7]**
- The package's `license` is the SPDX id `Apache-2.0` instead of `Apache 2.0`, and its `repository.url` is in the
  form npm expects (analysis section 4). **[done, plan 4]**

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
- The frame branch of `buildLocatorChain`, the internal `LocatorRegistryInternal.unregister`, the seeded rollback,
  the per-path per-type definition cache of the query builder and the three-source merge of the update builder are
  removed; `createLocator` returns `Locator`; `LocatorRegistry` gains `verify`; `assertIdValue` becomes a call to a
  generic `assertPrimaryValue`. **[done, plan 1.6-1.8]**
- The redundant `.npmignore` is removed (the `files` allowlist alone decides what is packed). **[done, plan 4]**

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
- The harness pins `@playwright/test` 1.64.0; the three `toString` expectations that 1.64 renders as `.visible()`
  follow, and the sticky `y` flag is asserted against DOM. **[done, plan 1.6-1.8]**
- `/iframe` gains a hidden iframe section and the iframe page object gains stepped, hidden and any-frame paths;
  `/testids` gains a `data-testid=""` element; new specs for frame steps against DOM, registration validation per
  strategy, the Merge Patch rules and the strategy-switch error, pre-definition calls, seeded recovery, and
  `verify()` through the registry, the accessors and a page object; unit tests for the builders' guards, the update
  parsing and merge, and the builder types. The frame specs pass on Firefox and WebKit as well. **[done, plan 1.6-1.8]**
- New `pageObject/lifecycle.spec.ts` and `pageObject/actions.spec.ts`: what definitions and actions see of subclass
  state against DOM, when the definition, the verification and the actions hook run, how registry mistakes are
  reported from fixtures, hooks and first uses, `null` and `[]`; a unit-test file for the lifecycle, the errors and
  their stacks, and the hook types. **[done, plan 1.7]**
- The harness installs the packed package from an extracted directory with a frozen lockfile, so it always tests the
  current build and its lockfile no longer changes with every build; it needs no sudo (the postinstall that called
  `playwright install-deps` is gone); `pnpm pack-test` builds, packs, installs, type-checks and runs every browser
  project, passing its arguments to `playwright test`. **[done, plan 4]**
- CI runs the whole harness at the Playwright floor (1.64.0) and at the latest 1.x, on chromium for every pull request
  (draft or not) and on chromium, firefox and webkit for every push to `main`, from one shared workflow; the separate
  test workflow is gone. Each run builds and packs once and tests that tarball on each browser; a change to `.md` files only runs
  lint. Publishing waits for the `main` run, including the browser suite, so a release can no longer publish past a
  red suite (as 1.5.1 did), and the publish workflow itself refuses anything but a push to `main` in this repository.
  **[done, plan 4]**
- `tsc --noEmit -p test` (`pnpm typecheck`) checks the specs, the page objects and the compile-only path validation
  probe against the published declarations; lint and format cover the whole repository; `@playwright/test` is a
  pinned root dev dependency at the floor; CI retries a failure once for a trace and a video and fails on flaky tests,
  local runs do not retry; a new spec checks the ESM entry against the CommonJS build. **[done, plan 4]**

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
- `docs/v3/locator-registry.md`: the frame sections rewritten around `locator` plus `contentFrame()`, steps on
  frames with the ancestor-context recommendation, the any-frame segment, the strategy-method requirements, the
  `update`/`replace` split with the Merge Patch rules, a `verify()` section, the error reference, the tested
  guarantees, and a 2.x to 3.0 migration subsection; the sticky-flag caveat removed; the floor in `overview.md` and
  `session-storage.md`. **[done, plan 1.6-1.8]**
- `docs/v3/PageObject.md`: a *Hooks and lifecycle* section written for page-object authors with a 2.x and 3.0
  example, the optional actions hook with `null` and `[]` explained, one registry per instance, the `return [];`
  boilerplate removed from the examples and the `page as Page` cast removed (analysis section 5);
  `composing-locator-modules.md` shows a locator module that takes page-object state, such as a locale, as an extra
  argument; `overview.md`, `locator-registry.md` and `session-storage.md` follow. **[done, plan 1.7]**
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
9. Upgrade `@playwright/test` to 1.64 or later.
10. Replace `setOnNextNavigation` with `seed`, drop `waitForContext`, and replace `reload: true` with a
    `page.reload()` call.
11. Declare a codec for every session storage key that holds a structured value, and `json<string>()` for string
    keys the app parses as JSON; drop the `set<T>` / `get<T>` generics.
12. A check for `undefined` from `get(keys)` becomes a check for `null`; a literal `get([])` or `clear([])` must go.
13. If the app registers a service worker and a test seeds after the app has loaded, add `serviceWorkers: "block"`
    to the Playwright config or seed before the first load.
14. Remove `seed` calls that are not followed by a navigation to that origin, including defensive seeding in
    fixtures; seed in the test, right before the hop. Register whole-page navigation mocks after `seed`.
15. Review every `frameLocator(...)` registration followed by `.nth(`, `.filter(`, `.first(` or `.last(`: the step
    now applies. Prefer disambiguating frames through their ancestor segments.
16. Rename `update(...)` calls that change the locator strategy to `replace(...)` and state the primary argument.
17. Replace `undefined` used to clear options in `update` (`update(x, undefined)`, `{ key: undefined }`) with
    `null`.
18. Fix registrations, seeds, updates or replacements that pass an empty string to `locator`, `frameLocator` or
    `getByRole`, or no primary argument at all; they now throw at the call.
19. Expect a page object whose registry has a mistyped `has`/`hasNot` path reference or a cycle to fail right after
    construction, in the fixture; fix the reference. Standalone registries can call `registry.verify()` for the same
    check.
20. Delete `pageActionsToPerformAfterNavigation()` implementations that return `[]` or `null`; with
    `noImplicitOverride`, add `override` to the ones that stay.
21. A test that expects `new X(page)` to throw for a registry mistake asserts on a first use instead; pass values
    that `defineLocators()` depends on to the constructor rather than assigning them after an `await`.
22. Replace deep imports such as `pomwright/dist/index.js` with imports from `"pomwright"`, and run on Node 20 or
    later. **[done, plan 4]**
