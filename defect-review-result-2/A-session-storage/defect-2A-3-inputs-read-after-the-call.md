# 2A-3: `set`, `seed`, `get` and `clear` read their entries, values and key lists after the call returns, so a change the caller makes before the call settles changes what the call does

- **Kind**: defect
- **Area**: turns and overlapping calls: when a call reads its input
- **Severity**: Low (only a caller who changes an object or array it passed, while the call is pending, sees it; the guide promises that such overlapping calls end exactly as awaited ones)
- **Semver of the fix**: patch (behaviour brought in line with the guide's promise; no signature changes)
- **Pass**: 1
- **First review**: missed by the first review: present since v3.0.1 (the step body has always read the input); the first inventory lists "mutation after the call" for options objects (scopes B, C), not for storage entries
- **Reviewed**: `d850405`, 2026-10-28, Opus 5.5, second review, segment 2A

## Contract

- `src/helpers/AGENTS.md`, *Session storage*: "Every `SessionStorage` call (`set`, `get`, `clear`, `seed`) takes its turn on a per-page, per-origin chain (`storageTurns.ts`) that it joins synchronously when its step starts, so overlapping calls (a `Promise.all`, a missing `await`) end exactly as awaited ones".
- `website/src/content/docs/internal/seed-registry.md`, *Overlapping calls*: "calls that overlap, in a `Promise.all` or without `await`, end exactly as if each had been awaited in turn".
- With an `await`, the call has finished before the caller's next statement, so a later change to the object cannot reach it. Playwright's own calls take their arguments at the call: probe `p05-pw-arg-snapshot.spec.ts` (same folder, chromium, exit 0) changes `page.evaluate`'s argument object right after the call and prints `P1b page.evaluate saw: as passed`.

## Reproduction

Probe `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/p01-batch1.spec.ts`, test "P1", as a harness spec:

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/A
cp $P/p01-batch1.spec.ts test/tests/zz-probe-A-p01-batch1.spec.ts
pnpm -C test exec playwright test tests/zz-probe-A-p01-batch1.spec.ts --project=chromium --reporter=line -g P1
rm test/tests/zz-probe-A-p01-batch1.spec.ts
```

Exit code 0. The probe, with the `testStorage` page object of the harness on its origin:

```ts
const entries: Record<string, string> = { k: "as passed" };
const call = testStorage.sessionStorage.set(entries);
entries.k = "mutated after the call";
await call;
// the same with seed(seedEntries) on the origin, and with get(keys) followed by keys.push("s")
```

## Observed / expected

```text
P1 set stored: mutated after the call
P1 on-origin seed stored: mutated after the call
P1 get(keys) returned: {"k":"mutated after the call","s":"mutated after the call"}
```

Expected, as with `await storage.set(entries); entries.k = "…"`: `as passed` stored by `set` and by `seed`, and `get(["k"])` returning `{ k: … }` only.

## Cause

Each method reads its input inside its step's body (`src/helpers/sessionStorage.ts:503-507` for `set`: `encodeEntries(this.schema, entries, …)`; `:539-542` for `get`; `:599-616` for `clear`, which reads `keyOrKeys` only when its turn starts; `:670-694` for `seed`, which also reads `options.origin` there). Playwright's `test.step` always awaits `testInfo._onUserStepBegin?.(title)` before it runs the body (`playwright/lib/common/index.js`, `_step`), so the body runs after the caller's next synchronous statements at the earliest; with the step overlay (`video: { show: { test } }`) after a round trip to the browser; for `clear(keys)`, after every earlier call for the origin. A value that a codec encodes (an object for a `json` key) is read at the same time, so changing the object changes what is stored.

## Fix plan

- **Intended contract**: a call takes its input as it is at the call, as Playwright's calls do; only then do overlapping calls end exactly as awaited ones.
- **Options**:
  1. *(recommended)* At the call, before the step, copy what the call reads: `Object.entries(keyOrEntries)` for `set` and `seed` (pairs, so a `__proto__` key stays a key), `[...keys]` for `get` and `clear`, and `options?.origin` for `seed`. The values are encoded in the step as now, so an encoding error is still reported inside the step. A value object for a codec key is still read in the step; copying it would need the codec, so the docs say that the value is encoded when the step starts.
  2. Encode at the call: also takes the values as they are, but an encoding error would then be thrown outside the step, where the report does not show it (it has always been a step failure).
  3. Document that the input is read when the step starts: keeps the code, narrows the promise.
- **Steps**: `src/helpers/sessionStorage.ts`, `set`, `get`, `clear`, `seed`: take the copy next to `callerLocation`/`captureCallSite`; `encodeEntries` takes the pairs.
- **Tests**: harness (`sessionStorage.spec.ts`, *set, get and clear* and *seed*): a call not awaited, the input changed, then the call awaited; the stored value is the one passed. Chromium is enough (the order is Playwright's runner, not the browser's). Unit: `encodeEntries` from pairs keeps `__proto__`.
- **Docs**: `src/helpers/AGENTS.md` and `internal/seed-registry.md`, *Overlapping calls*: "a call takes its keys and entries at the call". For option 1, the API page's `set()` says when a codec value is encoded.
- **Changeset**: patch, "set, get, clear and seed take their keys and entries at the call, so changing them afterwards does not change the call".
- **Decisions**: whether a value object for a codec key is copied (option 2) or documented (option 1).
- **Relative to other findings**: independent.
