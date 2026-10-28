<!-- Saved by the orchestrator from the segment agent's final message: the agent's own write of this file was refused by
the harness rule "Subagents should return findings as text, not write report files". The text below is the agent's,
unchanged. -->

# Segment 2I: the contributor guide, summary

The second defect review of POMWright, segment 2I, at `d850405` (`fix/review-3-0-2`), in the worktree
`/home/magdys/workspace/dyhex/POMWright-second-review`. Reviewer: Opus 5.5, second review, segment 2I. Work from
2026-10-28 19:44 to 20:18 +0100 (times in [log.md](log.md)). Probes and notes:
`/home/magdys/workspace/dyhex/POMWright-second-review-probes/I/`. Scope: the ten guide files as an area, the repository
files they describe, the Internal pages' and the README's claims about the guide, and the commits since `v3.0.1` on
those paths as a change set (the split `9923a9f` and `6d1de0e` first).

## What I read

- `skills/defect-review/SKILL.md` (the worktree's copy), `segments.md`, `baseline.md`, `brief.md`.
- The ten guide files in full: `AGENTS.md`, `src/AGENTS.md`, `src/locators/AGENTS.md`, `src/helpers/AGENTS.md`,
  `test/AGENTS.md`, `website/AGENTS.md`, `.github/AGENTS.md`, `docs/repository.md`, `docs/versioning.md`,
  `docs/releases.md`; the pre-split `AGENTS.md` (`9923a9f^`), compared sentence by sentence.
- `.editorconfig`, `biome.json`, `.gitignore`, `.vscode/*`, `tsconfig.json`, `tsconfig.vitest.json`,
  `pnpm-workspace.yaml`, `package.json`, `vitest.config.ts`, `index.ts`, `playwright.base.ts`, `pack-*.sh`,
  `test-server-check.sh`, `scripts/pack-version.sh`, the workflows `checks.yaml`, `pr.yaml`, `main.yaml`,
  `dependabot.yml` (and the triggers of `publish.yaml` and `pages.yaml`), `test/package.json`, `test/tsconfig.json`,
  `test/playwright*.config.ts`, the routes of `test/server.js`, `website/package.json`, `website/astro.config.mjs`.
- `website/src/content/docs/internal/index.md` and `internal/documentation.md`; README *Contributing*.
- Claude Code's *How Claude remembers your project* and Codex's AGENTS.md page (fetched; the first saved in
  `web/claude-code-memory.md`); Playwright's release notes for 1.59 to 1.64.
- From pass 2: the first review's H brief and summary, H-4, H-5, A-8, G-5, G-9, G-11, F-4, report.md's ledger, test
  gaps and sound lines, `inventory.md` §9–§11, `DECISIONS.md` 4–7, 34, 35, 47, 51, 52, 54, 62, 63, 72–78,
  `PLAN-agents-split.md`, `PLAN-release-gates-and-audit.md`, `PLAN-H-6-spelling.md`'s notes.

## Coverage

| Inventory line ([reconciled](inventory-reconciled.md)) | Reviewed | How |
| --- | --- | --- |
| Every statement of the ten files against the repository | fully | identifiers grepped, layouts and routes listed, versions read from manifests, commands run |
| The index (rows, "Loads by itself", "Read it first when") | fully | against each file's content; five tasks traced |
| Loading in Claude Code and Codex | fully against their docs; not probed in a session | the brief rules out starting a session |
| Placement and reach | fully | every cross-area rule traced to its trigger |
| The split as a change set | fully | sentence comparison (336 sentences) and plan 43's ledger |
| The described config files and the top-level layout | fully | read; `pnpm lint`; `biome check` on `.md`; `allowBuilds` probe |
| `package.json` scripts | fully, except `bench`, `docs:dev`, `docs:preview` | ran lint, test:unit, harness:install, typecheck, pack:version, the root's example pack-test |
| Internal pages and README about the guide | fully | read against the guide and the workflows |
| Practice (trailers, *Do not* lists, working folder, rule 7, changesets) | fully | git log, git grep, ls-files |
| The workflows' behaviour behind `.github/AGENTS.md` | not (2G's) | text checked against the files only |
| The runtime contracts the folder files state | not (2A–2E's) | names checked only |

Not run: `pnpm bench`, `pnpm docs:dev`, `pnpm docs:preview` (scripts and ports read; the baseline did not run bench);
the harness on firefox and webkit, Node 20 and 22 (nothing in this segment depends on them; the baseline ran them);
Claude Code or Codex sessions (ruled out by the brief).

## Test gaps, most important first

1. **Nothing checks where a rule sits against what triggers it.** The placement rule (`docs/repository.md` *The
   contributor guide*) is kept by hand; 2I-1, 2I-2 and 2I-8 are what slipped. A short table in `docs/repository.md` of
   triggers and the file each loads (plan 43's execution notes have the start of one) would make a review of it
   mechanical.
2. **Rule 7 (no reference to a plan outside the working folder) is checked by hand**, and one reference passed two
   audits (2I-6). The `git grep` in 2I-6 could be a step of the audit, or a line in a docs check.
3. **The guide's links and anchors are not checked by any CI job** (biome does not read `.md`; the site's link check
   covers `website/` only). Today all 55 resolve (`scripts/guide-links.mjs`); plan 43 checked them once.
4. **No check ties the guide's lists to the tree** (routes, spec folders, compile-only probes, the repository map):
   items 3, 4, 8, 9 and 12 of 2I-7, and the first review's H-5, all drifted silently. The test-server spec already reads
   the routes from Express's router; the same list could be compared with `test/AGENTS.md`.
5. **Workflows have no local lint command in the guide**: actionlint runs only in CI's `lint` job, pinned in its step;
   a contributor changing a workflow learns of a problem after a push.

## What is sound

- **The split lost nothing**: every sentence of `9923a9f^:AGENTS.md` is in exactly one of the ten files, apart from
  cross-references, dropped counts and split lists (`split/missing-vs-head.txt`); plan 43's own ledger agrees.
- **The public API list** in `AGENTS.md` lines 19–27 names all 40 exports of `index.ts`.
- **Every identifier** the folder files name exists in `src/` (35 grepped).
- **Commands as written**: `pnpm lint` exit 0; `pnpm test:unit` exit 0 (904 tests, no type errors); `pnpm
  harness:install` exit 0; `pnpm typecheck` exit 0 (snippets 226/12, API 40/108/0 problems, messages ok); `pnpm
  pack:version 0.0.0-probe-2i` exit 0 (packed version set, `.pack/` and the harness tarball untouched); `pnpm pack-test
  --project=chromium tests/testApp/testIds.spec.ts --reporter=line` exit 0 in 13 s, ending with the test-server check
  as the root says; `playwright install-deps --dry-run` exit 0.
- **Toolchain facts**: Playwright 1.64.0 `engines` `>=20`; vitest 5.0.5 `^22.12 || ^24 || >=26`; Astro 7.4.0
  `>=22.22.0`; TypeScript 6.0.3; pnpm 12.14.0 in the three manifests, lockfiles and every `pnpm/action-setup`; an install
  with an unapproved build script fails (`ERR_PNPM_IGNORED_BUILDS`, probe in `pnpm-builds/`), as `docs/repository.md`
  says.
- **biome does not process `.md`** (`biome check README.md AGENTS.md docs/releases.md`: "No files were processed").
- **Test-server routes**: all 27 named in `test/AGENTS.md` (`run1/H-5`).
- **Codex's loading** as the guide states it matches Codex's docs; the root plus any one folder chain stays under its
  32 KiB default (largest 23.8 KB).
- **No `CLAUDE.md`** (nor `CLAUDE.local.md` or `.claude/`) anywhere in the tree, as decided; the `CLAUDE.md` rules the
  guide quotes match Claude Code's docs.
- **The 2.x docs at the tag**: `v2.1.0` has `docs/v2`; `08bdcac^:release-3.0.0/DECISIONS.md` resolves.
- **Practice**: every commit since the trailer rule (`a49709d`, 67 commits) carries `Co-Authored-By:`; no edit of
  `CHANGELOG.md` or the version since `v3.0.1`; no peer-range change; no tracked build output; no `sudo` in scripts; 50
  pending changesets, all patch, none starting with a heading.
- **Relative links**: 55 links and anchors across the ten files and the README resolve (`scripts/guide-links.mjs`; the
  other two matches are a code span).
- **The first review's guide findings** H-4, H-5/A-8, R-1, G-11 and the guide parts of F-4 and G-5 are fixed
  ([first-review.md](first-review.md)).

## Outside the segment

- **[2H] A British spelling on an Internal page**: `website/src/content/docs/internal/page-object-lifecycle.md` line 29,
  "initialiser" (since `5ab09ea`), against `website/AGENTS.md`'s "American spelling" and decision 52; H-6 and plan 38's
  search missed it (their patterns did not match "-iser").
- **[2G] `pr.yaml`'s header comment** (lines 3–4) still says the pull-request harness runs "also on Node 20, the engines
  floor"; `d850405` changed the inline comment to "Node 20 and 22" but not the header.
- **[2H/2G] 2I-4's sentence** is about CI on an Internal page; filed here because the page is in this brief.
- **[2T] 2I-6's comment** is in a spec; filed here because the rule it breaks is the guide's.

## Pass 2 outcomes

From [first-review.md](first-review.md): fixed 7 (H-4, H-5, A-8, R-1, G-11, F-4's guide part, G-5's guide part); fixed
differently 2 (F-5, H-8); still present, decided 1 (R-4, decision 54); fixed incompletely 1 (G-9 → 2I-9); not fixed 0;
regressed 0; cannot re-run 0. One *what is sound* claim of the first review did not hold (no plan reference outside the
folder → 2I-6). The first review's five H test gaps are closed.

## What passes 3 and 4 changed

- Pass 3 found two blind spots of pass 1, both fixed since (H-4's sentence, F-4's list), and marked every pass-1
  finding new since `54cdada` except 2I-6 (missed) and parts of 2I-7.
- Pass 2 moved pass 1's 2I-7 item 10 (`.editorconfig` and `index.mdx`) into its own finding 2I-9 (G-9 fixed
  incompletely), added 2I-7 item 12 (the compile-only probes sentence), and reframed 2I-5 by decisions 5 and 62 (the
  practice was decided; the guide was not updated).
