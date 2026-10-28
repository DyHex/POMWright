# AGENTS.md

Persistent context and working rules for AI agents and humans contributing to POMWright. This file holds what every
task needs; the rest of the contributor guide is in `docs/`, one file per area, and *The index* below says which file
to read before which work. Read this file fully, and each file the index names for your task, before changing
anything. Repo-specific facts here override generic defaults. Last revised 2026-10-28, with the fixes from the 3.0.2
defect review and the guide split into this index and `docs/`.

`CLAUDE.md` holds only `@AGENTS.md`: Claude Code reads it in this file's place when both exist, and the import loads
this file once (see [repository](docs/repository.md) for why it is not a symlink).

## What POMWright is

- A TypeScript companion library for `@playwright/test`, published to npm as `pomwright` under Apache-2.0. Peer
  range `@playwright/test >=1.64.0 <2.0.0` (1.59 made `addInitScript` return a `Disposable`, 1.61 added
  `page.sessionStorage`, 1.63 the any-frame `frameLocator()`, 1.64 the per-element regex reset that makes every RegExp flag deterministic). Playwright is never a runtime
  dependency. Node 20 or later (`engines`), Playwright's own floor; re-read it from Playwright's `engines` whenever
  the peer floor moves.
- Core idea: register one locator definition per dot-delimited path (`"main.form.submit"`) in a `LocatorRegistry`,
  and POMWright composes the full Playwright locator chain from the path. The registry, `PageObject`,
  `SessionStorage`, the `log` fixture and the `step` decorator are each usable on their own.
- The public API is exactly what the root [index.ts](index.ts) re-exports: `test` (fixture providing `log`),
  `PageObject` with `PageObjectTypeOptions`, `PageObjectOptions` (its constructor options) and the `*TypeFromOptions`
  helpers, `createRegistryWithAccessors` with `LocatorRegistryOptions`, the accessor types, the `LocatorRegistry` type (`add`, `createReusable`, `getLocator`, `getLocatorSchema`,
  `getNestedLocator`, `verify`), what the registry hands out (`LocatorQueryBuilder`, `LocatorUpdateBuilder`,
  `ReusableLocator`, `ReusableLocatorFactory`, `FilterDefinition`, `IndexSelector`) and the path types (`LocatorSchemaPathFormat`,
  `LocatorSchemaPathArgument`), `SessionStorage` with the `json` codec and the `Codec`, `SessionStorageSchema`,
  `SessionStorageOptions`, `SeedOptions`, `Decoded` and `AllEntries` types, `PlaywrightReportLogger` with `LogEntry` and `LogLevel`, `step` with `StepDecorator`, `NavigationFor`, `NavigationOptions`,
  `ThisPageOptions` and `UrlMatcher`. Everything else under `src/` is internal even when it carries an `export`
  keyword, so renaming or deleting it is not by itself a breaking change.
- How it is built and packaged: [repository](docs/repository.md); its versions and releases:
  [versioning](docs/versioning.md).

## How to work

- **Plan first.** A contract change (anything documented behavior relies on) goes through a plan, never in silently
  ([code conventions](docs/code-conventions.md)); [release planning](docs/release-planning.md) says how plans,
  decisions and a release's working folder are kept.
- **Verified claims only.** Every runtime or type claim in a plan, a page or a doc comment is backed by a probe or a
  test run ([testing](docs/testing.md), *Probing*).
- **Mirror Playwright**, in the code and in the docs: POMWright builds on Playwright's features and keeps their
  names, and links playwright.dev for what Playwright owns.
- **Commits only when asked.** Never commit on your own. When the user asks for one commit per execution step,
  commit exactly those steps, name the plan and step in the message, and leave everything else uncommitted.
