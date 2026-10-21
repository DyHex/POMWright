# pomwright

## 3.0.1

### Patch Changes

- [#51](https://github.com/DyHex/POMWright/pull/51) [`ec110dc`](https://github.com/DyHex/POMWright/commit/ec110dc254899c1465102186dacdd3d80808e6b0) Thanks [@DyHex](https://github.com/DyHex)! - Overlapping `seed` calls for one origin now merge as if each had been awaited in turn, in the order they were made,
  later values winning per key.

  In 3.0.0, two `seed` calls for the same origin that overlapped (in a `Promise.all`, or a call that was not awaited)
  could:

  - lose one call's entries, so the "was never applied" message listed only some of the keys;
  - fail with `disposableObject.dispose: disposable@… is disposed more than once`;
  - leave an init script behind that wrote the seeded values again after every return from another origin, overwriting
    what the app had stored there, with no error.

  Each call keeps its own checks. A commit on the origin is now noticed from the moment `seed` is called, so a call made
  while the page was arriving there fails at the call ("the page committed a document on … while seed() was
  registering"). Before, it could resolve while the app loaded without the entries, and the test failed later as never
  applied: on Chromium, a `seed` that was not awaited before a `goto` on a fresh page did. Awaited calls behave as before.

  Await `seed` before the action that starts the hop. A `Promise.all` of seeds is fine; the seeding page's new
  [Several seeds](https://dyhex.github.io/POMWright/docs/seeding-session-storage/#several-seeds) section explains when
  it helps.

## 3.0.0

### Major Changes

- [#46](https://github.com/DyHex/POMWright/pull/46) [`17b55dc`](https://github.com/DyHex/POMWright/commit/17b55dcb492c1574bc821b1329c4e7fb22942d66) Thanks [@DyHex](https://github.com/DyHex)! - ### Documentation and upgrading

  POMWright's documentation is now a site: **https://dyhex.github.io/POMWright/**.

  - [Getting started](https://dyhex.github.io/POMWright/docs/installation/): install POMWright, write a first page
    object, and hand page objects to tests as Playwright fixtures.
  - [Upgrading from 2.x](https://dyhex.github.io/POMWright/docs/upgrading-from-2x/): every change in 3.0.0 that a 2.x
    project meets, each with how it shows up (a compile error, a change that still compiles, or a failure with a message
    that names the fix), the search that finds the affected code, and 2.x and 3.0.0 code side by side. Start here when
    upgrading; the entries below describe each change in short.
  - [API reference](https://dyhex.github.io/POMWright/api/): every export and member, with its arguments, return value
    and the errors it throws, and a page listing every error message. The same text is in the doc comments, so the
    editor's hover shows it.
  - [Internal](https://dyhex.github.io/POMWright/internal/): how POMWright works, for contributors.

  The 2.x documentation stays in the repository at the
  [`v2.1.0` tag](https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2).

- [#46](https://github.com/DyHex/POMWright/pull/46) [`735066b`](https://github.com/DyHex/POMWright/commit/735066b99a807fb6316d54585afaeaeb9ac73061) Thanks [@DyHex](https://github.com/DyHex)! - ### Breaking changes

  `getById` now matches ids the way the DOM has them, and evaluates RegExp ids as real patterns.

  - String ids are matched verbatim and case-sensitively and resolve as `[id="…"]`. Ids containing `.`, `:`, `[`, `]`,
    spaces, quotes, backslashes, or a leading digit now work.
  - The `#` and `id=` prefixes are no longer stripped. `getById("#login")` now looks for `id="#login"`. Find stale call
    sites with:

    ```sh
    grep -rnE 'getById\(\s*["'"'"'`](#|id=)' --include=*.ts --exclude-dir=node_modules .
    ```

  - RegExp ids are evaluated as regular expressions with their flags. In 2.x the regex source was matched as literal
    substring text, so plain unanchored patterns such as `/btn-submit/` behave the same, while metacharacters (`.`,
    `[`, `(`, `+`, `*`, `?`, `^`, `$`, `|`) and flags now take effect: escape characters meant literally (`/a\.b/`)
    and anchor with `^` and `$` for whole-id matches. The rendered selector changes from `[id*="…"]` to
    `internal:attr=[id=/…/]`.
  - RegExp flags pass through to Playwright unchanged, as with Playwright's own locators. The sticky `y` flag acts as a
    start anchor, because Playwright resets the regex state per element from 1.64.0, the peer floor; prefer `^`.
  - `getById("")` throws at registration, naming the registry path.
  - The rendered selector for string ids changes from `locator('#x')` to `locator('[id="x"]')`.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`837f1c8`](https://github.com/DyHex/POMWright/commit/837f1c8a94e7dd08b9de3653108f211307c97b83) Thanks [@DyHex](https://github.com/DyHex)! - ### Breaking changes

  The package now declares its entry points and its Node floor, mirroring how `@playwright/test` is packaged.

  - The package has an `exports` map: import from `"pomwright"` only. Deep imports such as `pomwright/dist/index.js`
    fail with `ERR_PACKAGE_PATH_NOT_EXPORTED`; `pomwright/package.json` stays available. CommonJS projects (Playwright's
    default) load the same file as before. ESM projects (`"type": "module"`) now load an ESM entry that re-exports that
    CommonJS build by name, so a process that reaches pomwright through both `import` and `require` holds one copy of
    every class; TypeScript reads ESM declarations for `import` and CommonJS declarations for `require`, under every
    `moduleResolution`. The `module` field and the separate ESM build are gone. Migration: replace deep imports with
    imports from `"pomwright"`.
  - `engines.node` is `>=20`, Playwright 1.64's own requirement. npm warns when installing on older Node, where
    Playwright already refuses to start.

  ### Fixes

  - The `license` field is the SPDX id `Apache-2.0` instead of `Apache 2.0`, and `repository.url` is in the form npm
    expects, so npm no longer rewrites it on publish.

  ### Publishing

  - Releases are published with npm provenance: npm shows, for each published version, the GitHub Actions run and the
    commit that built it, and `npm audit signatures` verifies it.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`2301bee`](https://github.com/DyHex/POMWright/commit/2301bee0e4354805dbe4247b0a2d868fbe5b288c) Thanks [@DyHex](https://github.com/DyHex)! - ### Breaking changes

  `PageObject` no longer calls its hooks from its own constructor, where the subclass has not stored anything yet, so
  `defineLocators()` and `pageActionsToPerformAfterNavigation()` see the whole page object. Page objects, locator files
  and fixtures are written as before.

  - `defineLocators()` and the registry verification run once per page object, right after it is constructed (once
    the code that called `new` has finished: in a fixture, before the test body), or at its first locator call if that
    comes earlier. In 2.x `defineLocators()` ran inside `super(...)`, so a definition that used a constructor argument,
    a field or a constructor-body assignment registered `undefined` without a word: a lost name option, a test id such
    as `undefined-submit`, or the wrong branch of a condition. A locator module can now take page-object state as an
    extra argument: `defineLocators(this.locatorRegistry, this.locale)`.
  - A registry mistake (a duplicate path, an empty selector, a `has` reference to a path that is never registered, a
    cycle) still fails the fixture before the test body, now with the page object's label in the message
    (`LoginPage: Locator registry verification failed …`, `LoginPage: defineLocators() failed: …`), the construction
    site in the stack and the original error as `cause`, but `new X(page)` itself no longer throws for it. Every later
    locator call on that page object throws the same error. Migration: a test that expects `new X(page)` to throw for a
    registry mistake asserts on a first use instead:
    `expect(() => new X(page).getNestedLocator(path)).toThrow(…)`.
  - A broken page object built in `beforeEach` or `beforeAll` still fails the tests the hook runs for, but each body
    runs until its first use of that page object; in a `beforeAll` group that is not `serial`, every test of the group
    fails, where 2.x failed the first and did not run the others.
  - `defineLocators()` does not see a value assigned to the page object after an `await` that follows `new`.
    Migration: pass such values to the constructor. A field initialiser that resolves a locator runs the definition
    while the class is still being built; use a getter for derived locators.
  - `pageActionsToPerformAfterNavigation()` is optional, with no actions by default, and it is called each time the
    actions run (after `goto()` without a target and after `expectThisPage()`) instead of once at construction, so it
    reads the page object's current state. `[]` and `null` both mean no actions, as they always did. Migration: delete
    implementations that return `[]` or `null`; with the `noImplicitOverride` compiler option, add `override` to the
    ones that stay.

  ### Fixes

  - `defineLocators()` and `pageActionsToPerformAfterNavigation()` see the page object's constructor arguments, fields
    and constructor-body assignments instead of `undefined`.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`803455c`](https://github.com/DyHex/POMWright/commit/803455cfe0cdc88a3d2e998e51a2b398cd5bdc50) Thanks [@DyHex](https://github.com/DyHex)! - ### Breaking changes

  The locator registry mirrors Playwright more closely: frames are the `<iframe>` element plus `contentFrame()`, every
  strategy's first argument is checked where it is written, `update` is a patch of the registered definition and
  `replace` a new one, and a page object verifies its registry after `defineLocators()`.

  - `filter`, `nth`, `first` and `last` on a `frameLocator(selector)` segment now apply. 2.x recorded them and dropped
    them at resolution; when it mattered, the action failed with a strict mode violation naming the frame selector. A
    frame segment resolves as `locator(selector)`, then its steps, then `contentFrame()` for the descendants, and the
    `<iframe>` element itself when it is the last segment or a `has`/`hasNot` reference (what `owner()` gave). A
    step-less frame renders exactly as before; a stepped one renders `locator('iframe').nth(1).contentFrame()…`.
    Migration: `grep -rn 'frameLocator(' --include=*.ts --exclude-dir=node_modules .` and review every chain that
    follows with `.nth(`, `.filter(`, `.first(` or `.last(`. Prefer telling frames apart through their ancestor
    segments; `filter({ hasText })` on an iframe element never matches.
  - `update()` keeps the registered strategy and throws, naming `replace()` and the right method, for another one; the
    builder-local cache that restored an earlier strategy's definition is gone. `replace()` changes the strategy and,
    like `update()`, keeps the recorded steps and the description. Migration: rename cross-strategy
    `update(...).<method>(...)` calls to `replace` and state the first argument.
  - `update()` follows JSON Merge Patch: `null` deletes an option (`{ name: null }`) or every option
    (`getByRole("button", null)`, `getByRole(null)`); `undefined` and absent values leave the options alone. So
    `update(x, undefined)` no longer wipes the options and `{ key: undefined }` no longer removes a key. Migration:
    `grep -rn 'update(' --include=*.ts --exclude-dir=node_modules . | grep undefined` and use `null`.
  - `add`, `createReusable` and `replace` throw at the call when the strategy's first argument is missing, naming the
    method and the path (`getByRole requires a role value for "main.button".`), and every builder, `update` and a seeded
    `add` included, throws when it is an empty string for `locator`, `frameLocator` and `getByRole`, which Playwright
    cannot use (`getById("")` already threw). On `update` and a seeded `add` an omitted first argument keeps the
    registered one, as before. `getByTestId("")` and the text-likes store the empty string, which Playwright
    matches. 2.x registered `getByTestId("")` and `frameLocator("")` without their value and failed at resolution, a
    seeded `getByTestId("")` silently inherited, and an options-only `getByRole` from JavaScript registered without a
    role.
  - `filter`, `nth` and `describe` before a strategy no longer compile; at runtime the message names the method and the
    strategies to call first.
  - A seeded registration whose override throws keeps the seeded definition instead of being unregistered. A throwing
    DSL call never changes the registry.
  - A registration ends at the next call on its registry (`add`, `getLocator`, `getNestedLocator`, `getLocatorSchema`,
    `verify`, or resolving a query). In 2.x a registration kept in a variable could be given more steps at any time,
    after other registrations, after its path was resolved, from a page object's method mid-test, and the registered
    locator changed with them; a later step, locator method or seeded override of it now throws
    (`nth() cannot apply to "item": its registration has ended; …`) and changes nothing. Migration:
    `grep -rnE '((const|let) +\w+|this\.\w+) *= .*\badd\(' --include=*.ts --exclude-dir=node_modules .` and give each
    kept registration all its steps before the registry is called again; a step for one use becomes a query.
  - `PageObject` verifies every registered path right after `defineLocators()`, so a mistyped `has`/`hasNot` path
    reference or a cycle fails at construction, with every failing path listed, instead of at the first action that
    resolves it. Registration itself is unchanged: forward references stay allowed.

  ### New

  - `add(path).frameLocator()` with no selector registers Playwright's any-frame locator (`page.frameLocator()`,
    Playwright 1.63 and later; the peer floor is 1.64): the descendants resolve in whichever single frame holds them,
    the main frame included. It must be the first segment of its chain, takes no steps and has no terminal form;
    `replace().frameLocator()` installs it on a sub-path.
  - `registry.verify()` on every registry and in the public `LocatorRegistry` type, for standalone registries from
    `createRegistryWithAccessors`.

  ### Fixes

  - Steps on frame segments are no longer dropped.
  - A registration, seed, update or replacement without its first argument no longer registers and fails later.
  - `update(x, undefined)` no longer wipes the registered options.
  - `filter`, `nth` and `describe` before a strategy are compile errors with a runtime message that says what to call
    first.
  - A seeded registration is no longer unregistered by a wrong-type override.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`0850bf1`](https://github.com/DyHex/POMWright/commit/0850bf1c497bd7f91c3b020ac0cb4fdfc82ea485) Thanks [@DyHex](https://github.com/DyHex)! - ### Breaking changes

  - A seed from `createReusable` no longer changes: `filter`, `nth` and `describe` return a new seed and leave the seed
    they are called on as it was, as a Playwright `Locator` does, and `seed.definition` returns a copy. In 2.x they
    changed the seed and returned it, so variants derived from one base seed carried each other's steps and
    description (`row.nth("last")` after `row.nth(0)` resolved to the first row). Migration: use the result of a seed
    method, `add(path, { reuse: seed.filter(f) })` instead of `seed.filter(f);` followed by `add(path, { reuse: seed })`,
    which now registers the seed without the filter.
  - `add(path, { reuse: "other" })` returns `filter`, `nth` and `describe`, which narrow the copy after the copied steps
    (the copy keeps the source's strategy, steps and explicit description, as before; the source never changes). There
    is no strategy override and no `clearSteps` after a path, and a copy of an any-frame `frameLocator()` path refuses
    all three. 2.x returned nothing (`void`). Migration: drop a `void` annotation on the result; a module compiled with
    `declaration: true` that returns it from an expression-bodied arrow uses a block body or `: void`, as for a seed
    reuse.

  ### Fixes

  - Variants derived from one seed no longer share steps or a description.
  - A reuse value that is neither a registered path nor a seed (`{ reuse: null }` from JavaScript) throws `reuse
requires a registered path or a seed from createReusable for "<path>".` instead of a `TypeError`.
  - A first argument Playwright cannot take, from JavaScript (`null`, a number, an object, a RegExp for a role,
    `locator` or `frameLocator`), throws `<method> requires a <field> value for "<path>".` on every builder instead of
    being stored and failing later with a `TypeError`, resolving to nonsense (`locator('null')`, `getByTestId('42')`) or
    doing nothing. With two arguments the first is the primary, so `getByRole(null, null)` is valid nowhere; a lone
    `null` on `update` or a seeded override is the options.
  - A seeded override follows `update()`'s Merge Patch: a `null` option key is deleted instead of stored (a stored
    `name: null` failed at resolution), a lone `null` clears the seed's options (2.x ignored it), `(primary, null)` sets
    the primary and clears them, and a JavaScript `(undefined, options)` no longer drops the options. All of these forms
    now compile, typed as `update`'s.
  - Steps or a description can no longer reach an any-frame `frameLocator()` definition, through a copy by path or a
    hand-made seed object: they throw at the call instead of at the first resolution below the path. A copy or seed
    without them registers as `add(path).frameLocator()` does.

  ### Internal

  - The ten locator strategies are described once, in one table that locator creation, the clone, the seeded override,
    `update` and `replace` read; a strategy without its builder method is a compile error.
  - The debug-step record of the chain builder, built and never read, is removed.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`ab76175`](https://github.com/DyHex/POMWright/commit/ab7617512b7e495f3039c0d95fcb014dfd17df86) Thanks [@DyHex](https://github.com/DyHex)! - ### Breaking changes

  `SessionStorage` is rebuilt on Playwright's `page.sessionStorage` and adds only what Playwright lacks: batches, step
  titles, origin checks, typed values, and seeding before the app loads.

  - Requires `@playwright/test` 1.64 or later; the peer range is now `>=1.64.0 <2.0.0`. `page.sessionStorage` needs
    1.61, the any-frame `frameLocator()` needs 1.63, and the fix that makes every RegExp flag deterministic across
    elements (microsoft/playwright#42818) is in 1.64.0.
  - Values are strings, stored and read exactly as given. 2.x JSON-encoded every value, so `set({ token: "abc" })`
    reached the app as `"abc"` with quotes. A structured value is declared once per key with a codec:
    `new SessionStorage(page, { schema: { user: json<User>() } })`, or on a page object the `storage` member of its
    options type plus the `sessionStorage: { schema }` constructor option. `json<T>()` ships; `Codec<T>` is exported
    for custom codecs. An undeclared key must be a string, at compile time and at runtime. Migration: declare a codec
    for keys that held objects and drop the `set<T>` / `get<T>` generics; declare `json<string>()` for string keys an
    app parses as JSON (an `ngx-webstorage` style layer), which keeps the quotes.
  - `set`, `get`, `clear` and `seed` each take a single key or a record: `set("token", "abc")`, `get("token")`,
    `clear(["a", "b"])`, `seed({ token })`.
  - `get(keys)` returns every requested key with `null` when absent; `get()` returns the present entries. A literal
    `get([])` or `clear([])` no longer compiles; a computed empty list reads nothing or removes nothing (2.x read or
    cleared everything). Migration: a check for `undefined` becomes a check for `null`.
  - `setOnNextNavigation` is replaced by `seed(entries, { origin? })`. Away from the origin, it adds an init script
    that stores the entries when the page's main frame first arrives at the origin, by any navigation (`goto`, a link,
    a script, a form POST, a server redirect, a page a service worker or a mock serves), before the app's first script
    runs, and removes it once that document has run it, so a reload never overwrites what the app wrote. Navigations
    are never intercepted: the app sees the same request, headers and history as without a seed. It never leaves the
    page the test is on, so an origin can be seeded with data learned on the previous one. Already on the origin, it
    writes at once. A page that never seeds has nothing registered; two page objects seeding the same origin merge. A
    seed still pending when the page closes fails the test, as does a write the browser refuses; `seed` itself throws
    in a browser without the Navigation API and when the page commits a document on the origin while it registers.
    Migration: `grep -rn 'setOnNextNavigation' --include=*.ts --exclude-dir=node_modules .` and rename to `seed`.
  - `waitForContext` is removed: an operation on a page without an origin fails at once with a message naming the
    fix. `reload` is removed: call `page.reload()`.
  - A page object's helper operates on that page object's origin and throws, naming both origins, when the page is on
    another one. A standalone helper without an origin operates on the current origin; its `seed` needs `{ origin }`.

  New exports: `json`, `Codec`, `SessionStorageSchema`, `StorageTypeFromOptions`.

  ### Fixes

  - `set` no longer stores strings with JSON quotes.
  - Seeding before the app's first load no longer loses the race against the app's first script, no longer merges and
    wipes concurrent calls, and no longer leaks a listener after a failure.
  - `get([])` and `clear([])` no longer mean "everything".
  - An empty string no longer reads back as `null`.
  - No session storage operation waits without a timeout any more.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`5d2371c`](https://github.com/DyHex/POMWright/commit/5d2371cfa49fb57761f8f0e5dfc7e160f6ab454a) Thanks [@DyHex](https://github.com/DyHex)! - ### Breaking changes

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
    (`"42"` included) as `text/plain`. Attachment names use Playwright's `locale` and `timezoneId` instead of a fixed
    `nb-NO`: the `log` fixture passes them, and `attachLogsToTest(testInfo)` called from a fixture of your own takes
    the project's `use.locale` and `use.timezoneId` from the config, or `{ locale, timeZone }` as its second argument.
    With no config they read `08:19:55 AM 10/15/2026 - INFO : [TestCase]`. Entries are attached in call order, without
    sorting. Migration: set `use: { locale: "nb-NO" }` in the config for the 2.x names; a fixture of your own that
    should also follow `test.use()` passes `{ locale, timeZone: timezoneId }` from its fixtures. Pass
    `JSON.stringify(data, null, 2)` for pretty JSON or data nested deeper than two levels.
  - From JavaScript, `describe(null)` and `describe(undefined)` throw `describe requires a string for "<path>"; pass ""
to remove the description.` instead of falling back to the path, and `nth(null)` and `nth(undefined)` reach
    Playwright's `nth`, which matches nothing, instead of being dropped, which matched every element. TypeScript rejected
    all four already. Migration: call `nth` only when there is an index.

  ### Fixes

  - A caller's options or filter object changed after `add()`, `filter()` or `createReusable`, a RegExp it passed
    rewritten with `compile()`, or a seed's step after `add(path, { reuse })`, no longer changes the registered locator:
    builders store copies, RegExps included.
  - A static method decorated with `@step` is titled by its class instead of `Function`, and a bare `@step` on a static
    method compiled with `experimentalDecorators` is no longer left unwrapped.
  - An array or a `filter`-only object in `has`/`hasNot` is reported as an unsupported filter reference instead of
    failing with Playwright's `Inner "has" locator must belong to the same frame.` message.
  - The duplicate-registration message shows a `Locator` in a step as Playwright prints it (`locator('b')`) instead of
    its internals.
  - The sub-path error adds `It is a segment of that path, but no locator schema is registered for it.` when the
    sub-path is an unregistered segment of the query's path.
  - A page object's registry error and a never-applied `seed` point at the consumer's line even when the consumer's file
    is named `pageObject.ts` or `sessionStorage.ts`.

  ### Internal

  - Unreachable branches in the registry and the query builder are removed; `getLocator` resolves a copy of the record
    without building a query builder (about twice as fast); a nested resolution copies each segment once instead of
    twice; `seed` and `PageObject` share one call-site helper.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`4220bfa`](https://github.com/DyHex/POMWright/commit/4220bfa35d55731b6d4e6b2d4d587ad6c5abf723) Thanks [@DyHex](https://github.com/DyHex)! - ### Breaking changes

  - `getLocatorSchema(path).replace(subPath?)` takes the parameter lists of Playwright's own methods: the first argument
    is required and the options are Playwright's option types. `replace().getByRole({ name: "Save" })`,
    `replace().getByTestId()` and the other calls without a first argument, which always threw, no longer compile, and
    neither do `null` options (`replace().getByRole("button", null)` or `{ name: null }`), which meant omission.
    `replace().frameLocator()` and `replace().getByRole("button", undefined)` still compile; `update()` is unchanged.
    From JavaScript a missing first argument throws `getByRole requires a role value for "<path>".`, the message every
    other builder uses, instead of `Locator replace for "<path>" of type "role" requires a "role" value.`, and `null`
    options still mean omission. Migration: pass the first argument to `replace()` methods and drop `null` options from
    them.
  - `UrlTypeOptions`, `PageObject`'s second type argument, is renamed `PageObjectTypeOptions`, since it also carries the
    `storage` schema. There is no alias. Migration: rename it in imports and constraints.
  - A path literal containing U+FEFF (the byte-order mark) is a compile error; it always threw at registration.

  ### Features

  - New type exports, so that shared locator modules, helpers and domain base classes can name what the registry hands
    out, and a project compiled with `declaration: true` can export functions that return it:
    `LocatorQueryBuilder` (what `getLocatorSchema(path)` and each step of its chain return), `LocatorUpdateBuilder`
    (what `update()` and `replace()` return), `ReusableLocator` (a seed from `createReusable`, the `reuse` option of
    `add`; `ReusableLocator<Paths, "role">` keeps the strategy, `ReusableLocator<Paths>` accepts any), `FilterDefinition`,
    `IndexSelector`, `LocatorSchemaPathFormat` (the path rules as a type) and `LocatorSchemaPathArgument` (the path
    parameter of `add` and the accessors, for a helper that forwards a path in a base class generic in its paths).

  ### Fixes

  - The query builder's internal `applyUpdate` and `applyReplacement`, which skip the argument checks, are no longer
    reachable through its types after a chained call.
  - The type-level path check rejects the same whitespace as the runtime check, U+FEFF included, and the whitespace
    error shows each character but the plain space as an escape (`main\u00A0.form`) instead of printing it invisibly.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`4682146`](https://github.com/DyHex/POMWright/commit/46821464fe0819928635be53d04800accab2b2b5) Thanks [@DyHex](https://github.com/DyHex)! - ### Breaking changes

  `PageObject` URLs now behave exactly like Playwright's `baseURL` handling, with one base per page object, and the
  navigation helper waits the way Playwright does.

  - `gotoThisPage()` is removed. `goto()` without a target replaces it: it navigates to `fullUrl` and runs the
    post-navigation actions unless `{ runPostNavigationActions: false }`. `goto(target)` never runs the actions.
    Migration: `grep -rn 'gotoThisPage(' --include=*.ts --exclude-dir=node_modules .` and drop `ThisPage`.
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

### Minor Changes

- [#46](https://github.com/DyHex/POMWright/pull/46) [`4d9c124`](https://github.com/DyHex/POMWright/commit/4d9c12491ef9250b88cecc8923c8822f65b76b89) Thanks [@DyHex](https://github.com/DyHex)! - ### Features

  - `PageObjectOptions<Options>`, the type of the `PageObject` constructor's options (`label`, `navOptions`,
    `sessionStorage`, `locators`), and `LocatorRegistryOptions`, the type of `createRegistryWithAccessors`'s second
    parameter and of `locators`, are exported, so a domain base class forwards the options by name instead of restating
    their shape. No migration.
  - A seeded override of any strategy may be called with no argument and keeps the seed's definition, as `update()` does
    (`add(path, { reuse: seed }).getByRole()`); only `frameLocator()` compiled before.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`0850bf1`](https://github.com/DyHex/POMWright/commit/0850bf1c497bd7f91c3b020ac0cb4fdfc82ea485) Thanks [@DyHex](https://github.com/DyHex)! - ### Features

  - Opt-in `strictChains`: `createRegistryWithAccessors(page, { strictChains: true })` and the `PageObject` constructor
    option `locators: { strictChains: true }` make `verify()` require every ancestor of every registered path to be
    registered, and name every one that is not, one line per path:
    `"main.form.button.save": strictChains requires every ancestor to be registered; "main.form" and "main.form.button"
are not.` A page object checks it right after `defineLocators()`; a standalone registry when it calls `verify()`.
    The option is a boolean, `false` by default; without it nothing changes, and an unregistered segment stays a name
    that groups paths and is left out of the chain. `skip` and `unskip` work in both modes; under the
    option an any-frame `frameLocator()` is a root path. No migration.

### Patch Changes

- [#46](https://github.com/DyHex/POMWright/pull/46) [`17f566d`](https://github.com/DyHex/POMWright/commit/17f566dec08d1648cdaef7c3f5a87b2e9a80f181) Thanks [@DyHex](https://github.com/DyHex)! - ### Documentation

  - Every export and every public member now has a doc comment, so the editor's hover is a reference, as Playwright's
    own is: a summary, each parameter (with the options of `PageObject`'s constructor and of `SessionStorage` one by
    one), the return value, the errors thrown with their messages, an example, and a link to its page in the API reference. `navigation.goto`,
    `expectThisPage` and `expectAnotherPage` are documented on the type a page object's `navigation` has, and `filter`,
    `nth` and `describe` after a locator method on the type a registration chain has, so the hover shows them where
    you write them.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`801e4ac`](https://github.com/DyHex/POMWright/commit/801e4ac8e765a912737d6e13143501d7dcca2165) Thanks [@DyHex](https://github.com/DyHex)! - ### Fixes

  - The steps of the navigation helper (`LoginPage: Navigate to this Page`, `LoginPage: Expect this Page`, …) and of
    `SessionStorage` (`Auth.SessionStorage.set:`, …) are reported at the line that called them, in the HTML report and
    the trace, as `@step` rows are: they are boxed steps now. They showed a line in POMWright's bundle, and the session
    storage steps no location at all. A failure inside them was, and is, reported at the test's line.

- [#46](https://github.com/DyHex/POMWright/pull/46) [`4d9c124`](https://github.com/DyHex/POMWright/commit/4d9c12491ef9250b88cecc8923c8822f65b76b89) Thanks [@DyHex](https://github.com/DyHex)! - ### Fixes

  - A string `urlPath` is compared in the form the browser reports it, as `fullUrl` is and as Playwright's
    `toHaveURL(string)` compares: for a path such as `/søk`, `/a b` or `/x?q=a b`, `expectThisPage` timed out and
    `expectAnotherPage` passed while the browser was on the page.
  - A `baseUrl` or `urlPath` that is neither a string nor a RegExp throws at construction
    (`LoginPage: baseUrl must be a string or a RegExp; received undefined.`) instead of building a page object that never
    matched its page, passed `expectAnotherPage` and gave its session storage no origin. Migration: a page object built
    from an unset environment variable now fails at construction; set the variable.
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

## 2.1.0

### Minor Changes

- [#44](https://github.com/DyHex/POMWright/pull/44) [`9345734`](https://github.com/DyHex/POMWright/commit/9345734feaa5069cc5befeae3195f694649ba5df) Thanks [@DyHex](https://github.com/DyHex)! - Default Playwright descriptions for locators resolved through `getLocator` and `getNestedLocator` to their terminal
  registry paths. Explicit descriptions from registrations, reused schemas, and query-level overrides continue to take
  precedence, while terminal frame definitions apply the description to the `Locator` returned by `FrameLocator.owner()`.
  This provides meaningful labels in Playwright traces and reports without changing the resolved locator chain.

## 2.0.0

### Major Changes

- [#42](https://github.com/DyHex/POMWright/pull/42) [`795e948`](https://github.com/DyHex/POMWright/commit/795e948afa6930075287c2780c5ead34d7209c84) Thanks [@DyHex](https://github.com/DyHex)! - Remove the v1 runtime implementation and test/tooling from the package.

  ### Breaking changes

  - Removed v1 exports from `pomwright` entrypoint:
    - `GetByMethod`, `LocatorSchema`, `AriaRoleType`
    - `BaseApi`
    - `BasePage`, `BasePageOptions`, `ExtractBaseUrlType`, `ExtractFullUrlType`, `ExtractUrlPathType`
    - `GetLocatorBase`, `LocatorSchemaWithoutPath`
    - `BasePageV1toV2`
  - Removed v1 source and test paths (`src`, `intTest`, `test`) and v1 scripts/tooling (`pack-test.sh`, `vitest`).
  - Removed v1 bridge translation helper from v2 runtime.

  ### Notes

  - v2 public API remains unchanged.
  - Legacy v1 and migration documentation is retained in `docs/v1` and `docs/v1-to-v2-migration`.

## 1.5.1

### Patch Changes

- [#40](https://github.com/DyHex/POMWright/pull/40) [`c8232d2`](https://github.com/DyHex/POMWright/commit/c8232d21e2d7f0149042f4844037c67289d26068) Thanks [@DyHex](https://github.com/DyHex)! - # Summary

  This PR focuses on preventative quality improvements to v2 locator-registry typing and internal safety.

  ## What changed

  - Refined compile-time diagnostics for invalid locator schema paths so errors are clearer and more actionable at the literal argument level.
  - Hardened internal registry retrieval behavior (`get` / `getIfExists`) for safer, more predictable handling of missing paths and record cloning semantics.
  - Added both compile-time and runtime guards to reject path-based reuse when the source path equals the target registration path `registry.add(path, { reuse: path })`.

## 1.5.0

### Minor Changes

- [#35](https://github.com/DyHex/POMWright/pull/35) [`50fb6f4`](https://github.com/DyHex/POMWright/commit/50fb6f47ffd0745d81fffdf63cfbcf4c8b569bcf) Thanks [@DyHex](https://github.com/DyHex)! - # v1.5 Bridge Release

  ## Summary

  POMWright **v1.5** is a bridge release. It ships the legacy v1 API and the redesigned v2 API side-by-side so teams can migrate at their own pace.

  For projects continuing to use only v1 patterns, upgrading from **v1.4 → v1.5** should require no behavioral changes by default. Migration starts when you opt into v2 APIs.

  ## Philosophy and Motivation

  The v2 redesign preserves the original POMWright principles from v1 (typed path-based locator modeling and automatic locator chaining), while modernizing the architecture around:

  - better composability,
  - clearer public API boundaries,
  - stronger validation/error handling,
  - and **Playwright-native ergonomics**.

  The Playwright-native API shape (`getByRole`, `locator`, `filter`, `nth`, etc.) makes adoption easier for teams already fluent in Playwright, reducing cognitive overhead while improving long-term maintainability in larger test suites.

  ## Migration Documentation

  - [v1 to v2 comparison](../docs/v1-to-v2-migration/v1-to-v2-comparison.md)
  - [Direct migration guide](../docs/v1-to-v2-migration/direct-migration-guide.md)
  - [Bridge migration guide](../docs/v1-to-v2-migration/bridge-migration-guide.md)

  ## v2 documentation

  - [v2 Overview](../docs/v2/overview.md)
  - [v2 PageObject](../docs/v2/PageObject.md)
  - [v2 Locator Registry](../docs/v2/locator-registry.md)
  - [v2 Composing Locator Modules](../docs/v2/composing-locator-modules.md)
  - [v2 Session Storage](../docs/v2/session-storage.md)
  - [v2 Logging](../docs/v2/logging.md)

  ***

  ## What changes when moving from v1 to v2

  > Important: These are migration-time changes. They do **not** affect users who remain on v1 usage patterns in v1.5.

  ### 1) Base class and architecture

  - **v1**: `BasePage` is the core abstraction and requires `Page`, `testInfo`, and `PlaywrightReportLogger`.
  - **v2**: `PageObject` is slimmer and composes navigation, locator registry accessors, and session storage without hard-coupling `testInfo` or logger.

  ### 2) Modular adoption (“cherry-pick” usage)

  v2 does not force inheritance from `PageObject`.

  Adopters can use only what they need:

  - `LocatorRegistry` (via `createRegistryWithAccessors`)
  - `SessionStorage`
  - `step` decorator
  - logging fixture/logger
  - or `PageObject` as a convenience composition.

  ### 3) Locator definitions: schema objects → fluent builder DSL

  - **v1**: `addSchema(path, { locatorMethod, ... })` + `GetByMethod` enum + `LocatorSchemaWithoutPath`.
  - **v2**: `add(path).getByRole(...).filter(...).nth(...).describe(...)`.

  This redesign improves readability and aligns locator registration with native Playwright style.

  ### 4) Retrieval API behavior

  - Conceptually preserved: `getLocator` (terminal) vs `getNestedLocator` (full chain).
  - **v1** retrieval was async.
  - **v2** retrieval is synchronous.

  ### 5) Step handling (`filter` + `nth`) is significantly more expressive

  - **v1**: filters could be chained, but indexing behavior was constrained and applied after filter composition.
  - **v2**:
    - `filter` and `nth` are both first-class steps,
    - steps are applied in exact chain order,
    - no practical chain-limit restrictions,
    - `nth` can be set at registration time and query time,
    - `filter has/hasNot` accepts both Playwright locators and registry path references.

  ### 6) FrameLocator semantics are explicit and safer

  - **v1** cast `FrameLocator` to `Locator` for compatibility.
  - **v2** handles frame segments explicitly:
    - non-terminal frame segments continue resolution inside frame context,
    - terminal frame segments resolve to frame owner locator.

  ### 7) Mutation model redesign

  - **v1**: `update(...)` + `addFilter(...)` on schema clones.
  - **v2** separates concerns:
    - definition ops: `update`, `replace`, `remove`
    - step ops: `filter`, `nth`, `clearSteps`
    - locator annotation: `describe`

  This improves intent clarity and reduces accidental side effects.

  ### 8) Reuse model upgrade

  - **v1** reuse centered around shared `LocatorSchemaWithoutPath` objects.
  - **v2** introduces:
    - typed reusable seeds (`createReusable`),
    - controlled typed overrides,
    - reuse-by-path cloning.

  This reduces duplication while improving type guidance and safety.

  ### 9) Navigation helper (new in v2)

  `PageObject.navigation` is URL-type aware:

  - string fullUrl support includes `goto`, `gotoThisPage`, `expectThisPage`, `expectAnotherPage`.
  - RegExp fullUrl support narrows to assertion-oriented methods (`expectThisPage`, `expectAnotherPage`).

  ### 10) SessionStorage evolution

  SessionStorage is not removed; it is redesigned and strengthened:

  - context-aware operations (`waitForContext`),
  - key-targeted clear,
  - clearer option signatures.

  ### 11) Logging decoupling

  - v1 tightly coupled logger usage through base class constructor patterns.
  - v2 keeps logging available but optional; `PageObject` does not force logger coupling.

  ### 12) Step decorator (new in v2)

  v2 introduces a `@step` decorator for wrapping POM methods in `test.step` with typed arguments and returns.

  ### 13) Error handling and validation improvements

  v2 strengthens diagnostics and safety across registry operations:

  - stricter path validation (compile-time + runtime alignment),
  - improved sub-path validation,
  - better reuse guardrails,
  - explicit filter reference constraints,
  - filter cycle detection,
  - clearer frame/filter misuse errors.

  ***

  ## Breaking / Behavioral Notes (migration-scoped)

  The following apply when adopting v2 APIs:

  - retrieval methods are synchronous,
  - v1 nested index-map style is replaced by ordered `nth(...)` steps,
  - `addFilter(...)` is replaced by `filter(...)`,
  - frame handling semantics are explicit (terminal frame resolves to owner locator),
  - built-in `data-cy` selector engine behavior from v1 is removed from framework defaults,
  - `BaseApi` is not part of v2.

  ***

  ## Additional improvements worth mentioning

  - Cleaner public/internal API boundary for registry internals.
  - Functional-friendly factory (`createRegistryWithAccessors`) for dependency injection and non-class usage.
  - Clone-based query mutation semantics that avoid mutating canonical registry state.
  - Better migration support via bridge mechanisms and v1 schema translation helpers.
  - Better docs structure for v2 and migration workflows.

  ## skills

  In the repository ./skills folder you can find AI assistant migration skills to help upgrade POMWright page objects from v1 to v2. These skills provide step-by-step guidance for migrating BasePage to the v1.5 bridge (BasePageV1toV2) or directly to v2 PageObject.

  > **Important:** Use at your own discretion. These migration skills are an optional aid intended to reduce manual effort when moving POMWright page objects from v1 to v2. They offer practical guidance for common migration paths, but they cannot account for every project-specific variation, custom abstraction, or edge case in existing v1 implementations. Treat them as a helpful starting point—not a guaranteed or complete migration solution. Always review and validate AI-generated changes before using them.

  ## Bridge Positioning Statement

  POMWright v1.5 is intentionally designed to let teams keep shipping on v1 while preparing migration to v2. The release provides both a staged bridge path and a direct migration path, with no forced v1 behavior changes unless v2 APIs are adopted.

## 1.4.0

### Minor Changes

- [#36](https://github.com/DyHex/POMWright/pull/36) [`e307d0e`](https://github.com/DyHex/POMWright/commit/e307d0e871bce4b69f12fa17fa673af3dad8f874) Thanks [@DyHex](https://github.com/DyHex)! - # v1.4.0

  ## Removed

  - Dropped deprecated locator schema helpers (legacy numeric indexing and update/updates overloads). Use sub-path keyed indices and `update(subPath, updates)` instead.

  ## Changed

  - Simplified nested locator debug logging to count-only checks to avoid CSP-restricted pages failing when `evaluateAll` is blocked.

## 1.3.0

### Minor Changes

- [#33](https://github.com/DyHex/POMWright/pull/33) [`ca192bf`](https://github.com/DyHex/POMWright/commit/ca192bf587725a0eeba623e074d2e2e8347a5766) Thanks [@DyHex](https://github.com/DyHex)! - # Highlights

  Updated the README to surface the expanded documentation set, making it easier to discover the new onboarding and reference guides from the project landing page.

  ## Documentation

  ### Onboarding & Patterns

  - Added a comprehensive “Using POMWright” tutorial that walks through building a page object, defining locator schemas, moving definitions into shared files, wiring custom fixtures, and extracting common logic into abstract base classes for reuse across domains.

  ### Reference Guides

  - Documented the BasePage API, covering its generics, constructor contract, required overrides, helper methods, and recommendations for layering domain-specific base classes.
  - Explained LocatorSchemaPath rules, duplication safeguards, readability conventions (including @ suffixes), and how sub-paths power IntelliSense and targeted updates.
  - Expanded the LocatorSchema reference with Playwright parity for every selector strategy, POMWright-specific helpers like dataCy and id, the new filter property, and a reusable schema example.
  - Clarified how to use getLocator, getNestedLocator, and getLocatorSchema chains, including update/filter patterns, index migration guidance, and reuse techniques.
  - Added focused primers for the BaseApi helper, the shared PlaywrightReportLogger, and the sessionStorage wrapper so teams can integrate API utilities, logging, and state management consistently.
  - Shared a recommended folder layout for fixtures, page objects, and tests to help teams standardise project structure as they adopt the framework.

  ## Other improvements

  - Fix: Intended LocatorSchemaPath string format now fully enforced.
  - Add new tests, updated and fixed some existing tests
  - CI/CD improvements

## 1.2.0

### Minor Changes

- [#31](https://github.com/DyHex/POMWright/pull/31) [`bc29062`](https://github.com/DyHex/POMWright/commit/bc2906258a88acde1dd1479d7a000d036912f45a) Thanks [@DyHex](https://github.com/DyHex)! - # LocatorSchema Enhancements: `filter` Property, `.addFilter()`, Updated `.update()`, and Enhanced `getNestedLocator()`

  ## Overview

  This release introduces several key enhancements to the POMWright. These improvements aim to provide greater flexibility, maintainability, and type safety when constructing and managing locators in your Page Object Models (POMs). The main updates include:

  - **New `filter` Property**: Extends filtering capabilities beyond the `locator` method.
  - **New `.addFilter()` Method**: Facilitates dynamic addition of filters to locators.
  - **Updated `.update()` Method**: Replaces deprecated `.update` and `.updates` methods with a more intuitive interface (none-breaking).
  - **Enhanced `getNestedLocator()` Method**: Shifts from index-based to subPath-based indexing for better readability and maintainability.
  - **Export of `LocatorSchemaWithoutPath`**: Enables partial or full reuse of locator schemas across different contexts.

  ## Changes

  ### 1. New `filter` Property for `LocatorSchema`

  #### Purpose

  The existing `locatorOptions` property in `LocatorSchema` is specific to the `locator` method, limiting its applicability. The newly introduced `filter` property extends filtering capabilities to all locator types (e.g., `role`, `label`, `placeholder`, `testid`, `id`, etc.), excluding `frameLocator`.

  #### Behavior

  - **Global Applicability**: Unlike `locatorOptions`, the `filter` property can be applied to various locator methods, enhancing versatility.
  - **Priority Application**: When a `filter` is defined, it is always applied and will always be the first filter applied to the locator created from that LocatorSchema, the only exception is `locatorOptions` used with `locator`. This ensures consistent and prioritized filtering across different locator types.

  #### Usage Examples

  **Before: Using `locatorOptions` (Limited to `locator` method)**

  ```typescript
  this.locators.addSchema("main.products.radio@junior", {
    locator: "radio",
    locatorOptions: { hasText: "some text" },
    locatorMethod: GetByMethod.locator,
  });
  ```

  **After: Using `filter` (Applicable to Multiple Locator Methods)**

  ```typescript
  this.locators.addSchema("main.products.radio@junior", {
    locator: "input",
    filter: { hasText: "some text" },
    locatorMethod: GetByMethod.locator,
  });
  ```

  **With `role` Locator Method:**

  ```typescript
  this.locators.addSchema("main.products.radio@junior", {
    role: "radio",
    filter: { hasText: "some text" },
    locatorMethod: GetByMethod.role,
  });
  ```

  **Combined Example:**

  ```typescript
  this.locators.addSchema("main.subscription.form.item.section@header", {
    role: "region",
    roleOptions: { name: "Subscription Details" },
    filter: { hasText: "Mobile 2 GB" },
    locatorMethod: GetByMethod.role,
  });
  ```

  #### Benefits

  - **Enhanced Flexibility**: Apply default filters to various LocatorSchema.
  - **Improved Locator Precision**: Chain multiple filters to narrow down locators based on complex criteria.
  - **Backward Compatibility**: Existing `locatorOptions` works the same way as before, ensuring no disruption to current implementations.

  ### 2. New `.addFilter()` Method for `.getLocatorSchema()`

  #### Purpose

  The `.addFilter()` method allows dynamic addition of filters to any part of the locator chain, enhancing flexibility in locator construction without modifying the original `LocatorSchema` at any point in a test.

  #### Method Signature

  ```typescript
  .addFilter(
    subPath: SubPaths<LocatorSchemaPathType, LocatorSubstring>,
    filterData: FilterEntry
  ): LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>
  ```

  #### Parameters

  - `subPath`: A valid sub-path within the `LocatorSchemaPath` argument to .getLocatorSchema().
  - `filterData`: An object defining the filter criteria, which can include:
    - `has?: Locator`
    - `hasNot?: Locator`
    - `hasText?: string | RegExp`
    - `hasNotText?: string | RegExp`

  #### Usage Examples

  **Adding Filters to Specific Sub-Paths:**

  ```typescript
  const allCheckboxesForBrandFilters = await poc
    .getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
    .addFilter("main.products.searchControls.filterType", {
      hasText: /Producer/i,
    })
    .getNestedLocator();
  ```

  **Chaining Multiple Filters:**

  ```typescript
  const refinedCheckboxes = await poc
    .getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
    .addFilter("main.products.searchControls.filterType", {
      hasText: /Producer/i,
      hasNotText: /discontinued/i,
    })
    .addFilter("main.products.searchControls.filterType.label", {
      hasText: "Samsung",
    })
    .addFilter("main.products.searchControls.filterType.label", {
      has: poc.page.getByRole("checkbox"),
    })
    .getNestedLocator();
  ```

  **Combining `filter` Property and `.addFilter()`:**

  ```typescript
  this.locators.addSchema("main.subscription.form.item.section@header", {
    role: "region",
    roleOptions: { name: "Subscription Details" },
    filter: { hasText: "Mobile 2 GB" },
    locatorMethod: GetByMethod.role,
  });

  const specificSection = await poc
    .getLocatorSchema("main.subscription.form.item.section@header")
    .addFilter("main.subscription.form.item.section@header", {
      hasText: "Additional Services",
    })
    .getNestedLocator();
  ```

  #### Benefits

  - **Dynamic Filtering**: Add or modify filters on-the-fly without altering the original schema definitions.
  - **Chainability**: Easily chain multiple `.addFilter()` calls to build complex locator chains.
  - **Error Handling**: Attempts to add filters to invalid sub-paths will throw descriptive errors (compile & run-time), ensuring only valid paths are modified.

  ### 3. Updated `.update()` Method

  #### Purpose

  The existing `.update` and `.updates` methods are deprecated and will be removed in version 2.0.0. `.update` could only update the last LocatorSchema in the chain and `.updates` relied on index-based updates, which posed maintainability challenges, especially when renaming `LocatorSchemaPath` strings. The new `.update` method leverages valid `subPaths` of `LocatorSchemaPath` instead of indices, enhancing readability and reducing manual maintenance.

  #### New Method Signature

  ```typescript
  .update(
    subPath: SubPaths<LocatorSchemaPathType, LocatorSubstring>,
    modifiedSchema: Partial<LocatorSchemaWithoutPath>
  ): LocatorSchemaWithMethods<LocatorSchemaPathType, LocatorSubstring>
  ```

  #### Deprecation of Old Methods

  - **Old `.update(updates: Partial<LocatorSchemaWithoutPath>): LocatorSchemaWithMethods`**
  - **Old `.updates(indexedUpdates: { [index: number]: Partial<LocatorSchemaWithoutPath> | null }): LocatorSchemaWithMethods`**

  These methods are marked as deprecated and will be removed in version 2.0.0.

  #### Usage Examples

  **Case A: Update the Last `LocatorSchema` in the Chain**

  ```typescript
  const editBtn = await profile
    .getLocatorSchema("content.region.details.button.edit")
    .update("content.region.details.button.edit", {
      roleOptions: { name: "new accessibility name" },
    })
    .getNestedLocator();
  ```

  **Case B: Update a `LocatorSchema` Earlier in the Chain**

  ```typescript
  const editBtn = await profile
    .getLocatorSchema("content.region.details.button.edit")
    .update("content.region.details", {
      roleOptions: { name: "new accessibility name" },
    })
    .getNestedLocator();
  ```

  **Case C: Update Multiple `LocatorSchema` in the Chain**

  ```typescript
  const editBtn = await profile
    .getLocatorSchema("content.region.details.button.edit")
    .update("content", { roleOptions: { name: "new accessibility name" } })
    .update("content.region", {
      roleOptions: { name: "new accessibility name" },
    })
    .update("content.region.details", {
      roleOptions: { name: "new accessibility name" },
    })
    .update("content.region.details.button", {
      roleOptions: { name: "new accessibility name" },
    })
    .update("content.region.details.button.edit", {
      roleOptions: { name: "new accessibility name" },
    })
    .getNestedLocator();
  ```

  #### Benefits

  - **Enhanced Readability**: Using `LocatorSchemaPath` strings makes the code more intuitive and easier to understand.
  - **Reduced Maintenance**: Eliminates the need to manage index-based references, especially when `LocatorSchemaPath` strings are renamed or restructured.
  - **Type Safety**: Leverages TypeScript's type system to ensure only valid `subPath` strings are used, enhancing developer experience with accurate Intellisense suggestions.

  ### 4. Enhanced `getNestedLocator()` Method

  #### Purpose

  The `getNestedLocator()` method has been updated to utilize valid `subPath`'s of `LocatorSchemaPath` instead of numeric indices when specifying `.nth(n)` occurrences within a locator chain. The old index-based method is deprecated and will be removed in version 2.0.0.

  #### New Method Signature

  ```typescript
  getNestedLocator(
    subPathIndices?: { [K in SubPaths<LocatorSchemaPathType, LocatorSubstring>]: number | null }
  ): Promise<Locator>
  ```

  #### Deprecation of Old Method

  - **Old `getNestedLocator(indices?: { [key: number]: number | null }): Promise<Locator>`**

  This method is marked as deprecated and will be removed in version 2.0.0.

  #### Usage Examples

  **Old Usage (Deprecated):**

  ```typescript
  const saveBtn = await profile.getNestedLocator(
    "content.region.details.button.save",
    { 4: 2 }
  );

  const editBtn = await profile
    .getLocatorSchema("content.region.details.button.edit")
    .getNestedLocator({ 2: index });
  ```

  **New Usage:**

  ```typescript
  const saveBtn = await profile.getNestedLocator(
    "content.region.details.button.save",
    {
      "content.region.details.button.save": 2,
    }
  );

  const editBtn = await profile
    .getLocatorSchema("content.region.details.button.edit")
    .getNestedLocator({ "content.region.details": index });
  ```

  #### Benefits

  - **Improved Readability**: SubPath-based indexing is more intuitive and aligns with the hierarchical nature of locator paths.
  - **Enhanced Maintainability**: Reduces confusion and manual updates when `LocatorSchemaPath` strings are modified.
  - **Type Safety and Intellisense**: TypeScript provides accurate suggestions for valid `subPath` keys, enhancing the developer experience and reducing errors.

  ### 5. Export of `LocatorSchemaWithoutPath`

  #### Purpose

  The `LocatorSchemaWithoutPath` type is now exported through `index.ts`, enabling full or partial reuse of `LocatorSchema` definitions across different `addSchema` calls within the same or different `initLocatorSchemas` functions.

  #### Usage Example

  ```typescript
  import { GetByMethod, LocatorSchemaWithoutPath } from "pomwright";
  import { missingInputError } from "@common/page-components/errors.locatorSchema.ts";

  export type LocatorSchemaPath =
    | "body"
    | "body.main"
    | "body.main.section"
    | "body.main.section@products"
    | "body.main.section@userInfo"
    | "body.main.section@userInfo.input@email"
    | "body.main.section@userInfo.inputError"
    | "body.main.section@deliveryInfo";

  export function initLocatorSchemas(
    locators: GetLocatorBase<LocatorSchemaPath>
  ) {
    locators.addSchema("body", {
      locator: "body",
      locatorMethod: GetByMethod.locator,
    });

    locators.addSchema("body.main", {
      locator: "main",
      locatorMethod: GetByMethod.locator,
    });

    const region: LocatorSchemaWithoutPath = {
      role: "region",
      locatorMethod: GetByMethod.role,
    };

    locators.addSchema("body.main.section", {
      ...region,
    });

    locators.addSchema("body.main.section@products", {
      ...region,
      roleOptions: { name: "Products" },
    });

    locators.addSchema("body.main.section@userInfo", {
      ...region,
      roleOptions: { name: "Contact Info" },
      filter: { hasText: /e-mail/i },
    });

    locators.addSchema("body.main.section@userInfo.input@email", {
      role: "textbox",
      roleOptions: { name: "Input your e-mail" },
      locatorMethod: GetByMethod.role,
    });

    locators.addSchema("body.main.section@userInfo.inputError", {
      ...missingInputError,
    });

    locators.addSchema("body.main.section@deliveryInfo", {
      ...region,
      roleOptions: { name: "Delivery Info" },
    });
  }
  ```

  #### Benefits

  - **Code Reusability**: Facilitates the reuse of common locator schema fragments across different contexts, reducing redundancy.
  - **Modular Definitions**: Encourages a modular approach to defining locators, enhancing organization and scalability.

  ## Deprecations

  ### 1. Deprecated `.update` and `.updates` Methods

  - **Old `.update(updates: Partial<LocatorSchemaWithoutPath>): LocatorSchemaWithMethods`**
  - **Old `.updates(indexedUpdates: { [index: number]: Partial<LocatorSchemaWithoutPath> | null }): LocatorSchemaWithMethods`**

  **Reason:**
  `.updates` relied on index-based updates, which are prone to errors and require manual maintenance, especially when `LocatorSchemaPath` strings are renamed or restructured. While the old `.update` method could only update the last LocatorSchema in the path. Confusing with multiple methods instead of just one.

  **Replacement:**
  Use the new `.update(subPath, modifiedSchema)` method, which leverages `subpath`'s of valid `LocatorSchemaPath` strings for more intuitive and maintainable updates.

  **Removal Schedule:**
  These methods are deprecated and will be removed in version 2.0.0.

  ### 2. Deprecated Old `getNestedLocator` Method

  - **Old `getNestedLocator(indices?: { [key: number]: number | null }): Promise<Locator>`**

  **Reason:**
  Index-based indexing is less readable and requires manual updates when `LocatorSchemaPath` strings change.

  **Replacement:**
  Use the updated `getNestedLocator(subPathIndices?: { [K in SubPaths<LocatorSchemaPathType, LocatorSubstring>]: number | null }): Promise<Locator>` method, which utilizes `LocatorSchemaPath` strings for indexing.

  **Removal Schedule:**
  This method is deprecated and will be removed in version 2.0.0.

  ## Migration Guide

  ### Updating `.update` and `.updates` Methods

  **Old Usage:**

  ```typescript
  const allCheckboxes = await poc
    .getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
    .updates({ 3: { locatorOptions: { hasText: /Producer/i } } })
    .getNestedLocator();
  ```

  **New Usage:**

  ```typescript
  const allCheckboxes = await poc
    .getLocatorSchema("main.products.searchControls.filterType.label.checkbox")
    .update("main.products.searchControls.filterType", {
      locatorOptions: { hasText: /Producer/i },
    })
    .getNestedLocator();
  ```

  ### Updating `getNestedLocator` Method

  **Old Usage (Deprecated):**

  ```typescript
  const saveBtn = await profile.getNestedLocator(
    "content.region.details.button.save",
    { 4: 2 }
  );

  const editBtn = await profile
    .getLocatorSchema("content.region.details.button.edit")
    .getNestedLocator({ 2: index });
  ```

  **New Usage:**

  ```typescript
  const saveBtn = await profile.getNestedLocator(
    "content.region.details.button.save",
    {
      "content.region.details.button.save": 2,
    }
  );

  const editBtn = await profile
    .getLocatorSchema("content.region.details.button.edit")
    .getNestedLocator({ "content.region.details": index });
  ```

  ### Utilizing `LocatorSchemaPath` Instead of Indices

  Transition from index-based to `LocatorSchemaPath`-based indexing to improve code readability and maintainability.

  **Old Example:**

  ```typescript
  const allCheckboxes = await poc
    .getLocatorSchema("main.form.item.checkbox")
    .updates({ 3: { locatorOptions: { hasText: /Producer/i } } })
    .getNestedLocator();
  ```

  **New Example:**

  ```typescript
  const allCheckboxes = await poc
    .getLocatorSchema("main.form.item.checkbox")
    .update("main.form.item", { locatorOptions: { hasText: /Producer/i } })
    .getNestedLocator();
  ```

  ## Example in Context

  ### Defining a LocatorSchema with `filter` and Using `.addFilter()`

  ```typescript
  // Defining LocatorSchemas
  this.locators.addSchema("body.main.section@userInfo", {
    role: "region",
    roleOptions: { name: "Contact Info" },
    filter: { hasText: /e-mail/i },
    locatorMethod: GetByMethod.role,
  });

  // Dynamically adding additional filters using `.addFilter()`
  const specificSection = await poc
    .getLocatorSchema("body.main.section@userInfo")
    .addFilter("body.main.section@userInfo", { hasText: "Additional Services" })
    .getNestedLocator();
  ```

  ### Updating LocatorSchemas with the New `.update()` Method

  ```typescript
  const editBtn = await profile
    .getLocatorSchema("content.region.details.button.edit")
    .update("content.region.details.button.edit", {
      roleOptions: { name: "new accessibility name" },
    })
    .getNestedLocator();
  ```

  ### Reusing LocatorSchemas with `LocatorSchemaWithoutPath`

  ```typescript
  import { GetByMethod, LocatorSchemaWithoutPath } from "pomwright";
  import { missingInputError } from "@common/page-components/errors.locatorSchema.ts";

  export type LocatorSchemaPath =
    | "body"
    | "body.main"
    | "body.main.section"
    | "body.main.section@products"
    | "body.main.section@userInfo"
    | "body.main.section@userInfo.input@email"
    | "body.main.section@userInfo.inputError"
    | "body.main.section@deliveryInfo";

  export function initLocatorSchemas(
    locators: GetLocatorBase<LocatorSchemaPath>
  ) {
    locators.addSchema("body", {
      locator: "body",
      locatorMethod: GetByMethod.locator,
    });

    locators.addSchema("body.main", {
      locator: "main",
      locatorMethod: GetByMethod.locator,
    });

    const region: LocatorSchemaWithoutPath = {
      role: "region",
      locatorMethod: GetByMethod.role,
    };

    locators.addSchema("body.main.section", {
      ...region,
    });

    locators.addSchema("body.main.section@products", {
      ...region,
      roleOptions: { name: "Products" },
    });

    locators.addSchema("body.main.section@userInfo", {
      ...region,
      roleOptions: { name: "Contact Info" },
      filter: { hasText: /e-mail/i },
    });

    locators.addSchema("body.main.section@userInfo.input@email", {
      role: "textbox",
      roleOptions: { name: "Input your e-mail" },
      locatorMethod: GetByMethod.role,
    });

    locators.addSchema("body.main.section@userInfo.inputError", {
      ...missingInputError,
    });

    locators.addSchema("body.main.section@deliveryInfo", {
      ...region,
      roleOptions: { name: "Delivery Info" },
    });
  }
  ```

  ## Notes

  - **Filter Application Order:**
    The `filter` property in `LocatorSchema` is always applied first, followed by any filters added via `.addFilter()`. This ensures that predefined filters have priority over dynamically added ones.

  - **Exclusion of `frameLocator`:**
    The `filter` property does not apply to `frameLocator` locators. If you need to filter within frames, use the appropriate Playwright frame methods.

  - **Type Safety and Intellisense:**
    The new `.update()` and enhanced `getNestedLocator()` methods leverage TypeScript's type system to provide accurate Intellisense suggestions, enhancing developer experience and reducing errors.

  ## Conclusion

  These enhancements to `LocatorSchema` and its associated methods significantly improve the flexibility, readability, and maintainability of locator management within your POMs. By adopting the new `filter` property, `.addFilter()` method, and updated `.update()` & `getNestedLocator()` methods, you can construct more precise and adaptable locators, facilitating robust and scalable test automation.

  **Note:**
  Ensure to migrate away from the deprecated `.update`, `.updates`, and old `getNestedLocator` methods before upgrading to version 2.0.0 to maintain compatibility and leverage the full benefits of these enhancements.

## 1.1.1

### Patch Changes

- [#29](https://github.com/DyHex/POMWright/pull/29) [`14b9bff`](https://github.com/DyHex/POMWright/commit/14b9bff99ec337a4d8b8940c9904620892faae3a) Thanks [@DyHex](https://github.com/DyHex)! - Exports ExtractFullUrlType, updates devDeps and adds additional keywords

## 1.1.0

### Minor Changes

- [#27](https://github.com/DyHex/POMWright/pull/27) [`ab778b2`](https://github.com/DyHex/POMWright/commit/ab778b268fcc77c03289f24617efa74518dcbe12) Thanks [@DyHex](https://github.com/DyHex)! - **Added optional support for dynamic URL types (`string` and/or `RegExp`) for `baseUrl` and `urlPath` via an options-based approach.**

  - **WHAT**: This update allows `baseUrl` and `urlPath` to be defined as either `string` or `RegExp` using `BasePageOptions`. The `fullUrl` is automatically inferred based on the types of `baseUrl` and `urlPath`. If either `baseUrl` or `urlPath` is a `RegExp`, `fullUrl` will also be a `RegExp`.

  - **WHY**: This change provides flexibility for handling dynamic URLs, such as those containing variables or patterns. It allows validating URLs that follow a predictable format but may have dynamic values that are not known before navigation.

  - **HOW**:
    - No changes are required for existing implementations since `string` remains the default type.
    - To use `RegExp` for `baseUrl` or `urlPath`, define them explicitly in the POC using `BasePageOptions`, which will automatically infer `fullUrl`.
    - **Note**: POCs using `RegExp` for `baseUrl` or `urlPath` cannot use `page.goto(fullUrl)` since it requires a `string`. Instead, methods like `page.waitForURL()`, which accept `RegExp`, can be used to validate navigation. This feature is ideal for scenarios where URL values are dynamic and can only be validated by format.

  # Examples

  ## Example: Abstract Base Class extending BasePage without BasePageOptions (default, same as prior versions)

  ```ts
  import { type Page, type TestInfo } from "@playwright/test";
  import { BasePage, PlaywrightReportLogger } from "pomwright";
  // import helper methods / classes etc, here... (To be used in the Base POC)

  export default abstract class Base<
    LocatorSchemaPathType extends string
  > extends BasePage<LocatorSchemaPathType> {
    // add properties here (available to all POCs extending this abstract Base POC)

    constructor(
      page: Page,
      testInfo: TestInfo,
      urlPath: string,
      pocName: string,
      pwrl: PlaywrightReportLogger
    ) {
      super(page, testInfo, "http://localhost:8080", urlPath, pocName, pwrl);

      // initialize properties here (available to all POCs extending this abstract Base POC)
    }

    // add helper methods here (available to all POCs extending this abstract Base POC)
  }
  ```

  ## Example: POC extending abstract Base Class without BasePageOptions (default, same as prior versions)

  ```ts
  import { type Page, type TestInfo } from "@playwright/test";
  import { PlaywrightReportLogger } from "pomwright";
  import Base from "../base/base.page";
  import {
    type LocatorSchemaPath,
    initLocatorSchemas,
  } from "./testPage.locatorSchema";

  export default class TestPage extends Base<LocatorSchemaPath> {
    constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
      super(page, testInfo, "/", TestPage.name, pwrl);
    }

    protected initLocatorSchemas() {
      initLocatorSchemas(this.locators);
    }

    // add your helper methods here...
  }
  ```

  ## Example: Abstract Base Class extending BasePage with BasePageOptions, allows urlPath type as string xOR RegExp

  ```ts
  import { type Page, type TestInfo } from "@playwright/test";
  import {
    BasePage,
    type BasePageOptions,
    type ExtractUrlPathType,
    PlaywrightReportLogger,
  } from "pomwright";

  // BaseWithOptions extends BasePage and enforces baseUrlType as string
  export default abstract class BaseWithOptions<
    LocatorSchemaPathType extends string,
    Options extends BasePageOptions = {
      urlOptions: { baseUrlType: string; urlPathType: string };
    }
  > extends BasePage<
    LocatorSchemaPathType,
    {
      urlOptions: {
        baseUrlType: string;
        urlPathType: ExtractUrlPathType<Options>;
      };
    }
  > {
    constructor(
      page: Page,
      testInfo: TestInfo,
      urlPath: ExtractUrlPathType<{
        urlOptions: { urlPathType: ExtractUrlPathType<Options> };
      }>, // Ensure the correct type for urlPath
      pocName: string,
      pwrl: PlaywrightReportLogger
    ) {
      // Pass baseUrl as a string and let urlPath be flexible
      super(page, testInfo, "http://localhost:8080", urlPath, pocName, pwrl);

      // Initialize additional properties if needed
    }

    // Add any helper methods here, if needed
  }
  ```

  ## Example: POC extending abstract Base Class with BasePageOptions, but uses defaults (type string)

  ```ts
  import {
    type LocatorSchemaPath,
    initLocatorSchemas,
  } from "@page-object-models/testApp/without-options/pages/testPage.locatorSchema"; // same page & same locator schema as above
  import { type Page, type TestInfo } from "@playwright/test";
  import { PlaywrightReportLogger } from "pomwright";
  import BaseWithOptions from "../base/baseWithOptions.page";

  // Note, if BasePageOptions aren't specified, default options are used
  export default class TestPage extends BaseWithOptions<LocatorSchemaPath> {
    constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
      super(page, testInfo, "/", TestPage.name, pwrl);
    }

    protected initLocatorSchemas() {
      initLocatorSchemas(this.locators);
    }

    // add your helper methods here...
  }
  ```

  ## Example: POC extending abstract Base Class with BasePageOptions, and defines urlPath type as RegExp

  ```ts
  import { test } from "@fixtures/withOptions";
  import BaseWithOptions from "@page-object-models/testApp/with-options/base/baseWithOptions.page";
  import { type Page, type TestInfo, expect } from "@playwright/test";
  import { PlaywrightReportLogger } from "pomwright";
  import {
    type LocatorSchemaPath,
    initLocatorSchemas,
  } from "./color.locatorSchema";

  // By providing the urlOptions, the urlPath property now has RegExp type instead of string type (default) for this POC
  export default class Color extends BaseWithOptions<
    LocatorSchemaPath,
    { urlOptions: { urlPathType: RegExp } }
  > {
    constructor(page: Page, testInfo: TestInfo, pwrl: PlaywrightReportLogger) {
      /**
       * Matches "/testpath/randomcolor/" followed by a valid 3 or 6-character hex color code.
       */
      const urlPathRegex = /\/testpath\/([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

      super(page, testInfo, urlPathRegex, Color.name, pwrl);
    }

    protected initLocatorSchemas() {
      initLocatorSchemas(this.locators);
    }

    async expectThisPage() {
      await test.step("Expect color page", async () => {
        await this.page.waitForURL(this.fullUrl);

        const heading = await this.getNestedLocator("body.heading");
        await heading.waitFor({ state: "visible" });
      });
    }

    // add your helper methods here...
  }
  ```

  # Summary of Changes

  - **Dynamic URL Support**: You can now define `baseUrl` and `urlPath` as `RegExp` for dynamic URL handling.
  - **Backward Compatibility**: No changes are required for existing implementations using `string`.
  - **Restructuring of tests**: Unit tests moved from ./src to ./test, integration tests moved from ./test to ./intTest
  - **New unit tests**: To cover optional-dynamic-url-types (string xOR RegExp)
  - **New integration tests with Playwright/test**: To cover optional-dynamic-url-types (string xOR RegExp)
  - **peerDependencies change**: Bumped minimum Playwright/test version from 1.39.0 to 1.41.0 as everything below 1.41.0 is deprecated. Also excluded v. 2.x.x as they have known bugs for chaining of locators. Limited max version to <2.0.0

  Changes have additionally been tested with two seperate playwright/test projects (130+ E2E tests) without issues, and against the latest Playwright/test versions.

## 1.0.2

### Patch Changes

- [#25](https://github.com/DyHex/POMWright/pull/25) [`993b0ad`](https://github.com/DyHex/POMWright/commit/993b0adc0f437c2c30b436ef6583a59811e0a6a5) Thanks [@DyHex](https://github.com/DyHex)! - # Change

  buildNestedLocator will no longer attempt to auto-scroll to the final nested locator

  Was done previously in an attempt to improve test recordings, but it sometimes causes tearing in screenshots and isn't ideal when using nested locators for visual regression tests.

  ## Playwright/test compatibility

  Tested with the following Playwright/test versions:

  - 1.43.1
  - 1.43.0
  - 1.42.1
  - 1.42.0 (not recommended)
  - 1.41.2
  - 1.41.1
  - 1.41.0
  - 1.40.1
  - 1.40.0
  - 1.39.0

## 1.0.1

### Patch Changes

- [#23](https://github.com/DyHex/POMWright/pull/23) [`0cfc19f`](https://github.com/DyHex/POMWright/commit/0cfc19f057575365853f9df41bbd661bf45172e2) Thanks [@DyHex](https://github.com/DyHex)! - # Continuous testing & bug fixes

  ## Bug fixes

  - getLocatorBase.applyUpdate() now correctly updates the LocatorSchemaWithMethod and maintains a circular ref. for the entry representing itself in schemasMap
  - getLocatorBase.applyUpdates() now correctly updates the LocatorSchemaWithMethod and maintains a circular ref. for the entry representing itself in schemasMap while updating other LocatorSchema in SchemasMap directly.
  - getLocatorBase.deepMerge() now correctly validates valid nested properties of LocatorSchema

  ## Continuous testing

  - Build workflow now runs unit tests (vitest)
  - New shell script enabling testing new packages before release
  - New test workflow for POMWright integration tests (Playwright/test)
  - 52 new unit tests, more to come..
  - 4 new integration tests, more to come..

  New release has also been tested with a seperate Playwright/test project leveraging POMWright (~100 E2E tests)

  ## Playwright/test compatibility

  Tested with the following Playwright/test versions:

  - 1.43.1
  - 1.43.0
  - 1.42.1
  - 1.42.0 (not recommended)
  - 1.41.2
  - 1.41.1
  - 1.41.0
  - 1.40.1
  - 1.40.0
  - 1.39.0

## 1.0.0

### Major Changes

- 130784f: BREAKING: The following index.ts exports have been renamed:

  - "POMWright" changed to "BasePage"
  - "POMWrightTestFixture" changed to "test"
  - "POMWrightLogger" changed to "PlaywrightReportLogger"
  - "POMWrightGetLocatorBase" changed to "GetLocatorBase"
  - "POMWrightApi" changed to "BaseApi"

  Documentation updated

  README updated

## 0.0.9

### Patch Changes

- 7e8b7d1: removes an abstract method from POMWright/BasePage which should have been removed previously

## 0.0.8

### Patch Changes

- 0d4924e: adds additional inforamtion to package.json and shields in readme

## 0.0.7

### Patch Changes

- 5b7ed8a: Update README

## 0.0.6

### Patch Changes

- 8c2af7d: fix: ensure base fixture log follows playwright's api

## 0.0.5

### Patch Changes

- 0c96ab7: Add Biome for linting and formatting
- 0c96ab7: Move indices with default value to the end of arguments for buildNestedLocator

## 0.0.4

### Patch Changes

- f2fea3b: add codeowners

## 0.0.3

### Patch Changes

- fa2a954: adds release script to package.json

## 0.0.2

### Patch Changes

- 1e5433a: Adds changeset to repository
