# 2D-1: When the URL is right but the load state does not come in time, expectThisPage() says it expected that URL and found it

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 89 in [DECISIONS.md](../DECISIONS.md) (the load-state message on the right URL; a changeset); planned in the page objects and URLs plan; done 2026-10-30 in `aa70821`
- **Area**: Navigation: `expectThisPage()` and `expectAnotherPage()`, their failure messages (`waitForUrl` in `src/helpers/navigation.ts`)
- **Severity**: Low (a misleading message, no wrong behavior: the call fails when it should, but its message says the URL was wrong when the page is on the right URL and only the load state was late; it happens in ordinary use, whenever a page's `load` event is slower than the timeout with the default `waitUntil: "load"`)
- **Semver of the fix**: patch (a message brought in line with what happened; no type or behavior a consumer relies on changes)
- **Pass**: 1
- **First review**: missed by the first review (present at `54cdada`, `navigation.ts:185`, and since v3.0.0, `4bdc347`; D probed the wait messages for a wrong URL only)
- **Reviewed**: `d850405`, 2026-10-28T16:06:33+01:00, Opus 5.5, second review, segment 2D

## Contract

- `website/src/content/docs/docs/urls-and-navigation.md`, *Options and timeouts*: "A wait that times out names the page
  object, what it expected and the URL found, with Playwright's error as `cause`", followed by
  `OrdersPage: expected URL "https://shop.example/orders"; found "https://shop.example/orders?tab=1" (page.waitForURL: Timeout 15000ms exceeded.)`.
  The same lines are on `api/class-navigation.md` (*expectThisPage()*, *expectAnotherPage()*) and `api/errors.md`
  (*Navigation*: "Thrown by `expectThisPage()` and `expectAnotherPage()` when the browser is not where they wait for
  it within the timeout").
- The same page, *Navigating*: "When the URL is already right, `page.waitForURL` returns at once, after the requested
  load state", and `waitUntil` defaults to `"load"` (*Options and timeouts*). So a call on the right URL can still time
  out, on the load state.
- No page says what the message is in that case. The message the code builds, "expected URL X; found X", contradicts
  itself: the skill's "a message that contradicts itself" and "a message that names the actual cause".

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p03-load-state-message/zz-probe-d03.spec.ts` (a
page object on `/testnav/item/7`; the page is fulfilled by `page.route` with an `<img>` whose request never answers,
so the document commits and `load` never fires). From the worktree root:

```sh
cp /home/magdys/workspace/dyhex/POMWright-second-review-probes/D/p03-load-state-message/zz-probe-d03.spec.ts test/tests/
pnpm -C test exec playwright test tests/zz-probe-d03.spec.ts --project=chromium --reporter=line
rm test/tests/zz-probe-d03.spec.ts
```

Exit 0 (the probe logs, it does not assert). Output kept in `output-chromium.txt` beside the probe. The message is
POMWright's composition around Playwright's first error line, so one browser shows it.

## Observed / expected

Observed (copied):

```text
P03-A "ItemPage: expected URL \"http://localhost:9000/testnav/item/7\"; found \"http://localhost:9000/testnav/item/7\" (page.waitForURL: Timeout 1000ms exceeded.)"
P03-A cause "page.waitForURL: Timeout 1000ms exceeded.\n=========================== logs ===========================\n  \"domcontentloaded\" event fired\n============================================================"
P03-B "ItemPage: expected to have left \"http://localhost:9000/testnav/item/7\"; found \"http://localhost:9000/testnav/item/8\" (page.waitForURL: Timeout 1000ms exceeded.)"
P03-C "ItemPage: expected URL \"http://localhost:9000/testnav/item/7\"; found \"http://localhost:9000/testnav/item/7\" (state: expected one of (load|domcontentloaded|networkidle|commit))"
```

- P03-A: `expectThisPage()` on the right URL, `load` late: "expected URL X; found X". The cause's call log does not
  say what was awaited either (only that `domcontentloaded` fired). A reader is told the URL was wrong.
- P03-B: `expectAnotherPage()` after the browser left for another page whose `load` is late: "expected to have left
  X; found Y", where Y is another page, so the browser did leave.
- P03-C (from JavaScript only, a `waitUntil` TypeScript rejects): the option error is framed as a URL mismatch too.

Expected: when the URL found is what the call waited for (this page for `expectThisPage()`, another page for
`expectAnotherPage()`), the message says that the URL was reached and the load state was not, naming the state, for
example `ItemPage: on "http://localhost:9000/testnav/item/7", but its "load" state did not come (page.waitForURL: Timeout 1000ms exceeded.)`.
The URL-mismatch message stays for a URL that was not reached.

## Cause

`src/helpers/navigation.ts:195-205`, `Navigation.waitForUrl`: every error of `page.waitForURL` is rethrown as
`${label}: ${what}; found ${page.url()} (${first line})`, where `what` is fixed by the caller ("expected URL …",
"expected to have left …") whatever failed. `page.waitForURL` returns `waitForLoadState` when the URL already matches
(Playwright 1.64, `coreBundle.js`, `waitForURL`), so its timeout can be a load-state timeout on the right URL. The doc
comment above it ("Its timeout error names only the load state") says as much, and the message does not.

## Fix plan

- **Intended contract**: a navigation wait's message says which of its two conditions failed: the URL (as now), or the
  load state on a URL that was right.
- **Options**:
  1. *(recommended)* In `waitForUrl`'s `catch`, when Playwright's error is a `TimeoutError` and the URL found passes the
     same predicate, throw a message that says the URL was reached and the load state was not, with the same `cause`:
     `ItemPage: on "…/testnav/item/7", but its "load" state did not come in time (page.waitForURL: Timeout 1000ms exceeded.)`
     for `expectThisPage()`, and `ItemPage: left "…/item/7" for "…/item/8", but its "load" state did not come in time (…)`
     for `expectAnotherPage()`. One branch, no new option; the predicate is the matcher already built. Other errors (a
     closed page, an invalid `waitUntil` from JavaScript) keep today's message. Breaks nothing a consumer can rely on
     (a message text).
  2. Keep the message and document the case on *Options and timeouts* and *Error messages*. Cheaper, but the message
     still contradicts itself.
- **A source sketch is proposed** for option 1:
  `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/sketch/2D-1.diff` (`src/helpers/navigation.ts` only:
  `waitForUrl` takes a `reached` describer, its two callers pass one) and
  `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/sketch/2D-1.run.sh`, which runs
  `sketch/2D-1.spec.ts` (the two load-state cases and the URL-mismatch cases, which must keep today's message) on
  chromium, firefox and webkit. At `d850405` the run exits 1: 6 failed (the two load-state cases on each browser),
  3 passed (the mismatch cases); output `sketch/2D-1.run-at-d850405.txt`, which also shows that Playwright's error is a
  `TimeoutError` on all three. `git apply --check` passes. Not run with the diff applied (the orchestrator's step).
  With the diff, `scripts/check-error-messages.mjs` will require the new message on *Error messages*, so the docs step
  belongs to the same change.
- **Implementation**: `src/helpers/navigation.ts`, `waitForUrl` and its two callers, as the sketch.
- **Tests**: a harness case in `test/tests/testApp/testNav.spec.ts` (the held-image route of
  *navOptions.waitUntil decides what goto waits for* already builds the page) for both methods, as the sketch's spec;
  a unit test in `src/helpers/navigation.test.ts` with a stub page whose `waitForURL` rejects with an error named
  `TimeoutError` while `url()` matches.
- **Docs**: *URLs and navigation* → *Options and timeouts* (the new line and when it appears); *Error messages* →
  *Navigation*; `api/class-navigation.md` → *expectThisPage()* and *expectAnotherPage()* **Throws**; the `@throws` of
  both in `src/helpers/navigation.ts`. `scripts/check-error-messages.mjs` then requires the new message on the page.
- **Changeset**: patch, "A navigation wait that times out on the load state of the right URL says so, instead of
  reporting the URL it found as the one it did not expect."
- **Decisions to tick**: the wording; whether `expectAnotherPage()`'s case gets its own line.
- **Relative to other findings**: none in this segment touch `waitForUrl`.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`): the run script at `d850405`, then `git apply` of the diff and `pnpm harness:install`, the run script again, `pnpm test:unit`, and the area's specs on chromium (`tests/pageObject`, `testNav`, `testPath`, `color`, `urlForms`, `urlHosts`); then `git checkout -- .`, and at the end the baseline package rebuilt (`dist/index.js` matches the baseline byte for byte) and the worktree clean. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/D/sketch/2D-1.gate.out`.

- At `d850405`: `2D-1.run.sh` exit 1 (6 failed, 3 passed: the two late-load-state cases on chromium, firefox and webkit). With the sketch: exit 0 (9 passed). Unit tests 904 passed; the area's specs on chromium 99 passed.
- **Verdict: approved; a narrow fix suffices.** For the fix plan: the sketch adds a message ("…, but its \"load\" state did not come in time"), which *Error messages* must list, or `scripts/check-error-messages.mjs` fails `pnpm typecheck` (not run by the gate).
