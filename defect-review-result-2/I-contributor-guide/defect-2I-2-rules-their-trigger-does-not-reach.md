# 2I-2: Rules whose trigger is in one area sit in another area's file, and neither the trigger's file nor the index leads there: page updates after a mechanism or behaviour change, and what moves with the Node floor

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 82 in [DECISIONS.md](../DECISIONS.md) (decided together: 2I-2, 2I-1, 2I-8); planned in one contributor-guide plan with items 28, 30 and 31
- **Area**: the contributor guide: reach of the index and the pointers (`docs/repository.md` *The contributor guide*; `AGENTS.md` *The index*)
- **Severity**: Medium (the rule that keeps the Internal and Docs pages in step with the code is not reached for a change to a mechanism or a behaviour that touches no doc comment and no shown message; the Node-floor part alone would be Low)
- **Semver of the fix**: none (guide text only)
- **Pass**: 1 (a, b, c); 4 (b′, c′)
- **First review**: new since 54cdada (9923a9f and 6d1de0e, the split)
- **Reviewed**: `d850405`, 2026-10-28 20:02 +0100, Opus 5.5, second review, segment 2I

## Contract

`docs/repository.md` lines 45–48: "Where a rule goes: in the file that loads for every change that can trigger it. A
rule triggered in one folder about work in another (a message changed in `src/` is updated on the pages in `website/`)
goes where the trigger is, or the trigger's file points to it". `AGENTS.md` lines 92–94: "Before starting, name the areas
your task touches and read their files." The index's "Read it first when" column says which tasks lead to which file.

## Reproduction

Page and text, from the worktree at `d850405`.

### (a) A mechanism or behaviour change in `src/` and the pages that describe it

The rules, only in `website/AGENTS.md`:

- line 52: "The reasons behind a design live on the Internal pages; a change of design updates them."
- lines 57–58: "A change to a message, a rendering or a mechanism greps `website/` for the old text and updates the pages
  with it, and a consumer-facing change updates the page that describes it."

What a change under `src/` reads (Claude Code loads `src/AGENTS.md` and the folder's file; the index sends a
consumer-facing change to `docs/versioning.md`):

- `src/AGENTS.md` lines 59–61, *Rules held elsewhere*: "A doc comment, and a message, chain or rendering a page shows,
  follow website/AGENTS.md: a change to one updates the pages and doc comments that show it." and "A consumer-facing
  change needs a changeset: docs/versioning.md."
- The index row of `website/AGENTS.md` (`AGENTS.md` line 82): "changing the README or a doc comment; adding an export or
  a public member; changing a message, chain or rendering a page shows; changing `scripts/check-*.mjs`".
- `docs/versioning.md`: changesets and bumps; nothing about pages.
- `grep -n -i "mechanism\|design\|Internal pages\|consumer-facing"` over the ten files finds the page-update rules only in
  `website/AGENTS.md` (lines 50, 52, 57, 58); `src/AGENTS.md`, `src/locators/AGENTS.md` and `src/helpers/AGENTS.md`
  never mention the Internal pages.

So the pointer and the index row both name "a message, chain or rendering" and a doc comment; "a mechanism", "a change of
design" and "a consumer-facing change" (website's own triggers) are dropped. Task traced: change how the seed registry
decides between writing at once and registering (`src/helpers/sessionStorageSeed.ts`, described on *Internal → The seed
registry*), with no message and no doc comment changed. Read: root, `src/AGENTS.md`, `src/helpers/AGENTS.md`,
`docs/versioning.md` (changeset). None says to update the Internal page.

### (b) Moving the Node floor (`engines`)

- The root (`AGENTS.md` line 14) names the floor: "Node 20 or later (`engines`)". The index sends "moving a supported
  version" to `docs/versioning.md` (line 85).
- `docs/versioning.md` names the Playwright and TypeScript floors and where each lives; `grep -n -i "node\|engines"
  docs/versioning.md docs/releases.md` prints nothing.
- What moves with `engines` is only in `.github/AGENTS.md`: the `harness-node` matrix "from the `engines` floor" (lines
  14–16), the `consumer` job's Node 20 check (line 23), and lines 67–68: "Only one stays manual, before a release that
  changes `engines`: npm's `EBADENGINE` warning on a Node version below the new floor."
- The `.github/AGENTS.md` row (`AGENTS.md` line 83) is read first only when "changing a script only CI runs or the
  packaging probes"; `docs/releases.md` line 46 points there only for "How Publish and Pages run".
- Before the split's second step, the CI file's row at `9923a9f` read "changing `.github/` or a script only CI runs; a
  release", so a release reached it; `6d1de0e` dropped "a release".

