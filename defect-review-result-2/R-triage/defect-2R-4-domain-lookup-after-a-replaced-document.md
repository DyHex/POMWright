# 2R-4: a call whose document was replaced still asks `document.domain`, and throws the answer away

- **Kind**: debt (a refactor: no message changes)
- **Status**: planned 2026-10-30 in [PLAN-2R-4-domain-lookup.md](../PLAN-2R-4-domain-lookup.md), agreed 2026-10-30
- **Area**: `access` and `guarded` in `src/helpers/sessionStorage.ts`
- **Severity**: Low (one round trip on a call that already failed, and one more of POMWright's own evaluations in the
  user's trace; no message is wrong)
- **Semver of the fix**: none
- **Found**: 2026-10-30, building [PLAN-2R-2-2R-3-destination-and-load.md](../PLAN-2R-2-2R-3-destination-and-load.md)
  (its *Execution notes*, the debt noticed)
- **Reviewed**: the branch at `2bd0e46`, Opus 5.5

## Observed

- `access` ([sessionStorage.ts:367-399](../../src/helpers/sessionStorage.ts#L367-L399)) explains a refused call: on any
  failure it asks the page for `document.domain` (line 375) and throws one of three messages.
- Its one caller, `guarded` ([sessionStorage.ts:424](../../src/helpers/sessionStorage.ts#L424)), throws the
  navigation message whenever the error underneath is "Execution context was destroyed" (line 433). It keeps only
  Playwright's error as the `cause`, so `access`'s message, and the answer it was built from, are discarded.
- The traces of 20 runs of the harness's `set` test show POMWright's evaluations inside the user's step. These used the
  packed build, real pages, Chromium, 1 worker and `--trace=on`, which slows the run:

  | Runs | Playwright calls inside `TestStorage.SessionStorage.set:` |
  | --- | --- |
  | 15 | Evaluate, Set WebStorage item ✗, Evaluate, Evaluate |
  | 4 | Evaluate, Set WebStorage item, Evaluate ✗, Evaluate, Evaluate |
  | 1 | Evaluate ✗, Evaluate, Evaluate |

  The last two are `document.domain` and `location.href`. Playwright records a call's failure even when the caller
  catches it, as the failed `setItem` shows. So when the `document.domain` question reaches the document being replaced,
  which before 2R-2's fix happened in about 4 of 10 runs at rest, the trace also shows a failed Evaluate that has
  nothing to do with the user's code. That case was not caught in these 20 traced runs.
- *Internal → Seed registry* already says that "a call that fails for another reason" is explained by this
  evaluation; the code asks after a replaced document too.

## Cause

Ordering: the explanation (`277adc6`) runs inside `access`, before `guarded` decides that the failure is a navigation
(decisions 86 and 114).

## Fix

In the plan: `access` passes a replaced document on with its label, without asking. The other navigation case, a
different error while the URL's origin moved, keeps the question.