- Pass 4 added to 2I-2 the Playwright floor's docs places (b′) and the split *Do not* item on a second build (c′), and to
  2I-1 the site-dependency rule; it checked the guide's links (sound).

## Findings

| ID | Kind | Severity | Semver | Pass | First review | One line |
| --- | --- | --- | --- | --- | --- | --- |
| [2I-1](defect-2I-1-dev-dependency-rule-in-src.md) | documentation | Low | none | 1, 4 | new since 54cdada (9923a9f, 6d1de0e) | The dev-dependency rule (and the site-dependency rule) sit in folder files a dependency change in the root, `test/` or `website/` never reaches; `docs/repository.md`, where the index sends that task, states neither |
| [2I-2](defect-2I-2-rules-their-trigger-does-not-reach.md) | documentation | Medium | none | 1, 4 | new since 54cdada (9923a9f, 6d1de0e) | Page updates after a mechanism or behaviour change, what moves with the Node and Playwright floors, the bench rerun and a split *Do not* item are held where their trigger's file and the index do not lead |
| [2I-3](defect-2I-3-claude-code-loading-claim.md) | documentation | Low | none | 1 | new since 54cdada (6d1de0e) | The guide says Claude Code loads a folder's file when "a file is read"; its docs say a Read-tool open, under the working directory, on supported sessions |
| [2I-4](defect-2I-4-internal-documentation-ci-paragraph.md) | documentation | Low | none | 1 | new since 54cdada (f866325, 429f2c2) | *Internal → Documentation* says the site job runs "all three checks … on every change that touches code or the pages"; it runs every time, two of four checks, and the harness runs the error-message check |
| [2I-5](defect-2I-5-working-folder-rules-vs-practice.md) | documentation | Low | none | 1, 2 | new since 54cdada (a49709d) | `docs/releases.md` describes `release-<version>/` and one plan per item; the 3.0.2 work, by decisions 5 and 62, uses `defect-review-result/`, grouped plans and no release notes, and the audit did not update the guide |
| [2I-6](defect-2I-6-plan-reference-left-in-a-spec.md) | documentation | Low | none | 1 | missed by the first review | `registry.verify.spec.ts:7` cites "the plan's section 1.9" as its contract, a deleted 3.0.0 plan, against rule 7 |
| [2I-7](defect-2I-7-guide-statements-that-do-not-match.md) | documentation | Low | none | 1, 2 | items 1–6, 10 new; 7–9, 11, 12 missed | Twelve small mismatches: *Do not* sections, "below", `vitest.config.ts` and `test-server-check.sh` in the index, "versions and releases", "Rules 8 and 9", `.changeset/` "config only", the map's gaps and `CODEOWNERS`, the page-object layout, the README's folder list, "CI" in two senses, two of three compile-only probes |
| [2I-8](defect-2I-8-subfolder-files-do-not-point-to-src.md) | documentation | Low | none | 1 | new since 54cdada (6d1de0e) | With another client the guide says to read "the folder's file"; `src/locators/` and `src/helpers/` never point to `src/AGENTS.md`, which holds rules about their files |
| [2I-9](defect-2I-9-editorconfig-mdx.md) | documentation | Low | none | 2 | G-9: fixed incompletely | `.editorconfig` puts `.mdx` under two-space indentation "as every such file here is"; the one `.mdx` page uses tabs |

Counts: 0 defects, 9 documentation, 0 suspected, 0 design questions. No source sketch is proposed: every fix is guide,
page, comment or config text.
