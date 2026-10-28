# Segment 2I inventory, reconciled (pass 3)

The union of `inventory-blind.md` (pass 1) and the first review's inventory lines for the guide
(`defect-review-result/inventory.md` §10, the guide parts of §9 and §11, and scope H's coverage table). Each line:
*both*, *blind only* or *first only*, and how deeply each review probed it. "Read" means compared by reading;
"command" means checked by a command whose output is cited.

## The map, line by line

| Item | Mark | First review (at `54cdada`) | This review (at `d850405`) |
| --- | --- | --- | --- |
| Every statement of the guide against the repository (paths, file lists, commands, versions) | both | §1–§4, §6, §9 fully; §5, §8 sampled; counts by command (H) | all ten files; identifiers grepped, routes and layouts listed, versions read from manifests; 12 mismatches (2I-7) |
| The guide's counts (files, lines, pages, specs) | first only | counted by command; all held | none left to count: the split dropped them (decision 76) |
| The public API list against `index.ts` | both | 38 exports, by command | 40, by command |
| Commands run as written | both | scripts traced against `package.json` (H, G) | ran `pnpm lint`, `pnpm test:unit`, `pnpm harness:install`, `pnpm typecheck`, `pnpm pack:version`, the root's example `pnpm pack-test …testIds.spec.ts`, `install-deps --dry-run`; baseline for the rest |
| The toolchain (Node, pnpm, `allowBuilds`, TypeScript 6, lockfiles pin pnpm) | both | read and grepped (H) | read; `allowBuilds` probed (an install without it fails, `ERR_PNPM_IGNORED_BUILDS`) |
| The test server's routes in the guide | both | grep of `server.js` (A-8, H-5: two missing) | every route looked up (`run1/H-5`): all 27 listed |
| The URL sweep's known differences in the guide | first only in pass 1; both after pass 2 | read against the spec (H-4) | pass 1 did not compare the sentence with the spec (a blind spot); pass 2 did (`run1/H-4`): holds |
| The compile-only probes in the guide | first only in pass 1; both after pass 2 | F-4: the `packaging/` list missed one | pass 2: the list holds; another sentence names two of three (2I-7 item 12) |
| The publish guard and the merge rule as the guide words them | first only in pass 1; both after pass 2 | G-5, probed with the workflow (G) | pass 2: the guide's wording (`run1/G-5`); the workflow is 2G's |
| `.editorconfig` | both | G-9: tabs everywhere, actionlint probe | pass 1: the `.mdx` page against the space rule; pass 2: G-9's count re-run with `mdx` (2I-9) |
| `.vscode/` | both (first: consolidation R-1) | `pocName` probe | files listed; map row present; no `pocName` |
| Tooling comments the guide relies on (`vitest.config.ts`, `playwright.base.ts`, `pack-test.sh`, the check scripts' headers) | both | G-11, read | read; current (`run1/G-11`) |
| `biome.json`, `tsconfig.json`, `tsconfig.vitest.json`, `pnpm-workspace.yaml`, `.gitignore` | both | read (G, H) | read; `pnpm lint` and `biome check` on `.md`; worktree clean after runs |
| The top-level layout against the map | blind only | — | non-recursive listing and `git ls-files` top level: rows missing for five files and `CODEOWNERS` (2I-7 item 8) |
| The index: rows against the files, "Read it first when" against each file's content | blind only | (no index existed) | read: 2I-7 items 1–4 |
| Loading in Claude Code | blind only | — | Claude Code's docs fetched: narrower than the guide (2I-3); the guide's own probe (plan 43) read in pass 2 |
| Loading in Codex | blind only | — | Codex's docs fetched: matches; sizes under its limit; the fallback for subfolders (2I-8) |
| Placement: a rule for several folders; a rule triggered in one folder about work in another | blind only | — | traced the cross-area rules: 2I-1 (dev dependency), 2I-2 (page updates, Node floor, bench) |
| Reach: tasks traced through the index and the pointers | blind only | — | five tasks traced (a dev dependency; a mechanism change in `src/helpers/`; moving `engines`; a registry change; a `callSite.ts` change with Codex) |
| The split (9923a9f, 6d1de0e) as a change set: every sentence arrived | blind only | — | sentence comparison (`split/missing-vs-head.txt`): 336 sentences, every one placed; plan 43's own ledger agrees (331, 0 in two files) |
| Cross-references after the split | blind only | — | grep for `section N`, old file names: one stale ("Rules 8 and 9") |
| The Internal pages' claims about the guide (`internal/index.md`, `internal/documentation.md`) | both | read (H: `internal/index.md` fully; `internal/documentation.md` read) | read; one stale CI sentence (2I-4) |
| README *Contributing* | blind only | — (H read the README's example and links) | read (2I-7 item 10) |
| Practice: the `Co-Authored-By:` trailer | blind only | — | git log: all 67 commits since the rule carry it |
| Practice: the *Do not* lists against the history | both | §8 sampled | git log and ls-files: none broken |
| Practice: the working folder and plan naming | blind only | (the first review set up the practice: decisions 5, 62) | commit `Plan:` lines (pass 1), decisions (pass 2): 2I-5 |
| Practice: no reference to a plan, finding or decision outside the folder (rule 7) | both | `git grep`: "none" (H, *What is sound*) | `git grep` with a wider pattern: one, present at `54cdada` too (2I-6) |
| Practice: changesets start with a sentence | both | 29, all patch (F) | 50, all patch, none a heading |
| Decided design (*Considered and not planned*, *Do not*) arrived in the new files | first only as a list (§11); blind through the split | listed as known | every item found in one file (the sentence comparison); `nth` and "the next call" in `src/locators/AGENTS.md`, the scheduled workflow in `.github/`, Markdown lint and spelling in `website/`, punctuation in `src/` |
| Spelling rule against the guide's own files | blind only (pass 2) | H-6 covered pages, AGENTS.md | none in the ten files; one left on an Internal page (outside the segment, 2H) |

## Findings, both ways

| Finding | First review | Why |
| --- | --- | --- |
| 2I-1, 2I-2, 2I-3, 2I-8 | new since `54cdada` | the split (`9923a9f`, `6d1de0e`, 2026-10-28) |
| 2I-4 | new since `54cdada` | `f866325` (every job on every run) and `429f2c2` (a fourth check) left the sentence stale |
| 2I-5 | new since `54cdada` | the practice changed with `a49709d` (decisions 5 and 62); the guide was not updated by the audit |
| 2I-6 | missed by the first review | the reference is at `54cdada` and `v3.0.1`; H's *What is sound* said there was none |
| 2I-7 | items 1–6 and 10 new (the split, `0905892`); items 7, 8, 9, 11, 12 missed | per item in the file |
| 2I-9 | G-9: fixed incompletely | decision 34 took `mdx` into the space rule without checking the one `.mdx` page |

First-review guide findings the blind pass would have met had they still been there: H-5 (routes, listed in pass 1),
G-9 (`.editorconfig`, read in pass 1), R-1 and G-11 (read). Blind spots of pass 1: H-4's sentence (pass 1 did not
compare the URL sweep's wording with the spec) and F-4's list (pass 1 did not count the compile-only probes); both are
fixed, and the second led to 2I-7 item 12 in pass 2.

## Lines neither review probed deeply

- How Claude Code loads a folder's file after a shell read, and in a session started below the root (2I-3): documented,
  not probed (the brief rules out starting a session).
- `pnpm bench` and the `docs:dev`/`docs:preview` servers: commands the guide gives, not run by either review here.
- The workflows' behaviour behind `.github/AGENTS.md`'s sentences (2G's).
- What moves with the Playwright floor besides the three pins (`docs/versioning.md` lists those; README, *Installation*,
  *Upgrading*, the root and `test/AGENTS.md` also name 1.64): pass 4.
