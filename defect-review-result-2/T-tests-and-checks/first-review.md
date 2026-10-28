# The first review in segment 2T's area, at `d850405`

Pass 2. The first review had no scope for the tests and checks: its findings here are G's (`G-ci-and-tooling`), and its
test gaps are report.md's merged list of 16 and G's own list of 7. Re-runs copied into
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/T/run1/<ID>/`, pointed at the worktree. No ledger row has a
`T` ID; the `T` numbers name report.md's test gaps, which the plans carry (PLAN-T10, T12-T15, T14, T15, T16, H-7-T13,
G-3-T15).

## Findings

| First-review ID | Kind | Outcome | What was run, and what it printed |
| --- | --- | --- | --- |
| G-4 (local builds keep stale `dist/`) | defect | **fixed** | `echo stale > dist/old-chunk.js && pnpm build`, then `npm pack --dry-run --json` (`run1/G-4/`): build exit 0; `dist/` holds `index.d.mts`, `index.d.ts`, `index.js`, `index.mjs` only; the pack list is those four, `CHANGELOG.md`, `LICENSE`, `README.md`, `package.json`; each `dist` file equals the baseline tarball's (`cmp`). `packaging/packageFiles.spec.ts` asserts the installed list in every harness run (ee00af7). |
| G-6 (*Performance* says 20,000 calls for every column) | documentation | **fixed** | `internal/performance.md:25-26`: "each measurement runs its call 20,000 times (registration ... 2,000 times)", matching `scripts/benchmark.mjs:105` and `:109-112`. `pnpm bench` not re-run (no claim depends on its numbers here). |
| G-7 (the coverage check accepts any `@see`) | documentation | **fixed** | `run1/G-7/plant.sh` (G's `plant.sh` with its paths moved to this worktree and line 654 replaced by a grep for `get`'s `@see` line, 696 now): cases 1-5 all exit 1 ("no heading: SeedOptions.origin ...", "@see not at its own heading: SessionStorage.get links ...#set", "@see without a link to the site", the demoted heading, the fenced heading). The first review's `plant.out` had cases 1-3 at exit 0. My own mutations (2T-5) confirm a misdirected `@see` fails. |
| G-11 (three stale tooling comments) | documentation | **regressed** (one of three) → **2T-8** | `vitest.config.ts:7-10` and `check-api-coverage.mjs:20-23` describe the tooling as it is. `playwright.base.ts:1` ("The shared options of test/playwright.config.ts") was right at 1b15aff and is stale since 0905892, which added `test/playwright.test-server.config.ts` spreading it. |

The other G findings (G-1, G-2, G-3, G-5, G-8, G-9, G-10) are CI, release and repository settings: 2G's.

## G's claims beyond its findings, for this area

| Claim (G's summary) | Now |
| --- | --- |
| *Sound*: `pack-test.sh` stops before the step-location run when the harness fails | still true: `set -euo pipefail`, the steps run follows the harness (`pack-test.sh:20`, `:49-51`); not re-run with stubs |
| *Sound*: a re-extracted `.pack/pomwright` is hard-linked again by a frozen install | re-probed (log, 18:46): a replaced file reached `test/node_modules` after `pnpm -C test install --frozen-lockfile`; before it, the installed file and the extraction share one inode, so an in-place edit of `.pack` reaches the harness without an install |
| *Sound*: `tsc -p test` leaves out `test/.doc-snippets` | re-probed: `--listFilesOnly` lists every tracked file under `test/` and no dot folder (`.doc-snippets`, `.legacy-decorators`) |
| *Sound*: vitest discovers only `src/**/*.test.ts`, plus `*.test-d.ts` for type checks | still true (`vitest.config.ts:13-18`); re-probed that type errors fail the run |
| *Sound*: the Playwright configs match the guide | partly: two configs spread the base now and three do not; the steps config lacks `forbidOnly` (2T-4) and the base's header names one config (2T-8) |
| *Sound*: every `ts` fence of the docs is checked or listed | still true for the fence forms the check parses (226 checked, 12 `nocheck`, baseline); a `` ``` ts`` fence would be neither (2T-2) |
| *Sound*: a wrong heading level is caught by the coverage check | re-run (G-7 case 4): still caught |
| *Sound*: `pnpm bench` runs; its tables agree with *Performance* | not re-run |
| *Sound*: the site build fails on a missing page or anchor | not re-run (2H's and 2G's) |

## Test gaps: report.md's list (16) and G's list (7)

