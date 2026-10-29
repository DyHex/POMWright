# 2A-4: Batch and seed failure messages print keys unquoted, so an empty key or a key with ", " in it reads as no key or as two

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 85 in [DECISIONS.md](../DECISIONS.md) (every key quoted with JSON.stringify; a new changeset for the released seed messages); planned with the other session storage items
- **Area**: messages: the navigation message of a batch (`set`, `clear(keys)`, an on-origin `seed`) and the seed messages that list keys
- **Severity**: Low (a misleading message for a legal but uncommon key; `get`'s message for the same situation quotes the key)
- **Semver of the fix**: patch (message text; the documented examples change from `(k0, k1)` to `("k0", "k1")`)
- **Pass**: 1
- **First review**: missed by the first review: the batch message's key list is present since v3.0.1, its in-flight key since 56229e2 (A-1's fix, after 54cdada); scope A checked the messages' texts with ordinary keys
- **Reviewed**: `d850405`, 2026-10-28, Opus 5.5, second review, segment 2A

## Contract

- `api/errors.md`, opening: "Every message names what it is about". `docs/session-storage.md`, *The methods*: a navigation stops a batch and "the call fails, naming the keys done, which stay, and the one in flight".
- The same helper quotes a key in `get`'s message (`the page navigated while get() was reading "token" from …`) and in the encoding messages (`value for "user" is not a string …`), so a reader can see an empty key or one with spaces or commas there.
- Session storage accepts any string as a key, the empty string included.

## Reproduction

Probe `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/p01-batch1.spec.ts`, test "P2": on the first origin, `page.sessionStorage.setItem` is wrapped so that after its second call the page commits on the second origin (the technique of `sessionStorage.spec.ts`, *the page commits on the other origin between two calls that both succeed*), then `testStorage.sessionStorage.set({ "": "empty key", "a, b": "comma", c: "third" })`.

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/A
cp $P/p01-batch1.spec.ts test/tests/zz-probe-A-p01-batch1.spec.ts
pnpm -C test exec playwright test tests/zz-probe-A-p01-batch1.spec.ts --project=chromium --reporter=line -g P2
rm test/tests/zz-probe-A-p01-batch1.spec.ts
```

Exit code 0.

## Observed / expected

```text
P2 set: rejected: TestStorage.SessionStorage.set: the page navigated while set() was writing to http://localhost:9000; 1 of 3 keys were written (); a, b was being written and may have reached the new document
```

"1 of 3 keys were written ()" names no key, and "a, b was being written" reads as two keys. Expected, as `get` does: `1 of 3 keys were written (""); "a, b" was being written …`. The seed messages that join keys the same way (`describeKeys`: "(keys: …)" in the never-applied, not-applied, refused-write and page-closed messages) print `(keys: )` for an empty key.

## Cause

`src/helpers/sessionStorage.ts:407-413` (`eachKey`: `finished.join(", ")` and `${key}`) and `src/helpers/sessionStorageSeed.ts:117` (`describeKeys = (keys) => keys.join(", ")`) print the keys as they are; `read` (`:553`) uses `JSON.stringify(key)`.

## Fix plan

- **Intended contract**: every message that names a key shows it quoted, as `get` and the encoding messages do.
- **Options**:
  1. *(recommended)* `JSON.stringify` each key in `eachKey` and in `describeKeys`. Cost: every documented example of these messages changes (`(k0, k1)` → `("k0", "k1")`, `(keys: orderId)` → `(keys: "orderId")`); `scripts/check-error-messages.mjs` and the specs that assert them follow.
  2. Quote only a key that is empty or holds `", "` or a leading or trailing space: the common messages stay, but the rule is harder to state.
- **Steps**: `eachKey` in `src/helpers/sessionStorage.ts`; `describeKeys` in `src/helpers/sessionStorageSeed.ts`.
- **Tests**: unit (`sessionStorage.test.ts`, *a batch the page leaves*; `sessionStorageSeed.test.ts`, *error builders*): an empty key and one with ", ". The harness specs that assert these messages change with them.
- **Docs**: every page that shows these messages: `docs/session-storage.md` (*The methods*, *Errors*), `docs/seeding-session-storage.md` (*Errors*), `api/class-sessionstorage.md` (`clear()`, `seed()`, `set()` *Throws*), `api/errors.md` (*Session storage*, *seed*), the `@throws` of `set`, `clear` and `seed`.
- **Changeset**: patch, "storage messages quote the keys they name".
- **Decisions**: option 1 or 2.
- **Relative to other findings**: none.
