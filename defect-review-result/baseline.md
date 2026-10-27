# Baseline

Every check once at `54cdada` (`fix/review-3-0-2`), in the review worktree `/home/magdys/workspace/dyhex/POMWright-final-review`
(detached at `54cdada`), on 2026-10-23 from 09:17 to 09:20 (+02:00). Node 24.22.0 (Node 20.20.2 for the floor run), pnpm
12.14.0, `@playwright/test` 1.64.0 (the pin). Script and logs: `/home/magdys/workspace/dyhex/POMWright-final-review-probes/phase0/`
(`baseline.sh`, `summary.txt`, one `<step>.log` per step).

| Step | Command | Exit | Time | Result |
| --- | --- | --- | --- | --- |
| install | `pnpm install --frozen-lockfile` | 0 | 1 s | |
| lint | `pnpm lint` | 0 | 0 s | |
| unit | `pnpm test:unit` | 0 | 2 s | 33 test files, 782 tests passed; type errors: none |
| pack-test | `pnpm pack-test --reporter=line` | 0 | 117 s | build and pack; `tsc` over `test/`, the declaration emit, legacy decorators; doc snippets: 215 checked, 12 skipped (`nocheck`), example app 5 files; API coverage: 38 exports, 98 members, 123 site links, 0 problems; harness on chromium, firefox and webkit: 1506 passed, 3 skipped; step locations: 7 checked, 4 tests passed |
| node20 | `PATH=<node 20>:$PATH POMWRIGHT_TARBALL=<the tarball above> bash pack-test.sh --project=chromium --reporter=line` (as CI's `harness-node-floor`) | 0 | 17 s | chromium: 503 passed; step locations: 4 passed |
| docs-build | `pnpm docs:build` | 0 | 5 s | built; one warning: `The collection "i18n" does not exist or is empty` |
| status | `git status --porcelain --ignored` | 0 | | no tracked or untracked change; ignored: `.pack/`, `dist/`, `node_modules/`, `pomwright-test-build.tgz`, `test/.doc-snippets/`, `test/node_modules/`, `test/test-results/`, `website/.astro/`, `website/dist/`, `website/node_modules/` |

The three skipped tests are browser-specific skips in `test/tests/testApp/sessionStorage.spec.ts`: lines 708 and 733
(Firefox, "a refused connection" after a failed navigation) and 1131 (WebKit opens an attachment as a document).

Not run in the baseline: the harness at the latest Playwright 1.x (CI's second `harness` column; `PLAYWRIGHT_VERSION`
rewrites both manifests and lockfiles), Node 22, `pnpm bench`, the GitHub workflows themselves (`gh` is logged out on
this machine: `HTTP 401: Bad credentials`), and the AGENTS.md §7 pre-release packaging probes. Scopes F and G decide
which of these to run.

A red step in a scope's own run that was green here is the scope's to explain; a step that was red here would have been
a finding of its own (none was).
