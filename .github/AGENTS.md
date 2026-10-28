# CI

The workflows, Dependabot, how Publish and Pages run, and the packaging probes. Claude Code loads this file when it
reads a file under `.github/`; with another client, read it before working there. Read it before changing a script only
CI runs (`scripts/consumer-check.sh`, `scripts/ci-playwright-version.sh`) or the packaging probes too. Part of the
contributor guide that the root [AGENTS.md](../AGENTS.md) indexes; its rules apply here too.

## The workflows

`checks.yaml` (reusable), every job on every run, whatever changed, so a run always tests what it reports on (on a pull
request, GitHub's merge commit): `lint` (biome, then actionlint with ShellCheck for the `run:` scripts, each pinned by
version and SHA-256 in the step and moved by hand), `package` (unit tests, build and pack once, the tarball as a run
artifact) and `harness` (the browsers the caller passes, each at the Playwright pin and at the latest 1.x, each testing
that tarball), and with the `node-floor` input, which `pr.yaml` and `main.yaml` set, `harness-node-floor` (chromium at
the pin on Node 20, the `engines` floor); every third-party action is pinned to a commit with its version in a comment,
kept current by `.github/dependabot.yml` (monthly, minor and patch updates grouped, each major as a pull request of its
own), which also proposes the npm versions of the root, `test/` and `website/`, never `@playwright/test`, and holds the
majors of `typescript` (issue #54) and `@types/node` (issue #55); `test-server` (`test-server-check.sh`), once per run, on chromium: no page of the
test server loads anything from another host; `consumer` (`scripts/consumer-check.sh`): the tarball
installed with npm into projects of its own, TypeScript under each module resolution, attw, Playwright's runner in a
CommonJS and a `"type": "module"` project, TypeScript 5.0 to the latest release in both decorator modes, then on Node 20
`import` and `require` sharing one copy; `site`: the tarball installed into `test/`, the snippet and coverage checks,
the site's frozen install and build on Node 24, and every diagram rendered (`scripts/check-diagrams.mjs`). `pr.yaml`
(`PR`) runs it for every pull request, draft or not, with the harness on chromium only; `main.yaml` (`CI`) for pushes to
`main` only, on chromium, firefox and webkit, one run at a time in push order (a `concurrency` group without
`cancel-in-progress`, so Publish and Pages follow the order of the commits and an older run never deploys over a newer
site; a waiting run gives way to a newer push); both end with the gate job `build`, `main`'s required status check.
`publish.yaml` runs `changesets/action` v2 (`@changesets/cli` 3, `@changesets/changelog-github` 1) after `CI` succeeds
on a push to `main`, guarded by its job condition and by a step that goes no further when `main` has moved past the
commit that run tested (a `workflow_run` checks out the newest commit; the newer commit's own run continues the release,
and publishes only when no changeset is pending), and fails when that commit is a release commit (its version differs
from its parent's) whose version is not on npm, saying to revert it; it publishes with npm Trusted Publishing
(`id-token: write`; no npm token is stored; `pnpm publish` exchanges the workflow's OIDC token and records provenance)
from the `npm` environment, which only `main` may deploy to and which the Trusted Publisher names,
and after publishing warns when a version has no provenance attestation. `pages.yaml` builds `website/` and deploys it
to GitHub Pages (`https://dyhex.github.io/POMWright/`) after `CI` succeeds on a push to `main`, guarded as
`publish.yaml` is and building the commit that run tested, only while that commit is `main`'s tip (a re-run of an older
run deploys nothing), or by `workflow_dispatch`.

## Publish and Pages

- `publish.yaml` starts after `CI` succeeds, and `CI` runs only for pushes to `main` and includes the whole harness;
  its job condition also requires a push run on `main` in this repository. Pull requests run the same jobs through
  `PR`, which Publish does not listen to. CI runs only for pull requests (drafts included) and `main`. The gate job
  `build` of `pr.yaml` and `main.yaml` is `main`'s required status check. The published package is rebuilt by
  `pnpm run release`, not taken from the CI artifact (an open issue). A `workflow_run` checks out the newest commit on
  `main`, so `publish.yaml` compares it with the commit the run tested and goes no further when `main` has moved on:
  the newer commit's run continues the release, and publishes only when no changeset is pending. If the tested commit
  is a release commit whose version is not on npm, that version would never be published, so the run fails and names
  the commit.
- `pages.yaml` deploys the documentation site after `CI` succeeds on a push to `main`, guarded as `publish.yaml` is,
  from the commit that run tested and only while it is `main`'s tip, so every merge updates the site once its checks
  have passed and deployments follow commit order, re-runs included; since nothing reaches
  `main` before it is ready to release, the site is ahead of npm only until the Version Packages pull request is
  merged.
- A release itself (the merge rule, the Trusted Publisher, the attestation check): [docs/releases.md](../docs/releases.md).

## Packaging probes

- The packaging probes run on every CI run against the packed tarball: the packed file list in the harness
  (`packaging/packageFiles.spec.ts`: `dist/index.js` and `dist/index.d.ts` from tsup, `dist/index.mjs` and
  `dist/index.d.mts` from `scripts/write-esm-entry.mjs`, nothing else in `dist`), and the rest in the `consumer` job
  (`scripts/consumer-check.sh`): TypeScript under `node10`, `node16`, `nodenext` and `bundler` resolution; attw
  (`@arethetypeswrong/cli`, downloaded at a pinned version, never a dependency) reporting no problem; Playwright's runner
  in a CommonJS and a `"type": "module"` project; TypeScript 5.0 to the latest release in both decorator modes; and
  Node 20 loading `index.js` for `require` and `index.mjs` for `import` with one shared `PageObject`. Only one stays
  manual, before a release that changes `engines`: npm's `EBADENGINE` warning on a Node version below the new floor.
- Considered and not planned: a scheduled workflow that tests the latest release against each new Playwright
  release (GitHub has no event for another repository's releases).

## Do not

- Reintroduce a second build in a harness job, or build the site in a harness job.
- Remove the publish job's `npm` environment, or that environment's rule that only `main` deploys to it.
- Let `CI` (`main.yaml`) run on pull requests, remove the publish guard, or rename the gate job `build` without
  changing the branch-protection rule with it (every pull request would be blocked for non-admins).
- Deploy the site from anything but a green `CI` run on `main` or a manual run, or give the released site a
  pre-release banner or a `noindex` meta.
