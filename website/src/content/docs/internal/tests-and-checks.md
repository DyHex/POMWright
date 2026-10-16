---
title: Tests and checks
description: "Unit tests in type-check mode, the harness against the packed package, the type probes, the documentation checks, and the CI jobs."
---

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
specs that use page objects or import `pomwright` test the packed package.

## Type checks

`pnpm typecheck`, part of `pack-test`, runs after the install:

1. `tsc` over the harness: specs, page objects and the compile-only probes, whose `@ts-expect-error` lines must hold.
2. The declaration emit of `publicTypes.emit.ts` with `declaration: true`.
3. `scripts/check-doc-snippets.mjs`: every TypeScript example of the documentation, compiled against the installed
   package (see [documentation](/POMWright/internal/documentation/)).
4. `scripts/check-api-coverage.mjs`: every export of the installed declarations has an API page or section, every
   member a heading on it, and every export and member a doc comment with a summary and its parameters.

## CI

`.github/workflows/checks.yaml` holds the jobs; `pr.yaml` runs them for every pull request and `main.yaml` for every
push to `main`:

- **changes**: decides whether code changed since the last green run. A change to Markdown files only, outside the
  documentation's pages, runs lint alone.
- **lint**: biome over the whole repository, warnings failing.
- **package**: the unit tests, then one build and one tarball, kept as an artifact.
- **harness**: that tarball on each browser, at the pinned Playwright and at the latest 1.x; a pull request runs
  chromium, `main` all three, and one more job runs chromium on Node 20, the `engines` floor.
- **build**: the gate job, the check `main` requires.

Publishing waits for `CI` on `main`, so nothing is published past a red run. Third-party actions are pinned to commits
and kept current by Dependabot.
