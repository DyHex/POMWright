# Plan 15: `seed` on `addInitScript`

Working document, kept in `release-3.0.0/`. It replaces the mechanism behind `SessionStorage.seed()` (analysis item
1.5, plan 1.5's decisions 7.5, 7.9, 7.12 and 7.16, plan 10's R5 and R22) with a Playwright init script that is removed
once it has run, and fixes the harness's service-worker fixture page. The public API does not change. File links are
relative to this folder.

Written 2026-10-19, after a review of plan 1.5's design asked whether its premise still held. **Direction agreed
2026-10-19:** replace the design; the four open questions of that review answered as recommended (15.5 to 15.8); the
service-worker fixture fixed (15.10). **Reviewed 2026-10-19: every decision in section 9 taken as recommended (option
a)**, and mirrored in [DECISIONS.md](DECISIONS.md) and [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md).

**Executed 2026-10-19**, one commit per step: 7ad64e2 (1, the runtime and unit tests), abac3ff (2, the harness),
1deab3e (3, the docs), 0724ec7 (4, the changesets), and the ledger commit for step 6 that carries this note. Step 5
found nothing to fix: lint clean, 646 unit tests with no type errors, pack-test 1343 passed and 1 skipped (the download
on WebKit) on chromium, firefox and webkit with both type checks, the snippet check (191) and the coverage check (0
problems), the site build with every link valid; the race tests also passed `--repeat-each=5` on each engine. Step 1's
checks: `lib.dom` declares the Navigation API; the bundled `seedScript` serialises without helpers; a `seed` called 0 to
9 ms into a navigation resolved and applied 30 of 30 times per engine. As executed, `SeedPage` takes the registry's own
argument and result types (a generic `addInitScript<Arg>` is not assignable from Playwright's) and has no `url`, which
the registry does not need; `sessionStorageSeed.ts` is 311 lines, not 180 to 200, with its doc comments; the 204 test
continues with a `goto` (Chromium's actions wait on a 204 "navigation", seed or not) and the download test skips WebKit
(it opens the attachment as a document, seed or not). See DECISIONS.md's execution-time rows.

Every claim below was checked on 2026-10-19 with Playwright 1.64.0 (Chromium 156.0.8078.4, Firefox 157.0, WebKit 27.2)
in a scratchpad clone of 1ec765c, never in the working tree. Each probe ran on all three engines unless a row says
otherwise. The clone held a prototype `seed` as a standalone helper, temporary specs with their own config in its
`test/`, and probe routes added to its `test/server.js`. Between 1ec765c and 6aa953c (HEAD when this plan was written),
`src/` changed only in doc comments and `test/` did not change, so the results hold for HEAD; line references are to
HEAD.

---

## 1. Summary

Plan 1.5 rejected `addInitScript` for one reason: "an init script cannot be removed, runs on every navigation in the
context, and overwrites whatever the app wrote in between" ([PLAN-1.5](PLAN-1.5-SESSION-STORAGE.md) section 1.2,
[analysis 1.5](POMWRIGHT-2.1.0-ANALYSIS.md) notes). Since Playwright 1.59, `page.addInitScript()` returns a `Disposable`
that removes it, and the peer floor is 1.64.0. The route, the writer and redirect documents, the proxy, the continue
path, the fragment fix (R5) and WebKit's early `goto` (R22) all exist to work around a limit that no longer applies.

The new mechanism:

- `seed` adds one init script per pending origin. The script writes the entries only in the main frame, only on that
  origin, and only on the first arrival there (`navigation.activation.from` is `null`, so the previous document was on
  another origin).
- The registry disposes of the script when the main frame commits on the origin, and removes its listeners when nothing
  is left to watch.
- Navigations are never intercepted. The app's request, its headers, its history entry, its navigation type and what
  `page.goto` returns are exactly what they are without a seed.

What users see: the API, the codecs, the boxed step and the never-applied failure are unchanged. Most of
[What `seed` cannot do](../website/src/content/docs/docs/seeding-session-storage.md) goes away: service workers, mocks in
either order, multipart and `text/plain` forms, and `waitUntil: "commit"` now just work. Three errors disappear (bypass,
not re-issuable, proxy failure). Three new ones replace them, each thrown where the problem is found: a browser without
the Navigation API, a seed called while a navigation to its origin is already loading, and a write the browser refused.

`sessionStorageSeed.ts` shrinks from 412 lines to an estimated 180 to 200.

## 2. How it works today

All in [sessionStorageSeed.ts](../src/helpers/sessionStorageSeed.ts) unless named:

- `seed` writes at once on the origin, otherwise calls `registryFor(page).add(...)`
  ([sessionStorage.ts:427-451](../src/helpers/sessionStorage.ts#L427-L451)).
- `add` registers a `page.route` for every URL and the `framenavigated` and `close` listeners
  ([L261-274](../src/helpers/sessionStorageSeed.ts#L261-L274)).
- The route handler ([L276-343](../src/helpers/sessionStorageSeed.ts#L276-L343)) does one of three things:
  - answers a main-frame navigation to a pending origin with the writer document ([L154-170](../src/helpers/sessionStorageSeed.ts#L154-L170));
  - lets the writer's own replace through and removes the seed;
  - proxies every other main-frame navigation with `route.fetch({ maxRedirects: 0 })`, turning a redirect into a redirect document ([L172-178](../src/helpers/sessionStorageSeed.ts#L172-L178)).
- Helpers that only serve the route: the continue path ([L129-152](../src/helpers/sessionStorageSeed.ts#L129-L152)), the
  synthesised `Sec-Fetch-*` headers ([L71-117](../src/helpers/sessionStorageSeed.ts#L71-L117)), `reissuable`
  ([L65-69](../src/helpers/sessionStorageSeed.ts#L65-L69)) and `escapeForScript`
  ([L119-124](../src/helpers/sessionStorageSeed.ts#L119-L124)).
- `onNavigated` ([L345-364](../src/helpers/sessionStorageSeed.ts#L345-L364)) throws the bypass error for a commit the
  registry did not serve. `onClose` ([L366-379](../src/helpers/sessionStorageSeed.ts#L366-L379)) throws a recorded failure
  or the never-applied error. `throwIfFailed` ([L252-258](../src/helpers/sessionStorageSeed.ts#L252-L258)) is called by
  every helper step ([sessionStorage.ts:244](../src/helpers/sessionStorage.ts#L244)).

The reasons behind plan 1.5's design, separated:

| reason | depended on "cannot be removed"? | status |
| --- | --- | --- |
| an init script overwrites what the app writes on every later load | yes | wrong since 1.59; the remaining race is closed by the first-arrival guard (facts 5, 6) |
| a write from a `framenavigated` listener loses the race against the app's first script (1.5b) | no | still true: 0/20 per engine (fact 15). Kept as a rule |
| JSON-encoding every value (1.5a) | no | unrelated; codecs stay |
| leaving the page the test is on (the 2026-10-08 design) | no | an init script never navigates, so the page is never left |
| server redirects are invisible to a route after the first URL (the proxy) | no | true but irrelevant: an init script runs in whatever document commits |
| service workers bypass routes | no | irrelevant for the same reason (fact 11) |

## 3. Verified facts

| # | claim | probe | result |
| --- | --- | --- | --- |
| 1 | `page.addInitScript` returns `Promise<Disposable>`; `dispose()` removes the script | 1.64.0 `types.d.ts:327` and `Disposable` at `:21502`; probes 3, 4 | confirmed. An undocumented `exposeFunctions` option exists, built on bindings |
| 2 | the app's first inline script sees what the init script wrote | 10 rounds of `seed` then `goto` on a fresh page; 10 rounds of a link hop from A | 10/10 and 10/10 on every engine |
| 3 | a script added while the page is on a document does not run in that document | add a script, read its global | not run, with or without `exposeFunctions` |
| 4 | disposing in the main-frame `framenavigated` handler still lets that document run the script; after `await dispose()` the next document never runs it | every row of fact 9 disposed there; 100 rounds of `dispose`, then an immediate reload | all seeded; 0/100 re-runs per engine |
| 5 | disposal at commit alone leaves a window: the app's first script writes, then reloads or replaces on the same origin, and the script runs again | 100 rounds each of reload, same-origin `location.replace`, and remove-then-reload | overwritten: Chromium 1/100 in each variant, Firefox 1/100 (remove), WebKit 1/30 (reload, first run) and 1/100 (replace). Disposal took 1.4 to 19 ms, outliers 105 to 182 ms |
| 6 | `navigation.activation.from` is `null` exactly on a first arrival, and guarding the write with it closes fact 5's window | the support check; fact 5's probe with the guard; a guarded script never disposed | present in all three engines. 0/100 overwrites per variant per engine. The never-disposed guarded script skipped reload, replace and same-origin `goto`, and wrote after a cross-origin return and after `goBack` from A, so disposal is still needed |
| 7 | the guard cannot close one window: the app's first document on B leaves for a document that commits on A, which comes straight back to B before disposal completes | B writes, `location.replace` to an A page that replaces back to B; 50 rounds, then 2 × 150 with 6 parallel workers | 0/350 overwrites per engine. Not closed in principle |
| 8 | the scope guards are enough: `window === top`, `location.origin === origin` | a B iframe on A with `srcdoc`, `about:blank` and `data:` children; main-frame `about:blank` and `data:` while pending | nothing written in any frame, the seed stays pending, no page errors; the next B load applies it |
| 9 | every navigation the current design handles is seeded, and the app's request and navigation are identical to no seed | 14 scenarios × with/without `#/orders/7` × none/current/prototype: `goto`, link, script `location`, `top.location` from a cross-origin iframe, 302 (also from a URL with a fragment), 303 after POST, 307, 308, two-hop chain, urlencoded POST, multipart POST, `text/plain` POST, COOP, COOP+COEP | prototype: every cell seeded. `Referer`, `Sec-Fetch-Site/Mode/Dest/User`, `document.referrer`, navigation type, method, body and fragment equal no seed in all 72 comparisons, and token, method, body and fragment in the 12 multipart and `text/plain` runs. Current design: differs in all 72 (no `Referer`, `Sec-Fetch-Site: same-origin`, no `Sec-Fetch-User`, empty `document.referrer`); multipart and `text/plain` fail the test |
| 10 | `goto`'s return value | `const r = await page.goto(...)`, direct and through a 302 | current: a 200 `text/html` without the server's headers, and after a 302 the redirect URL with `redirectedFrom()` `null`. Prototype: the app's response, identical to no seed |
| 11 | a navigation answered by a service worker | a worker that answers navigations with its own page | prototype: seeded on all three. Current: bypass error on Chromium and Firefox; seeded on WebKit (3/3 link clicks and a `goto`) |
| 12 | whole-page mocks | a mock of another origin registered before or after `seed`; a mock of the seeded origin, before or after | prototype: every mock served, and the seeded-origin mock seeded. Current: a mock of another origin registered before `seed` is bypassed, and a seeded-origin mock registered after `seed` is a bypass error |
| 13 | `waitUntil: "commit"`, then an immediate read | 50 rounds | prototype: the app's document with the entries, 50/50. Current: Chromium "Execution context was destroyed" 50/50; Firefox and WebKit on the writer document at `/.pomwright-seed-continue` 50/50 |
| 14 | arrival by `goBack`; history; a navigation to the origin that does not commit (204, download) | probes 6 and 7 | `goBack`: both seeded; current reports the app's navigation as `navigate`, the prototype as `back_forward` (as without a seed). History grows by one in both. 204 and download: current leaves the page on the writer document (204 on Firefox and WebKit, download on Chromium and Firefox); the prototype leaves the page where it was, with the seed still pending. Chromium's 204 click timed out in every mode, including no seed, so that cell is inconclusive. No bfcache restore was seen on any engine |
| 15 | a write from a `framenavigated` listener is too late (the reason for the AGENTS.md rule) | 20 rounds | the first script saw it 0/20 per engine |
| 16 | a write the browser refuses (a 12 MB value hits the quota) | try/catch in the script, `console.error` | `QuotaExceededError` on all three; the console message reaches Node after `framenavigated`, and the app loads without the entries |
| 17 | the failure message arrives before the window closes | 20 rounds each with a plain app and with an app that replaces its location at once | always before the first `domcontentloaded` after the commit and before the next main-frame commit. WebKit delivered one late `domcontentloaded` from the previous page before the commit, so the window must start at the commit |
| 18 | an error thrown from a `console` listener fails the running test at once, and an `afterEach` hook reads it, with its rewritten stack, from `test.info().errors` | temporary specs | yes, on all three |
| 19 | a page without the Navigation API can be detected before anything is registered | `page.evaluate(() => typeof navigation?.activation)` on `about:blank`; the API deleted by an init script | `"object"` on `about:blank`; `"undefined"` when deleted |
| 20 | seeding while a navigation to the origin is already loading | 120 rounds per engine, varying the server's delay (0 to 11 ms) and when `seed` starts (0 to 8 ms) | Chromium: the commit always arrived before `addInitScript` resolved; 93 seeded, 27 not, so the order does not tell which. Firefox: commit before: 7, none seeded; commit after: 113, all seeded. WebKit: 120 after, all seeded |
| 21 | the guarded script leaves nothing in the app's document; a binding does | `Object.getOwnPropertyNames(window)` with and without | guarded script: no new globals. `exposeFunctions` adds `__playwright__binding__` and `__playwright__binding__controller__`, and its callback arrives after `framenavigated`. WebKit sent one extra early callback, not explained, not needed |
| 22 | several seeds | two seeds for B, `{ a: "1", b: "1" }` then `{ b: "2", c: "2" }`; a seed for A too; a seed while on A | B's first script saw `{ a: "1", b: "2", c: "2" }`; A saw only its own; on A, `seed` wrote at once |
| 23 | page-level scripts and popups | a link with `target="_blank"` to B | a page script does not reach the popup; adding one in the `popup` event is too late; a context script does |
| 24 | `dispose()` after the page closed | close, then dispose | resolves |
| 25 | the harness's worker page is broken | evaluate on the page `/teststorage/sw.js` serves | on all three, `#served-by` and `meta[name=served-by]` are not in the DOM and the snapshot script never runs. Cause: the escapes at [server.js:486](../test/server.js#L486) and [:489](../test/server.js#L489) produce a literal `<\/script>`, because `SW_PAGE` goes through `JSON.stringify` into a separate worker file, not an inline script. A worker page built without them works on all three |

Consequence of fact 25: in the harness test "a worker that answers navigations bypasses a pending seed"
([sessionStorage.spec.ts:687](../test/tests/testApp/sessionStorage.spec.ts#L687)), the `test.fail` is satisfied on
WebKit only by the failing `#served-by` expectation, since there is no bypass on WebKit (fact 11).

## 4. Intended contract

- **API, unchanged.** `seed(key, value, options?)`, `seed(entries, options?)`, `{ origin }`; codecs; the boxed step at the
  caller's line; on the origin already, it writes at once.
- **Elsewhere, nothing is intercepted.**
  - The next time the page's main frame arrives at the origin from another origin, the entries are stored before the
    document's first script.
  - That covers any navigation that commits: `goto`, a link, a script, a form POST of any encoding, a server redirect or
    chain, a COOP switch, `goBack`, a document a service worker or a route mock answers.
  - The app's request and navigation are exactly as without a seed.
  - Once applied, nothing of POMWright stays registered.
- **Several seeds** for one origin merge, later values winning. Each origin is applied on its own.
- **Failures**, each with the `seed` call's line in the stack:

| when | where it is thrown | message (final text taken from a probe at execution) |
| --- | --- | --- |
| no origin | at the call | unchanged: `Shop.SessionStorage.seed: an origin is required; pass { origin } or construct the helper with one` |
| the browser has no Navigation API | at the call, before anything is registered | `Shop.SessionStorage.seed: seed() needs the Navigation API (navigation.activation) to write only on the first arrival at https://pay.example, and this browser has none (<user agent>); use set() on the origin and reload instead` |
| the main frame committed on the origin while `seed` was registering | at the call; the script is disposed | `Shop.SessionStorage.seed: the page committed a document on https://pay.example while seed() was registering, so the app may have started without the entries; await that navigation before seeding, or seed before starting it` |
| the browser refused the write | from a `console` listener, failing the test at once | `Shop.SessionStorage.seed: could not write sessionStorage for https://pay.example (keys: orderId): QuotaExceededError: …; the app loaded without the entries` |
| never applied | at page close, only if the test has otherwise passed | unchanged |

- **What `seed` still cannot do:**
  - a hop that opens a new tab: unchanged, it fails at close. The docs show the workaround: the test's own
    `context.addInitScript`, or `set` on the popup and a reload.
  - a seed still pending at close: unchanged.
  - the window of fact 7: on the internal page only (decision 15.12).

## 5. Design

### 5.1 The script

```ts
/**
 * Runs in every new document of the page while a seed for `origin` waits. Writes only in the main frame, on the
 * origin, on the first arrival there: a reload or a same-origin hop has `navigation.activation.from`. Serialised by
 * Playwright, so it refers to nothing outside its body; the failure prefix comes in the argument.
 */
export const seedScript = ({ origin, entries, prefix }: SeedScriptArg): void => {
	if (window !== window.top || location.origin !== origin) return;
	if ((globalThis as { navigation?: { activation?: { from: unknown } | null } }).navigation?.activation?.from) return;
	try {
		for (const key of Object.keys(entries)) sessionStorage.setItem(key, entries[key] as string);
	} catch (error) {
		console.error(`${prefix}${JSON.stringify({ origin, error: String(error) })}`);
	}
};
```

The Navigation API is typed locally because the root `lib` (`es2022`, `dom`) may not declare it. That gets checked at
step 1, and the local type goes if `dom` has it. The bundled function must survive `Function.prototype.toString`, which
step 1 verifies against `dist/` with the harness.

### 5.2 The registry

One per page, as today (`registryFor`, a `WeakMap`). State:

- `pending: Map<origin, { entries, title, site, disposable }>`;
- `confirming: Map<origin, { keys, title, site }>`, for seeds applied whose failure message may still come;
- `apiChecked: boolean`.

`add(origin, entries, title, site)`:

1. **The Navigation API check (15.5)**, once per page: `page.evaluate(() => ({ ok: typeof navigation?.activation === "object", ua: navigator.userAgent }))`. It throws the error of section 4 if `ok` is false. Step 1 verifies what happens when the page is mid-navigation at that moment.
2. **The in-flight watch (15.8)**: a temporary `framenavigated` listener, registered before the script, that notes a
   main-frame commit on `origin`.
3. **Register** `page.addInitScript(seedScript, { origin, entries: merged, prefix })`. `merged` is the previous pending
   entries for the origin plus these, later winning.
4. **Remove the watch.** If it saw a commit: dispose the new script, leave the previous pending seed as it was, and throw
   the in-flight error.
5. **Store and replace.** Store the new disposable, then dispose of the previous one (15.4). The first pending seed
   registers the page listeners: `framenavigated`, `domcontentloaded`, `console`, `close`.

Listeners:

- `onNavigated(frame)`: main frame only.
  - Every entry in `confirming` is dropped: fact 17 says its message would already have arrived.
  - Then, if the frame's origin has a pending seed: delete it from `pending`, move it to `confirming`, and dispose of its
    script without awaiting (`dispose().catch(() => {})`, fact 24).
- `onDomContentLoaded()`: drops every entry in `confirming`, then tears down if idle.
- `onConsole(message)`: if the text starts with the prefix and its origin is in `confirming`, it throws the write-failure
  error with `atCallSite(error, site)` (fact 18).
- `onClose()`: unchanged. It throws `neverAppliedError` when the test has otherwise passed and something is pending.
- **Teardown when idle**: nothing pending and nothing confirming removes all four listeners.

Removed (15.9): `failure`, `throwIfFailed`, `anyPending`, `existingRegistryFor`, and the call in `SessionStorage.step`
([sessionStorage.ts:244](../src/helpers/sessionStorage.ts#L244)). Every failure is thrown where it is found.

### 5.3 What is deleted from `sessionStorageSeed.ts`

| lines | what |
| --- | --- |
| [1-11](../src/helpers/sessionStorageSeed.ts#L1-L11) | module comment (rewritten) |
| [15-24](../src/helpers/sessionStorageSeed.ts#L15-L24) | `SeedPage`: `route` and `unroute` replaced by `addInitScript` and `evaluate`, plus the two new events (15.15) |
| [32-46](../src/helpers/sessionStorageSeed.ts#L32-L46) | `PendingSeed`'s `fired`, `committed`, `target` |
| [59-178](../src/helpers/sessionStorageSeed.ts#L59-L178) | `withoutFragment`, `FORM_URLENCODED`, `reissuable`, `registrableDomain`, `secFetchSite`, `proxyHeaders`, `escapeForScript`, `HEAD`, `CONTINUE_PATH`, `continueScript`, `buildSeedDocument`, `buildRedirectDocument` |
| [182-213](../src/helpers/sessionStorageSeed.ts#L182-L213) | `bypassError`, `unsupportedNavigationError`, `proxyFailureError` |
| [232](../src/helpers/sessionStorageSeed.ts#L232), [237-258](../src/helpers/sessionStorageSeed.ts#L237-L258), [276-343](../src/helpers/sessionStorageSeed.ts#L276-L343), [381-396](../src/helpers/sessionStorageSeed.ts#L381-L396), [411-412](../src/helpers/sessionStorageSeed.ts#L411-L412) | `isRedirect`, `failure`, `matchAll`, `throwIfFailed`, the route handler, `anyPending`, the route teardown, `existingRegistryFor` |

Kept: `originOf`, `TestOutcome`, `ReadTestOutcome`, `describeKeys`, `neverAppliedError`, `registryFor`, `onClose`.
Added: `seedScript`, three error builders, the listeners above.

### 5.4 Options considered

| option | for | against | verdict |
| --- | --- | --- | --- |
| (a) keep the route design | no Navigation API dependency; no window like fact 7 | facts 9 to 14: fidelity, service workers, mocks, forms, `commit`, 204; 412 lines | rejected |
| (b) init script, disposed at commit | simple | fact 5: about 1% of fast same-origin reloads overwrite the app's value | rejected |
| (c) **(b) plus the first-arrival guard** | facts 6, 9 to 14 | fact 7's window, never observed; needs the Navigation API (checked, 15.5) | **recommended** |
| (d) (c) plus a route that holds the next navigation until disposal | would narrow fact 7 | brings back a route while a seed waits; a worker-answered navigation is not held anyway | rejected |
| (e) a binding to know the script ran | exact signal | puts two globals in the app's window (fact 21); arrives after `framenavigated`, so gives nothing | rejected |
| (f) one script for every origin, re-registered on each `seed` | one disposable | disposing per origin needs a re-registration anyway | rejected for (15.4) |

## 6. Implementation steps

### 6.1 Runtime (`src/`)

- [sessionStorageSeed.ts](../src/helpers/sessionStorageSeed.ts): section 5. The module comment describes the init
  script, the guard, the disposal and the listeners.
- [sessionStorage.ts](../src/helpers/sessionStorage.ts):
  - the module comment ([L1-9](../src/helpers/sessionStorage.ts#L1-L9)), without "keeps the navigation's fragment";
  - `step` without the `throwIfFailed` call, and its comment ([L235-249](../src/helpers/sessionStorage.ts#L235-L249));
  - the import ([L13](../src/helpers/sessionStorage.ts#L13));
  - `seed`'s doc comment ([L404-424](../src/helpers/sessionStorage.ts#L404-L424)): what happens elsewhere, and a `@throws`
    listing the new errors in place of "a service worker or a later route", "a form POST cannot be re-issued";
  - the `SessionStorage` class comment if it names the mechanism.
- No export changes; the API coverage check stays green.

### 6.2 Harness (`test/`)

[server.js](../test/server.js):

- `SW_PAGE` ([L484-489](../test/server.js#L484-L489)) without the two escapes (fact 25; 15.10).
- `POST /teststorage` also accepts `text/plain` (`express.text`) and `multipart/form-data` (its raw byte length), so the
  page shows what arrived.
- The fixture page gains a multipart form and a `text/plain` form to the second origin.
- New routes:
  - `/teststorage/race?mode=reload|replace|remove`: the first script writes the key or removes it, then reloads or
    replaces at once; the second load shows what it saw;
  - `/teststorage/204` and `/teststorage/download`;
  - `/teststorage/bounce?to=`: a page that replaces itself with `to` at once.
- The fixture comment above the routes is updated.

[sessionStorage.spec.ts](../test/tests/testApp/sessionStorage.spec.ts), test by test:

| test (line) | fate |
| --- | --- |
| seed then `goto` on a fresh page (148), seed on the origin (168) | kept |
| the hop matrix (252) | kept, plus multipart and `text/plain`. Each hop first runs without a seed and records `Referer` and `Sec-Fetch-Site`; the seeded run must match them (15.11). The `referer` null and `same-origin` assertions go |
| history grew by one (277) | kept; adds the navigation type `navigate` |
| the proxy exists only while a seed is pending (295) | replaced: a pending seed intercepts nothing, so a whole-page mock registered before `seed` answers |
| sub-resources and iframes pass through (332) | kept; adds a B iframe on A with `srcdoc`, `about:blank` and `data:` children: nothing written, the seed still pending |
| seeds merge, one document per hop (353), both origins first (381), COOP (405), never applied (412), new tab (421), page object's own origin (502) | kept |
| proxy failure (436) | deleted |
| whole-page mocks before and after (468) | rewritten: served in either order; a mock of the seeded origin is seeded |
| fragments (538 to 604) | kept as they are (native now) |
| `goto` returns on the app's document (605) | kept; adds the response's status and `X-Served-By: server` |
| iframes (621 to 676) | kept |
| a worker that answers navigations (687) | rewritten: no `test.fail`; the worker's page is seeded on all three engines |
| passthrough worker (703) | kept |
| blocked workers (719), fresh context (739), unregister (746) | deleted: they were fixes for a failure that no longer exists |
| new | the race (reload, replace, remove-then-reload; 10 rounds each; the app's value survives); the bounce (B, A, B: the app's value survives); `waitUntil: "commit"` (the app's document with the entries); arrival by `goBack` (seeded, type `back_forward`); 204 and download (the page stays, the seed stays pending, the next hop applies it); the Navigation API missing (an init script deletes it, then `seed` throws at the call); a value over the quota (fails the test) |

[callSite.spec.ts](../test/tests/pageObject/callSite/callSite.spec.ts) ([L39-64](../test/tests/pageObject/callSite/callSite.spec.ts#L39-L64))
used the proxy failure. It becomes a serial pair, as the registry case is:

- the first test (`test.fail`) seeds a value over the quota through a new function in the consumer file
  [callSite/sessionStorage.ts](../test/tests/pageObject/callSite/sessionStorage.ts) and navigates;
- an `afterEach` writes `test.info().errors[0].stack` to the per-project file (fact 18);
- the second test asserts the first frame is in the consumer's `sessionStorage.ts`.

`seedLater` stays if a test still uses it.

### 6.3 Unit tests (vitest)

- [sessionStorageSeed.test.ts](../src/helpers/sessionStorageSeed.test.ts) is rewritten around a fake `SeedPage` whose
  `addInitScript` returns a recording disposable and which can emit `framenavigated`, `domcontentloaded`, `console` and
  `close`:
  - `originOf`;
  - `seedScript` with stubbed globals (`vi.stubGlobal` for `window`, `top`, `location`, `navigation`,
    `sessionStorage`, `console`): writes on a first arrival in the main frame on the origin; nothing in a sub-frame,
    on another origin, with `activation.from` set; a throwing `setItem` logs the prefixed JSON;
  - the registry:
    - one script per origin; a merge registers the merged entries, then disposes the previous;
    - disposal at a main-frame commit on the origin, not on a sub-frame or another origin;
    - the in-flight commit throws and disposes the new script, keeping the previous pending seed;
    - the Navigation API check runs once per page and throws when missing;
    - a console failure inside the window throws with the call site; one after `domcontentloaded` or the next commit
      is ignored;
    - teardown removes all four listeners;
    - the close cases (kept from [L599-649](../src/helpers/sessionStorageSeed.test.ts#L599-L649));
    - the error builders.
- [stepLocations.test.ts](../src/helpers/stepLocations.test.ts) is unchanged: its `seed` is on the origin, and the
  Navigation API check is not on that path.
- [sessionStorage.test.ts](../src/helpers/sessionStorage.test.ts) is unchanged unless the `step` change touches it.

### 6.4 Docs (`website/`)

Every chain, message and header shown comes from a probe against the build (AGENTS.md section 9). Both Mermaid diagrams
are rendered and looked at.

- [docs/seeding-session-storage.md](../website/src/content/docs/docs/seeding-session-storage.md):
  - the introduction: `seed` is `addInitScript`, removed once the app's first document on the origin has run it,
    writing only on the first arrival;
  - *How it works* and its diagram;
  - *Two patterns* kept;
  - the "Seed as late as you can" proxy paragraph goes;
  - *What a seeded navigation looks like to the app* becomes one sentence: as without a seed;
  - *What `seed` cannot do* becomes the new table (section 4);
  - *Service workers* goes, leaving one sentence under *How it works*;
  - *Errors* rewritten.
- [api/class-sessionstorage.md](../website/src/content/docs/api/class-sessionstorage.md) `seed()`: **Throws**.
- [api/errors.md](../website/src/content/docs/api/errors.md) `### seed`: the new messages.
- [internal/seed-registry.md](../website/src/content/docs/internal/seed-registry.md), rewritten:
  - the problem (an init script runs before the first script; disposal alone leaves fact 5's window; the guard closes
    it; fact 7's window);
  - one registry per page;
  - the script;
  - disposal and the confirming window;
  - the in-flight check;
  - failures;
  - the reasons the route design was dropped.
- [docs/upgrading-from-2x.md](../website/src/content/docs/docs/upgrading-from-2x.md) (around L556-559): without "Register
  a mock for a whole page after `seed`" and the service-worker sentence.
- [internal/call-sites.md](../website/src/content/docs/internal/call-sites.md) (L9): "a seed's failure, when the app's
  document loads or when the page closes".
- `grep -rn -i "writer\|proxy\|pomwright-seed-continue\|re-issue\|bypass\|service worker" website/src/content/docs`
  returns nothing about `seed` afterwards.

### 6.5 Changesets

No new changeset, since 3.0.0 is unreleased and no consumer has seen the route design (15.13):

- [session-storage-on-webstorage.md](../.changeset/session-storage-on-webstorage.md):
  - the `seed` bullet (L25-32) describes the init script, without "intercepts", the proxy and the mock rule;
  - the service-worker bullet (L37-40) goes.
- [quality-review-fixes.md](../.changeset/quality-review-fixes.md): the fragment and WebKit `goto` bullets (L14-19) go.
  They fixed behaviour no release had.

### 6.6 Ledgers

- [DECISIONS.md](DECISIONS.md): rows are replaced, not kept (AGENTS.md section 6).
  - Plan 1.5:
    - removed: L92 (route design), L93 (bypass), L99 (proxy), L102 (fidelity mitigations), L103 (mocks after `seed`);
    - reworded: L100 (one registry: its reason becomes merging and one set of listeners) and L104 (robustness:
      only the call site survives);
    - kept: L101 (never applied).
  - Plan 1.5's execution-time rows:
    - removed: L113 (charset), L115 (proxy window), L117 (aborted proxy), L118 (`route.fetch` HTTPS);
    - reworded: L114 (`SeedPage`);
    - kept: L116 (WebKit partitioning).
  - Plan 10: L316 and L317 (fragment, WebKit `goto`) removed.
  - A new section, *Plan 15*, with section 9's decisions, and its execution-time rows when executed.
- [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md):
  - L125-132 and L137-139: the `seed` and service-worker items rewritten, marked *planned, plan 15*, then *done*;
  - L429-434: the fragment and WebKit `goto` fixes removed;
  - L498-502: the test description updated.
- [POMWRIGHT-2.1.0-ANALYSIS.md](POMWRIGHT-2.1.0-ANALYSIS.md): the 1.5 note (L239) and the section 5 note (L834) say
  `addInitScript` is used, with disposal and the guard, since plan 15.
- [PLAN-1.5-SESSION-STORAGE.md](PLAN-1.5-SESSION-STORAGE.md) and [PLAN-10-QUALITY-REVIEW.md](PLAN-10-QUALITY-REVIEW.md)
  (R5, R22): one line each at the top, "the `seed` mechanism is superseded by plan 15".
- [PLANS.md](PLANS.md): row 15, status.
- [AGENTS.md](../AGENTS.md):
  - section 1: the peer-floor list gains "1.59 the `Disposable` of `addInitScript`";
  - section 2: the `sessionStorageSeed.ts` description;
  - section 4: the `/teststorage` routes;
  - section 5 ([L228-236](../AGENTS.md#L228-L236)): the session storage bullet describes the init script, the guard,
    disposal at commit, the confirming window and the in-flight check;
  - section 5's rule: "Never reintroduce `addInitScript`" reversed; "a write from a `framenavigated` listener" kept,
    with fact 15 as its reason;
  - section 8 ([L327-328](../AGENTS.md#L327-L328)): "a seed continuation without the navigation's fragment, a
    `location.replace` from the writer document's own URL" removed; added "a route, a proxy or a document of
    POMWright's own for `seed`; a seed script without the first-arrival check; a binding exposed to the app's page";
  - the revision line.

## 7. Tests

Sections 6.2 and 6.3. Every spec runs on chromium, firefox and webkit; the seed specs need no `browserName` branch except
the existing WebKit iframe partitioning. The race tests run 10 rounds each: with the guard they are deterministic
(fact 6), so a single overwrite is a regression.

## 8. Versioning

No version or changeset of its own: the changes ride the existing `major` changeset for session storage (15.13). For a
2.x user, nothing in the migration changes: `setOnNextNavigation` becomes `seed`. Two lines of advice go away: register
mocks after `seed`, and the service-worker fixes.

## 9. Decisions

- [x] 15.1 **The mechanism.** (a) **Recommended:** `page.addInitScript` with its `Disposable`; no route, proxy, writer,
  redirect document or continue path. (b) Keep the route design. Agreed 2026-10-19.
- [x] 15.2 **The script's guards.** Main frame, the seeded origin, and the first arrival (`navigation.activation.from`
  is `null`). Without the last, fact 5. Agreed 2026-10-19.
- [x] 15.3 **Disposal** at the main frame's commit on the origin, without awaiting; listeners removed when idle.
  Agreed 2026-10-19.
- [x] 15.4 **Several seeds for one origin.** (a) **Recommended:** register the merged script, then dispose of the
  previous one; the in-flight check (15.8) covers a commit in between. (b) Dispose first, then register: a document
  created in between gets nothing. Agreed 2026-10-19: (a).
- [x] 15.5 **No Navigation API.** Checked once per page with `page.evaluate` before anything is registered; throws at
  the call, naming the user agent. Rejected: writing without the guard; reporting from the script after the app has
  started. Agreed 2026-10-19.
- [x] 15.6 **A refused write.** The script logs a prefixed `console.error`; a `console` listener throws it with the call
  site, failing the test at once. The listener acts only between the commit and the first `domcontentloaded` or next
  main-frame commit (fact 17). Rejected: ignoring it; a size check at seed time. Agreed 2026-10-19 (the window from
  fact 17, probed after).
- [x] 15.7 **New tabs.** The limitation stays and fails at close; the docs show the workaround. A context-wide option
  is left for later (adding it is non-breaking). Agreed 2026-10-19.
- [x] 15.8 **Seeding during a navigation to the origin.** A main-frame commit on the origin while `seed` registers
  disposes the script and throws from `seed`. Rejected: writing at once. Agreed 2026-10-19.
- [x] 15.9 **Recorded failures.** (a) **Recommended:** `failure`, `throwIfFailed` and the call in `SessionStorage.step`
  go; every failure is thrown where it is found. (b) Keep `throwIfFailed` for future deferred failures. Agreed
  2026-10-19: (a).
- [x] 15.10 **The worker fixture.** `SW_PAGE` without the escapes; the worker tests assert seeding on all three
  engines. Agreed 2026-10-19.
- [x] 15.11 **Header assertions.** (a) **Recommended:** each hop compares what the app received and saw (`Referer`,
  `Sec-Fetch-Site`, `Sec-Fetch-User`, `document.referrer`, navigation type, method, body, fragment) with the same hop
  without a seed, in the same test, the baseline first. This asserts the contract itself ("as without a seed"), on every
  engine, including fields nobody listed. (b) Assert fixed values per hop: they differ by hop type and engine (WebKit
  sends no `Sec-Fetch-User`; a meta refresh's `Referer` was not probed), would need a probed table for every pair, and
  check only what is listed. Agreed 2026-10-19: (a).
- [x] 15.12 **Fact 7's window.** (a) **Recommended:** described on the internal page with the numbers, not in the
  user's limits table, since it was never observed and a user cannot act on it. (b) A row in the user's table too.
  Agreed 2026-10-19: (a).
- [x] 15.13 **Changesets and notes.** (a) **Recommended:** no new changeset; edit the session storage changeset and drop
  the two quality-review bullets; rewrite and remove the release-note items. Git history is not rewritten: plan 15's
  commits sit on top of plan 1.5's and plan 10's; only the 3.0.0 changelog, which describes the change from 2.1.0,
  stops describing behaviour no release had. Precedent: 7105c92 edited two existing changesets in place. (b) A new
  `patch` changeset: the 3.0.0 entry would describe `seed` both ways and keep fixes for bugs no release had. Agreed
  2026-10-19: (a).
- [x] 15.14 **AGENTS.md.** (a) **Recommended:** reverse "never reintroduce `addInitScript`", keep the
  `framenavigated`-write rule, and add the do-nots of 6.6. Agreed 2026-10-19.
- [x] 15.15 **`SeedPage`.** (a) **Recommended:** `addInitScript`, `evaluate`, `on`/`off` for `framenavigated`,
  `domcontentloaded`, `console` and `close`, `mainFrame`, `url`. A real `Page` satisfies it (checked by the compiler,
  since `SessionStorage` passes its `Page`), the harness runs against real pages on three engines, and the unit tests
  pass a fake for the branches a browser cannot trigger on demand, as today. Agreed 2026-10-19.

## 10. Execution order

One commit per step. Each step runs `pnpm lint` and `pnpm test:unit`.

1. **Runtime and unit tests.** Sections 5, 6.1, 6.3. Verify:
   - the bundled `seedScript` survives serialisation (a seeded `goto` against the packed tarball on chromium);
   - whether `lib: dom` declares the Navigation API;
   - the Navigation API check when the page is mid-navigation.
   Adjust and record.
2. **Harness.** Section 6.2. `pnpm pack-test --reporter=line` on chromium, firefox and webkit, and the race tests
   repeated with `--repeat-each=5` on each engine.
3. **Docs.** Section 6.4, the messages taken from a probe against the build; `pnpm typecheck` (snippets and coverage)
   and `pnpm docs:build`; both diagrams looked at.
4. **Changesets.** Section 6.5; `pnpm changeset status` lists every pending changeset with its bump type, unchanged.
5. **Full run.** `pnpm lint`, `pnpm test:unit`, `pnpm pack-test --reporter=line` on all three browsers, `pnpm typecheck`,
   `pnpm docs:build`; fix anything red.
6. **Ledgers.** Section 6.6, and this plan's execution note.
