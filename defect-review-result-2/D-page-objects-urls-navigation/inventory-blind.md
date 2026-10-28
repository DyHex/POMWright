# Segment 2D: inventory, blind pass

The map of the area as the blind pass found it, at `d850405`, before reading anything of the first review. One line per
item: what it is; where it is implemented; where it is documented; how deeply pass 1 reviewed and probed it
(**probed**: a probe of this pass ran through the public API; **read**: source, docs and tests read and compared, no probe
of its own beyond what the harness runs; **skimmed**). Probes are in
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/` (p01 to p10).

## Public exports and members

- `PageObject` (abstract class), its constructor `(page, baseUrl, urlPath, options?)`, `protected`: `src/pageObject.ts:157-366`; `api/class-pageobject.md` (*new PageObject()*), `docs/page-objects.md` (*Anatomy*), `docs/first-page-object.md`. Read, probed (p01, p04, p06, p07).
- `PageObject` type parameters `Paths` and `Options`: `src/pageObject.ts:157-160`; `api/class-pageobject.md` (*Type parameters*). Read.
- Properties `page`, `baseUrl`, `urlPath`, `fullUrl`, `label`, `sessionStorage` (2A's beyond its construction), `navigation`, `locatorRegistry` (protected), `add`, `getLocator`, `getLocatorSchema`, `getNestedLocator`: `src/pageObject.ts:166-260, 291-351`; `api/class-pageobject.md` (*Properties*). Read; `fullUrl` probed (p02, p10).
- Hooks `defineLocators()` (abstract) and `pageActionsToPerformAfterNavigation()` (optional, default `[]`): `src/pageObject.ts:406-450`; `api/class-pageobject.md` (*Methods to implement*), `docs/page-objects.md` (*When defineLocators() runs*, *Actions after navigation*). Read; actions covered by `actions.spec.ts`.
- `PageObjectOptions` (`label`, `navOptions`, `sessionStorage`, `locators`): `src/pageObject.ts:107-123`; `api/types.md` (*PageObjectOptions*). Read.
- `PageObjectTypeOptions` (`baseUrlType`, `urlPathType`, `storage`): `src/pageObject.ts:30-40`; `api/types.md`. Read.
- `BaseUrlTypeFromOptions`, `UrlPathTypeFromOptions`, `FullUrlTypeFromOptions`, `StorageTypeFromOptions`: `src/pageObject.ts:47-78`; `api/types.md`, `docs/typescript.md` (*The URL types*). Read.
- `NavigationFor<BaseUrl, FullUrl>` (with the internal `NavigationBase`, `GotoTarget`, `AbsoluteUrl`): `src/helpers/navigation.ts:14, 45-149`; `api/class-navigation.md` (*NavigationFor*). Read; probed (p05).
- `NavigationOptions` (`waitUntil`, `timeout`), `ThisPageOptions` (`runPostNavigationActions`): `src/helpers/navigation.ts:22-43`; `api/class-navigation.md`. Read; harness `testNav.spec.ts` covers the precedence.
- `navigation.goto()` / `goto(options)` / `goto(target, options?)`: `src/helpers/navigation.ts:232-283`; `api/class-navigation.md` (*goto()*), `docs/urls-and-navigation.md` (*Navigating*). Read; probed (p05, p06, p08).
- `navigation.expectThisPage(options?)`: `src/helpers/navigation.ts:286-298`; same pages. Read; probed (p02, p03).
- `navigation.expectAnotherPage(options?)`: `src/helpers/navigation.ts:304-318`; same pages. Read; probed (p02, p03).
- `UrlMatcher` (call signature, `base`, `path`, `test`, `toString`): `src/helpers/url.ts:25-46, 186-210`; `api/class-navigation.md` (*UrlMatcher*), `docs/urls-and-navigation.md` (*Pages whose URL varies*). Read; probed (p10).

## Features and stated contracts

- A string `baseUrl` is a non-empty origin: scheme with a URL origin, host, optional port, optional trailing slash, no path, query, hash, bare `?` or `#`: `src/helpers/url.ts:48-101`; `docs/urls-and-navigation.md` (*baseUrl and urlPath*), `internal/url-matching.md` (*The checks*), `src/helpers/AGENTS.md`. Read; probed (p06); harness `urls.spec.ts`, `urlHosts.spec.ts`.
- A string `urlPath` is `""` or starts with exactly one `/` and stays on the base's origin once resolved: `src/helpers/url.ts:103-128`; same pages. Read; probed (p06).
- A URL part that is neither a string nor a RegExp is rejected at construction: `src/helpers/url.ts:87-93`; same pages. Read; probed (p06).
- `fullUrl` for two strings is `new URL(urlPath, baseUrl).href` with `^` in the path as `%5E`; a `UrlMatcher` otherwise: `src/helpers/url.ts:216-225`; `docs/urls-and-navigation.md` (*fullUrl*), `api/class-pageobject.md` (*fullUrl*), `internal/url-matching.md`. Read; probed (p02 on three browsers and Node 20, 22, 24).
- A page's identity is its exact URL, an empty `?` or `#` included; `|`/`%7C` and `^`/`%5E` equal in a string path's path part: `src/helpers/url.ts:144-199`; `docs/urls-and-navigation.md` (*Navigating*, *fullUrl*), `internal/url-matching.md`. Read; probed (p02); known issue #59 (an option to treat an empty `?` or `#` as the same page).
- The `UrlMatcher` tests base against the origin and path against the rest, each RegExp as written, `lastIndex` reset: `src/helpers/url.ts:172-210`; `internal/url-matching.md`. Read; probed (p10).
- `goto(target)` resolves as Playwright resolves against `baseURL`; on a RegExp base only an absolute URL: `src/helpers/url.ts:130-142`, `src/helpers/navigation.ts:207-224`; `api/class-navigation.md`, `docs/urls-and-navigation.md`. Read (compared with Playwright 1.64's `constructURLBasedOnBaseURL` and `completeUserURL`); probed (p05).
- Every option from the call, then `navOptions`, then Playwright; POMWright sets no default: `src/helpers/navigation.ts:171-177`; `docs/urls-and-navigation.md` (*Options and timeouts*). Read; harness covers it.
- Each navigation method is one Playwright call and a boxed step at the caller's line: `src/helpers/navigation.ts:11, 232-318`; `internal/call-sites.md` (*Steps at the test's line*). Read; the location check is 2E's.
- A wait's failure names the page object, what it expected and the URL found, with Playwright's error as `cause`: `src/helpers/navigation.ts:195-205`; `docs/urls-and-navigation.md`, `api/errors.md` (*Navigation*). Probed (p03): finding 2D-1.
- `expectAnotherPage` fails at once when the browser came straight back: `src/helpers/navigation.ts:304-318`. Read; harness `testNav.spec.ts` (bounce).
- A base with credentials is accepted and works; credentials show in every URL; `toHaveURL(fullUrl)` never matches it: `docs/urls-and-navigation.md` (the note). Probed (p09, a Basic-auth server, three browsers); harness `urlHosts.spec.ts`.
- `defineLocators()` runs once, after the constructing code (a microtask) or at the first locator call; followed by `verify()`; never from the constructor: `src/pageObject.ts:306-404`; `docs/page-objects.md`, `internal/page-object-lifecycle.md`, `src/AGENTS.md` (*The page object*). Read; unit and harness tests read.
- The facade: every registry method but `createReusable` runs the definition first; `verify()` on the facade verifies once on a first call: `src/pageObject.ts:314-331`; `internal/page-object-lifecycle.md` (*The facade*), `api/class-pageobject.md` (*locatorRegistry*). Read.
- Sticky, labeled failures (`<label>: defineLocators() failed: …`, `<label>: Locator registry verification failed …`), the original as `cause`: `src/pageObject.ts:369-404`; `docs/page-objects.md`, `api/errors.md` (*Page objects*). Read.
- A definition that returns a Promise fails the page object with a labeled error, no `cause`, its rejection handled: `src/pageObject.ts:396-403`; same pages. Read; unit and harness tests read.
- A subclass constructor that throws after `super(…)`: the scheduled check still runs on the abandoned instance: `docs/page-objects.md` (the note), `internal/page-object-lifecycle.md`. Read; unit and harness tests read.
- The outcomes table: where a broken page object is built decides what the run shows: `docs/page-objects.md` (*How a mistake is reported*); checked by `test/tests/pageObject/lifecycle.outcomes.spec.ts`. Probed (p04): finding 2D-3.
- The check's error points at the `new` line, cut at `new.target`, bundle frames dropped; the `add` lines in the `cause`: `src/pageObject.ts:353-365`, `src/helpers/callSite.ts:14-30`; `internal/call-sites.md` (*Errors raised later*), `docs/page-objects-in-tests.md`. Probed (p01: a class without its own constructor, Node 20, 22, 24; p04: the real runner path in a fixture, the body and a step).
- An error the constructor throws (a URL check) is located at the subclass's `super(…)` line: no page states it. Probed (p07).

