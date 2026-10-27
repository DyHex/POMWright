# A-3: `seed` on an `about:blank` popup that inherited the seeded origin registers instead of writing at once: a later `set` is overwritten on arrival (Chromium, WebKit), or the test fails with a message about a failed navigation that never happened (Firefox)

- **Kind**: defect
- **Area**: Session storage: `seed` at the call ("on the origin already, it writes at once"), the inherited origin of an
  `about:blank` page (`d4cffbb`), turns ("calls for one origin act in the order they were made"), `seed` failures
- **Severity**: Low (needs a popup from `window.open()` seeded before its first navigation; then a wrong result on two
  engines, silently, and a misleading failure on the third)
- **Semver of the fix**: patch (behaviour brought in line with "on the origin already, it writes at once" under the
  meaning `d4cffbb` gave "on the origin"; AGENTS.md §7). The docs-only alternative is semver none.
- **Reviewed**: `54cdada`, 2026-10-23, reviewer A (Claude Opus 5.5)
- **Status**: decided: fix, option 1 (2026-10-26, [DECISIONS.md #14](../DECISIONS.md)); reverses `d4cffbb`'s decision
  for `seed`

## Contract

- `website/src/content/docs/docs/seeding-session-storage.md`, *How it works*: "When the page is already on the origin,
  `seed` writes at once". `api/class-sessionstorage.md`, `seed()`: "on the origin already, it writes at once".
- `docs/session-storage.md`, *Through a page object*, and `.changeset/inherited-about-blank-origin.md`: a page at
  `about:blank` "whose document may have inherited an origin, as a popup from `window.open()` does" is on that origin for
  `set`, `get` and `clear` (`d4cffbb`).
- `docs/session-storage.md`, *The methods*: "Calls for one origin act in the order they were made".
- `docs/seeding-session-storage.md`, *What `seed` cannot do*, which `api/class-sessionstorage.md` presents as the list
  of "every such case".
- The behaviour on Firefox is recorded as decided only in commit `d4cffbb`'s message ("seed is not taught about
  inherited origins: on Firefox, whose next document counts as a return, a seed made on such a popup fails the test
  through the not-applied failure") and in a `test.fail` at `test/tests/testApp/sessionStorage.spec.ts:55-65`; no page,
  doc comment or AGENTS.md line says it, and the Chromium and WebKit consequence below is recorded nowhere.

## Reproduction

1. `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/popuporder.spec.ts`: on a popup from
   `window.open()` (at `about:blank`, inheriting A = `http://localhost:9000`), with
   `const onA = new SessionStorage(popup, { label: "Popup", origin: A })`:

   ```ts
   await onA.seed({ token: "seed" });
   await onA.set({ token: "set" });   // later, awaited
   await popup.goto(`${A}/teststorage`);
   ```

   and a control doing the same on a page that is on A.
2. `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/popupseed.spec.ts`: `seed({ token: "seeded" })` on
   such a popup, then its navigation to A; a control with `set` instead.

```sh
# from the worktree root
cp /home/magdys/workspace/dyhex/POMWright-final-review-probes/A/specs/popuporder.spec.ts test/tests/zz-probe-popuporder.spec.ts
pnpm -C test exec playwright test tests/zz-probe-popuporder.spec.ts --reporter=line
rm test/tests/zz-probe-popuporder.spec.ts
# and the same for popupseed.spec.ts
```

Both exit 1 (the Firefox test). Logs: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/A/out/popuporder.102140.log`
and `…/out/popupseed.100435.log`.

## Observed / expected

`popuporder.102140.log`:

```text
chromium {"beforeNavigation":"set","startupAfterNavigation":"{\"token\":\"seed\"}"}
webkit {"beforeNavigation":"set","startupAfterNavigation":"{\"token\":\"seed\"}"}
firefox {"beforeNavigation":"set","startupAfterNavigation":"{\"token\":\"set\"}"}
    Error: Popup.SessionStorage.seed: the seed for http://localhost:9000 (keys: token) was not applied: the browser counted the page's arrival on http://localhost:9000 as a return there (navigation.activation.from is set), as after a failed navigation to it
chromium control startup {"token":"set"}     (firefox and webkit the same)
```

`popupseed.100435.log`: the seed alone applies on Chromium and WebKit, and on Firefox fails the test with the same
message; `set` on the popup reaches the app on all three.

So the popup's document is on A for `set` (the control and `beforeNavigation` show `set` wrote there), but not for
`seed`, which registers an init script. On Chromium and WebKit the script then writes on arrival over the value of the
later `set`: the app starts with `seed`, where the same two calls on a page on A give `set`. On Firefox the popup's first
document counts as a return, so the script skips it and the test fails with "as after a failed navigation to it", though
nothing failed. No page lists the case.

Expected: `seed` on a page whose document is on the origin writes at once, as the docs say, so the later `set` wins on
every browser and nothing fails; or, if that is not wanted, the case documented with its cause and its workaround (`set`
on the popup), and a message that does not presume a failed navigation.

## Cause

`src/helpers/sessionStorage.ts:588-589` and `src/helpers/sessionStorageSeed.ts:236-238`: `snapshot().origin` is
`originOf(this.page.mainFrame().url())`, which is `undefined` for `about:blank`, so `wasOnOrigin` (`:253`) is false and
`register` runs. `assertInheritedOrigin` (`sessionStorage.ts:378-384`), which asks the document for its origin, is used
only by `set`, `get` and `clear`. `notAppliedError` (`sessionStorageSeed.ts:149-160`) words the `return` skip for the
failed-navigation case only.

## Fix plan

- **Intended contract**: `seed` treats a page whose document has the origin as on the origin, as `set` does, and
  writes at once there.
- **Options**:
  1. **Teach `seed` the inherited origin**: in `SeedRegistry.add`, when `snapshot.origin` is `undefined`, ask the
     document (`self.origin`, as `assertInheritedOrigin` does) inside the turn, and write at once when it is the seeded
     origin. The read at the call (`snapshot`, `5ceb13c`) cannot have that answer synchronously; asking in the turn is
     enough here, since a popup at `about:blank` has no navigation to race unless the test starts one, and the commit
     watch still runs from the call. **Recommended.** Patch.
  2. **Docs and message only**: a row in *What `seed` cannot do* ("`seed` on a popup at `about:blank` before its first
     navigation: it applies at the arrival, over anything `set` wrote there meanwhile; on Firefox the popup's first
     document counts as a return and the test fails; use `set` on the popup"), and a `return` message that does not
     presume a failed navigation ("… as a return there (navigation.activation.from is set): after a failed navigation
     to it, or on a popup that inherited it"). Docs: none; message: patch.
- **Implementation steps**: option 1: `SeedRegistry.add` in `src/helpers/sessionStorageSeed.ts` (the choice between
  writing and registering), with the document's origin read through `SeedPage.evaluate`; `seed`'s doc comment.
- **Tests**: turn the `test.fail` at `test/tests/testApp/sessionStorage.spec.ts:59` into a pass on all three browsers;
  add the seed-then-set case (the probe) asserting `set`; a unit test with a fake page at `about:blank` whose document
  reports the seeded origin.
- **Docs**: `docs/seeding-session-storage.md` (*How it works*), `internal/seed-registry.md` (*One registry per page*,
  *Overlapping calls*), `api/class-sessionstorage.md` (`seed()`); `api/errors.md` (*seed*) if the message changes.
- **Changeset**: patch. "`seed` on a popup at `about:blank` that inherited the seeded origin writes at once, as `set`
  does there: a later `set` is no longer overwritten when the popup navigates to the origin, and Firefox no longer fails
  the test."
- **Decisions to tick**:
  - [x] Option 1 or option 2: **option 1**, `seed` reads the inherited origin in its turn (as `set` does) and writes at
    once when it is the seeded origin; `d4cffbb`'s "seed is not taught about inherited origins" is reversed (it was
    decided without the Chromium and WebKit overwrite).
  - [x] (added) The "return" message stops presuming a failed navigation: it names the general cause (the arriving
    document's previous one was already on the origin), a failed navigation as one example; wording in the plan, after
    R-4.
  - [x] (added) Tests: the `test.fail` at `test/tests/testApp/sessionStorage.spec.ts:55-65` becomes a pass on all three
    browsers; the seed-then-set probe asserting `set`; a unit test with a fake `about:blank` page whose document reports
    the seeded origin.
  - [x] (added) Docs: *Seeding session storage* (*How it works*), *Internal → The seed registry*, the API page's
    `seed()`, `errors.md` (*seed*) for the message, AGENTS.md §5's sentence on when `seed` writes at once.
  - [x] (added) A new patch changeset, as above.
- **Execution order**: after A-2 (both read the inherited origin; A-2 decides which chain such a page's calls take).
