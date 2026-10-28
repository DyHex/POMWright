<!-- Saved by the orchestrator from the segment agent's final message: the agent's own write of this file was refused by
the harness rule "Subagents should return findings as text, not write report files". The text below is the agent's,
unchanged. -->

# Segment 2A: Session storage — summary

Segment 2A of the second whole-project review of POMWright at `d850405` (`fix/review-3-0-2`), reviewed as an *area*,
with the storage commits since `v3.0.1` as a change set (those after `54cdada` first). Worktree
`/home/magdys/workspace/dyhex/POMWright-second-review`; probes and their outputs in
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/` (`bin/run-spec.sh` copies a probe spec into
`test/tests/zz-probe-A-*`, runs it, removes it, and writes `<probe>.out` beside it). Reviewer: Opus 5.5, second review,
segment 2A; 2026-10-28, 13:49 to 14:50 (+01:00). Passes: see `log.md` (markers), `inventory-blind.md`,
`first-review.md`, `inventory-reconciled.md`.

## Findings index

| ID | Kind | Severity | Semver | Pass | First review | One line |
| --- | --- | --- | --- | --- | --- | --- |
| [2A-1](defect-2A-1-seed-fails-during-redirect-chain.md) | defect | Medium | patch | 1 | missed (since v3.0.1) | On Chromium, a page's first `seed` fails with Playwright's "Execution context was destroyed" when the page goes through two or more script redirects on another origin (15 of 15 rounds; Firefox and WebKit 0) |
| [2A-9](defect-2A-9-unbound-waiting-call-acts-on-other-origin.md) | defect | Medium | patch | 1 | missed (since `34c2ec0`; beside A-1's fix) | A call of a helper without an origin that waited for its turn does not check the origin again and acts on the origin the page moved to: writes there, reads it, or clears it |
| [2A-2](defect-2A-2-no-origin-message-on-inherited-or-closed-popup.md) | defect | Low | patch | 1 | missed (since v3.0.1) | On an `about:blank` page, any failed storage call says "the page has no origin yet", also when the document inherited the origin (a refused write) or the popup is closed |
| [2A-3](defect-2A-3-inputs-read-after-the-call.md) | defect | Low | patch | 1 | missed (since v3.0.1) | `set`, `seed`, `get` and `clear` read their entries, values and key lists after the call returns, so a change the caller makes before the call settles changes what it does |
| [2A-4](defect-2A-4-keys-unquoted-in-messages.md) | defect | Low | patch | 1 | missed (since v3.0.1; the in-flight key since `56229e2`) | Batch and seed messages print keys unquoted: an empty key reads "()" or "(keys: )", a key with ", " reads as two |
| [2A-10](defect-2A-10-opaque-check-reads-shadowable-origin.md) | defect | Low | patch | 1 | missed (since `17426a5`) | A sandboxed document whose script declares a global `origin` loses the opaque-origin message on all three browsers (the check reads `self.origin` in the page's world) |
| [2A-5](defect-2A-5-sandboxed-arrival-not-listed.md) | documentation | Low | none | 1 | missed | *What `seed` cannot do*, which the API page says "lists every such case", leaves out an arrival on a sandboxed document (which fails the test, correctly, on all three browsers) |
| [2A-6](defect-2A-6-schema-extra-codec-compiles.md) | documentation | Low | none | 1 | new since `54cdada` (`e05b84d`) | The docs say one schema mismatch still compiles; a schema variable with a codec the type does not declare compiles too, and `get` returns that codec's value typed as a string (decision 38 knows it; the docs' note does not) |
| [2A-7](defect-2A-7-upgrading-ts2339-text-stale.md) | documentation | Low | none | 1 | new since `54cdada` (`f422b77`) | *Upgrading from 2.x* quotes `TS2339 … on type 'string \| null'`; TypeScript now prints `'string \| { name: string; age: number; } \| null'` |
| [2A-8](defect-2A-8-same-origin-navigation-stops-a-batch.md) | design question | Low | patch if adopted | 1 | not discussed (since v3.0.1) | A navigation within the origin stops a batch and fails the call (6 of 6 rounds, three browsers), although the storage written is the same |

Counts: **6 defects** (2 Medium, 4 Low; all patch), **3 documentation** (all Low; none), **0 suspected**, **1 design
question** (Low). Pass 4 added no finding.

## What I read

- The method (`skills/defect-review/SKILL.md`, the worktree's copy), `segments.md`, `baseline.md`, the brief; the guide:
  `AGENTS.md`, `src/AGENTS.md`, `src/helpers/AGENTS.md`, `test/AGENTS.md` in full; `docs/versioning.md`, the planning
  rule of `docs/releases.md`.
- Source in full with doc comments: `src/helpers/sessionStorage.ts`, `sessionStorageSeed.ts`, `storageTurns.ts`,
  `callSite.ts`, `src/pageObject.ts`. Playwright 1.64.0: `page.sessionStorage` (`webStorage*`, one evaluation in the
  main frame's utility world) and `test.step` (`_onUserStepBegin` always awaited before the body).
- Unit tests (titles; the cases a finding touches), the harness specs `sessionStorage.spec.ts` (titles, and the sections
  for popups, opaque documents, batches, overlapping calls, races, frames), `sessionStorageOverlay.spec.ts`, the
  teststorage page objects and fixtures, the `/teststorage*` routes, the storage part of `publicTypes.typecheck.ts`.
- Docs: `docs/session-storage.md`, `docs/seeding-session-storage.md`, `api/class-sessionstorage.md`, `api/errors.md`
  (*Session storage*, *seed*), `internal/seed-registry.md`, `internal/call-sites.md`, `docs/upgrading-from-2x.md`
  (*Session storage*), `docs/typescript.md` (the table), and the storage parts of `api/types.md` and
  `api/class-pageobject.md`.
- The change set `v3.0.1..d850405` for the storage files (pathspec `':!defect-review-result'` in pass 1), the diffs of
  `56229e2`, the stats and messages of the other storage commits after `54cdada`, and the 21 storage changesets.
- Pass 2: the first review's scope A, report rows and ledger, decisions and plans (listed in `first-review.md`).

## Coverage of the inventory

Reviewed fully (read and probed through the public API, on the browsers named in each finding or *What is sound* line):
exports and members; values, codecs and keys; the origin option and checks; the origin around every call; turns;
`seed` at the call, registration, the init script's behaviour, lifetimes and later failures; messages; steps and their
locations; types; the docs pages, the guide's storage lines and the pending changesets.

Reviewed partly:

- Frames (`srcdoc`, `about:blank`, `data:`, cross-site iframes per browser), COOP and COEP, service workers and the
  seeded-navigation claims (headers, method, body, fragment): the harness specs read for what they exercise, green on
  three browsers in the baseline at `d850405`; not probed beyond them.
- *Internal → The seed registry*'s counterfactual "about once in a hundred such rounds" without the first-arrival
  condition: not re-measured (it needs the condition removed from the source). The claims about the current code
  (300 and 350 rounds) were re-measured and hold.
- "A failing call leaves the pending seed as it was": read and unit-tested only, in both reviews; a failure inside
  registration that is neither a commit nor a close cannot be caused through the public API.
- Call sites: read, the unit tests, the harness's consumer-file spec (baseline), and the probes' printed locations.

Not run: the harness at the latest Playwright 1.x (CI ran it on chromium); Node 26; a `v3.0.1` worktree (none of the
findings is a regression of the 3.0.2 work: git history dates each cause, see the *First review* lines); fix sketches:
proposed for 2A-1, 2A-9, 2A-2 and 2A-10 in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/` for the
orchestrator to run (each diff checked with `git apply --check` and, on a copy outside the worktree, with biome and the
unit tests). *(Updated by the orchestrator from the agent's follow-up message: a source sketch was at first refused by
the permission system as a change to tracked files; the maintainer then allowed sketches with the orchestrator as their
gate.)*