| Gap | Status at `d850405` | Closed by |
| --- | --- | --- |
| report 1 / G 4: nested boxed steps; the reporter does not require each marker | **closed** | `step-locations/stepLocations.spec.ts` (nested-outer, nested-inner, nested-helpers, nested-throws, in-test-*); `locationReporter.ts:88-94` fails on an unreported marker, probed (log 18:37, "probe-never"). Residual: a focused test drops the other file's markers (2T-4) |
| report 2: a batch interrupted by a navigation; `clear`, `get(keys)`, an on-origin seed mid-navigation | **closed** for the batch, `clear` and `get(keys)` | `testApp/sessionStorage.spec.ts:130-152` (live storage of the other origin, not the snapshot) and `:155-230` (`commitOnBAfter` for `setItem`, `removeItem`, `getItem`, `clear`); `src/helpers/sessionStorage.test.ts:274` |
| report 3 / G 1-2: releases, provenance, actionlint, workflows untried | 2G's | not checked here; the lint job runs actionlint (`checks.yaml:48`) |
| report 4: configuration Playwright accepts but Node rejects | **closed** | `logging/logging.spec.ts`, *the locale and the time zone, checked when the test starts* (`""`, `EN-us`, `en_US` serial pair) |
| report 5: type tests for documented forms | **closed** (sampled) | `packaging/publicTypes.typecheck.ts`: generic `@step` method (:205), `createRegistryWithAccessors<string>` sub-paths (:396), reuse by a wide seed (:136), the generic base class (:408-417), the four `NavigationFor` page kinds (cb101bf); branded keys in `src/helpers/sessionStorage.test.ts:584-592` |
| report 6: declaration emit | **closed** (sampled) | `packaging/publicTypes.emit.ts`: `createReusable` (:20-22), a preconfigured `step({ box: true })` (:51), every public member (7f90436, b4fee4a, ea94410, 7447754) |
| report 7: `errors.md` completeness | **closed** | `scripts/check-error-messages.mjs`, both directions, probed in a mirror (log 18:39) |
| report 8: an `about:blank` popup with an inherited origin | **closed** | `testApp/sessionStorage.spec.ts:37-84` (bound and unbound overlap, seed then set) |
| report 9: registration edges | **closed** | `locatorRegistry/add/add.get.clone.spec.ts:134-140` (own non-enumerable options), `add/add.validation.spec.ts:170` (a throwing locator method leaves the registration as it was), `add/add.registrationEnds.spec.ts` |
| report 10: source-only coverage | **closed** | packed twins (6a8b408, 9f47cae, 28310c7), then a7d5ba7: 283 titles of the removed source-level specs, 283 after, none lost (log 18:48) |
| report 11: page objects (base-class call site, `async defineLocators()`, `|`/`^` in `toHaveURL`, Node 22) | **closed** | `pageObject/callSite/checkSite.spec.ts:56` (base class), `pageObject/lifecycle.spec.ts` and `src/pageObject.test.ts` (Promise from `defineLocators()`), `testApp/urlForms.spec.ts:56-93`, `harness-node` (Node 20 and 22, chromium). Residual: Firefox and WebKit never run on Node 20 or 22 (see `summary.md`'s gaps) |
| report 12 / G 3, 5, 6: CI scripts; snippet fences; `@see` targets | **closed** | the scripts deleted (decision 31); the planted page re-run (`run1/G-snippets/planted.out`): exit 1 with the `~~~`, `tsx` and `nocheck` rejections and the control's error (the first review's run had only the control's); `@see` targets: G-7 above. Residual: 2T-2 |
| report 13: logger (second `attachLogsToTest`, teardown order; legacy decorators at run time) | **closed** | `src/helpers/playwrightReportLogger.test.ts:101-102`; `logging/logging.spec.ts` (an entry logged in a dependent fixture's teardown); `step-locations/legacyDecorators.spec.ts` on real `tsc` output (69bc09a) |
| report 14 / G 7: packaging probes manual; TypeScript versions; packed file list | **closed** | the `consumer` job (`scripts/consumer-check.sh`, 2F's and 2G's); `packaging/packageFiles.spec.ts` |
| report 15: README examples; chains and messages re-probed; Mermaid | **closed**, with a residual | README in the snippet check (ff8a2ac); `docs/docsChains.spec.ts` (6c53973, 3be8ca9); the error-message check; `scripts/check-diagrams.mjs` (probed, log 18:43). Residual: the chains and the outcomes table are compared with copies, so a page changed alone passes (2T-1) |
| report 16: smaller (C-7, back/forward cache, R-2, rejecting action, lifecycle rows, `navigationTimeout`, `expect*` locations, host forms) | **closed** | `src/locators/locatorQueryBuilder.test.ts:211` (C-7), `internal/seed-registry.md:200` (the cache case, named), `testApp/sessionStorage.spec.ts:998-1020` (R-2), `pageObject/actions.spec.ts`, `lifecycle.outcomes.spec.ts`, `testApp/testNav.spec.ts` (`navigationTimeout`), `stepLocations.spec.ts` (expect-this, expect-another), `testApp/urlHosts.spec.ts` |

## Left for the second review (PLAN-release-gates-and-audit.md), in this area

- **British spellings in specs and unit tests written before the branch**: still present, and left: `labelled`
  (`src/pageObject.test.ts` ×5, `pageObject/lifecycle.spec.ts` ×3), `initialiser`/`initialisation`
  (`lifecycle.spec.ts`, `src/pageObject.test.ts`), `licence` (`packaging/esmEntry.spec.mts:36`), `recognised`,
  `recognises`, `normalises`, `behaviour` (unit tests), `normaliseOrigin` (`src/helpers/sessionStorage.ts`, internal).
  No rule covers them: `website/AGENTS.md`'s American spelling is a rule of the pages. Not a finding.
- The other items (report.md §9's *Considered and not filed*, E's gap 7, R-3) are A's, D's, E's and the consolidation's.

## Counts

- Findings: 3 fixed (G-4, G-6, G-7), 1 regressed (G-11 → 2T-8), 0 not fixed, 0 fixed differently, 0 still present, 0
  cannot re-run.
- Test gaps: 15 of report.md's 16 closed (gap 3 is 2G's), three with a residual filed or listed (2T-1, 2T-2, 2T-4) and
  one with a residual listed (Firefox and WebKit on Node 20 and 22).
