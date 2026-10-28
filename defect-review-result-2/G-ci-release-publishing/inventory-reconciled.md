# Segment 2G: inventory, reconciled

Pass 3. The union of `inventory-blind.md` and the first review's inventory lines for this area (`inventory.md` §4's CI
line, §9's scripts, workflows and config lines, §11's issues 01, 03, 04, all tagged `[G]`), each marked *both*, *blind
only* or *first only*, with how deeply each review probed it. The first review's scope G also held the tests and checks
(now 2T's) and the build (2F's); those lines are listed once, as handed on.

| # | Item | Mark | First review (`54cdada`) | Second review (`d850405`) |
| --- | --- | --- | --- | --- |
| 1 | `checks.yaml`, every job on every run (the first: `changes` → jobs → gate) | both | the skip probed on 13 scenarios in scratch repositories; G-1, G-2 | the skip is gone (#31); actionlint; PR #60's nine jobs |
| 2 | lint: biome, actionlint, ShellCheck, pinned by SHA-256 | blind only (new since: f866325, b47a255) | (actionlint run by hand; not in CI then) | both checksums verified; latest releases |
| 3 | package job and the one tarball | both | the tarball tested is the one built (read) | read |
| 4 | harness: pin and latest 1.x; `ci-playwright-version.sh` | both | `pin`, `latest`, unknown row; the latest row in a clone, exit 0 | the same rows, plus `skip=true` when the pin is the latest; `npm view`'s order read in npm's source; no out-of-order Playwright release |
| 5 | Node lines (first: `harness-node-floor`; now `harness-node` 20, 22) | both | Node 20 job read; Node 22 never run (accepted, #8) | read; PR #60 shows both; `engines` checked against Playwright 1.64's; the schedule part *not blind* (log: breach); `pr.yaml`'s header (2G-5) |
| 6 | test-server job | blind only (new: 0905892) | — | read; missing from *Tests and checks* (2G-5); the check itself 2T's |
| 7 | consumer job | blind only (new: 612a62a) | — | read as a job; the script is 2F's; *not probed* |
| 8 | site job; Pages builds the same | both | site build fails on a missing page or anchor (planted) | the site's sources import nothing outside `website/` (read) |
| 9 | pr.yaml, main.yaml, the gate `build` | both | the gate from live PR runs (#47–#49) | read; PR #60's run; branch protection re-read |
| 10 | main.yaml's concurrency and ordering | both | G-8's ordering claim (suspected) | GitHub's docs: one pending run, replaced; FIFO "not guaranteed" (2G-3); a cancelled waiting run never starts Publish (2G-1, decided part) |
| 11 | Permissions per job | both | "as documented" (read) | read |
| 12 | Action pins and their tags | both | 8 pins match | 8 pins match, each the latest tag |
| 13 | Dependabot | both | G-3 (deferred majors, PR #47) | fixed; groups minor/patch; holds; past PRs show pnpm 12 lockfiles handled; `packageManager` and the workflows' pnpm version move by hand |
| 14 | CODEOWNERS | blind only | — | users exist; access and review rules not public |
| 15 | Publish's trigger and job condition; forks | both | conditions read; forks and branches kept out | the same; a fork's run never reaches Publish |
| 16 | The tested-commit guard | both | G-5 (replayed in a scratch repository, v1.9.0's decision) | three paths simulated with the step verbatim, the real registry and changesets' own libraries; 2G-1 (paths a and c; b decided) |
| 17 | A re-run of a Publish run | blind only | — (G-8 covered re-runs of `CI` for Pages) | GitHub keeps the original `GITHUB_SHA`; simulated with a bare origin; 2G-2 |
| 18 | changesets/action and the CLI | both | v1.9.0 and v2.1.2 sources read (G-3, G-5, G-10) | v2.1.2's switch, `runPublish`, `prepareBranch`/`pushChanges` (reset to `context.sha`), the CLI 3.0.3's publish command and unpublished-version rule read |
| 19 | Provenance and Trusted Publishing; the `npm` environment | both | G-10 (none on 3.0.x; cause undetermined) | environment read through the API (`main` only, no reviewers, no admin bypass); pnpm 12.14.0 and npm's docs; the publisher's settings not visible |
| 20 | The provenance check after publishing | blind only (new: 3284aa4) | — | the endpoint answers 200 for four packages with provenance, 404 for `pomwright@3.0.1` |
| 21 | The published package rebuilt, not the CI tarball | both | issue draft 04 (known) | issue #56 (known) |
| 22 | Version Packages pull requests and their PR run | blind only | — | #52's PR run started `action_required` and ran after the maintainer approved it (attempt 2); merged a minute after it passed |
| 23 | Pages: which commit it deploys; re-runs; manual runs | both | G-8 (suspected: a re-run redeploys an older site) | the tip step simulated (moved-past, re-run of an older run, re-run of the tip); 2G-3; `github-pages` allows `main` only, admins may bypass |
| 24 | `pnpm bench` and *Performance* | both | run once (within noise); G-6 (call counts) | run at `d850405` (within 10–25%, ratios hold); the round-trip line probed separately: 2G-4 |
| 25 | `.github/AGENTS.md`, `docs/releases.md` *Carrying out a release* | both (first: AGENTS.md §2, §7) | §2, §7 against the workflows | every sentence of *The workflows* and *Publish and Pages* against the workflows; 2G-1, 2G-2, 2G-3 |
| 26 | `tests-and-checks.md` *CI*, `documentation.md` *Building and publishing* | both | read against the workflows | 2G-1, 2G-2, 2G-3, 2G-5 |
| 27 | The change set since `v3.0.1` | both | the commits up to `54cdada` | the 13 commits in scope; 7 after `54cdada` read first |
| 28 | Local runs against CI | blind only | — | listed (inventory-blind 32) |
| 29 | `pack-build.sh`, `pack-extract.sh`, `pack-test.sh` and their switches | first only (2T's now) | exit codes and switches with stubs | CI's use of the switches holds by its green runs; not re-probed |
| 30 | `check-doc-snippets.mjs`, `check-api-coverage.mjs` | first only (2T's) | planted pages; G-7 | — |
| 31 | `pack-version.sh` | first only (2T/2F) | read, shellcheck | ShellCheck's one info re-seen |
| 32 | Configs: `biome.json`, `tsconfig.json`, `pnpm-workspace.yaml`, `playwright.base.ts`, `test/playwright.config.ts`, vitest | first only (2T's), but for the reporters | matched §3/§4 | reporter folders against CI's upload paths; `allowBuilds` (esbuild) read for the publish job's install |
| 33 | `.editorconfig` | first only | G-9 | re-checked in pass 2: fixed |
| 34 | Issues 01, 03, 04 | both | known | #53 (done on this branch, closed after the release), #55, #56: known |

## Findings, both ways

| Finding | Other review | Why |
| --- | --- | --- |
| First G-1, G-2 | — | moot: the skip and its scripts are gone; the blind pass checked that every job runs |
| First G-3 | blind pass met the area | fixed before the blind pass; it found the config as decided |
| First G-5 | blind 2G-1 path (b) | found by both; the blind pass also found path (c), which existed at `54cdada` (the first review missed it), and path (a), new in 3284aa4 |
| First G-6 | blind pass checked the method statements | fixed; the blind pass found the call counts right |
| First G-8 | blind pass checked Pages on re-runs | fixed; the blind pass found the tip step sound and the wording over-claiming (2G-3, new in 3284aa4) |
| First G-9 | not met blind | `.editorconfig` is outside 2G's brief; a blind spot only by scope |
| First G-10 | blind pass met it | the blind pass checked the 404s and the move to Trusted Publishing |
| First G-11 | partly met | `playwright.base.ts`'s comment read blind; the other two are 2T's files |
| Blind 2G-1 (c) | missed by the first review | the stale Version Packages pull request existed at `54cdada` (the guard of e856a80 returned `current=true` there too) |
| Blind 2G-1 (a) | new since `54cdada` | 3284aa4's release-commit check |
| Blind 2G-2 | missed by the first review | the guard's comparison with `HEAD` dates from e856a80; the first review considered re-runs of `CI`, not of Publish |
| Blind 2G-3 | new since `54cdada` | 3284aa4's tip rule made the older promise (4d125f1) untrue |
| Blind 2G-4 | new since `54cdada` | f3a058a added the round-trip line |
| Blind 2G-5 | new since `54cdada` | 0905892 and d850405 |
