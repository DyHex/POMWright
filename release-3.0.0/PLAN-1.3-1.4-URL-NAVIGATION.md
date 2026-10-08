# Plan: URL composition and navigation (analysis items 1.3 and 1.4)

Working document, kept in `release-3.0.0/` beside the analysis it answers (items 1.3 and 1.4, plus the `goto`
bullet of 1.10 and the `"" | string` bullet of section 2, which touch the same types). File links are relative to
this folder. Decisions are ticked in section 7 and mirrored in [DECISIONS.md](DECISIONS.md); consumer-facing
outcomes are tracked in [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md). Not yet executed.

Every runtime claim below was verified between 2026-10-07 and 2026-10-08 against Chromium (and, where stated,
Firefox and WebKit) through the Playwright 1.62.1 install in `test/`, against the Playwright source in that
install, against Node's `URL`, or against the TypeScript compiler in the repository. Every code reference points at
the exact lines in this repository. Matcher outputs come from a prototype run in Node and Chromium; the unit tests
in 5.1 turn that table into the specification. Example hosts are generic (`*.example`).

**Decided (2026-10-07, revised 2026-10-08).** Design principle: POMWright's URL handling behaves exactly like
Playwright's `baseURL` handling, with one addition, a `baseUrl` per page object. Concretely: string URLs are
resolved with `new URL`, not prefix-joined; a string `baseUrl` is a non-empty origin and a string `urlPath` is
empty or a single-slash path, both validated at construction (plain `string` parameters, no compile-time literal
types); when either part is a RegExp, `fullUrl` is a structured `UrlMatcher` that tests the base against the URL's
origin and the path against the rest, each regex used exactly as written; `goto()` without an argument replaces
`gotoThisPage()`; `expectThisPage` and `expectAnotherPage` are each one `page.waitForURL` call; every Playwright call
keeps the timeout its config option gives it; the unit tests' type-level assertions run through vitest typecheck
mode. All decisions are in section 7.

---

## 1. Intended contract

### 1.1 Alignment with Playwright

Playwright resolves every `page.goto(input)` as `new URL(input, baseURL)` against the single `use.baseURL` of the
config. POMWright does the same thing against the `baseUrl` of the page object, so a project can have several bases
(one abstract page object per domain) without a disconnect from Playwright's behaviour. Where POMWright is stricter
than Playwright (1.2), it is to prevent a silent trap, and the behaviour inside the allowed inputs is identical.

Timeouts follow the same principle: POMWright sets no timeout of its own. Each Playwright call it makes keeps the
timeout the project config gives that kind of call (`use.navigationTimeout` for `page.goto` and `page.waitForURL`),
and a method option overrides it per call or per page object.

### 1.2 String `baseUrl`: a non-empty origin

`baseUrl` may instead be a `RegExp`, declared with `Options` as `{ baseUrlType: RegExp }`, in which case the
parameter is typed `RegExp`, the value is used exactly as written, and 1.5 applies. The rules below are for string
values.

- Shape: `scheme://host[:port]`, optional trailing slash. `http://localhost:9000`, `https://localhost:9000/`, and
  `https://app.example` are valid. Ports are ordinary (verified).
- The browser always reports an origin-only page as `https://app.example/`, pathname `/`. You may write the base
  with or without that slash; both compose identically (verified: `https://app.example` and `https://app.example/`
  both give `https://app.example/login` and, for the homepage, `https://app.example/`).
- No path, query, or hash. Playwright accepts `https://app.example/app` as a base, but because POMWright's
  `urlPath` is always `/`-rooted or empty, `new URL` would discard `/app` for every page except the homepage page
  object, where it would survive. That inconsistency is rejected at construction instead.
- No scheme-less value. `localhost:9000` parses as scheme `localhost` with an empty host, so `new URL("/login",
  "localhost:9000")` throws `Invalid URL` (verified). Playwright's config has the same limit: with
  `use.baseURL: "localhost:9000"`, `page.goto("/login")` fails with `Cannot navigate to invalid URL` (verified).
  2.1.0's plain concatenation happened to navigate because all three browsers fix up `localhost:9000/login` to
  `http://localhost:9000/login`, but every URL assertion then failed against the fixed-up URL (verified in Chromium,
  Firefox, WebKit). POMWright rejects the value at construction with the fix in the message.
- No empty string. `baseUrl` is a required argument, and silently falling back to the config `use.baseURL` would be
  a trap. Every supported layout passes an explicit base: an abstract page object per domain, or a page object per
  page with both values, typically from environment variables.
- The parameter is a plain `string`. Literals, variables, and environment values are passed directly; the
  constructor validates every value and throws with the class label and the reason:

  ```
  ShopLogin: baseUrl must be an origin such as "https://app.example" or "http://localhost:9000"
  (scheme, host, optional port, no path, query or hash); received "localhost:9000".
  ```

  Compile-time literal types (`` `${string}://${string}` ``) were considered and rejected: they catch only malformed
  literals, which the runtime check catches at the same point in the test lifecycle (fixture setup, before any
  navigation), and they force every environment-driven value through a narrowing call.

### 1.3 String `urlPath`: empty or a single-slash path

`urlPath` may instead be a `RegExp`, declared with `Options` as `{ urlPathType: RegExp }`, as the harness's `color`
page does today; the value is used exactly as written, and 1.5 applies. The rules below are for string values.

- `""` is the homepage page object. Otherwise the value starts with exactly one `/`. `"/"`, `"/login"`,
  `"/app/login"` are valid; `"login"`, `"?tab=1"`, `"#section"`, absolute URLs, and `"//other.example/x"` are not.
- Why `//` is rejected: under `new URL` a leading `//` is a protocol-relative reference, so `"//other.example/x"`
  would resolve to `https://other.example/x` (verified). Double slashes later in a path (`/a//b`) are valid URL
  syntax and are not policed. A page whose path genuinely begins with `//` is reachable with a RegExp path such as
  `/^\/\/login$/`, which the matcher tests against the rest verbatim.
- The parameter is a plain `string`, validated at construction with the class label in the message, exactly like
  `baseUrl`. Computed paths such as `` `/account/${id}` `` and environment-driven paths are passed directly.

### 1.4 `fullUrl` for two strings

`new URL(urlPath, baseUrl).href`. `"https://app.example"` + `"/login"` and `"https://app.example/"` + `"/login"`
give `https://app.example/login`; `"https://app.example"` + `""` gives `https://app.example/`, the form `page.url()`
reports; `"http://localhost:9000"` + `"/testpath"` is unchanged from today. Nothing is normalised beyond what URL
resolution does: an absolute path reference replaces the base's path, and an origin with or without its trailing
slash is the same origin.

