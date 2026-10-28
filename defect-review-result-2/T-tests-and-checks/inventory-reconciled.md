# Inventory (reconciled): segment 2T

Pass 3. The union of `inventory-blind.md` (this review's pass 1) and the first review's `inventory.md` §9 *Tests and
tooling* with G's summary (its scope covered the setup), each line marked **both**, **blind only** or **first only**, with
how deeply each review probed it. "First: probed" means G ran something that could fail it at `54cdada`; "blind:
probed" refers to pass 1's runs (`log.md`).

| Item | Mark | First review (54cdada) | This review (d850405) |
| --- | --- | --- | --- |
| Unit tests in vitest type-check mode (`vitest.config.ts`, `tsconfig.vitest.json`) | both | read; discovery checked | probed: a false `expectTypeOf` and an unused `@ts-expect-error` fail the run |
| The harness installs the packed package (`pack-build.sh`, `pack-extract.sh`, `file:../.pack/pomwright`) | both | probed (`probes/G/inject/`) | probed again; also: installed files are hard links to `.pack` |
| `pack-test.sh` and `pnpm typecheck` (steps, order, switches) | both | probed with stub tools (`probes/G/packtest/`) | read; the seven steps of both lists compared |
| `PLAYWRIGHT_VERSION` latest row | first only | probed in a clone (1.64.1) | not run (CI ran it at d850405, baseline.md) |
| `playwright.base.ts` and the configs that spread it | both | read | probed (`forbidOnly` under CI: harness refuses `.only`, the steps run does not, 2T-4); header stale (2T-8, pass 2) |
| `test/playwright.config.ts` (server reuse, projects) | both | read | read; CI durations against `globalTimeout` |
| `test/playwright.bench.config.ts`, `scripts/benchmark.mjs`, *Performance* | first only (bench) / both (config) | probed (`pnpm bench`), G-6 | read the config; G-6 re-checked as text only |
| `test/playwright.steps.config.ts`, `step-locations/` and its reporter | both | probed: a renamed probe passed (gap 4) | probed: wrong line and unreported marker fail; focused test passes (2T-4) |
| Legacy decorators at run time (`tsconfig.legacyDecorators.emit.json`, `legacyDecorators.spec.ts`) | blind only (new, 69bc09a) | — | read; part of the steps run |
| Type probes (`*.typecheck.ts`, `publicTypes.emit.ts`) and their tsconfigs | both | listed (B, E, F) | `tsc -p test --listFilesOnly` (all compiled); content is 2F's |
| `test/server.js` routes | both | port and start only | read in full; route list against the guide |
| The static page (`test/test-data/staticPage/`) | blind only (rebuilt in 0905892) | — | survey: loads only its own files |
| The test-server check (`test-server/externalRequests.spec.ts`, its config, `test-server-check.sh`) | blind only (new) | — | probed: route walk, scan regex, WebSocket listener (2T-7) |
| The lifecycle-outcomes run (`lifecycle-outcomes/`, `lifecycle.outcomes.spec.ts`) | blind only (new, ce6291d) | — | read; table equals the page's; reads no page (2T-1) |
| The docs-chains spec (`docs/docsChains.spec.ts`) | blind only (new) | — | probed: literals against pages both ways (2T-1) |
| `check-doc-snippets.mjs` | both | probed (planted `~~~ts`, `tsx`, `nocheck`) | probed: mirror (2T-2); the first review's planted page re-run, now rejected |
| `check-api-coverage.mjs` | both | probed (`@see` targets, G-7; rest parameters) | probed: mutations (2T-5); G-7's plant re-run, fixed |
| `check-error-messages.mjs` | blind only (new, 429f2c2) | — | probed: mirror, both directions |
| `check-diagrams.mjs` | blind only (new, 54cf090) | — | probed: broken diagram in a site copy |
| The site build's link check | first only | probed (planted page and anchor) | not run (2H's) |
| `scripts/pack-version.sh` | first only | shellcheck clean | not reviewed (a hand-run packaging script; 2F's or 2G's) |
| `scripts/ci-changes.sh`, `ci-last-green.sh` | first only | probed (G-1, G-2) | deleted since (f866325, decision 31) |
| `scripts/ci-playwright-version.sh`, the workflows, Dependabot | first only | probed | survey only (2G's) |
| `scripts/write-esm-entry.mjs` | both (read) | read (F) | read; the ESM spec probed as real ESM |
| `biome.json`, `.editorconfig`, `pnpm-workspace.yaml`, root `tsconfig.json` | first only (the three), both (`tsconfig.json`) | read; G-9 | `biome.json` and `tsconfig.json` read; the others 2G's/2I's |
| Fixtures and page objects (`test/fixtures/`, `test/page-object-models/`) | blind only | — | read; the guide's layout claims hold |
| `test/.env`, `test/.gitignore`, the root ignores | blind only | — | read |
| The specs as a whole: false passes | blind only | — | AST scan (0 floating async `expect`), `.catch` handlers, soft assertions; probed two `test.fail` tests (2T-3) |
| The specs as a whole: browser branches and skips | blind only | — | read (three skips, each stated) |
| The ESM entry spec (`packaging/esmEntry.spec.mts`) | blind only | — | probed: real ESM, `dist/index.mjs` |
| The packed twins and the removed source specs (a7d5ba7) | blind only (new) | gap 10 (source-only coverage) | probed: 283 titles before and after |
| What runs against what (browsers, Node lines, Playwright, OS) | both | gap 11 (Node 22 never) | survey: Firefox and WebKit never on Node 20/22; Linux only |
| Docs: `internal/tests-and-checks.md`, `internal/documentation.md` (checks), `test/AGENTS.md` | both | read (G read the two pages and §2-§9 of the old guide) | read; 2T-6, and lines of 2T-1 and 2T-2 |

## Findings, both ways

- **First-review findings this pass 1 would have met.** G-7 (`@see` targets): pass 1's mutations include a misdirected
  `@see`, so it would have been met; it is fixed. G-4 (stale `dist/`): pass 1 did not probe a stale build; fixed since,
  so nothing to meet. G-6 (*Performance*): outside pass 1's map (the benchmark page). G-11: pass 1 read
  `playwright.base.ts`'s header and noted that two configs spread the base (2T-4), yet did not see that the header
  names one: **a blind spot of pass 1**, filed in pass 2 as 2T-8.
- **Blind findings the first review did not report.** New since 54cdada: 2T-1 (6c53973, 3be8ca9, ce6291d), 2T-4
  (b19de77, 69bc09a), 2T-6 (made stale by f866325 and 429f2c2), 2T-7 (0905892, ac0832c). Missed by the first review:
  2T-2 (the fence regex is unchanged; G planted other forms), 2T-3 (both tests at 54cdada), 2T-5 (the walk and the
  program are unchanged; G's copies resolved Playwright).
- **Disagreements.** None on a shared item: where both probed (install, snippets, coverage, reporter), the first
  review's fixes hold and this review's findings are on forms or paths the first did not try.
- **Neither probed deeply**: `pack-version.sh`; the benchmark's numbers; the bench config; Node 20/22 with Firefox or
  WebKit; the harness on another OS; the child run of `lifecycle.outcomes.spec.ts` under CI's environment (`CI=true`
  passed down). Pass 4 takes the last of these and the Node line question.
