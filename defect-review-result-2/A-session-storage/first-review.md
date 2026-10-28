# Segment 2A: the first review's findings and claims at `d850405`

The first review's scope A (`defect-review-result/A-session-storage/`, at `54cdada`), its report rows, ledger rows,
decisions (#9, #13, #14, #18, #26, #30, #36, #38, #47, #60, and #12 for the storage part of E-1), plans 20 to 24, 30 and
40 with their execution notes, and the items `PLAN-release-gates-and-audit.md` leaves for this review. Each probe was
copied from `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/` into
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/run1/<ID>/` and run against the worktree at `d850405`
with `bin/run-spec.sh` (a copy in `test/tests/zz-probe-A-*`, `pnpm -C test exec playwright test … --reporter=line`,
removed after the run); each output is beside its probe (`<probe>.<browser>.out`). Reviewer: Opus 5.5, second review,
segment 2A, 2026-10-28.

## Findings

| ID | First review | Decision, plan, commits | Re-run at `d850405` | Outcome |
| --- | --- | --- | --- | --- |
| A-1 | Medium defect: a bound helper's batch lands in another origin when the page commits there between two calls | #9, plan 20, `56229e2` | `A-1/A1-deterministic.spec.ts`, three browsers: `set`, `clear(keys)` and an on-origin `seed` each fail (`… 2 of 6 keys were written (k0, k1); k2 was being written and may have reached the new document`), B's storage `{}` (or B's own six entries kept for `clear`). The probe's own regex expects the sketch's "3 of 6" and fails on that alone; decision 9 item 2 counts the key in flight separately. Natural timing, `A1-batch-other-origin-inflight.spec.ts` (a variant that accepts only the key the message names, decision 9 item 3): 0 of 40 rounds leaked an unnamed key on each browser; in a 4× chromium run, one round put `k20` in B and the message named `k20` in flight. `batchleak` and `clearall`: no key in B, B's keys all kept (chromium). | **fixed** |
| A-2 | Low defect: on an inherited `about:blank` popup, a bound and an unbound helper take different chains | #13, plan 21, `e231dc2` | `A-2/popupchains.spec.ts`, three browsers: `shared = later` in 5 of 5 rounds and in the control | **fixed** |
| A-3 | Low defect: `seed` on an inherited popup registers; a later `set` is overwritten (Chromium, WebKit), Firefox fails | #14, plan 21, `52f2d4c` | `A-3/popuporder.spec.ts` and `popupseed.spec.ts`, three browsers: `startupAfterNavigation {"token":"set"}`; the seed applies on Firefox too (`startup {"token":"seeded"}`) | **fixed** |
| A-4 | Low defect: a template or branded key typed as a plain string | #18, plan 23, `f422b77` | `A-4/keys.typecheck.ts` in `test/tests`, `pnpm exec tsc --noEmit -p test`, exit 2 with two `Unused '@ts-expect-error'`: line 32 (`set(prefixed, { name })`, which the probe says should be accepted, is accepted now) and line 23 (assigns a string to `Decoded<…, \`u${string}\`>`, which is `string \| User` before and after: the line cannot tell). Lines 12 and 18 (`get` of a pattern or branded key as `string \| null`) are now rejected, as the probe wants; the control holds. My own `t01-types.typecheck.ts` asserts the per-member types exactly. | **fixed** |
| A-5 | Low defect: Firefox's error page called sandboxed | #26, plan 22, `186bc5f` | `A-5/errorpage.spec.ts`, three browsers: Firefox `… its origin is opaque (the browser's error page after a failed navigation, or a sandboxed document: …)` for `set`, `get` and `seed`; Chromium `the page has no origin yet (chrome-error://chromewebdata/)`; WebKit stays on B and gives the origin message, as decision 26 records. Chromium and WebKit end with the probe's own never-applied seed (as in the first run). | **fixed** |
| A-6 (merged into B-7) | Low documentation: `seed`'s lists miss the on-origin write failures; `get`'s and `clear`'s miss the opaque document | #36, plan 30, `429f2c2` | `grep`: the on-origin navigation and opaque messages of `seed` are in `api/errors.md`, `api/class-sessionstorage.md`, `docs/seeding-session-storage.md` and `seed`'s `@throws`; the opaque message is in `get`'s and `clear`'s `@throws` and on the API page's *Methods*; the count sentences say "the first nine … the eighth and ninth" | **fixed** |
| A-7 | Low documentation (code option): a schema value without its `storage` type compiles | #38, plan 24, `e05b84d` | `A-7/schema-without-type.typecheck.ts`, `tsc`, exit 2: both `COMPILES` lines (a variable and an inline value without the type) are now the documented compile error, `… is not assignable to type 'Record<string, "declare the schema's type …">'` | **fixed** (option 2, one of the finding's options). The case decision 38 item 7 leaves for #58, a schema variable with an extra codec, is still claimed away by the docs' note: new finding 2A-6 |
| A-8 (merged into H-5) | Low documentation: two `/teststorage` routes missing from AGENTS.md §4 | #47, plan 40, `1b15aff` | every `app.get/post("/teststorage…")` of `test/server.js` (16 routes) is named in `test/AGENTS.md`, *The harness* (the guide moved there with `9923a9f`/`6d1de0e`) | **fixed** |
| R-2 | Low defect (consolidation): the never-applied message for several origins | #30, plan 22, `c35eae4` | `R-2/lifetimes.spec.ts`, three browsers: `SessionStorage.seed: 3 seeds were never applied: … :` and one line per seed, `SessionStorage.seed at tests/zz-probe-A-lifetimes.spec.ts:28:74, for http://localhost:9001 (keys: k)` | **fixed** |
| E-1, storage part | Medium defect (scope E): helpers' steps inside a boxed step reported in the bundle | #12, plan 16, `b19de77` | my `p11-step-locations.spec.ts` with a reporter that prints step locations: `TestStorageSecond.SessionStorage.get` inside a boxed `test.step` at the spec's line 15; `get`, `clear`, `seed` (both kinds), `set` and two failing calls at their lines | **fixed** (storage part; E's own probe is 2E's) |

Outcome counts: fixed 10 (A-1 to A-8, R-2, E-1's storage part); fixed differently 0; still present 0; not fixed 0;
fixed incompletely 0; regressed 0; cannot re-run 0. Two neighbours of these fixes are new findings of this review:
2A-9 (A-1's check covers calls in flight, not a helper without an origin whose call waited behind them) and 2A-6 (A-7's
docs note).

## The first review's *What is sound* lines

| Claim (scope A `summary.md`) | Re-run | Note |
| --- | --- | --- |
| Values: codecs that throw, return a number, `json` with `undefined`, `BigInt`, cycles, `NaN`, `null`, `Date`; a bad value in a batch writes nothing; the decode message | `sound/values.spec.ts`, chromium, exit 0, same outputs (`values.chromium.out`) | holds; my `p08` adds firefox and webkit for the keys |
| Keys: `__proto__`, `constructor`, `hasOwnProperty`, `toString`, `valueOf`, empty, unicode, long values through `set`, `get`, `clear` | same probe; my `p08-keys-values.spec.ts` on three browsers, every method including `seed` pending and on the origin | holds |
| The `origin` option identical on Node 20, 22 and 24; lenient but normalising | `sound/origins.cjs` (pointed at this worktree's `dist/index.js`) on Node 20.20.2, 22.18.0 and 24.22.0: identical outputs (same MD5) | holds |
| Ordering: bound and unbound helpers on a page on the origin end in call order | `popupchains` control, three browsers; my `TURN` probe (four helpers, mixed calls) and `OVERLAY` probe | holds, for calls whose turn comes while the page is still on the origin; not when the page leaves first (2A-9) |
| `seed` raced by a navigation to its origin never resolves without its entries | `sound/race.spec.ts`, three browsers, 25 rounds each order: Chromium fails at the call 25/25 each way, Firefox and WebKit resolve with the entries 25/25 | holds |
| A refused write is reported when the app's first script makes a same-document navigation | `sound/samedoc.spec.ts`, three browsers: 4 of 4 tests fail with `could not write sessionStorage …` | holds |
| A CSP-served seeded document receives the entries before its first script | `sound/csp.spec.ts`, three browsers, 3 passed each | holds |
| A back navigation to a seeded, cacheable page is a fresh load and is seeded | `sound/bfcache.spec.ts`, three browsers, passed | holds |
| Listener lifetimes after success and every failure; the call's watch removed | `R-2/lifetimes.spec.ts`, three browsers; my `p03-batch2` (chromium) | holds |
| Firefox `route.abort("connectionrefused")`: the test fails naming the opaque document, 8 of 8 | `sound/aborted.spec.ts`, firefox, one run: fails with `… was not applied: the document that arrived … has an opaque origin …` | holds (1 run, not 8) |
| Messages character for character | the probes above and mine (`p01`, `p03`, `p08`, `n01`, `p09`) print the documented texts | holds, with 2A-4 (keys printed unquoted) and 2A-2 (a "no origin yet" that names the wrong cause) as message findings |
| "The upgrade guide's three compiler errors reproduce against the current types" | `sound/upgrade-2x.typecheck.ts` not needed: my `t01-types.typecheck.ts` holds the page's 2.x lines | **no longer holds**: TS2339 now reads `on type 'string \| { name: string; age: number; } \| null'` since `f422b77`: 2A-7 |
| `__proto__` survives the pending merge and the script's pairs | my `p08` on three browsers (a pending seed merged with a later `__proto__` value, read with `getItem` on arrival) | holds |
| The scope's unit tests pass | baseline: `pnpm test:unit` 904 passed | holds |
| AGENTS.md §5 and §8 storage rules hold except A-1 and A-2 | now `src/helpers/AGENTS.md` *Session storage* and *Do not* | holds except 2A-1 (a navigation elsewhere fails the first seed on Chromium), 2A-9 (the turn-start re-check skips a helper without an origin), 2A-3 (overlapping calls read their input late) |

## The first review's test gaps

| # | Gap | Now |
| --- | --- | --- |
| 1 | A batch interrupted by a navigation to another origin; `clear`, `get(keys)`, on-origin `seed` | **closed**: `sessionStorage.spec.ts` *a batch the page leaves* (natural timing reads B's live storage) and *the page commits on the other origin between two calls that both succeed* (`set`, `clear(keys)`, `clear()`, `get(keys)`, on-origin `seed`) |
| 2 | Overlapping bound and unbound calls on an inherited popup | **closed**: `sessionStorage.spec.ts:57` |
| 3 | `seed` then `set` on an inherited popup | **closed**: `sessionStorage.spec.ts:69`, `:77` |
| 4 | Types of pattern and branded keys; a schema without `storage` | **closed**: `sessionStorage.test.ts` *Decoded, per member*; `publicTypes.typecheck.ts:476-650` |
| 5 | The opaque message on Firefox's error page | **closed**: `sessionStorage.spec.ts:88` (each browser's outcome) |
| 6 | A back/forward-cache restore of a seeded origin | **open, decided** (#60: one sentence on *Internal → The seed registry*, *Limits*; present) |
| 7 | The never-applied message for several origins | **closed**: `sessionStorage.spec.ts:963-1022` |

## Items left for this review (`PLAN-release-gates-and-audit.md`, report §9 *Considered and not filed*)

- **`seed` on a page already closed** says "the page closed while seed() was registering … await seed() before the test
  ends": re-run `sound/closed.spec.ts` and my `p03-batch2` (P3b): unchanged. Agree with the first review: the cause is
  right, the advice assumes a close during the call. Not filed.
- **`set({})`, `get([])`, `clear([])` resolve on `about:blank`** while *Through a page object* says "every call fails
  at once" there: re-run (`values.spec.ts`): unchanged. Agree: nothing touches storage, and the empty-list rule is
  documented. Not filed; the sentence could say "every call that reads or writes".
- **A pending seed outliving a test on a page shared by several tests**: not probed by the first review; probed in pass 4
  (see `log.md`).
- **`normaliseOrigin`**, a British spelling: the only one left in this segment's files (`grep` of the source, unit tests,
  specs and pages in scope); an internal name, left by plan 38's decision. Not a finding.

## Neighbours checked

- F-4 (scope F): `docs/typescript.md`'s table now lists `SessionStorageOptions`, `SeedOptions`, `Decoded` and
  `AllEntries` (lines 33-35), and my type probe imports all four from `pomwright`.
- F-5 (scope F): `.changeset/export-storage-types.md` no longer says "as every other public signature already allows".
- `EntriesFor`, `NonEmpty`, `KeyOnly` unexported: decided by `docs/versioning.md` ("outside that promise").
