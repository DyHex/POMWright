# Segment 2G: the first review's findings, claims and test gaps at `d850405`

Pass 2. Read: `defect-review-result/G-ci-and-tooling/` (brief, summary, the eleven finding files), `report.md`'s G lines
and ledger rows, `DECISIONS.md` #1, #3, #4, #8, #31, #32, #50, #51, #53, #72–#78, `PLAN-release-gates-and-audit.md`
(nothing in G is left "for the second review"), `PLAN-publish-environment-node-lines.md`. Re-runs are in
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/G/run1/<ID>/`.

The first review's scope G also held the tests and checks, now 2T's, and the build, now 2F's: G-4 and G-7 are listed
for completeness and left to those segments.

## Findings

| ID | First review | Decision | Outcome at `d850405` | What was run, and what it printed |
| --- | --- | --- | --- | --- |
| G-1 | `ci-changes.sh` sees a rename under its new path only | #32 (settled by #31) | **fixed differently** | The script and `ci-last-green.sh` are gone (`ls`: no such file), no job of `checks.yaml` has a `changes` condition (the only `if:` is `inputs.older-node-lines`), and PR #60's run on `d850405` ran all nine jobs (`run1/G-1/check.out`). The probe cannot run: its script under test no longer exists. |
| G-2 | On a pull request the skip judged the head, the jobs tested the merge commit | #31 | **fixed differently** | As G-1: every job runs on every run, so a pull request run always tests the merge commit it reports on (`run1/G-2/check.out`). |
| G-3 | Dependabot proposed deferred majors; PR #47 (action v2) green and breaking | #1 | **fixed** | PRs #47, #48, #49 closed unmerged (2026-10-27); `dependabot.yml`: every group takes minor and patch only; `typescript` and `@types/node` majors ignored at the root, `@types/node` in `test/`; the move to `changesets/action` v2.1.2 and `@changesets/cli` ^3.0.3 is done (`run1/G-3/check.out`). Dependabot reads its configuration from the default branch, so this applies once PR #60 is merged; nothing can run it before. |
| G-4 | `pnpm build` kept stale `dist/` files | #33 | not this segment's (2F, the build and packaging) | Seen in passing: `package.json`'s `build` has `--clean`; not re-run. |
| G-5 | A merged Version Packages commit is never published when a changeset lands before its CI ends | #4 | **fixed differently**, and **fixed incompletely** → **2G-1** | The first review's probe, copied and adapted (`run1/G-5/probe.sh`: the guard extracted with a YAML parser, since the original's `sed` range stops at the first `fi`; a parent commit for V, which the guard now reads; GitHub's `bash --noprofile --norc -eo pipefail`): CI(V)'s Publish run now fails, `::error::Version 3.0.2 of commit c32d72fe… was not published: … Revert c32d72fe… before merging the next Version Packages pull request.`, exit 1; CI(W)'s run opens the Version Packages pull request. That is decision #4's contract. Beyond its case: the Version Packages pull request merged after a changeset commit, before Publish refreshed it, skips the version with no failing run (no rule broken), and the check fails a release the newer run publishes when that commit has no changeset: 2G-1. |
| G-6 | *Performance* said every per-call measurement runs 20,000 calls | #50 | **fixed** | `performance.md` lines 25–26: "20,000 times (registration, which builds a fresh registry for each call, 2,000 times)" (`run1/G-6/check.out`); the script agrees. The fresh run #50 asked for is on the page (measured at `e571381`); 2G-4 is a new point on the same page. |
| G-7 | The API coverage check accepted any `@see` | #49 | not this segment's (2T, the checks) | Not re-run. |
| G-8 | A re-run of an older green `CI` run would redeploy the older site (suspected) | #53 | **fixed** | `pages.yaml`'s tip step, verbatim, in a checkout of the re-run's commit with a newer `origin/main` (`run1/G-8/rerun.sh`): "main has moved past 221e8769… to 9f8e6324…", `deploy=false`; a re-run of the tip's own run: `deploy=true`. The step reads the tip with `git ls-remote`, so a re-run of the Pages run itself is covered too. The guide's wording written with the fix overstates it: 2G-3. |
| G-9 | `.editorconfig` asked for tabs in YAML and Markdown | #34 | **fixed** | `.editorconfig` has `[*.{yml,yaml}]` and `[*.{md,mdx}]` with spaces, width 2 (`run1/G-9/check.out`). |
| G-10 | 3.0.0 and 3.0.1 carry no provenance attestation | #3, #72, #74 | **fixed differently**; the result is unproven until a release | The two versions still have none (the attestation endpoint answers 404 for both; history cannot change). The workflow now publishes by Trusted Publishing (`id-token: write`, no `NPM_TOKEN` or `NPM_CONFIG_PROVENANCE`, the `npm` environment), warns after publishing when no attestation appears, and the changeset `trusted-publishing.md` corrects the record (`run1/G-10/check.out`). pnpm 12.14.0 records provenance under trusted publishing by default (its CHANGELOG), and npm's docs say so for Trusted Publishing from GitHub Actions. Whether 3.0.2 gets one is known only after its release (`npm view pomwright@3.0.2 dist --json`). |
| G-11 | Three tooling comments described the repository as it was | #51 | **fixed** | `vitest.config.ts`, `scripts/check-api-coverage.mjs` and `playwright.base.ts` now describe the current tooling (`run1/G-11/check.out`). |

Outcome counts (this segment's nine): fixed 5 (G-3, G-6, G-8, G-9, G-11), fixed differently 4 (G-1, G-2, G-5, G-10),
of which one also fixed incompletely (G-5 → 2G-1); still present 0; not fixed 0; regressed 0 on its own case (2G-1's
path (a) is a false failure added by G-5's fix); cannot re-run 0 (G-1's and G-2's probes test a deleted script; the
contract they stood for was checked instead). Not this segment's: 2 (G-4, G-7).

## The first review's *what is sound* lines for G

| Claim | At `d850405` |
| --- | --- |
| `ci-changes.sh`, `ci-last-green.sh` sound on their scenarios | Moot: both deleted (#31). |
| `ci-playwright-version.sh`: `pin` empty, `latest` 1.64.1 with `skip=false`, unknown row exits 1 | Holds: re-run, the same output; also a pin equal to the latest gives `skip=true` (`G/pwversion/`). |
| `PLAYWRIGHT_VERSION=1.64.1` in a clone passes | Holds by CI's evidence: PR #60's "Harness (chromium, Playwright latest)" is green on `d850405`; not re-run locally. |
| `pack-test.sh` exit codes and switches | 2T's (`pack-*.sh` are the harness's); the CI switches as CI uses them hold (PR #60's harness, Node 20 and 22 and test-server jobs are green). |
| `test/` frozen install re-hard-links a re-extracted package | 2T/2F; not re-run. |
| The gate `build`: a failed needed job fails it, a skipped one passes | Holds by reading: `needs: checks`, `if: always()`, `test "$RESULT" = "success"` in both callers; with no `changes` job, no job is skipped but `harness-node` when its input is false, which neither caller does. |
| Branch protection requires `build` for non-admins | Holds (`G/api/branch-main.json`: `contexts: ["build"]`, app 15368, `non_admins`; no rulesets). |
| The `github-pages` environment allows only `main`, so a manual Pages run on another branch cannot deploy | Holds for its branch policy (`main` only). The environment allows administrators to bypass its rules (`can_admins_bypass: true`; the new `npm` environment has `false`); whether that reaches the branch policy was not settled (GitHub's docs speak of forcing deployments past "protection rules"). Noted, not a finding: no document promises more. |
| All 8 action pins match their tags | Holds: re-checked with `git ls-remote`; each is also the action's latest tag (`G/pins/`). |
| Dependabot leaves `@playwright/test` (and `pomwright` in `test/`) alone | Holds (`run1/G-3/check.out`). |
| Publish and Pages require success, `push`, `main` and this repository; forks and branches cannot reach them | Holds (`publish.yaml` lines 27–31, `pages.yaml` lines 26–31). |
| actionlint clean; shellcheck clean but one SC2016 info | Holds: actionlint 1.7.12 exit 0 on the five workflows; ShellCheck 0.11.0 on the CI shell scripts, the same single info in `pack-version.sh`. |
| The site build fails on a missing page or anchor | 2H's; not re-run. |
| The doc checks on the real docs | 2T's. |
| Configs (vitest discovery, biome scope, Playwright configs) | 2T's; the reporters' output folders match CI's upload paths (read). |
| `pnpm bench` agrees with *Performance* within noise | Holds: re-run at `d850405` (31 s, exit 0): within about 10–25%, nearly all lower; every ratio the page states holds. Its round-trip line does not reproduce: 2G-4. |

## The first review's test gaps for G

| Gap | At `d850405` |
| --- | --- |
| 1. Nothing checks that a release reached npm with provenance; v1.9.0 ignored the publish script's exit code | Closed in part: action v2 fails the run when publishing fails (`src/index.ts` lines 106–116 at the pinned commit); a step warns when no attestation appears within ten minutes (warns, not fails, by decision #3). |
| 2. `publish.yaml` and `pages.yaml` never run before a merge; CI ran no actionlint | Closed in part: actionlint (with ShellCheck) runs in `lint` on every run; the two workflows still run only on `main` (accepted, #8). Their decision logic is simulated in this segment (`G/guard/`, `G/pages/`). |
| 3. `ci-changes.sh` and `ci-last-green.sh` untested | Moot (deleted). |
| 4–6. The step-location reporter, the snippet check's fences, the API coverage check's `@see` targets | 2T's. |
| 7. Local builds keep stale `dist/` | 2F's (G-4; `--clean` in place). |

## Decisions and plans in this area, checked

- #74 (the `npm` environment): created 2026-10-28, one branch policy `main`, no reviewers, `can_admins_bypass: false`,
  as plan 42's guide asks (`G/api/environments.json`, `env-npm-policies.json`). That the Trusted Publisher names
  `publish.yaml` and the environment `npm` is npmjs.com configuration: not visible without the maintainer's login.
- #75 (Node lines): the matrix is 20 and 22; PR #60's run shows both jobs green. `pr.yaml`'s header still names Node 20
  only (2G-5); plan 42's execution note says the callers' comments name 20 and 22, which holds for line 17, not lines
  3–4.
- #78 (the test-server job): in `checks.yaml` and the gate; missing from *Tests and checks* (2G-5).
- #72 (no approval on npmjs.com): `publish.yaml`'s comments and warning, `docs/releases.md` and *Tests and checks* say
  so; npm's docs confirm the 2-day expiry and that `npm publish` is an option of a publisher.
