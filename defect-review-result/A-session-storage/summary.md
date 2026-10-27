# Scope A: Session storage — summary

Segment A of the final whole-project review of POMWright at `54cdada` (`fix/review-3-0-2`), reviewed as an *area* and,
for the 20 commits since `v3.0.1` that touch it, as a *change set*. Worktree:
`/home/magdys/workspace/dyhex/POMWright-final-review` (detached at `54cdada`). Reviewer A (Claude Opus 5.5),
2026-10-23, 09:52 to 10:30 CEST.

Probes, notes and logs: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/`

- `run-probe.sh <id> [playwright args]` copies `specs/<id>.spec.ts` to `test/tests/zz-probe-<id>.spec.ts`, runs it
  with the line reporter, deletes it, and writes `out/<id>.<time>.log` with the exit code at the end;
- `specs/` (17 runtime probes), `types/` (type probes, run by copying into `test/tests/zz-probe-*.typecheck.ts` and
  `pnpm exec tsc --noEmit -p test`), `node/origins.cjs` (Node 20, 22, 24), `A1-sketch.diff` (the fix sketch of A-1),
  `out/` (every log the findings cite).

## Findings index

| ID | Kind | Severity | Semver | Summary | File |
| --- | --- | --- | --- | --- | --- |
| A-1 | defect | Medium | patch | A helper bound to an origin writes into, or removes from, another origin's storage when the page commits there between two calls of a batch (`set`, `clear`, an on-origin `seed`), and the call resolves; reproduced deterministically on all three browsers | [defect-A-1-batch-lands-on-other-origin.md](defect-A-1-batch-lands-on-other-origin.md) |
| A-2 | defect | Low | patch | On an `about:blank` popup that inherited an origin, a bound and an unbound helper take turns on different chains, so overlapping calls end out of call order (all three browsers) | [defect-A-2-about-blank-popup-two-chains.md](defect-A-2-about-blank-popup-two-chains.md) |
| A-3 | defect | Low | patch | `seed` on such a popup registers instead of writing at once: a later `set` is overwritten at the arrival (Chromium, WebKit), or the test fails with a message about a failed navigation that never happened (Firefox); no page lists the case | [defect-A-3-seed-on-inherited-origin-popup.md](defect-A-3-seed-on-inherited-origin-popup.md) |
| A-4 | defect | Low | patch | A key typed as a template literal or a branded string is typed as a plain string, although it may be a declared key whose value comes back decoded | [defect-A-4-non-literal-key-types.md](defect-A-4-non-literal-key-types.md) |
| A-5 | defect | Low | patch | On Firefox's error page after a failed navigation to the origin, `set`, `get` and `seed` say the document is sandboxed | [defect-A-5-error-page-called-sandboxed.md](defect-A-5-error-page-called-sandboxed.md) |
| A-6 | documentation | Low | none | The error lists of `seed` leave out the two failures of a seed that writes at once (navigation during the write, sandboxed document); those of `get` and `clear` leave out the sandboxed document | [defect-A-6-on-origin-seed-errors-unlisted.md](defect-A-6-on-origin-seed-errors-unlisted.md) |
| A-7 | documentation | Low | none (patch for the type fix) | A page object that passes `sessionStorage.schema` without declaring `storage` compiles and decodes values its types call strings; the docs describe only the opposite mismatch (issue 06's) | [defect-A-7-schema-value-without-type.md](defect-A-7-schema-value-without-type.md) |
| A-8 | documentation | Low | none | AGENTS.md §4's list of `/teststorage` routes leaves out `/teststorage/sandboxed` and `/teststorage/shadowed-navigation` | [defect-A-8-agents-teststorage-routes.md](defect-A-8-agents-teststorage-routes.md) |

Counts: 5 defects (1 Medium, 4 Low; all patch), 3 documentation (all Low; semver none), 0 suspected, 0 design
questions.

## What I read

- AGENTS.md (the worktree's copy, identical to the user's), `scopes.md`, `inventory.md` (the lines tagged A), `baseline.md`,
  the brief, the skill.
- Source, in full with doc comments: `src/helpers/sessionStorage.ts`, `sessionStorageSeed.ts`, `storageTurns.ts`,
  `callSite.ts`; the storage parts of `src/pageObject.ts`; `index.ts`.
- Unit tests: `src/helpers/sessionStorage.test.ts`, `sessionStorageSeed.test.ts`, `storageTurns.test.ts`,
  `callSite.test.ts` (titles, the type contract, and the cases that bear on findings).
- Harness: `test/tests/testApp/sessionStorage.spec.ts` (the tests that bear on each question), `sessionStorageOverlay.spec.ts`,
  `test/tests/pageObject/callSite/` (seed part), `test/page-object-models/testApp/pages/teststorage/`,
  `test/fixtures/testApp.fixtures.ts` (storage fixtures), the `/teststorage*` routes of `test/server.js`, the storage
  lines of `test/tests/packaging/publicTypes.typecheck.ts`.
- Docs: `docs/session-storage.md`, `docs/seeding-session-storage.md`, `api/class-sessionstorage.md`, `api/errors.md`
  (*Session storage*, *seed*), `internal/seed-registry.md`, `internal/call-sites.md` (*Errors raised later*),
  `docs/upgrading-from-2x.md` (*Session storage*), AGENTS.md §2, §4, §5 and §8 storage lines.
- The 20 commits in the brief (messages, diffs where a promise needed checking) and their 16 changesets; issue drafts
  05, 06 and 08 (`git show 2f06702:release-3.0.2/issues/…`).
- Playwright 1.64.0's `page.sessionStorage` (client `WebStorage`, server `webStorage*`: one `evaluateExpression` in the
  main frame's utility world per call, no timeout) and `test.step` (`_onUserStepBegin` is awaited before the body; the
  overlay chains its updates).

## Inventory lines: coverage

Reviewed fully (read, and probed through the public API on the browsers named):

- Values and codecs (`json`, `Codec`, encode and decode, messages): chromium (`specs/values.spec.ts`).
- Keys at the boundary (`__proto__`, `constructor`, `hasOwnProperty`, `toString`, `valueOf`, empty, unicode with U+2028,
  lone surrogates, 1,000,000 characters) in `set`, `get` (one, list, all) and `clear` (list): chromium.
- The `origin` option and its message: Node 20.20.2, 22.18.0 and 24.22.0 (`node/origins.cjs`, identical output).
- Turns: two helpers on one page, overlapping calls, the popup case (all three browsers, `specs/popupchains.spec.ts`);
  calls that fail before or inside their turn (read, and the unit tests).
- `seed` at the call: on the origin, away, a fresh `about:blank` (harness), an inherited `about:blank`
  (`specs/popupseed.spec.ts`, `specs/popuporder.spec.ts`), a navigation in flight in both orders, 25 rounds each on
  three browsers (`specs/race.spec.ts`), a closed page (`specs/closed.spec.ts`), with a commit before, during and after
  registration (race probe and harness).
- Lifetimes of the four listeners and the call's temporary watch: after success, an encoding error, an in-flight
  failure, no Navigation API, a refused write, 50 merges, 4 pending origins (`specs/lifetimes.spec.ts`, three browsers).
- Failure reporting: a refused write when the app's first script navigates within the document (`specs/samedoc.spec.ts`,
  three browsers); `route.abort` on Firefox (`specs/aborted.spec.ts`, 8 runs); Firefox's and Chromium's error pages
  (`specs/errorpage.spec.ts`).
- Frames and documents: the harness's iframe, `srcdoc`/`about:blank`/`data:`, COOP/COEP, sandbox and service-worker
  tests (read; green in the baseline on three browsers); CSP on the seeded document (`specs/csp.spec.ts`, three
  browsers); a back navigation to a cacheable page (`specs/bfcache.spec.ts`, three browsers).
- Messages: every message of `api/errors.md` *Session storage* and *seed*, and every `@throws` of the storage doc
  comments, against the throw sites and probe output (see *What is sound*).
- Types: `Decoded`, `AllEntries`, `EntriesFor`, `KeyOnly`, `NonEmpty` against the runtime (`types/keys.typecheck.ts`,
  `types/schema-without-type.typecheck.ts`; the unit type contract read); the upgrade guide's three compiler errors
  (`types/upgrade-2x.typecheck.ts`).
- Batches and a navigation during them: `specs/batchleak.spec.ts`, `specs/clearall.spec.ts`,
  `specs/A1-batch-other-origin.spec.ts`, `specs/A1-deterministic.spec.ts`, three browsers, and a source sketch.

Reviewed partly:

- Call sites (`callSite.ts`): read and unit tests run; the harness's consumer-file check was green in the baseline. Not
  probed beyond that.
- `internal/seed-registry.md`'s measured claims ("about once in a hundred such rounds", "no overwrite in 300 rounds per
  engine", "350 rounds"): not re-measured; the harness's 10-round race tests were green in the baseline.

Not run: the harness at the latest Playwright 1.x; WebKit or Firefox for the value and key probes (Node-side logic,
chromium only); a `v3.0.1` worktree (see *Decisions*).

## Test gaps, most important first

1. A batch interrupted by a navigation to another origin: `sessionStorage.spec.ts:78-102` asserts B's render-time
   snapshot (`#current`), not B's live storage, and nothing forces a commit between two calls; `clear()`, `clear(keys)`,
   `get(keys)` and an on-origin `seed` interrupted by a navigation have no harness test at all (A-1).
