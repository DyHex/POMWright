# Plan: no `document.domain` question after a replaced document (2R-4)

- **Decision**: [120](DECISIONS.md), agreed 2026-10-30. The maintainer chose this form over the larger one below
- **Finding**: [2R-4](R-triage/defect-2R-4-domain-lookup-after-a-replaced-document.md) (debt, Low)
- **Bump**: none and no changeset. Every message stays the same; a call that already failed makes one evaluation
  fewer
- **Stop**: after the commits, a report. The maintainer pushes
- **Depends on**: [PLAN-2R-2-2R-3-destination-and-load.md](PLAN-2R-2-2R-3-destination-and-load.md) (done). It comes
  before PLAN-2B-locators, which waits for the maintainer's word

## Contract

Unchanged. A call that fails because its document was replaced still fails with the navigation message, the same
keys, and Playwright's error as the `cause`. A refused call is still explained as before.

What changes:
- `access` no longer asks `document.domain` when the error is a replaced document (`replacedByNavigation`). It throws
  the same labeled error it throws today when the answer explains nothing, and `guarded` replaces it with the
  navigation message, as now.
- After a replaced document, `currentUrl`'s `location.href` question is POMWright's first evaluation, not its second.

## Current behavior (verified 2026-10-30 at `2bd0e46`)

- [sessionStorage.ts:367-399](../src/helpers/sessionStorage.ts#L367-L399), `access`, asks `document.domain` after
  any failure (line 375).
- Its one caller is `guarded` ([line 424](../src/helpers/sessionStorage.ts#L424)), which checks the error first and
  throws the navigation message when it is a replaced document
  ([line 433](../src/helpers/sessionStorage.ts#L433)), keeping only Playwright's error.
- The trace of the harness's `set` test shows the question as one of POMWright's two Evaluates after the failure (the
  finding's table). The finding also covers the failed Evaluate it can add.
- [*Internal → Seed registry*](../website/src/content/docs/internal/seed-registry.md) says the evaluation explains "a
  call that fails for another reason".

## Options

- **A, recommended and chosen: `access` skips the question for a replaced document.**
  - It is one condition in `access`, and the division becomes explicit: `access` explains a refused call, `guarded`
    reports a navigation.
  - The question is still asked in every case where its answer can be used.
  - One consequence: the first `location.href` question may now reach the document being replaced, and is asked again.
    That spends one of the 20 replacements `currentUrl` waits through on Playwright's lag rather than on a real
    replacement, leaving 19.
- **B, larger and not chosen: `guarded` decides the navigation before anything is explained.** It would also drop the
  question when a different error comes back while the URL's origin moved (`moved()`).
  - That case is not a replaced document, so there is no new document to ask. `guarded` infers the navigation from
    `page.url()`, which it reads after the question's round trip.
  - Whether that round trip is what lets `page.url()` catch up, the lag 2R-2 found, has not been probed. B could turn a
    navigation message into a refusal message in a race, so it is left as it is.

## Implementation (one commit)

1. **The change, with its test and records.**
   - In `access`, a replaced document is labeled and thrown before the question, with a comment saying `guarded`
     reports it. The doc comment says what `access` explains.
   - Unit test in `sessionStorage.test.ts`, with a fake page that counts each question. It checks that `document.domain`
     is not asked when the document was replaced:
     - during the storage call;
     - at the handle check after it;
     - while the handle is taken.

     It is still asked once for a refused call, and once for a different error while the URL's origin moved (the case
     option B would change). The fake stands in for the real failures, which the harness's navigation tests make, and
     its comment says so.
   - *Internal → Seed registry*: a replaced document is not asked; option B is rejected, with its reason.
   - The records: decision 120 in DECISIONS.md, 2R-4's status, and the ledger.
2. **The execution notes**, and the statuses set to done.

## Tests

- **Unit:** the new test fails on today's code (the replaced cases ask once) and passes with the change. The existing
  tests pass unchanged.
- **Harness:** the storage specs on three browsers (`sessionStorage.spec.ts`, `sessionStorageOverlay.spec.ts`,
  `documentHandle.spec.ts`).
- **The two tests that met 2R-2,** where `currentUrl` now absorbs Playwright's lag alone, with `--retries=0`; all must
  pass:

  | Test | Shape | Runs |
  | --- | --- | --- |
  | `set` | at rest, 1 worker, Chromium | 300 |
  | `set` and `get(keys)` | `taskset -c 0-3`, 2 workers, three browsers | 100 each |
  | `set` and `get(keys)` | `taskset -c 0-1`, 4 workers, Chromium | 200 each |
- **The trace again:** the same 20 traced runs of `set`, to show the Evaluates after the failure.

## Docs

*Internal → Seed registry* (step 1). No Docs or API page describes the question.

## Verification

- `pnpm lint`, `pnpm test:unit`, `pnpm docs:build` and `pnpm lint:guide`.
- The full `pnpm test:constrained --reporter=line`, which `test/AGENTS.md` asks for after a change to session storage,
  and the full `pnpm pack-test --reporter=line`.
- The grep for the external consumer projects' names.

## Decisions checklist

1. [x] `access` throws a replaced document with its label, without asking `document.domain` (option A).
2. [x] The case of a different error while the URL's origin moved keeps the question (not option B).
3. [x] A unit test counts the questions.
4. [x] *Internal → Seed registry* says so, and why B is not done.
5. [x] No changeset.

## Execution

Step 1, then step 2, each verified and committed with the trailer. Then a report; anything unexpected is reported with
a recommendation.

## Execution notes

None yet.
