# 2A-2: On an `about:blank` page, any failed storage call says "the page has no origin yet", also when the document inherited the origin or the page is closed

- **Kind**: defect
- **Area**: `set`, `get`, `clear` and an on-origin `seed`: the failure of a storage call (`SessionStorage.access`)
- **Severity**: Low (a misleading message in a rare case: the call fails for another reason on a popup that inherited the origin, or the popup was closed; the message names the wrong cause and a fix that does not apply)
- **Semver of the fix**: patch (a message brought in line with the documented behaviour of an inherited origin)
- **Pass**: 1
- **First review**: missed by the first review: the branch is present since v3.0.1; A-5 (decision 26) reworded the opaque branch beside it, and scope A's `closed.spec.ts` closed a page with a URL origin, not a popup at `about:blank`; the inherited-origin cases it contradicts came with d4cffbb (before 54cdada) and 52f2d4c (after)
- **Reviewed**: `d850405`, 2026-10-28, Opus 5.5, second review, segment 2A

## Contract

- `website/src/content/docs/docs/session-storage.md`, *Through a page object*: a helper's origin check "holds on a page at `about:blank` too, whose document may have inherited an origin, as a popup from `window.open()` does"; and *Seeding session storage*, *How it works*: "A popup at `about:blank` whose document inherited the origin from its opener counts as on it, as it does for `set`".
- The message `Shop.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()` is documented for "a page without an origin, before the first navigation" (`docs/session-storage.md`, *Through a page object* and *Errors*; `api/errors.md`, *Session storage*).
- `api/class-sessionstorage.md`, `set()`: "Any other error from Playwright gets the label in front of its message and is the `cause`."

## Reproduction

