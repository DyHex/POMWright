# Plan 20: session storage calls check the origin before and after every call

- **Decisions**: [DECISIONS.md](DECISIONS.md) #9
- **Findings**: [A-1](A-session-storage/defect-A-1-batch-lands-on-other-origin.md) (Medium); test gap #2
- **Bump**: patch (the pending `batch-navigation-message.md` amended)
- **Stop**: no
- **Depends on**: plan 16 (`sessionStorage.ts`'s step options); before plans 21 and 22 (the same code path)

## Contract

Every storage call of every helper (with or without `origin`) checks the page's origin before and after it, and fails
with the navigation message when the origin moved, whether or not the call threw: batches (`set`, `clear(keys)`, an
on-origin `seed`), single calls (a one-key `set`, `get`, `clear()`) and the parallel reads of `get(keys)` (a read that
came from the new origin fails instead of returning its values). The message names the keys done and the key in flight,
which may have reached the new document. A call in flight when the page leaves is detected, not prevented, and the docs
say so. The check reads `page.url()`, a field Playwright's client keeps current: no extra round trip.

## Current behaviour

- `src/helpers/sessionStorage.ts:331-356` `eachKey` compares the origin only when a call **throws**, so when the commit
  lands between two calls, the next `setItem` or `removeItem` succeeds on the new origin: the batch writes into, or
  removes from, another origin's storage, on all three browsers (`…-probes/A/` in the finding). It also skips the check
  when the batch started without a URL origin (`start === undefined`).
- `read()` (`:475-503`): `get(key)`, `get(keys)` (in parallel) and `get()` have no origin check; `clear()` (`:531-533`)
  neither.
- The existing spec `test/tests/testApp/sessionStorage.spec.ts:78-102` asserts the other origin's render-time snapshot,
  not its live storage.

## Steps

1. `sessionStorage.ts`: one internal `guarded(method, keys, call)` (or `eachKey` extended) that, around **every**
   `access` call: reads the origin before, runs the call, reads it after, and when it moved (or the call threw with
   "Execution context was destroyed") throws the navigation message; used by `write`, `clear(keys)`, the single calls
   (`get(key)`, `clear()`, `get()`), each read of `get(keys)` (the first failure wins; values from a moved page are never
   returned), and the on-origin `seed` write. A page without a URL origin at the start (an `about:blank` popup) compares
   like with like: `originOf(url)` before and after, and when both are `undefined`, the URL itself (plan 21 relies on
   this; probe the popup case).
2. The message, extended (final wording from a probe, punctuated as reads best): `Shop.SessionStorage.set: the page
   navigated while set() was writing to https://shop.example; 2 of 60 keys were written (k0, k1); k2 was being written
   and may have reached the new document`; for a single call `… while get() was reading "token" from …; it may have read
   the new document`, and the matching forms for `clear`. Each method's `@throws` and doc comment updated.
3. **Tests** (closing test gap #2):
   - a harness spec on chromium, firefox and webkit that forces the commit between two calls by wrapping
     `page.sessionStorage`'s methods (as the finding's probe does), for `set`, `clear(keys)`, `clear()`, `get(keys)` and an
     on-origin `seed`, then reads the other origin's **live** storage (a page on it) and asserts nothing of the batch
     reached it after the commit;
   - the existing spec (`sessionStorage.spec.ts:78-102`) asserts the other origin's live storage instead of its
     render-time snapshot;
   - a unit test (`src/helpers/sessionStorage.test.ts`) with a fake page whose URL changes between two calls that both
     resolve.
   New fixture routes, if any, are listed for plan 40 (AGENTS.md §4).
4. **Docs**: *Session storage*, *The methods* (the check, and that a call in flight may act on the new document and then
   fails saying so); `api/class-sessionstorage.md` (`set`, `clear`, `get`, `seed`, **Throws**); `api/errors.md`,
   *Session storage*; the `@throws` of each method; AGENTS.md §5, the session storage bullet (every call checks the
   origin before and after it). Grep `website/` and `.changeset/` for "keys were written".
5. **Changeset**: amend `.changeset/batch-navigation-message.md`: every call is checked before and after, single calls
   and `get` included; the quoted message becomes the final one; "now fails" covers a navigation between two calls that
   both succeed (the case that wrote into the other origin).

## Verify

The standard checks (PLANS.md, rule 5); `pnpm docs:build`. Record the probe output that fixed the wording in *Execution
notes*.

## Commit

```text
fix: session storage calls check the origin before and after every call

A batch compared the origin only when a call threw, so a navigation between
two calls let the rest of the batch write into, or remove from, another
origin's storage. Every call of every helper now checks the page's origin
before and after it, single calls and parallel reads included, and fails
naming the keys done and the key in flight.

Plan: defect-review-result/PLAN-A-1-origin-checks.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27.

- `sessionStorage.ts`: `guarded(method, call, navigated)` reads `page.url()` before and after one `access` call; when the
  origin moved (or, for a URL without an origin, the URL itself changed), or the call failed with "Execution context was
  destroyed", it throws `navigated(from, cause)`, whether or not the call threw. `eachKey` runs each key through it (so
  `set`, `clear(key|keys)` and an on-origin `seed`, through `write`), and its message adds the key in flight;
  `navigatedDuring(method, doing, consequence)` builds the single-call form for `get(key)`, each read of `get(keys)`
  (in parallel, the first failure rejecting the read), `get()` and `clear()`. The batch-start origin of the old
  `eachKey` (and its skip when the batch started without an origin) is gone: each call compares its own before and
  after.
- Messages from the build (chromium, and the unit tests): `TestStorage.SessionStorage.set: the page navigated while set()
  was writing to http://localhost:9000; 2 of 6 keys were written (k0, k1); k2 was being written and may have reached the
  new document`; the same for `clear(keys)` ("removing keys from", "removed") and an on-origin `seed`;
  `… clear() was removing every entry from …; it may have reached the new document`; `… get() was reading "k1" from …; it
  may have read the new document`; `… get() was reading every entry from …`; a URL without an origin, `… set() was
  writing to about:blank; …`. Docs use the same template with the docs' example values.
- Tests: unit (`sessionStorage.test.ts`): the three existing messages gain the in-flight key; *a call the page leaves
  while it succeeds*: a batch stopped between two resolved calls, a same-origin navigation that goes on, `get` of one
  key, several and all failing instead of returning, the single-call form, a URL without an origin compared whole.
  Harness (`test/tests/testApp/sessionStorage.spec.ts`, three browsers): the natural-timing batch test reads the other
  origin's live storage (at most the in-flight key the message names) instead of its render-time snapshot; *the page
  commits on the other origin between two calls that both succeed* (`page.sessionStorage` wrapped, as the finding's
  probe does) for `set`, `clear(keys)`, `clear()`, `get(keys)` and an on-origin `seed`, each with its message and the
  other origin's live storage (empty, or its own entries kept). Against the old helper the five calls resolve silently
  (checked on chromium, then restored).
- **Beyond the plan's file list:** `src/helpers/storageTurns.test.ts`, *a call whose turn comes after the page left the
  helper's origin*, pinned the old behavior: the page leaves in the same tick as the first `set`'s write, and that
  call resolved; under the decided contract it now fails with the navigation message, and the test expects that (the
  second call still fails with the origin message, and only `a=1` was written).
- No new fixture routes (the deterministic tests use `/teststorage` and `/testpath` on both origins).
- Docs: *Session storage*, *The methods* (the check; detected, not prevented; `get` fails rather than return) and the
  *Errors* table; `api/class-sessionstorage.md`, `clear()`, `get()`, `seed()` and `set()` **Throws** and summaries;
  `api/errors.md`, *Session storage*; the doc comments of `set`, `get`, `clear` and `seed`; AGENTS.md §5's session
  storage bullet. `.changeset/batch-navigation-message.md` rewritten for the final behavior and message.
- Checks: `pnpm lint` 0; `pnpm test:unit` 876 passed; `pnpm pack-test --reporter=line` exit 0 (1,587 passed, 3
  skipped: the deterministic tests pass on chromium, firefox and webkit; doc snippets 221; api coverage 0 problems; step
  locations 29); `pnpm docs:build` 0.
