# Plan: `SessionStorage` on Playwright's WebStorage API (analysis item 1.5)

Working document, kept in `release-3.0.0/` beside the analysis it answers (item 1.5 and the `session-storage.md`
bullets of section 5). File links are relative to this folder. Nothing is decided yet: section 7 lists every decision
with a recommendation. Edit anything you disagree with, then ask for execution. The ledgers
([DECISIONS.md](DECISIONS.md), [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md)) are updated once the decisions are
taken.

Every runtime claim below was verified on 2026-10-08 against Chromium through the Playwright 1.62.1 installs in
`test/` and at the root, or against the installed Playwright type definitions and the Playwright release notes.
Every code reference points at the exact lines in this repository. Example hosts are generic (`*.example`).

---

## 1. Intended contract

### 1.1 What the helper is for

Tests read, write, and clear the page's `sessionStorage` with step reporting and batch operations, and they seed
`sessionStorage` for an origin before the application loads there, so that the first script of the app already
sees the values. The helper mirrors the Web Storage API and Playwright: values are strings, an operation needs a
document on the origin whose storage it touches, and nothing is injected into every navigation.

### 1.2 What Playwright provides today

- Playwright 1.61 added the `WebStorage` API: `page.sessionStorage` and `page.localStorage` with
  `getItem(name)`, `setItem(name, value)`, `removeItem(name)`, `clear()`, and `items()` returning
  `Array<{ name: string; value: string }>` (installed 1.62.1 types; release notes 1.61). It works right after a
  commit-only navigation (verified), so it does not depend on the app's scripts having run.
- Like `window.sessionStorage`, it needs a document on an origin. On `about:blank` both the API and
  `page.evaluate` throw `SecurityError: Failed to read the 'sessionStorage' property from 'Window': Access is
  denied for this document` (verified).
- `storageState` and `setStorageState` (1.59) cover cookies, `localStorage`, IndexedDB, passkeys and OPFS, not
  `sessionStorage`. The auth guide still says "Playwright does not provide API to persist session storage" and
  shows an `addInitScript` snippet. That snippet is not used here: an init script cannot be removed, runs on every
  navigation in the context, and overwrites whatever the app wrote in between, which is exactly what the helper
  exists to avoid.
- `sessionStorage` lives per tab and per origin: a same-origin navigation keeps it, a cross-origin navigation
  sees a different, empty storage (verified).

### 1.3 Proposed API

| method | does |
| --- | --- |
| `new SessionStorage(page, { label?, origin? })` | `label` prefixes step titles as today. `origin` is the default target for `seed`; `PageObject` passes the origin of a string `baseUrl`. |
| `set(entries)` | `entries: Record<string, string>`. Writes each entry with `page.sessionStorage.setItem`. Values are stored as given, no JSON encoding. |
| `get()` | All entries as `Record<string, string>` from `items()`. |
| `get(keys)` | `Record<string, string \| null>` with every requested key present, `null` when absent, as `getItem` does. `get([])` is `{}`. |
| `clear()` | Removes everything. |
| `clear(keys)` | Removes those keys; `clear([])` removes nothing. A single string is accepted for one key. |
| `seed(entries, { origin? })` | Makes the page able to write to `origin`'s storage without loading the app, writes the entries, and returns with the page on a blank same-origin document. If the page is already on that origin it just writes. The test then navigates as usual and the app's first script sees the entries (verified). |

Removed: `setOnNextNavigation` (replaced by `seed`), the `waitForContext` option on every method (replaced by a
clear error when the page has no origin), and the `reload` option of `set` (one line at the call site:
`await page.reload()`).

How `seed` works: the helper registers a one-time route for `${origin}/__pomwright__/session-storage-seed`, fulfils
it with an empty HTML document, navigates there with `waitUntil: "commit"`, writes the entries, and removes the
route in a `finally`. No request reaches a server, the app does not run, and nothing is left registered. Verified
against an app whose first inline script snapshots `sessionStorage`: after `seed`, the snapshot contained the
entries; the current `framenavigated`-based write landed after that script in 10 of 10 navigations.

### 1.4 Edge cases, with the proposed answer

