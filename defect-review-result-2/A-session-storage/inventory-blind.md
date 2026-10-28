# Inventory, blind (segment 2A: session storage)

Written in pass 1 at `d850405`, before reading anything of the first review. One line per item: what it is, the files
that implement it, where it is documented. Source paths are under `src/helpers/` unless named; doc pages under
`website/src/content/docs/`. Not edited after pass 1.

## Public exports and members

- `SessionStorage<S>` class: `sessionStorage.ts:267-700`; `api/class-sessionstorage.md`, `docs/session-storage.md`, `docs/typescript.md` table.
- `new SessionStorage(page, options)`: label, origin (normalised, rejects path/query/hash, a scheme without a URL origin), schema (required with an explicit type; rest-tuple typing): `sessionStorage.ts:152-183, 288-298`; `api/class-sessionstorage.md` *Constructor*, `api/errors.md` *Session storage*.
- `set(key, value)` / `set(entries)`: encode all first, write one key at a time, origin checks, turn: `sessionStorage.ts:469-508`; API `set()`, guide *The methods*.
- `get()` / `get(key)` / `get(keys)`: `null` for missing, record with every key, parallel reads, decode: `sessionStorage.ts:510-571`; API `get()`.
- `clear()` / `clear(key)` / `clear(keys)`: `sessionStorage.ts:573-618`; API `clear()`.
- `seed(key, value, options?)` / `seed(entries, options?)`: `sessionStorage.ts:620-699`, `sessionStorageSeed.ts`; API `seed()`, `docs/seeding-session-storage.md`, `internal/seed-registry.md`.
- `json<T>()`: `sessionStorage.ts:62-65`; API `json`, guide *Codecs*.
- `Codec<T>` (`parse`, `stringify`): `sessionStorage.ts:28-47`; API `Codec`.
- `SessionStorageSchema`: `sessionStorage.ts:73`; API.
- `SessionStorageOptions<S>`, `SeedOptions`: `sessionStorage.ts:80-87, 138-141`; API (Added in v3.0.2).
- `Decoded<S, K>`, `AllEntries<S>`: `sessionStorage.ts:89-119, 148-150`; API (Added in v3.0.2), examples with type comments.
- Not exported, in public signatures: `EntriesFor`, `NonEmpty`, `KeyOnly` (`docs/versioning.md`: outside the export promise).
- `PageObject`: `sessionStorage` property, `sessionStorage` option (`{ schema }`), `PageObjectTypeOptions.storage`, `StorageTypeFromOptions`, `SchemaOptionFor` (a message type without `storage`): `src/pageObject.ts:30-123, 201-207, 332-342`; `api/class-pageobject.md`, `api/types.md`, guide *Through a page object*, issue #58 (a declared type without its value).

## Contracts (docs, doc comments, guide)

