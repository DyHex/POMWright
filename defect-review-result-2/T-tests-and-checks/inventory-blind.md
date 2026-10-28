# Inventory (blind): segment 2T, the tests and the checks

Written in pass 1, at `d850405`, before reading anything of the first review. Not edited after pass 1. One line per item:
what it is; the files; where it is documented; how deeply pass 1 probed it (**probed**: a run that could fail it;
**read**: code and docs read, no run; **survey**: a grep or a listing).

## The harness's mechanics

- H1. Two-step install of the packed package: build, pack, extract to `.pack/pomwright`, `test/` installs it as
  `file:../.pack/pomwright` (pnpm injects it, hard links, with its own peer link). `pack-build.sh`, `pack-extract.sh`,
  `test/package.json`; `test/AGENTS.md` *Commands*, *The harness*. **Probed**: a replaced file in `.pack` reaches
  `test/node_modules` after a frozen install; before it, installed and extracted files share an inode.
- H2. `pack-test.sh`: the seven type and docs checks, browser install, the harness, the steps run, the test-server check
  outside CI; switches `POMWRIGHT_TARBALL`, `PLAYWRIGHT_VERSION`, `PLAYWRIGHT_INSTALL_ARGS`. `test/AGENTS.md`,
  `internal/tests-and-checks.md`. **Read**; its order and `set -e` checked.
- H3. `pnpm typecheck` (`package.json`), the same seven steps as `pack-test.sh`. **Read** (identical lists).
- H4. `playwright.base.ts` (timeouts, retries and `failOnFlakyTests` in CI, `forbidOnly` in CI, reporters, workers 50%),
  spread by `test/playwright.config.ts` and `test/playwright.test-server.config.ts`, not by the steps, outcomes and
  bench configs. **Probed** (`forbidOnly` in CI under the harness config versus the steps config: 2T-4).
- H5. `test/playwright.config.ts`: `testDir ./tests`, web server `pnpm start` on 9000 (reused locally, not in CI),
  three projects. **Read**; CI durations against `globalTimeout` (run 40687553108: 120-148 s of 300 s).
- H6. `test/playwright.steps.config.ts` and `step-locations/locationReporter.ts`. **Probed**: wrong line and unreported
  marker fail (exit 1); a focused test under `CI=1` passes with 1 of 31 checks (2T-4).
- H7. `test/playwright.test-server.config.ts`, `test-server-check.sh`. **Probed** through temp specs.
- H8. `test/playwright.bench.config.ts`, `test/benchmarks/` (not in CI). **Read** only.
- H9. `vitest.config.ts`, `tsconfig.vitest.json`: unit tests in type-check mode over `src/**/*.test.ts` and
  `*.test-d.ts`. **Probed**: an unused `@ts-expect-error` and a false `expectTypeOf` fail the run (exit 1).
- H10. `test/tsconfig.json` (extends the root, path aliases) and `tsconfig.declarations.json`,
  `tsconfig.legacyDecorators.json`, `tsconfig.legacyDecorators.emit.json`. **Probed**: `tsc -p test --listFilesOnly`
  compiles every tracked file under `test/` and no dot folder.
- H11. `test/fixtures/testApp.fixtures.ts`, `test/page-object-models/`. **Read**; layout claims of `test/AGENTS.md` hold.
- H12. `test/.env` (empty, tracked through `!.env`), `test/.gitignore`, root `.gitignore` entries for harness outputs.
  **Read**.

## The test server

- S1. `test/server.js`: every route (27 route paths, GET and POST), the static page, `module.exports = app`, listening
  only as a program. `test/AGENTS.md` lists every route. **Read** in full; route list compared with the guide (all
  listed).
- S2. `test/test-data/staticPage/` (index.html, site.css, nine SVGs): loads only its own files. **Survey** (every
  `src`, `href`, `url(` is local).
- S3. `test/test-server/externalRequests.spec.ts`: one test per GET route and `/`, request listener per context, source
  scan. **Probed**: route walk over added route forms (a `Router`-mounted route is never listed); the scan's regex over
  sample lines (misses `//host` and `ws(s)://`); a temp spec shows the request listener never reports a WebSocket
  (2T-7).

## The run-level checks

- R1. Lifecycle outcomes: `test/lifecycle-outcomes/` (config, `brokenPageObject.spec.ts`) and
  `tests/pageObject/lifecycle.outcomes.spec.ts`, child run per project with a JSON report, compared with a table held
  in the spec. Docs: `docs/page-objects.md` *How a mistake is reported*, `internal/tests-and-checks.md`. **Read**; the
  spec's table equals the page's today; it does not read the page (2T-1, sketch).
