# Inventory, reconciled (segment 2A: session storage)

The union of `inventory-blind.md` (this review, pass 1) and the first review's `inventory.md` lines tagged `[A]` (its
*Session storage* section, the storage lines of *Lifecycles*, *Inputs at the boundary*, *Types* and the backlog), with
scope A's coverage from its `summary.md`. Each line: **both**, **blind only** or **first only**; then how deeply each
review probed it (1st: the first review at `54cdada`; 2nd: this review at `d850405`, pass 1 and the pass-2 re-runs).
"Probed" means through the public API in a browser or with the compiler; "read" means read and, where named, unit tests.

## Exports, members, options

- **both** — `SessionStorage`, constructor (`label`, `origin`, `schema`), `set`/`get`/`clear`/`seed` overloads, `json`, `Codec`, `SessionStorageSchema`. 1st: probed (values, keys, origins on Node 20/22/24). 2nd: probed (p01-p13, n01; origins re-run on three Node lines).
- **both** — the four types exported in 3.0.2 (`SessionStorageOptions`, `SeedOptions`, `Decoded`, `AllEntries`), `7447754`. 1st: read; F's scope. 2nd: imported in a type probe (t01), the API page's type comments asserted exactly.
- **both** — `EntriesFor`, `NonEmpty`, `KeyOnly` not exported. 1st: noted for F. 2nd: decided by `docs/versioning.md`; not a finding.
- **both** — a page object's helper: `sessionStorage` option and property, `PageObjectTypeOptions.storage`, `StorageTypeFromOptions`. 1st: probed (A-7 types). 2nd: probed (t01, t02; p06 T1 at run time); `SchemaOptionFor` and the constructor's rest tuple are **blind only** as items (new since 54cdada, e05b84d): probed, 2A-6.

## Values and keys