- Values are strings stored verbatim; a codec per declared key; an undeclared non-string throws; `hasOwn` codec lookup (`sessionStorage.ts:185-219`).
- Encoding failures: codec throws (cause), codec returns a non-string; decode failure message with reason, length and quoted value (`:221-242`).
- Keys never property names: `__proto__` stored by `set`, `seed` (pending and on origin), read by `get` (`:193-194`, `Object.fromEntries`, `[key, value]` pairs in the script arg).
- A literal `[]` does not compile for `get`/`clear`; an empty list at run time reads/removes nothing; `seed({})` does nothing.
- Origin check: a helper with an origin touches only it; on `about:blank` that inherited an origin the document is asked (`assertOnOrigin`, `assertInheritedOrigin`).
- No origin yet (`access`): "the page has no origin yet (url); navigate to the origin first[ or use seed()]".
- Opaque document (sandboxed, Firefox's error page): the opaque message for `set`, `get`, `clear`, an on-origin `seed`.
- Navigation during a call: origin read before and after each storage call (`guarded`), batch message with done keys and the one in flight; `get` fails rather than return a read from the new document.
- Turns (`storageTurns.ts`): per page and origin, in call order, across helpers; page-wide turn on a URL without an origin; `seed` stays on its origin's chain; a waiting call re-checks the origin; a failed call does not hold up the next.
- `seed` at the call: snapshot of the page and a commit watch before the step (`SeedRegistry.snapshot`), decision in the turn (write at once on the origin or on an inherited `about:blank`, otherwise register).
- `seed` registration: Navigation API check once per page (interface test), commit-during-registration check before and after `addInitScript`, merge (later wins), dispose of the previous script, listeners.
- Init script (`seedScript`): main frame, `location.origin` and `self.origin`, first arrival (`navigation.activation.from`), console reports (opaque, return, refused write).
- Lifetimes: script disposed at the main frame's commit on the origin; four listeners only while pending or confirming (until DOMContentLoaded or the next commit); snapshot listener removed when the call settles.
- Later failures: refused write, not applied (opaque, return), never applied (one, several, listing each), page closed while registering; all at the `seed` call site; rethrown from a microtask so other listeners run; never-applied only for a test that passed so far.
- Step titles `<label>.SessionStorage.<method>:`, `box: true`, `location` from `callerLocation` / the seed's call site (`callSite.ts`, `internal/call-sites.md`).
- Call sites: `captureCallSite`, `atCallSite` (drops the bundle's frames only), `siteText` (relative path), `frameLocation`.
- Seeded navigation looks the same to the app (method, body, Referer, Sec-Fetch, history, fragment, `goto`'s response, `waitUntil: "commit"`).
- Frames: same-origin iframe shares storage; cross-site iframe shares in Chromium and Firefox, not WebKit; script only in the main frame; `top.location` hop is seeded.
- What `seed` cannot do: page closes, new tab, seed after the commit, not awaited, failed navigation (per browser), no Navigation API, refused write.
- Limits (internal page): popup, quick return, back/forward cache.

## Errors and messages

- Constructor origin (2 forms), no origin yet (with/without "or use seed()"), opaque document, another origin (with/without "(about:blank) "), non-string value, encode failure, non-string codec result, decode failure, navigation during a batch (set, clear keys, on-origin seed), during a single call (get key, clear()), seed: origin required, Navigation API, commit during registration, page closed while registering, refused write, never applied (one, several), not applied (opaque, return); compile errors (`SchemaNeedsStorageType`, TS2353/TS2344/TS2339 in *Upgrading*). Pages: `api/errors.md`, `api/class-sessionstorage.md`, `docs/session-storage.md`, `docs/seeding-session-storage.md`, the `@throws` lines.

## Types

- `Decoded` per member (literal, `string`, branded, pattern), `KeyOnly` (key alone infers K), `EntriesFor`, `NonEmpty`, `AllEntries`, overloads of `set`/`get`/`clear`/`seed`, constructor rest tuple, `SchemaOptionFor`, `StorageTypeFromOptions`; `test/tests/packaging/publicTypes.typecheck.ts`, `publicTypes.emit.ts`, `src/helpers/sessionStorage.test.ts` (*Decoded*).

## Platform beneath

- `page.sessionStorage` (1.61): main-frame evaluation in the utility world (`playwright-core` `webStorage*`), `items()` maps a null value to `""`; `page.addInitScript` returning a `Disposable` (1.59); `framenavigated`, `domcontentloaded`, `console`, `close` events; Navigation API (`NavigationActivation`) in every shipped browser; `test.step` awaits `_onUserStepBegin` before the body.

## Tests and tooling

- Unit: `sessionStorage.test.ts`, `sessionStorageSeed.test.ts`, `storageTurns.test.ts`, `callSite.test.ts` (against source).
- Harness: `test/tests/testApp/sessionStorage.spec.ts` (3 browsers), `sessionStorageOverlay.spec.ts`, `test/tests/pageObject/callSite/` (consumer files named `sessionStorage.ts`), `test/server.js` `/teststorage*`, the page objects under `teststorage/`, `publicTypes.typecheck.ts` / `.emit.ts`.
- Checks: `scripts/check-error-messages.mjs`, `check-doc-snippets.mjs`, `check-api-coverage.mjs` (2T's; used here as evidence only).

## Change set since v3.0.1 (storage)

- Before 54cdada: 7131d3d `__proto__`, 34c2ec0 turns, adffd1e schema hint, 0028097 origin without URL origin, bfbc00f Navigation API interface, a6ecacf empty seed, ea330ef decode message, e8831b8 batch navigation message, 17426a5 sandboxed message, d12966a page closed while registering, 5ceb13c seed decides at the call, a23aa0d never skipped silently, d4cffbb inherited origin check, 819c477 listeners keep running, 7447754 exported types, 64cd0b7 string key types, 3045656/c7db10b docs.
- After 54cdada (no review has seen): 56229e2 origin checks around every call, e231dc2 page-wide turn, 52f2d4c seed on an inherited popup, 186bc5f opaque message names the error page, c35eae4 several never-applied seeds, f422b77 per-member key types, e05b84d schema type and value agree, b19de77 step locations, 445fc71 (page object call site), the docs commits of 2026-10-28 (429f2c2 error messages listed, e571381 Upgrading, 2449c6a Added in markers).
- Changesets: `.changeset/*.md` listed in `log.md` (storage ones: about-blank-storage-order, batch-navigation-message, decode-error-message, empty-seed, export-storage-types, inherited-about-blank-origin, navigation-api-check-interface, never-applied-several-seeds, origin-without-url-origin, proto-storage-key, sandboxed-document-message, schema-type-and-value, seed-closed-page-message, seed-decides-at-the-call, seed-failures-keep-other-listeners, seed-inherited-origin, seed-never-skipped-silently, storage-calls-take-turns, storage-schema-hint, storage-string-key-types, boxed-step-location).
