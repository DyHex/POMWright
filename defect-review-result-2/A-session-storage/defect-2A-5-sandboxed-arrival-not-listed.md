# 2A-5: *What `seed` cannot do*, which the API page says "lists every such case", leaves out an arrival on a sandboxed document

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 102 in [DECISIONS.md](../DECISIONS.md); planned in the session storage plan (docs)
- **Area**: `seed`: a pending seed whose arriving document has an opaque origin
- **Severity**: Low (the failure's own message names a sandboxed document, so the cause can be found; the page that claims to list every case does not have it)
- **Semver of the fix**: none (docs only)
- **Pass**: 1
- **First review**: missed by the first review: the table and the message are older than 54cdada; A-6 (merged into B-7) completed the error lists, not *What `seed` cannot do*
- **Reviewed**: `d850405`, 2026-10-28, Opus 5.5, second review, segment 2A

## Contract

- `website/src/content/docs/api/class-sessionstorage.md`, `seed()`: "later, failing the test with this call's line in the stack, when the browser refuses the write, when the document that arrives on the origin does not take the seed (a failed navigation there), or when the page closes before the seed was applied", then "[What `seed` cannot do](…) lists every such case."
- `website/src/content/docs/docs/seeding-session-storage.md`, *What `seed` cannot do*: rows for a page that closes, a new tab, a seed after the commit, a seed not awaited, a failed navigation, a browser without the Navigation API, a refused write. No row for a document served with `Content-Security-Policy: sandbox` (without `allow-same-origin`) as the arrival.
- The message the code gives for it does name it: `the document that arrived on … has an opaque origin (the browser's error page after a failed navigation, or a sandboxed document)` (the same pages, *Errors*).
- The `@throws` of `seed` (`src/helpers/sessionStorage.ts:644-645`) also gives only "after a navigation there that failed".

## Reproduction

Probe `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/p04-sandboxed-arrival.spec.ts` (meant to fail, to print the failure): from `http://127.0.0.1:9000/testpath`, `testStorage.sessionStorage.seed({ token: "x" })`, then `page.goto("http://localhost:9000/teststorage/sandboxed")` (the harness's sandboxed document).

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/A
cp $P/p04-sandboxed-arrival.spec.ts test/tests/zz-probe-A-p04-sandboxed-arrival.spec.ts
pnpm -C test exec playwright test tests/zz-probe-A-p04-sandboxed-arrival.spec.ts --project=chromium --reporter=line
rm test/tests/zz-probe-A-p04-sandboxed-arrival.spec.ts
```

Exit code 1 on chromium, firefox and webkit, each with:

```text
Error: TestStorage.SessionStorage.seed: the seed for http://localhost:9000 (keys: token) was not applied: the document that arrived on http://localhost:9000 has an opaque origin (the browser's error page after a failed navigation, or a sandboxed document)
```

The behaviour is right (the seed fails the test, never silently); only the list of cases leaves it out. No harness spec seeds before a sandboxed arrival (`sessionStorage.spec.ts` covers `set`, `get` and an on-origin `seed` on a sandboxed document): a test gap.

## Observed / expected

Observed: the table has no row for it; the API page's "(a failed navigation there)" and the `@throws` name only the failed navigation. Expected: a row such as "the document that arrives on the origin is sandboxed (`Content-Security-Policy: sandbox` without `allow-same-origin`) | it has no session storage, so it cannot receive the seed, and the test fails at its arrival", and the `seed()` text "(a failed navigation there, or a sandboxed document)".

## Cause

The sandboxed case was added to the message (17426a5, 186bc5f) and to the opaque-origin rows of `set`, but not to the seed's table.

## Fix plan

- **Intended contract**: unchanged; the table lists every case in which a seed fails later.
- **Steps**: `docs/seeding-session-storage.md`, *What `seed` cannot do*: add the row; `api/class-sessionstorage.md`, `seed()` *Throws*: "(a failed navigation there, or a sandboxed document)"; the same in the `@throws` of `seed` in `src/helpers/sessionStorage.ts`.
- **Tests**: a harness spec on all three browsers: a seed, then a `goto` to `/teststorage/sandboxed`, under `test.fail`, with the message checked as `callSite.spec.ts` checks others.
- **Changeset**: none (docs and a doc comment).
- **Decisions**: none.
