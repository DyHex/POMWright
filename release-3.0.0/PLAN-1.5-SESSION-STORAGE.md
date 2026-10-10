# Plan: `SessionStorage` on Playwright's WebStorage API (analysis item 1.5)

Working document, kept in `release-3.0.0/` beside the analysis it answers (item 1.5 and the `session-storage.md`
bullets of section 5). File links are relative to this folder. Written 2026-10-08; reviewed and redesigned on
2026-10-09 (deferred `seed`, per-key codecs, single-key forms, origin guard, service-worker handling) and
2026-10-10 (server redirects through a proxy while a seed is pending, one seed registry per page, a never-firing
seed fails the test, fidelity mitigations). Every decision in section 7 is taken and mirrored in
[DECISIONS.md](DECISIONS.md) and [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md). The plan awaits execution
(section 8).

Every runtime claim below was verified against Chromium through the Playwright 1.62.1 installs in `test/` and at
the root, or against the installed Playwright type definitions and the Playwright release notes: the WebStorage,
`about:blank`, cross-origin and first-script claims on 2026-10-08; service workers, COOP, multi-origin chains, the
deferred seed and the harness's handling of listener errors on 2026-10-09; server redirects, the proxy, duplicate
routes, the page-close listener, the fidelity mitigations, the committed-flag registry and the iframe facts on
2026-10-10. The typed API was prototyped on
2026-10-09 and compiled with the repository's TypeScript 5.9.3 under `--strict --noUncheckedIndexedAccess
--exactOptionalPropertyTypes`, with every negative case as a consumed `@ts-expect-error`. Probe setup: a Node script
launching chromium from `test/node_modules` through `createRequire` of `test/package.json`, against a local http
server reachable on two origins, `http://localhost:<port>` and `http://127.0.0.1:<port>`; harness claims come from
temporary specs run with the line reporter and deleted afterwards. Every code reference points at the exact lines in
this repository. Example hosts are generic (`*.example`).

---

## 1. Intended contract

### 1.1 What the helper is for

Tests read, write and clear the page's `sessionStorage` with step reporting and batch operations; they seed an
origin's `sessionStorage` before the application loads there, so that the first script of the app already sees the
values, whatever kind of navigation takes the page there; and they declare once, per key, how structured values are
encoded, so that `set`, `get` and `seed` are typed by key. The helper mirrors the Web Storage API and Playwright:
values are strings unless a codec says otherwise, an operation needs a document on the origin whose storage it
touches, nothing is injected into every navigation, and nothing is registered on the page unless a seed is pending.

### 1.2 What Playwright provides today

- Playwright 1.61 added the `WebStorage` API: `page.sessionStorage` and `page.localStorage` with `getItem(name)`,
  `setItem(name, value)`, `removeItem(name)`, `clear()`, and `items()` returning `Array<{ name: string; value:
  string }>` (installed 1.62.1 types; release notes 1.61). It works right after a commit-only navigation (verified),
  so it does not depend on the app's scripts having run.
- Like `window.sessionStorage`, it needs a document on an origin. On `about:blank` both the API and `page.evaluate`
  throw `SecurityError: Failed to read the 'sessionStorage' property from 'Window': Access is denied for this
  document` (verified).
- `storageState` and `setStorageState` (1.59) cover cookies, `localStorage`, IndexedDB, passkeys and OPFS, not
  `sessionStorage`. The auth guide still says "Playwright does not provide API to persist session storage" and
  shows an `addInitScript` snippet. That snippet is not used here: an init script cannot be removed, runs on every
  navigation in the context, and overwrites whatever the app wrote in between, which is exactly what the helper
  exists to avoid.
- `sessionStorage` lives per tab and per origin: a same-origin navigation keeps it, a cross-origin navigation sees a
  different, empty storage, and an origin's entries survive in the tab while the page is on another origin (verified:
  seed B, seed A, load A, go to B, return to A; each first script saw only its own origin's entries, and A still held
  what was written on it).
- Frames. Playwright's WebStorage API exists on `Page` only (`sessionStorage: WebStorage` at `types.d.ts:5764`, no
  counterpart on `Frame`), so it reads and writes the main frame's document. Verified in the bundled Chromium: a
  same-origin iframe sees what the main frame writes; a cross-site iframe of B inside A shares B's tab-level storage,
  the one a top-level document on B in the same tab sees, with no third-party partitioning of `sessionStorage`
  observed; a sub-frame navigation is a navigation request whose `frame()` is not the main frame; and a top-level
  navigation started from inside an iframe with `top.location` is a main-frame navigation request.
- A document on an origin can be produced without the app: a `page.route` handler can fulfil a main-frame navigation
  request with a document of POMWright's own, and the browser runs its scripts on that origin. Non-navigation
  requests are passed on with `route.fallback()`. Inside a handler, `route.fulfill` must come before
  `page.unroute` of that handler (verified: the reverse order throws `route.fulfill: Route is already handled!`).
  Several routes matching one request run in reverse registration order; two routes that each fulfil a writer
  document for the same origin both ran, chaining two documents (verified).
- Redirects. A route handler is called only for the first URL of a redirect chain (`page.route` doc comment). A
  server 302 from A to B and a 303 after a POST to A both reached B without the route for B running (verified). A
  route that answers with a redirect is not re-routed either: the redirect target reached the server (verified). A
  script redirect (`location.href`) and a meta refresh are fresh navigations and are routed (verified).
- `route.fetch({ maxRedirects: 0 })` performs the request from Playwright with the context's cookies and returns a
  redirect unfollowed; `headers` can be supplied, including `sec-fetch-*`, and the server receives them;
  `route.fulfill({ response })` hands the fetched response to the browser; a POST is re-sent once with its body; a
  cookie set on the fetched redirect and one set by the fetched app page both land in the context and in
  `document.cookie` (all verified). `request.headers()` at interception carries `referer`, `user-agent` and the
  client hints, not `sec-fetch-*` (verified).
- Service workers. Playwright documents that `page.route` "will not intercept requests intercepted by Service
  Worker" and recommends `serviceWorkers: 'block'` for request interception (`page.route` doc comment, installed
  `playwright-core/types/types.d.ts:4316-4320`). Verified against a local origin whose app registers a worker
  (`skipWaiting`, `clients.claim`) that answers `mode === "navigate"` requests with an app shell: once the worker
  controls the context, it answers the next navigation to that origin on the controlled page and on a new page of
  the same context, the route handler never runs, and `response.fromServiceWorker()` is `true`. A worker that lets
  the request through (no `respondWith`) does not bypass the route. Three things restore the route, each verified:
  `serviceWorkers: "block"` (a `BrowserContextOptions` field and a `test.use` option,
  `playwright/types/test.d.ts:7691`), under which the worker never registers; a new context, which starts without
  the worker; and unregistering it from the test (`navigator.serviceWorker.getRegistrations()` then
  `unregister()`), after which the next navigation is not controlled and the app re-registers on its next load.
