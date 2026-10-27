# F-5: Exporting `SeedOptions` and `SessionStorageOptions` is classed as a patch on a rule that covers return types only; by §7 it is a minor

- **Kind**: design question
- **Area**: The pending changesets, bump levels (inventory §7, [F]); `.changeset/export-storage-types.md`; AGENTS.md §5 and §7
- **Severity**: not rated (design question). It decides whether the release is 3.0.2 or 3.1.0.
- **Semver of the fix**: none for the code. The release becomes a minor (3.1.0) under option A, and stays a patch under option B.
- **Reviewed**: `54cdada`, 2026-10-23, Claude (Opus 5.5)
- **Status**: decided (2026-10-26, [DECISIONS.md #6](../DECISIONS.md)): patch, the release is 3.0.2; the export
  brings the package in line with the 3.0.1 docs' promise (`api/types.md`); AGENTS.md §7 cites that promise

## Contract

- AGENTS.md §7 (lines 345-349), "Bumps":
  - an export is a patch only when a promise requires it: "so is an export that such a promise requires (section 5: every public method returns a type a consumer can import)";
  - otherwise "A new export, member, option or accepted input is a minor".
- AGENTS.md §5 (line 229): "Every public method returns a type a consumer can import from the root, except the registration builders of `add(path)`." This is about return types.
- Commit `7447754`: "Decided as a patch: an export that a written promise already requires". It cites "AGENTS.md's rule that every public method returns a type a consumer can import from the root". The same commit kept `EntriesFor` and `NonEmpty` internal because they "only shape parameters".
- `.changeset/export-storage-types.md`, `patch`: "`AllEntries`, `Decoded`, `SeedOptions` and `SessionStorageOptions` are exported … as every other public signature already allows."

## Reproduction

Read from `dist/index.d.ts`; the commit's own message gives the same reading:
- `get()` returns `Promise<AllEntries<S>>` and `get(key)` returns `Promise<Decoded<S, K> | null>`, so the §5 rule requires these two;
- `SeedOptions` is a parameter of `seed`, and `SessionStorageOptions<S>` a parameter of the constructor. Neither is returned by any public method.

`pnpm changeset status --verbose` in a throwaway clone at 54cdada, with a local `main` at `origin/main` (`8daa652`, `v3.0.1`), prints "Packages to be bumped at patch: pomwright 3.0.2" (29 changesets) and "NO packages as a minor".

## Argument

- §5's promise requires `AllEntries` and `Decoded` (returned types), so those exports are patches.
- `SeedOptions` and `SessionStorageOptions` are option types of parameters. Exporting them adds a name to the API that no written promise required. By §7's own wording that is a minor, so this release would be 3.1.0.
- The changeset's "as every other public signature already allows" is also not true as it stands: `step()`'s return type is not importable (F-1), and parameter types such as `EntriesFor` and `GotoTarget` are not exported, on purpose.
- The cost is small either way, which is why this is a design question and not a defect:
  - **A**, bump to minor: consumers on `~3.0.0` would not get 3.1.0 automatically, although the release only adds names and fixes.
  - **B**, keep the patch: §5 and §7 should then say that the options types of public constructors and methods are part of the promise, as `PageObjectOptions` already is, so the next decision reads the same rule.

## Fix plan

- **Intended contract**: the bump of every changeset follows §7's text.
- **Options**:
  - **A**: change `.changeset/export-storage-types.md` to `minor`, or split it into a patch for `AllEntries` and `Decoded` and a minor for the two option types. The release becomes 3.1.0. AGENTS.md and the pages need no change. Per §7, add an "Added in 3.1.0" marker on the two new sections (`api/class-sessionstorage.md#seedoptions`, `#sessionstorageoptions`) and the two `api/index.md` rows ("from the first 3.x addition on, a new member or option carries one").
  - **B (recommended if the maintainer prefers a 3.0.2)**: widen §5's promise to "every public method returns, and every public constructor and method takes its options as, a type a consumer can import from the root". Reword §7's bump line to match, and the changeset's "as every other public signature already allows" to "as the options of `PageObject` already are". The release stays 3.0.2.
- **Implementation steps**: A: `.changeset/export-storage-types.md` front matter (and a split file), plus the docs markers. B: AGENTS.md §5 line 229, §7 lines 345-347, and the changeset's text.
- **Tests**: none.
- **Docs**: as above.
- **Changeset**: this finding edits one.
- **Decisions to tick**:
  - [x] A (minor, 3.1.0) or B (widen the promise, 3.0.2): neither as written. **Patch, release 3.0.2**, because the
    3.0.1 docs already promised these exports: `api/types.md` "The types a project names when its own code holds what
    POMWright hands out or forwards its options. Every type is imported from `pomwright`"; `docs/typescript.md` "Every
    type is imported from `pomwright`". Exporting them brings the package in line with a documented promise (§7's
    first rule). §5 is unchanged.
  - [x] (added) AGENTS.md §7 cites that promise next to §5's, states that providing what a released version's docs or
    doc comments promise is a patch unless it breaks code written against them (a major), and says that utility types
    that only shape parameters (`EntriesFor`, `NonEmpty`, `KeyOnly`, `GotoTarget`) are outside it.
  - [x] (added) `.changeset/export-storage-types.md` stays `patch`; "as every other public signature already allows" is
    replaced by the promise it fulfils (the API reference's "every type is imported from `pomwright`").
- **Execution order**: before the *Version Packages* pull request. F-1 and F-2's exports should then follow the same rule.

> Saved by the orchestrating session from the agent's final report, with the user's approval: the agent's own write of this file was refused by a harness rule ("Subagents should return findings as text, not write report files").
