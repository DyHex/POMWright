# 2I-1: The rule for adding a dev dependency is stated only in `src/AGENTS.md`, which a dependency change in the root, `test/` or `website/` never reaches

- **Kind**: documentation
- **Status**: decided 2026-10-29, decision 82 in [DECISIONS.md](../DECISIONS.md) (decided together: 2I-2, 2I-1, 2I-8); planned in one contributor-guide plan with items 28, 30 and 31
- **Area**: the contributor guide: placement of cross-area rules (`docs/repository.md` *The contributor guide*)
- **Severity**: Low (a contributor-process rule silently missing for the task that triggers it; no effect on the package)
- **Semver of the fix**: none (guide text only)
- **Pass**: 1; 4 (the site-dependency note)
- **First review**: new since 54cdada (9923a9f moved the rule from the single guide into `docs/code-conventions.md`, 6d1de0e into `src/AGENTS.md`)
- **Reviewed**: `d850405`, 2026-10-28 20:00 +0100, Opus 5.5, second review, segment 2I

## Contract

`docs/repository.md` lines 45–48, *The contributor guide*:

> Where a rule goes: in the file that loads for every change that can trigger it. A rule triggered in one folder about
> work in another (…) goes where the trigger is, or the trigger's file points to it; a rule for several folders goes in
> their common parent, the root or `docs/`.

The root index (`AGENTS.md` line 84) sends "changing the toolchain, a dependency or this guide" to `docs/repository.md`,
and `docs/repository.md` line 4 says the same of itself.

## Reproduction

The rule, `src/AGENTS.md` lines 42–43 (*Conventions*):

> No new runtime dependencies. A new dev dependency is recorded, with its reason, in the plan or the commit that adds
> it, and in the working folder's decisions log while one exists (see docs/releases.md).

Every mention of a dependency in the ten files (`grep -n -i dependenc AGENTS.md src/AGENTS.md src/*/AGENTS.md
test/AGENTS.md website/AGENTS.md .github/AGENTS.md docs/*.md`, run from the worktree root):

```text
website/AGENTS.md:125:  ... The site's dependencies never
website/AGENTS.md:135:- Add the site's dependencies to the root `package.json`.
test/AGENTS.md:134:- Reintroduce a `file:` tarball dependency, or sudo in the harness scripts.
src/AGENTS.md:42:- No new runtime dependencies. A new dev dependency is recorded, with its reason, in the plan or the commit that adds
AGENTS.md:14:  dependency. Node 20 or later (`engines`), ...
AGENTS.md:84:| [docs/repository.md](docs/repository.md) | ... | adding a top-level file or folder; changing the toolchain, a dependency or this guide |
docs/versioning.md:9:- `@playwright/test` is an exact root dev dependency at the peer floor (1.64.0): ...
docs/repository.md:4:and loaded. Read it before adding a top-level file or folder, changing the toolchain or a dependency, or changing the
docs/repository.md:25:| `pnpm-workspace.yaml` | pnpm settings for the root: `allowBuilds`, the dependencies whose install scripts may run ...
docs/repository.md:60:  switch to the version the field names. pnpm runs no dependency's install script unless the root
.github/AGENTS.md:65:  (`@arethetypeswrong/cli`, downloaded at a pinned version, never a dependency) ...
```

Trace of the task "add a dev dependency" as the guide routes it:

| Where the dependency goes | What the guide has the contributor read | Meets the dev-dependency rule? |
| --- | --- | --- |
| root `package.json` (a lint or build tool) | root `AGENTS.md`; `docs/repository.md` (index: "a dependency") | no |
| `website/package.json` (a Starlight plugin) | root; `website/AGENTS.md` (Claude Code loads it on reading `website/package.json`); `docs/repository.md` | no |
| `test/package.json` (a harness helper) | root; `test/AGENTS.md`; `docs/repository.md` | no |

The three package manifests that hold dev dependencies are outside `src/`, so `src/AGENTS.md` loads for none of them,
and no file read for the task points to it.

## Observed / expected

Observed: the rule lives in one folder's file (`src/AGENTS.md`), and the file the index names for "changing a
dependency" (`docs/repository.md`) does not state it or point to it.

Expected, by `docs/repository.md`'s own rule: a rule for several folders (root, `test/`, `website/`) is in their common
parent, the root `AGENTS.md` or `docs/repository.md` (*Toolchain*), where the index's "a dependency" row leads.

"No new runtime dependencies" is reached in practice (a runtime dependency is used from `src/`, whose file then loads),
so only the dev-dependency half is lost.

## Cause

The split. In the single guide (`9923a9f^:AGENTS.md` line 336) the rule sat in *5. Coding conventions*, which everyone
read. `9923a9f` moved it to `docs/code-conventions.md`, whose index row was "any change under `src/` or to `index.ts`";
`6d1de0e` folded that file into `src/AGENTS.md`. The "a dependency" row never pointed to it.

## Fix plan

- Intended contract: the rule reaches every change that adds a dependency, wherever the manifest is.
- Options:
  1. **Recommended.** Move both sentences to `docs/repository.md` *Toolchain* (where the index's "a dependency" row
     leads), as one bullet: no new runtime dependencies; a new dev dependency of the root, `test/` or `website/` is
     recorded with its reason in the plan or commit that adds it (and the decisions log while a working folder exists).
     Leave a pointer in `src/AGENTS.md` *Rules held elsewhere*. Cost: two lines moved.
  2. Keep it in `src/AGENTS.md` and add pointers in `website/AGENTS.md` and `test/AGENTS.md`: three places to keep in
     step, against the guide's "one home" approach.
- Tests: none (guide). Check with the same grep that the rule appears in `docs/repository.md`.
- Docs: `docs/repository.md` *Toolchain*, `src/AGENTS.md` *Conventions* and *Rules held elsewhere*.
- Changeset: none (not consumer-facing).
- Relation: same cause as 2I-2 (rules the split left where their trigger does not lead); fix them together.

## Added in pass 4

The other dependency rule the index's "a dependency" row should lead to is in a folder file too: `website/AGENTS.md`
lines 125–126, "The site's dependencies never enter the root `package.json`, whose scripts only call into `website/`",
and its *Do not* (line 135). Its trigger includes a change to the root `package.json` (adding a site package there),
which loads no folder file; `docs/repository.md` implies it ("a pnpm project of its own", lines 15 and 25) without
stating it. The recommended fix (option 1) puts it beside the dev-dependency rule in `docs/repository.md` *Toolchain*.