### 1.5 RegExp parts: a structured `UrlMatcher`

When either part is a RegExp, concatenating the two regexes would force the base to match the URL up to the exact
character where the path begins. That is why a substring base such as `/identity-provider/` would have needed a
`[^/]*` tail. The URL parser already provides the seam, so POMWright matches each part against its own slice:

- `origin = url.origin` (`scheme://host[:port]`); `rest = url.pathname + url.search + url.hash`.
- A RegExp base is tested against `origin`; a string base is exact origin equality after normalisation.
- A RegExp path is tested against `rest`; a string path is exact, with `""` meaning `/`.
- Every regex runs exactly as written, with its own flags and with `lastIndex` reset. POMWright adds, removes, or
  rewrites no anchors. `^` and `$` on the base refer to the origin; on the path, to the whole rest.
- `fullUrl` is then a `UrlMatcher`: a predicate `(url: URL) => boolean` accepted by `page.waitForURL`,
  `expect(page).toHaveURL` (predicate form since Playwright 1.51, inside the `>=1.57.0` peer range), and
  `page.route`, with `.base`, `.path`, `.test(url)`, and a readable `toString()`. `UrlMatcher` is exported.

Prototype results against `https://login.identity-provider.example/authorize?client=shop`:

| base + path | matches | why |
|---|---|---|
| `/identity-provider/` + `/\/authorize/` | yes | substring on the origin, substring on the rest, no `[^/]*` |
| `/identity-provider/` + `"/authorize"` | no | a string path is exact and the query follows |
| `/\.example$/` + `/^\/authorize\?client=\w+$/` | yes | `$` on the base is the end of the origin; the path anchors cover the whole rest |
| `/^https:\/\/login\./` + `/authorize/i` | yes | `^` on the base is the start of the origin; the path keeps its own flag |
| `/authorize/` + `/\/authorize/` | no | the base only ever sees the origin, so it cannot match inside the path |
| `"https://login.identity-provider.example/"` + `/\/authorize/` | yes | string base exact, trailing slash irrelevant |

Consequences worth documenting: a base regex that contains a path prefix never matches, because the base sees only
the origin, so path prefixes belong in `urlPath`; `$` on a base regex includes the port, so `(?::\d+)?$` when the
port varies; and the analysis's `http://evil?u=https://a.example/login` case cannot match a base regex for
`a.example`, because that URL's origin is `http://evil`.

All four type combinations were run through Playwright's `waitForURL` and `toHaveURL` in Chromium: both passed on
the page, their negations failed on the page, and both flipped off the page. Only string + string yields a string
`fullUrl`. Navigation (1.6) builds the same kind of matcher internally for string pages too, so every page kind is
matched by the same code; the public `fullUrl` of a string page stays the resolved string.

### 1.6 Navigation methods

| method | available when | does |
|---|---|---|
| `goto(options?)` | `fullUrl` is a string | `page.goto(fullUrl, { waitUntil, timeout })`, then the post-navigation actions unless `runPostNavigationActions: false` |
| `goto(target, options?)` | always; `target` is `string` for a string base and an absolute-URL type for a RegExp base | string base: `page.goto(new URL(target, baseUrl).href, …)`, exactly Playwright's resolution against its `baseURL`; RegExp base: `target` must be absolute. Never runs the actions, has no actions option |
| `expectThisPage(options?)` | always | `page.waitForURL(matcher, { waitUntil, timeout })`, then the actions unless `runPostNavigationActions: false` |
| `expectAnotherPage(options?)` | always | `page.waitForURL(url => !matcher(url), { waitUntil, timeout })`, then an immediate re-check that the URL still does not match, so a redirect that bounced back fails at once |

Why one `waitForURL` call is the whole wait, from Playwright's implementation (verified in the 1.62.1 bundle):

```js
async waitForURL(url, options) {
  if (urlMatches(baseURL, this.url(), url)) return await this.waitForLoadState(options.waitUntil, options);
  await this.waitForNavigation({ url, ...options });
}
```

If the URL already matches when the method is called, Playwright waits for the requested load state of the current
document and returns; otherwise it waits for a navigation to a matching URL with that load state. So a navigation
that already happened before the call resolves immediately (1 ms, verified), a pending one is awaited, and neither
`toHaveURL` nor a separate `waitForLoadState` adds anything. `"commit"` is native.

`gotoThisPage` is removed. A `goto(target)` whose target happens to equal `fullUrl` is ordinary navigation: no
actions, no option, no detection.

