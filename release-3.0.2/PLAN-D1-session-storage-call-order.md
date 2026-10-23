# PLAN-D1 — overlapping session storage calls on the origin

## Intended contract

`seed`'s doc comment ([../src/helpers/sessionStorage.ts#L408-L412](../src/helpers/sessionStorage.ts#L408-L412)) and its
API entry ([../website/src/content/docs/api/class-sessionstorage.md#L150](../website/src/content/docs/api/class-sessionstorage.md#L150)):
"Calls for one origin merge in the order they were made, later values winning per key, also when they overlap." This
holds for every `seed`, whether the page is on the origin already or not.

## Verified current behaviour

- On the origin, `seed` skips the registry and calls `write`
  ([../src/helpers/sessionStorage.ts#L449-L452](../src/helpers/sessionStorage.ts#L449-L452)). `write` awaits one
  `page.sessionStorage.setItem` per key ([../src/helpers/sessionStorage.ts#L281-L285](../src/helpers/sessionStorage.ts#L281-L285)),
  so two overlapping calls take turns key by key.
- Away from the origin, calls take turns on the registry's per-origin chain
  ([../src/helpers/sessionStorageSeed.ts#L175-L201](../src/helpers/sessionStorageSeed.ts#L175-L201)), the 3.0.1 fix.
- `set` writes through the same `write`. Its docs promise nothing about overlapping calls.
- Playwright's `WebStorage` has `setItem`, `getItem`, `removeItem` and `clear`, and no bulk write
  (`playwright-core@1.64.0/types/types.d.ts`).

Probe, 2026-10-22, chromium, Playwright 1.64.0, the packed 3.0.1 build (temporary spec, deleted):

| Case | `shared` after the calls |
| --- | --- |
| on the origin: `Promise.all([seed({ first: "1", shared: "earlier" }), seed({ shared: "later" })])` | `earlier` |
| on the origin: the same, one key per call | `later` |
| deferred, then `goto`: the multi-key calls | `later` |
| on the origin: the multi-key calls with `set` | `earlier` |

The writes were `first`, then `shared=later`, then `shared=earlier`.

## Options

- **A. `seed`'s on-origin branch takes its turn on the per-origin chain.** The registry exposes the chain (a `turn(origin,
  task)`), and `seed` decides inside its turn whether the page is on the origin, because the page may navigate while
  the call waits. `add` runs its registration through the same `turn`. `set`, `get` and `clear` stay as they are, and
  their docs say that overlapping calls are not ordered.
- **B. A, plus `set`, `get` and `clear` take turns on the same chain** for the origin they touch. One rule then holds
  for every call of the helper: calls for one origin act in the order they were made, also when they overlap. This is
  what `Promise.all([page.sessionStorage.setItem(…), page.sessionStorage.getItem(…)])` already gives in Playwright,
  where each call is one message.
- **C. One browser call per `seed`** (`page.evaluate` writing every entry): rejected. It leaves `page.sessionStorage`,
  which the helper mirrors (`AGENTS.md` section 5), and it still depends on message order rather than a stated rule.
- **D. Narrow the contract** to deferred seeds: rejected. It takes back the guarantee 3.0.1 just made.

**Decided: B** (2026-10-22). It is one rule instead of a rule with an exception, and the cost is the same chain the
registry already keeps.

### Where the chain lives: a per-page turns helper (decided 2026-10-22)

The chain moves out of `SeedRegistry` into a small internal module, one instance per Playwright `Page` (a `WeakMap`
keyed by the page, as `registryFor` does today). It is not part of `PageObject`, not exported from `index.ts`, and has
no public member: consumers never see it or call it. `SessionStorage` uses it inside `set`, `get`, `clear` and `seed`,
and `SeedRegistry` uses it for its registration.

Because it is keyed by the `Page`, not by the page object, every helper on one page shares it:

```ts
// two page objects on the same page, and a standalone helper: all three take turns for one origin
const loginPage = new LoginPage(page);
const accountPage = new AccountPage(page);
const storage = new SessionStorage(page, { origin: "https://shop.example" });

await Promise.all([
  loginPage.sessionStorage.seed({ token: "a", theme: "dark" }),
  accountPage.sessionStorage.seed({ token: "b" }),
  storage.set({ token: "c" }),
]);
// in call order: token ends as "c", theme as "dark", whichever helper made each call
```

The alternative, keeping the chain on `SeedRegistry` and calling `registryFor(page).turn(…)` from `get`, would create a
"seed registry" for pages that never seed, and tie plain reads and writes to the seed machinery.

## Implementation steps (B)

1. A per-page, per-origin chain with `turn(origin, task)`: the task runs after the previous one for that origin
   settles, whether it succeeded or failed, and the call joins the chain synchronously. Move the existing queue
   ([../src/helpers/sessionStorageSeed.ts#L153](../src/helpers/sessionStorageSeed.ts#L153)) there.
2. `SeedRegistry.add` registers inside a turn, as today. Its `framenavigated` watch still starts at the call.
3. `seed`: the encode and the origin checks run at the call, as today, so a bad value throws before anything waits.
   Then one turn decides on-origin (write) or deferred (register). The deferred registration must not take a second
   turn on the same chain (a deadlock): `add` gets an internal form that runs inside the caller's turn.
4. `set`, `get` and `clear`: their body runs in a turn for the origin the page is on at the call. The origin check
   (`assertOnOrigin`) runs again inside the turn, because the page may have left while the call waited.
5. Doc comments of `set`, `get`, `clear` and `seed`: one sentence on ordering.

## Tests

- Unit (`src/helpers/sessionStorage.test.ts`, `src/helpers/sessionStorageSeed.test.ts`, fake page): overlapping
  multi-key `seed` on the origin; overlapping `set`; `set` then `get` in one `Promise.all`; a failing call does not block
  the next; a call that waits while the page leaves the origin fails with the origin message.
- Harness (`test/tests/testApp/sessionStorage.spec.ts`): the on-origin `Promise.all` case for `seed` and `set`, read
  back in the page, on all three browsers.

## Docs

- `website/src/content/docs/api/class-sessionstorage.md`: `seed`, `set`, `get`, `clear`.
- `website/src/content/docs/docs/session-storage.md` and `seeding-session-storage.md` (the "several seeds" section).
- `website/src/content/docs/internal/seed-registry.md` "Overlapping calls": the chain now covers every call of the
  helper. Its rejected alternatives gain C.

## Changeset

`patch`: "Overlapping `seed` calls for an origin the page is already on now merge in call order, as they do before a
navigation. `set`, `get` and `clear` calls for one origin also act in the order they were made when they overlap."

## Decisions

- [x] Option B (2026-10-22). Its one cost, accepted: a slow call holds up later calls for the same origin, as a
  pending seed registration already does, each bounded by the test timeout.
- [x] The chain lives in an internal per-page turns helper (2026-10-22)
