# POMWright 3.0.0 release notes

> Working draft, maintained in `release-3.0.0/` while the release is built. It lists only changes that are done or
> committed to by a plan in this folder. It is not a summary of the analysis. Status markers:
> **[planned]** covered by a plan, not yet implemented. **[done]** implemented on the working branch.
> **[roadmap]** decided for 3.0.0 but not yet planned. Where a planned item depends on an open decision, the
> decision number from the plan is given. When 3.0.0 ships, drop the markers and this note; what remains is the basis
> for the changelog entry and the announcement.
>
> Last updated 2026-10-19. Plans covered: 1.1-1.2 (getById), executed and committed on
> `chore/bugfixes-quality-improvements-and-docs` (commits e709d0c to 735066b); 1.3-1.4 (URL composition and
> navigation), executed and committed on the same branch on 2026-10-08 (commits bc8d980 to 4682146); 1.5 (session
> storage), executed and committed on the same branch on 2026-10-10 (commits a05e8fd to ab76175); 1.6-1.8
> (registration guards, frames, `update` semantics, the Playwright 1.64 floor), executed and committed on the same
> branch on 2026-10-13 (commits 7105c92 to 803455c); 1.7 (the `PageObject` lifecycle), executed and committed on the
> same branch on 2026-10-13 (commits 66e9481 to 2301bee); 4 (packaging, tooling and CI), executed and committed on
> the same branch on 2026-10-14 (commits fc33244 to 837f1c8, with the CI follow-ups 8c2eb1b, 9d95a78 and 95975cf);
> 1.9 (types and exports), executed and committed on the same branch on 2026-10-14 (commits 46a04e9 to 4220bfa);
> 1.10-2 (small fixes and dead code), executed and committed on the same branch on 2026-10-15 (commits 07e7398 to
> 3c0dcf6); 9 (structure: the strategy table, seeds, reuse by path, descriptions, sparse chains and `strictChains`),
> executed and committed on the same branch on 2026-10-16 (commits 555290c to 0850bf1); 10 (quality review of the 3.0.0
> code: findings R1 to R22), executed and committed on the same branch on 2026-10-16 (commits 4c6ec60 to 4d9c124);
> 11 to 13 (the documentation redone as a Starlight site, the editor's hovers, the step locations of the helpers),
> written and decided on 2026-10-16, see [PLAN-5-DOCS.md](PLAN-5-DOCS.md); of these, 11 (the helpers' step locations,
> the snippet check, the Docs section and *Upgrading from 2.x*) executed and committed on the same branch on 2026-10-16
> (commits 801e4ac to 449ea50 and the ledger commit bc4d850), and 12 (the doc comments, the API and Internal sections,
> the API coverage check, `docs/v3` removed) on 2026-10-17 (commits f17d184 to 3118c0d and the ledger commit 67ec030),
> and 13 (the site, its CI job and deployment, the README) on 2026-10-17 (commits c84ddd4 to 84a550f and the ledger
> commit); its pre-merge step C8 is pending. 14 (dependencies) executed on 2026-10-19. 15 (`seed` on `addInitScript`),
> executed and committed on the same branch on 2026-10-19 (commits 7ad64e2 to 0724ec7 and the ledger commit), see
> [PLAN-15-SEED-INIT-SCRIPT.md](PLAN-15-SEED-INIT-SCRIPT.md). 16 (a registration ends at the next call on the registry),
> written and decided on 2026-10-19, see [PLAN-16-REGISTRATION-ENDS.md](PLAN-16-REGISTRATION-ENDS.md).

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

Each change is described briefly below. [Upgrading from 2.x](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/)
has the steps for every one of them: what changed and why, how to find the affected code, and what to write instead.

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

### `expectThisPage` and `expectAnotherPage` are one `waitForURL` each; `waitForLoadState` option removed **[done, plan 1.3-1.4]**

Each method is now a single `page.waitForURL` call under the project's `use.navigationTimeout`, overridable with
`NavigationOptions.timeout`, instead of a navigation wait followed by an unbounded exact-string retry. A failure
names the page object, the expected URL or matcher, and the URL found at failure time. `expectAnotherPage` waits
for the URL to change and then fails at once if it bounced back. POMWright no longer defaults `waitUntil` to
`"load"` itself; an unset value means Playwright's own default. `NavigationOptions.waitForLoadState` is removed,
since `waitUntil` now covers every method.

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
- `setOnNextNavigation` is replaced by `seed(entries, { origin? })`. Away from the origin, it adds an init script
  that stores the entries when the page's main frame first arrives at the origin, by any navigation (`goto`, a link,
  a script, a form POST of any encoding, a server redirect, a page a service worker or a mock serves), before the
  app's first script runs, and removes it once that document has run it, so a reload never overwrites what the app
  wrote. Navigations are never intercepted: the app sees the same request, headers, history entry and navigation
  type as without a seed, and `page.goto` returns the app's response. It never leaves the page the test is on, so an
  origin can be seeded with data learned on the previous one. Already on the origin, it writes at once. Nothing is
  registered on a page that never seeds; two page objects seeding the same origin merge. A seed that is still pending
  when the page closes fails the test, as does a write the browser refuses; `seed` itself throws in a browser without
  the Navigation API and when the page commits a document on the origin while it registers. (Rebuilt on
  `addInitScript` by plan 15, replacing plan 1.5's interception.) **[done, plan 15]**
- `waitForContext` is removed: an operation on a page without an origin fails at once with a message naming the
  fix. `reload` is removed: call `page.reload()`.
- A page object's helper operates on that page object's origin and throws, naming both origins, when the page is on
  another one. A standalone helper without an origin operates on the current origin; its `seed` needs `{ origin }`.

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

### `update` keeps the strategy and follows JSON Merge Patch; `replace` changes the strategy **[done, plan 1.6-1.8]**

`getLocatorSchema(path).update(subPath?)` patches the definition registered for the sub-path and keeps its
strategy: a provided primary replaces the primary, options merge key by key, `null` deletes an option
(`{ name: null }`) or every option (`getByRole("button", null)`, `getByRole(null)`), and `undefined` or an absent
value leaves the field alone. Calling another strategy's method on `update()` throws and names `replace()`.
`replace(subPath?)` installs a new definition of any strategy with the primary argument required. Neither verb
touches steps or the description. The builder-local cache that let 2.x switch strategies in `update` and switch
back for free is gone.

### Every builder requires the strategy's primary argument **[done, plan 1.6-1.8]**

`add`, seeded `add`, `createReusable`, `update` and `replace` throw at the call, naming the method and the path,
when the primary argument is missing (`getByRole requires a role value for "main.button".`), and when it is an empty string
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

### The package has an `exports` map and declares Node 20 **[done, plan 4]**

The package root is the public API: `import { … } from "pomwright"` works as before, in CommonJS and ESM projects
alike, and deep imports such as `pomwright/dist/index.js` fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`
(`pomwright/package.json` stays available). There is one CommonJS build; ESM projects load an ESM entry that
re-exports it by name, so a process that reaches pomwright through both `import` and `require` holds one copy, and
TypeScript reads ESM declarations for `import`. The `module` field and the separate ESM build are gone. `engines.node`
is `>=20`, Playwright 1.64's own requirement: npm warns on older Node, where Playwright already refuses to start.

### `replace()` takes Playwright's arguments **[done, plan 1.9]**

`getLocatorSchema(path).replace(subPath?)` takes the parameter lists of Playwright's own methods: the first argument is
required and the options are Playwright's option types. `replace().getByRole({ name: "Save" })`,
`replace().getByTestId()` and the other calls without a first argument, which always threw, no longer compile, and
neither do `null` options (`replace().getByRole("button", null)` or `{ name: null }`), which meant omission.
`replace().frameLocator()` (the any-frame form) and `replace().getByRole("button", undefined)` still compile; `update()`
is unchanged. From JavaScript a missing first argument now throws the message every other builder uses,
`getByRole requires a role value for "form.button".`, instead of `Locator replace for "form.button" of type "role"
requires a "role" value.`; `null` options still mean omission there.

### `UrlTypeOptions` is renamed `PageObjectTypeOptions`; builder, seed and path types are exported **[done, plan 1.9]**

`PageObject`'s second type argument, which also carries the `storage` schema since 3.0.0, is `PageObjectTypeOptions`;
`UrlTypeOptions` is gone. New type exports, so that shared locator modules, helpers and domain base classes can name
what the registry hands out, and a project compiled with `declaration: true` can export functions that return them:
`LocatorQueryBuilder` (what `getLocatorSchema(path)` and each of its steps return), `LocatorUpdateBuilder` (what
`update()` and `replace()` return), `ReusableLocator` (a seed from `createReusable`, the `reuse` option of `add`),
`FilterDefinition`, `IndexSelector`, `LocatorSchemaPathFormat` (the path rules as a type) and
`LocatorSchemaPathArgument` (the accessors' path parameter, for helpers that forward a path in a generic base class).
A path literal containing U+FEFF (the byte-order mark) is a compile error, as it always was a runtime error.

### `remove()` is replaced by `skip()` and `unskip()` **[done, plan 1.10-2]**

`getLocatorSchema(path).skip(subPath)` leaves an ancestor out of the chain when the query resolves, and
`unskip(subPath)` brings it back exactly as it was: skipping is a flag and deletes nothing. `remove(subPath?)` is gone;
it deleted the segment's definition, steps and description from the query, and a later `update()` or `replace()`
brought back the definition only. The terminal path cannot be skipped (a compile error, and a runtime error from
JavaScript), and `skip` has no form without an argument. `update`, `replace`, `filter`, `nth` and `clearSteps` on a
skipped segment throw `<method>() cannot apply to "<sub>": it is skipped in this query; call unskip("<sub>") first.`

```ts
registry.getLocatorSchema("main.list.item").skip("main.list").getNestedLocator(); // locator('main').locator('li')…
```

### `@step` decorates only methods that return a Promise **[done, plan 1.10-2]**

`test.step` always returns a Promise and runs the body later, so a decorated sync method returned a Promise typed as
its value, ran after the caller's next line, and its exceptions escaped the caller's `try/catch`. It is now a compile
error that says `@step decorates methods that return a Promise: make the method async`, under stage-3 decorators and
`experimentalDecorators`. A decorated static method is titled by its class (`AccountPage.create`) instead of
`Function.create`.

### The logger keeps what it is given and uses the run's locale **[done, plan 1.10-2]**

`PlaywrightReportLogger` attaches the message and every string argument exactly as written: no JSON re-formatting, no
trailing blank lines. Other arguments are printed as `console.log` prints them, instead of `[object Object]`. A
message that is a JSON object or array is attached as `application/json`, everything else as `text/plain`. Attachment
names use Playwright's `locale` and `timezoneId` (the `log` fixture passes them; `attachLogsToTest` takes them as an
optional second argument) instead of a fixed `nb-NO`, so with no config they read `08:19:55 AM 10/15/2026 - INFO :
[TestCase]`. Entries are attached in call order, one per entry, on the test that logged them, as before.

### `describe` requires a string; `nth` behaves as Playwright's **[done, plan 1.10-2]**

From JavaScript, `describe(null)` and `describe(undefined)` throw (they silently fell back to the path);
`describe("")` removes a description, as in Playwright. `nth(null)` and `nth(undefined)` reach Playwright's `nth`, which
matches nothing, instead of being dropped, which matched every element. TypeScript rejected all four already.

### Seeds from `createReusable` no longer change **[done, plan 9]**

`filter`, `nth` and `describe` on a seed return a new seed and leave the seed they were called on as it was, as a
Playwright `Locator` does; `seed.definition` returns a copy. In 2.x they changed the seed itself and returned it, so
variants derived from one base seed carried each other's steps and description:

```ts
const row = registry.createReusable.locator("tr");
registry.add("table.row@first", { reuse: row.nth(0) });
registry.add("table.row@last", { reuse: row.nth("last") });
// 2.x:   table.row@last is locator('table').locator('tr').first().last(), the first row
// 3.0.0: table.row@last is locator('table').locator('tr').last()
```

A seeded `add` keeps its shape: an optional override of the seed's strategy as the first call, then `filter`, `nth` and
`describe`. The override now takes `update`'s argument shapes and Merge Patch: `getByRole({ exact: null })` deletes the
key (2.x stored `null`), `getByRole(null)` clears the seed's options (2.x ignored it), and `getByRole("link", null)`
sets the role and clears them; all three now compile.

### Reuse by path returns `filter`, `nth` and `describe` **[done, plan 9]**

`add(path, { reuse: "other" })` copies `other` as before (the strategy, its steps and an explicit description) and now
returns `filter`, `nth` and `describe`, chained after the copied steps; 2.x returned nothing (`void`). There is no
strategy override and no `clearSteps` after a path: reuse keeps the reused locator and can only narrow it. A copy of an
any-frame `frameLocator()` path takes no steps or description, as the original takes none: the three methods throw on
it; where the copy may sit is checked by `verify()`, as for every any-frame path. This makes a registered path the
preferred way to share a locator across locator modules; exporting a `createReusable` seed stays possible.

```ts
registry.add("common.listItem").getByRole("listitem");
registry.add("main.list.lastItem", { reuse: "common.listItem" }).nth("last").describe("Last item");
```

### A registration ends at the next call on the registry **[planned, plan 16]**

In 2.x a registration kept in a variable could be given more steps at any time, after other registrations, after its
path was resolved, even mid-test, and the registered locator changed with them. In 3.0.0 a registration ends at the
next call on its registry (`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`, `verify`, or resolving a
query), and a later `filter`, `nth`, `describe` or locator method on it throws:
`nth() cannot apply to "item": its registration has ended; give a registration all its steps in its add(…) chain, or
query the path for one use.` Steps given right after `add`, before the registry is called again, work as before. See
[Upgrading from 2.x](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/).

## Additions

### Opt-in `strictChains` **[done, plan 9]**

`createRegistryWithAccessors(page, { strictChains: true })` and the `PageObject` constructor option `locators: {
strictChains: true }` make `verify()` require every ancestor of every registered path to be registered, and name every
unregistered one: `"main.form.button.save": strictChains requires every ancestor to be registered; "main.form" and
"main.form.button" are not.` A page object checks right after construction, as for every `verify()` failure; a
standalone registry when it calls `verify()`. The option is a boolean and defaults to `false`. Without the option
nothing changes: an unregistered segment is a name that groups paths and is left out of the chain. `skip` and `unskip`
work in both modes; under the option an any-frame `frameLocator()` is a root path.

### `PageObjectOptions` and `LocatorRegistryOptions` are exported; a seeded override may take no argument **[done, plan 10]**

`PageObjectOptions<Options>` is the type of the `PageObject` constructor's options (`label`, `navOptions`,
`sessionStorage`, `locators`), so a domain base class can forward them without restating their shape;
`LocatorRegistryOptions` is the type of `createRegistryWithAccessors`'s second parameter. A seeded override of any
strategy may be called with no argument and keeps the seed's definition, as `update()` does (only `frameLocator()`
compiled before).

```ts
abstract class ShopPage<Paths extends string> extends PageObject<Paths> {
	protected constructor(page: Page, urlPath: string, options?: PageObjectOptions) {
		super(page, "https://shop.example", urlPath, { ...options, locators: { strictChains: true } });
	}
}
```

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

- `replace()` no longer compiles calls that always throw (analysis 1.9a). **[done, plan 1.9]**
- The query builder's internal `applyUpdate` and `applyReplacement`, which skip the argument checks, are no longer
  reachable through its types after one chained call (analysis 1.9b). **[done, plan 1.9]**
- The type-level path check rejects the same characters as the runtime check, U+FEFF included, and the whitespace
  error shows the offending character escaped (`main\u00A0.form`) instead of printing it invisibly (analysis 1.9c).
  **[done, plan 1.9]**
- The types a consumer needs to name the builder chain, seeds, filters and path arguments are exported (analysis
  1.9d). **[done, plan 1.9]**

- A caller's options or filter object changed after `add()`, `filter()` or `createReusable`, a RegExp it passed
  rewritten with `compile()`, or a seed's step after `add(path, { reuse })`, no longer changes the registered locator:
  builders store copies, RegExps included (analysis 1.10, found in
  the plan 1.10-2 review). **[done, plan 1.10-2]**
- `filter` and `nth` on a hidden segment are no longer accepted and silently dropped, and a throwing `update()` after
  hiding a segment no longer brings it back (analysis 1.10). **[done, plan 1.10-2]**
- The sub-path error says when the sub-path is a segment of the path without a registration (analysis 1.10).
  **[done, plan 1.10-2]**
- An array or a `filter`-only object in `has`/`hasNot` is reported as an unsupported filter reference instead of
  Playwright's frame message (analysis 1.10). **[done, plan 1.10-2]**
- The duplicate-registration message shows a `Locator` as `locator('b')` instead of Playwright's internals (analysis
  1.10). **[done, plan 1.10-2]**
- Logged objects, arrays, errors, `undefined` and `null` are no longer printed as `[object Object]`, `1,2`, a first
  line or nothing (analysis 1.10). **[done, plan 1.10-2]**
- A bare `@step` on a static method compiled with `experimentalDecorators` is no longer silently unwrapped (analysis
  1.10). **[done, plan 1.10-2]**
- A page object's registry error and a never-applied `seed` point at the consumer's line even when the consumer's file
  is named `pageObject.ts` or `sessionStorage.ts`. **[done, plan 1.10-2]**

- Variants derived from one `createReusable` seed no longer share steps or a description (analysis 3.8).
  **[done, plan 9]**
- A reuse value that is neither a registered path nor a seed (`{ reuse: null }` from JavaScript) throws `reuse requires
  a registered path or a seed from createReusable for "<path>".` instead of a `TypeError`. **[done, plan 9]**
- A first argument Playwright cannot take, from JavaScript (`null`, a number, an object, a RegExp for a role, `locator`
  or `frameLocator`), throws `<method> requires a <field> value for "<path>".` on every builder instead of being stored
  and failing later with a `TypeError`, resolving to nonsense (`locator('null')`, `getByTestId('42')`) or doing
  nothing; `getByRole(null, null)` is valid nowhere. **[done, plan 9]**
- A seeded override's `null` option key is deleted instead of stored (a stored `name: null` failed at resolution), and
  a JavaScript `(undefined, options)` no longer drops the options: a seeded override now stores what `update` stores,
  for every strategy. **[done, plan 9]**
- A hand-made seed object with an any-frame `frameLocator()` definition (no selector) can no longer bring steps or a
  description into the registry: it throws at `add` instead of failing at the first resolution below the path; one
  without steps or a description registers as `add(path).frameLocator()` does. **[done, plan 9]**

- A string `urlPath` that the browser reports percent-encoded or normalised (`/søk`, `/a b`, `/x?q=a b`, `/a/./b`) is
  matched in that form, as `fullUrl` is: `expectThisPage` no longer times out on such a page, and `expectAnotherPage` no
  longer passes while the browser is on it. **[done, plan 10]**
- A `baseUrl` or `urlPath` that is neither a string nor a RegExp, such as an unset environment variable, throws at
  construction (`LoginPage: baseUrl must be a string or a RegExp; received undefined.`) instead of building a page
  object that never matches, passes `expectAnotherPage` and gives its storage no origin. **[done, plan 10]**
- A hand-made seed object is checked as every builder is: a missing or empty first argument throws at `add` (`reuse
  requires a selector value for "<path>".`). **[done, plan 10]**
- `replace(sub).frameLocator()` throws at the call on a segment that has steps in the query (naming `clearSteps`) and on
  the query's own path, instead of failing at resolution. A query's `filter` and `nth` on an any-frame segment give the
  same message as `add` does. **[done, plan 10]**
- A path that is not a string, from JavaScript, throws `LocatorSchemaPath must be a string; received 42.` instead of a
  `TypeError`; the duplicate-registration message no longer prints a RegExp used twice as `"[Circular]"`, and is headed
  `Existing and attempted schemas:`. **[done, plan 10]**
- The navigation steps (`LoginPage: Navigate to this Page`, …) and the session storage steps (`Auth.SessionStorage.set:`,
  …) show the test's line in the HTML report and the trace, as `@step` rows do, instead of a line in POMWright's bundle or
  no location. **[done, plan 11]**

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

- `LocatorQueryBuilderPublic` and the unused or duplicate internal type aliases (`LocatorSchemaPathErrors`,
  `ValidLocatorPath`, `FilterPatch`, `PathIndexMap`, `LocatorSchemaPathAlias`, `ResolvedFilterDefinition`) are
  removed; the internal builder classes are `LocatorQueryBuilderInternal` and `LocatorUpdateBuilderInternal`; the
  path whitespace list exists once for the type and the runtime check; no `stripInternal` (analysis sections 2 and 4).
  **[done, plan 1.9]**

- Unreachable branches in the registry and the query builder are removed, `getLocator` no longer builds a query
  builder (about twice as fast), a nested resolution clones each segment once instead of twice, and `seed` and
  `PageObject` share one call-site helper (analysis sections 1.10 and 2). **[done, plan 1.10-2]**

- The ten locator strategies are described once, in one internal table that the clone, the seeded override, `update`,
  `replace` and locator creation read; a new strategy without its builder method is a compile error. The unused
  debug-step record of the chain builder is removed (analysis 3.1, 3.3 and section 2). **[done, plan 9]**

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
  parts and the type contract. The spec passes on Firefox and WebKit as well. **[done, plan 1.5]** Since plan 15
  every hop, multipart and `text/plain` POSTs included, is compared with the same hop without a seed; the app's own
  writes, `waitUntil: "commit"`, an arrival by `goBack`, a 204, a download, a browser without the Navigation API and a
  refused write are covered; the fixture's service-worker page, whose script never ran, works. **[done, plan 15]**
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

- CI skips the unit tests, the build and the harness for a docs-only push only when nothing but `.md` files changed
  since the last commit of the branch whose checks passed (or, on a pull request, since its base): a docs-only push on
  a pull request that touched code no longer re-runs everything, and a docs-only push after a red run, on a pull
  request or on `main`, no longer turns it green; on `main` that could have started Publish. **[done, plan 4 follow-up]**
- Unit tests for the replace-mode types and messages, the query-builder chain types, seed variance and the path
  whitespace list over every code point; a compile-only probe of the public types against the published
  declarations, and a declaration-emit check (`declaration: true`) run by `pnpm typecheck` and `pnpm pack-test`.
  **[done, plan 1.9]**

- Unit tests for the skip rules, the copies, the `describe` check, the `nth` pass-through, the call-site helper, the
  logger's output and `@step` (a type-only `*.test-d.ts` file for decorator syntax); harness specs for `skip`/`unskip`
  against DOM, the logger's attachments, call sites in consumer files named like POMWright's, and the public types.
  **[done, plan 1.10-2]**

- Unit tests for the strategy table and its completeness, immutable seeds, reuse by path, the reuse check, the `null`
  primary and `strictChains`; harness specs for seeds and reuse by path against DOM, `strictChains` on a standalone
  registry and a page object, and the public types. **[done, plan 9]**

- CI runs the chromium harness at the Playwright pin on Node 20, the declared floor, for every pull request and every
  push to `main`; `pnpm
  lint` fails on warnings; the actions of the publish and check workflows are pinned to commit SHAs and kept current by
  a monthly Dependabot update; packages are published with npm provenance, which ties each tarball to the workflow run
  and commit that built it; the harness `tsconfig.json` no longer uses `baseUrl`, which TypeScript 6 rejects.
  **[done, plan 10]**
- Unit tests for the logger's level methods and its initial level on a retry, the any-frame resolution guards, the
  hand-made seed checks and the URL matcher's normalised paths; harness specs for `navOptions` defaults, non-ASCII
  paths, fragments through `seed`, and every fixture page object's verification; the seed builder's tests in a file of
  their own. **[done, plan 10]**

- The repository's tooling is brought up to date: pnpm 12, TypeScript 6, tsup 9, biome 2.5.15, vitest 5.0.5, and the
  GitHub Actions at their latest majors; Dependabot proposes every npm project's versions. The published bundle is
  unchanged. **[done, plan 14]**

## Documentation

- A documentation site at `https://dyhex.github.io/POMWright/`, in three sections: Docs (getting started, principles,
  one page per concept, each from the Playwright concept beneath it, with diagrams), API (every export and member in
  Playwright's form, with the real error messages, and a page listing every message) and Internal (how POMWright works,
  for contributors and the curious). Every example is compiled against the package in CI, the API reference is checked
  against the published declarations, and every link is checked; the site is deployed after every green `CI` on
  `main`. It replaces `docs/v2` for 3.0.0; the 2.x documentation stays in the repository at the `v2.1.0` tag.
  **[done, plans 11 to 13; deployed from the 3.0.0 branch, with a pre-release banner and `noindex`, until the merge]**
- *Upgrading from 2.x*, one page with every migration step: what changed and why, how it shows up, how to find the
  affected code, and 2.x and 3.0.0 code side by side. These notes link to it instead of carrying their own migration
  paragraphs and checklist. **[done, plan 11]**
- Doc comments for every export and public member (summary, parameters, return value, errors thrown, example, and a
  link to the API page), so the API reads from the editor's hovers. **[done, plan 12]**
- The README is rewritten for 3.0.0: what POMWright is and what it adds to Playwright, one example, and links to the
  site. **[done, plan 13]**
- `AGENTS.md` rewritten as the persistent contributor guide, including the 3.0.0 workflow and the documentation's
  rules; the incorrect "thenable query builders" wording removed (analysis section 5). **[done]**