Excluded: `defect-review-result/` as a reviewed object (read in pass 2 as a source), per `baseline.md`.

## Test gaps, most important first

1. A helper without an origin whose call waits behind a call the page leaves for another origin (2A-9): nothing tests
   a standalone helper's waiting call; the turn-start check is tested only for a bound helper
   (`storageTurns.test.ts`, *a call whose turn comes after the page left the helper's origin*).
2. A page's first `seed` while the page replaces its document more than once on another origin (2A-1).
3. A pending seed whose arriving document is sandboxed (2A-5): the sandboxed specs cover `set`, `get` and an on-origin
   `seed` only.
4. A storage call refused for another reason on an inherited `about:blank` popup, and a call on a closed popup (2A-2).
5. Inputs changed after the call and before it settles (2A-3).
6. The opaque-origin message on a document with its own global `origin` (2A-10).
7. Messages that name an empty key or a key with ", " (2A-4).
8. `test/step-locations` checks `set` among the storage methods; `get`, `get(keys)`, `clear` and `seed` are reported
   at the caller's line (p11) but not checked there (2E's check).
9. Compiler messages quoted in the docs are not compared with the compiler (2A-7; 2T's checks).
10. A back/forward-cache restore of a seeded origin: decided untestable (#60), named on *Internal → The seed registry*.

## What is sound

- Listener lifetimes: back to a fresh page's counts after a seed applied, an on-origin seed, an encoding error, a bad
  origin, no origin, a raced commit and no Navigation API (`p03-batch2`, chromium); `lifetimes.spec.ts` re-run on three
  browsers.
- Script disposal: 20 merged pending seeds, one set of listeners, nothing rewritten after the app overwrote and the page
  went away and back (`p03-batch2`); a seed raced by its own hop leaves no script (`p12-raced-leftover`, 12 rounds on
  each of three browsers).
- Turns while the page stays on the origin: four helpers (page object, twin, bound and unbound standalone) and mixed
  `set`/`get`/`clear`/`seed` in one `Promise.all`, 20 rounds, none out of order (`p06` TURN, chromium); the same with
  `video.show.test`, 10 rounds (`p07`).
- Keys `__proto__`, `constructor`, `toString`, `hasOwnProperty`, `valueOf`, empty, unicode, a newline and a
  10,000-character key through `set`, `get` (one, list, all), `clear(list)`, `seed` on the origin and pending with a later
  merge, on three browsers (`p08`); prototype names declared in a schema object decode through their codecs.
- Codecs and `json`: errors with causes, `bigint`, cycles, `undefined`, functions, `NaN`, `Date`; a bad value writes
  nothing (`p08`; `values.spec.ts` re-run).
- The `origin` option: messages through the built package (`n01`), identical on Node 20, 22 and 24 (`origins.cjs`).
- Seeds for host forms (IDN in upper case, IPv6 written long, an upper-case scheme with a default port, an IPv4
  shorthand, a trailing dot, credentials) apply on three browsers (`pass4/p15`).
- Step locations: `get`, `get(keys)`, `clear`, `seed` (on the origin and pending), `set`, and a `get` inside a boxed
  `test.step`, at the caller's line; a failing `get` and `seed` report their errors there (`p11`, chromium).
- Types: the API page's `Decoded` and `AllEntries` examples hold exactly; the errors page's compile error is the first
  line TypeScript prints for a value without its type (`t01`, `t02`).
- *What `seed` cannot do*, the after-click row: after `await link.click()` the page has committed on the origin, and
  `seed` writes after the first script, on three browsers (`p10`).
- Two pages of one context: a seed applies only on its page (`p06` TWOPAGES).
- A sandboxed arrival fails the test with the opaque message on three browsers (`p04`); only the docs' table misses it.
- A seed on a page shared by a serial group: never applied, the last test fails with the seeding line in the stack;
  applied by a later test's arrival (`pass4/p14`). Not silent.
- The ESM and CommonJS entries share one module, so one set of turn chains and registries (`n02`).
- The measured claims about the current code on *Internal → The seed registry*: no overwrite in 300 rounds per mode
  (reload, replace, remove and reload) and 350 quick returns, per engine (`pass4/rounds300.*.out`, `bounce350.*.out`).
- The first review's findings A-1 to A-8 and R-2, and the storage part of E-1: fixed (`first-review.md`); its *What is
  sound* lines hold, except the upgrade guide's errors (2A-7).

## Outside the segment

- **2T (harness)**: the fixture page's `#startup` and `#current` snapshots use `Object.entries(sessionStorage)`, which
  leaves out keys named like `Storage.prototype` members on every engine (and Firefox's `Object.keys(sessionStorage)`
  lists 4 of 9 such keys, `p08-keys-values.firefox.out`). No spec relies on it for such keys (the `__proto__` specs use
  `getItem`), so not a defect; a trap for a later spec.
- **2T (checks)**: no check compares compiler output quoted in the docs with the compiler (the cause of 2A-7).
- **2D (page objects)**: `api/class-pageobject.md`, `sessionStorage` property: "The session storage helper for the page
  object's origin", with no word on a RegExp `baseUrl` (no origin); the doc comment and *Session storage* say it. Low,
  not filed.
- **2E (steps)**: `test/step-locations` covers `set` only among the storage methods (test gap 8).

## Pass 2 outcomes

Fixed 10 (A-1, A-2, A-3, A-4, A-5, A-6 via B-7, A-7, A-8 via H-5, R-2, and E-1's storage part); fixed differently 0;
still present 0; not fixed 0; fixed incompletely 0; regressed 0; cannot re-run 0. The first review's *What is sound*
lines: 14 hold, 1 no longer holds (the upgrade guide's TS2339, 2A-7). Its test gaps: 6 closed, 1 open by decision
(#60). Its items left for this review: two agreed as not filed, one probed in pass 4 (shared page, not filed), one
decided (`normaliseOrigin`).

## What passes 3 and 4 changed

- Pass 3 dated every blind finding against the first review: 2A-6 and 2A-7 are new since `54cdada` (the fixes of A-7
  and A-4 left them); the other eight were present before `54cdada` and missed. 2A-9 sits beside A-1's fix: decision 9
  checks calls in flight, not a standalone helper's call queued behind them. No first-review finding in the area was a
  blind spot of pass 1 (all are fixed, and their paths were probed in pass 1, except A-8's route list, not compared in
  pass 1 and checked in pass 2).
- Pass 4 probed what neither review had: the measured claims (hold), a seed on a shared page (not silent), host forms
  (sound), one module copy (sound). It found nothing new to file; it also recorded the refused fix sketch.