- **A commit an AI wrote or helped write says so.** Its message ends with a `Co-Authored-By:` trailer naming the
  model, after a blank line, for example `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. This holds for
  every commit in the repository, not only release work: leaving the trailer out would misstate who wrote the change.

## Commands

- `pnpm install --frozen-lockfile`
- `pnpm lint` runs `biome check --error-on-warnings .`, so a warning fails it and CI (lint, import order and format check over the whole repository; biome does not
  process `.md`; `test/test-data` and `.pack` are excluded). `pnpm format` (`biome format --write .`) rewrites
  formatting only; import order and lint fixes come from `biome check --write`.
- `pnpm build` runs `tsup index.ts --format cjs --dts --clean`, which empties `dist/` first, then
  `scripts/write-esm-entry.mjs`, so a local pack holds exactly what the source produces, as CI's fresh checkout does.
- `pnpm test:unit` runs the vitest unit tests for the pure helpers in seconds and type-checks the test files and
  what they import (vitest typecheck mode; `vitest` is pinned exactly because the mode is experimental). `pnpm test`
  runs them and then `pack-test`.
- `pnpm pack-test` is the authoritative integration run and needs no sudo: `pack-build.sh` (frozen root install,
  build, pack `pomwright-test-build.tgz`, extract into `.pack/pomwright`), a frozen install of `test/`, `tsc` over
  `test/`, `playwright install` (browsers only), then every project (chromium, firefox, webkit). Arguments go to
  `playwright test`, for example `pnpm pack-test --project=chromium tests/testApp/testIds.spec.ts --reporter=line`.
  Use the line reporter in non-interactive runs, because the local html reporter opens on failure and blocks.
  Playwright's system libraries are a once-per-machine step (`pnpm -C test exec playwright install-deps`, with
  sudo; `install-deps --dry-run` lists what is missing without it).
- The other test commands are in [testing](docs/testing.md), the site's scripts in
  [documentation](docs/documentation.md).

## Do not

- Edit `CHANGELOG.md` or `package.json#version`.
- Commit `dist/`, `.pack/`, `*.tgz`, `test/node_modules`, or Playwright reports.
- Change the Playwright peer range or the `test/` pin without a decision.
- Treat `dist/` or `.pack/` as source when counting, grepping, or reasoning about behavior.
- Commit without being asked, or commit what an AI wrote or helped write without its `Co-Authored-By:` trailer.
- The other *Do not* items close each file in `docs/`: read them with the file.

## The index

Read a file before the work its row names. A task that touches several areas reads each of their files.

| File | What it holds | Read it before |
| --- | --- | --- |
| [repository](docs/repository.md) | the repository map, packaging, the toolchain | adding a top-level file or folder; changing the toolchain or a dependency |
| [testing](docs/testing.md) | the test commands, probing, the harness in `test/` | running, writing or changing tests or probes; changing `test/`, `pack-*.sh`, `playwright.base.ts` or `vitest.config.ts` |
| [code conventions](docs/code-conventions.md) | style, public types, messages, call sites, refactors, dependencies | any change under `src/` or to `index.ts` |
| [locator contracts](docs/locator-contracts.md) | registration, queries, reuse, paths, frames, `getById`, the `STRATEGIES` table | changing `src/locators/`, its unit tests, the `locatorRegistry/` specs or the locator pages |
| [page object contracts](docs/page-object-contracts.md) | the `PageObject` lifecycle, URLs, navigation | changing `src/pageObject.ts`, `src/helpers/url.ts` or `src/helpers/navigation.ts`, their tests or their pages |
| [session storage contracts](docs/session-storage-contracts.md) | values and codecs, turns, origin checks, `seed` | changing `src/helpers/sessionStorage.ts`, `sessionStorageSeed.ts` or `storageTurns.ts`, their tests or their pages |
| [steps and logging](docs/steps-and-logging-contracts.md) | `@step`, where steps are reported, the logger, the `log` fixture | changing `stepDecorator.ts`, `callSite.ts`, `playwrightReportLogger.ts`, `thenable.ts`, `src/fixture/` or `test/step-locations/`, or a step a helper opens |
| [versioning](docs/versioning.md) | supported versions, bumps, changesets, the changelog | any consumer-facing change, which needs a changeset; moving a supported version |
| [CI and publishing](docs/ci-and-publishing.md) | the workflows, Dependabot, publishing, the packaging probes | changing `.github/` or a script only CI runs; a release |
| [documentation](docs/documentation.md) | the site, the README, doc comments, the docs checks, the site's scripts | changing `website/`, the README or a doc comment; adding an export or a public member; changing a message, chain or rendering a page shows |
| [release planning](docs/release-planning.md) | working folders, plans, decisions, the backlog | planning a release, or working from its folder |