- An error thrown, or a promise rejected, inside a page event listener fails the running test at once with that
  error (verified with a temporary spec: a `framenavigated` listener that threw synchronously and one that rejected
  asynchronously both failed their test with the listener's message). An error thrown in a `page.on("close")`
  listener, which runs during fixture teardown, fails a test whose body had passed (verified), and `test.info()` is
  readable inside that listener: `status` was `passed` with zero `errors` for a passing body and `failed` with one
  error for a failing body (verified), so a helper can stay quiet when the test has already failed.
- A document carrying `<meta name="referrer" content="no-referrer">` sends no `Referer` on the navigation it
  initiates (verified).
- COOP and COEP on the app do not lose seeded entries: a document without COOP on the origin followed by the app
  served with `Cross-Origin-Opener-Policy: same-origin`, `same-origin-allow-popups`, or `same-origin` plus
  `Cross-Origin-Embedder-Policy: require-corp` saw the entries in its first script every time (verified).

### 1.3 Proposed API

```ts
type Codec<T> = { parse(raw: string): T; stringify(value: T): string };
function json<T>(): Codec<T>;                                   // ships; anything else is a user codec
type SessionStorageSchema = Record<string, Codec<unknown>>;
type Decoded<S, K> = K extends keyof S ? /* the codec's T */ : string;   // undeclared keys are strings

class SessionStorage<S extends SessionStorageSchema = {}> {
	constructor(page: Page, options?: { label?: string; origin?: string; schema?: S });
}
```

| method | forms | does |
| --- | --- | --- |
| `set` | `set(key, value)`, `set(entries)` | Writes through `page.sessionStorage.setItem`. A declared key is encoded by its codec and typed by it; an undeclared key must be a string, at compile time and at runtime. A string the caller produced with `JSON.stringify` is a string like any other: stored verbatim and read back by `get` as a string; a codec only moves that encode and decode into the helper and types the key. |
| `get` | `get()`, `get(key)`, `get(keys)` | `get()` returns the present entries, declared keys decoded; `get(key)` returns the decoded value or `null`; `get(keys)` returns every requested key, `null` when absent, as `getItem` does. A literal `[]` is a compile-time error (`NonEmpty<K>`); a computed empty list returns `{}`. |
| `clear` | `clear()`, `clear(key)`, `clear(keys)` | `clear()` removes everything; the others call `removeItem` per key. A literal `[]` is a compile-time error; a computed empty list removes nothing. |
| `seed` | `seed(key, value, options?)`, `seed(entries, options?)` with `options: { origin?: string }` | Makes sure the origin's `sessionStorage` holds the entries before the app's next load there, without leaving the current page. Already on the origin: writes at once. Otherwise: the entries become pending for the origin in the page's seed registry; the next main-frame navigation that reaches the origin, by `goto`, link, script redirect, meta refresh, form POST or server redirect, is answered with a document that stores the entries and then continues to the requested URL, so the app's first script sees them. `origin` comes from the option or the constructor; without either, throws. |

Step titles stay `Label.SessionStorage.method:`. `PageObject` passes `label`, the origin of a string `baseUrl`, and
the schema it was given (3.4).

How `seed` works when the page is elsewhere. Pending seeds live in one registry per `Page`, shared by every helper
on that page, so two page objects for the same origin merge their entries and one hop applies both. While at least
one seed is pending, the registry holds one `page.route` for all URLs, one `framenavigated` listener and one
`close` listener; when the last pending seed has been applied, all three are removed, and a page on which no
seed was ever called never has any of them. The route ignores everything but main-frame navigation requests. A
request for a pending origin is answered with a writer document, served at the requested URL, whose only script
stores the entries in the origin's `sessionStorage` and continues the navigation: `location.replace(url)` for a GET,
a re-submitted form with the same fields for an `application/x-www-form-urlencoded` POST. A request for any other
origin is fetched by Playwright with redirects disabled (`route.fetch({ maxRedirects: 0 })`, with the conditional
headers removed and the `Sec-Fetch-*` headers synthesised); a redirect answer becomes a document that performs the
same navigation itself (`location.replace` for 301, 302 and 303, the re-submitted form for a 307 or 308 POST), which
is a fresh navigation the route sees, so server-side hops and redirect chains reach the writer document; any other
answer is handed to the browser as is. Both documents carry `<meta name="referrer" content="no-referrer">`. The
entries stay in the origin's `sessionStorage`; no request for either document reaches a server; the app does not run
on them; and the page the test was on is left untouched until the app or the test navigates.

Removed: `setOnNextNavigation` (replaced by `seed`), the `waitForContext` option on every method (replaced by a clear
error when the page has no origin), the `reload` option of `set` (one line at the call site: `await page.reload()`),
and the generic `set<T>` / `get<T>` casts (replaced by the schema).

### 1.4 Edge cases, with the proposed answer

| case | today | proposed |
| --- | --- | --- |
| `set({ token: "abc" })`, app reads `sessionStorage.getItem("token")` | `"abc"` with quotes (1.5a) | `abc` |
| a structured value | JSON-encoded for every key, strings included, undocumented | declared once: `schema: { user: json<User>() }`; `set({ user })` stores JSON, `get("user")` returns `User \| null`; an undeclared object value is a compile-time error and a runtime `TypeError` naming the key |
| a JSON string for an undeclared key, `set({ user: JSON.stringify(user) })` | encoded again, so the app read a quoted, escaped string | stored verbatim; `get("user")` returns the string for the caller to parse |
| a value the app wrote that does not decode | `JSON.parse` fallback to the raw string, so `"123"` becomes a number ([L109-113](../src/helpers/sessionStorage.ts#L109-L113)) | a declared key whose stored value fails its codec throws naming the key and the raw value; an undeclared key is returned as stored, even when it looks like JSON |
| value `""` | read back as `null` (1.5f) | `""` |
| `get(["missing"])` | `{}` | `{ missing: null }` |
| `get([])` / `clear([])` as literals | everything (1.5e) | compile-time error |
| `get(list)` / `clear(list)` with a computed empty list | everything | `{}` / nothing: an empty list means no keys |
| page on `about:blank` | `SessionStorage context is not available.`, or an unbounded wait with `waitForContext` (1.5g) | throws `Label.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()` with Playwright's error as `cause` |
| a page object helper used while the page is on another origin | operates on whatever origin the page is on | `set`, `get` and `clear` throw `Label.SessionStorage.get: the page is on https://idp.example, not on this page object's origin https://app.example; another origin's sessionStorage is reachable only from a document on it. Use the page object for https://idp.example, or a standalone SessionStorage without an origin`; `seed` is exempt |
| a standalone helper without an origin | same | `set`, `get` and `clear` operate on the current origin; `seed` needs the `origin` option and throws without it |
| write for the app's first load | `setOnNextNavigation`: queued, written from a `framenavigated` listener after the new document exists, loses the race (1.5b), merges then wipes concurrent calls (1.5c), one failure leaks the listener (1.5d) | `seed(entries)` on a fresh page, then `goto`: `page.url()` stays `about:blank` after `seed`; the navigation is answered with the writer document; the app's first script sees the entries (verified) |
| seed B while the app on A is loaded, then the app hops to B by link | n/a | the page stays on A with its in-memory state; the click is intercepted; B's first script sees the entries; the final URL is the link target; one history entry is added, as for any navigation (verified) |
| the hop is a form POST, as in a SAML binding | n/a | the writer document re-submits the same `application/x-www-form-urlencoded` fields; B's server received the original body and B's first script saw the entries (verified) |
| the hop is a server 302, a 303 after a POST, or a chain A → A → B | n/a | the proxy fetches A's answer with redirects disabled and turns it into a client-side navigation that the route sees; B's first script saw the entries in all three cases, the POST reached A once with its body, and the cookie A set on the redirect landed (verified) |
| the hop is a 307 or 308 after a form POST | n/a | the redirect document re-submits the form to the redirect target; B received the POST with the original body and its first script saw the entries (verified for 307) |
| the hop is a POST with another content type (multipart, text/plain), directly or through a 307 | n/a | passed through unseeded; the `framenavigated` listener fails the test naming the method and content type |
| `page.goto` or `waitForURL` resolving on the writer document | n/a | 0 of 10 for `click` then `waitForURL`, 0 of 10 for `goto` (verified); the writer document replaces itself synchronously during parsing. With `waitUntil: "commit"` the committed document is the writer, so a commit-only wait followed by an immediate `evaluate` can race; documented |
| a `fetch`, an iframe or any sub-resource request while a seed is pending | n/a | passes through untouched, the seed stays pending and fires on the main-frame hop (verified for `fetch`, and for a sub-frame navigation to the pending origin, which was passed through, not seeded and not reported) |
| an iframe of the seeded origin inside the current page | n/a | shares that origin's tab-level storage, so it sees the seeded entries once they are written, and a same-origin iframe sees the main frame's writes (verified); the helper itself never targets a frame |
| a hop started from inside an iframe (`top.location = …`), same-origin or cross-origin | n/a | a main-frame navigation, seeded like a link (verified, one writer document each) |
| reading or writing an iframe's storage through the helper | `page.evaluate`, main frame only | out of scope, as Playwright's API is page-level; a same-origin iframe shares the main frame's storage anyway; documented |
| a navigation on A while a seed for B is pending | n/a | proxied: fetched by Playwright with the browser's cookies and handed back; the server sees the synthesised `Sec-Fetch-Site`, `Sec-Fetch-Mode: navigate` and `Sec-Fetch-Dest: document` and the browser's own `User-Agent`, `Referer` and client hints (verified) |
| a conditional navigation request (`If-None-Match`, `If-Modified-Since`) while proxied | n/a | the conditional headers are removed before `route.fetch`, so the server answers with a full response and no 304 is handed to a fulfilled navigation |
| `route.fetch` fails (network error) | n/a | the navigation is aborted with `failed`; the error is recorded as the registry's failure and thrown, with Playwright's error as `cause`, by the next `set`, `get`, `clear` or `seed` call on that page, or by the `close` listener if no call follows |
| the writer document's `sessionStorage.setItem` throws (quota, storage disabled by policy) | n/a | the writer renders the error and the keys under the title `POMWright seed failed` and does not navigate; the test's next wait fails on a page whose trace shows the cause |
| the hop is cancelled between the writer being served and its commit (a second click, a `goto` from the test) | n/a | the seed stays pending, because pending state is cleared only after the writer document has committed and issued its replace; the next navigation to the origin is answered again |
| the hop opens a new tab (`target="_blank"`, `window.open`) | n/a | not seedable: the new tab has its own `sessionStorage` and a page-scoped route cannot see a popup's first request; the original page's seed stays pending and fails the test at close; documented |
| a test inspects `response.request().redirectedFrom()` for a navigation made while a seed is pending | n/a | no chain: each converted redirect is a fresh navigation; documented |
| the referrer and `Sec-Fetch-Site` of the request the writer or redirect document issues | n/a | no `Referer` (the documents carry the no-referrer meta, verified); `Sec-Fetch-Site: same-origin`, because the browser issues it from a document on the origin; documented |
| `seed` twice for the same origin before the hop, from one helper or from two page objects on the same page | merged, racy | merged in the page's registry, later call wins per key; one route, one writer document (two routes would chain two documents and one helper's listener would report a false bypass; verified for the chaining) |
| `seed` while already on the origin | n/a | writes at once; the app sees the values on its next read, so reload or navigate if it reads only at startup |
| a seed that never fires | queue never flushed, silent | the `close` listener throws `Label.SessionStorage.seed: the seed for https://b.example (keys: token, user) was never applied: the page closed without navigating there; remove the seed call, or navigate to the origin before the test ends`, which fails the test (verified mechanism). Raised only when `test.info()` is available and reports `status: "passed"` with no errors (verified readable), so a test that failed, timed out or was skipped gets no second error, and a page closed outside a test, as with a worker-scoped fixture, raises nothing |
| failure while encoding at `seed` time | n/a | thrown by the `seed` call itself, before anything is registered |
| `seed` on a page object with a RegExp `baseUrl`, no `origin` option | n/a | throws: the origin is required |
| the app registered a service worker that answers navigations, then a pending seed for that origin | n/a | the worker answers the navigation, the route never runs, the app loads without the entries (verified). The `framenavigated` listener sees the origin with an unfired seed and throws, which fails the test at once (verified): `Label.SessionStorage.seed: the page navigated to https://app.example/orders but the pending seed for https://app.example was not applied; the navigation was not intercepted: a service worker registered by the app answered it, or a route the test registered after seed() fulfilled it; the app ran without the entries. Fixes: set use: { serviceWorkers: "block" } in the Playwright config; seed before the app's first load in this context; unregister the worker in the test before seeding; or let the test's own route call route.fallback() for that navigation` |
| a service worker that lets the navigation through (no `respondWith`) | n/a | the route answers; `seed` works (verified) |
| `serviceWorkers: "block"` in the context options or `test.use` | n/a | no worker registers; `seed` works (verified) |
| a route the test registered for the whole origin (`**/*`) | n/a | the registry's route is registered when the first seed becomes pending, so a route the test registered earlier is consulted after it; a route the test registers later is consulted first and, if it fulfils a main-frame navigation, bypasses the seed, which the listener reports |
| a whole-page navigation mock the test registered with `page.route`, `context.route` or `routeFromHAR` before `seed`, for a navigation on another origin while a seed is pending | n/a | bypassed: the proxy performs the real request and the real server answers (verified); the same mock registered after `seed` is consulted first and works (verified). Documented rule: register whole-page navigation mocks after `seed`; sub-resource and API mocks are unaffected because the proxy falls back for them |
| COOP or COEP on the app | n/a | entries survive (verified with the blank-document shape; re-verified on the deferred path by the integration spec) |
| Playwright below 1.61 | n/a | `page.sessionStorage` does not exist; decision 7.1 |
| Firefox and WebKit | not run in CI | `page.sessionStorage`, `page.route`, `route.fetch` and `location.replace` are cross-browser; `context.serviceWorkers()` is Chromium-only and is not used; a one-off local run of the spec on both is part of execution step 2 |

### 1.5 2.1.0 and 3.0.0 side by side

| aspect | 2.1.0 today | 3.0.0 |
| --- | --- | --- |
| backing API | `page.evaluate` against `window.sessionStorage` ([L94-117](../src/helpers/sessionStorage.ts#L94-L117)) | `page.sessionStorage`; peer floor `>=1.61.0` (7.1) |
| value type | any value; `JSON.stringify` on write ([L96](../src/helpers/sessionStorage.ts#L96)), `JSON.parse` on read ([L110](../src/helpers/sessionStorage.ts#L110)); the `set<T>` / `get<T>` generic is an unchecked cast | strings, stored and returned verbatim; per-key codecs declared once type `set`, `get` and `seed` (7.2, 7.13) |
| what the app sees after `set({ token: "abc" })` | `"abc"` with the quotes (1.5a) | `abc` |
| values the app wrote itself | parsed as JSON when they parse, raw otherwise ([L109-113](../src/helpers/sessionStorage.ts#L109-L113)) | the string as stored, or the declared codec's value |
| empty string | `null` (1.5f) | `""` |
| `get()` | all entries, decoded | present entries; declared keys decoded |
| `get(["a", "missing"])` | `{ a: … }`, missing keys omitted ([L197-205](../src/helpers/sessionStorage.ts#L197-L205)) | `{ a: "…", missing: null }` (7.3) |
| `get([])` / `clear([])` | everything / clears everything (1.5e) | literal rejected at compile time; computed empties are `{}` / no-op (7.4) |
| forms | `set(entries, options?)`, `get(keys?, options?)`, `clear()`, `clear(key)`, `clear(keys)`, `clear(options)`, `clear(keys, options)` | key or record on all four methods (7.14) |
| page without an origin | throws `SessionStorage context is not available.` unless `waitForContext: true` | throws at once with label, method, URL and the fix, Playwright's error as `cause` (7.6) |
| `waitForContext: true` | waits for the next main-frame `framenavigated` with no timeout (1.5g) | removed (7.6) |
| `reload` option on `set` | `page.reload()` after the write | removed (7.7) |
| seeding before the app loads | `setOnNextNavigation`: queued, written by Playwright from a `framenavigated` listener after the new document exists; the call resolves at once and the write's outcome is never reported | `seed`: the next navigation to the origin is answered with a writer document that stores the entries in the browser before the real document exists (7.5, 7.9) |
| the app's first script sees the seeded values | no, 0 of 10 (1.5b) | yes (verified for `goto`, link, script redirect, meta refresh, form POST, server 302, 303 after POST, 307 after POST, redirect chain) |
| where the seeded write lands | whatever document the next main-frame navigation produces, on any origin ([L164-171](../src/helpers/sessionStorage.ts#L164-L171)) | the named origin only (7.8) |
| seeding B while on app A, then the app hops to B | the write lands after B's document exists, too late | the page stays on A; B's first script sees the entries, whatever the hop |
| a server redirect to the seeded origin | too late, as above | seen through the proxy while the seed is pending (7.16) |
| two seeding calls before navigating, from one or two page objects | merged in one helper; two helpers each write | merged per origin in one registry per page (7.17) |
| failure during the seeded write | listener leaks, `isInitiated` stuck, unhandled rejection (1.5d) | encoding errors are thrown by `seed`; a bypassed seed fails the test at once |
| a seed that never fires | silent | fails a test that would otherwise pass when the page closes (7.18) |
| `page.url()` after seeding | unchanged | unchanged |
| what is registered on the page without a `seed` call | a `framenavigated` listener per `setOnNextNavigation` | nothing |
| the app registered a service worker that answers navigations | nothing detects it | the test fails at once with the three fixes (7.12) |
| which origin `set`, `get`, `clear` touch | whatever the page is on | the page object's origin, with an error elsewhere; standalone helpers: whatever the page is on (7.15) |
| step titles | `Label.SessionStorage.method:` | same |
| exports | the class; `SessionStorageState` not exported (1.9d) | the class, `json`, `Codec`, `SessionStorageSchema` |
| `PageObject` wiring | `new SessionStorage(page, { label })` | `new SessionStorage(page, { label, origin, schema })`; the schema type named in the `PageObject` options bag (7.13) |

---

## 2. How it works today

[sessionStorage.ts](../src/helpers/sessionStorage.ts), 251 lines, used by `PageObject` at
[pageObject.ts:69](../src/pageObject.ts#L69) and documented in [docs/v3/session-storage.md](../docs/v3/session-storage.md).

- Writes `JSON.stringify(value)` ([L96](../src/helpers/sessionStorage.ts#L96)) and reads `item ? JSON.parse(item) : null`
  ([L110](../src/helpers/sessionStorage.ts#L110)): strings reach the app quoted (1.5a), empty strings come back as
  `null` (1.5f).
- `hasContext` ([L39-43](../src/helpers/sessionStorage.ts#L39-L43)) probes `window.sessionStorage` with `page.evaluate`;
  `waitForContextAvailability` ([L45-73](../src/helpers/sessionStorage.ts#L45-L73)) waits for a `framenavigated` event
  without a timeout (1.5g).
- `setOnNextNavigation` ([L152-174](../src/helpers/sessionStorage.ts#L152-L174)) queues entries and writes them from a
  `framenavigated` listener; the queue is cleared after the write ([L159](../src/helpers/sessionStorage.ts#L159)), so a
  call that lands during the write is merged and wiped (1.5c); the listener has no `try`/`finally`, so a throw leaves
  `isInitiated` true (1.5d); and the write runs after the new document exists, so an app that reads storage in its
  first script never sees it (1.5b; 0 of 10 in the probe).
- `get` with an empty list returns everything ([L197](../src/helpers/sessionStorage.ts#L197)) and `clear` with an empty
  list clears everything ([L240](../src/helpers/sessionStorage.ts#L240)) (1.5e).
- Coverage: nine tests in [testPage.spec.ts:82-165](../test/tests/testApp/testPage.spec.ts#L82-L165), all round-tripping
  through the helper, so the quoting is invisible; none reads storage the way an app does, none covers an empty
  string, cross-origin isolation, or the first-script race.
- What is sound: the step titles, the `label` prefix, batch set/get/clear, and the `PageObject` wiring.

---

## 3. Design

### 3.1 Storage access and value types

Every read and write goes through Playwright's `WebStorage` API, so the helper adds no storage semantics of its
own: strings in, strings out, `null` for a missing key. The only POMWright logic is batching, the step titles, the
origin checks, the codecs, and `seed`.

Peer floor (decision 7.1): `page.sessionStorage` exists from Playwright 1.61; the peer range is `>=1.57.0 <2.0.0`
and the 1.57 floor is never exercised (analysis section 4). The floor is raised to `>=1.61.0` in 3.0.0, recorded in
the changeset and `AGENTS.md`. Rejected: a `page.evaluate` fallback when the API is absent, which would be two code
paths to keep identical for a version nobody runs.

Codecs (decision 7.13). A codec is `{ parse(raw: string): T; stringify(value: T): string }` and is declared once per
key in the `schema` option. `json<T>()` ships; the type `T` is a phantom generic, so a user codec for XML, base64
JSON, numbers or anything else is a few lines around a parser of the user's choosing (prototype-verified for an
`xml<Products>()` over a stub parser, a `number()` and a `base64Json<T>()`; wrong shapes rejected at compile time). No
parser is added as a dependency. Without a schema the helper is exactly Playwright's contract. Why per key rather
than per call: the correct encoding of a *string* depends on the app's storage layer. An Angular `ngx-webstorage`
app stores JSON for everything, strings included, so 2.1's quoting was right for it, while an app that reads a raw
bearer token gets the quotes. No heuristic can serve both, and 2.1's read-side fallback turned a stored `"01234"`
into the number 1234. A per-call `{ json: true }` was prototyped and rejected: a flag for the whole call cannot
decode a mixed store, and the all-entries read failed as soon as `token: "abc"` sat next to JSON values; it also
needed a generic repeated at every call and could not check key names. The declared schema handles mixed keys in one
call, checks key names and shapes where they are written, and matches how POMWright treats locators.

Empty lists (decision 7.4). The list overloads take `NonEmpty<K> = readonly K[] & ([K] extends [never] ? never :
unknown)`: a literal `[]` infers `K` as `never` and fails to compile, while `string[]`, `readonly string[]` and
`as const` tuples pass (prototype-verified). At runtime a computed empty list means no keys: `get` returns `{}` and
`clear` removes nothing, because mapping no keys over `getItem` or `removeItem` is no calls, and throwing would force
callers to special-case lists derived from data.

Origins (decision 7.15). `set`, `get` and `clear` need a document on the origin whose storage they touch. A helper
constructed with an `origin` (every page object with a string `baseUrl`) checks that the page is on that origin and
throws otherwise, naming both origins and the fix; another origin's `sessionStorage` is unreachable without leaving
the current document, so a silent read of the wrong origin is the only alternative. A helper without an origin
operates on whatever origin the page is on. `seed` is exempt, since reaching the origin is its job.

### 3.2 `seed`, the seed registry and the proxy

```ts
// src/helpers/sessionStorageSeed.ts: one registry per Page, shared by every helper on it
const registries = new WeakMap<Page, SeedRegistry>();

type Pending = { entries: Record<string, string>; label: string; site: string; fired: boolean; committed: boolean; target?: string };

class SeedRegistry {
	private pending = new Map<string, Pending>();
	private failure?: Error;

	async add(origin, encodedEntries, label, site) {                  // site: the seed() call site, captured by the helper
		const first = this.pending.size === 0;
		const p = this.pending.get(origin) ?? { entries: {}, label, site, fired: false, committed: false };
		Object.assign(p.entries, encodedEntries);                       // later call wins per key
		this.pending.set(origin, p);
		if (first) { await this.page.route(() => true, this.handler); this.page.on("framenavigated", this.onNavigated); this.page.on("close", this.onClose); }
	}
	throwIfFailed() { if (this.failure) { const e = this.failure; this.failure = undefined; throw e; } }   // every helper method calls this first

	private handler = async (route) => {
		const request = route.request();
		if (!request.isNavigationRequest() || request.frame() !== this.page.mainFrame()) return route.fallback();
		const url = request.url(), origin = new URL(url).origin, method = request.method(), type = request.headers()["content-type"];
		const pending = this.pending.get(origin);
		if (pending?.committed && url === pending.target) {              // the writer's own replace: applied, continue natively
			this.pending.delete(origin);
			await route.fallback();
			if (this.pending.size === 0) await this.teardown();           // after the writer's fulfill, never before
			return;
		}
		if (pending) {                                                   // the hop itself, or a retry after a cancelled one: writer document
			if (!reissuable(method, type)) { this.failure = unsupportedNavigation(pending, method, type); return route.fallback(); }
			pending.fired = true; pending.target = url; pending.committed = false;
			return route.fulfill({ contentType: "text/html", body: buildSeedDocument(pending.entries, url, method, request.postData()) });
		}
		let response;                                                    // any other navigation: proxy while pending
		try { response = await route.fetch({ maxRedirects: 0, timeout: 0, headers: proxyHeaders(request) }); }   // the test's navigationTimeout is the only ceiling
		catch (error) { this.failure = proxyFailure(url, origin, error); return route.abort("failed"); }
		const location = response.headers()["location"];
		if (response.status() >= 300 && response.status() < 400 && location) {
			const target = new URL(location, url).href, keep = response.status() === 307 || response.status() === 308;
			return route.fulfill({ contentType: "text/html", body: buildRedirectDocument(target, keep ? method : "GET", keep ? request.postData() : null) });
		}
		return route.fulfill({ response });
	};

	private onNavigated = (frame) => {
		if (frame !== this.page.mainFrame()) return;
		const url = withoutFragment(frame.url()), p = this.pending.get(originOf(url));
		if (!p) return;
		if (!p.fired || url !== p.target) throw this.failure ?? bypassError(p, frame.url());   // fails the test at once (verified)
		p.committed = true;                                              // the writer committed; its replace request comes next
	};
	private onClose = () => {
		let info; try { info = test.info(); } catch { return; }          // page closed outside a test: stay silent
		if (info.status !== "passed" || info.errors.length > 0) return;  // never a second error
		if (this.failure) throw this.failure;
		if (this.pending.size > 0) throw neverAppliedError([...this.pending.values()]);   // fails a passing test (verified)
	};
	private async teardown() { await this.page.unroute(() => true, this.handler); this.page.off("framenavigated", this.onNavigated); this.page.off("close", this.onClose); }
}
```

`buildSeedDocument(entries, url, method, postData)` and `buildRedirectDocument(url, method, postData)` are pure
functions returning `<!doctype html><meta name="referrer" content="no-referrer"><title>POMWright …</title><body>
<script>…</script></body>`. The seed document stores every entry with `sessionStorage.setItem` first, inside a `try`
whose `catch` renders the error and the keys into the document under the title `POMWright seed failed` and skips the
navigation, so a stall is explained by the page itself. Both documents then either `location.replace(url)` or build
a form with `method="post"`, `action=url` and a hidden input per field of `new URLSearchParams(postData)` and submit
it. JSON embedded in the script has `<` escaped as `\u003c`, so a value containing `</script>` cannot end the script.
`reissuable(method, type)` is `GET`, or `POST` with `application/x-www-form-urlencoded`. `proxyHeaders(request)`
copies `request.headers()`, removes `if-none-match` and `if-modified-since`, and adds `sec-fetch-mode: navigate`,
`sec-fetch-dest: document` and `sec-fetch-site` computed from the request origin and the `referer` (`same-origin`,
`same-site`, `cross-site`, or `none` without a referrer). `withoutFragment(url)` drops a `#…` suffix, because
`request.url()` never carries a fragment while `frame.url()` does. The helper captures the `seed` call site at
registration (`new Error().stack`, trimmed to the first frame outside POMWright) and stores it on the pending entry,
so the bypass, never-applied and unsupported-method errors point at the test line that seeded, not at a listener.

Why this design (decisions 7.5, 7.9, 7.16, 7.17, 7.18). It is what `setOnNextNavigation` promised, done
deterministically: the write happens in the browser, in a document on the origin, before the real document exists,
so there is no race by construction; nothing is written by Playwright after a commit. It never leaves the page the
test is on, so an origin can be seeded with data learned on the previous one, and the hop can be anything the app
does: link, script, meta refresh, form POST, or a server redirect, which only the proxy can see because Playwright
routes are not consulted for redirected requests. The proxy exists only while a seed is pending and only for
main-frame navigations: a test that never calls `seed` has nothing registered, and after the hop
nothing remains (verified: zero proxied navigations after the hop). One registry per page means two page objects on
the same origin cannot register two routes, which would chain two writer documents and make one helper's listener
report a false bypass. A seed that never fires is not silent: the `close` listener fails a test that would otherwise
pass, and the fix is to remove the seed call. Rejected: a `cancelSeed` method, for which no real use was found; it
would only have excused an unnecessary `seed` call, and adding a method later is non-breaking while removing one is
not. Pending state is cleared only after the writer document has committed and issued its own replace request: the
commit event, which the browser delivers before that request, marks the entry committed, and the handler then lets
the replace through natively and removes the entry, so the final document is never proxied (verified: zero proxied
navigations across `goto`, link, iframe-initiated and two-origin hops, one writer document each, and the browser's
own headers on the final request; clearing at the commit alone left that replace to be proxied, because the unroute
is asynchronous). A hop cancelled between serving and commit leaves the entry pending and the next navigation to the
origin is answered again; a commit at the origin with any other URL means some other document loaded there, which is
the bypass case.

Rejected on 2026-10-09 and 2026-10-10: the design of 2026-10-08, which navigated at once to a blank document on the
origin (simpler and synchronous, but seeding B while the app on A was loaded left A, so a test could not click the
control that performs the hop, and data learned on A could not reach B); the deferred design without the proxy
(lighter, but a server 302 to an identity provider, the commonest hop, failed with a message and had no fix for data
learned on A); a new tab (session storage is per tab; a tab from `window.open` gets a copy, not a shared store);
navigating to the origin and back (reloads the previous app and loses its in-memory state); answering the hop with a
redirect to a dedicated seed URL (a redirect answered by a route is not re-routed; verified).

Costs, all documented: while a seed is pending, navigations to other origins are fetched by Playwright with the
browser's cookies and handed back, which changes the request's `Sec-Fetch-*` headers from the browser's to
synthesised ones; the request the writer or redirect document issues carries no `Referer` and `Sec-Fetch-Site:
same-origin`; multipart and text/plain POST navigations are not re-issued and fail the test instead; the writer
document occupies the target URL for a few milliseconds (0 of 20 waits resolved on it; `waitUntil: "commit"` can);
a seed that never fires fails the test at the end rather than at the point of the mistake; a whole-page navigation
mock registered before `seed` is bypassed during the window, so such mocks are registered after `seed` (verified
in both orders), while sub-resource and API mocks are unaffected; a fixture that seeds an origin some tests never
reach now fails those tests, where 2.1 did nothing, and the fix is to seed in the test right before the hop; an app
that reads the `Referer` on the hop sees none; a test that inspects `response.request().redirectedFrom()` for a
navigation made while a seed is pending sees no chain, since each converted redirect is a fresh navigation; and
`route.fetch` runs with `timeout: 0`, so the test's `navigationTimeout` stays the single ceiling, as for every other
POMWright wait. Still to verify in
execution step 2: `route.fetch` under `ignoreHTTPSErrors` and client certificates, since the harness is plain http.

### 3.3 Errors

Every message starts with the step title (`${label}.SessionStorage.${method}`).

- A Playwright `SecurityError` on a page without an origin is rethrown as `…: the page has no origin yet
  (${page.url()}); navigate to the origin first or use seed()`, with the original error as `cause`.
- A helper with an origin, used while the page is on another: `…: the page is on ${current}, not on this page
  object's origin ${origin}; another origin's sessionStorage is reachable only from a document on it. Use the page
  object for ${current}, or a standalone SessionStorage without an origin`.
- `seed` without an origin: `…seed: an origin is required; pass { origin } or construct the helper with one`.
- An undeclared key with a non-string value: `…: value for "${key}" is not a string and no codec is declared for
  it`. A declared key whose stored value fails its codec: `…get: value for "${key}" could not be decoded: ${raw}`,
  with the codec's error as `cause`.
- A pending seed bypassed (section 1.4): thrown from the `framenavigated` listener, which fails the test at once.
  The message names the URL, the origin, both possible causes (a service worker, or a route the test registered
  after `seed` that fulfilled the navigation), and the fixes. For an unsupported navigation method the
  same path reports `cannot re-issue a ${method} ${content-type} navigation; the app loaded without the entries`;
  for a proxy failure it reports `could not fetch ${url} while a seed for ${origin} was pending`, with Playwright's
  error as `cause`, thrown by the next helper call on that page or by the `close` listener.
- Every seed-related error carries the `seed` call site captured at registration, so its stack names the test line
  that seeded.
- A seed never applied: thrown from the `close` listener, naming the origin and the keys and telling the reader to
  remove the seed call or navigate before the test ends; raised only when `test.info()` is available and reports a
  passed status with no errors.
- Other Playwright errors pass through.

### 3.4 `PageObject` integration

`UrlTypeOptions` at [pageObject.ts:21-24](../src/pageObject.ts#L21-L24) gains an optional `storage?: SessionStorageSchema`
member, read by a `StorageTypeFromOptions<Options>` helper that defaults to `Record<never, never>`, so the schema
travels in the options bag the class already has rather than in a third generic, which TypeScript cannot skip and
which would have forced every subclass with a schema to spell out the URL defaults. The constructor options at
[pageObject.ts:55](../src/pageObject.ts#L55) gain `sessionStorage?: { schema?: StorageTypeFromOptions<Options> }`, the
field becomes `readonly sessionStorage: SessionStorage<StorageTypeFromOptions<Options>>`, and
[pageObject.ts:69](../src/pageObject.ts#L69) constructs it with `{ label, origin, schema }`, where `origin` is
`new URL(baseUrl).origin` for a string `baseUrl` and absent for a RegExp one. A subclass declares the schema as a
value and names its type in the options:

```ts
const voiceStorage = { voiceCheckout: json<VoiceCheckoutModel>(), bankid: json<BankIdModel>() };

class VoiceAbonnement extends PageObject<Paths, { storage: typeof voiceStorage }> {
	constructor(page: Page) {
		super(page, baseUrl, "/voice/abonnement", { sessionStorage: { schema: voiceStorage } });
	}
}

class AccountPage extends PageObject<Paths, { urlPathType: RegExp; storage: typeof voiceStorage }> { /* … */ }
```

Verified with `tsc` under the repository's strict flags on 2026-10-10: a subclass with only `storage` keeps the
string URL defaults; one with `urlPathType: RegExp` and `storage` gets both; a subclass with no options is unchanged,
every key a string; a schema value that differs from the declared type is rejected; `get` and `set` are typed per key
through the page object. `UrlTypeOptions` now carries more than URL types; renaming it is left to plan 7 (analysis
1.9, types and exports), where a `PageObjectTypeOptions` alias can be introduced without churn here.

### 3.5 Sketch

```ts
export type Codec<T> = { parse(raw: string): T; stringify(value: T): string };
export const json = <T>(): Codec<T> => ({ parse: (raw) => JSON.parse(raw) as T, stringify: (v) => JSON.stringify(v) });
export type SessionStorageSchema = Record<string, Codec<unknown>>;
type Decoded<S extends SessionStorageSchema, K extends string> = K extends keyof S ? (S[K] extends Codec<infer T> ? T : never) : string;
type EntriesFor<S extends SessionStorageSchema, E> = { [K in keyof E]: Decoded<S, K & string> };
type NonEmpty<K extends string> = readonly K[] & ([K] extends [never] ? never : unknown);
type SeedOptions = { origin?: string };

export class SessionStorage<S extends SessionStorageSchema = Record<never, never>> {
	constructor(private readonly page: Page, private readonly options: { label?: string; origin?: string; schema?: S } = {}) {}

	set<K extends string>(key: K, value: Decoded<S, K>): Promise<void>;
	set<E extends Record<string, unknown>>(entries: EntriesFor<S, E>): Promise<void>;

	get(): Promise<[keyof S] extends [never] ? Record<string, string> : { [K in keyof S]?: Decoded<S, K & string> } & Record<string, string | Decoded<S, keyof S & string>>>;
	get<K extends string>(key: K): Promise<Decoded<S, K> | null>;
	get<K extends string>(keys: NonEmpty<K>): Promise<{ [P in K]: Decoded<S, P> | null }>;

	clear(): Promise<void>;
	clear(key: string): Promise<void>;
	clear<K extends string>(keys: NonEmpty<K>): Promise<void>;

	seed<K extends string>(key: K, value: Decoded<S, K>, options?: SeedOptions): Promise<void>;
	seed<E extends Record<string, unknown>>(entries: EntriesFor<S, E>, options?: SeedOptions): Promise<void>;

	// internals: step(method, body) wraps test.step and maps SecurityError; assertOnOrigin(method);
	// encode(method, entries) and decode(key, raw) apply the schema; seed() resolves the origin, encodes, writes
	// at once when on the origin, otherwise registryFor(page).add(origin, encoded, title).
}
```

The exact form of the all-entries return type is settled by the vitest typecheck in execution step 1; the contract
is: `Record<string, string>` without a schema; otherwise declared keys optional and decoded, and other keys typed
`string | <the declared codec types>`, the tightest index signature that does not conflict with the declared
properties, falling back to `unknown` only if that proves unworkable.

---

## 4. Implementation steps

### 4.1 Runtime (`src/`)

1. New `src/helpers/sessionStorageSeed.ts`: the `SeedRegistry`, `registryFor(page)`, and the pure functions
   `buildSeedDocument`, `buildRedirectDocument`, `reissuable`, `proxyHeaders`, `originOf`, and the error builders.
2. Rewrite [sessionStorage.ts](../src/helpers/sessionStorage.ts) per section 3: codecs, `encode`/`decode`, the
   forms, the origin guard, `seed` delegating to the registry.
3. Export `SessionStorage`, `json`, and the types `Codec` and `SessionStorageSchema` from [index.ts](../index.ts)
   (closes the `SessionStorageState` bullet of analysis 1.9d: the old type is gone, its replacements are exported).
4. [pageObject.ts](../src/pageObject.ts): the `storage` member of `UrlTypeOptions`, `StorageTypeFromOptions`, the
   constructor option, the field type, the constructor call (3.4).
5. [package.json](../package.json) `peerDependencies` to `>=1.61.0 <2.0.0`; [AGENTS.md:9](../AGENTS.md#L9) and the
   harness note follow.

### 4.2 Docs (`docs/v3` only)

- [session-storage.md](../docs/v3/session-storage.md): rewrite around the new API: strings by default; codecs with
  `json<T>()` and worked user codecs (`number()`, `base64Json<T>()`, an `xml<T>()` wrapper over a parser of the
  reader's choice); the schema on a page object and on a standalone helper; every form of the four methods; `null`
  for missing keys and the empty-list rules; the no-origin and wrong-origin errors; `seed` with how it works, what
  hops it supports (link, script redirect, meta refresh, `goto`, form POST, server redirects and chains, 307/308
  form POSTs), what it costs (the proxy window and exactly what it touches, the synthesised `Sec-Fetch-*` headers,
  the missing referrer, unsupported methods, the `waitUntil: "commit"` caveat), that nothing is registered without
  a `seed` call, the never-applied failure and its rule (seed in the test right before the hop, never
  defensively in a fixture), the rule to register whole-page navigation mocks after `seed`, and the two patterns (seed all origins first; seed the
  next origin with data learned on the current one); a *Frames* note (the helper and Playwright's API address the main frame; a same-origin iframe shares its
  storage; a cross-site iframe shares its own origin's tab storage in Chromium; a hop started inside an iframe is
  seeded); a *Multi-origin flows* section (methods act on the page
  object's origin; storage is per tab and per origin; apps hand state across origins through the URL, `postMessage`
  or a backend, never through shared storage); a *Service workers* section (symptom, the failure message, the three
  fixes and what each changes, `set` plus `reload` as the fallback when the worker must stay active); and a
  *Migration from 2.x* note (`setOnNextNavigation` to `seed`, `waitForContext` and `reload` removed, values no
  longer JSON-encoded unless declared, `get` returns `null` for missing keys, the generic casts replaced by the
  schema) with the usage cases side by side.
- [overview.md](../docs/v3/overview.md) section 2.9 and the API summary; [PageObject.md](../docs/v3/PageObject.md):
  the `storage` option type and the `sessionStorage` constructor option.
- Section 5 bullets for `session-storage.md` (JSON contract, the `addInitScript` remark) are closed by the rewrite;
  the `addInitScript` alternative is documented as rejected, with the reason from 1.2.

### 4.3 Changeset

`.changeset/session-storage-on-webstorage.md`, `"pomwright": major`: peer floor `>=1.61.0`; values are stored as
given unless a codec is declared for the key; `get(keys)` returns `null` for missing keys; literal `get([])` and
`clear([])` no longer compile and computed empties are no-ops; key-or-record forms on `set`, `get`, `clear`, `seed`;
`setOnNextNavigation` is replaced by `seed`, which intercepts the next navigation to the origin, sees server
redirects through a proxy active only while a seed is pending, fails the test when a service worker bypasses it, and
fails the test at the end when it was never applied; `waitForContext` and `reload`
are removed, with the one-line replacements; a page object's helper refuses another origin; the `set<T>` / `get<T>`
generics are replaced by the schema.

### 4.4 Analysis, release notes, decisions, AGENTS.md

Tick *Fix* on 1.5 (a to g) with notes; tick the two `session-storage.md` bullets in section 5; flip the plan 1.5
items in [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md) to *done* and append execution-time decisions to
[DECISIONS.md](DECISIONS.md); update [AGENTS.md](../AGENTS.md) (peer range, the `src/helpers/` row, the
`/teststorage` route and spec, a convention line for storage, pending changesets, revision line); set the plan's
status in [PLANS.md](PLANS.md).

---

## 5. Tests

### 5.1 Unit tests (vitest, `src/helpers/sessionStorage.test.ts` and `sessionStorageSeed.test.ts`)

The class needs a `Page` and `test.step`, so unit tests cover the pure parts, the registry with fakes, and the types:

- `originOf(url)`: `about:blank` and `""` give `undefined`, a URL gives its origin.
- `encode`: an undeclared string passes verbatim, an undeclared non-string throws naming the key, a declared key
  uses its codec, a codec that throws is reported with the key. `decode`: `null` stays `null`, an undeclared raw
  value passes even when it is `123` or `{"a":1}` (a guard against reintroducing a heuristic), a declared key
  parses, a parse failure names the key and the raw value. `json()` round-trips, including `""` and nested objects;
  a custom codec with its own `parse` and `stringify` is applied.
- `buildSeedDocument` and `buildRedirectDocument`: GET produces `location.replace` of the exact URL; POST produces a
  form with one hidden input per field, including repeated names, empty values and values with `&`, `=`, `+`, `%`
  and unicode; `</script>` and `<` inside values are escaped; the stored entries are byte-identical to the input;
  both documents carry the no-referrer meta; the seed document stores before it navigates, inside a `try` whose
  `catch` renders the error and the keys under `POMWright seed failed` and skips the navigation.
- `reissuable`: GET, urlencoded POST; not multipart, not text/plain, not PUT. `proxyHeaders`: conditional headers
  removed, `sec-fetch-*` synthesised with `same-origin`, `same-site`, `cross-site` and `none` from the referrer.
- `SeedRegistry` with a fake page (`route`, `unroute`, `on`, `off`, `mainFrame`) and fake routes and requests: the
  first `add` registers the route and both listeners, a second `add` for the same origin merges with later-wins and
  registers nothing new, a non-navigation request falls back without setting `fired`, an unsupported method records
  the failure and falls back, a pending-origin navigation sets `fired` and the target, fulfils, and leaves the entry
  pending, so a second request for the origin before any commit is answered again; `onNavigated` on the target URL
  (fragment ignored) marks the entry committed, throws the bypass error for a commit at the origin with `fired` unset
  or with any other URL, and ignores other origins and sub-frames; a request for the committed target is continued
  natively (`fallback`), removes the entry and tears down when nothing remains, with `unroute` after the writer's
  fulfil (order asserted); a sub-frame navigation request falls back without touching the entry; a redirect answer from the proxy becomes a redirect document (301/302/303 as GET, 307/308 with
  method and body), a non-redirect answer is fulfilled as is, `route.fetch` is called with `timeout: 0`, and a fetch
  failure aborts and records the failure; `throwIfFailed` throws the recorded failure once and clears it; every error
  carries the call site passed to `add`; `onClose` throws a recorded failure first, then the never-applied error
  naming origins and keys when seeds remain, only when the injected `test.info()` reports a passed status with no
  errors, and stays quiet when the status is anything else, when errors exist, or when `test.info()` throws.
- Error builders produce the messages of 3.3.
- Types (vitest typecheck mode): the ten forms of section 1.3 with `expectTypeOf`; a literal `[]` is a
  `@ts-expect-error` on `get` and `clear` while `string[]`, `readonly string[]` and `as const` pass; a declared key
  with the wrong shape, an undeclared key with an object value, and `set("n", "3")` on a `number()` key are
  `@ts-expect-error`; `get("declared")` is `T | null`, `get(["a", "declared"])` is `{ a: string | null; declared: T |
  null }`; without a schema `get()` is `Record<string, string>`; `Codec<Model>` is assignable to `Codec<unknown>`;
  `json<T>()` is `Codec<T>`; a `PageObject` subclass without a `storage` option type is unchanged, one with `storage`
  alone keeps the string URL defaults, one with `urlPathType: RegExp` plus `storage` gets both, and a schema value
  that differs from the declared type is rejected.

### 5.2 Integration tests (Playwright, `test/`)

**Fixture routes** in [server.js](../test/server.js):

- `GET` and `POST /teststorage`: a page whose first inline script snapshots `sessionStorage` into
  `<pre id="startup">`, whose body renders the current entries into `<pre id="current">` after load, the request
  method and posted fields into `<pre id="method">` and `<pre id="posted">`, and the `Referer` and `Sec-Fetch-Site`
  the server received into `<pre id="headers">`; a `<meta name="served-by">` naming the server; a link
  `#to-second-origin` to `http://127.0.0.1:9000/teststorage?hop=link`; a form `#post-to-second-origin` with
  `method="post"` and hidden fields (spaces, `&`, `=`, `+`, `%`, unicode, a repeated name) posting to
  `http://127.0.0.1:9000/teststorage`; a button `#script-to-second-origin` setting `location.href`; a button
  `#meta-to-second-origin` inserting a meta refresh; a link `#same-origin` to `/teststorage?second`; two iframes of
  `/teststorage/frame`, `#same-origin-frame` from the first origin and `#second-origin-frame` from the second. Query
  `coop=1` adds
  `Cross-Origin-Opener-Policy: same-origin`, `coep=1` adds `Cross-Origin-Embedder-Policy: require-corp`, `worker=1`
  registers `/teststorage/sw.js`.
- `/teststorage/frame`: a small page with a button `#hop-from-frame` that sets `top.location.href` to the second
  origin's `/teststorage?hop=frame`, and a snapshot of its own `sessionStorage` in `<pre id="frame-startup">`.
- `/teststorage/redirect?to=<url>&status=<302|303|307>`: answers with that redirect; `/teststorage/chain` redirects
  to `/teststorage/redirect?...` for a two-hop chain; `/teststorage/login` answers a POST with a 303 to the second
  origin; `/teststorage/login307` answers a POST with a 307 to the second origin. Links and forms on the page target
  them.
- `/teststorage/sw.js`: a worker (`skipWaiting`, `clients.claim`) answering every navigation with the same page
  marked `<meta name="served-by" content="service-worker">`; `/teststorage/sw-passthrough.js`: a worker whose
  `fetch` handler never calls `respondWith`.
- The second origin needs no new server: `http://127.0.0.1:9000` is a different origin from `http://localhost:9000`
  on the same express instance.

**Page objects and fixtures.** `pages/teststorage/teststorage.{locatorSchema,page}.ts` with a schema
`{ user: json<{ name: string; age: number }>() }`, fixture `testStorage`; a `testStorageSecond` page object on
`http://127.0.0.1:9000` for the multi-origin and origin-guard specs; a second page object on the first origin for
the shared-registry spec.

**Spec** `test/tests/testApp/sessionStorage.spec.ts`, replacing the nine helper tests in
[testPage.spec.ts:82-165](../test/tests/testApp/testPage.spec.ts#L82-L165):

- `set` then the app reads the raw value: `token` is `abc`, not `"abc"`; a declared `user` is stored as JSON and the
  app's `JSON.parse` of it equals the object; `get("user")` returns the object; `set("token", "x")` single form.
- empty string survives `set` and `get`; `get(["missing"])` is `{ missing: null }`; `get(keys)` with a computed empty
  list is `{}`; `get()` returns present entries with `user` decoded.
- `clear()` empties; `clear("a")` and `clear(["a"])` remove one; a computed empty list removes nothing.
- on a fresh page (`about:blank`) `set`, `get` and `clear` reject with the no-origin message naming label and method.
- origin guard: `testStorage` on the first origin, navigate to the second origin, `testStorage.sessionStorage.get()`
  rejects naming both origins; `testStorageSecond.sessionStorage.get()` works; a standalone helper without an origin
  works on either.
- codecs: a declared key whose stored value is not valid JSON makes `get` reject naming the key; an undeclared key
  with an object value makes `set` reject naming the key.
- `seed` then `goto` on a fresh page: `page.url()` is still `about:blank` after `seed`; the startup snapshot has the
  entries; no request for the page reached the server before `goto`.
- `seed` while already on the origin: `page.url()` unchanged, entries present after `reload`.
- hops from the first origin with a pending seed for the second, one parametrised test over a table of triggers:
  link, script redirect, meta refresh, form POST, server 302, POST then 303, POST then 307, two-hop chain. Each row
  asserts: still on the first
  origin until the trigger; the second origin's startup snapshot has the entries; `page.url()` is the final target;
  `served-by` is the server immediately after `expectThisPage` resolves; for the POST variants `#method` is `POST`
  and `#posted` has every original field intact; `#headers` shows no `Referer` and `Sec-Fetch-Site: same-origin` on
  the final request.
- after a seeded link hop, `history.length` grew by one and `goBack()` lands on the first origin's URL.
- the proxy window: with no `seed` call, a server 302 hop shows the browser's own `Sec-Fetch-Site: cross-site` in
  `#headers`; with a seed pending, a same-origin navigation on the first origin is proxied and shows the synthesised
  `same-origin`; after the hop, a further navigation shows the browser's own headers again.
- a `fetch` to the second origin and the `#second-origin-frame` iframe both load while a seed is pending, and the
  seed still fires on the main-frame hop.
- iframes: after a main-frame `set` and a reload of `#same-origin-frame`, its `#frame-startup` shows the value; a hop
  triggered by `#hop-from-frame` inside the second-origin iframe, and one inside the same-origin iframe, are seeded
  and served by exactly one writer document each; after the hop, a `#second-origin-frame` embedded on the second
  origin's page shows the seeded entries in its `#frame-startup`.
- `seed` twice for the same origin from one helper, and once each from two page objects on the same page: all keys
  present, later value wins for a repeated key, one writer document (the server saw one request for the target).
- seed both origins first, then the first-origin app hops by link: each startup snapshot has only its own entries;
  returning to the first origin shows its entries plus what was written there.
- `coop=1` and `coep=1`, parametrised: seed, then load; startup has the entries.
- never applied: a test marked `test.fail()` that seeds the second origin and ends on the first fails with the
  never-applied message.
- a link with `target="_blank"` to the second origin: the popup's startup snapshot has no entries, and the test,
  marked `test.fail()`, fails at close with the never-applied message.
- errors point at the test: the bypass and never-applied failures' stacks name the spec file and the line of the
  `seed` call.
- the cancelled-hop case (writer served, commit never happens, origin requested again) is covered by the registry unit
  test only, since the window between serving and commit cannot be hit deterministically from a spec.
- mock ordering: with a seed pending, a `page.route` mock for a first-origin page registered before `seed` is
  bypassed and the real page loads; the same mock registered after `seed` is served; an API mock registered before
  `seed` keeps working.
- service workers: with `worker=1` loaded first so the worker controls the page, a pending seed for that origin and
  a click to it fails the test with the bypass message (a `test.fail()` test); with `sw-passthrough.js` the seed
  works; in a `describe` with `test.use({ serviceWorkers: "block" })` the same flow seeds; on a fresh context `seed`
  first and then `worker=1` works; unregistering the worker in the test before seeding works.
- `PageObject` wiring: `testStorage.sessionStorage.seed({ … })` then `testStorage.navigation.goto()`; a RegExp-base
  page object's helper rejects `seed` without an origin and accepts `{ origin }`.
- step titles: the label prefix is checked through the error messages.

**Existing specs.** The nine tests in `testPage.spec.ts` move to the new spec in their new form; nothing else uses
the helper. The `/testids` and `/testnav` specs are untouched.

**Running**: `./pack-build.sh`, then in `test/` `pnpm add -D "pomwright@file:../pomwright-test-build.tgz" --ignore-scripts`
and `pnpm exec playwright test --project=chromium --reporter=line` (AGENTS.md section 3). The harness pins 1.62.1, so
the raised floor changes nothing there.

---

## 6. Versioning

`major` changeset, riding 3.0.0. Breaking: the peer floor, values no longer JSON-encoded unless declared, `get`
semantics for missing keys and empty lists, `setOnNextNavigation` replaced by `seed`, `waitForContext` and `reload`
removed, the origin guard on page object helpers, the generic casts replaced by the schema, a never-applied seed
failing the test. Each has a one-line migration in 4.3 and in the docs.

---

## 7. Decisions

Taken on 2026-10-09 unless noted; the chosen option is stated first.

- [x] 7.1 Storage access through `page.sessionStorage`; peer floor raised to `>=1.61.0`. Rejected: keeping the
  `>=1.57.0` floor with a `page.evaluate` fallback.
- [x] 7.2 Values are strings by default, stored and returned as given; no JSON encoding unless a codec is declared
  (7.13). Rejected: keeping 2.1's JSON encoding for every key.
- [x] 7.3 `get(keys)` returns `null` for a missing key, mirroring `getItem`; `get()` returns present entries.
- [x] 7.4 A literal `[]` on `get` and `clear` is a compile-time error (`NonEmpty<K>`); a computed empty list is `{}`
  / a no-op. Rejected: "empty means all", and throwing at runtime on a computed empty list.
- [x] 7.5 `setOnNextNavigation` is replaced by `seed`, a one-time interception of the next main-frame navigation to
  the origin answered with a writer document that stores the entries in the browser and continues the navigation
  (GET by `location.replace`, form POST by re-submission). Rejected: the `framenavigated` listener with fixes; the
  2026-10-08 design that navigated at once to a blank document on the origin; a new tab; navigate-and-return; a
  redirect to a dedicated seed URL.
- [x] 7.6 `waitForContext` is removed; a page without an origin fails at once with a message that names the fix.
- [x] 7.7 The `reload` option of `set` is removed.
- [x] 7.8 `PageObject` passes the origin of a string `baseUrl`, so `seed` needs no argument on string page objects.
- [x] 7.9 Mechanics of `seed`: immediate write when already on the origin; otherwise the page's registry (7.17),
  `fallback` for non-navigation requests, `fulfill` then `unroute`, pending entries merged with later-wins; multipart
  and text/plain POST navigations pass through and fail the test. (Amended 2026-10-10: the route matches all URLs
  while a seed is pending, see 7.16.)
- [x] 7.10 Fixture: `/teststorage` with the second origin `127.0.0.1:9000`, link, script, meta-refresh and form POST
  hops, server redirect routes (302, 303, 307, chain), a COOP and a COEP variant, two iframes of a `/teststorage/frame` page with a hop button, a header echo,
  `/teststorage/sw.js` and a pass-through worker; `testStorageSecond` and a second first-origin page object; the
  nine helper tests move from `testPage.spec.ts` to `sessionStorage.spec.ts`. (Amended 2026-10-10.)
- [x] 7.11 Method names stay `set`, `get`, `clear`, `seed`. Rejected: mirroring Playwright's `getItem` / `setItem` /
  `removeItem` / `items` one to one, which would duplicate `page.sessionStorage` without adding anything.
- [x] 7.12 A pending seed bypassed by a service worker is detected by the `framenavigated` listener and fails the
  test at once; the message names `serviceWorkers: "block"`, seeding before the app's first load in the context, and
  unregistering the worker in the test. Rejected: unregistering from the helper (destroys state, Chromium-only
  API); continuing silently; documenting only.
- [x] 7.13 Per-key codecs declared once through a `schema` option; `json<T>()` ships, `Codec<T>` and
  `SessionStorageSchema` are exported; an undeclared key is a string at compile time and at runtime; `PageObject`
  names the schema type through a `storage` member of its existing options bag and takes a `sessionStorage: { schema }`
  constructor option (amended 2026-10-10: the third generic of 2026-10-09 was dropped because TypeScript cannot skip
  generics, so every subclass with a schema would have had to spell out the URL defaults; verified with `tsc`).
  Rejected: a per-call `{ json: true }`
  (cannot decode a mixed store, verified; per-call generics; unchecked keys); a heuristic parse (2.1's); shipping any
  parser beyond JSON.
- [x] 7.14 Single-key and record forms on all four methods: `set(key, value)`, `get(key)`, `clear(key)`,
  `seed(key, value, options?)` beside the record forms.
- [x] 7.15 A helper constructed with an origin throws from `set`, `get` and `clear` when the page is on another
  origin, naming both; `seed` is exempt; a helper without an origin operates on the current origin.
- [x] 7.16 (2026-10-10) While at least one seed is pending, main-frame navigations to other origins are proxied:
  `route.fetch({ maxRedirects: 0 })` with the conditional headers removed and `Sec-Fetch-*` synthesised; a redirect
  answer becomes a client-side navigation document (GET for 301/302/303, the re-submitted form for a 307/308 POST);
  other answers are fulfilled as is; a fetch failure aborts the navigation and is reported. Nothing is proxied
  before the first `seed` or after the last pending seed has been applied. Rejected: detect-only (a 302 to an
  identity provider failed with no fix for data learned on the previous origin); proxying permanently.
- [x] 7.17 (2026-10-10) One seed registry per `Page`, shared by every helper on it: one route, one `framenavigated`
  listener, one `close` listener, entries merged per origin across helpers. Rejected: per-helper routes, which chain
  writer documents and make a helper's listener report a false bypass.
- [x] 7.18 (2026-10-10) A seed still pending when the page closes fails the test with a message naming the origin
  and the keys and saying to remove the seed call or navigate before the test ends; raised only when `test.info()`
  is available and reports a passed status with no errors. Rejected: staying silent; a report annotation only, which
  the line reporter never shows; a `cancelSeed` method, for which no real use exists, since the fix for an
  unnecessary seed is to not call it.
- [x] 7.19 (2026-10-10) Fidelity mitigations: the writer and redirect documents carry `<meta name="referrer"
  content="no-referrer">`, so the request they issue has no referrer rather than a misleading one; proxied requests
  carry synthesised `Sec-Fetch-Site`, `Sec-Fetch-Mode: navigate` and `Sec-Fetch-Dest: document`; conditional
  headers are stripped so no 304 reaches a fulfilled navigation; 307 and 308 keep method and body through the form
  document. `Sec-Fetch-Site: same-origin` on the final request is accepted and documented.
- [x] 7.20 (2026-10-10) Whole-page navigation mocks are registered after `seed`: a documented rule with a spec that
  proves both orders, not a guard, since the helper cannot see other handlers. The bypass message lists both causes,
  a service worker or a route the test registered after `seed` that fulfilled the hop.

> Notes: the decisions above were taken in review on 2026-10-09 and 2026-10-10 after the probes listed in the
> header. The comparison table of section 1.5 and the usage cases in the docs migration note come from that review.

---

## 8. Execution order

1. Pure helpers (`originOf`, codecs, `encode`/`decode`, the two document builders, `reissuable`, `proxyHeaders`,
   error builders) and the `SeedRegistry` with unit tests (red, then green); the class rewrite; `PageObject`
   generic, option and origin; exports; peer floor. `pnpm lint`, `pnpm test:unit`.
2. `/teststorage` routes with the redirect routes and both workers, page objects, fixtures, `sessionStorage.spec.ts`;
   move the nine tests; run the chromium project against the packed tarball; verify `route.fetch` under
   `ignoreHTTPSErrors` with a throwaway https probe if the harness cannot; run `sessionStorage.spec.ts` once on the
   `firefox` and `webkit` projects locally when the browsers are installed, and record the outcome in the ledger.
3. Docs in `docs/v3`.
4. Changeset.
5. Full run: `pnpm lint`, `pnpm test:unit`, packed integration suite; fix anything red.
6. Ledgers: analysis ticks and notes, `DECISIONS.md`, `RELEASE-NOTES-3.0.0.md`, `AGENTS.md`, `PLANS.md` status.
