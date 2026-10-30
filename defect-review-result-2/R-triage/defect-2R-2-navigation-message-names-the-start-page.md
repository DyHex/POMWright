# 2R-2: a navigation message can name the page the call started on instead of where the page went

- **Kind**: defect
- **Status**: decided 2026-10-30, decision 118 in [DECISIONS.md](../DECISIONS.md) (the destination from the new
  document's `location.href`); planned in [PLAN-2R-2-2R-3-destination-and-load.md](../PLAN-2R-2-2R-3-destination-and-load.md);
  done 2026-10-30 in `fc6ce43` and `f816c2e`
- **Area**: `guarded` in `src/helpers/sessionStorage.ts`
- **Severity**: Low (the call fails as it should, with the right keys; the destination it names is wrong, which sends
  the tester looking for a reload that never happened and at the wrong origin's storage)
- **Semver of the fix**: patch, unreleased (the destination is new in 3.0.2, `e37a039`)
- **Found**: 2026-10-29, CI run 40905139313 (pull request #60, the chromium harness at the Playwright pin), in both
  attempts, each flaky; reproduced locally
- **Reviewed**: the branch at `9a437a3`, Opus 5.5

## Contract

Decision 86, point 2: the navigation messages name where the page went, by its origin and path; "the destination is
the page's URL when the message is made". The pages promise where the page went
([session-storage.md](../../website/src/content/docs/docs/session-storage.md#L131),
[errors.md](../../website/src/content/docs/api/errors.md#L365)).

## Observed

- CI, attempt 1 (15:49 UTC): `get(keys) fails instead of returning what it read`
  ([sessionStorage.spec.ts:247](../../test/tests/testApp/sessionStorage.spec.ts#L247)) received `…the page navigated to
  http://localhost:9000/teststorage while get() was reading "k0" from http://localhost:9000…`; the page had gone to
  `http://127.0.0.1:9000/testpath`. Attempt 2 (16:44 UTC): `set fails with the label and the keys already written when
  the page navigates during it` ([sessionStorage.spec.ts:157](../../test/tests/testApp/sessionStorage.spec.ts#L157))
  received `…navigated to http://localhost:9000/teststorage…; 0 of 60 keys were written; "k0" was being written…`; the
  page had gone to `http://127.0.0.1:9000/teststorage`. Both passed on the retry, and `failOnFlakyTests` failed the job.
- Playwright's channel log of the failing `set` (`DEBUG=pw:channel`, Chromium, one worker), in order: the write of
  `k0` is sent; the navigation's request starts; the write fails with "Execution context was destroyed"; `access`'s
  `document.domain` lookup is sent and fails the same way; the call's message is made; only then do the frame's
  `loadstate` events and `navigated` with `http://127.0.0.1:9000/teststorage` arrive. In a passing repeat the lookup
  waited for the new document, and its reply came after `navigated`.
- The test's real pages, the packed build, Chromium, `--retries=0`:

  | Where | Shape | `set` (line 157) | `get(keys)` (line 247) |
  | --- | --- | --- | --- |
  | `9a437a3` | 1 worker, at rest | 125 of 300 failed | 0 of 300 |
  | `9a437a3` | 4 CPUs (`taskset -c 0-3`), 2 workers | 104 of 300 | 14 of 300 |
  | `9a437a3` | 48 workers on 32 CPUs | not run | 136 of 1,500 |
  | `c7d998c` (before decision 114) | 1 worker, at rest | 0 of 300 | not run |

  Every failure named the page the call started on. Firefox and WebKit: 0 of about 750 and 0 of about 300 (`get`, 48
  workers), which does not show that they cannot.

## Cause

`guarded` ([sessionStorage.ts:425-432](../../src/helpers/sessionStorage.ts#L425-L432)) reads `page.url()` as soon as
a storage call or the document check fails with "Execution context was destroyed". Chromium reports the old document's
destruction before Playwright reports the new document's commit, and `page.url()` changes only with that report
(`navigated`), so for that moment it still names the page the call started on.

Why it shows now (inferred from the timings, not traced): decision 114's handle, one round trip before the first
write, moves the `set` test's first write into the moment the app's own navigation tears the document down; in the
`get(keys)` test each parallel read ends with a check (decision 114), and under load one is still in flight when the
wrapper's navigation commits.

## Fix

In the plan: once the document is gone, the message names the `location.href` of the page's new document, asked after
the failure and asked again while a navigation destroys the question, bounded; otherwise it names `page.url()`.
