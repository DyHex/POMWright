# pomwright

## 3.0.2

### Patch Changes

- [#60](https://github.com/DyHex/POMWright/pull/60) [`e231dc2`](https://github.com/DyHex/POMWright/commit/e231dc2166ffcc224b3c899239795279b6bb19f5) - Overlapping session storage calls on an `about:blank` page that inherited an origin, such as a popup from `window.open()`, act in the order they were made, also when one comes from a page object's helper and another from a standalone one; before, the earlier value could win.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`80cb5ea`](https://github.com/DyHex/POMWright/commit/80cb5eaeaca0f3d681dddb51bda4c745ff950be3) - A page object whose `defineLocators()` returns a Promise, as an `async` one does, fails with a labeled error saying it must register synchronously; before, it was verified before the rest of its definition ran, and an error after its first `await` escaped unlabeled. Move awaited work into the fixture and pass the result to the constructor.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`e8831b8`](https://github.com/DyHex/POMWright/commit/e8831b8a511e0aaf22b9e5a27c49a20f43381f77) - Every session storage call checks the page's origin before and after each storage call it makes, and after each that the page's document is still the one it started in: a batch (`set`, `clear` with several keys, a `seed` on the origin already), a single call, and each read of `get`. When the page has left for another origin, or its document was replaced during the call (a reload or a redirect within the origin, during one of its storage calls or between two), the call fails with the helper's label, says where the page went (its origin and path, without the query or fragment), and names the keys already done, which stay, and the one in flight, which may have reached the new document:
  `Shop.SessionStorage.set: the page navigated to https://shop.example/home while set() was writing to https://shop.example; 2 of 60 keys were written ("k0", "k1"); "k2" was being written and may have reached the new document`.
  A `get` fails rather than return what it may have read from the new document. Before, a navigation between two calls that both succeeded let the rest of a batch write into, or remove from, the other origin's storage, and a call the navigation interrupted failed with Playwright's raw `Execution context was destroyed`. Any other error from Playwright now gets the helper's label in front of its message, with the original as `cause`.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`333a928`](https://github.com/DyHex/POMWright/commit/333a9282580d7c7f7336f5c9cc18abced2818ac8) - `@step({ box: true })` reports the step, and an error thrown inside it, at the line that called the method, as the docs
  said. Before, a boxed step called from a test had no location and its error lost every stack frame, and one called from
  another method was reported one frame too far out. A boxed step inside another boxed step, a boxed `@step` or
  a test's own boxed `test.step`, was reported inside POMWright's bundle; boxed `@step` methods and the navigation and
  session storage helpers now pass `test.step` the line that called them as its `location`, so they are reported there
  however they are nested. An error in a nested boxed step keeps Playwright's rule: it is reported at the outermost boxed
  call. `@step` without `box` was right and is unchanged, and so is how `@step` is written.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`b1ee8dc`](https://github.com/DyHex/POMWright/commit/b1ee8dcc42e62fc3e2f72f0f03ef9ffd727d7a41) - An `update()` or `replace()` builder taken before `skip()` now throws when it applies its change to the skipped segment,
  as `update()` and `replace()` on a skipped segment already did. A skipped segment is never changed until `unskip()`:
  
  ```ts
  const query = getLocatorSchema("main.list.item");
  const pending = query.update("main.list");
  query.skip("main.list");
  pending.locator("ol"); // update() cannot apply to "main.list": it is skipped in this query; call unskip("main.list") first.
  ```
  
  Before, the change went through silently and appeared after `unskip()`.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`27f8d12`](https://github.com/DyHex/POMWright/commit/27f8d1231d578330deea1528e67d3f39ff30419e) - `goto(target)` names the page object when the target cannot be resolved against its `baseUrl`, as every other navigation message does: `LoginPage: goto("http://") cannot be resolved against baseUrl "https://shop.example"`, with the URL parser's error as `cause`. Before, the message had no label.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`54cdada`](https://github.com/DyHex/POMWright/commit/54cdada37cd50c0b1759f6bfc6e10111507e2056) - On Node 20 and 22, a string `urlPath` containing `^` matches the page: `expectThisPage()` finds it, and
  `expectAnotherPage()` no longer passes while the browser is still on it. Every browser reports a `^` in the path as
  `%5E`, as `new URL` does on Node 24, but Node 20 and 22's `new URL` keeps it, so the two never compared equal there.
  A string path now treats `^` and `%5E` in its path part as one, as it already did `|` and `%7C`, and a string `fullUrl`
  writes a `^` in its path as `%5E`, so `expect(page).toHaveURL(fullUrl)` matches on every Node version. For a path with
  `|`, which Chromium reports as `%7C`, use `expectThisPage()`, which matches on every browser.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`7f90436`](https://github.com/DyHex/POMWright/commit/7f90436f125b6e8cab3a1f0206017f3e06595fc9) - A function that returns `createRegistryWithAccessors()`'s result, its `add`, a page object's `add`, `registry.add` or `registry.createReusable` can be exported from a project built with `declaration: true`; before, the emit failed with TS4023 and TS4094. `createReusable`'s type is exported as `ReusableLocatorFactory`.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`ea330ef`](https://github.com/DyHex/POMWright/commit/ea330ef47a19b48b6b52fcf34a0f6ef64354a6fd) - A stored value that its codec cannot decode makes `get` fail with the codec's reason in the message, then the value's
  length and the whole value, quoted, so an empty or whitespace value shows:
  `Shop.SessionStorage.get: value for "user" could not be decoded (SyntaxError: …); stored value, 9 characters: "{not json"`.
  Before, the reason was only in the error's `cause`, and the value followed unquoted.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`c75ab43`](https://github.com/DyHex/POMWright/commit/c75ab43f1c6ad27e2c97e70890d47b54d0f17917) - `expectThisPage()` and `expectAnotherPage()` treat a URL with an empty query or fragment (`/orders?`, `/orders#`) as a
  different URL from `/orders`, as Playwright's `toHaveURL` and `waitForURL` do and as the docs said ("a page's identity
  is its exact URL").
  
  The matcher compared the path against `pathname + search + hash`, where the URL API reports an empty query or fragment
  as `""`, so `expectThisPage()` passed on `/orders?` while `expect(page).toHaveURL(ordersPage.fullUrl)` failed. A RegExp
  path is now tested against the same rest of the URL, the empty `?` or `#` included.
  
  If a page of yours may land with an empty query or fragment, give it a RegExp path that allows one, for example
  `/^\/orders\??$/`.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`a6ecacf`](https://github.com/DyHex/POMWright/commit/a6ecacfb50a6edad7b0ef79250bddf34b634a252) - `seed({})`, for example from entries that turn out to be empty at run time, does nothing, as `get([])` and `clear([])`
  with an empty list already did. Before, it registered a seed without keys, and a test that never went to that origin
  failed at close with "the seed for … (keys: ) was never applied".

- [#60](https://github.com/DyHex/POMWright/pull/60) [`2accf34`](https://github.com/DyHex/POMWright/commit/2accf3492b48d072a8629c04d69bc98371ed18aa) - The error for a registration that has ended names the registry call that ended it. When that call may have run in the
  arguments of `filter` or the options of `locator`, the two methods that take a `has` locator, the message also shows how
  to write it.
  
  A registration ends at the next call on its registry, and JavaScript runs a call's arguments before the call, so a
  `getLocator` inside a filter's arguments ends the registration the filter belongs to:
  
  ```ts
  add("list.item@open").getByRole("listitem").filter({ has: getLocator("badge") });
  ```
  
  ```text
  filter() cannot apply to "list.item@open": its registration was ended by getLocator("badge"). If that call is in this filter's arguments, which run first, resolve the locator before add(…), or pass a path, which resolves to that path's own locator: filter({ has: "badge" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
  ```
  
  In `locator()`'s options the path goes in a `filter` step, and a query in the arguments (`getLocatorSchema(…)`) gets
  the advice to resolve it before `add(…)`, without the path, which would drop the query's changes:
  
  ```text
  locator() cannot apply to "section@inline": its registration was ended by getLocator("heading@explorer"). If that call is in this locator's options, which run first, resolve the locator before add(…), or filter by a path in a step: .filter({ has: "heading@explorer" }). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
  filter() cannot apply to "section@inline": its registration was ended by getLocatorSchema("heading@explorer"). If that query is in this filter's arguments, which run first, resolve it before add(…). Otherwise, give a registration all its steps in its add(…) chain, or query the path for one use.
  ```
  
  Before, the message said only that the registration had ended and to give it all its steps in its `add(…)` chain,
  which is what that line does. Every other ended registration now names its call too, for example
  `its registration was ended by add("main.list.item")`. The rule itself is unchanged. *Filters and indices* has a new
  section on passing a path, a locator or a chain to `has`.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`7447754`](https://github.com/DyHex/POMWright/commit/744775468eb8b43498ec9cb798a730163bf6b98e) - `AllEntries`, `Decoded`, `SeedOptions` and `SessionStorageOptions` are exported from `pomwright`, so a consumer can name
  what `get` returns and the options of `seed` and of `new SessionStorage()`. The docs say every type is imported from
  `pomwright`; these four were used in public signatures but not exported. Each has a section on the `SessionStorage` API
  page, marked as added in 3.0.2.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`2bab383`](https://github.com/DyHex/POMWright/commit/2bab38388245f9e4de83f434271e8a33f3e228e9) - The package's `exports` map has a `default` condition after `import` and `require`, pointing at the CommonJS build, as
  `@playwright/test`'s map does. Node and TypeScript always matched `import` or `require`, so nothing changes for them; a
  resolver that matches neither now finds the package instead of failing.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`f46b982`](https://github.com/DyHex/POMWright/commit/f46b9824db95f0476814d7413901336ba50fd1e7) - A locator method that throws because its path is registered already leaves the registration as it was, so calling it
  again reports the same error, not "has already been provided":
  
  ```text
  A locator schema with the path "main" already exists.
  ```
  
  Before, the registration took the definition before the registry refused it, so a second call said
  `A locator definition for "main" has already been provided; only one locator type can be set for a registration.`
  for a locator that was never registered.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`4e3a361`](https://github.com/DyHex/POMWright/commit/4e3a361c7ee0ee441c001db28c77e4884b11b5f0) - `getById` with a `u` or `v` RegExp that holds a quote, an apostrophe, a backtick or `>>` finds its element; before, it
  failed with Playwright's selector parse error. The selector writes those characters by their code (`\x22`, `\x27`,
  `\x60`, and `\x3e` for the second `>`), and the pattern stays the same. Without `u` or `v`, a RegExp with two quotes in
  a row (`/say["']hi/`) or a named group closed right before a `>` (`/(?<g>>)>/`) failed the same way, and one with `\>`
  before a `>` (`/a\>>b/`) was turned into another pattern: the pattern is now read whole, its escapes included. The
  locators Playwright builds itself (`getByRole`'s `name`, the text methods, `getByTestId`, `filter`'s `hasText`) keep
  Playwright's limitations, which every POMWright locator meets because its description follows it: write the character
  by its code (`/don\x27t save/iu`, `/don["\x27]t save/i`), or leave out `u`
  ([microsoft/playwright#40446](https://github.com/microsoft/playwright/issues/40446)); *Registering locators* lists them.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`088f46c`](https://github.com/DyHex/POMWright/commit/088f46ce98f009cfc0476ade090f65247d1fb836) - On a page object whose `baseUrl` is a RegExp, `goto(target)` no longer compiles for a relative target that holds a
  colon (`"/orders?at=12:00"`, `"?at=12:00"`, `"1:2"`), which it always rejected at run time: the target's type now
  requires a scheme that starts with a letter. A `string` that holds a URL narrows with a cast,
  ``goto(url as `https://${string}`)``.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`fa424ad`](https://github.com/DyHex/POMWright/commit/fa424ad1d537449d40fcee7eb34c9d647f8c5d34) - From JavaScript, `navigation.goto()` with a `URL` object, or any first argument that is neither a URL string nor
  options, throws as Playwright's `page.goto()` does:
  
  ```text
  LoginPage: goto() takes a URL string or options; received a URL object; pass its href.
  ```
  
  Before, it took the `URL` object for the options of the this-page form and navigated to the page object's own URL,
  running its actions after navigation. TypeScript already rejected the call.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`d4cffbb`](https://github.com/DyHex/POMWright/commit/d4cffbb2e4889918433824226f44f646bc323798) - A `SessionStorage` with an origin (every page object's) now also refuses to touch another origin on a page at
  `about:blank` whose document inherited that origin, as a popup from `window.open()` does:
  `… the page (about:blank) is on https://login.example, not on this page object's origin https://shop.example; …`.
  Before, the check saw no origin in the URL and let the helper write into the inherited origin's storage.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`9bcf72e`](https://github.com/DyHex/POMWright/commit/9bcf72eeab868e068b268b025d926e9eaea9dca5) - A query kept while an ancestor of its path is registered says that the ancestor was registered after the query was
  taken, and how to see it, instead of that it has no locator schema:
  
  ```text
  "shell.list" is not a valid sub-path of "shell.list.item". It is a segment of that path, and it was registered after this query was taken; take a new query with getLocatorSchema("shell.list.item") to use it.
  ```
  
  The query's behavior is unchanged: it reads its own copy of the chain, taken at `getLocatorSchema`.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`4f80b37`](https://github.com/DyHex/POMWright/commit/4f80b371e619f9eafd86a602fd47b7f605847cf2) - Bare `@step` compiles with `experimentalDecorators: true`, as `@step()` already did and as the docs promised. Before, it
  failed with TS1241 and TS1270, although it worked at runtime. A method that does not return a Promise still gets the
  readable error, `@step decorates methods that return a Promise: make the method async`, in both decorator modes.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`b28686b`](https://github.com/DyHex/POMWright/commit/b28686bc60f0449c9d7b2378ed165805a43ebd14) - The `log` fixture checks Playwright's `locale` and `timezoneId` when a test starts and fails with a message naming the value, such as `log fixture: locale "en_US" is not a BCP 47 language tag; write it with hyphens, such as "en-US"`, instead of a `RangeError` at teardown once something was logged. `attachLogsToTest` checks the same before it attaches anything. A test that requests `log`, never logs and runs with `locale: "en_US"` now fails too: write the tag with hyphens, which every browser accepts. A POSIX name such as `en_US.UTF-8`, as `LANG` holds it, gets the hint `"en-US"`; one with a modifier, such as `sr_RS@latin`, gets none, since the modifier can change the script.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`2d2c504`](https://github.com/DyHex/POMWright/commit/2d2c504f93392d12e876e0cb71d719389a9fc4cc) - A path literal of any length compiles; one of 999 characters or more failed with TS2589. A path that breaks several
  rules now names all of them, in the same order at compile time and at run time, and checking path types is faster.
  `add(path)` throws for a path that breaks a rule, where its locator method threw before:
  
  ```text
  LocatorSchemaPath string cannot contain whitespace chars and cannot start with a dot: .main list
  ```
  
  A path that breaks one rule keeps its message.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`bfbc00f`](https://github.com/DyHex/POMWright/commit/bfbc00f5cd2a3ed4fa5f695110fa2f210fee2e26) - An app that declares its own global `navigation` (`var navigation = …`) no longer makes `seed` fail with
  "seed() needs the Navigation API … and this browser has none". The check now tests the `NavigationActivation`
  interface, which such a declaration does not hide.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`8c8d8fb`](https://github.com/DyHex/POMWright/commit/8c8d8fb7be9ce5858c81d65862bcea7e6baf5d3a) - A RegExp page object's `navigation` is no longer accepted as `NavigationFor<string, string>`, so `goto()` without a target is a compile error there too, as the docs say; before, a function typed for a string page's helper took it, and `goto()` threw at run time. `NavigationFor` checks `goto` strictly now. A function that takes any page object's helper types its parameter `NavigationFor<RegExp, UrlMatcher>`, which every page object's helper fits.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`aa70821`](https://github.com/DyHex/POMWright/commit/aa708219844d106e43e14489d7d1f6bfdd47222a) - `expectThisPage()` and `expectAnotherPage()` say when they time out on the load state of the right URL:
  `OrdersPage: reached "https://shop.example/orders", but its "load" state did not come in time (…)`, and
  `OrdersPage: left "https://shop.example/orders" for "https://shop.example/login", but its "load" state did not come in time (…)`.
  Before, the message named the URL it found as the one it did not expect: `expected URL "…/orders"; found "…/orders"`.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`c35eae4`](https://github.com/DyHex/POMWright/commit/c35eae4af73ba37fd1b6438620ac9fcf3cd33c7f) - When seeds for several origins are never applied, the failure says "were never applied" and lists each seed with its helper and the line that called it, such as `Pay.SessionStorage.seed at tests/checkout.spec.ts:12:5, for https://pay.example (keys: "orderId")`; before, it named and pointed at the first seed only.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`9dc8048`](https://github.com/DyHex/POMWright/commit/9dc8048960b4c684e6d6d6bf6e76426bdd2e7bae) - Options, filters and `update()` patches given as a class instance, or as an object with a prototype, keep the values
  Playwright would read from them: a getter on the class, or a value the object inherits. Before, the copy POMWright
  stores took only the object's own enumerable properties and dropped those values without an error, so the locator could match
  more than Playwright's own call with the same object:
  
  ```ts
  class SaveButton {
    get name() {
      return "Save";
    }
  }
  
  page.getByRole("button", new SaveButton());     // the Save button
  add("save").getByRole("button", new SaveButton()); // was every button; now the Save button
  ```
  
  The same holds for an own property that is not enumerable, as `Object.defineProperty` makes one: Playwright reads it,
  and the copy keeps it.
  
  A plain object behaves exactly as before. Methods on a prototype are not copied.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`0028097`](https://github.com/DyHex/POMWright/commit/00280978b1707fb63aa9b2332a1efffaed992a2f) - A URL whose scheme has no origin in the URL standard, such as `chrome-extension://abcdef/`, `app://foo/` or
  `file://host/`, is rejected as a page object's `baseUrl` and as `SessionStorage`'s `origin`, with the origin message
  and the reason (`…; received "chrome-extension://abcdef/", whose scheme has no URL origin`). Before, `SessionStorage`
  accepted it as the origin `"null"`, so its origin check never matched and a seed for it never applied, and a page
  object failed with a message about its `urlPath`.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`445fc71`](https://github.com/DyHex/POMWright/commit/445fc7175563795ed52b2b66f7ebfd8f39abea97) - A page object's failed locator check points the report at the line that created the page object, also when it extends a base class of your own; before, it pointed at the first `super(…)` of the class chain, with a shared base class the same line for every page object.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`d710c12`](https://github.com/DyHex/POMWright/commit/d710c120cb5a364807af658a32b2797efd152736) - On Chromium, a page object whose string `urlPath` contains `|` matches its page. Chromium reports a `|` in the path as
  `%7C`, where Firefox, WebKit and `new URL` keep it, so `expectThisPage()` timed out on the page and `expectAnotherPage()`
  passed while the browser was still on it. A string path now compares the two forms as one; a RegExp path sees the URL
  as the browser reports it, as before.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`7131d3d`](https://github.com/DyHex/POMWright/commit/7131d3d32263292e63b2af320cba466424943047) - `set` and `seed` store an entry whose key is `__proto__`. Before, the entry was dropped without an error: `set` and
  `seed` resolved, and nothing was stored.
  
  ```ts
  await storage.set("__proto__", "x");          // now stored, as page.sessionStorage.setItem stores it
  await storage.set(JSON.parse(savedSnapshot)); // a snapshot with that key keeps it
  await storage.seed("__proto__", "x");         // written on arrival
  ```

- [#60](https://github.com/DyHex/POMWright/pull/60) [`8bdcd35`](https://github.com/DyHex/POMWright/commit/8bdcd35838a2e55e292e7e1f5715808970194c81) - A query's `describe()` on a path registered as `frameLocator()` without a selector throws at the call, as its
  `filter()` and `nth()` do; replace the path first:
  
  ```text
  describe() cannot apply to "anyFrame": frameLocator() without a selector has no element to filter, index or describe; resolve a path inside it.
  ```
  
  Before, `describe()` then `replace()` worked while `filter()` then `replace()` threw, so the query's behavior depended
  on the order of its calls.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`e37a039`](https://github.com/DyHex/POMWright/commit/e37a039e305e147e1cb5cc1f07102a313c6ba0a8) - Session storage messages quote the keys they name, as `get`'s messages always did: `(keys: "orderId")` instead of
  `(keys: orderId)`, so an empty key, or one holding `, `, reads as itself. Of the released messages, those of a seed whose
  write the browser refused and of a seed that was never applied change.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`49454c6`](https://github.com/DyHex/POMWright/commit/49454c60ec050a6ee70289bd2f29ad17230436a9) - `createRegistryWithAccessors` requires its paths as a type argument. Without one, the first path is a compile error that
  says so:
  
  ```text
  Argument of type '"main"' is not assignable to parameter of type '"createRegistryWithAccessors needs its paths as a type argument: createRegistryWithAccessors<Paths>(page)"'.
  ```
  
  Before, the paths were inferred as `string`, so no path was checked and no sub-path compiled. Pass the path union,
  `createRegistryWithAccessors<Paths>(page)`, or `<string>` for paths known only at run time, which gives up completions,
  the union check and sub-paths (a literal path is still checked for the rules of a path).

- [#60](https://github.com/DyHex/POMWright/pull/60) [`ff6495e`](https://github.com/DyHex/POMWright/commit/ff6495eac8a3d11423cbb1c012925355ef721c49) - `add(path, { reuse })` compiles when the paths are variables: of the path union, of a template union in a loop, or wide
  strings. A literal path that reuses itself is still a compile error, and any self-reuse still throws at the call:
  
  ```ts
  for (const action of actions) {
    registry.add(`dialog.button@${action}`, { reuse: `main.toolbar.button@${action}` }); // compiles now
  }
  ```
  
  Before, a reuse was refused as "the same as registration path" whenever the registration path's type covered the reuse
  path's, whatever the values, and a union-typed `reuse` matched none of the options.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`17426a5`](https://github.com/DyHex/POMWright/commit/17426a55db46ac8ee8beb3629796a16879700df2) - On a document whose own origin is opaque, such as one served with `Content-Security-Policy: sandbox` without
  `allow-same-origin`, or the error page Firefox shows at the origin's URL after a failed navigation, `set`, `get`,
  `clear` and an on-origin `seed` fail with
  `Shop.SessionStorage.set: the document at … cannot use sessionStorage: its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: Content-Security-Policy: sandbox without allow-same-origin)`
  on every browser, also when the document's own script declares a global `origin`. Before, Chromium and WebKit said
  "the page has no origin yet … or use seed()", also from `seed`, and Firefox gave the browser's error without the
  helper's label. `seed` on a page without an origin no longer suggests `seed()`. On an `about:blank` popup whose
  document inherited its opener's origin, and once such a popup has closed, a call that fails gets Playwright's error
  with the helper's label, where it said "the page has no origin yet", for example
  `Shop.SessionStorage.set: webStorage.setItem: QuotaExceededError: The quota has been exceeded.`

- [#60](https://github.com/DyHex/POMWright/pull/60) [`e05b84d`](https://github.com/DyHex/POMWright/commit/e05b84d34f8544a4a5f5a5ccda9aa82eb92b1cb7) - A page object that passes `sessionStorage.schema` must declare its type, a `SessionStorage` given an explicit schema type must be given the schema value, and the value must hold a codec for every declared key, optional ones included, as the docs say. Before, each compiled, and the helper's types and codecs disagreed: `get` could be typed `string | null` and return an object, or the reverse.
  
  Take the type from the value, and pass that value: `PageObject<Paths, { storage: typeof schema }>` with `{ sessionStorage: { schema } }`, or `new SessionStorage(page, { schema })`, whose type comes from the value. A subclass of a base class of your own that forwards `PageObjectOptions` and has no options type parameter (`ShopPage<Paths> extends PageObject<Paths>`) cannot declare the type where the error is reported: make the base class take the options as a type parameter and pass them to `PageObject`, as *Organizing a project* shows (https://dyhex.github.io/POMWright/docs/organizing-a-project/#a-base-class-for-your-site), and declare `{ storage: typeof schema }` in the subclass.
  
  Two cases still compile: a page object that declares `storage` and passes no schema, and a schema passed through a variable with a codec its type does not declare, since TypeScript checks extra keys on object literals only; that key is then decoded by its codec while its type says a string.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`d12966a`](https://github.com/DyHex/POMWright/commit/d12966a9059bf3a0d767a11a4f3f2cd0d6b253c8) - When the page closes while `seed` is still registering (an un-awaited `seed` at the end of a test, or a page closed
  right after it), `seed` fails with its label, the origin and the keys, and the stack starts at the `seed` line:
  `Shop.SessionStorage.seed: the page closed while seed() was registering the seed for https://pay.example (keys: "orderId"); await seed() before the test ends`.
  Before, it failed with Playwright's raw `page.evaluate: Target page, context or browser has been closed` and no frame of
  the test. Any other error from the page while a seed registers also gets the label and the call site.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`5ceb13c`](https://github.com/DyHex/POMWright/commit/5ceb13c3b91e240753d33f1a963f6d4ee02475bf) - With Playwright's step overlay (`video: { show: { test } }`), a `seed` raced by a navigation to its origin (not awaited,
  or called while a `goto` is under way) fails at the call, as it does without the overlay, instead of resolving while the
  app started without the entries. `seed` now reads the page and watches for a commit from the moment it is called; the
  overlay's update ran before `seed`'s step and hid such a commit.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`819c477`](https://github.com/DyHex/POMWright/commit/819c477efee183e9122d4b7267f00d860d8d52d0) - A seed's failure found in a page listener (a refused write, a seed the arriving document skipped, a seed never applied
  when the page closes) no longer stops the page's other `console` or `close` listeners: the error is rethrown from a
  microtask, which still fails the test at once, with the `seed` line in its stack. Before, it was thrown inside
  POMWright's listener, so a listener the test added after the `seed` did not run.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`52f2d4c`](https://github.com/DyHex/POMWright/commit/52f2d4c0b1ae7e260dc09d1c18bdc0e9b88265e2) - `seed` on a popup at `about:blank` that inherited the seeded origin writes at once, as `set` does there; a later `set` is no longer overwritten when the popup navigates to the origin, and Firefox no longer fails the test. When a seed is not applied because the browser counted the arrival as a return, the message now says why: `… (navigation.activation.from is set): the document before it was already on the origin, as after a failed navigation to it`.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`a23aa0d`](https://github.com/DyHex/POMWright/commit/a23aa0d67eba4c266488ec13d9cb0f9c14fa249a) - A seed that the document arriving at its origin does not write now fails the test at the `seed` line instead of
  passing silently. After a navigation to the origin that failed (a refused connection, offline, `route.abort()`),
  Chromium counts the retry as a return to the origin, so the app started without the entries and the test went on;
  it now fails with `… was not applied: the browser counted the page's arrival on … as a return there …`. Firefox shows
  its error page at the origin's URL and failed with a refused-write message although no app had loaded; it now fails
  with `… was not applied: the document that arrived on … has an opaque origin …`. The seed script never writes into a
  browser's error page. WebKit applies the seed on the next arrival, as before. A retry is not attempted: a failed
  navigation to a seeded origin fails the test.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`53f571f`](https://github.com/DyHex/POMWright/commit/53f571f3290fc085e642900c9dc8d51b51c45178) - `seed` no longer fails when the page replaces its document more than once during its first seed's Navigation API
  check, as an app that redirects itself by script on load does (`/` to `/login` to `/login/start`). Before, such a seed
  failed with Playwright's `Execution context was destroyed`. The check is now repeated while the page replaces its
  document, up to 20 times (the default of Playwright's `maxRedirects`), each after the pause Playwright makes before a
  retry of its own actions (20 ms, rising to 500 ms); past that, Playwright's error goes through with the helper's
  label.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`b4fee4a`](https://github.com/DyHex/POMWright/commit/b4fee4a45bc3896d4d146708429bd0ffdc279fe3) - `step()` with a title or options returns a decorator whose type is exported from `pomwright`, `StepDecorator`. A module can export a preconfigured decorator, such as `export const boxedStep = step({ box: true })`, and still build with `declaration: true`; before, the emit failed with TS4023.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`ea94410`](https://github.com/DyHex/POMWright/commit/ea944101f2dc5ca1535731db8ad5f7e7d52d502c) - `@step` compiles on generic `async` methods, with standard decorators and with `experimentalDecorators`, and the method keeps its type parameters; before, TypeScript refused them, and under `experimentalDecorators` asked to make the already `async` method `async`. A generic method that does not return a Promise is still refused with `@step decorates methods that return a Promise: make the method async`.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`2e15291`](https://github.com/DyHex/POMWright/commit/2e15291fd0feacf361b0d6106d7b3933a2abc735) - `@step` on a method that returns a plain value now throws at run time too (from JavaScript), with the compile error's message, `@step decorates methods that return a Promise: make the method async`; before, the method silently returned a Promise.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`d807acb`](https://github.com/DyHex/POMWright/commit/d807acbf725a691bec76230ecd3d9e4cf11a5ffa) - A `@step` method called without its object, for example passed as a callback (`items.map(cart.addItem)`), runs as an
  undecorated method does: titled with its own title, or `Anonymous.<method>` without one. Before, it threw
  `TypeError: Cannot read properties of undefined (reading 'constructor')` before the method ran, even with a title of
  its own.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`34c2ec0`](https://github.com/DyHex/POMWright/commit/34c2ec0d0c03d51b6471ffaeb7eb1e558a4428ec) - Session storage calls for one origin act in the order they were made, also when they overlap: on the origin the page is
  on as well as before a hop, and for `set`, `get` and `clear` as well as `seed`.
  
  3.0.1 made overlapping `seed` calls for an origin the page is not on merge in call order. On the origin the page is
  already on, `seed` still wrote key by key, and two overlapping calls interleaved, so an earlier value could win:
  
  ```ts
  await page.goto("https://shop.example/account");
  await Promise.all([storage.seed({ first: "1", shared: "earlier" }), storage.seed({ shared: "later" })]);
  // shared was "earlier"; it is now "later"
  ```
  
  `set`, `get` and `clear` interleaved the same way. Every call now takes its turn per page and origin, across every
  helper on the page (a page object's and a standalone one), so overlapping calls end exactly as awaited ones do. A call
  that waited checks the origin again when its turn comes. A helper with an origin throws the usual origin message if the
  page has left it; a helper without one fails, and does nothing, if the page has left the origin the call was made on,
  rather than act on an origin it was not called on:
  `Shop.SessionStorage.set: the page left https://shop.example for https://login.example while set() waited for its turn; the call did nothing`.
  A call takes its arguments when it is made, as Playwright's calls do: before, `set` and `seed` encoded their values in
  their step, and `get` and `clear` read their key lists in their turn, so a value or a list changed after the call, while
  it waited, changed what it did. Awaited calls behave as before.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`adffd1e`](https://github.com/DyHex/POMWright/commit/adffd1e68eeb269f4a6db3be3d766977b2f6c664) - Writing a value that is not a string to a key without a codec now says where codecs are declared:
  
  ```text
  Shop.SessionStorage.set: value for "user" is not a string and no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)
  ```
  
  A page object declares its storage schema twice: the type under `storage` in its type options, and the value in the
  constructor's `sessionStorage.schema` option. The compiler now checks that a value comes with its type, but not that a
  declared type comes with its value. Without the value, the declared keys are stored and read as raw strings, and this
  message is the one place where that fails loudly. The *Session storage* page now says so.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`64cd0b7`](https://github.com/DyHex/POMWright/commit/64cd0b714e7b58f36388abc913a912717fa70864) - A session storage key whose type is not a literal is now typed by what it can be, as the docs say ("a declared key as its codec's type"): a key typed `string` or a branded string (`string & { … }`) as `string` or any declared codec's type, and a pattern such as `` `user:${string}` `` as `string` or the codecs' types of the declared keys it matches. `get(key)` and `get([key])` return that, and `set` and `seed` accept it; a union is typed member by member. Before, such a key was typed as a plain string, although a declared key returned its decoded value at run time. Literal keys, unions of literals, `get()` and a schema without codecs keep their types.
  
  Code that used such a value as a string, with a schema that has codecs, stops compiling only where the key can match a declared key: pass the literal key, type the variable as the schema's keys (`keyof typeof schema`), or narrow the value (`typeof value === "string"`).

- [#60](https://github.com/DyHex/POMWright/pull/60) [`49454c6`](https://github.com/DyHex/POMWright/commit/49454c60ec050a6ee70289bd2f29ad17230436a9) - A query's sub-path arguments accept template-literal members of the path union (the query's own path and template
  ancestors), compile on a registry typed `<string>`, where the runtime checks them, and compile again in a generic base
  class on the paths it adds: this worked in 1.x and broke in 2.0.0, and is now restored.
  
  ```ts
  type Paths = "main" | "main.orders" | `main.orders.row@${string}`;
  registry.getLocatorSchema("main.orders.row@1042").filter("main.orders.row@1042", { hasText: "Open" }); // compiles now
  
  abstract class SitePage<PagePaths extends string> extends PageObject<PagePaths | CommonPaths> {
    acceptCookiesFor(vendor: string) {
      // a sub-path on the common paths compiles in the base class again
      return this.getLocatorSchema("dialog@consent.button@accept").filter("dialog@consent", { hasText: vendor });
    }
  }
  ```
  
  A path written out stays a sub-path only where it is a segment of the chain, and a namespace that is not a declared path
  is still a compile error.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`3284aa4`](https://github.com/DyHex/POMWright/commit/3284aa4d5f143f48b1419a89747cf186fa0dee60) - Releases are published with npm Trusted Publishing: npm authenticates the GitHub Actions workflow that publishes, so the
  workflow uses no npm token, and records the provenance of each version from that workflow.
  
  3.0.0 and 3.0.1 were published without a provenance attestation, although the 3.0.0 entry said releases are published
  with npm provenance. `npm view pomwright@<version> dist --json` shows whether a version has one.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`db26390`](https://github.com/DyHex/POMWright/commit/db26390b4ead49946c09f4fde486640449e762ca) - `update()` and a seeded registration (`add(path, { reuse: seed })`) accept `undefined` as the first argument in their
  types, as they already did at runtime: it keeps the registered value, as an omitted argument does. A value that may be
  undefined can now be passed through:
  
  ```ts
  declare const role: "button" | "link" | undefined;
  getLocatorSchema("main.button@save").update().getByRole(role, { name: "Cancel" }); // compiles; undefined keeps the role
  ```
  
  A registration and `replace()` still require the first argument, as Playwright's methods do, but `frameLocator()`'s,
  whose absence is Playwright's any-frame form.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`c9c8f34`](https://github.com/DyHex/POMWright/commit/c9c8f349c83234c338c8fd5f31a38bf7557264d0) - A page object's `urlPath` must stay on its base's origin, and a `baseUrl` may not end in a bare `?` or `#`.
  
  The constructor rejected a `urlPath` that starts with `//`, which names another host, but accepted others that do the
  same once the URL standard has read them: a backslash after the first `/` (`"/\\other.example/x"`), or a tab or line
  break followed by `/` or a backslash. With such a path, `fullUrl` and `goto()` went to the other host, and
  `expectThisPage()` then failed there with a message that named the same URL as expected and found. The constructor now
  resolves the path and throws when it leaves the base's origin:
  
  ```text
  LoginPage: urlPath must be a path on the page object's origin; received "/\\login.example/account", which names the host "login.example" instead. A "/" followed by another "/" or a "\", also with a tab or line break between them, starts a host.
  ```
  
  A `baseUrl` such as `"https://shop.example?"` passed the origin check, and every `fullUrl` built on it carried the `?`.
  It is now rejected with the existing `baseUrl must be an origin …` message. A base with credentials
  (`https://user:secret@shop.example`) is accepted as before.

- [#60](https://github.com/DyHex/POMWright/pull/60) [`1dc488f`](https://github.com/DyHex/POMWright/commit/1dc488f1f6fcd99d2bbba4229addaf3b25cf957a) - `verify()` reports an `add(path)` that never got a locator method, such as `add("main.form@login");` written as a
  statement: `"main.form@login": add("main.form@login") ended without a locator method (at add("main.form@login.button@login")); give it one or remove it`.
  Before, such an `add` registered nothing, every chain below the path left the segment out, and `verify()` passed. A
  registry with such an `add` now fails its check, in a page object at its first use: give the `add` its locator method,
  or remove it.

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
