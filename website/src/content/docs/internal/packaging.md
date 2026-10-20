---
title: Packaging
description: "One CommonJS build, an ESM entry that re-exports it, the exports map, and declarations built from type aliases."
---

How POMWright is built decides what a project can import and whether a test run holds one copy of it or two. This page
explains the build, the package's entry points and its declarations. How to install and import POMWright is on
[Installation](/POMWright/docs/installation/).

## One build, two entries

`pnpm build` runs tsup on `index.ts`, which writes one CommonJS build, `dist/index.js`, and its declarations,
`dist/index.d.ts`. Then `scripts/write-esm-entry.mjs` writes the ESM entry: `dist/index.mjs` imports the CommonJS build
and re-exports each of its names, and `dist/index.d.mts` re-exports its declarations. The names are read from the built
module, so the ESM entry cannot drift from `index.ts`.

This is the layout `@playwright/test` uses, and for the same reason: a process that reaches POMWright through both
`import` and `require`, as a project with ESM specs and a CommonJS config can, holds one copy. Two builds would give
two `PageObject` classes and two seed registries per page, and an `instanceof` or a shared registry would silently
split.

## The `exports` map

`package.json` maps the root, `"."`, to the ESM entry for `import` and the CommonJS build for `require`, each with its
own declarations, and exposes `./package.json`. Nothing else is importable: `pomwright/dist/index.js` fails with
`ERR_PACKAGE_PATH_NOT_EXPORTED`, so internal files can change without breaking a consumer. `engines.node` is `>=20`,
Playwright's own floor, and `@playwright/test` is a peer dependency: POMWright never bundles or installs it. The
`files` list decides what is packed: `dist`, the README, the license and the changelog.

## Declarations

The declarations are bundled into one file. A class re-exported as a type would be written into its export list as a
value, so every public type that names an internal class is a type alias over it instead (see
[builders](/POMWright/internal/builders/)). Internals are TypeScript-`private`; the declarations are emitted without
`stripInternal`. The doc comments are kept, which is what the editor shows on hover.

## Checked on the packed package

The harness installs the tarball `pnpm pack` produced, extracted, so it tests what npm would publish. A spec in ESM,
`test/tests/packaging/esmEntry.spec.mts`, checks both entries, that they share one copy, that deep imports fail, and the
manifest. Two compile-only files check the published types: `publicTypes.typecheck.ts`, every export and the types
that must and must not compile, and `publicTypes.emit.ts`, which a project with `declaration: true` must be able to
emit without annotations.

## A build for testing before a release

The version in `package.json` is the last release until changesets bumps it in the *Version Packages* pull request,
so a tarball packed before then says so too. `pnpm pack:version 3.0.0-rc.1` builds and packs the package as npm would
publish it, sets the given version in the packed `package.json` only, and writes `pomwright-3.0.0-rc.1.tgz` at the
root. A project installs it as a `file:` dependency to try the build, and its lockfile and `npm ls` show which build it
has. The script, `scripts/pack-version.sh`, is run by hand only; the harness and CI use `pack-build.sh`.
