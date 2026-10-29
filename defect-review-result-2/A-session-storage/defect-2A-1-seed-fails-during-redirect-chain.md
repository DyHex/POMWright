# 2A-1: On Chromium, a page's first `seed` fails with Playwright's "Execution context was destroyed" when the page is going through two or more script redirects on another origin

- **Kind**: defect
- **Status**: decided 2026-10-29, decision 81 in [DECISIONS.md](../DECISIONS.md) (the check retries while the document is replaced, up to 20 times; a patch changeset); planned with the other session storage items
- **Area**: `seed` at the call: the Navigation API check (`SeedRegistry.assertNavigationApi`)
- **Severity**: Medium (a plausible edge case: an app that redirects itself twice as it loads, and a test that seeds the next origin meanwhile; the page's first seed fails every time on Chromium, with a message that does not say why)
- **Semver of the fix**: patch (brings the call in line with the failures it documents; the code's own comment already intends to survive a navigation during the check)
- **Pass**: 1
- **First review**: missed by the first review: present since v3.0.1 (the single retry is unchanged since then); scope A probed `seed` raced by a navigation *to* its origin (`race.spec.ts`), not a page navigating elsewhere during the first seed's Navigation API check
- **Reviewed**: `d850405`, 2026-10-28, Opus 5.5, second review, segment 2A

## Contract

- `src/helpers/AGENTS.md`, *Session storage*: "`seed` throws at the call in a browser without the Navigation API (checked once per page) and when the main frame commits on the origin between the call reaching the registry and the end of its registration". A navigation elsewhere is not one of the failures.
- `api/class-sessionstorage.md`, `seed()` *Throws*, and the `@throws` of `seed` in `src/helpers/sessionStorage.ts:633-646`: at the call, without an origin, for a value that cannot be encoded, without the Navigation API, for a commit on the origin during registration, when the page closes, and on the origin already for an opaque document or a navigation during the write. Nothing for a page that is navigating within another origin.
- `website/src/content/docs/docs/seeding-session-storage.md`, *Two patterns*: "When a value is learned on the way, seed the next origin before the hop", with the page on another origin.
- The intent in the code, `src/helpers/sessionStorageSeed.ts:369`: "a navigation replaced the document during the evaluation; the next one runs in its successor".

## Reproduction

Probe: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/p02-chain-lengths.spec.ts` (a harness spec; it needs the test fixtures and the server, so it runs from `test/tests/`). Each round opens a fresh context, routes `http://localhost:9000/zzchain/<n>` to a page whose script does `location.replace("/zzchain/<n+1>")` until `n = hops`, goes there with `waitUntil: "commit"`, and calls `new SessionStorage(page, { label: "P18", origin: "http://127.0.0.1:9000" }).seed({ token: "x" })`; a seed that registers is then applied by a `goto` to the second origin, so the page's close does not fail the test.

```sh
P=/home/magdys/workspace/dyhex/POMWright-second-review-probes/A
cp $P/p02-chain-lengths.spec.ts test/tests/zz-probe-A-p02-chain-lengths.spec.ts
pnpm -C test exec playwright test tests/zz-probe-A-p02-chain-lengths.spec.ts --project=chromium --workers=1 --reporter=line
rm test/tests/zz-probe-A-p02-chain-lengths.spec.ts
```

The same with `--project=firefox` and `--project=webkit`. Exit code 0 for each (the probe prints, it does not assert). Outputs: `p02-chain-lengths.chromium.out`, `.firefox.out`, `.webkit.out` in the probes folder.

## Observed / expected

Chromium:

```text
P18 hops=1: 0 of 15 seeds failed []; seed ms: 16,12,14,11,11,10,10,10,10,10,10,13,9,9,16
P18 hops=2: 15 of 15 seeds failed ["P18.SessionStorage.seed: page.evaluate: Execution context was destroyed, most likely because of a navigation"]; seed ms: 12,10,8,8,14,10,11,10,10,12,9,9,8,7,9
P18 hops=3: 15 of 15 seeds failed ["P18.SessionStorage.seed: page.evaluate: Execution context was destroyed, most likely because of a navigation"]; seed ms: 8,16,8,11,10,9,13,9,10,12,11,9,9,13,14
P18 hops=5: 15 of 15 seeds failed ["P18.SessionStorage.seed: page.evaluate: Execution context was destroyed, most likely because of a navigation"]; seed ms: 9,11,13,10,9,13,9,8,10,10,11,9,7,9,10
```

Firefox and WebKit: `0 of 15 seeds failed` for every chain length.

Expected: the seed registers, as it does with one redirect and on the other two browsers; the page is on another origin throughout, so none of the documented failures applies. The message is Playwright's, with the label in front, and tells the tester neither the cause nor a fix.

## Cause

`src/helpers/sessionStorageSeed.ts:356-376`, `assertNavigationApi`: the check is one `page.evaluate` in the current document, retried once on any error. On Chromium an evaluation in flight when the document is replaced rejects with "Execution context was destroyed"; with two replacements in a row, the retry is destroyed too, and its error escapes. `SeedRegistry.fromPage` (`:302-317`) then labels it as Playwright's error. The check runs once per page, so only a page's first `seed` meets it.

## Fix plan

- **Intended contract**: a navigation that does not reach the seeded origin never fails `seed`; the Navigation API check runs in whatever document the page settles on.
- **Options**:
  1. *(recommended)* Retry the evaluation while it fails because the document was replaced (the message matches `Execution context was destroyed`) and the page is open; any other error goes on as now. It ends when the page stops replacing its document, as the page's own navigation does. Cost: a loop instead of one retry. Could break nothing documented.
  2. Run the check once in a document of POMWright's own (an `about:blank` page of the context): rejected, it opens a page, which `src/helpers/AGENTS.md` (*Do not*: "a document of POMWright's own") rules out for `seed`.
  3. Read the browser from `page.context().browser()?.browserType().name()` and its version: rejected, it would trust a version table rather than the browser.
- **Steps**: `src/helpers/sessionStorageSeed.ts`, `assertNavigationApi`: replace the single retry with a loop on the destroyed-context error (bounded by the page closing, which `fromPage` already reports). Update the comment at `:369`.
- **Tests**: unit, `src/helpers/sessionStorageSeed.test.ts`: a fake page whose `evaluate` rejects twice with the destroyed-context message, then answers; the seed registers. Harness, `test/tests/testApp/sessionStorage.spec.ts`: the probe above as a spec (a fresh page in a chain of three script redirects on the first origin, a seed for the second, then the hop), on all three browsers.
- **Docs**: `website/src/content/docs/internal/seed-registry.md`, *The checks in `seed`*: say that the check waits out the page's own navigations. No message changes.
- **Changeset**: patch, "seed no longer fails when the page replaces its document more than once during the Navigation API check".
- **Decisions**: none needed; it keeps a documented contract.
- **Relative to other findings**: independent.
- **Sketch proposed** (segments.md, *A source sketch*): `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-1.diff` changes `src/helpers/sessionStorageSeed.ts`,
  `assertNavigationApi`: the evaluation is repeated while it fails with "Execution context was destroyed" and the page
  is open; any other error is tried once more, as before. `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-1.run.sh` (from the worktree root) runs
  `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-1.spec.ts`: a page's first seed during a chain of 2, 3 and 5 script redirects on the first origin, 8 fresh
  pages each, on chromium, firefox and webkit; it exits 0 when every seed registers and its arrival has the entry, and
  non-zero at `d850405`, where chromium fails every round (the reproduction above). Not run in the worktree (segment 2B held it when the sketch was written): the orchestrator applies it, runs `pnpm harness:install`, `run.sh`, the unit tests and the area's specs, and restores the worktree. Checked without the worktree: `git -C /home/magdys/workspace/dyhex/POMWright-second-review apply --check` exit 0; on a copy of the sources (`git archive d850405`) and `node_modules` in `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/scratch/`, `biome check` exit 0 and
  `vitest run src/helpers` 301 passed with no type errors; a scratch-only unit probe
  (`/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/unitprobes/zz-probe-2A-1.test.ts`, a fake page whose evaluation is destroyed twice) fails without the diff and
  passes with it.

## Fix sketch

Gate run by the orchestrator on 2026-10-28 in the review worktree at `d850405` (script: the orchestrator's `gate-sketches.sh`): the run script at `d850405`, then `git apply` of the diff and `pnpm harness:install`, the run script again, `pnpm test:unit`, and the area's specs on chromium; then `git checkout -- .`, and at the end the baseline package rebuilt (`dist/index.js` matches the baseline byte for byte) and the worktree clean. Log: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/A/sketch/2A-1.gate.out`.

- At `d850405`: `2A-1.run.sh` exit 1 (3 failed, 6 passed: the chromium rounds). With the sketch: exit 0 (9 passed: chains of 2, 3 and 5 redirects on chromium, firefox and webkit). Unit tests 904 passed; the session storage specs on chromium 88 passed.
- **Verdict: approved; the cause is confirmed.** For the fix plan: the sketch's loop has no bound, so a page that replaces its document forever would keep it retrying until the page closes; the fix bounds it (the call's timeout, or a count), and matching Playwright's message text ("Execution context was destroyed") is fragile across Playwright versions.
