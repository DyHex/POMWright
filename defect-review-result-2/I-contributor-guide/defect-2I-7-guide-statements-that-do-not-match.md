# 2I-7: Twelve small statements of the guide, its index and the README do not match the repository at `d850405`

- **Kind**: documentation
- **Area**: the contributor guide's accuracy: the index, the repository map, cross-references, and the README as the guide describes it
- **Severity**: Low (each is a wrong pointer, count or description; none hides a rule, which 2I-1 and 2I-2 cover)
- **Semver of the fix**: none (guide and README text only)
- **Pass**: 1 (items 1–11); 2 (item 12, found while re-running F-4)
- **First review**: items 1–6 and 10 new since 54cdada (9923a9f, 6d1de0e, 0905892, as noted per item); items 7, 8, 9, 11 and 12 missed by the first review (present at 54cdada). Pass 1's item 10 (`.editorconfig` and the `.mdx` page) became 2I-9 when pass 2 tied it to G-9
- **Reviewed**: `d850405`, 2026-10-28 20:05 +0100, Opus 5.5, second review, segment 2I

## Contract

`AGENTS.md` lines 3–6: the guide holds "Persistent context and working rules … Repo-specific facts here override generic
defaults"; `docs/repository.md` line 3: "What each path of the repository is". The brief's question: does every
statement still describe the repository? One finding for twelve items, since they share a fix (one pass over the text)
and a severity.

## Reproduction

Each item: the text, with file and line, and what the repository has. Commands run from the worktree root.

1. **Do-not sections.** `AGENTS.md` line 72: "The other *Do not* items close each file the index names: read them with
   the file." `grep -c '^## Do not'` gives 1 for each of the seven `AGENTS.md` files and 0 for `docs/repository.md`,
   `docs/versioning.md` and `docs/releases.md`, all three named by the index. (9923a9f; the `docs/` files had none then
   either.)
2. **"below".** `AGENTS.md` line 81, the `test/AGENTS.md` row: "running a test command beyond the ones below". *Commands*
   is at line 44, above the index (line 74). (6d1de0e)
3. **`vitest.config.ts` sends to a file that does not cover it.** The same row and `test/AGENTS.md` line 5 send "changing
   … `vitest.config.ts`" to `test/AGENTS.md`; `grep -n -i vitest test/AGENTS.md` matches only line 5. The vitest config is
   described in `docs/repository.md` lines 21–22 and the root's `pnpm test:unit` (lines 52–54). (9923a9f/6d1de0e)
4. **`test-server-check.sh` is in no row.** The root script, added by `0905892`, is described in `test/AGENTS.md`
   (lines 73–79) and the map (`docs/repository.md` line 19), but the index's "Read it first when" column and
   `test/AGENTS.md`'s intro name only `pack-*.sh`, `playwright.base.ts` and `vitest.config.ts`. Reading a root script loads
   no folder file in Claude Code. (0905892)
5. **"versions and releases".** `AGENTS.md` line 28: "its versions and releases: docs/versioning.md". Releases are
   `docs/releases.md` (its title: "How a release is planned … and how it is carried out"). (9923a9f)
6. **"Rules 8 and 9".** `docs/releases.md` line 42: "Rules 8 and 9, on commits, are in the root AGENTS.md (*How to
   work*)." *Planning* numbers its rules 1–7; *How to work* (`AGENTS.md` lines 32–42) is not numbered; the numbers 8 and
   9 belong to the single guide before the split (`9923a9f^:AGENTS.md` lines 373, 375). (9923a9f)
7. **`.changeset/` "config only".** `docs/repository.md` line 17: "`.changeset/` | Changesets config. … | config only".
   `ls .changeset` shows 50 pending changesets besides `config.json` and `README.md`, and `docs/versioning.md` line 20
   says every consumer-facing change adds one there (`pnpm changeset`). (since 81f122f)
8. **The map's "each path".** `docs/repository.md` line 3 promises "What each path of the repository is"; the map has no
   row for `package.json`, `pnpm-lock.yaml`, `README.md`, `LICENSE` or `.gitignore` (tracked top level:
   `git ls-files | awk -F/ '{print $1}' | sort -u`), and its `.github/` row, "The workflows and Dependabot's
   configuration", leaves out `.github/CODEOWNERS` (six owners), which no file of the guide mentions
   (`grep -rn CODEOWNERS` over the ten files: nothing). (the sentence 9923a9f; the gaps older)