| case | today | proposed |
| --- | --- | --- |
| `set({ token: "abc" })`, app reads `sessionStorage.getItem("token")` | `"abc"` with quotes (1.5a) | `abc`; structured values are the caller's `JSON.stringify` / `JSON.parse` (documented with an example) |
| value `""` | read back as `null` (1.5f) | `""` |
| `get(["missing"])` | `{}` | `{ missing: null }` |
| `get([])` / `clear([])` | everything (1.5e) | `{}` / nothing: an empty list means no keys |
| page on `about:blank` | `SessionStorage context is not available.`, or an unbounded wait with `waitForContext` (1.5g) | throws `Label.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()` with Playwright's error as `cause` |
| write for the app's first load | `setOnNextNavigation`: queued, written from a `framenavigated` listener, loses the race (1.5b), merges then wipes concurrent calls (1.5c), one failure leaks the listener (1.5d) | `seed(entries)`: deterministic, synchronous with respect to the test, nothing queued, nothing leaked |
| `seed` while already on the origin | n/a | writes directly; the URL does not change |
| `seed` on a page object with a RegExp `baseUrl`, no `origin` option | n/a | throws: the origin is required |
| `seed` with an explicit `origin` on a standalone helper | n/a | works; the option wins over the constructor default |
| `seed`, then the app navigates to another origin | n/a | that origin has its own storage; documented |
| the seed document in `page.url()` and history | n/a | documented: the page is on `${origin}/__pomwright__/session-storage-seed` until the test navigates |
| a route the test registered for the whole origin (`**/*`) | n/a | the seed route is registered last, so Playwright consults it first; removed afterwards |
| Playwright below 1.61 | n/a | `page.sessionStorage` does not exist; decision 7.1 |
| Firefox and WebKit | not run in CI | `page.sessionStorage` is a cross-browser Playwright API; the seed route works in every engine |

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

### 3.1 Storage access through `page.sessionStorage`

Every read and write goes through Playwright's `WebStorage` API, so the helper adds no semantics of its own:
strings in, strings out, `null` for a missing key. The only POMWright logic is batching, the step titles, the
error message for a page without an origin, and `seed`.

Peer floor (decision 7.1). `page.sessionStorage` exists from Playwright 1.61; the peer range is `>=1.57.0 <2.0.0`
and the 1.57 floor is never exercised (analysis section 4). Options: raise the floor to `>=1.61.0` in 3.0.0 (one
code path, the recommended option, recorded in the changeset and `AGENTS.md`), or keep the floor and fall back to
`page.evaluate` when `page.sessionStorage` is undefined (two paths to test for identical semantics).

### 3.2 `seed`

```ts
async seed(entries, options?: { origin?: string }) {
	const origin = options?.origin ?? this.options.origin;      // throws if neither is set
	const current = originOf(this.page.url());                   // undefined on about:blank
	if (current !== origin) {
		const seedUrl = `${origin}/__pomwright__/session-storage-seed`;
		const handler = (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>POMWright session storage seed</title>" });
		await this.page.route(seedUrl, handler);
		try {
			await this.page.goto(seedUrl, { waitUntil: "commit" });
		} finally {
			await this.page.unroute(seedUrl, handler);
		}
	}
	await this.write(entries);
}
```

The route matches the exact seed URL only, so the test's own routes are untouched; the navigation is a commit-only
`goto` of a fulfilled response, so it costs milliseconds; `unroute` runs even if the navigation fails. The page is
left on the seed document on purpose: the next thing a test does after seeding is navigate to the app.

### 3.3 Errors

A Playwright `SecurityError` from an operation on a page without an origin is rethrown as
`${label}.SessionStorage.${method}: the page has no origin yet (${page.url()}); navigate to the origin first or use
seed()`, with the original error as `cause`. Other errors pass through.

### 3.4 `PageObject` integration