- R2. Step locations: `test/step-locations/stepLocations.spec.ts`, `legacyDecorators.spec.ts`, `legacy/legacyWidget.ts`,
  the reporter, the emit config. Docs: `test/AGENTS.md`, `internal/call-sites.md`. **Probed** (H6).
- R3. Documentation chains: `test/tests/docs/docsChains.spec.ts`, one test per page, literals compared with the packed
  package's rendering. Docs: `website/AGENTS.md`, `internal/documentation.md`, `internal/tests-and-checks.md`.
  **Probed**: all 114 literals are on their pages; 178 rendered chains on the pages, the 31 not in the spec are
  messages, diagrams or fragments; the spec reads no page (2T-1).

## The documentation checks

- C1. `scripts/check-doc-snippets.mjs`. **Probed** in a mirror root: a type error in a ```` ```ts ```` block is caught;
  a `` ``` ts`` block (the site's parser reads it as `ts`) and a ```` ```TS ```` block are neither compiled nor rejected
  (2T-2). Not probed: tsc failing with stderr only (the script reads only stdout).
- C2. `scripts/check-api-coverage.mjs`. **Probed** with declaration copies: catches a removed or misdirected `@see`, a
  missing `@param`, undocumented instance and protected members and a new export; misses static members; with
  `@playwright/test` unresolved it walks 105 members instead of 108 and passes (2T-5).
- C3. `scripts/check-error-messages.mjs`. **Probed** in a mirror root: a removed page line, a stale page line and a
  reworded thrown message each fail, naming it. **Survey**: no message-like literal type in `src/` outside
  `MESSAGE_TYPES` that the page would need.
- C4. `scripts/check-diagrams.mjs`. **Probed** on a copy of the built site: a broken diagram fails in both schemes.

## The specs as a whole

- P1. Every spec imports `pomwright`, never `src/`. **Survey** (no `src` import under `test/`).
- P2. False passes. **Survey**: no un-awaited async `expect` (AST scan); every `.catch` handler asserts on the caught
  value; soft assertions only in `docsChains` and the test-server spec, both failing the test. **Probed**: two
  `test.fail(true)` tests hold an assertion that cannot fail them (2T-3).
- P3. Browser-specific branches and skips (`sessionStorage.spec.ts` three skips, `urlForms`, `iframe` storage): each
  states its reason and asserts on every browser. **Read**.
- P4. `packaging/esmEntry.spec.mts`: real ESM. **Probed**: the namespace is a `Module`, `import.meta.resolve` gives
  `dist/index.mjs`.
- P5. `packaging/packageFiles.spec.ts`, `publicTypes.typecheck.ts`, `publicTypes.emit.ts`,
  `stepLegacyDecorators.typecheck.ts`. **Read** (packageFiles) and compiled in the baseline; content is 2F's.
- P6. Sampled specs against their titles: `testApp/testPage.spec.ts`, `logging/logging.spec.ts`, parts of
  `testApp/sessionStorage.spec.ts`, `testApp/urlForms.spec.ts`, `testApp/testNav.spec.ts` (130-140), `step/step.spec.ts`
  (60-77). **Read**.
- P7. What runs against what: harness on the packed CommonJS build (ESM parity only in P4); PR chromium only, `main`
  three browsers; Node 20 and 22 chromium only; Playwright pin and latest 1.x; Linux only (`ubuntu-latest` in all 12
  jobs). **Survey** of the workflows (2G's for their content).

## Docs in scope

- D1. `internal/tests-and-checks.md` (all but *CI*). **Read**; claims checked against H1-C4 (2T-1 for the chains and
  outcomes sentences).
- D2. `internal/documentation.md`, *What keeps it true* and the diagram paragraph. **Read**; 2T-6 (where the checks
  run), 2T-1 and 2T-2 (two sentences).
- D3. `test/AGENTS.md`. **Read** in full; claims checked (install mechanism probed, route list, layout, file lists).

## The change set (v3.0.1..d850405, the area's paths)

- Commits after `54cdada` read by their stats and messages, diffs where they touch the area: ee00af7 (packageFiles),
  54cf090 (diagram check), f4bb76e (frame-budget tests dropped), 69bc09a (legacy decorators at run time), cb101bf,
  6a8b408, 9f47cae, 28310c7 (packed twins), ce6291d (outcomes run, host forms), 55e7149, ff8a2ac (snippet rejections,
  README), 429f2c2 (error-message check), 6c53973, 3be8ca9 (docs chains), 8eda398 (coverage `@see`, type table),
  a7d5ba7 (source-level specs removed), 1b15aff, 6d1de0e (guide split), 0905892 (static page, test-server check),
  ac0832c (one test per page).
