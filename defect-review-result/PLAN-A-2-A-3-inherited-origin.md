# Plan 21: a page-wide turn on pages without a URL origin; `seed` writes at once on an inherited origin

- **Decisions**: [DECISIONS.md](DECISIONS.md) #13, #14
- **Findings**: [A-2](A-session-storage/defect-A-2-about-blank-popup-two-chains.md),
  [A-3](A-session-storage/defect-A-3-seed-on-inherited-origin-popup.md) (reverses `d4cffbb`'s "seed is not taught about
  inherited origins"); test gap #8
- **Bump**: patch (two changesets)
- **Stop**: no
- **Depends on**: plan 20 (the before/after check compares like with like on `about:blank`); A-2 before A-3

## Contract

- A `SessionStorage` call (any helper, `seed` included) on a page whose URL has no origin, such as an `about:blank` popup
  that inherited one, takes its turn after every earlier call on that page, whatever their origin, and every later call
  on the page waits for it. Pages with a URL origin keep their per-origin chains, so seeds for several origins still
  register side by side. The inherited origin, which cannot be read synchronously, never decides a chain.
- On such a page, `seed` asks the document for its origin in its turn, as `set` does, and writes at once when it is the
  seeded origin; otherwise it registers as today. The commit watch still runs from the call.
- The "return" failure (`notAppliedError`) names the general cause, the arriving document's previous one being already
  on the origin, with a failed navigation as one example.
- Result: every call for one origin acts in the order it was made in every page state where it can act at once; the one
  deliberate exception is a `seed` made away from the origin, which applies on arrival, before the app's first script.

## Current behaviour

- `src/helpers/sessionStorage.ts:391-397` `inTurn` keys the chain by `this.origin ?? originOf(page.url()) ?? ""`: on an
  `about:blank` popup a bound helper queues on its origin's chain and an unbound one on `""`, so their overlapping calls
  race (deterministic on all three browsers; A-2).
- `src/helpers/sessionStorageSeed.ts:250-266` `add` decides "on the origin" from the URL only, so on such a popup `seed`
  registers: on Chromium and WebKit the earlier `seed` overwrites a later `set` at the arrival; on Firefox the test fails
  with the "return" message about a failed navigation that never happened (A-3; the `test.fail` at
  `test/tests/testApp/sessionStorage.spec.ts:55-65`).
- `sessionStorageSeed.ts:149-160` `notAppliedError`'s "return" text presumes a failed navigation.

## Steps

### Step 1: A-2, the page-wide turn

1. `src/helpers/storageTurns.ts`: `takeTurn(page, key, task)` where `key` is an origin or a page-wide marker (for
   example `takeTurn(page, PAGE_WIDE, task)`): a page-wide call waits for the tail of every per-origin chain and the
   previous page-wide call; a per-origin call made after a page-wide one waits for it. The module comment says so (one
   sentence on pages without a URL origin).
2. `sessionStorage.ts` `inTurn` and the seed registry's `add` pass the page-wide key when `originOf(page.url())` is
   `undefined` at the call (synchronously, so the order of calls holds).
3. **Tests**: unit tests in `src/helpers/storageTurns.test.ts` for the barrier (a page-wide call after two origins'
   calls runs last; a later per-origin call waits for it; per-origin calls without one stay parallel); a harness spec on
   chromium, firefox and webkit: two overlapping `set` calls on an `about:blank` popup that inherited the origin, from a
   bound and an unbound helper, end with the later value.
4. **Docs**: *Internal → The seed registry*, *Overlapping calls*: one sentence on pages without a URL origin; AGENTS.md
   §2 (`storageTurns.ts`: per page and origin, page-wide on a page without a URL origin) and §5 (the per-page,
   per-origin chain, and the page-wide turn).
5. **Changeset** `about-blank-storage-order.md` (`patch`): "Overlapping session storage calls on an `about:blank` page
   that inherited an origin, from a page object's helper and a standalone one, act in the order they were made."

### Step 2: A-3, `seed` on an inherited origin

1. `SessionStorage.seed`: when the page has no URL origin, pass the registry a `writeOnOrigin` that, in the turn, asks the
   document for its origin (as `assertInheritedOrigin` does) and writes at once when it is the seeded origin, returning
   whether it wrote; the registry's `add` registers only when it did not. The snapshot and commit watch unchanged.
2. `notAppliedError`'s "return" text, for example `… was not applied: the browser counted the page's arrival on
   https://pay.example as a return there (navigation.activation.from is set): the document before it was already on the
   origin, as after a failed navigation to it` (final wording from a probe).
3. **Tests**: the `test.fail` at `sessionStorage.spec.ts:55-65` becomes a pass on chromium, firefox and webkit; a spec of
   `seed` then `set` on such a popup, asserting the app starts with `set`'s value; a unit test with a fake `about:blank`
   page whose document reports the seeded origin.
4. **Docs**: *Seeding session storage*, *How it works* ("on the origin" includes a document that inherited it); *Internal
   → The seed registry*; `api/class-sessionstorage.md`, `seed()`; `api/errors.md`, *seed* (the message); AGENTS.md §5,
   the sentence on when `seed` writes at once.
5. **Changeset** `seed-inherited-origin.md` (`patch`): "`seed` on a popup at `about:blank` that inherited the seeded
   origin writes at once, as `set` does there; a later `set` is no longer overwritten when the popup navigates to the
   origin, and Firefox no longer fails the test."

## Verify

The standard checks (PLANS.md, rule 5) after each step; `pnpm docs:build`.

## Commit

```text
fix: storage calls on a page without a URL origin take a page-wide turn

Plan: defect-review-result/PLAN-A-2-A-3-inherited-origin.md (step 1)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

```text
fix: seed writes at once on a popup that inherited the seeded origin

Plan: defect-review-result/PLAN-A-2-A-3-inherited-origin.md (step 2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-27.

**Step 1 (A-2).**

- `storageTurns.ts`: `PAGE_WIDE`, a unique symbol, as `takeTurn`'s key; per page, the chains and the last page-wide
  call. A page-wide call waits for every chain's tail and the previous page-wide call, then becomes the tail of every
  chain there is and the start of any chain begun after it; the cleanup drops each entry still pointing at a settled
  call. The module comment says it in one sentence. `sessionStorage.ts` `inTurn`: the page-wide key when
  `originOf(page.url())` is `undefined` at the call, otherwise `this.origin ?? originOf(url)` as before (`""` is gone).
- **Deviation: `seed` keeps its origin's chain on such a page.** The decision (and the plan's step 2) put the seed
  registry's `add` on the page-wide key too. A unit test (*overlapping calls for one origin do not hold back calls for
  another origin*, on the fake page, which starts at `about:blank`) failed: seeds for two origins then wait for each
  other on any page not yet navigated, which is where a test seeds, against *Seeding session storage* ("For several
  origins they register at the same time"), the promise decision 13 cites for rejecting one chain per page. The barrier
  gives the ordering without it: every `set`, `get` and `clear` on such a page is page-wide, so it waits for every chain,
  a seed's included, and every later seed waits for it; two seeds for one origin share its chain; seeds for different
  origins stay side by side. `add` passes its origin as before, with a comment saying why. Step 2's write at once runs
  in that turn.
- Tests: unit (`storageTurns.test.ts`, *a page-wide turn*): it comes after earlier calls of two origins; it holds back
  later calls on an existing chain and a new one (which then run side by side); per-origin calls without one stay
  parallel. Harness (`sessionStorage.spec.ts`, three browsers): on an `about:blank` popup that inherited A, a 51-key
  `set` from an unbound helper overlapping a `set` from a helper bound to A, both ways round, ends with the later value;
  with the old turns it ends with `earlier` (checked on chromium, then restored).
- Docs: *Internal → The seed registry*, *Overlapping calls* (the page-wide turn; `seed` on its chain, and why);
  AGENTS.md §2 (`storageTurns.ts`) and §5 (the turn on a page without a URL origin). Changeset
  `about-blank-storage-order.md`.
- Checks: `pnpm lint` 0; `pnpm test:unit` 882 passed; `pnpm pack-test --reporter=line` exit 0 (1,590 passed, 3
  skipped; doc snippets 221; api coverage 0 problems; step locations 29); `pnpm docs:build` 0.
