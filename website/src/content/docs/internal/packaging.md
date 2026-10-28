---
title: Packaging
description: "One CommonJS build, an ESM entry that re-exports it, the exports map, and declarations built from type aliases."
---

How POMWright is built decides what a project can import and whether a test run holds one copy of it or two. This page
explains the build, the package's entry points and its declarations. How to install and import POMWright is on
[Installation](/POMWright/docs/installation/).

## One build, two entries

`pnpm build` runs tsup on `index.ts`, which empties `dist/` and writes one CommonJS build, `dist/index.js`, and its
declarations, `dist/index.d.ts`. Then `scripts/write-esm-entry.mjs` writes the ESM entry: `dist/index.mjs` imports the CommonJS build
and re-exports each of its names, and `dist/index.d.mts` re-exports its declarations. The names are read from the built
module, so the ESM entry cannot drift from `index.ts`.

This is the layout `@playwright/test` uses, and for the same reason: a process that reaches POMWright through both
`import` and `require`, as a project with ESM specs and a CommonJS config can, holds one copy. Two builds would give
two `PageObject` classes and two seed registries per page, and an `instanceof` or a shared registry would silently
split.

## The `exports` map

`package.json` maps the root, `"."`, to the ESM entry for `import` and the CommonJS build for `require`, each with its
own declarations, and, last, to the CommonJS build for `default`, the condition a resolver falls back to when it
matches neither, as `@playwright/test`'s map does. It also exposes `./package.json`. Nothing else is importable: `pomwright/dist/index.js` fails with
`ERR_PACKAGE_PATH_NOT_EXPORTED`, so internal files can change without breaking a consumer. `engines.node` is `>=20`,
Playwright's own floor, and `@playwright/test` is a peer dependency: POMWright never bundles or installs it. The
`files` list decides what is packed: `dist`, the README, the license and the changelog.

## Declarations

The declarations are bundled into one file. A class re-exported as a type would be written into its export list as a
value, so every public type that names an internal class is a type alias over it instead (see
[builders](/POMWright/internal/builders/)). Internals are TypeScript-`private`; the declarations are emitted without
`stripInternal`. The doc comments are kept, which is what the editor shows on hover.

A consumer's own declarations must be able to name every type POMWright hands out, or a project with
`declaration: true` cannot export a function that returns it. An alias of an indexed access type, such as
`LocatorRegistryInternal<Paths>["add"]`, does not survive that: TypeScript resolves it to the method's type, and the
consumer's declarations spell that type out, down to the registration builders, which are not exported. So
`AddAccessor` is an interface that repeats `add`'s signature, a unit test holds the two to each other, and
`LocatorRegistry` types its `add` with it instead of picking the method from the class.

A type in a declaration file is written through a module specifier TypeScript can resolve from that file. Playwright
declares its types in `playwright` and `playwright-core`, which `@playwright/test` re-exports. Under npm every package
is at the top of `node_modules`, and the declarations name the declaring packages directly, for POMWright's values as
for Playwright's own. Under pnpm only a project's own dependencies are there, so TypeScript can name Playwright's types
only through `@playwright/test`, and it finds that way only when the compilation imports `@playwright/test`. A module
that exports an extended `test` or a seed's `definition`, in a compilation where no file imports it, then fails with
TS2883. POMWright cannot name the types for the consumer: the fix is the consumer's import, or an annotation with
POMWright's own types (see [`declaration: true`](/POMWright/docs/typescript/#declaration-true)). Re-exporting
Playwright's types from `pomwright` was not adopted: Playwright's things come from `@playwright/test`, as `expect` does,
and the re-exports would be a second public name for each.

## Checked on the packed package

The harness installs the tarball `pnpm pack` produced, extracted, so it tests what npm would publish. In
`test/tests/packaging/`:

- `esmEntry.spec.mts`, a spec in ESM, checks both entries, that they share one copy, that deep imports fail, and the
  manifest.
- `packageFiles.spec.ts` checks the installed package's exact file list: in `dist/`, `index.js` and `index.d.ts` from
  tsup and `index.mjs` and `index.d.mts` from `scripts/write-esm-entry.mjs`, and nothing else, so a stale file from an
  earlier build cannot ship.
- Three compile-only files check the published types: `publicTypes.typecheck.ts`, every export and the types that must
  and must not compile; `publicTypes.emit.ts`, which a project with `declaration: true` must be able to emit without
  annotations, every public member returned on its own, so a type that is not exported fails it; and
  `stepLegacyDecorators.typecheck.ts`, `@step` under `experimentalDecorators` as well as under the standard decorators.
- `@step`'s legacy decorator calls are emitted by `tsc` and run against the package by the step-location check (see
  [tests and checks](/POMWright/internal/tests-and-checks/#type-checks)).

CI's `consumer` job installs the same tarball with npm into projects of their own: TypeScript under every module
resolution and from 5.0 to the latest release, attw, Playwright's runner in a CommonJS and an ESM project, and Node 20
loading both entries (see [CI](/POMWright/internal/tests-and-checks/#ci)).

## A build for testing before a release

The version in `package.json` is the last release until changesets bumps it in the *Version Packages* pull request,
so a tarball packed before then says so too. `pnpm pack:version 3.0.0-rc.1` builds and packs the package as npm would
publish it, sets the given version in the packed `package.json` only, and writes `pomwright-3.0.0-rc.1.tgz` at the
root. A project installs it as a `file:` dependency to try the build, and its lockfile and `npm ls` show which build it
has. The script, `scripts/pack-version.sh`, is run by hand only; the harness and CI use `pack-build.sh`.
