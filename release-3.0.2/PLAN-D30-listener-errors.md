# PLAN-D30 — the seed registry's errors stop the page's later listeners

Finding T13 of [PLAN-T](PLAN-T-candidates-triage.md). One commit.

## Intended contract

A refused write and a never-applied seed still fail the test at once, with the `seed` call site in the stack, and every
other listener for that page event still runs.

## Verified current behaviour

The registry throws `writeFailedError` from its `console` listener and `neverAppliedError` from its `close` listener
([../src/helpers/sessionStorageSeed.ts#L331](../src/helpers/sessionStorageSeed.ts#L331),
[#L340](../src/helpers/sessionStorageSeed.ts#L340)). After a never-applied seed, a `page.on("close")` listener added
after the `seed` did not run, every browser; a `context.on("close")` listener did (PLAN-T). Playwright's client emitter
calls the listeners in turn without a `try`, so a throw ends the loop.

A planning probe, every browser: a listener that rethrows in a microtask (`queueMicrotask(() => { throw error })`) lets a
later listener of the same event run, and the test still fails at once with that error. In the `console` case the test
body stopped before its next line; in the `close` case at teardown the test failed with it.

## Options

- **A. Rethrow from a microtask (recommended).** The same `Error` object, so its stack (the `seed` call site, from
  `atCallSite`) is kept.
- B. Report through Playwright's test info. There is no public API to add an error to a running test.
- C. Make POMWright's listeners run last. Not possible: a listener added after `seed` runs after them.

## Implementation steps

1. `onConsole` and `onClose`: `queueMicrotask(() => { throw error; })` instead of `throw error`; the comments say why.

## Tests

- Harness (every browser): after a never-applied seed, a later `page.on("close")` listener runs and the test fails with
  the never-applied error whose stack starts at the `seed` line; the same for a later `page.on("console")` listener and a
  refused write (the quota fixture the existing specs use).
- The existing call-site specs (`pageObject/callSite/`) stay green.

## Docs

*Internal → The seed registry*: the failures are rethrown from a microtask, and why.

## Changeset

`patch`: a refused write or a never-applied seed no longer stops the page's other `console` or `close` listeners.

## Decisions

- [x] Option A (2026-10-23).
