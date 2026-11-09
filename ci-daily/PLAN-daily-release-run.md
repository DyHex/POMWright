# Plan: a daily run of the latest release

Status: **executed**, steps 0 to 5, 2026-11-09; the folder's audit and deletion before the merge are left.
On the branch `test/daily-workflow`, beside [PLAN-node-26.md](PLAN-node-26.md). CI only: no consumer-facing change, no
changeset, no release. See *Execution notes* at the end.

## Intent

A workflow of its own, `Daily`, that tests every day the pomwright release users install today (`pomwright@latest` on
npm, the published tarball itself) against what moves beneath it without a change in this repository: a new Playwright
1.x, Playwright's next minor (its `next` alphas), the newest TypeScript, Node's patch releases, and the runner image with
its system packages. It runs the tests, harness and scripts of the commit that release was published from. It publishes,
deploys and gates nothing. The Playwright pin, the peer floor, is not part of it: `CI` tested the release there before
it was published, and the pin does not move after.

## The contract

- **Triggers**: `schedule`, daily at 06:17 UTC; `workflow_dispatch`, whose *Run workflow* button on `Daily`'s page in
  the Actions tab runs what the schedule runs, with one optional input, `playwright` (D13); and, on this pull request
  only, `pull_request` when it changes `.github/workflows/checks.yaml`, `.github/workflows/daily.yaml` or
  `scripts/ci-daily-targets.sh`, removed by the last commit before the merge (D8).
