# 2I-3: The guide says Claude Code loads a folder's `AGENTS.md` when "a file" there "is read"; Claude Code's documentation says only a Read-tool open, in a subdirectory of the working directory, does it

- **Kind**: documentation
- **Area**: the contributor guide: how it loads (`AGENTS.md` *The index*; `docs/repository.md` *The contributor guide*)
- **Severity**: Low (a Claude Code contributor can believe a folder's rules are loaded when they are not; the Edit tool's read-first requirement and the guide's "read the folder's file yourself" limit the harm)
- **Semver of the fix**: none (guide text only)
- **Pass**: 1
- **First review**: new since 54cdada (6d1de0e wrote the loading claims and the "Loads by itself" column)
- **Reviewed**: `d850405`, 2026-10-28 20:02 +0100, Opus 5.5, second review, segment 2I

## Contract

The guide's claims:

- `AGENTS.md` lines 88–91: "Claude Code loads a folder's `AGENTS.md` when it reads a file in that folder or below it,
  together with the `AGENTS.md` of every folder above; … So with another client, or for work that touches a folder
  without reading a file in it, read the folder's file yourself before working there."
- `AGENTS.md` lines 78–83, column "Loads by itself": "in Claude Code, when a file under `src/` is read" (and the same for
  each folder).
- `docs/repository.md` lines 35–36: "Claude Code 2.1.277 and later read the root `AGENTS.md` at the start, and a
  folder's `AGENTS.md` when Claude reads a file in that folder or below it (checked 2026-10-28: a file one folder below
  loads it too)."

The guide relies on this: `src/AGENTS.md`'s row is read first only "when changing `index.ts`"; for any other change under
`src/` the guide counts on the file loading by itself.

## Reproduction

Claude Code's page *How Claude remembers your project* (`https://code.claude.com/docs/en/memory`, fetched 2026-10-28,
saved as `/home/magdys/workspace/dyhex/POMWright-second-review-probes/I/web/claude-code-memory.md`), section *When Claude
Code reads AGENTS.md*:

> **At session start**: every `AGENTS.md` and `.claude/AGENTS.md` in your working directory and the directories above it.
>
> **As Claude works in subdirectories**: a subdirectory's `AGENTS.md`, when Claude opens a file there with the Read tool
> and that subdirectory has none of the three `CLAUDE.md` files of its own

For nested `CLAUDE.md` files the same page is broader: "Claude Code loads each one once Claude reads, writes, or edits
another file in that subdirectory. Reading includes viewing the file with a Bash command that counts as a read, such as
`cat` or `head` on a single file", and only for "subdirectories under your current working directory".

On versions: "Reading `AGENTS.md` directly requires Claude Code v2.1.277 or later", and *When AGENTS.md support is
unavailable*: "Before v2.1.281, some sessions, such as those on Amazon Bedrock or with telemetry disabled, read
`CLAUDE.md` files only", and "In some cases, it's your first session after you upgrade from v2.1.276 or earlier."

## Observed / expected

The guide's trigger is wider than the documented one in three ways:

1. **Only the Read tool.** For `AGENTS.md`, the documented trigger is opening a file with the Read tool. Reading with a
   Bash `cat`, `sed -n` or `grep`, searching with Grep, or creating a file with Write does not load it. A session that
   explores `src/` through the shell (which Claude Code's own instructions allow) has "read a file" in the guide's
   words, so the guide's fallback ("for work that touches a folder without reading a file in it, read the folder's
   file yourself") does not fire either.
2. **Only under the working directory.** Subdirectory loading is documented for subdirectories of the directory the
   session started in. Started in `test/`, a session that reads `src/pageObject.ts` gets the root file (above the
   working directory) but not `src/AGENTS.md`.
3. **Versions.** "2.1.277 and later" holds except for Bedrock or telemetry-off sessions before 2.1.281 and the first
   session after an upgrade from 2.1.276 or earlier.

The guide's further claims, "or below it" and "together with the `AGENTS.md` of every folder above", are not in Claude
Code's page; the guide says it checked the first on 2026-10-28. Not probed here (the brief rules out starting a session).

Expected: the guide states the trigger as the tool documents it, so a contributor knows when to read a folder's file
themselves.

## Cause

`6d1de0e` summarized the loading rule from a check made with the Read tool, as "reads a file".

## Fix plan

- Intended contract: the guide's loading description matches Claude Code's documentation, and the fallback covers every
  case where the file does not load.
- Steps: in `AGENTS.md` (the bullet under the index) and `docs/repository.md`: "Claude Code loads a folder's
  `AGENTS.md` when it opens a file in that folder (or below it) with its Read tool, in a session started at the root or
  above that folder; reading through the shell, searching, or writing a new file does not load it." Widen the fallback:
  "with another client, a session started elsewhere, or when you have not opened a file there with Read, read the
  folder's file yourself". Note the version exceptions in `docs/repository.md`. Optionally, change "Loads by itself" to
  "Loads by itself (Claude Code)" with "when a file under `src/` is opened with Read".
- Tests: none. Re-read the Claude Code page when the guide's claim is next revised (date it, as now).
- Changeset: none.

## Pass 2: the first review's decisions and plan

`defect-review-result/DECISIONS.md` 77 (the folder files, no `CLAUDE.md`) gives the same reading as the guide ("Claude
Code loads a folder's `AGENTS.md` when it reads a file there or below") and adds "The maintainer uses only current
Claude Code clients and Codex", so observation 3 (the version exceptions) matters little for the maintainer; it still
holds for any other contributor. `PLAN-agents-split.md`'s part C execution notes say the loading was checked "with probe
folders": "a parent folder's `AGENTS.md`, loaded when a file one folder below was read", with Claude Code's Read. Nothing
records a read through the shell or a session started below the root, which is what observations 1 and 2 are about.
Classification unchanged.
