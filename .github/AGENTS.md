# CI

The workflows, Dependabot, how Publish and Pages run, and the packaging probes. Claude Code loads this file when its
Read tool opens a file under `.github/`; otherwise (the shell, another client), read it before working there. Read it
before changing a script only CI runs (`scripts/consumer-check.sh`, `scripts/ci-playwright-version.sh`,
`scripts/ci-daily-targets.sh`, `scripts/release-check.sh`) or the packaging probes too. Part of the contributor guide that the root
[AGENTS.md](../AGENTS.md) indexes; its rules apply here too.

## The workflows

`checks.yaml` (reusable), every job on every run, whatever changed, so a run always tests what it reports on (on a pull
request, GitHub's merge commit): `lint` (biome; then `scripts/lint-workflows.sh`, which `pnpm lint:workflows` runs
locally too: actionlint with ShellCheck for the `run:` scripts, each pinned by version and SHA-256 in the script and
moved by hand, and that ShellCheck over every shell script the repository tracks, read from `git ls-files`, since
actionlint sees a script a `run:` block calls as that one line; then `scripts/check-guide-links.mjs`,
`pnpm lint:guide`, every relative link and anchor of the contributor guide; then `scripts/release-check.test.sh`, every
path of the release checks in throwaway repositories with a fake npm), `package` (unit tests, build and pack once, the
tarball as a run artifact) and `harness` (the browsers the caller passes, each at the Playwright pin and at the latest
1.x, each testing that tarball), on Node 26, the default (`checks.yaml`'s `NODE_VERSION`, every job's line in one place;
`publish.yaml` and `pages.yaml` name the same), and with the `older-node-lines` input, which `pr.yaml` and `main.yaml`
set, `harness-node` (chromium at the pin on every LTS Node line below the default, from the `engines` floor: a matrix
of 20, 22 and 24 in `checks.yaml`, which moves with Node's schedule: when a newer line is LTS it becomes the default
and the old default joins the matrix); every third-party action is pinned to a commit with its version in a comment, kept current by
`.github/dependabot.yml` (monthly, minor and patch updates grouped, each major as a pull request of its own), which also
proposes the npm versions of the root, `test/` and `website/`, never `@playwright/test`, and holds the majors of
`typescript` (issue #54) and `@types/node` (it follows the Node line of contributors and CI, by hand); `test-server` (`test-server-check.sh`), once per run, on
chromium: no page of the test server loads anything from another host; `consumer` (`scripts/consumer-check.sh`): the
tarball installed with npm into projects of its own, TypeScript under each module resolution, attw, Playwright's runner
in a CommonJS and a `"type": "module"` project, TypeScript 5.0 to the latest release in both decorator modes, without
`skipLibCheck` (on 5.0 and 5.1 the errors in other packages' declarations, Node's and Playwright's, are left out, and any
other fails it), then on Node 20 `import` and `require` sharing one copy; `site`: the tarball installed into `test/`, the
snippet and coverage checks, the site's frozen install and build on Node 26, and every diagram rendered (`scripts/check-diagrams.mjs`).
`pr.yaml` (`PR`) runs it for every pull request, draft or not, with the harness on chromium only, and for a pull request
into `main` the job `release` (*Release window*, `scripts/release-check.sh pull-request`, see *The rulesets on `main`*);
`main.yaml` (`CI`) for pushes to `main` only, on chromium, firefox and webkit, one run at a time (a `concurrency` group
without `cancel-in-progress`: a waiting run gives way to a newer push, and GitHub takes waiting runs in the order they
began waiting, which two pushes seconds apart can reverse; Publish and Pages act only on `main`'s tip, so an older run
never deploys over a newer site); both end with the gate job `build`, `main`'s required status check. `publish.yaml`
runs `changesets/action` v2 (`@changesets/cli` 3, `@changesets/changelog-github` 1) after `CI` succeeds on a push to
`main`, guarded by its job condition and by a step (`scripts/release-check.sh publish`) that fails while `main`'s tip,
read from GitHub, has a version npm does not have and changesets are pending (that version would never be published),
saying to revert the Version Packages pull request that set it, and otherwise goes no further unless the commit that run
tested is `main`'s tip and the checkout (a `workflow_run` checks out the newest commit when it first starts, and a
re-run keeps it; the newer commit's own run continues the release); it publishes with npm Trusted Publishing (`id-token:
write`; the workflow uses no npm token; `pnpm publish` exchanges the workflow's OIDC token and records provenance) from the
`npm` environment, which only `main` may deploy to and which the Trusted Publisher names, and after publishing warns
when a version has no provenance attestation. `pages.yaml` builds `website/` and deploys it to GitHub Pages
(`https://dyhex.github.io/POMWright/`) after `CI` succeeds on a push to `main`, guarded as `publish.yaml` is and
building the commit that run tested, only while that commit is `main`'s tip (a re-run of an older run deploys nothing),
or by `workflow_dispatch`, which builds the commit it was started on.

`daily.yaml` (`Daily`) tests the release users install today, every morning at 06:17 UTC and from its *Run workflow*
button: `scripts/ci-daily-targets.sh` reads the version npm's `latest` tag names, the commit it was published from (its
npm provenance attestation, SLSA v1) and the second Playwright version (Playwright's `next` alpha while its release is
ahead of `latest`, or the version or dist-tag the button's `playwright` input names), and the job `pomwright <version>`
calls `checks.yaml` with them as `release`, `release-commit` and `playwright-extra`. With `release` set, `package`
downloads the published tarball (`npm pack`) under the same artifact instead of building; `harness` and `consumer`
check out `release-commit` and run its tests and scripts; the harness rows are `latest` (run even when it is the pin)
and the extra version, named after it, with no `pin` row; every setup-node step checks for the newest patch; pnpm comes
from that commit's `packageManager`; `lint`, `test-server` and `site` are skipped, and `harness-node` too, since `Daily`
does not set `older-node-lines`. It has no concurrency group, publishes, deploys and gates nothing, and GitHub mails a
failed scheduled run to whoever created the workflow or last changed its cron line.

## The latest release's tree

`Daily` runs `main`'s `checks.yaml` against the files of the latest release's commit, so what `checks.yaml` calls there
must keep working with that commit until the next release: `pack-test.sh` and its switches (`POMWRIGHT_TARBALL`,
`PLAYWRIGHT_VERSION`, `PLAYWRIGHT_INSTALL_ARGS`, `CI`, the arguments it passes on), `scripts/ci-playwright-version.sh
pin|latest` and its output lines, `scripts/consumer-check.sh [--node-floor] <tarball>`, and the lockfiles the Node cache
reads. A change that breaks one turns `Daily` red from the next morning until the next release: before merging it, run
`Daily` on its branch (the *Run workflow* button's branch menu), and make it compatible or merge it knowing that. pnpm's version is the one exception handled in `checks.yaml`: with `release` set it passes no `version` to
`pnpm/action-setup`, which fails when one differs from the checkout's `packageManager`.

## Publish and Pages

- `publish.yaml` starts after `CI` succeeds, and `CI` runs only for pushes to `main` and includes the whole harness;
  its job condition also requires a push run on `main` in this repository. Pull requests run the same jobs through
  `PR`, which Publish does not listen to. The `PR` and `CI` workflows run only for pull requests (drafts included)
  and pushes to `main`. The gate job
  `build` of `pr.yaml` and `main.yaml` is `main`'s required status check, in the ruleset `main: checks`. The published
  package is rebuilt by `pnpm run release`, not taken from the CI artifact (an open issue).
- A version on `main` that npm does not have while changesets are pending is never published: `changesets/action`
  publishes only when no changeset is pending, and its next Version Packages pull request bumps past that version.
  `pr.yaml`'s `release` job keeps pull requests from getting `main` there (*The rulesets on `main`*). `publish.yaml`'s
  guard reads `main`'s tip from GitHub, since a `workflow_run` checks out the newest commit when it first starts and a
  re-run keeps that checkout. While the tip is in that state, every Publish run fails and says to revert the Version
  Packages pull request that set the version, after reading npm once more 5½ minutes later (npm's list of versions can
  be five minutes old right after a publish). Otherwise a run goes on only when the commit `CI` tested is the tip and
  the checkout; when `main` has moved on, the newer commit's own run continues the release (and publishes the version
  when no changeset is pending), so deployments follow commit order, re-runs included.
- `pages.yaml` deploys the documentation site after `CI` succeeds on a push to `main`, guarded as `publish.yaml` is,
  from the commit that run tested and only while it is `main`'s tip, so the site follows `main`'s tip whenever that
  tip's `CI` passes and deployments follow commit order, re-runs included. A green commit `main` has moved past is not
  deployed: its changes reach the site with the next newer commit whose `CI` passes, and while the newer commit's `CI`
  fails, the site stays where it was (a manual run deploys sooner). A manual run (`workflow_dispatch`) builds the
  commit it was started on, whatever its `CI` said. Since nothing reaches `main` before it is ready to release, the site
  is ahead of npm only until the Version Packages pull request is merged.
- A release itself (the merge rule, the Trusted Publisher, the attestation check): [docs/releases.md](../docs/releases.md).

## The rulesets on `main`

`main` is protected by two repository rulesets (**Settings**, **Rules**, **Rulesets**), which live in GitHub's settings,
not in the repository:

- `main: checks`, which nobody may bypass: the status check `build` (from GitHub Actions) with the branch up to date
  before merging, no deletion, no force push.
- `main: review`, which repository admins may bypass for pull requests only (never a direct push): a pull request, one
  approving review, review from Code Owners, conversations resolved.

The review ruleset is bypassable because the only maintainer cannot approve their own pull requests. The checks ruleset
is not, because the release window depends on it: `pr.yaml`'s `release` job judges the pull request's merge commit,
whose first parent is `main`'s tip. It passes when that commit's version is on npm, or when the pull request sets the
version with no changeset pending (the Version Packages pull request); it fails at once when the pull request sets the
version while changesets are pending (a Version Packages pull request brought up to date with **Update branch** after a
changeset landed, which `changeset version` never saw); otherwise `main`'s version is being published, and it waits,
reading npm every 30 seconds for up to 30 minutes. A pull request whose `build` passed before a Version Packages pull
request was merged is out of date afterwards, and updating it runs `release` again, so every merge, with or without a
changeset, waits for the release. When `build` itself is broken and something must merge, set `main: checks` to
**Disabled**, merge (not while a release is publishing), and set it back to **Active**; the same goes for renaming
`main`, which GitHub refuses while a ruleset nobody may bypass blocks force pushes to it.

## Packaging probes

- The packaging probes run on every CI run against the packed tarball: the packed file list in the harness
  (`packaging/packageFiles.spec.ts`: `dist/index.js` and `dist/index.d.ts` from tsup, `dist/index.mjs` and
  `dist/index.d.mts` from `scripts/write-esm-entry.mjs`, nothing else in `dist`), and the rest in the `consumer` job
  (`scripts/consumer-check.sh`): TypeScript under `node10`, `node16`, `nodenext` and `bundler` resolution; attw
  (`@arethetypeswrong/cli`, downloaded at a pinned version, never a dependency) reporting no problem; Playwright's runner
  in a CommonJS and a `"type": "module"` project; TypeScript 5.0 to the latest release in both decorator modes; and
  Node 20 loading `index.js` for `require` and `index.mjs` for `import` with one shared `PageObject`. Only one stays
  manual, before a release that changes `engines`: npm's `EBADENGINE` warning on a Node version below the new floor.
- The latest release meets each new Playwright release, and Playwright's `next` alpha, in `Daily` (*The workflows*),
  every morning rather than on an event, since GitHub has no event for another repository's releases.

## Rules held elsewhere

- The site describes CI: the jobs and what each runs on
  [*Internal → Tests and checks*](../website/src/content/docs/internal/tests-and-checks.md), the docs checks of each
  job and how Pages deploys on [*Internal → Documentation*](../website/src/content/docs/internal/documentation.md),
  and the `consumer` job's checks on [*Internal → Packaging*](../website/src/content/docs/internal/packaging.md). A
  change to a workflow, a job or a script only CI runs updates them in the same change, by
  [website/AGENTS.md](../website/AGENTS.md)'s rule that a change to a mechanism updates the pages that describe it.

## Do not

- Reintroduce a second build in a harness job, or build the site in a harness job.
- Remove the publish job's `npm` environment, or that environment's rule that only `main` deploys to it.
- Let `CI` (`main.yaml`) run on pull requests, remove the publish guard, or rename the gate job `build` without
  changing the ruleset `main: checks` with it (every pull request would be blocked).
- Take the `release` job out of `pr.yaml`'s gate, or give `main: checks` a bypass or drop its up-to-date rule: the
  release window would let a merge with a changeset in before a release is on npm, and that version would be skipped.
- Deploy the site from anything but a green `CI` run on `main` or a manual run, or give the released site a
  pre-release banner or a `noindex` meta.
- Name `Daily` `CI`, put it in `CI`'s concurrency group, or give it a job named `build`: Publish and Pages listen to
  `CI`, a scheduled run in that group would cancel a waiting push run, and `build` is `main`'s required check.
