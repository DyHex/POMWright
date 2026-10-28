<!-- Saved by the orchestrator from the segment agent's final message: the agent's own write of this file was refused by
the harness rule "Subagents should return findings as text, not write report files". The text below is the agent's,
unchanged. -->

# Segment 2T: the tests and the checks, summary

- **Scope**: segment 2T of the second review, as an *area*: the harness's mechanics, the test server and its
  external-request check, the run-level checks (lifecycle outcomes, step locations, documentation chains), the four
  documentation checks in `scripts/`, the specs as a whole, and the docs that describe them; the commits since `v3.0.1`
  on those paths as a change set ([brief.md](brief.md)).
- **Commit**: `d850405`, worktree `/home/magdys/workspace/dyhex/POMWright-second-review`.
- **Reviewer**: Opus 5.5, second review, segment 2T. **Dates**: 2026-10-28, 18:25 to 19:01 (+01:00), from `date`
  ([log.md](log.md)).
- **Probes**: `/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/`; sketches for the orchestrator in its
  `sketch/`.

## What I read

The worktree's `skills/defect-review/SKILL.md`; `segments.md`, `baseline.md`, the brief; the guide: root `AGENTS.md`,
`test/AGENTS.md`, `website/AGENTS.md`, `.github/AGENTS.md` in full, and `src/AGENTS.md`, `src/helpers/AGENTS.md` and the
contract bullets of `src/locators/AGENTS.md` for the test-gap survey. In full: `pack-build.sh`, `pack-extract.sh`,
`pack-test.sh`, `test-server-check.sh`, `playwright.base.ts`, `vitest.config.ts`, `tsconfig.vitest.json`, every
`test/*.config.ts` and `test/tsconfig*.json`, `test/package.json`, `test/.gitignore`, `test/server.js`,
`test-server/externalRequests.spec.ts`, `lifecycle-outcomes/`, `pageObject/lifecycle.outcomes.spec.ts`,
`step-locations/` (specs, reporter, legacy widget), `docs/docsChains.spec.ts`, the four `scripts/check-*.mjs`,
`fixtures/testApp.fixtures.ts`, `testApp.base.ts`, `packaging/esmEntry.spec.mts`, `packaging/packageFiles.spec.ts`,
`scripts/write-esm-entry.mjs`, `logging/logging.spec.ts`, `testApp/testPage.spec.ts`, `testApp/urlForms.spec.ts`;
`internal/tests-and-checks.md`, `internal/documentation.md`. In part: `testApp/sessionStorage.spec.ts` (the
`test.fail` and browser-specific tests), `testApp/testNav.spec.ts`, `step/step.spec.ts`, the static page's markup, the
site job and harness job of `checks.yaml`. The change set's commits after `54cdada` by message and stat, their diffs where
they touch the area. Pass 2: G's summary and findings G-4, G-6, G-7, G-11; report.md's test gaps, ledger and §9;
decisions 56, 59, 60 (and 12, 31, 51 as named); plans 31 (`PLAN-T15-docs-chains.md`, contract and notes), 44
(`PLAN-static-page.md`) and 41's items for the second review; the first `inventory.md` §9.

## Coverage

- **Reviewed fully** (every line of `inventory-reconciled.md` marked *probed* for this review): the install of the
  packed package; the base config and the configs that use it; the steps run and its reporter; the test-server check;
  the docs-chains spec; the four documentation checks; vitest's type-check mode; the `tsc` program over `test/`; false
  passes across the specs (scan and two probes); the ESM-entry spec; a7d5ba7's removals.
- **Partly**: `pack-test.sh` (read, not re-run with stubs; the first review did); the lifecycle-outcomes run (read, its
  table compared with the page by eye, not broken: sketch 2T-1); the specs' content (sampled against titles; the area
  segments read their own in full); the test server's routes as fixtures (read; their behavior is the area segments').
