# A-2: On an `about:blank` page that inherited an origin, a helper bound to that origin and a helper without one take turns on different chains, so overlapping calls end out of call order

- **Kind**: defect
- **Area**: Session storage: turns (`storageTurns.ts`, "calls for one origin act in the order they were made … across
  every helper on the page"); the inherited origin of an `about:blank` page (`d4cffbb`)
- **Severity**: Low (needs a page at `about:blank` with an inherited origin, such as a popup from `window.open()`, two
  helpers, and overlapping calls; then the earlier value wins, deterministically)
- **Semver of the fix**: patch (brings behaviour in line with the documented ordering; AGENTS.md §7)
- **Reviewed**: `54cdada`, 2026-10-23, reviewer A (Claude Opus 5.5)
- **Status**: decided: fix, option 3 (2026-10-26, [DECISIONS.md #13](../DECISIONS.md))

## Contract

- `website/src/content/docs/docs/session-storage.md`, *The methods*: "Calls for one origin act in the order they were
  made, also when they overlap. In a `Promise.all`, … two `set` calls for one key leave the later value. The order holds
  across helpers: every `SessionStorage` on a page, a page object's or a standalone one, waits for the earlier calls for
  its origin."
- AGENTS.md §5: "Every `SessionStorage` call … takes its turn on a per-page, per-origin chain … so overlapping calls (a
  `Promise.all`, a missing `await`) end exactly as awaited ones, across every helper on the page".
- The same page, *Through a page object*, and `.changeset/inherited-about-blank-origin.md`: an `about:blank` page whose
  document inherited an origin is on that origin for the origin check (`d4cffbb`).

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/popupchains.spec.ts`. Five rounds of: the
page on A, a popup from `window.open()` (at `about:blank`, inheriting A), then

```ts
const unbound = new SessionStorage(popup, { label: "Unbound" });
const onA = new SessionStorage(popup, { label: "OnA", origin: A });
const filler = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`f${i}`, "x"]));
await Promise.all([unbound.set({ ...filler, shared: "earlier" }), onA.set({ shared: "later" })]);
await popup.evaluate(() => sessionStorage.getItem("shared"));
```

and a control with the same two calls on a page that is on A.

```sh
# from the worktree root
cp /home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/popupchains.spec.ts test/tests/zz-probe-popupchains.spec.ts
pnpm -C test exec playwright test tests/zz-probe-popupchains.spec.ts --reporter=line
rm test/tests/zz-probe-popupchains.spec.ts
```

Exit code 0 (the probe logs). Log: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/out/popupchains.100253.log`.

## Observed / expected

On chromium, firefox and webkit alike:

```text
round 0: shared = earlier
… (every round, every browser)
chromium control: shared = later
firefox control: shared = later
webkit control: shared = later
```

Expected `later` on the popup as in the control: both calls touch A's storage, and the second was made later.

## Cause

`src/helpers/sessionStorage.ts:391-397`: `inTurn` keys the chain by `this.origin ?? originOf(this.page.url()) ?? ""`. On
the popup the bound helper joins chain `http://localhost:9000` and the unbound one chain `""`, because the page's URL
(`about:blank`) has no origin, although both reach A's storage through the inherited document (the unbound helper's
`page.sessionStorage` calls succeed there). The two chains run side by side, so the 101-key batch's last write lands
after the other call's.

## Fix plan

- **Intended contract**: every call that touches one origin's storage on a page takes its turn on one chain, also on
  a page whose URL has no origin.
- **Options**:
  1. **Key `set`, `get` and `clear` by the page's URL origin, or `""`, for every helper** (`originOf(this.page.url()) ??
     ""`), not by the helper's own origin. A bound helper on its origin gets the same key as now; on another origin it
     throws in its turn either way; on `about:blank` both helpers share `""`. One line, no API change. But `seed` stays
     keyed by its target origin, so if A-3's option 1 makes `seed` write at once on such a popup, a `seed` and a `set`
     there would again sit on different chains (`A` and `""`).
  2. One chain per page for every call. Simple, but calls for different origins would wait for each other, which
     *Seeding session storage*, *Several seeds*, promises they do not ("For several origins they register at the same
     time").
  3. **A barrier for calls on a page whose URL has no origin**: such a call (from any helper) takes its turn after
     every earlier call on the page, whatever its origin, and every later call on the page waits for it. Calls on a page
     with a URL origin keep their per-origin chains. The inherited origin, which cannot be read synchronously, then
     never decides a chain. **Recommended**: it covers A-3's option 1 too, and the cost (serialising the rare calls made
     on an `about:blank` page) is small.
- **Implementation steps**: `takeTurn` in `src/helpers/storageTurns.ts` (a page-wide key that waits for every chain and
  that every chain waits for); `inTurn` in `src/helpers/sessionStorage.ts` passes it when `originOf(this.page.url())` is
  `undefined`; `SeedRegistry.add` likewise for a seed that may write at once there (A-3).
- **Tests**: a harness spec (the probe, asserting `later`) on the three browsers; unit tests in
  `src/helpers/storageTurns.test.ts` for the barrier (earlier calls on two origins, then a barrier call, then a later
  call on one origin, in that order).
- **Docs**: *Internal → The seed registry*, *Overlapping calls*: one sentence on pages without a URL origin;
  `storageTurns.ts`'s module comment.
- **Changeset**: patch. "Overlapping session storage calls on an `about:blank` page that inherited an origin, from a
  page object's helper and a standalone one, now act in the order they were made."
- **Decisions to tick**:
  - [x] Option 1, 2 or 3: **option 3**, a page-wide barrier for calls on a page whose URL has no origin; tests, docs
    and a new patch changeset as above.
- **Execution order**: before A-3, whose option 1 relies on it.
