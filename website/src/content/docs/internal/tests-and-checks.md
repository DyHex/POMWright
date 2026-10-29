---
title: Tests and checks
description: "Unit tests in type-check mode, the harness against the packed package, the type probes, the documentation checks, and the CI jobs."
---

POMWright is checked in four layers: unit tests of the source, the harness against the packed package in three
browsers, type checks of the published declarations and of the documentation's examples, and CI, which runs them for
every change. This page explains what each layer covers and why it is there.

## Unit tests

`pnpm test:unit` runs vitest over the tests beside the source, `src/**/*.test.ts`, in seconds. Vitest runs in
type-check mode, so `expectTypeOf` assertions and `// @ts-expect-error` lines are enforced: a type that stops rejecting
what it should fails the run. `src/helpers/stepDecorator.test-d.ts` is type-only, for decorator syntax the runtime
cannot load. `src/locators/fakePage.ts` is a page whose locators record the chain they were built from, for tests of
resolution without a browser; nothing in the runtime imports it.

## The harness

`test/` is a project of its own that installs the packed package from `.pack/pomwright`, as a consumer would, and runs
Playwright against an express server, `test/server.js`, with a page per area: filters, frames, ids, navigation and
session storage across two origins. `pnpm pack-test` builds, packs, installs, type-checks and runs every spec on
chromium, firefox and webkit. Every spec imports `pomwright`, so every spec tests the packed package. The registry's
specs check a registration through the public API, on the DOM and in Playwright's rendering of the same call; what
the registry stores inside is the unit tests', which read it directly. A spec that imports the source to read the
stored records is not kept beside them: the unit tests already read the records on the source, and a spec's calls
through the package check what the records are for. `testApp/urlForms.spec.ts` sweeps every
printable ASCII character through the URL each browser reports, with the known differences listed, so a browser
that starts reporting a URL differently fails the harness.

