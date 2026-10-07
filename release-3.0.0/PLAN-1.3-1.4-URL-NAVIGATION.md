# Plan: URL composition and navigation (analysis items 1.3 and 1.4)

Working document, kept in `release-3.0.0/` beside the analysis it answers (items 1.3 and 1.4, plus the `goto`
bullet of 1.10 and the `"" | string` bullet of section 2, which touch the same types). File links are relative to
this folder. Decisions are ticked in section 7 and mirrored in [DECISIONS.md](DECISIONS.md); consumer-facing
outcomes are tracked in [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md). Not yet executed.

Every runtime claim below was verified on 2026-10-07 against Chromium (and, where stated, Firefox and WebKit)
through the Playwright 1.62.1 install in `test/`, against the Playwright source in that install, against Node's
`URL`, or against the TypeScript compiler in the repository. Every code reference points at the exact lines in this
repository. Matcher outputs come from a prototype run in Node and Chromium; the unit tests in 5.1 turn that table
into the specification. Example hosts are generic (`*.example`).

**Decided (2026-10-07).** Design principle: POMWright's URL handling behaves exactly like Playwright's `baseURL`
handling, with one addition, a `baseUrl` per page object. Concretely: string URLs are resolved with `new URL`, not
prefix-joined; a string `baseUrl` is a non-empty origin; a string `urlPath` is empty or a single-slash path, enforced
at compile time and at runtime; when either part is a RegExp, `fullUrl` is a structured `UrlMatcher` that tests the
base against the URL's origin and the path against the rest, each regex used exactly as written; `goto()` without an
argument replaces `gotoThisPage()`; `expectThisPage` and `expectAnotherPage` use `toHaveURL`; the unit tests'
type-level assertions run through vitest typecheck mode. All decisions are in section 7.

---

## 1. Intended contract

### 1.1 Alignment with Playwright

Playwright resolves every `page.goto(input)` as `new URL(input, baseURL)` against the single `use.baseURL` of the
config. POMWright does the same thing against the `baseUrl` of the page object, so a project can have several bases
(one abstract page object per domain) without a disconnect from Playwright's behaviour. Where POMWright is stricter
than Playwright (1.2), it is to prevent a silent trap, and the behaviour inside the allowed inputs is identical.

### 1.2 String `baseUrl`: a non-empty origin

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
- Type ``BaseUrl = `${string}://${string}` ``, exported. Runtime `assertBaseUrl` parses the value and requires a
  non-empty host, pathname `/`, empty search and hash. Environment-driven bases are plain strings, so the guard is
  also the narrowing tool:

  ```ts
  const baseUrl = process.env.BASE_URL ?? "http://localhost:9000";
  assertBaseUrl(baseUrl); // throws with the reason, and narrows to BaseUrl
  ```

### 1.3 String `urlPath`: empty or a single-slash path

- `""` is the homepage page object. Otherwise the value starts with exactly one `/`. `"/"`, `"/login"`,
  `"/app/login"` are valid; `"login"`, `"?tab=1"`, `"#section"`, absolute URLs, and `"//other.example/x"` are not.
- Why `//` is rejected: under `new URL` a leading `//` is a protocol-relative reference, so `"//other.example/x"`
  would resolve to `https://other.example/x` (verified). Double slashes later in a path (`/a//b`) are valid URL
  syntax and are not policed.
- Type ``UrlPath = "" | `/${string}` ``, exported. A template expression such as `` `/account/${id}` `` type-checks,
  because its literal prefix survives, so computed paths need no cast. The compiler cannot express "not two
  slashes" and class constructors cannot take type parameters, so the `//` rule is runtime only.
- Environment variables work the same way as for the base. A partial path, `` `/account/${process.env.ACCOUNT_ID}` ``,
  is typed `` `/account/${string}` `` and needs no guard. A whole path from a variable is a plain `string` and goes
  through `assertUrlPath(value)`, which validates and narrows in one call.

### 1.4 `fullUrl` for two strings

`new URL(urlPath, baseUrl).href`. `"https://app.example"` + `"/login"` and `"https://app.example/"` + `"/login"`
give `https://app.example/login`; `"https://app.example"` + `""` gives `https://app.example/`, the form `page.url()`
reports; `"http://localhost:9000"` + `"/testpath"` is unchanged from today.