- **Not reviewed**: `scripts/pack-version.sh`, `scripts/benchmark.mjs` and the *Performance* numbers (G-6's text only),
  the workflows beyond the site and harness jobs (2G's), `biome.json` rules beyond the file list.
- **Not run**: the full `pnpm pack-test` (the baseline's stands); the sketches (the orchestrator's); `pnpm bench`; the
  harness at the latest Playwright (CI ran it at `d850405`); the harness off Linux (no runner here).
- **Ran beyond the baseline**: the URL specs on Firefox and WebKit under Node 20 and 22 (112 passed each), and the whole
  harness on Firefox and WebKit under Node 20 (1,163 passed, 3 skipped, exit 0): a combination no CI job runs.
- **Known issues met**: #55 (Node 26 not in CI) only.

## Test gaps across the repository, most important first

1. **The documentation's chains and the outcomes table against the pages.** `docsChains.spec.ts` and
   `lifecycle.outcomes.spec.ts` compare the code with copies; a page edited alone passes every check (2T-1). The docs
   say otherwise.
2. **A new tab opened by a link to the seeded origin is not seeded** (`docs/seeding-session-storage.md:142`), **and an
   app starts without an entry the browser refused**: each is asserted only inside a `test.fail(true)` test, where the
   assertion cannot fail it (2T-3). The never-applied message at a fixture's close (the page closed by Playwright, not
   in the body) is checked by unit tests only; the harness tests that close it implicitly accept any failure.
3. **Firefox and WebKit on Node 20 and 22**: no CI job runs them (`harness-node` is chromium only), so
   `urlForms.spec.ts`'s Firefox and WebKit lists for a kept `^` run nowhere in CI. Run here: they hold. Pull requests
   run chromium only (documented; a Firefox or WebKit failure shows after the merge).
4. **Other operating systems**: all 12 CI jobs run on `ubuntu-latest`; the call-site handling (`BUNDLE_FRAME` accepts
   both separators by regex), the step locations and the packaging checks never run on Windows or macOS paths.
5. **The `log` fixture's level on a retry** through the real runner: `initialLogLevel` is unit-tested; the harness's
   "a retry from debug" branch (`logging.spec.ts:72`) runs only after a failure, and CI's `failOnFlakyTests` would fail a
   deliberate retry, so it would need a child run as the outcomes spec does.
6. **The seed's listener lifetime on a real page** (four listeners, removed when nothing is pending): unit-tested on a
   fake page only (`src/helpers/sessionStorageSeed.test.ts:237-409`).
7. **Gaps in the checks themselves**, each filed: an undocumented static member (2T-5); a WebSocket or a
   protocol-relative URL on a test-server page (2T-7); a TypeScript fence written `` ``` ts`` (2T-2); a `tsc` that
   fails without stdout (2T-9); a focused test in `step-locations/` under CI (2T-4).
8. **A route mounted through `express.Router()`** would not be opened by the test-server check (it walks only
   `app.router.stack`'s own routes; probe `routes/routes.cjs`); none exists. A wildcard route is opened at its literal
   path, without a sample.
9. **Node 26** (issue #55, known).

## What is sound (path probed)

- **The packed package reaches the harness**: a replaced file in `.pack/pomwright` is in `test/node_modules` after a
  frozen install (log 18:46); the installed files are hard links to the extraction.
- **Every spec tests the package, not the source**: no import of `src/` under `test/` (grep); `tsc -p test` compiles
  every tracked file under `test/` and no dot folder (`--listFilesOnly`).
- **The ESM entry spec is real ESM**: namespace `Module`, no module-scope `require`, `import.meta.resolve` gives
  `dist/index.mjs` (temp spec `zz-probe-T-esm`).
- **Unit tests' type-check mode**: an unused `@ts-expect-error` and a false `expectTypeOf` fail the run (temp
  `src/zz-probe-T-vitest.test.ts`, exit 1).
- **The step-location reporter**: a step on another line and a never-reported marker fail the run (exit 1), within the
  files of the run.
- **The error-message check**: a removed page line, a stale page line and a reworded thrown message each fail, naming
  it (mirror, exit 1 each); no compile-error type in `src/` is outside `MESSAGE_TYPES` that the page would need.
- **The API coverage check**: a removed or misdirected `@see`, a `@see` without a link, a missing `@param`, an
  undocumented instance or protected member, a new undocumented export, a demoted or fenced heading each fail
  (declaration copies, and G's `plant.sh` re-run: 5 of 5).
- **The diagram check**: a broken diagram fails in light and dark (copy of the built site, exit 1, 8 problems on that
  page only).
- **The snippet check** for the forms it parses: a type error in a `` ```ts`` block fails at its page line; `~~~ts`,
  `tsx` and `nocheck` are rejected with the fix (G's planted page re-run).
- **The docs-chains spec's data today**: all 114 compared literals are on their pages; the 31 rendered chains on pages
  outside the spec are messages, diagrams or fragments (probes `docs-chains/`).
- **No un-awaited async assertion** under `test/` (AST scan); every `.catch` handler asserts on what it caught; the
  soft assertions fail their tests.
- **a7d5ba7**: all 283 titles of the removed source-level locator specs have a same-titled test after it.
- **Firefox and WebKit on Node 20 and 22**: the URL specs pass (112 each); the whole harness passes on Node 20.
- **CI durations**: the harness steps take 120-148 s against a 300 s `globalTimeout` (run 40687553108).
- **The test-server check** for what it targets: an absolute `http(s)` URL to another host is flagged by the scan;
  a load-time request, protocol-relative included, is reported to the context.

## Outside the segment

- 2G's area: the site job does not run `check-error-messages.mjs`; only the harness jobs do. Not a defect by itself
  (2T-6 is the page's sentence); 2T-6's option 2 would add it there.
- Nothing else met.

## Pass 2 outcomes ([first-review.md](first-review.md))

- Findings: **fixed** 3 (G-4, G-6, G-7); **regressed** 1 (G-11, one of its three comments: 2T-8); fixed differently 0;
  not fixed 0; fixed incompletely 0; still present 0; cannot re-run 0.
- Test gaps: report.md's 16: 15 closed (gap 3 is 2G's), with residuals filed (2T-1, 2T-2, 2T-4) or listed above (gap 3
  of this list). G's 7: closed or 2G's.
- Left for the second review in this area: the British spellings in specs and unit tests, still present, not a finding.

## What passes 3 and 4 changed

- **Pass 3**: one blind spot of pass 1 (G-11's header, read in pass 1 without seeing it named one config: 2T-8); 2T-6's
  history refined (accurate at `54cdada`; stale since f866325 and 429f2c2) with its two readings; the first-review
  fields of 2T-2, 2T-3 and 2T-5 settled as *missed*, 2T-4 as *new*. No disagreement on a shared item.
- **Pass 4**: 2T-9 (the snippet check ignores `tsc`'s exit code); Firefox and WebKit on Node 20 and 22 run and sound;
  the non-spec files under `test/tests/` all used.

## Sketches proposed (for the orchestrator)

- `sketch/2T-1.diff` + `2T-1.run.sh`: changes one chain on *Queries* and one row of *Page objects*' outcomes table
  (`website/` only); runs `docsChains.spec.ts` (Queries) and `lifecycle.outcomes.spec.ts` on chromium; exits 0 only if
  both fail. Expected at `d850405`: both pass, exit 1.
- `sketch/2T-7.diff` + `2T-7.run.sh`: adds a load-time `wss://` WebSocket and a click-time protocol-relative `fetch` to
  `/testnav` (`test/server.js` only); runs `test-server-check.sh`; exits 0 only if it fails. Expected at `d850405`: the
  check passes, exit 1.

## Index of findings

| ID | Kind | Severity | Semver | Pass | First review | One line |
| --- | --- | --- | --- | --- | --- | --- |
| [2T-1](defect-2T-1-docs-checks-compare-copies.md) | defect | Low | none | 1 | new (6c53973, 3be8ca9, ce6291d) | The docs-chains and lifecycle-outcomes specs compare the code with copies of the pages, so a page edited alone goes stale without failing either. |
| [2T-2](defect-2T-2-snippet-check-misses-spaced-fence.md) | defect | Low | none | 1 | missed | The snippet check neither compiles nor rejects a `` ``` ts`` block, which the site renders as TypeScript. |
| [2T-3](defect-2T-3-test-fail-hides-assertions.md) | defect | Low | none | 1 | missed | Two `test.fail(true)` session storage tests hold an assertion that cannot fail them; "a new tab has its own storage" is checked by no test. |
| [2T-4](defect-2T-4-steps-config-allows-only.md) | defect | Low | none | 1 | new (b19de77, 69bc09a) | The step-location run accepts a stray `test.only` in CI and then checks only that test's file and passes. |
| [2T-5](defect-2T-5-api-coverage-skips-members.md) | defect | Low | none | 1 | missed | The API coverage check never walks static members, and walks fewer members silently when `@playwright/test` does not resolve from the given declarations. |
| [2T-6](defect-2T-6-documentation-page-ci-sentence.md) | documentation | Low | none | 1 | new (stale since f866325, 429f2c2) | *Internal → Documentation* misstates which CI jobs run which checks, and says jobs run only on code or page changes. |
| [2T-7](defect-2T-7-test-server-check-blind-spots.md) | defect | Low | none | 1 | new (0905892, ac0832c) | The test-server check does not see a WebSocket to another host, nor a protocol-relative URL loaded on a click or timer. |
| [2T-8](defect-2T-8-base-config-comment-stale-again.md) | documentation | Low | none | 2 | G-11: regressed (0905892) | `playwright.base.ts` says it holds `test/playwright.config.ts`'s options; the test-server config spreads it too. |
| [2T-9](defect-2T-9-snippet-check-ignores-tsc-exit-code.md) | defect | Low | none | 4 | missed | The snippet check judges `tsc` by its stdout, so a `tsc` failing on stderr only passes it. |

Counts: 7 defects, 2 documentation, 0 suspected, 0 design questions.