- **both** — strings verbatim; codecs per declared key (`hasOwn`); a non-string without a codec throws with the hint (`adffd1e`). 1st: probed (chromium). 2nd: probed (p08, chromium; keys on three browsers).
- **both** — encode failures (throw, non-string), decode message (reason, length, quoted value), causes. 1st: probed. 2nd: probed (p08 VALUES, causes printed); re-run `values.spec.ts`.
- **both** — `json` with `undefined`, `NaN`, `BigInt`, `Date`, cycles, `null`. 1st and 2nd: probed (chromium).
- **both** — keys `__proto__`, `constructor`, `hasOwnProperty`, `toString`, `valueOf`, empty, unicode, very long, in every method. 1st: probed `set`/`get`/`clear` (chromium), plus lone surrogates and a 1,000,000-character value (**first only**). 2nd: probed `set`, `get` (one, list, all), `clear(list)`, `seed` on the origin and pending with a later merge, on three browsers.
- **both** — prototype names declared in a schema object. 1st: probed (`constructor` as `json<number>`). 2nd: probed (computed `__proto__`, `constructor`, `toString`).
- **blind only** — a key in a message (empty, with ", ", with a newline): 2nd: probed, 2A-4.
- **blind only** — an input changed after the call and before it settles (entries, a codec value, a key list, `seed`'s options): 2nd: probed, 2A-3. (The first inventory has "mutation after the call" for options objects, scopes B and C.)
- **both** — literal `[]` rejected; an empty list at run time reads or removes nothing; `seed({})` does nothing (`a6ecacf`). 1st: probed (`set({})`, `get([])`, `clear([])` on `about:blank`, considered and not filed). 2nd: re-run; agree.

## The origin

- **both** — the `origin` option: normalised, a path/query/hash rejected, a scheme without a URL origin rejected with the reason (`0028097`). 1st: probed on Node 20/22/24. 2nd: re-run on the three lines (identical), n01 through the built package.
- **both** — a bound helper touches only its origin; on `about:blank` the document is asked (`d4cffbb`). 1st: probed (popups). 2nd: probed (spec read, p09 bound control).
- **both** — "no origin yet" and the opaque-origin messages (`17426a5`, `186bc5f`). 1st: probed (A-5). 2nd: probed: a failure for another reason on an inherited or closed popup says "no origin yet" (2A-2); a page's own `var origin` hides the opaque explanation (2A-10, **blind only** as a path).
- **both** — the origin around every call (`56229e2`, A-1's fix): batches, single calls, parallel reads. 1st: probed (A-1, three browsers). 2nd: re-run (fixed); same-origin navigation interrupting a call, **blind only**, probed on three browsers (2A-8).

## Turns

- **both** — per page and origin, in call order, across helpers; overlapping calls end as awaited ones; a failing call does not hold up the next. 1st: probed (two helpers, the popup case, three browsers). 2nd: probed (TURN, four helpers and mixed calls; OVERLAY with `video.show.test`).
- **both** — a call that waited checks the origin again when its turn starts. 1st: read, unit tests (`storageTurns.test.ts`). 2nd: probed for a bound and an unbound helper: the unbound one acts on the new origin (2A-9, **blind only** as a path).
- **blind only** as an item (new since 54cdada, `e231dc2`) — the page-wide turn on a URL without an origin; `seed` stays on its origin's chain. 2nd: read; the first review's A-2 probe re-run (fixed).
- **first only** — "a failing call leaves the pending seed as it was". 1st: read, unit test (*leave the pending seed as it was when one fails*). 2nd: read; not reachable through the public API without a page fault (a commit or a close, which change the pending seed themselves). Not probed by either through the public API.
- **both** — the step overlay delays a step's body (`sessionStorageOverlay.spec.ts`). 1st: read. 2nd: probed (OVERLAY order); `test.step` always awaits `_onUserStepBegin` (read in playwright 1.64).

## `seed`

- **both** — at the call: snapshot and commit watch before the step (`5ceb13c`); the decision in the turn (on the origin, inherited `about:blank`, away). 1st: probed (on origin, away, fresh and inherited `about:blank`, navigation in flight both orders ×25, closed page). 2nd: probed (after a click, raced on fresh pages ×12 on three browsers, closed popup); a navigation elsewhere during the Navigation API check, **blind only**, 2A-1.
- **both** — registration: the Navigation API check (interface, `bfbc00f`), the commit check before and after `addInitScript`, merge, dispose of the previous script. 1st: probed. 2nd: probed (20 merges and a round trip; raced seeds leave no script).
- **both** — the init script: main frame, `location.origin` and `self.origin`, first arrival. 1st: read, harness. 2nd: read, harness; the frames spec read.
- **both** — lifetimes: four listeners only while pending or confirming; the call's watch removed. 1st: probed (three browsers). 2nd: probed (p03 every outcome) and re-run (lifetimes, three browsers).
- **both** — later failures: refused write, not applied (opaque, return), never applied (one, several, `c35eae4`), page closed while registering; at the `seed` call site; other listeners keep running (`819c477`). 1st: probed. 2nd: probed (sandboxed arrival on three browsers, empty-key never-applied) and re-run (samedoc, aborted, lifetimes).
- **first only** — a seeded document served with a CSP; a refused write after a same-document navigation; a back navigation to a cacheable seeded page; Firefox `route.abort`. 1st: probed. 2nd: re-run, hold.
- **both** — a seed never applied when the page is shared by several tests (serial mode, a page from `beforeAll`). 1st: by reading only, left for this review. 2nd: probed in pass 4.
- **both** — what a seeded navigation looks like to the app; frames (`srcdoc`, `about:blank`, `data:`), cross-site iframes per browser, COOP/COEP. 1st: harness read, green. 2nd: harness read, green in the baseline; not probed beyond it.
- **blind only** — *What `seed` cannot do* as a complete list: 2nd: probed (sandboxed arrival missing, 2A-5; the after-click row holds).
- **both** — two pages of one context. 1st: in its brief, not reported as probed. 2nd: probed (TWOPAGES).
- **neither probed** — the measured claims of *Internal → The seed registry* ("about once in a hundred such rounds", "no overwrite in 300 rounds per engine", "350 rounds"). 1st: not re-measured. 2nd: pass 4.

## Messages, steps, call sites

- **both** — every message of the pages and `@throws`, character for character. 1st: probed. 2nd: probed (most through the package), plus 2A-4 and 2A-2.
- **both** — step titles, `box: true`, `location` from `callerLocation` (`b19de77`). 1st: E-1 (scope E) for nesting. 2nd: probed (p11: every method at the caller's line, inside a boxed step too).
- **both** — call sites (`captureCallSite`, `atCallSite`, `siteText`). 1st: partly (read, unit, harness green). 2nd: read; the several-seed message's `siteText` printed (R-2 re-run).

## Types

- **both** — `Decoded` per member (`f422b77`), `AllEntries`, `KeyOnly`, `EntriesFor`, `NonEmpty`. 1st: probed at `54cdada` (A-4). 2nd: probed at `d850405` (t01 exact assertions of the API page's examples; A-4 re-run).
- **both** — schema type and value agree (`e05b84d`). 1st: A-7 (the opposite direction). 2nd: probed (t01, t02, p06 T1): 2A-6.
- **both** — the upgrade guide's compiler errors. 1st: probed at `54cdada` (held). 2nd: probed (2A-7: stale since `f422b77`).

## Docs, guide, changesets

- **both** — the docs pages in scope and the guide's storage lines. 1st: read and probed where they show behaviour. 2nd: the same, plus `api/types.md` and `api/class-pageobject.md` storage parts (**blind only**).
- **blind only** — the pending changesets' claims after 54cdada (`batch-navigation-message`, `about-blank-storage-order`, `seed-inherited-origin`, `schema-type-and-value`, `storage-string-key-types`, `never-applied-several-seeds`, `sandboxed-document-message`): read against the probes (2A-6, 2A-9 cite them).
- **both** — known issues #57 (context-wide seed), #58 (schema written once). 1st: issues 05, 06. 2nd: baseline's list; 2A-6 relates to #58.

## Disagreements between the two reviews

- The upgrade guide's errors: "reproduce" (1st, at `54cdada`) against "stale" (2nd, at `d850405`): both right at their commit; `f422b77` changed it.
- Turns: "ordering … end in call order" (1st, a page that stays on the origin) against 2A-9 (2nd, a page that leaves while an unbound helper's call waits): different paths, no contradiction.
- None otherwise.