### 1.5 RegExp parts: a structured `UrlMatcher`

When either part is a RegExp, concatenating the two regexes would force the base to match the URL up to the exact
character where the path begins. That is why a substring base such as `/identity-provider/` would have needed a
`[^/]*` tail. The URL parser already provides the seam, so POMWright matches each part against its own slice:

- `origin = url.origin` (`scheme://host[:port]`); `rest = url.pathname + url.search + url.hash`.
- A RegExp base is tested against `origin`; a string base is exact origin equality after normalisation.
- A RegExp path is tested against `rest`; a string path is exact, with `""` meaning `/`.
- Every regex runs exactly as written, with its own flags and with `lastIndex` reset. POMWright adds, removes, or
  rewrites no anchors. `^` and `$` on the base refer to the origin; on the path, to the whole rest.
- `fullUrl` is then a `UrlMatcher`: a predicate `(url: URL) => boolean` accepted by `page.waitForURL` and by
  `expect(page).toHaveURL` (predicate form since Playwright 1.51, inside the `>=1.57.0` peer range; verified in
  1.62.1), with `.base`, `.path`, `.test(url)`, and a readable `toString()`.

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

All four type combinations were run through Playwright's assertions in Chromium: `waitForURL` and `toHaveURL`
passed on the page, their negations failed on the page, and both flipped off the page. Only string + string yields
a string `fullUrl`.

### 1.6 Navigation methods

| method | available when | does |
|---|---|---|
| `goto(options?)` | `fullUrl` is a string | `page.goto(fullUrl)`, then the post-navigation actions unless `runPostNavigationActions: false` |
| `goto(target, options?)` | always; `target` is `string` for a string base and an absolute-URL type for a RegExp base | string base: `page.goto(new URL(target, baseUrl).href)`, exactly Playwright's resolution against its `baseURL`; RegExp base: `target` must be absolute. Never runs the actions, has no actions option |
| `expectThisPage(options?)` | always | `expect(page, message).toHaveURL(fullUrl)`, then `waitForLoadState(waitUntil)` unless `"commit"`, then the actions unless `runPostNavigationActions: false` |
| `expectAnotherPage(options?)` | always | `expect(page, message).not.toHaveURL(fullUrl)`, then `waitForLoadState(waitForLoadState)`, then `not.toHaveURL` once more so a redirect that bounces back is caught |

`gotoThisPage` is removed. A `goto(target)` whose target happens to equal `fullUrl` is ordinary navigation: no
actions, no option, no detection.

Options. `NavigationOptions` keeps `waitUntil` and `waitForLoadState` and gains `timeout`, applied to `page.goto`,
`toHaveURL`, and `waitForLoadState`. `ThisPageOptions = NavigationOptions & { runPostNavigationActions?: boolean }`
(default `true`) is accepted only by the two this-page forms. Both assertions use Playwright's expect timeout (5 s by
default) when no `timeout` is given.

### 1.7 Edge cases, with the decided answer

