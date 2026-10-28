# Segment 2I inventory (blind pass)

The contributor guide at `d850405`, mapped before reading anything of the first review. One line per item: what it is,
the files, where the guide states it, and how this pass checked it. *Probe* names a command run in this pass; *read*
means compared by reading against the files named.

## The guide's files

| Item | Files | Checked |
| --- | --- | --- |
| Root guide: what POMWright is, how to work, commands, *Do not*, the index | `AGENTS.md` (94 lines) | read in full; public API list against `index.ts` (40 exports, all named); peer range, `engines`, Playwright's own `engines` (probe: `node -e` on the installed manifests) |
| The runtime's conventions, `PageObject` lifecycle, pointers | `src/AGENTS.md` (71) | read; every identifier it names grepped in `src/` (present); `biome-ignore` justifications (all have one); no `@internal`/`stripInternal`; `UrlTypeOptions` absent; `BUNDLE_FRAME` in `callSite.ts:5` |
| Locator contracts | `src/locators/AGENTS.md` (95) | read; the 25 identifiers of *Files* grepped (present); behaviour is 2B/2C's |
| Helper contracts: storage, steps, logger, URLs | `src/helpers/AGENTS.md` (92) | read; identifiers grepped (present); behaviour is 2A/2D/2E's |
| Test commands, probing, the harness | `test/AGENTS.md` (134) | read; `pnpm typecheck`'s seven steps against `package.json`; server routes against `test/server.js` (match); spec folders and files listed; path aliases; page-object layout (differs, see 2I-7) |
| Site, README, doc comments, docs checks, site scripts | `website/AGENTS.md` (135) | read; site files, ports 4391/4392, Astro `engines` >=22.22.0, v2.1.0 tag with `docs/v2`, `check-error-messages.mjs` type list, `INTERNAL`/`PASS_THROUGH`, `check-api-coverage.mjs` default path |
| Workflows, Dependabot, Publish and Pages, packaging probes | `.github/AGENTS.md` (79) | read against `checks.yaml`, `pr.yaml`, `main.yaml`, `dependabot.yml`, `publish.yaml`/`pages.yaml` triggers; workflow behaviour is 2G's |
| Repository map, packaging, toolchain, how the guide loads | `docs/repository.md` (65) | read; map rows against the tracked top level; toolchain versions; `allowBuilds` (probe: install without it fails, `ERR_PNPM_IGNORED_BUILDS`); lockfiles pin pnpm 12.14.0 |
| Supported versions, bumps, changesets | `docs/versioning.md` (37) | read; TypeScript floor's three places; quoted promises on *Types*, *TypeScript*, *Installation*; `.changeset/config.json`; 50 pending changesets, all patch, none starts with a heading |
| Release planning, working folder, carrying out, backlog | `docs/releases.md` (69) | read; against the commits since `54cdada` (their `Plan:` lines and messages); `08bdcac^:release-3.0.0/DECISIONS.md` exists (`git cat-file -e`, content not read) |

## How the guide is laid out and loads

| Item | Where stated | Checked |
| --- | --- | --- |
| Six folder files plus `docs/` | `AGENTS.md` intro and index; `docs/repository.md` *The contributor guide* | probe: `find` lists exactly seven `AGENTS.md` (root + six); no `CLAUDE.md`, `CLAUDE.local.md`, `.claude/` |
| Claude Code loading (root at start, a folder's file when a file in or below it is read, folders above too; 2.1.277+) | `AGENTS.md` *The index* bullets and "Loads by itself" column; `docs/repository.md` | Claude Code's memory page (fetched, saved in the probes folder): narrower (2I-3) |
| Codex loading (root down to the start folder, once) | same | Codex's AGENTS.md page (fetched): matches; combined sizes under its 32 KiB default |
| No `CLAUDE.md` by decision; `CLAUDE.local.md` counts; `claude-md-and-agents-md` | `docs/repository.md` | Claude Code's page: matches |
| Placement rule: a rule goes in the file that loads for every change that can trigger it; several folders, the root or `docs/` | `docs/repository.md` *The contributor guide* | traced cross-area rules (2I-1, 2I-2) |
| The index's rows: what each holds, when to read it first | `AGENTS.md` *The index*; each file's intro | read against each file's content (2I-7 items) |
| Do-not lists close each file | `AGENTS.md` *Do not* | `docs/` files have none (2I-7) |

## The split (9923a9f, 6d1de0e) as a change set

| Item | Checked |
| --- | --- |
| Every sentence of the pre-split `AGENTS.md` (`9923a9f^`) arrives somewhere | probe: `scripts/sentence-diff.mjs`: 336 sentences, 282 verbatim, 54 changed only in cross-references, dropped counts, split lists or later commits; every split list item found in one file |
| Cross-references after the split (`section N`, old `docs/*.md` names, `CLAUDE.md`) | grep: none stale except "Rules 8 and 9" (2I-7) |
| Index rows of 9923a9f against 6d1de0e | read: "a release" dropped from the CI row; "any change under `src/`" became auto-loading (2I-2) |
| Commits after the split touching the guide (0905892, ac0832c, 6d8642f, d850405) | read; `test-server-check.sh` not added to the index (2I-7) |

## The repository files the guide describes

| Item | Checked |
| --- | --- |
| `.editorconfig` | read; the claim "as every such file here is" against tracked `.md`/`.mdx`/`.yaml` (2I-7) |
| `biome.json` | read; probe: `pnpm lint` exit 0 (178 files); `biome check` on `.md` processes nothing |
| `.gitignore` | read; every artifact the guide names is ignored; worktree clean after a pack-test run |
| `.vscode/` | read: biome extension, format and fix on save |
| `tsconfig.json`, `tsconfig.vitest.json` | read: strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `types: ["node"]`; vitest's es2024 scoped to `src/` |
| `pnpm-workspace.yaml` | read: `allowBuilds: esbuild`, no packages |
| `package.json` scripts | read against the guide's commands; probes: `pnpm lint`, `pnpm test:unit` (exit 0, 904 tests), the root's example `pnpm pack-test --project=chromium tests/testApp/testIds.spec.ts --reporter=line` (exit 0, 13 s, ends with the test-server check) |
| Top-level layout | non-recursive listing; tracked top level against the map (2I-7) |
| `vitest.config.ts`, `playwright.base.ts`, `pack-*.sh`, `test-server-check.sh` | read against the guide |

## The pages and the README about the guide

| Item | Checked |
| --- | --- |
| `internal/index.md`: rules are in `AGENTS.md` and the files it indexes | read: holds |
| `internal/documentation.md`: rules in `website/AGENTS.md`, the summary of them; CI's site job | read against `checks.yaml` (2I-4) |
| README *Contributing* | read (2I-7) |

## Practice against the guide

| Item | Checked |
| --- | --- |
| `Co-Authored-By:` trailer | git log: the rule entered at `a49709d` (2026-10-27); all 67 commits since carry it |
| Do-not lists | git log/ls-files: no CHANGELOG or version edit since v3.0.1, no peer-range change, no tracked artifacts, no `sudo` in scripts, `file:` dependency is a directory |
| Working folder and plans | commit `Plan:` lines: `defect-review-result/PLAN-*.md`, several grouping three or four items (2I-5) |
| No reference to a plan, finding or decision outside the working folder | git grep over `src`, `test`, `scripts`, `website`, workflows, README: one left (2I-6) |
| Changesets start with a sentence | all 50 do |
