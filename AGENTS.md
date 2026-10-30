# AGENTS.md

Persistent context and working rules for AI agents and humans contributing to POMWright. This file holds what every task
needs; the rest of the contributor guide is in an `AGENTS.md` in six folders and in `docs/`, and *The index* below says
which file to read before which work. Read this file fully, and each file the index names for your task, before changing
anything. Repo-specific facts here override generic defaults. Last revised 2026-10-29, with two principles of how to
work (the real thing over a stand-in; leaving the code better than you found it), after the fixes from the 3.0.2 defect
review and the guide split by folder and by task.

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
- How it is built and packaged: [docs/repository.md](docs/repository.md); its versions and releases: [docs/versioning.md](docs/versioning.md).

## How to work

- **Plan first.** A contract change (anything documented behavior relies on) goes through a plan, never in silently
  ([src/AGENTS.md](src/AGENTS.md)); [docs/releases.md](docs/releases.md) says how plans, decisions and a release's working folder are kept.
- **Verified claims only.** Every runtime or type claim in a plan, a page or a doc comment is backed by a probe or a
  test run ([test/AGENTS.md](test/AGENTS.md#probing)).
- **The real thing over a stand-in.** Whatever establishes what is true (a probe, a test at any level, a reproduction,
  a benchmark, exploratory testing, a review, a claim in a plan, page or doc comment) is based on what a user runs: the
  packed build, Playwright's runner, real browsers and pages, and realistic conditions (all three browsers, parallel
  workers, enough rounds to show a race, a machine about as small as CI's runner: `pnpm test:constrained`). A stand-in (a mock, a fake page, `page.route`, a hand-built document, a
  single worker, a small sample) is used only where the real thing cannot produce the case or costs far more than the
  claim is worth. A stand-in's result holds for the stand-in, so a claim that something does not happen is never made
  from one. Every stand-in MUST be disclosed where its result is reported (the plan, finding, report, reply, or the
  test's own comment): what it replaced, why, and what it could hide. A claim that only a stand-in backs is a gap.
- **Mirror Playwright**, in the code and in the docs: POMWright builds on Playwright's features and keeps their
  names, and links playwright.dev for what Playwright owns.
- **Leave the code better than you found it, by this guide's measure.** Work as the maintainer of this code a year from
  now, not only as the finisher of today's task. When a change would pile complexity onto a tangled area, say so and
  propose a refactor first, in the plan, with what it buys: a refactor preserves behavior and goes in commits of its
  own, and changing what `index.ts` exports is a contract change with its own decision and bump. Odd is not
  necessarily wrong here: POMWright is shaped by Playwright and the browsers it drives, so before calling code a
  problem, find its reason: its comment, the tests that pin it, the folder's AGENTS.md, the documentation pages (the
  Internal ones included), the changelog, a decision, or the commit that introduced it (`git log`, `git blame`). A
  reason makes code deliberate, not untouchable: when the reason no longer holds, or a better way would serve it,
  propose the change with the evidence; when you find no reason, raise it rather than change it, and the answer is
  written down, as the reason or as a plan. Add no unexplained special case, duplicated runtime logic or skipped test;
  grow the tests where you touch weakly tested code; name a deliberate shortcut, why, and its follow-up. Debt you
  notice and do not fix goes at the end of the task, with a suggested remedy, and into the plan's execution notes.
- **Commits only when asked.** Never commit on your own. When the user asks for one commit per execution step,
  commit exactly those steps, name the plan and step in the message, and leave everything else uncommitted.
- **A commit an AI wrote or helped write says so.** Its message ends with a `Co-Authored-By:` trailer naming the
  model, after a blank line, for example `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. This holds for
  every commit in the repository, not only release work: leaving the trailer out would misstate who wrote the change.

## Commands

- `pnpm install --frozen-lockfile`
- `pnpm lint` runs `biome check --error-on-warnings .`, so a warning fails it and CI (lint, import order and format check over the whole repository; biome does not
  process `.md`; `test/test-data` and `.pack` are excluded). `pnpm format` (`biome format --write .`) rewrites
  formatting only; import order and lint fixes come from `biome check --write`. `pnpm lint:workflows` runs actionlint
  and ShellCheck over the workflows at CI's pinned versions, and `pnpm lint:guide` checks every relative link and
  anchor of this guide; CI's `lint` job runs both.
- `pnpm build` runs `tsup index.ts --format cjs --dts --clean`, which empties `dist/` first, then
  `scripts/write-esm-entry.mjs`, so a local pack holds exactly what the source produces, as CI's fresh checkout does.
- `pnpm test:unit` runs the vitest unit tests for the pure helpers in seconds and type-checks the test files and
  what they import (vitest typecheck mode; `vitest` is pinned exactly because the mode is experimental). `pnpm test`
  runs them and then `pack-test`.
- `pnpm pack-test` is the authoritative integration run and needs no sudo: `pack-build.sh` (frozen root install,
  build, pack `pomwright-test-build.tgz`, extract into `.pack/pomwright`), a frozen install of `test/`, `tsc` over
  `test/`, `playwright install` (browsers only), then every project (chromium, firefox, webkit). Arguments go to
  `playwright test`, for example `pnpm pack-test --project=chromium tests/testApp/testIds.spec.ts --reporter=line`;
  outside CI it ends with `test-server-check.sh`, which checks that no page of the test server loads from another host.
  Use the line reporter in non-interactive runs, because the local html reporter opens on failure and blocks.
  Playwright's system libraries are a once-per-machine step (`pnpm -C test exec playwright install-deps`, with
  sudo; `install-deps --dry-run` lists what is missing without it).
- The other test commands are in [test/AGENTS.md](test/AGENTS.md), the site's scripts in [website/AGENTS.md](website/AGENTS.md).

## Do not

- Edit `CHANGELOG.md` or `package.json#version`.
- Commit `dist/`, `.pack/`, `*.tgz`, `test/node_modules`, or Playwright reports.
- Change the Playwright peer range or the `test/` pin without a decision.
- Treat `dist/` or `.pack/` as source when counting, grepping, or reasoning about behavior.
- Commit without being asked, or commit what an AI wrote or helped write without its `Co-Authored-By:` trailer.
- The other *Do not* items close each file the index names: read them with the file.

## The index

| File | What it holds | Loads by itself | Read it first when |
| --- | --- | --- | --- |
| [src/AGENTS.md](src/AGENTS.md) | the runtime's conventions, the `PageObject` lifecycle, pointers to rules held elsewhere | in Claude Code, when a file under `src/` is read | changing `index.ts` |
| [src/locators/AGENTS.md](src/locators/AGENTS.md) | registration, queries, reuse, paths, frames, `getById`, the `STRATEGIES` table | in Claude Code, when a file under `src/locators/` is read | changing locator behavior, a locator spec or a locator page |
| [src/helpers/AGENTS.md](src/helpers/AGENTS.md) | session storage, `@step` and where steps are reported, the logger and the `log` fixture, URLs and navigation | in Claude Code, when a file under `src/helpers/` is read | changing `src/fixture/`, the storage, navigation or URL specs, `test/step-locations/` or their pages |
| [test/AGENTS.md](test/AGENTS.md) | the test commands, probing, the harness | in Claude Code, when a file under `test/` is read | running a test command beyond the ones below; probing a claim; changing `pack-*.sh`, `playwright.base.ts` or `vitest.config.ts` |
| [website/AGENTS.md](website/AGENTS.md) | the site, the README, doc comments, the docs checks, the site's scripts | in Claude Code, when a file under `website/` is read | changing the README or a doc comment; adding an export or a public member; changing anything a page or doc comment describes: behavior, a message, chain or rendering, a mechanism or a design (most changes under `src/` and `.github/`); changing `scripts/check-*.mjs` |
| [.github/AGENTS.md](.github/AGENTS.md) | the workflows, Dependabot, how Publish and Pages run, the packaging probes | in Claude Code, when a file under `.github/` is read | changing a script only CI runs or the packaging probes |
| [docs/repository.md](docs/repository.md) | the repository map, packaging, the toolchain, how this guide is laid out and loads | no | adding a top-level file or folder; changing the toolchain, a dependency or this guide |
| [docs/versioning.md](docs/versioning.md) | supported versions, bumps, changesets | no | any consumer-facing change, which needs a changeset; moving a supported version |
| [docs/releases.md](docs/releases.md) | planning a release, its working folder, carrying it out, the Trusted Publisher, the backlog | no | planning or carrying out a release; writing a plan |

- Claude Code loads a folder's `AGENTS.md` when it reads a file in that folder or below it, together with the
  `AGENTS.md` of every folder above; other clients, Codex among them, load only the files from the repository root to
  the folder they started in. So with another client, or for work that touches a folder without reading a file in it,
  read the folder's file yourself before working there.
- Before starting, name the areas your task touches and read their files. When it spans several areas or the whole
  repository (a review, a refactor across areas, a release, a plan that changes more than one area), read all of their
  files first rather than as you reach each folder.