| case | today | decided |
|---|---|---|
| `"https://app.example/"` + `"/login"` | `https://app.example//login` | `https://app.example/login` |
| `"https://app.example"` + `""` | `https://app.example` | `https://app.example/` |
| `"https://app.example/app"` as base | accepted, prefix-joined | throws: origin only |
| `"localhost:9000"` as base | navigates by browser fix-up, every URL assertion fails | throws at construction: `baseUrl must be an origin such as "http://localhost:9000"` |
| `"https://app.example/?a=1"` or `"https://app.example/#h"` as base | accepted | throws: origin only |
| `""` as base | `goto` works by accident, `expectThisPage` never passes | throws at construction: `baseUrl` is required |
| `"login"`, `"?tab=1"`, `"#section"` as path | `https://app.examplelogin` and similar | compile error and runtime throw |
| `"//other.example/x"` as path | `https://app.example//other.example/x` | runtime throw |
| `string` variable as base or path | accepted | narrow once with `assertBaseUrl` / `assertUrlPath`, which is also the runtime check; partial paths via template expressions need nothing |
| `goto("login")`, `goto("?tab=1")` on a string base | passed raw to `page.goto` | resolved against the page object's origin, as Playwright would against `use.baseURL` |
| `goto("https://other.example/x")` | passed raw | passed raw (absolute input wins in `new URL`) |
| `goto("/x")` on a RegExp base | `goto` unavailable | compile error (absolute-URL type) and runtime throw |
| `goto()` on a RegExp `fullUrl` | n/a | compile error and runtime throw |
| `goto("/testnav")` equal to `fullUrl` | n/a | ordinary navigation, no actions |
| `fullUrl` `https://app.example`, browser `https://app.example/` | `waitForURL` passes, `toBe` never does; test dies on the global timeout | passes; both sides normalised by `new URL` (verified) |
| page adds `?tab=1` or `#h` to a string page | exact `toBe` fails after the global timeout | fails within the expect timeout with `Expected string … Received string …` (verified); pages whose identity includes a query are RegExp page objects, e.g. `/^\/orders\?tab=\d+$/` |
| `"https://app.example"` + `/^\/user\/\d+$/` | `^https:\/\/app\.example^\/user\/\d+$`, never matches | matcher: origin exact, rest matches `/user/12`, not `/user/12/evil` |
| `/identity-provider/` + `/\/authorize/` | `identity-provider\/authorize` as one regex, never matches | matcher: both substrings match independently |
| `/https:\/\/(a\|b)\.example/` + `"/login"` | `http://evil?u=https://a.example/login` matches | matcher: origin `http://evil` fails the base |
| RegExp base with a path prefix, `/^https:\/\/app\.example\/app/` | concatenated | never matches; the base sees only the origin (migration note) |
| `/a/iu` + `/b/sv` | flags dropped | each regex keeps its own flags; nothing is merged |
| `expect(url).toMatch(poc.fullUrl)` on a RegExp page | works | type error; use `expect(page).toHaveURL(poc.fullUrl)` or `poc.fullUrl.test(url)` |
| `waitUntil: "commit"` | passed to `waitForURL` | no load-state wait after the URL match |
| `expectAnotherPage` while still on the page, `fullUrl` without the trailing slash | passes at once (1.4) | waits for the URL to leave, then fails with `Expected: not … Received: …` (verified) |
| `expectAnotherPage`, redirect bounces back to this page | passes | third step fails: the URL is back |
| `expectAnotherPage`, same path with a new query | passes | passes (exact semantics: the URL differs) |

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
- `expectAnotherPage` ([L117-136](../src/helpers/navigation.ts#L117-L136)): load state first, which returns at once
  if the current document is loaded, then `expect.poll(...).not.toBe(fullUrl)` for the expect timeout
  ([expect.js:13382](../test/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/lib/matchers/expect.js#L13382)).

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
  [L29](../playwright.base.ts#L29)).

### 2.4 What is correct today

The `UrlTypeOptions` plumbing and the string-vs-RegExp narrowing of `navigation`; the actions mechanism, labels,
default and per-call options; the `$`-anchored, `^`-free RegExp path shape; and the string case whenever `fullUrl`
already carries the trailing slash the browser reports.

### 2.5 What is wrong today

1. Four inconsistent composition rules; a fully anchored path regex never matches (1.3).
2. Flags are lost in every RegExp branch (1.3).
3. A substring base regex can never match, because concatenation requires the base to reach the path (1.3).
4. Double slash at the seam in `fullUrl` and `goto` (1.3).
5. `expectThisPage` spins forever on a normalisation mismatch and never shows a diff (1.4).
6. `expectAnotherPage` passes immediately in the same case and waits for the wrong thing first (1.4).
7. `goto` is gated on `urlPath` and resolves non-prefixed input against the wrong base (1.10).
8. No validation of `baseUrl` or `urlPath`: an empty base, a base with a path, a scheme-less base, a path without a
   slash, and a protocol-relative path are all accepted and fail later or silently.
9. Docs describe the branches as if they agreed ([docs/v3/PageObject.md:56-57](../docs/v3/PageObject.md#L56-L57),
   [L150-164](../docs/v3/PageObject.md#L150-L164)).

---

## 3. Design

### 3.1 `src/helpers/url.ts`: types, guards, resolution, matcher

```ts
export type BaseUrl = `${string}://${string}`;
export type UrlPath = "" | `/${string}`;
export type AbsoluteUrl = `${string}:${string}`;

export interface UrlMatcher {
	(url: URL): boolean;                 // predicate form for waitForURL and toHaveURL
	readonly base: BaseUrl | RegExp;
	readonly path: UrlPath | RegExp;
	test(url: string | URL): boolean;
	toString(): string;                  // e.g. origin /identity-provider/ + path /\/authorize/
}

export function assertBaseUrl(value: string, label?: string): asserts value is BaseUrl;
//   new URL(value) must parse with a non-empty host, pathname "/", no search, no hash. "" is rejected.
//   Message: `${label}: baseUrl must be an origin such as "https://app.example" or "http://localhost:9000"
//   (scheme, host, optional port, no path, query or hash); received "${value}".`
export function assertUrlPath(value: string, label?: string): asserts value is UrlPath;
//   "" passes. Otherwise must start with "/" and not with "//".
//   Message: `${label}: urlPath must be "" or start with exactly one "/"; received "${value}".`

export const isAbsoluteUrl = (input: string) => /^[a-z][a-z0-9+.-]*:/i.test(input);
export const resolveUrl = (input: string, baseUrl: BaseUrl): string => new URL(input, baseUrl).href;
//   a throw is rethrown with the input and base named

export const createUrlMatcher = (base: BaseUrl | RegExp, path: UrlPath | RegExp): UrlMatcher => {
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

export function composeFullUrl(base: BaseUrl, path: UrlPath): string;
export function composeFullUrl(base: BaseUrl | RegExp, path: UrlPath | RegExp): UrlMatcher;
export function composeFullUrl(base: BaseUrl | RegExp, path: UrlPath | RegExp) {
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
export type NavigationOptions = { waitUntil?: WaitUntil; waitForLoadState?: State; timeout?: number };
export type ThisPageOptions = NavigationOptions & { runPostNavigationActions?: boolean };

type GotoTarget<Base> = Base extends string ? string : AbsoluteUrl;

export type NavigationFor<Base, Full> = {
	expectThisPage(options?: ThisPageOptions): Promise<void>;
	expectAnotherPage(options?: NavigationOptions): Promise<void>;
	goto(target: GotoTarget<Base>, options?: NavigationOptions): Promise<void>;
} & (Full extends string ? { goto(options?: ThisPageOptions): Promise<void> } : object);
```

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

### 3.3 `expectThisPage` and `expectAnotherPage` on `toHaveURL`

```ts
private describeFullUrl() {
	return typeof this.fullUrl === "string" ? `"${this.fullUrl}"` : String(this.fullUrl);
}

async expectThisPage(options?: ThisPageOptions) {
	const waitUntil = this.resolveWaitUntil(options);
	const timeout = this.resolveTimeout(options);
	await test.step(`${this.label}: Expect this Page`, async () => {
		await expect(this.page, `${this.label}: expected URL ${this.describeFullUrl()}`).toHaveURL(this.fullUrl, { timeout });
		if (waitUntil !== "commit") await this.page.waitForLoadState(waitUntil, { timeout });
		if (options?.runPostNavigationActions !== false) await this.executeActions();
	});
}

async expectAnotherPage(options?: NavigationOptions) {
	const state = this.resolveWaitForLoadState(options);
	const timeout = this.resolveTimeout(options);
	const message = `${this.label}: expected to have left ${this.describeFullUrl()}`;
	await test.step(`${this.label}: Expect any other Page`, async () => {
		await expect(this.page, message).not.toHaveURL(this.fullUrl, { timeout }); // the URL has left
		await this.page.waitForLoadState(state, { timeout });                       // the new document has settled
		await expect(this.page, message).not.toHaveURL(this.fullUrl, { timeout }); // and did not bounce back
	});
}
```

Verified on 2026-10-07: a string `fullUrl` is resolved with `new URL` before comparison
([expect.js:12945](../test/node_modules/.pnpm/playwright@1.62.1/node_modules/playwright/lib/matchers/expect.js#L12945)),
so `https://app.example` matches `https://app.example/`; a matcher is evaluated as a predicate; failures print
Playwright's own output, with the custom message on top. For a string page: `Expected string: … / Received string:
… / Timeout: …ms`. For a matcher page:

```
LoginPage: expected URL origin /identity-provider/ + path /^\/logout$/
expect(page).toHaveURL(expected) failed
Expected: predicate to succeed
Received: "https://login.identity-provider.example/authorize?client=shop"
Timeout:  500ms
```

The negated form prints `Expected: predicate to fail` with the received URL. The wait is bounded by the expect
timeout and retries until then. `waitUntil` keeps its meaning: `toHaveURL` observes the URL at commit, and the
following `waitForLoadState` reproduces what `waitForURL(url, { waitUntil })` did; `"commit"` is not a load state,
so it skips the wait.

Timeouts change: today `expectThisPage` waits up to the navigation timeout and then without limit; now both
assertions use the expect timeout unless `NavigationOptions.timeout` is set. Documented as a behaviour change.

### 3.4 `PageObject` and exports

- `BaseUrlTypeFromOptions`: `RegExp` or `BaseUrl` (was `string`). `UrlPathTypeFromOptions`: `RegExp` or `UrlPath`
  (was `"" | string`). `FullUrlTypeFromOptions`: `UrlMatcher` or `string` (was `RegExp` or `string`).
- The constructor computes `label` first, then runs `assertBaseUrl` and `assertUrlPath` on string values, then
  `composeFullUrl`. `navigation` is typed `NavigationFor<BaseUrlTypeFromOptions<Options>, FullUrlTypeFromOptions<Options>>`.
- [index.ts](../index.ts) additionally exports the types `BaseUrl`, `UrlPath`, `UrlMatcher`, `ThisPageOptions` and
  the guards `assertBaseUrl`, `assertUrlPath`. `ExtractNavigationType`, `NavigationString`, and `NavigationRegExp`
  are internal today and are replaced by `NavigationFor`.

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
2. [pageObject.ts:19-30](../src/pageObject.ts#L19-L30): the three aliases per 3.4; [L49-80](../src/pageObject.ts#L49-L80):
   label first, guards, `composeFullUrl` from the helper; [L85-104](../src/pageObject.ts#L85-L104): delete.
3. [navigation.ts:9-26](../src/helpers/navigation.ts#L9-L26): `timeout`, `ThisPageOptions`, `NavigationFor`;
   `fullUrl` typed `string | UrlMatcher`.
4. [navigation.ts:63-90](../src/helpers/navigation.ts#L63-L90): one `goto` per 3.2; delete `gotoThisPage`.
5. [navigation.ts:96-136](../src/helpers/navigation.ts#L96-L136): the two assertions per 3.3.
6. [navigation.ts:142-153](../src/helpers/navigation.ts#L142-L153): `createNavigation` typed on both parts.
7. [index.ts](../index.ts): new exports (3.4).
8. No new runtime dependency.

### 4.2 Docs (`docs/v3` only)

- [docs/v3/PageObject.md:45-62](../docs/v3/PageObject.md#L45-L62): rewrite *Options* with the `BaseUrl` and `UrlPath`
  rules, the guards and the env-var recipes, and a *How `fullUrl` is composed* subsection: string resolution, the
  structured matcher with the table from 1.5, the origin-only consequence for base regexes, examples from the unit
  tests.
- [docs/v3/PageObject.md:86](../docs/v3/PageObject.md#L86), [L89](../docs/v3/PageObject.md#L89): property table
  rows for `fullUrl` (`string | UrlMatcher`) and `navigation` (`NavigationFor`).
- [docs/v3/PageObject.md:146-191](../docs/v3/PageObject.md#L146-L191): the four methods per 1.6, `timeout`,
  `runPostNavigationActions`, the expect-timeout default, load-state ordering, `"commit"`, a real failure message
  for each page kind.
- [docs/v3/PageObject.md:193-233](../docs/v3/PageObject.md#L193-L233): examples for a substring base regex, a
  `^…$` path, a query-bearing page as a RegExp page object with its own navigation method, and a *Migration from
  2.x* note (`gotoThisPage` → `goto()`, non-empty origin-only base, single-slash path, `//`, `fullUrl` is a
  `UrlMatcher` on RegExp pages, base regexes match the origin only, flags now apply, expect-timeout default, `goto`
  relative inputs now resolve against the page object).
- [docs/v3/overview.md:284-308](../docs/v3/overview.md#L284-L308) (2.8): bullets updated; `goto()` replaces
  `gotoThisPage()` in the usage comment; [L431](../docs/v3/overview.md#L431): the export list.

### 4.3 Changeset

`.changeset/url-composition-and-navigation.md`, `"pomwright": major`, with a *Breaking changes* heading:

- `gotoThisPage()` is removed; `goto()` without an argument replaces it and runs the post-navigation actions unless
  `runPostNavigationActions: false`. Migration: `grep -rn 'gotoThisPage(' --include=*.ts .` and drop `ThisPage`.
- A string `baseUrl` must be a non-empty origin (`scheme://host[:port]`, optional trailing slash); a string
  `urlPath` must be `""` or start with exactly one `/`. Both are typed (`BaseUrl`, `UrlPath`) and checked at
  construction; plain `string` variables need `assertBaseUrl` / `assertUrlPath`.
- `goto(target)` resolves relative input against the page object's `baseUrl` exactly as Playwright resolves against
  `use.baseURL`; on a RegExp base only absolute URLs are accepted.
- On a page object with a RegExp `baseUrl` or `urlPath`, `fullUrl` is a `UrlMatcher` instead of a `RegExp`: the base
  is matched against the URL's origin and the path against the rest, each regex as written with its own flags. Pass
  it to Playwright APIs as before, or use `fullUrl.test(url)` instead of `toMatch`. A base regex that contains a path
  prefix must move that prefix into `urlPath`.
- `expectThisPage` and `expectAnotherPage` use `toHaveURL` with the expect timeout; `NavigationOptions.timeout`
  overrides it. `expectAnotherPage` waits for the URL to change, then the load state, then checks again.
- `fullUrl` for a homepage page object is `https://app.example/` (trailing slash), the form the browser reports.

Under *Fixes*: `^`-anchored and substring path regexes; substring base regexes; the trailing-slash case; double
slashes; failures show a diff; the inverse false pass in `expectAnotherPage`.

### 4.4 Analysis, release notes, decisions

Tick *Fix* on 1.3 and 1.4 with notes; tick the `goto` bullet in 1.10 and the `"" | string` bullet in section 2.
[DECISIONS.md](DECISIONS.md) and [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md) carry the decisions and the
*planned* items from 2026-10-07; flip to *done* after execution.

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
- Types: `expectTypeOf` for the `composeFullUrl` overloads and the `FullUrlTypeFromOptions` aliases, and
  `// @ts-expect-error` lines for the negative cases in 1.2, 1.3 and 3.2 (`"login"`, `"localhost:9000"`, and `""`
  base literals, a plain `string` variable, `goto()` on a RegExp `fullUrl`, `goto("/x")` on a RegExp base,
  `runPostNavigationActions` next to a target, `const r: RegExp = fullUrl` on a RegExp page). The navigation cases use
  `declare const nav: NavigationFor<…>` and need no runtime page. Enforced by vitest typecheck mode (4.5); verified
  on 2026-10-07 that the mode reports an unused `@ts-expect-error` as a failing test, in 590 ms.

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
base (trailing slash, RegExp base, RegExp + RegExp, flags) are small classes extending `PageObject` inside the spec.

**Spec** `test/tests/testApp/testNav.spec.ts`:

- `goto()` lands on `fullUrl` and runs the actions once; `goto({ runPostNavigationActions: false })` runs none;
  `goto("/testnav")` runs none; `expectThisPage()` runs them, `expectThisPage({ runPostNavigationActions: false })` does not.
- `goto("testnav")`, `goto("?tab=1")`, and `goto("http://localhost:9000/testids")` resolve as in the parity table.
- trailing-slash base: `fullUrl` has one slash; `goto()` and `goto("/testnav")` land on it.
- query, hash, trailing slash: `expectThisPage({ timeout: 500 })` rejects with `Expected string` and `Received string`.
- delayed navigation: `testNavItem.navigation.expectThisPage()` passes with the default timeout; `{ timeout: 200 }`
  rejects with the matcher description in the message.
- `expectAnotherPage`: rejects within `{ timeout: 500 }` while on the page; passes after `#delayed-other` with the
  `/testids` content visible; rejects after `#bounce` because the third check sees the URL back.
- substring RegExp base `/localhost/` + `/\/testnav/` passes with no `[^/]*`; `/^http:\/\/localhost:9000$/` + `"/testnav"`
  passes; RegExp + RegExp passes on an item page; a path with the `i` flag passes; on the RegExp-base object
  `goto("/x")` throws at runtime and `goto("http://localhost:9000/testnav")` works.
- `goto()` on `testNavItem` throws at runtime (the compile error is covered by the unit type tests).
- `testNavItem.fullUrl.test(page.url())` is true on an item page and false on `/testnav`.

**Construction-time validation spec** `test/tests/pageObject/urls.spec.ts`: an empty base, a base with a path, a
scheme-less base, a base with a query or hash, a path without a slash, and a `//` path each throw at `new`, with the
label and the offending value in the message.

**Existing specs.** [testPath.spec.ts:11](../test/tests/testApp/testPath.spec.ts#L11) and
[testPage.spec.ts:7](../test/tests/testApp/testPage.spec.ts#L7) change `gotoThisPage()` to `goto()`; everything else,
including [testPath.spec.ts:7](../test/tests/testApp/testPath.spec.ts#L7), [color.spec.ts](../test/tests/testApp/color.spec.ts),
and the page objects' own `waitForURL(this.fullUrl)` calls, stays as it is and must stay green.

**Running**: `./pack-build.sh`, then in `test/` `pnpm add -D "pomwright@file:../pomwright-test-build.tgz" --ignore-scripts`
and `pnpm exec playwright test --project=chromium --reporter=line` (AGENTS.md section 3).

---

## 6. Versioning

`major` changeset, riding 3.0.0. Breaking by the book: `gotoThisPage` removal, the typed and validated base and
path, the `UrlMatcher` type on RegExp pages, the expect-timeout default, `goto` resolution of relative input, and
the homepage `fullUrl` trailing slash. Each has a one-line migration in 4.3 and in the docs.

---

## 7. Decisions

All decided with the user on 2026-10-07.

- [x] 7.1 Design principle: URL handling mirrors Playwright's `baseURL` handling; the only addition is one `baseUrl`
  per page object.
- [x] 7.2 String `fullUrl` and `goto` targets are resolved with `new URL(input, baseUrl)`; no prefix joining.
- [x] 7.3 A string `baseUrl` is a non-empty origin: no path, query, hash, scheme-less, or empty value; ports and a
  trailing slash are fine. Typed ``BaseUrl = `${string}://${string}` `` and checked by `assertBaseUrl`.
- [x] 7.4 A string `urlPath` is `""` or starts with exactly one `/`. Typed ``UrlPath = "" | `/${string}` `` and checked
  by `assertUrlPath`; the `//` rule is runtime only. Both types and both guards are exported. Supersedes the
  `"" | string` question and the earlier "insert the slash" option.
- [x] 7.5 When either part is a RegExp, `fullUrl` is a `UrlMatcher`: the base is tested against the URL's origin, the
  path against pathname plus search plus hash; string parts are exact; RegExp parts run as written with their own
  flags; no anchors are added, removed, or rewritten. Replaces the earlier anchoring, wrapping, flag-merging, and
  seam rules. `UrlMatcher` is exported. Rejected: a single composed RegExp with a `[^/]*` filler, and a `RegExp`
  subclass.
- [x] 7.6 `goto()` without an argument replaces `gotoThisPage()` and runs the actions; `goto(target)` never runs
  them and has no actions option; `runPostNavigationActions` (default `true`; name may change at execution) on the
  no-argument form and on `expectThisPage`. `gotoThisPage` is removed.
- [x] 7.7 `goto(target)` is always available; on a RegExp base it is typed `` `${string}:${string}` `` and throws at
  runtime for non-absolute input; a target equal to `fullUrl` is ordinary navigation, undetected.
- [x] 7.8 `expectThisPage` and `expectAnotherPage` on `toHaveURL` with a custom message naming the expected URL or
  matcher, bounded by the expect timeout; new `NavigationOptions.timeout`.
- [x] 7.9 `expectAnotherPage` is three steps: the URL leaves, the load state is reached, the URL is still away.
- [x] 7.10 No ignore-query option. Pages whose identity includes a query are RegExp page objects.
- [x] 7.11 Guards, resolution, and the matcher live in `src/helpers/url.ts` with colocated unit tests; fixture is a
  new `/testnav` route plus `testnav` and `testnav-item` page objects and a validation spec.
- [x] 7.12 The unit tests' type-level assertions are enforced by vitest typecheck mode, enabled in
  `vitest.config.ts`; `vitest` is pinned exactly (`5.0.3`). The repo-wide `tsc --noEmit` step stays with the
  analysis section 4 plan.

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
7. Ledgers: analysis ticks and notes, `DECISIONS.md`, `RELEASE-NOTES-3.0.0.md` flipped to *done*.