2. Overlapping calls from a bound and an unbound helper on a page whose URL has no origin (A-2).
3. `seed` on an `about:blank` popup that inherited the origin, followed by `set` before the arrival: only the Firefox
   not-applied path is pinned, by a `test.fail` (A-3).
4. The storage types for keys that are neither `string` nor literals, and a page object with a schema value but no
   `storage` type (A-4, A-7).
5. The opaque-origin message on Firefox's error page (A-5).
6. A back/forward-cache restore of a seeded origin: every `/teststorage` route sends `Cache-Control: no-store`, so no
   fixture page is cache-eligible. Playwright disables the cache in Chromium (`--disable-back-forward-cache`), and the
   probe found no restore in Firefox or WebKit for a cross-origin back; if a browser did restore, the registry would
   take the seed out of pending at `framenavigated` with no document to write or report. Untested, unobserved.
7. The never-applied message with several pending origins (label and call site are the first seed's only).

## What is sound

- Values: a codec that throws in `stringify` or `parse` (also a thrown string), returns a number, `json` with
  `undefined`, a `BigInt`, a cyclic value, `NaN`, `null` and a `Date`: each fails or behaves as documented ("JSON.parse(…)
  as T"), a bad value in a batch writes nothing, and the decode message gives the reason, length and quoted value
  (chromium, `out/values.100931.log`).
- Keys: `__proto__`, `constructor`, `hasOwnProperty`, `toString`, `valueOf`, empty, unicode, lone surrogates and a
  1,000,000-character value round-trip through `set`, `get` (one, list, all) and `clear` (list) (same log).
- The `origin` option: identical on Node 20, 22 and 24; schemes without a URL origin rejected with the reason;
  normalisation of case, default port, IDN, trailing slash (`out/origins-v*.log`). It is lenient (accepts a bare `?`
  or `#`, credentials, whitespace, `/.`) but always normalises to the origin, so harmless.
- Ordering: on a page on the origin, a bound and an unbound helper overlapping end in call order (control of
  `popupchains`, three browsers).
- `seed` raced by a navigation to its origin, `seed` first and `goto` first, 25 rounds each: never resolved without the
  entries on any browser; Chromium failed at the call every round (although the document had the entries), Firefox and
  WebKit applied every round, both as documented (`out/race.100730.log`).
- A refused write is reported even when the app's first script calls `history.replaceState`, `pushState` or sets
  `location.hash` (three browsers, `out/samedoc.095936.log`).
- A seeded document served with a CSP (`script-src` nonce, `default-src 'none'`, `require-trusted-types-for`) receives
  the entries before its first script (three browsers, `out/csp.100823.log`).
- A back navigation to a seeded, cacheable page is a fresh load and is seeded (three browsers, `out/bfcache.095919.log`).
- Listener lifetimes: none left after a success, an encoding error, an in-flight failure, a missing Navigation API or a
  refused write; the call's temporary watch is removed every time; listeners stay while other origins are pending
  (three browsers, `out/lifetimes.101043.log`).
- Failed navigation on Firefox with `route.abort("connectionrefused")`: the test fails naming the opaque document, 8 of 8
  runs, as the table says (`out/aborted.101810.log`).
- Messages, character for character against the code and probe output: no origin yet, sandboxed document, another
  origin, batch `set` and `clear`, not a string, could not be encoded, codec returned, could not be decoded, the two
  constructor messages; for `seed`: origin required, in flight, Navigation API, closed while registering, could not write
  (browser wording varies), never applied, not applied (opaque, return). The `@throws` texts match.
- The upgrade guide's three compiler errors reproduce against the current types (`out/types-upgrade.log`; tsc prints
  them in another order).
- `__proto__` survives the pending merge and the init script's `[key, value]` pairs (read; unit test; harness).
- The scope's unit tests: 126 passed, no type errors (`out/unit-scope.log`).
- AGENTS.md §5 and §8 storage rules: the code does what they say, except where A-1 and A-2 show the origin and order
  rules failing on the paths named there; no route, proxy, binding or own document in `seed`.

## Outside the scope

- Scope F (exports): `EntriesFor`, `NonEmpty` and `KeyOnly` appear in the public parameter types of `set`, `get`,
  `clear` and `seed` (`dist/index.d.ts:515-521`, `:634-715`) but are not exported. `.changeset/export-storage-types.md`
  says the four types it exports "were used in the public signatures but not exported", "as every other public signature
  already allows", which holds for return types (AGENTS.md §5's rule) but not for these parameter types. A consumer
  wrapping `get(keys)` cannot name `NonEmpty`. Note for F; not filed here.

## Considered and not filed

- `seed` on a page that was already closed fails with "the page closed while seed() was registering … await seed()
  before the test ends" (`out/closed.101831.log`): the cause is right, the advice assumes a close during the call.
- The never-applied message for several origins reads "the seed for X (…) and the seed for Y (…) was never applied" and
  carries the first seed's label and line only (`out/lifetimes.101043.log`). Cosmetic.
- `set({})`, `get([])` and `clear([])` resolve on `about:blank`, while *Through a page object* says "every call fails at
  once" on a page without an origin; consistent with "a list that is empty at run time reads nothing".
- A pending seed outlives the test that made it when one page is shared by several tests (serial mode with a page from
  `beforeAll`): the registry is per page and nothing runs at a test's end, so it would apply in a later test or be
  reported by whatever closes the page. By reading only; not probed.

## Decisions taken without asking

- No `v3.0.1` worktree: none of the findings can be a regression of the 3.0.2 work. A-1's loop and its single origin
  check are the same in `v3.0.1` (`git show v3.0.1:src/helpers/sessionStorage.ts`, lines 278-281 and 401-402); A-2 to
  A-5 and A-7 concern code or promises added since (`34c2ec0`, `d4cffbb`, `64cd0b7`, `17426a5`), whose paths I probed at
  `54cdada`.
- A-3 is a defect, not a documentation finding: it was first filed as documentation (the Firefox case is decided in
  `d4cffbb`'s commit message), but the Chromium and WebKit consequence, a later `set` overwritten at the arrival, is
  recorded nowhere and is a wrong result.
- A-7 is a documentation finding, not a defect: it is the mirror of the decided, filed issue 06, and the docs' note
  covers only one direction; the narrow type fix is offered as an option.
- A-1 is Medium: the race needs a navigation during a call, but the docs name that case, and when it hits, the effect is
  on another origin's data and silent.
- A-5 is a defect (a message naming the wrong cause), not documentation, since the text is code.
- For speed I started the harness server myself (`node server.js` in `test/`, port 9000), which the config reuses; it is
  stopped at the end.

## Worktree state at the end

Clean (`git status --porcelain` empty); ignored files as `baseline.md` lists. The A-1 source sketch was restored with
`git checkout -- src/helpers/sessionStorage.ts` and `pnpm harness:install` rerun (exit 0); a chromium rerun of the
deterministic probe leaked again afterwards, so the installed package is `54cdada`'s. No extra worktree was added.