Some outcomes belong to a run, not to a test: where a broken page object is built decides which tests fail, how far
each body gets and which tests do not run. A test cannot observe that about itself, and marking it `test.fail()` would
change it, since a serial group goes on after an expected failure. So `pageObject/lifecycle.outcomes.spec.ts` starts
`test/lifecycle-outcomes/` as a Playwright run of its own, on its project's browser, and compares that run's JSON report
with the table in [Page objects](/POMWright/docs/page-objects/#how-a-mistake-is-reported).

`docs/docsChains.spec.ts` rebuilds every locator chain the documentation and the README show, in a `text` block, a
code comment or the running text, from the page's own example, and compares it with what the packed package resolves: one test per page,
so a chain that a change to the code or to the page made stale names its page. The latest-1.x CI rows run it too, so
a Playwright release that prints a locator differently shows there first.

After the harness, `pack-test` runs `test/playwright.steps.config.ts`: where the report places a step and its error,
which only the runner computes. Its spec marks each probed call with `// LOCATION <id>`, and its reporter fails the run
when a step or an error with that id is reported on another line (see
[call sites](/POMWright/internal/call-sites/#steps-at-the-tests-line)). It needs no browser, and runs from a config of
its own so that no `--reporter` given to the harness can switch it off.

## Type checks

`pnpm typecheck`, part of `pack-test`, runs after the install:

1. `tsc` over the harness: specs, page objects and the compile-only probes, whose `@ts-expect-error` lines must hold.
2. The declaration emit of `publicTypes.emit.ts` with `declaration: true`.
3. `@step` under `experimentalDecorators` (`tsconfig.legacyDecorators.json`): the same probe compiles under the
   standard decorators in step 1.
4. `@step`'s legacy decorator calls as `tsc` writes them (`tsconfig.legacyDecorators.emit.json`): a small decorated
   module, emitted as CommonJS into `test/.legacy-decorators/`, which the step-location check runs (see
   [call sites](/POMWright/internal/call-sites/#steps-at-the-tests-line)). Decorated code compiled by `tsc` with
   `experimentalDecorators`, such as a page-object package, makes these calls; a unit test with a hand-made descriptor
   cannot show that they run.
5. `scripts/check-doc-snippets.mjs`: every TypeScript example of the documentation, the README and the doc comments,
   compiled against the installed package (see [documentation](/POMWright/internal/documentation/)).
6. `scripts/check-api-coverage.mjs`: every export of the installed declarations has an API page or section, every
   member a heading in its own section, every export and member a doc comment with a summary and its parameters, every
   method and class property a `@see` to its own heading (not merely one that exists), every link to the site a page
   and heading that exist, and every exported type a row of the [type table](/POMWright/docs/typescript/#the-types),
   linked to its API section.
7. `scripts/check-error-messages.mjs`: *Error messages* against the code, both ways. Every message the source throws,
   read with the compiler API (a varying part matches anything, a ternary inside a message offers its branches), and
   every compile-error message its types define, must be on the page; every message line on the page must end as one
   of them does. Errors no user can reach, and messages that only put a label in front of another error's, are listed
   in the script with their reasons. The API pages' **Throws** and the doc comments' `@throws` are kept by hand.

## CI

`.github/workflows/checks.yaml` holds the jobs; `pr.yaml` runs them for every pull request and `main.yaml` for every
push to `main`. Every job runs on every run, whatever changed, so a run always tests what it reports on; on a pull
request that is GitHub's merge commit of the branch and its base. Skipping jobs by what changed was tried and dropped:
it saved minutes on pushes that changed only documentation, and compared the branch with its last green commit while
the jobs tested the merge commit, so after the base moved a documentation-only push could skip the harness on an
untested merge.

- **lint**: biome over the whole repository, warnings failing; actionlint over the workflows, with shellcheck over
  their scripts and the scripts they run instead, both pinned by version and checksum in `scripts/lint-workflows.sh`,
  which `pnpm lint:workflows` runs locally too; every relative link and anchor of the contributor guide
  (`scripts/check-guide-links.mjs`); then the release checks' test (`scripts/release-check.test.sh`), which runs every
  path of a release in throwaway repositories with a fake npm.
- **package**: the unit tests, then one build and one tarball, kept as an artifact.
- **harness**: that tarball on each browser, at the pinned Playwright and at the latest 1.x; a pull request runs
  chromium, `main` all three, on Node 24; one more job per older LTS Node line, from the `engines` floor (20 and 22),
  runs chromium at the pinned Playwright, on pull requests and `main` alike.
- **consumer**: that tarball installed with npm into projects of their own, as consumers install it
  (`scripts/consumer-check.sh`): TypeScript under each module resolution (`node10`, `node16` and `nodenext` from
  CommonJS and ESM, `bundler`), attw, Playwright's runner in a CommonJS and a `"type": "module"` project, and TypeScript
  5.0 to the latest release in both decorator modes; then, on Node 20, `import` and `require` sharing one copy.
- **site**: that tarball installed into `test/`, the documentation's examples compiled, the API reference and the doc
  comments checked, the site built, which fails on a link or an anchor that does not exist, and every diagram rendered
  in Chromium, light and dark.
- **release** (*Release window*, in `pr.yaml` only, for a pull request into `main`): holds the pull request while
  `main`'s version is being published, described below.
- **build**: the gate job, the check `main` requires.

Publishing waits for `CI` on `main`, so nothing is published past a red run, and `pages.yaml` deploys the site after
the same green run (see [documentation](/POMWright/internal/documentation/#building-and-publishing)).

A version on `main` that npm does not have while changesets are pending is never published: the changesets action
publishes only when no changeset is pending, and its next Version Packages pull request bumps past that version. Between
merging a Version Packages pull request and its publish, six to eleven minutes for 3.0.0 and 3.0.1, a merge with a
changeset would get `main` there, and so would a Version Packages pull request that has not caught up with `main`. Two
checks share `scripts/release-check.sh`:

- **The release window** (`pr.yaml`'s `release` job) keeps pull requests out. It judges the pull request's merge commit,
  whose first parent is `main`'s tip: it passes when that commit's version is on npm, or when the pull request sets the
  version with no changeset pending (the Version Packages pull request); it fails at once when the pull request sets the
  version while changesets are pending (a Version Packages pull request updated with `main` after a changeset landed);
  otherwise a release is publishing, and it waits until npm has the version. It binds every merge because `main`'s
  rulesets require `build` and an up-to-date branch, and nobody may bypass that ruleset; a pull request that passed
  before the release was merged has to be updated, which runs the job again. The review rules sit in a ruleset of their
  own, which the maintainer may bypass to merge their own pull requests. The rulesets are described in
  [`.github/AGENTS.md`](https://github.com/DyHex/POMWright/blob/main/.github/AGENTS.md).
- **Publish's guard** reports what gets past the window, such as a merge while the ruleset was disabled, and stops a
  re-run that `main` has moved past. A run that `workflow_run` starts checks out the newest commit on `main` when it
  first starts, and a re-run keeps that checkout, so the guard reads `main`'s tip from GitHub. While the tip has a
  version npm does not have and changesets are pending, every run fails and says to revert the Version Packages pull
  request that set the version, after reading npm once more 5½ minutes later: npm serves its list of versions with a
  five-minute cache, so it can still lack a version that was just published, and reading it once would say to revert a
  published release. Otherwise a run goes on only when the commit `CI` tested is the tip and the checkout; when `main`
  has moved on, the newer commit's own run continues the release, and publishes the version when no changeset is
  pending.

Rejected: GitHub's merge queue, which would queue the merges themselves, is offered only to repositories owned by an
organization, and this one belongs to a personal account; publishing as the last job of `CI`, on the commit it tested,
would queue the work behind a release without any setting, but it is a larger change of the release path, and a failed
publish would turn `CI` red and hold back the site; the git tags as the record of what is published, since the
changesets action pushes a tag only after the publish, so a missing tag can follow a published release; and a guard that
judges the tested commit, as the first one did, which missed a release commit whose own run never came and failed a
release that the next run published.

Publish authenticates to npm with Trusted Publishing,
which allows `npm publish` from the `npm` environment only, which only `main` may deploy to, so a version goes live when
the run publishes it and no other branch can publish; it warns when a published version
has no provenance attestation after ten minutes. `pages.yaml` builds the tested commit itself, and only
while it is `main`'s tip. Checking out the tested commit in `publish.yaml`
too was rejected: the changesets action would then run on a detached head, and whether its Version Packages branch logic
still works there cannot be tried without a release.

Third-party actions are pinned to commits and kept current by Dependabot, which also proposes the npm versions of the
root, `test/` and `website/` once a month, grouped, except `@playwright/test`, which moves by decision.