`PageObject` constructs the helper with `{ label, origin }`, where `origin` is `new URL(baseUrl).origin` for a string
`baseUrl` and absent for a RegExp one. [pageObject.ts:69](../src/pageObject.ts#L69) is the only call site.

### 3.5 Sketch

```ts
type Entries = Record<string, string>;

export class SessionStorage {
	constructor(private readonly page: Page, private readonly options: { label?: string; origin?: string } = {}) {}

	async set(entries: Entries): Promise<void> {
		await this.step("set", async () => {
			for (const [name, value] of Object.entries(entries)) await this.page.sessionStorage.setItem(name, value);
		});
	}

	async get(): Promise<Entries>;
	async get<K extends string>(keys: readonly K[]): Promise<Record<K, string | null>>;
	async get(keys?: readonly string[]) {
		return this.step("get", async () => {
			if (keys === undefined) return Object.fromEntries((await this.page.sessionStorage.items()).map((i) => [i.name, i.value]));
			return Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await this.page.sessionStorage.getItem(k)])));
		});
	}

	async clear(keys?: string | readonly string[]): Promise<void> { /* clear() or removeItem per key; [] is a no-op */ }

	async seed(entries: Entries, options?: { origin?: string }): Promise<void> { /* 3.2 */ }

	private async step<T>(method: string, body: () => Promise<T>): Promise<T> {
		return test.step(`${this.options.label ? `${this.options.label}.` : ""}SessionStorage.${method}:`, async () => {
			try { return await body(); } catch (error) { throw this.describeNoOrigin(method, error); }
		});
	}
}
```

---

## 4. Implementation steps

### 4.1 Runtime (`src/`)

1. Rewrite [sessionStorage.ts](../src/helpers/sessionStorage.ts) per section 3; export the `Entries` type as
   `SessionStorageEntries` (analysis 1.9d lists the missing `SessionStorageState` export; the new name goes out
   from [index.ts](../index.ts)).
2. [pageObject.ts:69](../src/pageObject.ts#L69): pass `origin` for a string `baseUrl`.
3. If 7.1 raises the floor: [package.json](../package.json) `peerDependencies` to `>=1.61.0 <2.0.0`;
   [AGENTS.md:9](../AGENTS.md#L9) and the harness note follow.

### 4.2 Docs (`docs/v3` only)

- [session-storage.md](../docs/v3/session-storage.md): rewrite around the new API: strings only with a JSON example,
  `get` with `null`, the empty-list rule, the no-origin error, `seed` with how it works and what the page looks like
  afterwards, the cross-origin note, the `PageObject` wiring, and a *Migration from 2.x* note (`setOnNextNavigation`
  to `seed`, `waitForContext` and `reload` removed, values no longer JSON-encoded, `get` returns `null` for missing
  keys).
- [overview.md](../docs/v3/overview.md) section 2.9 and the API summary; [PageObject.md:255-264](../docs/v3/PageObject.md#L255-L264).
- Section 5 bullets for `session-storage.md` (JSON contract, the `addInitScript` remark) are closed by the rewrite.

### 4.3 Changeset

`.changeset/session-storage-on-webstorage.md`, `"pomwright": major`: values are stored as given (no JSON
encoding); `get(keys)` returns `null` for missing keys; `get([])` and `clear([])` are no-ops; `setOnNextNavigation`
is replaced by `seed`; `waitForContext` and `reload` are removed, with the one-line replacements; and, if 7.1, the
peer floor is `>=1.61.0`.

### 4.4 Analysis, release notes, decisions, AGENTS.md

Tick *Fix* on 1.5 (a to g) with notes; tick the two `session-storage.md` bullets in section 5; add the decisions to
[DECISIONS.md](DECISIONS.md) and the items to [RELEASE-NOTES-3.0.0.md](RELEASE-NOTES-3.0.0.md); update
[AGENTS.md](../AGENTS.md) (peer range if changed, the `src/helpers/` row, the `/teststorage` route and the spec, a
convention line for storage, pending changesets, revision line).

---

## 5. Tests

### 5.1 Unit tests (vitest)

The class needs a `Page` and `test.step`, so unit tests cover only the pure parts, extracted as functions:
`originOf(url)` (`about:blank` and `""` give `undefined`, a URL gives its origin), the entries/keys helpers
(`itemsToRecord`, the `[]` rule, the single-string `clear` argument), and the no-origin error wrapper (wraps a
`SecurityError`, passes anything else through). Type assertions for the `get` overloads (`Record<K, string | null>`
with the literal keys).

### 5.2 Integration tests (Playwright, `test/`)

**Fixture route** `/teststorage` in [server.js](../test/server.js): a page whose first inline script snapshots
`sessionStorage` into `<pre id="startup">` and whose body renders the current entries into `<pre id="current">`
after load, with links to `/teststorage?second` (same origin) and a form-free way to read values as the app does.
A second origin for isolation tests needs no new server: `http://127.0.0.1:9000` is a different origin from
`http://localhost:9000` on the same express instance.

**Page object and fixture.** `pages/teststorage/teststorage.{locatorSchema,page}.ts`, fixture `testStorage`.

**Spec** `test/tests/testApp/sessionStorage.spec.ts`, replacing the nine helper tests in
[testPage.spec.ts:82-165](../test/tests/testApp/testPage.spec.ts#L82-L165):

- `set` then the app reads the raw value: `token` is `abc`, not `"abc"`; a `JSON.stringify` value round-trips
  through `JSON.parse` on the caller's side.
- empty string survives `set` and `get`; `get(["missing"])` is `{ missing: null }`; `get([])` is `{}`.
- `clear()` empties; `clear(["a"])` and `clear("a")` remove one; `clear([])` removes nothing.
- on a fresh page (`about:blank`) every method rejects with the no-origin message naming the label and method.
- `seed` before the first navigation: the `startup` snapshot on `/teststorage` contains the entries; the page was
  on the seed document in between and no request for the seed URL reached the server (the express 404 counter
  stays at zero, or `page.goto(seedUrl)` afterwards returns 404).
- `seed` while already on the origin: `page.url()` unchanged afterwards, entries present.
- `seed` with an explicit `origin` on a standalone `new SessionStorage(page)`; without one, rejects.
- cross-origin isolation: entries set on `localhost:9000` are absent on `127.0.0.1:9000` and back again after
  returning.
- `PageObject` wiring: `testStorage.sessionStorage.seed({ … })` then `testStorage.navigation.goto()`; the app's
  startup snapshot has the entries; a RegExp-base page object's helper rejects `seed` without an origin.
- step titles: a `test.step` listener or the trace is not asserted; the label prefix is checked through the error
  message.

**Existing specs.** The nine tests in `testPage.spec.ts` move to the new spec in their new form; nothing else
uses the helper. The `/testids` and `/testnav` specs are untouched.

**Running**: `./pack-build.sh`, then in `test/` `pnpm add -D "pomwright@file:../pomwright-test-build.tgz" --ignore-scripts`
and `pnpm exec playwright test --project=chromium --reporter=line` (AGENTS.md section 3). If 7.1 raises the floor,
nothing changes for the harness, which pins 1.62.1.

---

## 6. Versioning

`major` changeset, riding 3.0.0. Breaking: values no longer JSON-encoded, `get` semantics for missing keys and
empty lists, `setOnNextNavigation` replaced by `seed`, `waitForContext` and `reload` removed, and possibly the peer
floor. Each has a one-line migration in 4.3 and in the docs.

---

## 7. Decisions

- [ ] 7.1 Storage access through `page.sessionStorage` with the peer floor raised to `>=1.61.0` (recommended) /
  keep the `>=1.57.0` floor and fall back to `page.evaluate` when the API is absent
- [ ] 7.2 Values are strings, stored and returned as given; no JSON encoding (recommended) / keep JSON encoding and
  document it
- [ ] 7.3 `get(keys)` returns `null` for a missing key, mirroring `getItem` (recommended) / omit missing keys as today
- [ ] 7.4 `get([])` returns `{}` and `clear([])` removes nothing: an empty list means no keys (recommended) /
  keep "empty means all" and document it
- [ ] 7.5 `setOnNextNavigation` is replaced by `seed(entries, { origin? })` built on a one-time intercepted blank
  document (recommended) / keep the `framenavigated` listener with the race, queue, and leak fixes
- [ ] 7.6 `waitForContext` is removed; a page without an origin fails at once with a message that names the fix
  (recommended) / keep it with a timeout
- [ ] 7.7 The `reload` option of `set` is removed (recommended) / keep it
- [ ] 7.8 `PageObject` passes the origin of a string `baseUrl` to the helper, so `seed` needs no argument on string
  page objects (recommended)
- [ ] 7.9 Seed URL `${origin}/__pomwright__/session-storage-seed`, commit-only navigation, route removed in `finally`,
  page left on the seed document (recommended)
- [ ] 7.10 Fixture: new `/teststorage` route and page object; `127.0.0.1:9000` as the second origin; the nine
  helper tests move from `testPage.spec.ts` to `sessionStorage.spec.ts` (recommended)
- [ ] 7.11 Name of the seeding method: `seed` (recommended) / `setBeforeNavigation` / `prime`

> Notes:

---

## 8. Execution order

1. Pure helpers with unit tests (red, then green); the class rewrite; `PageObject` origin; exports; peer floor if
   decided. `pnpm lint`, `pnpm test:unit`.
2. `/teststorage` route, page object, fixture, `sessionStorage.spec.ts`; move the nine tests; run the chromium
   project against the packed tarball.
3. Docs in `docs/v3`.
4. Changeset.
5. Full run: `pnpm lint`, `pnpm test:unit`, packed integration suite; fix anything red.
6. Ledgers: analysis ticks and notes, `DECISIONS.md`, `RELEASE-NOTES-3.0.0.md`, `AGENTS.md`, `PLANS.md` status.
