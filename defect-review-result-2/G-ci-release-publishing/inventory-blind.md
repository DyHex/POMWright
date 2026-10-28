# Segment 2G: inventory (blind pass)

Written in pass 1 at `d850405`, before reading anything of the first review except the lines a failed grep filter
printed at 18:0x (log.md, *BLIND-PASS BREACH*): lines marked *not blind* below were concluded after that. Each line: the
item, the files that implement it, where it is documented, and how deeply pass 1 probed it. `G/` is
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/G/`.

## Workflows

1. **`checks.yaml`, reusable, every job on every run** — `.github/workflows/checks.yaml`; `.github/AGENTS.md` *The
   workflows*, `tests-and-checks.md` *CI*. Read in full; actionlint 1.7.12 (pinned version and checksum) exit 0 on all
   five workflows; PR #60's run on `d850405` lists the nine jobs, all green (`G/api/jobs-40687553108.json`). Sound.
2. **lint job: biome, actionlint, ShellCheck, each pinned by version and SHA-256** — `checks.yaml` lines 31–70. Both
   archives downloaded and checked against the step's SHA-256 (`G/tools/`); actionlint's own checksums file agrees.
   1.7.12 and 0.11.0 are the latest releases (git ls-remote). Sound.
3. **package job: unit tests, one build, one tarball as an artifact** — `checks.yaml` lines 72–93, `pack-build.sh`. Read.
4. **harness job: the caller's browsers × pin and latest 1.x, on Node 24, testing the tarball** — `checks.yaml` lines
   95–147, `pack-test.sh`, `scripts/ci-playwright-version.sh`. Resolver run for `pin`, `latest` (1.64.1), a pin equal to
   the latest (`skip=true`) and an unknown row (exit 1) (`G/pwversion/`); `npm view` sorts versions semver-ascending
   (npm 11 `lib/commands/view.js` lines 48, 167), and no Playwright 1.x was ever published out of order (`G/pw-*.json`).
   Report upload paths match the html reporter's folders (`playwright.base.ts`, `playwright.test-server.config.ts`).
   Sound.
5. **harness-node job: chromium at the pin on Node 20 and 22** — `checks.yaml` lines 149–186; `.github/AGENTS.md`,
   `checks.yaml`'s header, `tests-and-checks.md`. Playwright 1.64.0's and 1.64.1's `engines` are `>=20`, as the guide says.
   `pr.yaml`'s header says Node 20 only (2G-5). Matrix against Node's schedule: *not blind* (see the breach); the
   guide's rule keeps the floor's line until `engines` moves; Node 26 is issue #55 (known).
6. **test-server job, once per run** — `checks.yaml` lines 188–220, `test-server-check.sh`; `.github/AGENTS.md`,
   `test/AGENTS.md`. Read; missing from `tests-and-checks.md` (2G-5). The check itself is 2T's.
7. **consumer job** — `checks.yaml` lines 222–247, `scripts/consumer-check.sh`. Read only as a CI job (the script is
   2F's). *Not probed.*
8. **site job; pages.yaml builds "the same build"** — `checks.yaml` lines 249–293; `website/astro.config.mjs` imports only
   from `website/`, so the Pages build (website install and build only) is the same build without the root and `test/`
   installs. Sound.
9. **pr.yaml: every pull request, draft or not, chromium only; gate `build`** — read; branch protection read through the
   public branch API: required check `build` from GitHub Actions (app 15368), enforcement `non_admins`, no rulesets
   (`G/api/branch-main.json`, `rules-main.json`). Sound. A pull request run tests GitHub's merge commit at the time it
   started (a re-run keeps it): standard, not claimed otherwise.
10. **main.yaml: pushes to main, one run at a time, a waiting run gives way** — read; GitHub's concurrency rule
    (`G/ghdocs/concurrency.html`): one pending run per group, replaced by a newer one; FIFO by the time a run started
    waiting, "ordering is not guaranteed" (2G-3); a cancelled waiting run never starts Publish (2G-1).
11. **Gate job `build` in both callers** — `needs: checks`, `if: always()`, fails unless `success`. Read. Sound.
12. **Permissions per workflow and job** — `contents: read` in checks/pr/main/pages build; Publish `contents: write`,
    `pull-requests: write`, `id-token: write` for its one job; Pages deploy `pages: write`, `id-token: write`. Read.
    No contract beyond what is there; not a finding.
13. **Third-party actions pinned to commits, version in a comment** — eight actions; each SHA equals its tag (`git
    ls-remote`, `G/pins/result.txt`), each tag is the action's latest. No unpinned `uses:` but the two local calls.
    Sound.
14. **Dependabot** — `.github/dependabot.yml`; `.github/AGENTS.md`, `tests-and-checks.md`. Read: monthly; minor and
    patch grouped per ecosystem and directory; majors separate; `@playwright/test` ignored at the root and in `test/`
    (`website/` has none); majors of `typescript` (root; `test/` and `website/` have none) and `@types/node` (root,
    `test/`) held; `pomwright` ignored in `test/`. Past Dependabot pull requests (#47–#49) show it handles pnpm 12's
    lockfile v9 and leaves `packageManager` alone (`G/api/pr49-files.json`). Sound. The pnpm version (`12.14.0` in seven
    `action-setup` steps and three `packageManager` fields) moves by hand, like actionlint; not stated, not a defect.
15. **CODEOWNERS** — `* @dyhex @shtian @jostein-skaar @traatl @hannathevik @mira-pls`; every user exists (public
    users API). Whether each has write access, and whether reviews from code owners are required, is not public.
    *Not verifiable.* No guide line mentions it.
16. **`scripts/ci-playwright-version.sh`** — see 4. ShellCheck 0.11.0 clean on it and the other CI shell scripts
    (`pack-version.sh` has an SC2016 info, a deliberate single-quoted `node -e`).

## Release and publishing

17. **Publish's trigger and job condition** — `publish.yaml` lines 11–31: `workflow_run` of `CI` on `main`, success,
    event `push`, head branch `main`, same repository. A fork's pull request runs `PR`, which Publish does not listen to;
    a `workflow_run` always uses the default branch's workflow file. Sound.
18. **The tested-commit guard** — `publish.yaml` lines 37–67; `.github/AGENTS.md`, `tests-and-checks.md`,
    `docs/releases.md`. Simulated on every path (`G/guard/sim.sh`, the step verbatim, the real registry read-only,
    changesets' own libraries for the action's decision): normal paths sound; **2G-1** (a version skipped with no
    failing run after a Version Packages pull request merged before Publish refreshed it, or when the release commit's
    CI run was cancelled; a false failure when the newer commit has no changeset).
19. **A re-run of a Publish run** — GitHub keeps the original `GITHUB_SHA` (`G/ghdocs/rerun.html`); simulated with a
    bare origin (`G/guard/rerun.sh`): **2G-2**.
20. **changesets/action v2.1.2 and `@changesets/cli` 3.0.3** — the action's source at the pinned commit
    (`G/changesets-action/`): no changesets → publish script → `published`/`published-packages` from the CLI's
    `CHANGESETS_OUTPUT` (the CLI 3.0.3 writes it: `dist/index.mjs` line 41); changesets → version branch reset to
    `context.sha`, force-pushed. The CLI runs `pnpm publish --json --access --tag --no-git-checks`
    (`getPublishPlan.mjs` line 344) and publishes a local version npm lacks (lines 604–658). The action refuses a v2 CLI
    (`src/utils.ts` line 189). Read; used in 2G-1 and 2G-2.
21. **Trusted Publishing, provenance, the `npm` environment** — environment `npm`: one branch policy, `main`, no
    reviewers, created 2026-10-28 (`G/api/environments.json`, `env-npm-policies.json`); pnpm 12.14.0 publishes with OIDC
    and provenance by default under trusted publishing (its CHANGELOG, `--no-provenance` turns it off); npm's docs
    (`G/npmdocs/trusted-publishers.html`): provenance automatic, the two-day expiry of a new publisher as
    `docs/releases.md` says, `npm stage publish` always allowed and `npm publish` optional. That the Trusted Publisher
    names `publish.yaml` and the environment, and allows `npm publish`, is npmjs.com configuration: *not verifiable*
    without the maintainer's login. 3.0.0 and 3.0.1 have no attestation (`npm view`, the endpoint 404), as the
    `trusted-publishing` changeset says.
22. **The provenance check after publishing** — `publish.yaml` lines 91–112; the endpoint returns 200 for packages with
    provenance (`@changesets/cli@3.0.3`, `vitest@5.0.5`, `@biomejs/biome@2.5.15`, `tsup@9.0.0`) and 404 for
    `pomwright@3.0.1`. Sound.
23. **The published package is rebuilt, not the CI tarball** — `pnpm run release`; issue #56 (known).
24. **Version Packages pull requests get a PR run** — #52's ran as attempt 2, re-run by the maintainer
    (`G/api/runs-pr52.json`): the bot's pull request does not start one by itself. Not claimed otherwise; noted.

## Pages

25. **pages.yaml: which commit it deploys** — `pages.yaml`; `.github/AGENTS.md`, `documentation.md`. The tip step
    simulated (`G/pages/sim.sh`): it skips a moved-past commit, also on a re-run (it reads the remote); **2G-3** (a green
    commit main moved past is never deployed when the newer commit's CI fails; ordering not guaranteed; a manual run
    deploys any tip). `github-pages` environment: one branch policy, `main` (`G/api/env-github-pages-policies.json`), so a
    manual run on another branch builds but cannot deploy.

## The benchmark

26. **`pnpm bench`** — `scripts/benchmark.mjs`, `test/playwright.bench.config.ts`, `test/benchmarks/`;
    `performance.md`, `test/AGENTS.md`. Read; run on the same CPU model as the page's machine line (exit 0, 31 s,
    `G/bench/run1.out`): the tables reproduce within about 10–25% (nearly all lower), every ratio the conclusion states
    holds; the method on the page matches the code (call counts, warm-up, medians, heap after a collection, one worker,
    five repeats). **2G-4** (the round-trip line comes from no script and is not supported at its low end).

## Docs in scope

27. **`.github/AGENTS.md`** — every sentence of *The workflows* and *Publish and Pages* checked against the workflows:
    2G-1, 2G-2, 2G-3; the rest holds. *Packaging probes* is 2F's.
28. **`docs/releases.md` *Carrying out a release*** — 2G-1 (the rule does not cover a Version Packages pull request merged
    before it caught up); the Trusted Publisher paragraph agrees with npm's docs (item 21).
29. **`tests-and-checks.md` *CI*** — 2G-1, 2G-2, 2G-5; the rejected design (checking out the tested commit) noted: the
    action resets its version branch to `GITHUB_SHA` whatever is checked out (`src/github.ts` lines 239–242), so the
    reason given ("cannot be tried without a release") can now be settled from the source.
30. **`documentation.md` *Building and publishing*** — 2G-3; the local scripts (`docs:dev`, `docs:build`,
    `docs:preview`, `docs:diagrams`) match `package.json`.

## The change set since `v3.0.1`

31. Commits in scope (13): e856a80, f866325, 3284aa4, 8beb9d0, 612a62a, 2607cf7, 54cf090, b47a255, 01d1096, 6d1de0e,
    0905892, 6d8642f, d850405; read: e856a80, 3284aa4, 8beb9d0, 01d1096, 6d8642f, d850405 (diffs of the workflows),
    0905892 (stat). New since 54cdada and wrong: 3284aa4 (2G-1's release-commit clause; 2G-3's tip rule against the
    guide's promise), 0905892 and d850405 (2G-5), f3a058a (2G-4). Older and unchanged: the guard's comparison with
    `HEAD` (e856a80, 2G-2).

## Local runs against CI

32. A contributor's `pnpm pack-test` runs every browser at the pin on their own Node, then the test-server check; CI
    adds the latest 1.x on every browser (on `main`), Node 20 and 22 on chromium, the consumer installs from npm, the
    site build and diagrams; it runs the unit tests on Node 24 only (vitest 5's `engines`: `^22.12.0 || ^24.0.0 ||
    >=26.0.0`). Neither runs `pnpm bench` (decided), firefox or webkit on Node 20/22, or Node 26 (issue #55).