### (c) Weaker: the benchmark after a registry or resolution change

`test/AGENTS.md` lines 29–33 (*Commands*): `pnpm bench` "is not part of CI …; rerun it and update the page, its machine
line included, when a change touches the registry or resolution." The trigger is `src/locators/`; its file points to
`test/AGENTS.md#the-harness-test` "for locator behavior" (line 82), a different section. A contributor who reads all of
`test/AGENTS.md` meets it; one who follows the anchor may not.

### Added in pass 4

- **(b′) The Playwright floor's other places.** `docs/versioning.md` lines 9–13 list what moves with the Playwright
  floor as "the peer floor, the root dev pin and the harness pin in `test/package.json`", while for the TypeScript floor
  the same bullet names the docs too ("the README's badge, *Installation*'s sentence …"). The Playwright floor is also
  stated in `README.md` line 158 ("needs `@playwright/test` 1.64 or later (below 2) and Node 20 or later"),
  *Installation* lines 22–23, *Upgrading from 2.x* lines 15 and 28–32, the root `AGENTS.md` lines 12–13, and
  `test/AGENTS.md` lines 41 and 58 (`git grep -n -E "1\.64(\.0)?"`, pass 1). A contributor who moves the floor by
  `docs/versioning.md` meets three of these eight places (the three pins); the pages are reached only through `website/AGENTS.md`'s
  "a consumer-facing change updates the page", which 2I-2 (a) shows is not pointed to from where the floor is changed.
- **(c′) A second build in a harness job.** The single guide's *Do not* item "Reintroduce a `file:` tarball dependency, a
  second build in a harness job, or sudo in the harness scripts" was split: `test/AGENTS.md` line 134 keeps the first
  and last, `.github/AGENTS.md` line 74 the second. The harness job's build is skipped by `pack-test.sh`'s
  `POMWRIGHT_TARBALL` branch (lines 25–30), a root script whose index row sends a contributor to `test/AGENTS.md`
  ("changing `pack-*.sh`"), which does not point to `.github/AGENTS.md`'s item. Weaker: `test/AGENTS.md` lines 34–35
  describe the switch ("tests that tarball instead of building").

## Observed / expected

Observed: three rules (and, from pass 4, the Playwright floor's docs places and one *Do not* item) are held where their
trigger does not lead, and the trigger's file points elsewhere or more narrowly. Expected (by `docs/repository.md`):
each in the file that loads for its trigger, or pointed to from it.

## Cause

The split (`9923a9f`, then `6d1de0e`) moved each rule verbatim into one file (the sentence comparison in
`probes/I/split/missing-vs-head.txt` shows every sentence arrived) and wrote the pointers and index rows from the
headings of the receiving files, not from the triggers of the rules they hold.

## Fix plan

- Intended contract: a contributor who reads the files the index and the pointers name for a task meets every rule that
  task triggers.
- Steps (recommended):
  1. `src/AGENTS.md` *Rules held elsewhere*, first bullet: name website's triggers in full: "A doc comment, a message,
     chain or rendering a page shows, a mechanism or design the Internal pages describe, and any consumer-facing
     behaviour follow website/AGENTS.md …". Same words in the `website/AGENTS.md` index row.
  2. `docs/versioning.md` *Supported versions*: a bullet for the Node floor: `engines`, Playwright's own floor, and what
     moves with it (CI's `harness-node` matrix and the `consumer` job's Node, README and *Installation*), with a pointer
     to `.github/AGENTS.md` for the manual `EBADENGINE` check before the release; and add "a release that changes
     `engines`" to the `.github/AGENTS.md` index row, or put the manual check in `docs/releases.md` *Carrying out a
     release*.
  3. `src/locators/AGENTS.md`: point to `test/AGENTS.md`'s `pnpm bench` bullet for a change to the registry or
     resolution (one line).
  4. (b′) `docs/versioning.md`'s Playwright bullet: list the README, *Installation*, *Upgrading from 2.x* and the two
     guide files beside the pins, as the TypeScript bullet does, or drop the guide's own restatements of 1.64 (the root
     can say "the peer range in `package.json`") and list only the pages.
  5. (c′) `test/AGENTS.md` *Do not*: "Reintroduce a `file:` tarball dependency, a second build in a harness job
     (`POMWRIGHT_TARBALL`), or sudo in the harness scripts", keeping `.github/AGENTS.md`'s copy, or a pointer.
  - Alternative: restore a coarse row ("any change under `src/`" → the page rules), as `9923a9f` had. Cost: reading more
    than a task needs, which the split set out to avoid.
- Tests: none (guide). Recheck by tracing the three tasks above.
- Changeset: none.
- Relation: same cause as 2I-1; fix together.
