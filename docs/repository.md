# Repository map and toolchain

What each path of the repository is, how the package is built, the toolchain, and how the contributor guide is laid out
and loaded. Read it before adding a top-level file or folder, changing the toolchain or a dependency, or changing the
contributor guide. Part of the contributor guide that the root [AGENTS.md](../AGENTS.md) indexes; its rules apply here
too.

## Repository map

| Path | What it is | Edit? |
| --- | --- | --- |
| `index.ts` | Package entry. tsup bundles the CommonJS build from here; `scripts/write-esm-entry.mjs` then writes the ESM entry. | yes |
| `src/` | The runtime and its unit tests: see [src/AGENTS.md](../src/AGENTS.md), [src/locators/AGENTS.md](../src/locators/AGENTS.md) and [src/helpers/AGENTS.md](../src/helpers/AGENTS.md). | yes |
| `test/` | Standalone pnpm project that installs the packed package from `.pack/pomwright` and runs Playwright against it. See [test/AGENTS.md](../test/AGENTS.md). | yes |
| `website/` | The documentation site, a pnpm project of its own: see [website/AGENTS.md](../website/AGENTS.md). | yes |
| `skills/` | Agent skills in the Claude Code and claude.ai format, one folder per skill with its `SKILL.md` and the scripts it ships: `defect-review/`, an evidence-based defect review of a whole project, a change set or one area, with `scripts/review-status.mjs` (the status table, cost projections and cost caps of a review whose segments run as subagents). Not published (`package.json#files`), not on the site yet: kept for a later Skills section. biome checks the scripts but not the `SKILL.md` (it does not process `.md`). Their evals and test runs are not in the repository. | yes |
| `.changeset/` | Changesets config. `CHANGELOG.md` is generated from changesets at release time. | config only |
| `.github/` | The workflows and Dependabot's configuration: see [.github/AGENTS.md](../.github/AGENTS.md). | yes |
| `pack-build.sh`, `pack-extract.sh`, `pack-test.sh`, `test-server-check.sh`, `playwright.base.ts` | Build and pack the tarball and extract it into `.pack/pomwright`; the extraction; run the harness; check that no page of the test server loads from another host (see [test/AGENTS.md](../test/AGENTS.md)); shared Playwright config. | yes |
| `scripts/` | `write-esm-entry.mjs` (part of `pnpm build`), `check-doc-snippets.mjs` (compiles the TypeScript examples of the docs, the README and the doc comments), `check-api-coverage.mjs` (the API reference and the doc comments against the installed declarations), `check-error-messages.mjs` (*Error messages* against the messages in `src/`) and `check-playwright-retries.mjs` (`RETRY_PAUSES` against the installed Playwright's pauses before its actions' retries) and `generate-emit-members.mjs` (the declaration-emit check's module of every public member), all part of `pnpm typecheck` (see [website/AGENTS.md](../website/AGENTS.md)), `benchmark.mjs` (`pnpm bench`, the tables of *Internal → Performance*), `pack-version.sh` (`pnpm pack:version`, a tarball with a chosen version for trying a build elsewhere), `ci-playwright-version.sh` (the harness job's Playwright version for its `pin` or `latest` row, and the skip of a `latest` row equal to the pin; runs locally as it is), `consumer-check.sh` with its fixtures in `consumer/` (the `consumer` job's checks, run by hand as `bash scripts/consumer-check.sh [--node-floor] <tarball>`), `check-diagrams.mjs` (the `site` job's diagram check, `pnpm docs:diagrams`), `release-check.sh` (`pr.yaml`'s release window and `publish.yaml`'s guard, see [.github/AGENTS.md](../.github/AGENTS.md)) with `release-check.test.sh` (its test, run by the `lint` job; runs locally as it is), `lint-workflows.sh` (`pnpm lint:workflows`: actionlint and ShellCheck at pinned versions, the `lint` job's) and `check-guide-links.mjs` (`pnpm lint:guide`: the contributor guide's relative links and anchors, the `lint` job's). | yes |
| `vitest.config.ts` | Unit-test discovery limited to `src/**/*.test.ts`, node environment, so Playwright specs are never picked up; typecheck mode on, so `expectTypeOf` and `// @ts-expect-error` assertions are enforced, in `src/**/*.test.ts` and in the type-only `src/**/*.test-d.ts`. | yes |
| `tsconfig.vitest.json` | The tsconfig vitest's typecheck uses: extends the root, scoped to `src/`, target `es2024` (the root has no `include` and would sweep `dist/` and `test/`). | yes |
| `biome.json`, `tsconfig.json`, `.editorconfig` | Lint and format, strict TypeScript, tabs for code and two spaces for YAML and Markdown. | yes |
| `.vscode/` | Contributor editor settings: `extensions.json` recommends biome's extension, `settings.json` formats and fixes with it on save. | yes |
| `pnpm-workspace.yaml` | pnpm settings for the root: `allowBuilds`, the dependencies whose install scripts may run (see *Toolchain* below). It lists no packages: `test/` and `website/` stay projects of their own. | yes |
| `AGENTS.md`, `*/AGENTS.md`, `docs/` | The contributor guide: see *The contributor guide* below. | yes |
| `dist/`, `*.tgz`, `.pack/`, `node_modules/`, `.pnpm-store/`, `test/.doc-snippets/`, `test/.doc-examples/`, `test/.legacy-decorators/`, `website/dist/`, `website/.astro/` | Build and install artifacts, the snippet check's projects, `@step`'s legacy decorators as `tsc` emits them, and the site's build and generated types, gitignored. | no |

## The contributor guide

The root `AGENTS.md` holds what every task needs and indexes the rest. Six folders have an `AGENTS.md` for the work
under them: `src/`, `src/locators/`, `src/helpers/`, `test/`, `website/` and `.github/`. `docs/` holds what applies by
task rather than by folder: this file, versioning and releases.

How it loads: Claude Code 2.1.277 and later read the root `AGENTS.md` at the start, and a folder's `AGENTS.md` when
Claude reads a file in that folder or below it (checked 2026-10-28: a file one folder below loads it too). Codex reads
the `AGENTS.md` files from the repository root down to the folder it starts in, once, at the start, so started at the
root it reads only the root file, and the root index is how it finds the others.

There is no `CLAUDE.md`, by decision. By default Claude Code reads `AGENTS.md` only when no `CLAUDE.md`,
`.claude/CLAUDE.md` or `CLAUDE.local.md` is in the working directory or above it; with one, it reads `CLAUDE.md` files
only, and no folder's `AGENTS.md` would load. A personal `CLAUDE.local.md` counts too: to keep one, set *Project
instructions* to `claude-md-and-agents-md` in `/config`.

Where a rule goes: in the file that loads for every change that can trigger it. A rule triggered in one folder about
work in another (a message changed in `src/` is updated on the pages in `website/`) goes where the trigger is, or the
trigger's file points to it; a rule for several folders goes in their common parent, the root or `docs/`. A pointer in a
parent covers its subfolders.

## Packaging

- Packaging mirrors `@playwright/test`: one CommonJS build (`dist/index.js`, `dist/index.d.ts`) behind an `exports`
  map whose root has `import`, `require` and, last, `default` (the CommonJS build); `dist/index.mjs` and `dist/index.d.mts` are written by `scripts/write-esm-entry.mjs` and re-export that build
  by name, so `import` and `require` share one copy. Only the root and `pomwright/package.json` are importable.

## Toolchain

- Node 24 and pnpm 12.14.0 for contributors (the `packageManager` field of the root, `test/` and `website/`; CI's
  `pnpm/action-setup` steps name the same version; vitest needs Node 22.12 or later). Use pnpm only; pnpm 9.7 and later
  switch to the version the field names. pnpm runs no dependency's install script unless the root
  `pnpm-workspace.yaml` allows it (`allowBuilds`: esbuild, for tsup); a new one fails the install until it is allowed
  there, after a look at what it runs. Each lockfile pins pnpm itself by integrity. TypeScript is 6 (its compiler API
  is what tsup's declaration build, `check-api-coverage.mjs` and `check-error-messages.mjs` use, and 7 has none; the
  snippet check runs `tsc`); TypeScript 6 includes only the
  `@types` packages a tsconfig lists, so the root `tsconfig.json` lists `node`.
