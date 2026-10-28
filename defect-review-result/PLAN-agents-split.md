# Plan 43: the 1.x and 2.x docs deleted; AGENTS.md split into an index and `docs/`

- **Decisions**: to be recorded as decision 76 once this plan is agreed
- **Findings**: none (the maintainer's request, 2026-10-28)
- **Bump**: none (contributor docs; nothing published changes)
- **Stop**: no CI change, so no stop for a push; the plan stops before its first commit only if the sentence ledger
  (step B.7) finds a sentence it cannot place
- **Depends on**: plan 41 part 2 (`01d1096`); runs before plan 42 (the maintainer's order, 2026-10-28), whose doc
  edits then go into `docs/ci-and-publishing.md` and `docs/testing.md`

## Contract

**A. The 1.x and 2.x docs leave the tree.** `docs/v1/`, `docs/v1-to-v2-migration/` and `docs/v2/` (27 files) are
deleted; git history and the `v2.1.0` tag keep them, and the README and *Upgrading from 2.x* already link the tag
(`https://github.com/DyHex/POMWright/tree/v2.1.0/docs/v2`, `…/docs/v1-to-v2-migration`). The package never shipped them
(`files`: `dist/**`, README, LICENSE, CHANGELOG). `CHANGELOG.md`'s 2.0.0 entry links them relatively (lines 537–548)
and says they are "retained in `docs/v1`" (line 496); those historical lines stop resolving on `main` and stay as they
are (AGENTS.md §8: `CHANGELOG.md` is never edited).

**B. AGENTS.md is the always-loaded core; the rest is read when a task needs it.** Today AGENTS.md is 578 lines and
about 10,000 words, loaded into every session; most tasks need one or two of its nine sections. After this plan:

- **AGENTS.md** (about 1,500 to 2,000 words) holds what every task needs: what POMWright is and its public API
  boundary; how to work (plan first for a contract change, verified claims only, mirror Playwright, commits only when
  asked and with the trailer); the commands every task uses; the cross-cutting *Do not* items; and **the index**, which
  names, for each file in `docs/`, the paths and tasks that require reading it first.
- **`docs/*.md`**, contributor docs, one per area that is changed together. Each holds its area's rules in full, ends
  with its own *Do not* items, and links the site's Internal pages for the reasons instead of restating them (one home
  per fact).
- **Nothing is lost**: every sentence of today's AGENTS.md lands in exactly one file, or is dropped with its reason in
  the execution notes (counts that go stale with every change, such as "60 spec files, about 9,900 lines", and file
  lists `ls` shows). Reworded only where a cross-reference changes ("section 5" becomes a file link) or a sentence is
  split between two files.

## The layout

| File | From today's AGENTS.md | Read before |
| --- | --- | --- |
| `AGENTS.md` | the header; §1, condensed; §6 rules 1, 2, 8 and 9 in short; §3's install, lint, unit, `pack-test` and `docs:build` lines; §5's "a contract change goes through a plan"; §8's cross-cutting items; the index | always loaded |
| `docs/repository.md` | §2, the map, without the file lists (the `.github/` rows go to `ci-and-publishing.md`); §3's toolchain bullet (Node, pnpm, `allowBuilds`, TypeScript 6, `@types`) | finding your way; adding a top-level file or folder; changing the toolchain or a dependency |
| `docs/testing.md` | §3's test commands (`test:unit`, `pack-test`, `harness:install`, `typecheck`, `pack:version`, `bench`, the `pack-test.sh` switches) and its probing pitfalls; §4 but its last bullet | running, writing or changing tests; writing a probe; changing `test/`, `pack-*.sh`, `playwright.base.ts`, `vitest.config.ts` |
| `docs/code-conventions.md` | §5's general bullets: style; builders synchronous, no thenables; call sites and stack frames; public types as aliases; error messages; descriptive names; `biome-ignore`; refactors and contract changes; dependencies. §7's considered punctuation convention. §8's class-as-type, `this`, `@internal` and stack-frame items | any change under `src/` or `index.ts` |
| `docs/locator-contracts.md` | §5's registry, registration, query, reuse, `getById`, `STRATEGIES`, first-argument, seed, `strictChains`, frame and path bullets; §4's "When changing locator behavior"; §7's considered registration-end and `nth` items; §8's locator items | `src/locators/`; the locator specs, unit tests and pages |
| `docs/page-object-contracts.md` | §5's `PageObject` lifecycle and URL bullets; §8's page-object items | `src/pageObject.ts`, `src/helpers/url.ts`, `src/helpers/navigation.ts`; their specs and pages |
| `docs/session-storage-contracts.md` | §5's session storage bullet; §8's storage and `seed` items | `src/helpers/sessionStorage*.ts`, `storageTurns.ts`; their specs and pages |
| `docs/steps-and-logging-contracts.md` | §5's `@step`, boxed-step location and logger bullet; §8's `@step`, logger and `box: true` items | `stepDecorator.ts`, `callSite.ts`, `playwrightReportLogger.ts`, `thenable.ts`, the fixture; any step a helper opens |
| `docs/versioning.md` | §7's changesets, call-outs, bumps, changelog format, pending changesets, the TypeScript floor and the backlog bullet; §3's Playwright pin rule (the peer floor, the root pin and the harness pin move together); §8's `CHANGELOG.md`, version and peer-range items | any consumer-facing change (it needs a changeset); a supported version moving |
| `docs/ci-and-publishing.md` | §2's `.github/workflows/` and Dependabot text; §7's publish, merge rule, Trusted Publishing, Pages and packaging-probe bullets; §7's considered scheduled workflow; §8's CI, deploy, harness-job and tarball items | `.github/`; a script only CI runs; a release |
| `docs/documentation.md` | §9; §3's `docs:*` scripts; §7's considered Markdown lint and spelling check; §8's docs, export and site-dependency items | `website/`; the README; a doc comment; a new export or public member; a message, chain or rendering that pages show |
| `docs/release-planning.md` | §6 | planning a release with a working folder |

The *Do not* items that stay in AGENTS.md: edit `CHANGELOG.md` or `package.json#version` (also in `versioning.md`'s
context, stated once, here); commit build artifacts, `.pack/`, tarballs, `test/node_modules` or reports; treat `dist/`
or `.pack/` as source; change the Playwright peer range or the `test/` pin without a decision; commit without being
asked, or without the `Co-Authored-By:` trailer.

**The index in AGENTS.md** is a table with the three columns *File*, *What it holds* and *Read it before*, as above,
followed by one sentence: a task that touches several areas reads each of their files, and a file's rules apply only
together with AGENTS.md's.

## Steps

### A, the old docs (commit 1)

1. `git rm -r docs/v1 docs/v1-to-v2-migration docs/v2`.
2. AGENTS.md: the two `docs/` rows of §2 go; §6 rule 4's "`docs/v2` is frozen" and §8's "Edit `docs/v2`, `docs/v1*`"
   go; §9's sentence on the 2.x docs at the tag stays.
3. Check: `git grep -n -E "docs/v1|docs/v2|v1-to-v2"` finds only `CHANGELOG.md` and the tag links.

### B, the split (commit 2)

1. A sentence ledger in the scratchpad (`agents-ledger.mjs`): today's AGENTS.md (at the commit before this one) split
   into sentences and table cells, whitespace-normalized.
2. `docs/` files written in the layout's order, each opening with one line on what it covers and when to read it, its
   sections taken from AGENTS.md in their current order, its *Do not* items last.
3. AGENTS.md rewritten: the header (what the file is, and that `docs/` holds the rest); *What POMWright is*; *How to
   work*; *Commands*; *Do not*; *The index*. The header also says how Claude Code finds it. From 2.1.277 Claude Code
   reads AGENTS.md "in a project with no CLAUDE.md … instead" (its changelog), and from 2.1.281 also on Amazon Bedrock,
   Google Vertex AI, Microsoft Foundry, LLM gateways and with telemetry disabled; with a `CLAUDE.md` present it reads
   that file instead, so nothing loads twice. A symlink is not used: on a Windows checkout without symlink support it
   becomes a text file holding `AGENTS.md`, which Claude Code would then read in AGENTS.md's place.
4. **`CLAUDE.md`** at the root, one line: `@AGENTS.md` (the maintainer's choice, 2026-10-28). Claude Code 2.1.277 and
   later read it instead of AGENTS.md and import AGENTS.md through it, so the text loads once; an older Claude Code, or
   a tool that reads only `CLAUDE.md`, gets AGENTS.md the same way; tools that read AGENTS.md directly ignore it.
   `docs/repository.md`'s map lists it, with that reason, and AGENTS.md's header names it.
5. Cross-references: "section N" and "§N" become links to the file that now holds the text; *Internal → Documentation*
   ("The rules are in AGENTS.md, section 9") links `docs/documentation.md` on GitHub; *Internal* index's AGENTS.md link
   stays, worded "AGENTS.md and the contributor docs it indexes"; the README's contributor line names both.
6. §9's "Internal pages … link `AGENTS.md` rather than copy it" becomes "link the contributor docs rather than copy them".
7. The ledger run: every old sentence is found in exactly one new file, or listed; each listed one is either reworded
   (its new place noted) or dropped (its reason noted) in the execution notes. Word counts of AGENTS.md before and
   after, and of each file.
8. Memory: the notes that cite AGENTS.md sections point at the new files.

## Verify

`pnpm lint`; `pnpm test:unit`; `pnpm docs:build` (the Internal pages' links); `pnpm pack-test --reporter=line` on the
three browsers once, after commit 2 (PLANS.md rule 5; nothing it runs reads AGENTS.md, but the rule holds); the ledger
with no unplaced sentence; `git grep -n "AGENTS.md"` for every link to a section that moved.

## Commits

```text
docs: the 1.x and 2.x docs leave the tree; the v2.1.0 tag keeps them

Plan: defect-review-result/PLAN-agents-split.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

```text
docs: AGENTS.md is an index; the contributor guide's areas move to docs/

AGENTS.md keeps what every task needs and names, for each file in docs/,
the paths and tasks that require reading it, so a session loads only the
rules its work touches.

Plan: defect-review-result/PLAN-agents-split.md

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Execution notes

2026-10-28, before plan 42 (the maintainer's order).

- **A** (`88493f2`): `git rm -r` of the three folders (27 Markdown files; the two migration skills under
  `docs/v1-to-v2-migration/skills/` included, which nothing outside the folder used and the `v2.1.0` tag keeps);
  AGENTS.md's two map rows, §6 rule 4's "`docs/v2` is frozen" and §8's `docs/` item removed. `git grep` afterwards:
  only the tag links (README, *Upgrading from 2.x*, AGENTS.md §9) and `CHANGELOG.md`'s historical lines. Plan 42's step
  lists and this plan's *Depends on* changed for the new order, decision 76 recorded.
- **B**: the files built by a script that slices AGENTS.md at `88493f2` by line ranges (`split.py` in the scratchpad), so
  the text moved verbatim; written by hand: each file's title and opening line, AGENTS.md's header, *How to work*'s
  first three bullets and *The index*, the map's `.github/` and contributor-guide rows, the split *Do not* and
  *Considered and not planned* items. Words: AGENTS.md 10,000 → 1,178; the eleven files 453 to 1,860 each, 10,044 in
  all. `CLAUDE.md`: `@AGENTS.md`.
- **The sentence ledger** (`agents-ledger.mjs`): 331 sentences and table cells of the old AGENTS.md; 0 in more than one
  file; 301 found verbatim (section references aside); the 30 others, each checked by hand:
  - 13 cross-references reworded: "(section N)" and "§N" became links, or "(above)" and "below" inside one file; "this
    file" became "the contributor guide" (the version bullet, the bumps, the backlog, release planning's intro and
    rule 7);
  - 4 stale counts and lists dropped: `src/`'s "19 files, about 7,000 lines" and its unit-test file list (now "beside the
    file each tests"), the website's page counts (24, 14, 13), "60 spec files, about 9,900 lines";
  - 6 lists split across files: *Considered and not planned* (the scheduled workflow to CI, Markdown linting and the
    spelling check to documentation, the punctuation convention to code conventions, `nth` to locators; ending a
    registration only at calls that could read it is dropped, since the locator bullet already says it was considered
    and not adopted) and the *Do not* items (by area; "Reintroduce behavior that 3.0.0 removed" split into each area's
    part);
  - 6 rewordings: AGENTS.md's header ("Read it fully" and "Last revised"), the version bullet's last sentence, release
    planning's first sentence (its file's opening line says it), and *Internal pages … link the contributor docs*;
  - 1 comparison artifact: `pnpm install --frozen-lockfile` has no full stop and joined the next sentence; it is in
    AGENTS.md.
- **Links**: *Internal → Documentation* links `docs/documentation.md`; the *Internal* index names AGENTS.md and the files
  it indexes; the README's *Contributing* names both. `git grep` for "section N" and "§N" outside the folder: none.
- **Memory**: the plan-first note and its index line point at `docs/release-planning.md`.
- Checks: `pnpm lint` 0; `pnpm test:unit` 904 passed; `pnpm docs:build` 0 (53 pages); `pnpm pack-test --reporter=line`
  exit 0 (1,746 passed, 3 skipped; doc snippets 226; api coverage 0 problems; error messages 0 problems; step locations
  31).