## Errors and messages

- The URL messages (five forms) and the navigation messages (seven forms): `src/helpers/url.ts`, `src/helpers/navigation.ts`; `api/errors.md` (*Page objects → URLs*, *Navigation*), `api/class-pageobject.md`, `api/class-navigation.md`, `docs/urls-and-navigation.md`, the `@throws` in the source. Probed (p06: every URL and `goto` message character for character).
- The lifecycle messages (`defineLocators() failed`, verification, the Promise message): `src/pageObject.ts:388-401`; `api/errors.md` (*Page objects → Locators*), `docs/page-objects.md`, `api/class-pageobject.md`. Read.

## Lifecycles and ordering

- Construction order: label, URL checks, `fullUrl`, registry, session storage helper, navigation helper, the scheduled check last: `src/pageObject.ts:285-366`; `internal/page-object-lifecycle.md` (*Not in the constructor*). Read.
- The post-navigation actions: called per run, in order, inside the step, skipped by `runPostNavigationActions: false`: `src/helpers/navigation.ts:183-187`; `docs/page-objects.md` (*Actions after navigation*). Read; harness `actions.spec.ts`.

## Inputs at the boundary

- `goto`'s first argument from JavaScript (a `URL` object, `null`, a number): `src/helpers/navigation.ts:235-246`. Probed (p06).
- The navigation methods called detached from the helper: no contract. Probed (p08): design question 2D-4.
- A `waitUntil` TypeScript rejects, from JavaScript: probed (p03, part of 2D-1).

