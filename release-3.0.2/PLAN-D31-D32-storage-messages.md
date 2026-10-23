# PLAN-D31-D32 — two session storage messages

Findings T14 and T15 of [PLAN-T](PLAN-T-candidates-triage.md). Two commits.

## Intended contract

- **D31.** When the page leaves the origin while `set` (or `clear` of several keys) is working, the call fails with the
  helper's label, says the page left, and names the keys already written or removed. The docs say a batch is written
  one key at a time, as Playwright's `setItem` is called once per key, so a navigation can stop it partway. The
  encoding guarantee ("a bad value writes nothing") stays as it is: every value is encoded before any is written.
- **D32** (decided A+, [DECISIONS.md](DECISIONS.md) 29). A decode error gives the codec's reason and the value's
  length in the message, and the whole stored value last, quoted with `JSON.stringify` so an empty or whitespace value
  is visible: `Shop.SessionStorage.get: value for "user" could not be decoded (SyntaxError: Unexpected token 'n', "{not json" is not valid JSON); stored value, 9 characters: "{not json"`
  (the exact text copied from the build).

## Verified current behaviour

**D31.** `write()` calls `setItem` once per key ([../src/helpers/sessionStorage.ts#L294-L298](../src/helpers/sessionStorage.ts#L294-L298));
`access()` passes anything but a no-origin refusal through as it is ([#L253-L265](../src/helpers/sessionStorage.ts#L253-L265)).
A 60-key `set` while the app leaves for B, 5 repeats per browser per build (PLAN-T): Chromium and Firefox rejected with
`webStorage.setItem: Execution context was destroyed, most likely because of a navigation`, without the label, after
0–2 keys had landed on A; WebKit wrote all 60 and resolved; nothing reached B. The same on `v3.0.1`.
[session-storage.md#L114](../website/src/content/docs/docs/session-storage.md#L114) says "a bad value writes nothing",
which is about encoding and true.

**D32.** `decodeValue` throws `${title}: value for "<key>" could not be decoded: ${raw}` with the codec's error as
`cause` ([#L177](../src/helpers/sessionStorage.ts#L177)); the reason is only in `cause`, and an empty or whitespace
value is invisible at the end of the line. Node 24's `JSON.parse` error quotes at most about the first 10 characters of
a long input. The message is shown at
[session-storage.md#L186](../website/src/content/docs/docs/session-storage.md#L186),
[api/class-sessionstorage.md#L141](../website/src/content/docs/api/class-sessionstorage.md#L141),
[api/errors.md#L298](../website/src/content/docs/api/errors.md#L298), the doc comment
([#L343](../src/helpers/sessionStorage.ts#L343)), and asserted in
[../src/helpers/sessionStorage.test.ts#L132](../src/helpers/sessionStorage.test.ts#L132) and
[../test/tests/testApp/sessionStorage.spec.ts#L162](../test/tests/testApp/sessionStorage.spec.ts#L162).

## Options

- **D31.** (a) Label and explain (recommended): `write()` and `clear()`'s loop count what they did; a failure while the
  main frame is no longer on the origin becomes
  `Shop.SessionStorage.set: the page left http://localhost:9000 while set() was writing; 2 of 60 keys were written (k0, k1)`,
  any other failure gets the label in front of Playwright's message (shared with PLAN-D21-D23-D27's D27); both with
  `cause`. (b) Write the batch in one `page.evaluate`. It would stop mirroring Playwright's `setItem` and still not be
  atomic across a navigation. Rejected.
- **D32.** One option, the decided A+.

## Implementation steps

1. D32: `decodeValue`'s message; every place listed above.
2. D31: `write()`, the multi-key `clear()`, and `access()`'s fallthrough; the doc comments of `set` and `clear`.

## Tests

- Unit: the decode message (empty value, whitespace, a long value, a codec whose error has no message); `write()`
  reporting the written keys when a fake page fails after two.
- Harness: the existing decode assertion with the new text; a 60-key `set` while the app leaves (the T14 scenario) fails
  with the label and "the page left" on Chromium and Firefox, and resolves on WebKit (a `browserName` branch, as
  `sessionStorage.spec.ts` does for WebKit elsewhere).

## Docs

*Session storage* (batches: one key at a time, what a navigation does; the decode message), the API page and *Error
messages* (both messages), the doc comments of `set`, `get`, `clear` and `Codec.parse`. Every message copied from a probe
of the build.

## Changesets

Two, `patch`: D31 (a navigation during a batch fails with the label and the keys written), D32 (a decode error gives
the reason, the length and the quoted value).

## Decisions

- [x] D31 option (a) (2026-10-23).
- [x] D32 as decided (2026-10-23).
