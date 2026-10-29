# 2T-3: Two session storage tests marked `test.fail(true)` hold an assertion that cannot fail them, so "a new tab has its own storage" is checked by no test

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 97 in [DECISIONS.md](../DECISIONS.md) (restructured so every claim can fail); planned in the session storage plan, first step
- **Area**: the specs as a whole: false passes; `test/tests/testApp/sessionStorage.spec.ts:749-762` and `:1340-1346`
- **Severity**: Low (the library behaves as documented today; the spec cannot see it stop doing so for the popup)
- **Semver of the fix**: none (test only)
- **Pass**: 1
- **First review**: missed by the first review (both tests are at 54cdada, `sessionStorage.spec.ts:614` and :1180 there;
  neither its findings nor its test gaps name them)
- **Reviewed**: `d850405`, 2026-10-28T18:34+01:00, Opus 5.5, second review, segment 2T

## Contract

- The test's title, `sessionStorage.spec.ts:749`: "a hop that opens a new tab cannot be seeded: the popup has its own
  storage and the seed stays pending"; its assertion `expect(await startup(popup)).toEqual({})` (line 761).
- The documented behavior it stands for, `docs/seeding-session-storage.md:142`: "the hop opens a new tab | a new tab has
  its own session storage and does not run the page's init scripts; the seed waits on and fails the test when the page
  closes".
- The refused-write test, `sessionStorage.spec.ts:1340-1346`, asserts `expect(await startup(page)).toEqual({})` after a
  write the browser refuses, under `test.fail(true, "the refused write must fail this test; ...")`.
- `test/AGENTS.md`, *The harness*: specs check what the package does; the brief's question: "a skip or `test.fail` that
  hides more than it says".

## Reproduction

Two temporary specs, each running the test as written and with its one assertion inverted, both under the same
`test.fail(true, ...)`. Sources: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/popup/zz-probe-T-popup.spec.ts`
and `.../popup/zz-probe-T-refused.spec.ts`. Each was copied to `test/tests/`, run, and removed:

```sh
cp /home/magdys/workspace/dyhex/POMWright-second-review-probes/T/popup/zz-probe-T-popup.spec.ts test/tests/
pnpm -C test exec playwright test tests/zz-probe-T-popup.spec.ts --project=chromium --reporter=json > run.json
rm test/tests/zz-probe-T-popup.spec.ts
```

Exit 0 for both files. The JSON reports (`popup/run.json`, `popup/refused.json`), reduced:

```text
popup, asserting startup {}                | status: failed | expected: failed | errors: ["Error: TestStorageSecond.SessionStorage.seed: the seed for http://127.0.0.1:9000 (keys: token) was never applied: the page closed without navigating there; ..."]
popup, asserting startup {"token":"never"} | status: failed | expected: failed | errors: ["Error: expect(received).toEqual(expected) // deep equality ..."]
stats {"expected":2,"skipped":0,"unexpected":0,"flaky":0}

refused write, inverted: false | status: failed | expected: failed | errors: ["Error: TestStorageSecond.SessionStorage.seed: could not write sessionStorage for http://127.0.0.1:9000 (keys: big): QuotaExceededError: ..."]
refused write, inverted: true  | status: failed | expected: failed | errors: ["Error: TestStorageSecond.SessionStorage.seed: could not write ...", "Error: expect(received).toEqual(expected) // deep equality"]
stats {"expected":2,"skipped":0,"unexpected":0,"flaky":0}
```

`grep -n popup test/tests/testApp/sessionStorage.spec.ts`: the only other popup tests (lines 37-84) are about an
`about:blank` popup that inherits its opener's origin, not a link that opens the seeded origin in a new tab.

## Observed / expected

Observed: under `test.fail(true)`, any failure counts as the expected one. When the inner assertion holds, the test
fails later for the reason in its annotation; when it does not hold, the test fails at the assertion. Both are
"expected", so the assertion never decides the result. The popup test would stay green if a popup opened by the link
were seeded, which is the half of its title ("the popup has its own storage") and of the docs' row ("does not run the
page's init scripts") that nothing else checks. The refused-write test's `startup` assertion is dead in the same way;
its failure message is checked elsewhere (the "page's other listeners" group and `callSite.spec.ts`), but not that the
app started without the entry.

Expected: an assertion inside a test either decides its result or is not there; the promise in the title is checked by
an assertion that can fail.

## Cause

`test.fail(true, …)` turns every failure into the expected one, and the body asserts the secondary claim before the
failure the annotation names. The serial groups elsewhere in the file (lines 820-1020) avoid this by handing the error
to the next test through a file and asserting its message there.

## Fix plan

- **Intended contract**: each claim in the title is checked by an assertion whose failure fails the run.
- **Options**:
  1. (recommended) Split each test: one test without `test.fail` asserts the claim that should hold (the popup's
     `startup` is `{}`, then removes the pending seed's cause, for example by navigating the original page to the
     seeded origin before the test ends, which applies the seed there; the refused write's `startup` is `{}`, read in
     the next test of a serial group as the file already does for the listeners), and the `test.fail` test keeps only
     the failure, with its message checked as the serial groups at lines 963-1020 do.
  2. Keep one test, but record the inner result in an annotation or a file and assert it in a following test. Cost:
     more machinery for the same check.
- **Implementation steps**: `test/tests/testApp/sessionStorage.spec.ts`, the two tests.
- **Tests**: run the split tests on chromium, firefox and webkit (storage is browser behavior); invert each new
  assertion once to see it fail.
- **Docs**: none.
- **Changeset**: none.
- **Decisions to tick**: none.
- **Related**: the never-applied seed at an implicit close (line 740) is likewise asserted only by `test.fail`; its
  message at the fixture's close is checked by no harness test (the serial groups close the page in the body), which
  the test-gaps list in `summary.md` carries.
