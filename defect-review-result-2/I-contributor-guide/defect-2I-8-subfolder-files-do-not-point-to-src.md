# 2I-8: With a client other than Claude Code, the guide says to read "the folder's file"; `src/locators/AGENTS.md` and `src/helpers/AGENTS.md` never point to `src/AGENTS.md`, which holds rules about the files under them

- **Kind**: documentation
- **Area**: the contributor guide: reach for clients that do not load folder files (`AGENTS.md` *The index*; the intros of `src/locators/AGENTS.md` and `src/helpers/AGENTS.md`)
- **Severity**: Low (a Codex or human contributor started at the root and working in `src/helpers/` or `src/locators/` can miss the runtime's conventions, among them the call-site and no-retry rules for helpers code; a careful reading of the index's "Loads by itself" column implies `src/AGENTS.md` applies)
- **Semver of the fix**: none (guide text only)
- **Pass**: 1
- **First review**: new since 54cdada (6d1de0e)
- **Reviewed**: `d850405`, 2026-10-28 20:06 +0100, Opus 5.5, second review, segment 2I

## Contract

`AGENTS.md` lines 88–91: "Claude Code loads a folder's `AGENTS.md` when it reads a file in that folder or below it,
together with the `AGENTS.md` of every folder above; other clients, Codex among them, load only the files from the
repository root to the folder they started in. So with another client, or for work that touches a folder without reading
a file in it, read the folder's file yourself before working there." `docs/repository.md` line 48: "A pointer in a parent
covers its subfolders."

## Reproduction

Pages and text, at `d850405`:

- `src/helpers/AGENTS.md` lines 1–7 and `src/locators/AGENTS.md` lines 1–6 end their intros with "Part of the
  contributor guide that the root [AGENTS.md](../../AGENTS.md) indexes; its rules apply here too." `grep -n
  "src/AGENTS\|\.\./AGENTS" src/locators/AGENTS.md src/helpers/AGENTS.md` prints only those two root links: neither file
  names `src/AGENTS.md`.
- The index row of `src/AGENTS.md` (`AGENTS.md` line 78): read first "when changing `index.ts`"; "Loads by itself: in
  Claude Code, when a file under `src/` is read".
- Rules in `src/AGENTS.md` about files under `src/helpers/` that `src/helpers/AGENTS.md` does not state
  (`grep -n -i "file name\|captureStackTrace\|retry\|thenable"` over the three `src` files):
  - lines 24–28: a deferred error "points at the consumer's call through `src/helpers/callSite.ts` … Never filter stack
    frames by file name … The one exception is the frames of POMWright's own published bundle", and *Do not* line 67;
  - lines 39–41: "it never adds a capability that keeps a failing test going (a navigation to a seeded origin that fails
    fails the test; no retry is made to apply the seed …)";
  - line 23: "There are no thenables anywhere in `src`" (helpers has `thenable.ts`);
  - and the *Rules held elsewhere* pointers (pages, changesets, specs) that `docs/repository.md` line 48 lets cover the
    subfolders.

Task traced, as the guide routes it for Codex started at the repository root (Codex reads root to start folder only,
per its documentation and the guide): change how `atCallSite` trims frames in `src/helpers/callSite.ts`. Read: root
`AGENTS.md`; by the fallback, "the folder's file", `src/helpers/AGENTS.md`. Neither states "never filter stack frames by
file name"; neither points to `src/AGENTS.md`.

## Observed / expected

Observed: the fallback names one file, the folder's own, while Claude Code's loading (as the guide describes it) brings
the folders above too; the subfolder files do not close the gap with a pointer.

Expected: a contributor without folder loading reads what Claude Code would load: the folder's file and those of the
folders above it.

## Cause

`6d1de0e` wrote the subfolder intros to point at the root only, and the fallback in the singular.

## Fix plan

- Intended contract: every client meets the same files for a task.
- Steps (both cheap): (1) `AGENTS.md` lines 90–91: "read the folder's file, and those of the folders above it, yourself";
  (2) the intros of `src/locators/AGENTS.md` and `src/helpers/AGENTS.md`: "… indexes; its rules and those of
  [src/AGENTS.md](../AGENTS.md) apply here too." Optionally the `src/AGENTS.md` index row: "changing `index.ts` or
  anything under `src/`".
- Changeset: none.
- Relation: the same reach question as 2I-2 and 2I-3, for the other client.
