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
chromium, firefox and webkit. Most `locatorRegistry` specs import the registry from `src/` and test the source; the
specs that use page objects or import `pomwright` test the packed package. `testApp/urlForms.spec.ts` sweeps every
printable ASCII character through the URL each browser reports, with the one known difference listed, so a browser
that starts reporting a URL differently fails the harness.

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
4. `scripts/check-doc-snippets.mjs`: every TypeScript example of the documentation, compiled against the installed
   package (see [documentation](/POMWright/internal/documentation/)).
5. `scripts/check-api-coverage.mjs`: every export of the installed declarations has an API page or section, every
   member a heading on it, every export and member a doc comment with a summary and its parameters, every method and
   class property a `@see` to its heading, and every link to the site a page and heading that exist.

## CI

`.github/workflows/checks.yaml` holds the jobs; `pr.yaml` runs them for every pull request and `main.yaml` for every
push to `main`:

- **changes**: compares the commit with the last green commit of the branch and, on a pull request, with its base.
  `code` is a change outside `website/` that is not a Markdown file; `site` is `code` or a change under `website/`. A
  change to Markdown files elsewhere runs lint alone; a change to the documentation's pages runs lint, the package and
  the site job.
- **lint**: biome over the whole repository, warnings failing.
- **package** (`code` or `site`): the unit tests, then one build and one tarball, kept as an artifact.
- **harness** (`code`): that tarball on each browser, at the pinned Playwright and at the latest 1.x; a pull request runs
  chromium, `main` all three, and one more job runs chromium on Node 20, the `engines` floor.
- **site** (`site`): that tarball installed into `test/`, the documentation's examples compiled, the API reference and
  the doc comments checked, and the site built, which fails on a link or an anchor that does not exist.
- **build**: the gate job, the check `main` requires.

Publishing waits for `CI` on `main`, so nothing is published past a red run, and `pages.yaml` deploys the site after
the same green run (see [documentation](/POMWright/internal/documentation/#building-and-publishing)). A run that
`workflow_run` starts checks out the newest commit on `main`, which may be newer than the one `CI` tested, so
`publish.yaml` first compares the two and goes no further when `main` has moved on: the newer commit's own `CI` run
starts Publish again. `pages.yaml` builds the tested commit itself. Checking out the tested commit in `publish.yaml`
too was rejected: the changesets action would then run on a detached head, and whether its Version Packages branch logic
still works there cannot be tried without a release.

Third-party actions are pinned to commits and kept current by Dependabot, which also proposes the npm versions of the
root, `test/` and `website/` once a month, grouped, except `@playwright/test`, which moves by decision.
