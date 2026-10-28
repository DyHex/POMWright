# Baseline

Every check once at `d850405` (`fix/review-3-0-2`), in the review worktree `/home/magdys/workspace/dyhex/POMWright-second-review`
(detached at `d850405`), on 2026-10-28 from 13:41 to 13:45 (+01:00). Node 24.22.0 (20.20.2 and 22.18.0 for the older
lines), pnpm 12.14.0, `@playwright/test` 1.64.0 (the pin). Script and logs:
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/phase0/` (`baseline.sh`, `summary.txt`, one `<step>.log` per step).

| Step | Command | Exit | Time | Result |
| --- | --- | --- | --- | --- |
| install | `pnpm install --frozen-lockfile` | 0 | 0 s | |
| lint | `pnpm lint` | 0 | 1 s | |
| unit | `pnpm test:unit` | 0 | 2 s | 33 test files, 904 tests passed; no type errors |
| pack-test | `pnpm pack-test --reporter=line` | 0 | 135 s | build and pack; `tsc` over `test/`, the declaration emit, both legacy-decorator configs; doc snippets: 226 checked, 12 skipped (`nocheck`), example app 5 files; API coverage: 40 exports, 108 members, 134 site links, 0 problems; error messages: 77 thrown and 9 compile-error messages, 108 lines on the page, 9 internal, 3 passed through; harness on chromium, firefox and webkit: 1,746 passed, 3 skipped; step locations: 11 tests passed, 31 locations checked; test-server check: 26 passed |
| node20 | `PATH=<node 20>:$PATH POMWRIGHT_TARBALL=<the tarball above> bash pack-test.sh --project=chromium --reporter=line` (as CI's `harness-node`) | 0 | 25 s | chromium: 583 passed; step locations: 11 passed; test-server check: 26 passed |
| node22 | the same on Node 22 | 0 | 24 s | chromium: 583 passed; step locations: 11 passed; test-server check: 26 passed |
| reinstall | `pnpm harness:install` (back to Node 24's install of the same tarball) | 0 | 2 s | |
| docs-diagrams | `pnpm docs:diagrams` (`pnpm docs:build`, then every diagram rendered in Chromium) | 0 | 10 s | site built; 17 diagrams on 13 pages, light and dark, 0 problems; warnings: a chunk over 500 kB, `The collection "i18n" does not exist or is empty`, `Entry docs → 404 was not found` |
| status | `git status --porcelain --ignored` | 0 | | no tracked or untracked change; ignored: `.pack/`, `dist/`, `node_modules/`, `pomwright-test-build.tgz`, `test/.doc-snippets/`, `test/.legacy-decorators/`, `test/node_modules/`, `test/test-results/`, `website/.astro/`, `website/dist/`, `website/node_modules/` |

The tarball the runs used is kept at `/home/magdys/workspace/dyhex/POMWright-second-review-probes/phase0/pomwright-test-build.tgz`.

The three skipped tests are browser-specific skips in `test/tests/testApp/sessionStorage.spec.ts`: lines 843 and 868
(Firefox, "a refused connection") and 1291 (WebKit opens an attachment as a document).

## CI on `d850405`

PR #60's run [40687553108](https://github.com/DyHex/POMWright/actions/runs/40687553108), every check green: Lint; Unit
tests and package; Harness (chromium, Playwright pin); Harness (chromium, Playwright latest); Harness (chromium,
Playwright pin, Node 20); Harness (chromium, Playwright pin, Node 22); Test server: no external requests; Consumer
installs; Documentation and site; build. A pull request runs the harness on chromium only; `main` runs all three
browsers at both Playwright versions.

## Not run here

- The harness at the latest Playwright 1.x (CI ran it on chromium, above; locally, `PLAYWRIGHT_VERSION` rewrites both
  manifests and lockfiles).
- The consumer check (`scripts/consumer-check.sh`; CI ran it, above; it installs from npm).
- Node 26, which became LTS on 2026-10-28: not installed on this machine, and not in CI (issue #55).
- `pnpm bench`, and the pre-release packaging probes `.github/AGENTS.md` describes.

A segment decides which of these its findings need.

## Known issues

Open on 2026-10-28 (`https://api.github.com/repos/DyHex/POMWright/issues?state=open`):

| Issue | Labels | Title |
| --- | --- | --- |
| [#53](https://github.com/DyHex/POMWright/issues/53) | github_actions, backlog | Move the release tooling to changesets CLI 3, changesets/action v2 and npm Trusted Publishing |
| [#54](https://github.com/DyHex/POMWright/issues/54) | backlog | Move to TypeScript 7 once it has a compiler API |
| [#55](https://github.com/DyHex/POMWright/issues/55) | backlog | Node 26 for contributors and in CI once it is LTS |
| [#56](https://github.com/DyHex/POMWright/issues/56) | github_actions, backlog | Publish the tarball CI tested instead of rebuilding it |
| [#57](https://github.com/DyHex/POMWright/issues/57) | backlog | A browser-context-wide option for `SessionStorage.seed` |
| [#58](https://github.com/DyHex/POMWright/issues/58) | backlog, breaking | Write a page object's session storage schema once (breaking) |
| [#59](https://github.com/DyHex/POMWright/issues/59) | backlog | An option to treat an empty `?` or `#` as the same page |
| [#61](https://github.com/DyHex/POMWright/issues/61) | bug, backlog | 2.x: sub-path arguments do not compile in a generic base class that adds paths (regression from 1.x) |
| [#62](https://github.com/DyHex/POMWright/issues/62) | backlog, breaking | `log` fixture: record every level, and attach every level when a test does not go as expected (breaking) |

PR #60 is this branch. Some of these issues were filed from the first review; reading their titles is not reading the
first review. Read an issue's body when a finding may match it.

## Excluded

- `defect-review-result/`: the first review's working folder, read in pass 2 as a source, not reviewed as part of the
  repository (it is removed before the merge).
- `skills/defect-review/`: the review's own method, not part of the package, the site or the guide's subject.
- `CHANGELOG.md` (written by a tool; 2F checks only the format the next release adds), the lockfiles, and
  `test/test-data/` beyond what 2T checks (that it loads nothing from another host).