- **`resolve`** (this repository's code, `scripts/ci-daily-targets.sh`): the version npm's `latest` dist-tag names; the
  commit it was published from, read from its provenance attestation; the second Playwright version: the one the
  `playwright` input names (a version or a dist-tag such as `beta`), or else Playwright's `next` when its release is
  newer than Playwright's `latest`, or else none. It prints the release's tag and Playwright's `next-pending` beside
  them, for the log.
- **The release job** (named `pomwright <version>`, so its checks read `pomwright 3.0.2 / Harness (webkit, Playwright
  1.66.0-alpha-1793916328000)` and never collide with `PR`'s `checks / …`) calls `checks.yaml` with three new inputs,
  `release`, `release-commit` and `playwright-extra`, on chromium, firefox and webkit, without `older-node-lines`.
- **`checks.yaml` with `release` set** (with the inputs empty, as `pr.yaml` and `main.yaml` call it, every job is as today):

  | Job | With `release` set |
  | --- | --- |
  | `lint` | skipped |
  | `package` | `npm pack pomwright@<version>`: downloads the published tarball, which npm checks against the registry's `dist.integrity`; no checkout, unit tests or build; the same artifact name |
  | `harness` | checks out the release's commit; rows `latest` (the newest 1.x in the release's peer range, run even when it equals the pin) and, when `playwright-extra` is set, that version, the row named after it; no `pin` row; pnpm's version from the release's `packageManager` |
  | `harness-node` | not run: it runs at the pin, and `Daily` does not pass `older-node-lines` |
  | `test-server` | skipped |
  | `consumer` | the release's commit and its `scripts/consumer-check.sh`, with the downloaded tarball |
  | `site` | skipped |

- A failure fails the run, a failing `next` row included. GitHub mails a failed scheduled run to whoever created the
  workflow, or last changed its cron line.

## Verified current behavior

1. **`CI` already runs the whole suite.** [main.yaml:22-27](../.github/workflows/main.yaml#L22-L27) calls `checks.yaml` on
   chromium, firefox and webkit with `older-node-lines`; the harness rows are `pin` and `latest`
   ([checks.yaml:83-87](../.github/workflows/checks.yaml#L83-L87)). `pin` is `test/package.json`'s pin, `latest` the
   newest release in `package.json`'s peer range, read when the job starts, skipped when equal to the pin
   ([ci-playwright-version.sh:14-28](../scripts/ci-playwright-version.sh#L14-L28)). Probe P5: at `v3.0.2` the rows
   resolve to the pin (1.64.0) and 1.65.0.
2. **A `schedule` in `main.yaml` would interfere with releases.** Its concurrency group,
   `${{ github.workflow }}-${{ github.ref }}` ([main.yaml:18-20](../.github/workflows/main.yaml#L18-L20)), is the same
   for a scheduled run, and GitHub cancels a pending run in a group when another is queued ("By default, any existing
   `pending` job or workflow in the same concurrency group will be canceled", *Control the concurrency of workflows and
   jobs*): a scheduled run could cancel a waiting push run, whose commit Publish and Pages then never act on. Publish
   and Pages listen to the workflow named `CI` ([publish.yaml:12-16](../.github/workflows/publish.yaml#L12-L16),
   [pages.yaml:10-15](../.github/workflows/pages.yaml#L10-L15)); their guards skip a run whose event is not `push`
   ([publish.yaml:28-32](../.github/workflows/publish.yaml#L28-L32), [pages.yaml:28-33](../.github/workflows/pages.yaml#L28-L33)),
   but each run still joins its group ([publish.yaml:18](../.github/workflows/publish.yaml#L18),
   [pages.yaml:20-22](../.github/workflows/pages.yaml#L20-L22)) before that condition is read. A workflow with another
   name is none of these.
3. **The harness takes any tarball and any Playwright.** [pack-test.sh:25-37](../pack-test.sh#L25-L37): with
   `POMWRIGHT_TARBALL` it extracts that tarball instead of building; with `PLAYWRIGHT_VERSION` it swaps
   `@playwright/test` at the root and in `test/`. Both exist at `v3.0.2` (it is the commit those lines are read from).
4. **The consumer check takes any tarball**, `consumer-check.sh [--node-floor] <tarball>`, and compiles with TypeScript
   `5.0 5.1 5 6 latest` ([consumer-check.sh:30](../scripts/consumer-check.sh#L30)), installed when it runs, beside the
   root's `@playwright/test` pin ([consumer-check.sh:34-36](../scripts/consumer-check.sh#L34-L36)). npm's `latest`
   TypeScript is 7.0.2, published 2026-07-08, so every `CI` run since then has compiled the consumer with TypeScript 7,
   the green run that published 3.0.2 among them. The repository's own TypeScript stays on 6 for the compiler API
   ([dependabot.yml:5-7](../.github/dependabot.yml#L5-L7), issue #54); the consumer check needs none.
5. **Where a release's source is recorded.** Changesets tags each release `v<version>` (`v3.0.2` is `8214027`), but the
   action pushes the tag only after the publish, so a published release can lack one; *Internal → Tests and checks*
   rejects the tags as the record of what is published for that reason
   ([tests-and-checks.md:149-150](../website/src/content/docs/internal/tests-and-checks.md)). npm's provenance
   attestation of 3.0.2 (SLSA v1, from `publish.yaml`, event `workflow_run`) names
   `git+https://github.com/DyHex/POMWright@refs/heads/main` at `gitCommit` `8214027f3efaa7366cd33b8070dc231cddc33038`,
   the tagged commit (probe P4). npm's metadata has no `gitHead` for 3.0.2.
6. **pnpm's version must match the checked-out `packageManager`.** `checks.yaml` sets `version: 12.14.0` on
   `pnpm/action-setup` ([checks.yaml:101-103](../.github/workflows/checks.yaml#L101-L103),
   [checks.yaml:145-147](../.github/workflows/checks.yaml#L145-L147)). At the pinned commit (`ea17c68`, v6.1.0),
   `src/install-pnpm/run.ts` throws "Multiple versions of pnpm specified" when a non-empty `version` differs from the
   `packageManager` of the checked-out `package.json`, and reads `packageManager` when `version` is empty
   (`getInput('version')`, `if (version)`). Today both are `pnpm@12.14.0`; once `main` moves pnpm, a release's tree
   would not match.
7. **GitHub's schedule** (*Events that trigger workflows*, `schedule`): runs only on the default branch, on its latest
   commit, and only once the workflow file is there; "can be delayed during periods of high loads … High load times
   include the start of every hour. If the load is sufficiently high enough, some queued jobs may be dropped"; in a
   public repository (this one is), disabled after 60 days without repository activity. `workflow_dispatch` also needs
   the file on the default branch, so before the merge only a `pull_request` trigger runs the workflow. Notifications of
   scheduled runs go "to the user who initially created the workflow", or to whoever later changes the cron syntax
   (*Notifications for workflow runs*). For manual runs (*Manually running a workflow*, and the `workflow_dispatch`
   section of *Events that trigger workflows*, read 2026-11-09): "the "Run workflow" button will be present if the
   workflow file exists on the default branch", "above the list of workflow runs" on the workflow's page under
   **Actions**; "Select the **Branch** dropdown menu and click a branch to run the workflow on"; "Write access to the
   repository is required"; the trigger is shown bare (`on: workflow_dispatch`), inputs as optional, at most 25. That
   a run from another branch uses that branch's workflow file is read from the event's `GITHUB_SHA` ("Last commit on
   the `GITHUB_REF` branch or tag"), not stated outright; the run after the merge shows it.
8. **Playwright's prereleases** (npm, 2026-11-09): `latest` 1.65.0 (2026-11-05; 1.64.0 was 2026-10-07); `next`
   `1.66.0-alpha-1793916328000` (2026-11-05); `next-pending` `1.66.0-alpha-2026-11-09`; `beta`
   `1.65.0-beta-1793921730000`. Playwright's `publish_release.yml` publishes an alpha of its `main` every day (cron
   `10 5 * * *`; on npm 05:13 to 05:29 UTC from 2026-10-08 to 2026-11-09) and a beta on every push to a `release-*`
   branch; `utils/publish_all_packages.sh` publishes under `<tag>-pending`, and `promote_release.yml` moves `<tag>` once
   npm has made every package live, "so next, beta and latest never point at a package whose dependency is still
   missing" (`playwright-core@1.65.0` took 110 minutes). `promote_release.yml` first ran on 2026-11-07 and failed on
   the 7th, 8th and 9th, which is why `next` is still the 5 November alpha. Betas: 1.65.0's from 2026-11-03 22:51, two
   days before its release; 1.64.1's 15 hours before; after a release they go on under the released number, older than
   `latest`.
9. **The runner image.** Every job runs on `ubuntu-latest`, which `actions/runner-images`' README maps to Ubuntu 24.04
   today (2026-11-09), and which is moving to Ubuntu 26.04: "rolled out over a period of several weeks beginning
   October 19, 2026 … complete the migration by November 19, 2026" (actions/runner-images#14748). Until then a job can
   land on either. `CI`'s last run on `main` (8214027, 2026-10-31) passed every job, WebKit and Firefox at the pin
   included; which image each job had is in the job logs, which the API does not give without a token. Playwright 1.64,
   1.65 and the alpha all download `webkit-ubuntu-26.04.zip` on 26.04 (and `firefox-ubuntu-24.04.zip`, the same
   Firefox as on 24.04), and on a 26.04 machine 1.64's WebKit passes (P1). Daily runs will be on 26.04 from
   19 November at the latest.

## Probes

On this machine (32 threads, Ubuntu 26.04), Node 24.22.0 and pnpm 12.14.0 as in CI, `CI=true`, in a worktree of
`v3.0.2` (the release's tree, as `Daily` checks it out), with the tarball downloaded from npm, except P1's WebKit rerun
and P6, which ran in the working tree on Node 26.13.0.

- **P0, the tarball.** `npm pack pomwright@3.0.2` downloaded `pomwright-3.0.2.tgz`. Its sha512 equals npm's
  `dist.integrity` (`sha512-LbCqbSzJ…6nrw==`) and the attestation's subject digest (`2db0aa6d…`). A local pack of the
  same commit (`pack-build.sh`) holds byte-identical files (`diff -r`, 8 files); this comparison is not part of the
  design, which never builds.
- **P1, the harness at the pin.** `POMWRIGHT_TARBALL=<npm tarball> pack-test.sh` on all three projects: chromium and
  firefox passed in full; all 496 failures were webkit, every one `browserType.launch` failing with
  `MiniBrowser: error while loading shared libraries: libxml2.so.2`. The cause was this machine, not Playwright 1.64:
  its `~/.cache/ms-playwright/webkit-2370` was downloaded on 2026-10-13, while the machine ran Ubuntu 24.04, and the
  machine was upgraded to 26.04 on 2026-11-06 (dpkg log); Playwright does not download a browser again whose folder is
  complete, so the 24.04 build stayed, linked against 24.04's `libxml2.so.2` and `libjxl.so.0.8`. Playwright 1.64
  has a WebKit build for 26.04 (`webkit-ubuntu-26.04.zip` in `playwright-core@1.64.0`'s download paths, as in 1.65.0
  and the alpha). With `webkit-2370` and `firefox-1555` moved aside and downloaded again (now linked against
  `libxml2.so.16`), `pnpm pack-test --project=webkit` at the pin passed: 630 passed, 1 skipped (2026-11-09). That run
  built the pack from the working tree (the same commit as 3.0.2, `8214027`), not the npm tarball, whose files P0
  showed identical.
- **P2, the harness at Playwright `next`.** The same, with `PLAYWRIGHT_VERSION=1.66.0-alpha-1793916328000`: pnpm
  swapped it in at the root and in `test/` without a peer warning (no `peer` line in the log), although a prerelease is
  outside the peer range `>=1.64.0 <2.0.0`; `playwright install` downloaded its browsers, WebKit as
  `webkit-ubuntu-26.04.zip` (v2389); all nine type checks passed, then 1892 passed and 1 skipped on chromium, firefox
  and webkit (the line reporter does not name the skip; the spec has one WebKit skip,
  [sessionStorage.spec.ts:1762](../test/tests/testApp/sessionStorage.spec.ts#L1762)), and the step-location run's 12
  passed. So the `next` row works today, and 3.0.2 passes on Playwright 1.66's alpha.
- **P3, the consumer check.** `consumer-check.sh <npm tarball>` on Node 24: every check passed, TypeScript 6.0.3
  under each resolution, 5.0.4, 5.1.6, 5.9.3, 6.0.3 and 7.0.2 in both decorator modes, attw 0.18.5, the runner in a
  CommonJS and an ESM project; `--node-floor` on Node 20.20.2: "import and require share one copy".
- **P4, the resolution** (a scratch script, the draft of `scripts/ci-daily-targets.sh`): `release=3.0.2
  commit=8214027f… tag=8214027f…`; `latest=1.65.0 next=1.66.0-alpha-1793916328000
  next-pending=1.66.0-alpha-2026-11-09`, so a `next` row. The skip rule (run `next` only when its release, the part
  before `-`, sorts above `latest` with `sort -V`): 1.66.0-alpha vs 1.65.0 runs; vs 1.66.0 and 1.66.1 skips; 1.65.0-alpha
  vs 1.65.0 skips; 2.0.0-alpha vs 1.70.2 runs.
- **P5, the rows at the tag.** `ci-playwright-version.sh pin` gives no version (the pin as committed); `latest` gives
  1.65.0.
- **P6, Node 26 at the pin** (for the Node question, not for `Daily`): `pnpm pack-test` per project on Node 26.13.0
  (LTS since 2026-10-28), at Playwright 1.64.0: chromium 631 passed, firefox 631 passed, webkit 630 passed and 1
  skipped; `consumer-check.sh` passed every check, TypeScript 7.0.2 included, and `--node-floor` on Node 26 said
  "import and require share one copy". Not run on 26: the unit tests, the site's build, the diagrams.

## Options and recommendations

- **D1, where the trigger lives.** Recommended: a workflow of its own, `Daily`, calling `checks.yaml`. Rejected: a
  `schedule` in `main.yaml`, for item 2 above.
- **D2, what is tested.** The latest release on npm, its published tarball, downloaded (your decision). Rejected:
  `main`'s tip, which is not what users install.
- **D3, which tree runs it.** Recommended: the commit in the release's provenance attestation, failing with a message
  when there is none, and when its repository is not this one. Rejected: the tag `v<version>` (item 5: it can be
  missing after a publish, and the CI page already rejects tags as the record); `main`'s tests against the release (a
  changeset not yet released brings tests the release fails).
- **D4, which jobs** (revised 2026-11-09: no pin). `harness` at `latest` and the second version (D5, D13), and
  `consumer` (the newest TypeScript and attw show only there). Not run: the `pin` row and `harness-node`, which runs at
  the pin: `CI` tested the release at the pin before it was published, and the pin does not move after; `lint`, the
  unit tests and build, `test-server`, `site`: a fixed commit with frozen lockfiles gives them nothing new to test (the
  Node patch they would see, the harness jobs see).
- **D5, which Playwright prerelease.** `next`, Playwright's own pointer to an alpha whose packages are all live: an
  alpha of Playwright's `main` every night, the next minor in progress, ahead of `latest` nearly every day. Rejected:
  `next-pending` (may point at a package npm has not made live yet); `beta` (built from a release branch, ahead of
  `latest` only one or two days before a minor and hours before a patch, older than `latest` the rest of the time; its
  fixes are cherry-picked from Playwright's `main`, so the alphas have them first). A beta or `next-pending` can still be
  run by hand (D13).
- **D6, a failing `next` row.** Recommended: it fails the run, so the mail is the early warning; the job's name says
  the version it ran (`Playwright 1.66.0-alpha-…`). Rejected: `continue-on-error`, which keeps the run green and the
  warning unseen.
- **D7, the time.** Recommended: 06:17 UTC: an hour after Playwright's nightly alpha (item 8), off the hour (item 7).
- **D8, pull requests.** `pull_request` with `paths` on `checks.yaml`, `daily.yaml` and the resolver, on this pull
  request only: the only way to run `Daily` before its merge (item 7). The last commit before the merge removes it, once
  `Daily` is green on the pull request. Afterwards, a change to how `checks.yaml` calls the release's scripts (*Risks*)
  is checked by running `Daily` on its branch from the *Run workflow* button, which `.github/AGENTS.md` says; otherwise
  the next morning's run shows it. Rejected: keeping the trigger, which would run `Daily` on every pull request that
  touches `checks.yaml`, Dependabot's monthly action updates among them, where a broken alpha would turn it red for
  reasons the change has nothing to do with.
- **D9, the resolver.** `scripts/ci-daily-targets.sh`: what `checks.yaml` needs before its jobs start, looked up each
  morning: the release (`npm view pomwright@latest version`), its commit (the provenance attestation, D3), and the
  second Playwright version (D5, D13). It runs locally as it is (`bash scripts/ci-daily-targets.sh` prints what the
  next run tests), writes its outputs to `$GITHUB_OUTPUT` when set, and is ShellChecked as every tracked shell script
  is (D15), as `ci-playwright-version.sh` does the same for a row today. Rejected: a `run:` block in `daily.yaml` (about forty
  lines that decode the attestation with Node and stop with a message; a script can be run and read on its own).
- **D10, how `checks.yaml` learns it.** The three inputs, defaulting to empty: with them empty, as `pr.yaml` and
  `main.yaml` call it, every job, name and step is as today (the pull request's `PR` run shows it). Rejected: copying
  the harness and consumer jobs into `daily.yaml`, about 120 lines that would drift from `checks.yaml`.
- **D11, pnpm's version in release mode.** Empty, so `pnpm/action-setup` reads the release's `packageManager` (item
  6), in `harness`, the one job that installs with pnpm in release mode. `checks.yaml` comes from `main` and
  `package.json` from the release: the day `main` moves pnpm, an explicit version would differ from the release's
  `packageManager` and fail every harness job until the next release. `PR` and `CI` keep the explicit version.
- **D12, the run itself.** No `concurrency` group (nothing deploys; two runs side by side harm nothing); no job named
  `build`, the check `main: checks` requires; no README badge (a red badge for a Playwright alpha would read as a
  broken release).
- **D13, manual runs.** `workflow_dispatch`, so the *Run workflow* button (item 7) runs what the schedule runs, on
  demand: after a Playwright release, after a fix to `Daily`, or to re-check a red morning. A manual run beside a
  scheduled one is harmless (D12). One optional input, `playwright`: a version or a dist-tag (`beta`, `next-pending`,
  an alpha, a 1.x patch) for the second harness row; empty means D5's `next`. The resolver reads it from `env:`, never
  from `${{ }}` inside a `run:` (so it cannot inject commands), resolves it with `npm view` (the newest version when it
  names several, as `ci-playwright-version.sh` does), fails when npm has none, and runs it without D5's skip rule.
  Left for later: `release` (only 3.0.2 works: 3.0.0 and 3.0.1 have no provenance attestation, npm answers 404, and
  their trees have no `consumer-check.sh`; with 3.0.2 also `latest`, it could only pick what the default picks);
  Node (fixed in `checks.yaml`, so it needs an input there); TypeScript (fixed in the release's own
  `scripts/consumer-check.sh` ([line 30](../scripts/consumer-check.sh#L30)), so it needs a switch there, which `Daily`
  sees only from the release after the one that adds it).
- **D14, the newest Node patch.** `Daily` runs on `checks.yaml`'s default Node line, `24.x` today and `26.x`
  once the Node 26 plan ([PLAN-node-26.md](PLAN-node-26.md), issue #55) lands. `actions/setup-node` (at the pinned
  `949feb2`, v7.1.0) "will first check the local cache for a semver match" and downloads only on a miss, unless
  `check-latest: true`, with which it "first checks if the cached version is the latest one" (its README and
  `docs/advanced-usage.md`). The runner images of 2026-11-01 cache Node 22.23.4 and 24.22.2, the newest of each
  today, and no 26, so `26.x` is downloaded at its newest (26.13.0) for now; once an image caches a 26, a new patch
  reaches `Daily` only with that image. Recommended: `check-latest: ${{ inputs.release != '' }}` on every setup-node
  step that runs in release mode (`package`'s, `harness`'s, and both of `consumer`'s, the default line and Node 20),
  so `Daily` always runs the newest patch, which the intent promises, and `PR` and `CI` keep the cache.
- **D15, ShellCheck over every shell script.** `pnpm lint:workflows` and CI's `lint` job run actionlint,
  which ShellChecks the workflows' `run:` blocks; a script a block calls (`bash scripts/consumer-check.sh`) is one line
  to it. So [lint-workflows.sh:47](../scripts/lint-workflows.sh#L47) runs ShellCheck over scripts itself, but only
  over `release-check.sh`, its test and itself. Not checked: `pack-build.sh`, `pack-extract.sh`, `pack-test.sh`,
  `test-server-check.sh`, `scripts/ci-playwright-version.sh`, `scripts/consumer-check.sh` (all run by workflows) and
  `scripts/pack-version.sh` (`pnpm pack:version`). The guide already says more: "that ShellCheck over the scripts the
  workflows run instead" ([.github/AGENTS.md](../.github/AGENTS.md#the-workflows)), and *Tests and checks*: "shellcheck
  over their scripts and the scripts they run instead". The pinned ShellCheck 0.11.0 over them today: none in the six
  the workflows run; one in `pack-version.sh:35`, SC2016 ("Expressions don't expand in single quotes"), a false
  positive: the single-quoted string is the JavaScript program `node -e` runs, and its `${…}` a template literal.
  Recommended: ShellCheck over every tracked shell script (`git ls-files '*.sh'`), so a new one, the resolver among
  them, is checked without a list to keep, and the guide's sentence holds; in `pack-version.sh`, a `# shellcheck
  disable=SC2016` above the `node -e` with that reason; the two sentences say "every shell script". Rejected: adding
  the six to the list (the next script would be missed the same way).

## Implementation

0. **ShellCheck over every shell script** (D15): `scripts/lint-workflows.sh` runs the pinned ShellCheck over
   `git ls-files '*.sh'`, its comment and its closing message say so; `scripts/pack-version.sh` gets the directive and
   its reason; the sentences in [.github/AGENTS.md](../.github/AGENTS.md) and
   [*Tests and checks*](../website/src/content/docs/internal/tests-and-checks.md) say "every shell script".
1. **`scripts/ci-daily-targets.sh`** (new): `release` from `npm view pomwright@latest version`; `commit` from
   `https://registry.npmjs.org/-/npm/v1/attestations/pomwright@<release>`, the SLSA v1 statement's
   `resolvedDependencies[0]`, whose `uri` must start with `git+https://github.com/<repository>@`
   (`GITHUB_REPOSITORY`, `DyHex/POMWright` by default); `playwright-extra` from `PLAYWRIGHT_REQUEST` (the dispatch
   input) when set, resolved with `npm view` and run unconditionally, otherwise from `@playwright/test@next` by the
   skip rule of P4. Prints the tag's commit (or none) and `next-pending`. Fails, saying why, without an attestation or
   a commit, or when npm has no version for the request. ShellChecked by step 0, as a tracked `.sh`.
2. **`checks.yaml`**: inputs `release`, `release-commit`, `playwright-extra` (strings, default empty), described in its
   header. `lint`, `test-server`, `site`: `if: inputs.release == ''`. `package`: in release mode, setup-node (no
   cache: there is no checkout, so no lockfile) and `npm pack "pomwright@$RELEASE"`, renamed to
   `pomwright-test-build.tgz`, in place of checkout, install, unit tests and build, each of which gets
   `if: inputs.release == ''`; its name says which. The download step fails unless the tarball's own `package/package.json` says
   `$RELEASE`. Nothing else has to change for the jobs to test the release: `package` is the only job that builds, and
   `harness` and `consumer` (as `harness-node`, which `Daily` does not run) only download its `pomwright-package` artifact
   ([checks.yaml:113-125](../.github/workflows/checks.yaml#L113-L125),
   [155-164](../.github/workflows/checks.yaml#L155-L164), [219-231](../.github/workflows/checks.yaml#L219-L231)) and
   hand `pomwright-test-build.tgz` to `pack-test.sh` as `POMWRIGHT_TARBALL`, which extracts it in place of
   `pack-build.sh` ([pack-test.sh:25-29](../pack-test.sh#L25-L29)), or to `consumer-check.sh`. The artifact is the
   seam: same name, same file name, a different source. The checkouts of `harness` and `consumer`:
   `ref: ${{ inputs.release-commit }}` (empty is checkout's default). `harness`: the matrix's `playwright` is
   `["pin", "latest"]` without `release`; with it, `["latest"]`, plus the `playwright-extra` version as a row named
   after it when set (`fromJSON` over a `format`, the version being one npm returned). The resolve step: for `pin` and
   `latest`, the checked-out `ci-playwright-version.sh`, as today; in release mode it is run with `GITHUB_OUTPUT`
   emptied, so it writes only to stdout, and the step writes the outputs itself from that, with `skip=false` and an
   empty version when the script said `skip=true` (the newest 1.x is the release's pin: the row runs the pin, which no
   other row does then); for the extra row, `version=<the row>`. `pnpm/action-setup` in `harness`:
   `version: ${{ inputs.release == '' && '12.14.0' || '' }}`. `check-latest` as D14 says.
   `harness-node` is unchanged: `Daily` does not set `older-node-lines`.
3. **`daily.yaml`** (new): the triggers of the contract (the `playwright` input: a string, optional, described),
   `permissions: contents: read`, `resolve` (checkout, then the script on the runner's own Node and npm, as `harness`'s
   resolve step runs today, so no Node line to keep here; the input passed as `PLAYWRIGHT_REQUEST` in `env:`), and
   `release` (`needs: resolve`, the call with the outputs).
4. **Docs**, by [website/AGENTS.md](../website/AGENTS.md)'s rule that a change to a mechanism updates the pages that
   describe it:
   - [.github/AGENTS.md](../.github/AGENTS.md): `Daily` and `checks.yaml`'s release mode in *The workflows*; a new
     section on what the latest release's tree must keep working (*Risks*), with the rule that a change to how
     `checks.yaml` calls the release's scripts runs `Daily` on its branch before the merge (D8); line 107-108's
     "Considered and not planned" replaced by what was built; *Do not*: name `Daily` `CI`, share `CI`'s concurrency
     group, add a job named `build` to it.
   - [*Internal → Tests and checks*](../website/src/content/docs/internal/tests-and-checks.md), *CI*: what `Daily` runs
     and why, and the rejected alternatives (D1, D3, D5, the pin row, polling for Playwright releases).
   - [docs/repository.md](../docs/repository.md): the `scripts/` row gains `ci-daily-targets.sh`.
   - [test/AGENTS.md](../test/AGENTS.md), *The harness*: CI's Playwright rows gain `Daily`'s `latest` and second row.
   - `checks.yaml`'s header comment.
5. **The pull request trigger removed** from `daily.yaml` (D8), the last commit, once `Daily` is green on the pull
   request.

## Tests

No spec or unit test changes: nothing in `src/` or `test/` moves. Checks, in order:

- Locally: `pnpm lint`, `pnpm lint:workflows` (actionlint reads the new inputs, the expressions and the call),
  `pnpm lint:guide`, and `bash scripts/ci-daily-targets.sh`: without `PLAYWRIGHT_REQUEST` (P4's results again), and
  with it set to `beta`, `next-pending`, `1.65.0`, and a version npm does not have (which must fail). The pull request
  cannot pass the input, so this is its check until the merge.
- In CI, the real thing: the pull request's own `Daily` run (D8) on chromium, firefox and webkit, at `latest` and
  `next`, on the runner image `ubuntu-latest` gives it that day (item 9); the pull request's `PR` run, whose jobs must
  be the same as before (no inputs set), apart from what the Node 26 plan changes in the same pull request (the Node
  line, `harness-node` on 24).
- After the merge: `CI` on `main` green; one manual `Daily` run on `main` from the *Run workflow* button (D13), which
  also shows the button is there, and one with `playwright` set to `beta`; the first scheduled run the next morning.

## Changeset and versioning

None: no consumer-facing change ([docs/versioning.md](../docs/versioning.md)).

## Risks

- **The latest release's tree must keep up with `main`'s `checks.yaml`.** `Daily` runs this repository's
  `checks.yaml` against the release's files: `pack-test.sh` and its switches (`POMWRIGHT_TARBALL`,
  `PLAYWRIGHT_VERSION`, `PLAYWRIGHT_INSTALL_ARGS`, `CI`, the arguments it passes on),
  `scripts/ci-playwright-version.sh pin|latest` and its outputs, `scripts/consumer-check.sh [--node-floor] <tarball>`,
  the lockfiles the Node cache reads, and `packageManager` (D11 handles that one). A change that breaks one of these
  turns `Daily` red from the next morning until the next release, unless `Daily` was run on its branch first (D8):
  make it compatible, or merge it knowing that. Today the two are the same commit.
- **Noise from `next`**: an alpha can break and be fixed before its release. Accepted for the warning (D6).
- **A stale `next`**: Playwright's promotion has failed since it began (item 8), so `next` can lag the nightly alphas;
  the resolver prints `next-pending` beside it, so a lag shows in the log.
- **The schedule itself**: a run can be late or dropped (item 7); 60 days without activity disables it, and turning it
  back on is one click in the Actions tab.
- **Cost**: 9 jobs a day while `next` is ahead of `latest` (`resolve`, the download, the harness at `latest` and at
  `next` on three browsers each, the consumer), 6 when it is not; `lint`, `harness-node`, `test-server` and `site`
  show as skipped and take no runner. Free for a public repository.

## Decisions

- [x] D1 a workflow of its own, `Daily`
- [x] D2 the latest release on npm, its published tarball
- [x] D3 the tree of the commit in its provenance attestation
- [x] D4 `harness` at `latest` and the second version, `consumer`; no pin row, no `harness-node`; the rest skipped
- [x] D5 Playwright `next`, not `beta` or `next-pending`
- [x] D6 a failing `next` row fails the run
- [x] D7 06:17 UTC
- [x] D8 `pull_request` on this pull request only, removed by its last commit; afterwards, the button on a branch
- [x] D9 the resolver as `scripts/ci-daily-targets.sh`, ShellChecked
- [x] D10 three inputs on `checks.yaml`, no copied jobs
- [x] D11 pnpm's version from the release's `packageManager` in release mode
- [x] D12 no concurrency group, no `build` job, no badge
- [x] D13 `workflow_dispatch` with one input, `playwright`
- [x] D14 `check-latest` in release mode, so `Daily` runs the newest Node patch
- [x] D15 ShellCheck over every tracked shell script, `pack-version.sh`'s false positive disabled with its reason

## Execution order

One commit per plan, as asked (2026-11-09), none pushed: steps 0 to 4 with this file, then the Node 26 plan's commit.
Then, after your push: the pull request, whose `PR` and `Daily` runs are the checks of record; step 5, a commit of its
own, once `Daily` is green on the last commit; before the merge, this folder's audit and deletion
([docs/releases.md](../docs/releases.md), rule 7); then the checks after the merge.

## Noticed, not in this plan

Nothing open. The ShellCheck gap became D15; the stale browsers after an OS upgrade need no line (your call);
`queue: max` is not wanted (below).

- `queue: max` (*Control the concurrency of workflows and jobs*): "Up to 100 jobs or workflow runs can be `pending`",
  taken "in first-in-first-out (FIFO) order according to the time each one started waiting … ordering is not
  guaranteed"; not allowed with `cancel-in-progress: true`. `main.yaml` keeps the default, `single`, where a new run
  cancels and replaces the pending one: after merges in quick succession, only the running commit and the newest are
  tested, and Publish and Pages act only on `main`'s tip anyway. With `max`, every older commit's run would also run,
  its Publish and Pages stopping at their guards, and the tip's run would wait behind them all. `Daily` has no group
  (D12).

## Execution notes

2026-11-09, steps 0 to 4, one commit with this file.

- **Step 0.** `scripts/lint-workflows.sh` runs ShellCheck over `git ls-files '*.sh'` (`mapfile`), and names them: 11
  with the resolver. A new script is in the list once `git add` has seen it (an untracked one is not, locally).
  Checked that a finding still fails it: with `pack-version.sh`'s directive removed, SC2016 and exit 1.
- **Step 1.** `scripts/ci-daily-targets.sh` as planned. It needs the same SC2016 directive as `pack-version.sh` (its
  attestation parser is a single-quoted `node -e` program with template literals); the parser prints only its reason
  when it refuses, not Node's stack. Run locally: by default `release=3.0.2`, `commit=8214027f…`, the tag at the same
  commit, `playwright-extra=1.66.0-alpha-1793916328000`, `next-pending` printed; `PLAYWRIGHT_REQUEST=beta` gives
  `1.65.0-beta-1793921730000`, `next-pending` `1.66.0-alpha-2026-11-09`, `1.65.0` itself, `1.x` `1.65.0`; `9.9.9` and
  `bad; echo pwned` fail with "npm has no version for …"; `GITHUB_REPOSITORY=Someone/Fork` fails with "built from
  git+https://github.com/DyHex/POMWright@refs/heads/main, not git+https://github.com/Someone/Fork@…". The skip rule:
  1.65.0/1.66.0-alpha runs, 1.66.0 and 1.66.1/1.66.0-alpha skip, 1.65.0/1.65.0-alpha skips, 1.70.2/2.0.0-alpha runs,
  1.9.0/1.10.0-alpha runs, 1.65.0/1.65.0 skips.
- **Step 2.** As planned. The harness's resolve step, extracted from `checks.yaml` and run with a stub
  `ci-playwright-version.sh` answering `latest` equal to the pin: with `release`, `version=` and `skip=false` (the
  stub's own write to `GITHUB_OUTPUT` suppressed); without, `skip=true` as today. With the repository's script:
  `latest` with `release` 1.65.0, `pin` and `latest` without as today, the extra row its own version. The download
  step, extracted and run: 3.0.2's tarball, its sha512 `2db0aa6d…` (the attestation's digest), the version check
  passing; 9.9.9 fails. Added `shell: bash` to the download step, so `pipefail` makes a failing `npm pack` fail there
  rather than at the `mv`. GitHub's expressions (the matrix, the job name, `check-latest`) cannot run locally:
  actionlint checked them, and the pull request's runs are their test.
- **Step 3.** `daily.yaml` as planned; its `resolve` job uses the runner's own Node and npm.
- **Step 4.** The docs as planned; *Tests and checks* has a section of its own, *The daily run*; `.github/AGENTS.md` a
  section *The latest release's tree*, and `scripts/ci-daily-targets.sh` among the scripts only CI runs.
- **Checks run.** `pnpm lint`, `pnpm lint:workflows` (actionlint over six workflows, ShellCheck over 11 scripts),
  `pnpm lint:guide` (78 links), `pnpm docs:build` (every internal link valid). Not run: the harness, which nothing
  here changes; the Node 26 plan's commit runs `pnpm test`.
- **Left:** step 5 after your push, once the pull request's `Daily` is green; the checks after the merge (*Tests*); this
  folder's audit and deletion before the merge.
- **Afterwards** (your `da076c5`): *Tests and checks* and `daily.yaml`'s header say "Playwright's latest release (a
  minor or a patch) and its `next` alpha": the `latest` row is the newest stable version in the release's peer range
  (npm resolves `>=1.64.0 <2.0.0` to 1.64.0, 1.64.1 and 1.65.0, no prerelease), so a patch runs from the first morning
  after it is published; every alpha on npm is `x.y.0-alpha-…`, so `next` is always the coming minor.
- **The pull request's runs** on `da076c5` (#67), all green: `PR` (chromium on 26 at the pin and `latest`,
  `harness-node` on 20, 22 and 24); `Daily` through the temporary trigger: `Download pomwright 3.0.2`, the harness on
  chromium, firefox and webkit at `latest` and at `1.66.0-alpha-1793916328000`, `Consumer installs`; `Lint`, the site,
  the test server and `harness-node` skipped. Not read: the jobs' logs (which commit each checked out, which Node patch
  it set up), which the API gives only with a token.
- **Step 5**, a commit of its own: the `pull_request` trigger and its comment removed from `daily.yaml`; actionlint
  passes. From the merge on, `Daily` runs on its schedule and from the *Run workflow* button only.
- **The audit's search** (docs/releases.md, rule 7) outside this folder: no plan, decision or folder reference; its hits
  are the script name `ci-daily-targets.sh` and the guide's own words about plans.
