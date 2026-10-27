# A-1: A helper bound to an origin writes into, or removes from, another origin's storage when the page navigates during a call, and the call resolves

- **Kind**: defect
- **Area**: Session storage: the `origin` option ("a helper with an origin touches only that origin"); batches ("a
  navigation during a batch fails with the label and the keys done", `e8831b8`); `set`, `clear`, an on-origin `seed`
- **Severity**: Medium (a plausible edge case that the docs address by name, a navigation during a batch; when the
  commit falls between two of the batch's calls, the rest of the batch lands in, or removes from, the other origin's
  storage and the call resolves as if it had succeeded: silent, on every browser)
- **Semver of the fix**: patch (brings `set`, `clear` and an on-origin `seed` in line with the origin contract and the
  documented batch failure; AGENTS.md §7)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer A (Claude Opus 5.5)
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #9](../DECISIONS.md))

## Contract

- AGENTS.md §5: "a helper with an origin touches only that origin".
- `website/src/content/docs/docs/session-storage.md`, *Through a page object*: "A helper that belongs to an origin
  refuses to touch another one".
- Same page, *The methods*: "It then writes one key at a time, as Playwright's `setItem` takes one, so a navigation
  during the batch stops it: the keys written before stay, and the call fails, naming them." The same on
  `api/class-sessionstorage.md` (`set()`, `clear()`), in `api/errors.md` (*Session storage*: "a navigation can stop a
  batch; the keys named were done") and in the doc comments of `set` and `clear`
  (`src/helpers/sessionStorage.ts:405-422`, `:506-514`).
- `.changeset/batch-navigation-message.md`: "When the page navigates during the batch, the call now fails with the
  helper's label, says so, and names the keys already done".

## Reproduction

**Deterministic.** `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/A1-deterministic.spec.ts` forces
the timing that the natural race below hits now and then: a main-frame commit to the other origin between two of the
batch's storage calls. It wraps the page's `page.sessionStorage` object (one per page in playwright-core's client) so
that, after the helper's third call returns, the page navigates to B and waits for the commit:

```ts
const navigateAfter = (page: Page, method: "setItem" | "removeItem", calls: number) => {
  const storage = page.sessionStorage;
  const original = storage[method].bind(storage);
  let count = 0;
  storage[method] = async (...args: [string, string]) => {
    await (original as (...a: [string, string]) => Promise<void>)(...args);
    if (++count === calls) await page.goto(`${B}/testpath`, { waitUntil: "commit" });
  };
};
// set: B's storage emptied, the page on A, then
const onA = new SessionStorage(page, { label: "OnA", origin: A });
navigateAfter(page, "setItem", 3);
await onA.set({ k0: "a", k1: "a", k2: "a", k3: "a", k4: "a", k5: "a" });
// clear(keys): B holds k0…k5 of its own; removeItem wrapped the same way; onA.clear(["k0", …, "k5"])
// seed on the origin: as set, with onA.seed(…)
```

`A = "http://localhost:9000"`, `B = "http://127.0.0.1:9000"`, both served by the harness server (`/testpath`).

```sh
# from the worktree root, with the harness installed (baseline.md)
cp /home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/A1-deterministic.spec.ts test/tests/zz-probe-A1-deterministic.spec.ts
pnpm -C test exec playwright test tests/zz-probe-A1-deterministic.spec.ts --reporter=line
rm test/tests/zz-probe-A1-deterministic.spec.ts
```

Exit code 1: 9 of 9 tests fail (3 tests × chromium, firefox, webkit). Log:
`/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/out/A1-deterministic.101454.log`.

**Natural race.** Without the wrapper, a navigation scheduled a few milliseconds ahead with `setTimeout` races the batch:

- `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/A1-batch-other-origin.spec.ts` (40 rounds of a
  300-key `set`), run with `--repeat-each=4`: exit 1, log `…/out/A1-batch-other-origin.100204.log`. A single run without
  `--repeat-each` leaked in none of its 40 rounds per browser (`…/out/A1-batch-other-origin.100153.log`): the rate
  depends on load.
- `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/batchleak.spec.ts` (`set` and `clear(keys)`, 8
  rounds each) and `…/specs/clearall.spec.ts` (`clear()` with no argument, 30 rounds), logs `…/out/batchleak.100047.log`
  and `…/out/clearall.100123.log` (both exit 0: they only log).

**Fix sketch.** With a check of `originOf(this.page.url())` against the batch's origin before and after every call in
`eachKey` (`/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/A1-sketch.diff`), rebuilt with
`pnpm harness:install`, the deterministic probe leaves B untouched on every browser (log
`…/out/A1-deterministic.101520.log`); its tests still fail, but only on the count, see below. The source was restored
and the harness reinstalled afterwards; a rerun on chromium leaked again (`…/out/A1-deterministic.101534.log`).

## Observed / expected

Deterministic probe, the same on chromium, firefox and webkit:

```text
set: resolved
B's storage afterwards: {"k5":"a","k4":"a","k3":"a"}
clear: resolved
B's storage afterwards: {"k1":"B's own","k2":"B's own","k0":"B's own"}
seed: resolved
B's storage afterwards: {"k5":"a","k4":"a","k3":"a"}
```

Natural race:

```text
chromium: 1 of 40 rounds leaked
round 24 (navigation after 25 ms): set resolved; 267 keys of A's batch are in B's storage      (A1-batch-other-origin.100204.log)
chromium set   round 4 delay 25ms: resolved | keys on A: 60, keys on B: 140                     (batchleak.100047.log)
webkit clear   round 0 delay 5ms: resolved | B keys left: 122 of 200                            (batchleak.100047.log)
chromium clear(): B wiped in 1 of 30 rounds — round 20: resolved | B's own key: null            (clearall.100123.log)
```

Expected: B's storage untouched, and each call rejected with
`OnA.SessionStorage.set: the page navigated while set() was writing to http://localhost:9000; 3 of 6 keys were written (k0, k1, k2)`
(and the `clear` and `seed` equivalents).

With the fix sketch:

```text
set: OnA.SessionStorage.set: the page navigated while set() was writing to http://localhost:9000; 2 of 6 keys were written (k0, k1)
B's storage afterwards: {}
clear: OnA.SessionStorage.clear: the page navigated while clear() was removing keys from http://localhost:9000; 2 of 6 keys were removed (k0, k1)
B's storage afterwards: {"k5":"B's own","k4":"B's own","k1":"B's own","k2":"B's own","k0":"B's own","k3":"B's own"}
seed: OnA.SessionStorage.seed: the page navigated while seed() was writing to http://localhost:9000; 2 of 6 keys were written (k0, k1)
B's storage afterwards: {}
```

The sketch's check after a call cannot tell whether that call ran before or after the commit, so it names one key fewer
than were done (k2 was written to A). The current message has the opposite slip in the natural race: `webkit set`,
round 5 of `batchleak.100047.log`, "136 of 200 keys were written" while A held 137 keys afterwards (the key in flight
when the page left was written too).

## Cause

`src/helpers/sessionStorage.ts:331-356` (`eachKey`) looks at the page only when a call **throws**: "Execution context
was destroyed", or a page URL whose origin changed, becomes the navigation message. Playwright's `page.sessionStorage`
evaluates each call in whatever document the main frame has when the server handles it (`webStorageSetItem` →
`mainFrame().evaluateExpression(…, { world: "utility" })`, playwright-core 1.64.0 `lib/coreBundle.js:24164`). When the
commit to B is processed between two calls, the next calls succeed in B's document, nothing throws, and the loop runs
to the end. The origin check (`assertOnOrigin`, `:362`) runs once, before the turn, so a single call (`clear()`, `get()`,
a one-key `set`) has the same window of one round trip; that is how `clear()` wiped B in `clearall.100123.log`.
`get` of several keys (`:486-500`) reads in parallel and has the same exposure.

v3.0.1 had the same loop with the same single check (`git show v3.0.1:src/helpers/sessionStorage.ts`, lines 278-281 and
401-402), so this is not a regression of the 3.0.2 work; `e8831b8` added the message for the case that throws.

The harness test for this case, `test/tests/testApp/sessionStorage.spec.ts:78-102`, asserts
`expect(await current(page)).toEqual({})` on B, but `#current` is the snapshot B's page renders as it loads
(`test/server.js:455`), not B's storage afterwards; and with 60 keys and a navigation 5 ms ahead the race rarely falls
between two calls.

## Fix plan

- **Intended contract**: a helper with an origin never reads, writes or removes another origin's entries in a batch; a
  navigation during a batch fails it with the documented message, naming the keys done (the one in flight may have
  been done too). A single call keeps a window of one round trip, which the docs state.
- **Options**:
  1. **Check the page's origin before and after every call of a batch** (`eachKey`, and `read` for several keys), and
     fail with the navigation message when it moved, whether or not the call threw. Shown to close the deterministic
     case on all three browsers (the sketch above). Leaves at most the one call in flight when the page left, which may
     have acted on the new document. No API change. **Recommended**, with the docs saying what holds for the call in
     flight and for a single call.
  2. **Each key in a guarded evaluation**: `page.mainFrame().evaluate(([origin, key, value]) => { if (self.origin !==
     origin) throw …; sessionStorage.setItem(key, value) }, …)`, so the document itself refuses. Closes the race,
     including single calls, but leaves `page.sessionStorage`, which the helper mirrors (*Internal → The seed
     registry*, "Rejected", gives that reason), and runs in the page's main world, where an app's own `Storage.prototype`
     patch is visible.
- **Implementation steps**: `src/helpers/sessionStorage.ts`: in `eachKey`, compare `originOf(this.page.url())` with
  `start` before each call and after it; word the count so that the key in flight is not claimed either way ("2 or 3 of
  6 keys", or "at least 2"); the same check around `read`'s parallel reads and around `clear()`.
- **Tests**: a harness spec on all three browsers built like the deterministic probe (wrapping `page.sessionStorage`),
  for `set`, `clear(keys)` and an on-origin `seed`, reading B's live storage; change the existing spec's assertion to
  read B's live storage instead of `#current`; a unit test with a fake page whose URL changes between two calls that
  resolve.
- **Docs**: `docs/session-storage.md` (*The methods*), `api/class-sessionstorage.md` (`set()`, `clear()`), `api/errors.md`
  (*Session storage*), the `@throws` of `set`, `clear` and `seed`.
- **Changeset**: patch. "A `SessionStorage` with an origin no longer writes into, or removes from, another origin's
  storage when the page navigates to it between two keys of a batch: the call fails with the navigation message
  instead of resolving."
- **Decisions to tick**:
  - [x] Option 1 (check around each call) or option 2 (guarded evaluation): **option 1**, the origin checked before and
    after every storage call of every helper (with or without `origin`) and every method: batches (`set`,
    `clear(keys)`, an on-origin `seed`), single calls (a one-key `set`, `get`, `clear()`) and the parallel reads of
    `get(keys)`. Option 2 rejected: it leaves `page.sessionStorage` and runs in the page's main world. The check costs
    no round trip: `page.url()` reads a field Playwright's client updates from the "navigated" event (playwright-core
    1.64.0 `coreBundle.js:61819-61820`); each key still costs one round trip, as today, and `seed` away from the
    origin (the init script) is untouched.
  - [x] How the message counts the key that was in flight: it names the keys done and the key in flight, which may
    have reached the new document (for example "…; 2 of 6 keys were written (k0, k1); k2 was in flight and may have been
    written to http://127.0.0.1:9000"); the final wording in the plan, after R-4.
  - [x] Whether a single call's window is documented or closed too: detected and failed, not prevented; the docs say
    that a call in flight when the page leaves may act on the new document and then fails, saying so.
  - [x] (added) Tests as in the plan above (closing test gap #2), with `clear()` and `get(keys)` added to the harness
    spec.
  - [x] (added) The pending `.changeset/batch-navigation-message.md` is amended (its claim and quoted message) instead
    of adding a new changeset.
- **Execution order**: independent; before any other change to the batch messages (A-5 rewords a neighbouring message
  in the same function's caller, `access`).