Options. `NavigationOptions = { waitUntil?: WaitUntil; timeout?: number }`. `waitUntil` resolves per call, then from
the page object's `navOptions`, then to Playwright's own default (`"load"`), and is passed to `page.goto` and
`page.waitForURL`. `timeout` resolves the same way and, when unset, leaves each call on `use.navigationTimeout`
(Playwright's default for it is 0, no timeout, so the test timeout governs); `0` disables it, as everywhere in
Playwright. The 2.x `waitForLoadState` option is removed: it existed for `expectAnotherPage`'s separate load-state
call, which no longer exists, and `waitUntil` is its superset. `ThisPageOptions = NavigationOptions &
{ runPostNavigationActions?: boolean }` (default `true`) is accepted only by the two this-page forms.

Failure output. Playwright's `waitForURL` timeout says only `page.waitForURL: Timeout 10000ms exceeded. … waiting
for navigation until "load"`, so POMWright rethrows it with the context the analysis asked for, the current URL read
at failure time, and the original error as `cause`:

```
OrdersPage: expected URL origin "https://app.example" + path "/orders"; found "https://app.example/orders?tab=1"
(page.waitForURL: Timeout 10000ms exceeded.)
```

Each method makes exactly one waiting call, so its ceiling is one `use.navigationTimeout`, or the `timeout`
option, never a sum.

### 1.7 Edge cases, with the decided answer

| case | today | decided |
|---|---|---|
| `"https://app.example/"` + `"/login"` | `https://app.example//login` | `https://app.example/login`: URL resolution, not normalisation; the trailing slash is the canonical origin form |
| `"https://app.example"` + `""` | `https://app.example` | `https://app.example/` |
| `"https://app.example/app"` as base | accepted, prefix-joined | throws: origin only |
| `"localhost:9000"` as base | navigates by browser fix-up, every URL assertion fails | throws at construction: `baseUrl must be an origin such as "http://localhost:9000"` |
| `"https://app.example/?a=1"` or `"https://app.example/#h"` as base | accepted | throws: origin only |
| `""` as base | `goto` works by accident, `expectThisPage` never passes | throws at construction: `baseUrl` is required |
| `"login"`, `"?tab=1"`, `"#section"` as path | `https://app.examplelogin` and similar | throws at construction |
| `"//other.example/x"` as path | `https://app.example//other.example/x` | throws at construction; a genuine `//` path is a RegExp path |
| environment variable or computed string as base or path | accepted | accepted; validated at construction like any other value |
| `goto("login")`, `goto("?tab=1")` on a string base | passed raw to `page.goto` | resolved against the page object's origin, as Playwright would against `use.baseURL` |
| `goto("https://other.example/x")` | passed raw | passed raw (absolute input wins in `new URL`) |
| `goto("/x")` on a RegExp base | `goto` unavailable | compile error (absolute-URL type) and runtime throw |
| `goto()` on a RegExp `fullUrl` | n/a | compile error and runtime throw |
| `goto("/testnav")` equal to `fullUrl` | n/a | ordinary navigation, no actions |
| `fullUrl` `https://app.example`, browser `https://app.example/` | `waitForURL` passes, `toBe` never does; test dies on the global timeout | passes: the matcher compares origins and the rest |
| `expectThisPage` called after the navigation already landed | `waitForURL` passes, then the `toBe` loop | resolves at once after the load state of the current document |
| page adds `?tab=1` or `#h` to a string page | exact `toBe` fails after the global timeout | fails within `use.navigationTimeout` with expected and found in the message; pages whose identity includes a query are RegExp page objects, e.g. `/^\/orders\?tab=\d+$/` |
| navigation lands after 7 s, `use.navigationTimeout` 10 s | `waitForURL` passes, then the `toBe` loop | passes at 7 s |
| `"https://app.example"` + `/^\/user\/\d+$/` | `^https:\/\/app\.example^\/user\/\d+$`, never matches | matcher: origin exact, rest matches `/user/12`, not `/user/12/evil` |
| `/identity-provider/` + `/\/authorize/` | `identity-provider\/authorize` as one regex, never matches | matcher: both substrings match independently |
| `/https:\/\/(a\|b)\.example/` + `"/login"` | `http://evil?u=https://a.example/login` matches | matcher: origin `http://evil` fails the base |
| RegExp base with a path prefix, `/^https:\/\/app\.example\/app/` | concatenated | never matches; the base sees only the origin (migration note) |
| `/a/iu` + `/b/sv` | flags dropped | each regex keeps its own flags; nothing is merged |
| `expect(url).toMatch(poc.fullUrl)` on a RegExp page | works | type error; use `expect(page).toHaveURL(poc.fullUrl)` or `poc.fullUrl.test(url)` |
| `waitUntil: "commit"` from `navOptions` or per call | passed to `waitForURL` | passed to `waitForURL`, unchanged |
| `navOptions: { waitForLoadState }` | used by `expectAnotherPage` | compile error; rename to `waitUntil` |
| `expectAnotherPage` while still on the page, `fullUrl` without the trailing slash | passes at once (1.4) | waits for the URL to leave, then fails with expected and found |
| `expectAnotherPage`, redirect bounces back to this page | passes | the re-check fails at once: the URL is back |
| `expectAnotherPage`, same path with a new query | passes | passes: exact negation of `expectThisPage`; the URL differs |

---

## 2. How it works today

### 2.1 Composition

[pageObject.ts:85-104](../src/pageObject.ts#L85-L104): four branches with four rules. The verified table is in
analysis 1.3. Branch shapes: string + string is plain concatenation ([L91-93](../src/pageObject.ts#L91-L93));
string + RegExp is `^` + escaped base + raw path source ([L94-96](../src/pageObject.ts#L94-L96)), no `$`, flags
dropped, a user `^` becomes an unmatchable mid-pattern anchor; RegExp + string is raw base + escaped path + `$`
([L97-99](../src/pageObject.ts#L97-L99)), no `^`, flags dropped, no `(?:…)`; RegExp + RegExp is concatenation
([L100-102](../src/pageObject.ts#L100-L102)), no anchors, flags dropped. In every RegExp branch the base must match
the URL up to the character where the path starts, which no substring base does. The same seam issue is in `goto`
at [navigation.ts:70](../src/helpers/navigation.ts#L70). Nothing validates `baseUrl` or `urlPath`;
`UrlPathTypeFromOptions` at [L25](../src/pageObject.ts#L25) is `"" | string`, which is `string`.

### 2.2 Navigation

- `goto` ([navigation.ts:63-73](../src/helpers/navigation.ts#L63-L73)) requires both parts to be strings
  ([L65](../src/helpers/navigation.ts#L65), type at [L26](../src/helpers/navigation.ts#L26)), joins `/`-prefixed
  input by concatenation, and passes everything else raw to `page.goto`, where Playwright resolves it against the
  config `baseURL` rather than the page object's.
- `gotoThisPage` ([L79-90](../src/helpers/navigation.ts#L79-L90)) navigates and runs the actions.
- `expectThisPage` ([L96-111](../src/helpers/navigation.ts#L96-L111)): `waitForURL(fullUrl, { waitUntil })`, which
  resolves a string with `new URL` and treats it as a glob, then `expect(page.url()).toBe(fullUrl)` inside
  `toPass()`, whose default timeout is none
  ([expect.js:12975](../test/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/lib/matchers/expect.js#L12975)).
  The custom message is built before polling, so `found '…'` shows the URL at call time.
- `expectAnotherPage` ([L117-136](../src/helpers/navigation.ts#L117-L136)): `waitForLoadState` first, which returns
  at once if the current document is loaded, then `expect.poll(...).not.toBe(fullUrl)` for the expect timeout
  ([expect.js:13382](../test/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/lib/matchers/expect.js#L13382)).
- `NavigationOptions` ([L9-12](../src/helpers/navigation.ts#L9-L12)) carries `waitUntil` and `waitForLoadState`,
  with POMWright defaults of `"load"` at [L6-7](../src/helpers/navigation.ts#L6-L7).

### 2.3 Harness coverage

- [color.page.ts:7](../test/page-object-models/testApp/pages/testPath/%5Bcolor%5D/color.page.ts#L7) is the only
  RegExp page object: `$` present, `^` absent, the one shape all branches get right.
- [testPath.spec.ts:3-8](../test/tests/testApp/testPath.spec.ts#L3-L8) covers `goto` plus `navigation.expectThisPage`
  for a string page and asserts `page.url()` equals `fullUrl`, which keeps working. `gotoThisPage` is called at
  [testPath.spec.ts:11](../test/tests/testApp/testPath.spec.ts#L11) and [testPage.spec.ts:7](../test/tests/testApp/testPage.spec.ts#L7).
- The page objects define their own `expectThisPage()` calling `page.waitForURL(this.fullUrl)`
  ([testPath.page.ts:18-22](../test/page-object-models/testApp/pages/testPath/testPath.page.ts#L18-L22),
  [color.page.ts:19-26](../test/page-object-models/testApp/pages/testPath/%5Bcolor%5D/color.page.ts#L19-L26)); they
  keep working with a matcher because `waitForURL` accepts a predicate (verified).
- Twenty `page.goto(x.fullUrl)` calls in the specs are all on string pages; unchanged.
- `expectAnotherPage` has no test. No test uses a RegExp base, a trailing-slash base, a query string, a delayed
  navigation, a `^`-anchored path, or any invalid base or path.
- Harness timeouts: expect 5 s, navigation 10 s, test 60 s ([playwright.base.ts:9-13](../playwright.base.ts#L9-L13),
  [L29](../playwright.base.ts#L29)). Playwright's own defaults are 5 s for `expect.timeout` and 0 (no timeout) for
  `use.navigationTimeout` and `use.actionTimeout` (installed type docs).

### 2.4 What is correct today

The `UrlTypeOptions` plumbing and the string-vs-RegExp narrowing of `navigation`; the actions mechanism, labels,
default and per-call options; the `$`-anchored, `^`-free RegExp path shape; the use of `waitForURL` as the first
step of `expectThisPage`; and the string case whenever `fullUrl` already carries the trailing slash the browser
reports.

### 2.5 What is wrong today

1. Four inconsistent composition rules; a fully anchored path regex never matches (1.3).
2. Flags are lost in every RegExp branch (1.3).
3. A substring base regex can never match, because concatenation requires the base to reach the path (1.3).
4. Double slash at the seam in `fullUrl` and `goto` (1.3).
5. `expectThisPage` follows a correct `waitForURL` with an exact `toBe` loop that spins forever on a normalisation
   mismatch and never shows a diff (1.4).
6. `expectAnotherPage` passes immediately in the same case and waits for the load state of the page being left (1.4).
7. `goto` is gated on `urlPath` and resolves non-prefixed input against the wrong base (1.10).
8. No validation of `baseUrl` or `urlPath`: an empty base, a base with a path, a scheme-less base, a path without a
   slash, and a protocol-relative path are all accepted and fail later or silently.
9. POMWright defaults `waitUntil` and `waitForLoadState` to `"load"` itself instead of leaving them to Playwright.
10. Docs describe the branches as if they agreed ([docs/v3/PageObject.md:56-57](../docs/v3/PageObject.md#L56-L57),
    [L150-164](../docs/v3/PageObject.md#L150-L164)).

---

## 3. Design

### 3.1 `src/helpers/url.ts`: guards, resolution, matcher

```ts
export interface UrlMatcher {
	(url: URL): boolean;                 // predicate form for waitForURL, toHaveURL, route
	readonly base: string | RegExp;
	readonly path: string | RegExp;
	test(url: string | URL): boolean;
	toString(): string;                  // e.g. origin /identity-provider/ + path /\/authorize/
}

// internal, not exported from the package
export function assertBaseUrl(value: string, label: string): void;
//   new URL(value) must parse with a non-empty host, pathname "/", no search, no hash. "" is rejected.
export function assertUrlPath(value: string, label: string): void;
//   "" passes. Otherwise must start with "/" and not with "//".
//   Message: `${label}: urlPath must be "" or start with exactly one "/"; received "${value}".`
export const isAbsoluteUrl = (input: string) => /^[a-z][a-z0-9+.-]*:/i.test(input);
export const resolveUrl = (input: string, baseUrl: string): string => new URL(input, baseUrl).href;
//   a throw is rethrown with the input and base named

export const createUrlMatcher = (base: string | RegExp, path: string | RegExp): UrlMatcher => {
	const expectedOrigin = typeof base === "string" ? new URL(base).origin : undefined;
	const expectedRest = typeof path === "string" ? path || "/" : undefined;
	const matcher = ((input: URL | string) => {
		const url = typeof input === "string" ? new URL(input) : input;
		const rest = url.pathname + url.search + url.hash;
		const baseOk = base instanceof RegExp ? ((base.lastIndex = 0), base.test(url.origin)) : url.origin === expectedOrigin;
		const pathOk = path instanceof RegExp ? ((path.lastIndex = 0), path.test(rest)) : rest === expectedRest;
		return baseOk && pathOk;
	}) as UrlMatcher;
	// .base, .path, .test, .toString attached here
	return matcher;
};

export function composeFullUrl(base: string, path: string): string;
export function composeFullUrl(base: string | RegExp, path: string | RegExp): UrlMatcher;
export function composeFullUrl(base: string | RegExp, path: string | RegExp) {
	return typeof base === "string" && typeof path === "string" ? resolveUrl(path, base) : createUrlMatcher(base, path);
}
```

Why not a `RegExp` subclass for the matcher: Playwright serialises a RegExp as source plus flags before matching,
so an overridden `test` would be bypassed and the structural semantics lost. The predicate is the supported
integration point.

Why not one composed RegExp with a `[^/]*` filler between the parts: it keeps the `RegExp` type but needs a
`//`-aware prefix to stop the base matching inside the path, a lookahead rewrite for `$` on the base, flag merging
with `u`/`v` conflicts, and an escaper that avoids `\-`; the result is unreadable in failure messages. The matcher
removes all of that machinery.

### 3.2 Navigation type and `goto`

```ts
export type NavigationOptions = { waitUntil?: WaitUntil; timeout?: number };
export type ThisPageOptions = NavigationOptions & { runPostNavigationActions?: boolean };

type GotoTarget<Base> = Base extends string ? string : AbsoluteUrl;   // AbsoluteUrl = `${string}:${string}`

export type NavigationFor<Base, Full> = {
	expectThisPage(options?: ThisPageOptions): Promise<void>;
	expectAnotherPage(options?: NavigationOptions): Promise<void>;
	goto(target: GotoTarget<Base>, options?: NavigationOptions): Promise<void>;
} & (Full extends string ? { goto(options?: ThisPageOptions): Promise<void> } : object);
```

The `Options` type parameter of `PageObject` keeps its 2.x meaning and is still required: which `goto` form a class
may call, and whether the target must be absolute, are decided by the compiler from the declared types, which a
constructor cannot infer from its arguments. Runtime guards remain as the backstop for JavaScript callers.

Verified with the compiler against a prototype of this type: on a string page `goto()`,
`goto({ runPostNavigationActions: false })`, `goto("/x")`, `goto("https://other.example/x")`, and `goto(someString)`
compile, while `goto("/x", { runPostNavigationActions: false })` is an error; on a string base with a RegExp path
`goto()` and `goto({ timeout: 1 })` are errors and `goto("/x")` compiles; on a RegExp base `goto("https://a.example/x")`
and `goto("about:blank")` compile while `goto("/x")`, `goto(someString)`, and `goto()` are errors. A `UrlMatcher`
is not a `string`, so the `Full extends string` gate is unchanged by the matcher.

Runtime:

```ts
async goto(...args: [options?: ThisPageOptions] | [target: string, options?: NavigationOptions]) {
	const [first, second] = args;
	if (typeof first !== "string") {
		if (typeof this.fullUrl !== "string")
			throw new Error(`${this.label}: goto() without a URL needs a string fullUrl; this page object has a RegExp URL. Pass an absolute URL instead.`);
		const options = first;
		await test.step(`${this.label}: Navigate to this Page`, async () => {
			await this.page.goto(this.fullUrl as string, { waitUntil: this.resolveWaitUntil(options), timeout: this.resolveTimeout(options) });
			if (options?.runPostNavigationActions !== false) await this.executeActions();
		});
		return;
	}
	const target =
		typeof this.baseUrl === "string"
			? resolveUrl(first, this.baseUrl)
			: isAbsoluteUrl(first)
				? first
				: (() => { throw new Error(`${this.label}: goto("${first}") needs an absolute URL because baseUrl is a RegExp.`); })();
	await test.step(`${this.label}: Navigate to ${target}`, async () => {
		await this.page.goto(target, { waitUntil: this.resolveWaitUntil(second), timeout: this.resolveTimeout(second) });
	});
}
```

`resolveWaitUntil` and `resolveTimeout` return `options?.x ?? this.defaultOptions?.x` with no POMWright default, so
an unset value is passed as `undefined` and Playwright applies its own default (`"load"`, `use.navigationTimeout`).
The 2.x constants at [navigation.ts:6-7](../src/helpers/navigation.ts#L6-L7) go.

### 3.3 `expectThisPage` and `expectAnotherPage`: one `waitForURL` each

```ts
private readonly matcher: UrlMatcher; // createUrlMatcher(baseUrl, urlPath), built once for every page kind

private describeFullUrl() {
	return typeof this.fullUrl === "string" ? `"${this.fullUrl}"` : String(this.fullUrl);
}

private async waitForUrl(predicate: (url: URL) => boolean, what: string, options?: NavigationOptions) {
	const waitUntil = this.resolveWaitUntil(options);
	const timeout = this.resolveTimeout(options);
	try {
		await this.page.waitForURL(predicate, { waitUntil, timeout });
	} catch (error) {
		const detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
		throw new Error(`${this.label}: ${what}; found "${this.page.url()}" (${detail})`, { cause: error });
	}
}

async expectThisPage(options?: ThisPageOptions) {
	await test.step(`${this.label}: Expect this Page`, async () => {
		await this.waitForUrl(this.matcher, `expected URL ${this.describeFullUrl()}`, options);
		if (options?.runPostNavigationActions !== false) await this.executeActions();
	});
}

async expectAnotherPage(options?: NavigationOptions) {
	await test.step(`${this.label}: Expect any other Page`, async () => {
		await this.waitForUrl((url) => !this.matcher(url), `expected to have left ${this.describeFullUrl()}`, options);
		if (this.matcher(new URL(this.page.url())))
			throw new Error(`${this.label}: left ${this.describeFullUrl()} but returned to it; found "${this.page.url()}"`);
	});
}
```

Verified on 2026-10-07 and 2026-10-08 in Chromium: `waitForURL` with the matcher resolves in 1 ms when the page is
already there, honours `"commit"`, covers a 300 ms delayed navigation and its load state in one call, accepts the
negated predicate, and the immediate re-check catches a redirect that returned 200 ms after leaving. The
already-matching branch waits for the requested load state (Playwright source, quoted in 1.6).

How the two designs compared, with the harness config (expect 5 s, navigation 10 s):

| scenario | `toHaveURL` + `waitForLoadState` (replaced) | one `waitForURL` (decided) |
|---|---|---|
| navigation lands after 7 s | fails at 5 s: bound by `expect.timeout`, a regression against 2.x | passes at 7 s |
| navigation never happens | fails at 5 s | fails at 10 s, like an unfinished `page.goto` |
| `expectAnotherPage` worst case | 5 + 10 + 5 s; with Playwright defaults 5 + test timeout + 5 | 10 s; with defaults the test timeout |
| `{ timeout: 3000 }` on `expectAnotherPage` | three calls, ceiling 9 s | ceiling 3 s |
| `"commit"` | special-cased | native |
| redirect bounces back after load | third `not.toHaveURL` retries up to 5 s, then fails | fails at once |
| failure output | Playwright's `Expected string … / Received string …` block | POMWright's line with expected, found, and Playwright's timeout line |

The replaced design bound a navigation wait by the assertion timeout, the wrong config option by the design
principle, summed ceilings, and called `toHaveURL` before the navigation it was meant to wait for. `waitForURL` is
Playwright's documented way to wait for a navigation and obeys `use.navigationTimeout`.

### 3.4 `PageObject` and exports

- `BaseUrlTypeFromOptions`: `RegExp` or `string`, unchanged. `UrlPathTypeFromOptions`: `RegExp` or `string` (was
  `"" | string`). `FullUrlTypeFromOptions`: `UrlMatcher` or `string` (was `RegExp` or `string`).
- The constructor computes `label` first, then runs `assertBaseUrl` and `assertUrlPath` on string values, then
  `composeFullUrl`. `navigation` is typed `NavigationFor<BaseUrlTypeFromOptions<Options>, FullUrlTypeFromOptions<Options>>`.
- Inside the generic constructor the argument types are `string | RegExp`, so the call to `composeFullUrl` resolves
  to the `UrlMatcher` overload and the result is cast to `FullUrlTypeFromOptions<Options>`, as the four branches are
  today ([pageObject.ts:92-101](../src/pageObject.ts#L92-L101)). The overloads give exact types to direct callers
  and to the unit tests.
- [index.ts](../index.ts) additionally exports the types `UrlMatcher`, `ThisPageOptions`, and `NavigationFor` (so
  the generated `.d.ts` does not inline it in `PageObject.navigation`). The guards and `createUrlMatcher` stay
  internal. `ExtractNavigationType`, `NavigationString`, and `NavigationRegExp` are internal today and are replaced
  by `NavigationFor`.

Impact of `fullUrl` no longer being a `RegExp` on RegExp pages. Inside the repository: every runtime reference is in
lines this plan rewrites; the harness needs no change beyond the two `gotoThisPage()` call sites, because its
`page.goto(x.fullUrl)` calls are on string pages and its `waitForURL(this.fullUrl)` calls accept a predicate; the
six `docs/v3` lines that say "RegExp" are inside the sections rewritten in 4.2. For consumers, only code that treated
a RegExp page's `fullUrl` as a `RegExp` changes: `expect(url).toMatch(poc.fullUrl)` becomes
`expect(page).toHaveURL(poc.fullUrl)` or `poc.fullUrl.test(url)`; `.source` / `.flags` become `.base` / `.path`; a
`const r: RegExp = poc.fullUrl` annotation is a compile error. Anything handed to a Playwright API that accepts a
predicate (`waitForURL`, `toHaveURL`, `page.route`) keeps working.

---

## 4. Implementation steps

### 4.1 Runtime (`src/`)

1. New `src/helpers/url.ts` (3.1).
2. [pageObject.ts:19-30](../src/pageObject.ts#L19-L30): the aliases per 3.4; [L49-80](../src/pageObject.ts#L49-L80):
   label first, guards, `composeFullUrl` from the helper; [L85-104](../src/pageObject.ts#L85-L104): delete.
3. [navigation.ts:6-26](../src/helpers/navigation.ts#L6-L26): delete the two `"load"` constants; `NavigationOptions`
   as `{ waitUntil?, timeout? }`; `ThisPageOptions`; `NavigationFor`; `fullUrl` typed `string | UrlMatcher`; the
   internal `matcher`; `resolveWaitUntil` and `resolveTimeout` without defaults ([L45-51](../src/helpers/navigation.ts#L45-L51)).
4. [navigation.ts:63-90](../src/helpers/navigation.ts#L63-L90): one `goto` per 3.2; delete `gotoThisPage`.
5. [navigation.ts:96-136](../src/helpers/navigation.ts#L96-L136): `waitForUrl` and the two methods per 3.3.
6. [navigation.ts:142-153](../src/helpers/navigation.ts#L142-L153): `createNavigation` typed on both parts.
7. [index.ts](../index.ts): new exports (3.4).
8. No new runtime dependency.

### 4.2 Docs (`docs/v3` only)

- [docs/v3/PageObject.md:45-62](../docs/v3/PageObject.md#L45-L62): rewrite *Options* with the `baseUrl` and
  `urlPath` rules, the construction-time errors, an environment-variable example, and a *How `fullUrl` is composed*
  subsection: string resolution, the structured matcher with the table from 1.5, the origin-only consequence for
  base regexes, examples from the unit tests.
- [docs/v3/PageObject.md:86](../docs/v3/PageObject.md#L86), [L89](../docs/v3/PageObject.md#L89): property table
  rows for `fullUrl` (`string | UrlMatcher`) and `navigation` (`NavigationFor`).
- [docs/v3/PageObject.md:146-191](../docs/v3/PageObject.md#L146-L191): the four methods per 1.6, `waitUntil` and
  `timeout` and their resolution order, `runPostNavigationActions`, which config option governs each call, a real
  failure message for each page kind.
- [docs/v3/PageObject.md:193-233](../docs/v3/PageObject.md#L193-L233): examples for a substring base regex, a
  `^…$` path, a query-bearing page as a RegExp page object with its own navigation method, and a *Migration from
  2.x* note (`gotoThisPage` → `goto()`, `waitForLoadState` → `waitUntil`, non-empty origin-only base, single-slash
  path, `//`, `fullUrl` is a `UrlMatcher` on RegExp pages, base regexes match the origin only, flags now apply,
  `goto` relative inputs now resolve against the page object).
- [docs/v3/overview.md:284-308](../docs/v3/overview.md#L284-L308) (2.8): bullets updated; `goto()` replaces
  `gotoThisPage()` in the usage comment; [L431](../docs/v3/overview.md#L431): the export list.
- Every remaining `gotoThisPage` mention in `docs/v3`: [PageObject.md:74](../docs/v3/PageObject.md#L74),
  [overview.md:91](../docs/v3/overview.md#L91), [L162](../docs/v3/overview.md#L162), [L320](../docs/v3/overview.md#L320),
  [L424](../docs/v3/overview.md#L424), [session-storage.md:112](../docs/v3/session-storage.md#L112). Verify with
  `grep -rn 'gotoThisPage\|waitForLoadState' docs/v3` before closing step 4.
- [README.md:255](../README.md#L255) keeps the 2.x example until release (AGENTS.md section 6, rule 4).

### 4.3 Changeset

`.changeset/url-composition-and-navigation.md`, `"pomwright": major`, with a *Breaking changes* heading:

- `gotoThisPage()` is removed; `goto()` without an argument replaces it and runs the post-navigation actions unless
  `runPostNavigationActions: false`. Migration: `grep -rn 'gotoThisPage(' --include=*.ts .` and drop `ThisPage`.
- `NavigationOptions.waitForLoadState` is removed; `waitUntil` covers every method. Migration: rename.
- A string `baseUrl` must be a non-empty origin (`scheme://host[:port]`, optional trailing slash); a string
  `urlPath` must be `""` or start with exactly one `/`. Both are checked at construction with the class name in the
  message.
- `goto(target)` resolves relative input against the page object's `baseUrl` exactly as Playwright resolves against
  `use.baseURL`; on a RegExp base only absolute URLs are accepted.
- On a page object with a RegExp `baseUrl` or `urlPath`, `fullUrl` is a `UrlMatcher` instead of a `RegExp`: the base
  is matched against the URL's origin and the path against the rest, each regex as written with its own flags. Pass
  it to Playwright APIs as before, or use `fullUrl.test(url)` instead of `toMatch`. A base regex that contains a path
  prefix must move that prefix into `urlPath`.
- `expectThisPage` and `expectAnotherPage` are each one `page.waitForURL` call under `use.navigationTimeout`
  (overridable with `NavigationOptions.timeout`); POMWright no longer defaults `waitUntil` to `"load"` itself.
  `expectAnotherPage` waits for the URL to change and then fails at once if it bounced back.
- `fullUrl` for a homepage page object is `https://app.example/` (trailing slash), the form the browser reports.

Under *Fixes*: `^`-anchored and substring path regexes; substring base regexes; the trailing-slash case; double
slashes; failures name the expected and found URLs; the inverse false pass in `expectAnotherPage`.

### 4.4 Analysis, release notes, decisions

Tick *Fix* on 1.3 and 1.4 with notes; tick the `goto` bullet in 1.10 and the `"" | string` bullet in section 2.
[DECISIONS.md](DECISIONS.md) and [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md) carry the decisions and the
*planned* items; flip to *done* after execution.

[AGENTS.md](../AGENTS.md) after execution: the revision line ([L4](../AGENTS.md#L4)); the repo map rows for `src/`
and `src/helpers/` ([L25-27](../AGENTS.md#L25-L27): `url.ts`, the second unit-test file) and `vitest.config.ts`
([L38](../AGENTS.md#L38): typecheck mode); section 3 ([L49](../AGENTS.md#L49): `test:unit` also type-checks);
section 4 ([L78](../AGENTS.md#L78): `/testnav`; [L82](../AGENTS.md#L82): `tests/pageObject/`); section 5: a
convention line for URLs next to the `getById` one (origin-only base, single-slash path, `UrlMatcher`, `goto()`,
one `waitForURL` per navigation wait, no POMWright timeouts); section 7 ([L158](../AGENTS.md#L158): the second
pending changeset).

### 4.5 Tooling: vitest typecheck mode (decision 7.12)

- [vitest.config.ts:7-10](../vitest.config.ts#L7-L10): add `typecheck: { enabled: true, include: ["src/**/*.test.ts"] }`.
  With `enabled`, plain `vitest run` type-checks the matched files and whatever they import (`url.ts`,
  `navigation.ts`, `pageObject.ts` transitively) with `tsc --noEmit`, through a temporary tsconfig that extends the
  repo's and that vitest writes and removes; `@ts-expect-error` violations and `expectTypeOf` failures become
  failing tests. Runtime tests keep running in the same invocation, so the `test:unit` script and
  [main.yaml:22](../.github/workflows/main.yaml#L22) need no change.
- [package.json:62](../package.json#L62): `"vitest": "5.0.3"` instead of `"^5.0.3"`, matching the lockfile. With
  the mode on, vitest prints "Testing types with tsc is an experimental feature. Breaking changes might not follow
  SemVer, please pin Vitest's version". The pin is recorded in [DECISIONS.md](DECISIONS.md).
- Scope: only files reachable from `src/**/*.test.ts` are checked. This is not a repo-wide type check and does not
  replace the analysis section 4 `tsc` item, which also has to scope around `test/` and its own tsconfig.

---

## 5. Tests

### 5.1 Unit tests: `src/helpers/url.test.ts` (vitest)

- `assertBaseUrl`: `http://localhost:9000`, `https://localhost:9000/`, `https://app.example:8443` pass; `""`,
  `localhost:9000`, `https://app.example/app`, `https://app.example/?a=1`, `https://app.example/#h`, `app.example`
  throw with the label and the reason in the message.
- `assertUrlPath`: `""`, `/`, `/login`, `/a//b` pass; `login`, `?tab=1`, `#s`, `https://app.example/a`,
  `//other.example` throw.
- `resolveUrl`: the Playwright parity table from this plan (`/login`, `login`, `./login`, `../login`, `?tab=1`,
  `#h` against `https://app.example` and `https://app.example/`), absolute input passthrough, invalid input rethrown
  with both values named.
- `createUrlMatcher`: the table in 1.5; all four type combinations against on-page and off-page URLs; string base
  with and without trailing slash and with upper-case host; `""` path against `/`; `g` and `y` flags on either part
  give the same answer twice; `toString()` shape; `.test` accepts a string or a `URL`.
- `composeFullUrl`: string + string returns the resolved string; any RegExp returns a matcher.
- Types: `expectTypeOf` for the `composeFullUrl` overloads and the three `…FromOptions` aliases, and
  `// @ts-expect-error` lines for the negative cases in 3.2 (`goto()` on a RegExp `fullUrl`, `goto("/x")` and
  `goto(someString)` on a RegExp base, `runPostNavigationActions` next to a target, `navOptions: { waitForLoadState }`,
  `const r: RegExp = fullUrl` on a RegExp page). The navigation cases use `declare const nav: NavigationFor<…>` and
  need no runtime page. Enforced by vitest typecheck mode (4.5); verified on 2026-10-07 that the mode reports an
  unused `@ts-expect-error` as a failing test, in 590 ms.

### 5.2 Integration tests (Playwright, `test/`)

**Fixture route** `/testnav` in [server.js](../test/server.js), next to `/testfilters` and `/testids`:
`GET /testnav` with links `#self-query` → `/testnav?tab=1`, `#self-hash` → `/testnav#section`, `#trailing` →
`/testnav/`, `#item` → `/testnav/item/42`, `#other` → `/testids`, and buttons `#delayed-item`, `#delayed-other`,
`#bounce` (navigates to `/testnav/bounce`, which redirects back to `/testnav` after 300 ms) that fire after 1500 ms;
`GET /testnav/item/:id` with a heading `Item <id>`; `GET /testnav/bounce` as described.

**Page objects and fixtures.** `test/page-object-models/testApp/pages/testnav/testnav.{locatorSchema,page}.ts`
(string `/testnav`, with an action counter like [testPage.page.ts:7](../test/page-object-models/testApp/pages/testPage.page.ts#L7))
and `testnav-item.{locatorSchema,page}.ts` (`{ urlPathType: RegExp }`, path `/^\/testnav\/item\/\d+$/`). Fixtures
`testNav` and `testNavItem` in [testApp.fixtures.ts](../test/fixtures/testApp.fixtures.ts). Variants needing another
base (trailing slash, RegExp base, RegExp + RegExp, flags, a base from a variable) are small classes extending
`PageObject` inside the spec.

**Spec** `test/tests/testApp/testNav.spec.ts`:

- `goto()` lands on `fullUrl` and runs the actions once; `goto({ runPostNavigationActions: false })` runs none;
  `goto("/testnav")` runs none; `expectThisPage()` runs them, `expectThisPage({ runPostNavigationActions: false })` does not.
- `goto("testnav")`, `goto("?tab=1")`, and `goto("http://localhost:9000/testids")` resolve as in the parity table.
- trailing-slash base: `fullUrl` has one slash; `goto()` and `goto("/testnav")` land on it.
- `expectThisPage()` right after `goto()` resolves at once; after `goto({ waitUntil: "commit" })` it still returns
  with the document loaded (an element is visible without an explicit wait).
- query, hash, trailing slash: `expectThisPage({ timeout: 500 })` rejects, and the message contains the expected
  URL, the found URL, and `Timeout 500ms`.
- delayed navigation: `testNavItem.navigation.expectThisPage()` passes under the harness navigation timeout;
  `{ timeout: 200 }` rejects with the matcher description in the message.
- `expectAnotherPage`: rejects within `{ timeout: 500 }` while on the page, and the elapsed time is about 500 ms,
  not a multiple of it; passes after `#delayed-other` with the `/testids` content visible; rejects after `#bounce`
  with `returned to it` in the message.
- `waitUntil` resolution: a page object constructed with `navOptions: { waitUntil: "commit" }` and a per-call
  `{ waitUntil: "load" }` override both work for `goto()` and `expectThisPage()`.
- substring RegExp base `/localhost/` + `/\/testnav/` passes with no `[^/]*`; `/^http:\/\/localhost:9000$/` + `"/testnav"`
  passes; RegExp + RegExp passes on an item page; a path with the `i` flag passes; on the RegExp-base object
  `goto("/x")` throws at runtime and `goto("http://localhost:9000/testnav")` works.
- `goto()` on `testNavItem` throws at runtime (the compile error is covered by the unit type tests).
- `testNavItem.fullUrl.test(page.url())` is true on an item page and false on `/testnav`.

**Construction-time validation spec** `test/tests/pageObject/urls.spec.ts`: an empty base, a base with a path, a
scheme-less base, a base with a query or hash, a path without a slash, and a `//` path each throw at `new`, with the
label and the offending value in the message; a base and a path passed from variables construct fine.

**Existing specs.** [testPath.spec.ts:11](../test/tests/testApp/testPath.spec.ts#L11) and
[testPage.spec.ts:7](../test/tests/testApp/testPage.spec.ts#L7) change `gotoThisPage()` to `goto()`; everything else,
including [testPath.spec.ts:7](../test/tests/testApp/testPath.spec.ts#L7), [color.spec.ts](../test/tests/testApp/color.spec.ts),
and the page objects' own `waitForURL(this.fullUrl)` calls, stays as it is and must stay green.

**Running**: `./pack-build.sh`, then in `test/` `pnpm add -D "pomwright@file:../pomwright-test-build.tgz" --ignore-scripts`
and `pnpm exec playwright test --project=chromium --reporter=line` (AGENTS.md section 3).

---

## 6. Versioning

`major` changeset, riding 3.0.0. Breaking by the book: `gotoThisPage` removal, the `waitForLoadState` option
removal, the validated base and path, the `UrlMatcher` type on RegExp pages, the removed POMWright `"load"`
defaults, `goto` resolution of relative input, and the homepage `fullUrl` trailing slash. Each has a one-line
migration in 4.3 and in the docs.

---

## 7. Decisions

Decided with the user on 2026-10-07; 7.3, 7.4, 7.8, 7.9, and 7.13 revised on 2026-10-08.

- [x] 7.1 Design principle: URL handling mirrors Playwright's `baseURL` handling; the only addition is one `baseUrl`
  per page object. Timeouts follow the same principle: no POMWright timeouts or `waitUntil` defaults; each
  Playwright call keeps the timeout its config option gives it, overridable through method options.
- [x] 7.2 String `fullUrl` and `goto` targets are resolved with `new URL(input, baseUrl)`; no prefix joining.
- [x] 7.3 A string `baseUrl` is a non-empty origin: no path, query, hash, scheme-less, or empty value; ports and a
  trailing slash are fine. The parameter is a plain `string`, validated at construction with the class label.
  Compile-time literal types were considered and rejected (1.2).
- [x] 7.4 A string `urlPath` is `""` or starts with exactly one `/`. The parameter is a plain `string`, validated
  at construction. The guards stay internal; nothing new is exported for URLs except `UrlMatcher`. Supersedes the
  `"" | string` question and the earlier "insert the slash" option.
- [x] 7.5 When either part is a RegExp, `fullUrl` is a `UrlMatcher`: the base is tested against the URL's origin, the
  path against pathname plus search plus hash; string parts are exact; RegExp parts run as written with their own
  flags; no anchors are added, removed, or rewritten. Navigation builds the same matcher internally for string
  pages. Rejected: a single composed RegExp with a `[^/]*` filler, and a `RegExp` subclass.
- [x] 7.6 `goto()` without an argument replaces `gotoThisPage()` and runs the actions; `goto(target)` never runs
  them and has no actions option; `runPostNavigationActions` (default `true`; name may change at execution) on the
  no-argument form and on `expectThisPage`. `gotoThisPage` is removed.
- [x] 7.7 `goto(target)` is always available; on a RegExp base it is typed `` `${string}:${string}` `` and throws at
  runtime for non-absolute input; a target equal to `fullUrl` is ordinary navigation, undetected. The `Options`
  type parameter keeps its 2.x meaning and is still required for this.
- [x] 7.8 `expectThisPage` is one `page.waitForURL(matcher, { waitUntil, timeout })` call, then the actions.
  Playwright's timeout error is rethrown with the label, the expected URL or matcher, the found URL, and the original
  error as `cause`. Replaces the earlier `toHaveURL` plus `waitForLoadState` design, which bound a navigation wait by
  `expect.timeout` and summed ceilings.
- [x] 7.9 `expectAnotherPage` is one `page.waitForURL(url => !matcher(url), { waitUntil, timeout })` call followed by
  an immediate re-check that fails if the URL bounced back. Replaces the three-step design.
- [x] 7.10 No ignore-query option. Pages whose identity includes a query are RegExp page objects.
  `expectAnotherPage` is the exact negation of `expectThisPage`.
- [x] 7.11 Resolution, the guards, and the matcher live in `src/helpers/url.ts` with colocated unit tests; fixture
  is a new `/testnav` route plus `testnav` and `testnav-item` page objects and a validation spec.
- [x] 7.12 The unit tests' type-level assertions are enforced by vitest typecheck mode, enabled in
  `vitest.config.ts`; `vitest` is pinned exactly (`5.0.3`). The repo-wide `tsc --noEmit` step stays with the
  analysis section 4 plan.
- [x] 7.13 `NavigationOptions` is `{ waitUntil?, timeout? }`; the 2.x `waitForLoadState` option is removed. Both
  options resolve per call, then from the page object's `navOptions`, then to Playwright's defaults.

> Notes:

---

## 8. Execution order

1. Enable vitest typecheck mode and pin `vitest` (4.5); `pnpm test:unit` must stay green on the existing tests.
   Then `src/helpers/url.ts` with `url.test.ts` written first (red), then the implementation (green).
2. `pageObject.ts`, `navigation.ts`, `index.ts` (4.1 steps 2 to 7); `pnpm lint`, `pnpm test:unit`.
3. `/testnav` route, page objects, fixtures, `testNav.spec.ts`, `urls.spec.ts`; update the two `gotoThisPage` call
   sites; run the chromium project against the packed tarball.
4. Docs in `docs/v3`.
5. Changeset.
6. Full run: `pnpm lint`, `pnpm test:unit`, packed integration suite; fix anything red.
7. Ledgers: analysis ticks and notes, `DECISIONS.md`, `RELEASE-NOTES-3.0.0.md` flipped to *done*, `AGENTS.md`.