## Types

- `NavigationFor`'s assignability matrix and `goto` typing: `src/helpers/navigation.ts`; `test/tests/packaging/publicTypes.typecheck.ts:657-735`. Read; probed (p05): finding 2D-2.
- The `*TypeFromOptions` helpers against the runtime (`composeFullUrl`'s overloads, `fullUrl`): read; `src/helpers/navigation.test.ts` (*URL type aliases*).
- A generic base class forwarding `PageObjectOptions` and `UrlPathTypeFromOptions` (*Organizing a project*, `testApp.base.ts`): read; covered by `publicTypes.typecheck.ts` (*GenericShop*).

## Tests

- Unit: `src/pageObject.test.ts`, `src/helpers/url.test.ts`, `src/helpers/navigation.test.ts`, the check-site parts of `src/helpers/callSite.test.ts`: read (test names; `pageObject.test.ts` in full). Run on Node 20 and 22 (exit 0, 138 tests with the files vitest groups with them).
- Harness: `test/tests/pageObject/` (lifecycle, lifecycle.outcomes with `test/lifecycle-outcomes/`, urls, verify, actions, `callSite/`), `test/tests/testApp/` (`testNav`, `testPath`, `color`, `urlForms`, `urlHosts`), the page objects `testApp.base.ts`, `testnav/`, `testPath/`: read.

## Documentation

- `docs/page-objects.md`, `first-page-object.md`, `page-objects-in-tests.md`, `urls-and-navigation.md`; `api/class-pageobject.md`, `class-navigation.md`, `types.md` (page object part), `errors.md` (page objects, navigation); `internal/page-object-lifecycle.md`, `url-matching.md`, `call-sites.md`; `docs/upgrading-from-2x.md` (page objects, URLs and navigation), `docs/organizing-a-project.md` (the base classes): read in full or the parts named.

## The change set since v3.0.1 (this area)

- Before `54cdada`: `c9c8f34` urlPath stays on the origin; `c75ab43` empty `?`/`#`; `d710c12` `|` on Chromium; `fa424ad` `goto(URL)`; `0028097` origins without a URL origin; `54cdada` `^` on Node 20 and 22. Read through their changesets; probed through p02 and p06.
- After `54cdada` (no review has seen them): `445fc71` check site at `new.target` (p01, p04: sound); `80cb5ea` Promise from `defineLocators()` (read; tests read); `3bf7a19` `fullUrl` writes `%5E` (p02: sound); `8c8d8fb` `NavigationFor` checks `goto` strictly (p05: 2D-2 is older; p08: 2D-4); `27f8d12` labeled unresolvable target (p06: sound); docs `55e7149`, `a74d10e` (credentials, p09), `429f2c2` (messages, p06).
- Changesets read: `async-define-locators`, `cannot-resolve-label`, `caret-in-url-path`, `empty-query-is-another-url`, `goto-url-object`, `navigation-for-goto`, `origin-without-url-origin`, `page-object-check-at-new`, `pipe-in-url-path`, `url-path-keeps-origin`. Each matches its change.
