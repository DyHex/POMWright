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
chromium, firefox and webkit. 26 `locatorRegistry` specs import the registry from `src/` and test the source, where
they can read what is stored; each has a packed twin, `<name>.packed.spec.ts`, which runs the same scenarios through
the public API against the packed package and checks the DOM and the rendered locator instead. The specs that use
page objects or import `pomwright` test the packed package. `testApp/urlForms.spec.ts` sweeps every
printable ASCII character through the URL each browser reports, with the known differences listed, so a browser
that starts reporting a URL differently fails the harness.

Some outcomes belong to a run, not to a test: where a broken page object is built decides which tests fail, how far
each body gets and which tests do not run. A test cannot observe that about itself, and marking it `test.fail()` would
change it, since a serial group goes on after an expected failure. So `pageObject/lifecycle.outcomes.spec.ts` starts
`test/lifecycle-outcomes/` as a Playwright run of its own, on its project's browser, and compares that run's JSON report
with the table in [Page objects](/POMWright/docs/page-objects/#how-a-mistake-is-reported).

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
5. `scripts/check-doc-snippets.mjs`: every TypeScript example of the documentation and the README, compiled against
   the installed package (see [documentation](/POMWright/internal/documentation/)).
6. `scripts/check-api-coverage.mjs`: every export of the installed declarations has an API page or section, every
   member a heading on it, every export and member a doc comment with a summary and its parameters, every method and
   class property a `@see` to its heading, and every link to the site a page and heading that exist.
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

- **lint**: biome over the whole repository, warnings failing, then actionlint over the workflows (with shellcheck over
  their scripts), its version and checksum pinned in the step.
- **package**: the unit tests, then one build and one tarball, kept as an artifact.
- **harness**: that tarball on each browser, at the pinned Playwright and at the latest 1.x; a pull request runs
  chromium, `main` all three, and one more job runs chromium on Node 20, the `engines` floor.
- **consumer**: that tarball installed with npm into projects of their own, as consumers install it
  (`scripts/consumer-check.sh`): TypeScript under each module resolution (`node10`, `node16` and `nodenext` from
  CommonJS and ESM, `bundler`), attw, Playwright's runner in a CommonJS and a `"type": "module"` project, and TypeScript
  5.0 to the latest release in both decorator modes; then, on Node 20, `import` and `require` sharing one copy.
- **site**: that tarball installed into `test/`, the documentation's examples compiled, the API reference and the doc
  comments checked, the site built, which fails on a link or an anchor that does not exist, and every diagram rendered
  in Chromium, light and dark.
- **build**: the gate job, the check `main` requires.

Publishing waits for `CI` on `main`, so nothing is published past a red run, and `pages.yaml` deploys the site after
the same green run (see [documentation](/POMWright/internal/documentation/#building-and-publishing)). A run that
`workflow_run` starts checks out the newest commit on `main`, which may be newer than the one `CI` tested, so
`publish.yaml` first compares the two and goes no further when `main` has moved on: the newer commit's own `CI` run
starts Publish again, which continues the release and publishes only when no changeset is pending. When the tested
commit is a release commit (its version differs from its parent's) and that version is not on npm, it would never be
published, so the run fails and names the commit to revert. Publish authenticates to npm with Trusted Publishing, and
warns after publishing when a version has no provenance attestation (the version appears once the maintainer approves
it on npmjs.com, which can take longer than the check waits). `pages.yaml` builds the tested commit itself, and only
while it is `main`'s tip. Checking out the tested commit in `publish.yaml`
too was rejected: the changesets action would then run on a detached head, and whether its Version Packages branch logic
still works there cannot be tried without a release.

Third-party actions are pinned to commits and kept current by Dependabot, which also proposes the npm versions of the
root, `test/` and `website/` once a month, grouped, except `@playwright/test`, which moves by decision.