9. **Page-object layout.** `test/AGENTS.md` lines 80–82: "Page objects live under
   `page-object-models/testApp/pages/<name>/` as `<name>.locatorSchema.ts` plus `<name>.page.ts`". `find
   test/page-object-models -maxdepth 4`: `testPage.locatorSchema.ts` and `testPage.page.ts` sit in `pages/` itself (since
   8a9a1f7); `testnav/` also holds `testnav-item.*`; `testPath/` has a `[color]/` folder. (since 81f122f)
10. **README's list of folders.** `README.md` lines 180–182: "an index of the files that cover each part of the
    repository (an `AGENTS.md` in `src/`, `test/`, `website/` and `.github/`, and the files in `docs/`)". There are six
    folder files (`AGENTS.md` line 4; `find . -name AGENTS.md` outside dependencies: seven with the root); `src/locators/`
    and `src/helpers/` are not named. (6d1de0e)
11. **"CI" in two senses.** `.github/AGENTS.md` lines 43–45: "`publish.yaml` starts after `CI` succeeds, and `CI` runs
    only for pushes to `main` …", then "CI runs only for pull requests (drafts included) and `main`." The first means the
    workflow named `CI` (`main.yaml`), the second all CI (`PR` and `CI`); read together they contradict. (since edf88d2)
12. **Two of three compile-only probes.** `test/AGENTS.md` lines 116–118: "`validation.locatorSchemaPath.typecheck.ts`
    and `packaging/publicTypes.typecheck.ts` are compile-only probes: Playwright does not match the file names, and
    `pnpm typecheck` (in `pack-test` and CI) enforces their `@ts-expect-error` directives." A third,
    `tests/packaging/stepLegacyDecorators.typecheck.ts`, is one too (`find test/tests -name '*.typecheck.ts'`: three
    files; `grep -c @ts-expect-error`: 37, 80 and 4), named elsewhere in the same file (lines 17 and 95) but not here,
    where a contributor adding a probe looks for the rule. (since b0ff3d0 for the sentence; the third file since 4f80b37)

## Observed / expected

Each item above states both. Expected: the guide's pointers lead to files that hold what they promise, and its counts
and lists match the tree.

## Cause

Mostly the split (items 1–6, 10): pointers and summaries written from the previous layout. Items 7–9, 11 and 12 predate
54cdada.

## Fix plan

- Intended contract: the guide describes the repository as it is.
- Steps, one per item:
  1. "The other *Do not* items close each folder's `AGENTS.md`" (or add a short *Do not* to the three `docs/` files).
  2. "beyond the ones above".
  3. Name `vitest.config.ts` and `tsconfig.vitest.json` under the `docs/repository.md` row, or add a line on the unit
     tests' config to `test/AGENTS.md`.
  4. Add `test-server-check.sh` to the `test/AGENTS.md` row and to its intro (`pack-*.sh`, `test-server-check.sh`, …).
  5. "its versions: docs/versioning.md; its releases: docs/releases.md".
  6. "The rules on commits are in the root AGENTS.md (*How to work*)."
  7. "`.changeset/` | Changesets: `config.json`, and the pending changesets `pnpm changeset` adds | config and new
     changesets".
  8. Add rows for the manifest and lockfile, `README.md` (pointing to `website/AGENTS.md`), `LICENSE`, `.gitignore`, and
     name `CODEOWNERS` in the `.github/` row (who reviews; GitHub requests their review).
  9. "under `page-object-models/testApp/pages/`, one folder per page (`testPage` sits in `pages/` itself), as
     `<name>.locatorSchema.ts` plus `<name>.page.ts`".
  10. "an `AGENTS.md` in `src/` (and in `src/locators/` and `src/helpers/`), `test/`, `website/` and `.github/`".
  11. "Pull requests and `main` are the only runs of CI" or "the `PR` and `CI` workflows run only for …".
  12. "The `*.typecheck.ts` files (`validation.locatorSchemaPath`, `packaging/publicTypes`,
      `packaging/stepLegacyDecorators`) are compile-only probes: …", or "Every `*.typecheck.ts` file is a compile-only
      probe: …", which needs no update when one is added.
- Tests: none; re-run the commands above.
- Changeset: none.
