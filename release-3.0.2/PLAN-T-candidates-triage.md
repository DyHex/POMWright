# PLAN-T — triage of the candidates from the defect-review evaluation

## Why

Four reviews of `v3.0.1` ran on 2026-10-22 and 2026-10-23 as test runs of the `defect-review` skill (kept outside this
repository). Two reviewed the session storage helper as an area and two reviewed the `v3.0.0..v3.0.1` change set; in
each pair, one run followed the skill and one did not. Besides D1 and D2, which this branch already fixes, they reported
the candidates below. **None has been reproduced on this branch yet.** This plan reproduces each one against the packed
build of `fix/review-3.0.2`, gives it a verdict, and stops. A confirmed finding then gets a ledger ID and a plan of its
own, as in [PLANS.md](PLANS.md) (*How a finding moves through this folder*); nothing here changes code.

Sources, by run (reports in the skill's workspace, iteration 1):

- **A0**: area review without the skill. **A1**: area review with it.
- **C0**: change-set review without the skill. **C1**: change-set review with it.

Every code reference below was read on the branch at `8ccfbd4`. The behaviour is the reviewers' claim against `v3.0.1`.

## The candidates

| ID | Claim (from the runs) | Sources | Code on the branch | Kind |
| --- | --- | --- | --- | --- |
| T1 | With Playwright's step overlay on (`video: { show: { test } }`), a `seed` raced by a hop to its origin can resolve while the app started without the entries | C0-1, C1-D1 | `seed`'s origin check and commit watch run inside the step body ([sessionStorage.ts#L466](../src/helpers/sessionStorage.ts#L466), [sessionStorageSeed.ts#L187-L195](../src/helpers/sessionStorageSeed.ts#L187-L195)); Playwright 1.64's `test.step` awaits `_onUserStepBegin` (an overlay round trip) before the body (`playwright/lib/common/index.js:2410`, `lib/index.js:780`) | runtime, runner |
| T2 | `seed` called after the main frame has committed on the origin, while the app is loading (`await link.click(); await seed(…)`), writes at once and resolves; the app's first script ran without the entries. The table row says it fails | A1-DOC1 | write at once when the page was on the origin at the call ([sessionStorageSeed.ts#L187](../src/helpers/sessionStorageSeed.ts#L187), [#L198-L203](../src/helpers/sessionStorageSeed.ts#L198-L203)); row at [seeding-session-storage.md#L142](../website/src/content/docs/docs/seeding-session-storage.md#L142) | runtime, docs |
| T3 | A failed navigation to the seeded origin (refused connection, `route.abort()`, offline, an empty response) uses up the seed: on Chromium the retry loads the app without the entries and nothing fails; on Firefox the test fails with a refused-write message that blames an app load that never happened | A0-1, A1-D2 | `onNavigated` consumes a pending seed at any main-frame commit whose URL is on the origin ([sessionStorageSeed.ts#L290-L305](../src/helpers/sessionStorageSeed.ts#L290-L305)); the script tests `location.origin` and `navigation.activation.from` ([#L91-L96](../src/helpers/sessionStorageSeed.ts#L91-L96)) | runtime, three browsers |
| T4 | An app that declares a global `navigation` (`var navigation`, `function navigation() {}`, `window.navigation = …`) makes the first `seed` throw "this browser has none" | A0-3 | the check evaluates `typeof globalThis.navigation?.activation` in the current document's main world ([sessionStorageSeed.ts#L252](../src/helpers/sessionStorageSeed.ts#L252)) | runtime |
| T5 | On a main frame at `about:blank` that inherited an origin (a popup from `window.open()`), a helper bound to another origin writes into the inherited origin's storage, and a seed made there is lost without an error | A0-4, A1-D5 | `assertOnOrigin` passes when `page.url()` has no origin ([sessionStorage.ts#L268-L280](../src/helpers/sessionStorage.ts#L268-L280)) | runtime |
| T6 | Origins that are opaque in Node (`chrome-extension://abc`, `app://foo`, `file://host`) are accepted and stored as `"null"`; the origin check is then off and a seed never applies | A0-6, A1-D7 | `describeOrigin` returns `url.origin` whenever the host is not empty ([sessionStorage.ts#L107-L114](../src/helpers/sessionStorage.ts#L107-L114)); `assertBaseUrl` in `url.ts` accepts `file://host` too (A1, outside its scope) | runtime, unit |
| T7 | `seed({})` away from the origin registers a seed with no keys, and a passing test fails at close with "… (keys: ) was never applied" | A0-7, A1-D6 | `register` runs for empty entries; the message at [sessionStorageSeed.ts#L141](../src/helpers/sessionStorageSeed.ts#L141) | runtime, unit |
| T8 | With a key that is not a literal (`const key: string`), `get(key)` is typed `string \| null` but returns a decoded value, and `set(key, "x")` compiles and JSON-encodes a declared key | A0-8 | `Decoded<S, K>` gives `string` when `K` is `string` ([sessionStorage.ts#L85-L88](../src/helpers/sessionStorage.ts#L85-L88)) | types |
| T9 | Public signatures use types the root does not export: `AllEntries`, `Decoded`, `SeedOptions`, `SessionStorageOptions` (also `EntriesFor`, `NonEmpty`) | A1-D8 | [index.ts#L4](../index.ts#L4) exports `Codec`, `json`, `SessionStorage`, `SessionStorageSchema` only; `AGENTS.md` section 5: every public method returns a type a consumer can import from the root | types, packaging |
| T10 | A document served with `Content-Security-Policy: sandbox` gets "the page has no origin yet … or use seed()" on Chromium and WebKit, also from inside `seed`; Firefox gets the browser's raw error without the helper's label | A0-9 | `isNoOriginError` matches the browsers' wording ([sessionStorage.ts#L194-L195](../src/helpers/sessionStorage.ts#L194-L195)), the message at [#L257-L261](../src/helpers/sessionStorage.ts#L257-L261) | runtime, three browsers |
| T11 | An un-awaited `seed` as a test's last statement: the page closes before the registration ends, so no "never applied" failure; its rejection (`Target page, context or browser has been closed`) fails the next test in the worker, without the `seed` call site | C1-DOC1 | `onClose` reports only pending seeds ([sessionStorageSeed.ts#L335-L343](../src/helpers/sessionStorageSeed.ts#L335-L343)); docs at [seeding-session-storage.md#L94-L95](../website/src/content/docs/docs/seeding-session-storage.md#L94-L95) and [#L146](../website/src/content/docs/docs/seeding-session-storage.md#L146) | runtime, runner |
| T12 | `seed`'s `@throws`, its API page and *Error messages* leave out the encoding errors (`value for "orderId" is not a string and no codec is declared for it`) | A1-DOC2 | `@throws` from [sessionStorage.ts#L443](../src/helpers/sessionStorage.ts#L443) | docs |
| T13 | The errors POMWright throws from page listeners (a refused write, a never-applied seed) stop Playwright's later listeners for that event, including the context's | A0 (observation) | throws at [sessionStorageSeed.ts#L331](../src/helpers/sessionStorageSeed.ts#L331) and [#L340](../src/helpers/sessionStorageSeed.ts#L340) | runtime, runner |
| T14 | A navigation during a multi-key `set` leaves some keys written on the origin and fails with Playwright's raw "Execution context was destroyed", without the helper's label; nothing reaches the other origin | A0 (observation), A1-S1 | one `setItem` per key ([sessionStorage.ts#L294-L298](../src/helpers/sessionStorage.ts#L294-L298)); "a bad value writes nothing" at [session-storage.md#L114](../website/src/content/docs/docs/session-storage.md#L114); related to codex-S1 (no action) | runtime, docs |
| T15 | A decode error quotes the whole stored value, which can be long or a token that then reaches reports | A0 (observation), A1-Q2 | [sessionStorage.ts#L177](../src/helpers/sessionStorage.ts#L177) | design question |
| T16 | `register` stores the new pending seed before it awaits the previous script's disposal; a rejected disposal would fail the call after the pending seed changed, against "a call that fails leaves the pending seed as it was" | C1 (suspected) | [sessionStorageSeed.ts#L235-L242](../src/helpers/sessionStorageSeed.ts#L235-L242) | unit |
| T17 | A `storage` type declared without its schema value compiles | A1-D3 | duplicate of D8 (decided: option B, docs and a runtime hint) | none |

Already handled on this branch and not re-triaged: the on-origin overlap (D1), the `__proto__` key (D2), the stale
`AGENTS.md` at the tag (R3), the bundle-frame filter (opus-S2, rejected).

## How each is reproduced

All probes run against the packed build of this branch (`pnpm harness:install`), never against `src/` alone, and on
`v3.0.1` as well wherever the branch changed the code involved (T1, T2, T11, T14 touch the turns that D1 added), so the
verdict says whether 3.0.2 changes the behaviour. Probes are temporary: a spec under `test/tests/` deleted after the
run, a `tsc` project in a temporary folder under `test/`, or a Node script in the scratchpad (`AGENTS.md` section 3,
including its four pitfalls). Fake origins come from `page.route` where the fixture server has no route. The command
and the output of every probe go into this file's results table.

- **T1**: a temporary spec with `test.use({ video: { mode: "on", show: { test: {} } } })`. Two scenarios, 20 repeats
  each, chromium, firefox, webkit: an un-awaited `seed` followed by `goto` to its origin on a fresh page; `goto` started
  without `await`, then `await seed`. The app's first script records `sessionStorage`. Real if `seed` resolves and the
  record lacks the entries; a control project without the overlay must fail at the call or apply.
- **T2**: default config. A page on another origin clicks a link to the seeded origin, `await` the click, then
  `await seed`; also `goto(…, { waitUntil: "commit" })` then `seed`. Real if `seed` resolves and the app's first
  script saw no entries. Then decide what the row should promise, since writing at once on the origin is `seed`'s
  documented behaviour.
- **T3**: three browsers. A pending seed; the first `goto` to the origin fails (`route.abort()`, then an empty
  response, then offline mode); a second `goto` succeeds. Real if the second document starts without the entries and
  the test passes (Chromium), or fails with the refused-write message (Firefox). Control: no failed navigation.
- **T4**: a fixture page with `<script>var navigation = 1</script>` on the current origin, then `seed` for another
  origin. Real if it throws the "has none" message in a browser that has the API.
- **T5**: a page on origin A runs `window.open()`; on the popup (`about:blank`), a helper bound to B calls `set`; then
  the popup goes to A and reads `sessionStorage`. Real if the key is there. Also `seed` for A made on the popup.
- **T6**: a unit test of `normaliseOrigin` with `chrome-extension://abc`, `app://foo`, `file://host`, `ftp://host`;
  then the constructor with `file://host`. Real if any is accepted as `"null"`.
- **T7**: `seed({})` for another origin in a test that never navigates there. Real if the test fails at close.
- **T8**: a `tsc` project against the packed declarations: `const key: string = "user"`, then `get(key)`, `get([key])`,
  `set(key, "x")` with a `json` codec on `user`; compare with what the runtime returns (a spec).
- **T9**: a `tsc` project that names each of the six types from `pomwright`; real if the import fails while a public
  signature uses the type. Check `check-api-coverage.mjs` for how new exports would need API pages.
- **T10**: a fixture route served with `Content-Security-Policy: sandbox`, then `set`, `get` and an on-origin `seed`,
  three browsers. Real if a message misnames the cause or lacks the helper's label.
- **T11**: a spec of two tests: the first ends with an un-awaited `seed` for another origin, the second does nothing.
  `--repeat-each=3`, three browsers. Real if the first passes and the second fails with the closed-target error.
  Control: work after the un-awaited call, which should give "never applied" at the `seed` line.
- **T12**: read the `@throws`, the API page and *Error messages* against the messages `encodeEntries` throws.
- **T13**: read Playwright 1.64's client `EventEmitter.emit`, then a spec that adds a `console` listener after a seed
  and triggers a refused write. Real if the later listener does not run.
- **T14**: a 60-key `set` while the app leaves for another origin, three browsers, 5 repeats. Records how many keys
  landed and the error. Decide whether this is a docs sentence (the guarantee is about encoding) or a label on the
  error.
- **T15**: no probe; a design question for you, with its cost (a shorter message loses the value a user may need to
  debug).
- **T16**: a unit test in `sessionStorageSeed.test.ts` style, with a fake page whose first disposal rejects. Real if
  the call rejects and the pending seed holds the merged entries.
- **T17**: confirm D8's runtime hint appears for the case A1 describes; no new work.

## Verdict for each

As in [PLANS.md](PLANS.md): `confirmed`, `rejected` (with the reason), `duplicate of …` or `design question`. A
confirmed finding also records:

- **Severity** and **bump**, with the rules of [PLANS.md](PLANS.md) (*Version*);
- **Regression or not**: the same probe on `v3.0.1`;
- **Recommendation**: fix in 3.0.2 (a patch whose fix is small, or one that touches code this branch already changed,
  or a silent data problem), or a GitHub issue labelled `backlog` (anything larger, any minor or major).

## Results

Run on 2026-10-23 against the packed build of `8ccfbd4` (`pnpm harness:install`) and, where noted, a build of `v3.0.1`
loaded from the harness's own `node_modules` so both share one `@playwright/test`. Playwright 1.64.0: Chromium, Firefox
and WebKit. Temporary specs under `test/tests/triage/`, run with `pnpm exec playwright test <spec> --reporter=list`
(`--workers=1` for T11), a `tsc` 6.0.3 project for T8 and T9, a vitest file for T16; all deleted afterwards. A finding
whose code this branch did not change dates from 3.0.0 (`git diff v3.0.1..HEAD`), so it is not a regression.

| ID | What the probe showed | v3.0.1 | Verdict | Sev. | Bump | Recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| T3 | A pending seed for B; the first `goto` to B fails, then a second succeeds. **Chromium**: after `route.abort("failed")`, `route.abort("connectionrefused")`, offline mode or a real refused connection, the retry's first script saw `{}` and the test passed (2/2 each). **Firefox**: after a refused connection (aborted or real), the test failed with `could not write sessionStorage for … NS_ERROR_NOT_AVAILABLE …; the app loaded without the entries`, although no app loaded; after `abort("failed")` and offline it applied. **WebKit**: applied in every case | code unchanged | confirmed | medium | patch | fix in 3.0.2 (D18) |
| T1 | `video: { mode: "on", show: { test: {} } }`, 10 repeats. Un-awaited `seed`, then `goto`; and `goto` started, then `await seed`. **Overlay on**: Firefox and WebKit 10/10 `seed` resolved and the app started without the entries; Chromium 2–6/10 the same, the rest Playwright's raw `Execution context was destroyed`. **Overlay off**: every browser rejected with the in-flight error (WebKit applied 2/10) | the same | confirmed | low | patch | fix in 3.0.2 (D19) |
| T2 | `await click()` on a link to B, or `goto(B, { waitUntil: "commit" })`, then `await seed`: resolved, the app's first script saw `{}`, the entries were written after it; 5/5, every browser | the same | confirmed (the docs row) | low | none | fix the docs in 3.0.2 (D20) |
| T11 | The claim (the next test fails) was **not reproduced**: an un-awaited `seed` as the last statement, after a `goto` or alone on a fresh page, failed its own test with `was never applied` at the `seed` line, 54/54 across both builds and every browser; the next test passed. Forcing the page to close during registration (`void seed(); await page.close()`) fails the right test, but with Playwright's raw `page.evaluate: Target page, context or browser has been closed`: no label, no call site, against seeding-session-storage.md "every one of these failures points at the line that called `seed`" | the same | confirmed (narrower) | low | patch | fix in 3.0.2 (D28) |
| T5 | A popup from `window.open()` on `about:blank` with origin A: a helper bound to B wrote into A's storage (`set` resolved, the key was there after `goto(A)`), every browser. A `seed` for A made there resolved; it applied on Chromium and WebKit and was **lost** on Firefox, test passing | code unchanged | confirmed | low | patch | fix in 3.0.2 (D21) |
| T4 | A page that declares `var navigation = 1;`, `function navigation() {}` or `window.navigation = 1;`: `seed` for another origin rejects with `this browser has none`, 2/2, every browser | code unchanged | confirmed | low | patch | fix in 3.0.2 (D22) |
| T7 | `seed({})` for an origin never visited: the test fails at close with `the seed for http://127.0.0.1:9000 (keys: ) was never applied`, every browser | code unchanged | confirmed | low | patch | fix in 3.0.2 (D24) |
| T13 | After a never-applied seed, a `page.on("close")` listener added after the `seed` did not run (every browser); a `context.on("close")` listener did | code unchanged | confirmed | low | patch | fix in 3.0.2 (D30) |
| T14 | A 60-key `set` while the app leaves for B, 5 repeats: Chromium and Firefox reject with the raw `webStorage.setItem: Execution context was destroyed`, no label, after 0–2 keys landed on A; WebKit wrote all 60. Nothing reached B | the same | confirmed | low | patch | fix in 3.0.2: the label, and the docs say a batch is not atomic (D31) |
| T10 | A document served with `Content-Security-Policy: sandbox allow-scripts`: Chromium and WebKit reject `set`, `get` and `seed` with `the page has no origin yet (http://localhost:9000/t10); navigate to the origin first or use seed()`; Firefox with the raw `webStorage.setItem: Window.sessionStorage getter: Forbidden in a sandboxed document …` | code unchanged | confirmed | low | patch | fix in 3.0.2 (D27) |
| T6 | `SessionStorage` accepts `chrome-extension://abcdef/`, `app://foo/` and `file://host/` (and `file://host`) as the origin `"null"`; without the trailing slash the first two are rejected. A page object with any of them as `baseUrl` fails with `urlPath must be a path on the page object's origin; received "/", which names a host instead`, which is misleading (the message is D3's, new on this branch). `ftp://host` and `ws://host` are accepted as themselves | the helper's code unchanged | confirmed | low | patch | fix in 3.0.2 (D23) |
| T8 | `tsc`: with `key: string` holding `"user"` (a `json` codec), `get(key)` is `string \| null`, `get([key])` is `{ [x: string]: string \| null }`, `set(key, "x")` compiles. At runtime `get(key)` returns the object `{"name":"Ada"}` and `set(key, "x")` stores `"x"` with its quotes, every browser | — | confirmed | low | patch ([DECISIONS.md](DECISIONS.md) 30) | fix in 3.0.2: the types, a docs note and the changeset's migration hint (D25) |
| T9 | `tsc`: importing `AllEntries`, `Decoded`, `EntriesFor`, `NonEmpty`, `SeedOptions` from `pomwright` gives TS2459 (declared locally, not exported); `SessionStorageOptions` TS2724 | — | confirmed | low | patch ([DECISIONS.md](DECISIONS.md) 28) | fix in 3.0.2 (D26) |
| T12 | `seed` throws `encodeEntries`' three errors with the `seed` title; its `@throws`, its API page (**Throws**) and *Error messages* list them under `set` only | — | confirmed | low | none | fix the docs in 3.0.2 (D29) |
| T16 | Unit probe: when the previous script's disposal rejects (`Target page, context or browser has been closed`), the call rejects and the pending seed already holds the merged entries. Playwright rejects a disposal only once the page has closed, so no user can observe it | — | rejected: no reachable effect | — | — | narrow the doc comment's sentence in D18's plan |
| T15 | No probe (a design question). `JSON.parse` itself quotes at most about the first 10 characters of a long input | — | decided A+ ([DECISIONS.md](DECISIONS.md) 29) | low | patch | fix in 3.0.2 (D32) |
| T17 | `set("user", {…})` without a codec: `… no codec is declared for it; declare one in the schema (a page object's sessionStorage.schema option)`, D8's hint | — | duplicate of D8 | — | — | none |

## Decisions

- [x] Run this triage before the merge (decided 2026-10-23).
- [x] Scope: all of T1–T16.
- [x] Browsers: all three for every runtime candidate.
- [x] A confirmed finding is fixed in 3.0.2 (its own plan and commit); one whose fix needs a major becomes a GitHub
  issue labelled `backlog` and `breaking`.
- [x] T9, if confirmed: a patch ([DECISIONS.md](DECISIONS.md) 28).
- [x] T15: option A+, the whole value after the codec's reason and the value's length ([DECISIONS.md](DECISIONS.md) 29).

## Execution order

After the skill evaluation's runs finish, so no other process is using the machine:

1. `pnpm harness:install` once; record the commit.
2. Risk first: T3, T1, T2, T11, T5, T4, T7, T13, T14, T10, T6.
3. Compile-time: T8, T9.
4. Reading and unit: T12, T16, T17; T15 to the decisions.
5. Fill in *Results*; add the confirmed findings to the ledger in [PLANS.md](PLANS.md) and stop for the decisions.
6. Delete every temporary probe; `git status` shows only this folder.