Probes `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/p01-batch1.spec.ts` (test "P3") and `p03-batch2.spec.ts` (test "P3b"), run as harness specs from `test/tests/`:

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/A
cp $P/p03-batch2.spec.ts test/tests/zz-probe-A-p03-batch2.spec.ts
pnpm -C test exec playwright test tests/zz-probe-A-p03-batch2.spec.ts --project=chromium --reporter=line -g P3b
rm test/tests/zz-probe-A-p03-batch2.spec.ts
```

(the same for `p01-batch1.spec.ts` with `-g P3`). Exit code 0 (the probes print). The core of "P3":

```ts
await page.goto("http://localhost:9000/teststorage");
const [popup] = await Promise.all([page.waitForEvent("popup"), page.evaluate(() => void window.open())]);
const storage = new SessionStorage(popup, { label: "Popup", origin: "http://localhost:9000" });
await storage.set("big", "x".repeat(6 * 1024 * 1024)); // over the quota
```

and of "P3b": the same popup, `await storage.set("before", "close")` (which works), `await popup.close()`, then `set`, `get`.

## Observed / expected

```text
P3 popup set: rejected: Popup.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()
P3 page set: rejected: Page.SessionStorage.set: webStorage.setItem: QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of 'big' exceeded the quota.
P3b closed popup set: rejected: Popup.SessionStorage.set: the page has no origin yet (about:blank); navigate to the origin first or use seed()
P3b closed popup get: rejected: Popup.SessionStorage.get: the page has no origin yet (about:blank); navigate to the origin first or use seed()
P3b closed page on origin set: rejected: Other.SessionStorage.set: webStorage.setItem: Target page, context or browser has been closed
```

Expected: on the popup, the same as on a page at the origin: Playwright's error with the label (the quota, or "Target page, context or browser has been closed"). The popup has an origin (the helper bound to it wrote there a moment earlier), so "no origin yet" and "navigate to the origin first or use seed()" are both wrong. An on-origin `seed` on such a popup (52f2d4c) takes the same branch, with "navigate to the origin first".

## Cause

`src/helpers/sessionStorage.ts:317-330`, `access`: when a call fails and `page.url()` has no origin, it reports "no origin yet" without asking whether the document has one. The opaque-origin branch just below does ask the document (`self.origin === "null"`).

## Fix plan

- **Intended contract**: "no origin yet" only when the document has no origin; otherwise Playwright's error, labeled, as on a page with a URL origin.
- **Options**:
  1. *(recommended)* In `access`, when the URL has no origin, ask the document as the opaque branch does (`page.evaluate(() => self.origin)`, `"null"` on failure): report "no origin yet" only for `"null"` and the page open; otherwise fall through to the labeled error. Cost: one evaluation on a failure path. Breaks nothing documented.
  2. Check `page.isClosed()` first and label the error: covers the closed popup only.
- **Steps**: `SessionStorage.access` in `src/helpers/sessionStorage.ts`.
- **Tests**: unit (`src/helpers/sessionStorage.test.ts`, *a refused storage call*): a fake page at `about:blank` whose document reports an origin and whose call rejects; the message is the labeled one. Harness (`sessionStorage.spec.ts`, *a popup on about:blank*): a refused write (quota) and a call after `popup.close()`, chromium; the branch does not depend on the browser.
- **Docs**: none; the documented messages stay. `api/errors.md` could say that "no origin yet" means the document has none.
- **Changeset**: patch, "a failed storage call on a popup that inherited the origin reports the browser's error, not that the page has no origin".
- **Decisions**: none.
- **Relative to other findings**: independent.
- **Sketch proposed** (segments.md, *A source sketch*): `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-2.diff` changes `src/helpers/sessionStorage.ts`,
  `access`: one evaluation of the document's own origin (`self.origin`, `undefined` when the page cannot answer, as a
  closed one cannot); "no origin yet" when the URL has no origin and the document's is `"null"`, the opaque message
  when the URL has one and the document's is `"null"`, otherwise Playwright's error, labelled. It needs no `isClosed`
  check: a closed page's evaluation rejects. The diff also changes `src/helpers/sessionStorage.test.ts`: the `accessOn`
  fake answers with an origin instead of a boolean, and one case covers an inherited popup and a page that cannot
  answer. `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-2.run.sh` runs `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-2.spec.ts` on chromium: a refused write on an inherited popup reports
  `QuotaExceededError`, a call on a closed popup reports it closed, neither says "no origin yet"; control: a page that
  never navigated still says it has no origin. It exits 0 when the contract holds and non-zero at `d850405` (the
  reproduction above). Not run in the worktree (segment 2B held it when the sketch was written): the orchestrator applies it, runs `pnpm harness:install`, `run.sh`, the unit tests and the area's specs, and restores the worktree. Checked without the worktree: `git -C /home/magdys/workspace/dyhex/POMWright-second-review apply --check` exit 0; on a copy of the sources (`git archive d850405`) and `node_modules` in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/scratch/`, `biome check` exit 0 and `vitest run src/helpers` 303 passed (the new case counted for
  its run and its type check) with no type errors. It conflicts textually with 2A-10's sketch (the same lines of
  `access`): apply one at a time, or fold 2A-10's expression into this evaluation.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`): the run script at `d850405`, then `git apply` of the diff and `pnpm harness:install`, the run script again, `pnpm test:unit`, and the area's specs on chromium; then `git checkout -- .`, and at the end the baseline package rebuilt (`dist/index.js` matches the baseline byte for byte) and the worktree clean. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-2.gate.out`.

- At `d850405`: `2A-2.run.sh` exit 1 (2 failed: "the page has no origin yet" on the inherited popup's refused write and on the closed popup). With the sketch: exit 0 (3 passed, the never-navigated control included). Unit tests 906 passed (the sketch's new case among them); the session storage specs on chromium 88 passed.
- **Verdict: approved; a narrow fix suffices.** For the fix plan: 2A-2 and 2A-10 change the same lines of `access`; the gate ran each alone, and the fix folds them into one evaluation.
